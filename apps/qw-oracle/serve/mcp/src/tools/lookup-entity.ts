// apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts

import { db } from '../db.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import { ENTITY_TYPES, type EntityRecord, type EntityType, type ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface LookupEntityArgs {
  name: string;
  project?: string;
  type?: EntityType | string;
}

const USER_FACING_TYPES = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'] as const;

// allKinds: the fallback pass for a caller who passed no type -- every public
// kind (ENTITY_TYPES; the internal classifier kinds stay out, API_CONTRACTS
// A2), and a bare name also matches scoped names (`sound` ->
// `sound:std_builtins`, an info_key `name:scope`).
async function fetchEntities(args: LookupEntityArgs, allKinds = false): Promise<EntityRow[]> {
  // Phase B 2026-04-28 cross-scope info_key lookup: bare names without `:`
  // expand to LIKE `<bare>:%` so callers don't have to know the scope.
  const isInfoKeyBareLookup = args.type === 'info_key' && !args.name.includes(':');
  const isScopedBareLookup = allKinds && !args.type && !args.name.includes(':');

  const projectClause = args.project ? db`AND project = ${args.project}` : db``;
  const typeClause = args.type
    ? db`AND type = ${args.type}`
    : db`AND type IN ${db(allKinds ? ENTITY_TYPES : USER_FACING_TYPES)}`;
  // Match the structural fold key (entities.name_fold, migration 013), not
  // `name`. name_fold is case-insensitive by construction for every type
  // except token_primitive (case-significant: $B vs $b), so we fold the
  // input the same way. Exact `=` instead of ILIKE also removes the latent
  // bug where `_`/`%` in a name (e.g. cl_foo) acted as LIKE wildcards.
  const lc = args.name.toLowerCase();
  const nameClause = isInfoKeyBareLookup
    ? db`split_part(name_fold, ':', 1) = ${lc}`
    : isScopedBareLookup
      ? db`(name_fold = ${lc} OR split_part(name_fold, ':', 1) = ${lc})`
      : args.type === 'token_primitive'
      ? db`name_fold = ${args.name}`
      : db`name_fold = ${lc}`;

  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version, description
    FROM entities
    WHERE ${nameClause}
      ${projectClause}
      ${typeClause}
  `;
}

// Spellings a caller plausibly means when the typed name is not stored as-is:
// cmdline params and +/- commands carry their sign (`democache` is stored as
// `-democache`), and a HUD element's own command drops the `hud_` its cvars
// carry (`hud_itemsclock` -> the `itemsclock` command).
function nameVariants(name: string): string[] {
  const variants: string[] = [];
  if (/^[+-]/.test(name)) variants.push(name.slice(1));
  else variants.push(`-${name}`, `+${name}`);
  if (/^hud_/i.test(name)) variants.push(name.slice(4));
  return variants;
}

// Callers rarely pass `type`, so a name outside the default kinds, or typed
// without its stored sign or prefix, used to come back 'none' although the
// entity exists. Exact matches in the default kinds always win; the wider
// passes run only when those find nothing.
async function fetchWithFallback(args: LookupEntityArgs): Promise<EntityRow[]> {
  const exact = await fetchEntities(args);
  if (exact.length > 0 || args.type) return exact;
  const anyKind = await fetchEntities(args, true);
  if (anyKind.length > 0) return anyKind;
  for (const variant of nameVariants(args.name)) {
    const hits = await fetchEntities({ ...args, name: variant }, true);
    if (hits.length > 0) return hits;
  }
  return [];
}

export async function lookupEntity(args: LookupEntityArgs): Promise<ToolResponse<EntityRecord>> {
  const entities = await fetchWithFallback(args);
  const results = await Promise.all(entities.map((e) => toEntityRecord(e)));

  // Strong = owned L1 description present OR raw extractor help_desc is non-trivial.
  // The owned description (entities.description, populated by describe-fill arcs +
  // hand-walks) is the higher-quality signal when present; help_desc is the
  // extractor's raw CD_ string / source comment, which for KTX is often a one-liner
  // and for ezQuake is the help_commands.json content.
  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) matchQuality = 'none';
  else if (results.some((r) => (r.description && r.description.length > 20) || (r.current.help_desc && r.current.help_desc.length > 20))) matchQuality = 'strong';
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
