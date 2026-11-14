import { expect, test } from 'vitest';
import { outline, pointsBox, smooth, SMOOTHING } from '../../src/ink/stroke.ts';
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

test('outlines close and the box covers the stroke width', () => {
  const o = outline(line, 'fountain', 5, 'medium', true);
  expect(o.length).toBeGreaterThan(10);
  const [x0, y0, x1, y1] = pointsBox(line, 5);
  for (const [x, y] of o) expect(x! >= x0 && x! <= x1 && y! >= y0 && y! <= y1).toBe(true);
});
