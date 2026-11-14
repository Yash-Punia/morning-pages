import type { Page } from '@playwright/test';

// Synthetic pointer input for the writing surface. Desktop WebKit has no Pencil or touch screen,
// so tests dispatch PointerEvents directly (the pattern the M0 spike tests proved).

type Kind = 'pen' | 'touch';
interface Point { x: number; y: number }

export async function surfaceBox(page: Page) {
  return (await page.locator('[data-ink]').boundingBox())!;
}

/** A pointer drag from `from` to `to` (surface-relative CSS px) in `steps` moves. */
export async function drag(page: Page, kind: Kind, from: Point, to: Point, { steps = 12, id = kind === 'pen' ? 2 : 10, hover = false } = {}) {
  const box = await surfaceBox(page);
  await page.evaluate(
    async ({ kind, from, to, steps, id, box, hover }) => {
      const el = document.querySelector('[data-ink]')!;
      const fire = (type: string, x: number, y: number, extra: PointerEventInit = {}) =>
        el.dispatchEvent(new PointerEvent(type, {
          bubbles: true, pointerId: id, pointerType: kind, isPrimary: true,
          clientX: box.x + x, clientY: box.y + y, pressure: type === 'pointerup' || hover ? 0 : 0.5,
          buttons: type === 'pointerup' || hover ? 0 : 1, ...extra,
        }));
      if (!hover) fire('pointerdown', from.x, from.y);
      for (let i = 1; i <= steps; i++) {
        fire('pointermove', from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
        await new Promise((r) => setTimeout(r, 8));
      }
      if (!hover) fire('pointerup', to.x, to.y);
    },
    { kind, from, to, steps, id, box, hover },
  );
}

/** Several fingers down at once, then up: a multi-finger tap. */
export async function tap(page: Page, fingers: number, at: Point = { x: 300, y: 300 }) {
  const box = await surfaceBox(page);
  await page.evaluate(({ fingers, at, box }) => {
    const el = document.querySelector('[data-ink]')!;
    for (const type of ['pointerdown', 'pointerup'])
      for (let i = 0; i < fingers; i++)
        el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 20 + i, pointerType: 'touch', clientX: box.x + at.x + i * 40, clientY: box.y + at.y }));
  }, { fingers, at, box });
}

/**
 * Is there ink at surface point (x, y)? Reads the committed and live layers and treats a dark,
 * opaque pixel as ink (paper and rulings are light), so it works before and after paper exists.
 */
export async function inkAt(page: Page, x: number, y: number, radius = 1) {
  return page.evaluate(({ x, y, radius }) => {
    for (const c of document.querySelectorAll<HTMLCanvasElement>('[data-ink] canvas')) {
      const k = c.width / c.getBoundingClientRect().width;
      const r = Math.max(1, Math.round(radius * k));
      const d = c.getContext('2d')!.getImageData(Math.round(x * k) - r, Math.round(y * k) - r, r * 2 + 1, r * 2 + 1).data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!) / 255;
        if (d[i + 3]! > 200 && lum < 0.45) return true;
      }
    }
    return false;
  }, { x, y, radius });
}

export const frame = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
