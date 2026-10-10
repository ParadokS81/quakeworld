# Development - QW Oracle

How to get a working dev environment on the cockpit and how to run, build and verify each of the four subsystems (Layer 1 loader, Layer 1 extractors, MCP server, Layer 2 corpus). Companion to `CLAUDE.md` (orientation + the environment table), `OVERVIEW.md` (load-bearing map), `scripts/load-knowledge/quality-grid.ts` (F1 load-verification gate), `scripts/extractors/EXTRACTOR-PLAYBOOK.md` (handler patterns) and `scripts/extractors/VALIDATION-RUNBOOK.md` (per-extractor acceptance).

## Prerequisites

- **Bun 1.x** -- the runtime for every TypeScript entry point here: loader, Layer 2 and Layer 3 loaders, embedding scripts, eval, the MCP server. `bun install` in this directory; never npm (`package.json` carries a `workspace:*` dep that npm rejects, `CLAUDE.md` Always-on rules). The box has Bun 1.3.x and Node 22; nothing here needs Node or `tsx`.
- **Python 3 + libclang 18** -- the C-codebase extractors (`clang.cindex` imports on the cockpit as of 2026-10-10) against the clones under `research/repos/` (ezQuake, FTE, QWCL, MVDSV, KTX are git clones; QTV and QWFWD are vendored snapshots with no `.git`).
- **Go toolchain** -- only for re-running the QTV extractor (`scripts/extractors/qtv/extract.go`). Not installed on the cockpit as of 2026-10-10; its output JSON is committed, so loading QTV needs no Go. Ask ops (letter) if a re-extract is needed.
- **pytest** -- the extractor test suites. Not installed on the cockpit as of 2026-10-10 (`python3 -m pytest` -> "No module named pytest"); `python3 -m pip install --user pytest` before running them.
- **psql** -- via the container: `docker exec -it qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`.

### The database

The authoritative dev store is the **dev twin** `qw-oracle-postgres-dev` (pgvector/pg16), provisioned by ops from `infra/dev-databases/docker-compose.yml` on the host and seeded from a prod dump (re-seed procedure is host-plane: `/mnt/user/appdata/dev/seeds/RESEED.md`). It is already running; nothing here starts it. Connection: `DATABASE_URL=postgresql://qworacle:<ORACLE_DEV_PW>@qw-oracle-postgres-dev:5432/qw_oracle` in `apps/qw-oracle/.env`, password from `~/.secrets/dev-databases.env` -- put it there with `secret-drop env .env DATABASE_URL`, never by typing it inline. `.env.example` still shows the workstation-era `localhost:5432` default; the hostname above is the one that resolves on devnet.

Prod (`qw-oracle-postgres`) has no network route from the cockpit by design; it is reached only through `docker exec` / `docker cp` for the dump-and-restore in `DEPLOYMENT.md`.

The `db:up` / `db:down` / `db:logs` / `db:psql` scripts in `package.json` drive `db/docker-compose.dev.yml`, the workstation-era local twin. **Do not run them on the cockpit** -- they would try to create a second `qw-oracle-postgres-dev`. `bun run migrate` (`db/migrate.ts`) is still how new migrations are applied to the twin.

## Layer 1 loader (TypeScript)

Lives at `scripts/load-knowledge/`. CLI dispatcher + per-type adapters.

```bash
# From apps/qw-oracle/
bun run typecheck                                    # tsc --noEmit over tsconfig's include list
bun scripts/load-knowledge/index.ts <subcommand> [...flags]
bun run load-knowledge -- <subcommand> [...flags]    # same thing via the package script
bun scripts/load-knowledge/index.ts --help           # the dispatcher's usage text is the canonical subcommand catalog
```

The subcommands (`load-version`, `load-assets`, `load-maps`, `load-gameplay`, `load-ktx-modes`, `load-ktx-taxonomies`, `extract-tag`, `diff`, `enrich`, `release-notes`, `review`, `quality-grid`, `idempotency`, `reproducibility-check`, `build-snapshot`, `build-docs-snapshot`, `prune-cross-type-orphans`, `re-derive`, ...) are documented in the `--help` block of `scripts/load-knowledge/index.ts`; that block is the source of truth, not this file.

The `--ordinal` flag is auto-resolved from the `versions` table when the (project, version) pair already exists; only net-new tags need to pass it explicitly.

Verify a load: `bun scripts/load-knowledge/index.ts quality-grid --project <project>` (regression + anomaly probes; `scripts/load-knowledge/quality-grid.ts`; `--list` prints the probe catalog without touching the DB).

`tsconfig.json`'s `include` covers the loaders, `db/` and `scripts/generate-pg-migration.ts` only -- `serve/mcp/`, `eval/`, `shared/` and `scripts/calibration/` are outside it (root HANDOVER carries the `scripts/calibration/**` gap as F13). `bun run typecheck` exiting 0 says nothing about those trees.

## Layer 1 extractors (Python + libclang; Go for QTV)

Live at `scripts/extractors/<project>/`. One canonical driver per project; shared helpers in `scripts/extractors/extractor_lib/` (Python) and `scripts/extractors/shared/` (Bun-side inventory checks). Outputs land in `scripts/extractors/<project>/output/` and are committed.

```bash
# From apps/qw-oracle/. Each driver defaults to the matching clone under research/repos/.
python3 scripts/extractors/ezquake/extract.py [--handlers <names>|all] [--workers N] [--serial]
python3 scripts/extractors/fte/extract.py     [...same flags]
python3 scripts/extractors/qwcl/extract.py    [...same flags]
python3 scripts/extractors/mvdsv/extract.py   [...same flags]
python3 scripts/extractors/ktx/extract.py     [...same flags]
python3 scripts/extractors/qwfwd/extract.py   [...same flags]
go run scripts/extractors/qtv/extract.go      # Go; not runnable on the cockpit (no toolchain), output is committed

# Map / gameplay (qw namespace) pipelines:
python3 scripts/extractors/qw/extract.py
```

Per-handler tests (pytest; see Prerequisites):

```bash
python3 -m pytest scripts/extractors/ -q                 # everything
python3 -m pytest scripts/extractors/ezquake/tests/ -q   # per extractor: ezquake / fte / ktx / mvdsv / qw / extractor_lib / shared
```

For handler patterns (multiprocessing-safe two-row emission, fork-override hooks, etc.) see `scripts/extractors/EXTRACTOR-PLAYBOOK.md`. For determinism / reproducibility acceptance see `scripts/extractors/VALIDATION-RUNBOOK.md` (its command lines are still written for the SQLite-era workstation -- root HANDOVER carries the rewrite).

## MCP server (Bun)

Lives at `serve/mcp/`. Separate `package.json` + `bun.lock` (not a workspace member); runs under Bun directly against the twin.

```bash
# From apps/qw-oracle/serve/mcp/
bun install                                  # one-time
bunx tsc --noEmit                            # typecheck (its own tsconfig)
bun run src/index.ts                         # start the server (stdio)
bun run scripts/verify-rewrite.ts            # 24-assertion smoke test (engine-entity tools)
bun run scripts/verify-gameplay.ts           # tier-1 in-process gameplay-tool verification
bun run scripts/test-call.ts                 # adhoc tool-by-tool calls -- broken when run from this dir (root HANDOVER F20)

# From apps/qw-oracle/ -- HTTP transport on :3000, the shape prod runs
bun run mcp:dev:http
```

The server reads `qw_oracle` read-only and must be restarted to pick up loader changes. Version lives in `serve/mcp/src/version.ts` (`package.json` is kept in lockstep by hand; a mismatch is a bug -- `API_CONTRACTS.md`).

## Layer 2 corpus (Discord chat)

Lives at `scripts/load-chat/` -- TypeScript under Bun, Postgres + tsvector + pgvector. Discord-only (`decisions.md` D9-revised). The pipeline order and its idempotency rules live in `scripts/load-chat/CLAUDE.md`; the monthly catch-up is `scripts/load-chat/HARVEST-RUNBOOK.md` (ingest, re-segment, fence the new chunks, load threads) and its batch state is `scripts/load-chat/backfill-ledger.md`.

```bash
# From apps/qw-oracle/ -- the raw-ingest half (idempotent at every step)
bun scripts/load-chat/import-discord.ts            # ingest apps/quad/exports/*.json
bun scripts/load-chat/build-sessions.ts --force    # classify + filter-then-segment; REQUIRED after an import
bun scripts/load-chat/build-session-references.ts  # cross-session reply edges
bun scripts/load-chat/build-search-index.ts        # rebuild session_search (tsvector)
# one-shot bootstrap only: `bun scripts/load-chat/seed-discord-channels.ts`, then
# `bun scripts/load-chat/import-historical-from-qwdb.ts` (sentinel-gated)
```

Raw imported messages are immutable; the derived tables (sessions, references, search index, threads) rebuild from the raw layer.

## Layer 3 notes

`bun scripts/load-concepts/index.ts` loads `curated/concept-notes/*.md` into Postgres (idempotent, hash-skips unchanged notes); `bun run embed:chunks` embeds new or changed chunks. Required after any note edit -- the loader is the only thing that copies note content into the DB.

## Quality grid

Regression + anomaly probes against a project's loaded state. Use after any loader-touching change.

```bash
bun scripts/load-knowledge/index.ts quality-grid --list                                    # list probes (no DB)
bun scripts/load-knowledge/index.ts quality-grid --project ezquake                         # both families
bun scripts/load-knowledge/index.ts quality-grid --project fte --family regression
bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --probe <name> --json
```

Exit code is non-zero when any probe FAILs or ERRORs; CI-friendly.

## Commands cheatsheet

| Common tasks | Command |
|---|---|
| Typecheck loader | `bun run typecheck` (tsconfig's include list only, see above) |
| Typecheck MCP | `cd serve/mcp && bunx tsc --noEmit` |
| Test MCP (cockpit) | `DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env \| cut -d= -f2- \| sed 's#/qw_oracle$#/qw_oracle_test#')" bun test serve/mcp` -- the `test` script's localhost URL predates the cockpit; DB tests skip unless the URL names `qw_oracle_test` |
| match_quality calibration report | `bun run calibrate` (`eval/README.md`; `--dump <file>` keeps the raw observations) |
| Eval gate | `bun run eval` (`eval/README.md`) |
| Smoke MCP | `cd serve/mcp && bun run scripts/verify-rewrite.ts` |
| Re-extract one project | `python3 scripts/extractors/<project>/extract.py` |
| Re-load one tag end-to-end | `bun scripts/load-knowledge/index.ts extract-tag --project <p> --version <v>` |
| Quality grid | `bun scripts/load-knowledge/index.ts quality-grid --project <p>` |
| Regenerate slipgate snapshots | `bun scripts/load-knowledge/index.ts build-snapshot --project <p>` |
| Pytest (all) | `python3 -m pytest scripts/extractors/ -q` |
| DB inspect | `docker exec -it qw-oracle-postgres-dev psql -U qworacle -d qw_oracle` |
| Observability queries | `docs/OBSERVABILITY.md` |

## Gotchas

- **The twin is not yours to start or stop.** It is an ops-provisioned container; `docker compose` against `db/docker-compose.dev.yml` is the workstation-era path. If an experiment trashes the twin, re-seed per `RESEED.md` (host plane, via ops) -- twins are cattle, prod is never touched.
- **libclang TUs and Windows-SDK headers** -- some Windows-only `.c` files (e.g. ezQuake's `sv_sys_win.c`) refuse to parse fully under Linux libclang because `<winsock2.h>` / `<mmsystem.h>` aren't installed. Affects a small number of cmdline_param recoveries; tracked in root HANDOVER.
- **Re-extract before re-load** -- `extract-tag` runs the Python extractor and the loaders together. If you only edit a Python handler and want to test the loader against the fresh JSON, run `extract.py` first, then `load-version`.
- **An import is not availability** -- new Layer 2 messages are invisible to the thread chunker until `build-sessions.ts --force` has written their `message_labels` (`HARVEST-RUNBOOK.md`).
- **Scratch scripts that import the project's packages run inside the project**, where `node_modules` resolves; from a scratchpad dir the same import fails with `ERR_MODULE_NOT_FOUND`.
