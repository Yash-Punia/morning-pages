import { expect, test } from '@playwright/test';

// Every MVP route renders its screen inside the shell, at iPad landscape and at the 320 px
// Split View floor (PRD 10.2), without horizontal scrolling.
const ROUTES: [path: string, heading: RegExp, nav: string | null][] = [
  ['/today', /\w+ \d+|\d+ \w+/, 'Today'],
  ['/entry/abc', /^Entry not found$/, null], // no such entry on this device
  ['/library', /^Library$/, 'Library'],
  ['/settings', /^Settings$/, 'Settings'],
  ['/privacy', /^Privacy$/, 'Settings'],
  ['/diagnostics', /^Diagnostics$/, 'Settings'],
  ['/onboarding', /^Your journal stays on this iPad$/, null],
];

for (const [width, height] of [[1366, 1024], [320, 640]] as const) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height } });

    for (const [path, heading, nav] of ROUTES) {
      test(path, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        if (nav) await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: nav, exact: true })).toHaveAttribute('aria-current', 'page');
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  });
}

test('the first launch shows onboarding; after that / opens today, with no dialogs (4.3)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.evaluate(() => localStorage.setItem('mp.onboarded', '1'));
  await page.goto('/');
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.locator('[data-ink]')).toBeVisible();
});

test('a journal written before onboarding existed opens straight to today', async ({ page }) => {
  await page.goto('/today');
  await page.evaluate(async () => {
    const { db } = (window as unknown as { __store: { db(): { entries: { add(r: object): Promise<unknown> } } } }).__store;
    await db().entries.add({ id: 'old', journalId: 'default', entryDate: '2026-11-01', createdAt: 1, updatedAt: 1 });
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/today$/);
});

test('unknown paths fall back to today, and links navigate in place', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page).toHaveURL(/\/today$/);

  await page.evaluate(() => ((window as unknown as { __marker: boolean }).__marker = true));
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await expect(page).toHaveTitle('Library · Morning Pages');
  expect(await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)).toBe(true); // no full reload
  await page.goBack();
  await expect(page).toHaveURL(/\/today$/);
});
