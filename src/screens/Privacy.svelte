<script lang="ts">
  // The privacy page (PRI-5, PRI-7, M4.11): plain words, and exactly what the anonymous counts
  // send. The list is built from the event allowlist itself, so it can't drift from the code.
  import type { Params } from '../router.ts';
  import { EVENT_DESCRIPTIONS, PAGE_VIEW_DESCRIPTION } from '../analytics/events.ts';
  let { params: _ }: { params: Params } = $props();
</script>

<section class="screen prose" aria-labelledby="privacy-title">
  <h1 id="privacy-title" class="screen-title">Privacy</h1>

  <h2>Your journal stays on this iPad</h2>
  <p>
    Your pages are kept in this app's storage on your iPad. They are never uploaded, and there is no account to sign in
    to. Nobody, including the maker of this app, can read them.
  </p>

  <h2>Deleting the app deletes the journal</h2>
  <p>
    Removing the Morning Pages icon from your Home Screen removes the journal stored with it. Pages written in a Safari
    tab stay in Safari and don't appear in the Home Screen app.
  </p>

  <h2>Anonymous usage counts</h2>
  <p>
    To learn what to improve, the app counts a few things and sends them to Umami, a privacy-friendly analytics
    service that uses no cookies. You can switch this off in <a href="/settings">Settings</a>, and then nothing is
    sent at all. This is everything it counts:
  </p>
  <ul class="events">
    <li>{PAGE_VIEW_DESCRIPTION}</li>
    {#each Object.entries(EVENT_DESCRIPTIONS) as [name, what] (name)}
      <li>{what}</li>
    {/each}
  </ul>
  <p>
    It never sends your writing, titles, the dates of your entries, which entry you opened, exact times or counts, or
    anything that identifies you.
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
  .events {
    max-width: 62ch;
    margin: var(--space-3) 0 0;
    padding-left: 1.2em;
    display: grid;
    gap: var(--space-2);
  }
</style>
