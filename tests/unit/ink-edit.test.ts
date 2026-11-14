import { describe, expect, test } from 'vitest';
import { hits } from '../../src/ink/hit.ts';
import { fold, InkDoc } from '../../src/ink/page.ts';
import type { Pt, StrokeOp } from '../../src/ink/types.ts';

const line = (x0: number, x1: number, y: number): Pt[] => Array.from({ length: 30 }, (_, i) => [x0 + ((x1 - x0) * i) / 29, y, 0.5, 1, 0, i * 4]);
const visibleIds = (doc: InkDoc) => [...doc.strokes()].map((s) => s.id).sort();
const foldIds = (doc: InkDoc) => [...fold(doc.ops).keys()].sort();

describe('hit-test (TDD 5.6)', () => {
  const doc = new InkDoc('blank');
  const thin = doc.addStroke(line(100, 300, 200), 'ballpoint', 'black', 2.8);
  const thick = doc.addStroke(line(100, 300, 400), 'fountain', 'black', 8);

  test('a thin ballpoint line is hit on it and just beside it, not further away', () => {
    expect(hits(thin, 200, 200, 4)).toBe(true);
    expect(hits(thin, 200, 205, 4)).toBe(true); // within the eraser radius of the edge
    expect(hits(thin, 200, 220, 4)).toBe(false);
    expect(hits(thin, 350, 200, 4)).toBe(false); // past the end
  });

  test('inside a wide stroke counts even with a tiny eraser', () => {
    expect(hits(thick, 200, 401, 0.5)).toBe(true);
  });

  test('only the strokes under the eraser are hit when strokes overlap nearby', () => {
    const d = new InkDoc('blank');
    const a = d.addStroke(line(100, 300, 200), 'ballpoint', 'black', 2.8);
    d.addStroke(line(100, 300, 230), 'ballpoint', 'black', 2.8);
    const crossing = d.addStroke(Array.from({ length: 30 }, (_, i): Pt => [200, 150 + i * 4, 0.5, 1, 0, i * 4]), 'ballpoint', 'black', 2.8);
    const got = d.hitTest(150, 200, 5, hits).map((s: StrokeOp) => s.id);
    expect(got).toEqual([a.id]);
    expect(d.hitTest(200, 200, 5, hits).map((s) => s.id).sort()).toEqual([a.id, crossing.id].sort());
  });
});

describe('erase, undo and redo only ever append (DUR-2)', () => {
  test('the visible set always equals the fold of the op log', () => {
    const doc = new InkDoc('blank');
    const a = doc.addStroke(line(0, 100, 200), 'fountain', 'black', 5);
    const b = doc.addStroke(line(0, 100, 300), 'fountain', 'black', 5);
    const steps: [string, () => void, string[]][] = [
      ['erase a', () => doc.erase([a.id]), [b.id]],
      ['undo erase', () => doc.undo(), [a.id, b.id]],
      ['undo b', () => doc.undo(), [a.id]],
      ['redo b', () => doc.redo(), [a.id, b.id]],
      ['redo erase', () => doc.redo(), [b.id]],
      ['undo, undo, undo', () => { doc.undo(); doc.undo(); doc.undo(); }, []],
      ['redo all', () => { doc.redo(); doc.redo(); doc.redo(); }, [b.id]],
    ];
    const opsBefore = doc.ops.length;
    for (const [, act, expected] of steps) {
      act();
      expect(visibleIds(doc), 'visible').toEqual(expected.sort());
      expect(foldIds(doc), 'fold').toEqual(expected.sort());
    }
    expect(doc.ops.length).toBeGreaterThan(opsBefore); // every step appended
    expect(doc.ops.filter((o) => o.kind === 'stroke')).toHaveLength(2); // no stroke was ever removed
  });

  test('a new stroke clears redo; erasing nothing records nothing', () => {
    const doc = new InkDoc('blank');
    doc.addStroke(line(0, 100, 200), 'fountain', 'black', 5);
    doc.undo();
    expect(doc.canRedo).toBe(true);
    doc.addStroke(line(0, 100, 300), 'fountain', 'black', 5);
    expect(doc.canRedo).toBe(false);
    const n = doc.ops.length;
    doc.erase(['no-such-id']);
    expect(doc.ops.length).toBe(n);
  });
});
