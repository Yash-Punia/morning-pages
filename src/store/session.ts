// Opening entries for writing, and saving what happens to them. The InkDoc in memory is what the
// page shows; every op, title and paper change it reports becomes one queued transaction, so the
// database always catches up with it (TDD 6.1). Nothing is stored until there is ink or a title
// (ENT-1).
import { InkDoc } from '../ink/page.ts';
import { pointsBox } from '../ink/stroke.ts';
import type { Page, PaperStyle, StrokeOp } from '../ink/types.ts';
import { inkPaper } from '../settings.ts';
import { fromRecord, toRecord } from './codec.ts';
import { db, DB_VERSION, dbName, DEFAULT_JOURNAL, type PageRef, type RecoveryRec, type WriteCtx } from './db.ts';
import { noBackupYet, prepareOpen } from './migrate.ts';
import { commitOp, commitPaper, commitTitle, entryOn, purgeDeleted, readEntry } from './entries.ts';
import { writes } from './queue.ts';
import { writable } from 'svelte/store';
import { track } from '../analytics/track.ts';

const TITLE_DEBOUNCE_MS = 500;

/** A local calendar date, 'YYYY-MM-DD' (D-019): the page belongs to the morning it was written in. */
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromLocalDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

let today: InkDoc | undefined;
const opened = new Map<string, InkDoc>();

/** Changes when "+ New entry" replaces today's entry, so the Today screen reopens. */
export const todayKey = writable(0);

const fresh = (day: string) =>
  attach(new InkDoc(inkPaper.get(), { id: crypto.randomUUID(), journalId: DEFAULT_JOURNAL, entryDate: day, createdAt: Date.now() }), false);

/**
 * ENT-2: a new entry for today. Like any entry it is stored only with its first stroke or title
 * (D-046), so a "+" left blank leaves nothing behind. The one it replaces stays open in memory.
 */
export function newToday(date: Date) {
  if (today) opened.set(today.entry.id, today);
  today = fresh(localDate(date));
  todayKey.update((n) => n + 1);
}

/** Today's entry: the saved one if there is one, else a fresh page that is stored on first write. */
export async function openToday(date: Date): Promise<InkDoc> {
  await ready();
  const day = localDate(date);
  if (today?.entry.entryDate !== day) {
    const found = await entryOn(db(), day);
    today = (found && (await load(found.id))) ?? fresh(day);
  }
  today.setPaper(inkPaper.get()); // the Settings choice applies to today's pages (PRD 4.4)
  return today;
}

/** A saved entry, to read or keep writing. */
export async function openEntry(id: string): Promise<InkDoc | undefined> {
  await ready();
  if (today?.entry.id === id) return today;
  return opened.get(id) ?? load(id);
}

async function load(id: string): Promise<InkDoc | undefined> {
  const saved = await readEntry(db(), id);
  if (!saved) return undefined;
  const pages: Page[] = saved.pages.map((p) => ({ id: p.id, index: p.index, paper: p.paper, size: 'A5', height: p.height }));
  const doc = InkDoc.load(saved.entry, saved.entry.title ?? '', pages, saved.ops.map(fromRecord), inkPaper.get());
  opened.set(id, doc);
  return attach(doc);
}

let titleTimer: ReturnType<typeof setTimeout> | undefined;
let pendingTitle: (() => void) | undefined;

function attach(doc: InkDoc, stored = true): InkDoc {
  const entryCtx = (): WriteCtx => ({ entry: doc.entry });
  // entry_started (TDD 9.4): the first stroke or keystroke of an entry that wasn't stored yet.
  const started = (input: 'pen' | 'finger' | 'keyboard') => {
    if (stored) return;
    stored = true;
    track('entry_started', { template: 'none', input });
  };
  doc.onOp = (op, page) => {
    started(doc.input);
    const ctx = { entry: doc.entry, page: pageRef(page) };
    const rec = toRecord(op);
    writes.drop(`rec:${op.id}`); // its recovery mirror is no longer needed (TDD 6.3)
    void writes.push({ run: () => commitOp(db(), ctx, rec), data: { ctx, op } });
  };
  doc.onDraft = (d) => {
    const rec: RecoveryRec = { id: d.id, ctx: { entry: doc.entry, page: pageRef(d.page) }, title: doc.title, tool: d.tool, color: d.color, size: d.size, pts: d.pts, at: Date.now() };
    void writes.push({ key: `rec:${d.id}`, run: () => db().recovery.put(rec) });
  };
  doc.onTitle = (title) => {
    if (title) started('keyboard');
    clearTimeout(titleTimer);
    pendingTitle = () => {
      pendingTitle = undefined;
      const title = doc.title;
      void writes.push({ key: `title:${doc.entry.id}`, run: () => commitTitle(db(), entryCtx(), title), data: { ...entryCtx(), title } });
    };
    titleTimer = setTimeout(pendingTitle, TITLE_DEBOUNCE_MS);
  };
  doc.onPaper = (paper: PaperStyle) => {
    void writes.push({ key: `paper:${doc.entry.id}`, run: () => commitPaper(db(), doc.entry.id, paper) });
  };
  return doc;
}

export const pageRef = (p: Page): PageRef => ({ id: p.id, index: p.index, paper: p.paper, height: p.height });

/** Queue a title still waiting on its debounce (leaving the page, or the app going away). */
export function flushTitle() {
  clearTimeout(titleTimer);
  pendingTitle?.();
}

/** Resolves once everything written so far is on disk. */
export async function saved(): Promise<void> {
  await ready();
  flushTitle();
  return writes.idle();
}

/** What crash recovery did at this launch, for /diagnostics. */
export const recovered = { replayed: 0, skipped: 0, failed: 0 };
let booted: Promise<void> | undefined;

/**
 * Launch, before anything opens: give an older journal a chance to be backed up before its
 * schema is upgraded (TDD 7.4), then put back any stroke that was being written when the app
 * was killed.
 */
// ponytail: a failed version probe is ignored (a WebKit connection blip must not lock the journal
// for the session); fine while no v2 exists. M5 must handle it once a real migration ships.
export const ready = () => (booted ??= prepareOpen(dbName(), DB_VERSION, noBackupYet).catch(() => null).then(replayRecovery)
  // ENT-7: entries deleted over 30 days ago are removed for good, quietly, at launch.
  .then(() => purgeDeleted(db()).catch(() => 0)).then(() => {}));

/** An entry was deleted: stop holding it open, so Today opens another (or a fresh page). */
export function forgetEntry(id: string) {
  if (today?.entry.id === id) today = undefined;
  opened.delete(id);
}

/**
 * Each recovery record is the stroke in progress when the app died, with everything needed to
 * create its entry and page. It goes through the same idempotent commit as a live stroke, so a
 * stale record for a stroke that did get saved never makes a duplicate (TDD 6.3).
 */
async function replayRecovery() {
  const records = await db().recovery.toArray().catch(() => []);
  for (const rec of records) {
    if (!rec.pts.length || (await db().ops.get(rec.id))) {
      recovered.skipped++;
      await db().recovery.delete(rec.id);
      continue;
    }
    try {
      const op: StrokeOp = { kind: 'stroke', id: rec.id, pageId: rec.ctx.page.id, seq: 0, createdAt: rec.at, tool: rec.tool, color: rec.color, size: rec.size, pts: rec.pts, bbox: pointsBox(rec.pts, rec.size) };
      await commitOp(db(), rec.ctx, toRecord(op));
      if (rec.title && !(await db().entries.get(rec.ctx.entry.id))?.title) await commitTitle(db(), rec.ctx, rec.title);
      recovered.replayed++;
    } catch {
      recovered.failed++; // kept for the next launch: never let one record stop the journal opening
    }
  }
}

/** Tests: forget the entries held in memory, as a relaunch would. */
export function forgetOpened() {
  booted = undefined;
  today = undefined;
  opened.clear();
}

if (typeof window !== 'undefined') {
  addEventListener('pagehide', flushTitle);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushTitle(); });
  if (import.meta.env.VITE_E2E === '1') Object.assign(window, { __store: { db, writes, saved } });
}
