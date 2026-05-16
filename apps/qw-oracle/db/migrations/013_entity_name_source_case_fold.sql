-- 013_entity_name_source_case_fold.sql
--
-- L1 entity-name case fidelity: store the SOURCE capitalization in
-- entities.name and enforce the case-insensitive fold STRUCTURALLY via a
-- generated column instead of by loader convention.
--
-- Before this migration entities.name held the lowercased form -- the loader
-- folded on the way in (caseFoldMergeEntries + load-version + upsertEntity),
-- destroying the capitalization the engine code actually registered
-- (loadFragfile, cl_independentPhysics, K_ENTER, ...). The fold was applied
-- by convention in several independent sites; one forgetful consumer
-- reintroduced case-sensitive misses. This makes a case-sensitive compare
-- impossible at the data layer.
--
--   * name_fold -- generated STORED. lower(name) for every type EXCEPT
--                  token_primitive, which stays case-sensitive on purpose
--                  ($B blue-LED vs $b glyph are DIFFERENT entities). Same
--                  carve-out canonicalIdFor() and the loader already encode.
--   * UNIQUE (project, type, name_fold) -- the structural fold enforcer and
--                  the natural key the loader existence-check + alias lookup
--                  now target.
--   * the old UNIQUE (project, type, name) is dropped: with source case in
--                  `name` it would (wrongly) admit `loadFragfile` and
--                  `loadfragfile` as two rows. name_fold is the real key.
--                  No FK references it (FKs target id / canonical_id).
--   * UNIQUE (canonical_id) is unchanged -- canonical_id stays lowercased
--                  (project:type:lower(name)), so no versioned-table /
--                  snapshot / MCP ripple.
--
-- Safe on existing data with no dedup: every current non-token_primitive
-- name is already lowercased and token_primitive already carries source
-- case, so for every existing row name_fold == name. The old
-- (project,type,name) uniqueness therefore guarantees (project,type,
-- name_fold) uniqueness -- the new constraint cannot be violated on add.
--
-- Pure schema; no data backfill. Source-case names arrive when the loader
-- is re-run against the existing extractor JSON (loader-only, no re-walk).

ALTER TABLE entities
  ADD COLUMN name_fold TEXT
  GENERATED ALWAYS AS (
    CASE WHEN type = 'token_primitive' THEN name ELSE lower(name) END
  ) STORED;

ALTER TABLE entities
  ADD CONSTRAINT entities_project_type_name_fold_key
  UNIQUE (project, type, name_fold);

ALTER TABLE entities
  DROP CONSTRAINT entities_project_type_name_key;
