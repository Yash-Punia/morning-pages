import { expect, test } from '@playwright/test';
import { seed } from './helpers-seed.ts';
import { drag, frame } from './ink-helpers.ts';

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

/** Every journal record, in a form that compares exactly (points as plain arrays, no thumbnails). */
const dump = (page: import('@playwright/test').Page) =>
  page.evaluate(async () => {
    type Rows = { toArray(): Promise<Record<string, unknown>[]> };
    const { db, saved } = (window as unknown as { __store: { saved(): Promise<void>; db(): Record<string, Rows> } }).__store;
    await saved();
    const all = async (t: string) =>
      (await db()[t]!.toArray())
        .map(({ thumb: _t, thumbOps: _o, ...r }) => (r.pts instanceof Uint8Array ? { ...r, pts: Array.from(r.pts) } : r))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return { journals: await all('journals'), entries: await all('entries'), pages: await all('pages'), ops: await all('ops') };
  });

test('backup → wipe → restore gives back every record, checksum and preference (5.6, PRD 12.3)', async ({ page }, info) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.goto('/today');
  await frame(page);
  await page.evaluate(() => localStorage.setItem('mp.theme', 'night'));
  for (const y of [400, 480, 560]) await drag(page, 'pen', { x: 200, y }, { x: 520, y: y + 10 });
  await page.getByRole('textbox', { name: /title/i }).fill('Before the wipe');
  await page.evaluate(() => { (window as unknown as { __ink: { mode: string } }).__ink.mode = 'eraser'; });
  await drag(page, 'pen', { x: 360, y: 380 }, { x: 360, y: 420 }); // an erase op too
  const before = await dump(page);
  expect(before.ops.length).toBeGreaterThanOrEqual(4);
  expect(before.ops.some((o) => o.kind === 'erase')).toBe(true);

  await page.goto('/settings');
  const backup = page.getByRole('list', { name: 'Backup' });
  await backup.getByRole('button', { name: 'Back up now' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), backup.getByRole('button', { name: 'Save backup' }).click()]);
  const file = info.outputPath(download.suggestedFilename());
  await download.saveAs(file);

  // The iPad loses its journal (and its preferences go back to defaults).
  await page.evaluate(async () => {
    const { db } = (window as unknown as { __store: { db(): { tables: { clear(): Promise<void> }[] } } }).__store;
    await Promise.all(db().tables.map((t) => t.clear()));
    localStorage.setItem('mp.theme', 'paper');
  });

  await page.goto('/restore');
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeFocused();
  await expect(page.getByText('1 morning,', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click(); // an empty iPad: nothing to replace
  await page.waitForURL('**/library');
  await expect(page.getByText('Before the wipe').first()).toBeVisible();

  expect(await dump(page)).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('mp.theme'))).toBe('night'); // came back with the journal
});

test('a merge restore keeps pages written here and adds the backup’s (5.6)', async ({ page }, info) => {
  await page.goto('/library');
  await seed(page, [{ id: 'from-backup', date: daysAgo(3), title: 'In the backup' }]);
  await page.goto('/settings');
  const backup = page.getByRole('list', { name: 'Backup' });
  await backup.getByRole('button', { name: 'Back up now' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), backup.getByRole('button', { name: 'Save backup' }).click()]);
  const file = info.outputPath(download.suggestedFilename());
  await download.saveAs(file);

  await page.evaluate(async () => {
    const { db } = (window as unknown as { __store: { db(): { tables: { clear(): Promise<void> }[] } } }).__store;
    await Promise.all(db().tables.map((t) => t.clear()));
  });
  await seed(page, [{ id: 'written-here', date: daysAgo(1), title: 'Only on this iPad' }]);

  await page.goto('/restore');
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('button', { name: 'Merge into this iPad' }).click();
  await page.waitForURL('**/library');
  await expect(page.getByText('In the backup')).toBeVisible();
  await expect(page.getByText('Only on this iPad')).toBeVisible();
});
