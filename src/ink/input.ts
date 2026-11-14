// Pencil samples (PEN-1…PEN-9, TDD 5.2, D-036). Pure normalisation, so it is unit-tested;
// the canvas owns the listeners and decides who may draw.
import type { Pt } from './types.ts';

/** The fields we read from a PointerEvent (real or coalesced/predicted). */
export interface PointerSample {
  clientX: number;
  clientY: number;
  pressure: number;
  timeStamp: number;
  altitudeAngle?: number;
  azimuthAngle?: number;
  tiltX?: number;
  tiltY?: number;
}

/** altitude/azimuth from tiltX/tiltY when the browser gives only tilt (PEN-5). */
export function tiltToAngles(tiltX = 0, tiltY = 0): [alt: number, az: number] {
  if (!tiltX && !tiltY) return [Math.PI / 2, 0];
  const tx = Math.tan((tiltX * Math.PI) / 180);
  const ty = Math.tan((tiltY * Math.PI) / 180);
  const az = (Math.atan2(ty, tx) + 2 * Math.PI) % (2 * Math.PI);
  return [Math.atan(1 / Math.hypot(tx, ty)), az];
}

/**
 * One sample in page space. Pressure is clamped to 0–1; an exact 0 on pen-down becomes 0.5,
 * because some styluses report no pressure on the first event (PEN-5, PEN-9).
 */
export function toPt(e: PointerSample, toPage: (x: number, y: number) => [number, number], down = false): Pt {
  const [x, y] = toPage(e.clientX, e.clientY);
  let p = Math.min(1, Math.max(0, e.pressure || 0));
  if (down && p === 0) p = 0.5;
  const [alt, az] = e.altitudeAngle !== undefined ? [e.altitudeAngle, e.azimuthAngle ?? 0] : tiltToAngles(e.tiltX, e.tiltY);
  return [x, y, p, alt, az, e.timeStamp];
}

/**
 * Append samples, keeping only those newer than the last kept one. iPad WebKit repeats the
 * previous batch's tail in getCoalescedEvents (S1: 23 % of samples, time running backwards).
 * Returns how many were kept.
 */
export function appendSamples(pts: Pt[], samples: Pt[]): number {
  let kept = 0;
  for (const s of samples) {
    if (pts.length && s[5] <= pts[pts.length - 1]![5]) continue;
    pts.push(s);
    kept++;
  }
  return kept;
}

/** The coalesced samples of a move, or the event itself when the list is missing or empty (PEN-3). */
export function coalesced<E extends PointerEvent>(e: E): PointerEvent[] {
  const list = e.getCoalescedEvents?.();
  return list && list.length ? list : [e];
}

/** Predicted samples newer than the stroke's last real one, for the live layer only (PEN-4). */
export function predicted(e: PointerEvent, after: number, toPage: (x: number, y: number) => [number, number]): Pt[] {
  return (e.getPredictedEvents?.() ?? []).filter((p) => p.timeStamp > after).map((p) => toPt(p, toPage));
}
