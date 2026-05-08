# Phase 4 drafter prompt -- Extractor discipline catch-up (Per-migration validation probes)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 4 of the extractor discipline catch-up arc.

PHASE 4 SCOPE: Universal per-migration validation probes. New runner at
apps/qw-oracle/scripts/load-knowledge/migration-probes.ts + sibling
registry at apps/qw-oracle/db/migration-probes.ts mapping migration
filename -> probe function. Each probe asserts the migration's invariants
(CHECK reachability, table/index existence, sentinel insert/reject, etc.)
in ~10 lines per migration. Coverage: migrations 001-012 (retroactive
001-008 + KTX-shipped 009/010/011 + new 012). `case 'migration-probes':`
in index.ts mirroring P1's just-shipped pattern. Optional --migration NNN
flag for single-probe runs. Migrations are GLOBAL (not per-project), so
the catch-up audit shape is "all 12 migrations have probes; all 12 probes
pass on current dev DB" rather than "ran across all 5 projects."

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no probes, no SQL). The phase MD becomes
input to a separate execution session later.

REQUIRED READING (read all before drafting; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md
2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   Particularly: D2 (CI-readiness conventions), D3 (n/a for this gate --
   migrations are global, no per-project config), D4 (F1 quality-grid
   mirror), D5 (manual probes), D6 (catch-up audit shape adapted: 12
   migrations not 5 projects), D7 (real-bug-fix rides commit), D8 (per-
   finding triage), D12 (JSONB binding for sentinel inserts -- IMPORTANT:
   if any migration constrains a JSONB column, the sentinel write uses
   tx.json(...) or direct binding, NEVER JSON.stringify(...) to TEXT),
   D13 (phase atomicity), D15 (execution modes), D17 (git workflow main
   tree).
3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
4. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md
5. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   Pass 1.2.2 (per-migration validation probes -- the lock-shape spec) +
   Pass 2.3 (roadmap entry for Phase 4).
6. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   Inline migration validation SQL for migrations 009 / 010 / 011 (KTX-
   arc authored as positive-shape and negative-shape SQL block;
   mechanical port to TS probe registry).
7. apps/qw-oracle/db/migrations/
   All 12 migration files (001-012). Each migration's invariants must be
   probed. Read each file to identify what to assert.
8. apps/qw-oracle/scripts/load-knowledge/idempotency.ts
   The just-shipped Phase 1 universal probe. MIRROR ITS SHAPE: parseArgs
   from 'util'; runMigrationProbes / runMigrationProbesCli / formatJson
   / formatText / printHelp split; --json / --help / exit codes.
9. apps/qw-oracle/scripts/load-knowledge/index.ts
   The dispatcher. Add `case 'migration-probes':` near the just-shipped
   'idempotency' case per D4. Mirror the lazy-import wrapper pattern.

PHASE-SPECIFIC RECON (run before drafting):

a. Enumerate all migration files:
     ls apps/qw-oracle/db/migrations/
   Expected: 001_init.sql through 012_description_origin.sql. 12 files.

b. Read VALIDATION-RUNBOOK.md inline migration SQL for migrations 009 /
   010 / 011. Identify the probe shape:
     - Positive-shape: assert that valid values pass CHECK (insert + verify
       + delete sentinel; transactional rollback).
     - Negative-shape: assert that invalid values fail CHECK (insert
       expected to fail; transactional rollback).
     - Schema existence: SELECT to_regclass('table_name') IS NOT NULL.
     - Index existence: SELECT 1 FROM pg_indexes WHERE indexname = ...

c. Read each of the 12 migration files briefly. For each, identify:
     - What schema delta does it introduce? (CHECK widening / new
       table / new index / new column / etc.)
     - What invariant does the migration guarantee? (e.g.,
       entities.type CHECK admits 'match_event'; new
       match_event_versions table exists; etc.)
     - What probe ~10 lines would assert that invariant?

d. Group migrations by probe shape so the registry is consistent. Likely
   groupings:
     - Schema migrations (001 / 002 / 003 / 004 / 005 / 006 / 007 / 008)
       -- table existence + column shape probes.
     - CHECK widening + new table (009 / 010 / 011 from KTX arc) -- per
       VALIDATION-RUNBOOK inline SQL.
     - Append-only column migrations (012) -- column existence + shape
       probe.

e. Decide the registry shape. Pass 1.2.2: explicit registry, not auto-
   discovery from migration SQL. Each entry maps migration filename ->
   probe function. The runner dispatches.

f. Decide --migration NNN flag default. Pass 1.2.2 says "lets operator
   run a single migration's probe in isolation; useful when authoring a
   new migration." Default: ship the flag.

g. Mirror idempotency.ts CLI shape. Adapt the per-project loop pattern to
   per-migration loop pattern: targets is now a list of migration names
   (filtered by --migration if specified, else all 12).

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-4-migration-probes.md

Follow phase-template.md exactly. Don't add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji.
- All TS scripts run under Bun. Use `bun` in command lines.
- Git workflow: main tree, no worktrees, no PRs (D17).
- CI-readiness conventions (D2): exit codes, --project (n/a here -- use
  --migration NNN instead), --all (default behavior), --json, --help
  exits 0, env-var DB, no CWD assumptions, deterministic.
- F1 quality-grid mirror dispatch (D4); add case in index.ts.
- Manual invocation only, not auto-run (D5).
- Catch-up shape (D6 adapted): "all 12 migrations have probes; all 12
  probes pass on current dev DB" rather than 5-project. Commit body
  captures any FAIL with D8 triage (drain-now / HANDOVER / explicit
  reject).
- JSONB binding (D12): IMPORTANT for migration probes that touch JSONB
  columns. Sentinel inserts must use tx.json(...) or direct postgres-js
  binding; NEVER JSON.stringify(...) to TEXT. Surface this in the phase
  MD's relevant tasks.
- Per-task execution mode declared in task table (D15). Runner +
  registry skeleton: `subagent (Sonnet medium)`. Per-migration probes:
  fan out by group of ~3 migrations per subagent (4 subagents total
  for 12 migrations) to keep executor context clean. Per-migration
  probe authoring is "subagent (Sonnet medium) -- code synthesis,
  ~10-line probe per migration, clear spec from migration SQL."

STEP-BY-STEP:

Step 1: Read all 9 required reads + run the recon (a-g).

Step 2: Draft the phase MD following phase-template.md. Phase 4 SCOPE
        statement above is your "Goal" paragraph seed.

Step 3: Dispatch the verification sub-agent (Tool: Agent, subagent_type:
        Explore, model: Sonnet medium, prompt from phase-template.md
        with absolute paths substituted).

Step 4: Apply the sub-agent's findings. If a finding contradicts
        decisions.md, note rejection in "Open questions" with one-line
        rationale.

Step 5: Halt. Reply with phase MD path, sub-agent finding count, open
        questions, and recommendation (ready / needs another pass).

Do NOT proceed to Phase 5. Do NOT execute. Drafting is paper-only.

=== END PROMPT ===
```
