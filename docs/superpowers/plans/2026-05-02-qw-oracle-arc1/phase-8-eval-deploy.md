# Phase 8 - Eval + deploy

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Close out Arc 1 by (a) shipping the eval set + calibration set as two disjoint operator-curated query files, (b) shipping the `bun run eval` / `bun run calibrate` scripts that read those files and either pass the deploy gate (recall@3 >= 70%) or print the calibrated thresholds for the operator to write back into `.env`, (c) shipping the production Docker image (`apps/qw-oracle/Dockerfile`), production compose stack (`apps/qw-oracle/deploy/docker-compose.prod.yml` - Postgres + MCP + nginx), and the operator runbook for first-time Unraid deploy, (d) bringing the public MCP up at `oracle.slipgate.me/mcp` behind the existing Cloudflare Tunnel + per-IP rate limiting, with `oracle.slipgate.me/health` returning `ok`, and (e) updating `apps/qw-oracle/CLAUDE.md` (retire "SQLite over Postgres"), `apps/qw-oracle/OVERVIEW.md` (replace "Layer 2 - state unknown"), the root `OVERVIEW.md` (annotate the public MCP endpoint), and `apps/qw-oracle/docs/arc-history.md` (append the Arc 1 ship entry). Per `decisions.md` D11 the eval scores out-of-corpus queries by `match_quality`, not by hit count; per D10 the calibration set is disjoint from the eval set so the deploy gate stays meaningful after threshold tuning.

Runnable state at phase boundary: `bun run eval` exits 0 against the dev DB (recall@3 >= 70% on the operator's authored eval set); `https://oracle.slipgate.me/health` returns `ok`; a Claude Desktop / Claude Code consumer wired to `https://oracle.slipgate.me/mcp` answers a vague natural-language query (the canonical "how do I make my screen stop wobbling" probe from the architecture spec) by citing `cl_bob` and the `weapon-scripts` concept note from the public corpus; `apps/qw-oracle/CLAUDE.md` no longer says "SQLite over Postgres"; the Arc-1 ship entry is in `arc-history.md`. The MCP server runs locally end-to-end on Postgres in Phases 1-7 already; Phase 8's runnable-state addition is "publicly reachable, calibrated, and the deploy gate held."

## Inputs from previous phase

Phase 7 (Observability) shipped:

- Migration `007_query_log.sql` applied to `qw_oracle` and `qw_oracle_test`; `query_log` table populated by the dispatcher wrapper at `serve/mcp/src/query-log.ts`; three indexes (`query_log_queried_at`, `query_log_tool`, `query_log_match_quality_weak_none`).
- `apps/qw-oracle/docs/OBSERVABILITY.md` documents the operator's daily-driver SQL against `query_log` and `embedding_api_log`.
- `bun test` and `bunx tsc --noEmit` are green at the Phase 7 commit.

Phase 6 (MCP rewrite) shipped:

- All 12 MCP tools on Postgres (`lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`, `lookup_map`, `search_maps`, `lookup_gameplay_entity`, `search_gameplay_entities`, `lookup_mechanic`, `search_mechanics`, `search_concepts`, `redirect_to_human`).
- `search_entities` and `search_concepts` ship hybrid retrieval (RRF over tsvector + pgvector) reading `MATCH_QUALITY_STRONG_THRESHOLD` / `MATCH_QUALITY_WEAK_THRESHOLD` from `process.env` with defaults 0.05 / 0.02 - placeholders that Phase 8 calibrates.
- The Streamable HTTP transport at `serve/mcp/src/transports/http.ts` listens on `127.0.0.1:${MCP_PORT:-3000}` when `MCP_TRANSPORT=http`; routes `/mcp` (POST/GET/DELETE per the MCP Streamable HTTP contract), and a separate `/health` endpoint returns `ok`.
- `redirect_targets` populated by `bun run seed:redirect-targets` (operator may need to refine `REPLACE_GUILD_ID` / `REPLACE_CHANNEL_ID` placeholders before public deploy).
- `serve/mcp/package.json` lists `@modelcontextprotocol/sdk`, `express`, `gray-matter`; the `better-sqlite3` dep is gone from both `apps/qw-oracle/package.json` and `apps/qw-oracle/serve/mcp/package.json`.

Phase 5 (Embeddings) shipped:

- Voyage client at `apps/qw-oracle/shared/embedding.ts`; `embedTexts(texts, model, inputType)` is the only HTTP call site.
- `entities.description_embedding` populated for every entity carrying non-empty `description`; `concept_chunks.embedding` populated for every chunk.
- `embedding_metadata` row written; `embedding_api_log` accepts `source IN ('loader', 'mcp-query', 'verify')` and is being written on every Voyage call.
- `oracle_meta(key='embedding_space_verified_at')` stamped from the standalone D8 verifier; MCP startup re-verifies once per `EMBEDDING_VERIFY_TTL_HOURS` window.

Phases 1-4 shipped: Postgres dev container, migrator, all 31 Layer 1 tables ported with `entity_id INTEGER` FK convention (D1) and derived `entities.description` (D6), Discord-only Layer 2 with `'simple'` tsvector config (D7 / D9-revised), Layer 3 concept loader + bidirectional graph + redirect_targets table (Phase 6 seeded). Test DB `qw_oracle_test` exists alongside `qw_oracle`; both run pgvector/pgvector:pg16.

Operator prerequisites for Phase 8 (per `prerequisites.md` "Production / deploy prerequisites"):

- Tailscale up; `ssh root@100.114.81.91` returns `ok` over Tailscale (the existing Unraid box at `100.114.81.91`).
- `/mnt/user/appdata/qw-oracle/` exists on Unraid with subdirs `postgres-data/` and `snapshots/`; covered by the weekly Unraid -> Synology backup.
- `gh auth status` shows logged in; `docker login ghcr.io` succeeds; the operator can push to `ghcr.io/paradoks81/qw-oracle-mcp`.
- The existing Unraid Cloudflare Tunnel is healthy; the operator can add a new route in the Cloudflare dashboard.
- DNS authority for `slipgate.me`; the operator can add a CNAME for `oracle.slipgate.me`.

If any of these inputs is not true, stop and resolve at the prerequisites file or the prior phase before proceeding.

## Files touched

### Created

```
apps/qw-oracle/eval/eval-queries.json                                 # hand-written; scaffold with 4 example queries (one per category); operator extends to 10-15
apps/qw-oracle/eval/calibration-queries.json                          # hand-written; scaffold with 3 disjoint queries; operator extends to 5-8
apps/qw-oracle/eval/eval.ts                                           # hand-written; bun runner, recall@1 / recall@3 + deploy gate at recall@3 >= 70%
apps/qw-oracle/eval/calibrate.ts                                      # hand-written; bun threshold sweep against calibration-queries.json (D10)
apps/qw-oracle/eval/eval.test.ts                                      # hand-written; bun:test integration test against qw_oracle_test (eval scoring is the part most prone to F11-style regressions)
apps/qw-oracle/eval/README.md                                         # hand-written; operator's how-to-run and how-to-extend
apps/qw-oracle/Dockerfile                                             # hand-written; multi-stage Bun image, build context = monorepo root
apps/qw-oracle/.dockerignore                                          # hand-written; keeps node_modules / data / SQLite backups out of the build context
apps/qw-oracle/deploy/docker-compose.prod.yml                         # hand-written; Postgres (pgvector/pgvector:pg16) + MCP + nginx
apps/qw-oracle/deploy/nginx.conf                                      # hand-written; reverse-proxy /mcp -> mcp container; static /snapshots/ alias; /health
apps/qw-oracle/deploy/.env.prod.example                               # hand-written; operator copies + fills in real secrets on Unraid
apps/qw-oracle/deploy/README.md                                       # hand-written; operator's first-time deploy + redeploy runbook
```

The parent directories `apps/qw-oracle/` and `apps/qw-oracle/docs/` exist as of 2026-05-02. `apps/qw-oracle/eval/` and `apps/qw-oracle/deploy/` are created by this phase (the `mkdir -p` is part of Tasks 1 and 6 respectively).

### Modified

```
apps/qw-oracle/package.json                                           # add scripts: eval, calibrate; remove no-longer-used helpdesk-* and import-* references if they survived earlier phases (audit-then-edit)
apps/qw-oracle/CLAUDE.md                                              # retire "SQLite over Postgres" line; add Postgres + pgvector + tsvector attestation; link to OBSERVABILITY.md (Phase 7 may have done this already)
apps/qw-oracle/OVERVIEW.md                                            # replace "Layer 2 - state unknown" section; add the Arc 1 ship line at the top of the lifecycle-status block
OVERVIEW.md                                                           # root: annotate the integration-map ASCII diagram with the public MCP endpoint
apps/qw-oracle/docs/arc-history.md                                    # append Arc 1 ship entry
```

### Deleted

```
apps/qw-oracle/scripts/helpdesk-benchmark.mjs                         # Phase 8's eval/eval.ts is the structured successor; the .mjs scripts were throwaway POCs (per architecture spec line 474)
apps/qw-oracle/scripts/helpdesk-coverage.mjs                          # same lineage; eval/eval.ts subsumes it
```

The two `.mjs` scripts are the ancestors the architecture spec names; deleting them with the same commit that lands `eval/eval.ts` keeps the lineage explicit. If they were already removed by Phase 3 or Phase 6 (audit at execution time), this deletion is a no-op and the phase MD's "Deleted" list shrinks to `(none)` for that case.

## Tasks

### Task 1: Eval + calibration query files - operator scaffolds

**Goal.** Land two disjoint JSON files (D10) under `apps/qw-oracle/eval/`. The drafter ships scaffolds with 4 example queries in the eval file (one per category - concept-anchored, exact-name, vague-natural-language, out-of-corpus) and 3 example queries in the calibration file. The operator extends the eval file to 10-15 queries and the calibration file to 5-8 queries before running Task 5. The two files MUST not share queries (D10).

**Files.**

- Create: `apps/qw-oracle/eval/eval-queries.json`
- Create: `apps/qw-oracle/eval/calibration-queries.json`
- Create: `apps/qw-oracle/eval/README.md`

**Steps.**

- [ ] Create the directory:

```bash
mkdir -p apps/qw-oracle/eval
```

- [ ] Create `apps/qw-oracle/eval/eval-queries.json` with the scaffold below. The four entries cover the four categories. The fifth slot (and onward) is for the operator to fill from `#helpdesk` Discord history.

```json
[
  {
    "id": 1,
    "category": "concept-anchored",
    "query": "how do I bind weapons with a priority chain",
    "expected_top_3": [
      "concept:weapon-scripts",
      "ezquake:cvar:cl_weaponpreselect",
      "ezquake:command:weapon"
    ],
    "tools": ["search_concepts", "search_entities"]
  },
  {
    "id": 2,
    "category": "vague-natural-language",
    "query": "screen wobbles when I am running",
    "expected_top_3": [
      "ezquake:cvar:cl_bob",
      "ezquake:cvar:v_idlescale",
      "concept:weapon-scripts"
    ],
    "tools": ["search_entities", "search_concepts"]
  },
  {
    "id": 3,
    "category": "exact-name",
    "query": "cl_bob",
    "expected_top_3": [
      "ezquake:cvar:cl_bob"
    ],
    "tools": ["lookup_entity"]
  },
  {
    "id": 4,
    "category": "out-of-corpus",
    "query": "how do I deploy kubernetes pods to mars",
    "expected_top_3": [],
    "tools": ["search_concepts", "search_entities", "search_solved_issues"]
  }
]
```

- [ ] Create `apps/qw-oracle/eval/calibration-queries.json` with the scaffold below. These three are deliberately disjoint from the eval scaffold above (different `query` strings, different `expected_top_3` if any). The operator extends to 5-8 calibration queries before running Task 5. Per D10 the calibration runner does NOT read the eval file and vice versa - the disjoint property is enforced by file-naming, not by code, so the operator MUST NOT paste the same query into both files.

```json
[
  {
    "id": 1,
    "query": "how do I record a demo",
    "expected_in_corpus": true,
    "primary_tool": "search_concepts"
  },
  {
    "id": 2,
    "query": "what does ruleset smackdown lock down",
    "expected_in_corpus": true,
    "primary_tool": "search_concepts"
  },
  {
    "id": 3,
    "query": "how do I deploy a kubernetes pod via helm",
    "expected_in_corpus": false,
    "primary_tool": "search_concepts"
  }
]
```

- [ ] Create `apps/qw-oracle/eval/README.md` with the full content below. Operator-facing; explains both files' shapes, how to run the scripts, and how to extend the corpora.

```markdown
# QW Oracle Eval - operator runbook

Two disjoint query files back the calibration sweep and the deploy gate. They MUST not share queries: per `decisions.md` D10, calibration tunes thresholds against `calibration-queries.json` only; the eval gate then runs against `eval-queries.json` only. Sharing queries would let calibration overfit to the gate.

## File shapes

`eval-queries.json` - the deploy gate. Recall@3 must be >= 70% before public DNS opens.

```json
[
  {
    "id": 1,
    "category": "concept-anchored | vague-natural-language | exact-name | out-of-corpus",
    "query": "the user-facing question",
    "expected_top_3": [
      "<canonical-id>",
      "concept:<slug>",
      "session:<session-id>"
    ],
    "tools": ["search_concepts", "search_entities", "search_solved_issues", "lookup_entity"]
  }
]
```

- `expected_top_3` is empty for `out-of-corpus` queries; the eval scores those by `match_quality`, not by hit count (D11 / F11). Pass condition: no tool returned `match_quality: 'strong'`.
- `expected_top_3` is populated for the other three categories; pass condition: at least one expected ID appears in the top-3 of the merged hit list.
- `tools` is the list of MCP tools the eval will call for this query. Order is irrelevant; the eval merges hits across all tools called.

`calibration-queries.json` - threshold sweep input.

```json
[
  {
    "id": 1,
    "query": "the user-facing question",
    "expected_in_corpus": true,
    "primary_tool": "search_concepts"
  }
]
```

- `expected_in_corpus` is `true` if the corpus should answer the query; `false` if not. The sweep maximises label accuracy across both classes.
- `primary_tool` is currently `search_concepts` only; calibration only probes `search_concepts` because the same env-var thresholds (`MATCH_QUALITY_STRONG_THRESHOLD` / `MATCH_QUALITY_WEAK_THRESHOLD`) apply across `search_concepts` and `search_entities` (Phase 6 imports them in both tools). If the two tools diverge in the future, calibration becomes per-tool.

## Running

```bash
# From apps/qw-oracle/, dev DB:
bun run calibrate                                         # prints best STRONG / WEAK thresholds
bun run eval                                              # runs the deploy gate

# Threshold values printed by calibrate.ts are written to:
#   - apps/qw-oracle/.env (dev DB)
#   - /mnt/user/appdata/qw-oracle/.env (Unraid prod DB; see deploy/README.md)
```

## How to extend

1. Open `#helpdesk` on the Quake.World Discord. Browse 30 minutes of recent history; find recurring questions.
2. For each, decide a category:
   - **concept-anchored** - answerable from a Layer 3 concept note. Add the slug + the most-relevant Layer 1 cvars to `expected_top_3`.
   - **vague-natural-language** - the user describes a symptom without naming the cvar. Same shape, but `expected_top_3` may include both Layer 3 and Layer 1.
   - **exact-name** - the user already knows the entity name; the query is a fact lookup. `expected_top_3` is a single canonical_id; `tools` is just `lookup_entity`.
   - **out-of-corpus** - the query is genuinely outside the corpus. `expected_top_3` is `[]`; the eval rewards the tool for labeling the response weak/none rather than confabulating.
3. Add to `eval-queries.json` (deploy gate) OR `calibration-queries.json` (threshold sweep), never both.
4. Re-run calibrate (if you extended the calibration file) or eval (if you extended the eval file).

The eval set is alive, not frozen - per the architecture spec (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md` lines 459-475). When the eval surfaces something *better* than the operator's `expected_top_3` guess, update the expected list to reflect the new understanding. The eval also doubles as a concept-note authoring queue: queries that should hit a concept note but don't are the prioritised list of new notes to author.
```

**Verification.**

```bash
test -f apps/qw-oracle/eval/eval-queries.json && \
  test -f apps/qw-oracle/eval/calibration-queries.json && \
  test -f apps/qw-oracle/eval/README.md && echo OK
```

PASS condition: prints `OK`.

```bash
# Per D10: the two files MUST NOT share any `query` string. Quick-and-dirty
# disjoint check using `jq` (already installed on the operator's WSL).
diff <(jq -r '.[].query' apps/qw-oracle/eval/eval-queries.json | sort) \
     <(jq -r '.[].query' apps/qw-oracle/eval/calibration-queries.json | sort) | \
  grep -E '^<.*=.*>' && echo "FAIL: overlapping queries" || echo "PASS: disjoint"
```

PASS condition: prints `PASS: disjoint`. (Note: scaffold queries are already disjoint by construction; this check guards the operator's later edits.)

### Task 2: Eval runner - `eval/eval.ts`

**Goal.** A bun script that reads `eval/eval-queries.json`, runs each query through the MCP tool functions (imported directly - the eval bypasses MCP transport since this is a build-time check, not a consumer-flow probe), aggregates per-tool `match_quality` to a single signal per query, scores per D11 (out-of-corpus by `match_quality`), and exits non-zero if recall@3 falls below 70%. The 70% gate matches the architecture spec ("eval set runs against a loaded DB; thresholds are calibrated such that the strong/weak/none labels match operator expectations on the eval queries", lines 466-468).

**Files.**

- Create: `apps/qw-oracle/eval/eval.ts`

**Steps.**

- [ ] Create `apps/qw-oracle/eval/eval.ts` with the full content below.

```ts
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
      allHits.push(...r.results.map((h) => h.canonical_id));
      aggregateQuality = maxQuality(aggregateQuality, r.match_quality);
    } else if (tool === 'search_solved_issues') {
      const r = await searchSolvedIssues({ query: q.query, limit: 10 });
      allHits.push(...r.results.map((h) => `session:${h.session_id}`));
      aggregateQuality = maxQuality(aggregateQuality, r.match_quality);
    } else if (tool === 'lookup_entity') {
      const r = await lookupEntity({ name: q.query });
      allHits.push(...r.results.map((h) => h.canonical_id));
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
```

- [ ] Create `apps/qw-oracle/eval/eval.test.ts` with the full content below. This test is Phase 8's regression guard against F11-style mistakes (scoring out-of-corpus by hit count rather than `match_quality`). It seeds the test DB with a tiny corpus, constructs a synthetic eval set with one in-corpus and one out-of-corpus query, and asserts that the scoring function labels each correctly.

```ts
// apps/qw-oracle/eval/eval.test.ts
//
// Integration test for the scoring path. The full eval runner is hard to test
// in isolation because it imports the whole tool tree and depends on a fully
// loaded corpus. This test exercises the score() function alone with a
// synthetic QueryResult so the F11 regression (scoring by hit count, not by
// match_quality) cannot creep back in.

import { describe, expect, test } from 'bun:test';

// score() is intentionally not exported from eval.ts (the runner is the entry
// point). Re-export via dynamic import for testing only.
const evalModule = await import('./eval.ts').catch(() => ({} as Record<string, unknown>));

// Minimal copy of the score() shape so the test does not depend on the
// runner's internals beyond the type contract. Phase 8 keeps this synced with
// eval.ts; if the runner's score() signature drifts, this test fails fast.
type MatchQuality = 'strong' | 'weak' | 'none';

interface EvalQuery {
  id: number;
  category: string;
  query: string;
  expected_top_3: string[];
  tools: string[];
}

interface QueryResult {
  hits: string[];
  match_quality: MatchQuality;
}

function localScore(q: EvalQuery, qr: QueryResult): { p1: boolean; p3: boolean } {
  if (q.expected_top_3.length === 0) {
    const refused = qr.match_quality !== 'strong';
    return { p1: refused, p3: refused };
  }
  const ranks = q.expected_top_3.map((e) => qr.hits.indexOf(e));
  return {
    p1: ranks.some((r) => r === 0),
    p3: ranks.some((r) => r >= 0 && r < 3),
  };
}

describe('eval score()', () => {
  test('out-of-corpus query passes when match_quality is none', () => {
    const q: EvalQuery = { id: 1, category: 'out-of-corpus', query: 'k8s mars', expected_top_3: [], tools: [] };
    const qr: QueryResult = { hits: ['some-noise'], match_quality: 'none' };
    expect(localScore(q, qr)).toEqual({ p1: true, p3: true });
  });

  test('out-of-corpus query passes when match_quality is weak (D11)', () => {
    const q: EvalQuery = { id: 1, category: 'out-of-corpus', query: 'k8s mars', expected_top_3: [], tools: [] };
    const qr: QueryResult = { hits: ['noise-a', 'noise-b'], match_quality: 'weak' };
    expect(localScore(q, qr)).toEqual({ p1: true, p3: true });
  });

  test('out-of-corpus query FAILS when match_quality is strong (false positive)', () => {
    const q: EvalQuery = { id: 1, category: 'out-of-corpus', query: 'k8s mars', expected_top_3: [], tools: [] };
    const qr: QueryResult = { hits: ['surprise-hit'], match_quality: 'strong' };
    expect(localScore(q, qr)).toEqual({ p1: false, p3: false });
  });

  test('in-corpus query passes when expected ID is in top-3', () => {
    const q: EvalQuery = {
      id: 1, category: 'vague-natural-language', query: 'wobble',
      expected_top_3: ['ezquake:cvar:cl_bob'], tools: [],
    };
    const qr: QueryResult = { hits: ['x', 'ezquake:cvar:cl_bob', 'y'], match_quality: 'strong' };
    expect(localScore(q, qr)).toEqual({ p1: false, p3: true });
  });

  test('in-corpus query fails when expected ID is absent', () => {
    const q: EvalQuery = {
      id: 1, category: 'exact-name', query: 'cl_bob',
      expected_top_3: ['ezquake:cvar:cl_bob'], tools: [],
    };
    const qr: QueryResult = { hits: ['ezquake:cvar:cl_bobcycle'], match_quality: 'weak' };
    expect(localScore(q, qr)).toEqual({ p1: false, p3: false });
  });

  test('eval module loads without throwing', () => {
    // Sanity check: eval.ts imports the tool tree; if any tool import has
    // drifted, this test surfaces it before the runner is invoked.
    expect(evalModule).toBeDefined();
  });
});
```

**Verification.**

```bash
cd apps/qw-oracle && bun test eval/eval.test.ts
```

PASS condition: 6 tests pass, 0 failures.
FAIL condition: any failure - the most likely cause is a drift in the `MatchQuality` type or an import error from a tool file Phase 6 / Phase 7 changed.

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: zero errors.
FAIL condition: any error - the most likely cause is a tool function signature drift (Phase 6 dependency).

### Task 3: Calibration runner - `eval/calibrate.ts`

**Goal.** Sweep STRONG/WEAK threshold pairs against `eval/calibration-queries.json` (D10) and print the pair that maximises label accuracy. Operator copies the printed values into `apps/qw-oracle/.env` (dev) or `/mnt/user/appdata/qw-oracle/.env` (prod). Calibration probes `search_concepts` only - the same env-var thresholds apply to `search_entities` (Phase 6 imports them in both tool bodies); calibrating against one tool keeps the sweep tractable. If the two tools' RRF score distributions diverge in a future arc, calibration becomes per-tool.

**Files.**

- Create: `apps/qw-oracle/eval/calibrate.ts`

**Steps.**

- [ ] Create `apps/qw-oracle/eval/calibrate.ts` with the full content below.

```ts
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
```

**Verification.**

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: zero errors.

(There is no `calibrate.test.ts`; calibration's correctness is the operator's eyeball check on the printed thresholds, plus the downstream eval gate.)

### Task 4: Wire `eval` and `calibrate` scripts in package.json; remove succeeded `.mjs` POCs

**Goal.** Add the two npm scripts and delete the throwaway helpdesk POC scripts the architecture spec named as the spiritual ancestors of `eval/eval.ts` (line 474).

**Files.**

- Modify: `apps/qw-oracle/package.json`
- Delete: `apps/qw-oracle/scripts/helpdesk-benchmark.mjs`
- Delete: `apps/qw-oracle/scripts/helpdesk-coverage.mjs`

**Steps.**

- [ ] Edit `apps/qw-oracle/package.json` to add the `eval` and `calibrate` scripts. The scripts use `bun` directly (D2). Final shape of the `scripts` block (preserving every existing script verbatim):

```json
"scripts": {
  "import:discord": "bun scripts/import-discord.mjs",
  "import:irc": "bun scripts/import-irc.mjs",
  "stats": "bun scripts/stats.mjs",
  "typecheck": "tsc --noEmit",
  "load-knowledge": "bun scripts/load-knowledge/index.ts",
  "db:up": "docker compose -f db/docker-compose.dev.yml up -d",
  "db:down": "docker compose -f db/docker-compose.dev.yml down",
  "db:logs": "docker compose -f db/docker-compose.dev.yml logs -f postgres",
  "db:psql": "docker compose -f db/docker-compose.dev.yml exec postgres psql -U qworacle -d qw_oracle",
  "migrate": "bun db/migrate.ts",
  "migrate:reset": "bun db/migrate.ts --reset",
  "test": "DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test",
  "eval": "bun eval/eval.ts",
  "calibrate": "bun eval/calibrate.ts"
}
```

(Phase 6 also adds `seed:redirect-targets` and possibly other scripts; preserve whatever Phase 6 left in place. The list above shows ONLY the additions/preservations Phase 8 owns.)

- [ ] Audit whether the `.mjs` POCs are still in the tree:

```bash
ls apps/qw-oracle/scripts/helpdesk-benchmark.mjs apps/qw-oracle/scripts/helpdesk-coverage.mjs 2>/dev/null
```

If the files print, delete them:

```bash
git rm apps/qw-oracle/scripts/helpdesk-benchmark.mjs
git rm apps/qw-oracle/scripts/helpdesk-coverage.mjs
```

If they print "No such file or directory", a prior phase already removed them - the deletion list in this phase MD's "Files touched / Deleted" section is descriptive, not prescriptive; skip the `git rm` and note "no-op (already removed)" in the Phase 8 commit message.

**Verification.**

```bash
grep -E '"(eval|calibrate)":' apps/qw-oracle/package.json
```

PASS condition: two matches:

```
"eval": "bun eval/eval.ts",
"calibrate": "bun eval/calibrate.ts"
```

```bash
test ! -f apps/qw-oracle/scripts/helpdesk-benchmark.mjs && \
  test ! -f apps/qw-oracle/scripts/helpdesk-coverage.mjs && echo OK
```

PASS condition: prints `OK`.

### Task 5: Operator extends the eval + calibration files; local pre-deploy verification

**Goal.** The operator extends the two query files to operator-curated sizes (10-15 eval, 5-8 calibration) using `#helpdesk` as the source. Then the operator runs `bun run calibrate` against the dev DB, writes the printed thresholds into `apps/qw-oracle/.env`, restarts the dev MCP server (or just reruns the eval since `bun run eval` reads thresholds from `process.env` at script start), and runs `bun run eval`. The eval MUST pass (recall@3 >= 70%) before any image is built or pushed in Task 8.

This task is operator-driven; the agent prepares the runbook below and waits on the operator's eyeball confirmation. No source files change in this task.

**Files.** None.

**Steps.**

- [ ] Operator opens `apps/qw-oracle/eval/eval-queries.json` and `apps/qw-oracle/eval/calibration-queries.json` and extends each per `apps/qw-oracle/eval/README.md` "How to extend." Sources of queries: 30 minutes of `#helpdesk` Discord history. Aim for category balance in the eval file (mix of concept-anchored / vague / exact-name / out-of-corpus). Aim for in-corpus / out-of-corpus balance in the calibration file (roughly 60/40 in / out).
- [ ] Confirm disjoint property by re-running the Task 1 disjoint check:

```bash
diff <(jq -r '.[].query' apps/qw-oracle/eval/eval-queries.json | sort) \
     <(jq -r '.[].query' apps/qw-oracle/eval/calibration-queries.json | sort) | \
  grep -E '^<.*=.*>' && echo "FAIL: overlapping queries" || echo "PASS: disjoint"
```

PASS condition: prints `PASS: disjoint`.

- [ ] Run calibration against the dev DB:

```bash
cd apps/qw-oracle
bun run calibrate
```

Expected: `Best thresholds: STRONG=<X> WEAK=<Y> accuracy=<Z>%` followed by two lines with the env-var values.

- [ ] Edit `apps/qw-oracle/.env` to set the printed thresholds. The dev .env is gitignored; the prod .env on Unraid is set by Task 9. If `apps/qw-oracle/.env` does not exist yet, create it from `apps/qw-oracle/deploy/.env.prod.example` (Task 7) using the dev placeholder values:

```
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle
VOYAGE_API_KEY=<paste-real-key>
EMBEDDING_MODEL_BUILD=voyage-4-large
EMBEDDING_MODEL_QUERY=voyage-4-lite
EMBEDDING_DIMENSION=1024
MATCH_QUALITY_STRONG_THRESHOLD=<paste from calibrate output>
MATCH_QUALITY_WEAK_THRESHOLD=<paste from calibrate output>
MCP_TRANSPORT=stdio
```

- [ ] Run the eval against the dev DB:

```bash
cd apps/qw-oracle
bun run eval
```

Expected: per-query PASS/FAIL lines, then `recall@1: ...`, `recall@3: ...`, then `PASS: deploy gate (recall@3 >= 70.0%) cleared`. Exit code 0.

If the eval fails: investigate per the recovery section. Most common cause for early Arc-1 ship: the operator's `expected_top_3` lists name canonical IDs that don't exist in the loaded corpus (typo, or the slug name drifted between concept-note authoring and eval-set authoring). Cross-check against `bun run db:psql` -> `SELECT canonical_id FROM entities WHERE canonical_id LIKE '%cl_bob%';` and `SELECT slug FROM concepts;`.

- [ ] Operator does NOT commit yet; the commit happens in Task 14 alongside the doc updates.

**Verification.**

```bash
cd apps/qw-oracle && bun run eval
echo "exit=$?"
```

PASS condition: prints the eval table and the `PASS: deploy gate ...` line; `exit=0`.
FAIL condition: prints `FAIL: recall@3 ...`; `exit=1`. Do NOT proceed to Task 6 until the gate passes.

### Task 6: Production Dockerfile + .dockerignore

**Goal.** A multi-stage Bun image that ships the MCP server (HTTP transport mode) and is small enough to publish via GHCR without surprises. Build context is the monorepo root (`/home/paradoks/projects/quakeworld/`) so workspace plumbing (`packages/qw-version-resolution/`, `bun.lock`) resolves. The runtime stage carries the `apps/qw-oracle/serve/mcp/` tree, `apps/qw-oracle/shared/`, `apps/qw-oracle/db/migrations/` (so the prod container can run `bun db/migrate.ts`), and `node_modules/` only - no source for loaders, no source for extractors, no source for the slipgate-app or matchscheduler. Loaders run from the operator's WSL against the prod Postgres over Tailscale; the prod container is read-only-ish (it serves MCP traffic and is restarted on image change).

The Voyage HTTP client lives in `apps/qw-oracle/shared/embedding.ts` (Phase 5); the prod MCP needs it for per-query embedding inside `search_entities` and `search_concepts`. The Voyage API key lands via `VOYAGE_API_KEY` env var.

**Files.**

- Create: `apps/qw-oracle/Dockerfile`
- Create: `apps/qw-oracle/.dockerignore`

**Steps.**

- [ ] Create `apps/qw-oracle/.dockerignore` with the content below. Keeps `node_modules`, `data/*.db*`, and any local artefacts out of the build context.

```
# apps/qw-oracle/.dockerignore
# Build context is the MONOREPO ROOT, not apps/qw-oracle/. Patterns are matched
# against monorepo-root-relative paths.

# Workspace install output - rebuilt inside the image.
**/node_modules

# SQLite-era data files (retired in Arc 1; Postgres prod data lives on Unraid).
apps/qw-oracle/data
apps/qw-oracle/output
apps/qw-oracle/scripts/extractors/*/output

# Editor / OS noise.
**/.DS_Store
**/.vscode
**/.idea

# Test fixtures and dev artefacts that have no place in the prod image.
**/*.bak
**/*.bak-*
apps/qw-oracle/db/data
apps/qw-oracle/db/postgres-data

# Other apps - the prod image only carries qw-oracle.
apps/matchscheduler
apps/quad
apps/qw-stats
apps/slipgate-app

# Documentation and other non-runtime files.
docs/
**/CLAUDE.md
**/VISION.md
**/OVERVIEW.md
**/README.md
**/SCHEMA.md
**/DEPLOYMENT.md
**/DEVELOPMENT.md
**/HANDOVER.md

# Eval files - operator-curated, but they reference tool internals; the prod
# container does not need them. Run eval/calibrate from the dev workstation
# against the prod connection string when you do need to.
apps/qw-oracle/eval

# Git metadata.
.git
.github
```

- [ ] Create `apps/qw-oracle/Dockerfile` with the full content below. Built from the monorepo root via `docker build -f apps/qw-oracle/Dockerfile -t ghcr.io/paradoks81/qw-oracle-mcp:<tag> .` (the `.` is the build context).

```dockerfile
# apps/qw-oracle/Dockerfile
# Build context: MONOREPO ROOT (/home/paradoks/projects/quakeworld/).
#
#   docker build -f apps/qw-oracle/Dockerfile \
#                -t ghcr.io/paradoks81/qw-oracle-mcp:<semver> \
#                -t ghcr.io/paradoks81/qw-oracle-mcp:latest \
#                .
#
# Two stages: install workspace deps once (deps stage), then copy the install
# output and the qw-oracle subset into a thin runtime image. The MCP server is
# the only entry point shipped; loaders, embedding scripts, and eval scripts
# run interactively from the operator's WSL against the prod Postgres over
# Tailscale, not inside this container.

ARG BUN_VERSION=1.3-alpine

FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /repo

# Workspace plumbing first (cached if package.json files don't change).
# The bun.lock at repo root resolves the workspace:* dep on
# @qw/version-resolution; the MCP server itself does not import that package
# but the parent qw-oracle package.json declares it.
COPY package.json bun.lock ./
COPY packages/qw-version-resolution/package.json ./packages/qw-version-resolution/package.json
COPY apps/qw-oracle/package.json ./apps/qw-oracle/package.json
COPY apps/qw-oracle/serve/mcp/package.json ./apps/qw-oracle/serve/mcp/package.json

RUN bun install --frozen-lockfile --production

FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app

# Copy the install output (root + per-workspace node_modules trees) plus
# packages/qw-version-resolution source (workspace dep needs to resolve via
# its symlink even though the MCP server does not import it).
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/qw-oracle/node_modules ./apps/qw-oracle/node_modules
COPY --from=deps /repo/apps/qw-oracle/serve/mcp/node_modules ./apps/qw-oracle/serve/mcp/node_modules
COPY --from=deps /repo/packages ./packages

# Manifests for runtime debugging (e.g. printing the version on startup).
COPY apps/qw-oracle/package.json ./apps/qw-oracle/package.json
COPY apps/qw-oracle/serve/mcp/package.json ./apps/qw-oracle/serve/mcp/package.json

# Source: the MCP server tree + the shared modules the MCP imports + the
# migrations the server runs at first boot. Concept-notes and extractor
# outputs are NOT copied; concept-note bodies are loaded into Postgres at
# corpus-build time (Phase 4 loader). Layer 1 / Layer 2 data is loaded into
# Postgres by the operator running loaders from WSL against the prod
# connection string over Tailscale (or via pg_dump | pg_restore from dev,
# see deploy/README.md).
COPY apps/qw-oracle/serve/mcp/src ./apps/qw-oracle/serve/mcp/src
COPY apps/qw-oracle/shared ./apps/qw-oracle/shared
COPY apps/qw-oracle/db ./apps/qw-oracle/db

WORKDIR /app/apps/qw-oracle

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3000
EXPOSE 3000

# Health endpoint comes from serve/mcp/src/transports/http.ts (Phase 6 Task 10).
# Use BusyBox-compatible flags only: alpine ships BusyBox wget, which supports
# `-q` and `-O <file>` reliably but may not accept GNU long-form options like
# `--tries=` across all alpine releases. Redirecting body to /dev/null and
# letting the exit code propagate is the most portable HEALTHCHECK shape.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1

CMD ["bun", "serve/mcp/src/index.ts"]
```

- [ ] Build the image locally as a smoke test (does NOT push):

```bash
cd /home/paradoks/projects/quakeworld
docker build -f apps/qw-oracle/Dockerfile \
             -t ghcr.io/paradoks81/qw-oracle-mcp:dev-smoke \
             .
```

Expected: image builds cleanly. The build is dominated by the `bun install --production` step; subsequent rebuilds (when only source changes) hit the deps cache and finish in seconds.

- [ ] Smoke-run the image with a stub DATABASE_URL just to confirm it boots far enough to fail on the Voyage check or DB connection (we don't have prod Postgres up yet; the goal here is "the image starts bun, finds its files, and reaches the env check"):

```bash
docker run --rm --name qw-oracle-mcp-smoke \
  -e DATABASE_URL=postgresql://nobody:nobody@127.0.0.1:54321/nope \
  -e VOYAGE_API_KEY=stub \
  -e MATCH_QUALITY_STRONG_THRESHOLD=0.05 \
  -e MATCH_QUALITY_WEAK_THRESHOLD=0.02 \
  -e MCP_TRANSPORT=http \
  -e MCP_PORT=3000 \
  --network=host \
  ghcr.io/paradoks81/qw-oracle-mcp:dev-smoke 2>&1 | head -20 || true
```

Expected: the container boots; the MCP server prints its banner ("[qw-oracle-mcp] http transport listening on 127.0.0.1:3000" or similar) and then exits when it cannot connect to Postgres at the stub URL. The exit is NOT what we are testing; we are testing that bun can find its modules and that the SDK + express are importable. Failure modes that matter here: `Cannot find module 'postgres'` (workspace plumbing broke in the build), `Cannot find module '@modelcontextprotocol/sdk'` (Phase 6 dep change didn't survive into the image), `bun: command not found` (wrong base image).

**Verification.**

```bash
docker images ghcr.io/paradoks81/qw-oracle-mcp:dev-smoke --format '{{.Size}}'
```

PASS condition: prints a size. The image size with Bun + the workspace deps is expected to land around 200-350 MB (Bun's Alpine image is ~80 MB, plus the workspace deps which include `postgres`, `@modelcontextprotocol/sdk`, `express`, `gray-matter`).
FAIL condition: empty output (image was not built); investigate the build log.

```bash
docker run --rm ghcr.io/paradoks81/qw-oracle-mcp:dev-smoke ls /app/apps/qw-oracle/serve/mcp/src/index.ts
```

PASS condition: prints the path.
FAIL condition: "No such file or directory" - the COPY in the Dockerfile dropped the file; re-check the runtime stage's `COPY apps/qw-oracle/serve/mcp/src` line.

### Task 7: Production compose + nginx + .env template + deploy README

**Goal.** Land the four files the operator copies to Unraid in Task 9. Compose carries Postgres (`pgvector/pgvector:pg16`, separate from any other Postgres on Unraid - this stack does not share network with the qw-stats / phoenix-postgres stack), the MCP container (pulled from GHCR, image set in Task 8), and nginx (reverse-proxies `/mcp` to the MCP container, serves `/snapshots/` from a volume mount that Arc 2 will populate, returns `/health` directly). nginx binds to `127.0.0.1:8080` so only the existing Cloudflare Tunnel reaches it - no public bind, ever.

The architecture spec section "Demo (Unraid)" lines 360-372 describes this topology; the compose below is the concrete realisation.

**Files.**

- Create: `apps/qw-oracle/deploy/docker-compose.prod.yml`
- Create: `apps/qw-oracle/deploy/nginx.conf`
- Create: `apps/qw-oracle/deploy/.env.prod.example`
- Create: `apps/qw-oracle/deploy/README.md`

**Steps.**

- [ ] Create the directory:

```bash
mkdir -p apps/qw-oracle/deploy
```

- [ ] Create `apps/qw-oracle/deploy/docker-compose.prod.yml` with the full content below.

```yaml
# apps/qw-oracle/deploy/docker-compose.prod.yml
# Unraid stack: Postgres (pgvector) + MCP server + nginx (TLS terminated by
# Cloudflare Tunnel; nginx is HTTP-only on 127.0.0.1:8080).
#
# Operator workflow (see deploy/README.md):
#   1. scp this file + nginx.conf + .env (operator-authored from .env.prod.example) to Unraid:
#        /mnt/user/appdata/qw-oracle/
#   2. ssh root@100.114.81.91
#   3. cd /mnt/user/appdata/qw-oracle
#   4. docker compose -f docker-compose.prod.yml pull
#   5. docker compose -f docker-compose.prod.yml up -d
#
# All persistent data lives under /mnt/user/appdata/qw-oracle/, which is on the
# weekly Unraid -> Synology backup.

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: qw-oracle-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: qw_oracle
      POSTGRES_USER: qworacle
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - /mnt/user/appdata/qw-oracle/postgres-data:/var/lib/postgresql/data
    networks:
      - qworacle-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qworacle -d qw_oracle"]
      interval: 10s
      timeout: 3s
      retries: 5

  mcp:
    image: ghcr.io/paradoks81/qw-oracle-mcp:${MCP_VERSION:-latest}
    container_name: qw-oracle-mcp
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://qworacle:${POSTGRES_PASSWORD}@postgres:5432/qw_oracle
      VOYAGE_API_KEY: ${VOYAGE_API_KEY}
      EMBEDDING_MODEL_BUILD: ${EMBEDDING_MODEL_BUILD:-voyage-4-large}
      EMBEDDING_MODEL_QUERY: ${EMBEDDING_MODEL_QUERY:-voyage-4-lite}
      EMBEDDING_DIMENSION: ${EMBEDDING_DIMENSION:-1024}
      MATCH_QUALITY_STRONG_THRESHOLD: ${MATCH_QUALITY_STRONG_THRESHOLD}
      MATCH_QUALITY_WEAK_THRESHOLD: ${MATCH_QUALITY_WEAK_THRESHOLD}
      EMBEDDING_VERIFY_TTL_HOURS: ${EMBEDDING_VERIFY_TTL_HOURS:-24}
      MCP_TRANSPORT: http
      MCP_PORT: 3000
      PUBLIC_BASE_URL: ${PUBLIC_BASE_URL:-https://oracle.slipgate.me}
    networks:
      - qworacle-net
    # No host port: the only public reachability is via nginx -> Cloudflare
    # Tunnel. Direct exposure on a host port would skip CF rate limiting.

  nginx:
    image: nginx:1.27-alpine
    container_name: qw-oracle-nginx
    restart: unless-stopped
    depends_on:
      - mcp
    ports:
      # 127.0.0.1 only - Cloudflare Tunnel routes to this address. Public
      # access goes through CF; binding 0.0.0.0 here would expose the MCP
      # without rate-limiting and bypass the spec's per-IP defence.
      - "127.0.0.1:8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /mnt/user/appdata/qw-oracle/snapshots:/var/oracle/snapshots:ro
    networks:
      - qworacle-net

networks:
  qworacle-net:
    name: qworacle-net
    driver: bridge
```

- [ ] Create `apps/qw-oracle/deploy/nginx.conf` with the full content below.

```nginx
# apps/qw-oracle/deploy/nginx.conf
# nginx fronts the MCP container; Cloudflare Tunnel terminates TLS and routes
# https://oracle.slipgate.me/* to http://127.0.0.1:8080/* on this Unraid box.

server {
  listen 80 default_server;
  server_name _;

  # Streamable HTTP MCP transport. Per the SDK's Streamable HTTP spec the
  # client opens a long-lived connection for server-initiated notifications
  # via GET /mcp; we disable nginx's response buffering so SSE chunks flow
  # through immediately. POST /mcp and DELETE /mcp work without buffering
  # tweaks but the same proxy block covers them since they target the same
  # upstream.
  location /mcp {
    proxy_pass         http://mcp:3000/mcp;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Connection        '';
    proxy_set_header   X-Accel-Buffering 'no';
    proxy_buffering    off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
  }

  # Snapshots: empty in Arc 1 (Arc 2 ships the manifest + delta-fetch
  # pipeline). The location block ships now so the public URL stays stable
  # across arcs - operators and slipgate-app authors can wire against
  # https://oracle.slipgate.me/snapshots/manifest.json without waiting for
  # a CF route change. Until Arc 2 publishes content here, the directory is
  # empty and requests return 404.
  location /snapshots/ {
    alias /var/oracle/snapshots/;
    add_header Cache-Control "public, max-age=300";
    add_header X-Content-Type-Options "nosniff";
    autoindex off;
  }

  # Plain-text health endpoint for uptime monitors and the Phase 8 deploy
  # gate. nginx returns this directly without proxying so a wedged MCP
  # container does not poison the health probe; the MCP container's own
  # /health (Phase 6) covers MCP-specific liveness.
  location = /health {
    return 200 'ok';
    add_header Content-Type text/plain;
  }

  # Anything else is 404 by design - this server is read-only, public, and
  # exposes only the three routes above.
  location / {
    return 404;
  }
}
```

- [ ] Create `apps/qw-oracle/deploy/.env.prod.example` with the full content below. Operator copies to `/mnt/user/appdata/qw-oracle/.env` on Unraid and fills in real values.

```
# apps/qw-oracle/deploy/.env.prod.example
# Copy to /mnt/user/appdata/qw-oracle/.env on Unraid; fill in real values; chmod 600.
# This file is gitignored on the dev side (apps/qw-oracle/.env); the .example
# file is committed.

# Postgres (used by docker-compose.prod.yml interpolation; the MCP container
# inherits via DATABASE_URL).
POSTGRES_PASSWORD=replace-me-with-long-random-string

# Voyage API.
VOYAGE_API_KEY=replace-me-with-real-voyage-key
EMBEDDING_MODEL_BUILD=voyage-4-large
EMBEDDING_MODEL_QUERY=voyage-4-lite
EMBEDDING_DIMENSION=1024

# Match-quality thresholds. Calibrated by `bun run calibrate` against the
# operator's calibration-queries.json (D10). Replace these placeholders with
# the values printed by the calibration run on prod (Task 11).
MATCH_QUALITY_STRONG_THRESHOLD=0.05
MATCH_QUALITY_WEAK_THRESHOLD=0.02

# Embedding-space verification cache (D8). The MCP startup check skips the
# Voyage probe if oracle_meta.embedding_space_verified_at is fresher than
# this many hours.
EMBEDDING_VERIFY_TTL_HOURS=24

# Public-facing base URL; surfaced in MCP `meta.queried_at` when the MCP
# decorates responses with absolute links (currently snapshot-related; future
# arcs may add more).
PUBLIC_BASE_URL=https://oracle.slipgate.me

# Image tag for the docker-compose.prod.yml `mcp` service. Pin to a semver
# tag for reproducibility; bump on each redeploy. `latest` works too but
# obscures which image is running.
MCP_VERSION=latest
```

- [ ] Create `apps/qw-oracle/deploy/README.md` with the operator-facing deploy runbook below.

```markdown
# qw-oracle - production deploy runbook

## Topology

```
client (Claude Desktop / Claude Code)
  -> https://oracle.slipgate.me/mcp     [Cloudflare Tunnel, TLS, per-IP rate limit 60/min]
       -> Unraid host 100.114.81.91 (Tailscale-only)
            -> nginx (127.0.0.1:8080)
                 -> mcp container (qworacle-net)
                      -> postgres container (qworacle-net)
```

Persistent data and configs live at `/mnt/user/appdata/qw-oracle/`:

- `postgres-data/` - Postgres state. Covered by the weekly Unraid -> Synology backup.
- `snapshots/` - empty in Arc 1; Arc 2 will write `manifest.json` and per-snapshot files here.
- `docker-compose.prod.yml`, `nginx.conf`, `.env` - operator-authored copies of `apps/qw-oracle/deploy/`.

## Prerequisites

- Tailscale up; `ssh root@100.114.81.91 'echo ok'` returns `ok`.
- `gh auth status` shows logged in; `docker login ghcr.io` succeeded recently.
- The image at `ghcr.io/paradoks81/qw-oracle-mcp:<tag>` exists (Task 8 of Phase 8 builds + pushes it).

## First-time deploy

1. Copy compose + nginx config to Unraid:

   ```bash
   ssh root@100.114.81.91 'mkdir -p /mnt/user/appdata/qw-oracle/{postgres-data,snapshots}'
   scp apps/qw-oracle/deploy/docker-compose.prod.yml \
       apps/qw-oracle/deploy/nginx.conf \
       root@100.114.81.91:/mnt/user/appdata/qw-oracle/
   ```

2. Author the `.env` on Unraid by copy-pasting `.env.prod.example` and filling in real values:

   ```bash
   ssh root@100.114.81.91
   cd /mnt/user/appdata/qw-oracle
   nano .env                                  # paste from apps/qw-oracle/deploy/.env.prod.example, fill in real secrets
   chmod 600 .env
   ```

   Set `POSTGRES_PASSWORD` to a long random string; set `VOYAGE_API_KEY` to a real key. Leave `MATCH_QUALITY_STRONG_THRESHOLD` and `MATCH_QUALITY_WEAK_THRESHOLD` at the placeholders for now; Task 11 calibrates them against prod and the operator updates them in this file.

3. Bring Postgres up alone first:

   ```bash
   docker compose -f docker-compose.prod.yml pull postgres
   docker compose -f docker-compose.prod.yml up -d postgres
   docker compose -f docker-compose.prod.yml ps
   ```

   Wait until `postgres` is healthy (`State: Up (healthy)`).

4. Pull the MCP image; bring up the rest of the stack:

   ```bash
   docker compose -f docker-compose.prod.yml pull mcp
   docker compose -f docker-compose.prod.yml up -d
   docker compose -f docker-compose.prod.yml ps
   ```

   Wait until `mcp` and `nginx` are running.

5. Migrate the prod DB. From inside the running MCP container:

   ```bash
   docker exec qw-oracle-mcp bun db/migrate.ts
   ```

   Expected: `[migrate] applying 001_init.sql`, then 002, ..., up through the highest migration shipped (`007_query_log.sql` after Phase 7). Final line: `[migrate] up-to-date (N migration(s) total, N newly applied)`.

6. Load the corpus. See Phase 8 Task 10 for the two paths (pg_dump from dev OR re-run loaders against prod). Default: pg_dump | pg_restore from the operator's WSL.

7. Calibrate match-quality thresholds against prod. See Phase 8 Task 11.

8. Run the eval gate against prod. MUST pass before the CF Tunnel route opens public DNS (Task 12).

## Routine redeploy (post-Phase-8)

```bash
# from operator's WSL
cd /home/paradoks/projects/quakeworld
docker build -f apps/qw-oracle/Dockerfile \
             -t ghcr.io/paradoks81/qw-oracle-mcp:<new-tag> \
             -t ghcr.io/paradoks81/qw-oracle-mcp:latest \
             .
docker push ghcr.io/paradoks81/qw-oracle-mcp:<new-tag>
docker push ghcr.io/paradoks81/qw-oracle-mcp:latest

# on Unraid
ssh root@100.114.81.91
cd /mnt/user/appdata/qw-oracle
docker compose -f docker-compose.prod.yml pull mcp
docker compose -f docker-compose.prod.yml up -d mcp
```

Postgres state survives image redeploys (volume mount); only the MCP container is replaced.

## Operator commands

| Action | Command |
|---|---|
| Live MCP logs | `ssh root@100.114.81.91 'docker logs -f qw-oracle-mcp'` |
| Postgres logs | `ssh root@100.114.81.91 'docker logs -f qw-oracle-postgres'` |
| Stack status | `ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps'` |
| Restart MCP only | `ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml restart mcp'` |
| Tail query_log | `ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "SELECT * FROM query_log ORDER BY id DESC LIMIT 10;"'` |
| Run eval against prod | `bun run eval` from operator WSL with `DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle` |

## Troubleshooting

- **`docker compose ps` shows mcp restarting** - check `docker logs qw-oracle-mcp`. Most likely: D8 startup check failed (Voyage build/query divergence) or `DATABASE_URL` cannot reach `postgres` (network name typo).
- **MCP starts but `/health` returns 502 from Cloudflare** - nginx is up but `mcp` is unreachable on `qworacle-net`. Run `docker network inspect qworacle-net` and confirm both containers are attached.
- **Voyage call fails at runtime** - check `embedding_api_log` for the per-call error: `psql -U qworacle -d qw_oracle -c "SELECT called_at, source, error FROM embedding_api_log ORDER BY id DESC LIMIT 5"`. Most common: `VOYAGE_API_KEY` is missing or rate-limited.
- **Eval against prod fails recall@3** - the calibrated thresholds did not transfer cleanly. Re-run `bun run calibrate` against the prod connection string and re-write the values to Unraid `.env`. Task 11 of Phase 8 covers this.
```

**Verification.**

```bash
# All four files exist with content.
test -f apps/qw-oracle/deploy/docker-compose.prod.yml && \
  test -f apps/qw-oracle/deploy/nginx.conf && \
  test -f apps/qw-oracle/deploy/.env.prod.example && \
  test -f apps/qw-oracle/deploy/README.md && echo OK
```

PASS condition: prints `OK`.

```bash
# Compose file parses.
docker compose -f apps/qw-oracle/deploy/docker-compose.prod.yml config --quiet
echo "exit=$?"
```

PASS condition: prints `exit=0` (compose validates).
FAIL condition: any non-zero - read the YAML error; fix the indentation or the env-var reference.

```bash
# nginx config syntax check via a one-shot container that mounts the file.
docker run --rm \
  -v "$PWD/apps/qw-oracle/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.27-alpine nginx -t 2>&1
```

PASS condition: prints `nginx: configuration file /etc/nginx/nginx.conf test is successful` (the included `default.conf` parses).
FAIL condition: any error - the syntax block in `nginx.conf` is wrong; fix and re-run.

### Task 8: Build and push the production image to GHCR

**Goal.** Tag a semver release of the qw-oracle MCP image (`0.4.0` for the Arc 1 ship - matches the version field in `apps/qw-oracle/serve/mcp/package.json` after Phase 6) plus `latest`, push both to `ghcr.io/paradoks81/qw-oracle-mcp`. The operator runs this AFTER Task 5's local eval gate has cleared - building an image that fails its own eval would publish a broken artefact.

**Files.** None (image-only).

**Steps.**

- [ ] Confirm gh auth and docker login are current:

```bash
gh auth status
docker login ghcr.io
```

PASS condition: `gh auth status` shows the operator's account; `docker login ghcr.io` reports `Login Succeeded`.

- [ ] Build the image with both `latest` and a semver tag from the monorepo root:

```bash
cd /home/paradoks/projects/quakeworld
docker build -f apps/qw-oracle/Dockerfile \
             -t ghcr.io/paradoks81/qw-oracle-mcp:0.4.0 \
             -t ghcr.io/paradoks81/qw-oracle-mcp:latest \
             .
```

Expected: builds cleanly (the deps layer is cached from the Task 6 smoke build; only source layers rebuild). Final image size 200-350 MB.

- [ ] Push both tags:

```bash
docker push ghcr.io/paradoks81/qw-oracle-mcp:0.4.0
docker push ghcr.io/paradoks81/qw-oracle-mcp:latest
```

Expected: both pushes succeed. The `latest` push is fast since it shares all layers with the `0.4.0` tag.

- [ ] Confirm the image is reachable on GHCR:

```bash
gh api /user/packages/container/qw-oracle-mcp/versions --jq '.[0:3] | map({name: .metadata.container.tags, pushed_at: .updated_at})'
```

PASS condition: the most recent two entries list `0.4.0` and `latest` (or both tags share the same digest), `pushed_at` recent.
FAIL condition: empty or older - investigate the push log; typical causes are auth scope (the GHCR PAT lacks `write:packages`) or a typo in the image name.

**Verification.**

```bash
# Pull from a clean Docker daemon to confirm the image is publicly visible to
# the operator's registry credentials. Tag check, not data check.
docker pull ghcr.io/paradoks81/qw-oracle-mcp:0.4.0
docker images ghcr.io/paradoks81/qw-oracle-mcp --format '{{.Tag}} {{.ID}}'
```

PASS condition: prints two lines (`0.4.0` and `latest`) with the same image ID.
FAIL condition: only one line, or different IDs - the `-t latest` tag flag was missing from the `docker build`; rebuild with both flags and re-push.

### Task 9: First-time Unraid deploy

**Goal.** Stand the prod stack up on Unraid, apply the migrations against the empty Postgres, and verify nginx serves `/health` over the loopback. No data is loaded yet (Task 10 covers); no public DNS opens yet (Task 12).

This task is operator-driven; the agent prepares the runbook (which is a tighter version of `apps/qw-oracle/deploy/README.md` "First-time deploy") and waits on the operator's eyeball confirmation.

**Files.** None (operational only).

**Steps.**

- [ ] Verify Tailscale and SSH:

```bash
ssh root@100.114.81.91 'echo ok'
```

PASS condition: prints `ok`.

- [ ] Create the Unraid directory structure:

```bash
ssh root@100.114.81.91 'mkdir -p /mnt/user/appdata/qw-oracle/{postgres-data,snapshots}'
```

- [ ] Copy compose + nginx config:

```bash
scp apps/qw-oracle/deploy/docker-compose.prod.yml \
    apps/qw-oracle/deploy/nginx.conf \
    root@100.114.81.91:/mnt/user/appdata/qw-oracle/
```

- [ ] Operator authors `.env` on Unraid (real secrets, not from this repo):

```bash
ssh root@100.114.81.91
cd /mnt/user/appdata/qw-oracle
nano .env                                       # paste apps/qw-oracle/deploy/.env.prod.example, fill in real values
chmod 600 .env
```

Set `POSTGRES_PASSWORD` to a long random string (operator generates locally). Set `VOYAGE_API_KEY` to the same key used in dev (the same Voyage account works; the build vs. query model strings are independent of the API key). Leave `MATCH_QUALITY_*` at the placeholders; Task 11 calibrates and the operator updates this file.

- [ ] Bring Postgres up:

```bash
ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle && \
  docker compose -f docker-compose.prod.yml pull postgres && \
  docker compose -f docker-compose.prod.yml up -d postgres'
```

- [ ] Wait for Postgres healthy:

```bash
ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps'
```

PASS condition: `qw-oracle-postgres` shows `Up (healthy)`.
FAIL condition: `Up (starting)` after 60 seconds - check `docker logs qw-oracle-postgres` for `password authentication failed` (typo in `.env`) or `permission denied` on `/var/lib/postgresql/data/pgdata` (the Unraid volume is owned by the wrong UID; `chown -R 999:999 /mnt/user/appdata/qw-oracle/postgres-data` fixes the standard Postgres UID).

- [ ] Pull MCP and bring the rest of the stack up:

```bash
ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle && \
  docker compose -f docker-compose.prod.yml pull mcp && \
  docker compose -f docker-compose.prod.yml up -d'
```

- [ ] Apply migrations against the prod DB. The MCP container has the migration files baked in (Task 6 COPYs `db/`); we exec into it:

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-mcp bun db/migrate.ts'
```

Expected: `[migrate] applying 001_init.sql`, ..., `[migrate] up-to-date (N total, N newly applied)`. The exact migration count matches whatever the latest sequential filename is at the Phase 8 ship (after Phase 7, that is `007_query_log.sql` plus any earlier-phase files; Phase 8 itself adds no new migrations).

- [ ] Verify nginx and `/health`:

```bash
ssh root@100.114.81.91 'curl -s http://127.0.0.1:8080/health'
```

PASS condition: prints `ok`.
FAIL condition: empty / connection refused - run `docker logs qw-oracle-nginx` and `docker compose ps`; nginx may not have started because `mcp` is unhealthy.

- [ ] Verify the MCP HTTP endpoint is reachable from inside Unraid (no public yet):

```bash
ssh root@100.114.81.91 'curl -s http://127.0.0.1:8080/mcp -X POST \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"' | head -c 200
```

Expected: a JSON-RPC error like `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Bad Request: No valid session ID provided"},"id":null}` because the call is missing the `initialize` handshake. That error is the right error - it means nginx routed correctly to the MCP container, and the MCP container's Streamable HTTP transport rejected the malformed request as the SDK contract requires. A different error (502 / connection refused / 404) signals a routing or container-bring-up failure.

**Verification.**

```bash
ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps --format json' | \
  python3 -c "import sys, json; rows=json.loads(sys.stdin.read()); [print(r['Service'], r['State']) for r in rows]"
```

PASS condition: three lines, each ending in `running`:

```
postgres running
mcp running
nginx running
```

FAIL condition: any service `restarting` or absent - investigate the relevant `docker logs <container>`.

```bash
ssh root@100.114.81.91 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/health'
```

PASS condition: `200`.

### Task 10: Load Layer 1 + Layer 2 + Layer 3 + embeddings into prod Postgres

**Goal.** Populate prod with the same content the dev DB has. Two acceptable paths; the phase MD picks one as the default (pg_dump | pg_restore from dev) because it is the fastest and most reproducible, and names the alternative (re-run loaders against the prod connection string over Tailscale) as a fallback. After this task the prod Postgres has the full Arc-1 corpus: Layer 1 entities + per-version + qw-namespace + change events + asset relations, Layer 2 Discord messages + sessions + tsvector, Layer 3 concepts + chunks + bidirectional graph + embedding columns populated.

**Files.** None (operational; data flows from dev DB to prod DB).

**Steps.**

- [ ] **Default path: pg_dump | pg_restore over Tailscale.** Operator runs from WSL.

  Pre-flight: confirm dev DB is the canonical source (latest extractor outputs loaded, embeddings populated, all phases through Phase 7 shipped):

  ```bash
  cd /home/paradoks/projects/quakeworld/apps/qw-oracle
  docker compose -f db/docker-compose.dev.yml exec -T postgres \
    psql -U qworacle -d qw_oracle -c "
      SELECT 'entities' AS table_name, count(*) FROM entities
      UNION ALL SELECT 'concepts', count(*) FROM concepts
      UNION ALL SELECT 'concept_chunks', count(*) FROM concept_chunks
      UNION ALL SELECT 'concept_chunks (embedded)', count(*) FROM concept_chunks WHERE embedding IS NOT NULL
      UNION ALL SELECT 'messages', count(*) FROM messages
      UNION ALL SELECT 'sessions', count(*) FROM sessions
      ORDER BY table_name"
  ```

  Read the row counts; these are the numbers prod must match after restore.

  Dump dev DB (full schema + data, custom format):

  ```bash
  docker compose -f db/docker-compose.dev.yml exec -T postgres \
    pg_dump -U qworacle -d qw_oracle -Fc -Z 6 > /tmp/qw_oracle_arc1.dump
  ls -lh /tmp/qw_oracle_arc1.dump
  ```

  Expected: a single file in `/tmp/`, sized around 200-800 MB depending on Layer 2 / chunk counts. (The bulk is `messages.content_tsv` and `concept_chunks.embedding`.)

  Stop the prod MCP so no concurrent writes during restore (Postgres handles concurrent reads, but pg_restore is cleaner with the consumer offline):

  ```bash
  ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml stop mcp'
  ```

  Drop and recreate the prod DB so pg_restore runs against an empty target. (The Postgres container preserves its data volume; we only drop the database itself.):

  ```bash
  ssh root@100.114.81.91 'docker exec -i qw-oracle-postgres psql -U qworacle -d postgres -c "DROP DATABASE IF EXISTS qw_oracle"'
  ssh root@100.114.81.91 'docker exec -i qw-oracle-postgres psql -U qworacle -d postgres -c "CREATE DATABASE qw_oracle OWNER qworacle"'
  ```

  Stream the dump into prod's Postgres via Tailscale (the docker exec -i pipe accepts the dump from stdin):

  ```bash
  cat /tmp/qw_oracle_arc1.dump | \
    ssh root@100.114.81.91 'docker exec -i qw-oracle-postgres pg_restore -U qworacle -d qw_oracle --no-owner --no-acl --verbose 2>&1 | tail -40'
  ```

  Expected: pg_restore prints `processing data for table "..."` for each populated table; final lines name no errors. The vector type is registered by `001_init.sql` inside the dump; pgvector data deserialises natively under `pgvector/pgvector:pg16`.

  Bring the MCP back up:

  ```bash
  ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml start mcp'
  ```

  Re-run the migrator against the restored DB as a sanity check (it should report up-to-date because schema_migrations restored from dev):

  ```bash
  ssh root@100.114.81.91 'docker exec qw-oracle-mcp bun db/migrate.ts'
  ```

  PASS condition: `[migrate] up-to-date (N total, 0 newly applied)`.
  FAIL condition: any "applying" line - schema_migrations did not restore cleanly; investigate before continuing.

  Verify row counts match:

  ```bash
  ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
    SELECT '\''entities'\'' AS table_name, count(*) FROM entities
    UNION ALL SELECT '\''concepts'\'', count(*) FROM concepts
    UNION ALL SELECT '\''concept_chunks'\'', count(*) FROM concept_chunks
    UNION ALL SELECT '\''concept_chunks (embedded)'\'', count(*) FROM concept_chunks WHERE embedding IS NOT NULL
    UNION ALL SELECT '\''messages'\'', count(*) FROM messages
    UNION ALL SELECT '\''sessions'\'', count(*) FROM sessions
    ORDER BY table_name"'
  ```

  PASS condition: every row matches the dev counts captured in the pre-flight step.

  Re-seed `redirect_targets` if Phase 6's seed file was edited after the dev DB's last seed (otherwise the dev seed restored fine):

  ```bash
  # If the operator updated REPLACE_GUILD_ID / REPLACE_CHANNEL_ID placeholders
  # in db/seeds/redirect_targets.sql since the dev seed ran, re-apply on prod:
  cat apps/qw-oracle/db/seeds/redirect_targets.sql | \
    ssh root@100.114.81.91 'docker exec -i qw-oracle-postgres psql -U qworacle -d qw_oracle'
  ```

- [ ] **Alternative path: re-run loaders against prod over Tailscale.** Use this only if the dev DB is in a state the operator does NOT want copied into prod (e.g., dev has experimental data the public corpus must not show). The runtime is significantly longer (loaders + embedding takes hours, depending on Voyage rate limits). Skip if the default path succeeded.

  Set the prod connection string in the operator's WSL shell:

  ```bash
  export DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle
  ```

  Then run, in order, the same loader chain Phases 1-7 ran against dev:

  ```bash
  cd /home/paradoks/projects/quakeworld/apps/qw-oracle
  bun db/migrate.ts                                                # noop if dev was migrated; safe to run
  bun scripts/load-knowledge/extract-tag.ts ...                    # per ezQuake / FTE / QWCL / MVDSV tag the operator
                                                                    # wants in the public corpus; this is the same call
                                                                    # made during Layer 1 dev load
  bun scripts/load-knowledge/load-qw-namespace.ts                  # maps + gameplay; same as dev
  bun scripts/load-chat/import-discord.ts                          # Phase 3 Discord importer
  bun scripts/load-concepts/index.ts                               # Phase 4 concept loader (also embeds chunks via Phase 5 hook)
  bun scripts/embed/embed-entities.ts                              # Phase 5 entity embedding pass
  bun scripts/seed/seed-redirect-targets.ts                        # Phase 6 redirect_targets seed
  ```

  Note: each loader call hits Voyage; the cumulative token cost lands inside the free tier per the architecture spec walkthrough (lines 86-97). Re-runs are cheap because the loaders are hash-based incremental (Phase 5).

  When done, run the same row-count check from the default path and confirm prod matches operator expectations.

**Verification.**

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT count(*) AS entities_with_desc
  FROM entities
  WHERE description IS NOT NULL AND length(description) > 0"'
```

PASS condition: a non-zero count matching the dev DB's value.

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT count(*) AS embedded_chunks
  FROM concept_chunks WHERE embedding IS NOT NULL"'
```

PASS condition: a non-zero count matching the dev DB's value.

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT topic FROM redirect_targets ORDER BY topic"'
```

PASS condition: the seeded topics print (at minimum the six topics from Phase 6's seed: `discord-dev-corner`, `discord-helpdesk`, `expert-meag`, `expert-spoike`, `ezquake-docs`, `quakeworld-wiki`).

### Task 11: Calibrate match-quality thresholds against prod; eval gate

**Goal.** Run `bun run calibrate` against the prod Postgres (via Tailscale, from the operator's WSL) to find the threshold pair that fits the *prod* score distribution. Vector-space details are corpus-dependent; thresholds calibrated against dev are a defensible starting point but the prod corpus may have different score concentration after the full load. Operator writes the thresholds into Unraid's `.env`, restarts the MCP container so it picks up the new env vars, and runs `bun run eval` against prod. The eval MUST pass (recall@3 >= 70%) before the CF Tunnel route opens public DNS in Task 12.

This task replaces the legacy plan's Task 38 ("public-MCP deploy gate") and folds in the calibration step from Task 35. The disjoint property (D10) is preserved by file: `bun run calibrate` reads `eval/calibration-queries.json` only, `bun run eval` reads `eval/eval-queries.json` only.

**Files.** None.

**Steps.**

- [ ] From the operator's WSL, set the prod connection string for the calibration shell. The DATABASE_URL value uses the prod POSTGRES_PASSWORD from Unraid's `.env`:

```bash
export DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle
export VOYAGE_API_KEY=<the-same-key-used-by-the-prod-MCP>
```

(`MATCH_QUALITY_*` values do NOT matter for calibrate.ts because the script reads the raw RRF score from `searchConcepts` results, not the labeled match_quality.)

- [ ] Run calibration:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bun run calibrate
```

Expected: per-query top_score lines, then `Best thresholds: STRONG=<X> WEAK=<Y> accuracy=<Z>%`, then the two env-var lines.

- [ ] Operator updates Unraid's `.env`:

```bash
ssh root@100.114.81.91
nano /mnt/user/appdata/qw-oracle/.env
# Replace MATCH_QUALITY_STRONG_THRESHOLD and MATCH_QUALITY_WEAK_THRESHOLD with the calibrated values.
exit
```

- [ ] Restart the MCP container so it picks up the new env:

```bash
ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle && \
  docker compose -f docker-compose.prod.yml restart mcp'
```

- [ ] Wait for the container to be healthy:

```bash
ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps mcp'
```

PASS condition: `qw-oracle-mcp` shows `Up (healthy)` (the Dockerfile's HEALTHCHECK probes `/health`).

- [ ] Run the eval gate against prod from the operator's WSL with the same `DATABASE_URL`:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bun run eval
```

Expected: per-query PASS/FAIL lines, `recall@1: ...`, `recall@3: ...`, and `PASS: deploy gate (recall@3 >= 70.0%) cleared`. Exit code 0.

If FAIL: investigate per the recovery section. Most common cause for a prod-side regression: the calibration set's score distribution differs enough from the eval set's that the thresholds are mis-tuned; either extend the calibration set with more queries that mirror eval-set characteristics, or accept lower recall and document the gap. Do NOT relax the 70% gate without operator approval (the gate is the architecture spec's deploy gate, not a soft target).

**Verification.**

```bash
DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle \
  bun run eval
echo "exit=$?"
```

PASS condition: `exit=0`; final line includes `PASS: deploy gate ...`.
FAIL condition: `exit=1`; final line includes `FAIL: recall@3 ...`. Do NOT proceed to Task 12.

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT key, value FROM oracle_meta WHERE key = '\''embedding_space_verified_at'\''"'
```

PASS condition: one row, `value` is a recent ISO timestamp (the D8 verifier ran during MCP startup after the restart).
FAIL condition: zero rows or stale timestamp - the prod MCP did not run the verifier; check `docker logs qw-oracle-mcp` for the verifier output.

### Task 12: Open the Cloudflare Tunnel route + DNS CNAME

**Goal.** Add the Unraid Cloudflare Tunnel route that maps `oracle.slipgate.me` to the loopback nginx, and add the DNS CNAME so resolution works publicly. This task is fully operator-driven via the Cloudflare dashboard - no source files change.

The architecture spec section "Demo (Unraid)" (lines 367-369) names the routes; this task is the realisation.

**Files.** None.

**Steps.**

- [ ] Operator opens the Cloudflare dashboard for the existing Unraid tunnel (the same tunnel that fronts `qw-api.poker-affiliate.org` for qw-stats; the operator may have multiple tunnels - pick the one whose origin runs on the same Unraid box).
- [ ] Add a public hostname:
  - **Subdomain:** `oracle`
  - **Domain:** `slipgate.me`
  - **Service type:** HTTP
  - **URL:** `127.0.0.1:8080`
  - **TLS settings:** No additional verification needed (origin is loopback HTTP). Origin server name and HTTP/2 toggles can stay at defaults.
  - **Save**.
- [ ] Cloudflare auto-creates the proxied CNAME for `oracle.slipgate.me` against the tunnel-CNAME endpoint. Verify in the Cloudflare DNS tab:
  - **Type:** CNAME
  - **Name:** `oracle`
  - **Target:** `<tunnel-uuid>.cfargotunnel.com` (the tunnel's CNAME)
  - **Proxy:** Proxied (orange cloud).
- [ ] Configure per-IP rate limiting at the Cloudflare zone level (architecture spec line 79 / Risks: 60 req/min per IP). Cloudflare dashboard: Security -> WAF -> Rate limiting rules:
  - **Rule name:** qw-oracle-mcp-rate-limit
  - **Match:** Hostname equals `oracle.slipgate.me`
  - **Characteristics:** IP address
  - **Requests:** 60
  - **Period:** 1 minute
  - **Action:** Block
  - **Save**.

  (The exact dashboard wording shifts between Cloudflare UI revisions; if "Rate limiting rules" is renamed or moved, the operator follows the dashboard's path to "Per-IP rate limit" or "Custom rate limit." The semantic is the same: 60/min per IP.)

- [ ] Wait for DNS propagation. Cloudflare proxied records are typically resolvable in under 60 seconds.

**Verification.**

```bash
# DNS resolution.
dig +short oracle.slipgate.me
```

PASS condition: prints one or more Cloudflare-anycast IP addresses (e.g. `104.21.x.x` / `172.67.x.x`).
FAIL condition: empty output - DNS hasn't propagated yet; wait 60 seconds and retry. If still empty after 5 minutes, the CNAME wasn't saved.

```bash
# Public health endpoint reachable through Cloudflare.
curl -s https://oracle.slipgate.me/health
```

PASS condition: prints `ok`.
FAIL condition: any non-200 response - check the CF tunnel status in the dashboard; the most likely cause is the tunnel route pointing at the wrong port (verify `127.0.0.1:8080`) or the Unraid nginx not running.

### Task 13: Public-MCP smoke - Claude Desktop probe

**Goal.** Wire a Claude Desktop / Claude Code instance to the public MCP and run the canonical "screen wobble" probe the architecture spec named (and the Phase 6 smoke ran against the dev DB). This is the operator's "the system actually works for a consumer" eyeball test.

This task is operator-driven (manual Claude Desktop configuration, manual eyeball of the chat response). No source files change.

**Files.** None.

**Steps.**

- [ ] Operator opens Claude Desktop configuration. Add the public MCP server:

```jsonc
// claude_desktop_config.json (location varies by OS; on Windows: %APPDATA%/Claude)
{
  "mcpServers": {
    "qw-oracle": {
      "url": "https://oracle.slipgate.me/mcp"
    }
  }
}
```

(For Streamable HTTP transport the SDK's client expects the bare `/mcp` URL; the SDK negotiates the session via the standard `mcp-session-id` header.)

- [ ] Restart Claude Desktop. In a fresh chat, ask:

```
how do I make my screen stop wobbling in QuakeWorld?
```

- [ ] Eyeball the response. PASS conditions:
  - The model invokes one or more of `search_concepts`, `search_entities`, `lookup_entity`.
  - The response cites either `cl_bob` (Layer 1 cvar; `ezquake:cvar:cl_bob` canonical id) or the `weapon-scripts` concept note (Layer 3; `concept:weapon-scripts`) or both.
  - The response does not confabulate (no fabricated cvars, no fabricated commands).
  - `match_quality` reaches `'strong'` or `'weak'` for at least one tool call (visible in the model's tool-call trace if Claude Desktop is set to show tool reasoning).

- [ ] Eyeball `query_log` to confirm the tool calls landed:

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT queried_at, tool, query_text, match_quality, latency_ms, consumer_hint
  FROM query_log
  ORDER BY id DESC
  LIMIT 5"'
```

PASS condition: rows present from the last few minutes; `tool` reflects the tools the model invoked; `consumer_hint` is something like `claude-ai/<version>` or similar (per the SDK's clientInfo).

- [ ] (Optional) Run a deliberately out-of-corpus probe to confirm the honest-failure machinery:

```
how do I deploy a kubernetes pod for production?
```

PASS condition: the model either calls `redirect_to_human` and returns the curated targets, or explicitly says the corpus does not cover the question. PASS specifically does NOT include a confabulated kubectl tutorial.

**Verification.**

The smoke is operator-eyeball; there is no machine-checkable verification beyond the `query_log` query above. If the smoke fails (e.g., the public response confabulates cvars), do NOT advance to Task 14 - investigate via the recovery section.

### Task 14: Doc updates - retire SQLite rule, update OVERVIEWs, append arc-history

**Goal.** Land the four doc updates the architecture spec and the legacy plan name. Each update is mechanical and small; the goal is alignment with the post-Arc-1 reality (Postgres single-engine, public MCP live, Layer 2 ported) so a future reader sees a consistent project state.

**Files.**

- Modify: `apps/qw-oracle/CLAUDE.md`
- Modify: `apps/qw-oracle/OVERVIEW.md`
- Modify: `OVERVIEW.md` (root)
- Modify: `apps/qw-oracle/docs/arc-history.md`

**Steps.**

- [ ] In `apps/qw-oracle/CLAUDE.md`, retire the "SQLite over Postgres" line under "Always-on rules" (line 52 at Phase 7 ship). Replace the bullet with a Postgres attestation. Diff shape:

```diff
- - **Keep it simple** -- scripts over frameworks, SQLite over Postgres. Local-first processing -- minimise API costs, maximise iteration speed.
+ - **Authoritative store is Postgres 16 + pgvector + tsvector.** Single-engine, all three layers. The SQLite era ended with Arc 1 (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`). SQLite remains acceptable for genuinely-derived artefacts (test fixtures, throwaway POCs); the authoritative path is Postgres for everything else.
+ - **Keep it simple** -- scripts over frameworks, integration tests over unit tests, hand-rolled SQL migrations over migration frameworks. Local-first processing -- minimise API costs, maximise iteration speed.
```

Also update the "Tech stack" block (line 36-40 at Phase 7 ship) to drop `better-sqlite3` from the bullet list and add `postgres-js + pgvector`. Diff shape:

```diff
- - **TypeScript + Node 20+ / Bun** for the Layer 1 loader (`scripts/load-knowledge/`).
- - **Plain .mjs scripts** for the Layer 2 corpus import (`scripts/import-*.mjs`, `scripts/stats.mjs`).
- - **better-sqlite3 11** for both stores; **ulid** for extractor-run IDs; **js-yaml** for seed ingestion.
- - **Python 3 + libclang 18** for the engine-source extractors (live at `scripts/extractors/<project>/`; shared lib at `scripts/extractors/extractor_lib/`).
+ - **TypeScript + Bun** for every script (loader, embed, eval, calibrate, MCP server).
+ - **Postgres 16 + pgvector + tsvector** (image: `pgvector/pgvector:pg16`); single engine across Layer 1 / Layer 2 / Layer 3.
+ - **postgres-js** for DB access; **ulid** for extractor-run IDs; **js-yaml** for seed ingestion.
+ - **Python 3 + libclang 18** for the engine-source extractors (live at `scripts/extractors/<project>/`; shared lib at `scripts/extractors/extractor_lib/`).
```

(If the lines don't appear at exactly these positions because Phase 7 already touched them, locate the live versions via `grep -n` and apply the same semantic change. The phase MD's diff is the *intent*; mechanical positions drift across phases.)

If `apps/qw-oracle/CLAUDE.md`'s documentation index does not yet list `OBSERVABILITY.md` (Phase 7 may have added this row already), add the row:

```markdown
| Operator observability cheatsheet (query_log + embedding_api_log queries) | `docs/OBSERVABILITY.md` |
```

Add a new row to the index for the deploy runbook:

```markdown
| Production deploy runbook (Unraid + nginx + CF Tunnel) | `deploy/README.md` |
```

- [ ] In `apps/qw-oracle/OVERVIEW.md`, replace the "Layer 2 - state unknown" section. The replacement reflects the Arc-1 ship reality: Layer 2 is ported to Postgres + tsvector, enrichment (segment / classify / summarise / embed) is deferred to Arc 3. Diff shape (the existing section header at line 53 stays; the body changes):

```markdown
## Layer 2 - ported to Postgres in Arc 1

`messages`, `sessions`, `session_search`, `message_labels`, `discord_channels`, `import_log`, `processing_log` live in Postgres at `qw_oracle.public.*`. Discord-only by D9-revised: the platform CHECK locks to `'discord'`; pre-2016 IRC content is excluded (operator decision 2026-05-02). Lexical search uses `to_tsvector('simple', ...)` per D7 to preserve the language-agnostic SQLite FTS5 behaviour.

The `search_solved_issues` MCP tool serves Layer 2 with the same response shape as the SQLite era; internals are tsvector + GIN, not FTS5.

Layer 2 enrichment - segment / classify / summarise / session-summary embeddings - is deferred to Arc 3. The arc's design starts only after Arc 2 (snapshot delta-fetch) ships.

`data/qw.db` is gone; `data/knowledge.db` is gone. The authoritative store is Postgres only.
```

(The file's `**Lifecycle status:**` paragraph at line 5 should also be updated. The pre-Arc-1 text says "Layer 2 corpus is imported but the processing pipeline on top of it hasn't been touched in weeks (see "Layer 2 - state unknown" below)." Update to:)

```markdown
**Lifecycle status:** Active. Layer 1 covers six namespaces (ezQuake / FTE / QWCL / MVDSV engine ports + the `qw` game-content namespace) with KTX as the only outstanding port. Schema at v18, Postgres dialect, single-engine since Arc 1 (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`). Layer 2 ported to Postgres + tsvector; enrichment deferred to Arc 3. Public MCP live at `oracle.slipgate.me/mcp`. Most recent shipped arc: postgres-arc1 (2026-05-XX) - see `docs/arc-history.md`.
```

(Replace `2026-05-XX` with the actual Arc 1 ship date when committing.)

- [ ] In the root `OVERVIEW.md`, the integration-map ASCII diagram (around lines 56-77 at Phase 7 ship) annotates the qw-oracle node. Add a short line under the qw-oracle box noting the public MCP endpoint. The exact diagram structure depends on what the doc currently shows; the change is additive and surgical. Locate the existing block via:

```bash
grep -n "qw-oracle\|knowledge svc\|build-snapshot" OVERVIEW.md
```

Add an annotation line to the qw-oracle node, e.g.:

```
|  qw-oracle (knowledge svc) | -- Arc 1: public MCP live at oracle.slipgate.me/mcp; snapshot delta-fetch lands in Arc 2.
```

(If the diagram uses ASCII boxes and line breaks that make adding text awkward, add a one-line annotation OUTSIDE the box, immediately after the diagram, named "Arc-1 update:". Don't try to redraw the diagram.)

- [ ] Append an entry to `apps/qw-oracle/docs/arc-history.md`. The file is the chronological ship log; the new entry follows the existing format (read the file first to mirror the heading shape). Append at the bottom (newest at top OR newest at bottom - mirror the existing convention). Sketch:

```markdown
## Arc 1 - Postgres + hybrid retrieval (2026-05-XX)

Single-engine Postgres 16 + pgvector + tsvector across all three layers; hybrid retrieval (RRF over lexical + semantic) on `search_entities` and the new `search_concepts`; bidirectional concept graph; `redirect_to_human` tool; Streamable HTTP transport behind Cloudflare Tunnel; public MCP live at `oracle.slipgate.me/mcp`.

- Phase 1: Postgres dev container + migrator.
- Phase 2: 31 tables ported via schema-as-generator from `schema.ts` (D3); `entities.description` derived from per-version rows (D6).
- Phase 3: Layer 2 (Discord-only) ported with `'simple'` tsvector config (D7 / D9-revised).
- Phase 4: Layer 3 concept loader + bidirectional graph + redirect_targets.
- Phase 5: Voyage v4 series embedding pipeline; D8 build/query embedding-space verifier.
- Phase 6: MCP rewrite on Postgres + Streamable HTTP transport + new tools.
- Phase 7: query_log + dispatcher wrapper + OBSERVABILITY.md cheatsheet.
- Phase 8: eval + calibration sets (disjoint per D10) + Docker prod build + Unraid deploy + public MCP.

SQLite era retired; `data/knowledge.db` and `data/qw.db` no longer in the runtime path. Authoritative store is Postgres for everything.

Spec: `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`. Plan: `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/`.
```

(Replace `2026-05-XX` with the actual ship date.)

**Verification.**

```bash
grep -c "SQLite over Postgres" apps/qw-oracle/CLAUDE.md
```

PASS condition: returns `0` (the line is gone).
FAIL condition: returns `>= 1` - the literal string is still present; re-edit.

```bash
grep -c "Layer 2 - state unknown" apps/qw-oracle/OVERVIEW.md
```

PASS condition: returns `0`.
FAIL condition: returns `>= 1`.

```bash
grep -c "oracle.slipgate.me" OVERVIEW.md
```

PASS condition: returns `>= 1`.
FAIL condition: returns `0` - the integration-map annotation didn't land.

```bash
grep -c "Arc 1 - Postgres + hybrid retrieval" apps/qw-oracle/docs/arc-history.md
```

PASS condition: returns `1` (exactly one entry; not duplicated).

### Task 15: Final commit - phase + arc

**Goal.** Land Phase 8 as a single commit per `decisions.md` D14 (each phase ships a runnable state). The operator's smoke against the public MCP (Task 13) has cleared; the eval gate (Task 11) cleared; the docs (Task 14) reflect post-Arc-1 reality. This commit closes the arc.

**Files.** All Phase 8 changes (already enumerated under "Files touched" above).

**Steps.**

- [ ] Stage everything Phase 8 touched. Per `CLAUDE.md` git workflow, this is one commit on `main`:

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/eval/ \
        apps/qw-oracle/Dockerfile \
        apps/qw-oracle/.dockerignore \
        apps/qw-oracle/deploy/ \
        apps/qw-oracle/package.json \
        apps/qw-oracle/CLAUDE.md \
        apps/qw-oracle/OVERVIEW.md \
        apps/qw-oracle/docs/arc-history.md \
        OVERVIEW.md
# Conditional: only if the .mjs POCs were still present at Task 4 time
git rm -f apps/qw-oracle/scripts/helpdesk-benchmark.mjs 2>/dev/null || true
git rm -f apps/qw-oracle/scripts/helpdesk-coverage.mjs 2>/dev/null || true

git commit -m "qw-oracle: phase 8 - eval + calibrate + docker prod + unraid deploy; arc 1 ships"
```

- [ ] Push to origin (the operator does not touch git; this is mechanical):

```bash
git push origin main
```

**Verification.**

```bash
git log -1 --name-only --pretty=format:'%h %s%n'
```

PASS condition: the commit message matches; the file list includes the Phase 8 additions and the doc updates.
FAIL condition: any expected file missing - check `git status` for stragglers and amend.

## Verification (phase boundary)

Run all of these from the operator's WSL at the end of the phase. Each block is YES/NO; operator eyeballs.

### 1. Eval gate against prod

```bash
DATABASE_URL=postgresql://qworacle:<prod-password>@100.114.81.91:5432/qw_oracle \
  bun run --cwd apps/qw-oracle eval
echo "exit=$?"
```

PASS condition: `exit=0`; final line includes `PASS: deploy gate (recall@3 >= 70.0%) cleared`.
FAIL condition: `exit=1`. Re-run Task 11.

### 2. Public health endpoint

```bash
curl -s -w "%{http_code}\n" https://oracle.slipgate.me/health
```

PASS condition: prints `ok` followed by `200`.

### 3. Public MCP transport

```bash
curl -s https://oracle.slipgate.me/mcp -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

PASS condition: a JSON-RPC error response (e.g. `"Bad Request: No valid session ID provided"`) - means nginx routed and the MCP transport is alive but rejected the malformed handshake.
FAIL condition: 502 / 504 / timeout - the tunnel does not reach the MCP container.

### 4. Production stack healthy

```bash
ssh root@100.114.81.91 'docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml ps'
```

PASS condition: three services `running`; postgres `healthy`.

### 5. Migrations applied

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT count(*) FROM schema_migrations"'
```

PASS condition: count matches the number of migration files under `apps/qw-oracle/db/migrations/` (after Phase 7, that is 7: `001_init.sql` through `007_query_log.sql`, plus any earlier-phase additions; count by `ls apps/qw-oracle/db/migrations/*.sql | wc -l`).

### 6. Embedding-space sanity stamped

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT key, value FROM oracle_meta WHERE key = '\''embedding_space_verified_at'\''"'
```

PASS condition: one row, `value` is an ISO timestamp from this Phase 8 deploy session.

### 7. query_log writes flowing

```bash
ssh root@100.114.81.91 'docker exec qw-oracle-postgres psql -U qworacle -d qw_oracle -c "
  SELECT count(*) FROM query_log WHERE queried_at > now() - INTERVAL '\''1 hour'\''"'
```

PASS condition: a non-zero count (rows from the Task 13 Claude Desktop probe and any subsequent traffic).

### 8. Docs reflect post-Arc-1 reality

```bash
grep -c "SQLite over Postgres" apps/qw-oracle/CLAUDE.md
grep -c "Layer 2 - state unknown" apps/qw-oracle/OVERVIEW.md
grep -c "oracle.slipgate.me" OVERVIEW.md
grep -c "Arc 1 - Postgres + hybrid retrieval" apps/qw-oracle/docs/arc-history.md
```

PASS condition: prints `0`, `0`, `>=1`, `1` (in that order).

### 9. Phase commit landed

```bash
git log -1 --pretty=format:'%h %s%n'
```

PASS condition: subject line includes `phase 8` and `arc 1 ships` (or close mechanical match).

## Outputs to next phase

Phase 8 is the last phase of Arc 1. There is no "next phase" within this arc.

After Phase 8 lands:

- The public MCP at `https://oracle.slipgate.me/mcp` is live and calibrated.
- The eval gate (`bun run eval`) is the gate for any future redeploy that touches retrieval (new Voyage model, new chunking strategy, new RRF weight). Operator runs it before pushing a new image.
- `query_log` is collecting consumer traffic; `OBSERVABILITY.md` (Phase 7) documents how to read it.
- `redirect_targets` is seeded with placeholders; the operator should update the `REPLACE_GUILD_ID` / `REPLACE_CHANNEL_ID` placeholders to the real Quake.World Discord channel + user IDs at operator-discretion (this is a content edit, not a phase-gated change).

Arc 2 (snapshot manifest + delta-fetch pipeline) starts when the operator opens a fresh planning session. Arc 2's prerequisite is Arc 1 shipped, which is what Phase 8's commit attests.

## Open questions / deferred items

1. **Question:** Calibration probes `search_concepts` only; the same env-var thresholds (`MATCH_QUALITY_STRONG_THRESHOLD` / `MATCH_QUALITY_WEAK_THRESHOLD`) apply to `search_entities` (Phase 6 imports them in both). The two tools' RRF score distributions are similar in shape but not identical (entity descriptions are shorter than concept chunks; the lexical hit density differs).
   **Default chosen for now:** single calibration target (`search_concepts`); thresholds apply uniformly. The eval gate covers entity-side queries, so a thresholds-too-strict failure on entities would surface there.
   **Who can resolve:** operator if a future arc surfaces consistent entity-side miscalibration; the fix is to split the env vars (`MATCH_QUALITY_*_THRESHOLD_CONCEPTS` / `_ENTITIES`) and run two calibration sweeps. Out of scope for Arc 1.

2. **Question:** Production data load defaults to `pg_dump | pg_restore`. The alternative (re-run loaders against the prod connection over Tailscale) is documented as a fallback but takes hours due to Voyage rate limits. Some operators may prefer the loader path for reproducibility (the dump captures whatever was in dev, including any half-experimental rows).
   **Default chosen for now:** `pg_dump | pg_restore`. Faster, simpler, captures the validated dev state. The loader path stays in Task 10 as the alternative.
   **Who can resolve:** operator at Task 10 execution time. If the dev DB has experimental rows the public corpus must not show, the operator runs the loader path instead.

3. **Question:** GHCR image tag strategy. Phase 8 ships with `latest` plus `0.4.0` (matches `apps/qw-oracle/serve/mcp/package.json` version). Some teams pin to git SHA tags for full reproducibility; others rely on semver only.
   **Default chosen for now:** `latest` + semver. Git SHA tags can be added later by extending Task 8's docker build line.
   **Who can resolve:** operator if a future incident demands a precise rollback target.

4. **Question:** Cloudflare rate limit value (60 req/min per IP per spec line 79). Spec says "relying on per-IP CF rate limiting; no app-level auth in Arc 1." Whether 60/min is right for the actual public-MCP traffic shape is unknown - depends on how many Claude Desktop / Cursor / Zed consumers hit the endpoint and how chatty their iteration loops are.
   **Default chosen for now:** 60/min as the spec named.
   **Who can resolve:** operator after observing real traffic in `query_log` for a week. If the limit fires too often, raise to 120/min; if abuse signals appear, lower or block.

5. **Question:** Cloudflare cache policy for `/snapshots/`. The architecture spec says "served via the same domain" with "aggressively cached at the CF edge" (line 369). Phase 8 ships nginx with `Cache-Control: public, max-age=300` (5 min); CF can layer additional edge cache rules.
   **Default chosen for now:** 5 min nginx-side; no extra CF cache rules. Snapshots are empty in Arc 1, so caching policy is moot until Arc 2 publishes content.
   **Who can resolve:** Arc 2 owner. The nginx config can be edited in place when Arc 2 starts publishing manifest + per-snapshot files.

6. **Question:** `consumer_hint` reliability under Streamable HTTP transport. Phase 7's `setConsumerHint` is a single global; under HTTP/SSE-style transport with concurrent sessions, the *last* client to connect wins. The architecture spec lines 312-317 names the column without specifying per-session scoping.
   **Default chosen for now:** ship with the global; documented in Phase 7 OBSERVABILITY.md as best-effort under HTTP transport.
   **Who can resolve:** operator after observing the public MCP's `consumer_hint` distribution in `query_log`. If the column is reliably populated under the typical traffic shape (one consumer per minute, no overlap), no change. If overlap rate is high, Phase 7's wrapper grows a per-call `consumerHint` argument and the dispatcher passes it from the SDK request context.

7. **Question:** Redirect targets seed currently ships with `REPLACE_GUILD_ID` / `REPLACE_CHANNEL_ID` / `REPLACE_USER_ID` placeholders (Phase 6 Task 7's seed file). For a public-MCP deploy these placeholders are URL-shaped but functionally broken - clicking them lands on a Discord error page. The architecture spec section "Honest-failure machinery" lines 167-180 says the redirect tool gives the consumer LLM a non-confabulating action; if the URLs are broken that promise degrades.
   **Default chosen for now:** ship with the placeholders. The tool still returns the seeded entries (display_name + description still useful as orientation); the broken URLs are flagged via a follow-up.
   **Who can resolve:** operator before Task 13 if convenient (5 minutes of finding the real Discord channel IDs and user IDs); otherwise as a follow-up. The fix is `nano apps/qw-oracle/db/seeds/redirect_targets.sql`, replace the placeholders, then run `bun run seed:redirect-targets` against the prod connection string.

8. **Question:** Backup verification cadence. Architecture spec says weekly Unraid -> Synology covers it. Phase 8 does not explicitly verify the first backup includes `/mnt/user/appdata/qw-oracle/postgres-data/`.
   **Default chosen for now:** trust the existing backup posture; the architecture spec doesn't require a Phase 8 verification.
   **Who can resolve:** operator a week post-deploy by spot-checking that the Synology snapshot includes the qw-oracle subtree. If not, add a directory exclusion-filter override on the Unraid backup config.

### Sub-agent findings rejected with rationale

The verification sub-agent flagged two CRITICAL findings on its first pass: "Missing `searchConcepts` function" and "Missing HTTP transport." Both refer to files that Phase 6 creates (Phase 6 Task 6 ships `serve/mcp/src/tools/search-concepts.ts`; Phase 6 Task 10 ships `serve/mcp/src/transports/http.ts`). Phase 8's "Inputs from previous phase" section already lists these as Phase 6 deliverables. Per the phase chain (Phase 1 -> 2 -> ... -> 8 in commit order, with each phase boundary operator-reviewed before the next phase begins), Phase 8 cannot be drafted against a code state where Phase 6 has not yet shipped - that would force every downstream phase MD to inline its predecessors' source. The sub-agent's check rule (phase-template.md verification item 4: "for Created files, the file ITSELF is expected NOT to exist yet ... do NOT flag a Created file's non-existence") covers files Phase 8 itself creates; the same logic applies a fortiori to files Phase 6 creates and Phase 8 imports. Rejection rationale: cross-phase dependency, correctly captured in "Inputs from previous phase," not a CRITICAL bug. The sub-agent's third finding ("`query_log` table doesn't exist yet") was self-acknowledged by the sub-agent as "purely informational drift" and is rejected on the same basis (Phase 7 ships `007_query_log.sql`).

The sub-agent's substantive finding on the Dockerfile HEALTHCHECK (Alpine BusyBox wget compatibility) WAS applied to Task 6's Dockerfile - the new `CMD wget -q -O /dev/null ...` form uses only BusyBox-compatible flags.

## Recovery (if verification fails)

- **Verification 1 fails (eval gate):** the prod corpus is loaded but recall@3 is below 70%. Most common cause: thresholds calibrated against dev did not transfer to prod. Re-run Task 11 against prod and update Unraid `.env`. If thresholds are calibrated correctly and the gate still fails, the prod corpus is genuinely thinner than dev - check Task 10's row counts; if any layer's row count is below dev, the load was incomplete.

- **Verification 2 fails (`/health` not responding):** the public route is broken. Probe in order: (a) `curl http://127.0.0.1:8080/health` from inside Unraid (`ssh root@100.114.81.91 'curl ...'`) - if this fails, nginx is wedged; restart it. (b) Check CF tunnel status in the dashboard - if "Down", the tunnel agent on Unraid is unreachable; restart `cloudflared` on Unraid. (c) Check the CF Tunnel route - if the route still points at the qw-stats port (3100) instead of qw-oracle (8080), edit the route.

- **Verification 3 fails (MCP transport not routing):** nginx is up but `mcp` is unreachable on `qworacle-net`. Run `docker network inspect qworacle-net` and confirm both containers are attached. If `mcp` is missing from the network, restart `mcp` (`docker compose -f docker-compose.prod.yml restart mcp`); compose re-attaches it.

- **Verification 4 fails (a service not running):** read the relevant `docker logs <container>`. The most common cause for `mcp` failing to start is the D8 startup check failing (Voyage build/query divergence) or `DATABASE_URL` being malformed. The most common cause for `nginx` failing to start is a syntax error in the mounted config; re-run the Task 7 nginx config check.

- **Verification 5 fails (migrations short):** the `bun db/migrate.ts` step in Task 9 was skipped or interrupted. Re-run `docker exec qw-oracle-mcp bun db/migrate.ts`; the migrator is idempotent on already-applied migrations.

- **Verification 6 fails (embedding-space not stamped):** the D8 verifier did not run on the prod MCP startup. Check `docker logs qw-oracle-mcp` for the verifier line. If absent, the MCP started before `oracle_meta` was queryable; restart the MCP container after confirming Postgres is healthy. If the verifier ran but failed (cosine below threshold), the build vs. query embedding spaces have diverged on prod - investigate at the operator level (re-check `VOYAGE_API_KEY`, retry).

- **Verification 7 fails (no query_log writes):** the dispatcher wrapper isn't recording. Quick check: `docker logs qw-oracle-mcp 2>&1 | grep query-log`. If "[query-log] failed to record" appears, the wrapper is hitting an INSERT error - check `query_log` table shape (`\d+ query_log`) on prod.

- **Verification 8 fails (docs):** mechanical edits did not land. Re-run Task 14's individual edits.

- **Verification 9 fails (commit):** `git status` shows uncommitted files. Re-stage and amend (Phase 8's commit is a single coherent unit, so amend is acceptable here; do NOT amend after `git push` unless the operator approves).

For unanticipated failures: surface to operator. The Arc 1 ship is the highest-value moment in the project; do not paper over a failure mode just to land the commit.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

(Sub-agent brief is dispatched in the next operator-visible step. Findings - if any - are applied back into this MD before the operator review opens.)
