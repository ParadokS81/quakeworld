# Design: enforce L1 runtime-truth (ghost elimination + hidden-command recovery)

**Status:** Brainstorm Passes 1-3 COMPLETE (Pass 1 AMENDED; Pass 3 widened Track B). Passes 4-5 pending, fresh terminal each.
**Predecessor:** parking `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`.
**Role:** drain target for arc-brainstormer Passes 1-5. arc-planner scaffolds the arc against this.

## Arc North Star (operator-stated, 2026-05-16)

Enforce L1 to show what is actually present and working at runtime. Today L1
lies in two directions:

- it SHOWS non-working commands (registered in dead code -> ghosts), and
- it HIDES working commands (runtime-built names the literal AST extractor
  never sees -> e.g. the HUD `+hud_*` family).

Bi-directional, same outcome: L1 is not telling the truth. The arc makes L1
truthful. One coherent goal; the two mechanisms are phased and separately
gated (no mechanism blending), but it is ONE arc because it fixes one thing:
L1 fidelity to runtime reality.

## Locked decisions

### D1 (SQ1.1, AMENDED 2026-05-16) -- one arc, two tracks

Original Pass-1 lock was ghosts-only with the HUD family a sibling. Amended
on operator decision: the HUD reverse-diff is pulled IN as a second track --
conceptually it fixes the same thing (L1 not showing the truth). Phased,
separately gated, zero mechanism blending.

- **Track A -- Ghost elimination** (L1 SHOWS non-working). Mechanism:
  libclang call-graph reachability -- is the registering function reachable
  from program entry? Output: per-entity `runtime_reachable` signal; classify
  the candidate pool genuine-dead vs `#ifdef`-build-excluded. Gate: the
  3-case known-answer harness (`sb_qtvlist_url` zero-caller,
  `gl_outline_scale_world` commented-register, `cl_bobhead` in `V_Init`
  reachable) + pool cross-check vs the runtime dump.
- **Track B -- Hidden-command recovery** (L1 HIDES working). Mechanism: model
  the `HUD_Register(name, ..., flags, ...)` contract -- emit the bare
  `<name>` command (`hud.c:1232`) and `+hud_<name>`/`-hud_<name>`
  (`hud.c:1271-1278`) when `HUD_PLUSMINUS` is set. Gate: those names present
  in L1 + cross-checked present in the runtime dump; lightweight drift guard
  (`+hud_radar` rediscovered each run). **RESOLVED Pass 3 (D8):** all 83
  `HUD_Register` first args are literal (0 non-literal tail) -- no constant
  propagation needed. **AMENDED Pass 3 (D11):** Track B widened from
  hidden-*command* recovery to the FULL `HUD_Register` contract -- also the
  runtime-built `hud_<name>_<subvar>` settings cvars (`HUD_CreateVar`,
  `hud.c:1146`); same call site, same mechanism.
- **Shared foundation (FOUNDATIONAL -- blocks both tracks).** The
  command-direction detection harness is case-broken: it compares L1
  (lowercased) against the runtime dump (source case) case-sensitively. The
  cvar pool got a `-cf` case-folded variant; commands never did. VERIFIED
  consequence (2026-05-16): this inflates the Track-B reverse-diff (~132) AND
  injects >=3 false ghosts into the 77-entry Track-A pool (`loadfragfile`,
  `unignoreall`, `unignoreall_team` -- present in both L1 and runtime, only
  case-mismatched). The harness must be case-normalized before either track
  trusts its input. The measurement instrument must itself be truthful first.

### D2 (SQ1.2) -- ezQuake-first (unchanged)

Both tracks' mechanisms are engine-general in the shared handler tier;
validate + ship ezQuake only (the only fork with a version-pinned runtime
answer key). FTE/QWCL/MVDSV = per-fork gated follow-on; cost dominated by
producing each fork's pinned runtime dump; uneven (MVDSV cheap, QWCL likely
expensive, FTE between).

### D3 (SQ2.1, LOCKED 2026-05-16) -- conservative never-false-accuse posture + root set

Governing rule for the entire Track-A call-graph mechanism: bias hard toward
never false-accusing a live entity; accept under-report; the runtime dump
mops residue. Rationale: Track-A output is an autonomous published verdict
(dead-entity PR -> nano/slime, consumed unseen) -- the strict-bar consumer
case (memory `reference_rigor_bar_follows_consumer`). A false accusation
ships a wrong "delete this" PR; a missed ghost merely stays one more cycle in
the human-gated runtime-dump pool. Asymmetric cost -> asymmetric bias.

Root set, computed PER build config (the 4 ezQuake variants
client/server/win/apple, verified live in `extractor_lib/clang_config.py`:
`clang_args_for` / `_server_for` / `_win_for` / `_apple_for`):

1. The variant's program-entry cascade. Client variants (client/win/apple):
   `main` -> `Host_Init` -> the `CL_Init`/`Cvar_Init`/per-subsystem `*_Init`
   chain. Server variant (`SERVERONLY`/`SERVER_ONLY`): the distinct
   dedicated-server entry; client subsystems are not compiled there.
   win/apple share the client root (they only add `_WIN32`/`__APPLE__`).
2. Address-taken closure. Any function whose address is taken anywhere in
   that variant's compiled TU set (stored in a `cmd_function_t` table, passed
   as a callback, assigned to an `on_change` pointer) is ALSO a root.

Everything downstream in Pass 2 (edge construction, per-config union,
classification) inherits this posture. Rejected alternative: an aggressive
stance (flag more; tolerate some false accusations to auto-catch more
ghosts) -- declined; wrong for the unseen-published-verdict consumer.

### D4 (SQ2.2, LOCKED 2026-05-16) -- reachability propagates through the full subtree

Edge rule: a function in the reachable set (entry-cascade root OR
address-taken root per D3) is FULLY traversed -- every direct call in its
body adds its callee, transitively. Address-taken roots are not dead-end
markers; their entire downstream subtree is reachable too (a pointer-invoked
handler genuinely runs, so what it registers/calls genuinely runs). Refusing
to traverse a pointer-invoked body would re-introduce the false accusations
D3 forbids. Consequence (intended, not a weakness): reachability is a wide
over-approximation; the genuine-dead set is small and high-confidence --
exactly what the unseen-published-verdict consumer needs. Expect the
call-graph to CLEAR most of the ~166 pool as reachable-but-build-excluded
and return a small hard core of true ghosts.

### D5 (SQ2.3, LOCKED 2026-05-16) -- three-valued per-config state + conservative combination + auto-ship boundary

Per suspect entity, per build variant, the registrar resolves to one of
THREE states (the third is load-bearing):

- **reachable** -- registrar runs in this variant.
- **unreachable** -- present but no path from roots (the `sb_qtvlist_url`
  orphan shape).
- **not-compiled** -- `#ifdef` excluded the registrar's function from this
  variant entirely; absence here is build-gating evidence, NOT death.

Conflating not-compiled with unreachable is the central false-accusation
trap D3 forbids.

Combination rule (conservative; inherits D3):

- Reachable in >=1 variant -> cleared as **build-excluded** (real code; the
  dumped build merely lacked the path). Never shipped as dead.
- Unreachable in EVERY variant where compiled, AND compiled in >=1 variant
  -> **genuine-dead core**.
- D3/D4 residue (genuinely dead but address-taken => marked reachable) lands
  in build-excluded -> human review, never auto-condemned. Accepted
  under-report; no false PR ships.

Output boundary (rigor-bar split, memory
`reference_rigor_bar_follows_consumer`): ONLY the "unreachable everywhere
compiled" core + the commented-register subclass (`gl_outline_scale_world`)
is the autonomous published delete-list to nano/slime. The whole
build-excluded bucket (incl. conservative residue) is human-gated, not
auto-shipped. Detection (runtime dump) DEFINED the pool; the call-graph only
EXPLAINS each pool member's absence (orphan vs build-gated). The final static
verdict is still cross-checked vs the runtime dump before ship -- that gate
is Pass 5.

### D6 (SQ2.4, LOCKED 2026-05-16) -- integration: shared passenger on the existing walk; non-corrupting + cleanly toggleable

Option A locked (over Option B's separate dedicated pass). The call-graph is
a self-contained Tier-1 shared module (one new file beside `_visitor.py` /
`clang_config.py`) that OBSERVES the single existing per-variant walk --
collecting caller->callee edges + address-taken facts read-only into its own
private store -- then runs the per-variant BFS post-walk and exposes ONE
downstream contract: `reachable(entity) -> {yes/no, which variants}`. BFS,
per-variant union (D5), and address-taken bookkeeping (D3/D4) stay hidden
behind that query.

Locked properties (operator-gated):

- **Purely additive / non-corrupting.** Read-only observer, own storage,
  zero contact with existing handler state. Existing entity output stays
  byte-identical, verified by a zero-diff check before/after (this
  codebase's established non-invasive-change bar). Walk recursion is
  UNCHANGED -- reuses the existing target-file filter; system/3rd-party
  header calls intentionally excluded (engine-internal reachability only).
  Fail-safe by construction: any call-graph failure can only bias toward
  "reachable" (D3 safe direction), never corrupt an entity or manufacture a
  false accusation.
- **Modular + cleanly toggleable.** Single integration seam (one
  subscription line); single orchestration-level boolean. Off => not
  subscribed => zero edges/BFS/signal => today's pipeline exactly, no
  residual cost (no parse added; the 4-variant parse already happens). This
  on/off seam IS D2's per-fork gating: enable for ezQuake, leave off for
  FTE/QWCL/MVDSV until each fork's answer key exists.

Rejected: Option B (separate dedicated call-graph pass) -- re-pays the parse
(the slowest stage) and clones walk machinery for no correctness gain.

### D7 (SQ2.5, LOCKED 2026-05-16) -- scope boundaries closing Pass 2

1. **Commented-register is a SEPARATE feeder, not the call-graph.** libclang
   strips comments before the AST, so a `// Cvar_Register(...)` is invisible
   to reachability. The genuine-dead auto-ship list (D5) therefore has TWO
   independent feeders: (a) call-graph "unreachable everywhere compiled" --
   Pass 2's mechanism; (b) commented-register textual detection -- a separate
   already-understood concern (the extractor already runs textual passes),
   NOT built in Pass 2. Pass 4 provenance MUST distinguish (a) vs (b); Pass 5
   harness gates test different feeders (`sb_qtvlist_url` -> feeder a;
   `gl_outline_scale_world` -> feeder b).
2. **Entity -> registrar is a non-issue.** The extractor already records the
   exact registration call-site line; its enclosing function is the BFS
   target. No new mechanism.
3. **Signal representation is Pass 4.** Pass 2 yields the algorithm + the
   per-entity verdict; the L1 schema/column/provenance for `runtime_reachable`
   is explicitly Pass 4 scope. Boundary flagged, not crossed.

### D8 (SQ3.1, LOCKED 2026-05-16) -- Track B emission model: full static `HUD_Register` contract, runtime-dump-gated

Track B mechanism is literal + constant-flag modeling of the single
`HUD_Register` contract. It is NOT a call-graph (zero Track-A blend; D1's
hard no-mechanism-blending rule holds).

**Verified foundation (live source, HEAD `3f9e724f` -- the L1-extracted
commit; version pin holds).** A tokenizing scan of all `HUD_Register(` call
sites (walking every wrapped/multi-line form, not a naive grep): **83 call
sites, 100% literal string first arg, ZERO non-literal.** D1's open Pass-3
sub-question ("are ALL first args literal? full set needs the AST to size a
possible non-literal tail") is **RESOLVED BY MEASUREMENT: the tail is
empty.** Consequence: no interprocedural constant propagation, no AST
dataflow -- the mechanism is pure literal/constant reading. (Line cites
re-verified, no drift: definition `hud.c:1182` / prototype `hud.h:133`;
`HUD_PLUSMINUS = (1<<10)` `hud.h:37`.)

**The contract (two parts):**

- **(a) Bare `<name>` -- unconditional.** One per `HUD_Register` call:
  `Cmd_AddCommand(name, HUD_Func_f)` at `hud.c:1232`. Emit the literal
  arg #1 for all 83 sites.
- **(b) `+hud_<name>` / `-hud_<name>` -- gated.** Emitted only when the
  call site's `flags` arg (`HUD_Register` param #4) literally contains
  `HUD_PLUSMINUS` AND its `show` arg is a non-NULL literal. Active path:
  `Cmd_AddRemCommand(cmdname, HUD_Plus_f/HUD_Minus_f)` at `hud.c:1273-1278`,
  double-gated by `if (show)` (1265) + `if (flags & HUD_PLUSMINUS)` (1269).
  The `flags` arg is a compile-time constant expression at the call site
  (e.g. `HUD_PLUSMINUS | HUD_ON_SCORES`) -- read it statically; no dataflow.

**Safety net (D3 conservative spirit; `reference_rigor_bar_follows_consumer`).**
Every statically-emitted name is cross-checked against the runtime dump
(the Track-B answer key) before it counts. Static says "should register";
the dump confirms "does register"; only dump-confirmed names ship to L1.
Never emit a speculative `+hud_X` absent from the dump.

**Rationale for full-contract over bare-only** (operator: "better too much
info than too little"): full static modeling earns per-name provenance for
Pass 4 (each `+hud_*` is explainable from its call site, not merely "showed
up in the dump") and a real drift guard (assert `+hud_radar` rediscovered
each run). Rejected alternative: bare-only static + `+/-` from the dump
alone -- simpler but discards provenance and weakens the drift guard.

**Implementation-shaped residual (NOT brainstorm; arc-planner/executor
gate).** The 0-non-literal-tail finding is from a textual tokenizing probe,
strong signal but not the libclang AST instrument (handoff rule: do not
trust your own probe). Implementation must confirm 0 non-literal first args
via the extractor's actual AST before the literal-only assumption is load-
bearing in code.

### D9 (SQ3.2, LOCKED 2026-05-16) -- Track B integration: new dedicated `ezquake/_handler_hud.py`, additive + non-corrupting + toggleable

The Track-B mechanism is a NEW project-private handler
`ezquake/_handler_hud.py` (matching the established 8-handler architecture --
memory `project_extraction_pipeline_vision`). It owns the `HUD_Register`
contract (D8) end to end.

**Verified premise (banked, primary-sourced in the feeder doc; not
re-derived).** The existing command handler emits NOTHING for
`Cmd_AddCommand(name, HUD_Func_f)` (`hud.c:1232`) -- `name` is a function
parameter, not a literal or `#define`, so the literal-keyed handler
correctly skips it. That is *why* the ~129 are hidden. Consequence: Track B
is **purely additive** -- it introduces currently-absent entities and
modifies/suppresses no existing emission.

**Inherits D6's discipline (the codebase's established non-invasive bar, NOT
a Track-A-only property):**

- Existing entity output stays byte-identical, verified by the same
  zero-diff check before/after. The HUD handler only ADDS the previously
  hidden entities and touches no other handler's state.
- Cleanly toggleable: single boolean / subscription seam; off == today's
  pipeline, no residual cost. This on/off seam IS D2's per-fork gating --
  enable for ezQuake, off for FTE/QWCL/MVDSV until each fork's HUD contract
  + pinned answer key exists.

**Architecture-level no-mechanism-blend (mirrors D1 at the code layer).**
Contract-modeling stays OUT of the literal command handler; neither
mechanism contaminates the other.

Rejected: (2) extend `_handler_commands.py` -- couples Track B to the
literal-only handler whose blind spot created the gap. (3) generalize to a
shared Tier-1/2 wrapper-contract pattern -- premature factoring (Tier-2
rule: lift on the second consumer; there is exactly one `HUD_Register`
contract, ezQuake-only; grug-brain don't-factor-early).

### D10 (SQ3.3, LOCKED 2026-05-17) -- Track B drift guard: lightweight known-answer set, NOT speculative change-detection

Decision: a lightweight known-answer drift guard only. NOT speculative
change-detection / AST-diffing / template-move heuristics. Confirms the
operator's Pass-1 lean (feeder doc: "lightweight known-answer drift guard
only ... do NOT build speculative change-detection -- HUD has been stable
for years"). Rationale: a years-stable contract does not warrant carried
adaptive machinery; if an upstream rewrite breaks the contract the
known-answer anchors fail loudly and we re-model then ("cross the rewrite
bridge if/when it happens").

**Anchor set (design; lives here, not in the operator conversation --
memory `feedback_plain_english_at_decision_points`), paralleling Track A's
3-gate harness shape:**

1. **Bare-name positive.** `_handler_hud.py` emits `radar`; `radar` present
   in the runtime dump.
2. **`+/-` positive.** It emits `+hud_radar` and `-hud_radar` (radar
   verified live HEAD `3f9e724f`: `flags` arg #4 == `HUD_PLUSMINUS`, `show`
   arg #8 == `"0"` non-NULL); both present in the dump.
3. **Literal-control / failure-mode gate.** `togglehud` (`hud.c:819`,
   literal `Cmd_AddCommand`, NOT `HUD_Register`) stays present and is NOT
   emitted/duplicated by `_handler_hud.py`. The D9 additivity discipline as
   a known answer -- the analogue of Track A's `cl_bobhead` gate that
   catches the failure the positive gates cannot (handler over-reaching
   into literal commands).

**Pass-3 / Pass-5 boundary.** Pass 3 LOCKS the anchor set + semantics
(design). Pass 5 WIRES it into the combined known-answer harness beside
Track A's 3-gate and owns the full ~129-name runtime-dump cross-check (the
acceptance gate). Mirrors D7.3 (signal repr -> Pass 4) and D5/D7 (Track A
harness wiring -> Pass 5): design here, wiring there.

**Domain note (operator, 2026-05-17).** `+hud_<name>`/`-hud_<name>` are a
press/release pair (hold-to-show / release-to-hide, bind-style like
`+attack`/`-attack`). Confirms these are genuine user-facing bindable
commands -- reinforces Track-B value; does not reshape D8/D9.

### D11 (SQ3.4, LOCKED 2026-05-17) -- Track B scope widened: the FULL `HUD_Register` contract (commands + settings cvars)

Track B is no longer hidden-*command* recovery only; it recovers the entire
`HUD_Register` runtime-built-name contract. Amends D1's Track-B definition.

**Verified mechanics (live HEAD `3f9e724f`).** `HUD_CreateVar(char
*hud_name, char *subvar, char *value)` (`hud.c:1146-1165`) builds
`snprintf(buf, "hud_%s_%s", hud_name, subvar)` then `Cvar_Register(var)` --
a runtime-built cvar name, the SAME hidden-name class as the bare / `+-`
commands (literal AST extraction never sees it). Per `HUD_Register` call the
body emits:

- a fixed structural subvar set with literal subvar strings: `order`
  (gated), `place`, `show` (gated), `pos_x`, `align_x`, `pos_y`, `align_y`,
  `frame`, `frame_color`, `item_opacity`, `draw` (unconditional) -> cvars
  `hud_<name>_<subvar>`;
- a variadic tail loop `hud->params[i] = HUD_CreateVar(name, subvar, value)`
  over the `...` (subvar,value) pairs, string literals at the call sites
  (radar sample: `"opacity","0.5","width","30%", ...`).

**Consequence for the mechanism (D8/D9/D10).** D8's contract gains part (c),
the `hud_<name>_<subvar>` cvar family; literal-only modeling still holds
(name literal + subvar literal; structural set + literal varargs pairs; no
dataflow) with the same per-arg static gating pattern as the `+-` pair
(some unconditional, some gated on a param being a non-NULL literal). D9's
`_handler_hud.py` owns it (same call site already parsed). D10's drift
guard gains a cvar anchor (`hud_radar_opacity` emitted + dump-present).
D8's dump-gated conservative safety net extends unchanged -- only
runtime-dump-confirmed cvar names ship.

**Tracked downstream re-sizing (not a Pass-3 blocker; flagged per
`feedback_every_finding_gets_a_track`).** Pass 4's L1 signal/provenance
schema must span THREE HUD families (bare commands, `+-` command pairs,
`hud_*` settings cvars) under one model. Pass 5's combined known-answer
harness gains the Track-B cvar anchor; its full runtime-dump cross-check
now spans the HUD command pool (~129, banked) PLUS a HUD settings-cvar pool
whose hidden count is UNMEASURED. That count is a Pass-5 detection input,
deliberately not measured now (handoff: do NOT re-run detection); safe to
scope in pre-count because D8's dump-gating ships only confirmed names.

**Implementation residual (arc-planner/executor; extends D8's).**
AST-confirm both (i) 0 non-literal `HUD_Register` first args and (ii) the
variadic `HUD_CreateVar` subvar/value pairs are string literals -- the
textual probe is strong signal; the AST is the instrument.

Rejected: commands-only this arc, cvars a follow-on -- re-pays identical
contract understanding later, leaves the North Star visibly half-met for
HUD (configs are `hud_*`-cvar-heavy), hand-picked subset against
exhaustive-mapping discipline.

## Out of scope -- siblings (remain in the feeder doc)

Metadata-fidelity, NOT presence-fidelity -- outside the runtime-truth North
Star. Future separate L1-extractor arc:

- `Cmd_AddLegacyCommand` `legacy_alias_of` persistence (loader/schema).
- Trailing-comment harvester precision.

RETRACTED, do-not-propagate: the same-session "missed-literal extractor bug"
(`unignoreAll`/`loadFragfile`) was the case-fold artifact -- now correctly
explained as the shared-foundation finding above; no separate finding.

## Carry-forward (Pass 2, parked) -- automate the detection-side runtime dump

Detection (runtime `cvarlist`/`cmdlist`/`macrolist` capture) is out of scope
for this arc but is currently a manual per-pinned-build step. Operator flagged
2026-05-16: stable releases are rare (manual capture tolerable) but HEAD moves
almost daily, and the goal is near-real-time HEAD ingestion. The slipgate-app
mailslot-IPC POC (headless start ezQuake / send commands / close, built for
screenshot automation -- memory `project_slipgate_screenshot_automation`) is a
candidate to automate dump capture and enable nightly-release tracking.
Parked: NOT this arc, future detection-side automation. Revisit when
nightly-release ingestion reaches the roadmap.

## Revised pass plan

| Pass | Scope | Status |
|---|---|---|
| 1 | Scope + boundary (two-track, runtime-truth North Star) | COMPLETE + AMENDED 2026-05-16 |
| 2 | Track A call-graph construction mechanism (shared foundation dropped -- closed by measurement) | COMPLETE 2026-05-16 (D3-D7) |
| 3 | Track B mechanism (`HUD_Register` contract; literal-tail sizing; drift guard; scope widened to commands+cvars) | COMPLETE 2026-05-17 (D8-D11) |
| 4 | Unified L1 fidelity schema + provenance (one signal model: Track A + the three HUD families) | NEXT |
| 5 | Application + dual acceptance gates (classify ghosts; emit HUD commands+cvars; combined known-answer harness) | pending |

Pass count grew 4 -> 5: a second mechanism track legitimately adds a pass.
Still one coherent arc, phased. Pass 2 closed 2026-05-16 (Track-A mechanism
fully specified, D3-D7). Pass 3 closed 2026-05-17 (Track-B mechanism fully
specified, D8-D11; literal-tail RESOLVED by measurement = empty; scope
widened to the full `HUD_Register` contract -- commands AND `hud_*` settings
cvars). Pass 4 (unified L1 fidelity schema + provenance) NEXT, fresh
terminal. No pass added by the widen -- D11 absorbed it into the existing
Pass-3 mechanism scope; the re-sizing lands as tracked Pass-4/Pass-5
carry-forwards, not a new pass.

## Spun-out (2026-05-16) -- L1 entity-name case-fidelity mini-arc

During Pass 2 SQ2.1 the operator scoped the *structural* case fix out into
its own mini-arc: `docs/superpowers/parking/2026-05-16-l1-entity-name-case-fidelity-miniarc.md`
(loader stores source-case `name` + a DB-enforced generated fold-key column
with the `token_primitive` carve-out preserved; loader-only + reload, no
re-extraction).

Consequence for THIS arc: Pass 4's "L1 source-case representation"
carry-forward is **superseded** -- Pass 4 does NOT pick up name-case
representation. Pass 4's scope remains the `runtime_reachable` signal schema
+ provenance only. The Pass-2 **shared foundation** stays in this arc but
narrows to the *bash-harness* command case-fold (`/tmp/front1-diff.sh`
command direction); it is shell-level, independent of the mini-arc, and does
not block on it.

### SHIPPED 2026-05-16 -- and it MOVED THE PASS-2 PREMISE (read before Pass 2)

Mini-arc SHIPPED, commit `8093e42f`; retrospective in
`apps/qw-oracle/docs/arc-history.md` (2026-05-16 entry). Verified by this
(overseer) terminal against live git+DB: `entities.name` is now uniformly
source-case across all 5 engines; structural fold via generated
`entities.name_fold`; `token_primitive` `$B`/`$b` carve-out intact;
known-answer trio (`unignoreAll`/`loadFragfile`/`unignoreAll_team`)
source-case in `name`, folded in `name_fold`. (The fold was a *four-site*
surface, not the single `natural-keys.ts` site this arc's spin-out premised
-- the parking doc's RE-VERIFY checklist caught it; memory
`feedback_parking_verified_state_is_hypothesis`.)

**Premise change for Pass 2 -- RE-MEASURED 2026-05-16 on the shipped DB
(verified, not inferred).** `/tmp/front1-diff.sh:19` reads `entities.name`,
now source-case. The overseer terminal re-ran the banked diff on the shipped
DB (L1 head still `3f9e724f`; SANITY GATE passed -- `sb_qtvlist_url` a
genuine candidate, no known-live leaked: the designed version-pin proxy
holds). Results:

- **Track A -- case-artifact false ghosts GONE (measured).**
  `unignoreAll`/`loadFragfile`/`unignoreAll_team` (all six case forms)
  absent from the command candidate pool. Command pool **77 -> 74** -- that
  74 is *exactly* the number Pass-1 had to compute by an ad-hoc case-fold;
  the structural mini-arc delivered the clean pool with NO harness change.
  Cvar pool **97 -> 92** (= 97 minus the 5 mini-arc mislabel-prunes).
  Arithmetic closes both directions. **SQ2.1's harness case-fold is now
  provably REDUNDANT for Track-A pool correctness** -- it may still be
  applied as defensive case-insensitive `comm` (QW lookup is
  case-insensitive) but it is NOT load-bearing and NOT a Pass-2 gate. The
  shared-foundation sub-question is **CLOSED BY MEASUREMENT**, not a Pass-2
  first-action.

- **Track B -- corrects D1's "(~132)" parenthetical.** D1's
  shared-foundation bullet stated the case gap "inflates the Track-B
  reverse-diff (~132)", implying much of 132 was case noise. MEASURED: the
  reverse-diff went **132 -> 129**; the case gap contributed only the
  3-command trio, NOT the bulk. **~129 is genuine hidden-command signal**,
  not case inflation. The two-track D1 decision stands (Track B is, if
  anything, more real than framed); only the "~132 mostly noise" implication
  is retracted. Pass-3 (Track B) scopes to ~129 real hidden commands.

Net for Pass 2: the shared foundation is settled. Pass 2 proceeds directly
to **Track-A call-graph construction** over the verified-clean
**74-command / 92-cvar** pools. Recommend a fresh terminal for the Pass-2
body (this spec now carries the verified numbers so a cold terminal starts
from fact, not stale Pass-1 figures).
