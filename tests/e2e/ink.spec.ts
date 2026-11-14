import { expect, test } from '@playwright/test';

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
});
