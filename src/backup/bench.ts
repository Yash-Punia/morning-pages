// A sample journal for timing backups on the device (5.1: a year backs up in under 60 s). It is
// written to a separate, throwaway database, never the journal, by the backup worker.
import type Dexie from 'dexie';
import { encode, simplify } from '../store/codec.ts';
import type { Pt } from '../ink/types.ts';

export const BENCH_DB = 'morning-pages-bench';
/** A dense handwritten page is about 84 KB of points (S2b); 330 wiggly strokes come to that. */
export const SAMPLE_YEAR = { entries: 365, pages: 3, strokes: 330 };

/** Mornings back from today, three dense pages each, through the app's own codec. */
export async function seedSample(d: Dexie, size = SAMPLE_YEAR, onProgress?: (done: number, total: number) => void) {
  let ops = 0;
  let ptsBytes = 0;
  const today = new Date();
  for (let e = 0; e < size.entries; e++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - e - 1);
    const entryDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const id = `sample-${e}`;
    const pages = [];
    const rows = [];
    for (let p = 0; p < size.pages; p++) {
      const pageId = `${id}-p${p}`;
      pages.push({ id: pageId, entryId: id, index: p, paper: 'lined-college', size: 'A5', height: 1414, opCount: size.strokes, checksum: 0, updatedAt: day.getTime() });
      for (let s = 0; s < size.strokes; s++) {
        const x0 = 60 + (s % 12) * 70, y0 = 80 + Math.floor(s / 12) * 45;
        const pts = simplify(Array.from({ length: 60 }, (_, i): Pt => [x0 + i, y0 + 6 * Math.sin(i / 2 + s), 0.4 + 0.2 * Math.sin(i / 3), 1, 0.5, i * 4]));
        const bytes = encode(pts);
        ptsBytes += bytes.length;
        rows.push({ id: `${pageId}-s${s}`, pageId, seq: s + 1, createdAt: day.getTime() + s, kind: 'stroke', tool: 'ballpoint', color: 'black', size: 2.8, pts: bytes, n: pts.length, bbox: [x0, y0 - 6, x0 + 60, y0 + 6] });
      }
    }
    await d.table('entries').add({ id, journalId: 'default', entryDate, createdAt: day.getTime(), updatedAt: day.getTime(), title: '' });
    await d.table('pages').bulkAdd(pages);
    await d.table('ops').bulkAdd(rows);
    ops += rows.length;
    onProgress?.(e + 1, size.entries);
  }
  return { ops, ptsBytes };
}
