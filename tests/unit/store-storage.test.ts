import { describe, expect, test } from 'vitest';
import { checkStorage, warnLevel } from '../../src/store/storage.ts';

const api = (over: Partial<Record<'persisted' | 'persist' | 'estimate', () => Promise<unknown>>> = {}) => {
  const calls: string[] = [];
  const m = {
    persisted: async () => (calls.push('persisted'), false),
    persist: async () => (calls.push('persist'), true),
    estimate: async () => ({ usage: 10, quota: 100 }),
    ...over,
  };
  return { api: m as unknown as StorageManager, calls };
};

describe('storage protection (TDD 6.5)', () => {
  test('asks for persistence while it is not granted, and not once it is', async () => {
    const a = api();
    expect((await checkStorage(a.api)).persisted).toBe(true);
    expect(a.calls).toEqual(['persisted', 'persist']);
    const b = api({ persisted: async () => true });
    await checkStorage(b.api);
    expect(b.calls).toEqual([]);
  });

  test('a browser without the API reports unknown instead of failing', async () => {
    const s = await checkStorage(api({ persisted: async () => { throw new Error('nope'); }, estimate: async () => { throw new Error('nope'); } }).api);
    expect(s).toEqual({ persisted: null, usage: 0, quota: 0, warn: 0 });
  });

  test('warns from 80 % of the quota, and again at 95 %', () => {
    expect(warnLevel(79, 100)).toBe(0);
    expect(warnLevel(80, 100)).toBe(80);
    expect(warnLevel(96, 100)).toBe(95);
    expect(warnLevel(5, 0)).toBe(0);
  });
});
