# Handover: make the call-graph stage-1 probe robust (synthetic fixtures)

**Date:** 2026-06-05
**Status:** Ready for a fresh terminal. Diagnosis verified, fix chosen (operator: robust), feasibility confirmed, design sketched below.
**Blocks:** the `track_a_reachability` head re-light (stage-1 gate is RED until this lands).
**Does NOT block:** the headless-dump automation — that shipped this session (commit `1f014ed0`).

## Why we're here

This session automated the ezquake head runtime dump (compile -> xvfb + software GL + dummy audio -> `cvarlist`/`cmdlist`/`version` -> `entities-runtime-dump-e4a2c20a.txt`). Wiring it into the re-light surfaced that the **stage-1 acceptance probe goes RED at e4a2c20a** -- and it's a FALSE POSITIVE, verified:

- `accept-runtime-truth.py --stage 1` runs `verify-callgraph-probes.py`, which re-parses the full source and checks 3 known-answer cvars classify correctly.
- **GATE 1 (`sb_qtvlist_url`)** and **GATE 2 (`gl_outline_scale_world`)** are RED. Both cvars were **deleted from source by the operator's own dead-cvar cleanup** (literal commit `7fb1e203 "Remove unused cvar gl_outline_scale_world"`; `sb_qtvlist_url` likewise gone). GATE 3 (`cl_bobhead`) is GREEN -- still a live cvar.
- So the probe is testing for ghosts. The extraction MECHANISM is fine (HUD probe fully GREEN; call-graph extraction ran clean).

### The root pattern (why it recurs -- the operator flagged this explicitly)

The probe pins its ground truth to **specific "genuine-dead" cvars from the live source**. But genuine-dead cvars are *exactly the ones the cleanup PRs delete* -- finding-flagging-removing a dead cvar is the intended lifecycle. So any live-source dead cvar used as a fixture is guaranteed to evaporate. Same disease bit the proxy's SANITY1 canary this session (also `sb_qtvlist_url`; already fixed -> structural check in `version-pin-proxy.sh`). DB labeling does NOT help: the probe re-parses *source*, not the DB, so a removed cvar leaves nothing to classify.

## The fix (chosen: robust)

Replace the live-source fixtures with a **committed synthetic fixture tree** the probe parses via `--repo-root`. We own it; no upstream cleanup can ever delete it; it's stable forever AND fast.

### Feasibility (verified this session)

- **Roots are name-based:** `extractor_lib/_callgraph.py` -> `_ENTRY_ROOTS_CLIENT_FAMILY = ("main", "Host_Init")`, `_ENTRY_ROOTS_SERVER = ("main", "Host_Init")`. The BFS seeds on those function *names*. A fixture just needs functions named `main` / `Host_Init`.
- **Extractor takes an arbitrary tree:** `ezquake/extract.py` arg `--repo-root` (default `research/repos/ezquake-source`); `ezq_src = (repo/src if it has .c files) else repo`. Point it at a fixture dir with a `src/` of `.c` files.
- **Fast:** a ~60-line fixture parses in seconds vs ~10 min for the 308-file tree -> cheap iteration.

### Fixture must exercise the 3 gate cases

A small `src/*.c` (one or two files) containing:

1. **Reachable-everywhere (GATE 3 = `build-excluded`):** a cvar registered in a function reached from `main`/`Host_Init` in all 4 variants (no `#ifdef` guards), e.g. `main()->Host_Init()->R()` where `R()` does `Cvar_Register(&fix_reachable)`. NB confirm the taxonomy: GATE 3's conclusion is `build-excluded` for a *reachable/live* cvar (per its docstring "a live client cvar; D3 intact") -- i.e. `build-excluded` reads as "not genuine-dead, real cvar". VERIFY this semantics before authoring so the fixture targets the right conclusion.
2. **Unreachable / genuine-dead via callgraph (GATE 1):** a cvar registered inside a function with NO callers, e.g. `void NeverCalled(void){ Cvar_Register(&fix_dead_cg); }`. Compiled (libclang sees the call) but unreachable from any root -> `genuine-dead` / feeder `callgraph`.
3. **Genuine-dead via commented-register (GATE 2):** a cvar whose ONLY `Cvar_Register` is commented out, e.g. `/* Cvar_Register(&fix_dead_commented); */`. libclang strips the comment -> feeder-a sees no registration -> feeder-b (textual scanner) must find the commented line and cite `fixture.c:<line>`.

### Probe changes (`verify-callgraph-probes.py`)

- `_run_extractor`: add `"--repo-root", <fixture path>` to the patched `sys.argv` (line ~95). Drop the comment claiming "we do not override --repo-root."
- Update the 3 `cg.reachable(...)` names (lines 366-368) to the fixture cvars.
- Update GATE 2's expected cite (`r_rmain.c:730`) to the fixture's `file:line` (lines 196, 233, 238).
- GATE 1/3 assertions are name-agnostic past the cvar name -- just the names change.

## First actions

1. Read this doc + `verify-callgraph-probes.py` (the 3 `_check_gate_*` fns) + skim `extractor_lib/_callgraph.py` (conclusion taxonomy: `CONCLUSION_GENUINE_DEAD` / `CONCLUSION_BUILD_EXCLUDED`, feeders, `reachable()` return shape).
2. **Verify the conclusion taxonomy** for a reachable cvar (is it really `build-excluded`?) before authoring -- this is the one genuine subtlety.
3. Author the fixture under e.g. `apps/qw-oracle/scripts/extractors/ezquake/fixtures/callgraph-probe/src/probe_fixture.c` (committed). Match the exact `cvar_t` + `Cvar_Register(&x)` idiom the cvar handler recognizes (cross-check a real example like `cl_view.c` / the cvars handler).
4. Rewire the probe (changes above). Iterate fast (`python3 verify-callgraph-probes.py` -- seconds now). Get 3 GREEN.
5. Re-run `accept-runtime-truth.py --stage 1` -> GREEN -> validation record GREEN at e4a2c20a. Then the re-light is unblocked (see below).
6. Keep `verify-hud-probes.py` in mind -- it passed at e4a2c20a, but it ALSO hardcodes source line numbers (`hud_radar.c:1422` etc.). It's fine today but carries the same latent disease; consider the same fixture treatment in a follow-up (do NOT scope-creep this task into it unless it's trivial).

## Then: finish the re-light (the original goal)

Once stage-1 is GREEN, the wiring is all in place (committed `1f014ed0`). Bootstrap sequence (F15 idempotency is FIXED -- `59d34786`, "3x re-load byte-identical" -- so reloads are safe):

1. `bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version head` -> extractor emits the 10th file (`ezquake-callgraph-reachability-ast.json`; the D22 gate now opens: validation record GREEN + `versions.commit_sha` head both = e4a2c20a) + loads track_a to **level-2**.
2. `python3 accept-runtime-truth.py --stage 2` -> reads those level-2 rows, cross-checks the dump, writes `level3-stamp-set-e4a2c20a.json`.
3. `bun scripts/load-knowledge/index.ts load-version --project ezquake --version head` (load-only) -> applies the stamp-set -> track_a **level-3** dump-confirmed stamps land.
4. Verify: `SELECT track_a_reachability->>'dump_confirmation', count(*) FROM cvar_versions cv JOIN entities e ON e.id=cv.entity_id WHERE e.project='ezquake' AND cv.version='head' GROUP BY 1` -- expect populated (not all NULL).

## Critical rules / gotchas

- The acceptance contract is HARD-gated and was tamper-verified (arc-history Phase-4). Keep the all-or-nothing/loud shape; don't soften gates.
- `versions.commit_sha WHERE version='head'` is the head-stable pin (NOT `oracle_meta:source_repo_commit`, which a stable-tag backfill clobbers -- that was the other fix this session). All three gates (proxy / extract-tag.ts / emit_callgraph_signal.py) now use it.
- Local ezquake `master` = e4a2c20a; extract-tag won't pull (ref known locally). Don't let it drift off e4a2c20a or the dump desyncs.
- `data/detection/acceptance-validated-ezquake.json` is currently **RED at e4a2c20a** (uncommitted -- the honest current state; the fixture fix + re-run flips it GREEN). Regenerated by stage-1; don't hand-edit.

## State at handover

- Committed `1f014ed0`: dump artifact + proxy rewrite + 3 head-stable pin fixes + descriptor repin.
- Dump verified: runtime is a strict subset of source (2640 cvars / 557 cmds; 0 extraction blind spots); reproducible.
- Pre-existing unrelated failure to ignore: `test_runtime_dead_entities.py::test_class3_block_carried_verbatim` (Class-3 block reduced 8->4 rows in a prior arc `557d8703` without updating its test; not in this session's change set).
- Per-version dumps remain DEFERRED -- head-only by design.
