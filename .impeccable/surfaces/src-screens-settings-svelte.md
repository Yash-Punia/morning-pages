---
version: 1
slug: "src-screens-settings-svelte"
primary_target: "src/screens/Settings.svelte"
related_targets: ["src/screens/Restore.svelte","src/screens/Library.svelte"]
---

# M5 screens: backup, restore, the reminder

**Scope:**
- the Settings "Backup" section;
- the `/restore` screen;
- the Library's backup reminder banner.

The shell's direction contract (`src-app-svelte.md`) governs: the Bound Notebook, with no new visual world.

**Mode:** Operate. These are safety controls, so precision and plain words matter more than expression.

**Audience and moment:**
- **Backing up:** a short, deliberate act once a week, often prompted by the reminder.
- **Restoring:** rare and tense, usually on a new or reset iPad, sometimes after a scare. The person must understand exactly what will happen to their pages before anything does.

## Shape decisions (owner-confirmed, M5 planning and shape)

- **Settings, Backup is the first section**, above Storage. Ruled rows, top to bottom:
  1. **Last backup:**
     - label "Last backup", with a hint: "Today", "3 days ago · 12 November", or "Never. Your pages exist only on this iPad.";
     - the action at the row's end: **Back up now** (an outlined ink pill);
     - while building, the row shows a thin ink progress line along its bottom rule and the hint "Preparing your backup… 42 %". The pill is disabled.
  2. **Ready:**
     - the pill becomes the solid ink **Save backup**: the second tap, which opens the share sheet (D-020);
     - the hint: "Ready: 46.7 MB. Save it to Files, a USB drive or another device."
  3. **Remind me:** a select of 1, 3, 7, 14 and 30 days, hint "A quiet note on the Library when a backup is older".
  4. **Restore from a backup:** a list row with an arrow to `/restore`, hint "Bring back pages from a .morningpages file".
- **Back up now and Save backup share one pill position.** The pill changes in place, so ⌘B does what the pill shows.
- **`/restore`, a sub-page of Settings** (the spine marks Settings). One column, steps in order, each appearing only when reached:
  1. **Choose:**
     - a lede: "Restoring brings back the pages in a backup file. Nothing changes until you choose how.";
     - an ink pill **Choose a backup file** (it opens the file picker).
  2. **Preview:** a ruled definition list, with the dates lettered in Fraunces as the screen's focal point:
     - "From 12 November 2025 to 14 November 2026";
     - mornings, pages, file size, "Backed up 14 November 2026 with version 0.1.0".
     - **Errors** replace the preview with one plain sentence each:
       - "This file isn't a Morning Pages backup.";
       - "This backup was made by a newer version. Update the app first.";
       - "This file is damaged: some of it doesn't match its checksums."
  3. **Choose how:**
     - **Merge** is the ink pill: "Add to this iPad. Pages on both are kept, and the newer copy of each wins."
     - **Replace** is an outlined pill: "Use only the backup. This iPad's journal is removed first."
     - If this iPad's journal is empty, Merge alone is offered, as "Restore".
  4. **Replace's safety step**, shown in place when there's a journal to lose:
     - "First, save a copy of this iPad's journal." with its own Back up now → Save backup pill;
     - then "Replace now" unlocks;
     - a quiet underlined text button, "Replace without saving a copy", sits beneath.
  5. **Restoring:**
     - a progress line and "Restoring… 2,340 of 9,800";
     - the spine stays, but the screen says "Keep the app open";
     - when done, the app reloads into the Library.
- **Banner (Library only):**
  - a ruled note: **"Time for a backup."** + "Your last one was 9 days ago." (or "You haven't backed up yet.");
  - actions: the outlined **Back up now** (inline: progress, then Save backup) and an underlined **Not now**, which hides it until tomorrow;
  - after a save: "Saved. Next reminder in 7 days." for this visit.
- **Unfinished restore notice (Library banner slot):** **"A restore didn't finish."** + "Choose the same file again to finish it." with a link to `/restore`. It isn't dismissable while the marker exists.

## States and ranges
- **Backup size:** 0.1 MB to ~500 MB. The build takes 1 to 60 s; progress is shown only past 1 s, as a percentage.
- **Last backup:** never, to months ago.
- **Restore counts:** 0 to ~1,000 mornings.
- **Share outcome:** saved; cancelled (the pill stays Save backup, nothing is recorded); or the share sheet unavailable, in which case it falls back to a download and says "Downloaded. Move it from Downloads to somewhere safe."

## Constraints
- No new colours or fonts. Pills follow the Buttons spec; the progress line is ink on a rule track.
- **One Mark Rule:** no terracotta on these screens. The spine's current item is the screen's one mark.
- Fraunces only for the preview's date range and the screen title.
- 44pt targets, 320 px width, Paper and Night, Reduce Motion (the progress line doesn't animate), VoiceOver: progress in a polite live region, step changes move focus to the new step's heading.
