# Morning Pages backup format

A `.morningpages` file is a full backup of one Morning Pages journal (PRD BAK-1, TDD 8.1). This document is the open schema: anyone can read a backup with ordinary tools, without the app, so the pages outlive it.

This page describes **format version 1** (`formatVersion: 1`), made by schema version 1 of the app's database.

## The file

A `.morningpages` file is an ordinary **zip** archive. Rename it to `.zip` and any unzip tool opens it.

| Path | What it holds |
| --- | --- |
| `manifest.json` | What is inside, with a SHA-256 checksum for every other file |
| `records/journals.ndjson` | Journals |
| `records/entries.ndjson` | Entries: one per morning (or more, when a morning has several) |
| `records/pages.ndjson` | Pages of each entry |
| `records/ops.ndjson` | Ink: every stroke, erase and restore, in order |
| `records/blocks.ndjson` | Text, photo and other blocks on pages (unused in format 1; empty) |
| `records/assets.ndjson` | Photo and media records (unused in format 1; empty) |
| `records/revisions.ndjson` | Version-history marks (unused in format 1; empty) |
| `records/kv.ndjson` | The writer's portable preferences |
| `assets/<sha256>.<ext>` | Each asset's bytes, named by its own SHA-256 (none in format 1) |
| `README.txt` | A pointer to this document |

**`.ndjson`** means newline-delimited JSON: one JSON object per line, each line ending in `\n`. An empty file means no records.

Record files are compressed with deflate. Asset files are stored without recompression, since they are already compressed.

## `manifest.json`

```json
{
  "format": "morningpages-backup",
  "formatVersion": 1,
  "appVersion": "0.1.0",
  "schemaVersion": 1,
  "createdAt": 1794726159753,
  "encrypted": false,
  "counts": { "journals": 1, "entries": 689, "pages": 689, "ops": 8, "blocks": 0, "assets": 0 },
  "dateRange": ["2024-11-15", "2026-11-15"],
  "files": [{ "path": "records/journals.ndjson", "bytes": 132, "sha256": "9f2c…" }]
}
```

| Field | Meaning |
| --- | --- |
| `format` | Always `"morningpages-backup"` |
| `formatVersion` | This file layout's version. An app refuses a file with a newer version than it knows |
| `appVersion` | The app version that made the backup |
| `schemaVersion` | The app's database schema version when the backup was made |
| `createdAt` | When the backup was made, in milliseconds since 1970 (UTC) |
| `encrypted` | `false` in format 1. Encrypted backups (BAK-3) arrive with the journal lock and get their own section here |
| `counts` | How many records of each kind, including deleted entries |
| `dateRange` | The first and last `entryDate` among entries that aren't deleted, or `null` for an empty journal |
| `files` | Every other file in the zip: its `path`, its size in `bytes`, and the lowercase hex `sha256` of its exact bytes. The manifest does not list itself |

A restore checks every listed file against its size and checksum before it reads anything, and rejects the whole file if one doesn't match.

## Records

Times (`createdAt`, `updatedAt`, `deletedAt`) are milliseconds since 1970 (UTC). Ids are random UUID strings made on the device. A missing optional field means "not set".

### Journal (`journals.ndjson`)

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | The first journal's id is always `"default"` |
| `name` | string | The journal's name |
| `paper` | Paper | The journal's default paper |
| `sortOrder` | number | Its place among journals |
| `createdAt`, `updatedAt` | number | |

### Entry (`entries.ndjson`)

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | |
| `journalId` | string | The journal it belongs to |
| `entryDate` | `"YYYY-MM-DD"` | The morning it belongs to, as a **local calendar date** where it was written. It never moves with time zones |
| `createdAt`, `updatedAt` | number | |
| `title` | string, optional | The typed title |
| `deletedAt` | number, optional | Set while the entry is in Recently Deleted. The app removes it for good 30 days later |

### Page (`pages.ndjson`)

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | |
| `entryId` | string | The entry it belongs to |
| `index` | integer | Its place in the entry, from 0. Stored pages run 0, 1, 2 … without gaps |
| `paper` | Paper | One of `blank`, `lined-narrow`, `lined-college`, `lined-wide`, `dotted`, `grid`, `cornell` |
| `size` | `"A5"` | The page size |
| `height` | number | The page's height in page units. A page is 1000 units wide; A5 is 1414 high |
| `opCount` | integer | How many ops the page has |
| `checksum` | integer | CRC-32 over the page's op ids in fold order (see below), for integrity checks |
| `updatedAt` | number | |

Page thumbnails aren't in backups; the app redraws them after a restore.

### Op (`ops.ndjson`)

The ink is an **append-only log**. Every stroke is an op, and so is every erase, every undo and every redo. Ops never change once written.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | |
| `pageId` | string | The page it is on |
| `seq` | integer | Its place in the page's log, from 1 |
| `createdAt` | number | When it was written |
| `kind` | `"stroke"`, `"erase"` or `"restore"` | |
| `tool` | `"ballpoint"` or `"fountain"` | Strokes only |
| `color` | string | Strokes only: one of `black`, `blueBlack`, `sepia`, `forest`, `crimson`, or a custom `#rrggbb` |
| `size` | number | Strokes only: the nib width in page units |
| `pts` | string | Strokes only: **base64** of the stroke's points in the binary format below |
| `n` | integer | Strokes only: how many points `pts` holds |
| `bbox` | `[minX, minY, maxX, maxY]` | Strokes only: the stroke's bounds in page units, including its width |
| `targets` | string[] | Erase and restore only: the ids of the strokes they hide or bring back |

**What a page shows.** Sort the page's ops by `seq`, then `createdAt`, then `id` (string order). This is the **fold order**: the ties only arise when two copies of a journal were merged. Walk the ops in that order:
- a `stroke` makes its id visible;
- an `erase` hides each of its `targets`;
- a `restore` makes each of its `targets` visible again.

The strokes still visible at the end, drawn in the order they were written, are the page.

The page's `checksum` is the running CRC-32 (the standard IEEE polynomial, as used by zip) of each op's `id`, as UTF-16 code units truncated to their low byte, fed one after another in fold order.

### Stroke points (`pts`)

Points are the raw Apple Pencil samples, lightly simplified (Ramer–Douglas–Peucker at 0.15 page units). Smoothing happens when a page is drawn, not in the data. After base64 decoding, the bytes are:

**Header, 17 bytes, little-endian:**

| Offset | Type | Meaning |
| --- | --- | --- |
| 0 | u8 | Flags: bit 0 set if pressure is present; bit 1 set if tilt is present |
| 1 | f32 | x of the first point, page units |
| 5 | f32 | y of the first point, page units |
| 9 | f64 | Time of the first point, milliseconds |

**Then one record per point, the first point included**, each field a variable-length integer holding the **difference from the previous point** (for the first point, from the header's x, y and time, and from 0 for pressure and tilt):

| Field | Encoding | Unit |
| --- | --- | --- |
| dx | signed varint | 1/16 page unit |
| dy | signed varint | 1/16 page unit |
| dpressure | signed varint, only if flag bit 0 | pressure × 255, so 0–255 |
| daltitude | signed varint, only if flag bit 1 | altitude angle as 0–63 over 0–π/2 (63 = upright) |
| dazimuth | signed varint, only if flag bit 1 | azimuth as 0–255 over 0–2π; the difference wraps, so add it modulo 256 |
| dt | unsigned varint | milliseconds |

- An **unsigned varint** is LEB128: 7 bits per byte, least significant first, with the top bit set on every byte but the last.
- A **signed varint** is zigzag-encoded first (0, −1, 1, −2, 2 … become 0, 1, 2, 3, 4 …), then written as an unsigned varint.
- Positions start from the header's x and y multiplied by 16; divide the running sums by 16 to get page units.
- Without pressure, a point's pressure is 0.5. Without tilt, the Pencil is upright (altitude π/2, azimuth 0).

Each point is `[x, y, pressure 0–1, altitude radians, azimuth radians, time ms]`. Page coordinates start at the page's top left; a page is 1000 units wide.

### Preferences (`kv.ndjson`)

One line per preference, `{ "key": "…", "value": "…" }`, values always strings. Only these keys appear:

| Key | Value |
| --- | --- |
| `mp.ink.paper` | Paper for new pages |
| `mp.ink.smoothing` | `low`, `medium` or `high` |
| `mp.ink.finger` | `on` or `off`: drawing with a finger |
| `mp.ink.tools.v2` | JSON: the four toolbar presets, the toolbar's dock, and the three custom inks |
| `mp.theme` | `system`, `paper` or `night` |
| `mp.analytics` | `on` or `off`: anonymous usage counts |
| `mp.backup.days` | Days between backup reminders |

Device state never travels: scroll positions, first-run markers and the last backup date stay on the device that made them.

## Restoring

A restore first checks the manifest and every checksum, then rebuilds every record from the fields above, rejecting the whole file if any record doesn't fit. Then the writer chooses:

- **Merge** adds the backup to the journal already on the device:
  - journals, entries, pages and blocks merge by `id`, and the copy with the newer `updatedAt` wins; on a tie the device's copy stays;
  - ops are a union by `id`, since they never change;
  - assets merge by `hash`;
  - a page whose `index` is already taken in its entry by a different page goes after that entry's pages;
  - each changed page's `opCount` and `checksum` are recomputed in fold order;
  - preferences are left as they are, unless the device had no journal yet.
- **Replace** removes the device's journal first (after offering a backup of it), then restores the backup and its preferences.
