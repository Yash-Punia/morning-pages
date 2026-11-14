// Keeping page thumbnails current (M4.7). When an entry is closed (or the app goes to the
// background), each stored page whose ops changed since its last thumbnail is redrawn by the
// worker and saved. Thumbnails are a convenience, so they are written best-effort, *outside* the
// durable write queue: a thumbnail that can't be saved must never hold up a stroke. Thumbnails are drawn in the Paper theme, like a
// photo of the page; ink is the writer's, so a page always looks like itself.
import type { InkDoc } from '../ink/page.ts';
import type { PaperColors } from '../ink/paper.ts';
import type { InkId } from '../ink/types.ts';
import { drawThumb, THUMB_HEIGHT, THUMB_WIDTH, type ThumbJob } from '../ink/thumb.ts';
import { canvasColor } from '../ink/colors.ts';
import { inkSmoothing } from '../settings.ts';
import { db } from './db.ts';
import { saved } from './session.ts';

export type Render = (job: ThumbJob) => Promise<Blob>;
export interface Palette { paper: PaperColors; ink: (id: InkId) => string }

let worker: Worker | undefined;
let workerFails = false;
let nextId = 0;
const waiting = new Map<number, { resolve: (b: Blob) => void; reject: (e: unknown) => void }>();

/** On the main thread, at idle: for engines whose workers have no OffscreenCanvas. */
const onMainThread: Render = (job) =>
  new Promise((resolve, reject) => {
    const run = () => {
      const canvas = Object.assign(document.createElement('canvas'), { width: THUMB_WIDTH, height: THUMB_HEIGHT });
      drawThumb(canvas.getContext('2d')!, job);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.8);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 50);
  });

const inWorker: Render = async (job) => {
  if (workerFails) return onMainThread(job);
  if (!worker) {
    worker = new Worker(new URL('../workers/thumbs.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (e: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const w = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      if (e.data.blob) w?.resolve(e.data.blob);
      else w?.reject(new Error(e.data.error));
    });
    worker.addEventListener('error', (e) => {
      for (const w of waiting.values()) w.reject(e);
      waiting.clear();
    });
  }
  const id = ++nextId;
  try {
    return await new Promise<Blob>((resolve, reject) => {
      waiting.set(id, { resolve, reject });
      worker!.postMessage({ ...job, id });
    });
  } catch {
    workerFails = true; // this engine's workers can't draw: from now on, draw here
    return onMainThread(job);
  }
};

/** The Paper theme's colours, whatever theme is showing (light-dark() tokens on a light probe). */
function paperPalette(): Palette {
  const probe = document.createElement('span');
  probe.hidden = true;
  probe.style.colorScheme = 'light';
  document.body.append(probe);
  const token = (name: string) => {
    probe.style.color = `var(${name})`;
    return canvasColor(getComputedStyle(probe).color);
  };
  const paper = { paper: token('--paper'), rule: token('--rule'), ink: token('--ink'), inkSoft: token('--ink-soft') };
  const inks = new Map<string, string>();
  const ink = (id: InkId) => {
    if (id.startsWith('#')) return canvasColor(id);
    if (!inks.has(id)) inks.set(id, token(`--pen-${id}`));
    return inks.get(id)!;
  };
  // Resolve every built-in ink now, so the probe can go.
  for (const id of ['black', 'blueBlack', 'sepia', 'forest', 'crimson'] as const) ink(id);
  probe.remove();
  return { paper, ink };
}

const running = new WeakMap<InkDoc, Promise<void>>();

/** Redraw the thumbnails of this entry's stored pages that changed since their last one. */
export function refreshThumbs(doc: InkDoc, render: Render = inWorker, palette: () => Palette = paperPalette): Promise<void> {
  const prev = running.get(doc) ?? Promise.resolve();
  const next = prev.then(() => refresh(doc, render, palette)).catch(() => { /* retried at the next close */ });
  running.set(doc, next);
  return next;
}

async function refresh(doc: InkDoc, render: Render, palette: () => Palette) {
  await saved(); // the page rows' op counts match the document
  const rows = await db().pages.where('entryId').equals(doc.entry.id).sortBy('index');
  const stale = rows.filter((r) => r.thumbOps !== r.opCount);
  if (!stale.length) return;
  const colors = palette();
  const strokes = [...doc.strokes()];
  for (const row of stale) {
    const blob = await render({
      paper: row.paper,
      page: row.index + 1,
      colors: colors.paper,
      smoothing: inkSmoothing.get(),
      strokes: strokes.filter((s) => s.pageId === row.id).map((s) => ({ pts: s.pts, tool: s.tool, size: s.size, color: colors.ink(s.color) })),
    });
    // Only the thumbnail fields: a concurrent stroke's opCount update is never overwritten.
    await db().pages.update(row.id, { thumb: await blob.arrayBuffer(), thumbOps: row.opCount });
  }
}
