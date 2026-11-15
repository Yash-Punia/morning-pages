<script lang="ts">
  // Library home (PRD 10.1, M4.5): the way back into past pages. Today first, this week at a
  // glance, then the latest mornings. Banners (update, storage, later backup) live here only.
  import type { Params } from '../router.ts';
  import { db } from '../store/db.ts';
  import { listEntries, type EntryRow as Row } from '../store/entries.ts';
  import { localDate, saved } from '../store/session.ts';
  import { storage } from '../store/storage.ts';
  import { redrawRestored, thumbsSettled } from '../store/thumbs.ts';
  import { backup, backupAction, lastBackupAt, loadLastBackup, restoreUnfinished, takeRestored } from '../backup/client.ts';
  import { daysSince, reminderDue } from '../backup/reminder.ts';
  import { backupDays, backupSnooze } from '../settings.ts';
  import { fromLocalDate } from '../store/session.ts';
  import { route } from '../router.ts';
  import { get } from 'svelte/store';
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
  // BAK-4: a restore that was cut off says so here until the same file is restored again.
  let unfinished = $state(false);
  // BAK-2: a quiet note when the last backup is older than the chosen days. Once shown, it stays
  // for this visit through its build and save steps, then thanks and says when the next one is.
  let remind = $state(false);
  // The notes are worked out with the rows, so they arrive in the same frame as the page: a note
  // inserted a moment later moved the page under a tap and, mid view transition, crashed WebKit.
  const rows: Promise<Row[]> = Promise.race([settled, new Promise((r) => setTimeout(r, 1000))]).then(async () => {
    const [all, , gone] = await Promise.all([listEntries(db(), { thumbs: true }), loadLastBackup().catch(() => {}), restoreUnfinished()]);
    const first = all.at(-1)?.entryDate; // newest first, so the last is the first morning
    unfinished = gone;
    remind = reminderDue({
      lastBackupAt: get(lastBackupAt) ?? null,
      firstMorning: first ? fromLocalDate(first).getTime() : undefined,
      days: Number(backupDays.get()),
      snoozedOn: backupSnooze.get(),
      today: todayIso,
      now: Date.now(),
    });
    return all;
  });
  // Restored pages get their thumbnails at idle, pausing whenever a page is open for writing.
  void rows.then(() => redrawRestored(() => ['/today', '/entry/:id'].includes(get(route)?.template ?? ''))).catch(() => {});
  const remindLead = $derived.by(() => {
    if (!$lastBackupAt) return 'You haven’t backed up yet. Your pages exist only on this iPad.';
    const n = daysSince($lastBackupAt, Date.now());
    return `Your last one was ${n === 1 ? 'a day' : `${n} days`} ago.`;
  });
  const nextIn = () => (backupDays.get() === '1' ? 'a day' : `${backupDays.get()} days`);
  // After a restore, the app reloads here: say what arrived (once), so the restore doesn't end in silence.
  const restored = takeRestored();
  const rangeText = (r: [string, string]) => {
    const f = (d: string) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(fromLocalDate(d));
    return r[0] === r[1] ? `from ${f(r[0])}` : `from ${f(r[0])} to ${f(r[1])}`;
  };
  function notNow() {
    backupSnooze.set(todayIso);
    remind = false;
  }
  const href = (all: Row[], e: Row) => (e.id === all.find((r) => r.entryDate === todayIso)?.id ? '/today' : `/entry/${e.id}`);
</script>

<section class="screen" aria-labelledby="library-title">
  <h1 id="library-title" class="screen-title">Library</h1>

  <div class="banners">
    {#if restored && !unfinished}
      <p class="banner" role="status">
        <strong>Restored.</strong>
        {restored.mornings.toLocaleString()} {restored.mornings === 1 ? 'morning' : 'mornings'}{restored.range ? ` ${rangeText(restored.range)}` : ''} {restored.mornings === 1 ? 'is' : 'are'} on this iPad.
      </p>
    {/if}
    {#if unfinished}
      <div class="banner update" role="status">
        <p><strong>A restore didn’t finish.</strong> Choose the same backup file again to finish it.</p>
        <a class="pill" href="/restore">Finish the restore</a>
      </div>
    {/if}
    {#if remind}
      <div class="banner update reminder" role="status" data-backup-status>
        {#if $backup.step === 'idle' && $backup.outcome}
          <p><strong>Saved.</strong> {$backup.outcome === 'downloaded' ? 'It’s in Downloads; move it somewhere safe. ' : ''}The next reminder is in {nextIn()}.</p>
        {:else}
          <p>
            <strong>Time for a backup.</strong>
            {$backup.step === 'building' ? 'Preparing it…' : $backup.step === 'ready' ? 'Ready. Save it to Files, a USB drive or another device.' : $backup.step === 'error' ? 'It couldn’t be made just now. Try again in a moment.' : remindLead}
          </p>
          {#if $backup.step === 'building'}
            <progress class="rule-progress" max="1" value={$backup.progress} aria-label="Preparing the backup"></progress>
          {/if}
          <span class="actions">
            <button type="button" class="pill" class:solid={$backup.step === 'ready'} onclick={backupAction} disabled={$backup.step === 'building'}>
              {$backup.step === 'ready' ? 'Save backup' : $backup.step === 'building' ? 'Preparing…' : 'Back up now'}
            </button>
            {#if $backup.step !== 'ready' && $backup.step !== 'building'}
              <button type="button" class="text-button" onclick={notNow}>Not now</button>
            {/if}
          </span>
        {/if}
      </div>
    {/if}
    {#if $needRefresh}
      <div class="banner update" role="status">
        <p><strong>A new version is ready.</strong> {updating ? 'Updating once everything you’ve written is saved…' : 'It takes a moment and keeps every page.'}</p>
        <button type="button" class="pill" onclick={update} disabled={updating}>{updating ? 'Waiting…' : 'Update now'}</button>
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
    margin-top: var(--space-5);
  }
  /* Stacked notes share one rule, like lines on a page. */
  .banner + .banner {
    border-top: 0;
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
    color: var(--ink);
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
  /* The reminder's progress runs along its bottom rule, full width under its words. */
  .reminder {
    position: relative;
  }
  .reminder progress {
    position: absolute;
    inset: auto 0 calc(-1 * var(--hairline)) 0;
  }
  .reminder .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
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
