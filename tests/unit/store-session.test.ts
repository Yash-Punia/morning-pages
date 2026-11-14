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

describe('saving entries (ENT-1, DUR-1, DUR-2)', () => {
  test('opening today and leaving without writing stores nothing', async () => {
    await openToday(day);
    await saved();
    expect(await db().entries.count()).toBe(0);
    expect(await db().pages.count()).toBe(0);
  });

  test('the first stroke stores the entry, its page and the op; a relaunch shows the same page', async () => {
    const doc = await openToday(day);
    doc.addStroke(line(400), 'ballpoint', 'black', 2.8);
    doc.addStroke(line(1500), 'fountain', 'blueBlack', 5); // page 2
    await saved();
    expect(await db().entries.count()).toBe(1);
    expect(await db().pages.count()).toBe(2); // the trailing blank page is never stored

    forgetOpened();
    const again = await openToday(day);
    expect(again.entry.id).toBe(doc.entry.id);
    expect(ids(again)).toEqual(ids(doc));
    expect(again.pages.length).toBe(3); // two written + the blank one below
  });

  test('a title alone starts the entry; a title and a stroke together make exactly one', async () => {
    const doc = await openToday(day);
    doc.setTitle('Rain');
    doc.addStroke(line(400), 'ballpoint', 'black', 2.8); // within the title's debounce
    await saved();
    expect(await db().entries.count()).toBe(1);
    expect((await db().entries.get(doc.entry.id))?.title).toBe('Rain');
    forgetOpened();
    expect((await openEntry(doc.entry.id))?.title).toBe('Rain');
  });

  test('the next day opens a new entry', async () => {
    const doc = await openToday(day);
    doc.addStroke(line(400), 'ballpoint', 'black', 2.8);
    await saved();
    const tomorrow = await openToday(new Date(2026, 10, 16, 7));
    expect(tomorrow.entry.id).not.toBe(doc.entry.id);
    expect(tomorrow.strokeCount).toBe(0);
  });
});
