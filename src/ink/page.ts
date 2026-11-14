// The entry being written: pages and their append-only op log (TDD 7.2). Visible strokes are a
// fold of the ops; undo, redo and the eraser only ever append (DUR-2). Every op, title and paper
// change is reported through a hook, and the store (src/store/session.ts) saves exactly these.
import type { EntryRef } from '../store/db.ts';
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

const RECOVERY_MS = 250;

/** One user action, for undo: strokes added, or strokes erased by one eraser gesture. */
type Step = { kind: 'stroke' | 'erase'; ids: string[] };

export class InkDoc {
  readonly pages: Page[] = [];
  readonly ops: Op[] = [];
  private seq = new Map<string, number>();
  private visible = new Map<string, StrokeOp>();
  private all = new Map<string, StrokeOp>(); // every stroke ever written, visible or not
  private undoStack: Step[] = []; // unlimited, per session (TDD 5.6)
  private redoStack: Step[] = [];
  /** The entry's typed title (Entry.title, TDD 7.2); empty means untitled. */
  title = '';
  /** Which entry this is: ids are assigned when it is opened, and stored with its first write. */
  readonly entry: EntryRef;
  /** Called with the document-space area that changed, and the stroke when one was added. */
  onChange: (box: Box, added?: StrokeOp) => void = () => {};
  /** Every op as it is appended, with the page it belongs to: the store saves these. */
  onOp: (op: Op, page: Page) => void = () => {};
  onTitle: (title: string) => void = () => {};
  onPaper: (paper: PaperStyle) => void = () => {};

  constructor(public paper: PaperStyle, entry?: EntryRef, pages: Page[] = []) {
    this.entry = entry ?? { id: crypto.randomUUID(), journalId: 'default', entryDate: '', createdAt: Date.now() };
    this.pages.push(...pages);
    if (!pages.length) this.addPage();
  }

  /**
   * A saved entry: its stored pages and ops, folded back into the visible strokes. A blank page
   * always follows, as when it was written (stored pages always run 0…n−1, since a page is only
   * added below one that has ink, and stored with its first op).
   */
  static load(entry: EntryRef, title: string, pages: Page[], ops: Op[], paper: PaperStyle): InkDoc {
    const doc = new InkDoc(pages[0]?.paper ?? paper, entry, pages);
    doc.title = title;
    for (const op of ops) {
      doc.ops.push(op);
      if (op.kind === 'stroke') doc.all.set(op.id, op);
      doc.seq.set(op.pageId, Math.max(doc.seq.get(op.pageId) ?? 0, op.seq));
    }
    doc.visible = fold(ops);
    if (pages.length) doc.addPage();
    return doc;
  }

  setTitle(title: string) {
    if (title === this.title) return;
    this.title = title;
    this.onTitle(title);
  }

  /** Change the paper of every page in this entry (and of pages added later). */
  setPaper(paper: PaperStyle) {
    if (paper === this.paper) return;
    this.paper = paper;
    for (const p of this.pages) p.paper = paper;
    this.onPaper(paper);
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

  /** The page a stroke belongs to (where it started), and its points in that page's space. */
  private onPage(docPts: Pt[]): [Page, Pt[]] {
    const page = this.pageAt(docPts[0]![1]);
    const top = this.pageTop(page);
    return [page, docPts.map((p): Pt => [p[0], p[1] - top, p[2], p[3], p[4], p[5]])];
  }

  private draftId = '';
  private draftAt = -Infinity;
  /**
   * The stroke still being written, mirrored for crash recovery (DUR-4, D-017): at its first
   * sample, then at most every 250 ms. `id` is the op id it will be saved under.
   */
  draft(id: string, docPts: Pt[], tool: ToolId, color: InkId, size: number, now = performance.now()) {
    if (id === this.draftId && now - this.draftAt < RECOVERY_MS) return;
    this.draftId = id;
    this.draftAt = now;
    const [page, pts] = this.onPage(docPts);
    this.onDraft({ id, page, tool, color, size, pts });
  }
  onDraft: (d: { id: string; page: Page; tool: ToolId; color: InkId; size: number; pts: Pt[] }) => void = () => {};

  /** Record a stroke drawn in document space; it belongs to the page where it started. */
  addStroke(docPts: Pt[], tool: ToolId, color: InkId, size: number, id: string = crypto.randomUUID()): StrokeOp {
    const [page, pts] = this.onPage(docPts);
    const op: StrokeOp = { kind: 'stroke', id, pageId: page.id, seq: this.nextSeq(page.id), createdAt: Date.now(), tool, color, size, pts, bbox: pointsBox(pts, size) };
    this.ops.push(op);
    this.all.set(op.id, op);
    this.visible.set(op.id, op);
    this.onOp(op, page);
    this.undoStack.push({ kind: 'stroke', ids: [op.id] });
    this.redoStack.length = 0;
    this.onChange(this.docBox(op), op);
    // Continuous scroll (PRD 4.4): writing on the last page puts a fresh page below it.
    if (page.index === this.pages.length - 1) {
      const next = this.addPage();
      const nextTop = this.pageTop(next);
      this.onChange([0, nextTop - PAGE_GAP, PAGE_WIDTH, nextTop + next.height]);
    }
    return op;
  }

  /** The eraser: one gesture hides `ids` with one erase op per page touched (TDD 5.6). */
  erase(ids: string[]) {
    const live = ids.filter((id) => this.visible.has(id));
    if (!live.length) return;
    this.undoStack.push({ kind: 'erase', ids: live }); // stacks first: listeners read canUndo
    this.redoStack.length = 0;
    this.apply('erase', live);
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  /** Undo appends ops; nothing is ever deleted (DUR-2). */
  undo() {
    const step = this.undoStack.pop();
    if (!step) return;
    this.redoStack.push(step);
    this.apply(step.kind === 'stroke' ? 'erase' : 'restore', step.ids);
  }

  redo() {
    const step = this.redoStack.pop();
    if (!step) return;
    this.undoStack.push(step);
    this.apply(step.kind === 'stroke' ? 'restore' : 'erase', step.ids);
  }

  /** Strokes whose outline is within `r` of document point (x, y). */
  hitTest(x: number, y: number, r: number, hits: (op: StrokeOp, x: number, y: number, r: number) => boolean): StrokeOp[] {
    const out: StrokeOp[] = [];
    for (const op of this.visible.values()) {
      const top = this.pageTop(this.page(op.pageId));
      if (hits(op, x, y - top, r)) out.push(op);
    }
    return out;
  }

  private apply(kind: 'erase' | 'restore', ids: string[]) {
    const byPage = new Map<string, string[]>();
    for (const id of ids) {
      const op = this.all.get(id);
      if (op) byPage.set(op.pageId, [...(byPage.get(op.pageId) ?? []), id]);
    }
    for (const [pageId, targets] of byPage) {
      const op: Op = { kind, id: crypto.randomUUID(), pageId, seq: this.nextSeq(pageId), createdAt: Date.now(), targets };
      this.ops.push(op);
      this.onOp(op, this.page(pageId));
      for (const id of targets) {
        const op = this.all.get(id)!;
        if (kind === 'erase') this.visible.delete(id);
        else this.visible.set(id, op);
        this.onChange(this.docBox(op));
      }
    }
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
