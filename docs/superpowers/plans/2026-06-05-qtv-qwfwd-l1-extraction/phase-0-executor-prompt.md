# Phase 0 executor prompt -- arc 2026-06-05-qtv-qwfwd-l1-extraction

You are the **arc-executor** for **Phase 0 -- Schema + plumbing** of the QTV + QWFWD Layer 1 extraction arc. Invoke the `arc-executor` skill and execute this phase against its MD. This is **execution**, not planning -- you write real code (a migration, TS edits), apply the migration, and run the boundary probes.

**Arc identity (halt if this does not match):** arc `2026-06-05-qtv-qwfwd-l1-extraction`; scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are adding two QuakeWorld streaming/forwarding tools (Go QTV `qtv`, C QWFWD `qwfwd`) to the qw-oracle Layer 1 pipeline. If the material talks about KTX/MVDSV describe-fill finding codes or `mvdsv-*-ledger-*.md` files as the thing you edit, you are in the WRONG arc -- STOP and tell the operator.

**Working directory:** `/home/paradoks/projects/quakeworld` (qw-oracle lives at `apps/qw-oracle/`).

## Read first (in this order)

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md` -- phase index + read order.
2. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/decisions.md` -- D1-D13 (especially D2 schema, D3 Project-union, D7 ASCII-only, D11 phase atomicity).
3. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/review-findings.md` -- F1, F4 (Phase 0's findings) **and F9 (NEW -- see augmentation below)**.
4. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-0-schema-plumbing.md` -- the phase MD you execute. Read it cold, critically review it against decisions.md/review-findings.md, THEN execute Tasks 1-4 per their declared execution modes.

## Orchestrator pre-flight (already confirmed -- do NOT redo)

The orchestrator session verified the prerequisites before handing you this phase:
- **P1 PASS:** Postgres dev container `qw-oracle-postgres-dev` is **up + healthy**; `bun db/migrate.ts` runs clean; latest applied migration = `019_embedding_freshness_comments.sql`, 0 pending. (Your migration 020 is the next one.)
- **P2 PASS:** both vendored sources present; neither has a `.git` dir.
- **P5 PASS:** libclang-18 + python3-clang import clean (Phase 1 concern, noted).
- **NOTE (not your concern):** Go toolchain is absent -- needed at Phase 2, not Phase 0/1.

## F9 augmentation -- CRITICAL: the constraint-introspection query in the MD is broken; use the corrected one

The orchestrator ran Phase 0's `pg_constraint` introspection query against live Postgres and found it **doubly broken** (recorded as F9 in review-findings.md). The bug is in the **query only** -- the migration DDL (the 10 ALTER TABLE pairs) is correct and the 10 constraint names are confirmed to match the live catalog exactly. Two bugs in the query as written in **Task 1 step 1** AND **verification probe V2**:

1. `ORDER BY tbl::text` -> Postgres error `column "tbl" does not exist` (an output alias with a cast is rejected in ORDER BY). The query cannot run as written.
2. `WHERE pg_get_constraintdef(oid) ILIKE '%project%'` over-matches `gameplay_entity_defs_kind_check` (its def lists `'projectile'::text` -- substring "project"). It returns **11 rows, not 10**, and V2's "exactly 10 rows / every row has qwfwd+qtv" would false-FAIL on the 11th (kind) row.

**Use this corrected query everywhere the MD's introspection/V2 query appears** (keys on the `'ezquake'` allow-list signature; verified to return exactly 10 pre-020, and post-020 every row contains `ezquake` + `qwfwd` + `qtv`):

```sql
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%ezquake%'
ORDER BY 1, 2;
```

The 10 expected (table, constraint) pairs, confirmed live: `versions`/`versions_project_check`, `entities`/`entities_project_check`, `asset_extensions`/`asset_extensions_project_check`, `asset_path_rules`/`asset_path_rules_project_check`, `asset_cvar_bindings`/`asset_cvar_bindings_project_check`, `asset_loader_sites`/`asset_loader_sites_project_check`, `release_notes`/`release_notes_project_check`, `relation_changes`/`relation_changes_project_check`, `cvar_alias_versions`/`cvar_alias_versions_target_project_check`, `cvar_alias_versions`/`cvar_alias_versions_mimics_project_check`. The migration's DROP/ADD names already match these -- no DDL change needed; only the introspection + V2 query text changes.

## psql access (tested helper -- host `psql` is NOT installed)

All SQL probes (V2, V4, V5, V6) go through the container. From `apps/qw-oracle/`:

```bash
set -a && . ./.env && set +a            # loads DATABASE_URL
docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL" -c "<query>"
```

For the rolled-back V4/V5 INSERT smoke tests (multi-statement BEGIN...ROLLBACK), pipe the script in:
```bash
docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL" <<'SQL'
BEGIN; ... ROLLBACK;
SQL
```

## Execution notes

- ASCII-only in everything you write (D7) -- no emoji, no em/en-dash.
- Task 2 (Project-union one-line edit) and Task 4 (SCHEMA.md edits) are `inline`. Tasks 1 (migration) and 3 (12 Record fills across 5 files) are `subagent (Sonnet medium)` per the MD -- dispatch them via `superpowers:subagent-driven-development` as the MD annotates; do NOT collapse the whole phase to inline.
- Run the full boundary verification: **V1** (migrate applies 020), **V2** (use the F9-corrected query -> exactly 10 widened rows), **V3** (`bunx tsc --noEmit` exit 0), **V4** (qtv/qwfwd INSERT smoke + rollback), **V5** (bogus still rejected), **V6** (020 in schema_migrations), **V7** (re-run migrate = 0 newly applied).

## Carry-forwards Phase 0 hands to Phase 1 (note in your report; do NOT act on them now)

- **Q1:** `PROJECT_DEFAULT_SNAPSHOT_VERSION` in `build-snapshot.ts` is set to provisional `'head'` for both qtv/qwfwd. Phase 1 (qwfwd) and Phase 2 (qtv) replace `'head'` with the real version label. Leaving `'head'` is correct for Phase 0.
- **Q4:** First `load-version` for each tool needs `--ordinal 1` (no prior versions row). Phase 1/2 concern.

## Halt and report (do NOT auto-proceed to Phase 1)

When the boundary probes are done, commit Phase 0 on `main` with a one-line message (e.g. `arc(qtv-qwfwd-l1): Phase 0 -- migration 020 widens project CHECK to qtv/qwfwd; Project union + 12 Record sites filled`). Do NOT push (the orchestrator handles push timing at the boundary review). Then **halt** with a structured status report -- `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` -- including the actual probe outputs (not just "PASS"): the V2 corrected-query result showing all 10 clauses now carry `qwfwd`+`qtv`, the `tsc --noEmit` exit code, the V4/V5 smoke results, the V6 schema_migrations row, and the V7 re-run line. Report back to the orchestrator; do NOT start Phase 1.
