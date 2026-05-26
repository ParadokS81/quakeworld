// apps/qw-oracle/scripts/load-knowledge/types.ts
//
// Mirrors the extractor JSON format produced by
// apps/qw-oracle/scripts/extractors/ezquake/extract.py (and the legacy single-purpose
// scripts in apps/qw-oracle/scripts/extractors/ezquake/_legacy/)
// (output: apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-variables-ast.json).

export type Project = 'ezquake' | 'fte' | 'mvdsv' | 'ktx' | 'qwcl' | 'qw';
export type EntityType =
  | 'cvar'
  | 'command'
  | 'macro'
  | 'cmdline_param'
  | 'keyname'
  | 'hud_element'
  | 'ruleset'
  | 'token_primitive'
  | 'asset_category'
  | 'flag_bit'
  | 'cvar_alias'
  | 'protocol_message'
  | 'info_key'
  | 'log_template'
  | 'qc_builtin'
  | 'match_event';
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
  | 'source_retired_at_version'
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
  // MVDSV emits the literal default value inside the ast block (no help-JSON
  // envelope to carry the ezQuake top-level `default` field). Optional to keep
  // ezQuake/FTE/QWCL entries (which carry it at the entry level) compatible.
  default_value?: string | null;
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
  // Present on FTE entries (top-level field); absent on ezQuake/QWCL entries.
  source_root?: string;
}

export interface GroupDef {
  id: string;
  'major-group'?: string;
  name?: string;
}

export interface ExtractorOutput {
  groups: GroupDef[];
  vars: Record<string, VariableEntry>;
  default_overrides?: Record<string, Array<{ source_file: string; source_line: number }>>;
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
  description?: string | null;
}

export interface CommandEntry {
  'group-id'?: string;
  ast: CommandAstBlock | null;
  desc?: string;
  remarks?: string;
  system_generated?: boolean;
  // Present on FTE entries (top-level field); absent on ezQuake/QWCL entries.
  source_root?: string;
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
  // Present on FTE entries (top-level field); absent on ezQuake/QWCL entries.
  source_root?: string;
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
  // MVDSV emits the call-site flat on the ast object instead of via
  // usage_sites/manifest. Optional to keep typecheck clean for both shapes.
  source_file?: string;
  source_line?: number;
  source_column?: number;
  containing_function?: string | null;
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
  field_source_lines?: Record<string, { source_file: string; source_line: number }>;
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
  field_source_lines?: Record<string, { source_file: string; source_line: number }>;
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

// --- Phase 2e MVDSV: protocol_message ---------------------------------------
// Server-side macro-defined byte tags exchanged between client and server.
// Schema v16 (Phase C 2026-04-28) widens the kind union from 6 to 13 to
// disambiguate heterogeneous-bag classifications. PROTOCOL_VERSION (wire
// protocol revision) splits from PROTOCOL_VERSION_FTE/FTE2/MVD1 (extension
// ids); pext_fte and pext_mvd subdivide into _bit / _const / _alias /
// _marker by macro-body shape so bit flags, plain ints, alias macros, and
// no-value markers are distinguishable in queries. The 13 values must
// satisfy the CHECK constraint on protocol_message_versions.kind.

export interface ProtocolMessageAstBlock {
  kind:
    | 'svc'
    | 'clc'
    | 'nq'
    | 'pext_fte_bit'
    | 'pext_fte_const'
    | 'pext_fte_alias'
    | 'pext_fte_marker'
    | 'pext_mvd_bit'
    | 'pext_mvd_const'
    | 'pext_mvd_alias'
    | 'pext_mvd_marker'
    | 'protocol_version'
    | 'protocol_extension_id';
  value: string | null;
  value_kind: 'integer' | 'hex' | 'bitshift' | 'expression' | null;
  source_file: string | null;
  source_line: number | null;
  trailing_comment: string | null;
}

export interface ProtocolMessageEntry {
  name: string;
  ast: ProtocolMessageAstBlock | null;
}

// --- Phase 2e MVDSV: info_key ----------------------------------------------
// MVDSV-specific info-string keys read from / written to the userinfo,
// serverinfo, or localinfo dictionaries. The CHECK constraint on
// info_key_versions.scope restricts scope to those three values.

export interface InfoKeyAstBlock {
  scope: 'userinfo' | 'serverinfo' | 'localinfo';
  operations: ('read' | 'write' | 'remove')[];
  source_file: string | null;
  source_line: number | null;
  containing_function: string | null;
  all_call_sites: {
    source_file: string | null;
    source_line: number | null;
    operation: 'read' | 'write' | 'remove';
  }[];
}

export interface InfoKeyEntry {
  // Phase B 2026-04-28: canonical name is `<bare>:<scope>` so cross-scope
  // registrations of the same key (e.g. `*z_ext:serverinfo` and
  // `*z_ext:userinfo`) survive the entities table's UNIQUE(project, type,
  // name) constraint. The unsuffixed form is preserved in `bare_name`;
  // MCP `lookup_entity` falls back to a `name LIKE '<bare>:%'` prefix
  // match for type=info_key when the queried name has no `:`.
  name: string;
  bare_name: string;
  ast: InfoKeyAstBlock | null;
}

// --- Phase 2e MVDSV: log_template -------------------------------------------
// Server-emitted log/print/console template strings, classified by output
// channel (broadcast/client/console/system). The CHECK constraint on
// log_template_versions.channel restricts channel to those four values.

export interface LogTemplateAstBlock {
  channel: 'broadcast' | 'client' | 'console' | 'system';
  format_string: string;
  format_string_normalized: string;
  source_file: string | null;
  source_line: number | null;
  containing_function: string | null;
  // Phase D Task 10: every call site that registers this (channel,
  // format_string). The first entry seeds the top-level (source_file,
  // source_line, containing_function) for display compatibility; the full
  // list lands in log_template_versions.all_call_sites_json.
  all_call_sites?: {
    source_file: string | null;
    source_line: number | null;
    containing_function: string | null;
  }[];
}

export interface LogTemplateEntry {
  name: string;
  ast: LogTemplateAstBlock | null;
}

// --- Phase 6 KTX: match_event -----------------------------------------------
// XSD-driven entity type. Source of truth is research/repos/ktx/resources/
// extralog/ktxlog_0.1.xsd. The Python handler at scripts/extractors/ktx/
// _handler_match_events.py emits 7 entries (one per <xs:choice> event_name)
// with attribute schemas + emission call sites. Two JSONB columns on the
// match_event_versions table: attributes_json (per-attribute schema) and
// emission_call_sites_json (per-call-site source citations). Bound directly
// via tx.json(...) per D14 -- never JSON.stringify.

// Per-attribute schema entry inside MatchEventAst.attributes. Mirrors the
// XSD's <xs:element name="..." type="..."/> shape PLUS the resolved
// simpleType constraint when type is a named simpleType (maxed_integer,
// iptype, modetype, porttype). For XSD primitives (xs:decimal, xs:string,
// xs:nonNegativeInteger, xs:boolean) constraint is null.
export interface MatchEventAttributeConstraint {
  base: string | null;
  min_inclusive?: string;
  max_inclusive?: string;
  pattern?: string;
}
export interface MatchEventAttribute {
  name: string;
  type: string;          // XSD type ref, e.g. 'xs:decimal', 'xs:string', 'maxed_integer'
  constraint: MatchEventAttributeConstraint | null;
}

// Per-emission call site. Tracks where in the C source each event type is
// emitted via log_printf, plus the enclosing C function name per spec
// 5.6.b's containing_function heuristic.
export interface MatchEventEmissionSite {
  source_file: string;
  source_line: number;
  containing_function: string | null;
}

export interface MatchEventAst {
  event_name: string;            // e.g. 'pick_mapitem'
  complex_type: string;          // e.g. 'mapitemtype'
  attributes: MatchEventAttribute[];
  xsd_path: string;              // repo-relative path to the XSD
  xsd_version: string;           // e.g. '0.1'
  source_file: string;           // = xsd_path; the XSD is the source of truth for this entity
  source_line: number | null;    // line in the XSD where <xs:element name="EVENT_NAME"...> appears
  emission_call_sites: MatchEventEmissionSite[];
}

export interface MatchEventEntry {
  name: string;                  // = ast.event_name
  ast: MatchEventAst | null;     // null reserved for doc_only rows; in practice unused (XSD is the producer)
}

// --- Phase 2e MVDSV: qc_builtin ---------------------------------------------
// QuakeC builtin functions exposed to game-mod progs (std_builtins,
// ext_builtins, ext_syscalls). table_name is free-form text (no CHECK at
// schema level); table_name + builtin_index + handler_fn are NOT NULL.

export interface QcBuiltinAstBlock {
  table_name: string;
  builtin_index: number;
  handler_fn: string;
  qc_signature: string | null;
  source_file: string | null;
  source_line: number | null;
  trailing_comment: string | null;
}

export interface QcBuiltinEntry {
  name: string;
  ast: QcBuiltinAstBlock | null;
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
  source_root: string | null;
  // Cmd_AddLegacyCommand alias target (migration 017). NULL for normal
  // Cmd_AddCommand registrations; populated with the canonical command
  // name when the entity is a deprecated-rename shim.
  legacy_alias_of: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
  // L1 runtime-fidelity provenance (migration 015, enforce-L1-runtime-truth
  // arc). Two physically separate JSONB columns (D12 no-blend). NULL == D13
  // level-1 "mechanism did not run for this row"; populated only for the
  // banked-HEAD pool. track_a_reachability is owned by the Track-A overlay
  // (load-callgraph-reachability.ts); the per-type command loader leaves it
  // null. track_b_hud_recovery is owned by the Track-B adapter
  // (load-hud-commands.ts). Shape is the locked three-slot spine
  // {conclusion, evidence, dump_confirmation} -- the loader is the enforcer
  // (the column is a bare nullable JSONB with no CHECK).
  track_a_reachability: object | null;
  track_b_hud_recovery: object | null;
}

export interface MacroVersionRow {
  entity_id: number;
  version: string;
  help_desc: string | null;
  macro_type: string | null;
  teamplay_restricted: boolean;
  // JSONB array of cvar idents. NULL when the macro doesn't reference any cvars.
  related_cvars_json: string[] | null;
  handler_fn: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  registration_file: string | null;
  source_root: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface CmdlineParamVersionRow {
  entity_id: number;
  version: string;
  help_desc: string | null;
  help_remarks: string | null;
  arguments: string | null;
  // JSONB arrays. NULL when the extractor didn't tag the param.
  flags_json: string[] | null;
  systems_json: string[] | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface ProtocolMessageVersionRow {
  entity_id: number;
  version: string;
  // CHECK-constrained at the schema level; doc_only rows would have no ast,
  // but isSourceBacked filters those out before this row builds, so kind is
  // always one of the six valid values in practice.
  kind: string;
  value: string | null;
  value_kind: string | null;
  source_file: string | null;
  source_line: number | null;
  trailing_comment: string | null;
  raw_ast_hash: string | null;
  source_root: string | null;
  extracted_at: string;
}

export interface InfoKeyVersionRow {
  entity_id: number;
  version: string;
  // CHECK-constrained at the schema level (userinfo/serverinfo/localinfo);
  // doc_only rows would have no ast, but isSourceBacked filters those out
  // before this row builds, so scope is always one of the three valid values
  // in practice.
  scope: string;
  operations: string | null;            // TEXT column (JSON-stringified array of read/write/remove)
  source_file: string | null;
  source_line: number | null;
  containing_function: string | null;
  // JSONB array of {source_file, source_line, operation}.
  call_sites_json: InfoKeyAstBlock['all_call_sites'] | null;
  raw_ast_hash: string | null;
  source_root: string | null;
  extracted_at: string;
}

export interface LogTemplateVersionRow {
  entity_id: number;
  version: string;
  // CHECK-constrained at the schema level (broadcast/client/console/system);
  // doc_only rows would have no ast, but isSourceBacked filters those out
  // before this row builds, so channel is always one of the four valid values
  // in practice.
  channel: string;
  // NOT NULL at the schema level; defensive empty-string fallback for the
  // same isSourceBacked edge case.
  format_string: string;
  format_string_normalized: string;
  source_file: string | null;
  source_line: number | null;
  containing_function: string | null;
  // JSONB array of every call site for this (channel, format_string). Nullable
  // in v17 (pre-Phase-D rows store NULL); every fresh row carries at least one
  // entry. Schema column is JSONB; postgres-js auto-encodes the array on bind.
  all_call_sites_json: NonNullable<LogTemplateAstBlock['all_call_sites']> | null;
  raw_ast_hash: string | null;
  source_root: string | null;
  extracted_at: string;
}

export interface MatchEventVersionRow {
  entity_id: number;
  version: string;
  // NOT NULL at the schema level; defensive empty-string fallback for the
  // doc_only edge case (in practice matchEventIsSourceBacked filters those
  // out before this builder runs).
  event_name: string;
  complex_type: string;
  // JSONB array of per-attribute schema entries. Bound directly via
  // tx.json(...) per D14; pre-stringifying creates a JSONB string scalar
  // (the legacy SQLite-era TEXT bug). Probe F1.jsonb_columns_not_strings
  // is the regression gate.
  attributes_json: MatchEventAttribute[];
  xsd_path: string;
  xsd_version: string;
  // JSONB array of per-emission-site source citations. Same D14 binding
  // rule as attributes_json. Phase 6's dual-row design (D10 / F17): every
  // emission site here is ALSO captured as a log_template_versions row
  // with channel='logfile' by Phase 2's printf-handler -- the duplicate
  // is intentional.
  emission_call_sites_json: MatchEventEmissionSite[];
  raw_ast_hash: string | null;
  source_root: string | null;
  extracted_at: string;
}

export interface QcBuiltinVersionRow {
  entity_id: number;
  version: string;
  // NOT NULL at the schema level; defensive empty-string / -1 fallbacks for
  // the doc_only edge case (in practice isSourceBacked filters those out
  // before this builder runs). table_name carries free-form text -- expected
  // values are std_builtins / ext_builtins / ext_syscalls but no CHECK at
  // the schema level.
  table_name: string;
  builtin_index: number;
  handler_fn: string;
  qc_signature: string | null;
  source_file: string | null;
  source_line: number | null;
  trailing_comment: string | null;
  raw_ast_hash: string | null;
  source_root: string | null;
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
  // JSONB array of cvar idents owned by this HUD element.
  owned_cvars_json: string[] | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface RulesetVersionRow {
  entity_id: number;
  version: string;
  enum_ident: string | null;
  loader_fn: string | null;
  maxfps: number | null;
  restrict_triggers: boolean | null;
  restrict_packet: boolean | null;
  restrict_particles: boolean | null;
  restrict_play: boolean | null;
  restrict_logging: boolean | null;
  restrict_rollangle: boolean | null;
  restrict_ipc: boolean | null;
  restrict_exec: boolean | null;
  restrict_setcalc: boolean | null;
  restrict_seteval: boolean | null;
  restrict_setex: boolean | null;
  // JSONB array of {cvar_ident, value}.
  locked_cvars_json: RulesetLockedCvar[] | null;
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

export type AssetLoaderSiteConfidence =
  | 'certain'
  | 'heuristic'
  | 'intentionally_generic'
  | 'unclassified';

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

export type AssetExtensionVerificationStatus =
  | 'ast_verified'
  | 'seed_only_with_ast_support'
  | 'seed_only_no_ast_support'
  | 'orphaned_historical';

export interface AssetExtensionRow {
  project: Project;
  version: string;
  extension: string;
  path_hint: string | null;
  category_id: string;
  notes: string | null;
  verification_status: AssetExtensionVerificationStatus;
  verification_reason: string | null;
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
  source_verified: boolean;
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
  dev_only: boolean;
  notes: string | null;
  // Path 1 additions. Optional so the DB loader can ignore cleanly; bundle
  // carries them verbatim for downstream consumers.
  path_template?: string | null;
  path_parameters?: Array<{ slot: number; expression_snippet: string; semantic: string }> | null;
  path_extension?: string | null;
  format_function?: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

// Per-engine client-level conventions used by downstream consumers
// (slipgate's scanner today) to classify files that are engine-behavior
// derived rather than loader-call derived: screenshots, demos, logs, and
// match-format cvars. Optional on the bundle for forward-compat with
// engines that haven't shipped a seed yet.
export interface ClientDefaults {
  screenshot_filename_prefixes: string[];
  screenshot_dir_names: string[];
  demo_extensions: string[];
  default_demo_ext: string | null;
  image_extensions: string[];
  log_extensions: string[];
  match_format_cvars: string[];
  owned_gamedirs: string[];
}

export interface ReservedSubdirEntry {
  canonical_id: string;
  parent_dir: string;
  subdir_name: string;
  loader_site_refs: string[];
}

// Shape of the JSON bundle emitted by build-asset-bundle.ts and consumed
// by load-assets.
export interface AssetBundle {
  project: Project;
  version: string;
  client_defaults?: ClientDefaults;
  asset_categories: Record<string, AssetCategoryEntry>;
  asset_extensions: Omit<AssetExtensionRow, 'project' | 'version' | 'extracted_at'>[];
  asset_path_rules: Omit<AssetPathRuleRow, 'project' | 'version' | 'extracted_at'>[];
  asset_cvar_bindings: Omit<AssetCvarBindingRow, 'project' | 'version' | 'extracted_at'>[];
  asset_loader_sites: Omit<AssetLoaderSiteRow, 'project' | 'version' | 'extracted_at'>[];
  reserved_subdirs?: ReservedSubdirEntry[];
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
  server_only: boolean;
  source_root: string | null;

  raw_ast_hash: string | null;
  extracted_at: string;

  // L1 runtime-fidelity provenance (migration 015). Track-A reachability
  // only -- there is NO track_b_hud_recovery on cvar_versions (D11/D21:
  // Track-B is COMMANDS ONLY). NULL == D13 level-1; owned by the Track-A
  // overlay (load-callgraph-reachability.ts), so the per-type cvar loader
  // leaves it null. Same locked three-slot spine as the command column.
  track_a_reachability: object | null;
}

export interface ReleaseNoteRow {
  project: Project;
  version: string;
  section: string;
  ordinal: number;
  body_md: string;
  // JSONB arrays. NULL when the bullet has no entries of that kind.
  referenced_entity_ids_json: string[] | null;
  commit_urls_json: string[] | null;
  pr_numbers_json: number[] | null;
  author_handles_json: string[] | null;
  raw_body_hash: string | null;
  extracted_at: string;
}

// --- Phase 2f Batch 2: flag_bit + relation_changes ---------------------------

export type FlagBitFamily =
  | 'cvar_flag'
  | 'fpd_flag'
  | 'stat_const'
  | 'other';

export interface FlagBitAstBlock {
  bitmask_family: FlagBitFamily;
  value_raw: string;
  value_numeric: number | null;
  source_file: string;
  source_line: number;
}

export interface FlagBitEntry {
  ast: FlagBitAstBlock | null;
}

export interface FlagBitExtractorOutput {
  flag_bits: Record<string, FlagBitEntry>;
  _stats?: Record<string, unknown>;
}

export interface FlagBitVersionRow {
  entity_id: number;
  version: string;
  bitmask_family: FlagBitFamily;
  value_raw: string | null;
  value_numeric: number | null;
  source_file: string | null;
  source_line: number | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

export type RelationTable =
  | 'asset_extensions'
  | 'asset_path_rules'
  | 'asset_cvar_bindings'
  | 'asset_loader_sites';

export interface RelationChangeRow {
  relation_table: RelationTable;
  project: Project;
  from_version: string | null;
  to_version: string;
  change_kind: ChangeKind;
  row_key_json: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  commit_sha: string;
  commit_message_excerpt: string | null;
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

// --- Cross-engine alias types (schema v12) ---------------------------------
//
// Spec: docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md.
// One cvar_alias entity row per LHS name; per-version table holds target
// descriptors, semantic mapping, and verification stamp.

export type CvarAliasTargetKind =
  | 'cvar'
  | 'command'
  | 'macro'
  | 'serverinfo'
  | 'userinfo';

export type CvarAliasValueTransform =
  | 'identity'
  | 'bool_flip'
  | 'scale'
  | 'enum_remap'
  | 'needs_review';

export type CvarAliasDefaultDriftStatus =
  | 'same'
  | 'differ_safe'
  | 'differ_dangerous'
  | 'unknown';

export type CvarAliasSemanticConfidence =
  | 'high'
  | 'medium'
  | 'low'
  | 'needs_review';

export type CvarAliasFreshnessState =
  | 'alive'
  | 'target_gone'
  | 'mimics_lhs_gone'
  | 'both_gone'
  | 'unknown';

export interface CvarAliasAstBlock {
  source_file: string;
  source_line: number;
  source_column: number;
}

export interface CvarAliasEntry {
  ast: CvarAliasAstBlock | null;
  target_project: Project;
  target_kind: CvarAliasTargetKind;
  target_name: string;
  mimics_project?: Project | null;
  value_transform?: CvarAliasValueTransform;
  value_transform_params?: unknown;
  default_drift_status?: CvarAliasDefaultDriftStatus;
  semantic_confidence?: CvarAliasSemanticConfidence;
  verified_target_version?: string | null;
  verified_mimics_version?: string | null;
  freshness_state?: CvarAliasFreshnessState;
  source_root?: string;
}

export interface CvarAliasExtractorOutput {
  aliases: Record<string, CvarAliasEntry>;
  _stats?: Record<string, unknown>;
}

export interface CvarAliasVersionRow {
  entity_id: number;
  version: string;
  target_project: Project;
  target_kind: CvarAliasTargetKind;
  target_name: string;
  target_canonical_id: string | null;
  mimics_project: Project | null;
  value_transform: CvarAliasValueTransform;
  value_transform_params_json: string | null;
  default_drift_status: CvarAliasDefaultDriftStatus;
  semantic_confidence: CvarAliasSemanticConfidence;
  verified_target_version: string | null;
  verified_mimics_version: string | null;
  freshness_state: CvarAliasFreshnessState;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  source_root: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}

// --- Phase 2f Batch 3: source_overrides ---------------------------

export type SourceOverrideKind =
  | 'struct_field_decl'
  | 'call_site'
  | 'header_declaration';

export interface SourceOverrideRow {
  entity_id: number;
  version: string;
  field_name: string;
  source_file: string;
  source_line: number;
  source_column: number | null;
  override_kind: SourceOverrideKind;
  extracted_at: string;
}

// --- Phase 2g: maps table --------------------------------------------------

export interface MapRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: 'V29' | 'BSP2';
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn_json: string;
  entity_count: number;
  class_counts_json: string;
  item_summary_json: string;
  spawn_summary_json: string;
  features_json: string;
  wads_referenced_json: string;
  inferred_gamemodes_json: string;
  popularity_total: number | null;
  popularity_by_mode_json: string | null;
  popularity_rank: number | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

// --- enforce-L1-runtime-truth Phase 3: extractor signal-file shapes -------
//
// Two additive extractor outputs feed the two new JSONB columns. Both are
// ezQuake-only (the per-fork extractor directory is the gate -- D22) and
// loaded outside the EntityType dispatch loop (3b/3c precedent in
// extract-tag.ts). The loader trusts these shapes as the handlers'/seam's
// contract; no re-derivation (F5 OPAQUE round-trip -- shape only).

// Track-A: the 10th file `ezquake-callgraph-reachability-ast.json`, written
// by emit_callgraph_signal.py. Keyed by `<type>::<name>` so the loader joins
// to entities by (project='ezquake', type, name_fold). Each value is ALREADY
// the locked three-slot Track-A spine -- the seam applied the mechanism->L1
// transform (a)-(e); the loader copies it through verbatim.
export interface CallgraphReachabilitySpine {
  conclusion: 'genuine-dead' | 'build-excluded';
  evidence:
    | {
        feeder: 'callgraph';
        per_variant: {
          client: string;
          server: string;
          win: string;
          apple: string;
        };
        address_taken_residue: boolean;
      }
    | {
        feeder: 'commented-register';
        register_site: { source_file: string; source_line: number };
      };
  // The emit seam writes the level-2 constant 'high-confidence-generalized'
  // for EVERY populated row. The Task-4 stage-2 loader flips ONLY this key
  // to 'dump-confirmed' (level-3) for the dump-confirmed names -- in-memory,
  // before the existing upsert (CARRY-FORWARD 1: slot-3 is the ONLY field
  // that differs L2 vs L3; conclusion + evidence re-emitted verbatim). The
  // union admits both so the stamped value type-checks.
  dump_confirmation: 'high-confidence-generalized' | 'dump-confirmed';
}

// enforce-L1-runtime-truth Phase 4 / Task 3-4.
//
// The SHIPPED stage-2 stamp-set artifact, written by
// extractor_lib._acceptance.run_stage2 to
// apps/qw-oracle/data/detection/level3-stamp-set-<pin>.json. The Task-4
// loaders (load-callgraph-reachability.ts / load-hud-commands.ts) read it
// and flip dump_confirmation -> 'dump-confirmed' (level-3) for the names it
// lists. `proxy` is 'PASS' only when the version-pin proxy + stage-1 both
// held; 'FAIL' means EMPTY confirmed lists (broken pin / RED mechanism ->
// nothing stamped -> every row stays Phase-3 level-2). Locked schema.
export interface Level3StampSet {
  validated_commit: string;
  proxy: 'PASS' | 'FAIL';
  track_a_dump_confirmed: string[];
  track_b_dump_confirmed: string[];
  static_dead_overridden_by_dump: string[];
  counts: Record<string, number>;
}

// The SHIPPED acceptance validation record, written by
// extractor_lib._acceptance.run_stage1 to
// apps/qw-oracle/data/detection/acceptance-validated-<fork>.json. The D22
// gate consults it; the Task-4 loaders read `status` (must be 'GREEN') and
// `validation_commit` (the SHORT pin token -- prefix-tolerant vs the full
// oracle_meta hash). Locked schema.
export interface AcceptanceValidationRecord {
  fork: string;
  validation_commit: string;
  status: 'GREEN' | 'RED';
  probes: Record<string, unknown>;
  validated_at: string;
}
export interface CallgraphReachabilityFile {
  project: 'ezquake';
  // entries[<type>::<name>] -> the locked Track-A spine. `type` is 'cvar' |
  // 'command'; `name` is the SOURCE-case entity name (the loader folds it).
  entries: Record<string, { type: 'cvar' | 'command'; name: string; spine: CallgraphReachabilitySpine }>;
  _stats?: Record<string, unknown>;
}

// Track-B: the 9th file `ezquake-hud-commands-ast.json`, written by
// _handler_hud.py's finalize(). `hud_commands` is a dict keyed by the
// recovered command name; each entry carries the HUD family/element and the
// AST site. The Track-B adapter (load-hud-commands.ts) maps this to a
// command_versions row PLUS the track_b_hud_recovery spine (transform f-l).
export interface HudCommandEntry {
  hud_family: 'bare' | 'plus' | 'minus';
  hud_element: string;
  ast: {
    handler_fn: 'HUD_Func_f' | 'HUD_Plus_f' | 'HUD_Minus_f';
    source_file: string;
    source_line: number;
    source_column: number;
    enclosing_function: string | null;
    build_variant: string;
    registration_api: 'Cmd_AddCommand' | 'Cmd_AddRemCommand';
  };
}
export interface HudCommandsFile {
  hud_commands: Record<string, HudCommandEntry>;
  r1?: Record<string, unknown>;
  _stats?: Record<string, unknown>;
}
