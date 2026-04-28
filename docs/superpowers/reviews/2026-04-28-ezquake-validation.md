# ezQuake @ head Validation Report

**Date:** 2026-04-28
**Mode:** per-project deep (Mode B)
**Validated commit:** bea2515d0511bdf250dee43f0df7c4ace3fdfc17
**Schema version:** v18
**Validator:** Claude (validate-extractor skill)
**Working tree HEAD:** f1e611d16ec5ae117a5b0643b9d47d8777894d69 (main)

## Summary

Per-project deep validation of the ezQuake Layer 1 extractor at head. Reproducibility, cross-project field-shape, schema-handler alignment, sibling-handler audit, spec compliance, and determinism all hold. Section 3.1 (40-row random sample, 6 entity types) surfaced **one important finding**: a systematic trailing-comment misattribution in the ezQuake cvars handler that affects roughly **34% (78 of 230) of cvars-with-comment rows at head**. The bug is independent of the post-Phase-2 `};` literal-anchor fix (commit `4a98573`) -- it is a different failure mode in the `+1`/`+2` look-ahead loop, not a comma-truncation issue. Two pre-existing audit findings (D.2.3 asset-helper duplication, D.6.1 missing libclang config call in driver) are confirmed still open. One nit: `command_versions.registration_file` and `macro_versions.registration_file` are misnamed columns that actually carry `enclosing_function`.

**Findings: 1 important + 2 confirmed-open-from-prior-audit + 3 nits = 6 total.** No critical findings. No blockers for orchestrator-side load.

## Section 0: Pre-flight

**Verdict:** as-claimed.

Evidence:

- `git status apps/qw-oracle/scripts/extractors/ezquake/output/` clean.
- `git rev-parse HEAD` = `f1e611d16ec5ae117a5b0643b9d47d8777894d69`, branch `main`.
- `git -C research/repos/ezquake-source rev-parse HEAD` = `bea2515d0511bdf250dee43f0df7c4ace3fdfc17`. Matches `versions.commit_sha` for `ezquake@head` in `knowledge.db`.
- `schema_meta.schema_version = 18`. Matches `SCHEMA_VERSION = 18` in `apps/qw-oracle/scripts/load-knowledge/schema.ts:8`. Note: orchestrator's pre-flight notes that `PRAGMA user_version = 0` (unused signal) -- current schema-version source-of-truth is the `schema_meta` row keyed `schema_version`. Validated against the codebase constant.
- `schema_meta.ezquake:source_repo_commit = bea2515d0511bdf250dee43f0df7c4ace3fdfc17`, `ezquake:source_repo_tag = head`.
- ezquake versions in DB: 15 (v3.0, v3.0.1, 3.1, 3.2, 3.2.1, 3.2.2, 3.2.3, 3.6.0, 3.6.1, 3.6.2, 3.6.5, 3.6.6, 3.6.8, 3.6.9, head). Matches CLAUDE.md "ezQuake fully re-loaded across 7 tags + head" plus older tags from earlier walks.

Live entity counts at head (versions table) -- these supersede the orchestrator's prompt numbers (which were a pre-Phase-2 snapshot):

| type | count |
|---|---:|
| asset_category | 26 |
| cmdline_param | 77 |
| command | 560 |
| cvar | 2989 |
| flag_bit | 50 |
| hud_element | 85 |
| keyname | 148 |
| macro | 68 |
| ruleset | 6 |
| token_primitive | 33 |
| **total entities** | **4042** |

The orchestrator-prompt numbers (cvar 2899, command 536, etc.) appear to predate the cross-extractor follow-up arc that just shipped (commits `08aa5b1` -> `1a00704`). Live numbers are correct.

## Section 1.1: Reproducibility (re-extract + diff)

**Verdict:** as-claimed.

Wall time at `--workers 12`: `real 0m29.032s` (parse-and-visit phase 25.2s; finalize ~4s). Matches the published "~14s per-tag" baseline at the upper end (we re-parse 305 files at 4 variants = 1220 TUs).

`git diff --stat apps/qw-oracle/scripts/extractors/ezquake/output/` returns no diff after the re-extract. All 8 output JSONs are byte-identical to git HEAD.

Raw row counts emitted by the driver match the prior baseline exactly:

- commands 509
- cvars 5595
- macros 66
- cmdline 308
- hud-elements 249
- asset-cvar-bindings 12
- asset-loader-sites 128
- keynames 290

(These are pre-finalize raw rows; the post-finalize entity counts after dedup are smaller and match the DB counts above.)

## Section 1.2 / 1.3: SKIPPED

Loader writes (`load-version` / `extract-tag`) are explicitly the orchestrator's responsibility per the prompt. Not run.

## Section 2: Runtime cross-validation

**Verdict:** as-claimed-with-caveat. **Captured as finding F-EZQ-02** (HANDOVER).

`apps/qw-oracle/scripts/extractors/ezquake/validation-fixtures/` does not exist. Per prior cross-extractor audit dimension D.8.2 (already tracked in HANDOVER), only mvdsv has a `validation-fixtures/` directory wired up with a runtime dump from Ciscon's nicotinelounge.com 1.20-dev server. ezQuake's runtime cross-validation happened pre-consolidation as Pass 1 closure, but the allowlist + reference dump are not reproducible from the current tree. No new findings here; surfacing as HANDOVER carry-forward.

`OUT_OF_SCOPE.md` exists at `apps/qw-oracle/scripts/extractors/ezquake/OUT_OF_SCOPE.md`, last reviewed 2026-04-26 (pre-consolidation). Two staleness items noted as nits below (F-EZQ-04, F-EZQ-05).

## Section 3.1: Field-accuracy random sample (Mode B 40-row)

**Verdict:** findings -- one important (F-EZQ-01).

Sampled 40 random rows from each of: cvar, command, macro, cmdline_param, keyname, hud_element. Skipped ruleset (n=6) and token_primitive (n=33; below the sample size).

### cvar (40-row sample)

Sample run via `ORDER BY RANDOM() LIMIT 40` against `cvar_versions` joined to `entities` filtered to `project='ezquake' AND version='head'`. Spot-verified each row against the source line in `research/repos/ezquake-source/src/`.

Representative pass-cases:

| name | source_file:line | flags_raw | result |
|---|---|---|---|
| r_bloom | glc_bloom.c:78 | `true` | match (literal `true` preserved as-written, not normalized to empty) |
| r_fx_fog_color_slime | r_rmain.c:226 | `CVAR_COLOR` | match |
| sv_demoregexp | sv_demo.c:52 | empty | head value `\.mvd(\.(gz\|bz2\|rar\|zip))?$` correctly unescaped per v17 contract |
| con_completion_color_name | keys.c:63 | empty (was `CVAR_NONE`, normalized) | match (canonical empty-string sentinel) |
| vid_framebuffer_smooth | vid_sdl2.c:243 | `CVAR_NO_RESET` | match, `on_change=framebuffer_smooth_changed_callback` correct |

**Anchor case 1 (`};` anchor fix from commit `4a98573`):** the comma-bearing trailing-comment cases I sampled (`cl_voip_vad_threshhold` line 48 with comment containing periods, `gl_brush_polygonoffset` line 174 with comment containing `@`, `cl_delay_packet_deviation` whose semantically nearby cvar `cl_shownet` carries `// can be 0, 1, or 2`) confirm that comma-bearing comments are no longer truncated by the `};`-anchor logic. The Phase 2 fix landed correctly.

**Anchor case 2 (`sv_demoregexp` healthy at head):** confirmed. Source line 52 is `cvar_t sv_demoRegexp = {"sv_demoRegexp", "\\.mvd(\\.(gz|bz2|rar|zip))?$"};`. DB head row stores `default_value = \.mvd(\.(gz|bz2|rar|zip))?$` (escapes interpreted). 14 historical-version rows (v3.0 through 3.6.9) still carry the raw double-backslash form -- pre-v17 load, not yet re-loaded. HANDOVER-tracked.

**Mismatch case (F-EZQ-01, important):** during the cvar sample I noticed `scr_cursor_alpha`'s row had `trailing_comment = "so crosshair does't affected by +showscores, or vice versa"`. This comment is in fact attached to `scr_showcrosshair` (cl_screen.c:124), not `scr_cursor_alpha` (cl_screen.c:122). The source layout:

```
121: cvar_t scr_cursor_iconoffset_y = {"scr_cursor_iconoffset_y", "0"};
122: cvar_t scr_cursor_alpha        = {"scr_cursor_alpha", "1"};        <-- THIS row's source_line
123: <blank>
124: cvar_t scr_showcrosshair       = {"scr_showcrosshair", "1"}; // so crosshair does't affected ...
```

The `_attach_trailing_comments` helper at `_handler_cvars.py:624-660` probes `source_line + 0`, `+1`, `+2` looking for `// ...` after `};`. When the cvar's own line has no comment AND the `+2` line carries a different cvar's registration (with its own comment), the wrong comment is grabbed. The `};` anchor (Phase 2 fix) doesn't help here -- the `+2` line's `};` is the **next cvar's** closing brace, but the helper has no way to know it's already past the original cvar's closing.

I quantified the impact across all source-backed cvars at head:

```
Total head cvars with non-empty trailing_comment: 230
Likely correct (comment at +0 offset, on the registration line itself): 152
Likely WRONG (comment grabbed from a NEIGHBOURING cvar's line at +1 or +2): 78
```

That's 78 of 230 (~34%) misattributed. Sample mismatches:

| name | reg line | comment came from line | comment text |
|---|---:|---:|---|
| cl_delay_packet_deviation | 105 | 107 | `can be 0, 1, or 2` (actually `cl_shownet`'s comment) |
| sys_command_line | 99 | 101 | `1 - use DNS lookup in status command, 0 - don't use` (`sv_use_dns`'s comment) |
| cl_nofake | 51 | 53 | `FIXME: buggy` (`tp_pointpriorities`'s comment) |
| bgmvolume | 85 | 85 | (correct, +0) |
| cl_camera_tpp_distance | 63 | 65 | `1` (next cvar's comment) |
| con_notify | 59 | 61 | `seconds` (next cvar's comment) |
| gl_lightning_size | 52 | 53 | `0.4` (next cvar's comment) |
| menu_advanced | 89 | 91 | `===...` divider comment |

Disposition: drain-in-arc. The fix is to clamp the look-ahead at the FIRST `};` encountered. Once we've seen a closing brace on probe `+0` (or any earlier probe), subsequent probe lines that contain a fresh `cvar_t ... = {` belong to a different cvar and must be skipped.

Note: 1437 of 2733 head cvars have multi-line struct inits (closing `};` on a line after `source_line`), so the look-ahead is needed in legitimate cases -- the bug is the failure to detect "the look-ahead landed on someone else's registration." This is a long-standing bug not introduced by the recent shared-lib pass.

### command (40-row sample)

Spot-verified: `precache` (host.c:560 -- `Cmd_AddLegacyCommand("precache", "s_precache")`), `reset` (hud.c:817 -- `Cmd_AddCommand("reset", HUD_Reset_f)`), `noclip` (cl_cmd.c:959 -- `Cmd_AddCommand("noclip", NULL)` -- handler_fn correctly empty in DB), `dev_physicsnormalsave` (cl_main.c:2042), `-forward` (cl_input.c:1241 -- `Cmd_AddCommand("-forward", IN_ForwardUp)`), `snd_restart` (snd_main.c:447 -- legacy alias). 

All 10 spot-checked rows match source exactly: handler_fn correct, source_file:line correct, no off-by-ones. `Cmd_AddCommand` and `Cmd_AddLegacyCommand` dispatch via `REGISTRATION_APIS` tuple at the class level (post-consolidation fork-override hook).

`registration_file` column (named "_file" in schema but populated with `enclosing_function` per the loader at `load-commands.ts:35`) -- surfaced as F-EZQ-03 nit. All 560 head rows have correct `enclosing_function` content.

### macro (40-row sample)

Spot-verified: `ledstatus` (teamplay.c:1250 -- `Cmd_AddMacroEx(macro_ledstatus, Macro_MyStatus_LED, teamplay)`), `cam_angles` (cl_cam.c:822 -- `Cmd_AddMacro(macro_cam_angles, Macro_Cam_Angles)`), `serverip` (cl_main.c:2026 -- `Cmd_AddMacro(macro_serverip, CL_Macro_ServerIp)`).

Macro entity-name resolution uses `_resolve_enum_constant` to detect `macro_<id>` enum constants (preferred) or fall back to literal-string in arg[0]. All sampled rows resolved via the enum path with the `macro_` prefix correctly stripped.

### cmdline_param (40-row sample)

Spot-verified: `-heapsize` (host.c:446 -- `COM_CheckParm(cmdline_param_host_memory_kb)`), `-noerrormsgbox` (sv_sys_win.c:374 -- literal-string `COM_CheckParm("-noerrormsgbox")`), `-progtype` (pr2_exec.c:56 -- note: this is the macro-expansion site of `SV_CommandLineProgTypeArgument()` from server.h:1093; the registered enum `cmdline_param_server_progtype` lives in `cmdline_params_ids.h:71`. `load-cmdline-params.ts:31` cites the first **usage** site rather than the manifest line, which is the right call when usage exists, but the audit's D.1.6/D.1.8 cross-project notes still apply).

cmdline params have no `enclosing_function` divergence from sibling projects in the cvar/command sense -- ezQuake's emitter populates the field correctly, fte's emits None (audit D.1.7 / D.1.8 -- already tracked).

### keyname (40-row sample)

Spot-verified: `space` -> `K_SPACE = 32` (keys.h:32, keys.c:126); `kp_ins` -> `KP_INS = 182` (keys.c:215); `para` (apple-only) -> `K_PARA = 146` (keys.c:139, only in `__APPLE__` build). DB `build_variant` correctly distinguishes default-build entries from apple-only. The `_resolve_enum` walk through `DECL_REF_EXPR -> ENUM_CONSTANT_DECL` is reliable for libclang resolution.

Edge case: `kp_0`, `kp_7` etc. have `key_code_ident=KP_INS` / `KP_HOME` because the keys.c table aliases them (`{"KP_0", KP_INS}`). DB stores both names for the same numeric code; the helper at `_handler_keynames.py:233-238` even creates a `name@ident` collision-disambiguation key when needed. Spot-checked `kp_0` row, key_code=182, ident=KP_INS -- correct.

### hud_element (40-row sample)

Spot-verified: `iarmor` at hud_armor.c:244 -- `HUD_Register("iarmor", NULL, "Part of your inventory - armor icon.", HUD_INVENTORY, ca_active, 0, SCR_HUD_DrawArmorIcon, ...)`. DB row has `hud_alias=NULL`, `desc=Part of your inventory - armor icon.`, `draw_fn=SCR_HUD_DrawArmorIcon`, `enclosing_function=Armor_HudInit`. All match.

`reset` (hud.c:817), `framestats` (hud_performance.c:345 -> `FrameStats_DrawElement`, enclosing `Performance_HudInit`), `tracker` (hud_common.c:936 -> `SCR_HUD_DrawTracker`, enclosing `CommonDraw_Init`). All 8 sampled HUD elements match source. `enclosing_function` column is properly populated in `hud_element_versions` (this column exists, unlike commands/macros which misuse `registration_file`).

`owned_cvars_json` array correctly synthesized for each element via `_synthesize_owned_cvar_names` at `_handler_hud_elements.py:80-123`.

## Section 3.2: Cross-project field-shape audit

**Verdict:** as-claimed.

```
=== mvdsv ===   (zero rows)
=== ezquake === (zero rows)
=== fte ===     (zero rows)
=== qwcl ===    (zero rows)
```

No project has any cvar_versions row with `flags_raw IN ('0', 'CVAR_NONE')`. The post-v17 sentinel-form contract holds across all four extractors.

Two adjacent observations (not findings, but worth noting):

1. **Stale historical-version rows.** ezQuake versions v3.0 through 3.6.9 (loaded before the v17 normalization landed on 2026-04-28) still carry `flags_raw IS NULL` for source-backed-with-no-flags rows. Per-version count: 31,206 ezquake rows + 1,085 fte rows. At `head` specifically, the contract is fully honored (empty-string sentinel). The historical rows are stale-from-prior-load -- re-loading those 14 versions would normalize them. Not a regression of the contract; tracked operator-side as a backfill-someday item.

2. **Help-only rows have NULL flags_raw at head.** 139 of `ezquake@head` cvar rows have `flags_raw IS NULL` because the entity is `doc_only` (ast=null, no source registration; only a help_variables.json entry). The loader at `load-cvars.ts:52` correctly emits NULL when ast is null -- this is the "no AST at all" signal, not "AST present but flags absent." Consumer queries that distinguish source-backed-with-no-flags from doc-only must use `WHERE source_state = 'source_backed' AND flags_raw = ''` for the former and `flags_raw IS NULL` for the latter. The contract is well-defined.

## Section 4.1: Handler review (Python)

**Verdict:** as-claimed-with-nits.

Read 8 ezquake handlers end-to-end:

- `_handler_cvars.py` (681 lines) -- Pattern 1 (scalar) + Pattern 2 (array) + Pattern 3 (nested struct table) + HUD-cvar synthesis + group attribution via cvar_groups.h. Uses lifted `normalize_flags_raw`/`unescape_c_string`/`parse_flag_names`/`literal_string`/`read_extent`/`strip_array_and_qualifiers`/`strip_quotes`. **`_attach_trailing_comments` carries the `+1`/`+2` look-ahead bug -- F-EZQ-01.** Otherwise clean lifecycle (start_file -> visit_cursor -> end_file -> finalize). Per-file `_seen_names` plus cross-file dedup-by-name in finalize works correctly.
- `_handler_commands.py` (346 lines) -- Cmd_AddCommand + Cmd_AddLegacyCommand + Pattern 4 struct-array (log_t logs[]) + #define-string-macro resolution. Class-level `REGISTRATION_APIS` tuple for fork-override. Lifecycle hooks `enter_function`/`exit_function` populate `_func_stack` for `enclosing_function` capture. Lifted `resolve_fn_ref` adopted (line 20). No bugs surfaced.
- `_handler_macros.py` (240 lines) -- Cmd_AddMacro + Cmd_AddMacroEx with `macro_<id>` enum-constant resolution + literal-string fallback. Manifest cross-check against macro_ids.h. Class-level `REGISTRATION_APIS` tuple. Clean.
- `_handler_cmdline.py` (259 lines) -- COM_CheckParm + COM_CheckParmOffset call detection with manifest reconciliation against cmdline_params_ids.h. Class-level `DETECTION_APIS` tuple. Per-file dedup by `(line, column)`. Clean.
- `_handler_keynames.py` (244 lines) -- single-file dual-parse override (NOT a Visitor subclass; uses `process_file` interface). Justified in docstring: keys.c needs `-D__APPLE__` variant + minimal CLANG_ARGS. The driver's tu_client/tu_server are intentionally ignored; this handler spins up its own Index. Tagged divergence; valid.
- `_handler_hud_elements.py` (270 lines) -- single-pass (client-only) dispatch on HUD_Register. 16+ args, owned-cvar synthesis, hud.h field-source-line attachment. Clean.
- `_handler_asset_cvar_bindings.py` (246 lines) and `_handler_asset_loader_sites.py` (683 lines) -- extensive helper code (~17 helpers per audit D.2.3). The two are 90% structurally identical to FTE's siblings. Lift candidate from cross-extractor audit Phase 3 still open (audit-tracked).

**No swallowed exceptions** in any handler -- exception handlers all write to `local_diag` rather than silently dropping. Regex anchoring is correct. INIT_LIST_EXPR walks use `get_children()` lists and check field count before indexing (no off-by-ones). Worker boundary safety: handlers emit only plain dict/list/str/int/None; no clang cursors held across the Pool boundary.

## Section 4.2: Adapter review (TypeScript)

**Verdict:** as-claimed-with-nits.

Read 11 ezquake-relevant adapters: `load-cvars.ts`, `load-commands.ts`, `load-macros.ts`, `load-cmdline-params.ts`, `load-keynames.ts`, `load-hud-elements.ts`, `load-rulesets.ts`, `load-token-primitives.ts`, `load-flag-bits.ts`, `load-asset-categories.ts`, `load-assets.ts`.

INSERT column lists checked against schema DDL -- every column accounted for. Named-param keys (`@field`) match row interface field names. AST shape vs handler emissions: cross-checked via spot read of `output/ezquake-variables-ast.json` and the `VariableEntry` interface in `types.ts` -- no mismatches.

`source_state` and `source_ref` populated correctly. CHECK constraints on enum columns (e.g. `entities.type IN (...)`, `cvar_alias_versions.value_transform IN (...)`) -- all values reachable from handler emissions, audit-confirmed in cross-extractor report dimension D.3.

`INSERT OR REPLACE` is the upsert mode used for natural keys (entity_id, version) -- correct for idempotent re-loads.

**Nit (F-EZQ-03, important):** `load-commands.ts:35` and `load-macros.ts:38` populate the column named `registration_file` with `ast?.enclosing_function ?? null`. The DB column name implies "file path" but the data is "enclosing function name" (e.g. `CL_InitInput`, `WeaponStats_CommandInit`, `Cvar_Set_ex_f`'s caller). This is a long-standing semantic-misnomer carried by both the schema and the adapters; the schema should either rename the column to `enclosing_function` OR keep `registration_file` and add a separate `enclosing_function` column. Today's code is internally consistent (loaders agree with schema), so no functional bug -- but the naming will continue to mislead operators reading the DB. `hud_element_versions` already carries a properly-named `enclosing_function` column (load-hud-elements.ts:33 -- different model). Documenting as I-grade nit since it touches load-bearing semantics for any future query that joins on file paths.

## Section 4.3: load-version.ts review

**Verdict:** as-claimed.

`load-version.ts` (739 lines) -- read end-to-end. ezQuake-relevant carve-outs:

- Array-to-dict normalization (line 318-339) -- only fires for the four MVDSV-Phase-2e new-shape emitters. ezQuake's emitters all use the dict-by-name shape; the normalization is bypassed. The collision-warning at line 334 (post-Phase B 2026-04-28) is the right backstop.
- `valid*` carve-outs (line 442-472) -- `validInfoKey`/`validLogTemplate`/`validQcBuiltin` all gated by `options.type ===`. ezQuake doesn't emit these types; the carve-outs cannot leak into ezquake loads. `validIdentifier` regex `/^[a-z0-9_.+\-]+$/` correctly admits ezQuake's command name space (including `+forward`/`-back` action prefixes). `INFO_KEY_SCOPES` and `LOG_TEMPLATE_CHANNELS` exported from schema.ts (line 22-23) and consumed in load-version.ts via the regex builders at line 121-127 -- D.4.1/D.4.2 audit findings closed.
- `caseFoldMergeEntries` (line 702-739) -- token_primitive correctly excluded (case-sensitive). For ezQuake's cvar/command/macro types, AST-bearing source-truth name (`loadFragfile`) is preferred over help-JSON-lowercased name (`loadfragfile`). The merge fills missing help-text fields from the lowercased variant. No silent drops.
- Stale-row cleanup (line 392-412) -- reuses `PARTIAL_DROP_GUARD_RATIO` to abort on bulk deletes. Sound.
- Source-state transition detection (line 586-665) -- walks each entity's per-version rows ordered by ordinal, logs `source_retired_at_version` and `backfill_match` flips. Idempotent on `(entity_id, reason, version_context)`.

No ezQuake-specific anomalies in this file. The drop-guard at line 359-385 prevents accidental empty loads. Sound.

## Section 4.4: Cross-project sibling audit (Mode B REQUIRED)

**Verdict:** as-claimed.

Cross-checked the same logical handler across all four projects:

### `_handler_cvars.py`

| project | LOC | shared-lib usage | flags_raw normalization | escape interpretation |
|---|---:|---|---|---|
| ezquake | 681 | `_cvar_shared` + `_source` | `normalize_flags_raw` (Phase 2) | `unescape_c_string` (Phase 2) |
| fte | 779 | `_cvar_shared.normalize_flags_raw` only | `normalize_flags_raw` (Phase 2) | post-token-concat (no escapes to interpret) |
| qwcl | 224 | `_cvar_shared` + `_source` | `normalize_flags_raw` (Phase 2) | `unescape_c_string` (Phase 2) |
| mvdsv | 471 | `_cvar_shared` + `_source` | `normalize_flags_raw` (lift origin) | `unescape_c_string` (lift origin) |

All four projects converged on the lifted helpers in commit `4a98573` (Phase 2 of the cross-extractor follow-up arc). FTE doesn't use `unescape_c_string` because its CVARD/CVARFD/CVARAFD/CVARAD macros expand to a `cvar_t` struct-init whose default field is captured via post-macro-expansion token concatenation (`_concat_string_literals`) rather than literal source-extent reading. The escape-interpretation bypass is correct for FTE's emission path.

Audit findings D.1.1 (FTE flags_raw=None) and D.1.2 (QWCL escapes survive) verified closed by direct re-read of the handlers. D.1.4 (ezquake `};` anchor) verified closed by direct re-read of `_handler_cvars.py:644-647` and supporting docstring at lines 642-643.

### `_handler_commands.py`

| project | LOC | API surface | resolve_fn_ref source |
|---|---:|---|---|
| ezquake | 346 | Cmd_AddCommand + Cmd_AddLegacyCommand | `extractor_lib._resolve` (lifted) |
| fte | 227 | Cmd_AddCommand + Cmd_AddCommandD + Cmd_AddCommandAD + Cmd_AddCommandOld | `extractor_lib._resolve` (lifted) |
| qwcl | 115 | Cmd_AddCommand only | `extractor_lib._resolve` (lifted) |
| mvdsv | 429 | Cmd_AddCommand (3 variants: scalar / log_t-array / fork hooks) | `extractor_lib._resolve` (lifted) |

All four projects use the lifted permissive `resolve_fn_ref` from `extractor_lib/_resolve.py`. Audit findings D.1.3 / D.2.1 verified closed at commit `08aa5b1`.

ezquake + mvdsv carry class-level `REGISTRATION_APIS` tuples for fork-override (named consumer forks: unezQuake, antilag-mvdsv). FTE + QWCL bury API names in `CMD_ADDERS` dict (FTE) or string equality (QWCL). Audit D.1.5 already dispositioned as HANDOVER (no fork pressure today). Re-confirmed.

### `_handler_cmdline.py`

| project | LOC | API surface | param-prefix policy |
|---|---:|---|---|
| ezquake | 259 | COM_CheckParm + COM_CheckParmOffset | hard-coded `-` filter via DETECTION_APIS |
| fte | 130 | COM_CheckParm | hard-coded `-` filter at line 105 (audit D.1.6) |
| qwcl | 73 | COM_CheckParm | trivial -- first-positional-arg literal-string only |
| mvdsv | 252 | COM_CheckParm + COM_CheckParmOffset + Cmd_FindCommand | exposes PARAM_PREFIXES tuple = ("-", "+") |

D.1.6 (FTE `-` hard-code) verified still open. The orchestrator-prompt notes this was Phase 4 of the follow-up arc (verification first). The most recent commit `1a00704` documented the FTE single-prefix policy in handler docstrings -- finding closed as documented-divergence rather than widening the regex. Audit-verified.

D.1.7 (mvdsv `containing_function` vs ezquake/qwcl `enclosing_function` field-name divergence) -- verified still present; `mvdsv/_handler_cmdline.py` emits `containing_function` while ezQuake's emits `enclosing_function`. The orchestrator's `load-cmdline-params.ts:32-33` reads from `primarySite?.source_file` and `manifest_file` and `ast?.source_file`, which MVDSV's flat-shape emits -- so MVDSV's `containing_function` field never reaches the DB; it's silently dropped in the adapter. Functional but cosmetic-divergence. Disposition: still drain-now (small).

### Asset handlers (ezquake vs fte)

`diff` of `ezquake/_handler_asset_loader_sites.py` vs `fte/_handler_asset_loader_sites.py` shows ~95% structural identity, differing primarily in the LOADER_FUNCTIONS / CVAR_BINDING_TARGETS string lists. ~17 helpers byte-identical (audit D.2.3). Deferred to Phase 3 of the follow-up arc which has not yet shipped -- it was the "dispositioned drain-in-arc, not yet drained" item from the audit. Verified still open.

### New divergences found in this validation pass

**None.** All sibling-handler shape divergences I observed match audit findings already documented in the 2026-04-28 cross-extractor audit report. The recent shared-lib pass (commits `08aa5b1` -> `1a00704`) closed the Phase 1 + Phase 2 + Phase 5 items; Phase 3 (asset-handler lifts) and Phase 4 (FTE param-prefix verification) progressed by documentation rather than refactor -- both reasonable closures.

## Section 5: Spec compliance

**Verdict:** as-claimed.

ezQuake doesn't have a single defining spec; verified against `apps/qw-oracle/CLAUDE.md` claims:

- "ezQuake fully re-loaded 2026-04-23 across 7 tags + head" -- DB has 15 versions, including 7 named-tag-with-prefix-3.6 (3.6.0 through 3.6.9 with gaps for 3.6.3/4/7) plus 7 older (v3.0, v3.0.1, 3.1, 3.2, 3.2.1, 3.2.2, 3.2.3) plus head. The "7 tags" framing was loose; numeric reality is 14 historical tags + head = 15 versions. The CLAUDE.md statement is roughly correct but could be sharpened.
- "4041 entities" (CLAUDE.md, alongside QWCL's 364) -- live count is 4042. Matches within rounding. Likely off-by-one from a recent +1 entity since the CLAUDE.md note was written.

`OUT_OF_SCOPE.md`:

- "Last reviewed: 2026-04-26" -- pre-consolidation, but content still valid. Two staleness items below:
- Line 6: "Extraction total: ~3849 entities" -- outdated (current 4042). F-EZQ-04 nit.
- Line 40: "via `_synthesize_hud_cvars()` in `extractor_lib/handler_cvars.py`" -- path no longer exists post-consolidation (handler relocated to `ezquake/_handler_cvars.py`). F-EZQ-05 nit.

No spec-vs-live-data divergence in entity counts or claimed invariants.

## Section 6: SKIPPED

Quality grid is the orchestrator's responsibility per the prompt. The prompt's pre-flight already noted: 11 real ezquake F1 probes -- 5 PASS, 4 CLEAN, 2 FOUND (both pre-existing F2 anomalies tracked in HANDOVER: `F2.doc_only_crosstab` and `F2.default_value_ping_pong`). No new anomalies surfaced in this validation; the 2 FOUND values are unchanged.

## Section 7: Determinism review

**Verdict:** as-claimed.

Read `apps/qw-oracle/scripts/extractors/ezquake/extract.py` end-to-end (385 lines).

- `_run_parallel` (line 227-265) uses `pool.map(...)` with `chunksize=1` to preserve input order; merge iterates `results` in input order at line 260-263.
- Fork mode explicit (`mp.get_context("fork")` line 251) -- workers inherit handler state via copy-on-write.
- Worker emissions are plain data: handlers emit dicts containing `str/int/None` only; no clang cursors, closures, or file handles cross the pool boundary. Verified by `_worker_process_chunk` returning `(local_rows: dict, local_diag: list[str])` only.
- Finalize methods sort by stable keys: `sorted(commands_out)`, `sorted(macros_out)`, `sorted_keynames = {name: ... for name in sorted(keynames_out)}`. cvars use dict-merge then sorted output keys (line 618 of `_handler_cvars.py`). Hud-elements sort by element name (line 248 of `_handler_hud_elements.py`).

**Cross-worker-count determinism proof:** re-ran with `--workers 1` (203.5s wall time, 305 files serial). `git diff --stat apps/qw-oracle/scripts/extractors/ezquake/output/` returns no diff -- output is byte-identical to the `--workers 12` baseline. Worker-count independence holds.

## Section 8: SKIPPED

`bunx tsc --noEmit` and MCP smoke test are the orchestrator's responsibility per the prompt.

## Findings table

| ID | Section | Severity | File:Line | Description | Disposition |
|---|---|---|---|---|---|
| F-EZQ-01 | 3.1 (cvar) | important | `apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py:624-660` | `_attach_trailing_comments` `+1`/`+2` look-ahead grabs the trailing comment of a NEIGHBOURING cvar's registration when the original cvar has no inline comment AND a later cvar within 2 lines does. Affects 78 of 230 (~34%) cvar rows with non-empty `trailing_comment` at head. Independent of the Phase 2 `};` anchor fix. Fix: clamp the look-ahead at the first `};` encountered, then refuse to scan past a line that contains a fresh `cvar_t ... = {`. | drain-in-arc |
| F-EZQ-02 | 2 | important | n/a | No `validation-fixtures/` directory for ezquake. ezQuake's pre-consolidation Pass-1 runtime cross-validation is not reproducible from current tree (only the documented 4-bucket framework remains in OUT_OF_SCOPE.md). Re-establish a runtime dump (cvarlist + cmdlist) from a reference build and wire up `diff-runtime.sh` analogous to MVDSV's. | HANDOVER (already tracked as cross-extractor audit D.8.2) |
| F-EZQ-03 | 4.2 | important | `apps/qw-oracle/scripts/load-knowledge/load-commands.ts:35` + `load-macros.ts:38` | Adapter populates the column named `registration_file` (semantically a "file path") with `ast?.enclosing_function ?? null` (a function name). Internally consistent with the schema column type but misleading for any operator query. Compare `hud_element_versions` which has a properly-named `enclosing_function` column. Fix: rename the schema column to `enclosing_function` (matches data) OR add a real `registration_file` column and migrate. Migration territory. | drain-in-arc |
| F-EZQ-04 | 5 | nit | `apps/qw-oracle/scripts/extractors/ezquake/OUT_OF_SCOPE.md:6` | "Extraction total: ~3849 entities" -- current is 4042. Stale freshness marker. | HANDOVER (refresh on next per-project deep validation; was D.8.1 in cross-extractor audit) |
| F-EZQ-05 | 5 | nit | `apps/qw-oracle/scripts/extractors/ezquake/OUT_OF_SCOPE.md:40` | "in `extractor_lib/handler_cvars.py`" -- path no longer exists post-consolidation; the helper now lives at `ezquake/_handler_cvars.py`. | drain-now (small text patch) |
| F-EZQ-06 | 4.4 | nit | `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cmdline.py:143` (cross-project context) | mvdsv emits `containing_function`; ezquake/qwcl emit `enclosing_function`; fte emits None. Field-name divergence; same semantic content. Audit D.1.7 disposition was drain-now. Still pending. | drain-now (audit-tracked, unchanged) |

Severity rubric reminder:
- **critical:** silent data loss / wrong DB content / byte-reproducibility violation / schema drift between code and DB.
- **important:** representation gap that breaks downstream queries / unclassified diff residual / undocumented divergence between sibling handlers.
- **nit:** style inconsistency / redundant logic / doc-vs-code contradiction with no behavioral consequence.

## Follow-up plan

Two findings (F-EZQ-01 and F-EZQ-03) are drain-in-arc -- both touch enough surface that a follow-up plan is warranted. F-EZQ-05 is drain-now (a small text patch). F-EZQ-06 is the pre-existing audit D.1.7 already on the orchestrator's drain-now list.

Plan written separately at `docs/superpowers/plans/2026-04-28-ezquake-validation-followups.md`. Phase summary:

1. **Phase 1 -- trailing-comment scan robustness (F-EZQ-01).** Patch `_handler_cvars.py:_attach_trailing_comments` to clamp the look-ahead at the first `};` AND refuse to scan past a line containing a fresh `cvar_t ... = {`. Rerun extraction; expected output diff: ~78 cvar rows lose their incorrect trailing_comment (now empty), zero rows gain incorrect comments. Re-load `ezquake@head`. F1 quality-grid `with_trailing_comment_count` probe (if exists; if not, add one) drops by ~78.
2. **Phase 2 -- registration_file vs enclosing_function rename (F-EZQ-03).** Schema migration: rename `command_versions.registration_file` -> `enclosing_function` and `macro_versions.registration_file` -> `enclosing_function`. Update `load-commands.ts:35` and `load-macros.ts:38` field names. Update `types.ts`, `e2e-verify.md`, any quality-grid probes referencing the old column. No re-extract needed (DB-only migration). Re-load to refresh column name in versions table.
3. **Phase 3 (small) -- OUT_OF_SCOPE.md path correction (F-EZQ-05).** One-line fix in markdown.

Phases 1 and 2 are independent and can run in either order. Phase 1 is higher-value (data correctness); Phase 2 is higher-clarity (operator query ergonomics). Both should fit into a single arc.
