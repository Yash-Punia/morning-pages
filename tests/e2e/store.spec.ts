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
