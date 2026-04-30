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

- **TypeScript + Node 20+ / Bun** for the Layer 1 loader (`scripts/load-knowledge/`).
- **Plain .mjs scripts** for the Layer 2 corpus import (`scripts/import-*.mjs`, `scripts/stats.mjs`).
- **better-sqlite3 11** for both stores; **ulid** for extractor-run IDs; **js-yaml** for seed ingestion.
- **Python 3 + libclang 18** for the engine-source extractors (live at `scripts/extractors/<project>/`; shared lib at `scripts/extractors/extractor_lib/`).

## Always-on rules

- **npm `--no-workspaces` required** for add/install commands in this directory (monorepo setup).
- **`tsx -e` cannot resolve relative paths** -- use a temp file inside `scripts/load-knowledge/` instead.
- **Raw data is immutable** -- never modify imported Layer 2 messages; all derived processing regenerates from raw.
- **Layer 1 extractors are idempotent** -- re-running against the same tag produces the same rows.
- **Regression guards are load-bearing** -- `load-version` aborts when entity counts drop >50% without `--force`. Don't bypass.
- **Source citation discipline** -- every Layer 1 row that can carry a `source_ref` must; every Layer 2 summary must trace back to message IDs; every Layer 3 claim cites code line / message ID / concept note.
- **Schema evolution updates `SCHEMA.md`** -- schema changes update `SCHEMA.md` alongside the migration. Architecturally-significant changes (new entity-identity concepts, cross-cutting blame models, migrations that reshape how diffs work) additionally get a dated spec under root `docs/superpowers/specs/`. Small additive migrations don't need a spec -- `SCHEMA.md` + git history + `schema.ts` comments are enough.
- **Tag every generated output** with model + prompt version.
- **Keep it simple** -- scripts over frameworks, SQLite over Postgres. Local-first processing -- minimise API costs, maximise iteration speed.
