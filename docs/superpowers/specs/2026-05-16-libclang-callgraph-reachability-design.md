# Design: libclang call-graph reachability for L1 (ghost identification)

**Status:** Brainstorm Pass 1 COMPLETE (2026-05-16). Passes 2-4 pending, one per fresh terminal.
**Predecessor:** parking `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`.
**Role:** drain target for arc-brainstormer Passes 1-4. arc-planner scaffolds the arc against this.

## Arc North Star (Pass 1 framing, operator-stated)

AST extraction is agnostic to whether an entity actually works: it records
"declared + registered + has a help entry" even when the registering code is
unreachable at runtime. A disabled/unwired command still shows in L1 AND in
the manual, so a reader asks "why isn't this working?" The deliverable is to
identify those GHOST entries (extracted-present + help-documented but
runtime-unwired), mark them in L1, and/or route an upstream cleanup PR.
Call-graph reachability is the MECHANISM; ghost identification is the PRODUCT.
This is the `source_backed != runtime-live` gap.

## Locked decisions

### D1 (SQ1.1) -- this arc is ghosts-only

Scope is the ghost direction only: entity is in L1 + help-documented but does
NOT work at runtime (L1-has / runtime-lacks). The reverse-diff "HUD
variable-name family" (runtime-has / L1-lacks), `Cmd_AddLegacyCommand`
alias persistence, and trailing-comment harvester precision are SIBLINGS,
banked in `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`.

Rationale: the siblings are the opposite user-harm direction and share ZERO
fix mechanism with ghosts (call-graph reachability vs interprocedural
constant propagation). Folding them in is scope-bleed. Verified this session:
the HUD family is real and AST-tractable on its own, so it deserves its own
arc rather than diluting this one. A same-session "missed-literal extractor
bug" claim (`unignoreAll`/`loadFragfile`) was RETRACTED as a case-fold
artifact -- recorded do-not-propagate in the feeder doc.

### D2 (SQ1.2) -- ezQuake-first

The call-graph core (edge collection + BFS + comment-strip) is engine-general
by construction: same libclang AST, same shared visitor for all four forks;
placed in the shared tier it serves FTE/QWCL/MVDSV with zero per-fork code.

This arc validates + ships ezQuake ONLY -- the only fork with a
version-pinned runtime dump as an answer key. FTE/QWCL/MVDSV become per-fork
gated follow-ons. The algorithm is free; each fork's residual cost is
(a) entry-point identification, (b) its own parse-config / conditional-macro
union set, (c) a version-pinned runtime dump + its own known-answer gates.
Cost is uneven: MVDSV cheap (headless server, dump cmdlist/cvarlist
directly), QWCL likely expensive (vintage 2.33-era toolchain to produce the
dump -- assess, do not assume), FTE between. Operator framing: make it work
for ezQuake -- working, tweaked, verified -- then a concrete reference to
replicate from, not a theoretical mechanism.

## Carry-forwards to Passes 2-4

- **Pass 2 (call-graph mechanism):** tier placement in the 3-tier handler
  architecture; per-TU vs whole-program edge collection; entry-point
  definition (ezQuake client + server init chains); BFS; per-config union;
  function-pointer conservative policy (address-taken => assume reachable,
  never false-accuse a live entity); comment-strip before locating
  registration sites. CONSTRAINT CORRECTION: the parking doc says the
  extractor "dual-parses client/server (27 conditional macros)"; the
  extraction memory says 4-variant (client / server / win / apple). Verify
  against live `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py`
  in Pass 2 -- per-config reachability union must cover the real variant set
  or win/apple-only registrars get false-accused as dead.
- **Pass 3 (L1 schema + provenance):** signal shape (bool vs enum:
  genuine-dead / pointer-conservative-reachable / build-excluded-unknown);
  per-config vs unioned; composition with existing `source_state`; runtime
  dump as validation oracle vs ingested signal; append-only migration +
  whether it warrants its own dated schema spec.
- **Pass 4 (application + harness):** classify the ezQuake candidate pools
  (97 cvar / 74 command, runtime-verified absent) into genuine-dead vs
  build-excluded; the 3-gate known-answer harness as the arc acceptance gate
  (`sb_qtvlist_url` zero-caller; `gl_outline_scale_world` commented-register;
  a known-reachable control e.g. `cl_bobhead` in `V_Init`); ezQuake ship.

## Out of scope -- siblings (tracked in the feeder doc)

`docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`:

- HUD dynamic-name command family (the reverse-diff): the inverse problem
  (runtime-has, L1-lacks). Reliably AST-discoverable by modeling the
  `HUD_Register` contract + a lightweight known-answer drift guard.
- `Cmd_AddLegacyCommand` `legacy_alias_of` persistence (loader/schema).
- Trailing-comment harvester precision.
- Command-direction case-fold harness gap (reverse-diff count untrustworthy
  until the cvar pool's case-fold normalization is applied to commands too).

## Pass status

| Pass | Scope | Status |
|---|---|---|
| 1 | Arc scope + boundary | COMPLETE 2026-05-16 |
| 2 | Call-graph construction mechanism | pending |
| 3 | L1 schema + provenance for the reachability signal | pending |
| 4 | Application + known-answer harness | pending |
