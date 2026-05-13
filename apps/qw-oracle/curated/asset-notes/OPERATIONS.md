# Asset notes operations -- stewardship playbook for `curated/asset-notes/`

This is the operational playbook for the asset-notes Layer 3 sub-bucket (hand-curated engine-data synthesis notes at `apps/qw-oracle/curated/asset-notes/`). It governs how the bucket grows, updates, and surfaces L1 gaps -- distinct from the entry template + frontmatter schema, which live in `README.md` next to this file.

Living doc. Updated whenever a session surfaces a learning the existing playbook didn't cover. Each change captures the *why*, not just the *what*.

**Scope boundary:**

- `README.md` -- the entry template, frontmatter schema, voice/length tiers, notes table. *What each note looks like.*
- `OPERATIONS.md` (this file) -- how we steward the bucket over time. *How the directory behaves.*
- Individual notes (`*.md`) -- the corpus content itself.

---

## 1. Purpose and scope

The asset-notes bucket bridges Layer 1 (extractor-derived loader-site facts) and Layer 3 (curated prose narrative) for the bounded set of QuakeWorld asset_types. The `qw-asset-types.yaml` seed catalogs 21 asset_types as of 2026-05-13; each earns a note.

What the bucket is:

- Engine-data synthesis. One note per asset_type, explaining how that type loads, where users install it, what the cross-engine surface looks like, and the edge cases worth knowing.
- A bridge between L1 facts (loader-site canonical_ids from extractor JSON) and L3 narrative (the prose that explains the mechanism).
- A consistent surface for downstream consumers (eventual MCP `get_concept_note(type='asset')` per the deferred MCP routing in `../../API_CONTRACTS.md` L3 expansion pattern).

What the bucket is NOT:

- An exhaustive corpus catalog. Corpus categories are descriptive evidence (community-imposed tags from qw.nu/gfx); the asset_type vocabulary is the engine's own taxonomy.
- A community-conventions guide. Recommendations belong in the body's "Community conventions" section when they earn the four-grounds authority test (engine mechanics / community consensus / operator SME / hedged community knowledge -- see `../concept-notes/README.md` Section "Authority grounding").
- An MCP-served corpus yet. MCP routing for asset-notes is deferred (per `../../API_CONTRACTS.md` L3 expansion pattern); notes exist as plain markdown for humans and Claude Code sessions to read directly until the bucket populates.

---

## 2. Authoring workflow

Authoring is driven by the `asset-type-curate` user-global skill (`~/.claude/skills/asset-type-curate/`). One invocation per slug.

### Per-slug pipeline

The skill walks a 6-step pipeline per slug:

1. **Pre-flight** -- load seed entry from `qw-asset-types.yaml`; pull L1 anchor canonical_ids from extractor JSONs.
2. **Source verification** -- read each L1-cited loader function in each engine; verify source-probe behavior matches seed `engine_canonical_paths`; note watchlist / categorization gaps.
3. **Documentation cross-reference** -- `research/repos/ezquake-docs/docs/docs/` first; jina-reader fallback to ezquake.com; capture doc currency + divergence.
4. **Corpus mining** -- query gfx sandbox + `gfx_comment` table for bundles in seed's `corpus_categories`; sample 5-10 representative bundles.
5. **Gap triage** -- assign one of five status flags (Section 3).
6. **Output** -- write investigation report + (flag-gated) draft note.

Operator role per slug:

1. **Review investigation** at `../../docs/asset-curation/<slug>-investigation.md` -- status flag justified by evidence? Cross-engine paths captured? Seed-deltas proposed?
2. **Refine draft inline** when the flag isn't CONFIDENT. The skill writes a draft favoring source-truth (per asset-type-curate spec D4) -- the refinement pass tunes voice and adds operator judgment where evidence is divergent or sparse.
3. **Commit** investigation + draft together.

### Fan-out

The asset-type-curate arc's Phase 3 dispatches all remaining slugs in parallel (Sonnet medium-effort per slice). Each sub-agent returns a one-line status report: `<slug>: <FLAG> -- <summary> -- artifacts: <paths>`. Orchestrator triages by flag (Section 3), refines, commits batched.

Re-dispatch case: after an L1-GAP slice is fixed in the follow-up extractor arc, re-dispatch only the affected sub-agent against the now-trustworthy L1.

---

## 3. Status-flag triage

The skill emits one of five flags per slug. Each flag implies a different operator action.

| Flag | What it means | Operator action |
|---|---|---|
| `CONFIDENT` | Wide L1+docs evidence, sources agree, draft is ready | 30-second draft skim -> commit or kick back |
| `DOC-GAP` | No docs cover the asset_type; draft authored from source + corpus | Deep-read investigation + draft, refine voice, commit |
| `DIVERGENT` | Source and docs disagree (or engines disagree); draft notes divergence prominently and favors source-truth per [[project_qw_oracle_source_truth]] | Deep-read; verify divergence claim against source; refine; commit |
| `SPARSE` | Minimal evidence everywhere -- usually engine-internal types (palette, colormap, map_lighting, map_entities, locfile, demo, demo_archive) or genuinely-low-volume types | Verify SPARSE classification correct (some sparseness is real signal); commit short draft |
| `L1-GAP` | Extractor / handler / seed needs work first; L1 evidence too thin or mis-categorized for an honest draft | Skip draft (per spec D5); harvest extractor-gap one-liner to next extractor arc; defer slug until L1 fixed |

Full rubric (trigger conditions + concrete examples per flag) lives in the skill at `~/.claude/skills/asset-type-curate/references/status-flag-rubric.md`. This table is the playbook-level cheat sheet; the skill reference is authoritative.

---

## 4. Update lifecycle

Asset-notes age slowly -- the asset_type vocabulary is stable -- but they do age. Three transitions worth naming:

### Source changes upstream

When ezquake / FTE / QWCL / MVDSV introduce a new loader mechanism for an existing asset_type, or retire one, the affected note's `last_verified` field is stale until the note is re-walked. The asset-type-curate skill can be invoked against the same slug to re-run the pipeline; the investigation surfaces the divergence and the draft updates accordingly.

`last_verified` bumps to the re-walk date. The body's "Cross-engine differences" section grows or contracts as engine surface diverges or converges. The seed (`qw-asset-types.yaml`) may need an inline patch -- see seed-patch-format reference in the skill.

### New engine onboarding

When a fifth engine (or KTX-canonical / unezQuake fork) lands in the extractor pipeline (per [[project_extraction_pipeline_vision]]), every asset-note gets a re-walk to capture the new engine's loader behavior. The frontmatter's `engine_canonical_paths` and `l1_canonical_ids` grow with a new engine key; the body's "Cross-engine differences" section grows when the new engine diverges.

Onboarding triggers fan-out re-dispatch -- a Phase 3-like batched re-walk against the new engine. The corresponding entry in `apps/qw-oracle/CLAUDE.md` subsystem-scopes table updates to reflect the expanded engine coverage.

### Seed evolution

When `qw-asset-types.yaml` grows (new asset_type added) or shrinks (asset_type retired), the asset-notes index follows. New slug -> new note via the standard authoring path. Retired slug -> note archives (move to `_archive/` per the concept-notes precedent) with a terminal `last_verified` and a frontmatter `superseded_by:` pointer if the retirement was a rename rather than a true removal.

---

## 5. L1-GAP handling

The `L1-GAP` flag is the bucket's primary feedback loop into the upstream extractor work. When a slice surfaces L1 evidence as too thin or mis-categorized to support an honest draft, the skill halts before draft authoring and emits a `## Extractor gap` one-liner in the investigation report.

### Per-slice handling

1. Skill writes only `<slug>-investigation.md` (no draft per spec D5).
2. Investigation body includes `## Extractor gap` section with a concrete one-liner: what's missing, what category-id mis-tag is happening, what fix the next extractor arc should make.
3. Orchestrator harvests the gap one-liner into `HANDOVER.md` (root) and the follow-up extractor-capability arc parking doc.
4. Slug stays in the bucket index with no committed `<slug>.md`; the note materializes when the gap closes.

### Cross-arc routing

L1-GAP findings feed the next extractor-capability arc (parking doc seeded at `docs/superpowers/parking/<date>-extractor-capability-followup.md`). Typical patterns the L1-GAP flag surfaces:

- Loader function missing from the engine's `LOADER_FUNCTIONS` watchlist (extractor doesn't see the site at all).
- `FUNCTION_TO_CATEGORY` / `ENCLOSING_FN_CATEGORY_RULES` / `ENCLOSING_FN_CATEGORY_OVERRIDES` tier doesn't route the site to the correct asset_category (site is seen but mis-tagged). Cross-reference [[reference_role_override_tier_design]].
- Static-array path-pattern extraction capability missing (e.g., skybox 6-face suffix array isn't surfaced).
- Multi-use loader dispatch incomplete (per [[project_multi_use_loader_pattern]] -- one generic loader dispatched to 8+ categories via enclosing-function routing).
- Screenshot-regex read/write conflation in cross-engine handlers ([[reference_screenshot_regex_pattern_bug]]).

After the extractor arc lands the fix, re-dispatch the L1-GAP slug through the asset-type-curate skill against the corrected L1.

---

## Concept-note partner findings

Parallel to L1-GAP and seed-patch findings, the asset-type-curate skill may surface that an asset_type has cross-domain gameplay implications warranting a concept-note partner in `../concept-notes/`. The investigation report carries a `## Suggested concept-note partner` section when this applies; the orchestrator decides whether to author the concept-note.

Authoring a concept-note partner is NOT in scope for asset-type-curate. The skill flags the candidate; the concept-note authoring follows the standard Path 2 (newly-earned authoring) workflow per `../concept-notes/OPERATIONS.md` Section 2. The two notes cross-reference each other once both exist (see `README.md` Section "Concept-note partners" for the convention).

**Example finding shape (from the player_skin slice 2026-05-13):**

> This asset_type's full gameplay story extends beyond file-loading into: programmatic tinting (`r_*skincolor` / `r_skincolormode` / `r_fullbrightskins`), powerup-carrier visibility (`r_powerupglow` / `r_dynamic` / `gl_flashblend`), per-player tracking (`enemyforceskins` / `teamforceskins`), corpse readability (`cl_deadbodyfilter` / `cl_gibfilter`), ruleset gates (MTFL fullbrightskins lock), FPD bit 256 (`FPD_NO_FORCE_SKIN`). The asset-note covers the `.pcx`/`.tga`/`.png` file loading mechanism; the partner concept-note covers "how a player configures visibility for competitive play" -- a vertical slice across multiple L1 anchors.

The orchestrator can either schedule the concept-note authoring as a follow-up arc task or absorb it into an in-flight Layer 3 effort.

---

## 6. Companion-asset cross-reference convention

Some asset_types ship as multi-file bundles or pair with companion files of a different asset_type. The frontmatter's optional `companion_asset_types:` field carries the cross-reference.

### Within-type multi-file (no companion field needed)

When an asset_type's sub-files are part of the same loadable unit (skybox: 6 cubemap faces; charset: optional sub-variants), they're documented in the body's "Files involved" / "Install layout" sections under the single slug. The frontmatter's `engine_canonical_paths` carries the path template with placeholders (`<face>`, `<name>`); the body explains the placeholders and shows the install layout.

### Cross-type companion (companion field used)

When an asset_type pairs with a different-typed file the engine recognizes as a distinct loadable (charset paired with a config loader script; hud_element paired with HUD setup `.cfg`), the pairing is captured via:

- Frontmatter: `companion_asset_types: [config]` (or whichever slug)
- Body: cross-reference paragraph naming the companion file, what it does, and where it installs

Companion relationships are bidirectional in spirit but unidirectional in storage -- only the "primary" note carries the companion field; the companion note may mention the reverse relationship in prose without a frontmatter field. Pick the primary by which file is more commonly authored standalone.

### When a sub-file is engine-recognized as a distinct loadable

When the engine treats a sub-file as a genuinely-separate asset_type (e.g., `map_lighting` `.lit` files loaded by separate code paths from `map` `.bsp` files), the seed already splits them into separate slugs. That decision is fixed at seed-authoring time -- the asset-notes layer mirrors the seed; it doesn't override it.

---

## 7. Feedback-loop protocol

Sessions that touch the bucket may surface learnings that belong in this doc:

- A frontmatter field we need but don't have
- A new status flag (the 5-flag set is the current cut)
- A lifecycle transition that doesn't fit Section 4 cleanly
- A companion-asset case the convention doesn't cover

The protocol mirrors `../concept-notes/OPERATIONS.md` Section 6:

1. **Capture in the running note / commit message.** Don't lose the learning mid-session.
2. **Decide if generalizable.** One instance isn't a pattern -- wait for the second unless the first is clearly general.
3. **Update this doc** when the pattern confirms. Include date + rationale + the session that surfaced it.
4. **Propagate to `README.md`** if the learning touches the entry template.
5. **Propagate to the skill** (`~/.claude/skills/asset-type-curate/`) if the learning touches the authoring pipeline.

---

## 8. Open questions and known gaps

Running list. Items graduate out as they resolve.

### 2026-05-13 -- MCP routing for asset-notes deferred

Per `../../API_CONTRACTS.md` L3 expansion pattern and asset-type-curate spec D9: MCP routing for the asset-notes bucket is deferred until the bucket has 10+ populated entries. Likely shape: extend `get_concept_note` with `type='asset'` discriminator; add `lookup_asset_type` only if a richer-envelope use case proves out. **Trigger for revisit:** Phase 3 fan-out complete and ~16-20 drafts landed.

### 2026-05-13 -- Skins / Monster vs Skins / Gib seed split

The `qw-asset-types.yaml` seed currently has `player_skin` mapped to corpus categories `["Skins", "Skins / Player Model", "Skins / Gib"]`. The corpus's finer-grained sub-categorization (Monster vs Gib vs Player Model) may warrant its own asset_type split in the seed -- the `player_skin` and `model_texture` slices in Phase 3 are expected to surface this as an inline seed-patch proposal. Captured here for visibility.

### 2026-05-13 -- L1 categorization completeness

Phase 2 (skybox first slice) and Phase 3 (fan-out) are expected to surface L1 categorization gaps -- loader sites mis-tagged or unseen by the extractor. The L1-GAP flag (Section 5) routes these to the next extractor-capability arc. **Trigger for action:** any L1-GAP slice's `## Extractor gap` one-liner.

---

## 9. References

- Entry template: `README.md` (sibling in this directory).
- Skill: `~/.claude/skills/asset-type-curate/SKILL.md` + references/.
- Asset_type seed: `../../scripts/extractors/qw/seeds/qw-asset-types.yaml`.
- Investigation reports: `../../docs/asset-curation/<slug>-investigation.md`.
- L1 evidence: `../../scripts/extractors/<engine>/output/<engine>-asset-loader-sites-ast.json`.
- API contracts (L3 expansion pattern, frontmatter discipline): `../../API_CONTRACTS.md`.
- Path C precedent / D18 frontmatter discipline: qwiki-community-reference arc decisions doc.
- Related memories: `project_asset_type_curate_workflow`, `project_l1_seed_l3_layering`, `project_concept_notes_vertical_slice`, `project_layer3_two_path_curation`, `project_multi_use_loader_pattern`, `feedback_l3_concept_notes_wiki_shape`, `reference_role_override_tier_design`, `reference_screenshot_regex_pattern_bug`.
