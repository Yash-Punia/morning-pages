# S1 · Ink latency — findings

**Status:** **passed on the owner's verdict (2026-11-14)** after the two rounds below: "everything looks all good". The HUD timing table at the bottom was not captured; the M6 performance pass measures it. From the exported pages: about **213–240 samples/s** (median Δt 4.2–4.7 ms), with pressure and tilt reported. Decisions: D-036 (pipeline), D-037 (canvas sizing), D-008 confirmed.

**Device:** iPad Pro 12.9″ (6th gen, M2) + Apple Pencil 2nd gen (A2051) · iPadOS 26.6 · tested in Chrome for iOS (WebKit)
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

## Round 2 (2026-11-14): ink pipeline

Owner verdict on round 1: "certainly better", **but** there's extra ink where a stroke ends, and it is not as smooth as Apple's Journal ballpoint. The exported page (Chrome for iOS again; 423 strokes, 0 repeated samples, so the round-1 fix holds) showed:
- **The lift-off sample is a jump.** The `pointerup` sample lands 5.5× a normal step away (median 3.9 px, p90 8.2 px), 12 ms late, at pressure 0. Its last segment turns a median 41°. That is the blob/hook at stroke ends.
- **Pressure rises to ~1.4× mid-stroke** over the last ~8 samples before the lift.
- **Position jitter** comes from the 0.5 px quantisation.

What Apple says about its own ink: a PencilKit stroke path is a uniform cubic B-spline (a smooth curve, not a polyline), and Pencil force/angles arrive as estimates refined later. The browser exposes neither, so [`pipeline.ts`](pipeline.ts) rebuilds the nearest equivalent:
1. **1€ filter on position** (Casiez, Roussel, Vogel, CHI 2012). The cutoff rises with speed: slow strokes lose the jitter, fast ones don't lag. Three levels, on the **smooth** button.
2. **Pressure low-pass** (EMA 0.2/sample), so the pre-lift spike doesn't swell the end. Fountain `thinning` lowered from 0.65 to 0.5.
3. **The lift-off sample is never drawn.** At pen-up the filter settles onto the last real sample.
4. **The outline is drawn as quadratic curves through midpoints** instead of straight segments. perfect-freehand's own `streamline` drops to 0.15, since the input is already filtered.

`node ink/pipeline.check.ts <page.json…>` on the owner's two pages:

| | Jitter (RMS 2nd diff) | Ink behind pen (mean) | End gap | Strokes with an end hook > 45° |
| --- | --- | --- | --- | --- |
| Before (page 2) | 0.878 px | — | — | 52% |
| low | 0.305 px | 1.30 px | ≤ 0.10 px | 8% |
| **medium (default)** | **0.284 px** | **1.75 px** | **≤ 0.10 px** | **7%** |
| high | 0.259 px | 2.31 px | ≤ 0.19 px | 5% |

Page 1 (recorded before the round-1 dedupe) shows the same pattern: hooks 56% → 14%. The remaining "hooks" are probably real end curls in the handwriting. A browser smoke test confirms the live page draws, never draws the lift-off jump, and the smooth button cycles. Deployed. **Owner retest: "everything looks all good now." Gate passed.**

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
