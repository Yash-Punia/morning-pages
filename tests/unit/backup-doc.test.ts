import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildBackup } from '../../src/backup/write.ts';
import { PORTABLE_PREFS } from '../../src/backup/format.ts';
import { db, useDatabase } from '../../src/store/db.ts';
import { commitOp } from '../../src/store/entries.ts';
import { encode } from '../../src/store/codec.ts';

// 5.5: the open schema must match the writer. Every file, manifest field, record field and
// preference the writer can emit is named in docs/backup-format.md.
const doc = readFileSync(new URL('../../docs/backup-format.md', import.meta.url), 'utf8');
const named = (name: string) => doc.includes(`\`${name}\``);

test('docs/backup-format.md names every file, manifest field, record field and preference', async () => {
  useDatabase('test-backup-doc');
  await commitOp(
    db(),
    { entry: { id: 'e', journalId: 'default', entryDate: '2026-11-15', createdAt: 1 }, page: { id: 'p', index: 0, paper: 'grid', height: 1414 } },
    { id: 's', pageId: 'p', seq: 1, createdAt: 1, kind: 'stroke', tool: 'ballpoint', color: 'black', size: 2.8, pts: encode([[1, 2, 0.5, 1, 0, 0], [3, 4, 0.5, 1, 0, 4]]), n: 2, bbox: [0, 0, 5, 5] },
  );
  await commitOp(db(), { entry: { id: 'e', journalId: 'default', entryDate: '2026-11-15', createdAt: 1 }, page: { id: 'p', index: 0, paper: 'grid', height: 1414 } }, { id: 'x', pageId: 'p', seq: 2, createdAt: 2, kind: 'erase', targets: ['s'] });
  await db().entries.update('e', { title: 't', deletedAt: 5 });
  const { manifest } = await buildBackup(db(), { appVersion: '0', schemaVersion: 1, prefs: {} });

  for (const key of Object.keys(manifest)) expect(named(key), `manifest.${key}`).toBe(true);
  for (const key of Object.keys(manifest.counts)) expect(doc, `counts.${key}`).toContain(`"${key}"`);
  for (const key of Object.keys(manifest.files[0]!)) expect(named(key), `files[].${key}`).toBe(true);
  for (const f of manifest.files) expect(named(f.path), f.path).toBe(true);
  expect(named('manifest.json')).toBe(true);

  for (const table of ['journals', 'entries', 'pages', 'ops'] as const)
    for (const row of await db().table(table).toArray())
      for (const key of Object.keys(row).filter((k) => k !== 'thumb' && k !== 'thumbOps')) expect(named(key), `${table}.${key}`).toBe(true);
  for (const key of PORTABLE_PREFS) expect(named(key), key).toBe(true);
});
