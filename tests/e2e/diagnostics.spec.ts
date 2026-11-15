import { expect, test } from '@playwright/test';
import { drag } from './ink-helpers.ts';

// 6.1: every PRD 12.1 budget that can only be measured on the device is readable in /diagnostics.
// The numbers here come from headless WebKit and mean nothing; the rows must just be filled in.
test('after writing, the HUD reads every on-device budget and the log', async ({ page }) => {
  // Tall: a view transition into a screen taller than the window crashes headless WebKit on
  // Windows (the calendar.spec note; on main too).
  await page.setViewportSize({ width: 1366, height: 2400 });
  await page.goto('/today');
  await page.waitForFunction(() => performance.getEntriesByName('writable').length === 1);
  for (let i = 0; i < 3; i++) await drag(page, 'pen', { x: 200, y: 300 + i * 40 }, { x: 500, y: 300 + i * 40 });
  await expect(page.locator('[data-state]')).toHaveAttribute('data-state', 'saved');
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'planted for the log' })));

  // In-app navigation: the numbers live in memory for the session. A same-origin link goes
  // through the router; going via the Settings screen crashes headless WebKit on Windows (on main too).
  await page.evaluate(() => {
    const a = Object.assign(document.createElement('a'), { href: '/diagnostics' });
    document.body.append(a);
    a.click();
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Diagnostics' })).toBeVisible();

  const row = (term: string) => page.locator('dl > div', { has: page.getByRole('term').filter({ hasText: term }) }).getByRole('definition');
  await expect(row('First ink after pen-down')).toContainText('typical');
  await expect(row('Dropped frames while writing')).toContainText(/% of \d+ frames over/);
  await expect(row('Frame times while writing')).toContainText('up to 12.5 ms');
  await expect(row('Pencil samples')).toContainText('per second');
  await expect(row('Saving a stroke')).toContainText(/slowest 1 %, over \d+ saves/);
  await expect(row('Launch to writable page')).toContainText(/^\d+ ms/);
  await expect(row('Opening an entry')).toContainText(/^\d+ ms for \d+ pages?/);
  await expect(row('Pencil features')).toContainText('samples');
  await expect(row('Ink stored per page')).toContainText(/KB average over \d+ recent page/);
  await expect(row('Log on this iPad')).toContainText('error: planted for the log');
});
