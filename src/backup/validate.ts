// The trust boundary for restores (TDD 9 threat table): a backup file is data from outside the
// app. Every record is rebuilt from known fields, each type-checked; nothing parsed from the file
// is written through as it came. One bad record rejects the whole file, so a restore never
// half-trusts a damaged backup.
import { decode } from '../store/codec.ts';
import { PALETTE } from '../ink/inks.ts';
import type { EntryRec, JournalRec, OpRec, PageRec } from '../store/db.ts';
import { fromBase64, PORTABLE_PREFS } from './format.ts';

export class BadRecord extends Error {}

type Obj = Record<string, unknown>;
const PAPERS = ['blank', 'lined-narrow', 'lined-college', 'lined-wide', 'dotted', 'grid', 'cornell'];
const TOOLS = ['fountain', 'ballpoint'];
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SHA = /^[0-9a-f]{64}$/;

function bad(what: string): never {
  throw new BadRecord(what);
}
const obj = (v: unknown, what: string): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : bad(what));
const id = (v: unknown, what: string) => (typeof v === 'string' && v.length > 0 && v.length <= 200 ? v : bad(what));
const num = (v: unknown, what: string) => (typeof v === 'number' && Number.isFinite(v) ? v : bad(what));
const int = (v: unknown, what: string) => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : bad(what));
const oneOf = <T extends string>(v: unknown, list: readonly string[], what: string) => (list.includes(v as string) ? (v as T) : bad(what));
const optional = <T>(v: unknown, check: (v: unknown) => T): T | undefined => (v === undefined ? undefined : check(v));
/** Drop undefined keys, so a rebuilt record equals the stored one. */
const clean = <T extends Obj>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function journal(v: unknown): JournalRec {
  const r = obj(v, 'journal');
  return {
    id: id(r.id, 'journal id'),
    name: typeof r.name === 'string' && r.name.length <= 200 ? r.name : bad('journal name'),
    paper: oneOf(r.paper, PAPERS, 'journal paper'),
    sortOrder: num(r.sortOrder, 'journal order'),
    createdAt: num(r.createdAt, 'journal createdAt'),
    updatedAt: num(r.updatedAt, 'journal updatedAt'),
  };
}

export function entry(v: unknown): EntryRec {
  const r = obj(v, 'entry');
  return clean({
    id: id(r.id, 'entry id'),
    journalId: id(r.journalId, 'entry journal'),
    entryDate: typeof r.entryDate === 'string' && LOCAL_DATE.test(r.entryDate) ? r.entryDate : bad('entry date'),
    createdAt: num(r.createdAt, 'entry createdAt'),
    updatedAt: num(r.updatedAt, 'entry updatedAt'),
    title: optional(r.title, (t) => (typeof t === 'string' && t.length <= 500 ? t : bad('entry title'))),
    deletedAt: optional(r.deletedAt, (t) => num(t, 'entry deletedAt')),
  });
}

export function page(v: unknown): PageRec {
  const r = obj(v, 'page');
  return {
    id: id(r.id, 'page id'),
    entryId: id(r.entryId, 'page entry'),
    index: int(r.index, 'page index'),
    paper: oneOf(r.paper, PAPERS, 'page paper'),
    size: oneOf(r.size, ['A5'], 'page size'),
    height: num(r.height, 'page height'),
    opCount: int(r.opCount, 'page opCount'),
    checksum: int(r.checksum, 'page checksum'),
    updatedAt: num(r.updatedAt, 'page updatedAt'),
  };
}

export function op(v: unknown): OpRec {
  const r = obj(v, 'op');
  const base = { id: id(r.id, 'op id'), pageId: id(r.pageId, 'op page'), seq: int(r.seq, 'op seq'), createdAt: num(r.createdAt, 'op createdAt') };
  const kind = oneOf<OpRec['kind']>(r.kind, ['stroke', 'erase', 'restore'], 'op kind');
  if (kind !== 'stroke') {
    const targets = Array.isArray(r.targets) ? r.targets.map((t) => id(t, 'op target')) : bad('op targets');
    return { ...base, kind, targets };
  }
  const pts = typeof r.pts === 'string' ? fromBase64(r.pts) : bad('stroke points');
  if (pts.length < 17) bad('stroke points');
  try {
    decode(pts); // the §7.3 codec must read it to the end
  } catch {
    bad('stroke points');
  }
  const color = PALETTE.includes(r.color as never) || (typeof r.color === 'string' && HEX_COLOR.test(r.color)) ? (r.color as OpRec['color']) : bad('stroke colour');
  const bbox = Array.isArray(r.bbox) && r.bbox.length === 4 ? (r.bbox.map((n) => num(n, 'stroke bbox')) as OpRec['bbox']) : bad('stroke bbox');
  return { ...base, kind, tool: oneOf(r.tool, TOOLS, 'stroke tool'), color, size: num(r.size, 'stroke size'), pts, n: int(r.n, 'stroke n'), bbox };
}

/** Blocks arrive with v1 (text, photos); their content is kept as plain JSON data, never markup. */
export function block(v: unknown) {
  const r = obj(v, 'block');
  const f = obj(r.frame, 'block frame');
  return clean({
    id: id(r.id, 'block id'),
    pageId: id(r.pageId, 'block page'),
    type: oneOf(r.type, ['text', 'image', 'sticker', 'prompt', 'checklist'], 'block type'),
    frame: { x: num(f.x, 'frame'), y: num(f.y, 'frame'), w: num(f.w, 'frame'), h: num(f.h, 'frame'), rot: num(f.rot, 'frame') },
    content: JSON.parse(JSON.stringify(r.content ?? null)) as unknown,
    assetId: optional(r.assetId, (a) => id(a, 'block asset')),
    updatedAt: num(r.updatedAt, 'block updatedAt'),
    deletedAt: optional(r.deletedAt, (t) => num(t, 'block deletedAt')),
  });
}

/** An asset's record; its bytes come from assets/<hash>.<ext>, checked against the hash. */
export function asset(v: unknown) {
  const r = obj(v, 'asset');
  return {
    id: id(r.id, 'asset id'),
    hash: typeof r.hash === 'string' && SHA.test(r.hash) ? r.hash : bad('asset hash'),
    mime: typeof r.mime === 'string' && /^[a-z]+\/[a-z0-9.+-]+$/.test(r.mime) ? r.mime : bad('asset type'),
    size: int(r.size, 'asset size'),
  };
}

export function revision(v: unknown) {
  const r = obj(v, 'revision');
  const marks = obj(r.marks, 'revision marks');
  return {
    id: id(r.id, 'revision id'),
    entryId: id(r.entryId, 'revision entry'),
    createdAt: num(r.createdAt, 'revision createdAt'),
    marks: Object.fromEntries(Object.entries(marks).map(([k, s]) => [id(k, 'revision page'), int(s, 'revision seq')])),
  };
}

/** Only the portable preferences, as short strings. */
export function pref(v: unknown): { key: string; value: string } {
  const r = obj(v, 'preference');
  return {
    key: oneOf(r.key, PORTABLE_PREFS, 'preference key'),
    value: typeof r.value === 'string' && r.value.length <= 4096 ? r.value : bad('preference value'),
  };
}
