import { describe, expect, test } from 'vitest';
import { Gestures, type GestureSink } from '../../src/ink/gestures.ts';
import { MAX_ZOOM, MIN_ZOOM, Viewport } from '../../src/ink/viewport.ts';

const vp = (w = 1000, h = 1300, doc = 3000) => {
  const v = new Viewport();
  v.docHeight = doc;
  v.resize(w, h);
  return v;
};

describe('Viewport', () => {
  test('page ↔ screen round-trips at any zoom and scroll', () => {
    const v = vp(768, 1024);
    v.zoomAt(2.3, 300, 400);
    v.panBy(-40, -900);
    const [x, y] = v.toDoc(123, 456);
    const [cx, cy] = v.toScreen(x, y);
    expect(cx).toBeCloseTo(123);
    expect(cy).toBeCloseTo(456);
  });

  test('one page unit is 2 device px on the reference iPad at zoom 1 (D-040)', () => {
    expect(vp(1294, 1024).scale * 2).toBeCloseTo(2);
    expect(vp(1024, 1366).scale * 2).toBeCloseTo(2);
  });

  test('zoom is clamped and keeps the focal point fixed', () => {
    const v = vp(1000, 1300);
    v.panBy(0, -500);
    const before = v.toDoc(400, 600);
    v.zoomAt(2, 400, 600);
    const after = v.toDoc(400, 600);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
    v.zoomAt(99, 0, 0);
    expect(v.zoom).toBe(MAX_ZOOM);
    v.zoomAt(0.01, 0, 0);
    expect(v.zoom).toBe(MIN_ZOOM);
  });

  test('a page narrower than the surface stays centred; scrolling stops at the ends', () => {
    const v = vp(1294, 1024);
    expect(v.sx).toBeCloseTo(-147);
    v.panBy(-500, 0); // no horizontal scroll when the page fits
    expect(v.sx).toBeCloseTo(-147);
    v.panBy(0, 10_000);
    expect(v.sy).toBe(0);
    v.panBy(0, -100_000);
    expect(v.sy).toBeCloseTo(3000 + 160 - 1024);
  });
});

describe('Gestures', () => {
  const sink = () => {
    const s: GestureSink & { log: string[]; total: number[] } = {
      log: [],
      total: [0, 0],
      pan(dx, dy) { s.total = [s.total[0]! + dx, s.total[1]! + dy]; },
      pinch(f) { s.log.push(`pinch ${f.toFixed(2)}`); },
      tap(n) { s.log.push(`tap ${n}`); },
    };
    return s;
  };
  const noRaf = () => 0;

  test('one finger pans', () => {
    const s = sink();
    const g = new Gestures(s, noRaf, () => {});
    g.down(1, 100, 100, 0);
    g.move(1, 100, 60, 10);
    g.up(1, 400);
    expect(s.total).toEqual([0, -40]);
  });

  test('two fingers pinch by their distance ratio', () => {
    const s = sink();
    const g = new Gestures(s, noRaf, () => {});
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 0);
    g.move(2, 300, 100, 20);
    expect(s.log).toContain('pinch 2.00');
  });

  test('quick two- and three-finger taps are undo and redo', () => {
    for (const fingers of [2, 3] as const) {
      const s = sink();
      const g = new Gestures(s, noRaf, () => {});
      for (let i = 0; i < fingers; i++) g.down(i, 100 + i * 50, 100, 0);
      for (let i = 0; i < fingers; i++) g.up(i, 120);
      expect(s.log).toEqual([`tap ${fingers}`]);
    }
  });

  test('a slow or travelling two-finger touch is not a tap', () => {
    const s = sink();
    const g = new Gestures(s, noRaf, () => {});
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 0);
    g.up(1, 400);
    g.up(2, 400);
    expect(s.log.filter((l) => l.startsWith('tap'))).toEqual([]);
  });

  test('the pen cancels a pan and touches are ignored right after it lifts (palm guard)', () => {
    const s = sink();
    const g = new Gestures(s, noRaf, () => {});
    g.down(1, 100, 100, 0);
    g.penStart();
    g.move(1, 100, 50, 10); // the palm keeps moving: no pan
    expect(s.total).toEqual([0, 0]);
    expect(g.down(2, 100, 100, 20)).toBe(false); // pen still down
    g.penEnd(1000);
    expect(g.down(3, 100, 100, 1200)).toBe(false); // within 500 ms
    expect(g.down(4, 100, 100, 1600)).toBe(true);
  });

  test('a flick keeps scrolling with decaying speed', () => {
    const s = sink();
    const frames: ((t: number) => void)[] = [];
    const g = new Gestures(s, (cb) => frames.push(cb), () => {});
    g.down(1, 100, 500, 0);
    for (let i = 1; i <= 5; i++) g.move(1, 100, 500 - i * 20, i * 10);
    g.up(1, 50);
    const afterLift = s.total[1]!;
    let t = 50;
    while (frames.length && t < 5000) frames.shift()!((t += 16));
    expect(s.total[1]!).toBeLessThan(afterLift - 100); // carried on upward
    expect(frames.length).toBe(0); // and stopped
  });
});
