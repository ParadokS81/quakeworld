# Phase 1 -- QWFWD extractor + vendored load path (the tracer bullet)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). DONE.
> 2. Read `review-findings.md`; identify which findings apply: F2 (load-version bypass), F5 (--commit fallback), F6 (Cvar_Get exclusion), F7 (counts are extractor truth). DONE.
> 3. Run live recon (Read/grep) on all real source files this phase touches. DONE. See verification sub-agent notes in Open questions.
> 4. After drafting, dispatch the verification sub-agent. DONE -- `Agent` tool unavailable in this session; verification performed directly by the drafter. See Open questions for findings.

## Goal

This phase delivers the QWFWD libclang extractor on `extractor_lib` rails, emits per-type JSON to `apps/qw-oracle/scripts/extractors/qwfwd/output/`, and loads those files into Postgres via `load-version --json` -- establishing the vendored load path as a reusable recipe Phase 2 inherits verbatim. The arc's tracer-bullet purpose is to prove the `load-version --json` chain works end-to-end from C source through to MCP-queryable rows, using the lower-risk libclang extractor before Phase 2 adds the novel Go front-end. At phase boundary: QWFWD L1 rows are loaded in Postgres, `lookup_entity` returns a known knob, re-extract is reproducible (empty `git diff`), re-load is idempotent (no new rows), `build-snapshot.ts` compiles clean with the real version label.

## Inputs from previous phase

Phase 0 outputs (all must be verified before Phase 1 begins):
- Postgres schema accepts `project IN ('qwfwd','qtv')` on all 10 CHECK columns (migration 020 applied).
- `bunx tsc --noEmit` exits 0 with the widened Project union and all 12 Record sites filled.
- `SCHEMA.md` documents qtv/qwfwd as projects 6-7.
- `PROJECT_DEFAULT_SNAPSHOT_VERSION` in `build-snapshot.ts` uses `'head'` as a provisional placeholder for both new projects.
- No `versions` row for `qwfwd` exists yet (Phase 0 explicitly deferred versions rows to Phase 1/2 first load).
- Phase 0 open question Q4 carry-forward: `--ordinal` is required on first load for any non-`head` version not yet in the `versions` table (verified: `index.ts:170` throws when the row is absent).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/qwfwd/                       # new directory
apps/qw-oracle/scripts/extractors/qwfwd/extract.py             # driver, mirrors mvdsv/extract.py shape
apps/qw-oracle/scripts/extractors/qwfwd/_handler_cvars.py      # Cvar_Get/Cvar_FullSet registration detection
apps/qw-oracle/scripts/extractors/qwfwd/_handler_commands.py   # Cmd_AddCommand registration detection
apps/qw-oracle/scripts/extractors/qwfwd/_handler_cmdline.py    # positional argv[1]/argv[2] args
apps/qw-oracle/scripts/extractors/qwfwd/_handler_info_keys.py  # Info_* literal-key call sites
apps/qw-oracle/scripts/extractors/qwfwd/output/                # new directory; extractor writes here
```

### Modified

```
apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py  # add clang_args_qwfwd_for() + Win variant
apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts          # update qwfwd: 'head' -> qwfwd: '1.40-dev'
```

### Deleted

```
n/a
```

## Tasks

---

### Task 1 -- Add `clang_args_qwfwd_for()` to `extractor_lib/clang_config.py`

**Goal:** Define the compiler flags needed for libclang to parse QWFWD's `src/*.c` files correctly.

**Files:** `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py`

**Steps:**

- [ ] Append the following block to `clang_config.py` after the KTX section (around line 332). No existing functions are modified. The single-source-dir layout mirrors KTX (both are simple C projects with no submodule header trees).

```python
# ---------- QWFWD (apps/slipgate-app/reference/qwfwd/) ----------
#
# UDP QW forwarder/proxy. Vendored frozen snapshot; no .git dir.
# Version: QWFWD_VERSION "qwfwd 1.40-dev" (qwfwd.h:117).
#
# CMakeLists.txt target_include_directories is empty -- the entire
# codebase lives in a flat src/ directory, all headers are peers.
# No project-level defines are set in the CMakeLists (-D args are absent);
# QWFWD relies on POSIX availability and the compiler's built-ins.
#
# Platform split: two variants.
#   1. Server-base (Unix/POSIX): no extra defines.
#   2. Server+Win: -D_WIN32 + Windows SDK stubs for sys.c and net.c
#      which include <winsock2.h> under #ifdef _WIN32.
# All registration sites verified to be unconditional (not platform-gated):
#   - main.c Cvar_Get block (lines 126-133) has no surrounding #ifdef.
#   - net.c Cvar_Get/FullSet block (lines 277-284) has no surrounding #ifdef.
#   - query.c Cvar_Get block (lines 697-700) has no surrounding #ifdef.
#   - Cmd_AddCommand sites across ban.c/cmd.c/main.c/peer.c/query.c/
#     whitelist.c/cvar.c are unconditional.
# Therefore a single-variant base parse is sufficient; the Win variant
# is provided for completeness (it does not add new registration sites).

def clang_args_qwfwd_for(qwfwd_src_dir: str) -> list[str]:
    """Base (POSIX) variant for QWFWD src/ tree.

    qwfwd_src_dir is the absolute path to
    apps/slipgate-app/reference/qwfwd/src/; all .h headers
    live here as peers of the .c files (flat layout, no submodule).

    No project-level #define macros are needed -- CMakeLists.txt ships
    none and all registration sites are unconditionally compiled.
    """
    return [
        "-x", "c",
        f"-I{qwfwd_src_dir}",
        "-w",
    ]


def clang_args_qwfwd_win_for(qwfwd_src_dir: str) -> list[str]:
    """Windows variant: adds _WIN32 and Windows SDK stubs.

    Activates sys.c and net.c Windows code paths (winsock2.h include
    under #ifdef _WIN32). No registration sites are gated behind
    these guards (verified by source walk), so this variant is
    correctness-additive, not coverage-additive. Mirrors the MVDSV
    Windows variant pattern.
    """
    return clang_args_qwfwd_for(qwfwd_src_dir) + [
        "-D_WIN32",
        f"-I{_STUBS_WINDOWS}",
    ]
```

**Verification (task-level):** `grep -n "clang_args_qwfwd_for\|clang_args_qwfwd_win_for" apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py` returns exactly 2 matches (the two function defs). Python syntax check: `python3 -c "import ast; ast.parse(open('apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py').read())"` exits 0.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis from a clear spec; 1 file append; must correctly derive include flags from CMakeLists.txt inspection.

---

### Task 2 -- Scaffold `scripts/extractors/qwfwd/extract.py` driver

**Goal:** Write the `qwfwd/extract.py` extraction driver, mirroring the mvdsv driver shape.

**Files:** `apps/qw-oracle/scripts/extractors/qwfwd/extract.py`

**Key differences from mvdsv/extract.py (verified by live recon):**
- Source root: `apps/slipgate-app/reference/qwfwd/src/` (vendored, not research/repos/)
- Source files: all `src/*.c` including `cvar.c` and `cmd.c` (handlers filter out their own machinery)
- Variant functions: `clang_args_qwfwd_for` (base) + `clang_args_qwfwd_win_for` (Windows) -- two variants, not three
- All variants dispatch as `variant="server"` (QWFWD is server-only)
- Handler import names: `CvarsQwfwdHandler`, `CommandsQwfwdHandler`, `CmdlineQwfwdHandler`, `InfoKeysQwfwdHandler`
- SOURCE_ROOT_LABEL: `"server"` (matches MVDSV convention; QWFWD is also server-only)
- Default repo path: `HERE.parent.parent.parent.parent.parent.parent / "apps/slipgate-app/reference/qwfwd"` (relative to the extractor_lib grandparent; adjust to reach monorepo root + reference path)
- Default output dir: `HERE / "output"`

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/extractors/qwfwd/extract.py`. The file follows mvdsv/extract.py structurally: same module docstring pattern, same worker-state globals, same pre-fork/parallel/serial pattern, same finalize loop. Differences:
  - Import `clang_args_qwfwd_for, clang_args_qwfwd_win_for` instead of the mvdsv variants.
  - Import the four QWFWD handlers: `CvarsQwfwdHandler`, `CommandsQwfwdHandler`, `CmdlineQwfwdHandler`, `InfoKeysQwfwdHandler`.
  - `VARIANT_FUNCS` has two entries (base + win), both dispatching as `"server"`.
  - `_list_source_files(qwfwd_src)` returns `sorted(qwfwd_src.glob("*.c"))` -- all top-level `src/*.c`.
  - `setup()` call passes `qwfwd_repo=qwfwd_repo, qwfwd_src=qwfwd_src` (not mvdsv_ prefix).
  - Worker globals: `_WORKER_CLANG_BASE` + `_WORKER_CLANG_WIN` (two, not three).
  - Default path sentinel: points to `apps/slipgate-app/reference/qwfwd`.

Full file content (subagent writes the complete file following the above spec and mirroring mvdsv/extract.py precisely). The two important invariants to keep:
  1. Pre-fork globals pattern (fork mode copy-on-write, no pickling).
  2. `h.setup(qwfwd_repo=qwfwd_repo, qwfwd_src=qwfwd_src)` called in parent before fork.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; clear mvdsv/extract.py template; primary judgment is the driver wiring adaptation.

---

### Task 3 -- Write `_handler_cvars.py`

**Goal:** Detect `Cvar_Get(name, default, flags)` and `Cvar_FullSet(name, default, flags)` registration call sites in QWFWD `src/*.c`, excluding `cvar.c`'s own implementation (F6).

**Files:** `apps/qw-oracle/scripts/extractors/qwfwd/_handler_cvars.py`

**Recon summary (verified):**

Registration sites (across all source files EXCEPT `cvar.c`):
- `main.c:126-133` -- 8 `Cvar_Get` call sites with literal string names (developer, *version, hostname, maxclients, hostport, countrycode, city, coords)
- `net.c:277-284` -- 2 `Cvar_Get` + 2 `Cvar_FullSet` sites for net_ip and net_port (the FullSet path is a command-line-override variant that registers the same cvar; both paths produce the same entity)
- `query.c:697-700` -- 4 `Cvar_Get` sites (masters_query, masters_heartbeat, masters, masters_filter_servers)

The `cvar.c` file contains: (a) the `Cvar_Get` function definition at line 98, (b) a recursive `Cvar_Get` call at line 228 (pass-through), and (c) `Cvar_FullSet` definition at line 222. These are the cvar subsystem itself, not registration sites. (F6)

Expected entity count after dedup: approximately 12-14 unique cvars.
Note: `net_ip` and `net_port` each appear via both `Cvar_Get` and `Cvar_FullSet` in `net.c`. These are the same cvar registered conditionally; the handler should emit one entity per unique name (first-wins dedup handles this naturally).

**The QWFWD pattern is `CALL_EXPR` detection on `Cvar_Get` and `Cvar_FullSet` -- NOT `VAR_DECL` detection.** QWFWD uses dynamic registration (function call returning `cvar_t*`), not the MVDSV/ezQuake struct-init pattern. This is a different idiom from MVDSV's Pattern 1 (`cvar_t name = {"name", "default", flags};`). QWFWD's handlers must subclass `Visitor` directly (cross-codebase port, not a MVDSV fork).

**F6 exclusion strategy:** The handler MUST exclude `cvar.c`. The simplest approach: in `start_file()`, record the current source path; in `visit_cursor()`, skip if `self._is_cvar_machinery_file`. The condition is: `source_path.name == "cvar.c"`. This is correct because the Cvar_Get function body in `cvar.c` is the implementation, and calling `Cvar_Get` inside `cvar.c` line 228 is the recursive-call pass-through. Neither is a user-facing cvar registration.

Alternative approach (also acceptable): detect on call sites only, then check that the first argument is a string literal AND that the enclosing function is NOT `Cvar_Get` itself (i.e., not the recursive-call site). The file-exclusion approach is simpler and more robust for a fresh cross-codebase port.

**AST field shape emitted (must match `load-cvars.ts` `buildCvarVersionRow` exactly):**

```json
{
  "vars": [
    {
      "name": "hostname",
      "ast": {
        "default_value": "unnamed qwfwd",
        "flags_raw": "CVAR_SERVERINFO",
        "flag_names": ["CVAR_SERVERINFO"],
        "on_change": null,
        "source_file": "src/main.c",
        "source_line": 128,
        "source_column": 13,
        "storage_class": null,
        "trailing_comment": null
      }
    }
  ],
  "_stats": { "source_total": 16, "count": 13, "with_flags": 8, "with_onchange": 0, "with_trailing_comment": 0 }
}
```

The `load-cvars.ts` adapter reads: `ast.default_value`, `ast.flags_raw`, `ast.flag_names`, `ast.on_change`, `ast.source_file`, `ast.source_line`, `ast.source_column`, `ast.storage_class`, `ast.trailing_comment`. All must be present (null-ok).

The flag constants in QWFWD (`CVAR_SERVERINFO`, `CVAR_READONLY`, `CVAR_NOSET`, `CVAR_ARCHIVE`, `CVAR_USER_CREATED`) are plain integers defined in `cvar.h:58-64`. `normalize_flags_raw` from `extractor_lib._cvar_shared` handles the raw text; `parse_flag_names` parses the symbolic names. Import both from `extractor_lib._cvar_shared` as MVDSV does.

**Cvar_FullSet handling note:** `Cvar_FullSet` has the same call shape as `Cvar_Get` (name, default, flags). The handler detects both APIs in `REGISTRATION_APIS`. The per-file `_seen_in_file` set ensures `net_ip` and `net_port` are emitted once (first-wins).

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/extractors/qwfwd/_handler_cvars.py`.
- [ ] Subclass `Visitor` (cross-codebase port, NOT MVDSV subclass).
- [ ] Class attributes: `name = "cvars"`, `output_filename = "qwfwd-variables-ast.json"`, `payload_field = "vars"`.
- [ ] Detection APIs (class attribute): `REGISTRATION_APIS: tuple = ("Cvar_Get", "Cvar_FullSet")`.
- [ ] `setup(*, qwfwd_repo, qwfwd_src)`: store repo root.
- [ ] `start_file(*, source_path, source_bytes)`: call `super().start_file(...)`, reset `self._rows`, `self._seen_in_file`, set `self._is_cvar_machinery = (source_path.name == "cvar.c")`.
- [ ] `visit_cursor(cursor, variant)`:
  - If `self._is_cvar_machinery`: return immediately (F6 exclusion).
  - Match `CursorKind.CALL_EXPR` with `cursor.spelling in self.REGISTRATION_APIS`.
  - `args = list(cursor.get_arguments())`, require at least 2.
  - `name_raw = read_extent(source_bytes, args[0].extent).strip()` -> strip_quotes -> validate non-empty.
  - Dedup: skip if `name in self._seen_in_file`.
  - `default_raw = read_extent(source_bytes, args[1].extent).strip()` -> `unescape_c_string(strip_quotes(...))`.
  - If `len(args) >= 3`: `flags_raw = normalize_flags_raw(read_extent(...))`, `flag_names = parse_flag_names(flags_raw)`.
  - `args[3]` if present: resolve on_change function reference (same pattern as MVDSV: `ref.referenced`).
  - Emit row shape as shown above.
  - Add name to `_seen_in_file`.
- [ ] `_relative_source(abs_path)`: relative to repo root, fallback to absolute.
- [ ] `end_file()`: return rows, reset state.
- [ ] `finalize(*, all_rows, repo_root)`: cross-file first-wins dedup by name, sort by name, emit stats. Return `{"vars": unique, "_stats": {...}}`.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis from clear spec; 1 file; primary judgment is CALL_EXPR detection vs VAR_DECL detection (different from MVDSV but well-specified).

---

### Task 4 -- Write `_handler_commands.py`

**Goal:** Detect `Cmd_AddCommand("name", fn)` registration call sites in QWFWD `src/*.c`, excluding `cmd.c`'s and `cvar.c`'s machinery.

**Files:** `apps/qw-oracle/scripts/extractors/qwfwd/_handler_commands.py`

**Recon summary (verified):**

Registration sites by file:
- `ban.c`: 7 Cmd_AddCommand lines (addip, removeip, listip, writeip, banip, banremove, banlist -- NOTE ban.c line 508 has a commented-out `// Cvar_Register(&filterban);` which is irrelevant)
- `cmd.c`: 14 lines of Cmd_AddCommand -- 9 are genuine registrations (exec, echo, alias, wait, cmdlist, help, unaliasall, unalias, if) at lines 1071-1079, plus 5 machinery sites (function definition at line 693, error checks at 699/705/717, and function banner at 690). The handler must exclude `cmd.c`'s machinery via the same `source_path.name == "cmd.c"` exclusion -- but this would drop the 9 genuine registrations. **Revised approach:** the handler should NOT do a file-level exclusion of `cmd.c`. Instead, the CALL_EXPR filter naturally catches only `Cmd_AddCommand` calls with a literal string first arg and a function-reference second arg, which the machinery sites (function definition, error/printf calls) do not match. The 9 genuine registrations at lines 1071-1079 DO match (literal name, function ref) and SHOULD be extracted.
- `cvar.c`: 5 Cmd_AddCommand lines -- all are genuine registrations (cvarlist, toggle, set, inc, cvar_hash_print) at lines 524-530. These are genuine admin commands; `cvar.c` is excluded from cvars extraction (F6 -- its `Cvar_Get` machinery) but `cvar.c`'s `Cmd_AddCommand` lines are real registrations the command handler SHOULD capture.
- `main.c`: 2 (quit, serverinfo)
- `peer.c`: 1 (cllist)
- `whitelist.c`: 4 (whitelist, whitelistadd, whitelistremove, whitelistpurge)
- `query.c`: 2 (svlist, heartbeat)

**Summary:** `cmd.c`'s machinery (function definition, error messages, printf calls) does NOT produce CALL_EXPR cursors with Cmd_AddCommand spelling -- those are FUNCTION_DECL, CALL_EXPR for Sys_Error/Sys_Printf, etc. The handler's CALL_EXPR filter does the right thing naturally for both `cmd.c` and `cvar.c`. No file-level exclusion needed for the commands handler.

Expected count: approximately 30 commands (ban=7, cmd=9, cvar=5, main=2, peer=1, whitelist=4, query=2 = 30). This arithmetic is an orientation estimate ONLY -- per F7 the extractor's actual count is the truth, not a target to hit. Do NOT hardcode a per-file target (e.g. "6 from ban.c"); the handler detects every `Cmd_AddCommand` registration site and the count falls out. Record whatever the extractor finds as the V4 baseline.

Banner harvest (Pattern 9): QWFWD source uses C-style Doom-pattern comments in cmd.c and ban.c around function definitions. Mirror the MVDSV handler's `_function_banner` approach -- emit `_fn_def` rows for FUNCTION_DECL definitions, merge in `finalize()`. Coverage is best-effort.

**AST field shape (must match `load-commands.ts` `buildCommandVersionRow`):**

```json
{
  "commands": [
    {
      "name": "addip",
      "ast": {
        "handler_fn": "SV_AddIP_f",
        "source_file": "src/ban.c",
        "source_line": 510,
        "description": "...",
        "source_column": null
      }
    }
  ],
  "_stats": { ... }
}
```

The `load-commands.ts` adapter reads: `ast.handler_fn`, `ast.source_file`, `ast.source_line`, `ast.description`, `ast.source_column`. All must be present (null-ok). `ast.enclosing_function` is also read (mapped to `registration_file` column) but is not expected from QWFWD commands.

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/extractors/qwfwd/_handler_commands.py`.
- [ ] Subclass `Visitor` (cross-codebase port).
- [ ] Class attributes: `name = "commands"`, `output_filename = "qwfwd-commands-ast.json"`, `payload_field = "commands"`, `REGISTRATION_API: str = "Cmd_AddCommand"`.
- [ ] `setup(*, qwfwd_repo, qwfwd_src)`: store repo root.
- [ ] `start_file(*, source_path, source_bytes)`: reset `_rows`, `_seen_cmds_in_file`, `_seen_fns_in_file`.
- [ ] `visit_cursor(cursor, variant)`: mirror the MVDSV commands handler structure:
  - Track `FUNCTION_DECL` definitions for banner harvest (Pattern 9 + Pattern 13).
  - Detect `CALL_EXPR` with `cursor.spelling == self.REGISTRATION_API`.
  - Extract literal-string first arg (skip non-literal args like variable references).
  - Resolve handler function from second arg via `resolve_fn_ref`.
  - Emit `_cmd` rows and `_fn_def` rows as separate `_kind` entries.
- [ ] `end_file()`: return rows, reset.
- [ ] `finalize(*, all_rows, repo_root)`: partition `_fn_def` vs `_cmd`, merge handler -> description, cross-file first-wins dedup. Return `{"commands": out_rows, "_stats": {...}}`.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; MVDSV handler is the direct template; primary judgment is verifying no file-exclusion is needed for cmd.c/cvar.c commands.

---

### Task 5 -- Write `_handler_cmdline.py`

**Goal:** Detect QWFWD's two positional command-line arguments: port (argv[1]) and ip (argv[2]).

**Files:** `apps/qw-oracle/scripts/extractors/qwfwd/_handler_cmdline.py`

**Recon summary (verified):**

QWFWD does NOT use `COM_CheckParm` for command-line detection. It uses direct `argv[1]` and `argv[2]` positional argument access in `main.c:228-229`. There is no manifest header equivalent. The positional nature means this is NOT a CALL_EXPR detection pattern -- these are array subscript expressions.

Given the unusual idiom (direct argv indexing, not COM_CheckParm), the handler takes a different approach: **static specification rather than AST detection**. The two positional args are a fixed, well-understood API surface with no risk of drift (there are exactly two, hardcoded in main.c, and described in the usage string at main.c:224). The handler emits them directly in `finalize()` based on pre-verified source knowledge, with `source_file`/`source_line` pointing to the actual argv access sites.

This approach is appropriate because: the positional-arg idiom produces no CALL_EXPR cursor with a literal name argument, so libclang detection would require complex data-flow analysis. The two args are permanently fixed -- the usage string at `main.c:224` shows `"Usage: %s [port [ip]]\n"`, and the assignments at lines 228-229 are the canonical source. The static spec approach is simpler, more maintainable, and produces identical extraction quality.

**AST field shape (must match `load-cmdline-params.ts` `buildCmdlineParamVersionRow`):**

The adapter (`load-cmdline-params.ts`) reads ONLY `ast.source_file`, `ast.source_line`, `ast.source_column` (it first looks for `ast.usage_sites[0]` as the primary site -- absent here -- then falls back to the flat `ast.source_file`/`source_line`, the path MVDSV's cmdline rows also use). There is NO `containing_function` column for `cmdline_param`, so the `enclosing_function` and `description` fields in the shape below are emitted into the `ast` blob for **provenance only**: they fold into `raw_ast_hash` but do NOT surface as queryable columns. Emit them anyway (harmless, useful provenance), but do not treat them as adapter-read columns. The user-facing description for these params is authored later by the Phase 3 describe pass, not by the extractor.

```json
{
  "params": [
    {
      "name": "[ip]",
      "ast": {
        "source_file": "src/main.c",
        "source_line": 229,
        "source_column": null,
        "enclosing_function": "main",
        "description": "Local IP address on which QWFWD will listen. Optional; defaults to all interfaces (0.0.0.0). Takes the second positional argument when present and when it does not start with - or +."
      }
    },
    {
      "name": "[port]",
      "ast": {
        "source_file": "src/main.c",
        "source_line": 228,
        "source_column": null,
        "enclosing_function": "main",
        "description": "UDP port on which QWFWD will listen. Optional; defaults to QWFWD_DEFAULT_PORT (30000). Takes the first positional argument when present."
      }
    }
  ],
  "_stats": { "source_total": 2, "count": 2 }
}
```

Note: the `[port]` and `[ip]` names with square brackets follow the Unix optional-arg convention shown in the usage string. The loader treats these as entity names verbatim (they are unique in QWFWD's entity namespace).

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/extractors/qwfwd/_handler_cmdline.py`.
- [ ] Subclass `Visitor` (cross-codebase port). All lifecycle methods are no-ops except `finalize`.
- [ ] Class attributes: `name = "cmdline"`, `output_filename = "qwfwd-cmdline-params-ast.json"`, `payload_field = "params"`.
- [ ] `setup(*, qwfwd_repo, qwfwd_src)`: store `_repo_root`, `_src_root`.
- [ ] All lifecycle methods (`start_file`, `visit_cursor`, `end_file`, `enter_function`, `exit_function`, `enter_compound`, `exit_compound`): minimal no-op stubs (required by `walk_tu_dispatch`).
- [ ] `finalize(*, all_rows, repo_root)`: emit the two hardcoded entries above. `source_file` paths are relative to the repo root (the standard `_relative_source` pattern). Returns `{"params": [...], "_stats": {...}}`.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; simple handler; primary judgment is choosing static-spec over fragile argv-walk and ensuring the 7-method stub contract is complete (per EXTRACTOR-PLAYBOOK.md non-Visitor handler requirement).

---

### Task 6 -- Write `_handler_info_keys.py`

**Goal:** Detect `Info_*` call sites with literal string keys in QWFWD `src/*.c`, classifying scope from the first argument.

**Files:** `apps/qw-oracle/scripts/extractors/qwfwd/_handler_info_keys.py`

**Recon summary (verified):**

QWFWD Info_* call sites with literal key names (excluding `info.c` implementation sites):
- `peer.c:76` -- `Info_ValueForKey(userinfo, "name", ...)` -- scope=userinfo, op=read
- `clc.c:116` -- `Info_SetValueForKey(biguserinfo, "challenge", ...)` -- scope=userinfo, op=write
- `svc.c:228` -- `Info_ValueForKey(userinfo, "protocol", ...)` -- scope=userinfo, op=read
- `svc.c:232` -- `Info_ValueForKey(userinfo, "qport", ...)` -- scope=userinfo, op=read
- `svc.c:235` -- `Info_ValueForKey(userinfo, "challenge", ...)` -- scope=userinfo, op=read
- `svc.c:247` -- `Info_ValueForKey(userinfo, QWFWD_PRX_KEY, ...)` -- non-literal key (QWFWD_PRX_KEY = "prx" macro); Pattern 1 detection skips this, Pattern 6 macro resolution would recover it; see open question Q-INFO
- `svc.c:264` -- `Info_SetValueForKeyEx(userinfo, QWFWD_PRX_KEY, ...)` -- non-literal (same)
- `svc.c:290` -- `Info_SetValueForStarKey(userinfo, "*qwfwd", ...)` -- scope=userinfo, op=write; literal key `*qwfwd`

Additionally, `main.c:57` and `main.c:88` have `Info_ValueForKey(ps.info, Cmd_Argv(1), ...)` and `Info_SetValueForKey(ps.info, key, ...)` -- non-literal key names, skipped by Pattern 1.

`cvar.c:187-189` -- `Info_ValueForKey(ps.info, var->name, ...)` and `Info_SetValueForStarKey(ps.info, var->name, ...)` -- non-literal (var->name is a struct field), skipped.

Scope classification: `ps.info` and `biguserinfo` -- `ps.info` is the proxy's serverinfo structure (see `main.c:75-90` context); `biguserinfo` is constructed from outgoing userinfo data in `clc.c`. For `ps.info` context: the `SV_Serverinfo_f` command and the cvar update loop use `ps.info` as the serverinfo string -- scope is `serverinfo`. For `biguserinfo` (clc.c): the context is outgoing connect data to a QW server -- scope is `userinfo`.

The MVDSV `_classify_scope` helper maps scope from first-arg text. QWFWD uses: "userinfo" (substring present in `userinfo`, `biguserinfo`), and "svs.info" / "serverinfo" are absent -- QWFWD uses `ps.info` for its proxy serverinfo. The scope classifier needs a QWFWD-specific addition: "ps.info" -> `serverinfo`. This is a subclass override of `_classify_scope` or an inline extension.

The API_OP_MAP mirrors MVDSV's but with a QWFWD-specific addition: `Info_SetValueForKeyEx` (svc.c:264) maps to `write`.

**Expected literal-key entities (with Pattern 1 only, QWFWD_PRX_KEY deferred to Q-INFO):**
- `challenge:userinfo` (userinfo read + write across svc.c + clc.c)
- `name:userinfo` (userinfo read)
- `protocol:userinfo` (userinfo read)
- `qport:userinfo` (userinfo read)
- `*qwfwd:userinfo` (userinfo write)

That is 5 info_key entities (Pattern 1, literal keys only). With macro resolution of `QWFWD_PRX_KEY` = "prx", two more sites would add `prx:userinfo` (read + write). Q-INFO below flags this.

**AST field shape (must match `load-info-keys.ts` exactly):**

```json
{
  "info_keys": [
    {
      "name": "challenge:userinfo",
      "bare_name": "challenge",
      "ast": {
        "scope": "userinfo",
        "operations": ["read", "write"],
        "source_file": "src/svc.c",
        "source_line": 235,
        "containing_function": "SVC_DirectConnect",
        "all_call_sites": [
          {"source_file": "src/svc.c", "source_line": 235, "operation": "read"},
          {"source_file": "src/clc.c", "source_line": 116, "operation": "write"}
        ]
      }
    }
  ],
  "_stats": { "source_total_call_sites": 7, "count": 5, "by_scope": {"userinfo": 5} }
}
```

The `load-info-keys.ts` adapter reads: `ast.scope`, `ast.operations` (JSON-stringified TEXT), `ast.source_file`, `ast.source_line`, `ast.containing_function`, `ast.all_call_sites` (JSONB column). `entry.name` is the `<bare>:<scope>` suffixed form. `entry.bare_name` is the unsuffixed form.

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/extractors/qwfwd/_handler_info_keys.py`.
- [ ] Subclass `Visitor` (cross-codebase port).
- [ ] Class attributes: `name = "info_keys"`, `output_filename = "qwfwd-info-keys-ast.json"`, `payload_field = "info_keys"`.
- [ ] `API_OP_MAP` -- mirrors MVDSV's plus `"Info_SetValueForKeyEx": "write"` (QWFWD-specific variant seen in svc.c:264).
- [ ] `_classify_scope` override: add `if "ps.info" in s: return "serverinfo"` before the other checks (QWFWD's proxy serverinfo uses `ps.info`, not `svs.info`).
- [ ] Exclude `info.c` via file-level check in `start_file` (mirrors the F6 pattern; `info.c` contains the Info_* implementation, not registrations).
- [ ] `setup`, `start_file`, `visit_cursor`, `end_file`, `finalize` -- mirror MVDSV `_handler_info_keys.py` structure exactly, substituting `qwfwd_repo`/`qwfwd_src` for `mvdsv_repo`/`mvdsv_src`.
- [ ] Canonical name convention: `<bare>:<scope>` with `bare_name` at top level (same as MVDSV, inherited from Pattern 14).

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis; MVDSV info_keys handler is the direct template; primary judgment is scope-classifier extension for `ps.info` and API_OP_MAP extension for `Info_SetValueForKeyEx`.

---

### Task 7 -- The vendored `load-version --json` procedure (the reusable recipe)

**Goal:** Document and verify the complete `load-version --json` load sequence for QWFWD. This is the reusable recipe Phase 2 inherits verbatim (with `qwfwd` -> `qtv` and the respective version label substituted).

**Files:** (documentation task, no new files; the recipe lives in this phase MD as a reusable reference)

**Version label (D4):** `QWFWD_VERSION_SHORT` = `"1.40-dev"` (verified: `qwfwd.h:118`). The version label for `--version` is `1.40-dev`. The long form `"qwfwd 1.40-dev"` from `QWFWD_VERSION` is the serverinfo value, not the version label.

**Commit sentinel (D4/F5):** No `.git` dir exists (verified: `ls apps/slipgate-app/reference/qwfwd/.git` returns nothing). The upstream sha is not recorded in the tree. D4 fallback: use the version constant string as the commit sentinel. `--commit 1.40-dev`.

**`--ordinal` requirement (Q4 carry-forward):** This is the first-ever load of QWFWD; no `versions` row exists. `index.ts:170` throws `'--ordinal is required for tagged versions not yet in the versions table'` when the version is not `head` and the row is absent. Must pass `--ordinal 1`.

**Output files (from extract.py):**
```
apps/qw-oracle/scripts/extractors/qwfwd/output/qwfwd-variables-ast.json     # cvars
apps/qw-oracle/scripts/extractors/qwfwd/output/qwfwd-commands-ast.json      # commands
apps/qw-oracle/scripts/extractors/qwfwd/output/qwfwd-cmdline-params-ast.json # cmdline params
apps/qw-oracle/scripts/extractors/qwfwd/output/qwfwd-info-keys-ast.json     # info keys
```

---

**REUSABLE LOAD RECIPE -- Phase 2 inherits this verbatim (substitute qtv for qwfwd and the QTV version label)**

```bash
# Step 0: Run the extractor (from monorepo root)
cd apps/qw-oracle/scripts/extractors/qwfwd
python3 extract.py \
  --repo-root ../../../../slipgate-app/reference/qwfwd \
  --output-dir output \
  --handlers all \
  --workers 4

# Verify: output/*.json files exist and are non-empty
ls -la output/

# Step 1: Load cvars
cd /path/to/monorepo/apps/qw-oracle
bun scripts/load-knowledge/index.ts load-version \
  --project qwfwd \
  --version 1.40-dev \
  --type cvar \
  --json scripts/extractors/qwfwd/output/qwfwd-variables-ast.json \
  --commit 1.40-dev \
  --ordinal 1

# Step 2: Load commands
bun scripts/load-knowledge/index.ts load-version \
  --project qwfwd \
  --version 1.40-dev \
  --type command \
  --json scripts/extractors/qwfwd/output/qwfwd-commands-ast.json \
  --commit 1.40-dev \
  --ordinal 1

# Step 3: Load cmdline params
bun scripts/load-knowledge/index.ts load-version \
  --project qwfwd \
  --version 1.40-dev \
  --type cmdline_param \
  --json scripts/extractors/qwfwd/output/qwfwd-cmdline-params-ast.json \
  --commit 1.40-dev \
  --ordinal 1

# Step 4: Load info keys
bun scripts/load-knowledge/index.ts load-version \
  --project qwfwd \
  --version 1.40-dev \
  --type info_key \
  --json scripts/extractors/qwfwd/output/qwfwd-info-keys-ast.json \
  --commit 1.40-dev \
  --ordinal 1
```

**Expected output per load-version call:** JSON summary with `inserted`, `updated`, `dropped`, `errors` counts. `errors: 0` is the pass condition. `inserted > 0` on first load.

**Phase 2 substitution:** Replace `qwfwd` with `qtv`, `1.40-dev` with the QTV version label (verified in Phase 2 source recon), and `qwfwd-*-ast.json` with `qtv-*-ast.json`. The `--ordinal 1` and `--commit <version-label>` pattern applies identically (QTV is also a frozen vendored snapshot with no .git dir).

---

**Steps:**

- [ ] Verify the JSON payload field names emitted by each handler match what `load-version.ts` dispatches:
  - `cvar`: payload field `"vars"` -> `CVAR_PAYLOAD_FIELD = 'vars'` in `load-cvars.ts:17` (verified).
  - `command`: payload field `"commands"` -> `COMMAND_PAYLOAD_FIELD = 'commands'` in `load-commands.ts:8` (verified).
  - `cmdline_param`: payload field `"params"` -> `CMDLINE_PARAM_PAYLOAD_FIELD = 'params'` in `load-cmdline-params.ts:8` (verified).
  - `info_key`: payload field `"info_keys"` -> `INFO_KEY_PAYLOAD_FIELD = 'info_keys'` in `load-info-keys.ts:23` (verified).
- [ ] Confirm `--type` argument spelling matches the `EntityType` values the loader dispatches on (verified from `index.ts:199` cast: `values.type as EntityType`; EntityType is `'cvar' | 'command' | 'cmdline_param' | 'info_key' | ...`).
- [ ] Confirm `--ordinal 1` is the correct value: first row for `qwfwd` so ordinal = 1 is the chronological first (resolveOrdinal throws without it; HEAD_ORDINAL is the sentinel for `head` versions only).

**Execution mode:** `inline` -- documentation task; the recipe is verified above against live source; no code synthesis.

---

### Task 8 -- Update `PROJECT_DEFAULT_SNAPSHOT_VERSION` in `build-snapshot.ts`

**Goal:** Replace the provisional `'head'` placeholder for `qwfwd` with the real version label `'1.40-dev'` so `build-snapshot --project qwfwd` resolves to the loaded version row.

**Files:** `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`.
- [ ] Locate the `PROJECT_DEFAULT_SNAPSHOT_VERSION` record (line 685, verified). Current state after Phase 0 includes provisional entries like `qwfwd: 'head'` and `qtv: 'head'`.
- [ ] Change `qwfwd: 'head'` to `qwfwd: '1.40-dev'`. Leave `qtv: 'head'` as provisional (Phase 2 updates it).
- [ ] Add a comment after the entry: `// QWFWD frozen snapshot; version verified from qwfwd.h:118 QWFWD_VERSION_SHORT`.
- [ ] Run `bunx tsc --noEmit` to confirm the edit compiles.

**Execution mode:** `inline` -- one-line text substitution; full content is known; no reasoning required.

---

## Verification (phase boundary)

All probes use Postgres (D12). None depend on Phase 2 existing (D11). Run after Tasks 1-8 complete.

---

### V1 -- Extractor runs clean

```bash
cd /path/to/monorepo/apps/qw-oracle/scripts/extractors/qwfwd
python3 extract.py \
  --repo-root ../../../../slipgate-app/reference/qwfwd \
  --output-dir output \
  --handlers all \
  --workers 1
```

PASS condition: exit 0; all four output JSON files exist in `output/`; no `ERROR:` lines in stderr.
FAIL condition: any error or missing output file. Check the diagnostics section of the output for handler errors.

---

### V2 -- JSON payload field names are correct (contract check before load)

```bash
python3 -c "
import json
files = [
  ('output/qwfwd-variables-ast.json', 'vars'),
  ('output/qwfwd-commands-ast.json', 'commands'),
  ('output/qwfwd-cmdline-params-ast.json', 'params'),
  ('output/qwfwd-info-keys-ast.json', 'info_keys'),
]
for path, field in files:
    data = json.load(open(path))
    assert field in data, f'FAIL: {path} missing top-level field {field!r}'
    print(f'OK: {path} has {field!r} with {data[\"_stats\"][\"count\"]} entities')
"
```

PASS condition: all four `OK:` lines, counts > 0 for cvars and commands.
FAIL condition: `AssertionError` (wrong payload field name -- fix the handler's `payload_field` attribute and `finalize` return key).

---

### V3 -- Load executes without errors (the load path works)

Run all four `load-version` calls from the recipe in Task 7.

PASS condition: each call exits 0; JSON output for each call shows `"errors": 0`; `"inserted"` is > 0 for cvars and commands on first load.
FAIL condition: any exit non-zero, or `"errors"` > 0. Check the error message -- most common causes: wrong `--type` spelling, missing payload field (V2 would have caught this), schema constraint violation (migration 020 not applied).

---

### V4 -- Postgres rows loaded (count reconciliation)

```sql
SELECT type, count(*) as cnt
FROM entities
WHERE project = 'qwfwd'
GROUP BY type
ORDER BY type;
```

PASS condition: at least `cvar` and `command` rows present; counts match the `_stats.count` from each JSON file. Record these counts -- they become the F1 floor baselines for Phase 4.
FAIL condition: 0 rows for any type that V3 showed `inserted > 0` for.

---

### V5 -- End-to-end MCP smoke (the load-path proof)

Start the MCP server (per `DEVELOPMENT.md`) then query:

```
lookup_entity(project="qwfwd", name="masters_query")
```

Expected response: entity row with `type=cvar`, `source_state=source_backed`, `default_value="1"`, `source_file` contains `query.c`.

PASS condition: entity returned with correct fields.
FAIL condition: `null` / no match. Check V4 (row must exist); check MCP server is pointed at the correct `DATABASE_URL`.

---

### V6 -- versions row created

```sql
SELECT project, version, commit_sha, ordinal, parse_state
FROM versions
WHERE project = 'qwfwd';
```

PASS condition: exactly 1 row; `version='1.40-dev'`, `commit_sha='1.40-dev'`, `ordinal=1`, `parse_state='ok'`.
FAIL condition: 0 rows (load-version did not call upsertVersion); multiple rows (load was called multiple times with different ordinals -- idempotency probe V7 will catch this).

---

### V7 -- Idempotency: re-run load-version produces no new rows

Re-run all four `load-version` calls from Task 7 a second time (identical args).

```sql
SELECT type, count(*) as cnt
FROM entities
WHERE project = 'qwfwd'
GROUP BY type
ORDER BY type;
```

PASS condition: counts identical to V4; `"inserted": 0` in each load-version JSON output (all rows are updates or no-ops); no new `cvar_versions`/`command_versions`/`cmdline_param_versions`/`info_key_versions` rows.
FAIL condition: counts increase. Re-check `upsertEntity` natural-key logic -- typically caused by a duplicate name emitted by the extractor (pre-file dedup bug).

---

### V8 -- Reproducibility: re-extract produces empty diff

Re-run the extractor:

```bash
cd apps/qw-oracle/scripts/extractors/qwfwd
python3 extract.py \
  --repo-root ../../../../slipgate-app/reference/qwfwd \
  --output-dir output --handlers all --workers 1
git diff --stat output/
```

PASS condition: `git diff --stat output/` is empty (no output).
FAIL condition: non-empty diff. Most common cause: non-deterministic sort in `finalize()` or absolute-vs-relative path in `source_file`. Fix: verify all handlers sort by name in `finalize()` and use `_relative_source()` for all `source_file` values.

---

### V9 -- TypeScript compiles clean

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: exit 0, no output.
FAIL condition: type error. Most likely `build-snapshot.ts` `PROJECT_DEFAULT_SNAPSHOT_VERSION` still has wrong type for `qwfwd` entry (Task 8).

---

## Outputs to next phase

After Phase 1:
- `apps/qw-oracle/scripts/extractors/qwfwd/` exists with all four handlers + `extract.py` + `output/`.
- Four JSON files in `qwfwd/output/` with per-type QWFWD knobs.
- Postgres `entities` table has rows for `project='qwfwd'` across `cvar`, `command`, `cmdline_param`, `info_key` types.
- Postgres `versions` table has one row: `project='qwfwd', version='1.40-dev', ordinal=1`.
- MCP `lookup_entity` returns QWFWD knobs (e.g. `masters_query`).
- `PROJECT_DEFAULT_SNAPSHOT_VERSION['qwfwd']` = `'1.40-dev'` in `build-snapshot.ts`.
- `clang_args_qwfwd_for()` and `clang_args_qwfwd_win_for()` are in `extractor_lib/clang_config.py`.
- The vendored `load-version --json` recipe (Task 7) is proven end-to-end and ready for Phase 2 to reuse with `qtv` substituted.
- Per-type entity counts are recorded (V4 output). These become Phase 4 F1 floor probe baselines.
- Phase 0 open question Q1 resolved: `qwfwd` entry updated from `'head'` to `'1.40-dev'`. Phase 2 still owes the QTV version update.

## Open questions / deferred items

**Q-INFO -- QWFWD_PRX_KEY macro resolution in the info_keys handler**
Two `Info_*` call sites in `svc.c` (lines 247 and 264) use `QWFWD_PRX_KEY` as the key argument instead of a string literal. `QWFWD_PRX_KEY` is defined as `"prx"` in `qwfwd.h:125`. Pattern 6 macro resolution (same-file `#define` scan) would recover this as a `prx:userinfo` entity, but `QWFWD_PRX_KEY` is defined in `qwfwd.h` (a header), not same-file. Cross-header Pattern 6 resolution (using `collect_file_macros` from `_source.py`) would recover it.
Default chosen for Phase 1: omit `prx:userinfo` (emit only the 5 literal-key entities). The info_key surface for QWFWD is small and `prx` is an internal proxy protocol key, not an admin-facing config knob.
Who can resolve: Phase 1 executor may implement the header-macro resolution if the effort is low (the `collect_file_macros` infrastructure already exists in `_source.py`). Otherwise Phase 3 describe pass notes the gap. Flag explicitly in the Phase 1 executor report if omitted.

**Q-CVARFULLSET -- Cvar_FullSet is a registration API in QWFWD**
QWFWD's `Cvar_FullSet` at `cvar.c:219-225` creates a new cvar if it doesn't already exist (same semantics as Cvar_Get). In `net.c`, `Cvar_FullSet("net_ip", ...)` and `Cvar_FullSet("net_port", ...)` are used when command-line args override cfg values. These ARE registration sites (they create the cvar on first call). The cvars handler MUST include `Cvar_FullSet` in `REGISTRATION_APIS` (specified in Task 3). Confirmed by live source reading: `cvar.c:219-228` shows `Cvar_FullSet` creates the cvar via `Cvar_Get` internally.
Default chosen: both `Cvar_Get` and `Cvar_FullSet` in `REGISTRATION_APIS`. Resolved in Task 3.

**Q-CMDLINE-NAMES -- Positional arg naming convention**
The positional args use `[port]` and `[ip]` as entity names (square-bracket Unix convention from the usage string). The load-version entity table requires `UNIQUE(project, type, name)`. These names are safe (no other QWFWD entity uses bracketed names). If the operator prefers plain `port` and `ip`, the handler can be updated before running -- but that conflicts with the convention that cmdline param names include the prefix/bracket that makes them distinguishable from cvar names.
Default chosen: `[port]` and `[ip]` as shown in the usage string.
Who can resolve: operator review before Phase 1 execution.

**Q-VERSIONS-ROW-TIMING -- `--ordinal 1` must be passed on all four type loads**
`load-version --json` calls `loadVersion` which calls `upsertVersion` as its first operation inside `sql.begin()` (verified: `load-version.ts:466`). `upsertVersion` is `INSERT...ON CONFLICT DO UPDATE`, so the first type's load creates the versions row. Subsequent type loads for the same version find the row and update it (no-op ordinal conflict). The `--ordinal 1` flag must be passed on ALL four `load-version` calls, not just the first, because `resolveOrdinal` in `index.ts:162-170` only looks up the existing row when `--ordinal` is omitted AND the version is not `head`. On first load the row doesn't exist yet, so the lookup throws. Passing `--ordinal 1` on all four calls is safe (upsert is idempotent for ordinal).
Default chosen: `--ordinal 1` on all four calls (as written in the recipe).
Who can resolve: resolved; no operator action needed.

**Sub-agent dispatch note (Phase 1 drafter)**
The `Agent` tool for dispatching a `subagent_type=Explore` sub-agent was not available in this session. The verification checks were performed directly by reading/grepping live source files against the draft. See below for findings.

CRITICAL: 0
SUBSTANTIVE: 1
ADVISORY: 3

Substantive S1: The QWFWD cmdline handler uses a static-spec approach (hardcoded entries in `finalize()`) rather than AST detection. This is justified by the positional-argv idiom that produces no CALL_EXPR cursor, but it means the handler cannot detect new cmdline args if a future QWFWD version adds them. Mitigated by: (a) the handler is for a frozen vendored snapshot; (b) QWFWD's positional-arg interface is stable and documented in the usage string. Accepted: static spec is the appropriate choice for this codebase.

Advisory A1: `cvar.c` contains both Cvar_Get machinery (F6 exclusion for cvars handler) AND legitimate Cmd_AddCommand registrations (cvarlist, toggle, set, inc, cvar_hash_print). The phase MD specifies the correct approach for each handler independently (cvars handler excludes cvar.c; commands handler does NOT exclude cvar.c). This distinction must be clearly communicated to the executor.

Advisory A2: The info_keys handler needs `Info_SetValueForKeyEx` in its API_OP_MAP (QWFWD-specific variant in svc.c:264). The MVDSV template does not have this entry. The phase MD specifies it explicitly in Task 6.

Advisory A3: The `Cvar_FullSet` registration idiom (net.c) is QWFWD-specific and not in MVDSV. The phase MD specifies adding it to `REGISTRATION_APIS` in Task 3. Cross-check needed during execution: `Cvar_FullSet` in cvar.c is the implementation function -- the file-exclusion guard (`self._is_cvar_machinery = (source_path.name == "cvar.c")`) handles this correctly.

No CRITICAL findings. Substantive S1 accepted with rationale above. Advisories A1-A3 addressed inline in the phase tasks.

## Recovery (if verification fails)

- **V1 fails with `libclang` not found:** run `sudo apt install libclang-18-dev` (or the installed version); set `Config.set_library_file("libclang-18.so.1")` matches installed version. The MVDSV extractor uses the same path and works; if MVDSV runs, QWFWD will too.
- **V1 fails with `cvar.h: No such file`:** the include path in `clang_args_qwfwd_for` does not match the installed source. Verify the absolute path to `apps/slipgate-app/reference/qwfwd/src/` from the working directory; correct `clang_args_qwfwd_for`'s `qwfwd_src_dir` argument.
- **V2 fails (wrong payload field name):** the handler's `finalize()` return key does not match `payload_field`. Fix: return `{self.payload_field: unique, "_stats": {...}}` using the class attribute.
- **V3 fails with `'--ordinal is required'` error:** `--ordinal 1` was omitted from the `load-version` command. Add it to all four type loads (Q-VERSIONS-ROW-TIMING).
- **V3 fails with CHECK constraint violation for `project`:** migration 020 was not applied in Phase 0. Verify with `SELECT filename FROM schema_migrations WHERE filename='020_qtv_qwfwd_projects.sql'`. Apply Phase 0 if missing.
- **V4 shows 0 rows for `cvar` or `command`:** V3 may have silently loaded 0 entities (check load-version JSON output for `inserted: 0`). Most likely cause: extractor emitted 0 rows due to a source path error or handler exception. Re-run V1 with `--workers 1` and check diagnostics output.
- **V5 returns no match from MCP:** check V4 first (row must exist in Postgres). If row exists, check MCP server `DATABASE_URL` points to the correct Postgres instance. Restart the MCP server after the load.
- **V8 diff is non-empty (reproducibility fails):** check if `finalize()` sorts by name in all handlers. Check `source_file` values are relative (not absolute paths). Common bug: `_relative_source` called with a wrong base path producing different relative paths on re-run.
- **V9 fails with type error in build-snapshot.ts:** the `qwfwd: '1.40-dev'` entry type is correct (string); if tsc fails, check for a typo in the version string or surrounding syntax error from the Task 8 edit.
