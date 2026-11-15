---
name: Morning Pages
description: A private, pen-first morning journal for iPad, dressed as a well-made paper notebook.
colors:
  paper: "oklch(96.5% 0.013 86.8)"
  linen: "oklch(92.4% 0.02 80)"
  linen-deep: "oklch(88.6% 0.025 78)"
  ink: "oklch(28.2% 0.034 255.8)"
  ink-soft: "oklch(44.5% 0.03 255)"
  rule: "oklch(28.2% 0.034 255.8 / 0.16)"
  stitch: "oklch(28.2% 0.034 255.8 / 0.32)"
  terracotta: "oklch(60.8% 0.132 44.2)"
  terracotta-ink: "oklch(49.5% 0.13 41)"
  sage: "oklch(54% 0.065 150)"
  paper-night: "oklch(22.6% 0.004 264.5)"
  linen-night: "oklch(26.4% 0.007 70)"
  linen-deep-night: "oklch(31% 0.009 70)"
  ink-night: "oklch(92.4% 0.016 86)"
  ink-soft-night: "oklch(76.5% 0.02 84)"
  terracotta-night: "oklch(68.5% 0.12 46)"
  terracotta-ink-night: "oklch(75% 0.11 50)"
  sage-night: "oklch(73% 0.065 150)"
typography:
  display:
    fontFamily: "Fraunces Variable, ui-serif, Georgia, serif"
    fontSize: "clamp(2.1rem, 1.5rem + 2.2vw, 3rem)"
    fontWeight: 520
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces Variable, ui-serif, Georgia, serif"
    fontSize: "1.647rem"
    fontWeight: 560
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Fraunces Variable, ui-serif, Georgia, serif"
    fontSize: "1.235rem"
    fontWeight: 560
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  body-small:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.882rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.765rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4rem"
components:
  nav-item:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
    height: "44px"
  nav-item-current:
    backgroundColor: "{colors.linen-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "44px"
  list-row:
    textColor: "{colors.ink}"
    padding: "0.75rem 0.5rem"
    height: "60px"
  tool-pill:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "6px"
  tool-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  tool-button-active:
    backgroundColor: "{colors.linen-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  entry-title:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  saved-dot:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.pill}"
    size: "8px"
  banner-held:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem 0.75rem 0.75rem 1.5rem"
---

# Design System: Morning Pages

## Overview

**Creative North Star: "The Bound Notebook"**

Morning Pages is a notebook first and an app second. Every screen sits on warm cream paper; navigation is the notebook's cloth binding, a linen spine with a dashed stitch running its length; dates are set large in a literary serif, the way you would head a fresh page. The interface is quiet so the ink can be loud: one terracotta mark shows where you are, sage confirms that something is safe, and everything else is ink on paper.

Density is low and margins are generous. The person using it is half awake at 6 a.m., so nothing competes for attention and nothing needs deciding. Controls are standard web controls (links, buttons, lists) wearing the notebook's palette and type, never a costume of stationery: there are no faux page curls, leather textures or skeuomorphic rings.

**Key Characteristics:**
- Warm paper ground in both themes: cream by day, warm charcoal by night, never pure white or pure black.
- Navigation as binding: a linen spine with a dashed stitch, collapsing to a tab bar below 900 px.
- Fraunces for dates and screen titles only; Atkinson Hyperlegible Next for every control and line of UI text.
- One accent at a time: terracotta marks the current place, sage marks "saved".
- Flat and ruled: hairline ink rules separate things; no cards, and only floating tools cast a shadow.

## Colors

Ink on warm paper, with two quiet signal colours. Every colour is a `light-dark()` pair; the frontmatter lists the Paper value and its `-night` counterpart.

### Primary
- **Terracotta** (`terracotta`, PRD anchor #C2653A): the one current or primary thing, such as the current spine icon and the brand mark's sun. Used as a mark or fill, never as body text.
- **Fired Terracotta** (`terracotta-ink`): terracotta dark enough to carry text and icons (≥ 4.5:1 on paper and linen), also the focus ring and caret.

### Secondary
- **Pressed Sage** (`sage`): "saved" and success only: the saved dot.

### Neutral
- **Cream Paper** (`paper`, PRD anchor #F7F3EA): the page ground everywhere. **Night Paper** (`paper-night`, PRD anchor #1B1C1E) is its night pair.
- **Linen** (`linen`): the spine and tab bar, the notebook's cloth.
- **Deep Linen** (`linen-deep`): the current spine entry and pressed states.
- **Blue-Black Ink** (`ink`, PRD anchor #1E2A3A): all primary text and icons.
- **Faded Ink** (`ink-soft`): secondary text, hints and inactive icons; a tint of ink, never grey.
- **Ruled Line** (`rule`): hairline separators at 16 % ink.
- **Binding Stitch** (`stitch`): the spine's dashed stitch at 32 % ink.

### Named Rules
**The One Mark Rule.** At most one terracotta element marks "you are here" on a screen (today's date, the current spine entry); terracotta is never decoration, a heading colour, a background field, a banner lead or an action such as Delete or Restore. The one exception protects writing: the held-writes banner's "Save a copy" and the saved dot's held ring.

**The Tinted Neutral Rule.** Secondary text and lines are tints of ink, never grey; on linen and paper they must still clear 4.5:1 (checked by `tests/unit/contrast.test.ts`).

## Typography

**Display Font:** Fraunces Variable (with ui-serif, Georgia)
**Body Font:** Atkinson Hyperlegible Next Variable (with ui-sans-serif, system-ui)

**Character:** A soft, old-style serif for the moments a notebook would letter by hand, paired with a sans built for legibility for everything the hand operates. Both are self-hosted; the Latin files are preloaded.

### Hierarchy
- **Display** (520, clamp(2.1rem, 1.5rem + 2.2vw, 3rem), 1.1): today's date at the top of the page.
- **Headline** (560, 1.647rem, 1.1): screen titles such as Library, Settings, Privacy.
- **Title** (560, 1.235rem): the wordmark in the open spine.
- **Body** (400, 1rem, 1.4): UI text and paragraphs; prose capped near 60 to 62ch.
- **Body small** (400, 0.882rem): hints under list labels, the version line.
- **Label** (400, 0.765rem): tab-bar labels.

1rem is the iOS body size (17 px by default) and follows Dynamic Type through `font: -apple-system-body` on the root, so the whole scale grows with the user's text size.

### Named Rules
**The Lettered Date Rule.** Fraunces sets dates and screen titles and nothing else; it never appears in a button, label or list.

## Layout

Two layouts switch at 900 px. At iPad landscape and wide windows, a sticky spine on the left (4.5rem collapsed, 15rem open) sits beside the screen. Below 900 px the spine becomes a fixed bottom tab bar in the same linen, with icon above label and safe-area padding, and screens reserve its height.

Screens off the canvas use a single column capped at 44rem with generous margins (3rem top, 2rem sides; 2rem and 1rem below 600 px), always respecting `env(safe-area-inset-*)`. Spacing steps by 4 px multiples (0.25rem to 4rem); groups are tight (0.25 to 0.75rem) and sections are separated generously (2 to 4rem). Today's page is full-bleed paper with the date at the top left. Layout holds without horizontal scroll down to 320 px.

## Elevation & Depth

Flat by default. Separation comes from tone (linen against paper) and hairline ink rules, not shadows. The only shadow, `shadow-float`, is reserved for tools that hover over the page, such as the M2 tool pill.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 6px 18px -6px oklch(28.2% 0.034 255.8 / 0.28), 0 1px 3px oklch(28.2% 0.034 255.8 / 0.12)`): things floating above the writing page: the tool pill, its folded dot, the preset editor and the held-writes banner. Never on lists, screens or the spine.

### Named Rules
**The Ruled Page Rule.** Lists and data rows are separated by full-width hairline rules, like a ruled page; they are never boxed in cards.

## Shapes

Gentle, small radii (6px small, 10px for interactive rows and spine entries) and full pills for the single primary button. Borders are 1px hairlines in `rule`. The spine's stitch is a 1px dashed line (5px dash, 5px gap) inset 7px from the spine edge, vertical on the rail and horizontal on the tab bar.

## Components

### Navigation (the spine)
- **Style:** linen background, inset hairline on the page side, dashed stitch along it. The brand mark (terracotta sun over an ink line) and "Morning Pages" in Title type sit at the top; the collapse control sits at the bottom.
- **Items:** 44px tall, 10px radius, icon plus label in Faded Ink. Hover lifts to a translucent deep linen and ink text.
- **Current:** deep linen background, ink label, terracotta-ink icon, `aria-current="page"`. Sub-pages mark their parent (Privacy and Diagnostics mark Settings).
- **Collapsed:** icons only; labels remain in the accessibility tree. Width transitions over 180ms with the exponential ease-out.
- **Below 900 px:** a bottom tab bar, icon above a Label-size word, the stitch running horizontally along its top.

### Buttons
- **Shape:** full pill (999px), 44px minimum height.
- **Primary:** Blue-Black Ink fill with Cream Paper text, weight 600, 0 1.5rem padding. Hover mixes 12 % terracotta into the ink.
- **Focus:** 2px Fired Terracotta outline, 2px offset, everywhere.

### List rows
- **Style:** full-width rows between hairline rules, label in ink over a Body-small hint in Faded Ink, a 20px arrow icon at the trailing edge. Minimum height is 44px plus 1rem padding; hover tints with translucent linen.

### The writing page (M2)
- **Style:** a real A5 page (1000 × 1414 page units, at most 1000 CSS px wide), centred on the linen desk, pages stacked with a 24-unit linen gap. The paper is ruled in `rule` (lined narrow / college / wide, dotted, grid, Cornell, blank) and drawn into the page, crisp at every zoom.
- **Date:** printed on page 1 in Faded Ink Atkinson under the title band; pages 2 onward carry a running head with the date and page number. It scrolls with the paper.
- **Ink:** palette inks (black, blue-black, sepia, forest, crimson) plus three custom; Night lifts their lightness so they read on charcoal. Ink is never a UI colour.

### Entry title (M2)
- **Style:** a borderless text field set into page 1's header band in Fraunces 520 (the one place Fraunces is typed into), Blue-Black Ink on the paper, placeholder "Title" in Faded Ink. It is positioned and scaled with the paper, so it scrolls with the page.
- **Focus:** a 2px Fired Terracotta underline, like a ruled line, instead of the outline ring.

### Tool pill (M2)
- **Style:** a Cream Paper pill with the Float shadow, docked in its own linen gutter (left by default for the right-handed owner, or top or right) so it never covers the writing. Tools are 44px circular buttons in ink; groups are split by a 24px hairline rule.
- **Presets:** four swatches drawn in their own ink and nib (a round squiggle for the ballpoint, a slanted italic wave for the fountain pen). The current tool or preset sits in Deep Linen, `aria-pressed="true"`. Tapping the current preset opens its editor, a Paper panel (10px radius, Float shadow) with a linen segmented control for the pen.
- **Folded:** a 52px Paper dot with the Float shadow, floating at the dock's edge.

### Saved dot (M3)
- **Style:** an 8px Pressed Sage dot in the writing screen's bottom corner: solid once every stroke is on disk. A save that takes longer than 400 ms shows it hollow (a 1.5px ring); writes that keep failing ring it in Fired Terracotta. Only problems are announced to VoiceOver, never each save.

### Held-writes banner (M3)
- **Style:** a Paper panel with the Float shadow and a 10px radius, at the foot of the page, one plain sentence and a Fired Terracotta pill button ("Save a copy"). It can't be dismissed and goes away by itself once the writes are on disk; the only banner ever allowed over the writing page, because it protects the writing.

### Page thumbnails (M4)
- **Style:** an entry's first page at true A5 proportions (1000:1414), square-cornered like the page, edged by a hairline ring in `rule`. The stored JPEG is drawn in the Paper theme; by night it shows inverted with its hue kept (`invert(0.88) hue-rotate(180deg)`), a charcoal page with light ink. Until a thumbnail exists, the paper's rulings are drawn in CSS.

### Entry rows (M4)
- **Style:** a list row (thumbnail, title in Atkinson 600 or "Untitled" in Faded Ink, date and page count in Body small) followed by a 44px "…" button. Titles are never Fraunces (The Lettered Date Rule).
- **Menu:** a native popover under the button: a Paper panel, 10px radius, Float shadow, with Open and Delete in ink. Delete acts at once and leaves a ruled line in the row's place, "“Title” moved to Recently Deleted", with an underlined Undo.

### Week strip and calendar (M4)
- **Week strip:** seven days between two hairline rules: a Faded Ink weekday letter over a day number, a 6px ink dot where something was written. Today's number is the screen's one terracotta mark (Fired Terracotta, 2px underline).
- **Calendar:** a ruled table of days (no cards): each day a full-cell button with its number and, if written, its newest page's thumbnail, "+1" when there are more; selected in Deep Linen. Below 480px a dot replaces the thumbnail. The selected day's entries sit below the grid under a lettered date.

### Timeline (M4)
- **Style:** month headings in Fraunces (Title size) held at the top of the screen while their ruled rows scroll; a native month picker labelled "Jump to"; the list ends with a Faded Ink "That's every morning since …".

### Banners and the trial strip (M4)
- **Banners (Library only):** a ruled note between hairlines, opening with a short bold lead in ink; an action is an outlined pill (1.5px ink ring), since the screen's primary pill is Continue today.
- **Trial strip (Safari tabs only):** one fixed 2.75rem line in Deep Linen at the top of every screen but onboarding, Label size, with an underlined ink link. Layout below subtracts it in CSS (`:root:has(.trial)`).

### Backup and restore (M5)
- **Pills, shared** (`.pill` in `base.css`): an outlined ink pill (1.5px ring) for actions beside a screen's primary; `.solid` for the one primary. Disabled is Deep Linen with Faded Ink text. `.text-button` is the quiet way out: Faded Ink, underlined, 44px tall.
- **The backup pill changes in place:** "Back up now" (outlined) → "Preparing…" (disabled) → "Save backup" (solid ink), the second tap the share sheet needs (D-020). Settings, the Library note, the restore screen's safety step and ⌘B all show and drive the same state, with the same words.
- **Progress on the rule:** a 2px ink line over the row's own bottom hairline (`progress.rule-progress`), never a bar in a box and never animated. Text names the phase ("Preparing your backup…") and never counts percent, so VoiceOver hears phases, not numbers.
- **Settings, Backup first:** "Last backup" with "Never. Your pages exist only on this iPad.", "3 days ago · Thursday, 12 November" or "Saved just now." Below 480 px the pill wraps under its words.
- **Restore screen:** steps appear in order, each taking focus at its heading.
  - The preview's date range is lettered in Fraunces at headline size, the screen's focal point, with "to" in Faded Ink, over ruled definition rows.
  - Merge is the solid pill until Replace is opened. Then Replace sits in Deep Linen (pressed), Merge steps back to an outline, and the safety step's "Back up now" is the only solid pill.
  - "Replace without saving a copy" asks once more in place ("Without a copy, this iPad's journal can't be brought back." / Replace anyway / Keep it). It is never a dialog.
  - Problems lead with a heading that tells the truth ("Nothing was restored", or "The restore stopped partway"), and then the pill to try again.
- **Library notes from M5:** "Time for a backup." (Back up now, Not now), "A restore didn't finish." and, once after a restore, "Restored. 214 mornings from … are on this iPad." Stacked notes share one rule.
- No terracotta anywhere in these flows: the spine's current item stays the screen's one mark.

### Definition rows (diagnostics)
- **Style:** term in Faded Ink beside its value in ink with tabular numerals; stacks below 480 px.

### Icons
- Authored on a 24px grid with a 1.75 stroke, round caps and joins; drawn, never glyphs or emoji. Decorative, so the control carries the accessible name.

## Do's and Don'ts

### Do:
- **Do** put every colour through the `light-dark()` tokens in `src/styles/tokens.css`, so Paper and Night stay paired.
- **Do** keep text pairs at ≥ 4.5:1 and UI marks at ≥ 3:1 in every theme, and add new pairs to the contrast test.
- **Do** keep motion under 200ms (`--dur-quick` 120ms, `--dur-base` 180ms) with `--ease-out`, and let `prefers-reduced-motion` zero it.
- **Do** keep touch targets at 44px or more and respect safe-area insets on every edge.
- **Do** theme the browser surfaces: selection (terracotta at 22 %), caret, focus ring and scrollbar all come from the palette.

### Don't:
- **Don't** use pure white, pure black or neutral grey anywhere; neutrals are tinted from paper and ink.
- **Don't** box content in cards or nest containers; use ruled rows and whitespace.
- **Don't** use terracotta for headings, large fills or decoration (The One Mark Rule).
- **Don't** set controls or labels in Fraunces.
- **Don't** add skeuomorphic stationery, such as page curls, leather or spiral rings; the world lends palette, type, density and the stitched spine only.
