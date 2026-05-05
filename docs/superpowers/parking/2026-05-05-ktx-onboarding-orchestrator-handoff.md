# Arc-orchestrator handoff -- KTX Layer 1 Onboarding

**Use as the literal first message in a fresh `claude` terminal.** This terminal runs arc-orchestrator cold against a complete, approved arc plan.

---

## Where things are

The KTX Layer 1 Onboarding arc has finished planning. Outputs:

- **Arc-plan scaffold (the source of truth from this point forward):** `docs/superpowers/plans/2026-05-04-ktx-onboarding/`
  - `README.md` -- phase index + status column + read-in-this-order guide. "Where we are right now" reflects planning COMPLETE.
  - `decisions.md` -- 20 cross-cutting commitments (D1-D20) with three dated amendments: D3 (match_event Visitor carve-out per D6), D4 (PARSE_OPTS flag pre-existing; lift adds macro-walk only), D5 (migration slot collision; Phase 1 renumbers at execution time).
  - `review-findings.md` -- 22 findings (F1-F22). Multiple amendments accrued during planning source-walks: F1 (API split inverted; 181/114 live), F2 (std_commands 14, std-vs-editor collisions 0), F3 (7 unique star-keys), F4 (per-API count drift within tolerance), F8 (29 / 27 / 2 vs 30 / 28 / 2), F9 (`hp_for_kill` not `armor_for_kill`), F11 (count 30 -> 31; macro depth-2 with handler-private fallback), F14 (simpleType 5 -> 4; spec 5.6.b regex literal deviation), F17 (XML log_printf count clarified; dual-row design unaffected). F22 was added during Phase 0 drafting as the 5th doctrine site (VALIDATION-RUNBOOK.md).
  - `prerequisites.md` -- operator-side Task 0. Most items inherited from qw-oracle Arc 1; KTX-specific items: research/repos/ktx checkout + libclang/python3-clang already installed.
  - `phase-template.md` -- mandatory shape for each phase MD; sub-agent verification brief.
  - `handoff-prompt.md` -- the master per-phase drafter prompt (used during planning; less relevant during execution).
  - 9 per-phase MDs: `phase-0-doctrine-fixes.md` through `phase-8-end-of-arc-docs.md`. All 9 approved.
  - 8 per-phase drafter prompts: used during planning only; ignored during execution.

- **Design spec (frozen reference):** `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (~1480 lines, five-pass arc-brainstormer close).
  - The original spec. NOTE: per F14 amendment, the spec's section 5.6.b regex literal mismatches live source -- phase MD ships a live-source-faithful regex; arc-reviewer marks DELIVERED-DIFFERENT-AS-DOCUMENTED. Otherwise treat the spec as scope/intent source of truth; specific count anchors come from `review-findings.md` per the multiple amendments.

- **Sibling spec (Pass 2 generalization):** `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md` -- prod-MCP update lifecycle generalised to all codebases. Not gating for KTX execution; informs the post-Phase-7 prod update lifecycle.

- **Research repo:** `research/repos/ktx/` -- canonical KTX (https://github.com/QW-Group/ktx); operator-pinned tag is canonical-1.46 (master HEAD at planning time). Phase 0 verifies tag still latest; if newer tag has shipped, executor bumps version cell at SCHEMA.md sweep time.

- **Planning commit history (on `main` branch):**
  - `ee4177a0` scaffold (decisions / findings / prereqs / phase-template / handoff-prompt / README)
  - `08510258` Phase 0 + F22 added (VALIDATION-RUNBOOK 5th doctrine site)
  - `16a2227f` Phase 1 + D4 / F16 amended (PARSE_OPTS pre-existing; lift adds macro-walk only)
  - `7a2542d6` Phase 2 + F1 / F2 / F3 / F4 / F17 amended (live-source counts; Pattern 14 reframed defensive)
  - `80617b17` Phase 3 (F5 / F6 / F15 reproduced; yawnmode carry-forward for executor-time verify)
  - `b57813b7` Phase 4 + F8 amended (29 / 27 / 2 per live; related_weapon canonical names corrected)
  - `4856fb35` Phase 5 + F9 amended (`hp_for_kill`) + F11 amended (count 31; macro depth-2 fallback); D4 depth-N parked as future small arc
  - `03005e98` Phase 6 + D3 amended (match_event Visitor carve-out) + F14 amended (simpleType 5 -> 4; regex deviation)
  - `6be963c1` Phase 7 (idempotency-ktx.sh defect caught + rewritten; README banner CHECK widening 9 -> 10)
  - `7acbd83e` Phase 8 drafter prompt augmented with cross-phase carry-forwards
  - `e85de674` Phase 8 approved + D5 amended (migration slot collision; Phase 1 renumbers at execution time)

## Skill to invoke

`arc-orchestrator` (in `~/.claude/skills/arc-orchestrator/`). Drives per-phase executor terminals using the 9 approved phase MDs. The orchestrator does NOT execute phase code itself -- it dispatches per-phase executor sessions, owns cross-phase memory (decisions.md amendments, mid-arc review-findings additions, executor-prompt augmentation per phase based on prior-phase learnings), tracks executor context budget and recommends fresh-terminal handoff when budget enters smell zone (~350k), verifies phase outputs against live source at every phase boundary.

## Required reads (in priority order)

**Primary inputs (read in full before starting):**

1. `docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md` -- phase index, "where we are right now" lines, read-in-this-order guide, slicing rationale, dependency map.
2. `docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md` -- 20 cross-cutting commitments + 3 dated amendment blocks (D3 / D4 / D5). Every phase respects these.
3. `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` -- 22 findings with multiple amendments. Particularly load-bearing for execution: F1-F4 (cvar / command / info_key / log_template counts -- live numbers, not original spec numbers), F5 / F6 / F15 (modes / mode_default / cross-header macro dependency), F7 / F8 (election / death_rule), F9 / F10 / F11 / F12 / F13 (gameplay tables; F9 + F11 carry amendments), F14 + F17 (match_event + dual-row design), F19 / F22 (doctrine-fix survival across 5 sites).
4. `docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md` -- mandatory shape for any phase-MD revisions you might make mid-arc.
5. `docs/superpowers/plans/2026-05-04-ktx-onboarding/prerequisites.md` -- operator-side Task 0. Most items inherited from Arc 1; check before kicking off Phase 0.

**Per-phase (read each before kicking off the corresponding executor terminal):**

6. `phase-0-doctrine-fixes.md` -- doctrine fixes across 5 reference sites (F19 + F22) + delete obsolete TS regex extractor + create OUT_OF_SCOPE.md.
7. `phase-1-foundation.md` -- Pattern 6 cross-header lift + migrations 008/009/010 + new gameplay_sources row for 'ktx'. NOTE: D5 amendment flags migration slot collision; executor renumbers at start-of-phase.
8. `phase-2-pass1-entity-handlers.md` -- Pass 1 first-class entity handlers (cvars + commands + info_keys + log_templates) + 4 loader wirings + KTX dispatch wiring. The longest phase MD (~2200 lines).
9. `phase-3-modes-handler.md` -- modes handler (game_mode catalog 27 + mode_default overlays ~309). Soft dep on Phase 1's Pattern 6 lift.
10. `phase-4-taxonomies-handler.md` -- election_type 5 + death_rule 27.
11. `phase-5-tables-handler.md` -- monster 13 + score_system 3 + drop_item 31 + loc_macro 15 + teamplay_message 21. Handler-private `_DROPITEM_MACRO_FALLBACK` per F11 amendment.
12. `phase-6-match-event-handler.md` -- match_event handler (XSD-driven, not libclang) + 7 entity rows + 13 emission sites. Standalone class with duck-typed stubs per D3 amendment.
13. `phase-7-validation.md` -- 19 F1 probes + JSONB regression gate + idempotency probe + 10-widening per-migration probes + KTX VALIDATION-RUNBOOK section + 5-engine cross-project audit.
14. `phase-8-end-of-arc-docs.md` -- slim-doc Arc 1 refresh sweep + EXTRACTOR-PLAYBOOK additions + doctrine-fix-survival verification across 5 sites.

**Secondary context (skim as needed):**

15. `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` -- the original spec. Treat as scope/intent source; specific counts come from review-findings.md per multiple amendments.
16. `apps/qw-oracle/CLAUDE.md` -- project conventions; D14 Bun runtime; D19 ASCII discipline.
17. `apps/qw-oracle/SCHEMA.md` -- existing Layer 1 schema reference; KTX migrations append at execution time.
18. `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- pattern catalog (Pattern 4 / 5 / 6 / 9 / 10 / 14 in scope; Pattern 15 is new from Phase 5; Phase 8 lands the documentation).
19. `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- Phase 7 mirrors per-engine convention; Phase 8 verifies F22 doctrine fix survived.
20. `~/.claude/skills/arc-planner/references/arc-phase-archetypes.md` -- phase-shape verification approaches; useful when verifying phase outputs.
21. `HANDOVER.md` -- "D4 depth-N Pattern 6 lift revisit" small followup (parked future arc; trigger when 2nd engine surfaces a depth-2+ macro).

## Critical rules for this arc (operator preferences + arc-specific commitments)

1. **Spec is locked per D1; amendments via dated blocks only.** Multiple amendments already accrued during planning (D3, D4, D5 in decisions; F1-F4, F8, F9, F11, F14, F17 in findings; F22 added). Mid-execution amendments follow the same pattern: dated block under the original decision/finding, never silently override. If the amendment changes downstream phase scope, those phases need re-drafting before execution proceeds.

2. **KTX is libclang, not tree-sitter, per D2.** Phase 0 fixed 5 doctrine sites; Phase 8 verifies they survive. If new docs added during execution recurse the wrong claim, catch and correct in the same commit. The dusty-ktx fork's `qcsrc/` is tree-sitter territory; that's a separate future arc, NOT this one.

3. **All libclang KTX handlers inherit from Visitor only per D3.** match_event handler is the documented carve-out (XSD-driven, not libclang) per D3's 2026-05-05 amendment + D6 placement. Don't subclass parent-project handlers (ezQuake / FTE / MVDSV / QWCL); read MVDSV's handlers as templates only.

4. **Pattern 6 lifted to depth-1 #include walk per D4.** Phase 1 ships the lift in `extractor_lib._source.collect_file_macros`. Adds post-parse macro-walk over depth-1 closure; PARSE_OPTS already had PARSE_DETAILED_PROCESSING_RECORD set per D4 amendment. Depth-N revisit is PARKED in HANDOVER as future small arc -- NOT this arc's scope. If a Phase 3-7 surface case requires depth-2+ resolution, use handler-private fallback dict (Phase 5 pattern) and surface to operator; do not amend D4 mid-execution.

5. **Migration slot collision per D5 amendment.** D5's named slots 008/009/010 collide with qwiki community arc's `008_community_schema.sql` (already shipped). Phase 1 executor: (a) `ls apps/qw-oracle/db/migrations/ | sort` at start-of-phase; (b) renumber the three KTX migrations to next-available slots, preserving order (channel widening first, match_event next, gameplay kinds last); (c) update SCHEMA.md / VALIDATION-RUNBOOK.md / phase MDs that reference filenames. Phase 8's slim-doc sweep refers to migrations abstractly to insulate against renumbering.

6. **Handler grouping by walking strategy per D6.** Four KTX gameplay handlers grouped by libclang traversal pattern (modes / taxonomies / tables / match_events). One output JSON per handler. Phase 8 lands "Handler-grouping rationale" PLAYBOOK section.

7. **Pattern 14 canonical-name suffixes per D7.** Commands: `<name>:frogbot:std` / `<name>:frogbot:editor` for sub-namespaces (defensive marker per F2 amendment -- live std-vs-editor collisions = 0, but D7 stays locked). Info_keys: `<bare>:userinfo`. Per-file dedup keyed on FULL canonical name.

8. **Single-key gate convention per D8.** All gameplay rows gate on `{"mode":"<token>"}` (user-facing token). Catalog rows themselves use `{}`.

9. **Source-fidelity for canonical tokens per D9.** Mode names match user-facing command spelling exactly (`ca`, `2on2`, `lgc`, etc.). No translation.

10. **Dual-row design for log_template + match_event per D10.** Phase 2's printf-handler catches XML-shaped log_printfs as channel='logfile' rows. Phase 6's match_event handler ALSO emits rows for the same emission sites. The duplicate IS the design; do NOT deduplicate. Phase 8 lands a PLAYBOOK note.

11. **JSONB direct-bind discipline per D14.** NEVER `JSON.stringify(...)` then bind as TEXT. Pass JS values directly to postgres-js or wrap with `tx.json(...)`. Phase 7's regression gate (probe extending F1.jsonb_columns_not_strings) catches violations; do not bypass.

12. **Idempotent loaders per D15.** All KTX loaders use natural-key UPSERT (ON CONFLICT DO UPDATE). Re-run produces identical state. Existing `load-version` regression guard (aborts when entity counts drop >50% without `--force`) is NOT bypassed.

13. **Phase atomicity + boundary verification per D16 + D17.** Each phase ends with a single commit leaving the system runnable. Verification probes are YES/NO, not interpretive prose. Operator review at every phase boundary; do not auto-proceed.

14. **Subagent dispatch default for code-synthesis tasks per D18.** Inline only for purely textual edits with full content shipped inline; everything else is subagent. Per-task model + effort annotated in each phase MD's task table; respect the rough-cut unless executor finds it wrong.

15. **ASCII output discipline per D19.** Code, doc, commit messages: ASCII-only, no emoji, no em/en-dashes. The operator runs `docs-check` and these patterns trigger noise.

16. **Git workflow main-tree default per D20.** No worktrees. No PRs. No 4-option merge menus. Each phase commits a working state directly on `main`. Push to origin at natural checkpoints. The operator does not touch git.

## Cross-phase dependencies (phase-order constraints)

```
Phase 0 (doctrine fixes; markdown only)
   |
   v
Phase 1 (foundation: Pattern 6 lift + 3 migrations + gameplay_sources row)
   |
   +---> Phase 2 (Pass 1 entity handlers + loaders)
   +---> Phase 3 (modes handler; soft dep on Phase 1's Pattern 6 lift)
   +---> Phase 4 (taxonomies handler)
   +---> Phase 5 (tables handler)
   +---> Phase 6 (match_event handler; XSD-driven)
              |
              v
         Phase 7 (validation: F1 probes + runbook + cross-project audit)
              |
              v
         Phase 8 (end-of-arc obligations)
```

Parallelizable: Phases 2 / 3 / 4 / 5 / 6 are mutually independent at the data level after Phase 1 lands the foundation. Phase 7 needs all of them; Phase 8 needs Phase 7. Phase 0 -> Phase 1 is strict serial.

## First three actions

1. **Scope check.** Read `prerequisites.md` and verify operator-side prerequisites are in place: KTX checkout at `research/repos/ktx/` with master HEAD at canonical-1.46 or later (executor bumps if newer); libclang + python3-clang installed (verify with `python3 -c "import clang.cindex"`); Postgres dev container `qw-oracle-postgres-dev` running. Check `db/migrations/` for the next-available slot (D5 amendment flags 008 collision). If any prereq missing, halt and route to operator.

2. **Open Phase 0 executor terminal.** Phase 0 is markdown-only (5 doctrine-fix sweeps + 1 deletion + 1 creation). Use the arc-executor skill (or operator drives manually). The Phase 0 MD has tasks for each of the 5 reference sites (OVERVIEW.md / EXTRACTOR-PLAYBOOK.md / extractors/CLAUDE.md / VALIDATION-RUNBOOK.md / user-memory file `project_extraction_pipeline_vision.md`) + git rm of `apps/qw-oracle/scripts/extractors/ktx/commands.ts` + create `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md`. Phase boundary: verify all 5 sites have zero `tree-sitter` references in KTX context; verify obsolete TS file deleted; verify OUT_OF_SCOPE.md has all 7 entries.

3. **Set up cross-phase memory capture.** Any new findings discovered during execution append to `review-findings.md` with sequential F-numbers (F23+). Any decisions.md amendments land as dated amendment blocks under the original decision (per the D3 / D4 / D5 patterns from planning). Do NOT silently override decisions in a phase MD; if a phase needs to deviate, halt and surface to operator first. Track executor context budget per phase; recommend fresh-terminal handoff if approaching ~350k.

## When in doubt

- **A count anchor doesn't reproduce at execution time.** Apply the source-walk amendment pattern that worked during planning: drafter source-walked, found drift, landed dated amendment. Verify the live count is correct, append amendment to the relevant F-finding, update phase verification probes accordingly. Several anchors carry "live drift since Pass 5.4" notes -- KTX master HEAD moves, expect minor drift.

- **Migration slot collision recurrence.** D5 amendment flagged 008. Phase 1 renumbers; if qwiki ships more migrations between planning and Phase 1 execution, renumber further. Lock filenames at Phase 1 start-of-phase by reading `db/migrations/`.

- **F9 hp_for_kill validates differently at Phase 7.** F9 has been amended TWICE during planning (count_modifier -> armor_for_kill -> hp_for_kill). Soft watch: if Phase 7's data validation surfaces a third name, that's a corruption signal worth spot-checking the source-walk discipline. Pause and verify by direct grep before amending.

- **Pattern 6 cross-header dependency surfaces a depth-2+ macro.** Phase 5 already shipped this case (`H_ROTTEN`/`H_MEGA` at depth-2 in `include/g_consts.h`). Use the same handler-private fallback dict pattern: frozen-keyed (raises KeyError if missing), preserves failure-loud-not-silent. The principled fix is the parked D4 depth-N revisit (HANDOVER followup); do NOT amend D4 mid-execution.

- **A new template variant or unknown enum value surfaces during Phase 4 / 5.** Treat as a finding. If the affected migration hasn't shipped, amend the phase MD's CHECK constraint inline. If shipped, propose a new migration file with operator approval. Do NOT silently widen.

- **JSONB binding regression catches a violation.** Phase 7's regression gate is the canonical detector. Read `feedback_postgres_js_jsonb_binding.md` if unfamiliar; the fix is `tx.json(...)` wrapper or pass JS value directly. Never `JSON.stringify(...)` + TEXT bind.

- **match_event handler complexity.** It's standalone (D3 amendment), XSD-driven, with duck-typed lifecycle stubs. Pattern is unique to this handler in the arc. Read Phase 6 MD's Task 1 for the four-stage shape: `setup` -> `_parse_xsd` -> `_grep_emissions` -> `_merge_emissions_into_events` -> `finalize`.

- **Spec section 5.6.b regex literal mismatch is questioned.** Phase 6 ships a live-source-faithful multi-line regex (per F14 amendment). Spec stays as-written. Arc-reviewer marks DELIVERED-DIFFERENT-AS-DOCUMENTED. The spec amendment process exists but was not invoked here -- the deviation is documented in F14 + phase MD body.

- **Operator pace estimates are tighter than orchestrator's projection.** Surface concrete numbers (e.g., "Phase 2's handler subagent has been running 25 minutes; row count not yet emitted"), not generic risk anxiety. Operator memory `feedback_trust_operator_pace_estimates.md`. Operator pushes back with "use more subagents" / "merge phases" / "let it run" as preferred.

## Wave-2 status

Wave 2 (arc-orchestrator + arc-executor skills) is shipped and available. The orchestrator can dispatch per-phase executor terminals via the arc-executor skill OR the operator can drive them manually. Either is valid; the orchestrator + executor skills add coordination + verification structure on top of manual driving.

## Post-arc next steps

After all 9 phases ship + arc-reviewer's spec-vs-shipped walkthrough closes:

1. Delete two HANDOVER bullets ("qw-oracle slim-doc Arc 1 refresh sweep" and the "KTX Layer 1 Onboarding" Active arcs entry).
2. Land the arc retrospective in `apps/qw-oracle/docs/arc-history.md` (append-only).
3. Unblock the qw-event-log validation harness parking doc (`docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md`) -- match_event entity rows + Phase 6 are exactly what it needs.
4. The Layer 3 concept-note candidates parked at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md` become eligible for authoring.
