<script lang="ts">
  import type { Params } from '../router.ts';
  import { startedEntry } from '../ink/session.ts';
  import Icon from '../ui/Icon.svelte';
  let { params: _ }: { params: Params } = $props();

  // M2: only today's entry exists, in memory. M3 saves entries to the device; the full list of
  // past mornings (by title, newest first) arrives with M4's Library.
  const entry = startedEntry();
  const date = entry && new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(entry.date);
  const pages = entry ? entry.doc.pages.length - 1 || 1 : 0; // the trailing blank page isn't counted
</script>

<section class="screen" aria-labelledby="library-title">
  <h1 id="library-title" class="screen-title">Library</h1>
  {#if entry}
    <ul>
      <li>
        <a href="/today">
          <span class="text">
            <span class="title" class:untitled={!entry.doc.title}>{entry.doc.title || 'Untitled'}</span>
            <span class="meta">{date} · {pages} {pages === 1 ? 'page' : 'pages'}</span>
          </span>
          <Icon name="arrow-right" size={20} />
        </a>
      </li>
    </ul>
    <p class="lede">Earlier mornings will gather here once pages are saved on this iPad.</p>
  {:else}
    <p class="lede">Your past mornings will gather here, one page at a time.</p>
  {/if}
</section>

<style>
  ul {
    list-style: none;
    margin: var(--space-6) 0 var(--space-5);
    padding: 0;
    border-top: var(--hairline) solid var(--rule);
  }
  li {
    border-bottom: var(--hairline) solid var(--rule);
  }
  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    min-height: calc(var(--target) + var(--space-5));
    padding: var(--space-3) var(--space-2);
    color: var(--ink);
    text-decoration: none;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  a:hover {
    background: color-mix(in oklch, var(--linen) 55%, transparent);
  }
  a :global(.icon) {
    color: var(--ink-soft);
  }
  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-family: var(--font-date);
    font-size: var(--text-lg);
    font-weight: 520;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title.untitled {
    color: var(--ink-soft);
  }
  .meta {
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
</style>
