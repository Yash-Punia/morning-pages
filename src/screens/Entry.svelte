<script lang="ts">
  // A saved morning, opened from the Library: the same writing surface as Today, to read or add to.
  import type { Params } from '../router.ts';
  import { fromLocalDate, openEntry } from '../store/session.ts';
  import Writing from './Writing.svelte';
  let { params }: { params: Params } = $props();

  const doc = $derived(openEntry(params.id ?? ''));
</script>

{#await doc then doc}
  {#if doc}
    <Writing {doc} date={fromLocalDate(doc.entry.entryDate)} />
  {:else}
    <section class="screen" aria-labelledby="entry-title">
      <h1 id="entry-title" class="screen-title">Entry not found</h1>
      <p class="lede">This entry isn't on this iPad. <a href="/library">Back to the Library</a></p>
    </section>
  {/if}
{/await}
