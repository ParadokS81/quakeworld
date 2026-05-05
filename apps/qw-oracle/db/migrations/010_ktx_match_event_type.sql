-- 010_ktx_match_event_type.sql
--
-- Two changes ride one migration because they atomically introduce the
-- new 'match_event' entity type:
--   1. Widen entities.type CHECK to admit 'match_event'.
--   2. Create match_event_versions per-version table (PK + 2 indexes).
--
-- Per Pass 4.5: 7 entity rows per KTX tag (one per XSD complexType:
-- pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup,
-- damage, death). Source: research/repos/ktx/resources/extralog/ktxlog_0.1.xsd.
--
-- Pure additive; no data backfill required (no prior rows with
-- type='match_event' exist).

ALTER TABLE entities
  DROP CONSTRAINT entities_type_check;

ALTER TABLE entities
  ADD CONSTRAINT entities_type_check
  CHECK (type IN (
    'cvar','command','macro','cmdline_param',
    'keyname','hud_element','ruleset','token_primitive',
    'asset_category','flag_bit','cvar_alias',
    'protocol_message','info_key','log_template','qc_builtin',
    'match_event'
  ));

CREATE TABLE IF NOT EXISTS match_event_versions (
  entity_id                BIGINT NOT NULL REFERENCES entities(id),
  version                  TEXT NOT NULL,
  event_name               TEXT NOT NULL,
  complex_type             TEXT NOT NULL,
  attributes_json          JSONB NOT NULL,
  xsd_path                 TEXT NOT NULL,
  xsd_version              TEXT,
  emission_call_sites_json JSONB,
  raw_ast_hash             TEXT,
  source_root              TEXT,
  extracted_at             TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_complex_type ON match_event_versions(complex_type);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_xsd_version  ON match_event_versions(xsd_version);
