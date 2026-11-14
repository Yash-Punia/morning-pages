import { expect, test } from 'vitest';
import { NIB_ANGLE, outline, pointsBox, smooth, SMOOTHING } from '../../src/ink/stroke.ts';
import type { Pt } from '../../src/ink/types.ts';
import { endGapMax, hookShare, jitter } from '../../scripts/ink-metrics.ts';

// Ported from spikes/ink/pipeline.check.ts: a slow diagonal at 150 px/s, 240 Hz, snapped to
// 0.5 px like the iPad reports (S1 round 1).
const q = (v: number) => Math.round(v * 2) / 2;
const line: Pt[] = Array.from({ length: 240 }, (_, i) => [q(100 + i * 0.44 + Math.sin(i) * 0.2), q(100 + i * 0.44), 0.5, 1, 0, i * 4.17]);

test.each(Object.entries(SMOOTHING))('%s smoothing halves jitter and settles on the last sample', (_, cfg) => {
  const sm = smooth(line, cfg, true);
  expect(jitter(sm.slice(0, line.length))).toBeLessThan(jitter(line) * 0.5);
  expect(endGapMax([line], [sm])).toBeLessThan(0.5);
  expect(smooth(line, cfg, false)).toHaveLength(line.length); // live output is one point per sample
});

test('smoothing is pure: live and committed render the same points', () => {
  expect(smooth(line, SMOOTHING.medium, false)).toEqual(smooth(line, SMOOTHING.medium, false));
});

test('a hooked lift-off no longer hooks once the lift sample is dropped', () => {
  const stroke: Pt[] = Array.from({ length: 60 }, (_, i) => [i * 2, 100, 0.5, 1, 0, i * 4]);
  const hooked: Pt[] = [...stroke, [stroke.at(-1)![0] - 3, 104, 0, 1, 0, 252]];
  expect(hookShare([hooked])).toBe(1);
  expect(hookShare([smooth(stroke, SMOOTHING.medium, true)])).toBe(0);
});

test('the italic fountain nib is thick on downstrokes and a hairline along its edge (D-043)', () => {
  // Shoelace area of the swept outline, for a 100-unit stroke in a given direction.
  const area = (dx: number, dy: number) => {
    const pts: Pt[] = Array.from({ length: 50 }, (_, i) => [200 + (dx * i) / 49, 200 + (dy * i) / 49, 0.5, 1, 0, i * 4]);
    const o = outline(pts, 'fountain', 5, 'medium', true);
    let a = 0;
    for (let i = 0; i < o.length; i++) { const p = o[i]!, n = o[(i + 1) % o.length]!; a += p[0]! * n[1]! - n[0]! * p[1]!; }
    return Math.abs(a / 2);
  };
  const down = area(0, 100);
  const alongNib = area(100 * Math.cos(NIB_ANGLE), -100 * Math.sin(NIB_ANGLE));
  const across = area(100 * Math.sin(NIB_ANGLE), 100 * Math.cos(NIB_ANGLE)); // perpendicular to the edge
  expect(down).toBeGreaterThan(alongNib * 5);
  expect(across).toBeGreaterThan(down); // widest when moving square to the nib
});

test('the ballpoint is round: about as wide in every direction', () => {
  const area = (dx: number, dy: number) => {
    const pts: Pt[] = Array.from({ length: 50 }, (_, i) => [200 + (dx * i) / 49, 200 + (dy * i) / 49, 0.5, 1, 0, i * 4]);
    const [x0, y0, x1, y1] = pointsBox(outline(pts, 'ballpoint', 2.8, 'medium', true).map(([x, y]): Pt => [x!, y!, 0, 0, 0, 0]), 0);
    return (x1 - x0) * (y1 - y0) / 100;
  };
  expect(area(0, 100)).toBeCloseTo(area(100, 0), 0);
});

test('outlines close and the box covers the stroke width', () => {
  const o = outline(line, 'ballpoint', 5, 'medium', true);
  expect(o.length).toBeGreaterThan(10);
  const [x0, y0, x1, y1] = pointsBox(line, 5);
  for (const [x, y] of o) expect(x! >= x0 && x! <= x1 && y! >= y0 && y! <= y1).toBe(true);
});
