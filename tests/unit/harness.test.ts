import { expect, test } from 'vitest';

// Proves the unit harness has an IndexedDB (fake-indexeddb) for store tests from M3 on.
test('indexedDB round-trips a record', async () => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('harness', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').put('ink', 'pen');
  await new Promise((r) => (tx.oncomplete = r));
  const got = await new Promise((r) => (db.transaction('kv').objectStore('kv').get('pen').onsuccess = (e) => r((e.target as IDBRequest).result)));
  expect(got).toBe('ink');
});
