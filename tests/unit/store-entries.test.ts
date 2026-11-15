import { beforeEach, describe, expect, test } from 'vitest';
import { db, DEFAULT_JOURNAL, useDatabase, type OpRec, type WriteCtx } from '../../src/store/db.ts';
import { commitOp, commitPaper, commitTitle, crc32, entryOn, listEntries, readEntry } from '../../src/store/entries.ts';

let n = 0;
beforeEach(() => useDatabase(`test-entries-${n++}`));

const ctx = (entryId = 'e1', date = '2026-11-15', pageId = 'p1', index = 0): Required<WriteCtx> => ({
  entry: { id: entryId, journalId: DEFAULT_JOURNAL, entryDate: date, createdAt: 1 },
  page: { id: pageId, index, paper: 'lined-college', height: 1414 },
});
const stroke = (id: string, pageId = 'p1', seq = 1): OpRec => ({ id, pageId, seq, createdAt: 1, kind: 'stroke', tool: 'ballpoint', color: 'black', size: 2.8, pts: new Uint8Array([1, 2, 3]), n: 1, bbox: [0, 0, 1, 1] });

describe('store repositories (TDD 6.1, 7.2)', () => {
  test('the first op creates the journal, entry and page with it, in one transaction', async () => {
    await commitOp(db(), ctx(), stroke('s1'));
    expect(await db().journals.count()).toBe(1);
    const e = await readEntry(db(), 'e1');
    expect(e?.entry.entryDate).toBe('2026-11-15');
    expect(e?.pages.map((p) => [p.id, p.opCount, p.checksum])).toEqual([['p1', 1, crc32('s1')]]);
    expect(e?.ops.map((o) => o.id)).toEqual(['s1']);
  });

  test('a title and a first stroke racing make exactly one entry (ENT-1)', async () => {
    await Promise.all([commitTitle(db(), ctx(), 'A slow start'), commitOp(db(), ctx(), stroke('s1'))]);
    expect(await db().entries.count()).toBe(1);
    expect(await db().journals.count()).toBe(1);
    expect((await db().entries.get('e1'))?.title).toBe('A slow start');
  });

  test('an empty title never creates an entry; clearing a stored title keeps the entry', async () => {
    await commitTitle(db(), ctx(), '');
    expect(await db().entries.count()).toBe(0);
    await commitTitle(db(), ctx(), 'Draft');
    await commitTitle(db(), ctx(), '');
    expect((await db().entries.get('e1'))?.title).toBe('');
  });

  test('committing the same op twice stores it once and clears its recovery record', async () => {
    await db().recovery.put({ id: 's1', ctx: ctx(), title: '', tool: 'ballpoint', color: 'black', size: 2.8, pts: [], at: 0 });
    await commitOp(db(), ctx(), stroke('s1'));
    await commitOp(db(), ctx(), stroke('s1'));
    expect(await db().ops.count()).toBe(1);
    expect((await db().pages.get('p1'))?.opCount).toBe(1);
    expect(await db().recovery.count()).toBe(0);
  });

  test('an op without a seq (a replayed recovery) takes the next one on its page', async () => {
    await commitOp(db(), ctx(), stroke('s1', 'p1', 1));
    await commitOp(db(), ctx(), stroke('s2', 'p1', 0));
    expect((await db().ops.get('s2'))?.seq).toBe(2);
  });

  test('entryOn finds the latest entry for a date; deleted ones are skipped', async () => {
    await commitOp(db(), ctx('a'), stroke('s1'));
    await commitOp(db(), { ...ctx('b', '2026-11-15', 'p2'), entry: { ...ctx('b').entry, createdAt: 5 } }, stroke('s2', 'p2'));
    expect((await entryOn(db(), '2026-11-15'))?.id).toBe('b');
    await db().entries.update('b', { deletedAt: 9 });
    expect((await entryOn(db(), '2026-11-15'))?.id).toBe('a');
    expect(await entryOn(db(), '2026-11-14')).toBeUndefined();
  });

  test('listEntries: newest morning first, with titles and stored page counts', async () => {
    await commitOp(db(), ctx('old', '2026-11-13'), stroke('s1'));
    await commitOp(db(), ctx('new', '2026-11-15', 'p2'), stroke('s2', 'p2'));
    await commitOp(db(), ctx('new', '2026-11-15', 'p3', 1), stroke('s3', 'p3'));
    await commitTitle(db(), ctx('new'), 'Rain');
    const rows = await listEntries(db());
    expect(rows.map((r) => [r.id, r.title, r.pages])).toEqual([['new', 'Rain', 2], ['old', '', 1]]);
  });

  test('paper changes apply to every stored page of the entry', async () => {
    await commitOp(db(), ctx(), stroke('s1'));
    await commitPaper(db(), 'e1', 'grid', 5000);
    expect((await db().pages.get('p1'))?.paper).toBe('grid');
    expect((await db().pages.get('p1'))?.updatedAt).toBe(5000); // a merge keeps the newer paper
  });

  test('crc32 matches the standard check value and runs on', () => {
    expect(crc32('123456789')).toBe(0xcbf43926);
    expect(crc32('6789', crc32('12345'))).toBe(0xcbf43926);
  });
});

describe('listing for the Calendar and Timeline (M4)', () => {
  test('a date range reads only those mornings; thumbnails come with the first page', async () => {
    await commitOp(db(), ctx('a', '2026-10-31', 'pa'), stroke('s1', 'pa'));
    await commitOp(db(), ctx('b', '2026-11-01', 'pb'), stroke('s2', 'pb'));
    await commitOp(db(), ctx('c', '2026-11-30', 'pc'), stroke('s3', 'pc'));
    await commitOp(db(), ctx('d', '2026-12-01', 'pd'), stroke('s4', 'pd'));
    await db().pages.update('pb', { thumb: new Uint8Array([255, 216]).buffer, thumbOps: 1 });
    const nov = await listEntries(db(), { from: '2026-11-01', to: '2026-11-30', thumbs: true });
    expect(nov.map((r) => r.id)).toEqual(['c', 'b']);
    expect(nov[1]!.thumb?.byteLength).toBe(2);
    expect(nov[1]!.paper).toBe('lined-college');
    expect((await listEntries(db(), { from: '2026-11-01', to: '2026-11-30' }))[1]!.thumb).toBeUndefined();
  });
});
