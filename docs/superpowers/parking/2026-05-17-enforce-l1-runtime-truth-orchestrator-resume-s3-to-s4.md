# Resume: enforce-L1-runtime-truth arc -- orchestrator session 3 -> session 4

**For:** arc-orchestrator, FRESH terminal. Session 3 drove + GATED Phase 3
(unified L1 fidelity schema + loader): independently re-verified all
load-bearing recon vs primary source, walked decisions.md/review-findings
task-by-task, operator-ratified OQ-1 + OQ-2, flipped Phase 3 -> approved
(commit `de6198d9`). This handoff exists because the NEXT gate -- the
Phase-4 ACCEPTANCE draft -- is the arc's single most correctness-critical
boundary ("the gate that earns the word confidence"; D13/D18), and session
3 is past the budget point where that judgment should run. You are COLD --
read before acting. Do NOT execute phase code; do NOT draft phase MDs; you
dispatch + independently verify + own cross-phase memory.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Slicing operator-LOCKED: 5 phases, fully SEQUENTIAL, draft-then-execute
(each drafter reads prior APPROVED MDs; EXECUTION is a distinct
post-full-draft orchestration). README phase index is authoritative.

Status:
- **Phases 1, 2, 3: APPROVED.** P1 (Track A call-graph passenger) commit
  `e57a13b7` + D7 AMENDMENT + F4/F5/F6. P2 (Track B `_handler_hud.py`,
  commands-only) commit `76fedcb0`. P3 (unified schema + loader) commit
  `de6198d9` -- orchestrator re-verified recon vs primary source (mig
  013->014; the `load-version.ts` per-type quartet [a grep-tool scare run
  to ground via Read -- recon CORRECT]; `source_state` CHECK; `name_fold`
  key; `tx.json`/`probeJsonbNotStrings`; Phase-1/2 contracts). OQ-1
  (Track-A emit->store seam) + OQ-2 (recovered-HUD-command
  `source_state=source_backed`) operator-ratified to the recommended
  defaults; both resolved in the Phase-3 MD with the narrative preserved.
- **Phase 4 (acceptance contract): NEXT TO DRAFT.** A fresh drafter
  terminal was (or is being) opened with the augmented prompt below.
- **Phase 5: not started.**
- **Prerequisite 4: SECURED + orchestrator-verified.** The detection
  triple is durable in-repo at `apps/qw-oracle/data/detection/`
  (`entities-runtime-dump-3f9e724f.txt`, `front1-diff.sh`,
  `cmdline-liveness.sh`, `README.md`). Session 3 ran `cmp` vs the Windows
  source `/mnt/c/Games/QuakeWorld/QuakeWorld/qw/matches/entities.log` --
  **BYTE-IDENTICAL**. Remaining for Phase 4 ONLY (NOT closed): (a) RE-RUN
  the R6 version-pin sanity-proxy (`front1-diff.sh:33-36`) against the
  live DB at the Phase-4 boundary (X8/W2 -- deliberately NOT re-run at
  relocation); (b) operator blesses provenance (they ran the `3f9e724f`
  build); (c) the Phase-4 drafter proposes the canonical path + wiring.

Commits since the session-2->3 handoff (`71e0f406`): `de6198d9` (P3
APPROVED). The parallel **ktx-mvdsv-l1-describe-fill** arc interleaves the
log (`27a36655` etc.) -- a SEPARATE arc; stay single-arc scoped, do not
touch it. Branch `main`, solo-dev silent commits, no PR ceremony.

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md`
   (item-4 UPDATE block), `decisions.md` (D1-D22 + D7 AMENDMENT + D11
   amendment + X1-X10 + non-goals -- IN FULL; Phase 4 governed by D1, D2,
   D13, D17, D18, D19, D22), `review-findings.md` (F1-F6, R1-R7, W1-W4 +
   phase-ownership; Phase 4 owns role "ACC" = R5/R6/W1),
   `phase-template.md`, `README.md` (LOCKED index; Phases 1-3 approved).
2. The **APPROVED Phase 1 + 2 + 3 MDs**. Phase 4 inputs:
   - P1 ships `ezquake/verify-callgraph-probes.py` (the 3-gate probe
     LOGIC) -- Phase 4 COMPOSES it, does NOT rebuild (R5/X2).
   - P2 ships `ezquake/verify-hud-probes.py` (3 anchors + R7 + R1) --
     same composition rule.
   - P3 ships the two locked JSONB shapes (`track_a_reachability`,
     `track_b_hud_recovery`) with `dump_confirmation` uniformly level-2
     (`high-confidence-generalized`). Phase 4's stage-2 dump cross-check
     READS these to stamp level-3 (`dump-confirmed`) where the pinned
     dump confirms (D19). The EXACT keys are in the Phase-3 MD Task-1
     shape blocks -- consume them verbatim, do NOT reinvent.
3. `phase-4-drafter-prompt.md` (the pre-substituted canonical prompt) +
   the augmentation that was prepended (reproduced under "Phase-4 drafter
   prompt" below, for your record of what the drafter was told).
4. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (D17-D22 WHY; decisions.md is the distilled
   contract -- do NOT re-open a D).
5. The session-2->3 handoff
   `docs/superpowers/parking/2026-05-17-enforce-l1-runtime-truth-
   orchestrator-resume.md` (the arc's critical rules; still in force).
6. Memory: `feedback_verify_dispatched_terminal_claims` (THE core duty --
   Phase 3's grep-scare is the worked example: a sub-agent's "0 findings"
   is a hypothesis; the orchestrator's primary-source re-verification is
   the trust anchor), `feedback_parking_verified_state_is_hypothesis`,
   `feedback_model_effort_range`, `feedback_no_subagents_for_mechanical_edits`,
   `reference_rigor_bar_follows_consumer` (level-3 = autonomous published
   verdict = the STRICT bar; level-2 = assistant-only = approximate OK),
   `feedback_verification_layer_catches_lift_residuals`,
   `feedback_idempotency_before_staleness`,
   `feedback_orchestrator_terminal_pattern`,
   `reference_postgres_js_jsonb_binding` (F1.jsonb_columns_not_strings --
   Phase 3 extended it; Phase 4 re-runs it).
7. `references/arc-phase-archetypes.md` -- Phase 4 = acceptance/gate
   archetype: the verification floor is OPERATOR-RUN (harness GREEN at the
   pinned commit; broken-pin -> ZERO level-3 demonstrated; toggle-off
   parity; a deliberately-failed probe falls the fork back LOUD). CI-only
   automated smoke is INSUFFICIENT for this archetype -- if the Phase-4
   draft's verification is purely automated, that is a finding.

## Critical rules (carry into Phase 4 orchestration)

- **Verify dispatched-terminal claims yourself.** The drafter's "Recon
  facts (verified)" + its sub-agent's "0 CRITICAL/0 findings" are
  HYPOTHESES until you grep/SQL/Read primary source. Phase 3's worked
  example: the sub-agent "confirmed" the `load-version.ts` quartet; grep
  could not reproduce it (a tool malfunction on that file); only a
  primary-source Read settled it (recon was correct). Do NOT trust the
  clean sweep; re-verify. For Phase 4 re-verify against LIVE source: the
  `front1-diff.sh:33-36` version-pin proxy logic; the durable dump line
  ranges (`apps/qw-oracle/data/detection/README.md` says cmdlist 7-564 /
  cvarlist 571-3272 / macrolist 3276-3344; 557 cmds / 2700 cvars);
  Phase-1's `verify-callgraph-probes.py` + Phase-2's `verify-hud-probes.py`
  entry points (they must exist as COMPOSABLE units -- if the Phase-4
  draft invents new validation logic instead of composing, that is a
  CRITICAL R5/X2 violation); the P3 JSONB shapes the cross-check reads.
- **R5 = COMPOSITION, never new logic (X2).** Phase 4 wires Phase-1's
  3-gate + Phase-2's 3-anchor/R7/R1 into the ONE D18 hard /
  all-or-nothing / LOUD / one-time-per-fork gate, reading the
  feeder/family tags. If a probe is missing upstream, that is a
  Phase-1/2 gap to SURFACE, not patch here.
- **D18 is HARD: all-or-nothing, LOUD, one-time-per-fork, NEVER
  per-version.** A new ezQuake version legitimately yields its own
  anomaly set (D13); the gate does not run per-version and cannot be
  tripped by version drift. ANY probe wrong -> NO signal for that fork
  -> fall back to exactly today's pipeline, LOUD, operator alerted (NOT
  per-gate soft degradation).
- **D19: dump is the OVERRIDING answer key; conservative on every
  disagreement** (Track A drops the accusation -- D3; Track B does not
  ship the name -- D8). The version-pin proxy is a HARD sub-gate:
  broken pin -> ZERO level-3 stamps for that dump, everything to level-2.
  Level-3 exists ONLY for pinned-dump commits -- by design, not a gap;
  every other version is permanently level-2 (a VALID useful state, the
  `reference_rigor_bar_follows_consumer` strict/approx split).
- **Slot-3 boundary held BACKWARD too.** Phase 3 wrote level-2 ONLY;
  Phase 4 is the ONLY phase that may stamp level-3. If the Phase-4 draft
  has Phase 3 (or anything pre-Phase-4) writing `dump-confirmed`, that is
  a D14/D19 violation -- CRITICAL.
- **prereq-4 confirmation is DONE by the orchestrator** (byte-identical
  `cmp` 2026-05-17). The Phase-4 drafter prompt was told this, so it
  drafts load-bearing detail (NOT a paper-only deferral). The 3 remaining
  items (R6 proxy re-run / operator provenance bless / canonical-path
  proposal) are the Phase-4 EXECUTOR-time precondition + a drafter
  proposal -- NOT a draft-time blocker. Verify the drafter treated it
  this way; if it deferred the whole phase to paper-only citing "item 4
  open", that is a stale read -- correct it.
- **Brainstorm closed.** A refuted premise -> DATED `decisions.md`
  amendment + operator ratification, NEVER a silent phase-MD override
  (D7/D11 are the worked examples). OQ-shaped in-scope choices get an
  operator-ratified resolution block (Phase 3's OQ-1/OQ-2 are the worked
  examples) -- surface, do not silently default.
- **Execution mode:** near-zero inline (X5); the 3-stage acceptance
  CONTRACT-SHAPE design = Opus MAX; harness/cross-check synthesis =
  Sonnet medium; post-draft verification sub-agent = Sonnet medium
  Explore (X6).
- **Cwd hygiene:** use ABSOLUTE paths in Bash. If grep returns an
  anomalous empty/exit-1 on a file you know is non-empty, do NOT explain
  it away in either direction -- escalate to the Read tool (primary
  source). That is the Phase-3 worked lesson.

## First three actions

1. Read the scaffold + the APPROVED Phase 1/2/3 MDs + the named memory
   COLD. Confirm: Phases 1-3 approved (README), prereq-4
   SECURED+byte-identical (`apps/qw-oracle/data/detection/`), the
   draft-then-execute model, OQ-1/OQ-2 resolved in the Phase-3 MD. Do
   NOT re-open design, do NOT re-derive pools (74/92/~129 -- banked, X7).
2. If the Phase-4 drafter has not yet halted: wait. If it has halted:
   take its halt report (STATUS / MD path / sub-agent
   CRITICAL/SUBSTANTIVE/ADVISORY / decisions.md deviation / open
   questions incl. prereq-4 status).
3. Independently re-verify its "Recon facts" against LIVE source (the
   `front1-diff.sh` proxy logic; the dump line ranges; the Phase-1/2
   probe entry points are real COMPOSABLE units; the P3 JSONB shapes the
   cross-check reads). Walk it against decisions.md (D17/D18/D19/D22 +
   D1/D2/D13) + review-findings (R5/R6/W1/W2). Specifically check: (i)
   R5 is composition NOT new logic; (ii) D18 is one-time-per-fork NOT
   per-version; (iii) the version-pin proxy is reused from
   `front1-diff.sh`, not reinvented (R6); (iv) the verification floor is
   operator-run (archetype), not CI-only; (v) broken-pin -> zero level-3
   is demonstrated; (vi) nothing pre-Phase-4 stamps level-3. Gate at the
   boundary; surface OQ-shaped choices for operator ratification (one
   question at a time, plain-English consequences); capture cross-phase
   memory; flip Phase 4 -> approved ONLY on operator approval, then
   prepare the Phase-5 drafter dispatch + (per Step 8) judge whether a
   session-4->5 handoff is needed (Phase 5 = application outputs:
   delete-list regen byte-shape + first-class recovered commands; R4).

## When in doubt

North Star: L1 tells the runtime truth both directions, provenance a
reader can trust. Conservative always (D3/D8); never false-accuse; the
dump is the overriding answer key (D19); level-3 ships autonomously,
level-2 is assistant-only; the two tracks never blend (D1/D12). The spec
is source-of-truth; parking/"verified"/prior-session/sub-agent lines are
hypotheses until re-verified against live source. Route genuine design
problems to the operator as a dated `decisions.md` amendment, never a
silent override. The ezQuake help-JSON doc-gap arc
(`docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`)
is a SEPARATE sequenced follow-on -- not this arc.
