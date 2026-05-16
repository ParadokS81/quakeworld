# KTX / MVDSV Layer-1 describe-fill -- arc-planner fresh-terminal handoff

**For:** a fresh terminal running arc-planner to scaffold this arc. Created
2026-05-16 at the Pass 5 / brainstorm-exit wrap.

## Where things are

- arc-brainstormer multi-pass brainstorm is COMPLETE. All 5 passes locked, the
  exit criterion is MET, no shape question remains. The five-pass plan held
  unrevised across all five closes.
- Single design spec: `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
  -- cross-cutting C1-C5, decisions D1-D18, all amendments, the
  lessons-honored-structurally lineage block, and five pass-closes. This is
  the source of truth for what is locked.
- Arc capture: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md`
  (status now COMPLETE; arc-shape criteria, scope sketch, what-is-NOT-in-scope,
  operator notes).
- The locked phase shape is **D17** -- seven phases (0-6). arc-planner
  scaffolds against it; it does NOT re-derive the shape or the engine order.

## Reads required (in order)

1. The spec. Absorb C1-C5 + D1-D18 + amendments cold. The D17 seven-phase
   shape is the scaffold input; the five pass-closes carry the reasoning and
   the carry-forward tracks.
2. The arc capture parking doc (scope, NOT-in-scope, operator notes -- the
   operator is a non-coder; plain-English-first and ASCII discipline are
   mandatory, not calibration).
3. The qw-oracle Arc 1 six-artifact scaffold exemplar at
   `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -- specifically
   `phase-template.md`, plus `README.md`, `decisions.md`,
   `review-findings.md`, `prerequisites.md`, `handoff-prompt.md`. This is the
   proven scaffold shape to mirror.
4. The doc-landscape grounding
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`
   (`gap-findings.md` + `coverage.ndjson` -- the per-domain N/M denominators
   that size the phases; the Phase 0 ezquake.com probe sizes Phase 4).
5. `apps/qw-oracle/API_CONTRACTS.md` (new-dataset checklist + the MCP
   public-projection contract the projection phases must respect).
6. Memory: `feedback_scaffold_then_fanout_for_multi_phase_plans`,
   `feedback_model_effort_range`, `reference_upstream_pr_attribution`,
   `feedback_repair_by_reextract_not_sql_update`, `feedback_exhaustive_mapping`,
   `project_qw_oracle_source_truth`, `feedback_cheap_probes_inform_expensive_passes`,
   `feedback_arc_sequencing_operator_bandwidth`, `project_arc_workflow_design`.

## Critical rules (locked; do not relitigate)

- C1-C5 + D1-D18 are durable. arc-planner turns them into a plan; it does not
  re-open them. A genuine conflict surfaces for explicit amendment, never a
  silent override or silent comply.
- D17 is the phase shape: seven phases, KTX-first, Phase 0 sizes Phase 4,
  Phase 1 the build-once spine, Phase 6 the deferrable tail that does NOT gate
  arc completion. arc-planner refines per-phase boundaries / verification
  regime / model+effort dials / context-budget slicing -- it does not change
  the shape or the engine order.
- Single source of truth + generated projections. Every consumer (MCP,
  snapshot, wiki feed, dev showcase, audit/review page) is a serializer over
  the one D11 record. Nothing is stored twice; serializer configs (including
  the embedding input and the snapshot.json field list) are NOT schema
  decisions.
- C5 is a phase-boundary gate: a new data shape's F1 probe lands in the same
  phase that first writes that shape.
- C4 is arc-wide: corrupted rows are repaired by re-running the corrected
  pipeline, never a one-off SQL UPDATE.
- The operator is a non-coder and the correctness judge on every row (the D7
  review tail / D15 review page). Plain-English-first; momentum over ceremony;
  one question at a time; be decisive (recommend, do not poll). ASCII only,
  no em-dashes, no filler in committed docs.
- D18: the game-mode L3 arc is sequenced AFTER this arc by an operator
  bandwidth choice. It is NOT a prerequisite, NOT a parallel track, and NOT
  part of this arc's plan.
- D16: the upstream export (Phase 6) is the deferrable tail and the PR-path
  decision is deferred PAST it (owned by the post-pitch dev conversation).
  Do not plan the PR.
- Git: main-tree default, commit-to-main, no PR/worktree ceremony (monorepo
  CLAUDE.md overrides the superpowers finishing/worktree skills).

## First three actions

1. Do the Reads (spec first -- absorb C1-C5 + D1-D18 + the D17 phase shape
   cold; do not re-derive the shape).
2. Invoke `arc-planner`; confirm the locked state without relitigating; build
   the six-artifact scaffold (decisions / review-findings / prerequisites /
   phase-template / handoff-prompt / README) at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`, mirroring
   the qw-oracle Arc 1 exemplar.
3. Run the slicing analysis on the D17 seven-phase shape (per-phase
   verification regime + context budget + per-task execution-mode/model/effort),
   then draft per-phase MDs in fresh terminals with sub-agent verification
   per `feedback_scaffold_then_fanout_for_multi_phase_plans`.

## When in doubt

The spec's locked decisions win. The phase shape is D17 -- do not re-derive
it. Single source of truth, generated projections, no dual maintenance. The
upstream export is the deferrable tail and the PR-path is deferred past it --
do not plan a PR. If a planning direction conflicts with a locked decision,
surface it explicitly for amendment; do not silently override and do not
silently comply.
