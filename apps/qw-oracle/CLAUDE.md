# QW Oracle - QuakeWorld Knowledge Service

**Status:** Active development. Schema v18. Four codebases loaded into Layer 1 (ezQuake / FTE / QWCL / MVDSV) plus the `qw` namespace for game content (maps + game mechanics). KTX is the only outstanding port. For chronological ship history see [`docs/arc-history.md`](docs/arc-history.md). For active backlog see `HANDOVER.md` (root).

## Documentation index

| When you need... | Read... |
|---|---|
| Load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries) | `OVERVIEW.md` |
| Vision: the knowledge service (Layers 1-3 + MCP + snapshot distribution), active-assistance answer-shape, consumer list | `VISION.md` |
| Elevator pitch (humans + cold Claude land here first) | `README.md` |
| Layer 1 data model + per-table shape | `SCHEMA.md` |
| Dev loops, runners, verifier scripts, prerequisites, gotchas | `DEVELOPMENT.md` |
| Schema spec (original design rationale; superseded incrementally by per-arc specs -- see arc history) | `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` (root tree) |

**Start with `OVERVIEW.md` when working in this project -- it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries).**

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `concept-notes/` | `concept-notes/CLAUDE.md` | Layer 3 corpus + authoring conventions + stewardship playbook |
| `docs/` | `docs/CLAUDE.md` | App-wide Layer 3 refs (entity-types, extraction roadmap) + arc-history |
| `scripts/extractors/` | `scripts/extractors/CLAUDE.md` | Per-codebase Layer 1 extractors + PLAYBOOK + RUNBOOK |
| `scripts/load-knowledge/` | `scripts/load-knowledge/CLAUDE.md` | Layer 1 loader: schema, adapters, dispatcher, diff/blame, snapshots |

## Excluded paths

| Path | Why |
|---|---|
| `scripts/extractors/ezquake/diagnostics/` | Historical AST-spike outputs and debug log emissions (artifact dir; regenerable on demand). |
| `scripts/extractors/mvdsv/validation-fixtures/` | Fixture corpus (artifact dir). The README inside is explicitly indexed via `scripts/extractors/mvdsv/CLAUDE.md` and remains reachable. |
| `docs/upstream-prs/` | Auto-generated upstream PR digests (regenerable from `seeds/help_json_classifications.yaml` + repo HEAD via `scripts/build-help-json-pr-digest.py`). |

## Tech stack

- **TypeScript + Bun** for the Layer 1 loader (`scripts/load-knowledge/`). Schema migrations applied by `db/migrate.ts` from `.sql` files in `db/migrations/`.
- **Plain .mjs scripts** for the Layer 2 corpus import (`scripts/import-*.mjs`, `scripts/stats.mjs`); these still use `better-sqlite3` against `data/qw.db` until Phase 3 of Arc 1 ports them.
- **PostgreSQL 16 + pgvector** for Layer 1 (`apps/qw-oracle/db/migrations/`); the loader and MCP-Layer-1 paths use **postgres-js**. `better-sqlite3` is still pulled in by the Layer 2 import scripts and the MCP server (`serve/mcp/`) until Phase 3 + Phase 6 of Arc 1 port them. **ulid** for extractor-run IDs; **js-yaml** for seed ingestion.
- **Python 3 + libclang 18** for the engine-source extractors (live at `scripts/extractors/<project>/`; shared lib at `scripts/extractors/extractor_lib/`).

## Always-on rules

- **npm `--no-workspaces` required** for add/install commands in this directory (monorepo setup).
- **Bun is the runtime** for everything under `scripts/load-knowledge/` and `db/`. CLI scripts use `bun scripts/.../index.ts` and rely on `import.meta.main` guards (Bun-only).
- **Raw data is immutable** -- never modify imported Layer 2 messages; all derived processing regenerates from raw.
- **Layer 1 extractors are idempotent** -- re-running against the same tag produces the same rows.
- **Regression guards are load-bearing** -- `load-version` aborts when entity counts drop >50% without `--force`. Don't bypass.
- **Source citation discipline** -- every Layer 1 row that can carry a `source_ref` must; every Layer 2 summary must trace back to message IDs; every Layer 3 claim cites code line / message ID / concept note.
- **Schema evolution is append-only** -- new schema changes land as a new `db/migrations/<NNN>_<name>.sql` file (run via `bun db/migrate.ts`); never edit an applied migration. Update `SCHEMA.md` alongside. Architecturally-significant changes additionally get a dated spec under root `docs/superpowers/specs/`. Small additive migrations don't need a spec -- `SCHEMA.md` + git history + the `.sql` file's header comment are enough.
- **JSONB columns receive JS values, not pre-stringified JSON** -- pass the JS array/object directly (or wrap with `tx.json(...)` for postgres-js type compliance); pre-stringifying stores a JSONB string scalar (the legacy SQLite-era TEXT bug). Probe `F1.jsonb_columns_not_strings` is the regression gate.
- **Tag every generated output** with model + prompt version.
- **Keep it simple** -- scripts over frameworks; Postgres for Layer 1 + Layer 2 (post-Phase-3); local-first processing -- minimise API costs, maximise iteration speed.
