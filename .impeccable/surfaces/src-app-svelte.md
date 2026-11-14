---
version: 1
slug: "src-app-svelte"
primary_target: "src/App.svelte"
related_targets: []
---

# App shell

**Scope:** the app chrome around every screen: navigation (sidebar ≥ 900 px, bottom tab bar below), screen headers, the Today page frame, and the token system every later screen inherits. **Mode:** Operate.

**Audience and task:** the morning writer, half awake, opens to today's page and writes. The shell's job is to get them there instantly and stay out of the ink's way; looking back (Library, Calendar, Timeline, Search, Settings) is a second, deliberate trip.

**Constraints:**
- No banners or dialogs on the writing canvas.
- The Pencil only acts on the toolbar.
- Works in Split View down to 320 px.
- Touch targets ≥ 44 pt.
- Contrast ≥ 4.5:1 in Paper and Night.
- Reduce Motion honoured.

## Direction contract

THESIS: The shell is the binding and endpapers of a well-made notebook: it opens straight onto today's page and then recedes. It refuses the productivity-dashboard default of a grey sidebar, white cards and a blue primary button.

OWN-WORLD:
- **Paper:** warm cream paper ground. Ink blue-black for text and rules.
- **Accent:** terracotta used only for the one current or primary thing; sage for "saved".
- **Rail:** the navigation rail is the notebook's cloth spine, a deeper linen tone, with ink hairline rules instead of borders or cards.
- **Type:** Fraunces sets dates and screen titles like a dated page header; Atkinson Hyperlegible Next carries every control.
- **Night:** warm charcoal paper with cream ink, not inverted grey.

STORY: The visitor understands at once that this is a notebook, not an app to manage, and that it is safe. They write; the saved mark confirms it quietly. When they want the past, the spine holds it.

FIRST VIEWPORT (updated M2, when Today became the writing canvas):
- **Today at iPad landscape:** a real A5 page of the chosen paper (lined, college by default), at most 1000 CSS px wide and centred on the linen desk. The date is printed on the paper itself, in Fraunces, in the page's header band ("Saturday, November 14, 2026"), so it scrolls with the page like a dated notebook head. The cloth spine on the left is collapsed to icon-only entries, expandable to labels. The primary action is the page itself; there is no button to start.
- **The tool pill** (4 presets, eraser, undo, redo, move, fold) docks left for the right-handed owner, in its own linen gutter beside the page, and can dock top or right. Docked, it never sits over the writing. It folds to a single dot that floats over the corner, and starts folded at phone width. This amends the PRD's "floating pill" wording: the pill still floats visually (paper, shadow), but in a gutter, because PRD 10.2's "never covers the writing line" wins (D-041).
- **Below 900 px:** the spine becomes a bottom tab bar in the same linen tone.
- **Until M3:** a quiet "Practice page · not saved yet" caption sits in the bottom-right corner.

Signature move: the date printed on the page plus the linen spine, a notebook's binding as navigation. The saved mark is a small ink dot, not a toast (M3).

FORM: seed: none (pinned). The owner pinned the world in the PRD §10.3 and confirmed it in this session:
- "The interface should disappear while writing and feel like a well-made paper notebook the rest of the time: warm paper tones, a serif accent face, generous whitespace, and controls only where the hand expects them."
- "Palette: paper cream #F7F3EA, ink blue-black #1E2A3A, accent terracotta #C2653A, muted sage for success. Night theme on charcoal #1B1C1E."
- The first surface is pinned in §10.1: "Today / Writing canvas … Full-bleed paper, floating tool pill, date header, prompt line, saved dot".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Paper grain texture (optional in the PRD): not built in M2; revisit if the owner wants it.
- Linen, Sepia and High Contrast themes: after M1. Paper and Night ship in M1.8.
