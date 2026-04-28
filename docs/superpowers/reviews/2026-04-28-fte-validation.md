# FTE @ build-6698 Validation Report

**Date:** 2026-04-28
**Mode:** per-project deep (Mode B)
**Validated commit:** 3584377302cda4bd1b6950b126d147451895a1da
**Schema version:** v18
**Validator:** Claude (validate-extractor skill)
**Working tree:** main, HEAD f1e611d. apps/qw-oracle/ tree clean. Slipgate-app uncommitted changes orthogonal.

## Summary

Headline verdict: **as-claimed-with-caveats**. The FTE extractor is byte-stable across both `--workers 12` and `--workers 1` (47.4s vs 6m32.5s, byte-identical output), passes 30/30 spot-checked cvar / command / macro / cmdline_param samples against literal source, satisfies the post-v17 `flags_raw` sentinel-form contract (0 rows with `0` or `CVAR_NONE` literal), and the documented FTE single-prefix `COM_CheckParm` policy still holds (zero `+`-prefixed call sites in the engine source at build-6698). Quality grid 30 probes are PASS/CLEAN per orchestrator pre-flight. All entity counts match HANDOVER claims exactly: cvar=2482 (1397 engine + 1085 ezhud), command=556, macro=67, cmdline_param=108, asset_category=28, asset_extensions=61, asset_path_rules=13, asset_cvar_bindings=25, asset_loader_sites=717. The D.1.13 ezhud `SPEED_*` heuristic is still complete -- all 10 `SPEED_*` defines that participate in HUD_Register calls are covered by `DEFINE_CONSTANTS` and there are zero unresolved identifier-shaped defaults in the loaded ezhud cvars.

Two important findings surface: F-FTE-01 -- the FTE cvars handler does NOT use `extractor_lib._cvar_shared.unescape_c_string`, while ezquake / qwcl / mvdsv all do. FTE has a private token-walking `_concat_string_literals` (lines 100-115 of `_handler_cvars.py`) that strips outer quotes but does NOT interpret C escape sequences (`\\n`, `\\"`, `\\t`, `\\\\`). At the current build-6698 snapshot zero FTE cvar defaults contain escape sequences (verified via grep + DB scan) so the gap produces no observable wrong rows today, but it is a representation-shape contract divergence that will silently surface wrong data the moment FTE upstream adds an escape-bearing default. F-FTE-02 -- the cross-extractor audit's D.1.8 finding (FTE `_handler_commands.py` and `_handler_cmdline.py` lack `enter_function`/`exit_function` lifecycle hooks; `_handler_macros.py` similarly) still holds; this means `enclosing_function` / `registration_file` columns are NULL for all 556 FTE commands, all 67 macros, and all 108 cmdline_params. ezquake and qwcl populate these fields; mvdsv commands also lack them, so FTE is consistent with mvdsv but inconsistent with ezquake / qwcl. This is data-coverage breadth, not data correctness.

Three nits: F-FTE-03 (no `validation-fixtures/` directory at `apps/qw-oracle/scripts/extractors/fte/` -- known from cross-extractor audit D.8.2; runtime cvarlist diff was last run 2026-04-26 and is captured in `_out_of_scope_estimate` static block), F-FTE-04 (asset handlers' `monorepo_root = here.parent.parent.parent.parent.parent` 5-level path arithmetic is brittle to directory restructure), F-FTE-05 (regex `_RE_CVARGROUP_IDENT = re.compile(r"cvargroup_\\w+")` in `_handler_cvars.py:314` is unanchored; safe today because it is iterated over atomic token spellings, but a defensive `^...$` would prevent future misuse).

Counts: **0 critical, 2 important, 3 nits.**

---

## Section 0: Pre-flight

**Verdict:** as-claimed-with-caveat.

- Working directory: `/home/paradoks/projects/quakeworld` (monorepo root).
- Branch: `main`, HEAD `f1e611d`. apps/qw-oracle/ tree clean. Slipgate-app changes orthogonal (parallel arc).
- DB `versions` row at fte/build-6698: `commit_sha = 3584377302cda4bd1b6950b126d147451895a1da`. Matches `git -C research/repos/fteqw rev-parse HEAD`.
- Schema: `PRAGMA user_version` returns 0 (this DB carries its own `schema_meta` table); `schema_meta.schema_version=18` matches `SCHEMA_VERSION = 18` in `apps/qw-oracle/scripts/load-knowledge/schema.ts`.
- Output directory `apps/qw-oracle/scripts/extractors/fte/output/` clean against HEAD pre-test.

Caveat: the PRAGMA-vs-schema_meta dual-source is a pre-existing pattern (visible in QWCL's report too). Not an FTE-specific concern.

---

## Section 1.1: Reproducibility (extractor re-run + zero diff)

**Verdict:** as-claimed.

```
FTE AST extraction (parallel x 12)
  repo:     research/repos/fteqw
  source_root=engine: 337 files
  source_root=plugin:ezhud: 9 files
  source_root=plugin:ezscript: 1 files
  handlers: ['cvars', 'commands', 'macros', 'cmdline', 'ezhud',
             'ezscript', 'asset-loader-sites', 'asset-cvar-bindings']
  total:    347 file-tasks
  parallel: 12 workers, 25 chunks of ~14 files

Parse + visit phase: 43.2s
  [cvars]   1416 raw rows -> fte-variables-ast.json
  [commands] 569 raw rows -> fte-commands-ast.json
  [macros]    67 raw rows -> fte-macros-ast.json
  [cmdline]  163 raw rows -> fte-cmdline-params-ast.json
  [ezhud]   1085 raw rows -> fte-ezhud-cvars-ast.json
  [ezscript]  38 raw rows -> fte-aliases-ast.json
  [asset-loader-sites]  717 raw rows -> fte-asset-loader-sites-ast.json
  [asset-cvar-bindings]  77 raw rows -> fte-asset-cvar-bindings-ast.json

[merge] fte-variables-ast.json after ezhud merge: count=2482,
        engine=1397, plugin:ezhud=1085

Done. 347 file-tasks, 43.7s total
real 47.36s
```

`git diff --stat apps/qw-oracle/scripts/extractors/fte/output/` -- empty. Reproducibility byte-stable at `--workers 12`.

Wall time recorded: **43.2s parse+visit, 47.4s total** (12 workers over 347 file-tasks at 4 variants each = 1388 TU parses).

---

## Section 1.2 / 1.3 -- SKIP

Loader and idempotency runs are orchestrator-side. JSON outputs are byte-stable; orchestrator can `extract-tag --project fte --version build-6698` from this baseline.

---

## Section 2: Runtime cross-validation -- N/A (gap captured)

**Verdict:** as-claimed.

`apps/qw-oracle/scripts/extractors/fte/validation-fixtures/` does not exist. FTE has `tests/` (one Python test file `test_fte_asset_paths.py`) and `seeds/` (5 YAMLs + 1 TSV) but no runtime cvarlist / cmdlist dump for cross-validation. The Pass 1 runtime-validation diff was last run 2026-04-26 against an external dump and the resulting bucket counts are statically embedded in the `_out_of_scope_estimate` block of `_handler_cvars.py` finalize() (lines 455-461): bucket1 = 26, bucket2 = 27, bucket3 = 56, bucket4 = 0. `OUT_OF_SCOPE.md` carries the per-bucket bookkeeping.

Captured as F-FTE-03. This finding is already tracked under the cross-extractor audit's D.8.2 (HANDOVER); FTE is one of three projects that have not yet captured a permanent runtime-fixture path.

---

## Section 3.1: Field-accuracy audit (Mode B random sample, 40 rows per type)

**Verdict:** as-claimed.

40 cvar samples, 40 command samples, 40 macro samples, 40 cmdline_param samples drawn at random from the live DB. 30 of these 160 (a representative subset across edge cases -- escape candidates, ezhud variadic, single-flag, multi-flag, NULL handler, +- prefix, multi-source-root) were spot-checked against literal source by `Read` of the registration line. All 30/30 matched.

**Anchor case 1 (post-v17 normalization):**
- `flags_raw` sentinel-form contract: zero rows in `cvar_versions` JOIN `entities` WHERE project='fte' AND `flags_raw IN ('0', 'CVAR_NONE')`. Confirmed via Section 3.2 cross-project query.
- `default_value` C-escape interpretation: FTE handler does NOT route default extents through `unescape_c_string`. Verified via grep on `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py` -- imports only `normalize_flags_raw` from `_cvar_shared`. The private `_concat_string_literals` (lines 100-115) strips outer quotes via slicing `t[1:-1]` but performs no escape interpretation. At build-6698 zero FTE cvars carry escape-bearing defaults (verified via DB scan: zero rows where `default_value LIKE '%\\\\%'` or LIKE `'%\\n%'`), so the gap is latent. **F-FTE-01.**

**Anchor case 2 (D.1.13 ezhud heuristic):**
- Re-grep of `^#define [A-Z_][A-Z0-9_]*` under `research/repos/fteqw/plugins/ezhud/` produced 10 SPEED_* defines (GREEN/BROWN_RED/DARK_RED/BLUE/RED + STOPPED/NORMAL/FAST/FASTEST/INSANE). All 10 are present in `_handler_ezhud.py:54-65` `DEFINE_CONSTANTS`. SPEED_TAG_LENGTH / SPEED_OUTLINE_SPACING / SPEED_FILL_SPACING / SPEED_WHITE / SPEED_TEXT_ONLY / SPEED_TEXT_ALIGN_* are not used as HUD_Register defaults (they're internal layout constants), so they don't need handler-side mapping.
- DB query: zero FTE cvars with `default_value LIKE 'SPEED_%'` (no unresolved identifiers stored as-is). The token-resolver fallback at `_handler_ezhud.py:121` is therefore not currently exercised; if a new SPEED_ identifier appears in HUD_Register args without `DEFINE_CONSTANTS` coverage, it would be stored as the bare identifier name (the as-is fallback). No gap at build-6698.

**Sample spot-checks (representative):**

| name | DB value | source line | source content | match |
|---|---|---|---|---|
| tls_ignorecertificateerrors | `"0"` flags `CVAR_NOTFROMSERVER \| CVAR_NOSAVE \| CVAR_NOUNSAFEEXPAND \| CVAR_NOSET` | net_wins.c:112 | `CVARFD("tls_ignorecertificateerrors", "0", CVAR_NOTFROMSERVER\|CVAR_NOSAVE\|CVAR_NOUNSAFEEXPAND\|CVAR_NOSET, "...")` | OK |
| pr_imitatemvdsv | `"0"` flags `CVAR_MAPLATCH` | pr_cmds.c:73 | `CVARFD("pr_imitatemvdsv", "0", CVAR_MAPLATCH, "...")` | OK |
| allow_download_pakcontents | `"0"` flags `CVAR_WARNONCHANGE` | sv_main.c:90 | `CVARFD("allow_download_pakcontents", "0", CVAR_WARNONCHANGE, "...")` | OK |
| sv_spectalk | `"1"` flags empty | sv_user.c:66 | `CVAR("sv_spectalk", "1")` | OK (empty flags_raw) |
| sv_realiphostname_ipv6 | `""` flags empty | sv_user.c:138 | `CVARD("sv_realiphostname_ipv6", "", "...")` | OK (empty default) |
| pm_stepdown | `""` flags `CVAR_SERVERINFO` | sv_phys.c:82 | `CVARFD("pm_stepdown", "", CVAR_SERVERINFO, "...")` | OK |
| hud_suit_scale | `"1"` flags empty | hud_common.c:8231 | HUD_Register parent line; `"scale", "1"` at 8235 | OK (variadic-arg, parent line attribution) |
| hud_score_bar_format_small | `"&c69f%T&r:%t &cf10%E&r:%e $[%D$]"` | hud_common.c:8708 | HUD_Register parent line; arg at 8713 | OK |
| qws_homepage | `"^8https://^4fte^8.^4triptohell^8.^4info"` flags `CVAR_NOSET` | sv_main.c:5879 | `CVARF("qws_homepage", ENGINEWEBSITE, CVAR_NOSET)` | OK (libclang preprocessor expansion of ENGINEWEBSITE) |
| +strafe -> IN_StrafeDown | command | cl_input.c:3289 | `Cmd_AddCommand ("+strafe", IN_StrafeDown)` | OK |
| topten -> NULL | command | cl_main.c:6092 | `Cmd_AddCommand ("topten", NULL)` | OK (NULL handler -> empty handler_fn) |
| bestweapon -> Macro_BestWeapon | macro | zqtp.c:1337 | `Cmd_AddMacro("bestweapon", Macro_BestWeapon, true)` | OK |
| -sspeed | cmdline_param | snd_dma.c:2385 | `COM_CheckParm ("-sspeed")` | OK |
| -clusterslave | cmdline_param | sys_linux.c:1597 | `if (COM_CheckParm("-clusterslave"))` | OK |

Note on `qws_platform`: DB stores `"LinuxTargetConditionals.hiOSSimiOSMacAppleFreeBSDOpenBSDNetBSDBSDMorphOSAmigaOSMacOS XDosUnknown.sox32x64amd64"` -- this is libclang's view through ALL platform `#ifdef` branches (the macro `PLATFORM` / `ARCH_CPU_POSTFIX` is redefined dozens of times in headers). Not a bug, but a libclang preprocessor-expansion artefact.

Note on `enemycolor`, `tp_name_*`: many of these point to `zqtp.c:189`. That line is `TP_CVARS;` -- a single macro invocation expanding to multiple `cvar_t` declarations. libclang attributes all of them to line 189. This is a known macro-expansion limitation, not a handler bug.

---

## Section 3.2: Cross-project field-shape audit (flags_raw sentinel)

**Verdict:** as-claimed.

```
=== mvdsv ===   (zero rows)
=== ezquake === (zero rows)
=== fte ===     (zero rows)
=== qwcl ===    (zero rows)
```

The post-v17 sentinel-form contract holds across all four projects. Zero rows in any project carry `flags_raw IN ('0', 'CVAR_NONE')`. OK

---

## Section 4.1: Handler review (Python, end-to-end read)

**Verdict:** findings.

Handlers reviewed: `_handler_cvars.py` (590 lines), `_handler_commands.py` (227 lines), `_handler_macros.py` (230 lines), `_handler_cmdline.py` (152 lines), `_handler_ezhud.py` (410 lines), `_handler_ezscript.py` (295 lines), `_handler_asset_cvar_bindings.py` (222 lines), `_handler_asset_loader_sites.py` (663 lines).

**General observations:**
- Lifecycle hygiene: each handler resets per-file state in `start_file` and clears it again in `end_file`. cvars handler additionally clears group-tracking state in `end_file`. OK
- No swallowed exceptions: the only `except` blocks are at `start_file` setup-time (e.g., asset_cvar_bindings JSON load -- intentional, file may be missing on first run) and at relative-path conversion time (`Path.relative_to` raises `ValueError` for paths outside repo_root -- intentional fallback). OK
- Fork-mode worker boundary: rows are plain dict / list / str / int / None throughout. No clang cursors, file handles, or closures cross the worker boundary. OK (Confirmed by `--workers 1` vs `--workers 12` byte-stability in Section 7.)

**F-FTE-01 (important):** `_handler_cvars.py` does not import `unescape_c_string`. The handler imports only `normalize_flags_raw` from `extractor_lib._cvar_shared` (line 43). Default-value extraction goes through a private `_concat_string_literals` (lines 100-115) that strips outer quotes but performs no escape interpretation. ezquake / qwcl / mvdsv all use `unescape_c_string(strip_quotes(default_raw))`. At build-6698 zero FTE cvars carry escape-bearing defaults (DB scan returns empty), so the gap is latent. The architectural divergence is deeper than a missing import: FTE walks tokens (`cursor.get_tokens()` -> token spelling) while the other three projects read source bytes (`read_extent`). To converge, either (a) FTE switches to `read_extent` + `strip_quotes` + `unescape_c_string`, or (b) FTE's `_concat_string_literals` interprets escapes. Option (b) is the smaller delta -- inline the unescape pass into `parts.append(t[1:-1])`.

**F-FTE-02 (important):** `_handler_commands.py` (lines 86-150) and `_handler_cmdline.py` (lines 40-88) and `_handler_macros.py` (lines 102-156) lack `enter_function` and `exit_function` lifecycle hooks. As a result:
- commands: `ast_block.enclosing_function: None` (line 198) -- written into `command_versions.registration_file = NULL` for all 556 FTE commands.
- cmdline_param: line 127 hardcodes `"enclosing_function": None` in each `usage_sites` entry.
- macros: line 204 writes `"enclosing_function": None` in the AST block.

Cross-project comparison (grep `enter_function|exit_function` across all four extractor dirs):
- ezquake: commands YES, cmdline YES, macros YES, hud_elements YES, asset_cvar_bindings YES, asset_loader_sites YES.
- qwcl: commands YES, cmdline YES.
- mvdsv: cmdline YES, info_keys YES, log_templates YES. **commands NO** (mvdsv commands handler uses log_t struct-array recovery rather than CALL_EXPR walk; enclosing-function tracking would be expensive there).
- fte: asset_cvar_bindings YES, asset_loader_sites YES. **commands NO, cmdline NO, macros NO.**

So FTE matches mvdsv on commands (both lack enclosing-function tracking) but diverges from ezquake / qwcl. This is a data-coverage breadth gap, not data correctness; downstream consumers using `registration_file` for FTE entities see NULL where ezquake/qwcl provide the enclosing function name. The cross-extractor audit captured this as D.1.8 in HANDOVER; no convergence has shipped yet.

**Other observations (no findings):**
- D.1.13 ezhud heuristic: `DEFINE_CONSTANTS` in `_handler_ezhud.py:54-65` covers all 10 SPEED_* defines that participate in HUD_Register calls. Re-verified by re-grep of source defines + DB query of stored defaults (no unresolved identifiers). Covered.
- Single-prefix policy at line 64-66 of `_handler_cmdline.py` (rejects `+`-prefixed flags): grep confirms zero `COM_CheckParm("+...")` call sites in `research/repos/fteqw/engine/` at build-6698. Policy holds. Audit comment at line 61-64 documents the rationale.
- Macros handler `_RE_MACRO_D` regex at lines 48-53 uses `[^,]+` patterns to span the fn / teamplay_safe args. This will fail if a future Cmd_AddMacroD has an arg containing a literal comma (e.g. `Cmd_AddMacroD("x", get_handler(a, b), 1, "desc")`). Today no such call exists; the pattern handles current source correctly.
- ezhud handler line 144: `_is_ezhud` gate uses substring match on path (`/plugins/ezhud/`). On Windows path separators (`\\plugins\\ezhud\\`) the same gate is checked. Defensive; no false negatives.

**Regex anchoring (F-FTE-05, nit):** `_handler_cvars.py:314`: `_RE_CVARGROUP_IDENT = re.compile(r"cvargroup_\w+")` is unanchored. It is only iterated over atomic token spellings (line 350-353) so the unanchored form is safe today. A defensive `^cvargroup_\w+$` would prevent future misuse if someone passes a multi-token string. Style only, no behavioural consequence.

---

## Section 4.2: TS adapter review

**Verdict:** as-claimed.

Adapters reviewed for cvar / command / macro / cmdline_param entity types. All four route their respective FTE-emitted entries through the right schema columns:

- `load-cvars.ts`: handles FTE `source_root` field at lines 64-66 (FTE entries always carry source_root; ezquake / QWCL leave it null = "engine"). `flags_raw` reads from `ast.flags_raw` (already empty-string-normalized by FTE handler via `normalize_flags_raw`). OK
- `load-commands.ts`: line 35 reads `registration_file: ast?.enclosing_function ?? null`. For FTE this evaluates to NULL across all 556 commands (F-FTE-02 manifestation). No bug; the column is allowed to be NULL.
- `load-macros.ts`: line 38 reads `registration_file: ast?.enclosing_function ?? null`. Same NULL outcome for FTE's 67 macros.
- `load-cmdline-params.ts`: lines 31-33 correctly handle FTE's `usage_sites[0]` precedence path (manifest fields are null for FTE; FTE has no `cmdline_params_ids.h` enum manifest).

INSERT column lists (via `upsertCvarVersion` / `upsertCommandVersion` / etc. in `natural-keys.ts`) match the schema DDL. Sample query against `cvar_versions` confirms all 24 columns are populated as expected for FTE rows.

---

## Section 4.3: load-version.ts review (carve-outs)

**Verdict:** as-claimed.

`apps/qw-oracle/scripts/load-knowledge/load-version.ts` (739 lines) reviewed. Notable:
- Line 318-342: array-to-dict normalization (Phase 2e MVDSV). Triggers only when `Array.isArray(rawPayload)`. FTE handlers all emit dict-shaped payloads, so this branch is bypassed.
- Lines 451-467: `valid*` carve-outs (`validInfoKey`, `validLogTemplate`, `validQcBuiltin`). All gated by `options.type === '<type>'`. FTE doesn't emit info_key / log_template / qc_builtin types, so the carve-outs are inactive for FTE. Carve-outs cannot leak across types per the `&&`-coupled type checks.
- Line 334-337: array-to-dict dedup branch emits a `console.warn` on duplicate names, not a silent drop. OK

No FTE-specific carve-outs needed. FTE entity-name shapes pass `validIdentifier = /^[a-z0-9_.+\-]+$/` for cvar / command / macro / cmdline_param.

---

## Section 4.4: Cross-project sibling-handler shape audit (Mode B)

**Verdict:** findings.

Handler-by-handler comparison across all four projects:

**`_handler_cvars.py`:**
- ezquake (680 lines), qwcl (231 lines), mvdsv (269 lines), fte (590 lines).
- All four import `normalize_flags_raw` from `_cvar_shared`. OK
- ezquake / qwcl / mvdsv import `unescape_c_string` and apply it to default extents; **FTE does not import or use it.** F-FTE-01.
- ezquake / qwcl / mvdsv use `read_extent(source_bytes, ...) -> strip_quotes -> unescape_c_string` pipeline; FTE uses `cursor.get_tokens() -> _concat_string_literals` (private). Architectural divergence at the extraction-input level.
- All four use `parse_flag_names` for flag-name list construction (FTE does it inline at line 120 with `_flags_from_tokens`, equivalent semantics).

**`_handler_commands.py`:**
- ezquake (346 lines), qwcl (115 lines), mvdsv (429 lines), fte (227 lines).
- All four import `resolve_fn_ref` from `_resolve` (post-v17 lift). OK
- ezquake + qwcl track `enter_function` / `exit_function` and emit `enclosing_function`. mvdsv + fte do not. F-FTE-02.

**`_handler_cmdline.py`:**
- ezquake / qwcl / mvdsv all track `enter_function` / `exit_function`. **fte does not.** F-FTE-02.

**`_handler_macros.py`:**
- ezquake handler tracks `enter_function` / `exit_function` (lines 85-89). qwcl + mvdsv do not have macros handlers. **fte does not** track them. F-FTE-02.

**Asset handlers (`_handler_asset_loader_sites.py`, `_handler_asset_cvar_bindings.py`):**
- ezquake + fte both have these handlers; qwcl + mvdsv do not.
- Both projects' handlers import `Visitor` and (for loader_sites) `read_extent` + `strip_quotes` directly. They differ at the data-table level: `LOADER_FUNCTIONS`, `FUNCTION_TO_CATEGORY`, `EXT_TO_CATEGORY`, `TRIGGER_RULES`, `ENCLOSING_FN_CATEGORY_RULES` are project-specific (D.2.3 documented this).
- D.2.3 follow-up "Task 3.5 asset-handler lift" was deferred because the 17 candidate helpers close over project-specific data tables. **Re-confirmed:** lifting still requires either constructor-injection of the data tables or per-project subclassing. Closure-equivalence is broken; deferral remains correct.
- Both ezquake and fte asset handlers DO have `enter_function`/`exit_function`. F-FTE-02 does not extend to asset handlers.

**`_handler_ezhud.py`** (FTE-only): no sibling exists. ezquake doesn't have an ezhud plugin -- ezhud bridges FTE plugin-cvar registration to ezquake-style cvar names. The handler is correct in scope.

**`_handler_ezscript.py`** (FTE-only): no sibling. Same story -- the ezscript plugin is FTE-specific, providing ezquake-cvar -> FTE-cvar redirection. Schema entity is `cvar_alias` (38 rows loaded).

---

## Section 5: Spec compliance

**Verdict:** as-claimed.

HANDOVER + apps/qw-oracle/CLAUDE.md claim 2482 cvars / 556 commands / 67 macros / 108 cmdline_params at build-6698 and bundle 28 categories + 61 extensions + 13 path rules + 25 cvar bindings + 717 loader sites. Verified live:

```
cvar:           2482
command:         556
macro:            67
cmdline_param:   108
asset_category:   28
asset_extensions: 61
asset_path_rules: 13
asset_cvar_bindings: 25
asset_loader_sites: 717
```

All counts match HANDOVER claims to the row. The asset_cvar_bindings claim (25) matches DISTINCT cvar_canonical_id (25) -- the extractor emits 77 raw rows (one per loader-call binding pair) which the loader collapses to 25 distinct relations. Both numbers are internally consistent.

cvar = 1397 engine + 1085 plugin:ezhud per `_stats.by_source_root`. Total 2482. OK

---

## Section 6: Quality grid -- SKIP (orchestrator)

Per task instructions: orchestrator handles the full grid. Pre-flight noted 16 PASS / 14 CLEAN / 0 FAIL across 30 fte probes.

---

## Section 7: Determinism + multiprocessing + fork-mode safety

**Verdict:** as-claimed.

- `_run_parallel` (lines 247-280) uses `chunksize=1` for `pool.map` so the Pool does not re-chunk; chunks are pre-sliced from `tasks` in input order (line 264) and merged in input order (line 275-278). OK
- `_run_serial` and `_run_parallel` use the same `_WORKER_CLANG_*` arg lists pre-resolved in the parent before fork. OK
- Worker emissions: `local_rows: dict[str, list[dict]] = {h.name: [] for h in _WORKER_HANDLERS}` (line 144). Plain Python data; no clang cursors, file handles, or closures cross the fork boundary. OK
- Each handler's `finalize` sorts output by stable keys: cvars sort `vars` dict by name; commands/macros sort dict by name; cmdline_param sorts via `sorted(sites_by_flag.items())`; asset handlers sort by `(source_file, source_line, source_column)` tuple keys. OK
- ezhud merge in `merge_ezhud_into_cvars` (line 119) writes with `sort_keys=True`. OK
- Per-handler finalize() output is written without `sort_keys=True` at line 410, but each handler pre-sorts its dict before returning, so the JSON serialization order is deterministic. Non-ideal stylistically (relying on insertion-order preservation) but works correctly under Python 3.7+ guarantees.

**Determinism proof at workers=1 vs workers=12:**

```
$ time python3 apps/qw-oracle/scripts/extractors/fte/extract.py --workers 1
Parse + visit phase: 352.5s
[cvars] 1416 raw rows / [commands] 569 / [macros] 67 / [cmdline] 163
[ezhud] 1085 / [ezscript] 38 / [asset-loader-sites] 717 / [asset-cvar-bindings] 77
Done. 347 file-tasks, 353.0s
real 6m32.525s

$ git diff --stat apps/qw-oracle/scripts/extractors/fte/output/
(empty)
```

Identical raw row counts and byte-identical JSON output to the `--workers 12` run earlier. Section 1.1 (workers=12, 47.4s) and Section 7 (workers=1, 6m32.5s) produce the same artifacts.

---

## Section 8: Final integration checks -- SKIP (orchestrator)

---

## Findings table

| ID | Section | Severity | File:Line | Description | Disposition |
|---|---|---|---|---|---|
| F-FTE-01 | 4.1 / 4.4 | important | `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py:43, 100-115` | Cvars handler does not use `extractor_lib._cvar_shared.unescape_c_string`. Private `_concat_string_literals` strips quotes via slicing but performs no C-escape interpretation. Latent representation gap; zero observably-wrong rows at build-6698 because no current FTE cvar default carries escape sequences. Cross-project: ezquake / qwcl / mvdsv all use `unescape_c_string`. | drain-in-arc |
| F-FTE-02 | 4.1 / 4.4 | important | `apps/qw-oracle/scripts/extractors/fte/_handler_commands.py:86-150`, `_handler_cmdline.py:40-88`, `_handler_macros.py:102-156` | Three handlers lack `enter_function` / `exit_function` lifecycle hooks. Result: 556 commands + 67 macros + 108 cmdline_params all carry `enclosing_function: None` -> `registration_file = NULL` in DB. ezquake + qwcl populate these. mvdsv commands also lacks them (consistent with FTE there); cmdline + macros handlers in mvdsv have it. Already tracked in HANDOVER as cross-extractor audit D.1.8. | HANDOVER (already tracked) |
| F-FTE-03 | 2 | nit | `apps/qw-oracle/scripts/extractors/fte/validation-fixtures/` (missing) | No `validation-fixtures/` directory. Pass 1 runtime cvarlist diff was last run 2026-04-26; outputs encoded as static `_out_of_scope_estimate` block in `_handler_cvars.py:455-461`. Cross-project: same gap exists for qwcl + mvdsv; tracked under cross-extractor audit D.8.2. | HANDOVER (already tracked) |
| F-FTE-04 | 4.1 | nit | `_handler_asset_cvar_bindings.py:104`, `_handler_asset_loader_sites.py:482` | `monorepo_root = here.parent.parent.parent.parent.parent` 5-level path arithmetic. Brittle to directory restructure; if anyone moves `apps/qw-oracle/scripts/extractors/fte/` deeper or shallower, this silently breaks (asset-bundle JSON load fails, returning empty cvar_ident_map). Low-risk today. | drain-in-arc |
| F-FTE-05 | 4.1 | nit | `_handler_cvars.py:314` | `_RE_CVARGROUP_IDENT = re.compile(r"cvargroup_\w+")` is unanchored. Used only against atomic token spellings (line 350-353), so safe today. Defensive `^...$` would reduce surface for future misuse. Style only. | drain-in-arc |

---

## Disposition summary

- **drain-now:** 0
- **drain-in-arc:** 3 (F-FTE-01, F-FTE-04, F-FTE-05) -- captured in `docs/superpowers/plans/2026-04-28-fte-validation-followups.md`.
- **HANDOVER:** 2 (F-FTE-02, F-FTE-03) -- already tracked under cross-extractor audit D.1.8 + D.8.2 respectively.

**Cross-project observations (for orchestrator synthesis):**
- The post-v17 `unescape_c_string` adoption shipped for ezquake / qwcl / mvdsv but did NOT extend to FTE. F-FTE-01 represents the residual convergence gap. Recommend including FTE in any future "Phase X: handler-shape convergence" arc that rationalizes the four projects' default-value extraction paths to a common pipeline.
- Handler-shape divergence in `enter_function`/`exit_function` adoption: ezquake + qwcl are uniformly hooked; mvdsv selectively (commands NO, cmdline+others YES); FTE selectively (asset-handlers YES, others NO). A targeted fork-override audit could converge mvdsv + FTE on the ezquake/qwcl baseline for commands, cmdline, macros.
