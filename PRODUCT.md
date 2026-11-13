# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the owner, the morning writer.** Journals every morning on an iPad Pro 12.9″ (6th gen) with Apple Pencil, in bed or at a desk, for 5 to 20 minutes, half awake. Needs an instant blank page, a pen that feels like paper, zero risk of loss and no decisions. Every design decision is tested against the first five minutes after waking.
- **The reflector.** The same person on a weekend, revisiting old entries by calendar, timeline and search.
- **The visitor.** Anyone who opens the public URL. Must understand in one screen that the journal is private and stays on the device, then install it to the Home Screen and write a first page in under a minute, with no sign-up.
- **The occasional typist.** Types an entry when the pen isn't at hand; typed and handwritten entries live side by side.

## Product Purpose

A private, handwriting-first morning journal that runs in the browser, is installed to the iPad Home Screen, and keeps every entry on the device. It exists because the owner's previous journal app intermittently lost handwritten entries, which destroyed trust in the habit. Success: the owner writes daily for months without thinking about the app, with zero data-loss incidents.

## Positioning

The page *is* the ink: a full-page Apple Pencil canvas, not a drawing attached to a typed entry. It is local-only, free, with no account and no subscription, and it promises that no stroke is ever lost. No leading journal app combines a first-class Pencil canvas with local-only storage and no subscription.

## Operating Context

- Launched from the Home Screen around 6 a.m. Opens straight to today's writable page in under 1.5 s, with no dialogs.
- Pencil writes; fingers scroll and zoom; the palm rests on the glass. Each stroke saves on pen-up, shown by a subtle saved dot; there is no Save button.
- Optional rituals: a dismissible prompt of the day, a one-tap mood and energy close-out, a weekly backup reminder.
- Backups are user-owned files shared through the iPad share sheet. Restoring on a new iPad is the only way to move a journal.
- Used in landscape and portrait, Stage Manager and Split View down to 320 px wide, sometimes with a hardware keyboard.

## Capabilities and Constraints

- Static web app (PWA) on Vercel. No backend, no accounts, journal content never leaves the device.
- Storage is per origin and per container: Safari-tab data does not appear in the installed app, and deleting the Home Screen icon deletes the journal. Onboarding and Settings must say both plainly.
- The one outbound channel is anonymous, allowlisted usage events (Umami). On by default, disclosed in onboarding and the privacy page, and switchable off in Settings.
- Banners (backup, update) appear only off the writing canvas. The Pencil never opens menus except on the toolbar.
- Undecided: the production domain, which must be fixed before real daily use.

## Brand Commitments

- **Name:** Morning Pages. The Home Screen label shows in full on the reference iPad.
- **Voice:** quiet and warm. Short, kind, plain sentences, like the endpaper of a good notebook. Never cute, never nagging; warnings are direct.
- **Visual direction pinned by the owner's PRD (§10.3):**
  - palette: paper cream `#F7F3EA`, ink blue-black `#1E2A3A`, terracotta accent `#C2653A`, muted sage for success, Night on charcoal `#1B1C1E`;
  - a literary serif for headings and dates (Fraunces, D-012), Atkinson Hyperlegible Next for UI;
  - motion under 200 ms, honouring Reduce Motion;
  - an optional subtle paper grain.

## Evidence on Hand

- The product requirements (`docs/Morning Pages — Journal Web App PRD.md`), technical design (`docs/TDD.md`) and decision log (`docs/Decisions.md`).
- M0 spike findings in `spikes/*/FINDINGS.md`: measured Pencil sample rate, ink pipeline and durability results on the reference iPad.
- The owner's real handwriting samples exist only locally (`spikes/samples/`, gitignored). They must never be committed, published or used as public imagery.
- There are no testimonials, user counts or press. Do not invent any.

## Product Principles

1. **Durability over features.** Every stroke persists within 1 s of pen-up. A feature that risks data loss does not ship.
2. **Pen first, keyboard second.** The default surface is ink; typing is supported, never required.
3. **Private by design.** No account, no server storage, no third-party scripts; the only telemetry is anonymous and can be switched off.
4. **Zero friction at 6 a.m.** No decisions, no dialogs, no waiting between waking and writing.
5. **Calm, not gamified.** Streaks and insights encourage; they never nag or shame. Open formats, no lock-in.

## Accessibility & Inclusion

- WCAG 2.2 AA. Text contrast ≥ 4.5:1 in every theme; touch targets ≥ 44 × 44 pt.
- VoiceOver labels on every control. The canvas announces the entry date and page count.
- Dynamic Type and browser zoom respected for UI text. Reduce Motion and Reduce Transparency honoured.
- Colour is never the only signal (mood uses shape and colour). A full typed-entry mode for people who can't use a pen.
