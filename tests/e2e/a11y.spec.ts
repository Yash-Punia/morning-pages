import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { drag, frame } from './ink-helpers.ts';
import { seed } from './helpers-seed.ts';

// 4.13, PRD 10.4: WCAG 2.2 AA on every screen around the page. The canvas itself is excluded:
// it is one labelled image of handwriting, checked by its label below.
const SCREENS = ['/library', '/calendar', '/timeline', '/deleted', '/settings', '/privacy', '/diagnostics', '/onboarding', '/onboarding?step=3'];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto('/today');
  await frame(page);
  await seed(page, [{ id: 'a', date: '2026-11-01', title: 'Frost' }, { id: 'b', date: '2026-11-02' }]);
});

for (const theme of ['paper', 'night'] as const) {
  test(`no WCAG 2.2 AA violations on the screens around the page (${theme})`, async ({ page }) => {
    test.setTimeout(120_000); // nine screens, each fully checked
    await page.evaluate((t) => localStorage.setItem('mp.theme', t), theme);
    for (const path of SCREENS) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForTimeout(300); // lists and thumbnails settle
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.map((v) => `${path}: ${v.id} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)).toEqual([]);
    }
  });
}

test('the writing screen passes too, and the canvas says which morning and how many pages', async ({ page }) => {
  const ink = page.locator('[data-ink]');
  await expect(ink).toHaveAttribute('aria-label', /^Entry for .+, 1 page$/);
  await drag(page, 'pen', { x: 200, y: 400 }, { x: 400, y: 400 });
  await page.waitForTimeout(600);
  await drag(page, 'touch', { x: 500, y: 1100 }, { x: 500, y: 200 }, { steps: 8 });
  await page.waitForTimeout(1200);
  await drag(page, 'pen', { x: 200, y: 600 }, { x: 400, y: 600 }); // on page 2
  await frame(page);
  await expect(ink).toHaveAttribute('aria-label', /, 2 pages$/);
  const { violations } = await new AxeBuilder({ page }).exclude('[data-ink] canvas').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)).toEqual([]);
});
