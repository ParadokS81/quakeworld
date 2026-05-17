# enforce-L1-runtime-truth -- locked cross-cutting decisions

These choices apply to every phase. They are LOCKED by the brainstorm (Passes
1-5, EXITED 2026-05-17). The design spec
`docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
is the full rationale and the source of truth -- this file distills each
locked decision into its cross-cutting implication for phase drafters.

If a phase needs to deviate from a decision, surface a "deviation" block at
the top of that phase MD and STOP for operator review. Mid-arc amendments
land here as dated amendment blocks; never silently override in a phase MD.
**The brainstorm is closed. Do NOT re-open D1-D22.** A scaffold/phase
decision that genuinely needs a design change goes to the operator for an
explicit amendment -- no silent relitigation.

Two ID spaces:
- **D1-D22** -- the locked design decisions (mirror the spec one-to-one).
- **X1-X10** -- cross-cutting execution invariants the arc-planner adds (the
  process/discipline layer; analogous to qw-oracle Arc 1's D12-D17 and the
  ktx-mvdsv arc's C/P invariants). They do not re-open design; they govern
  HOW every phase executes.

---

## North Star (operator-stated 2026-05-16; do not re-derive)

Enforce L1 to show what is actually present and working at runtime. Today L1
lies in two directions: it SHOWS non-working commands/cvars (registered in
dead code -> ghosts) and it HIDES working commands (runtime-built names the
literal AST extractor never sees -> the HUD `+hud_*` family). Bi-directional,
same outcome. One coherent arc; two mechanisms, phased and SEPARATELY GATED,
ZERO mechanism blending.

---

# Design decisions (D1-D22 -- mirror the spec; LOCKED)

## D1. One arc, two tracks, zero mechanism blend

**Decision:** Track A (ghost elimination -- L1 SHOWS non-working): libclang
call-graph reachability passenger; classify the banked HEAD pool genuine-dead
vs `#ifdef`-build-excluded. Track B (hidden-command recovery -- L1 HIDES
working): model the `HUD_Register` command contract; emit the bare `<name>`
and `+hud_<name>`/`-hud_<name>` names. Phased, separately gated, no mechanism
contaminates the other.

**Why:** Same defect (L1 not telling the runtime truth), opposite direction.
One arc because it fixes one thing; two tracks because the mechanisms are
unrelated (call-graph BFS vs literal/constant contract modeling).

**Implication:** No phase may share code, schema discriminator, or acceptance
gate between the two mechanisms. The shared-foundation command case-fold gap
named in the original D1 is CLOSED BY MEASUREMENT (mini-arc `8093e42f`
shipped; pools re-measured -- see X7 and review-findings F2/F3). It is NOT a
phase.

## D2. ezQuake-first

**Decision:** Both mechanisms are engine-general in the shared handler tier;
validate + ship ezQuake ONLY this arc. FTE/QWCL/MVDSV are per-fork gated
follow-ons (cost dominated by producing each fork's pinned runtime dump;
MVDSV server-only -> Track B N/A there).

**Why:** ezQuake is the only fork with a version-pinned runtime answer key.

**Implication:** No phase ships or validates FTE/QWCL/MVDSV. The off-by-
default per-fork toggle (D6/D9/D22) is the structural enforcement.

## D3. Conservative never-false-accuse posture + root set (Track A governing rule)

**Decision:** Bias hard toward never false-accusing a live entity; accept
under-report; the runtime dump mops residue. Root set computed PER build
config (the 4 ezQuake variants client/server/win/apple, verified live in
`extractor_lib/clang_config.py`): (1) the variant's program-entry cascade;
(2) address-taken closure (any function whose address is taken anywhere in
that variant's compiled TU set is also a root).

**Why:** Track-A output is an autonomous published verdict (dead-entity PR ->
nano/slime, consumed unseen) -- the strict-bar consumer
(`reference_rigor_bar_follows_consumer`). A false accusation ships a wrong
"delete this" PR; a missed ghost merely stays one cycle in the human-gated
pool. Asymmetric cost -> asymmetric bias.

**Implication:** Everything downstream (edges, per-config union,
classification) inherits this posture. The aggressive "flag more, tolerate
false accusations" stance is REJECTED -- do not reintroduce it. Verify the
4-variant set live; the parking doc's "dual client/server, 27 macros" is
STALE (review-findings F3).

## D4. Reachability propagates through the full subtree

**Decision:** A function in the reachable set (entry-cascade OR address-taken
root) is FULLY traversed -- every direct call in its body adds its callee,
transitively. Address-taken roots are not dead-end markers; their entire
downstream subtree is reachable.

**Why:** Refusing to traverse a pointer-invoked body re-introduces the false
accusations D3 forbids. Intended consequence: reachability is a wide
over-approximation; the genuine-dead set is small and high-confidence.

**Implication:** Expect the call-graph to CLEAR most of the pool as
reachable-but-build-excluded and return a small hard core. Do not "tighten"
to shrink the cleared set.

## D5. Three-valued per-config state + conservative combination + auto-ship boundary

**Decision:** Per suspect, per variant: **reachable** | **unreachable** |
**not-compiled** (the third is load-bearing). Combination: reachable in >=1
variant -> **build-excluded** (never shipped dead); unreachable in EVERY
compiled variant AND compiled in >=1 -> **genuine-dead core**; D3/D4 residue
(dead but address-taken) lands in build-excluded -> human review. ONLY the
"unreachable everywhere compiled" core + the commented-register subclass is
the autonomous published delete-list; the whole build-excluded bucket is
human-gated.

**Why:** Conflating not-compiled with unreachable is the central
false-accusation trap.

**Implication:** The not-compiled state must be physically distinct from
unreachable in the data model and the verdict logic. The final static verdict
is still cross-checked vs the runtime dump before ship (D19, the acceptance
phase).

> **AMENDMENT 2026-05-17 (operator-ratified; the record of the path --
> Phase-1 execution F9).** A Phase-1 MD "Recon facts (verified)" premise
> was REFUTED by live execution + orchestrator primary-source verification,
> the same `feedback_parking_verified_state_is_hypothesis` / X8 / F4 /
> D7-amendment shape this arc has hit and operator-ratified before. The
> Phase-1 drafter Recon asserted `src/cl_view.c` is "client-only
> (quakedef.h, not qwsvdef.h) -> NOT compiled in the SERVERONLY build" so
> `cl_bobhead`'s registrar `V_Init` is `not-compiled` in the server
> variant. That imported the HISTORICAL QuakeWorld `qwsv` model (a
> separate dedicated-server binary with its own source list excluding
> client files). **ezQuake-source does not implement that.**
> Orchestrator-verified at primary source (2026-05-17, pin
> `3f9e724fa608e516040f02b9557808ff3efda53e`): `clang_config.py:72-73`
> `clang_args_server_for` = client args + `-DSERVERONLY -DSERVER_ONLY`
> (nothing else differs); `extract.py:477` builds ONE 309-file source set,
> `:306-309` parses every `.c` under all 4 variant flag sets (no
> per-variant source list); `cl_view.c` has NO file-scope `SERVERONLY`
> guard and `quakedef.h` is a plain include-guard, so it parses non-empty
> under `-DSERVERONLY`; `CMakeLists.txt` has ONE `add_executable(ezquake)`
> over all 309 `.c` (16 `cl_*.c` included) -- NO separate dedicated-server
> target -- and CMake never sets `SERVERONLY` (it is a pure source-level
> `#ifdef` define; 27 src files carry genuine guards). So the mechanism's
> "`_compiled[server]`" = "parsed under server flags with body present",
> which for an unguarded client file is CORRECT for ezQuake-source's real
> build (it would compile `cl_view.c` under any preprocessor config). The
> error was the drafter's EXPECTED value, not the mechanism. The executor
> Option A ("teach the mechanism each variant's true CMake source list")
> was found INAPPLICABLE -- there is no per-variant CMake source list to
> teach it; one target compiles everything.
>
> **Ratified resolution (Option B; operator 2026-05-17).** D5's THREE
> states + the combination logic + the not-compiled-is-physically-distinct
> implication are UNCHANGED. The DERIVATION of `not-compiled` is SCOPED to
> **preprocessor-derivable exclusion only**: a registrar's function/file
> body absent from a variant's PARSE because of a `#ifdef`/`#ifndef`
> (`SERVERONLY`/`SERVER_ONLY`, `_WIN32`/`WIN32`, `__APPLE__`, etc.) that
> empties it in that variant. Build-system / source-list exclusion is NOT
> modeled (ezQuake-source has one build target, no per-variant source
> list, no separate dedicated-server build). A client-only file with NO
> preprocessor guard resolves `reachable`/`unreachable` (per the BFS) in
> the server variant, NEVER `not-compiled`. not-compiled remains correctly
> derivable for the 27 `SERVERONLY`-guarded files + all
> `#ifdef _WIN32`/`__APPLE__`-guarded code (genuine preprocessor exclusion
> -> empty body in the non-target parse). **D3 (never-false-accuse) is
> intact** -- the scoping only makes MORE variants count "compiled" (where
> the entity is unreachable-from-that-root or D4 address-taken-cleared); it
> cannot remove a live entity's client-side reachability, so it cannot
> manufacture a false `genuine-dead`; conclusions are stable, only D15's
> per-variant EVIDENCE breakdown is affected on the build dimension for
> client-only-file registrars in the server variant -- and that is the
> drafter's expectation being corrected to ezQuake-source's real build
> model, not a new inaccuracy. D19 (the dump is the overriding answer key)
> is unaffected -> level-3 autonomous-ship safety is unchanged; the
> bounded precision loss lands only in level-2 auditability (the
> assistant tier). Propagated: review-findings F9 (resolution); Phase-1 MD
> Recon #5 + the `cl_bobhead` 3-gate ground truth + Task-3 Gate 3 +
> phase-boundary check 3 (corrected `cl_bobhead` server cell =
> `reachable`, conclusion `build-excluded` UNCHANGED -- the load-bearing
> assertion); Phase-3 MD Task-3 verification (b) + check-3 expected cell
> (same correction, conclusion unchanged); Phase-4 MD Phase-1-probe-
> contract recon line. Phase-4/5 consume the conclusion + D13 level
> (`cl_bobhead` -> build-excluded -> permanently level-2, never the
> delete-list -- D20/OQ-3) so their outputs are UNAFFECTED. The D5 shape
> enum `reachable|unreachable|not-compiled` is unchanged (Phase-3 MD
> :183/:371/:670, Phase-5 MD :198 -- still valid; not edited).

## D6. Track A integration -- shared passenger on the existing walk; non-corrupting + cleanly toggleable

**Decision:** Option A: a self-contained Tier-1 shared module (one new file
beside `_visitor.py` / `clang_config.py`) that OBSERVES the single existing
per-variant walk read-only, runs the per-variant BFS post-walk, and exposes
ONE contract: `reachable(entity) -> {yes/no, which variants}`.

**Why:** Option B (separate dedicated pass) re-pays the parse (slowest stage)
for no correctness gain.

**Implication:** Purely additive, own private storage, zero contact with
existing handler state. Existing entity output stays byte-identical (zero-diff
verified before/after -- X3). Single subscription seam + single
orchestration-level boolean; off => zero edges/BFS/signal => today's pipeline
exactly. This on/off seam IS D2's per-fork gating. Fail-safe by construction:
any call-graph failure can only bias toward "reachable" (D3 safe direction).

## D7. Track A scope boundaries

**Decision:** (1) Commented-register is a SEPARATE textual feeder, NOT the
call-graph (libclang strips comments). The genuine-dead list has TWO
independent feeders: (a) call-graph "unreachable everywhere compiled"; (b)
commented-register textual detection. (2) Entity -> registrar is the enclosing
function of the already-recorded registration site (no new mechanism). (3)
Signal representation is the schema phase, not the mechanism phase.

**Why:** A `// Cvar_Register(...)` is invisible to reachability; it is an
already-understood textual concern, not a call-graph concern.

**Implication:** Provenance MUST distinguish feeder (a) vs (b) structurally
(D15). The acceptance harness tests different feeders with different probes
(`sb_qtvlist_url` -> feeder a; `gl_outline_scale_world` -> feeder b). The
mechanism phase does not build the commented-register detector from scratch
(the extractor already runs textual passes) but must surface feeder-tagged
output.

> **AMENDMENT 2026-05-17 (operator-ratified; the record of the path).**
> Two D7 premises were REFUTED by live recon during Phase-1 drafting, both
> overseer-re-verified against live source (grep of the full extractor tree
> incl. `_legacy/`; `_handler_commands.py`/`_handler_cvars.py`/`_visitor.py`;
> the shipped `ezquake-runtime-dead-entities.md`):
>
> 1. **D7 Implication "the extractor already runs textual passes" -- FALSE.**
>    There is NO commented-register textual detector anywhere in the live
>    extractor. A repo-wide grep of `scripts/extractors/**/*.py` for
>    commented-out-registration detection returns zero such pass; the only
>    textual-pass hit is the retired `_legacy/extract-ezquake-cvars-clang.py`
>    *trailing help-desc comment* harvester -- a DIFFERENT concern (it
>    harvests `// description` after a LIVE registration; it does NOT detect
>    a commented-OUT `// Cvar_Register(...)`), and it is archived/unused. The
>    `gl_outline_scale_world` Class-2 entry in the shipped dead-entities
>    artifact was produced by manual operator source-grep + the runtime dump
>    (the artifact says so: "re-verified by direct source grep"), NOT by an
>    automated feeder. Same `feedback_parking_verified_state_is_hypothesis`
>    shape as this file's own D11 amendment.
>    **Ratified resolution:** D7.1's TWO-FEEDER STRUCTURAL split STANDS
>    (feeder (a) call-graph; feeder (b) commented-register; feeder-tagged,
>    never blended -- the design intent is independent of whether the code
>    pre-existed). The Implication sentence "does not build the
>    commented-register detector from scratch (the extractor already runs
>    textual passes) but must surface feeder-tagged output" is amended to:
>    **"builds feeder (b) as a minimal standalone commented-register textual
>    scanner (~15-line regex over raw source text) inside
>    `extractor_lib/_callgraph.py`, architecturally SEPARATE from the
>    call-graph (no AST / no edges / no BFS contact -- D1 no-blend preserved
>    structurally), and surfaces it feeder-tagged."** Downstream UNCHANGED:
>    Phase-4 Gate-2 composition and Phase-5 R4 delete-list regeneration (the
>    shipped artifact's Class-2 commented-register section must still be
>    mechanism-regenerated) both still hold.
>
> 2. **D7.2 "registrar is the enclosing function of the already-recorded
>    registration site (no new mechanism)" -- imprecise for CVARS.** Holds
>    literally for COMMANDS: `_handler_commands.py` maintains a `_func_stack`
>    (`enter_function`/`exit_function`) and records `enclosing_function` at
>    the `Cmd_AddCommand` CALL_EXPR. For CVARS `_handler_cvars.py` records
>    only the `cvar_t X = {...}` VAR_DECL site (file scope, NO enclosing
>    function); the `Cvar_Register(&X)` call is a separate site no handler
>    binds to a registrar. Overseer-verified: `cl_bobhead` decl
>    `cl_view.c:49` (file scope) vs `Cvar_Register(&cl_bobhead)`
>    `cl_view.c:1160` inside `V_Init` (`cl_view.c:1127`).
>    **Ratified reading:** the Track-A passenger itself binds
>    `Cvar_Register`-family CALL_EXPRs to their enclosing FUNCTION_DECL
>    during its read-only walk, using the shared visitor's EXISTING
>    `enter_function`/`exit_function` hooks (`_visitor.py:49/54/141/162`).
>    This is inherent to D6 ("collecting caller->callee edges + address-taken
>    facts read-only"), NOT a new mechanism: "already-recorded" in D7.2 means
>    "the registration call exists in the AST the walk already traverses,"
>    NOT "lives in `cvar_versions.source_line`." Phase-3 (schema) must know
>    the Track-A evidence is passenger-derived, not handler-recorded
>    (review-findings F5 -> affects R2's evidence field shape).

## D8. Track B emission model -- full static `HUD_Register` command contract, dump-gated

**Decision:** Literal + constant-flag modeling of the single `HUD_Register`
contract (NOT a call-graph; zero Track-A blend). (a) Bare `<name>`
unconditional -- one `Cmd_AddCommand(name, HUD_Func_f)` per call site, emit
literal arg #1 for all sites. (b) `+hud_<name>`/`-hud_<name>` gated -- emit
only when the call site's `flags` arg literally contains `HUD_PLUSMINUS` AND
its `show` arg is a non-NULL literal. Every emitted name cross-checked against
the runtime dump before it counts (never emit a name absent from the dump).

**Why:** Full static modeling earns per-name provenance for the schema and a
real drift guard; the textual probe found 83 call sites, 100% literal first
arg, 0 non-literal tail (no constant propagation needed).

**Implication:** RESIDUAL R1 (review-findings): the 0-non-literal finding is
from a textual probe; the implementation MUST confirm 0 non-literal
`HUD_Register` first args via the extractor's actual libclang AST before the
literal-only assumption is load-bearing in code. The dump-gate is the
conservative safety net -- preserve it.

## D9. Track B integration -- new dedicated `ezquake/_handler_hud.py`, additive + non-corrupting + toggleable

**Decision:** A NEW project-private handler `ezquake/_handler_hud.py`
(8-handler architecture, `project_extraction_pipeline_vision`) owns the
`HUD_Register` command contract end to end.

**Why:** The existing literal command handler emits nothing for
`Cmd_AddCommand(name, HUD_Func_f)` (`name` is a function parameter, not a
literal) -- that blind spot is exactly why the names are hidden. Extending
that handler would couple Track B to the handler whose blind spot created the
gap.

**Implication:** Purely additive (introduces currently-absent entities;
modifies/suppresses no existing emission). Inherits D6's non-invasive bar:
existing entity output byte-identical (zero-diff -- X3), single toggle seam,
off == today's pipeline. REJECTED: extend `_handler_commands.py`; generalize
to a shared wrapper-contract pattern (premature; exactly one `HUD_Register`
contract, ezQuake-only).

## D10. Track B drift guard -- lightweight known-answer set, NOT speculative change-detection

**Decision:** A lightweight 3-anchor known-answer drift guard only. NOT
AST-diffing / template-move heuristics. Anchors: (1) bare-name positive --
emits `radar`, `radar` in dump; (2) `+/-` positive -- emits
`+hud_radar`/`-hud_radar` (radar verified: `flags` == `HUD_PLUSMINUS`, `show`
== `"0"` non-NULL), both in dump; (3) literal-control/failure gate --
`togglehud` (literal `Cmd_AddCommand`, NOT `HUD_Register`) stays present and
is NOT emitted/duplicated by `_handler_hud.py` (the additivity gate, the
analogue of Track A's `cl_bobhead` gate).

**Why:** A years-stable contract does not warrant adaptive machinery; if an
upstream rewrite breaks it the anchors fail loudly and we re-model then.

**Implication:** Pass-3 LOCKED the anchor set + semantics. The acceptance
phase WIRES it into the combined known-answer harness and owns the full
runtime-dump cross-check. The mechanism phase ships the anchors as its own
self-contained validation (X2 -- no regime collision).

## D11. Track B scope -- COMMAND HALF ONLY (cvar half STRUCK, operator-ratified 2026-05-17)

**Decision (amended):** Track B recovers the `HUD_Register` COMMAND contract
only: bare `<name>`, `+hud_<name>`, `-hud_<name>`. The settings-cvar half
(`hud_<name>_<subvar>`) is STRUCK.

> **AMENDMENT 2026-05-17 (operator-ratified; the record of the path).**
> D11's original premise -- that `hud_<name>_<subvar>` settings cvars are
> "the SAME hidden-name class ... literal AST extraction never sees it" -- is
> REFUTED by live verification (operator spot-check + dispatched coverage
> audit, both overseer-re-verified against live code, the backup DB, and the
> schema; see `docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md`).
> The cvars are NOT hidden: a wired general `HUD_Register`->cvar synthesis
> already lives in `ezquake/_handler_cvars.py` (`_synthesize_hud_cvars`,
> dispatched from `visit_cursor` on `HUD_Register`, wired at `:384/:413/
> :481-482`) and emits all `hud_<name>_<subvar>` cvars as first-class
> `source_backed type='cvar'` L1 entities (1429 in the backup DB; radar = 32,
> clock = 18). Track B narrows to the command half (still genuinely hidden
> per D9's separately-verified literal-only-command-handler premise).

**Why:** The cvar mechanism already exists and ships; a second emitter is
redundant and collides.

**Implication (HARD constraints):**
- The new `_handler_hud.py` emits COMMANDS ONLY. It MUST NOT synthesize cvars
  -- a duplicate cvar emitter collides with `_handler_cvars.py:288-351` on
  `entities UNIQUE(project,type,name)` (review-findings R7).
- **Prose correction:** the original D11 body labels `order` as "(gated)".
  Live `hud.c:1241-1360` shows `order` is UNCONDITIONAL; `show` is the gated
  subvar. Handler code is correct; only the spec prose was wrong
  (review-findings F1). This affects no command-half mechanism but is
  recorded so a drafter reading the spec body is not misled.
- D16's element-link applies to recovered COMMANDS. Whether the pre-existing
  1429 `hud_*` cvars should also carry the element key is a cheap FUTURE
  sibling wire, NOT this arc (non-goals).

## D12. Two physically separate provenance fields under one shared design language

**Decision:** The L1 fidelity signal is NOT one discriminated container. It
is TWO physically separate, independently-nullable provenance fields -- one
for Track A's verdict, one for Track B's recovered-hidden origin -- both
conforming to ONE shared three-slot shape (D14).

**Why:** Near-disjoint consumers (the autonomous dead-entity PR path never
touches HUD; the MCP/LLM + config-viewer path never touches the reachability
verdict). D1's no-blend becomes STRUCTURAL: different columns cannot
co-mingle.

**Implication:** No single `runtime_fidelity` column with an internal `kind`
discriminator (REJECTED -- a shallow wrapper no consumer wants whole). The
schema phase lands two separate nullable fields. Field-shape mechanics
(column vs JSONB) are implementation-shaped -> schema phase owns them
(review-findings R2).

## D13. Sparse, per-version, mechanism-derived; three-level coverage semantic

**Decision:** The signal is sparse by construction -- attaches only where a
mechanism found something non-default, PER-VERSION, MECHANISM-derived (NOT
defined by the HEAD dump). Coverage carries THREE trust levels: (1) **no
signal** -- mechanism did not run; (2) **high-confidence-generalized** --
mechanism ran, the fork's mechanism is validated, this version not
independently dump-confirmed (every non-HEAD ezQuake version; LLM/MCP-usable,
NOT autonomously shippable); (3) **dump-confirmed** -- mechanism ran AND this
version independently dump-confirmed (HEAD `3f9e724f` + deliberately-pinned
releases; autonomously shippable).

**Why:** Each version L1 extracts runs the passenger on its OWN AST (free per
D6/D9). The HEAD dump validates the mechanism once and dump-confirms the HEAD
slice; it does NOT define any version's suspect set.

**Implication:** Per-fork one-time validation is MANDATORY and does NOT
transfer across engines (D22). The coverage record is a per-fork
"mechanism-validated" fact + a per-version "dump-confirmed" fact. The three
levels are the single shared spine the acceptance routing reads (D17 stage 3).

## D14. Shared three-slot provenance spine

**Decision:** Both fields conform to one shape, three slots: (1)
**conclusion** -- Track A: genuine-dead | build-excluded; Track B: which HUD
family (bare command | `+-` pair); (2) **evidence** -- what produced the
conclusion, feeder/family-shaped (D15/D16); (3) **dump-confirmation status**
-- the D13 three-level state for this entity at this version (representation
only; the acceptance phase owns the actual cross-check).

**Why:** The evidence slot is what makes the verdict trustable rather than
asserted -- the North Star's "provenance a reader can trust."

**Implication:** Slot 3 is representation only in the schema phase; the
runtime-dump cross-check that fills it is the acceptance phase (D1/D7.3
representation-not-acceptance line held).

## D15. Track A arm -- final verdict + feeder-tagged per-variant evidence

**Decision:** Conclusion slot = final combined verdict (genuine-dead |
build-excluded). Evidence slot carries the per-build-variant breakdown (D5's
three-valued state across the 4 ezQuake configs) for the call-graph feeder,
and is FEEDER-TAGGED: call-graph feeder -> per-variant breakdown;
commented-register feeder -> a textual register-site cite. Same conclusion,
structurally different evidence, never blended.

**Why:** An autonomous published verdict must be auditable
("unreachable in client, not-compiled in server, ..." is falsifiable, bare
"genuine-dead" is not); D13 makes most versions level-2 where the breakdown
is the ONLY trust the reader has.

**Implication:** D7.1's two-feeder split becomes structural here. Exact
variant identifiers, residue-flag encoding, and evidence column-vs-JSON
decomposition are implementation-shaped -> schema phase owns them
(review-findings R2). The acceptance phase's feeder-specific gates read the
tag.

## D16. Track B arm -- Linked (element-grouped provenance)

**Decision:** Each recovered HUD command is a separate L1 entity, but its
provenance carries the HUD ELEMENT it belongs to (the literal `HUD_Register`
arg #1 the model already reads). The LLM is TOLD that `radar` / `+hud_radar`
/ `-hud_radar` all configure the one `radar` element.

**Why:** Forcing the LLM to reverse-engineer element membership from string
parsing is exactly the fragile static-string guessing this arc exists to
eliminate; the grouping is free from source.

**Implication:** Element-grouping mechanics (how `_handler_hud.py` emits the
element key; loader storage shape) are implementation-shaped -> Track B phase
emits the key, schema phase stores it (review-findings R3). REJECTED: flat
family-tag-only with LLM inferring grouping by stem.

## D17. One shared acceptance-contract shape, per-track instantiation

**Decision:** ONE shared shape, three stages, instantiated SEPARATELY per
track (feeder-specific within Track A), never a blended gate: (1) validate
the mechanism once per fork (D18); (2) cross-check the runtime dump to stamp
each entity's D13 level (D19); (3) route by level -- level-3 -> may ship
autonomously; level-2 -> assistant/MCP-usable, never auto-shipped; level-1 ->
mechanism did not run.

**Why:** Two fully independent contracts duplicate the three-stage reasoning
and let the tracks drift on what "shippable" means.

**Implication:** D13's three-level state is the single shared spine stage 3
reads identically for both tracks; stages 1-2 carry track-specific (Track A:
feeder-specific) gates. This is one phase's contract, instantiated twice.

## D18. Stage 1 -- hard, all-or-nothing, loud, one-time-per-fork mechanism-validation gate

**Decision:** Composition: Track A's 3 probes (`sb_qtvlist_url`
genuine-dead/zero-caller -- call-graph feeder; `gl_outline_scale_world`
genuine-dead/commented-register -- textual feeder; `cl_bobhead` in `V_Init`
reachable -> build-explained) + Track B's anchors (bare `radar`;
`+hud_radar`/`-hud_radar`; `togglehud` untouched). Run once per fork at that
fork's pinned validation commit (ezQuake = HEAD `3f9e724f`). ANY probe wrong
-> the passenger emits NO signal for that fork, pipeline falls back to exactly
today's output, failure is LOUD (visible pipeline error, operator alerted).
NOT per-gate soft degradation. NEVER a per-version output comparison.

**Why:** The probe set is tiny and the contract years-stable; a red probe
means the mechanism is broken OR upstream moved what it models -- the
confidence claim is then void by definition.

**Implication:** The acceptance phase WIRES this; the two mechanism phases
ship their own probes as self-contained validation so the wiring is
composition, not new logic (X2 -- avoids the regime collision). A new version
legitimately yields its own anomaly set -- the harness does not run
per-version and cannot be tripped by version drift.

## D19. Stage 2 -- runtime dump is the overriding answer key

**Decision:** Static proposes, the dump disposes; on ANY static-vs-dump
disagreement the dump wins and the conservative direction is taken (Track A
drops the accusation -- D3; Track B does not ship the name -- D8). The
version-pin sanity proxy (the `sb_qtvlist_url`-style known-live leak check
already used in detection) is a HARD sub-gate: broken pin -> ZERO level-3
stamps for that dump, everything falls back to level-2.

**Why:** Level-3 (autonomous trust) exists ONLY for commits with a pinned
dump -- by design, not a gap.

**Implication:** The acceptance phase implements the version-pin proxy
(review-findings R6) and the dump cross-check. Every other version is
permanently level-2 (assistant-usable, never auto-shipped) -- the strict-bar
consumer, not a defect.

## D20. Track A application -- two outputs, two consumers

**Decision:** (1) Always-on per-version L1 signal over the whole banked pool
(74 commands + 92 cvars at HEAD `3f9e724f`): every member gets its Track-A
provenance populated (D15 conclusion + feeder-tagged per-variant evidence +
D13 level), per-version, sparse. (2) Narrow autonomous delete-list: ONLY the
level-3 dump-confirmed "unreachable everywhere compiled" core +
commented-register subclass, PR-ready to nano/slime as a REGENERATION of the
already-shipped `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
(same artifact shape, mechanism-generated). The build-excluded bucket (incl.
D5 conservative residue) lives ONLY in the L1 signal, NEVER in the
delete-list. Each delete-list entry feeder-tagged (D7.1/D15).

**Why:** Two near-disjoint consumers; consistency with the already-shipped
artifact.

**Implication:** The application phase regenerates the existing in-repo
artifact's exact shape (review-findings R4). No undifferentiated "these are
dead" list.

## D21. Track B application -- recovered HUD commands as first-class entities

**Decision:** Each recovered command -- bare `<name>`, `+hud_<name>`,
`-hud_<name>` -- becomes a first-class L1 `command` entity, distinguished
only by its Track-B provenance field (recovery origin + D16 element link).
Emitted at every version the passenger runs; the dump-confirmation slot
stamps level-3 where a pinned dump confirms, level-2 elsewhere. NOTHING
withheld (D8's "dump-confirmed only" is correctly scoped to the level-3
autonomous-trust tier; level-2 is the defined assistant-usable state).
Commands-only (cvar family struck -- D11 amended).

**Why:** First-class entities feed the doc-gap follow-on (they become visible
to the `needs_doc` audit).

**Implication:** The application phase emits these through the D13 levels; it
does NOT withhold level-2 commands.

## D22. Per-fork, per-track onboarding precondition (sharpens D2)

**Decision:** A fork's passenger stays OFF (single on/off seam = exactly
today's pipeline for that fork, fail-safe) until two fork-specific artifacts
exist: (1) a fork-specific known-answer harness -- shared SHAPE (D18's
hard/all-or-nothing/loud structure), probe ENTITIES re-derived from that
fork's own source, validation one-time/mandatory/NON-transferable; (2) a
fork-pinned runtime dump for level-3 -- absent it the fork rides permanently
at level-2 (a valid useful state, not a failure). Evaluated PER TRACK: a
server-only fork (MVDSV) has no client HUD -> Track B N/A there while Track A
applies.

**Why:** Forks differ in entry cascade, registration APIs, HUD presence; the
strict-bar consumer cannot accept "it worked for ezQuake so it works here."

**Implication:** This arc satisfies the precondition for ezQuake only. The
off-by-default toggle (D6/D9) is the structural enforcement. No phase
onboards another fork.

---

# Cross-cutting execution invariants (X1-X10 -- arc-planner added)

## X1. Phase atomicity -- each phase commits a working state

Each phase ends in a verifiable, runnable state and commits there. The
extractor pipeline runs (with the new passenger toggled on for ezQuake) and
existing output stays byte-identical at every phase boundary. No phase leaves
the pipeline broken "until the next phase."

## X2. Verification regime is self-contained -- no regime collision

Every phase's verification probes confirm the phase landed WITHOUT requiring a
later phase to exist. Specifically: the two mechanism phases ship their OWN
known-answer probes (Track A 3-gate on the `reachable()` query + the
commented-register feeder; Track B 3 HUD anchors on the handler JSON) and
verify against the mechanism's own output -- NOT against an L1 column the
schema phase has not built yet, NOT against the combined harness the
acceptance phase wires later. The acceptance phase's harness is then
composition of already-validated probes, not new validation logic. This is
the load-bearing slicing invariant; a phase that verifies via a later phase's
artifact is a collision -- bounce it.

## X3. Non-corrupting zero-diff bar (D6/D9 -- the codebase's established bar)

Both passengers are read-only observers on the existing single per-variant
walk. Existing entity output MUST stay byte-identical, verified by a real
before/after diff of the extractor's emitted JSON (toggle off vs the prior
HEAD output) -- asserted-in-prose is not acceptable; the phase ships the
actual diff command and its empty result. Any passenger failure biases only
toward "reachable"/"emit nothing" (the safe direction), never corrupts an
entity.

## X4. Single toggle seam, fail-safe-off, per-fork

One subscription line + one orchestration boolean per passenger. Off => not
subscribed => zero edges/BFS/emission => today's pipeline exactly, no residual
cost. Off is the default for every fork except ezQuake (D2/D22). The toggle IS
the per-fork gate -- not a separate mechanism.

## X5. No-subagent-for-mechanical; subagent-default for code synthesis

Per `feedback_no_subagents_for_mechanical_edits` (sharpened): purely textual
edits with full content shipped inline + no logic -> inline. Code synthesis
(the call-graph module, `_handler_hud.py`, schema migration, loader adapter,
the harness, the delete-list generator, probes) -> subagent dispatch. This is
a code-synthesis arc; expect near-zero inline. The phase-template >70%-inline
guard defends the qw-oracle Arc 1 inline-execution defect.

## X6. Model + effort per task shape

Per `feedback_model_effort_range`: Sonnet medium is the floor for reasoning;
Haiku only for genuinely mechanical text; Opus MAX for architecture /
cross-cutting / post-arc analysis. The call-graph mechanism design and the
unified-schema design are Opus-MAX-shaped; mechanical code synthesis against a
locked spec is Sonnet-medium-shaped; plan verification is Sonnet-medium
Explore-shape. Annotated per task in each phase MD.

## X7. Do NOT re-run detection; do NOT re-open the brainstorm

Detection is DONE and banked. The candidate pools are **74 commands + 92
cvars** at HEAD `3f9e724f` (the spec's re-measured numbers after mini-arc
`8093e42f` -- NOT the parking doc's stale 77/97/166; review-findings F2). The
Track-B reverse-diff is **~129 genuine hidden commands** (NOT ~132;
review-findings F2). No phase re-runs `cvarlist`/`cmdlist` detection or
re-derives the pools. No phase re-opens D1-D22.

## X8. Spec/parking "verified" numbers are hypotheses until re-checked live

Per `feedback_parking_verified_state_is_hypothesis`: the spec's "measured /
verified" pool numbers and line cites are hypotheses until the executing
terminal re-runs the sanity gate (`sb_qtvlist_url` a genuine candidate, no
known-live leaked) against the live DB at execution time, and re-verifies
line cites against live source. Each phase MD's "Recon facts (verified)"
sub-block records what was re-checked and when. Trust live code over prose; on
disagreement STOP and re-plan with the operator.

## X9. Repair via re-extract, never SQL UPDATE in place

Per `feedback_repair_by_reextract_not_sql_update`: if a loader/handler bug
corrupted DB data, recovery is "re-run the corrected extract+load
end-to-end," never "UPDATE the bad rows." Every Recovery section states this.

## X10. ASCII / output discipline in all shipped docs and code

Per `feedback_output_discipline_sentiment`: ASCII-only in phase MDs, code, and
any inlined content -- no em-dash, en-dash, or emoji. Use `--` for dashes
(match the exemplars). Comments explain why, not what.

---

# Non-goals / siblings (explicit out-of-scope -- confirm-exclude, do not relitigate)

- **The `hud_<name>_<subvar>` settings-cvar half** -- already extracted as
  first-class `source_backed type='cvar'` entities by
  `ezquake/_handler_cvars.py` (D11 amended). The new `_handler_hud.py` MUST
  NOT touch cvars (collision, R7).
- **ezQuake help-JSON documentation-gap arc** -- NEW future arc, parking
  `docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`,
  sequenced AFTER this arc (genuine dependency: this arc produces the true
  entity set the doc-gap arc consumes). NOT this arc's scope.
- **Pre-existing 1429 `hud_*` cvars carrying the D16 element key** -- a cheap
  future sibling wire (`_handler_cvars.py` already knows the element); NOT
  this arc.
- **`Cmd_AddLegacyCommand` `legacy_alias_of` persistence; trailing-comment
  harvester precision** -- metadata-fidelity siblings in the feeder doc;
  future separate L1-extractor arc.
- **FTE / QWCL / MVDSV ship** -- per-fork gated follow-ons (D2/D22). Off by
  default; not onboarded here.
- **Detection-side runtime-dump automation** (slipgate mailslot POC) --
  parked future detection-side work, not this arc.
- **L1 entity-name case fidelity** -- separate mini-arc, already SHIPPED
  (`8093e42f`); this arc consumes its clean pools, does not redo it.
- **Re-running detection / re-deriving the candidate pools** -- DONE and
  banked (X7).

If a phase drifts into any of these, that is scope creep -- flag it as a
deviation, do not silently proceed.
