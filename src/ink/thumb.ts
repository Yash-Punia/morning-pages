// Drawing a page thumbnail (M4.7): the paper and visible strokes of one page, small. Shared by the
// worker (OffscreenCanvas) and the main-thread fallback (a plain canvas) where workers can't draw.
import { drawPaper, type PaperColors } from './paper.ts';
import type { Ctx2D } from './renderer.ts';
import { strokePath, type SmoothingLevel } from './stroke.ts';
import { A5_HEIGHT, PAGE_WIDTH, type PaperStyle, type Pt, type ToolId } from './types.ts';

export const THUMB_WIDTH = 240;
export const THUMB_HEIGHT = Math.round(A5_HEIGHT * (THUMB_WIDTH / PAGE_WIDTH));

export interface ThumbJob {
  paper: PaperStyle;
  page: number;
  colors: PaperColors;
  smoothing: SmoothingLevel;
  strokes: { pts: Pt[]; tool: ToolId; size: number; color: string }[];
}

export function drawThumb(ctx: Ctx2D, job: ThumbJob) {
  const k = THUMB_WIDTH / PAGE_WIDTH;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  drawPaper(ctx, job.paper, 0, job.colors, { date: '', page: job.page });
  for (const s of job.strokes) {
    ctx.fillStyle = s.color;
    ctx.fill(strokePath(s.pts, s.tool, s.size, job.smoothing, true));
  }
}
