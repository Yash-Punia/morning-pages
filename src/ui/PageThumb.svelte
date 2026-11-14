<script lang="ts">
  // An entry's first page, small (M4.7): its stored JPEG, or plain ruled paper until one exists.
  // True A5 proportions, so the past reads as a stack of real pages.
  import type { PaperStyle } from '../ink/types.ts';
  let { thumb, paper, width = 48 }: { thumb?: ArrayBuffer; paper: PaperStyle; width?: number } = $props();

  let url = $state<string>();
  $effect(() => {
    if (!thumb) return;
    const u = URL.createObjectURL(new Blob([thumb], { type: 'image/jpeg' }));
    url = u;
    return () => URL.revokeObjectURL(u);
  });
</script>

<span class="page" data-paper={paper} style:width={`${width}px`}>
  {#if url}<img src={url} alt="" />{/if}
</span>

<style>
  .page {
    position: relative;
    display: block;
    flex: none;
    aspect-ratio: 1000 / 1414;
    overflow: hidden;
    border-radius: 2px;
    background: var(--paper);
    box-shadow: 0 0 0 var(--hairline) var(--rule);
  }
  /* Placeholder rulings, until the page's thumbnail has been drawn. */
  .page[data-paper^='lined'],
  .page[data-paper='cornell'] {
    background-image: repeating-linear-gradient(to bottom, transparent 0 calc(10% - 1px), var(--rule) calc(10% - 1px) 10%);
    background-position: 0 14%;
  }
  .page[data-paper='grid'] {
    background-image:
      repeating-linear-gradient(to bottom, transparent 0 calc(8% - 1px), var(--rule) calc(8% - 1px) 8%),
      repeating-linear-gradient(to right, transparent 0 calc(11.3% - 1px), var(--rule) calc(11.3% - 1px) 11.3%);
  }
  .page[data-paper='dotted'] {
    background-image: radial-gradient(var(--rule) 0.8px, transparent 1px);
    background-size: 11.3% 8%;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* By night a cream page would glare: dim it a little, like paper under a lamp. */
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='paper'])) img {
      filter: brightness(0.82);
    }
  }
  :global(:root[data-theme='night']) img {
    filter: brightness(0.82);
  }
</style>
