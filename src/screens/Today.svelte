<script lang="ts">
  import type { Params } from '../router.ts';
  import { openToday } from '../store/session.ts';
  import Writing from './Writing.svelte';
  let { params: _ }: { params: Params } = $props();

  const now = new Date();
  const doc = openToday(now);
</script>

{#await doc then doc}
  <Writing {doc} date={now} />
{:catch}
  <section class="screen">
    <h1 class="screen-title">Today</h1>
    <p class="lede">This iPad couldn't open the journal just now. Close the app and open it again.</p>
  </section>
{/await}
