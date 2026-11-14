import { beforeEach, describe, expect, test } from 'vitest';
import type { Pt } from '../../src/ink/types.ts';
import { db, DEFAULT_JOURNAL, useDatabase, type RecoveryRec } from '../../src/store/db.ts';
import { listEntries } from '../../src/store/entries.ts';
import { forgetOpened, openToday, recovered, saved } from '../../src/store/session.ts';

let n = 0;
beforeEach(() => {
  useDatabase(`test-recovery-${n++}`);
  forgetOpened();
});

const day = new Date(2026, 10, 15, 7, 30);
const line = (y: number, len = 30): Pt[] => Array.from({ length: len }, (_, i) => [100 + i * 4, y, 0.5, 1, 0, i * 4]);
const record = (over: Partial<RecoveryRec> = {}): RecoveryRec => ({
  id: 'stroke-1',
  ctx: { entry: { id: 'e1', journalId: DEFAULT_JOURNAL, entryDate: '2026-11-15', createdAt: 1 }, page: { id: 'p1', index: 0, paper: 'lined-college', height: 1414 } },
  title: '', tool: 'ballpoint', color: 'black', size: 2.8, pts: line(400), at: 5, ...over,
});

describe('crash recovery (DUR-4, D-017)', () => {
  test('the first stroke of a never-saved morning comes back with its entry, page and title', async () => {
    await db().recovery.put(record({ title: 'Early' })); // all that survived the kill
    const doc = await openToday(day);
    expect(doc.strokeCount).toBe(1);
    expect(doc.title).toBe('Early');
    expect((await listEntries(db())).map((r) => [r.title, r.pages])).toEqual([['Early', 1]]);
    expect(await db().recovery.count()).toBe(0);
  });

  test('a stale record for a stroke that was saved makes no duplicate', async () => {
    const doc = await openToday(day);
    const op = doc.addStroke(line(400), 'ballpoint', 'black', 2.8);
    await saved();
    await db().recovery.put(record({ id: op.id, ctx: { entry: doc.entry, page: { ...record().ctx.page, id: op.pageId } } }));
    forgetOpened(); // relaunch
    const skipped = recovered.skipped;
    expect((await openToday(day)).strokeCount).toBe(1);
    expect(await db().ops.count()).toBe(1);
    expect(recovered.skipped).toBe(skipped + 1);
  });

  test('the stroke in progress is mirrored at its first sample, then at most every 250 ms', async () => {
    const doc = await openToday(day);
    doc.draft('s', line(400, 1), 'ballpoint', 'black', 2.8, 1000);
    doc.draft('s', line(400, 5), 'ballpoint', 'black', 2.8, 1100); // too soon
    doc.draft('s', line(400, 9), 'ballpoint', 'black', 2.8, 1260);
    await saved();
    expect((await db().recovery.get('s'))?.pts.length).toBe(9);
    doc.addStroke(line(400, 12), 'ballpoint', 'black', 2.8, 's'); // saved: the mirror is cleared
    await saved();
    expect(await db().recovery.count()).toBe(0);
    expect(await db().ops.count()).toBe(1);
  });
});
