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

  test('a real fingertip scrolls (iOS reports ~40–60 px); palm-sized contacts are ignored', () => {
    const s = sink();
    const g = gestures(s);
    expect(g.down(1, 100, 100, 0, 52)).toBe(true); // iPad fingertip: 2 × majorRadius
    g.move(1, 100, 60, 10);
    g.up(1, 400);
    expect(s.total).toEqual([0, -40]);
    expect(g.down(2, 100, 100, 1000, 120)).toBe(false);
    g.move(2, 100, 0, 1010);
    expect(s.total).toEqual([0, -40]);
  });

  test('every touch is logged with its contact and why it did or did not scroll', () => {
    const log: [number, string, number][] = [];
    const g = new Gestures(sink(), false, noRaf, () => {}, (c, v, h) => log.push([c, v, h]));
    g.down(1, 0, 0, 0, 48); g.move(1, 0, 30, 10); g.up(1, 20);
    g.down(2, 0, 0, 100, 50); g.down(3, 0, 0, 105, 50); g.up(2, 110); g.up(3, 110);
    g.penStart(); g.penEnd(200);
    g.down(4, 0, 0, 300, 48); g.up(4, 310);
    g.down(5, 0, 0, 1000, 130); g.up(5, 1010);
    g.down(6, 0, 0, 2000, 44); g.up(6, 2010);
    expect(log).toEqual([[48, 'scrolled', 1], [50, 'second contact', 2], [48, 'pen guard', 1], [130, 'palm size', 1], [44, 'tap', 1]]);
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

  // D-048: a resting hand moving to the next line must never scroll (owner feedback, M3).
  describe('palm rejection while writing (D-048)', () => {
    const logged = () => {
      const log: string[] = [];
      const s = sink();
      return { s, log, g: new Gestures(s, false, noRaf, () => {}, (_c, v) => log.push(v)) };
    };
    const slide = (g: Gestures, id: number, from: [number, number], to: [number, number], t0: number, steps = 10, contact = 50) => {
      g.down(id, from[0], from[1], t0, contact);
      for (let i = 1; i <= steps; i++) g.move(id, from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps, t0 + i * 16, contact);
      g.up(id, t0 + steps * 16 + 400); // lifted at rest: no fling
    };

    test('a palm sliding left (and a little down) to the next line does not scroll', () => {
      const { g, s, log } = logged();
      slide(g, 1, [800, 700], [200, 760], 5000);
      expect(s.total).toEqual([0, 0]);
      expect(log).toEqual(['sideways']);
    });

    test('a finger moving up the page scrolls, with no travel lost to the slop', () => {
      const { g, s } = logged();
      slide(g, 1, [400, 900], [400, 500], 5000);
      expect(s.total[1]).toBeCloseTo(-400);
    });

    test('below and right of where the Pencil just was is the writing hand, even moving vertically', () => {
      const { g, s, log } = logged();
      g.penStart(1000); g.penAt(600, 400, 1000); g.penEnd(1000);
      slide(g, 1, [700, 600], [700, 900], 1600); // past the 500 ms guard, inside the hand zone
      expect(s.total).toEqual([0, 0]);
      slide(g, 2, [150, 900], [150, 500], 1800); // the other hand, left of the Pencil: scrolls
      expect(s.total[1]).toBeCloseTo(-400);
      slide(g, 3, [700, 900], [700, 600], 3000); // the zone has expired
      expect(log).toEqual(['hand zone', 'scrolled', 'scrolled']);
    });

    test('a Pencil hovering above the glass keeps its hand zone alive', () => {
      const { g, s } = logged();
      g.penAt(600, 400, 1000); // hover only: never touched
      g.penAt(610, 420, 2400);
      slide(g, 1, [700, 600], [700, 900], 2600);
      expect(s.total).toEqual([0, 0]);
    });

    test('a contact that grows to palm size is undone, back to where it started', () => {
      const { g, s, log } = logged();
      g.down(1, 400, 900, 0, 40);
      g.move(1, 400, 860, 16, 40);
      g.move(1, 400, 820, 32, 40);
      expect(s.total[1]).toBeCloseTo(-80);
      g.move(1, 400, 800, 48, 120); // the hand settles: a palm after all
      expect(s.total[1]).toBeCloseTo(0);
      expect(log).toEqual(['scrolled', 'grew to palm']);
    });

    test('a scroll the Pencil interrupts within 500 ms was the palm landing first: undone', () => {
      const { g, s, log } = logged();
      g.down(1, 400, 900, 0, 50);
      g.move(1, 400, 850, 16, 50);
      g.penStart(200);
      expect(s.total[1]).toBeCloseTo(0);
      expect(log).toEqual(['scrolled', 'pen came down']);
    });
  });
});
