# Morning Pages — Milestones

Companion to the [PRD](./Morning%20Pages%20—%20Journal%20Web%20App%20PRD.md) (what), [TDD.md](./TDD.md) (how) and [Decisions.md](./Decisions.md) (why). Phases follow PRD §13: **Phase 0 Spikes → MVP (P0) → v1 (P1) → v2 (P2) → Later (P3)**. Each phase ends with the PRD's exit gate, and the next phase does not start until the gate is passed.

## How we work

- **One branch per milestone:** `m2-ink-core`, `m5-backup`, …
- **One commit per feature.** Every row in the tables below is exactly one commit, using the Conventional Commit message shown. If a feature needs a fix after it lands, that is a separate `fix:` commit, not an amend.
- **One PR per milestone** into `main`. CI must pass (TDD §13.1), then the Vercel Preview is tested on the iPad with test data, then merge → Production.
- **Definition of done for a feature commit:**
  1. Its acceptance check ("Done when") passes, with a test where the TDD names one.
  2. `svelte-check`, `vitest` and the Playwright WebKit suite are green.
  3. Any choice not already in the TDD is logged in [Decisions.md](./Decisions.md).
- **Analytics travel with their feature.** If TDD §9.4 lists an event for a feature, the feature's commit fires it and extends the allowlist test. No separate analytics commits are needed except the rows listed below.
- **Reference device** for every "on device" check: iPad Pro 12.9″ (6th gen) + Apple Pencil 2nd gen (A2051).
- **UI milestones** (marked 🎨) start with `/impeccable shape` for their screens and end with `/impeccable critique` → `audit` → `polish` (TDD §12.2). The polish pass is its own final commit.
- Requirement IDs refer to the PRD.

---

## Phase 0 — Spikes

Throwaway prototypes in `spikes/` (committed for the record, never shipped). Each spike ends with a short findings note in `spikes/<name>/FINDINGS.md` and any resulting decision in Decisions.md.

### M0 · Spikes · branch `m0-spikes`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 0.1 | Repo scaffold for spikes (Vite + TS, `spikes/` folder, HTTPS dev server) | — | `chore: scaffold spikes workspace` | `npm run dev -- --host` opens over HTTPS on the iPad |
| 0.2 | **S1 Ink latency:** pen-only canvas, coalesced + predicted events, `perfect-freehand`, live layer, sample-rate + frame HUD | PEN-1…6, INK-1…3 | `spike(ink): pencil latency prototype with coalesced and predicted events` | Owner writes a page and says it feels like paper; HUD shows ≥ 200 Hz samples and < 1 % dropped frames on the reference iPad |
| 0.3 | **S1b iOS suppression:** loupe, callout, double-tap zoom, Scribble, palm resting | PEN-2 | `spike(ink): suppress iOS selection and zoom on canvas` | 5-minute scribble session with palm resting produces no stray marks or system UI |
| 0.4 | **S2 Durability torture:** per-stroke IDB transactions, recovery record, reload/close/cancel mid-stroke loop | DUR-1…4 | `spike(store): indexeddb stroke durability torture test` | 10,000 strokes across 200 forced interruptions, zero lost |
| 0.5 | **S2b Codec size:** point codec + RDP on real handwritten pages | §12.1 storage | `spike(store): measure point codec size on real pages` | Dense real page < 150 KB; numbers recorded in FINDINGS |
| 0.6 | **S3 Install + persist + headers:** deploy spike to Vercel preview with the TDD `vercel.json` and preview protection off (D-026), install to Home Screen, log `persist()` / `estimate()` / standalone detection | STO-1, STO-3, PRI-2 | `spike(pwa): home screen install, persist and csp on vercel` | Installed preview loads manifest and icons; Home Screen label "Morning Pages" is not truncated (else use "Morning"); reports standalone; persist result recorded; zero CSP violations; Toolbar absent |
| 0.7 | **Close-out:** findings into Decisions.md; S4 moved to M13 as 13.0 (D-035) | — | `docs: record m0 spike findings and decisions` | Decisions updated; PR opened |

**🚦 Gate (PRD §13 Phase 0):** ink feels like paper to the owner; zero lost strokes in torture tests.

**Gate result (2026-11-14): passed.**
- **Ink:** passed on the owner's verdict, after two rounds of fixes: 1:1 mapping, repeated-sample dedupe, the 1€ pipeline, and no lift-off hook (D-036, D-037). The HUD latency numbers were not captured.
- **Durability:** passed on iPad. 10,021 strokes across 200 reloads: 0 lost, 0 duplicated, commit p99 15 ms. The owner also reports the manual interruption runs and the Home Screen app as passing.
- **Codec:** a dense page is 84 KB at ε 0.15.
- **Not checked on device:** `persist()` in the installed app, the Airplane Mode reopen, and Safari as opposed to Chrome for iOS. These carry into M1.6 and M3.9.

---

## MVP (P0)

### M1 · Foundation · branch `m1-foundation`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 1.1 | Vite + Svelte 5 + TS strict app, npm lockfile, `engines` pinned | §11.1 | `chore: scaffold svelte 5 vite app` | `npm run build` produces `dist/` |
| 1.2 | Vitest + `fake-indexeddb`, Playwright WebKit project | §12.3 | `test: add vitest and playwright webkit harness` | One passing test in each |
| 1.3 | GitHub Actions CI: check, build, e2e, headers jobs | §12.3 | `ci: add github actions pipeline` | CI green on PR |
| 1.4 | Bundle-size budget + no-inline-script check | §12.1 | `ci: enforce 400kb launch bundle and no inline scripts` | CI fails when budget exceeded |
| 1.5 | `vercel.json` (CSP, security headers, rewrites, caching) + Vercel project linked, Toolbar off, Analytics off | PRI-1, PRI-2, PRI-3 | `build: add vercel config with strict csp` | Preview serves exact headers; zero console CSP violations |
| 1.6 | PWA: manifest, iOS meta, icons + splash generated, `vite-plugin-pwa` prompt mode with bundled registration | PRI-4 | `feat(pwa): add manifest, ios meta and offline service worker` | Installed app opens in Airplane Mode; no inline script in `dist/index.html` |
| 1.7 | Install Impeccable, run `/impeccable init` → `PRODUCT.md`, `DESIGN.md` seeded from PRD §10.3 | §10.3 | `docs(design): add impeccable product and design context` | Both files committed; `.claude/` skill committed |
| 1.8 | Design tokens, themes (Paper, Night), self-hosted fonts | §10.3, §6.4 | `feat(ui): add design tokens, themes and bundled fonts` | Contrast test passes for both themes; no third-party font request |
| 1.9 | Impeccable detector in CI (warning mode) | — | `ci: run impeccable detect on src` | PR shows detector annotations |
| 1.10 | Router + app layout (sidebar / tab bar), View Transitions, `/diagnostics` skeleton | §10.1 | `feat(shell): add router, layout and diagnostics route` | All MVP routes reachable; layout works at 320 px |
| 1.11 | Umami site created (free Hobby); `analytics/` module: allowlist schema, `sanitize()`, production-host guard, opt-out flag, route-template page views, `app_open`, `install_detected`, `launch_perf`; CSP `connect-src` updated | TDD §9.4 | `feat(analytics): anonymous usage events via umami` | Events visible in Umami from the production host only; schema unit test passes; cross-origin `keepalive` POST works on iPad Safari (else drop `keepalive`) |

**M1 result (2026-11-14):**
- **CI:** all six jobs green on PR #2.
- **iPad (owner):** the installed PR preview shows the "Morning Pages" label and icon and reopens in Airplane Mode.
- **Umami:** the website was created and `VITE_UMAMI_WEBSITE_ID` is set for Production only.
- **Not yet checked:** events arriving in Umami and the iPad `keepalive` POST. Both can only be checked after the merge deploys to `morning-pages-rose.vercel.app` (D-039).

### M2 · Ink core 🎨 · branch `m2-ink-core`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 2.1 | Input module: pen-only, coalesced, predicted, pressure/tilt, pointer capture, cancel handling; drop repeated coalesced samples and the lift-off sample (D-036) | PEN-1, 3, 4, 5, 6, 9 | `feat(ink): pointer input with coalesced and predicted samples` | Unit tests on sample normalisation, including repeated and backwards timestamps; S1 behaviour reproduced |
| 2.2 | Canvas iOS suppression (touch-action, callout, loupe, double-tap) | PEN-2 | `feat(ink): suppress ios gestures on writing surface` | Manual palm/scribble checklist passes |
| 2.3 | Viewport: page space, custom pan with inertia, pinch zoom | PEN-7 | `feat(ink): page-space viewport with pan and pinch zoom` | One finger scrolls, two fingers zoom, no ink from fingers |
| 2.4 | Stroke builder: 1€ position filter, pressure low-pass, settle-on-lift, curved outline (D-036, ported from `spikes/ink/pipeline.ts`); fountain pen and ballpoint presets; smoothing level setting (default medium) | INK-2, tools | `feat(ink): fountain pen and ballpoint strokes` | Visual check against S1 round 2; on the owner's local pages, end hooks ≤ 10 % and jitter ≤ 0.3 px (the `pipeline.check` metrics); outlines taper |
| 2.5 | Live layer + tiled committed layer with LRU cap; canvas sized from its own box (D-037) | INK-1, 3, 5 | `feat(ink): live layer and tiled committed rendering` | 50-page synthetic entry scrolls without dropped frames; ink lands under the nib with toolbars shown or hidden |
| 2.6 | Paper styles: blank, lined (3), dotted, grid, Cornell; date header | §4.4 P0 | `feat(ink): paper styles and date header` | All styles render crisp at 1×/2×/4× |
| 2.7 | Continuous scroll pages, auto-append page on last page | §4.4 | `feat(ink): continuous scroll with auto-appended pages` | Writing on last page creates the next one |
| 2.8 | Stroke eraser | tools P0 | `feat(ink): stroke eraser` | Erases whole strokes by hit-test |
| 2.9 | Undo/redo (unlimited), 2-/3-finger tap, ⌘Z / ⇧⌘Z | tools P0, §10.2 | `feat(ink): undo and redo with gestures and shortcuts` | Undo/redo restore exact state |
| 2.10 | Floating toolbar pill: dock left/right/top, collapse to dot, 4 presets, curated palette + 3 custom | tools P0, §4.3 | `feat(ink): floating toolbar with presets and palette` | Never covers the writing line; Pencil taps only act on toolbar |
| 2.11 | Hover nib preview | PEN-8 | `feat(ink): apple pencil hover nib preview` | Ghost nib shows on hover-capable iPad |
| 2.12 | "Draw with finger" setting | PEN-7 | `feat(ink): optional finger drawing` | Finger draws when on; off by default |
| 2.13 | Impeccable critique → audit → polish on canvas chrome | §10 | `style(ink): impeccable polish pass on writing screen` | Audit has no high-severity findings |

### M3 · Durable store · branch `m3-durable-store`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 3.1 | Dexie schema v1 (all stores), records, repositories | §5.1 | `feat(store): dexie schema and repositories` | Unit tests for every repository |
| 3.2 | Point codec + RDP simplify (ε 0.15, D-006) with fixtures. Store **raw** samples; smoothing is applied at render (D-036) | INK-4, §12.1 | `feat(store): compact point codec with simplification` | Round-trip tests; synthetic dense fixture < 150 KB (the owner's real pages stay local, since the repo is public) |
| 3.3 | Serial write queue, strict durability, saved dot after `complete` | DUR-1, DUR-2 | `feat(store): serial write queue with durability callback` | Dot only after commit (test with delayed commit) |
| 3.4 | Today entry created on first stroke (entry + page + op in one txn) | ENT-1 | `feat(store): create today entry atomically on first stroke` | No empty entries after open/close without writing |
| 3.5 | Op log fold: erase/restore ops, undo writes ops | DUR-2 | `feat(store): append-only op log with erase and restore` | Reload reproduces exact visible strokes |
| 3.6 | Error classification: reconnect-and-retry, quota hold, emergency export | STO-4, DUR-1 | `feat(store): recover from connection loss and quota errors` | Simulated errors lose zero strokes |
| 3.7 | Flush on `visibilitychange` / `pagehide` | DUR-3 | `feat(store): flush strokes on hide and pagehide` | Torture test: background mid-stroke keeps stroke |
| 3.8 | Recovery record (pulled from P1, D-017); first write at the first sample, then every 250 ms, so short strokes are covered too | DUR-4 | `feat(store): crash recovery for in-flight strokes` | Kill mid-stroke → stroke restored on next launch; replay after a successful commit produces no duplicate; a stroke under 250 ms killed at pen-up is restored |
| 3.9 | `persist()` loop + `estimate()` + 80 % warning | STO-3, STO-4 | `feat(store): request persistent storage and track quota` | Status visible in diagnostics |
| 3.10 | Migration harness: dynamic-mode open, pre-migration backup hook, fixture tests | DUR-6 | `feat(store): migration harness with pre-migration backup` | Fixture `db-v1` round-trips through a dummy v2 |
| 3.11 | Restore scroll position and tool on reopen | §3 step 7 | `feat(store): resume last position and tool` | Reopen lands on same page, same tool |
| 3.12 | Durability torture suite in CI (Playwright WebKit) | §12.3 | `test(store): durability torture suite` | Runs on every PR, zero lost strokes |
| 3.13 | Durability signals: `save_error`, `persist_status`, `storage_warning` events | TDD §9.4 | `feat(analytics): report save errors and storage status` | Simulated errors emit one event each, with no ids or content |

### M4 · App shell and screens 🎨 · branch `m4-shell`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 4.1 | Onboarding: 3 screens, Add to Home Screen guide, "deleting the icon deletes the journal" | STO-1, §10.1 | `feat(onboarding): first-run flow with home screen guide` | Visitor installs and writes in < 1 min (manual) |
| 4.2 | Trial-mode strip in Safari tabs | STO-1 | `feat(pwa): trial mode indicator outside installed app` | Visible only when not standalone |
| 4.3 | Launch routing: straight to Today, no dialogs | ENT-1, §3 | `feat(shell): open directly to today page` | Cold launch < 1.5 s on reference iPad |
| 4.4 | Multiple entries per day ("+") | ENT-2 | `feat(entries): multiple entries per day` | Two entries same date both listed |
| 4.5 | Library (home): Continue today, calendar strip, banners area | §10.1 | `feat(library): home screen` | Banners appear only here |
| 4.6 | Calendar month grid with thumbnails | MEM-2, ORG-1 | `feat(calendar): month view with entry thumbnails` | Tap day opens entry |
| 4.7 | Thumbnail worker (OffscreenCanvas, JPEG) | §5.1 Page.thumbnail | `feat(workers): background page thumbnails` | Thumbs update after page close |
| 4.8 | Timeline: infinite list, date jump | MEM-3 | `feat(timeline): infinite entry timeline` | 2 years of fixtures scroll smoothly |
| 4.9 | Recently Deleted: soft delete, restore, 30-day purge | ENT-7 | `feat(entries): recently deleted with 30 day purge` | Restore returns entry intact |
| 4.10 | Settings: storage status, paper/pen defaults, theme, finger drawing, "Share anonymous usage stats" toggle | STO-3, §10.1, TDD §9.4 | `feat(settings): storage status, defaults and analytics toggle` | All defaults applied to new pages; toggle off stops all Umami requests |
| 4.11 | Privacy page, including exactly what analytics sends and how to turn it off | PRI-5, PRI-7, TDD §9.4 | `feat(privacy): plain-language privacy page` | Reviewed with `/impeccable clarify`; event list matches `events.ts` |
| 4.12 | Update-available banner (prompt-mode SW, waits for empty queue) | §8.3 | `feat(pwa): user-approved update banner` | Update never applies mid-write |
| 4.13 | Accessibility pass: labels, canvas aria, targets, reduce motion | §10.4 | `feat(a11y): voiceover labels and reduced motion` | axe clean on non-canvas screens |
| 4.14 | `session_end` summary event (minutes, pages, tools, bucketed) | TDD §9.4 | `feat(analytics): writing session summary event` | One event per session; never fires while writing |
| 4.15 | Public-site meta: title, description, Open Graph image | D-032 | `feat(shell): public site metadata` | Shared link shows title and image |
| 4.16 | Impeccable onboard / adapt / critique → audit → polish | §10 | `style(shell): impeccable polish pass on app screens` | Audit has no high-severity findings |

### M5 · Backup and restore 🎨 · branch `m5-backup`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 5.1 | `.morningpages` writer in worker (fflate, manifest, sha-256) | BAK-1 | `feat(backup): build morningpages backup file in worker` | 1-year fixture backs up < 60 s without UI freeze |
| 5.2 | Two-step share sheet delivery + download fallback | BAK-1 | `feat(backup): save backup via share sheet` | Saves to Files on iPad |
| 5.3 | Restore: verify, preview, merge / replace (auto-backup first) | BAK-4 | `feat(backup): restore with preview, merge and replace` | Round-trip deep-equal test passes |
| 5.4 | Backup reminders (default 7 days, 1–30) + last backup date | BAK-2 | `feat(backup): quiet backup reminders` | Banner on Library only |
| 5.5 | Open JSON schema doc (`docs/backup-format.md`) | §7.4 JSON | `docs: document backup file format` | Matches writer; linked from README.txt in zip |
| 5.6 | Backup round-trip test in CI | §12.3 | `test(backup): backup wipe restore round trip` | Runs on every PR |
| 5.7 | Keyboard shortcut ⌘B backup | §10.2 | `feat(backup): keyboard shortcut for backup` | Works with hardware keyboard |

### M6 · MVP hardening and release · branch `m6-mvp-release`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 6.1 | Diagnostics HUD complete (latency, frames, queue p99, log export) | §12.1 | `feat(diagnostics): on-device performance and error hud` | All §12.1 metrics readable on device |
| 6.2 | Network allowlist + content canary e2e test | PRI-1, §12.3, TDD §13.2 | `test(security): network allowlist and content canary` | Fails on any request outside the allowlist or containing the canary; zero Umami requests when opted out |
| 6.3 | Performance pass against budgets on reference iPad | §12.1 | `perf: meet mvp performance budgets` | All P0 budgets met, numbers in PR |
| 6.4 | Impeccable detector → blocking | — | `ci: make impeccable detect blocking` | CI fails on detector errors |
| 6.5 | Production domain set (owner decision), release `v0.1.0` | D-002 | `chore(release): v0.1.0` | Installed on owner's iPad from production domain |

**🚦 Gate (PRD §13 MVP):** 30 consecutive mornings of real use with no data loss and no workaround needed.

---

## v1 (P1)

### M7 · Journals, templates and prompts 🎨 · branch `m7-journals`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 7.1 | Multiple journals: name, colour, cover; move/copy entries | ENT-3 | `feat(journals): multiple journals with covers` | Entries move without losing ops |
| 7.2 | Template overlay engine (printed headings/boxes on paper) | §5.3 | `feat(templates): template overlay engine` | Templates render beneath ink at every zoom |
| 7.3 | Built-in templates: Morning Pages, Five-minute, Prepare, Brain dump, Dream, Weekly review | §5.3 | `feat(templates): built-in morning templates` | Each selectable per entry and as journal default |
| 7.4 | Custom template builder from blocks | §5.3 | `feat(templates): custom template builder` | Saved template reusable |
| 7.5 | Prompt library (~365, packs), prompt of the day, shuffle/dismiss, user packs | §5.3 | `feat(prompts): bundled prompt library and daily prompt` | No network; dismiss with swipe |
| 7.6 | P1 paper: handwriting guide, music staff, kraft/cream tints; paged mode; dark paper with ink inversion | §4.4 | `feat(ink): extra paper styles, paged mode and dark paper` | Pages readable in both themes |

### M8 · Rituals and close-out 🎨 · branch `m8-rituals`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 8.1 | Close-out card: mood, energy, sleep, one word | RIT-6 | `feat(rituals): close-out mood and energy card` | One tap each; saved to entry |
| 8.2 | Morning mode (before 11:00) | RIT-1 | `feat(rituals): morning mode theme` | Auto-applies; can be disabled |
| 8.3 | Page goal edge progress line | RIT-3 | `feat(rituals): page goal progress line` | No pop-ups |
| 8.4 | Focus mode | RIT-4 | `feat(rituals): focus mode` | Hover or 2-finger tap restores chrome |
| 8.5 | Streak with rest-day tokens | INS-1 | `feat(insights): calm streak with rest days` | 2 tokens/month; never shames |
| 8.6 | Personalisation: Linen, Sepia, High Contrast themes; serif/sans; Dynamic Type | §6.4 | `feat(ui): additional themes and type options` | Contrast test passes for all themes |

### M9 · Memories, organisation and search 🎨 · branch `m9-memories-search`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 9.1 | On This Day card | MEM-1 | `feat(memories): on this day card` | Shows same date previous months/years |
| 9.2 | Year in Pixels | MEM-4 | `feat(memories): year in pixels` | Shape + colour; tap opens entry |
| 9.3 | Tags, people, stars; tag manager (rename/merge) | ENT-5, ORG-2 | `feat(entries): tags, people and stars` | Auto-complete works |
| 9.4 | Title (manual) and back/forward-dating | ENT-4, ENT-6 | `feat(entries): titles and back-dating` | Entry moves to chosen date |
| 9.5 | Smart filters | ORG-3 | `feat(search): smart filters` | "Low mood days", "With photos", … |
| 9.6 | Search index worker (MiniSearch, persisted) | SRC-1 | `feat(search): local full-text index` | < 300 ms over 2-year fixture |
| 9.7 | Search screen with combinable filters and highlighted results | SRC-2, SRC-3 | `feat(search): search screen with filters` | Jumps to matched page |
| 9.8 | Keyboard shortcuts ⌘N, ⌘F | §10.2 | `feat(shell): new entry and search shortcuts` | Work with hardware keyboard |

### M10 · Tools, media and history 🎨 · branch `m10-tools-media`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 10.1 | Pencil tool (texture, tilt shading) | tools P1 | `feat(ink): pencil tool with tilt shading` | Tilt visibly shades |
| 10.2 | Highlighter (beneath ink, hold to straighten) | tools P1 | `feat(ink): highlighter tool` | Drawn under ink |
| 10.3 | Partial eraser | tools P0 option | `feat(ink): partial eraser` | Splits strokes into surviving fragments |
| 10.4 | Lasso: move, resize, recolour, copy, delete (transform/style ops) | tools P1 | `feat(ink): lasso selection` | All actions undoable |
| 10.5 | Text block with Scribble; "Convert selection to text" | MED-1, §9.3 | `feat(media): text blocks and convert selection to text` | Scribble works inside box |
| 10.6 | Photos: insert, resize/rotate/crop, compress ≤ 2048 px, dedupe by hash | MED-3 | `feat(media): photos on pages` | Asset stored once per hash |
| 10.7 | Typed-entry mode | MED-2, §10.4 | `feat(entries): distraction-free typed entries` | Shares timeline with ink entries |
| 10.8 | Page thumbnails strip: reorder, duplicate, delete pages | ENT-9 | `feat(entries): page strip with reorder` | Undoable |
| 10.9 | Version history via seq high-water marks | ENT-8 | `feat(entries): version history and restore` | Restore is itself undoable |

### M11 · Export and durability extras · branch `m11-export`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 11.1 | PDF export (vector, A5/A4, date headers) | §7.4 | `feat(export): pdf export` | Print-ready, crisp ink |
| 11.2 | PNG / SVG page export | §7.4 | `feat(export): png and svg page export` | Matches screen |
| 11.3 | Nightly self-check worker | DUR-5 | `feat(store): nightly integrity self-check` | Mismatch logged and surfaced |
| 11.4 | Multi-tab single-writer via Web Locks | DUR-7 | `feat(store): single writer per entry with web locks` | Second tab opens read-only |
| 11.5 | Trial-mode → installed app handoff | STO-2 | `feat(pwa): move trial pages into installed app` | Pages appear in installed app |

### M12 · Journal lock and encryption 🎨 · branch `m12-lock`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 12.1 | Envelope encryption module + known-vector tests | SEC-1 | `feat(security): envelope encryption with web crypto` | Vector tests pass |
| 12.2 | Passphrase setup/unlock (PBKDF2 600k) | SEC-2 | `feat(security): passphrase lock and unlock` | Unlock < 1.5 s on reference iPad |
| 12.3 | Recovery code (24 words) | SEC-4 | `feat(security): printable recovery code` | Unlocks with code alone |
| 12.4 | Background encrypt/decrypt migration (resumable) | SEC-1 | `feat(security): resumable at-rest encryption migration` | Kill mid-migration → resumes |
| 12.5 | Auto-lock + toolbar lock | SEC-5 | `feat(security): auto-lock after background timeout` | Never fires before exit flush |
| 12.6 | Encrypted backups by default when locked | BAK-3 | `feat(backup): encrypted backups when lock is on` | Restore needs passphrase or code |
| 12.7 | Release `v1.0.0` | — | `chore(release): v1.0.0` | — |

**🚦 Gate (PRD §13 v1):** owner prefers it over every other journal app; a second person installs and uses it unaided.

---

## v2 (P2)

### M13 · Handwriting recognition and search · branch `m13-recognition`

Model chosen by spike S4; a 15–25 MB download is accepted (D-034).

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 13.0 | **S4 Handwriting recognition feasibility** (moved from M0, D-035): evaluate an on-device model, the W3C API and image OCR on the owner's pages | §9.3 | `spike(recog): evaluate on-device handwriting recognition` | Accuracy and size table recorded; go / no-go for the rest of M13 |
| 13.1 | Opt-in model download: size shown, chunked + resumable, SHA-256 check, own cache bucket, `recognition_enabled` event | §9.3, TDD §5.8 | `feat(recog): on-demand handwriting model download` | Survives interrupted download; app update does not re-download; offline launch unaffected |
| 13.2 | Recogniser worker (idle-only) + hidden text layer with word boxes | §9.3 | `feat(recog): background on-device handwriting recognition` | Never runs while writing |
| 13.3 | Word correction UI | §9.3 | `feat(recog): correct recognised words` | Corrections persist |
| 13.4 | Handwriting search with ink highlights | SRC-4 | `feat(search): search inside handwriting` | ≥ 85 % recall on owner test set |
| 13.5 | Find on page | SRC-5 | `feat(search): find within entry` | — |
| 13.6 | Title suggestion from first line | ENT-4 | `feat(entries): suggest titles from handwriting` | — |
| 13.7 | Markdown export | §7.4 | `feat(export): markdown export with page images` | — |

### M14 · Insights and memories · branch `m14-insights`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 14.1 | Stats (days, pages, ink length, time of day) | INS-2 | `feat(insights): writing stats` | — |
| 14.2 | Mood trends and correlations | INS-3 | `feat(insights): mood trends` | — |
| 14.3 | Monthly recap page | INS-5 | `feat(insights): monthly recap` | — |
| 14.4 | Random page, photo wall | MEM-5, MEM-7 | `feat(memories): random page and photo wall` | — |
| 14.5 | Letters to future self | MEM-6 | `feat(memories): sealed letters to future self` | Hidden until date |
| 14.6 | Saved searches | ORG-4 | `feat(search): saved searches in sidebar` | — |

### M15 · Creative extras · branch `m15-extras`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 15.1 | Stickers and washi tape | MED-4 | `feat(media): stickers and washi tape` | Original bundled art only |
| 15.2 | Voice notes (+ on-device transcription if available) | MED-5 | `feat(media): voice notes` | — |
| 15.3 | Checklists | MED-6 | `feat(media): tappable checklists` | — |
| 15.4 | Paste and drag-drop | MED-7 | `feat(media): paste and drag and drop` | — |
| 15.5 | Image/PDF as page background | §7.4 import | `feat(ink): images and pdf as page backgrounds` | — |
| 15.6 | Shape snap, ruler | tools P2 | `feat(ink): shape snap and ruler` | — |
| 15.7 | Gentle start, timer, evening bookend | RIT-2, 5, 7 | `feat(rituals): gentle start, timer and evening bookend` | — |
| 15.8 | Calendar `.ics` reminder | §6.6 | `feat(reminders): calendar file daily reminder` | Imports into iPad Calendar |

### M16 · Security and backup extras · branch `m16-security-extras`

| # | Feature | PRD | Commit | Done when |
| --- | --- | --- | --- | --- |
| 16.1 | Face ID unlock via passkey PRF (iPadOS ≥ 18.4) | SEC-3 | `feat(security): face id unlock with passkey prf` | Passphrase still works |
| 16.2 | Privacy curtain | SEC-6 | `feat(security): blur canvas when hidden` | — |
| 16.3 | Hidden entries | SEC-7 | `feat(security): hidden entries` | — |
| 16.4 | Panic wipe | SEC-8 | `feat(security): panic wipe with final backup offer` | — |
| 16.5 | Incremental backups | BAK-5 | `feat(backup): incremental backups` | Chain restores correctly |
| 16.6 | Release `v2.0.0` | — | `chore(release): v2.0.0` | — |

**🚦 Gate (PRD §13 v2):** handwriting search finds the owner's words with at least 85 % recall on a test set.

---

## Later (P3)

Decided after the v2 usage review, using the Umami data: on-device AI reflections (§6.5), word cloud (INS-4), Day One import, Android stylus polish, localisation.

Dropped for now: WebDAV / own-storage backup (BAK-6). If cross-device use is needed later, it comes as accounts + end-to-end encrypted cloud storage with its own design doc (D-033, TDD §16.3).
