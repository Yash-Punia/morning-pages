// The main thread's side of backups: collect what the worker can't read (localStorage), wait for
// pending writes, and hand the file to iPadOS in two taps (TDD 8.1, 8.2, D-020). Settings, the
// Library's reminder and ⌘B all drive the one `backup` store through backupAction().
import { writable, get } from 'svelte/store';
import { backupSizeBucket } from '../analytics/events.ts';
import { track } from '../analytics/track.ts';
import { db, dbName } from '../store/db.ts';
import { writes } from '../store/queue.ts';
import { localDate, saved } from '../store/session.ts';
import { shareFile, type ShareOutcome } from '../store/share.ts';
import { checkStorage } from '../store/storage.ts';
import type { BackupRequest } from '../workers/backup.ts';
import { thumbsSettled } from '../store/thumbs.ts';
import { EXTENSION, MIME, PORTABLE_PREFS, type Manifest } from './format.ts';
import type { Preview } from './read.ts';
import { RESTORE_MARK, type RestoreMode } from './restore.ts';

export interface Built { file: File; manifest: Manifest }
export interface Bench { ops: number; ptsBytes: number; seedMs: number; buildMs: number; readMs: number; restoreMs: number; bytes: number }
export type Progress = (fraction: number, phase: string) => void;

/** Portable preferences from localStorage (owner decision, M5). */
export function readPrefs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PORTABLE_PREFS) {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) out[key] = v;
    } catch { /* private mode: nothing to carry */ }
  }
  return out;
}

export const backupName = (createdAt: number) => `Morning Pages ${localDate(new Date(createdAt))}${EXTENSION}`;

/**
 * A worker that iOS kills (memory pressure) just goes quiet, with no error event. Two minutes
 * without a word ends the job as failed, so no screen waits forever. Reading a year's file is
 * one synchronous unzip with no progress, so the limit is generous.
 */
const SILENCE_MS = 120_000;

/** One job in a fresh worker, ended afterwards so its memory goes with it. */
async function run<T>(req: BackupRequest, done: string, onProgress?: Progress): Promise<T> {
  const worker = new Worker(new URL('../workers/backup.ts', import.meta.url), { type: 'module' });
  let quiet: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      const listen = () => {
        clearTimeout(quiet);
        quiet = setTimeout(() => reject(new Error('the backup worker stopped responding')), SILENCE_MS);
      };
      listen();
      worker.addEventListener('message', (e: MessageEvent) => {
        listen();
        const m = e.data;
        if (m.kind === 'progress') onProgress?.(m.total ? m.done / m.total : 1, m.phase);
        else if (m.kind === 'error') reject(new Error(m.error));
        else if (m.kind === done) resolve(m as T);
      });
      worker.addEventListener('error', (e) => reject(new Error(e.message || 'backup worker failed')));
      worker.postMessage(req);
    });
  } finally {
    clearTimeout(quiet);
    worker.terminate();
  }
}

/** Build a backup of everything on disk, in a worker. Pending strokes are saved first. */
export async function buildBackupFile(onProgress?: Progress): Promise<Built> {
  await saved();
  const m = await run<{ blob: Blob; manifest: Manifest }>({ kind: 'build', dbName: dbName(), prefs: readPrefs() }, 'built', onProgress);
  return { file: new File([m.blob], backupName(m.manifest.createdAt), { type: MIME }), manifest: m.manifest };
}

/** /diagnostics: time a backup of a sample year, in a throwaway database (never the journal). */
export const benchBackup = (onProgress?: Progress, entries?: number) => run<Bench>({ kind: 'bench', entries }, 'bench', onProgress);

// --- Restore (TDD 8.3, BAK-4) -----------------------------------------------------------------

/** Check a backup file in the worker and say what's inside. Rejects with a ReadProblem name. */
export const previewBackup = (file: File) => run<{ preview: Preview }>({ kind: 'preview', file }, 'preview').then((m) => m.preview);

/** Whether this iPad has a journal a Replace would remove (Recently Deleted counts). */
export const hasJournal = () => db().entries.count().then((n) => n > 0);

/** A restore was started and never finished (Library notice). */
export const restoreUnfinished = () => db().kv.get(RESTORE_MARK).then((r) => !!r, () => false);

/**
 * Restore a backup, then reload into the Library: pages held in memory, and their seq counters,
 * are stale after a restore, so the app starts again from disk. Preferences come along on a
 * Replace, or into an empty journal (owner decision, M5); a Merge keeps this iPad's.
 */
export async function restoreBackup(file: File, mode: RestoreMode, preview: Preview, onProgress?: Progress) {
  const empty = !(await hasJournal());
  await Promise.all([saved(), thumbsSettled()]);
  const { prefs } = await run<{ prefs: { key: string; value: string }[] }>({ kind: 'restore', file, dbName: dbName(), mode }, 'restored', onProgress);
  if (mode === 'replace' || empty)
    for (const p of prefs) {
      // An opt-out travels; a backup never turns usage counts back on (TDD 9.4).
      if (p.key === 'mp.analytics' && p.value !== 'off') continue;
      try { localStorage.setItem(p.key, p.value); } catch { /* private mode: keep this iPad's */ }
    }
  // The Library says what arrived, once (the end of the most anxious flow shouldn't be silent).
  try { sessionStorage.setItem(RESTORED, JSON.stringify({ mornings: preview.mornings, range: preview.dateRange })); } catch { /* no note, still restored */ }
  location.replace('/library');
}

const RESTORED = 'mp.restored';
/** What the last restore brought, read once by the Library after the reload. */
export function takeRestored(): { mornings: number; range: [string, string] | null } | null {
  try {
    const v = sessionStorage.getItem(RESTORED);
    sessionStorage.removeItem(RESTORED);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

// --- The two-tap flow (D-020)---------------------------------------------------------------

export type BackupState =
  | { step: 'idle'; outcome?: Exclude<ShareOutcome, 'cancelled'> }
  | { step: 'building'; progress: number }
  | { step: 'ready'; built: Built }
  | { step: 'error' };

export const backup = writable<BackupState>({ step: 'idle' });

// A built file is a snapshot. Once more writing is saved after it, it no longer holds everything,
// so the pill goes back to "Back up now" rather than saving an old copy as if it were current.
writes.state.subscribe((s) => {
  if (s === 'saving' && get(backup).step === 'ready') backup.set({ step: 'idle' });
});

/** When the last saved backup was made (device state in IndexedDB's kv, never in a backup). */
export const lastBackupAt = writable<number | null | undefined>(undefined);
const LAST = 'lastBackupAt';
export async function loadLastBackup() {
  const row = await db().kv.get(LAST).catch(() => undefined);
  lastBackupAt.set(typeof row?.value === 'number' ? row.value : null);
}

/**
 * The backup button's one action, whatever it shows: build ("Back up now"), or hand the built
 * file to the share sheet ("Save backup"). Call it straight from the tap or key press.
 */
export async function backupAction(): Promise<void> {
  const s = get(backup);
  if (s.step === 'building') return;
  if (s.step === 'ready') return save(s.built);
  backup.set({ step: 'building', progress: 0 });
  try {
    const built = await buildBackupFile((progress, phase) => phase === 'build' && backup.set({ step: 'building', progress }));
    backup.set({ step: 'ready', built });
  } catch {
    backup.set({ step: 'error' });
  }
}

async function save(built: Built) {
  const outcome = await shareFile(built.file);
  if (outcome === 'cancelled') return; // still ready: the next tap opens the share sheet again
  // The backup's own time, not now: a file built earlier and saved later is only that fresh.
  const at = built.manifest.createdAt;
  await writes.push({ run: () => db().kv.put({ key: LAST, value: at }) });
  lastBackupAt.set(at);
  backup.set({ step: 'idle', outcome });
  track('backup_done', { size: backupSizeBucket(built.file.size), encrypted: false });
  void checkStorage(); // TDD 6.5: fresh numbers after a backup
}
