# Resume: enforce-L1-runtime-truth EXECUTION orchestrator -- session 4 -> session 5

**For:** arc-orchestrator, FRESH terminal, EXECUTION mode (NOT drafting; NOT
arc-reviewer). **The next unit of work is NOT Phase 5 -- it is the F15
Phase-3-loader-idempotency fix-cycle, THEN Phase-4 re-verify on a clean
idempotent DB, THEN Phase 5.** Execution-orchestrator session 4 ran cold
pre-flight (every s3->s4 "verified" claim independently re-checked vs LIVE --
all GREEN; the Phase-3-SHIPPED boundary intact), dispatched + received +
independently 3-way-gated the Phase-4 arc-executor halt
(DONE_WITH_CONCERNS), confirmed Phase-4's OWN deliverables sound, root-caused
+ adjudicated F15 vs primary source, applied the F12+F14 dated
MD-corrections, committed Phase-4's verified code as a CHECKPOINT
(`702421a1`), and handed off at THIS clean checkpoint boundary rather than
fold the F15 fix into a smell-zone session (the F15 fix is
correctness-critical on the most-shared file in the codebase --
`natural-keys.ts`, shared with the STILL-ACTIVE ktx-mvdsv arc -- and needs a
fresh full judgment budget; operator-approved checkpoint path). You are COLD
-- read before acting. You do NOT execute phase/fix code; you dispatch
arc-executor terminals, independently re-verify each boundary vs LIVE source,
own cross-phase memory, judge fresh-terminal handoffs on budget.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Model: draft-then-execute, 5 phases, fully SEQUENTIAL. README phase index is
authoritative. All 5 MDs APPROVED; pre-execution cross-phase audit RAN +
CLEARED (F8). EXECUTION underway.

Status:
- **Phase 1: SHIPPED** -- `51604f67` (F9 -> operator-ratified D5 AMENDMENT).
- **Phase 2: SHIPPED** -- `3c136826` + `b23f96eb` (R1 GREEN; F10).
- **Phase 3: SHIPPED** -- `895817bb` + `8ed860fe` (two D12-separate JSONB
  cols + loader; F11 accept-as-is / F12 dated MD-correction / F13 floor
  recalibrated; no D-amendment).
- **Phase 4: CODE-COMPLETE + orchestrator-boundary-verified GREEN;
  CHECKPOINTED `702421a1`; Phase 5 BLOCKED on F15.** Commit
  `docs(arc-exec): enforce-L1 Phase 4 CHECKPOINT ...`. 17 files (the
  acceptance contract: `extractor_lib/_acceptance.py` +
  `ezquake/accept-runtime-truth.py` + `data/detection/version-pin-proxy.sh`
  + `extractor_lib/tests/test_acceptance.py` created;
  `emit_callgraph_signal.py` / `extract.py` / `extract-tag.ts` [the F14
  real wiring site] / `load-callgraph-reachability.ts` /
  `load-hud-commands.ts` / `quality-grid.ts` / `quality-grid.test.ts` /
  `types.ts` / detection `README.md` modified; the
  `acceptance-validated-ezquake.json` + `level3-stamp-set-3f9e724f.json`
  durable artifacts; the F12+F14-corrected `phase-4-acceptance-contract.md`
  + review-findings F14/F15). README Phase-4 row + arc-history Phase-4
  entry + HANDOVER flipped in the follow-up flip commit (refs `702421a1`).
- **Phase 5: NOT started. BLOCKED on F15** (Phase 5 reasons over exactly
  the Track-B command pool whose source_state F15 destabilizes).

**Phase-4's OWN deliverables are DONE + independently orchestrator-verified
GREEN** (executor DONE_WITH_CONCERNS treated as hypothesis; the Phase-3
3-way method -- structural + primary-source-by-symbol + own empirical
re-run):
- F7 PRIMARY embedded-SHA proxy leg RE-RUN by the orchestrator:
  `version-pin-proxy.sh` PASS at the pin; tamper-A (truncated) trips;
  **tamper-B (SHA->deadbeef, line ranges intact) trips the PRIMARY leg
  ALONE while BOTH heuristic SANITY legs PASS** -- the exact D19
  strictly-stronger-than-heuristic sub-gate, verified by my own run;
  `front1-diff.sh` byte-immutable (the SHA leg lives ONLY in
  `version-pin-proxy.sh` -- F7/OQ-4).
- Stage-1 = pure `subprocess.run([sys.executable,<probe>])` COMPOSITION of
  the shipped Phase-1/2 probes (`_acceptance.py run_stage1`, read
  line-by-line -- X2/R5, NO re-authored GATE/ANCHOR logic; missing-script
  -> RED). Validation record embeds the real `GATE 1/2/3 GREEN` + `ANCHOR
  1/2/3+R7+R1 GREEN` subprocess stdout, status GREEN at `3f9e724f`.
- Stage-2 level-3 stamp EXACT (orchestrator SQL == the stamp-set):
  Track-A dump-confirmed = `{gl_outline_scale_world, sb_qtvlist_url}` (the
  2 genuine-dead the dump confirms absent); Track-B = 129 (all
  dump-present recovered HUD commands -- D21); `cl_bobhead` build-excluded
  stays level-2 (OQ-3); `static_dead_overridden_by_dump = []`.
- CARRY-FORWARD 1 HELD: `sb_qtvlist_url` conclusion=`genuine-dead` +
  evidence (callgraph, all-unreachable, residue:false) byte-UNCHANGED,
  ONLY `dump_confirmation` flipped -> `dump-confirmed`;
  `load-hud-commands.ts` diff is purely additive slot-3 (the
  `source_state:'source_backed'` write is byte-unchanged).
- `route_by_level` pure/total/conservative -- the SHIPPED+TESTED Phase-5
  input; `F1.runtime_fidelity_shape` PASS incl. the new
  level-3-only-at-pinned leg (the Phase-3-deferred assertion Phase 4
  owned, landed GREEN); `F1.jsonb_columns_not_strings` PASS; `command_count`
  693.
- F8 held: NO migration added (highest ordinal `015` re-derived live,
  unchanged); the `quality-grid.ts` diff did NOT touch the F13 floor
  calibration or the ktx-mvdsv `F1.describe_fill.*` region.
- (My own end-to-end harness re-run was timeout-bounded -- `--stage all`
  re-runs the ~540s serial extractor. Harness GREEN corroborated three
  independent ways instead: the artifact embeds the literal extractor
  subprocess stdout [not a synthesized "PASS"], my own proxy re-run, my
  own DB SQL of the applied stamps. A fresh full end-to-end harness pass
  is the only Phase-4 leg I did not myself complete -- note it; it is
  re-run anyway at the post-F15 Phase-4 RE-VERIFY.)

## F15 -- the blocker (READ THIS CLOSELY; it is the next unit of work)

**What:** Phase-4 stage-2 requires a `extract-tag --project ezquake
--version head --force` re-load to apply the level-3 stamp -- the
FIRST-EVER re-load of tag `3f9e724f` since Phase-3 clean-loaded it. That
re-load surfaces a PRE-EXISTING Phase-3-loader source_state idempotency
divergence: EXACTLY 12 Track-B bare-HUD `command` entities -- `radar`,
`bar_armor`, `bar_health`, `itemsclock`, `netproblem`, `score_difference`,
`score_enemy`, `score_position`, `speed`, `speed2`, `teamholdbar`,
`teamholdinfo` (all `track_b_hud_recovery` carriers, all conclusion
`bare-command`) -- flip `source_state` `source_backed -> doc_only`. Net:
`F1.ezquake.floor.command_source_state` `{source_backed:612,doc_only:19,
source_retired:62}` vs the F13-recalibrated expected
`{doc_only:7,source_backed:624,source_retired:62}`;
`F1.ezquake.anchor.doc_only_count` 69 vs 57; `F1.cross_type_orphans` 12;
command COUNT UNCHANGED at exactly 693 (no inflation/loss).

**Root cause (orchestrator primary-source-verified, NOT the executor's
word -- the s4 trust anchor; RE-VERIFY before fixing, do not trust this on
faith either):** `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`
`upsertEntity` (~:106-159) sets `source_state` ONLY on the INSERT path
(`existing.length==0`, the clean-DB case); on a re-load (row exists) it
`UPDATE`s name/last_seen/updated_at but NEVER `source_state` -- it returns
`prevSourceState` and leaves the column as-is. The 12 names are
SIMULTANEOUSLY (a) per-type-command-loader targets (each appears 1x in
`ezquake-commands-ast.json`; help-JSON-classified `doc_only`) AND (b)
Track-B-adapter (`load-hud-commands.ts`) `upsertEntity(... source_state:
'source_backed')` targets -- on the SAME entity row (same
`project/type/name_fold`). On a CLEAN load the order lands `source_backed`
(Phase-3 ended at 624); on a RE-LOAD against the populated DB the same
extract+load lands `doc_only` for these 12. Clean-load != re-load of the
same tag == a violation of the codebase always-on rule "**Layer 1
extractors are idempotent -- re-running against the same tag produces the
same rows**" (`apps/qw-oracle/CLAUDE.md`).

**NOT Task-4-caused (orchestrator git-diff-verified at the s4 gate):**
`natural-keys.ts` + the per-type command loader are NOT in the Phase-4
diff; `load-hud-commands.ts`'s `source_state:'source_backed'` write is
byte-unchanged (the Task-4 diff is purely additive slot-3 stamping); the
Phase-4 acceptance gate (the layer designed to catch exactly this latent
class) merely SURFACED a pre-existing Phase-3-loader defect on its first
mandated re-load. F15 owns Verification-8's 3 regression FAILs; they are
SCOPED OUT of the Phase-4 boundary as a routed pre-existing blocker (the
dated F15 scoping note in the Phase-4 MD Verification 8 -- the F13
check-reconcile mechanism, OPPOSITE disposition).

**Disposition (operator-ratified at the s4 gate -- do NOT re-litigate):**
F15 is **F13-INVERSE**. F13 was legitimate idempotent D21 *growth* ->
recalibrate the stale snapshot. F15 is a genuine non-idempotency *defect*
-> **do NOT recalibrate the floor to 612/19** (that bakes in the
always-on-rule violation -- `feedback_idempotency_before_staleness`; the
Phase-4 executor correctly applied this and explicitly avoided the F13
trap). Fix the loader; do NOT touch the calibrated snapshot (it stays
624/7/62 -- the CORRECT clean-load expectation; the fix must make a
re-load reproduce it).

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md`,
   `decisions.md` (D1-D22 + the **D5/D7/D11 AMENDMENTS** + X1-X10 +
   non-goals IN FULL; do NOT re-open a D), `review-findings.md` (**F15
   the blocker + F14 [RESOLVED dated MD-correction]** the freshest; F7
   the Phase-4 load-bearing rule; F8 the cross-arc standing rule; F9/F11/
   F12/F13 RESOLVED -- do NOT re-litigate), `phase-template.md`,
   `README.md` (LOCKED index; Phase 1-3 `shipped`, Phase 4
   `CHECKPOINT ... BLOCKED on F15`, Phase 5 pending).
2. **The Phase-4 MD IN FULL** (`phase-4-acceptance-contract.md`) -- it
   now carries the consolidated **F12+F14 dated MD-correction block**
   (after the no-deviation block) + the executable-literal fixes
   (`extract-tag` not `load-version`; canonical `qw_oracle_test` `bun
   test`; `extract-tag.ts` not `load-version.ts`) + the **F15 dated
   scoping note in Verification 8**. The Phase-5 MD (cross-phase footprint
   you gate for drift -- it CONSUMES `route_by_level` + the stamped
   `dump_confirmation` + the Track-B command pool F15 destabilizes). P1/P2/
   P3 SHIPPED contracts as needed.
3. The spec (D-rationale; decisions.md is the distilled contract -- do NOT
   re-open a D).
4. The handoff chain (critical rules cumulative): the s1->s2, s2->s3,
   s3->s4 resumes, and THIS doc (s4->s5, the freshest).
5. Memory: **`feedback_idempotency_before_staleness`** (THE F15 lens --
   inflated/changed re-load counts are a re-run idempotency bug, not a
   stale snapshot; F15 is its freshest worked example, F13-inverse),
   **`feedback_repair_by_reextract_not_sql_update`** (X9 -- the F15 fix
   recovery is fix-the-loader + re-extract+re-load, NEVER an in-place SQL
   UPDATE of the 12 rows), **`feedback_cross_phase_audit_shared_file_drift`
   / F8** (THE load-bearing F15 hazard -- `natural-keys.ts` is the
   source_state machine ALL Layer-1 entities + the STILL-ACTIVE ktx-mvdsv
   describe-fill arc flow through; an idempotency fix there MUST NOT
   regress ktx-mvdsv's source_state semantics -- re-derive the cross-arc
   impact LIVE, gate ktx-mvdsv's F1 grid too), `feedback_verify_dispatched_
   terminal_claims` (THE core duty -- the F15 fix executor's
   "fixed/idempotent" is a hypothesis until you independently re-run a
   clean-load-vs-reload comparison), `feedback_parking_verified_state_is_
   hypothesis` (this doc's F15 root-cause is itself a hypothesis until you
   re-verify it live), `reference_runtime_dump_self_certifies_commit` (F7
   -- still binds the Phase-4 RE-VERIFY), `reference_qw_oracle_floor_vs_
   clean_reload` (the F13/F15 family -- but F15 is the INVERSE: do NOT
   recalibrate), `feedback_operator_not_technical_review_gate`,
   `feedback_model_effort_range`, `feedback_no_subagents_for_mechanical_
   edits`, `feedback_orchestrator_terminal_pattern`,
   `reference_destructive_rm_harness_gate` (`rm -rf` blocked -- `mktemp
   -d`).
6. `arc-planner/references/arc-phase-archetypes.md` -- the F15 fix is a
   **Loader port / Migration-or-backfill-shaped idempotency fix** ->
   AUTOMATED floor (idempotency probe: a second re-run is a no-op /
   clean-load == re-load), but it touches shared substrate so the
   orchestrator gate is heavier. Phase 4 RE-VERIFY = the acceptance/gate
   archetype OPERATOR-RUN floor (the 9 boundary checks, now expecting the
   3 F15-family FAILs CLEARED). Phase 5 = MIXED -> OPERATOR-RUN higher
   floor (carried for when you reach it).

## Critical rules (cumulative -- carry into the F15 fix + the re-verify)

- **Verify the F15 root-cause + the fix yourself vs LIVE.** This doc's
  root-cause analysis is a HYPOTHESIS (the
  `feedback_parking_verified_state_is_hypothesis` discipline binds even
  the orchestrator's own prior-session writeup). Before dispatching the
  fix: re-read `natural-keys.ts upsertEntity` + the per-type command
  loader (`load-commands.ts`) + the Track-B adapter (`load-hud-commands.ts`)
  + the `extract-tag.ts` loader ORDER; reproduce the divergence
  (clean-load source_state for the 12 vs re-load source_state) before
  trusting the mechanism. After the fix: the executor's "now idempotent"
  is a hypothesis -- YOU independently re-run a clean-load (drop+migrate
  +load) vs a re-load and SQL the 12 + the full `command_source_state`
  crosstab; they must be IDENTICAL and == 624/7/62.
- **X9 repair-by-reextract, NEVER SQL UPDATE.** The recovery is: fix the
  loader source_state precedence/idempotency, then re-extract+re-load
  end-to-end. An `UPDATE entities SET source_state` on the 12 is
  automatically the wrong instinct (`feedback_repair_by_reextract_not_sql_
  update`).
- **Do NOT recalibrate the floor (F13-INVERSE).** 624/7/62 is the CORRECT
  clean-load expectation; the fix makes a re-load reproduce it. Changing
  the snapshot to 612/19/62 bakes in the defect and is explicitly
  rejected (operator-ratified at the s4 gate).
- **F8 / shared-substrate is the load-bearing F15 hazard.**
  `natural-keys.ts` `upsertEntity` is the source_state machine EVERY
  Layer-1 entity (all 5 engines) + the **STILL-ACTIVE ktx-mvdsv
  describe-fill arc** flow through. An idempotency fix there is NOT
  ezQuake-local. The fix MUST be re-load-idempotent for ezQuake WITHOUT
  changing the clean-load semantics any other project/the ktx-mvdsv arc
  depends on. Gate: re-run the F1 grid for ezQuake AND ktx AND the other
  projects post-fix; the ktx-mvdsv `F1.describe_fill.*` + every
  `*.floor.*_source_state` must stay GREEN. `git log --since=<F15-freeze>
  -- apps/qw-oracle/scripts/load-knowledge/ apps/qw-oracle/db/migrations/`
  for sibling-arc drift before AND after. NEVER `git add -A`; NEVER touch
  ktx-mvdsv files.
- **The F15 fix is its own fix-cycle, not a phase.** Fresh arc-executor
  terminal, scoped prompt (diagnose + fix the Phase-3-loader source_state
  idempotency so a re-load == a clean-load for the 12 [and structurally
  for the whole class -- any name that is both a per-type-loader target
  and a Track-B-adapter target]; X9 re-extract to prove it; F8
  shared-substrate discipline; HALT structured with the ACTUAL
  clean-vs-reload SQL, not "fixed"). The orchestrator independently gates
  it (the Phase-3 3-way method). It is NOT a `decisions.md` amendment
  (X8/F8/F13 family -- a loader idempotency defect, not a refuted
  premise; the s4 gate already ratified no D-amendment).
- **After the F15 fix gate passes: Phase-4 RE-VERIFY (a full
  orchestrator-gated boundary, not a rubber-stamp).** Re-run the full
  Phase-4 boundary on the clean idempotent DB: the 9 operator-run checks
  (the F7 proxy + tamper, the harness `--stage all` end-to-end [the leg
  s4 could not complete in-budget], the level-3 stamp EXACT, CARRY-FORWARD
  1, toggle-off, X9 path) AND the 3 F15-family regression FAILs must now
  be CLEARED (`command_source_state` 624/7/62, `doc_only_count` 57,
  `cross_type_orphans` 0). Only then is Phase 4 truly shipped (flip README
  Phase-4 -> `shipped`, arc-history Phase-4 -> shipped, the two-commit
  pattern). THEN Phase 5.
- **Phase 5 is the LAST phase.** It CONSUMES `route_by_level` + the
  stamped `dump_confirmation` + the Track-B command pool. At Phase-5 SHIP:
  scoped commit + `git tag -a arc-enforce-l1-runtime-truth-shipped`, then
  the POST-ARC handoff routes to **arc-reviewer** (a DIFFERENT skill,
  fresh terminal -- structurally NOT the execution orchestrator).
- **Commit cadence:** scoped `git add` of ONLY the fix-cycle's / phase's
  shipped files + this arc's scaffold, EVERY commit. NEVER `git add -A`.
  Mirror the two-commit pattern (ship/fix commit; then a tiny
  README/arc-history-flip commit referencing the ship SHA). End commit
  messages with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
  Push is the operator's call at session wrap (main is many commits ahead
  of origin; surface it, do NOT auto-push).
- **`rm -rf` is harness-blocked.** Use `mktemp -d`. For the clean-load
  idempotency proof, a throwaway test DB / a drop+migrate of the dev DB
  is the shape (not `rm`).

## First three actions

1. Cold-read the scaffold + the Phase-4 MD IN FULL (with the F12+F14+F15
   dated notes) + Phase-5 MD + the handoff chain + the named memory.
   Confirm: README Phase 1-3 `shipped` / Phase 4 `CHECKPOINT ... BLOCKED
   on F15` (`702421a1`); review-findings F15 OPEN-routed + F14 RESOLVED;
   the D5/D7/D11 amendments coherent; pin BOTH legs still
   `3f9e724fa608e516040f02b9557808ff3efda53e` (re-run: `git -C
   research/repos/ezquake-source rev-parse HEAD` + the `oracle_meta`
   query); the checkpoint `702421a1` is HEAD-ish (a ktx-mvdsv commit may
   interleave -- SEPARATE arc); the arc is clean on disk for enforce-L1
   files. Do NOT re-open design; do NOT re-litigate F9/F11/F12/F13/OQ-1-4;
   do NOT recalibrate the floor (F13-inverse, ratified).
2. Independently re-verify the F15 root-cause vs LIVE before dispatching
   the fix (this doc's analysis is a hypothesis): re-read `natural-keys.ts
   upsertEntity` source_state handling + `load-commands.ts` (per-type) +
   `load-hud-commands.ts` (Track-B adapter) + the `extract-tag.ts` loader
   order; confirm the 12 entities are simultaneously per-type-command +
   Track-B targets on one row; reproduce the clean-load(624)-vs-reload(612)
   divergence (the DB is currently in the 612/19 re-loaded state -- a
   fresh clean-load into a throwaway/dropped DB is the comparison).
   Confirm NOT-Task-4-caused holds at HEAD.
3. Scope + dispatch a FRESH arc-executor terminal for the F15
   Phase-3-loader-idempotency fix (the operator opens + pastes). Brief:
   make the Phase-3 loader source_state assignment re-load-idempotent for
   the per-type-loader x Track-B-adapter collision class (a clean-load and
   a re-load of the same tag produce IDENTICAL source_state for the 12 and
   structurally for any name that is both a per-type target and a Track-B
   target) -- diagnose the exact precedence (likely: `upsertEntity` must
   apply a source_state TRANSITION on the existing-row path, or the
   Track-B adapter must `setEntitySourceState` to promote, or the
   per-type loader must not demote a Track-B-owned row -- the executor
   diagnoses + picks the minimal correct fix); X9 re-extract+re-load to
   PROVE idempotency; F8 shared-substrate HARD (do not regress ktx-mvdsv /
   other projects' source_state -- re-run all-project F1 grids); HALT
   structured with the ACTUAL clean-vs-reload SQL for the 12 + the full
   `command_source_state` crosstab (== 624/7/62 both ways), not "fixed".
   Receive the halt; independently gate vs LIVE (the Phase-3 3-way
   method -- re-run the clean-vs-reload comparison YOURSELF; all-project
   F1 grids GREEN; the 12 stable across 2+ reloads). Then dispatch the
   **Phase-4 RE-VERIFY** (a full orchestrator-gated boundary on the clean
   DB -- the 9 checks + the 3 F15-family FAILs CLEARED). Only then ship
   Phase 4 (README/arc-history -> `shipped`), then prep Phase 5. Re-project
   YOUR budget after the F15-fix gate AND again after the Phase-4
   re-verify; hand off at a clean boundary if >350k (the s4 session did
   exactly that here -- it worked).

## When in doubt

North Star: L1 tells the runtime truth both directions for ezQuake,
provenance a reader can trust; met at the END of Phase 5. The spec is
source-of-truth; the 5 MDs are LOCKED execution contracts (carrying the
F9 + F10 + F12 + F13 + F14 dated corrections + the F15 scoping note);
parking / "verified" / prior-session / executor lines are HYPOTHESES until
re-verified vs LIVE (this doc's F15 root-cause INCLUDED). The Phase-4
acceptance contract is independently verified SOUND -- the blocker is the
PRE-EXISTING Phase-3-loader F15 idempotency defect Phase-4 SURFACED (the
gate doing its job). F15 is **F13-INVERSE**: a genuine "L1 extractors are
idempotent" always-on-rule violation -- fix the loader (X9
re-extract+re-load), do NOT recalibrate the snapshot. The fix is on the
MOST-SHARED file in the codebase (`natural-keys.ts`, shared with the
STILL-ACTIVE ktx-mvdsv arc) -- F8 binds hardest here: re-derive cross-arc
impact LIVE, gate every project's F1 grid, NEVER break ktx-mvdsv's
source_state semantics, NEVER `git add -A`, NEVER touch ktx-mvdsv files.
The dump is the overriding answer key (D19) + self-certifies via the
embedded `~<sha>` (F7 -- the Phase-4 RE-VERIFY re-runs this live). The
executor's "fixed / GREEN" is a hypothesis until the orchestrator
independently re-runs the clean-vs-reload comparison + all-project grids.
Refuted premises route to the operator as dated `decisions.md` amendments
(one question, plain English, recommended option); mechanical / loader /
calibration / MD-literal corrections (F6/F10/F11/F12/F13/F14/F15 family)
are orchestrator-applied, narrative-preserved, no D-amendment,
operator-cleared at the gate. The **ktx-mvdsv-l1-describe-fill arc is a
SEPARATE, STILL-ACTIVE arc** sharing `natural-keys.ts` + the migration
chain + `quality-grid.ts`. The ezQuake help-JSON doc-gap arc is a
SEPARATE sequenced follow-on. FTE/QWCL/MVDSV is a per-fork gated follow-on
(D2/D22), off by default. Post-arc review is arc-reviewer, fresh terminal,
NOT the execution orchestrator -- it runs ONLY after Phase 5 ships + the
`git tag`.
