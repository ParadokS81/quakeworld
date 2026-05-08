# qw-oracle/scripts/load-knowledge/

The Layer 1 loader: per-entity-type adapters, version dispatcher, diff/blame engine, snapshot builder. Backed by Postgres + postgres-js since Arc 1 Phase 2 (2026-05-02).

## Documentation index

| When you need... | Read... |
|---|---|
| End-to-end verification queries + per-phase expected counts | `e2e-verify.md` |
| Author a new universal validation gate (CLI conventions, F1 dispatch mirror, env-var DB config, volatile-column strip, per-project config dict, pytest test pattern, CI-readiness checklist) | `VALIDATION-GATES.md` |

## Always-on rules

- **Adapter pattern** -- each `load-<type>.ts` reads extractor JSON, upserts via `natural-keys.ts`, registers diffs via `diff-versions.ts`.
- **Schema migrations** -- the migrator at `apps/qw-oracle/db/migrate.ts` runs `.sql` files in `db/migrations/` in lexical order, tracking applied migrations via `schema_migrations` (filename, applied_at, sha256). Append-only; editing an already-applied migration is rejected. Runtime constants (SCHEMA_VERSION, HEAD_ORDINAL, etc.) live in `constants.ts`; runtime metadata writes to the `oracle_meta` table.
- **Regression drop-guard load-bearing** -- `load-version.ts` aborts on >50% entity-count drop without `--force`. Don't bypass.
- **`review/` subdir** -- semantic-match + cluster-confirmation tools; deeper diff workflow, separate from the main loader path.
