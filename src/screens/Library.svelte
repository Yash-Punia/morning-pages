<script lang="ts">
  import type { Params } from '../router.ts';
  import { db } from '../store/db.ts';
  import { listEntries } from '../store/entries.ts';
  import { fromLocalDate, localDate, saved } from '../store/session.ts';
  import { storage } from '../store/storage.ts';
  import Icon from '../ui/Icon.svelte';
  let { params: _ }: { params: Params } = $props();

  // Every saved morning, newest first, read once pending writes are on disk (owner decision, M3).
  // M4 replaces this list with the full Library: calendar, timeline and banners.
  const today = localDate(new Date());
  // Wait at most a second: while writes are held (TDD 6.2) the queue never empties, and the list
  // must still show what is on disk.
  const rows = Promise.race([saved(), new Promise((r) => setTimeout(r, 1000))]).then(() => listEntries(db()));
  const longDate = (d: string) => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fromLocalDate(d));
</script>

<section class="screen" aria-labelledby="library-title">
  <h1 id="library-title" class="screen-title">Library</h1>
  {#if $storage.warn}
    <!-- TDD 6.5: from 80 % of the space the journal may use. Banners live here, never on Today. -->
    <p class="warn" role="status">This iPad is {$storage.warn} % full for the journal. Free some space so new pages keep saving.</p>
  {/if}
  {#await rows then rows}
    {#if rows.length}
      <ul>
        {#each rows as entry (entry.id)}
          <li>
            <!-- Today's newest entry is Today; an earlier one from this morning opens by id (ENT-2). -->
            <a href={entry.id === rows.find((r) => r.entryDate === today)?.id ? '/today' : `/entry/${entry.id}`}>
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
  {:catch}
    <p class="lede">This iPad couldn't read the journal just now. Close the app and open it again.</p>
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
  .warn {
    margin: var(--space-5) 0 0;
    padding: var(--space-3) var(--space-4);
    border-left: 3px solid var(--accent-ink);
    background: color-mix(in oklch, var(--linen) 60%, transparent);
    max-width: 40rem;
  }
</style>
