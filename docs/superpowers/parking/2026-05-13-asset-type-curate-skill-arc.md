# Asset-Type Curate Skill Arc -- Brainstormer Handoff

**Date:** 2026-05-13
**Origin:** post-extractor-gap-closure session (commits `dd19de0a`, `20ac8506`, `845f0bce`)
**Suggested first session:** fresh terminal -> `superpowers:brainstorming` or `arc-brainstormer` for a multi-pass design
**Purpose:** Design + ship a skill that produces one L3 concept note per asset type via parallel sub-agent investigation. Settle the workflow on a first vertical slice (skybox recommended), then fan out across the remaining ~20 asset types.

## Why this arc

Today qw-oracle's Layer 3 has 9 hand-authored concept notes. `qw-asset-types.yaml` lists 21 asset types with seed metadata + L1 evidence (post-2026-05-13 gap closure). The gap between "we have catalog evidence about an asset type" and "we have a concept note that synthesizes it for users" is hand-authoring effort -- and the per-type investigation is the same shape every time: read source, cross-reference docs, mine corpus, identify gaps, draft .md.

This arc encodes that shape as a skill, dispatches sub-agents in parallel to produce 21 drafts, and uses the first slice (skybox) as the template stress-test.

## What the 2026-05-13 session learned (context for the brainstorm)

Three structural insights that drive the skill design. Memory entries written:

1. **L1 / seed / L3 layering is shape-dependent.** For atomic entities (cvars, commands) L1 has the facts; L3 adds narrative. For mechanism entities (loaders, asset pipelines) L1 captures call graph + categories, seed YAML bridges to community knowledge, L3 synthesizes from source + docs + corpus. Memory: `project_l1_seed_l3_layering.md`.

2. **Per-type investigation is the gap diagnostic.** The skybox slice this session surfaced (a) an extractor watchlist gap (R_LoadImagePixels missing from LOADER_FUNCTIONS), (b) a pre-existing regex bug (screenshot read/write conflation in both ezQuake and FTE handlers), and (c) the static-array path-pattern question (extractor capability gap -- engine probes 4 prefix variants stored in `static char *[][]` arrays inside the loader function; not currently extractable). Per-asset-type slicing finds gaps where they bite, far better than speculative blanket audits.

3. **Multi-use loader pattern is cross-engine.** One generic image-load function dispatching to 8+ asset categories via enclosing-function routing. Pattern almost certainly repeats in QWCL / MVDSV / KTX. Memory: `project_multi_use_loader_pattern.md`.

4. **Seed YAML is the bridge layer.** Most fields in `qw-asset-types.yaml` are hand-curated. Some are source-verifiable (engine_canonical_paths -- maintenance liability, candidates for extractor-capability extension). Others are inherently hand-curated (user_install_paths from gfx_faq, corpus_categories from community taxonomy) -- these stay seed-curated permanently.

## Suggested skill shape (initial design -- refine in brainstorm)

**Skill:** `asset-type-curate`

**Workflow per slug:**

1. **Pre-flight** -- load seed entry from `qw-asset-types.yaml`; refresh derive output if stale; pull L1 evidence canonical_ids.
2. **Source verification** -- read each L1-cited function in each engine; verify seed `engine_canonical_paths` against actual probe behavior; note: missing watchlist functions, untagged category routing, fragile seed fields.
3. **Documentation cross-reference** -- `research/repos/ezquake-docs/` first (local rip); ezquake.com fetch as fallback (via jina reader per `feedback_jina_reader` memory); note doc currency and doc-vs-source divergence.
4. **Corpus mining** -- query gfx corpus sandbox at `/home/paradoks/sandboxes/qw3-abab-gfx/` for bundles in matching `corpus_categories`; sample 5-10, observe community packaging; grep `gfx_comment` (1,449 rows, not yet mined) for type-specific install instructions.
5. **Gap triage** with status flag:
   - CONFIDENT -- wide evidence, sources agree, ready for note
   - L1-GAP -- extractor/handler/seed needs work first
   - DOC-GAP -- no docs, author from source + corpus
   - DIVERGENT -- sources disagree, needs human judgment
   - SPARSE -- minimal evidence everywhere (might be stock-only / non-shareable)
6. **Output artifacts:**
   - `apps/qw-oracle/docs/asset-curation/<type>-investigation.md` (evidence dump + gap list + status flag)
   - `apps/qw-oracle/curated/asset-notes/<type>.md` (DRAFT -- operator approves before commit)
   - Optional: seed-patch suggestion, extractor-gap one-liner for HANDOVER

**Fan-out pattern.** Opus session dispatches 21 sub-agents (Sonnet medium-effort), one per asset_type, in parallel. Each produces investigation.md + draft.md. Opus reads 21 status flags, deep-reads DIVERGENT and L1-GAP reports, approves CONFIDENT drafts after light review, gates L1-GAP findings into the next extractor-capability arc. Cost ~$10-20 total, ~10 min wall-clock.

## First slice candidate

**Skybox** (Recommended). Stress-tests the template:
- Cross-engine path divergence (ezQuake probes 4 path variants; FTE accepts those + bare-root)
- L1 + seed split (categories captured at L1, path patterns hand-curated in seed pending extractor capability)
- Living docs operator flagged as possibly outdated (ezquake.com/docs/textures.html#skyboxes -- recommended-not-complete)
- Multiple loading mechanisms (`r_skyname` cvar, `/loadsky` command, `/skygroup` command, worldspawn.sky push)
- Edge cases (skygroups, mvd playback per-map skies, fallback if faces missing)
- Corpus presence ("Other / Skyboxes" in qw.nu/gfx)

A template that handles skybox trivializes `conback` (single-file, hardcoded name) and `crosshair` (cvar-driven). Reverse isn't true.

Alternatives:
- **conback** -- simpler, faster, but template may not generalize (60% of community bundles ship under wrong filename -- a UX story worth telling but the simpler case)
- **hud_element** -- mid-complexity, surfaces the WAD lump extractor gap immediately (lump names = canonical override filenames)

## Sequencing

1. **Brainstorm pass** (this handoff's target): confirm skill shape, pick first slice, settle gap-triage flag set, decide on single-vs-composable skill split.
2. **Scaffold the new L3 dir.** Create `apps/qw-oracle/curated/asset-notes/` with `README.md` + `OPERATIONS.md` patterned on `concept-notes/`. Asset-type notes live in their own bucket parallel to concept-notes/ / player-notes/ / clan-notes/ / tournament-notes/ -- bounded set, consistent template, 1:1 mapping to `qw-asset-types.yaml` entries. The existing `concept-notes/player-skins.md` is asset-type-shaped and should migrate during this step (rename + update MCP `get_concept_note` consumers if any reference the old path).
3. **Build skill** at `~/.claude/skills/asset-type-curate/SKILL.md` per `superpowers:writing-skills` and `skill-creator:skill-creator`.
4. **First slice dry-run**: invoke skill on the chosen first asset type; refine prompt + output shape from the experience; save the .md template as memory.
5. **Update memory** `project_asset_type_curate_workflow` with what landed in practice.
6. **Fan-out**: dispatch sub-agents for remaining 20 asset types via the Opus orchestrator session pattern.
7. **L1-GAP follow-up arc**: any L1-GAP findings from the fan-out form the next extractor-capability arc (likely candidate: the static-array path-extraction extractor capability surfaced for skybox).

## Open questions for the brainstorm

- Single skill or composable set? (`asset-type-investigate` + `asset-type-author` + `asset-type-cross-check`)
- Where do per-slice investigation.md files live? Suggest `apps/qw-oracle/docs/asset-curation/` (parallel to existing `docs/upstream-prs/` etc.)
- How does the skill handle DIVERGENT status (sources disagree)? Auto-flag for operator review vs propose a synthesis with notes?
- Does the skill emit seed-patch suggestions inline (in the investigation.md) or as a separate `seed-patches/<type>.yaml` artifact?
- How does it interact with the existing `guide-rewrite` skill (which handles ezquake.com -> L3 for prose pages)? Distinct, or composed (guide-rewrite as a sub-step within asset-type-curate)?
- MCP tool routing for the new bucket: does `get_concept_note` extend to look up asset-notes/ too, or does asset-notes/ get its own tool (e.g., `get_asset_note` / `lookup_asset_type`) with a richer envelope (seed YAML + L1 evidence + note prose returned together)? The latter matches the bounded-set shape and Slipgate's classifier query pattern but adds a tool to the MCP surface.
- Status-flag values -- is the 5-flag set right or should it be split further (e.g., "L1-GAP-handler" vs "L1-GAP-seed" vs "L1-GAP-extractor-capability")?
- Triage threshold: when should the skill halt-and-report (DIVERGENT) vs proceed-with-notes (DOC-GAP)?

## Evidence sources

- **L1 evidence:** `apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/<engine>-asset-loader-sites-ast.json` + `qw/output/qw-asset-types.json`
- **Seed:** `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`
- **ezquake-docs (local rip):** `research/repos/ezquake-docs/`
- **gfx corpus:** `/home/paradoks/sandboxes/qw3-abab-gfx/` (1.4GB, outside repo). Inventory notes at `docs/superpowers/parking/2026-05-12-gfx-corpus-inventory.md` and `docs/superpowers/parking/2026-05-12-asset-corpus-investigation-findings.md`.
- **gfx_comment** (1,449 unmined rows in `gfx.sql` MySQL dump) -- pre-slice mining recommended (~30 min).

## Small follow-up (carry into the arc)

**Re-walk obligation:** the 2026-05-13 handler edits only re-extracted HEAD checkouts. 15 ezQuake tags (v3.0 -> v3.6.9 + head) and 1 FTE version (build-6698) are in the L1 DB. Their `asset_loader_sites` rows still carry the pre-fix categorization. Run `extract-tag --project ezquake --version <tag>` per tag (or just `load-version --type asset_loader_sites` per tag if the only-extractor-changed shortcut applies). ~10 min wall-clock; idempotent; existing regression-guard catches anything weird. Best done in one batch with the asset-type-curate arc so the historical DB and the L3 notes both reflect the post-fix state.

## Related memory

- `project_l1_seed_l3_layering` -- the layering contract this arc operationalizes
- `project_multi_use_loader_pattern` -- the cross-engine pattern the arc should propagate
- `project_asset_type_curate_workflow` -- the workflow as memory (live as drafted)
- `reference_role_override_tier_design` -- the OVERRIDES tier added 2026-05-13
- `reference_screenshot_regex_pattern_bug` -- the read/write conflation bug pattern
- `project_concept_notes_vertical_slice` -- the slice shape framing
- `project_layer3_two_path_curation` -- community-curated imports + newly-earned authoring paths
- `feedback_scaffold_then_fanout_for_multi_phase_plans` -- the fan-out pattern applied here to curation

## Suggested fresh-terminal opening message

```
I'm picking up an arc from a parked handoff. Please read:
docs/superpowers/parking/2026-05-13-asset-type-curate-skill-arc.md

Then use superpowers:brainstorming (or arc-brainstormer for a multi-pass design)
to settle the skill shape and pick the first slice. Read the linked memory
entries for context -- the architectural insights from the prior session are
load-bearing.
```
