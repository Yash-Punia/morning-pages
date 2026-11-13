# Morning Pages — Journal Web App PRD

Nov 13, 2026 · @Yash Punia

## 1. Overview

Morning Pages is a private, handwriting-first journal that runs in the browser, is installed to the iPad Home Screen, and keeps every entry on the device. Its one non-negotiable promise: **no stroke is ever lost**.

### Problem

The owner journals every morning on an iPad with Apple Pencil. The current app (Apple Journal) intermittently fails to save handwritten entries, which destroys trust in the habit. Most alternatives either push entries to a vendor cloud, lock handwriting behind a subscription, or treat the pencil as an afterthought to typed text.

### Vision

Open the app, the pen is already in your hand, and today's page is waiting. Write freely; the page saves itself continuously. Over months the journal becomes a searchable, beautiful record of mornings, with gentle rituals that make the habit stick, and nothing ever leaves the device unless you export it.

### Product principles

1. **Durability over features.** Every stroke is persisted within 1 second of pen-up. A feature that risks data loss does not ship.
2. **Pen first, keyboard second.** The default canvas is ink. Typing is supported but never required.
3. **Local by default, private by design.** No account, no server-side storage, no analytics, no third-party scripts.
4. **Zero friction at 6 a.m.** Launch to a writable page in under 1.5 seconds, with no dialogs in the way.
5. **Calm, not gamified.** Streaks and insights encourage; they never nag or shame.
6. **Open formats, no lock-in.** Everything exports to standard files (JSON, SVG, PNG, PDF, Markdown).

### Goals

- Replace the owner's current journaling app for daily morning use on iPad + Apple Pencil.
- Zero data-loss incidents across 12 months of daily use.
- Writing latency that feels like paper (target under 20 ms perceived, see Section 12).
- Make it trivially easy for anyone else to use: open the URL, add to Home Screen, start writing.

### Non-goals (for now)

- Cloud sync, accounts or multi-user collaboration.
- A native App Store app (the PWA must stand on its own).
- Social sharing feeds or public journals.
- Server-side AI. Any intelligence features run on-device or not at all.

## 2. Competitive research

No leading journal app combines a first-class Apple Pencil canvas with local-only storage and no subscription; that intersection is the opening for Morning Pages. The table below summarises what each app does, what to borrow and where it falls short.

| App | Platforms | Handwriting / Pencil | Storage and privacy | Ideas worth borrowing | Gaps for this use case |
| --- | --- | --- | --- | --- | --- |
| [Apple Journal](https://9to5mac.com/2025/06/17/apples-journal-app-is-coming-to-ipad-and-mac-with-big-upgrades/) | iPhone, iPad and Mac since iOS/iPadOS 26 | Drawings and handwriting added in iOS 26, with or without Pencil | iCloud, Apple ecosystem only | Multiple journals, inline images, map view, recently-deleted recovery, journaling suggestions from photos and activity | Owner reports lost handwritten entries; ink is an attachment inside a text entry rather than a page |
| [Day One](https://dayoneapp.com/releases) | iOS, iPadOS, Mac, Android, Web, Windows, Watch | Handwritten entries or drawings inside an entry | End-to-end encrypted cloud on every tier; account required | On This Day, prompt packs, templates, audio with transcription, tags, calendar, printed books, Daily Chat AI (Gold tier) | Subscription tiers up to $74.99/yr; cloud account central; pen is secondary |
| [Journey](https://blog.mylifenote.ai/day-one-vs-journey/) | Android, iOS, Mac, Windows, Web, ChromeOS | Not a focus | E2EE only when Journey Cloud Sync is used | 60+ guided Coach programs, built-in mood tracker, 30-day mood view, DOCX/PDF export | Best features behind $49.99/yr membership; typed-first |
| [Diarium](https://apps.apple.com/us/app/-/id1436044299) | iPhone, iPad, Mac, Windows, Android | Drawings as attachments | Local-first; optional sync through the user's own cloud (iCloud, OneDrive, Google Drive, Dropbox, WebDAV) | No-account sync via user-owned storage, one-time purchase, timeline and map views, Apple Journal and Day One import | Users report weak in-entry search; drawing is an attachment |
| [Stoic](https://apps.apple.com/us/app/stoic/id1312926037) | iPhone, iPad, Mac, Watch | None | iCloud backup | Morning preparation and evening reflection as a ritual, daily quote and question, CBT thought-dump templates, calm black-and-white design | Users ask for a quicker way to just write; many premium and AI tiers |
| [Daylio](https://daylio.net/) | iOS, Android (no web) | None | Backups rely on Google/Apple cloud, not E2EE | Two-tap mood + activity logging, Year in Pixels, correlations between activities and mood, goals and streaks | Micro-journal only; PIN lock and advanced stats are paid |
| GoodNotes / Notability | iPad, Mac, iPhone, Windows/Android (GoodNotes) | Best-in-class ink: paper templates, lasso, shape snap, handwriting search | iCloud or vendor cloud | Paper styles (lined, dotted, grid), pen presets, zoom-to-write strip, searchable handwriting, page thumbnails | Notebooks, not journals: no daily rhythm, prompts, mood or memories |
| Five Minute Journal | iOS, Android | None | Vendor cloud | Fixed morning template: 3 gratitudes, what would make today great, an affirmation | Narrow; typed only |

GoodNotes, Notability and Five Minute Journal rows are from general product knowledge rather than pages opened for this PRD.

### Lessons for Morning Pages

1. **Make the pen the page, not an attachment.** Every journal app above treats ink as an embedded drawing. Note apps prove that a full-page ink canvas with paper templates is what pen users want.
2. **Trust is the feature.** Day One and Diarium win loyalty on reliability and privacy; Apple Journal's lost entries are the reason this project exists.
3. **Rituals beat blank pages.** Stoic's morning/evening bookends and Five Minute Journal's template reduce the cost of starting; they should be optional overlays, never a forced flow.
4. **Low-effort signals compound.** Daylio's two-tap mood and Year in Pixels give insight with almost no work; a one-tap mood at the end of a morning page is the right weight.
5. **Memories bring people back.** On This Day resurfacing (Day One) and map/timeline views (Apple Journal, Diarium) turn an archive into something worth opening.
6. **Own-storage backup is the answer to "local but safe".** Diarium shows users accept syncing through storage they already control; Morning Pages applies this as file backups, not live sync.
7. **Avoid subscription creep.** Reviews across Day One, Journey, Stoic and Daylio complain about features moving behind paywalls. Morning Pages is free and self-hosted.

## 3. Users and use cases

The primary user is the owner: a daily morning journaler on iPad with Apple Pencil. Every design decision is tested against the first five minutes after waking.

### Personas

| Persona | Context | Needs | Success looks like |
| --- | --- | --- | --- |
| **The morning writer** (primary) | iPad + Apple Pencil, in bed or at a desk, 5 to 20 minutes, half awake | Instant blank page, pen that feels like paper, zero risk of loss, no decisions | Writes daily for months without thinking about the app |
| **The reflector** | Same user on a weekend, revisiting old entries | Browse by calendar, search handwriting, see patterns in mood and themes | Finds an entry from 3 months ago in under 10 seconds |
| **The visitor** | Anyone who opens the public URL | Understand it is private and local in one screen; start writing without sign-up | Adds to Home Screen and writes a first page in under 1 minute |
| **The occasional typist** | iPhone, Mac or iPad with keyboard | Type an entry when the pen isn't at hand | Typed and handwritten entries live side by side in one timeline |

### Key use cases

1. Write a free-form handwritten morning page (core).
2. Answer a guided morning template: gratitude, intention, worries to let go.
3. Log a mood and energy level in one tap.
4. Add a photo or sticker to a page.
5. Re-read yesterday's page and "On this day" entries from previous years.
6. Search all entries, including handwriting, for a word or person.
7. Back up the whole journal to a file, and restore it on a new iPad.
8. Lock the journal so someone picking up the iPad cannot read it.

### The morning journey (target flow)

1. Tap the Home Screen icon. The app opens directly to **Today's page** (or a Face ID / passcode unlock if the lock is on, see Section 8).
2. The page is already set to the user's default paper and pen. A soft prompt of the day sits at the top, dismissible with a tap.
3. Pencil touches the screen: ink appears immediately. Fingers scroll and zoom; the palm rests without marking.
4. Each stroke is saved on pen-up. A subtle "saved" dot confirms durability; there is no Save button.
5. When the page fills, a new page appears below (continuous scroll) or with a swipe (paged mode).
6. Optional close-out: one-tap mood, energy and a three-word summary of the day.
7. Closing the app, switching apps or the iPad sleeping loses nothing. Re-opening returns to the exact scroll position and tool.
8. Once a week, a gentle banner offers "Back up your journal" if the last backup is older than 7 days.

## 4. Handwriting canvas and Apple Pencil

The canvas must feel like paper: ink appears under the nib with no visible lag, strokes are smooth and pressure-sensitive, and the palm never leaves marks. iPad Safari now exposes the APIs to do this well: pointer events with pressure and tilt, plus [getCoalescedEvents and getPredictedEvents since Safari 18.2](https://caniuse.com/mdn-api_pointerevent_getpredictedevents), and [Apple Pencil hover events](https://bugs.webkit.org/show_bug.cgi?id=296943).

### 4.1 Input handling (P0)

| ID | Requirement |
| --- | --- |
| PEN-1 | Use Pointer Events only. Draw when `pointerType === "pen"`; ignore `touch` for drawing by default (**palm rejection by input type**). |
| PEN-2 | Canvas sets `touch-action: none` for pen input and disables text selection, the iOS callout menu, double-tap zoom and the Scribble text-insertion overlay on the drawing surface. |
| PEN-3 | Read `getCoalescedEvents()` on every `pointermove` so all high-frequency Pencil samples (up to 240 Hz) become stroke points, not just one per frame. Fall back to the event itself when the list is empty. |
| PEN-4 | Render a short predicted tail from `getPredictedEvents()` on the live layer, replaced by real points on the next event, to cut perceived latency. |
| PEN-5 | Capture per point: x, y, pressure (0 to 1), `altitudeAngle`/`azimuthAngle` (or `tiltX`/`tiltY`), and a timestamp. Clamp pressure; treat exactly 0 on a pen down as a default of 0.5. |
| PEN-6 | Use `setPointerCapture` so a stroke continues if the nib slides off the canvas edge; end strokes on `pointerup`, `pointercancel` and `lostpointercapture`. |
| PEN-7 | Fingers: one finger scrolls the page, two fingers pinch-zoom and pan. A setting "Draw with finger" enables finger ink for users without a Pencil. |
| PEN-8 | Apple Pencil hover (supported iPads): show a ghost nib preview of colour and size before contact, using `pointermove` with no buttons pressed. |
| PEN-9 | Work equally with Apple Pencil (1st gen, 2nd gen, USB-C, Pro) and third-party styluses; never assume a pressure range. |

### 4.2 Rendering

| ID | Requirement |
| --- | --- |
| INK-1 | Two-layer canvas: a **live layer** for the stroke in progress, redrawn every frame; a **committed layer** (bitmap cache per page tile) for finished strokes. |
| INK-2 | Strokes are rendered as variable-width outlines (pressure-to-width curve with smoothing and tapering, e.g. the perfect-freehand approach), filled as polygons, so ink looks like a fountain pen rather than a chain of line segments. |
| INK-3 | Render at `devicePixelRatio`; keep 120 Hz ProMotion smooth by doing per-frame work in `requestAnimationFrame` and keeping the live layer cheap. |
| INK-4 | Vector source of truth: strokes are stored as points, never only as pixels, so pages re-render crisply at any zoom and export to SVG/PDF. |
| INK-5 | Pages are tiled; only visible tiles are rendered, so a 50-page entry scrolls as smoothly as a 1-page entry. |

### 4.3 Tools

| Tool | Behaviour | Priority |
| --- | --- | --- |
| Fountain pen | Pressure-sensitive width with tapered ends; the default | P0 |
| Ballpoint | Near-constant width, slight pressure response | P0 |
| Pencil | Textured, tilt-sensitive: shading when the Pencil is tilted | P1 |
| Highlighter | Translucent, drawn beneath ink, straight-line snap on hold | P1 |
| Eraser | Stroke eraser (removes whole strokes) by default; pixel/partial eraser as an option | P0 |
| Lasso | Select strokes to move, resize, recolour, copy or delete | P1 |
| Shape snap | Hold at the end of a stroke to snap to a line, circle, rectangle or arrow | P2 |
| Undo / redo | Unlimited per session; two-finger tap = undo, three-finger tap = redo | P0 |
| Pen presets | 4 favourite pen + colour + size combinations pinned to a floating toolbar | P0 |
| Colours | Curated ink palette (black, blue-black, sepia, forest, crimson, plus 3 custom) | P0 |
| Ruler | Draggable on-screen ruler for straight lines | P2 |

The toolbar is a compact floating pill that can be docked left, right or top, collapses to a single dot, and never covers the writing line. Apple Pencil double-tap and squeeze are not exposed to web pages, so tool switching relies on the toolbar, a long-press radial menu, and the finger-tap gestures above.

### 4.4 Paper

- **Paper styles (P0):** blank, lined (narrow / college / wide), dotted, grid, and Cornell. **P1:** handwriting guide (3-line), music staff, kraft and cream tints.
- **Page modes:** continuous vertical scroll (default) or fixed paged notebook with swipe; page size A5, A4 or "fit screen".
- **Dark paper:** charcoal paper with light ink for early-morning use, with automatic ink colour inversion so pages written in either mode stay readable in both.
- **Margin and date header:** each page carries a printed date header ("Friday, 13 November 2026") and an optional left margin for notes.

### 4.5 Edge cases that must not lose ink

- iPad sleeps, app is backgrounded or Split View is resized mid-stroke: the partial stroke is committed on `pointercancel`/`visibilitychange`.
- Orientation change: the page re-flows the viewport only; stroke coordinates are in page space and never shift.
- Pencil battery dies mid-stroke: treated as `pointercancel`, stroke kept.

## 5. Entries, journals, templates and media

An **entry** is one dated sitting made of one or more pages; a page can mix ink, typed text blocks, images and stickers on the same canvas. Entries belong to a **journal**.

### 5.1 Data model (conceptual)

| Object | Key fields | Notes |
| --- | --- | --- |
| Journal | id, name, colour, cover, default paper, default template, sort order | e.g. Morning Pages, Dreams, Gratitude, Travel |
| Entry | id, journalId, createdAt, entryDate, title, tags\[\], mood, energy, location? (opt-in), weather? (manual), starred, deletedAt | entryDate can differ from createdAt (back-dating) |
| Page | id, entryId, index, paper style, size, thumbnail |  |
| Stroke | id, pageId, tool, colour, width, points\[x,y,p,tilt,t\], createdAt, deleted flag | Append-only log; erasing writes a tombstone |
| Block | id, pageId, type (text, image, sticker, prompt, checklist), frame, content | Placed on the canvas at a position |
| Asset | id, blob (image/audio), mime, size, hash | Deduplicated by hash |
| Revision | id, entryId, snapshot pointer, createdAt | For version history |

### 5.2 Entry and journal features

| ID | Feature | Priority |
| --- | --- | --- |
| ENT-1 | **Today page on launch:** opening the app lands on today's entry in the default journal, creating it on first stroke (no empty entries are saved). | P0 |
| ENT-2 | Multiple entries per day; a "+" starts a new one. | P0 |
| ENT-3 | Multiple journals with name, colour and cover; move or copy entries between journals. | P1 |
| ENT-4 | Entry title (optional), auto-suggested from the first handwritten line once recognised (Section 9). | P1 |
| ENT-5 | Tags (#gratitude, #work), people (@Ma) and star/favourite. | P1 |
| ENT-6 | Back-date or forward-date an entry. | P1 |
| ENT-7 | **Recently Deleted** for 30 days, with restore. | P0 |
| ENT-8 | **Version history:** automatic snapshots per entry (every 10 minutes of editing and at close); browse and restore any version. | P1 |
| ENT-9 | Page thumbnails strip for long entries; reorder, duplicate or delete pages. | P1 |

### 5.3 Templates and prompts

Templates are optional overlays printed on the paper (headings, boxes, lines) that the user handwrites into. They never replace free writing.

| Template | Structure | Inspired by |
| --- | --- | --- |
| Morning Pages (default) | Blank lined pages; optional goal of 3 pages with a quiet progress marker | Julia Cameron's practice |
| Five-minute morning | 3 things I'm grateful for · What would make today great · Daily affirmation | Five Minute Journal |
| Prepare for the day | Intention · Top 3 priorities · One thing I'm anxious about · How I want to show up | Stoic morning preparation |
| Brain dump | Full page, then a box: "What's actually in my control?" | CBT thought dump |
| Dream log | What happened · Feelings · Symbols · Waking thought | Dream journals |
| Weekly review (Sunday) | Wins · Lessons · Next week's focus · Mood strip for the week | Bullet journal |
| Custom | User builds a template from blocks: heading, ruled box, checklist, scale 1-10, mood row |  |

**Prompts (P1):** a bundled library of about 365 prompts grouped into packs (Gratitude, Self-discovery, Relationships, Career, Creativity, Stoic questions, Letting go). One prompt of the day appears faintly at the top of the page; tap to shuffle, swipe to dismiss. Prompts ship inside the app, so nothing is fetched from a server. Users can write their own packs.

### 5.4 Typed text and other media

| ID | Feature | Priority |
| --- | --- | --- |
| MED-1 | **Text block:** tap the "T" tool to place a typed text box on the page; supports Apple Scribble (handwriting converted to text by iPadOS) inside the box. | P1 |
| MED-2 | **Typed entry mode:** a clean, distraction-free typing view for keyboard days (iPhone, Mac). Typed and inked entries share one timeline. | P1 |
| MED-3 | **Photos:** insert from Photos or camera; resize, rotate, crop; optional polaroid frame. Images compressed to max 2048 px, WebP/JPEG. | P1 |
| MED-4 | **Stickers and washi tape:** a bundled set of original stickers, date stamps and tape strips for decorating pages. | P2 |
| MED-5 | **Voice note:** record audio attached to an entry (MediaRecorder); optional on-device transcription where the browser supports it. | P2 |
| MED-6 | Checklists on a page (habit ticks, to-dos) that stay tappable. | P2 |
| MED-7 | Paste images and text from the clipboard; drag and drop from other apps in Split View. | P2 |

## 6. Creative and wellbeing features

These features turn a reliable notebook into a habit worth keeping. All of them run on-device and all are optional; each can be switched off in Settings.

### 6.1 Morning ritual

| ID | Feature | Description | Priority |
| --- | --- | --- | --- |
| RIT-1 | **Morning mode** | Before 11:00 local time the app opens in a warm, low-contrast theme with dark paper available, larger nib and no badges or banners. | P1 |
| RIT-2 | **Gentle start** | An optional 60-second breathing circle or a single quote before the page appears; skippable with any Pencil touch. | P2 |
| RIT-3 | **Page goal** | Optional target (e.g. 3 pages or 15 minutes). A thin progress line fills along the page edge; no pop-ups. | P1 |
| RIT-4 | **Focus mode** | Hides toolbar and chrome entirely; a Pencil hover or two-finger tap brings it back. | P1 |
| RIT-5 | **Timer** | Quiet sprint timer (5, 10, 15, 20 min) with a soft visual cue at the end, never a sound by default. | P2 |
| RIT-6 | **Close-out card** | After writing: one-tap mood (5-point), energy (low/med/high), sleep quality, and an optional "one word for today". | P1 |
| RIT-7 | **Evening bookend** | Optional evening check-in that shows the morning's intention and asks how it went (Stoic-style). | P2 |

### 6.2 Memories and rediscovery

| ID | Feature | Description | Priority |
| --- | --- | --- | --- |
| MEM-1 | **On This Day** | A card on the home screen showing pages from the same date in previous months and years. | P1 |
| MEM-2 | **Calendar view** | Month grid with a dot or thumbnail per day, tinted by journal colour or mood. | P0 |
| MEM-3 | **Timeline** | Infinite scroll of entry thumbnails, newest first, with date jumps. | P0 |
| MEM-4 | **Year in Pixels** | 12 x 31 grid, each day coloured by mood; tap a pixel to open that day's entry. | P1 |
| MEM-5 | **Random page** | "Surprise me" opens a random past entry. | P2 |
| MEM-6 | **Letters to future self** | Write a sealed entry that stays locked and hidden until a chosen date, then appears on that morning. | P2 |
| MEM-7 | **Photo wall** | A grid of every image added to the journal. | P2 |

### 6.3 Habit and insight (calm, never gamified)

| ID | Feature | Description | Priority |
| --- | --- | --- | --- |
| INS-1 | **Streak** | Current and longest streak of days written, shown quietly. A "rest day" token (2 per month) keeps a streak alive without guilt. | P1 |
| INS-2 | **Stats** | Days written, pages written, total ink length ("you've written 1.2 km of ink"), favourite writing time, average session length. | P2 |
| INS-3 | **Mood trends** | Line chart of mood over 30/90/365 days; mood by weekday; correlation between tags or sleep and mood (Daylio-style). | P2 |
| INS-4 | **Word cloud** | Most frequent words from recognised handwriting and typed text over a period. | P3 |
| INS-5 | **Monthly recap** | On the 1st, an auto-made page: entries count, mood strip, starred pages and three random excerpts. | P2 |

### 6.4 Personalisation

- Themes: Paper (cream), Linen (white), Night (charcoal), Sepia, and High Contrast.
- Journal covers: colour, texture (leather, cloth, kraft), or the user's own photo.
- Typography choice for UI and typed text (serif or sans), with Dynamic Type sizes.
- App icon variants for the Home Screen manifest (set at install time).

### 6.5 Optional on-device intelligence (later)

No text or ink ever leaves the device for AI processing. If the browser exposes on-device language or handwriting models (e.g. a future built-in Prompt or Handwriting Recognition API), the app may offer: a one-line summary of an entry, "go deeper" follow-up questions, and theme detection across a month. If not available, these features simply do not appear. (P3)

### 6.6 Reminders

Web notifications on iPad require the app to be installed to the Home Screen, and must be triggered by a server push, which conflicts with the no-server principle. Morning Pages therefore offers: (a) an **"Add to Calendar" .ics file** that creates a recurring daily reminder in the iPad's own Calendar app, and (b) a Shortcuts recipe in the help page. No push server is built. (P2)

## 7. Local storage, durability and backup

All journal data lives in the browser's IndexedDB on the iPad, written stroke by stroke, and the app must be installed to the Home Screen to be safe from Safari's storage eviction. Backups are user-owned files; there is no server copy.

### 7.1 Why Home Screen install is mandatory for real use

- In a normal Safari tab, script-writable storage (IndexedDB, Cache API) can be [evicted after seven days of Safari use without interaction with the site](https://web.dev/articles/storage-for-the-web). Home Screen web apps [are not part of Safari and have their own counter of days of use](https://www.theregister.com/2020/03/26/apple_relax_were_not_totally/), so daily use keeps data safe.
- Per [WebKit's storage policy](https://webkit.org/?p=14403), WebKit evicts an origin's data least-recently-used first, and exempts origins in persistent mode; whether `navigator.storage.persist()` is granted is decided by heuristics, one of which is running as a Home Screen web app. A standalone web app gets the same quota as a browser app, up to 60% of total disk per origin.
- A Home Screen app has a **separate storage container** from Safari tabs. Pages written in a Safari tab will not appear in the installed app.
- **Deleting the Home Screen icon deletes the journal.** The app must say this plainly during onboarding and in Settings.

| ID | Requirement | Priority |
| --- | --- | --- |
| STO-1 | On first visit in a Safari tab, show a one-screen guide: "Add to Home Screen to keep your journal safe" with the Share → Add to Home Screen steps. Writing in a tab is allowed but marked **"Trial mode, not saved long-term"**. | P0 |
| STO-2 | If trial-mode entries exist, offer "Move my pages into the app" via a one-tap export/import file handoff. | P1 |
| STO-3 | Call `navigator.storage.persist()` on install and on each launch until granted; show status in Settings ("Storage: protected" or "Storage: best effort, back up regularly"). | P0 |
| STO-4 | Show used and available space from `navigator.storage.estimate()`; warn at 80% of quota and handle `QuotaExceededError` without losing the stroke in progress. | P0 |

### 7.2 The never-lose-a-stroke guarantee

| ID | Requirement | Priority |
| --- | --- | --- |
| DUR-1 | **Write on pen-up.** Each completed stroke is appended to IndexedDB in its own transaction within 1 s of `pointerup`. The UI shows a saved dot only after the transaction's `complete` event. | P0 |
| DUR-2 | **Append-only stroke log.** Strokes are never rewritten; erase and move are new records (tombstones and transforms). A corrupted write can lose at most one stroke, never a page. | P0 |
| DUR-3 | **Flush on exit.** On `visibilitychange` (hidden) and `pagehide`, commit any in-progress stroke and pending writes. | P0 |
| DUR-4 | **Crash recovery.** In-flight points are mirrored every 250 ms to a small recovery record; on next launch, an unfinished stroke is restored. | P1 |
| DUR-5 | **Read-after-write verification** in development builds and a nightly self-check in production: counts and checksums per page are compared with the log. | P1 |
| DUR-6 | **Schema migrations** run only after an automatic pre-migration backup file is offered; migrations are idempotent and tested on real data snapshots. | P0 |
| DUR-7 | **Multi-tab safety.** A `BroadcastChannel` / Web Locks leader election ensures only one tab writes to an entry at a time; others open read-only. | P1 |
| DUR-8 | No data in `localStorage` except UI preferences; nothing important in memory only. | P0 |

### 7.3 Backup and restore (user-owned files)

Because Safari does not support the File System Access API, the app cannot silently write to a folder; backups are explicit, one-tap actions that hand a file to iPadOS.

| ID | Requirement | Priority |
| --- | --- | --- |
| BAK-1 | **One-tap full backup** to a single `.morningpages` file (a zip of JSON records + asset files + manifest with checksums). Delivered through the Web Share sheet (Save to Files → On My iPad, a USB drive, AirDrop to a Mac) or a download link. | P0 |
| BAK-2 | **Backup reminders:** a quiet banner when the last backup is older than 7 days (configurable 1 to 30). Backup date shown in Settings. | P0 |
| BAK-3 | **Encrypted backups** by default when the journal lock is on (AES-GCM with a key derived from the passphrase). | P1 |
| BAK-4 | **Restore** from a backup file: preview contents (entries, date range, size), then **merge** (by record id, newest wins) or **replace**. | P0 |
| BAK-5 | **Incremental backups** containing only changes since the last backup, chained to a full backup. | P2 |
| BAK-6 | **Bring-your-own-storage (optional, later):** push encrypted backup files to a WebDAV server or a folder the user controls. Off by default, never to a Morning Pages server. | P3 |

### 7.4 Export and import

| Format | Contents | Priority |
| --- | --- | --- |
| PDF | Selected entries or a date range, vector ink, date headers; print-ready A5/A4 | P1 |
| PNG / SVG | Single page as image | P1 |
| Markdown + images | Typed text and recognised handwriting text, with page images alongside | P2 |
| JSON (open schema) | Full fidelity, documented schema so data outlives the app | P0 (part of backup) |
| Import: Day One JSON export | Typed entries, dates, tags, photos | P3 |
| Import: images / PDF as pages | Use a photo of a paper page or a PDF as a page background to write on | P2 |

## 8. Privacy and security

The website is a static bundle of files; after it loads, it makes no network requests that carry journal content, and the server never sees a single entry. Encryption at rest and a Face ID lock are optional layers on top.

### 8.1 Zero-network by design

| ID | Requirement | Priority |
| --- | --- | --- |
| PRI-1 | Static hosting only (any CDN or static host). No backend, database, accounts, cookies or API. | P0 |
| PRI-2 | Strict Content Security Policy: `default-src 'self'`, `connect-src 'self'` (service-worker updates only), no inline scripts, no third-party origins, `frame-ancestors 'none'`. | P0 |
| PRI-3 | No analytics, crash reporting, fonts or scripts from third parties. All fonts, icons and prompts are bundled. | P0 |
| PRI-4 | Fully offline after first load via a service worker; the app works in Airplane Mode. | P0 |
| PRI-5 | A plain-language privacy page in the app: what is stored, where, and that deleting the Home Screen app deletes it. | P0 |
| PRI-6 | Source code public (e.g. GitHub) so anyone can verify the no-network claim; builds are reproducible. | P1 |
| PRI-7 | Location and weather are never collected automatically; the user may type a place or pick a weather icon manually. | P0 |

### 8.2 Journal lock and encryption at rest

IndexedDB on iPadOS already sits inside the device's own data protection (encrypted when the iPad is locked). The app-level lock protects against someone using the unlocked iPad.

| ID | Requirement | Priority |
| --- | --- | --- |
| SEC-1 | **Envelope encryption:** a random 256-bit data key encrypts every record and asset with AES-GCM via Web Crypto. The data key is stored only in wrapped (encrypted) form. | P1 |
| SEC-2 | **Passphrase unlock:** the data key is wrapped with a key derived from the user's passphrase (PBKDF2-SHA-256 with at least 600,000 iterations, or Argon2id via WebAssembly). | P1 |
| SEC-3 | **Face ID / Touch ID unlock:** register a passkey for the site and use the [WebAuthn PRF extension](https://www.corbado.com/blog/passkeys-prf-webauthn) to derive a second wrapping key, so unlocking is a glance. PRF on iOS/iPadOS 18.0 to 18.3 had data-loss bugs fixed in 18.4, so the passphrase always remains as a fallback. | P2 |
| SEC-4 | **Recovery key:** a printable 24-word recovery code shown once at setup, which also unwraps the data key. Losing passphrase and recovery code means losing the journal; the app says so clearly. | P1 |
| SEC-5 | **Auto-lock** after N minutes in the background (default 5) and on demand from the toolbar. The decrypted key lives only in memory. | P1 |
| SEC-6 | **Privacy curtain:** on `visibilitychange` the canvas is blurred (best effort, since iPadOS may snapshot the app switcher before the event). | P2 |
| SEC-7 | **Hidden entries:** mark an entry as private so it shows as a blurred card in timeline and search until tapped and re-authenticated. | P2 |
| SEC-8 | **Panic wipe:** Settings action that deletes all local data after typing the journal name, with a final backup offer. | P2 |

### 8.3 Threat model summary

| Threat | Mitigation |
| --- | --- |
| Vendor or server breach | Nothing to breach: no server-side data. |
| Someone picks up the unlocked iPad | App lock, auto-lock, hidden entries. |
| Backup file found on a drive | Encrypted backups when the lock is on. |
| Malicious update to the hosted site | CSP, open source, Subresource Integrity, versioned releases; service worker shows "Update available" and the user chooses when to apply. |
| Data loss from eviction or app deletion | Home Screen install, persist(), backup reminders (Section 7). |

## 9. Search, organisation and handwriting recognition

Search works on day one over dates, tags, moods, titles and typed text; searching inside handwriting is a later, on-device feature whose feasibility must be proven in a spike before it is promised.

### 9.1 Organisation

| ID | Feature | Priority |
| --- | --- | --- |
| ORG-1 | Browse by journal, calendar, timeline (Section 6.2) | P0 |
| ORG-2 | Tags and people with auto-complete; tag manager to rename and merge | P1 |
| ORG-3 | Starred entries and smart filters: "Starred", "This week", "Low mood days", "With photos", "Untagged" | P1 |
| ORG-4 | Saved searches pinned to the sidebar | P2 |

### 9.2 Search

| ID | Feature | Priority |
| --- | --- | --- |
| SRC-1 | Full-text search over titles, typed blocks, tags and prompts, using a local inverted index (e.g. MiniSearch/FlexSearch) stored in IndexedDB | P1 |
| SRC-2 | Filters combinable: journal, date range, tag(s) with AND/OR, mood, has-photo, template | P1 |
| SRC-3 | Results show the page thumbnail with the matched region highlighted, and jump to that page | P1 |
| SRC-4 | **Handwriting search:** strokes are recognised to text in the background and added to the index; results highlight the matching ink | P2 |
| SRC-5 | Search within the current entry (find on page) | P2 |

### 9.3 Handwriting recognition approach

- **Must run on-device.** No ink is sent to a cloud OCR service.
- Recognition runs in a Web Worker during idle time (after the page is closed, or when the iPad is charging and the app is open), never while the user is writing.
- **Spike before commit:** evaluate (a) a bundled online-handwriting model (stroke-based, WebAssembly or WebGPU) for accuracy on the owner's own handwriting and for bundle size (target under 25 MB, cached once); (b) the W3C Handwriting Recognition API where a browser provides it; (c) image OCR of rendered pages as a fallback.
- Recognised text is stored as a hidden layer per page, with per-word bounding boxes for highlighting; users can correct a word, and corrections are kept.
- The recognised text powers search, entry title suggestions, word clouds and Markdown export.
- **Manual alternative (P1):** a "Convert selection to text" lasso action that uses Apple Scribble in a text box, giving users a reliable path even if automatic recognition is poor.

## 10. UX, visual design and accessibility

The interface should disappear while writing and feel like a well-made paper notebook the rest of the time: warm paper tones, a serif accent face, generous whitespace, and controls only where the hand expects them.

### 10.1 Screens

| Screen | Purpose | Key elements |
| --- | --- | --- |
| **Today / Writing canvas** | Default on launch; where 90% of time is spent | Full-bleed paper, floating tool pill, date header, prompt line, saved dot, page-goal edge line |
| **Home (Library)** | Overview when the user wants to look back | Journal shelf (covers), On This Day card, streak, calendar strip, "Continue today" button |
| **Calendar** | Navigate by date | Month grid with thumbnails or mood colours; Year in Pixels toggle |
| **Timeline** | Scroll through entries | Thumbnails, dates, tags, mood chips |
| **Search** | Find anything | Query bar, filter chips, results with highlighted thumbnails |
| **Entry detail** | Read and edit a past entry | Pages, metadata panel (tags, mood, journal), version history |
| **Insights** | Patterns over time | Streak, stats, mood chart, monthly recaps |
| **Settings** | Control and safety | Storage status, Backup now, last backup date, lock and encryption, paper and pen defaults, themes, prompts, export, privacy page, about |
| **Onboarding** (first run) | Install and trust | 3 screens: "Your journal stays on this iPad" → "Add to Home Screen" → "Pick your paper and pen" |

Navigation: a collapsible sidebar on iPad landscape (Today, Journals, Calendar, Timeline, Search, Insights, Settings); a bottom tab bar on iPhone and narrow Split View.

### 10.2 Interaction rules

- The Pencil always writes; it never accidentally opens menus. UI controls respond to Pencil taps only on the toolbar.
- No modal dialogs on launch. Banners (backup, update) appear only on the Home screen, never on the writing canvas.
- Every destructive action is undoable or goes through Recently Deleted.
- Haptics are not available to web apps on iPad, so feedback is visual: a soft ink-blot animation on save, subtle toolbar state changes.
- Landscape and portrait fully supported; Stage Manager and Split View windows down to 320 px wide.
- Keyboard shortcuts with a hardware keyboard: ⌘N new entry, ⌘F search, ⌘Z / ⇧⌘Z undo/redo, ⌘B backup.

### 10.3 Visual design direction

- **Palette:** paper cream `#F7F3EA`, ink blue-black `#1E2A3A`, accent terracotta `#C2653A`, muted sage for success. Night theme on charcoal `#1B1C1E`.
- **Type:** a literary serif for headings and dates (e.g. Fraunces or Newsreader, self-hosted), a humanist sans for UI (system font).
- **Motion:** page turns and transitions under 200 ms, using View Transitions; honour Reduce Motion.
- **Texture:** optional subtle paper grain on the canvas background, rendered once and cached.

### 10.4 Accessibility (WCAG 2.2 AA)

- All UI controls reachable by VoiceOver with labels; the canvas announces the entry date and page count, and recognised text where available.
- Text contrast at least 4.5:1 in every theme; touch targets at least 44 x 44 pt.
- Dynamic Type and browser zoom respected for all UI text.
- Reduce Motion and Reduce Transparency honoured via media queries.
- Colour is never the only signal (mood uses shape + colour).
- Full typed-entry mode for users who cannot use a pen.

## 11. Technical architecture

Morning Pages is an installable Progressive Web App: a static, offline-first bundle whose ink engine writes strokes straight into IndexedDB, with heavier work (search indexing, recognition, export, encryption of backups) pushed to Web Workers so the writing thread is never blocked.

&#91;embedded content: save pipeline and background workers\]

The writing path (top row) never waits on storage; durability is confirmed asynchronously by the saved dot, and all heavy work reads from IndexedDB in workers.

### 11.1 Recommended stack

| Layer | Choice | Why |
| --- | --- | --- |
| Language / build | TypeScript + Vite | Fast builds, small output, easy static deploy |
| UI framework | Svelte 5 or Preact | Small runtime; the canvas is custom anyway |
| Ink engine | Custom Canvas 2D renderer + `perfect-freehand` for stroke outlines | Pressure-sensitive outlines, proven on iPad; WebGL/WebGPU only if profiling demands it |
| Storage | IndexedDB via Dexie.js | Transactions, indexes, schema versioning, blob support |
| Offline | Service worker (Workbox), precached app shell, update prompt | Works in Airplane Mode; user controls updates |
| Search | MiniSearch index persisted in IndexedDB | Small, client-side, incremental |
| Crypto | Web Crypto (AES-GCM, PBKDF2, HKDF) + WebAuthn PRF | Native, no third-party crypto code |
| Backup / zip | fflate in a Worker | Fast streaming zip on device |
| PDF export | pdf-lib, strokes written as vector paths | Crisp printable output |
| Hosting | Any static host (Cloudflare Pages, Netlify, GitHub Pages) over HTTPS | No server code; cheap or free |
| Testing | Vitest (unit), Playwright with WebKit (e2e), manual iPad matrix | Safari is the target engine |

### 11.2 Module boundaries

- **Input** (pointer events → normalised samples) → **Stroke builder** (smoothing, outline) → **Renderer** (live + committed layers, tiles).
- **Store** (append-only log, entries, assets, settings) with a single write queue that guarantees ordering and reports durability back to the UI.
- **Workers:** indexer, recogniser, exporter/backup, thumbnail generator.
- **Shell:** routing, screens, onboarding, settings, service-worker lifecycle.

### 11.3 iPad Safari platform constraints

| Capability | Status on iPadOS Safari / Home Screen app | Impact on design |
| --- | --- | --- |
| Pointer Events with pressure, tilt, altitude/azimuth | Supported | Basis of the ink engine |
| `getCoalescedEvents()` / `getPredictedEvents()` | Supported since Safari 18.2 (early versions had a pointerId bug in coalesced events) | Smooth, low-latency strokes; feature-detect and fall back |
| Apple Pencil hover | Hover events are dispatched on hover-capable iPads | Nib preview (PEN-8) |
| Pencil double-tap / squeeze / barrel roll | Not exposed to the web | Toolbar and gestures instead |
| IndexedDB quota | Up to 60% of disk per origin for browser and Home Screen apps (iPadOS 17+) | Ample for years of ink |
| 7-day eviction | Applies to Safari tabs; Home Screen apps are counted separately | Home Screen install required (STO-1) |
| `navigator.storage.persist()` | Available; granted by heuristics | Request and show status |
| File System Access API | Not supported | Backups via Web Share / download |
| Web Share with files | Supported | Save backups to Files, AirDrop |
| WebAuthn PRF | Supported from iOS 18 (fixes in 18.4) | Face ID unlock (SEC-3) |
| Push notifications | Home Screen apps only, need a push server | Not used; calendar reminder instead |
| Haptics (Vibration API) | Not supported | Visual feedback only |

## 12. Non-functional requirements and testing

The budgets below are release gates: a build that misses a P0 budget on the reference iPad does not ship.

### 12.1 Performance and reliability budgets

| Metric | Target | Measured on |
| --- | --- | --- |
| Cold launch to writable page (installed app) | under 1.5 s | iPad Air (M1) and 9th-gen iPad (A13) |
| Pen-down to first ink pixel | under 1 frame (8 ms at 120 Hz, 16 ms at 60 Hz) of app work | ProMotion iPad Pro |
| Dropped frames while writing | under 1% over a 5-minute session | Same |
| Stroke persisted after pen-up | under 1 s (p99) | All devices |
| Data loss | 0 strokes across the durability test suite and 12 months of daily use |  |
| Open a 30-page entry | under 1 s to first visible page |  |
| Search over 2 years of entries | under 300 ms |  |
| Full backup of 1 year (est. 500 MB with photos) | under 60 s, without freezing the UI |  |
| Initial download (app shell) | under 400 KB gzipped, excluding optional recognition model |  |
| Storage per handwritten page | under 150 KB average (points delta-encoded, compressed) |  |

### 12.2 Compatibility

- **Primary:** iPadOS 18 and 26, Safari and Home Screen app, all Apple Pencil models.
- **Secondary:** iPhone Safari (typed mode, finger ink), macOS Safari and Chrome (typed mode, trackpad/mouse ink), Android Chrome with stylus (Samsung S Pen).
- Feature-detect every advanced API; degrade gracefully, never break writing.

### 12.3 Test plan

| Area | Approach |
| --- | --- |
| Durability torture tests | Automated: kill the tab mid-stroke, background the app, fill quota, simulate `pointercancel`, reload during writes; assert zero lost strokes. |
| Real-device writing | Weekly manual sessions on the iPad matrix with a written checklist (palm resting, fast scribbles, tiny text, long sessions). |
| Latency | High-speed phone video of pen and ink to measure end-to-end lag. |
| Backup round-trip | Every release: backup → wipe → restore → byte-for-byte compare of records and checksums. |
| Migrations | Run every schema migration against anonymised real journal snapshots. |
| Security | CSP verified in CI; network log during e2e must show zero requests after load; encryption unit tests with known vectors. |
| Accessibility | VoiceOver walkthrough of every screen; automated axe checks on non-canvas UI. |
| Dogfooding | The owner uses each build every morning for at least 2 weeks before it is called stable. |

## 13. Release plan

Ship a rock-solid writing core first (MVP), live with it daily, then layer rituals and memories (v1) and insight and search (v2). Each phase ends with a gate the owner must pass before the next begins.

Priority key: **P0** = MVP, **P1** = v1, **P2** = v2, **P3** = later / exploratory.

| Phase | Scope | Gate to exit |
| --- | --- | --- |
| **0. Spikes** | Ink latency prototype on iPad (coalesced + predicted events, perfect-freehand); IndexedDB durability torture test; Home Screen install + `persist()` behaviour; handwriting-recognition feasibility | Ink feels like paper to the owner; zero lost strokes in torture tests |
| **MVP (P0)** | Today page on launch; fountain pen, ballpoint, eraser, undo/redo, 4 presets, colours; lined/dotted/grid/blank paper; continuous scroll; stroke-level autosave and durability guarantees; calendar and timeline; Recently Deleted; onboarding with Add to Home Screen; storage status; one-tap backup + restore + reminders; offline service worker; strict CSP | 30 consecutive mornings of real use with no data loss and no workaround needed |
| **v1 (P1)** | Multiple journals; templates (Morning Pages, Five-minute, Prepare, Brain dump, Dream, Weekly review); prompt library; close-out mood/energy card; morning mode, focus mode, page goal; On This Day; Year in Pixels; streak with rest days; tags, people, stars; text blocks and photos; pencil and highlighter tools; lasso; version history; PDF/PNG/SVG export; journal lock with passphrase and encrypted backups; typed-entry mode | Owner prefers it over every other journal app; a second person installs and uses it unaided |
| **v2 (P2)** | Handwriting recognition and handwriting search; mood trends and stats; monthly recap; letters to future self; stickers and washi tape; voice notes; Face ID unlock via passkey PRF; hidden entries; incremental backups; image/PDF as page background; calendar-file reminders; shape snap; Markdown export | Handwriting search finds the owner's words with at least 85% recall on a test set |
| **Later (P3)** | On-device AI reflections; word cloud; Day One import; WebDAV/own-storage encrypted backup; Android stylus polish; localisation | Decided after v2 usage review |

## 14. Success metrics, risks and open questions

With no analytics by design, success is measured from the owner's own on-device stats and from the durability test suite, not from telemetry.

### 14.1 Success metrics

| Metric | Target | Source |
| --- | --- | --- |
| Data-loss incidents | 0 in 12 months | Owner's report + nightly self-check log |
| Morning journaling days | at least 25 of 30 days, sustained for 3 months | On-device streak stats |
| Time from icon tap to first stroke | under 3 s median | On-device timing (local only) |
| Backup freshness | last backup under 7 days old at least 90% of the time | Settings backup date |
| Owner satisfaction | "Would not go back" after 60 days | Self-assessment |
| Public visitors who install | Tracked only if the owner adds a privacy-respecting, cookie-less page counter to the landing page, never inside the app | Optional |

### 14.2 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| iPadOS evicts or loses IndexedDB data | Low when installed | Severe | Home Screen install, persist(), weekly backup reminders, restore tested every release |
| User deletes the Home Screen icon and loses everything | Medium | Severe | Clear onboarding warning, backup reminders, backups in Files survive app deletion |
| Ink latency in Safari feels worse than native apps | Medium | High | Phase 0 spike; predicted events; minimal live layer; WebGL fallback |
| WebKit regressions in pointer events (e.g. the coalesced-events pointerId bug in 18.2) | Medium | Medium | Feature detection, defensive fallbacks, test each iPadOS beta |
| On-device handwriting recognition too inaccurate or too large | High | Medium | Treated as v2 with a feasibility gate; manual Scribble conversion as fallback |
| Forgotten passphrase locks the owner out | Low | Severe | Recovery code, Face ID passkey, clear warnings; lock is optional |
| A compromised hosting account ships a malicious update | Low | High | Open source, SRI, versioned releases, user-approved service-worker updates |
| Scope creep delays a usable MVP | High | Medium | Strict P0 list; dogfood gate before v1 |

### 14.3 Open questions

- [ ] Name and domain: keep "Morning Pages" (also the name of Julia Cameron's practice) or choose a distinct name?
- [ ] Which iPad and Apple Pencil model is the reference device for performance budgets?
- [ ] Continuous scroll or paged notebook as the default page mode?
- [ ] Should the public site allow anyone to use it, or be personal with a simple landing page?
- [ ] Is a cross-device path needed later (e.g. iPhone reading), and if so is encrypted backup-file transfer enough or is own-storage sync (WebDAV) required?
- [ ] Handwriting recognition: accept a 15 to 25 MB on-device model download, or skip handwriting search?

### Sources

- [9to5Mac: Apple's Journal app is coming to iPad and Mac with big upgrades](https://9to5mac.com/2025/06/17/apples-journal-app-is-coming-to-ipad-and-mac-with-big-upgrades/)
- [Day One release notes](https://dayoneapp.com/releases)
- [Day One vs Journey (2026)](https://blog.mylifenote.ai/day-one-vs-journey/)
- [Diarium on the App Store](https://apps.apple.com/us/app/-/id1436044299)
- [Stoic on the App Store](https://apps.apple.com/us/app/stoic/id1312926037)
- [Daylio](https://daylio.net/)
- [WebKit: Updates to Storage Policy](https://webkit.org/?p=14403)
- [web.dev: Storage for the web](https://web.dev/articles/storage-for-the-web)
- [The Register: Apple on the 7-day storage cap and Home Screen apps](https://www.theregister.com/2020/03/26/apple_relax_were_not_totally/)
- [Can I use: PointerEvent getPredictedEvents](https://caniuse.com/mdn-api_pointerevent_getpredictedevents)
- [WebKit bug 296943: Apple Pencil Pro barrel roll, hover events](https://bugs.webkit.org/show_bug.cgi?id=296943)
- [Reading Apple Pencil pressure in the browser (DEV)](https://dev.to/sendotltd/reading-apple-pencil-pressure-in-the-browser-pointerevent-getcoalescedevents-and-the-2e23)
- [Corbado: Passkeys and WebAuthn PRF for end-to-end encryption](https://www.corbado.com/blog/passkeys-prf-webauthn)
