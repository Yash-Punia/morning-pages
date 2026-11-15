<script lang="ts">
  // Library home (PRD 10.1, M4.5): the way back into past pages. Today first, this week at a
  // glance, then the latest mornings. Banners (update, storage, later backup) live here only.
  import type { Params } from '../router.ts';
  import { db } from '../store/db.ts';
  import { listEntries, type EntryRow as Row } from '../store/entries.ts';
  import { localDate, saved } from '../store/session.ts';
  import { storage } from '../store/storage.ts';
  import { thumbsSettled } from '../store/thumbs.ts';
  import { applyUpdate, needRefresh } from '../pwa/register.ts';
  import { track } from '../analytics/track.ts';

  // 4.12, PRD 10.2: an update is offered here only, never on the page, and applies only once
  // everything written is on disk, so it can never land mid-write.
  let updating = $state(false);
  async function update() {
    updating = true;
    await saved();
    track('update_applied');
    await applyUpdate();
  }
  import { dayDate, today, weekdayLetter, weekOf } from '../ui/dates.ts';
  import EntryRow from '../ui/EntryRow.svelte';
  let { params: _ }: { params: Params } = $props();

  const RECENT = 14;
  const now = new Date();
  const todayIso = today();
  const week = weekOf(now);

  // Read once pending writes (and the page just left's thumbnail) are on disk, but never wait
  // more than a second: writes may be held (TDD 6.2).
  const settled = Promise.all([saved(), thumbsSettled()]);
  const rows: Promise<Row[]> = Promise.race([settled, new Promise((r) => setTimeout(r, 1000))]).then(() => listEntries(db(), { thumbs: true }));
  const href = (all: Row[], e: Row) => (e.id === all.find((r) => r.entryDate === todayIso)?.id ? '/today' : `/entry/${e.id}`);
</script>

<section class="screen" aria-labelledby="library-title">
  <h1 id="library-title" class="screen-title">Library</h1>

  <div class="banners">
    {#if $needRefresh}
      <div class="banner update" role="status">
        <p><strong>A new version is ready.</strong> {updating ? 'Updating once everything you’ve written is saved…' : 'It takes a moment and keeps every page.'}</p>
        <button type="button" onclick={update} disabled={updating}>{updating ? 'Waiting…' : 'Update now'}</button>
      </div>
    {/if}
    {#if $storage.warn}
      <!-- TDD 6.5: from 80 % of the space the journal may use. -->
      <p class="banner" role="status"><strong>Storage nearly full.</strong> This iPad is {$storage.warn} % full for the journal. Free some space so new pages keep saving.</p>
    {/if}
  </div>

  {#await rows then all}
    {@const todays = all.find((r) => r.entryDate === todayIso)}
    {@const written = new Set(all.map((r) => r.entryDate))}

    <section class="today" aria-labelledby="today-heading">
      <h2 id="today-heading" class="date">{dayDate(todayIso)}</h2>
      <p class="sub" class:untitled={!todays?.title}>{todays ? todays.title || 'Untitled' : 'Nothing written yet'}</p>
      <a class="primary" href="/today">{todays ? 'Continue today' : "Start today's page"}</a>
    </section>

    <ol class="week" aria-label="This week">
      {#each week as d (d.getTime())}
        {@const iso = localDate(d)}
        <li>
          <span class="wd" aria-hidden="true">{weekdayLetter(d)}</span>
          <a href={`/calendar?day=${iso}`} aria-current={iso === todayIso ? 'date' : undefined}>
            <span class="num">{d.getDate()}</span>
            <span class="visually-hidden">, {dayDate(iso)}{written.has(iso) ? ', written' : ''}</span>
            <span class="mark" class:on={written.has(iso)} aria-hidden="true"></span>
          </a>
        </li>
      {/each}
    </ol>

    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" class="group">Recent mornings</h2>
      {#if all.length}
        <ul class="rows">
          {#each all.slice(0, RECENT) as entry (entry.id)}
            <EntryRow {entry} href={href(all, entry)} />
          {/each}
        </ul>
      {:else}
        <p class="lede">Your past mornings will gather here, one page at a time.</p>
      {/if}
    </section>
  {:catch}
    <p class="lede">This iPad couldn't read the journal just now. Close the app and open it again.</p>
  {/await}

  <p class="foot"><a href="/deleted">Recently Deleted</a></p>
</section>

<style>
  .banners:empty {
    display: none;
  }
  .banners {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-5);
  }
  /* A banner is a ruled note with a short lead, never a card. */
  .banner {
    margin: 0;
    padding: var(--space-3) var(--space-2);
    border-top: var(--hairline) solid var(--rule);
    border-bottom: var(--hairline) solid var(--rule);
    max-width: 40rem;
  }
  .banner :global(strong) {
    color: var(--accent-ink);
  }
  .update {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .update p {
    margin: 0;
    flex: 1 1 18rem;
  }
  .update button {
    min-height: var(--target);
    padding: 0 var(--space-5);
    border: 0;
    border-radius: var(--radius-pill);
    /* Secondary: Continue today is the one ink pill on this screen. */
    background: none;
    box-shadow: inset 0 0 0 1.5px var(--ink);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .update button:disabled {
    box-shadow: none;
    background: var(--linen-deep);
    color: var(--ink-soft);
    cursor: default;
  }

  .today {
    margin-top: var(--space-6);
  }
  /* The Lettered Date Rule: today's date set like a page header. */
  .date {
    margin: 0;
    font-family: var(--font-date);
    font-size: var(--text-xl);
    font-weight: 520;
    letter-spacing: -0.015em;
  }
  .sub {
    margin: var(--space-1) 0 0;
    color: var(--ink);
  }
  .sub.untitled {
    color: var(--ink-soft);
  }
  .primary {
    display: inline-flex;
    align-items: center;
    min-height: var(--target);
    margin-top: var(--space-4);
    padding: 0 var(--space-5);
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
    text-decoration: none;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  .primary:hover {
    background: color-mix(in oklch, var(--ink) 88%, var(--accent));
  }

  .week {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    max-width: 30rem;
    margin: var(--space-6) 0 0;
    padding: var(--space-2) 0;
    border-top: var(--hairline) solid var(--rule);
    border-bottom: var(--hairline) solid var(--rule);
  }
  .week li {
    display: grid;
    justify-items: center;
    gap: 2px;
  }
  .week a {
    display: grid;
    justify-items: center;
    gap: 2px;
    min-height: var(--target);
    padding: var(--space-1) 0;
    border-radius: var(--radius-md);
    color: var(--ink);
    text-decoration: none;
    font-variant-numeric: tabular-nums;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  .week a:hover {
    background: color-mix(in oklch, var(--linen) 55%, transparent);
  }
  .wd {
    color: var(--ink-soft);
    font-size: var(--text-xs);
  }
  .num {
    font-weight: 600;
  }
  /* The One Mark Rule: today, underlined in terracotta. */
  .week a[aria-current='date'] .num {
    color: var(--accent-ink);
    text-decoration: underline 2px;
    text-underline-offset: 0.25em;
  }
  .mark {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .mark.on {
    background: var(--ink);
  }

  .group {
    margin: var(--space-7) 0 0;
    font-size: var(--text-md);
    font-weight: 700;
  }
  .foot {
    margin: var(--space-6) 0 0;
  }
  .foot a {
    display: inline-flex;
    align-items: center;
    min-height: var(--target);
    color: var(--ink-soft);
  }
  .rows {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
</style>
