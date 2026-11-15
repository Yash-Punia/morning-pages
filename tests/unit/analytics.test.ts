import { expect, test } from 'vitest';
import { SCHEMA, sanitize, launchBucket } from '../../src/analytics/events.ts';

// D-029: event properties may only be enums, booleans or buckets, never free text, ids, dates
// or exact counts. A schema value that looks like any of those fails here.
test('every allowed value is a boolean or a short, closed enum label', () => {
  for (const [event, props] of Object.entries(SCHEMA))
    for (const [key, values] of Object.entries(props as Record<string, readonly unknown[]>)) {
      expect(values.length, `${event}.${key} must be a closed list`).toBeGreaterThan(0);
      for (const v of values) {
        if (typeof v === 'boolean') continue;
        expect(typeof v, `${event}.${key}`).toBe('string');
        expect(v as string, `${event}.${key} looks like free text, an id or a date`).toMatch(/^[a-z<+\-0-9]{1,20}$/);
        expect(v as string).not.toMatch(/\d{4}-\d{2}-\d{2}/); // no dates
      }
    }
});

test('sanitize keeps allowlisted values and drops everything else', () => {
  expect(sanitize('app_open', { mode: 'standalone', morning: true })).toEqual({ mode: 'standalone', morning: true });
  expect(sanitize('app_open', { mode: 'standalone', entryId: 'abc', text: 'dear diary' })).toEqual({ mode: 'standalone' });
  expect(sanitize('app_open', { mode: 'my secret' })).toBeUndefined();
  expect(sanitize('launch_perf', { ms: 1234 })).toBeUndefined(); // exact numbers never pass
  expect(sanitize('install_detected', { anything: 'x' })).toBeUndefined();
});

test('launch time is bucketed', () => {
  expect([0, 999, 1000, 1499, 1500, 2999, 3000, 60000].map(launchBucket)).toEqual(
    ['<1000', '<1000', '1000-1500', '1000-1500', '1500-3000', '1500-3000', '3000+', '3000+'],
  );
});

test('durability events carry only their enums (TDD 9.4)', () => {
  expect(sanitize('save_error', { kind: 'quota', recovered: false, message: 'QuotaExceededError: entry 4f2…' })).toEqual({ kind: 'quota', recovered: false });
  expect(sanitize('persist_status', { granted: true })).toEqual({ granted: true });
  expect(sanitize('storage_warning', { pct: '80', usage: 123456 })).toEqual({ pct: '80' });
  expect(sanitize('storage_warning', { pct: 81 })).toBeUndefined();
});

test('a saved backup reports only its size bucket and whether it was encrypted', async () => {
  const { backupSizeBucket } = await import('../../src/analytics/events.ts');
  expect([0, 10 * 1048576 - 1, 10 * 1048576, 100 * 1048576].map(backupSizeBucket)).toEqual(['<10', '<10', '10-100', '100+']);
  expect(sanitize('backup_done', { size: '10-100', encrypted: false, bytes: 48_000_000, name: 'Morning Pages 2026-11-15' })).toEqual({ size: '10-100', encrypted: false });
});

test('the privacy page describes every event that can be sent, and nothing else (PRI-7)', async () => {
  const { EVENT_DESCRIPTIONS } = await import('../../src/analytics/events.ts');
  expect(Object.keys(EVENT_DESCRIPTIONS).sort()).toEqual(Object.keys(SCHEMA).sort());
  for (const text of Object.values(EVENT_DESCRIPTIONS)) expect(text.length).toBeGreaterThan(20);
});

test('a writing session is summarised in buckets, never exact numbers (session_end)', async () => {
  const { sessionBuckets } = await import('../../src/analytics/events.ts');
  expect(sessionBuckets(3 * 60_000, 1, new Set(['ballpoint']), false)).toEqual({ minutes: '0-5', pages: '1', tools: 'ballpoint', eraser: false });
  expect(sessionBuckets(20 * 60_000, 3, new Set(['ballpoint', 'fountain']), true)).toEqual({ minutes: '15-30', pages: '2-3', tools: 'both', eraser: true });
  expect(sessionBuckets(45 * 60_000, 7, new Set(['fountain']), false)).toMatchObject({ minutes: '30+', pages: '4+', tools: 'fountain' });
  expect(sanitize('session_end', sessionBuckets(60_000, 2, new Set(['fountain']), false))).toEqual({ minutes: '0-5', pages: '2-3', tools: 'fountain', eraser: false });
});
