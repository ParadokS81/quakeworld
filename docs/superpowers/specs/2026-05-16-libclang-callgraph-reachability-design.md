# Design: enforce L1 runtime-truth (ghost elimination + hidden-command recovery)

**Status:** Brainstorm Pass 1 COMPLETE + AMENDED (2026-05-16). Passes 2-5 pending, fresh terminal each.
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
  (`+hud_radar` rediscovered each run). Pass-3 open sub-question: are ALL
  `HUD_Register` first args literal? (radar/speed/gun2 verified literal; full
  set needs the AST to size a possible non-literal tail).
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
| 3 | Track B mechanism (`HUD_Register` contract; literal-tail sizing; drift guard) | NEXT |
| 4 | Unified L1 fidelity schema + provenance (one signal model, both tracks) | pending |
| 5 | Application + dual acceptance gates (classify ghosts; emit HUD; combined known-answer harness) | pending |

Pass count grew 4 -> 5: a second mechanism track legitimately adds a pass.
Still one coherent arc, phased. Pass 2 closed 2026-05-16 (Track-A mechanism
fully specified, D3-D7); Pass 3 (Track B) next, fresh terminal.

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
