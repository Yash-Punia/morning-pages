<script lang="ts">
  // One morning in a list (Library, Calendar day, Timeline): its first page, title, date and
  // length, between ruled lines. Its "…" menu (owner decision: delete lives on rows, never on the
  // writing screen) moves it to Recently Deleted at once, with Undo in its place (ENT-7).
  import { onMount } from 'svelte';
  import { db } from '../store/db.ts';
  import { deleteEntry, restoreEntry, type EntryRow } from '../store/entries.ts';
  import { writes } from '../store/queue.ts';
  import { forgetEntry } from '../store/session.ts';
  import { longDate } from './dates.ts';
  import Icon from './Icon.svelte';
  import PageThumb from './PageThumb.svelte';
  let { entry, href, thumbWidth = 48 }: { entry: EntryRow; href: string; thumbWidth?: number } = $props();

  const name = $derived(entry.title || 'Untitled');
  const menuId = $derived(`menu-${entry.id}`);
  let removed = $state(false);
  let pop = $state<HTMLElement>();
  let button = $state<HTMLButtonElement>();

  // A popover sits in the top layer: place it under its button (CSSOM, so CSP-safe).
  onMount(() => {
    const place = (e: Event) => {
      if ((e as ToggleEvent).newState !== 'open' || !pop || !button) return;
      const r = button.getBoundingClientRect();
      pop.style.top = `${Math.round(r.bottom + 4)}px`;
      pop.style.left = `${Math.round(Math.max(8, r.right - pop.offsetWidth))}px`;
    };
    pop?.addEventListener('toggle', place);
    return () => pop?.removeEventListener('toggle', place);
  });

  async function remove() {
    pop?.hidePopover();
    await writes.push({ run: () => deleteEntry(db(), entry.id) });
    forgetEntry(entry.id);
    removed = true;
  }
  async function undo() {
    await writes.push({ run: () => restoreEntry(db(), entry.id) });
    removed = false;
  }
</script>

{#if removed}
  <li class="row gone">
    <p role="status"><span class="what">“{name}”</span> moved to Recently Deleted.</p>
    <button type="button" class="text" onclick={undo}>Undo</button>
  </li>
{:else}
  <li class="row">
    <a {href}>
      <PageThumb thumb={entry.thumb} paper={entry.paper} width={thumbWidth} />
      <span class="text-block">
        <span class="title" class:untitled={!entry.title}>{name}</span>
        <span class="meta">{longDate(entry.entryDate)} · {entry.pages} {entry.pages === 1 ? 'page' : 'pages'}</span>
      </span>
    </a>
    <button type="button" class="more" bind:this={button} popovertarget={menuId} aria-label={`More for ${name}`}>
      <Icon name="more" weight={3} />
    </button>
    <div class="menu" id={menuId} popover="auto" bind:this={pop}>
      <a class="item" {href}>Open</a>
      <button type="button" class="item danger" onclick={remove}>Delete</button>
    </div>
  </li>
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    border-bottom: var(--hairline) solid var(--rule);
  }
  .row > a {
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
  .row > a:hover {
    background: color-mix(in oklch, var(--linen) 55%, transparent);
  }
  .text-block {
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
  .more {
    flex: none;
    display: grid;
    place-items: center;
    width: var(--target);
    height: var(--target);
    margin-right: var(--space-1);
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .more:hover {
    color: var(--ink);
    background: color-mix(in oklch, var(--linen) 70%, transparent);
  }
  /* A small paper menu floating over the list: the Float shadow is for things above the page. */
  .menu {
    position: fixed;
    inset: auto;
    margin: 0;
    min-width: 11rem;
    padding: var(--space-1);
    border: 0;
    border-radius: var(--radius-md);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-float);
  }
  .item {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: var(--target);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--ink);
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }
  .item:hover {
    background: color-mix(in oklch, var(--linen) 70%, transparent);
  }
  .danger {
    color: var(--accent-ink);
  }
  .gone {
    justify-content: space-between;
    gap: var(--space-3);
    min-height: calc(var(--target) + var(--space-5));
    padding: 0 var(--space-2);
    color: var(--ink-soft);
  }
  .gone p {
    margin: 0;
    min-width: 0;
  }
  .what {
    color: var(--ink);
  }
  .text {
    flex: none;
    min-height: var(--target);
    padding: 0 var(--space-3);
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--accent-ink);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
</style>
