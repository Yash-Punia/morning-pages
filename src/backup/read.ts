// Reading a `.morningpages` backup (TDD 8.3, BAK-4): every file is checked against the manifest's
// sha-256, every record is validated (validate.ts), and a preview says what is inside before
// anything is written. Runs in the backup worker.
import { strFromU8, unzipSync } from 'fflate';
import { DB_VERSION } from '../store/db.ts';
import { assetExt, FORMAT, FORMAT_VERSION, MANIFEST, recordPath, sha256, type Manifest } from './format.ts';
import * as v from './validate.ts';

/** Why a file can't be restored, in the words the restore screen shows. */
export type ReadProblem = 'not-backup' | 'newer' | 'encrypted' | 'damaged';
export class BackupProblem extends Error {
  constructor(readonly problem: ReadProblem) {
    super(problem);
  }
}

export interface Records {
  journals: ReturnType<typeof v.journal>[];
  entries: ReturnType<typeof v.entry>[];
  pages: ReturnType<typeof v.page>[];
  ops: ReturnType<typeof v.op>[];
  blocks: ReturnType<typeof v.block>[];
  assets: (ReturnType<typeof v.asset> & { blob: Blob })[];
  revisions: ReturnType<typeof v.revision>[];
  prefs: ReturnType<typeof v.pref>[];
}

export interface Preview {
  mornings: number;
  pages: number;
  dateRange: [string, string] | null;
  createdAt: number;
  appVersion: string;
}

const lines = (bytes: Uint8Array | undefined) => (bytes ? strFromU8(bytes).split('\n').filter((l) => l.trim()) : []);

export async function readBackup(bytes: Uint8Array): Promise<{ manifest: Manifest; records: Records; preview: Preview }> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new BackupProblem('not-backup');
  }
  let manifest: Manifest;
  try {
    manifest = JSON.parse(strFromU8(files[MANIFEST]!)) as Manifest;
  } catch {
    throw new BackupProblem('not-backup');
  }
  if (manifest?.format !== FORMAT) throw new BackupProblem('not-backup');
  if (!(manifest.formatVersion <= FORMAT_VERSION) || !(manifest.schemaVersion <= DB_VERSION)) throw new BackupProblem('newer');
  if (manifest.encrypted) throw new BackupProblem('encrypted');
  if (!Array.isArray(manifest.files)) throw new BackupProblem('damaged');

  // Every listed file is present and matches its checksum; the record files are all listed.
  for (const f of manifest.files) {
    const got = files[f.path];
    if (!got || got.length !== f.bytes || (await sha256(got)) !== f.sha256) throw new BackupProblem('damaged');
  }
  const listed = new Set(manifest.files.map((f) => f.path));
  for (const name of ['journals', 'entries', 'pages', 'ops'] as const) if (!listed.has(recordPath(name))) throw new BackupProblem('damaged');
  const read = <T>(name: Parameters<typeof recordPath>[0], check: (x: unknown) => T): T[] =>
    listed.has(recordPath(name)) ? lines(files[recordPath(name)]).map((l) => check(JSON.parse(l))) : [];

  let records: Records;
  try {
    const assets = read('assets', v.asset).map((a) => {
      const path = `assets/${a.hash}.${assetExt(a.mime)}`;
      const file = files[path];
      // Listed, so already checked against its sha-256, which must be the asset's own hash.
      if (!file || manifest.files.find((f) => f.path === path)?.sha256 !== a.hash) throw new v.BadRecord('asset file');
      return { ...a, blob: new Blob([file as Uint8Array<ArrayBuffer>], { type: a.mime }) };
    });
    records = {
      journals: read('journals', v.journal),
      entries: read('entries', v.entry),
      pages: read('pages', v.page),
      ops: read('ops', v.op),
      blocks: read('blocks', v.block),
      assets,
      revisions: read('revisions', v.revision),
      prefs: read('kv', v.pref),
    };
  } catch {
    throw new BackupProblem('damaged'); // a record that isn't what it claims (or isn't JSON)
  }

  const live = records.entries.filter((e) => !e.deletedAt);
  const dates = live.map((e) => e.entryDate).sort();
  const liveIds = new Set(live.map((e) => e.id));
  return {
    manifest,
    records,
    preview: {
      mornings: live.length,
      pages: records.pages.filter((p) => liveIds.has(p.entryId)).length,
      dateRange: dates.length ? [dates[0]!, dates.at(-1)!] : null,
      createdAt: num(manifest.createdAt),
      appVersion: String(manifest.appVersion ?? ''),
    },
  };
}

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
