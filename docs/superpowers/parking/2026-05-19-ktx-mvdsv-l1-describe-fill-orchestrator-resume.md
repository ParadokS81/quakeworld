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

**State (updated 2026-05-20 -- ALL 9 VERIFIED + B5 Stage-1
COLLATED):** 9 of 9 batches committed + orchestrator-gate-verified
(01..09; **N=571 rows, matches expected population exactly**; aggregate
**flavour-C 84/571 = 14.71% == random-fleet probe ~14%** -- calibration
prediction validated at full scale; canary-hygiene 0 leaks on every
hardened-template batch). B5 Stage-1 collation committed at
`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`.
**475 TRACED-CLEAN rows = B2 retirement evidence** (D7 tier-1 retired
for those rows). **96 flagged rows = the B4 cohort** (55 C-FIX + 29
C-NEAR-MISS + 12 WI2-FIX), operator-gated (C4 -- not started). The
gate architecture WORKED end-to-end: canary GATE 1 fired + was honored
across batches (k_teamoverlay / autotrack false-negatives caught +
re-dispatched), and HARD GATE 2 orchestrator re-grep independently
caught under-flagged TRACED-CLEANs GATE 1 could not see (batch 04
`midair_minheight` + `_k_coachteam2`; batch 07 wave-3 under-trace) then
recovered -- `feedback_verification_layer_catches_lift_residuals` proven
in-run.

**Batch 08 RESOLVED (re-run 2026-05-19, `fc5e8b6f`):** full fresh
re-run under the hardened template VALIDATED -- 61 rows, 8 flavour-C
13.1%, canary-strip clean, GATE 1 fired on waves 05/08 (k_teamoverlay)
+ GATE 2 on waves 01/05b, all recovered; orchestrator HARD GATE 2 3/3
independent re-grep confirmed.

**Batch 03 RESOLVED (re-run 2026-05-20, `edcc3019`):** full fresh
re-run under the hardened template VALIDATED -- 65 rows, 8 flavour-C
12.3%, canary-strip clean, GATE 1 fired wave 05 (k_teamoverlay,
recovered attempt 3 under anti-stale + discrimination-sharpened brief
-- the SAFE direction, NOT the FAILURE-B brief that batch-03's
predecessor session correctly halted on); orchestrator HARD GATE 2 2/2
independent re-grep confirmed (`_k_worldspawns` C-FIX = real
off-by-one timing defect: `SP_worldspawn` reads `_k_worldspawns`
during entity parse BEFORE `FirstFrame` increments it, so the 0.5s
branch fires on map 2 not map 1; `srv_practice_mode` TRACED-CLEAN =
all cited subsystem `k_practice` gates present at their lines with
the `// #practice mode#` comment).

**Gate architecture vindicated end-to-end.** Across all 9: canary
GATE 1 fired and was honored consistently (k_teamoverlay
false-negatives caught + re-dispatched in 01/03/04/06/07/08/09;
autotrack false-negatives in 06/09); HARD GATE 2 orchestrator re-grep
independently caught under-flagged TRACED-CLEANs that GATE 1 could
not see (batch 04 `midair_minheight` + `_k_coachteam2`; batch 07
wave-3) and recovered. Two batches (03, 08) failed on first attempt
(batch 03 correctly halted on a methodology gap; batch 08 crashed
pre-wave-1) -- BOTH re-ran cleanly under the hardened template and
validated.

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

**Next (handoff state):**
1. **B4 decision batch to the operator** -- the 96 flagged rows route
   through the B4 seeded-re-synth loop (decisions.md B4: D6 pipeline
   from Step 1, B1-strengthened, SEEDED with the V-pass finding,
   re-V-passed). Six systemic clusters identified in the collation
   amortize ~31 rows (fav_go family, CF_MATCHLESS WI-2 cohort,
   dead-CF_SPC_ADMIN, midair_minheight pair, k_on_end_f_* trio,
   dmm1/dmm3 force-off). Remaining ~65 unique rows for individual
   seeded re-synth. **Cluster-first recommendation:** start with the
   fav_go family as the B4 calibration cluster (largest + most
   coherent, like V-pass batch-0 calibrated F-V1/F-V2 before scale-up)
   to validate the seeded-re-synth loop; then expand or fan out.
2. **Phase-3 ship-gate residuals still owed** (smaller decisions):
   affirmed-judgment queue (11 rows) keep-vs-synth + r31 elaborated-
   affirm policy generalization; the 2 shipped-cfg-drift operator-
   awareness notes (r38 k_instagib, r42 timing_players_action) --
   upstream-report-or-not. Plus the dmm1/dmm3 strict-vs-substantive
   call (B4 cluster #6).
3. **Phase-4 (MVDSV) carrier (NOT NOW).** The Phase-4 executor prompt
   MUST carry D7 B1-B5 before any MVDSV synthesis (Phase-4 carrier
   per decisions.md B-block). Plan once Phase-3 ships.

**Phase 3 ship-gate:** condition 1 (D7 walk) DONE; condition 2 (FIX
queue + V-pass flagged set) opens with the B4 batch; condition 3
(operator scan verdict) opens at the operator's discretion. Phase 3
ships when every synth row is V-pass-clean (B2) + queues resolved +
B5 Stage-2 (change report) recorded.

**The 9 verified batches hold** (do not re-verify absent a new signal
-- the gates functioned).

### !!! SESSION #7 WRAP 2026-05-20 -> SESSION #8 picks up B4 receipt. !!!

**Session #7 wrapping at a clean milestone:** V-pass complete + B5
Stage-1 committed + B4 fav_go calibration prompt DRAFTED and ready
for operator launch. Wrap is judgment-driven (B4 ledger receipt is
fidelity-critical -- the orchestrator skill's pushback rule favors
fresh context for verification work, not late-session). Operator
launches the calibration terminal at their pace.

**Where things are (2026-05-20 17:00 UTC ~):**
- 9/9 V-pass batches committed + orchestrator-gate-verified (`c6b9bcea` + earlier).
- B5 Stage-1 collation committed at `v-pass-stage-1-collation.md`
  (N=571, flavour-C 14.71%, 475 retire-D7-tier-1, 96 flagged B4 cohort).
- B4 fav_go calibration handover prompt drafted at
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-fav_go-calibration-prompt.md`.
  Paste-and-launch shape; operator launches when ready. Calibration =
  first of 6 systemic clusters; convergence rate at this cluster
  determines whether to scale.
- Live nothing in flight (no terminal running until operator launches B4).

**Session #8 reads required (cold, in order):**
1. This SESSION #7 wrap block (you're reading it) -> the live contract.
2. `v-pass-stage-1-collation.md` -- what was found + the B4 cohort
   shape + the 6 systemic clusters.
3. `b4-fav_go-calibration-prompt.md` -- the prompt that ran, so you
   know what to verify against.
4. `decisions.md` D7 Amendment 2026-05-19 (B4 + B5 specifically) --
   the contract the operator-gated step must honor.
5. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- the method (same one V-pass used).

**Session #8 first actions on B4 ledger receipt** (when
`b4-ledger-fav_go-calibration.md` lands committed):

1. **Read the report block (Step 8 of the B4 prompt) for the
   calibration signals:**
   - Convergence rate (target >= 13/14 = 92.9%; >= 90% means scale;
     70-90% means harden-then-scale; < 70% means halt + redesign).
   - HALT-residue count (these are NOT failures -- they're correct
     refusals; read each to extract methodology insight).
   - Per-row attempts (avg ~1.0 = clean; avg ~2.5 = the cluster is
     marginal even with the shared root; avg ~3 = the architecture
     needs revisiting).
   - Orchestrator HG2 re-greps (the terminal's claim; you'll
     re-do this independently next).

2. **Independent HARD GATE 2 on the new descriptions
   (orchestrator-direct, NOT relayed):** pick 2-3 rows from the
   ledger and YOU re-grep the source oracle (`/tmp/ktx-src-67253dc9`
   @ `1.47-2-g67253dc`). For each:
   - Does the new description's cited enforcing line actually say
     what the description claims?
   - Does the new description's correction actually address the
     V-pass seed (i.e., the wrong-clause from Stage-1 is now traced
     to its real enforcing line)?
   - Pick at least one C-FIX-origin row + one WI2-FIX-origin row
     (different defect classes test different correction shapes).
   - Suggest first targets: `20fav_go` (was C-FIX, batch-01-verified
     by orchestrator at session-#7 start -- cross-check the
     correction against the known root), `fav_add` (was WI2-FIX
     CF_MATCHLESS-additive-misread, tests the access-class fix
     shape).
   - If the orchestrator re-grep does not hold for a row, the row
     is contested -- the calibration has surfaced a synth/verify
     residue Session #8 brings to the operator.

3. **Validate the cluster-shared root held across the
   re-syntheses:** spot-check 2 new descriptions of `Nfav_go`
   commands -- do they correctly distinguish `favN_add` (slot
   populator -> `self->favx[]`) from `fav_add` (generic, distinct
   array `self->fav[]` -> consumed by `fav_next`)? Two distinct
   command families, two distinct arrays. If a new description
   still conflates them, the cluster-shared seed didn't anchor
   well -> scaling-blocking finding.

4. **Bring the operator the cluster sign-off decision:** plain
   English, decisive, single recommendation. Three shapes:
   - **Scale-out** (clean calibration): "Cluster sound, fav_go ledger
     ready for L1 apply at operator's call. Drafting the next 5
     cluster prompts + the ~65-unique-row pass under the same
     template."
   - **Harden-then-scale** (marginal calibration): "Cluster works but
     surfaced X residue. Propose Y prompt edit before the next
     cluster. Operator approves the edit; then scale."
   - **Halt + redesign**: "Convergence is structurally low / a
     systemic miss showed up. Diagnosis is Z. Routing to operator;
     no more clusters fire until resolved."

   In ALL cases: do NOT auto-apply to L1. The cluster ledger is
   operator-gated input to a SEPARATE step (the actual L1 row
   update + L1 source_ref/anchor/verdict columns; ultimately fed
   from B5 Stage-2 once all clusters land).

**Critical rules carried into Session #8:**
- C4 holds. No L1 row mutated by any B4 terminal or by Session #8.
  The actual L1 apply is a separate, explicit operator-approved step
  driven by the cluster ledgers as a batch.
- HARD GATE 2 is per-cluster + orchestrator-independent. Never relay
  the B4 terminal's HG2 claim (`feedback_verify_dispatched_terminal_claims`).
- Halted rows in the calibration ledger are SIGNAL, not failure --
  read each one for methodology insight before scaling.
- The 8 verified V-pass batches + 475 TRACED-CLEAN rows already hold;
  do not re-verify them absent a NEW signal.
- The B4 prompt template is for ONE cluster per run. After
  calibration validates, Session #8 (or later) drafts the 5 other
  cluster prompts (CF_MATCHLESS WI-2 cohort, dead-CF_SPC_ADMIN,
  midair_minheight pair, k_on_end_f_* trio, dmm1/dmm3 force-off)
  swapping the cluster spec + shared-root context.

**When in doubt:** route to operator, one question, plain-English
consequences. `decisions.md` D7 Amendment 2026-05-19 is the detailed
authority; the SESSION #7 ALL 9 LANDED + B5 Stage-1 collation +
b4-fav_go-calibration-prompt.md are the concrete artifacts.

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
