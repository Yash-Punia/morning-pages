<script lang="ts">
  // First run (PRD 10.1, STO-1): three screens, one idea each, ending in a written first line.
  // Shown once per storage container; a tab and the installed app each have their own (TDD 10.3).
  import type { Params } from '../router.ts';
  import { navigate } from '../router.ts';
  import { track } from '../analytics/track.ts';
  import { PAPER_NAMES } from '../ink/paper.ts';
  import { tools } from '../ink/tools.ts';
  import type { PaperStyle } from '../ink/types.ts';
  import { isInstalled } from '../pwa/standalone.ts';
  import { inkPaper, onboarded } from '../settings.ts';
  import Icon from '../ui/Icon.svelte';
  let { params: _ }: { params: Params } = $props();

  const first = Number(new URLSearchParams(location.search).get('step'));
  let step = $state(first === 2 || first === 3 ? first : 1);
  const installed = isInstalled();

  $effect(() => {
    track('onboarding_step', { step: String(step) as '1' | '2' | '3' });
    history.replaceState(null, '', step === 1 ? '/onboarding' : `/onboarding?step=${step}`);
  });

  let paper = $state<PaperStyle>(inkPaper.get());
  let pen = $state<'ballpoint' | 'fountain'>('ballpoint');

  function finish(skipped = false) {
    if (!skipped) {
      inkPaper.set(paper);
      // The presets open on the ballpoint (D-043); choosing the fountain pen selects its preset.
      tools.update((s) => ({ ...s, mode: 'pen', active: Math.max(0, s.presets.findIndex((p) => p.tool === pen)) }));
      track('onboarding_done');
    }
    onboarded.set();
    navigate('/today');
  }

  // A few ruled lines per style, enough to recognise the paper at a glance.
  const swatch = (style: PaperStyle) => {
    const ys = (gap: number) => Array.from({ length: Math.floor(30 / gap) }, (_, i) => 10 + i * gap);
    switch (style) {
      case 'lined-narrow': return { lines: ys(4) };
      case 'lined-college': return { lines: ys(5.5) };
      case 'lined-wide': return { lines: ys(7.5) };
      case 'grid': return { lines: ys(5), cols: [5, 10, 15, 20, 25] };
      case 'dotted': return { dots: ys(5).flatMap((y) => [5, 10, 15, 20, 25].map((x) => [x, y] as const)) };
      case 'cornell': return { lines: ys(5.5).slice(0, 4), cols: [8], foot: 32 };
      default: return {};
    }
  };
  const PAPERS = Object.keys(PAPER_NAMES) as PaperStyle[];
</script>

<section class="screen onboarding" aria-labelledby="welcome-title">
  <p class="step">Step {step} of 3</p>

  {#if step === 1}
    <h1 id="welcome-title" class="screen-title">Your journal stays on this iPad</h1>
    <p class="lede">Every page you write is kept on this device. There's no account, and nothing you write is ever uploaded.</p>
    <p class="note">To learn what to improve, the app counts a few anonymous things, like which screens open. You can switch that off in Settings.</p>
    <div class="actions">
      <button class="primary" type="button" onclick={() => (step = 2)}>Next</button>
      <button class="skip" type="button" onclick={() => finish(true)}>Skip</button>
    </div>
  {:else if step === 2}
    {#if installed}
      <h1 id="welcome-title" class="screen-title">You're in the app</h1>
      <p class="lede">Morning Pages is on your Home Screen, so your pages are kept safely here.</p>
    {:else}
      <h1 id="welcome-title" class="screen-title">Add it to your Home Screen</h1>
      <p class="lede">In a Safari tab, your pages can be cleared after a few weeks. On the Home Screen they're kept.</p>
      <ol class="steps">
        <li>Tap <span class="inline-icon"><Icon name="share" size={20} /></span> <strong>Share</strong> in Safari's toolbar.</li>
        <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
        <li>Open <strong>Morning Pages</strong> from your Home Screen. It starts with its own journal.</li>
      </ol>
    {/if}
    <p class="note">Deleting the app's icon deletes the journal with it.</p>
    <div class="actions">
      <button class="primary" type="button" onclick={() => (step = 3)}>Next</button>
      <button class="skip" type="button" onclick={() => finish(true)}>Skip</button>
    </div>
  {:else}
    <h1 id="welcome-title" class="screen-title">Pick your paper and pen</h1>
    <p class="lede">You can change both any time, in Settings and on the pen toolbar.</p>
    <fieldset>
      <legend>Paper</legend>
      <ul class="choices">
        {#each PAPERS as style (style)}
          {@const s = swatch(style)}
          <li>
            <label class="choice">
              <input type="radio" name="paper" value={style} bind:group={paper} />
              <svg class="swatch" viewBox="0 0 30 42" width="30" height="42" aria-hidden="true">
                <rect class="sheet" x="0.5" y="0.5" width="29" height="41" rx="1.5" />
                {#each s.lines ?? [] as y (y)}<line x1="3" x2="27" y1={y} y2={y} />{/each}
                {#each s.cols ?? [] as x (x)}<line x1={x} x2={x} y1="4" y2={s.foot ?? 38} />{/each}
                {#each s.dots ?? [] as [x, y] (`${x},${y}`)}<circle cx={x} cy={y} r="0.7" />{/each}
                {#if s.foot}<line x1="3" x2="27" y1={s.foot} y2={s.foot} />{/if}
              </svg>
              <span>{PAPER_NAMES[style]}</span>
            </label>
          </li>
        {/each}
      </ul>
    </fieldset>
    <fieldset>
      <legend>Pen</legend>
      <ul class="choices">
        <li><label class="choice"><input type="radio" name="pen" value="ballpoint" bind:group={pen} /><span>Ballpoint<small>Even lines, for quick writing</small></span></label></li>
        <li><label class="choice"><input type="radio" name="pen" value="fountain" bind:group={pen} /><span>Fountain pen<small>A slanted nib, thick and thin</small></span></label></li>
      </ul>
    </fieldset>
    <div class="actions">
      <button class="primary" type="button" onclick={() => finish()}>Start writing</button>
    </div>
  {/if}
</section>

<style>
  .onboarding {
    max-width: 38rem;
  }
  .step {
    margin: 0 0 var(--space-3);
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
  .note {
    max-width: 34rem;
    margin-top: var(--space-4);
    color: var(--ink-soft);
  }
  .steps {
    margin: var(--space-5) 0 0;
    padding-left: 1.4em;
    display: grid;
    gap: var(--space-3);
    max-width: 34rem;
  }
  .inline-icon {
    display: inline-flex;
    vertical-align: -4px;
    color: var(--accent-ink);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-top: var(--space-7);
  }
  .primary {
    display: inline-flex;
    align-items: center;
    min-height: var(--target);
    padding: 0 var(--space-5);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  .primary:hover {
    background: color-mix(in oklch, var(--ink) 88%, var(--accent));
  }
  .skip {
    min-height: var(--target);
    padding: 0 var(--space-3);
    border: 0;
    background: none;
    color: var(--ink-soft);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  fieldset {
    margin: var(--space-6) 0 0;
    padding: 0;
    border: 0;
  }
  legend {
    padding: 0;
    font-weight: 700;
  }
  .choices {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
  .choices li {
    border-bottom: var(--hairline) solid var(--rule);
  }
  .choice {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-height: calc(var(--target) + var(--space-3));
    padding: var(--space-2);
    cursor: pointer;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  .choice:hover {
    background: color-mix(in oklch, var(--linen) 55%, transparent);
  }
  .choice:has(input:checked) {
    background: var(--linen);
  }
  .choice input {
    width: 20px;
    height: 20px;
    margin: 0;
    accent-color: var(--ink);
  }
  .choice small {
    display: block;
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
  .swatch {
    flex: none;
  }
  .swatch .sheet {
    fill: var(--paper);
    stroke: var(--rule);
  }
  .swatch line {
    stroke: var(--ink-soft);
    stroke-width: 0.7;
    opacity: 0.8;
  }
  .swatch circle {
    fill: var(--ink-soft);
  }
</style>
