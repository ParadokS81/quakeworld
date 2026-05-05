# Arc-orchestrator resume handoff -- KTX Layer 1 Onboarding (session #2)

**Use as the literal first message in a fresh `claude` terminal.** Orchestrator session #1 wrapped at the smell zone (~400k context) after Phase 0 + Phase 1 shipped. Session #2 picks up from the Phase 1 perf follow-on verification and drives Phases 2-8 to completion.

---

## Where things are

KTX Layer 1 Onboarding arc state at session #1 wrap:

- **Phase 0 (doctrine fixes):** SHIPPED. Commit `860aaf0d`. All 8 boundary probes PASS independently. Cross-phase memory captured (arc-history entry + README status).
- **Phase 1 (foundation: Pattern 6 lift + 3 migrations + gameplay_sources):** SHIPPED with concerns. Commits `ecf0151d` (Pattern 6 lift + tests + ezquake refactor) + `44b289ed` (migrations 009/010/011 renumbered per D5 amendment + gameplay_sources + phase-MD update). All 9 required boundary probes PASS independently. Probe 10 (regression) skipped (no pre-phase baseline).
- **Phase 1 perf follow-on:** **PENDING** at session #1 wrap. Operator chose option (b) -- in-arc scope-narrowing fix to `collect_file_macros` so `cursor.get_tokens()` only runs on macros whose body starts with `"`. Executor briefing at `/tmp/ktx-phase-1-followon-executor-prompt.md` (may need re-creation -- see "First three actions"). Target: F16 walk-time overhead 66-163% -> under 80%. Will land an F16 2026-05-06 amendment with before/after timing numbers.
- **Phases 2-8:** all phase MDs `approved`. None executed.

**Arc plan scaffold:** `docs/superpowers/plans/2026-05-04-ktx-onboarding/`

- `decisions.md` -- 20 commitments + 3 dated 2026-05-05 amendments (D3 / D4 / D5)
- `review-findings.md` -- 22 findings with multiple amendments. F16 carries one 2026-05-05 amendment; a second 2026-05-06 amendment lands with the perf follow-on commit
- `prerequisites.md` -- inherited from Arc 1 + KTX-specific items; verified live at session #1 pre-flight
- `phase-template.md` -- mandatory shape
- `handoff-prompt.md` -- per-phase drafter prompt (planning-time; ignore during execution)
- 9 per-phase MDs: `phase-0-doctrine-fixes.md` through `phase-8-end-of-arc-docs.md`. All approved.
- 8 per-phase drafter prompts: planning-time only; ignore.

**README "Where we are right now"** is up to date as of session #1 wrap; reflects Phase 1 shipped + Phase 2 next + the F16 / D16 / probe-spec concerns inline.

**Original orchestrator handoff (planning-to-execution bridge):** `docs/superpowers/parking/2026-05-05-ktx-onboarding-orchestrator-handoff.md` -- session #2 should skim it for context but the content has been absorbed into this resume doc + the README + the arc-history entries.

## Skill to invoke

`arc-orchestrator`. Drives per-phase executor terminals using the 7 remaining approved phase MDs (Phases 2-8). The orchestrator does NOT execute phase code itself -- it dispatches per-phase executor sessions, owns cross-phase memory, runs phase-boundary verification independently against live tree + dev DB.

**Orchestrator/executor model + effort:** operator's standing call is **Sonnet MAX in all executor terminals** as the floor. The phase MDs' per-task `subagent (...)` annotations remain authoritative for what each subagent runs at; executor honors those regardless of its own model. Operator left open the option to bump Phase 3 + Phase 5 executor terminals to Opus medium (longest phase MDs, judgment-dense -- _handler_modes.py with 27-row two-axis discriminator catalog + ~309 mode_default overlays; _handler_gameplay_tables.py with 5 distinct table walks + Pattern 9 banner harvest).

## Required reads (in order)

**Primary inputs (read in full before starting):**

1. `docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md` -- phase index + "where we are right now" + slicing rationale + dependency map.
2. `docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md` -- 20 commitments + 3 amendments. Particularly load-bearing for Phases 2-6: D3 (Visitor-only inheritance + match_event carve-out per Phase 6), D4 (Pattern 6 depth-1 lift; F16 perf-amendment will be on top), D6 (handler grouping by walking strategy), D7 (Pattern 14 canonical-name suffixes), D8 (single-key gate convention), D9 (source-fidelity tokens), D10 (dual-row design log_template + match_event), D14 (JSONB binding), D15 (idempotent loaders), D16 (phase atomicity -- Phase 1 deviated; coalesce in future), D17 (operator review at boundary), D18 (subagent vs inline matrix), D19 (ASCII), D20 (main tree, no PRs).
3. `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` -- 22 findings. Particularly load-bearing for execution: F1-F4 (cvar / command / info_key / log_template counts -- live numbers per amendments), F5/F6/F15 (modes + cross-header dependency for Phase 3), F7/F8 (Phase 4), F9/F10/F11/F12/F13 (Phase 5 tables; F9 hp_for_kill amended; F11 drop_item count 30->31 + macro depth-2 amended), F14/F17 (match_event + dual-row), F19/F22 (doctrine-fix survival), F16 (walk-time overhead -- two amendments expected after the perf follow-on lands).
4. `apps/qw-oracle/docs/arc-history.md` -- the top two entries cover Phase 0 + Phase 1 in detail. Read them; they encode the cross-phase learnings session #1 captured.
5. `docs/superpowers/parking/2026-05-05-ktx-onboarding-orchestrator-handoff.md` -- session #1 entry doc. Skim only.

**Per-phase (read each before kicking off the corresponding executor):**

6. `phase-2-pass1-entity-handlers.md` (~2200 lines) -- 4 entity handlers (cvars + commands + info_keys + log_templates) + 4 loader wirings + KTX dispatch wiring. Longest phase MD. F1-F4 amendments load-bearing.
7. `phase-3-modes-handler.md` (~2000 lines) -- modes handler + load-modes.ts. 27 catalog rows + ~309 mode_default overlays. Soft dep on Phase 1 Pattern 6 lift (verified working at session #1 wrap). modes-augment.yaml seed file.
8. `phase-4-taxonomies-handler.md` (~1700 lines) -- taxonomies handler (Pattern 10 ENUM_DECL widening + Stage 2 deathtype.h X-macro file parse). election_type 5 + death_rule 27.
9. `phase-5-tables-handler.md` (~2700 lines) -- tables handler. 5 distinct INIT_LIST_EXPR walks + Pattern 9 banner harvest + handler-private depth-2 macro fallback dict (`H_ROTTEN`, `H_MEGA` per F11 amendment). monster 13 / score_system 3 / drop_item 31 / loc_macro 15 / teamplay_message 21.
10. `phase-6-match-event-handler.md` (~1500 lines) -- match_event standalone XSD-driven handler (D3 carve-out; NOT inheriting from Visitor; duck-typed lifecycle stubs). 7 entity rows + 13 emission sites. F14 spec 5.6.b regex deviation (DELIVERED-DIFFERENT-AS-DOCUMENTED at arc-reviewer time).
11. `phase-7-validation.md` (~1600 lines) -- F1 probes (`makeFloorCountProbe` + new `makeGameplayKindProbe` helper) + 5 anchor probes + JSONB regression gate extension + per-loader idempotency-ktx.sh + KTX VALIDATION-RUNBOOK section + 5-engine cross-project audit.
12. `phase-8-end-of-arc-docs.md` (~2200 lines) -- README/SCHEMA/OVERVIEW slim-doc sweep + 4 EXTRACTOR-PLAYBOOK additions (Pre-Port Discovery / Pre-Commit Cross-Check / Handler-grouping / Pattern 15 STRING_LITERAL-array) + Pattern 10 widening note + Pattern 16 X-macro file parse + dual-row design note + doctrine-fix-survival across 5 sites.

**Secondary context (skim as needed):**

13. `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` -- the original spec; treat as scope/intent source. Specific counts come from review-findings.md per multiple amendments.
14. `apps/qw-oracle/CLAUDE.md` -- project conventions; D14 JSONB rule; Bun runtime; idempotency.
15. `apps/qw-oracle/SCHEMA.md` -- existing Layer 1 schema reference.
16. `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- pattern catalog (Pattern 4 / 5 / 6 / 9 / 10 / 14 in scope; Pattern 15 + Pattern 16 + Pattern 10 ENUM_DECL widening land in Phase 8).
17. `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- Phase 7 mirrors per-engine convention; Phase 0 fixed lines 5 + 373 per F22 (verified shipped).
18. Operator memory (read on demand): `feedback_orchestrator_terminal_pattern.md`, `feedback_no_subagents_for_mechanical_edits.md`, `feedback_model_effort_range.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_verification_layer_catches_lift_residuals.md`, `feedback_idempotency_before_staleness.md`, `feedback_every_finding_gets_a_track.md`, `feedback_be_decisive.md`, `feedback_trust_operator_pace_estimates.md`.
19. `~/.claude/skills/arc-planner/references/arc-phase-archetypes.md` -- phase-shape verification approaches.

## Critical rules for this arc (carry-forwards from session #1)

1. **Spec is locked per D1; amendments via dated blocks only.** Multiple amendments already accrued during planning + Phase 0 + Phase 1. Mid-execution amendments follow the same pattern: dated block under the original decision/finding, never silently override. F16 will gain a second 2026-05-06 amendment when the perf follow-on lands.

2. **KTX is libclang per D2.** Phase 0 fixed 5 doctrine sites; Phase 8 verifies survival. Don't recurse the wrong claim in any new docs added during the arc.

3. **All libclang KTX handlers inherit from Visitor only per D3.** match_event handler is the documented carve-out (XSD-driven, standalone) per D3's 2026-05-05 amendment + D6 placement.

4. **Pattern 6 depth-1 lift live in `extractor_lib._source.collect_file_macros`.** Phase 3's `_handler_modes.py` consumes it for `LGCMODE_VARIABLE` / `TOT_MODE_VARIABLE` cross-header resolution. Depth-N revisit PARKED in HANDOVER per D4 amendment; do NOT amend mid-execution. Phase 5's `_handler_gameplay_tables.py` uses a handler-private fallback dict for `H_ROTTEN` / `H_MEGA` (depth-2; F11 amendment).

5. **Migration slot collision per D5 amendment.** Live filenames are **`009/010/011`** (renumbered from D5's named 008/009/010). All references in Phase MDs that name slot numbers are stale relative to live; refer abstractly. Phase 1's wrap committed the renumbered files. Phase 8's slim-doc sweep references migrations abstractly.

6. **Handler grouping by walking strategy per D6.** Four KTX gameplay handlers grouped by libclang traversal (modes / taxonomies / tables / match_events). One output JSON per handler. Phase 8 lands "Handler-grouping rationale" PLAYBOOK section.

7. **Pattern 14 canonical-name suffixes per D7.** Commands: `<name>:frogbot:std` / `<name>:frogbot:editor` (defensive marker per F2 amendment -- live std-vs-editor collisions = 0). Info_keys: `<bare>:userinfo`. Per-file dedup keyed on FULL canonical name.

8. **Single-key gate convention per D8.** All gameplay rows gate on `{"mode":"<token>"}` (user-facing token). Catalog rows themselves use `{}`.

9. **Source-fidelity tokens per D9.** Mode names match user-facing command spelling exactly (`ca`, `2on2`, `lgc`).

10. **Dual-row design for log_template + match_event per D10.** Phase 2's printf-handler catches XML-shaped log_printfs as channel='logfile' rows. Phase 6's match_event handler ALSO emits rows for the same emission sites. The duplicate IS the design; do NOT deduplicate. Phase 8 lands a PLAYBOOK note.

11. **JSONB direct-bind discipline per D14.** NEVER `JSON.stringify(...)` then bind as TEXT. Pass JS values directly to postgres-js or wrap with `tx.json(...)`. Phase 7's regression gate (extending `F1.jsonb_columns_not_strings`) catches violations.

12. **Idempotent loaders per D15.** All KTX loaders use natural-key UPSERT. Re-run produces identical state. `load-version` regression guard NOT bypassed.

13. **Phase atomicity per D16; D16 was deviated in Phase 1 (2 commits instead of 1).** Future executor terminals should coalesce when feasible. Operator review at every phase boundary per D17 -- do not auto-proceed.

14. **Subagent dispatch default per D18.** Inline only for purely textual edits with full content shipped inline; everything else is subagent. Per-task model + effort annotated in each phase MD's task table. Operator's standing call: Sonnet MAX as executor terminal floor; per-task annotations route subagent dispatch.

15. **ASCII output discipline per D19.** Code, doc, commit messages: ASCII-only.

16. **Git workflow main-tree default per D20.** No worktrees. No PRs. Each phase commits a working state directly on `main`. Push to origin at natural checkpoints.

## Cross-phase dependencies (phase-order constraints)

```
Phase 0 (SHIPPED)
   |
   v
Phase 1 (SHIPPED w/ concerns; perf follow-on PENDING)
   |
   +---> Phase 2 (Pass 1 entity handlers + loaders)
   +---> Phase 3 (modes handler; soft dep on Pattern 6 lift -- VERIFIED WORKING)
   +---> Phase 4 (taxonomies handler)
   +---> Phase 5 (tables handler)
   +---> Phase 6 (match_event handler)
              |
              v
         Phase 7 (validation)
              |
              v
         Phase 8 (end-of-arc docs)
```

Phases 2 / 3 / 4 / 5 / 6 are mutually independent at the data level after Phase 1 lands the foundation. Phase 7 needs all of them; Phase 8 needs Phase 7. Phase 1 -> any of 2-6 is the open gate as of session #2 start; the perf follow-on commit is a small additive that does NOT block Phase 2.

## First three actions

1. **Verify the Phase 1 perf follow-on commit landed cleanly (or kick it off if not yet started).**

   Run:
   ```bash
   git log --oneline -5
   ls /tmp/ktx-phase-1-followon-executor-prompt.md 2>&1
   ```

   Three sub-cases:
   - **(a) Commit landed before session #1 wrap-out** (last commit message mentions Pattern 6 perf / iteration-time filter): re-run `python3 -m pytest apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_collect_file_macros.py -v` (expect 4 PASS) + spot-check that `_source.py` has the iteration-time filter shape (`/usr/bin/grep -n 'TokenKind.LITERAL\|first_token\|peek' apps/qw-oracle/scripts/extractors/extractor_lib/_source.py | head -5`). If both green, append the F16 2026-05-06 amendment + arc-history note for the follow-on, mark Phase 1 fully wrapped, proceed to step 2.
   - **(b) Commit not yet landed AND `/tmp/ktx-phase-1-followon-executor-prompt.md` exists**: hand the briefing to the operator, who opens a fresh terminal for the follow-on executor. Wait for the executor's halt; verify; capture cross-phase memory; proceed to step 2.
   - **(c) Commit not landed AND briefing file gone (e.g., `/tmp` cleared)**: re-create the briefing from the F16 amendment + the per-fix description in `apps/qw-oracle/docs/arc-history.md` Phase 1 entry. Then case (b).

2. **Read the scaffold + Phase 2 MD cold.** Even though session #1 read most phase MDs in part, session #2 is fresh; the orchestrator skill requires full coverage. Strategy: read `decisions.md`, `review-findings.md`, `arc-history.md` (top two entries) in full; read `phase-2-pass1-entity-handlers.md` first 1000 + last 400 lines; defer Phases 3-8 deep reads until each phase boundary (per `feedback_trust_operator_pace_estimates.md` -- momentum over completism).

3. **Build the Phase 2 executor briefing** at `/tmp/ktx-phase-2-executor-prompt.md`. Standard shape (Where things are / Reads required / Critical rules / First three actions / When in doubt / Halt + report). Bake in cross-phase carry-forwards: D3 Visitor-only inheritance, D7 Pattern 14 suffixes (frogbot:std / frogbot:editor / userinfo per F2-F3 amendments), D14 JSONB binding for log_template loader (XML-shaped `log_printf` payloads land as channel='logfile' rows per F4 anchor + F17 dual-row design), D17 phase atomicity (coalesce commits per Phase 1's D16 deviation lesson), F1 cvar count amendment (192 unique k_-prefixed; API split inverted vs original spec), F2 std/editor 14/25 + 0 collisions (Pattern 14 stays defensive), F3 7 unique star-keys + 36 write sites, F4 per-API live counts. Phase 2 estimated context budget: ~350k for the executor; biggest single phase. Operator opens fresh terminal at Sonnet MAX (Opus medium optional bump if 4-handler synthesis stalls).

## When in doubt

- **Phase 1 perf follow-on tests fail post-optimization.** The filter is over-aggressive (skipping macros it shouldn't). Halt the optimization commit; surface to operator. The contract is preserved only if all 4 tests pass; the optimization is conditional on that.

- **Phase 2 executor surfaces a count drift on F1-F4 anchors.** Live source moves; F1-F4 already have 2026-05-05 amendments tracking the drift. If a third drift surfaces, append a new F-amendment with the live numbers + a short rationale; update Phase 2's verification probes accordingly. Do NOT silently widen probes.

- **D16 deviation pattern recurs.** If a phase's executor splits work across multiple commits, surface to operator before sign-off. Phase 1's split was natural (lift before migrations) but the rationale of "single resumable commit per phase" still applies for Phase 2-8.

- **JSONB binding regression catches a violation in Phase 2-6 loaders.** Phase 7's gate is canonical; Phase 2-6 must respect D14 from the start. If `F1.jsonb_columns_not_strings` returns FAIL, a loader regressed -- diagnose by `SELECT jsonb_typeof(col)='string'` per target table.

- **Phase 1 Probe 10 (regression) still uncovered.** No pre-Phase-1 snapshot exists; future engine ports should establish a baseline before introducing infrastructure changes. Consider parking as a HANDOVER followup if the operator wants regression-baseline discipline encoded.

- **Operator pace estimates are tighter than orchestrator's.** Operator memory `feedback_trust_operator_pace_estimates.md` -- surface concrete numbers (e.g., "Phase 2's commands handler subagent has been running 25 minutes; row count not yet emitted"), not generic risk anxiety.

- **F22-class discoveries during execution.** Mid-execution findings append to `review-findings.md` with sequential F-numbers (F23+). F22 was the planning-time precedent; the qwiki community arc's F23-F28 series is the execution-time precedent.

## Context budget guidance

Session #1 wrapped at ~400k after Phase 0 + Phase 1. Phase 2 alone is projected at ~350k for the executor (4 handlers + 4 loaders synthesis); the orchestrator's verification work + memory capture adds 30-50k per phase boundary. Estimated remaining-arc context cost for the orchestrator session: 200-300k for Phases 2-8 boundary verification + memory capture + Phase 8 wrap.

Session #2 should expect to wrap at the smell zone (~350k) somewhere mid-arc -- likely after Phase 4 or Phase 5 (the largest phase MDs). Plan a session #3 handoff at that boundary; the resume-handoff template is right here.

## Post-arc next steps (session #2 + session #3 territory)

After all 9 phases ship + `arc-reviewer` runs spec-vs-shipped:

1. Delete two HANDOVER bullets ("qw-oracle slim-doc Arc 1 refresh sweep" -- absorbed by Phase 8; "KTX Layer 1 Onboarding" Active arcs entry).
2. Land the arc retrospective in `apps/qw-oracle/docs/arc-history.md` (top-level "ARC SHIPPED" line above the per-phase bullets, mirroring the qwiki + Arc 1 patterns).
3. Unblock the qw-event-log validation harness parking doc (`docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md`) -- Phase 6's match_event entity rows are exactly what it needs.
4. The Layer 3 concept-note candidates parked at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md` become eligible for authoring.
5. The arc-reviewer pass MUST run in a fresh terminal (skill requirement); session #2 or #3 writes the post-arc handoff to `docs/superpowers/parking/YYYY-MM-DD-ktx-onboarding-postarc-handoff.md`.

## Session #1 closure note

Session #1 shipped cleanly: pre-flight reads + Phase 0 dispatch + verification + memory capture; Phase 1 dispatch + verification + memory capture; perf follow-on briefing + this resume doc. Decisions made by session #1: F16 disposition deferred to operator (chose option (b) -- in-arc fix); orchestrator chose to wrap at Phase 1 boundary rather than push into Phase 2 with degraded judgment fidelity. No outstanding orchestrator obligations.
