-- apps/qw-oracle/db/migrations/003_layer1_entities_search.sql
--
-- Adds the entities-row search columns Phase 6 hybrid retrieval needs:
-- a derived description (D6 / F7), the embedding vector + its content hash
-- + a staleness flag, and a generated tsvector for lexical search. Plus
-- the GIN and HNSW indexes that back the lexical and vector legs of RRF.
--
-- Hand-authored rather than generator-emitted because these columns are
-- not in scripts/load-knowledge/schema.ts -- the SQLite era never had
-- pgvector or to_tsvector. Schema evolution post-Arc-1 lives in append-
-- only migrations like this one.
--
-- tsvector config is 'english' because Layer 1 entity descriptions are
-- curated English content (D7 implication: 'simple' is reserved for the
-- Layer 2 chat corpus where mixed-language token preservation matters).

ALTER TABLE entities ADD COLUMN description                    TEXT;
ALTER TABLE entities ADD COLUMN description_embedding          vector(1024);
ALTER TABLE entities ADD COLUMN description_embedding_sha256   TEXT;
ALTER TABLE entities ADD COLUMN description_embedding_stale    BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE entities ADD COLUMN description_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED;

CREATE INDEX entities_desc_tsv_gin
  ON entities USING GIN (description_tsv);

-- HNSW build parameters use Postgres defaults (m=16, ef_construction=64).
-- Tuning is deferred to Phase 5 (when embeddings are populated) and Phase 8
-- (calibration on the eval set). Building on an empty column is instantaneous.
CREATE INDEX entities_desc_embedding_hnsw
  ON entities USING hnsw (description_embedding vector_cosine_ops);
