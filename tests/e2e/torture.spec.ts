import { expect, test, type Page } from '@playwright/test';
import { drag, frame } from './ink-helpers.ts';

// Durability torture (TDD 13.2, M3.12), the app version of the S2 spike that passed on the iPad
// (10,021 strokes, 200 interruptions, 0 lost). Each cycle writes a few strokes through the real
// engine and store, sometimes leaves one in flight, then relaunches: a normal reload, or a kill
// that skips every pagehide save. After each relaunch:
//   - nothing that was on disk before is missing (no loss);
//   - the page shows exactly the strokes on disk (no duplicates, nothing phantom);
//   - a stroke killed in flight, once mirrored, is back (recovery).

const CYCLES = 20;

type Store = { db(): { ops: { toArray(): Promise<{ id: string; kind: string }[]> } }; writes: { idle(): Promise<void> } };
const strokeIds = (page: Page) =>
  page.evaluate(async () => {
    const s = (window as unknown as { __store: Store }).__store;
    return (await s.db().ops.toArray()).filter((o) => o.kind === 'stroke').map((o) => o.id);
  });

/** Start a stroke and never lift the Pencil; wait until its recovery mirror is on disk. */
async function inFlight(page: Page, y: number) {
  const box = (await page.locator('[data-ink]').boundingBox())!;
  await page.evaluate(async ({ box, y }) => {
    const el = document.querySelector('[data-ink]')!;
    const fire = (type: string, x: number) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, pointerType: 'pen', isPrimary: true, clientX: box.x + x, clientY: box.y + y, pressure: 0.5, buttons: 1 }));
    fire('pointerdown', 150);
    for (let i = 1; i <= 6; i++) { fire('pointermove', 150 + i * 25); await new Promise((r) => setTimeout(r, 8)); }
    await (window as unknown as { __store: Store }).__store.writes.idle();
  }, { box, y });
}

test('durability torture: 20 relaunches, kills mid-stroke, zero strokes lost or doubled', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.goto('/today');
  await frame(page);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  let restored = 0;

  for (let cycle = 0; cycle < CYCLES; cycle++) {
    const strokes = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < strokes; i++) {
      const y = 260 + ((cycle * 5 + i) % 22) * 44;
      await drag(page, 'pen', { x: 140 + rnd() * 80, y }, { x: 520 + rnd() * 200, y: y + rnd() * 10 }, { steps: 6 });
    }
    const kill = cycle % 2 === 1;
    if (kill) {
      await inFlight(page, 1250);
    }
    const before = await strokeIds(page);
    if (kill) await page.evaluate(() => { (window as unknown as { __ink: { flush(): void } }).__ink.flush = () => {}; });
    if (rnd() < 0.5) await page.waitForTimeout(Math.floor(rnd() * 40)); // relaunch at a random moment
    await page.reload();
    await frame(page);

    const after = await strokeIds(page);
    const missing = before.filter((id) => !after.includes(id));
    expect(missing, `cycle ${cycle}: strokes lost`).toEqual([]);
    expect(new Set(after).size, `cycle ${cycle}: duplicate ids`).toBe(after.length);
    await expect(page.locator('[data-ink]')).toHaveAttribute('data-strokes', String(after.length));
    if (kill) {
      // The mirrored stroke that was in flight is back, on top of everything already saved.
      expect(after.length, `cycle ${cycle}: in-flight stroke not restored`).toBeGreaterThan(before.length);
      restored++;
    }
  }
  expect(restored).toBe(CYCLES / 2);
});
