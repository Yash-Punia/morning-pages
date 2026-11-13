# S3 · Home Screen install, persist and headers — findings

**Status:** local checks pass; **iPad run on the Vercel preview pending owner**.

## Local checks (Windows, Playwright WebKit, `vite preview` + the `vercel.json` CSP) — 2026-11-13

- `/`, `/ink/`, `/store/codec.html`, `/pwa/`: **0 CSP violations, 0 page errors** with `script-src 'self'; style-src 'self'`. Built HTML has no inline `<script>`, `<style>` or `style=""` (Vite emits the modulepreload polyfill as a file).
- `/pwa/` report: service worker active and controlling, 9 files cached for offline, no Vercel Toolbar script. `persist()` returned `false` in desktop WebKit (expected; the decision is iPadOS heuristics).

## Deploy

Throwaway Vercel project `morning-pages-spikes` (CLI deploy from `spikes/`, git auto-deploy disconnected). The first deploy became the project's production deployment, so it has a stable public alias: **https://morning-pages-spikes.vercel.app**. Use that URL on the iPad. The per-deployment `*-yashpunias-projects.vercel.app` URLs stay behind Vercel Authentication (302). So no Deployment Protection change was needed: D-026 applies to the real app's previews, not here.

Deployed checks, 2026-11-13 (curl + desktop browser):
- All TDD headers are present on every page. `sw.js` and the manifest are `no-cache`, and the manifest is `application/manifest+json`.
- `/`, `/ink/`, `/store/`, `/store/codec.html` and all `/pwa/` icons return 200.
- `/pwa/` report: SW active and controlling after a reload, 7 files cached, **0 CSP violations**, **no Vercel Toolbar script** (the production alias doesn't inject it).

Redeploy after spike changes: `cd spikes && vercel deploy --prod --yes`.

## iPad results — pending owner

| Check | Safari tab | Home Screen app |
| --- | --- | --- |
| Home Screen label (full "Morning Pages" or truncated?) | — | |
| Icon renders (not a screenshot thumbnail) | — | |
| Running as / `display-mode: standalone` | | |
| `persisted()` before → `persist()` → after | | |
| Storage quota reported | | |
| IndexedDB markers: tab and app separate? | | |
| Opens in Airplane Mode (second launch) | — | |
| CSP violations | | |
| Vercel Toolbar script present | | |

Also install `/store/` to the Home Screen from the same preview and run the S2 Home Screen rows there.

## Conclusions and decision updates

_pending: D-031 label fallback, D-026 (installed preview loads with protection off), STO-3 `persist()` behaviour on iPadOS, and confirmation that tab and Home Screen storage are separate (PRD §7.1)._
