# QW Oracle Observability - operator cheatsheet

Two Postgres tables back the entire observability surface:

- `query_log` - one row per MCP tool call. Written by the dispatcher wrapper at `serve/mcp/src/query-log.ts`. Columns: `id`, `queried_at`, `tool`, `query_text`, `result_count`, `top_score`, `match_quality` (`strong | weak | none | NULL`), `latency_ms`, `error`, `consumer_hint`.
- `embedding_api_log` - one row per Voyage API call. Written by the loader-side embed pipelines (Phase 5) and by the MCP query-side embedding step (Phase 5 / Phase 6). Columns: `id`, `called_at`, `source` (`'loader' | 'mcp-query'`), `model`, `input_tokens`, `latency_ms`, `error`.

Open `psql` against the dev DB with `bun run db:psql`, or against any deployed instance with the equivalent connection. Every query below is copy-paste; no scripting, no extensions.

## What failed retrieval recently?

Surface the queries the corpus did not cover (LLM iteration leads + concept-note authoring leads).

```sql
SELECT queried_at, tool, query_text, match_quality, latency_ms, consumer_hint
FROM query_log
WHERE match_quality IN ('weak', 'none')
ORDER BY queried_at DESC
LIMIT 50;
```

Read: rows are reverse chronological. The partial index on `(weak, none)` makes this fast even at a million rows. Vague queries with `match_quality = 'none'` are the strongest concept-note authoring leads.

## Latency p95 per tool, last 24 hours

```sql
SELECT tool,
       count(*) AS n,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
       percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_ms
FROM query_log
WHERE queried_at > now() - INTERVAL '24 hours'
GROUP BY tool
ORDER BY p95_ms DESC;
```

Read: tools are sorted slowest-tail-first. Anything where `p95_ms` exceeds `~1000` on a hybrid-retrieval tool is worth investigating; lookup tools should sit comfortably under 100ms p95.

## Voyage spend trajectory

```sql
SELECT date_trunc('day', called_at)::date AS day,
       source,
       sum(input_tokens) AS tokens,
       count(*) AS calls,
       sum(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) AS errors
FROM embedding_api_log
GROUP BY day, source
ORDER BY day DESC, source;
```

Read: separates loader-side spend (one-shot, large bursts at re-embed time) from query-side spend (steady drip per MCP query). Compare the running daily total against the 200M-token Voyage free-tier ceiling (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:88`).

## Concept-note coverage gaps

Same as "what failed retrieval recently?" but grouped, so repeated misses cluster.

```sql
SELECT query_text, count(*) AS hits
FROM query_log
WHERE tool = 'search_concepts'
  AND match_quality = 'none'
  AND query_text IS NOT NULL
GROUP BY query_text
ORDER BY hits DESC
LIMIT 20;
```

Read: every row is a candidate concept-note title. Multiple users converging on the same query is high signal.

## Most-called tools, last 7 days

```sql
SELECT tool, count(*) AS n,
       count(*) FILTER (WHERE error IS NOT NULL) AS errors,
       round(100.0 * avg(CASE WHEN match_quality = 'strong' THEN 1.0 ELSE 0.0 END), 1) AS strong_pct
FROM query_log
WHERE queried_at > now() - INTERVAL '7 days'
GROUP BY tool
ORDER BY n DESC;
```

Read: shows which tools the consumer LLMs actually iterate to. A tool with high `n` and low `strong_pct` means the corpus is being asked questions it cannot answer; either the corpus needs to grow or the tool's docstring needs to better steer the consumer.

## Per-consumer breakdown

```sql
SELECT coalesce(consumer_hint, '<unknown>') AS consumer,
       count(*) AS calls,
       count(DISTINCT tool) AS distinct_tools,
       round(100.0 * avg(CASE WHEN match_quality IN ('weak', 'none') THEN 1.0 ELSE 0.0 END), 1) AS weak_or_none_pct
FROM query_log
WHERE queried_at > now() - INTERVAL '7 days'
GROUP BY consumer
ORDER BY calls DESC;
```

Read: tells the operator which clients are driving traffic and how well the corpus is serving each. Useful when comparing Claude Desktop vs. Claude Code vs. quad chatbot iteration patterns. Note: under HTTP/SSE the `consumer_hint` is best-effort and may misattribute under concurrent sessions until per-session capture lands.

## Error spikes

```sql
SELECT date_trunc('hour', queried_at) AS hour,
       tool,
       count(*) AS errors,
       array_agg(DISTINCT substring(error from 1 for 80)) AS error_samples
FROM query_log
WHERE error IS NOT NULL
  AND queried_at > now() - INTERVAL '24 hours'
GROUP BY hour, tool
ORDER BY hour DESC, errors DESC;
```

Read: groups errors by hour-bucket so transient outages stand out. `error_samples` is the first 80 chars of each distinct error message for quick triage.

## Manual retention sweep

Arc 1 does not auto-purge `query_log`; the volume is small at expected v1 query rates (one row per tool call, mostly under a kilobyte). When the table genuinely grows large, the operator runs the purge on demand:

```sql
DELETE FROM query_log
WHERE queried_at < now() - INTERVAL '90 days';

VACUUM (ANALYZE) query_log;
```

The 90-day window matches the architecture spec (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:240`). An automated retention cron is out of scope for Arc 1; the spec marks it as endgame infrastructure (Grafana / OTel arrive with the platform graduation, not v1).

## Embedding model + corpus state

One-row sanity table that says what model the corpus is currently in:

```sql
SELECT * FROM embedding_metadata;
```

Read: `model_name`, `dimension`, `embedded_at`, `rows_embedded`. If the dimension mismatches `EMBEDDING_DIMENSION` from the env, the MCP startup check (D8) will refuse to start - this query is the operator's sanity probe.

## Observability schema reference

For shape-by-shape detail, read the migration files:

- `apps/qw-oracle/db/migrations/006_*.sql` - `embedding_api_log` (Phase 5).
- `apps/qw-oracle/db/migrations/007_query_log.sql` - `query_log` (Phase 7).

Both tables are append-only for v1. No triggers, no views, no materialised state. SQL above is the entire observability tooling.
