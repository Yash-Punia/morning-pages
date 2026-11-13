# S2b · Point codec size — findings

**Status:** codec and simplifier verified by `node store/codec.check.ts`; **real-page measurements pending owner**.

## What is measured

TDD §7.3 codec (zigzag LEB128 deltas, x/y quantised to 1/16 page unit, pressure 8 bit, altitude 6 bit, azimuth 8 bit with wraparound, dt in ms) after RDP simplification with a pressure guard (0.03). Page units: page width = 1000.

Verified by the self-check (200 random strokes): position error ≤ 1/32 unit, pressure ≤ 1/510, altitude ≤ π/252, azimuth ≤ π/256 (wraps), time ≤ 1 ms with no drift; RDP keeps endpoints and pressure spikes.

Sanity probe: a smooth curve sampled every 0.3 units (Pencil-like at 240 Hz) shrinks from 600 to 29 points at ε 0.15. Synthetic test strokes with points ~3.7 units apart on tight loops keep every point, so **only real Pencil pages give a meaningful number**.

## How to run

1. In S1 (`/ink/`), write at least 3 dense pages of real handwriting and tap **Export page** after each. On the dev server they land in `spikes/samples/`, which is **gitignored** (the repo is public; these are your real pages).
2. Open `/store/codec.html` on the dev server; samples load automatically. On the PC this works at `http://localhost:5174/store/codec.html` too.
3. Compare the raw (grey) and decoded (ink) overlay at each ε and pick the largest ε that is visually identical.

## Results — pending owner

| Sample | Raw points | ε | Points kept | KB / page | B / raw point | Under 150 KB? |
| --- | --- | --- | --- | --- | --- | --- |
| page 1 | | | | | | |
| page 2 | | | | | | |
| page 3 | | | | | | |

**Chosen ε:** _pending_ (TDD default 0.15). Update D-006 with the measured bytes/page.
