# KTX/MVDSV L1 describe-fill -- planner session 3 handoff (fresh terminal)

**For:** a fresh terminal resuming the arc-planner/reviewer role. Created
2026-05-17 at a deliberate context reset (session-2 planner crossed the
~400k smell zone after approving Phases 1-3 + generating Phases 2-4 prompts;
Phase 4 review is the heaviest remaining cold verification and needs
fresh-context fidelity -- `feedback_fresh_context_for_execution`, the same
structural reason session-2 itself was spun up fresh for Phase 1). Nothing
is in flight: Phase 3 closed, the Phase 4 drafter prompt is generated and
pushed. The Phase 4 drafter runs in its OWN fresh terminal (the established
pattern); its handback comes back to THIS (fresh planner) terminal for the
cold review.

## Where things are

- Arc dir: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`.
  Scaffold + slicing LOCKED. Tree clean, all committed + pushed.
- **Phases 0, 1, 2, 3: APPROVED 2026-05-17.** README phase-index status
  cells + the top status sentence reflect this.
- **Phase 4: prompt generated + pushed -- THE IMMEDIATE TASK once its
  drafter hands back.** `phase-4-drafter-prompt.md` (file-as-prompt; the
  operator opens a fresh terminal and types
  `@docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-4-drafter-prompt.md`).
  Generated against Phase 3's REAL outputs + Phase 0's MVDSV sizing.
- Phases 5, 6: NOT started. Phase 5's drafter prompt is generated only
  AFTER Phase 4 is approved (its Inputs must mirror Phase 4's real
  Outputs). Phase 6 is the deferrable tail -- it does NOT gate arc
  completion (arc complete + useful at end of Phase 5; D16/D17).
- Commit chain (newest first): `0274cf9c` Phase 3 approved + D7
  clarification + Phase 4 prompt; `42c4a060` Phase 2 approved + ~157->~109
  fix + D11 deviation + OQ-3 4th site + Phase 3 prompt; `c8111008` Phase 1
  approved + OQ-3 3rd site + Phase 2 prompt; `db008078` Phase 1 recon-facts
  relocation; `fcd3b7d3` Phase 1 review fixes; `f3574f26` OQ-3 1st/2nd
  site (KTX-is-libclang) correction; `dda4cffa` session-2 handoff;
  `4122fac0` Phase 1 draft. (Unrelated parallel-arc commits also land on
  `main` -- not this arc's concern.)

## Reads required (in order)

1. This handoff.
2. Arc `README.md` -- status, the locked "Slicing analysis", phase index,
   non-goals. Phases 0-3 show `approved 2026-05-17`.
3. `decisions.md` -- C1-C5, P1-P5, D1-D19. **Read the DATED amendment /
   clarification blocks IN FULL** (they are load-bearing and were added
   during Phase 0-3 reviews; never re-derive blind): C3 amendment
   2026-05-17 (self-built oracle); D2 clarification 2026-05-17
   (description_origin already exists, EXTEND); **D9 amendment 2026-05-17**
   (the spec/gap-findings "~157/260" was CONFLATED -- the honest D9
   shipped_doc target is the primary-source-verified **~109/260**; M=260 is
   the C1 gate; residue tracked); **D11 amendment 2026-05-17** (the
   `description_provenance` element is widened with an additive
   `structured_choices` field -- the approved Phase-2 Open Q (b) deviation);
   **D7 clarification 2026-05-17** ("cheap" = effort-routing; ONE
   Opus-4.7-MAX D6 invocation per knob; NOT a cheaper pre-classify tier --
   locked so Phase 4, which fans the same skill, does not relitigate);
   D19 (the Phase 1 smoke = `k_short_gib`, idempotent, counted once).
4. `review-findings.md` -- risk ledger. F-C3a DISSOLVED. The "Confirmed-good"
   note carries the **dated CORRECTION 2026-05-17** (canonical KTX AND
   MVDSV are BOTH libclang/C; the D9 shipped-config tier is a NEW
   non-libclang `.cfg`/roff-text sibling handler, NOT the libclang
   registration handler, NOT tree-sitter; tree-sitter is the out-of-scope
   dusty-ktx fork only). Phase-4 rows: F-D12a/F-D12b (ezquake.com shape /
   load-commands free win -- Phase 0 delivered), F-C2a/F-D10c (`sv_antilag`
   cross-fork DUAL -- describe dual, do NOT extract), F-C3b (detect+stamp+
   route C3 suspects, do NOT classify).
5. `phase-template.md` -- mandatory phase-MD shape incl the REQUIRED
   "### Recon facts (verified ...)" Goal sub-block (Phase 1's first draft
   omitted it and shipped 2 probe defects -- the lesson). Sub-agent brief
   **item 8 was corrected 2026-05-17** (the 4th OQ-3 propagation site:
   KTX-is-libclang, the D9 sibling reads `.cfg`/roff text).
6. The spec `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. Carries the dated correction on the D17 Phase 2
   bullet (~157->~109). When spec and decisions.md disagree, spec wins.
7. `phase-0-probes.md` / `phase-1-discipline.md` / `phase-2-ktx-mechanical-extract.md`
   / `phase-3-ktx-source-synthesis.md` -- the approved prior phases
   (context for Phase 4's Inputs; Phase 4 consumes their real Outputs).
8. `phase-4-drafter-prompt.md` -- what the Phase 4 drafter was instructed
   (so the review checks the handback against the actual brief).
9. Memory: `feedback_verify_dispatched_terminal_claims`,
   `feedback_no_inference`, `feedback_inference_not_evidence`,
   `project_qw_dev_head_not_releases`, `feedback_fresh_context_for_execution`,
   `feedback_be_decisive`, `feedback_one_question_at_a_time`,
   `project_arc_workflow_design`, `feedback_model_effort_range`,
   `feedback_scaffold_then_fanout_for_multi_phase_plans`.
10. Invoke the `arc-planner` skill (Skill tool). Confirm locked state; do
    NOT relitigate.

## Critical rules (locked; do not relitigate)

- **THE VERIFICATION DISCIPLINE -- highest priority, proven 4x.** Every
  Phase 0-3 drafter handback claimed "0 defects / ready". Phase 1's was
  FALSE (2 probe gates guaranteed-false vs the live 68-row baseline + a
  template deviation, caught across 3 passes). Phase 2's "~109" and Phase
  3's recon HELD -- but only because they were independently re-derived
  against the live DB/source, not trusted. **A drafter's (and its
  sub-agent's) "verified clean" is a HYPOTHESIS. Re-derive every
  load-bearing number/path/shape via psql/grep/ls before ANY verdict
  (`feedback_verify_dispatched_terminal_claims`).** This has produced a
  real defect catch or a load-bearing scaffold correction in EVERY phase.
- **OQ-3 lineage.** "KTX = QuakeC/fteqcc/tree-sitter" was a planner
  inference error. Its FOUR propagation sites are all corrected (dated):
  review-findings Confirmed-good + phase-template checklist item 3
  (`f3574f26`), handoff-prompt per-phase recon (`c8111008`),
  phase-template sub-agent brief item 8 (`42c4a060`). Canonical KTX AND
  MVDSV are BOTH libclang/C. If a 5th site surfaces, correct it dated --
  never silently. Extractor toolchain != source language; verify by ls/grep.
- Spec is source of truth; decisions.md distills it; both carry mirrored
  dated amendments. Never silently override a lock, never silently comply
  with a direction that contradicts one -- surface for explicit dated
  amendment. The drafters have been doing this correctly (surfacing
  spec-tensions as Open Qs); the planner verifies the faithful reading and
  either blesses in-verdict or lands a dated clarification/amendment if
  cross-cutting (the D7 clarification + D11 amendment are the precedents).
- Phase boundaries verify by DB-state coverage vs the probe-0 M
  denominators (C1 exhaustive; residue tracked, NEVER importance-cut), not
  by a downstream projection. Coverage numbers are order-of-magnitude vs
  the gate (M), never hard-contract targets (the ~157->109 lesson).
- D6 synthesis + D7 tier-1 review = Opus 4.7 MAX, spec-locked, NOT
  lowerable. Phase 4 fans the SAME D6 skill -- the D7 clarification
  (cheap=effort-routing) is locked; do not relitigate.
- Operator: non-coder, conceptually fluent. Plain-English-first; be
  decisive (recommend, do not poll); one question at a time; momentum over
  ceremony; ASCII-only in committed docs; main-tree git, commit-on-main,
  push at checkpoints, no worktree/PR ceremony (Claude runs git silently).
- **Operator-bandwidth flag (D18, informational, not a planning blocker):**
  Phase 3/4 EXECUTION is operator-run at the D7 tail (~150-260 KTX rows
  per-row judgment for Phase 3; a comparable MVDSV tail for Phase 4). D18
  makes operator review-bandwidth the constraint that sequences this whole
  arc before the game-mode L3 arc. Surfaced for execution scheduling.
- Draft order: 4 -> 5 sequential; 6 deferrable tail (does NOT gate arc
  completion). Phase 4 review is the critical path now.

## First three actions

1. Do the reads in order (end by invoking the `arc-planner` skill; confirm
   the locked state without relitigating).
2. When the Phase 4 drafter handback is pasted (or read `phase-4-mvdsv-fill.md`
   cold if it is already on disk), review it COLD. Treat the handback and
   every load-bearing claim as a HYPOTHESIS -- verify against live source
   before any verdict (the discipline above):
   - the live MVDSV M denominators (cvar/command/cmdline_param/info_key)
     and the pre-execution `description_origin` baseline per type (do NOT
     assume zero -- the Phase 1 lesson);
   - `mvdsv:cvar:sv_antilag` exists, description NULL; it is the D10
     cross-fork DUAL Phase 4 OWNS (Phase 3 correctly deferred it -- it is
     an MVDSV entity, not KTX); the MVDSV engine side is line-identical
     mainline-vs-dusty (the divergence is MEANING; do NOT extract the fork,
     F-D10c);
   - the `mvdsv.6` roff man page exists + is a NEW non-libclang sibling
     parser (NOT the libclang registration handler);
   - the phase CONSUMES (does not recompute) the Phase-0 ezquake.com-shape
     buckets + the load-commands free win + the C3 pool; no resurrected
     `NN/183` figure (F-D12a);
   - the D6/D7 dials are Opus 4.7 MAX and the D7 clarification is honored
     (ONE Opus-MAX invocation per knob, no cheaper pre-classify tier);
   - the REQUIRED Recon-facts Goal sub-block records the real live
     baseline; template-conformant; ASCII; subagent-heavy posture stated
     for the ~200-400k budget unknown (now resolvable via Phase 0's shape).
3. Produce the verdict. If sound -> flip README Phase 4 status to
   `approved` (status cell + the top status sentence) and generate
   `phase-5-drafter-prompt.md` against Phase 4's REAL Outputs (file-as-prompt
   shape; model on `handoff-prompt.md` + the existing per-phase prompts;
   Phase 5 = staleness + projections + the F-D13a MCP-contract delta + the
   D14 wiki feed + snapshot.json + confirm C5 probes green). If revisions ->
   crisp paste-back for the SAME drafter terminal (fresh terminal only if
   its context is polluted). Land any dated scaffold/decisions amendment
   the review surfaces. Commit + push at the checkpoint.

## When in doubt

Spec wins. Verify before asserting -- the discipline has paid off in every
phase. A lock conflict surfaces as an explicit dated amendment, never a
silent override/comply. Genuine decisions route to the operator with a
decisive recommendation (one question at a time). The arc is complete +
useful at end of Phase 5; Phase 6 is the deferrable tail. Do not draft/edit
phase MDs as the planner -- review, verify, amend scaffold/decisions
(dated), generate the next per-phase prompt.
