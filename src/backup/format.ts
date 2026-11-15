// The `.morningpages` backup file (TDD 8.1, BAK-1): a zip of newline-delimited JSON records, the
// asset files and a manifest with a sha-256 per file. The open schema is docs/backup-format.md.
export const FORMAT = 'morningpages-backup';
export const FORMAT_VERSION = 1;
export const EXTENSION = '.morningpages';
export const MIME = 'application/zip';

/** The record files, in the order they are written and restored (parents before children). */
export const RECORD_FILES = ['journals', 'entries', 'pages', 'ops', 'blocks', 'assets', 'revisions', 'kv'] as const;
export type RecordFile = (typeof RECORD_FILES)[number];
export const recordPath = (name: RecordFile) => `records/${name}.ndjson`;
export const MANIFEST = 'manifest.json';
export const README = 'README.txt';

/**
 * Preferences that travel with the journal (owner decision, M5): applied by a Replace, or by a
 * restore into an empty journal. Device state (scroll positions, once-markers, onboarding,
 * lastBackupAt) never does.
 */
export const PORTABLE_PREFS = [
  'mp.ink.paper',
  'mp.ink.smoothing',
  'mp.ink.finger',
  'mp.ink.tools.v2',
  'mp.theme',
  'mp.analytics',
  'mp.backup.days',
] as const;

export interface FileEntry { path: string; bytes: number; sha256: string }
export interface Manifest {
  format: typeof FORMAT;
  formatVersion: number;
  appVersion: string;
  schemaVersion: number;
  createdAt: number;
  encrypted: boolean;
  counts: { journals: number; entries: number; pages: number; ops: number; blocks: number; assets: number };
  /** First and last entryDate, or null for an empty journal. */
  dateRange: [string, string] | null;
  files: FileEntry[];
}

export const README_TEXT = `This is a Morning Pages backup.

Open it in Morning Pages (Settings, Restore from a backup) to bring your journal back.

It is an ordinary zip file. manifest.json lists what is inside, with a SHA-256 checksum per file.
records/*.ndjson hold your journal as JSON, one record per line; stroke points are base64 of a
small binary format. The format is documented openly, so your pages outlive the app:
https://github.com/Yash-Punia/morning-pages/blob/main/docs/backup-format.md
`;

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** An asset's file extension from its MIME type. */
export const assetExt = (mime: string) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'audio/mp4': 'm4a' })[mime] ?? 'bin';
