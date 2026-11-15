// Backups off the main thread (TDD 8.1, BAK-1): the worker opens its own connection to the
// journal, so a large backup never freezes the page. One worker per job, ended when it's done.
import Dexie from 'dexie';
import { buildBackup } from '../backup/write.ts';
import { BENCH_DB, seedSample, SAMPLE_YEAR } from '../backup/bench.ts';
import { MIME } from '../backup/format.ts';
import { DB_VERSION, JournalDB } from '../store/db.ts';
import { version } from '../../package.json';

export type BackupRequest =
  | { kind: 'build'; dbName: string; prefs: Record<string, string> }
  /** Seed a sample journal in a throwaway database, time its backup, then delete it. */
  | { kind: 'bench'; entries?: number };

const progress = (phase: string) => (done: number, total: number) => postMessage({ kind: 'progress', phase, done, total });
const build = (d: Dexie, prefs: Record<string, string>) =>
  buildBackup(d, { appVersion: version, schemaVersion: DB_VERSION, prefs, onProgress: progress('build') });

addEventListener('message', async (e: MessageEvent<BackupRequest>) => {
  const req = e.data;
  try {
    if (req.kind === 'build') {
      const d = new JournalDB(req.dbName);
      try {
        const { chunks, manifest } = await build(d, req.prefs);
        postMessage({ kind: 'built', blob: new Blob(chunks as Uint8Array<ArrayBuffer>[], { type: MIME }), manifest });
      } finally {
        d.close();
      }
    } else {
      await Dexie.delete(BENCH_DB);
      const d = new JournalDB(BENCH_DB);
      let result;
      try {
        let t = performance.now();
        const seeded = await seedSample(d, { ...SAMPLE_YEAR, entries: req.entries ?? SAMPLE_YEAR.entries }, progress('seed'));
        const seedMs = performance.now() - t;
        t = performance.now();
        const { chunks } = await build(d, {});
        const buildMs = performance.now() - t;
        result = { kind: 'bench', ...seeded, seedMs, buildMs, bytes: chunks.reduce((n, c) => n + c.length, 0) };
      } finally {
        d.close();
        await Dexie.delete(BENCH_DB); // before replying: the reply ends this worker
      }
      postMessage(result);
    }
  } catch (err) {
    postMessage({ kind: 'error', error: String(err) });
  }
});
