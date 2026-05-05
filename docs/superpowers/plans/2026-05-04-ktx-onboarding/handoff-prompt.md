# Handoff prompt -- fresh terminal, phase-drafting session

This file is the literal first message to paste into a fresh Claude Code terminal when kicking off a phase-drafting session for the KTX onboarding arc. Copy-paste everything between the `=== BEGIN PROMPT ===` and `=== END PROMPT ===` markers below.

The drafter is told what this arc is, what to read, what shape to produce, and how to halt for review.

---

## How to use this file

1. Decide which phase you want drafted (start with Phase 0).
2. Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`.
3. Paste the prompt below, with the `<PHASE_NUMBER>` placeholder replaced with the phase you want drafted.
4. The terminal drafts the phase MD, runs the sub-agent verification, applies findings, and halts.
5. You review the phase MD against the verification commands at its bottom.
6. If approved, paste the prompt again with `<PHASE_NUMBER>` set to the next phase.

You can run multiple phase-drafting sessions in parallel only if the phases don't depend on each other's output. Phase dependency map:

- Phase 0 -> Phase 1 (Phase 0 cleans doctrine; Phase 1 lands foundation against the cleaned reality)
- Phase 1 -> Phase 2, 3, 4, 5, 6 (Phase 1's migrations + Pattern 6 lift unblock all extraction phases)
- Phase 2 / 3 / 4 / 5 / 6 are mutually independent at the data level (different handlers, different loaders, different output JSON files). They CAN draft in parallel after Phase 1.
- Phase 7 needs all extraction phases drafted (validation runbook covers all KTX kinds).
- Phase 8 needs Phase 7 drafted (end-of-arc obligations summarize what shipped).

The orchestrator (post-scaffold) decides whether to draft phases sequentially or in parallel based on operator preference and context budget.

---

## Tips

- The drafter has full freedom to read source files, run grep / Read on the live codebase, and source-walk `research/repos/ktx/<files>` for count anchors. It does NOT execute migrations or run loaders -- drafting is paper-only.
- If the drafter encounters something unresolvable, it should add an "Open questions" item and proceed with a documented default. Don't ping the operator mid-draft.
- The verification sub-agent runs at the very end of the drafting session, before operator review.

---

## The prompt

```
=== BEGIN PROMPT ===

You are drafting Phase <PHASE_NUMBER> of the KTX Layer 1 Onboarding arc.

This is a structured planning task. Your output is a markdown file. You do
NOT execute anything (no migrations, no extractors, no loaders, no docker).
The phase MD you write becomes input to a separate execution session
later (kicked off by arc-orchestrator).

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (read all of these before drafting; do not skip):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
   - Phase index, "read this order" guidance.

2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - 20 locked cross-cutting decisions. Every phase respects these.

3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Locked count anchors + spec callouts. Identify which findings touch
     Phase <PHASE_NUMBER> via the "Phase ownership of findings" table at
     the bottom.

4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
   - The mandatory shape for the phase MD you produce.

5. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - The closed five-pass design spec. The relevant section for
     Phase <PHASE_NUMBER> is (pick one or more):
       Phase 0  -> spec preamble "Doctrine fixes deferred to end-of-arc"
                   + Pass 1.4 (delete TS regex extractor)
       Phase 1  -> Pass 1 schema deltas (1.1, 1.7) + Pass 3 (migration 008)
                   + Pass 4 schema cost summary + Pass 5.5 (migrations 009/010)
                   + Pass 5.2.d (Pattern 6 cross-header lift)
       Phase 2  -> Pass 1 (1.1 cvars / 1.2 handler shape / 1.3 source
                   citation / 1.5 commands / 1.6 info_keys / 1.7 log_templates)
       Phase 3  -> Pass 4.2 (mode taxonomy spine) + Pass 5.1 (race + bloodfest)
                   + Pass 5.1 amendment (mutators) + Pass 5.2 (per-_um_init
                   extraction shape) + Pass 5.4.1 (game_mode catalog row schema)
                   + Pass 5.4.2 (mode_default row schema)
       Phase 4  -> Pass 4.3 (electType_t + deathType_t) + Pass 5.3 handler
                   architecture for taxonomies + Pass 5.4.3 (election_type)
                   + Pass 5.4.4 (death_rule)
       Phase 5  -> Pass 4.4 (Group B 5 IN tables) + Pass 5.3 handler architecture
                   for tables + Pass 5.4.5-9 (monster / score_system / drop_item
                   / loc_macro / teamplay_message)
       Phase 6  -> Pass 4.5 (match_event entity type) + Pass 5.6 (handler
                   implementation specifics)
       Phase 7  -> Spec preamble "Doctrine fixes deferred to end-of-arc"
                   (validation runbook obligation) + Pass 5.5 (migration
                   validation probes) + spec callouts on F1 quality-grid
       Phase 8  -> Spec preamble "Doctrine fixes deferred to end-of-arc"
                   (SCHEMA.md sweep + EXTRACTOR-PLAYBOOK additions) +
                   HANDOVER.md "qw-oracle slim-doc Arc 1 refresh sweep" item

6. docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md
   - The Pass-2 sibling spec. Relevant for Phase 1 + Phase 7
     (migration coordination + dump-restore mechanism).

7. apps/qw-oracle/CLAUDE.md
   - Project context. JSONB-binding rule + Bun runtime + idempotency.

8. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   - Handler conventions; Pattern catalog; three-tier handler architecture;
     cross-codebase port pattern (KTX is a port, not a fork).

9. apps/qw-oracle/SCHEMA.md
   - v14 game-mechanics tables (qw-namespace), v15+ per-version table
     convention, v17 all_call_sites_json shape (precedent for
     match_event_versions.emission_call_sites_json).

10. The analogous prior-engine handler / loader as a template (depending
    on phase):
      Phase 2  -> apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py
                  (closest precedent for KTX's printf-shaped log_template
                  handler) + apps/qw-oracle/scripts/load-knowledge/load-cvars.ts
                  + load-commands.ts + load-info-keys.ts + load-log-templates.ts
                  (loader patterns to copy)
      Phase 3  -> apps/qw-oracle/scripts/extractors/qw/extract.py (existing
                  qw-namespace extractor; KTX gameplay extraction lands
                  alongside) + apps/qw-oracle/scripts/load-knowledge/
                  load-gameplay.ts (existing qw-namespace loader)
      Phase 4  -> apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py
                  (Pattern 10 -- TU-root cursor intercept on header enums;
                  template for taxonomies handler)
      Phase 5  -> apps/qw-oracle/scripts/extractors/<engine>/_handler_<table>.py
                  (any prior INIT_LIST_EXPR walker via Pattern 4)
      Phase 6  -> apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts
                  (closest precedent for load-match-events.ts)

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-<N>-<name>.md

Where <N>-<name> matches the phase index in README.md. Example:
phase-0-doctrine-fixes.md, phase-1-foundation.md, etc.

Follow phase-template.md exactly: the section order, the section names,
the verification format, the per-task execution-mode declaration. Don't
add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only. No emoji. ASCII hyphen-minus, not em-dash or en-dash. (D19)
- All scripts run under Bun (project CLAUDE.md). Use `bun` in command
  lines, not `tsx`.
- Git workflow: main tree, no worktrees, no PRs (D20).
- KTX handlers inherit from extractor_lib._visitor.Visitor ONLY (D3).
  Do NOT subclass any parent-project handler.
- Pattern 6 cross-header lift goes in extractor_lib (D4); is shared
  infrastructure, not KTX-specific.
- Three migrations in chronological order: 008 / 009 / 010 (D5).
  ALTER TABLE DROP CONSTRAINT + ADD CONSTRAINT pattern; idempotent.
- JSONB binding (D14): pass JS values directly to postgres-js or wrap
  with tx.json(); NEVER pre-stringify.
- Gate convention {"mode":"<token>"} everywhere except catalog rows
  themselves (D8).
- Source-fidelity for canonical tokens (D9): "ca", "2on2", "lgc"; not
  "clan_arena", "two_on_two", "LGC Mode".
- Dual-row design for log_template + match_event is intentional (D10).
- Per-task execution mode declared in task table (D18). Inline only for
  markdown-only / fully-specified-edit tasks; subagent for code-synthesis.
- Phase MDs have no hard length cap (per phase-template.md "Phase MD
  length"); split only if two natural sub-deliverables.

STEP-BY-STEP:

Step 1: Read all 10 required reads. Take notes on the findings that touch
        Phase <PHASE_NUMBER>. Note which Pattern numbers your phase
        consumes.

Step 2: Run any necessary recon on the live codebase + KTX research repo:
        - For Phase 0: grep all four doctrine reference sites (OVERVIEW.md,
          EXTRACTOR-PLAYBOOK.md, scripts/extractors/CLAUDE.md, user
          memory project_extraction_pipeline_vision.md if accessible);
          confirm `apps/qw-oracle/scripts/extractors/ktx/commands.ts` still
          exists.
        - For Phase 1: read existing migration files at
          apps/qw-oracle/db/migrations/ to confirm format; read
          extractor_lib/_source.py to understand Pattern 6 current shape;
          check if 008_ktx_log_template_logfile_channel.sql is on disk
          (Pass 3 drafted but uncommitted per spec preamble).
        - For Phase 2: grep RegisterCvar/RegisterCvarEx call sites in
          research/repos/ktx/src/world.c (verify ~192 + ~205/~50 split
          per F1); count cmd_t cmds[] entries (verify 317); count
          frogbot_cmd_t std_commands[] / editor_commands[] (39 / 25);
          verify the 25 std-vs-editor collisions are real (the reason
          Pattern 14 is needed); count G_bprint / G_sprint / G_cprint /
          log_printf call sites (verify 655 / 1068 / 43 / 28 per F4).
        - For Phase 3: read commands.c:4527-4546 (um_list[]) to confirm
          17 entries; read commands.c:4152-4205 (common_um_init); locate
          the 17 _um_init const char[] declarations for line counts
          (~15 lines each per F6); confirm cross-header macros
          LGCMODE_VARIABLE / TOT_MODE_VARIABLE in g_local.h (per F15).
        - For Phase 4: read progs.h:217-225 (electType_t = 6 values per F7);
          read deathtype.h X-macro (30 entries per F8); identify which
          enum-decl walking pattern (Pattern 10) maps to each.
        - For Phase 5: source-walk every locked count anchor (F9-F13).
          Read sp_monsters.c:60 + struct at :48 (13 monsters; verify
          armor_for_kill field name); read race.c:5148 (3 score_systems;
          positions length=10); read commands.c:9075 (30 drop_items;
          5-field struct); read teamplay.c:1491 (15 loc_macros);
          read teamplay.c:1645 (21 teamplay_messages).
        - For Phase 6: read resources/extralog/ktxlog_0.1.xsd (7
          complexTypes); grep `log_printf("\\t\\t\\t<` in items.c /
          combat.c / client.c / logs.c (13 sites per F14); read
          MVDSV's load-log-templates.ts as template.
        - For Phase 7: read existing F1 probe shape in
          quality-grid.ts; read VALIDATION-RUNBOOK.md for the existing
          per-engine validation format.
        - For Phase 8: enumerate the four doctrine reference sites
          (verify Phase 0's fixes survived); read all three slim docs
          (README/SCHEMA/OVERVIEW) to plan the sweep; identify the
          existing EXTRACTOR-PLAYBOOK.md sections to slot the four new
          additions next to.

Step 3: Draft the phase MD following phase-template.md.

Step 4: Dispatch the verification sub-agent (instructions in
        phase-template.md "Verification sub-agent dispatch").

Step 5: Apply the sub-agent's findings. If a finding contradicts
        decisions.md, note the rejection in the phase's "Open questions"
        section with a one-line rationale.

Step 6: Halt. Reply to the operator with:
        - Path to the drafted phase MD.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Any open questions that need operator attention before
          execution can begin.
        - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to phase N+1. Do NOT execute migrations / extractors /
loaders. Do NOT modify the live codebase. Drafting is paper-only.

VERIFICATION SUB-AGENT:

After drafting, dispatch the sub-agent with:

  Tool: Agent
  subagent_type: Explore
  description: "Verify Phase <PHASE_NUMBER> draft against KTX spec"
  prompt: (paste the verification brief from phase-template.md, with
           the absolute paths filled in for this phase's MD,
           decisions.md, and review-findings.md)

The sub-agent reads files, finds drift, and reports under 400 words.
It does NOT modify files. You take its findings and apply them yourself.

If the sub-agent finds CRITICAL issues you can't resolve in-session,
list them under "Open questions" and recommend "needs another pass" to
the operator.

THE OPERATOR'S WORKFLOW:

After you halt, the operator reviews the phase MD and the sub-agent
findings. They either:
- Approve -> opens a new fresh terminal and runs this prompt again with
  <PHASE_NUMBER> incremented (or in parallel for the 2/3/4/5/6 set
  if the orchestrator chooses parallel drafting).
- Request revisions -> continues the current session with feedback. You
  apply revisions and dispatch the sub-agent again.

You are NOT the executor. The phase MD you produce is a plan. Execution
happens in a separate, later session driven by arc-orchestrator (or, if
arc-orchestrator hasn't shipped, by the operator manually opening a
fresh executor terminal per phase).

=== END PROMPT ===
```

---

## Optional: orientation hint to add when bootstrapping

If you want the fresh terminal to immediately understand context without re-reading from scratch, prepend the prompt with this hint (one paragraph):

```
Context hint: A previous Claude session (arc-planner) closed a five-pass
arc-brainstorm on KTX Layer 1 Onboarding and produced the scaffold at
docs/superpowers/plans/2026-05-04-ktx-onboarding/. The decisions doc
(20 entries), review findings (21+ count anchors), prerequisites,
phase template, and README are all written. The design spec at
docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md is the
source of truth. Your job is to draft Phase <N> following the structure
already in place. Read the README in that directory first; it tells you
the rest.
```

This saves the fresh terminal from re-deriving the situation. Optional -- the prompt above is self-contained.

---

## Recovery: phase MD comes back wrong

If the operator reviews a phase MD and finds it's still buggy after sub-agent verification:

1. Don't re-prompt the same terminal -- its context is now polluted with the wrong draft.
2. Open a new fresh terminal.
3. Paste this prompt with the same phase number.
4. Add a one-paragraph hint at the top: "The previous draft of phase-<N>-*.md had these issues: <X>, <Y>, <Z>. Read the file at <path>, then redraft. Don't preserve the old draft's bugs."
5. The new terminal redrafts from scratch with the corrections in mind.

This is the "fresh context for plan execution" pattern from the operator's memory (`feedback_fresh_context_for_execution.md`).
