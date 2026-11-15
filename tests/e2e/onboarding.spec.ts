import { expect, test } from '@playwright/test';

test('a first run goes through three screens, and its choices are what Today opens with (4.1)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0); // nothing to navigate yet
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Add it to your Home Screen' })).toBeVisible();
  await expect(page.getByText("Deleting the app's icon deletes the journal with it.")).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Pick your paper and pen' })).toBeVisible();
  await page.getByRole('radio', { name: 'Grid' }).check();
  await page.getByRole('radio', { name: /Fountain pen/ }).check();
  await page.getByRole('button', { name: 'Start writing' }).click();

  await expect(page).toHaveURL(/\/today$/);
  expect(await page.evaluate(() => localStorage.getItem('mp.ink.paper'))).toBe('grid');
  await expect(page.getByRole('button', { name: /^Fountain pen, Blue-black/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/'); // the next launch skips it
  await expect(page).toHaveURL(/\/today$/);
});

test('Skip goes straight to Today and keeps the defaults', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('button', { name: /^Ballpoint, Black/ })).toHaveAttribute('aria-pressed', 'true');
});

test('the Home Screen step can be opened directly, and says so inside the installed app', async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes('display-mode: standalone') ? { ...real(q), matches: true } : real(q));
  });
  await page.goto('/onboarding?step=2');
  await expect(page.getByRole('heading', { level: 1, name: "You're in the app" })).toBeVisible();
});
