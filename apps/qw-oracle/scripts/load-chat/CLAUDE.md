# qw-oracle/scripts/load-chat/

The Layer 2 chat loader: Discord-only ingest + classifier + session segmenter + session-FTS builder + reply-graph builder. Backed by Postgres + postgres-js + tsvector since Arc 1 Phase 3 (2026-05-02).

## Documentation index

| When you need... | Read... |
|---|---|
| Verify a load ran correctly | F1 quality-grid `../load-knowledge/quality-grid.ts` (Layer 1); phase-3 plan MD for Layer 2 |

## Pipeline order (idempotent at every step)

1. `seed-discord-channels.ts` -- one-shot apply of `db/seeds/discord_channels.sql` (4 hand-known channel rows). Idempotent via `ON CONFLICT (channel_name)`.
2. `import-historical-from-qwdb.ts` -- one-shot bulk import of 717,389 historical Discord messages from `data/qw.db` (SQLite, retired). Sentinel row in `import_log` short-circuits re-runs. Phase-3 deviation; see Open Questions in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md`.
3. `import-discord.ts` -- ongoing catchup ingest from `apps/quad/exports/*.json`. Per-file skip via `import_log`; per-row idempotency via `ON CONFLICT (id) DO NOTHING`.
4. `build-sessions.ts` -- classifier (`classify.ts`) + filter-then-segment session builder. `processing_log.version='v1'` gates re-runs; `--force` bypasses. TRUNCATE + rebuild on every run.
5. `build-session-references.ts` -- aggregates cross-session reply edges from `messages.referenced_message_id` into `session_references`. TRUNCATE + rebuild.
6. `build-search-index.ts` -- TRUNCATE + rebuild `session_search` from chat/link messages, formatted as `<author>: <text>` lines.
7. Thread era (layer2-corpus-reconstruction arc + oracle-web-direction Arc A): `export-anchors.ts` computes per-channel catch-up anchors from the corpus edge (writes `../../../quad/anchors-latest.json` for quad's `catchup.mjs --anchors`); `backfill-batch.ts` preps/loads idempotent (channel, year) thread batches; fencing via `fence-external.ts` (external cheap-model engine, spike-validated 2026-08-05 -- see `docs/superpowers/parking/2026-08-05-contract-worker-spike-report.md`) with `wf-backfill-fence.js` as the Sonnet fallback; batch state lives in `backfill-ledger.md`.

## Always-on rules

- **Discord-only.** IRC was excluded entirely from Arc 1 per `decisions.md` D9-revised. The `messages.platform` / `sessions.platform` / `session_search.platform` / `import_log.platform` CHECK constraints lock to `'discord'`. Arc 3 reconsiders only if (a) a codepage re-import lands AND (b) operator demand emerges.
- **tsvector config is `'simple'` (D7).** Discord corpus is mixed-language (Swedish, Russian, German handles and snippets); English stemming would mangle non-English tokens. Layer 1 entity descriptions stay on `'english'` (separate columns / migrations).
- **Filter-then-segment.** `build-sessions.ts` drives session boundaries only over `category IN ('chat', 'link')`. Bot/reaction/system messages do NOT advance the gap clock and do NOT open sessions. Their label rows are still written, with `session_id IS NULL`. Empty sessions disappear by construction.
- **Raw is immutable.** `messages` rows are never mutated post-import; rebuilders (`build-sessions.ts`, `build-session-references.ts`, `build-search-index.ts`) TRUNCATE + rebuild from raw on every run.
- **JSONB columns receive JS values, not pre-stringified JSON.** Pass via `tx.json(value as never)`. Pre-stringifying stores a JSONB string scalar (the legacy SQLite-era TEXT bug). Probe `F1.jsonb_columns_not_strings` is the regression gate.
