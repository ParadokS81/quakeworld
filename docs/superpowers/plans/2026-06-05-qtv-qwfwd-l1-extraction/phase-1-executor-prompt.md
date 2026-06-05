# Phase 1 executor prompt -- arc 2026-06-05-qtv-qwfwd-l1-extraction

You are the **arc-executor** for **Phase 1 -- QWFWD extractor + vendored load path (the tracer bullet)**. Invoke the `arc-executor` skill and execute this phase against its MD. This is **execution**: you write a libclang extractor (driver + 4 handlers + clang config), run it, load the output into Postgres via `load-version --json`, and run the boundary probes.

**Arc identity (halt if this does not match):** arc `2026-06-05-qtv-qwfwd-l1-extraction`; scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are adding the C QWFWD UDP forwarder (`qwfwd`) to the qw-oracle Layer 1 pipeline. If the material talks about KTX/MVDSV describe-fill finding codes or `mvdsv-*-ledger-*.md` files as the thing you edit, you are in the WRONG arc -- STOP.

**Working directory:** `/home/paradoks/projects/quakeworld` (qw-oracle at `apps/qw-oracle/`).

## Read first (in this order)

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md`
2. `.../decisions.md` -- D1 (load-version, never extract-tag), D4 (frozen version label + commit sentinel), D5 (no new entity types), D7 (ASCII), D11 (atomicity).
3. `.../review-findings.md` -- **Phase 1 owns F2, F5, F6, F7** (and note F9/F10 are Phase-0-resolved, no action here).
4. `.../phase-1-qwfwd-extractor.md` -- the phase MD you execute. Read cold, critically review against decisions/findings, then execute Tasks 1-8 per their declared execution modes. The MD's Open-questions Q-INFO / Q-CVARFULLSET / Q-CMDLINE-NAMES / Q-VERSIONS-ROW-TIMING are already RESOLVED in the MD -- follow them, do not re-litigate.

The handler/driver subagents mirror the **MVDSV extractor** (`apps/qw-oracle/scripts/extractors/mvdsv/`) and read the loader adapters (`scripts/load-knowledge/load-{cvars,commands,cmdline-params,info-keys}.ts`) + `scripts/extractors/EXTRACTOR-PLAYBOOK.md` as templates -- the MD names the exact shapes.

## Orchestrator pre-flight (already confirmed)

- **Phase 0 SHIPPED + independently re-verified green** (commit bf944a3f): migration 020 applied, all 10 project-CHECK clauses accept qtv/qwfwd, `tsc --noEmit` exit 0, `versions` has 0 qtv/qwfwd rows yet (you create the qwfwd row on first load).
- **P5 PASS:** libclang-18 + python3-clang import clean (the MVDSV/ezquake extractors run on it; QWFWD will too).
- **Go absent** -- a Phase 2 concern, NOT Phase 1.

## Carry-forwards from Phase 0 (act on these in Phase 1)

- **Q1 -> your Task 8:** `build-snapshot.ts` `PROJECT_DEFAULT_SNAPSHOT_VERSION.qwfwd` is provisional `'head'` (line ~693). Task 8 replaces it with the real label `'1.40-dev'` (verified `qwfwd.h:118` `QWFWD_VERSION_SHORT`). Leave `qtv: 'head'` alone (Phase 2 owns it).
- **Q4 -> your load step:** first-ever qwfwd load has no `versions` row, so `--ordinal 1` is REQUIRED on all four `load-version` calls (`resolveOrdinal` throws otherwise).

## CROSS-PHASE OBLIGATION -- report the per-type counts (they become Phase 4 floor baselines)

Per F7, the **extractor's count is the truth**, NOT the design's hand-count (~13-14 cvars / ~30 commands / 2 cmdline_param / 6 info_key are estimates only). At V4, capture the exact loaded per-type counts:

```sql
SELECT type, count(*) FROM entities WHERE project='qwfwd' GROUP BY type ORDER BY type;
```

**Put the four exact numbers (cvar / command / cmdline_param / info_key) in your halt report.** The orchestrator records them as the `QWFWD_FLOOR_PROBES` equality baselines for Phase 4 -- if they are not reported, that Phase-4 wire breaks. Do NOT gate on the hand-counts; report whatever the extractor finds.

## psql access (host `psql` is NOT installed; container is up + healthy)

From `apps/qw-oracle/`:
```bash
set -a && . ./.env && set +a
docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL" -c "<query>"
```
NOTE: the Postgres dev DB is **shared with a parallel l2-calibration session** (different tables -- L2 corpus). Your `load-version --json` upserts are scoped to `project='qwfwd'`; do not run any global/TRUNCATE operation.

## Execution notes

- ASCII-only (D7).
- Tasks 1-6 (clang config, driver, 4 handlers) are `subagent (Sonnet medium)` per the MD -- dispatch via `superpowers:subagent-driven-development`; do NOT collapse to inline. Task 7 (the reusable load recipe) and Task 8 (one-line build-snapshot edit) are `inline`.
- F6 is load-bearing: the cvars handler EXCLUDES `cvar.c` (its `Cvar_Get`/`Cvar_FullSet` machinery), but the commands handler does NOT exclude `cvar.c` (its `Cmd_AddCommand` lines -- cvarlist/toggle/set/inc -- are real registrations). The MD Task 3 vs Task 4 spell out the distinction.
- Boundary verification V1-V9 (all Postgres, D12): V1 extractor clean, V2 payload-field contract, V3 load errors=0, **V4 counts (capture!)**, V5 MCP smoke (`lookup_entity qwfwd masters_query`), V6 versions row (`1.40-dev`/ordinal 1), V7 idempotency (re-run the four `load-version` calls -> inserted:0; this is the load-version re-run, NOT the `idempotency --project` CLI which rejects qwfwd by design per F10), V8 reproducibility (re-extract -> empty `git diff output/`), V9 tsc exit 0.

## Carry-forward you hand to Phase 2

- The `load-version --json` recipe (Task 7) proven end-to-end -- Phase 2 reuses it verbatim with `qtv`/`1.16-dev` substituted.
- `qtv: 'head'` in build-snapshot.ts is still provisional -- Phase 2 updates it.

## Halt and report (do NOT auto-proceed to Phase 2)

Commit Phase 1 on `main` with a one-line message (e.g. `arc(qtv-qwfwd-l1): Phase 1 -- QWFWD libclang extractor + vendored load-version path; <N> qwfwd L1 rows loaded`). Do NOT push (orchestrator handles push timing). Then **halt** with a structured `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` report including: the **exact V4 per-type counts** (cvar/command/cmdline_param/info_key), the V3 `errors:0`/`inserted` summary, the V5 MCP smoke result, the V8 reproducibility diff (empty), the V9 tsc exit, and any new findings (next is F11). Report back to the orchestrator; do NOT start Phase 2.
