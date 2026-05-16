# Arc: libclang call-graph reachability for L1 (source_backed != runtime-live)

**Created:** 2026-05-16. **Shape:** L1-extractor enhancement arc. **Status:** parked, ready for arc-brainstormer/planner. **Predecessor context:** the ezQuake help-JSON reachability blind-spot investigation (handoff `2026-05-15-handoff-helpjson-cvar-pass-and-reachability-blindspot.md`), resolved this session.

## Why this arc exists (empirically established, not assumed)

The qw-oracle L1 libclang extractor records an entity when source declares + registers + reads it. It does NOT check whether the registering function is reachable at runtime. `source_backed` means "registered in code," not "registered in a running build." A cvar/command registered in a function nothing calls (e.g. `sb_qtvlist_url` in `QTVList_Init`, which has zero call sites) is extracted as live and is invisible to the source-only audit pipeline (worker + Opus reviewer both miss it).

This session proved the cheap mitigations are **structurally insufficient**, not just under-tuned:

- A bash/grep "does the enclosing init have callers" heuristic CANNOT work: grep cannot distinguish a call `Foo();` from a prototype `void Foo(void);` -- textually identical. A scaled run misclassified ~55 entities (incl. `version`, `cd`, `rm`, `ls`, `r_speeds`) as dead because every function called as a plain `Foo();` statement read as zero-caller. Anti-pattern recorded: do not retry a grep call-counter.
- Therefore reachability needs a tool that parses call expressions. libclang already builds the AST in the extractor; adding caller->callee edges + BFS from entry is the right durable mechanism. This is the only reliable path and it generalizes to all registration-shaped types (cvar/command/macro) and every version in L1.

## Scope (what this arc delivers; do NOT re-do detection)

**Detection is DONE and trustworthy -- out of scope for this arc.** The runtime-list diff (`cvarlist`/`cmdlist`/`macrolist` from a version-matched build vs L1 at the same commit) reliably produced the candidate pools. Reusable, validated, do not rebuild:
- `/tmp/front1-diff.sh` -- runtime-vs-L1 diff (CRLF/case/locale-corrected; arithmetic closes; sb_qtvlist_url self-check).
- `/tmp/cmdline-liveness.sh` -- cmdline consumer-presence detector (different shape: cmdline is consumed-by-`COM_CheckParm`, not registered; presence-of-consumer == liveness, no reachability needed; do not fold cmdline into the call-graph mechanism).
- Clean candidate pools at HEAD `3f9e724f`: **97 cvar + 74 command** (case-folded, runtime-verified absent). Macros: clean, 0 dead, closed.
- Independently-verified dead set already shipped: `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md` (sb_qtvlist_url, gl_outline_scale_world, 8 cmdline ghosts).

**In scope:**
1. libclang call-graph reachability pass in the extractor: per registration site, is the enclosing function reachable from program entry. Output a per-entity `runtime_reachable` signal in L1.
2. Use it to classify the 97/74 pools: genuine-dead (unreachable registrar) vs build-excluded (reachable but platform/`#ifdef`-gated out of the dumped build).
3. Durably close `source_backed != runtime-live` for all future audits and all forks (ezQuake/FTE/QWCL/MVDSV).

## Design constraints (hard-won this session -- carry forward)

- **Per build config.** The extractor already dual-parses client/server (27 conditional macros). A function dead in the client build can be live in the server build. "Dead" = unreachable in EVERY shipped config; reachability must be computed per config and unioned, or server-only code false-accuses.
- **Conservative on function pointers.** Command handlers/on_change are function pointers; the init chain itself is mostly direct calls. Rule: follow direct calls; if a function's address is taken (table/pointer), assume reachable (never false-accuse a live entity). Accept slight under-report; the runtime dump mops residue.
- **Comment-line exclusion.** A commented-out `// Cvar_Register(&x)` is a distinct dead subclass (`gl_outline_scale_world`). Strip `//` and `/* */` before locating registration sites or it reads as a live registration in a called function.
- **Runtime dump is ground truth; static is the generalizable approximation.** Cross-check libclang reachability against the runtime dump we already have. Version pinning is non-negotiable: the build's commit must equal the L1-extracted commit (`version` string embeds it) or the diff is version-noise.

## Known-answer harness (REQUIRED before trusting any scaled run)

Single-axis validation failed this session (probe confirmed the true-zero case but never a true-nonzero, so a broken counter passed). Gates MUST include all three:
- `sb_qtvlist_url` -> GENUINE-DEAD / zero-caller (`QTVList_Init`).
- `gl_outline_scale_world` -> GENUINE-DEAD / commented-register.
- A cvar registered in a known-reachable init (e.g. `cl_bobhead` in `V_Init`) -> BUILD-EXPLAINED / reachable. (This is the gate that was missing and would have auto-rejected the bad run.)

## Relations

- Memory `reference_qw_oracle_extraction_liveness_gap` (updated this session with the runtime-diff method + grep-structural-insufficiency).
- Parking `2026-05-14-l1-extractor-refinement-arc.md`, `2026-05-15-l1-extractor-entity-classification-followups.md` (s_stereo lifecycle precedent).
- The 132-command reverse anomaly = a related but separate L1 completeness gap: HUD commands registered via `Cmd_AddRemCommand(runtime_built_name, ...)` (dynamic name) are invisible to literal extraction. Same theme (static can't see runtime), different mechanism. Capture in the same arc's brainstorm or a sibling.

## First actions for the picking-up terminal

1. Read this doc + the updated `reference_qw_oracle_extraction_liveness_gap` memory + the shipped `ezquake-runtime-dead-entities.md`.
2. Do NOT re-run detection. The pools are clean and banked.
3. Route into arc-brainstormer (libclang reachability is design-shaped, multi-pass): per-config call-graph construction, function-pointer policy, L1 schema for `runtime_reachable`, classification of the 97/74, the dynamic-registration sibling gap.

## Brainstorm Pass 1 -- COMPLETE (2026-05-16)

Design spec (drain target, Passes 1-4): `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`.

**Sub-questions resolved:**

- **SQ1.1 -- arc scope:** LOCKED ghosts-only. The reverse-diff HUD
  variable-name family + `Cmd_AddLegacyCommand` persistence + trailing-comment
  harvester precision are SIBLINGS, banked in
  `2026-05-15-l1-extractor-entity-classification-followups.md`. Rationale:
  opposite user-harm direction, zero shared fix mechanism (call-graph
  reachability vs interprocedural constant propagation); folding in is
  scope-bleed.
- **SQ1.2 -- fork scope:** LOCKED ezQuake-first. Call-graph core is
  engine-general (shared tier, same libclang AST/visitor for all four).
  Validate + ship ezQuake only -- the only fork with a pinned runtime answer
  key. FTE/QWCL/MVDSV = per-fork gated follow-on; residual cost = entry-point
  + config-set + pinned runtime dump + own known-answer gates; uneven (MVDSV
  cheap, QWCL likely expensive, FTE between). "Working + verified ezQuake,
  then a concrete reference to replicate from."

**Carry-forwards (tracks):**

- Passes 2-4 unchanged (call-graph mechanism / L1 schema+provenance /
  application+harness) -- see the design spec.
- CONSTRAINT CORRECTION for Pass 2: this doc's "dual-parses client/server
  (27 conditional macros)" is stale; the extraction memory says 4-variant
  (client/server/win/apple). Verify against live
  `extractor_lib/clang_config.py` in Pass 2; the per-config union must cover
  the real variant set or win/apple-only registrars get false-accused.
- Siblings routed to the feeder doc: HUD dynamic-name family,
  command-direction case-fold harness gap, retracted missed-literal artifact
  (do-not-propagate).

**Pass plan:** unchanged. Pass 1 COMPLETE; Passes 2-4 pending, one per fresh
terminal.
