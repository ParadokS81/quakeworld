# QW Oracle

The QuakeWorld Knowledge Service. A data foundation, two serving surfaces, and a growing list of consumers.

## The foundation

Three data layers live inside this app, all in one Postgres database (`qw_oracle`, pgvector + tsvector):

- **Layer 1** -- structured facts extracted from engine source. Engine entities (16 types: cvar / command / macro / cmdline_param / ruleset / match_event / info_key / log_template / protocol_message / qc_builtin / cvar_alias, plus the internal-classifier types keyname / hud_element / token_primitive / flag_bit / asset_category) live in `entities` + one `<type>_versions` table each, a per-version arc model with per-field blame. Game-content facts (the `qw` namespace: maps, the gameplay catalog) live in flat tables outside the version arc. Seven codebases are loaded: ezQuake (every release v3.0 -> 3.6.9 plus head), FTE, QWCL, MVDSV, KTX, QTV and QWFWD. The coverage table is `OVERVIEW.md`'s domain inventory; per-namespace counts come from the database (`SELECT project, type, COUNT(*) FROM entities GROUP BY project, type`).
- **Layer 2** -- the Quake.World Discord corpus (2016-04 onward, Discord-only; pre-2016 IRC is excluded by design). Raw messages, timestamp-grouped sessions, and topic-coherent reconstructed threads (`chat_threads`), which are the retrieval unit: embedded and FTS-indexed, searched hybrid (vector + lexical) by `search_solved_issues`. Kept current by a monthly harvest (`scripts/load-chat/HARVEST-RUNBOOK.md`). Sizes in `OVERVIEW.md`.
- **Layer 3** -- curated markdown knowledge under `curated/`: hand-authored concept notes (`concept-notes/`, 45 notes today, served by `search_concepts` / `get_concept_note`), engine-asset notes (`asset-notes/`, 5 notes, not yet served), and the wiki-import profile notes (`player-notes/`, `clan-notes/`; storage shipped, MCP tools pending). Each bucket carries a `README.md` (entry template) and an `OPERATIONS.md` (stewardship playbook).

For per-entity-type background see [`docs/entity-types.md`](docs/entity-types.md) (ezQuake-only; pending refresh for the other codebases). For chronological ship history see [`docs/arc-history.md`](docs/arc-history.md). For the data model see [`SCHEMA.md`](SCHEMA.md).

## Serving surfaces

A consumer reaches the foundation via one of two paths:

- **MCP** -- live queries for interactive clients. Server at `serve/mcp/`, public at `https://oracle.slipgate.me/mcp` (Cloudflare Tunnel, rate-limited). Thirteen tools: `lookup_entity`, `search_entities`, `lookup_map`, `search_maps`, `lookup_mechanic`, `search_mechanics`, `lookup_gameplay_entity`, `search_gameplay_entities`, `describe_mode`, `search_solved_issues`, `search_concepts`, `get_concept_note`, `redirect_to_human`. The contract (response envelope, `match_quality` semantics, orientation blob) is `API_CONTRACTS.md`.
- **Snapshot distribution** -- consumer-tailored JSON pre-computed from the foundation by the loader's `build-snapshot` / `build-docs-snapshot` subcommands, plus the oracle-web brain manifest (`scripts/build-brain-manifest.ts`). For clients that need the same facts repeatedly and want fast, predictable access.

Both serve the same underlying facts; consumers pick the surface that fits their access pattern.

## Consumers

- **Claude Code, Claude.ai and Codex sessions** (live) -- MCP. The monorepo's own sessions plus outside callers (prod's `query_log` since 2026-08).
- **slipgate-app** (live) -- snapshots at `apps/slipgate-app/src/lib/config/data/`: ezQuake (variables / commands / macros / cmdline params / asset bundle), FTE (variables + asset bundle), QWCL (variables), KTX (commands), `qw` (maps + gameplay). MVDSV, QTV and QWFWD are server-side and not snapshotted.
- **oracle-web** (`apps/oracle-web/`, deploy pending) -- the brain manifest, served from `oracle.slipgate.me/snapshots/`.
- **docs-web** (`apps/docs-web/`) -- per-codebase Layer 1 reference JSON from `build-docs-snapshot`.
- **Chatbots** (future) -- MCP: a quad chat-over-oracle mode or a separate app.

**Status:** Active development. Solo project; the MCP endpoint is public and has outside callers, everything else is workshop-only. Open work is the root `HANDOVER.md`.

## Run it

```bash
cd apps/qw-oracle
bun install                                   # never npm: package.json carries a workspace:* dep
cp .env.example .env                          # DATABASE_URL points at the dev twin qw-oracle-postgres-dev (see CLAUDE.md's environment table)
bun run typecheck                             # loader + db typecheck
bun run mcp:dev:http                          # MCP server on :3000, the shape prod runs
bun scripts/load-knowledge/index.ts --help    # the loader's subcommand catalog
```

Everything else -- extractors, Layer 2 and Layer 3 loaders, the quality grid, the eval gate -- is in `DEVELOPMENT.md`; shipping is `DEPLOYMENT.md`.

## Tech stack

- **TypeScript + Bun** for every script (loaders, embedding, eval, calibrate, MCP server). Bun is the canonical runtime per Arc 1 D2; the SQLite era ended with Arc 1 (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`).
- **PostgreSQL 16 + pgvector + tsvector** (image `pgvector/pgvector:pg16`); single engine across all three layers. Migrations are `.sql` files in `db/migrations/`, applied by `db/migrate.ts`.
- **postgres-js** for DB access; **Voyage v4 series** (`voyage-4-large` build / `voyage-4-lite` query) for embeddings; **@modelcontextprotocol/sdk** + **express** for the MCP server (Streamable HTTP behind Cloudflare Tunnel); **ulid** for extractor-run IDs; **js-yaml** for seed ingestion; **gray-matter** for concept-note frontmatter.
- **Python 3 + libclang 18** for the C-codebase extractors at `scripts/extractors/<project>/` (ezQuake / FTE / QWCL / MVDSV / KTX / QWFWD); **Go** for the QTV extractor; pure-stdlib Python for the `qw` namespace (BSP binary parsing). The KTX `match_event` handler is the lone XSD-driven handler in the lineup.

## Learn more

- `CLAUDE.md` -- always-on rules, environment table, documentation index, subsystem scopes
- `VISION.md` -- why this project exists, the knowledge-service framing, the active-assistance answer shape
- `OVERVIEW.md` -- current-state living map: what is loaded, what the pipeline does, code landmarks
- `SCHEMA.md` -- data model reference, one section per table, topically organized
- `API_CONTRACTS.md` -- the MCP contract
- [`docs/arc-history.md`](docs/arc-history.md) -- chronological ship log
- `scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- porting playbook + registration pattern catalog
- `scripts/extractors/VALIDATION-RUNBOOK.md` -- post-ship validation methodology

This app is one of eight in the [QuakeWorld monorepo workshop](../../README.md).
