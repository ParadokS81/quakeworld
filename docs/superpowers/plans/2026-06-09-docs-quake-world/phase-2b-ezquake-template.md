# Phase 2b -- ezQuake template (generic browse + card renderer)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- D1-D22). Central here: D3, D4, D5, D8, D11, D14, D15, D17, D18, D22 (D22 was missing from the drafter-prompt central list -- it is OWNED by this phase).
> 2. Read `review-findings.md`. Applicable carry-forwards: F2/F5 (uniform shape + category only on cvar/command -- the renderer must degrade gracefully), F6 (qtv/qwfwd source-link is a version string, not a SHA -- a Phase-4 concern, scoped out of 2b's ezQuake-only source links), F7 (129 ezQuake commands are uncategorized -> the Grouped view shows a first-class "(uncategorized)" bucket), F10 (daisyUI include-vs-usage probe), F11 (D15 grep false-positives on comment tokens), F12 (execution-mode is content-conditional -- synthesis is subagent, locked contract is inline).
> 3. Read the live scaffold cold (Phase 2a, commit `945a3292`): `apps/docs-web/lib/{types,snapshot}.ts`, `.vitepress/theme/{index.ts,style.css,codebases.data.ts,components/CodebaseGrid.vue}`, `[codebase].{md,paths.ts}`, `[codebase]/[type].{md,paths.ts}`. EXTEND these; do NOT re-derive their shapes. Verify field presence against the live `apps/docs-web/data/ezquake-*.json`, not the spec (the spec's D13 record list is stale).
> 4. After drafting, dispatch the verification sub-agent (Explore, see `phase-template.md`) before declaring the phase MD ready for operator review.

## Goal

Build the type-generic, codebase-generic browse + card renderer -- the D14/D15 architectural heart -- and prove it end-to-end on ezQuake (the richest data, the tracer bullet). This phase replaces the Phase-2a stub at `/<codebase>/<type>` with a real browse view: a filterable, scannable list (one row per entity, vertically-aligned `Name | Type | Default | Description-preview` columns, no zigzag) with a category Flat/Grouped toggle (D3) and inline-expand cards (D4: full description + remarks + values + a meta strip carrying category, source link, ezQuake version-walk, and the dormant Phase-4 "Used in" slot). Every data read, derivation, and shaping step lives in framework-agnostic plain-TS `lib/` modules (the friendly-type mapper D18, the category resolver D17, the free-text filter D3, the version-walk reader D8, the source-link builder D8, the stable per-entity anchor scheme D22, and a build-time browse shaper that pre-resolves each page's render-ready rows); the Vue components are dumb readers of that build-time-shaped data (D15). The result is that Phase 3 feeds the other 5 codebases through these SAME components as data + config only -- zero new component code (D14). **Runnable state at phase boundary:** `pnpm --dir apps/docs-web run docs:dev` serves the four ezQuake browse views (`/ezquake/cvar`, `/ezquake/command`, `/ezquake/macro`, `/ezquake/cmdline_param`); typing in the filter box narrows the list live; the Flat/Grouped toggle regroups cvars by category (with a first-class "(uncategorized)" bucket for the 129 uncategorized commands, F7); clicking a row expands it in place to the full card; ezQuake source links resolve to the exact line on GitHub; version-walk renders for the ezQuake cvars that carry default history (e.g. `cl_chunksperframe`: v3.0 -> 5, then 3.6.3 -> 30); and each row carries a stable deep-link anchor `/<codebase>/<type>#<case-folded-name>` (D22).

## Inputs from previous phase

- **Phase 2a complete (shipped `945a3292`):** `apps/docs-web` is an installable, bootable VitePress + Tailwind v4 + daisyUI site (its own pnpm workspace, D20). The data/logic split exists from day one:
  - `lib/types.ts` -- the VERIFIED docs-snapshot contract (`Snapshot`, `EntityRecord`, `CategoryGroup`, `SnapshotMeta`, `EntityValue`, `DefaultHistoryEntry`, `SourceRef`). This phase IMPORTS it; it does not redefine the emit contract.
  - `lib/snapshot.ts` -- `listSnapshots()` + `loadSnapshot(codebase, type)`, framework-agnostic, proven to read the Phase-1 JSON. This phase's build-time shaper calls `loadSnapshot`; it does not re-implement file reading.
  - `.vitepress/theme/codebases.data.ts` -- the ONLY VitePress-coupled data-glue pattern (`defineLoader`). This phase's per-page data follows the SAME spirit but uses the **dynamic-route `paths()` params-attach** mechanism (see Task 3), because browse data is per-(codebase,type), not global.
  - `.vitepress/theme/index.ts` -- extends `DefaultTheme`, registers global components. This phase registers `EntityBrowse` + `CodebaseLanding` alongside the existing `CodebaseGrid`.
  - `.vitepress/theme/style.css` -- the daisyUI `@plugin` block with the `include:` list. Verified present today: `badge, breadcrumbs, button, card, collapse, divider, dropdown, indicator, input, join, label, loading, list, menu, progress, range, rootcolor, scrollbar, select, skeleton, swap, tab, toggle`. The 2b components draw only from this set (F10).
  - `[codebase].{md,paths.ts}` + `[codebase]/[type].{md,paths.ts}` -- the stub dynamic routes. This phase REPLACES the two `.md` stub bodies with component mounts and EXTENDS the two `.paths.ts` loaders to attach render-ready data to params. The clean `/<codebase>/<type>` URL scheme (chosen in 2a to be D22-compatible) is unchanged.
- **Phase 1 data on disk (read-only):** `apps/docs-web/data/ezquake-{cvar,command,macro,cmdline_param}.json`. Verified shapes (live, 2026-06-10):
  - `ezquake-cvar.json`: 2743 entries; every entry has `name/first_seen/last_seen/raw_type/default/category/source_ref`; `values` on 624; `description` on 1970; `remarks` on 388; `default_history` on 35. `groups`: 54 two-level `{id (numeric string e.g. "43"), "major-group", name}`. raw_type: boolean 843 / enum 166 / float 718 / integer 295 / string 721.
  - `ezquake-command.json`: 624 entries; `category` on 495 (129 uncategorized, F7); `description` on 445; `remarks` on 22. NO `raw_type`, NO `default`, NO `values`. `groups`: 14 FLAT `{id (slug e.g. "action"), name}` (NO `major-group`).
  - `ezquake-macro.json`: 66 entries; `description` on all 66; `macro_type` on 28. No `category`, no `groups`.
  - `ezquake-cmdline_param.json`: 65 entries; `description` on 63; `arguments` on 5; `remarks` on 3. No `category`, no `groups`.
- **Local-dev environment:** Node.js LTS (>= 20) + pnpm via corepack (prerequisites.md Task 0). No qw-oracle / Postgres dependency -- 2b reads only the static JSON on disk.

## Files touched

Absolute paths from repo root. Everything lives under the existing `apps/docs-web/` subtree (D20); nothing outside it is touched (no `build-snapshot.ts`, no slipgate, no root `package.json`, no `apps/docs-web/data/*.json` writes).

### Created
```
apps/docs-web/lib/browse-types.ts                              # render contract (FriendlyType, ColumnKey, BrowseRow, BrowseData, CodebaseLandingData); pure types, no runtime, no fs -- safe for components to type-import
apps/docs-web/lib/derive.ts                                    # friendlyType(record) -> toggle|choice|number|text|undefined (D18); pure
apps/docs-web/lib/derive.test.ts                               # D18 per-codebase reachability matrix (ezQuake all four; QWCL no choice; no-raw_type -> blank)
apps/docs-web/lib/category.ts                                  # resolveCategory(record, groups?) (build-time, D17) + groupByCategory(rows) (render-time, D3/F7); pure
apps/docs-web/lib/category.test.ts                             # D17 resolution: ezQuake id->label (cvar numeric + command slug), unresolved-id passthrough, non-ezQuake label passthrough, uncategorized bucket
apps/docs-web/lib/filter.ts                                    # filterEntries(rows, query) free-text over name+description, case-insensitive (D3); pure
apps/docs-web/lib/version-walk.ts                              # versionWalk(record) -> {firstSeen,lastSeen,history,hasHistory} (D8); pure
apps/docs-web/lib/anchor.ts                                    # entityAnchor(name) = case-folded lower(name) (D22); pure
apps/docs-web/lib/source-link.ts                               # sourceUrl(codebase, meta, sourceRef) -> GitHub deep link | undefined (D8); ezQuake verified, others Phase 4
apps/docs-web/lib/browse.ts                                    # shapeBrowse(codebase,type) + shapeCodebaseLanding(codebase): build-time orchestrators that call the pure modules; the ONLY lib module that imports snapshot.ts (fs)
apps/docs-web/.vitepress/theme/components/EntityBrowse.vue     # generic browse view (hero): filter box + Flat/Grouped toggle + row list; dumb (reads params, calls lib in computeds) -- D14/D15
apps/docs-web/.vitepress/theme/components/EntityCard.vue       # generic collapsed-row + inline-expand card; dumb; aligned columns; daisyUI tokens -- D4/D14/D15
apps/docs-web/.vitepress/theme/components/CodebaseLanding.vue  # per-codebase landing (lists the codebase's types with counts/links); dumb; codebase-generic -- Phase 3 inherits
```

### Modified
```
apps/docs-web/lib/types.ts                          # NO CHANGE expected. Only touch if a field used by the shaper is genuinely missing from the contract (it is not -- verified). Left here as an explicit "do not edit" note.
apps/docs-web/package.json                          # add devDep `vitest` + a `"test": "vitest run"` script (first test runner in docs-web -- see Open Questions); no other change
apps/docs-web/.vitepress/theme/index.ts             # register EntityBrowse + CodebaseLanding globally (additive; CodebaseGrid stays)
apps/docs-web/.vitepress/theme/style.css            # ONLY IF the include-vs-usage probe finds a used daisyUI component not in the include list (expected: no change -- the list already covers the 2b set, F10)
apps/docs-web/[codebase]/[type].paths.ts            # attach shapeBrowse(codebase,type) to each pair's params (per-page render-ready slice)
apps/docs-web/[codebase]/[type].md                  # replace the stub body with <EntityBrowse/> (final form -- Phase 3 reuses verbatim)
apps/docs-web/[codebase].paths.ts                   # attach shapeCodebaseLanding(codebase) to each codebase's params
apps/docs-web/[codebase].md                         # replace the stub body with <CodebaseLanding/> (final form)
```

### Deleted
```
n/a
```

## Tasks

### Task 1 -- render contract (`lib/browse-types.ts`)

- **Goal:** Lock the render contract that BOTH the build-time shaper (Task 3) and the dumb components (Tasks 4-5) consume, so neither subagent invents a divergent shape. Pure types, zero runtime, no `fs` import -- a component may `import type` from it with no bundling cost.
- **Files:** `apps/docs-web/lib/browse-types.ts`.
- **Steps:**
  - [ ] Write `apps/docs-web/lib/browse-types.ts` with this exact content:
    ```ts
    // The RENDER contract (frontend-derived), distinct from lib/types.ts (the
    // build-snapshot EMIT contract). The build-time shaper (lib/browse.ts) produces
    // these; the dumb components (EntityBrowse/EntityCard/CodebaseLanding) consume
    // them and derive nothing further at render except interactive filter/group
    // (which operate on these already-resolved rows). Pure types -- no runtime, no
    // fs -- so a .vue component can `import type` from here freely (D15).
    import type { EntityValue, DefaultHistoryEntry, SourceRef } from './types'

    // Player-facing type word (D5/D18). Absent (undefined) when the entity carries
    // no raw_type (commands, macros, cmdline_params; and every non-ezquake/non-qwcl
    // type) -> the collapsed-row Type column is then dropped for that whole view.
    export type FriendlyType = 'toggle' | 'choice' | 'number' | 'text'

    // The two optional collapsed-row columns. Name + Description-preview always
    // render; 'type' and 'default' render only when at least one row in the view
    // populates them (graceful per-view column drop, D4/D11). Order is fixed:
    // Name | Type | Default | Description-preview (no zigzag).
    export type ColumnKey = 'type' | 'default'

    // One render-ready entity row. Every derivation is already done at build time
    // (D15): friendlyType (D18), categoryLabel/categoryMajor (D17), sourceUrl (D8),
    // anchor (D22), descriptionPreview (D4 first-sentence). Optional fields are
    // simply absent where the underlying L1 data is absent (D11).
    export interface BrowseRow {
      name: string
      anchor: string                      // D22: case-folded, stable deep-link fragment
      friendlyType?: FriendlyType         // D18: collapsed-row Type word (cvar only)
      rawType?: string                    // shown on expand (boolean/integer/float/string/enum)
      default?: string                    // collapsed-row Default column
      descriptionPreview?: string         // D4: first sentence, collapsed row
      descriptionFull?: string            // expanded card; also the filter haystack (D3)
      remarks?: string                    // expanded card (caveats/status)
      values?: EntityValue[]              // expanded card value-by-value list
      categoryLabel?: string              // D17: resolved (ezQuake id->name; others passthrough)
      categoryMajor?: string              // ezQuake cvar two-level taxonomy (shown in meta)
      sourceRef: SourceRef                // always present; text fallback when no URL
      sourceUrl?: string                  // D8: GitHub deep link when resolvable
      firstSeen: string                   // D8 version-walk
      lastSeen: string                    // D8 version-walk
      history?: DefaultHistoryEntry[]     // D8: default-value history (ezQuake cvar only)
      hasHistory: boolean                 // convenience: history present + non-empty
      macroType?: string                  // expanded card (ezQuake macro: "expands to")
      arguments?: string                  // expanded card (ezQuake cmdline_param)
      scope?: string                      // expanded card (info_key)
    }

    // Everything one browse page needs, attached to that page's route params
    // (Task 3). The component reads it via useData().params; it never loads data.
    export interface BrowseData {
      codebase: string
      type: string
      version: string                     // snapshot_version (e.g. "head", "1.16-dev")
      rows: BrowseRow[]
      activeColumns: ColumnKey[]          // which optional columns this view renders
      hasCategories: boolean              // gates the Flat/Grouped toggle (D3/D11)
    }

    // Per-codebase landing payload (Task 5), attached to /<codebase> route params.
    export interface CodebaseLandingData {
      codebase: string
      types: { type: string; count: number; version: string }[]
    }
    ```
- **Verification:** `pnpm --dir apps/docs-web exec tsc --noEmit` includes `lib/browse-types.ts` (the tsconfig `include` is `lib/**/*.ts`) and exits 0. YES/NO: the file type-checks.
- **Execution mode:** `inline` -- full content shipped above; this is the truly-locked cross-task contract (F12: locked content is inline, not subagent). No synthesis -- transcribe it verbatim.

### Task 2 -- pure data modules + unit tests

- **Goal:** Implement the framework-agnostic derivation layer (D15) as small, unit-coverable pure functions, each with a narrow interface. These are the friendly-type mapper (D18), the category resolver + grouper (D17), the free-text filter (D3), the version-walk reader (D8), the stable-anchor scheme (D22), and the source-link builder (D8). No Vue, no VitePress, no `fs` -- they port to infiniti's Solid platform untouched.
- **Files:** `apps/docs-web/lib/derive.ts` (+ `derive.test.ts`), `apps/docs-web/lib/category.ts` (+ `category.test.ts`), `apps/docs-web/lib/filter.ts`, `apps/docs-web/lib/version-walk.ts`, `apps/docs-web/lib/anchor.ts`, `apps/docs-web/lib/source-link.ts`, `apps/docs-web/package.json` (add vitest).
- **Steps:**
  - [ ] **`lib/derive.ts` -- `friendlyType(record: EntityRecord): FriendlyType | undefined`** (D18). Apply these rules IN ORDER (order is load-bearing -- a boolean carrying a false/true value list is still a toggle, not a choice):
    1. `raw_type` absent -> `undefined` (blank Type column).
    2. `raw_type === 'boolean'` -> `'toggle'`.
    3. `raw_type === 'enum'` -> `'choice'`.
    4. `values` is a non-empty array -> `'choice'` (non-boolean, non-enum carrying a discrete value list -- e.g. `teamplay`: integer + 3 listed values).
    5. `raw_type === 'integer'` or `'float'` -> `'number'`.
    6. `raw_type === 'string'` -> `'text'`.
    7. otherwise -> `undefined` (unknown raw_type degrades to blank).
  - [ ] **`lib/derive.test.ts`** -- cover the per-codebase reachability matrix (D18 amendment 2026-06-10):
    - ezQuake cvar (all four friendly types reachable): `{raw_type:'boolean'}` -> toggle; `{raw_type:'enum'}` -> choice; `{raw_type:'integer', values:[{name:'0'}]}` -> choice; `{raw_type:'integer'}` -> number; `{raw_type:'float'}` -> number; `{raw_type:'string'}` -> text.
    - ezQuake boolean WITH a value list stays toggle: `{raw_type:'boolean', values:[{name:'false'},{name:'true'}]}` -> toggle (rule order check).
    - QWCL cvar (NO enum, NO value-list -> `choice` UNREACHABLE): `{raw_type:'boolean'}` -> toggle; `{raw_type:'integer'}` -> number; `{raw_type:'float'}` -> number; `{raw_type:'string'}` -> text; assert no QWCL-shaped record (raw_type without `values`) ever yields `choice`.
    - No raw_type (commands/macros/cmdline_params; ktx/mvdsv/qtv/qwfwd): `{}` -> undefined.
  - [ ] **`lib/category.ts`** -- two pure functions:
    - `resolveCategory(record: EntityRecord, groups?: CategoryGroup[]): { label: string; major?: string } | undefined` (build-time, D17):
      1. `record.category` absent -> `undefined` (uncategorized).
      2. `groups` absent -> `{ label: record.category }` (non-ezQuake: `category` is already a human label, passthrough).
      3. find `g` in `groups` where `g.id === record.category`; not found -> `{ label: record.category }` (unresolved id -> show the raw value, graceful D11).
      4. found -> `{ label: g.name, major: g['major-group'] }` (ezQuake: resolved leaf name + optional two-level major-group). Note `g['major-group']` is the verbatim hyphenated JSON key.
      This handles BOTH ezQuake mechanics uniformly: cvar `category` = numeric-string id resolved against the 54-entry two-level groups; command `category` = slug resolved against the 14-entry FLAT groups (major-group simply absent). Augmentation C.
    - `groupByCategory(rows: BrowseRow[]): { category: string; rows: BrowseRow[] }[]` (render-time, D3): bucket rows by `row.categoryLabel`; rows with no `categoryLabel` collect into a single `"(uncategorized)"` bucket (F7). Return groups sorted by label with `"(uncategorized)"` LAST.
  - [ ] **`lib/category.test.ts`** -- ezQuake cvar id resolves against a fixture two-level groups array (`{id:'43', "major-group":'Network', name:'Downloads'}` -> `{label:'Downloads', major:'Network'}`); ezQuake command slug resolves against a flat fixture (`{id:'action', name:'Press/Release Actions'}` -> `{label:'Press/Release Actions', major: undefined}`); unresolved id (`'999'`) -> `{label:'999'}`; non-ezQuake (`{category:'userinfo'}`, no groups) -> `{label:'userinfo'}`; uncategorized (`{}`) -> undefined; `groupByCategory` puts a mix of labeled + unlabeled rows into buckets with `"(uncategorized)"` last.
  - [ ] **`lib/filter.ts` -- `filterEntries(rows: BrowseRow[], query: string): BrowseRow[]`** (D3): `q = query.trim().toLowerCase()`; empty `q` -> return `rows` unchanged; else return rows where `row.name.toLowerCase()` includes `q` OR `(row.descriptionFull ?? '').toLowerCase()` includes `q`. Case-insensitive at the data layer (operator convention: no case sensitivity outside passwords).
  - [ ] **`lib/version-walk.ts` -- `versionWalk(record: EntityRecord): { firstSeen: string; lastSeen: string; history?: DefaultHistoryEntry[]; hasHistory: boolean }`** (D8): pass through `first_seen`/`last_seen`/`default_history`; `hasHistory = Array.isArray(record.default_history) && record.default_history.length > 0`. The card renders the walk only when `hasHistory`, and a "Since `<firstSeen>`" line only when `firstSeen !== lastSeen`. Non-ezQuake records (firstSeen === lastSeen === the frozen snapshot version) render no version block -- graceful "current only" (D8/D11).
  - [ ] **`lib/anchor.ts` -- `entityAnchor(name: string): string`** (D22): return `name.toLowerCase()`. Deterministic, case-folded, stable across rebuilds. v1 entity names are URL-fragment-safe identifiers (alphanumerics + `_`, plus the `+`/`-` action prefixes on commands), and the fold is unique within a (codebase, type) because all v1 types are case-insensitive (`token_primitive`, the lone case-significant type, is not in v1). The full deep link is `/<codebase>/<type>#<entityAnchor(name)>`.
  - [ ] **`lib/source-link.ts` -- `sourceUrl(codebase: string, meta: SnapshotMeta, ref: SourceRef): string | undefined`** (D8). A per-codebase `{ repo, prefix }` config map; only ezQuake is populated + VERIFIED in 2b:
    ```ts
    const REPOS: Record<string, { repo: string; prefix: string }> = {
      ezquake: { repo: 'QW-Group/ezquake-source', prefix: 'src/' },
      // ktx/mvdsv/qtv/qwfwd/qwcl: Phase 4 (also handles F6 -- qtv/qwfwd
      // upstream_commit is a version string, not a SHA; their URL is tag-based).
    }
    ```
    If `REPOS[codebase]` is absent -> return `undefined` (the card shows `file:line` as plain text, no broken link, D11). Else return `https://github.com/${cfg.repo}/blob/${meta.upstream_commit}/${cfg.prefix}${ref.file}#L${ref.line}`. VERIFIED 2026-06-10: `QW-Group/ezquake-source` + `src/` prefix + the head commit `e4a2c20a...` all resolve 200 (deep link to the exact line); ezQuake source is a flat `src/` layout. If a future file proves to live in a `src/` subdir its link 404s and degrades to text (the spot-check in Verification catches it).
  - [ ] **`package.json`** -- add `"vitest": "^3.0.0"` to `devDependencies` and `"test": "vitest run"` to `scripts`. Run `pnpm --dir apps/docs-web install`, then `pnpm --dir apps/docs-web test` -- derive + category suites pass.
- **Verification:** `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0; `pnpm --dir apps/docs-web test` runs the derive + category suites with 0 failures (the D18 reachability matrix + the D17 resolution cases all green). YES/NO.
- **Execution mode:** `subagent (Sonnet medium)` -- six small pure modules + two test files; the mappings are fully specified above (genuine synthesis is the clean TS + the test files + edge handling, not the spec). Per the drafter-prompt execution guidance ("each pure data module ... Sonnet medium") and F12 (synthesis is subagent, not inline). The test matrix PINS the load-bearing ordering (boolean-before-values; QWCL-choice-unreachable) so a subtle ordering error fails the suite mechanically.

### Task 3 -- build-time browse shaper + dynamic-route params wiring

- **Goal:** Produce each page's render-ready data at BUILD time (D15) and attach it to that page's route params, so the components load nothing and derive nothing. This is the data-flow spine: `paths()` enumerates the pages and, per page, calls the shaper, which calls the Task-2 pure modules. Per-page params attachment (the VitePress CMS pattern) keeps each page paying only its own weight (the ezquake-cvar page is 1.17MB on its own; a global loader would bundle ~2MB into every page).
- **Files:** `apps/docs-web/lib/browse.ts`, `apps/docs-web/[codebase]/[type].paths.ts`, `apps/docs-web/[codebase].paths.ts`.
- **Steps:**
  - [ ] **`lib/browse.ts` -- `shapeBrowse(codebase: string, type: string): BrowseData`.** This is the ONLY new lib module that imports `snapshot.ts` (it is build-time, runs in Node). Logic:
    - `const snap = loadSnapshot(codebase, type)`.
    - Map each `e` in `snap.entries` to a `BrowseRow`:
      - `name: e.name`; `anchor: entityAnchor(e.name)` (D22).
      - `friendlyType: friendlyType(e)` (D18); `rawType: e.raw_type`; `default: e.default`.
      - `descriptionFull: e.description`; `descriptionPreview: e.description ? firstSentence(e.description) : undefined` (D4).
      - `remarks: e.remarks`; `values: e.values`.
      - category: `const c = resolveCategory(e, snap.groups)` -> `categoryLabel: c?.label`, `categoryMajor: c?.major` (D17).
      - `sourceRef: e.source_ref`; `sourceUrl: sourceUrl(codebase, snap._meta, e.source_ref)` (D8).
      - version-walk: `const v = versionWalk(e)` -> `firstSeen, lastSeen, history, hasHistory` (D8).
      - `macroType: e.macro_type`; `arguments: e.arguments`; `scope: e.scope`.
    - `activeColumns`: start `[]`; if any row has a `friendlyType`, push `'type'`; if any row has a non-undefined `default`, push `'default'` (keep the fixed order: type before default).
    - `hasCategories`: true if any row has a `categoryLabel`.
    - Return `{ codebase, type, version: snap._meta.snapshot_version, rows, activeColumns, hasCategories }`.
    - Local helper `firstSentence(s: string): string`: return `s` up to and including the first `". "` (period + space) OR the first newline, whichever comes first; if neither is found, return `s`. (Most ezQuake descriptions are already <= 80 chars, spec section 6, so this is a no-op for the majority.)
  - [ ] **`lib/browse.ts` -- `shapeCodebaseLanding(codebase: string): CodebaseLandingData`.** From `listSnapshots()`, take the pairs whose `codebase` matches; for each, `loadSnapshot` and record `{ type, count: snap.entries.length, version: snap._meta.snapshot_version }`; sort by `type`; return `{ codebase, types }`.
  - [ ] **Modify `apps/docs-web/[codebase]/[type].paths.ts`** to attach the shaped browse data to each pair's params (keep it a thin VitePress shim; the shaping lives in `lib/browse.ts`):
    ```ts
    import { listSnapshots } from '../lib/snapshot'
    import { shapeBrowse } from '../lib/browse'

    // One page per (codebase, type) pair on disk. Each page carries its OWN
    // render-ready slice in params (the VitePress dynamic-route data mechanism):
    // shapeBrowse pre-resolves friendly types, categories, source links, version
    // walks and anchors at build time, so the browse component derives nothing.
    // The clean /<codebase>/<type> route is the D22 anchor host (#<case-folded-name>).
    export default {
      paths() {
        return listSnapshots().map(({ codebase, type }) => ({
          params: { codebase, type, browse: shapeBrowse(codebase, type) }
        }))
      }
    }
    ```
  - [ ] **Modify `apps/docs-web/[codebase].paths.ts`** to attach the landing data:
    ```ts
    import { listSnapshots } from './lib/snapshot'
    import { shapeCodebaseLanding } from './lib/browse'

    // One page per distinct codebase; each carries its per-type summary in params
    // (a 7th codebase like FTE later is a Phase-1 emit, no change here; D2/D14).
    export default {
      paths() {
        const codebases = [...new Set(listSnapshots().map((s) => s.codebase))]
        return codebases.sort().map((codebase) => ({
          params: { codebase, landing: shapeCodebaseLanding(codebase) }
        }))
      }
    }
    ```
  - [ ] Run `pnpm --dir apps/docs-web run docs:build`; confirm it exits 0 (the shaper runs for all 20 pages at build with no error) and that the generated `/ezquake/cvar` page data carries a non-empty `browse.rows`.
- **Verification:** `pnpm --dir apps/docs-web run docs:build` exits 0. A node smoke check imports `shapeBrowse('ezquake','cvar')` and asserts `rows.length === 2743`, `activeColumns` deep-equals `['type','default']`, `hasCategories === true`; and `shapeBrowse('ezquake','command').activeColumns` deep-equals `[]` (command has no type/default) with `hasCategories === true`. YES/NO.
- **Execution mode:** `subagent (Sonnet medium)` -- one orchestrator module that wires the Task-2 pure functions + two small paths-loader edits; clear spec, build-time code that must compile and run. The two `.paths.ts` bodies are shipped near-final above (they are the VitePress glue contract); the shaper logic is the subagent's synthesis from the rules above.

### Task 4 -- the generic browse + card components (the D14/D15 heart)

- **Goal:** Build the two type-generic, codebase-generic Vue components that render any `BrowseData` (Task 1) -- the win-or-lose work of this arc. NO per-codebase or per-type branching anywhere in either component (D14): they render whatever `activeColumns`/`rows`/`hasCategories` say. NO data-fetch and NO `.filter()`/`.map()`/`.reduce()`/`fetch`/`readFileSync` derivation inside the `<script>` (D15) -- the only computation is calling the named Task-2 lib functions (`filterEntries`, `groupByCategory`) from `computed`s; everything else is already shaped. Comments describe the decoupling in prose WITHOUT writing the literal call syntax (F11 -- the boundary grep matches comment tokens).
- **Files:** `apps/docs-web/.vitepress/theme/components/EntityBrowse.vue`, `apps/docs-web/.vitepress/theme/components/EntityCard.vue`, `apps/docs-web/.vitepress/theme/index.ts`, `apps/docs-web/[codebase]/[type].md`.
- **Steps:**
  - [ ] **`EntityBrowse.vue`** -- the browse view (hero). The `<script setup>` data flow is the D15 contract; build it to exactly this shape (interactive filter/group call lib functions, never inline array methods):
    ```vue
    <script setup lang="ts">
    import { ref, computed } from 'vue'
    import { useData } from 'vitepress'
    import { filterEntries } from '../../lib/filter'
    import { groupByCategory } from '../../lib/category'
    import EntityCard from './EntityCard.vue'
    import type { BrowseData } from '../../lib/browse-types'

    // The route's render-ready slice, shaped at build time (Task 3) and read here
    // off the params ref -- this component loads nothing and derives nothing beyond
    // the interactive narrowing/grouping below, both of which delegate to lib/.
    const { params } = useData()
    const browse = computed(() => params.value.browse as BrowseData)

    const query = ref('')      // free-text filter (D3)
    const grouped = ref(false) // Flat (false) vs Grouped-by-category (true), D3

    const visible = computed(() => filterEntries(browse.value.rows, query.value))
    const sections = computed(() =>
      grouped.value
        ? groupByCategory(visible.value)
        : [{ category: null as string | null, rows: visible.value }]
    )
    </script>
    ```
    Template requirements (daisyUI tokens from the verified `include:` list only):
    - A page heading `{{ browse.codebase }} / {{ browse.type }}` and a small count line (`{{ visible.length }} of {{ browse.rows.length }}`), plus the snapshot `version`.
    - A free-text filter `<input class="input ...">` bound to `query` (placeholder e.g. "Filter cl_...").
    - The Flat/Grouped control -- render it ONLY when `browse.hasCategories` (D11: no toggle where category is meaningless, e.g. macros). Use a daisyUI `toggle` (or a `join` of two `btn`s, or `swap` -- all in the include list) bound to `grouped`.
    - A sticky column-header row reflecting `browse.activeColumns`: always `Name`, then `Type` iff `activeColumns` includes `'type'`, then `Default` iff it includes `'default'`, then `Description`. The header MUST use the same shared grid template as the rows so columns align (no zigzag, D4).
    - `v-for` over `sections`; when `section.category` is non-null, render a group header (daisyUI `divider` with the label + row count); then `v-for` over `section.rows` rendering `<EntityCard :row="row" :columns="browse.activeColumns" />`.
    - Empty state: when `visible.length === 0`, a short "no matches" line.
    - Column alignment: define the grid template ONCE from `activeColumns` (e.g. a CSS custom property `--cols` set on the list container, each row a `grid` using `grid-template-columns: var(--cols)`), so every row across the whole view aligns. The expanded card panel (in EntityCard) spans the full width below its row.
  - [ ] **`EntityCard.vue`** -- the collapsed row + inline-expand card. Props: `row: BrowseRow`, `columns: ColumnKey[]`. Local UI state `const expanded = ref(false)` toggled on row click (UI state is allowed under D15 -- it is not data-fetch or derivation). Requirements:
    - **Collapsed row** (one line, the shared grid template): `Name` (monospace; it is the deep-link target -- set the row element `:id="row.anchor"` so `/<codebase>/<type>#<name>` scrolls to it, D22); `Type` cell iff `columns` includes `'type'` -> `row.friendlyType` as a daisyUI `badge` (omit/blank when the row has none, D11); `Default` cell iff `columns` includes `'default'` -> `row.default` (blank when absent); `Description` -> `row.descriptionPreview` (blank when absent), truncated to one line. A subtle affordance (chevron / `collapse`-arrow) signals expandability.
    - **Inline expansion** (in place, NOT a modal, NOT a new page, D4): on click, reveal a full-width panel directly below the row (`v-if="expanded"`), containing, each rendered ONLY when present (D11):
      - Full description (`row.descriptionFull`) -- preserve line breaks (CSS `white-space: pre-line`); render as plain text in v1 (the cvar->cvar auto-link is Phase 4 -- leave it plain).
      - **Remarks** (`row.remarks`) -- a labeled block (caveats/status), line breaks preserved.
      - **Values** (`row.values`) -- a value-by-value list: each `{name, description}` as a row (name emphasized, description beside/under it; line breaks preserved).
      - **Meta strip** -- a small labeled cluster:
        - Category: `row.categoryLabel`, with `row.categoryMajor` shown as a parenthetical when present (e.g. "Downloads (Network)").
        - Raw type: `row.rawType` (D5: the dev type appears only on expand).
        - Macro expands-to: `row.macroType` (ezQuake macro); Arguments: `row.arguments` (ezQuake cmdline_param); Scope: `row.scope` (info_key) -- each when present.
        - Source: if `row.sourceUrl`, an external link labeled `row.sourceRef.file`:`row.sourceRef.line`; else the same text with no link (D8/D11).
        - Version: when `row.hasHistory`, render the walk (e.g. "v3.0 -> 5, then 3.6.3 -> 30" from `row.history`); plus a "Since `row.firstSeen`" line when `row.firstSeen !== row.lastSeen` (D8). Render nothing here for "current only" rows.
        - **"Used in" slot** -- a dormant placeholder that renders NOTHING in v1; Phase 4 wires the entity->guide reverse-index into it (D7/D19). Leave the slot, no "coming soon" text (no dead links).
  - [ ] **Modify `.vitepress/theme/index.ts`** -- register `EntityBrowse` globally (additive; `CodebaseGrid` stays; `EntityCard` is a normal import inside `EntityBrowse`, not a global).
  - [ ] **Replace `apps/docs-web/[codebase]/[type].md`** body (this becomes the FINAL form -- Phase 3 reuses it verbatim for all codebases):
    ```md
    <EntityBrowse />
    ```
    (No `<h1>` in the markdown -- the heading is rendered inside `EntityBrowse` from params so it reflects the route. Keep the file otherwise empty of prose -- D1: docs authors no narrative.)
  - [ ] Run `pnpm --dir apps/docs-web run docs:dev` and walk the runnable-state checks (Verification below). Then `grep` the two new components for the D15 trigger tokens and for daisyUI class usage vs the include list (Verification probes 5-6).
- **Verification:** (a) `/ezquake/cvar` renders a filterable list with aligned `Name | Type | Default | Description` columns; typing `cl_` narrows it; the Flat/Grouped toggle regroups by category. (b) A cvar row expands in place to description + (where present) remarks + values + meta strip; the source link opens the correct GitHub line; `cl_chunksperframe` shows the version walk (v3.0 -> 5, 3.6.3 -> 30). (c) `/ezquake/command` renders with `Name | Description` only (no Type/Default columns -- `activeColumns` empty) and a Grouped view containing a first-class "(uncategorized)" bucket (F7). (d) `/ezquake/macro` and `/ezquake/cmdline_param` render (macro_type / arguments appear in the expanded meta, not as columns). (e) `/ezquake/cvar#cl_chunksperframe` scrolls to that row (D22 anchor). (f) `pnpm --dir apps/docs-web run docs:build` exits 0. YES/NO on each.
- **Execution mode:** `subagent (Opus medium)` -- the type-generic/codebase-generic renderer is the architectural heart (D14/D15); it is genuine multi-file synthesis against a fixed contract, with the column-alignment + inline-expand + decoupling constraints needing judgment. Per the drafter-prompt execution guidance ("the generic renderer ... Opus medium") and F12 (do NOT blanket-inline -- the isolated context is the point). The contract (Task 1) and the data shape (Task 3) are fixed, so the subagent's job is well-bounded: build to the contract, D15-clean, daisyUI-styled, columns aligned, expand in place.

### Task 5 -- ezQuake per-codebase landing + include-list reconciliation

- **Goal:** Fill the per-codebase landing (the IA entry point to the browse views, spec section 5) with a generic, codebase-agnostic component, proven on ezQuake; and reconcile the daisyUI `include:` list against what Tasks 4-5 actually use (F10).
- **Files:** `apps/docs-web/.vitepress/theme/components/CodebaseLanding.vue`, `apps/docs-web/[codebase].md`, `apps/docs-web/.vitepress/theme/index.ts`, `apps/docs-web/.vitepress/theme/style.css` (only if the probe finds a gap).
- **Steps:**
  - [ ] **`CodebaseLanding.vue`** -- dumb, codebase-generic. Read `const { params } = useData()`; `const landing = computed(() => params.value.landing as CodebaseLandingData)`. Render a heading (`landing.codebase`) and, for each `landing.types`, a daisyUI `card` or `badge` linking to `/<codebase>/<type>` with its `count` and `version` (mirror `CodebaseGrid.vue`'s style, scoped to one codebase). No derivation in `<script>` (the data is shaped in Task 3's `shapeCodebaseLanding`); comments avoid the F11 trigger tokens.
  - [ ] **Modify `.vitepress/theme/index.ts`** -- register `CodebaseLanding` globally (additive).
  - [ ] **Replace `apps/docs-web/[codebase].md`** body with `<CodebaseLanding />` (final form; Phase 3 reuses verbatim).
  - [ ] **Include-vs-usage reconciliation (F10):** extract every daisyUI component class used across the three new `.vue` files (`EntityBrowse`, `EntityCard`, `CodebaseLanding`) -- the leading token of classes like `badge`, `input`, `toggle`, `collapse`, `divider`, `card`, `btn`/`button`, `join`, `swap`, `tab`, `menu` -- and confirm each is in the `include:` list in `style.css`. Add any missing component to the list (expected: none -- the 2a list already covers the 2b set). Re-run `docs:build` after any edit.
  - [ ] Run `pnpm --dir apps/docs-web run docs:dev`; confirm `/ezquake` lists the four ezQuake types with live counts, each linking to its browse view.
- **Verification:** `/ezquake` renders the four ezQuake types (cvar 2743, command 624, macro 66, cmdline_param 65) as links to `/ezquake/<type>`. The include-vs-usage probe reports every used daisyUI component present in the `include:` list (0 missing). YES/NO.
- **Execution mode:** `subagent (Sonnet medium)` -- one small dumb component + two stub-body replacements + a mechanical include-list reconciliation; clear spec, but it is Vue/VitePress code that must render and stay D15-clean. Per the drafter-prompt execution guidance ("wiring ezQuake's per-type config / landing page: Sonnet medium or inline"); Sonnet medium because it is real (if small) SFC synthesis, not locked transcription.

## Verification (phase boundary)

Copy-paste checks the operator (or orchestrator) runs at phase end. PASS on all -> proceed to Phase 3. Any FAIL -> consult Recovery.

1. **Lib type-check + unit tests.** `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0 AND `pnpm --dir apps/docs-web test` passes (derive + category suites). PASS: both green, including the D18 reachability matrix (QWCL never yields `choice`; boolean-with-values stays toggle) and the D17 resolution cases. FAIL: any tsc error or test failure.
2. **Build.** `pnpm --dir apps/docs-web run docs:build` exits 0 and regenerates the 20 (codebase, type) pages + 6 codebase pages (now real views, not stubs). PASS: exit 0. FAIL: build error (-> Recovery: paths/shaper).
3. **ezQuake browse end-to-end (dev server).** On `/ezquake/cvar`: the list renders with aligned `Name | Type | Default | Description` columns (no zigzag); typing `cl_` narrows the count; the Flat/Grouped toggle regroups by category. A row expands IN PLACE to full description + remarks + values + meta strip. PASS: all true. FAIL: any (-> Recovery).
4. **Enhancements (D8) on ezQuake.** Spot-check 3 ezQuake source links across different files -> each opens the correct line on `github.com/QW-Group/ezquake-source` (HTTP 200). `cl_chunksperframe`'s card shows the version walk (v3.0 -> 5, then 3.6.3 -> 30). PASS: links 200 + walk renders. FAIL: 404 link (-> Recovery: source-link, text fallback) or missing walk.
5. **Stable anchors (D22).** Navigating to `/ezquake/cvar#cl_chunksperframe` scrolls to that row; the anchor is `lower(name)` and stable across a rebuild. PASS: deep link resolves. FAIL: no scroll / non-deterministic id.
6. **Graceful degradation (D11) across ezQuake types.** `/ezquake/command` renders `Name | Description` only (Type/Default columns absent) with a "(uncategorized)" bucket in Grouped (F7); `/ezquake/macro` and `/ezquake/cmdline_param` render with no Type/Default columns and surface `macro_type`/`arguments` in the expanded meta. PASS: each renders cleanly with absent fields simply omitted. FAIL: an error or an empty/blank column header where the field is universally absent.
7. **D15 decoupling holds (F11-aware).** `grep -rnE "fetch\(|readFileSync|readdirSync|\.filter\(|\.map\(|\.reduce\(" apps/docs-web/.vitepress/theme/components/EntityBrowse.vue apps/docs-web/.vitepress/theme/components/EntityCard.vue apps/docs-web/.vitepress/theme/components/CodebaseLanding.vue` prints NOTHING -- no data-fetch or array-derivation literal inside any component, including in comments. PASS: grep empty. FAIL: any match (move logic into `lib/`, or reword a comment per F11).
8. **D14 type/codebase-generic.** Neither `EntityBrowse.vue` nor `EntityCard.vue` contains a literal `'ezquake'` / `'cvar'` / per-type / per-codebase `if`/branch. `grep -nE "ezquake|'cvar'|'command'|'macro'" apps/docs-web/.vitepress/theme/components/Entity*.vue` prints nothing. PASS: empty. FAIL: any per-codebase/per-type branch baked into a component.
9. **daisyUI include-vs-usage (F10).** Every daisyUI component class used in the three new components is present in the `include:` list in `style.css`. PASS: 0 missing. FAIL: a used component absent from the list (un-styled render).
10. **D20 isolation.** `git status --short` shows changes ONLY under `apps/docs-web/`; nothing under `apps/qw-oracle/`, `apps/slipgate-app/`, or the monorepo-root `package.json`. `apps/docs-web/data/*.json` is byte-unchanged (2b reads, never writes, the Phase-1 output). PASS: diff confined to `apps/docs-web/`, data files untouched. FAIL: any file outside the subtree changed.

## Outputs to next phase

What is now true that was not before (mirrors Phase 3's "Inputs"):

- A type-generic, codebase-generic renderer exists and is PROVEN on ezQuake's four types: `EntityBrowse.vue` (filter + Flat/Grouped + aligned-column list) and `EntityCard.vue` (collapsed row + inline-expand card with description/remarks/values/meta), both dumb (D15) and free of per-codebase/per-type branching (D14). Phase 3 feeds the other 5 codebases through these SAME components as **data + config only** -- if Phase 3 needs new component code, that is a 2b design failure (escalate, do not paper over -- D14 implication).
- The plain-TS derivation layer (D15), each module unit-coverable in isolation and ported-untouched-to-Solid-ready: `lib/derive.ts` (D18 friendly type), `lib/category.ts` (D17 resolve + group), `lib/filter.ts` (D3), `lib/version-walk.ts` (D8), `lib/anchor.ts` (D22), `lib/source-link.ts` (D8), and `lib/browse.ts` (the build-time shaper). The render contract is locked in `lib/browse-types.ts`.
- The per-page data mechanism: `[codebase]/[type].paths.ts` and `[codebase].paths.ts` attach each page's render-ready slice to its route params; the components read `useData().params`. Phase 3's other-5-codebases pages are generated by the SAME loaders with zero change.
- Stable per-entity anchors (D22): every row carries `#<case-folded-name>` off the clean `/<codebase>/<type>` route -- the v1 design constraint the later guides-portal surface needs (Phase 3 inherits the scheme codebase-generically; the guide->entity LINKS are a later surface, not v1).
- ezQuake source links resolve (D8) via `QW-Group/ezquake-source` + `src/` + the head commit; the source-link module's per-codebase config is the seam Phase 4 extends to the other 5 codebases (+ F6: qtv/qwfwd tag-based URLs).
- What 2b deliberately did NOT build (Phase 4): cvar->cvar auto-linking inside descriptions (descriptions render plain in 2b); the entity->guide "Used in" reverse-index (the dormant slot is present, rendering nothing); source links for the non-ezQuake codebases.

## Open questions / deferred items

- **Question:** First test runner in `apps/docs-web` (vitest) -- the scaffold had none.
  **Default chosen for now:** add `vitest` as a devDep + a `test` script (Task 2), scoped to the pure `lib/` modules. Justified: the drafter prompt (augmentation D) and D18 explicitly call the friendly-type derivation "unit-coverable" and ask the derive module's tests to cover the per-codebase reachability matrix -- this is an explicit ask, not speculative test infrastructure. Only `derive` + `category` get suites (the two with non-obvious logic); the trivial modules (anchor, filter, version-walk, source-link) are covered by the build + the dev-server checks.
  **Who can resolve:** operator (veto vitest if you would rather pin the derivation with the dev-server checks alone; the mapping is also pinned by the build).
- **Question:** The ezquake-cvar page ships ~1.17MB of render data in its route params (the 2743-row slice, full descriptions/values/history). With SSG that is roughly duplicated (rendered HTML + hydration JSON) on that one page.
  **Default chosen for now:** accept it for v1. It is the heaviest page by far (command 216KB, others smaller), loaded only on navigation to `/ezquake/cvar`, and the operator chose client-side filtering over server-side/faceted search (D9, spec section 8). Per-page params is strictly lighter than the global-loader alternative (which would bundle ~2MB into every page). A later optimization (paginate or lazy-load the cvar slice) is possible without touching the contract.
  **Who can resolve:** operator / Phase 5 (a deploy-time optimization if the cvar page feels heavy in production; not v1 scope).
- **Question:** ezQuake cvar categories are a two-level taxonomy (major-group -> name, 54 leaf groups); the Grouped view groups by the leaf `name` only.
  **Default chosen for now:** group by the resolved leaf label (uniform with the other 5 codebases' flat labels -- keeps the component codebase-generic, D14); surface `major-group` in the expanded card's meta (e.g. "Downloads (Network)"), not as a grouping hierarchy. A two-level grouped view would be ezQuake-cvar-special component logic (D14 violation) -- deferred as a later refinement if desired.
  **Who can resolve:** operator (cosmetic; the data supports a richer hierarchy later without re-extraction).
- **Question:** Macro `Type` column. Macros carry `macro_type` (the expansion type, e.g. "integer"), not a cvar `raw_type`, so `friendlyType` returns undefined and the macro view has no Type column.
  **Default chosen for now:** show `macro_type` in the expanded card meta ("expands to: integer"), NOT in the collapsed Type column. The Type column is the D5/D18 friendly word derived from `raw_type`; macros have none, so the column drops (graceful). This keeps the friendly-type module purely cvar-shaped and the component generic.
  **Who can resolve:** operator / Phase 3 (if a macro Type column is wanted, it is a config addition -- map `macro_type` to the Type column for the macro view -- not new component code).
- **Question:** Source links for the non-ezQuake codebases (and F6: qtv/qwfwd `upstream_commit` is a version string, not a SHA).
  **Default chosen for now:** out of 2b scope. 2b ships the source-link MODULE + the verified ezQuake config (the deliverable "source links resolve" is met on the hero codebase); the per-codebase config map is the seam Phase 4 fills (README assigns "source links wired everywhere" to Phase 4). Non-ezQuake rows return `undefined` -> the card shows `file:line` as plain text (D11), never a broken link.
  **Who can resolve:** Phase 4.

No sub-agent verification finding contradicted `decisions.md` at drafting time. (If the Explore pass surfaces one, it is recorded here with a one-line rationale and the decision wins.)

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only:

- **`docs:build` errors inside a `.paths.ts` / shaper:** `shapeBrowse` threw for some (codebase, type) -- most likely a field assumed present that is absent for a non-ezQuake type (e.g. reading `.length` on an absent `values`). The shaper must treat every optional field as possibly-absent (D11). Guard the access; re-run. If the error is "cannot find data dir," confirm `lib/browse.ts` imports `loadSnapshot` from `lib/snapshot.ts` (whose `DATA_DIR` resolves via `import.meta.url`).
- **Component renders blank / `params.value.browse` undefined:** the page is being viewed on a route whose `.paths.ts` did not attach `browse` (or `useData().params` was read without `.value`). Confirm the params-attach in `[codebase]/[type].paths.ts` and that the component reads `params.value.browse`, not `params.browse`.
- **Columns zigzag (not aligned):** each row is computing its own grid template instead of sharing one. Define the grid template ONCE (from `activeColumns`) on the list container and have every row inherit it (e.g. via a CSS custom property), so all rows -- and the header -- share one column track set (D4).
- **D15 grep fails on a comment, not code (F11):** a component comment contains a literal trigger token (`.filter(`, `.map(`, `fetch(`, ...). Reword the comment to convey the decoupling without the call syntax; the component LOGIC is already clean. (Durable fix, deferred: strip comment lines before the gate greps.)
- **daisyUI class has no effect (un-styled element):** the component used a daisyUI component not in the `include:` list (F10). Add it to the `include:` list in `style.css` and rebuild (daisyUI v5 emits CSS only for included components).
- **ezQuake source link 404s:** the file lives in a `src/` subdirectory, not flat `src/` (the verified assumption holds for the spot-checked files). Either extend the prefix logic, or let it degrade to the plain-text `file:line` fallback (D11) -- do NOT ship a broken link. Full per-file path resolution is a Phase-4 hardening.
- **A friendly-type / category test fails:** the mapping order is off (boolean must be checked before the value-list branch; enum before the value-list branch) or the category id match is wrong (match `g.id === record.category` as strings; ezQuake cvar ids are numeric STRINGS like "43"). Re-read D18 / D17; the test matrix is the spec.

Unanticipated failures route to the operator.
