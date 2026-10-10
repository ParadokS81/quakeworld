# QW Oracle - QuakeWorld Knowledge Service

## Environment check FIRST: cockpit vs workstation (2026-07-15)

Development moved to the slipgate **dev-cockpit** (`hostname` = `cockpit`, user `dev`).
Check where you are before touching a database — the endpoints differ:

| Where you are | `DATABASE_URL` | Notes |
|---|---|---|
| **cockpit** (the normal case now) | `postgresql://qworacle:<ORACLE_DEV_PW>@qw-oracle-postgres-dev:5432/qw_oracle` | **Dev twin** of prod (pgvector, seeded from a prod dump 2026-07-15). Password: `ORACLE_DEV_PW` in `~/.secrets/dev-databases.env`. `qworacle` is superuser here — create `qw_oracle_test` and scratch DBs freely. The same instance also hosts a **`quake_stats` scratch copy** (ranking research may write to it). |
| cockpit → **prod** | **no network route, BY DESIGN** | Prod `qw-oracle-postgres` is not on devnet, so no `DATABASE_URL` from the cockpit reaches it -- do not look for a way through the fence. Both prod containers are still dev-owned and reachable through `docker exec` / `docker cp` (the `dev-deploy-proxy` `DOCKER_HOST`): data reaches prod by the twin->prod dump/restore routine and code by an image redeploy, both in `DEPLOYMENT.md`, both taking the public MCP down briefly -- operator's go first. |
| workstation (legacy, pre-cockpit) | `localhost:5432` or tailscale per `DEPLOYMENT.md`/`.env.example` | Old pattern; still valid from the operator's WSL. |

Twins are **cattle**: if an experiment trashes one, re-seed from a fresh prod dump —
procedure in `/mnt/user/appdata/dev/seeds/RESEED.md` on the unraid **host** (host plane;
the cockpit deliberately cannot run it). Prod is never touched by any of this.

**Status:** Active development. Seven codebases loaded into Layer 1 (ezQuake / FTE / QWCL / MVDSV / KTX / QTV / QWFWD) plus the `qw` namespace for game content (maps + game mechanics). Schema state lives in `db/migrations/` + the `schema_migrations` table (see `SCHEMA.md`); there is no hand-maintained schema-version number. For chronological ship history see [`docs/arc-history.md`](docs/arc-history.md). For active backlog see `HANDOVER.md` (root).

### Layer 2 rules (Postgres + tsvector + pgvector, Discord-only; threads = retrieval unit)

- Authoritative store: Postgres `qw_oracle` -- `messages`, `discord_channels`, `import_log`, `processing_log`, `sessions`, `message_labels`, `session_search`, `session_references`, plus `chat_threads` + `thread_messages` (migration 021), the topic-coherent thread retrieval unit.
- tsvector config is `'simple'` (language-agnostic): the Discord corpus is mixed-language (Swedish, Russian, German handles and snippets); English stemming would mangle non-English tokens. See decisions.md D7.
- Platform scope: Discord-only. The `messages.platform`, `sessions.platform`, `session_search.platform` and `import_log.platform` CHECK constraints lock to `'discord'`. IRC is excluded entirely (decisions.md D9-revised): no IRC importer, no `mirc-logs/` traversal, no IRC tables. Arc 3 reconsiders only if (a) a codepage re-import makes IRC content trustworthy AND (b) operator demand for IRC-era queries emerges.
- Retrieval unit is the topic-coherent THREAD (`chat_threads`): each thread's RAW member messages are concatenated, embedded (voyage-4-large) and FTS-indexed; `search_solved_issues` is hybrid (vector-primary + FTS via RRF k=60), mirroring `search_entities`. A summary is NOT embedded -- raw messages are (decisions.md D3). `sessions` / `session_search` remain as raw timestamp-grouped adjacent context, no longer the retrieval unit. `match_quality` is graded on closeness (best cosine similarity vs per-corpus cut-offs, `serve/mcp/src/grade.ts`); the chat cut-offs rest on only 11 labeled questions (`API_CONTRACTS.md` Open drift 1).
- **An import is NOT availability**: `build-sessions.ts --force` must re-run after every import or the new messages carry no `message_labels` and are invisible to the chunker. Currency is the monthly harvest ritual (`scripts/load-chat/HARVEST-RUNBOOK.md`, calendar-checks entry); batch state is `scripts/load-chat/backfill-ledger.md`; prod takes the result by the twin->prod refresh in `DEPLOYMENT.md`.
- Hygiene tightenings absorbed into the Postgres port (decisions.md D18): filter-then-segment session boundaries, nullable `message_labels.session_id` for bot/reaction/system messages, `BOT_COMMAND_PATTERNS` removed (Discord exposes `author_is_bot` reliably), and the `session_references` reply-graph table.

Corpus sizes live in `OVERVIEW.md` (Layer 2 line); the shipped backfill and the prod refreshes are chronicled in `docs/arc-history.md` and `DEPLOYMENT.md`'s worked examples; open Layer 2 work is the root `HANDOVER.md` row.

## Documentation index

| When you need... | Read... |
|---|---|
| Load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries) | `OVERVIEW.md` |
| Vision: the knowledge service (Layers 1-3 + MCP + snapshot distribution), active-assistance answer-shape, consumer list | `VISION.md` |
| Elevator pitch (humans + cold Claude land here first) | `README.md` |
| Layer 1 data model + per-table shape | `SCHEMA.md` |
| MCP API contract -- tool surface, response shape, match_quality semantics, new-dataset checklist | `API_CONTRACTS.md` |
| Dev loops, runners, verifier scripts, prerequisites, gotchas | `DEVELOPMENT.md` |
| Production deploy runbook (Unraid + nginx + CF Tunnel) | `DEPLOYMENT.md` |
| Operator observability cheatsheet (query_log + embedding_api_log queries) | `docs/OBSERVABILITY.md` |
| Eval gate + `match_quality` calibration: the two disjoint labeled query sets and how to extend them | `eval/README.md` |
| Local QW engines for testing (headless ezQuake dumps, a local mvdsv + KTX server; gitignored data) | `quake/README.md` |
| ezQuake runtime detection answer key (enforce-L1 arc): what sits in `data/detection/` and its line-range contract | `data/detection/README.md` |
| Layer 2/3 calibration probes: the 2026-06 fencing-arm probe (throwaway) and the FAQ acceptance-gate runner | `scripts/calibration/README.md`, `scripts/calibration/faq-gate/README.md` |
| Schema spec (original design rationale; superseded incrementally by per-arc specs -- see arc history) | `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` (root tree) |

**Start with `OVERVIEW.md` when working in this project -- it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries).**

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `curated/concept-notes/` | `curated/concept-notes/CLAUDE.md` | Layer 3 free-form synthesis sub-shape (open-ended concept notes; bounded by earn-the-note tests) |
| `curated/asset-notes/` | `curated/asset-notes/CLAUDE.md` | Layer 3 engine-data synthesis sub-shape (one note per qw-asset-types.yaml entry; asset-type-curate skill arc 2026-05-13) |
| `curated/player-notes/`, `curated/clan-notes/`, `curated/tournament-notes/` | `scripts/load-community/CLAUDE.md` (the loader that emits them; the note files are loader output and carry no index of their own) | Layer 3 wiki-import biographical sub-shape (profile-notes; storage shipped, MCP tools pending -- root HANDOVER "QWiki community-reference", paused) |
| `docs/` | `docs/CLAUDE.md` | App-wide Layer 3 refs (entity-types, extraction roadmap) + arc-history |
| `scripts/extractors/` | `scripts/extractors/CLAUDE.md` | Per-codebase Layer 1 extractors + PLAYBOOK + RUNBOOK |
| `scripts/load-knowledge/` | `scripts/load-knowledge/CLAUDE.md` | Layer 1 loader: schema, adapters, dispatcher, diff/blame, snapshots |
| `scripts/load-chat/` | `scripts/load-chat/CLAUDE.md` | Layer 2 loader: Discord ingest, sessions, thread fencing + loading, the monthly harvest runbook, the backfill ledger |
| `scripts/load-concepts/` | `scripts/load-concepts/CLAUDE.md` | Layer 3 concept-note loader (frontmatter parse, chunking, per-slug upsert) |
| `scripts/load-community/` | `scripts/load-community/CLAUDE.md` | Layer 3 community-reference loader (QWiki snapshot -> `community.*` rows + player/clan note files); indexes the snapshot and brand-curation tools |

## Excluded paths

| Path | Why |
|---|---|
| `scripts/extractors/ezquake/diagnostics/` | Historical AST-spike outputs and debug log emissions (artifact dir; regenerable on demand). |
| `scripts/extractors/mvdsv/validation-fixtures/` | Fixture corpus (artifact dir). The README inside is explicitly indexed via `scripts/extractors/mvdsv/CLAUDE.md` and remains reachable. |
| `curated/concept-notes/<slug>.md`, `curated/asset-notes/<slug>.md` | The curated corpora themselves. Individual notes are data under each bucket's `OPERATIONS.md`; the walk indexes a bucket's `CLAUDE.md` / `README.md` / `OPERATIONS.md` and stops at the corpus root. |
| `curated/player-notes/`, `curated/clan-notes/`, `curated/tournament-notes/` | Loader-emitted note corpus (~920 files, regenerated from the wiki snapshot by `scripts/load-community/`). No index of its own; the walk stops at the corpus root. |
| `data/wiki-cache/` | Cached wiki pages fetched by the gameplay extractor (data, not docs). `data/detection/README.md` beside it is indexed above. |
| `docs/asset-curation/` | Per-slug investigation reports written by the `asset-type-curate` skill (evidence trail, re-walkable). The README inside is indexed from `docs/CLAUDE.md` and stays reachable. |
| `docs/upstream-prs/` | Upstream-PR-bound digests + hand-authored upstream audit reports. Mixed dir: auto-generated digests (`ezquake-help-json-cleanup.md` via `scripts/build-help-json-pr-digest.py` from `seeds/help_json_classifications.yaml`; `ezquake-runtime-dead-entities.md` via `scripts/build-runtime-dead-entities.py` from the L1 Track-A signal) AND hand-authored audit reports (`ezquake-help-json-coverage-gaps.md`, `ezquake-help-json-empty-entries*.md`). All regenerable / re-derivable from primary sources; never hand-edit auto-generated files. |

## Tech stack

- **TypeScript + Bun** for every script (loader, embed, eval, calibrate, MCP server). Schema migrations applied by `db/migrate.ts` from `.sql` files in `db/migrations/`.
- **PostgreSQL 16 + pgvector + tsvector** (image: `pgvector/pgvector:pg16`); single engine across Layer 1 / Layer 2 / Layer 3. The MCP server ports off `better-sqlite3` to **postgres-js** at Phase 6.
- **postgres-js** for DB access everywhere, the MCP server included; **Voyage v4 series** (`voyage-4-large` build / `voyage-4-lite` query) for embeddings; **@modelcontextprotocol/sdk** + **express** for the MCP server (Streamable HTTP transport behind Cloudflare Tunnel); **ulid** for extractor-run IDs; **js-yaml** for seed ingestion; **gray-matter** for concept-note frontmatter.
- **Python 3 + libclang 18** for the C-codebase extractors (live at `scripts/extractors/<project>/`; shared lib at `scripts/extractors/extractor_lib/`); **Go** (`go/parser` + `go/ast`) for the QTV extractor (`scripts/extractors/qtv/extract.go`, output committed; no Go toolchain on the cockpit).

## Always-on rules

- **`bun install` for adding/installing deps** in this directory. Do NOT use npm -- `apps/qw-oracle/package.json` carries the `@qw/version-resolution: workspace:*` dep, which npm rejects with `EUNSUPPORTEDPROTOCOL` even when run with `--no-workspaces`. Bun handles `workspace:` natively. (D2 also pins Bun as the runtime; this rule extends D2 to install-time.)
- **Bun is the runtime** for every TypeScript entry point: `scripts/load-knowledge/`, `scripts/load-chat/`, `scripts/load-concepts/`, `scripts/load-community/`, `scripts/embed/`, `eval/`, `db/` and `serve/mcp/`. CLI scripts use `bun scripts/.../index.ts` and rely on `import.meta.main` guards (Bun-only). No `tsx`, no Node entry points (`DEVELOPMENT.md`).
- **Raw data is immutable** -- never modify imported Layer 2 messages; all derived processing regenerates from raw.
- **Layer 1 extractors are idempotent** -- re-running against the same tag produces the same rows.
- **Regression guards are load-bearing** -- `load-version` aborts when entity counts drop >50% without `--force`. Don't bypass.
- **Source citation discipline** -- every Layer 1 row that can carry a `source_ref` must; every Layer 2 summary must trace back to message IDs; every Layer 3 claim cites code line / message ID / concept note.
- **Schema evolution is append-only** -- new schema changes land as a new `db/migrations/<NNN>_<name>.sql` file (run via `bun db/migrate.ts`); never edit an applied migration. Update `SCHEMA.md` alongside. Architecturally-significant changes additionally get a dated spec under root `docs/superpowers/specs/`. Small additive migrations don't need a spec -- `SCHEMA.md` + git history + the `.sql` file's header comment are enough.
- **JSONB columns receive JS values, not pre-stringified JSON** -- pass the JS array/object directly (or wrap with `tx.json(...)` for postgres-js type compliance); pre-stringifying stores a JSONB string scalar (the legacy SQLite-era TEXT bug). Probe `F1.jsonb_columns_not_strings` is the regression gate.
- **Tag every generated output** with model + prompt version.
- **Authoritative store is Postgres 16 + pgvector + tsvector** -- single-engine across all three layers. The SQLite era ended with Arc 1 (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`); SQLite remains acceptable only for genuinely-derived artefacts (test fixtures, throwaway POCs).
- **Keep it simple** -- scripts over frameworks, integration tests over unit tests, hand-rolled SQL migrations over migration frameworks. Local-first processing -- minimise API costs, maximise iteration speed.
