// apps/qw-oracle/scripts/load-knowledge/schema.ts
//
// v1 schema for the QW Knowledge Service Layer 1 store.
// Mirrors docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md.

import type Database from 'better-sqlite3';

export const SCHEMA_VERSION = 2;

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
    const existingVersion = Number(existing.value);
    if (existingVersion === 1 && SCHEMA_VERSION === 2) {
      migrateV1ToV2(db);
    } else if (existingVersion !== SCHEMA_VERSION) {
      throw new Error(
        `schema_meta.schema_version=${existing.value}; loader expects ${SCHEMA_VERSION}. Add a migration.`
      );
    }
  }

  // v2 additions are idempotent CREATE IF NOT EXISTS -- safe to run on fresh
  // DBs (where v1 SQL didn't have them) and on migrated DBs.
  db.exec(SCHEMA_V2_ADDITIONS_SQL);
}
