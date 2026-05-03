-- apps/qw-oracle/db/migrations/007_query_log.sql
-- Phase 7 (Arc 1): one row per MCP tool call. Loader-side observability lives
-- in embedding_api_log (Phase 5); this is the *query-side* journal. Written by
-- the dispatcher wrapper at serve/mcp/src/query-log.ts (this phase). Read by
-- the operator via the queries documented in apps/qw-oracle/docs/OBSERVABILITY.md.
--
-- BIGSERIAL on id keeps a long-running deployment safe from INTEGER overflow.
-- The match_quality CHECK mirrors the MatchQuality union in types.ts; nullable
-- because some failure paths log before any tool body runs (and so never
-- compute a match_quality).

CREATE TABLE query_log (
  id              BIGSERIAL PRIMARY KEY,
  queried_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tool            TEXT NOT NULL,
  query_text      TEXT,
  result_count    INTEGER,
  top_score       REAL,
  match_quality   TEXT
                    CHECK (match_quality IS NULL
                           OR match_quality IN ('strong', 'weak', 'none')),
  latency_ms      INTEGER,
  error           TEXT,
  consumer_hint   TEXT
);

CREATE INDEX query_log_queried_at ON query_log (queried_at DESC);
CREATE INDEX query_log_tool ON query_log (tool);
-- Partial index for the most-asked operator question ("what failed retrieval?"):
-- the index is small because most rows have match_quality='strong' or NULL.
CREATE INDEX query_log_match_quality_weak_none
  ON query_log (queried_at DESC)
  WHERE match_quality IN ('weak', 'none');
