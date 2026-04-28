// apps/qw-oracle/scripts/load-knowledge/schema.ts
//
// v1 schema for the QW Knowledge Service Layer 1 store.
// Mirrors docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md.

import type Database from 'better-sqlite3';

export const SCHEMA_VERSION = 18;

// Sentinel ordinal for the 'head' version row (per project). Must be greater
// than any plausible release ordinal so first_seen / last_seen comparisons
// place head after every tagged release. See `versions` table comment.
export const HEAD_ORDINAL = 999999;

const SCHEMA_V1_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- Ordinal scheme: semver-encoded for tagged releases (3.6.1 -> 361,
-- 3.6.6 -> 366, etc.) so '<' on ordinal mirrors release-time order.
-- 'head' uses the sentinel HEAD_ORDINAL (999999) because it always represents
-- the dev tip, after every tagged release. All first_seen / last_seen
-- comparisons rely on this ordering. New release tags get an ordinal
-- derived from their semver; never reuse 999999 for anything else.
CREATE TABLE IF NOT EXISTS versions (
  id             INTEGER PRIMARY KEY,
  project        TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version        TEXT NOT NULL,
  commit_sha     TEXT NOT NULL,
  tag_date       TEXT,
  ordinal        INTEGER NOT NULL,
  parse_state    TEXT NOT NULL DEFAULT 'ok' CHECK (parse_state IN ('ok','partial')),
  notes          TEXT,
  extracted_at   TEXT NOT NULL,
  UNIQUE (project, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_ordinal ON versions(project, ordinal);

-- The entities.type CHECK lists the full v15 type set (not just v1's four)
-- because applySchema stamps SCHEMA_VERSION directly on fresh DBs and skips
-- the migration chain. Migrated DBs rebuild this table via
-- ENTITIES_V2/V3/V5/V12/V15_MIGRATION_SQL, so the widened v1 CHECK is harmless
-- for them and correct for fresh ones. Keep this list in sync with
-- ENTITIES_V15_MIGRATION_SQL (and any future ENTITIES_V*_MIGRATION_SQL).
CREATE TABLE IF NOT EXISTS entities (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit','cvar_alias',
                          'protocol_message','info_key','log_template','qc_builtin'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(project, type);

CREATE TABLE IF NOT EXISTS cvar_versions (
  entity_id               INTEGER NOT NULL REFERENCES entities(id),
  version                 TEXT NOT NULL,
  help_desc               TEXT,
  help_remarks            TEXT,
  help_values             TEXT,
  help_group_id           TEXT,
  help_type               TEXT,
  default_value           TEXT,
  flags_raw               TEXT,
  flag_names              TEXT,
  on_change               TEXT,
  min_bound               TEXT,
  max_bound               TEXT,
  source_file             TEXT,
  source_line             INTEGER,
  source_column           INTEGER,
  storage_class           TEXT,
  group_name_in_source    TEXT,
  trailing_comment        TEXT,
  server_only             INTEGER NOT NULL DEFAULT 0,
  raw_ast_hash            TEXT,
  -- v11: which source root the entity came from when the project has multiple
  -- sources (e.g., FTE engine + plugins). NULL = backwards compat for pre-v11
  -- rows; semantically equivalent to "engine".
  source_root             TEXT,
  extracted_at            TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_cvar_versions_source ON cvar_versions(source_file, source_line);

CREATE TABLE IF NOT EXISTS command_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  help_desc         TEXT,
  help_remarks      TEXT,
  help_group_id     TEXT,
  handler_fn        TEXT,
  source_file       TEXT,
  source_line       INTEGER,
  source_column     INTEGER,
  registration_file TEXT,
  raw_ast_hash      TEXT,
  source_root       TEXT,  -- v11: see cvar_versions.source_root comment
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS macro_versions (
  entity_id            INTEGER NOT NULL REFERENCES entities(id),
  version              TEXT NOT NULL,
  help_desc            TEXT,
  macro_type           TEXT,
  teamplay_restricted  INTEGER NOT NULL DEFAULT 0,
  related_cvars_json   TEXT,
  handler_fn           TEXT,
  source_file          TEXT,
  source_line          INTEGER,
  source_column        INTEGER,
  registration_file    TEXT,
  raw_ast_hash         TEXT,
  source_root          TEXT,  -- v11: see cvar_versions.source_root comment
  extracted_at         TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS cmdline_param_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  help_desc        TEXT,
  help_remarks     TEXT,
  arguments        TEXT,
  flags_json       TEXT,
  systems_json     TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  source_column    INTEGER,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS change_events (
  id                       INTEGER PRIMARY KEY,
  entity_id                INTEGER NOT NULL REFERENCES entities(id),
  from_version             TEXT,
  to_version               TEXT NOT NULL,
  change_kind              TEXT NOT NULL CHECK (change_kind IN ('created','modified','deleted')),
  field_name               TEXT NOT NULL DEFAULT '',
  old_value                TEXT,
  new_value                TEXT,
  commit_sha               TEXT NOT NULL,
  commit_message_excerpt   TEXT,
  pr_number                INTEGER,
  pr_title                 TEXT,
  pr_body_excerpt          TEXT,
  linked_issues_json       TEXT,
  enrichment_source        TEXT CHECK (enrichment_source IN ('git','github_api')),
  extracted_at             TEXT NOT NULL,
  UNIQUE (entity_id, to_version, field_name, change_kind)
);
CREATE INDEX IF NOT EXISTS idx_change_events_to_version    ON change_events(to_version);
CREATE INDEX IF NOT EXISTS idx_change_events_entity_field  ON change_events(entity_id, field_name);
CREATE INDEX IF NOT EXISTS idx_change_events_commit        ON change_events(commit_sha);

CREATE TABLE IF NOT EXISTS source_state_transitions (
  id                 INTEGER PRIMARY KEY,
  entity_id          INTEGER NOT NULL REFERENCES entities(id),
  from_state         TEXT NOT NULL,
  to_state           TEXT NOT NULL,
  reason             TEXT NOT NULL CHECK (reason IN (
                       'initial_observation',
                       'removed_from_head',
                       're_added',
                       'backfill_match',
                       'source_retired_at_version',
                       'manual_update'
                     )),
  version_context    TEXT,
  extractor_run_id   TEXT NOT NULL,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sst_entity ON source_state_transitions(entity_id);
CREATE INDEX IF NOT EXISTS idx_sst_run    ON source_state_transitions(extractor_run_id);
`;

// v2 adds four new entity types and their per-type version tables:
//   keyname, hud_element, ruleset, token_primitive
// The only structural change on existing tables is widening the
// entities.type CHECK constraint. SQLite can't ALTER a CHECK in place, so the
// v1 -> v2 migration rebuilds the entities table with the new constraint.

const SCHEMA_V2_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS keyname_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  key_code          INTEGER,
  key_code_ident    TEXT,
  source_file       TEXT,
  source_line       INTEGER,
  source_column     INTEGER,
  build_variant     TEXT,
  raw_ast_hash      TEXT,
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS hud_element_versions (
  entity_id           INTEGER NOT NULL REFERENCES entities(id),
  version             TEXT NOT NULL,
  help_desc           TEXT,
  hud_alias           TEXT,
  flags_raw           TEXT,
  min_state_raw       TEXT,
  draw_order_raw      TEXT,
  draw_fn             TEXT,
  enclosing_function  TEXT,
  source_file         TEXT,
  source_line         INTEGER,
  source_column       INTEGER,
  owned_cvars_json    TEXT,
  raw_ast_hash        TEXT,
  extracted_at        TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS ruleset_versions (
  entity_id            INTEGER NOT NULL REFERENCES entities(id),
  version              TEXT NOT NULL,
  enum_ident           TEXT,
  loader_fn            TEXT,
  maxfps               REAL,
  restrict_triggers    INTEGER,
  restrict_packet      INTEGER,
  restrict_particles   INTEGER,
  restrict_play        INTEGER,
  restrict_logging     INTEGER,
  restrict_rollangle   INTEGER,
  restrict_ipc         INTEGER,
  restrict_exec        INTEGER,
  restrict_setcalc     INTEGER,
  restrict_seteval     INTEGER,
  restrict_setex       INTEGER,
  locked_cvars_json    TEXT,
  source_file          TEXT,
  source_line          INTEGER,
  raw_ast_hash         TEXT,
  extracted_at         TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS token_primitive_versions (
  entity_id      INTEGER NOT NULL REFERENCES entities(id),
  version        TEXT NOT NULL,
  form           TEXT,
  suffix_char    TEXT,
  byte_value     INTEGER,
  category       TEXT,
  case_style     TEXT,
  source_file    TEXT,
  source_line    INTEGER,
  raw_ast_hash   TEXT,
  extracted_at   TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
`;

// Entities table rebuild with the widened type CHECK. Preserves all rows,
// PK ids, and indexes. Wrapped in a transaction by the caller.
const ENTITIES_V2_MIGRATION_SQL = `
CREATE TABLE entities_v2 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v2(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v2 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v2 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
`;

// v3 adds the asset_consumption model: one entity-style type (asset_category)
// and four relation tables (extensions, path_rules, cvar_bindings,
// loader_sites). Matches docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md.

const SCHEMA_V3_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS asset_category_versions (
  entity_id       INTEGER NOT NULL REFERENCES entities(id),
  version         TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  description     TEXT,
  notes           TEXT,
  raw_ast_hash    TEXT,
  extracted_at    TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS asset_extensions (
  id                     INTEGER PRIMARY KEY,
  project                TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version                TEXT NOT NULL,
  extension              TEXT NOT NULL,
  path_hint              TEXT,
  category_id            TEXT NOT NULL REFERENCES entities(canonical_id),
  notes                  TEXT,
  -- v7: per-row verification audit. Lifts the .kmap / .dll prose stamps from
  -- entity-types.md into a queryable column so the future review skill (and
  -- consumers like the dir-browser) can filter by hygiene status without
  -- parsing markdown. Values mirror the four buckets documented in
  -- apps/qw-oracle/docs/entity-types.md § Verification statuses.
  verification_status    TEXT NOT NULL DEFAULT 'ast_verified' CHECK (verification_status IN (
                           'ast_verified',
                           'seed_only_with_ast_support',
                           'seed_only_no_ast_support',
                           'orphaned_historical'
                         )),
  verification_reason    TEXT,
  raw_ast_hash           TEXT,
  extracted_at           TEXT NOT NULL,
  UNIQUE (project, version, extension, path_hint)
);
CREATE INDEX IF NOT EXISTS idx_asset_ext_cat ON asset_extensions(category_id);
CREATE INDEX IF NOT EXISTS idx_asset_ext_verif ON asset_extensions(verification_status);

CREATE TABLE IF NOT EXISTS asset_path_rules (
  id               INTEGER PRIMARY KEY,
  project          TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version          TEXT NOT NULL,
  canonical_id     TEXT NOT NULL,
  rule_kind        TEXT NOT NULL CHECK (rule_kind IN (
                     'search_path','archive_precedence','cmdline_override','gamedir_behavior'
                   )),
  ordinal          INTEGER NOT NULL,
  description      TEXT NOT NULL,
  source_ref       TEXT,
  source_verified  INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  UNIQUE (project, version, canonical_id)
);

CREATE TABLE IF NOT EXISTS asset_cvar_bindings (
  id                 INTEGER PRIMARY KEY,
  project            TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version            TEXT NOT NULL,
  cvar_canonical_id  TEXT NOT NULL REFERENCES entities(canonical_id),
  category_id        TEXT NOT NULL REFERENCES entities(canonical_id),
  path_pattern       TEXT,
  load_trigger       TEXT NOT NULL CHECK (load_trigger IN (
                       'startup','on_demand','on_connect','on_map_load','unknown'
                     )),
  confidence         TEXT NOT NULL CHECK (confidence IN (
                       'seed','auto','auto_confirms_seed','auto_orphan'
                     )),
  source_ref         TEXT,
  notes              TEXT,
  raw_ast_hash       TEXT,
  extracted_at       TEXT NOT NULL,
  UNIQUE (project, version, cvar_canonical_id, category_id, path_pattern)
);
CREATE INDEX IF NOT EXISTS idx_asset_cvar_bind_cvar ON asset_cvar_bindings(cvar_canonical_id);
CREATE INDEX IF NOT EXISTS idx_asset_cvar_bind_cat  ON asset_cvar_bindings(category_id);

CREATE TABLE IF NOT EXISTS asset_loader_sites (
  id                 INTEGER PRIMARY KEY,
  project            TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version            TEXT NOT NULL,
  canonical_id       TEXT NOT NULL,
  function_name      TEXT NOT NULL,
  source_file        TEXT NOT NULL,
  source_line        INTEGER NOT NULL,
  source_column      INTEGER,
  enclosing_function TEXT,
  reads_category_id  TEXT REFERENCES entities(canonical_id),
  load_trigger       TEXT NOT NULL CHECK (load_trigger IN (
                       'startup','on_demand','on_connect','on_map_load','unknown'
                     )),
  path_source        TEXT NOT NULL CHECK (path_source IN ('literal','cvar','computed','unknown')),
  path_literal       TEXT,
  path_cvar_id       TEXT REFERENCES entities(canonical_id),
  confidence         TEXT NOT NULL CHECK (confidence IN ('certain','heuristic','intentionally_generic','unclassified')),
  dev_only           INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  raw_ast_hash       TEXT,
  extracted_at       TEXT NOT NULL,
  UNIQUE (project, version, canonical_id)
);
CREATE INDEX IF NOT EXISTS idx_asset_loader_category ON asset_loader_sites(reads_category_id);
CREATE INDEX IF NOT EXISTS idx_asset_loader_cvar     ON asset_loader_sites(path_cvar_id);
CREATE INDEX IF NOT EXISTS idx_asset_loader_fn       ON asset_loader_sites(function_name);
`;

// v4 adds release_notes: one row per parsed bullet from a tag's GitHub
// release body. Captures version-level narrative that entity diffs can't see
// (code-only fixes, bitmask-flag additions, high-level feature notes).
// Entity cross-links are stored as JSON arrays of canonical_ids rather than
// per-row FK rows so the table stays free of junction scaffolding.
const SCHEMA_V4_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS release_notes (
  id                          INTEGER PRIMARY KEY,
  project                     TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version                     TEXT NOT NULL,
  section                     TEXT NOT NULL,
  ordinal                     INTEGER NOT NULL,
  body_md                     TEXT NOT NULL,
  referenced_entity_ids_json  TEXT,
  commit_urls_json            TEXT,
  pr_numbers_json             TEXT,
  author_handles_json         TEXT,
  raw_body_hash               TEXT,
  extracted_at                TEXT NOT NULL,
  UNIQUE (project, version, section, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_release_notes_version ON release_notes(project, version);
`;

// v5 adds flag_bit_versions (per-version table for the new 'flag_bit' entity
// type) and relation_changes (change-event stream for the asset_* relation
// tables, mirroring change_events for entity rows but keyed by relation_table
// + row_key_json). Widening the entities.type CHECK to include 'flag_bit'
// requires an entities-table rebuild (see ENTITIES_V5_MIGRATION_SQL).
const SCHEMA_V5_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS flag_bit_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  bitmask_family    TEXT NOT NULL,
  value_raw         TEXT,
  value_numeric     INTEGER,
  source_file       TEXT,
  source_line       INTEGER,
  raw_ast_hash      TEXT,
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_flag_bit_versions_family ON flag_bit_versions(bitmask_family);

CREATE TABLE IF NOT EXISTS relation_changes (
  id                       INTEGER PRIMARY KEY,
  relation_table           TEXT NOT NULL CHECK (relation_table IN (
                             'asset_extensions','asset_path_rules',
                             'asset_cvar_bindings','asset_loader_sites'
                           )),
  project                  TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  from_version             TEXT,
  to_version               TEXT NOT NULL,
  change_kind              TEXT NOT NULL CHECK (change_kind IN ('created','modified','deleted')),
  row_key_json             TEXT NOT NULL,
  field_name               TEXT NOT NULL DEFAULT '',
  old_value                TEXT,
  new_value                TEXT,
  commit_sha               TEXT NOT NULL,
  commit_message_excerpt   TEXT,
  extracted_at             TEXT NOT NULL,
  UNIQUE (relation_table, project, to_version, row_key_json, field_name, change_kind)
);
CREATE INDEX IF NOT EXISTS idx_relation_changes_to_version ON relation_changes(to_version);
CREATE INDEX IF NOT EXISTS idx_relation_changes_table      ON relation_changes(relation_table);
`;

// v6 adds source_overrides: per-(entity, version, field) blame rows for
// fields whose value comes from a site other than the entity's primary
// struct-init declaration (e.g. re-declarations in command handlers,
// header-level defaults, call-site overrides). Pure-additive; no CHECK
// widening on entities, so no entities-table rebuild.
const SCHEMA_V6_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS source_overrides (
  entity_id     INTEGER NOT NULL REFERENCES entities(id),
  version       TEXT NOT NULL,
  field_name    TEXT NOT NULL,
  source_file   TEXT NOT NULL,
  source_line   INTEGER NOT NULL,
  source_column INTEGER,
  override_kind TEXT NOT NULL CHECK (override_kind IN (
                  'struct_field_decl',
                  'call_site',
                  'header_declaration'
                )),
  extracted_at  TEXT NOT NULL,
  PRIMARY KEY (entity_id, version, field_name)
);
CREATE INDEX IF NOT EXISTS idx_source_overrides_entity ON source_overrides(entity_id, version);
`;

// v9 -> v10 widens the project CHECK on every project-keyed table to admit
// 'qwcl' (first cross-codebase port: the 1996 id Software QuakeWorld client).
// Eight tables carry their own project CHECK, each rebuilt by the standard
// CREATE _v10 + INSERT SELECT * + DROP + RENAME pattern. Foreign keys must be
// OFF outside the txn so the entities-table rebuild can drop a target of
// many FKs. All other rebuilds are FK-safe but ride the same setting.
//
// Order matters only at the entities-table step (its self-FK on predecessor_id
// is rewritten by the rebuild). All other tables are independent.
const PROJECT_CHECK_V10_MIGRATION_SQL = `
-- versions
CREATE TABLE versions_v10 (
  id             INTEGER PRIMARY KEY,
  project        TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version        TEXT NOT NULL,
  commit_sha     TEXT NOT NULL,
  tag_date       TEXT,
  ordinal        INTEGER NOT NULL,
  parse_state    TEXT NOT NULL DEFAULT 'ok' CHECK (parse_state IN ('ok','partial')),
  notes          TEXT,
  extracted_at   TEXT NOT NULL,
  UNIQUE (project, version)
);
INSERT INTO versions_v10 SELECT * FROM versions;
DROP TABLE versions;
ALTER TABLE versions_v10 RENAME TO versions;
CREATE UNIQUE INDEX idx_versions_ordinal ON versions(project, ordinal);

-- entities (self-FK on predecessor_id)
CREATE TABLE entities_v10 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v10(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v10 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v10 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);

-- asset_extensions (FK to entities.canonical_id; verification CHECK preserved)
CREATE TABLE asset_extensions_v10 (
  id                     INTEGER PRIMARY KEY,
  project                TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version                TEXT NOT NULL,
  extension              TEXT NOT NULL,
  path_hint              TEXT,
  category_id            TEXT NOT NULL REFERENCES entities(canonical_id),
  notes                  TEXT,
  verification_status    TEXT NOT NULL DEFAULT 'ast_verified' CHECK (verification_status IN (
                           'ast_verified',
                           'seed_only_with_ast_support',
                           'seed_only_no_ast_support',
                           'orphaned_historical'
                         )),
  verification_reason    TEXT,
  raw_ast_hash           TEXT,
  extracted_at           TEXT NOT NULL,
  UNIQUE (project, version, extension, path_hint)
);
INSERT INTO asset_extensions_v10 SELECT * FROM asset_extensions;
DROP TABLE asset_extensions;
ALTER TABLE asset_extensions_v10 RENAME TO asset_extensions;
CREATE INDEX idx_asset_ext_cat ON asset_extensions(category_id);
CREATE INDEX idx_asset_ext_verif ON asset_extensions(verification_status);

-- asset_path_rules
CREATE TABLE asset_path_rules_v10 (
  id               INTEGER PRIMARY KEY,
  project          TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version          TEXT NOT NULL,
  canonical_id     TEXT NOT NULL,
  rule_kind        TEXT NOT NULL CHECK (rule_kind IN (
                     'search_path','archive_precedence','cmdline_override','gamedir_behavior'
                   )),
  ordinal          INTEGER NOT NULL,
  description      TEXT NOT NULL,
  source_ref       TEXT,
  source_verified  INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  UNIQUE (project, version, canonical_id)
);
INSERT INTO asset_path_rules_v10 SELECT * FROM asset_path_rules;
DROP TABLE asset_path_rules;
ALTER TABLE asset_path_rules_v10 RENAME TO asset_path_rules;

-- asset_cvar_bindings (FK to entities.canonical_id x2)
CREATE TABLE asset_cvar_bindings_v10 (
  id                 INTEGER PRIMARY KEY,
  project            TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version            TEXT NOT NULL,
  cvar_canonical_id  TEXT NOT NULL REFERENCES entities(canonical_id),
  category_id        TEXT NOT NULL REFERENCES entities(canonical_id),
  path_pattern       TEXT,
  load_trigger       TEXT NOT NULL CHECK (load_trigger IN (
                       'startup','on_demand','on_connect','on_map_load','unknown'
                     )),
  confidence         TEXT NOT NULL CHECK (confidence IN (
                       'seed','auto','auto_confirms_seed','auto_orphan'
                     )),
  source_ref         TEXT,
  notes              TEXT,
  raw_ast_hash       TEXT,
  extracted_at       TEXT NOT NULL,
  UNIQUE (project, version, cvar_canonical_id, category_id, path_pattern)
);
INSERT INTO asset_cvar_bindings_v10 SELECT * FROM asset_cvar_bindings;
DROP TABLE asset_cvar_bindings;
ALTER TABLE asset_cvar_bindings_v10 RENAME TO asset_cvar_bindings;
CREATE INDEX idx_asset_cvar_bind_cvar ON asset_cvar_bindings(cvar_canonical_id);
CREATE INDEX idx_asset_cvar_bind_cat  ON asset_cvar_bindings(category_id);

-- asset_loader_sites (FK to entities.canonical_id x2; v8 confidence CHECK preserved)
CREATE TABLE asset_loader_sites_v10 (
  id                 INTEGER PRIMARY KEY,
  project            TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version            TEXT NOT NULL,
  canonical_id       TEXT NOT NULL,
  function_name      TEXT NOT NULL,
  source_file        TEXT NOT NULL,
  source_line        INTEGER NOT NULL,
  source_column      INTEGER,
  enclosing_function TEXT,
  reads_category_id  TEXT REFERENCES entities(canonical_id),
  load_trigger       TEXT NOT NULL CHECK (load_trigger IN (
                       'startup','on_demand','on_connect','on_map_load','unknown'
                     )),
  path_source        TEXT NOT NULL CHECK (path_source IN ('literal','cvar','computed','unknown')),
  path_literal       TEXT,
  path_cvar_id       TEXT REFERENCES entities(canonical_id),
  confidence         TEXT NOT NULL CHECK (confidence IN ('certain','heuristic','intentionally_generic','unclassified')),
  dev_only           INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  raw_ast_hash       TEXT,
  extracted_at       TEXT NOT NULL,
  UNIQUE (project, version, canonical_id)
);
INSERT INTO asset_loader_sites_v10 SELECT * FROM asset_loader_sites;
DROP TABLE asset_loader_sites;
ALTER TABLE asset_loader_sites_v10 RENAME TO asset_loader_sites;
CREATE INDEX idx_asset_loader_category ON asset_loader_sites(reads_category_id);
CREATE INDEX idx_asset_loader_cvar     ON asset_loader_sites(path_cvar_id);
CREATE INDEX idx_asset_loader_fn       ON asset_loader_sites(function_name);

-- release_notes
CREATE TABLE release_notes_v10 (
  id                          INTEGER PRIMARY KEY,
  project                     TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  version                     TEXT NOT NULL,
  section                     TEXT NOT NULL,
  ordinal                     INTEGER NOT NULL,
  body_md                     TEXT NOT NULL,
  referenced_entity_ids_json  TEXT,
  commit_urls_json            TEXT,
  pr_numbers_json             TEXT,
  author_handles_json         TEXT,
  raw_body_hash               TEXT,
  extracted_at                TEXT NOT NULL,
  UNIQUE (project, version, section, ordinal)
);
INSERT INTO release_notes_v10 SELECT * FROM release_notes;
DROP TABLE release_notes;
ALTER TABLE release_notes_v10 RENAME TO release_notes;
CREATE INDEX idx_release_notes_version ON release_notes(project, version);

-- relation_changes
CREATE TABLE relation_changes_v10 (
  id                       INTEGER PRIMARY KEY,
  relation_table           TEXT NOT NULL CHECK (relation_table IN (
                             'asset_extensions','asset_path_rules',
                             'asset_cvar_bindings','asset_loader_sites'
                           )),
  project                  TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  from_version             TEXT,
  to_version               TEXT NOT NULL,
  change_kind              TEXT NOT NULL CHECK (change_kind IN ('created','modified','deleted')),
  row_key_json             TEXT NOT NULL,
  field_name               TEXT NOT NULL DEFAULT '',
  old_value                TEXT,
  new_value                TEXT,
  commit_sha               TEXT NOT NULL,
  commit_message_excerpt   TEXT,
  extracted_at             TEXT NOT NULL,
  UNIQUE (relation_table, project, to_version, row_key_json, field_name, change_kind)
);
INSERT INTO relation_changes_v10 SELECT * FROM relation_changes;
DROP TABLE relation_changes;
ALTER TABLE relation_changes_v10 RENAME TO relation_changes;
CREATE INDEX idx_relation_changes_to_version ON relation_changes(to_version);
CREATE INDEX idx_relation_changes_table      ON relation_changes(relation_table);
`;

// v8 -> v9 widens the source_state_transitions.reason CHECK to allow
// 'source_retired_at_version' for the per-version retirement detection that
// runs in load-version's normal path. Same table-rebuild pattern as v7->v8.
const SOURCE_STATE_TRANSITIONS_V9_MIGRATION_SQL = `
CREATE TABLE source_state_transitions_v9 (
  id                 INTEGER PRIMARY KEY,
  entity_id          INTEGER NOT NULL REFERENCES entities(id),
  from_state         TEXT NOT NULL,
  to_state           TEXT NOT NULL,
  reason             TEXT NOT NULL CHECK (reason IN (
                       'initial_observation',
                       'removed_from_head',
                       're_added',
                       'backfill_match',
                       'source_retired_at_version',
                       'manual_update'
                     )),
  version_context    TEXT,
  extractor_run_id   TEXT NOT NULL,
  created_at         TEXT NOT NULL
);
INSERT INTO source_state_transitions_v9 SELECT * FROM source_state_transitions;
DROP TABLE source_state_transitions;
ALTER TABLE source_state_transitions_v9 RENAME TO source_state_transitions;
CREATE INDEX idx_sst_entity ON source_state_transitions(entity_id);
CREATE INDEX idx_sst_run    ON source_state_transitions(extractor_run_id);
`;

// v7 -> v8 widens the asset_loader_sites.confidence CHECK to add
// 'intentionally_generic'. SQLite can't ALTER a CHECK in place, so the
// migration rebuilds the table preserving rows, indexes, and ids.
const ASSET_LOADER_SITES_V8_MIGRATION_SQL = `
CREATE TABLE asset_loader_sites_v8 (
  id                 INTEGER PRIMARY KEY,
  project            TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version            TEXT NOT NULL,
  canonical_id       TEXT NOT NULL,
  function_name      TEXT NOT NULL,
  source_file        TEXT NOT NULL,
  source_line        INTEGER NOT NULL,
  source_column      INTEGER,
  enclosing_function TEXT,
  reads_category_id  TEXT REFERENCES entities(canonical_id),
  load_trigger       TEXT NOT NULL CHECK (load_trigger IN (
                       'startup','on_demand','on_connect','on_map_load','unknown'
                     )),
  path_source        TEXT NOT NULL CHECK (path_source IN ('literal','cvar','computed','unknown')),
  path_literal       TEXT,
  path_cvar_id       TEXT REFERENCES entities(canonical_id),
  confidence         TEXT NOT NULL CHECK (confidence IN ('certain','heuristic','intentionally_generic','unclassified')),
  dev_only           INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  raw_ast_hash       TEXT,
  extracted_at       TEXT NOT NULL,
  UNIQUE (project, version, canonical_id)
);
INSERT INTO asset_loader_sites_v8 SELECT * FROM asset_loader_sites;
DROP TABLE asset_loader_sites;
ALTER TABLE asset_loader_sites_v8 RENAME TO asset_loader_sites;
CREATE INDEX idx_asset_loader_category ON asset_loader_sites(reads_category_id);
CREATE INDEX idx_asset_loader_cvar     ON asset_loader_sites(path_cvar_id);
CREATE INDEX idx_asset_loader_fn       ON asset_loader_sites(function_name);
`;

// v6 -> v7 adds verification_status + verification_reason to asset_extensions
// so the per-row hygiene audit lives in the DB instead of entity-types.md
// prose. Pure-additive: ALTER TABLE ADD COLUMN with a literal DEFAULT and a
// self-referencing CHECK is supported by SQLite without a table rebuild.
const SCHEMA_V7_MIGRATION_SQL = `
ALTER TABLE asset_extensions
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'ast_verified'
    CHECK (verification_status IN (
      'ast_verified',
      'seed_only_with_ast_support',
      'seed_only_no_ast_support',
      'orphaned_historical'
    ));
ALTER TABLE asset_extensions ADD COLUMN verification_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_asset_ext_verif ON asset_extensions(verification_status);
`;

// v2 -> v3 rebuilds the entities table to add 'asset_category' to the
// type CHECK. Same pattern as v1 -> v2.
const ENTITIES_V3_MIGRATION_SQL = `
CREATE TABLE entities_v3 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v3(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v3 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v3 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
`;

// v4 -> v5 rebuilds the entities table to add 'flag_bit' to the type CHECK.
// Same pattern as v2 -> v3. (v4 only added release_notes, so no entities
// rebuild was needed at that step.)
const ENTITIES_V5_MIGRATION_SQL = `
CREATE TABLE entities_v5 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v5(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v5 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v5 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
`;

function migrateV1ToV2(db: Database.Database): void {
  // PRAGMA foreign_keys = OFF must be toggled OUTSIDE a transaction --
  // SQLite silently ignores it mid-transaction. Disable before and restore
  // after so the rebuild can drop `entities` while other tables FK-reference
  // it.
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
      `);
      db.exec(ENTITIES_V2_MIGRATION_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('2');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function migrateV2ToV3(db: Database.Database): void {
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
      `);
      db.exec(ENTITIES_V3_MIGRATION_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('3');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function migrateV3ToV4(db: Database.Database): void {
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V4_ADDITIONS_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('4');
  });
  txn();
}

function migrateV4ToV5(db: Database.Database): void {
  // Like v1->v2 and v2->v3, the entities-table rebuild requires
  // foreign_keys OFF outside the transaction. SQLite silently ignores the
  // pragma mid-transaction.
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
      `);
      db.exec(ENTITIES_V5_MIGRATION_SQL);
      db.exec(SCHEMA_V5_ADDITIONS_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('5');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function migrateV5ToV6(db: Database.Database): void {
  // Pure-additive: new source_overrides table + index, no entities rebuild
  // and no CHECK widening. Plain txn, no foreign_keys toggle needed.
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V6_ADDITIONS_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('6');
  });
  txn();
}

function migrateV6ToV7(db: Database.Database): void {
  // Pure-additive ALTER TABLE on asset_extensions. SQLite accepts
  // ADD COLUMN with literal DEFAULT + self-column CHECK.
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V7_MIGRATION_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('7');
  });
  txn();
}

function migrateV7ToV8(db: Database.Database): void {
  // Widens asset_loader_sites.confidence CHECK to allow
  // 'intentionally_generic'. Table rebuild preserves rows + ids; same FK
  // pattern as the entities-table rebuilds (foreign_keys OFF outside the
  // transaction so DROP TABLE is allowed).
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_asset_loader_category;
        DROP INDEX IF EXISTS idx_asset_loader_cvar;
        DROP INDEX IF EXISTS idx_asset_loader_fn;
      `);
      db.exec(ASSET_LOADER_SITES_V8_MIGRATION_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('8');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function migrateV8ToV9(db: Database.Database): void {
  // Widens source_state_transitions.reason CHECK to allow
  // 'source_retired_at_version'. Table rebuild preserves rows + ids.
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_sst_entity;
        DROP INDEX IF EXISTS idx_sst_run;
      `);
      db.exec(SOURCE_STATE_TRANSITIONS_V9_MIGRATION_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('9');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

// v10 -> v11 adds a nullable source_root TEXT column to the three per-type
// version tables that can have multi-source projects (cvars, commands, macros).
// Pure-additive ALTER TABLE: SQLite accepts ADD COLUMN for nullable columns
// with no DEFAULT and no CHECK, so no table rebuild is required.
// cmdline_param_versions and other per-type tables do NOT get the column —
// they are engine-only by definition (plugins don't register cmdline params,
// keynames, HUD elements, rulesets, or token primitives).
const SCHEMA_V11_MIGRATION_SQL = `
ALTER TABLE cvar_versions    ADD COLUMN source_root TEXT;
ALTER TABLE command_versions ADD COLUMN source_root TEXT;
ALTER TABLE macro_versions   ADD COLUMN source_root TEXT;
`;

// v11 -> v12 introduces the cvar_alias entity type for cross-engine alias
// scaffolding. The new entity type is hosted by the existing entities table
// (CHECK widening, same rebuild pattern as v1->v2/v2->v3/v4->v5) and gets a
// new per-version table cvar_alias_versions sibling to cvar_versions /
// command_versions. Spec: docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md.
const SCHEMA_V12_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS cvar_alias_versions (
  entity_id                       INTEGER NOT NULL REFERENCES entities(id),
  version                         TEXT NOT NULL,
  target_project                  TEXT NOT NULL CHECK (target_project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  target_kind                     TEXT NOT NULL CHECK (target_kind IN (
                                    'cvar','command','macro','serverinfo','userinfo'
                                  )),
  target_name                     TEXT NOT NULL,
  target_canonical_id             TEXT REFERENCES entities(canonical_id),
  mimics_project                  TEXT CHECK (mimics_project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  value_transform                 TEXT NOT NULL DEFAULT 'identity'
                                    CHECK (value_transform IN (
                                      'identity','bool_flip','scale','enum_remap','needs_review'
                                    )),
  value_transform_params_json     TEXT,
  default_drift_status            TEXT NOT NULL DEFAULT 'unknown'
                                    CHECK (default_drift_status IN (
                                      'same','differ_safe','differ_dangerous','unknown'
                                    )),
  semantic_confidence             TEXT NOT NULL DEFAULT 'needs_review'
                                    CHECK (semantic_confidence IN (
                                      'high','medium','low','needs_review'
                                    )),
  verified_target_version         TEXT,
  verified_mimics_version         TEXT,
  freshness_state                 TEXT NOT NULL DEFAULT 'alive'
                                    CHECK (freshness_state IN (
                                      'alive','target_gone','mimics_lhs_gone','both_gone','unknown'
                                    )),
  source_file                     TEXT,
  source_line                     INTEGER,
  source_column                   INTEGER,
  source_root                     TEXT,
  raw_ast_hash                    TEXT,
  extracted_at                    TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_cvar_alias_versions_target
  ON cvar_alias_versions(target_project, target_kind, target_name);
CREATE INDEX IF NOT EXISTS idx_cvar_alias_versions_canonical
  ON cvar_alias_versions(target_canonical_id);
`;

// v13: maps table for community game content. Intentionally flat -- maps do
// not change with engine version so they don't participate in the
// entity/version machinery. Spec: docs/superpowers/specs/2026-04-26-qw-oracle-map-knowledge-design.md.
const SCHEMA_V13_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS maps (
  canonical_name           TEXT PRIMARY KEY,
  file_name                TEXT NOT NULL,
  display_name             TEXT,
  author                   TEXT,
  bsp_version              TEXT NOT NULL,
  bsp_size_bytes           INTEGER NOT NULL,
  bsp_sha256               TEXT NOT NULL,
  worldspawn_json          TEXT NOT NULL,
  entity_count             INTEGER NOT NULL,
  class_counts_json        TEXT NOT NULL,
  item_summary_json        TEXT NOT NULL,
  spawn_summary_json       TEXT NOT NULL,
  features_json            TEXT NOT NULL,
  wads_referenced_json     TEXT NOT NULL,
  inferred_gamemodes_json  TEXT NOT NULL,
  popularity_total         INTEGER,
  popularity_by_mode_json  TEXT,
  popularity_rank          INTEGER,
  notes                    TEXT,
  source_bsp_url           TEXT NOT NULL,
  extracted_at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maps_popularity_rank ON maps(popularity_rank);
CREATE INDEX IF NOT EXISTS idx_maps_author          ON maps(author);
`;

// v14 (game-mechanics, 2026-04-27).
// Three flat tables outside the entities/per-version model. Mirrors the
// SCHEMA_V13_ADDITIONS_SQL pattern for the maps table. ruleset_gate_json
// is NOT NULL DEFAULT '{}' so the unique index has no NULL columns
// (SQLite treats NULLs as distinct in unique indexes, which would defeat
// upsert idempotency). KTX overrides in arc 2 store compound gates as
// JSON like '{"yawn":true,"dm":3}'.
const SCHEMA_V14_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS gameplay_sources (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description  TEXT NOT NULL,
  source_root  TEXT NOT NULL,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS gameplay_entity_defs (
  id                     INTEGER PRIMARY KEY,
  gameplay_source_id     TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind                   TEXT NOT NULL CHECK (kind IN ('item','weapon','projectile')),
  name                   TEXT NOT NULL,
  classname              TEXT,
  damage                 REAL,
  splash_damage          REAL,
  splash_radius          REAL,
  refire_seconds         REAL,
  respawn_seconds        REAL,
  pickup_amount          REAL,
  max_carry              REAL,
  duration_seconds       REAL,
  ruleset_gate_json      TEXT NOT NULL DEFAULT '{}',
  source_ref             TEXT NOT NULL,
  props_json             TEXT NOT NULL DEFAULT '{}',
  notes                  TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
CREATE INDEX IF NOT EXISTS idx_gameplay_entity_defs_kind  ON gameplay_entity_defs(kind);
CREATE INDEX IF NOT EXISTS idx_gameplay_entity_defs_name  ON gameplay_entity_defs(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_gameplay_entity_defs_class ON gameplay_entity_defs(classname);

CREATE TABLE IF NOT EXISTS gameplay_mechanics (
  id                     INTEGER PRIMARY KEY,
  gameplay_source_id     TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind                   TEXT NOT NULL CHECK (kind IN (
                            'constant','env_hazard','player_stat',
                            'powerup_behavior','armor_model','death_rule',
                            'spawn_rule','dm_mode_rule'
                         )),
  name                   TEXT NOT NULL,
  value_numeric          REAL,
  value_text             TEXT,
  ruleset_gate_json      TEXT NOT NULL DEFAULT '{}',
  source_ref             TEXT NOT NULL,
  props_json             TEXT NOT NULL DEFAULT '{}',
  notes                  TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
CREATE INDEX IF NOT EXISTS idx_gameplay_mechanics_kind ON gameplay_mechanics(kind);
CREATE INDEX IF NOT EXISTS idx_gameplay_mechanics_name ON gameplay_mechanics(name COLLATE NOCASE);
`;

const ENTITIES_V12_MIGRATION_SQL = `
CREATE TABLE entities_v12 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit','cvar_alias'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v12(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v12 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v12 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
`;

// v14 -> v15 widens the entities.type CHECK to admit four new server-side
// entity types: protocol_message, info_key, log_template, qc_builtin.
// Standard entities-rebuild pattern (same shape as v11->v12).
const ENTITIES_V15_MIGRATION_SQL = `
CREATE TABLE entities_v15 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit','cvar_alias',
                          'protocol_message','info_key','log_template','qc_builtin'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v15(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v15 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v15 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
`;

// v15 (Phase 2e MVDSV, 2026-04-27).
// Four new per-version tables for the four new server-side entity types.
// Pure-additive. The entities.type CHECK widening lives in
// ENTITIES_V15_MIGRATION_SQL above.
//
// v16 update (2026-04-28): the inline kind CHECK on protocol_message_versions
// below carries the WIDENED v16 13-kind list (not the original v15 6-kind
// list). Fresh DBs land on this CREATE IF NOT EXISTS via applySchema and
// therefore start with the v16 CHECK directly -- the documented "fresh DB
// vs migrated DB" pattern (mirrors how SCHEMA_V1_SQL's entities.type CHECK
// already lists the full v15 set). Migrated DBs reach the same shape via
// PROTOCOL_MESSAGE_KIND_V16_MIGRATION_SQL (rebuild with the widened CHECK).
const SCHEMA_V15_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS protocol_message_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN (
                     'svc','clc','nq',
                     'pext_fte_bit','pext_fte_const','pext_fte_alias','pext_fte_marker',
                     'pext_mvd_bit','pext_mvd_const','pext_mvd_alias','pext_mvd_marker',
                     'protocol_version','protocol_extension_id'
                   )),
  value            TEXT,
  value_kind       TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  source_root      TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_protocol_message_versions_source ON protocol_message_versions(source_file, source_line);

CREATE TABLE IF NOT EXISTS info_key_versions (
  entity_id           INTEGER NOT NULL REFERENCES entities(id),
  version             TEXT NOT NULL,
  scope               TEXT NOT NULL CHECK (scope IN ('userinfo','serverinfo','localinfo')),
  operations          TEXT,
  source_file         TEXT,
  source_line         INTEGER,
  containing_function TEXT,
  call_sites_json     TEXT,
  raw_ast_hash        TEXT,
  source_root         TEXT,
  extracted_at        TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_info_key_versions_source ON info_key_versions(source_file, source_line);

CREATE TABLE IF NOT EXISTS log_template_versions (
  entity_id                INTEGER NOT NULL REFERENCES entities(id),
  version                  TEXT NOT NULL,
  channel                  TEXT NOT NULL CHECK (channel IN ('broadcast','client','console','system')),
  format_string            TEXT NOT NULL,
  format_string_normalized TEXT NOT NULL,
  source_file              TEXT,
  source_line              INTEGER,
  containing_function      TEXT,
  -- v17 (Phase D Task 10): JSON array of every call site that registers this
  -- (channel, format_string) tuple. Pre-v17 rows store NULL; v17+ rows always
  -- carry at least one entry (the first call site). Schema parity with
  -- info_key_versions.call_sites_json.
  all_call_sites_json      TEXT,
  raw_ast_hash             TEXT,
  source_root              TEXT,
  extracted_at             TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_log_template_versions_source ON log_template_versions(source_file, source_line);
CREATE INDEX IF NOT EXISTS idx_log_template_versions_channel ON log_template_versions(channel);

CREATE TABLE IF NOT EXISTS qc_builtin_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  table_name       TEXT NOT NULL,
  builtin_index    INTEGER NOT NULL,
  handler_fn       TEXT NOT NULL,
  qc_signature     TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  source_root      TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_qc_builtin_versions_source ON qc_builtin_versions(source_file, source_line);
`;

// v15 -> v16 (Phase B + Phase C, 2026-04-28).
// Phase B (info_key cross-scope split): backfills existing v15 info_key
// entity names from `<bare>` to `<bare>:<scope>` so cross-scope dups can
// coexist under the entities UNIQUE(project, type, name) constraint. The
// next extract-tag idempotently re-upserts (existing 44 entities renamed
// match the extracted suffixed names; the missing `*z_ext:userinfo` is
// INSERTed fresh by the natural-keys upsert path).
//
// Phase C (protocol_message kind taxonomy): rebuilds protocol_message_versions
// with the widened 13-value kind CHECK (was 6: svc/clc/nq/pext_fte/pext_mvd/
// protocol_version -> now: svc/clc/nq + 4 pext_fte_* + 4 pext_mvd_* +
// protocol_version + protocol_extension_id). Existing v15 rows are mapped
// to the new taxonomy DURING the rebuild's INSERT INTO ... SELECT, using
// fields already on the row (value_kind for pext_* subdivision, entity name
// for protocol_version vs protocol_extension_id). After the rebuild, the
// next extract-tag idempotently re-upserts with the handler-emitted kinds;
// any drift between the migration's mapping and the handler's classification
// (which sees the macro body directly) self-corrects.
//
// The transform happens inside the INSERT instead of an in-place UPDATE
// because the OLD CHECK on protocol_message_versions still rejects the new
// kind values during a pre-rebuild UPDATE. Doing the transform during the
// INSERT means the values land directly in the new table whose CHECK accepts
// them.
const PROTOCOL_MESSAGE_KIND_V16_MIGRATION_SQL = `
CREATE TABLE protocol_message_versions_v16 (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN (
                     'svc','clc','nq',
                     'pext_fte_bit','pext_fte_const','pext_fte_alias','pext_fte_marker',
                     'pext_mvd_bit','pext_mvd_const','pext_mvd_alias','pext_mvd_marker',
                     'protocol_version','protocol_extension_id'
                   )),
  value            TEXT,
  value_kind       TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  source_root      TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
-- Map old 6-kind values to the new 13-kind taxonomy as the rows flow into
-- the new table. svc/clc/nq pass through unchanged. pext_fte / pext_mvd
-- subdivide by value_kind: 'bitshift' -> _bit, 'integer'/'hex' -> _const,
-- 'expression' -> _alias, NULL -> _marker. protocol_version splits by
-- entity name: PROTOCOL_VERSION (exact) stays; PROTOCOL_VERSION_* (suffixed)
-- becomes protocol_extension_id.
INSERT INTO protocol_message_versions_v16 (
  entity_id, version, kind, value, value_kind,
  source_file, source_line, trailing_comment,
  raw_ast_hash, source_root, extracted_at
)
SELECT
  pmv.entity_id,
  pmv.version,
  CASE pmv.kind
    WHEN 'svc' THEN 'svc'
    WHEN 'clc' THEN 'clc'
    WHEN 'nq'  THEN 'nq'
    WHEN 'pext_fte' THEN
      CASE pmv.value_kind
        WHEN 'bitshift'   THEN 'pext_fte_bit'
        WHEN 'integer'    THEN 'pext_fte_const'
        WHEN 'hex'        THEN 'pext_fte_const'
        WHEN 'expression' THEN 'pext_fte_alias'
        ELSE                   'pext_fte_marker'
      END
    WHEN 'pext_mvd' THEN
      CASE pmv.value_kind
        WHEN 'bitshift'   THEN 'pext_mvd_bit'
        WHEN 'integer'    THEN 'pext_mvd_const'
        WHEN 'hex'        THEN 'pext_mvd_const'
        WHEN 'expression' THEN 'pext_mvd_alias'
        ELSE                   'pext_mvd_marker'
      END
    WHEN 'protocol_version' THEN
      CASE
        WHEN (SELECT name FROM entities WHERE id = pmv.entity_id) = 'PROTOCOL_VERSION'
          THEN 'protocol_version'
        ELSE 'protocol_extension_id'
      END
    -- Pass through any already-widened values (covers re-runs and
    -- already-v16-shaped rows that happen to be present).
    ELSE pmv.kind
  END AS kind,
  pmv.value, pmv.value_kind,
  pmv.source_file, pmv.source_line, pmv.trailing_comment,
  pmv.raw_ast_hash, pmv.source_root, pmv.extracted_at
FROM protocol_message_versions pmv;
DROP TABLE protocol_message_versions;
ALTER TABLE protocol_message_versions_v16 RENAME TO protocol_message_versions;
CREATE INDEX idx_protocol_message_versions_source ON protocol_message_versions(source_file, source_line);
`;

// v16 -> v17 (Phase D Task 10, 2026-04-28).
// Adds `all_call_sites_json` to log_template_versions so high-fanout templates
// retain every call site instead of just the first. Pure-additive ALTER TABLE
// (nullable TEXT, no CHECK, no DEFAULT); pre-existing rows store NULL and the
// next extract-tag re-upserts with the full JSON array. Schema parity with
// info_key_versions.call_sites_json.
function migrateV16ToV17(db: Database.Database): void {
  const txn = db.transaction(() => {
    db.exec(`ALTER TABLE log_template_versions ADD COLUMN all_call_sites_json TEXT;`);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('17');
  });
  txn();
}

// v17 -> v18 (Phase 2 task 2.4, 2026-04-28).
// qc_builtin canonical name backfill: rewrite mvdsv qc_builtin entity names
// from `<bare>` to `<bare>:<table_name>` to mirror info_key Phase B's
// `:<scope>` shape. The audit (D.1.10) predicted this would recover 4
// previously-collided "cross-scope" entities; on closer inspection those
// 4 (cvar_string / precache_model / precache_sound / precache_file) are
// intra-table multi-index registrations, not cross-table. The :<table>
// suffix alone doesn't disambiguate them; recovering them needs handler-side
// aggregation (deferred to HANDOVER). The structural change still stands as
// alignment with info_key. The next extract-tag re-upserts the existing 93
// entities under their suffixed names. The WHERE NOT LIKE '%:%' guard makes
// this idempotent.
function migrateV17ToV18(db: Database.Database): void {
  const txn = db.transaction(() => {
    db.exec(`
      UPDATE entities
         SET name = name || ':' || (
           SELECT table_name FROM qc_builtin_versions
            WHERE entity_id = entities.id LIMIT 1
         )
       WHERE project='mvdsv' AND type='qc_builtin' AND name NOT LIKE '%:%';
    `);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('18');
  });
  txn();
}

function migrateV15ToV16(db: Database.Database): void {
  // CHECK widening on protocol_message_versions requires foreign_keys OFF
  // outside the txn (same FK-safety pattern as ASSET_LOADER_SITES_V8 and
  // the entities-table rebuilds).
  //
  // The Phase B info_key UPDATE is data-only and txn-safe; the WHERE
  // NOT LIKE '%:%' guard skips rows already migrated, so re-running this
  // migration on an already-migrated DB is a no-op.
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`DROP INDEX IF EXISTS idx_protocol_message_versions_source;`);
      db.exec(PROTOCOL_MESSAGE_KIND_V16_MIGRATION_SQL);

      // Phase B backfill: rewrite info_key entity names to the suffixed
      // `<bare>:<scope>` form. The WHERE NOT LIKE '%:%' guard skips rows
      // already migrated, so this is idempotent. The subselect picks
      // exactly one scope per entity_id (`LIMIT 1`); for v15 rows there's
      // one info_key_versions row per entity (single-version 'head' load),
      // so that's deterministic.
      db.exec(`
        UPDATE entities
           SET name = name || ':' || (
             SELECT scope FROM info_key_versions
              WHERE entity_id = entities.id LIMIT 1
           )
         WHERE project='mvdsv' AND type='info_key' AND name NOT LIKE '%:%';
      `);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('16');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function migrateV9ToV10(db: Database.Database): void {
  // Widens the project CHECK on 8 tables to admit 'qwcl'. Standard rebuild
  // pattern; foreign_keys OFF outside the txn so the entities-table drop is
  // allowed (entities is FK-targeted by every per-type version table plus
  // source_state_transitions, change_events, source_overrides). Indexes are
  // dropped before the rebuilds because the SQL block recreates each one.
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_versions_ordinal;
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
        DROP INDEX IF EXISTS idx_asset_ext_cat;
        DROP INDEX IF EXISTS idx_asset_ext_verif;
        DROP INDEX IF EXISTS idx_asset_cvar_bind_cvar;
        DROP INDEX IF EXISTS idx_asset_cvar_bind_cat;
        DROP INDEX IF EXISTS idx_asset_loader_category;
        DROP INDEX IF EXISTS idx_asset_loader_cvar;
        DROP INDEX IF EXISTS idx_asset_loader_fn;
        DROP INDEX IF EXISTS idx_release_notes_version;
        DROP INDEX IF EXISTS idx_relation_changes_to_version;
        DROP INDEX IF EXISTS idx_relation_changes_table;
      `);
      db.exec(PROJECT_CHECK_V10_MIGRATION_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('10');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function migrateV10ToV11(db: Database.Database): void {
  // Pure-additive ALTER TABLE: nullable TEXT columns with no DEFAULT or CHECK
  // do not require foreign_keys OFF or a table rebuild. Plain txn is enough.
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V11_MIGRATION_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('11');
  });
  txn();
}

function migrateV11ToV12(db: Database.Database): void {
  // Like v1->v2 / v2->v3 / v4->v5, the entities-table CHECK widening requires
  // foreign_keys OFF outside the transaction so the entities DROP can succeed
  // (every per-type version table FK-references entities.id).
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
      `);
      db.exec(ENTITIES_V12_MIGRATION_SQL);
      db.exec(SCHEMA_V12_ADDITIONS_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('12');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function migrateV12ToV13(db: Database.Database): void {
  // Pure-additive: one new table, no CHECK changes, no FK touches.
  // Follows the v10->v11 pattern (plain transaction, no foreign_keys OFF).
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V13_ADDITIONS_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('13');
  });
  txn();
}

function migrateV13ToV14(db: Database.Database): void {
  // Pure-additive: three new flat tables. No FKs into pre-v14 tables, no
  // rebuilds, no foreign_keys toggle needed. SCHEMA_V14_ADDITIONS_SQL is
  // also executed unconditionally at the end of applySchema (idempotent
  // CREATE IF NOT EXISTS), so the migration itself only stamps the version.
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V14_ADDITIONS_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('14');
  });
  txn();
}

function migrateV14ToV15(db: Database.Database): void {
  // Like v11->v12, the entities-table CHECK widening requires foreign_keys
  // OFF outside the transaction so the entities DROP can succeed (every
  // per-type version table FK-references entities.id).
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
      `);
      db.exec(ENTITIES_V15_MIGRATION_SQL);
      db.exec(SCHEMA_V15_ADDITIONS_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('15');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

export function applySchema(db: Database.Database): void {
  // Always (idempotently) ensure v1 tables exist; they don't change between
  // v1 and v2 except for the entities CHECK constraint.
  db.exec(SCHEMA_V1_SQL);

  const existing = db
    .prepare(`SELECT value FROM schema_meta WHERE key = 'schema_version'`)
    .get() as { value: string } | undefined;

  if (!existing) {
    // Fresh DB: stamp the current version.
    db.prepare(
      `INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?)`
    ).run(String(SCHEMA_VERSION));
  } else {
    let existingVersion = Number(existing.value);
    if (existingVersion === 1) {
      migrateV1ToV2(db);
      existingVersion = 2;
    }
    if (existingVersion === 2 && SCHEMA_VERSION >= 3) {
      migrateV2ToV3(db);
      existingVersion = 3;
    }
    if (existingVersion === 3 && SCHEMA_VERSION >= 4) {
      migrateV3ToV4(db);
      existingVersion = 4;
    }
    if (existingVersion === 4 && SCHEMA_VERSION >= 5) {
      migrateV4ToV5(db);
      existingVersion = 5;
    }
    if (existingVersion === 5 && SCHEMA_VERSION >= 6) {
      migrateV5ToV6(db);
      existingVersion = 6;
    }
    if (existingVersion === 6 && SCHEMA_VERSION >= 7) {
      migrateV6ToV7(db);
      existingVersion = 7;
    }
    if (existingVersion === 7 && SCHEMA_VERSION >= 8) {
      migrateV7ToV8(db);
      existingVersion = 8;
    }
    if (existingVersion === 8 && SCHEMA_VERSION >= 9) {
      migrateV8ToV9(db);
      existingVersion = 9;
    }
    if (existingVersion === 9 && SCHEMA_VERSION >= 10) {
      migrateV9ToV10(db);
      existingVersion = 10;
    }
    if (existingVersion === 10 && SCHEMA_VERSION >= 11) {
      migrateV10ToV11(db);
      existingVersion = 11;
    }
    if (existingVersion === 11 && SCHEMA_VERSION >= 12) {
      migrateV11ToV12(db);
      existingVersion = 12;
    }
    if (existingVersion === 12 && SCHEMA_VERSION >= 13) {
      migrateV12ToV13(db);
      existingVersion = 13;
    }
    if (existingVersion === 13 && SCHEMA_VERSION >= 14) {
      migrateV13ToV14(db);
      existingVersion = 14;
    }
    if (existingVersion === 14 && SCHEMA_VERSION >= 15) {
      migrateV14ToV15(db);
      existingVersion = 15;
    }
    if (existingVersion === 15 && SCHEMA_VERSION >= 16) {
      migrateV15ToV16(db);
      existingVersion = 16;
    }
    if (existingVersion === 16 && SCHEMA_VERSION >= 17) {
      migrateV16ToV17(db);
      existingVersion = 17;
    }
    if (existingVersion === 17 && SCHEMA_VERSION >= 18) {
      migrateV17ToV18(db);
      existingVersion = 18;
    }
    if (existingVersion !== SCHEMA_VERSION) {
      throw new Error(
        `schema_meta.schema_version=${existing.value}; loader expects ${SCHEMA_VERSION}. Add a migration.`
      );
    }
  }

  // v2 / v3 / v4 / v5 / v6 / v12 / v13 / v14 / v15 additions are idempotent
  // CREATE IF NOT EXISTS -- safe on fresh DBs (where v1 SQL didn't have them)
  // and on migrated DBs.
  db.exec(SCHEMA_V2_ADDITIONS_SQL);
  db.exec(SCHEMA_V3_ADDITIONS_SQL);
  db.exec(SCHEMA_V4_ADDITIONS_SQL);
  db.exec(SCHEMA_V5_ADDITIONS_SQL);
  db.exec(SCHEMA_V6_ADDITIONS_SQL);
  db.exec(SCHEMA_V12_ADDITIONS_SQL);
  db.exec(SCHEMA_V13_ADDITIONS_SQL);
  db.exec(SCHEMA_V14_ADDITIONS_SQL);
  db.exec(SCHEMA_V15_ADDITIONS_SQL);
}
