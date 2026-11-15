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

test('in a Safari tab a quiet trial strip says pages are not kept long-term; the installed app has none (STO-1)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto('/today');
  const strip = page.getByRole('note').filter({ hasText: "Trial mode: pages in Safari aren't kept long-term." });
  await expect(strip).toBeVisible();
  // The writing page fits the window below the strip: nothing scrolls the window.
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1);
  expect(fits).toBe(true);
  await strip.getByRole('link', { name: 'Add to Home Screen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Add it to your Home Screen' })).toBeVisible();

  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes('display-mode: standalone') ? { ...real(q), matches: true } : real(q));
  });
  await page.goto('/today');
  await expect(page.locator('[data-ink]')).toBeVisible();
  await expect(page.getByText('Trial mode')).toHaveCount(0);
});

test('a shared link shows the title, description and a 1200x630 image (4.15)', async ({ page, request }) => {
  await page.goto('/today');
  const meta = (sel: string) => page.locator(sel).getAttribute('content');
  expect(await meta('meta[property="og:title"]')).toBe('Morning Pages');
  expect(await meta('meta[property="og:description"]')).toMatch(/pen-first morning journal/);
  expect(await meta('meta[property="og:image"]')).toMatch(/^https:\/\/.+\/og\.png$/);
  expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
  const png = await request.get('/og.png');
  expect(png.status()).toBe(200);
  expect(png.headers()['content-type']).toBe('image/png');
});
