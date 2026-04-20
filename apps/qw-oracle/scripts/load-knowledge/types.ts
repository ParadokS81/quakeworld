// apps/qw-oracle/scripts/load-knowledge/types.ts
//
// Mirrors the extractor JSON format produced by
// packages/qw-config/scripts/extract-ezquake-cvars-clang.py
// (output: packages/qw-config/src/data/ezquake-variables-ast.json).

export type Project = 'ezquake' | 'fte' | 'mvdsv' | 'ktx';
export type EntityType =
  | 'cvar'
  | 'command'
  | 'macro'
  | 'cmdline_param'
  | 'keyname'
  | 'hud_element'
  | 'ruleset'
  | 'token_primitive'
  | 'asset_category';
export type SourceState =
  | 'source_backed'
  | 'source_retired'
  | 'doc_only'
  | 'dynamically_registered';
export type ChangeKind = 'created' | 'modified' | 'deleted';
export type EnrichmentSource = 'git' | 'github_api';
export type TransitionReason =
  | 'initial_observation'
  | 'removed_from_head'
  | 're_added'
  | 'backfill_match'
  | 'manual_update';

export interface AstBlock {
  c_ident: string;
  source_file: string;
  source_line: number;
  source_column: number;
  storage_class: string | null;
  flags_raw: string | null;
  flag_names: string[];
  on_change: string | null;
  group_name_in_source: string | null;
  min_bound: string | null;
  max_bound: string | null;
  trailing_comment: string | null;
}

export interface VariableEntry {
  type?: string;
  'group-id'?: string;
  default?: string | number | boolean;
  'server-only'?: boolean;
  ast: AstBlock | null;
  desc?: string;
  remarks?: string;
  values?: unknown;
}

export interface GroupDef {
  id: string;
  'major-group'?: string;
  name?: string;
}

export interface ExtractorOutput {
  groups: GroupDef[];
  vars: Record<string, VariableEntry>;
  _stats?: Record<string, unknown>;
}

// Command AST block, emitted by extract-ezquake-commands-clang.py.
export interface CommandAstBlock {
  handler_fn: string | null;
  source_file: string;
  source_line: number;
  source_column: number;
  enclosing_function: string | null;
  build_variant: string;
}

export interface CommandEntry {
  'group-id'?: string;
  ast: CommandAstBlock | null;
  desc?: string;
  remarks?: string;
  system_generated?: boolean;
}

export interface CommandExtractorOutput {
  groups: GroupDef[];
  commands: Record<string, CommandEntry>;
  _stats?: Record<string, unknown>;
}

// Macro AST block, emitted by extract-ezquake-macros-clang.py.
export interface MacroAstBlock {
  handler_fn: string | null;
  source_file: string;
  source_line: number;
  source_column: number;
  enclosing_function: string | null;
  call_form: string;                // 'Cmd_AddMacro' | 'Cmd_AddMacroEx'
  teamplay_arg_raw: string | null;  // raw source text of the teamplay arg (Ex only)
  build_variant: string;
  undeclared?: boolean;
}

export interface MacroEntry {
  ast: MacroAstBlock | null;
  desc?: string;
  remarks?: string;
  type?: string;
  'teamplay-restricted'?: boolean;
  'related-cvars'?: string[];
}

export interface MacroExtractorOutput {
  macros: Record<string, MacroEntry>;
  _stats?: Record<string, unknown>;
}

// Cmdline-param AST block, emitted by extract-ezquake-cmdline-clang.py.
export interface CmdlineUsageSite {
  source_file: string;
  source_line: number;
  source_column: number;
  enclosing_function: string | null;
  call_form: string;           // 'COM_CheckParm' | 'COM_CheckParmOffset'
  build_variant: string;
}

export interface CmdlineAstBlock {
  manifest_enum: string | null;
  manifest_file: string | null;
  manifest_line: number | null;
  usage_sites: CmdlineUsageSite[];
  usage_count: number;
  undeclared?: boolean;
}

export interface CmdlineParamEntry {
  ast: CmdlineAstBlock | null;
  desc?: string;
  remarks?: string;
  arguments?: string;
  systems?: string[];
  flags?: string[];
}

export interface CmdlineParamExtractorOutput {
  params: Record<string, CmdlineParamEntry>;
  _stats?: Record<string, unknown>;
}

// --- Phase 2c.5 types -------------------------------------------------------

export interface KeynameAstBlock {
  key_code: number | null;
  key_code_ident: string | null;
  source_file: string;
  source_line: number;
  source_column: number;
  build_variant: string;
}

export interface KeynameEntry {
  ast: KeynameAstBlock | null;
}

export interface HudElementAstBlock {
  alias: string | null;
  flags_raw: string;
  min_state_raw: string;
  draw_order_raw: string;
  draw_fn: string | null;
  owned_cvars: string[];
  source_file: string;
  source_line: number;
  source_column: number;
  enclosing_function: string | null;
  build_variant: string;
}

export interface HudElementEntry {
  ast: HudElementAstBlock | null;
  desc?: string;
}

export interface RulesetLockedCvar {
  cvar_ident: string;
  value: string;
}

export interface RulesetAstBlock {
  enum_ident: string;
  loader_fn: string;
  maxfps: number | null;
  restrict_triggers: number | null;
  restrict_packet: number | null;
  restrict_particles: number | null;
  restrict_play: number | null;
  restrict_logging: number | null;
  restrict_rollangle: number | null;
  restrict_ipc: number | null;
  restrict_exec: number | null;
  restrict_setcalc: number | null;
  restrict_seteval: number | null;
  restrict_setex: number | null;
  locked_cvars: RulesetLockedCvar[];
  locked_cvar_count: number;
  source_file: string;
  source_line: number;
}

export interface RulesetEntry {
  ast: RulesetAstBlock | null;
}

export interface TokenPrimitiveAstBlock {
  suffix_char: string;
  suffix_literal: string;
  byte_value: number;
  category: string;
  case_style: string;
  source_file: string;
  source_line: number;
}

export interface TokenPrimitiveEntry {
  ast: TokenPrimitiveAstBlock | null;
}

export interface EntityRow {
  project: Project;
  type: EntityType;
  name: string;
  canonical_id: string;
  first_seen_version: string;
  last_seen_version: string;
  source_state: SourceState;
  predecessor_id: number | null;
}

// Per-type version-row shapes, mirroring the schema tables in schema.ts.

export interface CommandVersionRow {
  entity_id: number;
  version: string;
  help_desc: string | null;
  help_remarks: string | null;
  help_group_id: string | null;
  handler_fn: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  registration_file: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface MacroVersionRow {
  entity_id: number;
  version: string;
  help_desc: string | null;
  macro_type: string | null;
  teamplay_restricted: number;
  related_cvars_json: string | null;
  handler_fn: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  registration_file: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface CmdlineParamVersionRow {
  entity_id: number;
  version: string;
  help_desc: string | null;
  help_remarks: string | null;
  arguments: string | null;
  flags_json: string | null;
  systems_json: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface KeynameVersionRow {
  entity_id: number;
  version: string;
  key_code: number | null;
  key_code_ident: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  build_variant: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface HudElementVersionRow {
  entity_id: number;
  version: string;
  help_desc: string | null;
  hud_alias: string | null;
  flags_raw: string | null;
  min_state_raw: string | null;
  draw_order_raw: string | null;
  draw_fn: string | null;
  enclosing_function: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  owned_cvars_json: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface RulesetVersionRow {
  entity_id: number;
  version: string;
  enum_ident: string | null;
  loader_fn: string | null;
  maxfps: number | null;
  restrict_triggers: number | null;
  restrict_packet: number | null;
  restrict_particles: number | null;
  restrict_play: number | null;
  restrict_logging: number | null;
  restrict_rollangle: number | null;
  restrict_ipc: number | null;
  restrict_exec: number | null;
  restrict_setcalc: number | null;
  restrict_seteval: number | null;
  restrict_setex: number | null;
  locked_cvars_json: string | null;
  source_file: string | null;
  source_line: number | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface TokenPrimitiveVersionRow {
  entity_id: number;
  version: string;
  form: string | null;
  suffix_char: string | null;
  byte_value: number | null;
  category: string | null;
  case_style: string | null;
  source_file: string | null;
  source_line: number | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

// --- Phase 2c.6 asset consumption types -------------------------------------

export type AssetLoadTrigger =
  | 'startup'
  | 'on_demand'
  | 'on_connect'
  | 'on_map_load'
  | 'unknown';

export type AssetPathRuleKind =
  | 'search_path'
  | 'archive_precedence'
  | 'cmdline_override'
  | 'gamedir_behavior';

export type AssetCvarBindingConfidence =
  | 'seed'
  | 'auto'
  | 'auto_confirms_seed'
  | 'auto_orphan';

export type AssetLoaderSiteConfidence = 'certain' | 'heuristic' | 'unclassified';

export type AssetLoaderSitePathSource = 'literal' | 'cvar' | 'computed' | 'unknown';

// Per-type entity entry for asset_category. Mirrors the per-type extractor
// JSON shape used elsewhere (e.g. token_primitives) so load-version.ts can
// dispatch through the same adapter interface.
export interface AssetCategoryAstBlock {
  display_name: string;
  description: string | null;
  notes: string | null;
}

export interface AssetCategoryEntry {
  ast: AssetCategoryAstBlock | null;
}

export interface AssetCategoryVersionRow {
  entity_id: number;
  version: string;
  display_name: string;
  description: string | null;
  notes: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

// Relation-row shapes for the four non-entity asset tables. These are
// loaded via `load-assets` (not the per-type adapter dispatch).

export interface AssetExtensionRow {
  project: Project;
  version: string;
  extension: string;
  path_hint: string | null;
  category_id: string;
  notes: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface AssetPathRuleRow {
  project: Project;
  version: string;
  canonical_id: string;
  rule_kind: AssetPathRuleKind;
  ordinal: number;
  description: string;
  source_ref: string | null;
  source_verified: number;
  notes: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface AssetCvarBindingRow {
  project: Project;
  version: string;
  cvar_canonical_id: string;
  category_id: string;
  path_pattern: string | null;
  load_trigger: AssetLoadTrigger;
  confidence: AssetCvarBindingConfidence;
  source_ref: string | null;
  notes: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface AssetLoaderSiteRow {
  project: Project;
  version: string;
  canonical_id: string;
  function_name: string;
  source_file: string;
  source_line: number;
  source_column: number | null;
  enclosing_function: string | null;
  reads_category_id: string | null;
  load_trigger: AssetLoadTrigger;
  path_source: AssetLoaderSitePathSource;
  path_literal: string | null;
  path_cvar_id: string | null;
  confidence: AssetLoaderSiteConfidence;
  dev_only: number;
  notes: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

// Shape of the JSON bundle emitted by build-asset-bundle.ts and consumed
// by load-assets.
export interface AssetBundle {
  project: Project;
  version: string;
  asset_categories: Record<string, AssetCategoryEntry>;
  asset_extensions: Omit<AssetExtensionRow, 'project' | 'version' | 'extracted_at'>[];
  asset_path_rules: Omit<AssetPathRuleRow, 'project' | 'version' | 'extracted_at'>[];
  asset_cvar_bindings: Omit<AssetCvarBindingRow, 'project' | 'version' | 'extracted_at'>[];
  asset_loader_sites: Omit<AssetLoaderSiteRow, 'project' | 'version' | 'extracted_at'>[];
  _stats?: Record<string, unknown>;
}

export interface CvarVersionRow {
  entity_id: number;
  version: string;

  help_desc: string | null;
  help_remarks: string | null;
  help_values: string | null;
  help_group_id: string | null;
  help_type: string | null;

  default_value: string | null;
  flags_raw: string | null;
  flag_names: string | null;
  on_change: string | null;
  min_bound: string | null;
  max_bound: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  storage_class: string | null;
  group_name_in_source: string | null;
  trailing_comment: string | null;
  server_only: number;

  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface VersionRow {
  project: Project;
  version: string;
  commit_sha: string;
  tag_date: string | null;
  ordinal: number;
  parse_state: 'ok' | 'partial';
  notes: string | null;
  extracted_at: string;
}
