# KTX/MVDSV L1 describe-fill -- orchestrator RESUME (2026-05-19, post-D7-walk)

**LIVE contract for the post-walk section.** Supersedes
`2026-05-18-ktx-phase3-reconciliation-resume.md` for state AFTER the D7
tier-2 operator-tail walk. Detailed authority = the **"## !!! WALK
COMPLETE !!!"** block at the top of
`docs/superpowers/parking/2026-05-18-ktx-phase3-d7-operator-tail-ledger.md`.
This doc frames the NEXT section and preserves the hard-won conceptual
results so a fresh terminal does not re-derive them.

## !!! SESSION #7 2026-05-19 (orchestrator, fresh terminal) -- BATCH-1 GATE PASSED. Supersedes SESSION #6 first-actions 1-3 below; first-actions 4-6 still stand. !!!

**Batch 1 (BATCH_ID 1, bucket 0) is orchestrator-VALIDATED. Greenlight
GIVEN for BATCH_ID 2..9 (operator launches 8 fresh terminals, the
hardened template, one BATCH_ID each).**

### Gate result (FACT)

- 63 batch rows; 9 flavour-C-positive (4 C-FIX `20fav_go` `fragsdown`
  `rpickup` `k_entityfile` + 5 C-NEAR-MISS `dmm1` `dmm3` `k_allow_vwep`
  `k_fbskill_aim_lgpref` `k_extralog`); 5 WI2-FIX; 49 TRACED-CLEAN. Rate
  9/63 = 14.3% == random-fleet probe ~14% (F-V1 stride de-clustered;
  NOT the calibration ~42% contiguous-clustering artifact).
- **F-V2 HARD GATE 1 LIVE:** 1 canary rejection (wave 02
  false-negatived `k_teamoverlay` TRACED-CLEAN -> wave rejected -> 02b
  under sharpened prompt returned the correct C-NEAR-MISS). The gate
  caught the exact invisible-class false-negative calibration predicted.
- **F-V2 HARD GATE 2 (orchestrator independent re-grep, NOT the
  terminal's claim):** 4/4 confirmed vs `/tmp/ktx-src-67253dc9` ==
  `1.47-2-g67253dc`. `20fav_go` C-FIX (no `20fav_add` cmd exists;
  `fav_add`->`self->fav[]` commands.c:5614 read by `fav_next` 5793 !=
  `20fav_go`->`self->favx[]` 5831) + `k_entityfile` C-FIX (g_utils.c:1722
  stores the FULL `<map>#<ent>` string, '#' only computes a separate
  mapName 1723-24) both genuinely defective; `k_use_matchless_dir` +
  `k_ctf_rune_power_rgn` TRACED-CLEAN genuinely clean (k_use_matchless_dir
  independently reproduces the session-#5 hand-walk r43=CLEAR). No
  false-flag, no false-clean.
- C4 holds: classify-only, committed (`be44b008`), B4 not started, no L1
  row mutated.

### One finding -- canary-leak (non-blocking; FIXED this session)

`k_yawnmode` (a canary control) leaked into batch-01's machine spine
(ledger line 451-452 = a stray `RESULT |` + `###` block). The terminal's
N (63) and tally are CORRECT (canary excluded from count/rate); only the
spine carries the stray control row. Raw `grep '^RESULT |'` = 64,
3-canary-filter = 63. Two-part track (`feedback_every_finding_gets_a_track`
+ `feedback_verification_layer_catches_lift_residuals`):

- **Template Step 6 hardened this session.** New item 1 = mandatory
  pre-commit canary-strip self-check (`grep -nE '^(RESULT \| |### )(...)'`
  must print nothing; delete leaked `RESULT |`+`###` block and re-verify
  N if not) + a `canary-strip self-check: PASS` report line. The 8
  remaining terminals run the hardened template -> clean ledgers at
  source (operator must paste the CURRENT on-disk template).
- **B5 Stage-1 collation rule (first-action #4 -- ROBUST backstop
  regardless of per-terminal hygiene).** Global rate / flagged-set tally
  is `grep '^RESULT |' <all 9> | grep -vE '\| (ktx:command:autotrack|ktx:cvar:k_teamoverlay|ktx:cvar:k_yawnmode) \|'`
  -- canary-id filter applied BEFORE any count. batch-01's leaked
  `k_yawnmode` line stays in the committed+pushed ledger (not worth a
  re-commit); the collation filter neutralizes it.

### Live next steps (session #6 first-actions 4-6, refined)

4. **As batches 2..9 land (HARD GATE 2 is PER-BATCH, not once):** read
   each report block for the signals (`canary-rejected` present; rate
   ~10-20%; committed+halted; `canary-strip self-check: PASS`) THEN
   independently re-grep >=1 flagged + >=1 clean of EACH batch against
   the oracle. Only then collate B5 Stage-1 via the canary-filtered
   `grep '^RESULT |'` (rule above), committed.
5. **B4 decision batch to the operator:** the full flagged set (batch-1's
   9 + batches 2..9 flagged + the `fav_go` ~13-member cohort) via the B4
   seeded-re-synth loop; plus the still-owed Phase-3 ship-gate
   sub-decisions (affirmed-judgment queue 11 + r31 policy; r38/r42
   shipped-cfg-drift notes). Batch-1 operator-attention residuals to
   fold in: `dmm1`/`dmm3` strict-vs-substantive near-miss call (force-off
   enforced by the generic `dmm!=4`, no `mode==1/3` test);
   dead-`CF_SPC_ADMIN` structural defect (`race_set_finish`/`upspecs`,
   likely systemic -> fleet-sweep candidate); `CF_MATCHLESS`
   additive-misread WI-2 pattern (`fav_add`/`fav_all_del`, systemic).
6. Later: Phase-4 (MVDSV) executor prompt MUST carry D7 B1-B5 (Phase-4
   carrier) before any MVDSV synthesis.

### When in doubt

Route to operator, one question, plain-English consequences.
`decisions.md` D7 Amendment 2026-05-19 is the detailed authority. C4 --
no B4 / re-synth without the operator gate. HARD GATE 2 is per-batch and
orchestrator-independent: never relay a terminal's re-grep claim
unverified (`feedback_verify_dispatched_terminal_claims`).

### !!! ALL 9 LANDED 2026-05-19 -- 7 verified, 03+08 re-run, Findings 1+2 RESOLVED. Collation still gated on all 9. !!!

**State:** 7 of 9 batches committed + gate-verified (01 02 04 05 06 07
09; 445 rows; aggregate flavour-C 68/445 ~= 15.3% == fleet ~14%, batch
05 high-outlier 23.6% but NOT ~40% -- bucket variance not stride
failure; canary-hygiene 0 leaks on every hardened-template batch). The
gate architecture WORKED end-to-end: canary GATE 1 fired + was honored
across batches (k_teamoverlay / autotrack false-negatives caught +
re-dispatched), and HARD GATE 2 orchestrator re-grep independently
caught under-flagged TRACED-CLEANs GATE 1 could not see (batch 04
`midair_minheight` + `_k_coachteam2`; batch 07 wave-3 under-trace) then
recovered -- `feedback_verification_layer_catches_lift_residuals` proven
in-run.

**2 did NOT complete (both untracked, NOT committed):**
- **Batch 08 (bucket 7, expect 61 rows): no-op.** Ledger = preamble
  only, 0 rows, 0 waves. Terminal crashed before wave 1. Full re-run.
- **Batch 03 (bucket 2, expect 65 rows): halted CORRECTLY at 20 rows.**
  Not a crash -- the terminal escalated 2 findings and STOPPED rather
  than ship tainted (textbook C4). Per-row inputs preserved at
  `/tmp/vpass-b03/`. Re-run (scope = operator call: full fresh vs
  resume-from-preserved).

**Finding 1 (k_teamoverlay ground-truth dispute) -- RESOLVED, DO NOT
RE-LITIGATE.** Orchestrator independent re-grep + batches 02/04/05/06/07
independent re-greps ALL converge: the team-info stream gates ONLY on
`client.c:4720 if (!k_teamoverlay)` -- NO `isDuel()` on the feature
path; the sole `!isDuel()` is `match.c:1639`, a settings-summary print
string, not the stream. **C-NEAR-MISS is correct ground truth.**
k_teamoverlay is a DELIBERATELY-HARD canary -- it IS the invisible
correct-by-accident class; sub-agents false-negativing it = the gate
WORKING. Batch-03 option (b) "amend to TRACED-CLEAN" would blind the
gate to the entire near-miss class -- REJECTED. Canary ground truth
stands; never amend from inside a batch (escalate, as batch-03 did).

**Finding 2 (sharpened "don't over-flag" brief -> systematic
under-flagging) -- REAL but batch-03-LOCAL; template hardened this
session.** Batch 03 used a FAILURE-B anti-over-flag re-dispatch brief,
self-detected it under-flagged genuine defects, and halted. The other
batches sharpened toward discrimination (safe direction); batch 04
proved HARD GATE 2 catches Finding-2 residue + recovers. The V-pass
template Step-4 HARD GATE 1 bullet now carries explicit re-dispatch
discipline (canary-hardness asymmetry; sharpen toward discrimination
NOT anti-over-flag; bounded retries; never amend ground truth in-batch;
halt+escalate). 03 + 08 re-run under the hardened template + standard
brief.

**Collation:** B5 Stage-1 (global rate + flagged set, all 571 / 9
buckets) is STILL gated -- buckets 2 + 7 missing. The 7-batch aggregate
above is interim situational context, NOT the committed Stage-1 record.
No collation until 03 + 08 land verified.

**Next:** (1) operator picks batch-03 re-run scope; (2) re-run 03 + 08
(hardened template, standard brief, k_teamoverlay C-NEAR-MISS); (3)
orchestrator per-batch HARD GATE 2 on the 2 new ledgers as they land;
(4) THEN canary-filtered B5 Stage-1 collation across all 9, committed;
(5) B4 decision batch. The 7 verified batches hold (do not re-verify
absent a new signal -- the gates functioned).

## !!! SESSION #6 WRAP 2026-05-19 (orchestrator @~400k) -> RESUME AS SESSION #7. SUPERSEDES the session-#6 UPDATE + "First three actions" below. !!!

Session #6 hit the ~400k smell zone and clean-wrapped here; next work
(collate 9 V-pass ledgers + spot-verify + B4) is judgment-critical so a
fresh terminal takes it. Probe + amendment + V-pass tooling are DONE;
the 9-terminal V-pass is about to run.

### Where things are

- **flavour-C fleet probe = DONE (FACT).** 2/14 ~= 14% positive on the
  unreviewed confident fleet (1 hard C-FIX `autotrack`, 1 near-miss
  `k_teamoverlay`). Docket-tail ~60% vs fleet ~14% => docket was
  enrichment-selected (fleet NOT 60% rotten) but ~7% hard-FIX over ~555
  and the operator HTML scan cannot see the class. FACT base = ledger
  "## !!! FLAVOUR-C FLEET PROBE 2026-05-19 !!!" block (`813e2493`).
- **D7 Amendment 2026-05-19 (B1-B5 + Phase-4 carrier) = RATIFIED +
  APPLIED** (`2541b142`). B1 strengthened-trace rule in
  `decisions.md` D7 + propagated to the D6 skill + new
  `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
  (5th load-bearing ref). B2 supersedes the 2026-05-18 A1 retirement
  clause: a clean read-only **V-pass** per row (NOT the operator scan)
  retires KTX D7 tier-1. B3 V-pass def; B4 seeded-re-synth loop; B5
  two-stage durable record. README + this doc flagged.
- **V-pass tooling DONE.** Template
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-handover-prompt.md`,
  F-V1/F-V2 hardened + model-dial pinned (`bb007c5f` calibration,
  `23be6afc` hardened, `7e753dcc` dial). Calibration (batch-0) =
  CALIBRATION-grade, NOT a ledger (canary fired: an Opus subagent
  false-negatived `autotrack` under the full prompt -> F-V2 exists).
  Calibration detail: `.../v-pass-batch-00-calibration.md`.
- **Population = 571 strided rows / 9 md5 buckets** (583 synth/synth
  ktx - 10 FIX -> B4 - 3 canary controls). Buckets ~51-82 each.
  Fleet base-rate estimate ~14% (random probe).
- **In flight:** operator is running BATCH 1 (BATCH_ID 1 -> bucket 0,
  63 rows) as the final at-scale validation before launching the other
  8. C4 holds: nothing in any queue applied; no L1 row mutated; B4 not
  started.

### Reads required (cold, in order)

1. `decisions.md` D7 **Amendment 2026-05-19 (B1-B5)** + the 2026-05-18
   A1/A2/A3 it supersedes (the detailed authority).
2. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   (the method) + the ledger "FLAVOUR-C FLEET PROBE 2026-05-19" block
   (probe FACT) + `.../v-pass-batch-00-calibration.md` (why F-V1/F-V2).
3. `.../v-pass-handover-prompt.md` (the live template the 9 run).
4. This block.

### Critical rules / conceptual results -- DO NOT re-derive

- Synthesis-shaped vs verification-shaped is THE distinction; the V-pass
  is verification-shaped and NOT a second synthesis.
- **The canary FIRED in calibration** -- the hardened prompt is
  necessary but NOT sufficient; F-V2 (per-wave structural canary HARD
  GATE 1 + orchestrator re-grep HARD GATE 2) is load-bearing, not
  advisory. A subagent verdict (incl. TRACED-CLEAN) is a hypothesis
  until independently re-grepped.
- flavour-C is invisible to an operator HTML scan (B2 supersedes A1).
- **C4:** nothing applied; B4 = re-synth via the D6 pipeline,
  operator-gated, SEEDED with the V-pass finding, full trace not patch,
  then re-V-passed; NEVER a hand-edit.
- Opus 4.7 MAX is the spec-locked floor for the terminals AND the
  subagents (D7 / B1-B3); not a per-run choice.
- 9 is locked into the template SQL (`% 9`); changing N is a deliberate
  SQL edit. The 43-row walk, the probe, and the calibration are DONE --
  do not re-run them.

### First actions (fresh terminal = session #7)

1. Read batch-1's reported summary + its committed
   `v-pass-ledger-batch-01.md`. Check the validation signals: terminal
   self-checked Opus; `canary-rejected` count present (gate live, not
   dormant); flavour-C rate ~10-20% (NOT ~40% -- if ~40% the stride did
   not de-cluster, HALT + diagnose before scaling); committed + halted
   (no B4 drift).
2. Independently re-grep a sample of batch 1 (>=1 flagged + >=1 clean)
   against `/tmp/ktx-src-67253dc9` == `1.47-2-g67253dc` -- the
   orchestrator-level HARD GATE 2. This is the last gate before 8
   unsupervised terminals.
3. If batch 1 validates -> greenlight the operator to launch BATCH_ID
   2..9 (Opus max each). If not -> one plain-English question to the
   operator with the diagnosis.
4. As ledgers land: `grep '^RESULT |'` across all 9 -> B5 Stage-1
   (global rate + flagged set), committed.
5. Bring the operator the **B4 decision batch**: the flagged rows + the
   known `fav_go` ~13-member family cohort, routed through the B4
   seeded-re-synth loop. Plus the still-owed Phase-3 ship-gate
   sub-decisions: affirmed-judgment queue (11) + r31 policy; the 2
   shipped-cfg-drift notes (r38/r42). Phase 3 ships only when every
   synth row is V-pass-clean (B2) + queues resolved + B5 record exists.
6. Later / not now: Phase 4 (MVDSV) executor prompt MUST carry D7
   B1-B5 before any MVDSV synthesis (Phase-4 carrier).

### When in doubt

Route to operator, one question at a time, plain-English consequences.
`decisions.md` D7 Amendment 2026-05-19 is the detailed authority. Do not
run B4 / any re-synth without the operator gate (C4). Do not relay a
subagent verdict without independent re-grep. Do not scale to 8 more
terminals until batch 1 is orchestrator-verified.

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
