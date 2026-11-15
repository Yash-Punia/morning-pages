import { expect, test } from '@playwright/test';
import { frame } from './ink-helpers.ts';

type W = { __pwa: { needRefresh: { set(v: boolean): void } }; __updateApplied?: boolean; __store: { writes: { push(j: object): Promise<void> } } };

test('an update is offered on the Library only, and waits until every write is saved (4.12)', async ({ page }) => {
  await page.goto('/today');
  await frame(page);
  await page.evaluate(() => (window as unknown as W).__pwa.needRefresh.set(true));
  await expect(page.getByText('A new version is ready.')).toHaveCount(0); // never on the page

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByText('A new version is ready.')).toBeVisible();
  // A write still going to disk (a slow save): the update must wait for it.
  await page.evaluate(() => { void (window as unknown as W).__store.writes.push({ run: () => new Promise((r) => setTimeout(r, 1500)) }); });
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.getByRole('button', { name: 'Waiting…' })).toBeDisabled();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => (window as unknown as W).__updateApplied ?? false)).toBe(false);
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__updateApplied ?? false)).toBe(true);
});
