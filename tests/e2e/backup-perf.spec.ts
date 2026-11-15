import { expect, test } from '@playwright/test';

// 5.1: a year of mornings backs up in under 60 s without freezing the page (PRD 12.1).
// Headless WebKit on Windows takes about 15 ms per IndexedDB row, so a year (360,000 strokes)
// can't be seeded from the page. CI times a 30-morning sample through the /diagnostics benchmark path
// and gates only on the page staying responsive: the longest gap between frames while the worker
// seeds and builds. The year's real number comes from "Backup of a sample year" in /diagnostics
// on the reference iPad. BACKUP_ENTRIES raises the sample locally.
const ENTRIES = Number(process.env.BACKUP_ENTRIES ?? 30);

test('a backup builds in a worker while the page keeps drawing frames', async ({ page }) => {
  test.setTimeout(60_000 + ENTRIES * 20_000);
  await page.goto('/diagnostics');
  const r = await page.evaluate(async (entries) => {
    type Client = { benchBackup(p?: unknown, entries?: number): Promise<{ ops: number; ptsBytes: number; buildMs: number; seedMs: number; bytes: number }> };
    const { benchBackup } = await (window as unknown as { __store: { backup(): Promise<Client> } }).__store.backup();
    let worst = 0;
    let last = performance.now();
    let running = true;
    const tick = (t: number) => {
      worst = Math.max(worst, t - last);
      last = t;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const result = await benchBackup(undefined, entries);
    running = false;
    return { ...result, worst };
  }, ENTRIES);

  console.log(`backup: ${ENTRIES} mornings, ${r.ops} strokes, ${(r.ptsBytes / 1048576).toFixed(1)} MB of points → ${(r.bytes / 1048576).toFixed(1)} MB file in ${(r.buildMs / 1000).toFixed(1)} s (seeded in ${(r.seedMs / 1000).toFixed(0)} s); longest frame gap ${r.worst.toFixed(0)} ms`);
  expect(r.ops).toBe(ENTRIES * 3 * 330);
  expect(r.bytes).toBeGreaterThan(r.ptsBytes * 0.3); // deflate shrinks the base64 below the raw points
  expect(r.worst).toBeLessThan(250); // a main-thread build would freeze for seconds
  // The throwaway database is gone again.
  expect(await page.evaluate(async () => (await indexedDB.databases()).some((d) => d.name === 'morning-pages-bench'))).toBe(false);
});
