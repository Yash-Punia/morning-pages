<script lang="ts">
  // D-018: device facts, the ink HUD, finger calibration, the state of saving and the local log
  // (TDD 5.7, 6, 14).
  import type { Params } from '../router.ts';
  import { recovered } from '../store/session.ts';
  import { writes } from '../store/queue.ts';
  import { checkStorage, inkPerPage, storage } from '../store/storage.ts';
  import { flushLog, logLines, logText } from '../store/log.ts';
  import { shareFile } from '../store/share.ts';
  import { isInstalled } from '../pwa/standalone.ts';
  import { inkMetrics, pct } from '../ink/metrics.ts';
  import { PALM_SIZE } from '../ink/gestures.ts';
  import { version } from '../../package.json';
  let { params: _ }: { params: Params } = $props();

  const mb = (n: number) => (n >= 1_073_741_824 ? `${(n / 1_073_741_824).toFixed(1)} GB` : `${(n / 1_048_576).toFixed(1)} MB`);
  const ms = (n: number) => `${n.toFixed(1)} ms`;
  const sw = !('serviceWorker' in navigator)
    ? 'Not available'
    : navigator.serviceWorker.controller
      ? 'Ready: opens without a connection'
      : 'Installing: reload once to work offline';

  void checkStorage(); // fresh numbers for this screen
  const saving = writes.state;

  // PRD 12.1 / TDD 5.7 budgets, measured in this session. Kept in memory, so open this screen from
  // the app, not with a reload. The app shell size and zero lost strokes are checked in CI.
  const ink = inkMetrics.summary();
  const share = (n: number) => (ink.frames ? `${((n / ink.frames) * 100).toFixed(1)} %` : '0 %');
  const later = 'Write a few lines on Today, then come back';
  const inkRows = ink.strokes
    ? [
        ['First ink after pen-down', `${ms(ink.firstInkP50)} typical, ${ms(ink.firstInkP95)} slowest 5 % (budget 8 ms at 120 Hz)`],
        ['Frame rate while writing', `${Math.round(ink.hz)} Hz`],
        ['Dropped frames while writing', `${ink.droppedPct.toFixed(2)} % of ${ink.frames.toLocaleString()} frames over ${ink.writingMin.toFixed(1)} min (budget 1 % over 5 min)`],
        ['Frame times while writing', `up to 12.5 ms ${share(ink.buckets[0]!)} · 25 ms ${share(ink.buckets[1]!)} · 50 ms ${share(ink.buckets[2]!)} · longer ${share(ink.buckets[3]!)}`],
        ['Pencil samples', `${Math.round(ink.sampleHz)} per second`],
      ]
    : [['Writing performance', later]];

  const lat = writes.latencies;
  const opened = inkMetrics.lastOpen();
  const launchAt = performance.getEntriesByName?.('writable')[0]?.startTime;
  const pen = typeof PointerEvent === 'undefined' ? undefined : PointerEvent.prototype;
  const timingRows = [
    ['Saving a stroke', lat.length ? `${ms(pct(lat, 0.5))} typical, ${ms(pct(lat, 0.99))} slowest 1 %, over ${lat.length} saves (budget 1 s)` : later],
    ['Launch to writable page', launchAt === undefined ? 'This launch opened on another screen' : `${Math.round(launchAt)} ms (budget 1.5 s from the Home Screen)`],
    ['Opening an entry', opened ? `${Math.round(opened.ms)} ms for ${opened.pages} ${opened.pages === 1 ? 'page' : 'pages'} (budget 1 s for 30)` : 'Open a morning, then come back'],
    ['Pencil features', [
      pen && 'getCoalescedEvents' in pen ? 'coalesced samples' : 'no coalesced samples',
      pen && 'getPredictedEvents' in pen ? 'predicted samples' : 'no predicted samples',
      ink.hovered ? 'hover seen' : 'no hover seen yet',
    ].join(' · ')],
  ];
  let perPage = $state('Measuring…');
  inkPerPage().then(
    (r) => (perPage = r.pages ? `${(r.avgBytes / 1024).toFixed(1)} KB average over ${r.pages} recent ${r.pages === 1 ? 'page' : 'pages'} (budget 150 KB)` : 'No ink saved yet'),
    () => (perPage = 'Couldn’t read the journal'),
  );

  // D-042 calibration: the last few finger touches on the page, their contact size, and why each
  // did or didn't scroll.
  const touches = inkMetrics.touches();
  const touchRow = [
    `Recent finger touches (palm limit ${PALM_SIZE} px)`,
    touches.length
      ? touches.map((t) => `${t.contact} px → ${t.verdict}${t.held > 1 ? ` (${t.held} held)` : ''}`).join(' · ')
      : 'Scroll on Today with a finger, then come back',
  ];

  // 5.1: a year backs up in under 60 s without freezing (PRD 12.1), timed on this device, and is
  // read back and restored too. The sample (about 100 MB for a year) is written to a throwaway
  // database, never the journal, and deleted afterwards.
  let bench = $state('Not run. It needs about 150 MB free for a minute or two.');
  let benching = $state(false);
  async function runBench() {
    benching = true;
    try {
      const { benchBackup } = await import('../backup/client.ts');
      const PHASES: Record<string, string> = { seed: 'Writing the sample', build: 'Backing up', restore: 'Restoring' };
      const r = await benchBackup((f, phase) => (bench = `${PHASES[phase] ?? phase}… ${Math.round(f * 100)} %`));
      const s = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
      bench = `Backup ${s(r.buildMs)}, reading it back ${s(r.readMs)}, restoring ${s(r.restoreMs)}, for ${r.ops.toLocaleString()} strokes (${mb(r.ptsBytes)} of points, ${mb(r.bytes)} file); sample written in ${s(r.seedMs)}`;
    } catch (e) {
      bench = `Failed: ${(e as Error).message}`;
    } finally {
      benching = false;
    }
  }

  // TDD 14: the local log, newest first here; saved oldest first as a text file. Only kinds,
  // names and numbers: nothing from the journal.
  const recent = logLines().slice(-20).reverse();
  const when = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  function saveLog() {
    // Straight from the tap: the share sheet needs a fresh gesture.
    void shareFile(new File([logText()], 'morning-pages-log.txt', { type: 'text/plain' }));
    void flushLog();
  }

  const rows = $derived([
    ...inkRows,
    ...timingRows,
    ['Ink stored per page', perPage],
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
  <p class="lede">Writing numbers cover this session since the app opened, so come here from the app rather than reloading.</p>
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
    <div>
      <dt>Log on this iPad</dt>
      <dd>
        {#if recent.length}
          <ol class="log">
            {#each recent as line, i (i)}
              <li><time datetime={new Date(line.at).toISOString()}>{when.format(line.at)}</time> {line.kind}: {line.detail}</li>
            {/each}
          </ol>
        {:else}
          Nothing logged yet
        {/if}
        <button type="button" onclick={saveLog}>Save log</button>
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
    overflow-wrap: anywhere;
  }
  .log {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-sm);
  }
  .log time {
    color: var(--ink-soft);
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
