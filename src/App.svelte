<script lang="ts">
  import { route } from './router.ts';
  import Icon, { type IconName } from './ui/Icon.svelte';

  // MVP destinations (PRD 10.1). Calendar, Timeline, Search and Insights join in v1.
  const NAV: { href: string; label: string; icon: IconName }[] = [
    { href: '/today', label: 'Today', icon: 'today' },
    { href: '/library', label: 'Library', icon: 'library' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];
  const BARE = ['/onboarding']; // first run: no navigation yet
  const UNDER: Record<string, string> = { '/privacy': '/settings', '/diagnostics': '/settings' };

  let open = $state(false);
  const isCurrent = (href: string) => !!$route && (UNDER[$route.template] ?? $route.template) === href;
</script>

<div class="app" class:open>
  {#if $route && !BARE.includes($route.template)}
    <nav class="spine" aria-label="Main">
      <a class="mark" href="/today" aria-label="Morning Pages, today">
        <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
          <circle class="sun" cx="22" cy="11" r="4" />
          <path class="line" d="M6 21c2.6-3.6 4.6-3.6 6.2-1s3.6 2.6 5.6-.5 4.1-3.1 6.7.5" />
        </svg>
        <span class="label">Morning Pages</span>
      </a>
      <ul>
        {#each NAV as item (item.href)}
          <li>
            <a href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined} title={open ? undefined : item.label}>
              <Icon name={item.icon} />
              <span class="label">{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>
      <button class="toggle" type="button" aria-expanded={open} aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'} onclick={() => (open = !open)}>
        <Icon name={open ? 'rail-close' : 'rail-open'} />
      </button>
    </nav>
  {/if}

  <main>
    {#if $route}
      {@const Screen = $route.screen}
      <Screen params={$route.params} />
    {/if}
  </main>
</div>

<style>
  .app {
    min-height: 100dvh;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
  }

  /* The spine: the notebook's cloth binding, stitched, holding the way back to past pages. */
  .spine {
    position: sticky;
    top: 0;
    height: 100dvh;
    width: var(--rail-collapsed);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding: max(var(--space-4), env(safe-area-inset-top)) var(--space-3) max(var(--space-4), env(safe-area-inset-bottom))
      max(var(--space-3), env(safe-area-inset-left));
    background: var(--linen);
    box-shadow: inset calc(-1 * var(--hairline)) 0 0 var(--rule);
    transition: width var(--dur-base) var(--ease-out);
    overflow: hidden;
  }
  .spine::after {
    content: '';
    position: absolute;
    inset: 0 7px 0 auto;
    width: var(--hairline);
    background: repeating-linear-gradient(to bottom, var(--stitch) 0 5px, transparent 5px 10px);
    pointer-events: none;
  }
  .open .spine {
    width: var(--rail-open);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  a,
  .toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--target);
    min-width: var(--target);
    padding: 0 calc((var(--target) - 24px) / 2);
    border-radius: var(--radius-md);
    color: var(--ink-soft);
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color var(--dur-quick) var(--ease-out),
      color var(--dur-quick) var(--ease-out);
  }
  a:hover,
  .toggle:hover {
    color: var(--ink);
    background: color-mix(in oklch, var(--linen-deep) 60%, transparent);
  }
  a[aria-current='page'] {
    color: var(--ink);
    background: var(--linen-deep);
  }
  a[aria-current='page'] :global(.icon) {
    color: var(--accent-ink);
  }

  .mark {
    padding: 0 calc((var(--target) - 32px) / 2);
    color: var(--ink);
    font-family: var(--font-date);
    font-size: var(--text-lg);
    font-weight: 560;
    letter-spacing: -0.01em;
  }
  .mark svg {
    flex: none;
  }
  .mark .sun {
    fill: var(--accent);
  }
  .mark .line {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .mark:hover {
    background: none;
  }

  .toggle {
    margin-top: auto;
    border: 0;
    background: none;
    cursor: pointer;
  }

  /* Collapsed: icons only; labels stay in the accessibility tree. */
  .app:not(.open) .label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  main {
    min-width: 0;
  }

  /* iPhone, narrow Split View: the spine becomes a bottom tab bar in the same cloth. */
  @media (max-width: 899.98px) {
    .app {
      grid-template-columns: minmax(0, 1fr);
      padding-bottom: calc(var(--target) + var(--space-5) + env(safe-area-inset-bottom));
    }
    .spine {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 10;
      height: auto;
      width: auto;
      flex-direction: row;
      justify-content: center;
      padding: var(--space-2) max(var(--space-3), env(safe-area-inset-right)) max(var(--space-2), env(safe-area-inset-bottom))
        max(var(--space-3), env(safe-area-inset-left));
      box-shadow: inset 0 var(--hairline) 0 var(--rule);
      transition: none;
    }
    .spine::after {
      inset: 5px 0 auto 0;
      width: auto;
      height: var(--hairline);
      background: repeating-linear-gradient(to right, var(--stitch) 0 5px, transparent 5px 10px);
    }
    .mark,
    .toggle {
      display: none;
    }
    ul {
      flex: 1;
      max-width: 28rem;
      flex-direction: row;
      justify-content: space-around;
    }
    a {
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      padding: var(--space-1) var(--space-3);
      font-size: var(--text-xs);
    }
    .app:not(.open) .label {
      position: static;
      width: auto;
      height: auto;
      overflow: visible;
      clip-path: none;
    }
  }
</style>
