# Handoff: enforce-L1-runtime-truth arc -- Pass 5 (fresh terminal)

**For:** arc-brainstormer, Pass 5 -- the FINAL brainstorm pass. Fresh
terminal. You are COLD -- read before acting.

## Where things are

Passes 1-4 COMPLETE. The arc is two-track under one North Star: **enforce
L1 to show what is actually present and working at runtime** (L1 both
SHOWS non-working ghosts and HIDES working runtime-built names; both
directions are L1 lying).

- **Track A -- ghost elimination** (L1 shows non-working): libclang
  call-graph reachability. MECHANISM SETTLED (D3-D7).
- **Track B -- hidden recovery** (L1 hides working): model the full
  `HUD_Register` contract -- bare `<name>` + `+hud_<name>`/`-hud_<name>`
  pairs + runtime-built `hud_<name>_<subvar>` settings cvars; new
  `ezquake/_handler_hud.py`, dump-gated conservative. MECHANISM SETTLED
  (D8-D11).
- **Pass 4 -- unified L1 fidelity schema + provenance.** SETTLED
  (D12-D16): two separate provenance fields under one shared three-slot
  spine; sparse + per-version + a THREE-level coverage semantic; Track A
  verdict + feeder-tagged per-variant evidence; Track B Linked
  (element-grouped). The schema is DONE.

**Pass 5 = application + dual acceptance gates.** This is the LAST
brainstorm pass. Scope: how the two mechanisms are APPLIED to produce L1
output, and the dual acceptance contract that GATES it -- (a) Track A:
classify the ghost pools using the call-graph + the commented-register
feeder; (b) Track B: emit the HUD commands+cvars; (c) the combined
known-answer harness (Track A's 3-gate `sb_qtvlist_url` /
`gl_outline_scale_world` / `cl_bobhead` + Track B's anchors incl. the cvar
anchor `hud_radar_opacity`) and the full runtime-dump cross-check; (d) the
gate must implement the D13 three-level consumer split (autonomous-ship
only level-3 dump-confirmed; level-2 is LLM-usable, never auto-shipped).

On Pass-5 close the brainstorm EXITS: produce the three exit deliverables
(final spec committed; parking/pass-status all-COMPLETE; arc-planner
handoff at
`docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-planner-handoff.md`).

## Reads required (cold)

- `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
  -- THE source of truth. North Star, D1 (+ Pass-3 amendment), D3-D7
  (Track A), D8-D11 (Track B), **D12-D16 (Pass 4 schema -- your input
  contract)**, the 5-pass table (Pass 5 NEXT), SHIPPED + spun-out notes.
  Read D13's three-level coverage semantic and D15's feeder-tag closely --
  the Pass-5 gate logic is built on both.
- `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
  -- Pass 1/2/3/**4 COMPLETE** blocks. Pass 4 block lists the Pass-5
  carry-forwards you inherit (incl. the NEW three-level-gate input).
- Memory: `reference_qw_oracle_extraction_liveness_gap`,
  `reference_rigor_bar_follows_consumer`, `project_extraction_pipeline_vision`,
  `feedback_parking_verified_state_is_hypothesis`,
  `feedback_plain_english_at_decision_points`,
  `feedback_every_finding_gets_a_track`, `feedback_be_decisive`.
- LIVE source only if a gate decision turns on a code fact (verify; do NOT
  trust doc line numbers -- hypotheses until re-checked).

## Critical rules

- **Schema is DONE (D12-D16). Pass 5 builds the GATE that READS it.** Do
  not re-open the schema shape. If a gate decision genuinely needs a
  schema change, surface the conflict to the operator for explicit
  amendment (skill rule: no silent relitigation).
- **The D13 three-level coverage semantic IS the acceptance contract's
  spine.** Autonomous published verdict ships only at level-3
  (dump-confirmed). Level-2 (high-confidence-generalized -- every non-HEAD
  ezQuake version) is LLM/MCP-usable but NEVER autonomously shipped. The
  gate enforces this split; it does not re-derive it.
- **Two feeders, two gates (D7.1/D15).** The Track-A genuine-dead list has
  two independent feeders: call-graph "unreachable everywhere compiled"
  (gate: `sb_qtvlist_url`) vs commented-register textual (gate:
  `gl_outline_scale_world`). Different feeders, different Pass-5 gates;
  the feeder tag in the evidence slot routes them. Do not collapse.
- **Per-fork one-time validation is MANDATORY and non-transferable
  (D13/D2).** ezQuake's HEAD validation does not license FTE/QWCL/MVDSV.
  The acceptance contract states this as a per-fork onboarding
  precondition.
- **AST-confirm residuals are NOT Pass-5 brainstorm.** Confirming 0
  non-literal `HUD_Register` first args + literal `HUD_CreateVar` varargs
  pairs is an arc-planner/executor implementation gate (D8/D11). Do not
  re-measure; do not re-run detection.
- Operator is the design + scope gate; one sub-question per turn;
  **plain-English first, mechanics to the spec** (operator flagged "out of
  my ballpark" in Pass 4 on field-shape questions -- keep Pass-5
  sub-questions at acceptance-contract intent level; harness wiring detail
  drains to spec, not the conversation). Be decisive (recommend, don't
  poll). Solo-dev: Claude runs git silently, commits to main, pushes at
  session wrap, no PR ceremony.

## First three actions

1. Read the spec (North Star + D1 amendment + D3-D16 + 5-pass table +
   SHIPPED + spun-out) + parking Pass-1/2/3/4 blocks + named memories. Do
   NOT dispatch anything. Do NOT re-run detection. Do NOT re-open the
   schema.
2. Invoke arc-brainstormer; confirm the 5-pass plan is intact and Pass 5 =
   application + dual acceptance gates, the FINAL pass (spec table is
   source of truth: Pass 4 COMPLETE, Pass 5 NEXT). Open Pass 5.
3. First Pass-5 sub-question: the dual acceptance-contract shape -- how
   Track A's classify-the-pool gate and Track B's emit-the-names gate
   relate under ONE acceptance pass without mechanism blend (D1), and how
   the D13 three-level coverage state drives ship-vs-surface. Plain-English
   the choice; drain harness/wiring detail to the spec.

## When in doubt

The goal is L1 telling the runtime truth, both directions, with provenance
a reader can trust. Pass 4 made the signal STORABLE + PROVENANCED; Pass 5
GATES it -- the known-answer harness validates the mechanism, the
runtime-dump cross-check confirms the HEAD slice, the three-level semantic
governs who consumes what. Conservative always (D3/D8). On Pass-5 close the
brainstorm EXITS to arc-planner. The spec is the source of truth;
parking-doc "verified" line numbers are hypotheses until re-verified
against live source.
