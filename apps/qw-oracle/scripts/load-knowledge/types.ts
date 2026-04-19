// apps/qw-oracle/scripts/load-knowledge/types.ts
//
// Mirrors the extractor JSON format produced by
// packages/qw-config/scripts/extract-ezquake-cvars-clang.py
// (output: packages/qw-config/src/data/ezquake-variables-ast.json).

export type Project = 'ezquake' | 'fte' | 'mvdsv' | 'ktx';
export type EntityType = 'cvar' | 'command' | 'macro' | 'cmdline_param';
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
