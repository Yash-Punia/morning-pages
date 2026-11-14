import { expect, test } from '@playwright/test';
import { drag, frame } from './ink-helpers.ts';

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
