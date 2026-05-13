# asset-curation/

Sink for per-slug investigation reports emitted by the `asset-type-curate` user-global skill. One file per asset_type slug; lifecycle parallel to `../upstream-prs/` but with a different downstream consumer (Layer 3 asset-notes/ bucket, not external repositories).

See `../../curated/asset-notes/OPERATIONS.md` for the broader asset-notes stewardship playbook (status-flag triage, L1-GAP handling, fan-out workflow). The investigation reports here are the by-product of that workflow.

## Purpose

The asset-type-curate skill runs a 6-step pipeline per asset_type slug: pre-flight, source verification, docs cross-reference, corpus mining, gap triage, output. The "output" step writes:

- **Always:** `<slug>-investigation.md` in this directory -- the report carrying the evidence, the status flag, any seed-deltas, and any extractor-gap one-liners.
- **For non-L1-GAP flags:** `<slug>.md` draft in `../../curated/asset-notes/` -- the operator-refined L3 note.

The investigation report stays even after the draft lands; it's the evidence trail behind the note's frontmatter `status:` and `last_verified:` fields. When the source changes upstream or the slug re-walks, the investigation can be updated in place to reflect the new evidence.

## Lifecycle

1. **Sub-agent writes** (one per slug, dispatched in fan-out or solo invocation): runs the skill pipeline; produces this report.
2. **Orchestrator reviews** the report alongside the draft: status flag justified? Seed-deltas proposed? Extractor-gap one-liner harvested?
3. **Commit** investigation report + draft together (when draft exists) or investigation report alone (L1-GAP slices).

## Naming

`<slug>-investigation.md` -- one per asset_type. The slug matches `qw-asset-types.yaml` asset_type vocabulary (snake_case, e.g. `player_skin-investigation.md`, `skybox-investigation.md`).

## Status

Each report's `status:` frontmatter field carries one of five flags from the asset-type-curate skill: `CONFIDENT`, `DOC-GAP`, `DIVERGENT`, `SPARSE`, `L1-GAP`. See the skill's `references/status-flag-rubric.md` for the full rubric and `../../curated/asset-notes/OPERATIONS.md` Section 3 for the operator-action cheat sheet.

L1-GAP reports are the bucket's primary feedback loop into the next extractor-capability arc -- they carry `## Extractor gap` one-liners that the orchestrator harvests into `HANDOVER.md` and the follow-up parking doc.

## Pointers

- Skill: `~/.claude/skills/asset-type-curate/SKILL.md` + references/.
- Asset-notes bucket: `../../curated/asset-notes/` (the downstream consumer of these reports).
- Asset_type seed: `../../scripts/extractors/qw/seeds/qw-asset-types.yaml`.
- L1 evidence: `../../scripts/extractors/<engine>/output/<engine>-asset-loader-sites-ast.json`.
