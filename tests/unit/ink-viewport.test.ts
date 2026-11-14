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

describe('Gestures (D-042: fingers only scroll)', () => {
  const sink = () => {
    const s: GestureSink & { total: number[] } = {
      total: [0, 0],
      pan(dx, dy) { s.total = [s.total[0]! + dx, s.total[1]! + dy]; },
    };
    return s;
  };
  const noRaf = () => 0;
  const gestures = (s: GestureSink, twoFinger = false) => new Gestures(s, twoFinger, noRaf, () => {});

  test('one finger scrolls', () => {
    const s = sink();
    const g = gestures(s);
    g.down(1, 100, 100, 0);
    g.move(1, 100, 60, 10);
    g.up(1, 400);
    expect(s.total).toEqual([0, -40]);
  });

  test('a second contact (a resting palm) stops scrolling until every finger lifts', () => {
    const s = sink();
    const g = gestures(s);
    g.down(1, 100, 100, 0);
    g.move(1, 100, 80, 10);
    expect(g.down(2, 300, 300, 20)).toBe(false);
    g.move(1, 100, 0, 30); // ignored now
    g.move(2, 300, 200, 30);
    g.up(2, 40);
    g.move(1, 100, -100, 50); // still ignored: the first finger hasn't lifted
    g.up(1, 60);
    expect(s.total).toEqual([0, -20]);
    expect(g.down(3, 100, 100, 1000)).toBe(true); // all lifted: scrolling works again
  });

  test('two or three fingers never zoom or undo; they do nothing', () => {
    const s = sink();
    const g = gestures(s);
    for (let i = 0; i < 3; i++) g.down(i, 100 + i * 50, 100, 0);
    for (let i = 0; i < 3; i++) g.move(i, 100 + i * 80, 60, 10);
    for (let i = 0; i < 3; i++) g.up(i, 120);
    expect(s.total).toEqual([0, 0]);
  });

  test('palm-sized contacts are ignored', () => {
    const s = sink();
    const g = gestures(s);
    expect(g.down(1, 100, 100, 0, 70)).toBe(false);
    g.move(1, 100, 0, 10);
    expect(s.total).toEqual([0, 0]);
  });

  test('the Pencil cancels a scroll, and touches just after it lifts are a resting palm', () => {
    const s = sink();
    const g = gestures(s);
    g.down(1, 100, 100, 0);
    g.penStart();
    g.move(1, 100, 50, 10); // the palm keeps moving: no scroll
    g.up(1, 20);
    expect(s.total).toEqual([0, 0]);
    expect(g.down(2, 100, 100, 30)).toBe(false); // pen still down
    g.up(2, 40);
    g.penEnd(1000);
    expect(g.down(3, 100, 100, 1200)).toBe(false); // within 500 ms
    g.up(3, 1210);
    expect(g.down(4, 100, 100, 1600)).toBe(true);
  });

  test('a flick keeps scrolling with decaying speed', () => {
    const s = sink();
    const frames: ((t: number) => void)[] = [];
    const g = new Gestures(s, false, (cb) => frames.push(cb), () => {});
    g.down(1, 100, 500, 0);
    for (let i = 1; i <= 5; i++) g.move(1, 100, 500 - i * 20, i * 10);
    g.up(1, 50);
    const afterLift = s.total[1]!;
    let t = 50;
    while (frames.length && t < 5000) frames.shift()!((t += 16));
    expect(s.total[1]!).toBeLessThan(afterLift - 100); // carried on upward
    expect(frames.length).toBe(0); // and stopped
  });

  test('in finger-drawing mode, two fingers together scroll (and still never zoom)', () => {
    const s = sink();
    const g = gestures(s, true);
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 0);
    g.move(1, 100, 60, 10);
    g.move(2, 200, 60, 10);
    expect(s.total).toEqual([0, -40]);
  });
});
