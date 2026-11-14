// The serial write queue (TDD 6.1, 6.2), from the S2 spike that lost nothing in 10,021 strokes
// across 200 interruptions on the iPad. One job = one IndexedDB transaction, run strictly in order.
// Nothing leaves the queue until its transaction has completed, so a stroke shows as saved only
// after IndexedDB says so (DUR-1), and nothing is ever dropped on an error.
import { writable } from 'svelte/store';
import { track } from '../analytics/track.ts';
import { reopen } from './db.ts';

/** saved: everything is on disk · saving: writes in flight · held: writes keep failing ·
 *  full: the device is out of space. In the last two, ink is kept in memory and retried. */
export type SaveState = 'saved' | 'saving' | 'held' | 'full';
export type ErrorKind = 'connection' | 'quota' | 'unknown';

export interface Job {
  /** Jobs with the same key coalesce: a newer one replaces one that hasn't started. */
  key?: string;
  run: () => Promise<unknown>;
  /** What the job writes, for the emergency export when writes are held (TDD 6.2). */
  data?: unknown;
}

const BACKOFF = [50, 200, 1000];
const HOLD_RETRY_MS = 5000;

export function classify(e: unknown): ErrorKind {
  const err = e as { name?: string; inner?: { name?: string } };
  const names = [err?.name, err?.inner?.name];
  if (names.includes('QuotaExceededError')) return 'quota';
  if (names.some((n) => n && /Closed|Unknown|InvalidState|Abort|DatabaseClosed|Open/.test(n))) return 'connection';
  return 'unknown';
}

export class WriteQueue {
  readonly state = writable<SaveState>('saved');
  private items: (Job & { done: () => void })[] = [];
  private draining = false;
  private idlers: (() => void)[] = [];

  constructor(
    private opts: {
      /** Close and reopen the database (WebKit "connection lost" after backgrounding). */
      reopen?: () => void;
      /** Once per failure series: recovered by a retry, or held (not saved after the retries). */
      onError?: (kind: ErrorKind, recovered: boolean) => void;
      sleep?: (ms: number) => Promise<void>;
    } = {},
  ) {}

  /** Queue a write; resolves once its transaction has completed. */
  push(job: Job): Promise<void> {
    return new Promise((done) => {
      // queue[0] may be in flight: only later items can be replaced.
      const i = job.key ? this.items.findIndex((q, idx) => idx > 0 && q.key === job.key) : -1;
      if (i > 0) {
        const old = this.items[i]!;
        this.items[i] = { ...job, done: () => { old.done(); done(); } };
      } else this.items.push({ ...job, done });
      this.drain();
    });
  }

  /** Forget queued (not started) jobs with this key: a committed stroke's recovery writes. */
  drop(key: string) {
    for (let i = this.items.length - 1; i > 0; i--) if (this.items[i]!.key === key) this.items.splice(i, 1)[0]!.done();
  }

  /** Resolves when every queued write has completed. */
  idle(): Promise<void> {
    return this.items.length ? new Promise((r) => this.idlers.push(r)) : Promise.resolve();
  }

  /** The writes not yet on disk. */
  pending(): unknown[] {
    return this.items.map((j) => j.data).filter((d) => d !== undefined);
  }

  get size() {
    return this.items.length;
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;
    this.state.set('saving');
    while (this.items.length) {
      const job = this.items[0]!;
      await this.attempt(job);
      this.items.shift();
      job.done();
    }
    this.draining = false;
    this.state.set('saved');
    for (const r of this.idlers.splice(0)) r();
  }

  /** Retry with reopen and backoff, then hold in memory and keep trying: never drop (TDD 6.2). */
  private async attempt(job: Job) {
    const sleep = this.opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
    let failed: ErrorKind | undefined;
    let held = false;
    for (let n = 0; ; n++) {
      try {
        await job.run();
        if (failed && !held) this.opts.onError?.(failed, true); // fixed by a retry
        if (held) this.state.set('saving');
        return;
      } catch (e) {
        failed = classify(e);
        if (n >= BACKOFF.length && !held) {
          held = true;
          this.state.set(failed === 'quota' ? 'full' : 'held');
          this.opts.onError?.(failed, false);
        }
        await sleep(BACKOFF[n] ?? HOLD_RETRY_MS);
        this.opts.reopen?.();
      }
    }
  }
}

/** The app's one queue (one per tab, TDD 6.1). Errors are counted anonymously (TDD 9.4). */
export const writes = new WriteQueue({ reopen, onError: (kind, recovered) => track('save_error', { kind, recovered }) });
