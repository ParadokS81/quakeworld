# Phase 1 drafter prompt -- KTX Onboarding (Foundation)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 1 of the KTX Layer 1 Onboarding arc.

PHASE 1 SCOPE: Shared-infrastructure foundation. Pattern 6 cross-header lift in
extractor_lib._source.py (depth-1 #include walk) + three migration files
(008_ktx_log_template_logfile_channel.sql, 009_ktx_match_event_type.sql,
010_ktx_gameplay_kinds.sql) + new gameplay_sources row for 'ktx'. After
Phase 1 ships, schema admits all KTX content and cross-header macros
resolve for any engine.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no migrations, no extractors, no loaders).
The phase MD becomes input to a separate execution session later.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D1 (spec is locked), D4 (Pattern 6 lift), D5 (three
     migrations), D14 (JSONB binding), D15 (idempotency), D16 (phase
     atomicity), D18 (execution modes), D20 (git workflow).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 1: F4 (008 widening), F15 (cross-header
     lift before Phase 3 runs), F16 (parse-time impact projection).
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-0-doctrine-fixes.md
   - Phase 0 was just drafted; read its "Outputs to next phase" section
     to confirm Phase 1's inputs.
6. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Phase 1 ranges: Pass 1 schema deltas (sections 1.1, 1.7) +
     entire Pass 3 (migration 008 content) + Pass 4 schema cost summary +
     Pass 5.5 (migrations 009 / 010 split) + Pass 5.2.d (Pattern 6
     cross-header lift).
7. docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md
   - Particularly section 2.4 (migration coordination via dump-restore).
8. apps/qw-oracle/CLAUDE.md
   - JSONB-binding rule + Bun runtime + idempotency.
9. apps/qw-oracle/SCHEMA.md
   - v14 game-mechanics tables (qw-namespace), v17 all_call_sites_json
     shape (precedent for match_event_versions.emission_call_sites_json).

PHASE-SPECIFIC RECON (run before drafting):

a. Verify migration ordinal:
   ls apps/qw-oracle/db/migrations/
   - Latest committed should be 007_query_log.sql.
   - Check if 008_ktx_log_template_logfile_channel.sql is on disk
     (Pass 3 drafted but uncommitted per spec preamble). If yes, read
     to compare against spec section 3.1's locked SQL.

b. Read the existing Pattern 6 implementation to understand its
   current shape:
   - apps/qw-oracle/scripts/extractors/extractor_lib/_source.py
   - apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py
   - apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py
   The lift extends `_file_macros` cache from same-file-only to depth-1
   #include closure. Identify the exact function(s) that need editing.

c. Read EXTRACTOR-PLAYBOOK.md's Pattern 6 section to confirm the lift
   matches the deferred-pressure-point note already documented:
   apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md

d. Read an existing migration file as a format template:
   apps/qw-oracle/db/migrations/006_embedding_api_log.sql or
   apps/qw-oracle/db/migrations/007_query_log.sql

e. Inspect the existing gameplay_sources table to know the row shape
   for the new 'ktx' row:
   docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle
     -c "\\d+ gameplay_sources"
   docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle
     -c "SELECT * FROM gameplay_sources"
   (Read-only probe. If you can't run docker from this terminal, read
   the CREATE TABLE in 002_layer1_schema.sql instead.)

f. Locate the cross-header macros that motivate the Pattern 6 lift:
   grep -n 'LGCMODE_VARIABLE\\|TOT_MODE_VARIABLE' research/repos/ktx/include/g_local.h
   grep -n 'LGCMODE_VARIABLE\\|TOT_MODE_VARIABLE' research/repos/ktx/src/commands.c

g. Sanity-check the test for the lift -- where Phase 3's _handler_modes.py
   will consume:
   sed -n '4150,4210p' research/repos/ktx/src/commands.c
   (common_um_init body; the 2 macro-prefixed lines should be visible.)

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md

Follow phase-template.md exactly. Section order: Goal / Inputs / Files
touched / Tasks (with execution-mode column per task) / Verification /
Outputs / Open questions / Recovery.

Concrete authoring rules (from decisions.md):

- ASCII only. No emoji. ASCII hyphen-minus, not em-dash. (D19)
- All scripts run under Bun. Use `bun` in command lines, not `tsx`.
- Three migration files in chronological order: 008 / 009 / 010 (D5).
  ALTER TABLE DROP CONSTRAINT + ADD CONSTRAINT pattern; idempotent.
- Pattern 6 lift goes in extractor_lib (D4). Shared infrastructure;
  no KTX-specific branches in the lift.
- gameplay_sources row INSERT is data, not schema (D5).
- Per-task execution mode declared in task table (D18).
- Phase atomicity: phase ends commit-ready (D16).

Per-task execution-mode rough cut (refine as you draft):
- Pattern 6 lift: subagent (Sonnet medium) -- Python edit + new test;
  contained shape; needs source reading + careful #include-walk
  semantics.
- Migration 008 SQL: inline (full content shipped; no logic).
- Migration 009 SQL: inline (full content shipped; CREATE TABLE
  match_event_versions per Pass 4.5 column shape).
- Migration 010 SQL: inline (full content shipped; 8 ALTER TABLE
  CHECK widenings).
- gameplay_sources INSERT SQL: inline (one-line SQL).
- Verification probes (per-migration insert/delete stub-row tests):
  inline (small SQL queries).

STEP-BY-STEP:

Step 1: Read all 9 required reads. Take notes on F4 / F15 / F16 and
        confirm against Phase 0's outputs.

Step 2: Run all 7 phase-specific recon steps. Capture exact line
        numbers, current Pattern 6 function signatures, and the
        gameplay_sources row shape.

Step 3: Draft phase-1-foundation.md per phase-template.md.

Step 4: Dispatch verification sub-agent (model: sonnet, effort: medium,
        subagent_type: Explore) per phase-template.md "Verification
        sub-agent dispatch" brief. Particularly verify:
        - All three migration SQLs match decisions.md D5 / spec section
          5.5 / spec section 4.5 (match_event_versions column list).
        - Pattern 6 lift implementation matches D4 (depth-1 only,
          PARSE_DETAILED_PROCESSING_RECORD flag).
        - gameplay_sources row shape matches existing schema.

Step 5: Apply sub-agent findings. If a finding contradicts decisions.md,
        reject in "Open questions" with a one-line rationale.

Step 6: Halt. Reply with:
        - Path to phase-1-foundation.md.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Open questions needing operator attention.
        - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to Phase 2. Do NOT execute migrations or run handlers.
Drafting is paper-only.

=== END PROMPT ===
```
