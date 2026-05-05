# Phase 7 drafter prompt -- KTX Onboarding (Validation)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 7 of the KTX Layer 1 Onboarding arc.

PHASE 7 SCOPE: Validation -- F1 quality-grid probes for all KTX kinds +
JSONB-binding regression gate + validation runbook entries + cross-project
audit. Adds probes to apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
and a per-engine validation section to
apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md. After Phase 7
ships, KTX onboarding has the same auditability as the 4 prior engines.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D14 (JSONB binding regression gate), D15
     (idempotency probes), D16 (phase atomicity), D18 (execution modes).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 7: F21 (validation runbook obligation;
     covers all KTX kinds + JSONB binding + cross-project audit).
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-2-pass1-entity-handlers.md
   docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-3-modes-handler.md
   docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-4-taxonomies-handler.md
   docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-5-tables-handler.md
   docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-6-match-event-handler.md
   - Read all 5 prior phase MDs to know the row counts and JSONB
     columns each phase produces. Phase 7 verifies all of them.
6. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Spec preamble's "Doctrine fixes deferred to end-of-arc" block
     references the validation runbook obligation.
   - Pass 5.5 lists per-migration validation probes (insert/delete
     stub-row tests for the 9 CHECK widenings + new table).
7. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   - Existing per-engine validation format. Phase 7 adds a KTX section
     mirroring this shape.
8. apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
   - F1 probe definitions. Phase 7 adds KTX probes here.
9. apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts
   - F1 probe test patterns.

ANALOGOUS PRIOR-ENGINE TEMPLATES:

- The existing F1 probes for ezQuake / FTE / MVDSV / QWCL in
  quality-grid.ts. Per-engine probe naming: F1.<project>.<kind>.<predicate>.
- The existing per-engine sections in VALIDATION-RUNBOOK.md (cvarlist
  diff, cmdlist diff, per-kind row-count probes).

PHASE-SPECIFIC RECON (run before drafting):

a. Inventory the existing F1 probe shape:
   grep -n 'F1\\.' apps/qw-oracle/scripts/load-knowledge/quality-grid.ts | head -40
   - Note the per-engine probe pattern + the predicate types
     (source_state / count / jsonb_columns_not_strings / ...).

b. Read the existing JSONB-binding regression probe:
   grep -n 'jsonb_columns_not_strings\\|jsonb_string_scalar' \\
     apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
   - Phase 7 extends this probe to KTX rows (per-handler JSONB columns
     listed in D14).

c. Inventory all KTX rows that need probes (from prior phase MDs):
   - Phase 2: cvars (~192 source-registered) / commands (317+39+25=381) /
     info_keys (~5-6) / log_templates (~1500-2000).
   - Phase 3: game_mode (27) / mode_default (~309).
   - Phase 4: election_type (5) / death_rule (27).
   - Phase 5: monster (13) / score_system (3) / drop_item (30) /
     loc_macro (15) / teamplay_message (21).
   - Phase 6: match_event (7).

d. Read the cross-project audit pattern (look for prior cross-project
   validation reports under docs/superpowers/reviews/):
   ls docs/superpowers/reviews/ | grep -i 'cross\\|valid\\|audit' | head
   - Identify the cross-project audit shape used for the 4 prior
     engines (e.g., 2026-04-28-per-project-validation-synthesis.md).

e. Read VALIDATION-RUNBOOK.md to identify where the KTX section slots in:
   apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-7-validation.md

Follow phase-template.md exactly.

Concrete authoring rules:

- ASCII only. ASCII hyphen-minus.
- F1 probe naming: F1.ktx.<kind>.<predicate>.
- JSONB-binding regression probe per F21: extends
  F1.jsonb_columns_not_strings to KTX-relevant columns:
    match_event_versions.attributes_json
    match_event_versions.emission_call_sites_json
    gameplay_mechanics.props_json (KTX rows)
    gameplay_mechanics.ruleset_gate_json (KTX rows)
    gameplay_entity_defs.props_json (KTX monster rows)
    log_template_versions.all_call_sites_json (KTX rows)
- Per-migration probes from spec section 5.5:
  - 008: insert/delete stub log_template row with channel='logfile'.
  - 009: insert/delete stub match_event entity + version row;
    confirm match_event_versions table exists.
  - 010: insert/delete stub row of each new kind value (8 inserts:
    monster, game_mode, election_type, score_system, drop_item,
    loc_macro, teamplay_message, mode_default).
- Idempotency probes per loader (run twice, assert row count + content
  hash unchanged on second run).
- Cross-project audit confirms KTX onboarding doesn't break prior-engine
  probes.
- Per-task execution mode declared (D18).

Per-task execution-mode rough cut:
- F1 probe definitions for KTX kinds: subagent (Sonnet medium) --
  ~14 new F1 probe entries; mirrors existing patterns.
- JSONB-binding regression probe extension: inline (small edit to
  existing predicate).
- Idempotency probes per loader: subagent (Sonnet medium) -- 4-5
  per-loader probes.
- Per-migration validation probes: inline (small SQL stubs).
- VALIDATION-RUNBOOK.md KTX section: inline (markdown content
  shipped inline; mirror existing per-engine format).
- Cross-project audit: subagent (Opus medium) -- breadth across 5
  engines; report-shaped output; the qw-oracle Arc 1 had this kind
  of audit at 4-engine scale.

STEP-BY-STEP:

Step 1: Read all required reads (including all 5 prior phase MDs).
        Note F21 + the per-phase row counts.

Step 2: Run phase-specific recon. Identify the existing F1 probe
        shape; confirm the JSONB regression probe extension target;
        identify cross-project audit format.

Step 3: Draft phase-7-validation.md.

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore).
        Particularly verify: F1 probes cover all 14 KTX kinds + JSONB
        columns; per-migration probes cover all 9 CHECK widenings + new
        table; cross-project audit shape matches prior precedent.

Step 5: Apply sub-agent findings.

Step 6: Halt with structured summary.

Do NOT proceed to Phase 8. Drafting is paper-only.

=== END PROMPT ===
```
