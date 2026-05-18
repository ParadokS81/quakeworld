# Review findings -- brainstorm-residual + correction + risk ledger

**This is NOT a prior-plan defect audit.** This arc has no prior monolithic
plan. The brainstorm (Passes 1-5) was thorough and is closed. This file is
the watch-list a phase drafter consults: corrections the spec prose got wrong
that drafters must apply, implementation residuals the brainstorm explicitly
deferred to arc-planner/executor (each owned by a named phase), and risks to
defend against. New risks found during phase drafting append here with the
next sequential suffix and a phase tag.

Severity legend: **F** = confirmed correction (spec/prose is wrong; apply the
fix). **R** = implementation residual (brainstorm-deferred; the owning phase
must resolve it). **W** = risk / watch-list (defend against it).

---

## F -- confirmed corrections (apply these; do not propagate the wrong form)

### F1 -- D11 prose mislabels `order` as gated

**Correction:** The original D11 body says the structural subvar `order` is
"(gated)". Live `hud.c:1241-1360` (audit-verified,
`docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md`
section 3) shows `order` is **UNCONDITIONAL** (bare block 1241-1246 scoping a
local buffer, NOT an `if`); `show` is the gated subvar (`if (show)` 1265).
Both existing handlers emit `order` unconditionally (correct). The handler
code is right; only the spec prose annotation is wrong.

**Impact on this arc:** LOW -- the cvar half is struck (D11 amended), so the
structural subvar gating does not drive any code this arc writes. Recorded so
a Track-B drafter reading the spec body is not misled into thinking the
command contract has an analogous mislabel. The command-half gating
(`+hud_`/`-hud_` on `HUD_PLUSMINUS` + non-NULL `show`) is independently
correct in D8.

**Resolved by:** decisions.md D11 amendment (prose-correction bullet).

### F2 -- parking-doc candidate-pool numbers are STALE

**Correction:** `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
Scope section says "97 cvar + 74 command" and "~166 pool" and "132-command
reverse anomaly". These are PRE-mini-arc figures. The spec's SHIPPED section
(re-measured 2026-05-16 on the shipped DB after entity-name case-fidelity
mini-arc `8093e42f`, verified not inferred) is the source of truth:
**74 commands + 92 cvars** banked HEAD pool; Track-B reverse-diff
**~129 genuine hidden commands** (132 -> 129; the case trio was the only
case noise, NOT the bulk).

**Action for every drafter:** use 74 / 92 / 129. Never quote the parking
Scope numbers. Re-verify against the live DB at execution (X8 / W2).

**Resolved by:** decisions.md X7; this finding.

### F3 -- parking-doc variant count is STALE

**Correction:** The parking doc says the extractor "dual-parses
client/server (27 conditional macros)". The spec D3 corrects this to **4
build variants: client / server / win / apple**, verified live in
`extractor_lib/clang_config.py` (`clang_args_for` / `_server_for` /
`_win_for` / `_apple_for`). The per-config union (D5) MUST cover all 4 or
win/apple-only registrars get false-accused (a D3 violation).

**Action for the Track-A drafter:** recon `clang_config.py` live; confirm the
4-variant set before the root-set/union logic is load-bearing.

**Resolved by:** decisions.md D3 implication; this finding.

### F4 -- D7 "the extractor already runs textual passes" is FALSE

**Correction:** D7's Implication (and the Phase-1 drafter prompt) assert the
extractor already runs a commented-register textual pass to "surface". Live
recon during Phase-1 drafting (overseer-re-verified: repo-wide grep of
`scripts/extractors/**/*.py` incl. `_legacy/`) proves NO such pass exists
anywhere. The only textual-pass hit is the retired
`_legacy/extract-ezquake-cvars-clang.py` *trailing help-desc comment*
harvester -- a different concern, archived/unused. `gl_outline_scale_world`
was hand-grep + runtime-dump classified, not auto-fed. Same
`feedback_parking_verified_state_is_hypothesis` shape as the D11 amendment.

**Action for every Track-A drafter/executor:** feeder (b) is BUILT as a
minimal standalone commented-register textual scanner (~15-line regex over
raw source) inside `_callgraph.py`, architecturally separate from the
call-graph (D1 no-blend). D7.1's two-feeder structural split STANDS;
Phase-4 Gate-2 and Phase-5 R4 unchanged.

**Resolved by:** decisions.md D7 AMENDMENT 2026-05-17 (operator-ratified
2026-05-17 via Phase-1 OQ-1); this finding.

### F5 -- D7.2 registrar derivation is asymmetric (commands vs cvars)

**Correction:** D7.2 "registrar is the enclosing function of the
already-recorded registration site (no new mechanism)" holds literally only
for COMMANDS (`_handler_commands.py` records `enclosing_function` via its
`_func_stack`). For CVARS `_handler_cvars.py` records only the `cvar_t`
VAR_DECL site (file scope, NO enclosing function); the Track-A passenger
must itself bind `Cvar_Register(&X)` CALL_EXPRs to their enclosing
FUNCTION_DECL via the shared visitor's existing `enter_function`/
`exit_function` hooks (D6-inherent, NOT a new mechanism). Overseer-verified
(`cl_view.c:49` decl vs `:1160` Cvar_Register inside `V_Init` `:1127`).

**Action:** Phase-1 (A) owns the passenger-side derivation. Phase-3 (S)
must know the Track-A per-variant evidence is PASSENGER-derived, not
handler-recorded -- affects R2's D15 evidence field shape.

**Resolved by:** decisions.md D7 AMENDMENT 2026-05-17; Phase 1 mechanism;
this finding.

### F6 -- the X3 zero-diff baseline file set = the 8 LIVE output_filename stems

**Correction:** any phase shipping the X3 non-corruption diff must enumerate
the EXACT 8 live handler `output_filename` values, NOT the intuitive/spec
names. Verified live (`grep output_filename
apps/qw-oracle/scripts/extractors/ezquake/_handler_*.py`, 2026-05-17):
`ezquake-commands-ast.json`, **`ezquake-variables-ast.json`** (cvars -- stem
is `variables`, NOT `cvars`), `ezquake-macros-ast.json`,
**`ezquake-cmdline-params-ast.json`** (stem `cmdline-params`, NOT `cmdline`),
`ezquake-hud-elements-ast.json`, `ezquake-keynames-ast.json`,
`ezquake-asset-cvar-bindings-ast.json`,
`ezquake-asset-loader-sites-ast.json`.

**Why it matters:** Phase 1's approved Task-2 X3 loop listed
`ezquake-cvars-ast.json` + `ezquake-cmdline-ast.json` -- neither file
exists, so `diff -q` would have silently no-op'd X3 on cvars (92 of the
banked pool) + cmdline. Surfaced by the Phase-2 drafter's cross-check; the
Phase-1 overseer review missed it (a verification-layer residual --
`feedback_verification_layer_catches_lift_residuals`: the gate's value is
catching what the prior review did not predict).

**Action for every phase shipping X3 (A done corrected; B correct; S/APP):**
enumerate the 8 stems above; never the spec/intuitive names. The 9th file
`ezquake-hud-commands-ast.json` (Phase 2) is additive -- NOT in the
byte-identical set; it gets the separate off-absent / on-present check.

**Resolved by:** Phase-1 MD orchestrator-correction 2026-05-17 (dated note
in its Task-2 block); Phase-2 MD already uses the live stems; this finding.

### F7 -- dump DOES carry an embedded commit banner; "pin rests ENTIRELY on the proxy" is FALSE

**Correction:** The detection README
(`apps/qw-oracle/data/detection/README.md`, "Version-pin provenance (R6)")
and the Phase-4 MD Recon facts both assert the runtime dump carries NO
embedded version banner and commit-pinning rests ENTIRELY on the
`front1-diff.sh:33-36` SANITY GATE. Orchestrator primary-source check
2026-05-17 (Phase-4 gate) refutes this: dump line 3347 is the
`version`-command OUTPUT `ezQuake 3.7.0-dev 8084~3f9e724fa` -- a direct
embedded commit prefix (`~3f9e724fa` == the pin `3f9e724fa608e516...`),
sitting in the post-macrolist tail OUTSIDE all three `front1-diff.sh`
extraction ranges (7-564 / 571-3272 / 3276-3344) so it never polluted the
74/92/129 diff. The README author saw only line 545 (the `version` command
NAME in cmdlist) and missed line 3347 (its OUTPUT). Same
`feedback_parking_verified_state_is_hypothesis` shape as F4/D7.1 and the D11
strike.

**Impact on this arc:** the proxy stays a valid hard sub-gate, but the dump
self-certifies its commit -- a strictly stronger, EXACT D19 sub-gate than
the "no known-live cvar leaked" heuristic (the strict-bar
autonomous-level-3 consumer -- `reference_rigor_bar_follows_consumer`).
Provenance for the in-repo dump is CONFIRMED three independent ways
(embedded SHA + orchestrator R6 re-run GREEN 74/92/129 + session-3
byte-identical cmp); prerequisites item 4 provenance CLOSED.

**Action for the ACC phase:** correct the false "no embedded banner / rests
entirely on the proxy" Recon fact AND the detection README's "Version-pin
provenance (R6)" section; wire the embedded `~<sha>` vs `oracle_meta
ezquake:source_repo_commit` match as the version-pin proxy's PRIMARY hard
leg (operator-ratified 2026-05-17, S2), keeping `front1-diff.sh:33-36` as a
secondary corroborator; `front1-diff.sh` stays byte-immutable (the SHA leg
lives in `version-pin-proxy.sh`). Future forks/pins inherit the stronger
exact check.

**Resolved by:** Phase-4 MD revision 2026-05-17 (S2; orchestrator gate
primary-source finding, operator-ratified); this finding.

### F8 -- cross-arc drift: a sibling arc consumed migration `014` + grew `quality-grid.ts` POST-FREEZE

**Correction:** The Phase-3 MD (frozen 2026-05-17 14:04) recon'd "latest
migration = `013` -> Phase 3 is `014`" and hard-coded
`014_l1_runtime_fidelity_provenance.sql` (~13 refs), propagated to Phase 4
(2 refs), Phase 5 (2 refs), README (1). The PARALLEL, out-of-scope
**ktx-mvdsv describe-fill arc** then committed `95e8d726` (2026-05-17
17:54, ~3h50m AFTER P3 froze; also after P4 16:15 / P5 17:41) which
(a) consumed migration ordinal `014` (`014_description_provenance_trail.sql`
-- `ALTER TABLE entities`, a DISJOINT schema object from enforce-L1's
`cvar_versions`/`command_versions` columns, so no column collision) and
(b) appended ~166 lines to `apps/qw-oracle/scripts/load-knowledge/
quality-grid.ts` (its `F1.describe_fill.*` probes -- a DISJOINT probe
namespace, the `REGRESSION_PROBES[]` registration idiom intact, so no
name collision) + 23 lines to `SCHEMA.md`. Net: the enforce-L1 plan's
frozen migration ordinal is a duplicate (X1, CRITICAL -- a second `014`
in an append-only sha256-tracked chain is silent-corruption-class), and
every frozen `quality-grid.ts` line-cite (`probeJsonbNotStrings`
~`:217-272`, the session-3 re-verify `:217/229/1968`) is shifted (X2,
SUBSTANTIVE -- an executor following a frozen cite reads the wrong
lines). Same root cause; invisible to every PAIRWISE per-phase gate
(the drift landed post-freeze, from a sibling arc) -- caught only by the
operator-requested pre-execution CROSS-PHASE audit (2026-05-17). This is
the `feedback_parking_verified_state_is_hypothesis` / X8 family
GENERALIZED to cross-arc drift: a point-in-time "verified" recon is not
a permanent guarantee when a sibling arc shares the migration chain +
`quality-grid.ts`.

**Impact on this arc:** the migration ordinal MUST be EXECUTOR-DERIVED at
execution (`(highest db/migrations/ int)+1`; `015` at this writing but
RE-DERIVE -- the ktx-mvdsv arc is still active and may consume more),
NEVER frozen; every `quality-grid.ts` reference is re-derived by symbol
search at execution, never trusted frozen. No design decision changed --
NO `decisions.md` D-amendment (X8 already governs "verified is a
hypothesis"; this records its cross-arc materialization).

**Action for every Phase-3/ACC/APP drafter/executor:** use `<NNN>`
executor-derived ordinal language; never hard-code `014`/`015`; re-derive
all `quality-grid.ts` line numbers live (the probe-name namespace is
disjoint and the registration idiom is intact -- not alarming, just
shifted).

**Resolved by:** Phase-3 MD targeted revision 2026-05-17 (the recon fact
+ Task 2 ordinal-derive step + `<NNN>` throughout + a dated correction
preserving the session-3 narrative); propagated to Phase-4 / Phase-5 /
README; operator-approved at the pre-execution audit gate
(orchestrator-applied mechanical revision -- no redraft, no D-amendment);
this finding.

### F9 -- D5 `not-compiled` underivable for build-system-excluded files (Phase-1 Gate-3 RED; phase-MD Recon "verified" premise refuted)

**Correction:** Phase-1 MD "Recon facts (verified)" (server-cascade bullet
+ the `cl_bobhead` 3-gate ground truth, lines ~137-145/198) assert
`src/cl_view.c` is "client-only (quakedef.h, not qwsvdef.h) -> NOT compiled
in the SERVERONLY build" so `cl_bobhead`'s registrar `V_Init` resolves to
D5's `not-compiled` third state in the server variant. Live execution
refutes the DERIVABILITY: the Phase-1 mechanism's `_compiled[variant]` set
means "this `.c` was parsed under the variant's clang flags with the body
syntactically present", NOT "this file is linked into the variant's
binary". Primary-source verified (executor, 2026-05-17, pinned HEAD
`3f9e724f`): `clang_args_server_for` = client args + `-DSERVERONLY
-DSERVER_ONLY` (clang_config.py:72-73); `cl_view.c` has NO file-scope
`#ifndef SERVERONLY` / `#ifdef CLIENTONLY` guard (only three `#ifdef
X11_GAMMA_WORKAROUND` blocks; `V_Init` @ :1127 unguarded; `quakedef.h`
included unconditionally @ :21); `extract.py:312` walks every `src/*.c`
uniformly under each variant's flags. So under `-DSERVERONLY` libclang
parses `cl_view.c` in full, `enter_function(V_Init)` fires, `V_Init` lands
in `_compiled["server"]` -> server state resolves `reachable`/`unreachable`,
never `not-compiled`. `cl_view.c`'s server-build exclusion is a
CMake/Makefile source-list (linker-level) decision INVISIBLE to the
per-file libclang walk. The `#ifdef`-guarded case (`sv_main.c` SERVERONLY
`Host_Init`) IS preprocessor-visible and works; build-system/source-list
exclusion -- the LARGE class of client-only files -- does not. Same
`feedback_parking_verified_state_is_hypothesis` / X8 / F4 / D7-amendment /
D11-strike shape (a "verified" premise refuted by live execution).

**Impact on this arc:** Phase-1 phase-boundary check 3 Gate 3 RED
(`cl_bobhead` server: expected `not-compiled`, got `reachable`); Gates 1
(`sb_qtvlist_url` genuine-dead/callgraph) + 2 (`gl_outline_scale_world`
genuine-dead/commented-register) GREEN. D3 conservative posture is NOT
violated -- the defect makes MORE variants count "compiled", which cannot
manufacture a false genuine-dead (a live client cvar stays reachable in
client -> reachable_anywhere -> build-excluded; a true ghost stays
unreachable-in-every-compiled-variant -> genuine-dead; conclusions stable
in the analyzed cases, only the per-variant EVIDENCE breakdown wrong). It
is a D15 per-variant-evidence-fidelity defect: the auditable breakdown that
is level-2's only trust mis-reports the build dimension for client-only
files in the server variant. Systemic (Gate 1 GREEN only because its
assertion does not pin the not-compiled state; the same defect affects it).
Phase 1 cannot self-validate -> the phase does NOT ship; BLOCKED pending an
operator-ratified `decisions.md` amendment (the D7/D11/F4 precedent -- the
executor surfaces + STOPS, does not redesign or amend `decisions.md`).

**Action / proposed dispositions (operator-routed; orchestrator routes the
`decisions.md` amendment -- NOT executor scope):**
- **Option A (full fidelity):** teach the mechanism each variant's true
  SOURCE LIST (parse ezquake-source's CMake/Makefile server/win/apple
  targets); a registrar whose file is not in a variant's source set ->
  `not-compiled` for that variant. Restores D5/D15 fully. Heaviest --
  Task-1 redesign + a build-file-parsing dependency.
- **Option B (scope + amend, the 80/20):** amend D5's not-compiled
  DERIVATION to "preprocessor-derivable exclusions only"; build-system-
  excluded files show `reachable`/`unreachable` in the non-target variant;
  revise Gate 3's expected `cl_bobhead` server state accordingly.
  Conservative posture preserved (D3 intact; D5 "accept under-report" + D19
  "dump is the overriding answer key" already tolerate the precision loss).
  Lightest -- a dated D5-derivation-scope amendment + Gate-3 expected-value
  revision; accept reduced D15 build-dimension precision for client-only
  files.
- Executor recommendation: lean Option B (grug 80/20; D3 not violated; D19
  dump is the overriding answer key so level-3 ship-safety unaffected) --
  but only Option A fully restores D15's "provenance a reader can trust"
  for level-2 versions. Operator decides; not an executor call.

**Orchestrator primary-source refinement (2026-05-17 -- per
`feedback_verify_dispatched_terminal_claims`; the executor body above is
the record of the path, refined here, not rewritten).** The executor
framed the gap as "build-system/Makefile source-list (linker-level)
exclusion" and Option A as "parse ezquake-source's CMake/Makefile
server/win/apple targets". Orchestrator primary-source check found that
SHARPER: ezquake-source's `CMakeLists.txt` has exactly ONE
`add_executable(ezquake)` over ONE 309-file source list (all 16 `cl_*.c`
INCLUDED); there is NO separate dedicated-server / win / apple target, and
CMake never sets `SERVERONLY` (pure source-level `#ifdef` define; 27 src
files carry genuine guards; `cl_view.c` carries none). So there are NO
per-variant CMake targets to parse -- **Option A is INAPPLICABLE, not
merely "heaviest"**: nothing could make `cl_view.c` not-compiled-in-server
because ezQuake-source's real build compiles it under any preprocessor
config. The drafter premise imported the HISTORICAL `qwsv` dedicated-
server model this codebase does not implement; the mechanism's
`_compiled[server]` for an unguarded client file is CORRECT for ezQuake-
source's real build. The orchestrator independently re-ran the harness and
corroborated the executor EXACTLY (`GATE 1 GREEN`, `GATE 2 GREEN`; Gate 3
expected `server:not-compiled` vs actual `server:reachable`, conclusion
`build-excluded` correct, `harness exit=1`).

**Resolved by:** Option B operator-ratified 2026-05-17 (one question,
plain-English consequences; the D7/D11/F4 precedent). Dated `decisions.md`
D5 AMENDMENT 2026-05-17 applied by the orchestrator: D5's three states +
combination logic UNCHANGED; the DERIVATION of `not-compiled` SCOPED to
preprocessor-derivable exclusion only; build-system/source-list exclusion
NOT modeled (ezQuake-source: one build target, no per-variant source
list). D3 intact; D19 / level-3 autonomous-ship safety unaffected; bounded
D15 precision loss lands only in level-2 build-dimension auditability for
client-only-file registrars in the server variant. Propagated as dated
corrections (narrative preserved): Phase-1 MD Recon #5 server-cascade
bullet + `cl_bobhead` 3-gate ground truth + Task-3 Gate 3 + phase-boundary
check 3 (corrected `cl_bobhead` server cell = `reachable`; conclusion
`build-excluded` UNCHANGED -- the load-bearing assertion); Phase-3 MD
Task-3 verification (b) + check-3; Phase-4 MD Phase-1-probe-contract recon
line. Phase-4/5 outputs UNAFFECTED (they consume the conclusion + D13
level; `cl_bobhead` -> build-excluded -> permanently level-2, never the
delete-list -- D20/OQ-3). The Phase-1 executor resumes the BLOCKED phase:
revise `_callgraph.py`'s not-compiled derivation to preprocessor-scoped +
`verify-callgraph-probes.py` Gate 3 expected `cl_bobhead` server cell ->
`reachable` (conclusion `build-excluded`), re-run the 3-gate GREEN.

### F10 -- Phase-2 MD Task-2 X3 baseline-leg omits the OFF env var (F6-class copy-run silent-no-op)

**Correction:** The Phase-2 MD Task-2 "Verification (X3 ...)" block (and
phase-boundary check 2 which runs it) wrote the baseline leg as
`python3 .../extract.py --output-dir /tmp/hud-off --workers 12` with the
comment "handler OFF (ENABLE_HUD_COMMANDS_HANDLER forced False)" but set NO
env var. The IMPLEMENTED + shipped seam (verified live in the Phase-2
`extract.py` diff) is `ENABLE_HUD_COMMANDS_HANDLER =
(os.environ.get("HUD_COMMANDS_OFF","") != "1")` -- it defaults ON; only
`HUD_COMMANDS_OFF=1` forces it off (deliberately mirroring Phase-1's
shipped `CALLGRAPH_OFF`). A verbatim copy-run of the MD block therefore
produces TWO ON runs -> the 8-stem `diff -q` is empty for the WRONG reason
-> X3 silently no-ops. EXACT same class as F6 (a phase MD's literal X3
command that silently no-ops); the `feedback_verification_layer_catches_
lift_residuals` shape -- surfaced by the executor at execution; the Phase-2
draft + its verification sub-agent missed it.

**Impact on this arc:** NONE on the shipped mechanism. The executor
implemented the env-var seam (within the MD Task-2 "subagent picks the
least-invasive concrete form" + "mirrors the operator-approved Phase-1
Task-2 shape" latitude) and ran X3 with the baseline GENUINELY off
(`HUD_COMMANDS_OFF=1`); the orchestrator independently re-ran X3 the same
way (mktemp OFF vs ON) -- 8 F6 stems byte-identical, 9th additive,
committed-baseline leg non-vacuous + clean. The defect is ONLY in the MD's
literal command text (a future copy-run / validate-extractor re-run
hazard), not in code or data.

**Action for every phase shipping an env-var-gated X3 (B done corrected;
S/ACC/APP):** the X3 baseline leg MUST explicitly set the handler's OFF
env var; never a bare command + a "forced False" comment. Enumerate the
OFF switch in the literal block (the F6 "enumerate the live stems"
sibling -- here "enumerate the OFF switch").

**Resolved by:** Phase-2 MD orchestrator-correction 2026-05-18 (dated note
in its Task-2 block + phase-boundary check 2; narrative preserved -- the
F6/F8/F9 house style; orchestrator-applied mechanical revision, no redraft,
no D-amendment, operator-cleared at the Phase-2 boundary); this finding.

### F11 -- Phase-3 migration `015` HEADER comment conflates Track-B scope with the Track-A D20 pool (immutable applied artifact; consumer docs corrected)

**Correction:** The Task-2 Sonnet subagent's `015_l1_runtime_fidelity_provenance.sql`
HEADER comment (lines ~37-38) describes `track_b_hud_recovery`'s population
scope as "Recovered-HUD-command origin for the banked-HEAD pool (74 commands
-- D20/D21)". The "74 commands / D20" parenthetical is the Track-A banked
SUSPECT pool (registered-but-maybe-dead commands -- D20). Track-B's populated
set is a STRUCTURALLY DIFFERENT set: the recovered HIDDEN HUD commands the
Phase-2 handler emits in `ezquake-hud-commands-ast.json` (bare `<name>` +
`+hud_<name>`/`-hud_<name>`; the ~129-command reverse-diff per X7 -- the very
commands the literal extractor never saw, which is why Track B exists). The
SAME conflation propagated into the SCHEMA.md v18 `track_b_hud_recovery`
paragraph. Same `feedback_parking_verified_state_is_hypothesis` /
verify-dispatched-terminal-claims shape -- caught by the executor's
primary-source re-check of the dispatched subagent's output, not by the
subagent's own "PASS".

**Impact on this arc:** ZERO on schema / data / runtime. The migration BODY
is correct and shape-locked (3 `ALTER ADD COLUMN`, nullable, no CHECK -- the
LOCKED SHAPE; all 6 Phase-3 phase-boundary checks still pass: the body, not
the header prose, is canonical; idempotency proven by DB-vs-file sha256
MATCH). It is a doc-precision defect in (a) the SCHEMA.md v18 section
[CONSUMER-FACING, EDITABLE -- DRAINED in-place at execution: the
`track_b_hud_recovery` paragraph now states the correct
`ezquake-hud-commands-ast.json` / ~129 / D21/X7 scope and explicitly
contrasts it with the Track-A 74/D20 pool] and (b) the migration `015`
HEADER comment [IMMUTABLE: `015` is applied + sha256-tracked in
`schema_migrations`; editing it makes the next `bun db/migrate.ts` THROW
"modified after applied"; a `--reset` re-apply drops the WHOLE schema
(catastrophic, wholly disproportionate to a header nit) and a manual
un-apply is the X9-forbidden in-place-DB-surgery class -- the executor does
NOT self-authorize either]. The precise scope statement now exists in every
consumer-facing authority: SCHEMA.md v18 (drained), the Phase-3 MD Recon
facts (`:210/:216`), and decisions D21/X7.

**Action / proposed disposition (operator-routed via the orchestrator -- NOT
executor scope):** the executor recommendation is ACCEPT-AS-IS for the
migration `015` header -- the migration body is canonical and correct, the
header is a point-in-time rationale record, and SCHEMA.md (the living schema
authority, which the SCHEMA.md currency note says to trust) + the Phase-3 MD
+ decisions all carry the precise statement. If the orchestrator/operator
deems the permanent migration record must be perfected, the
convention-respecting corrective is a future trivial no-op clarifying
migration (`016`-shape, comment-only) -- an orchestrator/operator call, not
an executor default. No design decision changed -- NO `decisions.md`
D-amendment (the conflation is a drafter-prose error, not a spec error; D20
Track-A / D21+X7 Track-B were always correct).

**Resolved by:** SCHEMA.md v18 drained in-place at Phase-3 execution
2026-05-18 (the consumer-facing leg); the migration-`015`-header leg surfaced
as DONE_WITH_CONCERNS in the Phase-3 executor HALT for orchestrator routing
(accept-as-is recommended); this finding. **Data corroboration (Phase-3 Task-3
2026-05-18):** the loader loaded EXACTLY 129 `track_b_hud_recovery` rows, all
`type='command'`, 0 `type='cvar'` (R7 structurally clean) -- 129 == X7's
"~129 Track-B reverse-diff", a DIFFERENT set from the Track-A 74/D20 pool,
confirming the conflation at the data layer (the loader faithfully loaded the
Phase-2 handler output; the 74 figure was never Track-B's scope).

### F12 -- Phase-3 MD Task-3 + check-3 literal verification command is the wrong subcommand (F6/F10-class copy-run hard-fail)

**Correction:** The Phase-3 MD Task-3 "Verification" block AND phase-boundary
check 3 both literally specify
`bun scripts/load-knowledge/index.ts load-version --project ezquake --version
head --force`. Primary-source-verified live (`index.ts:189-205`): the
`load-version` subcommand requires `['project','version','type','json',
'commit']` and calls `loadVersion({jsonPath: values.json...})` -- it ingests
ONE pre-existing entity-type JSON for ONE type; it does NOT run the Python
extractor, the per-type loop, or the Phase-3 Track-B/Track-A post-loop blocks.
A verbatim copy-run HARD-THROWS `--type is required` (missing `--type/--json/
--commit`), and even fully-argged it is the WRONG entrypoint (single-JSON
ingest, not the real-extractor+loader+post-loop pipeline Phase 3's round-trip
needs). The correct entrypoint is `extract-tag` (`index.ts:321-342` ->
`extract-tag.ts:6,44-47`): `runExtractTag` requires only `['project',
'version']`, runs the real `extract.py`, the per-type loop, then the
3b/3c/3e/3f post-loop (incl. the Phase-3 Track-B adapter + Track-A overlay).
Same `feedback_verification_layer_catches_lift_residuals` shape as F6/F10 (a
phase-MD literal verification command that does not do what its prose says) --
F6 = wrong stems -> silent no-op; F10 = missing OFF env -> silent no-op; F12 =
wrong subcommand -> hard-fail + wrong semantics. Surfaced by the Phase-3
executor's subagent at execution; the Phase-3 draft + its verification
sub-agent missed it.

**Impact on this arc:** NONE on the shipped loader/code (all 3 created + 6
modified files are correct; the round-trip PASSES). The defect is ONLY in the
Phase-3 MD's literal command text (Task-3 Verification block + phase-boundary
check 3) -- a future copy-run / `validate-extractor` re-run / arc-reviewer
hazard. The Phase-3 executor ran the CORRECT command
(`extract-tag --project ezquake --version head --force [--skip-release-notes]`)
for Task-3 acceptance AND phase-boundary check 3 (X2-faithful: real extractor
+ this phase's own loader output only; never the runtime dump / combined
harness).

**Action for the orchestrator (NOT executor scope -- the executor does not
unilaterally rewrite the phase-MD contract; F6/F10 precedent = orchestrator-
applied dated MD-correction):** apply a dated correction to the Phase-3 MD
Task-3 Verification block + phase-boundary check 3, replacing the
`load-version ...` literal with
`bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version
head --force [--skip-release-notes]`; narrative-preserved house style
(F6/F8/F9/F10); no redraft, no D-amendment (code/data correct; only the MD
command text wrong). Propagate the same check to Phase-4/5 if they copy the
`load-version`-shaped command.

**Sub-item (same family, bundle into the same dated MD-correction): the
check-5 `bun test` literal.** Phase-3 MD check 5 + Task-4 verification
literally specify `bun test scripts/load-knowledge/quality-grid.test.ts`.
Primary-source-verified: `quality-grid.test.ts:13-19` is a SAFETY GUARD that
THROWS unless `DATABASE_URL` includes `qw_oracle_test`; a bare `bun test`
inherits `.env`'s dev DB (`qw_oracle`) and the guard correctly refuses
("Refusing to run ... against a non-test database"), so the literal command
FAILS as written. The canonical form (package.json:27) is
`DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test
scripts/load-knowledge/quality-grid.test.ts` (or `npm run test -- <file>`).
The Phase-3 executor verified the test 15/15-passes via the canonical
test-DB invocation (the subagent's "15/15" was correct; the bare-command
failure was an invocation artifact, not a Task-4 defect). Same F6/F10/F12
family -- bundle the check-5 literal-command fix into the same orchestrator
dated MD-correction.

**Resolved by:** Phase-3 executor ran the correct `extract-tag` entrypoint
AND the canonical test-DB `bun test` at execution 2026-05-18 + surfaced both
in the HALT for one orchestrator MD-correction routing (F6/F10 precedent);
this finding.

### F13 -- Phase-3's own D21 Track-B addition makes the regression-family `ezquake.floor.command_*` probes RED; check-5 literal "no regression FAIL" unreconciled with Phase-3 scope

**Correction:** Phase-3 Task-3 (D21) correctly adds 129 first-class
`type='command'` recovered-HUD-command entities (all `source_state=
'source_backed'` -- OQ-2). This NECESSARILY moves the calibrated floor
snapshots at `quality-grid.ts` (`makeFloorCountProbe('ezquake','command',
564)` @~2110; `makeFloorSourceStateProbe('ezquake','command',{doc_only:7,
source_backed:495,source_retired:62})` @~2111): live is now command_count=693,
source_backed=624 (doc_only=7 / source_retired=62 UNCHANGED). Primary-source-
verified at execution that this is LEGITIMATE growth, NOT a regression/
corruption/idempotency-bug: (a) 693 entities, 693 DISTINCT name_fold, 0
dup-overflow -- `UNIQUE(project,type,name_fold)` structurally forbids re-run
inflation (`feedback_idempotency_before_staleness` check PASSED); (b) the
emitted 9th file `ezquake-hud-commands-ast.json` has exactly 129 hud_commands
(`_stats.source_total=129`, bare83+plus23+minus23) -- the loader loaded
exactly the Phase-2 handler's own recovered set (X7, no detection re-run);
(c) 693-129 = EXACTLY 564 and the non-Track-B command set is byte-unchanged
-- the pre-Phase-3 baseline is intact (no existing-row corruption; X3/check-6
consistent); (d) 564+129=693, 495+129=624 -- exact. This is the
`reference_qw_oracle_floor_vs_clean_reload` family (floor counts are
calibrated snapshots a correct reload legitimately moves -- verify before
crying regression; verified). NOTE the Task-4 subagent mischaracterized these
as "floor-family, not regression-family, benign" -- FALSE: primary-source-
verified `makeFloorCountProbe`@1975 + `makeFloorSourceStateProbe`@2015 BOTH
set `family: 'regression'`; the grid Summary correctly counts them as "2
regression failures". The subagent's synthesized "benign/non-regression-
family" claim was caught by the executor's `feedback_verify_dispatched_
terminal_claims` re-check.

**Impact on this arc:** Phase-3 Task-4's OWN deliverables are DONE +
primary-source-verified (jsonb-targets += the 3 new cols;
`F1.runtime_fidelity_shape` + `F1.jsonb_columns_not_strings` BOTH PASS on the
live Task-3-populated DB; `bun test quality-grid.test.ts` 15/15;
`tsc --noEmit` clean; quality-grid.ts 2361->2645, ktx-mvdsv F8 namespace
disjoint + idiom intact). But phase-boundary check-5's LITERAL PASS condition
"no regression FAIL" is violated by these 2 regression-family floor FAILs --
which are RED *only because Phase-3 did exactly what D21/the North Star
specifies* (recover hidden HUD commands as first-class entities). The Phase-3
MD did not reconcile its own D21 deliverable with its check-5 "no regression
FAIL" + the floor snapshot, and its Recovery section does not anticipate this
failure mode. The 2 anomalies the grid also surfaces (`F2.doc_only_crosstab`
57; `F2.default_value_ping_pong` gl_lightmode) are pre-existing,
non-Phase-3, in the non-gating F2 anomaly family -- irrelevant here.

**Action / proposed disposition (orchestrator/operator-routed -- NOT executor
scope: the floor block is a CROSS-ARC SHARED SUBSTRATE (`quality-grid.ts`)
the active sibling ktx-mvdsv arc also edits -- `feedback_cross_phase_audit_
shared_file_drift` / F8 family -- so a unilateral executor recalibration risks
the exact cross-arc collision this arc has repeatedly hit; the arc-executor
skill also forbids improvising a Recovery the phase MD did not authorize):**
recalibrate the two `ezquake.command` floor expecteds to the verified-exact
new baseline -- `makeFloorCountProbe('ezquake','command', 693)` and
`makeFloorSourceStateProbe('ezquake','command',{doc_only:7,source_backed:624,
source_retired:62})` (plus the `:1949`-style calibration comment) -- AND/OR
the orchestrator revises Phase-3 check-5 to scope out expected-Phase-3-D21
floor growth. Executor recommendation: recalibrate (the values are
primary-source-exact and idempotent; leaving a knowingly-red regression gate
is the `feedback_every_finding_gets_a_track` anti-pattern) -- but the
orchestrator owns the cross-arc-shared-substrate edit + the check-5
contract-wording call. No design decision changed -- NO `decisions.md`
D-amendment (D20 Track-A 74 / D21+X7 Track-B ~129 were always correct; this
is a stale calibrated snapshot, not a spec error).

**Resolved by:** Phase-3 executor primary-source-verified the floor delta is
legitimate idempotent D21 growth (not a regression) + surfaced as the primary
DONE_WITH_CONCERNS in the P3 HALT for orchestrator routing
(recalibrate-or-revise-check-5); this finding.

---

## R -- implementation residuals (brainstorm-deferred; owning phase resolves)

### R1 -- AST-confirm 0 non-literal `HUD_Register` first args

The "83 sites, 100% literal first arg, 0 non-literal tail" finding (D8) is
from a textual tokenizing probe, not the libclang AST instrument. Before the
literal-only assumption is load-bearing in `_handler_hud.py`, the
implementation must confirm 0 non-literal `HUD_Register` first args via the
extractor's actual AST.

**Owned by:** Track-B mechanism phase. **Default if a non-literal is found:**
STOP -- this contradicts D8; surface to operator (do not silently
constant-propagate; that would blend toward Track A's mechanism, violating
D1).

### R2 -- D15 evidence sub-field decomposition + D12 field shape

Exact variant identifiers (the 4 config names as stored), the
conservative-residue flag encoding (D5 address-taken residue must be visible
in the breakdown), and the evidence column-vs-JSONB decomposition for the two
separate provenance fields (D12) are implementation-shaped.

**Owned by:** schema + loader phase. **Constraint:** two physically separate
nullable fields, no `kind` discriminator (D12); feeder tag is structural
(D15).

### R3 -- D16 element-key emission + loader storage shape

How `_handler_hud.py` emits the HUD element key (the literal `HUD_Register`
arg #1) and how the loader stores it so the LLM is told
`radar`/`+hud_radar`/`-hud_radar` group to `radar`.

**Owned by:** Track-B mechanism phase (emit) + schema + loader phase (store).

### R4 -- delete-list format = regenerate the shipped artifact's exact shape

The autonomous delete-list (D20 output 2) regenerates
`apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`. The
exact artifact shape (sections, feeder tagging per entry, the existing
sb_qtvlist_url/gl_outline_scale_world/cmdline-ghost layout) must be read from
the live in-repo file and matched byte-shape.

**Owned by:** application phase. **Constraint:** build-excluded bucket NEVER
in the delete-list (D20); each entry feeder-tagged (D7.1/D15).

### R5 -- combined known-answer harness wiring

Composing Track A's 3 probes + Track B's 3 anchors into the one
hard/all-or-nothing/loud one-time-per-fork gate (D18), reading the
feeder/family tags, with the LOUD failure path that falls the fork back to
today's pipeline.

**Owned by:** acceptance phase. **Constraint:** composition of probes the
mechanism phases already shipped (X2) -- NOT new validation logic invented
here.

### R6 -- version-pin sanity-proxy implementation (D19 hard sub-gate)

The `sb_qtvlist_url`-style known-live leak check that gates level-3: broken
pin -> ZERO level-3 stamps for that dump, everything falls to level-2.

**Owned by:** acceptance phase. **Reuse:** the proxy already exists in the
banked detection scripts (W1) -- locate and reuse, do not reinvent.

### R7 -- cvar-collision guard on the new `_handler_hud.py`

The new handler emits COMMANDS ONLY. If it ever synthesizes a `hud_*` cvar it
collides with `ezquake/_handler_cvars.py:288-351` (wired `:384/:413/
:481-482`) on `entities UNIQUE(project,type,name)`.

**Owned by:** Track-B mechanism phase. **Verification:** the phase ships a
probe asserting `_handler_hud.py` emits zero `type='cvar'` entities (the D10
anchor-3 additivity gate extended).

---

## W -- risks / watch-list (defend against these)

### W1 -- `/tmp/` volatility of the banked detection assets

The parking doc references `/tmp/front1-diff.sh`,
`/tmp/cmdline-liveness.sh`, and ephemeral candidate pools. `/tmp` does not
survive a reboot. The ONLY durable in-repo artifact is
`apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`. The
acceptance phase needs the pinned HEAD runtime dump + the version-pin proxy
script as its answer key (D18/D19).

**Mitigation:** prerequisites.md Task 0 -- locate the banked dump + detection
scripts; if only in `/tmp`, relocate into a durable repo path BEFORE the
acceptance phase. Surface to operator at scaffold review.

### W2 -- spec-verified numbers are hypotheses until re-checked live

X8 / `feedback_parking_verified_state_is_hypothesis`. The spec marks its
pool numbers "measured, verified not inferred" -- that raises, not lowers,
the bar for the executing terminal to re-run the sanity gate against the live
DB and re-verify line cites against live source before they are load-bearing.
Every phase MD's "Recon facts (verified)" sub-block records the re-check.

### W3 -- the zero-diff non-corruption bar must be a real check

X3. "Existing output unchanged" asserted in prose is not acceptable. Both
mechanism phases ship the actual before/after diff command (toggle off vs
prior HEAD emitted JSON) and its empty result as a phase-boundary probe.

### W4 -- regime-collision temptation in the mechanism phases

The biggest slicing risk: a drafter verifying the Track-A phase via "the L1
column shows genuine-dead" (schema phase not built yet) or the Track-B phase
via "the combined harness passes" (acceptance phase not built yet). Both are
collisions. X2 forbids it: mechanism phases verify against the mechanism's
OWN output (the `reachable()` query / the handler JSON) with their OWN probes.

---

## Phase ownership of findings / residuals

Phase roles map to locked phase numbers once slicing is operator-gated
(README phase index). Roles: **A** = Track-A mechanism; **B** = Track-B
mechanism; **S** = unified schema + loader; **ACC** = acceptance contract;
**APP** = application outputs.

| Item | Owning phase role | Resolution |
|---|---|---|
| F1 (order/show prose) | B (awareness only) | decisions.md D11 amendment; no code impact |
| F2 (stale pool numbers) | A, B, ACC, APP | use 74/92/129; re-verify live (X8) |
| F3 (stale variant count) | A | recon `clang_config.py`; 4 variants |
| F4 (no extant comment-reg pass) | A | D7 amendment; build minimal standalone scanner |
| F5 (cvar registrar asymmetry) | A (derive) + S (aware) | D7 amendment; passenger-derived evidence |
| F6 (X3 file set = live stems) | A (corrected) + B (correct) + S/APP | enumerate the 8 live output_filename stems; 9th additive |
| F7 (dump embedded commit banner; "rests entirely on proxy" false) | ACC | correct Recon fact + detection README; embedded-SHA primary proxy leg (S2) |
| F8 (cross-arc drift: sibling consumed mig `014` + grew quality-grid.ts post-freeze) | S (own) + ACC/APP (propagate) | executor-derive the mig ordinal; re-derive quality-grid.ts cites live; P3/P4/P5/README revised; no D-amendment |
| F9 (D5 not-compiled underivable for build-system-excluded files; P1 Gate-3 RED; Recon premise refuted) | A (own) -> operator/orchestrator (D5-derivation amendment) | RESOLVED 2026-05-17 -- Option B operator-ratified; `decisions.md` D5 AMENDMENT 2026-05-17 (not-compiled = preprocessor-derivable only; D3 intact; D19/level-3 unaffected); P1 re-verified GREEN + SHIPPED `51604f67` (README Phase-1 shipped) |
| F10 (Phase-2 MD Task-2 X3 baseline-leg omits the OFF env var; F6-class copy-run silent-no-op) | B (own) -> orchestrator (MD correction) | RESOLVED 2026-05-18 -- executor implemented the `HUD_COMMANDS_OFF` env-var seam + ran X3 genuinely off; orchestrator independently re-ran X3 clean + applied the dated Phase-2 MD correction; no code/data impact, no D-amendment |
| F11 (Phase-3 mig `015` HEADER conflates Track-B scope w/ Track-A 74/D20 pool; same in SCHEMA.md v18) | S (own) -> orchestrator (accept-as-is or future no-op clarifying mig) | RESOLVED 2026-05-18 -- SCHEMA.md v18 drained in-place at execution (consumer-facing leg corrected); orchestrator gate CONFIRMED accept-as-is for the immutable applied-`015`-header leg (sha256-tracked; editing it is the silent-corruption class F8 exists to prevent; body canonical+correct; SCHEMA.md + Phase-3 MD + decisions D21/X7 all carry the precise scope; a no-op `016` would be pure ceremony) -- no data/schema/runtime impact, no D-amendment; data-corroborated (loader loaded 129 == X7 reverse-diff, all type='command', 0 cvar) |
| F12 (Phase-3 MD Task-3 + check-3 literal cmd is `load-version` -- wrong subcommand; F6/F10-class hard-fail) | S (own) -> orchestrator (dated MD-correction) | RESOLVED 2026-05-18 -- executor ran the correct `extract-tag` entrypoint at execution (acceptance + check-3 X2-faithful); orchestrator APPLIED the dated MD-correction (Task-3 Verification block `load-version` -> `extract-tag --skip-release-notes`; Task-4 + check-5 bare `bun test` -> canonical `qw_oracle_test`-DB form; check-3 references the Task-3 block so it inherits the fix) -- F6/F10 narrative-preserved precedent, no redraft, no D-amendment, code/data correct |
| F13 (Phase-3's own D21 +129 makes regression-family `ezquake.floor.command_*` RED; check-5 "no regression FAIL" unreconciled w/ Phase-3 scope) | S (own) -> orchestrator (recalibrate floor snapshot AND/OR revise check-5; cross-arc shared-substrate) | RESOLVED 2026-05-18 -- floor delta primary-source-verified LEGITIMATE idempotent D21 growth (693=564+129, 624=495+129, baseline-564 unchanged, 129=Phase-2 source-of-truth, 0 dup-fold), NOT a regression/corruption; orchestrator independently re-verified at primary source (693 / 0 dup name_fold / {7,624,62} / 129 track_b carriers) + re-ran the F1 grid (exactly the 2 floor probes RED, no hidden breakage); operator-routed -> orchestrator RECALIBRATED `quality-grid.ts` (564 -> 693; source_backed 495 -> 624; dated inline note + the :1949 snapshot line; F8-scoped surgical edit, disjoint from the ktx-mvdsv region) + folded the expected-D21-growth note into the F12 dated check-5 MD-correction; Task-4 own deliverables DONE+verified (2 new probes GREEN, test 15/15, tsc clean); no D-amendment (D20/D21/X7 always correct -- stale calibrated snapshot) |
| R1 (AST-confirm literal) | B | AST probe before literal-only is load-bearing |
| R2 (D15/D12 field shape) | S | two separate fields; feeder tag structural |
| R3 (D16 element key) | B (emit) + S (store) | element-grouped provenance |
| R4 (delete-list shape) | APP | regenerate the in-repo artifact byte-shape |
| R5 (harness wiring) | ACC | compose mechanism-phase probes (X2) |
| R6 (version-pin proxy) | ACC | reuse banked proxy (W1) |
| R7 (cvar-collision guard) | B | zero-`type=cvar` emission probe |
| W1 (/tmp volatility) | prerequisites + ACC | relocate dump/scripts durable |
| W2 (verified=hypothesis) | all | Recon-facts sub-block per phase |
| W3 (zero-diff real check) | A, B | shipped diff command + empty result |
| W4 (regime collision) | A, B | verify on mechanism's own output (X2) |
