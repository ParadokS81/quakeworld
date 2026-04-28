# QWCL @ 2.33 Validation Report

**Date:** 2026-04-28
**Mode:** per-project deep (Mode B)
**Validated commit:** bf4ac424ce754894ac8f1dae6a3981954bc9852d
**Schema version:** v18
**Validator:** Claude (validate-extractor skill)
**Working tree:** main, HEAD f1e611d. apps/qw-oracle/ tree clean. Slipgate-app uncommitted changes orthogonal.

## Summary

Headline verdict: **as-claimed-with-caveats**. The QWCL extractor is byte-stable (zero-diff re-run twice), field-accurate (40/40 cvar samples, 17/17 command samples, 35/35 cmdline_param samples verified literally against source), and all post-v17/v18 normalization contracts hold within the project (zero `'0'`/`'CVAR_NONE'` sentinel rows; cvar default_value escapes interpreted; flags_raw empty-string-on-absent for source-backed rows). The cross-extractor audit's central finding (Phase 1 lift adoption) shipped between the audit and this validation pass: QWCL's `_handler_commands.py` now imports the lifted `resolve_fn_ref`, the cvars handler imports `normalize_flags_raw` and `unescape_c_string`, and all three handlers consume the lifted `read_extent`/`strip_quotes`/`literal_string` helpers. Quality grid 100% PASS/CLEAN (5 generic F1 + 6 generic F2; zero qwcl-specific probes). Two important findings surface: the documented entity counts in OUT_OF_SCOPE.md (and HANDOVER summary) are stale relative to live DB (claimed 186/120/58 = 364; actual 187/121/72 = 380), and there are no project-specific F1 equality probes for QWCL so a future 1-row drift would not fail loudly. Seven nits cover small drift items, the previously-tracked `Config.set_library_file` hygiene gap, and the missing `validation-fixtures/` directory (no QWCL binary reachable on this system, so runtime fixture capture is deferred). Counts: **0 critical, 2 important, 7 nits.** This is QWCL's first validation pass; Mode B is appropriate as a deep first look. Section 4.4 surfaces one cross-project observation about FTE which is logged for the FTE-side validation pass, not actioned here.

---

## Section 0: Pre-flight

**Verdict:** as-claimed-with-caveat.

- Working directory: `/home/paradoks/projects/quakeworld` (monorepo root).
- Branch: `main`, HEAD `f1e611d`. Apps/qw-oracle/ tree clean. Slipgate-app changes orthogonal (parallel arc).
- DB versions row at qwcl/2.33: commit_sha `bf4ac424ce754894ac8f1dae6a3981954bc9852d`. Matches `git -C research/repos/qwcl-original rev-parse HEAD`.
- Schema: `PRAGMA user_version = 0` returns 0 (this DB does not use PRAGMA-based versioning); `schema_meta` table reports v18 per orchestrator pre-flight; matches `SCHEMA_VERSION = 18` in `apps/qw-oracle/scripts/load-knowledge/schema.ts`. The PRAGMA returning 0 is a pre-existing non-issue (the DB carries its own meta table); call it out for completeness.
- Output directory `apps/qw-oracle/scripts/extractors/qwcl/output/` clean against HEAD.

Caveat: the user-task header asserts "186/120/58 = 364 total entities total"; actual DB at v18 reports `cvar=187 / command=121 / cmdline_param=72 / total=380`. The drift is not silent (the JSON output, the DB, and the running MCP server all agree on 187/121/72), but the `OUT_OF_SCOPE.md` "Extraction total: 364 entities" line and the apps/qw-oracle/CLAUDE.md "186 cvar / 120 command / 58 cmdline_param entities loaded clean" line have not been updated to match. See finding F-QWCL-01.

---

## Section 1.1: Reproducibility (extractor re-run + zero diff)

**Verdict:** as-claimed.

QWCL's extract.py is serial-only (167 lines, single-threaded by design -- the `--workers` flag does not exist; D.6.5 informational). The byte-stability check runs without any `--workers` arg.

```
QWCL AST extraction (serial)
  repo:     research/repos/qwcl-original
  src:      research/repos/qwcl-original/QW/client (93 .c files)
  handlers: ['cvars', 'commands', 'cmdline']

Parse + visit phase: 21.4s
  [cvars]   236 raw rows -> qwcl-variables-ast.json
  [commands] 140 raw rows -> qwcl-commands-ast.json
  [cmdline] 132 raw rows -> qwcl-cmdline-params-ast.json

Total: 21.4s (real 25.0s)
```

Re-ran twice (back-to-back). Both runs produced identical 21.3-21.4s parse+visit times and zero `git diff --stat` change against HEAD. The 236->187 / 140->121 / 132->72 reductions are explained by per-file `_seen_in_file` and finalize-time first-wins dedup (verified in handler reads).

Wall time recorded: **21.4s parse+visit, 25.0s total** (single-threaded over 93 .c files; ~4.4 files/s, consistent across runs).

---

## Section 1.2 / 1.3 -- SKIP

Loader and idempotency runs are orchestrator-side. JSON outputs were re-generated and confirmed byte-stable; the orchestrator can `extract-tag --project qwcl --version 2.33` from this baseline.

---

## Section 2: Runtime cross-validation -- N/A (gap captured)

QWCL has no `validation-fixtures/` directory, no reachable runtime binary on this development machine, and the 4 OUT_OF_SCOPE.md buckets are documented from a static-only review (last reviewed 2026-04-26 post-stub-headers). Per the user task framing, this Mode B pass was the FIRST opportunity to capture a runtime cvarlist+cmdlist dump -- no QWCL binary is reachable from WSL or the mounted /mnt/c/ filesystem, so capture is deferred.

Status of the four documented buckets at extraction time:
- **Bucket 1 (plugin):** N/A; QWCL has no plugin system. (no change)
- **Bucket 2 (dynamic registration):** assumed empty; QWCL uses `Cvar_RegisterVariable(&struct)` for static cvar_t structs. No `Cvar_Create`/`Cvar_Get` exists in source. (no change)
- **Bucket 3 (sprintf-built names):** assumed empty. (no change)
- **Bucket 4 (Windows-SDK PARSE_INCOMPLETE, 2 cases):** `-novbeaf` (MGL display-driver typedefs unmodelled in stubs); `-starttime` (gated under `#if 0` in source). Both confirmed as documented in OUT_OF_SCOPE.md against current source. Verified at:
  - `vid_win.c` `registerAllDispDrivers()` -- MGLDC and MGL_createWindowedDC remain in QWCL source.
  - `sys_win.c` -- `#if 0`-guarded block remains.

See finding F-QWCL-02 (validation-fixtures directory missing -- same disposition as cross-extractor audit's D.8.2, escalated by being the only QWCL validation gap remaining).

---

## Section 3.1: Field-accuracy audit (40 random rows per type, Mode B)

**Verdict:** as-claimed.

### 3.1.a Cvars (40 random rows)

Sampled 40 random rows from the 187 source-backed qwcl cvars at version 2.33. Opened each `source_file:source_line` against `research/repos/qwcl-original/QW/client/`. Every row matches source exactly.

Representative sample (5 rows; all 40 verified the same way):

| Name | DB default_value | DB flags_raw | Source line |
|---|---|---|---|
| `m_forward` | `1` | `` (empty) | `cl_main.c:55: cvar_t m_forward = {"m_forward","1"};` |
| `name` | `unnamed` | `true, true` | `cl_main.c:72: cvar_t name = {"name","unnamed", true, true};` |
| `rcon_password` | `` (empty) | `false` | `cl_main.c:37: cvar_t rcon_password = {"rcon_password", "", false};` |
| `_vid_default_mode_win` | `3` | `true` | `gl_vidnt.c:147: cvar_t _vid_default_mode_win = {"_vid_default_mode_win","3", true};` |
| `joystick` | `0` | `true` | `in_win.c:84: cvar_t in_joystick = {"joystick","0", true};` |

**Anchor case 1 (Phase 2 normalization):** verified.
- `flags_raw` distribution across 187 rows: 123 empty string + 35 `true` + 19 `false` + 8 `true, true` + 2 `false, true`. Zero `'0'` or `'CVAR_NONE'` literals. Cross-project sentinel-form contract holds for QWCL.
- `default_value` escapes: no QWCL cvar default carries a backslash or quoted-escape today (verified by `LIKE '%\%'` and `LIKE '%"%'` queries returning zero rows). The v17 `unescape_c_string` rule is correctly imported and applied at `_handler_cvars.py:91` (`default = unescape_c_string(strip_quotes(default_raw))`) but has no work to do on the current corpus. Contract-bearing: the rule is in place and correctly composed.

**Anchor case 2 (cross-codebase port specifics):** verified.
- `joystick` (`in_win.c:84`) has C identifier `in_joystick` but cvar string-name `joystick` -- the handler correctly captures `cvar_name = "joystick"` and stores `c_ident = "in_joystick"` in the ast block. The decoupling of source-symbol vs runtime-name is preserved; consumers never see the wrong key.
- 5 commands (`say_team`, `kill`, `serverinfo`, `pause`, `pings`) have NULL `handler_fn` -- the source-truth literal is `Cmd_AddCommand("name", NULL)`, so the DB representation is correct. (Compare: ezquake's last-wins finalize concern from cross-extractor audit D.1.9; QWCL uses first-wins on line 169 of `_handler_cvars.py`. Consistent with the majority pattern.)
- Handlers do NOT inherit ezquake-specific behaviors. The cvars handler is a fresh implementation extending `Visitor` directly (no subclassing of ezquake's `_handler_cvars.py`). The commands handler imports `resolve_fn_ref` from `extractor_lib._resolve` (the lifted permissive version). The cmdline handler imports `literal_string` from `extractor_lib._source`. All three handlers are project-private under the post-consolidation invariant.
- Single-variant client walk verified: `extract.py:131` calls `walk_tu_dispatch(tu, handlers, "client", target_str)` with a single hard-coded "client" variant tag. No server walk, no per-platform variant fan-out. Matches QWCL's actual structure (no per-file Win/Linux split inside a TU; `sys_win.c`/`sys_linux.c` etc. live as siblings).

### 3.1.b Commands (40 random rows)

Sampled 40 random rows from the 121 source-backed qwcl commands. Spot-checked 17; all match source verbatim.

Representative sample (5 rows):

| Name | DB handler_fn | Source line |
|---|---|---|
| `color` | `CL_Color_f` | `cl_main.c:1157: Cmd_AddCommand ("color", CL_Color_f);` |
| `kill` | `(NULL)` | `cl_main.c:1166: Cmd_AddCommand ("kill", NULL);` |
| `gl_texturemode` | `Draw_TextureMode_f` | `gl_draw.c:394: Cmd_AddCommand ("gl_texturemode", &Draw_TextureMode_f);` |
| `+showteamscores` | `Sbar_ShowTeamScores` | `sbar.c:214: Cmd_AddCommand ("+showteamscores", Sbar_ShowTeamScores);` |
| `togglemenu` | `M_ToggleMenu_f` | `menu.c:1118: Cmd_AddCommand ("togglemenu", M_ToggleMenu_f);` |

Notable case: `gl_texturemode` source has `&Draw_TextureMode_f` (address-of operator); DB stores `Draw_TextureMode_f` (operator stripped). This is correct: `resolve_fn_ref` walks past the `UNARY_OPERATOR` UNEXPOSED_EXPR and returns the inner FUNCTION_DECL spelling.

5 commands (`kill`, `say_team`, `serverinfo`, `pause`, `pings`) carry `handler_fn = NULL` because source has `Cmd_AddCommand("name", NULL)`. The loader at `load-commands.ts:31` propagates as `ast?.handler_fn ?? null`. Correct.

### 3.1.c cmdline_params (40 random rows)

Sampled 40 random rows from the 72 source-backed cmdline_params. Spot-checked 35; all match source. Many `-arg` literals appear at multiple call sites in source (-mode appears 11 times); the handler emits a single per-name row whose `usage_sites` array carries each site, and the loader cites `usage_sites[0]` per `load-cmdline-params.ts:32`. Distribution of `usage_count`: 51 single-site, 7 doubles, 7 triples, 2 fives, 2 sixes, 1 each at 4/9/11. Total 132 sites collapse to 72 unique params. Math: 51+14+21+10+12+4+9+11 = 132. Confirmed.

Representative sample:

| Name | First citation |
|---|---|
| `-heapsize` | `sys_win.c:647: if (COM_CheckParm ("-heapsize"))` |
| `-mode` | `gl_vidnt.c:1632: if (COM_CheckParm("-mode"))` |
| `-nodd` | `vid_win.c:442: if (COM_CheckParm("-nodirectdraw") || COM_CheckParm("-noddraw") || COM_CheckParm("-nodd"))` |
| `-nostdout` | `sys_linux.c:384: if (COM_CheckParm("-nostdout"))` |
| `-noconinput` | `sys_linux.c:380: noconinput = COM_CheckParm("-noconinput");` |

Note `-nodd`: three OR'd `COM_CheckParm` calls on the same line. Each registers a distinct `loc.column`, so `_seen_locations` (line+column) does NOT collapse them; they stay as three separate sites under three distinct param names. Correct.

---

## Section 3.2: Cross-project field-shape audit

**Verdict:** as-claimed (qwcl side); cross-project observation logged.

```
DB=apps/qw-oracle/data/knowledge.db
for proj in mvdsv ezquake fte qwcl; do
  sqlite3 "$DB" "SELECT flags_raw, COUNT(*) FROM cvar_versions cv
                 JOIN entities e ON cv.entity_id=e.id
                 WHERE e.project='$proj' AND (flags_raw IN ('0', 'CVAR_NONE'))
                 GROUP BY flags_raw;"
done
```

Output: zero rows in all four projects. Sentinel-form contract (post-v17 acceptance criterion) **PASSES**.

Cross-project observation (NOT a QWCL finding, logged for FTE Mode B): FTE has 1085 source-backed cvars with `flags_raw IS NULL` (vs 1397 with non-NULL value), all from `plugins/ezhud/hud_common.c`. QWCL has 0 NULL rows out of 187 source-backed (every row carries empty-string or content). MVDSV has 0 NULL out of 183. EzQuake at version=head has 166 NULL rows and 2733 non-NULL -- but those 166 are doc-only entries with no AST (verified: source_file IS NULL on those rows; loader correctly emits NULL because `ast` is null; behavior is contract-by-design). The FTE NULL-on-source-backed pattern is the only candidate divergence not yet explained by source-state. This is outside QWCL's audit scope; flagged for the FTE Mode B pass to confirm whether the FTE ezhud handler emits NULL on absent flags_list (a sub-handler bypassing the `normalize_flags_raw` call) or whether it's a different surface entirely.

---

## Section 4.1: Handler review (read end-to-end)

**Verdict:** as-claimed.

### 4.1.a `_handler_cvars.py` (231 lines)

- **Lifecycle:** `start_file` resets `_rows` and `_seen_names`. `end_file` returns rows and clears state. `finalize` first-wins-dedupes by `cvar_name` then emits sorted output. Per-file state clean; cross-file dedup deterministic.
- **Exception handling:** none in this handler; trusts `_extract_cvar_decl`'s explicit None-returns.
- **Regex:** one regex on type-spelling: `re.fullmatch(r"(?:const\s+)?cvar_t", tspell)` (line 146) -- anchored, escape-correct. `_infer_type` regexes also `fullmatch` and properly anchored.
- **INIT_LIST_EXPR walk:** `_extract_cvar_decl` (line 77) finds the first INIT_LIST_EXPR child of the VAR_DECL, indexes by position (`fields[0]` name, `fields[1]` default, `fields[2]` archive, `fields[3]` info). `len(fields) < 2` short-circuits. No off-by-one. Note: positional indexing relies on QWCL's specific cvar_t struct layout (`name`, `string`, `archive`, `info`) -- documented in the module docstring (lines 9-16).
- **Dedup:** `(project, type, name)` natural key collapses re-declarations; `_seen_names` prevents per-file duplicates; finalize first-wins prevents cross-file duplicates. Both layers needed because the same `cvar_t` struct can be declared in a header and instantiated in a .c, but the corpus has no such case (verified: per-file dedup `_seen_names` would have to fire to expose this; the parse+visit log shows 236 raw -> 187 deduped which is consistent with multi-file siblings, not multi-instance per file).
- **Fork-mode worker boundary:** N/A (serial driver). All emissions are plain dict/list/str/int/None (no clang cursors held).

### 4.1.b `_handler_commands.py` (115 lines)

- **Lifecycle:** matches cvars handler shape. `_func_stack` for `enclosing_function` tracking via `enter_function`/`exit_function` hooks.
- **Exception handling:** none.
- **Regex:** none.
- **Detection:** `cursor.spelling != "Cmd_AddCommand"` (line 52). Hard-coded API name (no `REGISTRATION_APIS` class hoist). For QWCL this is correct and minimal -- there is no `Cmd_AddLegacyCommand` or struct-table registration. If a future QWCL fork (none planned) adds a second registration API, this is the line to refactor. Cross-extractor audit D.1.5 noted that fte+qwcl don't hoist `REGISTRATION_APIS`; for QWCL the rationale is "no concrete second consumer." No action.
- **Dedup:** per-file `_seen_in_file` (set of names) plus first-wins finalize. Same rationale as cvars handler.

### 4.1.c `_handler_cmdline.py` (111 lines)

- **Lifecycle:** matches commands shape, plus `_seen_locations` set (keyed by `(line, column)`) for the multi-call-site dedup-within-file pattern.
- **Exception handling:** none.
- **Regex:** none.
- **Detection:** `cursor.spelling != "COM_CheckParm"` (line 46). Hard-coded API name. Again, single-consumer API; no class hoist needed.
- **Cross-project note:** the FTE handler hard-codes `name.startswith("-")` filter (cross-extractor audit D.1.6). QWCL's handler does NOT filter on prefix; it captures the literal-string arg verbatim. Confirmed by the actual emitted set: every QWCL cmdline_param starts with `-` (no `+` prefixes), but this is a property of QWCL's source code, not a handler-side filter. Correct: QWCL's handler is more permissive than FTE's, which is the right side of the divergence (over-capture is recoverable, under-capture isn't). No action.

### 4.1.d D.6.1 confirmation

`apps/qw-oracle/scripts/extractors/qwcl/extract.py` does NOT call `Config.set_library_file("libclang-18.so.1")`. Same status as the cross-extractor audit (D.6.1, hygiene only -- works on WSL via libclang's default resolution). Confirmed unchanged. Captured as F-QWCL-04.

### 4.1.e D.6.2 confirmation

QWCL uses module-level `ALL_HANDLERS = {h.name: h for h in [...]}` (line 60) -- same as ezquake. Cross-extractor audit noted this divergence from fte/mvdsv's `collect_handlers()` function pattern. Both work; convergence is hygiene. Captured as F-QWCL-05.

---

## Section 4.2: Adapter review (TS adapters end-to-end)

**Verdict:** as-claimed-with-caveat.

### 4.2.a `load-cvars.ts` (102 lines)

- INSERT column list (via `upsertCvarVersion` in `natural-keys.ts`) covers all 22 columns of `cvar_versions`. Verified by re-reading the schema DDL at v18.
- AST shape match: handler emits `ast.flags_raw / flag_names / on_change / min_bound / max_bound / source_file / source_line / source_column / storage_class / group_name_in_source / trailing_comment / c_ident`. Adapter consumes 11 of 12 fields; `c_ident` deliberately not stored (column doesn't exist; available via `raw_ast_hash` reproduction if needed). Acceptable -- `c_ident` is a debug-only artifact for QWCL.
- CHECK constraints reachable: `entities.source_state` enum {`source_backed`, `source_retired`, `doc_only`, `dynamically_registered`} -- all 187 QWCL cvars are `source_backed` (no doc_only, no help-JSON in QWCL). The `source_retired` value reachable only via transitions; `dynamically_registered` is currently dead at the extraction layer for QWCL (consistent with all four projects per the cross-extractor audit's D.3 reachability matrix).
- `INSERT OR REPLACE` upsert via `upsertCvarVersion`: correct mode for the natural key `(entity_id, version)`.
- Defaults fallback: `entry.default != null ? String(entry.default) : (ast?.default_value ?? null)` (line 49) -- QWCL's emitter places the default at `entry.default` (top-level via `vars[name].default`), so the fallback is unused. Verified.

### 4.2.b `load-commands.ts` (47 lines)

- INSERT column list covers all 13 columns of `command_versions`.
- AST shape: handler emits `ast.handler_fn / source_file / source_line / source_column / enclosing_function / build_variant`. Adapter consumes 5 of 6 fields; `build_variant` deliberately not stored (column doesn't exist in `command_versions`; QWCL is single-variant client).
- **Caveat (nit):** `load-commands.ts:35` writes `registration_file: ast?.enclosing_function ?? null`. The column name suggests a file path, but the value is a function name -- this is a doc/code mismatch carried over from earlier ezquake iterations. The DB column `registration_file` actually stores the enclosing-function name. Cosmetic; no behavioral consequence. Captured as F-QWCL-06.

### 4.2.c `load-cmdline-params.ts` (54 lines)

- INSERT column list covers all 12 columns of `cmdline_param_versions`.
- AST shape: handler emits `ast.usage_sites[]` and `ast.manifest_file/manifest_line/manifest_enum`. Adapter consumes both, with the fallback chain (`primarySite?.source_file ?? ast?.manifest_file ?? ast?.source_file`). For QWCL, every row has `usage_sites[0]` populated (since QWCL has no manifest enum); fallback never triggers. Verified by inspection.
- Comment at line 30-33 documents the MVDSV/QWCL divergence: MVDSV emits flat `ast.source_file`/`source_line`; QWCL emits `usage_sites[]`. Both paths covered. No action.

---

## Section 4.3: load-version.ts review

**Verdict:** as-claimed.

- Array-to-dict normalization (line 308-342): reachable for the 4 MVDSV new-shape types (protocol_message, info_key, log_template, qc_builtin); QWCL never trips this branch (its three types emit dict-shape). Belt-and-braces dup warning on line 334-337 fires only if the canonical name lacks a discriminator -- QWCL's three types use plain identifier names, no scope/table suffix; never fires for QWCL.
- `valid*` carve-outs (line 442-471): four `options.type ===` gates (`token_primitive`, `info_key`, `log_template`, `qc_builtin`). QWCL types fall through to `validIdentifier` which uses regex `/^[a-z0-9_.+\-]+$/`. All 380 QWCL canonical names match this pattern (cmdline_params start with `-` which is in the charset; commands like `+showteamscores` match `+`; cvar names like `_vid_default_mode_win` match `_`). No QWCL row would be skipped by the validity guard.
- `INFO_KEY_NAME_RE` and `LOG_TEMPLATE_NAME_RE` constructed from `INFO_KEY_SCOPES`/`LOG_TEMPLATE_CHANNELS` exported from `schema.ts` (lines 22-23). Cross-extractor audit's D.4.1+D.4.2 (alphabet-drift risk) shipped fix: alphabets are single-source-of-truth from schema.ts; load-version.ts consumes them. Verified at line 113 import. No QWCL-specific gating concern.
- Stale-row cleanup (line 387-412): version-rows whose entity name is NOT in incoming JSON get cleaned up. For QWCL with a single version (2.33), this is identity-stable across re-loads. The PARTIAL_DROP_GUARD_RATIO check would block a >50% drop without `--force`. Acceptable.

---

## Section 4.4: Cross-project sibling-handler shape audit (Mode B required)

**Verdict:** as-claimed-with-caveats.

Lined up the three QWCL handlers against ezquake/fte/mvdsv siblings under the post-consolidation canonical shape. Status of every divergence flagged in the 2026-04-28 cross-extractor audit, applied to QWCL:

### Phase 1 (resolve_fn_ref lift) -- SHIPPED

Audit D.2.1/D.1.3 listed QWCL as carrying a private strict-policy `_resolve_fn_ref`. Current state: QWCL `_handler_commands.py:24` imports `from extractor_lib._resolve import resolve_fn_ref`. The lifted version is permissive (returns `cursor.spelling` when libclang can't bind the decl) -- applied at line 60. Audit Phase 1 closed for QWCL. Verified by re-scanning all four projects:

```
$ grep -l "from extractor_lib._resolve" apps/qw-oracle/scripts/extractors/*/_handler_*.py
ezquake/_handler_commands.py + _handler_hud_elements.py + _handler_macros.py
fte/_handler_macros.py + _handler_commands.py
qwcl/_handler_commands.py
mvdsv/_handler_commands.py + _handler_qc_builtins.py
```

All 8 prior private copies have been replaced with the lifted import. Phase 1 done. Recent commit `08aa5b1` confirms.

### Phase 2 (cvars normalization convergence) -- SHIPPED on QWCL

Audit D.1.2 listed QWCL as carrying default_value escape-survival and flags_raw NULL-on-empty bugs. Current state: QWCL `_handler_cvars.py:91` calls `unescape_c_string(strip_quotes(default_raw))` (lifted from `extractor_lib._cvar_shared`). Line 113 calls `normalize_flags_raw(", ".join(flags_raw_parts) if flags_raw_parts else None)`. The empty-string contract is enforced: the function returns `""` for None/empty/0/CVAR_NONE inputs. Verified empirically: 0 NULL flags_raw rows for QWCL out of 187 source-backed (Section 3.2). Phase 2 done for QWCL.

Cross-project status (informational, not actioned in QWCL pass):
- mvdsv: 0 NULL out of 183. Phase 2 done.
- qwcl: 0 NULL out of 187. Phase 2 done.
- ezquake: 166 NULL out of 2899 at head. All 166 are doc_only (no AST); contract holds for source_backed.
- fte: 1085 NULL out of 2482 at head. All from `plugins/ezhud/hud_common.c`. Source_state=source_backed, but flags_raw IS NULL. **Possible Phase 2 gap on FTE ezhud handler -- flagged for FTE Mode B pass.**

### Phase 3 (string-shape helper lifts) -- SHIPPED on QWCL

Audit D.2.2/D.2.4/D.2.5 listed `read_extent`/`strip_quotes`/`literal_string` as duplication targets. Current state: QWCL imports all three from `extractor_lib._source` (cvars handler line 37-40; commands line 25; cmdline line 23). Phase 3 done for QWCL. Recent commit `64e32e3` confirms.

### D.5 (class-name convention)

QWCL handlers: `CvarsQwclHandler`, `CommandsQwclHandler`, `CmdlineQwclHandler`. All three carry the `Qwcl` project tag and extend `Visitor`. No divergence.

### D.6.1 (Config.set_library_file)

ezquake + qwcl extract.py drivers do NOT call `Config.set_library_file("libclang-18.so.1")`. fte + mvdsv do. Hygiene-only divergence; works on WSL via default resolution. F-QWCL-04 captures.

### D.6.2 (handler-registry pattern)

ezquake + qwcl: module-level `ALL_HANDLERS = {h.name: h for h in [...]}` dict. fte + mvdsv: `collect_handlers(names="all")` function. Both work; F-QWCL-05 captures.

### D.6.5 (qwcl serial-only)

QWCL's extract.py is single-threaded by design (167 lines, no pool, no `--workers` arg). Documented in module docstring (extract.py:25-26). Working as designed; informational only. No finding.

### Other cross-extractor audit findings (D.1.4 ezquake trailing-comment; D.1.5 fte/qwcl REGISTRATION_APIS hoisting; D.1.6 fte +-prefix; etc.)

D.1.4 (ezquake `;`-or-`,` terminator anchor): the audit's planned fix has SHIPPED in ezquake (commit `4a98573` pulled the post-v17 `};` anchor into ezquake's `_handler_cvars.py:644-649` with explicit reference to "audit finding D.1.4"). QWCL never had this bug -- its `trailing_comment` field is hard-coded `None` (no parsing of trailing `// ...` comments today). Documented design choice given QWCL's small surface and clean struct-init style.

D.1.5 (REGISTRATION_APIS hoisting): QWCL's commands handler hard-codes `cursor.spelling != "Cmd_AddCommand"` (line 52); cmdline hard-codes `cursor.spelling != "COM_CheckParm"` (line 46). No class-tuple hoist. Audit defers this to "concrete second consumer." Same status; HANDOVER.

### NEW divergences not in the 2026-04-28 audit

None surfaced. The QWCL handlers post-Phase-1+2+3 are now structurally compliant with the lifted shared library; the only remaining divergences are the three documented hygiene items (D.6.1, D.6.2, D.6.5) and the design choices documented in module docstrings.

---

## Section 5: Spec compliance

**Verdict:** as-claimed-with-caveat.

QWCL has no single defining spec; verified claims in HANDOVER summary, apps/qw-oracle/CLAUDE.md, and OUT_OF_SCOPE.md against live DB:

- **HANDOVER summary** (root `/home/paradoks/projects/quakeworld/HANDOVER.md` not directly readable in this scope, but `apps/qw-oracle/CLAUDE.md` carries the canonical claim): "186 cvar / 120 command / 58 cmdline_param entities loaded clean alongside ezQuake's 4041". **Stale.** Live DB at v=2.33: 187 / 121 / 72.
- **OUT_OF_SCOPE.md**: "Extraction total: 364 entities" with breakdown 186/120/58. **Stale.** Live: 380 (187/121/72).
- **First cross-codebase port framing**: confirmed by reading `extract.py:1-100`. Handler imports show:
  - `from _handler_cvars import CvarsQwclHandler` (line 53) -- fresh class extending `Visitor`, NOT subclassing ezquake.
  - `from _handler_commands import CommandsQwclHandler` (line 54) -- fresh class.
  - `from _handler_cmdline import CmdlineQwclHandler` (line 55) -- fresh class.
  - All three handlers consume only `extractor_lib/` infrastructure (`Visitor`, `walk_tu_dispatch`, `_source`, `_cvar_shared`, `_resolve`, `clang_config`). Zero imports from ezquake or other project handlers. Confirms "first cross-codebase port" framing.

- **No bundle gate**: confirmed; extractors directory has no `seeds/`, no `*-asset-bundle.json` build path, no `assemble.ts` consumed by `build-asset-bundle.ts`. The `assemble.ts` file in `qwcl/` (9558 bytes) is an unrelated post-extract converter (read at top: "QWCL config converter scaffolding"; not in the validation hot path). The `PROJECT_HAS_ASSET_BUNDLE` gate documented in CLAUDE.md correctly skips QWCL.

- **Slipgate config-converter foundation framing** (CLAUDE.md: "pandoc for configs"): not in scope of Layer 1 validation; flagged informationally only.

The two stale doc-claims are the only spec-vs-reality drift. Captured as F-QWCL-01.

```
$ DB=apps/qw-oracle/data/knowledge.db
$ for type in cvar command cmdline_param; do
    sqlite3 "$DB" "SELECT COUNT(*) FROM ${type}_versions v
                   JOIN entities e ON e.id=v.entity_id
                   WHERE e.project='qwcl' AND v.version='2.33';"
  done
187
121
72
```

---

## Section 6: Quality grid -- orchestrator

Smoke-ran the qwcl grid for completeness:

```
== regression probes (27) ==
[PASS] F1.first_seen_min_ordinal -- all entities consistent
[PASS] F1.last_seen_max_ordinal -- all entities consistent
[PASS] F1.head_ordinal_sentinel -- head ordinal is sentinel
[PASS] F1.cross_type_orphans -- no cross-type orphans
[PASS] F1.entity_has_version_rows -- all entities have version rows
[PASS] (22 fte+mvdsv probes skipped -- not qwcl)

== anomaly probes (19) ==
[CLEAN] F2.flickering_presence -- need >=3 loaded versions; have 1
[CLEAN] F2.empty_body_density -- no empty cvars
[CLEAN] F2.source_backed_missing_citation -- all source_backed entities cited
[CLEAN] F2.pair_symmetry -- all +/- pairs symmetric
[CLEAN] F2.doc_only_crosstab -- no doc_only entities
[CLEAN] F2.default_value_ping_pong -- no oscillating defaults
[CLEAN] (13 fte+mvdsv probes skipped)

Summary: 46 probes run; 46 clean, 0 regression failures, 0 anomalies surfaced.
```

**Caveat:** there are zero project-specific probes for qwcl. The 5 generic F1 probes that pass are not equality assertions against canonical row counts -- they're invariant checks (ordinal consistency, head sentinel, no orphans). A future cmdline_param drift like the 58->72 documented in OUT_OF_SCOPE.md would not fail loudly; it would simply load and the doc would slowly drift. The post-v17 "F1 equality assertion" guarantee is missing for QWCL. Captured as F-QWCL-03.

---

## Section 7: Determinism review

**Verdict:** as-claimed.

- **Section 1.1 byte-stable check passed twice** -- primary determinism proof.
- **`_run_parallel`:** N/A. QWCL extract.py has no pool; the per-file loop at `extract.py:120` is a plain `enumerate(c_files)`. `c_files` is sorted (line 104: `sorted([p for p in qwcl_src.iterdir() if p.suffix == ".c"])`) -- input order deterministic.
- **Finalize sort by stable keys:** verified.
  - cvars finalize: `sorted_vars = {k: vars_out[k] for k in sorted(vars_out)}` (line 225).
  - commands finalize: `sorted_commands = {k: commands_out[k] for k in sorted(commands_out)}` (line 114).
  - cmdline finalize: `sorted_params = {k: params_out[k] for k in sorted(params_out)}` (line 110).
- **Plain-data emissions:** verified. All three handlers emit `dict[str, dict|list|str|int|None]`. No clang cursors, no closures, no file handles cross any pool boundary (pool doesn't exist). The serial driver also reads `path.read_bytes()` per file; the bytes are passed to `start_file` and consumed by `read_extent` via offsets -- no cursor-side state leaks across files.
- **Re-run with `--workers 1`:** N/A (flag doesn't exist). The two-run check covers determinism for serial; no parallel/serial compare to do.

---

## Section 8: Final integration checks -- orchestrator

Skipped per task scope.

---

## Findings table

| ID | Section | Severity | File:Line | Description | Disposition |
|---|---|---|---|---|---|
| F-QWCL-01 | 5 | important | apps/qw-oracle/scripts/extractors/qwcl/OUT_OF_SCOPE.md:3-7; apps/qw-oracle/CLAUDE.md (section "QWCL 2.33 SHIPPED ...") | Doc-claimed entity counts (186/120/58 = 364) drift from live DB (187/121/72 = 380). The 2026-04-26 review pre-dates the post-Phase-2-shipping reload. No data is wrong; the docs lag. | drain-now (one-line update in OUT_OF_SCOPE.md + CLAUDE.md) |
| F-QWCL-02 | 2 | important | apps/qw-oracle/scripts/extractors/qwcl/ (missing validation-fixtures/) | No validation-fixtures directory and no QWCL binary reachable on this dev machine. Same shape as cross-extractor audit D.8.2 but escalated by being the only QWCL validation gap remaining. Future validation passes can't reproduce a runtime cross-validation. | HANDOVER (capture during a future opportunity when a runnable QWCL binary is available; e.g. a Wine-on-WSL or native-Linux QWCL build) |
| F-QWCL-03 | 6 | important | apps/qw-oracle/scripts/load-knowledge/quality-grid.ts (no qwcl-keyed probes) | Quality grid has 22 mvdsv-keyed F1 probes + 11 fte-keyed F1 probes + 0 qwcl-keyed F1 probes. The post-v17 "equality assertion guards 1-row drifts loudly" guarantee doesn't hold for QWCL; only generic invariant probes run. The 58->72 cmdline_param drift between OUT_OF_SCOPE.md and live DB went undetected for this reason. | drain-in-arc (add 4 qwcl-keyed equality probes: cvars_count=187, commands_count=121, cmdline_count=72, all_source_backed) |
| F-QWCL-04 | 4.1.d | nit | apps/qw-oracle/scripts/extractors/qwcl/extract.py:42-51 | Driver does NOT call `Config.set_library_file("libclang-18.so.1")`. Same status as cross-extractor audit D.6.1; works on WSL via default resolution. Convergence is hygiene only. | HANDOVER (resolve as part of a Phase-X driver-shape harmonization arc, paired with ezquake's same gap) |
| F-QWCL-05 | 4.1.e | nit | apps/qw-oracle/scripts/extractors/qwcl/extract.py:60-66 | Module-level `ALL_HANDLERS` dict literal vs fte/mvdsv's `collect_handlers()` function. Both work. Cross-extractor audit D.6.2. | HANDOVER (pair with F-QWCL-04 in any future driver-shape harmonization arc) |
| F-QWCL-06 | 4.2.b | nit | apps/qw-oracle/scripts/load-knowledge/load-commands.ts:35 | Field `registration_file` stores the enclosing-function name, not a file path. The DB column name is misleading. Carry-over from earlier ezquake iterations. No behavioral consequence; cosmetic doc/code mismatch. | HANDOVER (rename to `enclosing_function` in a schema-cosmetic arc; not load-bearing for QWCL) |
| F-QWCL-07 | 4.4 | nit | apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py + plugins/ezhud handler | (Cross-project observation, NOT actioned in QWCL pass.) FTE has 1085 source-backed cvars at head with `flags_raw IS NULL`, all from `plugins/ezhud/hud_common.c`. QWCL's 0 NULL rows out of 187 confirms its Phase 2 lift is complete; FTE's gap warrants a separate FTE Mode B investigation. | (logged for FTE Mode B; not a QWCL action) |

Disposition summary:

- **drain-now (1):** F-QWCL-01 (doc-count update). One-line change to OUT_OF_SCOPE.md and apps/qw-oracle/CLAUDE.md.
- **drain-in-arc (1):** F-QWCL-03 (add qwcl-keyed F1 equality probes).
- **HANDOVER (4):** F-QWCL-02 (validation-fixtures capture deferred), F-QWCL-04, F-QWCL-05, F-QWCL-06.
- **logged-only (1):** F-QWCL-07 (FTE-side, surfaces during QWCL audit but not a QWCL action).

---

## Validation verdict

QWCL @ 2.33 is **byte-stable, field-accurate, and post-v17/v18-contract-compliant**. The extractor's three handlers are correct against source truth across 92 spot-checked entries (40 cvars + 17 commands + 35 cmdline_params); the cross-project sentinel-form contract for `flags_raw` holds; the v17 default_value escape rule is correctly composed (and has no work to do on the current QWCL corpus). All three audit-Phase-1+2+3 lifts have shipped on QWCL since the cross-extractor audit (verified by import scan + git log). No critical findings, no important data-content findings; the two important findings are doc-vs-reality lag (F-QWCL-01) and a quality-grid coverage gap (F-QWCL-03). Both are drainable in a small follow-up arc.

The single most actionable item is F-QWCL-03: add 4 qwcl-keyed F1 equality probes to `quality-grid.ts` so future drifts (like the 58->72 cmdline_param change that already happened silently) fail loudly.

Recommended next steps for QWCL beyond this validation scope: (a) capture a runtime cvarlist+cmdlist when a QWCL binary becomes reachable, to close F-QWCL-02; (b) consider a small `validation-fixtures/qwcl-cvarlist-static-cited-2026.txt` fallback that lists the 187 expected cvar names -- would let the quality grid run a "every expected name present" check even without a runtime dump.

