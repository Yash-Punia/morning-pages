import { beforeEach, describe, expect, test } from 'vitest';
import { strToU8, unzipSync, zipSync, strFromU8 } from 'fflate';
import { buildBackup } from '../../src/backup/write.ts';
import { readBackup, BackupProblem } from '../../src/backup/read.ts';
import { applyRestore, RESTORE_MARK, THUMBS_PENDING } from '../../src/backup/restore.ts';
import { MANIFEST, sha256, toBase64, type Manifest } from '../../src/backup/format.ts';
import { encode } from '../../src/store/codec.ts';
import { db, DEFAULT_JOURNAL, useDatabase, type JournalDB, type OpRec, type WriteCtx } from '../../src/store/db.ts';
import { commitOp, commitTitle, crc32, deleteEntry, readEntry, restoreEntry } from '../../src/store/entries.ts';
import type { Pt } from '../../src/ink/types.ts';

let n = 0;
const fresh = () => {
  useDatabase(`test-backup-restore-${n++}`);
  return db();
};
beforeEach(fresh);

const ctx = (id: string, date: string, page = `${id}-p0`, index = 0): Required<WriteCtx> => ({
  entry: { id, journalId: DEFAULT_JOURNAL, entryDate: date, createdAt: 1 },
  page: { id: page, index, paper: 'lined-college', height: 1414 },
});
const pts = (y: number): Pt[] => Array.from({ length: 20 }, (_, i) => [100 + i * 5, y + Math.sin(i), 0.5, 1, 0.3, i * 4]);
const stroke = (id: string, pageId: string, seq: number, createdAt = seq): OpRec => ({
  id, pageId, seq, createdAt, kind: 'stroke', tool: 'fountain', color: 'blueBlack', size: 5, pts: encode(pts(seq * 10)), n: 20, bbox: [0, 0, 1, 1],
});
const opts = { appVersion: '0.1.0', schemaVersion: 1, prefs: { 'mp.theme': 'night' } };

async function fileOf(d: JournalDB) {
  const { chunks } = await buildBackup(d, opts);
  return new Uint8Array(await new Blob(chunks as Uint8Array<ArrayBuffer>[]).arrayBuffer());
}
const dump = async (d: JournalDB) => ({
  journals: await d.journals.orderBy('id').toArray(),
  entries: await d.entries.orderBy('id').toArray(),
  pages: (await d.pages.orderBy('id').toArray()).map(({ thumb: _t, thumbOps: _o, ...p }) => p),
  ops: await d.ops.orderBy('id').toArray(),
});

/** A zip with a manifest that checks out, around whatever record files a test gives it. */
async function forge(records: Record<string, string>, over: Partial<Manifest> = {}) {
  const files: Record<string, Uint8Array> = {};
  const list = [];
  for (const [path, text] of Object.entries(records)) {
    files[path] = strToU8(text);
    list.push({ path, bytes: files[path]!.length, sha256: await sha256(files[path]!) });
  }
  const manifest = { format: 'morningpages-backup', formatVersion: 1, appVersion: '0.1.0', schemaVersion: 1, createdAt: 5, encrypted: false, counts: {}, dateRange: null, files: list, ...over };
  files[MANIFEST] = strToU8(JSON.stringify(manifest));
  return zipSync(files);
}
const minimal = (ops: object[]) => ({
  'records/journals.ndjson': '',
  'records/entries.ndjson': JSON.stringify({ id: 'e', journalId: 'default', entryDate: '2026-11-15', createdAt: 1, updatedAt: 1 }) + '\n',
  'records/pages.ndjson': JSON.stringify({ id: 'p', entryId: 'e', index: 0, paper: 'grid', size: 'A5', height: 1414, opCount: 1, checksum: 0, updatedAt: 1 }) + '\n',
  'records/ops.ndjson': ops.map((o) => JSON.stringify(o)).join('\n') + '\n',
});
const goodOp = { id: 'o', pageId: 'p', seq: 1, createdAt: 1, kind: 'stroke', tool: 'ballpoint', color: 'black', size: 2.8, pts: toBase64(encode(pts(0))), n: 20, bbox: [0, 0, 1, 1] };

describe('backup → wipe → restore (TDD 8.3, 12.3)', () => {
  test('a replace into an empty journal gives back exactly the same records and checksums', async () => {
    const src = db();
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s2', 'a-p0', 2));
    await commitOp(src, ctx('a', '2026-11-10', 'a-p1', 1), stroke('s3', 'a-p1', 1));
    await commitTitle(src, ctx('a', '2026-11-10'), 'Rain on the roof');
    await commitOp(src, ctx('b', '2026-11-12'), { id: 'x1', pageId: 'b-p0', seq: 1, createdAt: 9, kind: 'stroke', tool: 'ballpoint', color: '#336699', size: 2.8, pts: encode(pts(5)), n: 20, bbox: [1, 2, 3, 4] });
    await commitOp(src, ctx('b', '2026-11-12'), { id: 'x2', pageId: 'b-p0', seq: 2, createdAt: 10, kind: 'erase', targets: ['x1'] });
    await deleteEntry(src, 'b', 77);
    const before = await dump(src);
    const file = await fileOf(src);

    const { records, preview } = await readBackup(file);
    expect(preview).toMatchObject({ mornings: 1, pages: 2, dateRange: ['2026-11-10', '2026-11-10'], appVersion: '0.1.0' });
    expect(records.prefs).toEqual([{ key: 'mp.theme', value: 'night' }]);

    const dst = fresh();
    const progress: number[] = [];
    await applyRestore(dst, records, 'replace', (d, t) => progress.push(d / t));
    expect(await dump(dst)).toEqual(before);
    expect(progress.at(-1)).toBe(1);
    expect(await dst.kv.get(RESTORE_MARK)).toBeUndefined();
    expect((await dst.kv.get(THUMBS_PENDING))?.value).toBe(true);
  });

  test('replace removes what this iPad had; merge keeps it', async () => {
    const src = db();
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    const { records } = await readBackup(await fileOf(src));
    const dst = fresh();
    await commitOp(dst, ctx('local', '2026-11-14'), stroke('l1', 'local-p0', 1));
    await applyRestore(dst, records, 'merge');
    expect((await dst.entries.toArray()).map((e) => e.id).sort()).toEqual(['a', 'local']);
    await applyRestore(dst, records, 'replace');
    expect((await dst.entries.toArray()).map((e) => e.id)).toEqual(['a']);
  });

  test('merge: newest updatedAt wins, a tie keeps this iPad, ops are a union, checksums follow fold order', async () => {
    const src = db();
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1, 100));
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s2', 'a-p0', 2, 200)); // only in the backup
    await commitOp(src, ctx('t', '2026-11-11'), stroke('t1', 't-p0', 1));
    await commitOp(src, ctx('d', '2026-11-12'), stroke('d1', 'd-p0', 1));
    await src.entries.update('a', { title: 'old title', updatedAt: 1000 });
    await src.entries.update('t', { title: 'backup tie', updatedAt: 500 });
    await deleteEntry(src, 'd', 3000); // deleted later in the backup
    const { records } = await readBackup(await fileOf(src));

    const dst = fresh();
    await commitOp(dst, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1, 100));
    await commitOp(dst, ctx('a', '2026-11-10'), stroke('s3', 'a-p0', 2, 150)); // same seq, written here
    await dst.entries.update('a', { title: 'new title', updatedAt: 2000 });
    await commitOp(dst, ctx('t', '2026-11-11'), stroke('t1', 't-p0', 1));
    await dst.entries.update('t', { title: 'local tie', updatedAt: 500 });
    await commitOp(dst, ctx('d', '2026-11-12'), stroke('d1', 'd-p0', 1));
    await dst.entries.update('d', { updatedAt: 2500 });

    await applyRestore(dst, records, 'merge');
    expect((await dst.entries.get('a'))?.title).toBe('new title');
    expect((await dst.entries.get('t'))?.title).toBe('local tie');
    expect((await dst.entries.get('d'))?.deletedAt).toBe(3000);

    const a = await readEntry(dst, 'a');
    expect(a!.ops.map((o) => o.id).sort()).toEqual(['s1', 's2', 's3']);
    // Both copies hold seq 2: fold order breaks the tie by createdAt (s3 at 150 before s2 at 200).
    expect(a!.pages[0]).toMatchObject({ opCount: 3, checksum: crc32('s2', crc32('s3', crc32('s1'))) });
  });

  test('a restored-then-undeleted entry here outlives an older deletion in the backup', async () => {
    const src = db();
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    await deleteEntry(src, 'a', 1000);
    const { records } = await readBackup(await fileOf(src));
    const dst = fresh();
    await commitOp(dst, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    await deleteEntry(dst, 'a', 1000);
    await restoreEntry(dst, 'a', 2000);
    await applyRestore(dst, records, 'merge');
    expect((await dst.entries.get('a'))?.deletedAt).toBeUndefined();
  });

  test('a page whose slot is held here by another page goes after this iPad pages', async () => {
    const src = db();
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    await commitOp(src, ctx('a', '2026-11-10', 'backup-p1', 1), stroke('s2', 'backup-p1', 1));
    const { records } = await readBackup(await fileOf(src));
    const dst = fresh();
    await commitOp(dst, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    await commitOp(dst, ctx('a', '2026-11-10', 'local-p1', 1), stroke('s9', 'local-p1', 1));
    await applyRestore(dst, records, 'merge');
    const pages = await dst.pages.where('entryId').equals('a').sortBy('index');
    expect(pages.map((p) => [p.id, p.index])).toEqual([['a-p0', 0], ['local-p1', 1], ['backup-p1', 2]]);
  });

  test('a merge killed before its recount is put right by restoring the same file again', async () => {
    const src = db();
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1, 100));
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s2', 'a-p0', 2, 200));
    const { records } = await readBackup(await fileOf(src));
    const dst = fresh();
    await commitOp(dst, ctx('a', '2026-11-10'), stroke('s3', 'a-p0', 1, 150));
    // The first run got its ops in, then died: no recount, the marker still set.
    await dst.ops.bulkAdd(records.ops);
    await dst.kv.put({ key: RESTORE_MARK, value: 1 });
    await applyRestore(dst, records, 'merge');
    const page = (await dst.pages.get('a-p0'))!;
    expect(page.opCount).toBe(3);
    // Fold order: seq 1 (s1 at 100, s3 at 150), then s2.
    expect(page.checksum).toBe(crc32('s2', crc32('s3', crc32('s1'))));
    expect(await dst.kv.get(RESTORE_MARK)).toBeUndefined();
  });

  test('restoring the same file twice changes nothing (resumable)', async () => {
    const src = db();
    await commitOp(src, ctx('a', '2026-11-10'), stroke('s1', 'a-p0', 1));
    const { records } = await readBackup(await fileOf(src));
    const dst = fresh();
    await applyRestore(dst, records, 'merge');
    const once = await dump(dst);
    await applyRestore(dst, records, 'merge');
    expect(await dump(dst)).toEqual(once);
  });
});

describe('reading a backup checks everything first (TDD 9, BAK-4)', () => {
  const problem = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e instanceof BackupProblem ? e.problem : String(e)));

  test('not a zip, or not ours', async () => {
    expect(await problem(readBackup(strToU8('hello')))).toBe('not-backup');
    expect(await problem(readBackup(zipSync({ 'a.txt': strToU8('x') })))).toBe('not-backup');
    expect(await problem(readBackup(await forge(minimal([goodOp]), { format: 'other' as never })))).toBe('not-backup');
  });

  test('made by a newer version, or encrypted', async () => {
    expect(await problem(readBackup(await forge(minimal([goodOp]), { formatVersion: 2 })))).toBe('newer');
    expect(await problem(readBackup(await forge(minimal([goodOp]), { schemaVersion: 2 })))).toBe('newer');
    expect(await problem(readBackup(await forge(minimal([goodOp]), { encrypted: true })))).toBe('encrypted');
  });

  test('a file that does not match its checksum is damaged', async () => {
    const zip = unzipSync(await forge(minimal([goodOp])));
    zip['records/ops.ndjson'] = strToU8(strFromU8(zip['records/ops.ndjson']!).replace('"seq":1', '"seq":2'));
    expect(await problem(readBackup(zipSync(zip)))).toBe('damaged');
  });

  test('records are rebuilt from known fields; a malformed one rejects the file', async () => {
    const { records } = await readBackup(await forge(minimal([{ ...goodOp, extra: '<img onerror=x>' }])));
    expect(records.ops[0]).not.toHaveProperty('extra');
    expect(await problem(readBackup(await forge(minimal([{ ...goodOp, pts: toBase64(new Uint8Array(5)) }]))))).toBe('damaged'); // truncated points
    expect(await problem(readBackup(await forge(minimal([{ ...goodOp, tool: 'flamethrower' }]))))).toBe('damaged');
    expect(await problem(readBackup(await forge(minimal([{ ...goodOp, color: 'url(evil)' }]))))).toBe('damaged');
    expect(await problem(readBackup(await forge({ ...minimal([goodOp]), 'records/kv.ndjson': '{"key":"mp.onboarded","value":"1"}\n' })))).toBe('damaged');
    expect(await problem(readBackup(await forge({ ...minimal([goodOp]), 'records/entries.ndjson': 'not json\n' })))).toBe('damaged');
  });
});
