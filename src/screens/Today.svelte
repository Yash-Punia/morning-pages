<script lang="ts">
  import type { Params } from '../router.ts';
  import Canvas from '../ink/Canvas.svelte';
  let { params: _ }: { params: Params } = $props();

  // A local calendar date (D-019): the page belongs to the morning it was written in.
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(now);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now);
  const label = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
</script>

<article class="today" aria-labelledby="today-date">
  <Canvas label={`Entry for ${label}`} />
  <header>
    <h1 id="today-date"><time datetime={iso}>{date}</time></h1>
    <p class="weekday">{weekday}</p>
  </header>
</article>

<style>
  /* Full-bleed paper: the surface fills exactly the space beside the spine or above the tab bar. */
  .today {
    position: relative;
    height: 100dvh;
  }
  header {
    position: absolute;
    top: max(var(--space-7), env(safe-area-inset-top));
    left: max(var(--space-7), env(safe-area-inset-left));
    pointer-events: none;
  }
  h1 {
    font-family: var(--font-date);
    font-size: var(--text-date);
    font-weight: 520;
    letter-spacing: -0.025em;
  }
  .weekday {
    margin-top: var(--space-2);
    color: var(--ink-soft);
    font-size: var(--text-lg);
  }
  @media (max-width: 899.98px) {
    .today {
      height: calc(100dvh - var(--tabbar-h));
    }
  }
  @media (max-width: 599.98px) {
    header {
      top: max(var(--space-6), env(safe-area-inset-top));
      left: var(--space-4);
    }
  }
</style>
