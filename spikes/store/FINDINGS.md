# S2 · IndexedDB durability torture — findings

**Status:** **passed on iPad** (2026-11-13). The desktop WebKit checks below are secondary.

## What the page tests

- One IndexedDB transaction per stroke through a serial queue (`chromeTransactionDurability: 'strict'`); a stroke counts as acknowledged only after the transaction resolves.
- The in-flight stroke is mirrored to a recovery record every 250 ms, keyed by the op id assigned at pen-down. Queued recovery writes are dropped when the stroke commits, and the commit transaction deletes the record.
- Every boot replays recovery records **first** (only if `ops.get(id)` is missing), then verifies, then resumes at `maxSeq + 1`.
- **Loss check (two independent signals):**
  - **Ledger:** every seq up to the highest acknowledged one (kept in `localStorage`) must exist.
  - **Gap check:** writes are serial, so any seq below the highest stored seq must exist. This still works if the ledger dies in the same kill.
- **Duplicates:** count of seqs stored more than once. The page counter must equal the number of ops.
- Errors: connection loss → close, reopen, retry with backoff 50/200/1000 ms, then hold in memory and keep retrying. Nothing is dequeued before it commits.

## Secondary checks (Windows, Playwright WebKit, headless) — 2026-11-13

| Run | Reloads | Strokes stored | Lost | Duplicated | Recovery replayed | Commit p50 / p99 |
| --- | --- | --- | --- | --- | --- | --- |
| `npm run torture -- 5 8` | 5 | 42 | 0 | 0 | 0 | 93 / 108 ms |
| `npm run torture -- 30 1` | 30 | 54 | 0 | 0 | 15 | — / 106 ms |
| Browser pane, manual, "Simulate connection loss" | 0 | 34 | 0 | 0 | — | 1 retry after `DatabaseClosedError`, queue drained |
| `npm run torture -- 10 8` (reload after 30–70 acks + 0–250 ms jitter) | 10 | 518 | 0 | 0 | 0 | — / 109 ms |

**Auto mode volume:** reloads now trigger after a random 30–70 acknowledged strokes (~52 per cycle measured), so **200 cycles ≈ 10,400 strokes** at ×8. At ×8 strokes finish inside 250 ms, so recovery replay is exercised by the ×1 runs (manual mode, or `npm run torture -- 30 1`), not by auto mode.

Not exercised headless: "recovery skipped (already committed)", which needs a stale recovery write landing after its commit (rare by design), and real WebKit "connection lost" errors after backgrounding.

## iPad runs (gate) — 2026-11-13

Target: **≥ 10,000 strokes, ≥ 200 interruptions, 0 lost, 0 duplicated, commit p99 < 1 s**.

Device: iPad Pro 12.9″ 6th gen, iPadOS 26.6. Raw JSON: [`results/2026-11-13T16-10-44Z-ipad-auto.json`](results/2026-11-13T16-10-44Z-ipad-auto.json).

| Run | Where | Strokes stored | Reloads / hides | Lost | Dup | Replayed / skipped | Conn-lost errors | Commit p50 / p99 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auto (200 reloads, ×8) | **Chrome for iOS tab** (`CriOS/157`, WebKit) | **10,021** | 200 / 202 | **0** | **0** | 0 / 1 | 0 | **9 / 15 ms** |
| Manual (background, lock, kill) | owner-reported | — | — | 0 | 0 | — | — | — |
| Home Screen app | owner-reported "works correctly" | — | — | — | — | — | — | — |

Notes:
- **The tab run was in Chrome, not Safari.** On iPadOS every browser uses WebKit and the same IndexedDB engine, so the durability result carries over. Safari's own storage policies (such as ITP eviction) aren't covered, but the product runs as the Home Screen app, which owner testing covers.
- **Strict-durability cost on device is tiny.** Commit p99 was 15 ms, against 109 ms headless on Windows and a 1 s budget.
- **Submitted 10,207 vs stored 10,021.** The 186 strokes in between were pen-up but not yet acknowledged when the auto-reload hit. That's correct: unacknowledged strokes don't count as lost. It does show the real exposure window. The page already commits the in-flight stroke on `pagehide` and on `visibilitychange` → hidden (DUR-3). But a reload or kill can land before that transaction finishes, about 10–15 ms. A stroke shorter than 250 ms has no recovery record yet, so an i-dot or t-cross killed in that window is lost. **Carried into M3.8 (D-017):** make the first recovery write at the stroke's first sample, then every 250 ms. A `localStorage` fallback was rejected, because DUR-8 forbids it.
- **"Recovery skipped (already committed)" happened once.** That's the stale-recovery path headless runs never hit, now exercised on device.
- **No real connection-lost errors** in 200 reloads.

How: open `/store/`, tap **Start auto** or **Start manual**, and tap **Save results** at the end (lands in `spikes/store/results/` on the dev server). For the Home Screen runs, use the Vercel preview, since an installed app can't trust the LAN dev certificate.

## Conclusions and decision updates

**Durability gate: passed.** 10,021 strokes, 200 interruptions, 0 lost, 0 duplicated, p99 15 ms.
- **D-017 confirmed:** keep the recovery record, and the replay-only-if-missing check, since the skip path did fire on device.
- **D-021 confirmed as a safety net:** iPadOS raised no connection-lost errors in this run, but reopen-and-retry costs little and stays.
- **Strict durability stays on:** at 15 ms p99 it costs almost nothing.
