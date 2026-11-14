// Paper styles (PRD 4.4) and the printed date header, drawn beneath the ink per tile.
// Measurements follow real A5 stationery: the page is 148 mm = 1000 units, so 1 mm ≈ 6.76 units.
import type { Ctx2D } from './renderer.ts';
import { A5_HEIGHT, PAGE_WIDTH, type PaperStyle } from './types.ts';

const MM = PAGE_WIDTH / 148;
export const RULING: Record<'lined-narrow' | 'lined-college' | 'lined-wide', number> = {
  'lined-narrow': 6.35 * MM, // ≈ 43 units
  'lined-college': 7.1 * MM, // ≈ 48
  'lined-wide': 8.7 * MM, // ≈ 59
};
export const GRID = 5 * MM; // dotted and grid: 5 mm ≈ 34 units
export const HEADER = 150; // units reserved for the title and date band at the top of every page
/** Page 1's typed title: a Fraunces line in this band (page units: top, height, font size). */
export const TITLE = { top: 34, height: 58, font: 40 };
const DATE_BASELINE = 124;
export const SIDE = 60; // left/right margin for the header text
export const CORNELL = { cue: 0.3 * PAGE_WIDTH, summary: A5_HEIGHT - 280 };
const BOTTOM = 40;

export const PAPER_NAMES: Record<PaperStyle, string> = {
  blank: 'Blank',
  'lined-narrow': 'Lined, narrow',
  'lined-college': 'Lined, college',
  'lined-wide': 'Lined, wide',
  dotted: 'Dotted',
  grid: 'Grid',
  cornell: 'Cornell',
};

/** Horizontal rules (y, page-local) for a style. */
export function ruleLines(style: PaperStyle, height = A5_HEIGHT): number[] {
  const step = style === 'cornell' ? RULING['lined-college'] : style in RULING ? RULING[style as keyof typeof RULING] : style === 'grid' ? GRID : 0;
  if (!step) return [];
  const out: number[] = [];
  for (let y = HEADER + step; y <= height - BOTTOM; y += step) out.push(y);
  return out;
}
/** Vertical rules (x) for a style. */
export function columnLines(style: PaperStyle): number[] {
  if (style === 'cornell') return [CORNELL.cue];
  if (style !== 'grid') return [];
  const out: number[] = [];
  for (let x = GRID; x < PAGE_WIDTH; x += GRID) out.push(x);
  return out;
}
/** Dot positions for the dotted style. */
export function dots(height = A5_HEIGHT): [number, number][] {
  const out: [number, number][] = [];
  for (let y = HEADER + GRID; y <= height - BOTTOM; y += GRID)
    for (let x = GRID; x < PAGE_WIDTH; x += GRID) out.push([x, y]);
  return out;
}

export interface PaperColors { paper: string; rule: string; ink: string; inkSoft: string }
export interface Header { date: string; page: number }

/** One page's paper at document y `top`, clipped to the page. */
export function drawPaper(ctx: Ctx2D, style: PaperStyle, top: number, c: PaperColors, header: Header, height = A5_HEIGHT) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, PAGE_WIDTH, height);
  ctx.clip();
  ctx.fillStyle = c.paper;
  ctx.fillRect(0, top, PAGE_WIDTH, height);

  ctx.strokeStyle = c.rule;
  ctx.fillStyle = c.rule;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const bottom = style === 'cornell' ? CORNELL.summary : height;
  for (const y of ruleLines(style, height)) if (y < bottom) { ctx.moveTo(0, top + y); ctx.lineTo(PAGE_WIDTH, top + y); }
  for (const x of columnLines(style)) { ctx.moveTo(x, top + HEADER); ctx.lineTo(x, top + (style === 'cornell' ? CORNELL.summary : height - BOTTOM)); }
  if (style === 'cornell') { ctx.moveTo(0, top + CORNELL.summary); ctx.lineTo(PAGE_WIDTH, top + CORNELL.summary); }
  ctx.stroke();
  if (style === 'dotted') for (const [x, y] of dots(height)) { ctx.beginPath(); ctx.arc(x, top + y, 1.4, 0, Math.PI * 2); ctx.fill(); }

  // The printed date (PRD 4.4). Page 1: a quiet line under the entry's title (the title itself is
  // a text field laid over the TITLE band). Later pages: a small running head with the page number.
  ctx.textBaseline = 'alphabetic';
  if (header.page === 1) {
    ctx.fillStyle = c.inkSoft;
    ctx.font = '400 19px "Atkinson Hyperlegible Next Variable", ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(header.date, SIDE, top + DATE_BASELINE);
  } else {
    ctx.fillStyle = c.inkSoft;
    ctx.font = '400 18px "Atkinson Hyperlegible Next Variable", ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(header.date, SIDE, top + 64);
    ctx.textAlign = 'right';
    ctx.fillText(String(header.page), PAGE_WIDTH - SIDE, top + 64);
  }
  ctx.restore();
}
