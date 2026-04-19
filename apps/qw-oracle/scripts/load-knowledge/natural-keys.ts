// apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
//
// Idempotent upsert helpers. Natural keys per spec:
//   versions           (project, version)
//   entities           (project, type, name)
//   cvar_versions      (entity_id, version)

import type Database from 'better-sqlite3';
import type {
  CmdlineParamVersionRow,
  CommandVersionRow,
  CvarVersionRow,
  EntityType,
  MacroVersionRow,
  Project,
  SourceState,
  VersionRow,
} from './types.js';

export function canonicalIdFor(project: Project, type: EntityType, name: string): string {
  return `${project}:${type}:${name.toLowerCase()}`;
}

// `extracted_at` semantics: most-recent extraction timestamp for this (project, version).
// Overwritten on every re-run. If you need first-extraction time, check git history of
// knowledge.db.
export function upsertVersion(
  db: Database.Database,
  row: VersionRow,
): { id: number } {
  const stmt = db.prepare(`
    INSERT INTO versions (project, version, commit_sha, tag_date, ordinal, parse_state, notes, extracted_at)
    VALUES (@project, @version, @commit_sha, @tag_date, @ordinal, @parse_state, @notes, @extracted_at)
    ON CONFLICT(project, version) DO UPDATE SET
      commit_sha = excluded.commit_sha,
      tag_date = excluded.tag_date,
      ordinal = excluded.ordinal,
      parse_state = excluded.parse_state,
      notes = excluded.notes,
      extracted_at = excluded.extracted_at
    RETURNING id
  `);
  const result = stmt.get(row) as { id: number };
  return result;
}

export interface UpsertEntityInput {
  project: Project;
  type: EntityType;
  name: string;
  first_seen_version: string;
  last_seen_version: string;
  source_state: SourceState;
}

export interface UpsertEntityResult {
  id: number;
  isNew: boolean;
  prevSourceState: SourceState | null;
}

export function upsertEntity(
  db: Database.Database,
  input: UpsertEntityInput,
): UpsertEntityResult {
  const lowercaseName = input.name.toLowerCase();
  const canonical = canonicalIdFor(input.project, input.type, lowercaseName);
  const now = new Date().toISOString();

  const existing = db
    .prepare(`SELECT id, source_state, first_seen_version, last_seen_version FROM entities
              WHERE project = ? AND type = ? AND name = ?`)
    .get(input.project, input.type, lowercaseName) as
      | { id: number; source_state: SourceState; first_seen_version: string; last_seen_version: string }
      | undefined;

  if (existing) {
    db.prepare(`
      UPDATE entities
      SET last_seen_version = ?,
          updated_at = ?
      WHERE id = ?
    `).run(input.last_seen_version, now, existing.id);
    return { id: existing.id, isNew: false, prevSourceState: existing.source_state };
  }

  const insertResult = db.prepare(`
    INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, source_state, predecessor_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    RETURNING id
  `).get(
    input.project,
    input.type,
    lowercaseName,
    canonical,
    input.first_seen_version,
    input.last_seen_version,
    input.source_state,
    now,
    now,
  ) as { id: number };

  return { id: insertResult.id, isNew: true, prevSourceState: null };
}

export function setEntitySourceState(
  db: Database.Database,
  entityId: number,
  newState: SourceState,
): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE entities SET source_state = ?, updated_at = ? WHERE id = ?`).run(newState, now, entityId);
}

export function extendFirstSeenVersion(
  db: Database.Database,
  entityId: number,
  earlierVersion: string,
): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE entities SET first_seen_version = ?, updated_at = ? WHERE id = ?`).run(earlierVersion, now, entityId);
}

export function upsertCvarVersion(db: Database.Database, row: CvarVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO cvar_versions (
      entity_id, version,
      help_desc, help_remarks, help_values, help_group_id, help_type,
      default_value, flags_raw, flag_names, on_change, min_bound, max_bound,
      source_file, source_line, source_column, storage_class, group_name_in_source,
      trailing_comment, server_only, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @help_remarks, @help_values, @help_group_id, @help_type,
      @default_value, @flags_raw, @flag_names, @on_change, @min_bound, @max_bound,
      @source_file, @source_line, @source_column, @storage_class, @group_name_in_source,
      @trailing_comment, @server_only, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertCommandVersion(db: Database.Database, row: CommandVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO command_versions (
      entity_id, version,
      help_desc, help_remarks, help_group_id,
      handler_fn, source_file, source_line, source_column,
      registration_file, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @help_remarks, @help_group_id,
      @handler_fn, @source_file, @source_line, @source_column,
      @registration_file, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertMacroVersion(db: Database.Database, row: MacroVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO macro_versions (
      entity_id, version,
      help_desc, macro_type, teamplay_restricted, related_cvars_json,
      handler_fn, source_file, source_line, source_column,
      registration_file, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @macro_type, @teamplay_restricted, @related_cvars_json,
      @handler_fn, @source_file, @source_line, @source_column,
      @registration_file, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertCmdlineParamVersion(db: Database.Database, row: CmdlineParamVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO cmdline_param_versions (
      entity_id, version,
      help_desc, help_remarks, arguments, flags_json, systems_json,
      source_file, source_line, source_column, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @help_remarks, @arguments, @flags_json, @systems_json,
      @source_file, @source_line, @source_column, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}
