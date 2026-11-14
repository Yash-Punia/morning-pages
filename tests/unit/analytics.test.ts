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
