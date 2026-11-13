<script lang="ts">
  import type { Params } from '../router.ts';
  import Icon from '../ui/Icon.svelte';
  import { version } from '../../package.json';
  let { params: _ }: { params: Params } = $props();

  const LINKS = [
    { href: '/privacy', label: 'Privacy', hint: 'What stays on this iPad' },
    { href: '/diagnostics', label: 'Diagnostics', hint: 'Storage, offline and version details' },
  ];
</script>

<section class="screen" aria-labelledby="settings-title">
  <h1 id="settings-title" class="screen-title">Settings</h1>
  <ul>
    {#each LINKS as link (link.href)}
      <li>
        <a href={link.href}>
          <span class="text">
            <span class="label">{link.label}</span>
            <span class="hint">{link.hint}</span>
          </span>
          <Icon name="arrow-right" size={20} />
        </a>
      </li>
    {/each}
  </ul>
  <p class="version">Morning Pages <data value={version}>{version}</data></p>
</section>

<style>
  ul {
    list-style: none;
    margin: var(--space-6) 0 0;
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
    min-height: calc(var(--target) + var(--space-4));
    padding: var(--space-3) var(--space-2);
    text-decoration: none;
    color: var(--ink);
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
  }
  .hint {
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
  .version {
    margin-top: var(--space-7);
    color: var(--ink-soft);
    font-size: var(--text-sm);
  }
</style>
