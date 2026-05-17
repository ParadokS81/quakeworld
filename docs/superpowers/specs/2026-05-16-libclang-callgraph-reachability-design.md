# Design: enforce L1 runtime-truth (ghost elimination + hidden-command recovery)

**Status:** Brainstorm COMPLETE -- Passes 1-5 (Pass 1 AMENDED; Pass 3 widened Track B; Pass 4 = unified schema D12-D16; Pass 5 = application + dual acceptance gates D17-D22, and STRUCK D11's cvar half). EXITED to arc-planner: `docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-planner-handoff.md`.
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

> **AMENDED Pass 5 (2026-05-17) -- CVAR HALF STRUCK (operator-ratified).**
> D11's premise that the `hud_<name>_<subvar>` settings cvars are "the SAME
> hidden-name class ... literal AST extraction never sees it" is **REFUTED by
> live verification** (operator-requested spot-check + dispatched coverage
> audit, both independently re-verified by the overseer terminal against live
> code, the backup DB, and the schema). The cvars are NOT hidden: a wired,
> general `HUD_Register`->cvar synthesis already lives in
> `ezquake/_handler_cvars.py` (`_synthesize_hud_cvars`, dispatched from
> `visit_cursor` on `HUD_Register`) and emits all `hud_<name>_<subvar>` cvars
> as first-class `source_backed type='cvar'` L1 entities (verified: 1429 such
> entities in the backup DB; radar = 32 = 11 structural + 21 variadic; clock
> = 18). `_handler_hud_elements.py`'s "owned-cvar synthesis" is nested
> metadata only, not entities -- which explained the apparent contradiction.
> **Consequence:** Track B narrows to the **command half only** (bare
> `<name>`, `+hud_<name>`, `-hud_<name>` -- still genuinely hidden per D9's
> separately-verified literal-only-command-handler premise, unaffected).
> Riders: (i) the new `_handler_hud.py` (D9) emits **commands only** -- it
> MUST NOT synthesize cvars (duplicate emitter collides with
> `_handler_cvars.py` on `entities UNIQUE(project,type,name)`); (ii)
> annotation fix -- `order` is *unconditional*, `show` is the gated subvar
> (the "structural subvar set" bullet below mislabels `order` as gated;
> handler code is correct, only this prose was wrong); (iii) D16's
> element-link applies to recovered *commands*; whether the pre-existing 1429
> `hud_*` cvars should also carry the element key (the synth already knows it
> = `HUD_Register` arg #1) is a cheap future sibling wire, NOT this arc.
> This is the `feedback_parking_verified_state_is_hypothesis` failure mode a
> locked decision caught at Pass 5; the body below is preserved as the record
> of the path. Where D11 below says "commands + cvars", read "commands only".

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

### D12 (SQ4.1, LOCKED 2026-05-17) -- two separate provenance fields under one shared design language

The unified L1 fidelity signal is NOT one discriminated container. It is
TWO physically separate, independently-nullable provenance fields -- one
for Track A's verdict, one for Track B's recovered-hidden origin -- that
conform to ONE shared provenance design (D14). "One signal model" is the
shared shape + vocabulary, not one column.

Rationale: the consumers are near-disjoint. The autonomous dead-entity PR
path reads only Track A's verdict and never touches HUD; the MCP/LLM +
config-viewer path reads Track B's recovered entities and never touches the
reachability verdict. Separate consumers -> separate fields. D1's
no-mechanism-blend becomes STRUCTURAL: different columns cannot co-mingle;
a reader can never mis-read a Track-B family as a Track-A verdict. Rejected:
one `runtime_fidelity` field with an internal `kind` discriminator -- a
shallow unifying wrapper no single consumer wants whole (Ousterhout
different-abstraction-per-layer; grug don't-factor-early; exactly two
mechanisms, both ezQuake-only).

### D13 (SQ4.2, LOCKED 2026-05-17) -- sparse, per-version, mechanism-derived; three-level coverage semantic

The signal is sparse by construction: it attaches only where a mechanism
found something non-default -- a Track-A ghost verdict or a Track-B
recovered name -- never to the normal majority of entities. The subset is
PER-VERSION and MECHANISM-derived, NOT defined by the HEAD runtime dump.
Each version L1 extracts runs the call-graph / HUD-model passenger on its
OWN AST (free; D6/D9 made them zero-residual passengers on the
already-per-version walk) and finds THAT version's anomalies. The HEAD
dump's role is (i) one-time mechanism validation (the 3-gate known-answer
harness -- MANDATORY; it is what earns the word "confidence"; an
unvalidated static passenger is the structurally-broken-grep failure mode
this arc exists to prevent) and (ii) dump-confirmation of the HEAD slice
only. It does NOT define any version's suspect set. This corrects the
Pass-4-opening misframing that "sparse subset" meant "the HEAD dump pool";
the subset is each version's own mechanism output.

Coverage record carries THREE trust levels (consumer-rigor,
`reference_rigor_bar_follows_consumer`):

1. **no signal** -- mechanism did not run for this version.
2. **high-confidence-generalized** -- mechanism ran, the FORK's mechanism
   is validated (one-time known-answer harness passed), this version is
   NOT independently dump-confirmed. This is EVERY non-HEAD ezQuake
   version. Usable by the approximate-tolerant consumer (LLM/MCP answering
   version-scoped how-to); NOT autonomously shippable.
3. **dump-confirmed** -- mechanism ran AND this version is independently
   dump-confirmed (HEAD `3f9e724f`, plus any release the operator
   deliberately pins). Autonomously shippable.

Per-fork one-time validation is MANDATORY and does NOT transfer across
engines (FTE/QWCL/MVDSV each need their own validation dump before their
passenger is trusted -- D2). Per-version RE-confirmation within an
already-validated fork is the only optional / after-the-fact dump. The
coverage record is a per-fork "mechanism-validated" fact + a per-version
"dump-confirmed" fact; the three levels are exactly what the two consumer
classes demand, no more.

### D14 (SQ4.3, LOCKED 2026-05-17) -- shared three-slot provenance spine

Both fields conform to one shape, three slots:

1. **conclusion** -- Track A: genuine-dead | build-excluded. Track B:
   which HUD family (bare command | `+-` pair | `hud_*` settings cvar).
2. **evidence** -- what produced the conclusion, feeder/family-shaped
   (D15/D16). The slot that makes the verdict trustable rather than
   asserted -- the North Star's "provenance a reader can trust."
3. **dump-confirmation status** -- the D13 three-level coverage state for
   this entity at this version. Representation only; Pass 5 owns the
   actual runtime-dump cross-check (D1/D7.3 representation-not-acceptance
   line held).

### D15 (SQ4.4, LOCKED 2026-05-17) -- Track A arm: final verdict + per-variant breakdown as feeder-tagged evidence

Conclusion slot = the final combined verdict (genuine-dead |
build-excluded). The evidence slot carries the per-build-variant breakdown
(D5's three-valued reachable / unreachable / not-compiled across the 4
ezQuake configs) for the call-graph feeder. The evidence slot is
FEEDER-TAGGED -- this is where D7.1's two-feeder split becomes structural:
call-graph feeder -> per-variant breakdown; commented-register feeder -> a
textual register-site cite. Same conclusion, structurally different
evidence, never blended; Pass 5's feeder-specific gates read the tag.

Rationale: (i) an autonomous published verdict must be auditable --
"unreachable in client, not-compiled in server, unreachable in win/apple"
is falsifiable, bare "genuine-dead" is not; (ii) D13 makes most versions
level-2 (no dump backing) -- the per-variant breakdown is then the ONLY
trust the reader has; (iii) address-taken conservative residue (D5) and
verdict flips are visible/debuggable in the breakdown for free. Tradeoff
accepted: L1 stores some mechanism derivation as evidence -- correct here
because the consumer is an unseen published verdict and level-2 has nothing
else; for a purely human-gated signal the opposite (conclusion-only) would
be right.

Field-shape mechanics (exact variant identifiers, residue-flag encoding,
evidence column/JSON decomposition) are IMPLEMENTATION-shaped ->
arc-planner scaffold, NOT brainstorm.

### D16 (SQ4.5, LOCKED 2026-05-17) -- Track B arm: Linked (element-grouped provenance)

Each recovered HUD name (bare command, `+-` pair member, `hud_*` settings
cvar) is a separate L1 entity, but its provenance carries the HUD ELEMENT
it belongs to (the literal `HUD_Register` arg #1 the model already reads --
D8). The LLM is TOLD that `radar` / `+hud_radar` / `-hud_radar` /
`hud_radar_*` all configure the one `radar` element, and can answer "how
does radar work" as a coherent whole (toggle + hold-to-show pair +
tunables) instead of inferring membership by string-prefix-matching.
Resolves the open Pass-4 carry-forward (Track-B family marker must be
LLM-semantic, not bookkeeping).

Rationale: the North Star is provenance a reader can trust; forcing the
LLM to reverse-engineer element membership from `hud_<name>_<subvar>`
string parsing is exactly the fragile static-string guessing this arc
exists to eliminate, and discards a grouping the contract model already
has for free from source. Rejected: flat (family tag only, LLM infers
grouping by stem) -- fragile, throws away free provenance.

Element-grouping mechanics (how `_handler_hud.py` emits the element key;
loader storage shape) are IMPLEMENTATION-shaped -> arc-planner scaffold.

### D17 (SQ5.1, LOCKED 2026-05-17) -- one shared acceptance-contract shape, per-track instantiation

The acceptance contract is ONE shared shape, three stages, instantiated
SEPARATELY per track (and feeder-specific within Track A) -- never a blended
gate. This mirrors D12 at the acceptance layer: one language, separate
instantiation, structural no-blend. The three stages:

1. **Validate the mechanism once per fork** -- the known-answer harness (D18).
2. **Cross-check the runtime dump** to stamp each entity's D13 level (D19).
3. **Route by level** -- the SAME routing for both tracks: level-3
   dump-confirmed -> may ship autonomously; level-2 -> assistant/MCP-usable,
   never auto-shipped; level-1 -> mechanism did not run.

D13's three-level coverage state is the single shared spine stage 3 reads
identically for both tracks; stages 1-2 carry track-specific (Track A:
feeder-specific per D7.1/D15) gates. Rejected: two fully independent
acceptance contracts -- duplicates the three-stage reasoning and lets the
tracks drift on what "shippable" means, abandoning the D1+D12 balance.

### D18 (SQ5.2, LOCKED 2026-05-17) -- stage 1: hard, all-or-nothing, loud, one-time-per-fork mechanism-validation gate

Composition: Track A's 3 probes (`sb_qtvlist_url` genuine-dead/zero-caller
-- call-graph feeder; `gl_outline_scale_world` genuine-dead/commented-register
-- textual feeder; `cl_bobhead` in `V_Init` reachable -> build-explained) +
Track B's anchors (bare `radar`; `+hud_radar`/`-hud_radar`; `togglehud`
untouched -- the additivity gate). Run once per fork at that fork's pinned
validation commit (ezQuake = HEAD `3f9e724f`).

Failure semantics: ANY probe wrong at the pinned commit -> the passenger
emits NO signal for that fork, the pipeline falls back to exactly today's
output (D6/D9 fail-safe-off seam, existing entities byte-identical), and the
failure is LOUD (visible pipeline error, operator alerted). NOT per-gate
soft degradation. Rationale: the probe set is tiny and the contract is
years-stable (D10); a red probe means the mechanism is broken OR upstream
moved what it models -- the confidence claim is then void by definition, so
partial trust is worse than none for the unseen-published-verdict consumer
(`reference_rigor_bar_follows_consumer`). It is NEVER a per-version output
comparison: a new version legitimately yields its own anomaly set (D13); the
harness does not run per-version and cannot be tripped by version drift --
only by deliberate re-validation/re-pin where source genuinely moved.

### D19 (SQ5.3, LOCKED 2026-05-17) -- stage 2: runtime dump is the overriding answer key

Static proposes, the dump disposes; on ANY static-vs-dump disagreement the
dump wins and the conservative direction is taken: Track A drops the
accusation (entity stays, never false-accused -- D3); Track B does not ship
the name (D8 safety net). The version-pin sanity proxy (the
`sb_qtvlist_url`-style known-live leak check already used in detection) is a
HARD sub-gate: broken pin -> ZERO level-3 stamps issued for that dump,
everything falls back to level-2. Consequence (accepted, by design): level-3
exists ONLY for commits with a pinned dump -- HEAD plus deliberately-pinned
releases; every other version is permanently level-2 (assistant-usable,
never auto-shipped). That is the strict-bar consumer, not a gap.

### D20 (SQ5.4, LOCKED 2026-05-17) -- Track A application: two outputs, two consumers

(1) **Always-on L1 signal** over the whole banked pool (74 commands + 92
cvars at HEAD `3f9e724f`): every member gets its Track-A provenance
populated (D15 conclusion + feeder-tagged per-variant evidence + D13 level),
per-version, sparse. (2) **Narrow autonomous delete-list**: only the level-3
dump-confirmed "unreachable everywhere compiled" core + commented-register
subclass, PR-ready to nano/slime as a REGENERATION of the already-shipped
`apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md` (same
artifact shape, mechanism-generated; consistency). The build-excluded bucket
(incl. D5 conservative address-taken residue) lives ONLY in the L1 signal,
NEVER in the delete-list -- human-gated, no separate artifact. The two
feeders stay structurally separate into the delete-list (D7.1/D15): each
entry feeder-tagged so a reviewer sees WHY it is dead. No undifferentiated
"these are dead" list.

### D21 (SQ5.5, LOCKED 2026-05-17) -- Track B application: recovered HUD commands as first-class entities

Each recovered command -- bare `<name>`, `+hud_<name>`, `-hud_<name>` --
becomes a first-class L1 `command` entity, distinguished only by its
Track-B provenance field (recovery origin + D16 element link, so the LLM is
told `radar`/`+hud_radar`/`-hud_radar` all drive the `radar` element).
Emitted at every version the passenger runs; the dump-confirmation slot
stamps level-3 where a pinned dump confirms, level-2 elsewhere. NOTHING is
withheld -- D8's "dump-confirmed only" is correctly scoped to the level-3
autonomous-trust tier (D19); a level-2 command is mechanism-derived from
that version's own source on a harness-validated fork, which is D13's
defined, assistant-usable state. Making these first-class is what feeds the
doc-gap follow-on (they become visible to the `needs_doc` audit). Cvar
family struck (D11 amended) -- commands-only.

### D22 (SQ5.6, LOCKED 2026-05-17) -- per-fork, per-track onboarding precondition (sharpens D2)

The acceptance contract carries a per-fork, per-track onboarding
precondition. A fork's passenger stays OFF (D6/D9 single on/off seam =
exactly today's pipeline for that fork, fail-safe) until two fork-specific
artifacts exist: (1) a **fork-specific known-answer harness** -- shared
SHAPE (D18's hard/all-or-nothing/loud structure), but probe ENTITIES
re-derived from that fork's own source (a known zero-caller, a known
reachable-init, a commented-register if any, the fork's HUD anchors if it
has a HUD); validation one-time, mandatory, NON-transferable (ezQuake's
probes license nothing elsewhere); (2) a **fork-pinned runtime dump** for
level-3 -- absent it the fork rides permanently at level-2 (a valid useful
state, not a failure). Evaluated PER TRACK: a server-only fork (MVDSV) has
no client HUD -> Track B is N/A there while Track A applies; a fork can run
Track A with Track B not-applicable (D1 no-blend; SQ5.1 per-track
instantiation). Non-transferability is a real recurring cost and it is
correct -- forks differ in entry cascade, registration APIs, HUD presence;
the strict-bar consumer cannot accept "it worked for ezQuake so it works
here." Stating it as a contract precondition is what stops onboarding from
cutting that corner.

**Pass 5 closes the brainstorm. It EXITS to arc-planner.** Handoff:
`docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-planner-handoff.md`.
All remaining unknowns are implementation-shaped (field-shape mechanics,
AST-confirm residuals, harness wiring) -> arc-planner scaffold, NOT
brainstorm.

## Out of scope -- siblings (remain in the feeder doc)

Metadata-fidelity, NOT presence-fidelity -- outside the runtime-truth North
Star. Future separate L1-extractor arc:

- `Cmd_AddLegacyCommand` `legacy_alias_of` persistence (loader/schema).
- Trailing-comment harvester precision.
- **ezQuake help-JSON documentation-gap arc (NEW, Pass 5; sequenced AFTER
  this arc -- genuine dependency: this arc produces the true entity set the
  doc-gap arc consumes).** Surfaced Pass 5: the docs site
  (`ezquake.com/docs/commands.html`) renders `help_commands.json` 1:1 (Vue
  `v-for`; `update_help_files.sh` pulls from ezquake-source). Of 511 entries:
  346 hand-written, 165 `system-generated:true` stubs (registered,
  undocumented -- tier 1), and the entire HUD command family ABSENT -- not
  even stubbed, because `help.c:967-970` (`Help_Describe_f`'s runtime
  `cmd_functions` walk) has an EXPLICIT `if (function == HUD_Plus_f ||
  HUD_Minus_f || HUD_Func_f) continue;` with a stale `// not interested ...
  for the moment` comment (tier 2 -- ezQuake's own acknowledged TODO).
  Future-arc parking:
  `docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`.
  Shape: map the gap from post-this-arc L1 -> propose descriptions ->
  upstream PR to nano/slime including the `help.c` code-pointer.

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
| 4 | Unified L1 fidelity schema + provenance (one signal model: Track A + the three HUD families) | COMPLETE 2026-05-17 (D12-D16) |
| 5 | Application + dual acceptance gates (classify ghosts; emit HUD commands; combined known-answer harness; per-fork precondition) | COMPLETE 2026-05-17 (D17-D22); brainstorm EXITED |

Pass count grew 4 -> 5: a second mechanism track legitimately adds a pass.
Still one coherent arc, phased. Pass 2 closed 2026-05-16 (Track-A mechanism
fully specified, D3-D7). Pass 3 closed 2026-05-17 (Track-B mechanism fully
specified, D8-D11; literal-tail RESOLVED by measurement = empty; scope
widened to the full `HUD_Register` contract -- commands AND `hud_*` settings
cvars). Pass 4 closed 2026-05-17 (unified L1 fidelity schema + provenance
fully specified, D12-D16; "sparse subset" corrected to per-version
mechanism-derived with a three-level coverage semantic). Pass 5 closed
2026-05-17 (application + dual acceptance gates, D17-D22; one shared
contract shape / hard one-time-per-fork validation gate / dump-as-answer-key
/ Track-A two-output / Track-B commands-only / per-fork-per-track
precondition). Pass 5 also STRUCK D11's cvar half (premise refuted by live
verification -- cvars already extracted by `_handler_cvars.py`; Track B
narrowed to commands-only) and spun out the ezQuake help-JSON
documentation-gap follow-on arc. No pass added by the Pass-3 widen -- D11
absorbed it, then Pass 5 corrected it. **Brainstorm COMPLETE; EXITED to
arc-planner.**

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
