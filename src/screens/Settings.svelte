<script lang="ts">
  import type { Params } from '../router.ts';
  import Icon from '../ui/Icon.svelte';
  import { version } from '../../package.json';
  import { analyticsAllowed, inkPaper, inkSmoothing, setAnalyticsAllowed } from '../settings.ts';
  import { PAPER_NAMES } from '../ink/paper.ts';
  let { params: _ }: { params: Params } = $props();

  let shareUsage = $state(analyticsAllowed());
  $effect(() => setAnalyticsAllowed(shareUsage));
  let paper = $state(inkPaper.get());
  $effect(() => inkPaper.set(paper));
  let smoothing = $state(inkSmoothing.get());
  $effect(() => inkSmoothing.set(smoothing));
  const SMOOTHING_LABELS = { low: 'Low', medium: 'Medium', high: 'High' } as const;

  const LINKS = [
    { href: '/privacy', label: 'Privacy', hint: 'What stays on this iPad' },
    { href: '/diagnostics', label: 'Diagnostics', hint: 'Storage, offline and version details' },
  ];
</script>

<section class="screen" aria-labelledby="settings-title">
  <h1 id="settings-title" class="screen-title">Settings</h1>
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
  </ul>
  <h2 id="app">This app</h2>
  <ul aria-labelledby="app">
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
