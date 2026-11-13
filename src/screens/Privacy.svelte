<script lang="ts">
  import type { Params } from '../router.ts';
  let { params: _ }: { params: Params } = $props();
</script>

<section class="screen prose" aria-labelledby="privacy-title">
  <h1 id="privacy-title" class="screen-title">Privacy</h1>
  <h2>Your journal stays on this iPad</h2>
  <p>
    Your pages are kept in this app's storage on your device. They are never uploaded, and there is no account to sign
    in to.
  </p>
  <h2>Deleting the app deletes the journal</h2>
  <p>
    Removing the Morning Pages icon from your Home Screen also removes the journal stored with it. Pages written in a
    Safari tab stay in Safari and don't appear in the Home Screen app.
  </p>
</section>

<style>
  h2 {
    margin-top: var(--space-6);
    font-size: var(--text-md);
    font-weight: 700;
  }
  p {
    margin-top: var(--space-2);
    max-width: 62ch;
  }
</style>
