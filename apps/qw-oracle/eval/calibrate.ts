#!/usr/bin/env bun
// apps/qw-oracle/eval/calibrate.ts
//
// Phase 8 (Arc 1). Threshold sweep against calibration-queries.json (D10 -
// disjoint from eval-queries.json). Prints the best (STRONG, WEAK) pair; the
// operator writes those into .env. The eval gate (eval.ts) is allowed to
// fail even after a passing calibration - that preserves the gate's signal
// per the F10 fix.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchConcepts } from '../serve/mcp/src/tools/search-concepts.ts';
import { closeDb } from '../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUERIES_PATH = resolve(__dirname, 'calibration-queries.json');

interface CalibrationQuery {
  id: number;
  query: string;
  expected_in_corpus: boolean;
  primary_tool: 'search_concepts';
}

// Coarse-grained sweep grid. Tighter grid is overkill for the calibration
// set's expected size (5-8 queries); coarser grid leaves the operator with
// values that read as round numbers in .env.
const CANDIDATES = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12];

interface Observation {
  in_corpus: boolean;
  top_score: number;
}

async function probe(q: CalibrationQuery): Promise<Observation> {
  // Probe each query once. searchConcepts already returns the fused RRF score
  // per result; we read only the top-1 score for the threshold sweep.
  const r = await searchConcepts({ query: q.query, limit: 5 });
  return {
    in_corpus: q.expected_in_corpus,
    top_score: r.results[0]?.match_score ?? 0,
  };
}

interface Best {
  strong: number;
  weak: number;
  accuracy: number;
}

function sweep(observations: Observation[]): Best {
  let best: Best = { strong: 0.05, weak: 0.02, accuracy: 0 };
  for (const strong of CANDIDATES) {
    for (const weak of CANDIDATES) {
      if (weak >= strong) continue;
      let correct = 0;
      for (const o of observations) {
        const label = o.top_score >= strong ? 'strong' : o.top_score >= weak ? 'weak' : 'none';
        // In-corpus: the corpus should NOT label this 'none'. Strong is best,
        // weak is acceptable.
        // Out-of-corpus: the corpus should NOT label this 'strong'. None is
        // best, weak is acceptable (per D11).
        if (o.in_corpus && label !== 'none') correct += 1;
        else if (!o.in_corpus && label !== 'strong') correct += 1;
      }
      const accuracy = correct / observations.length;
      if (accuracy > best.accuracy) best = { strong, weak, accuracy };
    }
  }
  return best;
}

async function main(): Promise<void> {
  const queries: CalibrationQuery[] = JSON.parse(readFileSync(QUERIES_PATH, 'utf8'));
  if (queries.length === 0) {
    console.error('calibration-queries.json is empty; populate it before calibrating.');
    process.exit(1);
  }

  const observations: Observation[] = [];
  for (const q of queries) {
    const obs = await probe(q);
    observations.push(obs);
    console.log(`q${q.id} "${q.query}" -> top_score=${obs.top_score.toFixed(4)} (in_corpus=${obs.in_corpus})`);
  }

  const best = sweep(observations);

  console.log('');
  console.log(`Best thresholds: STRONG=${best.strong}  WEAK=${best.weak}  accuracy=${(best.accuracy * 100).toFixed(1)}%`);
  console.log('');
  console.log('Write these to apps/qw-oracle/.env (dev) or /mnt/user/appdata/qw-oracle/.env (prod):');
  console.log(`MATCH_QUALITY_STRONG_THRESHOLD=${best.strong}`);
  console.log(`MATCH_QUALITY_WEAK_THRESHOLD=${best.weak}`);

  await closeDb();
}

if (import.meta.main) {
  await main();
}
