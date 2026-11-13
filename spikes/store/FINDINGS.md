# S2 · IndexedDB durability torture — findings

**Status:** secondary (desktop WebKit) checks pass; **iPad runs pending owner**. The gate is the iPad result.

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

Not exercised headless: "recovery skipped (already committed)", which needs a stale recovery write landing after its commit (rare by design), and real WebKit "connection lost" errors after backgrounding.

## iPad runs (gate) — pending owner

Target: **≥ 10,000 strokes, ≥ 200 interruptions, 0 lost, 0 duplicated, commit p99 < 1 s**, in both a Safari tab and the installed Home Screen app.

| Run | Where | Strokes | Reloads / hides / kills | Lost | Dup | Replayed / skipped | Conn-lost errors | Commit p99 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auto (200 reloads, ×4) | Safari tab | | | | | | | |
| Auto (200 reloads, ×4) | Home Screen app | | | | | | | |
| Manual: ~20 background, ~20 lock, ~20 kill from app switcher | Safari tab | | | | | | | |
| Manual: same | Home Screen app | | | | | | | |

How: open `/store/`, tap **Start auto** or **Start manual**, and tap **Save results** at the end (lands in `spikes/store/results/` on the dev server). For the Home Screen runs, use the Vercel preview, since an installed app can't trust the LAN dev certificate.

## Conclusions and decision updates

_pending: confirm D-017 (recovery record in MVP) and D-021 (reopen and retry). Record whether iPadOS ever raised real connection-lost errors, and the strict-durability commit cost on device._
