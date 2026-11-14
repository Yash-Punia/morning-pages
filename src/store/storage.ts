// Storage protection (TDD 6.5, STO-3, STO-4). Safari may clear a site's data under storage
// pressure unless it is persisted, so every launch asks until iPadOS grants it. Usage is checked
// at launch, with a warning from 80 % of the quota the journal may use.
import { writable } from 'svelte/store';

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
