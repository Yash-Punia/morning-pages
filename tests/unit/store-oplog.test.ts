import { beforeEach, describe, expect, test } from 'vitest';
import type { Pt } from '../../src/ink/types.ts';
import { db, useDatabase } from '../../src/store/db.ts';
import { forgetOpened, openEntry, openToday, saved } from '../../src/store/session.ts';

let n = 0;
beforeEach(() => {
  useDatabase(`test-session-${n++}`);
  forgetOpened();
});

const day = new Date(2026, 10, 15, 7, 30);
const line = (y: number): Pt[] => Array.from({ length: 30 }, (_, i) => [100 + i * 4, y + Math.sin(i / 4) * 6, 0.5, 1, 0, i * 4]);
const ids = (doc: { strokes(): Iterable<{ id: string }> }) => [...doc.strokes()].map((s) => s.id).sort();

describe('the op log on disk (DUR-2)', () => {
  test('erase, undo and redo are saved as ops and reload to the same visible strokes', async () => {
    const doc = await openToday(day);
    const a = doc.addStroke(line(300), 'ballpoint', 'black', 2.8);
    const b = doc.addStroke(line(500), 'ballpoint', 'black', 2.8);
    doc.erase([a.id]);
    doc.undo(); // a back
    doc.undo(); // b gone
    doc.redo(); // b back
    doc.erase([b.id]);
    await saved();
    forgetOpened();
    const again = await openToday(day);
    expect(ids(again)).toEqual([a.id]);
    expect(await db().ops.count()).toBe(doc.ops.length);
  });
});

describe('write errors (TDD 6.2, STO-4)', () => {
  test('a lost connection mid-writing loses no ops: the queue reopens and retries', async () => {
    const doc = await openToday(day);
    // The prototype that owns add(): shared by every Dexie instance, so the fault survives a reopen.
    let proto = Object.getPrototypeOf(db().ops);
    while (!Object.hasOwn(proto, 'add')) proto = Object.getPrototypeOf(proto);
    const add = proto.add;
    let failures = 3;
    proto.add = function (this: { name: string }, ...a: unknown[]) {
      if (this.name === 'ops' && failures-- > 0) throw Object.assign(new Error('Connection to Indexed Database server lost'), { name: 'UnknownError' });
      return add.apply(this, a);
    };
    try {
      for (let i = 0; i < 5; i++) doc.addStroke(line(200 + i * 60), 'ballpoint', 'black', 2.8);
      await saved();
    } finally {
      proto.add = add;
    }
    expect(failures).toBeLessThan(0);
    expect(await db().ops.count()).toBe(5);
    forgetOpened();
    expect((await openToday(day)).strokeCount).toBe(5);
  });
});
