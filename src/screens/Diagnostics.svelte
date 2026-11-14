<script lang="ts">
  // D-018 skeleton: device facts only. The ink HUD, queue latency and the local log join in M2–M3.
  import type { Params } from '../router.ts';
  import { isInstalled } from '../pwa/standalone.ts';
  import { inkMetrics } from '../ink/metrics.ts';
  import { version } from '../../package.json';
  let { params: _ }: { params: Params } = $props();

  const mb = (n: number) => (n >= 1_073_741_824 ? `${(n / 1_073_741_824).toFixed(1)} GB` : `${(n / 1_048_576).toFixed(1)} MB`);
  const sw = !('serviceWorker' in navigator)
    ? 'Not available'
    : navigator.serviceWorker.controller
      ? 'Ready: opens without a connection'
      : 'Installing: reload once to work offline';

  let storage = $state('Checking…');
  let persisted = $state('Checking…');
  navigator.storage?.estimate().then(
    (e) => (storage = `${mb(e.usage ?? 0)} of ${mb(e.quota ?? 0)}`),
    () => (storage = 'Unknown'),
  );
  navigator.storage?.persisted().then(
    (p) => (persisted = p ? 'Protected from automatic clearing' : 'Not protected yet'),
    () => (persisted = 'Unknown'),
  );

  // TDD 5.7 budgets: first ink within one 120 Hz frame of app work, under 1 % dropped frames.
  const ink = inkMetrics.summary();
  const inkRows = ink.strokes
    ? [
        ['First ink after pen-down', `${ink.firstInkP50.toFixed(1)} ms typical, ${ink.firstInkP95.toFixed(1)} ms slowest 5 %`],
        ['Frame rate while writing', `${Math.round(ink.hz)} Hz`],
        ['Dropped frames while writing', `${ink.droppedPct.toFixed(1)} %`],
      ]
    : [['Writing performance', 'Write a few lines on Today, then come back']];

  const rows = $derived([
    ...inkRows,
    ['Version', version],
    ['Running as', isInstalled() ? 'Home Screen app' : 'Safari tab'],
    ['Offline', sw],
    ['Storage used', storage],
    ['Storage protection', persisted],
  ]);
</script>

<section class="screen" aria-labelledby="diag-title">
  <h1 id="diag-title" class="screen-title">Diagnostics</h1>
  <dl>
    {#each rows as [term, value] (term)}
      <div>
        <dt>{term}</dt>
        <dd>{value}</dd>
      </div>
    {/each}
  </dl>
</section>

<style>
  dl {
    margin: var(--space-6) 0 0;
    border-top: var(--hairline) solid var(--rule);
  }
  div {
    display: grid;
    grid-template-columns: minmax(9rem, 1fr) 2fr;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-2);
    border-bottom: var(--hairline) solid var(--rule);
  }
  dt {
    color: var(--ink-soft);
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 479.98px) {
    div {
      grid-template-columns: 1fr;
      gap: 2px;
    }
  }
</style>
