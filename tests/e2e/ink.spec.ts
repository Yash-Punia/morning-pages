import { expect, test } from '@playwright/test';
import { drag, frame, inkAt, tap } from './ink-helpers.ts';

test.describe('writing surface', () => {
  test('suppresses iOS selection, callout and native gestures (PEN-2)', async ({ page }) => {
    await page.goto('/today');
    const s = await page.locator('[data-ink]').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { touchAction: cs.touchAction, userSelect: cs.userSelect || cs.webkitUserSelect, callout: cs.getPropertyValue('-webkit-touch-callout') };
    });
    expect(s.touchAction).toBe('none');
    expect(s.userSelect).toBe('none');
    expect(['none', '']).toContain(s.callout); // desktop WebKit may not report the iOS-only property
  });

  test('canvases are sized from their own box (D-037)', async ({ page }) => {
    for (const size of [{ width: 1366, height: 1024 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(size);
      await page.goto('/today');
      const r = await page.locator('[data-ink] canvas').first().evaluate((c: HTMLCanvasElement) => {
        const b = c.getBoundingClientRect();
        return { w: c.width, h: c.height, bw: Math.round(b.width * devicePixelRatio), bh: Math.round(b.height * devicePixelRatio), vh: innerHeight, scroll: document.documentElement.scrollHeight };
      });
      expect(r.w).toBe(r.bw);
      expect(r.h).toBe(r.bh);
      expect(r.scroll).toBeLessThanOrEqual(r.vh); // Today never scrolls the document; the canvas scrolls itself
    }
  });

  test('the pen inks exactly under the pointer; fingers never ink (PEN-1)', async ({ page }) => {
    for (const size of [{ width: 1366, height: 1024 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(size);
      await page.goto('/today');
      await frame(page);
      await drag(page, 'pen', { x: 200, y: 520 }, { x: 420, y: 520 });
      await frame(page);
      expect(await inkAt(page, 310, 520)).toBe(true);
      expect(await inkAt(page, 310, 545)).toBe(false); // nothing 25 px off the line
      await drag(page, 'touch', { x: 200, y: 700 }, { x: 420, y: 700 });
      await frame(page);
      expect(await inkAt(page, 310, 700, 3)).toBe(false);
    }
  });

  test('ink stays 1:1 after the surface resizes (spine opens)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 });
    await page.goto('/today');
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await page.waitForTimeout(300); // spine width transition
    await frame(page);
    await drag(page, 'pen', { x: 250, y: 600 }, { x: 450, y: 600 });
    await frame(page);
    expect(await inkAt(page, 350, 600)).toBe(true);
    expect(await inkAt(page, 350, 625)).toBe(false);
  });

  test('a 50-page entry scrolls end to end on tiles without long frames (INK-5)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/today');
    const stats = await page.evaluate(async () => {
      type Engine = { doc: { addPage(): void; addStroke(pts: number[][], t: string, c: string, s: number): void; pages: unknown[] }; view: { panBy(x: number, y: number): void; sy: number }; invalidate(c: boolean): void };
      const ink = (window as unknown as { __ink: Engine }).__ink;
      for (let p = 0; p < 50; p++) {
        const top = p * (1414 + 24);
        for (let line = 0; line < 20; line++) {
          const y = top + 160 + line * 60;
          ink.doc.addStroke(Array.from({ length: 80 }, (_, i) => [80 + i * 10, y + Math.sin(i / 3) * 12, 0.5, 1, 0, i * 4]), 'fountain', 'blueBlack', 5);
        }
      }
      // Headless WebKit renders canvases in software and flushes them lazily, so wall-clock frame
      // times measure the test machine. What the code controls is checked instead: scrolling only
      // paints tiles that newly come into view, each paint is cheap, and memory stays capped.
      // The real 120 Hz budget is read from /diagnostics on the iPad (TDD 5.7).
      type Paint = (...a: unknown[]) => void;
      const engine = ink as unknown as { visibleTiles(): unknown[]; paintTile: Paint; tiles: { size: number } };
      const original = engine.paintTile.bind(engine);
      const paints: number[] = [];
      engine.paintTile = (...a) => { const t = performance.now(); original(...a); paints.push(performance.now() - t); };
      let maxTiles = 0, maxPaintsPerStep = 0;
      engine.visibleTiles(); // fill the first screen; after that, scrolling only adds new rows
      paints.length = 0;
      for (let f = 0; f < 260; f++) {
        ink.view.panBy(0, -280);
        const before = paints.length;
        engine.visibleTiles();
        maxPaintsPerStep = Math.max(maxPaintsPerStep, paints.length - before);
        maxTiles = Math.max(maxTiles, engine.tiles.size);
      }
      paints.sort((a, b) => a - b);
      const sy = ink.view.sy;
      ink.view.panBy(0, 1300); // up from the fresh last page to the last written one
      (ink as unknown as { invalidate(c: boolean): void }).invalidate(true);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { pages: ink.doc.pages.length, sy, paints: paints.length, p95: paints[Math.floor(paints.length * 0.95)]!, maxPaintsPerStep, maxTiles };
    });
    expect(stats.pages).toBe(51); // 50 written pages plus the fresh one waiting below
    expect(stats.sy).toBeGreaterThan(49 * 1438 - 2000); // reached the last page
    expect(stats.maxPaintsPerStep).toBeLessThanOrEqual(4); // a new row of tiles, never the document
    expect(stats.paints).toBeLessThan(400); // ~2 columns × ~140 rows, each painted once
    expect(stats.p95).toBeLessThan(12); // one tile's JS paint fits well inside a frame
    expect(stats.maxTiles).toBeLessThanOrEqual(24); // memory stays capped while scrolling 50 pages
    expect(await inkAt(page, 400, 700, 30)).toBe(true); // ink is still there at the end
  });

  test('at 4x zoom ink still lands under the pen and tile memory stays capped (D-040)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/today');
    await page.evaluate(() => {
      const ink = (window as unknown as { __ink: { view: { zoomAt(z: number, x: number, y: number): void }; invalidate(c: boolean): void } }).__ink;
      ink.view.zoomAt(4, 500, 600);
      ink.invalidate(true);
    });
    await frame(page);
    await drag(page, 'pen', { x: 300, y: 600 }, { x: 600, y: 600 });
    await frame(page);
    expect(await inkAt(page, 450, 600)).toBe(true);
    expect(await inkAt(page, 450, 700)).toBe(false);
    const tiles = await page.evaluate(() => {
      const t = (window as unknown as { __ink: { tiles: { size: number; usedPixels: number } } }).__ink.tiles;
      return { size: t.size, usedPixels: t.usedPixels };
    });
    expect(tiles.size).toBeLessThanOrEqual(24);
    expect(tiles.usedPixels).toBeLessThanOrEqual(24 * 1024 * 1024);
  });

  test('writing on the last page adds the next one, and it can be scrolled to and written on', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/today');
    const ink = page.locator('[data-ink]');
    await frame(page);
    await expect(ink).toHaveAttribute('data-pages', '1');
    await drag(page, 'pen', { x: 200, y: 400 }, { x: 400, y: 400 });
    await frame(page);
    await expect(ink).toHaveAttribute('data-pages', '2');
    await page.waitForTimeout(600); // fingers right after the pen are a resting palm (500 ms guard)
    for (let i = 0; i < 3; i++) await drag(page, 'touch', { x: 500, y: 1200 }, { x: 500, y: 700 }, { steps: 6 }); // scroll ~1500 px
    await page.waitForTimeout(1500); // let inertia settle
    await frame(page);
    await drag(page, 'pen', { x: 200, y: 900 }, { x: 400, y: 900 });
    await frame(page);
    await expect(ink).toHaveAttribute('data-pages', '3'); // wrote on page 2
    await expect(page.getByText('Practice page · not saved yet')).toBeVisible();
  });

  test('the stroke eraser removes whole strokes it touches, and only those (TDD 5.6)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/today');
    const ink = page.locator('[data-ink]');
    await frame(page);
    await drag(page, 'pen', { x: 200, y: 500 }, { x: 500, y: 500 });
    await drag(page, 'pen', { x: 200, y: 600 }, { x: 500, y: 600 });
    await frame(page);
    await expect(ink).toHaveAttribute('data-strokes', '2');
    await page.evaluate(() => { (window as unknown as { __ink: { mode: string } }).__ink.mode = 'eraser'; });
    await drag(page, 'pen', { x: 350, y: 460 }, { x: 350, y: 530 }); // crosses only the first line
    await frame(page);
    await expect(ink).toHaveAttribute('data-strokes', '1');
    expect(await inkAt(page, 260, 500, 2)).toBe(false); // the whole stroke went, not just where it was touched
    expect(await inkAt(page, 260, 600, 2)).toBe(true);
  });

  test('undo and redo: keyboard shortcuts and two-/three-finger taps restore exact state', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/today');
    const ink = page.locator('[data-ink]');
    await frame(page);
    await drag(page, 'pen', { x: 200, y: 500 }, { x: 500, y: 500 });
    await drag(page, 'pen', { x: 200, y: 600 }, { x: 500, y: 600 });
    await frame(page);
    await page.keyboard.press('ControlOrMeta+z');
    await frame(page);
    await expect(ink).toHaveAttribute('data-strokes', '1');
    expect(await inkAt(page, 350, 600, 2)).toBe(false);
    expect(await inkAt(page, 350, 500, 2)).toBe(true);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await frame(page);
    await expect(ink).toHaveAttribute('data-strokes', '2');
    expect(await inkAt(page, 350, 600, 2)).toBe(true);

    await page.waitForTimeout(600); // past the palm guard
    await tap(page, 2);
    await frame(page);
    await expect(ink).toHaveAttribute('data-strokes', '1');
    await tap(page, 3);
    await frame(page);
    await expect(ink).toHaveAttribute('data-strokes', '2');
  });

  test('one finger scrolls the page (D-007)', async ({ page }) => {
    await page.goto('/today');
    const ink = page.locator('[data-ink]');
    await frame(page);
    await expect(ink).toHaveAttribute('data-scroll-y', '0.0');
    await drag(page, 'touch', { x: 400, y: 700 }, { x: 400, y: 300 });
    await frame(page);
    expect(Number(await ink.getAttribute('data-scroll-y'))).toBeGreaterThan(300);
  });

  test('a trackpad pinch (ctrl + wheel) zooms', async ({ page }) => {
    await page.goto('/today');
    await page.locator('[data-ink]').hover();
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await frame(page);
    expect(Number(await page.locator('[data-ink]').getAttribute('data-zoom'))).toBeGreaterThan(1);
  });
});
