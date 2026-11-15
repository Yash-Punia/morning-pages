// Restoring validated records (TDD 8.3, BAK-4). Merge and Replace share one path: Replace first
// clears the journal, then both merge into what's there. Every write is idempotent, in batches of
// 500, so a restore killed midway finishes when the same file is restored again; a marker in kv
// says one is unfinished until the last batch lands.
import type { Table } from 'dexie';
import { crc32 } from '../store/entries.ts';
import type { JournalDB, PageRec } from '../store/db.ts';
import type { Records } from './read.ts';

export type RestoreMode = 'merge' | 'replace';
/** Set before the first write, cleared after the last: an unfinished restore (Library notice). */
export const RESTORE_MARK = 'restoreInProgress';
/** Restored pages have no thumbnails yet; the Library redraws them at idle. */
export const THUMBS_PENDING = 'thumbsPending';
const BATCH = 500;

type Progress = (done: number, total: number) => void;

function batches<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += BATCH) out.push(rows.slice(i, i + BATCH));
  return out;
}

export async function applyRestore(d: JournalDB, r: Records, mode: RestoreMode, onProgress?: Progress) {
  await d.kv.put({ key: RESTORE_MARK, value: Date.now() });
  if (mode === 'replace') {
    const tables = [d.journals, d.entries, d.pages, d.ops, d.blocks, d.assets, d.revisions, d.recovery];
    await d.transaction('rw', tables, () => Promise.all(tables.map((t) => t.clear())));
  }
  const total = r.journals.length + r.entries.length + r.pages.length + r.ops.length + r.blocks.length + r.assets.length + r.revisions.length;
  let done = 0;
  const tick = (n: number) => onProgress?.((done += n), total);

  const touched = new Set<string>();
  if (mode === 'replace') {
    // The journal was just cleared, so there is nothing to compare against: write straight in.
    // put, not add, so a Replace that was cut off and run again lands the same rows.
    const tables: [Table<never, string>, object[]][] = [
      [d.journals as never, r.journals], [d.entries as never, r.entries], [d.pages as never, r.pages],
      [d.ops as never, r.ops], [d.blocks as never, r.blocks], [d.assets as never, r.assets], [d.revisions as never, r.revisions],
    ];
    for (const [table, rows] of tables)
      for (const batch of batches(rows)) {
        await d.transaction('rw', table, () => table.bulkPut(batch as never[]));
        tick(batch.length);
      }
  } else {
    await newestWins(d, d.journals, r.journals, tick);
    await newestWins(d, d.entries, r.entries, tick);
    await mergePages(d, r.pages, touched, tick);
    await unionOps(d, r.ops, touched, tick);
    await newestWins(d, d.blocks as unknown as Table<{ id: string; updatedAt: number }, string>, r.blocks, tick);
    await assetsByHash(d, r.assets, tick);
    await unionById(d, d.revisions, r.revisions, tick);
  }
  // Every page the backup names, not only those changed in this run: a run killed before this
  // step leaves nothing "new" for the next run, but its pages still need their counts made right.
  for (const p of r.pages) touched.add(p.id);
  for (const o of r.ops) touched.add(o.pageId);
  await recount(d, [...touched]);

  await d.kv.bulkPut([{ key: THUMBS_PENDING, value: true }]);
  await d.kv.delete(RESTORE_MARK);
}

/** By id; the newer updatedAt wins, and a tie keeps this iPad's copy. */
async function newestWins<T extends { id: string; updatedAt: number }>(d: JournalDB, table: Table<T, string>, rows: T[], tick: (n: number) => void) {
  for (const batch of batches(rows)) {
    await d.transaction('rw', table, async () => {
      const have = await table.bulkGet(batch.map((x) => x.id));
      const put = batch.filter((x, i) => !have[i] || x.updatedAt > have[i]!.updatedAt);
      if (put.length) await table.bulkPut(put);
    });
    tick(batch.length);
  }
}

/**
 * Pages merge like other records, plus one rule: an incoming page whose slot in its entry is held
 * here by a different page (two copies that grew apart) goes after this iPad's pages, so stored
 * pages keep running 0…n−1 (D-046).
 */
async function mergePages(d: JournalDB, rows: PageRec[], touched: Set<string>, tick: (n: number) => void) {
  const sorted = [...rows].sort((a, b) => (a.entryId < b.entryId ? -1 : a.entryId > b.entryId ? 1 : a.index - b.index));
  for (const batch of batches(sorted)) {
    await d.transaction('rw', d.pages, async () => {
      for (const p of batch) {
        const have = await d.pages.get(p.id);
        if (have) {
          if (p.updatedAt > have.updatedAt) {
            await d.pages.put({ ...p, index: have.index }); // its place here stays; the thumbnail is redrawn
            touched.add(p.id);
          }
          continue;
        }
        let index = p.index;
        if (await d.pages.where('[entryId+index]').equals([p.entryId, index]).first()) {
          const last = await d.pages.where('entryId').equals(p.entryId).sortBy('index');
          index = (last.at(-1)?.index ?? -1) + 1;
        }
        await d.pages.add({ ...p, index });
        touched.add(p.id);
      }
    });
    tick(batch.length);
  }
}

/** Ops never change, so they are a union by id. */
async function unionOps(d: JournalDB, rows: Records['ops'], touched: Set<string>, tick: (n: number) => void) {
  for (const batch of batches(rows)) {
    await d.transaction('rw', d.ops, async () => {
      const have = await d.ops.bulkGet(batch.map((o) => o.id));
      const add = batch.filter((_, i) => !have[i]);
      if (add.length) await d.ops.bulkAdd(add);
      for (const o of add) touched.add(o.pageId);
    });
    tick(batch.length);
  }
}

async function unionById<T extends { id: string }>(d: JournalDB, table: Table<T, string>, rows: T[], tick: (n: number) => void) {
  for (const batch of batches(rows)) {
    await d.transaction('rw', table, async () => {
      const have = await table.bulkGet(batch.map((x) => x.id));
      const add = batch.filter((_, i) => !have[i]);
      if (add.length) await table.bulkAdd(add);
    });
    tick(batch.length);
  }
}

/** Assets are stored once per content hash. */
async function assetsByHash(d: JournalDB, rows: Records['assets'], tick: (n: number) => void) {
  const table = d.assets as unknown as Table<Records['assets'][number], string>;
  for (const a of rows) {
    await d.transaction('rw', table, async () => {
      if (!(await table.where('hash').equals(a.hash).first()) && !(await table.get(a.id))) await table.add(a);
    });
    tick(1);
  }
}

/**
 * Each touched page's opCount and checksum, recomputed from its ops in fold order (seq,
 * createdAt, id), the order the page is read in (TDD 7.2), so the self-check (DUR-5) agrees.
 */
export async function recount(d: JournalDB, pageIds: string[]) {
  for (const batch of batches(pageIds)) {
    await d.transaction('rw', [d.pages, d.ops], async () => {
      for (const id of batch) {
        if (!(await d.pages.get(id))) continue; // ops whose page isn't in either copy
        const ops = await d.ops.where('pageId').equals(id).toArray();
        ops.sort((a, b) => a.seq - b.seq || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
        await d.pages.update(id, { opCount: ops.length, checksum: ops.reduce((c, o) => crc32(o.id, c), 0) });
      }
    });
  }
}
