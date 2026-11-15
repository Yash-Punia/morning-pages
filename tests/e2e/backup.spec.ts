import { expect, test } from '@playwright/test';
import { seed } from './helpers-seed.ts';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('the Library reminds quietly once a journal has gone a week without a backup; Not now waits a day (5.4)', async ({ page }) => {
  await page.goto('/library');
  await seed(page, [{ id: 'old', date: daysAgo(10), title: 'Ten days back' }]);
  await page.reload();
  const note = page.getByRole('status').filter({ hasText: 'Time for a backup.' });
  await expect(note).toContainText('You haven’t backed up yet.');

  await note.getByRole('button', { name: 'Not now' }).click();
  await expect(note).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Recent mornings' })).toBeVisible();
  await expect(page.getByText('Time for a backup.')).toBeHidden();
});

test('backing up from the reminder clears it and says when the next one is (5.4)', async ({ page }) => {
  await page.goto('/library');
  await seed(page, [{ id: 'old', date: daysAgo(10), title: 'Ten days back' }]);
  await page.reload();
  const note = page.getByRole('status').filter({ hasText: 'Time for a backup.' });
  await note.getByRole('button', { name: 'Back up now' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), note.getByRole('button', { name: 'Save backup' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.morningpages$/);
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toContainText('The next reminder is in 7 days.');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Recent mornings' })).toBeVisible();
  await expect(page.getByText('Time for a backup.')).toBeHidden();
});
