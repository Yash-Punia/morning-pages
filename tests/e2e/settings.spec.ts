import { expect, test } from '@playwright/test';

test('Settings shows how safe storage is, and the theme follows the iPad unless pinned (4.10)', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText(/^Storage: (protected|best effort)$/)).toBeVisible();
  const theme = page.getByRole('combobox', { name: /Theme/ });
  await expect(theme).toHaveValue('system');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();

  await theme.selectOption('night');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('night');
  await page.reload(); // pinned before the first screen
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('night');

  await page.getByRole('combobox', { name: /Theme/ }).selectOption('system');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();
  await expect(page.getByRole('link', { name: /Recently Deleted/ })).toBeVisible();
});
