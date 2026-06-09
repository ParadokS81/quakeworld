---
date: 2026-06-09
type: design-spec
arc-slug: docs-quake-world
status: design complete -- ready for arc-planner
parent: docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md
precursor: docs/superpowers/parking/2026-06-09-docs-l1-enrichment.md (SHIPPED -- 6 codebases categorized + described)
related:
  - docs/superpowers/parking/2026-05-27-docs-quake-world-vision.md (cross-link contract carried forward)
  - apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts (the export pipeline to extend)
  - apps/qw-oracle/SCHEMA.md (L1 field reference)
---

# docs.quake.world -- design spec

## 1. What this is

docs.quake.world is the human-browsable, per-codebase **Layer 1 reference** for the QuakeWorld ecosystem: every tunable knob (cvars, commands, macros, cmdline params, info keys, ...) projected from the QW Oracle's L1 corpus, across the active codebases. It is the old-school browse fallback to the oracle/MCP -- the killer feature is "ask in plain English, get a grounded answer"; this is the surface for scanning, skimming, and deep-linking.

**Federation split (locked in the roadmap, reaffirmed this session):**

- **docs.quake.world = the reference** -- auto-projected from L1, mechanical, cannot go stale, spans every codebase. (Maps to ezquake.com's "Reference" + "Settings reference" sections.)
- **wiki = the narrative** -- hand-authored concept notes ("how to use X"), built over time. (Maps to ezquake.com's "Features" / "Graphics" guide pages.)
- The two are **cross-linked** so navigation feels seamless (the man-pages <-> Arch-wiki precedent). ezquake.com merges both into one site; we split and cross-link.

This spec covers ONLY the reference. The concept-note / wiki authoring track is a separate arc (already partly underway: 45 notes exist, ezquake.com guide pages convert via the `guide-rewrite` skill).

## 2. Scope

**v1 codebases (6):** ezQuake, KTX, MVDSV, QTV, QWFWD, QWCL. All are L1-complete (descriptions + categories) after the 2026-06-09 enrichment precursor.

**Deferred:** FTE -- active project, no usable categories yet, operator may consult Spike. Lands as a later add; the architecture degrades to a flat searchable list for it when it arrives (no rework).

## 3. Data layer (the source)

L1 lives in qw-oracle Postgres. The docs render from these per-entity fields: `name`, raw `type` (boolean/integer/float/string/enum), `default`, `description`, `remarks`, `values` (value-by-value), `category`, `source_ref`, version history. Coverage is heterogeneous across codebases; **the site renders whatever exists (graceful degradation)** -- richer fields for ezQuake, leaner for the rest.

Card-field coverage (cvars, verified 2026-06-09):

| Field | Who has it |
|---|---|
| name + description | all 6 |
| default | all 6 (KTX partial -- many cvars are mode-set, no static default) |
| category | all 6 (ezQuake 43 source-groups / KTX 13 / MVDSV 14 / QTV 7 / QWFWD 5 / QWCL 16 inherited from ezQuake) |
| type badge (boolean/float/...) | ezQuake + QWCL only |
| value-by-value list | ezQuake (on its enum/boolean cvars) |
| version history | ezQuake only (18 tags, v3.0 -> head); others single-snapshot |

## 4. Export / projection pipeline

- Extend **`build-snapshot`** (`apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`) to emit per-codebase L1 JSON for all 6 codebases. docs is the **3rd consumer** of this pipeline (after slipgate-app and the DB itself) -- extend it, do not reinvent.
- VitePress renders the lists from **data files + Vue components**, NOT markdown-per-entity -- the lists need live filtering, sorting, and inline-expand.
- The JSON export shape is the contract; the Vue rendering iterates freely on top.

## 5. Information architecture

Per codebase:

- A **landing page** (overview + entry to each entity type).
- One **browse view per entity type** (Cvars, Commands, Macros, Cmdline params, Info keys, ...). Cvars is the hero for clients; servers foreground their dominant types.
- Each browse view is a **filterable, scannable list**: one row per entity, with **category as a filter/group** (a Flat / Grouped-by-category toggle) plus free-text search. NOT static one-page-per-category.

This mirrors ezquake.com's shape -- Reference (per-type pages) + Settings-reference (cvars-by-category) -- and drops the guide sections (those are wiki).

Category-as-filter handles the heterogeneous, lopsided taxonomies for free (ezQuake's 1,400-cvar HUD group is just a filter value). Category-granularity curation (splitting oversized groups, curating to a topical handful) is a later refinement, not v1.

## 6. Per-entity rendering (the card)

**Collapsed row -- aligned columns:** `Name | Type | Default | Description-preview`. One line, columns aligned vertically (no zigzag). Description truncates to its first sentence if long (65% are already <= 80 chars, so most show in full).

**Type word -- player-facing, derived (not the raw dev type):**

- **toggle** <- boolean (on/off)
- **choice** <- enum, OR any non-boolean carrying a discrete value list (e.g. `teamplay`: raw type integer, 3 listed values)
- **number** <- integer or float without a value list (whole or decimal)
- **text** <- string without a value list

The precise raw type (integer/float/enum/...) stays visible in the expanded card. Rationale: the audience is players, not developers ("boolean/float" is dev language).

**Inline expansion** (operator's pick) -- the row opens in place. Expanded card:

- Full description
- **Remarks** -- separate L1 field (caveats/status, e.g. "EXPERIMENTAL.", "Server-side."); shown when present
- **Values** -- value-by-value list; shown when present
- **Meta strip** -- category, source link, version history (ezQuake), and the "Used in: [wiki guide]" cross-link (when a note anchors it)

**Cross-links:**

- **cvar -> cvar** -- cvar names mentioned inside descriptions are auto-linked at build time against the known entity list (rendered green-dotted).
- **entity -> wiki** -- the "Used in" link is a reverse-lookup: a concept note declares its `related_entities` (typed L1 anchors); the docs build reverse-indexes them. The link renders ONLY when a note actually anchors the entity, so there are **no dead "coming soon" links** before the wiki has content -- they appear as notes land.

## 7. Free enhancements

- **Source links** -- v1 (data exists: `source_ref`).
- **Version-walk** -- v1, ezQuake-only (18 tags v3.0 -> head; the only codebase with real history). Graceful: "current only" elsewhere. The snapshot already carries `first_seen` / `last_seen` / `default_history` per entity.
- **Cross-engine browsing** (compare a cvar across ezQuake / FTE / QWCL) -- deferred.
- **Ranges (min/max for numbers)** -- NOT available and NOT v1. L1's `min_bound`/`max_bound` columns are empty; ezQuake bounds live in `OnChange` clamp logic (only ~4% of numeric cvars have an OnChange, often with computed bounds), so they are not declaratively extractable. A targeted backfill is possible later (column + downstream plumbing already exist).

## 8. Search

VitePress built-in local search for v1. Faceted / cross-engine search later.

## 9. Stack, build, deploy

- **VitePress** (Vite + Vue) + **Tailwind v4 + daisyUI tokens** (adopt vikpe's theme for federation cohesion). Presentation decoupled from data -- dumb components take data and render; data-fetching / state / logic live in their own modules -- so the UI layer can later swap to infiniti's Solid + daisyUI component platform without touching logic.
- **`apps/docs-web`** -- its own pnpm-workspaces subtree (the qw-oracle backend stays `npm --no-workspaces`; no conflict).
- Pipeline: L1 export (build-snapshot) -> VitePress build -> **Cloudflare Pages**. **Manual deploy** for v1 (automate on-extract later). vikpe points the `docs.quake.world` subdomain (the scheduler.quake.world pattern).

## 10. Out of scope (v1)

FTE; concept-note authoring / the wiki narrative (separate arc; docs only cross-links to it); cross-engine browsing; faceted search; ranges; category-granularity curation; automated deploy; community-data integration.

## 11. Decisions (locked)

- **D1** -- docs = L1 reference only; narrative lives in the wiki, cross-linked. No narrative authored in docs.
- **D2** -- 6 codebases v1 (ezQuake/KTX/MVDSV/QTV/QWFWD/QWCL); FTE deferred.
- **D3** -- IA is per-codebase, per-type filterable lists with category-as-filter (Flat + Grouped toggle), NOT static category pages.
- **D4** -- Entity rendering: aligned columns, inline expansion, card = description + remarks + values + meta.
- **D5** -- Player-facing type words (toggle/number/choice/text) derived from raw type + value-list presence; raw type shown on expand.
- **D6** -- Export by extending build-snapshot (3rd consumer); VitePress consumes data files + Vue components.
- **D7** -- Cross-links: cvar->cvar auto-linked at build; entity->wiki via reverse-lookup on concept-note `related_entities`; no dead links pre-wiki.
- **D8** -- v1 enhancements: source links (all) + version-walk (ezQuake). Cross-engine, ranges deferred.
- **D9** -- Search = VitePress local search v1.
- **D10** -- Stack = VitePress + Tailwind/daisyUI tokens in `apps/docs-web` (pnpm); presentation decoupled from logic for later infiniti port; CF Pages; manual deploy v1; vikpe DNS.
- **D11** -- Graceful degradation is the universal pattern: every field/enhancement renders where data exists, omits cleanly where it does not.

## 12. Suggested phasing (for arc-planner)

1. **L1 export pipeline** -- extend build-snapshot to all 6 codebases; define + freeze the per-codebase JSON export shape.
2. **VitePress scaffold + ezQuake template** -- `apps/docs-web` (pnpm, daisyUI tokens); build the full entity model on ezQuake (browse lists, category filter, inline cards, type words, source links, version-walk).
3. **Fan-out to the other 5 codebases** -- graceful degradation per each one's data.
4. **Cross-links + enhancements** -- cvar auto-link, wiki reverse-lookup, source links wired.
5. **Cloudflare Pages deploy + vikpe DNS**.

## 13. Verified data appendix (2026-06-09)

Entity inventory (source_backed), per codebase:

| Codebase | Entities |
|---|---|
| ezQuake | 2743 cvar, 624 command, 148 keyname, 83 hud_element, 66 macro, 65 cmdline, 50 flag_bit, 33 token_primitive, 30 asset_category, 6 ruleset |
| KTX | 1196 log_template, 358 command, 275 cvar, 56 info_key, 7 match_event |
| MVDSV | 691 log_template, 183 cvar, 108 command, 105 protocol_message, 93 qc_builtin, 45 info_key, 11 cmdline |
| QWCL | 187 cvar, 121 command, 72 cmdline |
| QTV | 40 cvar, 12 command |
| QWFWD | 29 command, 13 cvar, 6 info_key, 2 cmdline |
| FTE (deferred) | 2482 cvar, 556 command, 108 cmdline, 67 macro, 38 cvar_alias, 28 asset_category |

Raw cvar type vs value-list (ezQuake head), the basis for the friendly type word:

| Raw type | total | with value list |
|---|---|---|
| boolean | 859 | 312 |
| float | 732 | 54 |
| string | 725 | 66 |
| integer | 299 | 44 |
| enum | 169 | 168 |

Version coverage: ezQuake 18 tags (v3.0 -> head); FTE 2 (build-6698 + head, deferred); KTX/MVDSV head-only; QTV/QWCL/QWFWD single frozen snapshot.
