# Morning Pages — Decision Log

A running record of every important decision made while building Morning Pages. Newest entries go at the bottom. Entries are never deleted; a reversed decision gets a new entry that **supersedes** the old one, and the old one's status is updated to point at it.

Related: [PRD](./Morning%20Pages%20—%20Journal%20Web%20App%20PRD.md) · [TDD.md](./TDD.md) · [Milestones.md](./Milestones.md)

**Status values:** Proposed · Accepted · Superseded by D-NNN · Rejected

## Index

| ID | Date | Decision | Status |
| --- | --- | --- | --- |
| D-001 | 2026-11-13 | Host on Vercel as a static site | Accepted |
| D-002 | 2026-11-13 | Fix the production domain before real use; previews hold test data only | Accepted |
| D-003 | 2026-11-13 | Svelte 5 in a plain Vite SPA, no SvelteKit | Accepted |
| D-004 | 2026-11-13 | Hand-rolled pathname router | Accepted |
| D-005 | 2026-11-13 | Dexie over IndexedDB with an append-only op log | Accepted |
| D-006 | 2026-11-13 | Binary delta-varint point codec plus RDP simplification | Accepted |
| D-007 | 2026-11-13 | Custom pan/zoom with `touch-action: none` on the canvas | Accepted |
| D-008 | 2026-11-13 | Canvas 2D renderer first; WebGL only if profiling demands | Accepted |
| D-009 | 2026-11-13 | Workbox `generateSW`, prompt-mode updates, bundled registration | Accepted |
| D-010 | 2026-11-13 | CSP as a Vercel response header; Toolbar and Analytics off | Accepted (analytics amended by D-028) |
| D-011 | 2026-11-13 | No Subresource Integrity on same-origin bundles | Accepted |
| D-012 | 2026-11-13 | Fraunces + Atkinson Hyperlegible Next, self-hosted | Accepted |
| D-013 | 2026-11-13 | Impeccable is the design workflow | Accepted |
| D-014 | 2026-11-13 | Continuous scroll is the default page mode | Accepted |
| D-015 | 2026-11-13 | Version history as per-page `seq` high-water marks | Accepted |
| D-016 | 2026-11-13 | Declare every PRD store in schema version 1 | Accepted |
| D-017 | 2026-11-13 | Pull crash recovery (DUR-4) into the MVP | Accepted |
| D-018 | 2026-11-13 | Build an on-device diagnostics HUD | Accepted |
| D-019 | 2026-11-13 | Store `entryDate` as a local `YYYY-MM-DD` string | Accepted |
| D-020 | 2026-11-13 | Two-step backup: build, then share | Accepted |
| D-021 | 2026-11-13 | On IndexedDB connection loss: reopen, retry, hold in memory | Accepted |
| D-022 | 2026-11-13 | Encrypt content fields only; never index content | Accepted |
| D-023 | 2026-11-13 | Branch per milestone, commit per feature, PR per milestone | Accepted |
| D-024 | 2026-11-13 | npm as the package manager | Accepted |
| D-025 | 2026-11-13 | Cornell paper ships in the MVP | Accepted |
| D-026 | 2026-11-13 | Turn off Vercel preview protection | Accepted |
| D-027 | 2026-11-13 | The 400 KB budget covers launch-critical bytes, including fonts | Accepted |
| D-028 | 2026-11-13 | Add anonymous usage analytics with Umami Cloud (free Hobby plan) | Accepted |
| D-029 | 2026-11-13 | Analytics privacy rules: allowlist, buckets, production only, opt-out | Accepted |
| D-030 | 2026-11-13 | Reference device: iPad Pro 12.9″ (6th gen) + Apple Pencil 2nd gen | Accepted |
| D-031 | 2026-11-13 | The app is named Morning Pages | Accepted |
| D-032 | 2026-11-13 | The site is public | Accepted |
| D-033 | 2026-11-13 | No cross-device transfer now; accounts and cloud storage may come later | Accepted |
| D-034 | 2026-11-13 | Accept a 15–25 MB handwriting model, downloaded on demand | Accepted |
| D-035 | 2026-11-13 | Defer spike S4 (handwriting recognition) to just before M13 | Accepted |
| D-036 | 2026-11-14 | Ink input pipeline: dedupe, drop lift-off, 1€ filter, curved outline | Accepted |
| D-037 | 2026-11-14 | Size canvases from their own box, never from `100vh` or `innerHeight` | Accepted |
| D-038 | 2026-11-14 | Pin TypeScript 6, not 7, for the app | Accepted |
| D-039 | 2026-11-14 | Interim production URL `morning-pages-rose.vercel.app` until a custom domain | Accepted |
| D-040 | 2026-11-14 | Pages at most 1000 CSS px wide; tiles are fixed-size bitmaps whose page-unit span varies with zoom | Accepted |
| D-041 | 2026-11-14 | The tool pill docks in its own gutter (left by default) instead of floating over the page | Accepted |
| D-042 | 2026-11-15 | Fingers only scroll, with one finger: no pinch zoom, no multi-finger undo/redo | Accepted |
| D-043 | 2026-11-15 | The fountain pen has a broad italic nib; the ballpoint is the first, default preset | Accepted |
| D-044 | 2026-11-15 | Each entry has a typed title on page 1, listed in the Library | Accepted |

---

### D-001 · Host on Vercel as a static site

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The PRD (§11.1) suggests Cloudflare Pages, Netlify or GitHub Pages. The owner asked for Vercel.
- **Decision:** Deploy the Vite `dist/` output to Vercel through the Git integration: `main` goes to Production and each PR gets a Preview. Use no Functions, Edge Middleware, Analytics, Speed Insights or storage products.
- **Alternatives:** Cloudflare Pages, Netlify, GitHub Pages. All of them work. Vercel wins on owner preference, preview-per-PR and Instant Rollback.
- **Consequences:** `vercel.json` carries headers and rewrites (D-010). Vercel's optional products must stay off to keep PRI-1 and PRI-3.

### D-002 · Fix the production domain before real use; previews hold test data only

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** IndexedDB is scoped per origin. Each Vercel preview URL is a different origin, and changing domains later leaves installed journals behind.
- **Decision:** The owner picks the final production domain before the MVP dogfood begins (Milestone 6.5). Real journaling happens only in the Home Screen app installed from that domain. Previews are for testing, with throwaway data.
- **Alternatives:** Start on `*.vercel.app` and move later. Rejected, because the move needs a manual backup and restore on every device.
- **Consequences:** The name and domain question in PRD §14.3 becomes a hard blocker for M6.

### D-003 · Svelte 5 in a plain Vite SPA, no SvelteKit

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The PRD offers Svelte 5 or Preact. The canvas is custom; the UI is a handful of screens; CSP forbids inline scripts.
- **Decision:** Use Svelte 5 with runes in a plain Vite single-page app.
- **Alternatives:**
  - Preact: also small, but needs more manual state wiring.
  - SvelteKit with `adapter-static`: it injects an inline bootstrap script, which needs CSP hashes. It also adds SSR and prerender concepts that a static offline app does not need.
- **Consequences:** We write our own small router (D-004). The ink engine stays in plain TypeScript outside Svelte reactivity, so writing never triggers component updates.

### D-004 · Hand-rolled pathname router

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The app has about 12 routes and one dynamic parameter (`/entry/:id`).
- **Decision:** Write a router of roughly 40 lines on `history.pushState`, `popstate` and the View Transitions API, with lazy `import()` per route.
- **Alternatives:** `svelte-spa-router` or similar. That would add a dependency for something this small.
- **Consequences:** Nested routes or guards will need to be added by hand if they are ever needed.

### D-005 · Dexie over IndexedDB with an append-only op log

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** DUR-2 requires append-only strokes, where erase and move become new records. Dexie is the PRD's suggestion.
- **Decision:** Ink lives in an `ops` store with these kinds: `stroke`, `erase`, `restore`, `transform` and `style`. A page's state is the fold of its ops in `seq` order. Undo and redo write new ops.
- **Alternatives:**
  - Mutable stroke records with a deleted flag: rewriting records breaks DUR-2.
  - Raw IndexedDB: more code and no help with versioning.
- **Consequences:** Erased strokes stay on disk. That is fine for the storage budget, and it is what makes version history cheap (D-015). Compaction is not planned; add it only if storage measurements demand it.

### D-006 · Binary delta-varint point codec plus RDP simplification

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The Pencil reports up to 240 samples per second. The budget is under 150 KB per handwritten page, and INK-4 requires vector data as the source of truth.
- **Decision:**
  - Quantise each point: x and y to 1/16 of a page unit, pressure to 8 bits, altitude to 6 bits, azimuth to 8 bits.
  - Store zigzag LEB128 deltas in a `Uint8Array`.
  - Decimate with RDP (ε ≈ 0.15 units, pressure-guarded) before encoding (TDD §7.3).
- **Alternatives:**
  - JSON arrays of floats: about 10× larger.
  - `Float32Array` without deltas: about 3× larger.
  - Compressing each stroke with deflate: costs CPU on every pen-up for little gain at this size.
- **Consequences:** The codec format is part of the open backup schema and must be documented and versioned. Spike S2 validates the size on real pages.
- **M0 result (2026-11-14): confirmed, ε = 0.15.** On the owner's clean dense page (423 strokes, 24,883 samples), the size is 153 KB unsimplified, 92 KB at ε 0.1 and **84 KB at ε 0.15**. Quantisation error is ≤ 0.044 units, and ε 0.15 units is about 0.18 CSS px, so it is invisible. The older page that still had repeated samples is 128 KB at ε 0.15, so it stays under budget too.

### D-007 · Custom pan/zoom with `touch-action: none` on the canvas

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** PEN-2 requires `touch-action: none` so Safari does not hijack the Pencil. That also disables native finger scrolling on the canvas, which PEN-7 needs.
- **Decision:** Implement one-finger pan with inertia, two-finger pinch and pan, and tap gestures in `ink/gestures.ts`, all in page space.
- **Alternatives:** Native scrolling with `touch-action: pan-y`. Safari would then `pointercancel` Pencil strokes when it decides to scroll. That is unacceptable.
- **Consequences:** We own scroll physics and must make inertia feel native. This is checked in the M2 manual checklist.
- **M0 result (2026-11-14): confirmed.** S1b uses `touch-action: none`, non-passive `touchstart`/`touchmove` `preventDefault`, one-finger pan, and a 500 ms palm guard. The owner reports no problems. The detailed checklist was not filled in, so it gets redone in the M2.2 manual pass.

### D-008 · Canvas 2D renderer first; WebGL only if profiling demands

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The PRD recommends Canvas 2D with `perfect-freehand` and a WebGL fallback.
- **Decision:** Use Canvas 2D: a live layer plus tiles of committed strokes, with an LRU cap of 24 tiles to stay under Safari's canvas memory limit.
- **Alternatives:** WebGL or WebGPU from day one. That means more code and harder text and paper rendering, with no evidence yet that it is needed.
- **Consequences:** Spike S1 and the M6 performance pass decide whether a WebGL path is ever built.
- **M0 result (2026-11-14): confirmed.** After D-036 and D-037, Canvas 2D with perfect-freehand passed the owner's feel test against Apple's Journal. The roughness came from input handling and canvas sizing, not from the renderer. No WebGL needed for now. HUD frame timings were not captured, so the M6 performance pass measures them.

### D-009 · Workbox `generateSW`, prompt-mode updates, bundled registration

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The threat model requires that users approve updates. CSP forbids inline scripts.
- **Decision:** Use `vite-plugin-pwa` with `strategies: 'generateSW'`, `registerType: 'prompt'` and `injectRegister: false`. Registration happens from our own module via `virtual:pwa-register`. The update banner applies an update only when the write queue is empty.
- **Alternatives:**
  - `autoUpdate`: silently swaps code under the user.
  - `injectManifest`: more control than we need now.
- **Consequences:** CI asserts that `dist/index.html` has no inline `<script>`.

### D-010 · CSP as a Vercel response header; Toolbar and Analytics off

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** PRI-2 includes `frame-ancestors 'none'`, which browsers ignore in `<meta>` CSP. Vercel Preview deployments can inject the Vercel Toolbar script.
- **Decision:** The full CSP and security headers live in `vercel.json`, and CI checks the CSP string. Vercel Toolbar is disabled for the project. Web Analytics and Speed Insights are never enabled.
- **Alternatives:** A `<meta>` CSP. That cannot express `frame-ancestors` and would be lost for any route that is not HTML.
- **Consequences:** Local `vite preview` does not send these headers. Header behaviour is verified on Vercel Previews.
- **Amendment (D-028):** Vercel Web Analytics stays off. Usage analytics use Umami instead, which adds one `connect-src` origin to the CSP.

### D-011 · No Subresource Integrity on same-origin bundles

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The PRD threat model lists SRI against a malicious hosted update. All of our scripts are same-origin.
- **Decision:** Skip SRI. Protection comes from:
  - service worker updates the user approves (D-009);
  - public source;
  - tagged releases;
  - release notes shown in the update banner.
- **Alternatives:** An SRI plugin for Vite. Rejected: an attacker who can change `index.html` on the same origin can change the hashes too, so SRI adds build complexity for no real protection here.
- **Consequences:** Revisit if any asset is ever served from another origin, which PRI-3 currently forbids.

### D-012 · Fraunces + Atkinson Hyperlegible Next, self-hosted

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The PRD asks for a literary serif (Fraunces or Newsreader) and the system font for UI. The Impeccable workflow flags system default fonts as a generic-looking anti-pattern. PRI-3 forbids third-party fonts.
- **Decision:** Use Fraunces (variable) for headings and dates, and Atkinson Hyperlegible Next for UI and typed text. Both come from Fontsource npm packages, bundled and precached.
- **Alternatives:**
  - System font: the PRD default, but generic.
  - Inter: flagged as overused.
  - Source Sans 3: a good humanist face, but less legible for a half-awake reader.
- **Consequences:** Font files are measured at M1.8. Only fonts preloaded for the Today screen count toward the launch budget (D-027); subset to Latin and use `font-display: swap` to keep that small. **Deviates from PRD §10.3.**

### D-013 · Impeccable is the design workflow

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The owner asked for the website design to use Impeccable.
- **Decision:**
  - Install Impeccable at project level with `npx impeccable skills install` and commit it.
  - Run `/impeccable init` to produce `PRODUCT.md` and `DESIGN.md`, seeded from PRD §10.3.
  - Every UI milestone starts with `shape` and ends with `critique`, then `audit`, then `polish`.
  - `npx impeccable detect` runs in CI: as a warning until the MVP, then blocking.
  - `bolder` and `overdrive` are not used.
- **Alternatives:** Ad-hoc design, or the generic frontend-design skill.
- **Consequences:** `DESIGN.md` becomes the token source of truth. Impeccable's scope is the app chrome; ink rendering is governed by real-device testing.

### D-014 · Continuous scroll is the default page mode

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** An open question in PRD §14.3. The PRD already lists continuous scroll as the default (§4.4) and as MVP scope (§13).
- **Decision:** Ship continuous vertical scroll in the MVP. The paged notebook mode follows in v1 (M7.6).
- **Alternatives:** Paged by default.
- **Consequences:** Can be revisited after the 30-morning dogfood. The setting already exists by v1.

### D-015 · Version history as per-page `seq` high-water marks

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** ENT-8 asks for snapshots every 10 minutes and at close. Copying page data would multiply storage.
- **Decision:** A revision stores `{ pageId: maxSeq }`. Restoring a revision appends `erase` and `restore` ops to reach that state.
- **Alternatives:** Full snapshot copies, or a "snapshot pointer" to a blob.
- **Consequences:** Revisions cost bytes, not megabytes. Restoring is itself undoable. Depends on D-005.

### D-016 · Declare every PRD store in schema version 1

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** DUR-6 makes every migration a user-visible event, with a backup offered first.
- **Decision:** Declare `blocks`, `assets` and `revisions` from the start, even though v1 is the first milestone that uses them.
- **Alternatives:** Add stores when first needed. Rejected: it would force a migration early in v1 for no data change.
- **Consequences:** Empty stores cost nothing. Real migrations are reserved for real shape changes.

### D-017 · Pull crash recovery (DUR-4) into the MVP

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The PRD marks DUR-4 as P1. iOS can suspend the app before a transaction started in `pagehide` completes, so DUR-3 alone leaves a window where a stroke can be lost. "Durability over features" is principle #1.
- **Decision:** Implement the 250 ms recovery record in M3 (Milestone 3.8).
- **Alternatives:** Keep it at P1 as the PRD lists it.
- **Consequences:** Adds one small store write per 250 ms during strokes, at low priority in the queue. **Deviates from PRD priority.**
- **M0 result (2026-11-14): confirmed and tightened.** The iPad torture run hit the "replay skipped, already committed" path, so the idempotent replay check is needed. 186 strokes were pen-up but not yet acknowledged when a reload hit. That is correct behaviour, but it showed that a stroke under 250 ms has no recovery record before its commit, which takes about 10–15 ms. M3.8 therefore makes the first recovery write at the stroke's first sample, then every 250 ms. A `localStorage` fallback was rejected, because DUR-8 forbids it.

### D-018 · Build an on-device diagnostics HUD

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** Development happens on Windows. Safari Web Inspector for iPad needs a Mac. No third-party debugging scripts are allowed.
- **Decision:** Add a `/diagnostics` route with these readings:
  - pointer sample rate;
  - coalesced and predicted event support;
  - frame-time histogram;
  - queue latency (p50 and p99);
  - persist and quota status;
  - the local error log, which can be exported.
- **Alternatives:** Borrow a Mac, or use paid remote-inspection tools. Both remain optional extras.
- **Consequences:** It also serves the PRD's local-only success metrics. It ships in production behind a gesture.

### D-019 · Store `entryDate` as a local `YYYY-MM-DD` string

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** A morning journal is about calendar days. UTC timestamps move entries across days with travel and daylight saving changes.
- **Decision:** `entryDate` is the user's local calendar date as a string. `createdAt` and `updatedAt` are epoch milliseconds.
- **Alternatives:** A UTC timestamp plus a time zone.
- **Consequences:** Calendar, On This Day and streak logic compare strings. "Today" uses the device's local date at midnight; a later setting could move the day boundary to 4 a.m.

### D-020 · Two-step backup: build, then share

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** `navigator.share()` needs a recent user gesture, and building a large backup outlasts that window.
- **Decision:** The user taps **Back up now**. A worker builds the file and shows progress. The user then taps **Save backup**, which opens the share sheet. If the share sheet cannot take the file, fall back to a `download` link.
- **Alternatives:** One tap that builds and shares in a single step. Rejected: it fails for any backup that is not tiny.
- **Consequences:** Backup always takes one extra tap. `lastBackupAt` is set only after the share completes.

### D-021 · On IndexedDB connection loss: reopen, retry, hold in memory

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** WebKit has a long-standing failure mode where IndexedDB reports a lost connection after the app is backgrounded. DUR-8 forbids keeping important data in `localStorage`.
- **Decision:** The write queue handles this in three steps:
  1. Classify the error.
  2. On connection loss, close and reopen Dexie and retry with backoff.
  3. On quota or unknown errors, keep items in memory, show a hollow saved dot and a banner, and offer an emergency export.

  Nothing is dequeued until its transaction commits.
- **Alternatives:** Ask the user to reload, as WebKit's own error message suggests. That risks losing strokes that are still in memory.
- **Consequences:** The torture suite must simulate each error class.
- **M0 result (2026-11-14): confirmed as a safety net.** iPadOS 26.6 raised no connection-lost errors in 200 reloads. The simulated loss recovered after one retry. With `durability: 'strict'`, commit p50/p99 on device was 9/15 ms, so strict stays.

### D-022 · Encrypt content fields only; never index content

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** SEC-1 encrypts every record. IndexedDB indexes need plaintext keys.
- **Decision:**
  - Structural fields stay plaintext: ids, `journalId`, `entryDate`, `seq`, `pageId`, `updatedAt` and `deletedAt`.
  - Content fields, including tags, mood, title, points and text, are sealed with AES-GCM using the record id as additional authenticated data.
  - Content is never indexed, even before the lock exists. Tag and mood filters run in memory.
  - The search index is stored as one encrypted blob.
- **Alternatives:**
  - Encrypting whole records: loses date indexes, so the calendar breaks.
  - Indexing tags in plaintext: leaks content.
- **Consequences:** Entry dates and counts stay visible to someone with raw device access when the journal is locked. This is acceptable under the PRD threat model (the iPad's own data protection covers device theft).

### D-023 · Branch per milestone, commit per feature, PR per milestone

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The owner wants each feature committed separately. Vercel creates a Preview for each PR.
- **Decision:** Each row in Milestones.md is one Conventional Commit on a milestone branch. One PR per milestone, and a Vercel Preview is tested on the iPad before merge.
- **Alternatives:** Committing straight to `main` loses previews. A PR per feature is too much overhead for one developer.
- **Consequences:** Commit messages are pre-written in Milestones.md. Fixes are new commits, not amends.

### D-024 · npm as the package manager

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** One developer, Windows dev machine, Vercel build.
- **Decision:** Use npm with a committed `package-lock.json`, and `npm ci` in CI and on Vercel.
- **Alternatives:** pnpm is faster and stricter, but it is one more tool to install and keep aligned on Vercel.
- **Consequences:** Can switch later with no architectural impact.

### D-025 · Cornell paper ships in the MVP

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** PRD §4.4 marks Cornell as a P0 paper style. The MVP scope in §13 lists only lined, dotted, grid and blank.
- **Decision:** Follow §4.4 and include Cornell in M2.6. It is a static pattern with negligible cost.
- **Alternatives:** Defer it to v1.
- **Consequences:** None material.

### D-026 · Turn off Vercel preview protection

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** Every milestone is tested by installing its Vercel Preview to the iPad Home Screen. Vercel Authentication, the default preview protection, gets in the way in two places:
  - The web app manifest is fetched without credentials, so it can return 401.
  - The Home Screen container does not share Safari's login cookie.
- **Decision:** Disable Deployment Protection for Preview deployments.
- **Alternatives:** Keep protection and add `crossorigin="use-credentials"` to the manifest link. This is unverified on iPadOS, and it still fails when the installed app has no cookie.
- **Consequences:** Anyone with a preview URL can open it. That is acceptable because:
  - the app is static and open source (PRI-6);
  - preview origins only ever hold test data (D-002);
  - nothing is sent to a server.

  Spike S3 confirms that installed previews load.
- **M1 result (2026-11-14): confirmed.** The `morning-pages` project has Vercel Authentication off for previews (`ssoProtection: null`, set through the API). A PR preview deployment URL returns 200 without a login, with the exact §11.2 headers and no Toolbar script.
- **M0 result (2026-11-14): still open; verify in M1.5.** The spike project's first CLI deploy became production, so it had a public alias and protection never got in the way. Per-deployment URLs on that project redirect to Vercel login (302), which is exactly what this decision avoids for the real app. The Vercel Toolbar was not injected on the production alias.

### D-027 · The 400 KB budget covers launch-critical bytes, including fonts

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** PRD §12.1 caps the "initial download (app shell)" at 400 KB gzipped. The service worker precaches every route chunk, all fonts and the prompt packs, and later `pdf-lib`. Counting everything would make the cap meaningless or block features. Counting only JavaScript would hide fonts.
- **Decision:** The gated budget is the bytes needed to reach a writable Today page: `index.html`, the entry and Today chunks, their CSS, and preloaded fonts. The total precache size is reported in every PR but not gated.
- **Alternatives:**
  - Gate the whole precache.
  - Gate only JavaScript.
- **Consequences:** Lazy routes can grow without failing CI, so the PR report is how precache growth gets noticed. The recognition model in v2 is excluded, as the PRD already states.

### D-028 · Add anonymous usage analytics with Umami Cloud (free Hobby plan)

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** The owner wants the site public and wants to know how it is used, including important events, using a simple, free tool. The PRD (principle 3, PRI-3, §14.1) allowed only a cookieless counter on a landing page.
- **Decision:** Use Umami Cloud's free Hobby plan: 100K events/month, 1 website, 6-month retention, custom events with properties. Events are sent with `fetch` from our own module straight to `https://gateway.umami.is/api/send`. No Umami script is loaded. The CSP gains that one `connect-src` origin. Details are in TDD §9.4.
- **Alternatives** (free tiers checked 2026-11-13):
  - **Vercel Web Analytics (Hobby):** 50K events/month, but custom events are Pro/Enterprise only, so it gives page views only on the free plan.
  - **PostHog:** a 1M-event free tier, but a heavy SDK and a device ID by default. More than this app needs.
  - **Cloudflare Web Analytics:** free, but page views only.
  - **Plausible:** no free cloud tier.
  - **GoatCounter:** free and minimal, with weak event support.
  - **Proxying Umami through a Vercel rewrite:** keeps `connect-src 'self'`, but Umami would see Vercel's IP for every visitor and could no longer tell visitors apart.
- **Consequences:**
  - **Deviates from PRD principle 3, PRI-3 and §14.1.** The promise becomes "your writing never leaves the device", not "no network at all".
  - The zero-network test becomes an allowlist and content-canary test.
  - Ad-blockers will hide some visitors, so the counts are approximate.
  - Retention is 6 months on the free plan. Moving to Umami Pro or a self-hosted Umami later only changes the endpoint.

### D-029 · Analytics privacy rules: allowlist, buckets, production only, opt-out

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** D-028 opens the first outbound channel from a journal app whose core promise is privacy.
- **Decision:**
  - Event names and property values are TypeScript union types, and every number is bucketed. Anything not in the schema is dropped.
  - URLs are sent as route templates (`/entry`, never `/entry/<id>`), with no query strings.
  - Never sent: ids, entry dates, titles, tags, people, mood, text, strokes, file names or journal names.
  - Events are sent only from the production host, never from dev, previews or tests.
  - Events are fire-and-forget. They are dropped when offline and never touch the write path.
  - Settings has a "Share anonymous usage stats" toggle, on by default. This is disclosed in onboarding and on the privacy page.
  - CI includes a canary test to prove that typed content and ids never appear in a request.
- **Alternatives:**
  - Off by default (opt-in). Very few people would turn it on, so the owner would learn little.
  - Sending richer data, such as mood. Rejected: it is personal health-adjacent data.
- **Consequences:** Every new feature that adds an event must extend `events.ts` and the allowlist test, in the same commit (Milestones "How we work").

### D-030 · Reference device: iPad Pro 12.9″ (6th gen) + Apple Pencil 2nd gen

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** An open question in PRD §14.3. The owner's device is an iPad Pro 12.9″ (6th generation, M2) with an Apple Pencil 2nd generation (model A2051).
- **Decision:** All performance budgets and "on device" checks use this pair. This iPad has 120 Hz ProMotion, so the pen-to-ink budget is **8 ms** of app work. It also supports Pencil hover, so PEN-8 is in scope and testable. The PRD's iPad Air M1 and 9th-gen iPad become opportunistic checks.
- **Alternatives:** Buying or borrowing the PRD's lower-end devices before starting.
- **Consequences:**
  - Pencil double-tap exists but is not exposed to web pages. Squeeze and barrel roll need a Pencil Pro and are out of scope.
  - A fast M2 can hide performance problems on older iPads. The diagnostics HUD and the `launch_perf` event help spot those in the field.

### D-031 · The app is named Morning Pages

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** An open question in PRD §14.3, which noted the name is also Julia Cameron's practice.
- **Decision:** The name is **Morning Pages**. The manifest `name`, `short_name` and `apple-mobile-web-app-title` are all "Morning Pages". If iPadOS truncates the Home Screen label, the fallback `short_name` is "Morning" (checked in spike S3).
- **Alternatives:** A distinct name; "Pages" as the short name, which clashes with Apple's Pages app.
- **Consequences:** The production **domain** is still open and still blocks M6 (D-002).
- **M0 result (2026-11-14): confirmed.** The iPad Pro 12.9″ Home Screen shows "Morning Pages" in full, so no fallback is needed.

### D-032 · The site is public

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** An open question in PRD §14.3.
- **Decision:** Anyone can open the site, install it and write. Onboarding doubles as the landing page. The site gets a proper title, description and Open Graph tags (M4.15), and usage is measured per D-028.
- **Alternatives:** A personal site behind a landing page.
- **Consequences:** Onboarding copy must work for strangers. Previews still hold test data only (D-002, D-026).

### D-033 · No cross-device transfer now; accounts and cloud storage may come later

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** An open question in PRD §14.3. The owner does not need to move entries between devices now, and may add authentication and cloud storage later.
- **Decision:** Backup files remain the only way to move a journal. WebDAV / own-storage backup (BAK-6) is dropped from the plan. The data model stays sync-ready: device-generated UUIDs, an append-only op log, `updatedAt` and `deletedAt` tombstones, and per-record encryption (TDD §16.3).
- **Alternatives:** Building WebDAV backup now.
- **Consequences:** Adding accounts later would replace PRI-1 (no backend) and needs its own design doc, ideally with end-to-end encryption so the server never reads entries.

### D-034 · Accept a 15–25 MB handwriting model, downloaded on demand

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** An open question in PRD §14.3. The owner accepts the size for now and may revisit it.
- **Decision:** v2 handwriting recognition uses an on-device model of up to about 25 MB. It is:
  - opt-in from Settings, with the size shown before downloading;
  - served from our own origin;
  - stored in its own versioned cache bucket outside the service-worker precache;
  - downloaded in resumable chunks and verified by SHA-256 (TDD §5.8).

  Spike S4 still picks the model.
- **Alternatives:**
  - Precaching the model with the app. That would make every install and update 25 MB.
  - A cloud OCR service. That breaks the rule that no ink leaves the device.
- **Consequences:** The app launch and offline use are unaffected. If the size proves bad, only §5.8 and M13.1 change.

### D-035 · Defer spike S4 (handwriting recognition) to just before M13

- **Date:** 2026-11-13 · **Status:** Accepted
- **Context:** Recognition is a v2 feature. Evaluating models now would delay the MVP, and the candidate models may change by then.
- **Decision:** S4 moves out of M0 and becomes M13.0, the first step of M13. The owner's pages exported during M0 are kept locally as its test set.
- **Alternatives:** Run S4 in M0 as originally planned.
- **Consequences:** The M0 gate covers ink and durability only. M13 can't start feature work until 13.0 recommends go.

### D-036 · Ink input pipeline: dedupe, drop lift-off, 1€ filter, curved outline

- **Date:** 2026-11-14 · **Status:** Accepted
- **Context:** In S1 the owner found the ink rough next to Apple's Journal, with a blob or hook at stroke ends. The exported pages showed three causes:
  - iPad WebKit repeats the previous batch's tail in `getCoalescedEvents`: 23 % of samples, with time going backwards.
  - Coordinates are quantised to 0.5 CSS px.
  - The `pointerup` sample jumps a median 3.9 px at pressure 0, giving hooks on 52 % of strokes.

  PencilKit itself stores strokes as cubic B-splines and refines estimated Pencil values later. Neither is exposed to the web.
- **Decision:**
  1. Keep only samples whose timestamp is newer than the last one kept, predicted samples included.
  2. Never draw the lift-off sample.
  3. Smooth position with a 1€ filter (Casiez et al., CHI 2012). Levels: low (fc_min 4 Hz, β 0.04), medium (2, 0.025, the default), high (1, 0.015).
  4. Low-pass pressure with an EMA of 0.2 per sample.
  5. At pen-up, settle the filter onto the last real sample.
  6. Fill the perfect-freehand outline with quadratic curves through midpoints. perfect-freehand's own `streamline` drops to 0.15.
  7. **Store raw samples. Smoothing is a pure function applied at render**, so live and committed ink match and the level can change later without rewriting data.
- **Alternatives:**
  - Tuning perfect-freehand's `streamline` alone. Round 1 showed it adds lag without removing hooks.
  - Storing smoothed points. That loses the raw data and freezes the filter choice into old entries.
  - A custom spline renderer. More code, and not needed once the input was clean.
- **Consequences:**
  - On the owner's page: end hooks 52 % → 7 %, jitter 0.88 → 0.28 px, ink trailing the pen by about 1.75 px, stroke ends within 0.1 px of the lift point. The owner passed it.
  - Rendering an old entry depends on the smoothing parameters. They become part of the documented format, and a change gets a version.
  - Ported in M2.1 and M2.4.

### D-037 · Size canvases from their own box, never from `100vh` or `innerHeight`

- **Date:** 2026-11-14 · **Status:** Accepted
- **Context:** In S1 the ink appeared offset from the nib. The canvas's CSS size was `100vh`, which on iPadOS is the height with toolbars hidden, while its backing store used `innerHeight`. With the toolbars showing, the canvas was stretched, so ink drifted from the nib more toward the bottom of the screen and got resampled.
- **Decision:** Writing canvases use `position: fixed; inset: 0; width/height: 100%`. Backing pixels and the pointer origin come from `getBoundingClientRect()`, re-measured with a `ResizeObserver`. Page coordinates are `clientX − rect.left − pan`.
- **Alternatives:** `100dvh`. That still relies on viewport-unit behaviour, and `ResizeObserver` covers every case.
- **Consequences:** Exact 1:1 ink under the nib, confirmed by the owner. The M2.5 test checks this with the toolbars shown and hidden.

### D-038 · Pin TypeScript 6, not 7, for the app

- **Date:** 2026-11-14 · **Status:** Accepted
- **Context:** TypeScript 7 (the native port) is current and the spikes used it with plain `tsc`. The app type-checks Svelte files with `svelte-check` 4.7, whose peer range is TypeScript `^5 || ^6`, because it drives the JavaScript language-service API that TypeScript 7 does not ship.
- **Decision:** Pin `typescript` 6.0.3 in the app. The tsconfig follows the official Svelte template (`allowArbitraryExtensions`, `allowJs`, `checkJs`, `moduleDetection: force`); without `allowJs`, `.svelte` imports fail to type-check.
- **Alternatives:** TypeScript 7 without `svelte-check`, which would leave Svelte templates unchecked.
- **Consequences:** Move to TypeScript 7 when `svelte-check` supports it. `checkJs` also type-checks the plain `.mjs` build scripts, so they carry JSDoc types.

### D-039 · Interim production URL `morning-pages-rose.vercel.app` until a custom domain

- **Date:** 2026-11-14 · **Status:** Accepted
- **Context:** The owner chose a free `*.vercel.app` production URL for M1 to M5. `morning-pages.vercel.app` was already taken, so Vercel assigned `morning-pages-rose.vercel.app` to the new `morning-pages` project.
- **Decision:** Production is `morning-pages-rose.vercel.app`, and `VITE_PRODUCTION_HOST` is set to it for Production only. Analytics send only from that host.
- **Alternatives:** Buy a custom domain now; the owner deferred it.
- **Consequences:** Only test data lives on this origin. The custom domain is still required before the M6 dogfood (D-002, §11.3); moving then strands nothing real. When it changes, update `VITE_PRODUCTION_HOST` and the Umami website's domain.

### D-040 · Pages at most 1000 CSS px wide; tiles are fixed-size bitmaps whose page-unit span varies with zoom

- **Date:** 2026-11-14 · **Status:** Accepted
- **Context:** TDD 5.5 specified 512 × 512-unit tiles at 1×/2×/4× of the device pixel ratio, with an LRU of 24 tiles (≈ 100 MB at 2×). In M2 testing at DPR 2, zooming in pushed tile resolution to 8 px per unit. A 512-unit tile then became 4096 × 4096 px (64 MB), so a few visible tiles exceeded the budget and visible tiles were evicted every frame. On iPad Safari that also risks the global canvas memory limit, where canvases silently go blank. Separately, fitting the page to any surface width made the unit scale arbitrary, so tiles were rarely pixel-exact.
- **Decision:**
  1. A page is shown at most **1000 CSS px wide**. At zoom 1 on the reference iPad (DPR 2), one page unit is exactly **2 device px**. Wider surfaces centre the page on the linen desk.
  2. Every tile is a **1024 × 1024 px bitmap**. Its resolution is the next power of two at or above the device scale, so tiles are only ever downsampled. A tile covers `1024 / res` page units: 512 units at the reference 2 px per unit, as TDD 5.5 intended, and 128 units at 8 px per unit.
  3. The cache is capped by **pixels**: 24 tiles × 1024², about 100 MB, at any zoom.
  4. Tiles are detached `<canvas>` elements, not `OffscreenCanvas`, so the iPad runs exactly the path the e2e suite exercises.
- **Alternatives:**
  - Cap the resolution at 4: blurry at maximum zoom.
  - Fixed 512-unit tiles with a smaller count cap: thrashes when zoomed in.
- **Consequences:**
  - Memory per tile is constant, so the budget holds at 4×; an e2e test writes at 4× and checks the cap.
  - Tile edges are blitted at whole device pixels, so no seams.
  - TDD 5.5 is amended accordingly.

### D-041 · The tool pill docks in its own gutter (left by default) instead of floating over the page

- **Date:** 2026-11-14 · **Status:** Accepted
- **Context:** PRD 4.3 describes "a compact floating pill" that "never covers the writing line" (PRD 10.2). On iPad portrait, the page fills the surface width, so a pill floating at the left edge would sit over the start of every line, exactly where a right-handed writer begins each word. The owner writes right-handed, so the pill belongs on the left, away from the resting palm. The owner confirmed this on 2026-11-14.
- **Decision:** Docked left, top or right, the pill sits in its own linen gutter (4.5 rem), and the page reflows beside or below it. It still looks like a floating pill (paper, `--shadow-float`). Folded, it becomes a single dot that floats over the edge, and it starts folded at phone width. The default dock is **left**, matching the owner's handedness. Tapping the active preset again opens its editor (owner's choice).
- **Alternatives:** A pill floating over the page, as in the PRD's literal wording: it covers line starts on portrait.
- **Consequences:**
  - The page loses about 72 CSS px of width while docked at the side. In landscape that comes out of the linen desk; in portrait the page shrinks slightly.
  - A handedness setting can switch the default dock later; the dock already persists.
  - **Amends the PRD's "floating" wording; the "never covers the writing line" rule takes priority.**

### D-042 · Fingers only scroll, with one finger: no pinch zoom, no multi-finger undo/redo

- **Date:** 2026-11-15 · **Status:** Accepted (supersedes the gesture rows of TDD 5.3 and the zoom part of D-007 and PEN-7)
- **Context:** On the iPad (M2 owner check), a palm resting on the glass while writing was read as gestures. It undid the last stroke as a "two-finger tap", or panned and zoomed the page. The owner asked for pinch zoom and tap-to-undo to be removed, keeping only single-finger scrolling.
- **Decision:** Fingers do exactly one thing on the page: **one finger scrolls**, with inertia.
  - A second contact cancels any scroll until every finger has lifted.
  - Palm-sized contacts (over 40 CSS px) are ignored.
  - The pen still cancels a scroll, with the 500 ms palm guard after it lifts.
  - No pinch zoom, no trackpad zoom, no two- or three-finger taps. Undo and redo are the toolbar buttons and ⌘Z / ⇧⌘Z.
  - In "Draw with finger" mode, where one finger writes, two fingers together scroll (still no zoom).
- **Alternatives:**
  - Keep zoom behind a toolbar control: not requested; can return later as a button if wanted.
  - A dedicated scroll strip at the edge: offered; the owner chose plain one-finger scrolling.
- **Consequences:** Page zoom is fixed at 1. The viewport keeps its zoom code (tested) in case a zoom control is added later. **Deviates from PRD PEN-7 (pinch zoom) and the PRD 4.3 / TDD 5.3 tap gestures, at the owner's request.**

### D-043 · The fountain pen has a broad italic nib; the ballpoint is the first, default preset

- **Date:** 2026-11-15 · **Status:** Accepted (refines the M2 presets)
- **Context:** Owner feedback on the M2 preview: the ballpoint is the everyday pen and should be selected by default. The fountain pen's round tip ("just a dot") should be a slanted nib for more artistic, cursive writing.
- **Decision:**
  - Presets are, in order: ballpoint black (selected), fountain blue-black, fountain sepia, ballpoint crimson. The saved toolbar moved to a v2 key so the new order reaches devices that saved the old one.
  - The fountain pen draws with a **broad italic nib**: a flat edge at a fixed 30° slant. The mark is the area that edge sweeps, built as one quad per segment, all wound the same way so the nonzero fill unions them, plus a fine hairline so strokes along the edge never vanish. The result is thick downstrokes and hairline cross-strokes.
  - Size 5 is about a 0.65 mm italic. A first, bolder width turned the owner's real handwriting into heavy calligraphy; the finer default keeps it legible, and bigger sizes go bolder.
  - The hover preview shows the slanted nib, and the toolbar swatch draws a wave with it.
- **Alternatives:** Pressure-only width (the old fountain): no direction-dependent thick and thin, which is what made it look like a dot.
- **Consequences:** The fountain's outline for hit-testing is the sweep's boundary. Raw samples are still what's stored (D-036), so the nib can be retuned later without rewriting entries. The nib angle is fixed; a left-handed angle setting could follow.

### D-044 · Each entry has a typed title on page 1, listed in the Library

- **Date:** 2026-11-15 · **Status:** Accepted (pulls a typed title forward; ENT-4's handwriting-suggested title stays in M13)
- **Context:** The owner wants a place at the top of each entry for a title typed with the keyboard, and to see entries by title in the Library.
- **Decision:**
  - Page 1's header band (now 150 units) holds a real text field in Fraunces, placeholder "Title". The engine positions it on the paper, so it scrolls with the page.
  - The field sits outside the canvas host, so a tap on it never inks; Scribble may also write into it.
  - The printed date becomes a quiet line beneath the title.
  - The title is the entry's `title` field (TDD 7.2). The Library lists the entry by title (or "Untitled"), date and page count.
- **Alternatives:**
  - A fixed title bar above the canvas: costs writing height on every screen.
  - A handwritten title only: can't be listed until recognition (v2).
- **Consequences:** In M2 only today's in-memory entry is listed. M3 persists titles with entries, and the M4 Library lists every entry by title.

---

## Template for new entries

Copy this block, take the next free number and add a row to the index.

```markdown
### D-NNN · <short title in the imperative or as a noun phrase>

- **Date:** YYYY-MM-DD · **Status:** Proposed | Accepted | Superseded by D-NNN | Rejected
- **Context:** What forced a choice? Link PRD IDs, TDD sections, spike findings.
- **Decision:** What we will do, specific enough to check in code review.
- **Alternatives:** What else was considered and why it lost.
- **Consequences:** What this makes easier or harder; follow-ups; PRD deviations called out in bold.
```
