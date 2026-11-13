# S2b · Point codec size — findings

**Status:** **passed.** A dense real page is 84 KB at ε 0.15, against the 150 KB budget.

## What is measured

TDD §7.3 codec (zigzag LEB128 deltas, x/y quantised to 1/16 page unit, pressure 8 bit, altitude 6 bit, azimuth 8 bit with wraparound, dt in ms) after RDP simplification with a pressure guard (0.03). Page units: page width = 1000.

Verified by the self-check (200 random strokes): position error ≤ 1/32 unit, pressure ≤ 1/510, altitude ≤ π/252, azimuth ≤ π/256 (wraps), time ≤ 1 ms with no drift; RDP keeps endpoints and pressure spikes.

Sanity probe: a smooth curve sampled every 0.3 units (Pencil-like at 240 Hz) shrinks from 600 to 29 points at ε 0.15. Synthetic test strokes with points ~3.7 units apart on tight loops keep every point, so **only real Pencil pages give a meaningful number**.

## How to run

1. In S1 (`/ink/`), write at least 3 dense pages of real handwriting and tap **Export page** after each. On the dev server they land in `spikes/samples/`, which is **gitignored** (the repo is public; these are your real pages).
2. Open `/store/codec.html` on the dev server; samples load automatically. On the PC this works at `http://localhost:5174/store/codec.html` too.
3. Compare the raw (grey) and decoded (ink) overlay at each ε and pick the largest ε that is visually identical.

## Results (2026-11-14, the owner's iPad pages, measured on `/store/codec.html`)

| Sample | Raw points | ε | Points kept | KB / page | B / raw point | Under 150 KB? |
| --- | --- | --- | --- | --- | --- | --- |
| page 2 (clean, 423 strokes) | 24,883 | 0 | 24,883 | 153.1 | 6.30 | no |
| page 2 | 24,883 | 0.1 | 14,469 | 92.5 | 3.81 | yes |
| page 2 | 24,883 | **0.15** | 12,952 | **83.7** | 3.45 | **yes** |
| page 2 | 24,883 | 0.25 | 10,390 | 69.0 | 2.84 | yes |
| page 1 (~23 % repeated samples, before the S1 fix) | 49,151 | 0.15 | 20,869 | 128.0 | 2.67 | yes |

Max quantisation error is 0.044 units and max pressure error 0.002 at every ε. Two pages were measured instead of three: page 2 is a full, dense, real page, and both pages are under budget at ε 0.15. The pages stay in the gitignored `samples/`.

**Chosen ε: 0.15** (the TDD default, about 0.18 CSS px, invisible). D-006 is updated.
