// Building a `.morningpages` backup (TDD 8.1, BAK-1). Runs in the backup worker. Tables are read
// by name, so the same code backs up the open journal or an older one opened in Dexie's dynamic
// mode before a migration (TDD 7.4).
import type Dexie from 'dexie';
import { Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import {
  assetExt, FORMAT, FORMAT_VERSION, MANIFEST, PORTABLE_PREFS, README, README_TEXT, recordPath, sha256, toBase64,
  type FileEntry, type Manifest, type RecordFile,
} from './format.ts';

export interface BuildOpts {
  appVersion: string;
  schemaVersion: number;
  /** localStorage, as read on the main thread (workers have none). Only portable keys are kept. */
  prefs: Record<string, string>;
  now?: number;
  onProgress?: (done: number, total: number) => void;
}

const TABLES = ['journals', 'entries', 'pages', 'ops', 'blocks', 'assets', 'revisions'] as const;
type Row = Record<string, unknown>;

/** What each table's rows look like in the file: binary as base64, thumbnails and blobs left out. */
function portable(table: (typeof TABLES)[number], row: Row): Row {
  if (table === 'pages') {
    const { thumb: _t, thumbOps: _o, ...rest } = row; // redrawn after a restore (D-050)
    return rest;
  }
  if (table === 'ops' && row.pts instanceof Uint8Array) return { ...row, pts: toBase64(row.pts) };
  if (table === 'assets') {
    const { blob: _b, ...rest } = row; // the bytes are their own file, assets/<sha256>.<ext>
    return rest;
  }
  return row;
}

/** Every row, read in key order a page at a time: getAll is far faster than a cursor per row. */
async function eachPaged(d: Dexie, table: string, fn: (row: Row) => void, size = 5000) {
  let after: string | undefined;
  for (;;) {
    const t = d.table(table);
    const rows: Row[] = await (after === undefined ? t.orderBy(':id') : t.where(':id').above(after)).limit(size).toArray();
    rows.forEach(fn);
    if (rows.length < size) return;
    after = rows.at(-1)!.id as string;
  }
}

const enc = new TextEncoder();
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
}

/**
 * The backup as zip chunks, ready for `new Blob(chunks)`.
 * ponytail: each file is held in memory once to hash it (crypto.subtle has no streaming digest),
 * so peak memory is about twice the largest file, ops.ndjson. Incremental backups (BAK-5) are the
 * upgrade path for very large journals (TDD 8.2).
 */
export async function buildBackup(d: Dexie, opts: BuildOpts): Promise<{ chunks: Uint8Array[]; manifest: Manifest }> {
  const chunks: Uint8Array[] = [];
  let zipError: Error | null = null;
  const zip = new Zip((err, data) => (err ? (zipError = err) : chunks.push(data)));
  const files: FileEntry[] = [];
  const add = async (path: string, bytes: Uint8Array, stored = false) => {
    files.push({ path, bytes: bytes.length, sha256: await sha256(bytes) });
    const file = stored ? new ZipPassThrough(path) : new ZipDeflate(path, { level: 6 });
    zip.add(file);
    file.push(bytes, true);
  };

  const totals = await Promise.all(TABLES.map((t) => d.table(t).count()));
  const total = totals.reduce((a, b) => a + b, 0);
  let done = 0;
  const counts = { journals: 0, entries: 0, pages: 0, ops: 0, blocks: 0, assets: 0 };
  let first: string | undefined;
  let last: string | undefined;

  for (const table of TABLES) {
    const parts: Uint8Array[] = [];
    let lines: string[] = [];
    const assets: Row[] = [];
    await eachPaged(d, table, (row: Row) => {
      lines.push(JSON.stringify(portable(table, row)));
      if (lines.length === 1000) (parts.push(enc.encode(lines.join('\n') + '\n')), (lines = []));
      if (table === 'entries' && !row.deletedAt) {
        const day = row.entryDate as string;
        if (!first || day < first) first = day;
        if (!last || day > last) last = day;
      }
      if (table === 'assets') assets.push(row);
      if (table in counts) counts[table as keyof typeof counts]++;
      if (++done % 1000 === 0) opts.onProgress?.(done, total);
    });
    if (lines.length) parts.push(enc.encode(lines.join('\n') + '\n'));
    await add(recordPath(table as RecordFile), concat(parts));
    for (const a of assets) {
      const blob = a.blob as Blob | undefined;
      if (blob) await add(`assets/${a.hash}.${assetExt(String(a.mime))}`, new Uint8Array(await blob.arrayBuffer()), true);
    }
  }

  const kv = PORTABLE_PREFS.filter((k) => opts.prefs[k] !== undefined).map((key) => JSON.stringify({ key, value: opts.prefs[key] }));
  await add(recordPath('kv'), enc.encode(kv.length ? kv.join('\n') + '\n' : ''));
  await add(README, enc.encode(README_TEXT));

  const manifest: Manifest = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    appVersion: opts.appVersion,
    schemaVersion: opts.schemaVersion,
    createdAt: opts.now ?? Date.now(),
    encrypted: false,
    counts,
    dateRange: first && last ? [first, last] : null,
    files: [...files],
  };
  // The manifest lists every other file; it can't list itself.
  const m = new ZipDeflate(MANIFEST, { level: 6 });
  zip.add(m);
  m.push(enc.encode(JSON.stringify(manifest, null, 2)), true);
  zip.end();
  if (zipError) throw zipError;
  opts.onProgress?.(total, total);
  return { chunks, manifest };
}
