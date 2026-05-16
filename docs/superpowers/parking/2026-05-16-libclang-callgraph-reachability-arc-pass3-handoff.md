# Handoff: enforce-L1-runtime-truth arc -- Pass 3 (fresh terminal)

**For:** arc-brainstormer, Pass 3. Fresh terminal. You are COLD -- read
before acting.

## Where things are

Pass 1 COMPLETE + AMENDED. Pass 2 COMPLETE 2026-05-16 (Track-A call-graph
mechanism fully specified, drained as D3-D7 in the design spec). The arc is
two-track under one North Star: **enforce L1 to show what is actually present
and working**.

- **Track A -- ghost elimination** (L1 shows non-working): libclang
  call-graph reachability. MECHANISM SETTLED (D3-D7). Not Pass 3's job.
- **Track B -- hidden-command recovery** (L1 hides working): model the
  `HUD_Register` contract. **THIS IS PASS 3.**
- Shared foundation (command case-fold harness): CLOSED BY MEASUREMENT
  (mini-arc `8093e42f`); not a pass concern.

Pass 2's locked decisions (read them, don't relitigate): D3 conservative
never-false-accuse posture + per-config root set; D4 full-subtree
propagation; D5 three-valued per-config state + combination + auto-ship
boundary; D6 Option A shared passenger (non-corrupting + toggleable); D7
scope boundaries (two-feeder genuine-dead list; signal repr = Pass 4).

Track B scopes to **~129 real hidden commands** (reverse-diff 132 -> 129;
the case gap was only ~3 commands -- ~129 is genuine signal, NOT case
noise). Detection is DONE; do not re-run it. The runtime dump is the Track-B
answer key (gate: emitted names now present + match runtime).

## Reads required (cold)

- `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
  -- THE source of truth. D1-D7, North Star, 5-pass plan (Pass 2 COMPLETE,
  Pass 3 NEXT). Read D1 Track B + the SHIPPED section (the ~129 number).
- `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
  -- Pass 1 + amendment + **Pass 2 COMPLETE block** + original design
  constraints + the 3-gate known-answer harness.
- `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`
  -- the verified Track-B mechanism detail (`hud.c:1232` bare name;
  `hud.c:1271-1278` `+hud_`/`-hud_`; `HUD_PLUSMINUS`; `HUD_Register`
  literals at `hud_radar.c` etc.) + the do-not-propagate retraction.
- Memory: `reference_qw_oracle_extraction_liveness_gap`,
  `reference_libclang_ezquake_extraction`, `reference_rigor_bar_follows_consumer`,
  `project_extraction_pipeline_vision`,
  `feedback_parking_verified_state_is_hypothesis`.
- LIVE source (verify, do NOT trust doc line numbers -- they may have
  drifted): `research/repos/ezquake-source/src/hud.c` -- the `HUD_Register`
  definition, the bare `<name>` registration (doc says `:1232`), the
  `+hud_<name>`/`-hud_<name>` registration (doc says `:1271-1278`), the
  `HUD_PLUSMINUS` flag gate. Plus the `HUD_Register(...)` call sites to
  size the literal-vs-non-literal first-arg question.

## Critical rules

- **Verify, don't infer -- and don't trust your own probe.** Parking-doc
  "verified" line numbers are HYPOTHESES (`feedback_parking_verified_state_is_hypothesis`;
  precedent this arc: the "dual-parse client/server" claim was stale, it's
  4-variant). RE-VERIFY every `hud.c` line cite against live source before
  proposing the emission model.
- **Two tracks, NO mechanism blending (D1).** Track B is literal/constant
  modeling of the `HUD_Register` contract -- a DIFFERENT mechanism from
  Track A's call-graph. Do not fold reachability into Track B.
- **Conservative carries (D3 spirit).** Track B emits only
  runtime-confirmed hidden commands. The runtime dump is the answer key; do
  not emit a speculative `+hud_X` that is not in the dump. Track-B output
  feeds L1 presence -- size rigor to that consumer
  (`reference_rigor_bar_follows_consumer`).
- **Pass-3 open sub-question (from D1):** are ALL `HUD_Register` first args
  literal? radar/speed/gun2 verified literal; the full set needs the AST to
  size a possible non-literal tail. This is a real Pass-3 sub-question, not
  a settled fact.
- Operator is the design + scope gate; one sub-question per turn;
  plain-English first; be decisive (recommend, don't poll). Solo-dev:
  Claude runs git silently, commits to main, pushes at session wrap, no PR
  ceremony.

## First three actions

1. Read the design spec (D1-D7 + North Star + pass plan) + parking
   Pass-1/amendment/**Pass-2-COMPLETE** + the feeder Track-B detail + the
   named memories. Do NOT dispatch anything. Do NOT re-run detection.
2. Invoke arc-brainstormer; confirm the 5-pass plan is intact and Pass 3 =
   Track B mechanism (spec table is source of truth: Pass 2 COMPLETE, Pass 3
   NEXT). Open Pass 3.
3. First Pass-3 sub-question: the `HUD_Register` contract emission model --
   RE-VERIFY live `hud.c` (bare `<name>`; `+hud_`/`-hud_` under
   `HUD_PLUSMINUS`) against current source, and size the "are ALL first args
   literal?" question against the live `HUD_Register(...)` call sites,
   BEFORE proposing the model.

## When in doubt

The goal is L1 telling the runtime truth, both directions, validated by the
shared dump. Track B emits only runtime-confirmed hidden commands (~129).
Conservative always. The operator's spot-checks keep catching real things --
that is the process working. The spec is the source of truth; parking-doc
"verified" line numbers are hypotheses until re-verified against live
`hud.c`.
