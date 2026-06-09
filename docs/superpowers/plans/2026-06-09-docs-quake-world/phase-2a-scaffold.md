# Phase 2a -- VitePress scaffold + design system

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- D1-D22). Central here: D10, D13, D14, D15, D20, D22.
> 2. Read `review-findings.md`. Applicable: F1 (slipgate-parity -- a non-goal here, restated as a guard), F2/F5 (uniform shape the loader types), F8 (new -- root npm workspaces glob vs docs-web pnpm subtree).
> 3. Read the live source cold: the Phase-1 output JSON in `apps/docs-web/data/` (the contract the loader reads), and `research/repos/slipgate/web/apps/website/src/styles/main.css` (the daisyUI theme tokens to lift). Do NOT copy code from the spec or the scaffold -- the spec's D13 record list is stale vs the live emit (see the contract note in Task 3).
> 4. After drafting, dispatch the verification sub-agent (Explore) before declaring the phase MD ready for operator review.

## Goal

Stand up `apps/docs-web` as a VitePress (Vite + Vue) site with Tailwind v4 + daisyUI tokens, as its own pnpm-workspaces subtree (D10/D20), wired so the data/logic layer is physically separate from the Vue component layer from day one (D15). This phase produces the "site boots" checkpoint: the pnpm project installs, a landing page renders with vikpe's daisyUI palette visibly applied (federation cohesion), a plain-TS data-loading module reads the Phase-1 snapshot JSON, and a dynamic-routing skeleton generates one stub page per codebase and per (codebase, type) pair. It builds NO entity browse view, NO card, NO friendly-type / category derivation, NO filter/search -- those are Phase 2b. **Runnable state at phase boundary:** `pnpm --dir apps/docs-web install` succeeds, `pnpm --dir apps/docs-web run docs:dev` boots, the landing page shows the 6 codebases as daisyUI-styled cards with per-type entity counts sourced from `apps/docs-web/data/` (proving the loader path end-to-end), and `pnpm --dir apps/docs-web run docs:build` exits 0 having generated the per-codebase and per-type stub routes (e.g. `/ezquake` and `/ezquake/cvar`).

## Inputs from previous phase

- **Phase 1 complete (shipped `0979d4ad`):** `apps/docs-web/data/*.json` exists for all 6 codebases in the uniform record shape -- 20 files, 5016 records, all git-tracked. Verified present 2026-06-10. These are this phase's read-only INPUT; 2a does not modify them.
- **Local-dev environment (prerequisites.md Task 0):** Node.js LTS (>= 20) + pnpm via corepack available in WSL. (Bun stays the qw-oracle runtime; Node+pnpm is added for docs-web only -- the two coexist, D20.) This is an operator prerequisite, not a phase task; if pnpm is absent the phase pauses at Task 1's install step.
- **No qw-oracle / Postgres dependency.** Unlike Phase 1, this phase reads only the static JSON already on disk. The DB does not need to be up.

## Files touched

All created files are hand-written. Absolute paths from repo root. All live under the new `apps/docs-web/` subtree; nothing outside it is touched.

### Created
```
apps/docs-web/package.json                                  # the VitePress site package (pnpm-managed); scripts docs:dev/build/preview
apps/docs-web/pnpm-workspace.yaml                           # makes docs-web its own pnpm workspace root (D20); isolates it from the monorepo npm workspaces field (F8)
apps/docs-web/.gitignore                                    # ignore node_modules + .vitepress/{cache,dist}; MUST NOT ignore data/ (Phase-1 tracked output)
apps/docs-web/.vitepress/config.ts                         # VitePress config: title, nav (6 codebases), local search (D9), srcExclude data/lib, vite plugin wiring (Tailwind v4)
apps/docs-web/.vitepress/theme/index.ts                    # custom theme: extends DefaultTheme, imports style.css, registers the landing component
apps/docs-web/.vitepress/theme/style.css                   # Tailwind v4 + daisyUI; vikpe's theme tokens lifted (D10); preflight reconciled vs VitePress (Task 2)
apps/docs-web/.vitepress/theme/codebases.data.ts           # VitePress build-time data loader -- the ONLY VitePress-coupled data glue (D15); shapes render-ready data
apps/docs-web/.vitepress/theme/components/CodebaseGrid.vue # landing proof component: renders the loader's data with daisyUI classes; ZERO derivation in <script> (D15)
apps/docs-web/lib/types.ts                                 # the docs-snapshot data contract (verified against live Phase-1 JSON); framework-agnostic (D15)
apps/docs-web/lib/snapshot.ts                              # plain-TS loader: listSnapshots() + loadSnapshot(); Node fs read + parse + invariant-validate; no Vue import (D15)
apps/docs-web/index.md                                     # landing page; mounts <CodebaseGrid/>
apps/docs-web/[codebase].md                                # per-codebase landing STUB (dynamic route); body filled in Phase 2b
apps/docs-web/[codebase].paths.ts                          # paths loader: enumerates the 6 codebases from the data dir
apps/docs-web/[codebase]/[type].md                         # per-(codebase,type) browse STUB (dynamic route); browse view is Phase 2b
apps/docs-web/[codebase]/[type].paths.ts                   # paths loader: enumerates the 20 (codebase,type) pairs from the data dir
```

### Modified
```
n/a -- 2a creates a fresh subtree. It modifies NO existing file. In particular it
does NOT touch apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts, any file
under apps/slipgate-app/, or the monorepo-root package.json. (The root package.json
npm-workspaces interaction is handled by docs-web's own pnpm-workspace.yaml, not by
editing the root -- see F8 / Open Questions.)
```

### Deleted
```
n/a
```

## Tasks

### Task 1 -- pnpm workspace skeleton

- **Goal:** Create `apps/docs-web` as an isolated pnpm-workspaces project root with the VitePress site package manifest.
- **Files:** `apps/docs-web/package.json`, `apps/docs-web/pnpm-workspace.yaml`, `apps/docs-web/.gitignore`.
- **Steps:**
  - [ ] Write `apps/docs-web/package.json` with this exact content:
    ```json
    {
      "name": "docs-web",
      "private": true,
      "type": "module",
      "scripts": {
        "docs:dev": "vitepress dev",
        "docs:build": "vitepress build",
        "docs:preview": "vitepress preview"
      },
      "devDependencies": {
        "vitepress": "^1.6.0",
        "vue": "^3.5.13",
        "tailwindcss": "^4.2.2",
        "@tailwindcss/vite": "^4.2.2",
        "daisyui": "^5.5.19"
      }
    }
    ```
    Rationale for pins: `tailwindcss` / `@tailwindcss/vite` / `daisyui` match vikpe's slipgate-web catalog (`^4.2.2` / `^4.2.2` / `^5.5.19`) for federation palette + behavior cohesion (D10). `vitepress` / `vue` are current stable; `pnpm install` resolves exact versions into the lockfile.
  - [ ] Write `apps/docs-web/pnpm-workspace.yaml` with this exact content:
    ```yaml
    # docs-web is its own pnpm workspace root (D20). pnpm reads ONLY this file to
    # define the workspace -- it ignores the monorepo-root package.json
    # "workspaces" field (which globs apps/* for npm). So docs-web stays isolated
    # from qw-oracle's `npm --no-workspaces` backend and from slipgate. infiniti's
    # component package drops into packages/ as a `workspace:*` dependency later
    # (roadmap); the glob is here now so that drop-in is config-only.
    packages:
      - "packages/*"
    ```
  - [ ] Write `apps/docs-web/.gitignore` with this exact content:
    ```gitignore
    node_modules/
    .vitepress/cache/
    .vitepress/dist/
    *.log
    ```
    Note: this MUST NOT ignore `data/` -- Phase 1 committed the 20 JSON files there and they are this phase's input.
- **Verification:** `test -f apps/docs-web/package.json && test -f apps/docs-web/pnpm-workspace.yaml && test -f apps/docs-web/.gitignore` -> all exist. `git check-ignore apps/docs-web/data/ezquake-cvar.json` -> prints nothing (data/ is NOT ignored). YES/NO: all three files exist and data/ is not ignored.
- **Execution mode:** `inline` -- three files, full content shipped above, pure text with no code synthesis or multi-file judgment.

### Task 2 -- VitePress + Tailwind v4 + daisyUI integration (the gotcha)

- **Goal:** Get VitePress, the Tailwind v4 Vite plugin, and daisyUI to cooperate so the dev server boots and daisyUI tokens render WITHOUT Tailwind's Preflight reset breaking VitePress's default-theme chrome. This is the known-gotcha integration; the file contents below are the starting point, and resolving the boot is this task's judgment work.
- **Files:** `apps/docs-web/.vitepress/config.ts`, `apps/docs-web/.vitepress/theme/index.ts`, `apps/docs-web/.vitepress/theme/style.css`.
- **Steps:**
  - [ ] Write `apps/docs-web/.vitepress/config.ts`:
    ```ts
    import { defineConfig } from 'vitepress'
    import tailwindcss from '@tailwindcss/vite'

    // VitePress owns its own Vite config; we inject the Tailwind v4 Vite plugin
    // through the `vite` option (Tailwind v4 is a Vite plugin + CSS-first config,
    // no tailwind.config.js). data/ and lib/ are excluded from page scanning so
    // the JSON snapshots and the plain-TS modules are not treated as content.
    export default defineConfig({
      title: 'docs.quake.world',
      description: 'Layer 1 reference for the QuakeWorld ecosystem -- every tunable knob, per codebase.',
      srcExclude: ['data/**', 'lib/**', '**/node_modules/**', 'README.md'],
      themeConfig: {
        nav: [
          { text: 'ezQuake', link: '/ezquake' },
          { text: 'KTX', link: '/ktx' },
          { text: 'MVDSV', link: '/mvdsv' },
          { text: 'QTV', link: '/qtv' },
          { text: 'QWCL', link: '/qwcl' },
          { text: 'QWFWD', link: '/qwfwd' }
        ],
        search: { provider: 'local' }
      },
      vite: {
        plugins: [tailwindcss()]
      }
    })
    ```
  - [ ] Write `apps/docs-web/.vitepress/theme/index.ts`:
    ```ts
    import DefaultTheme from 'vitepress/theme'
    import CodebaseGrid from './components/CodebaseGrid.vue'
    import './style.css'

    // Extend the default theme (keeps VitePress nav / sidebar / local-search
    // batteries -- D9) and layer Tailwind + daisyUI on top via style.css. Register
    // the landing proof component globally so index.md can mount it. If preflight
    // reconciliation forces a custom Layout instead of `extends`, switch here.
    export default {
      extends: DefaultTheme,
      enhanceApp({ app }) {
        app.component('CodebaseGrid', CodebaseGrid)
      }
    }
    ```
  - [ ] Write `apps/docs-web/.vitepress/theme/style.css` with the daisyUI theme tokens lifted from vikpe's slipgate web theme. Start with the simple form below. The token VALUES (the `--color-*` / `--radius-*` / `--size-*` / `--border` / `--depth` / `--noise` block) are LOCKED -- lifted verbatim from `research/repos/slipgate/web/apps/website/src/styles/main.css`, with one normalization: vikpe's source names the theme `quakeworldz` in the theme block but selects `quakeworld` in the plugin block (a mismatch); we use a single consistent name `quakeworld`. The daisyUI `include:` list (curated component set) is also lifted -- it covers what the docs UI needs (collapse for inline-expand cards in 2b, input for search, toggle for Flat/Grouped, badge for type words, menu/tab for nav). Do NOT lift `_quake.css` or vikpe's `@layer components` / `@apply` blocks -- those are slipgate-app component styling, not tokens (D10: tokens only, do not build a design system).
    ```css
    @import "tailwindcss";

    @plugin "daisyui" {
      themes: quakeworld --default;
      include:
        badge, breadcrumbs, button, collapse, divider, dropdown, indicator, input,
        join, label, loading, list, menu, progress, range, rootcolor, scrollbar,
        select, skeleton, swap, tab, toggle;
      logs: false;
    }

    @plugin "daisyui/theme" {
      name: "quakeworld";
      default: true;
      prefersdark: true;
      color-scheme: "dark";
      --color-base-100: var(--color-slate-950);
      --color-base-200: var(--color-slate-900);
      --color-base-300: var(--color-slate-800);
      --color-base-content: var(--color-slate-300);
      --color-primary: var(--color-blue-600);
      --color-primary-content: var(--color-blue-100);
      --color-secondary: var(--color-purple-600);
      --color-secondary-content: var(--color-purple-100);
      --color-accent: var(--color-pink-600);
      --color-accent-content: var(--color-pink-100);
      --color-neutral: var(--color-gray-800);
      --color-neutral-content: var(--color-gray-200);
      --color-info: var(--color-sky-500);
      --color-info-content: var(--color-white);
      --color-success: var(--color-green-500);
      --color-success-content: var(--color-green-950);
      --color-warning: var(--color-yellow-400);
      --color-warning-content: var(--color-yellow-950);
      --color-error: var(--color-red-600);
      --color-error-content: var(--color-red-100);
      --radius-selector: 0.5rem;
      --radius-field: 0.5rem;
      --radius-box: 0.5rem;
      --size-selector: 0.25rem;
      --size-field: 0.25rem;
      --border: 1.5px;
      --depth: 0;
      --noise: 0;
    }
    ```
  - [ ] Run `pnpm --dir apps/docs-web install`, then `pnpm --dir apps/docs-web run docs:dev`, open the dev URL, and confirm: the landing page renders, daisyUI-classed elements show the lifted palette (e.g. `bg-base-100` is near-black slate, `btn-primary` is blue-600), AND VitePress's own chrome (top nav, search box) is not visually broken.
  - [ ] **If Tailwind's Preflight reset clobbers VitePress's default-theme styles** (headings/links/spacing in VitePress chrome look stripped), reconcile by importing Tailwind's layers WITHOUT the full preflight base over VitePress content. The documented Tailwind v4 way to drop preflight is to replace `@import "tailwindcss";` with explicit layered sub-imports and omit the preflight layer:
    ```css
    @layer theme, base, components, utilities;
    @import "tailwindcss/theme.css" layer(theme);
    @import "tailwindcss/utilities.css" layer(utilities);
    /* preflight intentionally omitted: VitePress ships its own base reset and
       daisyUI components carry their own; importing Tailwind's full preflight
       fights VitePress's chrome. */
    ```
    Keep the two `@plugin "daisyui"` blocks unchanged below the imports. Re-run the dev server and re-confirm both conditions (tokens visible AND VitePress chrome intact). Pick whichever import form boots clean; record which in a one-line comment at the top of style.css.
- **Verification:** `pnpm --dir apps/docs-web run docs:dev` boots with no Vite/PostCSS error in the console. Visual: a daisyUI token is visibly applied on the landing page AND the VitePress top nav + search box render normally. YES/NO.
- **Execution mode:** `subagent (Sonnet MAX)` -- VitePress + Tailwind v4 + daisyUI integration has documented setup gotchas (the preflight-vs-VitePress-chrome collision is the live one); resolving "boots clean with tokens applied and chrome intact" is judgment-dense and cannot be guaranteed byte-final on paper. Per drafter-prompt execution guidance. The token VALUES are fixed; the subagent owns only the import-strategy reconciliation.

### Task 3 -- the plain-TS data layer (types + loader)

- **Goal:** Create the framework-agnostic data layer (D15): the verified snapshot type contract and a loader that reads any Phase-1 JSON file and lists what is available. No Vue, no VitePress import -- this layer ports to infiniti's Solid platform untouched.
- **Files:** `apps/docs-web/lib/types.ts`, `apps/docs-web/lib/snapshot.ts`.
- **Steps:**
  - [ ] Write `apps/docs-web/lib/types.ts`:
    ```ts
    // The docs-snapshot data contract -- the shape build-snapshot (Phase 1) emits
    // into apps/docs-web/data/<codebase>-<type>.json. VERIFIED against the live
    // Phase-1 output across all 20 files / 5016 records (2026-06-10), NOT copied
    // from the spec: the spec's D13 record list is stale (it lists a friendly_type
    // field that is NOT emitted -- friendly_type is derived in the frontend in
    // Phase 2b, D13/D18 -- and omits scope/macro_type/arguments, which ARE
    // emitted). Fields are OMITTED, not null-filled, when the underlying L1 data is
    // absent (D11/D13) -- hence the optionals. Framework-agnostic (D15): no
    // Vue/VitePress import.

    export interface SnapshotMeta {
      schema_version: string   // always "docs-snapshot-v1" (verified, all 20 files)
      generated_at: string     // ISO-8601 timestamp
      codebase: string         // ezquake | ktx | mvdsv | qtv | qwcl | qwfwd
      type: string             // cvar | command | macro | cmdline_param | info_key
      snapshot_version: string // per-codebase frozen version (D16): ezquake/ktx/mvdsv = head; qtv = 1.16-dev; qwfwd = 1.40-dev; qwcl = 2.33
      upstream_commit: string  // git SHA for ezquake/ktx/mvdsv/qwcl; a version STRING for qtv/qwfwd (F6) -- consumers must not assume a 40-char SHA
    }

    // A value-by-value entry on an enum/boolean cvar (ezquake cvar only).
    export interface EntityValue {
      name: string
      description?: string
    }

    // One step in an ezquake cvar's default-value history (version-walk, D8).
    export interface DefaultHistoryEntry {
      version: string
      value: string
    }

    export interface SourceRef {
      file: string
      line: number
    }

    export interface EntityRecord {
      // present on EVERY record (5016/5016, verified):
      name: string
      first_seen: string
      last_seen: string
      source_ref: SourceRef

      // present where the L1 data exists; OMITTED otherwise (D11/D13). The
      // annotation after each field is the verified data home, not a guess:
      category?: string                       // ezquake cvar/command: a group id matched against Snapshot.groups[].id (numeric string for cvars e.g. "43"; slug for commands e.g. "action"); every other codebase: a human label string (D17)
      description?: string                    // 4062/5016 records
      default?: string                        // 3272/5016; absent on commands; some KTX cvars are mode-set
      raw_type?: string                       // ezquake cvar + qwcl cvar ONLY (boolean/integer/float/string/enum); the basis for the friendly type word (D18, derived in 2b)
      values?: EntityValue[]                  // ezquake cvar ONLY (its enum/boolean cvars); QWCL has none
      remarks?: string                        // ezquake cmdline_param/command/cvar ONLY (caveats/status)
      scope?: string                          // info_key ONLY (ktx/mvdsv/qwfwd) -- e.g. "userinfo"
      default_history?: DefaultHistoryEntry[] // ezquake cvar ONLY (version-walk, D8)
      macro_type?: string                     // ezquake macro ONLY -- e.g. "integer"
      arguments?: string                      // ezquake cmdline_param ONLY -- e.g. "<path>"
    }

    // ezquake-cvar.json + ezquake-command.json ONLY. Maps a category id
    // (EntityRecord.category) to a label; resolution matches EntityRecord.category
    // against CategoryGroup.id. Two shapes, both verified against the live JSON:
    // cvar groups carry a two-level taxonomy { id (numeric string e.g. "43"),
    // major-group, name }; command groups are FLAT { id (slug e.g. "action"),
    // name } with NO major-group (0/14). Hence major-group is optional. Absent
    // entirely for the other 5 codebases (their category is already a label
    // string), hence groups is optional on Snapshot. The hyphenated key matches
    // the emitted JSON verbatim.
    export interface CategoryGroup {
      id: string
      "major-group"?: string
      name: string
    }

    export interface Snapshot {
      _meta: SnapshotMeta
      entries: EntityRecord[]
      groups?: CategoryGroup[]
    }
    ```
  - [ ] Write `apps/docs-web/lib/snapshot.ts`:
    ```ts
    import { readFileSync, readdirSync } from 'node:fs'
    import { fileURLToPath } from 'node:url'
    import { dirname, join } from 'node:path'
    import type { Snapshot } from './types'

    // apps/docs-web/data, resolved relative to this module so it works regardless
    // of the process cwd (VitePress data loaders + .paths loaders run in Node at
    // build time).
    const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
    const SCHEMA_VERSION = 'docs-snapshot-v1'

    export interface SnapshotRef {
      codebase: string
      type: string
    }

    // Lists the (codebase, type) pairs available on disk by parsing the data-dir
    // filenames (<codebase>-<type>.json). Data-driven: adding a codebase or type
    // is a Phase-1 emit + a new file, never a code change here (D14 spirit). The
    // split is on the FIRST hyphen only -- codebase names carry no hyphen, and
    // types use underscores (cmdline_param, info_key), so this is unambiguous.
    export function listSnapshots(): SnapshotRef[] {
      return readdirSync(DATA_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          const stem = f.slice(0, -'.json'.length)
          const dash = stem.indexOf('-')
          return { codebase: stem.slice(0, dash), type: stem.slice(dash + 1) }
        })
    }

    // Reads + parses one Phase-1 snapshot file. Validates only the invariants
    // (schema_version + the always-present record fields are not asserted here to
    // keep the loader cheap; the shape contract is in types.ts) and passes every
    // field through untouched -- so a field a future Phase-1 emit adds never trips
    // the loader (D11/D13 forward-compat). Pure data work, no Vue import (D15).
    export function loadSnapshot(codebase: string, type: string): Snapshot {
      const path = join(DATA_DIR, `${codebase}-${type}.json`)
      const snapshot = JSON.parse(readFileSync(path, 'utf8')) as Snapshot
      if (snapshot._meta?.schema_version !== SCHEMA_VERSION) {
        throw new Error(
          `${codebase}-${type}.json: expected schema_version ${SCHEMA_VERSION}, got ${snapshot._meta?.schema_version}`
        )
      }
      return snapshot
    }
    ```
  - [ ] Run `pnpm --dir apps/docs-web exec tsc --noEmit lib/types.ts lib/snapshot.ts` (or a quick `node --experimental-strip-types`-equivalent smoke) to confirm the modules type-check. Then a one-line smoke read: a throwaway `node` snippet that imports `loadSnapshot` and prints `loadSnapshot('qtv','cvar').entries.length` -> expect 40.
- **Verification:** types.ts + snapshot.ts type-check with no error; the smoke read prints `40` for `qtv cvar` (or any known count from the data appendix). YES/NO.
- **Execution mode:** `subagent (Sonnet medium)` -- 2 files, clear spec, full content shipped above, but it is code that must compile and actually read a file at a resolved path; a code-capable sub-agent runs `tsc` + the smoke read to confirm before handing off. (Template: "mechanical implementation needing reasoning -- one data module" -> Sonnet medium.)

### Task 4 -- data-loader adapter + landing proof component

- **Goal:** Prove the data path end-to-end and the daisyUI tokens visibly, while honoring D15: a VitePress build-time loader (the only VitePress-coupled glue) shapes render-ready data from the plain-TS layer, and a dumb Vue component renders it with daisyUI classes and ZERO derivation in `<script>`.
- **Files:** `apps/docs-web/.vitepress/theme/codebases.data.ts`, `apps/docs-web/.vitepress/theme/components/CodebaseGrid.vue`, `apps/docs-web/index.md`.
- **Steps:**
  - [ ] Write `apps/docs-web/.vitepress/theme/codebases.data.ts`:
    ```ts
    import { defineLoader } from 'vitepress'
    import { listSnapshots, loadSnapshot } from '../../lib/snapshot'

    // VitePress build-time data loader: the ONLY VitePress-coupled data glue
    // (D15). It does ALL the shaping (group by codebase, count entries, capture
    // the snapshot version) so the consuming component does zero derivation. A
    // later Solid port replaces THIS file with a Solid-side loader; lib/ and the
    // component's render logic are untouched.
    export interface CodebaseTypeSummary {
      type: string
      count: number
      snapshot_version: string
    }
    export interface CodebaseSummary {
      codebase: string
      types: CodebaseTypeSummary[]
    }

    declare const data: CodebaseSummary[]
    export { data }

    export default defineLoader({
      watch: ['../../data/*.json'],
      load(): CodebaseSummary[] {
        const byCodebase = new Map<string, CodebaseTypeSummary[]>()
        for (const { codebase, type } of listSnapshots()) {
          const snap = loadSnapshot(codebase, type)
          const list = byCodebase.get(codebase) ?? []
          list.push({
            type,
            count: snap.entries.length,
            snapshot_version: snap._meta.snapshot_version
          })
          byCodebase.set(codebase, list)
        }
        return [...byCodebase.entries()]
          .map(([codebase, types]) => ({
            codebase,
            types: types.sort((a, b) => a.type.localeCompare(b.type))
          }))
          .sort((a, b) => a.codebase.localeCompare(b.codebase))
      }
    })
    ```
  - [ ] Write `apps/docs-web/.vitepress/theme/components/CodebaseGrid.vue`:
    ```vue
    <script setup lang="ts">
    // Dumb render component (D15): it imports the build-time `data` constant and
    // v-for's over it. No fetch, no fs, no .filter()/.map() derivation here -- the
    // loader (codebases.data.ts) already shaped the data. daisyUI classes only.
    import { data as codebases } from '../codebases.data'
    </script>

    <template>
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div v-for="cb in codebases" :key="cb.codebase" class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-base-content">
              <a :href="`/${cb.codebase}`">{{ cb.codebase }}</a>
            </h2>
            <div class="flex flex-wrap gap-2">
              <a
                v-for="t in cb.types"
                :key="t.type"
                :href="`/${cb.codebase}/${t.type}`"
                class="badge badge-primary"
              >{{ t.type }} ({{ t.count }})</a>
            </div>
          </div>
        </div>
      </div>
    </template>
    ```
  - [ ] Write `apps/docs-web/index.md`:
    ```md
    ---
    title: docs.quake.world
    ---

    # docs.quake.world

    The Layer 1 reference for the QuakeWorld ecosystem -- every tunable knob
    (cvars, commands, macros, cmdline params, info keys) projected per codebase
    from the QW Oracle. Pick a codebase to browse.

    <CodebaseGrid />
    ```
  - [ ] Run `pnpm --dir apps/docs-web run docs:dev`, open the landing page, and confirm the 6 codebase cards render with per-type badges showing live counts (e.g. ezQuake shows cvar (2743), command (624), macro (66), cmdline_param (65); qtv shows cvar (40), command (12)).
- **Verification:** the landing page shows all 6 codebases as daisyUI cards; each card lists its types with counts that match the data appendix (ezQuake cvar = 2743, qtv cvar = 40). `grep -nE "fetch\\(|readFileSync|\\.filter\\(|\\.map\\(" apps/docs-web/.vitepress/theme/components/CodebaseGrid.vue` -> prints nothing (no logic in the component, D15). YES/NO.
- **Execution mode:** `subagent (Sonnet medium)` -- 3 files, full content shipped, but Vue SFC + VitePress data-loader wiring is code that must render correctly and respect the D15 split; a code-capable sub-agent confirms the page renders and the decoupling grep is clean.

### Task 5 -- dynamic routing skeleton (stubs)

- **Goal:** Generate one stub page per codebase and one per (codebase, type) pair from the data dir, proving VitePress dynamic routing works on a data-driven path set. Stubs only -- the browse view and per-entity anchors (D22) are Phase 2b.
- **Files:** `apps/docs-web/[codebase].md`, `apps/docs-web/[codebase].paths.ts`, `apps/docs-web/[codebase]/[type].md`, `apps/docs-web/[codebase]/[type].paths.ts`.
- **Steps:**
  - [ ] Write `apps/docs-web/[codebase].paths.ts`:
    ```ts
    import { listSnapshots } from './lib/snapshot'

    // One page per distinct codebase, enumerated from the data dir (data-driven --
    // a 7th codebase like FTE later is a Phase-1 emit, no change here; D2/D14).
    export default {
      paths() {
        const codebases = [...new Set(listSnapshots().map((s) => s.codebase))]
        return codebases.sort().map((codebase) => ({ params: { codebase } }))
      }
    }
    ```
  - [ ] Write `apps/docs-web/[codebase].md` (stub; body is Phase 2b):
    ```md
    # {{ $params.codebase }}

    Per-type reference for `{{ $params.codebase }}`. Browse views land in Phase 2b.
    ```
  - [ ] Write `apps/docs-web/[codebase]/[type].paths.ts`:
    ```ts
    import { listSnapshots } from '../lib/snapshot'

    // One page per (codebase, type) pair on disk -- the 20 Phase-1 files. This is
    // the route the Phase 2b browse view fills; the stable per-entity anchors
    // (D22) hang off this route as `#<case-folded-name>` in 2b, so the route
    // scheme is chosen now to be D22-compatible (clean /<codebase>/<type> URL).
    export default {
      paths() {
        return listSnapshots().map(({ codebase, type }) => ({
          params: { codebase, type }
        }))
      }
    }
    ```
  - [ ] Write `apps/docs-web/[codebase]/[type].md` (stub; browse view is Phase 2b):
    ```md
    # {{ $params.codebase }} / {{ $params.type }}

    Browse view for `{{ $params.codebase }}` `{{ $params.type }}` entities --
    filterable list, category Flat/Grouped toggle, inline-expand cards. Phase 2b.
    ```
  - [ ] Run `pnpm --dir apps/docs-web run docs:build`. Confirm it exits 0 and generates the per-codebase and per-type routes. Then `pnpm --dir apps/docs-web run docs:preview` and navigate to `/ezquake` and `/ezquake/cvar` to confirm both stub levels resolve.
  - [ ] **If VitePress rejects the two-bracket-segment nested route** (`[codebase]/[type].md`): fall back to a single-segment flat route `reference/[entry].md` + `reference/[entry].paths.ts`, where `entry` is the data filename stem (`ezquake-cvar`) returned by `listSnapshots()` joined as `${codebase}-${type}`. The data files are already named that way, so the mapping is 1:1. Prefer the clean nested URL; use the flat form only if nested does not build. Record which form shipped in a comment in the `.paths.ts`.
- **Verification:** `pnpm --dir apps/docs-web run docs:build` exits 0. The build output contains a page for each codebase and each (codebase, type) pair (20 type pages + 6 codebase pages). Navigating to `/ezquake` and `/ezquake/cvar` in preview renders the stub headings. YES/NO.
- **Execution mode:** `subagent (Sonnet medium)` -- 4 files, full content shipped, but the `.paths.ts` loaders are build-time code and the nested-dynamic-route form needs a live build to confirm (with a flat fallback specified); a code-capable sub-agent runs the build + verifies routes resolve.

## Verification (phase boundary)

Copy-paste checks the operator (or orchestrator) runs at phase end:

1. `pnpm --dir apps/docs-web install` exits 0 and creates `apps/docs-web/pnpm-lock.yaml` + `apps/docs-web/node_modules/`.
   PASS condition: exit 0, lockfile written. FAIL condition: install resolves against a parent workspace (missing `apps/docs-web/pnpm-workspace.yaml`) or errors.
2. `pnpm --dir apps/docs-web run docs:dev` boots with no Vite/PostCSS error; the landing page renders with daisyUI tokens visibly applied (slate `base` background, blue `primary`) AND VitePress's top nav + local-search box render normally.
   PASS condition: both true on visual inspection. FAIL condition: blank/unstyled page, console error, or stripped VitePress chrome (-> Recovery, preflight).
3. The landing page shows all 6 codebases as daisyUI cards, each listing its types with live counts matching the data appendix (ezQuake cvar = 2743; qtv cvar = 40).
   PASS condition: counts match. FAIL condition: empty grid or wrong counts (-> Recovery, loader path).
4. `pnpm --dir apps/docs-web run docs:build` exits 0 and generates a page for each codebase (`/ezquake` ... `/qwfwd`) and each (codebase, type) pair (20). `pnpm --dir apps/docs-web run docs:preview` then serves `/ezquake` and `/ezquake/cvar` as stub pages.
   PASS condition: build exits 0, both routes resolve. FAIL condition: build error on dynamic routes (-> Recovery, paths loader / nested-route fallback).
5. D15 decoupling holds: `grep -rnE "fetch\\(|readFileSync|readdirSync|\\.filter\\(|\\.map\\(|\\.reduce\\(" apps/docs-web/.vitepress/theme/components/` prints nothing (no data-fetch or derivation inside any component). Data work lives only in `lib/` and `codebases.data.ts`.
   PASS condition: grep empty. FAIL condition: any match (-> move the logic into lib/ or the loader).
6. D20 isolation holds: `git status --short` shows ONLY new files under `apps/docs-web/`; nothing under `apps/qw-oracle/`, `apps/slipgate-app/`, or the monorepo-root `package.json` changed. `apps/docs-web/data/*.json` is byte-unchanged (this phase reads, never writes, the Phase-1 output).
   PASS condition: diff confined to `apps/docs-web/` (new files only) + the data files untouched. FAIL condition: any file outside `apps/docs-web/` modified.

PASS on all six -> proceed to Phase 2b. Any FAIL -> consult Recovery.

## Outputs to next phase

What is now true that was not before (mirrors Phase 2b's "Inputs"):

- `apps/docs-web` is an installable, bootable VitePress + Tailwind v4 + daisyUI site (its own pnpm workspace, D20). The daisyUI palette (vikpe's federation tokens) is wired and visibly applied.
- The data/logic split (D15) exists from day one: `lib/types.ts` (the verified snapshot contract, including the spec-omitted `scope`/`macro_type`/`arguments` fields and the corrected `default_history` `{version,value}` shape) and `lib/snapshot.ts` (`listSnapshots()` + `loadSnapshot()`), framework-agnostic and proven to read the Phase-1 JSON. The VitePress-coupled glue is isolated to `codebases.data.ts`.
- A data-driven dynamic-routing skeleton: `/<codebase>` and `/<codebase>/<type>` resolve as stub pages enumerated from the data dir, on a clean URL scheme chosen to be D22-anchor-compatible.
- Phase 2b adds, on top of this scaffold: the friendly-type derivation module (`lib/derive.ts`, D18), the ezQuake category-id->label resolver against `Snapshot.groups` (`lib/category.ts`, D17), the filter/search module (`lib/filter.ts`, D3), and the type-generic browse + inline-expand card components (D4/D14) with stable per-entity anchors (D22) -- proven end-to-end on ezQuake. The stub `[codebase]/[type].md` body is replaced with the real browse view.

## Open questions / deferred items

- **Question:** daisyUI theme name -- vikpe's source has a `quakeworld` (plugin) vs `quakeworldz` (theme block) mismatch.
  **Default chosen for now:** normalize to a single name `quakeworld`, `default: true` + `prefersdark: true`, dark color-scheme. Token values lifted verbatim.
  **Who can resolve:** operator (cosmetic; only matters if vikpe later expects a specific theme key for cross-site CSS sharing).
- **Question:** extend VitePress's default theme vs build a fully custom theme (no `extends`).
  **Default chosen for now:** extend `DefaultTheme` -- keeps the nav / sidebar / local-search batteries (D9) and matches "tokens only, do not build a design system" (D10); layer Tailwind + daisyUI for the custom browse components in 2b.
  **Who can resolve:** operator / Phase 2b (revisit only if the default theme actively fights the browse UI).
- **Question:** nested two-segment dynamic route `[codebase]/[type]` vs a flat single-segment `reference/[entry]`.
  **Default chosen for now:** nested clean URLs (`/ezquake/cvar`), with the flat form (`reference/ezquake-cvar`, 1:1 with the data filenames) as the Task-5 fallback if VitePress rejects the nested form.
  **Who can resolve:** Phase 2a execution (the routing sub-agent verifies which form builds).
- **Question:** where friendly_type + category resolution happen (export vs frontend module).
  **Default chosen for now:** frontend `lib/` modules in Phase 2b, per prerequisites.md and D13's implication (keeps the export a faithful L1 projection; keeps derivation in the swappable-frontend logic layer per D15). The Phase-1 JSON confirms this: it emits NO `friendly_type` and ezQuake's raw numeric `category` id (unresolved) -- both derived frontend-side.
  **Who can resolve:** already defaulted by prerequisites.md; restated here for the 2b drafter.
- **Question:** the monorepo-root `package.json` declares npm `workspaces: ["apps/*", "packages/*"]`, which globs `apps/docs-web` (F8).
  **Default chosen for now:** do NOT modify the root package.json. docs-web's own `pnpm-workspace.yaml` makes pnpm root there (pnpm ignores the npm `workspaces` field), and qw-oracle's existing `npm --no-workspaces` convention already prevents a root npm install from touching workspace members -- docs-web is no more exposed than qw-oracle already is. Belt-and-suspenders option available if the operator wants it: add `"!apps/docs-web"` to the root `workspaces` array.
  **Who can resolve:** operator.

No sub-agent verification finding contradicted `decisions.md` at drafting time. (If the Explore pass surfaces one, it is recorded here with a one-line rationale and the decision wins.)

## Recovery (if verification fails)

Per-failure-mode, anticipatable failures only:

- **`pnpm install` resolves against a parent workspace / errors about a missing root:** `apps/docs-web/pnpm-workspace.yaml` is missing or malformed, so pnpm walked up looking for a workspace root. Restore the Task-1 `pnpm-workspace.yaml` (it makes docs-web the root). pnpm does not read the monorepo-root npm `workspaces` field, so the only thing rooting docs-web is its own workspace file.
- **Landing page is blank / unstyled, or VitePress chrome looks stripped:** Tailwind's Preflight reset is fighting VitePress's default-theme base. Apply the Task-2 layered-import fix (import `tailwindcss/theme.css` + `tailwindcss/utilities.css`, omit preflight). If instead daisyUI classes have NO effect at all, the theme is not active: confirm `@plugin "daisyui"` loaded, the theme block has `default: true`, and `style.css` is imported in `.vitepress/theme/index.ts`.
- **Codebase grid is empty or counts are wrong:** the loader cannot find `data/` -- `DATA_DIR` resolves relative to `lib/snapshot.ts` via `import.meta.url`; confirm the file is at `apps/docs-web/lib/snapshot.ts` (so `../data` lands on `apps/docs-web/data`). If counts are wrong, the filename split is off -- confirm the split is on the FIRST hyphen (types carry underscores, not hyphens).
- **`docs:build` errors on dynamic routes:** a `.paths.ts` returned no params for a bracket segment, or the data-dir path is wrong from the loader's location. Confirm each bracketed segment has a matching param key in the returned `params`. If VitePress rejects the nested two-segment form, switch to the flat `reference/[entry]` fallback (Task 5).
- **schema_version mismatch thrown by `loadSnapshot`:** Phase 1 was re-run with a bumped schema and `lib/types.ts` / the `SCHEMA_VERSION` constant were not updated together. Re-verify the live JSON `_meta.schema_version` and update the constant + types in lockstep.

Unanticipated failures route to the operator.
