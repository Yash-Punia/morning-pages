<script lang="ts">
  // The floating tool pill (PRD 4.3): four presets, the eraser, undo and redo. It docks left,
  // right or top in its own gutter, so it never sits over the writing (PRD 10.2), and folds to a
  // dot. The Pencil only ever acts on it here; the canvas never sees these taps.
  import Icon from './Icon.svelte';
  import { commands, history, SIZES, sizeName, tools, type Dock, type Preset } from '../ink/tools.ts';
  import { INK_NAMES, PALETTE } from '../ink/inks.ts';
  import { nibSwatchPath } from '../ink/stroke.ts';
  import type { InkId, ToolId } from '../ink/types.ts';

  let editing = $state(false);
  let root: HTMLElement | undefined = $state();

  const TOOL_NAMES: Record<ToolId, string> = { fountain: 'Fountain pen', ballpoint: 'Ballpoint' };
  const css = (color: InkId) => (color.startsWith('#') ? color : `var(--pen-${color})`);
  const inkName = (color: InkId) => (color.startsWith('#') ? 'custom ink' : INK_NAMES[color as keyof typeof INK_NAMES]);
  const label = (p: Preset) => `${TOOL_NAMES[p.tool]}, ${inkName(p.color)}, ${sizeName(p.size)}`;
  const swatchWidth = (size: number) => Math.min(5, Math.max(1.6, size * 0.45));

  const active = $derived($tools.presets[$tools.active]!);
  const orientation = $derived($tools.dock === 'top' ? 'horizontal' : 'vertical');

  function choose(i: number) {
    if ($tools.active === i && $tools.mode === 'pen') editing = !editing; // tap again to edit (owner choice)
    else {
      tools.update((s) => ({ ...s, active: i, mode: 'pen' }));
      editing = false;
    }
  }
  function edit(patch: Partial<Preset>) {
    tools.update((s) => {
      const presets = [...s.presets] as typeof s.presets;
      presets[s.active] = { ...presets[s.active]!, ...patch };
      return { ...s, presets };
    });
  }
  function setCustom(i: number, hex: string) {
    tools.update((s) => {
      const customs = [...s.customs] as typeof s.customs;
      customs[i] = hex;
      return { ...s, customs };
    });
    edit({ color: hex as InkId });
  }

  const ORDER: Dock[] = ['left', 'top', 'right'];
  const dockTo = (dock: Dock) => tools.update((s) => ({ ...s, dock }));

  // Move: drag the grip to an edge, or tap it to step through left → top → right.
  let drag: { id: number; x: number; y: number } | null = null;
  function gripDown(e: PointerEvent) {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function gripUp(e: PointerEvent) {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 24;
    drag = null;
    if (!moved) return dockTo(ORDER[(ORDER.indexOf($tools.dock) + 1) % ORDER.length]!);
    dockTo(e.clientY < innerHeight * 0.25 ? 'top' : e.clientX < innerWidth / 2 ? 'left' : 'right');
  }
  function gripKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dockTo(ORDER[(ORDER.indexOf($tools.dock) + 1) % ORDER.length]!);
    }
  }

  function outside(e: PointerEvent) {
    if (editing && root && !root.contains(e.target as Node)) editing = false;
  }
  function onKey(e: KeyboardEvent) {
    if (editing && e.key === 'Escape') editing = false;
  }
</script>

<svelte:window onpointerdown={outside} onkeydown={onKey} />

{#if $tools.collapsed}
  <button class="dot" data-dock={$tools.dock} type="button" aria-label="Show writing tools" onclick={() => tools.update((s) => ({ ...s, collapsed: false }))}>
    {@render swatch(active)}
  </button>
{:else}
  <div class="pill" bind:this={root} data-dock={$tools.dock} role="toolbar" aria-label="Writing tools" aria-orientation={orientation}>
    {#each $tools.presets as preset, i (i)}
      <button
        type="button"
        class="tool"
        aria-pressed={$tools.mode === 'pen' && $tools.active === i}
        aria-label={label(preset)}
        aria-haspopup={$tools.mode === 'pen' && $tools.active === i ? 'dialog' : undefined}
        onclick={() => choose(i)}
      >
        {@render swatch(preset)}
      </button>
    {/each}
    <button type="button" class="tool" aria-pressed={$tools.mode === 'eraser'} aria-label="Eraser"
      onclick={() => { tools.update((s) => ({ ...s, mode: s.mode === 'eraser' ? 'pen' : 'eraser' })); editing = false; }}>
      <Icon name="eraser" />
    </button>
    <span class="rule" aria-hidden="true"></span>
    <button type="button" class="tool" aria-label="Undo" disabled={!$history.canUndo} onclick={() => commands.undo()}><Icon name="undo" /></button>
    <button type="button" class="tool" aria-label="Redo" disabled={!$history.canRedo} onclick={() => commands.redo()}><Icon name="redo" /></button>
    <span class="rule" aria-hidden="true"></span>
    <button type="button" class="tool grip" aria-label={`Move writing tools (docked ${$tools.dock})`}
      onpointerdown={gripDown} onpointerup={gripUp} onpointercancel={() => (drag = null)} onkeydown={gripKey}>
      <Icon name="grip" weight={3} />
    </button>
    <button type="button" class="tool" aria-label="Fold writing tools away" onclick={() => { editing = false; tools.update((s) => ({ ...s, collapsed: true })); }}>
      <Icon name={`fold-${$tools.dock}`} />
    </button>

    {#if editing}
      <div class="editor" role="dialog" aria-label="Edit pen">
        <fieldset>
          <legend>Pen</legend>
          <div class="segmented">
            {#each ['fountain', 'ballpoint'] as const as tool (tool)}
              <label><input type="radio" name="tool" checked={active.tool === tool} onchange={() => edit({ tool, size: tool === 'ballpoint' ? 2.8 : 5 })} />{TOOL_NAMES[tool]}</label>
            {/each}
          </div>
        </fieldset>
        <fieldset>
          <legend>Ink</legend>
          <div class="inks">
            {#each PALETTE as id (id)}
              <label class="ink" title={INK_NAMES[id]}>
                <input type="radio" name="ink" checked={active.color === id} onchange={() => edit({ color: id })} aria-label={INK_NAMES[id]} />
                <span class="chip" style:--chip={css(id)}></span>
              </label>
            {/each}
            {#each $tools.customs as hex, i (i)}
              <label class="ink custom" title={hex ? 'Custom ink' : 'Add a custom ink'}>
                <input type="color" value={hex ?? '#3a5a40'} aria-label={hex ? `Custom ink ${i + 1}` : `Add custom ink ${i + 1}`}
                  oninput={(e) => setCustom(i, (e.currentTarget as HTMLInputElement).value)} />
                <span class="chip" class:empty={!hex} class:on={!!hex && active.color === hex} style:--chip={hex ?? 'transparent'}></span>
              </label>
            {/each}
          </div>
        </fieldset>
        <label class="size">
          <span>Size <span class="hint">{sizeName(active.size)}</span></span>
          <input type="range" min={SIZES.min} max={SIZES.max} step={SIZES.step} value={active.size}
            oninput={(e) => edit({ size: Number((e.currentTarget as HTMLInputElement).value) })} />
        </label>
        <button type="button" class="done" onclick={() => (editing = false)}>Done</button>
      </div>
    {/if}
  </div>
{/if}

{#snippet swatch(p: Preset)}
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <!-- style:, not presentation attributes: those don't resolve var() -->
    {#if p.tool === 'fountain'}
      <path d={nibSwatchPath(p.size)} style:fill={css(p.color)} />
    {:else}
      <path d="M4 15.5c2.6-5.2 4.6-5.2 7.2-1.2s4.6 4 8.8-2.8" fill="none" style:stroke={css(p.color)} stroke-width={swatchWidth(p.size)} stroke-linecap="round" />
    {/if}
  </svg>
{/snippet}

<style>
  .pill,
  .dot {
    background: var(--paper);
    box-shadow: var(--shadow-float);
    border-radius: var(--radius-pill);
  }
  .pill {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px;
    touch-action: manipulation;
  }
  .pill[data-dock='top'] {
    flex-direction: row;
  }
  .tool {
    display: grid;
    place-items: center;
    width: var(--target);
    height: var(--target);
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--ink-soft);
    cursor: pointer;
    transition: background-color var(--dur-quick) var(--ease-out), color var(--dur-quick) var(--ease-out);
  }
  .tool:hover:not(:disabled) {
    background: color-mix(in oklch, var(--linen) 70%, transparent);
    color: var(--ink);
  }
  .tool[aria-pressed='true'] {
    background: var(--linen-deep);
    color: var(--ink);
  }
  .tool:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .grip {
    cursor: grab;
  }
  .rule {
    flex: none;
    width: 24px;
    height: var(--hairline);
    margin: 2px 0;
    background: var(--rule);
  }
  .pill[data-dock='top'] .rule {
    width: var(--hairline);
    height: 24px;
    margin: 0 2px;
  }

  .dot {
    position: absolute;
    z-index: 5;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border: 0;
    cursor: pointer;
  }
  .dot[data-dock='left'] { left: max(var(--space-3), env(safe-area-inset-left)); top: 50%; translate: 0 -50%; }
  .dot[data-dock='right'] { right: max(var(--space-3), env(safe-area-inset-right)); top: 50%; translate: 0 -50%; }
  .dot[data-dock='top'] { top: max(var(--space-3), env(safe-area-inset-top)); left: 50%; translate: -50% 0; }

  /* The preset editor opens beside the pill, over the page, and closes with Done, Esc or a tap away. */
  .editor {
    position: absolute;
    z-index: 6;
    display: grid;
    gap: var(--space-4);
    width: 17rem;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--paper);
    box-shadow: var(--shadow-float);
    color: var(--ink);
  }
  .pill[data-dock='left'] .editor { left: calc(100% + var(--space-2)); top: 0; }
  .pill[data-dock='right'] .editor { right: calc(100% + var(--space-2)); top: 0; }
  .pill[data-dock='top'] .editor { top: calc(100% + var(--space-2)); left: 0; }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend,
  .size > span {
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 700;
  }
  .hint {
    margin-left: var(--space-1);
    color: var(--ink-soft);
    font-weight: 400;
  }
  .segmented {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 3px;
    border-radius: var(--radius-pill);
    background: var(--linen);
  }
  .segmented label {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 38px;
    border-radius: var(--radius-pill);
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .segmented label:has(input:checked) {
    background: var(--paper);
    box-shadow: 0 1px 3px oklch(28.2% 0.034 255.8 / 0.18);
  }
  .segmented input,
  .ink input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }
  .inks {
    display: grid;
    grid-template-columns: repeat(4, var(--target));
    gap: var(--space-2);
  }
  .ink {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--target);
    height: var(--target);
  }
  .chip {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--chip);
    box-shadow: inset 0 0 0 var(--hairline) var(--rule);
    pointer-events: none;
  }
  .ink:has(input:checked) .chip,
  .chip.on {
    outline: 2px solid var(--accent-ink);
    outline-offset: 3px;
  }
  .chip.empty {
    background:
      linear-gradient(var(--ink-soft), var(--ink-soft)) center / 12px 1.5px no-repeat,
      linear-gradient(var(--ink-soft), var(--ink-soft)) center / 1.5px 12px no-repeat;
    box-shadow: inset 0 0 0 1.5px var(--rule);
  }
  .ink input:focus-visible + .chip,
  .segmented input:focus-visible {
    outline: 2px solid var(--accent-ink);
    outline-offset: 3px;
  }
  .size {
    display: grid;
  }
  .size input {
    width: 100%;
    accent-color: var(--ink);
  }
  .done {
    justify-self: end;
    min-height: var(--target);
    padding: 0 var(--space-5);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
    cursor: pointer;
  }
</style>
