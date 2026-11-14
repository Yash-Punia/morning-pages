// Migrations (TDD 7.4, DUR-6). Before the journal is opened with the code's schema, the stored
// version is read in Dexie's dynamic mode (no schema declared). If it is older, `beforeMigrate`
// gets that connection, which still reads the old shape, to back the journal up first. Then the
// real open runs Dexie's upgrade() steps, which must be idempotent and are tested against
// fixtures of every earlier version (tests/fixtures/db-v{n}.json).
import Dexie from 'dexie';

export type BeforeMigrate = (old: Dexie, storedVersion: number) => Promise<void>;

/** Returns the stored version, or null for a new install. */
export async function prepareOpen(name: string, codeVersion: number, beforeMigrate: BeforeMigrate): Promise<number | null> {
  if (!(await Dexie.exists(name))) return null;
  const old = new Dexie(name);
  await old.open();
  const stored = old.verno;
  try {
    if (stored < codeVersion) await beforeMigrate(old, stored);
  } finally {
    old.close();
  }
  return stored;
}

// ponytail: no v2 exists yet, so nothing to back up. M5 wires its backup here ("Updating your
// journal" screen, TDD 7.4) before the first schema change ships.
export const noBackupYet: BeforeMigrate = async () => {};
