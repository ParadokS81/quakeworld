# QW Oracle

The QuakeWorld Knowledge Service. A data foundation, two serving surfaces, and a growing list of consumers.

## The foundation

Three data layers live inside this app:

- **Layer 1** (`data/knowledge.db`) — structured facts extracted from engine source. Engine entities (15 types: cvar / command / macro / cmdline_param / keyname / hud_element / ruleset / token_primitive / asset_category / flag_bit / cvar_alias / protocol_message / info_key / log_template / qc_builtin) live in a per-version arc model with per-field blame. Game-content facts (the `qw` namespace — maps, gameplay rules) live in flat tables outside the version arc. Schema v18. Four codebases loaded today: ezQuake (15 versions, v3.0 → 3.6.9 + head, 4042 entities), FTE (build-6698, 3279 entities including 1085 from the `plugin:ezhud` source root + 38 cross-engine cvar aliases), QWCL (2.33, 380 entities), MVDSV (2026-01-04 head snapshot, 1236 entities). Plus 254 maps and 78 game-mechanics rows in the `qw` namespace. KTX pending.
- **Layer 2** (`data/qw.db`) — 2.66M community chat messages (1.94M QuakeNet IRC 2005-2016 + 717K Quake.World Discord 2016-present). Raw import + FTS5 index built; processing pipeline on top hasn't been rebuilt since the early spike phase.
- **Layer 3** — hand-authored concept notes at `concept-notes/`. Nine notes shipped, plus README (entry template + 6 shapes + voice table), OPERATIONS (stewardship playbook), and _gap-report (contributor onboarding seed for upstream ezquake.com guide updates).

For per-entity-type background see [`docs/entity-types.md`](docs/entity-types.md) (ezQuake-only today; pending refresh for FTE / QWCL / MVDSV / `qw`). For chronological ship history see [`docs/arc-history.md`](docs/arc-history.md). For the current data model see [`SCHEMA.md`](SCHEMA.md).

## Serving surfaces

A consumer reaches the foundation via one of two paths:

- **MCP** — live queries for interactive clients. Server v0.4.0 at `serve/mcp/`. Ten tools: `lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`, `lookup_map`, `search_maps`, `lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`.
- **Snapshot distribution** — consumer-tailored JSON snapshots pre-computed from the foundation by the `build-snapshot` CLI. Emitted directly into `apps/slipgate-app/src/lib/config/data/`. For clients that need the same facts repeatedly and want fast, predictable access (e.g. slipgate-app's ConfigViewer + map browser).

Both serve the same underlying facts; consumers pick the surface that fits their access pattern.

## Consumers

- **Claude Code** (live) — MCP. Primary consumer today; every coding session in the monorepo can query Layers 1, 2, and 3.
- **slipgate-app** (live) — consumes snapshots at `apps/slipgate-app/src/lib/config/data/` produced by Oracle's `build-snapshot` CLI. Today serves ezQuake (variables / commands / macros / cmdline_params / asset bundle), QWCL (variables), FTE (asset bundle), `qw` (maps + gameplay). MVDSV intentionally not snapshotted (server-side; slipgate is the client).
- **quad chatbot mode** (future) — MCP. Quad is a voice-recording Discord bot today; a chat-over-oracle mode is a future capability on top.
- **New chatbot app** (future) — MCP. Possibly separate from quad.
- **slipgate web help surfaces** (future) — snapshots. The web-services-family direction (assets.quake.world, maps.quake.world) will consume oracle snapshots for anything that maps to knowledge-layer facts.

**Status:** Active development. Solo project for now, not public-facing.

## Tech stack

- **TypeScript + Node 20+ / Bun** for the Layer 1 loader (`scripts/load-knowledge/`) and the MCP server (`serve/mcp/`).
- **Plain Node .mjs scripts** for the Layer 2 corpus (`scripts/import-*.mjs`, `scripts/stats.mjs`, `scripts/search.mjs`).
- **better-sqlite3 11** for the loader; **bun:sqlite** for the MCP server. **ulid** for extractor-run IDs; **js-yaml** for seed ingestion.
- **Python 3 + libclang 18** for the engine-source extractors at `scripts/extractors/<project>/` (ezQuake / FTE / QWCL / MVDSV). Pure-stdlib Python for the `qw` namespace (BSP binary parsing). KTX will use tree-sitter when ported (different language).

Both DB files are gitignored and regenerate from source (Layer 1) or raw import dumps (Layer 2).

## Learn more

- `CLAUDE.md` — always-on rules, where-to-find-things table, tooling conventions
- `VISION.md` — why this project exists, the knowledge-service framing, the active-assistance answer shape
- `OVERVIEW.md` — current-state living map: what is loaded, what the pipeline does, code landmarks, open work
- `SCHEMA.md` — Layer 1 data model reference, one section per table, topically organized
- [`docs/arc-history.md`](docs/arc-history.md) — chronological ship log
- [`docs/entity-types.md`](docs/entity-types.md) — per-entity-type reference (ezQuake; pending refresh)
- `scripts/extractors/EXTRACTOR-PLAYBOOK.md` — porting playbook + registration pattern catalog
- `scripts/extractors/VALIDATION-RUNBOOK.md` — post-ship validation methodology
- `scripts/load-knowledge/e2e-verify.md` — per-phase verification queries with expected counts

This app is one of five in the [QuakeWorld monorepo workshop](../../README.md).
