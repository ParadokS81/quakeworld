# Development - QW Oracle

Index of dev loops, runners, and verifier scripts across the four subsystems (Layer 1 loader, Layer 1 extractors, MCP server, Layer 2 corpus). Companion to `CLAUDE.md` (orientation), `OVERVIEW.md` (load-bearing map), `scripts/load-knowledge/quality-grid.ts` (F1 load-verification gate), `scripts/extractors/EXTRACTOR-PLAYBOOK.md` (handler patterns), and `scripts/extractors/VALIDATION-RUNBOOK.md` (per-extractor acceptance).

## Prerequisites

- **Node.js 20+** -- the loader CLI and tests run under `tsx`.
- **npm** -- pass `--no-workspaces` for any add/install in this directory (monorepo quirk).
- **Bun 1.x** -- the MCP server runs under Bun with **postgres-js** against the Postgres dev DB (the `bun:sqlite` / `better-sqlite3` era ended at Arc 1 Phase 6).
- **Python 3 + libclang 18** -- the engine-source extractors use `python3-clang` against vendored ezQuake / FTE / QWCL / MVDSV checkouts under `research/repos/`.
- **psql** (optional) -- handy for ad-hoc queries: `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`.

The authoritative store is the `qw-oracle-postgres-dev` Postgres container (Docker volume; data gitignored, rebuilt locally). An empty clone has no DB until the loaders run. The SQLite era of `data/knowledge.db` + `data/qw.db` ended with Arc 1.

## Layer 1 loader (TypeScript)

Lives at `scripts/load-knowledge/`. CLI dispatcher + per-type adapters.

```bash
# From apps/qw-oracle/
npm run typecheck                                    # tsc --noEmit
npm run load-knowledge -- <subcommand> [...flags]
```

Subcommands (all routed through `scripts/load-knowledge/index.ts`):

| Subcommand | Purpose |
|---|---|
| `load-version` | Load one entity type for one (project, version) from extractor JSON |
| `load-assets` | Load the asset bundle (extensions, path rules, cvar bindings, loader sites) |
| `load-maps` | Populate the `qw` namespace `maps` table from the BSP/stats pipeline |
| `load-gameplay` | Populate `gameplay_*` tables from the seed YAML |
| `extract-tag` | Atomic: `git checkout <tag>` + run extractors + load every type for the project |
| `diff` | Generate `change_events` rows for an adjacent (project, fromVersion, toVersion) pair |
| `enrich` | Walk recent `change_events` and attach GitHub PR metadata |
| `release-notes` | Pull a tag's GitHub release notes and bullet-split into the `release_notes` table |
| `review` | Emit findings JSON + draft markdown for the extraction-review skill |
| `quality-grid` | Run regression + anomaly probes against a project's loaded state |
| `build-snapshot` | Emit slipgate-shaped JSON into `apps/slipgate-app/src/lib/config/data/` |
| `prune-cross-type-orphans` | Clean up doc-only entities collided with cross-type source-backed entities |
| `re-derive` | Rebuild `entities.description` over existing rows after a derive-step change. Flips `description_embedding_stale=TRUE`; the next `embed-entities` pass picks up changed rows via the description-hash check. |

The `--ordinal` flag is auto-resolved from the `versions` table when the (project, version) pair already exists; only net-new tags need to pass it explicitly.

Verify a load: run the F1 quality-grid -- `npm run load-knowledge -- quality-grid --project <project>` (regression + anomaly probes; `scripts/load-knowledge/quality-grid.ts`). Ad-hoc: `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`.

## Layer 1 extractors (Python + libclang)

Lives at `scripts/extractors/<project>/`. One canonical driver (`extract.py`) per project; shared helpers in `scripts/extractors/extractor_lib/` and `scripts/extractors/_lib/`. Outputs land in `scripts/extractors/<project>/output/` and are committed.

```bash
# From apps/qw-oracle/. Defaults to the matching repo under research/repos/.
python3 scripts/extractors/ezquake/extract.py [--handlers <names>|all] [--workers N] [--serial]
python3 scripts/extractors/fte/extract.py     [...same flags]
python3 scripts/extractors/qwcl/extract.py    [...same flags]
python3 scripts/extractors/mvdsv/extract.py   [...same flags]

# Map / gameplay (qw namespace) pipelines:
python3 scripts/extractors/qw/extract.py
```

Per-handler tests (pytest):

```bash
# All extractor-side Python tests
pytest scripts/extractors/ -q

# Per-extractor
pytest scripts/extractors/ezquake/tests/ -q
pytest scripts/extractors/fte/tests/ -q
pytest scripts/extractors/qw/tests/ -q
pytest scripts/extractors/extractor_lib/tests/ -q
```

For handler patterns (multiprocessing-safe two-row emission, fork-override hooks, etc.) see `scripts/extractors/EXTRACTOR-PLAYBOOK.md`. For determinism / reproducibility acceptance see `scripts/extractors/VALIDATION-RUNBOOK.md`.

## MCP server (Bun)

Lives at `serve/mcp/`. Separate `package.json`; runs under Bun directly.

```bash
# From apps/qw-oracle/serve/mcp/
bun install                                  # one-time
bunx tsc --noEmit                            # typecheck
bun run src/index.ts                         # start the server (stdio)
bun run scripts/test-call.ts                 # adhoc tool-by-tool sanity calls
bun run scripts/verify-rewrite.ts            # 24-assertion smoke test (engine-entity tools)
bun run scripts/verify-gameplay.ts           # tier-1 in-process gameplay-tool verification
```

The server reads the `qw_oracle` Postgres DB (container `qw-oracle-postgres-dev`) read-only; it must be restarted to pick up loader changes.

## Layer 2 corpus (legacy .mjs)

Lives at `scripts/import-*.mjs` and `scripts/*.mjs`. Plain Node, no TypeScript. Imports the IRC + Discord chat corpus into `data/qw.db`.

```bash
# From apps/qw-oracle/
npm run import:discord
npm run import:irc
npm run stats
```

Raw imported messages are immutable; all derived analytics regenerate from the raw layer.

## Quality grid

Regression + anomaly probes against a project's loaded state. Use after any loader-touching change.

```bash
npm run load-knowledge -- quality-grid --list                                    # list probes
npm run load-knowledge -- quality-grid --project ezquake                         # both families
npm run load-knowledge -- quality-grid --project fte --family regression
npm run load-knowledge -- quality-grid --project mvdsv --probe <name> --json
```

Exit code is non-zero when any probe FAILs or ERRORs; CI-friendly.

## Commands cheatsheet

| Common tasks | Command |
|---|---|
| Typecheck loader | `npm run typecheck` |
| Typecheck MCP | `cd serve/mcp && bunx tsc --noEmit` |
| Smoke MCP | `cd serve/mcp && bun run scripts/verify-rewrite.ts` |
| Re-extract one project | `python3 scripts/extractors/<project>/extract.py` |
| Re-load one tag end-to-end | `npm run load-knowledge -- extract-tag --project <p> --version <v>` |
| Quality grid | `npm run load-knowledge -- quality-grid --project <p>` |
| Pytest (all) | `pytest scripts/extractors/ -q` |
| DB inspect | `docker exec -it qw-oracle-postgres-dev psql -U qworacle -d qw_oracle` |

## Gotchas

- **`npm --no-workspaces`** -- npm add/install in this directory must include `--no-workspaces` or it walks the monorepo. Already documented in `CLAUDE.md`.
- **`tsx -e` cannot resolve relative paths** -- one-off scripts must live as a temp file inside `scripts/load-knowledge/`, not invoked via `tsx -e "<inline>"`. Already documented in `CLAUDE.md`.
- **`bun run` on the loader fails** -- the Layer 1 loader uses `better-sqlite3` (native addon, not yet supported by Bun). Use `npm run load-knowledge` (tsx) for loader work; reserve Bun for the MCP server.
- **libclang TUs and Windows-SDK headers** -- some Windows-only `.c` files (e.g. ezQuake's `sv_sys_win.c`) refuse to parse fully under Linux libclang because `<winsock2.h>` / `<mmsystem.h>` aren't installed. Affects a small number of cmdline_param recoveries; tracked in HANDOVER.
- **Re-extract before re-load** -- `extract-tag` runs the Python extractor and the loaders together. If you only edit a Python handler and want to test the loader against the fresh JSON, run `extract.py` first, then `load-version`.
