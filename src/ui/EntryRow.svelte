<script lang="ts">
  // One morning in a list (Library, Calendar day, Timeline): its first page, title, date and
  // length, between ruled lines. The trailing slot holds the row's menu (M4.9).
  import type { Snippet } from 'svelte';
  import type { EntryRow } from '../store/entries.ts';
  import { longDate } from './dates.ts';
  import PageThumb from './PageThumb.svelte';
  let { entry, href, thumbWidth = 48, menu }: { entry: EntryRow; href: string; thumbWidth?: number; menu?: Snippet } = $props();
</script>

<li class="row">
  <a {href}>
    <PageThumb thumb={entry.thumb} paper={entry.paper} width={thumbWidth} />
    <span class="text">
      <span class="title" class:untitled={!entry.title}>{entry.title || 'Untitled'}</span>
      <span class="meta">{longDate(entry.entryDate)} · {entry.pages} {entry.pages === 1 ? 'page' : 'pages'}</span>
    </span>
  </a>
  {#if menu}{@render menu()}{/if}
</li>

<style>
  .row {
    display: flex;
    align-items: center;
    border-bottom: var(--hairline) solid var(--rule);
  }
  a {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
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
  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title.untitled {
    color: var(--ink-soft);
    font-weight: 400;
  }
  .meta {
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
</style>
