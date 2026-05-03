#!/usr/bin/env bun
// apps/qw-oracle/eval/eval.ts
//
// Phase 8 (Arc 1). Runs every query in eval-queries.json against the local
// MCP tool functions, reports recall@1 / recall@3, exits non-zero if recall@3
// falls below 70%. The deploy gate per architecture spec lines 466-468.
//
// Out-of-corpus scoring (D11 / F11): for queries with empty expected_top_3,
// success = no tool returned match_quality: 'strong'. Hit count is NOT
// considered; hybrid retrieval almost always returns *something* and the
// honest-failure machinery's whole point is that the tool retrieves chunks
// but labels low-confidence weakly.
//
// The script imports tool functions directly rather than hitting MCP over a
// transport. Phase 7's dispatcher wrapper is bypassed here because the eval
// is a build-time check; we don't want eval queries to flood query_log with
// non-consumer rows.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchConcepts } from '../serve/mcp/src/tools/search-concepts.ts';
import { searchEntities } from '../serve/mcp/src/tools/search-entities.ts';
import { searchSolvedIssues } from '../serve/mcp/src/tools/search-solved-issues.ts';
import { lookupEntity } from '../serve/mcp/src/tools/lookup-entity.ts';
import { closeDb } from '../shared/db.ts';
import type { MatchQuality } from '../serve/mcp/src/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUERIES_PATH = resolve(__dirname, 'eval-queries.json');
const RECALL3_GATE = 0.70;

type ToolName = 'search_concepts' | 'search_entities' | 'search_solved_issues' | 'lookup_entity';

interface EvalQuery {
  id: number;
  category: 'concept-anchored' | 'exact-name' | 'vague-natural-language' | 'out-of-corpus';
  query: string;
  expected_top_3: string[];
  tools: ToolName[];
}

const QUALITY_RANK: Record<MatchQuality, number> = { none: 0, weak: 1, strong: 2 };

function maxQuality(a: MatchQuality, b: MatchQuality): MatchQuality {
  return QUALITY_RANK[a] >= QUALITY_RANK[b] ? a : b;
}

interface QueryResult {
  hits: string[];
  match_quality: MatchQuality;
}

async function runQuery(q: EvalQuery): Promise<QueryResult> {
  const allHits: string[] = [];
  let aggregateQuality: MatchQuality = 'none';

  for (const tool of q.tools) {
    if (tool === 'search_concepts') {
      const r = await searchConcepts({ query: q.query, limit: 10 });
      allHits.push(...r.results.map((h) => `concept:${h.slug}`));
      aggregateQuality = maxQuality(aggregateQuality, r.match_quality);
    } else if (tool === 'search_entities') {
      const r = await searchEntities({ query: q.query, limit: 10 });
      // EntityRecord exposes the canonical id under `id` (types.ts:55). The
      // plan-shipped paste named `canonical_id`; that field doesn't exist.
      allHits.push(...r.results.map((h) => h.id));
      aggregateQuality = maxQuality(aggregateQuality, r.match_quality);
    } else if (tool === 'search_solved_issues') {
      const r = await searchSolvedIssues({ query: q.query, limit: 10 });
      // SessionHit.session_id is already the canonical
      // "session:<platform>:<channel>:<started_at>" string from
      // search-solved-issues.ts:canonicalSessionId. Don't re-prepend.
      allHits.push(...r.results.map((h) => h.session_id));
      aggregateQuality = maxQuality(aggregateQuality, r.match_quality);
    } else if (tool === 'lookup_entity') {
      const r = await lookupEntity({ name: q.query });
      allHits.push(...r.results.map((h) => h.id));
      aggregateQuality = maxQuality(aggregateQuality, r.match_quality);
    }
  }
  return { hits: allHits, match_quality: aggregateQuality };
}

function score(q: EvalQuery, qr: QueryResult): { p1: boolean; p3: boolean } {
  if (q.expected_top_3.length === 0) {
    // Out-of-corpus (D11 / F11). The honest-failure signal is "no tool labeled
    // this strong." Weak is acceptable - the response is retrieved with low
    // confidence, which the consumer LLM can act on (redirect_to_human or
    // refuse). Hit count does not factor.
    const refused = qr.match_quality !== 'strong';
    return { p1: refused, p3: refused };
  }
  const ranks = q.expected_top_3.map((e) => qr.hits.indexOf(e));
  return {
    p1: ranks.some((r) => r === 0),
    p3: ranks.some((r) => r >= 0 && r < 3),
  };
}

async function main(): Promise<void> {
  const queries: EvalQuery[] = JSON.parse(readFileSync(QUERIES_PATH, 'utf8'));
  if (queries.length === 0) {
    console.error('eval-queries.json is empty; populate it before running the gate.');
    process.exit(1);
  }

  let pass1 = 0;
  let pass3 = 0;
  for (const q of queries) {
    const qr = await runQuery(q);
    const { p1, p3 } = score(q, qr);
    if (p1) pass1 += 1;
    if (p3) pass3 += 1;
    const status = p3 ? 'PASS' : 'FAIL';
    const ranksStr = q.expected_top_3.length === 0
      ? `match_quality=${qr.match_quality}`
      : `ranks=${q.expected_top_3.map((e) => {
          const r = qr.hits.indexOf(e);
          return r >= 0 ? r : '-';
        }).join(',')}`;
    console.log(`[${status}] q${q.id} (${q.category}) "${q.query}" -> ${ranksStr}`);
  }

  const N = queries.length;
  const recall1 = pass1 / N;
  const recall3 = pass3 / N;
  console.log('');
  console.log(`recall@1: ${pass1}/${N} = ${(recall1 * 100).toFixed(1)}%`);
  console.log(`recall@3: ${pass3}/${N} = ${(recall3 * 100).toFixed(1)}%`);

  await closeDb();

  if (recall3 < RECALL3_GATE) {
    console.error(`FAIL: recall@3 ${(recall3 * 100).toFixed(1)}% below ${(RECALL3_GATE * 100).toFixed(1)}% gate`);
    process.exit(1);
  }
  console.log(`PASS: deploy gate (recall@3 >= ${(RECALL3_GATE * 100).toFixed(1)}%) cleared`);
}

if (import.meta.main) {
  await main();
}
