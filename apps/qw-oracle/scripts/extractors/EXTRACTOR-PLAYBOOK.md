# QW Extractor Playbook

Reusable knowledge for building and operating the static AST extractors that populate QW Oracle Layer 1 (`apps/qw-oracle/data/knowledge.db`). ezQuake extraction is fully built and verified at head (2026-04-25); FTE, MVDSV, KTX, and QWFWD are pending. Each of those engines has its own registration idioms, but the architecture, pattern catalog, and porting checklist here are the reusable scaffold.

If you are starting a new engine: read the [Porting checklist](#porting-to-a-new-engine) end-to-end before touching code. If you are debugging an existing handler: jump to the [Registration pattern catalog](#registration-pattern-catalog). If you are validating output quality: [Runtime validation](#runtime-validation-playbook).

---

## Architecture in two diagrams

**Extraction side (apps/qw-oracle/scripts/extractors/<engine>/):**

```
  source/*.c, source/*.h  (engine checkout at a specific tag)
        |
        v
  extract-ezquake-unified.py                     [driver, multiprocessing]
    |
    +-- clang_config.py                          [compiler flags per variant]
    |       - clang_args_for()     --> CLIENT  pass
    |       - clang_args_server_for() --> SERVER pass (adds -DSERVERONLY -DSERVER_ONLY)
    |       - clang_args_win_for()   --> WIN    pass (adds -DWIN32 -D_WIN32)
    |       - clang_args_apple_for() --> APPLE  pass (adds -D__APPLE__)
    |
    +-- _visitor.py                              [shared-walk dispatcher]
    |       walk_tu_dispatch(tu, visitors, variant, target_path)
    |       - recurses tu.cursor, filters to target file
    |       - enter_function / exit_function + enter_compound / exit_compound
    |       - visit_cursor on every cursor
    |
    +-- handler_*.py                             [one per entity type]
            CommandsHandler      -> ezquake-commands-ast.json
            CvarsHandler         -> ezquake-variables-ast.json
            MacrosHandler        -> ezquake-macros-ast.json
            CmdlineHandler       -> ezquake-cmdline-params-ast.json
            HudElementsHandler   -> ezquake-hud-elements-ast.json
            KeynamesHandler      -> ezquake-keynames-ast.json
            AssetCvarBindings    -> ezquake-asset-cvar-bindings-ast.json
            AssetLoaderSites     -> ezquake-asset-loader-sites-ast.json
```

**Loader side (apps/qw-oracle):**

```
  apps/qw-oracle/scripts/extractors/<engine>/output/*-ast.json  +  <engine>/help_*.json
        |
        v
  apps/qw-oracle/scripts/load-knowledge/
    |
    +-- load-version.ts          [orchestrator, per (project, version, type)]
    |       - partial-drop guard
    |       - cross-type help-JSON orphan prune at end-of-transaction
    |
    +-- load-<type>.ts           [per-type adapter]
    |       - isSourceBacked predicate (typically `entry.ast !== null`)
    |       - buildVersionRow + upsert
    |
    +-- transitions.ts / natural-keys.ts / schema.ts / diff-versions.ts
        |
        v
  apps/qw-oracle/data/knowledge.db   [SQLite, schema v8]
```

Key invariants:
- Each `*-ast.json` entry is keyed by the entity's canonical name.
- `entry.ast === null` means "help-JSON listed this name, extractor found no source registration." Loader marks it `source_state='doc_only'`.
- `entry.ast !== null` means "extractor found a registration." Loader marks it `source_state='source_backed'`.
- The schema field `source_state` is load-bearing for data-quality queries — see `SCHEMA.md`.

---

## Registration pattern catalog

The eight classes of source constructs the ezQuake extractors handle. When porting to a new engine, inventory the registration APIs in use and map each to a pattern here; anything unmapped is either a new pattern (needs a new handler branch) or deferred until pressure.

### Pattern 1 — Literal `cvar_t` struct-init

**Source example:**
```c
cvar_t sensitivity = { "sensitivity", "3", CVAR_ARCHIVE | CVAR_USERINFO };
static cvar_t cl_www_address = { "cl_www_address", "https://badplace.eu/", CVAR_ROM };
```

**Detection:** libclang sees `VAR_DECL` with type `cvar_t` (possibly const/static) and an `INIT_LIST_EXPR` child. First field is the name string, second is default, third is flags, fourth is on_change function reference.

**Handler:** `handler_cvars.py::_extract_cvar_decl()`. Base case.

**Catches:** the overwhelming majority of cvars (~90% of ezQuake's 2734 source-backed cvars).

### Pattern 2 — `cvar_t` arrays

**Source example:**
```c
cvar_t rule_cvars[] = {
    { "ruleset",        "default" },
    { "allow_scripts",  "2" },
    ...
};
```

**Detection:** `VAR_DECL` with type `cvar_t[N]`. Each outer `INIT_LIST_EXPR` child is a nested struct init for one cvar.

**Handler:** `handler_cvars.py::_extract_cvar_array()`.

### Pattern 3 — Nested `cvar_t` inside container structs

**Source example:**
```c
typedef struct { cvar_t color_cvar; cvar_t fullbright_cvar; ... } custom_model_color_t;
static custom_model_color_t custom_model_colors[] = {
    { { "gl_custom_lg_color", "", CVAR_COLOR }, { "gl_custom_lg_fullbright", "1" }, ... },
    ...
};
// Registration: Cvar_Register(&custom_model_colors[i].color_cvar);
```

**Detection:** `VAR_DECL` whose type is an array of a container struct known to hold `cvar_t` fields at specific indices. The outer init yields nested struct inits; at known field indices, walk down into a nested `INIT_LIST_EXPR` and apply the scalar-cvar parse.

**Handler:** `handler_cvars.py::_extract_nested_cvar_table()` + `_NESTED_CVAR_TABLE_TYPES` mapping struct-type-name → field indices.

**Add a new type:** add one line to `_NESTED_CVAR_TABLE_TYPES`. The walker handles the rest. Empty-name slots (`{"", ...}`) are silently skipped — they're unused placeholders.

### Pattern 4 — Struct-literal command tables iterated via for-loop

**Source example:**
```c
log_t logs[MAX_LOG] = {
    { NULL, "logfile",  "qconsole_", "...", "console",  SV_Logfile_f,       0 },
    { NULL, "logerrors","qerror_",   "...", "errors",   SV_ErrorLogfile_f,  0 },
    ...
};
// Registration: for (i=...) Cmd_AddCommand(logs[i].command, logs[i].function);
```

**Detection:** the `Cmd_AddCommand` call has non-literal args (struct-field accesses), so the call-site detector can't resolve the name. Enumerate the table directly: on `VAR_DECL` with type matching a known command-table struct, walk the init list and pull the name field + handler field at registered indices.

**Handler:** `handler_commands.py::_extract_command_table()` + `_COMMAND_TABLE_TYPES` mapping struct-type-name → `(name_field_idx, handler_field_idx)`.

**Add a new type:** one entry in `_COMMAND_TABLE_TYPES`, e.g. `"log_t": (1, 5)`.

### Pattern 5 — Legacy alias APIs (`Cmd_AddLegacyCommand`)

**Source example:**
```c
Cmd_AddLegacyCommand("addloc", "locations_add");           // rename-compat shim
Cmd_AddLegacyCommand("contrast", v_contrast.name);         // non-literal target
```

**Detection:** `CALL_EXPR` with spelling `Cmd_AddLegacyCommand`. Arg[0] = old name (literal). Arg[1] = target (literal or struct-field reference).

**Handler:** `handler_commands.py::visit_cursor` branches on call spelling. For legacy calls: `handler_fn = None`, and `legacy_alias_of = arg[1]` if arg[1] is a literal, left unset otherwise. The target is preserved as `ast.legacy_alias_of` in the output JSON for downstream provenance; the loader currently ignores unknown ast fields so no schema change is needed.

**Side-effect for other engines:** inventory EVERY `Cmd_Add*` API variant the source uses. FTE has `Cmd_AddCommandD` (description variant); MVDSV may have legacy shims; KTX is QuakeC (completely different — see Known limits).

### Pattern 6 — `#define`-resolved string names at call sites

**Source example:**
```c
#define CVAR_RELOAD_GFX_COMMAND "vid_reload"
// ...
Cmd_AddCommand(CVAR_RELOAD_GFX_COMMAND, VID_Reload_f);
```

**Detection:** first arg of `Cmd_AddCommand` is an all-caps identifier (not a string literal). The literal-extract function returns `None`. Fallback: search the current file for `#define <IDENT> "<literal>"` matching that identifier, substitute the literal.

**Handler:** `handler_commands.py::start_file()` pre-parses the file for `#define NAME "literal"` patterns into `self._file_macros`. `visit_cursor` consults the map when the literal extract fails.

**Known limit:** same-file `#define` only. Cross-header macro resolution isn't implemented. If this becomes pressure on another engine, extend `_file_macros` population to walk `#include`d headers (libclang's `get_tokens()` can iterate preprocessor cursors under `PARSE_DETAILED_PROCESSING_RECORD`).

### Pattern 7 — Platform-guarded code via multi-variant parse

**Source example:**
```c
#ifdef _WIN32
cvar_t movie_codec = {"demo_capture_codec", "0", 0, OnChange_movie_codec};
#endif

#ifdef __APPLE__
static cvar_t in_ignore_deadkeys = { "in_ignore_deadkeys", "1", CVAR_SILENT };
#endif

#ifndef SERVER_ONLY
static cvar_t cl_www_address = { "cl_www_address", "...", CVAR_ROM };
#endif
```

**Detection:** the baseline client + server passes can't see `#ifdef _WIN32` or `#ifdef __APPLE__` branches. Add a third pass with `-DWIN32 -D_WIN32` and a fourth with `-D__APPLE__`. Dispatch both extra passes as `variant="client"` so the handlers' existing primary-path logic adds the newly-visible entities naturally.

**Handler:** no handler changes. The driver runs four TU parses per file; the `_seen_in_file` / `_seen_names` dedup in each handler prevents double-counting.

**See also:** [Multi-variant parse architecture](#multi-variant-parse-architecture) below.

**Known limit:** one documented deferral — `-nopriority` at `sv_sys_win.c:645`. The containing function body references Windows SDK types (`VER_PLATFORM_WIN32_NT`, `GetCurrentProcess`, `SetPriorityClass`) via `<mmsystem.h>` / `<winsock2.h>` which don't exist on Linux libclang. `PARSE_INCOMPLETE` keeps the file top-level walkable but the specific Sys_Init body fails to resolve past the SDK dependency. Recovery: provide stub Windows SDK headers (`-I stubs/windows-sdk/`) if MVDSV/FTE hit the same wall. Revisit then.

### Pattern 8 — Help-JSON cross-type orphans (loader-side)

**Source example:** none — this is a data-quality fix, not an extractor pattern. Included here so it's discoverable with the others.

**Trigger:** `help_commands.json` and `help_variables.json` (in the engine repo) occasionally label a name under the wrong type. Example: `radar` is registered via `HUD_Register` so it lands as `hud_element source_backed`. But `help_commands.json` also lists `radar` → the commands extractor emits it with `ast: null` → the loader creates an orphan `command doc_only` row.

**Fix site:** `apps/qw-oracle/scripts/load-knowledge/load-version.ts` (end of transaction). For each doc_only entity of the current type, if a same-name same-project source_backed entity exists under any OTHER type, prune the orphan (delete per-type version row + transitions + source_overrides + entities row). Per-type-scoped + idempotent — each re-run cleans only what its own type would produce.

**Validation:** `sqlite3 ... "SELECT name, type, source_state FROM entities WHERE project='ezquake' AND name='radar' ORDER BY type"` should return exactly one row per name.

---

## Multi-variant parse architecture

The unified driver runs FOUR libclang passes per source file: client, server, Windows-client, Apple-client. All four feed the same set of Visitor handlers through `walk_tu_dispatch`.

### Adding a platform variant for a new engine

1. **Define the new args function** in `clang_config.py`:
   ```python
   def clang_args_linux_for(ezq_src_dir: str) -> list[str]:
       return clang_args_for(ezq_src_dir) + ["-D__linux__", "-D__unix__"]
   ```

2. **Thread it through the driver** in `extract-ezquake-unified.py`:
   - Add a worker global: `_WORKER_CLANG_LINUX: list[str] = []`.
   - Pass it through `_run_parallel` / `_run_serial` function signatures.
   - In `_worker_process_chunk`, parse a TU with it and pass to `_process_one_file`.
   - In `_process_one_file`, call `walk_tu_dispatch(tu_linux, visitors, "client", target_path_str)`.

3. **Dispatch as `variant="client"`** (not a new variant name). This is the key design choice: handlers don't need to learn about new variants. The existing `variant == "client"` primary path covers the additive detection, and per-file dedup prevents double-counting.

4. **Regenerate + validate.** Run `--handlers <affected type>` first, diff against previous output (see [Runtime validation](#runtime-validation-playbook)), then run `--handlers all`.

**Why "variant=client" for extras:** handler_cvars's server-variant branch tags entries with `(server-build)` suffix and treats them as stragglers. Extra client-flavored passes should take the primary path (add unconditionally), so they use `"client"`. If a new variant genuinely means "this is server-only", use `"server"`.

### When the 4-variant pattern is not enough

Some registration sites need a compound guard (e.g. `#ifdef SERVERONLY && #ifndef _WIN32` = Unix-only server code). For ezQuake, `chmod` at sv_ccmds.c:1858 is the canonical case — the server variant sees it without `-DWIN32`. An attempt to combine server+WIN32 into one variant (to also reach `sv_sys_win.c`'s `COM_CheckParm("-nopriority")`) hid `chmod` — `#ifndef _WIN32` then evaluated false.

**Lesson:** prefer adding a new variant over compounding an existing one. If a combo is needed, introduce a fifth `clang_args_server_win_for` and pass it through as a separate TU. Cost: one more parse per file (~6s on 12 cores). Safety: zero risk of regressing existing cvars.

---

## Visitor handler development guide

Each per-type handler inherits from `extractor_lib._visitor.Visitor` and overrides hooks.

### Lifecycle

Called by the driver **per source file, per variant**:

```
setup(ezq_repo, ezq_src)                        -- once in parent, before fork
for each file:
    start_file(source_path, source_bytes)       -- once per file
    for each variant in [client, server, win, apple]:
        walk_tu_dispatch(tu_variant, [...], variant, target_path_str)
            -> enter_function(cursor, variant)
            -> enter_compound(cursor, variant)
            -> visit_cursor(cursor, variant)  [called on every cursor]
            -> exit_compound(cursor, variant)
            -> exit_function(cursor, variant)
    rows = end_file()                            -- once per file, collects per-file output
    all_rows[handler.name].extend(rows)
finalize(all_rows, repo_root)                    -- once at end, merges help-JSON, returns dict written as JSON
```

### Required overrides

- `output_filename`: `"ezquake-<type>-ast.json"`.
- `name`: handler-local identifier (used as dict key in row aggregation).
- `finalize(all_rows, repo_root) -> dict`: assemble the final JSON output. Must be overridden — the base raises NotImplementedError.

### Common conventions

- **Per-file state in start_file.** Initialize accumulators (`_rows`, `_seen_in_file`, `_seen_names`, `_func_stack`, `_calls`). Clear in end_file.
- **Per-file dedup.** Use `_seen_in_file: set[str]` keyed on the entity's canonical name. Prevents the same registration being emitted twice when client + server + win + apple all see it.
- **Client-primary / server-straggler pattern.** Where client/server behaviors differ (see handler_cvars), the `variant == "client"` branch adds unconditionally. The `variant == "server"` branch adds only if not already seen and tags the row with `(server-build)` in storage_class for provenance.
- **Finalize does cross-file work.** Dedup by canonical name (first-wins across all files), attach help-JSON description/remarks, compute stats, merge seed YAMLs.
- **Help-only entries emit `ast: null`.** For names in `help_*.json` but not found in source, emit an entry with `ast: null`. The loader will mark it `doc_only` and, if Pattern 8 applies, prune it later.

### Writing a new handler checklist

1. Pick a name + output file (`ezquake-<type>-ast.json`).
2. Identify the registration API(s) in source. Confirm each matches an existing pattern (1-7) or is genuinely new.
3. Write `visit_cursor` — branch by `cursor.kind` (typically `VAR_DECL` for struct-init patterns, `CALL_EXPR` for API-call patterns) and `cursor.spelling` (the function/struct name).
4. For call-site detection: use `_literal_string(arg_cursor, source_bytes)` to resolve string-literal args. For identifier args, fall back to `#define` resolution (Pattern 6) or a manifest lookup.
5. For struct-init detection: walk the `INIT_LIST_EXPR` children and extract fields by index. Use `_read_extent(source_bytes, field.extent)` for raw text.
6. Emit per-file rows into `self._rows` from `visit_cursor`.
7. `end_file()`: return `self._rows`, reset state.
8. `finalize(all_rows, repo_root)`: dedup by canonical name, merge help-JSON, return `{groups, <type>s, _stats}`.
9. Register in `extract-ezquake-unified.py::ALL_HANDLERS`.
10. Add a loader adapter: `apps/qw-oracle/scripts/load-knowledge/load-<type>.ts` + entry in `ADAPTERS` dict in `load-version.ts`.
11. Add the schema migration: per-type versions table + entity-type check constraint addition in `schema.ts`.

---

## Runtime validation playbook

Static extraction can miss patterns, misclassify entities, or over-detect. The highest-ROI ground-truth check is a one-pass diff against a running engine's `cvarlist` / `cmdlist` output.

### Procedure

1. **Boot the engine.** For ezQuake: launch, open console.

2. **Dump the runtime registries.** ezQuake supports `condump <filename>` which writes the current console buffer to a text file in the quake dir. Or use `logfile 1` to capture everything:
   ```
   logfile 1
   cvarlist
   cmdlist
   logfile 0
   ```
   The log file is `<gamedir>/qconsole.log` (or user-specified path).

3. **Parse the log.** Strip color codes (`&cff3`, `&r`), CRLF line endings, and the 3-column flag zone (positions 0-2 hold `u`/`s`/space flags; position 3+ is the name). Filter to single-word identifier lines. Case-fold to lowercase (QW cvar names are case-insensitive; the runtime dump preserves original case while the DB normalizes).

   Canonical parser:
   ```bash
   awk '/^List of cvars:/{flag=1;next} /^[0-9]+\/[0-9]+ variables/{flag=0} \
        flag{n=substr($0,4); sub(/\r$/,"",n); \
             if (n ~ /^[A-Za-z_+\-\$\.][A-Za-z0-9_\.\+\-]*$/) print n}' \
        qconsole.log | tr '[:upper:]' '[:lower:]' | sort -u > runtime-cvars.txt
   ```
   (Same pattern for cmdlist, with a matching `List of commands:` / `commands` header.)

4. **Diff against the DB.** Pull source_backed names:
   ```bash
   sqlite3 apps/qw-oracle/data/knowledge.db \
     "SELECT name FROM entities WHERE project='ezquake' AND type='cvar' AND source_state='source_backed'" \
     | sort -u > db-cvars.txt
   comm -23 runtime-cvars.txt db-cvars.txt   # runtime-only: potential extractor gaps
   comm -13 runtime-cvars.txt db-cvars.txt   # DB-only: server/platform/build-config specific
   comm -12 runtime-cvars.txt db-cvars.txt   # intersect: covered names
   ```

5. **Categorize the runtime-only list.**
   - **Leading underscore (`_foo`)**: often legacy alias targets. Check `Cmd_AddLegacyCommand` registrations.
   - **`+hud_*` / `-hud_*` / plain HUD element names**: auto-synthesized by `HUD_Register` at runtime. Expected absences if the DB represents them under `hud_element` type (check: `SELECT * FROM entities WHERE name='radar'`).
   - **Config-only / dynamically created**: set via user config-file `exec`, created via `Cvar_Create`. Out of scope for static extraction. Examples in ezQuake: user-defined teamsay macros (`nick`, `tpname`, `tp_version`, `loc_name_separator`).
   - **Genuine extractor gap**: none of the above. This is what you want to fix.

6. **Categorize the DB-only list.**
   - **`sv_*` / `log_*` / `frag_*` / `sys_*` server-infra**: this runtime is likely a client build. Not loaded. Expected.
   - **Platform-specific (`in_ignore_deadkeys`, `demo_capture_*`)**: registered only on the matching platform runtime. Expected.
   - **Build-config specific (`gl_program_*`, `irc_*`)**: requires specific build flags / renderer.
   - **Genuine over-detection**: extractor saw a registration that never fires at runtime.

### Common gotchas

- **Flag-column stripping:** `awk 'sub(/^[ us]+/,"")'` is WRONG — the `s` prefix can be part of the name (`sb_pinglimit` greedy-matches the leading `s`). Use fixed-width `substr($0, 4)` instead.
- **Case folding:** the runtime dump preserves original case (`cl_c2sImpulseBackup`). The DB lowercases. Case-fold BOTH sides before diff.
- **Terminator lines:** cvarlist ends with a `---------` separator. Filter or your "runtime-only" count will be off by one.
- **Parser-fabricated gaps:** always sanity-check by confirming a known name (e.g. `allow_download`) appears in BOTH intermediate lists before diffing.

### Field-accuracy audit (sample)

Coverage isn't correctness. A second pass samples 20 random source_backed rows and compares field-by-field against the claimed source location:

```bash
sqlite3 -json apps/qw-oracle/data/knowledge.db "
  SELECT e.name, cv.default_value, cv.flags_raw, cv.on_change,
         cv.source_file, cv.source_line, cv.trailing_comment
  FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id
  WHERE e.project='ezquake' AND e.type='cvar' AND e.source_state='source_backed'
    AND cv.version='head'
  ORDER BY RANDOM() LIMIT 20"
```

For each row, `sed -n '${source_line-1},${source_line+1}p' source/${source_file}` and eyeball. All four fields (default, flags, on_change, trailing_comment) should match the literal `cvar_t` init. For HUD-synthesized rows the `source_line` points at the `HUD_Register` call — verify positional-arg defaults against the specific call.

ezQuake 2026-04-25 results: 20/20 fields accurate. No systematic misparse.

---

## Known limits

Documented absences, so future sessions don't waste time trying to fix them.

### Windows SDK unreachable on Linux libclang

Files like `sv_sys_win.c`, `sys_win.c` `#include <winsock2.h>`, `<mmsystem.h>`, `<io.h>`. Those headers don't exist on Linux. `PARSE_INCOMPLETE` keeps TU top-level walkable but specific function bodies that reference Windows SDK types (`VER_PLATFORM_WIN32_NT`, `HIGH_PRIORITY_CLASS`, `SetPriorityClass`) become invalid AST. Any `Cmd_AddCommand` / `COM_CheckParm` call inside such a body is unreachable.

ezQuake impact: 1 row (`-nopriority` cmdline_param at sv_sys_win.c:645). Other call sites in the same file at lines 374 and 409 ARE captured because their function bodies have fewer Windows-SDK dependencies.

**Recovery path:** stub Windows SDK headers. Minimal `.h` files with empty struct declarations and the key typedefs, committed to `research/stubs/windows-sdk/`, referenced via `-I` in `clang_args_win_for`. Worth doing when MVDSV or FTE hits the same wall.

### Runtime-dynamic registrations (`Cvar_Create`)

`Cvar_Create(name, value, flags)` creates a cvar at runtime when an `exec` reads a name the engine doesn't know yet. These cvars have no source declaration — they exist only after specific configs run. Static extraction can never reach them.

ezQuake impact: at least 4 confirmed (`nick`, `tpname`, `tp_version`, `loc_name_separator` — user-defined teamsay macros). Possibly more in the "runtime-only 68" bucket.

**Not a recovery path:** this is a fundamental limit. Document the absence in the runtime-validation categorization step so it's separated from real gaps.

### HUD auto-synthesized command names

`HUD_Register(...)` internally registers both the hud_element and associated command bindings at runtime (`+hud_<name>`, `-hud_<name>`, plain `<name>`). The calls happen inside HUD internals, not as visible `Cmd_AddCommand` sites.

ezQuake impact: ~129 runtime commands (46 ± pairs + 83 plain names).

**Current handling:** the names ARE present in the DB, categorized under `hud_element`. They're not missing — just classified differently from how the runtime exposes them. If consumers need them visible as commands too, add a synthesis step to `hud_elements` finalize that emits mirror rows into `commands-ast.json`.

### String-built names (`snprintf("%s_suffix", parent)`)

HUD child cvars like `hud_mouserate_align_x` never appear as literal strings in source — they're constructed by `HUD_CreateVar(parent, "align_x", ...)` inside HUD_Register. Mechanical grep + git-log-S will always classify them as "never existed" when they're actually hud-element children whose parent was removed.

**Current handling:** `handler_cvars.py::_synthesize_hud_cvars()` synthesizes these rows at the HUD_Register call site. Parent-element history is still invisible to git-log-S; audits must check the parent's history separately.

### QuakeC (.qc) sources

KTX and dusty-ktx include QuakeC modules. QuakeC is a distinct language (not C), libclang can't parse it. Needs `py-tree-sitter` with a QuakeC grammar OR a dedicated lexer. Architectural decision, not an incremental fix.

---

## Porting to a new engine

Stepwise checklist. Expect 1-3 days per engine depending on how many new registration patterns surface.

### 0. Prerequisites

- Engine source cloned to `research/repos/<engine>-source/`.
- `libclang` + `python3-clang` installed (see [reference_libclang_ezquake_extraction.md](../../..//home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_libclang_ezquake_extraction.md) for WSL setup).
- Engine has `help_*.json` files? If yes, note where they live relative to the source root. If no, you'll only have source-backed rows (no `doc_only` complement; help-JSON augments desc/remarks).
- You can boot the engine somehow to produce `cvarlist` / `cmdlist` dumps for validation. If not, plan for lower-confidence initial ship.

### 1. Inventory the registration APIs

```bash
# Cvar registration calls
grep -rhEo 'Cvar_[A-Za-z]+' research/repos/<engine>-source/ --include='*.c' --include='*.h' | sort -u

# Command registration calls
grep -rhEo 'Cmd_Add[A-Za-z]*' research/repos/<engine>-source/ --include='*.c' --include='*.h' | sort -u

# Cvar struct-init sites (literal cvar_t)
grep -rhE 'cvar_t\s+\w+\s*=\s*\{' research/repos/<engine>-source/ --include='*.c' | head -20

# Preprocessor guards in play
grep -rhE '^\s*#if(def)?\s+\w+|^\s*#if\s+defined\s*\(\s*\w+' \
  research/repos/<engine>-source/ --include='*.c' --include='*.h' \
  | grep -oE '\b[A-Z_][A-Z0-9_]{4,}\b' \
  | sort | uniq -c | sort -rn | head -40
```

Map each registration API to one of Patterns 1-7. Any unmapped API is either:
- A variation of an existing pattern (extend the handler's recognized set).
- A new pattern (design decision — generalize existing infrastructure or add a new pattern class).

### 2. Write `clang_config.py` for the new engine

Mirror `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py`'s shape, but:
- Inventory the engine's `-D` flags by reading its build system (CMakeLists, Makefile).
- The list of ezQuake defines (27 `#ifdef` macros) will NOT apply directly. Build your own from the inventory step above.
- Keep the variant split: `clang_args_for` = client base; `_server_for` adds server flags; `_win_for` adds Windows flags; `_apple_for` adds Apple flags.

### 3. Port the unified driver

Clone `extract-ezquake-unified.py` to `extract-<engine>-unified.py`. Same structure:
- `ALL_HANDLERS` dict of per-type handlers.
- `_run_parallel` / `_run_serial` dispatching 4 variant TU parses per file.
- `_process_one_file` dispatching each TU through `walk_tu_dispatch`.

You'll mostly change import paths and the `REPO_ROOT`-relative default for `--repo-root`.

### 4. Write handlers

For each entity type you intend to extract, write or adapt a handler. Start with cvars — almost always the biggest surface and the best calibration for later work.

For each handler:
- Read the analogous ezQuake handler as a template.
- Confirm the pattern match: which of Patterns 1-7 apply to this engine's registration style?
- Copy the ezQuake handler, adapt the pattern detection (cursor kinds, spellings, struct shapes).
- Keep the `_seen_in_file` / `_seen_names` dedup invariant.
- Emit `ast: null` for help-JSON names not found in source, exactly like ezQuake.

### 5. Write loader adapter

In `apps/qw-oracle/scripts/load-knowledge/`:
- Copy `load-cvars.ts` → `load-<engine>-cvars.ts` if field shape differs, or reuse if identical.
- Add the engine to the project allowlist in `schema.ts` (`CHECK (project IN ('ezquake','fte','mvdsv','ktx'))` — already includes the four; add more as needed).
- The cross-type help-JSON orphan prune in `load-version.ts` is project-aware (scoped to the current project), so it'll handle the new engine automatically.

### 6. Run extraction + load

```bash
python3 apps/qw-oracle/scripts/extractors/<engine>/extract.py \
  --repo-root research/repos/<engine>-source \
  --output-dir apps/qw-oracle/scripts/extractors/<engine>/output \
  --handlers all --workers 12
```

Load per type into the DB:

```bash
npm --prefix apps/qw-oracle run load-knowledge -- load-version \
  --project <engine> --version head --type cvar \
  --json apps/qw-oracle/scripts/extractors/<engine>/output/<engine>-variables-ast.json \
  --commit <sha> --ordinal <n>
```

### 7. Validate at runtime

Follow the [Runtime validation playbook](#runtime-validation-playbook). Expect:
- A first-pass diff showing a larger gap than ezQuake's final result.
- Most "gaps" will be dynamic / HUD-synth / platform / config-specific once categorized.
- Real extractor bugs will be a small residual (ezQuake final: 0 real gaps after 7 fixes).

### 8. Iterate on the extractor until gaps are understood

For each unexplained gap:
- Can you find the name in source as a literal string? If yes, figure out which pattern (1-7) should have caught it and why it didn't.
- Is it behind a preprocessor guard your variants don't cover? Add a variant.
- Is it from a registration API you missed in step 1? Add it to the handler.
- Is it from a pattern class none of 1-7 cover? Design a new pattern, capture it here as Pattern 9+.

### 9. Field-accuracy sample audit

20-row random sample, compare field-by-field against source (Procedure in [Runtime validation playbook](#runtime-validation-playbook) above). Name coverage alone is not enough.

### 10. Write a per-engine findings doc

Under `docs/superpowers/specs/<date>-<engine>-extraction-findings.md`:
- Patterns found that ezQuake didn't have (if any).
- Known absences (like ezQuake's `-nopriority`).
- Runtime-validation results.
- What a future session needs to know.

Update the playbook if new patterns are generalizable.

---

## Cross-references

- **Schema + migrations:** `apps/qw-oracle/SCHEMA.md`
- **Entity-type catalog:** `apps/qw-oracle/docs/entity-types.md`
- **Knowledge-service design spec:** `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`
- **Extraction schema spec:** `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md`
- **Extraction-review CLI:** `apps/qw-oracle/scripts/load-knowledge/review/` (audits consecutive-tag diffs, different tool)
- **doc_only audit — the source of most of this playbook's lessons:** `docs/superpowers/specs/2026-04-24-layer1-doc-only-audit-findings.md`
- **libclang WSL setup:** `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_libclang_ezquake_extraction.md`
- **Asset loader capabilities:** `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_asset_loader_extractor_capabilities.md`

---

## Changelog

- **2026-04-25** — Initial playbook authored after the ezQuake Layer 1 doc_only audit closed. Captures all eight registration patterns, the 4-variant parse architecture, loader-side cross-type orphan dedup, runtime validation procedure, known limits, and the stepwise porting checklist. Ship target: next engine port can skip the archaeology and work from this.
