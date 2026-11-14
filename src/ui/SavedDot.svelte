<script lang="ts">
  // The saved dot (PRD 10.1, DUR-1): solid once every stroke is on disk, hollow while writes are in
  // flight or held. Quiet on purpose: only a problem is announced, never each save.
  import type { SaveState } from '../store/queue.ts';
  let { state }: { state: SaveState } = $props();
  const label = $derived(
    state === 'saved' ? 'Saved on this iPad'
      : state === 'saving' ? 'Saving'
      : state === 'full' ? 'Not saved yet: this iPad is out of space'
      : 'Not saved yet: still trying',
  );
</script>

<span class="dot" data-state={state} title={label} aria-hidden="true"></span>
<span class="visually-hidden" role="status">{state === 'held' || state === 'full' ? label : ''}</span>

<style>
  .dot {
    display: block;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 1.5px solid var(--ink-soft);
    background: var(--ink-soft);
    transition: background-color var(--dur-base) var(--ease-out);
  }
  /* Most saves finish in ~15 ms: only a save that takes a while ever shows hollow. */
  .dot[data-state='saving'] {
    background: transparent;
    transition-delay: 400ms;
  }
  .dot[data-state='held'],
  .dot[data-state='full'] {
    background: transparent;
    border-color: var(--accent-ink);
  }
</style>
