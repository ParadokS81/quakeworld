# Handoff: enforce-L1-runtime-truth arc -- brainstorm COMPLETE -> arc-planner

**For:** arc-planner, fresh terminal. The 5-pass brainstorm is DONE. Your job
is to scaffold the arc (six-artifact scaffold + slicing + per-task execution
mode) against the committed spec. You are COLD -- read before acting.

## Where things are

Brainstorm Passes 1-5 COMPLETE and committed. The design spec is the single
source of truth: `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
(D1-D22, + D11 amendment, + siblings, + revised pass table all marked
COMPLETE/EXITED). One coherent arc, North Star = enforce L1 to tell the
runtime truth, two phased separately-gated tracks, ZERO mechanism blend:

- **Track A -- ghost elimination** (L1 shows non-working). libclang
  call-graph reachability passenger (D3-D7). Classifies the banked
  74-command / 92-cvar HEAD pool genuine-dead vs build-excluded.
- **Track B -- hidden-command recovery** (L1 hides working). New
  `ezquake/_handler_hud.py` modelling the `HUD_Register` **command** contract
  -- bare `<name>` + `+hud_<name>`/`-hud_<name>` (D8/D9/D10). **Commands
  only** -- D11's cvar half was STRUCK at Pass 5 (cvars already extracted by
  `_handler_cvars.py`; see the D11 amendment block).
- **Schema** (D12-D16): two separate provenance fields, one shared three-slot
  spine (conclusion / evidence / dump-confirmation status), sparse +
  per-version + three-level coverage; Track A feeder-tagged per-variant
  evidence; Track B element-linked.
- **Application + acceptance** (D17-D22): one shared 3-stage contract shape;
  hard one-time-per-fork validation gate; dump as overriding answer key;
  Track-A two-output (L1 signal + level-3 delete-list regenerating
  `ezquake-runtime-dead-entities.md`); Track-B commands-only first-class
  entities; per-fork-per-track onboarding precondition.

## Reads required (cold)

- The spec (above) -- D1-D22 + the D11 AMENDED block + "Out of scope --
  siblings" + revised pass plan. Read the D11 amendment closely: Track B is
  commands-only; the new `_handler_hud.py` MUST NOT emit cvars.
- Parking `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
  -- Pass 1-5 blocks (Pass 5 block lists every SQ->D mapping + carry-forwards).
- The audit findings (verified):
  `docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md`.
- Exemplar scaffold: qw-oracle Arc 1 `phase-template.md` and any prior
  L1-extractor arc plan under `docs/superpowers/plans/` for slicing shape.
- Memory: `reference_qw_oracle_extraction_liveness_gap`,
  `reference_rigor_bar_follows_consumer`, `project_extraction_pipeline_vision`
  (8-handler architecture, fork-vs-port), `feedback_parking_verified_state_is_hypothesis`,
  `feedback_every_finding_gets_a_track`.
- LIVE source/code/DB only if a scaffold decision turns on a code fact
  (verify; doc line numbers are hypotheses until re-checked).

## Critical rules (arc-shaped, carry into the plan)

- **Brainstorm is closed. Do NOT re-open D1-D22.** If a scaffold decision
  genuinely needs a design change, surface to operator for explicit
  amendment (no silent relitigation).
- **Track B is commands-only.** D11's cvar scope is struck. The new
  `_handler_hud.py` emits bare/`+hud_`/`-hud_` COMMANDS; it must NOT
  synthesize cvars -- a duplicate cvar emitter collides with the existing
  `ezquake/_handler_cvars.py` on `entities UNIQUE(project,type,name)`. This
  is a hard implementation constraint, not advice.
- **Two feeders, two gates (D7.1/D15/D18).** Track-A genuine-dead has two
  independent feeders: call-graph "unreachable everywhere compiled"
  (`sb_qtvlist_url`) vs commented-register textual (`gl_outline_scale_world`).
  Feeder-tagged evidence; never collapsed.
- **Per-fork validation MANDATORY + non-transferable + per-track (D22/D2).**
  ezQuake-first; FTE/QWCL/MVDSV are per-fork gated follow-ons (MVDSV
  server-only -> Track B N/A there). Off-by-default toggle enforces it.
- **Implementation-shaped residuals are arc-planner/executor, NOT re-opened
  design:** AST-confirm 0 non-literal `HUD_Register` first args (D8); exact
  variant identifiers / evidence column-vs-JSON decomposition (D15);
  element-key emission + loader storage (D16); delete-list format; combined
  known-answer harness wiring (D18); version-pin proxy implementation (D19).
  These are scaffold/slicing decisions you OWN.
- **Non-corrupting bar (D6/D9):** both passengers are read-only observers on
  the existing single per-variant walk; existing entity output stays
  byte-identical (zero-diff verified before/after); single toggle seam.
- Solo-dev: Claude runs git silently, commits to main, no PR ceremony.

## First three actions

1. Read the spec (D1-D22 + D11 amendment + siblings + pass table) + the
   Pass-5 parking block + the audit findings + named memories. Do NOT
   re-open design. Do NOT re-run detection.
2. Invoke arc-planner; confirm the brainstorm is closed and the deliverable
   is a scaffold against D1-D22 (two tracks, ezQuake-first, commands-only
   Track B). Build the six-artifact arc scaffold.
3. Run slicing analysis: phase boundaries by verification regime +
   context-budget; annotate per-task execution mode (subagent + model +
   effort | inline). Likely natural phases -- Track-A passenger; Track-B
   `_handler_hud.py` (commands-only); the unified schema/loader; the
   combined acceptance harness + Track-A delete-list generator + per-fork
   precondition wiring. Gate at every phase boundary against the spec.

## When in doubt

The goal is L1 telling the runtime truth, both directions, with provenance a
reader can trust. The brainstorm settled the SHAPE; you settle the
IMPLEMENTATION PLAN. Conservative always (D3/D8); never false-accuse;
dump is the answer key; level-3 ships autonomously, level-2 is
assistant-only. The spec is the source of truth; parking "verified" lines
are hypotheses until re-verified against live source. The ezQuake help-JSON
doc-gap arc is a SEPARATE sequenced follow-on
(`docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`) --
not yours to plan.
