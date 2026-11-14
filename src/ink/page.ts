// The entry being written: pages and their append-only op log (TDD 7.2). Visible strokes are a
// fold of the ops; undo, redo and the eraser only ever append (DUR-2). In M2 this lives in
// memory; M3 persists exactly these ops.
import { pointsBox } from './stroke.ts';
import { A5_HEIGHT, PAGE_GAP, PAGE_WIDTH, type Box, type InkId, type Op, type Page, type PaperStyle, type Pt, type StrokeOp, type ToolId } from './types.ts';

/** Visible strokes after applying ops in order (seq, createdAt, id). */
export function fold(ops: Op[]): Map<string, StrokeOp> {
  const all = new Map<string, StrokeOp>();
  const hidden = new Set<string>();
  const sorted = [...ops].sort((a, b) => a.seq - b.seq || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
  for (const op of sorted) {
    if (op.kind === 'stroke') all.set(op.id, op);
    else for (const t of op.targets) (op.kind === 'erase' ? hidden.add(t) : hidden.delete(t));
  }
  for (const id of hidden) all.delete(id);
  return all;
}

export class InkDoc {
  readonly pages: Page[] = [];
  readonly ops: Op[] = [];
  private seq = new Map<string, number>();
  private visible = new Map<string, StrokeOp>();
  /** Called with the document-space area that changed, and the stroke when one was added. */
  onChange: (box: Box, added?: StrokeOp) => void = () => {};

  constructor(public paper: PaperStyle) {
    this.addPage();
  }

  /** Change the paper of every page in this entry (and of pages added later). */
  setPaper(paper: PaperStyle) {
    if (paper === this.paper) return;
    this.paper = paper;
    for (const p of this.pages) p.paper = paper;
    this.onChange(this.box);
  }

  addPage(): Page {
    const page: Page = { id: crypto.randomUUID(), index: this.pages.length, paper: this.paper, size: 'A5', height: A5_HEIGHT };
    this.pages.push(page);
    return page;
  }

  pageTop(page: Page) {
    return page.index * (A5_HEIGHT + PAGE_GAP);
  }
  get height() {
    return this.pages.length * (A5_HEIGHT + PAGE_GAP) - PAGE_GAP;
  }
  /** The page under a document y (the nearest one in the gaps and beyond the ends). */
  pageAt(y: number): Page {
    const i = Math.floor((y + PAGE_GAP / 2) / (A5_HEIGHT + PAGE_GAP));
    return this.pages[Math.min(this.pages.length - 1, Math.max(0, i))]!;
  }

  /** Record a stroke drawn in document space; it belongs to the page where it started. */
  addStroke(docPts: Pt[], tool: ToolId, color: InkId, size: number): StrokeOp {
    const page = this.pageAt(docPts[0]![1]);
    const top = this.pageTop(page);
    const pts = docPts.map((p): Pt => [p[0], p[1] - top, p[2], p[3], p[4], p[5]]);
    const op: StrokeOp = { kind: 'stroke', id: crypto.randomUUID(), pageId: page.id, seq: this.nextSeq(page.id), createdAt: Date.now(), tool, color, size, pts, bbox: pointsBox(pts, size) };
    this.ops.push(op);
    this.visible.set(op.id, op);
    this.onChange(this.docBox(op), op);
    return op;
  }

  strokes(): Iterable<StrokeOp> {
    return this.visible.values();
  }
  get strokeCount() {
    return this.visible.size;
  }

  /** A stroke's box in document space. */
  docBox(op: StrokeOp): Box {
    const top = this.pageTop(this.page(op.pageId));
    return [op.bbox[0], op.bbox[1] + top, op.bbox[2], op.bbox[3] + top];
  }
  page(id: string): Page {
    return this.pages.find((p) => p.id === id)!;
  }
  /** The whole column of pages, for full invalidation. */
  get box(): Box {
    return [0, 0, PAGE_WIDTH, this.height];
  }

  protected nextSeq(pageId: string) {
    const n = (this.seq.get(pageId) ?? 0) + 1;
    this.seq.set(pageId, n);
    return n;
  }
}
