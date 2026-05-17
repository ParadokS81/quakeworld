# Handoff: enforce-L1-runtime-truth -- ALL 5 DRAFTS APPROVED -> EXECUTION orchestration

**For:** arc-orchestrator, FRESH terminal, in EXECUTION mode (NOT drafting).
Orchestrator session 5 gated + flipped the FINAL draft (Phase 5,
application outputs -- the arc's terminal phase). All five phase MDs are
now APPROVED; the arc plan is FULLY DRAFTED. This handoff exists because
EXECUTION is a DISTINCT, heavier mode than drafting: the drafter terminals
produced paper contracts; the executor terminals ship real code/DB/migrations
and the orchestrator now gates each phase boundary against LIVE shipped
artifacts (not paper). Per the arc's fresh-terminal discipline + the
operator's budget posture, execution gets its own orchestrator terminal.
You are COLD -- read before acting. You do NOT execute phase code; you
dispatch arc-executor terminals (fresh per phase), independently verify
each phase boundary vs live source, own cross-phase memory, and judge
fresh-terminal handoffs on executor budget.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Model: draft-then-execute, 5 phases, fully SEQUENTIAL (1->2->3->4->5; each
phase ships a runnable, byte-identical state and commits before the next).
README phase index is authoritative.

Status:
- **ALL 5 PHASE MDs APPROVED.** P1 `e57a13b7` (+ D7 AMENDMENT + F4/F5/F6;
  prereq-4 Task-0 secured `b51a761e`); P2 `76fedcb0`; P3 `de6198d9`;
  P4 `06cd544a` (S2/F7 embedded-SHA primary proxy leg); **P5 this session**
  (`phase-5-application-outputs.md`, flipped approved -- commit at this
  session's cadence). The arc plan is fully drafted.
- **EXECUTION: NOT STARTED.** No phase code has shipped. Phase 1 is first.
- **Prerequisites:** items 1-3 satisfied at scaffold time, RE-CONFIRM LIVE
  before Phase 1 (X8 -- "verified" is a hypothesis): the ezQuake extractor
  runs end-to-end + emits its current entity JSON (also the X3 zero-diff
  baseline); `research/repos/ezquake-source` pin BOTH legs = `3f9e724f`
  (git HEAD AND `oracle_meta ezquake:source_repo_commit` -- session 5
  re-verified both = `3f9e724fa608e516040f02b9557808ff3efda53e`);
  `qw-oracle-postgres-dev` up + healthy. Item 4 (durable pinned dump +
  proxy) CLOSED: the matched triple is durable in-repo at
  `apps/qw-oracle/data/detection/` (`entities-runtime-dump-3f9e724f.txt`
  byte-identical to the Windows source -- session 5 re-verified `cmp`
  clean a THIRD time; `front1-diff.sh`/`cmdline-liveness.sh` banked
  verbatim; `README.md` lineage). Provenance CLOSED three ways (F7 embedded
  `~3f9e724fa` self-cert + orchestrator R6 re-run GREEN 74/92/129 +
  byte-identical cmp). The Phase-4 EXECUTOR still RE-RUNS the R6 proxy live
  at its boundary (X8/W2; that is Phase-4 Verification 1+2, NOT a
  re-opening of closed provenance).

Commits (arc-relevant only -- the parallel **ktx-mvdsv-l1-describe-fill**
arc interleaves the log, e.g. HEAD `19a74b1f`; it is a SEPARATE arc, stay
single-arc scoped, never touch its files): scaffold `1294a7cd`; slicing
LOCKED `8160915c`; P1 `e57a13b7`; prereq-4 `b51a761e`; P2 `76fedcb0`;
s2->s3 `71e0f406`; P3 `de6198d9`; s3->s4 `5ea74c3f`; P4 `06cd544a`;
s4->s5 `c632f5dd`; P5 APPROVED + this handoff = this session. Branch
`main`, solo-dev silent commits, no PR ceremony.

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md`
   (items 1-3 re-confirm-live; item 4 CLOSED), `decisions.md` (D1-D22 +
   the **D7 AND D11 amendments** + X1-X10 + non-goals IN FULL -- the
   locked execution contract; do NOT re-open a D), `review-findings.md`
   (F1-F7, R1-R7, W1-W4 + the phase-ownership table -- every F/R/W is now
   owned by a specific phase's EXECUTION), `phase-template.md` (incl. the
   verification sub-agent brief -- the executor runs it per phase),
   `README.md` (LOCKED index; ALL 5 approved + the per-phase gate record).
2. **All 5 APPROVED phase MDs IN FULL.** These are now the EXECUTION
   contracts -- not sketches. For each: "Inputs from previous phase" /
   "Outputs to next phase" (the cross-phase contract you gate for drift),
   "Tasks" with their LOCKED execution-mode annotations
   (`subagent <model> <effort>` | `inline` -- the executor ships per these,
   does NOT re-plan), "Verification (phase boundary)" (you re-run EVERY
   probe yourself), "Recovery". Order: P1
   `phase-1-track-a-callgraph-passenger.md`, P2
   `phase-2-track-b-handler-hud.md`, P3
   `phase-3-unified-schema-loader.md`, P4
   `phase-4-acceptance-contract.md`, P5
   `phase-5-application-outputs.md`.
3. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (D1-D22 WHY; decisions.md is the distilled
   contract -- do NOT re-open a D).
4. The session handoff chain (critical rules still in force, cumulative):
   `2026-05-17-enforce-l1-runtime-truth-orchestrator-resume-s3-to-s4.md`,
   `...-orchestrator-resume-s4-to-s5.md`, and THIS doc.
5. Memory: `feedback_verify_dispatched_terminal_claims` (THE core duty --
   now applied to EXECUTOR claims vs LIVE code/DB; the Phase-3 grep-scare,
   the Phase-4 F7, and session-5's four primary-source re-verifications
   [74/92/129 sanity-gate re-run, pin both legs, the OQ-2 premise vs the
   Phase-3 lock, the Phase-4->5 stamp-set filename contract] are the
   worked examples), `feedback_parking_verified_state_is_hypothesis`,
   `reference_rigor_bar_follows_consumer` (level-3 = autonomous published
   verdict shipped UNSEEN to nano/slime = the STRICT bar; level-2 =
   assistant-only, NEVER withheld -- D21), `feedback_model_effort_range`
   (the phase MDs carry the locked per-task grades; honor them),
   `feedback_no_subagents_for_mechanical_edits`,
   `feedback_orchestrator_terminal_pattern`,
   `feedback_verification_layer_catches_lift_residuals`,
   `feedback_idempotency_before_staleness`,
   `reference_postgres_js_jsonb_binding` (F1.jsonb_columns_not_strings --
   accumulated regression gate, re-run at EVERY phase boundary),
   `reference_runtime_dump_self_certifies_commit` (the F7 lesson, written
   + operator-approved).
6. `references/arc-phase-archetypes.md` -- per-phase verification FLOOR:
   - P1 / P2 (mechanism): automated -- mechanism self-validation
     (Track A 3-gate on `reachable()` + feeder; Track B 3 anchors + R7
     zero-cvar) + X3 zero-diff. Verify on the MECHANISM's OWN output, not
     a later phase's column (X2/W4).
   - P3 (schema + loader): automated -- migration applies, SCHEMA.md
     diff, F1, real Phase-1/2 round-trip.
   - P4 (acceptance): **OPERATOR-RUN floor** -- harness GREEN at the pin,
     broken-pin -> ZERO level-3 demonstrated, toggle-off parity, a
     deliberately-failed probe falls the fork back LOUD. CI-only automated
     is INSUFFICIENT for this archetype.
   - P5 (application): **MIXED -> OPERATOR-RUN higher floor** -- the
     operator EYEBALLS the regenerated
     `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
     as nano/slime would (check 6, MANDATORY); the automated byte-shape /
     F1 / SQL probes stack ON TOP, they do NOT replace the eyeball. A
     purely-automated P5 sign-off is itself a FAIL.

## Critical rules (carry into EXECUTION orchestration)

- **Verify executor claims yourself -- now against LIVE shipped code/DB.**
  An executor's "DONE / verification PASS" and its sub-agent's
  "0 CRITICAL" are HYPOTHESES until you re-run the probes + grep/SQL/Read
  primary source. Drafting's worked examples (Phase-3 grep-scare,
  Phase-4 F7) carry forward; execution adds the live DB/migration/JSON as
  the primary source.
- **Execution is draft-FAITHFUL, not re-planning.** The 5 MDs are LOCKED
  contracts. The executor ships each phase's tasks per their declared
  execution mode (the annotations are already in the MDs -- honor
  `feedback_model_effort_range`; do NOT downgrade a `subagent (Opus MAX)`
  lock task to inline, do NOT silently re-grade). If a locked task proves
  WRONG at execution, that is a dated `decisions.md` amendment +
  operator ratification (the D7/D11/Phase-4-OQ-3/Phase-5-OQ-1/OQ-2
  worked examples), NEVER a silent in-flight redesign.
- **Phase-boundary gate, every phase:** re-run EVERY phase-boundary
  verification probe yourself; walk the phase's tasks vs `decisions.md`
  (no silent override); confirm the phase's "Outputs to next phase"
  matches the next phase's "Inputs from previous phase" verbatim
  (contract-drift is a latent-bug ship); re-run the ACCUMULATED F1 gates
  (`F1.runtime_fidelity_shape` [P3] + `F1.jsonb_columns_not_strings`
  [Arc-1, P3-extended] + `F1.callgraph_signal_pool_coverage` +
  `F1.hud_recovery_first_class` [P5] once those phases ship).
- **X-invariants are hard at every boundary:** X1 (each phase commits a
  runnable state); X3 (zero-diff non-corruption -- the actual before/after
  `diff -q` over the **8 live F6 `output_filename` stems**:
  `ezquake-commands-ast.json`, `ezquake-variables-ast.json`,
  `ezquake-macros-ast.json`, `ezquake-cmdline-params-ast.json`,
  `ezquake-hud-elements-ast.json`, `ezquake-keynames-ast.json`,
  `ezquake-asset-cvar-bindings-ast.json`,
  `ezquake-asset-loader-sites-ast.json`; the 9th
  `ezquake-hud-commands-ast.json` is ADDITIVE, off-absent/on-present, NOT
  in the byte-identical set); X4 (single toggle seam, off == today's
  pipeline, off is the default for every non-ezQuake fork); X9 (recovery
  = re-run the corrected extract+load end-to-end, NEVER an in-place SQL
  UPDATE); X10 (ASCII-only in all shipped code/docs).
- **The North Star bars:** the dump is D19's overriding answer key; on any
  static-vs-dump disagreement the conservative direction wins (Track A
  drops the accusation -- D3; Track B does not ship the name -- D8).
  level-3 ships autonomously (the strict-bar consumer -- nano/slime
  consume the delete-list UNSEEN); level-2 is assistant-only and NEVER
  withheld (D21); the two tracks NEVER blend (D1/D12 structural). P5's
  delete-list carries ONLY level-3 dump-confirmed genuine-dead +
  commented-register; build-excluded is PERMANENTLY level-2, structurally
  absent from the delete-list at any level (D20 / Phase-4 OQ-3).
- **P5 OQ-1/OQ-2 are RESOLVED (operator-ratified 2026-05-17, recorded in
  the P5 MD).** OQ-1: the render helper carries Class 3 (orphaned cmdline)
  + Attribution + Channel/Routing verbatim as fixed template constants +
  a one-line provenance note (Class 3 is a separate non-call-graph
  feeder). OQ-2: per-entry prose is mechanism-templated from the signal
  (per-variant breakdown / register-site cite) + the L1 declaration cite
  + a templated disposition -- it does NOT reproduce the original
  hand-authored investigative narrative (the signal does not persist the
  registrar; reproducing it would be fabricated provenance). The P5
  executor ships these resolutions; do NOT re-litigate them.
- **Commit cadence (execution):** at each phase SHIP, scoped `git add` of
  ONLY that phase's shipped files + the scaffold (the repo carries heavy
  unrelated drift incl. the parallel ktx-mvdsv arc + slipgate -- NEVER
  `git add -A`); message `docs(arc-exec): enforce-L1 Phase N shipped ...`
  (or the executor's own end-state convention), end with the
  `Co-Authored-By: Claude Opus 4.7` trailer. At Phase 5 SHIP, tag the arc
  ship: `git tag -a arc-enforce-l1-runtime-truth-shipped -m "<one line>"`,
  pushed at the next checkpoint.
- **Budget:** execution is the heaviest mode. Fresh EXECUTOR terminal PER
  PHASE (the arc discipline). The orchestrator watches executor budget;
  smell zone ~350k -> recommend a fresh executor handoff at the next
  clean task boundary. Phase 1 (call-graph BFS / per-variant union /
  address-taken closure over the 4-variant TU set) is the heaviest single
  mechanism and the least-certain budget (~250-450k; no analogous prior
  arc) -- subagent-default mandatory, design task Opus MAX; re-project at
  the end of Phase 1. Default NOT to split (one coherent mechanism).
- **Post-ARC review is a SEPARATE fresh-terminal job.** After all 5
  phases SHIP, the post-arc handoff routes to **arc-reviewer** (a
  different skill, fresh terminal -- structurally cannot be the execution
  orchestrator session, which is anchored on what executed). NOT now; not
  this terminal.

## First three actions

1. Read the scaffold + all 5 APPROVED phase MDs + the named memory + the
   handoff chain COLD. Confirm: README all-5-approved + the per-phase gate
   record; prereq 1-3 RE-CONFIRMED LIVE (extractor runs end-to-end; pin
   BOTH legs `3f9e724f`; postgres container up); prereq-4 durable in-repo
   + F7 provenance CLOSED. Do NOT re-open design; do NOT re-derive pools
   (74/92/129 banked + session-5-reproduced via the BANKED proxy/dump --
   X7).
2. Dispatch Phase 1 EXECUTION. Phase 1 is first so the executor prompt is
   minimal-augmentation: this is EXECUTION not drafting (ship the LOCKED
   `phase-1-track-a-callgraph-passenger.md` per its execution-mode
   annotations -- the call-graph mechanism design task is the Opus-MAX
   lock); plus the live prereq-1/2/3 re-confirmation results from action
   1. Have the operator open a FRESH terminal running the **arc-executor**
   skill on Phase 1. (The executor reads the phase MD cold, critically
   reviews it vs decisions/review-findings, executes per the annotations,
   runs phase-boundary verification, halts with a structured status.)
3. Wait for the Phase-1 executor halt (DONE / DONE_WITH_CONCERNS /
   NEEDS_CONTEXT / BLOCKED). Independently re-verify its phase-boundary
   probes vs LIVE source: the Track-A 3-gate (`sb_qtvlist_url`
   unreachable-everywhere / `gl_outline_scale_world` commented-register
   feeder / `cl_bobhead` in `V_Init` reachable) GREEN on the `reachable()`
   query + the feeder output (NOT an L1 column -- X2/W4); the X3 8-stem
   zero-diff EMPTY; the single toggle seam off==today. Gate; capture
   cross-phase memory (any execution-time learning that contradicts a D ->
   dated `decisions.md` amendment + operator ratification; any new risk ->
   `review-findings.md` next F/R/W + phase tag; arc-history append on
   clean ship); on operator approval the executor commits the runnable
   state at the cadence; open Phase 2's fresh executor terminal. Repeat
   the loop 2->3->4->5. At Phase 5 SHIP -> write the POST-ARC handoff
   routing to **arc-reviewer** (fresh terminal) + tag the arc ship.

## When in doubt

North Star: L1 tells the runtime truth both directions, provenance a
reader can trust. The spec is source-of-truth; the 5 APPROVED phase MDs
are the LOCKED execution contracts; parking / "verified" / prior-session
/ sub-agent / executor lines are hypotheses until re-verified vs LIVE
source (now real code / DB / migration / emitted JSON -- the strongest
primary source yet). Conservative always (D3/D8); never false-accuse; the
dump is the overriding answer key (D19, with the F7 exact embedded-SHA
sub-gate); level-3 ships autonomously (strict bar), level-2 is
assistant-only and NEVER withheld (D21); the two tracks never blend
(D1/D12). Route genuine design problems to the operator as a dated
`decisions.md` amendment + ratification, NEVER a silent override
(one question at a time, plain-English consequences). The ezQuake
help-JSON doc-gap arc (`docs/superpowers/parking/2026-05-17-ezquake-
helpjson-doc-gap-arc.md`) is a SEPARATE sequenced follow-on (genuine
dependency: this arc produces the entity set it consumes) -- NOT this
arc. FTE/QWCL/MVDSV is a per-fork gated follow-on (D2/D22), off by
default -- NOT this arc; the F7 embedded-SHA lesson de-risks it but does
not pull it in.
