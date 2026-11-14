<script lang="ts">
  import type { Params } from '../router.ts';
  import { db } from '../store/db.ts';
  import { listEntries } from '../store/entries.ts';
  import { fromLocalDate, localDate, saved } from '../store/session.ts';
  import Icon from '../ui/Icon.svelte';
  let { params: _ }: { params: Params } = $props();

  // Saved entries, read once every pending write is on disk. M4 brings the full Library.
  const today = localDate(new Date());
  const rows = saved().then(() => listEntries(db())).then((r) => r.filter((e) => e.entryDate === today));
  const longDate = (d: string) => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fromLocalDate(d));
</script>

<section class="screen" aria-labelledby="library-title">
  <h1 id="library-title" class="screen-title">Library</h1>
  {#await rows then rows}
    {#if rows.length}
      <ul>
        {#each rows as entry (entry.id)}
          <li>
            <a href="/today">
              <span class="text">
                <span class="title" class:untitled={!entry.title}>{entry.title || 'Untitled'}</span>
                <span class="meta">{longDate(entry.entryDate)} · {entry.pages} {entry.pages === 1 ? 'page' : 'pages'}</span>
              </span>
              <Icon name="arrow-right" size={20} />
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="lede">Your past mornings will gather here, one page at a time.</p>
    {/if}
  {/await}
</section>

<style>
  ul {
    list-style: none;
    margin: var(--space-6) 0 var(--space-5);
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
  li {
    border-bottom: var(--hairline) solid var(--rule);
  }
  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-height: calc(var(--target) + var(--space-5));
    padding: var(--space-3) var(--space-2);
    color: var(--ink);
    text-decoration: none;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  a:hover {
    background: color-mix(in oklch, var(--linen) 55%, transparent);
  }
  a :global(.icon) {
    color: var(--ink-soft);
  }
  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-family: var(--font-date);
    font-size: var(--text-lg);
    font-weight: 520;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title.untitled {
    color: var(--ink-soft);
  }
  .meta {
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
</style>
