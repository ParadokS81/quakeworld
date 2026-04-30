# qw-oracle/scripts/load-knowledge/

The Layer 1 loader: SQLite schema, per-entity-type adapters, version dispatcher, diff/blame engine, snapshot builder.

## Documentation index

| When you need... | Read... |
|---|---|
| End-to-end verification queries + per-phase expected counts | `e2e-verify.md` |

## Always-on rules

- **Adapter pattern** -- each `load-<type>.ts` reads extractor JSON, upserts via `natural-keys.ts`, registers diffs via `diff-versions.ts`.
- **Schema migrations** -- bump `SCHEMA_VERSION` in `schema.ts`, add `SCHEMA_V<N>_MIGRATION_SQL` + `migrateV<N-1>ToV<N>`. CHECK widening requires a table rebuild (pattern at v8/v10/v12).
- **Regression drop-guard load-bearing** -- `load-version.ts` aborts on >50% entity-count drop without `--force`. Don't bypass.
- **`review/` subdir** -- semantic-match + cluster-confirmation tools; deeper diff workflow, separate from the main loader path.
