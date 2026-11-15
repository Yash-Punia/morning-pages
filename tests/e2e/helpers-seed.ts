import type { Page } from '@playwright/test';

/** Saved mornings, written straight into the journal's database (as earlier days of the app would). */
export async function seed(page: Page, entries: { id: string; date: string; title?: string; createdAt?: number }[]) {
  await page.evaluate(async (entries) => {
    type T = { bulkAdd(r: object[]): Promise<unknown> };
    const { db, saved } = (window as unknown as { __store: { saved(): Promise<void>; db(): { entries: T; pages: T } } }).__store;
    await saved();
    await db().entries.bulkAdd(entries.map((e, i) => ({ id: e.id, journalId: 'default', entryDate: e.date, createdAt: e.createdAt ?? i + 1, updatedAt: 1, title: e.title ?? '' })));
    await db().pages.bulkAdd(entries.map((e) => ({ id: `${e.id}-p0`, entryId: e.id, index: 0, paper: 'lined-college', size: 'A5', height: 1414, opCount: 0, checksum: 0, updatedAt: 1 })));
  }, entries);
}
