import { beforeEach, describe, expect, test } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildBackup } from '../../src/backup/write.ts';
import { fromBase64, MANIFEST, sha256, type Manifest } from '../../src/backup/format.ts';
import { encode } from '../../src/store/codec.ts';
import { db, DEFAULT_JOURNAL, useDatabase, type OpRec, type WriteCtx } from '../../src/store/db.ts';
import { commitOp, deleteEntry } from '../../src/store/entries.ts';
import type { Pt } from '../../src/ink/types.ts';

let n = 0;
beforeEach(() => useDatabase(`test-backup-write-${n++}`));

const ctx = (id: string, date: string): Required<WriteCtx> => ({
  entry: { id, journalId: DEFAULT_JOURNAL, entryDate: date, createdAt: 1 },
  page: { id: `${id}-p0`, index: 0, paper: 'lined-college', height: 1414 },
});
const line = (y: number): Pt[] => Array.from({ length: 30 }, (_, i) => [100 + i * 4, y + Math.sin(i), 0.5, 1, 0.3, i * 4]);
const stroke = (id: string, pageId: string, seq: number): OpRec => {
  const pts = line(seq * 10);
  return { id, pageId, seq, createdAt: seq, kind: 'stroke', tool: 'ballpoint', color: 'black', size: 2.8, pts: encode(pts), n: pts.length, bbox: [0, 0, 1, 1] };
};
const opts = { appVersion: '0.1.0', schemaVersion: 1, now: 1234, prefs: { 'mp.theme': 'night', 'mp.scroll': '{"x":1}', 'mp.once.install': '1' } };

const ndjson = (bytes: Uint8Array) => strFromU8(bytes).split('\n').filter(Boolean).map((l) => JSON.parse(l));

describe('the .morningpages writer (TDD 8.1)', () => {
  test('holds every record, verifiable by the manifest, with only portable preferences', async () => {
    await commitOp(db(), ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    await commitOp(db(), ctx('a', '2026-11-10'), stroke('s2', 'a-p0', 2));
    await commitOp(db(), ctx('b', '2026-11-12'), stroke('s3', 'b-p0', 1));
    await commitOp(db(), ctx('gone', '2026-11-20'), stroke('s4', 'gone-p0', 1));
    await deleteEntry(db(), 'gone', 50);
    await db().pages.update('a-p0', { thumb: new ArrayBuffer(8), thumbOps: 2 });

    const progress: number[] = [];
    const { chunks, manifest } = await buildBackup(db(), { ...opts, onProgress: (d, t) => progress.push(d / t) });
    const files = unzipSync(new Uint8Array(await new Blob(chunks as Uint8Array<ArrayBuffer>[]).arrayBuffer()));

    const written = JSON.parse(strFromU8(files[MANIFEST]!)) as Manifest;
    expect(written).toEqual(manifest);
    expect(manifest).toMatchObject({ format: 'morningpages-backup', formatVersion: 1, schemaVersion: 1, createdAt: 1234, encrypted: false });
    expect(manifest.counts).toEqual({ journals: 1, entries: 3, pages: 3, ops: 4, blocks: 0, assets: 0 });
    expect(manifest.dateRange).toEqual(['2026-11-10', '2026-11-12']); // deleted mornings don't widen it
    for (const f of manifest.files) {
      expect(files[f.path], f.path).toBeDefined();
      expect(files[f.path]!.length).toBe(f.bytes);
      expect(await sha256(files[f.path]!)).toBe(f.sha256);
    }
    expect(Object.keys(files).sort()).toEqual([...manifest.files.map((f) => f.path), MANIFEST].sort());

    const pages = ndjson(files['records/pages.ndjson']!);
    expect(pages.every((p) => !('thumb' in p) && !('thumbOps' in p))).toBe(true);
    const ops = ndjson(files['records/ops.ndjson']!);
    const s1 = ops.find((o) => o.id === 's1');
    expect(fromBase64(s1.pts)).toEqual((await db().ops.get('s1'))!.pts);
    expect(ndjson(files['records/entries.ndjson']!).find((e) => e.id === 'gone').deletedAt).toBe(50);
    expect(ndjson(files['records/kv.ndjson']!)).toEqual([{ key: 'mp.theme', value: 'night' }]);
    expect(strFromU8(files['README.txt']!)).toContain('backup-format.md');
    expect(progress.at(-1)).toBe(1);
  });

  test('an empty journal still makes a complete, valid file', async () => {
    const { manifest } = await buildBackup(db(), opts);
    expect(manifest.counts.entries).toBe(0);
    expect(manifest.dateRange).toBeNull();
    expect(manifest.files.map((f) => f.path)).toContain('records/ops.ndjson');
  });
});
