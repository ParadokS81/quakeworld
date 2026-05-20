# Arc-reviewer handoff -- enforce-L1-runtime-truth (post-arc review, fresh terminal)

You are a **fresh-terminal arc-reviewer** (invoke the `arc-reviewer` skill). The arc shipped 2026-05-20; this terminal performs the structural post-arc review that the arc-orchestrator could not -- the orchestrator session was anchored on what executed, the reviewer's value is reading cold. You did NOT execute any phase; you produce the DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING walkthrough vs the spec + locked decisions + every phase MD + cross-phase memory captures.

Repo root: `/home/paradoks/projects/quakeworld`. Arc tag pushed: `arc-enforce-l1-runtime-truth-shipped`.

## Reads required (in order; do not skim)

1. **Design spec:** `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md` -- the source of truth (D1-D22 + the D11 amendment + revised pass table; full rationale).
2. **Arc-orchestrator scaffold** at `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`:
   - `README.md` -- per-phase status (all 5 now `shipped`); "ARC SHIPPED 2026-05-20" status block at top.
   - `decisions.md` -- D1-D22 + amendments (D5 amended 2026-05-17 F9 preprocessor-only not-compiled; D7 amended 2026-05-17 F4/F5 D7.1 commented-register feeder separation); X1-X10; non-goals.
   - `review-findings.md` -- F1-F20 ledger + R1-R7 + W1-W4 + the phase ownership table at the bottom.
   - `prerequisites.md` -- operator-side Task 0 (all items closed).
   - `phase-template.md` -- mandatory phase MD shape.
   - `handoff-prompt.md` -- generic executor briefing template.
   - `phase-1-track-a-callgraph-passenger.md` through `phase-5-application-outputs.md` -- the 5 phase MDs (read every one).
3. **Arc-history retrospective:** `apps/qw-oracle/docs/arc-history.md` heading `## 2026-05-17 -- enforce-L1-runtime-truth -- SHIPPED ...` -- 5 phase bullets + the F15 fix-cycle + Phase-4 RE-VERIFY bullet + the Phase 5 + POST-SHIP correction bullet (the most recent, dated 2026-05-20).
4. **Cross-phase memory captures (operator memory files at `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/`):**
   - `reference_libclang_compiled_means_parsed_not_linked.md` (the F9 D5-amendment generalizable lesson; de-risks the gated FTE/QWCL/MVDSV follow-ons)
   - `feedback_idempotency_before_staleness.md` (the F15-vs-F13 distinction the executor must keep separate)
   - `feedback_parking_verified_state_is_hypothesis.md` (the F18 family; spec-frozen numbers are hypotheses post-execution)
   - `feedback_audit_predictions_not_contracts.md` (the F19 narrative-preserved correction; my own first framing primary-source-REFUTED)
   - `feedback_verify_dispatched_terminal_claims.md` (the orchestrator-independent verification posture across every phase boundary)
   - `reference_runtime_dump_self_certifies_commit.md` (F7 PRIMARY embedded-SHA proxy leg)
   - `reference_loader_adapter_must_reassert_source_state.md` (F15 fix discipline)
5. **Per-phase resume docs** (the executor-orchestrator session handoffs; read for the actual execution shape, not just the planned shape):
   - `docs/superpowers/parking/2026-05-17-enforce-l1-runtime-truth-drafts-approved-to-execution-handoff.md`
   - `docs/superpowers/parking/2026-05-18-enforce-l1-runtime-truth-execution-orchestrator-resume-s4-to-s5.md`
   - `docs/superpowers/parking/2026-05-18-enforce-l1-runtime-truth-execution-orchestrator-resume-s6-to-s7.md`
   - `docs/superpowers/parking/2026-05-19-enforce-l1-phase5-slime-review-and-pop1-triage-handoff.md`
6. **The shipped applied state (live; primary-source-verify against these):**
   - `apps/qw-oracle/scripts/extractors/extractor_lib/_callgraph.py` (Phase 1 mechanism)
   - `apps/qw-oracle/scripts/extractors/ezquake/_handler_hud.py` (Phase 2 mechanism)
   - `apps/qw-oracle/db/migrations/015_l1_runtime_fidelity_provenance.sql` + `apps/qw-oracle/scripts/load-knowledge/load-callgraph-reachability.ts` + `load-hud-commands.ts` (Phase 3 schema + loaders)
   - `apps/qw-oracle/scripts/extractors/extractor_lib/_acceptance.py` + `apps/qw-oracle/scripts/extractors/ezquake/accept-runtime-truth.py` + `apps/qw-oracle/data/detection/version-pin-proxy.sh` (Phase 4 acceptance)
   - `apps/qw-oracle/scripts/build-runtime-dead-entities.py` + `apps/qw-oracle/scripts/extractors/extractor_lib/_runtime_dead_entities.py` (Phase 5 application -- corrected 2026-05-20 per F20)
   - `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md` (Phase 5 Output 2 visible artifact; regenerated 2026-05-20 to 6 entities post-F20)
7. **Phase ship commits** (`git log` against monorepo `main`):
   - Phase 1: `51604f67`
   - Phase 2: `3c136826`
   - Phase 3: `895817bb`
   - Phase 4: code-checkpoint `702421a1`, ship-record `f68b045b`
   - F15 fix-cycle: `59d34786`
   - Phase 5: `41965fe2`
   - 2026-05-20 F20 .md regen + boundary-flip: pending in current commit batch (this terminal will see it landed when it reads)

## Critical context (do not re-derive; consult cited cross-phase memory)

### Decision amendments (only two across the whole arc)

- **D5 AMENDMENT 2026-05-17 (F9):** "not-compiled" is preprocessor-derivable ONLY (no build-system-excluded files; ezquake-source has ONE `add_executable(ezquake)` over one 309-file source list, no per-variant CMake target, SERVERONLY never CMake-set). The executor's Option B is the factually-correct model. D3 conservatism intact; D19/level-3 safety unaffected. Phase-1 Gate-3 expected cell corrected (`cl_bobhead` server `not-compiled` -> `reachable`; conclusion `build-excluded` UNCHANGED). The arc's first execution-time refuted premise; the executor caught it; orchestrator independently verified.
- **D7 AMENDMENT 2026-05-17 (F4/F5):** D7.1 commented-register is a SEPARATE feeder (architecturally separate textual scanner, not part of the call-graph mechanism); the feeder tag is structural in the schema (D15). This was a clarification at drafting time, not an execution-time refutation.

### Post-execution review-findings (F9-F20)

All OPEN findings either RESOLVED, accepted as correct arc behavior, or routed as deferred work. Of these, **the highest-signal post-arc finding is F20** (surfaced 2026-05-20 at PR-prep):

- **F20 -- Class 3 cmdline-consumer-presence feeder was `.c`-only-scoped.** 5 of 11 shipped Track-A delete-list entries are LIVE via `.h` macro wrappers fanning into `.c` call sites (`sv_ccmds.c:1821/1861`, `pr2_exec.c:56`, `sv_demo.c:1848`, `R_DebugProfileContext` GL fan-out). Root cause: the prior hand-authored Class 3 feeder (carried verbatim per D7/OQ-1 as a SEPARATE non-call-graph feeder) restricted its grep to `.c` files only. The libclang call-graph this arc built (Track A) post-preprocesses and would have caught these had Class 3 run through it -- the bug is in the prior artifact, NOT this arc's mechanism. **Visible artifact corrected** this terminal: `_CLASS3_BLOCK` constant in `_runtime_dead_entities.py` trimmed to 4 verified-dead rows (`.c`+`.h` zero-consumer) + bonus tidy-up dropped + `_ROUTING` prose updated; the .md regenerated mechanically via `build-runtime-dead-entities.py --project ezquake --version head` to 6 entities. **L1 data defect persists** for the 5 mislabeled cmdline_params until the parked cmdline-liveness sibling arc (`decisions.md` non-goals "future separate L1-extractor arc") mechanizes the feeder with proper `.c`+`.h` scope; F20 is the trigger. **ZERO impact on Phase-5 deliverables** (D20 Output 1 always-on signal / D21 Track-B 129 first-class commands untouched; only Output 2 regen affected). **No `decisions.md` D-amendment** -- D7/OQ-1 carry-verbatim was correct in principle, the prior artifact itself overclaimed (defect in carried CONTENT, not the carry RULE).
- **F18 -- legitimate D21-ship consequence (NOT a defect).** Phase-5 MD check 2's expected `command reverse = 129` is a stale pre-execution snapshot; post-Track-B-ship the 129 are first-class in L1 and the reverse-diff is 0. Dated Phase-5-MD reconcile (the F13/F12/F14 narrative-preserved precedent); banked `front1-diff.sh` byte-immutable, predicate NOT weakened.
- **F19 -- gl_program_sky CORRECTLY build-excluded (NOT a defect; D3 conservatism vindicated).** First framing claimed the 4-variant model omits the renderer-option dimension; primary-source verification REFUTED that premise in place (narrative-preserved): `clang_config.py:58-59` defines BOTH renderer macros, `CMakeLists.txt:11` makes classic-GL default-ON. The extractor models the default ezQuake build correctly. The arc made the build-conditional / never-registered distinction correctly. Residual: detects never-registered NOT registered-but-never-read functional-deadness -- a different future detection.
- **F17 -- pre-existing Phase-3-loader fail-safe-completeness gap (NON-Phase-5-blocking).** Toggle-off/RED keeps the level-2 Track-A signal on an already-GREEN DB (stale 9th/10th artifact + `extract-tag.ts:3e/3f` existsSync + `natural-keys.ts:234` COALESCE). Autonomous level-3 tier provably protected (0 dump-confirmed on RED AND broken-pin). Routes as its own scoped Phase-3-loader fail-safe follow-up (`HANDOVER.md` Small followups). Not F15-caused, not RE-VERIFY-introduced.

### What did NOT happen (deliberate; per decisions.md non-goals)

- **No FTE / QWCL / MVDSV ship** -- per-fork gated follow-ons (D2 / D22), off by default; ezQuake only this arc.
- **No `hud_<name>_<subvar>` settings-cvar half** -- already first-class L1 via `_handler_cvars.py` (D11 amended); `_handler_hud.py` MUST NOT touch cvars (collision -- R7; verified zero `type='cvar'` emission probe GREEN).
- **No `Cmd_AddLegacyCommand` persistence; no trailing-comment harvester precision** -- metadata-fidelity siblings parked for the future L1-extractor arc (now also includes F20's cmdline-liveness feeder).
- **No detection-side runtime-dump automation** -- parked future work.
- **No registered-but-never-read consumer-liveness detector** (F19 residual) -- different signal, different arc.

## Verification posture (the floor; do not skip)

- **Re-run every phase-boundary verification probe yourself** against the live shipped state -- the executor and the orchestrator both did, but you read cold, and the arc-reviewer's value is the third independent pass.
- **Walk decisions.md compliance phase-by-phase** -- confirm no decision was silently overridden across the 5 phases.
- **Walk review-findings.md ownership table phase-by-phase** -- confirm every F/R/W's claimed resolution matches the shipped state.
- **F1 regression-gate grid** (`apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`) -- 132 probes, 0 failures expected; the recalibrated `ezquake.command` floor (564 -> 693 / 495 -> 624 per F13) intact.
- **Spot-check via primary-source grep** for any line cite you intend to relay -- the arc's pattern across F9 / F15 / F19 is that executor or orchestrator first framings were sometimes refuted by primary source; treat every "verified" claim as a hypothesis (operator memory `feedback_audit_predictions_not_contracts`, `feedback_parking_verified_state_is_hypothesis`).

## Standard arc-reviewer output

A walkthrough categorizing each spec / decision / phase MD claim against the shipped state:

- **DELIVERED** -- shipped as specified.
- **DELIVERED-DIFFERENT** -- shipped, but in a different shape than the spec or phase MD claimed; capture the divergence and whether it was operator-ratified (the F-class precedent across this arc was that divergences were dated MD-corrections, not silent overrides).
- **DEFERRED** -- explicitly parked (per decisions.md non-goals or HANDOVER follow-ups).
- **MISSING** -- specified but not shipped, AND not explicitly deferred. Surface this loud; the arc's quality bar is structurally "every finding gets a track" so MISSING is the failure mode to catch.

Final disposition: YELLOW / GREEN / RED with one paragraph each + actionable follow-ups for any RED.

## First three actions

1. **Cold-read the spec + the scaffold + the arc-history retrospective IN ORDER** (Reads required 1-3 above). Do NOT skim. The arc shipped 5 phases of correctness-judgment-heavy work; the reviewer's value is being able to hold all of it at once.
2. **Walk decisions.md D1-D22 + X1-X10 + non-goals against the shipped state** -- one D at a time, primary-source-verify any load-bearing claim, mark each D DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING.
3. **Walk the review-findings ownership table** -- F1 through F20 + R1-R7 + W1-W4; verify each claimed resolution matches the shipped state via spot-checks against live code + DB + the .md.

After those three, produce the walkthrough + final disposition.

## When in doubt

Route to the operator. Re-verify against primary source. The arc's pattern was that primary-source verification refuted multiple confident framings (F9 the drafter's not-compiled model; F18 a phase-MD literal; F19 my own "model omits renderer" framing; F20 a verified artifact's overclaim). Apply the same discipline to your own findings.
