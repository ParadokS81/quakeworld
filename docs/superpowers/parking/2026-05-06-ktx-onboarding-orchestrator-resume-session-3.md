# Arc-orchestrator resume handoff -- KTX Layer 1 Onboarding (session #3)

**Use as the literal first message in a fresh `claude` terminal.** Orchestrator session #2 wrapped at Phase 3 boundary as planned (avoiding smell zone at ~350k). Session #3 picks up to receive Phase 4's executor report, dispatch Phase 5 in the SAME executor terminal (operator decision), receive Phase 5's report, decide F25 architectural disposition, and dispatch Phases 6-8 (likely needing further fresh terminal handoffs).

---

## Where things are

KTX Layer 1 Onboarding arc state at session #3 start:

- **Phases 0/1/2/3:** SHIPPED. Commits chain: `860aaf0d` (P0) -> `ecf0151d` + `44b289ed` + `864fdf7c` (P1 + perf follow-on) -> `063bae80` (P2) -> `573d8b8e` (P3) -> `2bc78531` (orchestrator session #2's Phase 3 bookkeeping). All boundary probes PASS, independently re-verified.
- **Phase 4 (taxonomies):** dispatched to executor terminal at session #2 wrap; **may be in-flight, halted clean, or not yet started** when you pick this up. The Phase 4 executor briefing was written to `/tmp/ktx-phase-4-executor-prompt.md` and pasted into the executor terminal. Operator chose to keep the SAME executor terminal alive across Phase 4 + Phase 5 (continuity for F25 evidence-gathering).
- **Phase 5 (tables):** approved phase MD; will be dispatched to the SAME executor terminal after Phase 4 halts clean. You write the Phase 5 executor briefing.
- **Phases 6/7/8:** approved; not yet executed. Phase 6 (XSD-driven match_event handler; D3 carve-out) is the most independent next step.

**Counts in dev DB at session #3 start (Phase 3 ship state):**
- entities: cvar=260, command=358, info_key=7, log_template=1195 (Phase 2; KTX rows in `entities` table).
- gameplay_mechanics: game_mode=27, mode_default=317 (Phase 3; `gameplay_source_id='ktx'`).
- gameplay_mechanics WHERE kind IN ('election_type', 'death_rule'): TBD (Phase 4 deliverable; will be 5 + 27 if shipped).

**Arc plan scaffold:** `docs/superpowers/plans/2026-05-04-ktx-onboarding/`

- `decisions.md` -- 20 commitments + 3 dated 2026-05-05 amendments (D3 / D4 / D5).
- `review-findings.md` -- 25 findings (F23 + F24 from Phase 2; F25 from Phase 3; F8 expected to gain a 2026-05-06 framing amendment from Phase 4). F25 is the load-bearing carry-forward for the post-Phase-5 decision (this session decides).
- `prerequisites.md`, `phase-template.md`, `handoff-prompt.md` -- planning-time; ignore during execution.
- 9 per-phase MDs: `phase-0` through `phase-8`. Status table in `README.md` shows shipped vs approved.

**README.md "Where we are right now"** is up to date as of Phase 3 wrap (executor updated it in scope; orchestrator session #2 verified). Update again after each Phase 4 / 5 / 6 / 7 / 8 boundary.

**Original orchestrator session #2 entry doc:** `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume.md`. Skim only -- content has been absorbed into this session #3 resume + the README + the arc-history entries.

---

## Skill to invoke

`arc-orchestrator`. Drives per-phase executor terminals using the 5 remaining approved phase MDs (Phases 4 in-flight + 5 + 6 + 7 + 8). The orchestrator does NOT execute phase code itself -- it dispatches per-phase executor sessions, owns cross-phase memory, runs phase-boundary verification independently against live tree + dev DB.

**Operator standing call:**
- Phase 4 executor terminal: above Sonnet MAX floor (operator's call at session #2 wrap; Phase 4 is judgment-lighter than Phase 3 so likely Sonnet MAX or Opus medium).
- Phase 5 in the same terminal: likely Opus high (operator earlier flagged Phase 5 as judgment-dense; session #2 echoed this).
- Phase 6 will likely be a fresh executor terminal (XSD-driven, distinct shape).
- Phases 7 + 8 will likely be fresh terminals each (validation runbook + end-of-arc docs).

---

## Required reads (in order)

**Primary inputs (read in full before responding to the executor's Phase 4 halt):**

1. `docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md` -- phase index + "where we are right now" + slicing rationale + dependency map. Confirms Phases 0-3 shipped, Phase 4 dispatched.
2. `docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md` -- 20 commitments + 3 amendments. Particularly load-bearing for Phases 4-8: D3 (Visitor-only inheritance + match_event Phase 6 carve-out), D6 (handler grouping by walking strategy), D8 (single-key gate convention -- `{}` for taxonomies, `{"mode":"<token>"}` for overlays), D9 (source-fidelity tokens incl. underscored related_weapon names), D10 (dual-row design log_template + match_event), D14 (JSONB direct-bind), D15 (idempotent loaders), D16 (phase atomicity -- 2-for-2 since the Phase 1 deviation lesson; Phases 2 + 3 held), D17 (operator review at boundary), D18 (subagent matrix), D19 (ASCII), D20 (main tree, no PRs).
3. `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` -- 25 findings. Particularly load-bearing: F7 + F8 (Phase 4); F9 + F10 + F11 + F12 + F13 (Phase 5); F14 (Phase 6); F25 (cross-phase concern with disposition-deferred-to-post-Phase-5; THIS session decides).
4. `apps/qw-oracle/docs/arc-history.md` -- top three entries cover Phases 0-3. Read them to absorb cross-phase learnings sessions #1 and #2 captured. Phase 3's entry documents F25 in detail.
5. `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume.md` -- session #2's entry doc. Skim for context.

**Per-phase reads (each before kicking off the corresponding executor work):**

6. `phase-4-taxonomies-handler.md` (~1430 lines) -- Phase 4 MD (executor reads cold; you read first 600 + last 400 lines for boundary verification context).
7. `phase-5-tables-handler.md` (~2246 lines) -- Phase 5 MD. Read first 800 + last 400 lines before drafting Phase 5 executor briefing. F9-F13 + F11 amendment (drop_item 30 -> 31; macro depth-2 fallback).
8. `phase-6-match-event-handler.md` (~1485 lines) -- Phase 6 MD. XSD-driven, D3 carve-out, NOT libclang. F14 + F17 dual-row design.
9. `phase-7-validation.md` (~1582 lines) -- Phase 7 MD. F1 quality-grid probes for all 5 KTX projects + JSONB regression gate + cross-project audit + VALIDATION-RUNBOOK section.
10. `phase-8-end-of-arc-docs.md` (~2200 lines) -- Phase 8 MD. README/SCHEMA/OVERVIEW slim-doc sweep + 4 EXTRACTOR-PLAYBOOK additions + Pattern 10 widening + Pattern 16 + dual-row design note + doctrine-fix-survival.

**Operator memory (read on-demand):**
- `feedback_orchestrator_terminal_pattern.md`, `feedback_no_subagents_for_mechanical_edits.md`, `feedback_model_effort_range.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_verification_layer_catches_lift_residuals.md`, `feedback_idempotency_before_staleness.md`, `feedback_every_finding_gets_a_track.md`, `feedback_be_decisive.md`, `feedback_trust_operator_pace_estimates.md`, `feedback_repair_by_reextract_not_sql_update.md`.

---

## Critical rules for this arc (carry-forwards from sessions #1 + #2)

1. **D16 single-commit-per-phase: 2-for-2 since Phase 1 deviation.** Phase 2 held; Phase 3 held. Phase 4 + 5 + 6 + 7 + 8 should each ship as one commit. If an executor splits a phase into multiple commits, surface to operator -- not necessarily a violation (Phase 1's split was natural) but the rationale of "single resumable commit per phase" still applies.

2. **JSONB direct-bind per D14.** Every loader writing JSONB columns passes JS values directly or wraps with `tx.json(...)`. NEVER `JSON.stringify(...)` then bind as TEXT. Phase 7's regression gate (`F1.jsonb_columns_not_strings`) extends to KTX rows. Re-run the gate at every phase boundary.

3. **Working tree fence.** Operator's MCP-API contract WIP under `apps/qw-oracle/serve/mcp/*` + `apps/qw-oracle/CLAUDE.md` + untracked `apps/qw-oracle/API_CONTRACTS.md`, plus QWiki plan-doc edits under `docs/superpowers/plans/2026-05-04-qwiki-community-reference/*` are NOT KTX-arc territory. Verify executor commits do not include those files.

4. **F-amendments append; never overwrite.** F8 expected to gain a 2026-05-06 amendment in Phase 4 (29 vs 30 X-macro lines). F11 already has a 2026-05-05 amendment (drop_item 30 -> 31; macro depth-2 fallback) for Phase 5. F25's two-future-arc-options framing was the disposition; THIS session decides whether to act on it now (Pattern 13 retrofit on modes) or defer to a future arc.

5. **F25 decision tee-up at post-Phase-5 boundary -- THIS SESSION'S LOAD-BEARING DECISION.**

   **Context:** Phase 3's modes handler accumulates cross-file refs on instance state; multiprocessing.Pool fork workers lose join state. Workaround: serial-mode guard in `extract.py` (forces `--workers=1` when modes selected). Two refactor options documented in F25:
   - **Option 1 (Pattern 13 emission retrofit on modes):** modes handler emits cross-file refs as typed pseudo-rows from `end_file()`; finalize separates by `_kind` and joins. Pattern proven in Phase 2's commands handler (`_kind=_fn_def` rows alongside `_kind=_cmd` rows).
   - **Option 2 (`Visitor.parallel_safe: bool = True` attribute):** `extract.py` reads it to gate the serial fallback. Doesn't fix parallelism for affected handlers; just gates the workaround.

   **Decision algorithm at post-Phase-5 boundary:**
   - **If Phase 4 + 5 are both parallel-safe by structure (no cross-file state needs):** modes is confirmed outlier. Recommend **Option 1** -- retrofit modes via Pattern 13 as a Phase 5.5 amendment in this arc, before Phase 6 dispatches. Removes serial-mode guard, closes F25 cleanly.
   - **If Phase 4 OR Phase 5 surface cross-file state and use Pattern 13 cleanly per prior-engine convention:** modes is still the architectural outlier (other handlers got Pattern 13 right). Recommend **Option 1** retrofit.
   - **If Phase 4 OR Phase 5 surface cross-file state AND the Pattern 13 emission shape is awkward / multi-shape / harder than instance state:** Option 1 may be the wrong frame. Consider **Option 2** + parking the principled fix to a future arc with full design surface.

   **Predicted outcomes (from session #2 analysis):**
   - Phase 4 walks single-file ENUM_DECL + single-file X-macro text-parse -- **likely parallel-safe by structure**.
   - Phase 5 walks 5 single-file INIT_LIST_EXPR tables; teamplay_message Pattern 9 banner harvest is cross-file IF handler functions are defined in another .c file, in which case Pattern 13 emission per Phase 2's commands handler precedent applies cleanly.
   - **Most likely outcome:** modes confirmed outlier; Option 1 retrofit lands in this arc as Phase 5.5.

   **Surface to operator at post-Phase-5 boundary** with the evidence summary + recommendation; operator decides.

6. **Migration filename references in phase MDs are stale per D5 amendment.** Live filenames are `009 / 010 / 011`. Phase MDs that name slot numbers are stale relative to live; Phase 4 / 5 / 6 reference migrations abstractly so largely insulated.

7. **F23/F24 lessons from Phase 2 carry forward soft-watch:**
   - F23: probe-calibration mismatches (handler correct, probe wording stale). If a Phase 4/5/6/7 probe surfaces this shape, append F-amendment + correct probe inline.
   - F24: `load-version.ts validIdentifier` regex was extended for Pattern 14 colon suffixes. Phase 4 + 5 + 6 emit to `gameplay_mechanics` (NOT `entities`) -- different validation path. UNLIKELY to recur.

8. **Operator's MCP-API + qwiki side-tracks are off-scope.** Verify each phase commit's file list does not include those paths.

9. **ASCII output discipline per D19.** Code, doc, commit messages: ASCII only.

10. **Git workflow main-tree default per D20.** No worktrees. No PRs. Each phase commits a working state directly on `main`. Push to origin at natural checkpoints.

---

## Cross-phase dependencies (phase-order constraints)

```
Phases 0/1/2/3 (SHIPPED)
   |
   v
Phase 4 (in-flight) -- taxonomies, single-file walks; F25-watch (likely parallel-safe)
   |
   v
Phase 5 (next; same executor terminal) -- 5 tables; F25-watch (likely Pattern 13 cleanly)
   |
   v
F25 disposition decision (this session at post-Phase-5 boundary)
   +-- if Option 1: Phase 5.5 modes-handler Pattern 13 retrofit (~60 min; 1 file; pytest re-strengthen)
   +-- if Option 2: Visitor.parallel_safe attribute or future-arc parking
   |
   v
Phase 6 (match_event handler; XSD-driven; D3 carve-out)
   |
   v
Phase 7 (validation runbook + F1 quality probes + cross-project audit)
   |
   v
Phase 8 (end-of-arc docs sweep)
```

---

## First three actions

1. **Verify Phase 4 state.** Run:
   ```bash
   git log --oneline -5
   git -C /home/paradoks/projects/quakeworld status --short | wc -l
   # If a Phase 4 commit landed, identify it.
   git log --oneline 2bc78531..HEAD
   ```

   Three sub-cases:
   - **(a) Phase 4 commit landed AND executor halted clean:** receive the executor's halt report (operator pastes it). Independent verification per orchestrator skill Step 4 (re-run boundary probes 4-13 against dev DB; verify F25 evidence; check single-commit per D16). If clean, capture cross-phase memory (arc-history append + README refresh) + dispatch Phase 5 briefing in the same executor terminal.
   - **(b) Phase 4 in-flight (executor still running):** read the executor's interim status (operator surfaces). Default to operator's pace estimates; surface concrete blockers if any.
   - **(c) Phase 4 not yet started:** the executor terminal may have stalled or operator paused. Surface to operator; do NOT proactively re-dispatch.

2. **Read the arc scaffold cold.** `decisions.md` (full), `review-findings.md` (full), `arc-history.md` (top 3 entries; Phase 0/1/2/3). Phase 4 + 5 MDs strategic reads (first 600 + last 400 each) when the boundary work demands.

3. **Draft the Phase 5 executor briefing** at `/tmp/ktx-phase-5-executor-prompt.md` after Phase 4 ships clean. Standard shape (Where things are / Reads required / Critical rules / First three actions / When in doubt / Halt + report). Bake in cross-phase carry-forwards: F25 watch signal continues; F11 amendment (drop_item 30 -> 31; depth-2 macro fallback `_DROPITEM_MACRO_FALLBACK = {"H_ROTTEN": 1, "H_MEGA": 2}`); F9 + F10 + F12 + F13 anchors; D6 handler grouping; D9 source-fidelity tokens; D14 JSONB; D15 idempotent; D16 single commit. Operator standing call: Opus high in same executor terminal (continuity).

---

## When in doubt

- **Phase 4 executor reports DONE_WITH_CONCERNS with new F26+ finding.** Read the finding's evidence; verify against live source/DB; capture in `review-findings.md` per `feedback_every_finding_gets_a_track.md`. If the concern is bounded + workaround acceptable, proceed to Phase 5. If concern blocks Phase 5/6/7/8, surface to operator.

- **Phase 4 executor reports cross-file state need.** This IS the F25 evidence the orchestrator is waiting for. Capture how Phase 4 handled it (Pattern 13 emission cleanly? Or instance-state shortcut?). The shape informs the F25 decision at post-Phase-5 boundary.

- **Phase 4 executor splits Phase 4 into multiple commits.** Surface to operator. Phase 1's split was natural; Phase 4's would be a regression of the 2-for-2 D16 streak.

- **Phase 5 executor in same terminal hits context smell zone.** The Phase 4 briefing notes ~190k after Phase 4; Phase 5 adds ~150-200k for ~340-400k total. If executor's working memory crosses 350k mid-Phase-5, recommend halt + fresh executor terminal for Phase 5 second-half. The phase-atomicity rule still requires single commit at end of Phase 5; partial-handoff with mid-phase commit would deviate.

- **F25 evidence at post-Phase-5 boundary is ambiguous.** If Phase 4 was parallel-safe by structure but Phase 5's tables surfaced cross-file state in a shape that's clearly Pattern 13 (matches Phase 2's commands handler), modes is outlier and Option 1 wins. If Phase 5 surfaced something more complex, surface evidence + ask operator: "Pattern 13 retrofit (option 1) vs Visitor.parallel_safe attribute (option 2) vs defer to future arc?" with plain-English consequences.

- **Operator pace estimate diverges from orchestrator's projection.** Trust operator. Surface concrete blockers if they emerge.

- **Context-budget pressure on this orchestrator session approaches 350k.** Wrap the current phase boundary cleanly. Write a session #4 resume handoff. Operator opens fresh orchestrator terminal for the remaining phases. Don't push past 400k for cross-phase verification + memory capture.

---

## Context budget guidance

Session #2 wrapped at ~290k after Phases 0/1/2/3 boundary verifications + bookkeeping commits. Session #3 starts at ~30k (fresh terminal); reading the arc scaffold + Phase 4/5 strategic sections costs ~80-100k; Phase 4 boundary verification + memory capture ~50k; Phase 5 briefing draft ~15k; Phase 5 boundary verification + memory capture ~50k; F25 decision ~10k.

Estimated session #3 trajectory:
- Reading scaffold + Phase 4 strategic: 30k → 130k.
- Receive Phase 4 report + verify + capture memory: 130k → 180k.
- Phase 5 briefing draft: 180k → 195k.
- Receive Phase 5 report + verify + capture memory: 195k → 245k.
- F25 decision + (if Option 1) Phase 5.5 dispatch + verify: 245k → 290k.
- Phase 6 briefing draft + dispatch: 290k → 305k.

If Phase 6 dispatches in this session, session #4 handoff happens at the post-Phase-6 boundary (~340k). If F25 disposition is Option 1 (Pattern 13 retrofit on modes), the Phase 5.5 amendment commit + verification adds ~30k; budget gets tight; consider session #4 handoff right after Phase 5.5 ships rather than dispatching Phase 6.

---

## Post-arc next steps (session #3 + #4 territory)

After all 9 phases ship + arc-reviewer runs spec-vs-shipped:

1. Delete two HANDOVER bullets (per the original session #2 resume doc).
2. Land the arc retrospective in `apps/qw-oracle/docs/arc-history.md` (top-level "ARC SHIPPED" line above the per-phase bullets).
3. Unblock the qw-event-log validation harness parking doc.
4. Layer 3 concept-note candidates parked at `2026-05-04-ktx-layer3-concept-note-candidates.md` become eligible.
5. arc-reviewer pass MUST run in a fresh terminal (skill requirement); session #3 or #4 writes the post-arc handoff to `docs/superpowers/parking/YYYY-MM-DD-ktx-onboarding-postarc-handoff.md`.

---

## Session #2 closure note

Session #2 shipped Phases 1 perf follow-on closure + Phase 2 + Phase 3, all with single-commit-per-phase D16 discipline. Caught the F25 architectural concern at Phase 3 with full disposition documented; deferred the fix decision to post-Phase-5 boundary (this session) because the right refactor option depends on whether Phase 4 + 5 surface similar cross-file-state needs. No outstanding session #2 obligations.

Phase 4 executor briefing was delivered to `/tmp/ktx-phase-4-executor-prompt.md`; operator pasted into a fresh executor terminal immediately at session #2 wrap. Phase 5 executor briefing is THIS session's job to draft after Phase 4 halts clean.
