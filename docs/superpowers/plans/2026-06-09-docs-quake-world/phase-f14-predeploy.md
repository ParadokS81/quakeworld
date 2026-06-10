# Phase F14 (pre-deploy) -- UX + visual pass

> **Drafter pre-flight (done before writing this phase):**
> 1. Read `decisions.md` (full D1-D22 + all amendment blocks). Central here: D9 (amended 2026-06-10), D10 (amended 2026-06-10, CLOSED), D11, D14, D15, D22.
> 2. Read `review-findings.md`. Applies to this phase: **F17** (cvar-link no auto-expand), **F18** (search indexes only home), **F10/F11** (daisyUI include-vs-usage + grep comment false-positives), **F14** (the two theme collisions + the visual-polish scope gap this pass closes).
> 3. Read the live `apps/docs-web/` cold: the four components (EntityBrowse/EntityCard/CodebaseGrid/CodebaseLanding), `style.css`, `config.ts`, `theme/index.ts`, the three `.md` mounts, and the `lib/` logic layer (`anchor`, `snapshot`, `browse`, `browse-types`, `types`, `derive`, `category`, `cvar-link`, `filter`, `codebase-label`) plus `codebases.data.ts`. Ran the daisyUI include-vs-usage probe and resolved the `rootcolor`/`scrollbar` base-token question against the installed `daisyui` package.
> 4. Self-checked against D15 (logic in modules, view-glue in components), the `.menu` landmine, the trim-after-F18 sequencing, and D9-amended scope (flat search, not faceted). The orchestrator runs the Explore verification pass on this draft at the boundary.

## Goal

This phase is the pre-deploy UX + visual pass for docs.quake.world. It slots BETWEEN Phase 4 (shipped + pushed) and Phase 5 (deploy). It ships the global entity SEARCH the site is missing (F18 -- the headline item), the cvar-link auto-expand + highlight (F17), a daisyUI include-list trim, and a density/spacing polish. It is PRESENTATION-LAYER ONLY and respects D15: every new piece of logic (the search record builder, the MiniSearch searcher) lives in a pure plain-TS module; the new search box and the F17 hash glue are dumb view-state in components. It does NOT touch the L1 data export (`build-snapshot.ts`) or the Phase-4 cross-link logic modules. D10 ("adopt vikpe's theme") is CLOSED with no task -- the docs theme is already a byte-identical port of vikpe's (recorded in Open questions).

**Runnable state at phase boundary:** `pnpm --dir apps/docs-web build` exits 0 and emits the prior routes plus a new `/search` route; `pnpm --dir apps/docs-web test` is green (existing suites + the new search-index suite); `tsc --noEmit` is clean; the compiled CSS emits zero `.menu` rule. Then the OPERATOR FLOOR-CHECK (presentation -- needs human eyes): typing a cvar name in the homepage hero search (or the `/search` page) returns it and clicking the result lands on the EXPANDED, highlighted card; clicking a cvar-link inside a description expands + highlights the target; opening a deep link like `/ezquake/cvar#r_tracker` lands expanded; the top nav stays horizontal; the trimmed include dropped no used component; density reads cleanly.

## Inputs from previous phase

Phase 4 complete + pushed (cross-links live-verified in the operator floor-check 2026-06-10). Concretely:
- `apps/docs-web` builds clean; all prior routes render (6 landings + 20 type pages + home; Phase 4 reported 28 routes incl. the VitePress 404).
- cvar->cvar links render inside expanded EntityCard descriptions and resolve to the D22 per-entity anchors (`entityAnchor(name) = name.toLowerCase()`), but the browser lands on the target's COLLAPSED row (F17 -- this phase fixes it).
- VitePress local search (`search: { provider: 'local' }`) indexes ONLY the home page; the 28 data-driven entity routes carry no markdown prose so ~5016 entities are unreachable from the top search box (F18 -- this phase adds a custom entity search alongside).
- `style.css` daisyUI `include:` carries 22 tokens, only 6 of which are used as component classes (this phase trims it).
- Theme is settled: the docs `quakeworld` daisyUI theme is a byte-identical port of vikpe's `quakeworldz` (decisions.md D10 amendment 2026-06-10, CLOSED -- no swap).
- `lib/` logic layer is the D15 home for derivations; `lib/snapshot.ts` (`listSnapshots()` / `loadSnapshot()`) is the on-disk record source the search index will enumerate.

## Files touched

Absolute paths from repo root. This phase touches `apps/docs-web/` ONLY.

### Created
```
apps/docs-web/lib/search-index.ts                          # F18: CLIENT-safe module -- SearchRecord/SearchResult types + createSearcher() (wraps MiniSearch). NO node:fs; imported by GlobalSearch.vue. [F21 ratified at execution: split from the build-time half so node:fs never reaches the client Rollup bundle]
apps/docs-web/lib/search-builder.ts                        # F18/F21: BUILD-TIME module -- buildSearchRecords() (node:fs; enumerates every snapshot via lib/snapshot). Imported ONLY by search-records.data.ts, never by a component.
apps/docs-web/lib/search-index.test.ts                     # F18: vitest. createSearcher relevance over deterministic fixtures + buildSearchRecords shape invariants over live data.
apps/docs-web/.vitepress/theme/search-records.data.ts      # F18: VitePress defineLoader -> buildSearchRecords(). The ONLY VitePress-coupled search glue (D15); mirrors codebases.data.ts exactly.
apps/docs-web/.vitepress/theme/components/GlobalSearch.vue  # F18: dumb search box. query ref, lazy createSearcher on first focus, results via the lib searcher fn, each result an <a> to /<codebase>/<type>#<anchor>. Plain styled <ul> -- NO daisyUI .menu / .dropdown.
apps/docs-web/search.md                                    # F18: full-page search surface (mounts <GlobalSearch />); the site-wide nav target.
```

### Modified
```
apps/docs-web/.vitepress/theme/components/EntityCard.vue   # F17: add an `isTarget` prop -> watch/onMounted -> expand + flash-highlight + scrollIntoView (SSR-guarded). View-state glue (D15-clean). + item 5 density tweaks.
apps/docs-web/.vitepress/theme/components/EntityBrowse.vue # F17: own a `currentAnchor` reactive (one hashchange listener + an onMounted hash read), pass `:is-target` to each EntityCard. No .filter/.map/.reduce. + item 5 density tweaks.
apps/docs-web/.vitepress/theme/style.css                   # item 3: trim daisyUI include to the 6 used components + 2 base families; F17: add @keyframes docs-entity-flash + .entity-flash; item 5: density tweaks.
apps/docs-web/.vitepress/theme/index.ts                    # F18: register GlobalSearch as the 4th global component.
apps/docs-web/.vitepress/config.ts                         # F18: add { text: 'Search', link: '/search' } to the nav array.
apps/docs-web/index.md                                     # F18: mount <GlobalSearch /> as a hero above <CodebaseGrid />.
apps/docs-web/package.json                                 # F18: add minisearch ^7.2.0 to a new `dependencies` block.
apps/docs-web/.vitepress/theme/components/CodebaseGrid.vue # item 5 density tweaks only.
apps/docs-web/.vitepress/theme/components/CodebaseLanding.vue # item 5 density tweaks only.
```

### Deleted
```
n/a -- nothing is deleted this phase.
```

## Tasks

Task order is deliberate: **F17 first** (so F18 search results land on an expanded card -- the F18 x F17 synergy), **F18 second**, **the include trim third** (AFTER F18, so the probe sees GlobalSearch's actual class usage -- F14/F10 sequencing), **density last** (operator eyeball). D10 is recorded in Open questions with no task.

---

### Task 1 -- F17: cvar-link auto-expand + highlight

**Goal:** On navigation to an entity anchor -- BOTH an initial load carrying a `#anchor` hash AND a `hashchange` from an in-page cvar-link click -- auto-expand, briefly highlight, and scroll the matching EntityCard into view. Today the link resolves correctly (D22 anchor, no dead link) but lands on the target's collapsed row.

**Files:**
- `apps/docs-web/.vitepress/theme/components/EntityBrowse.vue` (own the hash signal)
- `apps/docs-web/.vitepress/theme/components/EntityCard.vue` (react to it)
- `apps/docs-web/.vitepress/theme/style.css` (the flash keyframe -- locked below)

**Design (read before editing -- this is view-state glue, D15-clean):**

The expand state lives PER ROW as `const expanded = ref(false)` inside `EntityCard.vue` (verified). The card root carries `:id="row.anchor"` and `@click="expanded = !expanded"`. Nothing toggles `expanded` on hash change, so the deep-linked row stays collapsed.

Use a **single-listener, parent-owned** hash signal (NOT a per-card listener -- the ezQuake cvar page renders ~2743 rows; 2743 `hashchange` listeners is the wrong shape). `EntityBrowse` owns one `currentAnchor` reactive and passes a per-row boolean down:

- In `EntityBrowse.vue` `<script setup>`: add a `currentAnchor = ref('')`. In `onMounted`, set it from the hash and subscribe once:
  ```ts
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  // ...existing query/grouped/cols...
  const currentAnchor = ref('')
  function readHash() {
    // location is browser-only; this runs in onMounted/hashchange (never SSR/setup).
    currentAnchor.value = decodeURIComponent(location.hash.slice(1))
  }
  onMounted(() => {
    readHash()
    window.addEventListener('hashchange', readHash)
  })
  onUnmounted(() => window.removeEventListener('hashchange', readHash))
  ```
  Then pass it to each card in the existing `v-for`:
  ```html
  <EntityCard
    v-for="row in section.rows"
    :key="row.anchor"
    :row="row"
    :columns="browse.activeColumns"
    :is-target="row.anchor === currentAnchor"
  />
  ```
  `decodeURIComponent` (not `URLSearchParams`) so `+`-prefixed command anchors like `+attack` survive (decodeURIComponent leaves `+` untouched; only `%xx` is decoded). The `row.anchor === currentAnchor` equality is a plain comparison -- it uses none of the D15-gated tokens (`.filter(` / `.map(` / `.reduce(` / `fetch(` / `readFileSync` / `readdirSync`).

- In `EntityCard.vue` `<script setup>`: add the prop and the activation:
  ```ts
  import { ref, watch, onMounted, nextTick, useTemplateRef } from 'vue'
  const props = defineProps<{ row: BrowseRow; columns: ColumnKey[]; isTarget?: boolean }>()
  const expanded = ref(false)
  const flash = ref(false)
  const rootEl = useTemplateRef<HTMLElement>('rootEl')   // or a plain ref + ref="rootEl"
  function activate() {
    expanded.value = true
    flash.value = true
    nextTick(() => rootEl.value?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }
  // Initial deep link: parent sets currentAnchor in ITS onMounted (which fires
  // after this child's onMounted, since Vue mounts children first), so the
  // watch -- not this onMounted -- catches the first true. Both are kept as
  // belt-and-suspenders; activate() is idempotent.
  onMounted(() => { if (props.isTarget) activate() })
  watch(() => props.isTarget, (v) => { if (v) activate() })
  ```
  Bind the flash class + clear it on animation end (re-triggerable on repeat navigation to the same anchor) on the card root, and add the template ref:
  ```html
  <div
    ref="rootEl"
    :id="row.anchor"
    class="grid items-start gap-3 px-3 py-1.5 border-b border-base-300 cursor-pointer hover:bg-base-200"
    :class="{ 'entity-flash': flash }"
    style="grid-template-columns: var(--cols)"
    @click="expanded = !expanded"
    @animationend="flash = false"
  >
  ```
  The `@click.stop` guards on the inner anchors and the expansion panel are UNCHANGED. The user can still collapse the card by clicking it after it auto-expands (local toggle still wins).

**Locked CSS (append to `style.css`):**
```css
/* F17: brief tint when an entity card is targeted by a deep-link or an in-page
   cvar-link click. Pure presentation; the expand/scroll glue is view-state in
   the component (D15-clean, same category as the filter/Flat-Grouped toggle).
   color-mix keeps the tint subtle (text stays readable through it) and it fades
   to transparent so the row settles to its normal background. */
@keyframes docs-entity-flash {
  from { background-color: color-mix(in oklch, var(--color-primary) 28%, transparent); }
  to   { background-color: transparent; }
}
.entity-flash {
  animation: docs-entity-flash 1.2s ease-out;
}
```

**D11 graceful:** a hash that matches no row never sets any `isTarget` true -- clean no-op (no error, no spurious expand). A page reached with no hash behaves exactly as today.

**F11 caveat:** keep the new `<script>` and its comments free of the literal tokens `.filter(` / `.map(` / `.reduce(` / `fetch(` -- the D15 boundary grep matches comment text too. Describe the glue in prose that avoids those substrings.

**Steps:**
- [ ] Edit `EntityBrowse.vue`: add the `currentAnchor` ref + `onMounted`/`onUnmounted` hash subscription per the design; pass `:is-target="row.anchor === currentAnchor"` on the `<EntityCard>` in the `v-for`. Touch nothing else (query/grouped/cols/sections stay as-is).
- [ ] Edit `EntityCard.vue`: add the `isTarget?: boolean` prop, the `flash` ref, the `rootEl` template ref, `activate()`, the `onMounted` + `watch`; bind `ref="rootEl"`, `:class="{ 'entity-flash': flash }"`, `@animationend="flash = false"` on the root div. Leave the existing expand/`@click.stop`/segment-render markup unchanged.
- [ ] Edit `style.css`: append the locked `@keyframes docs-entity-flash` + `.entity-flash` block.
- [ ] Verify SSR-safety: `location` / `window` are referenced ONLY inside `onMounted`/`hashchange` (never at module top or in `setup` body), or the VitePress SSR build throws on `location is not defined`.
- [ ] Verify the hash-event path in the dev server (`pnpm --dir apps/docs-web docs:dev`): clicking an in-page cvar-link fires the expand+flash. IF VitePress's client router intercepts in-page hash clicks such that `hashchange` does not fire, fall back to ALSO reading the route hash (e.g. watch `useRoute()` / a delegated click handler on the description panel) -- confirm against the live dev server, do not assume.

**Verification:**
- `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0. PASS condition: exit 0.
- `pnpm --dir apps/docs-web build` exits 0 (SSR build proves no `location`-at-setup leak). PASS condition: exit 0.
- D15 gate over the two components: `grep -nE 'fetch\(|readFileSync|readdirSync|\.filter\(|\.map\(|\.reduce\(' EntityBrowse.vue EntityCard.vue` is empty. PASS condition: empty.
- Operator dev-server check (part of the boundary floor-check): in-page cvar-link click and a `#anchor` deep link both expand + flash + scroll the target. FAIL condition: target stays collapsed, or console shows `location is not defined`.

**Execution mode:** `subagent (Sonnet medium)`. View-state glue across two existing components with SSR-aware lifecycle wiring (onMounted-only `location` access), a re-triggerable highlight, and one genuine integration unknown (whether VitePress's router lets `hashchange` through for in-page links) that is best resolved by a subagent working against the live dev server. The CSS keyframe and the prop/signal contract are fully locked above; the synthesis is the SSR-correct component wiring -- subagent, not inline, per the F12 carry-forward (subagent for genuine synthesis; inline only for fully-locked transcription).

---

### Task 2 -- F18: global entity search (MiniSearch)

**Goal:** A site-wide search over all ~5016 L1 entities (name + description), surfaced prominently, results linking straight to `/<codebase>/<type>#<anchor>` -- which, with F17, lands the reader on the expanded card. This is the headline deliverable; it reshapes D9 (amended 2026-06-10) to add a flat global entity search alongside VitePress's prose-only local search.

**Files:**
- `apps/docs-web/lib/search-index.ts` (created -- pure logic)
- `apps/docs-web/lib/search-index.test.ts` (created -- vitest)
- `apps/docs-web/.vitepress/theme/search-records.data.ts` (created -- the VitePress data loader)
- `apps/docs-web/.vitepress/theme/components/GlobalSearch.vue` (created -- the dumb box)
- `apps/docs-web/search.md` (created -- the full-page surface)
- `apps/docs-web/index.md` (modified -- the hero)
- `apps/docs-web/.vitepress/theme/index.ts` (modified -- register the component)
- `apps/docs-web/.vitepress/config.ts` (modified -- the nav link)
- `apps/docs-web/package.json` (modified -- the dependency)

**Architecture (D15 -- logic in a pure module, the box dumb):**

The record source already exists: the D13 uniform JSON in `apps/docs-web/data/*.json`, read via the existing `lib/snapshot.ts` (`listSnapshots()` + `loadSnapshot()`). The index/record logic lives in `lib/search-index.ts`; a VitePress `defineLoader` serializes the records into the client bundle (mirroring the existing `codebases.data.ts`); the component builds the MiniSearch index client-side on first focus and renders results. The MiniSearch query lives BEHIND a lib-returned `search(query)` function -- exactly the shape `EntityBrowse` already uses for `filterEntries(rows, query)` -- so the component carries no search logic, only interaction state. `lib/` modules may freely use `.map`/`.filter` (the D15 gate scopes to `.vue` only); the COMPONENT must not.

**`lib/search-index.ts` -- shape reference (the subagent finalizes against the installed `minisearch` types):**
```ts
import MiniSearch from 'minisearch'
import { listSnapshots, loadSnapshot } from './snapshot'
import { friendlyType } from './derive'
import { entityAnchor } from './anchor'
import { codebaseLabel } from './codebase-label'

// One searchable entity. displayName + url are PRECOMPUTED so the component
// stays dumb (no codebaseLabel / template-string building at render).
export interface SearchRecord {
  id: string            // `${codebase}:${type}:${name}` -- unique across the corpus
  name: string
  description?: string
  codebase: string
  displayName: string   // codebaseLabel(codebase)
  type: string
  friendlyType?: string // derive.friendlyType(entry); undefined where absent (D11)
  anchor: string        // entityAnchor(name)
  url: string           // `/${codebase}/${type}#${anchor}`
}

// The stored-field subset MiniSearch returns per hit, shaped for the result row.
export interface SearchResult {
  id: string; name: string; description?: string; codebase: string
  displayName: string; type: string; friendlyType?: string; anchor: string; url: string
}

// Build-time (fs): enumerate every snapshot into a flat record list.
export function buildSearchRecords(): SearchRecord[] {
  const records: SearchRecord[] = []
  for (const { codebase, type } of listSnapshots()) {
    const snap = loadSnapshot(codebase, type)
    const displayName = codebaseLabel(codebase)
    for (const e of snap.entries) {
      const anchor = entityAnchor(e.name)
      records.push({
        id: `${codebase}:${type}:${e.name}`,
        name: e.name,
        description: e.description,
        codebase,
        displayName,
        type,
        friendlyType: friendlyType(e),
        anchor,
        url: `/${codebase}/${type}#${anchor}`,
      })
    }
  }
  return records
}

// Client: wrap MiniSearch and return a query fn (mirrors filterEntries' shape).
// Pure of fs/Vue; safe to call in the browser. Verify the MiniSearch option
// names (idField/fields/storeFields/searchOptions: boost/prefix/fuzzy/combineWith)
// against node_modules/minisearch types before finalizing.
export function createSearcher(records: SearchRecord[]): (query: string) => SearchResult[] {
  const ms = new MiniSearch<SearchRecord>({
    idField: 'id',
    fields: ['name', 'description'],
    storeFields: ['name', 'description', 'codebase', 'displayName', 'type', 'friendlyType', 'anchor', 'url'],
    searchOptions: { boost: { name: 3 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  })
  ms.addAll(records)
  return (query) => {
    const q = query.trim()
    if (q === '') return []
    return ms.search(q) as unknown as SearchResult[] // hits carry storeFields + id
  }
}
```

**`search-records.data.ts` -- the loader (mirror `codebases.data.ts`):**
```ts
import { defineLoader } from 'vitepress'
import { buildSearchRecords, type SearchRecord } from '../../lib/search-index'

declare const data: SearchRecord[]
export { data }

export default defineLoader({
  watch: ['../../data/*.json'],
  load(): SearchRecord[] {
    return buildSearchRecords()
  },
})
```

**`GlobalSearch.vue` -- the dumb box (shape reference):**
```vue
<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue'
import { data as records } from '../search-records.data'
import { createSearcher, type SearchResult } from '../../../lib/search-index'

const query = ref('')
// Lazy: build the 5016-record index only when the user first focuses the box,
// not during SSR and not on every page load. createSearcher is pure (no DOM),
// but building it eagerly would tax every page; first-focus is the right moment.
const search = shallowRef<((q: string) => SearchResult[]) | null>(null)
function ensureIndex() { if (search.value === null) search.value = createSearcher(records) }
const results = computed<SearchResult[]>(() =>
  search.value !== null && query.value.trim() !== '' ? search.value(query.value).slice(0, 20) : []
)
</script>

<template>
  <div class="w-full max-w-2xl">
    <input
      v-model="query"
      @focus="ensureIndex"
      type="text"
      class="input w-full"
      placeholder="Search 5000+ settings across 6 codebases..."
    />
    <!-- Plain styled list -- NOT daisyUI .menu (the F14 nav landmine) and NOT
         .dropdown (collision-prone, dropped from the include). Tailwind utilities
         + the kept badge token only. -->
    <ul v-if="results.length" class="mt-2 border border-base-300 bg-base-200 max-h-96 overflow-y-auto">
      <li v-for="r in results" :key="r.id" class="border-b border-base-300 last:border-b-0">
        <a :href="r.url" class="flex flex-wrap items-baseline gap-2 px-3 py-2 hover:bg-base-300">
          <span class="font-mono">{{ r.name }}</span>
          <span class="badge badge-ghost">{{ r.displayName }}</span>
          <span class="badge badge-ghost">{{ r.type }}</span>
          <span v-if="r.friendlyType" class="text-xs text-base-content/60">{{ r.friendlyType }}</span>
          <span v-if="r.description" class="w-full truncate text-sm text-base-content/60">{{ r.description }}</span>
        </a>
      </li>
    </ul>
    <p v-else-if="query.trim() !== ''" class="mt-2 px-3 py-2 text-base-content/60">No matches.</p>
  </div>
</template>
```
The component uses only `.slice` (not a gated token) in `<script>`; the `.map`/`.filter` of record-building live in `lib/`. daisyUI classes used: `input` + `badge` (both in the kept trim set) -- so F18 introduces NO new daisyUI token and the Task-3 trim stays fully determined.

**`search.md` (created):**
```md
---
title: Search -- docs.quake.world
---

# Search

<GlobalSearch />
```

**`index.md` (modified -- hero above the grid):** insert `<GlobalSearch />` between the intro paragraph and `<CodebaseGrid />`:
```md
The Layer 1 reference for the QuakeWorld ecosystem -- every tunable knob
(cvars, commands, macros, cmdline params, info keys) projected per codebase
from the QW Oracle. Pick a codebase to browse.

<GlobalSearch />

<CodebaseGrid />
```

**`theme/index.ts` (modified):** import + register `GlobalSearch` as the 4th global component (same pattern as the existing three).

**`config.ts` (modified):** append `{ text: 'Search', link: '/search' }` to the `nav` array. This is the site-wide reach -- a plain nav LINK to a normal page, NOT a VPNav search-slot override, so it cannot reintroduce the `.menu`/nav collision. VitePress's own Ctrl+K local search stays in place for prose (D9-amended).

**`package.json` (modified):** add a `dependencies` block with `"minisearch": "^7.2.0"` (latest verified 2026-06-10). MiniSearch is bundled into the client, so it is a runtime dependency, not a devDependency.

**Steps:**
- [ ] `pnpm --dir apps/docs-web add minisearch` (D20 isolation: the `--dir` form keeps install in-subtree; do NOT run a bare root `npm install`). Confirm it lands in `dependencies` at `^7.2.0` and that `node_modules` stays under `apps/docs-web/`.
- [ ] Create `lib/search-index.ts` per the shape reference. Verify the MiniSearch option/return surface against `node_modules/minisearch` `.d.ts` before finalizing (idField, fields, storeFields, searchOptions.{boost,prefix,fuzzy,combineWith}, addAll, search return shape).
- [ ] Create `lib/search-index.test.ts` (see Verification for the cases).
- [ ] Create `.vitepress/theme/search-records.data.ts` (the loader).
- [ ] Create `.vitepress/theme/components/GlobalSearch.vue` per the shape reference. Keep `<script>` + comments free of `.filter(`/`.map(`/`.reduce(`/`fetch(` (F11). daisyUI classes limited to `input` + `badge`.
- [ ] Create `search.md`; modify `index.md` (hero), `theme/index.ts` (register), `config.ts` (nav link).
- [ ] Build + smoke: `pnpm --dir apps/docs-web build` emits `/search.html`; `curl`/grep the built `index.html` and `search.html` for the search input.

**Verification:**
- `pnpm --dir apps/docs-web exec tsc --noEmit` exits 0. PASS: exit 0.
- `pnpm --dir apps/docs-web test` green -- existing suites + `search-index.test.ts`. The new suite asserts: (a) `createSearcher` over a small fixture record set returns the exact-name hit first for an exact-name query; (b) a description-only term finds the record whose description (not name) contains it; (c) every returned result carries `url === /<codebase>/<type>#<anchor>` with `anchor === name.toLowerCase()`; (d) empty/whitespace query returns `[]`; (e) `buildSearchRecords()` over the live data dir returns > 0 records and every record has non-empty `name`, `id`, `anchor`, `url`. PASS: all green.
- `pnpm --dir apps/docs-web build` exits 0 and emits `.vitepress/dist/search.html` plus all prior routes. PASS: exit 0 + `/search` present + prior routes intact.
- D15 gate over `GlobalSearch.vue`: `grep -nE 'fetch\(|readFileSync|readdirSync|\.filter\(|\.map\(|\.reduce\('` is empty. PASS: empty.
- Isolation (D20): the install touched no file outside `apps/docs-web/`; `git status` shows changes only under the subtree (+ this plan dir). PASS: in-subtree only.
- Operator floor-check (boundary): typing a cvar name in the hero / `/search` returns it; clicking lands on the EXPANDED + highlighted card (F17 synergy). FAIL: search returns nothing for a known cvar, or the result link 404s / lands collapsed.

**Execution mode:** `subagent (Sonnet MAX)`. A genuine new feature: a dependency add, a build-time index/record module, a VitePress data loader, a new component, a new page, and four wiring edits -- judgment-dense synthesis across multiple files with a real API surface to verify (MiniSearch). This is the win-or-lose work of the phase; isolated context + the highest tier is right (the prompt's F18 guidance; F12's "subagent for genuine synthesis").

---

### Task 3 -- trim the daisyUI `include:` list

**Goal:** Shrink the daisyUI `include:` to the components actually used, removing 14 unused tokens (and the latent generic-classname collisions they carry -- the `.menu`/`.vp-doc h2` class already bit us in F14). Keep the 6 used component tokens + the 2 base-style families.

**Files:** `apps/docs-web/.vitepress/theme/style.css`.

**Evidence (probe run during drafting; the executor re-runs it AFTER Task 2 so it sees GlobalSearch's classes):**
```
grep -rEoh 'class="[^"]*"' --include='*.vue' --include='*.md' apps/docs-web/.vitepress apps/docs-web \
  | grep -oE '\b(badge|breadcrumbs|btn|card|collapse|divider|dropdown|indicator|input|join|label|loading|list|menu|progress|range|select|skeleton|swap|tabs?|toggle)\b' \
  | sort | uniq -c | sort -rn
```
Class-attribute-scoped result (drafting): `card`, `badge`, `toggle`, `label`, `input`, `divider` -- and NOTHING else. (The earlier unscoped grep showed `loading`/`label` counts inflated by the components' prose comments "no data loading" -- the F11 comment-false-positive; the class-scoped grep above is the real signal.) GlobalSearch (Task 2) adds only `input` + `badge`, both already in the set.

**The `rootcolor` / `scrollbar` correction (do NOT blindly copy the F14 quick-note's 6-token list):** the current include also carries `rootcolor` and `scrollbar`. These are NOT component classes -- they are daisyUI BASE families (`node_modules/daisyui/base/rootcolor`, `node_modules/daisyui/base/scrollbar`), invisible to a class-usage grep. `rootcolor` applies the theme color CSS at `:root`; `scrollbar` styles scrollbars. The F14 floor-check note recommended trimming to `badge/card/divider/input/label/toggle` -- which would have silently dropped both base families, a visual regression this very pass exists to PREVENT. KEEP them.

**Locked replacement for the `include:` block in `style.css`:**
```css
@plugin "daisyui" {
  themes: quakeworld --default;
  /* 'menu' intentionally excluded: daisyUI's .menu (flex-flow:column) collides
     with VitePress's nav (class="VPNavBarMenu menu") and stacks the horizontal
     top-nav vertically (F14 bug A). We use no daisyUI menus.
     Trimmed (F14 pre-deploy) to the components actually used as classes
     (badge/card/divider/input/label/toggle -- verified by an include-vs-usage
     grep) plus the two base-style families (rootcolor applies the theme color
     CSS; scrollbar styles scrollbars) -- base families are not class-gated, so a
     class-usage probe cannot see them; dropping them would regress the base look. */
  include:
    badge, card, divider, input, label, toggle,
    rootcolor, scrollbar;
  logs: false;
}
```
This drops: breadcrumbs, button, collapse, dropdown, indicator, join, loading, list, progress, range, select, skeleton, swap, tab (14 tokens).

**Steps:**
- [ ] AFTER Task 2 ships, re-run the include-vs-usage probe above. Confirm the used set is exactly `{badge, card, divider, input, label, toggle}` (GlobalSearch must not have introduced a new token). If the probe surfaces any token outside the keep set, ADD it rather than dropping a used component.
- [ ] Replace the `@plugin "daisyui"` `include:` block in `style.css` with the locked block above (keep the `@import`, the `@plugin "daisyui/theme"` block, and the F17 keyframe untouched).
- [ ] Rebuild and confirm the compiled CSS still styles the six components and still emits the theme color vars (rootcolor kept), with zero `.menu`.

**Verification:**
- `pnpm --dir apps/docs-web build` exits 0. PASS: exit 0.
- `.menu` regression gate: in the compiled CSS, `grep -c 'flex-flow:column' .vitepress/dist/assets/*.css` (or the daisyUI `.menu{...}` rule) is 0. PASS: 0.
- Base-family retained: the compiled CSS still contains the theme `--color-*` `:root` declarations (rootcolor not dropped). PASS: present.
- Operator eyeball (boundary): landing cards, badges, the Flat/Grouped toggle, the filter input, the divider, and the search box all render styled (no un-styled regression like the F10 card bug). FAIL: any of the six renders unstyled, or scrollbars/base colors changed.

**Execution mode:** `inline`. The trimmed list is fully determined and the full replacement block is locked above (evidence-backed by the class-scoped probe + the base-family resolution). Per the F12 ratified ruling, a task that ships full locked file content is `inline`, not a subagent. The post-Task-2 probe re-run is a verification step, not synthesis. (Sequencing only -- it must follow Task 2.)

---

### Task 4 -- density / spacing polish

**Goal:** Tighten and harmonize the browse tables, the landing cards, the expanded card, and the new search results so the launch look reads as deliberate rather than scaffold-default. Subjective -- the changes below are concrete proposals; the operator eyeballs and tunes them at the boundary floor-check. Presentation-only (CSS/class changes; no logic -- D15).

**Files:** `EntityBrowse.vue`, `EntityCard.vue`, `CodebaseGrid.vue`, `CodebaseLanding.vue`, `style.css`, and `GlobalSearch.vue` (overlap with Tasks 1-3; apply density edits last, on top).

**Proposed changes (concrete; operator may accept/adjust each):**
- **Browse column header (`EntityBrowse.vue`):** give the sticky header a table-header feel -- `text-xs uppercase tracking-wide` on the header cells (keep the `border-b-2`). Widen the inter-column gap `gap-3 -> gap-4` on both the header and the rows (`EntityCard` root) so Type/Default/Description do not crowd.
- **Browse rows (`EntityCard.vue` collapsed grid):** keep the dense `py-1.5` (reference scanning wants density) but add `leading-tight` to the name/description cells; ensure the chevron + name baseline-align.
- **Expanded panel (`EntityCard.vue`):** add a left accent so the open card visually separates from the row grid and pairs with the F17 flash: on the `v-if="expanded"` panel, `border-l-2 border-primary/30 pl-3` and bump `py-2 -> py-3`. Keep `max-width: 90ch`.
- **Landing grid cards (`CodebaseGrid.vue`):** add a hover affordance to match `CodebaseLanding` (`hover:border-primary/50 transition-colors` on the card); keep `gap-4`, `minmax(280px, 1fr)`.
- **Per-codebase landing cards (`CodebaseLanding.vue`):** already has `hover:bg-base-300`; align its card padding (`card-body p-4`) and badge spacing with the grid for consistency.
- **Page rhythm:** ensure the browse `<h1>` + count line and the landing `<h1>` carry consistent bottom margin (`mb-4`); add a little breathing room above `<CodebaseGrid />` / the hero on `index.md`.
- **Search results (`GlobalSearch.vue`):** comfortable result-row padding (`px-3 py-2`), codebase + type badges, mono name, muted truncated description -- already in the Task-2 shape; tune to match the browse rows.

**Steps:**
- [ ] Apply the proposed class changes above across the listed files. No logic edits -- classes/markup only.
- [ ] Rebuild; confirm no layout breakage (columns still align, no zigzag; cards still grid cleanly).
- [ ] Present to the operator at the boundary floor-check for eyeball + tuning.

**Verification:**
- `pnpm --dir apps/docs-web build` exits 0. PASS: exit 0.
- D15 gate over the touched components stays empty (these are class-only edits). PASS: empty.
- Operator eyeball (boundary): density reads cleanly across browse tables, landing cards, expanded cards, and search results; columns do not zigzag. FAIL: operator rejects -- iterate on the specific elements called out.

**Execution mode:** `subagent (Sonnet medium)`. Concrete but cohesive CSS/spacing edits across 5-6 files needing a consistent visual eye, followed by an operator tuning loop. Not pure transcription (the proposals are a starting point the operator iterates on), so a subagent with the live render in front of it is the right tier -- but it is bounded presentation work, not MAX-tier synthesis.

---

## Verification (phase boundary)

Copy-paste, YES/NO. Run from repo root. PASS -> proceed toward Phase 5. FAIL -> Recovery.

1. `pnpm --dir apps/docs-web exec tsc --noEmit` -> exit 0. PASS condition: exit 0. FAIL: type error (likely a MiniSearch type mismatch in `lib/search-index.ts` or a missing prop type on EntityCard).
2. `pnpm --dir apps/docs-web test` -> all suites green (the prior 40 + `search-index.test.ts`). PASS condition: 0 failures. FAIL: a search-index assertion -- read it before touching code.
3. `pnpm --dir apps/docs-web build` -> exit 0; `.vitepress/dist/search.html` exists; the prior routes still emit. PASS condition: exit 0 + `/search` present + prior routes intact. FAIL: an SSR `location is not defined` (F17 leaked `location` into setup) or a loader error.
4. `.menu` regression gate: the compiled CSS emits zero `.menu { flex-flow:column }` (`grep -c 'flex-flow:column' apps/docs-web/.vitepress/dist/assets/*.css` -> 0). PASS condition: 0. FAIL: `menu` crept back into the include, or GlobalSearch used daisyUI `.menu`/`.dropdown`.
5. Base-family retained: the compiled CSS still carries the theme `--color-*` `:root` declarations. PASS condition: present. FAIL: `rootcolor` was dropped in the trim.
6. D15 decoupling gate over the new/modified components: `grep -nE 'fetch\(|readFileSync|readdirSync|\.filter\(|\.map\(|\.reduce\(' apps/docs-web/.vitepress/theme/components/{EntityBrowse,EntityCard,GlobalSearch}.vue` -> empty (code AND comments -- F11). PASS condition: empty. FAIL: a derivation or a trigger-token comment slipped into a component -- move logic to `lib/` or reword the comment.
7. Isolation (D20): `git status --short` shows changes only under `apps/docs-web/` (plus this plan dir); the install did not write outside the subtree. PASS condition: in-subtree only. FAIL: a bare root `npm install` cross-contaminated -- re-run with `pnpm --dir apps/docs-web`.
8. **Operator floor-check (presentation -- human eyes, like Phase 3; production-of-UX cannot be faked by a probe):**
   - Type a cvar name (e.g. `r_tracker`) in the homepage hero search AND on `/search` -> the entity appears; clicking the result lands on the EXPANDED + highlighted card. PASS/FAIL.
   - Click a cvar-link inside an expanded description -> the target card expands + flashes + scrolls into view. PASS/FAIL.
   - Open a deep link `/ezquake/cvar#r_tracker` directly -> the card is expanded + highlighted on load. PASS/FAIL.
   - The top nav stays horizontal across pages (incl. the new Search link). PASS/FAIL.
   - The trimmed include dropped no used component (cards/badges/toggle/input/divider/label all styled; scrollbars/base colors unchanged). PASS/FAIL.
   - Density reads cleanly (browse tables, landing cards, expanded cards, search results). PASS/FAIL.

## Outputs to next phase

Phase 5 (deploy) inherits a docs-web that is search-complete and visually polished:
- Site-wide entity search works (homepage hero + `/search` nav page); ~5016 entities are reachable by name + description; results deep-link to expanded cards.
- cvar-links and deep links auto-expand + highlight their target (F17) -- the "search/click a cvar -> read it" motion is one step.
- The daisyUI CSS surface is trimmed to what is used (smaller CSS, no latent generic-classname collisions), with the theme base intact.
- Density/spacing is operator-approved.
- The build still exits 0 with the prior routes + `/search`; tests green; D15 gates green; nav horizontal. Phase 5 deploys THIS presentation layer (the infiniti Solid port is post-v1).

## Open questions / deferred items

- **Question:** D10 -- "adopt vikpe's theme." **Default chosen for now:** NO task, NO theme swap. The docs `quakeworld` daisyUI theme is already a byte-identical port of vikpe's `quakeworldz` (decisions.md D10 amendment 2026-06-10, verified against his vendored `research/repos/slipgate/web/apps/website/src/styles/main.css`: same palette, radii, border, depth/noise). vikpe's include carries `menu` (the F14 nav bug) and lacks `card` -- so the docs include is the correctly-adapted one; do NOT adopt his wholesale. Any look change this phase is the Task-4 density polish, not a theme adoption. **Who can resolve:** CLOSED -- recorded here so no one re-opens it.
- **Question:** Search payload weight -- the records data file ships every entity's name + description into the client bundle (so the index can build client-side). **Default chosen for now:** ship the flat records + build the index lazily on first focus (5016 small records index in well under 100ms; the records are lean -- no remarks/values/history). **Who can resolve:** operator at the floor-check; if the bundle feels heavy, a later optimization is a build-time-serialized MiniSearch index and/or trimmed stored descriptions (note, not a v1 blocker).
- **Question:** Site-wide search placement -- hero + `/search` nav page vs. injecting a search box into the VPNav slot. **Default chosen for now:** homepage hero + a `/search` page reached by a plain nav link -- maximal reach with zero VPNav-slot surgery (no `.menu`/nav-collision risk). **Who can resolve:** operator; a future pass could add a compact nav-bar search trigger if the nav-link round-trip feels heavy.
- **Question:** MiniSearch relevance tuning (prefix/fuzzy/boost). **Default chosen for now:** `boost name:3`, `prefix:true`, `fuzzy:0.2`, `combineWith:'AND'`. **Who can resolve:** operator after seeing live results; cheap to tune in `createSearcher`.
- **Question:** F17 hash-event reliability through VitePress's client router for in-page cvar-link clicks. **Default chosen for now:** native `hashchange` + an `onMounted` initial hash read; the subagent verifies the in-page path against the live dev server and falls back to a route-hash watch if `hashchange` is swallowed. **Who can resolve:** Task 1 subagent at implementation (live dev-server check).

No sub-agent finding contradicts `decisions.md` at draft time. (Search is now IN scope per the D9 amendment 2026-06-10 -- a flat global name+description entity search, NOT the faceted/cross-engine search D9/D21 still defer.)

## Recovery (if verification fails)

- **SSR build throws `location is not defined` (check 3):** F17 referenced `location`/`window` at module top or in `setup` body. Move ALL hash reads into `onMounted`/the `hashchange` handler; never touch `location` during SSR.
- **`hashchange` does not fire for in-page cvar-link clicks (floor-check):** VitePress's router intercepted the same-page hash navigation. Add a route-hash watch (`useRoute()` from `vitepress`) or a delegated click handler on the description panel as a fallback; keep the native listener for cross-page (search-result) navigation. Verify both paths in the dev server.
- **`.menu` regression / nav stacks vertical (check 4):** either `menu` re-entered the include, or GlobalSearch used daisyUI `.menu`/`.dropdown`. Restore the locked trim block; rebuild GlobalSearch's results as a plain styled `<ul>`.
- **A component renders unstyled after the trim (check, floor-check):** a used token was dropped. Re-run the class-scoped include-vs-usage probe and ADD the missing token back (the probe is the gate; never trim a token the grep shows in use). If base colors/scrollbars changed, `rootcolor`/`scrollbar` were dropped -- restore the base families.
- **Search returns nothing for a known cvar (floor-check):** check that `buildSearchRecords()` enumerated the data dir (the loader's `watch` glob resolves) and that `createSearcher` indexed `description` as well as `name`; confirm the MiniSearch `fields`/`searchOptions` against the installed types (the API surface was speced from MiniSearch 7.2.0 -- re-verify if a newer major installed).
- **Install cross-contaminated outside the subtree (check 7):** a bare root `npm install` ran instead of `pnpm --dir apps/docs-web add`. Revert the stray `node_modules`/lockfile changes and re-install with the `--dir` form (D20/F8 isolation).
- **Unanticipated failure:** route to the operator.

---

## Verification sub-agent dispatch (orchestrator runs this at the boundary, against the live codebase)

Spawn `Agent` with `subagent_type=Explore`, this brief:

```
You are verifying a draft plan phase against the live codebase. You read and
report; you do NOT modify files.

Read this phase MD: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-f14-predeploy.md
Read decisions.md: docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md
Read review-findings.md: docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md

Then verify, item by item:

1. Files touched: every Modified/Deleted path exists in the live
   apps/docs-web/ tree; every Created file's PARENT dir exists (the files
   themselves are not expected to exist -- paper plan). Flag a Modified path
   that does not exist.
2. F17 expand-state: confirm EntityCard.vue holds `expanded` as local ref and
   the card root carries `:id="row.anchor"` + `@click` toggle; confirm
   EntityBrowse.vue renders EntityCard in a v-for and currently passes only
   :row/:columns. Flag if the design's hooks do not match the live shape.
3. F17 SSR: the design reads location/hash ONLY in onMounted/hashchange. Flag
   any place the plan would reference location/window in setup or at module top.
4. F18 record source: confirm lib/snapshot.ts exposes listSnapshots() +
   loadSnapshot(), and that EntityRecord (lib/types.ts) carries name +
   description; confirm derive.friendlyType + anchor.entityAnchor +
   codebase-label.codebaseLabel exist with the signatures the plan calls.
   Flag any mismatch.
5. D15 decoupling: the search/record logic lives in lib/search-index.ts (pure)
   and the VitePress loader (search-records.data.ts); GlobalSearch.vue and the
   F17 component edits carry no fetch/readFileSync/readdirSync/.filter(/.map(/
   .reduce( in <script> OR comments (F11). Flag any logic-in-component.
6. D14 generic: nothing the plan adds bakes per-codebase or per-type branching
   into a component (the search iterates uniform records; the nav adds one
   static link). Flag any per-codebase branch in a component.
7. D22 anchors: search result urls + cvar-link targets use entityAnchor(name) =
   name.toLowerCase() (`/<codebase>/<type>#<anchor>`); no second scheme invented.
   Flag drift.
8. The .menu landmine: GlobalSearch results use a plain styled <ul> + only the
   kept daisyUI tokens (input/badge), NOT .menu/.dropdown; the trim KEEPS
   rootcolor + scrollbar (base families) and drops only unused component tokens.
   Flag if the trim would drop a base family or a used component, or if the
   search UI uses .menu/.dropdown.
9. Trim sequencing: Task 3 runs AFTER Task 2 (probe sees GlobalSearch classes).
   Flag if ordered before.
10. Execution-mode annotations: every task carries a mode + rationale; F18 is
    subagent-MAX, F17/density subagent-medium, trim inline. Flag a code-synthesis
    task marked inline or a locked-content task marked subagent.
11. Scope creep (D21 / D9-amended): the search is a FLAT global name+description
    search (in scope per D9 amendment), NOT faceted/cross-engine; the phase does
    NOT touch build-snapshot.ts, qw-oracle/curated/, or L1 data; no deploy work.
    Flag any drift into a non-goal.
12. "Engineer fills in X" / TODO smell -- list any.

Report under 400 words:
CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...
If a section has no findings, write "(none)".
```

Apply findings before the phase is declared ready. If a finding contradicts `decisions.md`, the decision wins -- record the rejected finding in Open questions with a one-line rationale.
