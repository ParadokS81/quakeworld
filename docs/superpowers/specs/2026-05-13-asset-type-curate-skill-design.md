# Asset-type curate skill arc -- design spec

**Date:** 2026-05-13
**Status:** Draft, post-brainstorm
**Origin:** parking doc at `docs/superpowers/parking/2026-05-13-asset-type-curate-skill-arc.md`
**Prior memory:** `project_asset_type_curate_workflow`, `project_l1_seed_l3_layering`, `project_multi_use_loader_pattern`, `project_concept_notes_vertical_slice`, `project_layer3_two_path_curation`, `feedback_scaffold_then_fanout_for_multi_phase_plans`, `reference_role_override_tier_design`, `reference_screenshot_regex_pattern_bug`

## Purpose

Build `asset-type-curate`, a user-global skill that produces one L3 concept note per QuakeWorld asset type via parallel sub-agent fan-out, gated on status flags and source-truth, with frontmatter discipline that fits the eventual MCP layer. Operationalizes the vertical-slice concept-note shape ([[project_concept_notes_vertical_slice]]) for the bounded set of 21 asset types (verified by grep against `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` on 2026-05-13).

## Context

Today qw-oracle has 9 hand-authored Layer 3 concept notes. `qw-asset-types.yaml` lists 21 asset types with seed metadata + L1 evidence (post-2026-05-13 gap closure). Of those 21, ~14 are community-shareable (have corpus evidence in the qw.nu/gfx dump); ~7 are engine-internal (`palette`, `colormap`, `map_lighting`, `map_entities`, `locfile`, `demo`, `demo_archive`) and will return SPARSE on the corpus-mining step as expected. The per-type investigation is the same shape every time -- read source, cross-reference docs, mine corpus, identify gaps, draft .md.

The 21 asset_types map cleanly onto the qw.nu/gfx corpus taxonomy (10 top-level categories + 30 subcategories per `docs/superpowers/parking/2026-05-12-gfx-corpus-inventory.md`). The corpus's finer-grained subcategorization is organizational (community-imposed tags) rather than additional engine asset types -- the seed already captures multi-subcategory mapping via the per-entry `corpus_categories` field. Two narrow candidates for future seed splits (Skins / Monster, Skins / Gib subcategories) get flagged as open questions for the fan-out; the slices on `player_skin` and `model_texture` are expected to surface them.

The asset-type-curate skill encodes that shape and dispatches sub-agents in parallel to produce 21 drafts. This is the **newly-earned authoring path** (Path 2 from [[project_layer3_two_path_curation]]) automated as a fan-out -- complementary to `guide-rewrite` (Path 1, ezquake.com -> L3).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Single skill, not composable set | Linear 6-step pipeline; fan-out works cleanest with one self-contained prompt. Future split to investigate / author / cross-check possible if scope grows past comfort. |
| D2 | Lean SKILL.md (under 300 lines), references/ subdir for heavy material | Skill-size concern: long SKILL.md files lose rule adherence. References loaded on demand per slice. |
| D3 | Five status flags: CONFIDENT / L1-GAP / DOC-GAP / DIVERGENT / SPARSE | Five-bucket triage is fast to scan at orchestrator review. Gap-subtype lives in investigation.md body, not the flag. |
| D4 | DIVERGENT synthesizes draft favoring source-truth | Source-is-gospel is an architectural commitment ([[project_qw_oracle_source_truth]]). Halting per slice would force 21 round-trips; refining a draft is faster. Retired-feature drafts as "no current note needed" rather than a separate halt mechanism. |
| D5 | L1-GAP halts (no draft) | A draft built on suspect L1 evidence is actively misleading; fix L1 first, redraft second. |
| D6 | Seed-patch inline in investigation.md | Seed deltas are usually 0-3 fields. Separate files become orphans. Promote to standalone patch file only on non-trivial restructure (>5 fields or schema change). |
| D7 | Investigation reports at `apps/qw-oracle/docs/asset-curation/<slug>-investigation.md` | Parallel to existing `docs/upstream-prs/` -- clear ownership separation from L3 buckets. |
| D8 | guide-rewrite stays sibling skill, not composed | Same output shape (L3 .md), different input source (ezquake.com page vs seed YAML entry). Composition would force orchestration glue with no benefit. |
| D9 | MCP routing deferred to follow-up arc | Tool envelope design needs real authored notes as input. Capture recommendation: extend `get_concept_note` with `type='asset'` discriminator; add `lookup_asset_type` only if richer-envelope use case proves out. |
| D10 | First slice = skybox | Stress-tests cross-engine paths, L1+seed split, stale docs, multiple loaders, corpus presence, role-override evidence. Template that handles skybox trivializes conback and crosshair; reverse is not true. |
| D11 | `asset-notes/` bucket sibling to `concept-notes/` | Path C precedent (qwiki arc): bounded structured sub-bucket gets its own authoring dir + `type` discriminator on shared tools. |
| D12 | Frontmatter mirrors seed YAML stable fields + audit metadata | Per qwiki arc D18: "frontmatter mirrors stable fields, body carries unique prose." Open drift item #2 (920 player/clan notes without retrieval) is the cautionary tale. |
| D13 | API_CONTRACTS.md gets three small edits in this arc | Doc accommodates asset-notes naturally via the new-dataset checklist; small edits keep it honest as the bucket lands. |

## Skill shape

**Location:** `~/.claude/skills/asset-type-curate/SKILL.md`

**Trigger phrases:**
- `/asset-type-curate <slug>` (slash-command form)
- "curate asset type <name>"
- "next asset-type slice"
- "run asset-type-curate on <slug>"

**SKILL.md content (under 300 lines):**
- Trigger phrases (above)
- 6-step workflow checklist
- 5-flag status-flag definitions (terse; full rubric externalized)
- Flag-gated output branch (D5)
- Pointers to references/ files

**references/ subdirectory:**

| File | Content |
|---|---|
| `asset-note-template.md` | L3 .md skeleton + frontmatter schema (per D12) + "Files involved" / "Install layout" body sections for multi-file asset types |
| `status-flag-rubric.md` | When each flag fires, with concrete examples per asset_type shape |
| `corpus-mining-recipes.md` | gfx_comment SQL queries + gfx sandbox directory traversal patterns |
| `seed-patch-format.md` | Inline delta shape for investigation.md, plus promote-to-file criteria |
| `cross-engine-loader-grep.md` | Multi-use-loader signature ([[project_multi_use_loader_pattern]]) for cross-engine check |
| `divergent-resolution-rubric.md` | Source-vs-docs disagreement handling, retired-feature shape, multi-engine divergence pattern |

## Per-slug workflow

Each sub-agent runs this end-to-end for one asset_type slug.

1. **Pre-flight.** Load seed entry from `qw-asset-types.yaml`. Check if `qw/output/qw-asset-types.json` derive output is stale (older than seed mtime) and refresh if so. Pull L1 anchor canonical_ids from extractor JSONs (`ezquake-asset-loader-sites-ast.json`, `fte-asset-loader-sites-ast.json`).

2. **Source verification.** Read each L1-cited function in each engine supporting the asset_type. Verify source-probe behavior matches seed `engine_canonical_paths`. Note any watchlist gaps (LOADER_FUNCTIONS missing entries) or categorization gaps (FUNCTION_TO_CATEGORY, ENCLOSING_FN_CATEGORY_RULES, ENCLOSING_FN_CATEGORY_OVERRIDES).

   **Multi-file asset types.** Many asset_types ship as multiple files (skybox: 6 cubemap faces + optional shader / skygroup config; charset and hud_element: optional companion `.cfg` loader script -- the MIXED-bundle pattern at 4.1% of corpus per `docs/superpowers/parking/2026-05-12-asset-corpus-investigation-findings.md`). The skill handles two cases:
   - **Within-type sub-files** (skybox faces, charset variants) get described in the note body's "Files involved" / "Install layout" sections -- one slug per asset_type, not one slug per sub-file. The frontmatter's `engine_canonical_paths` already carries path templates with placeholders (`<face>`, `<name>`, `<mapname>`); the body explains them and shows the install layout.
   - **Cross-type companion files** (charset paired with a config loader; hud_element paired with HUD setup .cfg) get an optional `companion_asset_types: [...]` field in frontmatter + a cross-reference paragraph in the body. When a sub-file is engine-recognized as a distinct loadable (e.g., `map_lighting` .lit loaded by separate code paths from `map` .bsp), the seed already splits them into separate slugs -- that decision is fixed at seed-authoring time.

3. **Documentation cross-reference.** Search `research/repos/ezquake-docs/docs/docs/` for relevant pages first. Fetch ezquake.com URL via jina reader as fallback ([[feedback_jina_reader]]). Note doc currency (last-edit date) and divergence from source.

4. **Corpus mining.** Query gfx corpus sandbox at `/home/paradoks/sandboxes/qw3-abab-gfx/` for bundles in seed's `corpus_categories`; sample 5-10 representative bundles. Grep `gfx_comment` (1,449 rows in `gfx.sql` MySQL dump) for type-specific install instructions or community framing.

5. **Gap triage.** Assign status flag:
   - `CONFIDENT` -- wide evidence, sources agree, ready for note
   - `L1-GAP` -- extractor / handler / seed needs work first
   - `DOC-GAP` -- no docs, author from source + corpus
   - `DIVERGENT` -- sources disagree (source wins per D4; draft notes the divergence)
   - `SPARSE` -- minimal evidence everywhere (might be stock-only / non-shareable)

6. **Branch on flag:**
   - `L1-GAP`: write only `<slug>-investigation.md` with status header + findings + `## Extractor gap` one-liner. Skip the draft entirely.
   - All other flags: write both `<slug>-investigation.md` AND `asset-notes/<slug>.md` draft, with flag-appropriate caveats in the body.

7. **Halt** with one-line status report: `<slug>: <FLAG> -- <one-line summary> -- artifacts: <paths>`.

## Output artifacts

| Artifact | Path | When | Owner |
|---|---|---|---|
| Investigation report | `apps/qw-oracle/docs/asset-curation/<slug>-investigation.md` | Always | Sub-agent writes; orchestrator reviews |
| Note draft | `apps/qw-oracle/curated/asset-notes/<slug>.md` | All flags except L1-GAP | Sub-agent drafts; orchestrator refines + commits |
| Inline seed-patch | `## Suggested seed deltas` section in investigation.md | When source surfaces seed drift | Sub-agent proposes; orchestrator applies to `qw-asset-types.yaml` |
| Extractor-gap one-liner | `## Extractor gap` section in investigation.md | When L1 watchlist / handler needs work | Sub-agent emits; orchestrator harvests into HANDOVER and next extractor arc |

**Promote-to-file exception:** if a seed-patch exceeds 5 fields or proposes a schema-shape change, write `<slug>.yaml` patch under `apps/qw-oracle/scripts/extractors/qw/seeds/_patches/` and link from investigation.md.

## Asset-note frontmatter (Storage contract per qwiki D18)

Authoring template (per slice):

```yaml
---
slug: <asset_type_slug>
asset_type: <asset_type_canonical>
engine_canonical_paths:
  ezquake: [...]      # mirrored from seed YAML
  fte: [...]
  qwcl: [...]
  mvdsv: [...]
user_install_paths: [...]   # from seed (gfx_faq sourced, hand-curated)
corpus_categories: [...]
related_entities:
  - cvar:<name>
  - command:<name>
  ...
companion_asset_types: []   # optional: cross-type related files (e.g., charset -> config for loader.cfg)
l1_canonical_ids:
  ezquake: [...]
  fte: [...]
status: <CONFIDENT|DOC-GAP|DIVERGENT|SPARSE>
last_verified: <YYYY-MM-DD>
authority_grounds: <engine_mechanics|community_consensus|operator_sme|hedged>
---
```

Body carries unique prose: what is this asset type, how it loads, where users put it, edge cases, multi-engine differences, doc-divergence notes. L3 voice per `apps/qw-oracle/curated/concept-notes/README.md` (community-wiki shape, brief by default, depth only when warranted; see [[feedback_l3_concept_notes_wiki_shape]]).

## Orchestrator fan-out + review

**Dispatch (Phase 3):**
- Opus orchestrator session enumerates 21 asset_type entries from `qw-asset-types.yaml`
- Dispatches 21 sub-agents in parallel, Sonnet medium-effort per slice
- Each sub-agent runs the skill end-to-end on one slug
- Estimated cost: $10-20 total; wall-clock ~10 min

**Review pass:**
1. Read 21-line status table (slug + flag + summary per row)
2. For each `CONFIDENT`: 30-second draft skim -> commit or kick back to sub-agent
3. For each `DIVERGENT` / `DOC-GAP` / `SPARSE`: deep-read investigation.md + draft, refine draft, commit
4. For each `L1-GAP`: harvest extractor-gap one-liner into HANDOVER + next extractor arc; defer those drafts until L1 is fixed and slug is re-dispatched

**Re-dispatch case:** After L1-GAP slices are fixed in the follow-up extractor arc, re-dispatch only the affected sub-agents; they re-run the skill against the now-trustworthy L1 and produce drafts.

## Scaffolding + API_CONTRACTS edits (Phase 1, before first slice)

**New directories:**
- `apps/qw-oracle/curated/asset-notes/` -- new L3 sub-bucket sibling to concept-notes/
- `apps/qw-oracle/docs/asset-curation/` -- investigation report sink

**New files (asset-notes/ bucket scaffolding, patterned on concept-notes/):**
- `apps/qw-oracle/curated/asset-notes/README.md` -- bucket purpose, frontmatter discipline reference, what shape notes take
- `apps/qw-oracle/curated/asset-notes/OPERATIONS.md` -- when to author, when to update, how to triage
- `apps/qw-oracle/curated/asset-notes/CLAUDE.md` -- entry doc for sub-bucket (pointers to README + OPERATIONS)
- `apps/qw-oracle/docs/asset-curation/README.md` -- stub describing investigation-report lifecycle (sub-agent writes; orchestrator reviews; commits with reviewed drafts)

**File migration:**
- `apps/qw-oracle/curated/concept-notes/player-skins.md` -> `apps/qw-oracle/curated/asset-notes/player_skin.md`
  - Slug rename (kebab to snake) to match `qw-asset-types.yaml`
  - Update frontmatter to asset-notes shape (D12)
  - Grep for any MCP consumer references to old slug; update accordingly

**API_CONTRACTS.md edits (three small):**
1. Add `asset-notes` row to the "L3 expansion pattern (Path C)" table. Status: "Authoring in flight (asset-type-curate skill arc 2026-05-13); MCP exposure deferred until bucket populated."
2. Generalize the Path C prose framing. Currently profiles read like the canonical Path C example; lift the three sub-shape patterns explicitly:
   - **free-form synthesis** (concept-notes) -- authored, deep, hand-tuned
   - **wiki-import biographical** (profile-notes: player / clan / tournament) -- structured rows + optional body
   - **engine-data synthesis** (asset-notes) -- bounded set, seed-mirrored frontmatter, prose body
3. Lift the D18 frontmatter rule ("frontmatter mirrors stable fields, body carries unique prose") into the Storage contract section as a named rule, with cross-reference to Path C sub-bucket table. Today it lives buried inside table cells; lifting prevents the next sub-bucket from repeating open-drift-item-#2 silence.

**CLAUDE.md edit (apps/qw-oracle/CLAUDE.md):**
- Subsystem-scopes table: add `asset-notes/` to the `curated/` row's description

## First slice: skybox (Phase 2)

**Why skybox.** Stress-tests every template dimension:
- Cross-engine path divergence (ezQuake probes 4 prefix variants; FTE accepts those + bare-root)
- L1 + seed split (categories captured at L1; probe patterns hand-curated in seed pending extractor capability)
- Living docs known-stale (`ezquake.com/docs/textures.html#skyboxes` -- operator-flagged "recommended-not-complete")
- Multiple loading mechanisms (`r_skyname` cvar, `/loadsky`, `/skygroup`, worldspawn.sky push)
- Edge cases (skygroups, mvd playback per-map skies, fallback if faces missing)
- Corpus presence (qw.nu/gfx "Other / Skyboxes")
- ENCLOSING_FN_CATEGORY_OVERRIDES already wired (FTE handler 2026-05-13, [[reference_role_override_tier_design]])

**Process:**
1. Operator invokes skill solo: `/asset-type-curate skybox`
2. Skill produces `skybox-investigation.md` + `skybox.md` draft
3. Operator reviews drafts; refines SKILL.md + references/ from the experience (wording that confused the sub-agent, gaps in the template, missing flag examples)
4. Save refined skybox.md as canonical template in memory (`reference_asset_note_template_skybox`)
5. If skill-design changes are material, append to a "Post-first-slice refinements" section in this spec before Phase 3

## Sequencing

Three phases, operator approval at each boundary.

### Phase 1 -- Scaffold + skill build

**Estimated:** 2-3 hours main session

**Tasks:**
- Create `asset-notes/` bucket + scaffolding files (README, OPERATIONS, CLAUDE)
- Create `docs/asset-curation/` + stub README
- Migrate `player-skins.md` -> `asset-notes/player_skin.md` with frontmatter update
- Edit `API_CONTRACTS.md` (three edits)
- Edit `apps/qw-oracle/CLAUDE.md` (subsystem-scopes row)
- Build `~/.claude/skills/asset-type-curate/SKILL.md`
- Build six reference files in `~/.claude/skills/asset-type-curate/references/`
- Commit + push

**Gate:** operator reviews scaffolding + skill files before Phase 2 fires.

### Phase 2 -- First slice (skybox)

**Estimated:** 1-2 hours

**Tasks:**
- Invoke `/asset-type-curate skybox` (solo dispatch, no fan-out)
- Review skill output (investigation + draft)
- Refine SKILL.md + references/ from experience
- Save canonical-template memory
- Commit slice outputs + skill refinements

**Gate:** operator approves first slice before fan-out fires.

### Phase 3 -- Fan-out

**Estimated:** ~30 min orchestrator + 1-2 hours review

**Tasks:**
- Opus orchestrator dispatches 20 remaining sub-agents in parallel (skybox already shipped in Phase 2)
- Wait for completion (~10 min wall-clock)
- Walk 20-line status table
- Triage: light-review CONFIDENT, deep-read non-CONFIDENT, harvest L1-GAP
- Commit batched outputs
- Write follow-up arc handoff for L1-GAP findings

**Gate:** operator confirms fan-out complete; surfaces follow-up arc.

## Out of scope (captured for follow-up)

- **MCP tool routing** (D9). Defer until bucket has 10+ populated entries to validate envelope shape against real callers. Recommendation captured in this spec; ship MCP work as separate arc.
- **L1-GAP follow-up arc** -- next extractor-capability arc, harvested from Phase 3 fan-out. Likely first candidate: static-array path-pattern extractor capability surfaced for skybox.
- **Re-walk obligation** -- 15 ezQuake tags + 1 FTE version need historical re-extract through corrected handlers (per parking doc small-follow-up). Sidecar: run alongside Phase 3 (`load-version --type asset_loader_sites` per tag).
- **gfx_comment SQL mining** (1,449 unmined rows) -- pre-slice mining (~30 min) optional warmup before Phase 3 but not strictly required; `corpus-mining-recipes.md` reference covers it ad-hoc.

## Open questions for implementation

These surface during plan-writing or first-slice execution and warrant capture here:

- (post-first-slice) Are six reference files the right cut, or does experience suggest fewer or more?
- (post-fan-out) Does the 5-flag set survive 21 slices, or do some slices reveal a missing flag?
- (post-fan-out) MCP envelope: does the `lookup_asset_type` richer-envelope use case prove out, or does the `type='asset'` discriminator on `get_concept_note` cover everything?
- (post-fan-out) Do the corpus's Skins / Monster and Skins / Gib subcategories warrant their own asset_type slugs in `qw-asset-types.yaml`, or fold under existing `model_texture` / `player_skin` with prose cross-references in the body? The `player_skin` and `model_texture` slices are expected to surface this; the slice's inline seed-patch section is the natural place to propose a split.

## Related docs and memories

- Parking doc: `docs/superpowers/parking/2026-05-13-asset-type-curate-skill-arc.md`
- Memories: `project_asset_type_curate_workflow`, `project_l1_seed_l3_layering`, `project_multi_use_loader_pattern`, `project_concept_notes_vertical_slice`, `project_layer3_two_path_curation`, `feedback_scaffold_then_fanout_for_multi_phase_plans`, `reference_role_override_tier_design`, `reference_screenshot_regex_pattern_bug`
- Seed: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`
- L1 evidence: `apps/qw-oracle/scripts/extractors/{ezquake,fte}/output/<engine>-asset-loader-sites-ast.json` + `qw/output/qw-asset-types.json`
- ezquake-docs (local rip): `research/repos/ezquake-docs/`
- gfx corpus: `/home/paradoks/sandboxes/qw3-abab-gfx/`
- API contracts: `apps/qw-oracle/API_CONTRACTS.md`
- Sibling skill: `~/.claude/skills/guide-rewrite/`
- Authoring conventions: `apps/qw-oracle/curated/concept-notes/README.md` + `OPERATIONS.md`
