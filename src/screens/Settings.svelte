<script lang="ts">
  import type { Params } from '../router.ts';
  import Icon from '../ui/Icon.svelte';
  import { version } from '../../package.json';
  import { analyticsAllowed, applyTheme, fingerDrawing, inkPaper, inkSmoothing, setAnalyticsAllowed, theme as themePref } from '../settings.ts';
  import { checkStorage, storage } from '../store/storage.ts';
  import { PAPER_NAMES } from '../ink/paper.ts';
  import { backup, backupAction, lastBackupAt, loadLastBackup } from '../backup/client.ts';
  import { backupDays } from '../settings.ts';
  import { agoText } from '../ui/dates.ts';
  let { params: _ }: { params: Params } = $props();

  // BAK-1 / BAK-2, D-020: back up in two taps. The pill builds, then saves; ⌘B does the same.
  void loadLastBackup();
  let days = $state(backupDays.get());
  $effect(() => backupDays.set(days));
  const DAY_LABELS = { '1': 'After a day', '3': 'After 3 days', '7': 'After a week', '14': 'After 2 weeks', '30': 'After 30 days' } as const;
  const backupHint = $derived.by(() => {
    const s = $backup;
    if (s.step === 'building') return `Preparing your backup… ${Math.round(s.progress * 100)} %`;
    if (s.step === 'ready') return `Ready: ${mb(s.built.file.size)}. Save it to Files, a USB drive or another device.`;
    if (s.step === 'error') return 'The backup couldn’t be made. Try again in a moment.';
    if (s.outcome === 'downloaded') return 'Downloaded. Move it from Downloads to somewhere safe.';
    if ($lastBackupAt === undefined) return '';
    return $lastBackupAt === null ? 'Never. Your pages exist only on this iPad.' : agoText($lastBackupAt);
  });

  let shareUsage = $state(analyticsAllowed());
  $effect(() => setAnalyticsAllowed(shareUsage));
  let paper = $state(inkPaper.get());
  $effect(() => inkPaper.set(paper));
  let smoothing = $state(inkSmoothing.get());
  $effect(() => inkSmoothing.set(smoothing));
  const SMOOTHING_LABELS = { low: 'Low', medium: 'Medium', high: 'High' } as const;
  let finger = $state(fingerDrawing.get());
  $effect(() => fingerDrawing.set(finger));
  let theme = $state(themePref.get());
  $effect(() => { themePref.set(theme); applyTheme(theme); });
  const THEME_LABELS = { system: 'Match the iPad', paper: 'Paper', night: 'Night' } as const;

  void checkStorage(); // fresh numbers for this screen (STO-3, STO-4)
  const mb = (n: number) => (n >= 1_073_741_824 ? `${(n / 1_073_741_824).toFixed(1)} GB` : `${Math.max(0.1, n / 1_048_576).toFixed(1)} MB`);

  const LINKS = [
    { href: '/deleted', label: 'Recently Deleted', hint: 'Deleted mornings, kept for 30 days' },
    { href: '/privacy', label: 'Privacy', hint: 'What stays on this iPad' },
    { href: '/diagnostics', label: 'Diagnostics', hint: 'Storage, offline and version details' },
  ];
</script>

<section class="screen" aria-labelledby="settings-title">
  <h1 id="settings-title" class="screen-title">Settings</h1>
  <h2 id="backup">Backup</h2>
  <ul aria-labelledby="backup">
    <li class="row static progressed">
      <span class="text">
        <span class="label">Last backup</span>
        <span class="hint" aria-live="polite">{backupHint}</span>
      </span>
      <button type="button" class="pill" class:solid={$backup.step === 'ready'} onclick={backupAction} disabled={$backup.step === 'building'}>
        {$backup.step === 'ready' ? 'Save backup' : $backup.step === 'building' ? 'Preparing…' : 'Back up now'}
      </button>
      {#if $backup.step === 'building'}
        <progress max="1" value={$backup.progress} aria-label="Preparing your backup"></progress>
      {/if}
    </li>
    <li>
      <label class="row">
        <span class="text">
          <span class="label">Remind me to back up</span>
          <span class="hint">A quiet note on the Library when the last backup is older</span>
        </span>
        <select bind:value={days}>
          {#each backupDays.values as d (d)}
            <option value={d}>{DAY_LABELS[d]}</option>
          {/each}
        </select>
      </label>
    </li>
  </ul>
  <h2 id="storage">Storage</h2>
  <!-- STO-3 / STO-4: how safe the journal is on this iPad, in plain words. -->
  <ul aria-labelledby="storage">
    <li class="row static">
      <span class="text">
        <span class="label">{$storage.persisted ? 'Storage: protected' : 'Storage: best effort'}</span>
        <span class="hint">{$storage.persisted
          ? 'iPadOS keeps this journal even when space runs low. Deleting the app still deletes it.'
          : $storage.persisted === null
            ? 'This browser doesn’t say whether it protects the journal. Back up regularly.'
            : 'iPadOS may clear it when space runs low. Back up regularly; adding the app to the Home Screen helps.'}</span>
      </span>
    </li>
    {#if $storage.quota}
      <li class="row static">
        <span class="text">
          <span class="label">Space used</span>
          <span class="hint">{mb($storage.usage)} of {mb($storage.quota)} the journal can use{$storage.warn ? ` · ${$storage.warn} % full` : ''}</span>
        </span>
      </li>
    {/if}
  </ul>
  <h2 id="writing">Writing</h2>
  <ul aria-labelledby="writing">
    <li>
      <label class="row">
        <span class="text">
          <span class="label">Paper</span>
          <span class="hint">For today's pages and every new one</span>
        </span>
        <select bind:value={paper}>
          {#each inkPaper.values as style (style)}
            <option value={style}>{PAPER_NAMES[style]}</option>
          {/each}
        </select>
      </label>
    </li>
    <li>
      <label class="row">
        <span class="text">
          <span class="label">Ink smoothing</span>
          <span class="hint">Higher is smoother, with a little more trail behind the pen</span>
        </span>
        <select bind:value={smoothing}>
          {#each inkSmoothing.values as level (level)}
            <option value={level}>{SMOOTHING_LABELS[level]}</option>
          {/each}
        </select>
      </label>
    </li>
    <li>
      <label class="row">
        <span class="text">
          <span class="label">Draw with finger</span>
          <span class="hint">For writing without a Pencil; two fingers scroll</span>
        </span>
        <input type="checkbox" role="switch" bind:checked={finger} />
      </label>
    </li>
  </ul>
  <h2 id="app">This app</h2>
  <ul aria-labelledby="app">
    <li>
      <label class="row">
        <span class="text">
          <span class="label">Theme</span>
          <span class="hint">Paper by day and Night in dark mode, or always one</span>
        </span>
        <select bind:value={theme}>
          {#each themePref.values as t (t)}
            <option value={t}>{THEME_LABELS[t]}</option>
          {/each}
        </select>
      </label>
    </li>
    <li>
      <label class="row">
        <span class="text">
          <span class="label">Share anonymous usage counts</span>
          <span class="hint">Which screens open, never your writing</span>
        </span>
        <input type="checkbox" role="switch" bind:checked={shareUsage} />
      </label>
    </li>
    {#each LINKS as link (link.href)}
      <li>
        <a href={link.href}>
          <span class="text">
            <span class="label">{link.label}</span>
            <span class="hint">{link.hint}</span>
          </span>
          <Icon name="arrow-right" size={20} />
        </a>
      </li>
    {/each}
  </ul>
  <p class="version">Morning Pages <data value={version}>{version}</data></p>
</section>

<style>
  h2 {
    margin-top: var(--space-6);
    font-size: var(--text-md);
    font-weight: 700;
  }
  select {
    flex: none;
    min-height: var(--target);
    padding: 0 var(--space-3);
    border: var(--hairline) solid var(--rule);
    border-radius: var(--radius-sm);
    background: var(--paper);
    cursor: pointer;
  }
  ul {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
  li {
    border-bottom: var(--hairline) solid var(--rule);
  }
  a,
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-height: calc(var(--target) + var(--space-4));
    padding: var(--space-3) var(--space-2);
    text-decoration: none;
    color: var(--ink);
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  a:hover,
  .row:hover {
    background: color-mix(in oklch, var(--linen) 55%, transparent);
  }
  .row {
    cursor: pointer;
  }
  .row.static {
    cursor: default;
  }
  .row.static:hover {
    background: none;
  }

  /* A standard switch in the notebook's palette: linen track, ink when on. */
  input[role='switch'] {
    appearance: none;
    flex: none;
    position: relative;
    width: 51px;
    height: 31px;
    margin: 0;
    border-radius: var(--radius-pill);
    background: var(--linen-deep);
    box-shadow: inset 0 0 0 var(--hairline) var(--rule);
    cursor: pointer;
    transition: background-color var(--dur-base) var(--ease-out);
  }
  input[role='switch']::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 27px;
    height: 27px;
    border-radius: 50%;
    background: var(--paper);
    box-shadow: 0 1px 3px oklch(28.2% 0.034 255.8 / 0.25);
    transition: translate var(--dur-base) var(--ease-out);
  }
  input[role='switch']:checked {
    background: var(--ink);
  }
  input[role='switch']:checked::after {
    translate: 20px 0;
  }
  a :global(.icon) {
    color: var(--ink-soft);
  }

  /* The backup pill: outlined while it builds the file, solid ink once it's ready to save. */
  .pill {
    flex: none;
    min-height: var(--target);
    padding: 0 var(--space-5);
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    box-shadow: inset 0 0 0 1.5px var(--ink);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color var(--dur-quick) var(--ease-out), color var(--dur-quick) var(--ease-out);
  }
  .pill.solid {
    background: var(--ink);
    color: var(--paper);
  }
  .pill.solid:hover {
    background: color-mix(in oklch, var(--ink) 88%, var(--accent));
  }
  .pill:disabled {
    box-shadow: none;
    background: var(--linen-deep);
    color: var(--ink-soft);
    cursor: default;
  }
  /* Progress runs along the row's bottom rule: ink over the rule, with no animation of its own. */
  .progressed {
    position: relative;
  }
  progress {
    appearance: none;
    position: absolute;
    inset: auto 0 calc(-1 * var(--hairline)) 0;
    width: 100%;
    height: 2px;
    border: 0;
    background: var(--rule);
    color: var(--ink);
  }
  progress::-webkit-progress-bar {
    background: var(--rule);
  }
  progress::-webkit-progress-value {
    background: var(--ink);
  }
  progress::-moz-progress-bar {
    background: var(--ink);
  }
  .text {
    display: grid;
    gap: 2px;
  }
  .hint {
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
  .version {
    margin-top: var(--space-7);
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
</style>
