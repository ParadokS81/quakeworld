# QW Extractor Playbook

Reusable knowledge for building and operating the static AST extractors that populate QW Oracle Layer 1 (`apps/qw-oracle/data/knowledge.db`). Four projects ship today: ezQuake (15 versions, deep-time walked to v3.0 floor), FTE (build-6698 with engine + ezhud plugin + asset bundle), QWCL (single tag 2.33), MVDSV (head, 2026-01-04 snapshot). KTX onboarding is in progress: canonical KTX is pure C and uses libclang like the other four (the dusty-ktx fork adds a `qcsrc/` QuakeC tree, which is out of scope for canonical onboarding -- a separate parallel runbook will land when dusty-ktx ships). Each engine has its own registration idioms; the architecture, pattern catalog, and porting checklist here are the reusable scaffold.

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

When porting a wholly distinct codebase (FTE was a fresh port from ezQuake; canonical KTX is the next), do NOT inherit from any parent project. Start fresh in `<project>/_handler_*.py`, inherit from `Visitor` only:

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

## Handler-grouping rationale

When a new engine introduces multiple new entity types or sub-types, the question "should this be one mega-handler, one handler per type, or some grouping in between?" surfaces. The KTX onboarding arc's Pass 5.3 explored three options and locked the rule: **group handlers by walking strategy, not by source file or row kind**.

The rule states: two row kinds that share a libclang traversal pattern belong in the same handler; two row kinds that live in the same source file but use different walkers do NOT belong together. The walking strategy IS the handler's identity.

Worked example from KTX (per arc decisions D6):

| Handler | Output filename | Row kinds emitted | Walking strategy |
|---|---|---|---|
| `_handler_modes.py` | `ktx-modes-ast.json` | `game_mode` (catalog) + `mode_default` (overlays) | STRING_LITERAL-array walker on `const char[]` initstring declarations in `commands.c` (uses extended Pattern 6) |
| `_handler_gameplay_taxonomies.py` | `ktx-gameplay-taxonomies-ast.json` | `election_type` + `death_rule` | Enum-decl walker (Pattern 10) on `electType_t` (`progs.h`) and `deathType_t` X-macro (`deathtype.h`) |
| `_handler_gameplay_tables.py` | `ktx-gameplay-tables-ast.json` | `monster` + `score_system` + `drop_item` + `loc_macro` + `teamplay_message` | INIT_LIST_EXPR walker (Pattern 4) on struct-array literals + Pattern 9 banner-comment harvest for teamplay_message handler-function descriptions |
| `_handler_match_events.py` | `ktx-match-events-ast.json` | `match_event` | XSD parse (Python `xml.etree.ElementTree`) + emission-site grep (NOT a libclang handler) |

Three options were tested at brainstorm time:
- **Option A: one mega-handler.** All KTX gameplay content in one Python file, internally branched on type. Rejected: the file size (10+ kinds, 5+ source files, 4+ walking strategies) would crowd the handler past the readability point; per-row-kind unit testing becomes harder.
- **Option B: one handler per row kind.** 10 separate handler files, one per kind. Rejected: handlers that share a walker (e.g., the four struct-array-init kinds in `_handler_gameplay_tables.py`) would duplicate dispatch logic; per-kind output filenames balloon the load-knowledge dispatch table; the per-handler unit-of-work becomes too small to be coherent.
- **Option C: group by walking strategy.** Per-handler unit-of-work clear, source-file scope per handler small, slicing trivial, pattern documentation reusable. SHIPPED.

Why this matters for future engine ports: the Option C grouping makes phase-MD slicing for cross-codebase ports trivial -- one phase per handler-strategy class. The KTX onboarding arc sliced its gameplay-content phases (3 / 4 / 5 / 6) along exactly this axis. Future ports should look for the same grouping signal: "what walking strategies does this engine demand?" answers "how should the handler files split?"

Cross-references:
- Walker-strategy pattern catalog: see "Registration pattern catalog" below for Patterns 4, 6, 9, 10, 15 -- the four walker shapes the KTX handlers used.
- Tier 3 placement convention: per the three-tier handler architecture, all four KTX handlers live as project-private files under `<project>/_handler_*.py`. The XSD-driven `_handler_match_events.py` is the lone carve-out from D3's "inherit from Visitor" rule -- standalone with duck-typed lifecycle stubs since XSD parsing is not libclang traversal.

---

## Pre-Port Discovery Sweep

Before writing handler code for a new engine, run a three-leg discovery sweep to scope what exists, what overlaps existing engines, and what differs. The sweep is the brainstorm Pass-1 deliverable for any cross-codebase port; KTX onboarding (2026-05-04 arc, Pass 1 of the brainstorm) earned the methodology.

Three legs:

1. **Source registry leg.** Inventory the registration APIs in use (the standard `grep -rhEo 'Cvar_[A-Za-z]+'` / `Cmd_Add[A-Za-z]*` / etc. -- see "1. Inventory the registration APIs" in the porting checklist below). Map each API to one of the existing patterns (1-15) or surface a new pattern. Walk the major source files top-to-bottom, noting struct-array tables, enum declarations, X-macro files, XSD schemas, and other static-data shapes the engine carries. Output: a per-engine "what shapes do we see" inventory.

2. **Committed-config leg.** If the engine ships example configs (`resources/example-configs/<engine>/`, `presets/`, `cfg/`), grep for cvar / command names referenced in those configs. Cross-check against the source registry leg's name set. Discrepancies fall into three categories: source-only (extracted, no config use -- expected for many cvars), config-only with naming-pattern match (Bucket 3 indexed-family like KTX `k_motd*` / `k_ml_*` -- sprintf-built at runtime; document in `OUT_OF_SCOPE.md`), config-only with no source match (truly orphaned drift; flag for upstream PR consideration). KTX's Pass 1.1 found: 119 unique k_* in configs, 100 source-overlap, 15 Bucket-3 family, 4 truly orphaned.

3. **Runtime-evidence leg.** If the engine produces runtime output (`cvarlist` / `cmdlist` dumps from a live binary, telemetry logs, OR archived community dumps like Ciscon's MVDSV 1.20-dev cvarlist), use that as a third independent name source. Cross-check with legs 1 + 2. The runtime leg catches what static analysis misses (Bucket 2 dynamic registrations, sprintf-built names, runtime-synthesized HUD aliases). The cross-engine intersection also surfaces "this name appears in MVDSV runtime but not in our source-registry leg" findings -- usually a missed registration API or a preprocessor-guarded path.

Treat the three-leg sweep as a sequencing prerequisite, not an optional first-week activity. Skipping Leg 2 invites Bucket-3 family cvars to ship as "first-class extraction failures" and burn cycles in Phase N+1 cleanup; skipping Leg 3 misses dynamically registered names and over-promises extractor coverage. The MVDSV onboarding (Phase 2e) and KTX onboarding (this arc) both ran the three-leg pattern explicitly.

Output of the sweep is the input to "Section 0a -- Is this a fork or a cross-codebase port?" -- the inventory clarifies whether the new engine's API surface overlaps a parent project enough to fork, or whether the divergence demands a fresh port.

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

**Side-effect for other engines:** inventory EVERY `Cmd_Add*` API variant the source uses. FTE has `Cmd_AddCommandD` (description variant); MVDSV may have legacy shims; KTX uses its own command-table shape (see KTX onboarding spec at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`).

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

### Pattern 10 -- TU-root cursor intercept for header-defined declarations (MACRO_DEFINITION + ENUM_DECL)

**Source examples:**
```c
// in src/qwprot/src/protocol.h (MACRO_DEFINITION):
#define svc_print           8
#define svc_centerprint     26
#define FTE_PEXT_HLBSP      0x00000001

// in include/g_local.h (ENUM_DECL):
typedef enum {
    etNone = 0,
    etCaptain,
    etCoach,
    etAdmin,
    etSuggestColor,
    etLateJoin,
} electType_t;
```

**Detection:** by default `walk_tu_dispatch` filters cursors whose `location.file != target_path_str` to keep handlers focused on the current TU. But `MACRO_DEFINITION` and `ENUM_DECL` cursors hang off the TU root and live in headers, not the TU's .c file. To extract them, intercept the TU root cursor specifically and do a one-shot `cursor.get_children()` scan for the desired cursor kinds, including those whose `location.file` points to allowed header paths (e.g. `src/qwprot/src/protocol.h`, `include/g_local.h`).

**Handlers:**
- MVDSV `_handler_protocol_messages.py` -- `MACRO_DEFINITION` walker for protocol byte constants.
- KTX `_handler_gameplay_taxonomies.py` -- `ENUM_DECL` walker for `electType_t` (Stage 1; emits 5 `election_type` rows after skipping the `etNone` sentinel).

Header-bytes caching ensures trailing-comment harvest from headers different than the current TU root file works without re-reading.

**When you need this:** entity types whose source representation is a header-defined declaration rather than a function call. Protocol messages, packet flags, info_key constants, election-type enums, taxonomic-enum tables -- anything where the literal value or enumerated identifier IS the entity.

**Widening note (Phase 4 carry-forward of the KTX onboarding arc):** the original Pattern 10 was scoped to `MACRO_DEFINITION` only (MVDSV protocol_message handler). Phase 4 of the KTX onboarding arc reused the same TU-root intercept mechanic on `CursorKind.ENUM_DECL`. The same handler-private intercept code reuses cleanly across both cursor kinds; the widening is a one-line `if cursor.kind in (CursorKind.MACRO_DEFINITION, CursorKind.ENUM_DECL):` guard, not a separate handler. Future ports that need `STRUCT_DECL` or `TYPEDEF_DECL` from headers can extend the same guard further.

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

### Pattern 15 -- STRING_LITERAL-array walker for engine-named initstring tables

**Source example:**
```c
// KTX commands.c:4156 (inside common_um_init):
static char common_um_init[] =
    "k_yawnmode 0\n"
    "k_freshteams 0\n"
    "k_lgcmode 0\n"
    "k_killquad 0\n"
    // ... ~50 more lines, each a literal "<cvar_name> <value>\n" tuple
;

// KTX commands.c (per-mode initstrings):
static char _2on2_um_init[] =
    "k_clan 1\n"
    "deathmatch 3\n"
    "timelimit 10\n"
    // ... ~15 more lines per mode
;
```

**Detection:** `VAR_DECL` whose type is `char[]` (with optional `const` / `static` qualifiers) and whose initializer is a single `STRING_LITERAL` cursor (libclang collapses the adjacent C string-literal concatenation into one cursor). The literal's text body is a multi-line newline-delimited tuple stream: each line is `<token> <value>` -- the engine's own "compact config-line list" shape.

**Handler walker:**
1. On a `VAR_DECL` whose name matches the per-mode-initstring pattern (`<token>_um_init`, `common_um_init`, `race_settings`, etc.), pull the `STRING_LITERAL` child cursor.
2. Read the literal's source text via `_read_extent` + `_unescape_c_string` (the standard cvar-handler convenience helpers).
3. Split on `\n`. For each non-empty line, split on first whitespace into `<token> <value>`. Emit one `mode_default` row per line.
4. Trailing-comment harvest: each line MAY have a trailing `// ...` comment that documents the cvar-set's intent. Capture as `props_json.comment` for the row.
5. Macro-prefixed lines: a few lines start with an identifier rather than a literal cvar name (e.g., `LGCMODE_VARIABLE " 0\n"` in KTX `common_um_init`). Resolve the identifier via the handler's `_file_macros` cache (Pattern 6, extended to depth-1 #include closure per the KTX onboarding arc's D4 lift). After resolution, the macro substitutes for the cvar name; emit the row as if the literal name had been written directly.

**KTX usage (per arc D6):** `_handler_modes.py` walks `common_um_init` (54 baseline rows), the 17 per-mode `<token>_um_init` arrays (~255 overlay rows total), and the `race_settings` initstring. Total: ~309 `mode_default` rows.

**Add a new initstring array name:** add the array's identifier to the handler's known-array set; the walker handles it without further code changes. Keep the array's `apply_order` (1=baseline, 2=overlay) declared per-array to preserve the apply-order semantics in `props_json`.

**Why this is its own pattern (not a reuse of Pattern 4):** Pattern 4 walks `INIT_LIST_EXPR` for struct-literal arrays; the entries are typed C structs with field-by-field semantics. Pattern 15 walks a single `STRING_LITERAL` whose body IS the data -- one literal expanded into N rows by string parsing. The cursor kind, the unit-of-work-per-cursor, and the parsing approach all differ. Documenting them separately keeps the pattern catalog precise.

**Cross-engine outlook:** any engine that uses "compact config-line list" string literals as a config-init mechanism is a Pattern 15 candidate. Common in older C codebases that predate per-cvar registration APIs. KTX is the first surfaced consumer; future engines (especially older Q1-era forks) may surface more.

### Pattern 16 -- X-macro file parse for declaration tables whose user-facing tokens are erased by preprocessor expansion

**Source example:**
```c
// in include/deathtype.h:
// X-macro file: each DEATHTYPE_X invocation declares one death-type entry.
// The X-macro is expanded by the consumer with its own DEATHTYPE_X definition.
DEATHTYPE_X(dtNONE,           "<none>",           "structural",   IDENTITY,    NULL)
DEATHTYPE_X(dtUNKNOWN,        "<unknown>",        "structural",   IDENTITY,    NULL)
DEATHTYPE_X(dtSHOTGUN,        "shotgun",          "weapon",       IDENTITY,    "shotgun")
DEATHTYPE_X(dtSUPER_SHOTGUN,  "super shotgun",    "weapon",       IDENTITY,    "super_shotgun")
// ... 25 more entries
```

**Trigger:** the file is structured as `X(...)` lines where `X` is a placeholder macro the consumer redefines per use case. libclang sees only the X-macro consumer's expansion -- the consumer-side `#define DEATHTYPE_X(...) ...` controls what the lines turn into. The user-facing tokens (`dtSHOTGUN`, `"shotgun"`, etc.) live ONLY in the source file; libclang's AST sees the consumer's expansion (a function table, an enum, a switch, etc.), not the original tokens.

**Detection:** the X-macro file pattern is identifiable by:
- Filename convention (`*type.h`, `*kinds.h`, `*-list.h` with all `X(...)` lines).
- Body contains repeated `IDENTIFIER(args, ...)` lines where IDENTIFIER is consistent.
- Comments often note "X-macro file" or "expanded by consumer."

**Handler approach:** SKIP libclang for these files. Read the file's bytes directly via `Path.read_text()`, line-iterate, regex-match the X-macro line shape (`re.compile(r'^\s*' + re.escape(MACRO_NAME) + r'\s*\(([^)]+)\)\s*$', re.MULTILINE)`), and parse the comma-separated arguments per row.

**Handler:** KTX `_handler_gameplay_taxonomies.py::_parse_deathtype_h()` -- Stage 2 of the taxonomies handler. Reads `include/deathtype.h`, regex-matches the 29 `DEATHTYPE_X(...)` lines, skips the `dtNONE` and `dtUNKNOWN` sentinels, emits 27 `death_rule` rows.

**Why this is its own pattern (not a reuse of Pattern 10):** Pattern 10 intercepts `MACRO_DEFINITION` / `ENUM_DECL` cursors via libclang TU-root walk. X-macro files don't expose the per-line tokens to libclang AT ALL -- the tokens are erased by preprocessor expansion. The only way to recover them is to read the source file bytes directly. The cursor-walk machinery doesn't apply.

**When you need this:** any engine that uses X-macro files as a static-data registration mechanism. Common in C codebases for enumerable taxonomies (death types, weapon types, network protocol opcodes, etc.) where the consumer wants to enumerate the values multiple times in different ways without duplicating the canonical list.

**Cross-engine outlook:** KTX is the first surfaced consumer in the Layer 1 lineup. Future engines (especially older Q1-era forks that lean on X-macros for taxonomy declarations) may surface more. The handler approach is engine-agnostic: read file, regex-match, parse. No libclang involvement.

**Caveat:** the X-macro file pattern means the per-line `source_file` / `source_line` citation IS the X-macro file itself, not the consumer expansion site. That's correct -- the canonical source of truth for "where is this death-rule defined?" is the X-macro file. Consumer expansion sites are infrastructure (a switch statement that dispatches on the death-type, an obit-string lookup table, etc.); they're rendering, not data.

---

### Dual-row design: log_template + match_event (D10 / F17 of the KTX onboarding arc)

Some emission sites populate TWO entity-type rows by design, capturing complementary facets. KTX's `log_printf` XML-shaped emissions are the canonical case: each emission populates BOTH a `log_template_versions` row (via the Pass-1 printf-handler under `_handler_log_templates.py`, channel='logfile') AND a `match_event_versions` row (via the XSD-driven `_handler_match_events.py`, complex_type from the XSD).

- `log_template_versions` captures **per-call-site truth**: the verbatim format string passed to the print call, the file/line citation, the channel discriminator. One row per registration site.
- `match_event_versions` captures **per-event-type truth**: the XSD-defined attribute schema, the XSD version, the rolled-up list of every emission call site for this event type. One row per XSD complexType.

KTX's 13 XML-shaped `log_printf` call sites map to 13 `log_template_versions` rows + 7 `match_event_versions` rows (per F14: 6 pick_mapitem + 1 each for pick_powerup / drop_powerup / pick_backpack / drop_backpack + 2 damage + 1 death). The duplication is intentional.

**Do NOT deduplicate.** A future maintainer reading the dual rows is likely to think "this looks redundant" and try to add a filter to `_handler_log_templates.py` that skips XML-shaped log_printf calls. That would lose the per-call-site format string truth. The duplicate IS the design.

**When this pattern recurs:** any engine where one emission site has both per-call-site provenance (file/line/format) AND per-type schema (XSD, JSON Schema, protobuf message). The dual-row design preserves both facets without forcing one consumer to walk into the other.

**Cross-reference:** decisions.md D10 of the KTX onboarding arc (`docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md`) carries the lock + rationale; F17 of the same arc's review-findings carries the audit trail.

---

## Cross-arc doctrine notes (KTX onboarding arc)

Pattern-adjacent doctrine surfaced during the KTX onboarding arc's Phases 3 / 5 / 5.5 / 6 / 7. Each note refines a pattern's applicability or codifies a cross-handler invariant the arc earned. Future-engine ports consume these alongside the per-pattern entries.

### F25 -- Pattern 13 emission as the cross-arc parallel-safety invariant (Phase 5.5)

**Rule:** any future libclang handler with cross-file refs MUST use Pattern 13 emission. No per-handler instance-state aggregation in fork-pool architectures.

**Why:** Phase 3 of the KTX onboarding arc shipped a modes handler (`_handler_modes.py`) that accumulated cross-file refs on `self._*` instance state and joined them in `finalize()`. Under `multiprocessing.Pool` fork-pool execution, each worker gets its own copy of the handler instance via fork, populates state in the worker, and returns rows via `end_file()`. The parent's instance state is NEVER populated. Parent's `finalize()` then ran against an empty instance and emitted 0 mode_default rows under `--workers >1`. Phase 3 worked around with a serial-mode guard in `extract.py`. Phase 5.5 retrofitted the principled fix: typed pseudo-row emission from `end_file()` (`_kind` in `{_mode_default, _meta_activation_cvar, ...}`) so cross-file refs flow through `all_rows` rather than instance state. Parallel-vs-serial diff is now empty; 3.3x speedup on 12-core extraction.

**Rejected alternative:** the original F25 future-arc options included a `Visitor.parallel_safe: bool = True` attribute that `extract.py` would read to gate the serial fallback. REJECTED at Phase 5.5 disposition closure -- gating opt-out as a per-handler bool would normalise the broken state-on-self design and recreate the divergence between handlers that the Pattern 13 retrofit eliminates.

**Three-consumer arc-pattern:** Pattern 13 was first shipped by MVDSV's `_handler_commands.py` (cross-file `_cmd` + `_fn_def` joins for banner harvest). Phase 2 of KTX reused it for the same purpose. Phase 5 (KTX `_handler_gameplay_tables.py`) shipped Pattern 13 first-attempt with no shape resistance for teamplay_message handler-function joins. Phase 5.5 retrofitted modes to the same pattern. Three KTX handlers + the original MVDSV consumer = the canonical four-consumer-baseline that promotes Pattern 13 from "bespoke trick" to "cross-arc invariant."

**Cross-reference:** F25 of `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` carries the discovery + Phase 5.5 disposition-closure amendment.

### F26 -- Pattern 6 cross-header lift is string-literal-only by design (Phase 5)

**Rule:** the `extractor_lib._source.collect_file_macros` lift (Pattern 6, depth-1 cross-header) collects ONLY `#define IDENT "string"` macros. Function-like macros, integer / hex constants, and any macro whose body is not exactly one string-literal token are explicitly excluded.

**Why:** Phase 1 of the KTX onboarding arc shipped Pattern 6 cross-header against modes' need (KTX `LGCMODE_VARIABLE " 0\n"` macros, where the macro body IS a string literal used in initstring concatenation). Token-kind filter at `_source.py` lines 167-171 + 225-229 enforces "string-literal-token only." Phase 5 of the same arc surfaced KTX `WEAPON_BIG2 1` (integer body, depth-0 same-file) which the lift does NOT collect -- caught by pytest `test_drop_item_sh40_weapon_big2`. Live runtime probe against KTX `commands.c` TU confirms: `'WEAPON_BIG2' in file_macros: False`, `'LGCMODE_VARIABLE' in file_macros: True`.

**Handler-private fallback for integer macros:** when a handler needs integer-macro resolution, ship a frozen-keyed dict (e.g., KTX `_DROPITEM_MACRO_FALLBACK = {"H_ROTTEN": 1, "H_MEGA": 2, "WEAPON_BIG2": 1}`). Frozen dict semantics preserve fail-loud-not-silent behaviour: KeyError if a future tag references a missing macro.

**Lift-on-demand for the third consumer:** if a future engine surfaces a third consumer needing integer-macro resolution, evaluate Rule of Second Consumer + a sibling `collect_file_int_macros(tu, target_file_path)` helper returning `dict[str, int]`. Until the third consumer arrives, handler-private fallback dicts are the convention.

**Cross-reference:** F26 of `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` carries the Phase 5 discovery + disposition.

### F27 -- Pattern 9 banner-coverage varies per source-file commenting convention (Phase 5)

**Rule:** Pattern 9 (function-banner harvest) coverage is best-effort; per-source-file commenting style determines how much harvests. Future engine consumers should NOT assume banner blocks exist; design tests + probes for best-effort harvest.

**Coverage observed in the four-engine baseline:**
- MVDSV `sv_ccmds.c`: ~28% coverage. Doom-style `/* ===== */` banner blocks common.
- KTX `teamplay.c`: 0% coverage. Source has zero `/* === */` blocks; uses `// Cmd_AddCommand("tp_msgkillme", TP_Msg_KillMe_f);` line-comment style instead. Eight of 21 teamplay_message handlers are macro-expanded via `TEAMPLAY_BASIC(FunctionName, Text)` and have no banner block by construction.

**Probe authoring discipline:** Pattern 9 probes that assert `with_banner > 0` are calibrated against MVDSV-shape source. Against KTX-shape source they fail by design. Probe wording should reflect "report `with_harvested_description` count and surface as Layer 3 concept-note signal -- if low, the source's preferred docstring style is not Doom-style banner; harvest a different shape (line-comment-above-function) for that file."

**Cross-reference:** F27 of `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` carries the Phase 5 discovery + handler-correctness confirmation.

### F29 -- Anchor probe live-data verification discipline (Phase 7)

**Rule:** anchor probe authors verify predicates against live dev DB before shipping; spec paraphrase is the most common drift source.

**Why:** Phase 7's quality-grid F1 anchor probes drifted from live data on three predicates that the executor caught at boundary verification:
1. Anchor `fish_first_in_monsters`: spec said `WHERE name='fish'`; live KTX rows store full id1-classname (`monster_fish`). Corrected predicate.
2. Anchor `match_event_count_7_with_attributes`: spec said `jsonb_typeof(attributes_json)='object'`; live rows hold a JSONB array of attribute-descriptor objects. Corrected to `'array'`.
3. Anchor `dual_row_design_log_template_match_event`: spec said `format_string LIKE E'\t\t\t<%'` (three-tab opener); live KTX log_printf format strings have varied XML wrapper-level prefixes (two-tab `\t\t<event>\n`, one-tab `\t<events>\n`, etc.). Corrected to `LIKE '%<%>%'` (XML markup anywhere).

**Common cause:** Phase 7 MD's anchor probes were drafted from spec / source-walk projections rather than live dev DB shape. The same source-walk discipline that Pass 5 codified for handler authoring (per F9/F11/F12/F13 amendments) applies to anchor probe authoring: verify probe predicates against live data BEFORE shipping, not against spec paraphrase.

**Joins F23 + F27 as third instance:** F23 (Phase 2 probe 5 tab-depth), F27 (Pattern 9 banner-coverage), F29 (Phase 7 anchor probes) all instances of the same probe-spec-drift class. The recurrence pattern is durable enough to warrant its own playbook entry.

**Cross-reference:** F29 of `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` carries the Phase 7 anchor-probe corrections + the F23/F27/F29 sibling-class observation.

---

## Non-Visitor / non-libclang handler infrastructure (XSD / JSON manifest / YAML schema handlers)

Most Layer 1 handlers extend `extractor_lib._visitor.Visitor` and walk libclang TUs. A small minority don't -- they parse a non-C source-of-truth (XSD schema, JSON manifest, YAML config) and emit rows into the same dispatch infrastructure. KTX's `_handler_match_events.py` is the canonical case (per the KTX onboarding arc's D3 amendment 2026-05-05 + spec 5.6.c): XSD-driven, standalone with duck-typed Visitor lifecycle stubs.

When a future engine surfaces a similar non-Visitor / non-libclang handler need, two infrastructure conventions apply.

### Required lifecycle stubs (full 7-method list)

`extractor_lib._visitor.walk_tu_dispatch` calls 7 lifecycle methods on every visitor. A non-Visitor handler must duck-type all 7 (no-ops are fine for handlers that don't need libclang traversal):

```python
class XsdDrivenHandler:
    name = "<handler_name>"
    output_filename = "<project>-<type>-ast.json"

    def setup(self, repo_root, source_root):
        # Pre-fork eager work: parse XSD / JSON / YAML, populate handler state.
        ...

    # Visitor lifecycle stubs (called by walk_tu_dispatch -- duck-typed).
    def start_file(self, source_path, source_bytes): pass
    def end_file(self): return []
    def enter_function(self, cursor, variant): pass
    def exit_function(self, cursor, variant): pass
    def enter_compound(self, cursor, variant): pass
    def exit_compound(self, cursor, variant): pass
    def visit_cursor(self, cursor, variant): pass

    def finalize(self, all_rows, repo_root):
        # Post-fork merge: assemble rows from setup() state, return JSON-shaped dict.
        ...
```

**Common gotcha:** drop ANY of the 7 lifecycle methods and `walk_tu_dispatch` crashes mid-walk on the first compound statement (or first function, etc.). The KTX `_handler_match_events.py` initially shipped 5 stubs; the missing `enter_compound` / `exit_compound` were caught at integration time and drained inline (per F28 of the KTX onboarding arc).

### Transition-scan exclusion convention (load-version.ts)

`apps/qw-oracle/scripts/load-knowledge/load-version.ts` runs a state-transition scan that selects `vrow.source_file` from each per-type versions table. Handlers whose source-of-truth is NOT a C source file (XSD, JSON manifest, asset bundle, YAML schema) populate a different column instead -- e.g., `match_event_versions.xsd_path`, `asset_category_versions` (no source_file column at all). Trying to read `source_file` against these tables fails the SELECT.

**Convention:** add the entity type to the `load-version.ts` transition-scan exclusion list. Today's list: `options.type !== 'asset_category' && options.type !== 'match_event'`. Future entity types with non-C-source truth grow the list.

**Cross-arc verification gate:** Phase 7's cross-project audit reconciles the exclusion list against the full per-type versions table inventory: tables WITHOUT a `source_file` column MUST be in the exclusion list; tables WITH a `source_file` column MUST NOT be excluded. Any drift between the two surfaces as a finding.

**Cross-reference:** F28 of `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` carries the Phase 6 discovery + Phase 7 audit confirmation.

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

## Pre-Commit Discovery Cross-Check

After extraction has converged but before committing the new engine's first ship, run a wiki-versus-source cross-check on any candidate roster the brainstorm produced. The cross-check methodology is the KTX onboarding arc's Pass 5.4 deliverable -- the discipline that caught Pass-4 sketch errors and discriminated the "candidate mutator" set down to the right shipping inventory.

Procedure:

1. **Gather candidate inventory.** From the brainstorm, list every name-shape candidate (mutators, modes, taxonomies, struct-array entries) the design pass nominated. Format: `<token> | <source-claim> | <wiki-claim>`. Source-claim cells come from the source-registry leg of the Pre-Port Discovery Sweep; wiki-claim cells come from the community wiki rip (QWiki, ezQuake docs, MVDSV manual, etc. -- whatever the engine's contributor community maintains).

2. **Source-walk each candidate.** Open the source file the candidate names. Confirm: registration site present, struct-array entry present, value-set entry present -- whatever the candidate's shape requires. Note count. Note field names. Note adjacent context (#ifdef guards, conditional compilation paths, deprecation comments).

3. **Wiki-walk each candidate.** Open the wiki page or canonical community reference. Confirm: name spelling matches, semantic description matches, gating conditions match. Note any wiki-only attributes that don't appear in source (often Layer 3 candidates -- player-facing labels, community nicknames).

4. **Discriminate.** For each candidate, classify:
   - **Promote** (both legs agree; ship as a Layer 1 row): the canonical case.
   - **Demote** (source absence; wiki claims a name with no registration site): document in `OUT_OF_SCOPE.md` with the wiki citation, OR park as a future-arc candidate, OR flag as upstream wiki drift.
   - **Defer** (semantic ambiguity; source shape unclear without operator decision): surface to operator, do NOT ship until resolved.
   - **Reframe** (both legs disagree on facet, e.g., source has a struct field named `count_modifier` but Pass-4 sketch wrote `armor_for_kill` and live source actually carries `hp_for_kill` -- the two-amendment KTX case): land an amendment to the relevant `review-findings.md` anchor with the source-faithful name, then ship.

KTX's Pass 5.4 ran the cross-check on 4 mutator candidates discovered via the wiki rip vs. the source registry leg's list. Discrimination outcome: 1 promotion (`berzerk`), 3 demotions to `OUT_OF_SCOPE.md` (none of the other 3 had source registration). Without the cross-check, 3 spurious mutator rows would have shipped as "first-class entities" backed by no source registration -- silent data quality regression.

Cross-validation oracles by engine:
- **ezQuake**: ezquake.com/docs guide pages + `help_*.json` files in repo + community Discord history.
- **MVDSV**: Ciscon's MVDSV 1.20-dev cvarlist dump (archived) + the MVDSV manual page on QWiki.
- **FTE**: FTE wiki + `console.cfg` defaults + plugin-side configs.
- **QWCL**: 1996-vintage Quake reference materials + `progs.dat` documentation.
- **KTX**: QWiki `Server_modifications#KTX` page + the `resources/example-configs/ktx/` checked-in configs + community match logs.

Treat the cross-check as a phase-boundary verification step, not an optional polish pass. The discrimination it forces (Promote / Demote / Defer / Reframe) is the same discipline the F-anchor amendment system in `review-findings.md` enforces during phase drafting -- both exist to catch the gap between sketch and source before shipping.

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

**QuakeC (.qc) sources:** the dusty-ktx fork includes a `qcsrc/` QuakeC tree (canonical KTX is pure C). QuakeC is a distinct language; libclang cannot parse it. Requires `py-tree-sitter` with a QuakeC grammar or a dedicated lexer when dusty-ktx onboarding ships -- separate methodology, separate runbook. User-loaded `progs.dat` from mods is fundamentally out of static reach regardless.

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

**Cross-codebase port (e.g., FTE was a fresh port; canonical KTX is the next):** start fresh in `<project>/_handler_*.py`. Inherit from `Visitor` only (no parent project import). Steps 1-9 below apply unchanged.

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

## Cross-project audit cadence

Run the cross-project audit (via the `validate-extractor` skill in cross-project mode) after every arc that:

- adds a new project, OR
- adds a new entity type, OR
- ships a schema migration, OR
- modifies `extractor_lib/` or `load-version.ts` (cross-cutting infrastructure).

Skip the audit for per-handler tweaks within a single project that don't touch shared infrastructure. Per-project-only changes cannot regress sibling projects.

Audit output lands at: `docs/superpowers/reviews/YYYY-MM-DD-<arc>-cross-project-audit.md`.

Rationale: extraction work is arc-based, not calendar-based. The four triggers above are the cases where prior-engine regressions are actually possible -- a new project imports `extractor_lib` and exercises code paths the other four don't; a schema migration reshapes loader inputs all projects depend on; a `load-version.ts` change touches every project's loader path. Per-project-only handler changes cannot affect siblings. For the broader principle behind this trigger set, see operator memory `feedback_retrofit_later_discipline.md`.

Most recent audit: `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` (five-engine state at KTX onboarding arc close, 2026-05-06).

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
