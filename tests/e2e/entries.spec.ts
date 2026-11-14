import { expect, test } from '@playwright/test';
import { drag, frame } from './ink-helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto('/today');
  await frame(page);
});

const library = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();

test('"New entry" starts a second entry this morning; both are listed, and Today opens the newer (ENT-2)', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Entry title' }).fill('First thoughts');
  await drag(page, 'pen', { x: 200, y: 500 }, { x: 400, y: 500 });
  await page.getByRole('button', { name: 'New entry' }).click();
  await frame(page);
  await expect(page.getByRole('textbox', { name: 'Entry title' })).toHaveValue('');
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '0');
  await page.getByRole('textbox', { name: 'Entry title' }).fill('After coffee');

  await library(page);
  const rows = page.locator('section[aria-labelledby="recent-heading"] li');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('After coffee');
  await expect(rows.nth(1)).toContainText('First thoughts');

  await page.reload(); // a relaunch: Today is still the newer one
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Today', exact: true }).click();
  await frame(page);
  await expect(page.getByRole('textbox', { name: 'Entry title' })).toHaveValue('After coffee');
  await library(page);
  await page.getByRole('link', { name: /First thoughts/ }).click();
  await expect(page).toHaveURL(/\/entry\//);
  await frame(page);
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '1');
});

test('a "New entry" left blank leaves nothing behind (ENT-1), and ⌘N starts one too', async ({ page }) => {
  await drag(page, 'pen', { x: 200, y: 500 }, { x: 400, y: 500 });
  await page.keyboard.press('ControlOrMeta+n');
  await frame(page);
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '0');
  await library(page);
  await expect(page.locator('section[aria-labelledby="recent-heading"] li')).toHaveCount(1);
});

test('leaving a page stores a JPEG thumbnail of it, drawn in a worker (M4.7)', async ({ page }) => {
  await drag(page, 'pen', { x: 200, y: 500 }, { x: 600, y: 520 });
  await library(page);
  const thumb = () => page.evaluate(async () => {
    const { db } = (window as unknown as { __store: { db(): { pages: { toArray(): Promise<{ thumb?: ArrayBuffer; thumbOps?: number; opCount: number }[]> } } } }).__store;
    const [p] = await db().pages.toArray();
    if (!p?.thumb) return null;
    const jpeg = new Uint8Array(p.thumb, 0, 2).join(',') === '255,216'; // the JPEG signature
    return { jpeg, size: p.thumb.byteLength, current: p.thumbOps === p.opCount };
  });
  await expect.poll(thumb, { timeout: 10_000 }).toMatchObject({ jpeg: true, current: true });
  expect((await thumb())!.size).toBeGreaterThan(500);
});

test('the Library opens with today, this week and recent mornings (M4.5)', async ({ page }) => {
  await library(page);
  await expect(page.getByText('Nothing written yet')).toBeVisible();
  await expect(page.getByRole('link', { name: "Start today's page" })).toBeVisible();
  const week = page.getByRole('list', { name: 'This week' });
  await expect(week.getByRole('listitem')).toHaveCount(7);
  await expect(week.locator('[aria-current="date"]')).toHaveCount(1);

  await page.getByRole('link', { name: "Start today's page" }).click();
  await frame(page);
  await page.getByRole('textbox', { name: 'Entry title' }).fill('Grey sky');
  await library(page);
  await expect(page.getByRole('link', { name: 'Continue today' })).toBeVisible();
  await expect(week.locator('[aria-current="date"]')).toHaveAttribute('aria-label', /, written$/);
  await expect(page.locator('section[aria-labelledby="recent-heading"] li')).toContainText('Grey sky');
});
