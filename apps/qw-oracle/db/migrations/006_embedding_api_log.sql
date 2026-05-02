-- apps/qw-oracle/db/migrations/006_embedding_api_log.sql
-- Per-call log for every Voyage embedding API call. Loader, MCP-query, and
-- the D8 verifier all INSERT here. Phase 7's observability cheatsheet reads
-- this table; Phase 8's deploy-gate sums input_tokens to confirm the corpus
-- fits inside the free-tier envelope before public DNS opens.
--
-- Source values: 'loader' (embed-entities + embed-chunks pipelines, written
-- in Phase 5), 'mcp-query' (per-query embeddings at MCP runtime, written in
-- Phase 6), 'verify' (the D8 startup check that asserts build/query model
-- spaces have not diverged; written in Phase 5 + Phase 6). Adding a fourth
-- source later requires a CHECK widening migration.

CREATE TABLE embedding_api_log (
  id            BIGSERIAL PRIMARY KEY,
  called_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL CHECK (source IN ('loader', 'mcp-query', 'verify')),
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  latency_ms    INTEGER,
  error         TEXT
);

CREATE INDEX embedding_api_log_called_at ON embedding_api_log (called_at DESC);
CREATE INDEX embedding_api_log_source    ON embedding_api_log (source);
