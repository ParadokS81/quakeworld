# Resume: enforce-L1-runtime-truth arc -- orchestrator session 2 -> session 3

**For:** arc-orchestrator, FRESH terminal. Sessions 1-2 drove the cold
pre-flight + drafted-and-approved Phases 1 and 2 + secured prerequisite 4.
This handoff exists because the orchestrator session crossed the ~350k
context smell zone; Phase 3 (the Opus-MAX schema design with two
cross-phase carry-forwards) needs fresh judgment fidelity. You are COLD --
read before acting. Do NOT execute phase code; do NOT draft phase MDs; you
dispatch + independently verify + own cross-phase memory.

## Where things are

Arc = `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`.
Slicing operator-LOCKED: 5 phases, fully SEQUENTIAL, **draft-then-execute
model confirmed**: drive the sequential DRAFTING of all 5 phase MDs
(paper-only; each drafter reads the prior APPROVED MD); EXECUTION is the
distinct post-full-draft orchestration (Phase 5's own handback says so).
The README "ship before next" phrasing is loose -- the drafter prompts +
Phase-5 handback are authoritative: drafting first.

Status (README phase index is authoritative):
- **Phase 1 (Track A call-graph passenger): APPROVED** (commit `e57a13b7`).
  Carried blocking deviation OQ-1 (D7 premise "extractor already runs
  textual passes" REFUTED by live recon) -> operator ratified option (a)
  minimal standalone scanner -> landed as **decisions.md D7 AMENDMENT
  2026-05-17** + review-findings **F4/F5**. Its X3 file-list had a latent
  defect (stale stems) -> orchestrator-corrected (commit `76fedcb0`) +
  review-findings **F6**.
- **Phase 2 (Track B `_handler_hud.py`, commands-only): APPROVED** (commit
  `76fedcb0`). No deviation (correctly -- R1 is a designed in-phase AST
  STOP gate, not a draft-time refutation; independently confirmed: the
  non-literal `HUD_Register(char *name` is the `hud.c:1182`/`hud.h:133`
  DEFINITION, not a call site).
- **Phase 3 (unified L1 fidelity schema + loader): NEXT TO DRAFT.**
- Phases 4-5: not started.
- **Prerequisite 4: SECURED** (commit `b51a761e`). The runtime answer-key
  triple is durable in-repo at `apps/qw-oracle/data/detection/`
  (`entities-runtime-dump-3f9e724f.txt` byte-identical, `front1-diff.sh`,
  `cmdline-liveness.sh`, `README.md`). Remaining for Phase 4 only: re-run
  the R6 version-pin proxy (`front1-diff.sh:33-36`) against the live DB +
  operator blesses provenance + Phase-4 drafter finalizes canonical path.
  Items 1-3 satisfied (extractor toolchain; pin `3f9e724f`; postgres dev
  container up).

Commits since arc scaffold (`1294a7cd`/`8160915c`): `7fe396e1` (P1 drafted),
`e57a13b7` (P1 approved + D7 amendment), `b51a761e` (prereq-4 secured),
`76fedcb0` (P2 approved + P1 X3 fix + F6). Branch `main`, solo-dev silent
commits, no PR ceremony.

## Reads required (cold, in this order)

1. The scaffold per README "read in this order": `prerequisites.md` (item-4
   UPDATE block), `decisions.md` (D1-D22 + the **D7 AMENDMENT 2026-05-17**
   + D11 amendment + X1-X10 + non-goals -- IN FULL), `review-findings.md`
   (F1-F6, R1-R7, W1-W4 + the phase-ownership table), `phase-template.md`,
   `README.md` (LOCKED index; Phases 1-2 approved).
2. The **APPROVED Phase 1 + Phase 2 MDs** (`phase-1-track-a-callgraph-
   passenger.md`, `phase-2-track-b-handler-hud.md`) -- their "Outputs to
   next phase" sections ARE Phase 3's real inputs. Phase 1 ships the
   `reachable()` feeder-tagged per-variant verdict shape; Phase 2 ships the
   `hud_commands` JSON (`hud_element` + `hud_family` per recovered command).
3. `phase-3-drafter-prompt.md` (the pre-substituted Phase-3 drafter prompt).
4. The spec `docs/superpowers/specs/2026-05-16-libclang-callgraph-
   reachability-design.md` (D12-D16 WHY for the schema; decisions.md is the
   distilled contract -- do NOT re-open a D).
5. The original orchestrator handoff `docs/superpowers/parking/2026-05-17-
   enforce-l1-runtime-truth-orchestrator-handoff.md` (the arc's critical
   rules) + the planner handoff `2026-05-17-libclang-callgraph-
   reachability-arc-planner-handoff.md`.
6. Memory: `feedback_verify_dispatched_terminal_claims` (THE core duty),
   `feedback_parking_verified_state_is_hypothesis`,
   `feedback_model_effort_range`, `feedback_no_subagents_for_mechanical_edits`,
   `reference_rigor_bar_follows_consumer`,
   `feedback_verification_layer_catches_lift_residuals` (the Phase-2-caught-
   Phase-1-defect pattern -- the layered gate is working, keep it),
   `feedback_idempotency_before_staleness` (Phase 3 is loader -- relevant),
   `feedback_orchestrator_terminal_pattern`,
   `reference_postgres_js_jsonb_binding` (Phase 3 writes JSONB -- the
   F1.jsonb_columns_not_strings regression gate).
7. `references/arc-phase-archetypes.md` -- Phase 3 = **schema-port + loader-
   port** archetype: automated floor (migration applies, SCHEMA.md diff, F1
   quality-grid GREEN, real Phase-1/2 output round-trips); ~150-400k; the
   two-field/three-slot DESIGN task is Opus-MAX-shaped.

## Critical rules (carry into Phase 3 orchestration)

- **Verify dispatched-terminal claims yourself.** A drafter's "Recon facts
  (verified)" + its sub-agent's "0 CRITICAL" are HYPOTHESES until you
  grep/SQL primary source. Both prior phases required it: Phase 1's OQ-1
  deviation was real (independently confirmed); Phase 2's cross-check
  caught a real Phase-1 X3 defect the Phase-1 review missed. For Phase 3
  re-verify against LIVE source: the latest `db/migrations/` number + the
  append-only convention; `apps/qw-oracle/SCHEMA.md` shape; the
  `load-knowledge/` adapter pattern (`load-cvars.ts`/`load-commands.ts`);
  the F1 quality-grid; and the REAL approved Phase-1/2 "Outputs" shapes.
- **Two MANDATORY Phase-3 carry-forwards -- inject into the drafter
  prompt** (prepend, file-as-prompt stays canonical):
  - **F5:** Track-A per-variant evidence is PASSENGER-derived, NOT
    handler-recorded (D7.2 was imprecise for cvars; `_handler_cvars.py`
    records only the struct-decl site, the passenger binds
    `Cvar_Register(&X)` to its enclosing fn via the shared visitor hook).
    Phase 3's R2 D15 evidence field shape must store passenger-derived
    per-variant state; do not assume a handler `enclosing_function`.
  - **OQ-2:** Phase 2 emits `hud_commands[name] = {hud_family,
    hud_element, ast:{...}}`. Phase 3 (R3-store) owns the L1 mapping of
    `hud_element`/`hud_family` -> the D16 element link + D21 first-class
    `command` entities. The exact JSON keys are in Phase 2's MD "Outputs"
    + Task-1 `finalize` shape -- read them, do not reinvent.
- **Brainstorm closed.** A refuted premise -> DATED `decisions.md`
  amendment + operator ratification, NEVER a silent phase-MD override. D7
  AMENDMENT 2026-05-17 + the D11 amendment are the two worked examples.
- **X2/W4 self-containment** is the load-bearing slicing invariant. Phase
  3's verification DEPENDS on Phase 1+2 output (real output round-trips
  through the loader into the two provenance fields) -- that is ALLOWED.
  It must NOT depend on Phase 4 (the runtime-dump cross-check / combined
  harness) or Phase 5. D12 = two PHYSICALLY SEPARATE nullable fields, NO
  `kind` discriminator. D13 slot-3 (dump-confirmation) is REPRESENTATION
  ONLY in Phase 3 -- the actual cross-check is Phase 4.
- **JSONB discipline (`reference_postgres_js_jsonb_binding`).** Phase 3
  writes JSONB provenance. Bind JS values directly / `tx.json(...)`, never
  a pre-stringified string; extend `F1.jsonb_columns_not_strings` if a new
  JSONB shape is written. Recovery is re-run the corrected extract+load
  (X9), never SQL UPDATE in place.
- **Execution mode:** near-zero inline (code-synthesis arc, X5); the
  two-field/three-slot schema DESIGN task = Opus MAX; migration + loader
  synthesis = Sonnet medium; post-draft verification sub-agent = Sonnet
  medium Explore (X6 / `feedback_model_effort_range`).
- **Solo-dev git**, silent commits to `main`. The parallel
  **ktx-mvdsv-l1-describe-fill** arc interleaves commits in the log
  (`14fcd064` etc.) -- it is a SEPARATE arc; stay single-arc scoped to
  enforce-l1-runtime-truth, do not touch it.
- **Cwd hygiene:** prior session hit a `cd` cwd-drift; use ABSOLUTE paths
  in Bash (the Bash tool persists cwd between calls).

## First three actions

1. Read the scaffold + the approved Phase 1 + Phase 2 MDs + the named
   memory COLD. Confirm: Phases 1-2 approved (README), prereq-4 secured
   (`apps/qw-oracle/data/detection/`), the draft-then-execute model, the
   D7 amendment is in `decisions.md`. Do NOT re-open design, do NOT
   re-derive pools (74 cmd / 92 cvar / ~129 -- banked, X7).
2. Build the Phase-3 drafter augmentation: the standard
   `@docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-3-
   drafter-prompt.md` PLUS a one-paragraph prepend carrying the F5 +
   OQ-2 carry-forwards (above) and the prior-phase discipline note (refuted
   premise -> deviation+STOP; honesty: run the verifier for real, report
   actual findings; the X3 file set = the 8 live `output_filename` stems
   per F6, plus the additive 9th `ezquake-hud-commands-ast.json`).
3. Operator opens a FRESH terminal, pastes that augmented prompt. When it
   halts: independently re-verify its "Recon facts" against live source
   (migration number, loader pattern, F1, the real P1/P2 output shapes),
   walk it against decisions.md (D12-D16 + the D7 amendment) +
   review-findings (R2/R3-store/F5/F6/W2), gate at the boundary, capture
   cross-phase memory, then -- only on operator approval -- open the
   Phase-4 drafter (and surface the prereq-4 R6-proxy-rerun + provenance
   bless as the Phase-4 precondition).

## When in doubt

North Star: L1 tells the runtime truth both directions, provenance a
reader can trust. Conservative always (D3/D8); never false-accuse; the
dump is the overriding answer key (D19, Phase 4); level-3 ships
autonomously, level-2 is assistant-only; the two tracks never blend
(D1/D12). The spec is source-of-truth; parking/"verified"/prior-session
lines are hypotheses until re-verified against live source. Route genuine
design problems to the operator as a dated `decisions.md` amendment, never
a silent override. The ezQuake help-JSON doc-gap arc
(`docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`) is
a SEPARATE sequenced follow-on -- not this arc.
