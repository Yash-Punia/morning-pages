# S1 · Ink latency — findings

**Status:** pending owner run. Every result cell below stays blank until measured on the reference device.

**Device:** iPad Pro 12.9″ (6th gen, M2) + Apple Pencil 2nd gen (A2051) · iPadOS: _pending_
**Where:** dev server over LAN HTTPS (`https://<PC-IP>:5173/ink/`) and later the Vercel preview

## How to run

1. Open `/ink/`, write a full page of normal handwriting with the fountain pen, then a page with the ballpoint.
2. After each page tap **Save results**. On the dev server the JSON lands in `spikes/ink/results/`.
3. Toggle **predicted** off and write a few lines, then **coalesced** off; note whether you can feel the difference.
4. Tap **Export page** for each dense page you write. These become the S2b samples (`spikes/samples/`) and later S4 inputs.

## Results

| Measure | Budget | Fountain | Ballpoint |
| --- | --- | --- | --- |
| rAF Hz (measured median) | 120 expected; 60 if WebKit still caps rAF | | |
| Samples/s during a stroke | ≥ 200 | | |
| `getCoalescedEvents` / `getPredictedEvents` supported | yes / yes | | |
| App work per frame p50 / p95 (handler + outline + fill) | ≤ 8 ms at 120 Hz | | |
| Pen-down → first ink (event timestamp → drawn) | ≤ 1–2 frames | | |
| Event → drawn p50 | — (includes frame wait) | | |
| Outline + fill max, longest stroke | watch for growth with length | | |
| Dropped frames (> 1.5× median delta) | < 1 % | | |
| Pressure / tilt reported | yes / yes | | |

## Feel (owner verdict)

- Fountain pen feels like paper? _pending_
- Ballpoint? _pending_
- Predicted tail on vs off: _pending_
- Coalesced on vs off: _pending_
- Hover nib preview shows before contact? _pending_

## Conclusions and decision updates

_pending: confirm or amend D-008 (Canvas 2D), the TDD §5.7 frame budget if rAF runs at 60 Hz, and whether long strokes need prefix freezing (TDD §5.4)._
