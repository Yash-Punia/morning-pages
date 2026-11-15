import { afterEach, describe, expect, test, vi } from 'vitest';
import { attachLog, flushLog, log, logLines, logText, resetLog, type LogStore } from '../../src/store/log.ts';
import { inkMetrics, pct } from '../../src/ink/metrics.ts';
import { WriteQueue } from '../../src/store/queue.ts';

const memory = () => {
  const rows = new Map<string, unknown>();
  const store: LogStore = { get: async (k) => (rows.has(k) ? { value: rows.get(k) } : undefined), put: async (r) => rows.set(r.key, r.value) };
  return { rows, store };
};

describe('local log (TDD 14, D-059)', () => {
  afterEach(resetLog);

  test('keeps the last 500 lines, clipped', () => {
    for (let i = 0; i < 520; i++) log('save', `line ${i}`);
    log('error', 'x'.repeat(500));
    expect(logLines()).toHaveLength(500);
    expect(logLines()[0]!.detail).toBe('line 21');
    expect(logLines().at(-1)!.detail).toHaveLength(200);
    expect(logText().trim().split('\n')).toHaveLength(500);
  });

  test('earlier launches come back first, and lines logged before the journal opened are kept', async () => {
    const { rows, store } = memory();
    rows.set('log', [{ at: 1, kind: 'launch', detail: 'last time' }]);
    log('error', 'before open');
    await attachLog(store);
    log('save', 'after open');
    await flushLog();
    expect((rows.get('log') as { detail: string }[]).map((l) => l.detail)).toEqual(['last time', 'before open', 'after open']);
  });

  test('a failing store never throws and keeps the lines in memory', async () => {
    const store: LogStore = { get: () => Promise.reject(new Error('lost')), put: () => Promise.reject(new Error('lost')) };
    await attachLog(store);
    log('save', 'still here');
    await expect(flushLog()).resolves.toBeUndefined();
    expect(logLines().map((l) => l.detail)).toEqual(['still here']);
  });
});

describe('writing metrics (TDD 5.7)', () => {
  test('dropped frames count the whole session, against the refresh rate', () => {
    inkMetrics.penDown(0);
    let t = 1000;
    inkMetrics.drawn(t);
    for (let i = 0; i < 99; i++) inkMetrics.drawn((t += 8.3)); // 120 Hz
    inkMetrics.drawn((t += 30)); // one long frame
    inkMetrics.penUp(11, 100); // 10 intervals over 100 ms
    const s = inkMetrics.summary();
    expect(s.frames).toBe(100);
    expect(s.droppedPct).toBeCloseTo(1);
    expect(s.buckets).toEqual([99, 0, 1, 0]);
    expect(Math.round(s.hz)).toBe(120);
    expect(s.sampleHz).toBe(100);
  });

  test('an entry open is timed to its first painted page; the first one marks the launch', async () => {
    inkMetrics.opening(100);
    inkMetrics.opened(30, 700);
    expect(inkMetrics.lastOpen()).toEqual({ ms: 600, pages: 30 });
    await expect(inkMetrics.launch).resolves.toBe(700);
  });

  test('pct is nearest-rank', () => {
    expect(pct([], 0.5)).toBe(0);
    expect(pct([5, 1, 3], 0.5)).toBe(3);
    expect(pct(Array.from({ length: 100 }, (_, i) => i + 1), 0.99)).toBe(100);
  });
});

describe('save latency (TDD 5.7)', () => {
  test('times unkeyed writes from push to complete, never keyed mirrors', async () => {
    vi.useFakeTimers();
    try {
      const q = new WriteQueue();
      const slow = () => new Promise((r) => setTimeout(r, 40));
      q.push({ key: 'rec:a', run: slow });
      q.push({ run: slow, data: 'stroke' });
      await vi.advanceTimersByTimeAsync(100);
      await q.idle();
      expect(q.latencies).toHaveLength(1);
      expect(q.latencies[0]).toBeGreaterThanOrEqual(80); // waited behind the mirror, then ran
    } finally {
      vi.useRealTimers();
    }
  });
});
