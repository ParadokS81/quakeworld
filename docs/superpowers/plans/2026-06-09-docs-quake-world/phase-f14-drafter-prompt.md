You are drafting the **F14 PRE-DEPLOY PASS** of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). This phase slots BETWEEN Phase 4
(SHIPPED + pushed) and Phase 5 (deploy). It is the pre-deploy UX + visual pass:
it ships the entity SEARCH the site is currently missing, the cvar-link
auto-expand, a daisyUI include-list trim, and density/spacing polish.
Presentation-layer ONLY -- it respects D15 (logic in plain-TS modules, dumb
components). It does NOT touch the L1 data export (build-snapshot.ts) or the
logic of the Phase-4 cross-link modules.

STOP and re-check your arc if you see Postgres migrations, concept-note authoring
(`apps/qw-oracle/curated/`), or `build-snapshot.ts` changes -- those are
sibling/precursor arcs. This phase touches `apps/docs-web/` ONLY.

This is a structured PLANNING task. Output is the F14 phase MD. Paper-only --
draft the plan; do NOT write any app code or execute anything.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-f14-predeploy.md

---

## SCOPE -- five items (operator-approved 2026-06-10)

1. **F17 -- cvar-link auto-expand + highlight.** Today a cvar->cvar link scrolls
   to the target entity's *collapsed* row (the D22 anchor resolves correctly, no
   dead link) but does NOT open it, so the reader lands on a truncated row. Make
   navigation to an entity anchor -- BOTH initial load with a `#anchor` hash AND a
   `hashchange` from an in-page cvar-link click -- auto-expand and briefly
   highlight the matching card, then scroll it into view.

2. **F18 -- build a global entity search (the headline item).** The top search
   box (VitePress local search) finds NO entities -- it indexes only prose pages.
   Build a custom global search over the docs JSON (the ~5000 L1 entities you
   already emit): a MiniSearch index over name + description, surfaced as a
   prominent search box, results linking straight to `/<codebase>/<type>#<anchor>`
   (which -- with F17 -- lands the user on the expanded card). Operator chose this
   (option b) over per-page-filter-only. Add `minisearch` as a dependency.

3. **Trim the daisyUI `include:` list** to the components actually used (shrinks
   CSS, removes latent generic-classname collisions like the `.menu`/`.vp-doc h2`
   ones already fixed). Run an include-vs-usage probe; keep only what is used.

4. **D10 -- CLOSED, not a task.** "Adopt vikpe's theme" is already satisfied (the
   docs theme is a byte-identical port of vikpe's). NO theme swap. Just record it
   in the phase MD's Open-questions/notes so no one re-opens it. See the amendment
   under D10 in decisions.md.

5. **Density/spacing polish** on the browse tables + landing cards. Subjective --
   propose concrete spacing/typography changes; the operator eyeballs them at the
   boundary floor-check.

---

## REQUIRED READING

1. `docs/superpowers/plans/2026-06-09-docs-quake-world/README.md` (status column authoritative)
2. `docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md` -- **D9 (amended 2026-06-10), D10 (amended 2026-06-10, CLOSED), D15, D22, D11 are central**
3. `docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md` -- **F17, F18 are the new owners; F10/F11 (daisyUI include-vs-usage + grep false-positives), F14 (the theme-collision history)**
4. `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md` -- mandatory shape; follow exactly
5. `apps/docs-web/` cold -- especially `.vitepress/theme/components/EntityBrowse.vue` + `EntityCard.vue` (the expand-state mechanism F17 hooks), `.vitepress/theme/style.css` (the daisyUI include + the `quakeworld` theme), `.vitepress/config.ts` (nav + where to surface search), `lib/anchor.ts`, `lib/browse.ts`, `lib/snapshot.ts` / the data-loaders (the record source F18 indexes)
6. `docs/superpowers/specs/2026-06-09-docs-quake-world-design.md` -- sections 4 (IA), 9 (search) for framing

---

## VERIFIED CONTEXT (orchestrator cold-verified 2026-06-10 -- re-confirm against live source before relying)

**F17 mechanics (current behavior):** the cvar-link renders as
`<a :href="'#' + seg.anchor" class="text-primary underline decoration-dotted" @click.stop>` inside
the EXPANDED EntityCard (EntityCard.vue segments loop, Phase 4). `lib/anchor.ts` ->
`entityAnchor(name) = name.toLowerCase()`; the row anchor is `/<codebase>/<type>#<anchor>`.
Clicking sets `location.hash` and the browser scrolls to the row element, but the row's
expand state is component view-state that nothing toggles on hash change -- so the target
stays collapsed. The fix lives in the browse/card view layer (read EntityBrowse.vue +
EntityCard.vue to see exactly how `expanded` is held -- per-row local state vs a parent
set). This is VIEW interactivity (same category as the D3 Flat/Grouped toggle + filter),
so reading `location.hash` to set `expanded` is D15-clean view glue, NOT business logic in
a component -- annotate it so the D15 grep gate (#`fetch|readFileSync|.filter(|.map(|.reduce(`)
is not misread (locate the row WITHOUT `.filter/.map/.reduce` -- a per-card
`anchor === currentHash` check or `.find` avoids the gated tokens; cf. F11).

**F18 / the search finding (verified):** the built VitePress local-search index
(`.vitepress/dist/assets/chunks/@localSearchIndexroot.*.js`) is 1042 bytes,
`"documentCount":1`, `"documentIds":{"0":"/#docs-quake-world"}` -- ONLY the home page. The
28 entity routes carry no markdown prose (a single data-driven Vue component), so VitePress's
content indexer skips them. The entity NAMES *are* in the SSR HTML (a `curl /ezquake/cvar`
shows `r_tracker`), so the data is present -- only the search INDEX misses it. The fix is a
SEPARATE custom search, not a VitePress config tweak. The records already exist as the D13
uniform JSON the browse pages load (`lib/snapshot.ts` / `listSnapshots()`); a build-time
module enumerates them into a flat searchable list `{codebase, type, name, description,
friendly_type, anchor}` and the search component builds (or `MiniSearch.loadJSON`s) the index.
5000 small records index client-side in well under 100ms, so either build-time-serialized or
client-built is fine -- your call; keep the index/record logic in a pure module (D15), the
search box dumb. **Surfacing:** decide placement (a homepage hero search and/or a nav search
component) by reading config.ts; a result is `<a href="/<codebase>/<type>#<anchor>">`.

**F18 x F17 synergy (design for it):** a search result links to an entity anchor; with F17
landing on the EXPANDED card, "search a cvar -> click -> read it" is one motion. Build F17
first (or alongside) so search results land expanded.

**D10 theme (verified -- NO swap):** diffed `.vitepress/theme/style.css` (theme `quakeworld`)
against vikpe's vendored `research/repos/slipgate/web/apps/website/src/styles/main.css` (theme
`quakeworldz`): the daisyUI token blocks are byte-identical (slate-950 base, blue-600/
purple-600/pink-600 primary/secondary/accent, sky/green/yellow/red status, radii 0.5rem,
border 1.5px, depth/noise 0). vikpe's only extra file is QW-content helpers (player colors +
conchar sprites) -- irrelevant here; no custom fonts. So there is NO theme to adopt; D10 is
closed. Do NOT pull vikpe's daisyUI `include:` wholesale -- his carries `menu` (the class
behind the F14 nav bug) and lacks `card` (we use it). Ours is the correctly-adapted list.

**daisyUI include + the `.menu` landmine (load-bearing for item 2 AND 3):** current
`style.css` `include:` = badge, breadcrumbs, button, card, collapse, divider, dropdown,
indicator, input, join, label, loading, list, progress, range, rootcolor, scrollbar, select,
skeleton, swap, tab, toggle. `menu` is DELIBERATELY EXCLUDED (daisyUI `.menu` sets
`flex-flow:column` and collided with VitePress's `.VPNavBarMenu menu`, stacking the nav
vertically -- F14 BUG A). **The F18 search-results UI MUST NOT use daisyUI `.menu`** (use a
plain styled list / `dropdown`, not `.menu`) or it reintroduces the nav bug. Sequence the
include-TRIM (item 3) AFTER F18 is designed, so the probe sees F18's actual class usage and
does not drop something the search component needs.

---

## DECISIONS THIS PHASE MUST HONOR

- **D9 (amended 2026-06-10):** v1 search = VitePress local search for prose/nav PLUS this
  custom global entity-search (MiniSearch over the docs JSON, build-time index module per
  D15, results -> D22 anchors). The "no faceted/cross-engine search" line still holds for
  FACETED / cross-fork search; a flat global name+description search is the minimum a
  reference site needs and is in scope.
- **D10 (amended 2026-06-10, CLOSED):** no theme swap; the theme already is vikpe's. Any
  look change is the density/spacing polish item, NOT a theme adoption.
- **D15:** every new module (search index/record builder) is pure plain-TS; the search box +
  the F17 hash-glue are view-layer, no business logic / no data-fetching baked into a
  component. The D15 grep gate over components stays green.
- **D22:** search results + cvar-links target the stable per-entity anchors
  (`entityAnchor(name) = name.toLowerCase()`); do not invent a second scheme.
- **D11:** graceful degradation -- search over a codebase with sparse fields still works;
  F17 highlight degrades cleanly if a hash matches nothing.
- **D14:** no per-codebase/per-type branching baked into the search component; it iterates
  uniform records (a 7th codebase slots in free).

---

## EXECUTION-MODE GUIDANCE (annotate each task per phase-template; content-conditional per F12)

- **F18 search index/record module + the search component** (a new feature: dependency,
  build-time index, new component, result wiring): `subagent (Sonnet MAX)` -- judgment-dense
  synthesis from multiple files.
- **F17 auto-expand + highlight** (view-state glue across EntityBrowse/EntityCard):
  `subagent (Sonnet medium)`.
- **daisyUI include trim** (run the include-vs-usage probe, drop unused, keep F18's classes):
  `subagent (Sonnet medium)` or `inline` if the trimmed list is fully determined in the MD.
- **Density/spacing polish** (concrete CSS/spacing edits): `subagent (Sonnet medium)`; expect
  an operator eyeball at the boundary.
- **D10 record-only:** no task -- a note in Open-questions.

---

## DELIVERABLE / runnable state at boundary

`pnpm --dir apps/docs-web build` exits 0 (28 routes); unit tests pass (new search-index tests;
F17 tests where testable). Then the OPERATOR FLOOR-CHECK (presentation -- needs human eyes,
like Phase 3): typing a cvar name in the global search returns it and clicking the result lands
on the EXPANDED card; clicking a cvar-link inside a description expands + highlights the target;
the top nav stays horizontal (compiled CSS still emits zero `.menu { flex-flow:column }`); the
trimmed include dropped no used component; density reads cleanly. The D15 grep gates over the
new/modified components stay empty.

## DRAFTING RULES

ASCII only (no emoji, no em/en dash). Follow phase-template.md EXACTLY (every section incl. the
Execution-mode line per task with a rationale). Full content for any `inline`-shipped file.
No "engineer fills in X" hand-waving. No length cap -- F18 makes this a real phase, size it so.

## STEP-BY-STEP

1. Read the required files + the live `apps/docs-web/` components/modules cold. Note applicable
   findings (F17/F18 own this phase; F10/F11/F14 are the daisyUI carry-forwards).
2. Recon: how `expanded` state is held (F17); how browse pages load records (F18 source); where
   to surface the search box (config.ts); the live daisyUI include list vs actual component class
   usage (item 3 probe input).
3. Draft `phase-f14-predeploy.md` per the template -- tasks for F18 (MAX), F17 (medium), trim
   (medium/inline), density (medium); D10 recorded as closed in Open-questions.
4. Self-check before halting: D15 (logic in modules, not components; the F17 hash-glue + F18
   index logic placed correctly), D9-amended scope (flat search, not faceted), the `.menu`
   landmine (F18 results must not use daisyUI `.menu`), and the trim-after-F18 sequencing.
   (The ORCHESTRATOR runs the Explore verification pass on your draft at the boundary.)
5. Halt. Report: the MD path, finding/open-question counts, and a recommendation.

Do NOT proceed to Phase 5. Do NOT execute anything. Do NOT write app code -- this is the plan only.
