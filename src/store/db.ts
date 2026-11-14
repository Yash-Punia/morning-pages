// The journal's IndexedDB (TDD 7.1). Every store from the PRD data model is declared in version 1,
// even those first used later, so early milestones need no migrations (D-016). Only structural
// fields are indexed; content (title, tags, …) never is, since the journal lock encrypts it (D-022).
import Dexie, { type Table } from 'dexie';
import type { Box, InkId, PaperStyle, Pt, ToolId } from '../ink/types.ts';

export const DB_NAME = 'morning-pages';
export const DB_VERSION = 1;
/** The default journal has a fixed id, so two first writes can never create two journals. */
export const DEFAULT_JOURNAL = 'default';

export const SCHEMA_V1 = {
  journals: 'id, sortOrder',
  entries: 'id, journalId, entryDate, [journalId+entryDate], updatedAt, deletedAt',
  pages: 'id, entryId, [entryId+index]',
  ops: 'id, pageId, [pageId+seq]',
  blocks: 'id, pageId',
  assets: 'id, &hash',
  revisions: 'id, entryId',
  recovery: 'id',
  kv: 'key',
};

/** 'YYYY-MM-DD' in the writer's local zone (D-019). */
export type LocalDate = string;

export interface JournalRec { id: string; name: string; paper: PaperStyle; sortOrder: number; createdAt: number; updatedAt: number }
export interface EntryRec {
  id: string; journalId: string; entryDate: LocalDate; createdAt: number; updatedAt: number;
  title?: string; deletedAt?: number;
}
export interface PageRec {
  id: string; entryId: string; index: number; paper: PaperStyle; size: 'A5'; height: number;
  opCount: number; checksum: number; updatedAt: number;
  /** A small JPEG of the page (M4.7) as bytes (WebKit can't always store a Blob), and the
   *  opCount it was drawn at. */
  thumb?: ArrayBuffer; thumbOps?: number;
}
/** Append-only (TDD 7.2): never updated or deleted, except by purging a deleted entry. */
export interface OpRec {
  id: string; pageId: string; seq: number; createdAt: number;
  kind: 'stroke' | 'erase' | 'restore';
  tool?: ToolId; color?: InkId; size?: number;
  pts?: Uint8Array; n?: number; bbox?: Box; // stroke: encoded points (TDD 7.3)
  targets?: string[]; // erase / restore
}

/** What a write needs to create its entry and page if they don't exist yet (ENT-1). */
export interface EntryRef { id: string; journalId: string; entryDate: LocalDate; createdAt: number }
export interface PageRef { id: string; index: number; paper: PaperStyle; height: number }
export interface WriteCtx { entry: EntryRef; page?: PageRef }

/** The stroke being written right now, mirrored every 250 ms (DUR-4, D-017). Raw page-local points. */
export interface RecoveryRec {
  id: string; // the op id, assigned at pen-down
  ctx: WriteCtx & { page: PageRef };
  title: string;
  tool: ToolId; color: InkId; size: number;
  pts: Pt[];
  at: number;
}

export class JournalDB extends Dexie {
  journals!: Table<JournalRec, string>;
  entries!: Table<EntryRec, string>;
  pages!: Table<PageRec, string>;
  ops!: Table<OpRec, string>;
  blocks!: Table<{ id: string; pageId: string }, string>;
  assets!: Table<{ id: string; hash: string }, string>;
  revisions!: Table<{ id: string; entryId: string }, string>;
  recovery!: Table<RecoveryRec, string>;
  kv!: Table<{ key: string; value: unknown }, string>;

  constructor(name = DB_NAME) {
    // An fsync per stroke is affordable: commit p99 was 15 ms on the iPad (S2).
    super(name, { chromeTransactionDurability: 'strict' });
    this.version(DB_VERSION).stores(SCHEMA_V1);
  }
}

let current: JournalDB | undefined;
let name = DB_NAME;

export const dbName = () => name;

/** The open journal database. */
export const db = () => (current ??= new JournalDB(name));

/** Close and reopen: the fix for WebKit's "connection lost" after backgrounding (TDD 6.2). */
export function reopen(): JournalDB {
  try { current?.close(); } catch { /* already closed */ }
  current = new JournalDB(name);
  return current;
}

/** Tests: use a fresh database under another name. */
export function useDatabase(dbName: string) {
  try { current?.close(); } catch { /* already closed */ }
  name = dbName;
  current = undefined;
}
