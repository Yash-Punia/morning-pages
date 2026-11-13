# S1 · Ink latency — findings

**Status:** pending owner run. Every result cell below stays blank until measured on the reference device.

**Device:** iPad Pro 12.9″ (6th gen, M2) + Apple Pencil 2nd gen (A2051) · iPadOS: _pending_
**Where:** dev server over LAN HTTPS (`https://<PC-IP>:5173/ink/`) and later the Vercel preview

## How to run

1. Open `/ink/`, write a full page of normal handwriting with the fountain pen, then a page with the ballpoint.
2. After each page tap **Save results**. On the dev server the JSON lands in `spikes/ink/results/`.
3. Toggle **predicted** off and write a few lines, then **coalesced** off; note whether you can feel the difference.
4. Tap **Export page** for each dense page you write. These become the S2b samples (`spikes/samples/`) and later S4 inputs.

## Round 1 (2026-11-13): owner report and fixes

Owner ran `/ink/` in **Chrome for iOS** (`CriOS/157`, WebKit, iPadOS 26.6). Viewport 1192×1458 @2x. Verdict: **not paper-like.** Ink is offset from the nib on hover and on contact, and it is rough, with visible aliasing next to Apple's Journal app. The exported page (298 strokes, 49,151 samples) showed three causes:

| Cause | Evidence | Fix |
| --- | --- | --- |
| **Repeated samples.** `getCoalescedEvents` repeats the previous batch's tail, so the stroke steps back on itself | 11,541 samples go back in time and 11,287 repeat a timestamp (~23%). Per-sample Δt runs 4, 4, −4, 4 ms | Keep only samples newer than the last one kept, predicted ones included. The HUD shows "repeated samples dropped" |
| **Stretched canvas.** CSS size `100vh` vs backing size `innerHeight`. On iOS, `100vh` is the height without toolbars, so the canvas was scaled vertically: offset growing down the page, plus resampling blur | Code review; the iPad toolbars make the two differ | Canvas `width/height: 100%` of the fixed box. Backing pixels and pointer origin come from `getBoundingClientRect()`, re-measured with `ResizeObserver`. The HUD shows viewport vs canvas box vs backing |
| **Coordinates quantised to 0.5 CSS px** (1 device px) | All x/y values end in .0 or .5 | Can't be fixed at the source. Smoothing absorbs it: the **smooth** button (streamline 0.35 / 0.5 / 0.65, default raised to 0.5) lets the owner pick on device |

Checked in the desktop browser: a synthetic pen stroke, with batches repeating the previous tail, is drawn exactly on the pointer line, with nothing 6 px either side, and 81 repeats were dropped. Deployed to the stable URL.

**Retest in Safari** (the product target; Chrome adds its own toolbars), at `https://morning-pages-spikes.vercel.app/ink/` or on the LAN dev server.

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

## S1b · iOS suppression and palm checklist

Run with **palm guard on**, then repeat the starred rows with it **off** to see what the guard buys. Save results after each run (the HUD counts pans started, pans cancelled by the pen, and touches ignored).

| Check | Result |
| --- | --- |
| Palm resting on the glass while writing leaves no marks | _pending_ |
| Palm resting does not scroll the page while writing ★ | _pending_ |
| Palm lands *before* the Pencil: page does not jump ★ | _pending_ |
| Long-press with the Pencil shows no selection loupe or callout | _pending_ |
| Double-tap (finger or Pencil) does not zoom | _pending_ |
| No Scribble text-insertion overlay appears | _pending_ |
| Stroke near the screen edge is not stolen by system gestures | _pending_ |
| One finger scrolls the page smoothly when the Pencil is idle | _pending_ |
| Fast 5-minute scribble session: no stray marks, no system UI | _pending_ |

## Conclusions and decision updates

_pending: confirm or amend D-008 (Canvas 2D), the TDD §5.7 frame budget if rAF runs at 60 Hz, and whether long strokes need prefix freezing (TDD §5.4)._
