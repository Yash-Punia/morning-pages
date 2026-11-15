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

test('Back up now builds the file, then Save backup hands it over and records the date (5.2)', async ({ page }) => {
  await page.goto('/settings');
  const backup = page.getByRole('list', { name: 'Backup' });
  await expect(backup.getByText('Never. Your pages exist only on this iPad.')).toBeVisible();
  await backup.getByRole('button', { name: 'Back up now' }).click();
  const save = backup.getByRole('button', { name: 'Save backup' });
  await expect(save).toBeVisible();
  await expect(backup.getByText(/^Ready: .* MB\./)).toBeVisible();

  // Headless WebKit has no share sheet for files, so the file downloads instead (TDD 8.2).
  const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  // Linux WebKit (CI) turns the spaces in a download's name into underscores; Safari keeps them.
  expect(download.suggestedFilename()).toMatch(/^Morning[ _]Pages[ _]\d{4}-\d{2}-\d{2}\.morningpages$/);
  await expect(backup.getByText('Downloaded. Move it from Downloads to somewhere safe.')).toBeVisible();
  await expect(backup.getByRole('button', { name: 'Back up now' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('list', { name: 'Backup' }).getByText('Today', { exact: true })).toBeVisible();
});
