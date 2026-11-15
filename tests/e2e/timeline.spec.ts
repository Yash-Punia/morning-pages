import { expect, test } from '@playwright/test';
import { frame } from './ink-helpers.ts';
import { seed } from './helpers-seed.ts';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('two years of mornings scroll back month by month, and Jump to lands on any month (MEM-3)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto('/today');
  await frame(page);
  // ~700 entries: almost every morning for two years, ending yesterday.
  const days: { id: string; date: string; title: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 730; i++) {
    if (i % 17 === 0) continue; // the odd morning off
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ id: `e${i}`, date: iso(d), title: `Morning ${i}` });
  }
  await seed(page, days);
  const oldest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 730);
  const monthLabel = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);

  await page.goto('/timeline');
  const months = page.locator('h2.month-title');
  await expect(months.first()).toBeVisible();
  expect((await page.locator('.rows li').count())).toBeLessThan(200); // a month or a few, not everything

  // Scroll to the end: every month loads, newest first, ending at the oldest morning.
  // Keep scrolling to the end until the last month has loaded (slower when the test machine is busy).
  await expect.poll(async () => {
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight }));
    return page.getByText("That's every morning").isVisible();
  }, { timeout: 60_000, intervals: [150] }).toBe(true);
  await expect(page.getByText(`That's every morning since ${monthLabel(oldest)}.`)).toBeVisible();
  expect(await page.locator('.rows li').count()).toBe(days.length);
  await expect(months.last()).toHaveText(monthLabel(oldest));

  // Jump to a month a year ago: it comes first.
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  await page.locator('input[type="month"]').fill(`${yearAgo.getFullYear()}-${String(yearAgo.getMonth() + 1).padStart(2, '0')}`);
  await page.locator('input[type="month"]').dispatchEvent('change');
  await expect(months.first()).toHaveText(monthLabel(yearAgo));
  await months.first().locator('xpath=..').getByRole('link').first().click();
  await expect(page).toHaveURL(/\/entry\/e\d+$/);
});

test('an empty journal says so', async ({ page }) => {
  await page.goto('/timeline');
  await expect(page.getByText("Your mornings will line up here, newest first, once you've written a page.")).toBeVisible();
});
