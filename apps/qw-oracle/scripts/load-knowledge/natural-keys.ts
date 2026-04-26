// apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
//
// Idempotent upsert helpers. Natural keys per spec:
//   versions           (project, version)
//   entities           (project, type, name)
//   cvar_versions      (entity_id, version)

import type Database from 'better-sqlite3';
import type {
  AssetCategoryVersionRow,
  AssetCvarBindingRow,
  AssetExtensionRow,
  AssetLoaderSiteRow,
  AssetPathRuleRow,
  CmdlineParamVersionRow,
  CommandVersionRow,
  CvarAliasVersionRow,
  CvarVersionRow,
  EntityType,
  FlagBitVersionRow,
  HudElementVersionRow,
  KeynameVersionRow,
  MacroVersionRow,
  Project,
  RelationChangeRow,
  ReleaseNoteRow,
  RulesetVersionRow,
  SourceOverrideRow,
  SourceState,
  TokenPrimitiveVersionRow,
  VersionRow,
} from './types.js';

export function canonicalIdFor(project: Project, type: EntityType, name: string): string {
  // Token primitives are case-sensitive ($B blue LED vs $b glyph).
  const canonical = type === 'token_primitive' ? name : name.toLowerCase();
  return `${project}:${type}:${canonical}`;
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
  // Token primitives are case-sensitive ($G green LED vs $g would be distinct
  // entities if both existed). All other types canonicalise to lowercase so
  // ezQuake's case-insensitive cvar/command/keyname matching collapses
  // aliases.
  const canonicalName =
    input.type === 'token_primitive' ? input.name : input.name.toLowerCase();
  const canonical = canonicalIdFor(input.project, input.type, canonicalName);
  const now = new Date().toISOString();

  const existing = db
    .prepare(`SELECT id, source_state, first_seen_version, last_seen_version FROM entities
              WHERE project = ? AND type = ? AND name = ?`)
    .get(input.project, input.type, canonicalName) as
      | { id: number; source_state: SourceState; first_seen_version: string; last_seen_version: string }
      | undefined;

  if (existing) {
    // last_seen advances forward only -- compare by ordinal so re-loads of an
    // older tag don't overwrite a newer last_seen. Mirrors the first_seen
    // ordinal check in load-version.ts.
    const ordCheck = db
      .prepare(`
        SELECT vCur.ordinal AS cur_ord, vNew.ordinal AS new_ord
        FROM versions vCur, versions vNew
        WHERE vCur.project = ? AND vCur.version = ?
          AND vNew.project = ? AND vNew.version = ?
      `)
      .get(
        input.project,
        existing.last_seen_version,
        input.project,
        input.last_seen_version,
      ) as { cur_ord: number; new_ord: number } | undefined;

    if (ordCheck && ordCheck.new_ord > ordCheck.cur_ord) {
      db.prepare(`UPDATE entities SET last_seen_version = ?, updated_at = ? WHERE id = ?`)
        .run(input.last_seen_version, now, existing.id);
    } else {
      db.prepare(`UPDATE entities SET updated_at = ? WHERE id = ?`).run(now, existing.id);
    }
    return { id: existing.id, isNew: false, prevSourceState: existing.source_state };
  }

  const insertResult = db.prepare(`
    INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, source_state, predecessor_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    RETURNING id
  `).get(
    input.project,
    input.type,
    canonicalName,
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
      trailing_comment, server_only, source_root, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @help_remarks, @help_values, @help_group_id, @help_type,
      @default_value, @flags_raw, @flag_names, @on_change, @min_bound, @max_bound,
      @source_file, @source_line, @source_column, @storage_class, @group_name_in_source,
      @trailing_comment, @server_only, @source_root, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertCommandVersion(db: Database.Database, row: CommandVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO command_versions (
      entity_id, version,
      help_desc, help_remarks, help_group_id,
      handler_fn, source_file, source_line, source_column,
      registration_file, source_root, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @help_remarks, @help_group_id,
      @handler_fn, @source_file, @source_line, @source_column,
      @registration_file, @source_root, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertMacroVersion(db: Database.Database, row: MacroVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO macro_versions (
      entity_id, version,
      help_desc, macro_type, teamplay_restricted, related_cvars_json,
      handler_fn, source_file, source_line, source_column,
      registration_file, source_root, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @macro_type, @teamplay_restricted, @related_cvars_json,
      @handler_fn, @source_file, @source_line, @source_column,
      @registration_file, @source_root, @raw_ast_hash, @extracted_at
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

export function upsertKeynameVersion(db: Database.Database, row: KeynameVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO keyname_versions (
      entity_id, version, key_code, key_code_ident,
      source_file, source_line, source_column, build_variant,
      raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version, @key_code, @key_code_ident,
      @source_file, @source_line, @source_column, @build_variant,
      @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertHudElementVersion(db: Database.Database, row: HudElementVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO hud_element_versions (
      entity_id, version, help_desc, hud_alias,
      flags_raw, min_state_raw, draw_order_raw, draw_fn,
      enclosing_function, source_file, source_line, source_column,
      owned_cvars_json, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version, @help_desc, @hud_alias,
      @flags_raw, @min_state_raw, @draw_order_raw, @draw_fn,
      @enclosing_function, @source_file, @source_line, @source_column,
      @owned_cvars_json, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertRulesetVersion(db: Database.Database, row: RulesetVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO ruleset_versions (
      entity_id, version, enum_ident, loader_fn, maxfps,
      restrict_triggers, restrict_packet, restrict_particles, restrict_play,
      restrict_logging, restrict_rollangle, restrict_ipc, restrict_exec,
      restrict_setcalc, restrict_seteval, restrict_setex,
      locked_cvars_json, source_file, source_line, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version, @enum_ident, @loader_fn, @maxfps,
      @restrict_triggers, @restrict_packet, @restrict_particles, @restrict_play,
      @restrict_logging, @restrict_rollangle, @restrict_ipc, @restrict_exec,
      @restrict_setcalc, @restrict_seteval, @restrict_setex,
      @locked_cvars_json, @source_file, @source_line, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertTokenPrimitiveVersion(db: Database.Database, row: TokenPrimitiveVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO token_primitive_versions (
      entity_id, version, form, suffix_char, byte_value,
      category, case_style, source_file, source_line,
      raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version, @form, @suffix_char, @byte_value,
      @category, @case_style, @source_file, @source_line,
      @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

// --- Phase 2c.6 asset consumption upserts -----------------------------------

export function upsertAssetCategoryVersion(db: Database.Database, row: AssetCategoryVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO asset_category_versions (
      entity_id, version, display_name, description, notes,
      raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version, @display_name, @description, @notes,
      @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

// The four relation-row upserts use natural keys given by the table's UNIQUE
// constraint. INSERT OR REPLACE is safe because no other tables FK-reference
// these tables by row id.

export function upsertAssetExtension(db: Database.Database, row: AssetExtensionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO asset_extensions (
      project, version, extension, path_hint, category_id,
      notes, verification_status, verification_reason, raw_ast_hash, extracted_at
    ) VALUES (
      @project, @version, @extension, @path_hint, @category_id,
      @notes, @verification_status, @verification_reason, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertAssetPathRule(db: Database.Database, row: AssetPathRuleRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO asset_path_rules (
      project, version, canonical_id, rule_kind, ordinal, description,
      source_ref, source_verified, notes, raw_ast_hash, extracted_at
    ) VALUES (
      @project, @version, @canonical_id, @rule_kind, @ordinal, @description,
      @source_ref, @source_verified, @notes, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertAssetCvarBinding(db: Database.Database, row: AssetCvarBindingRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO asset_cvar_bindings (
      project, version, cvar_canonical_id, category_id, path_pattern,
      load_trigger, confidence, source_ref, notes, raw_ast_hash, extracted_at
    ) VALUES (
      @project, @version, @cvar_canonical_id, @category_id, @path_pattern,
      @load_trigger, @confidence, @source_ref, @notes, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertReleaseNote(db: Database.Database, row: ReleaseNoteRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO release_notes (
      project, version, section, ordinal, body_md,
      referenced_entity_ids_json, commit_urls_json, pr_numbers_json,
      author_handles_json, raw_body_hash, extracted_at
    ) VALUES (
      @project, @version, @section, @ordinal, @body_md,
      @referenced_entity_ids_json, @commit_urls_json, @pr_numbers_json,
      @author_handles_json, @raw_body_hash, @extracted_at
    )
  `).run(row);
}

export function upsertAssetLoaderSite(db: Database.Database, row: AssetLoaderSiteRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO asset_loader_sites (
      project, version, canonical_id, function_name,
      source_file, source_line, source_column, enclosing_function,
      reads_category_id, load_trigger, path_source, path_literal, path_cvar_id,
      confidence, dev_only, notes, raw_ast_hash, extracted_at
    ) VALUES (
      @project, @version, @canonical_id, @function_name,
      @source_file, @source_line, @source_column, @enclosing_function,
      @reads_category_id, @load_trigger, @path_source, @path_literal, @path_cvar_id,
      @confidence, @dev_only, @notes, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertCvarAliasVersion(db: Database.Database, row: CvarAliasVersionRow): void {
  // Best-effort target_canonical_id resolution: if target entity exists in the
  // DB, link the FK; otherwise leave NULL (per spec § Field semantics). A
  // separate resolver pass can re-link rows when target projects later load.
  // Token primitives are case-sensitive everywhere; cvar aliases are not, so
  // lowercase the lookup name to match the canonical-id pattern.
  let resolved: string | null = row.target_canonical_id ?? null;
  if (resolved == null) {
    const targetIsEntity = row.target_kind === 'cvar'
      || row.target_kind === 'command'
      || row.target_kind === 'macro';
    if (targetIsEntity) {
      const lookupName = row.target_name.toLowerCase();
      const hit = db.prepare(`
        SELECT canonical_id FROM entities
        WHERE project = ? AND type = ? AND name = ?
      `).get(row.target_project, row.target_kind, lookupName) as
        | { canonical_id: string }
        | undefined;
      if (hit) resolved = hit.canonical_id;
    }
  }
  db.prepare(`
    INSERT OR REPLACE INTO cvar_alias_versions (
      entity_id, version,
      target_project, target_kind, target_name, target_canonical_id,
      mimics_project,
      value_transform, value_transform_params_json,
      default_drift_status, semantic_confidence,
      verified_target_version, verified_mimics_version,
      freshness_state,
      source_file, source_line, source_column, source_root,
      raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @target_project, @target_kind, @target_name, @target_canonical_id,
      @mimics_project,
      @value_transform, @value_transform_params_json,
      @default_drift_status, @semantic_confidence,
      @verified_target_version, @verified_mimics_version,
      @freshness_state,
      @source_file, @source_line, @source_column, @source_root,
      @raw_ast_hash, @extracted_at
    )
  `).run({ ...row, target_canonical_id: resolved });
}

export function upsertFlagBitVersion(db: Database.Database, row: FlagBitVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO flag_bit_versions (
      entity_id, version, bitmask_family, value_raw, value_numeric,
      source_file, source_line, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version, @bitmask_family, @value_raw, @value_numeric,
      @source_file, @source_line, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}

export function upsertRelationChange(db: Database.Database, row: RelationChangeRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO relation_changes (
      relation_table, project, from_version, to_version, change_kind,
      row_key_json, field_name, old_value, new_value,
      commit_sha, commit_message_excerpt, extracted_at
    ) VALUES (
      @relation_table, @project, @from_version, @to_version, @change_kind,
      @row_key_json, @field_name, @old_value, @new_value,
      @commit_sha, @commit_message_excerpt, @extracted_at
    )
  `).run(row);
}

export function upsertSourceOverride(db: Database.Database, row: SourceOverrideRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO source_overrides (
      entity_id, version, field_name, source_file, source_line,
      source_column, override_kind, extracted_at
    ) VALUES (
      @entity_id, @version, @field_name, @source_file, @source_line,
      @source_column, @override_kind, @extracted_at
    )
  `).run(row);
}
