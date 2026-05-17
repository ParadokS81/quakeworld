# KTX/MVDSV L1 describe-fill -- arc-orchestrator (wave-2 execution) handoff

**For:** a fresh terminal taking the arc from PLAN-COMPLETE into EXECUTION
via the `arc-orchestrator` skill. Created 2026-05-17 at arc-plan completion
(planner session 3 approved Phase 5 v2; all phase MDs 0-5 approved). The
planner role is DONE; this is the wave-1 -> wave-2 boundary. The
orchestrator does NOT execute phase code -- it dispatches per-phase executor
terminals (`arc-executor`), owns cross-phase memory, and verifies every
phase boundary against live source.

## Where things are

- Arc dir: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`.
  Scaffold + slicing LOCKED. **PLAN COMPLETE 2026-05-17.**
- **Phases 0,2,3,4,5: APPROVED.** **Phase 1: APPROVED + a dated F-D4a
  scope-amendment** (one added task -- the owned-row guard at the shared
  derive tail -- specified in full in the Phase-1 MD's amendment block; the
  Phase-1 body is stale-pending that task's integration). Phase 6: the
  deferrable, non-gating tail (the D16 dev showcase) -- NOT drafted (premature
  per D16 until the post-arc dev conversation); a separate later prompt.
- The arc is COMPLETE and useful at end of Phase 5 (D16/D17). Phase 6 does
  NOT gate completion.
- Tree: this arc's files committed + pushed; the latest commit is the
  plan-complete checkpoint (Phase 5 v2 approved + this handoff). Parallel
  unrelated arcs also land on `main` -- not this arc's concern (the
  `enforce-L1-runtime-truth` arc has its own terminals).
- Verification regimes per phase are LOCKED in the README phase-index +
  "Slicing analysis". Draft order (README): Phase 0 and Phase 1 are
  independent -> run first, parallel terminals; then 2 -> 3 -> 4 sequential;
  5 after 1-4; 6 deferrable. Watch phases for context budget: 1, 2, 4
  (subagent-heavy mandatory; Phase 1 likely needs a mid-phase fresh-terminal
  handoff at execution).

## Reads required (in order)

1. This handoff.
2. Arc `README.md` -- status (PLAN COMPLETE), the locked slicing analysis,
   phase index, non-goals.
3. `decisions.md` -- C1-C5, P1-P5, D1-D19. **Read every DATED amendment /
   clarification block IN FULL** (load-bearing, never re-derive blind):
   C3 amendment (self-built reproducible oracle); D2 clarification
   (`description_origin` already exists, four-tag vocabulary); **D9
   amendment** (~157 -> ~109 conflation fix; M=260/183 are the C1 gates);
   **D11 amendment** (additive `structured_choices` provenance element);
   **D7 clarification** ("cheap" = effort-routing; ONE Opus-4.7-MAX D6
   invocation per knob; no cheaper pre-classify tier); **D9 clarification**
   (`mvdsv.6` IS the D9 mechanical sibling -- the regular roff skeleton is
   harvested, the prose-quality judgement is the downstream D6 step; the
   `coverage.ndjson` LLM-assisted tag is not a contradiction);
   **D4 amendment (F-D4a -- THE most load-bearing)**: the owned-row guard
   at the shared `derive-entity-description.ts` tail is a PHASE-1-SPINE
   deliverable (predicate = `description_origin IN
   ('synthesized','shipped_doc')` -- owned-track membership ALONE, no anchor
   conjunct; all four arc-bucket derivers; before Phase 2's first owned
   write); Phase 5 consumes it; D19.
4. `review-findings.md` -- the risk ledger. F-C3a DISSOLVED.
   **F-D4a (GRAVE)** -- read it in full; it gates execution sequencing.
   F-C2a/F-C5a (Grave), F-D12a/b, F-D11a, F-D13a, F-D10b/c, F-C3b, F-D14a.
5. `phase-template.md` -- the mandatory phase-MD shape + the verification
   sub-agent brief (item 8 in its 2026-05-17-corrected form: canonical KTX
   AND MVDSV are BOTH libclang/C; the D9 shipped-config / man-page siblings
   are NEW non-libclang text handlers, NOT the registration handler, NOT
   tree-sitter).
6. The spec `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. When spec and decisions.md disagree, spec wins.
7. The phase MDs in execution order: `phase-0-probes.md`,
   `phase-1-discipline.md` (**read its top AMENDMENT block first -- the
   F-D4a owned-row-guard task its executor must integrate**),
   `phase-2-ktx-mechanical-extract.md`, `phase-3-ktx-source-synthesis.md`,
   `phase-4-mvdsv-fill.md`, `phase-5-staleness-projections.md`.
8. The per-phase prompts: `phase-0-drafter-prompt.md` ..
   `phase-5-drafter-prompt.md` (the drafter prompts model the per-phase
   recon discipline; the orchestrator generates per-phase EXECUTOR prompts
   from `handoff-prompt.md` + the phase MDs).
9. The planner session handoffs in `handoffs/` (session-2, session-3) --
   context for how the plan was gated; not re-litigated.
10. Memory: `feedback_verify_dispatched_terminal_claims`,
    `feedback_no_inference`, `feedback_inference_not_evidence`,
    `feedback_fresh_context_for_execution`, `feedback_be_decisive`,
    `feedback_one_question_at_a_time`, `feedback_operator_not_technical_review_gate`,
    `feedback_orchestrator_terminal_pattern`, `feedback_model_effort_range`,
    `project_arc_workflow_design`, `project_qw_dev_head_not_releases`,
    `feedback_arc_sequencing_operator_bandwidth`.
11. Invoke the `arc-orchestrator` skill. Confirm plan-complete locked state;
    do NOT relitigate.

## Critical rules (locked; do not relitigate)

- **THE VERIFICATION DISCIPLINE -- highest priority, proven 6x.** Every
  phase cold-review (0-5) produced exactly one load-bearing catch or
  correction; Phase 5's was **F-D4a, a GRAVE arc-invalidating gap that
  survived FOUR approved phases** until the final-gate fresh-context review.
  An executor's (and its sub-agent's) "verified clean" is a HYPOTHESIS.
  Re-derive every load-bearing number/path/shape via psql/grep/ls at every
  phase boundary before accepting it (`feedback_verify_dispatched_terminal_claims`).
  Do NOT trust a prior session's "verified".
- **F-D4a SEQUENCING (execution-critical, non-negotiable).** The owned-row
  guard MUST be live in `derive-entity-description.ts` (all four arc-bucket
  derivers; owned-track-membership-alone predicate) BEFORE Phase 2 writes
  the first owned row. Phase 1's executor integrates the dated amendment
  task FIRST (the Phase-1 MD amendment block specifies it fully). Phase
  2/3/4 C4-recovery re-runs AND Phase 4's own idempotency contract re-run
  the load path -> the derive tail; without the guard they destroy the
  arc's own record mid-execution. Verify the guard is present + green
  (a re-derive does not clobber an owned row) at the Phase-1 boundary and
  re-confirm it at every subsequent fill-phase boundary.
- Spec is source of truth; decisions.md distills it; both carry mirrored
  dated amendments. Never silently override a lock, never silently comply
  with a direction that contradicts one -- surface for an explicit dated
  amendment (the D9-clarification + D11-amendment + D4-amendment are the
  precedents). A factual lock-premise that looks wrong gets the OQ-3
  dated-correction treatment, never a silent flip.
- Coverage is the probe-0 N/M C1 denominators (KTX cvar 260 / command 358 /
  info_key 7; MVDSV cvar 183 / command 108 / cmdline_param 11 / info_key 45
  -- POST-Phase-0-rebaselined at execution; the pre-Phase-0 values are the
  gate-SHAPE, not frozen contract numbers). Residue is tracked, NEVER
  importance-cut (C1). "Rare dedicated-server knob, skip it" is a C1
  violation -- surface as a deviation, do not silently comply.
- D6 synthesis + D7 tier-1 review = Opus 4.7 MAX, spec-locked, NOT
  lowerable. The D7 clarification (cheap = effort-routing, one Opus-MAX
  invocation per knob) is locked.
- Operator: non-coder, conceptually fluent; the operator is NOT the
  technical review gate (`feedback_operator_not_technical_review_gate`) --
  the orchestrator + executor terminals are; the operator acts on
  plain-English verdicts. Plain-English-first; be decisive (recommend, do
  not poll); one question at a time; momentum over ceremony; ASCII-only in
  committed docs/code; main-tree git, commit-on-main, push at checkpoints,
  no worktree/PR ceremony (Claude runs git silently). Tag the arc ship
  `git tag -a arc-ktx-mvdsv-l1-describe-fill-shipped` at end of Phase 5.
- **Operator-bandwidth is the real schedule constraint (D18).** Phase 3
  (~150-260 KTX rows) and Phase 4 (~150-250 MVDSV rows) each end in an
  operator-run D7 tier-2 per-row judgment tail on the D11/D15 audit page.
  Phase 5's D4 staleness verification is also operator-run (a simulated
  walk). Sequence executor terminals so these human tails do not collide;
  this arc completes before the game-mode L3 arc (D18 -- bandwidth, not a
  technical dependency).
- Phase 6 is the deferrable non-gating tail; do NOT plan/build the upstream
  PR (D16 -- showcase + conversation first, PR path decided AFTER).
- **The PRE-DISPATCH HOLISTIC GATE is non-negotiable and BLOCKS all
  executor dispatch (added 2026-05-17, operator decision -- closes the one
  workflow gap the planner surfaced at arc-plan completion; do not
  relitigate the design).** Per-phase review is incremental; a cross-phase
  flaw visible only when Phases 1-5 are read AS ONE OBJECT has no dedicated
  checkpoint -- F-D4a (a GRAVE arc-invalidating ordering bug) proved it:
  it survived FOUR approved phases and was caught at the final phase gate
  by ordering luck, not by design. You (the orchestrator) are the fresh,
  planning-unanchored, read-everything terminal -- structurally the right
  context for the holistic pass (the arc-reviewer rationale, applied
  pre-execution). You also carry a mild proceed-bias, so the gate is
  written adversarial, output-defined, and dispatch-blocking to counter it.
  It is action 2 below: it MUST return an explicit verdict (CLEAN, or
  findings routed to a dated correction) BEFORE any executor terminal is
  dispatched. A separate dedicated pre-execution reviewer terminal was
  deliberately NOT added (disproportionate ceremony for a solo operator who
  values momentum; this terminal already reads everything fresh) -- the
  gate lives here instead.

## First actions -- action 2 is a dispatch-blocking gate

1. Do the reads in order; invoke the `arc-orchestrator` skill; confirm the
   plan-complete locked state WITHOUT relitigating. Scope-check: this is the
   `2026-05-16 ktx-mvdsv-l1-describe-fill` arc (tell-tale: F-D4a, the
   owned-row guard, the D9 `mvdsv.6` sibling, `sv_antilag` DUAL, the
   M=260/183 gates). A sibling-arc misdirection (finding numbers / handler
   names from `enforce-L1-runtime-truth`) means STOP.

2. **PRE-DISPATCH HOLISTIC GATE -- read the WHOLE completed plan as ONE
   OBJECT and adversarially hunt the cross-phase failure classes per-phase
   review structurally misses. BLOCKS all executor dispatch until it
   returns an explicit verdict.** Inputs read together in one pass (NOT
   phase-by-phase): README + decisions.md (every dated amendment) +
   review-findings.md + all six phase MDs (Phase 1 WITH its F-D4a
   amendment block). Hunt specifically:
   (a) **Ordering / sequencing hazards** -- for every "Phase N consumes X
   from Phase M": does M actually establish X BEFORE N needs it, including
   under C4-recovery re-runs and idempotency re-runs (the exact F-D4a
   archetype -- a shared pipeline step re-triggered mid-execution)?
   (b) **Shared-mutable-state collisions** -- any shared script / table /
   walk step multiple phases touch, or that runs every walk (the derive
   tail was one): can a phase's committed output be silently
   clobbered/contaminated by a shared step another phase or a routine
   re-extract triggers?
   (c) **Verification-regime soundness** -- does any phase's
   approved/verified state secretly depend on a later phase, or get
   invalidated by an interim operation? Re-audit the slicing analysis's
   "no collision" claim holistically (F-D4a was a hidden one).
   (d) **Dated-amendment propagation** -- every amendment (C3, D2, D9,
   D11, D7, D9-clarification, D4/F-D4a, D19) reflected consistently across
   spec <-> decisions <-> the affected phase MDs <-> README; no phase MD
   silently contradicts one; the Phase-1 F-D4a task is actually specified
   in the Phase-1 MD AND enforced by the sequencing rule in action 3.
   (e) **Lock / scope drift** -- no phase MD relitigated a lock or drifted
   into a parked / sibling-arc scope.
   Verdict is mandatory and explicit. **CLEAN** -> proceed to action 3.
   **Any finding** -> HALT, do NOT dispatch any executor; surface it to
   the operator in plain English with a decisive recommendation; land the
   correction as a dated amendment + revise the affected phase MD (the
   exact F-D4a handling pattern -- never silent, never proceed-anyway);
   re-run the gate after correction. This institutionalizes the planner's
   final-gate cold-review discipline as a hard pre-execution gate.

3. Kick off Phase 0 and Phase 1 executor terminals (independent; parallel
   per the locked draft order). **For Phase 1: the executor's FIRST job is
   to integrate the dated F-D4a owned-row-guard task** (Phase-1 MD amendment
   block) -- generate the Phase-1 executor prompt with that integration
   called out explicitly, and gate the Phase-1 boundary on the guard being
   live + verified (a simulated re-derive does not clobber the D19 owned
   cvar). Phase 0 is a hard synthesis prerequisite (C3/D12) and the Phase-4
   sizing input (F-D12a) but does NOT gate the KTX side.
4. Set up cross-phase memory capture: decisions.md amendments land dated
   (never silent); mid-arc review-findings additions get the next F-suffix;
   augment each downstream executor prompt with prior-phase learnings;
   recommend a fresh-terminal handoff when an executor's context enters the
   ~350k smell zone (Phase 1 likely needs one). Verify every phase boundary
   against live source (psql/grep/ls) -- the F-D4a precedent proves a
   prior "approved" is not a guarantee.

## When in doubt

Spec wins. Verify before asserting -- the discipline has paid off in every
phase, including a GRAVE arc-invalidating catch at the final gate. A lock
conflict surfaces as an explicit dated amendment, never a silent
override/comply. Genuine decisions route to the operator with a decisive
plain-English recommendation (one question at a time); the operator is not
the technical gate. The arc is complete + useful at end of Phase 5; Phase 6
is the deferrable tail. Do not execute phase code as the orchestrator --
dispatch per-phase executor terminals, verify their output against live
source, own the cross-phase memory.
