# Phase 3 -- 5-codebase fan-out (verify generic-renderer degradation + display polish)

> **Orchestrator note (2026-06-10):** this MD was authored by the arc-orchestrator
> from COLD boundary-verification of the shipped 2b build -- NOT a fresh drafter
> re-recon. The operator chose "verify + light polish" over a full standard
> drafter cycle after the orchestrator's cold verification showed the fan-out
> wiring is already structurally shipped by 2b's codebase-generic loaders (the
> D14 payoff -- see F13). Phase 3 therefore = VERIFY graceful degradation across
> the 5 non-ezQuake codebases (the deliverable) + a thin display-name / ASCII
> polish pass (the two items the verification surfaced). If any verification
> defect needs NEW component code to fix, that is a 2b D14 design gap -- escalate,
> do NOT fork a component.

## Goal

Confirm the other 5 codebases (KTX / MVDSV / QTV / QWFWD / QWCL) browse correctly
through the SAME 2b components (D14) and apply the two display-polish items the
verification surfaced. The components are codebase-generic and the route loaders
are `listSnapshots()`-driven, so all 6 codebases already GENERATE (the build emits
all 28 routes today); this phase VERIFIES that each non-ezQuake codebase degrades
gracefully -- present fields rendered, absent fields omitted cleanly (D11) -- rather
than building wiring. It then resolves the one consistency gap the verification
found (page headings show the raw slug `ezquake` while the nav shows `ezQuake`) by
adding a build-time codebase-label seam, and swaps the lone `&mdash;` HTML entity to
ASCII (output discipline). **Runnable state at phase boundary:** all 6 codebases are
browse-able with graceful degradation confirmed (orchestrator cold static checks +
operator live click-through); page headings and the root grid read the friendly
codebase names consistent with the nav; no `&mdash;` in the render; and the D14/D15
grep gates stay green with all 6 codebases wired (zero new component code).

## Inputs from previous phase

- **Phase 2b shipped (`a160688a`..`f2f167b7`):** the type-generic / codebase-generic
  renderer (`EntityBrowse.vue` / `EntityCard.vue` / `CodebaseLanding.vue`), the
  plain-TS `lib/` derivation layer (`derive` / `category` / `filter` / `version-walk`
  / `anchor` / `source-link` / `browse`), the render contract (`browse-types.ts`),
  and the per-page `paths()` params mechanism -- proven on ezQuake. Orchestrator
  re-verified cold 2026-06-10: `docs:build` exit 0, `test` 23/23, D14 grep gate #8
  empty, D15 grep gate #7 empty, all five 2b commits present.
- **All 20 (codebase, type) data files present** in `apps/docs-web/data/` (Phase 1).
  The route loaders (`[codebase]/[type].paths.ts`, `[codebase].paths.ts`,
  `codebases.data.ts`) enumerate every codebase from `listSnapshots()`, so the build
  already generates all 28 routes (20 type pages + 6 landings + index + 404).
- **Degradation matrix (orchestrator-verified against the live data + render, 2026-06-10):**

  | Codebase | Types (count) | raw_type -> Type col | values -> choice | default -> Default col | category -> Flat/Grouped | default_history -> version-walk | scope (info_key) | source link |
  |---|---|---|---|---|---|---|---|---|
  | ezquake | cvar, command, macro, cmdline_param | cvar (all) | cvar (624) | cvar (all) | cvar all / command 495 of 624 (F7) | cvar (35) | -- | URL (verified) |
  | ktx | command, cvar, info_key | none | none | cvar (106 of 275) | cvar + command (all) | none | info_key (56) | plain text |
  | mvdsv | cvar, command, info_key, cmdline_param | none | none | cvar (all) | cvar + command (all) | none | info_key (45) | plain text |
  | qtv | cvar, command | none | none | cvar (all) | cvar + command (all) | none | -- | plain text |
  | qwcl | cvar, command, cmdline_param | cvar (all 187) | none (0 values) | cvar (all) | cvar + command (all) | none | -- | plain text |
  | qwfwd | cvar, command, info_key, cmdline_param | none | none | cvar (all) | cvar + command (all) | none | info_key (6) | plain text |

  Reads: the Type column surfaces ONLY for ezquake + qwcl cvar (the two `raw_type`
  codebases); `choice` is unreachable for QWCL (it carries `raw_type` but zero
  `values` -- D18 amendment); `scope` is the one field ezQuake lacks and the 2b card
  already renders it; version-walk + source-link URLs are ezQuake-only in v1.

## Files touched

Everything under `apps/docs-web/` (D20). Nothing in `build-snapshot.ts`, slipgate,
the root `package.json`, or `data/*.json` (read-only -- Phase 1 output).

### Created
```
apps/docs-web/lib/codebase-label.ts   # codebaseLabel(slug) -> friendly display name; pure lookup with slug fallback (a 7th codebase like FTE degrades to its slug -- D2/D14)
```

### Modified
```
apps/docs-web/lib/browse-types.ts                              # add displayName:string to BrowseData + CodebaseLandingData (render contract)
apps/docs-web/lib/browse.ts                                    # shapeBrowse + shapeCodebaseLanding attach displayName via codebaseLabel
apps/docs-web/.vitepress/theme/codebases.data.ts               # CodebaseSummary gains displayName; the loader attaches it
apps/docs-web/.vitepress/theme/components/EntityBrowse.vue     # page heading reads browse.displayName (was browse.codebase)
apps/docs-web/.vitepress/theme/components/CodebaseLanding.vue  # heading reads landing.displayName
apps/docs-web/.vitepress/theme/components/CodebaseGrid.vue     # card title reads cb.displayName (href stays the slug)
apps/docs-web/.vitepress/theme/components/EntityCard.vue       # swap the values-separator &mdash; (line ~74) to ASCII "-"
```

### Deleted
```
n/a
```

## Tasks

### Task 1 -- Verify graceful degradation across the 5 non-ezQuake codebases (the gate)

- **Goal:** Confirm each non-ezQuake codebase renders through the 2b components with
  present fields shown and absent fields omitted cleanly (D14 / D11). No code -- this
  is the verification gate, and it is the phase's primary deliverable.
- **Files:** none (verification only).
- **Steps** (cold static checks the orchestrator ran 2026-06-10, recorded as evidence;
  the live click-through is the operator floor-check that needs a browser):
  - [x] `docs:build` generates all 28 routes (20 type pages + 6 landings + index + 404).
  - [x] Type column appears ONLY on `ezquake/cvar` + `qwcl/cvar` (the `raw_type`
        codebases); drops cleanly on the other 15 pages.
  - [x] Default column appears on every cvar page; drops on commands / info_keys /
        cmdline_params.
  - [x] Flat/Grouped toggle appears on every cvar + command page (categories resolve
        via `category_inferred` passthrough -- `resolveCategory` with no `groups`);
        hidden on macro / info_key / cmdline_param (`hasCategories` false).
  - [x] info_key `scope` render path present: `EntityCard` has `v-if="row.scope"`,
        `shapeBrowse` maps `scope: e.scope`, and the data carries it on all
        ktx/mvdsv/qwfwd info_keys.
  - [x] version-walk ezQuake-only; non-ezQuake source links degrade to plain
        `file:line`; `choice` unreachable for QWCL (no `values`).
  - [ ] **OPERATOR live click-through (floor-check -- run on the POLISHED build after
        Tasks 2-3):** `pnpm --dir apps/docs-web run docs:dev`; on a non-ezQuake page
        (e.g. `/ktx/cvar`): the filter narrows the count; the Group-by-category toggle
        regroups by the `category_inferred` labels; clicking a ktx/mvdsv/qwfwd
        `info_key` row expands to show **Scope**. On `/qwcl/cvar` the Type badge shows
        toggle/number/text and NEVER `choice`. No console errors on any of the 6.
- **Verification:** phase-boundary checks 1-2. PASS: all static checks green (done) +
  operator live click-through clean. FAIL: any page errors or a column/field renders
  wrong. **If a fix needs component code, that is a D14 escalation** (record CRITICAL,
  recommend a 2b amendment in `decisions.md`; do NOT fork or branch a component).
- **Execution mode:** `inline` -- orchestrator-run cold checks (recorded) + operator-run
  live floor-check. No subagent: this is verification, not synthesis.

### Task 2 -- Codebase display names (page headings match the nav)

- **Goal:** Page headings and the root grid render the friendly codebase name
  (ezQuake / KTX / MVDSV / QTV / QWCL / QWFWD), consistent with the `config.ts` nav,
  resolved at BUILD time and passed via the render contract. D15: no label lookup in a
  component -- the label is shaped like every other field (friendlyType, categoryLabel).
  D14: a lookup-with-fallback is generic, not a per-codebase branch.
- **Files:** `lib/codebase-label.ts` (new), `lib/browse-types.ts`, `lib/browse.ts`,
  `.vitepress/theme/codebases.data.ts`, `EntityBrowse.vue`, `CodebaseLanding.vue`,
  `CodebaseGrid.vue`.
- **Steps** (full content -- transcribe; no synthesis):
  - [ ] **Create `apps/docs-web/lib/codebase-label.ts`:**
    ```ts
    // Friendly display labels for codebase slugs -- the same casing the nav in
    // .vitepress/config.ts uses. A codebase with no entry here (a 7th like FTE,
    // later) degrades to its raw slug: a lookup with a fallback, never a
    // per-codebase branch (D2/D14). Pure -- no fs, no Vue -- so it ports to the
    // Solid platform untouched (D15).
    const CODEBASE_LABELS: Record<string, string> = {
      ezquake: 'ezQuake',
      ktx: 'KTX',
      mvdsv: 'MVDSV',
      qtv: 'QTV',
      qwfwd: 'QWFWD',
      qwcl: 'QWCL',
    }

    export function codebaseLabel(slug: string): string {
      return CODEBASE_LABELS[slug] ?? slug
    }
    ```
  - [ ] **`lib/browse-types.ts`:** add `displayName: string` to `BrowseData` (a line
        after `codebase: string`) and to `CodebaseLandingData` (a line after
        `codebase: string`). Keep the existing comments.
  - [ ] **`lib/browse.ts`:** add `import { codebaseLabel } from './codebase-label'`;
        in `shapeBrowse`'s returned object add `displayName: codebaseLabel(codebase),`;
        in `shapeCodebaseLanding`'s returned object add `displayName: codebaseLabel(codebase),`.
  - [ ] **`.vitepress/theme/codebases.data.ts`:** import `codebaseLabel` (from
        `'../../lib/codebase-label'`); add `displayName: string` to the
        `CodebaseSummary` interface; in the final `.map(([codebase, types]) => ({ ... }))`
        add `displayName: codebaseLabel(codebase),`.
  - [ ] **`EntityBrowse.vue`** (heading, line ~43): change
        `{{ browse.codebase }} / {{ browse.type }}` to `{{ browse.displayName }} / {{ browse.type }}`.
  - [ ] **`CodebaseLanding.vue`** (heading, line ~16): change `{{ landing.codebase }}`
        to `{{ landing.displayName }}`.
  - [ ] **`CodebaseGrid.vue`** (card title, line ~14): change the link TEXT
        `{{ cb.codebase }}` to `{{ cb.displayName }}`. The `:href="`/${cb.codebase}`"`
        stays the slug (routes are unchanged).
- **Verification:** `tsc --noEmit` exit 0; `docs:build` exit 0; `/ezquake` heading reads
  "ezQuake", `/ktx` reads "KTX", the root grid cards read the friendly names; all hrefs
  still resolve to the slug routes (no 404). YES/NO.
- **Execution mode:** `inline` -- full content shipped above; mechanical edits across
  small files, no synthesis (F12: locked content is inline). The one judgment
  (resolve-at-build-time, pass via the contract -- not a component lookup) is decided
  here in the plan.

### Task 3 -- ASCII the lone em-dash entity (output discipline)

- **Goal:** `EntityCard`'s values-list separator renders an em-dash via `&mdash;`,
  against the operator's ASCII output discipline even in render. Swap it to ASCII.
  (`&rarr;` -- the version-walk arrow -- and `&middot;` -- separators -- stay: they are
  not dashes. The `&mdash;` only renders on ezQuake cvar value-lists since `values` is
  ezQuake-only, but the discipline applies regardless.)
- **Files:** `EntityCard.vue`.
- **Steps:**
  - [ ] **`EntityCard.vue`** (the Values block, line ~74): change `> &mdash; {{ v.description }}`
        to `> - {{ v.description }}` (ASCII hyphen-minus). Leave `&rarr;` and `&middot;`
        unchanged.
- **Verification:** `grep -rn "&mdash;" apps/docs-web/.vitepress` prints nothing;
  `docs:build` exit 0; an ezQuake cvar carrying a value list renders "name - description"
  on expand. YES/NO.
- **Execution mode:** `inline` -- one-token edit.

## Verification (phase boundary)

Copy-paste checks the operator (or orchestrator) runs at phase end. PASS on all ->
phase ships. Any FAIL -> Recovery.

1. **Lib + build.** `pnpm --dir apps/docs-web exec tsc --noEmit` exit 0; `pnpm --dir
   apps/docs-web test` still 23/23 (polish adds no test but must not break the suite);
   `pnpm --dir apps/docs-web run docs:build` exit 0, regenerates 28 routes. PASS: all
   green. FAIL: any tsc error / test failure / build error.
2. **Degradation gate (Task 1).** The static matrix checks all green (recorded above)
   AND the operator live click-through on >= 2 non-ezQuake codebases is clean (filter
   narrows; toggle regroups by `category_inferred`; an info_key row expands to show
   Scope; qwcl Type badge never shows `choice`; no console errors). PASS: both. FAIL:
   a render defect -> if the fix needs component code, **D14 escalation** (not a Phase-3
   patch).
3. **Display names.** `/ezquake`, `/ktx`, `/mvdsv`, `/qtv`, `/qwcl`, `/qwfwd` headings +
   the root grid cards show the friendly names; the nav is unchanged; every href still
   resolves to its slug route (no 404). PASS/FAIL.
4. **ASCII.** `grep -rn "&mdash;" apps/docs-web/.vitepress` prints nothing. PASS/FAIL.
5. **D14 holds with all 6 wired.** `grep -nE "ezquake|'cvar'|'command'|'macro'"
   apps/docs-web/.vitepress/theme/components/Entity*.vue` prints nothing (the
   display-name change must NOT introduce a codebase literal into a component -- the
   label flows via the contract). PASS: empty. FAIL: any literal.
6. **D15 holds.** `grep -rnE "fetch\(|readFileSync|readdirSync|\.filter\(|\.map\(|\.reduce\("
   apps/docs-web/.vitepress/theme/components/EntityBrowse.vue apps/docs-web/.vitepress/theme/components/EntityCard.vue
   apps/docs-web/.vitepress/theme/components/CodebaseLanding.vue apps/docs-web/.vitepress/theme/components/CodebaseGrid.vue`
   prints nothing. PASS: empty.
7. **D20 isolation.** `git status --short` shows changes ONLY under `apps/docs-web/`;
   `data/*.json` byte-unchanged. PASS/FAIL.

## Outputs to next phase

- All 6 codebases verified browse-able with correct graceful degradation (cold static
  checks + operator floor-check). The D14 generic renderer is proven across every v1
  codebase, not just ezQuake -- FTE (D2) will later slot in as a Phase-1 emit + one
  `codebase-label.ts` entry, with zero render work.
- Page headings + the root grid show friendly display names; `lib/codebase-label.ts` is
  the seam, and `browse-types.ts` now carries `displayName`. A 7th codebase degrades to
  its slug.
- Output discipline: no `&mdash;` in the render.
- **Still NOT built (Phase 4):** cvar->cvar auto-linking inside descriptions; the
  entity->guide "Used in" reverse-index (the dormant slot is present, renders nothing);
  source links for the 5 non-ezQuake codebases. `source-link.ts`'s `REPOS` map is still
  ezQuake-only -- it is the seam Phase 4 fills (+ F6: qtv/qwfwd `upstream_commit` is a
  version string, not a SHA -> tag-based URL).

## Open questions / deferred items

- **Question:** ezQuake's 129 uncategorized commands render in a "(uncategorized)"
  bucket (F7).
  **Default chosen for now:** correct + graceful for v1; the L1 categorization fix is a
  qw-oracle LOADER change (`load-hud-commands.ts` stamps `help_group_id='hud'`), NOT a
  docs phase, recommended pre-launch.
  **Who can resolve:** qw-oracle L1 enrichment / operator before launch (Phase 5).
- **Question:** the `ezquake-cvar` page ships ~1.17MB (a Rollup ">500 kB" advisory, not
  a failure).
  **Default chosen for now:** accept for v1 (per-page params; loaded only on navigation
  to `/ezquake/cvar`).
  **Who can resolve:** operator / Phase 5 (deploy-time optimization; contract-free).
- **Question:** ezQuake cvar two-level category taxonomy is grouped by the leaf label
  only.
  **Default chosen for now:** leaf-label grouping (uniform with the 5 flat-category
  codebases -- keeps the component generic, D14); `major-group` shows in the expanded
  meta. A two-level grouped view would be ezQuake-cvar-special component logic (D14
  violation).
  **Who can resolve:** operator (cosmetic; data supports a richer hierarchy later).
- No sub-agent finding contradicted `decisions.md` -- this MD was orchestrator-authored
  from cold verification (F13 records the reshape; the operator approved "verify + light
  polish" 2026-06-10).

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only:

- **A non-ezQuake page errors at build/render:** `shapeBrowse` hit a field assumed
  present that is absent for that type. But every field is already optional (D11) and
  the build is green today, so this would be NEW -- guard the access in `lib/`, never in
  the component.
- **A render defect needs component code to fix:** STOP. That is a D14 design gap in 2b
  (escalate to the operator; amend `decisions.md` with a dated block; do NOT fork or
  branch a component to paper over it).
- **`tsc` fails after adding `displayName`:** the field was added to one interface but
  not the other, or a component reads `displayName` before the contract carries it. Add
  it to BOTH `BrowseData` and `CodebaseLandingData` (and `codebases.data.ts`'s
  `CodebaseSummary`).
- **A display name shows the slug instead of the friendly name:** `codebaseLabel`
  returned its fallback -- the slug is missing from `CODEBASE_LABELS` (typo), or the
  shaper / loader did not attach `displayName`.
- **D14 grep #5 fails:** the display-name change put a codebase literal into a component.
  Move the label resolution to `lib/codebase-label.ts` + the contract; the component
  renders `browse.displayName` / `cb.displayName`, never a literal.

Unanticipated failures route to the operator.
