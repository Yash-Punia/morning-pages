<script lang="ts">
  import type { Params } from '../router.ts';
  import Canvas from '../ink/Canvas.svelte';
  import { todayDoc } from '../ink/session.ts';
  let { params: _ }: { params: Params } = $props();

  // A local calendar date (D-019): the page belongs to the morning it was written in.
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const doc = todayDoc(now);
</script>

<article class="today" aria-labelledby="today-date">
  <!-- The date is printed on the paper (PRD 4.4); this heading carries it for assistive tech. -->
  <h1 id="today-date" class="visually-hidden"><time datetime={iso}>{label}</time></h1>
  <Canvas label={`Entry for ${label}`} {doc} date={now} />
</article>

<style>
  /* Full-bleed paper: the surface fills exactly the space beside the spine or above the tab bar. */
  .today {
    position: relative;
    height: 100dvh;
  }
  @media (max-width: 899.98px) {
    .today {
      height: calc(100dvh - var(--tabbar-h));
    }
  }
</style>
