# Asset notes (Layer 3)

Engine-data synthesis sub-shape. One note per QuakeWorld asset_type in `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` -- 21 currently. The asset_type vocabulary is the seed; this directory carries the prose explaining how each type loads, where users install it, and the cross-engine surface.

Sibling to `concept-notes/` -- both live under the broader Layer 3 layer (curated markdown knowledge with consistent retrieval contracts). The two buckets are distinguished by sub-shape:

- **concept-notes** -- free-form synthesis. Open-ended topics, authored deep, hand-tuned, slug + frontmatter + prose body.
- **asset-notes** (this bucket) -- engine-data synthesis. Bounded set, seed-mirrored frontmatter, prose body for unique content the seed schema cannot represent. Bridges L1 facts to L3 narrative.

See `../concept-notes/README.md` for the concept-notes convention. This file documents the asset-notes convention. Stewardship playbook is in `OPERATIONS.md` next to this file.

## Bucket scope

Every asset_type in the seed earns a note by virtue of being engine-recognized. Earn-the-note tests (used in `concept-notes/`) don't apply here -- the set is fixed at seed-authoring time. When a seed slug exists, an `asset-notes/<slug>.md` ought to exist; when a seed slug retires, the corresponding note retires with it.

This is a Path 2 ("authored-here") bucket only -- no Path 1 import lane. The engine itself is the upstream source, not a community guide. See `../concept-notes/OPERATIONS.md` Section 2 for the broader two-path framing across Layer 3.

## Concept-note partners

Some asset_types pair with a concept-note in `../concept-notes/` covering the broader gameplay angle. The asset-note is bounded by the asset_type's engine-data shape (file format, load mechanism, install path, cross-engine differences); the concept-note covers cross-domain context that builds on the asset_type plus adjacent rendering systems, ruleset gates, or recommended recipes.

**Example:** `player_skin.md` (this bucket) covers the .pcx/.tga/.png skin texture file loading mechanism; `../concept-notes/player-skins.md` covers the broader visibility / identification / per-player tracking / corpse readability / recipes / gates walkthrough that uses the skin asset_type plus a dozen adjacent cvars.

**Heuristic:** an asset_type earns a concept-note partner when its full gameplay story requires cross-domain context (other cvars, render systems, ruleset gates) beyond pure asset-loading. Most asset_types don't earn one (charset, conback, levelshot, etc. -- file loads, done). A few earn one: `player_skin` is confirmed; `model_q1` may earn one for custom-model gameplay; `map` may earn one for map-selection workflow. Phase 3 fan-out is expected to surface additional candidates via the asset-type-curate skill's `## Suggested concept-note partner` finding type.

Cross-reference convention: both notes carry a "Related" section pointing at the other.

## Authoring path

Authoring is driven by the `asset-type-curate` user-global skill (`~/.claude/skills/asset-type-curate/`). One skill invocation per slug.

1. Operator (or sub-agent in fan-out) runs `/asset-type-curate <slug>`.
2. Skill produces an investigation report at `../../docs/asset-curation/<slug>-investigation.md` and (for non-`L1-GAP` flags) a draft `<slug>.md` here.
3. Operator reviews investigation, refines draft inline, commits.

L1-GAP halts: when L1 evidence is too thin or mis-categorized for an honest draft, the skill writes investigation only and harvests an extractor-gap one-liner for the next extractor-capability arc. The slug stays in the bucket index with no `<slug>.md` committed until the gap closes.

See `OPERATIONS.md` for the full stewardship playbook -- status-flag triage, update lifecycle, L1-GAP handling, companion-asset cross-reference convention.

## Frontmatter schema

Per qwiki-community-reference arc D18 (2026-05-08): **frontmatter mirrors the seed's stable fields; body carries unique prose / cross-engine differences / install-layout details / edge cases the seed schema cannot represent.** Same rule as profile-notes; same intent: keep retrieval honest while letting the body carry uniquely-authored content.

```yaml
---
slug: <asset_type_slug>             # e.g. player_skin, skybox, charset
asset_type: <asset_type_canonical>  # matches slug; explicit for tooling clarity
engine_canonical_paths:              # mirrored from seed YAML
  ezquake: [...]
  fte: [...]
  qwcl: [...]
  mvdsv: [...]
user_install_paths: [...]            # where users drop their custom content
corpus_categories: [...]             # community-imposed tags from qw.nu/gfx
related_entities:                    # canonical IDs of associated cvars / commands / extensions
  - cvar:<name>
  - command:<name>
companion_asset_types: []            # optional: cross-type related files (e.g., charset paired with HUD-config loader)
l1_canonical_ids:                    # extractor loader-site canonical IDs grouped by engine
  ezquake: [...]
  fte: [...]
status: <CONFIDENT|DOC-GAP|DIVERGENT|SPARSE>   # L1-GAP halts before draft -- see OPERATIONS.md
last_verified: <YYYY-MM-DD>          # bumped when the note re-walks source
authority_grounds: <engine_mechanics|community_consensus|operator_sme|hedged>
---
```

The seed-mirrored fields (`engine_canonical_paths`, `user_install_paths`, `corpus_categories`, etc.) come from `qw-asset-types.yaml`. When the seed updates, the note's mirrored fields update -- track via `last_verified`.

`status` and `last_verified` are audit metadata. `authority_grounds` follows the four-grounds convention from `../concept-notes/README.md` Section "Authority grounding for R7 (opinionated best-practice) content" -- when an asset-note carries any recommendation (install layout convention, naming convention, recipe), the recommendation must be grounded.

## Voice and length

Calibrated for the LLM consumer. Asset-notes are bundled with L1 facts at retrieval time -- body owns narrative / cross-engine philosophy / motive-intent; L1 owns exact defaults / source lines / help text. Plain English, citation-anchored, narrative welcome for motive/intent.

| Section | Voice | Length guideline |
|---|---|---|
| Description / What is this asset type | Factual, present tense | 2-4 sentences |
| How it loads (engine mechanism) | Technical, source-cited | 5-15 lines |
| Install layout (where users put it) | Imperative; "drop the file at ..." | 3-8 lines |
| Files involved (multi-file types) | Per-file listing | 5-15 lines |
| Cross-engine differences | Per-engine breakdown; narrative welcome for mode-priority intent | 10-30 lines (when divergent); skip otherwise |
| Community conventions / corpus packaging | Descriptive; cite corpus | 5-15 lines |
| Edge cases | Itemized | 5-20 lines |

Total length follows shape; brief slugs run short, multi-file multi-engine slugs run longer. The LLM reads the whole note either way.

### Chunk-first answer for notes over ~80 lines

`search_concepts` returns chunks; the first chunk an LLM sees may be the only one it consumes for common queries. Structure the first ~30 lines (Description + How it loads + Install layout) as a complete "how does this work" answer. Cross-engine deep-dive, divergence detail, and edge cases live below for LLMs that follow up via `get_concept_note` for the full body.

## Current notes

| Slug | Asset type | Status |
|---|---|---|
| `player_skin` | Player-model skin replacement (file-based load via skin/baseskin/team/enemy cvars) | CONFIDENT (asset-shape trim, 2026-05-13; concept-note partner at `../concept-notes/player-skins.md`) |
| `skybox` | Six-image cubemap rendered as the world's sky dome (multi-engine, multi-mechanism on FTE) | DIVERGENT (2026-05-14, post-audit re-run; docs cover ezQuake subset; FTE has 3 load modes; investigation surfaces `Mod_LoadExternalSkyTexture` as a 2nd ezQuake mechanism for BSP sky-overlay replacement) |
| `charset` | Bitmap console font texture (256-glyph 16x16 grid) -- user-replaceable on ezQuake; FTE routes via gl_font.c font system | CONFIDENT (2026-05-14; single-engine user-facing surface; FTE/QWCL/MVDSV documented as not user-facing or server-side) |
| `hud_element` | Individual 2D HUD images (numbers, faces, weapon icons, ammo/armor) -- WAD-lump override on ezQuake; CSQC-driven on FTE | DIVERGENT (2026-05-14; architectural divergence between ezQuake WAD-override and FTE CSQC HUD; 129 ezQuake L1 sites curated to 8 via one-per-distinct-enclosing-function rule; concept-note partner warranted for HUD configuration workflow) |
| `map` | BSP geometry file (.bsp) -- central asset in every game session; hub for 4 cross-type companions | DOC-GAP (2026-05-14; no dedicated ezquake-docs page; companions: `map_texture` / `map_lighting` / `map_entities` / `skybox` via worldspawn.sky push; concept-note partner warranted for map-selection workflow) |

This table populates as the asset-type-curate arc lands -- Phase 2 + Round 3 calibration shipped 2026-05-14 (5 slugs across 4 status flags: player_skin / skybox / charset / hud_element / map); Phase 3 fan-out for the remaining 16 slugs queued at `docs/superpowers/parking/2026-05-14-asset-type-phase-3-fanout.md`.

## Pointers

- Stewardship playbook: `OPERATIONS.md`
- Authoring skill: `~/.claude/skills/asset-type-curate/SKILL.md`
- Asset_type seed: `../../scripts/extractors/qw/seeds/qw-asset-types.yaml`
- Investigation reports: `../../docs/asset-curation/`
- API contract (L3 expansion pattern + frontmatter discipline): `../../API_CONTRACTS.md`
