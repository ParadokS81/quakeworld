import { db } from '../db.ts';
import type { EntityRecord, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.1.0';

interface SearchEntitiesArgs {
  query: string;
  project?: string;
  type?: 'cvar' | 'command';
  limit?: number;
}

interface RawCvarRow {
  id: string;
  project: string;
  name: string;
  type: string | null;
  default_value: string | null;
  description: string | null;
  group_name: string | null;
  major_group: string | null;
  source_file: string | null;
  extraction_method: string;
}

interface RawCmdRow {
  id: string;
  project: string;
  name: string;
  description: string | null;
  group_name: string | null;
  extraction_method: string;
}

function cvarToEntity(r: RawCvarRow, conceptIndex: Map<string, string[]>): EntityRecord {
  return {
    id: r.id,
    type: 'cvar',
    project: r.project,
    name: r.name,
    value_type: r.type,
    default_value: r.default_value,
    description: r.description,
    group_name: r.group_name,
    major_group: r.major_group,
    source_file: r.source_file,
    extraction_method: r.extraction_method,
    linked_concepts: conceptIndex.get(r.id) ?? [],
  };
}

function cmdToEntity(r: RawCmdRow, conceptIndex: Map<string, string[]>): EntityRecord {
  return {
    id: r.id,
    type: 'command',
    project: r.project,
    name: r.name,
    value_type: null,
    default_value: null,
    description: r.description,
    group_name: r.group_name,
    major_group: null,
    source_file: null,
    extraction_method: r.extraction_method,
    linked_concepts: conceptIndex.get(r.id) ?? [],
  };
}

// Substring search on name and description. Name matches rank higher
// than description-only matches via ORDER BY.
export function searchEntities(
  args: SearchEntitiesArgs,
  conceptIndex: Map<string, string[]>,
): ToolResponse<EntityRecord> {
  const limit = Math.min(args.limit ?? 10, 25);
  const pattern = `%${args.query}%`;

  const wantCvars = args.type !== 'command';
  const wantCmds = args.type !== 'cvar';
  const results: EntityRecord[] = [];

  if (wantCvars) {
    const sql = args.project
      ? `SELECT id, project, name, type, default_value, description, group_name, major_group, source_file, extraction_method
         FROM kb_cvars WHERE (name LIKE ?1 OR description LIKE ?1) AND project = ?2
         ORDER BY (name LIKE ?1) DESC, name
         LIMIT ?3`
      : `SELECT id, project, name, type, default_value, description, group_name, major_group, source_file, extraction_method
         FROM kb_cvars WHERE name LIKE ?1 OR description LIKE ?1
         ORDER BY (name LIKE ?1) DESC, name
         LIMIT ?2`;

    const rows = (args.project
      ? db.prepare(sql).all(pattern, args.project, limit)
      : db.prepare(sql).all(pattern, limit)) as unknown as RawCvarRow[];
    for (const r of rows) results.push(cvarToEntity(r, conceptIndex));
  }

  if (wantCmds) {
    const remaining = limit - results.length;
    if (remaining <= 0) {
      // Already at limit from cvars
    } else {
      const sql = args.project
        ? `SELECT id, project, name, description, group_name, extraction_method
           FROM kb_commands WHERE (name LIKE ?1 OR description LIKE ?1) AND project = ?2
           ORDER BY (name LIKE ?1) DESC, name
           LIMIT ?3`
        : `SELECT id, project, name, description, group_name, extraction_method
           FROM kb_commands WHERE name LIKE ?1 OR description LIKE ?1
           ORDER BY (name LIKE ?1) DESC, name
           LIMIT ?2`;

      const rows = (args.project
        ? db.prepare(sql).all(pattern, args.project, remaining)
        : db.prepare(sql).all(pattern, remaining)) as unknown as RawCmdRow[];
      for (const r of rows) results.push(cmdToEntity(r, conceptIndex));
    }
  }

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) {
    matchQuality = 'none';
  } else if (results.some((r) => r.name.toLowerCase().includes(args.query.toLowerCase()))) {
    matchQuality = 'strong';
  } else {
    matchQuality = 'weak';
  }

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No cvars or commands matching "${args.query}" in Layer 1. Try broader terms or search_solved_issues for Layer 2 discussion.`
        : null,
    meta: {
      tool: 'search_entities',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
