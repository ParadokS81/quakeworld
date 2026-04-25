import { knowledgeDb } from './db.ts';
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
  type: EntityType;
  name: string;
  source_state: SourceState;
  first_seen_version: string;
  last_seen_version: string;
}

const VERSION_TABLE: Record<EntityType, string> = {
  cvar: 'cvar_versions',
  command: 'command_versions',
  macro: 'macro_versions',
  cmdline_param: 'cmdline_param_versions',
  ruleset: 'ruleset_versions',
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

function fetchVersionData(entity: EntityRow): EntityVersionData {
  const table = VERSION_TABLE[entity.type];
  const row = knowledgeDb
    .prepare(`SELECT * FROM ${table} WHERE entity_id = ? AND version = ?`)
    .get(entity.id, entity.last_seen_version) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      version: entity.last_seen_version,
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

const selectAssetRelations = knowledgeDb.prepare(`
  SELECT b.category_id, b.path_pattern, b.load_trigger, b.source_ref,
         (SELECT GROUP_CONCAT(extension, ',')
          FROM asset_extensions e
          WHERE e.category_id = b.category_id AND e.project = b.project AND e.version = b.version
         ) AS extensions
  FROM asset_cvar_bindings b
  WHERE b.cvar_canonical_id = ? AND b.project = ? AND b.version = ?
`);

interface AssetRelationRow {
  category_id: string;
  path_pattern: string | null;
  load_trigger: string;
  source_ref: string | null;
  extensions: string | null;
}

function fetchAssetRelations(entity: EntityRow): AssetRelation[] {
  if (entity.type !== 'cvar') return [];
  const rows = selectAssetRelations.all(
    entity.canonical_id,
    entity.project,
    entity.last_seen_version,
  ) as unknown as AssetRelationRow[];
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

export function toEntityRecord(
  entity: EntityRow,
  conceptIndex: Map<string, string[]>,
): EntityRecord {
  return {
    id: entity.canonical_id,
    type: entity.type,
    project: entity.project,
    name: entity.name,
    source_state: entity.source_state,
    first_seen_version: entity.first_seen_version,
    last_seen_version: entity.last_seen_version,
    current: fetchVersionData(entity),
    asset_relations: fetchAssetRelations(entity),
    linked_concepts: conceptIndex.get(entity.canonical_id) ?? [],
  };
}
