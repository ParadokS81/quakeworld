# F14 pre-deploy executor prompt -- docs.quake.world (file-as-prompt)

> Paste into a FRESH `claude` terminal by typing
> `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-f14-executor-prompt.md`.
> EXECUTION bootstrap (not a drafter prompt). The orchestrator that dispatched you
> verifies your output against live source at the boundary -- report honest probe
> outputs (actual counts, exit codes, grep results, the dev-server result), not
> "PASS" claims.

You are EXECUTING the **F14 PRE-DEPLOY PASS** of the **docs.quake.world** arc -- the UX +
visual pass that slots between Phase 4 (shipped) and Phase 5 (deploy). Four tasks:
(1) **F17** cvar-link auto-expand + highlight; (2) **F18** a global entity search
(MiniSearch over the docs JSON) -- the headline; (3) trim the daisyUI `include:` list;
(4) density/spacing polish. D10 is CLOSED (no theme swap -- recorded, no task). This is
EXECUTION: real TS/Vue, run pnpm/vitest/build + a dev server, ship the runnable state.

Use the **arc-executor** skill as your spine: read the phase MD cold, critically review it
against decisions.md / review-findings.md BEFORE executing, execute each task per its
declared execution mode, run phase-boundary verification, halt with a structured report.

STOP and re-check your arc if you see Postgres migrations, concept-note authoring, or
`build-snapshot.ts` edits -- sibling/precursor arcs. This phase touches the `apps/docs-web/`
subtree ONLY.

Working directory: /home/paradoks/projects/quakeworld

## Reads (in order)

1. `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-f14-predeploy.md` -- THE phase MD: 4 tasks (full/locked content + shape references), the 8 boundary checks, the recovery table. **This MD was orchestrator-boundary-verified CLEAN** (see "Orchestrator augmentations").
2. `docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md` -- **D9 (amended 2026-06-10: flat global entity search is IN scope), D10 (amended, CLOSED), D15 (logic in lib/, not components), D22 (anchors), D11, D14**.
3. `docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md` -- **F17, F18 (owned here), F19 (the daisyUI trim must KEEP rootcolor/scrollbar), F10/F11 (include-vs-usage probe + grep-comment false positives), F14 (the theme-collision history this pass closes)**.
4. The SHIPPED live code you extend: `apps/docs-web/.vitepress/theme/components/{EntityBrowse,EntityCard,CodebaseGrid,CodebaseLanding}.vue`, `.vitepress/theme/{style.css,index.ts,config.ts,codebases.data.ts}`, `index.md`, and `lib/{snapshot,derive,anchor,codebase-label,types,browse,filter}.ts`. Extend these with the MD's content; do not re-derive their shapes.

## Execution discipline (read before you start)

1. **Honor the per-task execution modes (F12), in this ORDER (the MD's sequencing is deliberate):**
   - Task 1 (F17 auto-expand + highlight -- EntityBrowse/EntityCard/style.css): **subagent (Sonnet medium)**. View-state glue + the one live integration unknown (below).
   - Task 2 (F18 search -- `lib/search-index.ts` + test, `search-records.data.ts` loader, `GlobalSearch.vue`, `search.md`, + 4 wiring edits, + the `minisearch` dep): **subagent (Sonnet MAX)** -- the win-or-lose synthesis.
   - Task 3 (daisyUI include trim): **inline** -- the trim block is fully locked. Run it AFTER Task 2 so the include-vs-usage probe sees GlobalSearch's classes.
   - Task 4 (density/spacing): **subagent (Sonnet medium)** -- apply last, on top; operator eyeballs at the boundary.
   Dispatch via `superpowers:subagent-driven-development`.

2. **The load-bearing boundary checks you cannot declare DONE without (green):**
   - **SSR-safety (Check 3):** F17 reads `location`/`window` ONLY inside `onMounted`/`hashchange` -- never in `setup` body or at module top, or the SSR build throws `location is not defined`. The build exiting 0 is the proof.
   - **`.menu` regression gate (Check 4):** compiled CSS emits zero `.menu { flex-flow:column }` (`grep -c 'flex-flow:column' apps/docs-web/.vitepress/dist/assets/*.css` -> 0). GlobalSearch results MUST be a plain styled `<ul>`, NOT daisyUI `.menu`/`.dropdown`.
   - **Base-family retained (Check 5, F19):** compiled CSS still carries the theme `--color-*` `:root` declarations. The trim KEEPS `rootcolor` + `scrollbar` (base families a class-grep cannot see). Do NOT trim to the bare six.
   - **D15 gate (Check 6):** `grep -nE 'fetch\(|readFileSync|readdirSync|\.filter\(|\.map\(|\.reduce\(' .../components/{EntityBrowse,EntityCard,GlobalSearch}.vue` -> empty (code AND comments -- F11). The search/record `.map`/`.filter` live in `lib/`, not the component.
   - **Isolation (Check 7, D20):** `pnpm --dir apps/docs-web add minisearch` keeps install in-subtree; `git status --short` shows changes only under `apps/docs-web/` (+ the plan dir). Do NOT run a bare root `npm install`.

3. **vitest:** the new `search-index.test.ts` runs under the existing `pnpm --dir apps/docs-web test` (was 40 tests). Report ACTUAL pass/fail counts. Its assertions: exact-name hit ranks first; description-only term finds its record; every result `url === /<cb>/<type>#<anchor>` with `anchor === name.toLowerCase()`; empty query -> `[]`; `buildSearchRecords()` over live data > 0 records.

## Critical rules

- **The ONE genuine integration unknown -- VERIFY IT LIVE, do not assume:** whether VitePress's
  client router lets `hashchange` fire for an IN-PAGE cvar-link click (Task 1). Run
  `pnpm --dir apps/docs-web docs:dev` and click a cvar-link inside an expanded description. If the
  target expands+flashes, native `hashchange` works. If it does NOT (the router swallowed the
  same-page hash nav), use the MD's fallback: ALSO watch the route hash (`useRoute()` from
  `vitepress`) or a delegated click handler on the description panel -- keep the native listener for
  cross-page (search-result) navigation. Confirm BOTH paths (in-page click + a `#anchor` deep link)
  in the dev server before halting.
- **F19 -- the daisyUI trim KEEPS rootcolor + scrollbar.** They are base families (theme color CSS
  + scrollbars), invisible to a class-usage grep; the locked trim is
  `{badge, card, divider, input, label, toggle, rootcolor, scrollbar}`. The bare-six list is WRONG.
- **MiniSearch API:** the MD speced the `minisearch` API from 7.2.0 (`idField`/`fields`/`storeFields`/
  `searchOptions.{boost,prefix,fuzzy,combineWith}`/`addAll`/`search`). VERIFY it against the installed
  `node_modules/minisearch` `.d.ts` before finalizing `lib/search-index.ts`; if a newer major
  installed, adapt. The `tsc --noEmit` gate is your safety net.
- **Placement is decided** (orchestrator-accepted the drafter's call): a homepage hero `<GlobalSearch/>`
  + a `/search` page reached by a plain nav LINK -- NOT a VPNav search-slot override (zero nav-collision
  risk). VitePress's own Ctrl+K local search stays for prose (D9-amended).
- **Density (Task 4)** is operator-eyeballed at the boundary -- the MD's proposed class changes are a
  starting point, not locked; expect a tuning loop.
- ASCII only. Scope is the F14 pass ONLY: NO Phase 5 deploy config; NO `build-snapshot.ts` / qw-oracle
  edits. If a search/F17 need forces a per-codebase branch INSIDE a component, that is a D14 problem --
  escalate to the orchestrator, do NOT fork a component.
- **Concurrent session:** a second Claude session is writing `apps/qw-oracle/curated/` (the L3 arc). You
  only touch `apps/docs-web/`. Commit EXPLICIT `apps/docs-web/` + plan-dir paths via `git add <paths>`;
  run `git diff --cached --stat` before every commit (shared tree); commit to `main` directly.

## Orchestrator augmentations (this draft was boundary-verified, 2026-06-10)

The orchestrator ran the Explore verification pass + spot-checked the load-bearing claims against live
source. CONFIRMED (you may trust these contracts; still run tsc/build):
- The F18 `lib/` call signatures all match live code: `friendlyType(record: EntityRecord)` takes the
  WHOLE entry (so `friendlyType(e)` is correct), `listSnapshots()` -> `{codebase,type}[]`,
  `loadSnapshot(cb,type).entries`, `entityAnchor(name)=name.toLowerCase()`, `codebaseLabel(slug)`,
  and EntityRecord carries `name` + optional `description`.
- `codebases.data.ts` is a real `defineLoader` with a `watch` glob -- the model `search-records.data.ts`
  mirrors. The F17 component shape matches (EntityCard local `expanded` ref, `:id="row.anchor"`, `@click`
  toggle; EntityBrowse `v-for` over `<EntityCard>`).
- `rootcolor` + `scrollbar` ARE real `node_modules/daisyui/base/*` families (F19 confirmed).

Residual risks the executor owns: the live `hashchange` behavior (above) and the MiniSearch API surface
against the installed types. Everything else is verified.

## Boundary + halt

Run ALL boundary checks in the MD's "Verification (phase boundary)" section (Checks 1-7 mechanical +
Check 8 the dev-server runnable-state items). Commit to `main` (explicit paths) when the mechanical
checks are green. Then HALT with the arc-executor structured report: status (DONE / DONE_WITH_CONCERNS /
NEEDS_CONTEXT / BLOCKED), the ACTUAL probe outputs (tsc exit; vitest counts; build exit + that
`/search.html` emitted + prior routes intact; the `.menu` flex-flow:column count = 0; the base-family
`:root --color-*` present; the D15 grep results; the D20 `git status --short`), the LIVE hashchange
result (native vs fallback), any concerns, and what Phase 5 inherits. Do NOT proceed to Phase 5. The
OPERATOR runs the live floor-check after you halt (the orchestrator coordinates it -- search finds a
cvar + lands expanded; cvar-link click expands+flashes; deep link lands expanded; nav horizontal;
density reads cleanly).
