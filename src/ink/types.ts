// Ink data model (TDD 7.2). In M2 everything lives in memory; M3 persists the same ops,
// encoding `pts` with the point codec (TDD 7.3) on write.

/** One Pencil sample in page space: x, y (page units), pressure 0–1, altitude, azimuth (rad), time (ms). */
export type Pt = [x: number, y: number, p: number, alt: number, az: number, t: number];

export type ToolId = 'fountain' | 'ballpoint';
/** Built-in inks resolve per theme from tokens; custom inks store their hex (TDD 5.5). */
export type InkId = 'black' | 'blueBlack' | 'sepia' | 'forest' | 'crimson' | `#${string}`;

export type PaperStyle = 'blank' | 'lined-narrow' | 'lined-college' | 'lined-wide' | 'dotted' | 'grid' | 'cornell';

export interface Page {
  id: string;
  index: number;
  paper: PaperStyle;
  size: 'A5';
  height: number; // page units; width is always PAGE_WIDTH
}

interface OpBase {
  id: string;
  pageId: string;
  seq: number; // per-page counter (TDD 7.2)
  createdAt: number;
}
export interface StrokeOp extends OpBase {
  kind: 'stroke';
  tool: ToolId;
  color: InkId;
  size: number;
  pts: Pt[]; // page-local, raw samples (D-036): smoothing happens at render
  bbox: Box; // page-local, padded by the stroke width
}
export interface TargetOp extends OpBase {
  kind: 'erase' | 'restore';
  targets: string[];
}
export type Op = StrokeOp | TargetOp;

/** [minX, minY, maxX, maxY] */
export type Box = [number, number, number, number];

export const PAGE_WIDTH = 1000;
export const A5_HEIGHT = 1414; // √2 aspect (TDD 5.1)
export const PAGE_GAP = 24;
