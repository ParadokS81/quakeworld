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
