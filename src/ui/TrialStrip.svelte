<!--
  STO-1: in a Safari tab, storage can be cleared after weeks without a visit, and the installed app
  keeps its own journal. Said quietly on every screen; never a dialog, never over the page.
  One fixed line, so the layout below can subtract it in pure CSS (`:root:has(.trial)`): measuring it
  from script during the router's view transition crashed WebKit.
-->
<p class="trial" role="note">
  <span class="short" aria-hidden="true">Trial mode</span>
  <span class="long">Trial mode: pages in Safari aren't kept long-term.</span>
  <a href="/onboarding?step=2">Add to Home Screen</a>
</p>

<style>
  :global(:root:has(.trial)) {
    --chrome-top: 2.75rem;
  }
  .trial {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-3);
    height: 2.75rem;
    margin: 0;
    padding: 0 max(var(--space-4), env(safe-area-inset-right)) 0 max(var(--space-4), env(safe-area-inset-left));
    overflow: hidden;
    background: var(--linen-deep);
    color: var(--ink);
    font-size: var(--text-xs);
    white-space: nowrap;
  }
  .short {
    display: none;
  }
  a {
    display: inline-flex;
    align-items: center;
    height: 100%;
    color: var(--accent-ink);
    font-weight: 600;
  }
  /* Narrow windows: the short label shows; the full sentence stays for VoiceOver. */
  @media (max-width: 599.98px) {
    .short {
      display: inline;
    }
    .long {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  }
</style>
