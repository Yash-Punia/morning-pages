import { expect, test, type Page } from '@playwright/test';
import { drag, frame } from './ink-helpers.ts';

// Durability on the real app (TDD 6, 13.2): writes go through the engine and the store, then the
// page is reloaded the way iPadOS relaunches a killed app.

type Store = { saved(): Promise<void>; db(): Record<string, { count(): Promise<number> }> };

/** Rows in a table, once every pending write is on disk (window.__store exists in e2e builds). */
const count = (page: Page, table: string) =>
  page.evaluate(async (t) => {
    const store = (window as unknown as { __store: Store }).__store;
    await store.saved();
    return store.db()[t]!.count();
  }, table);

/** The Pencil goes down and moves, and never lifts: the app is about to be hidden or killed. */
async function penWithoutLift(page: Page, y: number, steps = 10) {
  const box = (await page.locator('[data-ink]').boundingBox())!;
  await page.evaluate(async ({ box, y, steps }) => {
    const el = document.querySelector('[data-ink]')!;
    const fire = (type: string, x: number) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'pen', isPrimary: true, clientX: box.x + x, clientY: box.y + y, pressure: 0.5, buttons: 1 }));
    fire('pointerdown', 200);
    for (let i = 1; i <= steps; i++) { fire('pointermove', 200 + i * 20); await new Promise((r) => setTimeout(r, 8)); }
  }, { box, y, steps });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.goto('/today');
  await frame(page);
});

test('opening Today and leaving without writing stores nothing (ENT-1)', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  await page.reload();
  expect(await count(page, 'entries')).toBe(0);
  expect(await count(page, 'pages')).toBe(0);
});

test('erase, undo and redo survive a relaunch exactly (DUR-2)', async ({ page }) => {
  const ink = page.locator('[data-ink]');
  for (const y of [400, 500, 600]) await drag(page, 'pen', { x: 200, y }, { x: 500, y });
  await page.evaluate(() => { (window as unknown as { __ink: { mode: string } }).__ink.mode = 'eraser'; });
  await drag(page, 'pen', { x: 350, y: 360 }, { x: 350, y: 430 }); // erases the first line
  await page.evaluate(() => { (window as unknown as { __ink: { mode: string } }).__ink.mode = 'pen'; });
  await page.keyboard.press('ControlOrMeta+z'); // the first line is back
  await page.keyboard.press('ControlOrMeta+z'); // the third line goes
  await page.keyboard.press('ControlOrMeta+Shift+z'); // and returns
  await page.keyboard.press('ControlOrMeta+z'); // and goes again
  await frame(page);
  await expect(ink).toHaveAttribute('data-strokes', '2');
  expect(await count(page, 'ops')).toBe(3 + 5); // 3 strokes, then erase / restore / erase / restore / erase
  await page.reload();
  await frame(page);
  await expect(ink).toHaveAttribute('data-strokes', '2');
});

test('a stroke is saved, the dot turns solid, and it is there after a relaunch', async ({ page }) => {
  await drag(page, 'pen', { x: 200, y: 500 }, { x: 420, y: 520 });
  await expect(page.locator('[data-state]')).toHaveAttribute('data-state', 'saved');
  expect(await count(page, 'ops')).toBe(1);
  await page.reload();
  await frame(page);
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '1');
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-pages', '2');
});

test('held writes show a banner with "Save a copy" until they are on disk (TDD 6.2)', async ({ page }) => {
  const setState = (s: string) => page.evaluate((s) => (window as unknown as { __store: { writes: { state: { set(v: string): void } } } }).__store.writes.state.set(s), s);
  await setState('full');
  await expect(page.getByText('This iPad is out of space, so your latest writing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save a copy' })).toBeVisible();
  await setState('saved');
  await expect(page.getByRole('button', { name: 'Save a copy' })).toHaveCount(0);
});

test('a stroke in progress is kept when the app is hidden or closed (DUR-3)', async ({ page }) => {
  await penWithoutLift(page, 500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await penWithoutLift(page, 650);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  expect(await count(page, 'ops')).toBe(2);
  await page.reload();
  await frame(page);
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '2');
});

/** The recovery write has landed (15 ms on the iPad, ~100 ms in headless WebKit on Windows). */
const mirrored = (page: Page) => page.evaluate(() => (window as unknown as { __store: { writes: { idle(): Promise<void> } } }).__store.writes.idle());

/** A kill: iPadOS ends the app with no pagehide, so nothing gets to save the stroke in progress. */
async function kill(page: Page) {
  await page.evaluate(() => { (window as unknown as { __ink: { flush(): void } }).__ink.flush = () => {}; });
  await page.reload();
  await frame(page);
}

test('killed during the first stroke of the morning: after relaunch the entry and the stroke are back (DUR-4)', async ({ page }) => {
  await penWithoutLift(page, 500, 40); // ~0.4 s of writing: mirrored at the first sample and again later
  await mirrored(page);
  await kill(page);
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '1');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('link', { name: /Untitled/ })).toBeVisible();
});

test('a stroke shorter than 250 ms is covered too: it is mirrored from its first sample (D-017)', async ({ page }) => {
  await drag(page, 'pen', { x: 200, y: 400 }, { x: 400, y: 400 }); // an earlier, saved stroke
  await penWithoutLift(page, 600, 3); // an i-dot's worth of writing
  await mirrored(page);
  await kill(page);
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '2');
  expect(await count(page, 'recovery')).toBe(0);
});

test('reopening lands on the same place, with the same pen (PRD 3, step 7)', async ({ page }) => {
  const ink = page.locator('[data-ink]');
  await drag(page, 'pen', { x: 200, y: 400 }, { x: 400, y: 400 }); // page 2 appears: room to scroll
  await page.getByRole('button', { name: /Fountain pen, Blue-black/ }).click();
  await page.waitForTimeout(600); // past the palm guard
  await drag(page, 'touch', { x: 500, y: 1100 }, { x: 500, y: 500 }, { steps: 6 });
  await page.waitForTimeout(1500); // inertia settles and the position is saved
  const y = Number(await ink.getAttribute('data-scroll-y'));
  expect(y).toBeGreaterThan(300);
  await page.reload();
  await frame(page);
  expect(Math.abs(Number(await ink.getAttribute('data-scroll-y')) - y)).toBeLessThan(1);
  await expect(page.getByRole('button', { name: /Fountain pen, Blue-black/ })).toHaveAttribute('aria-pressed', 'true');
});
