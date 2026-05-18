# Resume: enforce-L1-runtime-truth EXECUTION orchestrator -- s6 -> s7

**For:** arc-orchestrator, FRESH terminal, EXECUTION mode (NOT drafting; NOT
arc-reviewer). **The unit of work is Phase 5 -- the LAST phase.** Phases 1-4
SHIPPED.

> **This doc is deliberately the LEAN 1-page-contract shape (operator
> decision 2026-05-18).** Prior orchestrator resumes mandated "read the
> whole scaffold IN FULL cold" and burned ~250k before the first action.
> The drift-catching safety property is the **LIVE cheap-verify** (git /
> SQL / grep), NOT the prose re-read -- F9/F15/F17 were all caught by a
> live probe, never by reading decisions.md cover-to-cover. So: read THIS
> contract, run the cheap-verify, and open scaffold sections **on demand**
> when a step needs them. The provenance / path-narrative lives in git +
> `apps/qw-oracle/docs/arc-history.md` + `review-findings.md` -- read it
> ONLY if a gate fails or is disputed. Worker/parking/"verified" lines
> (this doc included) are HYPOTHESES until LIVE-re-verified.

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Repo root = `/home/paradoks/projects/quakeworld`. SELF-CHECK -- wrong arc if
you see "describe-fill" / KTX man-pages (the SEPARATE still-active
ktx-mvdsv arc) or "Postgres port / 31-table" (qw-oracle-arc1). HALT if so.

## The unit -- Phase 5 (the last phase)

`phase-5-application-outputs.md`: D20 Track-A two outputs (always-on
per-version L1 signal over the 74cmd/92cvar pool + the level-3-only
autonomous delete-list REGENERATING
`apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md` R4
byte-shape) + D21 Track-B recovered commands first-class + the F1
application-boundary probes. Dispatch a fresh arc-executor terminal;
independently gate its HALT (the Phase-3 3-way method); at GREEN -> scoped
two-commit ship + `git tag -a arc-enforce-l1-runtime-truth-shipped` + write
the POST-ARC handoff routing to **arc-reviewer** (a DIFFERENT skill, fresh
terminal, structurally NOT the execution orchestrator).

## Delta since the last checkpoint (trust nothing -- cheap-verify below)

- **Phase 4 SHIPPED** -- RE-VERIFY orchestrator-independently-re-gated GREEN
  (s6). **F15 RESOLVED** (`59d34786`). **F17 surfaced -> tracked
  NON-Phase-5-blocking** (review-findings F17 + HANDOVER small-followup): a
  pre-existing Phase-3-loader fail-safe-completeness gap on the
  toggle-off/RED path; the autonomous level-3 tier is provably protected;
  Phase 5 runs the pipeline GREEN so F17 does not touch its correctness.
- **DB:** dev `qw_oracle` clean idempotent GREEN at pin `3f9e724f`
  (624/7/62 / 693; level-3 = Track-A {gl_outline_scale_world,
  sb_qtvlist_url} + Track-B 129). `qw_oracle_test` whole (15 migrations).

## The P4->P5 consumed contract (Phase 5 CONSUMES; gate for drift)

All independently verified GREEN at the s6 gate: `extractor_lib/
_acceptance.py route_by_level` (pure/total -- dump-confirmed ->
autonomous-eligible / high-confidence-generalized -> assistant-only / None
-> no-signal); `ezquake/accept-runtime-truth.py` GREEN at `3f9e724f`;
`data/detection/level3-stamp-set-3f9e724f.json` (proxy:PASS, Track-A 2,
Track-B 129); loader stamped `dump_confirmation=dump-confirmed` for exactly
the dump-confirmed pool/HUD rows, level-2 elsewhere; conclusion+evidence
byte-identical (CARRY-FORWARD 1); F1 level-3-pinned-only. Phase-5 "Inputs
from previous phase" must mirror this verbatim -- if it drifts, STOP.

## Rails (cumulative -- all bind)

- Worker GREEN is a HYPOTHESIS -- independently re-gate decisive legs
  yourself (`feedback_verify_dispatched_terminal_claims`).
- **F8 shared-substrate:** ktx-mvdsv is a STILL-ACTIVE sibling arc on
  `natural-keys.ts` / `quality-grid.ts` / the migration chain. Post-Phase-5
  re-run the all-project F1 grid; `ktx_sentinel` must stay `1828`; NEVER
  `git add -A`; NEVER touch ktx-mvdsv files.
- **F13-INVERSE:** 624/7/62 is the CORRECT floor; never recalibrate.
- **X9** repair by re-extract never in-place SQL UPDATE. **X10** ASCII.
  Scoped `git add` only; two-commit pattern (ship/record, then a tiny
  README/arc-history flip referencing the SHA); end commit messages
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`; push is the
  operator's call (main is many commits ahead of origin).
- **F17 is NON-Phase-5-blocking** and is its OWN scoped follow-up -- do NOT
  fold it into Phase 5.
- Phase 5 is the LAST phase: at ship -> `git tag` + POST-ARC handoff to
  arc-reviewer (fresh terminal, structurally NOT the orchestrator).

## Cheap-verify on resume (the LIVE drift-catch -- THIS is the safety mechanism, ~6 commands)

- Pin both legs: `git -C research/repos/ezquake-source rev-parse HEAD` +
  `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc
  "SELECT value FROM oracle_meta WHERE key='ezquake:source_repo_commit';"`
  == `3f9e724fa608e516040f02b9557808ff3efda53e` (both).
- dev ezquake F1: `npm run load-knowledge -- quality-grid --project
  ezquake` -> `command_source_state` 624/7/62, `cross_type_orphans` 0,
  `command_count` 693, `runtime_fidelity_shape` + `jsonb_columns_not_strings`
  PASS, 0 regression failures.
- level-3: `cvar_versions` dump-confirmed == 2; `command_versions`
  track_b_hud_recovery dump-confirmed == 129.
- `SELECT count(*) FROM entities WHERE project='ktx'` == `1828`.
- README Phase-4 row == `shipped`; review-findings F15 RESOLVED + F17
  OPEN-tracked; `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
  exists (the R4 byte-shape target).
If any diverges, STOP -- the parking "shipped" state is a hypothesis.

## Read ON DEMAND (do NOT eagerly read the whole scaffold)

- Scoping/gating Phase 5 -> `phase-5-application-outputs.md` IN FULL (the
  ONE eager read -- it is THIS session's executor contract) +
  `phase-template.md` (the executor shape). Confirm its "Inputs from
  previous phase" mirrors the P4->P5 contract above.
- Gating R4 -> the live `ezquake-runtime-dead-entities.md` + Phase-5 Recon.
- A finding/dispute -> `review-findings.md` (the F-row) + the specific
  `decisions.md` D in question (do NOT re-open a D). decisions.md /
  Phase-1-3 MDs only when a specific locked contract is in question.
- Memory: the `MEMORY.md` one-liners suffice; open a file only if it is
  load-bearing for a specific decision (`feedback_verify_dispatched_
  terminal_claims`, `feedback_cross_phase_audit_shared_file_drift` /F8,
  `feedback_idempotency_before_staleness`, `reference_runtime_dump_self_
  certifies_commit` /F7, `feedback_operator_not_technical_review_gate`,
  `feedback_orchestrator_terminal_pattern`).

## First three actions

1. Run the ~6 LIVE cheap-verify commands. Divergence -> STOP.
2. Read `phase-5-application-outputs.md` IN FULL; confirm its Inputs mirror
   the P4->P5 contract; scope the Phase-5 executor prompt (the 3 tasks +
   the R4 byte-shape gate + the F1 application probes + F8 all-project).
3. Dispatch a fresh arc-executor terminal for Phase 5; receive the
   structured HALT; independently gate the decisive legs (R4 byte-shape
   regen vs the in-repo artifact, the level-3-only delete-list filter, the
   F1 application probes, the F8 all-project grid + ktx_sentinel 1828); at
   GREEN -> scoped two-commit ship + `git tag -a
   arc-enforce-l1-runtime-truth-shipped` + the POST-ARC arc-reviewer
   handoff. Re-project budget; a fresh orchestrator terminal for the gate
   is fine if >350k.

## When in doubt

North Star is MET at the END of Phase 5 (L1 tells the runtime truth both
directions for ezQuake). The spec + 5 MDs are LOCKED. F17 is tracked
NON-blocking (its own future scoped fix-cycle, never folded). ktx-mvdsv is
a SEPARATE still-active arc (F8 binds). The ezQuake help-JSON doc-gap arc +
FTE/QWCL/MVDSV are sequenced follow-ons (D2/D22), off by default. Post-arc
review is arc-reviewer, fresh terminal, ONLY after Phase 5 ships + the
`git tag`.
