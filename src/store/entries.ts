// Repositories over the journal database (TDD 6.1, 7.2). Every write is one transaction that also
// creates its journal, entry and page if they don't exist yet, so the first stroke and a typed
// title can race and still make exactly one entry, and nothing empty is ever stored (ENT-1).
import Dexie from 'dexie';
import type { PaperStyle } from '../ink/types.ts';
import { DEFAULT_JOURNAL, type EntryRec, type JournalDB, type OpRec, type PageRec, type WriteCtx } from './db.ts';

async function ensure(d: JournalDB, ctx: WriteCtx, now: number) {
  const { entry, page } = ctx;
  if (!(await d.journals.get(entry.journalId)))
    await d.journals.add({ id: entry.journalId, name: 'Morning Pages', paper: page?.paper ?? 'lined-college', sortOrder: 0, createdAt: now, updatedAt: now });
  if (!(await d.entries.get(entry.id))) await d.entries.add({ ...entry, updatedAt: now });
  if (page && !(await d.pages.get(page.id)))
    await d.pages.add({ ...page, entryId: entry.id, size: 'A5', opCount: 0, checksum: 0, updatedAt: now });
}

/**
 * One op in its own transaction (DUR-1): creates what it needs, appends the op, updates the page's
 * count and checksum (DUR-5) and the entry's updatedAt, and clears the stroke's recovery record.
 * Idempotent: an op that is already stored is not added twice (recovery replay, retries).
 * An op with seq 0 (a replayed recovery record) takes the page's next seq.
 */
export function commitOp(d: JournalDB, ctx: WriteCtx & { page: NonNullable<WriteCtx['page']> }, op: OpRec) {
  return d.transaction('rw', [d.journals, d.entries, d.pages, d.ops, d.recovery], async () => {
    const now = Date.now();
    await ensure(d, ctx, now);
    if (!(await d.ops.get(op.id))) {
      if (!op.seq) op = { ...op, seq: (await lastSeq(d, op.pageId)) + 1 };
      await d.ops.add(op);
      const page = (await d.pages.get(op.pageId))!;
      await d.pages.update(op.pageId, { opCount: page.opCount + 1, checksum: crc32(op.id, page.checksum), updatedAt: now });
      await d.entries.update(ctx.entry.id, { updatedAt: now });
    }
    await d.recovery.delete(op.id);
  });
}

/** The typed title (D-044). A title alone starts an entry; clearing it never creates one. */
export function commitTitle(d: JournalDB, ctx: WriteCtx, title: string) {
  return d.transaction('rw', [d.journals, d.entries, d.pages], async () => {
    if (!title && !(await d.entries.get(ctx.entry.id))) return;
    const now = Date.now();
    await ensure(d, { entry: ctx.entry }, now);
    await d.entries.update(ctx.entry.id, { title, updatedAt: now });
  });
}

/** Paper chosen in Settings applies to the whole entry (PRD 4.4). */
export function commitPaper(d: JournalDB, entryId: string, paper: PaperStyle) {
  return d.transaction('rw', d.pages, () => d.pages.where('entryId').equals(entryId).modify({ paper }));
}

async function lastSeq(d: JournalDB, pageId: string) {
  const last = await d.ops.where('[pageId+seq]').between([pageId, Dexie.minKey], [pageId, Dexie.maxKey]).last();
  return last?.seq ?? 0;
}

/** The oldest saved morning's date, or undefined for an empty journal (the Timeline's end). */
export async function oldestDate(d: JournalDB): Promise<string | undefined> {
  const first = await d.entries.orderBy('entryDate').filter((e) => !e.deletedAt).first();
  return first?.entryDate;
}

/** The latest entry for a local date in a journal (ENT-2's "+" for more arrives in M4). */
export async function entryOn(d: JournalDB, entryDate: string, journalId = DEFAULT_JOURNAL): Promise<EntryRec | undefined> {
  const all = await d.entries.where('[journalId+entryDate]').equals([journalId, entryDate]).toArray();
  return all.filter((e) => !e.deletedAt).sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** An entry with its stored pages (in order) and every op on them. */
export async function readEntry(d: JournalDB, id: string): Promise<{ entry: EntryRec; pages: PageRec[]; ops: OpRec[] } | undefined> {
  return d.transaction('r', [d.entries, d.pages, d.ops], async () => {
    const entry = await d.entries.get(id);
    if (!entry) return undefined;
    const pages = await d.pages.where('entryId').equals(id).sortBy('index');
    const ops = (await Promise.all(pages.map((p) => d.ops.where('pageId').equals(p.id).toArray()))).flat();
    return { entry, pages, ops };
  });
}

export interface EntryRow {
  id: string; entryDate: string; title: string; pages: number; createdAt: number; updatedAt: number;
  /** The first page's paper and thumbnail (M4.7), for lists that show pages. */
  paper: PaperStyle; thumb?: ArrayBuffer;
}

/**
 * Saved entries (not deleted), newest morning first, with page counts. `from` and `to` are
 * inclusive local dates on the entryDate index, so the Calendar and Timeline read only the months
 * they show. `thumbs` also loads each first page's thumbnail.
 */
export async function listEntries(d: JournalDB, opts: { from?: string; to?: string; thumbs?: boolean } = {}): Promise<EntryRow[]> {
  return d.transaction('r', [d.entries, d.pages], async () => {
    const range = opts.from || opts.to
      ? d.entries.where('entryDate').between(opts.from ?? '', opts.to ?? '9999-12-31', true, true)
      : d.entries.toCollection();
    const entries = (await range.toArray()).filter((e) => !e.deletedAt);
    entries.sort((a, b) => (a.entryDate < b.entryDate ? 1 : a.entryDate > b.entryDate ? -1 : b.createdAt - a.createdAt));
    // One query for all their pages, counted in memory: per-entry queries cost a round trip each.
    const pages = await d.pages.where('entryId').anyOf(entries.map((e) => e.id)).toArray();
    const count = new Map<string, number>();
    const first = new Map<string, PageRec>();
    for (const p of pages) {
      count.set(p.entryId, (count.get(p.entryId) ?? 0) + 1);
      if (p.index === 0) first.set(p.entryId, p);
    }
    return entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      title: e.title ?? '',
      pages: Math.max(1, count.get(e.id) ?? 0),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      paper: first.get(e.id)?.paper ?? 'lined-college',
      thumb: opts.thumbs ? first.get(e.id)?.thumb : undefined,
    }));
  });
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
/** Running CRC-32 over op ids (TDD 6.1), continued from `prev`. */
export function crc32(text: string, prev = 0): number {
  let c = ~prev >>> 0;
  for (let i = 0; i < text.length; i++) c = CRC[(c ^ text.charCodeAt(i)) & 0xff]! ^ (c >>> 8);
  return ~c >>> 0;
}

/** ENT-7: kept in Recently Deleted for this long, then removed for good. */
export const DELETED_DAYS = 30;
const DAY_MS = 86_400_000;

/** Move an entry to Recently Deleted. Nothing is removed: restoring brings it back intact. */
export function deleteEntry(d: JournalDB, id: string, now = Date.now()) {
  return d.entries.update(id, { deletedAt: now });
}

/** Bring an entry back from Recently Deleted. */
export function restoreEntry(d: JournalDB, id: string) {
  return d.transaction('rw', d.entries, async () => {
    const e = await d.entries.get(id);
    if (!e) return;
    delete e.deletedAt;
    await d.entries.put(e); // put, so the deletedAt index entry goes too
  });
}

export interface DeletedRow extends EntryRow { deletedAt: number }

/** Recently Deleted, most recently deleted first (the deletedAt index holds exactly these, TDD 7.1). */
export async function listDeleted(d: JournalDB): Promise<DeletedRow[]> {
  return d.transaction('r', [d.entries, d.pages], async () => {
    const entries = await d.entries.where('deletedAt').above(0).reverse().toArray();
    const pages = await d.pages.where('entryId').anyOf(entries.map((e) => e.id)).toArray();
    return entries.map((e) => {
      const mine = pages.filter((p) => p.entryId === e.id);
      const first = mine.find((p) => p.index === 0);
      return {
        id: e.id, entryDate: e.entryDate, title: e.title ?? '', pages: Math.max(1, mine.length),
        createdAt: e.createdAt, updatedAt: e.updatedAt, deletedAt: e.deletedAt!,
        paper: first?.paper ?? 'lined-college', thumb: first?.thumb,
      };
    });
  });
}

/** When a deleted entry is removed for good. */
export const purgeAt = (deletedAt: number) => deletedAt + DELETED_DAYS * DAY_MS;

/**
 * The only hard delete outside Panic wipe (TDD 7.2): entries deleted more than 30 days ago go,
 * with their pages and ops, in one transaction. Returns how many entries were removed.
 */
export async function purgeDeleted(d: JournalDB, now = Date.now()): Promise<number> {
  return d.transaction('rw', [d.entries, d.pages, d.ops], async () => {
    const old = await d.entries.where('deletedAt').below(now - DELETED_DAYS * DAY_MS).toArray();
    for (const e of old) {
      const pageIds = await d.pages.where('entryId').equals(e.id).primaryKeys();
      await d.ops.where('pageId').anyOf(pageIds).delete();
      await d.pages.bulkDelete(pageIds);
      await d.entries.delete(e.id);
    }
    return old.length;
  });
}
