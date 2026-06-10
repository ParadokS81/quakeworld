# docs.quake.world -- locked cross-cutting decisions

These choices apply to every phase. If any phase needs to deviate, surface a
"Deviation" section at the top of that phase MD and stop for operator review.
Mid-arc amendments land here as dated amendment blocks; never silently override
in a phase MD.

**D1-D11 are lifted verbatim from the design spec** (`docs/superpowers/specs/2026-06-09-docs-quake-world-design.md` section 11). They are product decisions, locked at brainstorm exit. **D12-D21 are build/execution decisions** added by arc-planner -- they are not in the spec; they are derived from the spec body, the federation roadmap, the live `build-snapshot.ts`, and the precursor's verified gotchas. They translate the product decisions into commitments the phase drafters need.

---

## Product decisions (verbatim from spec, locked)

## D1. docs = L1 reference only

**Decision:** docs = L1 reference only; narrative lives in the wiki, cross-linked. No narrative authored in docs.

**Implication:** No phase authors prose explanation, how-to guides, or concept content. Everything rendered is auto-projected from L1. The only "writing" is the cross-link wiring (D7).

**Amendment 2026-06-09 (cross-arc guides-portal retarget):** The "narrative lives in the wiki" clause is SUPERSEDED. A post-lock brainstorm moved player-facing GUIDES (= L3 concept notes, deterministically rendered from L3, not hand-authored pages) onto docs.quake.world itself, as a user/admin guides portal organized by domain/feature. docs still authors NO narrative -- it remains a projection surface; the narrative is now projected from L3 onto docs, instead of living on the wiki. The wiki narrows to social/strategy/culture only (player bios, clan/tournament history, tactical debate); it no longer hosts factual feature/config guides. Corrected scope: "docs = L1 reference only" becomes "docs v1 = the L1 per-codebase reference projection (THIS arc); the L3 guides portal is a LATER docs-web surface, downstream of the concept-notes arc `2026-06-09-demand-driven-l3-concept-authoring`." v1 ships UNCHANGED -- no guides portal in v1 (no guides exist to render yet).

## D2. 6 codebases v1

**Decision:** 6 codebases v1 (ezQuake/KTX/MVDSV/QTV/QWFWD/QWCL); FTE deferred.

**Implication:** FTE is out of every phase. The architecture must degrade to a flat searchable list for FTE when it arrives later (no rework) -- so do not hardcode the 6-codebase set in a way that a 7th can't slot into (D14 makes this concrete).

## D3. Per-codebase, per-type filterable lists

**Decision:** IA is per-codebase, per-type filterable lists with category-as-filter (Flat + Grouped toggle), NOT static category pages.

**Implication:** One browse view per entity type per codebase. Category is a filter/group value inside that view, not a separate page. The Flat/Grouped toggle and free-text search are view-level interactivity (Vue, not static markdown).

## D4. Entity rendering: aligned columns + inline expansion

**Decision:** Entity rendering: aligned columns, inline expansion, card = description + remarks + values + meta.

**Implication:** Collapsed row is `Name | Type | Default | Description-preview`, columns aligned vertically (no zigzag). The row expands in place (not a modal, not a separate page). Expanded card carries full description + remarks (when present) + values (when present) + meta strip (category, source link, version history, Used-in cross-link).

## D5. Player-facing type words

**Decision:** Player-facing type words (toggle/number/choice/text) derived from raw type + value-list presence; raw type shown on expand.

**Implication:** The collapsed-row Type column shows the friendly word, not the dev type. See D18 for the locked derivation mapping. Raw type (boolean/integer/float/string/enum) appears only in the expanded card.

## D6. Export by extending build-snapshot

**Decision:** Export by extending build-snapshot (3rd consumer); VitePress consumes data files + Vue components.

**Implication:** Do NOT write a new export pipeline. Extend `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`. The exported JSON is the contract; the Vue layer iterates freely on top. See D12-D13 for the exact extension shape and the hard gate.

## D7. Cross-links

**Decision:** Cross-links: cvar->cvar auto-linked at build; entity->wiki via reverse-lookup on concept-note `related_entities`; no dead links pre-wiki.

**Implication:** cvar names inside descriptions become links at build time. The "Used in" wiki link is a reverse-index over concept-note `related_entities`; it renders ONLY where a note actually anchors the entity, so there are zero "coming soon" dead links. See D19 for scope.

**Amendment 2026-06-09 (cross-arc guides-portal retarget):** The entity->"Used in" cross-link RETARGETS from the wiki to the docs.quake.world guides portal (same site as the reference). MECHANISM UNCHANGED -- still a build-time reverse-index over concept-note `related_entities`, still rendering only where a note actually anchors the entity (zero dead links). Only the destination changes: wiki -> docs guides portal. The cvar->cvar within-codebase auto-link is UNAFFECTED. Renders nothing in v1 (no concept notes shipped yet), so it is dormant in v1 either way.

## D8. v1 enhancements

**Decision:** v1 enhancements: source links (all) + version-walk (ezQuake). Cross-engine, ranges deferred.

**Implication:** Source links render for every codebase (data exists: `source_ref`). Version-walk renders ezQuake-only (the only codebase with real history: 18 tags). Everywhere else degrades to "current only." Cross-engine browsing and min/max ranges are NOT in any phase.

## D9. Search

**Decision:** Search = VitePress local search v1.

**Implication:** Use VitePress built-in local search. Do not build faceted or cross-engine search. The interactive list filter/search (D3) is separate from VitePress's site-wide search and is the view-level concern.

**Amendment 2026-06-10 (F18 -- VitePress search does not index the entity pages):** The Phase-4 floor-check found VitePress local search indexes only prose pages -- the data-driven browse pages (the ~5000 L1 entities, rendered by a Vue component with no markdown text) are invisible to it, so the built index carries `documentCount:1` (home page only). v1 search is therefore RESHAPED: VitePress local search stays for prose/nav, PLUS the F14 pre-deploy pass BUILDS a custom global entity-search -- MiniSearch over the docs JSON (D13 uniform records), a build-time index module (D15: index in a pure module, dumb search component), results linking to the D22 per-entity anchors. Operator chose this (option b) over per-page-filter-only (option c), 2026-06-10. The D9 "do not build faceted/cross-engine search" line still holds for FACETED / cross-fork search; a flat global name+description entity search is NOT that -- it is the minimum a reference site needs to be usable. Owned by the F14 pre-deploy pass (F18).

## D10. Stack

**Decision:** Stack = VitePress + Tailwind/daisyUI tokens in `apps/docs-web` (pnpm); presentation decoupled from logic for later infiniti port; CF Pages; manual deploy v1; vikpe DNS.

**Implication:** VitePress (Vite + Vue) + Tailwind v4 + daisyUI tokens (adopt vikpe's theme). New `apps/docs-web` subtree. Presentation/logic decoupling is a build constraint, not a nicety (D15). Cloudflare Pages, manual deploy for v1, vikpe points the subdomain.

**Amendment 2026-06-10 (D10 "adopt vikpe's theme" -- verified ALREADY SATISFIED, no swap):** Diffed the live docs theme against vikpe's vendored source (`research/repos/slipgate/web/apps/website/src/styles/main.css`). The docs `quakeworld` daisyUI theme is a byte-identical port of vikpe's `quakeworldz`: same palette (slate-950 base, blue-600 / purple-600 / pink-600 primary/secondary/accent, sky/green/yellow/red status), same radii (0.5rem), border (1.5px), depth/noise 0. vikpe's only extra (`_quake.css`) is QW-CONTENT helpers -- player-name color codes + conchar charset sprites -- irrelevant to an L1 reference site; no custom fonts. His daisyUI `include:` carries `menu` (the exact class behind the F14 nav bug) and LACKS `card` (which docs use), so the docs include list is the correctly-adapted version -- do NOT adopt vikpe's include wholesale (it would reintroduce the nav bug). Net: the F14 pre-deploy pass contains NO theme swap; D10 is CLOSED. Any look-and-feel change is the F14 density/spacing polish item (presentation tuning on the existing theme), not a theme adoption.

## D11. Graceful degradation is the universal pattern

**Decision:** Graceful degradation is the universal pattern: every field/enhancement renders where data exists, omits cleanly where it does not.

**Implication:** Every phase respects this. No field is mandatory in the render. A codebase with no type badge, no value list, no version history, no category renders cleanly with those elements simply absent. This is the cross-cutting rule that lets one renderer serve all 6 (soon 7) codebases.

---

## Build / execution decisions (arc-planner; derived, not in spec)

## D12. build-snapshot extension shape (HARD GATE: do not break slipgate)

**Decision:** The docs export is a NEW emit target inside `build-snapshot.ts`. It writes a uniform per-codebase docs JSON into a **docs-owned output directory** (`apps/docs-web/data/` -- final path bikeable in Phase 1). The existing ezquake / qwcl / qw emitters that write into `apps/slipgate-app/src/lib/config/data/` are **NOT modified in shape**. slipgate reads those exact files; their structure, field names, and the `--no-args` default output dir stay byte-compatible.

**Why:** `build-snapshot.ts` currently dispatches by project and THROWS for ktx/mvdsv/qtv/qwfwd/fte (line 743). slipgate is consumer #1 of the ezquake/qwcl/qw paths. The handoff names "don't break slipgate's snapshot consumption" as the Phase 1 hard gate.

**Implication:** Phase 1 adds code; it does not rewrite the existing emitters' output. The cleanest path is a separate docs emit path (new functions + a docs output dir), so slipgate's files are untouched by construction. Phase 1's verification regime MUST include a slipgate-parity probe: the ezquake/qwcl/qw files in slipgate's data dir are byte-identical (or shape-identical) before and after the Phase 1 change. If touching a shared helper is unavoidable, the probe is the gate.

## D13. Uniform docs record shape + generic per-type emitters

**Decision:** The docs export emits, per codebase, a uniform per-type record for every entity: `{ name, friendly_type, raw_type, default, description, remarks, values, category, source_ref, first_seen, last_seen, default_history }`. Fields are omitted (not null-filled) when the underlying L1 data is absent. The emitter is **generic per type**: it reads `entities` joined to the type's `*_versions` table for ANY project, projecting the common subset. It is not an ezquake-special path generalized after the fact.

**Why:** D11 (graceful degradation) is cleanest when degradation is a property of the DATA shape, not just the render. A uniform record where absent fields are simply missing means the renderer never branches on codebase. Generic emitters mean adding KTX's `log_template` or MVDSV's `protocol_message` is a config addition, not new emit code.

**Implication:** Phase 1 builds the generic emitter once and lists which (codebase, type) pairs to emit (from the spec's verified data appendix, section 13). The friendly_type derivation (D18) and category resolution (D17) happen here at export time OR in a pure frontend data module -- Phase 1 locks which. Default: derive friendly_type and resolve category in the frontend data module (keeps the export a faithful L1 projection; keeps derivation logic in the swappable-frontend's logic layer per D15).

## D14. Type-generic, codebase-generic renderer

**Decision:** The browse-view and entity-card Vue components are type-agnostic and codebase-agnostic. They take a list of uniform records (D13) + a small per-type/per-codebase config (which columns, which label) and render. Adding an entity type or a codebase is a **data + config addition, never new component code**.

**Why:** This is what makes Phase 3 (fan-out to 5 codebases) cheap and makes FTE's later arrival (D2) rework-free. It is also the structural expression of "graceful degradation" (D11): one renderer, many data shapes.

**Implication:** Phase 2 builds the generic renderer and proves it on ezQuake (the richest data). Phase 3 feeds the other 5 codebases' data through the SAME components. If Phase 3 finds itself writing per-codebase component code, that is a Phase 2 design failure -- escalate, do not paper over.

## D15. Presentation / logic decoupling (the infiniti-port constraint)

**Decision:** Vue components are "dumb": props in, rendered DOM out, no data-fetching and no business logic. All data-fetching, state, and derivation (friendly-type mapping, cvar-link resolution, wiki reverse-index, category grouping, search/filter) live in their own non-Vue modules (plain TS). The component layer can later swap to infiniti's SolidJS + daisyUI platform without touching any logic.

**Why:** Roadmap-locked. infiniti's deliverable is a component platform (same stack: Solid + daisyUI + pnpm), unfinished -- do not build on it yet, but keep the eventual port a same-stack component swap by never coupling logic to presentation.

**Implication:** Every phase that adds frontend code respects the split. A phase MD that puts a `fetch` or a `.filter()` derivation inside a `.vue` `<script>` is drifting -- the verifier flags it. daisyUI tokens (CSS classes) are framework-agnostic and DO cross the line; component code does not.

## D16. Snapshot version per codebase (verified gotcha)

**Decision:** The docs export reads each codebase at its frozen snapshot version: ezquake `head`, mvdsv `head`, ktx `head`, qtv `1.16-dev`, qwfwd `1.40-dev`, qwcl `2.33` (matching `PROJECT_DEFAULT_SNAPSHOT_VERSION` in build-snapshot.ts). It does NOT read `head` for qtv/qwfwd/qwcl.

**Why:** The precursor wrote `category_inferred` to ALL version rows per entity, but qtv/qwfwd/qwcl carry two version rows each (frozen + `head`) and the snapshot reads the frozen one. Emitting `head` for those three would read rows where the category is present but the snapshot consumer expects the frozen label, and risks a mismatch. The precursor's `taxonomy.md` records this explicitly.

**Implication:** Phase 1's emitter dispatch uses the per-codebase default version. A verification probe confirms category coverage is non-empty for qtv/qwfwd/qwcl at their frozen versions (catches the "wrote head, read frozen" inversion).

## D17. Category source per codebase

**Decision:** ezQuake category = `cvar_versions.help_group_id` / `command_versions.help_group_id` resolved against the extractor AST `groups` taxonomy (43 source-groups). The other 5 codebases = `category_inferred` on `cvar_versions` / `command_versions` (MVDSV 14, KTX 13, QTV 7, QWFWD 5, QWCL 16 inherited). The projection rule: **ezQuake reads `groups`; everyone else reads `category_inferred`.** Entity types with no category column (info_key, cmdline_param, log_template, protocol_message, qc_builtin, match_event, ...) render uncategorized.

**Why:** Two different category mechanisms exist in L1 -- ezQuake's source-derived help-groups vs the LLM-derived `category_inferred` the precursor shipped for the other codebases. The docs export must read the right one per codebase.

**Implication:** The generic emitter (D13) special-cases ONLY the category-source read (ezQuake AST groups vs `category_inferred`); everything else is uniform. Uncategorized types degrade to a single "(uncategorized)" group in the Flat/Grouped toggle (D3).

## D18. Friendly type-word mapping (locked)

**Decision:** The friendly type word (D5) derives from raw type + value-list presence:

- **toggle** <- boolean (on/off)
- **choice** <- enum, OR any non-boolean carrying a discrete value list (e.g. `teamplay`: raw integer, 3 listed values)
- **number** <- integer or float without a value list
- **text** <- string without a value list

Derived in a pure data module (D15), not inside a component. Raw type stays visible in the expanded card.

**Why:** The audience is players, not developers; "boolean/float" is dev language. Verbatim from spec section 6.

**Implication:** Type badge + value-list are ezQuake/QWCL-only at the L1 source (data appendix). Codebases without a `help_type` degrade to no friendly type word in the collapsed row (the Type column is simply blank). The derivation module is unit-coverable in isolation (pure function).

**Amendment 2026-06-10 (Phase 2a recon -- value-list is ezQuake-only at the L1 source):** The implication line above ("Type badge + value-list are ezQuake/QWCL-only") is HALF-STALE. Corrected against the live Phase-1 emit (verified across all 20 files / 5016 records, 2026-06-10):
- **Type badge (`raw_type`)** -- ezQuake + QWCL, as stated (ezQuake cvar: boolean 843 / enum 166 / float 718 / integer 295 / string 721; QWCL cvar: boolean 112 / float 30 / integer 35 / string 10 -- QWCL has NO `enum`).
- **Value-list (`values`)** -- ezQuake cvar ONLY (624 of 2743 carry one). QWCL emits ZERO `values` arrays (0 of 187). The spec data-appendix line the original implication paraphrased was stale on this point.

Consequence for the 2b friendly-type derivation (D18 mapping): QWCL's reachable friendly types are **toggle / number / text only**. `choice` is UNREACHABLE for QWCL in v1 -- both `choice` branches are empty for it (no `enum` raw_type, no value-list). `lib/derive.ts` and its unit tests should treat `choice` as an ezQuake-only outcome in v1. The MAPPING rules themselves (toggle/choice/number/text <- ...) are UNCHANGED and correct; only the stale "QWCL has value-lists" implication is corrected. Phase 2a's `lib/types.ts` already encodes this (`values?` = "ezquake cvar ONLY", `raw_type?` = "ezquake + qwcl ONLY"); this block lands the same correction in the contract so the 2b drafter does not re-derive from the stale line.

## D19. Cross-link scope

**Decision:** cvar->cvar auto-linking resolves a mentioned cvar name against **the same codebase's** entity-name set only (not cross-fork). The entity->wiki "Used in" reverse-index is built at docs-build time from concept-note `related_entities` (typed L1 anchors); a link renders only where a note actually anchors that entity.

**Why:** Forks share cvar names but can differ in meaning; a cross-fork auto-link would assert a false equivalence. The wiki reverse-index keeps the "no dead links" guarantee (D7) -- links appear as notes land, never before.

**Implication:** Phase 4 builds both indexes as pure build-time data modules (D15). The cvar-link resolver takes (codebase, description-text) and returns linked spans. The wiki reverse-index reads the concept-note corpus (`apps/qw-oracle/curated/`) at build; if the corpus is unavailable at docs-build time, the index is empty and all "Used in" links simply omit (graceful, D11).

**Amendment 2026-06-09 (cross-arc guides-portal retarget):** The "entity->wiki Used in reverse-index" RETARGETS to the docs.quake.world guides portal. The reverse-index still reads the concept-note corpus (`apps/qw-oracle/curated/`) at docs-build time and still omits cleanly when the corpus is unavailable; only the link DESTINATION changes (wiki -> docs guides portal). cvar->cvar within-codebase resolution is unchanged. Phase 4 (not yet drafted) carries this retarget; the entity->guide index is dormant in v1 until concept notes ship. NOTE: this arc does NOT read or write `apps/qw-oracle/curated/` content -- it only reverse-indexes the notes' `related_entities` front-matter at build time; the L3 authoring is the separate `2026-06-09-demand-driven-l3-concept-authoring` arc.

## D20. apps/docs-web is its own pnpm-workspaces subtree

**Decision:** `apps/docs-web` is a standalone pnpm-workspaces project. The qw-oracle backend stays `npm --no-workspaces` (no conflict -- separate subtrees). The slipgate `src-tauri` rsync hook constraint does NOT apply here (this is not slipgate); docs-web work needs no Windows toolchain.

**Why:** Roadmap-locked: scaffold frontends as pnpm-workspaces so infiniti's package drops in as a workspace dependency cleanly later. Graduation to vikpe's monorepo stays a later option.

**Implication:** Phase 2 scaffolds with pnpm + corepack. No interaction with slipgate's build hooks. The arc's git work is plain commits to `main` (operator does not touch git).

## D21. Non-goals (v1) -- restated as a gate

**Decision:** Explicitly NOT in this arc: FTE; concept-note / wiki authoring (separate arc; docs only cross-links to it); cross-engine browsing; faceted search; min/max ranges; category-granularity curation (splitting oversized groups); automated deploy; community-data integration.

**Why:** Spec section 10. Keeps v1 tractable.

**Implication:** If a phase drifts into one of these, it is scope creep -- flag it and stop for operator review. The README's "what this arc does NOT cover" section points here.

**Amendment 2026-06-09 (cross-arc guides-portal retarget):** Still holds -- concept-note / L3-guide authoring is the SEPARATE arc (`2026-06-09-demand-driven-l3-concept-authoring`); this arc only cross-links to it. Clarification: "it" now = the L3 guides rendered on docs.quake.world (the same site, a LATER docs-web surface), NOT the wiki. The guides portal surface itself is NOT in this arc's v1 scope (v1 = L1 reference, Phases 1-3, plus the dormant entity->guide reverse-index in Phase 4).

## D22. Stable per-entity anchors/routes (the guide->entity link target)

**Decision:** Every reference page exposes a STABLE, deep-linkable per-entity anchor/route -- deterministic from identity (codebase + type + the case-folded name), stable across rebuilds -- so a guide->entity link resolves to a specific entity, not just a list page. Designed in from Phase 2b; NOT retrofitted later.

**Why:** Cross-arc contract `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` (the guide->entity direction): a concept note's `related_entities` link INTO the per-codebase reference, which requires stable per-entity anchors. This is the reverse half of the D7/D19 entity->guide wire. A stable scheme chosen up front costs nothing; retrofitting anchors after routing/render is built is expensive. Use the case-insensitive fold (`lower(name)`; the v1 types are all case-folded -- `token_primitive`, the lone case-significant type, is not in v1) so the anchor is case-stable.

**Implication:** Phase 2b assigns each entity a stable anchor from its identity; Phase 3's fan-out inherits the same scheme (codebase-generic per D14). The guide->entity LINKS themselves belong to the later guides-portal surface (not docs v1) -- but the anchors they target are a v1 design constraint, so the portal needs zero reference rework. Phase 4 ships the cvar->cvar links + the (dormant) entity->guide reverse-index; it does NOT build guide->entity links in v1. Contract-derived 2026-06-09; not from the original spec.

---

## Amendment log

### 2026-06-09 -- cross-arc guides-portal retarget (D1, D7, D19, D21)

A post-lock brainstorm (companion cross-arc contract being written at `contracts/active/` by the `2026-06-09-demand-driven-l3-concept-authoring` planner -- canonical record once present) moved player-facing guides (= L3 concept notes, deterministically rendered from L3) to render ON docs.quake.world as a user/admin guides portal, narrowed the wiki to social/strategy/culture only, and retargeted the entity->"Used in" cross-link from the wiki to the docs guides portal (same reverse-index mechanism, new destination). Full dated blocks are inline under D1, D7, D19, D21 above.

Net effect on THIS arc: framing correction + cross-link retarget ONLY. v1 scope is UNCHANGED -- L1 reference, Phases 1-3 exactly as planned; the guides portal is a later docs-web surface downstream of the concept-notes arc; the entity->guide reverse-index (Phase 4) is dormant in v1 (nothing to render until concept notes ship). Phase 1 (drafted) is unaffected (L1 JSON export, no cross-links). The pre-written scaffold prompts `phase-4-drafter-prompt.md`, `handoff-prompt.md`, and `phase-template.md` were RETARGETED 2026-06-09 (wiki -> docs guides portal; entity->guide dormant-in-v1 framing). **D22** (above) was added the same day for the guide->entity stable-anchor requirement the contract places on this arc (Phase 2b owns it).

### 2026-06-10 -- Phase 2a recon correction (D18)

Phase 2a drafting verified the docs-snapshot contract against the live Phase-1 emit and found D18's "value-list ... ezQuake/QWCL-only" implication half-stale: value-lists are ezQuake-ONLY (QWCL carries `raw_type` but zero `values`). Dated block inline under D18. Net effect: one 2b derivation note (`choice` is ezQuake-only in v1) -- NO change to the friendly-type mapping rules and NO change to v1 scope. Phase 2a `lib/types.ts` already encodes the corrected shape; this lands it in the contract.
