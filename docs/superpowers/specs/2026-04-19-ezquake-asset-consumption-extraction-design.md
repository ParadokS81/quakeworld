---
Doc type: current - Design spec. Delete/archive once the extraction lands and the schema stabilizes, or once it is superseded by a revised Phase 3 schema spec.
---

# ezQuake Asset-Consumption Extraction - Design Spec

**Date:** 2026-04-19
**Status:** Draft. Awaiting user review before implementation planning.
**Scope:** Extract ezQuake's filesystem-consumption behavior into `knowledge.db`. Adds new entity types and rule tables alongside the existing cvar / command / macro / cmdline_param / keyname / hud_element / ruleset / token_primitive inventory.
**Phase:** Provisional Phase 2c.6 (extends ezQuake coverage before the Phase 2d FTE port). Final phase number is the user's call.

## Related docs

- Oracle architecture spec: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`
- Existing schema spec: `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` (this spec proposes a v2 -> v3 bump)
- Phase 2c.5 plan (immediate predecessor): `docs/superpowers/plans/2026-04-19-qw-knowledge-phase-2c5.md`
- Companion consumer spec (motivation): `apps/slipgate-app/docs/superpowers/specs/2026-04-19-quake-dir-browser-vision-design.md`
- libclang extraction pattern reference (memory): `reference_libclang_ezquake_extraction.md`
- HANDOVER.md entry: "Quake-dir browser vision + oracle prerequisite"

## Motivation

The slipgate app's forthcoming dir browser ("MyQuake Browse") needs authoritative, source-derived answers to questions that today nobody has codified:

- What file types does ezQuake read, and from where?
- What is the search-path precedence across `id1/`, `qw/`, and any `gamedir` mod?
- When the same filename exists loose, inside a `.pak`, and inside a `.pk3`, which wins?
- Which cvars resolve to filesystem paths (crosshair image, custom conchars, HUD pics, sound overrides, etc.)?
- Which assets are **loaded at startup** vs **consumed on demand** (maps, per-connect skins, downloaded content)?

Without this, slipgate would have to hardcode QW filesystem lore inline, duplicating knowledge that properly belongs in the shared knowledge base. With it, every consumer (slipgate today, MCP tools tomorrow, future clients) reads the same facts.

This extraction is also intrinsically useful to oracle on its own: MCP queries like "how does ezQuake find custom skins" or "what is the load order for paks" become answerable with citations to actual source lines.

## Scope

**In scope (ezQuake only):**

- File I/O call-site inventory: `FS_LoadFile`, `FS_FOpen*`, `COM_FOpenFile`, texture loaders, skin loaders, sound loaders, model loaders. Captures what functions read what.
- Search-path model: `id1` -> `qw` -> `<mod>` stack, how `gamedir` manipulates it, how `-basedir` / `-path` cmdline params feed in.
- Archive precedence: `.pak` vs `.pk3` vs loose file rules; numeric vs lexicographic pak ordering; "last loaded wins" vs reverse.
- Cvar -> asset bindings: the subset of cvars (already in `knowledge.db`) whose *values* resolve to file paths. Builds a join table, not new cvars.
- Asset category catalog: canonical list (conchars, crosshairs, textures, skins, sounds, models, maps, wads, paks, demos, screenshots, HUD overlays, configs, plus an `other` bucket identity).
- Extension -> category mapping (`.tga`/`.png`/`.jpg` -> texture variants, `.wav` -> sound, `.mdl` -> model, etc.).

**Out of scope (separate phases):**

- MVDSV / KTX / FTE asset extraction. Pattern applies but lands in Phase 2d and Phase 2e once this validates the approach for ezQuake.
- Slipgate-side consumption. The dir browser that reads from this data has its own vision spec and will get its own implementation plan after this extraction ships.
- Layer 3 concept notes ("what is a conchar", "the history of `.wad`"). Those are the qw-oracle wiki track, written after the Layer 1 facts exist.
- Runtime classification of a specific user's dir. That is slipgate's job; oracle ships the **rules**, not the filesystem scanner.

## Proposed schema additions (v2 -> v3)

Four new entity / rule concepts. All additive; no existing tables change shape.

### `asset_categories`

Canonical list of QW asset categories. One row per category, versioned like other entities.

| Column | Type | Notes |
|---|---|---|
| `canonical_id` | TEXT PK | `ezquake:asset_category:skin` etc. |
| `name` | TEXT | Short lowercase handle. |
| `display_name` | TEXT | `Player Skins` etc. (UI label). |
| `description` | TEXT | Sentence-long summary. |
| `source_state` | TEXT | `implemented` / `doc_only` (same convention as existing entities). |
| `notes` | TEXT | Free-form. |

Version-state table `asset_category_versions` mirrors the existing per-type pattern (one row per category per version).

### `asset_extensions`

Extension -> category mapping. Not strictly 1:1 (`.tga` can be a texture or a conchar; disambiguated by path).

| Column | Type | Notes |
|---|---|---|
| `extension` | TEXT | `.tga`, `.pak`, `.pk3`, `.wad`, `.mdl`, `.wav`, etc. |
| `category_id` | FK -> `asset_categories.canonical_id` | |
| `path_hint` | TEXT NULL | e.g. `textures/`, `skins/` - when the *path* qualifies which category the extension belongs to. |
| `notes` | TEXT | |

Not a flat lookup; the consumer (slipgate) matches `(extension, path_hint)` against actual files. When `path_hint` is null, the extension uniquely determines the category.

### `asset_path_rules`

Search-path and precedence rules. Ordered.

| Column | Type | Notes |
|---|---|---|
| `canonical_id` | TEXT PK | e.g. `ezquake:path_rule:gamedir_stack`. |
| `rule_kind` | TEXT | `search_path`, `archive_precedence`, `cmdline_override`, `gamedir_behavior`. |
| `ordinal` | INT | Rule precedence (lower = applied first). |
| `description` | TEXT | Prose description of the rule. |
| `source_ref` | TEXT | `src/fs.c:412` or equivalent pointer to origin. |
| `notes` | TEXT | |

This is where the pak-vs-pk3-vs-loose-vs-gamedir knot gets unpicked, documented, and pinned to source. The slipgate consumer reads these ordered rules to compute "which file wins."

### `asset_cvar_bindings`

Join table: cvar -> asset category + optional path pattern.

| Column | Type | Notes |
|---|---|---|
| `cvar_id` | FK -> `entities.canonical_id` | Must already exist in the cvar table. |
| `category_id` | FK -> `asset_categories.canonical_id` | |
| `path_pattern` | TEXT NULL | `skins/{value}.pcx` etc. `{value}` slot = cvar current value. |
| `load_trigger` | TEXT | `startup`, `on_demand`, `on_connect`, `on_map_load`. |
| `source_ref` | TEXT | Source call site where the cvar's value gets used to build a path. |
| `notes` | TEXT | |

This table is the bridge between oracle's existing cvar inventory and the new asset model. It is also the hardest part to extract cleanly - see "Extraction approach" below.

### `asset_loader_sites`

File-I/O call site inventory. One row per distinct source location that reads from disk.

| Column | Type | Notes |
|---|---|---|
| `canonical_id` | TEXT PK | e.g. `ezquake:loader_site:fs_loadfile_gfx_wad`. |
| `function` | TEXT | `FS_LoadFile`, `FS_FOpen`, `COM_FOpenFile`, etc. |
| `source_ref` | TEXT | `src/gl_draw.c:281`. |
| `reads_category` | FK -> `asset_categories.canonical_id` NULL | Best-effort inference; may be null for generic loaders. |
| `load_trigger` | TEXT | `startup`, `on_demand`, etc. |
| `path_source` | TEXT | `literal`, `cvar:<id>`, `computed`. |
| `path_literal` | TEXT NULL | When `path_source='literal'`. |
| `notes` | TEXT | |

This is the inventory slipgate uses to answer "is this file referenced by any code path?" - the junk-detection foundation.

### `schema_meta` bump

- `schema_version` bumps to `v3`.
- Loader code needs an idempotent migration step that adds the new tables and seeds the canonical asset_categories rows.

## Extraction approach

Same libclang pattern as Phase 2b/2c/2c.5. Extractor script lives at `packages/qw-config/scripts/extract-ezquake-assets-clang.py`.

### Target call-site patterns

The ezQuake source exposes filesystem access through a handful of well-known functions. The extractor walks the AST of the `ezQuake/src/` tree (client and server parse as existing scripts do) and captures call sites matching:

1. **Generic file I/O**: `FS_LoadFile`, `FS_FOpenFile`, `FS_OpenFile`, `COM_FOpenFile`, `COM_LoadFile`, `COM_FindFile`.
2. **Asset-specific loaders**: `loadtextureimage`, `GL_LoadTexture*`, `Mod_LoadModel`, `S_LoadSound`, `LoadWad*`.
3. **Path-composition calls**: `va("%s/%s", ...)` patterns near file I/O calls - these reveal the path templates.
4. **Cvar reads near file I/O**: `Cvar_Get*` / direct `cvar_t.string` dereferences whose value flows into a path argument.

For each call site, capture: function name, source ref, neighboring string literals (path hints), neighboring cvar references, and the enclosing function context (is this called from `CL_Init`, `Draw_Init`, `Host_Frame`, a connect handler?). The enclosing function drives the `load_trigger` classification (`startup` vs `on_demand` vs `on_connect`).

### Heuristics and confidence

Not every call site is cleanly classifiable. The extractor assigns one of:

- **Certain**: literal path, known loader, known trigger. Most startup asset reads.
- **Heuristic**: cvar-driven path or computed path; category inferred from surrounding function name or path hint.
- **Unclassified**: file I/O happens but category / trigger is unclear. Row still gets written; `notes` records the ambiguity for manual annotation.

The same philosophy as cvar extraction: **log-and-continue on noise, hard-fail on regressions**. A prior run that classified 80% of call sites as certain must not regress to 50% without user confirmation.

### Search-path and precedence rules

Rules aren't individual call sites - they come from reading `fs.c` and understanding the `searchpath_t` linked list, the `com_searchpaths` global, and how `FS_AddGameDirectory` and `FS_LoadPackFile` compose the stack.

This part is **less automatable** than call-site extraction. The implementation plan should include a manual-pass task: read the relevant `fs.c` functions, write the rules by hand into a seed file that the loader ingests. The extractor's job is to confirm the rules still hold in `head` and warn if the relevant function signatures change version-over-version.

### Cvar -> asset binding graph

Hardest automatable pass. Requires data-flow analysis lightweight enough to say "this cvar's string value ends up in this file-I/O call." Three approaches, in order of preference:

1. **Local taint.** If a `cvar_t.string` read is on the same line or within the same statement as a file-I/O call, bind them directly.
2. **Function-local chain.** If a cvar value is assigned to a local variable and that local is passed to a file-I/O call within the same function, bind with reduced confidence.
3. **Manual seed list.** For cvars the extractor can't follow (cross-function, macro-wrapped, dereferenced indirectly), maintain a hand-curated seed list in the extractor. Every known asset-pointing cvar in ezQuake is a small, enumerable set - manual seeding is acceptable for v1.

The extractor reports coverage: "bound 40 of ~60 expected asset cvars automatically; 20 in manual seed list." Over time, as the extractor gets smarter, the seed list shrinks.

## Loader interface (minimal delta)

The existing loader in `apps/qw-oracle/scripts/load-knowledge/` gains:

- A new stage module for asset entities (categories, extensions, path_rules, cvar_bindings, loader_sites).
- Each module mirrors the existing `load-version.ts` idempotent-write pattern.
- No changes to the diff or enrich stages; change-events fire on asset tables the same way they fire on cvar tables.
- CLI gains `npm run load-knowledge -- load-assets` as a peer to `load-version`. Also permissible: roll into `load-version` as an additional stage - user preference.

Loader unit-test fixtures should include a tiny fake ezQuake tree exercising each call-site pattern.

## Expected outputs

Counts-style summary on completion (matching the Phase 2c.5 screenshot format):

| Type | Count (estimate) | Notes |
|---|---|---|
| asset_category | ~15 | Seeded from canonical QW list. |
| asset_extension | ~25 | Extensions with optional path hints. |
| asset_path_rule | ~10 | Search-path, archive-precedence, gamedir-stack rules. |
| asset_cvar_binding | ~40-60 | Cvars that resolve to asset paths. |
| asset_loader_site | ~80-150 | File-I/O call sites across ezQuake source. |

Final counts are discovery-dependent.

Same full per-version history, change events, enrichment pattern as existing entity types.

## Open questions to resolve during implementation

1. **Scope of "loader site" capture.** Include every `FS_LoadFile` call, or only those that land on user-controllable paths? Debug-only dev loaders (e.g. `developer` cvar paths) may or may not be worth indexing.
2. **Mod dir semantics.** When `gamedir` is set, search-path ordering is documented in source but has subtle interactions with the server-issued download flow. Worth a dedicated research task.
3. **Download path classification.** Files arriving via server-side `cl_allow_downloads` land in specific subfolders and are effectively "runtime-acquired." Are they a separate asset state, or a sub-case of "available"?
4. **Interaction with `+exec` cascade.** Some asset paths are set by cvars that are themselves set by user configs. ConfigViewer's resolution machinery already walks the exec chain; the asset model must compose with that at consumption time (slipgate's concern, but the oracle schema must not preclude it).

## Risks

- **Data-flow extraction fragility.** The cvar-binding pass is the hardest part. If automated binding coverage comes in below ~50%, lean heavier on the manual seed list rather than chasing perfect automation for v1.
- **Search-path rules change between versions.** If `fs.c` is refactored upstream mid-rollout, rules captured from `head` may not apply cleanly to older tags. Plan allows for version-scoped rules from the start (same `ordinal`-keyed versioning as other entities).
- **Scope creep.** It is tempting to also model sound subsystems, network resources, etc. Resist - stay focused on filesystem-consumed assets. Other resource kinds are separate extractions.

## What this spec is not

- Not an implementation plan. The plan gets written after this spec is user-approved, following the same pattern as Phase 2b/2c/2c.5.
- Not a commitment to a specific schema field layout. Columns here are the proposed shape; the implementation plan may refine them after reading more source.
- Not the final word on asset consumption across all four clients. MVDSV/KTX/FTE follow the same blueprint in later phases.

## Success criteria

Extraction has succeeded when:

1. `knowledge.db` has the five new tables populated for ezQuake `head`.
2. A slipgate consumer can query "which cvars point at skin paths," "what is the pak search order," and "which loader site reads this category" with a single JOIN-free query each.
3. Change-events fire on asset tables the same way they fire on cvar tables when an ezQuake update moves a loader site or renames a path.
4. Oracle MCP tools can answer "how does ezQuake load custom crosshairs" with citations to `asset_loader_sites.source_ref` and `asset_cvar_bindings.source_ref`.
5. The slipgate dir-browser vision spec is unblocked - its prerequisite list is satisfied.
