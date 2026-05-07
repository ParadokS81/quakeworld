-- 012_description_origin.sql
--
-- Add description_origin column to entities. Provenance label for the
-- entity.description text: where did the description come from?
--
-- Values:
--   'help_json'    -- from external dev-curated metadata file (help_*.json
--                     for ezquake/FTE; asset YAML bundle for asset_category).
--   'source_inline'-- from source code (trailing-comment harvest, struct-init
--                     fields like KTX's CD_* macros, or templated synthesis
--                     from extracted source data like deriveCvarAlias's
--                     "alias of <target>; drift status: <state>" form).
--   'inherited'    -- borrowed from another entity's description (reserved
--                     for the QWCL cross-engine borrow arc; not yet used).
--   'synthesized'  -- narrative prose authored by AI/operator that was not
--                     present in source or external curation. Used for entity
--                     types whose registration carries no doc convention
--                     (e.g., match_event in KTX -- XSD-defined log-output
--                     formats with no audience for prose). Audit signal for
--                     "non-developer-authored content."
--   NULL           -- description IS NULL (ruleset, keyname, ...).
--
-- Pure additive: column is nullable, no CHECK constraint (kept loose so
-- future origin values like 'curated_yaml' or 'inherited:<sub-shape>' can
-- be introduced without a migration). Backfill section assigns origin to
-- every row whose entities.description is non-NULL today.

ALTER TABLE entities
  ADD COLUMN description_origin TEXT NULL;

-- ============================================================================
-- Backfill
-- ============================================================================

-- cvar: project-aware. ezquake/FTE rides help_*.json; KTX/MVDSV/QWCL ride
-- source extraction (struct fields, trailing comments). For ezquake/FTE rows
-- where the JSON sources are empty but trailing_comment fallback won
-- (28 ezquake CODE_ONLY cvars per the trailing-comment fix), origin is
-- 'source_inline'.
UPDATE entities e SET description_origin = (
  CASE
    WHEN e.project IN ('ezquake', 'fte') AND EXISTS (
      SELECT 1 FROM cvar_versions cv
      WHERE cv.entity_id = e.id AND cv.version = e.last_seen_version
        AND (
          NULLIF(TRIM(cv.help_desc), '') IS NOT NULL
          OR NULLIF(TRIM(cv.help_remarks), '') IS NOT NULL
          OR (cv.help_values IS NOT NULL AND cv.help_values::text NOT IN ('[]', 'null'))
        )
    ) THEN 'help_json'
    ELSE 'source_inline'
  END
)
WHERE e.type = 'cvar' AND e.description IS NOT NULL;

-- command: same project-aware split. KTX rides CD_* macros (source-side);
-- ezquake/FTE rides help_*.json.
UPDATE entities e SET description_origin = (
  CASE
    WHEN e.project IN ('ezquake', 'fte') AND EXISTS (
      SELECT 1 FROM command_versions cv
      WHERE cv.entity_id = e.id AND cv.version = e.last_seen_version
        AND (
          NULLIF(TRIM(cv.help_desc), '') IS NOT NULL
          OR NULLIF(TRIM(cv.help_remarks), '') IS NOT NULL
        )
    ) THEN 'help_json'
    ELSE 'source_inline'
  END
)
WHERE e.type = 'command' AND e.description IS NOT NULL;

-- cmdline_param: same shape as command.
UPDATE entities e SET description_origin = (
  CASE
    WHEN e.project IN ('ezquake', 'fte') AND EXISTS (
      SELECT 1 FROM cmdline_param_versions cv
      WHERE cv.entity_id = e.id AND cv.version = e.last_seen_version
        AND (
          NULLIF(TRIM(cv.help_desc), '') IS NOT NULL
          OR NULLIF(TRIM(cv.help_remarks), '') IS NOT NULL
        )
    ) THEN 'help_json'
    ELSE 'source_inline'
  END
)
WHERE e.type = 'cmdline_param' AND e.description IS NOT NULL;

-- macro: ezquake/FTE only carry macros today; treat as 'help_json' when
-- description is present.
UPDATE entities SET description_origin = 'help_json'
WHERE type = 'macro' AND description IS NOT NULL;

-- hud_element: ezquake-only entity type today; description rides help_*.json.
UPDATE entities SET description_origin = 'help_json'
WHERE type = 'hud_element' AND description IS NOT NULL;

-- asset_category: rides curated YAML bundle (slipgate-side asset metadata).
-- Treat as 'help_json' (external dev-curated; same conceptual category).
UPDATE entities SET description_origin = 'help_json'
WHERE type = 'asset_category' AND description IS NOT NULL;

-- Templated derivers: description is synthesized at derive time from
-- source-extracted fields (e.g., "alias of <target>; drift status: ...",
-- "<bitmask_family> <name>", "qc_builtin <table_name>[<index>] -> <fn>").
-- 100% data-driven, no narrative content -- treat as source_inline.
UPDATE entities SET description_origin = 'source_inline'
WHERE type IN (
  'info_key', 'log_template', 'protocol_message', 'qc_builtin',
  'token_primitive', 'flag_bit', 'cvar_alias'
) AND description IS NOT NULL;

-- ruleset / keyname / match_event are intentionally left at NULL when
-- description IS NULL. match_event will populate via deriveMatchEvent
-- (origin='synthesized') in this same arc once the deriver ships.
