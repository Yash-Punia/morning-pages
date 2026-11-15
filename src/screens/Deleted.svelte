<script lang="ts">
  // Recently Deleted (ENT-7, M4.9): every deleted morning, kept 30 days, then removed for good.
  import type { Params } from '../router.ts';
  import { db } from '../store/db.ts';
  import { listDeleted, purgeAt, restoreEntry, type DeletedRow } from '../store/entries.ts';
  import { writes } from '../store/queue.ts';
  import { saved } from '../store/session.ts';
  import { longDate } from '../ui/dates.ts';
  import PageThumb from '../ui/PageThumb.svelte';
  let { params: _ }: { params: Params } = $props();

  const rows = Promise.race([saved(), new Promise((r) => setTimeout(r, 1000))]).then(() => listDeleted(db()));
  let restored = $state<Record<string, boolean>>({});

  const ago = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const DAY = 86_400_000;
  const deletedWhen = (at: number) => ago.format(-Math.floor((Date.now() - at) / DAY), 'day');
  const goneOn = (at: number) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(purgeAt(at));

  async function restore(r: DeletedRow) {
    await writes.push({ run: () => restoreEntry(db(), r.id) });
    restored[r.id] = true;
  }
</script>

<section class="screen" aria-labelledby="deleted-title">
  <h1 id="deleted-title" class="screen-title">Recently Deleted</h1>
  <p class="lede">Deleted mornings are kept here for 30 days, then removed for good.</p>

  {#await rows then rows}
    {#if rows.length}
      <ul class="rows">
        {#each rows as r (r.id)}
          <li class="row">
            <PageThumb thumb={r.thumb} paper={r.paper} />
            <span class="text">
              <span class="title" class:untitled={!r.title}>{r.title || 'Untitled'}</span>
              <span class="meta">{longDate(r.entryDate)}</span>
              {#if restored[r.id]}
                <span class="meta" role="status">Restored. <a href={`/entry/${r.id}`}>Open it</a></span>
              {:else}
                <span class="meta">Deleted {deletedWhen(r.deletedAt)} · gone on {goneOn(r.deletedAt)}</span>
              {/if}
            </span>
            {#if !restored[r.id]}
              <button type="button" class="restore" onclick={() => restore(r)} aria-label={`Restore ${r.title || 'Untitled'}`}>Restore</button>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">Nothing here. Deleted mornings wait here for 30 days.</p>
    {/if}
  {/await}
</section>

<style>
  .rows {
    list-style: none;
    margin: var(--space-6) 0 0;
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: calc(var(--target) + var(--space-5));
    padding: var(--space-3) var(--space-2);
    border-bottom: var(--hairline) solid var(--rule);
  }
  .text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title.untitled {
    color: var(--ink-soft);
    font-weight: 400;
  }
  .meta {
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
  .meta a {
    color: var(--ink);
    font-weight: 600;
  }
  .restore {
    flex: none;
    min-height: var(--target);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
  }
  .restore:hover {
    background: color-mix(in oklch, var(--linen) 70%, transparent);
  }
  .empty {
    margin-top: var(--space-6);
    color: var(--ink-soft);
  }
</style>
