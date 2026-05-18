// apps/qw-oracle/scripts/load-knowledge/load-cvars.ts
//
// Per-type adapter for cvar entities. Factored out of the original
// load-version.ts so the orchestrator can dispatch uniformly across cvar /
// command / macro / cmdline_param types.

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertCvarVersion } from './natural-keys.js';
import type {
  CvarVersionRow,
  ExtractorOutput,
  SourceOverrideRow,
  VariableEntry,
} from './types.js';

export const CVAR_PAYLOAD_FIELD = 'vars';

// For cvars the "source-backed" signal is `entry.ast !== null` -- AST
// extractors emit ast=null for help-only (doc-only) entries.
export function cvarIsSourceBacked(entry: VariableEntry): boolean {
  return entry.ast !== null;
}

export function buildCvarVersionRow(
  entityId: number,
  version: string,
  entry: VariableEntry,
  now: string,
): CvarVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,

    help_desc: entry.desc ?? null,
    help_remarks: entry.remarks ?? null,
    help_values: entry.values == null ? null : JSON.stringify(entry.values),
    help_group_id: entry['group-id'] ?? null,
    help_type: entry.type ?? null,

    // Prefer the help-JSON top-level `default` (ezQuake/FTE convention) but
    // fall back to ast.default_value for AST-only emitters (MVDSV) which carry
    // the literal in the ast struct rather than in a help-JSON envelope.
    default_value: entry.default != null
      ? String(entry.default)
      : (ast?.default_value ?? null),
    flags_raw: ast?.flags_raw ?? null,
    flag_names: ast?.flag_names ? JSON.stringify(ast.flag_names) : null,
    on_change: ast?.on_change ?? null,
    min_bound: ast?.min_bound ?? null,
    max_bound: ast?.max_bound ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    storage_class: ast?.storage_class ?? null,
    group_name_in_source: ast?.group_name_in_source ?? null,
    trailing_comment: ast?.trailing_comment ?? null,
    server_only: !!entry['server-only'],
    // FTE entries carry source_root as a top-level field; ezQuake/QWCL entries
    // have no source_root field (NULL = "engine" per SCHEMA.md semantics).
    source_root: entry.source_root ?? null,

    raw_ast_hash,
    extracted_at: now,

    // L1 runtime-fidelity provenance (migration 015). The per-type cvar
    // loader NEVER populates this -- the Track-A overlay
    // (load-callgraph-reachability.ts) owns it via a separate post-loop
    // upsert. Carrying the nullable field keeps the shared row shape
    // compiling; a normal load leaves the column NULL (D13 level-1). The
    // upsert COALESCEs so this null does not clobber an overlay value.
    track_a_reachability: null,
  };
}

export async function upsertCvarRow(tx: postgres.TransactionSql<{}>, row: CvarVersionRow): Promise<void> {
  await upsertCvarVersion(tx, row);
}

export function buildCvarOverrides(
  entityId: number,
  version: string,
  _entry: VariableEntry,
  now: string,
  payload: ExtractorOutput,
  nameLowered: string,
): SourceOverrideRow[] {
  const sites = payload.default_overrides?.[nameLowered];
  // Emit one override per cvar; if multiple call sites, pick the first
  // (deterministic and sufficient for blame -- git blame handles multi-commit
  // histories via log).
  const first = sites?.[0];
  if (!first) return [];
  return [{
    entity_id: entityId,
    version,
    field_name: 'default_value',
    source_file: first.source_file,
    source_line: first.source_line,
    source_column: null,
    override_kind: 'call_site',
    extracted_at: now,
  }];
}
