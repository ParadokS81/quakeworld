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
import { reciprocalRankFusion, type FusedHit } from '../../../../shared/rrf.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import { queryTokens } from '../token-match.ts';
import { cutoffsFor, grade } from '../grade.ts';
import { ENTITY_TYPES, type EntityRecord, type EntityType, type ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';

// The kinds searched when the caller names none. The other public kinds (log
// templates, info keys, protocol messages, QC builtins, match events, cvar
// aliases) are reached by the all-kinds fallback in searchEntities; the
// internal classifier kinds stay out of the MCP surface (API_CONTRACTS, A2).
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
// same candidate pool. allKinds widens the default kinds to every public kind
// (never overrides a type the caller asked for).
function scopeClauses(args: Args, allKinds = false) {
  return {
    projectClause: args.project ? db`AND project = ${args.project}` : db``,
    typeClause: args.type
      ? db`AND type = ${args.type}`
      : db`AND type IN ${db(allKinds ? ENTITY_TYPES : USER_FACING_TYPES)}`,
  };
}

// websearch_to_tsquery reads a leading `-` as "exclude this word", so a query
// for the cmdline param `-nosound` matched every description WITHOUT
// "nosound" -- near-arbitrary rows voting in the fusion. Entity names carry
// signs (`-democache`, `+attack`), and this tool never advertised exclusion
// syntax (search_solved_issues does, and keeps it), so drop a leading sign.
export function lexicalQuery(query: string): string {
  return query.replace(/(^|\s)[+-]+(?=\S)/g, '$1');
}

async function lexicalCandidates(args: Args, fanout: number, allKinds: boolean): Promise<EntityRow[]> {
  const { projectClause, typeClause } = scopeClauses(args, allKinds);
  const query = lexicalQuery(args.query);
  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version, description
    FROM entities
    WHERE description_tsv @@ websearch_to_tsquery('english', ${query})
      ${projectClause}
      ${typeClause}
    ORDER BY ts_rank(description_tsv, websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${fanout}
  `;
}

async function semanticCandidates(
  args: Args,
  vector: number[],
  fanout: number,
  allKinds: boolean,
): Promise<EntityRow[]> {
  const vec = `[${vector.join(',')}]`;
  const { projectClause, typeClause } = scopeClauses(args, allKinds);
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
  allKinds: boolean,
): Promise<NameHit[]> {
  if (tokens.length === 0) return [];
  const { projectClause, typeClause } = scopeClauses(args, allKinds);
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

// One pass over a candidate pool: the three ranked lists to fuse, plus the
// entities a name-query word named exactly.
interface Pass {
  lists: EntityRow[][];
  exactNames: Set<string>;
}

async function gather(
  args: Args,
  tokens: string[],
  isNameQuery: boolean,
  vector: number[] | null,
  fanout: number,
  allKinds: boolean,
): Promise<Pass> {
  const [lexHits, nameHits, semHits] = await Promise.all([
    lexicalCandidates(args, fanout, allKinds),
    nameCandidates(args, tokens, isNameQuery, fanout, allKinds),
    vector ? semanticCandidates(args, vector, fanout, allKinds) : Promise.resolve([] as EntityRow[]),
  ]);
  // An exact-name hit on a name query votes a second time. RRF counts one vote
  // per list, and an entity with no description (a ruleset like smackdown, a
  // doc_only cvar) sits in neither description list, so a single name vote
  // (1/61) could never beat five entities that both description legs ranked.
  const exactHits = nameHits.filter((h) => h.tier >= EXACT_NAME_TIER);
  return {
    lists: [lexHits, semHits, ...(isNameQuery ? [nameHits, exactHits] : [nameHits])],
    exactNames: new Set(exactHits.map((h) => h.canonical_id)),
  };
}

// Closeness of each entity's description to the question (cosine similarity,
// 0..1). Entities without a description embedding are absent from the map.
async function closeness(canonicalIds: string[], vector: number[] | null): Promise<Map<string, number>> {
  if (!vector || canonicalIds.length === 0) return new Map();
  const vec = `[${vector.join(',')}]`;
  const rows = await db<{ canonical_id: string; sim: number }[]>`
    SELECT canonical_id, 1 - (description_embedding <=> ${vec}::vector) AS sim
    FROM entities
    WHERE canonical_id = ANY(${canonicalIds}::text[])
      AND description_embedding IS NOT NULL
  `;
  return new Map(rows.map((r) => [r.canonical_id, Number(r.sim)]));
}

async function graded(top: FusedHit<EntityRow>[], exactNames: Set<string>, vector: number[] | null) {
  const ids = top.map((f) => f.item.canonical_id);
  const sims = await closeness(ids, vector);
  const best = sims.size ? Math.max(...sims.values()) : null;
  const { quality, basis } = grade(
    { resultCount: top.length, bestSimilarity: best, exactName: ids.some((id) => exactNames.has(id)) },
    cutoffsFor('entities'),
  );
  return { sims, best, quality, basis };
}

export async function searchEntities(args: Args): Promise<ToolResponse<EntityRecord>> {
  const limit = Math.min(args.limit ?? 10, 25);
  const fanout = limit * 4;

  const tokens = queryTokens(args.query);
  const isNameQuery = tokens.length === 1;

  let vector: number[] | null = null;
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    vector = result.vectors[0]!;
  } catch (err) {
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
    // Lexical + name only (degraded path); no throw.
  }

  const main = await gather(args, tokens, isNameQuery, vector, fanout, false);
  let fused = reciprocalRankFusion(main.lists, (e) => e.canonical_id);
  let exactNames = main.exactNames;
  let top = fused.slice(0, limit);
  let g = await graded(top, exactNames, vector);

  // All-kinds fallback: callers almost never pass `type`, so a question about a
  // protocol message, QC builtin or HUD element found nothing it could use.
  // When the default kinds do not produce a strong answer, search every public
  // kind and rank that pool on its own -- it contains the default kinds too, so
  // they compete on equal terms. (Fusing both passes gave default-kind entities
  // two votes each and buried the protocol messages the fallback exists for.)
  // Same vector, so no second embedding call.
  if (!args.type && g.quality !== 'strong') {
    const wide = await gather(args, tokens, isNameQuery, vector, fanout, true);
    fused = reciprocalRankFusion(wide.lists, (e) => e.canonical_id);
    exactNames = new Set([...main.exactNames, ...wide.exactNames]);
    top = fused.slice(0, limit);
    g = await graded(top, exactNames, vector);
  }

  const records = await Promise.all(top.map((f) => toEntityRecord(f.item)));
  const results = records.map((r, i) => ({ ...r, match_score: g.sims.get(top[i]!.item.canonical_id) ?? null }));

  return {
    results,
    match_quality: g.quality,
    suggested_fallback:
      g.quality === 'none'
        ? `No strong matches for "${args.query}". Try search_concepts for how-to questions, or call redirect_to_human.`
        : null,
    meta: {
      tool: 'search_entities',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
      best_match_score: g.best,
      match_basis: g.basis,
    },
  };
}
