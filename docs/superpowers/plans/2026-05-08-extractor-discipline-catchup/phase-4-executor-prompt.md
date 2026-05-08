You are executing Phase 4 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs touch the same migration files (`apps/qw-oracle/db/migrations/`) and reference the same migration numbers (009 / 010 / 011). Phase 4 is paper-only AUTHORING of probes that ASSERT each migration's invariants -- it is NOT a re-do of the KTX onboarding's migration design or schema work. If you see references to "Pattern 6 cross-header lift", "modes-handler refactor", "taxonomies handler", "election_type / death_rule", "deathtype.h X-macro", or any other KTX onboarding implementation work, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 4 SCOPE: Ship two new files -- `apps/qw-oracle/scripts/load-knowledge/migration-probes.ts` (CI-ready runner mirroring `idempotency.ts` shape) and `apps/qw-oracle/db/migration-probes.ts` (explicit registry mapping each of the 12 migration filenames to a probe function) -- plus a `case 'migration-probes':` dispatcher entry in `index.ts`. Each probe asserts the migration's invariants (table/column/index existence, CHECK reachability via sentinel insert+rollback, seed value presence) in approximately 10 lines of TS. Coverage: retroactive probes for migrations 001-008, mechanical port of VALIDATION-RUNBOOK inline SQL for 009/010/011, and a new probe for 012. Migrations are GLOBAL (not per-project) -- no `--project` flag; `--migration NNN` (optional) filters to a single probe by 3-digit prefix. Runnable state at phase end: `bun run load-knowledge -- migration-probes` runs all 12 probes against the current dev DB and exits 0; `bun run load-knowledge -- migration-probes --migration 009` runs a single probe.

Working directory: /home/paradoks/projects/quakeworld

You ARE executing this phase. You DO modify the live codebase, run probes, and commit + push. The phase MD is the source of truth for what to do.

REQUIRED READING (read all before executing; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-4-migration-probes.md
   The phase MD itself. Source of truth for tasks, full file content (Task 1 runner + registry skeleton), per-probe specs (Tasks 2-5), and verification probes V1-V8.

2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   17 locked cross-cutting decisions. Phase 4 respects D2 (CI-readiness conventions including the DATABASE_URL pre-flight guard added at draft time per substantive sub-agent finding), D3 (n/a -- migrations are global), D4 (F1 dispatcher mirror), D5 (manual probes; not auto-invoked), D6 (adapted catch-up audit: all 12 probes pass on current dev DB), D7 (real-bug-fix rides commit), D8 (per-finding triage), D12 (JSONB binding rule -- CRITICAL for probes 009/010/011 sentinel inserts), D13 (phase atomicity -- one commit), D15 (Tasks 1-5 subagent Sonnet medium; Task 6 inline), D16 (ASCII), D17 (main tree, no PR ceremony, push at phase boundary).

3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   Empty initially. If V4 (all-12-probes run) surfaces any drain-now or HANDOVER findings, append F-entries here per D8.

4. apps/qw-oracle/CLAUDE.md
   Project context. Bun runtime + idempotency invariants + JSONB binding rule.

5. apps/qw-oracle/scripts/load-knowledge/idempotency.ts
   Shape mirror. Phase 4's `migration-probes.ts` matches its CLI shape (parseArgs, --json/--help/exit-codes split, lazy-import dispatcher pattern, env-var DATABASE_URL guard).

6. apps/qw-oracle/scripts/load-knowledge/index.ts
   Dispatcher. Task 6 adds the `case 'migration-probes':` entry near the existing `idempotency` and `reproducibility-check` cases.

7. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   Inline migration validation SQL for migrations 009/010/011. Tasks 4 and 5 mechanically port the positive-shape and negative-shape SQL blocks into TS probe functions.

8. apps/qw-oracle/db/migrations/
   All 12 migration files (001-012). Each task reads the relevant 3 migration SQLs to identify invariants for probe authoring.

PRE-FLIGHT CRITICAL REVIEW (per arc-executor skill):

Before executing any task, critically review the phase MD's plan against decisions.md and the live codebase. The drafter session was sub-agent-verified on 2026-05-08, but you (the executor) are running cold against live state. Spot-check:

a. idempotency.ts shape mirror is intact (Phase 1 ship):
     ls apps/qw-oracle/scripts/load-knowledge/idempotency.ts apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts
   Both should exist. If either is missing, the arc's mirror reference is broken.

b. db/ directory layout matches the registry placement:
     ls apps/qw-oracle/db/
   Should show: migrate.ts, migrate.test.ts, migrations/, init/, seeds/. The new `db/migration-probes.ts` registry lands here as a sibling of `migrate.ts`.

c. All 12 migration files present:
     ls apps/qw-oracle/db/migrations/
   Should show: 001_init.sql through 012_description_origin.sql (exactly 12 files). If any file count differs, halt -- the probe set is calibrated to 12 migrations.

d. VALIDATION-RUNBOOK has the inline SQL for 009/010/011:
     grep -c "Per-migration validation probes" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   Should be >= 1. If 0, halt -- the lift source for Tasks 4 + 5 (mechanical port) is gone.

e. Dev DB is reachable:
     env | grep DATABASE_URL
   Should show DATABASE_URL set to the dev DB connection string. If unset, the runner's pre-flight guard (V8 in the phase MD) will exit 1; set DATABASE_URL before running V4.

f. Dev DB has migrations applied:
     psql "$DATABASE_URL" -c "SELECT key, value FROM oracle_meta WHERE key='schema_version';"
   Should return one row with `schema_version = 12` (or higher). If lower, run `bun apps/qw-oracle/db/migrate.ts` first; the probes assume all 12 migrations are applied.

g. KTX onboarding data loaded (probe 011 pre-flight):
     psql "$DATABASE_URL" -c "SELECT count(*) FROM gameplay_sources WHERE id='ktx';"
   Should return n >= 1. If 0, probe 011 short-circuits with a FAIL message saying "gameplay_sources ktx row missing"; that is intended behavior, but flag to operator before running V4 if the FAIL would derail the phase.

If any pre-flight check fails CRITICALLY, halt with status NEEDS_CONTEXT before executing any task.

If pre-flight is clean, proceed to execution.

EXECUTE THE PHASE:

Tasks 1-6 per the phase MD. Per-task execution mode declarations (D15):

Task 1 -- Runner + registry skeleton:
  Execution mode: subagent (Sonnet medium).
  Dispatch the Agent tool with subagent_type=general-purpose, model=sonnet (default effort=medium). Brief shape:
    "Read the Phase 4 MD's Task 1 section at /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-4-migration-probes.md. Create the file at apps/qw-oracle/db/migration-probes.ts FIRST (the runner imports from it -- no circular import) with the FULL content from the MD's Task 1 step 1 verbatim (12-stub registry). Then create apps/qw-oracle/scripts/load-knowledge/migration-probes.ts with the FULL content from the MD's Task 1 step 2 verbatim (runner with parseArgs, runMigrationProbes, runMigrationProbesCli, formatJson, formatText, printHelp, and the DATABASE_URL pre-flight guard). Verify with `cd apps/qw-oracle && bunx tsc --noEmit`. Halt with PASS/FAIL + tsc output."

Task 2 -- Per-migration probes group A (001, 002, 003):
  Execution mode: subagent (Sonnet medium).
  Dispatch with subagent_type=general-purpose, model=sonnet. Brief shape:
    "Read the Phase 4 MD's Task 2 section. Read apps/qw-oracle/db/migrations/001_init.sql, 002_layer1_schema.sql, 003_layer1_entities_search.sql. Edit apps/qw-oracle/db/migration-probes.ts to replace the three stubs for 001/002/003 with the real implementations specified in the MD. Each probe is approximately 10 lines, asserts the invariants listed in the MD's Steps section, and pushes findings into the result.findings array. Use the rollback-throw pattern for positive sentinel inserts. Verify with `cd apps/qw-oracle && bunx tsc --noEmit` AND `bun run load-knowledge -- migration-probes --migration 001 && bun run load-knowledge -- migration-probes --migration 002 && bun run load-knowledge -- migration-probes --migration 003`. Halt with PASS/FAIL + per-probe output."

Task 3 -- Per-migration probes group B (004, 005, 006):
  Execution mode: subagent (Sonnet medium).
  Dispatch with same shape. Brief shape:
    "Read the Phase 4 MD's Task 3 section. Read apps/qw-oracle/db/migrations/004_layer2_chat.sql, 005_layer3_concepts.sql, 006_embedding_api_log.sql. Edit apps/qw-oracle/db/migration-probes.ts to replace the three stubs for 004/005/006 per the MD's Steps. Verify with tsc + per-probe runs. Halt with PASS/FAIL."

Task 4 -- Per-migration probes group C (007, 008, 009; D12 applies to 009):
  Execution mode: subagent (Sonnet medium).
  Dispatch with same shape. Brief shape:
    "Read the Phase 4 MD's Task 4 section. Read apps/qw-oracle/db/migrations/007_query_log.sql, 008_community_schema.sql, 009_ktx_log_template_logfile_channel.sql. ALSO READ the VALIDATION-RUNBOOK section on migration 009 inline positive/negative shape SQL. Edit apps/qw-oracle/db/migration-probes.ts to replace stubs 007/008/009 per the MD's Steps. CRITICAL D12 callout for probe 009: `all_call_sites_json` is a JSONB column in `log_template_versions`; pass the JS empty array `[]` directly (e.g. `${[]}` interpolation), NEVER `JSON.stringify([])` which trips F1.jsonb_columns_not_strings. Verify with tsc + per-probe runs. Halt with PASS/FAIL."

Task 5 -- Per-migration probes group D (010, 011, 012; D12 applies to 010 and 011):
  Execution mode: subagent (Sonnet medium).
  Dispatch with same shape. Brief shape:
    "Read the Phase 4 MD's Task 5 section. Read apps/qw-oracle/db/migrations/010_ktx_match_event_type.sql, 011_ktx_gameplay_kinds.sql, 012_description_origin.sql. ALSO READ the VALIDATION-RUNBOOK sections for migrations 010 and 011 inline SQL. Edit apps/qw-oracle/db/migration-probes.ts to replace stubs 010/011/012 per the MD's Steps. CRITICAL D12 callouts: probe 010 (`attributes_json`, `emission_call_sites_json` are JSONB; pass JS values directly), probe 011 (`ruleset_gate_json`, `props_json` are JSONB in both `gameplay_entity_defs` and `gameplay_mechanics`; pass JS `{}` directly). Probe 012 has no JSONB writes -- structural existence + backfill completeness check + valid-values spot-check (per the four values in the migration comment). Probe 011 has a pre-flight on `gameplay_sources WHERE id='ktx'`; if 0, short-circuit sentinel inserts with the diagnostic finding. Verify with tsc + per-probe runs. Halt with PASS/FAIL."

Task 6 -- Dispatcher case in index.ts:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Edit apps/qw-oracle/scripts/load-knowledge/index.ts. Add the if-chain case `if (subcommand === 'migration-probes') { await runMigrationProbesCli(rest); return; }` after the `reproducibility-check` case.
    2. Add the lazy-import wrapper function near `runReproducibilityCheckCli` per the MD's Task 6 step 2.
    3. Add the usage entry in `usageAndExit()` per the MD's Task 6 step 3.
    4. Update the top-of-file comment subcommand list per the MD's Task 6 step 4.

VERIFICATION (phase boundary):

Run V1-V8 from the phase MD's Verification section in order. Each ends PASS or FAIL.

V1: TypeScript typecheck clean (`cd apps/qw-oracle && bunx tsc --noEmit`).
V2: --help exits 0 and lists the --migration flag.
V3: --json output is valid JSON.
V4: All 12 probes pass on current dev DB (`bun run load-knowledge -- migration-probes`).
V5: Single-probe --migration flag works (`--migration 009`).
V6: Unknown --migration prefix exits 2 with error message (`--migration 999`).
V7: D12 regression gate still PASS (`bun run load-knowledge -- quality-grid --project ktx --family regression` -> F1.jsonb_columns_not_strings PASS).
V8: D2 unset DATABASE_URL exits 1 with clear error (`DATABASE_URL='' bun run load-knowledge -- migration-probes`).

Per D6 (adapted catch-up audit): V4's all-12-probes run constitutes the catch-up. Triage per D8 if any probe FAILs:
  - drain-now (real loader gap surfaced): bugfix rides this commit per D7; append F-entry to review-findings.md.
  - HANDOVER (pre-existing data gap, not gate-introduced): defer with explicit reason in commit body + HANDOVER.md.
  - explicit reject (probe assertion is wrong): document rationale in commit body; no F-entry.

Per D7: if Q1 (012 probe step 2 backfill completeness) surfaces non-zero rows where `description IS NOT NULL AND description_origin IS NULL`, executor distinguishes loader gap (drain-now -- fix the deriver in same commit) vs pre-existing migration backfill gap (HANDOVER).

Per D7: if Q4 (011 pre-flight) surfaces missing `gameplay_sources WHERE id='ktx'` row, executor distinguishes "migration 011 not applied" (run migrator) vs "KTX data not loaded" (run KTX onboarding load) and routes accordingly.

If any V fails AND the phase MD's Recovery section doesn't cover the failure mode, halt with status BLOCKED.

COMMIT + PUSH:

Stage:
  - apps/qw-oracle/db/migration-probes.ts (added)
  - apps/qw-oracle/scripts/load-knowledge/migration-probes.ts (added)
  - apps/qw-oracle/scripts/load-knowledge/index.ts (modified)
  - any drain-now bugfix (e.g., deriver fix if Q1 routes to drain-now)
  - any review-findings.md F-entry update

Commit subject (one line, ASCII, <= 72 chars where possible):
  extractor-discipline-catchup phase 4: per-migration validation probes

Commit body shape (HEREDOC; fill in actual audit dispositions):
  Universal per-migration validation probe runner + explicit registry
  mapping each of the 12 migration filenames to a probe function. Each
  probe asserts the migration's invariants (table/column/index existence,
  CHECK reachability via sentinel insert+rollback, seed value presence).

  Migrations are global (not per-project); --migration NNN filters to a
  single probe by 3-digit prefix. Mirrors idempotency.ts CI-readiness
  shape (D2/D4); JSONB binding rule (D12) applied to probes 009/010/011
  sentinel inserts (JS values direct, never JSON.stringify to TEXT).

  Adapted D6 catch-up audit: all 12 probes pass on current dev DB.
    001-008: <PASS / FAIL details>
    009-011: <PASS / FAIL details>
    012:     <PASS / FAIL details>

  Findings (D8 triage):
    - <if drain-now> F-NN: <bug summary>; fixed in same commit per D7.
    - <if HANDOVER> F-NN: <pre-existing gap>; tracked in HANDOVER.md.
    - <if reject> <probe assertion> rejected because <rationale>.
    - <if no findings> All 12 probes ship green; no drain-now bugs.

  Verification (phase boundary): V1-V8 PASS.

Push to origin per D17 (`git push origin main`).

HALT WITH STRUCTURED STATUS:

Reply to the operator with one of:

- DONE: V1-V8 all PASS; phase MD complete; commit pushed; clean tree.
  Report: commit SHA, V-status summary, 12-probe pass dispositions, F-entries created (if any).

- DONE_WITH_CONCERNS: V1-V8 PASS but execution surfaced something unexpected.
  Report: same as DONE plus the concern + recommendation.

- NEEDS_CONTEXT: pre-flight CRITICAL finding OR mid-execution blocker requires operator triage (e.g., Q1 surfaces a deep-fix decision needing operator input on drain-now-with-scope-growth vs explicit-defer-to-HANDOVER per D8).
  Report: the finding + recommended phase MD amendment OR the triage question.

- BLOCKED: V failed AND Recovery section doesn't cover; OR an unanticipatable exception.
  Report: the failure + what was attempted + what's still in flight.

Do NOT proceed to Phase 5. Do NOT modify decisions.md or scaffold artifacts (review-findings.md F-entry additions are fine; structural changes need explicit operator approval).
