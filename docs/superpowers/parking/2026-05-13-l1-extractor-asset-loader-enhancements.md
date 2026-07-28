# L1 extractor capability enhancements -- asset-loader-sites

**Parked:** 2026-05-13
**Source:** asset-type-curate skill skybox slice findings (Phase 2)
**Status:** parked / opportunistic-future

## Why parked

Two extractor enhancements surfaced during the skybox slice. The scope-probe across the 19 remaining seed slugs (2026-05-13) found these patterns are **skybox-near-unique, not systemic**. The enhancements remain valuable but don't justify a dedicated arc right now.

Probe summary:
- Static-array path-template enumeration: 2 of 21 slugs hit the pattern (skybox high-cardinality, map_lighting low-cardinality).
- Multi-mode loader dispatch (cvar/flag-driven): 1 of 21 slugs hits it (skybox FTE only).
- Engine-internal slugs (not user-asset loaders): 6 of 21.
- Empty L1 hint functions / zero sites: 4 of 21 (separate fix -- watchlist expansion, not these enhancements).

## Enhancement 1: static-array path-template enumeration

**Pattern.** A loader function probes N path variants from a `static const char *[][2]` or similar table inside the function body. Current extractor catches the loader call but produces 1 site with `path=null` instead of N templates with concrete paths.

**Affected slugs:**
- **skybox** -- ezQuake `R_LoadSkyTexturePixels` probes 4 prefix variants x 6 face suffixes = 24 templates per load. FTE `Shader_ParseSkySides` probes 4 patterns x 2 suffix sets = 8 path-shapes.
- **map_lighting** -- `LoadColoredLighting` probes 5 hardcoded path templates (`maps/lits/`, `maps/`, `lits/`, plus 2 groupname variants).

**Source pointers:**
- ezQuake: `research/repos/ezquake-source/src/r_brushmodel_sky.c:184-209` (`R_LoadSkyTexturePixels`)
- ezQuake: `research/repos/ezquake-source/src/r_brushmodel_load.c:89` (`LoadColoredLighting`)
- FTE: `research/repos/fteqw/engine/gl/gl_shader.c:651-715` (`Shader_ParseSkySides`)

**Implementation shape.** libclang AST traversal needs to walk static array initializers in the enclosing function's local scope and combine them with the loader call. Two output options to evaluate: produce N sites (high per-site count) OR one site with `path_templates: [...]` array metadata. The metadata option is probably cleaner; preserves 1:1 site-to-callsite mapping.

**Currently compensated by:** the seed YAML hand-carries the templates as `engine_canonical_paths`. Investigators can source-read the static arrays directly during curation. Asset-notes ship honestly without this enhancement.

**Value if shipped:**
- L1 JSON becomes a regression check on the seed (do extractor templates match seed templates?).
- Tightens MCP retrieval for path-precision queries ("what paths does ezQuake probe for skyboxes?").
- Reduces seed maintenance burden over time (templates derive automatically instead of needing seed edits when engines add probe variants).

**Effort estimate:** medium. 1-2 days focused work in `extractor_lib/visitor.py` plus per-engine handler updates. Test cases are concrete (skybox + map_lighting). Risk: AST traversal of static-array initializers may surface edge cases (compile-time-computed indices, nested arrays) that warrant a small spike.

## Enhancement 2: multi-mode loader dispatch discrimination

**Pattern.** A loader function dispatches to multiple distinct load paths via conditional branches (e.g., `if (sh_config.havecubemaps)`, format-detection branches). Extractor catches the sites but can't tag which mode each serves.

**Affected slugs:** only **skybox FTE** (`R_SetSky` runs 3 modes: equirectangular / native cubemap / legacy 6-face based on capability + format detection). Map has BSP-version dispatch but that's file-format detection, a different shape -- not driven by cvars/flags.

**Source pointers:**
- FTE: `research/repos/fteqw/engine/gl/gl_warp.c:73-164` (`R_SetSky`)

**Implementation shape.** Site metadata gets a `mode_predicate` field capturing the conditional branch the site sits inside (e.g., `IF_TEXTYPE_CUBE`, `!sh_config.havecubemaps`). Site enumeration walks the conditional structure.

**Currently compensated by:** the asset-note body's "Cross-engine differences" section discriminates modes in prose. The investigation report carries the full mode-mechanism walkthrough.

**Value if shipped:** lower than Enhancement 1. Skybox is alone on this axis in the current 21-slug corpus. Park indefinitely unless future asset_types hit the pattern.

**Effort estimate:** medium-high. Conditional-branch walking is non-trivial in libclang -- requires careful AST state tracking. Probably 2-3 days work. Not worth it for a single slug.

## Enhancement 3: path-argument analysis for downstream-discriminated loaders

**Surfaced:** 2026-05-13 by Terminal A's watchlist-coverage handoff (commit 1694e3c5).

**Pattern.** A loader function calls a generic primitive that serves multiple asset categories, with discrimination happening downstream via runtime path-template matching. The extractor sees the call but can't tag which category it serves without analyzing the path arguments.

**Affected slugs:** FTE `model_texture`, FTE `map_texture`. Both flow through the same generic shader builders -- `R_BuildDefaultTexnums` / `R_BuildLegacyTexnums` -- which serve every shader-textured asset. Discrimination between "model skin" and "brush texture" happens later inside `Image_LocateHighResTexture` via the runtime path-template list. The path-argument distinguishes `models/` prefix (model_texture) vs `textures/<mapname>/` prefix (map_texture), but this happens at runtime, not at the call-site.

**Source pointers:**
- FTE: `research/repos/fteqw/engine/gl/gl_shader.c:6192` (`R_BuildDefaultTexnums`)
- FTE: `research/repos/fteqw/engine/gl/gl_shader.c:6385` (`R_BuildLegacyTexnums`)
- FTE: `Image_LocateHighResTexture` (downstream discriminator)

**Implementation shape.** Extractor needs to capture the path-argument (literal string, cvar reference, or path template) passed to the loader and apply pattern-matching to discriminate the category. AST-level: trace argument origin back from the call-site to the source (literal, cvar value, format-string assembly). May overlap with Enhancement 1 (static-array enumeration) since both are call-site-data-flow problems.

**Currently compensated by:** the asset-note draft can ship with FTE side noted as "loader-site discrimination happens downstream; see investigation for routing detail." Seed `engine_canonical_paths.fte` for these slugs hand-carries the paths. Asset-notes can flag DIVERGENT with one-engine-only L1 anchors.

**Value if shipped:** unblocks FTE L1 anchors for model_texture and map_texture. Reduces the "ezQuake has sites, FTE has 0" asymmetry in the asset-notes corpus. Likely benefits future asset_types that flow through the same generic shader builders.

**Effort estimate:** medium-high. Path-argument analysis is non-trivial in libclang -- requires data-flow analysis from call-site backward to argument source. Probably 2-3 days for a robust implementation; less for a quick path-literal-only matcher (which would still catch most cases).

## Revisit triggers

Reopen this parking doc when any of the following fires:

- A new asset_type lands in the seed that hits static-array enumeration (bumps Enhancement 1 priority).
- MCP retrieval feedback shows users wanting path-precision answers the seed can't anchor (bumps Enhancement 1).
- More than one asset_type hits multi-mode dispatch (reopens Enhancement 2 consideration).
- More asset_types in FTE go through generic shader builders without enclosing-function discrimination (bumps Enhancement 3 priority).
- A major L1 extractor refactor is underway anyway (fold all three in opportunistically).
- KTX-canonical or unezQuake onboarding (per `[[project_extraction_pipeline_vision]]`) surfaces new patterns.

## What's NOT in this parking doc

Separate L1 work surfaced by the skybox slice:

- **Watchlist expansion** for 4 zero-site slugs (crosshair, levelshot, model_texture, map_texture). This is bounded executor work, not a capability arc. Dispatched to a fresh terminal (see asset-type-curate skill arc prep notes 2026-05-13). Once those slugs have L1 coverage, the bucket fan-out can proceed for them.

## Cross-references

- `apps/qw-oracle/docs/asset-curation/skybox-investigation.md` -- the originating case study with full source-read evidence
- `apps/qw-oracle/curated/asset-notes/skybox.md` -- the asset-note that ships without these enhancements (DIVERGENT flag, compensates via seed)
- `apps/qw-oracle/scripts/extractors/CLAUDE.md` -- three-tier handler architecture
- `[[project_asset_type_curate_workflow]]` -- skill workflow context
- `[[reference_role_override_tier_design]]` -- the override tier that closed the FTE skybox categorization gap 2026-05-13
- `[[project_extraction_pipeline_vision]]` -- broader extraction roadmap
