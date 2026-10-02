#!/usr/bin/env bun
// apps/qw-oracle/eval/calibrate.ts
//
// Per-corpus cut-off sweep for the closeness grade (serve/mcp/src/grade.ts)
// against calibration-queries.json (D10 - disjoint from eval-queries.json).
// Runs every labeled question through its tool, reads the best cosine
// similarity the tool reports (meta.best_match_score), then sweeps (strong,
// weak) cut-off pairs per corpus and prints the cheapest pair plus a report
// for the cut-offs currently in force. The operator copies the printed values
// into grade.ts DEFAULT_CUTOFFS (or .env to override). The eval gate
// (eval.ts) is allowed to fail even after a passing calibration - that
// preserves the gate's signal per the F10 fix.
//
// Scoring is a cost matrix, not plain accuracy. The pre-2026-10 sweep counted
// any in-corpus query "correct" unless it was labeled none, which a rank-only
// grade could never produce, so it reported 100% on five queries while
// labeling nearly everything weak. Here a wrong 'strong' on an uncovered
// question costs the most: the API contract tells the caller to build an
// answer from 'strong'.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchEntities } from '../serve/mcp/src/tools/search-entities.ts';
import { searchConcepts } from '../serve/mcp/src/tools/search-concepts.ts';
import { searchSolvedIssues } from '../serve/mcp/src/tools/search-solved-issues.ts';
import { lookupEntity } from '../serve/mcp/src/tools/lookup-entity.ts';
import { grade, cutoffsFor, envNamesFor, type Corpus, type Cutoffs } from '../serve/mcp/src/grade.ts';
import type { MatchQuality } from '../serve/mcp/src/types.ts';
import { db, closeDb } from '../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUERIES_PATH = resolve(__dirname, 'calibration-queries.json');

type RankedTool = 'search_entities' | 'search_concepts' | 'search_solved_issues';

interface CalibrationQuery {
  id: number;
  query: string;
  tool: RankedTool | 'lookup_entity';
  expected: MatchQuality;
  // Ids that count as a right answer: entity canonical_id, `concept:<slug>`,
  // or chat thread_key. A trailing `*` is a prefix match (a cvar family).
  answers: string[];
  source: string;
  note?: string;
}

const CORPUS_OF: Record<RankedTool, Corpus> = {
  search_entities: 'entities',
  search_concepts: 'concepts',
  search_solved_issues: 'threads',
};

interface Observation {
  q: CalibrationQuery;
  resultCount: number;
  bestSimilarity: number | null;
  exactName: boolean;
  answerInTop3: boolean | null; // null when the row lists no answers
  top3: string[];
}

// expected (row) x got (column). Missing a covered answer by saying 'none'
// sends the caller away from an answer we have; 'strong' on an uncovered
// question invites a confabulated one.
const COST: Record<MatchQuality, Record<MatchQuality, number>> = {
  strong: { strong: 0, weak: 1, none: 3 },
  weak: { strong: 2, weak: 0, none: 1 },
  none: { strong: 4, weak: 1, none: 0 },
};

const GRID: number[] = [];
for (let c = 0.2; c <= 0.8001; c += 0.01) GRID.push(Math.round(c * 100) / 100);

function matches(id: string, answer: string): boolean {
  const a = answer.toLowerCase();
  const i = id.toLowerCase();
  return a.endsWith('*') ? i.startsWith(a.slice(0, -1)) : i === a;
}

async function threadKeys(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db<{ id: string; thread_key: string }[]>`
    SELECT id::text AS id, thread_key FROM chat_threads WHERE id = ANY(${ids.map(Number)}::bigint[])
  `;
  const byId = new Map(rows.map((r) => [r.id, r.thread_key]));
  return ids.map((i) => byId.get(i) ?? i);
}

async function probe(q: CalibrationQuery): Promise<Observation> {
  let res;
  let ids: string[];
  if (q.tool === 'search_entities') {
    res = await searchEntities({ query: q.query, limit: 5 });
    ids = res.results.map((r) => r.id);
  } else if (q.tool === 'search_concepts') {
    res = await searchConcepts({ query: q.query, limit: 5 });
    ids = res.results.map((r) => r.id);
  } else if (q.tool === 'search_solved_issues') {
    res = await searchSolvedIssues({ query: q.query, limit: 3, max_messages_per_session: 1 });
    ids = await threadKeys(res.results.map((r) => r.thread_id));
  } else {
    res = await lookupEntity({ name: q.query });
    ids = res.results.map((r) => r.id);
  }
  const top3 = ids.slice(0, 3);
  return {
    q,
    resultCount: res.results.length,
    bestSimilarity: res.meta.best_match_score ?? null,
    exactName: res.meta.match_basis === 'exact_name',
    answerInTop3: q.answers.length ? top3.some((id) => q.answers.some((a) => matches(id, a))) : null,
    top3,
  };
}

function labelOf(o: Observation, cut: Cutoffs): MatchQuality {
  return grade({ resultCount: o.resultCount, bestSimilarity: o.bestSimilarity, exactName: o.exactName }, cut).quality;
}

function totalCost(obs: Observation[], cut: Cutoffs): number {
  return obs.reduce((sum, o) => sum + COST[o.q.expected][labelOf(o, cut)], 0);
}

// Cheapest pair; among equally cheap pairs take the middle of the optimal
// strong range (then of its weak range), so the pick does not sit on the edge
// of a plateau the next added query could tip.
function sweep(obs: Observation[]): { best: Cutoffs; cost: number; strongRange: [number, number] } {
  let min = Infinity;
  const pairs: Array<{ cut: Cutoffs; cost: number }> = [];
  for (const strong of GRID) {
    for (const weak of GRID) {
      if (weak > strong) continue;
      const cut = { strong, weak };
      const cost = totalCost(obs, cut);
      pairs.push({ cut, cost });
      if (cost < min) min = cost;
    }
  }
  const optimal = pairs.filter((p) => p.cost === min);
  const strongs = [...new Set(optimal.map((p) => p.cut.strong))].sort((a, b) => a - b);
  const strong = strongs[Math.floor(strongs.length / 2)]!;
  const weaks = optimal.filter((p) => p.cut.strong === strong).map((p) => p.cut.weak).sort((a, b) => a - b);
  const weak = weaks[Math.floor(weaks.length / 2)]!;
  return { best: { strong, weak }, cost: min, strongRange: [strongs[0]!, strongs[strongs.length - 1]!] };
}

function report(label: string, obs: Observation[], cut: Cutoffs): void {
  const counts = new Map<string, number>();
  let exact = 0;
  let strongOnNone = 0;
  for (const o of obs) {
    const got = labelOf(o, cut);
    counts.set(`${o.q.expected}->${got}`, (counts.get(`${o.q.expected}->${got}`) ?? 0) + 1);
    if (got === o.q.expected) exact += 1;
    if (got === 'strong' && o.q.expected === 'none') strongOnNone += 1;
  }
  const withAnswers = obs.filter((o) => o.answerInTop3 !== null);
  const hits = withAnswers.filter((o) => o.answerInTop3).length;
  console.log(
    `  ${label} strong=${cut.strong} weak=${cut.weak}: label-exact ${exact}/${obs.length}, ` +
      `strong-on-uncovered ${strongOnNone}, cost ${totalCost(obs, cut)}, answer-in-top3 ${hits}/${withAnswers.length}`,
  );
  console.log(`    expected->got ${[...counts].map(([k, v]) => `${k}:${v}`).join('  ')}`);
}

async function main(): Promise<void> {
  const queries: CalibrationQuery[] = JSON.parse(readFileSync(QUERIES_PATH, 'utf8'));
  if (queries.length === 0) {
    console.error('calibration-queries.json is empty; populate it before calibrating.');
    process.exit(1);
  }

  const observations: Observation[] = [];
  for (const q of queries) observations.push(await probe(q));
  // --dump <path>: the raw observations, for trade-off analysis beyond the sweep.
  const dumpIdx = process.argv.indexOf('--dump');
  if (dumpIdx !== -1 && process.argv[dumpIdx + 1]) {
    writeFileSync(process.argv[dumpIdx + 1]!, JSON.stringify(observations, null, 2) + '\n');
  }

  for (const tool of Object.keys(CORPUS_OF) as RankedTool[]) {
    const corpus = CORPUS_OF[tool];
    const obs = observations.filter((o) => o.q.tool === tool);
    if (obs.length === 0) continue;
    const current = cutoffsFor(corpus);
    const { best, cost, strongRange } = sweep(obs);
    console.log(`\n${tool} (${corpus}, ${obs.length} queries)`);
    report('current', obs, current);
    report('best   ', obs, best);
    console.log(`    optimal strong cut-off range ${strongRange[0]}..${strongRange[1]} (cost ${cost})`);
    const [strongVar, weakVar] = envNamesFor(corpus);
    console.log(`    ${strongVar}=${best.strong}  ${weakVar}=${best.weak}`);
    for (const o of obs) {
      const got = labelOf(o, best);
      if (got === o.q.expected && o.answerInTop3 !== false) continue;
      const sim = o.bestSimilarity === null ? 'n/a' : o.bestSimilarity.toFixed(3);
      const miss = o.answerInTop3 === false ? ' [answer not in top 3]' : '';
      console.log(`    q${o.q.id} expected ${o.q.expected}, got ${got} (sim ${sim})${miss}  "${o.q.query}" -> ${o.top3.join(', ')}`);
    }
  }

  const lookups = observations.filter((o) => o.q.tool === 'lookup_entity');
  if (lookups.length) {
    console.log(`\nlookup_entity (${lookups.length} queries; binary, not swept)`);
    for (const o of lookups) {
      const got: MatchQuality = o.resultCount ? 'strong' : 'none';
      const ok = (got === 'none') === (o.q.expected === 'none') && o.answerInTop3 !== false;
      console.log(`    ${ok ? 'PASS' : 'FAIL'} q${o.q.id} "${o.q.query}" -> ${o.top3.join(', ') || '(none)'}`);
    }
  }

  await closeDb();
}

if (import.meta.main) {
  await main();
}
