# Phase 1 -- L1 export (uniform docs JSON for 6 codebases)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- D1-D21). DONE.
> 2. Read `review-findings.md`; findings this phase OWNS: F1 (slipgate-parity, CRITICAL), F2 (non-ezQuake shape validated late -- emit-side mitigation), F3 (category-version inversion), F4 (ezQuake AST-groups dependency). F5 (category only on cvar+command) is respected here, resolved at render.
> 3. Read the live source cold: `build-snapshot.ts` (full), `SCHEMA.md` (`entities` + the per-type `*_versions` tables), `types.ts`, `constants.ts`, the precursor `taxonomy.md`. DONE -- column existence verified against live schema, not copied from the spec.
> 4. After drafting, dispatch the verification sub-agent before declaring ready for operator review. DONE -- findings folded in; see Open questions for any decision-vs-finding rejections.

## Goal

This phase makes the QW Oracle's Layer 1 corpus available to the docs site as a uniform, per-(codebase, type) JSON projection for all 6 v1 codebases (ezQuake / KTX / MVDSV / QTV / QWFWD / QWCL), WITHOUT perturbing the slipgate-consumed snapshot files that `build-snapshot.ts` already produces. It adds a separate docs emit path (a new `build-docs-snapshot.ts` + a new `build-docs-snapshot` CLI subcommand) that reads `entities` joined to each type's `*_versions` table and writes one uniform-record file per (codebase, type) into a docs-owned directory (`apps/docs-web/data/`). The emitter is generic: a per-codebase config dict + a per-type column map drive it; there is no ezQuake-special code path generalized after the fact. Three probes ship as the verification regime: a slipgate-parity probe (the hard gate, F1/D12), a uniform-shape probe (D13/F2), and a category-coverage probe (D16/F3).

**Runnable state at phase boundary:** `bun scripts/load-knowledge/index.ts build-docs-snapshot` (no args) writes 20 files into `apps/docs-web/data/` (one per emitted (codebase, type) pair), each validating against the uniform record shape; and the slipgate-parity probe reports BYTE-IDENTICAL for all 9 slipgate-consumed files before vs after the docs emit.

## Inputs from previous phase

This is Phase 1; inputs are the items in `prerequisites.md`:

- qw_oracle Postgres up and populated for all 6 codebases (post-enrichment-precursor; verified by the prereq count probe).
- Extractor AST output present for ezQuake (`apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-variables-ast.json` + `ezquake-commands-ast.json`) -- needed for the ezQuake `groups` taxonomy block (F4). These exist today (slipgate's ezquake emit already reads them).
- The slipgate-parity baseline is NOT a hard prerequisite for THIS phase: the parity probe (Task 2) captures its own before-image at run time (capture -> emit -> re-capture -> diff), so it does not depend on the `prerequisites.md` sha256 placeholder being pre-filled. (The prereq placeholder remains a convenience for an operator who wants a standing baseline; the probe is self-contained either way.)
- Node/pnpm are NOT needed for Phase 1 (no docs-web build yet; the export runs on Bun like the rest of `load-knowledge/`).

## Files touched

### Created
```
apps/qw-oracle/scripts/load-knowledge/docs-probe-slipgate-parity.ts     # F1/D12 hard-gate probe; standalone Bun script, import.meta.main
apps/qw-oracle/scripts/load-knowledge/docs-probe-uniform-shape.ts       # D13/F2 shape probe; standalone Bun script
apps/qw-oracle/scripts/load-knowledge/docs-probe-category-coverage.ts   # D16/F3 inversion probe; standalone Bun script
apps/docs-web/data/                                                     # docs-owned output dir; created by mkdirSync at emit time. Phase 2a scaffolds the rest of apps/docs-web AROUND this data dir.
```

`apps/docs-web/data/` will contain (one file per emitted (codebase, type) pair -- 20 files):
```
ezquake-cvar.json  ezquake-command.json  ezquake-macro.json  ezquake-cmdline_param.json
ktx-cvar.json      ktx-command.json      ktx-info_key.json
mvdsv-cvar.json    mvdsv-command.json    mvdsv-info_key.json  mvdsv-cmdline_param.json
qwcl-cvar.json     qwcl-command.json     qwcl-cmdline_param.json
qtv-cvar.json      qtv-command.json
qwfwd-cvar.json    qwfwd-command.json    qwfwd-info_key.json  qwfwd-cmdline_param.json
```
(These are generated artifacts. Whether they are git-tracked or git-ignored is an Open Question for the operator; default = tracked, so the docs build is reproducible from a clean checkout and Phase 2/3 can render without a DB. See Open questions.)

### Modified
```
apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts   # ADD a new docs-emit section (D6/D12: the docs export lives INSIDE build-snapshot.ts -- new functions buildDocsSnapshot + emitDocsType + the DOCS_CODEBASES config + DOCS_OUTPUT_DIR const). Reuses the in-file loadEnrichment / readExtractorAst / writeJson directly (same module -- no exports, no new imports). NO change to any EXISTING emit function, SQL, field name, output path, or DEFAULT_OUTPUT_DIR. Slipgate output is byte-identical by construction (existing emitters untouched; the new docs functions write only to apps/docs-web/data/); the parity probe (Task 2) is the gate that proves it.
apps/qw-oracle/scripts/load-knowledge/index.ts            # ADD a `runBuildDocsSnapshot` CLI handler + register the `build-docs-snapshot` subcommand next to the existing `build-snapshot` registration. Mirrors runBuildSnapshot (index.ts:489-509). Touches no existing handler.
```

### Deleted
```
n/a -- Phase 1 is purely additive.
```

## Tasks

### Task 1 -- Generic docs emitter + CLI subcommand

**Goal:** Add a standalone, generic, codebase-and-type-agnostic docs emitter that projects the uniform L1 record per (codebase, type) into `apps/docs-web/data/`, reusing the existing enrichment/AST helpers, without touching any slipgate emit path.

**Files:** `build-snapshot.ts` (new in-file docs-emit section), `index.ts` (CLI subcommand).

**Steps:**

- [ ] Add the docs-emit section to `build-snapshot.ts`, BELOW the existing emitters (D6/D12: the docs export lives inside build-snapshot.ts). It reuses the existing in-file `loadEnrichment`, `readExtractorAst`, and `writeJson` directly -- same module, so NO `export` keyword and NO new imports are needed (`MONOREPO_ROOT`, `join`, `SCHEMA_VERSION` are already in scope). Add two consts beside the existing `DEFAULT_OUTPUT_DIR` / `SNAPSHOT_SCHEMA_VERSION`:
  ```ts
  const DOCS_OUTPUT_DIR = join(MONOREPO_ROOT, 'apps', 'docs-web', 'data');
  const DOCS_SNAPSHOT_SCHEMA_VERSION = 'docs-snapshot-v1';
  ```
  Do NOT modify any existing emitter, SQL string, field name, `DEFAULT_OUTPUT_DIR`, or the `buildSnapshot` dispatch -- the docs section is purely additive.

- [ ] Ship the per-codebase config dict VERBATIM. The `version` values MUST equal `PROJECT_DEFAULT_SNAPSHOT_VERSION` in build-snapshot.ts (D16/F3 -- frozen, not head, for qtv/qwfwd/qwcl). `helpJsonTrack: true` is ezQuake ONLY (it is the lone codebase whose user-facing description lives on `cvar_versions.help_desc` and whose category resolves through the AST `groups` taxonomy; QWCL borrowed its descriptions onto `entities.description` and the other four came from describe-fill onto `entities.description`).
  ```ts
  type DocsType = 'cvar' | 'command' | 'macro' | 'cmdline_param' | 'info_key';
  interface DocsCodebaseConfig {
    project: Project;
    version: string;
    helpJsonTrack: boolean;
    types: DocsType[];
  }
  const DOCS_CODEBASES: DocsCodebaseConfig[] = [
    { project: 'ezquake', version: 'head',     helpJsonTrack: true,  types: ['cvar', 'command', 'macro', 'cmdline_param'] },
    { project: 'ktx',     version: 'head',     helpJsonTrack: false, types: ['cvar', 'command', 'info_key'] },
    { project: 'mvdsv',   version: 'head',     helpJsonTrack: false, types: ['cvar', 'command', 'info_key', 'cmdline_param'] },
    { project: 'qwcl',    version: '2.33',     helpJsonTrack: false, types: ['cvar', 'command', 'cmdline_param'] },
    { project: 'qtv',     version: '1.16-dev', helpJsonTrack: false, types: ['cvar', 'command'] },
    { project: 'qwfwd',   version: '1.40-dev', helpJsonTrack: false, types: ['cvar', 'command', 'info_key', 'cmdline_param'] },
  ];
  ```
  (This is the v1 user-facing tunable-type set. Deep-internal / high-count types -- KTX/MVDSV `log_template`, MVDSV `protocol_message` / `qc_builtin`, KTX `match_event` -- are deliberately NOT listed; adding one later is a one-line `types` edit + a frontend config addition, zero renderer rework per D14. See Open questions: the v1 type-scope is the operator's call at this boundary.)

- [ ] Define the uniform record. It is a UNION shape; each (codebase, type) emits the SUBSET its data supports. Absent fields are OMITTED, never null-filled (D13). Required on every record: `name`, `first_seen`, `last_seen`. Optional: `raw_type`, `default`, `description`, `remarks`, `values`, `category`, `source_ref`, `default_history`, plus the per-type meta noted below. NOTE: `friendly_type` is NOT emitted -- it is derived in the frontend data module from `raw_type` + value-list presence (D5/D18/D15); the export ships the raw inputs only. `category` is emitted as the RAW token (ezQuake: `help_group_id`; others: `category_inferred`); the frontend data module resolves ezQuake's token to a label via the shipped `groups` block (D13 default: resolve in frontend -- see Open questions for the locked rationale).
  ```ts
  interface DocsRecord {
    name: string;
    raw_type?: string;            // cvar only (cvar_versions.help_type); absent elsewhere
    default?: string;             // cvar only (cvar_versions.default_value)
    description?: string;         // ezQuake: help_desc w/ synth-fallback; others: entities.description
    remarks?: string;             // cvar/command/cmdline_param (help_remarks); absent for macro/info_key
    values?: unknown;             // cvar only (help_values, JSON-parsed); absent elsewhere
    category?: string;            // cvar+command only (F5): raw token, frontend-resolved
    source_ref?: { file: string; line: number };   // all types where source_file is present
    first_seen: string;
    last_seen: string;
    default_history?: Array<{ version: string; value: string }>;   // cvar only, ezQuake in practice (>=2 distinct defaults)
    // per-type meta (emitted where the column exists; absent otherwise):
    macro_type?: string;          // macro only (macro_versions.macro_type)
    arguments?: string;           // cmdline_param only (cmdline_param_versions.arguments)
    scope?: string;               // info_key only (info_key_versions.scope: userinfo|serverinfo|localinfo)
  }
  ```

- [ ] Implement the generic per-type fetch + projection. The description-source and category-source are the ONLY codebase-conditional reads; everything else is uniform. Per type, SELECT only columns that exist on that type's `*_versions` table (verified against SCHEMA.md / types.ts -- see the per-type column matrix below). The `entities` join supplies `name`, `description`, `description_origin`, `first_seen_version`, `last_seen_version`, filtered to `source_state IN ('source_backed', 'dynamically_registered')` (mirrors build-snapshot's filter scope). Description rule:
  - **ezQuake (helpJsonTrack true), cvar/command/macro/cmdline_param:** reuse build-snapshot's exact synthesized-fallback CASE -- `CASE WHEN e.description_origin = 'synthesized' AND NULLIF(TRIM(<t>.help_desc), '') IS NULL THEN e.description ELSE <t>.help_desc END`. (This guard is load-bearing: it avoids emitting the deriver's combined desc+remarks+values form for rows where only help_remarks is populated -- see build-snapshot.ts:193-197 (the CASE itself; rationale comment at :172-179).)
  - **All other 5 codebases (helpJsonTrack false), every type:** `description = e.description` directly. These codebases have no help-JSON track; `help_desc` is empty/NULL and the user-facing prose lives on `entities.description` (QWCL borrow = origin `inherited`; KTX/MVDSV/QTV/QWFWD = describe-fill origin `synthesized`/`source_inline`).
  - **info_key (any codebase):** ALWAYS `description = e.description`. `info_key_versions` has NO `help_desc` column (verified: types.ts:522-539, SCHEMA.md:597-610). info_key only appears under helpJsonTrack-false codebases anyway, so this is consistent.

  Category rule (cvar + command only; F5):
  - **ezQuake:** `category = <t>.help_group_id` (raw group-id token). Additionally load the ezQuake `groups` block via `readExtractorAst` (`ezquake-variables-ast.json` for cvar, `ezquake-commands-ast.json` for command) and emit it at the file root so the frontend can resolve group-id -> label (F4 -- the groups taxonomy lives in the extractor AST output, not the DB).
  - **Others:** `category = <t>.category_inferred` (already a human-readable label).
  - **Types with no category column (macro, cmdline_param, info_key):** omit `category` entirely; they render uncategorized (D17 implication / D11).

  raw_type / values / default (cvar only): `raw_type = cv.help_type`, `values = JSON.parse(cv.help_values)` (help_values is TEXT pre-stringified JSON; wrap in try/catch and omit on parse failure, mirroring build-snapshot.ts:330-333), `default = cv.default_value`. Omit each when null.

  source_ref (all types): `{ file: <t>.source_file, line: <t>.source_line }` when `source_file` is non-null; omit otherwise.

  Enrichment (first_seen / last_seen / default_history): call `loadEnrichment(sql, project, type)` and merge by entity name. `default_history` is cvar-only and only present where >=2 distinct defaults exist across versions (so ezQuake populates it; single-snapshot codebases naturally omit it). `first_seen` / `last_seen` map from `first_seen_version` / `last_seen_version`.

- [ ] Typing + helper discipline (two traps, both verified against the live DB via information_schema):
  - Type every SELECT result with an INLINE `sql<Array<{ ... }>>` shape (exactly as `emitQwclVariables` does at build-snapshot.ts:459-465). Do NOT cast results to the `CvarVersionRow` / `CommandVersionRow` interfaces in `types.ts` -- those interfaces are STALE (they predate migration 016 and omit `category_inferred` / `category_inferred_origin`). The columns DO exist in the live DB, so the SQL is valid; only the TS interface is behind, and a cast would fail the `tsc` phase-boundary check.
  - Write FRESH SELECTs. Do NOT reuse the slipgate-shaped `fetchCvarRows` / `fetchCommandRows` / `fetchMacroRows` / `fetchCmdlineRows` helpers -- they project the slipgate shape and omit columns the docs record needs (`fetchCommandRows` at build-snapshot.ts:208-230 selects no `source_file` / `source_line`, which `source_ref` requires). All five v1 types carry `source_file` + `source_line` on their version tables (cvar / command / cmdline_param / info_key verified in the live information_schema; macro per types.ts:480-481 + the shared `*_versions` skeleton), so `source_ref` emits for every type.

- [ ] Per-type column matrix the SELECTs must honor (every column below is verified to exist on the live table; do NOT SELECT a column not listed for that type):
  ```
  cvar         (cvar_versions):          help_desc, help_remarks, help_values, help_type, default_value, help_group_id, category_inferred, source_file, source_line   + entities: description, description_origin
  command      (command_versions):       help_desc, help_remarks, help_group_id, category_inferred, source_file, source_line                                          + entities: description, description_origin
  macro        (macro_versions):         help_desc, macro_type, source_file, source_line                                                                              + entities: description, description_origin
  cmdline_param(cmdline_param_versions):  help_desc, help_remarks, arguments, source_file, source_line                                                                + entities: description, description_origin
  info_key     (info_key_versions):      scope, source_file, source_line  (NO help_desc, NO category_inferred, NO source_root on the projected set)                   + entities: description, description_origin
  ```

- [ ] Per (codebase, type) file shape -- container `{ _meta, groups?, entries }`:
  ```ts
  {
    _meta: {
      schema_version: 'docs-snapshot-v1',
      generated_at: <ISO>,
      codebase: <project>,
      type: <type>,
      snapshot_version: <frozen version>,
      upstream_commit: <versions.commit_sha for (project, version)>,  // lets Phase 4 build source URLs
    },
    groups?: [ { id, 'major-group'?, name } ],   // ezQuake cvar+command ONLY
    entries: [ DocsRecord, ... ]                  // array, name embedded -- list-friendly for the renderer
  }
  ```
  Write via a local `writeJson` (mkdirSync recursive + `JSON.stringify(content, null, 2) + '\n'`), mirroring build-snapshot.ts:657-662. File name: `<project>-<type>.json`.

- [ ] `buildDocsSnapshot` entry point: signature + version-existence guard (mirror build-snapshot.ts:694-718 for the `versions` row check, per codebase). Default codebases = all 6; default outputDir = `DOCS_OUTPUT_DIR`. Owns its own `sql` handle when not passed (mirror build-snapshot's owned-sql teardown):
  ```ts
  export interface BuildDocsSnapshotOptions { sql?: postgres.Sql; codebases?: Project[]; outputDir?: string; }
  export interface BuildDocsSnapshotResult { outputDir: string; files: Array<{ file: string; codebase: string; type: string; entities: number; bytes: number }>; }
  export async function buildDocsSnapshot(opts: BuildDocsSnapshotOptions): Promise<BuildDocsSnapshotResult>;
  ```
  For each configured codebase: assert its `versions` row exists at the frozen version (throw with a `run extract-tag first` message if not); load the ezQuake `groups` blocks once if helpJsonTrack; for each `type` in its config, run the generic emit and push a `files` entry. Invocation is through the `build-docs-snapshot` CLI subcommand (index.ts); no separate `import.meta.main` guard is added to build-snapshot.ts (it has none today, and `build-snapshot` dispatches the same way).

- [ ] Wire the CLI in `index.ts`: add `runBuildDocsSnapshot(args)` mirroring `runBuildSnapshot` (index.ts:489-509) -- parse `--output` (default unset -> emitter default) and optional `--codebase` (repeatable or comma-split; default all 6), `await import('./build-snapshot.js')` to get `buildDocsSnapshot` (exported from the same module as `buildSnapshot`), call it, `console.log(JSON.stringify(result, null, 2))`. Register `build-docs-snapshot` in index.ts's subcommand dispatch right beside the existing `build-snapshot` entry.

**Verification:**
- `bun scripts/load-knowledge/index.ts build-docs-snapshot` exits 0 and prints a `files` array of length 20. YES/NO.
- `ls apps/docs-web/data/*.json | wc -l` == 20. YES/NO.
- `bunx tsc --noEmit` (or the repo's typecheck) is clean. (build-snapshot's existing functions are untouched; the new docs functions use inline SELECT result types per the typing-discipline step, so they do not depend on the stale CvarVersionRow/CommandVersionRow interfaces.) YES/NO.

**Execution mode:** `subagent (Opus medium)` -- the core synthesis: a new generic emitter spanning 5 entity types x 6 codebases with two codebase-conditional read rules, reusing shared helpers, touching the shared producer under the F1/D12 slipgate hard gate. Breadth of types + the gate justify Opus; medium effort suffices because this MD fully specifies the config, the record, the SQL rules, and the file shape (no architecture left open).

### Task 2 -- slipgate-parity probe (F1/D12 hard gate)

**Goal:** Prove the docs emit changes NONE of the files slipgate consumes.

**Files:** `docs-probe-slipgate-parity.ts` (created).

**Steps:**
- [ ] Standalone Bun script (`import.meta.main`). Define the 9 slipgate-consumed files (absolute paths under `apps/slipgate-app/src/lib/config/data/`): `ezquake-variables.json`, `ezquake-commands.json`, `ezquake-macros.json`, `ezquake-cmdline-params.json`, `ezquake-asset-bundle.json`, `qwcl-variables.json`, `qwcl-variables-meta.json`, `qw-maps.json`, `qw-gameplay.json`. (This list = the files the existing ezquake/qwcl/qw emitters write; sourced from build-snapshot.ts dispatch + prerequisites.md Task 0.)
- [ ] Capture phase: `sha256` each file that exists (record absent files explicitly -- an absent file flipping to present is also a failure).
- [ ] Run the docs emit IN-PROCESS: `import { buildDocsSnapshot } from './build-snapshot.js'` and `await buildDocsSnapshot({})` (all 6 codebases, default docs dir). Do NOT shell out to a second process (keeps the probe hermetic and fast).
- [ ] Re-capture phase: `sha256` the same 9 files.
- [ ] Assert every (file -> hash) pair is identical before vs after. Print a PASS/FAIL line per file and an overall verdict; `process.exitCode = anyDiff ? 1 : 0`. On any diff, print the offending file(s) and both hashes.
- [ ] Note in a header comment: this probe is self-contained -- it captures its OWN baseline, so it does not depend on the `prerequisites.md` sha256 placeholder being filled. The semantic gate is "the docs emit did not touch slipgate's dir," which holds by construction (the docs path writes only to `apps/docs-web/data/` and never calls the slipgate emitters); the probe is the belt-and-suspenders proof against a shared-helper mutation.

**Verification:** `bun scripts/load-knowledge/docs-probe-slipgate-parity.ts` exits 0 and prints "PARITY OK" for all 9 files. PASS condition: exit 0, all 9 identical. FAIL condition: any file's hash differs or presence flips -> the docs emit perturbed slipgate's dir or a shared helper (consult Recovery).

**Execution mode:** `subagent (Sonnet medium)` -- a focused single-file probe with a clear spec; code synthesis from 1-2 sources (the file list + buildDocsSnapshot import). No architecture; Sonnet medium per the phase-template probe row.

### Task 3 -- uniform-shape probe (D13/F2)

**Goal:** Prove every emitted record conforms to the uniform shape -- allowed keys only, required keys present, absent fields OMITTED (not null), and no description that duplicates its own remarks (the combined-form guard).

**Files:** `docs-probe-uniform-shape.ts` (created).

**Steps:**
- [ ] Standalone Bun script. Read every `apps/docs-web/data/*.json`. For each file: assert `_meta` carries the 6 expected keys; assert `entries` is an array; for ezQuake cvar/command files assert a non-empty `groups` array is present, and for all OTHER files assert `groups` is ABSENT (D11 -- no empty-array null-fill).
- [ ] For every record in `entries`: assert keys are a SUBSET of the allowed union {name, raw_type, default, description, remarks, values, category, source_ref, first_seen, last_seen, default_history, macro_type, arguments, scope}; assert required keys present (`name`, `first_seen`, `last_seen`); assert NO key holds a `null` value (absence is omission, not null -- the legacy null-fill anti-pattern); assert `source_ref`, when present, is `{file: string, line: number}`; assert `values`/`default_history`, when present, are non-null arrays/objects.
- [ ] Combined-form guard (the description edge -- build-snapshot.ts:193-197 CASE, rationale comment :172-179): for any record carrying BOTH `description` and `remarks`, assert `description` does not literally contain the `remarks` string (catches an accidental emit of the deriver's combined desc+remarks form). Report count of any violations.
- [ ] Print per-file record counts + a total; print violation count by class; `process.exitCode = violations ? 1 : 0`.

**Verification:** `bun scripts/load-knowledge/docs-probe-uniform-shape.ts` exits 0 with 0 violations across all 20 files. PASS condition: 0 violations. FAIL condition: any record violates the shape, any null-filled field, any combined-form duplication, or an empty `groups` array on a non-ezQuake file.

**Execution mode:** `subagent (Sonnet medium)` -- validation script, read-and-assert against a fixed contract; the contract is fully specified here. Sonnet medium per the probe row.

### Task 4 -- category-coverage probe (D16/F3 inversion guard)

**Goal:** Catch the head-vs-frozen category inversion: prove cvar category coverage is NON-EMPTY for qtv/qwfwd/qwcl at their FROZEN snapshot versions (the failure mode is reading `head`, where `category_inferred` is present on the row but the snapshot consumer expects the frozen label -- or worse, an empty read).

**Files:** `docs-probe-category-coverage.ts` (created).

**Steps:**
- [ ] Standalone Bun script. For each of qtv (`qtv-cvar.json`), qwfwd (`qwfwd-cvar.json`), qwcl (`qwcl-cvar.json`): read the emitted file and assert the fraction of `entries` carrying a non-empty `category` is >= a high threshold (the precursor categorized 100% of these codebases' cvars; assert `>= 0.95` to allow for any single legitimately-uncategorized row, and print the actual fraction). This is the inversion guard: at the FROZEN version `category_inferred` is populated (the precursor wrote it to ALL version rows); reading `head` instead would still have it on the row, so this probe ALSO cross-checks that the emitted `_meta.snapshot_version` equals the frozen version (`1.16-dev` / `1.40-dev` / `2.33`), failing loudly if a future edit flips the dispatch to `head`.
- [ ] COMMAND-category coverage is REPORTED (printed) but NOT asserted as a hard gate: the precursor's command categorization is verified for MVDSV/QTV/QWFWD but QWCL command coverage is less certain (taxonomy.md documents the QWCL lane for cvars; QWCL command categorization is an open precursor-scope question -- see Open questions). A genuinely-empty command category degrades gracefully to uncategorized (D11/F5); it is NOT a Phase 1 failure. Print the per-codebase command coverage fraction for operator visibility.
- [ ] Print per-codebase cvar coverage + snapshot_version check + command coverage (informational); `process.exitCode = (anyCvarBelowThreshold || anyWrongSnapshotVersion) ? 1 : 0`.

**Verification:** `bun scripts/load-knowledge/docs-probe-category-coverage.ts` exits 0; qtv/qwfwd/qwcl cvar category coverage each >= 0.95 AND each file's `_meta.snapshot_version` is the frozen value. PASS condition: all three pass both checks. FAIL condition: any cvar coverage < 0.95 (likely a wrong-version read -- consult Recovery) or any `_meta.snapshot_version` == `head`.

**Execution mode:** `subagent (Sonnet medium)` -- focused coverage assertion over emitted files; fully specified. Sonnet medium per the probe row.

## Verification (phase boundary)

Run these in order; each is YES/NO. PASS -> Phase 2a may start. FAIL -> consult Recovery.

1. `cd apps/qw-oracle && bun scripts/load-knowledge/index.ts build-docs-snapshot` exits 0 and prints a `files` array of length 20. PASS: exit 0, 20 files. FAIL: throw (most likely a missing `versions` row -> run extract-tag, or a column-name typo -> fix the SELECT).
2. `ls apps/docs-web/data/*.json | wc -l` == 20. PASS: 20. FAIL: a (codebase, type) pair did not emit.
3. `bun scripts/load-knowledge/docs-probe-slipgate-parity.ts` -> "PARITY OK", exit 0. PASS: all 9 slipgate files byte-identical. FAIL: docs emit perturbed slipgate's dir (HARD GATE -- do not proceed).
4. `bun scripts/load-knowledge/docs-probe-uniform-shape.ts` -> 0 violations, exit 0. PASS: every record conforms. FAIL: shape drift / null-fill / combined-form duplication.
5. `bun scripts/load-knowledge/docs-probe-category-coverage.ts` -> exit 0. PASS: qtv/qwfwd/qwcl cvar category coverage >= 0.95 and frozen snapshot_version confirmed. FAIL: wrong-version read or empty category.
6. `bunx tsc --noEmit` (or the repo typecheck for load-knowledge) is clean. PASS: no type errors. FAIL: fix before proceeding.

## Outputs to next phase

What is now true that was not before:
- `apps/docs-web/data/` exists and holds 20 uniform-record JSON files (one per emitted (codebase, type) pair) for all 6 v1 codebases, each `{ _meta, groups?, entries: DocsRecord[] }`.
- The uniform record shape is FROZEN and probe-validated: a strict subset of `{name, raw_type, default, description, remarks, values, category, source_ref, first_seen, last_seen, default_history, macro_type, arguments, scope}`, absent fields omitted. Phase 2b's renderer consumes THIS shape (generic record in, render out) so Phase 3 is data-only (F2 mitigation).
- `friendly_type` is NOT in the data -- Phase 2b's frontend data module derives it from `raw_type` + value-list presence (D5/D18). `category` is the raw token -- the frontend data module resolves ezQuake's via the file-root `groups` block (D13 default).
- `_meta.upstream_commit` + `source_ref.{file,line}` are present per record -- Phase 4 builds source-link URLs from these (no new export needed in Phase 4).
- slipgate's 9 consumed files are provably untouched (parity probe green) -- the docs export is a pure additive sidecar.

This mirrors Phase 2a's "Inputs from previous phase."

## Open questions / deferred items

- **Question:** v1 type-scope -- emit only user-facing tunable types (cvar, command, macro, cmdline_param, info_key), deferring the deep-internal / high-count types (KTX 1196 `log_template`, MVDSV 691 `log_template` / 105 `protocol_message` / 93 `qc_builtin`, KTX 7 `match_event`)?
  - **Default chosen for now:** Defer them. `DOCS_CODEBASES.types` lists only the 5 tunable types. Adding a deferred type later is a one-line `types` edit + a frontend config addition -- zero renderer rework (D14). The deferred types are developer-internal (log format strings, wire-protocol bytes, QC builtins), not "tunable knobs a player browses."
  - **Who can resolve:** operator, at THIS phase boundary. This is the one decision to make here. If the operator wants any deferred type in v1, add it to the relevant codebase's `types` and re-run; the emitter already handles it generically (the only new work would be a per-type column map entry for that type).

- **Question:** Are the 20 generated `apps/docs-web/data/*.json` files git-tracked or git-ignored?
  - **Default chosen for now:** Tracked. The docs site (Phase 2/3) then builds from a clean checkout with no DB dependency, and the snapshot is diff-reviewable. Re-running the emit overwrites them deterministically.
  - **Who can resolve:** operator (or defer to Phase 2a, which sets up `apps/docs-web` and can decide alongside the VitePress data-loading wiring). Low-stakes; flagged so it is not a silent default.

- **Question (locked, not blocking):** category + friendly_type derivation site -- export or frontend?
  - **Default chosen (locked per `prerequisites.md` pre-decision + D13):** Frontend data module. The export ships RAW inputs (raw_type, values, raw category token, ezQuake `groups` block); the frontend derives friendly_type and resolves ezQuake's category token to a label. Rationale: keeps the export a faithful L1 projection and keeps derivation in the swappable-frontend logic layer (D15). D13 explicitly hands this lock to Phase 1; the default is locked, not re-opened. Operator can override to "resolve at export" at the boundary if preferred (it would make the record's `category` a uniform label and drop the `groups` block, at the cost of baking the group-resolution lookup into the export).
  - **Who can resolve:** operator (override-only; otherwise locked).

- **Question (precursor-scope, not a Phase 1 blocker):** Do qwcl/qtv/qwfwd COMMANDS carry `category_inferred`?
  - **Default chosen for now:** The category-coverage probe (Task 4) ASSERTS only on cvar coverage (known-full) and REPORTS command coverage. A genuinely-empty command category for any codebase degrades to uncategorized (D11/F5) and is a question for the enrichment precursor's scope, not a Phase 1 failure. Phase 1 emits whatever `category_inferred` exists.
  - **Who can resolve:** operator / a precursor follow-up arc, if the reported command coverage is surprisingly low and the operator wants it backfilled.

- **Verification sub-agent triage (2026-06-09):**
  - **S1 (verifier claimed `cmdline_param_versions` lacks `source_file`/`source_line`) -- REJECTED as a false positive.** Verified against the live DB (information_schema) AND types.ts:498-499: both columns exist. The verifier misread SCHEMA.md's per-type list as exhaustive (source_file/source_line are in the shared `*_versions` skeleton, SCHEMA.md:131-136). No change; the plan's cmdline_param `source_ref` emit is correct.
  - **A3 (verifier: new-file vs extend-build-snapshot.ts) -- RECONCILED to the decision.** D6 + D12 prescribe the docs export living INSIDE `build-snapshot.ts` (D12: "a NEW emit target inside build-snapshot.ts"). The first draft used a separate `build-docs-snapshot.ts`; it now adds the docs section in-file. No Deviation section is needed -- the plan conforms to the decision rather than deviating from it.
  - **C1 + S3 -- FOLDED IN as the Task-1 typing-discipline step:** use inline SELECT result types (the `CvarVersionRow`/`CommandVersionRow` interfaces are stale and omit `category_inferred`), and write fresh SELECTs rather than reusing the slipgate `fetch*` helpers.

## Recovery (if verification fails)

- **slipgate-parity probe fails (Task 2 / step 3):** the docs emit wrote into slipgate's dir or mutated a shared helper. Most likely cause: a change to `build-snapshot.ts` beyond the two `export` keywords, or a `buildDocsSnapshot` call that accidentally reused `DEFAULT_OUTPUT_DIR`. Revert any non-`export` edit to build-snapshot.ts; confirm `DOCS_OUTPUT_DIR` is `apps/docs-web/data/` and is the only dir the docs path writes; re-run. This is the HARD GATE -- do not proceed to Phase 2 until green.
- **category-coverage probe fails -- cvar coverage near zero for qtv/qwfwd/qwcl (Task 4):** you read `head` instead of the frozen version for those three (F3/D16). Confirm `DOCS_CODEBASES[*].version` equals `PROJECT_DEFAULT_SNAPSHOT_VERSION` (qtv `1.16-dev`, qwfwd `1.40-dev`, qwcl `2.33`) and that `_meta.snapshot_version` reflects it. Switch to the frozen version and re-run.
- **emit throws "No versions row for <project>@<version>":** the frozen version was not extracted into `versions`. Run extract-tag for that (project, version), or confirm the version string matches what the precursor loaded.
- **uniform-shape probe flags a null-filled field (Task 3):** an emit branch wrote `key: null` instead of omitting the key. Find the offending projection branch and guard it with an `if (value != null)` before assignment (mirror build-snapshot's `if (r.help_desc) entry.desc = ...` pattern).
- **uniform-shape probe flags combined-form duplication (Task 3):** an ezQuake record's `description` contains its `remarks` -- the synthesized-fallback CASE was applied to a non-synthesized row, or applied to a codebase that should read `entities.description` directly. Re-check the description rule: ezQuake uses the origin-gated CASE; the other 5 read `entities.description`.
- **Unanticipated failure:** route to operator with the exact failing probe output and the offending record/file. Do not paper over a parity or shape failure to "make the phase pass."
