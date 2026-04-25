import { knowledgeDb } from '../db.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import type { EntityRecord, EntityType, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.2.0';

interface SearchEntitiesArgs {
  query: string;
  project?: string;
  type?: EntityType;
  limit?: number;
}

const VERSION_TABLE: Record<EntityType, string> = {
  cvar: 'cvar_versions',
  command: 'command_versions',
  macro: 'macro_versions',
  cmdline_param: 'cmdline_param_versions',
  ruleset: 'ruleset_versions',
};

const ALL_TYPES: EntityType[] = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'];

function buildFilters(args: SearchEntitiesArgs, params: (string | number)[]): string[] {
  const filters: string[] = [];
  if (args.project) {
    filters.push(`e.project = ?${params.length + 1}`);
    params.push(args.project);
  }
  if (args.type) {
    filters.push(`e.type = ?${params.length + 1}`);
    params.push(args.type);
  } else {
    filters.push("e.type IN ('cvar','command','macro','cmdline_param','ruleset')");
  }
  return filters;
}

// Name match comes first, ranked highest. Substring match against canonical
// name in the entities table; one query covers all five types.
function nameMatchEntities(args: SearchEntitiesArgs, limit: number): EntityRow[] {
  const params: (string | number)[] = [`%${args.query}%`];
  const filters = buildFilters(args, params);
  filters.unshift('e.name LIKE ?1 COLLATE NOCASE');
  params.push(limit);
  const sql = `
    SELECT e.id, e.canonical_id, e.project, e.type, e.name, e.source_state,
           e.first_seen_version, e.last_seen_version
    FROM entities e
    WHERE ${filters.join(' AND ')}
    ORDER BY e.name
    LIMIT ?${params.length}
  `;
  return knowledgeDb.prepare(sql).all(...params) as unknown as EntityRow[];
}

// Description match: per-type, joining each version table at last_seen_version.
// Run only for types in scope, only up to the remaining quota.
function descriptionMatchEntities(
  args: SearchEntitiesArgs,
  remaining: number,
  exclude: Set<string>,
): EntityRow[] {
  if (remaining <= 0) return [];
  const types = args.type ? [args.type] : ALL_TYPES;
  const out: EntityRow[] = [];
  for (const t of types) {
    if (out.length >= remaining) break;
    const slots = remaining - out.length;
    const versionTable = VERSION_TABLE[t];
    const params: (string | number)[] = [`%${args.query}%`, t];
    const projectFilter = args.project ? `AND e.project = ?${params.length + 1}` : '';
    if (args.project) params.push(args.project);
    params.push(slots);
    const sql = `
      SELECT e.id, e.canonical_id, e.project, e.type, e.name, e.source_state,
             e.first_seen_version, e.last_seen_version
      FROM entities e
      JOIN ${versionTable} v ON v.entity_id = e.id AND v.version = e.last_seen_version
      WHERE v.help_desc LIKE ?1 COLLATE NOCASE
        AND e.type = ?2
        ${projectFilter}
      ORDER BY e.name
      LIMIT ?${params.length}
    `;
    const rows = knowledgeDb.prepare(sql).all(...params) as unknown as EntityRow[];
    for (const r of rows) {
      if (!exclude.has(r.canonical_id)) out.push(r);
    }
  }
  return out;
}

export function searchEntities(
  args: SearchEntitiesArgs,
  conceptIndex: Map<string, string[]>,
): ToolResponse<EntityRecord> {
  const limit = Math.min(args.limit ?? 10, 25);

  const nameMatches = nameMatchEntities(args, limit);
  const seen = new Set(nameMatches.map((e) => e.canonical_id));
  const descMatches = descriptionMatchEntities(args, limit - nameMatches.length, seen);

  const allRows = [...nameMatches, ...descMatches];
  const results = allRows.map((e) => toEntityRecord(e, conceptIndex));

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) {
    matchQuality = 'none';
  } else if (nameMatches.length > 0) {
    matchQuality = 'strong';
  } else {
    matchQuality = 'weak';
  }

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No entities match "${args.query}". Try a broader term or search_solved_issues for Layer 2 community discussion.`
        : null,
    meta: {
      tool: 'search_entities',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
