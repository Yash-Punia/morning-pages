import { expect, test } from '@playwright/test';

// Every MVP route renders its screen inside the shell, at iPad landscape and at the 320 px
// Split View floor (PRD 10.2), without horizontal scrolling.
const ROUTES: [path: string, heading: RegExp, nav: string | null][] = [
  ['/today', /\w+ \d+|\d+ \w+/, 'Today'],
  ['/entry/abc', /^Entry$/, null],
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

test('/ goes to today, unknown paths fall back to it, and links navigate in place', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/today$/);
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
