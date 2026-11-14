import { expect, test, type Page } from '@playwright/test';
import { drag, frame, inkAt } from './ink-helpers.ts';

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Writing tools' });
const engine = (page: Page) => page.evaluate(() => {
  const e = (window as unknown as { __ink: { preset: { tool: string; color: string; size: number }; mode: string } }).__ink;
  return { preset: { ...e.preset }, mode: e.mode };
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto('/today');
  await page.evaluate(() => localStorage.removeItem('mp.ink.tools'));
  await page.reload();
  await frame(page);
});

test('docks left for a right-handed writer, in its own gutter: it never covers the page', async ({ page }) => {
  const bar = (await toolbar(page).boundingBox())!;
  const paper = (await page.locator('[data-ink]').boundingBox())!;
  expect(bar.x + bar.width).toBeLessThanOrEqual(paper.x); // beside the writing surface, not over it
  // A Pencil tap on the toolbar lands on the toolbar, never on the canvas.
  const hitsCanvas = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[data-ink]'), [bar.x + bar.width / 2, bar.y + 30]);
  expect(hitsCanvas).toBe(false);
});

test('presets switch the pen; tapping the active one opens its editor', async ({ page }) => {
  await toolbar(page).getByRole('button', { name: /^Ballpoint, Black/ }).click();
  expect((await engine(page)).preset).toMatchObject({ tool: 'ballpoint', color: 'black' });

  await toolbar(page).getByRole('button', { name: /^Ballpoint, Black/ }).click(); // again → edit
  const editor = page.getByRole('dialog', { name: 'Edit pen' });
  await expect(editor).toBeVisible();
  await editor.getByRole('radio', { name: 'Forest' }).check();
  await editor.getByRole('radio', { name: 'Fountain pen' }).check();
  await editor.getByRole('button', { name: 'Done' }).click();
  await expect(editor).toBeHidden();
  await expect(toolbar(page).getByRole('button', { name: /^Fountain pen, Forest/ })).toHaveAttribute('aria-pressed', 'true');
  expect((await engine(page)).preset).toMatchObject({ tool: 'fountain', color: 'forest' });

  await page.reload(); // presets are kept
  await expect(toolbar(page).getByRole('button', { name: /^Fountain pen, Forest/ })).toBeVisible();
});

test('the eraser button switches the Pencil to erasing; undo and redo follow history', async ({ page }) => {
  const undo = toolbar(page).getByRole('button', { name: 'Undo' });
  const redo = toolbar(page).getByRole('button', { name: 'Redo' });
  await expect(undo).toBeDisabled();
  await drag(page, 'pen', { x: 200, y: 400 }, { x: 500, y: 400 });
  await frame(page);
  await expect(undo).toBeEnabled();

  await toolbar(page).getByRole('button', { name: 'Eraser' }).click();
  await expect(toolbar(page).getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'true');
  await drag(page, 'pen', { x: 350, y: 370 }, { x: 350, y: 430 });
  await frame(page);
  expect(await inkAt(page, 260, 400, 2)).toBe(false);

  await undo.click(); // undo the erase
  await frame(page);
  expect(await inkAt(page, 260, 400, 2)).toBe(true);
  await expect(redo).toBeEnabled();
  await redo.click();
  await frame(page);
  expect(await inkAt(page, 260, 400, 2)).toBe(false);
});

test('moves between left, top and right, and folds to a dot; the page reflows each time', async ({ page }) => {
  const grip = toolbar(page).getByRole('button', { name: /Move writing tools/ });
  for (const dock of ['top', 'right', 'left'] as const) {
    await grip.click();
    await expect(grip).toHaveAccessibleName(`Move writing tools (docked ${dock})`);
    const bar = (await toolbar(page).boundingBox())!;
    const paper = (await page.locator('[data-ink]').boundingBox())!;
    if (dock === 'top') expect(bar.y + bar.height).toBeLessThanOrEqual(paper.y);
    if (dock === 'right') expect(bar.x).toBeGreaterThanOrEqual(paper.x + paper.width);
    if (dock === 'left') expect(bar.x + bar.width).toBeLessThanOrEqual(paper.x);
  }
  await toolbar(page).getByRole('button', { name: 'Fold writing tools away' }).click();
  await expect(toolbar(page)).toBeHidden();
  await page.getByRole('button', { name: 'Show writing tools' }).click();
  await expect(toolbar(page)).toBeVisible();
});

test('starts folded on a phone-width window', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => localStorage.removeItem('mp.ink.tools'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Show writing tools' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('the toolbar and its editor cause no CSP violations', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await page.reload();
  await toolbar(page).getByRole('button', { pressed: true }).first().click(); // already active: opens the editor
  await expect(page.getByRole('dialog', { name: 'Edit pen' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
});
