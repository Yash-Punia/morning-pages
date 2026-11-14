import Dexie from 'dexie';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { fromRecord } from '../../src/store/codec.ts';
import { JournalDB, SCHEMA_V1, type OpRec } from '../../src/store/db.ts';
import { prepareOpen } from '../../src/store/migrate.ts';
import { fold } from '../../src/ink/page.ts';

const fixture = JSON.parse(fs.readFileSync('tests/fixtures/db-v1.json', 'utf8')) as { tables: Record<string, Record<string, unknown>[]> };

/** Load the v1 fixture into a database, the way v1 of the app stored it. */
async function seedV1(name: string) {
  const d = new JournalDB(name);
  for (const [table, rows] of Object.entries(fixture.tables)) {
    const decoded = rows.map((r) => (typeof r.pts === 'string' ? { ...r, pts: new Uint8Array(Buffer.from(r.pts, 'base64')) } : r));
    await d.table(table).bulkAdd(decoded);
  }
  d.close();
}

/** A pretend next version: indexes `starred` and fills it in for existing entries. */
class DummyV2 extends Dexie {
  constructor(name: string) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    this.version(2)
      .stores({ ...SCHEMA_V1, entries: `${SCHEMA_V1.entries}, starred` })
      .upgrade((tx) => tx.table('entries').toCollection().modify((e: { starred?: number }) => { e.starred ??= 0; }));
  }
}

describe('migration harness (TDD 7.4, DUR-6)', () => {
  test('a new install has nothing to migrate', async () => {
    let called = false;
    expect(await prepareOpen('mig-new', 2, async () => { called = true; })).toBeNull();
    expect(called).toBe(false);
  });

  test('the v1 fixture is backed up in its old shape, then upgrades to a dummy v2 intact', async () => {
    await seedV1('mig-v1');
    let backedUp: unknown[] = [];
    const stored = await prepareOpen('mig-v1', 2, async (old, v) => {
      expect(v).toBe(1);
      backedUp = await old.table('ops').toArray(); // the dynamic connection reads the v1 shape
    });
    expect(stored).toBe(1);
    expect(backedUp.length).toBe(3);

    const v2 = new DummyV2('mig-v1');
    await v2.open();
    expect(v2.verno).toBe(2);
    expect(await v2.table('entries').where('starred').equals(0).count()).toBe(1);
    const entry = await v2.table('entries').get('e1');
    expect(entry.title).toBe('Fixture morning');
    const ops = (await v2.table('ops').toArray()) as OpRec[];
    const visible = fold(ops.map(fromRecord));
    expect([...visible.keys()]).toEqual(['s1']); // s2 was erased
    expect(visible.get('s1')!.pts.length).toBe(6);
    v2.close();
  });

  test('a database already on the code version is left alone', async () => {
    await seedV1('mig-same');
    let called = false;
    expect(await prepareOpen('mig-same', 1, async () => { called = true; })).toBe(1);
    expect(called).toBe(false);
  });
});
