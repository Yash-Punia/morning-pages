import { beforeEach, describe, expect, test } from 'vitest';
import { db, DEFAULT_JOURNAL, useDatabase, type OpRec, type WriteCtx } from '../../src/store/db.ts';
import { commitOp, deleteEntry, entryOn, listDeleted, listEntries, purgeDeleted, readEntry, restoreEntry } from '../../src/store/entries.ts';

let n = 0;
beforeEach(() => useDatabase(`test-deleted-${n++}`));

const DAY = 86_400_000;
const ctx = (id: string, date = '2026-11-15'): Required<WriteCtx> => ({
  entry: { id, journalId: DEFAULT_JOURNAL, entryDate: date, createdAt: 1 },
  page: { id: `${id}-p`, index: 0, paper: 'grid', height: 1414 },
});
const stroke = (id: string, pageId: string): OpRec => ({ id, pageId, seq: 1, createdAt: 1, kind: 'stroke', tool: 'ballpoint', color: 'black', size: 2.8, pts: new Uint8Array([1]), n: 1, bbox: [0, 0, 1, 1] });

describe('Recently Deleted (ENT-7)', () => {
  test('a deleted entry leaves the lists and today, and is restored intact', async () => {
    await commitOp(db(), ctx('a'), stroke('s1', 'a-p'));
    await deleteEntry(db(), 'a', 1000);
    expect(await listEntries(db())).toEqual([]);
    expect(await entryOn(db(), '2026-11-15')).toBeUndefined();
    expect((await listDeleted(db())).map((r) => [r.id, r.deletedAt, r.paper])).toEqual([['a', 1000, 'grid']]);

    await restoreEntry(db(), 'a');
    expect(await listDeleted(db())).toEqual([]);
    const back = await readEntry(db(), 'a');
    expect(back?.entry.deletedAt).toBeUndefined();
    expect(back?.ops.map((o) => o.id)).toEqual(['s1']);
  });

  test('the purge removes only entries deleted over 30 days ago, with all their rows', async () => {
    const now = 100 * DAY;
    await commitOp(db(), ctx('old'), stroke('s1', 'old-p'));
    await commitOp(db(), ctx('recent'), stroke('s2', 'recent-p'));
    await commitOp(db(), ctx('kept'), stroke('s3', 'kept-p'));
    await deleteEntry(db(), 'old', now - 31 * DAY);
    await deleteEntry(db(), 'recent', now - 29 * DAY);
    expect(await purgeDeleted(db(), now)).toBe(1);
    expect(await db().entries.get('old')).toBeUndefined();
    expect(await db().pages.get('old-p')).toBeUndefined();
    expect(await db().ops.get('s1')).toBeUndefined();
    expect((await listDeleted(db())).map((r) => r.id)).toEqual(['recent']);
    expect((await listEntries(db())).map((r) => r.id)).toEqual(['kept']);
  });
});
