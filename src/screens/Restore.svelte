<script lang="ts">
  // Restore (BAK-4, TDD 8.3, M5 shape brief). Steps in order, each shown once it's reached:
  // choose a file, see what's in it, choose how it comes in, and for a Replace, save a copy of
  // this iPad's journal first. Nothing is written until the last tap.
  import { tick } from 'svelte';
  import type { Params } from '../router.ts';
  import { backup, backupAction, hasJournal, previewBackup, restoreBackup } from '../backup/client.ts';
  import type { Preview } from '../backup/read.ts';
  import type { RestoreMode } from '../backup/restore.ts';
  import { EXTENSION } from '../backup/format.ts';
  import { longDate } from '../ui/dates.ts';
  import { localDate } from '../store/session.ts';
  let { params: _ }: { params: Params } = $props();

  type Step = 'choose' | 'checking' | 'preview' | 'problem' | 'restoring';
  let step = $state<Step>('choose');
  let file = $state<File>();
  let preview = $state<Preview>();
  let problem = $state('');
  let progress = $state(0);
  let input = $state<HTMLInputElement>()!;

  /** Does this iPad have a journal that a Replace would remove? */
  let local = $state<boolean>();
  void hasJournal().then((v) => (local = v), () => (local = true));

  const PROBLEMS: Record<string, string> = {
    'not-backup': 'This file isn’t a Morning Pages backup.',
    newer: 'This backup was made by a newer version of Morning Pages. Update the app, then try again.',
    encrypted: 'This backup is locked with a passphrase, which this version can’t open yet.',
    damaged: 'This file is damaged: some of it doesn’t match its checksums, so nothing was restored.',
  };

  async function pick() {
    const f = input.files?.[0];
    input.value = ''; // choosing the same file again still counts
    if (!f) return;
    file = f;
    replacing = false;
    step = 'checking';
    try {
      preview = await previewBackup(f);
      step = 'preview';
    } catch (e) {
      problem = PROBLEMS[(e as Error).message] ?? 'This file couldn’t be read. Try choosing it again.';
      step = 'problem';
    }
  }

  // Replace removes this iPad's journal first, so it waits for a saved copy (owner decision).
  let replacing = $state(false);
  let safetyStarted = $state(false);
  const safetySaved = $derived(safetyStarted && $backup.step === 'idle' && !!$backup.outcome);
  function safetyCopy() {
    safetyStarted = true;
    void backupAction();
  }

  async function start(mode: RestoreMode) {
    step = 'restoring';
    progress = 0;
    try {
      await restoreBackup(file!, mode, (f, phase) => phase === 'restore' && (progress = f));
      // restoreBackup reloads into the Library.
    } catch {
      problem = 'The restore stopped before it finished. Choose the same file again to finish it.';
      step = 'problem';
    }
  }

  // Each new step takes focus at its heading, so VoiceOver reads where things are now.
  $effect(() => {
    const id = { preview: 'preview-heading', problem: 'problem-heading', restoring: 'restoring-heading' }[step as string];
    if (id) void tick().then(() => document.getElementById(id)?.focus());
  });
  $effect(() => {
    if (replacing) void tick().then(() => document.getElementById('safety-heading')?.focus());
  });

  const mb = (n: number) => `${Math.max(0.1, n / 1_048_576).toFixed(1)} MB`;
  const count = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
</script>

<section class="screen" aria-labelledby="restore-title">
  <h1 id="restore-title" class="screen-title">Restore</h1>
  <p class="lede">Restoring brings back the pages in a backup file. Nothing changes until you choose how.</p>

  {#if step !== 'restoring'}
    <input bind:this={input} class="visually-hidden" type="file" accept={`${EXTENSION},application/zip`} tabindex="-1" aria-hidden="true" onchange={pick} />
    <p class="choose">
      <button type="button" class="pill" class:solid={step === 'choose'} onclick={() => input.click()} disabled={step === 'checking'}>
        {step === 'checking' ? 'Checking the file…' : step === 'choose' ? 'Choose a backup file' : 'Choose another file'}
      </button>
    </p>
  {/if}

  {#if step === 'problem'}
    <section class="step" aria-labelledby="problem-heading">
      <h2 id="problem-heading" tabindex="-1">Nothing was restored</h2>
      <p>{problem}</p>
    </section>
  {/if}

  {#if step === 'preview' && preview}
    <section class="step" aria-labelledby="preview-heading">
      <h2 id="preview-heading" class="range" tabindex="-1">
        {#if preview.dateRange}
          {#if preview.dateRange[0] === preview.dateRange[1]}{longDate(preview.dateRange[0])}{:else}{longDate(preview.dateRange[0])} <span class="to">to</span> {longDate(preview.dateRange[1])}{/if}
        {:else}
          An empty journal
        {/if}
      </h2>
      <dl class="facts">
        <div><dt>Mornings</dt><dd>{count(preview.mornings, 'morning', 'mornings')}, {count(preview.pages, 'page', 'pages')}</dd></div>
        <div><dt>File</dt><dd>{mb(file!.size)}</dd></div>
        <div><dt>Backed up</dt><dd>{preview.createdAt ? longDate(localDate(new Date(preview.createdAt))) : 'Unknown'}{preview.appVersion ? `, with version ${preview.appVersion}` : ''}</dd></div>
      </dl>
    </section>

    {#if local !== undefined}
      <section class="step" aria-labelledby="how-heading">
        <h2 id="how-heading">How should it come in?</h2>
        {#if local}
          <ul class="options">
            <li>
              <button type="button" class="pill solid" onclick={() => start('merge')}>Merge into this iPad</button>
              <p class="hint">Pages on both are kept, and the newer copy of each wins.</p>
            </li>
            <li>
              <button type="button" class="pill" onclick={() => (replacing = true)} aria-expanded={replacing}>Replace this iPad’s journal</button>
              <p class="hint">Use only the backup. This iPad’s journal is removed first.</p>
            </li>
          </ul>
        {:else}
          <ul class="options">
            <li>
              <button type="button" class="pill solid" onclick={() => start('merge')}>Restore</button>
              <p class="hint">This iPad has no journal yet, so nothing here is replaced.</p>
            </li>
          </ul>
        {/if}
      </section>
    {/if}

    {#if replacing}
      <section class="step safety" aria-labelledby="safety-heading">
        <h2 id="safety-heading" tabindex="-1">First, save a copy of this iPad’s journal</h2>
        <p class="hint" aria-live="polite">
          {#if safetySaved}Saved. You can replace it now.
          {:else if $backup.step === 'building'}Preparing the copy… {Math.round($backup.progress * 100)} %
          {:else if $backup.step === 'ready'}Ready. Save it to Files, a USB drive or another device.
          {:else if $backup.step === 'error'}The copy couldn’t be made. Try again in a moment.
          {:else}Then, if the backup isn’t what you hoped, nothing is lost.{/if}
        </p>
        {#if $backup.step === 'building'}
          <progress class="rule-progress" max="1" value={$backup.progress} aria-label="Preparing the copy"></progress>
        {/if}
        <p class="actions">
          {#if safetySaved}
            <button type="button" class="pill solid" onclick={() => start('replace')}>Replace now</button>
          {:else}
            <button type="button" class="pill" class:solid={$backup.step === 'ready'} onclick={safetyCopy} disabled={$backup.step === 'building'}>
              {$backup.step === 'ready' ? 'Save the copy' : $backup.step === 'building' ? 'Preparing…' : 'Back up this iPad'}
            </button>
          {/if}
        </p>
        {#if !safetySaved}
          <p><button type="button" class="text-button" onclick={() => start('replace')}>Replace without saving a copy</button></p>
        {/if}
      </section>
    {/if}
  {/if}

  {#if step === 'restoring'}
    <section class="step" aria-labelledby="restoring-heading">
      <h2 id="restoring-heading" tabindex="-1">Restoring…</h2>
      <progress class="rule-progress" max="1" value={progress} aria-label="Restoring"></progress>
      <p class="hint" aria-live="polite">{Math.round(progress * 100)} %. Keep the app open; it reopens on the Library when it’s done.</p>
    </section>
  {/if}
</section>

<style>
  .choose {
    margin: var(--space-5) 0 0;
  }
  .step {
    margin-top: var(--space-7);
  }
  h2 {
    margin: 0;
    font-size: var(--text-md);
    font-weight: 700;
  }
  h2:focus {
    outline: none;
  }
  /* The Lettered Date Rule: the backup's dates, set like a page header, are this screen's focus. */
  .range {
    font-family: var(--font-date);
    font-size: var(--text-lg);
    font-weight: 520;
    letter-spacing: -0.01em;
    line-height: 1.2;
    text-wrap: balance;
  }
  .range .to {
    color: var(--ink-soft);
  }
  .facts {
    margin: var(--space-4) 0 0;
    border-top: var(--hairline) solid var(--rule);
  }
  .facts div {
    display: grid;
    grid-template-columns: minmax(7rem, 1fr) 3fr;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-2);
    border-bottom: var(--hairline) solid var(--rule);
  }
  .facts dt {
    color: var(--ink-soft);
  }
  .facts dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .options {
    list-style: none;
    display: grid;
    gap: var(--space-5);
    margin: var(--space-4) 0 0;
    padding: 0;
  }
  .options li {
    display: grid;
    justify-items: start;
    gap: var(--space-2);
  }
  .hint {
    margin: 0;
    color: var(--ink-soft);
    max-width: 52ch;
  }
  .safety {
    padding-top: var(--space-5);
    border-top: var(--hairline) solid var(--rule);
  }
  .safety .hint,
  .step progress {
    margin-top: var(--space-3);
  }
  .actions {
    margin: var(--space-4) 0 0;
  }
  @media (max-width: 479.98px) {
    .facts div {
      grid-template-columns: 1fr;
      gap: 2px;
    }
  }
</style>
