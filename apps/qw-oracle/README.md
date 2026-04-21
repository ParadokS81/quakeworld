# QW Oracle

The QuakeWorld Knowledge Service. Two SQLite stores side by side:

- **Layer 1** (`data/knowledge.db`) — structured engine facts extracted from source: cvars, commands, macros, cmdline params, keynames, HUD elements, rulesets, token primitives, asset-consumption model, flag bits. Per-version history, per-field diff, commit blame. Fully loaded for ezQuake at head across 10 entity types (3899 entities). FTE / MVDSV / KTX pending.
- **Layer 2** (`data/qw.db`) — 2.66M community chat messages (1.94M QuakeNet IRC 2005-2016 + 717K Quake.World Discord 2016-present). Raw import + FTS5 index built; processing pipeline on top hasn't been rebuilt since the early spike phase.

A future **Layer 3** — hand-authored concept notes adapted from ezquake.com docs and community wisdom — is not yet populated.

**Status:** Active development. Solo project for now, not public-facing. First consumer is Claude Code via a local MCP server; future outlets planned for Quad (Discord bot), slipgate web, and the Slipgate desktop helper panel.

## Tech stack

- **TypeScript + Node 20+ / Bun** for the Layer 1 loader (`scripts/load-knowledge/`)
- **Plain Node .mjs scripts** for the Layer 2 corpus (`scripts/import-*.mjs`, `scripts/stats.mjs`, `scripts/search.mjs`)
- **better-sqlite3 11** for both stores
- **ulid** for extractor-run IDs; **js-yaml** for seed ingestion
- **Python 3 + libclang 18** for engine-source extractors (live in `packages/qw-config/`, not here)

Both DB files are gitignored and regenerate from source (Layer 1) or raw import dumps (Layer 2).

## Learn more

- `CLAUDE.md` — always-on rules, where-to-find-things table, tooling conventions
- `VISION.md` — why this project exists, three paths (Oracle Bot / Digest / Time Machine), long-term direction
- `OVERVIEW.md` — current-state living map: what is loaded, what the pipeline does, code landmarks, open work
- `SCHEMA.md` — Layer 1 data model reference, one section per table, topically organized
- `scripts/load-knowledge/e2e-verify.md` — per-phase verification queries with expected counts

This app is one of five in the [QuakeWorld monorepo workshop](../../README.md).
