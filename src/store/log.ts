// The local log (TDD 14, D-060): the last 500 errors, save retries, crash recoveries and launch
// timings, kept on this device only. Never sent, never backed up; /diagnostics shows it and can
// save it as a text file for a bug report. Lines hold kinds, names and numbers, never journal
// content (no titles, ids or ink).
//
// It is written to kv best-effort and outside the write queue: when IndexedDB is failing, the
// log would fail too, and it must never hold up a stroke (the 4.7 thumbnail stall).

export type LogKind = 'launch' | 'save' | 'recovery' | 'storage' | 'backup' | 'restore' | 'error';
export interface LogLine { at: number; kind: LogKind; detail: string }
/** The slice of Dexie's kv table the log needs. */
export interface LogStore {
  get(key: string): PromiseLike<{ value: unknown } | undefined>;
  put(row: { key: string; value: unknown }): PromiseLike<unknown>;
}

const MAX = 500;
const KEY = 'log';
const lines: LogLine[] = [];
let kv: LogStore | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

export function log(kind: LogKind, detail = '') {
  lines.push({ at: Date.now(), kind, detail: detail.slice(0, 200) });
  trim();
  schedule();
}

/** Once the journal is open: bring back earlier launches' lines, and keep the log from now on. */
export async function attachLog(store: LogStore) {
  try {
    const row = await store.get(KEY);
    if (Array.isArray(row?.value)) lines.unshift(...(row.value as LogLine[]));
    trim();
  } catch { /* unreadable: start from this launch */ }
  kv = store;
  if (lines.length) schedule();
}

export const logLines = (): readonly LogLine[] => lines;

/** The log as plain text, oldest first. */
export const logText = () =>
  lines.map((l) => `${new Date(l.at).toISOString()} ${l.kind.padEnd(8)} ${l.detail}`).join('\n') + '\n';

/** Write now instead of in 2 s (tests, and before saving the log). */
export async function flushLog() {
  clearTimeout(timer);
  timer = undefined;
  try { await kv?.put({ key: KEY, value: lines.slice() }); } catch { /* kept in memory */ }
}

/** Tests: start empty and detached. */
export function resetLog() {
  lines.length = 0;
  kv = undefined;
  clearTimeout(timer);
  timer = undefined;
}

function schedule() {
  if (kv && !timer) timer = setTimeout(flushLog, 2000);
}
function trim() {
  if (lines.length > MAX) lines.splice(0, lines.length - MAX);
}
