# Phase 2 -- scaffold + Hello Production

**Arc:** oracle-web-v1. **Ledger:** `decisions.md` P1-P11 (this phase executes
P3's fetch/fallback shell, P4's stack locks, P11's deploy target). **Spec:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` D6/D7 + 2026-08-06
amendments (one page / two floors / scroll-snap). **Comp:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (shell CSS ported
from its lines 5-17, 166-192; full visual parity is Phases 3-4's job, not this
one's). **Deploy precedent:** `apps/docs-web/DEPLOYMENT.md` (CF Pages,
2026-06-11, proven end-to-end).

## Goal

Stand up `apps/oracle-web` as its own pnpm-workspace subtree (SolidJS + Vite,
Tailwind v4 + daisyUI theme tokens ported from the mockup palette), wire the
site's single data path -- one manifest-fetch module that fetches Phase 1's
live URL at pageload, validates the shape, and falls back to a baked build-time
copy of the committed manifest (P3) -- and render a minimal two-floor page
skeleton (`#brain` / `#machine-room` sections, gentle scroll-snap, one
continuous gradient) showing REAL manifest numbers. Deploy it to Cloudflare
Pages on the operator's personal account via the docs-web wrangler procedure.
The phase ends with a public `https://qw-oracle-web.pages.dev/` URL serving the
skeleton with live numbers, a proven degradation path (force-fallback flag +
offline check both render baked numbers, never an error), and a repeatable
one-command redeploy pipeline documented in `apps/oracle-web/DEPLOYMENT.md` --
the runnable state every later phase verifies against (P11).

## Local decisions (this phase's calls, within the ledger)

### Baked-copy mechanism: bake script at build time, generated file inside `src/`

The P3 fallback copy enters the bundle via a tiny copy script
(`scripts/bake-manifest.mjs`) chained into `dev`/`build`, which copies the
committed Phase-1 manifest (`apps/qw-oracle/snapshots/brain-manifest.json`,
Phase 1's "baked-fallback source path" output) to
`src/data/baked-manifest.json` (gitignored, generated) after asserting
`schema_version === 'brain-manifest-v1'`. Rejected: a direct cross-subtree
relative import from `src/` into `apps/qw-oracle/` -- it works at build but
trips Vite's dev-server `server.fs.allow` boundary (oracle-web is its own
workspace root, so the default allow-list stops at `apps/oracle-web`), and
patching `fs.allow` couples the dev server to another subtree's layout. The
copy makes "baked at build time" literal: the fallback's staleness is exactly
the last build, which is P3's semantics. The shape assertion means building
against a pre-Phase-1 (old-shape) manifest fails loudly instead of baking a
contract-violating fallback.

### Type mirroring: hand-mirrored copy with provenance header (resolves Phase 1's `TBD-PHASE-2-type-mirroring`)

`src/data/manifest-types.ts` carries a hand-mirrored copy of the
`BrainManifest` / `Datacenter` / `Door` / `HistoryEntry` interfaces exported by
`apps/qw-oracle/scripts/build-brain-manifest.ts`, under a header comment naming
that file as source-of-truth and the contract id `brain-manifest-v1`. Rejected:
importing the types cross-subtree (qw-oracle is an `npm --no-workspaces` world;
oracle-web is a pnpm subtree -- a TS project-reference across them couples two
deliberately separate toolchains). Drift guard: the contract is frozen (P2), a
breaking change bumps `schema_version`, and the runtime validator pins the
literal `'brain-manifest-v1'` -- a mismatched manifest falls back to baked
rather than rendering wrong. The mirror-sync rule (Phase 1 amendment => re-copy
here) is recorded in the header comment.

### Scaffold authored by hand, not `pnpm create vite`

The app is ~12 small files; `create-vite`'s solid-ts template generates
boilerplate (logo assets, counter demo) that would all be deleted, and its
generated shape drifts with template releases -- unverifiable at planning time.
Hand-authoring from the snippets below is deterministic and matches how
docs-web's config was built. Dependency versions below were read from the npm
registry on 2026-08-06; final resolution happens at `pnpm install` (lockfile
committed) with the compatibility probe in Task 2.

### Dumb-component seam starts now (P4)

`loadManifest()` in `src/data/manifest.ts` is the site's ONLY network call
(P3/P5) and the only stateful data code. `App.tsx` calls it once (Solid
`createResource`) and passes the result down as props. The two floor
components, and everything Phases 3-4 add inside `src/components/` and
`src/generators/`, receive manifest data via props and never fetch. Deviation
from this seam = P4 amendment, not an implementer choice.

## Inputs from previous phase

From Phase 1's "Outputs to next phase" (each line verifiable at phase start;
run the literals before Task 1):

- **The contract**: field shapes per Phase 1's normative section + the exported
  `BrainManifest` interface. Verify:
  `grep -n "export interface BrainManifest" /home/dev/projects/quakeworld/apps/qw-oracle/scripts/build-brain-manifest.ts`
  -> one hit. (At drafting time 2026-08-06 the file still carries the OLD
  shape -- Phase 1 has not executed; this input gates Task 3.)
- **The live URL**:
  `curl -sI https://oracle.slipgate.me/snapshots/brain-manifest.json | grep -iE "HTTP|access-control-allow-origin|cache-control"`
  -> 200, `access-control-allow-origin: *`, `cache-control: public, max-age=300`.
  (Drafting-time state: 404, headers absent -- expected pre-Phase-1.)
- **The baked-fallback source**: committed repo copy at
  `/home/dev/projects/quakeworld/apps/qw-oracle/snapshots/brain-manifest.json`
  with `jq -r .schema_version` -> `brain-manifest-v1`. (Drafting-time state:
  old shape, `schema_version: 1` -- the bake script's assert is the guard.)
- **Refresh mechanics**: republish is Phase 1's runbook rider; nothing in this
  phase redeploys for data (P3).

Drafting-time environment facts (probed 2026-08-06 on this box):

- **Node `v22.12.0`** (mise), **bun 1.3.11**, **corepack 0.29.4**. `pnpm` is
  NOT on PATH. `corepack pnpm` is BROKEN on this box: corepack-managed pnpm
  fails at launch, and the error string varies with corepack's cached state
  (drafting-time probe: stale-signature-keys "Cannot find matching keyid";
  checker re-probe same day: `TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING]`
  after lastKnownGood moved to pnpm@11). `COREPACK_INTEGRITY_KEYS=0` did not
  rescue it. Working path verified: `npx -y pnpm@10 --version` -> `10.34.5`.
  Task 1 fixes this properly.
- **wrangler**: not on PATH, not in `apps/docs-web/node_modules` (docs-web
  deployed via ephemeral `npx -y wrangler@3`). Both `npx -y wrangler@3
  --version` -> `3.114.17` and `npx -y wrangler@4 --version` -> `4.119.0` run
  on Node 22.12.0. The docs-web "wrangler@4 needs Node >= 22" gotcha no longer
  bites (that env ran Node 20; this one runs 22.12.0).
- **CF auth: ABSENT.** `env | grep -i cloudflare` -> empty; no `~/.wrangler`,
  no `~/.config/.wrangler`, no `~/.config/wrangler`; no cloudflare entry in
  `~/.secrets/`. docs-web's DEPLOYMENT.md line "(Already present in the
  operator's env.)" described the pre-cockpit WSL box, not this one. **A
  deploy cannot run from this box today** -- Task 5 stalls at its auth gate
  until the operator hands over a token (the README prerequisite).
- **Registry versions + peer compat** (read 2026-08-06 from
  registry.npmjs.org): solid-js 1.9.14; vite 8.2.1; vite-plugin-solid 2.11.14
  (peer `vite ^3..^9`, `solid-js ^1.7.2`); @tailwindcss/vite 4.3.3 (peer
  `vite ^5.2 || ^6 || ^7 || ^8`); tailwindcss 4.3.3; daisyui 5.7.16. The
  pinned set below is mutually compatible per declared peers; actual install
  is the probe.
- **Root `.gitignore` already covers the subtree**: `git check-ignore` confirms
  `apps/oracle-web/node_modules/` and `apps/oracle-web/dist/` are ignored by
  the root patterns; the subtree's own `.gitignore` only needs the generated
  baked copy + wrangler cache.
- **`apps/oracle-web` does not exist** (verified -- created at run time, Task 2).
- **docs-web's Tailwind/daisyUI wiring read live** (theme/token approach ported
  in Task 2; its VitePress-specific parts -- unlayered `.input` fix, `menu`
  exclusion -- deliberately NOT ported, they fix VitePress collisions
  oracle-web doesn't have).

## Files touched

**Created (all inside `apps/oracle-web/` unless noted):**
- `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml` (generated at
  install, committed), `.gitignore`, `tsconfig.json`, `vite.config.ts`,
  `index.html`, `DEPLOYMENT.md`
- **`CLAUDE.md`** -- the app's Layer 1 entry doc (see Task 2 step 0)
- `scripts/bake-manifest.mjs`
- `src/index.tsx`, `src/App.tsx`, `src/styles/app.css`
- `src/data/manifest-types.ts`, `src/data/manifest.ts`,
  `src/data/baked-manifest.json` (generated, gitignored)
- `src/components/Floor1Brain.tsx`, `src/components/Floor2MachineRoom.tsx`
- `~/.secrets/cloudflare-pages.env` (operator-provided token; NOT in git --
  Task 5)

**Modified:** none outside the new subtree. **Deleted:** none.

The app-skeleton contract (dirs Phases 3-6 build inside -- binding, like
Phase 1's field shapes). The `TBD-PHASE-*` tokens in this diagram are DOC-ONLY
annotations -- never copy them into source files (they would trip Phase 5's
zero-"portrait" input probe and Phase 6's src-tree TBD grep):

    apps/oracle-web/
    ├── pnpm-workspace.yaml          # own subtree root (docs-web D20 pattern); packages/* glob = infiniti drop-in slot
    ├── package.json                 # scripts: dev / build / preview / check / deploy
    ├── vite.config.ts               # solid + tailwindcss plugins, nothing else
    ├── index.html                   # #root mount
    ├── DEPLOYMENT.md                # CF Pages procedure (docs-web shape)
    ├── scripts/bake-manifest.mjs    # build-time fallback bake (P3)
    └── src/
        ├── index.tsx                # mount only
        ├── App.tsx                  # page shell: two floors + the ONE loadManifest() call site
        ├── styles/app.css           # tailwind import + daisyUI "oracle" theme tokens + floor/scroll-snap shell
        ├── data/
        │   ├── manifest-types.ts    # mirrored brain-manifest-v1 contract types (Phase 1 source-of-truth header)
        │   ├── manifest.ts          # loadManifest(): fetch -> validate -> baked fallback; THE only network call (P3/P5)
        │   └── baked-manifest.json  # generated by bake script; gitignored
        ├── components/              # dumb presentation components ONLY (props in, render out -- P4)
        │   ├── Floor1Brain.tsx      # Phase-2 placeholder; Phase 3 replaces content (TBD-PHASE-3-brain-port)
        │   └── Floor2MachineRoom.tsx# Phase-2 placeholder; Phase 4 replaces content (TBD-PHASE-4-machine-room-port)
        └── generators/              # RESERVED: Phase 3 creates it for pure mesh/journey/roots functions
                                     # (manifest data + seed in, geometry out -- P4); empty until then

## Tasks

### Task 1 -- pnpm toolchain bring-up · `inline`

**WRITE-GRANT:** writes only to the mise Node prefix
(`~/.local/share/mise/installs/node/22.12.0/`) via `npm install -g`. No repo,
no appdata writes.

**Goal:** a working `pnpm` on PATH; never `corepack pnpm` (broken on this box,
see environment facts).

**Steps:**

    npm install -g pnpm@10
    pnpm --version

**Verification probe:** `pnpm --version` prints `10.x`. Fallback if the global
install misbehaves: prefix every later `pnpm` literal with `npx -y pnpm@10`
(verified working 2026-08-06).

### Task 2 -- subtree scaffold + hello build · `agent (workhorse, medium)`

**Goal:** `apps/oracle-web` exists as its own pnpm subtree; `pnpm build`
produces a `dist/` that renders a placeholder page with the theme CSS applied.

**Step 0 -- monorepo doc-doctrine registration (do this FIRST, not at ship).**
A new app under `apps/` is born into the monorepo's doc graph, not bolted on
later. Two edits, both tiny, both required:

1. Create `apps/oracle-web/CLAUDE.md` -- the app's Layer 1 entry doc:
   `**Status:** Active development`, one-paragraph what-this-is, a
   `## Documentation index` table (rows for `DEPLOYMENT.md` and, as they
   land, any Layer 2 docs), the stack locks (SolidJS + Vite + Tailwind v4 +
   daisyUI, own pnpm subtree), the deploy target, and a pointer to this arc's
   plan dir + the design spec + the mockup-of-record.
2. Add the matching row to the ROOT `CLAUDE.md` `## Subsystem scopes` table:
   `| apps/oracle-web/ | apps/oracle-web/CLAUDE.md | oracle.quake.world v1 --
   the read-only brain surface (SolidJS, CF Pages) |`.

**Why this is a task step and not a ship-pass afterthought:** `apps/docs-web`
shipped without either, and the gap is still an open doc-hygiene followup in
HANDOVER months later -- the sibling app made exactly this mistake. The
monorepo's own birth-check doctrine says classification happens at creation.
(Surfaced by the 2026-08-06 wrap-up sweep: neither file appeared anywhere in
the six phase docs -- three checkers, a coherence pass, and three cold
reviewers all missed it, because every one of them reviewed the plan against
the spec and the comp, and none against monorepo doc doctrine. `OVERVIEW.md`
gets its row in Phase 6, when there is a shipped thing to describe.)

**Files:** `apps/oracle-web/CLAUDE.md`, root `CLAUDE.md` (subsystem row),
`pnpm-workspace.yaml`, `package.json`, `.gitignore`,
`tsconfig.json`, `vite.config.ts`, `index.html`, `src/index.tsx`,
`src/App.tsx` (static placeholder at this task), `src/styles/app.css`.

**Steps:**

1. `pnpm-workspace.yaml` -- mirror docs-web's file (its comment explains the
   isolation mechanics; adapt the comment, keep the glob):

       # oracle-web is its own pnpm workspace root (federation lock, P4 /
       # docs-web D20 precedent). pnpm reads ONLY this file -- the monorepo
       # root package.json "workspaces" npm glob is ignored. infiniti's
       # component package drops into packages/ as workspace:* later.
       packages:
         - "packages/*"

2. `package.json` (versions = registry-verified 2026-08-06; `pnpm install`
   resolves and pins the lockfile; see compat probe):

       {
         "name": "oracle-web",
         "private": true,
         "type": "module",
         "scripts": {
           "dev": "node scripts/bake-manifest.mjs && vite",
           "build": "node scripts/bake-manifest.mjs && vite build",
           "preview": "vite preview",
           "check": "tsc --noEmit",
           "deploy": "node scripts/bake-manifest.mjs && vite build && npx -y wrangler@3 pages deploy dist --project-name qw-oracle-web --branch main --commit-dirty=true"
         },
         "dependencies": {
           "solid-js": "^1.9.14"
         },
         "devDependencies": {
           "@tailwindcss/vite": "^4.3.3",
           "daisyui": "^5.7.16",
           "tailwindcss": "^4.3.3",
           "typescript": "^5.7.0",
           "vite": "^8.2.1",
           "vite-plugin-solid": "^2.11.14"
         }
       }

   (Explicit `node scripts/... &&` chaining, not `prebuild` hooks -- pnpm's
   pre/post-script auto-run behavior varies by version; the chain is
   unambiguous. Task 3 creates the bake script; until then use
   `pnpm exec vite build` for the hello check.)

3. `.gitignore` (root already ignores `node_modules/` + `dist/`,
   check-ignore-verified):

       src/data/baked-manifest.json
       .wrangler/

4. `vite.config.ts`:

       import { defineConfig } from 'vite'
       import solid from 'vite-plugin-solid'
       import tailwindcss from '@tailwindcss/vite'

       export default defineConfig({
         plugins: [solid(), tailwindcss()],
       })

5. `tsconfig.json` (standard Solid-TS shape; the build is the verifier):

       {
         "compilerOptions": {
           "target": "ES2022",
           "module": "ESNext",
           "moduleResolution": "bundler",
           "strict": true,
           "jsx": "preserve",
           "jsxImportSource": "solid-js",
           "types": ["vite/client"],
           "noEmit": true,
           "isolatedModules": true,
           "resolveJsonModule": true,
           "skipLibCheck": true
         },
         "include": ["src"]
       }

6. `index.html`: minimal shell -- `<!doctype html>`, `<title>QW Oracle</title>`,
   viewport meta, `<link rel="icon" href="data:,">` (suppresses the browser's
   automatic `/favicon.ico` fetch so the P3/P5 single-network-call audit in
   boundary probe 4 stays noise-free; a real icon can land in Phase 6's ship
   pass), `<div id="root"></div>`,
   `<script type="module" src="/src/index.tsx"></script>`.

7. `src/styles/app.css` -- port docs-web's THEME approach (CSS-first Tailwind
   v4 + `@plugin "daisyui/theme"`), NOT its VitePress fixes. Theme name
   `oracle`; token values from the mockup palette (mockup lines 8-15, 28-57):

       @import "tailwindcss";

       @plugin "daisyui" {
         themes: oracle --default;
         logs: false;
       }
       /* No include-trim: docs-web's trimmed list fixed VitePress class
          collisions (F14) that do not exist here. Phase 3 may trim via a
          finding if bundle size warrants. */

       @plugin "daisyui/theme" {
         name: "oracle";
         default: true;
         prefersdark: true;
         color-scheme: "dark";
         --color-base-100: #041216;   /* page floor (mockup body bg) */
         --color-base-200: #0c192b;   /* panel/rack bg */
         --color-base-300: #16283f;   /* raised bg / mesh dot */
         --color-base-content: #dfe9f6;
         --color-primary: #6fe3ff;    /* cyan: links, questions-in */
         --color-primary-content: #041216;
         --color-secondary: #4aa8ff;  /* trace blue */
         --color-secondary-content: #041216;
         --color-accent: #52ffa8;     /* green: answers-out */
         --color-accent-content: #041216;
         --color-neutral: #2a4a74;    /* border blue */
         --color-neutral-content: #dfe9f6;
         --color-info: #6fe3ff;
         --color-info-content: #041216;
         --color-success: #52ffa8;
         --color-success-content: #041216;
         --color-warning: #ffd166;
         --color-warning-content: #041216;
         --color-error: #ff6b6b;
         --color-error-content: #041216;
         --radius-selector: 0.5rem;
         --radius-field: 0.5rem;
         --radius-box: 0.5rem;
         --border: 1px;
         --depth: 0;
         --noise: 0;
       }

   Then the two-floor shell -- the shell SUBSET of mockup lines 5-17 plus the
   166-168 touch/narrow guard and 188-192 reduced-motion guard (P7c). The
   cited range's `box-sizing` and `html,body` margin/padding resets are NOT
   re-declared: Tailwind v4 preflight already supplies them (confirmed in
   docs-web's compiled-CSS notes in its `style.css`); the range's type/link
   rules ARE ported explicitly below so Phases 3-4 layer content onto the
   same baseline as the comp:

       html { scroll-snap-type: y proximity; scroll-behavior: smooth; }
       body {
         color: #dfe9f6;
         font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
         background-color: #041216;
         background-image:
           radial-gradient(1000px 640px at 52% 22%, #16284699 0%, transparent 70%),
           linear-gradient(180deg, #0e1c33 0%, #0b1728 45%, #082030 62%, #06202b 78%, #041a20 100%);
         background-repeat: no-repeat; background-size: 100% 100%;
       }
       button { font: inherit; cursor: pointer; }
       a { color: #6fe3ff; }
       :focus-visible { outline: 2px solid #6fe3ff; outline-offset: 2px; }
       section.floor { min-height: 100svh; position: relative; overflow: hidden; scroll-snap-align: start; }
       .num { font-variant-numeric: tabular-nums; }

       @media (max-width: 900px), (pointer: coarse) {
         html { scroll-snap-type: none; scroll-behavior: auto; }
       }
       @media (prefers-reduced-motion: reduce) {
         html { scroll-behavior: auto; }
       }

8. `src/index.tsx`: `render(() => <App />, document.getElementById('root')!)`
   plus the `app.css` import. `src/App.tsx` at this task: static two-line
   placeholder (Task 4 replaces it).

9. `pnpm install` (inside `apps/oracle-web/` -- pnpm anchors on the subtree's
   own `pnpm-workspace.yaml`), then build.

**Verification probe (also the version-compat probe):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm install && pnpm exec vite build && ls dist/index.html && pnpm run check

Expect: install clean, build success, `dist/index.html` exists, `tsc` clean.
If pnpm 10 reports "Ignored build scripts: esbuild", the build still works via
esbuild's optional-dependency binaries; if `vite` errors on a missing esbuild
binary, run `pnpm approve-builds` and re-install. If the vite-8 set fails to
resolve or build: downgrade to `"vite": "^7.1.0"` (both plugins declare `^7`
peer support -- registry-verified) and record a finding.

### Task 3 -- the data shell: contract mirror + bake script + fetch/fallback module · `agent (workhorse, high)`

**Goal:** the site's ONE network path exists and is total: fetch live ->
validate -> fall back to baked; never throws, never renders an error state
(P3 -- "define errors out of existence").

**Files:** `src/data/manifest-types.ts`, `src/data/manifest.ts`,
`scripts/bake-manifest.mjs`.

**Steps:**

1. `manifest-types.ts`: mirror the exported interfaces from
   `apps/qw-oracle/scripts/build-brain-manifest.ts` (post-Phase-1 state) --
   `BrainManifest`, lit/dormant `Datacenter` union, `Door`, `HistoryEntry` --
   under a provenance header:

       // MIRROR of the brain-manifest-v1 contract. Source of truth:
       // apps/qw-oracle/scripts/build-brain-manifest.ts (Phase 1, decisions P2).
       // Never edit shapes here first: a contract change lands there as a dated
       // amendment, then re-mirrors here. schema_version pins compatibility.

2. `scripts/bake-manifest.mjs`:

       // Bakes the committed Phase-1 manifest into the bundle as the P3
       // build-time fallback. Shape-asserts so a pre-Phase-1 (old-shape) file
       // fails the build loudly instead of baking a contract violation.
       import { copyFileSync, readFileSync } from 'node:fs'
       const SRC = new URL('../../qw-oracle/snapshots/brain-manifest.json', import.meta.url)
       const DEST = new URL('../src/data/baked-manifest.json', import.meta.url)
       const prev = JSON.parse(readFileSync(SRC, 'utf8'))
       if (prev.schema_version !== 'brain-manifest-v1') {
         console.error(`bake-manifest: source schema_version is ${JSON.stringify(prev.schema_version)}, not brain-manifest-v1 -- run Phase 1's emitter first`)
         process.exit(1)
       }
       copyFileSync(SRC, DEST)
       console.log(`bake-manifest: baked copy generated_at ${prev.generated_at}`)

   (Reads outside the subtree -- read-only; writes only inside `src/data/`.)

3. `src/data/manifest.ts` -- the only fetch in the codebase (P3/P5):

       import type { BrainManifest } from './manifest-types'
       import baked from './baked-manifest.json'

       export const MANIFEST_URL =
         'https://oracle.slipgate.me/snapshots/brain-manifest.json'
       export type ManifestSource = 'live' | 'baked'
       export interface ManifestResult {
         manifest: BrainManifest
         source: ManifestSource
       }

       function isBrainManifest(x: unknown): x is BrainManifest {
         if (typeof x !== 'object' || x === null) return false
         const m = x as Record<string, unknown>
         return m.schema_version === 'brain-manifest-v1'
           && Array.isArray(m.datacenters)
           && m.datacenters.every((d: any) =>
                typeof d?.id === 'string' && typeof d?.name === 'string'
                && (d.lit === false || (d.lit === true && typeof d.num === 'number')))
       }

       // ?data=force-fallback exercises the REAL failure path end to end
       // (fetch -> 404 -> catch -> baked) against the real server, without
       // touching prod nginx. Dev/verification flag; harmless if shared.
       function targetUrl(): string {
         const forced =
           new URLSearchParams(window.location.search).get('data') === 'force-fallback'
         return forced
           ? MANIFEST_URL.replace('brain-manifest.json', '__force-fallback-probe.json')
           : MANIFEST_URL
       }

       export async function loadManifest(): Promise<ManifestResult> {
         try {
           const res = await fetch(targetUrl(), { signal: AbortSignal.timeout(5000) })
           if (!res.ok) throw new Error(`HTTP ${res.status}`)
           const json: unknown = await res.json()
           if (!isBrainManifest(json)) throw new Error('shape validation failed')
           return { manifest: json, source: 'live' }
         } catch (err) {
           console.info('[oracle-web] live manifest unavailable, using baked copy:', err)
           return { manifest: baked as BrainManifest, source: 'baked' }
         }
       }

   (Hand-rolled guard, no schema library -- the contract is frozen and small;
   a dependency would be complexity without a payer. `AbortSignal.timeout` is
   baseline browser API; the deployed-URL probe is its verifier.)

**Verification probe** (greps a DATA-only sentinel -- the baked file's
`generated_at` timestamp -- not the `brain-manifest-v1` literal, which the
validator code also carries and would mask a silently-failed bake):

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && test -f src/data/baked-manifest.json && pnpm run check

Expect: bake line prints the manifest's `generated_at`; build success; the
generated file exists; tsc clean.

**Amendment 2026-08-06 (finding F11), do not revert:** the bundle-grep leg
     grep -rc "$(jq -r .generated_at src/data/baked-manifest.json)" dist/assets/
was originally part of THIS probe and is unsatisfiable here. At Task 3 the
importer chain is `index.html -> index.tsx -> App.tsx`, and App.tsx is still
Task 2's static placeholder, so Rollup tree-shakes `src/data/manifest.ts` and
its baked-JSON import out of the bundle -- the grep returns `0` for a correct
implementation. The leg moves to **Task 4** (whose App.tsx rewrite is what
pulls the module in) and is re-asserted at phase-boundary probe 2. The
assertion is not weakened, only relocated to a state where it can be true.
Whoever re-runs Task 3 standalone: a `0` here is expected, not a regression.

Negative check of the bake guard: run the REAL `scripts/bake-manifest.mjs`
(copied byte-for-byte into a scratch tree that reproduces the relative layout
its `SRC`/`DEST` URLs expect) against an old-shape manifest -- e.g.
`git show 7214f291:apps/qw-oracle/snapshots/brain-manifest.json`, which has a
numeric `schema_version: 1`. Expect exit 1, the loud message, and NO baked
file written. Testing a hand-written replica of the guard logic instead proves
only the replica -- run the shipped bytes.
Negative check of the bake guard: point SRC at any old-shape JSON in a
scratchpad copy -> exit 1 with the loud message.

### Task 4 -- two-floor skeleton rendering real numbers · `agent (workhorse, medium)`

**Goal:** the page shows both floors with fragment anchors and scroll-snap,
and REAL manifest numbers flow from `loadManifest()` through props to dumb
components. This is scaffolding, not the comp: P1 visual-parity gates apply
from Phase 3 -- but everything rendered here must be mockup-truthful (copy per
P8, dormant presentation per the Phase 1 contract), because pieces of it
survive into the port.

**Files:** `src/App.tsx` (rewrite), `src/components/Floor1Brain.tsx`,
`src/components/Floor2MachineRoom.tsx`.

**Steps:**

1. `App.tsx`: one `createResource(loadManifest)`; render both floors inside a
   root div carrying `data-manifest-source={result()?.source}` (invisible ->
   no P1 deviation; it is the fallback-proof hook). Sections:

       <section class="floor" id="brain" aria-label="The oracle's brain"> ... </section>
       <section class="floor" id="machine-room" aria-label="The machine room"> ... </section>

   Native fragment navigation covers `/#brain` and `/#machine-room` (D6);
   deeper zoom fragments are `TBD-PHASE-6-fragment-urls`.
2. `Floor1Brain.tsx` (props: `manifest`, `source`): title block
   `THE ORACLE IS AWAKE` (mockup h1), tagline corner note "30 years of
   QuakeWorld knowledge, routed to your agent or API." (P8), then a plain
   list over `manifest.datacenters` -- registry-keyed by `id`, never
   positional (D4): lit entries render `name` + `num.toLocaleString('en-US')`
   + `sub`; dormant entries render `name` + the `"—"` / `"dormant"`
   presentation defaults (Phase 1 contract: dormant OMITS num/sub -- the site
   supplies the dashes). No brain visuals -- `TBD-PHASE-3-brain-port`.
3. `Floor2MachineRoom.tsx` (props: `manifest`): the `mrhead` header. The
   comp's full line (mockup line 215) is "The Machine Room · what the brain
   runs on · click a rack"; the skeleton renders only "The Machine Room ·
   what the brain runs on" -- the trailing "· click a rack" clause lands with
   Phase 4's rack interactivity (`TBD-PHASE-4-machine-room-port`), since the
   skeleton has no racks to click and the copy would be false. Below it, a
   placeholder box noting
   the field terminal (`TBD-PHASE-4-machine-room-port`), and a small
   provenance line from `manifest.generated_at` (echoing the mockup's
   "brain-manifest.json, 2026-08-05" data-block label). The provenance line
   is Phase-2-only scaffolding with NO mockup counterpart on this floor --
   Phase 4's parity port removes it along with the rest of the placeholder.
4. Components contain zero fetching, zero URL parsing (P4) -- data and source
   arrive as props.

**Verification probe:**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && grep -c 'machine-room' dist/assets/*.js && grep -ci 'THE ORACLE IS' dist/assets/*.js

Expect: build success, both greps >= 1. (DOM-level checks need a browser --
they land in the phase-boundary probes against the deployed URL; the cockpit
publishes no port for `vite preview`, so no localhost URL is surfaced to the
operator.)

### Task 5 -- CF Pages: auth gate, project create, first deploy · `inline` -- STALL POINT

**WRITE-GRANT:** may write exactly `~/.secrets/cloudflare-pages.env` (mode
600, from an operator-supplied token -- never committed, never echoed into
the transcript). No other writes outside `apps/oracle-web`.

**Auth gate (probed ABSENT at drafting time -- expect to stall here):**

    test -f ~/.secrets/cloudflare-pages.env && grep -q CLOUDFLARE_API_TOKEN ~/.secrets/cloudflare-pages.env && echo AUTH-PRESENT || echo AUTH-MISSING

On AUTH-MISSING: STOP this task and ask the operator for a Cloudflare
**Account API Token** on the personal account (ID
`1ce363f39e7689394588736456d3f147`, per `apps/docs-web/DEPLOYMENT.md`) with
**Cloudflare Pages: Edit** permission. Store as:

    # ~/.secrets/cloudflare-pages.env  (chmod 600)
    CLOUDFLARE_API_TOKEN=<token>
    CLOUDFLARE_ACCOUNT_ID=1ce363f39e7689394588736456d3f147

Tasks 1-4 and Task 6's doc-writing proceed regardless; only deploy-dependent
verification waits.

**Token sanity probe (read-only, before any deploy):**

    set -a; . ~/.secrets/cloudflare-pages.env; set +a
    curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" | jq -r '.success'

Expect `true` (proves token + account + Pages scope; `wrangler whoami` is NOT
a valid proof -- docs-web gotcha 2 documents it succeeding while the deploy
path fails).

**Create + deploy (docs-web procedure, wrangler@3 = the proven line; both
wrangler 3.114.17 and 4.119.0 verified launching on this box's Node 22.12.0):**

    cd /home/dev/projects/quakeworld/apps/oracle-web
    set -a; . ~/.secrets/cloudflare-pages.env; set +a
    npx -y wrangler@3 pages project create qw-oracle-web --production-branch main
    pnpm run deploy

(`pnpm run deploy` chains bake + build + `wrangler@3 pages deploy dist
--project-name qw-oracle-web --branch main --commit-dirty=true`; the env vars
ride the shell. `--branch main` makes it the production deployment at the
canonical URL; each run also prints a per-deployment alias.)

**Verification probe:**

    curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/

Expect `200`.

### Task 6 -- fallback proof, DEPLOYMENT.md, commit · `inline`

**Goal:** degradation proven on the real URL; the pipeline documented so any
later session redeploys with one command; subtree committed.

**Steps:**

1. Run the phase-boundary probes below (the fallback proof is probes 4-5).
2. Write `apps/oracle-web/DEPLOYMENT.md` in the docs-web shape: infrastructure
   table (project `qw-oracle-web`, URL, personal account ID, output dir
   `apps/oracle-web/dist`, production branch `main`), the auth-file
   convention, the one-command redeploy --

       set -a; . ~/.secrets/cloudflare-pages.env; set +a; pnpm --dir /home/dev/projects/quakeworld/apps/oracle-web run deploy

   -- plus the wrangler-version note and the custom-domain deferral
   (`oracle.quake.world` lands on vikpe's zone later; P11 scopes this arc to
   the personal-account preview URL).
3. Commit the subtree (message naming the phase), push at the checkpoint.

**Verification probe:** `git -C /home/dev/projects/quakeworld status --porcelain -- apps/oracle-web` empty after commit; `git log --oneline -1 -- apps/oracle-web` shows it.

## Phase-boundary verification

Run in order. 1-3 are automated; 4-7 are operator-run in a browser against the
public URL (this phase's verification floor per the README).

1. **Public URL serves the site:**

       curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/
       curl -s https://qw-oracle-web.pages.dev/ | grep -c 'src="/assets/'

   Expect: `200` and >= 1 -- YES/NO.

2. **Baked fallback is in the shipped bundle** (local dist is byte-authoritative
   for what was uploaded; the deployed-asset grep confirms the upload):

       grep -rc 'brain-manifest-v1' /home/dev/projects/quakeworld/apps/oracle-web/dist/assets/
       ASSET=$(curl -s https://qw-oracle-web.pages.dev/ | grep -o '/assets/[^"]*\.js' | head -1); curl -s "https://qw-oracle-web.pages.dev$ASSET" | grep -c 'brain-manifest-v1'

   Expect: both >= 1 (if Vite split the JSON into a non-entry chunk the second
   literal can read 0 while the first is >= 1 -- then fetch the remaining
   `/assets/*.js` names from the dist dir listing and grep those) -- YES/NO.

3. **Expected numbers, for the operator's eyeball in probe 4:**

       curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.datacenters[] | select(.lit) | "\(.name)  \(.num)"'

   Prints the four lit name/number pairs -- keep visible for the next probe.

4. **Live numbers render (operator):** open `https://qw-oracle-web.pages.dev/`.
   The four lit datacenter names + numbers match probe 3's output
   (en-US-formatted); the two dormant names render with dashes. In devtools
   console: `document.querySelector('[data-manifest-source]').dataset.manifestSource`
   -> `"live"`. In the Network tab: exactly ONE non-asset request -- the
   manifest URL, status 200 (P3/P5 single-call audit) -- YES/NO.

5. **Fallback proof (operator):** two independent paths, neither touches nginx:
   (a) open `https://qw-oracle-web.pages.dev/?data=force-fallback` -- the page
   renders the SAME numbers (baked == live at this point in the arc, Phase 1
   probe 8), console shows the `[oracle-web] live manifest unavailable` info
   line, and `data-manifest-source` reads `"baked"`; (b) devtools -> Network ->
   right-click the manifest request -> **Block request URL** (or Network
   request blocking, pattern `*brain-manifest.json`), then reload -- the
   document still loads from the network while the manifest fetch fails, so
   the page renders numbers from the baked copy with no error surface. (a)
   proves the real fetch->404->catch->fallback code path against the real
   server; (b) proves the fetch-unreachable path -- YES/NO.

   **Do NOT use devtools Offline for (b)** (cold review CR-GATE-2): this page
   ships no service worker, so Offline blocks the DOCUMENT itself -- the
   operator gets the browser's error page, the app never boots, and the
   fallback path goes unverified while the probe looks like it "failed
   correctly". Request-blocking scopes the failure to the one fetch under
   test, which is the actual condition P3's fallback exists for.

6. **Two floors, fragments, scroll-snap (operator):** open
   `https://qw-oracle-web.pages.dev/#machine-room` -- lands on floor 2; scroll
   up/down -- gentle snap between floors on desktop; both floors sit on the one
   continuous gradient -- YES/NO.

7. **Repeatable pipeline:** run the Task-6 one-command redeploy once more;
   then:

       set -a; . ~/.secrets/cloudflare-pages.env; set +a
       cd /home/dev/projects/quakeworld/apps/oracle-web && npx -y wrangler@3 pages deployment list --project-name qw-oracle-web | head -5

   Expect: >= 2 deployments listed, probe 1 still returns 200 -- YES/NO.

## Outputs to next phase

Phase 3 may rely on:

- **The live URL + pipeline**: `https://qw-oracle-web.pages.dev/`, redeployed
  by the one command in `apps/oracle-web/DEPLOYMENT.md`. Every later phase's
  boundary verification runs against this URL (P11).
- **The skeleton contract**: the file map above. Phase 3 builds inside
  `src/components/` + creates `src/generators/` (pure functions: manifest data
  + seed in, geometry out -- P4); Phase 4 builds inside the same seam. The
  floor sections `#brain` / `#machine-room` and the shell CSS (scroll-snap,
  gradient, reduced-motion guard) exist and are P7c-compliant.
- **The data contract surface**: `loadManifest(): Promise<ManifestResult>` --
  called exactly once in `App.tsx`; components receive `manifest` (typed
  `BrainManifest` from `src/data/manifest-types.ts`, mirrored per the sync
  rule) and `source` via props. No component fetches, ever (P4/P5).
- **The dev-flag pattern**: `?data=force-fallback` establishes the
  query-param-flag precedent Phase 3's why-overlay dev flag (P6) follows
  (`TBD-PHASE-3-overlay-flag`).
- **The theme tokens**: daisyUI theme `oracle` in `src/styles/app.css` maps
  the mockup palette onto daisyUI token names; Phase 3-4 style against tokens
  (or mockup-verbatim CSS where the comp demands it -- P1 wins over token
  purity).

## Open questions (default + who can overrule)

1. **CF Pages project name `qw-oracle-web`** (URL
   `qw-oracle-web.pages.dev`). Default as stated -- mirrors docs-web's
   `quakeworld-docs` convention. Overrule: operator (rename before Task 5;
   the name is embedded in the `deploy` script + DEPLOYMENT.md).
2. **wrangler v3 as the default deploy line.** Default: `npx -y wrangler@3`
   -- the proven docs-web path; both v3 and v4 verified launching on this box.
   Overrule: implementer may switch to `wrangler@4` if v3 misbehaves on
   Node 22 (record a finding + update the `deploy` script and DEPLOYMENT.md).
3. **Vite major: 8 (registry-latest, peers compatible) vs 7.** Default: the
   pinned set in Task 2. Overrule: implementer downgrades to `^7.1.0` on a
   failed compat probe without asking (finding recorded); any other version
   surgery is a finding first.
4. **Token storage**: `~/.secrets/cloudflare-pages.env` with TOKEN +
   ACCOUNT_ID. Default as stated (matches the existing `~/.secrets/*.env`
   pattern). Overrule: operator (it is their credential; env-var-per-session
   is acceptable if they prefer not to persist it -- the auth gate then
   re-stalls each session).
5. **Baked copy: generated + gitignored vs committed.** Default: generated
   (single committed source of truth stays `apps/qw-oracle/snapshots/`; no
   twin-copy drift in git). Overrule: operator.
6. **daisyUI include-trim.** Default: none (no VitePress collision here).
   Overrule: Phase 3 implementer via finding if bundle size warrants.

## Recovery

- **Task 5 auth gate stalls (the expected path -- no token on this box
  today):** not a failure. Finish Tasks 1-4, run the build-level probes,
  write DEPLOYMENT.md up to the deploy step, commit. Resume Task 5 when the
  operator hands over the token. Nothing else in the phase depends on the
  deploy except probes 1-7.
- **`corepack pnpm` invoked by mistake:** corepack-managed pnpm fails at
  launch on this box; the error string varies with corepack's cached state
  (two different signatures observed on 2026-08-06 alone -- see environment
  facts), and `COREPACK_INTEGRITY_KEYS=0` does not rescue it. Use the Task-1
  global install or `npx -y pnpm@10`. Never debug corepack itself.
- **`Authentication failed [code: 9106]` on deploy:** the account-scoped token
  cannot enumerate `/memberships` -- `CLOUDFLARE_ACCOUNT_ID` is missing from
  the environment (docs-web gotcha 2). Source the secrets file; both vars must
  be set.
- **`pages project create` says the name exists:** a previous partial run got
  that far. Skip create, go straight to deploy -- `pages deploy` against an
  existing project is the normal repeat path.
- **Bake script exits 1 ("not brain-manifest-v1"):** the committed
  `apps/qw-oracle/snapshots/brain-manifest.json` is still the pre-Phase-1 old
  shape -- Phase 1 has not landed (or its commit is not merged into this
  checkout). Do not hand-edit the manifest; run/merge Phase 1 first. This
  guard firing at drafting-time state is by design.
- **Deployed page renders but numbers are dashes/blank on ALL entries:** open
  the console. A CORS error on the manifest fetch means Phase 1's
  `access-control-allow-origin: *` header regressed -- re-run Phase 1's
  boundary probe 1 and its recovery, not anything site-side. A validation
  failure with a 200 fetch means contract drift: diff the live manifest's
  keys against `manifest-types.ts` and route a finding to Phase 1 (P2).
- **Vite/plugin resolution or build failure on the pinned set:** downgrade
  `vite` to `^7.1.0` (Open question 3), `rm -rf node_modules pnpm-lock.yaml`,
  re-install, re-run the Task-2 probe. Record the finding.
- **Bad deploy live at the URL:** CF Pages deployments are immutable and
  listed (`pages deployment list`); the rollback path is redeploying a known-good
  state -- `git checkout <good-sha> -- apps/oracle-web/src` (or a clean
  checkout) and run the one-command deploy again. Previous per-deployment
  alias URLs remain inspectable for diagnosis.
- **Subtree pollution (files landing outside `apps/oracle-web`):** the only
  sanctioned outside writes are Task 1's toolchain install and Task 5's
  secrets file. `git status --porcelain` showing anything else = stop, revert,
  re-read the task's file list.
