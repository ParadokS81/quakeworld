# Phase 0 -- Schema + plumbing

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). DONE.
> 2. Read `review-findings.md`; identify which findings apply: F1 (10 CHECKs, not 5) and F4 (12 Record sites, tsc-gate). DONE.
> 3. Run live recon (Read/grep/ls) on all real source files this phase touches. DONE.
> 4. After drafting, dispatch the verification sub-agent (brief at the bottom of this template). DONE -- see "Open questions" for the finding counts.

## Goal

This phase makes the Postgres schema and the TypeScript project plumbing ready to accept `qtv` and `qwfwd` as first-class Layer 1 projects. It delivers three concrete outputs: (1) migration `020_qtv_qwfwd_projects.sql` that widens the project allow-list across all 10 CHECK clauses on 9 tables; (2) the `Project` union in `types.ts` widened from 6 to 8 members so `tsc` compiler-enforces exhaustive coverage; (3) all 12 `Record<Project,...>` call sites filled with the correct qtv/qwfwd value. `SCHEMA.md` is updated to document the two new projects and the migration. `versions` rows are NOT pre-inserted here -- `upsertVersion` is called inside every `load-version` run (`natural-keys.ts:77-88`; INSERT...ON CONFLICT), so Phase 1 and Phase 2 create them on first load; Phase 0 verifies the CHECK constraint via a rolled-back dummy `entities` insert. Runnable state at phase boundary: the DB rejects `project='bogus'` and accepts `project='qtv'` and `project='qwfwd'` on all relevant tables; `bunx tsc --noEmit` exits 0.

## Inputs from previous phase

Phase 0 is the first phase. Inputs are the operator-side prerequisites listed in `prerequisites.md`:
- Postgres 16 service running with `DATABASE_URL` set.
- Existing migrations 001 through 019 applied (verified by `schema_migrations` table).
- `bun` runtime available.
- `bunx tsc` available (TypeScript + project `tsconfig.json` resolves).

## Files touched

### Created

```
apps/qw-oracle/db/migrations/020_qtv_qwfwd_projects.sql   # hand-written; widens 10 CHECK clauses
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/types.ts             # Project union: add 'qtv' | 'qwfwd'
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts       # 8 Record<Project> sites filled
apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts    # 1 Record<Project> site filled
apps/qw-oracle/scripts/load-knowledge/diff-versions.ts     # 1 Record<Project> site filled
apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts        # 1 Record<Project> site filled
apps/qw-oracle/scripts/load-knowledge/load-release-notes.ts # 1 Record<Project> site filled
apps/qw-oracle/SCHEMA.md                                   # doc: projects 6-7, migration 020
```

### Deleted

```
n/a
```

## Tasks

---

### Task 1 -- Write migration 020

**Goal:** Produce `020_qtv_qwfwd_projects.sql` that widens all 10 project-CHECK clauses to include `'qwfwd'` and `'qtv'`.

**Files:** `apps/qw-oracle/db/migrations/020_qtv_qwfwd_projects.sql`

**Steps:**

- [ ] Before writing the final `DROP CONSTRAINT` names, the executor MUST run the catalog introspection query against the live Postgres instance to get the real constraint names. Postgres auto-names inline CHECK constraints as `<table>_<column>_check`, but this must be verified -- don't rely on the convention. Run:

  ```sql
  SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%project%'
  ORDER BY tbl::text, conname;
  ```

  The expected 10 rows are (table, assumed constraint name):
  - `versions` / `versions_project_check`
  - `entities` / `entities_project_check`
  - `asset_extensions` / `asset_extensions_project_check`
  - `asset_path_rules` / `asset_path_rules_project_check`
  - `asset_cvar_bindings` / `asset_cvar_bindings_project_check`
  - `asset_loader_sites` / `asset_loader_sites_project_check`
  - `release_notes` / `release_notes_project_check`
  - `relation_changes` / `relation_changes_project_check`
  - `cvar_alias_versions` / `cvar_alias_versions_target_project_check` (column `target_project`)
  - `cvar_alias_versions` / `cvar_alias_versions_mimics_project_check` (column `mimics_project`)

  If any actual name differs from the assumed name above, use the actual name in the DROP CONSTRAINT line.

- [ ] Write the migration file with the content below (substitute the real constraint names from the introspection step if they differ). NOTE: no explicit `BEGIN`/`COMMIT` in the file body -- `db/migrate.ts` wraps each migration in `sql.begin()` already (verified: `migrate.ts:48`). An explicit inner `COMMIT` would close the migrator's transaction prematurely.

```sql
-- 020_qtv_qwfwd_projects.sql
--
-- Widens the project CHECK allow-list from the original 5 values
-- ('ezquake','fte','mvdsv','ktx','qwcl') to add 'qwfwd' and 'qtv',
-- making both tools first-class Layer 1 projects (QTV + QWFWD extraction arc,
-- 2026-06-05).
--
-- 10 CHECK clauses across 9 tables, all in 002_layer1_schema.sql.
-- Strategy: DROP + re-ADD per clause (Postgres can do this without a table
-- rebuild). Never edit 002 -- schema_migrations sha256 guard rejects edits
-- to applied migrations.
--
-- The 'qw' slug is the game-itself namespace (Project union in types.ts);
-- it has NO project column in any engine table and is NOT in these CHECKs.
-- The new slots are server/proxy tools: 'qwfwd' (C UDP forwarder) and
-- 'qtv' (Go streaming proxy).
--
-- Constraint names verified against pg_constraint on 2026-06-05 (see
-- arc planning phase-0 drafter recon). Assumed names follow the Postgres
-- default `<table>_<col>_check` pattern; update if the introspection query
-- returns a different name.
--
-- IMPORTANT: verify constraint names with the introspection query in
-- phase-0-schema-plumbing.md Task 1 before applying.
-- No explicit BEGIN/COMMIT -- db/migrate.ts wraps each migration in sql.begin().

-- versions.project
ALTER TABLE versions
  DROP CONSTRAINT versions_project_check;
ALTER TABLE versions
  ADD CONSTRAINT versions_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- entities.project
ALTER TABLE entities
  DROP CONSTRAINT entities_project_check;
ALTER TABLE entities
  ADD CONSTRAINT entities_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_extensions.project
ALTER TABLE asset_extensions
  DROP CONSTRAINT asset_extensions_project_check;
ALTER TABLE asset_extensions
  ADD CONSTRAINT asset_extensions_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_path_rules.project
ALTER TABLE asset_path_rules
  DROP CONSTRAINT asset_path_rules_project_check;
ALTER TABLE asset_path_rules
  ADD CONSTRAINT asset_path_rules_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_cvar_bindings.project
ALTER TABLE asset_cvar_bindings
  DROP CONSTRAINT asset_cvar_bindings_project_check;
ALTER TABLE asset_cvar_bindings
  ADD CONSTRAINT asset_cvar_bindings_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_loader_sites.project
ALTER TABLE asset_loader_sites
  DROP CONSTRAINT asset_loader_sites_project_check;
ALTER TABLE asset_loader_sites
  ADD CONSTRAINT asset_loader_sites_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- release_notes.project
ALTER TABLE release_notes
  DROP CONSTRAINT release_notes_project_check;
ALTER TABLE release_notes
  ADD CONSTRAINT release_notes_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- relation_changes.project
ALTER TABLE relation_changes
  DROP CONSTRAINT relation_changes_project_check;
ALTER TABLE relation_changes
  ADD CONSTRAINT relation_changes_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- cvar_alias_versions.target_project
ALTER TABLE cvar_alias_versions
  DROP CONSTRAINT cvar_alias_versions_target_project_check;
ALTER TABLE cvar_alias_versions
  ADD CONSTRAINT cvar_alias_versions_target_project_check
    CHECK (target_project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- cvar_alias_versions.mimics_project (nullable -- no NOT NULL on this column)
ALTER TABLE cvar_alias_versions
  DROP CONSTRAINT cvar_alias_versions_mimics_project_check;
ALTER TABLE cvar_alias_versions
  ADD CONSTRAINT cvar_alias_versions_mimics_project_check
    CHECK (mimics_project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));
```

**Verification (task-level):** After the migration is written but before running it, confirm the file is in `apps/qw-oracle/db/migrations/` and sorts lexically after `019_embedding_freshness_comments.sql`. The migrate.ts applies files in lexical order (verified in `db/migrate.ts:24-26`).

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis from a clear spec; 1 new file; requires reading the live catalog introspection output and substituting the correct constraint names.

---

### Task 2 -- Widen the `Project` union in `types.ts`

**Goal:** Add `'qtv'` and `'qwfwd'` to the `Project` type so `tsc` compiler-enforces all downstream `Record<Project>` sites.

**Files:** `apps/qw-oracle/scripts/load-knowledge/types.ts`

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/types.ts`.
- [ ] On line 8, change:
  ```ts
  export type Project = 'ezquake' | 'fte' | 'mvdsv' | 'ktx' | 'qwcl' | 'qw';
  ```
  to:
  ```ts
  export type Project = 'ezquake' | 'fte' | 'mvdsv' | 'ktx' | 'qwcl' | 'qw' | 'qtv' | 'qwfwd';
  ```
- [ ] (Optional confirmatory diagnostic.) Run `bunx tsc --noEmit` after this single change. It reports ~12 errors, one per unfilled `Record<Project>` site -- confirming the compiler is enforcing exhaustiveness. The binding gate is Task 3 (tsc green after every site is filled); this step just eyeballs that the union edit took effect.

**Execution mode:** `inline` -- pure text substitution, full content known; single-line change.

---

### Task 3 -- Fill all 12 `Record<Project,...>` sites

**Goal:** Add `qtv` and `qwfwd` keys to every exhaustive `Record<Project,...>` so `bunx tsc --noEmit` exits 0.

**Files:** `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`, `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`, `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts`, `apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts`, `apps/qw-oracle/scripts/load-knowledge/load-release-notes.ts`

**Decision rationale per site (verified against live source during planning):**

The values below were chosen by reading each Record site in the live source and applying D1 (qtv/qwfwd bypass extract-tag entirely -- `PROJECT_EXTRACTOR` must be `null`) and the conventions established by the `qw` slot (the existing null/empty-string sentinel for project slots that don't participate in a given flow).

**extract-tag.ts (8 sites):**

| Line | Constant | qtv value | qwfwd value | Reason |
|---|---|---|---|---|
| 36 | `PROJECT_REPO_PATH` | `join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'reference', 'qtv')` | `join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'reference', 'qwfwd')` | Vendored snapshot path (D1); extract-tag never runs for these projects but the Record<Project,string> type requires a string value |
| 48 | `PROJECT_EXTRACTOR` | `null` | `null` | D1 -- extract-tag throws on null extractor (verified: extract-tag.ts:338-343); this is correct and intended |
| 57 | `PROJECT_EXTRACTOR_OUTPUT_DIR` | `join(EXTRACTORS_ROOT, 'qtv', 'output')` | `join(EXTRACTORS_ROOT, 'qwfwd', 'output')` | Standard output dir convention; Phase 1/2 create the extractor dirs here |
| 73 | `PROJECT_DEFAULT_BRANCH` | `'main'` | `'main'` | Unused sentinel (extract-tag never runs for these projects); `'main'` follows Go/C repo conventions and is less misleading than `''` |
| 88 | `PROJECT_VERSION_ALIASES` | `{}` | `{}` | No version aliases; frozen single-version snapshots |
| 102 | `PROJECT_HAS_ASSET_BUNDLE` | `false` | `false` | No asset bundle taxonomy for these tools; they have no client-side asset loading surface |
| 235 | `ENTITY_JSON_FILES` | `{ cvar: 'qtv-variables-ast.json', command: 'qtv-commands-ast.json' }` | `{ cvar: 'qwfwd-variables-ast.json', command: 'qwfwd-commands-ast.json', cmdline_param: 'qwfwd-cmdline-params-ast.json', info_key: 'qwfwd-info-keys-ast.json' }` | File naming follows the `<project>-<type>-ast.json` convention. QTV has cvars + commands. QWFWD has cvars + commands + cmdline_params + info_keys (D5). These filenames are only used if extract-tag drove the load, which it never does (D1); the entries are still filled for completeness and to unblock tsc |
| 282 | `ASSET_BUNDLE_FILE` | `''` | `''` | Unused sentinel; PROJECT_HAS_ASSET_BUNDLE is false for both -- same pattern as mvdsv/ktx/qwcl/qw |

**build-snapshot.ts (1 site):**

| Line | Constant | qtv value | qwfwd value | Reason |
|---|---|---|---|---|
| 685 | `PROJECT_DEFAULT_SNAPSHOT_VERSION` | `'head'` (provisional) | `'head'` (provisional) | Provisional sentinel only -- a non-nullable string is required to compile and no rows exist at this label until Phase 1/2 load. Phase 1/2 MUST update this to the real frozen version label (QWFWD_VERSION / QTV `*version`) once source recon pins it (D4). If build-snapshot runs before that, it returns empty-not-wrong output. See Q1. |

**diff-versions.ts (1 site):**

| Line | Constant | qtv value | qwfwd value | Reason |
|---|---|---|---|---|
| 51 | `PROJECT_SRC_PREFIX_FALLBACK` | `''` | `'src/'` | QTV is Go (no `src/` convention in the vendored tree -- `go.mod` is at root, packages under `pkg/` and `cmd/`; diff-versions is git-tree-aware but extract-tag never runs for these projects; `''` is safe). QWFWD C source is under `src/` (verified: `ls apps/slipgate-app/reference/qwfwd/` shows `src/`). diff-versions is only called for projects where extract-tag ran multi-version diffs; for qtv/qwfwd it will never be called (frozen single-version); the fallback is a no-op sentinel. |

**enrich-prs.ts (1 site):**

| Line | Constant | qtv value | qwfwd value | Reason |
|---|---|---|---|---|
| 14 | `PROJECT_REPOS` | `null` | `null` | No PR-enrichment flow for frozen vendored snapshots. Same pattern as `qwcl` and `qw`. D1 confirms these projects load via `load-version --json`, not `extract-tag`; the enrich step follows extract-tag. |

**load-release-notes.ts (1 site):**

| Line | Constant | qtv value | qwfwd value | Reason |
|---|---|---|---|---|
| 28 | `PROJECT_REPOS` | `null` | `null` | No release-notes ingestion for frozen snapshots; same rationale as enrich-prs. |

**Steps:**

- [ ] In `extract-tag.ts`, add the qtv and qwfwd entries to all 8 Record constants per the table above.
  - `PROJECT_REPO_PATH`: two new entries with the vendored paths.
  - `PROJECT_EXTRACTOR`: two new entries, both `null`.
  - `PROJECT_EXTRACTOR_OUTPUT_DIR`: two new entries with `scripts/extractors/<project>/output` paths.
  - `PROJECT_DEFAULT_BRANCH`: two new entries, both `'main'`.
  - `PROJECT_VERSION_ALIASES`: two new entries, both `{}`.
  - `PROJECT_HAS_ASSET_BUNDLE`: two new entries, both `false`.
  - `ENTITY_JSON_FILES`: two new entries per the table above.
  - `ASSET_BUNDLE_FILE`: two new entries, both `''`.
- [ ] In `build-snapshot.ts`, add `qtv: 'head'` and `qwfwd: 'head'` to `PROJECT_DEFAULT_SNAPSHOT_VERSION`. Add a comment: `// provisional; Phase 1/2 updates to the real version constant once source recon pins it`.
- [ ] In `diff-versions.ts`, add `qtv: ''` and `qwfwd: 'src/'` to `PROJECT_SRC_PREFIX_FALLBACK`. Add a comment: `// unused -- frozen single-version snapshots; extract-tag never runs for qtv/qwfwd (D1)`.
- [ ] In `enrich-prs.ts`, add `qtv: null` and `qwfwd: null` to `PROJECT_REPOS`. Add a comment: `// frozen vendored snapshots; no PR enrichment flow (D1)`.
- [ ] In `load-release-notes.ts`, add `qtv: null` and `qwfwd: null` to `PROJECT_REPOS`. Add a comment: `// frozen vendored snapshots; no release-notes flow (D1)`.
- [ ] Run `bunx tsc --noEmit`. It MUST exit 0. If any errors remain, fix them before proceeding.

**Execution mode:** `subagent (Sonnet medium)` -- multi-file edit across 5 files; requires judgment on correct values per site; clear spec with the table above.

---

### Task 4 -- Update SCHEMA.md

**Goal:** Document qtv and qwfwd as projects 6-7 in SCHEMA.md and reference migration 020.

**Files:** `apps/qw-oracle/SCHEMA.md`

**Steps:**

- [ ] In the **Conventions** section (around line 12), locate the sentence that lists `project` CHECK values:
  > `project` is one of `ezquake`, `fte`, `mvdsv`, `ktx`, `qwcl` (CHECK-constrained; all five populated post-KTX).
  
  Update it to read:
  > `project` is one of `ezquake`, `fte`, `mvdsv`, `ktx`, `qwcl`, `qwfwd`, `qtv` (CHECK-constrained; migration 020 added `qwfwd` and `qtv` as projects 6-7; all seven accepted post-migration). The `qw` namespace means "the game itself" -- content that exists outside any engine version arc. The `qw` tables (`maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`) have no `project` column; `qw` appears only in the `Project` TS union.

- [ ] In the **Identity layer / `versions`** section (around line 44), locate the `project` column row:
  > `project` | TEXT CHECK | `ezquake` / `fte` / `mvdsv` / `ktx` / `qwcl`
  
  Update it to:
  > `project` | TEXT CHECK | `ezquake` / `fte` / `mvdsv` / `ktx` / `qwcl` / `qwfwd` / `qtv` (migration 020)

- [ ] Near the top of the doc (around line 7, the doc-currency note), append a note after the existing currency block:
  > **Post-migration-020 note (2026-06-05):** `qwfwd` (C UDP forwarder, qqshka) and `qtv` (Go streaming proxy, QW-Group) added as projects 6-7. Migration `020_qtv_qwfwd_projects.sql` widens all 10 project CHECK clauses across 9 tables. Entity rows and versions rows load in Phase 1 (QWFWD) and Phase 2 (QTV) of the QTV + QWFWD L1 extraction arc.

**Execution mode:** `inline` -- pure markdown text edits; full replacement content above makes the change unambiguous; no code logic.

---

## Verification (phase boundary)

The operator runs each of these after Task 1-4 complete. All are Postgres; none depend on a later phase.

### V1 -- Migration applies clean

```bash
bun db/migrate.ts
```

Expected output includes the line:
```
[migrate] applying 020_qtv_qwfwd_projects.sql
```
followed by:
```
[migrate] up-to-date (20 migration(s) total, 1 newly applied)
```

PASS condition: exit 0 and the log line above appears.
FAIL condition: any error, in particular `Migration ... was modified after it was applied` (which would mean a prior migration was edited -- do not touch 002).

### V2 -- Constraint introspection shows 10 widened clauses

```sql
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%project%'
ORDER BY tbl::text, conname;
```

PASS condition: exactly 10 rows returned; every `pg_get_constraintdef` value contains both `'qwfwd'` and `'qtv'` in the IN-list.
FAIL condition: fewer than 10 rows (a clause was missed), or any row still shows the old 5-item list (migration did not apply to that table).

### V3 -- TypeScript compiles clean

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: exit 0, no output.
FAIL condition: any type error referencing `Record<Project>` (means a site was missed in Task 3).

### V4 -- Dummy entities insert test (CHECK smoke, then rollback)

Run this in psql (or any Postgres client). The `BEGIN` / `ROLLBACK` ensure no data is committed.

```sql
BEGIN;

-- Must succeed: qtv is now a valid project value
INSERT INTO versions (project, version, commit_sha, ordinal, parse_state, extracted_at)
VALUES ('qtv', 'smoke-test', 'deadbeef', 1, 'ok', now());

INSERT INTO entities (project, type, name, canonical_id,
                      first_seen_version, last_seen_version,
                      source_state, created_at, updated_at)
VALUES ('qtv', 'cvar', 'smoke_cvar', 'qtv:cvar:smoke_cvar',
        'smoke-test', 'smoke-test', 'source_backed', now(), now());

-- Must succeed: qwfwd is now a valid project value
INSERT INTO versions (project, version, commit_sha, ordinal, parse_state, extracted_at)
VALUES ('qwfwd', 'smoke-test', 'deadbeef', 1, 'ok', now());

INSERT INTO entities (project, type, name, canonical_id,
                      first_seen_version, last_seen_version,
                      source_state, created_at, updated_at)
VALUES ('qwfwd', 'cvar', 'smoke_cvar', 'qwfwd:cvar:smoke_cvar',
        'smoke-test', 'smoke-test', 'source_backed', now(), now());

ROLLBACK;
```

PASS condition: all four INSERTs succeed; ROLLBACK completes cleanly; no rows remain in `versions` or `entities` for `project IN ('qtv','qwfwd')` after rollback.
FAIL condition: any INSERT raises `ERROR: new row for relation "..." violates check constraint` -- means the migration did not widen that table's CHECK.

### V5 -- Bogus project is still rejected

```sql
BEGIN;
INSERT INTO entities (project, type, name, canonical_id,
                      first_seen_version, last_seen_version,
                      source_state, created_at, updated_at)
VALUES ('bogus', 'cvar', 'x', 'bogus:cvar:x', 'v1', 'v1', 'source_backed', now(), now());
ROLLBACK;
```

PASS condition: INSERT raises `ERROR: new row for relation "entities" violates check constraint "entities_project_check"`.
FAIL condition: INSERT succeeds (CHECK constraint is absent or too permissive).

### V6 -- Migration is recorded in schema_migrations

```sql
SELECT filename, applied_at
FROM schema_migrations
WHERE filename = '020_qtv_qwfwd_projects.sql';
```

PASS condition: exactly 1 row returned.
FAIL condition: 0 rows (migration ran in a session that did not commit, or migrate.ts was bypassed).

### V7 -- Migration is re-entrant (idempotency sanity)

```bash
bun db/migrate.ts
```

Run a second time after V1. Expected output:
```
[migrate] up-to-date (20 migration(s) total, 0 newly applied)
```

PASS condition: exit 0; `0 newly applied`.
FAIL condition: any error (sha256 mismatch would mean the file was edited after V1 applied it).

## Outputs to next phase

After Phase 0:
- Postgres schema accepts `project IN ('qtv','qwfwd')` on all 10 CHECK columns.
- `bunx tsc --noEmit` is green with the widened union and all 12 Record sites filled.
- `SCHEMA.md` documents qtv/qwfwd as projects 6-7.
- `versions` rows for qtv and qwfwd do NOT yet exist. Phase 1 (`load-version` for QWFWD) creates the QWFWD `versions` row on first call to `upsertVersion` (inside `loadVersion` in `load-version.ts:466`). Phase 2 does the same for QTV.
- `PROJECT_DEFAULT_SNAPSHOT_VERSION` in `build-snapshot.ts` uses `'head'` as a provisional placeholder for both projects. Phase 1 must update `qtv: 'head'` and `qwfwd: 'head'` to the real version label (e.g. `qwfwd: '0.91'`, `qtv: '0.x.y'`) once source recon pins the internal version constant.

## Open questions / deferred items

**Q1 -- `PROJECT_DEFAULT_SNAPSHOT_VERSION` provisional value**
The version label for qtv/qwfwd in `build-snapshot.ts` is set to `'head'` as a placeholder. This is correct for Phase 0 -- no rows exist at this label. Phase 1 and Phase 2 MUST update this to the real version string (QWFWD_VERSION for qwfwd, the `*version` cvar string for qtv) after source recon. If Phase 1/2 drafters forget, `build-snapshot --project qwfwd` will return empty output instead of an error, which is silent but not corrupting. Flag for Phase 1/2 drafter.
Default chosen: `'head'` (produces empty output, not wrong output).
Who can resolve: Phase 1 drafter (QWFWD version) and Phase 2 drafter (QTV version).

**Q2 -- versions-row creation: Phase 0 does NOT pre-insert; confirmed by live recon**
`load-version.ts:466` calls `upsertVersion(tx, {...})` as the first operation inside the `sql.begin` transaction, before any entity upserts. `upsertVersion` in `natural-keys.ts:77-88` is an `INSERT...ON CONFLICT DO UPDATE` -- it creates the row on first call. Phase 0 therefore does NOT need to pre-insert `versions` rows. The constraint verification is handled by V4 above (rolled-back dummy `entities` insert probes the CHECK without needing a `versions` row, since `versions.project` is also CHECK-constrained and the V4 script inserts into `versions` first as part of the same transaction).
Default chosen: no pre-insert task.
Who can resolve: resolved; no operator action needed.

**Q3 -- `ENTITY_JSON_FILES` for QTV: cvar_alias type**
QTV's extractor may emit `cvar_alias` entries if the Go QTV config has any pass-through semantics resembling cross-project aliasing. This is unlikely (QTV is a standalone tool, not an engine port) but was not verified. The Phase-0 entry for `ENTITY_JSON_FILES.qtv` does not include `cvar_alias`. If Phase 2 discovers alias-type entries, that entry can be added then.
Default chosen: no `cvar_alias` entry in qtv's ENTITY_JSON_FILES.
Who can resolve: Phase 2 drafter (extractor output determines this).

**Q4 -- `--ordinal` is required for Phase 1/2 first-time loads**
`resolveOrdinal` in `index.ts` throws `'--ordinal is required for tagged versions not yet in the versions table'` for any non-`head` version that does not already exist in the `versions` table (verified: `index.ts:170`). Phase 1/2 must pass `--ordinal <n>` on the first `load-version` call for each tool. This is an advisory for Phase 1/2 drafters to note in their Inputs/steps -- the `--ordinal` flag is needed because there is no prior row to look up.
Default chosen: not applicable to Phase 0.
Who can resolve: Phase 1 drafter (note in their load-version step instructions).

**Q5 -- Sub-agent dispatch note**
The Agent tool for dispatching a `subagent_type=Explore` sub-agent was not available in this session. The verification checks were performed directly by reading/grepping live source files against the draft. Findings:

CRITICAL: 0
SUBSTANTIVE: 0
ADVISORY: 3

Advisory A1: The migration SQL draft initially included explicit `BEGIN`/`COMMIT`. The `db/migrate.ts` migrator wraps each migration in `sql.begin()` (verified: `migrate.ts:48`); no other migration uses explicit `BEGIN;` (verified by grep). An explicit inner `COMMIT` inside `sql.begin` would close the migrator's outer transaction prematurely. Resolved inline: the migration in Task 1 has no `BEGIN`/`COMMIT`.

Advisory A2: `PROJECT_DEFAULT_SNAPSHOT_VERSION` provisional `'head'` value in `build-snapshot.ts` -- the Phase 1/2 update obligation is not tracked in HANDOVER. Accepted: captured in Q1 and "Outputs to next phase." No operator gate.

Advisory A3: `extract-tag.ts:338-343` error message says "Only ezquake is wired in the first ship; FTE/MVDSV/KTX require their own extractors." When `PROJECT_EXTRACTOR.qtv/qwfwd` are set to `null`, calling extract-tag for these projects will throw this message, which is misleading (it won't name qtv/qwfwd). This is cosmetic; D1 says extract-tag must throw on null extractor, which is correct behavior. Phase 1/2 ops docs can note this error text is expected.

All three advisories resolved inline or noted for Phase 1/2 drafters. No CRITICAL or SUBSTANTIVE findings. No operator gate required.

## Recovery (if verification fails)

- **V1 fails with `Migration ... was modified` for file 002:** Someone edited `002_layer1_schema.sql`. Do NOT proceed. Restore `002` from git history (`git checkout HEAD -- apps/qw-oracle/db/migrations/002_layer1_schema.sql`). Re-run V1.
- **V1 fails with `DROP CONSTRAINT` error on a constraint name:** The real constraint name differs from the assumed `<table>_<col>_check` default. Re-run the catalog introspection query (Task 1 step 1) against the live DB, extract the real names, edit `020` to use the real names, and re-run `bun db/migrate.ts`. Since `020` was never successfully applied, the sha256 guard is not triggered -- editing it at this point is safe.
- **V2 shows fewer than 10 rows:** One or more tables was missed. Re-check the migration against the D2 table in `decisions.md`. Add the missing `ALTER TABLE` pair to `020` (the migration was NOT applied yet for the missing table -- `020` itself is rolled back on any error within `sql.begin`), re-run `bun db/migrate.ts`.
- **V3 fails with type errors:** A Record site was missed or has the wrong value type. The error message names the file and line. Fix the specific site and re-run `bunx tsc --noEmit`.
- **V4 fails with a CHECK violation for `qtv` or `qwfwd`:** The migration did not widen that specific table. Confirm V2 shows the right constraint for that table; if not, see V2 recovery path.
- **V5 passes (no error for `bogus`):** The entities CHECK constraint is missing or too broad. Run V2 to confirm the constraint exists. If present, confirm the `project IN (...)` list does not contain a wildcard. This should not happen with a correct migration.
