import { expect, test } from 'vitest';
import { columnLines, CORNELL, dots, GRID, HEADER, RULING, ruleLines } from '../../src/ink/paper.ts';
import { A5_HEIGHT, PAGE_WIDTH } from '../../src/ink/types.ts';

const spacing = (ys: number[]) => ys.slice(1).map((y, i) => +(y - ys[i]!).toFixed(6));

test('lined papers rule at real stationery spacings below the date band', () => {
  expect(RULING['lined-narrow']).toBeCloseTo(42.9, 1); // 6.35 mm on an A5 page of 1000 units
  expect(RULING['lined-college']).toBeCloseTo(48.0, 1); // 7.1 mm
  expect(RULING['lined-wide']).toBeCloseTo(58.8, 1); // 8.7 mm
  for (const style of ['lined-narrow', 'lined-college', 'lined-wide'] as const) {
    const ys = ruleLines(style);
    expect(ys[0]).toBeCloseTo(HEADER + RULING[style]);
    expect(new Set(spacing(ys)).size).toBe(1); // evenly spaced
    expect(ys.at(-1)!).toBeLessThanOrEqual(A5_HEIGHT);
  }
  expect(ruleLines('lined-college').length).toBeGreaterThan(ruleLines('lined-wide').length);
});

test('blank and dotted have no rules; dotted has a 5 mm dot grid', () => {
  expect(ruleLines('blank')).toEqual([]);
  expect(ruleLines('dotted')).toEqual([]);
  const d = dots();
  expect(d[0]).toEqual([GRID, HEADER + GRID]);
  expect(d.every(([x, y]) => x > 0 && x < PAGE_WIDTH && y > HEADER && y <= A5_HEIGHT)).toBe(true);
});

test('grid rules both ways at 5 mm', () => {
  expect(ruleLines('grid')[0]).toBeCloseTo(HEADER + GRID);
  expect(columnLines('grid')[0]).toBeCloseTo(GRID);
  expect(new Set(spacing(columnLines('grid'))).size).toBe(1);
});

test('Cornell has a cue column and a summary area', () => {
  expect(columnLines('cornell')).toEqual([CORNELL.cue]);
  expect(CORNELL.cue).toBe(300);
  expect(CORNELL.summary).toBeLessThan(A5_HEIGHT);
});
