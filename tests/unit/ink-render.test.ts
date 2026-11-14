import { describe, expect, test } from 'vitest';
import { fold, InkDoc } from '../../src/ink/page.ts';
import { PIXEL_BUDGET, TILE, TILE_PX, TileCache, tileBox, tileRes, type AnyCanvas } from '../../src/ink/renderer.ts';
import { A5_HEIGHT, PAGE_GAP, type Op, type Pt } from '../../src/ink/types.ts';

const fakeCanvas = (w: number, h: number) => ({ width: w, height: h, getContext: () => ({ setTransform() {} }) }) as unknown as AnyCanvas;

describe('tile resolution', () => {
  test('is the next power of two at or above the device scale, so tiles only ever downsample', () => {
    expect(tileRes(2)).toBe(2); // reference iPad at zoom 1 (D-040)
    expect(tileRes(2.05)).toBe(4);
    expect(tileRes(1.5)).toBe(2);
    expect(tileRes(0.6)).toBe(1);
    expect(tileRes(100)).toBe(8);
    expect(tileRes(0.01)).toBe(0.25);
  });
});

describe('TileCache', () => {
  test('never exceeds the pixel budget (24 tiles at 2×) and zeroes evicted tiles', () => {
    const cache = new TileCache(PIXEL_BUDGET, fakeCanvas);
    const made: { canvas: AnyCanvas }[] = [];
    for (let i = 0; i < 40; i++) made.push(cache.get(0, i, 2, () => {}));
    expect(cache.size).toBe(24);
    expect(cache.usedPixels).toBeLessThanOrEqual(PIXEL_BUDGET);
    expect(made[0]!.canvas.width).toBe(0); // the least recently used went first
    expect(made[39]!.canvas.width).toBe(TILE_PX);
  });

  test('every tile is the same bitmap size; zooming in makes tiles cover fewer units (D-040)', () => {
    const cache = new TileCache(PIXEL_BUDGET, fakeCanvas);
    for (const res of [1, 2, 4, 8]) expect(cache.get(0, 0, res, () => {}).canvas.width).toBe(TILE_PX);
    expect(tileBox(1, 0, 2)).toEqual([TILE, 0, 2 * TILE, TILE]); // 512 units at the reference 2 px/unit
    expect(tileBox(0, 1, 8)).toEqual([0, 128, 128, 256]);
  });

  test('a hit refreshes recency and does not repaint', () => {
    const cache = new TileCache(3 * TILE_PX ** 2, fakeCanvas);
    let paints = 0;
    const paint = () => { paints++; };
    const a = cache.get(0, 0, 2, paint);
    cache.get(0, 1, 2, paint);
    cache.get(0, 2, 2, paint);
    cache.get(0, 0, 2, paint); // touch a
    cache.get(0, 3, 2, paint); // evicts (0,1), not a
    expect(paints).toBe(4);
    expect(a.canvas.width).toBe(TILE_PX);
  });
});

describe('InkDoc and fold', () => {
  const pts = (y: number): Pt[] => [[100, y, 0.5, 1, 0, 0], [140, y, 0.5, 1, 0, 8]];

  test('a stroke belongs to the page it started on and is stored page-local', () => {
    const doc = new InkDoc('lined-college');
    doc.addPage();
    const top2 = A5_HEIGHT + PAGE_GAP;
    const op = doc.addStroke(pts(top2 + 300), 'fountain', 'blueBlack', 5);
    expect(op.pageId).toBe(doc.pages[1]!.id);
    expect(op.pts[0]![1]).toBeCloseTo(300);
    expect(doc.docBox(op)[1]).toBeCloseTo(top2 + 300 - 7.5);
  });

  test('seq counts per page', () => {
    const doc = new InkDoc('blank');
    doc.addPage();
    const a = doc.addStroke(pts(100), 'fountain', 'black', 5);
    const b = doc.addStroke(pts(A5_HEIGHT + PAGE_GAP + 100), 'fountain', 'black', 5);
    const c = doc.addStroke(pts(200), 'fountain', 'black', 5);
    expect([a.seq, b.seq, c.seq]).toEqual([1, 1, 2]);
  });

  test('fold applies erase and restore in order', () => {
    const s = (id: string, seq: number): Op => ({ kind: 'stroke', id, pageId: 'p', seq, createdAt: seq, tool: 'fountain', color: 'black', size: 5, pts: [], bbox: [0, 0, 1, 1] });
    const e = (kind: 'erase' | 'restore', seq: number, targets: string[]): Op => ({ kind, id: `${kind}${seq}`, pageId: 'p', seq, createdAt: seq, targets });
    expect([...fold([s('a', 1), s('b', 2), e('erase', 3, ['a'])]).keys()]).toEqual(['b']);
    expect([...fold([s('a', 1), e('erase', 2, ['a']), e('restore', 3, ['a'])]).keys()]).toEqual(['a']);
    expect([...fold([e('restore', 3, ['a']), s('a', 1), e('erase', 2, ['a'])]).keys()]).toEqual(['a']); // order by seq, not array
  });
});
