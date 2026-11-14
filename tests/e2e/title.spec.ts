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
  await page.waitForTimeout(600); // past the palm guard
  await drag(page, 'touch', { x: 500, y: 900 }, { x: 500, y: 500 }, { steps: 6 });
  await page.waitForTimeout(1200); // inertia settles
  await frame(page);
  const t1 = (await title.boundingBox())!;
  expect(t1.y).toBeLessThan(t0.y - 200); // moved up with the page
});
