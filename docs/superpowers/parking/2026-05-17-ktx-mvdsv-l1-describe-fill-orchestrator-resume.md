# KTX/MVDSV L1 describe-fill -- orchestrator RESUME handoff (post-gate, mid-correction)

**For:** a fresh terminal resuming the `arc-orchestrator` role. Created
2026-05-17 at a deliberate context wrap. The prior orchestrator terminal
did the full required-reads pass AND ran the PRE-DISPATCH HOLISTIC GATE to
a verdict, then landed 2 of 3 corrections, then wrapped at the ~400k
context-budget smell zone (arc-orchestrator skill: do NOT push the
highest-judgment work past the smell zone). Nothing is in flight; tree
state below.

---

## THE PRE-DISPATCH HOLISTIC GATE HAS RUN -- verdict captured here. DO NOT RE-DERIVE IT.

**This is the load-bearing process correction.** The gate (original
orchestrator handoff action 2) requires reading the WHOLE ~9,300-line plan
as one object. That is ~most of a context window. **The gate is a
once-per-arc artifact, not a per-terminal re-read.** Its analytical output
is captured in full below. The "re-run the gate after correction" step is
a **FOCUSED re-check of ONLY the three corrected surfaces** against this
captured verdict -- it is NOT a re-ingest of the 9,300-line plan. Any
future terminal that re-reads the whole plan to "re-run the gate" repeats
a 400k-token burn for zero new signal. Do not do that.

### Verdict: NOT CLEAN -- 3 findings. Dispatch was correctly HALTED.

All three are mechanical cross-document propagation gaps. **No design
change, no lock relitigation, no rescope.** Each is exactly the class
per-phase review structurally misses (the F-D4a precedent) -- this is the
gate succeeding, not the plan failing.

**Finding 1 (SUBSTANTIVE) -- Phase 2 hardcodes KTX-cvar M=260; Phase 0
re-baselines it before Phase 2 runs.** Locked execution order is
Phase 0 ∥ Phase 1 first, then 2->3->4. Phase 0 Task 2 re-extracts dev-head
forward and re-baselines the probe-0 denominators (Phase 0's own Outputs
names "Phase 1/2/3/4 recon against the POST-re-extract baseline"). Phases
3/4/5 all carry the "recon POST-Phase-0 M; pre-Phase-0 was X, gate-SHAPE
not frozen" discipline verbatim. **Phase 2 was the lone KTX fill phase
missing it** -- Recon called 260 "the gate", boundary checks 1/3 + Task 4
hardcoded 260. At execution, if any KTX cvar churned since commit
`da73e06`, Phase 2's boundary spuriously FAILs, or an executor misreads a
legitimate Phase-0 rebaseline as a fill-not-create violation, or (worst,
C1) force-fits 260. **STATUS: CORRECTED (Correction 1, landed + committed
-- see below).** Tracked as review-findings **F-C1a** (ledger entry still
TO DO -- Correction 3 batch).

**Finding 2 (MINOR, but mandatory under the OQ-3 never-silently lock) --
5th uncorrected OQ-3 propagation site.** Phase 1 MD drafter-checklist item
3 still carried the pre-correction "KTX tree-sitter vs MVDSV libclang are
DIFFERENT" falsehood (self-contradicted 10 lines down by the RESOLVED
recon note; Phase 1 doesn't touch source AST, so low execution risk). The
session-3 handoff's OQ-3 rule is explicit and is this arc's
highest-priority discipline: "FOUR sites corrected... if a 5th surfaces,
correct it dated -- never silently." **STATUS: CORRECTED (Correction 2,
landed + committed).** The OQ-3-lineage 5th-site note in
review-findings.md "Confirmed-good" is still TO DO (Correction 3 batch).

**Finding 3 (SUBSTANTIVE-latent) -- the spec (declared "spec wins"
tiebreaker) does not carry 5 of the dated amendments.** decisions.md +
phase MDs + README consistently carry F-D4a (D4 amendment), the D2/D7/D9
clarifications, and the D11 amendment. The **spec body still has only the
original D4/D7/D9/D11/D2 text** (it DOES carry the C3 amendment + the D17
~157->109 dated correction as dated blocks -- the mirror pattern exists,
just incomplete). decisions.md preamble + the session handoffs declare
"spec is source of truth; when spec and decisions disagree, spec wins;
both carry mirrored dated amendments." That makes spec-D4 a latent
landmine: anyone applying "spec wins" literally during Phase 5 or post-arc
review reads a D4 with **no owned-row guard** and could un-do F-D4a -- the
single most load-bearing, arc-invalidating fix in the plan. **STATUS: NOT
YET CORRECTED -- this is the remaining mechanical work (Correction 3).**

### What the gate confirmed SOUND (durable -- do NOT re-hunt these)

- **F-D4a sequencing is correctly closed.** Guard = Phase-1-spine
  deliverable (Phase 1 amendment block lines 24-54), owned-track-membership-
  ALONE predicate (no anchor conjunct, so staged `shipped_doc` is
  protected), all four arc-bucket derivers (cvar/command/cmdline_param/
  info_key), before Phase 2's first owned write; Phase 5 CONSUMES it
  (Task 4 report-only; `derive-entity-description.ts` correctly in Phase
  1's Files-touched, NOT Phase 5's -- the v2 surgical rescope is sound).
- **Shared-mutable-state collisions clean.** quality-grid.ts (Phase 1/2/3/4
  edits all additive-sequential; the shared `F1.jsonb_columns_not_strings`
  fn each phase preserves prior branches), index.ts subcommands (additive),
  extract.py handler registration (additive). Migration 014 is the ONLY
  migration; `structured_choices` is additive-no-migration (D11 amendment).
  No source file is a re-runnable pipeline step (C4 recovery re-runs
  extracts/loads, not code edits).
- **Verification-regime soundness:** with the Phase-1 guard live from early
  Phase 1, every fill phase's committed owned rows survive interim
  re-extracts (C4-recovery, Phase 4 idempotency, Phase 0 forward
  re-extract, D4 walk). The only residual was Finding 1 (now corrected).
- **sv_antilag cross-phase:** Phase 3 carries KTX source behaviour as
  cross-ref evidence; Phase 4 OWNS `mvdsv:cvar:sv_antilag` and
  independently re-derives the KTX leg live in its own Recon (it does NOT
  hard-depend on locating a Phase-3 artifact -- the "from the Phase-3
  trail" phrasing is soft/redundant, not a sequencing hazard). Advisory
  only: the Phase 4 executor prompt may note "re-derive the sv_antilag KTX
  leg live, do not depend on a Phase-3 artifact." Not a blocker.
- **No lock relitigation / no parked-or-sibling-arc drift** in any phase.
  Every deviation went through the proper dated-amendment channel (D9,
  D11, D7, D4 amendments + D2/D9 clarifications). The discipline worked.

---

## Where things are

- Arc dir: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`.
  PLAN COMPLETE; all phase MDs 0-5 approved. Phase 6 deferrable/non-gating.
- **Corrections 1 + 2: LANDED + COMMITTED.**
  - Correction 1 (Phase 2): `phase-2-ktx-mechanical-extract.md` -- the
    Recon `M = 260` bullet now carries the POST-Phase-0-recon caveat;
    boundary checks 1 and 3 + Task 4 goal + Task 4 coverage step no longer
    hardcode 260 (recon POST-Phase-0 M live; pre-Phase-0 260 is gate-SHAPE
    not frozen). 5 edits, atomic.
  - Correction 2 (Phase 1): `phase-1-discipline.md` drafter-checklist item
    3 -- the stale "KTX tree-sitter vs MVDSV libclang are DIFFERENT"
    phrasing replaced with the corrected phase-template.md item-3 wording +
    a dated OQ-3-5th-site note. 1 edit.
- **Correction 3 + the review-findings ledger update: NOT YET DONE.** This
  is the remaining mechanical work (fully specified below).
- Tree: Corrections 1+2 + this resume handoff committed on `main`. The 23
  pre-existing uncommitted changes from session start are unrelated
  parallel-arc / docs churn -- NOT this arc's; were NOT swept into the
  commit; leave them.

---

## Remaining work (mechanical; exact)

### Correction 3 -- spec amendment-mirror (closes Finding 3)

Spec: `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
(1150 lines). The C3 amendment (spec ~lines 99-139) and the D17 Phase-2
~157->109 dated correction (spec ~lines 821-826) are ALREADY mirrored --
they are the template pattern to copy.

1. **Add a global amendment-precedence clause near the spec top** (after
   the "Status" / "Locked conceptual model" header, before "Decisions
   log"). One short paragraph, ASCII (P5): dated 2026-05-17; states that
   where this spec's original C/D text predates a dated amendment recorded
   in `decisions.md` / the phase MDs, the amendment GOVERNS -- it does not
   "lose" to the un-amended spec text under the "spec wins" tiebreaker;
   the "spec wins" rule resolves spec-vs-distillation disagreements, never
   amended-vs-original. This single clause unconditionally defuses the
   F-D4a-revert landmine.

2. **Mirror the dated blocks** into the spec under their original C/D
   headings, concise (1 short paragraph each, "Amendment/Clarification
   2026-05-17 (mirrors `decisions.md` <X>; see decisions.md + the affected
   phase MDs for the phase-facing detail): <substance>"). Source text =
   the corresponding dated block already in `decisions.md`:
   - **spec D4 (~lines 293-328) <- decisions.md D4 amendment 2026-05-17
     (F-D4a).** LOAD-BEARING -- the owned-row guard is a Phase-1-spine
     deliverable; predicate = `description_origin IN
     ('synthesized','shipped_doc')` owned-track-membership ALONE; all four
     arc-bucket derivers; before Phase 2's first owned write; Phase 5
     consumes. This is the priority mirror.
   - spec D2 (~lines 235-271) <- decisions.md D2 clarification 2026-05-17
     (`description_origin` already exists -> EXTEND not create; the C5
     probe permits the full 4-set incl `help_json`).
   - spec D7 (~lines 381-401) <- decisions.md D7 clarification 2026-05-17
     ("cheap" = effort-routing; ONE Opus-4.7-MAX D6 invocation per knob;
     no cheaper pre-classify tier).
   - spec D9 (~lines 428-473) <- decisions.md D9 amendment 2026-05-17
     (~157->109 conflation; M=260 the C1 gate) + D9 clarification
     2026-05-17 (`mvdsv.6` IS the D9 mechanical sibling; the
     coverage.ndjson "LLM-assisted" tag is not a contradiction). Note spec
     line ~432 already says mvdsv.6 is a sibling parser -- the
     clarification records WHY, append it.
   - spec D11 (~lines 537-582) <- decisions.md D11 amendment 2026-05-17
     (additive optional `structured_choices` element; JSONB schemaless, no
     migration).

   Re-read each spec target region for the exact insertion point before
   editing (verification discipline -- exact-match Edits).

### review-findings.md ledger update (the dated audit trail; pairs with Corr. 3)

`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`:
- Add **F-C1a** to the Substantive-risks section + the Phase-ownership
  table. Title: "the Phase-0 forward re-extract re-baselines the probe-0
  denominators; Phase 2 hardcoded M=260". Severity Substantive. Contained
  by: the C3 amendment (Phase 0 re-baselines, correct by C1) + the
  Correction-1 Phase-2 MD revision. Phase column: Phase 2 (recon
  POST-Phase-0 M), Phase 0 (produces the re-baseline). One line in the
  ownership table.
- Append a dated **OQ-3 5th-site** sentence to the "Confirmed-good"
  CORRECTION 2026-05-17 block (where the 4 sites are enumerated):
  Phase 1 MD drafter-checklist item 3 was the 5th propagation site,
  corrected 2026-05-17 by the pre-dispatch holistic gate (never silently).
- Add a dated note (Substantive section or a short "Gate findings
  2026-05-17" sub-block) recording Finding 3: the spec did not carry
  mirrored dated amendments; the "spec wins" tiebreaker was a latent
  F-D4a-revert landmine; resolved 2026-05-17 by the global precedence
  clause + the mirrored blocks (Correction 3).

### Then: FOCUSED gate re-check (NOT a whole-plan re-read)

Re-check ONLY: (a) the Correction-1 Phase-2 edits read consistently with
the Phase 3/4/5 wording (no new contradiction introduced); (b) the
Correction-2 Phase-1 line matches phase-template.md item 3; (c) the
Correction-3 spec blocks faithfully mirror their decisions.md sources and
the global clause defuses "spec wins". This is a targeted diff review of
the corrected surfaces against the captured verdict above -- a few
hundred lines, not 9,300. If sound -> verdict CLEAN -> proceed to
dispatch. If a correction introduced an inconsistency -> fix it, re-check
that surface only.

### Then: generate + dispatch Phase 0 and Phase 1 executor terminals

Per the original orchestrator handoff action 3 (read it -- it is the
authority for dispatch):
- Generate per-phase EXECUTOR prompts from `handoff-prompt.md` + the phase
  MDs (Phase 0 + Phase 1; independent, parallel per the locked draft
  order).
- **Phase 1 executor prompt MUST call out, explicitly and as the
  executor's FIRST job, integrating the dated F-D4a owned-row-guard task**
  (Phase-1 MD amendment block lines 24-54 + decisions.md D4 amendment) --
  and gate the Phase-1 boundary on the guard being live + verified (a
  simulated re-derive does NOT clobber the D19 `k_short_gib` row; re-run
  twice -> identical). This is non-negotiable (F-D4a sequencing).
- Phase 0 is a hard synthesis prerequisite (C3/D12) + the Phase-4 sizing
  input (F-D12a) but does NOT gate the KTX side. Phase 0's forward
  re-extract has no owned rows to threaten in the normal sequence (Phase 1
  builds the guard as its FIRST job; Phase 0's re-extract runs with zero
  owned rows or behind the live guard) -- but the orchestrator sequences
  so Phase 0's re-extract does not land after an owned write while the
  Phase-1 guard is not yet live (it won't, given the guard is Phase 1's
  first job; recorded as a watch item, not a defect).

---

## Reads required for the fresh terminal (MINIMAL -- this is the point)

Do NOT re-read the 9,300-line plan. Do NOT re-run the holistic read.

1. This resume handoff (the gate verdict + sound-list are HERE; consume,
   do not re-derive).
2. The original orchestrator handoff
   `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-orchestrator-handoff.md`
   -- the LOCKED critical rules + action 3 dispatch spec + the F-D4a
   sequencing rule. Authority for dispatch.
3. `decisions.md` -- ONLY the dated blocks named in Correction 3 (D2
   clarification, D4 amendment, D7 clarification, D9 amendment + D9
   clarification, D11 amendment) -- as the source text to mirror.
4. The spec target regions (D2/D4/D7/D9/D11 sections + the top) -- read
   each region just before editing it (exact-match Edits).
5. `review-findings.md` -- the Substantive section + Confirmed-good
   CORRECTION block + ownership table (the ledger-update targets).
6. `handoff-prompt.md` + `phase-0-probes.md` + `phase-1-discipline.md`
   (with its amendment block) -- to generate the two executor prompts.
7. Invoke the `arc-orchestrator` skill. Confirm the captured gate verdict;
   do NOT relitigate or re-derive it.

---

## Critical rules (locked; carried from the original handoff -- do not relitigate)

- **The holistic gate is once-per-arc.** Its verdict is captured above.
  "Re-run after correction" = focused re-check of the corrected surfaces,
  never a whole-plan re-read. (The process correction this wrap exists to
  institutionalize.)
- **F-D4a sequencing (non-negotiable).** The owned-row guard MUST be live
  in `derive-entity-description.ts` (all four arc-bucket derivers,
  owned-track-membership-alone predicate) BEFORE Phase 2's first owned
  write. Phase 1 executor integrates it FIRST. Verify guard live + green
  at the Phase-1 boundary and re-confirm at every subsequent fill-phase
  boundary.
- Spec is source of truth; decisions.md distills it; a dated amendment
  GOVERNS its original C/D text (the Correction-3 global clause makes this
  explicit -- previously a latent landmine, Finding 3). Never silently
  override a lock, never silently comply with a direction that
  contradicts one -- dated amendment, the F-D4a handling pattern.
- Verification discipline: a dispatched terminal's "verified clean" is a
  HYPOTHESIS; re-derive load-bearing numbers/paths via psql/grep/ls. The
  gate proved its worth (3 findings per-phase review missed).
- Operator: non-coder, conceptually fluent; NOT the technical review gate
  (the orchestrator + executor terminals are); acts on plain-English
  verdicts. Be decisive (recommend, do not poll); one question at a time;
  momentum over ceremony; ASCII-only committed docs; main-tree git,
  commit-on-main, push at checkpoints, no worktree/PR ceremony (Claude
  runs git silently); commit ONLY this arc's files (the 23 pre-existing
  drift changes are not ours).
- Coverage is the probe-0 N/M C1 denominators, POST-Phase-0-rebaselined at
  execution; residue tracked, NEVER importance-cut. D6 synthesis + D7
  tier-1 review = Opus 4.7 MAX, spec-locked, not lowerable.
- The arc is complete + useful at end of Phase 5; Phase 6 is the
  deferrable non-gating tail.

---

## First actions (fresh terminal)

1. Read this handoff + the original orchestrator handoff; invoke the
   `arc-orchestrator` skill; confirm the captured gate verdict + 3 findings
   + sound-list WITHOUT re-deriving (scope tell-tale: F-D4a, the owned-row
   guard, the M=260/183 gates, `k_short_gib`). A sibling-arc misdirection
   means STOP.
2. Apply Correction 3 (spec global clause + the 5 mirrored dated blocks,
   F-D4a the priority) + the review-findings ledger update (F-C1a +
   OQ-3-5th-site note + the Finding-3 resolution note). Commit (dated,
   this arc's files only).
3. Run the FOCUSED gate re-check (corrected surfaces only, vs the captured
   verdict). If sound -> verdict CLEAN.
4. Generate Phase 0 + Phase 1 executor prompts (handoff-prompt.md + the
   phase MDs); Phase 1's prompt calls out the F-D4a guard as the
   executor's FIRST job + gates the Phase-1 boundary on it. Dispatch both
   (independent, parallel). Then run the standard per-phase orchestration
   loop (arc-orchestrator skill) + cross-phase memory capture.

## When in doubt

The gate has run -- its verdict is captured here, consume it. The "spec
wins" rule now reads "amendments govern" (Correction 3). Verify before
asserting. A lock conflict surfaces as a dated amendment, never silent.
Genuine decisions route to the operator with a decisive plain-English
recommendation, one question at a time. Do not execute phase code as the
orchestrator -- dispatch executor terminals, verify their output against
live source, own the cross-phase memory.
