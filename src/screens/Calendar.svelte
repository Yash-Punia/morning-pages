<script lang="ts">
  // Calendar (MEM-2, M4.6): a month of mornings, each day holding its newest entry's first page.
  // Tapping a day lists that day's entries below the grid. `?day=YYYY-MM-DD` opens on a day.
  import type { Params } from '../router.ts';
  import { db } from '../store/db.ts';
  import { listEntries, type EntryRow as Row } from '../store/entries.ts';
  import { fromLocalDate, localDate } from '../store/session.ts';
  import { dayDate, firstWeekday, monthName, today, weekdayLetter } from '../ui/dates.ts';
  import EntryRow from '../ui/EntryRow.svelte';
  import Icon from '../ui/Icon.svelte';
  import PageThumb from '../ui/PageThumb.svelte';
  let { params: _ }: { params: Params } = $props();

  const todayIso = today();
  const asked = new URLSearchParams(location.search).get('day');
  const start = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : todayIso;

  let selected = $state(start);
  let month = $state(firstOfMonth(fromLocalDate(start)));

  function firstOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const shift = (n: number) => (month = new Date(month.getFullYear(), month.getMonth() + n, 1));
  function goToday() {
    month = firstOfMonth(new Date());
    select(todayIso);
  }
  function select(iso: string) {
    selected = iso;
    history.replaceState(null, '', `/calendar?day=${iso}`);
  }

  /** The weeks shown: whole weeks from the locale's first weekday, covering the month. */
  const weeks = $derived.by(() => {
    const first = firstWeekday();
    const lead = (month.getDay() - first + 7) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Math.ceil((lead + days) / 7) * 7;
    return Array.from({ length: cells / 7 }, (_, w) =>
      Array.from({ length: 7 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - lead + w * 7 + i)));
  });
  const headers = $derived(weeks[0]!.map((d) => ({ letter: weekdayLetter(d), name: new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(d) })));

  // The month's entries, by day (newest first within a day).
  const entries = $derived.by(() => {
    const from = localDate(weeks[0]![0]!);
    const to = localDate(weeks.at(-1)!.at(-1)!);
    return listEntries(db(), { from, to, thumbs: true }).then((rows) => {
      const byDay = new Map<string, Row[]>();
      for (const r of rows) byDay.set(r.entryDate, [...(byDay.get(r.entryDate) ?? []), r]);
      return byDay;
    });
  });

  const dayLabel = (iso: string, n: number) => `${dayDate(iso)}${n ? `, ${n} ${n === 1 ? 'entry' : 'entries'}` : ''}`;
</script>

<section class="screen calendar" aria-labelledby="month-title">
  <header>
    <h1 id="month-title" class="screen-title" aria-live="polite">{monthName(month)}</h1>
    <div class="nav">
      <button type="button" class="icon-button" aria-label="Previous month" onclick={() => shift(-1)}><Icon name="chevron-left" /></button>
      <button type="button" class="icon-button" aria-label="Next month" onclick={() => shift(1)}><Icon name="chevron-right" /></button>
      <button type="button" class="text-button" onclick={goToday}>Today</button>
    </div>
  </header>

  {#await entries}
    <div class="grid-space" aria-hidden="true"></div>
  {:then byDay}
    <table class="grid">
      <thead>
        <tr>{#each headers as h (h.name)}<th scope="col" abbr={h.name}>{h.letter}</th>{/each}</tr>
      </thead>
      <tbody>
        {#each weeks as week (week[0]!.getTime())}
          <tr>
            {#each week as d (d.getTime())}
              {@const iso = localDate(d)}
              {@const day = byDay.get(iso) ?? []}
              <td class:outside={d.getMonth() !== month.getMonth()}>
                <button type="button" class="day" aria-pressed={iso === selected} aria-current={iso === todayIso ? 'date' : undefined}
                        aria-label={dayLabel(iso, day.length)} onclick={() => select(iso)}>
                  <span class="num" aria-hidden="true">{d.getDate()}</span>
                  {#if day[0]}
                    <span class="thumb" aria-hidden="true"><PageThumb thumb={day[0].thumb} paper={day[0].paper} width={44} /></span>
                    <span class="dot" aria-hidden="true"></span>
                    {#if day.length > 1}<span class="more" aria-hidden="true">+{day.length - 1}</span>{/if}
                  {/if}
                </button>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>

    {@const chosen = byDay.get(selected) ?? []}
    <section class="day-panel" aria-labelledby="day-title">
      <h2 id="day-title" class="day-title">{dayDate(selected)}</h2>
      {#if chosen.length}
        <ul class="rows">
          {#each chosen as entry (entry.id)}
            <EntryRow {entry} href={`/entry/${entry.id}`} />
          {/each}
        </ul>
      {:else}
        <p class="empty">{selected === todayIso ? 'Nothing written yet today.' : 'Nothing written on this day.'}
          {#if selected === todayIso}<a href="/today">Open today's page</a>{/if}</p>
      {/if}
    </section>
  {:catch}
    <p class="lede">This iPad couldn't read the journal just now. Close the app and open it again.</p>
  {/await}
</section>

<style>
  .calendar {
    max-width: 48rem;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .nav {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .icon-button,
  .text-button {
    display: inline-grid;
    place-items: center;
    min-width: var(--target);
    min-height: var(--target);
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  .text-button {
    padding: 0 var(--space-3);
    font-weight: 600;
  }
  .icon-button:hover,
  .text-button:hover {
    background: color-mix(in oklch, var(--linen) 70%, transparent);
  }

  .grid-space {
    height: 28rem;
  }
  .grid {
    width: 100%;
    margin-top: var(--space-5);
    border-collapse: collapse;
    table-layout: fixed;
  }
  th {
    padding-bottom: var(--space-2);
    color: var(--ink-soft);
    font-size: var(--text-xs);
    font-weight: 400;
  }
  /* A ruled table of days, not a grid of cards. */
  td {
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
    vertical-align: top;
  }
  .day {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: start;
    gap: var(--space-1);
    width: 100%;
    min-height: 6.5rem;
    padding: var(--space-2) 0 var(--space-2);
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--ink);
    font: inherit;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  .day:hover {
    background: color-mix(in oklch, var(--linen) 55%, transparent);
  }
  .day[aria-pressed='true'] {
    background: var(--linen-deep);
  }
  .num {
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .outside .num {
    color: var(--ink-soft);
    font-weight: 400;
  }
  /* The One Mark Rule: today's number, in terracotta. */
  .day[aria-current='date'] .num {
    color: var(--accent-ink);
    text-decoration: underline 2px;
    text-underline-offset: 0.25em;
  }
  .more {
    position: absolute;
    right: var(--space-1);
    bottom: var(--space-1);
    color: var(--ink-soft);
    font-size: var(--text-xs);
  }
  .dot {
    display: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ink);
  }
  /* Narrow windows: a dot where something was written instead of a page. */
  @media (max-width: 479.98px) {
    .thumb {
      display: none;
    }
    .dot {
      display: block;
    }
    .day {
      min-height: var(--target);
    }
    .more {
      position: static;
    }
  }

  .day-panel {
    margin-top: var(--space-6);
  }
  /* The Lettered Date Rule. */
  .day-title {
    margin: 0;
    font-family: var(--font-date);
    font-size: var(--text-lg);
    font-weight: 520;
  }
  .rows {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
  .empty {
    margin: var(--space-2) 0 0;
    color: var(--ink-soft);
  }
  .empty a {
    margin-left: var(--space-2);
    color: var(--ink);
    font-weight: 600;
  }
</style>
