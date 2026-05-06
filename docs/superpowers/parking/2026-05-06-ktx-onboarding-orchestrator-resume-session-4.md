# Arc-orchestrator resume handoff -- KTX Layer 1 Onboarding (session #4)

**Use as the literal first message in a fresh `claude` terminal.** Orchestrator session #3 wrapped after Phases 4 + 5 + 5.5 shipped + verified + bookkept. Session #4 picks up to receive Phase 6's executor halt report (executor terminal opened in parallel from briefing at `/tmp/ktx-phase-6-executor-prompt.md`), verify the boundary, capture cross-phase memory, and dispatch Phases 7 + 8 (likely each in their own fresh executor terminals).

---

## Where things are

KTX Layer 1 Onboarding arc state at session #4 start:

- **Phases 0/1/2/3/4/5/5.5:** SHIPPED. Commit chain: `860aaf0d` (P0) -> `ecf0151d` + `44b289ed` + `864fdf7c` (P1 + perf follow-on) -> `063bae80` (P2) -> `573d8b8e` (P3) -> `03a5b366` (P4) -> `377f8549` (P5) -> `44f5b894` (P5.5). Orchestrator bookkeeping interleaved at `cb46fd85` (P4) / `c0cb89a3` (P5 + F25 disposition + P5.5 dispatch) / `cf90d1c8` (P5.5 wrap + P6 prep). All boundary probes PASS, independently re-verified at each phase by orchestrator session #3.
- **Phase 6 (XSD-driven match_event handler):** dispatched to a fresh executor terminal at session #3 wrap; **may be in-flight, halted clean, or not yet started** when you pick this up. Phase 6 executor briefing at `/tmp/ktx-phase-6-executor-prompt.md` (~standard shape; carry-forwards baked in).
- **Phases 7 + 8:** approved phase MDs; not yet executed. Each likely fresh executor terminal.

**Counts in dev DB at session #4 start (Phase 5.5 ship state):**
- entities (Phase 2): cvar=260, command=358, info_key=7, log_template=1195. Phase 6 will add 7 `type='match_event'` rows.
- gameplay_entity_defs: monster=13 (Phase 5).
- gameplay_mechanics (Phases 3 + 4 + 5): game_mode=27, mode_default=317, election_type=5, death_rule=27, score_system=3, drop_item=31, loc_macro=15, teamplay_message=21 = 446 total. Phase 6 adds NO gameplay_mechanics rows (match_event lives in entities + match_event_versions).
- match_event_versions: 0 rows (Phase 1 created the empty table; Phase 6 fills it with 7 rows -- one per complexType).

**Arc plan scaffold:** `docs/superpowers/plans/2026-05-04-ktx-onboarding/`

- `decisions.md` -- 20 commitments + 3 dated 2026-05-05 amendments (D3 / D4 / D5).
- `review-findings.md` -- 27 findings (F23 + F24 from Phase 2; F25 from Phase 3 with 2026-05-06 disposition-closure amendment for Phase 5.5; F26 + F27 from Phase 5; F11 has 2 amendments; F8 + F9 each have 2 amendments). All Phase 6 territory: F14 (7 match_events + 13 emission sites; 2026-05-05 amendment corrects simpleType count 5 -> 4 + spec 5.6.b regex multi-line wrapper shape) + F17 (printf-handler intentionally catches XML-shaped log_printfs per D10 dual-row design).
- `prerequisites.md`, `phase-template.md`, `handoff-prompt.md` -- planning-time; ignore during execution.
- 9 per-phase MDs: `phase-0` through `phase-8`. Phase index status table in `README.md` shows shipped vs approved.

**README.md "Where we are right now"** is up to date as of Phase 5.5 wrap + Phase 6 dispatch prep (orchestrator session #3 verified). Update again after each Phase 6 / 7 / 8 boundary.

**Original orchestrator session entry docs (read on-demand):**
- Session #1 wrap-out: in commit `9e89186f` (Phase 1 wrap).
- Session #2 entry: `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume.md`.
- Session #3 entry: `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume-session-3.md` (skim only -- absorbed into this session #4 resume + arc-history + README).

---

## Skill to invoke

`arc-orchestrator`. Drives the remaining 3 approved phase MDs (Phase 6 in-flight + 7 + 8). The orchestrator does NOT execute phase code -- it dispatches per-phase executor sessions, owns cross-phase memory, runs phase-boundary verification independently against live tree + dev DB.

**Operator standing call:**
- Phase 6 executor: fresh terminal (XSD parse + grep is distinct shape from Phases 2-5.5 libclang handlers; clean verification posture preferred). Operator chooses model + effort.
- Phase 7 (validation runbook + F1 quality probes + JSONB regression gate + cross-project audit): likely fresh terminal; mixed code + research; subagent dispatch matrix per phase MD's annotations (F1 probes Sonnet medium; cross-project audit Opus medium).
- Phase 8 (end-of-arc docs sweep): likely fresh terminal; mostly inline markdown work per `feedback_no_subagents_for_mechanical_edits.md`; PLAYBOOK additions for F17 dual-row + F26 string-literal scope + F27 banner-coverage variability + Pattern 13 emission rule from F25 closure.

---

## Required reads (in order)

**Primary inputs (read in full before responding to the executor's Phase 6 halt):**

1. `docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md` -- phase index + "where we are right now" + slicing rationale + dependency map. Confirms Phases 0-5.5 shipped, Phase 6 dispatched.
2. `docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md` -- 20 commitments + 3 amendments. Particularly load-bearing for Phases 6-8: D3 amendment (match_event is the documented carve-out from Visitor-only inheritance; XSD-driven, standalone with duck-typed lifecycle stubs), D5 amendment (migration filenames `009 / 010 / 011` -- live filenames; phase MDs reference migrations abstractly), D10 (dual-row design for log_template + match_event), D14 (JSONB direct-bind), D15 (idempotent loaders), D16 (single-commit-per-phase -- 5-for-5 since Phase 1 deviation), D17 (operator review at boundary), D18 (subagent matrix), D19 (ASCII), D20 (main tree, no PRs).
3. `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` -- 27 findings. Particularly load-bearing: F14 (Phase 6) with 2026-05-05 amendment locking simpleType count 4 + multi-line wrapper regex shape; F17 (Phase 2 preserves + Phase 6 also emits + Phase 8 documents -- dual-row design); F25 disposition-closure amendment (Phase 5.5 backfill `44f5b894`); F26 + F27 (Phase 5; Phase 8 PLAYBOOK note candidates); F21 (Phase 7 validation runbook obligation).
4. `apps/qw-oracle/docs/arc-history.md` -- top entry covers Phases 0-5.5 with full retrospectives (~1 long block dated 2026-05-05 with chronological bullets). Read in full to absorb cross-phase learnings sessions #1/#2/#3 captured. Particularly: Phase 5.5's bullet documents the Pattern 13 three-consumer arc-pattern + the Visitor.parallel_safe rejection rationale; Phase 5's bullet documents F26 + F27 + the WEAPON_BIG2 fallback fix.
5. `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume-session-3.md` -- session #3's entry doc. Skim for context on the F25 disposition decision + Phase 5.5 dispatch reasoning.

**Per-phase reads (each before kicking off the corresponding executor work):**

6. `phase-6-match-event-handler.md` (~1485 lines) -- Phase 6 MD. XSD-driven (NOT libclang), D3 carve-out, F14 + F17 dual-row design. Read first 600 + last 400 lines for boundary verification context.
7. `phase-7-validation.md` (~1582 lines) -- Phase 7 MD. F1 quality-grid probes for all 5 KTX projects + JSONB regression gate + cross-project audit + VALIDATION-RUNBOOK section. Read first 800 + last 400 lines before drafting Phase 7 executor briefing.
8. `phase-8-end-of-arc-docs.md` (~2200 lines) -- Phase 8 MD. README/SCHEMA/OVERVIEW slim-doc sweep + 4 EXTRACTOR-PLAYBOOK additions (now 7 with F25/F26/F27 PLAYBOOK candidates: Pre-Port Discovery Sweep + Pre-Commit Discovery Cross-Check + Handler-grouping rationale + Pattern 15 STRING_LITERAL-array walker + Pattern 10 ENUM_DECL widening + Pattern 16 X-macro file-parse + Pattern 13 emission as cross-file ref convention + dual-row design note + Pattern 6 string-literal-scope note + Pattern 9 banner-coverage variability note) + Pattern 10 widening (broaden title from MACRO_DEFINITION-only to header-defined declarations) + dual-row design note + doctrine-fix-survival.

**Operator memory (read on-demand):**
- `feedback_orchestrator_terminal_pattern.md`, `feedback_no_subagents_for_mechanical_edits.md`, `feedback_model_effort_range.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_verification_layer_catches_lift_residuals.md`, `feedback_idempotency_before_staleness.md`, `feedback_every_finding_gets_a_track.md`, `feedback_be_decisive.md`, `feedback_trust_operator_pace_estimates.md`, `feedback_repair_by_reextract_not_sql_update.md`.

---

## Critical rules for this arc (carry-forwards from sessions #1 + #2 + #3)

1. **D16 single-commit-per-phase: 5-for-5 since Phase 1 deviation.** Phases 2 / 3 / 4 / 5 / 5.5 each shipped as one commit. Phase 6 + 7 + 8 should each ship as one commit. If an executor splits, surface to operator -- not necessarily a violation but the rationale of "single resumable commit per phase" still applies.

2. **JSONB direct-bind per D14.** Every loader writing JSONB columns passes JS values directly or wraps with `tx.json(...)`. NEVER `JSON.stringify(...)` then bind as TEXT. Phase 6's `match_event_versions.attributes_json` + `emission_call_sites_json` both go through `tx.json(...)`. Phase 7's regression gate (`F1.jsonb_columns_not_strings`) extends to KTX rows + Phase 6's match_event_versions. Re-run the gate at every phase boundary.

3. **Working tree fence.** Operator's MCP-API contract WIP under `apps/qw-oracle/serve/mcp/*` + `apps/qw-oracle/CLAUDE.md` + untracked `apps/qw-oracle/API_CONTRACTS.md`, plus QWiki plan-doc edits under `docs/superpowers/plans/2026-05-04-qwiki-community-reference/*` are NOT KTX-arc territory. Verify executor commits do not include those files. Working-tree fence held cleanly across Phases 0-5.5.

4. **F-amendments append; never overwrite.** F14 has the 2026-05-05 amendment locking simpleType count 4 + multi-line wrapper regex shape; Phase 6 reproduces those anchors. F25 has the 2026-05-06 disposition-closure amendment with backfilled `44f5b894` commit hash. F26 + F27 still flagged for Phase 8 PLAYBOOK additions.

5. **Pattern 13 emission is now MANDATORY for any future libclang handler with cross-file refs.** The F25 disposition-closure rule was articulated as cross-arc invariant (lives in F25 amendment prose + Phase 8 PLAYBOOK addition list). Phase 6's match_event handler is the D3 carve-out (XSD-driven, not libclang) so this rule does not directly apply -- Phase 6 has its own duck-typed lifecycle stub design. But if Phase 6 surfaces any unexpected libclang work, hold to Pattern 13 for cross-file accumulation.

6. **F25 closed in-arc.** No carry-forward; the rejection-of-parallel_safe rule is now a Phase 8 PLAYBOOK addition candidate, not a watch signal.

7. **Phase 6 carve-out pattern reminders.** D3 amendment 2026-05-05: `_handler_match_events.py` is the documented carve-out from D3's "Visitor only" rule. Standalone class with duck-typed lifecycle stubs (`setup` / `_parse_xsd` / `_grep_emissions` / `_merge_emissions_into_events` / `finalize`). NOT a Visitor subclass. NOT libclang. Phase MD has the verbatim shape inline.

8. **Migration filename references in phase MDs are stale per D5 amendment.** Live filenames are `009 / 010 / 011`. Phase 6/7/8 MDs reference migrations abstractly so largely insulated.

9. **F23/F24 lessons from Phase 2 + F26/F27 from Phase 5 carry forward soft-watch:**
   - F23: probe-calibration mismatches (handler correct, probe wording stale). If a Phase 6/7 probe surfaces this shape, append F-amendment + correct probe inline.
   - F26: collect_file_macros is string-literal-only; integer/hex constants need handler-private fallback dicts. Phase 6 doesn't use libclang macros; not directly relevant.
   - F27: Pattern 9 banner-coverage probe assumed Doom-style banner blocks; KTX teamplay.c uses line-comment style. Phase 6 doesn't use Pattern 9; not directly relevant.

10. **Operator's MCP-API + qwiki side-tracks are off-scope.** Verify each phase commit's file list does not include those paths.

11. **ASCII output discipline per D19.** Code, doc, commit messages: ASCII only.

12. **Git workflow main-tree default per D20.** No worktrees. No PRs. Each phase commits a working state directly on `main`. Push to origin at natural checkpoints.

---

## Cross-phase dependencies (phase-order constraints)

```
Phases 0/1/2/3/4/5/5.5 (SHIPPED)
   |
   v
Phase 6 (in-flight or halted) -- match_event handler; XSD-driven; D3 carve-out
   |
   v
Phase 7 (validation runbook + F1 quality probes + JSONB regression gate + cross-project audit)
   |
   v
Phase 8 (end-of-arc docs sweep -- 7+ EXTRACTOR-PLAYBOOK additions including F25/F26/F27 carry-forwards)
   |
   v
arc-reviewer pass (fresh terminal; spec-vs-shipped walkthrough)
```

---

## First three actions

1. **Verify Phase 6 state.** Run:
   ```bash
   git log --oneline -5
   git -C /home/paradoks/projects/quakeworld status --short | wc -l
   git log --oneline cf90d1c8..HEAD
   ```
   Three sub-cases:
   - **(a) Phase 6 commit landed AND executor halted clean:** receive the executor's halt report (operator pastes it). Independent verification per orchestrator skill Step 4 (re-run boundary probes from `phase-6-match-event-handler.md` against dev DB; verify F14 anchors -- 7 match_event entity rows + 13 emission sites; verify F17 dual-row preservation -- printf-handler still emits XML-shaped logfile rows AND match_event handler emits per-type rows). If clean, capture cross-phase memory (arc-history append + README refresh) + draft Phase 7 executor briefing.
   - **(b) Phase 6 in-flight (executor still running):** read the executor's interim status (operator surfaces). Default to operator's pace estimates; surface concrete blockers if any.
   - **(c) Phase 6 not yet started:** the executor terminal may have stalled or operator paused. Surface to operator; do NOT proactively re-dispatch.

2. **Read the arc scaffold cold.** `decisions.md` (full), `review-findings.md` (full), `arc-history.md` top entry (full -- it's long but absorbing it makes Phase 6/7/8 verification much sharper). Phase 6 MD strategic read (first 600 + last 400 lines) when boundary work demands.

3. **Draft the Phase 7 executor briefing** at `/tmp/ktx-phase-7-executor-prompt.md` after Phase 6 ships clean. Standard shape (Where things are / Reads required / Critical rules / First three actions / When in doubt / Halt + report). Bake in cross-phase carry-forwards: F1 quality-grid probes for all KTX kinds (cvars / commands / info_keys / log_templates / game_mode / mode_default / election_type / death_rule / monster / score_system / drop_item / loc_macro / teamplay_message / match_event); JSONB regression gate extends to all 5 new gameplay kinds + match_event_versions; cross-project audit must verify KTX onboarding doesn't break any prior-engine probe; VALIDATION-RUNBOOK.md adds KTX section. D18 subagent matrix per phase MD. D16 single-commit. D19 ASCII. D20 main tree.

---

## When in doubt

- **Phase 6 executor reports DONE_WITH_CONCERNS with new F28+ finding.** Read the finding's evidence; verify against live source/DB; capture in `review-findings.md` per `feedback_every_finding_gets_a_track.md`. If the concern is bounded + workaround acceptable, proceed to Phase 7. If concern blocks Phase 7/8, surface to operator.

- **Phase 6 executor splits Phase 6 into multiple commits.** Surface to operator. The 5-for-5 D16 streak is worth preserving unless the split is structurally clean.

- **Phase 6 executor's XSD parse produces row count != 7.** F14 amendment locks 7 complexTypes. If live `ktxlog_0.1.xsd` produces a different count, source-walk with the executor's evidence + decide whether to amend F14 (third amendment) or treat as bug. Two-walk-discipline applies (F8 + F9 + F11 each had multiple amendments where source-walks legitimately corrected prior anchors; if a fourth re-walk produces a different count without source change, that's a corruption signal).

- **Phase 6 executor's emission grep produces row count != 13.** F14 amendment locks 13 emission sites under the multi-line wrapper regex. If live source produces a different count, audit the regex shape (single-line vs multi-line; spec 5.6.b vs amended) before amending F14.

- **F17 dual-row design appears violated.** Phase 2's printf-handler should still emit XML-shaped logfile rows; Phase 6's match_event handler should ALSO emit per-type rows. If either side stops emitting, that's a regression. Verify both sides ship rows post-Phase-6.

- **Operator pace estimate diverges from orchestrator's projection.** Trust operator. Surface concrete blockers if they emerge.

- **Context-budget pressure on this orchestrator session approaches 350k.** Wrap the current phase boundary cleanly. Write a session #5 resume handoff. Operator opens fresh orchestrator terminal for the remaining phases. Don't push past 400k for cross-phase verification + memory capture.

---

## Context budget guidance

Session #3 wrapped at well below the 350k smell zone after Phases 4 + 5 + 5.5 boundary verifications + bookkeeping commits + F25 disposition decision + Phase 6 briefing draft + this handoff. Session #4 starts at ~30k (fresh terminal); reading the arc scaffold + Phase 6 strategic sections costs ~80-100k; Phase 6 boundary verification + memory capture ~50k; Phase 7 briefing draft ~15k.

Estimated session #4 trajectory:
- Reading scaffold + Phase 6 strategic: 30k -> 130k.
- Receive Phase 6 report + verify + capture memory: 130k -> 180k.
- Phase 7 briefing draft: 180k -> 195k.
- Receive Phase 7 report + verify + capture memory: 195k -> 245k.
- Phase 8 briefing draft + dispatch: 245k -> 260k.

If Phase 8 dispatches in this session, session #5 handoff happens at the post-Phase-8 boundary (~310k). If context gets tight earlier, write session #5 handoff right after Phase 7 ships rather than dispatching Phase 8.

---

## Post-arc next steps (session #4 + #5 territory)

After Phase 8 ships + arc-reviewer runs spec-vs-shipped:

1. Delete two HANDOVER bullets (per the original session #2 resume doc).
2. Land the arc retrospective in `apps/qw-oracle/docs/arc-history.md` (top-level "ARC SHIPPED" line above the per-phase bullets).
3. Unblock the qw-event-log validation harness parking doc (Phase 6 ships the schema-level unblock; Phase 7 + 8 don't gate further).
4. Layer 3 concept-note candidates parked at `2026-05-04-ktx-layer3-concept-note-candidates.md` become eligible.
5. arc-reviewer pass MUST run in a fresh terminal (skill requirement); session #4 or #5 writes the post-arc handoff to `docs/superpowers/parking/YYYY-MM-DD-ktx-onboarding-postarc-handoff.md`.

---

## Session #3 closure note

Session #3 received Phase 4's halt report + verified, dispatched Phase 5 in the same executor terminal (operator decision), received Phase 5's halt report (DONE_WITH_CONCERNS; F26 + F27 inline-resolved) + verified, made the F25 disposition call (Option 1 Pattern 13 retrofit on modes as Phase 5.5 in-arc; Visitor.parallel_safe opt-out path REJECTED), dispatched Phase 5.5 in fresh executor terminal, received Phase 5.5's halt report + verified (live parallel-vs-serial diff empty; 3.3x speedup), backfilled F25 amendment commit hash, then drafted the Phase 6 executor briefing + this session #4 handoff. All bookkeeping commits clean (`cb46fd85` / `c0cb89a3` / `cf90d1c8`); D16 streak held at 5-for-5; working-tree fence held; ASCII discipline held; F25 closed in-arc.

Phase 6 executor briefing was delivered to `/tmp/ktx-phase-6-executor-prompt.md`; operator pastes into a fresh executor terminal at session #4 start. Phase 7 executor briefing is THIS session's job to draft after Phase 6 halts clean.
