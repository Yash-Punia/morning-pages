import { describe, expect, test } from 'vitest';
import { decode, encode, fromRecord, simplify, toRecord } from '../../src/store/codec.ts';
import type { Pt, StrokeOp } from '../../src/ink/types.ts';

let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

describe('point codec (TDD 7.3, D-006)', () => {
  test('round-trips within the quantisation, with no time drift', () => {
    for (let s = 0; s < 200; s++) {
      const pts: Pt[] = [];
      let x = rnd() * 1000, y = rnd() * 1400, t = 1e6 + rnd() * 1e6;
      for (let i = 0; i < 50 + Math.floor(rnd() * 400); i++) {
        x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; t += rnd() * 9;
        pts.push([x, y, rnd(), (rnd() * Math.PI) / 2, rnd() * Math.PI * 2, t]);
      }
      const out = decode(encode(pts));
      expect(out.length).toBe(pts.length);
      pts.forEach((p, i) => {
        const q = out[i]!;
        expect(Math.abs(p[0] - q[0])).toBeLessThanOrEqual(1 / 32 + 1e-9);
        expect(Math.abs(p[1] - q[1])).toBeLessThanOrEqual(1 / 32 + 1e-9);
        expect(Math.abs(p[2] - q[2])).toBeLessThanOrEqual(1 / 510 + 1e-9);
        expect(Math.abs(p[3] - q[3])).toBeLessThanOrEqual(Math.PI / 2 / 126 + 1e-9);
        const daz = Math.abs(p[4] - q[4]) % (Math.PI * 2);
        expect(Math.min(daz, Math.PI * 2 - daz)).toBeLessThanOrEqual(Math.PI / 256 + 1e-9);
        expect(Math.abs(p[5] - q[5])).toBeLessThanOrEqual(1 + 1e-9);
      });
    }
  });

  test('without pressure and tilt the decoder fills defaults', () => {
    const flat = decode(encode([[0, 0, 0.9, 0.2, 1, 0], [1, 1, 0.1, 0.3, 2, 5]], { pressure: false, tilt: false }));
    expect(flat.map((p) => p[2])).toEqual([0.5, 0.5]);
  });

  test('simplify keeps endpoints and a pressure spike, drops collinear points', () => {
    const line: Pt[] = Array.from({ length: 11 }, (_, i) => [i, 0, i === 5 ? 0.9 : 0.5, 1, 0, i]);
    expect(simplify(line, 0.15).map((p) => p[0])).toEqual([0, 4, 5, 6, 10]);
    expect(simplify(line, 0).length).toBe(11);
  });

  test('a dense synthetic page of handwriting stays under 150 KB', () => {
    // ~420 looping strokes, samples about a unit apart with varying pressure: about
    // as many raw points as the owner's dense real page (24,883). The real pages stay local.
    let bytes = 0, raw = 0;
    for (let s = 0; s < 420; s++) {
      const pts: Pt[] = [];
      const cx = 60 + (s % 14) * 63, cy = 200 + Math.floor(s / 14) * 40;
      const n = 40 + Math.floor(rnd() * 40);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * (2 + rnd() * 0.02);
        pts.push([cx + Math.cos(a) * 9 + i * 0.25, cy + Math.sin(a * 1.5) * 12, 0.4 + 0.3 * Math.sin(a), 1.1, 2, i * 4.17]);
      }
      raw += pts.length;
      bytes += toRecord(stroke(pts)).pts!.byteLength + 60; // + record overhead
    }
    expect(raw).toBeGreaterThan(20_000);
    expect(bytes / 1024).toBeLessThan(150);
  });

  test('toRecord / fromRecord keep a stroke, simplified, and target ops exactly', () => {
    const pts: Pt[] = Array.from({ length: 50 }, (_, i) => [i * 0.5, Math.sin(i / 5) * 10, 0.5, 1, 0, i * 4]);
    const back = fromRecord(toRecord(stroke(pts))) as StrokeOp;
    expect(back.pts.length).toBeLessThan(50);
    expect(back.pts.at(-1)![0]).toBeCloseTo(24.5, 1);
    expect(back).toMatchObject({ id: 's', tool: 'ballpoint', color: 'black', size: 2.8 });
    const erase = { id: 'x', pageId: 'p', seq: 2, createdAt: 3, kind: 'erase' as const, targets: ['s'] };
    expect(fromRecord(toRecord(erase))).toEqual(erase);
  });
});

function stroke(pts: Pt[]): StrokeOp {
  return { id: 's', pageId: 'p', seq: 1, createdAt: 1, kind: 'stroke', tool: 'ballpoint', color: 'black', size: 2.8, pts, bbox: [0, 0, 1, 1] };
}
