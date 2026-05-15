# ezQuake runtime-dead entities (code-bug report -> nano/slime)

**Status:** Verified, ready to route upstream. 2026-05-16.
**Channel:** upstream code-bug. NOT a help-JSON doc deliverable, NOT a `help_json_classifications.yaml` entry. These entities are documented/declared but do nothing at runtime; the fix is code-side (re-wire or delete), a maintainer call per item.
**Routing:** ezQuake-native -> nano (head dev) / slime. None are MVDSV-provenance: the `server_*` cmdline params below are defined in ezQuake's own `src/cmdline_params_ids.h` with zero consumers anywhere in the ezQuake tree, so they are ezQuake-side cleanup, not `sv_*`-to-MVDSV.

## How these were found (so the evidence is trustable)

Source HEAD `3f9e724f` (#1120 merge). Operator ran a build compiled from that exact commit: `ezQuake 3.7.0-dev 8084~3f9e724fa` (commit verified == source HEAD, zero version skew). Runtime `cvarlist`/`cmdlist`/`macrolist` were diffed against the L1 source-extracted set at the same commit. Every entity below was then re-verified by direct source grep. This report contains ONLY the subset proved dead by a *reliable* mechanism; the broader candidate pool (97 cvars / 74 commands absent from this build's runtime) is NOT included here because separating genuine-dead from platform/`#ifdef` build-exclusion requires call-graph reachability (tracked as a separate arc) -- a grep cannot distinguish a call `Foo();` from a prototype `void Foo(void);`.

## Class 1 -- orphaned-init cvar (registered in a function nothing calls)

### `sb_qtvlist_url`
- Declared: `src/EX_browser_qtvlist.c:30` -- `cvar_t sb_qtvlist_url = { "sb_qtvlist_url", "http://qtv.quakeworld.nu/?rss" };`
- Registered: `src/EX_browser_qtvlist.c:583` -- `Cvar_Register(&sb_qtvlist_url);`
- Enclosing function: `QTVList_Init(void)` (`src/EX_browser_qtvlist.c:579`).
- **`QTVList_Init` appears exactly once in the entire `src/` tree -- its own definition. No prototype in any header, no call site anywhere.** The registration is unreachable; the cvar (and the `observeqtv` command also registered in `QTVList_Init`) never exist at runtime. Operator console confirmed: typing `sb_qtvlist_url` returns nothing on a 3.6.9 build and the 3.7.0-dev build.
- Disposition (maintainer call): the qtv-browser-list feature is either wanted (wire a `QTVList_Init()` call into client init) or abandoned (delete `QTVList_Init` + `sb_qtvlist_url` + `observeqtv`). It has been dead since ~2010.

## Class 2 -- commented-out registration (cvar declared, register line disabled)

### `gl_outline_scale_world`
- Declared: `src/r_rmain.c:237` -- `cvar_t gl_outline_scale_world = {"gl_outline_scale_world", "1"};`
- Sole registration: `src/r_rmain.c:730` -- `// Cvar_Register(&gl_outline_scale_world);` (commented out; no other registration exists).
- Effect: declared and documented but never registered -> absent at runtime.
- Disposition: re-enable the registration if world-outline scaling is intended to be user-tunable, or delete the dead declaration.

## Class 3 -- orphaned cmdline params (declared in the X-macro table, never consumed)

ezQuake's modern cmdline system: `src/cmdline_params_ids.h` lists `CMDLINE_DEF(<sym>, "<-flag>")`, generating an enum consumed via `COM_CheckParm(cmdline_param_<sym>)`. A small legacy path uses literal `COM_CheckParm("-flag")`. Each param below has **zero enum-consumers AND zero legacy-literal consumers** across all `.c` files -- declared and documented, but reading nothing.

| flag | enum symbol | `cmdline_params_ids.h` | note |
|---|---|---|---|
| `-cheats` | `server_enablecheats` | L72 | ezQuake-native (defined here, consumed nowhere) |
| `-enablelocalcommand` | `server_enablelocalcommand` | L73 | ezQuake-native |
| `-progtype` | `server_progtype` | L71 | ezQuake-native |
| `-noinvlmaps` | `client_noinverselightmaps` | L10 | |
| `-nolibjpeg` | `client_nolibjpeg` | L42 | likely orphaned when JPEG handling changed |
| `-nolibpng` | `client_nolibpng` | L41 | sibling of `-nolibjpeg` |
| `-r-debug` | `client_video_r_debug` | L36 | sibling `-r-trace` has live consumers; debug variant never wired |
| `-showliberrors` | `client_showlibraryerrors` | L16 | |

Bonus tidy-up (not a ghost, no user impact): `server_democache_kb` is an orphaned enum constant -- the dead half of a string collision where `-democache` is correctly served by `client_democache` (`src/cl_demo.c:5453`). Safe to delete the unused enum alongside the above.

- Disposition: delete the dead `CMDLINE_DEF` lines, or wire a `COM_CheckParm(cmdline_param_<sym>)` consumer if the flag was meant to do something.

## Attribution

Per ezQuake (upstream) convention: any PR/commit raised from this uses `Assisted-by: Claude:<model-id>`; the operator signs and certifies the DCO. Issues may use an informal "Co-authored with Claude Code" footer.
