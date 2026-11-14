<script lang="ts">
  // The writing surface: a committed layer (finished ink, tiles) under a live layer (the stroke in
  // progress, prediction, hover). The engine is plain TS, outside Svelte reactivity (TDD 3).
  // The entry's title is a real text field laid over page 1's title band; it sits outside the
  // canvas host, so taps on it never reach the pen handling.
  import { onMount } from 'svelte';
  import { InkEngine } from './engine.ts';
  import type { InkDoc } from './page.ts';

  let { label, doc, date }: { label: string; doc: InkDoc; date: Date } = $props();
  let host: HTMLDivElement;
  let committed: HTMLCanvasElement;
  let live: HTMLCanvasElement;
  let title: HTMLInputElement;

  onMount(() => {
    const engine = new InkEngine(host, committed, live, { doc, date, title });
    return () => engine.destroy();
  });
</script>

<div class="surface">
  <div class="ink" bind:this={host} data-ink role="img" aria-label={label}>
    <canvas class="layer" bind:this={committed} aria-hidden="true"></canvas>
    <canvas class="layer" bind:this={live} aria-hidden="true"></canvas>
  </div>
  <input
    bind:this={title}
    class="title"
    type="text"
    placeholder="Title"
    aria-label="Entry title"
    autocomplete="off"
    enterkeyhint="done"
    maxlength="120"
    value={doc.title}
    oninput={(e) => (doc.title = (e.currentTarget as HTMLInputElement).value)}
    onkeydown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
  />
</div>

<style>
  .surface {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
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
  /* The title reads as part of the page: no box, just Fraunces on the paper. The engine sets its
     position and size from the page's scale. */
  .title {
    position: absolute;
    top: 0;
    left: 0;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink);
    font-family: var(--font-date);
    font-weight: 520;
    letter-spacing: -0.015em;
    transform-origin: 0 0;
  }
  .title::placeholder {
    color: var(--ink-soft);
    opacity: 1;
  }
  /* Focus as a written-on line rather than a box: still a clear 2 px terracotta indicator. */
  .title:focus-visible {
    outline: none;
    box-shadow: 0 2px 0 var(--accent-ink);
    border-radius: 0;
  }
</style>
