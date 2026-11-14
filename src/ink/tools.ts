// What the Pencil is set to, shared by the toolbar and the engine, and kept between visits
// (a preference, so it lives in the settings shim until kv in M3).
import { writable } from 'svelte/store';
import type { InkId, ToolId } from './types.ts';

export interface Preset { tool: ToolId; color: InkId; size: number }
export type Dock = 'left' | 'right' | 'top';

export interface ToolState {
  presets: [Preset, Preset, Preset, Preset]; // PRD 4.3: four favourites on the toolbar
  active: number;
  mode: 'pen' | 'eraser';
  dock: Dock; // left by default: the owner writes right-handed, so the palm never meets it
  collapsed: boolean;
  customs: [string | null, string | null, string | null]; // three custom inks (hex)
}

export const SIZES = { min: 1.5, max: 12, step: 0.5 };

const DEFAULTS: ToolState = {
  presets: [
    { tool: 'ballpoint', color: 'black', size: 2.8 }, // the owner's everyday pen: first, and selected
    { tool: 'fountain', color: 'blueBlack', size: 5 },
    { tool: 'fountain', color: 'sepia', size: 5 },
    { tool: 'ballpoint', color: 'crimson', size: 2.8 },
  ],
  active: 0,
  mode: 'pen',
  dock: 'left',
  collapsed: false,
  customs: [null, null, null],
};

// v2: ballpoint became the first preset (owner feedback). A new key lets the new defaults reach
// devices that saved the old order.
const KEY = 'mp.ink.tools.v2';

function load(): ToolState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ToolState> | null;
    if (saved && Array.isArray(saved.presets) && saved.presets.length === 4) return { ...DEFAULTS, ...saved, mode: 'pen' };
  } catch { /* corrupt or unavailable: defaults */ }
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 599.98px)').matches;
  return { ...DEFAULTS, collapsed: narrow }; // a phone-width window starts with the pill folded away
}

export const tools = writable<ToolState>(load());
tools.subscribe((s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } });

/** Undo/redo availability for the toolbar, and the commands it triggers (set by the engine). */
export const history = writable({ canUndo: false, canRedo: false });
export const commands = { undo: () => {}, redo: () => {} };

export const sizeName = (size: number) => (size < 3.5 ? 'fine' : size < 7 ? 'medium' : 'bold');
