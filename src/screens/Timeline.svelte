<script lang="ts">
  // Timeline (MEM-3, M4.8): every morning, newest first, under lettered month headings. Months
  // load one at a time as the reader scrolls; "Jump to" starts from any month.
  import { onMount, tick } from 'svelte';
  import type { Params } from '../router.ts';
  import { db } from '../store/db.ts';
  import { listEntries, oldestDate, type EntryRow as Row } from '../store/entries.ts';
  import { fromLocalDate, localDate, saved } from '../store/session.ts';
  import { monthName } from '../ui/dates.ts';
  import EntryRow from '../ui/EntryRow.svelte';
  let { params: _ }: { params: Params } = $props();

  interface Month { key: string; label: string; rows: Row[] }
  let months = $state<Month[]>([]);
  let done = $state(false);
  let empty = $state(false);
  let sentinel: HTMLElement;
  let cursor = new Date(); // the next month to load, going back in time
  let oldest = $state<string>();
  let loading = false;
  /** The end of the list is within a screen of view: load more. Measured, not cached from the observer. */
  const near = () => !!sentinel && sentinel.getBoundingClientRect().top < innerHeight + 600;

  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  let jump = $state(ym(new Date()));

  /** Each (re)start of the list; a loading loop from an earlier one stops without adding months. */
  let generation = 0;

  /** Load the next month that has entries (skipping empty ones), then keep going while the end is in view. */
  async function more() {
    if (loading || done) return;
    const gen = generation;
    loading = true;
    try {
      while (!done) {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const rows = await listEntries(db(), { from: localDate(first), to: localDate(last), thumbs: true });
        if (gen !== generation) return; // the list was restarted meanwhile
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
        if (!oldest || localDate(first) <= oldest) done = true;
        if (rows.length) {
          months.push({ key: ym(first), label: monthName(first), rows });
          if (!near()) break;
          await tick(); // the new month is in the DOM: measure again
        }
      }
    } finally {
      if (gen === generation) loading = false;
    }
  }

  async function start(from: Date) {
    generation++;
    loading = false;
    months = [];
    done = false;
    cursor = from;
    await more();
    empty = !months.length;
  }

  /** The month the list starts from. `change` also fires on blur, so only a new month restarts it. */
  let shown = ym(new Date());
  function jumpTo() {
    const [y, m] = jump.split('-').map(Number);
    if (!y || !m || jump === shown) return;
    shown = jump;
    void start(new Date(y, m - 1, 1));
    scrollTo({ top: 0 });
  }

  onMount(() => {
    // Measured on scroll: an observer's margin can hold the end 'in view' and never fire again.
    const onScroll = () => { if (near()) void more(); };
    addEventListener('scroll', onScroll, { passive: true });
    void Promise.race([saved(), new Promise((r) => setTimeout(r, 1000))])
      .then(() => oldestDate(db()))
      .then((d) => { oldest = d; return start(new Date()); })
      .then(onScroll);
    return () => removeEventListener('scroll', onScroll);
  });
</script>

<section class="screen timeline" aria-labelledby="timeline-title">
  <header>
    <h1 id="timeline-title" class="screen-title">Timeline</h1>
    <label class="jump">
      <span>Jump to</span>
      <input type="month" bind:value={jump} onchange={jumpTo} max={ym(new Date())} />
    </label>
  </header>

  {#each months as month (month.key)}
    <section class="month" aria-labelledby={`m-${month.key}`}>
      <h2 id={`m-${month.key}`} class="month-title">{month.label}</h2>
      <ul class="rows">
        {#each month.rows as entry (entry.id)}
          <EntryRow {entry} href={`/entry/${entry.id}`} thumbWidth={56} />
        {/each}
      </ul>
    </section>
  {/each}

  {#if empty}
    <p class="lede">Your mornings will line up here, newest first, once you've written a page.</p>
  {:else if done && months.length}
    <p class="end">That's every morning{oldest ? ` since ${monthName(fromLocalDate(oldest))}` : ''}.</p>
  {/if}
  <div class="sentinel" bind:this={sentinel} aria-hidden="true"></div>
</section>

<style>
  .timeline {
    max-width: 44rem;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-4);
  }
  .jump {
    display: grid;
    gap: var(--space-1);
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
  .jump input {
    min-height: var(--target);
    padding: 0 var(--space-3);
    border: var(--hairline) solid var(--rule);
    border-radius: var(--radius-sm);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-md);
  }
  .month {
    margin-top: var(--space-6);
  }
  /* The Lettered Date Rule: months set like a dated page header, held while their rows scroll. */
  .month-title {
    position: sticky;
    top: 0; /* the trial strip scrolls away with the page */
    z-index: 1;
    margin: 0;
    padding: var(--space-3) 0 var(--space-2);
    background: var(--paper);
    font-family: var(--font-date);
    font-size: var(--text-lg);
    font-weight: 520;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
  /* Long journals: rows off screen skip layout and paint until they near the viewport. */
  .rows :global(li) {
    content-visibility: auto;
    contain-intrinsic-size: auto 6rem;
  }
  .end {
    margin: var(--space-6) 0 0;
    color: var(--ink-soft);
  }
  .sentinel {
    height: 1px;
  }
</style>
