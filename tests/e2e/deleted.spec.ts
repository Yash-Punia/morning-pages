import { expect, test } from '@playwright/test';
import { drag, frame } from './ink-helpers.ts';

test('delete from a row\'s menu, undo, delete again, then restore from Recently Deleted, intact (ENT-7)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto('/today');
  await frame(page);
  await page.getByRole('textbox', { name: 'Entry title' }).fill('Keep this one');
  await drag(page, 'pen', { x: 200, y: 500 }, { x: 500, y: 500 });
  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: 'Library', exact: true }).click();

  const recent = page.locator('section[aria-labelledby="recent-heading"]');
  await recent.getByRole('button', { name: 'More for Keep this one' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(recent.getByRole('status')).toContainText('moved to Recently Deleted');
  await recent.getByRole('button', { name: 'Undo' }).click();
  await expect(recent.getByRole('link', { name: /Keep this one/ })).toBeVisible();

  await recent.getByRole('button', { name: 'More for Keep this one' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await nav.getByRole('link', { name: 'Today', exact: true }).click(); // today's entry is gone: a fresh page
  await frame(page);
  await expect(page.getByRole('textbox', { name: 'Entry title' })).toHaveValue('');
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '0');

  await nav.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByText("Your past mornings will gather here, one page at a time.")).toBeVisible();
  await page.getByRole('link', { name: 'Recently Deleted' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Recently Deleted' })).toBeVisible();
  await expect(page.getByText(/Deleted today · gone on/)).toBeVisible();
  await page.getByRole('button', { name: 'Restore Keep this one' }).click();
  await page.getByRole('link', { name: 'Open it' }).click();
  await frame(page);
  await expect(page.getByRole('textbox', { name: 'Entry title' })).toHaveValue('Keep this one');
  await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', '1');
});

test('Recently Deleted says when it is empty', async ({ page }) => {
  await page.goto('/deleted');
  await expect(page.getByText('Nothing here. Deleted mornings wait here for 30 days.')).toBeVisible();
});
