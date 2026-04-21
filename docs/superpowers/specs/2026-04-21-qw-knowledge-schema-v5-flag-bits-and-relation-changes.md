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

```sql
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
```

**Entity type CHECK.** `entities.type` widened to include `'flag_bit'`. Migration pattern identical to v1->v2 / v2->v3 entities-table rebuild with FK toggling.

**Name canonicalisation.** Flag-bit names are case-sensitive C identifiers (`CVAR_ARCHIVE` never conflicts with a hypothetical `cvar_archive`), but to keep the canonicalisation rule simple and parallel to `cvar` / `command` / etc., flag_bit names are **lowercased** like cvars. Collisions at the case-only level don't exist in ezQuake source (all CVAR_* are ALL_CAPS with underscores; so are FPD_* and STAT_*). The stored name is thus `cvar_archive`, and the `bitmask_family` column disambiguates which family.

**Source state.** `source_backed` if the extractor emits an ast block; `doc_only` otherwise. Same rule as every other type.

**Diff fields.** `diff-versions.ts` compares `bitmask_family`, `value_raw`, `value_numeric`, `source_file`. A rename of the C identifier surfaces as (deleted + created) since the entity name is the natural key.

## Addition 2: `relation_changes` table

**Motivation.** The four asset relation tables (`asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`) are version-keyed but not entity-keyed, so `diff-versions.ts` currently skips them. Phase 2f stress-test gap catalog entry 6. A longer historical walk will see real churn in these tables (new loader sites, new extensions, bindings changing confidence).

**Architecture choice.** A parallel table `relation_changes`, not an extension of `change_events`. Reasons: (1) `change_events` is cleanly entity-keyed and the UNIQUE constraint `(entity_id, to_version, field_name, change_kind)` doesn't apply to relation rows. (2) Relation rows have natural keys that are multi-column per table; hashing them into `field_name` would be ugly. (3) Keeping the two parallel lets query code stay simple (entity-keyed queries hit `change_events`; relation-keyed queries hit `relation_changes`).

```sql
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
```

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
