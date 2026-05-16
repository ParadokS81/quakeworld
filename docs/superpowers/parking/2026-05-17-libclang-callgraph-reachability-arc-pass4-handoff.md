# Handoff: enforce-L1-runtime-truth arc -- Pass 4 (fresh terminal)

**For:** arc-brainstormer, Pass 4. Fresh terminal. You are COLD -- read
before acting.

## Where things are

Passes 1-3 COMPLETE. The arc is two-track under one North Star: **enforce L1
to show what is actually present and working** (it both SHOWS non-working
ghosts and HIDES working runtime-built names; both directions are L1 lying).

- **Track A -- ghost elimination** (L1 shows non-working): libclang
  call-graph reachability. MECHANISM SETTLED (D3-D7).
- **Track B -- hidden recovery** (L1 hides working): model the
  `HUD_Register` contract. MECHANISM SETTLED (D8-D11). Pass 3 RESOLVED the
  literal-tail by measurement (83/83 literal, 0 tail) and **WIDENED Track B
  (D11)** from commands-only to the full contract: bare `<name>` commands +
  `+hud_<name>`/`-hud_<name>` pairs + the runtime-built
  `hud_<name>_<subvar>` settings cvars. New dedicated
  `ezquake/_handler_hud.py`, dump-gated conservative.
- Shared foundation (command case-fold): CLOSED BY MEASUREMENT (mini-arc
  `8093e42f`); not a pass concern.

**Pass 4 = unified L1 fidelity schema + provenance.** One signal model
covering BOTH tracks: Track A's per-entity ghost verdict (reachable /
genuine-dead / build-excluded, two independent feeders per D7.1) AND Track
B's recovered-hidden provenance across THREE HUD families (bare command /
`+-` pair / `hud_*` cvar). Pass 2/3 deferred signal representation here
explicitly (D7.3).

## Reads required (cold)

- `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
  -- THE source of truth. North Star, D1 (+ Pass-3 amendment), D3-D7
  (Track A), **D8-D11 (Track B)**, the 5-pass table (Pass 4 NEXT), the
  SHIPPED section, the "Spun-out mini-arc" note. Read D7.1 (two genuine-dead
  feeders -- provenance MUST distinguish) and D7.3 (signal repr = Pass 4 =
  your scope).
- `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
  -- Pass 1/2/**3 COMPLETE** blocks. Pass 3 block lists the D8-D11 drains +
  carry-forwards you inherit.
- Memory: `reference_qw_oracle_extraction_liveness_gap`,
  `reference_rigor_bar_follows_consumer`, `project_extraction_pipeline_vision`,
  `feedback_parking_verified_state_is_hypothesis`,
  `feedback_plain_english_at_decision_points`,
  `feedback_every_finding_gets_a_track`.
- LIVE source only if a schema decision turns on a code fact (verify, do NOT
  trust doc line numbers -- they are hypotheses until re-checked).

## Critical rules

- **Name-case representation is NOT Pass 4.** The spec's original Pass-4
  "L1 source-case" carry-forward was SUPERSEDED -- spun out + SHIPPED as the
  entity-name case-fidelity mini-arc (`8093e42f`). Pass 4 scope is the
  `runtime_reachable` / recovered-hidden signal schema + provenance ONLY. Do
  not re-open name-case.
- **Provenance must distinguish the two genuine-dead feeders (D7.1):**
  call-graph "unreachable everywhere compiled" vs commented-register
  textual. Different feeders, different Pass-5 gates. The schema carries
  that distinction.
- **Track B is three families (D11), not one.** The signal model must
  represent bare command / `+-` pair / `hud_*` cvar provenance, all
  dump-gated (D8). Don't collapse them; don't fold Track B into Track A's
  reachability column (D1 no-mechanism-blend).
- **Schema is representation, not acceptance.** D8's dump-gating and the
  D10 drift anchors are the Pass-5 acceptance contract. Pass 4 designs how
  the verdict/provenance is STORED, not how it is gated.
- Operator is the design + scope gate; one sub-question per turn;
  **plain-English first, mechanics to the spec** (operator flagged
  "too technical" in Pass 3 -- lead with the plain choice + a
  recommendation; SQL/DDL/enum lists drain to the spec, not the
  conversation). Be decisive (recommend, don't poll). Solo-dev: Claude runs
  git silently, commits to main, pushes at session wrap, no PR ceremony.

## First three actions

1. Read the spec (North Star + D1 amendment + D3-D7 + D8-D11 + D7.1/D7.3 +
   5-pass table + SHIPPED + spun-out note) + parking Pass-1/2/3 blocks + the
   named memories. Do NOT dispatch anything. Do NOT re-run detection. Do NOT
   re-open name-case.
2. Invoke arc-brainstormer; confirm the 5-pass plan is intact and Pass 4 =
   unified L1 fidelity schema + provenance (spec table is source of truth:
   Pass 3 COMPLETE, Pass 4 NEXT). Open Pass 4.
3. First Pass-4 sub-question: the unified signal model shape -- ONE
   per-entity representation that carries (a) Track-A verdict
   {reachable / genuine-dead / build-excluded} with the two-feeder
   provenance split (D7.1), and (b) Track-B recovered-hidden provenance
   across the three HUD families (D11), without blending the two mechanisms
   (D1). Plain-English the choice; drain the column/enum detail to the spec.

## When in doubt

The goal is L1 telling the runtime truth, both directions, with provenance a
reader can trust. Pass 4 makes the signal STORABLE and PROVENANCED; Pass 5
GATES it against the runtime dump. Conservative always (D3/D8). The spec is
the source of truth; parking-doc "verified" line numbers are hypotheses
until re-verified against live source.
