<script lang="ts">
  import type { Params } from '../router.ts';
  import Canvas from '../ink/Canvas.svelte';
  import { todayDoc } from '../ink/session.ts';
  import { tools } from '../ink/tools.ts';
  import Toolbar from '../ui/Toolbar.svelte';
  let { params: _ }: { params: Params } = $props();

  // A local calendar date (D-019): the page belongs to the morning it was written in.
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const doc = todayDoc(now);
</script>

<article class="today" aria-labelledby="today-date" data-dock={$tools.collapsed ? 'none' : $tools.dock}>
  <!-- The date is printed on the paper (PRD 4.4); this heading carries it for assistive tech. -->
  <h1 id="today-date" class="visually-hidden"><time datetime={iso}>{label}</time></h1>
  <div class="paper">
    <Canvas label={`Entry for ${label}`} {doc} date={now} />
  </div>
  <div class="tools"><Toolbar /></div>
  <!-- M3.4 removes this once pages are saved to the device (owner decision, M2 plan). -->
  <p class="unsaved">Practice page · not saved yet</p>
</article>

<style>
  /* Full-bleed paper beside the spine or above the tab bar. A docked toolbar gets its own linen
     gutter, so it never covers the writing (PRD 10.2); folded, it floats as a dot. */
  .today {
    --gutter: 4.5rem;
    position: relative;
    height: 100dvh;
    display: grid;
    grid-template: 'paper' 1fr / 1fr;
    background: var(--linen);
  }
  .today[data-dock='left'] { grid-template: 'tools paper' 1fr / var(--gutter) 1fr; }
  .today[data-dock='right'] { grid-template: 'paper tools' 1fr / 1fr var(--gutter); }
  .today[data-dock='top'] { grid-template: 'tools' var(--gutter) 'paper' 1fr / 1fr; }
  .paper {
    grid-area: paper;
    position: relative;
    min-width: 0;
    min-height: 0;
  }
  .tools {
    grid-area: tools;
    display: grid;
    place-items: center;
    z-index: 5;
  }
  .today[data-dock='none'] .tools {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .today[data-dock='none'] .tools > :global(*) {
    pointer-events: auto;
  }
  /* Quiet and out of the way: bottom corner, clear of the printed date and every dock (PRD 10.2). */
  .unsaved {
    position: absolute;
    bottom: var(--space-3);
    right: max(var(--space-3), env(safe-area-inset-right));
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: color-mix(in oklch, var(--linen) 85%, transparent);
    color: var(--ink-soft);
    font-size: var(--text-xs);
    pointer-events: none;
  }
  @media (max-width: 899.98px) {
    .today {
      height: calc(100dvh - var(--tabbar-h));
    }
  }
</style>
