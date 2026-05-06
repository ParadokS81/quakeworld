// apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
//
// Idempotent upsert helpers for Layer 1. Each helper takes a postgres-js Sql
// handle (`tx`) - typically a transaction handle yielded by sql.begin() in
// load-version.ts. The natural-key uniqueness contract per spec:
//   versions           (project, version)
//   entities           (project, type, name)
//   <type>_versions    (entity_id, version)
// Asset relation tables key on the table-level UNIQUE constraint.
//
// Boolean coercion: SQLite stored these columns as INTEGER (0/1); the
// Postgres schema (Phase 2 generator) widens them to BOOLEAN. The adapters
// in load-*.ts still pass 0/1 ints; the helpers below coerce at the upsert
// boundary so the adapter port (Task 9) is independent of this file's port.
//
// JSON columns: the SQLite-era loaders pre-stringified JSON into TEXT
// columns. The new JSONB columns accept either a JS value (postgres-js
// auto-encodes) or a string that PG implicitly casts. The adapter port
// will eventually drop the JSON.stringify calls; until then the implicit
// cast keeps things working.

import type postgres from 'postgres';
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
  InfoKeyVersionRow,
  KeynameVersionRow,
  LogTemplateVersionRow,
  MacroVersionRow,
  MatchEventVersionRow,
  Project,
  ProtocolMessageVersionRow,
  QcBuiltinVersionRow,
  RelationChangeRow,
  ReleaseNoteRow,
  RulesetVersionRow,
  SourceOverrideRow,
  SourceState,
  TokenPrimitiveVersionRow,
  VersionRow,
} from './types.js';

// Convenience: 0/1/true/false/null -> true/false. Passes through actual JS
// booleans untouched.
function asBool(v: unknown): boolean {
  return v ? true : false;
}

// Nullable variant: null/undefined survive; everything else coerces.
function asBoolOrNull(v: unknown): boolean | null {
  return v == null ? null : asBool(v);
}

export function canonicalIdFor(project: Project, type: EntityType, name: string): string {
  // Token primitives are case-sensitive ($B blue LED vs $b glyph).
  const canonical = type === 'token_primitive' ? name : name.toLowerCase();
  return `${project}:${type}:${canonical}`;
}

// `extracted_at` semantics: most-recent extraction timestamp for this (project, version).
// Overwritten on every re-run.
export async function upsertVersion(
  tx: postgres.TransactionSql<{}>,
  row: VersionRow,
): Promise<{ id: number }> {
  const rows = await tx<{ id: number }[]>`
    INSERT INTO versions (project, version, commit_sha, tag_date, ordinal, parse_state, notes, extracted_at)
    VALUES (${row.project}, ${row.version}, ${row.commit_sha}, ${row.tag_date}, ${row.ordinal}, ${row.parse_state}, ${row.notes}, ${row.extracted_at})
    ON CONFLICT (project, version) DO UPDATE SET
      commit_sha   = EXCLUDED.commit_sha,
      tag_date     = EXCLUDED.tag_date,
      ordinal      = EXCLUDED.ordinal,
      parse_state  = EXCLUDED.parse_state,
      notes        = EXCLUDED.notes,
      extracted_at = EXCLUDED.extracted_at
    RETURNING id
  `;
  return { id: Number(rows[0]!.id) };
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

export async function upsertEntity(
  tx: postgres.TransactionSql<{}>,
  input: UpsertEntityInput,
): Promise<UpsertEntityResult> {
  // Token primitives are case-sensitive; everything else canonicalises to
  // lowercase so ezQuake's case-insensitive cvar/command/keyname matching
  // collapses aliases.
  const canonicalName =
    input.type === 'token_primitive' ? input.name : input.name.toLowerCase();
  const canonical = canonicalIdFor(input.project, input.type, canonicalName);
  const now = new Date().toISOString();

  const existing = await tx<Array<{ id: number; source_state: SourceState; first_seen_version: string; last_seen_version: string }>>`
    SELECT id, source_state, first_seen_version, last_seen_version
    FROM entities
    WHERE project = ${input.project} AND type = ${input.type} AND name = ${canonicalName}
  `;

  if (existing.length > 0) {
    const e = existing[0]!;
    // last_seen advances forward only -- compare by ordinal so re-loads of an
    // older tag don't overwrite a newer last_seen. Mirrors the first_seen
    // ordinal check in load-version.ts.
    const ordCheck = await tx<Array<{ cur_ord: number; new_ord: number }>>`
      SELECT vCur.ordinal AS cur_ord, vNew.ordinal AS new_ord
      FROM versions vCur, versions vNew
      WHERE vCur.project = ${input.project} AND vCur.version = ${e.last_seen_version}
        AND vNew.project = ${input.project} AND vNew.version = ${input.last_seen_version}
    `;

    if (ordCheck.length > 0 && ordCheck[0]!.new_ord > ordCheck[0]!.cur_ord) {
      await tx`UPDATE entities SET last_seen_version = ${input.last_seen_version}, updated_at = ${now} WHERE id = ${e.id}`;
    } else {
      await tx`UPDATE entities SET updated_at = ${now} WHERE id = ${e.id}`;
    }
    return { id: Number(e.id), isNew: false, prevSourceState: e.source_state };
  }

  const inserted = await tx<{ id: number }[]>`
    INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, source_state, predecessor_id, created_at, updated_at)
    VALUES (${input.project}, ${input.type}, ${canonicalName}, ${canonical}, ${input.first_seen_version}, ${input.last_seen_version}, ${input.source_state}, ${null}, ${now}, ${now})
    RETURNING id
  `;
  return { id: Number(inserted[0]!.id), isNew: true, prevSourceState: null };
}

export async function setEntitySourceState(
  tx: postgres.TransactionSql<{}>,
  entityId: number,
  newState: SourceState,
): Promise<void> {
  const now = new Date().toISOString();
  await tx`UPDATE entities SET source_state = ${newState}, updated_at = ${now} WHERE id = ${entityId}`;
}

export async function extendFirstSeenVersion(
  tx: postgres.TransactionSql<{}>,
  entityId: number,
  earlierVersion: string,
): Promise<void> {
  const now = new Date().toISOString();
  await tx`UPDATE entities SET first_seen_version = ${earlierVersion}, updated_at = ${now} WHERE id = ${entityId}`;
}

// --- per-version row upserts ------------------------------------------------
//
// Each helper uses the (entity_id, version) PK as the conflict target and
// updates every non-key column from EXCLUDED. Equivalent in semantics to the
// SQLite `INSERT OR REPLACE`. Boolean-shaped columns (server_only,
// teamplay_restricted, restrict_*, source_verified, dev_only) coerce 0/1 ints
// to true/false at the upsert boundary.

export async function upsertCvarVersion(tx: postgres.TransactionSql<{}>, row: CvarVersionRow): Promise<void> {
  await tx`
    INSERT INTO cvar_versions (
      entity_id, version,
      help_desc, help_remarks, help_values, help_group_id, help_type,
      default_value, flags_raw, flag_names, on_change, min_bound, max_bound,
      source_file, source_line, source_column, storage_class, group_name_in_source,
      trailing_comment, server_only, source_root, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version},
      ${row.help_desc}, ${row.help_remarks}, ${row.help_values}, ${row.help_group_id}, ${row.help_type},
      ${row.default_value}, ${row.flags_raw}, ${row.flag_names}, ${row.on_change}, ${row.min_bound}, ${row.max_bound},
      ${row.source_file}, ${row.source_line}, ${row.source_column}, ${row.storage_class}, ${row.group_name_in_source},
      ${row.trailing_comment}, ${asBool(row.server_only)}, ${row.source_root}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      help_desc            = EXCLUDED.help_desc,
      help_remarks         = EXCLUDED.help_remarks,
      help_values          = EXCLUDED.help_values,
      help_group_id        = EXCLUDED.help_group_id,
      help_type            = EXCLUDED.help_type,
      default_value        = EXCLUDED.default_value,
      flags_raw            = EXCLUDED.flags_raw,
      flag_names           = EXCLUDED.flag_names,
      on_change            = EXCLUDED.on_change,
      min_bound            = EXCLUDED.min_bound,
      max_bound            = EXCLUDED.max_bound,
      source_file          = EXCLUDED.source_file,
      source_line          = EXCLUDED.source_line,
      source_column        = EXCLUDED.source_column,
      storage_class        = EXCLUDED.storage_class,
      group_name_in_source = EXCLUDED.group_name_in_source,
      trailing_comment     = EXCLUDED.trailing_comment,
      server_only          = EXCLUDED.server_only,
      source_root          = EXCLUDED.source_root,
      raw_ast_hash         = EXCLUDED.raw_ast_hash,
      extracted_at         = EXCLUDED.extracted_at
  `;
}

export async function upsertCommandVersion(tx: postgres.TransactionSql<{}>, row: CommandVersionRow): Promise<void> {
  await tx`
    INSERT INTO command_versions (
      entity_id, version,
      help_desc, help_remarks, help_group_id,
      handler_fn, source_file, source_line, source_column,
      registration_file, source_root, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version},
      ${row.help_desc}, ${row.help_remarks}, ${row.help_group_id},
      ${row.handler_fn}, ${row.source_file}, ${row.source_line}, ${row.source_column},
      ${row.registration_file}, ${row.source_root}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      help_desc         = EXCLUDED.help_desc,
      help_remarks      = EXCLUDED.help_remarks,
      help_group_id     = EXCLUDED.help_group_id,
      handler_fn        = EXCLUDED.handler_fn,
      source_file       = EXCLUDED.source_file,
      source_line       = EXCLUDED.source_line,
      source_column     = EXCLUDED.source_column,
      registration_file = EXCLUDED.registration_file,
      source_root       = EXCLUDED.source_root,
      raw_ast_hash      = EXCLUDED.raw_ast_hash,
      extracted_at      = EXCLUDED.extracted_at
  `;
}

export async function upsertMacroVersion(tx: postgres.TransactionSql<{}>, row: MacroVersionRow): Promise<void> {
  await tx`
    INSERT INTO macro_versions (
      entity_id, version,
      help_desc, macro_type, teamplay_restricted, related_cvars_json,
      handler_fn, source_file, source_line, source_column,
      registration_file, source_root, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version},
      ${row.help_desc}, ${row.macro_type}, ${asBool(row.teamplay_restricted)}, ${tx.json(row.related_cvars_json as never)},
      ${row.handler_fn}, ${row.source_file}, ${row.source_line}, ${row.source_column},
      ${row.registration_file}, ${row.source_root}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      help_desc           = EXCLUDED.help_desc,
      macro_type          = EXCLUDED.macro_type,
      teamplay_restricted = EXCLUDED.teamplay_restricted,
      related_cvars_json  = EXCLUDED.related_cvars_json,
      handler_fn          = EXCLUDED.handler_fn,
      source_file         = EXCLUDED.source_file,
      source_line         = EXCLUDED.source_line,
      source_column       = EXCLUDED.source_column,
      registration_file   = EXCLUDED.registration_file,
      source_root         = EXCLUDED.source_root,
      raw_ast_hash        = EXCLUDED.raw_ast_hash,
      extracted_at        = EXCLUDED.extracted_at
  `;
}

export async function upsertCmdlineParamVersion(tx: postgres.TransactionSql<{}>, row: CmdlineParamVersionRow): Promise<void> {
  await tx`
    INSERT INTO cmdline_param_versions (
      entity_id, version,
      help_desc, help_remarks, arguments, flags_json, systems_json,
      source_file, source_line, source_column, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version},
      ${row.help_desc}, ${row.help_remarks}, ${row.arguments}, ${tx.json(row.flags_json as never)}, ${tx.json(row.systems_json as never)},
      ${row.source_file}, ${row.source_line}, ${row.source_column}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      help_desc      = EXCLUDED.help_desc,
      help_remarks   = EXCLUDED.help_remarks,
      arguments      = EXCLUDED.arguments,
      flags_json     = EXCLUDED.flags_json,
      systems_json   = EXCLUDED.systems_json,
      source_file    = EXCLUDED.source_file,
      source_line    = EXCLUDED.source_line,
      source_column  = EXCLUDED.source_column,
      raw_ast_hash   = EXCLUDED.raw_ast_hash,
      extracted_at   = EXCLUDED.extracted_at
  `;
}

export async function upsertProtocolMessageVersion(tx: postgres.TransactionSql<{}>, row: ProtocolMessageVersionRow): Promise<void> {
  await tx`
    INSERT INTO protocol_message_versions (
      entity_id, version, kind, value, value_kind,
      source_file, source_line, trailing_comment,
      raw_ast_hash, source_root, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.kind}, ${row.value}, ${row.value_kind},
      ${row.source_file}, ${row.source_line}, ${row.trailing_comment},
      ${row.raw_ast_hash}, ${row.source_root}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      kind             = EXCLUDED.kind,
      value            = EXCLUDED.value,
      value_kind       = EXCLUDED.value_kind,
      source_file      = EXCLUDED.source_file,
      source_line      = EXCLUDED.source_line,
      trailing_comment = EXCLUDED.trailing_comment,
      raw_ast_hash     = EXCLUDED.raw_ast_hash,
      source_root      = EXCLUDED.source_root,
      extracted_at     = EXCLUDED.extracted_at
  `;
}

export async function upsertInfoKeyVersion(tx: postgres.TransactionSql<{}>, row: InfoKeyVersionRow): Promise<void> {
  await tx`
    INSERT INTO info_key_versions (
      entity_id, version, scope, operations,
      source_file, source_line, containing_function, call_sites_json,
      raw_ast_hash, source_root, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.scope}, ${row.operations},
      ${row.source_file}, ${row.source_line}, ${row.containing_function}, ${tx.json(row.call_sites_json as never)},
      ${row.raw_ast_hash}, ${row.source_root}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      scope               = EXCLUDED.scope,
      operations          = EXCLUDED.operations,
      source_file         = EXCLUDED.source_file,
      source_line         = EXCLUDED.source_line,
      containing_function = EXCLUDED.containing_function,
      call_sites_json     = EXCLUDED.call_sites_json,
      raw_ast_hash        = EXCLUDED.raw_ast_hash,
      source_root         = EXCLUDED.source_root,
      extracted_at        = EXCLUDED.extracted_at
  `;
}

export async function upsertLogTemplateVersion(tx: postgres.TransactionSql<{}>, row: LogTemplateVersionRow): Promise<void> {
  await tx`
    INSERT INTO log_template_versions (
      entity_id, version, channel, format_string, format_string_normalized,
      source_file, source_line, containing_function, all_call_sites_json,
      raw_ast_hash, source_root, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.channel}, ${row.format_string}, ${row.format_string_normalized},
      ${row.source_file}, ${row.source_line}, ${row.containing_function}, ${tx.json(row.all_call_sites_json as never)},
      ${row.raw_ast_hash}, ${row.source_root}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      channel                  = EXCLUDED.channel,
      format_string            = EXCLUDED.format_string,
      format_string_normalized = EXCLUDED.format_string_normalized,
      source_file              = EXCLUDED.source_file,
      source_line              = EXCLUDED.source_line,
      containing_function      = EXCLUDED.containing_function,
      all_call_sites_json      = EXCLUDED.all_call_sites_json,
      raw_ast_hash             = EXCLUDED.raw_ast_hash,
      source_root              = EXCLUDED.source_root,
      extracted_at             = EXCLUDED.extracted_at
  `;
}

// Idempotent UPSERT for match_event_versions. PK is (entity_id, version).
// Both attributes_json and emission_call_sites_json are JSONB columns bound
// via tx.json(...) per D14 -- never JSON.stringify + TEXT bind. ON CONFLICT
// DO UPDATE makes re-runs no-ops at the row-content level (D15).
export async function upsertMatchEventVersion(tx: postgres.TransactionSql<{}>, row: MatchEventVersionRow): Promise<void> {
  await tx`
    INSERT INTO match_event_versions (
      entity_id, version,
      event_name, complex_type,
      attributes_json,
      xsd_path, xsd_version,
      emission_call_sites_json,
      raw_ast_hash, source_root, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version},
      ${row.event_name}, ${row.complex_type},
      ${tx.json(row.attributes_json as never)},
      ${row.xsd_path}, ${row.xsd_version},
      ${tx.json(row.emission_call_sites_json as never)},
      ${row.raw_ast_hash}, ${row.source_root}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      event_name               = EXCLUDED.event_name,
      complex_type             = EXCLUDED.complex_type,
      attributes_json          = EXCLUDED.attributes_json,
      xsd_path                 = EXCLUDED.xsd_path,
      xsd_version              = EXCLUDED.xsd_version,
      emission_call_sites_json = EXCLUDED.emission_call_sites_json,
      raw_ast_hash             = EXCLUDED.raw_ast_hash,
      source_root              = EXCLUDED.source_root,
      extracted_at             = EXCLUDED.extracted_at
  `;
}

export async function upsertQcBuiltinVersion(tx: postgres.TransactionSql<{}>, row: QcBuiltinVersionRow): Promise<void> {
  await tx`
    INSERT INTO qc_builtin_versions (
      entity_id, version, table_name, builtin_index, handler_fn, qc_signature,
      source_file, source_line, trailing_comment,
      raw_ast_hash, source_root, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.table_name}, ${row.builtin_index}, ${row.handler_fn}, ${row.qc_signature},
      ${row.source_file}, ${row.source_line}, ${row.trailing_comment},
      ${row.raw_ast_hash}, ${row.source_root}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      table_name       = EXCLUDED.table_name,
      builtin_index    = EXCLUDED.builtin_index,
      handler_fn       = EXCLUDED.handler_fn,
      qc_signature     = EXCLUDED.qc_signature,
      source_file      = EXCLUDED.source_file,
      source_line      = EXCLUDED.source_line,
      trailing_comment = EXCLUDED.trailing_comment,
      raw_ast_hash     = EXCLUDED.raw_ast_hash,
      source_root      = EXCLUDED.source_root,
      extracted_at     = EXCLUDED.extracted_at
  `;
}

export async function upsertKeynameVersion(tx: postgres.TransactionSql<{}>, row: KeynameVersionRow): Promise<void> {
  await tx`
    INSERT INTO keyname_versions (
      entity_id, version, key_code, key_code_ident,
      source_file, source_line, source_column, build_variant,
      raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.key_code}, ${row.key_code_ident},
      ${row.source_file}, ${row.source_line}, ${row.source_column}, ${row.build_variant},
      ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      key_code       = EXCLUDED.key_code,
      key_code_ident = EXCLUDED.key_code_ident,
      source_file    = EXCLUDED.source_file,
      source_line    = EXCLUDED.source_line,
      source_column  = EXCLUDED.source_column,
      build_variant  = EXCLUDED.build_variant,
      raw_ast_hash   = EXCLUDED.raw_ast_hash,
      extracted_at   = EXCLUDED.extracted_at
  `;
}

export async function upsertHudElementVersion(tx: postgres.TransactionSql<{}>, row: HudElementVersionRow): Promise<void> {
  await tx`
    INSERT INTO hud_element_versions (
      entity_id, version, help_desc, hud_alias,
      flags_raw, min_state_raw, draw_order_raw, draw_fn,
      enclosing_function, source_file, source_line, source_column,
      owned_cvars_json, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.help_desc}, ${row.hud_alias},
      ${row.flags_raw}, ${row.min_state_raw}, ${row.draw_order_raw}, ${row.draw_fn},
      ${row.enclosing_function}, ${row.source_file}, ${row.source_line}, ${row.source_column},
      ${tx.json(row.owned_cvars_json as never)}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      help_desc          = EXCLUDED.help_desc,
      hud_alias          = EXCLUDED.hud_alias,
      flags_raw          = EXCLUDED.flags_raw,
      min_state_raw      = EXCLUDED.min_state_raw,
      draw_order_raw     = EXCLUDED.draw_order_raw,
      draw_fn            = EXCLUDED.draw_fn,
      enclosing_function = EXCLUDED.enclosing_function,
      source_file        = EXCLUDED.source_file,
      source_line        = EXCLUDED.source_line,
      source_column      = EXCLUDED.source_column,
      owned_cvars_json   = EXCLUDED.owned_cvars_json,
      raw_ast_hash       = EXCLUDED.raw_ast_hash,
      extracted_at       = EXCLUDED.extracted_at
  `;
}

export async function upsertRulesetVersion(tx: postgres.TransactionSql<{}>, row: RulesetVersionRow): Promise<void> {
  await tx`
    INSERT INTO ruleset_versions (
      entity_id, version, enum_ident, loader_fn, maxfps,
      restrict_triggers, restrict_packet, restrict_particles, restrict_play,
      restrict_logging, restrict_rollangle, restrict_ipc, restrict_exec,
      restrict_setcalc, restrict_seteval, restrict_setex,
      locked_cvars_json, source_file, source_line, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.enum_ident}, ${row.loader_fn}, ${row.maxfps},
      ${asBoolOrNull(row.restrict_triggers)}, ${asBoolOrNull(row.restrict_packet)}, ${asBoolOrNull(row.restrict_particles)}, ${asBoolOrNull(row.restrict_play)},
      ${asBoolOrNull(row.restrict_logging)}, ${asBoolOrNull(row.restrict_rollangle)}, ${asBoolOrNull(row.restrict_ipc)}, ${asBoolOrNull(row.restrict_exec)},
      ${asBoolOrNull(row.restrict_setcalc)}, ${asBoolOrNull(row.restrict_seteval)}, ${asBoolOrNull(row.restrict_setex)},
      ${tx.json(row.locked_cvars_json as never)}, ${row.source_file}, ${row.source_line}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      enum_ident         = EXCLUDED.enum_ident,
      loader_fn          = EXCLUDED.loader_fn,
      maxfps             = EXCLUDED.maxfps,
      restrict_triggers  = EXCLUDED.restrict_triggers,
      restrict_packet    = EXCLUDED.restrict_packet,
      restrict_particles = EXCLUDED.restrict_particles,
      restrict_play      = EXCLUDED.restrict_play,
      restrict_logging   = EXCLUDED.restrict_logging,
      restrict_rollangle = EXCLUDED.restrict_rollangle,
      restrict_ipc       = EXCLUDED.restrict_ipc,
      restrict_exec      = EXCLUDED.restrict_exec,
      restrict_setcalc   = EXCLUDED.restrict_setcalc,
      restrict_seteval   = EXCLUDED.restrict_seteval,
      restrict_setex     = EXCLUDED.restrict_setex,
      locked_cvars_json  = EXCLUDED.locked_cvars_json,
      source_file        = EXCLUDED.source_file,
      source_line        = EXCLUDED.source_line,
      raw_ast_hash       = EXCLUDED.raw_ast_hash,
      extracted_at       = EXCLUDED.extracted_at
  `;
}

export async function upsertTokenPrimitiveVersion(tx: postgres.TransactionSql<{}>, row: TokenPrimitiveVersionRow): Promise<void> {
  await tx`
    INSERT INTO token_primitive_versions (
      entity_id, version, form, suffix_char, byte_value,
      category, case_style, source_file, source_line,
      raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.form}, ${row.suffix_char}, ${row.byte_value},
      ${row.category}, ${row.case_style}, ${row.source_file}, ${row.source_line},
      ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      form          = EXCLUDED.form,
      suffix_char   = EXCLUDED.suffix_char,
      byte_value    = EXCLUDED.byte_value,
      category      = EXCLUDED.category,
      case_style    = EXCLUDED.case_style,
      source_file   = EXCLUDED.source_file,
      source_line   = EXCLUDED.source_line,
      raw_ast_hash  = EXCLUDED.raw_ast_hash,
      extracted_at  = EXCLUDED.extracted_at
  `;
}

// --- asset-consumption upserts ----------------------------------------------

export async function upsertAssetCategoryVersion(tx: postgres.TransactionSql<{}>, row: AssetCategoryVersionRow): Promise<void> {
  await tx`
    INSERT INTO asset_category_versions (
      entity_id, version, display_name, description, notes,
      raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.display_name}, ${row.description}, ${row.notes},
      ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      description  = EXCLUDED.description,
      notes        = EXCLUDED.notes,
      raw_ast_hash = EXCLUDED.raw_ast_hash,
      extracted_at = EXCLUDED.extracted_at
  `;
}

// The four relation-row upserts use natural keys given by the table's UNIQUE
// constraint. ON CONFLICT updates every non-key column.

export async function upsertAssetExtension(tx: postgres.TransactionSql<{}>, row: AssetExtensionRow): Promise<void> {
  await tx`
    INSERT INTO asset_extensions (
      project, version, extension, path_hint, category_id,
      notes, verification_status, verification_reason, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.project}, ${row.version}, ${row.extension}, ${row.path_hint}, ${row.category_id},
      ${row.notes}, ${row.verification_status}, ${row.verification_reason}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (project, version, extension, path_hint) DO UPDATE SET
      category_id          = EXCLUDED.category_id,
      notes                = EXCLUDED.notes,
      verification_status  = EXCLUDED.verification_status,
      verification_reason  = EXCLUDED.verification_reason,
      raw_ast_hash         = EXCLUDED.raw_ast_hash,
      extracted_at         = EXCLUDED.extracted_at
  `;
}

export async function upsertAssetPathRule(tx: postgres.TransactionSql<{}>, row: AssetPathRuleRow): Promise<void> {
  await tx`
    INSERT INTO asset_path_rules (
      project, version, canonical_id, rule_kind, ordinal, description,
      source_ref, source_verified, notes, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.project}, ${row.version}, ${row.canonical_id}, ${row.rule_kind}, ${row.ordinal}, ${row.description},
      ${row.source_ref}, ${asBool(row.source_verified)}, ${row.notes}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (project, version, canonical_id) DO UPDATE SET
      rule_kind        = EXCLUDED.rule_kind,
      ordinal          = EXCLUDED.ordinal,
      description      = EXCLUDED.description,
      source_ref       = EXCLUDED.source_ref,
      source_verified  = EXCLUDED.source_verified,
      notes            = EXCLUDED.notes,
      raw_ast_hash     = EXCLUDED.raw_ast_hash,
      extracted_at     = EXCLUDED.extracted_at
  `;
}

export async function upsertAssetCvarBinding(tx: postgres.TransactionSql<{}>, row: AssetCvarBindingRow): Promise<void> {
  await tx`
    INSERT INTO asset_cvar_bindings (
      project, version, cvar_canonical_id, category_id, path_pattern,
      load_trigger, confidence, source_ref, notes, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.project}, ${row.version}, ${row.cvar_canonical_id}, ${row.category_id}, ${row.path_pattern},
      ${row.load_trigger}, ${row.confidence}, ${row.source_ref}, ${row.notes}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (project, version, cvar_canonical_id, category_id, path_pattern) DO UPDATE SET
      load_trigger  = EXCLUDED.load_trigger,
      confidence    = EXCLUDED.confidence,
      source_ref    = EXCLUDED.source_ref,
      notes         = EXCLUDED.notes,
      raw_ast_hash  = EXCLUDED.raw_ast_hash,
      extracted_at  = EXCLUDED.extracted_at
  `;
}

export async function upsertAssetLoaderSite(tx: postgres.TransactionSql<{}>, row: AssetLoaderSiteRow): Promise<void> {
  await tx`
    INSERT INTO asset_loader_sites (
      project, version, canonical_id, function_name,
      source_file, source_line, source_column, enclosing_function,
      reads_category_id, load_trigger, path_source, path_literal, path_cvar_id,
      confidence, dev_only, notes, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.project}, ${row.version}, ${row.canonical_id}, ${row.function_name},
      ${row.source_file}, ${row.source_line}, ${row.source_column}, ${row.enclosing_function},
      ${row.reads_category_id}, ${row.load_trigger}, ${row.path_source}, ${row.path_literal}, ${row.path_cvar_id},
      ${row.confidence}, ${asBool(row.dev_only)}, ${row.notes}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (project, version, canonical_id) DO UPDATE SET
      function_name      = EXCLUDED.function_name,
      source_file        = EXCLUDED.source_file,
      source_line        = EXCLUDED.source_line,
      source_column      = EXCLUDED.source_column,
      enclosing_function = EXCLUDED.enclosing_function,
      reads_category_id  = EXCLUDED.reads_category_id,
      load_trigger       = EXCLUDED.load_trigger,
      path_source        = EXCLUDED.path_source,
      path_literal       = EXCLUDED.path_literal,
      path_cvar_id       = EXCLUDED.path_cvar_id,
      confidence         = EXCLUDED.confidence,
      dev_only           = EXCLUDED.dev_only,
      notes              = EXCLUDED.notes,
      raw_ast_hash       = EXCLUDED.raw_ast_hash,
      extracted_at       = EXCLUDED.extracted_at
  `;
}

export async function upsertReleaseNote(tx: postgres.TransactionSql<{}>, row: ReleaseNoteRow): Promise<void> {
  await tx`
    INSERT INTO release_notes (
      project, version, section, ordinal, body_md,
      referenced_entity_ids_json, commit_urls_json, pr_numbers_json,
      author_handles_json, raw_body_hash, extracted_at
    ) VALUES (
      ${row.project}, ${row.version}, ${row.section}, ${row.ordinal}, ${row.body_md},
      ${tx.json(row.referenced_entity_ids_json as never)}, ${tx.json(row.commit_urls_json as never)}, ${tx.json(row.pr_numbers_json as never)},
      ${tx.json(row.author_handles_json as never)}, ${row.raw_body_hash}, ${row.extracted_at}
    )
    ON CONFLICT (project, version, section, ordinal) DO UPDATE SET
      body_md                    = EXCLUDED.body_md,
      referenced_entity_ids_json = EXCLUDED.referenced_entity_ids_json,
      commit_urls_json           = EXCLUDED.commit_urls_json,
      pr_numbers_json            = EXCLUDED.pr_numbers_json,
      author_handles_json        = EXCLUDED.author_handles_json,
      raw_body_hash              = EXCLUDED.raw_body_hash,
      extracted_at               = EXCLUDED.extracted_at
  `;
}

export async function upsertCvarAliasVersion(tx: postgres.TransactionSql<{}>, row: CvarAliasVersionRow): Promise<void> {
  // Best-effort target_canonical_id resolution: if target entity exists in
  // the DB, link the FK; otherwise leave NULL (per spec). A separate
  // resolver pass can re-link rows when target projects later load.
  // Token primitives are case-sensitive everywhere; cvar aliases are not, so
  // lowercase the lookup name to match the canonical-id pattern.
  let resolved: string | null = row.target_canonical_id ?? null;
  if (resolved == null) {
    const targetIsEntity = row.target_kind === 'cvar'
      || row.target_kind === 'command'
      || row.target_kind === 'macro';
    if (targetIsEntity) {
      const lookupName = row.target_name.toLowerCase();
      const hit = await tx<{ canonical_id: string }[]>`
        SELECT canonical_id FROM entities
        WHERE project = ${row.target_project} AND type = ${row.target_kind} AND name = ${lookupName}
      `;
      if (hit.length > 0) resolved = hit[0]!.canonical_id;
    }
  }

  await tx`
    INSERT INTO cvar_alias_versions (
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
      ${row.entity_id}, ${row.version},
      ${row.target_project}, ${row.target_kind}, ${row.target_name}, ${resolved},
      ${row.mimics_project},
      ${row.value_transform}, ${row.value_transform_params_json},
      ${row.default_drift_status}, ${row.semantic_confidence},
      ${row.verified_target_version}, ${row.verified_mimics_version},
      ${row.freshness_state},
      ${row.source_file}, ${row.source_line}, ${row.source_column}, ${row.source_root},
      ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      target_project              = EXCLUDED.target_project,
      target_kind                 = EXCLUDED.target_kind,
      target_name                 = EXCLUDED.target_name,
      target_canonical_id         = EXCLUDED.target_canonical_id,
      mimics_project              = EXCLUDED.mimics_project,
      value_transform             = EXCLUDED.value_transform,
      value_transform_params_json = EXCLUDED.value_transform_params_json,
      default_drift_status        = EXCLUDED.default_drift_status,
      semantic_confidence         = EXCLUDED.semantic_confidence,
      verified_target_version     = EXCLUDED.verified_target_version,
      verified_mimics_version     = EXCLUDED.verified_mimics_version,
      freshness_state             = EXCLUDED.freshness_state,
      source_file                 = EXCLUDED.source_file,
      source_line                 = EXCLUDED.source_line,
      source_column               = EXCLUDED.source_column,
      source_root                 = EXCLUDED.source_root,
      raw_ast_hash                = EXCLUDED.raw_ast_hash,
      extracted_at                = EXCLUDED.extracted_at
  `;
}

export async function upsertFlagBitVersion(tx: postgres.TransactionSql<{}>, row: FlagBitVersionRow): Promise<void> {
  await tx`
    INSERT INTO flag_bit_versions (
      entity_id, version, bitmask_family, value_raw, value_numeric,
      source_file, source_line, raw_ast_hash, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.bitmask_family}, ${row.value_raw}, ${row.value_numeric},
      ${row.source_file}, ${row.source_line}, ${row.raw_ast_hash}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version) DO UPDATE SET
      bitmask_family = EXCLUDED.bitmask_family,
      value_raw      = EXCLUDED.value_raw,
      value_numeric  = EXCLUDED.value_numeric,
      source_file    = EXCLUDED.source_file,
      source_line    = EXCLUDED.source_line,
      raw_ast_hash   = EXCLUDED.raw_ast_hash,
      extracted_at   = EXCLUDED.extracted_at
  `;
}

export async function upsertRelationChange(tx: postgres.TransactionSql<{}>, row: RelationChangeRow): Promise<void> {
  await tx`
    INSERT INTO relation_changes (
      relation_table, project, from_version, to_version, change_kind,
      row_key_json, field_name, old_value, new_value,
      commit_sha, commit_message_excerpt, extracted_at
    ) VALUES (
      ${row.relation_table}, ${row.project}, ${row.from_version}, ${row.to_version}, ${row.change_kind},
      ${row.row_key_json}, ${row.field_name}, ${row.old_value}, ${row.new_value},
      ${row.commit_sha}, ${row.commit_message_excerpt}, ${row.extracted_at}
    )
    ON CONFLICT (relation_table, project, to_version, row_key_json, field_name, change_kind) DO UPDATE SET
      from_version            = EXCLUDED.from_version,
      old_value               = EXCLUDED.old_value,
      new_value               = EXCLUDED.new_value,
      commit_sha              = EXCLUDED.commit_sha,
      commit_message_excerpt  = EXCLUDED.commit_message_excerpt,
      extracted_at            = EXCLUDED.extracted_at
  `;
}

export async function upsertSourceOverride(tx: postgres.TransactionSql<{}>, row: SourceOverrideRow): Promise<void> {
  await tx`
    INSERT INTO source_overrides (
      entity_id, version, field_name, source_file, source_line,
      source_column, override_kind, extracted_at
    ) VALUES (
      ${row.entity_id}, ${row.version}, ${row.field_name}, ${row.source_file}, ${row.source_line},
      ${row.source_column}, ${row.override_kind}, ${row.extracted_at}
    )
    ON CONFLICT (entity_id, version, field_name) DO UPDATE SET
      source_file   = EXCLUDED.source_file,
      source_line   = EXCLUDED.source_line,
      source_column = EXCLUDED.source_column,
      override_kind = EXCLUDED.override_kind,
      extracted_at  = EXCLUDED.extracted_at
  `;
}
