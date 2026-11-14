<script lang="ts">
  // The writing surface for one entry: Today's, or a saved morning opened from the Library.
  import { onDestroy } from 'svelte';
  import Canvas from '../ink/Canvas.svelte';
  import type { InkDoc } from '../ink/page.ts';
  import { tools } from '../ink/tools.ts';
  import { writes } from '../store/queue.ts';
  import { saveUnsavedCopy } from '../store/rescue.ts';
  import { flushTitle, localDate } from '../store/session.ts';
  import SavedDot from '../ui/SavedDot.svelte';
  import Toolbar from '../ui/Toolbar.svelte';
  let { doc, date }: { doc: InkDoc; date: Date } = $props();

  const label = $derived(new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date));
  const state = writes.state;
  onDestroy(flushTitle); // a title typed just before leaving is still saved
</script>

<article class="today" aria-labelledby="today-date" data-dock={$tools.collapsed ? 'none' : $tools.dock}>
  <!-- The date is printed on the paper (PRD 4.4); this heading carries it for assistive tech. -->
  <h1 id="today-date" class="visually-hidden"><time datetime={localDate(date)}>{label}</time></h1>
  <div class="paper">
    <Canvas label={`Entry for ${label}`} {doc} {date} />
  </div>
  <div class="tools"><Toolbar /></div>
  {#if $state === 'held' || $state === 'full'}
    <!-- TDD 6.2: writes that keep failing are held in memory and retried; nothing is dropped. -->
    <div class="held">
      <p>{$state === 'full' ? 'This iPad is out of space, so your latest writing isn’t saved yet.' : 'Your latest writing isn’t saved yet. Still trying.'} Keep this page open.</p>
      <button type="button" onclick={() => saveUnsavedCopy(writes.pending())}>Save a copy</button>
    </div>
  {/if}
  <div class="saved"><SavedDot state={$state} /></div>
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
  /* The saved dot: quiet and out of the way, bottom corner, clear of every dock (PRD 10.2). */
  .saved {
    position: absolute;
    bottom: var(--space-4);
    right: max(var(--space-4), env(safe-area-inset-right));
    pointer-events: none;
  }
  /* Not dismissable while writes are held (STO-4): it goes away by itself once they are on disk. */
  .held {
    grid-area: paper;
    align-self: end;
    justify-self: center;
    z-index: 6;
    display: flex;
    align-items: center;
    gap: var(--space-4);
    max-width: min(40rem, calc(100% - 2 * var(--space-4)));
    margin-bottom: var(--space-6);
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--paper);
    box-shadow: var(--shadow-float);
    color: var(--ink);
    font-size: var(--text-sm);
  }
  .held p {
    margin: 0;
  }
  .held button {
    flex: none;
    min-height: var(--target);
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--accent-ink);
    color: var(--paper);
    font-weight: 600;
  }
  @media (max-width: 899.98px) {
    .today {
      height: calc(100dvh - var(--tabbar-h));
    }
  }
</style>
