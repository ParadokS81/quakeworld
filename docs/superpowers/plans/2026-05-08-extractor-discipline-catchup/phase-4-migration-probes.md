# Phase 4 -- Per-migration validation probes

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). [DONE]
> 2. Read `review-findings.md` (no F-entries yet). [DONE]
> 3. Read parking doc Pass 1.2.2 + Pass 2.3. [DONE]
> 4. Source-walk: VALIDATION-RUNBOOK.md inline SQL for 009/010/011; idempotency.ts shape; index.ts dispatcher. [DONE]
> 5. Read all 12 migration files 001-012. [DONE]
> 6. Dispatch verification sub-agent after drafting. [DONE -- 1 SUBSTANTIVE applied: DATABASE_URL pre-flight guard added to runner spec + verification step 8]

## Goal

Ships two new files: `apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` (CI-ready runner mirroring the `idempotency.ts` CLI shape) and `apps/qw-oracle/db/migration-probes.ts` (explicit probe registry mapping each of the 12 migration filenames to a probe function). Each probe asserts the migration's invariants -- table/column/index existence, CHECK reachability via sentinel insert-and-rollback, seed value presence -- in approximately 10 lines of TS per migration. Coverage: retroactive probes for migrations 001-008, mechanical port of the VALIDATION-RUNBOOK's inline SQL for 009/010/011, and a new probe for 012. Adding `case 'migration-probes':` to `scripts/load-knowledge/index.ts` wires the gate into the standard dispatcher. Migrations are GLOBAL (not per-project), so there is no `--project` flag; `--migration NNN` (optional) filters to a single probe by 3-digit prefix. Runnable state at phase end: `bun run load-knowledge -- migration-probes` runs all 12 probes against the current dev DB and exits 0; `bun run load-knowledge -- migration-probes --migration 009` runs a single probe.

## Inputs from previous phase

Phase 2 complete: `apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts` shipped; `case 'reproducibility-check':` registered in `index.ts`; `runReproducibilityCli` export available. 5-project catch-up audit (ezquake / fte / qwcl / mvdsv / ktx) all PASS. Phase 2's drain-now fixes (git diff scoped to output/ dir; `extractResult.stderr` optional chaining) committed in the same phase commit.

Confirmed by recon: `apps/qw-oracle/db/migrations/` contains exactly 12 files (001_init.sql through 012_description_origin.sql). VALIDATION-RUNBOOK at `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` carries inline positive- and negative-shape SQL for migrations 009, 010, 011 in the "KTX-specific validation -- Per-migration validation probes" section.

## Files touched

### Created

```
apps/qw-oracle/scripts/load-knowledge/migration-probes.ts   # CLI runner (mirrors idempotency.ts shape)
apps/qw-oracle/db/migration-probes.ts                       # probe registry: migration filename -> probe fn
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/index.ts              # add case 'migration-probes' + lazy wrapper + usage entry
```

### Deleted

n/a

## Tasks

### Task 1 -- Runner + registry skeleton

**Goal:** Author the complete runner file and the registry skeleton with interface definitions and 12 stub probe functions. Tasks 2-5 replace each stub with a real implementation.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` (create)
- `apps/qw-oracle/db/migration-probes.ts` (create)

**Steps:**

- [ ] Create `apps/qw-oracle/db/migration-probes.ts` first (runner imports from it; no circular import):

```typescript
// apps/qw-oracle/db/migration-probes.ts
//
// Per-migration probe registry. Maps each migration filename to a probe
// function that asserts the migration's invariants against the live DB.
// Explicit registry (not auto-discovery) per Pass 1.2.2: explicit probes
// force the migration author to think about validation.
//
// Run via: bun run load-knowledge -- migration-probes [--migration NNN]
//
// JSONB binding (D12): sentinel inserts that write JSONB columns MUST
// pass JS values directly (e.g. [], {}, sql.json(v)).
// NEVER pre-stringify with JSON.stringify(...) and bind as TEXT.

import type postgres from 'postgres';

export interface MigrationProbeResult {
  migration: string;
  status: 'PASS' | 'FAIL';
  findings: string[];
}

export type MigrationProbeFn = (sql: postgres.Sql) => Promise<MigrationProbeResult>;

// Stubs -- Tasks 2-5 replace each with a real implementation.
// Keys are migration filenames; insertion order = probe run order.
export const MIGRATION_PROBES: Record<string, MigrationProbeFn> = {
  '001_init.sql':                              async (_s) => ({ migration: '001_init.sql',                              status: 'PASS', findings: [] }),
  '002_layer1_schema.sql':                     async (_s) => ({ migration: '002_layer1_schema.sql',                     status: 'PASS', findings: [] }),
  '003_layer1_entities_search.sql':            async (_s) => ({ migration: '003_layer1_entities_search.sql',            status: 'PASS', findings: [] }),
  '004_layer2_chat.sql':                       async (_s) => ({ migration: '004_layer2_chat.sql',                       status: 'PASS', findings: [] }),
  '005_layer3_concepts.sql':                   async (_s) => ({ migration: '005_layer3_concepts.sql',                   status: 'PASS', findings: [] }),
  '006_embedding_api_log.sql':                 async (_s) => ({ migration: '006_embedding_api_log.sql',                 status: 'PASS', findings: [] }),
  '007_query_log.sql':                         async (_s) => ({ migration: '007_query_log.sql',                         status: 'PASS', findings: [] }),
  '008_community_schema.sql':                  async (_s) => ({ migration: '008_community_schema.sql',                  status: 'PASS', findings: [] }),
  '009_ktx_log_template_logfile_channel.sql':  async (_s) => ({ migration: '009_ktx_log_template_logfile_channel.sql', status: 'PASS', findings: [] }),
  '010_ktx_match_event_type.sql':              async (_s) => ({ migration: '010_ktx_match_event_type.sql',              status: 'PASS', findings: [] }),
  '011_ktx_gameplay_kinds.sql':                async (_s) => ({ migration: '011_ktx_gameplay_kinds.sql',                status: 'PASS', findings: [] }),
  '012_description_origin.sql':                async (_s) => ({ migration: '012_description_origin.sql',                status: 'PASS', findings: [] }),
};
```

- [ ] Create `apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` (full content):

```typescript
// apps/qw-oracle/scripts/load-knowledge/migration-probes.ts
//
// Universal per-migration validation probe runner. Dispatches probe
// functions from db/migration-probes.ts registry. Each probe asserts
// the invariants introduced by its migration (table/column/index
// existence, CHECK reachability, seed values). Migrations are GLOBAL
// (not per-project), so there is no --project flag; --migration NNN
// filters to a single probe by 3-digit prefix (e.g. 009 or 9).
//
// Per docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/
// decisions.md:
//   D2  -- CI-readiness conventions (--migration / --json / --help,
//           env-var driven DATABASE_URL, exit 0 PASS / non-zero FAIL).
//   D3  -- No per-project config (migrations are global; n/a).
//   D4  -- Dispatcher case mirrors quality-grid pattern.
//   D6  -- Phase commit body captures audit findings.
//   D12 -- JSONB binding: probe sentinel inserts pass JS values
//           directly; never JSON.stringify(...) to TEXT.
//
// Run:
//   bun run load-knowledge -- migration-probes
//   bun run load-knowledge -- migration-probes --migration 009
//   bun run load-knowledge -- migration-probes --json
//   bun run load-knowledge -- migration-probes --help

import { parseArgs } from 'util';
import type postgres from 'postgres';
import { sql } from './db.js';
import {
  MIGRATION_PROBES,
  type MigrationProbeResult,
  type MigrationProbeFn,
} from '../../db/migration-probes.js';

export type { MigrationProbeResult, MigrationProbeFn };

export async function runMigrationProbes(opts: {
  sql: postgres.Sql;
  migration?: string;
}): Promise<MigrationProbeResult[]> {
  const names = Object.keys(MIGRATION_PROBES);
  let targets: string[];
  if (opts.migration !== undefined) {
    const padded = opts.migration.padStart(3, '0');
    targets = names.filter((k) => k.startsWith(padded + '_'));
    if (targets.length === 0) {
      throw new Error(
        `no probe found for --migration ${opts.migration}; ` +
        `expected a key starting with '${padded}_' in the registry`,
      );
    }
  } else {
    targets = names;
  }
  const results: MigrationProbeResult[] = [];
  for (const name of targets) {
    process.stderr.write(`[migration-probes] ${name}...\n`);
    const probe = MIGRATION_PROBES[name]!;
    const result = await probe(opts.sql);
    results.push(result);
  }
  return results;
}

function formatJson(results: MigrationProbeResult[]): string {
  return JSON.stringify(results, null, 2);
}

function formatText(results: MigrationProbeResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`=== ${r.migration}: ${r.status} ===`);
    for (const f of r.findings) {
      lines.push(`  FAIL: ${f}`);
    }
  }
  return lines.join('\n');
}

function printHelp(): void {
  process.stderr.write(`
load-knowledge -- migration-probes [options]

Assert each migration's invariants (table/column/index existence,
CHECK reachability, seed values). Migrations are GLOBAL; no --project flag.

Options:
  --migration <NNN>  Run probe for a single migration by 3-digit prefix
                     (e.g. --migration 009 or --migration 9). Omit to
                     run all 12 probes.
  --json             Emit JSON-formatted results to stdout.
  --help             Print this help and exit.

Exit codes:
  0   all targeted probes PASS, OR --help requested.
  1   one or more probes FAIL; review output for findings.
  2   invalid --migration prefix (no matching probe in registry).

Required env: DATABASE_URL
  (default postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle)
`.trim() + '\n');
}

export async function runMigrationProbesCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      migration: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // D2: fail early with a clear message rather than a postgres connection error
  if (!process.env.DATABASE_URL) {
    process.stderr.write('ERROR: DATABASE_URL is not set\n');
    process.exit(1);
  }

  let results: MigrationProbeResult[];
  try {
    results = await runMigrationProbes({ sql, migration: values.migration });
  } catch (e) {
    process.stderr.write((e instanceof Error ? e.message : String(e)) + '\n');
    process.exit(2);
  }

  if (values.json) {
    process.stdout.write(formatJson(results) + '\n');
  } else {
    process.stdout.write(formatText(results) + '\n');
  }

  const failed = results.some((r) => r.status === 'FAIL');
  process.exitCode = failed ? 1 : 0;
}
```

**Verification:**
- `ls apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` exists.
- `ls apps/qw-oracle/db/migration-probes.ts` exists.
- `cd apps/qw-oracle && bunx tsc --noEmit` exits 0 (stubs typecheck).

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across 2 files; spec fully inlined above; mirrors idempotency.ts shape; D2/D3/D4 conventions apply.

---

### Task 2 -- Per-migration probes: group A (001, 002, 003)

**Goal:** Replace the three stubs in `db/migration-probes.ts` for migrations 001, 002, 003 with real probe implementations.

**Files:**
- `apps/qw-oracle/db/migration-probes.ts` (modify: replace stubs for 001, 002, 003)

**Steps:**

- [ ] Read `apps/qw-oracle/db/migrations/001_init.sql`, `002_layer1_schema.sql`, `003_layer1_entities_search.sql`.

- [ ] Implement probe for `001_init.sql`. Invariants:

  1. `embedding_metadata` table exists: `SELECT to_regclass('embedding_metadata') IS NOT NULL AS r` -> r = true.
  2. `oracle_meta` table exists: same pattern.
  3. `oracle_meta` has a `schema_version` key row: `SELECT count(*)::int AS n FROM oracle_meta WHERE key='schema_version'` -> n >= 1.
  4. `embedding_metadata` singleton CHECK (id=1): attempt INSERT with id=2 inside a `s.begin()` block; expect any thrown error (CHECK violation or PK conflict). If no error thrown before rollback, that is a FAIL.

  Pattern for singleton CHECK probe:
  ```typescript
  let singletonEnforced = false;
  try {
    await s.begin(async (tx) => {
      await tx`INSERT INTO embedding_metadata (id, model_name, model_version, dimension, rows_embedded)
               VALUES (2, 'probe', '1', 1024, 0)`;
    });
  } catch {
    singletonEnforced = true;
  }
  if (!singletonEnforced) findings.push('embedding_metadata: singleton constraint did not reject id=2');
  ```

- [ ] Implement probe for `002_layer1_schema.sql`. Invariants:

  1. `entities` table exists.
  2. `versions` table exists.
  3. `cvar_versions` table exists.
  4. Positive sentinel: INSERT into entities succeeds then rolls back. Use rollback-throw pattern:
     ```typescript
     let positiveOk = false;
     try {
       await s.begin(async (tx) => {
         await tx`INSERT INTO entities
                   (project, type, name, canonical_id, source_state,
                    first_seen_version, last_seen_version, created_at, updated_at)
                  VALUES ('ezquake','cvar','STUB_M002_POS','ezquake:cvar:STUB_M002_POS',
                          'source_backed','head','head',now(),now())`;
         positiveOk = true;
         throw new Error('probe:rollback');
       });
     } catch (e) {
       if (e instanceof Error && e.message !== 'probe:rollback') {
         findings.push(`entities positive insert failed: ${e.message}`);
         positiveOk = false;
       }
     }
     if (!positiveOk) findings.push('entities: positive sentinel INSERT did not succeed before rollback');
     ```
  5. Negative sentinel: INSERT into entities with `type='nonexistent_type_xyz'` -> expect any error (CHECK violation).
     ```typescript
     let negRejected = false;
     try {
       await s.begin(async (tx) => {
         await tx`INSERT INTO entities
                   (project, type, name, canonical_id, source_state,
                    first_seen_version, last_seen_version, created_at, updated_at)
                  VALUES ('ezquake','nonexistent_type_xyz','STUB_M002_NEG',
                          'ezquake:nonexistent_type_xyz:STUB_M002_NEG',
                          'source_backed','head','head',now(),now())`;
       });
     } catch {
       negRejected = true;
     }
     if (!negRejected) findings.push('entities.type CHECK did not reject nonexistent_type_xyz');
     ```

  Note: entities.type CHECK was widened by migrations 009 and 010 to include 'log_template' and 'match_event'. The probe uses 'nonexistent_type_xyz' which will never be in any CHECK value set.

- [ ] Implement probe for `003_layer1_entities_search.sql`. Invariants (all structural; no sentinel inserts needed):

  1. `entities.description` column exists: `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='entities' AND column_name='description'` -> n = 1.
  2. `entities.description_tsv` generated column exists: same, column_name='description_tsv'.
  3. `entities.description_embedding` vector column exists: same, column_name='description_embedding'.
  4. GIN index `entities_desc_tsv_gin` exists: `SELECT count(*)::int AS n FROM pg_indexes WHERE tablename='entities' AND indexname='entities_desc_tsv_gin'` -> n = 1.
  5. HNSW index `entities_desc_embedding_hnsw` exists: same, indexname='entities_desc_embedding_hnsw'.

- [ ] Edit `apps/qw-oracle/db/migration-probes.ts` to replace the three stubs with the real implementations. Each replacement preserves the registry key name exactly.

**Verification:**
- `cd apps/qw-oracle && bunx tsc --noEmit` exits 0.
- `bun run load-knowledge -- migration-probes --migration 001` exits 0 (PASS).
- `bun run load-knowledge -- migration-probes --migration 002` exits 0.
- `bun run load-knowledge -- migration-probes --migration 003` exits 0.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; probe specs fully inlined above; D12 n/a (probes 001-003 contain no JSONB sentinel writes).

---

### Task 3 -- Per-migration probes: group B (004, 005, 006)

**Goal:** Replace stubs for migrations 004, 005, 006 with real implementations.

**Files:**
- `apps/qw-oracle/db/migration-probes.ts` (modify: replace stubs for 004, 005, 006)

**Steps:**

- [ ] Read `apps/qw-oracle/db/migrations/004_layer2_chat.sql`, `005_layer3_concepts.sql`, `006_embedding_api_log.sql`.

- [ ] Implement probe for `004_layer2_chat.sql`. Invariants:

  1. `messages` table exists.
  2. `sessions` table exists.
  3. `session_search` table exists.
  4. Positive sentinel: INSERT into messages with `platform='discord'`, `message_type='message'` + rollback-throw.
     Minimum required fields: `id='STUB_M004_POS'`, `platform='discord'`, `channel_name='#probe'`, `author_name='probe'`, `content=''`, `source='probe'`, `created_at=now()`, `imported_at=now()`.
  5. Negative sentinel: INSERT into messages with `platform='irc'` -> expect CHECK violation (any error = PASS).
     Use same stub fields as above with `id='STUB_M004_NEG'`, swap platform to 'irc'.

- [ ] Implement probe for `005_layer3_concepts.sql`. Invariants:

  1. `concepts` table exists.
  2. `concept_chunks` table exists.
  3. `redirect_targets` table exists.
  4. `concept_chunks.embedding` column exists: `information_schema.columns WHERE table_name='concept_chunks' AND column_name='embedding'` -> 1 row.
  5. GIN index `concept_chunks_tsv_gin` exists: `pg_indexes WHERE tablename='concept_chunks' AND indexname='concept_chunks_tsv_gin'` -> 1 row.

- [ ] Implement probe for `006_embedding_api_log.sql`. Invariants:

  1. `embedding_api_log` table exists.
  2. Positive sentinel: INSERT with `source='loader'`, `model='probe'`, `input_tokens=1` + rollback-throw.
  3. Negative sentinel: INSERT with `source='nonexistent_source'` -> expect CHECK violation.

- [ ] Edit `apps/qw-oracle/db/migration-probes.ts` to replace stubs 004, 005, 006.

**Verification:**
- `cd apps/qw-oracle && bunx tsc --noEmit` exits 0.
- `bun run load-knowledge -- migration-probes --migration 004` exits 0.
- `bun run load-knowledge -- migration-probes --migration 005` exits 0.
- `bun run load-knowledge -- migration-probes --migration 006` exits 0.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; probe specs fully inlined; D12 n/a (no JSONB sentinel writes in 004-006 probes).

---

### Task 4 -- Per-migration probes: group C (007, 008, 009)

**Goal:** Replace stubs for migrations 007, 008, 009 with real implementations.

**Files:**
- `apps/qw-oracle/db/migration-probes.ts` (modify: replace stubs for 007, 008, 009)

**Steps:**

- [ ] Read `apps/qw-oracle/db/migrations/007_query_log.sql`, `008_community_schema.sql`, `009_ktx_log_template_logfile_channel.sql`.
- [ ] Read `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` KTX-specific section -- migration 009 positive and negative shape SQL blocks.

- [ ] Implement probe for `007_query_log.sql`. Invariants:

  1. `query_log` table exists.
  2. Positive sentinel: INSERT with `tool='probe'`, `match_quality='strong'` + rollback-throw.
  3. Positive sentinel (NULL allowed): INSERT with `tool='probe'`, `match_quality=null` + rollback-throw. (The CHECK allows NULL.)
  4. Negative sentinel: INSERT with `tool='probe'`, `match_quality='invalid_quality'` -> expect CHECK violation.

- [ ] Implement probe for `008_community_schema.sql`. Invariants:

  1. `community.players` table exists: `to_regclass('community.players') IS NOT NULL`.
  2. `community.clans` table exists.
  3. `community.tournaments` table exists.
  4. Positive sentinel: INSERT into `community.players` with `slug='STUB_M008_POS'`, `title='Stub'`, `has_note=false`, `is_substantive=false`, `is_stub=true` + rollback-throw.
  5. Negative sentinel: INSERT into `community.players` with `slug='STUB_M008_NEG'`, `title='Stub'`, `has_note=false`, `is_substantive=false`, `is_stub=true`, `status='InvalidStatus'` -> expect CHECK violation.

- [ ] Implement probe for `009_ktx_log_template_logfile_channel.sql`. Mechanical port of the RUNBOOK's positive-shape and negative-shape SQL blocks. Invariants:

  1. Positive sentinel (channel='logfile' admitted):
     In a single `s.begin()` block:
     - INSERT stub entity: `project='ktx'`, `type='log_template'`, `name='STUB_M009_POS'`, `canonical_id='ktx:log_template:STUB_M009_POS'`, `source_state='source_backed'`, `first_seen_version='head'`, `last_seen_version='head'`, `created_at=now()`, `updated_at=now()`.
     - INSERT into `log_template_versions` (SELECT entity id from the stub just inserted): `version='head'`, `channel='logfile'`, `format_string='STUB'`, `format_string_normalized='stub'`, `source_file='stub.c'`, `source_line=1`, `all_call_sites_json=[]` (D12: JS empty array, NOT `JSON.stringify([])`), `extracted_at=now()`.
     - Throw 'probe:rollback'.
     - PASS condition: both INSERTs succeed before rollback.
  2. Negative sentinel (channel='nonexistent_channel' rejected):
     In a separate `s.begin()` block:
     - Same stub entity INSERT (name='STUB_M009_NEG') + log_template_versions INSERT with `channel='nonexistent_channel'`.
     - Expect any error (CHECK violation on channel).

  **D12 JSONB binding for probe 009:** `all_call_sites_json` is a JSONB column in `log_template_versions`. Pass the JS empty array `[]` directly as the parameter interpolated into the postgres-js template literal (e.g., `${[]}`). Do NOT use `JSON.stringify([])` which stores a JSONB string scalar and trips `F1.jsonb_columns_not_strings`.

- [ ] Edit `apps/qw-oracle/db/migration-probes.ts` to replace stubs 007, 008, 009.

**Verification:**
- `cd apps/qw-oracle && bunx tsc --noEmit` exits 0.
- `bun run load-knowledge -- migration-probes --migration 007` exits 0.
- `bun run load-knowledge -- migration-probes --migration 008` exits 0.
- `bun run load-knowledge -- migration-probes --migration 009` exits 0.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; 009 is mechanical port from RUNBOOK SQL; D12 applies to probe 009 (`all_call_sites_json` JSONB: pass `[]` directly).

---

### Task 5 -- Per-migration probes: group D (010, 011, 012)

**Goal:** Replace stubs for migrations 010, 011, 012 with real implementations.

**Files:**
- `apps/qw-oracle/db/migration-probes.ts` (modify: replace stubs for 010, 011, 012)

**Steps:**

- [ ] Read `apps/qw-oracle/db/migrations/010_ktx_match_event_type.sql`, `011_ktx_gameplay_kinds.sql`, `012_description_origin.sql`.
- [ ] Read VALIDATION-RUNBOOK migration 010 and 011 positive/negative shape SQL blocks.

- [ ] Implement probe for `010_ktx_match_event_type.sql`. Mechanical port of RUNBOOK SQL. Invariants:

  1. `match_event_versions` table exists: `to_regclass('match_event_versions') IS NOT NULL`.
  2. Exactly 3 indexes on `match_event_versions`: `SELECT count(*)::int AS n FROM pg_indexes WHERE tablename='match_event_versions'` -> n = 3 (PK index `match_event_versions_pkey` + `idx_match_event_versions_complex_type` + `idx_match_event_versions_xsd_version`).
  3. Positive sentinel (`type='match_event'` admitted, `match_event_versions` row inserts):
     In one `s.begin()` block:
     - INSERT entity: `project='ktx'`, `type='match_event'`, `name='STUB_M010_POS'`, `canonical_id='ktx:match_event:STUB_M010_POS'`, `source_state='source_backed'`, `first_seen_version='head'`, `last_seen_version='head'`, `created_at=now()`, `updated_at=now()`.
     - INSERT into `match_event_versions` (using the stub entity id): `version='head'`, `event_name='pick_mapitem'`, `complex_type='mapitemtype'`, `attributes_json=[{name:'item_name',type:'xs:string',constraint:null}]` (D12: JS array directly), `xsd_path='resources/extralog/ktxlog_0.1.xsd'`, `extracted_at=now()`.
     - Throw 'probe:rollback'.
  4. Negative sentinel (`type='nonexistent_type_xyz'` rejected):
     INSERT entity with `type='nonexistent_type_xyz'` -> expect CHECK violation.

  **D12 JSONB binding for probe 010:** `attributes_json` and `emission_call_sites_json` are JSONB in `match_event_versions`. For `attributes_json`, pass the JS array `[{ name: 'item_name', type: 'xs:string', constraint: null }]` directly. If `emission_call_sites_json` is provided, pass `[]` directly.

- [ ] Implement probe for `011_ktx_gameplay_kinds.sql`. Mechanical port of RUNBOOK SQL. Invariants:

  1. Pre-flight: `SELECT count(*)::int AS n FROM gameplay_sources WHERE id='ktx'` -> n = 1. If 0, finding: 'gameplay_sources ktx row missing; KTX Phase 1 onboarding prerequisite not met'. Short-circuit remaining assertions (skip sentinel inserts that would fail on FK).
  2. Positive sentinel (`kind='monster'` in `gameplay_entity_defs`):
     `s.begin()` block: INSERT `(gameplay_source_id='ktx', kind='monster', name='STUB_M011_MONSTER', source_ref='stub.c:1', ruleset_gate_json={}, props_json={})` (D12: JS `{}` for JSONB columns) + throw 'probe:rollback'.
  3. Positive sentinel (7 new `gameplay_mechanics.kind` values):
     Single `s.begin()` block: for each of the 7 kind values `['game_mode','election_type','score_system','drop_item','loc_macro','teamplay_message','mode_default']`, INSERT `(gameplay_source_id='ktx', kind=k, name='STUB_M011_'+k, source_ref='stub.c:1', ruleset_gate_json={}, props_json={})` (D12: JS `{}` directly). After all 7 inserts, throw 'probe:rollback'. Track how many succeed; expect 7.
  4. Negative sentinel (`kind='nonexistent_kind_xyz'` in `gameplay_entity_defs`):
     INSERT with `kind='nonexistent_kind_xyz'` -> expect CHECK violation.
  5. Negative sentinel (`kind='nonexistent_kind_xyz'` in `gameplay_mechanics`):
     INSERT with `kind='nonexistent_kind_xyz'` -> expect CHECK violation.

  **D12 JSONB binding for probe 011:** `ruleset_gate_json` and `props_json` in both `gameplay_entity_defs` and `gameplay_mechanics` are JSONB. Pass JS `{}` directly (not `JSON.stringify({})`).

- [ ] Implement probe for `012_description_origin.sql`. Invariants:

  1. `entities.description_origin` column exists: `information_schema.columns WHERE table_name='entities' AND column_name='description_origin'` -> 1 row.
  2. Backfill completeness: `SELECT count(*)::int AS n FROM entities WHERE description IS NOT NULL AND description_origin IS NULL` -> n = 0. If n > 0, finding: 'description_origin NULL for N rows with non-NULL description; backfill gap or deriver not setting origin'.
  3. Valid-values spot-check (guards against invalid values; no CHECK on this column): `SELECT count(*)::int AS n FROM entities WHERE description_origin IS NOT NULL AND description_origin NOT IN ('help_json','source_inline','inherited','synthesized')` -> n = 0.

- [ ] Edit `apps/qw-oracle/db/migration-probes.ts` to replace stubs 010, 011, 012.

**Verification:**
- `cd apps/qw-oracle && bunx tsc --noEmit` exits 0.
- `bun run load-knowledge -- migration-probes --migration 010` exits 0.
- `bun run load-knowledge -- migration-probes --migration 011` exits 0.
- `bun run load-knowledge -- migration-probes --migration 012` exits 0.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; 010/011 are mechanical ports from RUNBOOK SQL; D12 applies to probes 010 and 011 (JSONB sentinel writes; pass JS values directly).

---

### Task 6 -- Dispatcher case in index.ts

**Goal:** Wire `migration-probes` into the `index.ts` dispatcher (case + lazy wrapper + usage entry + comment update).

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/index.ts` (modify)

**Steps:**

- [ ] In the subcommand dispatch if-chain (around line 37 in current file), add after `'reproducibility-check'`:
  ```typescript
  if (subcommand === 'migration-probes')        { await runMigrationProbesCli(rest); return; }
  ```

- [ ] Add the lazy-import wrapper function near `runReproducibilityCheckCli` (around line 466-469):
  ```typescript
  async function runMigrationProbesCli(args: string[]): Promise<void> {
    const { runMigrationProbesCli: run } = await import('./migration-probes.js');
    await run(args);
  }
  ```

- [ ] In `usageAndExit()`, add after the `reproducibility-check` block:
  ```
    migration-probes [--migration <NNN>] [--json] [--help]
                  Assert each migration's invariants (table/column/index
                  existence, CHECK reachability, seed values). Migrations
                  are global; no --project flag. --migration filters by
                  3-digit prefix (e.g. 009). Omit to run all 12 probes.
                  Exit 0 = all probes PASS; exit 1 = fail;
                  exit 2 = unknown --migration prefix.
  ```

- [ ] Update the top-of-file comment (line 7) to append `migration-probes` to the subcommand list, after `reproducibility-check`.

**Verification:**
- `bun run load-knowledge -- migration-probes --help` exits 0, prints `--migration <NNN>` flag.
- `cd apps/qw-oracle && bunx tsc --noEmit` exits 0.

**Execution mode:** `inline` -- 4 textual edits to one file; full content of each addition specified above; no logic.

---

## Verification (phase boundary)

Run these after all 6 tasks complete. Each is a YES/NO probe.

**1. TypeScript typecheck clean:**
```bash
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0.
FAIL: tsc prints error; likely import path mismatch between runner and registry.

**2. --help exits 0 and lists the --migration flag:**
```bash
cd apps/qw-oracle && bun run load-knowledge -- migration-probes --help
```
PASS: exits 0; output includes `--migration <NNN>`.
FAIL: exits non-zero; dispatcher case missing or import path wrong.

**3. --json output is valid JSON:**
```bash
cd apps/qw-oracle && bun run load-knowledge -- migration-probes --json | python3 -c "import sys,json; json.load(sys.stdin); print('valid JSON')"
```
PASS: prints `valid JSON`; exit 0.
FAIL: JSON parse error.

**4. All 12 probes pass on current dev DB:**
```bash
cd apps/qw-oracle && bun run load-knowledge -- migration-probes
```
PASS: exits 0; all 12 lines show `PASS`.
FAIL: exits 1; one or more show `FAIL`. Triage per D8; see Recovery.

**5. Single-probe --migration flag works:**
```bash
cd apps/qw-oracle && bun run load-knowledge -- migration-probes --migration 009
```
PASS: exits 0; output contains exactly one probe result for `009_ktx_log_template_logfile_channel.sql`.
FAIL: exits 2 (key-matching logic wrong) or exits with error.

**6. Unknown --migration prefix exits 2 with error message:**
```bash
cd apps/qw-oracle && bun run load-knowledge -- migration-probes --migration 999; echo "exit:$?"
```
PASS: exits 2; stderr contains 'no probe found' message.
FAIL: exits 0 silently with zero results.

**7. D12 regression gate still passes:**
```bash
cd apps/qw-oracle && bun run load-knowledge -- quality-grid --project ktx --family regression
```
PASS: `F1.jsonb_columns_not_strings` returns PASS.
FAIL: returns FAIL; a sentinel INSERT in probes 009/010/011 accidentally stored JSONB as a string scalar. See Recovery.

**8. D2: unset DATABASE_URL exits 1 with clear error message:**
```bash
DATABASE_URL='' bun run load-knowledge -- migration-probes 2>&1; echo "exit:$?"
```
PASS: exits 1; stderr contains 'DATABASE_URL is not set'.
FAIL: throws raw postgres connection error without a clear message, or exits 0.

**Adapted D6 catch-up audit note:** Migration probes are global (not per-project). The catch-up audit shape is "all 12 migrations have probes; all 12 probes pass on current dev DB" -- verified by step 4 above. If step 4 FAILs, triage per D8: drain-now for misapplied migrations or missing constraints; HANDOVER for pre-existing data gaps (e.g., description_origin nulls that trace to a loader not setting the field); explicit reject with commit-body rationale for probe assertions that are wrong (e.g., asserting a seed value that was legitimately updated at runtime).

## Outputs to next phase

- `apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` present, passing typecheck.
- `apps/qw-oracle/db/migration-probes.ts` present; 12 real probe functions (no stubs remain).
- `case 'migration-probes':` registered in `index.ts`; `bun run load-knowledge -- migration-probes` dispatches correctly.
- All 12 probes pass on current dev DB (commit body captures any drain-now / HANDOVER findings per D8).
- `F1.jsonb_columns_not_strings` still PASS (D12 regression gate).

Phase 5 (authoring guide doc `VALIDATION-GATES.md`) may proceed; it references real conventions from Phases 1-4.

## Open questions / deferred items

**Q1: description_origin backfill completeness (012 probe step 2).**
- Question: If the probe finds non-zero rows where `description IS NOT NULL AND description_origin IS NULL`, is the deriver (`derive-entity-description.ts`) setting description_origin for new rows?
- Default: probe reports a FAIL with the count. Executor drains at execution time per D7/D8: if the deriver is not setting description_origin, that is a loader gap -- fix rides this phase's commit. If it is a pre-existing DB gap (migration applied before the deriver was updated), HANDOVER with explicit reason.
- Who can resolve: executor at phase execution time.

**Q2: description_origin valid-values check (012 probe step 3) -- future origin values.**
- Question: New origin values like 'curated_yaml' may be introduced by future loaders. The spot-check would then falsely FAIL.
- Default: probe checks the four values defined in the 012 migration comment ('help_json','source_inline','inherited','synthesized'). Update the probe when a new origin value is introduced.
- Who can resolve: operator, whenever a new origin value is added.

**Q3: match_event_versions index count (010 probe step 2).**
- Question: Probe asserts COUNT = 3. The implicit PK index name is Postgres-generated (`match_event_versions_pkey`). If a future migration adds a 4th index, this assertion would falsely FAIL.
- Default: assert COUNT = 3 (not individual names), matching RUNBOOK's '3 indexnames' acceptance condition.
- Who can resolve: executor confirms count at execution; update probe if future migrations add indexes.

**Q4: 011 probe pre-flight (gameplay_sources ktx row).**
- Question: If the ktx row is missing (KTX onboarding Phase 1 not loaded), the probe short-circuits the sentinel inserts. This is the correct behavior, but the probe should distinguish "migration not applied" from "KTX data not loaded." Both are FAILs but require different fixes.
- Default: probe message says 'gameplay_sources ktx row missing; KTX Phase 1 onboarding prerequisite not met' and stops. Executor triage determines root cause.
- Who can resolve: executor at execution time.

## Recovery (if verification fails)

**Step 1 (tsc) fails:** Most likely cause is the import path `../../db/migration-probes.js` in the runner not resolving to `apps/qw-oracle/db/migration-probes.ts`. Verify the relative path: from `apps/qw-oracle/scripts/load-knowledge/`, `../../db/` resolves to `apps/qw-oracle/db/`. Also check that `MigrationProbeResult` and `MigrationProbeFn` are exported from `db/migration-probes.ts` and the runner re-exports them correctly.

**Step 2 (--help fails):** Dispatcher case missing or function name mismatch. Check `index.ts` for `case 'migration-probes':` and the `runMigrationProbesCli` wrapper function. Confirm the lazy import destructures `{ runMigrationProbesCli: run }` matching the named export.

**Step 4 (one or more probes FAIL):** Run each failing probe in isolation (`--migration NNN`). Most likely causes by group:
- 001: `oracle_meta` row missing -> run `bun db/migrate.ts` to apply migration 001.
- 002: `entities` table missing -> run migrator.
- 003: `description_embedding` column missing -> migration 003 not applied; run migrator.
- 004: `messages` table missing -> migration 004 not applied.
- 005: `concept_chunks` table missing -> migration 005 not applied.
- 006: `embedding_api_log` table missing -> migration 006 not applied.
- 007: `query_log` table missing -> migration 007 not applied.
- 008: `community.players` table missing -> migration 008 not applied. Fix: `bun db/migrate.ts`.
- 009: channel='logfile' INSERT failed -> migration 009 not applied; run migrator.
- 010: `match_event_versions` missing or index count wrong -> migration 010 not applied.
- 011: gameplay_sources ktx row missing -> KTX onboarding Phase 1 data not loaded. Run the KTX data load (`bun run load-knowledge -- load-ktx-modes`, etc.) before re-running this probe.
- 012: description_origin NULL rows -> drain per Open Question Q1. Query: `SELECT project, type, count(*) FROM entities WHERE description IS NOT NULL AND description_origin IS NULL GROUP BY project, type` to identify scope.

**Step 7 (D12 regression gate fails):** A sentinel INSERT in probes 009/010/011 stored JSONB as a string scalar. Identify the offending column by running:
```bash
cd apps/qw-oracle && bun run load-knowledge -- quality-grid --project ktx --probe F1.jsonb_columns_not_strings
```
The FAIL output names the table+column. Fix: in the probe function, replace `JSON.stringify(v)` with `v` (direct JS value). The rollback transaction means no data was actually stored; fix the probe code and re-run.

---

## Findings resolved by this phase (per `review-findings.md`)

No F-entries exist at draft time (`review-findings.md` is empty). Any findings from the step-4 catch-up audit are NEW F-entries appended to `review-findings.md` at execution time with executor's D8 triage (drain-now / HANDOVER / explicit reject). The commit body captures each finding's disposition.

---

## Verification sub-agent dispatch

After writing this phase MD, the drafter dispatches the following sub-agent (subagent_type=Explore, model=Sonnet medium) to verify the draft before handing back to the operator.

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-4-migration-probes.md

Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md

Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md

Read the relevant section of the brainstorm parking doc:
  /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
  (Pass 1.2.2 -- per-migration validation probes shape + Pass 2.3 -- roadmap entry)

Then verify:

1. Every CI-readiness convention from D2 -- verify the phase MD covers:
   exit codes (0/1/2 scheme), --migration flag (replaces --project for this
   global gate), --json, --help exits 0, env-var driven DATABASE_URL,
   no CWD assumptions, deterministic output. Flag CRITICAL on any
   missing convention for this TS-probe phase.

2. Per-project config dict (D3) -- verify the phase MD correctly notes
   that migration probes have NO per-project config dict (migrations are
   global; D3 explicitly exempts this gate). Flag SUBSTANTIVE if the
   phase incorrectly requires a per-project config.

3. Dispatcher case in index.ts -- verify the case 'migration-probes'
   addition follows the F1 quality-grid mirror pattern (D4): lazy-import
   wrapper + if-chain case. Verify import path
   './migration-probes.js' is consistent with Task 6 steps.
   Flag SUBSTANTIVE on dispatch shape drift.

4. Every file path in "Files touched":
   - Created files: verify parent directories exist.
     apps/qw-oracle/scripts/load-knowledge/ -- verify exists.
     apps/qw-oracle/db/ -- verify exists (contains migrate.ts).
   - Modified: apps/qw-oracle/scripts/load-knowledge/index.ts -- verify exists.
   - Created files THEMSELVES should NOT exist yet (paper plan).

5. JSONB column writes (D12) -- verify Tasks 4 and 5 explicitly call out
   D12 for migrations 009 (all_call_sites_json), 010 (attributes_json),
   011 (ruleset_gate_json, props_json). Flag CRITICAL if any of these
   probe specs suggest JSON.stringify(...) or TEXT binding instead of
   direct JS value.

6. F-number references -- review-findings.md is empty; phase should not
   claim to resolve any F-numbers. Verify "Findings resolved" section
   says no F-entries.

7. Shell commands -- verify all commands use `bun` for scripts
   (not tsx or node). `python3` is acceptable for the --json pipe check.

8. Catch-up audit shape -- D6 adapted: "all 12 migrations have probes;
   all 12 probes pass on current dev DB" (not 5-project audit).
   Verify the verification section reflects this adaptation rather than
   the 5-project per-extractor shape.

9. "Engineer ports X" smell -- list any task steps that hand-wave
   without specifying what the subagent should write.

10. Per-task execution mode declarations -- confirm each task has
    exactly one execution mode line with rationale. Confirm Tasks 2-5
    are subagent (Sonnet medium). Confirm Task 6 is inline.
    Flag if >70% inline for this code-synthesis-heavy phase.

11. Existing infrastructure references -- verify:
    apps/qw-oracle/scripts/load-knowledge/idempotency.ts exists
    apps/qw-oracle/scripts/load-knowledge/index.ts exists
    apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md exists
    apps/qw-oracle/db/migrations/ directory exists with 12 files

Report findings under 400 words in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
