# KTX/MVDSV L1 describe-fill -- orchestrator RESUME (2026-05-21, Session #9 picks up Wave 2 receipts)

**LIVE contract.** Supersedes
`docs/superpowers/parking/2026-05-19-ktx-mvdsv-l1-describe-fill-orchestrator-resume.md`
(the Session #7 → #8 contract; that arc-section closed in Session #8:
B4 fav_go calibration + B5 Stage-1 collation + dead-CF_SPC_ADMIN cluster
+ lean v2 calibration on midair_minheight + Pass 1 triage + Pass 2
template + Wave 1 / B5 receipt all done). Session #8 wrapped at ~400k
context with Wave 2 launched.

## !!! Where things are (FACT, 2026-05-21) !!!

### Pipeline state

- **Cohort:** 96 V-pass-flagged rows. 96 = 14 fav_go + 6 dead-CF_SPC_ADMIN
  + 2 midair_minheight + 5 small-clusters-deferred + 69 unique-row long
  tail.
- **Cluster ledgers landed (operator-gated for L1 apply):**
  - fav_go (14 rows, commit `1af966a4`)
  - dead-CF_SPC_ADMIN (6 rows, commit `e0bd3f81`)
  - midair_minheight (2 rows, commit `0979fb8b`)
  - B5 engine-boundary-untraceable (5 rows, commit `a48494ed`)
  - **Net: 27 rows of corrected descriptions in B5 Stage-2 ledgers.**
- **In flight (Session #8 launched 2026-05-21):** Wave 2 = B1 + B2 + B3 + B6
  in 4 parallel Opus 4.7 MAX terminals. Each runs
  `b4-unique-rows-pass2-template.md` with `BATCH_ID` = 1, 2, 3, 6.
  Expected wall-clock ~30-60min from launch.
- **Pending:** Wave 3 = B4 alone (19 rows, HYPOTHESIS-WEAK = per-row
  work, ~200-270k). Operator launches after Wave 2 lands clean.
- **Deferred (not blocking):** 5 small-cluster rows (k_on_end_f_*
  trio + dmm1/dmm3 pair). No subagent-based shape is cost-cheap at
  N≤5; pick up after long tail clears under whatever shape proves
  cheapest.
- **C4:** zero L1 row mutations across all clusters. Ledgers are
  operator-gated input to the eventual batched L1 apply (B5 Stage-2
  across all clusters).

### Lean v2 cost reality (calibrated)

- midair_minheight (2 rows, lean v2 v1 calibration): ~110k = ~55k/row
  at small scale. Fixed costs (pre-reads + sample-verify subagent)
  dominate.
- B5 (5 rows, multi-batch template calibration): ~85-100k terminal +
  50.7k subagent ≈ 135-150k = ~27-30k/row. Closer to the long-tail
  amortization target.
- Projected for the 4 Wave-2 batches: ~450-600k across 4 parallel
  terminals. B4 Wave 3 ~200-270k. Net long-tail (45 rows minus the
  5 B5 already done = 64 rows) ~~ 650-870k ~~ ~10-14k/row at scale.
- The cost goal landed on the lean v2 second iteration (multi-batch
  template); operator critique 2026-05-20 about per-row cost is now
  addressed.

## Reads required (cold, in order)

1. **This block** -- the live contract.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-unique-rows-pass2-template.md`
   -- the template all 4 Wave-2 terminals are running + B4 will run.
   Step 8 report block + lookup table for BATCH_ID.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-unique-rows-triage-plan.md`
   -- the 6-batch plan (rows + shared-root hypothesis per batch +
   confidence rating).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-engine-boundary-untraceable.md`
   -- B5 ledger (the calibration). Step 4 evidence block + the
   per-row ledger entries are the shape Wave 2 ledgers will follow.
5. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   D7 Amendment 2026-05-19 (B1-B5) -- the seeded re-synth contract.
6. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
   -- the method. Includes 2026-05-20 callee-follow amendment + the
   dropquad worked case + autotrack/k_teamoverlay canonical examples.
7. `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/feedback_cluster_root_is_hypothesis.md`
   -- the methodology gain Session #8 surfaced (Init_cmds finding).

## Critical rules / conceptual results -- DO NOT re-derive

- **C4:** zero L1 row mutations. The cluster ledgers are operator-
  gated input to a SEPARATE L1 update step that no B4 terminal and
  no orchestrator takes. Wait for all clusters + the long tail to
  land before the batched L1 apply.
- **HG2 receipt discipline.** Each Wave-2 ledger's terminal claim is
  a hypothesis until orchestrator-direct re-grep against
  `/tmp/ktx-src-67253dc9` @ `1.47-2-g67253dc`. Never relay a
  terminal's HG2 claim unverified
  (`feedback_verify_dispatched_terminal_claims`).
- **Lean receipt shape (per Wave-2 batch):** read the Step 8 report
  block + spot-check 1 Step-4 V-pass evidence claim + spot-check 1
  row's load-bearing clause. ~30-50k per receipt. Do NOT do the
  7-target HG2 sweep Session #8 used for the v1 clusters; that
  burned context unnecessarily.
- **B4 is HYPOTHESIS-WEAK by design.** No shared code site; per-row
  enforcing-line work. Wave 3 receipt: skip Step-4 evidence check
  (there is none for B4); just spot-check 2 row-level enforcing
  lines + read the per-row attempts avg from the report.
- **Cluster-shared root is itself a hypothesis** (Init_cmds finding).
  The Wave-2 terminals' Step 4 V-passes their batch's hypothesis
  before authoring. If a hypothesis fails Step 4, the terminal HALTs
  and escalates -- expect this for B1 sub-group C (per-row name-
  pattern; no shared code site within sub-group). HALT is correct
  behavior, not failure.
- **Calibration-first scaling worked.** Wave 1 (B5) validated the
  consolidated multi-batch template; Wave 2 fanned out only after.
  Same calibration discipline that fav_go → dead-CF_SPC_ADMIN →
  midair-minheight → B5 followed. Honor it: do NOT launch Wave 3
  (B4) until Wave 2 is fully sane.

## First actions (fresh terminal = Session #9)

1. **Receive Wave 2 ledgers as they land.** Each commits its own
   ledger at `b4-ledger-<batch-name>.md` (per the BATCH_NAME case
   block in the template). Names:
   - B1 -> `b4-ledger-flag-name-inversion.md`
   - B2 -> `b4-ledger-wi2-access-class.md`
   - B3 -> `b4-ledger-wrong-mechanism-scope.md`
   - B6 -> `b4-ledger-scope-path-untraceable.md`

   For each: read the Step 8 report block + 1 Step-4 V-pass evidence
   claim spot-check + 1 row's load-bearing clause spot-check. ~30-50k
   per receipt. Sign off per-batch in plain English.

2. **After all 4 Wave-2 ledgers received + clean:** greenlight Wave 3
   (B4 launch). Same template, `BATCH_ID = 4`. Operator-paced.

3. **B4 receipt when Wave 3 lands:** skip Step-4 V-pass check (B4 is
   HYPOTHESIS-WEAK; no shared root). Spot-check 2 row-level
   enforcing lines + read per-row attempts avg. If avg is high
   (>2.0), surface to operator -- B4 may need fallback to v1 per-row
   dispatch for residual rows.

4. **Fold methodology gains into standing artifacts (after all long-tail
   ledgers land):**
   - Add `ENGINE-BOUNDARY-HEDGED-OK` as a valid TRACED-CLEAN-compatible
     verdict subclass in `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
     (per Session #8 B5 surface; valid when hedge accurately scopes the
     boundary + tree-wide grep confirms no KTX enforcement + hedged
     actor's role corroborates via adjacent source).
   - Add **commented-out runtime check masquerading as live condition**
     as a 4th sub-pattern in the ELABORATION DISCIPLINE list (alongside
     flag-NAME inversions / callee-branch dead code / command-name
     pattern inversions). Example: `vw_available = checkextension(...)`
     at world.c:355 commented out, replaced by `vw_available = 1`.

5. **Bring operator the batched L1 apply decision** once all 6 batches
   + the 5 deferred small-cluster rows resolve. The cluster ledgers
   are structured as B5 Stage-2 records; the L1 apply is a mechanical
   UPDATE pass across ~96 rows. Operator-gated; NOT silent.

6. **Decision: 5 deferred small-cluster rows** (k_on_end_f_modified /
   k_on_end_f_ruleset / k_on_end_f_version / dmm1 / dmm3). Defer
   resolved by either: (a) hand-author inline (cheapest at N=5; operator
   does it OR Session #9 does it), (b) run as a single combined batch
   under the Pass 2 template (~150-200k for 5 rows), (c) skip and let
   the L1 apply skip them. Surface to operator at appropriate moment.

## Methodology highlights queued (durable in this resume + B5 ledger
methodology section)

- ENGINE-BOUNDARY-HEDGED-OK verdict subclass (see First action #4).
- Commented-out-runtime-check pattern (see First action #4).
- These are template improvements that benefit FUTURE V-pass + B4
  work. They do NOT block Wave 2 / Wave 3 / the L1 apply.

## When in doubt

Route to operator, one question, plain-English consequences.
`decisions.md` D7 Amendment 2026-05-19 is the detailed authority on
B4 / B5 contracts; this resume + `b4-unique-rows-pass2-template.md`
are the concrete Session #9 artifacts. The 4 prior cluster ledgers
hold; do not re-verify absent a NEW signal. C4 -- no L1 row mutated
by any B4 terminal or orchestrator session.
