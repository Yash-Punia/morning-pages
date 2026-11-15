// The main thread's side of backups: collect what the worker can't read (localStorage), wait for
// pending writes, and hand back a ready file (TDD 8.1, 8.2).
import { dbName } from '../store/db.ts';
import { localDate, saved } from '../store/session.ts';
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
