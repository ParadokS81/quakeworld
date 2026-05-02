-- apps/qw-oracle/db/migrations/001_init.sql
-- Foundation migration. Domain tables (entities + version arc, qw namespace,
-- assets, Layer 2, Layer 3, observability) land in 002+ migrations.

-- pgvector. HNSW indexes (Phase 2+) require the operators registered here.
CREATE EXTENSION IF NOT EXISTS vector;

-- One-row metadata describing the embedding model the corpus was built with.
-- Loader writes here at the end of every successful build pass; MCP startup
-- reads here to assert that the configured EMBEDDING_MODEL_QUERY shares
-- dimension with the build model (see decisions.md D8).
CREATE TABLE embedding_metadata (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  model_name      TEXT NOT NULL,
  model_version   TEXT NOT NULL,
  dimension       INTEGER NOT NULL,
  embedded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  rows_embedded   INTEGER NOT NULL DEFAULT 0
);

-- Cross-cutting key/value metadata, the Postgres equivalent of the SQLite
-- schema_meta table. Kept distinct from schema_migrations (which the migrator
-- owns) per decisions.md D4. Seeds with schema_version 18 to mirror the
-- live SQLite schema (apps/qw-oracle/scripts/load-knowledge/schema.ts:8).
-- Phase 2 will bump this when the entity arc lands.
CREATE TABLE oracle_meta (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO oracle_meta (key, value) VALUES ('schema_version', '18');
