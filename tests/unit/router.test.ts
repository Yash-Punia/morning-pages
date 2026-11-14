import { expect, test, vi } from 'vitest';

// router.ts reads matchMedia at import; the unit environment has no DOM.
vi.stubGlobal('matchMedia', () => ({ matches: false }));
vi.mock('../../src/screens/Today.svelte', () => ({ default: {} }));
vi.mock('../../src/screens/Entry.svelte', () => ({ default: {} }));
const { match } = await import('../../src/router.ts');

test('matches static routes and decodes params', () => {
  expect(match('/library')?.template).toBe('/library');
  expect(match('/library/')?.template).toBe('/library');
  expect(match('/entry/a%20b')).toMatchObject({ template: '/entry/:id', params: { id: 'a b' } });
});

test('unknown paths and partial matches do not route', () => {
  expect(match('/nope')).toBeNull();
  expect(match('/entry')).toBeNull();
  expect(match('/entry/1/extra')).toBeNull();
  expect(match('/libraryx')).toBeNull();
});
