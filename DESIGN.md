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
- **Pressed Sage** (`sage`): "saved" and success only. Reserved for the saved mark from M3.

### Neutral
- **Cream Paper** (`paper`, PRD anchor #F7F3EA): the page ground everywhere. **Night Paper** (`paper-night`, PRD anchor #1B1C1E) is its night pair.
- **Linen** (`linen`): the spine and tab bar, the notebook's cloth.
- **Deep Linen** (`linen-deep`): the current spine entry and pressed states.
- **Blue-Black Ink** (`ink`, PRD anchor #1E2A3A): all primary text and icons.
- **Faded Ink** (`ink-soft`): secondary text, hints and inactive icons; a tint of ink, never grey.
- **Ruled Line** (`rule`): hairline separators at 16 % ink.
- **Binding Stitch** (`stitch`): the spine's dashed stitch at 32 % ink.

### Named Rules
**The One Mark Rule.** At most one terracotta element marks "you are here" on a screen; terracotta is never decoration, a heading colour or a background field.

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
- **Float** (`box-shadow: 0 6px 18px -6px oklch(28.2% 0.034 255.8 / 0.28), 0 1px 3px oklch(28.2% 0.034 255.8 / 0.12)`): tools floating above the writing page. Never on lists, screens or the spine.

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
