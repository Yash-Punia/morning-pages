<script lang="ts">
  // The writing surface: a committed layer (finished ink, tiles) under a live layer (the stroke in
  // progress, prediction, hover). The engine is plain TS, outside Svelte reactivity (TDD 3).
  import { onMount } from 'svelte';
  import { InkEngine } from './engine.ts';
  import type { InkDoc } from './page.ts';

  let { label, doc, date }: { label: string; doc: InkDoc; date: Date } = $props();
  let host: HTMLDivElement;
  let committed: HTMLCanvasElement;
  let live: HTMLCanvasElement;

  onMount(() => {
    const engine = new InkEngine(host, committed, live, { doc, date });
    return () => engine.destroy();
  });
</script>

<div class="ink" bind:this={host} data-ink role="img" aria-label={label}>
  <canvas class="layer" bind:this={committed} aria-hidden="true"></canvas>
  <canvas class="layer" bind:this={live} aria-hidden="true"></canvas>
</div>

<style>
  /* PEN-2 / S1b: the app owns every gesture here; no selection, loupe, callout or zoom.
     The desk around the page is the spine's linen. */
  .ink {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--linen);
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  /* D-037: sized by its box, never 100vh; the engine reads the box for backing pixels. */
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
</style>
