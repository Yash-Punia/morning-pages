<script lang="ts">
  // D-018: device facts, the ink HUD, finger calibration, and the state of saving (TDD 6, 14).
  import type { Params } from '../router.ts';
  import { recovered } from '../store/session.ts';
  import { writes } from '../store/queue.ts';
  import { checkStorage, storage } from '../store/storage.ts';
  import { isInstalled } from '../pwa/standalone.ts';
  import { inkMetrics } from '../ink/metrics.ts';
  import { PALM_SIZE } from '../ink/gestures.ts';
  import { version } from '../../package.json';
  let { params: _ }: { params: Params } = $props();

  const mb = (n: number) => (n >= 1_073_741_824 ? `${(n / 1_073_741_824).toFixed(1)} GB` : `${(n / 1_048_576).toFixed(1)} MB`);
  const sw = !('serviceWorker' in navigator)
    ? 'Not available'
    : navigator.serviceWorker.controller
      ? 'Ready: opens without a connection'
      : 'Installing: reload once to work offline';

  void checkStorage(); // fresh numbers for this screen
  const saving = writes.state;

  // TDD 5.7 budgets: first ink within one 120 Hz frame of app work, under 1 % dropped frames.
  const ink = inkMetrics.summary();
  const inkRows = ink.strokes
    ? [
        ['First ink after pen-down', `${ink.firstInkP50.toFixed(1)} ms typical, ${ink.firstInkP95.toFixed(1)} ms slowest 5 %`],
        ['Frame rate while writing', `${Math.round(ink.hz)} Hz`],
        ['Dropped frames while writing', `${ink.droppedPct.toFixed(1)} %`],
      ]
    : [['Writing performance', 'Write a few lines on Today, then come back']];

  // D-042 calibration: the last few finger touches on the page, their contact size, and why each
  // did or didn't scroll. Kept in memory, so open this screen from the app, not with a reload.
  const touches = inkMetrics.touches();
  const touchRow = [
    `Recent finger touches (palm limit ${PALM_SIZE} px)`,
    touches.length
      ? touches.map((t) => `${t.contact} px → ${t.verdict}${t.held > 1 ? ` (${t.held} held)` : ''}`).join(' · ')
      : 'Scroll on Today with a finger, then come back',
  ];

  // 5.1: a year backs up in under 60 s without freezing (PRD 12.1), timed on this device. The
  // sample is written to a throwaway database, never the journal, and deleted afterwards.
  let bench = $state('Not run');
  let benching = $state(false);
  async function runBench() {
    benching = true;
    try {
      const { benchBackup } = await import('../backup/client.ts');
      const r = await benchBackup((f, phase) => (bench = `${phase === 'seed' ? 'Writing the sample' : 'Backing up'}… ${Math.round(f * 100)} %`));
      bench = `${(r.buildMs / 1000).toFixed(1)} s for ${r.ops.toLocaleString()} strokes (${mb(r.ptsBytes)} of points, ${mb(r.bytes)} file); sample written in ${(r.seedMs / 1000).toFixed(0)} s`;
    } catch (e) {
      bench = `Failed: ${(e as Error).message}`;
    } finally {
      benching = false;
    }
  }

  const rows = $derived([
    ...inkRows,
    touchRow,
    ['Version', version],
    ['Running as', isInstalled() ? 'Home Screen app' : 'Safari tab'],
    ['Offline', sw],
    ['Storage used', $storage.quota ? `${mb($storage.usage)} of ${mb($storage.quota)}` : 'Unknown'],
    ['Storage protection', $storage.persisted === null ? 'Unknown' : $storage.persisted ? 'Protected from automatic clearing' : 'Not protected yet: back up regularly'],
    ['Saving', $saving === 'saved' ? 'Everything is saved' : `${$saving} (${writes.size} waiting)`],
    ['Crash recovery this launch', `${recovered.replayed} restored, ${recovered.skipped} already saved, ${recovered.failed} failed`],
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
    <div>
      <dt>Backup of a sample year</dt>
      <dd>
        <span role="status">{bench}</span>
        <button type="button" onclick={runBench} disabled={benching}>Time it</button>
      </dd>
    </div>
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
  dd button {
    display: block;
    min-height: var(--target);
    margin-top: var(--space-2);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    box-shadow: inset 0 0 0 1.5px var(--ink);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  dd button:disabled {
    box-shadow: none;
    background: var(--linen-deep);
    color: var(--ink-soft);
    cursor: default;
  }
  @media (max-width: 479.98px) {
    div {
      grid-template-columns: 1fr;
      gap: 2px;
    }
  }
</style>
