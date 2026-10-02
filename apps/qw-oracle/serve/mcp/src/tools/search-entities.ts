// apps/qw-oracle/serve/mcp/src/tools/search-entities.ts
//
// Hybrid retrieval: tsvector (description_tsv, 'english' config from Phase 2)
// + pgvector kNN (description_embedding) + a name-match list, all fused with
// Reciprocal Rank Fusion. The description legs cannot see a query that IS (or
// contains) an entity's name, nor any entity that has no description, so the
// name list is the third vote -- see nameCandidates. The SQLite-era substring
// fallback is retired: vague queries land in the vector path.

import { db } from '../db.ts';
import { embedTexts } from '../../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../../shared/rrf.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import { queryTokens } from '../token-match.ts';
import type { EntityRecord, EntityType, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
// Defaults reflect calibration against eval/calibration-queries.json (last
// sweep 2026-05-06: STRONG=0.02 WEAK=0.005 hit 100% accuracy on the 5-query
// set). Operator overrides via MATCH_QUALITY_* env vars; recalibrate after
// any eval-set extension via `bun run calibrate`.
const STRONG_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_STRONG_THRESHOLD ?? '0.02');
const WEAK_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_WEAK_THRESHOLD ?? '0.005');

const USER_FACING_TYPES = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'] as const;

// Name-match knobs (see nameCandidates). A word shorter than the minimum only
// counts as a partial name match when it IS the name: as a substring, 'to' or
// 'on' would hit half the catalog. In a description-style query a word names an
// entity only if few names carry it: 'smackdown' or 'tp_msgreport' point at one
// thing, while 'crosshair', 'set' or 'color' are vocabulary shared by dozens of
// names and say nothing about which one is meant.
const EXACT_NAME_TIER = 2;
const MIN_PARTIAL_NAME_LENGTH = 3;
const MAX_NAMES_PER_DISTINCTIVE_WORD = 5;

interface Args {
  query: string;
  project?: string;
  type?: EntityType | string;
  limit?: number;
}

// The project/type restriction every leg applies, so the three lists rank the
// same candidate pool.
function scopeClauses(args: Args) {
  return {
    projectClause: args.project ? db`AND project = ${args.project}` : db``,
    typeClause: args.type
      ? db`AND type = ${args.type}`
      : db`AND type IN ${db(USER_FACING_TYPES)}`,
  };
}

async function lexicalCandidates(args: Args, fanout: number): Promise<EntityRow[]> {
  const { projectClause, typeClause } = scopeClauses(args);
  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version, description
    FROM entities
    WHERE description_tsv @@ websearch_to_tsquery('english', ${args.query})
      ${projectClause}
      ${typeClause}
    ORDER BY ts_rank(description_tsv, websearch_to_tsquery('english', ${args.query})) DESC
    LIMIT ${fanout}
  `;
}

async function semanticCandidates(
  args: Args,
  vector: number[],
  fanout: number,
): Promise<EntityRow[]> {
  const vec = `[${vector.join(',')}]`;
  const { projectClause, typeClause } = scopeClauses(args);
  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version, description
    FROM entities
    WHERE description_embedding IS NOT NULL
      ${projectClause}
      ${typeClause}
    ORDER BY description_embedding <=> ${vec}::vector
    LIMIT ${fanout}
  `;
}

type NameHit = EntityRow & { tier: number };

// Name leg: entities whose name is a word of the query, best first. Words split
// on whitespace only, because entity names keep their underscores. A hit's tier:
//   3  a word equals the name (`pm_ktjump`, `+attack`)
//   2  a word equals the name once a leading +/- is ignored on both sides, so
//      `attack` reaches `+attack`/`-attack` and `-nosound` reaches the command
//      as well as the cmdline param
//   1  a word (3+ chars) is a substring of the name
// A one-word query is a name (fragment) lookup and uses all three tiers. In a
// longer, description-style query only tiers 3 and 2 apply, and only for
// distinctive words: a word that merely sits inside some name, or names one of
// dozens, is noise ("packet" in "packet loss ..." would pull showpackets).
// Within a tier: more query words hit first, then more of the name covered
// (`ktjump` is most of `pm_ktjump`, a sliver of a long name).
async function nameCandidates(
  args: Args,
  tokens: string[],
  isNameQuery: boolean,
  fanout: number,
): Promise<NameHit[]> {
  if (tokens.length === 0) return [];
  const { projectClause, typeClause } = scopeClauses(args);
  return db<NameHit[]>`
    -- MATERIALIZED: the word counts are computed once, not per entity row
    WITH q AS MATERIALIZED (
      SELECT t.token, c.core
      FROM unnest(${tokens}::text[]) AS t(token),
           LATERAL (SELECT ltrim(t.token, '+-') AS core) c
      WHERE c.core <> ''
        AND (${isNameQuery}::boolean
             OR (SELECT count(*) FROM entities
                 WHERE strpos(name_fold, c.core) > 0
                   ${projectClause}
                   ${typeClause}) <= ${MAX_NAMES_PER_DISTINCTIVE_WORD})
    )
    SELECT e.id, e.canonical_id, e.project, e.type, e.name, e.source_state,
           e.first_seen_version, e.last_seen_version, e.description, hit.tier
    FROM entities e
    CROSS JOIN LATERAL (
      SELECT max(m.tier) AS tier, count(*) AS hits, sum(length(m.core)) AS matched_chars
      FROM (
        SELECT q.core,
               CASE WHEN e.name_fold = q.token THEN 3
                    WHEN ltrim(e.name_fold, '+-') = q.core THEN 2
                    WHEN ${isNameQuery}::boolean
                         AND length(q.core) >= ${MIN_PARTIAL_NAME_LENGTH}
                         AND strpos(e.name_fold, q.core) > 0 THEN 1
                    ELSE 0 END AS tier
        FROM q
      ) m
      WHERE m.tier > 0
    ) hit
    WHERE hit.hits > 0
      ${projectClause}
      ${typeClause}
    ORDER BY hit.tier DESC, hit.hits DESC,
             hit.matched_chars::float / length(e.name_fold) DESC,
             e.name, e.canonical_id
    LIMIT ${fanout}
  `;
}

export async function searchEntities(args: Args): Promise<ToolResponse<EntityRecord>> {
  const limit = Math.min(args.limit ?? 10, 25);
  const fanout = limit * 4;

  const tokens = queryTokens(args.query);
  const isNameQuery = tokens.length === 1;

  const lexPromise = lexicalCandidates(args, fanout);
  const namePromise = nameCandidates(args, tokens, isNameQuery, fanout);

  let semHits: EntityRow[] = [];
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    semHits = await semanticCandidates(args, result.vectors[0]!, fanout);
  } catch (err) {
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
    // Lexical-only degraded path; no throw.
  }

  const lexHits = await lexPromise;
  const nameHits = await namePromise;
  // An exact-name hit on a name query votes a second time. RRF counts one vote
  // per list, and an entity with no description (a ruleset like smackdown, a
  // doc_only cvar) sits in neither description list, so a single name vote
  // (1/61) could never beat five entities that both description legs ranked.
  const exactHits = nameHits.filter((h) => h.tier >= EXACT_NAME_TIER);
  const nameLists = isNameQuery ? [nameHits, exactHits] : [nameHits];

  const fused = reciprocalRankFusion([lexHits, semHits, ...nameLists], (e) => e.canonical_id);
  const top = fused.slice(0, limit);

  const results = await Promise.all(top.map((f) => toEntityRecord(f.item)));

  let matchQuality: 'strong' | 'weak' | 'none';
  if (top.length === 0) matchQuality = 'none';
  else if (top[0]!.score >= STRONG_THRESHOLD) matchQuality = 'strong';
  else if (top[0]!.score >= WEAK_THRESHOLD) matchQuality = 'weak';
  else matchQuality = 'none';

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No strong matches for "${args.query}". Try search_concepts for how-to questions, or call redirect_to_human.`
        : null,
    meta: {
      tool: 'search_entities',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
