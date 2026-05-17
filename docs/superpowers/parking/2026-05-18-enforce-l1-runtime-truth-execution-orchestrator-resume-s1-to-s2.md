# Resume: enforce-L1-runtime-truth EXECUTION orchestrator -- session 1 -> session 2

**For:** arc-orchestrator, FRESH terminal, EXECUTION mode (NOT drafting; NOT
arc-reviewer). Execution-orchestrator session 1 ran pre-flight, drove +
independently gated Phase 1 (incl. catching/routing/resolving F9), shipped
Phase 1 (commit `51604f67`), and dispatched Phase 2. It wrapped at ~440k
(smell zone 350k / failure 500k -- the Phase-2 gate needs full fidelity, so
it handed off at this CLEAN phase boundary rather than push through). You
are COLD -- read before acting. You do NOT execute phase code; you dispatch
arc-executor terminals, independently re-verify each boundary vs LIVE
source, own cross-phase memory, judge fresh-terminal handoffs on budget.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Model: draft-then-execute, 5 phases, fully SEQUENTIAL (1->2->3->4->5; each
ships a runnable byte-identical state + commits before the next). README
phase index is authoritative. All 5 MDs were APPROVED; the pre-execution
cross-phase audit RAN + CLEARED (F8). EXECUTION is the distinct heavier
mode and is underway.

Status:
- **Phase 1: SHIPPED** -- commit `51604f67` (`docs(arc-exec): enforce-L1
  Phase 1 shipped -- Track A call-graph passenger`). 9 files: `_callgraph.py`
  (new, 1149L), `verify-callgraph-probes.py` (new), `extract.py` (seam),
  the F9-amended scaffold (`decisions.md`/`review-findings.md`/`phase-1`/
  `phase-3`/`phase-4` MDs), `arc-history.md`. Independently
  orchestrator-re-verified TWO ways each (executor "GREEN" treated as
  hypothesis): X3 zero-diff -- structural (observer in separate dispatch
  cycles, never in `ALL_HANDLERS`, self-private mutation only) + an
  independent OFF/ON full re-run (8-stem `diff -q` EMPTY); 3-gate --
  structural (Gate-3 `expected_shape` IS the F9-amended contract, not
  stricter) + an independent post-revision harness re-run (`GATE 1/2/3
  GREEN`, exit 0). D1 no-blend / D7.1 feeder-b pure-text separation
  confirmed structurally.
- **F9 -- caught at execution, operator-ratified, fully propagated.** The
  Phase-1 drafter Recon premise "`cl_view.c` not-compiled in the SERVERONLY
  build" imported the historical qwsv dedicated-server model. Orchestrator
  primary-source verification corroborated the executor's harness EXACTLY,
  then sharpened it: ezQuake-source has ONE `add_executable(ezquake)` over
  one 309-file source list, NO per-variant CMake target, `SERVERONLY` never
  CMake-set -> the executor's Option A (parse per-variant source lists) is
  INAPPLICABLE; Option B is the factually-correct model. Operator ratified
  Option B. Applied: dated `decisions.md` **D5 AMENDMENT 2026-05-17**
  (not-compiled is PREPROCESSOR-derivable ONLY; build-system/source-list
  exclusion NOT modeled; D3 intact; D19/level-3 autonomous-ship safety
  unaffected; bounded D15 level-2 build-dimension precision loss only) +
  `review-findings.md` **F9** resolution + Phase-1 MD 4 dated corrections
  (narrative preserved -- the D7/F8 house style) + Phase-3 (2) + Phase-4
  (1) cross-phase propagation. Resolution required **ZERO `_callgraph.py`
  change** -- the module already derived not-compiled purely from
  preprocessor-scoped TU membership; the only defect was the drafter's
  expected Gate-3 value. Executor revised ONLY `verify-callgraph-probes.py`
  Gate 3 (`cl_bobhead` server `not-compiled` -> `reachable`; conclusion
  `build-excluded` UNCHANGED -- the load-bearing answer; RED iff conclusion
  != build-excluded OR server == not-compiled; deliberately NOT stricter).
- **Phase 2: DISPATCHED, executor NOT yet halted.** A fresh arc-executor
  terminal was opened with the augmented EXECUTION prompt (reproduced
  verbatim in "Phase-2 executor prompt" below -- this is what the executor
  was told). It has NOT reported back. Receiving + independently gating its
  halt is YOUR first substantive job.
- **Phases 3, 4, 5: not started.** Sequential; Phase 3 needs 1+2; Phase 4
  needs 3 + prereq-4 (durable dump, CLOSED in-repo, but the R6 proxy is
  RE-RUN at the Phase-4 boundary -- X8/W2); Phase 5 needs 4.
- **Uncommitted-but-INTENTIONAL on disk (NOT drift):** README.md Phase-1
  row flipped `approved -> shipped (commit 51604f67 ... F9 ...)`. It is
  committed by THIS resume's session-wrap commit (see below) so a cold
  read of README is true. If you somehow see it uncommitted, it is
  intentional scaffold-status bookkeeping, not drift -- commit it, do not
  revert.
- **Memory written (operator-approved):**
  `reference_libclang_compiled_means_parsed_not_linked.md` + its MEMORY.md
  index line -- the generalizable F9 lesson (libclang "compiled in variant"
  = parsed-under-V-flags, NOT linked-in-V-binary; not-compiled is
  preprocessor-derivable only; de-risks the gated FTE/QWCL/MVDSV
  follow-ons). Memory dir is OUTSIDE the repo -- not in any commit.
- **HANDOVER small-followup (post-arc):** `verify-callgraph-probes.py`
  imports `STATE_UNREACHABLE` (line ~64) which became unused after the
  Gate-3 F9 revision -- trivial, non-fatal, deliberately deferred under the
  minimal-delta mandate. One-line cleanup at the post-arc pass.

Commits (arc-relevant; the parallel **ktx-mvdsv-l1-describe-fill** arc
interleaves the log -- SEPARATE arc, stay single-arc-scoped, NEVER touch
its files or `git add -A`): ... scaffold/approvals ... `a04c6929` (F8
resolved) `4be76909`/`a7f3f114` (audit gate cleared) -> `51604f67`
(**Phase 1 SHIPPED**) -> this resume's session-wrap commit. Branch `main`,
solo-dev silent commits, no PR ceremony.

**Repo working tree:** ~23 unrelated dirty files (HANDOVER.md, slipgate
`fte-asset-bundle.json` + `slipgate-managed-mode-review-findings.md`, the
ktx-mvdsv arc's `decisions.md`, `.claude/scheduled_tasks.lock`,
`apps/qw-oracle/qw-oracle.db`, ...). NONE are this arc's. Scoped `git add`
of ONLY the phase's shipped files + this arc's scaffold, EVERY commit.
NEVER `git add -A`.

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md`
   (items 1-3 re-confirm-live; item 4 CLOSED, Phase-4 re-runs R6),
   `decisions.md` (D1-D22 + the **D5 / D7 / D11 AMENDMENTS** + X1-X10 +
   non-goals IN FULL -- the D5 AMENDMENT 2026-05-17 is the freshest, F9),
   `review-findings.md` (F1-F9 + R1-R7 + W1-W4 + the phase-ownership
   table; **F9 is resolved**, read its resolution + the orchestrator
   refinement block), `phase-template.md`, `README.md` (LOCKED index;
   Phase 1 `shipped`, 2-5 pending).
2. **All 5 phase MDs IN FULL** -- they are the LOCKED execution contracts
   and now carry the F9 dated corrections. Order: P1 (shipped -- read for
   the contract Phase 2 must NOT blend with), P2 (the dispatched phase --
   read closely), P3, P4, P5. For each: "Inputs from previous phase" /
   "Outputs to next phase" (the cross-phase contract you gate for drift),
   the LOCKED execution-mode annotations, "Verification (phase boundary)",
   "Recovery".
3. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (D-rationale; decisions.md is the distilled
   contract -- do NOT re-open a D).
4. The handoff chain (critical rules cumulative): the drafting chain
   `...-orchestrator-resume-s3-to-s4.md`, `...-s4-to-s5.md`,
   `...-drafts-approved-to-execution-handoff.md`, and THIS doc (the
   execution s1->s2 resume -- the freshest).
5. Memory: `feedback_verify_dispatched_terminal_claims` (THE core duty --
   the Phase-1 F9 is the freshest worked example: the orchestrator's
   primary-source re-verification corroborated AND sharpened the executor;
   "GREEN" is a hypothesis until grep/SQL/Read/re-run),
   `feedback_parking_verified_state_is_hypothesis` (F9 is its execution-
   time materialization), the NEW `reference_libclang_compiled_means_
   parsed_not_linked` (the F9 lesson), `reference_rigor_bar_follows_
   consumer`, `feedback_model_effort_range`,
   `feedback_no_subagents_for_mechanical_edits`,
   `feedback_orchestrator_terminal_pattern`,
   `feedback_verification_layer_catches_lift_residuals`,
   `feedback_idempotency_before_staleness`,
   `reference_postgres_js_jsonb_binding` (F1.jsonb gate, re-run every
   schema/loader/app boundary), `feedback_destructive_rm_harness_gate`
   (`rm -rf` is harness-blocked -- use `mktemp -d`, not pre-clean+rm; the
   X3 re-run hit this).
6. `arc-planner/references/arc-phase-archetypes.md` -- per-phase
   verification FLOOR: P2 mechanism = automated self-validation + X3
   zero-diff (verify on the handler's OWN JSON, NOT a later phase's
   column -- X2/W4); P3 schema+loader = migration applies + SCHEMA.md
   diff + F1 + real round-trip; **P4 acceptance = OPERATOR-RUN floor**
   (CI-only is INSUFFICIENT); **P5 application = MIXED -> OPERATOR-RUN
   higher floor** (the operator EYEBALLS the regenerated
   `ezquake-runtime-dead-entities.md` as nano/slime would -- check 6
   MANDATORY; a purely-automated P5 sign-off is itself a FAIL).

## Critical rules (carry into the remaining gates)

- **Verify executor claims yourself -- against LIVE shipped code/DB.** An
  executor's "DONE / verification PASS" and its sub-agent's "0 CRITICAL"
  are HYPOTHESES until you re-run the probes + grep/SQL/Read primary
  source. The Phase-1 F9 is the worked example: the orchestrator
  re-derived the root cause at primary source (clang_config / extract.py /
  CMakeLists / cl_view.c guards), corroborated the harness EXACTLY by an
  independent re-run, AND sharpened the executor's framing (Option A
  inapplicable). Do BOTH the structural proof AND the empirical re-run
  where they are independent (the X3/3-gate two-ways pattern).
- **Refuted premise -> dated `decisions.md` amendment + operator
  ratification, NEVER a silent in-flight redesign.** F9 (this session) +
  D7/D11 (drafting) are the worked examples. Surface ONE question, plain
  English, with a recommended option (`feedback_be_decisive` +
  `feedback_one_question_at_a_time` + `feedback_operator_not_technical_
  review_gate`). The orchestrator applies the amendment + propagates it
  (decisions.md + review-findings F-row + every affected MD as a DATED
  correction with narrative preserved + README + arc-history; check
  Phase-3/4/5 footprint for cross-phase drift).
- **R1 is Phase 2's wired STOP gate (its F9-analogue).** If the libclang
  AST finds ANY non-literal `HUD_Register` first arg: handler records +
  emits nothing, R1 probe RED, STOP for an operator `decisions.md`
  amendment -- do NOT constant-propagate (Track-A blend, violates D1).
- **R7 hard collision.** `_handler_hud.py` emits COMMANDS ONLY; zero
  `type='cvar'` (collides with `_handler_cvars.py:288-351` on
  `entities UNIQUE(project,type,name)`). The Task-3 probe asserts it.
- **X2/W4 regime self-containment.** Each phase verifies on its OWN
  output. P2 = the handler's emitted JSON (3 anchors + R7 + R1), NOT an
  L1 column (no schema until P3), the combined harness (P4), or the dump
  (P4 answer key). A phase verifying via a later phase's artifact is a
  collision -- bounce it.
- **X3 zero-diff is a REAL command + its EMPTY result (W3)** over the 8
  live F6 `output_filename` stems (the P2 MD lists them correctly;
  `ezquake-variables-ast.json` not `cvars`, `ezquake-cmdline-params-ast
  .json` not `cmdline`). P2's 9th file `ezquake-hud-commands-ast.json` is
  ADDITIVE (off-absent/on-present), NOT in the byte-identical set.
- **F8 STANDING RULE (binds the Phase-3 executor; the ktx-mvdsv arc is
  STILL ACTIVE).** Phase-3 migration ordinal = EXECUTOR-DERIVED live
  `(highest db/migrations/ int)+1` immediately before writing; every
  `quality-grid.ts` cite re-derived by symbol search. Live state s1: tail
  was `012/013/014` (highest `014` = ktx-mvdsv's; re-derive at execution,
  may be higher). NEVER hard-code. Augment the Phase-3 executor prompt
  with this verbatim (and Phase 2 already carries it forward).
- **Draft-FAITHFUL, honor the locked execution modes** (`feedback_model_
  effort_range`): P2 Task1 `subagent (Opus medium)`, Task2/3 `subagent
  (Sonnet medium)`; near-zero inline (X5). Do NOT downgrade OR inflate;
  if a revision is genuinely a bounded mechanical edit (the F9 resume was
  inline -- fully-specified expected-value fix), grade the REVISION
  honestly, do not inflate.
- **Per-phase prereq re-confirm (X8 -- "verified" is a hypothesis).**
  Re-confirm the pin BOTH legs == `3f9e724fa608e516040f02b9557808ff3ef
  da53e` at EVERY boundary (STOP if moved). Before the Phase-4 dispatch:
  RE-RUN the R6 version-pin proxy live + re-confirm prereq-4/F7
  (Phase-4's OPERATOR-RUN floor).
- **Commit cadence:** at each phase SHIP, after the operator approves,
  scoped `git add` of ONLY that phase's shipped files + this arc's
  scaffold (incl. README status flip + arc-history) + a session-wrap
  resume doc at a handoff. Message `docs(arc-exec): enforce-L1 Phase N
  shipped ...`, end with `Co-Authored-By: Claude Opus 4.7
  <noreply@anthropic.com>`. At Phase 5 SHIP: `git tag -a
  arc-enforce-l1-runtime-truth-shipped`, then the POST-ARC handoff routes
  to **arc-reviewer** (a DIFFERENT skill, fresh terminal -- structurally
  not the execution orchestrator).
- **`rm -rf` is harness-blocked.** Use `mktemp -d` working dirs; do not
  pre-clean with rm. (The Phase-1 X3 re-run hit this.)

## First three actions

1. Cold-read the scaffold + all 5 MDs + the handoff chain + the named
   memory. Confirm: README Phase-1 `shipped` (commit `51604f67`); the F9
   D5 AMENDMENT + review-findings F9 resolution are present and coherent;
   prereq pin BOTH legs still `3f9e724f...` (re-run the two commands --
   git HEAD of `research/repos/ezquake-source` + `oracle_meta
   ezquake:source_repo_commit`); the ~23-file unrelated drift is NOT this
   arc (never `git add -A`). Do NOT re-open design; do NOT re-derive pools
   (74/92/129 banked, X7); do NOT re-litigate F9 (operator-ratified).
2. Receive the Phase-2 arc-executor halt report (it may already be
   waiting -- the operator pastes it). Take its STATUS / probe outputs /
   any decisions.md deviation / open questions / the F8 carry-forward.
3. Independently re-verify its phase-boundary probes vs LIVE source --
   the executor's "GREEN" is a hypothesis (the Phase-1 F9 worked
   example): the 3 HUD anchors (`radar` bare/element=radar;
   `+hud_radar`+`-hud_radar`; `togglehud` NOT emitted) + R7 zero-`type=
   cvar` + R1 `nonliteral_count==0`, ALL on the handler's OWN
   `ezquake-hud-commands-ast.json` (NOT an L1 column -- X2/W4); the X3
   8-stem `diff -q` EMPTY + the 9th-file additive (present ON / absent
   OFF); and re-check the load-bearing `hud.c` cites the handler rested
   on (the `HUD_Register` arg-index map, the `+/-` double gate, the
   `hud.c:1281-1282` commented-duplicate TRAP must NOT be emitted) --
   verify by symbol, trust live code over the MD's frozen cites (F9
   lesson). Confirm the Phase-2 "Outputs to next phase" matches Phase 3's
   "Inputs from previous phase" verbatim (contract-drift = latent-bug
   ship). If R1 RED: that is a designed refuted-premise STOP -> route an
   operator decisions.md amendment (the F9/D7/D11 precedent), do NOT let
   the executor constant-propagate. Gate; capture cross-phase memory
   (decisions.md amendment if a premise refuted; review-findings next
   F-row if a new risk; arc-history bullet appended under the enforce-L1
   entry on clean ship; README Phase-2 -> shipped); on operator approval
   do the scoped Phase-2 ship commit; then prep Phase 3's fresh executor
   terminal AUGMENTED with the F8 standing rule verbatim (Phase 3 is the
   heaviest F8-binding phase -- migration ordinal + quality-grid.ts cites
   executor-derived live). Re-project YOUR budget after the Phase-2 gate;
   if >350k, hand off again at that clean boundary (this session did
   exactly that and it worked).

## When in doubt

North Star: L1 tells the runtime truth both directions, provenance a
reader can trust. The spec is source-of-truth; the 5 MDs are LOCKED
execution contracts (now carrying F9 dated corrections); parking /
"verified" / prior-session / sub-agent / executor lines are HYPOTHESES
until re-verified vs LIVE source (real code / DB / migration / emitted
JSON / a re-run). Conservative always (D3/D8); never false-accuse; the
dump is the overriding answer key (D19 + the F7 embedded-SHA sub-gate);
level-3 ships autonomously (strict bar -- nano/slime consume the
delete-list UNSEEN), level-2 is assistant-only and NEVER withheld (D21);
the two tracks NEVER blend (D1/D12 structural). F9's resolution is the
freshest proof of the method: a drafter "Recon facts (verified)" block
is a hypothesis; the orchestrator's primary-source re-verification
(corroborate AND sharpen) is the trust anchor; refuted premises route to
the operator as dated `decisions.md` amendments, never silent overrides
(one question, plain English, recommended option). The ezQuake help-JSON
doc-gap arc is a SEPARATE sequenced follow-on (NOT this arc). FTE/QWCL/
MVDSV is a per-fork gated follow-on (D2/D22), off by default (NOT this
arc; the new `reference_libclang_compiled_means_parsed_not_linked` memory
de-risks it but does not pull it in). Post-arc review is arc-reviewer,
fresh terminal, NOT the execution orchestrator.

## Phase-2 executor prompt (what the dispatched executor was told -- your record)

> [EXECUTION] arc-executor, arc `2026-05-17-enforce-l1-runtime-truth`,
> Phase 2 (Track B `ezquake/_handler_hud.py`, commands-only). LOCKED MD:
> `phase-2-track-b-handler-hud.md`. Read scaffold + P2 MD + spec COLD;
> critically review vs decisions/review-findings first. Pin both legs
> `3f9e724f...` (re-confirm; STOP if moved). Phase 1 SHIPPED `51604f67`
> -- share NO code/schema/gate (D1); confirm `_handler_hud.py` +
> `verify-hud-probes.py` ABSENT; `_handler_hud_elements.py` is DISTINCT.
> Prior-phase learnings carried: the F9 worked example (a drafter
> "Recon (verified)" block is a hypothesis -- re-verify the `hud.c`
> cites LIVE: HUD_Register arg-index map ~1182-1188, bare Cmd_AddCommand
> ~1232, +/- double gate ~1265/1269/1275/1278, HUD_PLUSMINUS ~hud.h:37,
> radar ~hud_radar.c:1422, togglehud ~hud.c:819, the hud.c:1281-1282
> commented-duplicate TRAP must NOT be emitted -- verify by symbol);
> R1 is the wired STOP gate (non-literal first arg -> record+emit-nothing
> -> RED -> STOP for an operator amendment, NO constant-propagation, the
> D7/D11/F9 precedent); R7 commands-only zero-cvar collision guard; F8
> STANDING RULE carried verbatim for the P3 chain. Locked modes: Task1
> `subagent (Opus medium)`, Task2/3 `subagent (Sonnet medium)`, near-zero
> inline (X5). Verify on the handler's OWN JSON (X2/W4 -- 3 anchors + R7
> + R1), X3 actual-command empty result over the 8 F6 stems + 9th-file
> additive, X9/X10/X1, single toggle seam fail-safe-off. Do NOT commit;
> HALT structured (STATUS + actual probe OUTPUTS, not "PASS"; F8
> carry-forward verbatim); do NOT proceed to Phase 3.
