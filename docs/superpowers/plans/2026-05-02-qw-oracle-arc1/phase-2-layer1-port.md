# Phase 2 - Layer 1 port

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Port the entire Layer 1 schema (31 tables) and the entire `scripts/load-knowledge/` loader from SQLite + better-sqlite3 to Postgres + pgvector + tsvector + postgres-js, then re-populate Postgres from extractor JSON so the per-project entity counts match the pre-port SQLite baseline.

The schema port is generated, not hand-typed - a one-shot generator reads `apps/qw-oracle/scripts/load-knowledge/schema.ts` (the SQLite source-of-truth) and emits Postgres-dialect migration SQL (D3). The loader port is mechanical but extensive: ~40 files, every `db.prepare(...)` call site converted to a postgres-js template literal, every `db.transaction(() => ...)` wrapper converted to `db.begin(async (tx) => ...)`. The phase also adds the embedding + tsvector columns on `entities` (per architecture spec) and a derivation step that populates `entities.description` from the per-version tables (D6, F7) so lexical and vector indexes have content.

Runnable state at phase boundary: a fresh Postgres dev container loaded with every committed extractor tag, 31 tables holding the same row counts as the pre-port SQLite snapshot (within idempotency tolerance), `bun test` green, `bunx tsc --noEmit` green, no residual `better-sqlite3` imports under `apps/qw-oracle/scripts/load-knowledge/`.

## Inputs from previous phase

Phase 1 (Foundation) complete:
- Postgres dev container running at `127.0.0.1:5432`, image `pgvector/pgvector:pg16`.
- Migrator (`bun db/migrate.ts`) applies `.sql` files from `db/migrations/` in lexical order, tracking applied migrations in a `schema_migrations` (filename, applied_at, sha256) table.
- `db/migrations/001_extensions_and_meta.sql` already landed: enables `pgvector`; creates `oracle_meta` (key, value) for the SQLite-equivalent metadata that load-version.ts writes (`schema_version`, `last_extraction_run_at`, etc.); does NOT create any Layer 1 tables.
- Two databases exist on the same container: `qw_oracle_dev` (working DB) and `qw_oracle_test` (test DB). Both have extensions enabled.
- `package.json` carries `postgres` (postgres-js) as a runtime dep; `tsx` already removed; `bun` is the runtime for everything.
- `apps/qw-oracle/db/` directory exists with `migrate.ts` + `migrations/` subdir.

If any of these is missing, stop and resolve at Phase 1 before proceeding.

## Files touched

### Created

```
apps/qw-oracle/scripts/generate-pg-migration.ts        # one-shot generator (D3); throwaway after migration ships
apps/qw-oracle/db/migrations/002_layer1_schema.sql     # generated; emitted by generate-pg-migration.ts
apps/qw-oracle/db/migrations/003_layer1_entities_search.sql  # entities embedding + tsvector columns + indexes (architecture spec)
apps/qw-oracle/scripts/load-knowledge/constants.ts     # F16 home for HEAD_ORDINAL + INFO_KEY_SCOPES + LOG_TEMPLATE_CHANNELS + SCHEMA_VERSION
apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts  # D6 derivation per-type
```

### Modified

```
apps/qw-oracle/package.json                            # drop better-sqlite3 + @types/better-sqlite3; bun scripts only
apps/qw-oracle/scripts/load-knowledge/db.ts            # postgres-js Sql singleton, no schema apply
apps/qw-oracle/scripts/load-knowledge/natural-keys.ts  # postgres-js upserts; tx parameter on every helper
apps/qw-oracle/scripts/load-knowledge/transitions.ts   # logTransition takes tx
apps/qw-oracle/scripts/load-knowledge/load-version.ts  # async; tx-scoped; calls derive step at end
apps/qw-oracle/scripts/load-knowledge/load-cvars.ts                # adapter port
apps/qw-oracle/scripts/load-knowledge/load-commands.ts             # adapter port
apps/qw-oracle/scripts/load-knowledge/load-macros.ts               # adapter port
apps/qw-oracle/scripts/load-knowledge/load-cmdline-params.ts       # adapter port
apps/qw-oracle/scripts/load-knowledge/load-keynames.ts             # adapter port
apps/qw-oracle/scripts/load-knowledge/load-hud-elements.ts         # adapter port
apps/qw-oracle/scripts/load-knowledge/load-rulesets.ts             # adapter port
apps/qw-oracle/scripts/load-knowledge/load-token-primitives.ts     # adapter port
apps/qw-oracle/scripts/load-knowledge/load-asset-categories.ts     # adapter port
apps/qw-oracle/scripts/load-knowledge/load-flag-bits.ts            # adapter port
apps/qw-oracle/scripts/load-knowledge/load-cvar-aliases.ts         # adapter port
apps/qw-oracle/scripts/load-knowledge/load-protocol-messages.ts    # adapter port
apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts            # adapter port
apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts        # adapter port
apps/qw-oracle/scripts/load-knowledge/load-qc-builtins.ts          # adapter port
apps/qw-oracle/scripts/load-knowledge/load-assets.ts               # asset_extensions/path_rules/cvar_bindings/loader_sites; relation FK on canonical_id (D1 implication)
apps/qw-oracle/scripts/load-knowledge/load-maps.ts                 # qw namespace; flat table
apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts             # qw namespace; gameplay_sources + entity_defs + mechanics
apps/qw-oracle/scripts/load-knowledge/load-release-notes.ts        # release_notes
apps/qw-oracle/scripts/load-knowledge/diff-versions.ts             # heaviest port: bulk SELECTs as ANY($1::text[]) via Map preload
apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts            # uses SCHEMA_VERSION constant; reads from Postgres
apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts        # asset bundle pre-loader for load-assets
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts               # orchestrator: extract -> load -> diff -> enrich; uses HEAD_ORDINAL
apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts                # GH PR enrichment of change_events
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts              # probe runner; uses HEAD_ORDINAL; reads many tables
apps/qw-oracle/scripts/load-knowledge/prune-cross-type-orphans.ts  # cross-type help-JSON orphan prune
apps/qw-oracle/scripts/load-knowledge/backfill-version-bookkeeping.ts  # one-off backfill helper; verify still needed in PG before porting
apps/qw-oracle/scripts/load-knowledge/index.ts                     # CLI dispatcher; uses HEAD_ORDINAL via constants module
apps/qw-oracle/scripts/load-knowledge/types.ts                     # drop better-sqlite3 type imports; Database.Database -> postgres.Sql
apps/qw-oracle/scripts/load-knowledge/git.ts                       # no DB; verify it stays unchanged
apps/qw-oracle/scripts/load-knowledge/github.ts                    # no DB; verify it stays unchanged
apps/qw-oracle/scripts/load-knowledge/load-maps.test.ts            # rewrite per D13: bun:test + qw_oracle_test DB
apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts         # rewrite per D13
apps/qw-oracle/scripts/load-knowledge/review/index.ts              # review CLI; reads many tables
apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts                       # adapter port
apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts       # adapter port
apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts  # rewrite per D13
apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts          # adapter port
apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts   # adapter port
apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts     # adapter port
apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts         # adapter port
apps/qw-oracle/scripts/load-knowledge/CLAUDE.md        # remove "better-sqlite3" mention; reference postgres-js
```

### Deleted

```
apps/qw-oracle/scripts/load-knowledge/schema.ts        # migrator owns schema; runtime constants moved to constants.ts (F16)
apps/qw-oracle/data/knowledge.db                       # SQLite Layer 1 store retired; gitignored already, just delete the file
```

The legacy SQLite chat store (`apps/qw-oracle/scripts/db.mjs`, `apps/qw-oracle/scripts/import-discord.mjs`, `apps/qw-oracle/scripts/import-irc.mjs`, `apps/qw-oracle/scripts/stats.mjs`, `apps/qw-oracle/data/qw.db`) is Phase 3 territory; do NOT delete here. The MCP server's better-sqlite3 deps in `apps/qw-oracle/serve/mcp/` are Phase 6 territory.

## Tasks

### Task 1: Relocate runtime constants out of schema.ts (F16)

**Goal:** Move the four runtime constants currently exported from `schema.ts` into a new `constants.ts` module so they survive `schema.ts`'s deletion in Task 14.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/constants.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/db.ts` (drop `applySchema` import)
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts` (import HEAD_ORDINAL from `./constants.js`)
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (import HEAD_ORDINAL from `./constants.js`)
- Modify: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts` (import SCHEMA_VERSION from `./constants.js`)
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts` (import INFO_KEY_SCOPES + LOG_TEMPLATE_CHANNELS from `./constants.js`)

**Steps:**
- [ ] Create `constants.ts` containing exactly four `export const` declarations: `SCHEMA_VERSION = 18`, `HEAD_ORDINAL = 999999`, `INFO_KEY_SCOPES = ['userinfo', 'serverinfo', 'localinfo'] as const`, `LOG_TEMPLATE_CHANNELS = ['broadcast', 'client', 'console', 'system'] as const`. No SQL, no migration code, no Database type imports. Header comment names this as the home for runtime constants that schema.ts used to export.
- [ ] In each of the five consumer files above, replace `import ... from './schema.js'` (constant imports only) with `import ... from './constants.js'`.
- [ ] Run `grep -rn "from './schema'" apps/qw-oracle/scripts/load-knowledge/` and confirm only test files (`load-maps.test.ts`, `quality-grid.test.ts`) still import from `./schema.js` (those are handled in Task 11; `applySchema` is the only export they need, and it goes away with the file deletion).

**Verification:**
- `bunx tsc --noEmit` from `apps/qw-oracle/` exits 0.
- `grep -c "HEAD_ORDINAL\|INFO_KEY_SCOPES\|LOG_TEMPLATE_CHANNELS\|SCHEMA_VERSION" apps/qw-oracle/scripts/load-knowledge/constants.ts` returns 4.

### Task 2: Write the schema generator (D3)

**Goal:** Build a one-shot Bun script that reads `schema.ts` and emits Postgres-dialect SQL covering all 31 Layer 1 tables.

**Files:**
- Create: `apps/qw-oracle/scripts/generate-pg-migration.ts`

**Steps:**
- [ ] Create `generate-pg-migration.ts` with `if (import.meta.main)` guard at the bottom (Bun-only; D2 makes this safe).
- [ ] Approach: read `schema.ts` as text, extract the SQL string blocks (`SCHEMA_V1_SQL`, `SCHEMA_V2_ADDITIONS_SQL`, `SCHEMA_V3_ADDITIONS_SQL`, `SCHEMA_V4_ADDITIONS_SQL`, `SCHEMA_V5_ADDITIONS_SQL`, `SCHEMA_V6_ADDITIONS_SQL`, `SCHEMA_V12_ADDITIONS_SQL`, `SCHEMA_V13_ADDITIONS_SQL`, `SCHEMA_V14_ADDITIONS_SQL`, `SCHEMA_V15_ADDITIONS_SQL`) - skip the `_V*_MIGRATION_SQL` rebuild blocks (they describe SQLite-only CHECK widening that has no Postgres analogue; the generator emits the final widened shape directly). Concatenate, then transform per the dialect rules below.
- [ ] Dialect transformations the generator applies:
  - `INTEGER PRIMARY KEY` (auto-increment in SQLite) -> `BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY` (preserves the integer-PK contract; D1).
  - `INTEGER NOT NULL DEFAULT 0` on boolean-shaped columns (`server_only`, `teamplay_restricted`, `dev_only`, `source_verified`, `restrict_*`) -> `BOOLEAN NOT NULL DEFAULT FALSE`. The generator hard-codes the column-name allowlist for boolean coercion; everything else stays INTEGER.
  - `TEXT` storing JSON (`flag_names`, `*_json`, `worldspawn_json`, `class_counts_json`, etc.) -> `JSONB`. The generator hard-codes the suffix rule: any column whose name ends in `_json` is rewritten to JSONB.
  - `TEXT NOT NULL` storing ISO timestamps (`extracted_at`, `created_at`, `updated_at`, `tag_date`) -> `TIMESTAMPTZ`. Hard-coded column-name allowlist.
  - `IF NOT EXISTS` on CREATE TABLE / CREATE INDEX preserved (idempotent migration is safer; D14).
  - SQLite `CREATE INDEX` lines pass through unchanged (Postgres syntax matches).
  - SQLite-only constructs the generator must drop or rewrite: `PRAGMA` statements (none present in the SQL blocks; sanity-check this); `ROWID` references (none present); `WITHOUT ROWID` (none present).
  - The `entities.predecessor_id INTEGER REFERENCES entities(id)` self-FK works as-is in Postgres.
  - The asset-relation tables FK to `entities(canonical_id)` (text PK on the unique constraint) - this works in Postgres because the SQLite UNIQUE constraint becomes a Postgres UNIQUE constraint, which is referenceable as an FK target. Verify the generator does not strip these FKs (D1 implication: two FK conventions coexist).
- [ ] Generator does NOT emit the embedding / tsvector additions on `entities` - those land in migration `003_layer1_entities_search.sql`, written by hand in Task 4 because they are not present in `schema.ts`. The generator only emits the structural port.
- [ ] Generator emits the schema as a single file: `db/migrations/002_layer1_schema.sql`. File header comment names that the file is generator-emitted and edits are forbidden post-ship; future schema evolution happens in append-only `.sql` migrations.
- [ ] Generator output ordering: tables are emitted in dependency order so that `versions` and `entities` come first, then per-version tables (which FK on `entities.id`), then asset relation tables (which FK on `entities.canonical_id`), then qw-namespace tables (independent), then change-tracking / audit tables. The generator hard-codes this ordering; it does not infer FK dependencies from the SQL.
- [ ] Add `package.json` script: `"generate-pg-migration": "bun scripts/generate-pg-migration.ts"`.

**Verification:**
- `bun scripts/generate-pg-migration.ts > /tmp/pg-migration-out.sql` exits 0.
- `grep -c "^CREATE TABLE" /tmp/pg-migration-out.sql` returns 31.
- The 31 emitted CREATE TABLE statements match this inventory (alphabetical for diff stability):
  ```
  asset_category_versions, asset_cvar_bindings, asset_extensions,
  asset_loader_sites, asset_path_rules, change_events,
  cmdline_param_versions, command_versions, cvar_alias_versions,
  cvar_versions, entities, flag_bit_versions, gameplay_entity_defs,
  gameplay_mechanics, gameplay_sources, hud_element_versions,
  info_key_versions, keyname_versions, log_template_versions,
  macro_versions, maps, protocol_message_versions, qc_builtin_versions,
  release_notes, relation_changes, ruleset_versions, source_overrides,
  source_state_transitions, token_primitive_versions, versions
  ```
  That is 30 tables; the 31st is `oracle_meta` from Phase 1's migration 001. Total at end of Phase 2 is 31 - confirm by listing in the verification step at phase boundary.
- Spot-check: `grep "CHECK (project IN" /tmp/pg-migration-out.sql | sort -u` returns exactly one form (`CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl'))`), proving the generator collapsed the SQLite CHECK-widening migrations into the final widened shape.
- Spot-check: `grep "CHECK (type IN" /tmp/pg-migration-out.sql` returns the full 15-value list (cvar/command/macro/cmdline_param/keyname/hud_element/ruleset/token_primitive/asset_category/flag_bit/cvar_alias/protocol_message/info_key/log_template/qc_builtin) - this is `entities.type` and resolves F2.

### Task 3: Run the generator, review output, commit migration file

**Goal:** Land `db/migrations/002_layer1_schema.sql` in the repo under operator review.

**Files:**
- Create: `apps/qw-oracle/db/migrations/002_layer1_schema.sql` (generator output)

**Steps:**
- [ ] Run `bun scripts/generate-pg-migration.ts > db/migrations/002_layer1_schema.sql`.
- [ ] Review the file end-to-end. Specifically eyeball: the entities CHECKs (project + type + source_state); the change_events `UNIQUE (entity_id, to_version, field_name, change_kind)` constraint (F6 - this is the diff pipeline's idempotency guarantee, and the legacy plan dropped it); the asset relation tables' FKs on `entities(canonical_id)` (D1); every `*_versions` table's `PRIMARY KEY (entity_id, version)` and FK to `entities(id)` (D1).
- [ ] Walk every CHECK constraint in the file and confirm the enum values exactly match `schema.ts`. F2 is the named risk; the resolution is mechanical generation, but eyeball verification is the safety net before sub-agent verification.
- [ ] Run `bun db/migrate.ts` against `qw_oracle_dev`. Expected: migration applied, `schema_migrations` row appended.
- [ ] Run the same migrator against `qw_oracle_test`. Expected: same result.
- [ ] If migration fails, do NOT edit the .sql file directly - fix the generator and re-emit. The .sql file is treated as build output until ship.

**Verification:**
- `psql qw_oracle_dev -c "\dt" | wc -l` returns 32 or more (header lines + at least 31 table rows; `oracle_meta` from Phase 1 plus the 30 emitted here equals 31).
- `psql qw_oracle_dev -c "SELECT count(*) FROM schema_migrations"` returns >= 2 (001 + 002).

### Task 4: Add embedding + tsvector columns on entities

**Goal:** Land migration `003_layer1_entities_search.sql` adding the embedding columns, the staleness flag, the description column, the tsvector generated column, and the HNSW + GIN indexes for `search_entities` hybrid retrieval (Phase 6).

**Files:**
- Create: `apps/qw-oracle/db/migrations/003_layer1_entities_search.sql`

**Steps:**
- [ ] Write `003_layer1_entities_search.sql` by hand (not generator-emitted; the additions are not in `schema.ts`). The migration adds, in order:
  ```
  ALTER TABLE entities ADD COLUMN description TEXT;
  ALTER TABLE entities ADD COLUMN description_embedding vector(1024);
  ALTER TABLE entities ADD COLUMN description_embedding_sha256 TEXT;
  ALTER TABLE entities ADD COLUMN description_embedding_stale BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE entities ADD COLUMN description_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED;
  CREATE INDEX entities_desc_tsv_gin ON entities USING GIN (description_tsv);
  CREATE INDEX entities_desc_embedding_hnsw ON entities USING hnsw (description_embedding vector_cosine_ops);
  ```
- [ ] tsvector config is `'english'` (D7 implication: Layer 1 entity descriptions are curated English content).
- [ ] HNSW build parameters use Postgres defaults; tuning is deferred to Phase 5 / Phase 8 calibration.
- [ ] Run `bun db/migrate.ts` against `qw_oracle_dev` and `qw_oracle_test`. Both should succeed; the HNSW index on an empty column is instantaneous.

**Verification:**
- `psql qw_oracle_dev -c "\d entities"` shows the four new columns plus `description_tsv` (GENERATED).
- `psql qw_oracle_dev -c "\di entities_desc*"` returns two indexes (`entities_desc_tsv_gin`, `entities_desc_embedding_hnsw`).

### Task 5: Per-table column-list diff against SQLite (F4 resolution)

**Goal:** Every `_versions` table's column list in Postgres exactly matches the SQLite shape from `schema.ts`. This is the verification step that resolves F4 (legacy plan's column-list inventions).

**Files:**
- (none - operator-run verification, no files modified)

**Steps:**
- [ ] For each of the 30 generator-emitted tables, print the Postgres column list and the SQLite column list side by side. Use:
  ```
  psql qw_oracle_dev -c "\d <table>"
  sqlite3 apps/qw-oracle/data/knowledge.db ".schema <table>"
  ```
- [ ] Diff visually. Expected differences (acceptable):
  - INTEGER PK columns now `BIGINT GENERATED BY DEFAULT AS IDENTITY`.
  - Boolean-shaped columns now `BOOLEAN`.
  - `*_json` columns now `JSONB`.
  - Timestamp columns now `TIMESTAMPTZ`.
  - Tables that received an `IF NOT EXISTS` may show in `\d` but not in SQLite `.schema` if they were never created in SQLite (none should be in this case).
- [ ] Anything else is a bug in the generator. Stop and fix the generator + regenerate before continuing.

**Verification:**
- Operator manually compared all 30 tables, confirmed only the documented dialect differences.
- PASS condition: zero column-list discrepancies after generator fixes.
- FAIL condition: any column missing, any extra column, any constraint mismatch.

### Task 6: Port the loader DB wrapper (db.ts)

**Goal:** Replace the better-sqlite3 connection helper with a postgres-js singleton.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/db.ts`

**Steps:**
- [ ] Rewrite `db.ts` to export a postgres-js `Sql` singleton. Connection URL from `DATABASE_URL` env var; default to `postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle_dev` for local dev (the credentials Phase 1 set up). Bun's `process.env.DATABASE_URL` works directly.
- [ ] Drop the `applySchema(db)` call - the migrator owns schema now (D3 implication).
- [ ] Drop the `mkdirSync` for the data directory - Postgres has its own data path.
- [ ] Drop the `pragma` calls (SQLite-only).
- [ ] Export the singleton as `sql` (lowercase, postgres-js convention) plus a `closeSql()` helper for test teardown.
- [ ] Old function name `openKnowledgeDb` can be removed entirely; consumers will be re-pointed in subsequent tasks.

**Verification:**
- `bunx tsc --noEmit` from `apps/qw-oracle/` exits 0 (some consumers will still fail to compile until later tasks port them - that is expected mid-phase, not a phase boundary failure).

### Task 7: Port natural-keys.ts (idempotent upserts)

**Goal:** Convert the central upsert helpers (`upsertVersion`, `upsertEntity`, `upsertSourceOverride`, `extendFirstSeenVersion`, `setEntitySourceState`, plus every `upsert*Row` and the relation-table upserts) to postgres-js template literals operating on a transaction handle.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`

**Steps:**
- [ ] Replace `import type Database from 'better-sqlite3'` with `import type postgres from 'postgres'`. Every helper signature gains `tx: postgres.TransactionSql` (the type postgres-js gives inside `sql.begin`) as its first parameter, replacing `db: Database.Database`.
- [ ] Convert each helper's body. SQLite `INSERT ... ON CONFLICT(<keys>) DO UPDATE SET ... RETURNING id` maps to postgres-js: `await tx<{id:number}[]>` template literal returning the same shape.
- [ ] `upsertEntity` is the load-bearing helper - it carries the source_state transition logic. Two postgres-js queries: a SELECT for the existing row, then an INSERT ... ON CONFLICT DO UPDATE. The transition logic stays in the call site (`load-version.ts`); helper just upserts and returns `{id, isNew, prevSourceState}`.
- [ ] `extendFirstSeenVersion` and `setEntitySourceState` become single UPDATE queries.
- [ ] Every `upsert*Row` helper for a per-version table maps to the same shape: INSERT ... ON CONFLICT (entity_id, version) DO UPDATE SET <every-non-key-column> = EXCLUDED.<column>.
- [ ] Asset relation upserts (`upsertAssetExtension`, etc.) use ON CONFLICT on the table's UNIQUE tuple.
- [ ] All helpers are now `async` and return `Promise<...>`. Callers in load-version.ts will be ported in Task 8.

**Verification:**
- File compiles standalone (its imports are types only).
- Cross-check: `grep -c "tx<" natural-keys.ts` matches the number of helpers that issue queries (should be ~25 - one per `*_versions` table plus the seven helpers).

### Task 8: Port load-version.ts + transitions.ts + prune-cross-type-orphans.ts

**Goal:** The orchestrator that ingests one (project, version, type) triple. Most-complex single-file port in the phase.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/transitions.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/prune-cross-type-orphans.ts`

**Steps:**
- [ ] Convert `loadVersion` to `async function loadVersion(...): Promise<LoadVersionResult>`. The outer `db.transaction(() => ...)` becomes `await sql.begin(async (tx) => { ... })`.
- [ ] Replace the `import Database from 'better-sqlite3'` with `import type postgres from 'postgres'`. The `LoadVersionOptions.db` field becomes `sql: postgres.Sql` - or rename to `LoadVersionOptions.sql`.
- [ ] Every `db.prepare(...).run/get/all` call inside the function becomes a `tx<Row[]>` template literal awaited.
- [ ] The drop-guard SELECT at the top, the stale-row SELECT, the stale DELETE loop, the `setMeta` writes, the post-load count SELECT, and the per-version state-transition scan - all become awaited tx queries. Preserve the regression-guard semantics (`PARTIAL_DROP_GUARD_RATIO = 0.5`, the abort-without-force guard, and the `parse_state = 'partial'` annotation).
- [ ] The setMeta calls write to `oracle_meta` (Phase 1 migration), not `schema_meta`. Update keys: `last_extraction_run_at`, `extractor_version`, `<project>:source_repo_commit`, `<project>:source_repo_tag`. Schema is still (key, value), but the table name is different.
- [ ] At the very end of the txn block (before the return), call `await deriveEntityDescriptionsForVersion(tx, project, type, version)` - the new helper from Task 10. Comment names this as the D6 hook.
- [ ] `transitions.ts`: convert `logTransition` to async with a tx parameter. It is a single INSERT.
- [ ] `prune-cross-type-orphans.ts`: convert to async; uses tx parameter; same rationale as load-version (txn-scoped).
- [ ] Update the `INFO_KEY_NAME_RE` and `LOG_TEMPLATE_NAME_RE` imports to come from `./constants.js` (Task 1 already moved the source arrays).

**Verification:**
- `bunx tsc --noEmit` exits 0 once Tasks 7 + 8 are both done.
- Spot-check: `grep -c "tx<" load-version.ts` returns >= 7 (one per typed query: drop-guard SELECT, stale-row SELECT, stale DELETE, setMeta, transition scan, retirement check, backfill check, post-load count).

### Task 9: Port the 19 adapter files (15 per-type + 4 namespace/relation)

**Goal:** Every `load-<type>.ts` adapter writes its row via the postgres-js helper from natural-keys.ts. Mechanical port. The 15 per-type-with-version-arc adapters share the buildRow/upsertRow shape consumed by load-version.ts's ADAPTERS table; the four namespace/relation adapters (maps, gameplay, assets, release-notes) have their own shapes.

**Files:**
- Modify (15 per-type-with-version-arc adapters): `load-cvars.ts`, `load-commands.ts`, `load-macros.ts`, `load-cmdline-params.ts`, `load-keynames.ts`, `load-hud-elements.ts`, `load-rulesets.ts`, `load-token-primitives.ts`, `load-asset-categories.ts`, `load-flag-bits.ts`, `load-cvar-aliases.ts`, `load-protocol-messages.ts`, `load-info-keys.ts`, `load-log-templates.ts`, `load-qc-builtins.ts`
- Modify (qw namespace): `load-maps.ts`, `load-gameplay.ts`
- Modify (relation tables): `load-assets.ts`, `load-release-notes.ts`

**Steps for each adapter:**
- [ ] Drop the `import Database from 'better-sqlite3'` line.
- [ ] Each adapter exports two stable shapes (per the existing `load-version.ts` ADAPTERS table):
  - A `buildRow` function (pure; no DB access; no port needed).
  - An `upsertRow` function that previously accepted `db: Database.Database` and now accepts `tx: postgres.TransactionSql`. Body becomes a postgres-js template literal.
- [ ] `load-assets.ts` is the largest single adapter - it owns four asset relation tables. Port each upsert function (`upsertAssetExtension`, `upsertAssetPathRule`, `upsertAssetCvarBinding`, `upsertAssetLoaderSite`) plus the orchestrator `loadAssets` (similar shape to load-version's outer txn).
- [ ] `load-maps.ts` writes to the flat `maps` table with `ON CONFLICT (canonical_name) DO UPDATE`. Idempotency-key check stays.
- [ ] `load-gameplay.ts` writes to three tables (`gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`). The polymorphic ruleset_gate_json column on the latter two is JSONB now (per generator dialect rules); ensure the upsert passes a JSONB-castable value (postgres-js auto-casts `Record<string, unknown>` to JSONB). The UNIQUE on `(gameplay_source_id, kind, name, ruleset_gate_json)` was load-bearing in SQLite (NULL-handling), but Postgres treats NULLs in unique indexes as distinct by default - the NOT NULL DEFAULT '{}' constraint preserves correctness here.
- [ ] `load-release-notes.ts` writes to the `release_notes` table; idempotent upsert on `(project, version, section, ordinal)`.

**Verification:**
- `bunx tsc --noEmit` exits 0.
- `grep -rn "better-sqlite3" apps/qw-oracle/scripts/load-knowledge/ | grep -v test` returns zero hits in this batch (only test files should still mention it; they get rewritten in Task 11).

### Task 10: Add entities.description derivation step (D6, F7)

**Goal:** Populate `entities.description` from the per-version row at `last_seen_version`, called as a tail step inside every load-version transaction.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts`

**Steps:**
- [ ] Implementation choice: explicit step inside load-version's transaction (rather than a SQL view or a trigger). Reasons: derivation is a one-line UPDATE per type with a known shape; visible in the loader code path means easy to debug; the alternative (trigger) hides cost on every per-version write, and a view cannot be indexed for the tsvector / vector indexes needed by Phase 6 retrieval. The grug-brain bias is "explicit step you can SQL-dump if it goes wrong."
- [ ] Implement `deriveEntityDescriptionsForVersion(tx, project, type, version)`. The function runs after the version's per-version rows are upserted and walks every entity at `(project, type, last_seen_version=<version>)`, recomputing `entities.description` from the per-version row.
- [ ] Per-type derivation, locked against `schema.ts` columns (verified during drafting):
  - `cvar` -> `cvar_versions.help_desc` at the entity's `last_seen_version` (one column; null and empty are coerced to NULL on entity).
  - `command` -> `command_versions.help_desc`.
  - `macro` -> `macro_versions.help_desc`.
  - `cmdline_param` -> `cmdline_param_versions.help_desc` (NOT `description`; SCHEMA.md / schema.ts confirm this).
  - `hud_element` -> `hud_element_versions.help_desc`.
  - `ruleset` -> NULL (no help text in SQLite shape; rely on name + locked-cvars JSON for retrieval; Phase 6 may want to synthesise a description here, but Arc 1 keeps it null).
  - `keyname` -> NULL (no help text).
  - `token_primitive` -> synthesised from `category` + `form` + `suffix_char`. Format: `<category> token <form>` (e.g., `led token $B`). Token primitives are case-sensitive.
  - `asset_category` -> `asset_category_versions.description` (verified: this column IS named `description` in `schema.ts`).
  - `flag_bit` -> synthesised from `bitmask_family` + entity name (e.g., `cvar_flag CVAR_USERINFO`). The actual flag semantics live in source comments not pulled by the extractor; consumer LLMs can recover detail via lookup.
  - `cvar_alias` -> synthesised: `alias of <target_canonical_id>; drift status: <default_drift_status>; freshness: <freshness_state>` from `cvar_alias_versions`. Pulls 3 columns plus the entity name for the "alias of" prefix.
  - `protocol_message` -> synthesised: `<kind> protocol message: <name>; value <value>; <trailing_comment>` from `protocol_message_versions`. The `trailing_comment` is the column that often carries the human-readable intent; concat it after the structured prefix.
  - `info_key` -> synthesised: `<scope> info key: <bare_name>; ops <operations>` from `info_key_versions` (`bare_name` derived by stripping `:<scope>` suffix from `entities.name`).
  - `log_template` -> synthesised: `<channel> log template: <format_string_normalized>` from `log_template_versions`. The format string IS the description.
  - `qc_builtin` -> synthesised: `qc_builtin <table_name>[<builtin_index>] -> <handler_fn>; <qc_signature>; <trailing_comment>` from `qc_builtin_versions`. Concat with separators; null fields skipped.
- [ ] Implementation pattern: one `UPDATE entities SET description = (SELECT ... FROM <type>_versions WHERE entity_id = entities.id AND version = entities.last_seen_version) WHERE entities.project = $1 AND entities.type = $2 AND entities.last_seen_version = $3`. Per-type SQL lives in a `Record<EntityType, string>` lookup; the function picks the right one and binds.
- [ ] When `entities.description` changes, set `entities.description_embedding_stale = TRUE` so Phase 5's embedding pipeline knows to re-embed. The UPDATE can do both columns in one statement using a `CASE WHEN <new> IS DISTINCT FROM <old> THEN TRUE ELSE description_embedding_stale END` guard. Simpler equivalent: always set stale = TRUE in the UPDATE; Phase 5's hash-based skip catches the no-op cases. Pick the simpler form.

**Verification:**
- After re-loading ezQuake head in Task 13, `psql qw_oracle_dev -c "SELECT count(*) FROM entities WHERE project='ezquake' AND type='cvar' AND description IS NOT NULL"` returns approximately 2901 (matches the cvar-with-help count documented in SCHEMA.md, allowing for the small subset of cvars with no help_desc).
- `psql qw_oracle_dev -c "SELECT count(*) FROM entities WHERE description_tsv != ''::tsvector"` returns >= 8000 (most entities of types with help_desc).

### Task 11: Rewrite tests (D13)

**Goal:** Tests use `bun test` and a real Postgres test DB (`qw_oracle_test`); no SQLite, no in-memory mocking.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-maps.test.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts`

**Steps:**
- [ ] Replace `import Database from 'better-sqlite3'` and `import { describe, it } from 'node:test'` with `import { describe, it, beforeAll, beforeEach } from 'bun:test'` and the postgres-js singleton. Test DB connection URL: `process.env.DATABASE_URL ?? 'postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle_test'`.
- [ ] Replace each test's `newDb()` helper. New shape: `beforeEach` truncates the tables the test touches (`TRUNCATE entities, maps RESTART IDENTITY CASCADE` for load-maps; the per-test required tables for quality-grid and findings-help-json). The TRUNCATE-and-rebuild pattern is per D13.
- [ ] Each test's body changes from synchronous `db.prepare(...).get(...)` to `await sql<Row[]>` template literals. Tests are async functions.
- [ ] Test data in load-maps.test.ts (`SAMPLE`) is unchanged; the upsert call passes the same record but to the postgres-js variant of `loadMapsFromArray`.
- [ ] Test data in quality-grid.test.ts is unchanged; the seed INSERT uses postgres-js bulk insert.
- [ ] No mocks (D13). Tests run against the real test DB.
- [ ] Top-of-file comment in each test file: drop the "better-sqlite3 is a native Node addon..." note - Bun + postgres-js works fine, that comment is now misleading.
- [ ] `package.json` adds: `"test": "DATABASE_URL=postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle_test bun test"`.

**Verification:**
- `bun test scripts/load-knowledge/` from `apps/qw-oracle/` exits 0.
- Test count is the same as pre-port (4 + 6 + however many findings-help-json had) - operator records pre-port count first via `bun test scripts/load-knowledge/ 2>&1 | grep -E "ran|passed"`.

### Task 12: Port the heavy modules (diff-versions, build-snapshot, enrich-prs, extract-tag, build-asset-bundle, quality-grid, review/)

**Goal:** Port the modules that read many tables in bulk and the CLI orchestrator. These do not write entity rows (they consume them), so they tend to have cleaner ports than load-version.ts, but they hit row volume and need correct ANY($1::int[]) / ANY($1::text[]) shapes.

**Files:**
- Modify: `diff-versions.ts`, `build-snapshot.ts`, `enrich-prs.ts`, `extract-tag.ts`, `build-asset-bundle.ts`, `quality-grid.ts`, `backfill-version-bookkeeping.ts`, `index.ts`, `types.ts`
- Modify: `review/index.ts`, `review/findings-additions.ts`, `review/findings-help-json-classifications.ts`, `review/findings-retirements.ts`, `review/findings-semantic-crossings.ts`, `review/findings-source-invisible.ts`, `review/findings-unclassified.ts`

**Steps:**
- [ ] `diff-versions.ts`: the per-field diff hot loop. Preserve the Map-preload optimisation - bulk SELECTs into a Map keyed by `entity_id:version` so the inner per-field comparison hits no DB. Bulk SELECT shape: `await tx<Row[]>` SELECT * FROM cvar_versions WHERE entity_id = ANY(${entityIdsArray}::int[])`. Postgres-js auto-casts JS arrays to int[]/text[] when the type cast is named in the template. Keep the `change_events` write as a parameterised INSERT batch under the same transaction.
- [ ] `build-snapshot.ts`: the snapshot builder reads from Postgres now and emits the same per-project JSONs the slipgate-app contract expects. Uses `SCHEMA_VERSION` from `constants.ts`. Major shape unchanged; SQL queries become postgres-js template literals.
- [ ] `enrich-prs.ts`: walks `change_events` rows lacking PR enrichment, queries the GitHub API, writes back. Single-table UPDATE loop.
- [ ] `extract-tag.ts`: top-level orchestrator that runs `extract` (Python) -> `loadVersion` -> `diffVersions` -> `enrichPrs` -> snapshot. The Python extractor invocation is unchanged. Uses `HEAD_ORDINAL` from `constants.ts`. Postgres-js connection passed down.
- [ ] `build-asset-bundle.ts`: pre-loader that merges seed YAML + AST passes; writes to the `asset_*` relation tables via load-assets. Pure transform + DB write.
- [ ] `quality-grid.ts`: the probe runner. Each probe's `run` function changes from `(args: { db: Database.Database, ... }) => ProbeResult` to async with `sql: postgres.Sql` (or tx) parameter. Uses `HEAD_ORDINAL`. The 79KB file is the largest port - estimate hours, not minutes.
- [ ] `backfill-version-bookkeeping.ts`: a one-off helper. Verify it is still needed in Postgres (the bookkeeping it backfills may now be filled correctly on the first load against an empty DB, making the tool obsolete). If obsolete, delete the file rather than port. Surface the decision in Open Questions if uncertain.
- [ ] `index.ts`: CLI dispatcher. Top-level handlers become async; `await closeSql()` on exit. Uses `HEAD_ORDINAL` from `constants.ts`.
- [ ] `types.ts`: drop `import type Database from 'better-sqlite3'`. Add `import type postgres from 'postgres'` if any shared types reference the Sql handle (most type definitions are pure data shapes and need no change).
- [ ] `review/` subdirectory: each finding query + the index dispatcher. Same mechanical port pattern. Tests in this subdir get the Task 11 treatment.

**Verification:**
- `bunx tsc --noEmit` exits 0 from `apps/qw-oracle/`.
- `grep -rln 'better-sqlite3\|bun:sqlite' apps/qw-oracle/scripts/load-knowledge/` returns zero hits (this is the F15 / F18 closure check; if anything still mentions sqlite, the port missed a file).

### Task 13: Update package.json (D2)

**Goal:** `package.json` reflects the post-port reality: Bun runtime, no better-sqlite3, postgres-js as a runtime dep.

**Files:**
- Modify: `apps/qw-oracle/package.json`

**Steps:**
- [ ] Drop `better-sqlite3` from `dependencies`.
- [ ] Drop `@types/better-sqlite3` from `devDependencies`.
- [ ] Drop `tsx` from `devDependencies` (D2; Phase 1 may already have done this).
- [ ] Confirm `postgres` (postgres-js) is in `dependencies` (Phase 1 added it).
- [ ] Convert scripts:
  ```
  "import:discord": "node scripts/import-discord.mjs",      // Phase 3 territory; leave as node
  "import:irc": "node scripts/import-irc.mjs",              // Phase 3 territory; leave as node
  "stats": "node scripts/stats.mjs",                        // Phase 3 territory; leave as node
  "typecheck": "tsc --noEmit",                              // unchanged
  "load-knowledge": "bun scripts/load-knowledge/index.ts",
  "generate-pg-migration": "bun scripts/generate-pg-migration.ts",
  "test": "DATABASE_URL=postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle_test bun test",
  "migrate": "bun db/migrate.ts"                            // already added in Phase 1; verify present
  ```
  Phase 3 will convert the import:* scripts to bun-based equivalents when porting Layer 2; do not touch them here.
- [ ] Run `bun install` to refresh `package-lock.json` (or remove `package-lock.json` if the project switches to `bun.lockb`; check Phase 1's choice).

**Verification:**
- `bun pm ls | grep better-sqlite3` returns nothing.
- `bun pm ls | grep ^postgres` returns the installed postgres-js version.

### Task 14: Delete schema.ts and the SQLite knowledge.db file

**Goal:** Remove the carry-forward of the SQLite Layer 1 store. The Postgres store is the new authoritative copy.

**Files:**
- Delete: `apps/qw-oracle/scripts/load-knowledge/schema.ts`
- Delete: `apps/qw-oracle/data/knowledge.db` (gitignored already)

**Steps:**
- [ ] `rm apps/qw-oracle/scripts/load-knowledge/schema.ts`. Run `grep -rn "from './schema'" apps/qw-oracle/` first; expect zero hits at this point. If anything still imports `./schema.js`, fix that file first - usually a missed Task 1 reference.
- [ ] `rm apps/qw-oracle/data/knowledge.db` (the file is gitignored; the deletion is local only). The data directory is preserved (Phase 3 reuses it for `qw.db` until Phase 3 lands; longer-term it gets deleted as part of Phase 3).
- [ ] Update `apps/qw-oracle/scripts/load-knowledge/CLAUDE.md` to reference postgres-js instead of better-sqlite3 (one or two sentences; the existing always-on-rules section calls out "schema migrations" which is now migrator-managed).

**Verification:**
- `ls apps/qw-oracle/scripts/load-knowledge/schema.ts` returns "No such file or directory".
- `bunx tsc --noEmit` from `apps/qw-oracle/` exits 0.

### Task 15: Re-extract every loaded tag, populate Postgres, verify regression gate (F17, F18)

**Goal:** Walk every committed extractor output (`scripts/extractors/<project>/output/*-ast.json`) through the ported loader. Per-project entity counts must match the SQLite baseline within idempotency tolerance.

**Files:**
- (none modified - this task produces DB state, not files)

**Steps:**
- [ ] Operator first records the SQLite baseline:
  ```
  Per-project entity counts (recorded 2026-05-02 from current data/knowledge.db):
    ezquake: 4042
    fte:     3279
    mvdsv:   1236
    qwcl:     380
  
  Per-table row counts (recorded same):
    versions:                    18
    cvar_versions:           43,153
    command_versions:         8,464
    macro_versions:           1,039
    cmdline_param_versions:   1,108
    keyname_versions:         1,896
    hud_element_versions:     1,188
    ruleset_versions:            79
    token_primitive_versions:   495
    asset_category_versions:    446
    flag_bit_versions:          672
    cvar_alias_versions:         38
    protocol_message_versions:  105
    info_key_versions:           45
    log_template_versions:      691
    qc_builtin_versions:         93
    asset_extensions:           706
    asset_path_rules:           223
    asset_cvar_bindings:        408
    asset_loader_sites:       2,686
    release_notes:              101
    change_events:              474
    relation_changes:            83
    source_overrides:         7,625
    source_state_transitions: 9,084
    maps:                       254
    gameplay_sources:             1
    gameplay_entity_defs:        37
    gameplay_mechanics:          41
  ```
  These numbers ARE the regression gate (F17 fix: real numbers, not the legacy plan's estimates). `source_state_transitions` may grow on re-load because the per-version transition scan is idempotent on `(entity_id, reason, version_context)` but its first run against an empty DB walks every loaded tag once. Tolerance for that table: count >= baseline.
- [ ] List every loaded (project, version) tag from `scripts/extractors/<project>/output/`. Quick one-liner to enumerate:
  ```
  find apps/qw-oracle/scripts/extractors -name "*-ast.json" -type f | sort
  ```
  Cross-reference with the canonical list in `apps/qw-oracle/docs/arc-history.md` (the chronological ship log).
- [ ] For each (project, tag) tuple, run `bun scripts/load-knowledge/index.ts extract-tag --project <p> --version <v>` (or, if the extractor JSON is already on disk, run `load-version` directly per type to skip the Python re-run). The orchestrator handles version upsert + per-type loading + diff + PR enrichment. Loader calls are idempotent so re-runs are safe; but the first walk against the empty DB needs an order such that ezquake / fte / mvdsv / qwcl tags load in chronological order per project so the version `ordinal` gating in the per-version state-transition scan works correctly.
- [ ] qw-namespace loaders run after the per-project loaders:
  ```
  bun scripts/load-knowledge/index.ts load-maps
  bun scripts/load-knowledge/index.ts load-gameplay
  ```
- [ ] Run the description-derivation step explicitly for every loaded version once to seed `entities.description`:
  - The derive helper is called automatically inside `loadVersion`, so this is satisfied by the load itself for the `last_seen_version` of each entity. No separate command needed.
- [ ] Compare counts against the baseline. Use:
  ```
  psql qw_oracle_dev -c "SELECT project, COUNT(*) FROM entities GROUP BY project ORDER BY project"
  ```
  Expected: ezquake=4042, fte=3279, mvdsv=1236, qwcl=380. Mismatch >0.5% on any project triggers investigation.
- [ ] Per-table row counts: spot-check the largest tables (`cvar_versions`, `source_state_transitions`, `source_overrides`, `asset_loader_sites`). Tolerance: same as entities (0.5%) for tables that are version-arc deterministic; loose tolerance (count >= baseline) for `source_state_transitions` (idempotency-key path may produce extra rows on first run).

**Verification:**
- PASS condition: per-project entity counts match the recorded baseline within 0.5%; spot-check tables within 0.5% (state-transitions: count >= baseline).
- FAIL condition: any project off by more than 0.5%, or any table off by more than 0.5% with no documented cause (e.g., a deliberate idempotency-rerun increase).

## Verification (phase boundary)

Operator runs these queries from `apps/qw-oracle/` and eyeballs the output. PASS = proceed to Phase 3. FAIL = consult Recovery section.

1. **All 31 tables present in dev DB.**
   ```
   psql qw_oracle_dev -c "\dt" | grep -E "^ public" | wc -l
   ```
   PASS condition: returns 31 (30 from migrations 002 + the `oracle_meta` from Phase 1's 001) plus a few system tables; the public-schema-table count line should print >= 31.
   FAIL condition: < 31. Re-run migrator; check `schema_migrations` for partially-applied migrations.

2. **All 15 entity-type CHECK values present (F2 closure).**
   ```
   psql qw_oracle_dev -c "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'entities' AND c.contype = 'c' AND c.conname LIKE '%type%'"
   ```
   PASS condition: the printed CHECK includes all 15 type values: cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, asset_category, flag_bit, cvar_alias, protocol_message, info_key, log_template, qc_builtin.
   FAIL condition: missing values, OR plan-author values like `asset_consumption` or `cross_engine_alias` (those would mean the generator missed a SQLite value).

3. **change_events idempotency UNIQUE in place (F6 closure).**
   ```
   psql qw_oracle_dev -c "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'change_events' AND c.contype = 'u'"
   ```
   PASS condition: prints `UNIQUE (entity_id, to_version, field_name, change_kind)`.
   FAIL condition: no UNIQUE constraint listed.

4. **Per-project entity counts match the baseline (F17 closure).**
   ```
   psql qw_oracle_dev -c "SELECT project, COUNT(*) FROM entities GROUP BY project ORDER BY project"
   ```
   PASS condition: ezquake=4042 (+/- 21), fte=3279 (+/- 16), mvdsv=1236 (+/- 6), qwcl=380 (+/- 2). The +/- envelopes are 0.5% rounded down.
   FAIL condition: anything outside the 0.5% envelope on any project.

5. **entities.description populated (F7 + D6 closure).**
   ```
   psql qw_oracle_dev -c "SELECT type, count(*) FILTER (WHERE description IS NOT NULL) AS with_desc, count(*) AS total FROM entities GROUP BY type ORDER BY type"
   ```
   PASS condition: cvar / command / macro / cmdline_param / hud_element / asset_category have `with_desc` > 50% of total. ruleset / keyname / token_primitive / flag_bit / cvar_alias / protocol_message / info_key / log_template / qc_builtin may have `with_desc = total` (synthesised) or `with_desc = 0` (deliberate; per the Task 10 mapping); each type's pattern matches the mapping documented in Task 10.
   FAIL condition: cvar `with_desc` is 0 (description derivation never ran) OR ruleset/keyname `with_desc > 0` (synthesised when D6 mapping says NULL - safe but suggests an unintended derivation).

6. **No residual better-sqlite3 imports in the loader (F15 + F18 closure).**
   ```
   grep -rln 'better-sqlite3\|bun:sqlite' apps/qw-oracle/scripts/load-knowledge/
   ```
   PASS condition: zero hits.
   FAIL condition: any hit. Port the named file before declaring phase done.

7. **Tests green.**
   ```
   cd apps/qw-oracle && bun test scripts/load-knowledge/
   ```
   PASS condition: all tests pass; pass count matches pre-port baseline.
   FAIL condition: failures or fewer tests than pre-port (a test was lost, not ported).

8. **Type check green.**
   ```
   cd apps/qw-oracle && bunx tsc --noEmit
   ```
   PASS condition: exits 0.
   FAIL condition: non-zero exit.

9. **Loader is idempotent on re-run (D17 + arc-history claim).**
   ```
   cd apps/qw-oracle && bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version 3.6.9
   psql qw_oracle_dev -c "SELECT count(*) FROM entities WHERE project='ezquake'"
   # Run the same extract-tag again
   bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version 3.6.9
   psql qw_oracle_dev -c "SELECT count(*) FROM entities WHERE project='ezquake'"
   ```
   PASS condition: the two entity counts are identical.
   FAIL condition: counts differ - upsert logic somewhere is producing duplicates.

## Outputs to next phase

Postgres `qw_oracle_dev` and `qw_oracle_test` databases each hold the full Layer 1 schema (31 tables) and `qw_oracle_dev` has the Layer 1 entity rows from every loaded extractor tag. `entities.description` is populated. `entities.description_embedding` and `entities.description_embedding_sha256` are NULL (Phase 5 fills them). The loader at `scripts/load-knowledge/` runs against Postgres only; SQLite knowledge.db is gone. `package.json` carries `postgres` and not `better-sqlite3`. `bun test` is green. Layer 2's SQLite store (`apps/qw-oracle/data/qw.db` and the `import-*.mjs` scripts) is untouched - that is Phase 3's input.

## Open questions / deferred items

1. **Question:** Does the schema generator emit asset-relation FK syntax that Postgres accepts as-is? The asset relation tables FK `entities(canonical_id)` (a UNIQUE constraint, not the PK). Postgres allows FK to UNIQUE columns, but only if the unique constraint is defined as a constraint, not via a unique index. The generator emits `UNIQUE (canonical_id)` inline on `entities` - which Postgres treats as both a unique index and an implicit constraint, so the FK is valid.
   **Default chosen for now:** Trust the generator's output; Task 4's per-table diff catches a mismatch if one exists.
   **Who can resolve:** Phase 2 sub-agent verification, or Task 5 manual diff.

2. **Question:** Does `backfill-version-bookkeeping.ts` retain a use under Postgres? The original purpose was a one-off backfill of pre-Batch-2 SQLite rows that lacked `source_overrides` data; if the Postgres reload from extractor JSON gets full coverage on first pass (which it should, since loaders run against fresh DB), the script is obsolete.
   **Default chosen for now:** Port it during Task 12; mark with a `// TODO: confirm still needed post-Phase-2 reload` comment; revisit at end of Task 15. If it has nothing to backfill, delete in a follow-up commit on Phase 3.
   **Who can resolve:** operator, after Task 15 confirms data shape.

3. **Question:** For the description derivation of synthetic types (token_primitive, flag_bit, cvar_alias, protocol_message, info_key, log_template, qc_builtin), the synth strings are a Phase 2 invention - operator may want a different shape after seeing what the eval set surfaces in Phase 8.
   **Default chosen for now:** Use the strings exactly as specified in Task 10; revise in a follow-up commit if eval calibration shows them mismatched against operator expectations.
   **Who can resolve:** Phase 8 calibration, or operator review at any time.

4. **Question:** Does the legacy SQLite knowledge.db file need to be archived before deletion? It is the only point-in-time snapshot we have of the SQLite-era data; once deleted, the only way to recover the SQLite-era shape is to re-run extractors against the same git commits.
   **Default chosen for now:** Delete the file (Task 14). The data is regenerable from extractor JSON which is committed; the file is gitignored anyway. If the operator wants a frozen archive for forensic comparison, copy `data/knowledge.db` to `data/knowledge.db.preport-2026-05-02` before Task 14 and commit the path-renamed copy under a new `.gitignore` exception.
   **Who can resolve:** operator, before Task 14 runs.

5. **Question:** Should `release_notes.referenced_entity_ids_json` (and the other legacy `*_json` TEXT columns that hold JSON arrays) be JSONB after the dialect transformation, AND should the loader port queries cast them appropriately, OR should they stay TEXT? Postgres-side JSONB is more queryable; loader-side `JSON.stringify(...)` already produces valid JSONB-castable input.
   **Default chosen for now:** JSONB. The generator dialect rule already converts `*_json TEXT` to JSONB (Task 2). Loader passes plain JS objects/arrays to postgres-js, which auto-casts. If a downstream consumer assumes TEXT, that surfaces as a bug in Phase 6 - manageable.
   **Who can resolve:** Phase 6 sub-agent verification.

## Recovery (if verification fails)

- **If verification step 1 (table count) fails:** Re-run `bun db/migrate.ts` against `qw_oracle_dev`. If the migrator says "all migrations applied," check `schema_migrations` for any rows with `applied_at IS NULL` (a partial commit). If found, drop the partial table(s) and re-run. If not found, the generator is missing a CREATE TABLE - inspect `db/migrations/002_layer1_schema.sql` against the schema.ts inventory.

- **If verification step 2 (CHECK enum) fails:** The generator missed a v15-era widening or hand-rewrote a CHECK that was already correct. Diff the generator's output against `schema.ts` for the entities table (search for `CREATE TABLE entities` in both). Fix the generator, regenerate, and apply the regenerated migration via `DROP TABLE entities CASCADE` on the dev DB followed by `bun db/migrate.ts`.

- **If verification step 3 (change_events UNIQUE) fails:** Same recovery shape as step 2 - generator missed the UNIQUE clause. F6 explicitly calls this out; the schema.ts text has it on line 180.

- **If verification step 4 (entity counts) fails:** A loaded tag is missing or a loader silently skipped rows. Run the per-tag loader for the project that drifted, with `--force` to overwrite. If the count is still wrong, run `psql qw_oracle_dev -c "SELECT project, type, count(*) FROM entities GROUP BY project, type ORDER BY project, type"` and compare against the per-type row inventory in Task 15. The per-type breakdown surfaces which adapter ran short.

- **If verification step 5 (description population) fails:** The derive step is bypassed. Search load-version.ts for the `await deriveEntityDescriptionsForVersion(...)` call; verify it is inside the txn, after the per-version row upsert loop, before the txn commit. Run derivation manually for a single (project, type, version) to confirm the SQL works:
  ```
  psql qw_oracle_dev -c "UPDATE entities SET description = (SELECT help_desc FROM cvar_versions WHERE entity_id = entities.id AND version = entities.last_seen_version) WHERE project='ezquake' AND type='cvar' AND last_seen_version='head'"
  ```
  If the manual SQL works but the loader's call does not, suspect a transaction-isolation bug.

- **If verification step 6 (no better-sqlite3 imports) fails:** Port the named file. The grep is mechanical; failures are always a missed file.

- **If verification step 7 (tests) fails:** Most likely: a test still uses the in-memory SQLite shape. Re-port the failing test per Task 11. Less likely: a bug in the corresponding loader's port - the test exists to catch this.

- **If verification step 8 (typecheck) fails:** The error message names the file and line. Almost always: a missed `Database.Database` -> `postgres.Sql` substitution, or a missed `await` on a now-async helper. Both are mechanical.

- **If verification step 9 (idempotency) fails:** A loader is duplicating rows on re-run. The change_events UNIQUE (step 3) catches some of these; if entities counts are off, suspect `upsertEntity` - check ON CONFLICT (project, type, name) and that the upsert path returns the existing entity_id rather than inserting a duplicate.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

Brief filled in below; dispatched immediately after this draft lands.

---
