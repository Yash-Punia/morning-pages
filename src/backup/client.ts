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
import { EXTENSION, MIME, PORTABLE_PREFS, type Manifest } from './format.ts';

export interface Built { file: File; manifest: Manifest }
export interface Bench { ops: number; ptsBytes: number; seedMs: number; buildMs: number; bytes: number }
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

/** One job in a fresh worker, ended afterwards so its memory goes with it. */
async function run<T>(req: BackupRequest, done: string, onProgress?: Progress): Promise<T> {
  const worker = new Worker(new URL('../workers/backup.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<T>((resolve, reject) => {
      worker.addEventListener('message', (e: MessageEvent) => {
        const m = e.data;
        if (m.kind === 'progress') onProgress?.(m.total ? m.done / m.total : 1, m.phase);
        else if (m.kind === 'error') reject(new Error(m.error));
        else if (m.kind === done) resolve(m as T);
      });
      worker.addEventListener('error', (e) => reject(new Error(e.message || 'backup worker failed')));
      worker.postMessage(req);
    });
  } finally {
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

// --- The two-tap flow (D-020) ---------------------------------------------------------------

export type BackupState =
  | { step: 'idle'; outcome?: Exclude<ShareOutcome, 'cancelled'> }
  | { step: 'building'; progress: number }
  | { step: 'ready'; built: Built }
  | { step: 'error' };

export const backup = writable<BackupState>({ step: 'idle' });

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
