# ezQuake cvar extraction -- AST spike comparison report

**Date:** 2026-04-18
**Status:** Research spike complete. Awaiting user decision on phase 2.
**Scope:** ezQuake cvar extraction only (commands, macros, cmdline-params, FTE, MVDSV, KTX are phase-2 replications of the same pattern).

## What this document answers

Is it worth replacing the existing regex-based cvar extractor with a proper AST-based one? And if so, what does the AST extractor give us that the regex does not?

## TL;DR

**Yes, replace it.** The AST extractor:
- captures **every cvar** the regex extractor captures (100% parity on the shared set)
- finds **10 additional real cvars** the regex missed (`internal0`..`internal9`)
- adds **four structural metadata fields** the regex cannot produce (flags, OnChange callbacks, source line numbers, trailing inline comments)
- is **source-verified** for group attribution (2431 cvars vs regex's heuristic guess)
- **survives version bumps** without code changes (proven against tag 3.6.6, 14 months old)
- **generalizes cleanly to FTE** (the macro-wrapped codebase where regex is most painful) -- validated on 5 FTE files, 269 cvars extracted with 159 descriptions via transparent macro expansion
- the same tooling pattern will apply to MVDSV (same struct form as ezQuake) and KTX (different idiom, different mix of tools)

## What Slipgate gets from the refactor

Slipgate today consumes `packages/qw-config/src/data/ezquake-variables.json` -- the regex-extractor output -- through the `qw-config` package. The AST extractor produces a drop-in replacement with the same base schema plus a new `ast` block per cvar. All existing Slipgate UI continues to work. New Slipgate features that become possible because the AST data is richer:

- **Group cvars by flag in the config viewer** -- e.g. show all `CVAR_LATCH_GFX` cvars together ("these need a vid_restart to apply"), or highlight `CVAR_ROM` cvars as read-only in the UI.
- **Warn users when a cvar change needs a special action** -- e.g. "changing `vid_width` requires `vid_restart`" (derived from `CVAR_LATCH_GFX`), "changing `net_qport` requires reconnect" (derived from `CVAR_INIT`).
- **Server-side awareness** -- `CVAR_SERVERINFO` and `CVAR_USERINFO` cvars are automatically visible to the server/other clients; the UI can indicate that.
- **Click-through to source** -- every cvar now has `source_file:source_line`, so "view in source" becomes trivial.
- **Inline developer notes surfaced in the UI** -- 248 cvars have trailing comments like `cl_chasecam  // "through the eyes" view` or `cl_nofake  // FIXME: buggy`. These are real developer-written hints that have been invisible so far.
- **OnChange awareness** -- knowing a cvar has a handler (`OnChange_s_khz`, `OnChange_scr_conpicture`) means the UI can hint "this triggers a side effect" and eventually link to docs explaining what the handler does.

## Comparison: regex extractor (current Slipgate source) vs AST extractor

### Entry counts

| | Regex extractor | AST extractor |
|---|---:|---:|
| Total JSON entries | 2892 | 2902 |
| Cvars present in C source | n/a (regex doesn't flag) | 2715 |
| Cvars only in `help_variables.json` | n/a | 187 |
| Entries the other misses | 0 | 10 |

### The 10 cvars AST finds that regex misses

All ten are array-of-cvar_t declarations in `tp_triggers.c`:

```c
cvar_t re_subi[10] = {{"internal0"},
                     {"internal1"},
                     ...
                     {"internal9"}};
```

The regex extractor's pattern was not structured to pick up this form. These are real, callable cvars used by the regex-trigger system. Regex extractor was silently dropping them.

### Default-value differences (11 total)

Not bugs, but defensible semantic differences:

| cvar | Regex value | AST value | Reason |
|---|---|---|---|
| `qws_builddate` | `Jun 10 2025, 22:10:07` | `BUILD_DATE` | Regex captured a build-time value (stale in the JSON). AST captured the source-level macro name (stable across rebuilds). |
| `qws_version` | `0.34-beta` | `SERVER_VERSION` | same pattern |
| `qws_name` | `EZQUAKE` | `SERVER_NAME` | same pattern |
| `qws_fullname` | `MVDSV: MultiView Demo SerVer` | `SERVER_FULLNAME` | same pattern |
| `qws_homepage` | `https://mvdsv.deurk.net` | `SERVER_HOME_URL` | same pattern |
| `qws_platform` | `w` | `QW_PLATFORM_SHORT` | platform macro |
| `sshot_format` | `png` | `DEFAULT_SSHOT_FORMAT` | same pattern |
| `cl_remote_capabilities` | full comma list | `REMOTE_CAPABILITIES` | same pattern -- macro names are stable; expanded strings drift |
| `vid_minimize_on_focus_loss` | `1` | `CVAR_DEF1` | macro name vs its resolved value |
| `r_dynamic` | `1` | `2` | **Regex output is stale** -- the source was changed but the JSON was never regenerated. AST reflects current source. |
| `sys_highpriority` | `` (empty) | `0` | Regex missed the default; AST captured it correctly. |

Phase-2 improvement: libclang can also EVALUATE macros (e.g. `BUILD_DATE` -> the actual date string) if we want the resolved value. For Slipgate's purposes, the macro name is more useful because it is stable across rebuilds and ezQuake versions.

### New metadata only AST can produce

These fields simply do not exist in the regex output. Counts below are from 2715 source-backed cvars.

| Field | Count populated | Example |
|---|---:|---|
| `flag_names` (array of `CVAR_*`) | 233 | `["CVAR_USERINFO", "CVAR_NO_RESET"]` |
| `on_change` (callback fn name) | 136 | `"OnChange_s_khz"` |
| `source_line` + `source_column` | 2715 | `{"source_file": "cl_view.c", "source_line": 46, "source_column": 16}` |
| `trailing_comment` (source-line // comment) | 248 | `"1 is FuhQuake and QW262 defaults"` |
| `group_name_in_source` (source-verified) | 2431 | `"Input - Mouse"` |

Top 10 flags seen:

```
CVAR_COLOR          42
CVAR_SILENT         40
CVAR_ROM            31   (read-only cvar)
CVAR_LATCH_GFX      27   (needs vid_restart to apply)
CVAR_NONE           20
CVAR_SERVERINFO     20   (announced to server/clients)
CVAR_RELOAD_GFX     15   (needs texture reload to apply)
CVAR_AUTO           13
CVAR_NO_RESET       12
CVAR_USERINFO        9   (sent to server as part of userinfo)
```

Each of these is actionable UX info that Slipgate today cannot surface because the data does not exist in its inputs.

### Sample of trailing comments captured

These are developer-written annotations sitting at end-of-line on the cvar declaration. Invisible to the regex extractor.

```
cl_chasecam               // "through the eyes" view
cl_earlypackets           // 1 is FuhQuake and QW262 defaults
cl_demoteamplay           // for NQ demos where we need to say it is teamplay rather than FFA
cl_debug_antilag_send     // weapon-switching debugging
cl_hightrack              // track high fragger
cl_nofake                 // FIXME: buggy
bgmvolume                 // CD music volume
cl_net_clientport         // Was PORT_CLIENT in protocol.h
```

## Version-stability check (HEAD vs tag 3.6.6, 14 months apart)

The same extractor script was run against `research/repos/ezquake-source/` at tag `3.6.6` (2025-02-16) and at current `HEAD` (post-3.6.9 trunk, 2026-03-23). No code changes between runs.

| Metric | HEAD | 3.6.6 | Delta |
|---|---:|---:|---:|
| source-backed cvars | 2715 | 2674 | **+41 added, 0 removed** |
| default-value changes in shared cvars | -- | -- | 2 |
| cvars whose source_file:line moved | -- | -- | 526 (refactors) |

The 41 added cvars are all legitimate feature additions in that time window (port ping probes, ammo color HUD, safe-strafe, game-clock style, etc). The 2 default changes are real (`cl_fakeshaft` 0->1 is literally the latest commit on HEAD; `cl_pext_lagteleport` also changed). No spurious deltas; no extractor failures.

**Conclusion:** the AST extractor is rerunnable on any version of the source without code changes. This is what "survives version bumps" means in practice -- and it is exactly the property we need for the Oracle knowledge service, where new ezQuake releases should update the knowledge base automatically.

## Tooling choice -- why libclang, why a textual complementary pass

The earlier recommendation was "libclang primary + tree-sitter-c complementary." Actual experience from the spike refined this:

| Tool | Used for | Worked? |
|---|---|---|
| **libclang 18.1** (via python3-clang 18) | Primary AST extraction -- cvar_t declarations, arrays, flags, OnChange handlers, Cvar_SetCurrentGroup/Register flow, HUD_Register synthesis, dual client/server parse | Yes. 0 fatal diagnostics, 2902 cvars extracted, handled every pattern thrown at it. |
| Python textual pass | Trailing-comment extraction from source lines | Yes. 248 comments captured. Simple, deterministic, fast. |
| **tree-sitter-c** (Node + `tree-sitter@0.25`) | Originally planned for trailing-comment extraction | No. Segfaults on WSL/Node 20 with the native binding. Pivoted to textual pass (above). Tree-sitter remains a good fit for future KTX call-site extraction -- the binding issue is a Node/WSL artifact, not a tool flaw. `py-tree-sitter` (Python bindings) has stable binary wheels and is the likely pick when tree-sitter does become relevant. |

**Net:** libclang does more than anticipated. The tree-sitter complementary pass was not needed for ezQuake. For KTX later, where cvars are registered via string-literal call sites rather than struct declarations, tree-sitter's S-expression queries will shine -- but that is a phase-3 concern.

## The FTE end-check (the generalization test)

Before closing the spike, I ran the libclang approach against 5 FTE files -- specifically to test whether it handles FTE's macro-wrapped cvars (`CVARD`, `CVARFD`, `CVARAFCD`, etc.) which is where the current FTE regex extractor is most painful.

**Result: works transparently.** libclang expands the macros before the AST walk, so the extractor sees the resolved struct initializer and can pull name, default, description, flags, and callback name from the fields by position -- without knowing or caring which `CVAR*` macro variant was used.

| Metric | Result |
|---|---:|
| FTE files parsed | 5 |
| cvar_t declarations found | 269 |
| with resolved description | 159 (59%) |
| with resolved default | 269 (100%) |
| fatal diagnostics | 0 (warnings only, for missing third-party headers) |

Sample output:
```
sv_mintic         default='0.013'  desc='The minimum interval between running physics frames.'
sv_wallfriction   default='1'      desc='Additional friction when running into walls'
con_stayhidden    default='1'      desc='0: allow console to pounce on the user\n1: console stays hidden unless explicitly activated'
```

The existing FTE regex extractor (`extract-fte-cvars.ts`) has hand-written parsers for each `CVAR*` variant. Replacing it with a libclang-based extractor, using the pattern proven here, would be a mostly mechanical port -- ~300 lines of Python, similar to `extract-ezquake-cvars-clang.py`.

## Known limitations (honestly flagged, small, phase-2 solvable)

1. **Static macro values are captured as source-level macro names, not resolved values** (see the 11 default mismatches above). libclang can resolve them via its expression evaluator; the spike did not wire that in. Low-effort upgrade.
2. **Bounds extraction** -- ezQuake does not use `Cvar_SetBounds` / `Cvar_SetRange` APIs. Bounds info lives only in `help_variables.json`. No change needed for ezQuake; FTE/MVDSV may have different APIs to check when those extractors are written.
3. **Preprocessor-gated cvars** -- ezQuake has ~27 different `#ifdef X` macros guarding cvar declarations (WITH_IRC, FTE_PEXT2_VOICECHAT, X11_GAMMA_WORKAROUND, etc.). The spike enumerates all of these and defines them all so every branch parses. If a new conditional macro is added upstream, the extractor may miss cvars behind it until that macro is added to the list. Mitigation: occasional re-scan of the ifdef macros in source; could be automated in phase 2.
4. **`cvar_t` inside struct arrays with field-projection initializers** (e.g. `{&cvar_name, default_value}` inside a `mv_temp_cvar_t[]`) -- intentionally excluded. These are "second-order" declarations (a table referencing already-declared cvars, not new ones). Out of scope.
5. **Tree-sitter not working via Bun/Node** -- cosmetic. A Python tree-sitter extractor could be built when KTX call-site extraction is needed.

## Recommended next steps (phase 2)

Phase 2 is proposed in order of value. Each step builds on the libclang pattern proven here.

1. **Replace ezQuake regex extractors for commands, macros, and cmdline-params** with libclang equivalents (using the same approach as cvars). These three will be simpler because they do not have array-of-X or HUD-register-style synthesis.
2. **Refactor Slipgate's consumer code** to take advantage of the new metadata fields (flag-aware UI hints, source-line links, trailing-comment tooltips). This is the Slipgate-side payoff.
3. **Write the libclang FTE extractor** to replace the current TypeScript regex extractor. Worth doing end-to-end because FTE is where the regex approach most hurts, and the spike already validated that macro expansion makes this easy.
4. **Write the MVDSV libclang extractor** -- same pattern as ezQuake, much smaller codebase (189 cvars). Likely <100 lines of reused code.
5. **Write the KTX tree-sitter extractor** -- a different pattern (call-site extraction of `trap_cvar_*`). Can use Python's `py-tree-sitter` to avoid the Node binding issue this spike hit.
6. **Define the SQLite schema** once the JSON outputs are trusted across all four codebases. Canonical IDs of shape `<project>:cvar:<name>[@<version>]` per the Oracle design spec. Loading phase is a thin writer that reads each codebase's JSON and inserts into SQL.
7. **Wire up periodic re-runs** -- a CI or cron job that pulls latest source from each upstream repo and re-runs the extractor set. Any new cvars, removed cvars, changed defaults surface automatically. This is how the knowledge base stays alive.

## Deliverables from this spike

- `packages/qw-config/scripts/extract-ezquake-cvars-clang.py` -- primary extractor (~450 lines including comments).
- `packages/qw-config/scripts/extract-fte-cvars-clang-check.py` -- FTE macro-expansion end-check (~170 lines).
- `packages/qw-config/src/data/ezquake-variables-ast.json` -- full output, drop-in schema extension over the current `ezquake-variables.json`.
- `packages/qw-config/docs/ast-spike-diagnostics.log` -- libclang diagnostics (297 entries, all benign -- missing third-party headers).
- `packages/qw-config/docs/extraction-comparison-report.md` -- this document.

Existing regex extractor (`packages/qw-config/scripts/extract-ezquake-cvars.ts`) and its output file (`src/data/ezquake-variables.json`) are untouched by the spike. Nothing in Slipgate changes until phase 2.
