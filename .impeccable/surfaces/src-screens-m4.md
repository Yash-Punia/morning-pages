---
version: 1
slug: "src-screens-m4"
primary_target: "src/screens/Library.svelte"
related_targets: ["src/screens/Calendar.svelte", "src/screens/Timeline.svelte", "src/screens/Deleted.svelte", "src/screens/Onboarding.svelte", "src/ui/EntryRow.svelte", "src/ui/TrialStrip.svelte"]
---

# M4 screens: looking back, first run, safety

**Scope:**
- Library home, Calendar, Timeline, Recently Deleted (the reflector's screens);
- first-run Onboarding (three screens);
- the trial strip in Safari tabs;
- the Library's banner slot (update ready, storage).

The shell's direction contract (`src-app-svelte.md`) governs: the Bound Notebook, with no new visual world.

**Modes:** Library, Calendar and Timeline are Read; Recently Deleted is Operate; Onboarding is Persuade-lite, within the notebook world (one idea per screen, no marketing).

**Audience and moment:** the same person on a weekend, or later in the morning, deliberately looking back. Unhurried, but still half a notebook person: they want to *see their pages*, not manage records. Onboarding is the visitor's first minute, which must end in a written first line.

## Shape decisions (owner-confirmed in the M4 plan; assumptions marked)

- **Pages are the content.** Every entry shows its first page as a small thumbnail at true √2 page aspect, so the past reads as a stack of real pages, not a table. Titles come next (Fraunces is *not* used for titles in lists: the Lettered Date Rule keeps Fraunces for dates and screen titles), then the date and page count in Faded Ink.
- **Dates are lettered.** Month headings ("November 2026") and the Library's "Today" date are set in Fraunces, like a dated page header. Everything operable is Atkinson.
- **Ruled, never boxed.** Rows sit between hairline rules (The Ruled Page Rule). The calendar grid is a ruled table of days, not a grid of cards.
- **One mark.**
  - Calendar: today's cell carries the terracotta mark.
  - Library: the "Continue today" pill is the one primary action, an ink pill per the Buttons spec, not terracotta.
  - Days with entries are shown by their thumbnail; days without stay plain paper, so colour is never the only signal.
- **Library home, top to bottom:**
  1. the screen title;
  2. the banner slot (update ready, storage warning), as quiet rows with a terracotta-ink edge, like the M3 storage line;
  3. "Continue today": today's date in Fraunces, the entry's title or "Nothing written yet", and an ink pill;
  4. this week as a 7-day strip of day numbers. A day with writing shows a filled ink dot under it; today is underlined in terracotta-ink;
  5. "Recent mornings": ruled rows, newest first, the last 14, then a "See the timeline" link.
- **Calendar:**
  - the month in Fraunces, previous and next as 44px icon buttons, and a "Today" text button;
  - a 7-column ruled grid in a locale-aware first weekday. Each day holds its number and, if written, its newest entry's page thumbnail, with "+1" for more;
  - tapping a day selects it (Deep Linen) and lists its entries below as ruled rows.
- **Timeline:**
  - a month picker (`<input type="month">`) at the top as "Jump to";
  - entries grouped under sticky Fraunces month headings;
  - rows like the Library's, with a larger thumbnail, loaded a month at a time.
- **Entry row** (shared): thumbnail · title or "Untitled" (Faded Ink) · date and pages · a 44px "…" button opening a native popover menu with "Open" and "Delete…". Delete moves the entry to Recently Deleted at once, with a short undo line in the menu's place. *Assumption:* no confirm dialog, since it's reversible for 30 days (PRD 10.2, "undoable or through Recently Deleted").
- **Recently Deleted:**
  - an explanation line ("Deleted mornings are kept here for 30 days, then removed for good");
  - rows with "Deleted 3 days ago · gone on 12 December" and a "Restore" text button in Fired Terracotta;
  - empty state: "Nothing here. Deleted mornings wait here for 30 days."
- **Onboarding, three screens, one idea each:**
  - each has a Fraunces headline, one or two lede sentences, a primary ink pill, and "Step 2 of 3" in Faded Ink;
  - **(1)** "Your journal stays on this iPad": no account, nothing uploaded, and anonymous counts can be turned off;
  - **(2)** "Add it to your Home Screen": the Share → Add to Home Screen steps as a numbered list with the drawn share icon, and the plain warning that deleting the icon deletes the journal. In the installed app this becomes "You're in the app";
  - **(3)** "Pick your paper and pen": paper as radio rows, each with a tiny ruled swatch, and the starting pen as ballpoint or fountain. Then "Start writing" goes to Today.
  - No skip-everything trap: each screen also has a quiet "Skip" text link to Today.
- **Trial strip:** a full-width, single-line strip in Deep Linen at the very top in Safari tabs only: "Trial mode: pages in Safari aren't kept long-term." plus "Add to Home Screen" (a link to onboarding step 2). It is not dismissable but very quiet, Label size. It never covers the writing; on Today it takes its own row above the page.

## States and ranges
- **Entries:** 0 (first week) to ~1,000 (two years plus).
- **Titles:** 0–120 characters; ellipsis in rows.
- **Pages:** 1–20 per entry.
- **Thumbnails:** may be missing (old entries, a worker not yet run). Show paper-only, ruled in the entry's paper style.
- **Empty states** for each screen, in the quiet and warm voice. No illustrations.

## Constraints
- 44pt targets; 320 px wide in Split View (calendar cells shrink, thumbnails hide below ~420 px and days show a dot).
- Paper and Night themes.
- Reduce Motion.
- VoiceOver: calendar days are buttons labelled "Saturday 14 November, 2 entries".
- No new fonts or colours. Reuse `Icon.svelte`, adding `more`, `chevron-left`, `chevron-right`, `share`, `restore` and `plus` on the 24px grid.
