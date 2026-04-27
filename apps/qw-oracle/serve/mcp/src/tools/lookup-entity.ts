import { knowledgeDb } from '../db.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import type { EntityRecord, EntityType, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface LookupEntityArgs {
  name: string;
  project?: string;
  type?: EntityType;
}

function fetchEntities(args: LookupEntityArgs): EntityRow[] {
  const filters: string[] = ['name = ?1 COLLATE NOCASE'];
  const params: (string | number)[] = [args.name];
  if (args.project) {
    filters.push(`project = ?${params.length + 1}`);
    params.push(args.project);
  }
  if (args.type) {
    filters.push(`type = ?${params.length + 1}`);
    params.push(args.type);
  } else {
    filters.push("type IN ('cvar','command','macro','cmdline_param','ruleset')");
  }
  const sql = `
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version
    FROM entities
    WHERE ${filters.join(' AND ')}
  `;
  return knowledgeDb.prepare(sql).all(...params) as unknown as EntityRow[];
}

export function lookupEntity(
  args: LookupEntityArgs,
  conceptIndex: Map<string, string[]>,
): ToolResponse<EntityRecord> {
  const entities = fetchEntities(args);
  const results = entities.map((e) => toEntityRecord(e, conceptIndex));

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) {
    matchQuality = 'none';
  } else if (results.some((r) => r.current.help_desc && r.current.help_desc.length > 20)) {
    matchQuality = 'strong';
  } else {
    matchQuality = 'weak';
  }

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No entity named "${args.name}" in Layer 1. Try search_entities with a substring, or search_solved_issues for community discussion.`
        : null,
    meta: {
      tool: 'lookup_entity',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
