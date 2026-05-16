# KTX / MVDSV Layer-1 describe-fill -- Pass 3 fresh-terminal handoff

**For:** a fresh terminal resuming the arc-brainstormer multi-pass brainstorm
at Pass 3. Created 2026-05-15 at the Pass 2 wrap.

## Where things are

- arc-brainstormer multi-pass brainstorm. Passes 1-2 COMPLETE and committed
  (`c8462e2b` P1, `662bfdf4` P2, `9dd7b918` D5-amendment).
- Single drain doc: `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-
  fill-design.md` -- holds D1-D8, the D5 amendment, and cross-cutting
  constraints C1/C2. This is the source of truth for what is locked.
- Parking doc `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-
  fill.md` status line tracks pass progress.
- Passes 3-5 pending. The five-pass plan is unrevised. Pass 5's
  upstream-export piece is the deferrable tail (operator steer + D3).

## Reads required (in order, before opening Pass 3)

1. The spec `2026-05-15-ktx-mvdsv-l1-describe-fill-design.md` -- ALL locked
   decisions. Do not relitigate; if a Pass 3 question genuinely conflicts,
   surface it for explicit amendment (arc-brainstormer rule).
2. Arc capture `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-
   fill.md` -- locked conceptual model + open questions. Pass 3 owns open
   questions #4 (mechanical-extract pipeline + nQuake-vs-in-repo drift) and #5
   (ezquake.com probe disposition).
3. `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-1-ktx-
   in-repo.md` and `probe-3-nquake-distfiles.md` -- the concrete shipped-config
   evidence and the real nQuake-vs-in-repo conflicts (sv_maxrate 50000/500000,
   k_exclusive 0/1, k_exttime 3/5, maxclients 32/8, maxspectators 12/4, fpd
   206/222, sv_reliable_sound 1/0, k_noframechecks polarity-label inversion,
   sv_antilag in-repo-only as an intentional omission). Then `gap-findings.md`
   threads #1 (ezquake.com quantification -- gates MVDSV-cvar sizing) and #2
   (one-line `load-commands.ts` fix -- free 28/108 MVDSV commands) and
   `coverage.ndjson` for per-source counts.
4. Memory: `feedback_cheap_probes_inform_expensive_passes`,
   `feedback_exhaustive_mapping`, `project_qw_oracle_source_truth`,
   `reference_ezquake_dual_doc_model`,
   `feedback_repair_by_reextract_not_sql_update`.

## Critical rules

- Operator is a non-coder. Plain-English-first at every decision point; lead
  with what changes + the recommendation. One question per turn. Be decisive
  (recommend, do not poll). Operator pace beats conservative estimates.
- ASCII only, no em-dashes, no filler in committed docs.
- arc-brainstormer discipline: open the pass with scope + drain destination;
  one sub-question per turn; drain each locked decision into the spec inline;
  close the pass with carry-forwards (each with a track) + a commit
  `docs(brainstorm): ktx-mvdsv-l1-describe-fill Pass 3 complete -- <scope>`.
- Locked D1-D8 + D5-amendment + C1/C2 are durable. Do not relitigate.
- **C2 is the load-bearing Pass 3 input:** clear discrepancies are flagged for
  manual operator review, NEVER auto-resolved. Pass 3 designs the concrete
  flagging mechanism on top of C2.
- **C1:** completeness is non-negotiable; "undocumented" is never assumed
  "unimportant"; "has a comment" is never assumed "covered" (D5 amendment).
- Source is ground truth (source-truth dichotomy). Repair via re-extract, not
  SQL UPDATE; extractors are idempotent.

## Pass 3 sub-questions (seed -- refine in-pass)

- 3.1 The mechanical extractor for shipped-config enum tables -> structured
  `{value,label}` + default + type + range: parser shape, what it emits, how
  it plugs into the existing extractor/loader pipeline.
- 3.2 nQuake-vs-in-repo drift/conflict policy on top of C2: source-wins-on-
  behavior, config-opinion -> L3, per-source provenance first-class, and the
  concrete discrepancy-flagging mechanism into the D4 walk-time report.
- 3.3 Exact shipped-file origin tag label + the file-provenance field
  (carry-forward from D2).
- 3.4 ezquake.com quantification probe disposition: arc Phase 0 vs pre-arc
  sidequest that gates only MVDSV-cvar sizing (gap-findings thread #1); plus
  sequencing of the free MVDSV-commands loader fix (thread #2).

## First three actions

1. Do the Reads (spec first -- absorb the locked state cold).
2. Re-invoke the `arc-brainstormer` skill; confirm Pass 1-2 locked state
   without relitigating; open Pass 3 with a scope statement and drain
   destination (the same spec).
3. Pose sub-question 3.1: plain-English-first, decisive recommendation, one
   question.

## When in doubt

The spec's locked decisions + C1/C2 win. Source is ground truth. Never
auto-resolve a discrepancy (C2). Never presume a comment-bearing entity is
covered (D5 amendment). If a Pass 3 direction appears to conflict with a
locked decision, surface the conflict explicitly to the operator for
amendment -- do not silently override and do not silently comply.
