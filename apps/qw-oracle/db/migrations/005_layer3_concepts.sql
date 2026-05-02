-- apps/qw-oracle/db/migrations/005_layer3_concepts.sql
-- Layer 3 storage: concept notes + chunks + bidirectional graph + redirect targets.
--
-- Source-of-truth for content stays in apps/qw-oracle/concept-notes/*.md;
-- these tables are derived. The loader (scripts/load-concepts/) is the only
-- writer. Phase 5 fills concept_chunks.embedding; Phase 6 seeds redirect_targets
-- and wires search_concepts + redirect_to_human MCP tools against these tables.
--
-- tsvector config is 'english' (NOT 'simple' as Layer 2 uses): Layer 3 corpus
-- is curated English content where stemming improves recall. D7 explicitly
-- scopes 'simple' to chat content (Layer 2). See decisions.md.

-- One row per concept note. The body is the post-frontmatter markdown text;
-- frontmatter is preserved as JSONB so non-graph fields (topic, shape,
-- primary_contributors, status, source_url, last_updated, related_messages, ...)
-- survive without a column-per-field schema and Phase 6's get_concept_note can
-- pass through whatever the operator authored.
CREATE TABLE concepts (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL,
  shape        TEXT,                              -- frontmatter `shape:` (one of the named tiers; nullable)
  frontmatter  JSONB NOT NULL,                    -- full frontmatter passthrough (includes related_entities, external refs, etc.)
  body_sha256  TEXT NOT NULL,                     -- hash of body; loader uses this to skip chunk re-write when unchanged
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunked-for-embedding pieces of each note's body. Phase 4 inserts with
-- embedding NULL; Phase 5's embed-chunks worker fills the vector and clears
-- embedding_stale. The UNIQUE (concept_slug, chunk_index) lets the loader
-- delete-and-rebuild chunks per slug without orphan rows.
CREATE TABLE concept_chunks (
  id                BIGSERIAL PRIMARY KEY,
  concept_slug      TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  chunk_index       INTEGER NOT NULL,
  text              TEXT NOT NULL,
  text_sha256       TEXT NOT NULL,
  embedding         vector(1024),                                 -- NULL until Phase 5 fills
  embedding_stale   BOOLEAN NOT NULL DEFAULT FALSE,               -- TRUE only when Phase 5 API call fails on a row
  tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  UNIQUE (concept_slug, chunk_index)
);
CREATE INDEX concept_chunks_embedding_hnsw ON concept_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX concept_chunks_tsv_gin        ON concept_chunks USING GIN (tsv);

-- Concept-to-entity edges, derived from each note's `related_entities:`
-- frontmatter list, partitioned to drop non-entity refs (commit/pr/extension).
-- entity_canonical_id is NOT a foreign key to entities(canonical_id):
--   (a) authoring may forward-reference an entity not yet ingested,
--   (b) the table outlives any single Layer 1 rebuild,
--   (c) FK ON DELETE behavior would silently prune edges when an entity is
--       retired by extraction (which is the OPPOSITE of what we want -
--       retired entities still appear in historical concept notes).
-- Reverse-lookup index on entity_canonical_id is what Phase 6's lookup_entity
-- uses to populate `linked_concepts: [...]` in its response.
CREATE TABLE concept_entities (
  concept_slug         TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  entity_canonical_id  TEXT NOT NULL,
  weight               INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (concept_slug, entity_canonical_id)
);
CREATE INDEX concept_entities_entity ON concept_entities(entity_canonical_id);

-- Concept-to-concept edges, derived from each note's `related_concepts:`
-- frontmatter list (a Phase-4-introduced convention; no current note carries it).
-- target_slug is NOT a foreign key to concepts(slug): authoring may
-- forward-reference a sibling note that has not been written yet. The loader
-- emits a console warning at load time when target_slug points at a slug not
-- present in concepts, so drift surfaces operationally.
CREATE TABLE concept_concepts (
  source_slug TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  target_slug TEXT NOT NULL,
  PRIMARY KEY (source_slug, target_slug)
);

-- redirect_to_human seed targets. Phase 4 creates the table empty; Phase 6
-- seeds it when wiring the redirect_to_human MCP tool. Per the architecture
-- spec the seed list is "Discord channels, expert handles, ezquake.com docs,
-- wiki.quakeworld.nu" - operator-curated. Listed in the spec's open-question 6.
CREATE TABLE redirect_targets (
  topic        TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT
);
