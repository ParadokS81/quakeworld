# QW Extractor Playbook

Reusable knowledge for building and operating the static AST extractors that populate QW Oracle Layer 1 (`apps/qw-oracle/data/knowledge.db`). Four projects ship today: ezQuake (15 versions, deep-time walked to v3.0 floor), FTE (build-6698 with engine + ezhud plugin + asset bundle), QWCL (single tag 2.33), MVDSV (head, 2026-01-04 snapshot). KTX is pending and uses tree-sitter rather than libclang -- see `VALIDATION-RUNBOOK.md` Section  "Out of scope" for the parallel-runbook plan. Each engine has its own registration idioms; the architecture, pattern catalog, and porting checklist here are the reusable scaffold.

If you are starting a new engine: read the [Porting checklist](#porting-to-a-new-engine) end-to-end before touching code. If you are debugging an existing handler: jump to the [Registration pattern catalog](#registration-pattern-catalog). If you are validating output quality: see `VALIDATION-RUNBOOK.md`.

---

## Architecture in two diagrams

**Extraction side (`apps/qw-oracle/scripts/extractors/<project>/` -- post-2026-04-28 architecture consolidation):**

```
  source/*.c, source/*.h  (engine checkout at a specific tag)
        |
        v
  <project>/extract.py                           [driver, multiprocessing]
    |
    +-- extractor_lib/clang_config.py            [compiler flags per project + variant]
    |       - clang_args_<project>_for()       --> primary pass
    |       - clang_args_<project>_server_for() --> server pass (where applicable)
    |       - clang_args_<project>_win_for()    --> Windows pass (where applicable)
    |       - clang_args_<project>_apple_for()  --> Apple pass (where applicable)
    |
    +-- extractor_lib/_visitor.py                [shared-walk dispatcher]
    |       walk_tu_dispatch(tu, visitors, variant, target_path)
    |       - recurses tu.cursor, filters to target file
    |       - enter_function / exit_function + enter_compound / exit_compound
    |       - visit_cursor on every cursor
    |
    +-- extractor_lib/_resolve.py                [cursor-resolution helpers]
    |       resolve_fn_ref(cursor)               [permissive-fallback policy]
    |
    +-- extractor_lib/_source.py                 [string-shape helpers]
    |       read_extent / strip_quotes / literal_string / strip_array_and_qualifiers
    |
    +-- extractor_lib/_cvar_shared.py            [cvar-handler conveniences]
    |       unescape_c_string / normalize_flags_raw / parse_flag_names / FLAG_NAME_RE
    |
    +-- <project>/_handler_*.py                  [project-private handlers, one per entity type]
            _handler_cvars.py         -> <project>-variables-ast.json
            _handler_commands.py      -> <project>-commands-ast.json
            _handler_macros.py        -> <project>-macros-ast.json
            _handler_cmdline.py       -> <project>-cmdline-params-ast.json
            _handler_keynames.py      -> ezquake only -> ezquake-keynames-ast.json
            _handler_hud_elements.py  -> ezquake only
            _handler_asset_*.py       -> ezquake + fte (asset bundle projects)
            _handler_ezscript.py      -> fte only (cvar_alias bridging)
            _handler_protocol.py      -> mvdsv only (protocol_message)
            _handler_info_keys.py     -> mvdsv only
            _handler_log_templates.py -> mvdsv only
            _handler_qc_builtins.py   -> mvdsv only
```

See [Three-tier handler architecture](#three-tier-handler-architecture) below for the rule that drives this layout.

**Loader side (`apps/qw-oracle/scripts/load-knowledge/`):**

```
  apps/qw-oracle/scripts/extractors/<project>/output/*-ast.json  +  <project>/help_*.json
        |
        v
  apps/qw-oracle/scripts/load-knowledge/
    |
    +-- load-version.ts          [orchestrator, per (project, version, type)]
    |       - partial-drop guard
    |       - cross-type help-JSON orphan prune at end-of-transaction
    |       - validInfoKey / validLogTemplate carve-outs (MVDSV-introduced types)
    |
    +-- load-<type>.ts           [per-type adapter]
    |       - isSourceBacked predicate (typically `entry.ast !== null`)
    |       - buildVersionRow + upsert
    |
    +-- transitions.ts / natural-keys.ts / schema.ts / diff-versions.ts
        |
        v
  apps/qw-oracle/data/knowledge.db   [SQLite, schema v18]
```

Key invariants:
- Each `*-ast.json` entry is keyed by the entity's canonical name.
- `entry.ast === null` means "help-JSON listed this name, extractor found no source registration." Loader marks it `source_state='doc_only'`. (MVDSV ships no help-JSON, so this state doesn't arise there.)
- `entry.ast !== null` means "extractor found a registration." Loader marks it `source_state='source_backed'`.
- The schema field `source_state` is load-bearing for data-quality queries -- see `SCHEMA.md`. Note the two-level model: entity-level `source_state` is biographical-by-design ("ever was source-backed at some loaded version"); per-version `source_file` is current-state. Consumers that need "current at HEAD" must check the per-version row, not the entity row alone.

---

## Three-tier handler architecture

After the 2026-04-28 architecture consolidation, all four current projects (ezQuake, FTE, QWCL, MVDSV) follow the same project-private handler shape. The shape has three tiers; pick the right tier when adding handler logic.

| Tier | Lives in | Examples | Rule |
|---|---|---|---|
| 1. Shared infrastructure | `extractor_lib/_*.py`, `clang_config.py` | `_visitor.py`, `_base.py`, `_resolve.py`, `clang_config.py` | ALWAYS shared. Every project imports. |
| 2. Family-base handlers | `extractor_lib/handler_<family>_<type>.py` | (none today; e.g. `handler_ezquake_family_cvars.py` after unezQuake ships) | Lift on second consumer if subclass coupling is tight. Refactor-on-demand, not pre-design. |
| 3. Project handlers | `<project>/_handler_*.py` | All current handlers | Default home for every project's handlers. Forks subclass directly from parent. |

### Rule of second consumer

Don't lift to Tier 2 until a second project actually exists. Speculative family-base classes get the abstraction wrong -- the only way to design a stable shared interface is by reading two real consumers side-by-side. The 2026-04-28 consolidation arc intentionally stopped at exposing override surfaces; lifting waits for the actual fork to land.

### Fork import pattern

When unezQuake ships, its handlers will live at `unezquake/_handler_*.py` and import from the parent project:

```python
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402 (Tier 1 import)
sys.path.insert(0, str(HERE.parent / "ezquake"))
from _handler_cvars import CvarsEzquakeHandler  # noqa: E402 (parent project)


class CvarsUnezquakeHandler(CvarsEzquakeHandler):
    name = "cvars"  # same handler name -> same output filename
    REGISTRATION_APIS = CvarsEzquakeHandler.REGISTRATION_APIS + ("Cvar_RegisterFork",)
    # Override only the methods that differ.
```

If subclass overrides exceed ~30% of methods, lift the parent's overridable surface to Tier 2 (`extractor_lib/handler_<family>_<type>.py`) and have both projects subclass that.

### Cross-codebase port pattern (different from fork)

When porting a wholly distinct codebase (FTE was a fresh port from ezQuake; KTX-after-tree-sitter will be another), do NOT inherit from any parent project. Start fresh in `<project>/_handler_*.py`, inherit from `Visitor` only:

```python
from extractor_lib._visitor import Visitor

class CvarsKtxHandler(Visitor):
    # Build registration detection from scratch. The engine's APIs differ
    # enough that subclassing ezQuake handlers would obscure more than it
    # shares; copy-and-adapt is cleaner.
    ...
```

The fork case (subclass parent) and the cross-codebase port case (subclass `Visitor`) cover every scenario the four-project shape can produce. If you find yourself wanting both at once, you have a Tier 2 candidate.

### Concrete examples

- ezQuake -> unezQuake (planned): import-and-subclass. Override `REGISTRATION_APIS`, override `_extract_cvar_decl` if the fork adds new container types, leave finalize alone unless the fork changes dedup or help-JSON merge policy.
- MVDSV -> antilag-mvdsv (planned): same shape. Pay extra attention to `_handler_info_keys.py` and `_handler_qc_builtins.py` -- those carry the heaviest project-specific coupling and are the most likely override surfaces.
- FTE -> ezQuake-FTE bridge (historical, not pursued): would have been a cross-codebase port (different parser, different runtime model), not a fork.

---

## Registration pattern catalog

The eight classes of source constructs the ezQuake extractors handle. When porting to a new engine, inventory the registration APIs in use and map each to a pattern here; anything unmapped is either a new pattern (needs a new handler branch) or deferred until pressure.

### Pattern 1 -- Literal `cvar_t` struct-init

**Source example:**
```c
cvar_t sensitivity = { "sensitivity", "3", CVAR_ARCHIVE | CVAR_USERINFO };
static cvar_t cl_www_address = { "cl_www_address", "https://badplace.eu/", CVAR_ROM };
```

**Detection:** libclang sees `VAR_DECL` with type `cvar_t` (possibly const/static) and an `INIT_LIST_EXPR` child. First field is the name string, second is default, third is flags, fourth is on_change function reference.

**Handler:** `handler_cvars.py::_extract_cvar_decl()`. Base case.

**Catches:** the overwhelming majority of cvars (~90% of ezQuake's 2734 source-backed cvars).

### Pattern 2 -- `cvar_t` arrays

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

### Pattern 3 -- Nested `cvar_t` inside container structs

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

**Handler:** `handler_cvars.py::_extract_nested_cvar_table()` + `_NESTED_CVAR_TABLE_TYPES` mapping struct-type-name -> field indices.

**Add a new type:** add one line to `_NESTED_CVAR_TABLE_TYPES`. The walker handles the rest. Empty-name slots (`{"", ...}`) are silently skipped -- they're unused placeholders.

### Pattern 4 -- Struct-literal command tables iterated via for-loop

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

**Handler:** `handler_commands.py::_extract_command_table()` + `_COMMAND_TABLE_TYPES` mapping struct-type-name -> `(name_field_idx, handler_field_idx)`.

**Add a new type:** one entry in `_COMMAND_TABLE_TYPES`, e.g. `"log_t": (1, 5)`.

### Pattern 5 -- Legacy alias APIs (`Cmd_AddLegacyCommand`)

**Source example:**
```c
Cmd_AddLegacyCommand("addloc", "locations_add");           // rename-compat shim
Cmd_AddLegacyCommand("contrast", v_contrast.name);         // non-literal target
```

**Detection:** `CALL_EXPR` with spelling `Cmd_AddLegacyCommand`. Arg[0] = old name (literal). Arg[1] = target (literal or struct-field reference).

**Handler:** `handler_commands.py::visit_cursor` branches on call spelling. For legacy calls: `handler_fn = None`, and `legacy_alias_of = arg[1]` if arg[1] is a literal, left unset otherwise. The target is preserved as `ast.legacy_alias_of` in the output JSON for downstream provenance; the loader currently ignores unknown ast fields so no schema change is needed.

**Side-effect for other engines:** inventory EVERY `Cmd_Add*` API variant the source uses. FTE has `Cmd_AddCommandD` (description variant); MVDSV may have legacy shims; KTX is QuakeC (completely different -- see Known limits).

### Pattern 6 -- `#define`-resolved string names at call sites

**Source example:**
```c
#define CVAR_RELOAD_GFX_COMMAND "vid_reload"
// ...
Cmd_AddCommand(CVAR_RELOAD_GFX_COMMAND, VID_Reload_f);
```

**Detection:** first arg of `Cmd_AddCommand` is an all-caps identifier (not a string literal). The literal-extract function returns `None`. Fallback: search the current file for `#define <IDENT> "<literal>"` matching that identifier, substitute the literal.

**Handler:** `handler_commands.py::start_file()` pre-parses the file for `#define NAME "literal"` patterns into `self._file_macros`. `visit_cursor` consults the map when the literal extract fails.

**Known limit:** same-file `#define` only. Cross-header macro resolution isn't implemented. If this becomes pressure on another engine, extend `_file_macros` population to walk `#include`d headers (libclang's `get_tokens()` can iterate preprocessor cursors under `PARSE_DETAILED_PROCESSING_RECORD`).

### Pattern 7 -- Platform-guarded code via multi-variant parse

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

**Known limit:** one documented deferral -- `-nopriority` at `sv_sys_win.c:645`. The containing function body references Windows SDK types (`VER_PLATFORM_WIN32_NT`, `GetCurrentProcess`, `SetPriorityClass`) via `<mmsystem.h>` / `<winsock2.h>` which don't exist on Linux libclang. `PARSE_INCOMPLETE` keeps the file top-level walkable but the specific Sys_Init body fails to resolve past the SDK dependency. Recovery: provide stub Windows SDK headers (`-I stubs/windows-sdk/`) if MVDSV/FTE hit the same wall. Revisit then.

### Pattern 8 -- Help-JSON cross-type orphans (loader-side)

**Source example:** none -- this is a data-quality fix, not an extractor pattern. Included here so it's discoverable with the others.

**Trigger:** `help_commands.json` and `help_variables.json` (in the engine repo) occasionally label a name under the wrong type. Example: `radar` is registered via `HUD_Register` so it lands as `hud_element source_backed`. But `help_commands.json` also lists `radar` -> the commands extractor emits it with `ast: null` -> the loader creates an orphan `command doc_only` row.

**Fix site:** `apps/qw-oracle/scripts/load-knowledge/load-version.ts` (end of transaction). For each doc_only entity of the current type, if a same-name same-project source_backed entity exists under any OTHER type, prune the orphan (delete per-type version row + transitions + source_overrides + entities row). Per-type-scoped + idempotent -- each re-run cleans only what its own type would produce.

**Validation:** `sqlite3 ... "SELECT name, type, source_state FROM entities WHERE project='ezquake' AND name='radar' ORDER BY type"` should return exactly one row per name.

### Pattern 9 -- Function-banner description harvest

**Source example:**
```c
/*
==================
SV_Logfile_f

Toggle persistent logfile output.
==================
*/
void SV_Logfile_f(void) { ... }
```

**Detection:** for each registered handler function (the Cmd_AddCommand second-arg `DECL_REF_EXPR` resolves to a FUNCTION_DECL), walk source bytes backward from the FUNCTION_DECL byte offset to the immediately preceding `/* ... */` block. Parse the banner body skipping decoration lines (`^[=\-]+$`) and bare-identifier lines that just repeat the function name; join remaining lines with single spaces.

**Handler:** MVDSV `_handler_commands.py::_harvest_banner_description()`. Emits the harvested string as `description` on the command row when present.

**Coverage:** ~26-28% on MVDSV's 108 commands. Doesn't fire when the handler function lives in a different .c file than the registration site (cross-file resolution requires Pattern 13). Doesn't fire when the function has no banner. Header-bytes caching when the FUNCTION_DECL lives in a different file than the current TU root.

**Why this matters:** MVDSV ships no help-JSON. Without any description-side data, every command would have `description=NULL`. Banner harvest is the only mechanical way to recover doc strings from MVDSV source.

### Pattern 10 -- TU-root cursor intercept for MACRO_DEFINITION

**Source example:**
```c
// in src/qwprot/src/protocol.h:
#define svc_print           8
#define svc_centerprint     26
#define FTE_PEXT_HLBSP      0x00000001
```

**Detection:** by default `walk_tu_dispatch` filters cursors whose `location.file != target_path_str` to keep handlers focused on the current TU. But `MACRO_DEFINITION` cursors hang off the TU root and live in headers, not the TU's .c file. To extract `#define` constants, intercept the TU root cursor specifically and do a one-shot `cursor.get_children()` scan for `CursorKind.MACRO_DEFINITION` cursors, including those whose `location.file` points to allowed header paths (e.g. `src/qwprot/src/protocol.h`).

**Handler:** MVDSV `_handler_protocol_messages.py`. Header-bytes caching ensures trailing-comment harvest from headers different than the current TU root file works without re-reading.

**When you need this:** entity types whose source representation is a `#define` constant rather than a function call. Protocol messages, packet flags, info_key constants, anything where the literal value is the entity.

### Pattern 11 -- Table-array recovery through `UNEXPOSED_EXPR` wrappers

**Source example:**
```c
// pr_cmds.c:
builtin_t std_builtins[] = {
    NULL,            // #0 (placeholder)
    PF_makevectors,  // #1
    PF_setorigin,    // #2
    ...
};
```

**Detection:** libclang wraps function-pointer entries in INIT_LIST_EXPR with `UNEXPOSED_EXPR` (function-to-pointer decay). A naive `_read_extent` text-strip works on simple cases but fails when the entry is wrapped or when the entry is itself a `(builtin_t)NULL` or array-spelling cast. Use a recursive subtree walk that descends through `UNEXPOSED_EXPR`, `CSTYLE_CAST_EXPR`, `PAREN_EXPR` until it finds a `DECL_REF_EXPR` (function reference), `INTEGER_LITERAL`, or `STRING_LITERAL`.

**Handler:** MVDSV `_handler_qc_builtins.py::_resolve_*` family. Used for `std_builtins[]`, `ext_builtins[]`, and the `ext_syscalls[]` mixed-type table.

**When you need this:** any C source that initializes an array with function-pointer entries, mixed integer/identifier entries, or anywhere libclang's auto-generated cursor kinds obscure the underlying literal.

### Pattern 12 -- Struct-array `Cmd_AddCommand` from non-literal first arg

**Source example:**
```c
// sv_init.c (MVDSV):
log_t logs[] = {
    { NULL, "logfile",      "qconsole_",  "...", "console",      SV_Logfile_f,        0 },
    { NULL, "frag_log",     "frag_",      "...", "frag log",     SV_FragLogfile_f,    0 },
    ...
};
// later:
for (i = 0; i < num_logs; i++)
    Cmd_AddCommand(logs[i].command, logs[i].function);
```

**Detection:** `Cmd_AddCommand`'s first arg is `logs[i].command` -- a `MEMBER_REF_EXPR` on an array index, never a literal. The call-site detector extracts no name. Recover from the `log_t logs[N]` struct-array literal directly: enumerate the outer `INIT_LIST_EXPR`, descend into each element, pull the field at the registered command-name index.

**Handler:** MVDSV `_handler_commands.py::_extract_log_t_table()`. Pattern parallel to ezQuake's `log_t` (Pattern 4) but registered separately because the MVDSV log_t struct shape and field index differ slightly.

**Add a new struct type:** add an entry to the handler's table-shape map (`{struct_name: (name_idx, fn_idx)}`).

### Pattern 13 -- Multiprocessing-safe two-row emission for cross-file resolution

**Source example:** none -- this is an architectural pattern for handlers that need to resolve information across .c files.

**Trigger:** a handler wants both a registration site (`Cmd_AddCommand("foo", Foo_f)` in file A) AND the handler function definition (`void Foo_f(void) { ... }` in file B). The registration site is needed to emit the command row; the function-definition site is needed to harvest the banner description (Pattern 9). With multiprocessing-driven extraction, workers process one .c file at a time, so cross-file state can't be shared.

**Fix shape:** workers emit BOTH `_cmd` (registration row, partial) and `_fn_def` (function-definition row carrying the banner) into the per-file output. The controller's `finalize()` step merges: for each `_cmd` row whose handler-function name matches a `_fn_def` row, copy the harvested banner over to the command row. Drop unmerged `_fn_def` rows (they're scaffolding).

**Handler:** MVDSV `_handler_commands.py::finalize()`. `_cmd` rows carry `ast.handler_function_name` keyed against `_fn_def` rows.

**When you need this:** any cross-file reference where the registration site and the resolution target live in different TUs.

---

### Pattern 14 -- Natural-key includes scope when an identifier carries multiple semantic surfaces

**Source example:** MVDSV `*z_ext` -- registers as serverinfo via `SV_InitLocal` at `src/sv_main.c:3685` AND as userinfo via `SVC_DirectConnect` at `src/sv_main.c:1425`. Same bare key, two distinct semantic surfaces.

**Trigger:** the `entities` table's `UNIQUE(project, type, name)` constraint collapses cross-scope registrations of the same identifier. The second registration silently loses; only one row survives. Symptom surfaces during load as a `[load-version] dropped duplicate name` warning (added in Phase B), or -- before that warning existed -- as a runtime entity count that's lower than the AST-extracted row count without an obvious explanation.

**Fix shape:** make the canonical entity name `<bare>:<scope>` (e.g. `*z_ext:serverinfo`, `*z_ext:userinfo`) so the unique constraint disambiguates. Keep the unsuffixed identifier as `bare_name` at the top level of the JSON entry so downstream consumers (MCP `lookup_entity`, search) can fall back to a `name LIKE '<bare>:%' COLLATE NOCASE` prefix match when the queried name has no `:`.

**Handler:** MVDSV `_handler_info_keys.py::finalize` emits `name = "<bare>:<scope>"` and adds `bare_name` at the top level. `InfoKeyEntry` (TS) gains a `bare_name: string` field. `lookup-entity.ts` adds the prefix-match fallback.

**Where it applies:** any entity type where the same identifier can register with semantically distinct scopes/contexts. Apply when the AST extractor produces N rows and the loader inserts <N entities without a deletion explanation. Migration shape: backfill existing rows via one-shot `UPDATE entities ... SET name = name || ':' || (SELECT scope FROM <type>_versions ...) WHERE project=? AND type=? AND name NOT LIKE '%:%'`.

**Known follow-up trigger:** 4 mvdsv qc_builtin names (`cvar_string`, `precache_model`, `precache_sound`, `precache_file`) register in both `std_builtins` and `ext_builtins` and are silently dropped today (the `[load-version] dropped duplicate name` warning surfaces them at load time). Same architectural shape; the same suffix fix would extend cleanly when qc_builtin gets next attention.

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

Some registration sites need a compound guard (e.g. `#ifdef SERVERONLY && #ifndef _WIN32` = Unix-only server code). For ezQuake, `chmod` at sv_ccmds.c:1858 is the canonical case -- the server variant sees it without `-DWIN32`. An attempt to combine server+WIN32 into one variant (to also reach `sv_sys_win.c`'s `COM_CheckParm("-nopriority")`) hid `chmod` -- `#ifndef _WIN32` then evaluated false.

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
- `finalize(all_rows, repo_root) -> dict`: assemble the final JSON output. Must be overridden -- the base raises NotImplementedError.

### Common conventions

- **Per-file state in start_file.** Initialize accumulators (`_rows`, `_seen_in_file`, `_seen_names`, `_func_stack`, `_calls`). Clear in end_file.
- **Per-file dedup.** Use `_seen_in_file: set[str]` keyed on the entity's canonical name. Prevents the same registration being emitted twice when client + server + win + apple all see it.
- **Client-primary / server-straggler pattern.** Where client/server behaviors differ (see handler_cvars), the `variant == "client"` branch adds unconditionally. The `variant == "server"` branch adds only if not already seen and tags the row with `(server-build)` in storage_class for provenance.
- **Finalize does cross-file work.** Dedup by canonical name (first-wins across all files), attach help-JSON description/remarks, compute stats, merge seed YAMLs.
- **Help-only entries emit `ast: null`.** For names in `help_*.json` but not found in source, emit an entry with `ast: null`. The loader will mark it `doc_only` and, if Pattern 8 applies, prune it later.

### Writing a new handler checklist

1. Pick a name + output file (`ezquake-<type>-ast.json`).
2. Identify the registration API(s) in source. Confirm each matches an existing pattern (1-7) or is genuinely new.
3. Write `visit_cursor` -- branch by `cursor.kind` (typically `VAR_DECL` for struct-init patterns, `CALL_EXPR` for API-call patterns) and `cursor.spelling` (the function/struct name).
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

- **Flag-column stripping:** `awk 'sub(/^[ us]+/,"")'` is WRONG -- the `s` prefix can be part of the name (`sb_pinglimit` greedy-matches the leading `s`). Use fixed-width `substr($0, 4)` instead.
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

For each row, `sed -n '${source_line-1},${source_line+1}p' source/${source_file}` and eyeball. All four fields (default, flags, on_change, trailing_comment) should match the literal `cvar_t` init. For HUD-synthesized rows the `source_line` points at the `HUD_Register` call -- verify positional-arg defaults against the specific call.

ezQuake 2026-04-25 results: 20/20 fields accurate. No systematic misparse.

---

## Known limits

Documented absences categorized by the 4-bucket framework. Per-engine detail lives in each engine's `OUT_OF_SCOPE.md`. Counts reflect state as of 2026-04-26 (post-stub-headers, post-Pattern-3 fix, post-FTE Phase 2d-core).

### The 4-bucket framework (canonical cross-engine model)

Every entity absent from extraction falls into exactly one bucket. The bucket determines whether a fix is possible and what it looks like.

| Bucket | Description | Fixable? |
|---|---|---|
| 1 | Source roots not visited (plugins beyond allowlist) | Yes -- add plugin path to SOURCE_ROOTS |
| 2 | Dynamic registration (Cvar_Get / Cvar_FindOrGet / Cvar_Create at runtime) | No -- fundamental static-analysis limit |
| 3 | Runtime-synthesized names (sprintf-built from format strings) | No -- names depend on runtime state |
| 4 | Windows SDK PARSE_INCOMPLETE | Mostly resolved via stubs; 2 irrecoverable cases remain |

**Current counts per engine:**

| Engine | Total entities | Bucket 1 | Bucket 2 | Bucket 3 | Bucket 4 residual |
|---|---|---|---|---|---|
| ezQuake | ~3849 | 0 (no plugins) | ~4 cvars | ~5 HUD-synth subset | 0 |
| QWCL | 364 | 0 (no plugins) | unknown (small) | 0 | 2 cmdline_params |
| FTE | 3208 | ~26 cvars | ~27 cvars | ~56 cvars | 0 |
| MVDSV | 1235 | 0 (no plugins) | ~25 (Cvar_Create + Info_* runtime args) | ~7 (helper-fn-wrapped cmdline params) | 0 (validated against Ciscon's 1.20-dev dump) |

---

### Bucket 1 -- Out of scope by design (source roots not visited)

Applies to FTE only. ezQuake, QWCL, and MVDSV have no plugin systems; this bucket is empty for them.

FTE Phase 2d-core visited only the `engine/` tree and the `ezhud` plugin (the QW-competitive bridge plugin). Other plugins are not in SOURCE_ROOTS: `plugins/irc/`, `plugins/jabber/`, `plugins/bullet/`, `plugins/avplug/`, `plugins/cef/`, `plugins/cod/`, `plugins/hl2/`, `plugins/quake3/`, `plugins/serverb/`, `plugins/qi/`, `plugins/ezscript/`, ~17 others.

**Example entities absent (FTE):** `irc_nick`, `irc_altnick`, `irc_quitmessage`, `xmpp_autoacceptjoins`, `addon0`, ..., `addon15`.

**Fix shape:** add plugin dir to SOURCE_ROOTS in `extract.py`. Existing handlers handle `cvarfuncs->GetNVFDG()` and `CVARD`-family patterns without code changes. Do this when real user configs surface unknown `irc_*` / `ezscript_*` cvars.

---

### Bucket 2 -- Dynamic registration (Cvar_Get / Cvar_FindOrGet / Cvar_Create)

Cvars created at runtime by name. No source declaration exists; static extraction can never see them.

**ezQuake confirmed (~4 cvars):** `nick`, `tpname`, `tp_version`, `loc_name_separator` (user-defined teamsay macros via `Cvar_Create`).

**FTE confirmed (~27 cvars):** physics_ode_* family (ODE plugin runtime config); IRC/XMPP per-session user-state cvars; a small set from CSQC mods loading user `progs.dat`.

**QWCL:** small set; QWCL uses `Cvar_RegisterVariable` for static cvars and has minimal dynamic creation.

**Fix shape:** none. Document these in the runtime-validation categorization step so they are separated from real extraction gaps.

---

### Bucket 3 -- Runtime-synthesized names (sprintf-built)

Names built via `sprintf("template_%s", arg)` or `sprintf("prefix_%d", i)` at runtime. The format string IS in source; the actual expansions are not -- they depend on hardware, user state, or playlist content.

**ezQuake (~5 HUD-synth subset):** `+hud_<name>` / `-hud_<name>` command aliases auto-generated by HUD_Register at runtime. The underlying hud_element rows ARE in the DB; only the runtime `+/-` aliases are absent. The synthesized cvars (e.g. `hud_mouserate_align_x`) ARE handled by `_synthesize_hud_cvars()` in `handler_cvars.py`.

**FTE (~56 cvars):** `gl_ext_GL_ARB_texture_env_dot3`, `gl_ext_GL_EXT_stencil_two_side`, `gl_ext_GL_EXT_texture_compression_dxt1` (one per GL extension the GPU advertises -- hardware-dependent list); `music_playlist_sampleposition1`, `music_playlist_sampleposition2`, ... (one per audio track); `addon0` through `addon15` (via `sprintf("addon%d", i)` loop).

**Fix shape:** none for truly dynamic expansions. For `+/-hud_<name>` aliases specifically: could synthesize mirror rows at extraction time by iterating extracted hud_elements. Deferred until a consumer use case justifies it.

---

### Bucket 4 -- Windows SDK PARSE_INCOMPLETE (RESOLVED 2026-04-26)

Files `sv_sys_win.c`, `sys_win.c`, and similar `#include <winsock2.h>` / `<mmsystem.h>` / `<io.h>` were previously unreachable on Linux libclang. `PARSE_INCOMPLETE` kept TU top-level walkable but specific function bodies that reference Windows SDK types (`VER_PLATFORM_WIN32_NT`, `HIGH_PRIORITY_CLASS`, `SetPriorityClass`) became invalid AST.

**Resolution (2026-04-26):** stub headers at `research/stubs/windows-sdk/` -- minimal `.h` files with empty struct declarations and key typedefs, referenced via `-I` in `clang_args_win_for`. Recovered 9+ entities across ezQuake and QWCL; all FTE Bucket 4 entries also resolved.

**Two irrecoverable cases remain (QWCL only):**

- **`-novbeaf`** at `vid_win.c`: inside `registerAllDispDrivers()` whose surrounding code uses MGL display-driver types that the stub headers don't fully model. Fix shape: extend stubs with MGL types -- low ROI given QWCL audience size.
- **`-starttime`** at `sys_win.c`: the `COM_CheckParm` call is inside a `#if 0 ... #endif` dead-code block. libclang correctly skips dead code. No fix short of a source-level patch upstream.

---

### Architectural exclusions (not a bucket)

**QuakeC (.qc) sources:** KTX and dusty-ktx include QuakeC modules. QuakeC is a distinct language; libclang cannot parse it. Requires `py-tree-sitter` with a QuakeC grammar or a dedicated lexer. Architectural decision, not an incremental fix. User-loaded `progs.dat` from mods is fundamentally out of static reach regardless.

**Game-type defines (FTE):** `HEXEN2`, `Q2CLIENT`, `Q3CLIENT`, etc. are deliberately undefined per Phase 2d Option B QW-only profile. Fixable by adding game-type variants to `clang_config.py` if the QW-only scope proves too narrow.

**Renderer variants (FTE):** software renderer (`SWQUAKE`) and D3D paths excluded. Fixable by adding variants.

---

## Help-JSON drift classification

Every project with a `help_<entity_type>.json` file (currently ezQuake; FTE/QWCL pending) drifts over time as upstream renames/retires cvars/commands without pruning the help file. The qw-oracle pipeline classifies each `doc_only` entity into a closed six-value taxonomy (`renamed` / `retired_pre_walk_floor` / `never_implemented` / `extractor_gap` / `aspirational_documentation` / `intentional_typo_or_alias`).

**Per-project workflow:**
1. Run `python3 scripts/classify-help-json.py --project <name> --propose` to generate proposals via single-pass git-pickaxe blame (`extractor_lib/_help_json_blame.py`). The blame regex covers the union of doc_only names and same-type source-backed names so co-occurring rename additions are captured.
2. Operator reviews proposals; auto-accepts high-confidence with `--apply --confidence-threshold high`; manually triages medium/low-confidence entries.
3. Persistent classifications live in `<project>/seeds/help_json_classifications.yaml`.
4. `extraction-review` CLI emits a `help-json-classification` finding for any `doc_only` entity not in the seed (the doc_only budget gate, enforced via `--fail-on help-json-classification`).
5. `build-help-json-pr-digest.py --project <X>` generates `apps/qw-oracle/docs/upstream-prs/<X>-help-json-cleanup.md` for upstream PR contribution.

**Auto vs manual:** the classifier proposes four kinds (`never_implemented`, `renamed`, `retired_pre_walk_floor`, `aspirational_documentation`). The other two (`extractor_gap`, `intentional_typo_or_alias`) require operator review and hand-edits to the YAML -- the validator rejects placeholder sidequest strings on `extractor_gap` entries to prevent silent acceptance.

**Schema** (`extractor_lib/_help_json_classification.py`): six closed classification values; per-classification required fields enforced at YAML load time.

---

## Porting to a new engine

Stepwise checklist. Expect 1-3 days per engine depending on how many new registration patterns surface.

### 0. Prerequisites

- Engine source cloned to `research/repos/<engine>-source/`.
- `libclang` + `python3-clang` installed (see [reference_libclang_ezquake_extraction.md](../../..//home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_libclang_ezquake_extraction.md) for WSL setup).
- Engine has `help_*.json` files? If yes, note where they live relative to the source root. If no, you'll only have source-backed rows (no `doc_only` complement; help-JSON augments desc/remarks).
- You can boot the engine somehow to produce `cvarlist` / `cmdlist` dumps for validation. If not, plan for lower-confidence initial ship.

### 0a. Is this a fork or a cross-codebase port?

Before inventorying APIs, decide which path applies. The two paths share the validation steps (7-10) but diverge sharply on steps 1-6.

**Fork (e.g., unezQuake -> ezQuake, antilag-mvdsv -> MVDSV):** the new project shares >70% of its source with a parent and tracks parent updates. The fork case:
- Start in `<fork>/_handler_*.py`. Each handler imports from the parent project's handler and subclasses it (see [Three-tier handler architecture](#three-tier-handler-architecture) Section  Fork import pattern).
- Inventory the deltas -- what the fork adds, removes, or renames at the registration-API level -- before writing handler code.
- Override only what differs. Most methods inherit cleanly. Hoist a constant in the parent first if the fork's only need is a different registration-API tuple.
- If subclass overrides exceed ~30% of methods, lift the parent's overridable surface to Tier 2 (`extractor_lib/handler_<family>_<type>.py`) and have both projects subclass that.
- Skip steps 1-3 below; they're mostly inherited from the parent. Resume at step 4 (handler authoring) for the fork-specific deltas, then skip to step 7 (validation).

**Cross-codebase port (e.g., FTE was a fresh port; future engines like KTX-after-tree-sitter):** start fresh in `<project>/_handler_*.py`. Inherit from `Visitor` only (no parent project import). Steps 1-9 below apply unchanged.

When in doubt: read the parent and the candidate side-by-side. If the registration APIs and struct shapes match closely, fork. If they diverge fundamentally (different parser, different runtime model, different language), port.

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
- A new pattern (design decision -- generalize existing infrastructure or add a new pattern class).

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

For each entity type you intend to extract, write or adapt a handler. Start with cvars -- almost always the biggest surface and the best calibration for later work.

For each handler:
- Read the analogous ezQuake handler as a template.
- Confirm the pattern match: which of Patterns 1-7 apply to this engine's registration style?
- Copy the ezQuake handler, adapt the pattern detection (cursor kinds, spellings, struct shapes).
- Keep the `_seen_in_file` / `_seen_names` dedup invariant.
- Emit `ast: null` for help-JSON names not found in source, exactly like ezQuake.

### 5. Write loader adapter

In `apps/qw-oracle/scripts/load-knowledge/`:
- Copy `load-cvars.ts` -> `load-<engine>-cvars.ts` if field shape differs, or reuse if identical.
- Add the engine to the project allowlist in `schema.ts` (`CHECK (project IN ('ezquake','fte','mvdsv','ktx'))` -- already includes the four; add more as needed).
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
- **doc_only audit -- the source of most of this playbook's lessons:** `docs/superpowers/specs/2026-04-24-layer1-doc-only-audit-findings.md`
- **libclang WSL setup:** `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_libclang_ezquake_extraction.md`
- **Asset loader capabilities:** `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_asset_loader_extractor_capabilities.md`

---

## Changelog

- **2026-04-25** -- Initial playbook authored after the ezQuake Layer 1 doc_only audit closed. Captures all eight registration patterns, the 4-variant parse architecture, loader-side cross-type orphan dedup, runtime validation procedure, known limits, and the stepwise porting checklist. Ship target: next engine port can skip the archaeology and work from this.
- **2026-04-28** -- Extractor architecture consolidation. ezQuake handlers relocated from `extractor_lib/handler_*.py` to `ezquake/_handler_*.py` matching the canonical project-private shape used by FTE/QWCL/MVDSV. Three-tier handler architecture section added (shared infrastructure / family-base / project-private). Fork-vs-port subsection added to the porting checklist. Subclassing-readiness audit on ezQuake + MVDSV handlers exposes fork override hooks via class docstrings, `# Fork override hook:` comments, and class-level registration-API tuple hoists. Sets up unezQuake (ezQuake fork) and antilag-mvdsv (MVDSV fork) for clean fork onboarding via direct subclassing. Plan: `docs/superpowers/plans/2026-04-28-extractor-architecture-consolidation.md`.
- **2026-04-27** -- MVDSV Phase 2e SHIPPED. Added Pattern 9 (function-banner harvest), Pattern 10 (TU-root cursor intercept for MACRO_DEFINITION), Pattern 11 (recursive `_resolve_*` AST walks for libclang `UNEXPOSED_EXPR` wrappers), Pattern 12 (`log_t logs[N]` struct-array `Cmd_AddCommand` recovery), Pattern 13 (multiprocessing-safe two-row emission for cross-file resolution). MVDSV row added to per-engine counts table (1235 entities; runtime-validated against Ciscon's 1.20-dev dump with zero extractor gaps). Six loader-side bug fixes shipped during validation: cvars handler `_trailing_comment` switched from `max(rfind(";"), rfind(","))` to `};` literal terminator (commit `8747ad9`); `load-cvars.ts` `default_value` reads `entry.ast.default_value` with fallback to legacy `entry.default` (`9d61924`); `load-cmdline-params.ts` adds flat `ast.source_file/line/column` fallback alongside the nested `ast.usage_sites[0]` form (`a905c22`); Python handler `payload_field` keys harmonized to legacy `vars` and `params` (`9d61924`); `load-version.ts` adds `validLogTemplate` carve-out for canonical names containing `:`/`%`/spaces/escapes (`9d61924`); `load-version.ts` adds `validInfoKey` carve-out accepting leading `*` for QW system keys (`30969c1`, recovered 18 of 45). All six fixes are idempotent and pure-additive -- they widen accept-criteria without altering existing rejection paths. Future ports inheriting these fallbacks: any engine emitting flat `ast.*` fields, `*`-prefixed system identifiers, or canonical-but-non-identifier names.
