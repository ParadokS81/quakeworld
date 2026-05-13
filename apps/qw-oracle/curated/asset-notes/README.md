# Asset notes (Layer 3)

Engine-data synthesis sub-shape. One note per QuakeWorld asset_type in `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` -- 21 currently. The asset_type vocabulary is the seed; this directory carries the prose explaining how each type loads, where users install it, and the cross-engine surface.

Sibling to `concept-notes/` -- both live under the broader Layer 3 layer (curated markdown knowledge with consistent retrieval contracts). The two buckets are distinguished by sub-shape:

- **concept-notes** -- free-form synthesis. Open-ended topics, authored deep, hand-tuned, slug + frontmatter + prose body.
- **asset-notes** (this bucket) -- engine-data synthesis. Bounded set, seed-mirrored frontmatter, prose body for unique content the seed schema cannot represent. Bridges L1 facts to L3 narrative.

See `../concept-notes/README.md` for the concept-notes convention. This file documents the asset-notes convention. Stewardship playbook is in `OPERATIONS.md` next to this file.

## Bucket scope

Every asset_type in the seed earns a note by virtue of being engine-recognized. Earn-the-note tests (used in `concept-notes/`) don't apply here -- the set is fixed at seed-authoring time. When a seed slug exists, an `asset-notes/<slug>.md` ought to exist; when a seed slug retires, the corresponding note retires with it.

This is a Path 2 ("authored-here") bucket only -- no Path 1 import lane. The engine itself is the upstream source, not a community guide. See `../concept-notes/OPERATIONS.md` Section 2 for the broader two-path framing across Layer 3.

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

Voice register and length follow `../concept-notes/README.md`'s community-wiki shape, calibrated for the engine-data domain. Brief by default; depth only when the asset_type genuinely earns it ([[feedback_l3_concept_notes_wiki_shape]]).

| Section | Voice | Length |
|---|---|---|
| Description / What is this asset type | Factual, present tense | 2-4 sentences |
| How it loads (engine mechanism) | Technical, source-cited | 5-15 lines |
| Install layout (where users put it) | Imperative; "drop the file at ..." | 3-8 lines |
| Files involved (multi-file types) | Per-file listing | 5-15 lines |
| Cross-engine differences | Per-engine breakdown | 10-30 lines (when divergent); skip otherwise |
| Community conventions / corpus packaging | Descriptive; cite corpus | 5-15 lines |
| Edge cases | Itemized | 5-20 lines |

Source-derived asset-notes carry high citation density -- `file:line` references to loader functions, format magic bytes from seed, cvar references via `related_entities`. Most notes will land at 60-150 lines. Skybox and player_skin (multi-file, multi-engine, multi-mechanism) sit higher; charset and conback (single-file, single-mechanism) sit lower.

### Progressive disclosure for notes over ~80 lines

Inherited rule from `../concept-notes/README.md`: structure the first ~30 lines as a standalone short answer (Description + How it loads + Install layout). Cross-engine deep-dive and edge cases live below. The MCP default-condense returns the opener; depth queries return the full note.

## Current notes

| Slug | Asset type | Status |
|---|---|---|
| `player_skin` | Player-model skin replacement (file-based + programmatic paths) | CONFIDENT (migrated from concept-notes/, 2026-05-13) |

This table populates as the asset-type-curate arc lands -- Phase 2 (skybox first slice) and Phase 3 (20-slug fan-out).

## Pointers

- Stewardship playbook: `OPERATIONS.md`
- Authoring skill: `~/.claude/skills/asset-type-curate/SKILL.md`
- Asset_type seed: `../../scripts/extractors/qw/seeds/qw-asset-types.yaml`
- Investigation reports: `../../docs/asset-curation/`
- API contract (L3 expansion pattern + frontmatter discipline): `../../API_CONTRACTS.md`
