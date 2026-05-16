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

## Out of scope -- siblings (remain in the feeder doc)

Metadata-fidelity, NOT presence-fidelity -- outside the runtime-truth North
Star. Future separate L1-extractor arc:

- `Cmd_AddLegacyCommand` `legacy_alias_of` persistence (loader/schema).
- Trailing-comment harvester precision.

RETRACTED, do-not-propagate: the same-session "missed-literal extractor bug"
(`unignoreAll`/`loadFragfile`) was the case-fold artifact -- now correctly
explained as the shared-foundation finding above; no separate finding.

## Revised pass plan (provisional -- Pass 2 opener confirms)

| Pass | Scope | Status |
|---|---|---|
| 1 | Scope + boundary (two-track, runtime-truth North Star) | COMPLETE + AMENDED 2026-05-16 |
| 2 | Shared foundation (command case-fold harness fix) + Track A call-graph construction mechanism | pending |
| 3 | Track B mechanism (`HUD_Register` contract; literal-tail sizing; drift guard) | pending |
| 4 | Unified L1 fidelity schema + provenance (one signal model, both tracks) | pending |
| 5 | Application + dual acceptance gates (classify ghosts; emit HUD; combined known-answer harness) | pending |

Pass count grew 4 -> 5: a second mechanism track legitimately adds a pass.
Still one coherent arc, phased.

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
