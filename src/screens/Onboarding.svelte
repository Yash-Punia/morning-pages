<script lang="ts">
  import type { Params } from '../router.ts';
  let { params: _ }: { params: Params } = $props();
</script>

<section class="screen" aria-labelledby="welcome-title">
  <h1 id="welcome-title" class="screen-title">Your journal stays on this iPad</h1>
  <p class="lede">Morning Pages keeps every page on this device. No account, nothing uploaded.</p>
  <p class="start"><a href="/today">Open today's page</a></p>
</section>

<style>
  .start {
    margin-top: var(--space-6);
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: var(--target);
    padding: 0 var(--space-5);
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--paper);
    text-decoration: none;
    font-weight: 600;
  }
  a:hover {
    background: color-mix(in oklch, var(--ink) 88%, var(--accent));
  }
</style>
