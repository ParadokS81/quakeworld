# KTX/MVDSV L1 describe-fill -- orchestrator RESUME (2026-05-19, post-D7-walk)

**LIVE contract for the post-walk section.** Supersedes
`2026-05-18-ktx-phase3-reconciliation-resume.md` for state AFTER the D7
tier-2 operator-tail walk. Detailed authority = the **"## !!! WALK
COMPLETE !!!"** block at the top of
`docs/superpowers/parking/2026-05-18-ktx-phase3-d7-operator-tail-ledger.md`.
This doc frames the NEXT section and preserves the hard-won conceptual
results so a fresh terminal does not re-derive them.

## Where things are

- **Arc:** `2026-05-16-ktx-mvdsv-l1-describe-fill` (Layer-1 describe-fill,
  KTX + MVDSV). Phases **0/1/2 SHIPPED**; **Phase 3 (KTX
  source-synthesis) IN-FLIGHT**; Phase 4 (MVDSV) + 5 (staleness/proj)
  approved-not-started; Phase 6 deferrable non-gating.
- **D7 tier-2 operator-tail walk = COMPLETE, 43/43.** Ledger committed +
  pushed every row (`7f4d8e1b` walk-complete; `HEAD` clean, 0 ahead/behind).
- **Phase 3 ship-gate (3 conditions, only #1 met):**
  1. DONE -- D7 tier-2 walk complete.
  2. OPEN -- FIX queue (10) resolved via D6 re-synth (C4: operator-gated,
     NEVER hand-edit; nothing applied yet).
  3. OPEN -- operator scan verdict (broad ~594 non-docket scan; operator
     reported ~10% clean so far -- gross-error class only, see Critical
     rules).
  Then Task 4 + Phase-3 boundary -> Phase 3 ships.
- **FIX queue = 10** (A=6 incl. 2 meaning-inversions r27 votemap / r39
  k_overtime; B=1 r25; C=2 r34/r42; D=1 r38). **Affirmed-judgment queue
  = 11** (unchanged -- tail was all synth). 2 shipped-cfg-drift
  operator-awareness notes (r38/r42). Full detail: ledger WALK COMPLETE
  block.
- This orchestrator session hit **440k** and clean-wrapped here (budget
  discipline; next work is judgment-critical).

## Reads required (cold, in order)

1. Ledger **"## !!! WALK COMPLETE !!!"** block (operator-decision
   handoff + full FIX queue + the flavour-C evidence base) --
   `docs/superpowers/parking/2026-05-18-ktx-phase3-d7-operator-tail-ledger.md`.
2. Arc README phase table + the D7 two-tier gate + the 2026-05-18
   decisions **A1** amendment -- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`.
3. `.../decisions.md` D5-D8, **D10 (source-tiebreaker)**, D6 skill, D7
   gate -- the decisions the amendment touches.
4. The D6 skill itself: `describe-fill-synthesis` (the artifact to
   amend). The Phase-4 executor prompt is NOT yet written -- the
   amendment must reach it before Phase 4 runs.
5. This doc.

## Critical rules / conceptual results -- DO NOT re-derive

- **Synthesis-shaped vs verification-shaped is THE distinction** (not
  "first vs second pass"). A *second synthesis* ("re-derive and diff" --
  the deferred tier-1) asks the same open question and inherits the same
  flavour-C inference -> structurally blind. Only a *verification-shaped*
  pass (a closed, falsifiable claim "it says X; is X true?" that cannot
  be answered without locating the enforcing line) forces the trace.
- **The verification fork re-inherits the disease if lazy.** A
  verification *fleet* scales to ~594 but is only a net if its prompt
  forbids the same shortcut -- r42 proved a worker will stamp PASS off a
  *cited, consistent-looking* line WITHOUT tracing the enforcing
  condition. Building the verification prompt is the same hard problem
  as the D6 fix, inverted. A lazy verification prompt is worth nothing.
- **The plan's D7 tier as specified would NOT have caught flavour-C**
  (tier-1 synthesis-re-derive, deferred; tier-2 = operator
  human-plausibility). The catching discipline (exhaustive grep + trace
  EVERY inferred semantic/threshold/polarity/scope clause to its
  enforcing line, incl. adjacent comments) was execution-strengthened,
  not pre-planned. It must be baked into (a) the D6 synthesis prompt and
  (b) the Phase-4 D7-tail definition, as a dated decisions amendment,
  BEFORE Phase 4 runs AND before the Phase-3 FIX-queue re-synth runs
  (a re-synth under the old prompt reproduces the defect).
- **flavour-C is conflict-invisible by construction.** It is never
  docketed, never scan-visible, never caught by a second synthesis --
  because the model never read the enforcing line, so nothing
  contradicted anything; D10 only adjudicates conflicts the model SAW.
  The operator scan clears the gross-error class only; it CANNOT retire
  flavour-C in the ~594. Do not let "scan looks good" imply Phase-3
  synthesis is flavour-C-sound.
- **C4:** re-synthesis routes through the D6 pipeline, operator-gated,
  never a hand UPDATE. Nothing in the FIX queue is applied.
- The 43-row walk is DONE -- do not re-walk it.

## First three actions (fresh terminal)

1. **flavour-C cheap probe (read-only, orchestrator-lane):** pull 12-15
   RANDOM *confident-fleet* (non-docket) rows; hand-trace each the way
   the tail was walked (exhaustive grep of every use-site + per-clause
   enforcement trace + WI-2 + PROC-1). Measure the flavour-C base rate
   in the ~594. Source oracle: re-clone `https://github.com/QW-Group/ktx.git`
   -> `git checkout 67253dc9ab4f643f1e6523a923a41caab9ea587f`; verify
   `git describe --tags` == `1.47-2-g67253dc`. DB: `docker.exe exec
   qw-oracle-postgres-dev psql -U qworacle -d qw_oracle` (post-reboot
   Docker is Windows-side; `docker` may need `docker.exe`).
2. **Draft the dated decisions.md amendment** (orchestrator PROPOSES,
   operator ratifies -- do NOT silently amend): the global D6
   re-synth-prompt rule (per-clause falsifiable claim + mandatory
   enforcing-line citation + the WI-1/WI-2/PROC-1 disciplines) AND the
   Phase-4 D7-tail definition (verification-shaped, hardened vs the r42
   shortcut). Bring exact wording to the operator.
3. **Bring the Phase-3 ship-gate decision batch to the operator:**
   probe result -> (a) FIX-queue (10) re-synth routing under the
   corrected prompt + whether the ~594 needs the full hardened
   verification fleet; (b) affirmed-judgment queue (11) keep-vs-synth +
   the r31 elaborated-affirm policy generalisation; (c) the 2
   shipped-cfg-drift notes (upstream-report or not). Phase 3 does NOT
   ship until #2/#3 of the ship-gate resolve + operator scan verdict.

## When in doubt

Route to operator, one question at a time, plain-English consequences.
The ledger WALK COMPLETE block is the detailed authority. Do not
re-walk the 43; do not hand-edit FIX rows (C4); do not run a re-synth
or a Phase-4 pass under the un-amended D6 prompt. The arc structure is
sound -- this section is a targeted verification-layer amendment +
probe, not a replan.
