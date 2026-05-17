# Handoff: enforce-L1-runtime-truth arc -- PLAN COMPLETE -> arc-orchestrator

**For:** arc-orchestrator, fresh terminal. The arc plan is scaffolded and the
slicing is operator-locked. Per-phase MDs are NOT yet drafted -- they are
drafted one fresh terminal at a time, in sequence, via the per-phase
drafter prompts. Your job is to drive that sequence (dispatch each phase's
drafter terminal, verify phase-boundary outputs against live source, own
cross-phase memory, write session-boundary handoffs). You are COLD -- read
before acting.

## Where things are

Brainstorm CLOSED (Passes 1-5 EXITED 2026-05-17). Scaffold BUILT + COMMITTED
(`1294a7cd`, plus the slicing-lock + per-phase-prompt commit). Slicing
LOCKED by operator 2026-05-17: **5 phases, fully SEQUENTIAL.**

Scaffold dir: `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`
- `decisions.md` -- D1-D22 (mirror the spec) + the D11 amendment (cvar half
  STRUCK -- Track B is commands-only) + X1-X10 (cross-cutting execution
  invariants the planner added) + non-goals.
- `review-findings.md` -- F (spec-prose corrections) / R (implementation
  residuals, owned per phase) / W (risks) + phase-ownership table.
- `prerequisites.md` -- items 1-3 satisfied (confirm at exec start); **item
  4 (durable pinned HEAD runtime dump + version-pin proxy) is a real
  operator-side action that gates Phase 4, NOT the mechanism phases.**
- `phase-template.md` -- mandatory shape + mandatory per-task execution-mode
  + the arc-specific 15-point verification sub-agent brief.
- `handoff-prompt.md` -- generic per-phase prompt shape (file-as-prompt).
- `phase-1..5-drafter-prompt.md` -- pre-substituted, self-contained,
  file-as-prompt. The operator types `@<path>` in a fresh terminal to draft
  that phase.
- `README.md` -- LOCKED phase index + slicing analysis + execution-mode
  posture + draft order + what-this-arc-does-NOT-cover.

Phase shape (sequential 1 -> 5; each draft -> review -> ship before next):
1. Track A -- call-graph reachability passenger (Tier-1 shared module).
2. Track B -- `ezquake/_handler_hud.py`, COMMANDS ONLY.
3. Unified L1 fidelity schema + loader.
4. Acceptance contract (the one-time-per-fork hard gate + dump cross-check).
5. Application outputs (the two Track-A outputs + first-class Track-B
   commands). Arc complete + useful at this boundary.

## Reads required (cold)

1. The scaffold, in the README's "read in this order": `prerequisites.md` ->
   `decisions.md` (D1-D22 + D11 amendment + X1-X10 + non-goals) ->
   `review-findings.md` -> `phase-template.md` -> `handoff-prompt.md` ->
   `README.md` (the LOCKED phase index + slicing).
2. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
   (the WHY behind D1-D22; the D11 AMENDED block is authoritative over the
   D11 body) and the audit
   `docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md`
   (why Track B is commands-only).
3. The planner handoff `docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-planner-handoff.md`
   (the brainstorm->planner exit; carries the critical rules).
4. `references/arc-phase-archetypes.md` (verification-approach per phase
   shape -- used when verifying phase-boundary outputs).
5. Memory: `feedback_orchestrator_terminal_pattern`,
   `feedback_fresh_context_for_execution`, `feedback_model_effort_range`,
   `feedback_no_subagents_for_mechanical_edits`,
   `feedback_parking_verified_state_is_hypothesis`,
   `feedback_verify_dispatched_terminal_claims`,
   `reference_rigor_bar_follows_consumer`,
   `project_extraction_pipeline_vision`,
   `reference_qw_oracle_extraction_liveness_gap`.

## Critical rules (carry into orchestration)

- **Sequential, operator-gated.** One fresh terminal per phase, in order.
  The drafter terminal does NOT auto-proceed. Operator reviews every phase
  MD top-to-bottom + runs its YES/NO verification before the next phase's
  terminal opens. You dispatch + verify + memory; you do NOT draft phase
  MDs yourself and you do NOT execute phase code.
- **Brainstorm is closed.** Do NOT re-open D1-D22. A genuine design problem
  found mid-arc lands as a DATED amendment block under the original decision
  in `decisions.md` (the D11 amendment is the canonical example) -- never a
  silent phase-MD override. If an amendment reshapes later phases, those
  phases' drafts are stale and re-draft from the amended decision.
- **The two mechanism phases self-validate (X2 / W4 -- the load-bearing
  slicing invariant).** Phase 1 verifies the `reachable()` query + feeder
  with its OWN 3-gate probes; Phase 2 verifies the handler JSON with its OWN
  3 anchors + the zero-cvar probe. NEITHER verifies against an L1 column
  (Phase 3) or the combined harness (Phase 4). Phase 4's harness is
  COMPOSITION of those probes, not new validation. If a phase MD verifies
  via a later phase's artifact, BOUNCE it -- that is the regime collision
  the whole slicing is built to avoid.
- **Track B is COMMANDS ONLY.** The new `_handler_hud.py` MUST NOT emit any
  `type='cvar'` entity (collision with `_handler_cvars.py:288-351` on
  `entities UNIQUE(project,type,name)` -- R7). Verify the zero-cvar probe
  exists in the Phase 2 MD.
- **Conservative never-false-accuse (D3/D5).** Phase 1: not-compiled
  physically distinct from unreachable; reachable-in-any-variant ->
  build-excluded -> never auto-shipped; address-taken roots fully traversed.
- **Non-corrupting zero-diff (X3) is a real check, not prose.** Every phase
  touching the extractor ships the actual before/after diff command + its
  empty result as a boundary probe. A prose-only "output unchanged" is a
  bounce.
- **Verified is a hypothesis (X8 / W2 / `feedback_parking_verified_state_is_hypothesis`).**
  Use 74 cmd / 92 cvar / ~129 reverse and the 4 build variants from
  `clang_config.py` -- NEVER the parking Scope's stale 77/97/166/132. At
  EVERY phase boundary, re-verify the drafter's "Recon facts (verified)"
  against live source yourself (grep/SQL); a drafter terminal's factual
  claim is a hypothesis until you check it
  (`feedback_verify_dispatched_terminal_claims`). Do not trust the prior
  session's "verified" line.
- **Prerequisites item 4 gates Phase 4 only.** Phases 1-2-3 start cold
  against items 1-2 (and item 3 for Phase 3). Before dispatching the Phase 4
  drafter, confirm item 4 (durable pinned dump + version-pin proxy) is
  closed with the operator; if not, Phase 4 still drafts on paper but flags
  it as an open precondition.
- **Context budget.** All phases project under ~450k subagent-heavy; none
  needs a split. Phase 1 (call-graph BFS / per-variant union / address-taken
  closure) is the heaviest single mechanism and the least-certain budget --
  watch the executor there; default subagent-heavy, design task Opus MAX; do
  NOT pre-split (one coherent mechanism). If an executor enters the ~350k
  smell zone, recommend a fresh-terminal handoff, not a phase split.
- **Solo-dev git.** Claude runs git silently, commits to main, tags the arc
  ship `arc-enforce-l1-runtime-truth-shipped` at the end of Phase 5, no PR
  ceremony.

## First three actions

1. Read the scaffold + spec + planner handoff + named memory + the phase
   archetypes reference COLD. Do NOT re-open design. Do NOT re-run
   detection. Confirm the slicing is operator-locked (README) and the
   deliverable is to drive the sequential 5-phase draft+execute.
2. Invoke `arc-orchestrator`. Confirm prerequisites items 1-2 live
   (`git -C research/repos/ezquake-source log -1` == `3f9e724f...`; the
   extractor runs and emits the X3 zero-diff baseline). Surface
   prerequisites item 4 (durable dump) to the operator NOW as the Phase-4
   gate so it can be closed in parallel with Phases 1-3.
3. Open the Phase 1 drafter terminal: operator types
   `@docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-1-drafter-prompt.md`
   in a fresh terminal. When it halts, verify its "Recon facts (verified)"
   against live source yourself, review against `decisions.md` +
   `review-findings.md`, gate at the boundary. Only on operator approval
   open the Phase 2 terminal. Repeat 2 -> 3 -> 4 -> 5.

## When in doubt

The North Star is L1 telling the runtime truth in both directions, with
provenance a reader can trust. The brainstorm settled the SHAPE; the planner
settled the PLAN; you settle EXECUTION COORDINATION. Conservative always
(D3/D8); never false-accuse; the dump is the overriding answer key (D19);
level-3 ships autonomously, level-2 is assistant-only; the two tracks never
blend (D1/D12). The spec is the source of truth; parking/"verified" lines and
prior-session claims are hypotheses until re-verified against live source.
Route genuine design problems to the operator as a dated `decisions.md`
amendment, never a silent override. The ezQuake help-JSON doc-gap arc
(`docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`) is a
SEPARATE sequenced follow-on -- not part of this arc.
