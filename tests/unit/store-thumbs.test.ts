import { beforeEach, describe, expect, test } from 'vitest';
import type { Pt } from '../../src/ink/types.ts';
import { db, useDatabase } from '../../src/store/db.ts';
import { forgetOpened, openToday, saved } from '../../src/store/session.ts';
import { refreshThumbs, type Palette, type Render } from '../../src/store/thumbs.ts';
import type { ThumbJob } from '../../src/ink/thumb.ts';

let n = 0;
beforeEach(() => {
  useDatabase(`test-thumbs-${n++}`);
  forgetOpened();
});

const day = new Date(2026, 10, 15, 7);
const line = (y: number): Pt[] => Array.from({ length: 20 }, (_, i) => [100 + i * 5, y, 0.5, 1, 0, i * 4]);
const palette = (): Palette => ({ paper: { paper: 'p', rule: 'r', ink: 'i', inkSoft: 's' }, ink: (id) => `ink:${id}` });
const recorder = () => {
  const jobs: ThumbJob[] = [];
  const render: Render = async (job) => (jobs.push(job), new Blob(['jpeg'], { type: 'image/jpeg' }));
  return { jobs, render };
};

describe('page thumbnails (M4.7)', () => {
  test('only stored pages whose ops changed since their last thumbnail are drawn', async () => {
    const doc = await openToday(day);
    doc.addStroke(line(300), 'ballpoint', 'black', 2.8);
    doc.addStroke(line(1600), 'fountain', 'sepia', 5); // page 2
    const { jobs, render } = recorder();

    await refreshThumbs(doc, render, palette);
    await saved();
    expect(jobs.map((j) => [j.page, j.strokes.length, j.strokes[0]!.color])).toEqual([[1, 1, 'ink:black'], [2, 1, 'ink:sepia']]);
    expect((await db().pages.toArray()).every((p) => p.thumb!.byteLength === 4 && p.thumbOps === p.opCount)).toBe(true);

    await refreshThumbs(doc, render, palette); // nothing changed
    expect(jobs.length).toBe(2);

    doc.addStroke(line(1700), 'ballpoint', 'black', 2.8); // page 2 only
    await refreshThumbs(doc, render, palette);
    expect(jobs.length).toBe(3);
    expect(jobs[2]!.page).toBe(2);
    expect(jobs[2]!.strokes.length).toBe(2);
  });

  test('an erased stroke leaves the thumbnail too', async () => {
    const doc = await openToday(day);
    const a = doc.addStroke(line(300), 'ballpoint', 'black', 2.8);
    doc.addStroke(line(400), 'ballpoint', 'black', 2.8);
    const { jobs, render } = recorder();
    await refreshThumbs(doc, render, palette);
    doc.erase([a.id]);
    await refreshThumbs(doc, render, palette);
    expect(jobs.at(-1)!.strokes.length).toBe(1);
  });

  test('a thumbnail that fails never holds up saving: it is not in the write queue', async () => {
    const doc = await openToday(day);
    doc.addStroke(line(300), 'ballpoint', 'black', 2.8);
    await refreshThumbs(doc, async () => { throw new Error('no canvas here'); }, palette);
    doc.addStroke(line(400), 'ballpoint', 'black', 2.8);
    await saved();
    expect(await db().ops.count()).toBe(2);
    expect((await db().pages.toArray())[0]!.thumb).toBeUndefined(); // tried again at the next close
  });

  test('an entry with nothing stored draws nothing', async () => {
    const doc = await openToday(day);
    const { jobs, render } = recorder();
    await refreshThumbs(doc, render, palette);
    expect(jobs).toEqual([]);
  });
});

describe('thumbnails after a restore (TDD 8.3 step 5)', () => {
  test('every restored page is drawn at idle, then the flag clears; leaving for a page pauses it', async () => {
    const { redrawRestored } = await import('../../src/store/thumbs.ts');
    const { THUMBS_PENDING } = await import('../../src/backup/restore.ts');
    const doc = await openToday(day);
    doc.addStroke(line(300), 'ballpoint', 'black', 2.8);
    doc.addStroke(line(1600), 'ballpoint', 'black', 2.8); // page 2
    await saved();
    await db().kv.put({ key: THUMBS_PENDING, value: true });
    const { jobs, render } = recorder();

    await redrawRestored(() => true, render, palette); // the writer opened a page first
    expect(jobs).toEqual([]);
    expect(await db().kv.get(THUMBS_PENDING)).toBeDefined();

    await redrawRestored(() => false, render, palette);
    expect(jobs.map((j) => j.page)).toEqual([1, 2]);
    expect(await db().kv.get(THUMBS_PENDING)).toBeUndefined();
    expect((await db().pages.toArray()).every((p) => p.thumbOps === p.opCount)).toBe(true);
  });
});
