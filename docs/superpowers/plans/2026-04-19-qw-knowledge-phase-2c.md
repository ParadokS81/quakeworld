# QW Knowledge Phase 2c Implementation Plan

> **Predecessor:** Phase 2b loader at `docs/superpowers/plans/2026-04-18-qw-knowledge-loader-phase-2b.md`.
> **Schema:** `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md`.
> **Execution:** main tree, commit per task, no feature branch (see root `CLAUDE.md` git workflow).

**Goal:** port the remaining three ezQuake extractors (commands, macros, cmdline-params) to AST quality (or grep-quality for cmdline) and wire them through the existing Phase 2b loader. End state: ezQuake is fully represented in `knowledge.db` across all four entity types (cvar, command, macro, cmdline_param), queryable with the same loader/diff/enrich pipeline.

**Non-goals:**
- MVDSV / KTX / FTE extractors — Phase 2d/2e.
- Historical backfill across tags — Phase 2f.
- Slipgate app refactor to consume `knowledge.db` — deferred, user intends to do this after ezQuake is fully in SQL.
- Replacing the old TS scrapers (`extract-ezquake-commands.ts`, etc.) — slipgate still consumes their JSON. New libclang extractors write to parallel `*-ast.json` files.

**Verification discipline:** per monorepo CLAUDE.md, compile first, manual-verify second. No TDD. Each task ends with a concrete end-to-end check (extractor runs, loader runs, DB query returns sensible rows).

---

## Context for the executing session

**Proven Phase 2b artifacts:**
- Extractor: `packages/qw-config/scripts/extract-ezquake-cvars-clang.py` (850 lines). Dual TU parse (client + server build), handles `cvar_t x = {...}` scalars AND `cvar_t xs[N] = {...}` arrays, resolves groups via `Cvar_SetCurrentGroup`/`Cvar_Register` call-flow, synthesizes `hud_*` cvars from `HUD_Register`. Output shape: `{ groups: [...], vars: { name: { ast: {...}, desc, remarks, "group-id", ... } } }`.
- Loader: `apps/qw-oracle/scripts/load-knowledge/`. Three stages: `load-version`, `diff`, `enrich`. CLI via `npm run load-knowledge`. Current gate at `load-version.ts:63` throws for non-cvar types.
- Schema already has `command_versions`, `macro_versions`, `cmdline_param_versions` tables (see `schema.ts`). Natural key `(entity_id, version)` same as cvar. No schema change required.

**Registration patterns surveyed:**
- **Commands:** `Cmd_AddCommand("name", handler_fn, flags?)` — clean callexpr. ~540 live in help_commands.json. Scatter across all `.c` files.
- **Macros:** `Cmd_AddMacro("name", handler_fn)` plus `Cmd_AddMacroEx(...)` — 35+ callexprs across 7 files, mostly `teamplay.c`. ~120 live in help_macros.json.
- **Cmdline params:** NO single registration point. `COM_CheckParm("-foo")` called at the use site. ~130 live in help_cmdline_params.json. Source-backed detection = grep for `COM_CheckParm("<name>")`.

**Output JSON file naming:**
- New AST-flavored outputs live alongside the legacy scraper outputs:
  - `packages/qw-config/src/data/ezquake-commands-ast.json`
  - `packages/qw-config/src/data/ezquake-macros-ast.json`
  - `packages/qw-config/src/data/ezquake-cmdline-params-ast.json`
- Legacy scrapers (`extract-ezquake-commands.ts` etc.) stay untouched; their JSONs are still consumed by slipgate.

**Loader dispatch refactor:**
- `load-version.ts` becomes a thin dispatcher that hands off to per-type builder modules.
- `load-cvars.ts` — existing cvar-specific row build logic (moved, not rewritten).
- `load-commands.ts` / `load-macros.ts` / `load-cmdline-params.ts` — new parallel modules.
- Shared scaffolding (version upsert, entity upsert, transitions, schema_meta, partial-drop guard) stays in `load-version.ts`.
- `types.ts` grows a generic `ExtractorOutput<T>` shape and per-type entry interfaces.
- `natural-keys.ts` gains `upsertCommandVersion`, `upsertMacroVersion`, `upsertCmdlineParamVersion` parallel to `upsertCvarVersion`.

---

## Task 1: Port ezQuake commands to libclang extractor

**Intent:** match the cvar extractor's depth for commands. AST-extract `Cmd_AddCommand` call-site, resolve handler function, attach help-JSON enrichment.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-commands-clang.py`.
- [ ] Mirror CLI flags from cvar extractor: `--repo-root`, `--output`. Default repo = `research/repos/ezquake-source`, default output = `packages/qw-config/src/data/ezquake-commands-ast.json`.
- [ ] Reuse `CLANG_ARGS` / `CLANG_ARGS_SERVER` dual-TU parse so `#ifdef`-gated commands surface in both branches.
- [ ] Per `.c` file: walk AST, find `CALL_EXPR` nodes whose spelling is `Cmd_AddCommand` (also watch for `Cmd_AddCommandAlias` / `Cmd_AddCommandExt` variants if they exist - grep first to confirm).
- [ ] Per call, extract: command name (arg 0 string literal), handler function identifier (arg 1 — resolve via `_resolve_var_ref` equivalent), source file basename, source line, source column, enclosing function name (registration site — this is useful metadata: `CL_InitCommands` vs `TP_Init` etc.).
- [ ] Enrich each command with `help_commands.json` entries (desc, remarks, group-id). Commands in help-json but NOT in source flip to `source_state='doc_only'` downstream — extractor just flags `ast=null`.
- [ ] Output JSON shape:
  ```json
  {
    "groups": [...],
    "commands": {
      "say_team": {
        "ast": {
          "handler_fn": "CL_SayTeam_f",
          "source_file": "cl_cmd.c",
          "source_line": 1234,
          "source_column": 2,
          "registration_file": "cl_cmd.c"
        },
        "desc": "...",
        "remarks": "...",
        "group-id": "comm"
      }
    }
  }
  ```
- [ ] Add a diagnostics log path mirroring `ast-spike-diagnostics.log`.
- [ ] **Verify:** run extractor; spot-check 5 commands from different files (e.g., `say_team`, `record`, `exec`, `bind`, `kill`). Each should have a valid `ast` block with a plausible handler function name.

**Done signal:** extractor runs to completion on ezQuake head; output JSON has ~540 commands; at least 4 out of 5 spot-check entries have AST data (some may be help-only deprecated → `ast=null`).

---

## Task 2: Port ezQuake macros to libclang extractor

**Intent:** same AST-quality treatment for `$var`-style runtime macros.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-macros-clang.py`.
- [ ] Same CLI flags + dual-TU parse pattern. Default output = `packages/qw-config/src/data/ezquake-macros-ast.json`.
- [ ] Walk `CALL_EXPR` for `Cmd_AddMacro`, `Cmd_AddMacroEx` (grep confirms both exist). Extract (name, handler_fn, source_file:line, registration_file, flags-arg if present).
- [ ] Enrich from `help_macros.json`: desc, type (integer/string/etc), `teamplay-restricted`, `related-cvars`.
- [ ] Output JSON shape:
  ```json
  {
    "macros": {
      "health": {
        "ast": {
          "handler_fn": "Macro_Health",
          "source_file": "teamplay.c",
          "source_line": 5678,
          "source_column": 2,
          "registration_file": "teamplay.c"
        },
        "desc": "...",
        "type": "integer",
        "teamplay-restricted": false,
        "related-cvars": [...]
      }
    }
  }
  ```
- [ ] **Verify:** spot-check 5 macros (`health`, `armor`, `weapon`, `bestammo`, `location` — or whichever names land in the output). Each should resolve its handler and cite a registration site in `teamplay.c` for most, `cl_demo.c` / `cmd.c` for outliers.

**Done signal:** extractor runs to completion; output JSON has ~120 macros; 4 out of 5 spot-checks have valid AST data.

---

## Task 3: Cmdline params — grep-scan + help merge

**Intent:** cmdline params are doc-first (help_cmdline_params.json is authoritative). Augment with source-backed detection so we know which params are actually used in the codebase vs. documented only.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-cmdline-clang.py` — naming parity with the others, but internally it's a grep + help merge (no libclang call-expr walk; simpler and more appropriate for this pattern).
- [ ] Same CLI flags. Default output = `packages/qw-config/src/data/ezquake-cmdline-params-ast.json`.
- [ ] Algorithm:
  1. Load `help_cmdline_params.json` (authoritative set of ~130 documented params).
  2. Grep all `.c` files for `COM_CheckParm\s*\(\s*"(-[a-zA-Z0-9_-]+)"` → map param → list of (source_file, line) hits.
  3. For each help entry: if grep found hits, `ast = { first_source_file, first_source_line, check_sites: N }`; else `ast = null`.
  4. Also: any `-foo` in source but NOT in help-json → emit with `ast` present but no desc/remarks (source-backed, doc-missing — interesting signal).
- [ ] Output JSON shape:
  ```json
  {
    "params": {
      "-basedir": {
        "ast": {
          "source_file": "common.c",
          "source_line": 1234,
          "check_sites": 3
        },
        "desc": "...",
        "arguments": "<path>",
        "systems": null,
        "flags": null
      }
    }
  }
  ```
- [ ] **Verify:** spot-check `-basedir`, `-port`, `-width`, `-mem`, `-condebug` — all should have `ast` (they're definitely used in source). Any known deprecated param (if any) should have `ast=null`.

**Done signal:** extractor runs to completion; output JSON has ~130 params; the source-backed subset is plausible (most documented params should be source-backed).

---

## Task 4: Loader generalization

**Intent:** make the loader type-agnostic so all four entity types flow through one CLI.

- [ ] Refactor `apps/qw-oracle/scripts/load-knowledge/types.ts`:
  - Keep existing cvar-specific types (`VariableEntry`, `AstBlock`) for backward compat.
  - Add per-type entry interfaces: `CommandEntry`, `MacroEntry`, `CmdlineParamEntry` with their own `ast` shapes.
  - Add generic `ExtractorOutput<T>` with `{ groups?: GroupDef[]; entries: Record<string, T> }`. Add a `parseExtractorOutput<T>(json, field)` helper that normalizes `vars` / `commands` / `macros` / `params` into `entries`.
- [ ] Factor `load-version.ts`:
  - Move `cvarVersionRowFromEntry` into new `load-cvars.ts`.
  - Create `load-commands.ts`, `load-macros.ts`, `load-cmdline-params.ts` with parallel `*VersionRowFromEntry` builders.
  - Per-type module exports `{ fieldName: string; buildVersionRow: (id, version, entry, now) => Row; upsertVersionRow: (db, row) => void; }`.
  - `load-version.ts` drops the `type !== 'cvar'` guard, looks up the per-type module by `options.type`, and uses its `fieldName` + builders inside the existing scaffolding loop.
- [ ] Extend `natural-keys.ts` with `upsertCommandVersion`, `upsertMacroVersion`, `upsertCmdlineParamVersion` mirroring `upsertCvarVersion`.
- [ ] Update `types.ts` row interfaces: `CommandVersionRow`, `MacroVersionRow`, `CmdlineParamVersionRow` mapped to the schema columns in `schema.ts`.
- [ ] Update `index.ts` usage help text to list all four types.
- [ ] `bunx tsc --noEmit` passes.
- [ ] **Verify:** run existing cvar pipeline end-to-end (`load-version` against the existing 3.6.9 snapshot) — row counts must match the Phase 2b e2e snapshot (2901 entities). Regression guard.

**Done signal:** typecheck clean; cvar pipeline still produces identical results; code paths for command/macro/cmdline_param compile and are reachable but unverified until Task 5.

---

## Task 5: End-to-end run against ezQuake head

**Intent:** prove all four entity types flow through the loader into `knowledge.db`.

- [ ] Run the three new extractors against ezQuake head. Log counts.
- [ ] For each new type, run `npm run load-knowledge -- load-version` with the appropriate flags. Log loader output.
- [ ] Verify entity counts in DB:
  ```sql
  SELECT project, type, COUNT(*) FROM entities GROUP BY project, type ORDER BY project, type;
  ```
  Expected: ezquake/cvar ~2901, ezquake/command ~540, ezquake/macro ~120, ezquake/cmdline_param ~130.
- [ ] Spot-check via direct SQL:
  - `say_team` → ezquake/command with handler_fn set, source_file populated
  - `$health` (stored as `health` in the `name` column) → ezquake/macro with handler in teamplay.c
  - `-basedir` → ezquake/cmdline_param, source_backed
- [ ] Update `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` with the full four-type snapshot.
- [ ] Commit each of Tasks 1-5 as its own git commit. Push at the end.

**Done signal:** knowledge.db has all four entity types for ezquake; spot-checks resolve correctly; e2e-verify.md updated.

---

## Open questions / risks (flag during execution)

1. **`Cmd_AddCommand` variants.** Need to grep for `Cmd_AddCommandAlias` / `Cmd_AddCommandExt` / similar before writing Task 1 extractor. If they exist, handle all in one pass.
2. **Array-form command tables.** Some codebases register commands via `{ "name", handler } cmdlist[]` arrays. Grep first. If ezQuake has these, replicate the cvar extractor's `cvar_t xs[N]` array handling pattern.
3. **Macro handler resolution when `Cmd_AddMacroEx` passes a flags arg.** Arg positions differ — inspect both signatures before writing the visitor.
4. **`COM_CheckParm` variants.** ezQuake may also call `COM_CheckParmOffset` or similar. Grep-survey first.
5. **Help-JSON staleness.** help_*.json files are manually curated; some documented names may no longer exist in source. The source_state=doc_only path handles this cleanly — flag count of doc_only entries per type in verification for sanity.

---

## Commit plan

- Task 1 complete → commit `feat(qw-config): libclang AST extractor for ezQuake commands`
- Task 2 complete → commit `feat(qw-config): libclang AST extractor for ezQuake macros`
- Task 3 complete → commit `feat(qw-config): grep+help AST extractor for ezQuake cmdline params`
- Task 4 complete → commit `refactor(qw-oracle): per-type loader modules for all entity types`
- Task 5 complete → commit `feat(qw-oracle): Phase 2c e2e - ezQuake fully loaded across 4 types`
- Final: push main, drain Phase 2c-leading-bullet from HANDOVER (Phase 2d-2h remain).
