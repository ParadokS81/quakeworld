// apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts

import { db } from '../db.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import type { EntityRecord, EntityType, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface LookupEntityArgs {
  name: string;
  project?: string;
  type?: EntityType | string;
}

const USER_FACING_TYPES = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'] as const;

async function fetchEntities(args: LookupEntityArgs): Promise<EntityRow[]> {
  // Phase B 2026-04-28 cross-scope info_key lookup: bare names without `:`
  // expand to LIKE `<bare>:%` so callers don't have to know the scope.
  const isInfoKeyBareLookup = args.type === 'info_key' && !args.name.includes(':');

  const projectClause = args.project ? db`AND project = ${args.project}` : db``;
  const typeClause = args.type
    ? db`AND type = ${args.type}`
    : db`AND type IN ${db(USER_FACING_TYPES)}`;
  // Match the structural fold key (entities.name_fold, migration 013), not
  // `name`. name_fold is case-insensitive by construction for every type
  // except token_primitive (case-significant: $B vs $b), so we fold the
  // input the same way. Exact `=` instead of ILIKE also removes the latent
  // bug where `_`/`%` in a name (e.g. cl_foo) acted as LIKE wildcards.
  const lc = args.name.toLowerCase();
  const nameClause = isInfoKeyBareLookup
    ? db`split_part(name_fold, ':', 1) = ${lc}`
    : args.type === 'token_primitive'
      ? db`name_fold = ${args.name}`
      : db`name_fold = ${lc}`;

  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version
    FROM entities
    WHERE ${nameClause}
      ${projectClause}
      ${typeClause}
  `;
}

export async function lookupEntity(args: LookupEntityArgs): Promise<ToolResponse<EntityRecord>> {
  const entities = await fetchEntities(args);
  const results = await Promise.all(entities.map((e) => toEntityRecord(e)));

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) matchQuality = 'none';
  else if (results.some((r) => r.current.help_desc && r.current.help_desc.length > 20)) matchQuality = 'strong';
  else matchQuality = 'weak';

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
