# Resume: enforce-L1-runtime-truth EXECUTION orchestrator -- session 5 -> session 6

**For:** arc-orchestrator, FRESH terminal, EXECUTION mode (NOT drafting;
NOT arc-reviewer). **The next unit of work is the Phase-4 RE-VERIFY --
NOT Phase 5.** Session 5 received the F15-fix executor halt (commit
`59d34786`), independently 3-way re-gated it GREEN (scope/X9 + F8
all-project F1 + a self-run 3x `extract-tag --force` byte-identical
re-load idempotency proof), captured the cross-phase memory
(review-findings F15 -> FIX-SHIPPED+RE-GATED, new F16 orphan-warning
ADVISORY), and handed off at THIS clean checkpoint boundary -- F15 fix
verified GREEN, BEFORE the heavy Phase-4 RE-VERIFY -- rather than fold a
multi-hour pipeline-heavy boundary into a smell-zone session (the s4
operator-blessed pattern; "it worked"). You are COLD -- read before
acting. This doc's "F15 re-gated GREEN" is itself a HYPOTHESIS
(`feedback_parking_verified_state_is_hypothesis` binds the orchestrator's
own prior-session writeup) -- cheap-re-verify it before dispatching the
RE-VERIFY worker. You do NOT run the Phase-4 RE-VERIFY's heavy checks
yourself; you dispatch a WORKER terminal, then independently gate its
halt (the Phase-3 3-way method).

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Model: draft-then-execute, 5 phases, fully SEQUENTIAL. README phase index
authoritative. All 5 MDs APPROVED; pre-execution cross-phase audit RAN +
CLEARED (F8). EXECUTION underway.

Status:
- **Phases 1-3: SHIPPED** (`51604f67` / `3c136826`+`b23f96eb` /
  `895817bb`+`8ed860fe`).
- **Phase 4: CHECKPOINT `702421a1`** -- acceptance contract code-complete
  + s4-orchestrator-boundary-verified GREEN. NOT yet flipped to `shipped`
  (awaiting the Phase-4 RE-VERIFY on the clean idempotent DB).
- **F15 (the Phase-5 blocker): FIX SHIPPED `59d34786` + s5-orchestrator-
  INDEPENDENTLY-RE-GATED GREEN.** One file (`load-hud-commands.ts`
  +28/-1): `upsertHudCommandRow` now `setEntitySourceState(id,
  'source_backed')` on the existing-entity path (the established
  `upsertEntity`-then-`setEntitySourceState` pattern from
  `load-version.ts`). Mechanism (executor-diagnosed, orchestrator-
  confirmed): a period-2 oscillation -- per-type loader nulls the
  help-JSON twin's `command_versions.source_file` on a re-load ->
  `load-version.ts` retreat-block demotes `source_backed -> doc_only` at
  head -> Track-B (3e, after step-3) could not re-assert (D21 owner).
  Fix is project-private / ezQuake-only / Track-B-only -- ZERO contact
  with the F8-shared `natural-keys.ts` / retreat / prune /
  `quality-grid.ts`; no migration; no D-amendment; F13 floor UNCHANGED
  (F15 is F13-inverse -- do NOT recalibrate).
- **F16: ADVISORY, non-blocking.** The F15 re-gate's re-loads emit
  ~117/run loud `[load-version] fully-orphaned entity` command warnings
  -- adjudicated a benign transient intra-run artifact (step-3
  retreat-scan runs before Track-B 3e creates those rows; final-state
  real orphans = 0; `F1.entity_has_version_rows` + `F1.cross_type_orphans`
  PASS; NOT F15-caused -- emitted by untouched `load-version.ts`). Routed
  HANDOVER log-hygiene small-followup; its own scoped change with the
  all-project F1 gate, NEVER folded into anything (F8-shared
  `load-version.ts`).
- **Phase 5: NOT started. BLOCKED until the Phase-4 RE-VERIFY passes.**

Commit position: `59d34786` (F15 fix) -> ktx-mvdsv describe-fill commits
(SEPARATE active arc) -> the s5 scoped scaffold/handoff commit. Working
tree carries pre-existing SESSION-START drift (`.claude/settings.json`,
slipgate `fte-asset-bundle.json`, various `docs/superpowers/**`,
untracked extractor-output JSONs, `qw-oracle.db`, `.lock`) -- NOT this
arc's, NOT the s5 work; do NOT sweep it; NEVER `git add -A`.

## The F15 re-gate evidence (HYPOTHESIS -- cheap-re-verify before trusting)

s5's 3-way independent re-gate (the Phase-3 method; NOT the executor's
word). Re-verify cheaply (~4 commands) before dispatching the worker:
- `git show 59d34786 --stat` -> exactly `load-hud-commands.ts | 29 +-`
  (one file; if more files, STOP -- not the verified fix).
- `git log --oneline | grep 59d34786` present.
- dev DB ezquake/command crosstab == `{source_backed:624, doc_only:7,
  source_retired:62}` (693) AND the 12 (`radar, bar_armor, bar_health,
  itemsclock, netproblem, score_difference, score_enemy, score_position,
  speed, speed2, teamholdbar, teamholdinfo`) all `source_backed` AND the
  7 legit doc_only (`gl_checkmodels, gl_inferno, gl_setmode,
  in_evdevlist, legacyquake, mp3_volume, validate_clients`) unchanged.
- pin BOTH legs `3f9e724fa608e516040f02b9557808ff3efda53e`
  (`git -C research/repos/ezquake-source rev-parse HEAD` + `oracle_meta
  ezquake:source_repo_commit`).
- review-findings F15 row == FIX-SHIPPED+RE-GATED; F16 present.
The s5 idempotency proof log (transient, /tmp -- may be gone) was
`/tmp/f15-idempotency-proof.log`: RUN_0..RUN_3 byte-identical 624/7/62,
ktx_sentinel 1828 constant. Re-run it yourself if not satisfied (it is
the F15 fix's contract -- but the dev DB already carries the converged
state, so the cheap crosstab check is the primary signal).

## PREREQ -- qw_oracle_test full reset (s5 broke it; throwaway, dev-safe)

s5 ran `bun db/migrate.ts --reset` against `qw_oracle_test` for an
idempotency proof; `migrate.ts resetDb` drops ONLY `public`, but
`qw_oracle_test` ALSO has a `community` schema (migration `008`) that
survived -> re-applying `008` threw `relation "players" already exists`
-> the test DB is half-migrated (0 entities). **Dev `qw_oracle` was
NEVER touched (s5 verified: 10905 entities, ezq cmd 693, ktx 1828, pin
`3f9e724f`).** The Phase-4 RE-VERIFY check 8 (`bun test
scripts/load-knowledge/quality-grid.test.ts` against the
`qw_oracle_test` DB) needs it whole. Exact fix (VERIFY the target is
`qw_oracle_test`, NOT `qw_oracle`):
```
docker compose -f db/docker-compose.dev.yml exec -T postgres \
  psql -U qworacle -d qw_oracle_test -c \
  "DROP SCHEMA IF EXISTS community CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun db/migrate.ts
```
`rm -rf` is harness-blocked; this is the DROP SCHEMA shape (not `rm`).
This is RE-VERIFY prep -- the fresh orchestrator does it (or has the
worker do it as step 0 of the RE-VERIFY).

## The next unit -- Phase-4 RE-VERIFY (the 9 boundary checks)

From the Phase-4 MD `## Verification (phase boundary)` (the authoritative
contract -- read it IN FULL; the F12+F14 dated block fixes the literals:
`extract-tag` not `load-version`; canonical `qw_oracle_test`-DB `bun
test`; `extract-tag.ts` not `load-version.ts`):
1. Pin re-confirmed (git HEAD + oracle_meta both `3f9e724f`).
2. R6 version-pin proxy GREEN at pin + trips on a broken pin;
   `front1-diff.sh` byte-unmodified.
3. Harness GREEN at HEAD: `accept-runtime-truth.py --stage all` -> STAGE
   1/2/3 GREEN exit=0; `acceptance-validated-ezquake.json` status:GREEN
   commit `3f9e724f`; `level3-stamp-set-3f9e724f.json` proxy:PASS +
   non-empty lists. **(~540s -- the leg s4 could not finish in-budget;
   the RE-VERIFY MUST land it.)**
4. Deliberately-failed probe -> LOUD fallback, NO signal (D18
   all-or-nothing).
5. Deliberately-broken pin -> ZERO level-3 (D19 hard sub-gate).
6. Slot-3 ONLY -- conclusion/evidence byte-identical to the Phase-3
   write (CARRY-FORWARD 1).
7. Toggle-off == today's pipeline byte-for-byte (X3/X4; 8 F6 stems +
   signal count 0).
8. **F1 GREEN incl. level-3-pinned-only + the 3 F15-family FAILs now
   CLEARED:** `F1.ezquake.floor.command_source_state` 624/7/62,
   `F1.ezquake.anchor.doc_only_count` 57, `F1.cross_type_orphans` 0;
   PLUS Phase-4's own `F1.runtime_fidelity_shape` (incl.
   level-3-pinned-only) + `F1.jsonb_columns_not_strings` GREEN +
   `command_count` 693. (s5 already saw the dev DB at this state -- the
   RE-VERIFY confirms it on the full clean boundary, not just a spot
   crosstab.)
9. X9 write-path -- no bare `UPDATE <versions-table> SET` in
   `load-callgraph-reachability.ts` / `load-hud-commands.ts` /
   `extract-tag.ts`; stamp routes the `upsert{Cvar,Command}Version` ON
   CONFLICT path.
ALL 9 PASS -> Phase 4 truly ships: flip README Phase-4 row + arc-history
Phase-4 entry -> `shipped` (the two-commit pattern: a ship/flip commit;
reference `702421a1`+`59d34786`), F15 fully RESOLVED in review-findings,
THEN Phase 5 unblocks.

## Topology (operator-confirmed s5)

Fresh orchestrator (you) -> cold-read + cheap-re-verify F15 GREEN ->
qw_oracle_test reset -> **dispatch a FRESH WORKER terminal** with a
scoped Phase-4-RE-VERIFY prompt (the 9 checks; structured HALT carrying
the ACTUAL per-check output: the `--stage all` banner + exit, the
broken-pin/failed-probe/toggle-off counts, the F1 grid Summary + the 3
F15-family probe literals 624/7/62 / 57 / 0 + Phase-4's own probes, the
X9 grep) -- NOT "all pass". Receive the halt; **independently GATE it**
(the Phase-3 3-way method -- re-run the decisive legs YOURSELF: at
minimum the ezquake F1 grid, the harness GREEN banner + exit, the X9
grep, the pin; the worker's GREEN is a hypothesis). Only then flip Phase
4 -> shipped + prep Phase 5. Re-project YOUR budget after the RE-VERIFY
gate; hand off again if >350k.

## Reads required (cold, in order)

1. Scaffold per README "read in this order": `prerequisites.md`,
   `decisions.md` (D1-D22 + D5/D7/D11 AMENDMENTS + X1-X10 + non-goals --
   do NOT re-open a D), `review-findings.md` (**F15 FIX-SHIPPED+RE-GATED
   + F16 ADVISORY the freshest**; F7 the Phase-4 load-bearing rule; F8
   the cross-arc standing rule; F12/F13/F14 RESOLVED -- do NOT
   re-litigate), `phase-template.md`, `README.md` (Phase 1-3 `shipped`,
   Phase 4 `CHECKPOINT ... BLOCKED on F15`, Phase 5 pending -- the README
   Phase-4 row still says CHECKPOINT; the RE-VERIFY flips it).
2. **The Phase-4 MD IN FULL** (`phase-4-acceptance-contract.md`) -- the
   RE-VERIFY contract: the F12+F14 dated block, the 9 `## Verification`
   checks, the F15 dated scoping note in Verification 8, `## Recovery`,
   `## Outputs to next phase` (the P4->P5 contract Phase 5 consumes).
   Then the **Phase-5 MD** (`phase-5-application-outputs.md`) -- the
   cross-phase footprint you gate for drift (CONSUMES `route_by_level` +
   the stamped `dump_confirmation` + the Track-B command pool F15
   stabilized). P1/P2/P3 SHIPPED contracts as needed.
3. The spec (D-rationale; decisions.md is the distilled contract).
4. The handoff chain (cumulative critical rules): s1->s2, s2->s3,
   s3->s4, s4->s5, and THIS doc (s5->s6, freshest).
5. Memory: `feedback_idempotency_before_staleness` (F15/F16 lens),
   `feedback_repair_by_reextract_not_sql_update` (X9),
   `feedback_cross_phase_audit_shared_file_drift` / F8 (natural-keys.ts
   + load-version.ts shared with the STILL-ACTIVE ktx-mvdsv arc),
   `feedback_verify_dispatched_terminal_claims` (THE core duty -- the
   RE-VERIFY worker's GREEN is a hypothesis),
   `feedback_parking_verified_state_is_hypothesis` (THIS doc's F15-GREEN
   included), `reference_runtime_dump_self_certifies_commit` (F7 -- binds
   the RE-VERIFY harness), `reference_qw_oracle_floor_vs_clean_reload`
   (F13/F15 family -- F15 is the INVERSE, do NOT recalibrate),
   `feedback_operator_not_technical_review_gate`,
   `feedback_model_effort_range`, `feedback_no_subagents_for_mechanical_
   edits`, `feedback_orchestrator_terminal_pattern`,
   `reference_destructive_rm_harness_gate`.
6. `arc-planner/references/arc-phase-archetypes.md` -- the Phase-4
   RE-VERIFY is the acceptance/gate archetype OPERATOR-RUN floor (the 9
   boundary checks; CI-only is insufficient). Phase 5 = MIXED ->
   OPERATOR-RUN higher floor (carried for when you reach it).

## Critical rules (cumulative -- carry into the RE-VERIFY + Phase 5)

- **The RE-VERIFY worker's GREEN is a HYPOTHESIS.** Independently re-run
  the decisive legs yourself (the Phase-3 3-way method;
  `feedback_verify_dispatched_terminal_claims`). A worker "all 9 PASS"
  without the actual per-check outputs is not shippable -- bounce it.
- **F13-INVERSE: do NOT recalibrate the floor.** 624/7/62 is the CORRECT
  expectation; the F15 fix makes a re-load reproduce it (independently
  proven). Changing the snapshot to 612/19 is explicitly REJECTED.
- **F8 / shared-substrate.** `natural-keys.ts` + `load-version.ts` are
  the source_state machine ALL Layer-1 entities + the STILL-ACTIVE
  ktx-mvdsv describe-fill arc flow through. The F15 fix was correctly
  scoped to `load-hud-commands.ts` ONLY. The ktx 2 `log_template`-floor
  FAILs (1196 vs 1195) are the ktx-mvdsv arc's OWN calibration drift
  (`reference_qw_oracle_floor_vs_clean_reload`), NOT enforce-L1's, NOT
  F15-caused -- do NOT fix them here, do NOT touch ktx-mvdsv files,
  NEVER `git add -A`. F16's log-hygiene change (if ever done) is its own
  scoped change with the all-project F1 gate, NEVER folded.
- **rm -rf harness-blocked.** Use DROP SCHEMA / drop+migrate / mktemp.
- **Commit cadence:** scoped `git add` of ONLY this arc's scaffold /
  shipped files, EVERY commit; NEVER `git add -A` (pre-existing
  session-start drift is in the tree). Two-commit pattern (ship/flip;
  then the tiny README/arc-history flip referencing the SHA). End commit
  messages `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
  Push is the operator's call at wrap (main is many commits ahead of
  origin -- surface it, do NOT auto-push).
- **Phase 5 is the LAST phase.** It CONSUMES `route_by_level` + the
  stamped `dump_confirmation` + the Track-B command pool. At Phase-5
  SHIP: scoped commit + `git tag -a arc-enforce-l1-runtime-truth-shipped`,
  then the POST-ARC handoff routes to **arc-reviewer** (DIFFERENT skill,
  fresh terminal -- structurally NOT the execution orchestrator).
- **ASCII / output discipline (X10)** in all shipped docs + code.

## First three actions

1. Cold-read the scaffold + the Phase-4 MD IN FULL + Phase-5 MD + the
   handoff chain + the named memory. Cheap-re-verify the F15 GREEN (the
   ~5 commands in "The F15 re-gate evidence" above): `git show 59d34786
   --stat` = 1 file; dev crosstab 624/7/62 + the 12 source_backed + the
   7 legit; pin both legs `3f9e724f`; `59d34786` in `git log`;
   review-findings F15 FIX-SHIPPED+RE-GATED + F16 present. Confirm README
   Phase-4 still `CHECKPOINT`, Phase 5 pending. Do NOT re-open design; do
   NOT recalibrate the floor.
2. qw_oracle_test full reset (the exact both-schema command above --
   VERIFY target is `qw_oracle_test`, NOT `qw_oracle`; dev is verified
   intact and must stay so).
3. Scope + dispatch a FRESH WORKER terminal for the Phase-4 RE-VERIFY
   (the 9 checks from the Phase-4 MD Verification section; HALT
   structured with the ACTUAL per-check outputs -- the `--stage all`
   banner+exit, the broken-pin/failed-probe/toggle-off counts, the F1
   Summary + the 3 F15-family probe literals 624/7/62 / 57 / 0 +
   Phase-4's own probes, the X9 grep -- NOT "all pass"). Receive the
   halt; independently GATE it (re-run the decisive legs yourself). Only
   then: flip README Phase-4 + arc-history -> `shipped` (two-commit),
   mark F15 fully RESOLVED, prep Phase 5. Re-project budget after the
   gate; hand off again at a clean boundary if >350k.

## When in doubt

North Star: L1 tells the runtime truth both directions for ezQuake,
provenance a reader can trust; met at the END of Phase 5. The spec is
source-of-truth; the 5 MDs are LOCKED contracts (carrying the
F9/F10/F12/F13/F14 dated corrections + the F15 scoping note + now F15
FIX-SHIPPED + the F16 ADVISORY). Parking / "verified" / prior-session /
executor / worker lines are HYPOTHESES until re-verified vs LIVE (THIS
doc's F15-GREEN INCLUDED -- cheap-re-verify it). F15 is **F13-INVERSE**:
fix the loader (DONE -- `59d34786`, s5-independently-re-gated GREEN), do
NOT recalibrate the snapshot. The remaining gate is the Phase-4
RE-VERIFY (a full orchestrator-gated boundary, NOT a rubber-stamp) on the
clean idempotent DB -- worker runs it, you independently gate it. The
**ktx-mvdsv-l1-describe-fill arc is a SEPARATE, STILL-ACTIVE arc**
sharing `natural-keys.ts` + `load-version.ts` + the migration chain +
`quality-grid.ts`; its 2 ktx `log_template`-floor FAILs are ITS
recalibration, not enforce-L1's. The ezQuake help-JSON doc-gap arc is a
SEPARATE sequenced follow-on. FTE/QWCL/MVDSV is a per-fork gated
follow-on (D2/D22), off by default. Post-arc review is arc-reviewer,
fresh terminal, NOT the execution orchestrator -- ONLY after Phase 5
ships + the `git tag`.
