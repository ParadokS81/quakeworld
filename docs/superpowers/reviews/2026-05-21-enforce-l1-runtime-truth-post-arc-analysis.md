# enforce-L1-runtime-truth -- post-arc analysis (2026-05-21)

**Reviewer:** post-arc fresh terminal (did not execute any phase; cold read of spec + scaffold + arc-history + every phase MD + cross-phase memory captures + parking handoffs; primary-source verified against the shipped tree at arc tag `arc-enforce-l1-runtime-truth-shipped` = commit `557d87032b`).

**Sources read:**
- Spec: `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md` (756 lines; D1-D22 + the D11 amendment + the revised pass plan).
- Scaffold: `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/` (README + decisions + review-findings + prerequisites + phase-template + handoff-prompt + 5 per-phase MDs + 5 per-phase drafter prompts + 1 revision prompt; ~8400 lines total).
- Arc-history retrospective: `apps/qw-oracle/docs/arc-history.md` heading `2026-05-17 -- enforce-L1-runtime-truth -- SHIPPED` (5 phase paragraphs + F15 fix-cycle + Phase-4 RE-VERIFY + Phase-5/boundary-flip).
- Cross-phase memory captures (7 files at `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/`): `reference_libclang_compiled_means_parsed_not_linked.md`, `feedback_idempotency_before_staleness.md`, `feedback_parking_verified_state_is_hypothesis.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_verify_dispatched_terminal_claims.md`, `reference_runtime_dump_self_certifies_commit.md`, `reference_loader_adapter_must_reassert_source_state.md`.
- Per-phase resume parking docs: `2026-05-17-...-drafts-approved-to-execution-handoff.md`, `2026-05-18-...-resume-s4-to-s5.md`, `2026-05-18-...-resume-s6-to-s7.md`, `2026-05-19-...-phase5-slime-review-and-pop1-triage-handoff.md`.
- Live shipped state: every file named in the per-phase MD "Files touched" lists, each confirmed present on disk; phase ship commits + arc tag confirmed in git history; the F1 quality-grid probes confirmed registered.

## Verdict

**GREEN at sign-off.** Both North-Star directions met for ezQuake: Track A (libclang call-graph reachability + ghost elimination) shipped 6 genuine-dead entities to the upstream-prs delete-list (2 cvars + 4 cmdline_params, primary-source-verified across `.c` and `.h`) while 164 build-conditional entities were correctly retained at level-2 (the D3/D5 conservative-call-graph win vindicated by F19); Track B (HUD_Register hidden-command recovery) shipped 129 first-class L1 commands with element-linked provenance. Every spec section is DELIVERED or DELIVERED-DIFFERENT with operator-ratified narrative-preserved dated corrections; the two `decisions.md` amendments (D5 / D7) are both correctly documented and primary-source-verified against the shipped `_callgraph.py`. The arc's defining feature is the discipline ratio: F1-F20 surfaced 20 findings during execution, every one routed (RESOLVED, ACCEPT-arc-correct, or routed to a tracked follow-up), zero silent overrides, zero MISSING spec promises. Three OPEN YELLOWs at sign-off (F16 log noise, F17 fail-safe-completeness gap, F20-residue L1 mislabel of 5 cmdline_params) are correctly NON-blocking for the arc's deliverables and routed to specific follow-up arcs; the level-3 autonomous tier is provably protected on RED/broken-pin. One review-time finding: a Phase-5-MD literal-text defect of the F12 family (verification check 3 line 707 still names the wrong `load-version` subcommand) is uncorrected (Phase 4 received its F12-class dated correction; Phase 5 did not) -- non-blocking for the arc but a copy-runnability hazard worth fixing in a single dated MD-correction.

## Spec section walkthrough

The spec is organized as D1-D22 (locked design decisions) + the non-goals block + the spun-out case-fidelity mini-arc + the pass plan. The reviewer walks each in order, treating the arc-planner-added X1-X10 cross-cutting execution invariants as a sibling band of spec-class promises.

### D1 -- one arc, two tracks, zero mechanism blend

Status: **DELIVERED**.

Evidence: `_callgraph.py` (1149 lines) and `_handler_hud.py` (285 lines) live in disjoint tiers (`extractor_lib/` shared vs `ezquake/` project-private), share no symbols, no schema column, no acceptance gate. Migration `015_l1_runtime_fidelity_provenance.sql` lands TWO physically separate JSONB columns -- `track_a_reachability` on `cvar_versions` + `command_versions`, `track_b_hud_recovery` on `command_versions` only -- with no `runtime_fidelity` wrapper and no cross-track `kind` discriminator (D12 structural realization of D1). Phase-3 orchestrator review confirmed the structural no-blend by SQL count = 0 at the migration boundary. Phase-4's `_acceptance.py` instantiates one shared three-stage contract (D17) per track, never blending feeders. Phase-5's `build-runtime-dead-entities.py` SELECTs only `track_a_reachability`, never `track_b_hud_recovery` (verified in the file).

Note: the cvar half of D11 (`hud_<name>_<subvar>` settings cvars) was STRUCK by the pre-execution amendment (already first-class via `_handler_cvars.py:_synthesize_hud_cvars`). Track B narrowed to commands-only -- D1's no-blend intent strengthened, not weakened.

### D2 -- ezQuake-first

Status: **DELIVERED**.

Evidence: scaffold contains no FTE/QWCL/MVDSV-specific code; `accept-runtime-truth.py` is the single ezQuake instantiation; `data/detection/acceptance-validated-ezquake.json` exists, no analogues for other forks. Other-fork follow-ons are routed to D22 (off-by-default toggle = structural enforcement) as parked future work in `HANDOVER.md`.

### D3 -- conservative never-false-accuse posture + root set

Status: **DELIVERED + VINDICATED**.

Evidence: `_callgraph.py` computes the root set per-variant (entry cascade UNION address-taken closure) and the conservative combination logic returns `build-excluded` whenever reachable in any compiled variant; failure-mode biases to "reachable" (`STATE_NOT_COMPILED`, `STATE_UNREACHABLE`, `STATE_REACHABLE` are distinct enum values, never collapsed). F19 (`gl_program_sky`) is the literal D3 vindication: operator-surfaced as "absent from my build, must be dead", first framing self-corrected to "registered + read in classic-GL, default-ON build" via primary-source grep of `glc_main.c:36-44` + `glc_sky.c:206/:368` + `CMakeLists.txt:11` + `clang_config.py:58-59`; the conservative call-graph correctly refused the false accusation that a single-build heuristic would have shipped.

### D4 -- reachability propagates through the full subtree

Status: **DELIVERED**.

Evidence: `_callgraph.py` post-walk BFS traverses every reachable function (entry-cascade roots + address-taken roots) and marks every transitively reachable callee. The address-taken-residue flag is auditable per D5 (visible in the per-variant evidence breakdown). No "tighten" heuristic was added (D4 implication held); the wide over-approximation is intentional and confirmed by the 164 build-conditional kept count.

### D5 -- three-valued per-config state + conservative combination + auto-ship boundary

Status: **DELIVERED-DIFFERENT (operator-ratified D5 AMENDMENT 2026-05-17)**.

Evidence: the three states (`reachable` / `unreachable` / `not-compiled`) and the combination logic are unchanged in the shipped code. The amendment SCOPED the derivation of `not-compiled` to preprocessor-derivable exclusion only -- this was the F9 refuted-premise discovery during Phase-1 execution: the original drafter's Recon assumed ezQuake-source builds a separate dedicated-server binary with its own source list (the historical `qwsv` model), but live verification at `clang_config.py:72-73` + `CMakeLists.txt:11` + `extract.py:312` proved ezQuake-source compiles ONE `add_executable(ezquake)` over one 309-file source set with no per-variant CMake target. The Option A "teach the mechanism each variant's true source list" was INAPPLICABLE (nothing to teach); Option B (scope not-compiled to preprocessor-derivable only) was operator-ratified.

The amendment is captured in `decisions.md` D5 with a 67-line dated block preserving the path of the refutation, plus an additional orchestrator primary-source refinement that sharpened the executor's framing from "Makefile source-list" to "no per-variant CMake target." Phase-1 MD Gate-3 expected cell was correspondingly corrected (`cl_bobhead` server cell `not-compiled` -> `reachable`, conclusion `build-excluded` UNCHANGED -- the load-bearing answer). The Phase-1, Phase-3, and Phase-4 MDs all carry dated F9 corrections at the same cell. D3 (never-false-accuse) intact; D19 / level-3 autonomous-ship safety unaffected; the bounded precision loss lands only in level-2 build-dimension auditability for client-only-file registrars in the server variant. The shipped `_callgraph.py:751-761` literally implements: `if registrar not in self._compiled[variant]: return STATE_NOT_COMPILED` -- the amended preprocessor-scoped semantics.

This is the cleanest worked example of the arc's discipline: a refuted premise surfaces during execution, the executor STOPS, the operator ratifies a dated amendment, the conclusion is unchanged, every downstream MD propagates a dated correction, zero silent overrides. Primary-source-verified at the shipped state.

### D6 -- Track A integration: shared passenger, non-corrupting, cleanly toggleable

Status: **DELIVERED**.

Evidence: `extractor_lib/_callgraph.py` is a Tier-1 shared module beside `_visitor.py`/`clang_config.py` (the established pattern); the seam in `ezquake/extract.py` is one module-level boolean (`ENABLE_CALLGRAPH_PASSENGER`) + one subscription line. X3 zero-diff verified at every phase boundary (the orchestrator independently re-ran OFF/ON over the 8 F6 byte-identical stems at Phase-1, Phase-2, Phase-3, and Phase-4 boundaries; each time the existing entity JSON was byte-identical). Off => zero edges, zero BFS, zero residual cost.

### D7 -- Track A scope boundaries

Status: **DELIVERED-DIFFERENT (operator-ratified D7 AMENDMENT 2026-05-17)**.

Evidence: the two-feeder structural split (feeder (a) call-graph; feeder (b) commented-register) is fully realized in `_callgraph.py` (the `scan_commented_registrations` regex scanner is architecturally separate from the AST walk -- no AST, no edges, no BFS contact). The amendment corrected two specific drafter premises that live recon refuted:

1. **D7 implication "the extractor already runs textual passes" -- FALSE.** Repo-wide grep proved no commented-register textual detector existed; the only textual pass was the retired `_legacy/` trailing-help-comment harvester (a different concern). Resolution: build feeder (b) as a minimal standalone scanner inside `_callgraph.py` (~15-line regex over raw source text) -- D1 no-blend preserved structurally.
2. **D7.2 "registrar is the enclosing function of the already-recorded registration site" -- imprecise for CVARS.** Commands record `enclosing_function` (verified in `_handler_commands.py:188/195-199`), but cvars record only the `cvar_t` VAR_DECL (file scope, no enclosing function). Resolution: the Track-A passenger itself binds `Cvar_Register` CALL_EXPRs to enclosing FUNCTION_DECL via the shared visitor's `enter_function`/`exit_function` hooks (inherent to D6, NOT a new mechanism).

D7.1's intent stands; only the drafter's facts were corrected. F4/F5 in the findings ledger document the path. Primary-source-verified: the shipped `_callgraph.py` carries both the BFS-based feeder (a) and the standalone-regex feeder (b) with the architectural separation.

### D8 -- Track B emission model: full static HUD_Register contract, dump-gated

Status: **DELIVERED**.

Evidence: `_handler_hud.py` reads `HUD_Register` arg0/arg3/arg7 literally per the locked contract (bare command unconditional; `+hud_<name>`/`-hud_<name>` gated on `HUD_PLUSMINUS in flags AND show is non-NULL literal`). R1 was an in-phase gate at the AST level: `_handler_hud.py` records every site whose arg0 does not resolve via `literal_string` + macro fallback, and `verify-hud-probes.py` asserts `nonliteral_count == 0`. The acceptance-validated-ezquake.json shows R1 GREEN at the pin -- the textual probe's "83 sites, 0 non-literal" was AST-confirmed, the gate did its job, no premise refuted.

### D9 -- Track B integration: dedicated `_handler_hud.py`, additive + non-corrupting + toggleable

Status: **DELIVERED**.

Evidence: `_handler_hud.py` is a new Tier-3 ezQuake-private Visitor; the seam in `ezquake/extract.py` is one boolean (`ENABLE_HUD_COMMANDS_HANDLER`) + one import (`HUD_COMMANDS_OFF=1` env-var override -- the F10 dated correction). X3 zero-diff verified at Phase-2 boundary by the orchestrator's own OFF/ON re-run. The 9th file `ezquake-hud-commands-ast.json` is additive (does not exist when off; emitted when on). REJECTED alternatives (extend `_handler_commands.py`; generalize to a shared wrapper-contract pattern) were not silently adopted -- the new handler is the literal D9 shape.

### D10 -- Track B drift guard: lightweight known-answer set

Status: **DELIVERED**.

Evidence: `verify-hud-probes.py` ships exactly the 3 anchors (bare `radar`; `+hud_radar`/`-hud_radar`; `togglehud` untouched) plus R7 (zero `type='cvar'` emission) plus R1 (AST-confirm 0 non-literal first args). Phase-4 composes these via subprocess (X2/R5 -- no re-authored logic). Acceptance-validated-ezquake.json records `ANCHOR 1/2/3 GREEN / R7 GREEN / R1 GREEN`. No speculative change-detection / AST-diffing / template-move heuristics were added (D10 implication held).

### D11 -- Track B scope: COMMAND HALF ONLY (cvar half STRUCK)

Status: **DELIVERED (pre-execution D11 amendment ratified)**.

Evidence: the D11 amendment landed at brainstorm Pass 5 (2026-05-17), before any phase MD was drafted -- a refuted-premise correction caught at the brainstorm gate not at execution. The shipped `_handler_hud.py` emits zero `type='cvar'` rows (R7 probe primary-source-verified at acceptance-validated-ezquake.json). The pre-existing `_handler_cvars.py:_synthesize_hud_cvars` continues to emit the 1429 `hud_<name>_<subvar>` cvar family unchanged. F1 in the findings ledger captures the prose mis-label (`order` is unconditional, not gated; `show` is the gated subvar) as awareness-only -- no code impact because the cvar half is struck.

### D12 -- two physically separate provenance fields under one shared design language

Status: **DELIVERED**.

Evidence: migration `015_l1_runtime_fidelity_provenance.sql` body = three bare `ALTER TABLE ... ADD COLUMN JSONB` statements (no CHECK, no constraint), confirmed structurally: `cvar_versions.track_a_reachability`, `command_versions.track_a_reachability`, `command_versions.track_b_hud_recovery`. No `runtime_fidelity` wrapper column, no shared `kind` discriminator. The `evidence.feeder` tag is INTRA-Track-A (D7.1/D15) -- structurally never a cross-track discriminator. Phase-3 orchestrator review's D12 SQL check ran `SELECT count(*) FROM information_schema.columns WHERE column_name='runtime_fidelity'` and got 0; this reviewer confirms the migration body matches.

### D13 -- sparse, per-version, mechanism-derived; three-level coverage semantic

Status: **DELIVERED**.

Evidence: `_callgraph.py` runs per-version on each version's own AST (free per D6); the Phase-3 loader writes `high-confidence-generalized` (level-2) for every populated row; Phase-4's loader writes `dump-confirmed` (level-3) exclusively when the version-pin proxy PASSes AND the dump cross-check confirms. NULL column = level-1 "no signal". `level3-stamp-set-3f9e724f.json` exists (2611 bytes, 2026-05-19) with proxy:PASS at pin `3f9e724f` -- the only commit pinned for level-3 at sign-off, by design (D19, not a gap).

### D14 -- shared three-slot provenance spine

Status: **DELIVERED**.

Evidence: every populated `track_a_reachability` and `track_b_hud_recovery` row carries exactly `{conclusion, evidence, dump_confirmation}` -- the F1.runtime_fidelity_shape probe enforces this. Slot-3 is representation-only at Phase 3 (Phase 4 owns the cross-check); the Phase-3 F1 probe deferred the level-3-pinned-only assertion to Phase 4, which extended it cleanly.

### D15 -- Track A arm: final verdict + feeder-tagged per-variant evidence

Status: **DELIVERED**.

Evidence: the locked shape (`evidence.feeder == "callgraph" -> per_variant{client,server,win,apple} + address_taken_residue` OR `evidence.feeder == "commented-register" -> register_site{source_file, source_line}`) is realized in the migration header comment and round-trip-confirmed at the Phase-3 boundary (the 3-gate JSONB read by the orchestrator: `sb_qtvlist_url` unreachable everywhere; `gl_outline_scale_world` -> `register_site` at `r_rmain.c:730`; `cl_bobhead` build-excluded reachable in every variant including the F9-amended server cell). The per-variant breakdown is what makes level-2 entities auditable -- the only trust the maintainer has when the dump has not been cross-checked.

### D16 -- Track B arm: Linked (element-grouped provenance)

Status: **DELIVERED**.

Evidence: `_handler_hud.py` emits `hud_element` = literal `HUD_Register` arg0 on every recovered command row; the Phase-3 loader stores it in `track_b_hud_recovery.evidence.hud_element`. The Phase-3 orchestrator re-verified the radar trio (`radar` / `+hud_radar` / `-hud_radar`) all element-linked to the one `radar` element at `hud_radar.c:1422`. The LLM is told the grouping; no stem-parsing required.

### D17 -- one shared acceptance-contract shape, per-track instantiation

Status: **DELIVERED**.

Evidence: `extractor_lib/_acceptance.py` ships the shared three-stage contract (548 lines: `run_stage1` line 188, `run_stage2` line 345, `route_by_level` line 81, `validation_record_ok` line 508, `classify_entity` line 109). `ezquake/accept-runtime-truth.py` (132 lines) is the single ezQuake instantiation. The structure mirrors the Phase-1 `extractor_lib/_callgraph.py` + `ezquake/verify-callgraph-probes.py` split (Ousterhout consistency: don't reinvent the house pattern).

### D18 -- stage 1: hard, all-or-nothing, loud, one-time-per-fork mechanism-validation gate

Status: **DELIVERED**.

Evidence: `run_stage1` invokes the Phase-1/Phase-2 probes as subprocesses (`subprocess.run([sys.executable, <script>], ...)`) -- pure COMPOSITION (X2/R5), zero re-authored logic. The acceptance-validated-ezquake.json embeds the literal subprocess stdout including `GATE 1/2/3 GREEN` and `ANCHOR 1/2/3 GREEN / R7 GREEN / R1 GREEN`; status:GREEN, all probes exit 0. ANY probe RED would have set status:RED + LOUD operator-facing line. NOT per-gate soft degradation.

### D19 -- stage 2: runtime dump is the overriding answer key

Status: **DELIVERED-DIFFERENT (F7 strengthening, operator-ratified)**.

Evidence: `version-pin-proxy.sh` (126 lines, executable) implements the F7-strengthened proxy: PRIMARY embedded-SHA leg ordered FIRST (regex `'ezQuake [0-9]+\.[0-9]+\.[0-9]+(-dev)? [0-9]+~[0-9a-fA-F]+'`, asserts `<hex>` is a prefix of `oracle_meta.ezquake:source_repo_commit`), then the original `front1-diff.sh:33-36` heuristic SANITY GATE legs as SECONDARY corroborators. `front1-diff.sh` is byte-immutable (provenance record). The Phase-4 orchestrator re-verified tamper-B (SHA->deadbeef, line ranges intact) TRIPS the PRIMARY leg ALONE while both SECONDARY heuristic legs PASS -- the embedded-SHA leg is strictly stronger than the heuristics. The shipped detection README correctly carries the F7 correction (the old "no embedded version banner / rests entirely on proxy" claim is replaced with the EXACT embedded-SHA framing).

This is the second-cleanest worked example of the arc's discipline (after D5/F9): a primary-source-verified strengthening of an existing spec mechanism without violating the spec's intent. The proxy stays a HARD sub-gate; the cross-check is conservative (proxy FAIL -> empty confirmed lists -> ZERO level-3); the new leg is materially stronger than the original heuristic. F7 captures the full path.

### D20 -- Track A application: two outputs, two consumers

Status: **DELIVERED-DIFFERENT (post-ship F20 visible-artifact correction)**.

Evidence: D20 Output 1 (always-on per-version L1 signal) shipped at `41965fe2` -- `track_a_reachability` populated for the 92 cvars + 74 commands at the pinned version; F1.callgraph_signal_pool_coverage GREEN. D20 Output 2 (narrow autonomous delete-list) shipped at `41965fe2` to 11 entities; primary-source verification at PR-prep 2026-05-20 (F20) found 5 of 11 LIVE via `.h` macro wrappers fanning into `.c` call sites -- a defect in the prior hand-authored Class 3 feeder (`.c`-only-scoped), NOT in this arc's call-graph mechanism. Visible artifact corrected at the boundary-flip commit `557d8703`: `_runtime_dead_entities.py:_CLASS3_BLOCK` trimmed to 4 verified-dead rows + `.c`+`.h` methodology accuracy edit + bonus tidy-up dropped; the .md regenerated mechanically to 6 entities (1 cvar callgraph + 1 cvar commented-register + 4 cmdline_params verified zero-consumer in `.c` AND `.h` under `src/`).

Build-excluded entities never appeared in the delete-list (the level-3 filter alone excludes them -- Phase-4 OQ-3 operator-ratified that build-excluded permanently stays level-2). The 164 build-conditional kept count is the conservative-call-graph win; auto-deleting them would have broken `gl_program_sky`-class real code, exactly the D3/D5 asymmetric-cost trap.

L1 mislabeling of the 5 cmdline_params persists -- they remain `dump-confirmed dead` in L1 -- until the parked cmdline-liveness sibling arc mechanizes the feeder with proper `.c`+`.h` scope. F20 is the trigger for that arc; no D-amendment because D7/OQ-1 carry-verbatim was correct in principle (the defect is in the carried CONTENT, not the carry rule). See YELLOW F20-residue below.

### D21 -- Track B application: recovered HUD commands as first-class entities

Status: **DELIVERED**.

Evidence: 129 recovered HUD commands shipped as first-class `type='command'` entities with `source_state='source_backed'` (D21's "distinguished only by the Track-B provenance field" -- Phase-3 OQ-2 ratified the `source_state` choice). Element-linked via `track_b_hud_recovery.evidence.hud_element`. Level-2-or-3 stamping per the Phase-4 conservative cross-check; F1.hud_recovery_first_class probe asserts NEVER NULL dump_confirmation for a recovered command (NOTHING withheld). F18 (post-Track-B-ship `command reverse` = 0) is corroborating evidence of correct shipment -- the 129 are now first-class so they no longer appear in the cmdlist-minus-L1 diff.

### D22 -- per-fork, per-track onboarding precondition (sharpens D2)

Status: **DELIVERED**.

Evidence: `validation_record_ok` in `_acceptance.py` is the structural gate; the absence of a per-fork descriptor IS the off-by-default toggle for FTE/QWCL/MVDSV. `accept-runtime-truth.py` instantiates ezQuake-only; no other fork wired. The off-by-default toggle is fail-safe-closed: missing/RED/wrong-commit -> NO signal -> today's pipeline (D6/D9 fail-safe-off).

### X1 -- phase atomicity / runnable boundary

Status: **DELIVERED**.

Evidence: every phase ship commit is git-history-verifiable (`51604f67`, `3c136826`, `895817bb`, `702421a1`, `f68b045b`, `59d34786`, `41965fe2`, `557d8703`). The Phase-4 checkpoint `702421a1` + the F15 fix-cycle `59d34786` + Phase-4 RE-VERIFY ship-record `f68b045b` is the cleanest worked example: a pre-existing latent defect surfaces at the acceptance gate, the arc opens a scoped fix-cycle, re-verifies on a clean DB, then ships. Every committed boundary leaves the extractor runnable.

### X2 -- verification regime self-contained / no regime collision

Status: **DELIVERED**.

Evidence: every phase verifies on its OWN output. Phase-1/2 mechanism probes run against `reachable()` / handler JSON; Phase-3 round-trips its own loader output; Phase-4 composes Phase-1/2 probes via subprocess (not re-authored); Phase-5 reads the Phase-3/4 signal + calls Phase-4's `route_by_level`. No phase's verification needs a later phase to exist. W4 (regime-collision temptation) held throughout.

### X3 -- non-corrupting zero-diff bar

Status: **DELIVERED**.

Evidence: the 8 F6 byte-identical stems remained byte-identical at every phase boundary (orchestrator-independently OFF/ON re-runs at Phase 1, 2, 3, 4 boundaries). Phase 5 adds a post-load generator + read-only F1 probes; it touches no extractor handler so X3 is structurally guaranteed. The asserted-in-prose-is-not-acceptable bar held: every X3 probe shipped the actual `diff -q` command + empty result, not prose.

### X4 -- single toggle seam, fail-safe-off, per-fork

Status: **DELIVERED**.

Evidence: two seams (`ENABLE_CALLGRAPH_PASSENGER` for Track A, `ENABLE_HUD_COMMANDS_HANDLER` for Track B) in `ezquake/extract.py`, each a single boolean with a one-line WHY. Off => not subscribed => zero edges/BFS/emission => today's pipeline exactly. Off is the default for non-ezQuake forks (structurally, since FTE/QWCL/MVDSV have their own `extract.py` with no analogous booleans). Toggle off = today's pipeline byte-for-byte (X3-verified at every boundary).

### X5 -- no-subagent-for-mechanical; subagent-default for code synthesis

Status: **DELIVERED**.

Evidence: every per-phase MD annotates every task with `subagent (<model> <effort>) + rationale` or `inline + rationale`. The arc is near-zero inline (the >70%-inline guard from the phase template was honored). Code synthesis tasks went to subagents; mechanical text edits (the dated F-corrections to phase MDs after execution) went inline. The qw-oracle Arc 1 inline-execution defect was structurally avoided.

### X6 -- model + effort per task shape

Status: **DELIVERED**.

Evidence: the call-graph mechanism design (Phase-1 Task 1) and the unified-schema design (Phase-3 Task 1) and the acceptance-contract shape (Phase-4 Task 1) and the delete-list contract shape (Phase-5 Task 1) all annotated `subagent (Opus MAX)` per X6's architecture-grade ceiling. Mechanical code synthesis against locked specs used Sonnet medium / Opus medium. Plan verification used Sonnet medium Explore-shape.

### X7 -- do NOT re-run detection; do NOT re-open the brainstorm

Status: **DELIVERED**.

Evidence: every phase MD's Recon-facts block re-ran the BANKED `front1-diff.sh` predicate against the BANKED dump (the X8/W2 sanity-gate re-check) and confirmed 74 cmd / 92 cvar / 129 reverse; no phase re-ran `cvarlist`/`cmdlist` detection. No phase re-opened D1-D22; the two amendments (D5, D7) were dated `decisions.md` corrections via operator ratification, not silent overrides.

### X8 -- spec/parking "verified" numbers are hypotheses until re-checked live

Status: **DELIVERED + GENERALIZED**.

Evidence: this is the arc's operational center of gravity, surfaced in five distinct execution-time refutations (F4 D7.1 textual-pass premise; F9 D5 not-compiled qwsv-model premise; F11 migration `015` header conflation; F18 stale check-2 literal; F19 first-framing "model omits renderer" premise refuted by primary source). Each was operator-ratified or accepted as arc-correct via a dated correction; none was silently fixed. The memory captures `feedback_parking_verified_state_is_hypothesis.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_verify_dispatched_terminal_claims.md`, `reference_runtime_dump_self_certifies_commit.md` encode the durable discipline.

### X9 -- repair via re-extract, never SQL UPDATE in place

Status: **DELIVERED**.

Evidence: F15 was the worked example: a Phase-3-loader idempotency defect, fixed by re-extract+re-load via the corrected `load-hud-commands.ts` (commit `59d34786`, +28/-1 lines) -- never by an `UPDATE command_versions SET source_state='source_backed' WHERE ...`. The Phase-4 X9-grep probe (`! grep -nE "UPDATE[[:space:]]+(cvar_versions|command_versions)[[:space:]]+SET" ...`) is a positive probe that catches the bare-UPDATE shape; verified at the Phase-4 RE-VERIFY gate. F15 was correctly refused the F13-style recalibration (recalibrating 612/19 would have baked in the defect).

### X10 -- ASCII / output discipline in all shipped docs and code

Status: **DELIVERED**.

Evidence: `LC_ALL=C grep -nP '[^\x00-\x7F]'` over every phase MD + the shipped .md + every shipped source file returns no matches; em-dash/en-dash/emoji absent throughout. Phase 5 caught a self-referential X10 defect during sub-agent verification (the grep pattern that searches for non-ASCII embedded literal em/en-dash glyphs) and fixed it via the `\x00-\x7F` bracket pattern.

### Non-goals (deliberate out-of-scope)

Status: **DEFERRED (all explicitly captured)**.

- **The `hud_<name>_<subvar>` settings-cvar half** -- already first-class L1 via `_handler_cvars.py:_synthesize_hud_cvars`; D11 amended struck the cvar half from Track B; R7 zero-cvar probe primary-source-verified on the shipped handler.
- **The ezQuake help-JSON documentation-gap arc** -- parked future arc at `docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`, sequenced AFTER this arc (genuine dependency: this arc produces the entity set it consumes); confirmed not started.
- **Pre-existing 1429 `hud_*` cvars carrying the D16 element key** -- cheap future sibling wire, parked.
- **`Cmd_AddLegacyCommand` persistence; trailing-comment harvester precision; F20 cmdline-liveness feeder** -- all three are siblings of the L1-extractor sibling arc at `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`; HANDOVER.md line 105 confirms F20 joined as a third sibling.
- **FTE / QWCL / MVDSV ship** -- per-fork gated follow-ons (D2/D22); confirmed off (no per-fork descriptors in `_acceptance.py`).
- **Detection-side runtime-dump automation** -- parked future detection-side work; not started.
- **L1 entity-name case fidelity** -- mini-arc already SHIPPED (`8093e42f`) before this arc started; this arc consumed its clean pools.
- **Re-running detection / re-deriving the candidate pools** -- DONE and banked (X7).

### Spun-out mini-arc and revised pass plan

Status: **DELIVERED (spec section closed correctly)**.

Evidence: the case-fidelity mini-arc shipped at `8093e42f` before this arc started; the spec's "SHIPPED 2026-05-16 -- and it MOVED THE PASS-2 PREMISE" section is accurate -- this arc consumed the clean 74/92/129 pools and never re-derived them. The revised pass plan (Passes 1-5) matches the executed phase plan (5 sequential phases, fresh-terminal-per-phase).

## Shipped beyond spec

The arc shipped several items the brainstorm could not anticipate. None are scope creep; all are execution-time learning that makes the deliverable richer than the spec.

- **F7 PRIMARY embedded-SHA leg of the version-pin proxy.** The spec/D19 specified the heuristic `front1-diff.sh:33-36` SANITY GATE as the hard sub-gate. Phase-4 execution found the dump self-certifies its commit via the `version`-command output line (`ezQuake 3.7.0-dev 8084~3f9e724fa` at line 3347, outside the diff ranges). The PRIMARY leg ordered first + the heuristic legs as secondary corroborators is strictly stronger than the original spec. Recommendation: bake this into D19 of any future fork's spec amendment (the runtime-dump self-certification pattern generalizes to any engine with a `version`-command output banner).

- **F8 STANDING RULE: migration ordinal executor-derived live.** The pre-execution cross-phase audit discovered the parallel ktx-mvdsv arc consumed ordinal `014` post-freeze; the executor-derived ordinal at execution time (currently `015`) is now the durable rule for any concurrent arc on a shared migration chain. The `quality-grid.ts` line-cites re-derive by symbol live for the same reason. Recommendation: arc-planner skill should bake this into the scaffold-creation step for any future arc that touches `db/migrations/` or `quality-grid.ts`.

- **Cross-phase additive seam pattern (Phase-3 OQ-1 + Phase-4 OQ-2).** Both Phase 3 and Phase 4 additively touched the prior phase's files (Phase 3 added a seam to Phase-1's `extract.py`; Phase 4 added a D22 gate + stage-2 stamp to Phase-3's loaders). Both operator-ratified at the gate as "additive-only, public-contract-respecting"; X3 zero-diff probes structurally guard the safety. The pattern (additive cross-phase touch through a prior phase's PUBLIC contract, never new exception machinery) is a durable shape worth promoting to the phase-template's drafter checklist.

- **F11 immutable applied-migration header policy.** The Phase-3 migration `015` header comment conflated Track-B's recovered-HUD scope with the Track-A 74/D20 pool. The orchestrator's accept-as-is disposition (rather than edit an immutable sha256-tracked applied migration, or roll a no-op `016` clarifying migration) is a worked example of when CONSUMER-FACING documentation (SCHEMA.md) is drained in place while the immutable artifact carries a known-but-minor inaccuracy. Recommendation: capture in the migration-conventions section of `apps/qw-oracle/SCHEMA.md` as the established policy.

- **Three-way independent boundary-verification pattern.** The orchestrator's "structural + primary-source-by-symbol + empirical" three-way re-verification (worked through Phase 3 / Phase 4 / Phase 4 RE-VERIFY) became the durable phase-boundary discipline. The pattern was applied without an explicit rule in the spec, but it is the durable shape that makes the arc-history retrospective trustworthy. Recommendation: promote to a `feedback_orchestrator_three_way_boundary_verification` memory file, or fold into the existing `feedback_verify_dispatched_terminal_claims`.

- **The "L1 contextual build-availability" future arc (post-Phase-5 capture).** Phase-5 slime review produced a strategic realization the brainstorm could not anticipate: L1 is build-agnostic, but the user's question is build-specific. The contextual-availability arc was parked at `docs/superpowers/parking/2026-05-20-l1-contextual-build-availability-arc.md` (commit `c8d70625`) as the natural next product direction. Operator framing 2026-05-20: the dead-code upstream PR is a polite courtesy; the real product axis is L1 correctness feeding consumer-side MCP answer quality. This reframes the arc's deliverable: not "delete 6 things", but "label 92/74 candidates with `gl_program_sky`-grade context."

- **F20 visible-artifact correction without L1 data fix.** Phase 5's post-ship F20 discovery (5 of 11 cmdline_params LIVE via `.h` macro wrappers) is corrected at the .md layer (`_CLASS3_BLOCK` constant, regenerated to 6 entities) without an L1 data fix (the 5 mislabeled cmdline_params remain `dump-confirmed dead` in L1 until the parked cmdline-liveness sibling arc lands). The containment discipline (visible-artifact correct + L1 mislabel tracked + sibling arc trigger) is a worked example of "fix what the consumer sees, route what's deep" -- worth promoting as a durable pattern.

## Open YELLOWs from sign-off

Three OPEN findings remain at sign-off, plus one this reviewer surfaced. None block the arc's deliverables; all are routed.

- **F16 -- `[load-version] fully-orphaned entity` log noise (ADVISORY, non-blocking).** Each `extract-tag --force` re-load logs ~117 benign warnings for Track-B HUD commands whose `command_versions` rows the step-3 retreat-scan sees before the 3e post-loop creates them; final state has 0 real orphans. Investigation complete (orchestrator-adjudicated benign at F15 re-gate 2026-05-18). Routed to HANDOVER.md as a log-hygiene small-followup. Recommendation: scope the step-3 retreat-scan's fully-orphaned warning to exclude the known Track-B-pending set; ~30-min fix, F8-shared substrate so its own scoped change with the all-project F1 gate.

- **F17 -- Phase-3-loader fail-safe-completeness gap (NON-Phase-5-blocking).** Toggle-off/RED keeps the level-2 Track-A column on an already-GREEN DB (stale 9th/10th artifact + `extract-tag.ts` 3e/3f `existsSync` gating + `natural-keys.ts:234` COALESCE). Autonomous level-3 tier provably protected (0 `dump-confirmed` on RED AND broken-pin); residual is the never-auto-shipped level-2 tier carrying prior-correct data. Investigation complete (orchestrator-primary-source-verified the mechanism; NOT-F15, NOT-RE-VERIFY-introduced -- 3 root-cause files byte-unchanged since `702421a1`). Routed to HANDOVER.md as a Phase-3-loader fail-safe follow-up (X9 re-extract; all-project F1 gate; NEVER folded). Recommendation: a small fix-cycle (~1-2 hour scope) -- gate `extract-tag.ts` 3e/3f on the live toggle / D22 validation record / regen-this-run, and/or have `emit_callgraph_signal.py` clear the stale 9th/10th artifact on OFF/RED.

- **F20-residue -- L1 mislabeling of 5 cmdline_params persists.** The visible artifact (`ezquake-runtime-dead-entities.md`) was corrected at the boundary-flip (6 entities, not 11), but the 5 mislabeled cmdline_params (`-cheats`, `-enablelocalcommand`, `-progtype`, `-r-debug`, `server_democache_kb` bonus enum) remain `dump-confirmed dead` in L1 because the prior hand-authored Class 3 cmdline-consumer-presence feeder is `.c`-only-scoped and the loader faithfully loaded what the feeder produced. Investigation complete (orchestrator primary-source-verified each of the 5 wrapper macros + consumer sites at pin `3f9e724f`). Routed to the L1-extractor sibling-arc parking doc as the cmdline-liveness feeder mechanization trigger. Recommendation: mechanize the cmdline-consumer-presence feeder with proper `.c`+`.h` scope as part of the L1-extractor sibling arc (`docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`); at that arc's ship, the 5 mislabeled cmdline_params reclassify automatically and the `_CLASS3_BLOCK` editorial template can retire in favor of feeder-derived rows.

- **Findings during review -- Phase-5 MD F12-class literal-text defect (NEW, non-blocking).** Phase-5 MD verification check 3 (line 707) still names `bun scripts/load-knowledge/index.ts load-version --project ezquake --version head --force` -- the same wrong subcommand that Phase 4 received an F12-class dated correction for (Phase-4 MD top-of-file dated block + inline F12 markers in the verification commands). Phase-5 MD does not carry an analogous F12-class dated correction block; line 707 is the only `load-version` literal in Phase-5 MD outputs (line 110 is prose). A future copy-runner would hit the same wrong-semantics issue (the executor would have to substitute `extract-tag --project ezquake --version head --force --skip-release-notes` at execution time). Phase 5 was DRAFTED 2026-05-17 before Phase 4 caught F12 at execution on 2026-05-18; the Phase-4 correction did not propagate to Phase 5's MD. Code/data are correct (the Phase-5 executor ran the right commands at execution). This is an MD-literal-only defect, identical class to F6/F10/F12/F14. Recommendation: apply a dated F12-class MD-correction to Phase-5 MD verification check 3, narrative-preserved house style; ~5-min orchestrator edit. This finding should be ADDRESSED before any future operator copy-runs Phase 5's verification block from the locked MD.

## Recommendations for Arc N+1 prep

Listed in increasing scope. The arc's primary deliverable (L1 truthfulness for ezQuake) is complete; these are follow-ups that strengthen the result or unblock dependent work.

1. **Apply the F12-class MD-correction to Phase-5 MD verification check 3.** Phase 5 MD line 707 still names `load-version`; Phase 4 received the matching correction; Phase 5 didn't. ~5-min orchestrator edit, narrative-preserved house style. Source: this review's "Findings during review" YELLOW. No dependencies; can land any time.

2. **F16 log-hygiene small-followup.** Scope the step-3 command retreat-scan's fully-orphaned warning to exclude the known Track-B-pending set (or defer it until after the 3e post-loop). ~30-min fix; F8-shared substrate (`load-version.ts`); its own scoped change with the all-project F1 gate. Source: review-findings F16. No dependencies; can land any time.

3. **Upstream PR to ezquake-source (6-entity prune list).** Branch `cleanup/runtime-dead-entities` ready at `research/repos/ezquake-source/` per HANDOVER.md (off `upstream/master ee06641f`, off pin `3f9e724f`, zero commits yet). Per the regenerated `ezquake-runtime-dead-entities.md`: 2 cvars + 4 cmdline_params. Operator-framed: minimal PR body, no methodology, no side-findings (devs care if the list is correct). Upstream attribution per CLAUDE.md: `Assisted-by: Claude:<model-id>` trailer on PR commits; NO `Co-Authored-By`, NO AI `Signed-off-by`; operator signs the DCO via `git rebase --signoff upstream/master` after commits land. ~30 min: ~3 deletion commits + `gh pr create`. Source: D20 Output 2 deliverable. No dependencies; can land any time.

4. **F17 Phase-3-loader fail-safe-completeness fix-cycle.** Gate `extract-tag.ts` 3e/3f on the live toggle / D22 validation record / regen-this-run, and/or have `emit_callgraph_signal.py` clear the stale 9th/10th artifact on OFF/RED. X9 re-extract to PROVE checks 4/7 literally `count==0`. F8-shared substrate -- its own scoped fix-cycle with the all-project F1 gate, NEVER folded. ~1-2 hour scope. Source: review-findings F17 + HANDOVER.md. No dependencies; can land any time.

5. **Promote the `feedback_orchestrator_three_way_boundary_verification` memory file (optional).** The "structural + primary-source-by-symbol + empirical" three-way pattern the orchestrator applied at Phase 3 / Phase 4 / Phase 4 RE-VERIFY became the durable boundary-verification discipline; worth a dedicated memory file or a fold into `feedback_verify_dispatched_terminal_claims`. ~5-min memory-file write. Source: this review's "Shipped beyond spec" item.

6. **L1-extractor sibling-arc kickoff (cmdline-liveness + the other two siblings).** The L1-extractor sibling-arc parking doc (`docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`) now carries THREE siblings: `Cmd_AddLegacyCommand` persistence, trailing-comment harvester precision, and F20 cmdline-liveness feeder mechanization. Trigger: operator picks it up when ready; mechanizes the feeder with `.c`+`.h`-aware consumer-presence detection. At ship the 5 mislabeled cmdline_params in L1 reclassify automatically. Sized as an arc (multi-phase: 3 siblings, likely 4-6 phases), needs arc-brainstormer. Source: F20 + the parking doc.

7. **ezQuake help-JSON documentation-gap arc.** The genuine sequenced follow-on per spec non-goals: this arc produces the true entity set the doc-gap arc consumes (now-first-class HUD commands + the ~165 `system-generated:true` stub help-JSON entries from the spec section "Out of scope"). The HUD command family is absent from `help_commands.json` by design (`help.c:967-970` skip), and the doc-gap arc's shape is "map the gap from post-this-arc L1 -> propose descriptions -> upstream PR to nano/slime including the `help.c` code-pointer." Parking doc: `docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`. Sized as an arc; needs arc-brainstormer. Source: spec "Out of scope" + non-goals.

8. **L1 contextual build-availability arc.** Two paths captured at `docs/superpowers/parking/2026-05-20-l1-contextual-build-availability-arc.md`: (a) cheap interim -- oracle answer-shape hedge using the existing Track-A level-2 signal + a small heuristic table (sized for `superpowers:writing-plans` directly); (b) proper per-build-profile arc -- explicit CMake-options modeling + renderer-dispatch-table modeling + legacy-alias chain capture + per-fork client profile passed at query time (multi-week, needs `arc-brainstormer`). The strategic realization is that L1 is build-agnostic but the user's question is build-specific; this is the natural next product direction per operator framing 2026-05-20. Source: post-Phase-5 capture; the boundary-flip commit `c8d70625` parked it. Substantial scope.

9. **FTE / QWCL / MVDSV per-fork onboarding (deferred per D2/D22).** Each fork needs (1) a fork-specific known-answer harness (probe entities re-derived from that fork's own source), (2) a fork-pinned runtime dump for level-3 (absent it the fork rides level-2 -- a valid state, not a failure). MVDSV is server-only -> Track B N/A there while Track A applies. Cost dominated by producing each fork's pinned runtime dump; uneven (MVDSV cheap, QWCL likely expensive, FTE between). Per-fork gated; off-by-default; each its own arc when picked up. Source: D2/D22.

The arc shipped clean: both North-Star directions met for ezQuake; every spec section DELIVERED or DELIVERED-DIFFERENT with operator-ratified dated corrections; every finding routed; no MISSING items; three OPEN YELLOWs correctly NON-blocking and routed; one reviewer-found MD-literal defect that does not block the deliverables. The arc's signature pattern -- "execution surfaces a refuted premise, the executor STOPS, the operator ratifies a dated amendment, the conclusion is unchanged, every downstream MD propagates a dated correction" -- worked end to end across D5/F9, D7/F4/F5, D19/F7, and F20. Final disposition: **GREEN**, with one ADDRESSABLE small-followup (the F12-class Phase-5 MD literal correction) recommended before the next pass over the scaffold.
