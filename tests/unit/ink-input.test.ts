import { describe, expect, test } from 'vitest';
import { appendSamples, tiltToAngles, toPt, type PointerSample } from '../../src/ink/input.ts';
import type { Pt } from '../../src/ink/types.ts';

const id = (x: number, y: number): [number, number] => [x, y];
const ev = (o: Partial<PointerSample>): PointerSample => ({ clientX: 0, clientY: 0, pressure: 0.4, timeStamp: 0, ...o });

describe('toPt', () => {
  test('maps through the page transform and keeps time', () => {
    const pt = toPt(ev({ clientX: 10, clientY: 20, timeStamp: 5 }), (x, y) => [x / 2, y / 2]);
    expect(pt.slice(0, 3)).toEqual([5, 10, 0.4]);
    expect(pt[5]).toBe(5);
  });
  test('pressure 0 on pen-down becomes 0.5; elsewhere it stays 0', () => {
    expect(toPt(ev({ pressure: 0 }), id, true)[2]).toBe(0.5);
    expect(toPt(ev({ pressure: 0 }), id, false)[2]).toBe(0);
  });
  test('pressure is clamped', () => {
    expect(toPt(ev({ pressure: 1.7 }), id)[2]).toBe(1);
    expect(toPt(ev({ pressure: -1 }), id)[2]).toBe(0);
  });
  test('altitude/azimuth used when present, derived from tilt otherwise', () => {
    expect(toPt(ev({ altitudeAngle: 1, azimuthAngle: 2 }), id).slice(3, 5)).toEqual([1, 2]);
    const [alt, az] = toPt(ev({ tiltX: 45, tiltY: 0 }), id).slice(3, 5);
    expect(alt).toBeCloseTo(Math.PI / 4);
    expect(az).toBeCloseTo(0);
  });
});

test('tilt of zero means a vertical pen', () => {
  expect(tiltToAngles(0, 0)).toEqual([Math.PI / 2, 0]);
  expect(tiltToAngles(0, 30)[1]).toBeCloseTo(Math.PI / 2);
});

describe('appendSamples (D-036)', () => {
  const s = (t: number): Pt => [t, t, 0.5, 1, 0, t];
  test('drops repeated and backwards timestamps from overlapping coalesced batches', () => {
    const pts: Pt[] = [s(0)];
    appendSamples(pts, [s(4), s(8)]);
    const kept = appendSamples(pts, [s(4), s(8), s(12), s(16)]); // iPad repeats the last batch's tail
    expect(kept).toBe(2);
    expect(pts.map((p) => p[5])).toEqual([0, 4, 8, 12, 16]);
  });
  test('equal timestamps count as repeats', () => {
    const pts: Pt[] = [s(4)];
    expect(appendSamples(pts, [s(4)])).toBe(0);
  });
});
