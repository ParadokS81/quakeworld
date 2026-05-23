// apps/qw-oracle/serve/mcp/src/entity-record.ts
//
// Single helper that materialises an entities-row hit into the
// EntityRecord shape returned by lookup_entity and search_entities.
// The conceptIndex Map went away with Phase 4's bidirectional graph;
// linked_concepts now comes from a SELECT against concept_entities.

import { db } from './db.ts';
import type {
  AssetRelation,
  EntityRecord,
  EntityType,
  EntityVersionData,
  SourceState,
} from './types.ts';

export interface EntityRow {
  id: number;
  canonical_id: string;
  project: string;
  type: EntityType | string; // accept v15+ server-side types (info_key, protocol_message, log_template, qc_builtin)
  name: string;
  source_state: SourceState;
  first_seen_version: string;
  last_seen_version: string;
  description: string | null;
}

// Per-type *_versions table. Server-side types from schema v15+ (info_key,
// protocol_message, log_template, qc_builtin) are wired so lookup_entity
// can return rich records for them too.
const VERSION_TABLE: Record<string, string> = {
  cvar: 'cvar_versions',
  command: 'command_versions',
  macro: 'macro_versions',
  cmdline_param: 'cmdline_param_versions',
  ruleset: 'ruleset_versions',
  info_key: 'info_key_versions',
  protocol_message: 'protocol_message_versions',
  log_template: 'log_template_versions',
  qc_builtin: 'qc_builtin_versions',
};

const CONSUMED_VERSION_KEYS = new Set([
  'entity_id',
  'version',
  'help_desc',
  'help_remarks',
  'help_type',
  'default_value',
  'flag_names',
  'source_file',
  'source_line',
  'raw_ast_hash',
  'extracted_at',
]);

function emptyVersion(version: string): EntityVersionData {
  return {
    version,
    help_desc: null,
    help_remarks: null,
    help_type: null,
    default_value: null,
    flag_names: null,
    source_file: null,
    source_line: null,
    type_specific: {},
  };
}

async function fetchVersionData(entity: EntityRow): Promise<EntityVersionData> {
  const table = VERSION_TABLE[entity.type];
  if (!table) return emptyVersion(entity.last_seen_version);

  // Table name is from a closed allow-list so direct interpolation is safe;
  // postgres-js does not parameterise identifiers.
  const rows = await db.unsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${table} WHERE entity_id = $1 AND version = $2`,
    [entity.id, entity.last_seen_version],
  );
  const row = rows[0];
  if (!row) return emptyVersion(entity.last_seen_version);

  const type_specific: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!CONSUMED_VERSION_KEYS.has(k) && v !== null) type_specific[k] = v;
  }

  return {
    version: entity.last_seen_version,
    help_desc: (row.help_desc as string | null) ?? null,
    help_remarks: (row.help_remarks as string | null) ?? null,
    help_type: (row.help_type as string | null) ?? null,
    default_value: (row.default_value as string | null) ?? null,
    flag_names: (row.flag_names as string | null) ?? null,
    source_file: (row.source_file as string | null) ?? null,
    source_line: (row.source_line as number | null) ?? null,
    type_specific,
  };
}

interface AssetRelationRow {
  category_id: string;
  path_pattern: string | null;
  load_trigger: string;
  source_ref: string | null;
  extensions: string | null;
}

async function fetchAssetRelations(entity: EntityRow): Promise<AssetRelation[]> {
  if (entity.type !== 'cvar') return [];
  const rows = await db<AssetRelationRow[]>`
    SELECT b.category_id,
           b.path_pattern,
           b.load_trigger,
           b.source_ref,
           (SELECT string_agg(extension, ',')
            FROM asset_extensions e
            WHERE e.category_id = b.category_id
              AND e.project = b.project
              AND e.version = b.version
           ) AS extensions
    FROM asset_cvar_bindings b
    WHERE b.cvar_canonical_id = ${entity.canonical_id}
      AND b.project = ${entity.project}
      AND b.version = ${entity.last_seen_version}
  `;
  return rows.map((r) => {
    const categoryName = r.category_id.split(':').pop() ?? r.category_id;
    const [file, line] = (r.source_ref ?? '').split(':');
    return {
      category: categoryName,
      extension: r.extensions,
      loader_site: r.path_pattern,
      source_file: file || null,
      source_line: line ? Number(line) : null,
    };
  });
}

async function fetchLinkedConcepts(entity: EntityRow): Promise<string[]> {
  const rows = await db<{ concept_slug: string }[]>`
    SELECT concept_slug
    FROM concept_entities
    WHERE entity_canonical_id = ${entity.canonical_id}
    ORDER BY concept_slug
  `;
  return rows.map((r) => `concept:${r.concept_slug}`);
}

export async function toEntityRecord(entity: EntityRow): Promise<EntityRecord> {
  const [current, asset_relations, linked_concepts] = await Promise.all([
    fetchVersionData(entity),
    fetchAssetRelations(entity),
    fetchLinkedConcepts(entity),
  ]);
  return {
    id: entity.canonical_id,
    type: entity.type as EntityType,
    project: entity.project,
    name: entity.name,
    source_state: entity.source_state,
    first_seen_version: entity.first_seen_version,
    last_seen_version: entity.last_seen_version,
    description: entity.description,
    current,
    asset_relations,
    linked_concepts,
  };
}
