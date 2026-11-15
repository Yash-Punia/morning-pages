// Storage protection (TDD 6.5, STO-3, STO-4). Safari may clear a site's data under storage
// pressure unless it is persisted, so every launch asks until iPadOS grants it. Usage is checked
// at launch, with a warning from 80 % of the quota the journal may use.
import { writable } from 'svelte/store';
import { db } from './db.ts';

export interface StorageStatus {
  /** null: unknown (the browser can't say) */
  persisted: boolean | null;
  usage: number;
  quota: number;
  /** 0, or the highest threshold crossed */
  warn: 0 | 80 | 95;
}

export const storage = writable<StorageStatus>({ persisted: null, usage: 0, quota: 0, warn: 0 });

export const warnLevel = (usage: number, quota: number): StorageStatus['warn'] =>
  !quota ? 0 : usage / quota >= 0.95 ? 95 : usage / quota >= 0.8 ? 80 : 0;

/** Once per launch: ask for persistence until granted, and measure usage. */
export async function checkStorage(api: StorageManager | undefined = navigator.storage): Promise<StorageStatus> {
  let persisted: boolean | null = null;
  try {
    persisted = await api.persisted();
    if (!persisted) persisted = await api.persist();
  } catch { /* not supported here */ }
  let usage = 0, quota = 0;
  try {
    ({ usage = 0, quota = 0 } = await api.estimate());
  } catch { /* not supported here */ }
  const status = { persisted, usage, quota, warn: warnLevel(usage, quota) };
  storage.set(status);
  return status;
}

/** PRD 12.1: stored ink per handwritten page, averaged over the pages of the 10 most recently
 *  changed mornings (a bounded read, for /diagnostics). */
export async function inkPerPage(): Promise<{ pages: number; avgBytes: number }> {
  const entries = await db().entries.orderBy('updatedAt').reverse().limit(10).primaryKeys();
  const pages = await db().pages.where('entryId').anyOf(entries as string[]).primaryKeys();
  const bytes = new Map<string, number>();
  await db().ops.where('pageId').anyOf(pages as string[]).each((op) => {
    if (op.pts) bytes.set(op.pageId, (bytes.get(op.pageId) ?? 0) + op.pts.byteLength);
  });
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  return { pages: bytes.size, avgBytes: bytes.size ? total / bytes.size : 0 };
}
