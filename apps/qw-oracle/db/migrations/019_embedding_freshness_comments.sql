-- 019_embedding_freshness_comments.sql
--
-- Documentation-only migration: COMMENT ON COLUMN, no data or shape change.
--
-- Why: the two embedding-freshness booleans are both named `*_stale` but play
-- OPPOSITE roles, which traps cold readers (a TRUE flag does NOT mean the vector
-- is out of date). This records the real semantics in the catalog so `\d+` and
-- information_schema tell the truth. Full prose in SCHEMA.md "Embedding freshness".
--
--   entities.description_embedding_stale  -> IGNORED by the embedder. The
--     authoritative signal is the content hash description_embedding_sha256;
--     embed-entities.ts re-embeds iff sha256(description) differs from it. Many
--     write paths set this boolean TRUE on touch even when the text is unchanged,
--     so it over-reports badly (8092 flagged vs 1026 actually stale, 2026-06-05).
--     No code reads it as a decision; observability/legacy; safe drop candidate.
--
--   concept_chunks.embedding_stale  -> FUNCTIONAL. embed-chunks.ts re-embeds
--     WHERE embedding IS NULL OR embedding_stale = TRUE. Primary path: the loader
--     DELETE+INSERTs chunks when concepts.body_sha256 changes (new chunk arrives
--     with NULL embedding); embedding_stale = TRUE is the Voyage-failure retry
--     signal. Cleared FALSE on successful embed.

COMMENT ON COLUMN entities.description_embedding_stale IS
  'Informational hint, NOT the re-embed trigger. embed-entities.ts ignores this and re-embeds a row iff sha256(description) <> description_embedding_sha256 (the authoritative signal). Many write paths (re-derive, describe-fill, ktx recasts, help-json synthesis) set it TRUE on touch even when text is byte-identical, so it over-reports heavily (8092 flagged vs 1026 truly stale, 2026-06-05). No code gates on it; serve/ never reads it. Observability/legacy; drop candidate. Contrast concept_chunks.embedding_stale, which IS functional. See SCHEMA.md "Embedding freshness".';

COMMENT ON COLUMN concept_chunks.embedding_stale IS
  'Functional re-embed signal -- differs from entities.description_embedding_stale (which is ignored). embed-chunks.ts re-embeds WHERE embedding IS NULL OR embedding_stale = TRUE. Primary path: load-concepts DELETE+INSERTs chunks when concepts.body_sha256 changes, so changed chunks arrive with NULL embedding; embedding_stale = TRUE is the secondary Voyage-failure retry signal. Cleared FALSE on successful embed. See SCHEMA.md "Embedding freshness".';
