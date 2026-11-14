<script lang="ts">
  import type { Params } from '../router.ts';
  let { params: _ }: { params: Params } = $props();

  // A local calendar date (D-019): the page belongs to the morning it was written in.
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(now);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now);
  const year = now.getFullYear();
</script>

<article class="page" aria-labelledby="today-date">
  <header>
    <h1 id="today-date"><time datetime={iso}>{date}</time></h1>
    <p class="weekday">{weekday} <span aria-hidden="true">·</span> {year}</p>
  </header>
  <p class="soon">Your page for today will open here. Writing arrives with the next update.</p>
</article>

<style>
  /* Full-bleed paper; the canvas fills it from M2. */
  .page {
    padding: max(var(--space-7), env(safe-area-inset-top)) max(var(--space-7), env(safe-area-inset-right)) var(--space-7)
      max(var(--space-7), env(safe-area-inset-left));
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
  .soon {
    margin-top: var(--space-8);
    max-width: 34ch;
    color: var(--ink-soft);
  }
  @media (max-width: 599.98px) {
    .page {
      padding: max(var(--space-6), env(safe-area-inset-top)) var(--space-4) var(--space-6);
    }
  }
</style>
