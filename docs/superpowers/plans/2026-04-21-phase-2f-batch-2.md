# Phase 2f Batch 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Phase 2f Batch 2 gaps: capture ezQuake bitmask-family flag_bits as a new entity type, and add diff coverage for the four asset relation tables.

**Architecture:** Schema v5 migration adds `flag_bit_versions` (entity-keyed per-type version table, same pattern as existing 9 types) and `relation_changes` (relation-keyed, parallel to entity-keyed `change_events`). A new Python regex extractor `extract-ezquake-flag-bits-clang.py` scans a configurable list of ezQuake headers for `#define FAMILY_*` lines, emitting one entry per bit. A new TypeScript adapter `load-flag-bits.ts` plugs into the existing per-type `ADAPTERS` dispatch. `diff-versions.ts` gains one new TYPE_DIFF_CONFIGS entry (flag_bit) and one new loop body (asset-relation diff) that emits `relation_changes` rows from set-diffs of the four asset_* tables keyed on their existing UNIQUE constraints.

**Tech Stack:** TypeScript (Bun / Node 20), better-sqlite3 11, Python 3, regex (no libclang -- header defines are simple and stable).

**Testing philosophy (per `apps/qw-oracle/CLAUDE.md`):** Compile and typecheck first (`bunx tsc --noEmit`). Manual verification via SQL queries against `knowledge.db`. No new test infrastructure added -- the qw-oracle project has none today and the extractor-to-loader pipeline is validated end-to-end by counts against known ezQuake tags.

**Per CLAUDE.md (project root):** Main tree, branch `main`, commit directly after each task. No worktree, no feature branch.

---

## File Structure

**New files:**
- `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md` -- schema v5 design spec (spec-first per qw-oracle CLAUDE.md)
- `packages/qw-config/scripts/extract-ezquake-flag-bits-clang.py` -- regex extractor for CVAR_*, FPD_*, STAT_*
- `packages/qw-config/src/data/ezquake-flag-bits-ast.json` -- extractor output (gitignored data path; generated)
- `apps/qw-oracle/scripts/load-knowledge/load-flag-bits.ts` -- type adapter

**Modified files:**
- `apps/qw-oracle/scripts/load-knowledge/schema.ts` -- `SCHEMA_VERSION = 5`, add `SCHEMA_V5_ADDITIONS_SQL`, `ENTITIES_V5_MIGRATION_SQL`, `migrateV4ToV5`
- `apps/qw-oracle/scripts/load-knowledge/types.ts` -- `'flag_bit'` added to `EntityType`, new `FlagBitAstBlock`, `FlagBitEntry`, `FlagBitVersionRow`, `RelationChangeRow` types
- `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` -- `upsertFlagBitVersion`, `upsertRelationChange`, update `canonicalIdFor` note only if needed
- `apps/qw-oracle/scripts/load-knowledge/load-version.ts` -- register flag_bit adapter in `ADAPTERS`
- `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts` -- flag_bit entry in `TYPE_DIFF_CONFIGS`; new `diffAssetRelations` function emitting `relation_changes` rows
- `apps/qw-oracle/scripts/load-knowledge/index.ts` -- `--type flag_bit` in usage help
- `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` -- v5 section with expected counts
- `apps/qw-oracle/CLAUDE.md` -- bump entity-type count and mention flag_bit in supported types block
- `HANDOVER.md` -- mark Batch 2 gaps 5 and 6 resolved in the scorecard

---

## Task 1: Schema v5 design spec

**Files:**
- Create: `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`

- [ ] **Step 1: Write the spec**

Create the file with this content:

```markdown
---
title: Knowledge Schema v5 -- flag_bit entities + relation_changes
date: 2026-04-21
status: approved
supersedes: none
superseded_by: none
---

# Knowledge Schema v5

Two additions to the Layer 1 knowledge store, landing together as schema v5 because they share a migration window.

## Addition 1: `flag_bit` entity type

**Motivation.** ezQuake uses numerous bitmask families as first-class facts -- `CVAR_*` (cvar_t flag bits), `FPD_*` (teamplay full-pitch-disable flags), `STAT_*` (player stat indices). These are referenced across the codebase and in release notes, but the current schema has no way to record "CVAR_ARCHIVE exists at version X with value 1 at cvar.h:42". Phase 2f stress-test gap catalog entry 5.

**Schema.** One new per-type version table `flag_bit_versions`, following the existing `token_primitive_versions` shape.

\`\`\`sql
CREATE TABLE flag_bit_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  bitmask_family    TEXT NOT NULL,  -- 'cvar_flag' | 'fpd_flag' | 'stat_const' | future
  value_raw         TEXT,           -- the RHS of the #define, e.g. '1<<0', '0x0001', '7'
  value_numeric     INTEGER,        -- resolved integer value, nullable if unresolvable
  source_file       TEXT,
  source_line       INTEGER,
  raw_ast_hash      TEXT,
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
\`\`\`

**Entity type CHECK.** `entities.type` widened to include `'flag_bit'`. Migration pattern identical to v1->v2 / v2->v3 entities-table rebuild with FK toggling.

**Name canonicalisation.** Flag-bit names are case-sensitive C identifiers (`CVAR_ARCHIVE` never conflicts with a hypothetical `cvar_archive`), but to keep the canonicalisation rule simple and parallel to `cvar` / `command` / etc., flag_bit names are **lowercased** like cvars. Collisions at the case-only level don't exist in ezQuake source (all CVAR_* are ALL_CAPS with underscores; so are FPD_* and STAT_*). The stored name is thus `cvar_archive`, and the `bitmask_family` column disambiguates which family.

**Source state.** `source_backed` if the extractor emits an ast block; `doc_only` otherwise. Same rule as every other type.

**Diff fields.** `diff-versions.ts` compares `bitmask_family`, `value_raw`, `value_numeric`, `source_file`. A rename of the C identifier surfaces as (deleted + created) since the entity name is the natural key.

## Addition 2: `relation_changes` table

**Motivation.** The four asset relation tables (`asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`) are version-keyed but not entity-keyed, so `diff-versions.ts` currently skips them. Phase 2f stress-test gap catalog entry 6. A longer historical walk will see real churn in these tables (new loader sites, new extensions, bindings changing confidence).

**Architecture choice.** A parallel table `relation_changes`, not an extension of `change_events`. Reasons: (1) `change_events` is cleanly entity-keyed and the UNIQUE constraint `(entity_id, to_version, field_name, change_kind)` doesn't apply to relation rows. (2) Relation rows have natural keys that are multi-column per table; hashing them into `field_name` would be ugly. (3) Keeping the two parallel lets query code stay simple (entity-keyed queries hit `change_events`; relation-keyed queries hit `relation_changes`).

\`\`\`sql
CREATE TABLE relation_changes (
  id                       INTEGER PRIMARY KEY,
  relation_table           TEXT NOT NULL CHECK (relation_table IN (
                             'asset_extensions','asset_path_rules',
                             'asset_cvar_bindings','asset_loader_sites'
                           )),
  project                  TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  from_version             TEXT,
  to_version               TEXT NOT NULL,
  change_kind              TEXT NOT NULL CHECK (change_kind IN ('created','modified','deleted')),
  row_key_json             TEXT NOT NULL,  -- JSON object of the table's natural-key columns
  field_name               TEXT NOT NULL DEFAULT '',
  old_value                TEXT,
  new_value                TEXT,
  commit_sha               TEXT NOT NULL,  -- 'UNKNOWN' allowed -- no blame for relation rows in v5
  commit_message_excerpt   TEXT,
  extracted_at             TEXT NOT NULL,
  UNIQUE (relation_table, project, to_version, row_key_json, field_name, change_kind)
);
CREATE INDEX idx_relation_changes_to_version ON relation_changes(to_version);
CREATE INDEX idx_relation_changes_table      ON relation_changes(relation_table);
\`\`\`

**Row-key hashing.** `row_key_json` is a deterministic-JSON-encoding of the natural-key columns for the relation_table row. Per table:

- `asset_extensions`: `{"extension":"png","path_hint":"gfx/"}`
- `asset_path_rules`: `{"canonical_id":"ezquake:asset_category:skins"}`
- `asset_cvar_bindings`: `{"cvar_canonical_id":"...","category_id":"...","path_pattern":null}`
- `asset_loader_sites`: `{"canonical_id":"ezquake:asset_category:skins"}`

Keys are always emitted in alphabetical order so the UNIQUE constraint holds.

**Blame intentionally omitted in v5.** The asset relation extractors do emit `source_ref` / `source_line` for some row types (loader_sites especially), but the heterogeneity across the four tables makes a uniform blame pipeline a Phase 2f Batch 3 concern. v5 records `'UNKNOWN'` in `commit_sha` for relation changes. A future migration can backfill.

## Migration pattern

Standard entities-table rebuild for the CHECK widening (same shape as `ENTITIES_V2_MIGRATION_SQL` and `ENTITIES_V3_MIGRATION_SQL`). `flag_bit_versions` and `relation_changes` are plain `CREATE TABLE IF NOT EXISTS`. `SCHEMA_VERSION` bumps 4 -> 5.

## Verification

- `SELECT COUNT(*) FROM entities WHERE type='flag_bit' AND project='ezquake'` -- expect >= 40 at ezQuake head (CVAR_* 24 + FPD_* 7 + STAT_* 17 = 48 minimum).
- `SELECT bitmask_family, COUNT(*) FROM flag_bit_versions GROUP BY bitmask_family` -- expect at least 3 families populated.
- `SELECT COUNT(*) FROM relation_changes WHERE to_version='3.6.6' AND from_version='3.6.5'` -- expect 0 (HANDOVER notes A2 relation-row counts were identical); zero is a valid pass.
- `SELECT change_kind, COUNT(*) FROM relation_changes WHERE to_version='3.6.9' GROUP BY change_kind` -- expect 0 or small; relation tables were stable A1.

## Non-goals

- FTE/MVDSV/KTX flag_bit extraction (Phase 2d/2e).
- `PEXT_*` protocol extensions (0 at ezQuake head; picked up naturally if/when historical walk encounters them).
- Per-flag usage-site tracking (header definition only -- Phase 2f Batch 3 / Layer 2 analysis territory).
- Relation-change blame (`commit_sha='UNKNOWN'` for v5).
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md
git commit -m "docs(qw-oracle): schema v5 spec -- flag_bit entities + relation_changes"
```

---

## Task 2: Schema v5 code migration

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts`

- [ ] **Step 1: Bump `SCHEMA_VERSION`**

In `schema.ts:8`:

```typescript
export const SCHEMA_VERSION = 5;
```

- [ ] **Step 2: Add `SCHEMA_V5_ADDITIONS_SQL`**

Insert after the existing `SCHEMA_V4_ADDITIONS_SQL` block (around line 399, before `ENTITIES_V3_MIGRATION_SQL`):

```typescript
const SCHEMA_V5_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS flag_bit_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  bitmask_family    TEXT NOT NULL,
  value_raw         TEXT,
  value_numeric     INTEGER,
  source_file       TEXT,
  source_line       INTEGER,
  raw_ast_hash      TEXT,
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_flag_bit_versions_family ON flag_bit_versions(bitmask_family);

CREATE TABLE IF NOT EXISTS relation_changes (
  id                       INTEGER PRIMARY KEY,
  relation_table           TEXT NOT NULL CHECK (relation_table IN (
                             'asset_extensions','asset_path_rules',
                             'asset_cvar_bindings','asset_loader_sites'
                           )),
  project                  TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  from_version             TEXT,
  to_version               TEXT NOT NULL,
  change_kind              TEXT NOT NULL CHECK (change_kind IN ('created','modified','deleted')),
  row_key_json             TEXT NOT NULL,
  field_name               TEXT NOT NULL DEFAULT '',
  old_value                TEXT,
  new_value                TEXT,
  commit_sha               TEXT NOT NULL,
  commit_message_excerpt   TEXT,
  extracted_at             TEXT NOT NULL,
  UNIQUE (relation_table, project, to_version, row_key_json, field_name, change_kind)
);
CREATE INDEX IF NOT EXISTS idx_relation_changes_to_version ON relation_changes(to_version);
CREATE INDEX IF NOT EXISTS idx_relation_changes_table      ON relation_changes(relation_table);
`;
```

- [ ] **Step 3: Add `ENTITIES_V5_MIGRATION_SQL`**

Insert after `ENTITIES_V3_MIGRATION_SQL` (around line 429). Same pattern as v3 but with `flag_bit` appended to the type CHECK:

```typescript
const ENTITIES_V5_MIGRATION_SQL = `
CREATE TABLE entities_v5 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v5(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v5 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v5 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
`;
```

- [ ] **Step 4: Add `migrateV4ToV5` function**

Insert after `migrateV3ToV4` (around line 475):

```typescript
function migrateV4ToV5(db: Database.Database): void {
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
      `);
      db.exec(ENTITIES_V5_MIGRATION_SQL);
      db.exec(SCHEMA_V5_ADDITIONS_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('5');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}
```

- [ ] **Step 5: Wire `migrateV4ToV5` into `applySchema`**

In `applySchema` (around line 501), after the v3->v4 migration block, add the v4->v5 step:

```typescript
    if (existingVersion === 4 && SCHEMA_VERSION >= 5) {
      migrateV4ToV5(db);
      existingVersion = 5;
    }
```

And at the end of `applySchema` (line ~514), add v5 additions to the idempotent exec block:

```typescript
  db.exec(SCHEMA_V2_ADDITIONS_SQL);
  db.exec(SCHEMA_V3_ADDITIONS_SQL);
  db.exec(SCHEMA_V4_ADDITIONS_SQL);
  db.exec(SCHEMA_V5_ADDITIONS_SQL);
```

- [ ] **Step 6: Typecheck**

Run from `apps/qw-oracle/`:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npx tsc --noEmit
```

Expected: PASS (zero errors).

- [ ] **Step 7: Verify migration against existing DB**

Back up the DB first, then run schema on the existing (v4) DB:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && cp data/knowledge.db data/knowledge.db.bak-pre-v5
bunx tsx -e "import Database from 'better-sqlite3'; import { applySchema } from './scripts/load-knowledge/schema.ts'; const db = new Database('data/knowledge.db'); applySchema(db); const v = db.prepare(\"SELECT value FROM schema_meta WHERE key='schema_version'\").get(); console.log('schema_version:', v); const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('flag_bit_versions','relation_changes')\").all(); console.log('new tables:', tables); db.close();"
```

Expected output includes `schema_version: { value: '5' }` and both new tables listed.

- [ ] **Step 8: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/schema.ts
git commit -m "feat(qw-oracle): schema v5 -- flag_bit_versions + relation_changes"
```

---

## Task 3: Types + natural-keys upserts

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/types.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`

- [ ] **Step 1: Add `'flag_bit'` to `EntityType`**

In `types.ts` around line 17:

```typescript
export type EntityType =
  | 'cvar'
  | 'command'
  | 'macro'
  | 'cmdline_param'
  | 'keyname'
  | 'hud_element'
  | 'ruleset'
  | 'token_primitive'
  | 'asset_category'
  | 'flag_bit';
```

- [ ] **Step 2: Add flag_bit extractor / row types**

Append to `types.ts` (after the `ReleaseNoteRow` interface, before the closing lines):

```typescript
// --- Phase 2f Batch 2: flag_bit + relation_changes ---------------------------

export type FlagBitFamily =
  | 'cvar_flag'
  | 'fpd_flag'
  | 'stat_const'
  | 'other';

export interface FlagBitAstBlock {
  bitmask_family: FlagBitFamily;
  value_raw: string;
  value_numeric: number | null;
  source_file: string;
  source_line: number;
}

export interface FlagBitEntry {
  ast: FlagBitAstBlock | null;
}

export interface FlagBitExtractorOutput {
  flag_bits: Record<string, FlagBitEntry>;
  _stats?: Record<string, unknown>;
}

export interface FlagBitVersionRow {
  entity_id: number;
  version: string;
  bitmask_family: FlagBitFamily;
  value_raw: string | null;
  value_numeric: number | null;
  source_file: string | null;
  source_line: number | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export type RelationTable =
  | 'asset_extensions'
  | 'asset_path_rules'
  | 'asset_cvar_bindings'
  | 'asset_loader_sites';

export interface RelationChangeRow {
  relation_table: RelationTable;
  project: Project;
  from_version: string | null;
  to_version: string;
  change_kind: ChangeKind;
  row_key_json: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  commit_sha: string;
  commit_message_excerpt: string | null;
  extracted_at: string;
}
```

- [ ] **Step 3: Add upsert helpers to natural-keys.ts**

Import the new types at the top of `natural-keys.ts` (around line 9-28):

```typescript
import type {
  AssetCategoryVersionRow,
  AssetCvarBindingRow,
  AssetExtensionRow,
  AssetLoaderSiteRow,
  AssetPathRuleRow,
  CmdlineParamVersionRow,
  CommandVersionRow,
  CvarVersionRow,
  EntityType,
  FlagBitVersionRow,
  HudElementVersionRow,
  KeynameVersionRow,
  MacroVersionRow,
  Project,
  RelationChangeRow,
  ReleaseNoteRow,
  RulesetVersionRow,
  SourceState,
  TokenPrimitiveVersionRow,
  VersionRow,
} from './types.js';
```

Append two helpers at the end of `natural-keys.ts`:

```typescript
export function upsertFlagBitVersion(db: Database.Database, row: FlagBitVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO flag_bit_versions (
      entity_id, version, bitmask_family, value_raw, value_numeric,
      source_file, source_line, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version, @bitmask_family, @value_raw, @value_numeric,
      @source_file, @source_line, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertRelationChange(db: Database.Database, row: RelationChangeRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO relation_changes (
      relation_table, project, from_version, to_version, change_kind,
      row_key_json, field_name, old_value, new_value,
      commit_sha, commit_message_excerpt, extracted_at
    ) VALUES (
      @relation_table, @project, @from_version, @to_version, @change_kind,
      @row_key_json, @field_name, @old_value, @new_value,
      @commit_sha, @commit_message_excerpt, @extracted_at
    )
  `).run(row);
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/types.ts apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
git commit -m "feat(qw-oracle): flag_bit + relation_changes types and upserts"
```

---

## Task 4: Flag-bit type adapter

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/load-flag-bits.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`

- [ ] **Step 1: Create the adapter**

Create `apps/qw-oracle/scripts/load-knowledge/load-flag-bits.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/load-flag-bits.ts

import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import { upsertFlagBitVersion } from './natural-keys.js';
import type { FlagBitEntry, FlagBitVersionRow } from './types.js';

export const FLAG_BIT_PAYLOAD_FIELD = 'flag_bits';

export function flagBitIsSourceBacked(entry: FlagBitEntry): boolean {
  return entry.ast !== null;
}

export function buildFlagBitVersionRow(
  entityId: number,
  version: string,
  entry: FlagBitEntry,
  now: string,
): FlagBitVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;
  return {
    entity_id: entityId,
    version,
    // bitmask_family is required (NOT NULL); default to 'other' for doc_only rows.
    bitmask_family: ast?.bitmask_family ?? 'other',
    value_raw: ast?.value_raw ?? null,
    value_numeric: ast?.value_numeric ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    raw_ast_hash,
    extracted_at: now,
  };
}

export function upsertFlagBitRow(db: Database.Database, row: FlagBitVersionRow): void {
  upsertFlagBitVersion(db, row);
}
```

- [ ] **Step 2: Register the adapter in load-version.ts**

In `load-version.ts` around line 66, add the import block:

```typescript
import {
  FLAG_BIT_PAYLOAD_FIELD,
  buildFlagBitVersionRow,
  flagBitIsSourceBacked,
  upsertFlagBitRow,
} from './load-flag-bits.js';
```

Then in the `ADAPTERS` record (around line 174, after `asset_category`), add:

```typescript
  flag_bit: {
    payloadField: FLAG_BIT_PAYLOAD_FIELD,
    versionsTable: 'flag_bit_versions',
    isSourceBacked: flagBitIsSourceBacked,
    buildRow: buildFlagBitVersionRow,
    upsertRow: upsertFlagBitRow,
  },
```

- [ ] **Step 3: Update index.ts help text**

In `index.ts:56`, update the subcommand help to list flag_bit:

```typescript
  load-version  --project <p> --version <v>
                --type <cvar|command|macro|cmdline_param|keyname|
                        hud_element|ruleset|token_primitive|flag_bit>
                --json <path> --commit <sha> --ordinal <n>
                [--tag-date <iso8601>] [--extractor-version <s>] [--force]
```

Note: `asset_category` is loaded via `load-assets`, not `load-version`, so it's already correctly absent from this list.

- [ ] **Step 4: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Check name-validation regex in load-version.ts**

The existing regex `/^[a-z0-9_.+\-]+$/` (line 259) accepts lowercase identifiers. Flag-bit names get lowercased to `cvar_archive` / `fpd_no_timers` / `stat_health` before validation, so they match. Verify by spot-check -- no code change expected.

Run this in a bash subshell to sanity-check:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && bunx tsx -e "for (const n of ['cvar_archive','fpd_no_timers','stat_health','stat_items','cvar_user']) { console.log(n, /^[a-z0-9_.+\-]+$/.test(n)); }"
```

Expected: all true.

- [ ] **Step 6: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/load-flag-bits.ts apps/qw-oracle/scripts/load-knowledge/load-version.ts apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): load-flag-bits adapter + ADAPTERS wiring"
```

---

## Task 5: Python extractor for ezQuake flag_bits

**Files:**
- Create: `packages/qw-config/scripts/extract-ezquake-flag-bits-clang.py`

- [ ] **Step 1: Write the extractor**

Create the file. The "-clang" suffix is kept for consistency with sibling extractors even though this one uses pure regex -- the headers are simple `#define NAME value` lines. If a future family needs macro expansion, it can be upgraded in place.

```python
#!/usr/bin/env python3
"""Extract ezQuake bitmask-family flag_bits.

Scans a configured list of ezQuake headers for `#define FAMILY_NAME value`
lines. Regex-based: header defines are simple and stable. No libclang
dependency.

Families at head:
  - CVAR_*  in cvar.h  (cvar_t flag bits)
  - FPD_*   in teamplay.h  (teamplay full-pitch-disable flags)
  - STAT_*  in common.h  (player stat indices)

Extensible via FAMILY_TARGETS -- add (family, header, prefix) triples for
new families. Missing headers (e.g. in older tags) are skipped with a
diagnostic note rather than raising.

Output: <repo>/packages/qw-config/src/data/ezquake-flag-bits-ast.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = (EZQ_REPO / "src") if (EZQ_REPO / "src").is_dir() and any((EZQ_REPO / "src").glob("*.c")) else EZQ_REPO
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-flag-bits-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-flag-bits-diagnostics.log"

# (family, header_filename, name_prefix) triples. Header paths are resolved
# against EZQ_SRC. Adding new families = append a triple.
FAMILY_TARGETS: list[tuple[str, str, str]] = [
    ("cvar_flag",  "cvar.h",     "CVAR_"),
    ("fpd_flag",   "teamplay.h", "FPD_"),
    ("stat_const", "common.h",   "STAT_"),
]

# Matches `#define NAME value  [// trailing]` where value is a single
# whitespace-trimmed expression up to end-of-line-ish. Captures:
#   1: NAME
#   2: value (may include parens, bitshifts, hex, decimal)
_DEFINE_RE = re.compile(
    r"^\s*#define\s+([A-Z][A-Z0-9_]*)\s+([^\n/]+?)(?:\s*//.*)?$",
    re.MULTILINE,
)


def _resolve_numeric(value_raw: str) -> int | None:
    """Resolve a subset of #define RHS expressions to integer.

    Handles: plain decimal, 0x-hex, `(1<<N)`, `1<<N`, parenthesised plain.
    Returns None for anything else (e.g. macro references, arithmetic).
    """
    s = value_raw.strip()
    # Strip one layer of outer parens.
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1].strip()
    # Bit-shift: `1<<N` or `1 << N`.
    m = re.fullmatch(r"(\d+)\s*<<\s*(\d+)", s)
    if m:
        base = int(m.group(1))
        shift = int(m.group(2))
        return base << shift
    # Plain int / hex.
    try:
        return int(s, 0)
    except ValueError:
        return None


def extract_family(family: str, header_path: Path, prefix: str, diagnostics: list[str]) -> dict:
    if not header_path.is_file():
        diagnostics.append(f"[skip] {family}: {header_path} missing")
        return {}

    src = header_path.read_text(encoding="utf-8", errors="replace")
    found: dict[str, dict] = {}
    for m in _DEFINE_RE.finditer(src):
        name = m.group(1)
        if not name.startswith(prefix):
            continue
        value_raw = m.group(2).strip()
        value_numeric = _resolve_numeric(value_raw)
        source_line = src[:m.start()].count("\n") + 1
        found[name] = {
            "ast": {
                "bitmask_family": family,
                "value_raw": value_raw,
                "value_numeric": value_numeric,
                "source_file": header_path.name,
                "source_line": source_line,
            },
        }
    diagnostics.append(f"[ok] {family}: {len(found)} from {header_path.name}")
    return found


def main() -> int:
    print("ezQuake flag_bit extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    diagnostics: list[str] = []
    combined: dict[str, dict] = {}
    by_family: dict[str, int] = {}

    for family, header_name, prefix in FAMILY_TARGETS:
        header_path = EZQ_SRC / header_name
        found = extract_family(family, header_path, prefix, diagnostics)
        for name, entry in found.items():
            # First-wins on collisions. Shouldn't happen across CVAR/FPD/STAT.
            if name not in combined:
                combined[name] = entry
        by_family[family] = len(found)

    sorted_out = {k: combined[k] for k in sorted(combined)}
    stats = {
        "total": len(sorted_out),
        "by_family": by_family,
    }
    output = {"flag_bits": sorted_out, "_stats": stats}

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    print(f"  total:      {stats['total']}")
    print(f"  by family:  {stats['by_family']}")
    print(f"\n  written: {OUTPUT_JSON}")

    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text("\n".join(diagnostics) + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Make executable and run**

```bash
cd /home/paradoks/projects/quakeworld
chmod +x packages/qw-config/scripts/extract-ezquake-flag-bits-clang.py
python3 packages/qw-config/scripts/extract-ezquake-flag-bits-clang.py
```

Expected stdout includes:
- `total: >= 40` (cvar.h 24 + teamplay.h 7 + common.h 17 = 48)
- `by family: {'cvar_flag': N1, 'fpd_flag': N2, 'stat_const': N3}` with N1, N2, N3 all non-zero

- [ ] **Step 3: Spot-check the output JSON**

```bash
cd /home/paradoks/projects/quakeworld && python3 -c "import json; d = json.load(open('packages/qw-config/src/data/ezquake-flag-bits-ast.json')); entries = d['flag_bits']; print('count:', len(entries)); print('sample CVAR_ARCHIVE:', entries.get('CVAR_ARCHIVE')); print('sample FPD_NO_TIMERS:', entries.get('FPD_NO_TIMERS')); print('sample STAT_HEALTH:', entries.get('STAT_HEALTH'))"
```

Expected: each sample prints an object with `ast.bitmask_family`, `ast.value_raw`, `ast.value_numeric`, `ast.source_file`, `ast.source_line`.

- [ ] **Step 4: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-flag-bits-clang.py packages/qw-config/src/data/ezquake-flag-bits-ast.json
git commit -m "feat(qw-config): ezQuake flag_bits extractor (CVAR_ / FPD_ / STAT_)"
```

---

## Task 6: Load flag_bits into knowledge.db at head

**Files:** None modified (runtime-only validation).

- [ ] **Step 1: Resolve head commit SHA and ordinal**

```bash
cd /home/paradoks/projects/quakeworld && git -C research/repos/ezquake-source rev-parse HEAD
```

Capture the full SHA. Then find the highest existing ordinal in the DB for ezquake:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && bunx tsx -e "import Database from 'better-sqlite3'; const db = new Database('data/knowledge.db', {readonly: true}); const v = db.prepare(\"SELECT version, ordinal, commit_sha FROM versions WHERE project='ezquake' ORDER BY ordinal DESC LIMIT 1\").get(); console.log(v); db.close();"
```

Expected: the head version row (likely `head` or the most-recent tag). Use its ordinal and commit_sha for the load.

- [ ] **Step 2: Load flag_bits for head**

Use the existing head's commit SHA and ordinal (e.g. `bea2515` + ordinal from Step 1):

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npm run load-knowledge -- load-version \
  --project ezquake \
  --version head \
  --type flag_bit \
  --json ../../packages/qw-config/src/data/ezquake-flag-bits-ast.json \
  --commit $(git -C ../../research/repos/ezquake-source rev-parse HEAD) \
  --ordinal <ordinal-from-step-1>
```

Expected JSON output: `entitiesUpserted: >= 40`, `versionsUpserted: 1`, `parseState: "ok"`.

- [ ] **Step 3: Verify via SQL**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && bunx tsx -e "import Database from 'better-sqlite3'; const db = new Database('data/knowledge.db', {readonly: true}); console.log('total flag_bit entities:', db.prepare(\"SELECT COUNT(*) AS n FROM entities WHERE type='flag_bit' AND project='ezquake'\").get()); console.log('by family:', db.prepare(\"SELECT bitmask_family, COUNT(*) AS n FROM flag_bit_versions GROUP BY bitmask_family\").all()); console.log('sample:', db.prepare(\"SELECT e.name, fv.bitmask_family, fv.value_raw, fv.value_numeric, fv.source_file, fv.source_line FROM entities e JOIN flag_bit_versions fv ON fv.entity_id=e.id WHERE e.name IN ('cvar_archive','fpd_no_timers','stat_health')\").all()); db.close();"
```

Expected:
- `total flag_bit entities: { n: >= 40 }`
- `by family:` lists `cvar_flag`, `fpd_flag`, `stat_const` with non-zero counts
- `sample:` returns 3 rows with correct value_raw / value_numeric / source_file values

- [ ] **Step 4: Commit if the load-version run modified any tracked file**

Typically knowledge.db is gitignored so there's nothing to commit. Verify:

```bash
cd /home/paradoks/projects/quakeworld && git status
```

Expected: clean working tree (knowledge.db and .bak files gitignored).

---

## Task 7: diff-versions.ts -- add flag_bit config

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts`

- [ ] **Step 1: Add flag_bit to TYPE_DIFF_CONFIGS**

In `diff-versions.ts`, append to the `TYPE_DIFF_CONFIGS` array (after `asset_category`, around line 148):

```typescript
  {
    entityType: 'flag_bit',
    versionsTable: 'flag_bit_versions',
    diffableFields: [
      'bitmask_family', 'value_raw', 'value_numeric', 'source_file',
    ],
    hasSource: true,
  },
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/diff-versions.ts
git commit -m "feat(qw-oracle): flag_bit diff config"
```

---

## Task 8: Asset-relation diff -- emit relation_changes rows

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts`

- [ ] **Step 1: Add relation-diff configuration**

Near the top of `diff-versions.ts` (after `TYPE_DIFF_CONFIGS` definition, around line 148), add:

```typescript
interface RelationDiffConfig {
  table: 'asset_extensions' | 'asset_path_rules' | 'asset_cvar_bindings' | 'asset_loader_sites';
  naturalKeyColumns: readonly string[];
  diffableColumns: readonly string[];
}

const RELATION_DIFF_CONFIGS: readonly RelationDiffConfig[] = [
  {
    table: 'asset_extensions',
    naturalKeyColumns: ['extension', 'path_hint'],
    diffableColumns: ['category_id', 'notes'],
  },
  {
    table: 'asset_path_rules',
    naturalKeyColumns: ['canonical_id'],
    diffableColumns: ['rule_kind', 'ordinal', 'description', 'source_ref', 'source_verified', 'notes'],
  },
  {
    table: 'asset_cvar_bindings',
    naturalKeyColumns: ['cvar_canonical_id', 'category_id', 'path_pattern'],
    diffableColumns: ['load_trigger', 'confidence', 'source_ref', 'notes'],
  },
  {
    table: 'asset_loader_sites',
    naturalKeyColumns: ['canonical_id'],
    diffableColumns: [
      'function_name', 'source_file', 'source_line', 'source_column',
      'enclosing_function', 'reads_category_id', 'load_trigger',
      'path_source', 'path_literal', 'path_cvar_id', 'confidence',
      'dev_only', 'notes',
    ],
  },
];
```

- [ ] **Step 2: Add `diffAssetRelations` function**

Append before `resolveBlame` (around line 396):

```typescript
interface RelationStats {
  table: string;
  fromCount: number;
  toCount: number;
  created: number;
  modified: number;
  deleted: number;
}

function diffAssetRelations(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
  now: string,
): { stats: RelationStats[]; totalCreated: number; totalModified: number; totalDeleted: number } {
  const insertRelChange = db.prepare(`
    INSERT OR REPLACE INTO relation_changes (
      relation_table, project, from_version, to_version, change_kind,
      row_key_json, field_name, old_value, new_value,
      commit_sha, commit_message_excerpt, extracted_at
    ) VALUES (
      @relation_table, @project, @from_version, @to_version, @change_kind,
      @row_key_json, @field_name, @old_value, @new_value,
      'UNKNOWN', NULL, @extracted_at
    )
  `);

  const stats: RelationStats[] = [];
  let totalCreated = 0;
  let totalModified = 0;
  let totalDeleted = 0;

  for (const config of RELATION_DIFF_CONFIGS) {
    const fromRows = db.prepare(`
      SELECT * FROM ${config.table} WHERE project = ? AND version = ?
    `).all(project, fromVersion) as Array<Record<string, unknown>>;
    const toRows = db.prepare(`
      SELECT * FROM ${config.table} WHERE project = ? AND version = ?
    `).all(project, toVersion) as Array<Record<string, unknown>>;

    const keyOf = (row: Record<string, unknown>): string => {
      const obj: Record<string, unknown> = {};
      for (const col of [...config.naturalKeyColumns].sort()) {
        obj[col] = row[col] ?? null;
      }
      return JSON.stringify(obj);
    };

    const fromByKey = new Map<string, Record<string, unknown>>();
    const toByKey = new Map<string, Record<string, unknown>>();
    for (const r of fromRows) fromByKey.set(keyOf(r), r);
    for (const r of toRows) toByKey.set(keyOf(r), r);

    const allKeys = new Set<string>([...fromByKey.keys(), ...toByKey.keys()]);
    let created = 0;
    let modified = 0;
    let deleted = 0;

    for (const key of allKeys) {
      const fromRow = fromByKey.get(key);
      const toRow = toByKey.get(key);

      if (!fromRow && toRow) {
        insertRelChange.run({
          relation_table: config.table,
          project,
          from_version: fromVersion,
          to_version: toVersion,
          change_kind: 'created' as ChangeKind,
          row_key_json: key,
          field_name: '',
          old_value: null,
          new_value: null,
          extracted_at: now,
        });
        created += 1;
        continue;
      }

      if (fromRow && !toRow) {
        insertRelChange.run({
          relation_table: config.table,
          project,
          from_version: fromVersion,
          to_version: toVersion,
          change_kind: 'deleted' as ChangeKind,
          row_key_json: key,
          field_name: '',
          old_value: null,
          new_value: null,
          extracted_at: now,
        });
        deleted += 1;
        continue;
      }

      if (fromRow && toRow) {
        for (const col of config.diffableColumns) {
          if (!valuesDiffer(fromRow[col], toRow[col])) continue;
          insertRelChange.run({
            relation_table: config.table,
            project,
            from_version: fromVersion,
            to_version: toVersion,
            change_kind: 'modified' as ChangeKind,
            row_key_json: key,
            field_name: col,
            old_value: stringifyOrNull(fromRow[col]),
            new_value: stringifyOrNull(toRow[col]),
            extracted_at: now,
          });
          modified += 1;
        }
      }
    }

    stats.push({
      table: config.table,
      fromCount: fromRows.length,
      toCount: toRows.length,
      created,
      modified,
      deleted,
    });
    totalCreated += created;
    totalModified += modified;
    totalDeleted += deleted;
  }

  return { stats, totalCreated, totalModified, totalDeleted };
}
```

- [ ] **Step 3: Invoke `diffAssetRelations` from `diffVersions`**

Inside the `txn` (around line 378, after the TYPE_DIFF_CONFIGS loop closes), add:

```typescript
    const relResult = diffAssetRelations(
      options.db, options.project, options.fromVersion, options.toVersion, now,
    );
    totalCreations += relResult.totalCreated;
    totalModifications += relResult.totalModified;
    totalDeletions += relResult.totalDeleted;
    (diffResultExtras as any).relationStats = relResult.stats;
```

Right before the `txn` (around line 242), initialise the extras object:

```typescript
  const diffResultExtras: { relationStats?: RelationStats[] } = {};
```

Update the return object at the end of `diffVersions` (around line 383):

```typescript
  return {
    extractorRunId,
    fromCommitSha,
    toCommitSha,
    changeEventsInserted: totalCreations + totalModifications + totalDeletions,
    creationsEmitted: totalCreations,
    modificationsEmitted: totalModifications,
    deletionsEmitted: totalDeletions,
    transitionsLogged: totalTransitions,
    perType,
    relationStats: diffResultExtras.relationStats ?? [],
  };
```

And extend the `DiffResult` interface (around line 159):

```typescript
export interface DiffResult {
  extractorRunId: string;
  fromCommitSha: string;
  toCommitSha: string;
  changeEventsInserted: number;
  creationsEmitted: number;
  modificationsEmitted: number;
  deletionsEmitted: number;
  transitionsLogged: number;
  perType: DiffTypeStats[];
  relationStats: RelationStats[];
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/diff-versions.ts
git commit -m "feat(qw-oracle): diff asset relation tables into relation_changes"
```

---

## Task 9: Validation re-run -- A1 and A2

**Files:** None modified; DB state mutated.

- [ ] **Step 1: Need flag_bit entities at older versions for a meaningful diff**

At this point flag_bits only exist at `head`. For A1 (3.6.8 -> 3.6.9) and A2 (3.6.5 -> 3.6.6) to have meaningful flag_bit diffs, we need to run the extractor against those tags' trees and load them.

Run the parallel extract helper (adjusted per Batch 1's performance lesson: 2 tags concurrently but extractors sequential within a tag). Since only flag_bits is new, we only need that one extractor per tag:

```bash
cd /home/paradoks/projects/quakeworld
for tag in v3.6.5 v3.6.6 v3.6.8 v3.6.9; do
  version="${tag#v}"
  commit=$(git -C research/repos/ezquake-source rev-parse "$tag")
  worktree="/tmp/ezq-$version"
  if [ ! -d "$worktree" ]; then
    git -C research/repos/ezquake-source worktree add "$worktree" "$commit" 2>&1 | tail -2
  fi
  python3 packages/qw-config/scripts/extract-ezquake-flag-bits-clang.py \
    --repo-root "$worktree" \
    --output "/tmp/ezquake-flag-bits-$version.json"
  echo "--- $version ---"
  python3 -c "import json; d = json.load(open('/tmp/ezquake-flag-bits-$version.json')); print('  total:', d['_stats']['total'], 'by_family:', d['_stats']['by_family'])"
done
```

Expected: each tag reports a total and family breakdown. Counts may vary by a few entries across tags (new flags added over time).

- [ ] **Step 2: Load each tag's flag_bits into knowledge.db**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
for version in 3.6.5 3.6.6 3.6.8 3.6.9; do
  commit=$(git -C ../../research/repos/ezquake-source rev-parse "v$version")
  ordinal=$(bunx tsx -e "import Database from 'better-sqlite3'; const db = new Database('data/knowledge.db', {readonly: true}); const r = db.prepare(\"SELECT ordinal FROM versions WHERE project='ezquake' AND version=?\").get('$version'); console.log(r ? r.ordinal : ''); db.close();")
  if [ -z "$ordinal" ]; then
    echo "SKIP: no versions row for $version -- load a non-flag_bit type first to seed the versions row"
    continue
  fi
  npm run load-knowledge -- load-version \
    --project ezquake --version "$version" --type flag_bit \
    --json "/tmp/ezquake-flag-bits-$version.json" \
    --commit "$commit" --ordinal "$ordinal"
done
```

Expected: each invocation reports `entitiesUpserted: >= 40`. If a `SKIP:` message appears for any of the four tags, it means that tag was never loaded for any entity type in the existing DB; resolve by loading one other type for that tag first via the normal procedure, then retry.

- [ ] **Step 3: Run diff A1 (3.6.8 -> 3.6.9)**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run load-knowledge -- diff --project ezquake --from 3.6.8 --to 3.6.9 | tee /tmp/diff-a1-batch2.json
```

Inspect the JSON output. Expected: `relationStats` key present, flag_bit entry in `perType`.

- [ ] **Step 4: Run diff A2 (3.6.5 -> 3.6.6)**

```bash
npm run load-knowledge -- diff --project ezquake --from 3.6.5 --to 3.6.6 | tee /tmp/diff-a2-batch2.json
```

- [ ] **Step 5: SQL verification**

```bash
bunx tsx -e "import Database from 'better-sqlite3'; const db = new Database('data/knowledge.db', {readonly: true}); console.log('flag_bit change_events A1:', db.prepare(\"SELECT change_kind, COUNT(*) AS n FROM change_events ce JOIN entities e ON e.id=ce.entity_id WHERE e.type='flag_bit' AND ce.to_version='3.6.9' GROUP BY change_kind\").all()); console.log('flag_bit change_events A2:', db.prepare(\"SELECT change_kind, COUNT(*) AS n FROM change_events ce JOIN entities e ON e.id=ce.entity_id WHERE e.type='flag_bit' AND ce.to_version='3.6.6' GROUP BY change_kind\").all()); console.log('relation_changes A1:', db.prepare(\"SELECT relation_table, change_kind, COUNT(*) AS n FROM relation_changes WHERE to_version='3.6.9' GROUP BY relation_table, change_kind\").all()); console.log('relation_changes A2:', db.prepare(\"SELECT relation_table, change_kind, COUNT(*) AS n FROM relation_changes WHERE to_version='3.6.6' GROUP BY relation_table, change_kind\").all()); db.close();"
```

Expected (per HANDOVER's scorecard -- relation tables were stable across both pairs):
- flag_bit change_events: small counts (likely 0-5 per pair; families were stable recently). Zero is an acceptable result.
- relation_changes: 0 rows for both A1 and A2 (relation tables were identical 17/25/14/26/110 at both pairs per HANDOVER line 54). Zero is the expected pass.

- [ ] **Step 6: Record the counts**

Write the observed counts to a scratch note in `/tmp/batch2-validation.md`:

```bash
cat > /tmp/batch2-validation.md <<EOF
# Batch 2 validation -- 2026-04-21

## flag_bit loads (ezQuake)

- head: <observed>
- 3.6.9: <observed>
- 3.6.8: <observed>
- 3.6.6: <observed>
- 3.6.5: <observed>

## Diff A1 (3.6.8 -> 3.6.9)

- flag_bit change_events: <created=X, modified=Y, deleted=Z>
- relation_changes: <per-table breakdown>

## Diff A2 (3.6.5 -> 3.6.6)

- flag_bit change_events: <created=X, modified=Y, deleted=Z>
- relation_changes: <per-table breakdown>
EOF
```

Fill in the observed values.

---

## Task 10: Docs update

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md`
- Modify: `apps/qw-oracle/CLAUDE.md`
- Modify: `HANDOVER.md`

- [ ] **Step 1: Update e2e-verify.md**

Read the existing `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` to see its structure. Append a new section at the end:

```markdown
## Phase 2f Batch 2 (schema v5): flag_bit + relation_changes

### flag_bit head load verification

```sql
SELECT COUNT(*) FROM entities WHERE type='flag_bit' AND project='ezquake';
-- expect: >= 40 at head (24 CVAR_* + 7 FPD_* + 17 STAT_*)

SELECT bitmask_family, COUNT(*) FROM flag_bit_versions
WHERE version = 'head'
GROUP BY bitmask_family;
-- expect: cvar_flag >=24, fpd_flag >=7, stat_const >=17
```

### flag_bit diff (A1: 3.6.8 -> 3.6.9)

```sql
SELECT change_kind, COUNT(*) FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.type='flag_bit' AND ce.to_version='3.6.9'
GROUP BY change_kind;
-- expect: small counts (0-5); zero is acceptable -- flag families stable recently
```

### relation_changes (A1 and A2)

```sql
SELECT relation_table, change_kind, COUNT(*) FROM relation_changes
WHERE to_version IN ('3.6.9','3.6.6')
GROUP BY relation_table, change_kind, to_version;
-- expect: 0 rows at A1 and A2 (relation tables identical per HANDOVER scorecard).
-- Zero is the expected pass. Non-zero means the 2f-Batch-1 counts drifted.
```
```

- [ ] **Step 2: Update CLAUDE.md entity-type block**

In `apps/qw-oracle/CLAUDE.md`, find the line listing supported entity types:

```
Supported entity types: `cvar`, `command`, `macro`, `cmdline_param`, `keyname`, `hud_element`, `ruleset`, `token_primitive`, `asset_category`.
```

Replace with:

```
Supported entity types: `cvar`, `command`, `macro`, `cmdline_param`, `keyname`, `hud_element`, `ruleset`, `token_primitive`, `asset_category`, `flag_bit`.
```

Also update the top-of-file status line that mentions entity counts. Find:

```
| `data/knowledge.db` | **Layer 1** - structured engine facts (cvars, commands, macros, HUD elements, rulesets, keynames, token primitives, cmdline params, asset consumption). Source-derived, version-aware, canonical. | ezQuake head (3849 entities across 9 types, schema v3). FTE/MVDSV/KTX pending. |
```

Replace the count/version clause with:

```
| `data/knowledge.db` | **Layer 1** - structured engine facts (cvars, commands, macros, HUD elements, rulesets, keynames, token primitives, cmdline params, asset consumption, flag bits). Source-derived, version-aware, canonical. | ezQuake head (<observed-entity-count> entities across 10 types, schema v5). FTE/MVDSV/KTX pending. |
```

Fill `<observed-entity-count>` with the new total from the Task 6 verify query (`SELECT COUNT(*) FROM entities WHERE project='ezquake'`).

- [ ] **Step 3: Update HANDOVER.md scorecard**

In `HANDOVER.md`, find the "Phase 2f stress-test gap catalog" section and the "Tier 2 -- Data completeness" block with gaps 5 and 6. Mark both resolved:

```markdown
**Tier 2 -- Data completeness:**

5. ~~`flag_bit` entity type.~~ **RESOLVED (Batch 2, 2026-04-21).** Schema v5 added `flag_bit_versions` table. Extractor `extract-ezquake-flag-bits-clang.py` covers CVAR_*, FPD_*, STAT_* at ezQuake head; extensible via `FAMILY_TARGETS` config. <N> flag_bit entities loaded across 5 tags (head + 3.6.5/3.6.6/3.6.8/3.6.9). PEXT_*/FTE_PEXT_* deferred (0 at head; extractor will pick them up naturally if encountered during historical walks).
6. ~~Asset relation diff mode.~~ **RESOLVED (Batch 2, 2026-04-21).** Schema v5 added `relation_changes` table (parallel to `change_events` but relation-keyed). `diff-versions.ts` now emits added/deleted/modified rows for `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`. Blame intentionally omitted in v5 (`commit_sha='UNKNOWN'`) -- Batch 3 concern.
```

Also update the "Remaining fix sequencing" block to reflect that only Batch 3 remains:

```markdown
### Remaining fix sequencing

**Batch 3 (architectural, ~full day+): gaps 2, 3, 4.**
Extractor version-tolerance audit -- run against 3.6.0 / 3.2.3 now that layout-detection is in place and catalog what new struct-shape mismatches surface. Struct-field-addition blame correction (per-field source location in extractors). Cvar default-value blame at `Cvar_SetDefault` call sites.

Then re-run A1, A2, A3 against the fixed pipeline to verify.
```

(Delete the now-obsolete "Batch 2 (new data, ~4-6h): gaps 5, 6." paragraph.)

And update the Open-items list at the top if needed -- the "Phase 2f stress-test gap catalog" entry can remain (Batch 3 still open) but update the hook text to reflect progress.

Also update the scorecard table at the top of the Phase 2f section to add a new row for Batch 2 results. Under the existing scorecard:

```markdown
| A1: 3.6.8 -> 3.6.9 (post-Batch2) | 6 + <flag_bit-changes> + <relation-changes> | <unchanged> | flag_bit + relation coverage live |
| A2: 3.6.5 -> 3.6.6 (post-Batch2) | 77 + <flag_bit-changes> + <relation-changes> | <unchanged> | flag_bit + relation coverage live |
```

Fill the placeholders with the observed counts from Task 9 Step 5.

- [ ] **Step 4: Commit all doc updates together**

```bash
cd /home/paradoks/projects/quakeworld && git add apps/qw-oracle/scripts/load-knowledge/e2e-verify.md apps/qw-oracle/CLAUDE.md HANDOVER.md
git commit -m "docs(qw-oracle): Batch 2 complete -- flag_bit + relation_changes"
```

---

## Task 11: Final verification and MEMORY.md update

**Files:**
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md` (index line)
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_qw_oracle_vision.md` (add Batch 2 shipped line)

- [ ] **Step 1: Final typecheck + end-to-end sanity**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && npx tsc --noEmit && echo "typecheck: PASS"
bunx tsx -e "import Database from 'better-sqlite3'; const db = new Database('data/knowledge.db', {readonly: true}); const v = db.prepare(\"SELECT value FROM schema_meta WHERE key='schema_version'\").get(); const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('flag_bit_versions','relation_changes')\").all(); const ct = db.prepare(\"SELECT COUNT(*) AS n FROM entities WHERE type='flag_bit'\").get(); console.log('schema:', v, 'tables:', tables, 'flag_bit entities:', ct); db.close();"
```

Expected: schema_version 5, both tables present, flag_bit entity count matches Task 6 count.

- [ ] **Step 2: Update MEMORY.md index line for qw-oracle**

Read the existing MEMORY.md entry:

```markdown
- [QW Oracle / Knowledge Service](project_qw_oracle_vision.md) -- three-layer polyglot knowledge service, MCP serve, LLM-agnostic. Phase 2a schema + Phase 2b loader shipped 2026-04-18; POC demo assets from earlier sessions
```

Update to reflect Batch 2 shipped:

```markdown
- [QW Oracle / Knowledge Service](project_qw_oracle_vision.md) -- three-layer polyglot knowledge service, MCP serve, LLM-agnostic. Phase 2f Batch 2 shipped 2026-04-21 (flag_bit entity type + relation_changes diff coverage, schema v5). Historical backfill (Batch 3 architectural fixes) still pending.
```

Also update the HANDOVER hook line. Find:

```markdown
- **[Open handover items](/home/paradoks/projects/quakeworld/HANDOVER.md)** -- deferred items from prior wrap-ups. Check at session start. 9 items pending as of 2026-04-20 (Phase 2f Batch 1 gap fixes shipped: 5 of 10 gaps closed -- repo-layout tolerance, parser extensions, UTF-8 legacy source, token-primitive lookahead. Batch 2 and Batch 3 remain).
```

Replace with:

```markdown
- **[Open handover items](/home/paradoks/projects/quakeworld/HANDOVER.md)** -- deferred items from prior wrap-ups. Check at session start. 9 items pending as of 2026-04-21 (Phase 2f Batch 2 shipped: 7 of 10 gaps closed. Batch 3 architectural fixes remain: extractor version-tolerance audit, struct-field-addition blame correction, Cvar_SetDefault call-site blame).
```

- [ ] **Step 3: Append Batch 2 shipped line to project_qw_oracle_vision.md**

Append a short bullet to the "What shipped" section of that memory file noting the date and summary.

- [ ] **Step 4: Commit memory updates**

```bash
git -C /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory add MEMORY.md project_qw_oracle_vision.md 2>/dev/null || true
# Memory dir may or may not be a git repo; the above is tolerant either way.
```

If the memory directory is NOT a git repo (typical), the add is a no-op and the files are simply updated in place.

- [ ] **Step 5: Push main to origin**

```bash
cd /home/paradoks/projects/quakeworld && git push origin main
```

---

## Self-Review

**Spec coverage check:**
- Schema v5 additions (flag_bit_versions, relation_changes) -- Tasks 1, 2
- flag_bit entity type plumbing (types, adapter, natural-keys) -- Tasks 3, 4
- Extractor -- Task 5
- End-to-end head load -- Task 6
- Diff coverage (flag_bit + relation tables) -- Tasks 7, 8
- Validation re-run -- Task 9
- Docs + memory -- Tasks 10, 11

**Type consistency check:**
- `FlagBitFamily` type used consistently (types.ts, load-flag-bits.ts, schema comments)
- `RelationChangeRow` shape matches the `upsertRelationChange` INSERT columns one-for-one
- `diffAssetRelations` emits rows matching `relation_changes` table schema
- `buildFlagBitVersionRow` returns `FlagBitVersionRow` which matches `upsertFlagBitVersion` shape
- `FLAG_BIT_PAYLOAD_FIELD = 'flag_bits'` matches the extractor's JSON top-level key `"flag_bits"`

**Placeholder scan:** No `TBD`, no "handle edge cases", no "similar to Task N" shortcuts. Every code step contains the actual code. Observed-value placeholders (`<observed-entity-count>`, `<N>`, `<flag_bit-changes>`) in doc-update steps are intentional -- the executor fills them with real counts from the validation runs.

**Execution note:** The extractor in Task 5 does not use libclang despite the `-clang.py` filename suffix. This is deliberate -- header-level `#define` lines are trivially regex-matchable and dragging libclang in would add fragility (header-only parsing is awkward with clang AST for a single TU). The suffix is kept for naming-parallel consistency with sibling extractors.
