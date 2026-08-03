# Status-flag rubric -- asset-type-curate skill

The skill's 6-step pipeline (pre-flight / source-verify / docs-cross-ref / corpus-mine / triage / output) ends with Step 5: gap triage. That step assigns one of five flags to the slug being investigated. The flag drives the output branch: `L1-GAP` halts without producing a draft; all other flags produce both an investigation report and a draft note. The playbook-level cheat sheet lives at `apps/qw-oracle/curated/asset-notes/OPERATIONS.md` Section 3; this file is the authoritative rubric that table summarizes. Read this before triage.

---

## CONFIDENT

### Trigger conditions

- L1 canonical_ids from extractor JSON are present and correctly categorized for at least one engine.
- Documentation (ezquake-docs local rip or ezquake.com page) matches source behavior -- no significant divergence noted.
- Corpus evidence exists in `gfx_comment` or the gfx sandbox for at least one `corpus_categories` entry in the seed.

### Concrete example: `charset`

`charset` has named loader functions (`R_LoadCharsetImage`, `Load_Locale_Charset`) in both the ezQuake and FTE extractor JSONs; docs describe `gl_consolefont` cvar behavior matching source; the qw.nu corpus has three subcategories (256x256, 512x512, 1024x1024). All three evidence streams agree. Flag: CONFIDENT.

### What goes in investigation.md

- **Status header:** `status: CONFIDENT`
- **Evidence summary:** brief table or list -- L1 canonical_ids found, doc URL + currency, corpus hit count and representative bundle names.
- **Seed-delta section** (`## Suggested seed deltas`): present only if source verification surfaced drift (e.g., a missing engine extension, an inaccurate path template). Omit section entirely if seed is accurate.
- **No `## Extractor gap` section** (L1 is trustworthy; this section fires only on L1-GAP).

### Draft produced

Yes. Standard draft with full frontmatter + body. Operator action: 30-second skim; commit if voice and coverage look right.

---

## L1-GAP

### Threshold rule

L1-GAP fires when the gap blocks an honest draft -- not whenever any structural-extraction gap exists. Apply this test: if the seed YAML already hand-carries the missing information AND direct source-read by the investigator confirms it, the gap is **enrichment-grade** (note in investigation, flag DIVERGENT or appropriate). If the gap leaves both L1 JSON and seed silent on a load-path or category-routing question the draft would need to answer, the gap is **block-grade** -- halt before draft.

### Trigger conditions

- Extractor JSON has no canonical_ids for this slug, or has mis-tagged sites (wrong `reads_category_id`) that cannot be corrected by `ENCLOSING_FN_CATEGORY_OVERRIDES` without upstream extractor work.
- The seed's `l1_hint_function_names` functions are absent from the extractor output, indicating the watchlist (`LOADER_FUNCTIONS`) is missing these entry points AND the seed does not compensate via hand-curated path templates.
- A structural extraction capability is absent AND the seed does not compensate. (Static-array suffix enumeration alone is NOT sufficient -- the seed normally compensates by hand-carrying the templates. Multi-use loader dispatch may trigger L1-GAP when the override tier cannot route the sites correctly.)

### Block-grade example (hypothetical -- L1-GAP, halt)

An asset_type whose loader function is called via a function pointer assigned at runtime. The libclang AST visitor does not trace runtime-assigned function pointers, so the call site is invisible to L1. The seed cannot anchor at a known function name; the investigator has no L1-cited entry point for source-read. Halt the draft and route the watchlist patch to the next extractor-capability arc.

### Enrichment-grade example (NOT L1-GAP, do not halt)

A static-array path-template enumeration gap where the engine probes N variants from a `static const char *paths[]` table inside the loader function. The extractor catches the loader-call but not the array initializers, so the L1 JSON shows 1 site with `path=null` instead of N distinct templates. The seed YAML's `engine_canonical_paths` already enumerates the templates as hand-curated truth, and the investigator can source-read the array directly. Flag DIVERGENT or CONFIDENT per the docs/corpus axis; note the extractor follow-up in a `## L1 extractor follow-up` section of the investigation report.

### Named enrichment-grade pattern: L1-CAT-AMBIGUOUS

Surfaces when L1 categorization disagrees with the loader site's actual asset-shape. The site IS visible at L1 (not L1-GAP), but its `reads_category_id` routes to one slug while its enclosing function / path template / load behavior belongs to a different slug. Confirmed across the 2026-05-14 calibration batch (skybox + charset + hud_element + map). Three case shapes:

1. **Asset routes to neighbor.** `Mod_LoadExternalSkyTexture` (ezQuake) is L1-categorized as `skybox` but loads BSP-internal sky-overlay replacements at `textures/<mapname>/<bsp_skytex>_{solid,alpha}.<ext>` -- install layout matches `map_texture`, not `skybox`. Discoverable by comparing the site's `path_template` against the slug's `engine_canonical_paths`.

2. **Sibling miscategorized as parent.** `FS_LoadTempFile` inside `Load_LMP_Charset` (ezQuake) is L1-categorized as `hud_overlay` but loads a charset `.lmp` -- the enclosing function is the charset loader. Discoverable by comparing the enclosing function name against the slug's `l1_hint_function_names`.

3. **Generic loader missing category override.** `Mod_LoadBrushModel` (FTE) is L1-tagged as `model` but is BSP-specific -- needs `ENCLOSING_FN_CATEGORY_OVERRIDES` entry to route to `map`. Mirrors the skybox `R_SetSky|Shader_ParseSkySides` override that landed earlier. Discoverable by asymmetric site counts across engines (e.g., 12 ezQuake `map` sites vs 1 FTE `map` site for a slug the FTE engine certainly loads).

**Action.** Document the case in the investigation report's `## L1 extractor follow-up` section. Include: site canonical_id, current category, intended category, fix shape (override / function-tier change / null-category routing). The flag for the slug stays whatever the substantive triage produced (CONFIDENT / DIVERGENT / DOC-GAP); L1-CAT-AMBIGUOUS is an embedded finding, not a flag in its own right.

**Routing.** Aggregate L1-CAT-AMBIGUOUS findings across slices into the extractor-capability arc backlog (`HANDOVER.md` "Active arcs" or a dedicated parking doc). Multiple findings of the same shape in one slug (hud_element surfaced 5 in the 2026-05-14 batch: `R2D_Conback_Callback`, `Font_LoadHexen2Conchars`, `M_Menu_LoadSave_Preview_Draw`, `Mod_ParseMD5MeshModel`, `MSetup_TransDraw`) suggest a tier-level routing precision issue worth a bulk fix rather than per-site overrides.

### Skybox case study (2026-05-13)

Skybox was originally this rubric's L1-GAP headline example: six face paths accessed via static array iteration, with the extractor unable to walk static array initializers. Two changes moved skybox to DIVERGENT:

1. `ENCLOSING_FN_CATEGORY_OVERRIDES` role-override tier shipped, correctly categorizing the 6 FTE skybox sites that were previously mis-tagged. Categorization is no longer a gap.
2. The seed YAML hand-carries the path templates (4 ezQuake prefixes x 6 face suffixes; 8 FTE patterns x 2 suffix sets for the legacy 6-face path). The investigator can source-read the static arrays to verify -- the draft can be authored honestly.

The static-array enumeration capability remains worth shipping as a future extractor enhancement (it would let L1 JSON regression-check the seed), but the gap is enrichment-grade, not block-grade.

### What goes in investigation.md

- **Status header:** `status: L1-GAP`
- **Gap description:** one-paragraph explanation of what L1 evidence is missing and why.
- **`## Extractor gap` section (required):** a single concrete one-liner naming the exact gap for the follow-up extractor arc.
- **No evidence summary** for corpus or docs (those steps may still run, but the flag blocks the draft regardless).
- **No seed-delta section** (seed accuracy cannot be verified without trustworthy L1).

### Draft produced

No. Per spec D5: a draft built on suspect L1 evidence is actively misleading. The investigation.md is the only output. Operator action: harvest the `## Extractor gap` one-liner into `HANDOVER.md` and the follow-up extractor-capability arc parking doc. Re-dispatch the slug after the extractor fix lands.

---

## DOC-GAP

### Trigger conditions

- No documentation covers this asset_type in `research/repos/ezquake-docs/docs/docs/` and no useful page exists at the ezquake.com fallback URL via jina reader.
- L1 evidence is present and credible (not a L1-GAP situation) -- the gap is on the documentation side only.
- Corpus evidence may or may not exist; the draft is authored from source behavior + corpus alone.

### Concrete example: `locfile`

The `TP_LoadLocFile` function is in the ezQuake extractor JSON and the `.loc` format is plain-text (described in the seed notes). But `ezquake.com/docs/` has no standalone locfile reference page, and the local rip at `research/repos/ezquake-docs/` carries nothing beyond brief teamplay-macro mentions. There is also no qw.nu corpus category for locfiles (engine-internal, never distributed as standalone downloads). Flag: DOC-GAP; draft is authored from source inspection + seed notes.

### What goes in investigation.md

- **Status header:** `status: DOC-GAP`
- **Doc search log:** which URLs were tried, what was found (brief -- "searched ezquake-docs/docs/; no dedicated page; teamplay.md mentions `%l` macro but not the file format").
- **Source findings:** what source verification surfaced that compensates for the doc gap (loader function behavior, path templates verified, format description).
- **Corpus findings:** if corpus exists, sample bundles; if not, note absence.
- **Seed-delta section** (`## Suggested seed deltas`): if source verification contradicts the seed.

### Draft produced

Yes. Draft is authored from source + corpus rather than docs. Operator action: deep-read investigation + draft; verify the "How it loads" and "Install layout" sections match source findings before committing.

---

## DIVERGENT

### Trigger conditions

- Source behavior and documentation disagree on a factual claim (path template, cvar name, extension list, loading order). Source wins per spec D4 and `project_qw_oracle_source_truth`.
- Two engines implement the same asset_type with meaningfully different loading behavior (not just minor extension-set differences -- those belong in the body's cross-engine section without raising the flag).
- The asset_type exists in source but has been retired (removed or fundamentally changed) while docs still describe the old behavior. This is the **retired-feature edge case** (see below).

### Concrete example: `skybox` loader paths (docs vs. source)

The ezquake.com textures page documents `gfx/env/` as the skybox install path. Source (`R_LoadSkyTexturePixels`) probes four prefix variants including bare `env/`. FTE additionally accepts bare-root `<skyname><suffix>.<ext>` paths (via `Shader_ParseSkySides`). The community convention (`gfx/env/`) is valid and safe, but the engine accepts more paths than the docs state. Flag: DIVERGENT; draft notes the divergence prominently and favors source-truth, explaining that `gfx/env/` is the recommended single install location even though the engine probes additional paths.

### What goes in investigation.md

- **Status header:** `status: DIVERGENT`
- **Divergence description:** a concrete list of the disagreements -- source says X, docs say Y; engine A does X, engine B does Y.
- **Source-wins rationale:** one sentence per disagreement explaining which source is authoritative and why.
- **Evidence summary:** L1 canonical_ids, doc URLs, corpus hits.
- **Seed-delta section** if seed reflects the doc rather than the source.
- **`## Divergence notes`** subsection: the draft body's "Doc-divergence notes" section mirrors this in prose.

### Draft produced

Yes. Draft explicitly notes each divergence. Operator action: deep-read investigation and draft; confirm divergence claim is accurate before committing.

### Retired-feature edge case

When source has fundamentally retired a feature (removed code paths, deprecated subsystem) while existing docs still describe it: the draft says "no current note needed -- feature retired in `<commit or version>`" and the note body is intentionally short. The `status` frontmatter field in the draft is set to `DIVERGENT` (not a separate flag -- it IS a divergence between docs and source). The slug remains in the asset-notes index with its short note committed. Investigation.md captures the retirement evidence (commit reference, what was removed, when). The `divergent-resolution-rubric.md` reference covers the worked example (skybox `Shader_ParseSkySides` legacy 6-face shader path in FTE); this file covers the flag-level decision.

---

## SPARSE

### Trigger conditions

- L1 evidence is thin or absent not because of an extractor gap but because the asset_type is engine-internal: it loads at engine init from stock pak, is never distributed as community content, and has empty or no `corpus_categories` in the seed.
- The gfx sandbox and `gfx_comment` table have no bundles or comments referencing this type.
- The asset_type is still valid to document (it exists in `qw-asset-types.yaml` and the seed notes explain it) but the note will be short by necessity.

### Concrete example: `palette`

`palette` has no `corpus_categories` (the seed notes: "Stock-only; rarely overridden. Listed for completeness."). The L1 hint functions (`Host_InitLocal`, `W_LoadWadFile`) are high-level init routines that load the stock `gfx/palette.lmp` once at startup. There is no community ecosystem of custom palettes for QW clients; the file is engine-internal. Corpus mining returns zero hits. Flag: SPARSE.

Additional slugs expected to return SPARSE: `colormap`, `demo`, `demo_archive`, `locfile`, `map_lighting`, `map_entities`. All are engine-internal or out-of-scope for the gfx corpus per the seed notes.

### What goes in investigation.md

- **Status header:** `status: SPARSE`
- **Sparseness confirmation:** a brief note explaining WHY this type is sparse (engine-internal, stock-only, no community distribution channel, corpus out-of-scope). This distinguishes real SPARSE from a missed corpus category.
- **Evidence log:** what was searched, what was found (zero hits is the expected result here -- log it explicitly so the flag is justified).
- **Seed-delta section** if source verification contradicts the seed (rare for SPARSE types).

### Draft produced

Yes. The draft is short by design. "Files involved" and "Install layout" sections still present but brief. The body explicitly notes that this is a stock-internal type not distributed as community content, and explains what it is and how it loads. Operator action: verify SPARSE classification is correct (some SPARSE hits may be false -- a missed corpus category or an extractor that doesn't cover a less-common engine), then commit the short draft.

---

## Triage heuristics for vocabulary-alignment audits

These heuristics apply when running an L1 vocabulary alignment audit (cross-cutting pass that looks at all seed slugs and all L1 asset_category names together), not when triaging a single slug during normal skill execution. The 2026-05-14 L1 vocab alignment audit surfaced them.

### Corpus-categories absence as a signal for "L1-only intentional"

When an L1 asset_category exists but has **no corresponding seed slug**, the triage question is: should the seed grow a new slug, or is this category intentionally L1-only (engine-internal concept that isn't a user-facing asset_type)?

**Heuristic:** check whether the L1 category has a corresponding `corpus_categories` entry in any existing seed slug, or a clearly mappable category on gfx.quakeworld.nu (the canonical community-curated source-of-truth for "what assets QW players install"). The **absence** of a gfx.quakeworld.nu corpus category is strong evidence that the L1 category is engine-internal, not a missing user asset_type.

**Worked examples (from the 2026-05-14 audit):**
- `shader` (133 FTE sites): no `Shaders` corpus category on gfx.quakeworld.nu. -> L1-only intentional (engine rendering material system).
- `quakec_progs` (server-side QC bytecode): no community-curated `progs.dat` distribution channel. -> L1-only intentional (server-mod workflow out of seed's current client-side scope).
- `sprite` (.spr engine format): no `Sprites` corpus category. -> L1-only intentional (engine .spr format; not a community asset workflow).

**Counter-example:** `shader` could plausibly become a seed slug in the future if an FTE-only content workflow surfaces (shader scripts shipped with map packs). The heuristic gives "no slug today"; revisit when corpus evidence shifts.

### Layered vocabulary: entity-type vs asset_category

The L1 schema has two distinct vocabulary layers that look like one to a casual reader:

- **Entity-type vocabulary**: `cvar | command | macro | cmdline_param | keyname | hud_element | ruleset | token_primitive | flag_bit | asset_category` (per `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` L1 schema). These are first-class entity tables in the database.
- **Asset_category vocabulary**: the bucket labels emitted by `_handler_asset_loader_sites.py` (`hud_overlay`, `skin`, `wad`, `model`, `skybox`, `charset`, etc.) -- these are *values* within the `asset_category` entity-type, used to group loader sites.

A seed slug like `hud_element` aligns with the **entity-type vocabulary** (it's its own first-class entity type), even if it diverges from the broader **asset_category bucket label** (`hud_overlay`). When this happens, the seed slug name is correctly placed -- the asset_category bucket is allowed to be wider.

**Rule:** during vocabulary-alignment audits, do not force-align seed slugs with asset_category bucket labels solely on name-match grounds. The two layers have different scope (user-facing asset_types vs engine-internal load buckets); divergence is often deliberate. Bridge via `l1_hint_bare_categories` is the correct artifact.
