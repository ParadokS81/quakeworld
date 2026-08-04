# QW Oracle

The QuakeWorld Knowledge Service. A data foundation, two serving surfaces, and a growing list of consumers.

## The foundation

Three data layers live inside this app:

- **Layer 1** (Postgres `qw_oracle.public.entities` + 15 `*_versions` tables + relation tables + the `qw` namespace) -- structured facts extracted from engine source. Engine entities (15 types: cvar / command / macro / cmdline_param / keyname / hud_element / ruleset / token_primitive / asset_category / flag_bit / cvar_alias / protocol_message / info_key / log_template / qc_builtin) live in a per-version arc model with per-field blame. Game-content facts (the `qw` namespace -- maps, gameplay rules) live in flat tables outside the version arc. Seven codebases loaded today: ezQuake (18 versions, v3.0 -> 3.6.9 + head), FTE (build-6698 with engine + ezhud plugin + asset bundle), QWCL (2.33 + head dual partition), MVDSV (head @`18d0362180`, 2026-04-07), KTX (head), QTV (1.16-dev -- the pipeline's Go front-end), QWFWD (1.40-dev) -- KTX onboarded by the 2026-05-04 onboarding arc, which also added the `match_event` entity type plus the gameplay-mechanics widening (`game_mode`, `mode_default`, `election_type`, `score_system`, `drop_item`, `loc_macro`, `teamplay_message`) and `gameplay_entity_defs.kind += 'monster'`. Per-namespace counts are queryable via `SELECT project, type, COUNT(*) FROM entities GROUP BY project, type` against the dev DB.
- **Layer 2** (Postgres `qw_oracle.public.messages` + `sessions` + `session_search` + `session_references` + `message_labels` + `discord_channels` + `import_log` + `processing_log`) -- 728,863 Quake.World Discord messages (2016-present), 86,423 sessions, 15,489 reply edges. tsvector + GIN lexical search via the `search_solved_issues` MCP tool. Discord-only by D9-revised of qw-oracle Arc 1; pre-2016 IRC content excluded. Layer 2 enrichment (segment / classify / summarise / session-summary embeddings) deferred to Arc 3.
- **Layer 3** -- hand-authored concept notes at `curated/concept-notes/`. Ten notes shipped, plus README (entry template + 6 shapes + voice table), OPERATIONS (stewardship playbook), and _gap-report (contributor onboarding seed for upstream ezquake.com guide updates). Community curated layer (player-notes / clan-notes / tournament-notes) under `curated/<kind>-notes/` per the QWiki community-reference arc.

For per-entity-type background see [`docs/entity-types.md`](docs/entity-types.md) (ezQuake-only today; pending refresh for FTE / QWCL / MVDSV / KTX / `qw`). For chronological ship history see [`docs/arc-history.md`](docs/arc-history.md). For the current data model see [`SCHEMA.md`](SCHEMA.md).

## Serving surfaces

A consumer reaches the foundation via one of two paths:

- **MCP** -- live queries for interactive clients. Server at `serve/mcp/`. Thirteen tools: `lookup_entity`, `search_entities`, `get_concept_note`, `search_concepts`, `search_solved_issues`, `lookup_map`, `search_maps`, `lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`, `describe_mode`, `redirect_to_human`. Public deployment at `oracle.slipgate.me/mcp`.
- **Snapshot distribution** -- consumer-tailored JSON snapshots pre-computed from the foundation by the `build-snapshot` CLI. Emitted directly into `apps/slipgate-app/src/lib/config/data/`. For clients that need the same facts repeatedly and want fast, predictable access (e.g. slipgate-app's ConfigViewer + map browser).

Both serve the same underlying facts; consumers pick the surface that fits their access pattern.

## Consumers

- **Claude Code** (live) -- MCP. Primary consumer today; every coding session in the monorepo can query Layers 1, 2, and 3.
- **slipgate-app** (live) -- consumes snapshots at `apps/slipgate-app/src/lib/config/data/` produced by Oracle's `build-snapshot` CLI. Today serves ezQuake (variables / commands / macros / cmdline_params / asset bundle), QWCL (variables), FTE (asset bundle), `qw` (maps + gameplay). MVDSV intentionally not snapshotted (server-side; slipgate is the client).
- **quad chatbot mode** (future) -- MCP. Quad is a voice-recording Discord bot today; a chat-over-oracle mode is a future capability on top.
- **New chatbot app** (future) -- MCP. Possibly separate from quad.
- **slipgate web help surfaces** (future) -- snapshots. The web-services-family direction (assets.quake.world, maps.quake.world) will consume oracle snapshots for anything that maps to knowledge-layer facts.

**Status:** Active development. Solo project for now, not public-facing.

## Tech stack

- **TypeScript + Bun** for every script (loader, embed, eval, calibrate, MCP server). The SQLite era ended with Arc 1 (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`); Bun is the canonical runtime per Arc 1 D2.
- **PostgreSQL 16 + pgvector + tsvector** (image: `pgvector/pgvector:pg16`); single engine across Layer 1 / Layer 2 / Layer 3. Schema migrations applied by `db/migrate.ts` from `.sql` files in `db/migrations/`.
- **postgres-js** for DB access; **Voyage v4 series** (`voyage-4-large` build / `voyage-4-lite` query) for embeddings; **@modelcontextprotocol/sdk** + **express** for the MCP server (Streamable HTTP transport behind Cloudflare Tunnel); **ulid** for extractor-run IDs; **js-yaml** for seed ingestion; **gray-matter** for concept-note frontmatter.
- **Python 3 + libclang 18** for the engine-source extractors at `scripts/extractors/<project>/` (ezQuake / FTE / QWCL / MVDSV / KTX). Pure-stdlib Python for the `qw` namespace (BSP binary parsing). The `match_event` handler in `scripts/extractors/ktx/_handler_match_events.py` is the lone XSD-driven handler in the lineup (per spec Pass 5.6.c -- not libclang; standalone Visitor lifecycle stubs).

## Learn more

- `CLAUDE.md` -- always-on rules, where-to-find-things table, tooling conventions
- `VISION.md` -- why this project exists, the knowledge-service framing, the active-assistance answer shape
- `OVERVIEW.md` -- current-state living map: what is loaded, what the pipeline does, code landmarks, open work
- `SCHEMA.md` -- Layer 1 data model reference, one section per table, topically organized
- [`docs/arc-history.md`](docs/arc-history.md) -- chronological ship log
- [`docs/entity-types.md`](docs/entity-types.md) -- per-entity-type reference (ezQuake; pending refresh)
- `scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- porting playbook + registration pattern catalog
- `scripts/extractors/VALIDATION-RUNBOOK.md` -- post-ship validation methodology

This app is one of five in the [QuakeWorld monorepo workshop](../../README.md).
