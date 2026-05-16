# KTX / MVDSV Layer-1 describe-fill -- Pass 5 fresh-terminal handoff

**For:** a fresh terminal resuming the arc-brainstormer multi-pass brainstorm
at Pass 5 (the final pass). Created 2026-05-16 at the Pass 4 wrap.

## Where things are

- arc-brainstormer multi-pass brainstorm. Passes 1-4 COMPLETE and committed.
  P1 schema D1-D4; P2 synthesis method D5-D8 + C1/C2 (2026-05-15);
  P3 mechanical-extract pipeline + drift/conflict policy + Phase-0 probe
  bundle D9-D12 + cross-cutting C3, amends D4/D6/D7 (2026-05-16);
  P4 multi-projection data contract + wiki-feed D13-D15 (2026-05-16).
- Single drain doc: `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
  -- holds C1/C2/C3, D1-D15, all amendments, and per-pass closes. Source of
  truth for what is locked.
- Parking doc `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md`
  status line tracks pass progress.
- Pass 5 is the last pass. Five-pass plan unrevised across all four closes.

## Pass 5 scope (from the spec Pass-status table)

**Upstream export (deferrable tail) + lessons-as-constraints + phase sizing +
game-mode-arc relationship.** Pass 5 turns the locked design into something
arc-planner can scaffold, names (does not build) the deferrable upstream
tail, promotes the hard-earned ezQuake/MVDSV lessons into explicit arc
constraints, and settles the dependency relationship with the docketed
game-mode L3 arc. The brainstorm exits when remaining unknowns are
implementation-shaped (arc-planner work), not shape-shaped.

## Reads required (in order, before opening Pass 5)

1. The spec (ALL locked decisions; absorb C1/C2/C3 + D1-D15 + amendments
   cold). Do not relitigate; surface genuine conflicts for explicit
   amendment (arc-brainstormer rule).
2. Arc capture `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md`
   -- the upstream-export / lessons / phase-sizing / game-mode-relationship
   open questions seed Pass 5.
3. D3 (graduation deferred -- the non-boxing hook) and D13 (the internal-tier
   record now IS the concrete upstream evidence package -- Pass 5's
   upstream-export piece has a defined input; it designs the export, not the
   evidence capture).
4. The docketed game-mode L3 arc
   `docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`
   (the dependency-relationship sub-question).
5. The doc-landscape grounding `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`
   (gap-findings + coverage manifest -- phase-sizing inputs; the ezquake.com
   probe is D12 Phase 0, sizes the MVDSV phases).
6. `apps/qw-oracle/API_CONTRACTS.md` (the MCP public-projection contract
   delta carry-forward; phase sizing respects the new-dataset checklist).
7. Memory: `reference_ezquake_dual_doc_model` (comment-promotion-revert +
   two-audience lessons), `feedback_repair_by_reextract_not_sql_update`,
   `feedback_exhaustive_mapping`, `reference_upstream_pr_attribution`
   (Assisted-by, operator signs, never Signed-off-by from AI),
   `project_qw_oracle_source_truth`, `feedback_cheap_probes_inform_expensive_passes`.

## Pass 5 sub-questions (seed -- refine in-pass)

- 5.1 Upstream one-way export: which artifacts (empty GitHub wiki tabs /
  `// comment` PRs / a repo `cvars.md`); attribution discipline (Assisted-by,
  operator signs, never Signed-off-by from AI); how contributed text is
  frozen so re-extraction does not re-import it as native source truth
  (D3's deferred de-dup/self-echo -- name it, do not design the full
  graduation infra; D13 supplies the pitch input).
- 5.2 Which specific ezQuake/MVDSV hard-earned lessons become explicit arc
  constraints (comment-promotion revert / two-audience model /
  repair-via-reextract / exhaustive-mapping / F1 validation grid /
  upstream-PR attribution).
- 5.3 Phase sizing: turn the locked decisions into the phase shape
  arc-planner scaffolds against (KTX-first; D12 Phase 0 probe bundle;
  mechanical-extract; source-synth; MVDSV after the ezquake.com probe;
  staleness/validation; the deferrable upstream tail). Run the exit-criterion
  check: are remaining unknowns implementation-shaped?
- 5.4 Relationship with the docketed game-mode L3 arc: hard dependency (this
  arc fully before that one) vs parallel once KTX L1 cvars/commands land.

## Critical rules

- Operator is a non-coder. Plain-English-first; lead with what changes + the
  recommendation. One question per turn. Be decisive (recommend, do not
  poll). Operator pace beats conservative estimates. Momentum over ceremony.
- ASCII only, no em-dashes, no filler in committed docs.
- arc-brainstormer discipline: open the pass with scope + drain destination
  (the same spec); one sub-question per turn; drain each locked decision
  inline; close with carry-forwards (each with a track) + commit
  `docs(brainstorm): ktx-mvdsv-l1-describe-fill Pass 5 complete -- <scope>`.
- Locked C1/C2/C3 + D1-D15 + amendments are durable. Do not relitigate; a
  genuine conflict is surfaced for explicit amendment.
- Single source of truth + generated projections (locked model): the wiki and
  every consumer are render targets, never hand-edited.

## Pass 5 is the brainstorm exit

Pass 5 is the last pass. At its close, run the arc-brainstormer exit
criterion: if the remaining unknowns are implementation-shaped (planner
scaffold/slicing work) rather than shape-shaped, declare the brainstorm
complete and produce the arc-planner handoff at
`docs/superpowers/parking/2026-05-16-ktx-mvdsv-l1-describe-fill-planner-handoff.md`
(standard shape; Reads = spec + the qw-oracle Arc 1 phase-template exemplar).
If a genuine shape question still remains, name it and size the residual
honestly rather than forcing the exit.

## First three actions

1. Do the Reads (spec first -- absorb the locked state cold).
2. Re-invoke `arc-brainstormer`; confirm Pass 1-4 locked state without
   relitigating; open Pass 5 with a scope statement and drain destination.
3. Pose sub-question 5.1: plain-English-first, decisive recommendation,
   one question.

## When in doubt

The spec's locked decisions win. Single source of truth, generated
projections, no dual maintenance. D3 graduation stays deferred -- Pass 5
names the upstream export and the freeze/de-dup requirement, it does not
build the graduation machinery. If a Pass 5 direction conflicts with a
locked decision, surface it explicitly for amendment -- do not silently
override or silently comply.
