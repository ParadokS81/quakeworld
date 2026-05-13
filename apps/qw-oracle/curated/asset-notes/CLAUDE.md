# qw-oracle/curated/asset-notes/

Layer 3 engine-data synthesis -- hand-curated notes that bridge Layer 1 loader-site facts to L3 prose for the bounded set of QuakeWorld asset_types in `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`. Sibling to `concept-notes/` under the broader Layer 3 layer (curated markdown knowledge with consistent retrieval contracts).

Authoring is driven by the `asset-type-curate` user-global skill (`~/.claude/skills/asset-type-curate/`); investigation reports land at `../../docs/asset-curation/<slug>-investigation.md` and drafts land here. MCP exposure is deferred per `../../API_CONTRACTS.md` L3 expansion pattern -- notes exist as plain markdown for humans and Claude Code sessions to read directly until the bucket populates.

## Documentation index

| When you need... | Read... |
|---|---|
| Frontmatter schema, voice/length tiers, current notes table | `README.md` |
| Stewardship playbook (authoring workflow, status-flag triage, L1-GAP handling, companion-asset convention) | `OPERATIONS.md` |
| Player skin replacement (teamskin/enemyskin) | `player_skin.md` |

## Tool surface

Eventual MCP exposure via `get_concept_note(type='asset')` + `search_concepts(type='asset')` (per the deferred MCP routing decision in `../../API_CONTRACTS.md`). Until the bucket populates, the directory is read directly.
