# QW Oracle

The QuakeWorld Knowledge Service. A data foundation, two serving surfaces, and a growing list of consumers.

## The foundation

Three data layers live inside this app:

- **Layer 1** (`data/knowledge.db`) — structured engine facts extracted from source: cvars, commands, macros, cmdline params, keynames, HUD elements, rulesets, token primitives, asset-consumption model, flag bits. Per-version history, per-field diff, commit blame. Fully loaded for ezQuake at head across 10 entity types (3899 entities). FTE / MVDSV / KTX pending.
- **Layer 2** (`data/qw.db`) — 2.66M community chat messages (1.94M QuakeNet IRC 2005-2016 + 717K Quake.World Discord 2016-present). Raw import + FTS5 index built; processing pipeline on top hasn't been rebuilt since the early spike phase.
- **Layer 3** — hand-authored concept notes adapted from ezquake.com docs and community wisdom. Not yet populated.

For the per-entity-type reference (what each of the 10 ezQuake entity types is, why it's extracted, who consumes it, verification-status per type), read [`docs/entity-types.md`](docs/entity-types.md).

## Serving surfaces

A consumer reaches the foundation via one of two paths:

- **MCP** — live queries for interactive clients. Tools today: `lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`.
- **Snapshot distribution** — consumer-tailored JSON snapshots pre-computed from the foundation. For clients that need the same facts repeatedly and want fast, predictable access (e.g. slipgate-app's ConfigViewer).

Both serve the same underlying facts; consumers pick the surface that fits their access pattern.

## Consumers

- **Claude Code** (live) — MCP. Primary consumer today; every coding session in the monorepo can query Layer 1.
- **slipgate-app** (transitional) — reads `packages/qw-config/src/data/*.json` directly today for ConfigViewer. Migrates to oracle-snapshot consumption once the extraction pipeline is feature-complete.
- **quad chatbot mode** (future) — MCP. Quad is a voice-recording Discord bot today; a chat-over-oracle mode is a future capability on top.
- **New chatbot app** (future) — MCP. Possibly separate from quad.
- **slipgate web help surfaces** (future) — snapshots. The web-services-family direction (assets.quake.world, maps.quake.world) will consume oracle snapshots for anything that maps to knowledge-layer facts.

**Status:** Active development. Solo project for now, not public-facing.

## Tech stack

- **TypeScript + Node 20+ / Bun** for the Layer 1 loader (`scripts/load-knowledge/`)
- **Plain Node .mjs scripts** for the Layer 2 corpus (`scripts/import-*.mjs`, `scripts/stats.mjs`, `scripts/search.mjs`)
- **better-sqlite3 11** for both stores
- **ulid** for extractor-run IDs; **js-yaml** for seed ingestion
- **Python 3 + libclang 18** for engine-source extractors (live in `packages/qw-config/`, not here)

Both DB files are gitignored and regenerate from source (Layer 1) or raw import dumps (Layer 2).

## Learn more

- `CLAUDE.md` — always-on rules, where-to-find-things table, tooling conventions
- `VISION.md` — why this project exists, the knowledge-service framing, the active-assistance answer shape
- `OVERVIEW.md` — current-state living map: what is loaded, what the pipeline does, code landmarks, open work
- `SCHEMA.md` — Layer 1 data model reference, one section per table, topically organized
- [`docs/entity-types.md`](docs/entity-types.md) — per-entity-type reference using a consistent five-field template plus verification status
- `scripts/load-knowledge/e2e-verify.md` — per-phase verification queries with expected counts

This app is one of five in the [QuakeWorld monorepo workshop](../../README.md).
