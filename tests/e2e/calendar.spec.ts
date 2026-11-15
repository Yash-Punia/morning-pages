import { expect, test } from '@playwright/test';
import { frame } from './ink-helpers.ts';
import { seed } from './helpers-seed.ts';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto('/today');
  await frame(page);
  await seed(page, [
    { id: 'oct3a', date: '2026-10-03', title: 'Before work', createdAt: 1 },
    { id: 'oct3b', date: '2026-10-03', title: 'Evening, after all', createdAt: 2 },
    { id: 'oct20', date: '2026-10-20', title: 'Leaves' },
    { id: 'sep30', date: '2026-09-30', title: 'Last of September' },
  ]);
});

test('a month of mornings: tap a day to list its entries, tap one to open it (MEM-2)', async ({ page }) => {
  await page.goto('/calendar?day=2026-10-01');
  await expect(page.getByRole('heading', { level: 1, name: 'October 2026' })).toBeVisible();
  const day3 = page.getByRole('button', { name: /3 October.*, 2 entries$|October 3.*, 2 entries$/ });
  await expect(day3).toBeVisible();
  await day3.click();
  await expect(day3).toHaveAttribute('aria-pressed', 'true');
  const rows = page.locator('section[aria-labelledby="day-title"] li');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Evening, after all'); // newest first
  await rows.nth(1).getByRole('link').click();
  await expect(page).toHaveURL(/\/entry\/oct3a$/);
  await frame(page);
  await expect(page.getByRole('textbox', { name: 'Entry title' })).toHaveValue('Before work');
});

test('previous and next month, and back to today; an empty day says so', async ({ page }) => {
  await page.goto('/calendar?day=2026-10-01');
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'September 2026' })).toBeVisible();
  await expect(page.getByRole('button', { name: /30.*, 1 entry$/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.getByRole('button', { name: /(^|\D)5 October|October 5(\D|$)/ }).click();
  await expect(page.getByText('Nothing written on this day.')).toBeVisible();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.locator('[aria-current="date"]')).toHaveAttribute('aria-pressed', 'true');
});

test('the Library week strip opens the Calendar on that day', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('list', { name: 'This week' }).locator('[aria-current="date"]').click();
  await expect(page).toHaveURL(/\/calendar\?day=\d{4}-\d{2}-\d{2}$/);
  await expect(page.locator('button[aria-current="date"]')).toHaveAttribute('aria-pressed', 'true');
});
