# Phase 2 -- QTV Go extractor (go/ast)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). DONE.
> 2. Read `review-findings.md`; identify which findings apply: F2 (load-version bypass), F5 (--commit fallback), F7 (counts are extractor truth). DONE.
> 3. Run live recon (Read/grep) on all real source files this phase touches. DONE. See below.
> 4. After drafting, dispatch the verification sub-agent. DONE -- `Agent` tool unavailable in this session; verification performed directly by the drafter. See Open questions for findings.

---

## Live recon summary (verified against source before drafting)

**QTV source tree:** `apps/slipgate-app/reference/qtv/` -- Go 1.24.0 module `github.com/qw-group/qtv`. No `.git` dir (verified by `ls`). Frozen vendored snapshot.

**Version label:** `qtvRelease = "1.16-dev"` at `pkg/qtv/qtv.go:29`. The `*version` cvar default is `"QTVGO 1.16-dev"` (the prefix + constant). The version label for `--version` and `build-snapshot.ts` is `1.16-dev` (the bare release constant, not the prefixed cvar value).

**Cvar registration idioms (verified):**
- `qvs.Reg(name string, value string)` -- 2 args; name=string literal, default=string literal. Simplest case.
- `qvs.RegEx(name string, value interface{}, flags qVarFlags, OnChange qVarOnChange)` -- 4 args; name=string literal, default=string literal OR int literal OR string concat, flags=qVarFlags constant or 0, OnChange=function identifier or nil.
- `qvs.Regf(name string, format string, a ...interface{})` -- variadic; name=string literal, format="%v", args=arithmetic constant expression.

**All 41 call-sites (verified by grep):**

| File | Lines | Count | Notes |
|---|---|---|---|
| `pkg/qtv/downstream_storage.go` | 200-214 | 15 | Reg (simple) + RegEx (maxclients with flag) + Regf (buf sizes) |
| `pkg/qtv/http.go` | 51-59 | 9 | RegEx only; flags=qVarFlagInitOnly; 2 have int literal defaults |
| `pkg/qtv/log.go` | 15-17 | 3 | RegEx; flags=0; OnChange=function identifier |
| `pkg/qtv/qtv.go` | 206-213 | 7 | RegEx (mixed flags) + Reg; includes `*version` with string concat |
| `pkg/qtv/udp.go` | 67 | 1 | Reg; default=identifier `qwDefaultMasters` |
| `pkg/qtv/upstream_storage.go` | 85-90 | 6 | Reg + Regf (buf sizes) |

**Total: 41 unique cvar registrations** (no duplicates -- each name appears once). Per F7, the extractor count is authoritative; the design's ~41 estimate is confirmed exactly.

**Non-literal default cases requiring resolution in the extractor:**
1. `qvs.Regf("dstream_read_buf_size", "%v", 1024*32)` etc. (4 calls) -- format="%v", arg=constant integer arithmetic. The extractor evaluates the arithmetic expression (`go/ast` `BinaryExpr` fold) to get the string representation (e.g. `1024*32` -> `"32768"`).
2. `qvs.RegEx("http_upload_total_limit", 1024*1024*64, qVarFlagInitOnly, nil)` (2 calls) -- int literal expression as second arg (not string). Same fold approach.
3. `qvs.Reg("masters", qwDefaultMasters)` (1 call) -- identifier constant. Resolved by scanning package-level `const` declarations (the extractor scans all `.go` files for `const qwDefaultMasters = "..."` before the main walk). Value: `"master.quakeworld.nu master.quakeservers.net qwmaster.fodquake.net"`.
4. `qvs.RegEx("*version", "QTVGO "+qtvRelease, qVarFlagReadOnly|qVarFlagServerInfo, nil)` (1 call) -- string binary expression. Resolved by scanning const `qtvRelease = "1.16-dev"` and evaluating the concatenation. Default: `"QTVGO 1.16-dev"`.

For cases 1-2 (arithmetic), the extractor walks the `BinaryExpr` AST nodes recursively, folds `*` and `+` over `BasicLit` integers, and emits the result as a decimal string. For cases 3-4 (const reference), the extractor builds a const-table from package `ValueSpec` declarations before the main walk (simple string map: identifier -> literal value). If a non-literal cannot be resolved (e.g. a runtime variable), the extractor emits `null` for `default_value` rather than dropping the registration (F7: report the truth).

**Command registration idiom (verified):**
- `cmd.Register(name string, f cmdFunc)` -- 2 args; name=string literal (Note: `cmd.Register` lowercases the name internally at `cmd.go:282`, so the registered name is always lowercase. The extractor MUST emit the name as lowercase to match the runtime -- use `strings.ToLower(nameStr)` before emitting).

**All 12 command registrations (verified):**

| File | Line | Command name | Handler func |
|---|---|---|---|
| `pkg/qtv/cmd.go` | 35 | `echo` | `echoCmd` |
| `pkg/qtv/cmd.go` | 36 | `quit` | `quitCmd` |
| `pkg/qtv/cmd.go` | 37 | `exec` | `execCmd` |
| `pkg/qtv/cmd.go` | 38 | `cmdlist` | `cmdListCmd` |
| `pkg/qtv/downstream_storage.go` | 218 | `dclose` | `dCloseCmd` |
| `pkg/qtv/downstream_storage.go` | 219 | `dlist` | `dListCmd` |
| `pkg/qtv/qtv.go` | 446 | `status` | `statusCmd` |
| `pkg/qtv/upstream_storage.go` | 138 | `qtv` | `qtvCmd` |
| `pkg/qtv/upstream_storage.go` | 139 | `playdemo` | `playDemoCmd` |
| `pkg/qtv/upstream_storage.go` | 140 | `close` | `closeCmd` |
| `pkg/qtv/upstream_storage.go` | 141 | `list` | `listCmd` |
| `pkg/qtv/var.go` | 87 | `varlist` | `varListCmd` |

Note: `var.go:86` has `// qtv.cmd.Register("set", setCmd)` -- commented out; the extractor must skip comments (go/ast automatically does, since comment nodes are not statement nodes in the AST).

**0 cmdline_param, 0 info_key (confirmed):**
- `qtvFlagSet` embeds `flag.FlagSet` but registers NO named flags via `flag.StringVar` / `flag.BoolVar` / `flag.IntVar` etc. The `fs.Parse()` call processes positional args only (passed as console commands via `argsToStr`). There is no `flag.Var`-family call anywhere in `pkg/` (verified by grep).
- No `Info_ValueForKey`/`Info_SetValueForKey` call-sites with literal key names exist in `pkg/qtv/` (the serverInfo field is an `info.InfoTs` that propagates from upstream, not a user-configurable info_key surface). Confirmed: `qVarFlagServerInfo` controls which cvars are mirrored into serverinfo automatically -- this is not the QWFWD-style explicit Info_* API. No `info_key` entities from QTV.

**Entity types:** `cvar` (41) and `command` (12) only. `load-version` is called twice.

**D6 guard (C-vs-Go trap, verified):**
The 41 extracted cvars are all from Go source (`qvs.Reg`/`RegEx`/`Regf`). None of the C-QTV knobs (`mvdport`, `admin_password`, `floodprot`, `allow_http`) appear anywhere in `pkg/qtv/`. `fteqtv` is not in scope (D13).

---

## Goal

This phase delivers the QTV native `go/ast` extractor -- the pipeline's first non-C front-end. A standalone Go program at `apps/qw-oracle/scripts/extractors/qtv/extract.go` walks `apps/slipgate-app/reference/qtv/pkg/` using `go/parser` + `go/ast` + `go/token`, finds all `qvs.Reg`/`qvs.RegEx`/`qvs.Regf` call-sites (cvars) and all `cmd.Register` call-sites (commands), and emits `qtv-variables-ast.json` and `qtv-commands-ast.json` in the same per-type JSON contract the existing C extractors produce. The load step reuses the Phase-1 `load-version --json` recipe verbatim (substitute `qtv`, `1.16-dev`, `qtv-*-ast.json`). The phase also updates `PROJECT_DEFAULT_SNAPSHOT_VERSION['qtv']` from `'head'` to `'1.16-dev'` -- the remaining Phase-0 Q1 carry-forward. At phase boundary: QTV L1 rows are loaded in Postgres, `lookup_entity` returns a known QTV cvar, re-extract is reproducible (empty `git diff`), re-load is idempotent (no new rows), TypeScript compiles clean.

---

## Inputs from previous phase

Phase 1 outputs (all must be verified before Phase 2 begins):

- Postgres schema accepts `project IN ('qwfwd','qtv')` on all 10 CHECK columns (migration 020 applied, Phase 0).
- `bunx tsc --noEmit` exits 0 with the widened Project union and all 12 `Record<Project>` sites filled (Phase 0), including `build-snapshot.ts:685` `PROJECT_DEFAULT_SNAPSHOT_VERSION` with `qtv: 'head'` (provisional placeholder).
- `SCHEMA.md` documents qtv/qwfwd as projects 6-7 (Phase 0).
- `PROJECT_DEFAULT_SNAPSHOT_VERSION['qwfwd']` = `'1.40-dev'` in `build-snapshot.ts` (Phase 1 Task 8).
- `apps/qw-oracle/scripts/extractors/qwfwd/` exists with `extract.py`, four handlers, `output/` directory (Phase 1).
- The `load-version --json` recipe is proven end-to-end: QWFWD rows exist in Postgres, MCP `lookup_entity` returns QWFWD knobs, V1-V9 green (Phase 1 verification chain passed).
- `apps/qw-oracle/scripts/extractors/qtv/` directory does NOT yet exist (Phase 2 creates it).
- Go 1.24 toolchain available (P6 prerequisite, verified at Phase-2 start).

---

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/qtv/                          # new directory
apps/qw-oracle/scripts/extractors/qtv/go.mod                    # minimal module (module qtv-extractor; go 1.24) so `go run` works in module-aware mode
apps/qw-oracle/scripts/extractors/qtv/extract.go               # Go extractor program (stdlib only)
apps/qw-oracle/scripts/extractors/qtv/output/                   # new directory; extractor writes here
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts         # qtv: 'head' -> qtv: '1.16-dev'
```

### Deleted

```
n/a
```

---

## Tasks

---

### Task 1 -- Write `apps/qw-oracle/scripts/extractors/qtv/extract.go`

**Goal:** Implement the standalone Go AST extractor that walks the QTV source tree and emits `qtv-variables-ast.json` and `qtv-commands-ast.json` with the exact JSON contract the loader adapters read.

**Files:** `apps/qw-oracle/scripts/extractors/qtv/extract.go`

---

**JSON contract (verified against `load-cvars.ts` and `load-commands.ts`):**

The loader's `load-version.ts` normalizes both `Array<{name, ast, ...}>` and `Record<name, entry>` shapes (code at `load-version.ts:370-395`). The MVDSV-style array-of-objects shape is the correct shape for this extractor (matches existing Python extractor output, avoids key-collision ambiguity for the `*version` name).

**Cvar output (`qtv-variables-ast.json`):**

Payload field: `"vars"` (verified: `CVAR_PAYLOAD_FIELD = 'vars'` at `load-cvars.ts:17`).

```json
{
  "vars": [
    {
      "name": "hostname",
      "ast": {
        "default_value": "unnamed",
        "flags_raw": "qVarFlagServerInfo",
        "flag_names": ["qVarFlagServerInfo"],
        "on_change": null,
        "min_bound": null,
        "max_bound": null,
        "source_file": "pkg/qtv/qtv.go",
        "source_line": 211,
        "source_column": 2,
        "storage_class": null,
        "group_name_in_source": null,
        "trailing_comment": null
      }
    }
  ],
  "_stats": {
    "source_total": 41,
    "count": 41,
    "with_flags": 14,
    "with_onchange": 3,
    "with_trailing_comment": 0
  }
}
```

The `load-cvars.ts` `buildCvarVersionRow` reads from `entry.ast`: `default_value`, `flags_raw`, `flag_names`, `on_change`, `min_bound`, `max_bound`, `source_file`, `source_line`, `source_column`, `storage_class`, `group_name_in_source`, `trailing_comment`. All must be present (null-ok). Fields QTV does not have: `min_bound`=null, `max_bound`=null, `storage_class`=null, `group_name_in_source`=null, `trailing_comment`=null. The AstBlock interface also has `c_ident` (a field in the TS type definition) -- the loader reads it via the raw JSON hash only; it does not map to a DB column. Include it as the cvar name for completeness, or omit; omitting is fine (not read by any loader column mapper).

**Command output (`qtv-commands-ast.json`):**

Payload field: `"commands"` (verified: `COMMAND_PAYLOAD_FIELD = 'commands'` at `load-commands.ts:8`).

```json
{
  "commands": [
    {
      "name": "echo",
      "ast": {
        "handler_fn": "echoCmd",
        "source_file": "pkg/qtv/cmd.go",
        "source_line": 35,
        "source_column": 2,
        "enclosing_function": null,
        "description": null
      }
    }
  ],
  "_stats": {
    "source_total_call_sites": 12,
    "count": 12,
    "with_handler": 12,
    "with_description": 0
  }
}
```

The `load-commands.ts` `buildCommandVersionRow` reads from `entry.ast`: `handler_fn`, `source_file`, `source_line`, `source_column`, `enclosing_function` (mapped to `registration_file` column), `description`. All must be present (null-ok). No `legacy_alias_of` in QTV (only for C `Cmd_AddLegacyCommand`).

---

**Extractor implementation spec:**

The extractor is a single `package main` Go program. It uses only the Go standard library: `go/ast`, `go/parser`, `go/token`, `encoding/json`, `os`, `path/filepath`, `sort`, `strings`, `strconv`, `fmt`. No external module imports -- the extractor's `go run` does NOT compile against the qtv module itself (it parses source files as text via `go/parser`).

**Invocation:** run from the extractor directory, which carries its own `go.mod`, so `go run` works in module-aware mode (Go 1.16+ errors on `go run <file>` outside a module). Mirrors Phase 1's "cd into the extractor dir" pattern.

```bash
cd apps/qw-oracle/scripts/extractors/qtv
go run . \
  --src ../../../../slipgate-app/reference/qtv \
  --out output
```

Flags (use `flag` package):
- `--src` (string, required): path to the qtv repo root (the dir containing `go.mod`).
- `--out` (string, default `./output`): output directory for `qtv-variables-ast.json` and `qtv-commands-ast.json`.

**Algorithm:**

```
Phase A -- Collect package constants (for non-literal default resolution):
  Walk all .go files under <src>/pkg/.
  For each file, parse with go/parser.ParseFile (Mode: go/parser.ParseComments is fine).
  Find top-level and package-level ValueSpec nodes under GenDecl (token.CONST or token.VAR).
  For each name=value pair where value is a BasicLit (string or int), add to a constTable map[string]string.
  Also resolve BinaryExpr (string concat or int arithmetic) where all operands are already in constTable or are BasicLit.
  After the walk: constTable has at minimum:
    "qwDefaultMasters" -> "master.quakeworld.nu master.quakeservers.net qwmaster.fodquake.net"
    "qtvRelease"       -> "1.16-dev"

Phase B -- Walk all .go files under <src>/pkg/ for registration call-sites:
  For each file:
    Parse with go/parser.ParseFile.
    Walk the AST with ast.Inspect.
    For each *ast.CallExpr node:
      Check selector expression: is it of the form <selector>.Reg / <selector>.RegEx / <selector>.Regf (for cvars)
                                  or <selector>.Register (for commands) where <selector> is a field access.

    --- Cvar detection ---
    Match: CallExpr where the Fun is an *ast.SelectorExpr with Sel.Name in {"Reg", "RegEx", "Regf"}.
    (No need to verify the receiver type: Reg/RegEx/Regf only exist on qVarStorage.
     The sole false-positive risk is a different type with same method name -- scan pkg/ and confirm
     no other struct defines Reg/RegEx/Regf. Verified: only qVarStorage in var.go.)

    For Reg(name, value):
      args[0] = name (BasicLit string) -> extract string value
      args[1] = value (BasicLit string OR Ident for const ref) -> resolveDefault(args[1], constTable)
      flags_raw = null, flag_names = [], on_change = null

    For RegEx(name, value, flags, onchange):
      args[0] = name (BasicLit string)
      args[1] = value (BasicLit string/int OR BinaryExpr OR Ident) -> resolveDefault(args[1], constTable)
      args[2] = flags (BasicLit 0 OR Ident OR BinaryExpr of Idents/BasicLits) -> resolveFlags(args[2])
      args[3] = onchange (Ident "nil" OR Ident function-name) -> resolveOnChange(args[3])

    For Regf(name, format, args...):
      args[0] = name (BasicLit string)
      args[1] = format string ("%v")
      remaining args = one or more BinaryExpr/BasicLit int expressions
      default_value = fmt.Sprintf(format, foldIntExpr(remaining[0]))  -- one arg in all 4 cases

    Source position: use fset.Position(callExpr.Pos()) for source_file / source_line / source_column.
    source_file: make relative to <src> root.

    --- Command detection ---
    Match: CallExpr where Fun is *ast.SelectorExpr with Sel.Name == "Register" AND
           the receiver is cmd (i.e., the selector's X is an Ident "cmd" or a field-access ending in .cmd).
    (Filter: the Register method on *qCmd only. No other exported Register in pkg/qtv/.)
    args[0] = name (BasicLit string) -> extract, apply strings.ToLower (runtime lowercases names, cmd.go:282)
    args[1] = handler (Ident for function name) -> extract .Name for handler_fn
    source_file / source_line / source_column: fset.Position(callExpr.Pos())
    enclosing_function: null (no banner-comment pattern in Go; cmd.go functions are named clearly)
    description: null (describe pass handles this)

Phase C -- Finalize and emit:
  Sort cvars by name (ascending, case-sensitive -- all QTV names are lowercase already).
  Sort commands by name (ascending).
  Dedup by name (first-wins within each type -- all 41 cvar names and 12 command names are unique per verification, so dedup is belt-and-braces only).
  Compute _stats for each type.
  Write qtv-variables-ast.json and qtv-commands-ast.json to --out directory.
  JSON output: use json.MarshalIndent with 2-space indent for readability (matches Python extractor style).
```

**resolveDefault helper spec:**

```go
// resolveDefault returns the string representation of a registration default arg.
// Returns (value, resolved bool).
// - BasicLit STRING: strip quotes, return literal value.
// - BasicLit INT: return the decimal string.
// - BinaryExpr with token.ADD:
//     if both sides are resolvable -> for strings, concatenate; for ints, add.
//     for string+string or int+int only (no cross-type).
// - BinaryExpr with token.MUL: for ints only, multiply and return decimal.
// - Ident with Name == "nil": return ("", false) -> emit null.
// - Ident otherwise: look up in constTable; if found return (value, true); else ("", false).
// If unresolved, caller emits null for default_value (F7: report truth, don't drop the entity).
```

**resolveFlags helper spec:**

```go
// resolveFlags returns (flags_raw string, flag_names []string).
// - BasicLit INT "0": return ("", []).
// - Ident with Name == "0" or value 0: return ("", []).
// - Ident (flag name like "qVarFlagServerInfo"): return (name, [name]).
// - BinaryExpr with token.OR: recursively resolve both sides, combine names,
//     join raw with "|".
// Maps (verified from var.go:38-42):
//   qVarFlagReadOnly   -> "qVarFlagReadOnly"
//   qVarFlagInitOnly   -> "qVarFlagInitOnly"
//   qVarFlagServerInfo -> "qVarFlagServerInfo"
```

**resolveOnChange helper spec:**

```go
// resolveOnChange returns the handler function name string or null.
// - Ident "nil": return null.
// - Ident (function name like "logLevelOnChange"): return the name.
```

**foldIntExpr helper spec:**

```go
// foldIntExpr recursively evaluates a constant integer expression (BasicLit INT or BinaryExpr * or +).
// Returns (value int64, ok bool).
// Used for Regf format args and RegEx int defaults.
// For 1024*32: returns (32768, true).
// For 1024*1024*64: returns (67108864, true).
// If any node is not a BasicLit or supported operator, returns (0, false).
```

**Source-file path convention:**

`source_file` is relative to `--src` (the qtv repo root). Example: `pkg/qtv/cmd.go` (not an absolute path, not `apps/slipgate-app/reference/qtv/pkg/qtv/cmd.go`). This matches the `_relative_source` convention used by the Python extractors. Use `filepath.Rel(srcRoot, absPath)` to compute it.

**`*version` note:** The name `*version` contains an asterisk. The extractor emits the name exactly as the string literal in the source: `"*version"`. The loader's case-fold converts it to `"*version"` (already lowercase). This is consistent with MVDSV's `*version` entity (verified: MVDSV also has a `*version` cvar).

**Determinism:** All 41 cvars and 12 commands have distinct names (verified by grep). Sorting by name produces a deterministic ordering. The extractor must sort before emitting (Phase C). The reproducibility probe (V8) fails on non-deterministic output.

---

**Steps:**

- [ ] Create directory `apps/qw-oracle/scripts/extractors/qtv/` and `apps/qw-oracle/scripts/extractors/qtv/output/`.
- [ ] Create `apps/qw-oracle/scripts/extractors/qtv/go.mod` so `go run` works in module-aware mode (Go 1.16+ requires a module context; there is no other `go.mod` in the qw-oracle tree):
  ```
  module qtv-extractor

  go 1.24
  ```
- [ ] Write `apps/qw-oracle/scripts/extractors/qtv/extract.go` (full file content below; subagent writes the complete file following the above spec).

**Full file content (subagent writes the complete implementation):**

The subagent must implement all phases and helpers described above in a single `package main` file. Key correctness requirements:

1. Flag package for `--src` and `--out` args.
2. Phase A: walk all `.go` files under `<src>/pkg/`, collect string and int constants from `GenDecl` `CONST`/`VAR` nodes. Resolve `BinaryExpr` constants (string concat for `"QTVGO " + qtvRelease`, int multiply for `1024*320` etc.).
3. Phase B: `ast.Inspect` on each parsed file. For cvar registration: match `SelectorExpr` where `Sel.Name` is `"Reg"`, `"RegEx"`, or `"Regf"`. For command registration: match `SelectorExpr` where `Sel.Name` is `"Register"`. Use `token.FileSet` to get position data.
4. Dedup by name (first-wins across all files for each type).
5. Sort by name ascending before writing JSON.
6. Emit `_stats` block: for cvars: `source_total` (raw call count before dedup), `count` (after dedup), `with_flags` (count with non-empty flag_names), `with_onchange` (count with non-null on_change), `with_trailing_comment` (0 -- Go source has no trailing comments adjacent to call-sites in the registration pattern). For commands: `source_total_call_sites` (raw), `count` (after dedup), `with_handler` (count with non-null handler_fn), `with_description` (0).
7. Write with `json.MarshalIndent(result, "", "  ")` + newline.
8. `os.MkdirAll(outDir, 0755)` before writing.
9. If `resolveDefault` returns unresolved for any arg, log a warning to stderr and emit `null` for that field (F7: report truth, do not silently drop the entity).
10. The `cmd.Register` filter: the extractor should match any `SelectorExpr` with `Sel.Name == "Register"` where the preceding selector ends in a field named `cmd` (the QTV struct field `qtv.cmd`). In practice, all 12 `cmd.Register` calls in the source have the form `cmd.Register(...)` (local var `cmd`) or `qtv.cmd.Register(...)`. The `Sel.Name == "Register"` test is sufficient as a first pass; if ambiguous, add a check that the parent expression is a receiver of type `*qCmd` shape -- but in the QTV source there is no other `Register` method, so `Sel.Name == "Register"` is unambiguous.

**Execution mode:** `subagent (Sonnet MAX)` -- Go code synthesis with multi-case AST resolution logic (string/int literals, BinaryExpr folding, const-table pre-pass, command vs cvar discrimination). The spec is complete and detailed; the task is mechanical implementation of a clearly-defined algorithm, but Go AST traversal requires judgment for edge cases. Sonnet MAX gives correctness headroom for the novel AST patterns (non-literal defaults, the const-table pre-pass). This is the arc's most technically novel task.

---

### Task 2 -- The `load-version --json` procedure (Phase-1 recipe reuse)

**Goal:** Document the complete `load-version --json` load sequence for QTV. This is the Phase-1 recipe verbatim with `qtv` substituted for `qwfwd` and `1.16-dev` for `1.40-dev`.

**Files:** (documentation task; recipe lives in this phase MD)

**Version label (D4):** `qtvRelease = "1.16-dev"` (verified: `pkg/qtv/qtv.go:29`). Use `1.16-dev` as `--version`.

**Commit sentinel (D4/F5):** No `.git` dir in `apps/slipgate-app/reference/qtv/` (verified by `ls`). No upstream sha recorded in the tree. D4 fallback: use the version constant string as the commit sentinel. `--commit 1.16-dev`.

**`--ordinal` requirement:** This is the first-ever load of QTV; no `versions` row exists. Same pattern as QWFWD (Phase 1 Q-VERSIONS-ROW-TIMING): pass `--ordinal 1` on all type loads.

**Types to load:** `cvar` and `command` only (0 cmdline_param, 0 info_key -- confirmed by recon above).

**Output files (from extract.go):**
```
apps/qw-oracle/scripts/extractors/qtv/output/qtv-variables-ast.json    # cvars
apps/qw-oracle/scripts/extractors/qtv/output/qtv-commands-ast.json     # commands
```

---

**REUSABLE LOAD RECIPE (Phase-1 recipe reused, qtv substituted):**

```bash
# Step 0: Run the extractor (from the extractor dir, which has its own go.mod)
cd apps/qw-oracle/scripts/extractors/qtv
go run . \
  --src ../../../../slipgate-app/reference/qtv \
  --out output

# Verify: output/*.json files exist and are non-empty
ls -la output/

# Step 1: Load cvars (run from apps/qw-oracle/)
bun scripts/load-knowledge/index.ts load-version \
  --project qtv \
  --version 1.16-dev \
  --type cvar \
  --json scripts/extractors/qtv/output/qtv-variables-ast.json \
  --commit 1.16-dev \
  --ordinal 1

# Step 2: Load commands
bun scripts/load-knowledge/index.ts load-version \
  --project qtv \
  --version 1.16-dev \
  --type command \
  --json scripts/extractors/qtv/output/qtv-commands-ast.json \
  --commit 1.16-dev \
  --ordinal 1
```

**Expected output per load-version call:** JSON summary with `inserted`, `updated`, `dropped`, `errors` counts. `errors: 0` is the pass condition. `inserted > 0` on first load.

---

**Steps:**

- [ ] Verify that `scripts/extractors/qtv/output/qtv-variables-ast.json` has top-level key `"vars"` and `scripts/extractors/qtv/output/qtv-commands-ast.json` has top-level key `"commands"` before running load-version.
- [ ] Confirm `--type` spellings match `EntityType` values (`'cvar'`, `'command'`).
- [ ] Confirm `--ordinal 1` on both type loads (first-ever QTV load; no existing versions row).

**Execution mode:** `inline` -- documentation task; the recipe mirrors Phase 1 Task 7 with substitution only; no code synthesis.

---

### Task 3 -- Update `PROJECT_DEFAULT_SNAPSHOT_VERSION` in `build-snapshot.ts`

**Goal:** Replace the provisional `'head'` placeholder for `qtv` with the real version label `'1.16-dev'` so `build-snapshot --project qtv` resolves to the loaded version row.

**Files:** `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`.
- [ ] Locate `PROJECT_DEFAULT_SNAPSHOT_VERSION` record (line 685, verified). After Phase 0 and Phase 1 the record includes `qwfwd: '1.40-dev'` and `qtv: 'head'` (provisional). If the `qtv` key is ABSENT, Phase 0 is incomplete -- halt and finish Phase 0 (Project-union widening + the 12 Record fills) first.
- [ ] Change `qtv: 'head'` to `qtv: '1.16-dev'`.
- [ ] Add a comment after the entry: `// QTV frozen snapshot; version verified from pkg/qtv/qtv.go:29 qtvRelease`.
- [ ] Run `bunx tsc --noEmit` to confirm the edit compiles.

**Execution mode:** `inline` -- one-line text substitution with verified content; no reasoning required.

---

## Verification (phase boundary)

All probes use Postgres (D12). None depend on Phase 3 or 4 existing (D11). Run after Tasks 1-3 complete.

---

### V1 -- Extractor runs clean

```bash
cd apps/qw-oracle/scripts/extractors/qtv
go run . \
  --src ../../../../slipgate-app/reference/qtv \
  --out output
```

PASS condition: exit 0; both `qtv-variables-ast.json` and `qtv-commands-ast.json` exist in `output/`; no `ERROR:` lines in stderr; no unresolved-default warnings (all 41 cvar defaults should resolve).
FAIL condition: any exit non-zero, missing output file, or unresolved-default warning for a basic `Reg(name, string_literal)` call (would indicate a parser error). If the const-table pre-pass misses `qwDefaultMasters` or `qtvRelease`, those two entries emit null default_value -- acceptable (F7) but should be investigated.

---

### V2 -- JSON payload field names are correct (contract check before load)

```bash
python3 -c "
import json
files = [
  ('apps/qw-oracle/scripts/extractors/qtv/output/qtv-variables-ast.json', 'vars'),
  ('apps/qw-oracle/scripts/extractors/qtv/output/qtv-commands-ast.json', 'commands'),
]
for path, field in files:
    data = json.load(open(path))
    assert field in data, f'FAIL: {path} missing top-level field {repr(field)}'
    items = data[field]
    assert isinstance(items, list), f'FAIL: {path} {repr(field)} is not a list'
    print(f'OK: {path} has {repr(field)} with {data[\"_stats\"][\"count\"]} entities')
print('V2 PASS')
"
```

PASS condition: both `OK:` lines print; cvar count = 41, command count = 12.
FAIL condition: `AssertionError` (wrong payload field name or non-list shape -- fix the emitter in `extract.go`).

---

### V3 -- Load executes without errors (the load path works)

Run both `load-version` calls from the recipe in Task 2.

PASS condition: each call exits 0; JSON output shows `"errors": 0`; `"inserted"` > 0 for both types on first load.
FAIL condition: any exit non-zero, or `"errors"` > 0. Most common causes: wrong `--type` spelling (check exact string), missing payload field (V2 catches), schema constraint violation (migration 020 not applied from Phase 0), `--ordinal` not provided.

---

### V4 -- Postgres rows loaded (count reconciliation)

```sql
SELECT type, count(*) as cnt
FROM entities
WHERE project = 'qtv'
GROUP BY type
ORDER BY type;
```

PASS condition: `cvar` row with `cnt=41` and `command` row with `cnt=12`. Record these counts -- they become the F1 floor baselines for Phase 4.
FAIL condition: 0 rows for any type that V3 showed `inserted > 0` for; or counts differ from `_stats.count` in the JSON.

---

### V5 -- End-to-end MCP smoke (the load-path proof)

Start the MCP server (per `DEVELOPMENT.md`) then query:

```
lookup_entity(project="qtv", name="qtv_password")
```

Expected response: entity row with `type=cvar`, `source_state=source_backed`, `default_value=""`, `source_file` contains `downstream_storage.go`.

PASS condition: entity returned with correct fields.
FAIL condition: `null` / no match. Check V4 (row must exist); check MCP server `DATABASE_URL` points to the correct Postgres instance. Restart MCP server after load.

---

### V6 -- versions row created

```sql
SELECT project, version, commit_sha, ordinal, parse_state
FROM versions
WHERE project = 'qtv';
```

PASS condition: exactly 1 row; `version='1.16-dev'`, `commit_sha='1.16-dev'`, `ordinal=1`, `parse_state='ok'`.
FAIL condition: 0 rows (load-version did not call upsertVersion); multiple rows (ordinal mismatch on re-load).

---

### V7 -- Idempotency: re-run load-version produces no new rows

Re-run both `load-version` calls from Task 2 a second time (identical args).

```sql
SELECT type, count(*) as cnt
FROM entities
WHERE project = 'qtv'
GROUP BY type
ORDER BY type;
```

PASS condition: counts identical to V4; `"inserted": 0` in each load-version JSON output.
FAIL condition: counts increase. Re-check that `extract.go` does not emit duplicate names before dedup, and that `upsertEntity` natural-key logic handles the `*version` name (asterisk is valid in the name column).

---

### V8 -- Reproducibility: re-extract produces empty diff

Re-run the extractor:

```bash
cd apps/qw-oracle/scripts/extractors/qtv
go run . \
  --src ../../../../slipgate-app/reference/qtv \
  --out output
git diff --stat output/
```

PASS condition: `git diff --stat` produces no output (empty diff).
FAIL condition: non-empty diff. Most common cause: non-deterministic output order (fix: verify that Phase C sorts by name before marshalling) or floating-point representation of computed defaults (all computed defaults in QTV are integers or strings, so this should not arise). A diff on `source_line` values would indicate a file-set position bug.

---

### V9 -- TypeScript compiles clean

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: exit 0, no output.
FAIL condition: type error. Most likely `build-snapshot.ts` `PROJECT_DEFAULT_SNAPSHOT_VERSION` still has wrong type for `qtv` entry (Task 3).

---

## Outputs to next phase

After Phase 2:
- `apps/qw-oracle/scripts/extractors/qtv/` exists with `extract.go` and `output/`.
- Two JSON files in `qtv/output/`: `qtv-variables-ast.json` (41 cvars) and `qtv-commands-ast.json` (12 commands).
- Postgres `entities` table has rows for `project='qtv'` across `cvar` (41) and `command` (12) types.
- Postgres `versions` table has one row: `project='qtv', version='1.16-dev', ordinal=1`.
- MCP `lookup_entity` returns QTV knobs (e.g. `qtv_password`).
- `PROJECT_DEFAULT_SNAPSHOT_VERSION['qtv']` = `'1.16-dev'` in `build-snapshot.ts` (Phase-0 Q1 carry-forward resolved).
- Per-type entity counts recorded (V4 output). These become the Phase 4 F1 floor probe baselines for `qtv`.
- Both `qwfwd` and `qtv` extractors are reproducible + idempotent. Phase 3 can begin the describe pass over all 41+12=53 QTV knobs plus all QWFWD knobs.

---

## Open questions / deferred items

**Q1 -- Non-literal default resolution for `masters` and `*version` [pre-resolved]**
The const-table pre-pass resolves both: `qwDefaultMasters` is a package-level `const` in `udp.go`; `qtvRelease` is a package-level `const` in `qtv.go`. The pre-pass walks all `.go` files in `pkg/` before the main AST walk, so both constants are in the table before the registration call-sites are processed. If the pre-pass implementation resolves only the same package (not cross-file within the same package), the extractor must walk all `.go` files -- which it does for the main walk anyway. No operator action needed.

**Q2 -- `*version` name with asterisk [pre-resolved]**
The entity name `*version` is literal (the `*` is part of the registered cvar name in QTV, same as in MVDSV). The loader's case-fold lowercases it to `*version` (already lowercase). The Postgres `entities.name` column accepts this (TEXT, no constraints on charset). The extractor emits the string literal exactly: `"*version"`. No operator action needed.

**Q3 -- Regf default resolution precision [pre-resolved]**
The four `Regf` calls use `"%v"` format with a single integer argument. `fmt.Sprintf("%v", 32768)` = `"32768"`. The `foldIntExpr` helper evaluates the constant-expression subtree. The values are: `dstream_read_buf_size=32768`, `dstream_write_buf_size=65536`, `ustream_read_buf_size=327680`, `ustream_write_buf_size=32768`. These are compile-time constants so the extractor can fold them exactly. No operator action needed.

**Q4 -- cmd.Register selector disambiguation [pre-resolved]**
`Sel.Name == "Register"` is used as the detection predicate. In the QTV source, only `*qCmd` has a `Register` method (verified: no other type in `pkg/qtv/` defines `Register`). The `cmd.go:278` method definition (`func (cmd *qCmd) Register(...)`) is a method declaration, not a `CallExpr` -- the AST walker only fires on `CallExpr` nodes, so the method definition is excluded automatically. No operator action needed.

**Q5 -- Go toolchain version requirement [operator-verify before execution]**
The extractor runs via `go run` which requires Go 1.24 (matching the QTV module's `go.mod`). `go/ast` stdlib API is stable since Go 1.0; the extractor uses no Go 1.24-specific language features (no generics, no range-over-functions). The `go run` invocation parses QTV source without importing the QTV module, so external module availability (qtv's dependencies) is irrelevant. P6 in `prerequisites.md` covers the toolchain check.

**Q6 -- F2/F5 confirmed for QTV [no deviation from Phase 1]**
F2 (extract-tag cannot drive this target): confirmed, no `.git` dir, Go extractor. F5 (--commit fallback): confirmed, use `1.16-dev` as commit sentinel. Both resolved identically to Phase 1's QWFWD handling. No operator action needed.

**F7 -- count confirmation [operator records at V4]**
Per F7, the extractor's actual count is the truth. The hand-count of 41 cvars and 12 commands was verified by grep during planning and matches exactly. The extractor should produce the same counts; if it differs (e.g. the const-table pre-pass drops a Regf call because it can't fold the expression), record the extractor's count as the F1 baseline, not the hand-count.

**Sub-agent dispatch note (Phase 2 drafter)**
The `Agent` tool for dispatching a sub-agent was not available in this session. The verification checks were performed directly by the drafter reading and grepping live source files against this draft.

**Planner independent verification + convention scrutiny (2026-06-05).** After the drafter halted, the planner dispatched a SEPARATE independent fresh-context Explore verifier AND applied its own convention review (operator is not gating Phase 2, so the planner is the gate). Outcome: the Go extractor's JSON contract matches the C adapters; all four non-literal defaults resolve source-accurately (verified: `qwDefaultMasters` udp.go:33, `qtvRelease` qtv.go:29 = "1.16-dev", the Regf/RegEx integer folds, the `*version` string concat); 41 cvars + 12 commands + 0 cmdline/0 info_keys confirmed by grep; command names correctly lowercased to match the runtime registration (cmd.go:282); `*version` preserved verbatim; output deterministic (sorted). One execution fix applied: a minimal `go.mod` so `go run` works in module-aware mode (Go 1.16+), with the invocation run from the extractor dir (matching Phase 1's pattern). A phase-ordering guard was added to Task 3. No CRITICAL or SUBSTANTIVE issues remain. (Advisory A1: `c_ident` is omitted -- verified contract-safe; `buildCvarVersionRow` does not read it and the load path parses JSON untyped.)

---

## Recovery (if verification fails)

- **V1 fails with "undefined: go/ast":** the extractor file has a build tag or wrong package name; verify `package main` at top and no external imports.
- **V1 exits with "no required module provides package":** the extractor attempted to import a QTV package. The extractor must be standalone (stdlib only). Check `import` block in `extract.go`.
- **V2 fails (wrong payload field name):** the Go emitter writes a key other than `"vars"` or `"commands"`. Fix the struct field name or marshal key in `extract.go`.
- **V2 fails (list vs dict shape):** the emitter writes a `map[string]...` instead of a slice. The loader accepts both (see `load-version.ts:371`), but the canonical shape is `[]struct{Name..., Ast...}`. Fix the emitter to use a slice type.
- **V3 fails with `'--ordinal is required'`:** pass `--ordinal 1` on both type loads (same Q-VERSIONS-ROW-TIMING as Phase 1).
- **V3 fails with CHECK constraint violation for `project`:** migration 020 was not applied (Phase 0 not complete). Apply Phase 0 first.
- **V4 shows `cnt=40` for cvar (one missing):** most likely the `masters` cvar was dropped (const-table pre-pass miss for `qwDefaultMasters`). Check that the pre-pass walks `udp.go` and finds the `const` block at lines 32-35. Fix: ensure pre-pass walks all `.go` files, not just the file being walked in Phase B.
- **V4 shows `cnt=43` for cvar (extra rows):** the method definition stubs `RegEx` / `Reg` in `var.go` (lines 189/202) were accidentally matched. Fix: confirm the extractor only matches `CallExpr` nodes (function calls), not `FuncDecl` or `FuncLit` nodes.
- **V5 returns no match from MCP:** check V4 first. If the row exists, check MCP server `DATABASE_URL`. Restart MCP server after the load.
- **V8 diff is non-empty:** verify Phase C sorts by name. Confirm the sort key is the `name` string field, not the position (`source_line`) or some other field.
- **V9 fails with type error:** check Task 3 edit -- the `qtv: '1.16-dev'` substitution must not introduce a syntax error in the record literal.
