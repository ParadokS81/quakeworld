// apps/qw-oracle/scripts/load-knowledge/schema.ts
//
// v1 schema for the QW Knowledge Service Layer 1 store.
// Mirrors docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md.

import type Database from 'better-sqlite3';

export const SCHEMA_VERSION = 5;

const SCHEMA_V1_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS versions (
  id             INTEGER PRIMARY KEY,
  project        TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
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

CREATE TABLE IF NOT EXISTS entities (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  type                  TEXT NOT NULL CHECK (type IN ('cvar','command','macro','cmdline_param')),
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
  id               INTEGER PRIMARY KEY,
  project          TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version          TEXT NOT NULL,
  extension        TEXT NOT NULL,
  path_hint        TEXT,
  category_id      TEXT NOT NULL REFERENCES entities(canonical_id),
  notes            TEXT,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  UNIQUE (project, version, extension, path_hint)
);
CREATE INDEX IF NOT EXISTS idx_asset_ext_cat ON asset_extensions(category_id);

CREATE TABLE IF NOT EXISTS asset_path_rules (
  id               INTEGER PRIMARY KEY,
  project          TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
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
  project            TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
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
  confidence         TEXT NOT NULL CHECK (confidence IN ('certain','heuristic','unclassified')),
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
  project                     TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
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
  project                  TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
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
    if (existingVersion !== SCHEMA_VERSION) {
      throw new Error(
        `schema_meta.schema_version=${existing.value}; loader expects ${SCHEMA_VERSION}. Add a migration.`
      );
    }
  }

  // v2 / v3 / v4 / v5 additions are idempotent CREATE IF NOT EXISTS -- safe
  // on fresh DBs (where v1 SQL didn't have them) and on migrated DBs.
  db.exec(SCHEMA_V2_ADDITIONS_SQL);
  db.exec(SCHEMA_V3_ADDITIONS_SQL);
  db.exec(SCHEMA_V4_ADDITIONS_SQL);
  db.exec(SCHEMA_V5_ADDITIONS_SQL);
}
