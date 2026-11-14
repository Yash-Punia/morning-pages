import { expect, test } from '@playwright/test';
import { drag, frame } from './ink-helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.goto('/today');
  await frame(page);
});

test('an entry takes a typed title, shown in the Library and kept when coming back', async ({ page }) => {
  const title = page.getByRole('textbox', { name: 'Entry title' });
  await expect(title).toHaveAttribute('placeholder', 'Title');
  await title.fill('A slow start');
  await title.press('Enter');

  // Client-side navigation: the session's entry stays in memory (saving arrives in M3).
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  const row = page.getByRole('link', { name: /A slow start/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText('1 page');
  await row.click();
  await expect(page.getByRole('textbox', { name: 'Entry title' })).toHaveValue('A slow start');
});

test('the Library lists an untitled entry once there is ink on it', async ({ page }) => {
  await drag(page, 'pen', { x: 200, y: 600 }, { x: 400, y: 600 });
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('link', { name: /Untitled/ })).toBeVisible();
});

test('the title sits on the paper, scrolls with it, and a tap on it never inks', async ({ page }) => {
  const title = page.getByRole('textbox', { name: 'Entry title' });
  const ink = page.locator('[data-ink]');
  const t0 = (await title.boundingBox())!;
  const surface = (await ink.boundingBox())!;
  expect(t0.y).toBeGreaterThanOrEqual(surface.y); // inside the page's top band
  expect(t0.y + t0.height).toBeLessThan(surface.y + 160);
  const onTitle = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[data-ink]'), [t0.x + 20, t0.y + t0.height / 2]);
  expect(onTitle).toBe(false);

  await drag(page, 'pen', { x: 200, y: 700 }, { x: 400, y: 700 }); // adds page 2, so there is room to scroll
  await page.waitForTimeout(1600); // past the hand zone: a touch just below-right of the pen is the palm (D-048)
  await drag(page, 'touch', { x: 500, y: 900 }, { x: 500, y: 500 }, { steps: 6 });
  await page.waitForTimeout(1200); // inertia settles
  await frame(page);
  const t1 = (await title.boundingBox())!;
  expect(t1.y).toBeLessThan(t0.y - 200); // moved up with the page
});

test('every saved morning is listed by title, newest first, and an earlier one opens to keep writing', async ({ page }) => {
  // An earlier morning, as an earlier day of the app would have saved it.
  await page.evaluate(async () => {
    const { db } = (window as unknown as { __store: { db(): { entries: { add(r: object): Promise<unknown> }; pages: { add(r: object): Promise<unknown> } } } }).__store;
    await db().entries.add({ id: 'earlier', journalId: 'default', entryDate: '2026-11-01', createdAt: 1, updatedAt: 1, title: 'First frost' });
    await db().pages.add({ id: 'ep1', entryId: 'earlier', index: 0, paper: 'grid', size: 'A5', height: 1414, opCount: 0, checksum: 0, updatedAt: 1 });
  });
  const title = page.getByRole('textbox', { name: 'Entry title' });
  await title.fill('Today, slowly');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  const rows = page.locator('section[aria-labelledby="recent-heading"] li');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Today, slowly');
  await expect(rows.nth(1)).toContainText('First frost');

  await page.getByRole('link', { name: /First frost/ }).click();
  await expect(page).toHaveURL(/\/entry\/earlier$/);
  await frame(page);
  await expect(page.getByRole('textbox', { name: 'Entry title' })).toHaveValue('First frost');
  await drag(page, 'pen', { x: 200, y: 500 }, { x: 400, y: 500 }); // keep writing on it
  await page.reload();
  await frame(page);
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '1');
});
