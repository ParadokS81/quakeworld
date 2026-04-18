---
Doc type: current - Design spec. Delete/archive once Phase 2b-2g implementation lands and the schema stabilizes, or once it is superseded by a revised Phase-3 schema spec.
---

# QW Knowledge Extraction - Schema Design Spec

**Date:** 2026-04-18
**Status:** Draft. Awaiting user review before implementation planning.
**Scope:** SQLite schema and loader interface for QW Knowledge Service Layer 1. Backs all four target codebases: ezQuake, FTE, MVDSV, KTX.
**Phase:** 2a. Phase 2b onward is implementation work against this spec.

## Related docs

- Oracle architecture spec: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`
- AST extraction spike report: `packages/qw-config/docs/extraction-comparison-report.md`
- Concrete AST output sample: `packages/qw-config/src/data/ezquake-variables-ast.json`
- Handover entry: `HANDOVER.md` "Phase 2: QW knowledge extraction"

## Purpose

Define the SQLite schema and loader interface that will store QW engine facts (cvars, commands, macros, cmdline-params) extracted from source across every version of every target codebase, with per-field change tracking and commit/PR provenance. The schema must make these Oracle queries cheap:

- "When did `cl_bob`'s default change?"
- "What changed in ezQuake 3.6.6?"
- "Has this cvar always behaved this way?"
- "Show me the impact of commit `abc123`."
- "Which cvars were removed in the 3.5 -> 3.6 transition?"

This spec is the foundation for Phase 2b (loader implementation), 2c (remaining ezQuake extractors), 2d (FTE), 2e (MVDSV + KTX), 2f (historical backfill), 2g (MCP tool upgrades), and 2h (automation).

## Design decisions summary

| Decision | Locked answer |
|---|---|
| Version unit | String. Per-project convention (tags for ezQuake/MVDSV/KTX, synthetic quarterly for FTE). |
| Version depth | All tags / synthetic versions back to project start, best-effort parse. |
| Entity table shape | Shared identity table + per-type version-state tables. |
| Change-event granularity | Field-level. One row per (entity, version transition, field). |
| Creation / deletion | Special change_kind values; full snapshot lives in version-state table. |
| PR enrichment | Staged. Commit info always; PR fields via later GitHub API pass. |
| Help-only entries | In `entities` table with `source_state='doc_only'`. |
| Canonical ID | `<project>:<type>:<name>`. Version-pinned form is query-time only. |
| Rename tracking | Nullable `predecessor_id` column. Manual annotation. |
| Storage location | `apps/qw-oracle/data/knowledge.db`. Gitignored. Alongside `qw.db`. |
| Loader language | TypeScript / Node. Inside `apps/qw-oracle/scripts/load-knowledge/`. |
| Loader stages | Load-version, diff, enrich. Each idempotent, separately rerunnable. |
| FTE version cadence | Upstream tag when available, monthly synthetic fallback. |
| Parse-partial policy | Hard fail on regression; soft warn on new-but-stable diagnostics; log-and-continue on third-party-header noise. |
| schema_meta keyspace | `schema_version`, `extractor_version`, `last_extraction_run_at`, `last_enrichment_run_at`, plus per-project `source_repo_commit` and `source_repo_tag`. |
| State audit trail | Append-only `source_state_transitions` table logs every `source_state` change. |

## 1. Version model

A version is a **string** with a per-project convention. The schema does not enforce the format. Each project's loader documents its convention in the loader code.

### Version conventions

| Project | Convention | Initial row count |
|---|---|---:|
| ezQuake | upstream git tags (`3.6.6`, `3.6.9`, ...) + synthetic `head` | ~32 |
| MVDSV | upstream git tags (`v0.35`, `1.11`, ...) + `head` | ~25 |
| KTX | upstream git tags (`v1.44`, `1.46`, ...) + `head` | ~14 |
| FTE | upstream tag when present (`2025-09-27`), monthly synthetic fallback (`2024-06`, `2024-07`, ...) + `head` | ~260 |

**Head pseudo-version.** Every extraction run updates the `head` row for each project to reflect current trunk state. The Oracle treats `head` as "latest development build". If a cvar is present only in `head` and not in any tag, that is accurate reporting - it was added post-last-release.

**Depth policy.** All versions back to project start, best-effort. Rows that fail clean extraction (old tags predating the current cvar declaration style) get marked `parse_state='partial'` and still ingest whatever was captured.

**FTE cadence specifics.** FTE upstream rarely tags (1 tag across 22 years of history). The loader generates synthetic monthly snapshots (`2008-01`, `2008-02`, ...) by picking the last commit of each calendar month. Real upstream tags slot in alongside synthetics; the `ordinal` column mixes both consistently. This gives ~260 rows for FTE versus ~32 for ezQuake, which is fine - SQLite scale tolerance is not the constraint.

**Parse-partial policy.** The `versions.parse_state='partial'` flag is the signal, not the gate. Loader behavior:

| Condition | Action |
|---|---|
| Previously-extracted version now produces zero entities (regression) | **Hard fail.** Abort the extraction run. Do not overwrite prior data. |
| Extractor reports new diagnostics but entity count is stable | Soft warn. Continue. Record diagnostic summary in `versions.notes`. |
| Third-party-header warnings (known benign, e.g., missing SDL2 headers in libclang) | Log-and-continue. Never raise. |
| Entity count drops below 50% of prior run without a regression-level zero | Warn loudly, set `parse_state='partial'`, continue; require `--force` to overwrite. |

### `versions` table

```sql
CREATE TABLE versions (
  id             INTEGER PRIMARY KEY,
  project        TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version        TEXT NOT NULL,
  commit_sha     TEXT NOT NULL,
  tag_date       TEXT,                    -- ISO 8601, NULL for `head`
  ordinal        INTEGER NOT NULL,        -- monotonic per project, for chronological joins
  parse_state    TEXT NOT NULL DEFAULT 'ok' CHECK (parse_state IN ('ok','partial')),
  notes          TEXT,
  extracted_at   TEXT NOT NULL,           -- ISO 8601
  UNIQUE (project, version)
);

CREATE UNIQUE INDEX idx_versions_ordinal ON versions(project, ordinal);
```

The `ordinal` column is a per-project monotonic integer. It lets "between versions" queries use integer comparison instead of string-sorting version strings (which is fragile when formats mix).

## 2. Entity + version-state tables

Shared identity in `entities`. Per-type state in `<type>_versions`. History and provenance reference `entity_id` from `entities`, so they work uniformly across all types.

### `entities` table (shared identity)

```sql
CREATE TABLE entities (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  type                  TEXT NOT NULL CHECK (type IN ('cvar','command','macro','cmdline_param')),
  name                  TEXT NOT NULL,                -- lowercased, [a-z0-9_.]+
  canonical_id          TEXT NOT NULL,                -- '<project>:<type>:<name>'
  first_seen_version    TEXT NOT NULL,                -- references versions.version (project-scoped)
  last_seen_version     TEXT NOT NULL,                -- references versions.version (project-scoped)
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities(id),   -- nullable; set manually on known renames
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);

CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
```

### `cvar_versions` table (per-version state for cvars)

Columns mirror the AST extractor's JSON output (see `packages/qw-config/src/data/ezquake-variables-ast.json`).

```sql
CREATE TABLE cvar_versions (
  entity_id               INTEGER NOT NULL REFERENCES entities(id),
  version                 TEXT NOT NULL,              -- references versions.version (project-scoped)

  -- From help_variables.json (may be populated even when source is absent)
  help_desc               TEXT,
  help_remarks            TEXT,
  help_values             TEXT,                       -- JSON array if enumerated
  help_group_id           TEXT,
  help_type               TEXT,                       -- 'float', 'integer', 'string', 'color', ...

  -- From source (AST extractor). NULL when source_state='doc_only'.
  default_value           TEXT,                       -- may be a macro name like BUILD_DATE
  flags_raw               TEXT,                       -- e.g. 'CVAR_AUTO|CVAR_SILENT'
  flag_names              TEXT,                       -- JSON array of individual flag names
  on_change               TEXT,                       -- callback function name
  min_bound               TEXT,                       -- rarely populated for ezQuake
  max_bound               TEXT,
  source_file             TEXT,
  source_line             INTEGER,
  source_column           INTEGER,
  storage_class           TEXT,                       -- 'static', 'extern', 'none'
  group_name_in_source    TEXT,                       -- source-verified group
  trailing_comment        TEXT,
  server_only             INTEGER NOT NULL DEFAULT 0, -- bool

  -- Parse hygiene
  raw_ast_hash            TEXT,                       -- detects parse drift across runs
  extracted_at            TEXT NOT NULL,

  PRIMARY KEY (entity_id, version)
);

CREATE INDEX idx_cvar_versions_source ON cvar_versions(source_file, source_line);
```

### `command_versions` table

Columns derived from `packages/qw-config/src/data/ezquake-commands.json` (523 entries: `desc`, `remarks`, `group-id`) plus AST-derived columns the Phase 2c extractor will populate via `Cmd_AddCommand` call-site walking.

```sql
CREATE TABLE command_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,

  -- From help / curated JSON
  help_desc        TEXT,
  help_remarks     TEXT,
  help_group_id    TEXT,                  -- e.g. 'config', 'action', 'debug'

  -- From AST (Cmd_AddCommand call-site extractor, Phase 2c)
  handler_fn       TEXT,                  -- C function name of the command handler
  source_file      TEXT,
  source_line      INTEGER,
  source_column    INTEGER,
  registration_file TEXT,                 -- file where Cmd_AddCommand is called (may differ from handler_fn's file)

  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,

  PRIMARY KEY (entity_id, version)
);
```

### `macro_versions` table

Columns derived from `packages/qw-config/src/data/ezquake-macros.json` (68 entries: `desc`, `type`, `teamplay-restricted`, `related-cvars`) plus AST additions.

Ezquake macros are registered via `Cmd_AddMacro(macro_id, handler_fn)` - the macro name lives in an enum id, and the handler function produces the string at runtime. So "body" is not statically extractable; what we capture is the handler function name and ezQuake's own type classification.

```sql
CREATE TABLE macro_versions (
  entity_id            INTEGER NOT NULL REFERENCES entities(id),
  version              TEXT NOT NULL,

  -- From help / curated JSON
  help_desc            TEXT,
  macro_type           TEXT,              -- 'integer', 'string', etc. (ezQuake's own typing)
  teamplay_restricted  INTEGER NOT NULL DEFAULT 0,   -- bool: registered via Cmd_AddMacroEx with teamplay=1
  related_cvars_json   TEXT,              -- JSON array of related cvar names

  -- From AST (Cmd_AddMacro[Ex] call-site extractor, Phase 2c)
  handler_fn           TEXT,              -- C function that returns the expansion at runtime
  source_file          TEXT,
  source_line          INTEGER,
  source_column        INTEGER,
  registration_file    TEXT,

  raw_ast_hash         TEXT,
  extracted_at         TEXT NOT NULL,

  PRIMARY KEY (entity_id, version)
);
```

### `cmdline_param_versions` table

Columns derived from `packages/qw-config/src/data/ezquake-cmdline-params.json` (71 entries: `desc`, `remarks`, `arguments`, `flags`, `systems`). AST extraction for cmdline params is harder - they are parsed via `COM_CheckParm("-foo")` scattered across source files. Phase 2c extractor will walk those call sites.

```sql
CREATE TABLE cmdline_param_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,

  -- From help / curated JSON
  help_desc        TEXT,
  help_remarks     TEXT,
  arguments        TEXT,                  -- expected argument shape, e.g. '<path>', '<integer>'
  flags_json       TEXT,                  -- JSON array, e.g. ['incomplete']
  systems_json     TEXT,                  -- JSON array, e.g. ['windows', 'linux']

  -- From AST (COM_CheckParm call-site extractor, Phase 2c)
  source_file      TEXT,                  -- file where COM_CheckParm("-foo") is called
  source_line      INTEGER,
  source_column    INTEGER,

  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,

  PRIMARY KEY (entity_id, version)
);
```

**Column-add migration posture.** Adding columns to any of these tables is an idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS`. If the Phase 2c extractors surface fields not anticipated here (e.g. conditional registration behind `#ifdef`), add columns via a v2 migration.

## 3. Change events (field-level)

One table. Every row is a single detected change between two versions of the same entity.

```sql
CREATE TABLE change_events (
  id                       INTEGER PRIMARY KEY,
  entity_id                INTEGER NOT NULL REFERENCES entities(id),

  -- Version transition
  from_version             TEXT,                  -- NULL only for creations
  to_version               TEXT NOT NULL,         -- always the version where the change lands
  change_kind              TEXT NOT NULL CHECK (change_kind IN ('created','modified','deleted')),
  field_name               TEXT NOT NULL DEFAULT '',  -- populated only when change_kind='modified'; empty string otherwise (avoids SQLite NULL-in-UNIQUE pitfall)
  old_value                TEXT,                  -- NULL for creations; NULL for deletions (last snapshot lives in <type>_versions at from_version)
  new_value                TEXT,                  -- NULL for deletions

  -- Git provenance (populated immediately by the diff stage)
  commit_sha               TEXT NOT NULL,
  commit_message_excerpt   TEXT,                  -- first 300 chars

  -- PR enrichment (populated by the later enrichment stage)
  pr_number                INTEGER,
  pr_title                 TEXT,
  pr_body_excerpt          TEXT,                  -- first 500 chars
  linked_issues_json       TEXT,                  -- JSON array of issue numbers
  enrichment_source        TEXT CHECK (enrichment_source IN ('git','github_api')),

  extracted_at             TEXT NOT NULL,

  UNIQUE (entity_id, to_version, field_name, change_kind)
);

CREATE INDEX idx_change_events_to_version    ON change_events(to_version);
CREATE INDEX idx_change_events_entity_field  ON change_events(entity_id, field_name);
CREATE INDEX idx_change_events_commit        ON change_events(commit_sha);
```

### Emission rules (loader contract)

**Creation.** When an entity appears for the first time at version V: emit one row with `change_kind='created'`, `from_version=NULL`, `to_version=V`, `field_name=''`. The full cvar state is in `cvar_versions`; the change event just marks the entrance.

**Modification.** When an entity exists in both V-1 and V but one or more fields differ: emit **one row per changed field**. `change_kind='modified'`, `field_name=<field>`, `old_value`+`new_value` populated. A single commit that touches multiple fields produces multiple rows sharing the same `commit_sha`.

**Deletion.** When an entity exists in V-1 but not V: emit one row with `change_kind='deleted'`, `from_version=V-1`, `to_version=V`, `field_name=''`. `old_value` and `new_value` are both NULL - the full prior state lives in `<type>_versions` at `from_version`. Combined with the source-state loader rules (Section 4), the `entities` row transitions to `source_retired`.

**Per-field coverage for modifications.** Every column in `cvar_versions` that is considered "substantive" is diffable. Substantive columns:

- `default_value`, `flags_raw`, `flag_names`, `on_change`, `min_bound`, `max_bound`
- `help_desc`, `help_remarks`, `help_values`, `help_type`
- `source_file` (moves get their own event - they matter for "view source" continuity)
- `server_only`, `group_name_in_source`, `trailing_comment`

**Non-diffable columns** (ignored by diff stage): `source_line`, `source_column`, `raw_ast_hash`, `extracted_at`. These move around on unrelated commits (refactors, formatting) and would flood the change log with noise.

### Example queries

```sql
-- What changed in ezQuake 3.6.6?
SELECT e.name, ce.field_name, ce.old_value, ce.new_value, ce.commit_sha, ce.pr_title
  FROM change_events ce
  JOIN entities e ON e.id = ce.entity_id
  WHERE e.project='ezquake' AND ce.to_version='3.6.6';

-- When did cl_bob's default change?
SELECT ce.from_version, ce.to_version, ce.old_value, ce.new_value, ce.commit_sha, ce.pr_title
  FROM change_events ce
  JOIN entities e ON e.id = ce.entity_id
  WHERE e.canonical_id='ezquake:cvar:cl_bob' AND ce.field_name='default_value'
  ORDER BY ce.id;

-- Every flag change in ezQuake history
SELECT e.name, ce.from_version, ce.to_version, ce.old_value, ce.new_value
  FROM change_events ce
  JOIN entities e ON e.id = ce.entity_id
  WHERE e.project='ezquake' AND ce.field_name='flag_names';

-- Impact of commit abc123
SELECT e.canonical_id, ce.change_kind, ce.field_name, ce.old_value, ce.new_value
  FROM change_events ce
  JOIN entities e ON e.id = ce.entity_id
  WHERE ce.commit_sha='abc123def';

-- Cvars removed in 3.6.0
SELECT e.canonical_id, ce.from_version, ce.commit_sha
  FROM change_events ce
  JOIN entities e ON e.id = ce.entity_id
  WHERE e.project='ezquake' AND ce.change_kind='deleted'
    AND ce.to_version='3.6.0';
```

### Volume expectations

After full historical backfill:

| Project | Estimated change_event rows |
|---|---:|
| ezQuake | ~5,000 |
| FTE | ~8,000 |
| MVDSV | ~3,000 |
| KTX | ~2,000 |
| **Total** | **~18,000** |

SQLite handles this trivially. Indexed queries return in milliseconds.

## 4. Source-state lifecycle

`entities.source_state` is a small discriminator tracking how verified each entity is. The loader maintains transitions deterministically.

| Value | Meaning | Transitions out |
|---|---|---|
| `source_backed` | Present in source at HEAD or a recent version | -> `source_retired` when the entity disappears from HEAD for one or more extraction runs |
| `source_retired` | Present in source at some past version, absent in HEAD | -> `source_backed` when HEAD re-adds (loader extends `last_seen_version`, emits a `change_kind='created'` event at `to_version='head'`) |
| `doc_only` | In `help_variables.json` (or equivalent) but no source match at any parsed version | -> `source_backed` when historical backfill eventually finds it in an older version |
| `dynamically_registered` | Manually annotated (runtime-registered cvars, user-defined variables, etc.) | No automatic transitions |

**Loader rules (handled naturally by the diff stage):**

1. **Initial observation.** A newly-observed entity found in source: `source_backed`. A new entity present only in help data with no source match at any loaded version: `doc_only`.
2. **Disappearance.** When `diff --from <prev> --to <next>` emits a deletion event for an entity, the loader flips `entities.source_state -> source_retired` in the same transaction.
3. **Re-addition.** When `diff` emits a creation event for an entity currently marked `source_retired`, the loader flips it back to `source_backed` and extends `last_seen_version` to the new version.
4. **Retroactive reclassification.** Historical backfill may turn up older source matches for an entity currently marked `doc_only`. On such match, the loader flips it to `source_backed` and sets `first_seen_version` to the earliest match. This is normal.
5. **Dynamic registration.** `dynamically_registered` is never set automatically. Manual `UPDATE` only.

**Every transition is logged.** Each of the five rules above writes an append-only row into `source_state_transitions` in the same transaction as the state change. The audit trail is cheap (one row per state change, same volume as change_events creation/deletion rows) and makes Oracle answers that cite state (`"this cvar was retired in 3.6.4 then re-added at head"`) point at durable provenance rather than inferred-from-current-state reasoning.

### `source_state_transitions` table

```sql
CREATE TABLE source_state_transitions (
  id                 INTEGER PRIMARY KEY,
  entity_id          INTEGER NOT NULL REFERENCES entities(id),
  from_state         TEXT NOT NULL,       -- source_backed | source_retired | doc_only | dynamically_registered | '' for initial
  to_state           TEXT NOT NULL,
  reason             TEXT NOT NULL CHECK (reason IN (
                       'initial_observation',
                       'removed_from_head',
                       're_added',
                       'backfill_match',
                       'manual_update'
                     )),
  version_context    TEXT,                -- the version at which the transition was detected
  extractor_run_id   TEXT NOT NULL,       -- ULID or UUID, correlates transitions from the same loader run
  created_at         TEXT NOT NULL
);

CREATE INDEX idx_sst_entity ON source_state_transitions(entity_id);
CREATE INDEX idx_sst_run    ON source_state_transitions(extractor_run_id);
```

Append-only by convention (no UPDATE or DELETE from loader code). Forms a complete history of how each entity's source_state evolved. Trivial to add more `reason` values in a migration if the loader learns new triggers.

## 5. Canonical IDs and rename handling

### Format

```
<project>:<type>:<name>[@<version>]
```

- `project`: `ezquake` | `fte` | `mvdsv` | `ktx`. Lowercase, no punctuation.
- `type`: `cvar` | `command` | `macro` | `cmdline_param`. Lowercase, singular.
- `name`: lowercase, `[a-z0-9_.]+`. Input uppercase gets normalized; anything else rejected by the loader with a warning.
- `version`: optional, presentation-time only.

### Storage rule

`entities.canonical_id` holds the **identity form** only: `ezquake:cvar:cl_bob`. The version-pinned form `ezquake:cvar:cl_bob@3.6.6` is built at query time by concatenating `canonical_id + '@' + version`. This keeps `entities` exactly one row per entity across its entire lifetime.

### Rename handling

`entities.predecessor_id` is a nullable FK to another `entities` row. When set, it signals "this entity is the post-rename successor of entity X". Automatic detection is unreliable (commit messages occasionally say "renamed X to Y" but this is rare and noisy). Phase 2a ships the column nullable and leaves rename annotation manual.

Example usage (hypothetical):

```sql
-- If cl_bob was renamed to cl_bobbing at 4.0:
UPDATE entities SET predecessor_id = (SELECT id FROM entities WHERE canonical_id='ezquake:cvar:cl_bob')
  WHERE canonical_id='ezquake:cvar:cl_bobbing';
```

### Cross-project linking

**Deliberately not in the schema.** `ezquake:cvar:cl_rollspeed` and `fte:cvar:cl_rollspeed` are separate entities at the Layer-1 level, even when they represent semantically related concepts. Any "ezQuake and FTE both have this, here's how they differ" narrative belongs in Layer 3 concept notes (per the Oracle design spec). This keeps the rigid layer rigid.

## 6. Storage layout

**Database file:** `apps/qw-oracle/data/knowledge.db`

- Gitignored, regenerable from extractor JSON + git blame + GitHub API.
- Lives alongside `apps/qw-oracle/data/qw.db` (the 1.1 GB chat corpus).
- Cross-file queries use SQLite's `ATTACH DATABASE` when the Oracle wants to join Layer 1 facts with Layer 2 chat sessions.
- Target size: 30-50 MB post-backfill. Small enough to ship standalone with Slipgate or distribute as a downloadable snapshot in the future. Phase 2a just keeps that door open.

**Schema versioning + meta.** A `schema_meta` key/value table records schema version plus operational metadata the loader and Oracle both care about. The loader checks `schema_version` on startup and runs idempotent migrations (`ALTER TABLE ADD COLUMN`, etc.) as needed.

```sql
CREATE TABLE schema_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
```

**Committed keyspace for Phase 2a:**

| Key | Value example | Written by |
|---|---|---|
| `schema_version` | `1` | migration code |
| `extractor_version` | `clang-ezquake-cvars@1.0.0` | `load-version` stage on every run |
| `last_extraction_run_at` | ISO 8601 UTC | `load-version` stage on successful completion |
| `last_enrichment_run_at` | ISO 8601 UTC | `enrich` stage on successful completion |
| `ezquake:source_repo_commit` | current git HEAD SHA | `load-version --project ezquake --version head` |
| `ezquake:source_repo_tag` | e.g. `3.6.9` or empty | same |
| `fte:source_repo_commit` | ... | per-project analogous keys |
| `fte:source_repo_tag` | ... |  |
| `mvdsv:source_repo_commit` / `mvdsv:source_repo_tag` | ... |  |
| `ktx:source_repo_commit` / `ktx:source_repo_tag` | ... |  |

New keys can be added without migration (the table is schemaless). When the loader adds a previously-unseen key, it just inserts. Readers (Oracle) must tolerate unknown keys.

Phase 2a ships at schema v1. v2+ migrations get designed when the table shape first breaks.

**Extractor-to-loader contract:** the JSON file at `packages/qw-config/src/data/<project>-<type>.json` is the contract. The loader reads it. Any extractor producing compatible JSON can be loaded, regardless of implementation language (Python libclang, tree-sitter, regex fallback, manually authored).

## 7. Loader interface

### Language: TypeScript / Node

Reasons:
- `apps/qw-oracle/` is already a Node project with `better-sqlite3` in scope.
- The loader reads JSON and writes SQL. Language-level affinity with the Python extractors is not required at the boundary.
- TypeScript types catch JSON-to-SQL mismatches at build time.

### File layout

```
apps/qw-oracle/scripts/load-knowledge/
  index.ts                  -- CLI entry point
  load-version.ts           -- stage 1: ingest one (project, version) JSON
  diff-versions.ts          -- stage 2: compute change events
  enrich-prs.ts             -- stage 3: GitHub API enrichment
  schema.ts                 -- migrations (v1 = initial)
  shared/
    types.ts                -- TS types mirroring extractor JSON shape
    db.ts                   -- better-sqlite3 connection + prepared statements
    natural-keys.ts         -- helpers for idempotent upserts
    git.ts                  -- git blame wrapper for commit_sha lookup
    github.ts               -- GitHub API client with rate-limit budget tracking
```

### Three stages

Each idempotent, separately rerunnable. The loader commits to the following CLI surface:

**1. Load version** - ingest a single (project, version) pair's JSON into `entities` + `<type>_versions`.

```
load-knowledge load-version \
  --project ezquake \
  --version 3.6.6 \
  --type cvar \
  --json packages/qw-config/src/data/ezquake-variables-ast.json
```

Behavior:
- Generate a `extractor_run_id` (ULID) that scopes every write in this invocation.
- Apply parse-partial policy (see Section 1):
  - If the input JSON has zero entities but a prior run populated `<type>_versions` rows for this (project, version) pair: hard fail. Do not overwrite.
  - If entity count dropped below 50% of the previous run without going to zero: warn, set `versions.parse_state='partial'`, require `--force` to overwrite.
  - Otherwise: continue.
- Read JSON. For each entity record: upsert `entities` row (natural key `project, type, name`) and upsert `<type>_versions` row (natural key `entity_id, version`).
- On `entities` creation: emit `source_state_transitions` row with `from_state=''`, `to_state='source_backed'` (or `doc_only` if help-only), `reason='initial_observation'`.
- On `entities` update that retroactively reclassifies from `doc_only` -> `source_backed`: emit a transition row with `reason='backfill_match'`.
- Update `entities.last_seen_version` if this version is more recent (by ordinal) than the existing value.
- Set `entities.first_seen_version` on creation; never update after unless a historical backfill finds an earlier match (in which case extend the transition log too).
- Write `schema_meta` keys: `last_extraction_run_at`, `<project>:source_repo_commit`, `<project>:source_repo_tag`, `extractor_version`.
- Emits no change events. Use `diff` for that.
- `INSERT OR REPLACE` on entity/version upserts. Safe to re-run.

**2. Diff** - compute change events between two already-loaded versions.

```
load-knowledge diff \
  --project ezquake \
  --from 3.6.5 \
  --to 3.6.6
```

Behavior:
- Generate a new `extractor_run_id` scoping every write.
- Read `<type>_versions` rows for both versions. Walk them in parallel by `entity_id`.
- For entities present in both: compare each substantive field. Emit one `change_events` row per differing field with `change_kind='modified'`, populated `old_value`/`new_value`.
- For entities only in `to`: emit one `change_events` row with `change_kind='created'`.
  - If the entity is currently `source_retired`, flip to `source_backed`, extend `last_seen_version` to `to`, and write a `source_state_transitions` row with `reason='re_added'`.
- For entities only in `from`: emit one `change_events` row with `change_kind='deleted'`, flip `entities.source_state` to `source_retired`, and write a `source_state_transitions` row with `reason='removed_from_head'`.
- Git blame the introducing commit for each modification, populate `commit_sha` and `commit_message_excerpt`. `enrichment_source='git'`.
- Idempotent via natural key `(entity_id, to_version, field_name, change_kind)`.

**3. Enrich** - populate PR metadata on existing change_events rows.

```
load-knowledge enrich \
  --project ezquake \
  --github-token $GITHUB_TOKEN \
  [--limit 100]
```

Behavior:
- Query `change_events` rows where `enrichment_source='git'` AND `pr_number IS NULL`, group by `commit_sha`.
- For each unique commit, call GitHub API (`GET /repos/{owner}/{repo}/commits/{sha}/pulls`) to find the PR.
- Parse PR number, title, body (first 500 chars), linked issues from the PR body/description.
- Update all change_events rows sharing the commit SHA in one transaction.
- Mark `enrichment_source='github_api'` on completion.
- **Token required.** GitHub REST API rate limits: 60 requests/hour unauthenticated (unusable for backfill), 5000/hour with a personal access token. The loader refuses to proceed without `--github-token` or the `GITHUB_TOKEN` environment variable.
- Tracks remaining budget from response headers, pauses when within 10% of zero.
- Idempotent. Safe to re-run.

**All-at-once wrapper** for backfill:

```
load-knowledge full --project ezquake
```

Runs `load-version` for every known version -> `diff` between adjacent ordinal pairs -> `enrich`. The intended backfill entry point for Phase 2f.

### Natural keys (idempotency contract)

| Table | Natural key |
|---|---|
| `versions` | `(project, version)` |
| `entities` | `(project, type, name)` |
| `cvar_versions` / `command_versions` / etc. | `(entity_id, version)` |
| `change_events` | `(entity_id, to_version, field_name, change_kind)` |

`INSERT OR REPLACE` on these keys keeps all stages safely idempotent.

## 8. Indexing strategy

Narrow and boring. Every index listed earns its place on a specific query pattern:

```sql
-- Lookup by canonical id (Oracle primary access)
CREATE UNIQUE INDEX idx_entities_canonical_id ON entities(canonical_id);

-- Lookup by (project, type, name)
CREATE UNIQUE INDEX idx_entities_natural_key ON entities(project, type, name);

-- Fuzzy lookup by bare name
CREATE INDEX idx_entities_name ON entities(name);

-- List all entities of a type in a project
CREATE INDEX idx_entities_type ON entities(project, type);

-- Chronological ordering
CREATE UNIQUE INDEX idx_versions_ordinal ON versions(project, ordinal);

-- Version-state lookups
-- (primary key already covers (entity_id, version))

-- Cvar source lookups
CREATE INDEX idx_cvar_versions_source ON cvar_versions(source_file, source_line);

-- Change event queries
CREATE INDEX idx_change_events_to_version   ON change_events(to_version);
CREATE INDEX idx_change_events_entity_field ON change_events(entity_id, field_name);
CREATE INDEX idx_change_events_commit       ON change_events(commit_sha);
```

No FTS5 indexes in Phase 2a. If Oracle MCP tools need full-text search over `help_desc`, `trailing_comment`, or `pr_body_excerpt`, that is an additive layer when search quality demands it. Captured in the deferred list.

## 9. Out of scope for Phase 2a

Explicitly captured, deliberately deferred:

- **Running the historical backfill.** Phase 2f. Spec defines the pipeline shape; Phase 2f executes it.
- **ezQuake command / macro / cmdline-param extractors.** Phase 2c. The schema fully defines the target tables; the extractor code itself does not exist yet.
- **FTE/MVDSV/KTX extractors.** Phases 2d, 2e.
- **Auto-detection of renames** from commit messages. `predecessor_id` stays nullable; manual annotation only.
- **Cross-project entity linking** ("both ezQuake and FTE have cl_rollspeed"). Layer 3 concept notes territory.
- **FTS5 or vector search** over text fields. Additive layer post-Phase-2a.
- **MCP tool upgrades** to consume version history (`get_entity_history`, `version` param on `lookup_entity`). Phase 2g.
- **Slipgate refactor** to consume the SQL store instead of JSON. User-deferred; separate track.
- **Schema migration catalog beyond v1.** Written when v2 breaks compatibility.

## 10. Next steps

1. User reviews this spec. Approve, revise, or reject.
2. On approval: invoke `superpowers:writing-plans` against this spec to produce the Phase 2b implementation plan.
3. Phase 2b execution in a separate session - build the loader, prove schema end-to-end against one ezQuake version, hand-verify queries.
4. Phase 2c-2h proceed per the HANDOVER.md Phase 2 plan.
