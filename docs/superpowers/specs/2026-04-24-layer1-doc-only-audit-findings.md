# Layer 1 doc_only audit -- findings

**Date started:** 2026-04-24
**Updated:** 2026-04-25 after five extractor fixes shipped
**Scope:** 269 `source_state=doc_only` rows in ezQuake Layer 1 at HEAD -- 185 cvar, 79 command, 3 cmdline_param, 2 macro.
**Goal:** Distinguish extractor misses (fix pipeline) from genuine upstream drift (feed contributor-onboarding gap report).
**Method:** Mechanical sweep (current-source grep + `git log -S` history check) -> semantic reclassification -> primary-source verification per pattern -> targeted extractor fixes with before/after regression diffs.
**Status:** Closed 2026-04-25 with one deferred row. Six extractor patterns + four-variant architecture + loader-side type-mismatch dedup all shipped end-to-end (269 -> 210 doc_only, zero regressions). Deferred: `-nopriority` cmdline_param requires Windows SDK headers unreachable on Linux libclang.
**Artifacts:**
- Raw sweep: `assets/2026-04-24-doc-only-sweep.tsv` (269 rows, 5 cols: type, name, current_hits, commit_count, mechanical_bucket)
- Cat1 semantic classification: `assets/2026-04-24-doc-only-cat1-semantic.tsv` (73 rows, 7 cols)

---

## Shipped extractor fixes (2026-04-25)

Each fix was verified end-to-end: re-extract -> JSON diff vs prior state (zero names lost) -> DB reload -> per-row source_state spot-check -> commit.

| Commit | Pattern | Fix site | Recovery |
|---|---|---|---|
| `c6fdcf3` | **P5a** -- `-DSERVER_ONLY` was applied to the base `clang_args_for` (used for the client variant), inverting `#ifndef SERVER_ONLY` guards in central.c / cmodel.c / sv_main.c and hiding client-only cvars from both passes. | `packages/qw-config/scripts/extractor_lib/clang_config.py:59` -- moved the flag from base args into `clang_args_server_for`. | +1 cvar (`cl_www_address`). Also corrected `build_variant` labeling for `sv_web_*` commands from "client" to "server-build". |
| `a099231` | **P1** -- `Cmd_AddLegacyCommand(old_name, new_name)` is a backward-compat alias API distinct from `Cmd_AddCommand`. The handler ignored it, so renamed-command shims were invisible. | `handler_commands.py` -- recognize `Cmd_AddLegacyCommand`; resolve arg[1] as the alias target literal; emit `ast.legacy_alias_of` for provenance. | +40 commands. 16 names from the original audit (addloc, clearlocs, dir, gamma, loadloc, loadpak, locate, path, removeloc, removepak, saveloc, scr_weaponstats_*) flipped; 24 additional legacy aliases in the codebase that were never in help-JSON got surfaced as new Layer 1 entities. |
| `8f67843` | **P2** -- `log_t logs[MAX_LOG]` struct-literal array in sv_ccmds.c registered via `for (i=...) Cmd_AddCommand(logs[i].command, logs[i].function)`. Cmd_AddCommand's args are struct-field accesses (non-literal), so the call-site detector can't resolve the name. | `handler_commands.py` -- `_extract_command_table` + `_COMMAND_TABLE_TYPES` dict keyed on struct-type name; walks the initializer list directly. | +7 commands (`logfile`, `logerrors`, `logrcon`, `logtelnet`, `logplayers`, `fraglogfile`, `modfraglogfile`). |
| `0f8f170` | **P3** -- `custom_model_color_t custom_model_colors[]` in r_aliasmodel.c has nested `cvar_t` struct-literals at fields 0 and 1 of each element. Registration via `Cvar_Register(&custom_model_colors[i].color_cvar)` is a non-literal arg to Cvar_Register. | `handler_cvars.py` -- `_extract_nested_cvar_table` + `_NESTED_CVAR_TABLE_TYPES` dict. Empty-name slots (unused placeholders like `{"", "0"}` for rlpack's absent fullbright cvar) are skipped. | +10 cvars (`gl_custom_{lg,rocket,grenade,spike}_{color,fullbright}` + `gl_custom_{rlpack,lgpack}_color`). |
| `5dd466c` | **P6** -- `Cmd_AddCommand(CVAR_RELOAD_GFX_COMMAND, VID_Reload_f)` at vid_sdl2.c:1873 where line 144 has `#define CVAR_RELOAD_GFX_COMMAND "vid_reload"`. The literal-string detector returns None for identifier args. | `handler_commands.py` -- `start_file` parses `#define NAME "literal"` in the current file; fallback path resolves all-caps identifier args via the file-local map. | +1 command (`vid_reload`). |
| Item A | **4-variant parse architecture** -- code behind `#ifdef _WIN32` or `#ifdef __APPLE__` is invisible to the client+server passes. Add two extra TU parses per file with their respective defines. | `clang_config.py` -- `clang_args_win_for`, `clang_args_apple_for`. `extract-ezquake-unified.py` -- threads `tu_win`, `tu_apple` through the worker pool; dispatches to `walk_tu_dispatch` with variant="client" (client-flavored). Handlers unchanged -- the existing primary-path logic + per-file `_seen_in_file` dedup handle the extra passes naturally. | +7 cvars (`cl_verify_qwprotocol`, `con_deadkey`, `demo_capture_{codec,mp3,mp3_kbps,vid_maxlen}`, `in_ignore_deadkeys`); bonus +1 asset cvar binding (`demo_capture_dir` at movie.c:430) and +1 cmdline usage (gl_sdl.c:85). |

**Net impact:**
- cvar doc_only: 185 -> 167 (−18)
- command doc_only: 79 -> 60 (−19)
- command source_backed: 443 -> 491 (+48 -- 24 flipped + 24 newly-discovered aliases from P1's by-product)
- cvar source_backed: 2716 -> 2734 (+18)
- Parse time: 14s -> 26s (2x due to doubling parse count; still well under the prior 830s sequential baseline)

---

## Remaining work

### Item A -- platform-variant parse passes (SHIPPED with one deferred case)

Four-variant architecture landed: base `clang_args_for` produces the client pass; `clang_args_server_for` adds `-DSERVERONLY -DSERVER_ONLY` for the server pass; `clang_args_win_for` adds `-DWIN32 -D_WIN32` for the Win pass; `clang_args_apple_for` adds `-D__APPLE__` for the Apple pass. Both new passes dispatch as `variant="client"` through `walk_tu_dispatch` -- handlers' existing `variant == "client"` primary path handles the additive detection naturally. Per-file `_seen_in_file` / `_seen_names` dedup prevents double-counting when a cvar is visible to multiple passes (e.g. a non-guarded cvar visible to both client and win passes gets added once, whichever pass reaches it first).

Recovered (7 of 8 expected):
- `cl_verify_qwprotocol` at cl_main.c:260, `#ifdef WIN32`
- `con_deadkey` at console.c:85, `#ifdef _WIN32`
- `demo_capture_codec`, `demo_capture_mp3`, `demo_capture_mp3_kbps`, `demo_capture_vid_maxlen` at movie.c:58-61, `#ifdef _WIN32` block
- `in_ignore_deadkeys` at vid_sdl2.c:75, `#ifdef __APPLE__`

Bonus (side-effect, not targeted):
- `demo_capture_dir` asset binding at movie.c:430 (`WAVCaptureStart`), previously invisible -- now captured by `asset-cvar-bindings` handler
- Additional COM_CheckParm usage for `-condebug` at gl_sdl.c:85 (`GL_SDL_CreateBestContext`), previously invisible

Deferred: `-nopriority` cmdline_param at sv_sys_win.c:645. Captured under its own section below -- requires Windows SDK headers that don't exist on Linux libclang.

Regression safety: a first-pass experiment that added `-DWIN32` to the server variant (hoping to reach `sv_sys_win.c` COM_CheckParm calls under the SERVER+WIN combination) turned out to hide `chmod` at sv_ccmds.c:1858 (which is guarded by `#ifdef SERVERONLY / #ifndef _WIN32`). Reverted -- server variant stays clean. Lesson preserved: any new platform define on an existing variant is a potential regression; prefer adding a new variant over compounding an existing one.

Downstream impact on DB: **zero schema change.** `build_variant` is emitted into the JSON `ast` dict but not consumed by `load-commands.ts` / `load-cvars.ts` / etc. New Win/Apple-only entities land as `build_variant: "client"` which is imprecise but harmless -- provenance lives in `source_file`.

Parse-time impact: ~14s -> ~26s (2x due to doubling parse count). Still well within tolerance.

Side-benefit: this is the reusable pattern for MVDSV / KTX / FTE, which have richer platform guards. Landing it on ezQuake first keeps the architectural change narrow. Future projects add variants by (a) defining new `clang_args_<platform>_for` in `clang_config.py`, (b) threading them through the driver's worker globals and `_process_one_file`, (c) relying on the existing handler primary-path logic.

### Deferred -- `-nopriority` cmdline_param (1 row)

The 4-variant architecture reaches `sv_sys_win.c`, and two other COM_CheckParm call sites in that file (lines 374 and 409 for `-noerrormsgbox`) are captured correctly. The third call site at line 645 is inside `Sys_Init`, whose body references Windows SDK types: `VER_PLATFORM_WIN32_NT`, `GetCurrentProcess()`, `SetPriorityClass(...)`, `HIGH_PRIORITY_CLASS` -- all provided by `<mmsystem.h>` and `<winsock2.h>`. These headers don't exist on the Linux libclang environment.

Under `PARSE_INCOMPLETE`, clang continues parsing past fatal `#include` errors and makes most of the file walkable -- but specific function bodies whose resolution depends on the missing SDK types remain invalid AST, and the walker can't visit cursors inside them. `Sys_Init` is such a body; `COM_CheckParm("-nopriority")` at line 645 is therefore unreachable.

Recovery options when pressure surfaces:
1. **Stub Windows SDK headers.** Add a minimal `win-sdk-stubs/` directory with declarative `.h` files for winsock2, mmsystem, SDL, etc., and point `-I` at it in `clang_args_win_for`. One-time setup, unblocks all Win-SDK-dependent TUs.
2. **Accept help-JSON as source of truth** for this row. Register `-nopriority` in upstream `help_cmdline_params.json` and stop trying to recover from source on Linux.
3. **Upstream refactor** to split Sys_Init so the `COM_CheckParm` call doesn't intertwine with Windows-SDK type usage.

Recommended: option 1 when/if MVDSV or FTE hit the same barrier -- solve in one place, across extractors. Until then, the -nopriority doc_only row is acceptable pending that shared solve.

### Item B -- help-JSON type-mismatch dedup (SHIPPED, commit `146cd73`)

Help-JSON files occasionally label a name under the wrong entity type. Rather than ship a patch upstream per mismatch, the loader now cleans these up on ingest: at the end of each `load-version` transaction, doc_only entities of the current type with a same-name same-project source_backed counterpart under any OTHER type are deleted (from the per-type versions table, source_state_transitions, source_overrides, and entities). Per-type-scoped + idempotent -- each re-run cleans only what its own type produces; already-clean DBs yield zero prunes.

Initial cleanup on ezquake head pruned **22 orphan rows**:
- 15 `command doc_only`:
  - 12 HUD elements labeled as commands in help_commands.json (source_backed as `hud_element`): `bar_armor`, `bar_health`, `itemsclock`, `netproblem`, `radar`, `score_difference`, `score_enemy`, `score_position`, `speed`, `speed2`, `teamholdbar`, `teamholdinfo`.
  - 3 cvars labeled as commands in help-JSON (source_backed as `cvar`): `password`, `spectator_password`, `vid_fullscreen`.
- 7 `cvar doc_only`:
  - 2 commands labeled as cvars in help-JSON (source_backed as `command`): `floodprotmsg` (Cmd_AddCommand at sv_ccmds.c:1904 + host.c:534), `userdir` (Cmd_AddCommand at cl_cmd.c:953).
  - 5 `scr_weaponstats_*` that became `command source_backed` via P1's Cmd_AddLegacyCommand detection while help_variables.json still listed them as cvars. Not in the original audit -- surfaced by the loader's cross-type check during the cleanup run. Good example of the loader-side fix catching a class of mismatch I hadn't cataloged manually.

Verify-after: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name, type, source_state FROM entities WHERE project='ezquake' AND name='radar' ORDER BY type"` -- returns one row (`hud_element source_backed`). The prior `command doc_only` orphan is gone.

---

## Pattern 4 reclassified -- not an extractor bug

The 2026-04-24 analysis listed `mp3_volume` and `mp3info` (3 rows total -- two as macros, one as a command) as an extractor gap ("MACRO_DEF X-macro not detected"). Primary-source check during 2026-04-25 verification disproved this:

- `handler_macros.py` setup step already reads `macro_ids.h` and regex-matches `MACRO_DEF(name)` tokens into a `_declared` list (lines 97-100).
- The handler then looks for `Cmd_AddMacro(macro_<name>, handler_fn)` call sites (CALL_EXPR visit, lines ~120-145).
- Result: if a name appears in `MACRO_DEF(...)` but has no corresponding `Cmd_AddMacro(...)` call, the handler correctly emits the row with `ast: null` -- i.e. classifies it as doc_only.

That is exactly what happened to `mp3_volume` and `mp3info`: `macro_ids.h` still has `MACRO_DEF(mp3_volume)` and `MACRO_DEF(mp3info)` at lines 53-54, but the registration call sites were removed when the MP3 feature was deprecated. This is genuine cat2 upstream drift (stale enum entry after feature removal), not an extractor-fix target.

Disposition: these 3 rows belong in the upstream contributor-onboarding gap report, same as the 3 canonical phantoms (`mp3_startwinamp`, `qtv_reconnect`, `score_own`).

---

## Methodology -- what the mechanical sweep misses

Two structural blind spots in the mechanical (grep + git-log-S) partition emerged during this audit. The semantic pass + primary-source verification is what caught them both:

### Blind spot 1 -- string-in-source != registration

`grep -w "<name>"` tells you the literal string appears somewhere. It cannot distinguish:
- A **registration** call: `Cmd_AddCommand("foo", ...)` or `cvar_t foo = {"foo", ...}`
- A **dead reference**: a name in a denylist array (`msgtrigger_commands[]`), a stale `extern` declaration, or a commented-out line.

All 3 `tcl_*` rows matched the mechanical-sweep cat1 bucket because their strings appear in `src/cmd.c:1767 msgtrigger_commands[]` -- but they're denylist entries for a removed feature, not live registrations. Same pattern for 3 stale `extern` entries at `menu_options.c:318` and 1 commented-out declaration at `sv_main.c:136`.

The semantic pass (classifying each grep hit by proximity to a known registration construct) brought these out.

### Blind spot 2 -- names built via string concatenation

HUD child cvars like `hud_mouserate_align_x` are constructed inside `HUD_CreateVar(parent_name, "align_x", ...)` via `snprintf("%s_align_x", parent_name)`. The full literal name never appears in source or in git-log-S diffs, so the mechanical sweep misclassifies them as cat3 (never existed) when they're really cat2 (parent element was removed).

11 of the 14 initial cat3 rows flipped to cat2 after a parent-element history check. The `mouserate` parent HUD element was removed in commit `8c7f57d8` "Remove mouse rate leftovers" (2015). Same pattern for `hud_score_bar_fixed_order`.

### Takeaway for future audits

1. Run the mechanical sweep for a first partition.
2. Always do a semantic pass over cat1 candidates -- denylist/extern/comment false positives are common.
3. For any cat3 `hud_*_*` rows, extract the parent element name and check its history separately.
4. Once Phase 2f historical backfill lands, `first_seen_version` / `last_seen_version` markers make cat2 vs cat3 directly queryable from the DB -- no grep + git-log-S heuristic needed.

---

## Cross-session failure mode

This audit produced three rounds of confident-but-wrong analysis before landing on verified ground truth:

1. **Round 1** (mechanical sweep) used `git log -S ... -- 'src/*.c' 'src/*.h'` which silently drops pre-reorg history when source lived at the repo root. MP3 family + other pre-reorg entries falsely hit cat3. Fixed by broadening the pathspec.
2. **Round 2** (disposition analysis) cross-checked against the AST JSONs with `.variables["name"]` but the actual top-level key is `.vars`. Every query returned `null`, which got misread as "extractor is missing these rows." Built a 7-pattern extractor-fix plan on that false premise. Partially caught when a trial "fix" didn't change the cvar count -- but the correction mis-diagnosed the cause and wrote a retraction banner saying the extractor was fine and the loader was buggy.
3. **Round 3** (2026-04-25 re-verification) found the retraction itself was wrong. The previous session had read `.vars["name"]` returning a non-null object as proof of source detection; in fact the object has `ast: null` when the name is in help-JSON but not detected in source. The extractor really was missing these rows. The original 7-pattern analysis was approximately correct.

Root cause common to all three rounds: derived conclusions trusted without a structure-verifying primary-source check. The habit that broke the loop: before answering "is X in Y?", dump the shape of Y first (`jq 'keys'`, grep the source around line N, print the full raw entry rather than a projection).

This audit is the canonical example for why **inference is not evidence** and why **primary-source verification** must precede synthesis. Preserved here rather than cleaned away, so future sessions can see what the failure mode looks like.

---

## Cross-references

- HANDOVER entry: `HANDOVER.md` Section  "Layer 1 doc_only audit -- platform-variant passes + help-JSON type-mismatch dedup"
- Extractor driver: `packages/qw-config/scripts/extract-ezquake-unified.py`
- Clang config: `packages/qw-config/scripts/extractor_lib/clang_config.py`
- Per-entity handlers: `extractor_lib/handler_commands.py`, `handler_cvars.py`, `handler_macros.py`, `handler_cmdline.py`
- AST JSON outputs consumed by Oracle loader: `packages/qw-config/src/data/ezquake-*-ast.json`
- Oracle loader: `apps/qw-oracle/scripts/load-knowledge/load-*.ts`
- Schema field: `source_state` on `entities` table -- `source_backed | doc_only | source_retired`. Load-bearing for data-quality queries.
- Phase 2f historical backfill (HANDOVER): once landed, auto-classifies cat2 vs cat3 via `first_seen_version` / `last_seen_version` markers, making future audits cheaper.
