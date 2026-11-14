import { get } from 'svelte/store';
import { describe, expect, test } from 'vitest';
import { classify, WriteQueue } from '../../src/store/queue.ts';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};
const tick = () => new Promise((r) => setTimeout(r, 0));
const fail = (name: string) => Object.assign(new Error(name), { name });

describe('write queue (TDD 6.1, 6.2)', () => {
  test('saved only after the transaction completes (DUR-1)', async () => {
    const q = new WriteQueue();
    const tx = deferred();
    let acked = false;
    q.push({ run: () => tx.promise }).then(() => (acked = true));
    await tick();
    expect(get(q.state)).toBe('saving');
    expect(acked).toBe(false);
    tx.resolve();
    await q.idle();
    expect(acked).toBe(true);
    expect(get(q.state)).toBe('saved');
  });

  test('writes run one at a time, in order', async () => {
    const q = new WriteQueue();
    const log: string[] = [];
    const slow = deferred();
    q.push({ run: async () => { log.push('a start'); await slow.promise; log.push('a end'); } });
    q.push({ run: async () => { log.push('b'); } });
    await tick();
    expect(log).toEqual(['a start']);
    slow.resolve();
    await q.idle();
    expect(log).toEqual(['a start', 'a end', 'b']);
  });

  test('a lost connection reopens and retries; nothing is dropped', async () => {
    const reopened: number[] = [];
    const errors: [string, boolean][] = [];
    const q = new WriteQueue({ reopen: () => reopened.push(1), sleep: async () => {}, onError: (k, r) => errors.push([k, r]) });
    let calls = 0;
    await q.push({ run: async () => { if (++calls < 3) throw fail('DatabaseClosedError'); } });
    expect(calls).toBe(3);
    expect(reopened.length).toBe(2);
    expect(errors).toEqual([['connection', true]]);
  });

  test('a full disk holds writes in memory and keeps retrying, then recovers', async () => {
    const states: string[] = [];
    const errors: [string, boolean][] = [];
    const q = new WriteQueue({ sleep: async () => {}, onError: (k, r) => errors.push([k, r]) });
    q.state.subscribe((s) => states.push(s));
    let calls = 0;
    await q.push({ run: async () => { if (++calls < 7) throw fail('QuotaExceededError'); } });
    expect(states).toContain('full');
    expect(states.at(-1)).toBe('saved');
    expect(errors).toEqual([['quota', false]]); // one event per failure series
  });

  test('queued jobs with the same key coalesce; dropped jobs never run', async () => {
    const q = new WriteQueue();
    const first = deferred();
    const ran: string[] = [];
    q.push({ run: () => first.promise });
    const a = q.push({ key: 'title', run: async () => ran.push('t1') });
    const b = q.push({ key: 'title', run: async () => ran.push('t2') });
    q.push({ key: 'rec:s1', run: async () => ran.push('recovery') });
    q.drop('rec:s1');
    first.resolve();
    await Promise.all([a, b]);
    await q.idle();
    expect(ran).toEqual(['t2']);
  });

  test('pending lists what is not on disk yet, for the emergency export', async () => {
    const q = new WriteQueue();
    const tx = deferred();
    q.push({ run: () => tx.promise, data: { op: 1 } });
    q.push({ run: async () => {}, data: { op: 2 } });
    expect(q.pending()).toEqual([{ op: 1 }, { op: 2 }]);
    tx.resolve();
    await q.idle();
    expect(q.pending()).toEqual([]);
  });

  test('errors are classified', () => {
    expect(classify(fail('QuotaExceededError'))).toBe('quota');
    expect(classify({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toBe('quota');
    expect(classify(fail('UnknownError'))).toBe('connection');
    expect(classify(fail('TypeError'))).toBe('unknown');
  });
});
