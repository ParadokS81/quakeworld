# Phase 5 - Embedding pipeline

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Stand up the Voyage AI embedding client (build + query split, shared 1024-dim space across the v4 series), the Layer 1 entity-description embedding pipeline, and the Layer 3 concept-chunk embedding pipeline. Hash-based incremental: every row carries a sha256 of the source text it was last embedded from, and the pipelines skip rows whose hash matches. Every Voyage call is recorded in the new `embedding_api_log` table; the build-time embedding metadata (model name, version, dimension, row count) is upserted into the singleton `embedding_metadata` row landed in Phase 1. The phase also lands the D8 / F14 closure: a verifier that embeds a known string with both the build model (`voyage-4-large`) and the query model (`voyage-4-lite`) and asserts cosine similarity >= 0.85, refusing to certify the corpus if the two spaces have drifted apart. The verifier is shipped as a standalone CLI that Phase 6 will later wire into MCP startup.

The embedding passes hook into the existing loaders so the operator's authoring loop is one command per layer: `extract-tag` for Layer 1 ends with `embedEntitiesPass()`; `load-concepts` for Layer 3 ends with `embedConceptChunks()`. Both passes run AFTER the loader's main transaction commits - if Voyage is down the structured rows are still committed and the embeddings are marked stale via the existing `*_embedding_stale` boolean. Stale rows remain retrievable via lexical search; round-1 vector rescue degrades but does not fail. The architecture spec, lines 433-451, dictates this shape.

Runnable state at phase boundary: `qw_oracle` and `qw_oracle_test` carry migration `006_embedding_api_log.sql`; `embed:entities` has been run end-to-end against `qw_oracle` and every row in `entities` with a non-empty `description` carries a 1024-dim `description_embedding` plus its `description_embedding_sha256`; `embed:chunks` has been run and every row in `concept_chunks` carries an `embedding`; `verify:embedding-space` exits 0 and stamps `oracle_meta(key='embedding_space_verified_at')`; `embedding_metadata` row reads `(model_name='voyage-4-large', dimension=1024, rows_embedded=<entity-with-desc count>)`; `embedding_api_log` carries one row per Voyage call from the three runs; `bun test` is green.

## Inputs from previous phase

Phase 4 (Layer 3 + bidirectional graph) complete:
- `concepts`, `concept_chunks`, `concept_entities`, `concept_concepts`, `redirect_targets` tables exist in `qw_oracle` and `qw_oracle_test` via Phase 4's migration (presumed `005_layer3_concepts.sql`; ordinal is Phase 4's call). `concept_chunks` has columns `id BIGSERIAL`, `concept_slug TEXT`, `chunk_index INTEGER`, `text TEXT`, `text_sha256 TEXT`, `embedding vector(1024)` (NULL until this phase runs), `embedding_stale BOOLEAN NOT NULL DEFAULT FALSE`, `tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED`. The HNSW index on `embedding` and the GIN index on `tsv` are present from Phase 4.
- `apps/qw-oracle/scripts/load-concepts/index.ts` exists and parses every `.md` under `concept-notes/`, upserts `concepts`, derives `concept_chunks` rows, populates `concept_entities` + `concept_concepts`, but does NOT call into the embedding pipeline (that wiring is this phase's job).
- `apps/qw-oracle/shared/chunking.ts` exists and exports `chunkMarkdown` plus an `async sha256(text: string): Promise<string>` helper. This phase reuses `sha256` for Layer 1 entity descriptions; no new hash helper is created.

Phase 2 (Layer 1 port) complete:
- `entities` table carries `description TEXT`, `description_embedding vector(1024)` (NULL), `description_embedding_sha256 TEXT` (NULL), `description_embedding_stale BOOLEAN NOT NULL DEFAULT FALSE`, `description_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED`. The HNSW + GIN indexes on these columns are present from Phase 2 migration `003_layer1_entities_search.sql`.
- `entities.description` is populated for every entity-with-help-text via the per-type derivation step (Phase 2 Task 10 / D6). At phase boundary the cvar / command / macro / cmdline_param / hud_element / asset_category types have `description IS NOT NULL` for the bulk of their rows; ruleset / keyname have `description IS NULL` by design; token_primitive / flag_bit / cvar_alias / protocol_message / info_key / log_template / qc_builtin carry synthesised descriptions.
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` is the Layer 1 orchestrator (extract -> loadVersion -> diffVersions -> enrichPrs -> snapshot) and runs under Bun + postgres-js. This phase appends one final step (`embedEntitiesPass`).

Phase 1 (Foundation) complete:
- `apps/qw-oracle/shared/db.ts` exports the `db` postgres-js singleton plus `closeDb()`.
- Migration `001_init.sql` has enabled the `vector` extension, created `oracle_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`, and created the singleton `embedding_metadata(id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), model_name TEXT NOT NULL, model_version TEXT NOT NULL, dimension INTEGER NOT NULL, embedded_at TIMESTAMPTZ NOT NULL DEFAULT now(), rows_embedded INTEGER NOT NULL DEFAULT 0)`. The `embedding_metadata` row is empty at the start of Phase 5 (Phase 1 only created the table; no INSERT seeded it - the test-side INSERT in Phase 1's `migrate.test.ts` writes to `qw_oracle_test` only).
- `bun test` is the project test runner per D13; the package.json `test` script hard-codes `DATABASE_URL` to `qw_oracle_test`.
- `tsx` is gone; every script runs under Bun (D2). `import.meta.main` guards are the Bun-native CLI entry pattern.
- `.env` is gitignored; `.env.example` documents `VOYAGE_API_KEY`, `EMBEDDING_MODEL_BUILD=voyage-4-large`, `EMBEDDING_MODEL_QUERY=voyage-4-lite`, `EMBEDDING_DIMENSION=1024`. Operator filled `VOYAGE_API_KEY` per `prerequisites.md`.

If any of these is not true, stop and resolve at the prior phase before proceeding.

## Files touched

### Created

```
apps/qw-oracle/db/migrations/006_embedding_api_log.sql       # hand-written; embedding_api_log table + indexes (one new table, no schema changes elsewhere)
apps/qw-oracle/shared/embedding.ts                            # hand-written; embedTexts() + verifyEmbeddingSpace() + cosineSimilarity()
apps/qw-oracle/shared/embedding.test.ts                       # hand-written; integration test against the real Voyage API; gated on VOYAGE_API_KEY
apps/qw-oracle/scripts/embed/embed-entities.ts                # hand-written; Layer 1 entity-description embedder (callable as a function, runnable as a CLI)
apps/qw-oracle/scripts/embed/embed-entities.test.ts           # hand-written; integration test against qw_oracle_test + real Voyage API
apps/qw-oracle/scripts/embed/embed-chunks.ts                  # hand-written; Layer 3 concept-chunk embedder (callable as a function, runnable as a CLI)
apps/qw-oracle/scripts/embed/embed-chunks.test.ts             # hand-written; integration test against qw_oracle_test + real Voyage API
apps/qw-oracle/scripts/embed/verify-embedding-space.ts        # hand-written; D8 / F14 closure CLI; exits 0 on success, non-zero with diagnostic on failure
```

### Modified

```
apps/qw-oracle/package.json                                   # add embed:entities + embed:chunks + verify:embedding-space scripts
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts          # call embedEntitiesPass() as the final step after snapshot, outside the load txn
apps/qw-oracle/scripts/load-concepts/index.ts                 # call embedConceptChunks() as the final step after the upsert txn commits
```

### Deleted

```
(none)
```

`scripts/embed/` is a new directory; the parent `apps/qw-oracle/scripts/` exists from Phase 1+. The `shared/` directory exists from Phase 1; `chunking.ts` lands there in Phase 4 and is imported by this phase. `serve/mcp/` is untouched in this phase - the verifier ships as a standalone CLI here, and Phase 6 wires it into MCP startup.

## Tasks

### Task 1: Migration `006_embedding_api_log.sql`

**Goal.** Land the `embedding_api_log` table that every subsequent task in this phase writes to. Two indexes (timestamp + source) for the operator's "what just happened" queries and the Phase 7 / Phase 8 spend dashboards. The CHECK on `source` admits three values: `'loader'` (the embed-entities and embed-chunks pipelines), `'mcp-query'` (per-query embeddings at MCP runtime; Phase 6 starts writing these), and `'verify'` (the D8 startup check; this phase writes one pair of rows per verifier run).

**Files.** `apps/qw-oracle/db/migrations/006_embedding_api_log.sql`. Parent directory exists from Phase 1.

**Steps.**

- [ ] Create `apps/qw-oracle/db/migrations/006_embedding_api_log.sql` with the content below. Per D14, the migration is append-only and self-contained; it does not ALTER any table and does not touch `embedding_metadata` or `oracle_meta` (both already exist from Phase 1).

```sql
-- apps/qw-oracle/db/migrations/006_embedding_api_log.sql
-- Per-call log for every Voyage embedding API call. Loader, MCP-query, and
-- the D8 verifier all INSERT here. Phase 7's observability cheatsheet reads
-- this table; Phase 8's deploy-gate sums input_tokens to confirm the corpus
-- fits inside the free-tier envelope before public DNS opens.
--
-- Source values: 'loader' (embed-entities + embed-chunks pipelines, written
-- in Phase 5), 'mcp-query' (per-query embeddings at MCP runtime, written in
-- Phase 6), 'verify' (the D8 startup check that asserts build/query model
-- spaces have not diverged; written in Phase 5 + Phase 6). Adding a fourth
-- source later requires a CHECK widening migration.

CREATE TABLE embedding_api_log (
  id            BIGSERIAL PRIMARY KEY,
  called_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL CHECK (source IN ('loader', 'mcp-query', 'verify')),
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  latency_ms    INTEGER,
  error         TEXT
);

CREATE INDEX embedding_api_log_called_at ON embedding_api_log (called_at DESC);
CREATE INDEX embedding_api_log_source    ON embedding_api_log (source);
```

- [ ] Apply the migration to both DBs:

```
cd apps/qw-oracle
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle      bun db/migrate.ts
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun db/migrate.ts
```

- [ ] Smoke-check the table shape:

```
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "\d embedding_api_log"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'embedding_api_log' AND c.contype = 'c'"
```

**Verification.**

- PASS condition: `\d embedding_api_log` lists the seven columns with the expected types; the CHECK row reads `CHECK (source = ANY (ARRAY['loader'::text, 'mcp-query'::text, 'verify'::text]))`; `schema_migrations` carries an `006_embedding_api_log.sql` entry in both DBs.
- FAIL condition: any column missing, CHECK enum drifts, or migrator refuses to apply (most often: an ordinal collision with Phase 4's actual filename - Phase 4 is presumed to use 005, but verify and bump if Phase 4 chose otherwise).

### Task 2: Voyage API client and the embedding-space verifier

**Goal.** A single `shared/embedding.ts` module exporting (a) `embedTexts(texts, model, inputType)` for batch embedding via the Voyage HTTP API and (b) `verifyEmbeddingSpace()` for the D8 cosine-similarity check between the build and query models. Both are the only call sites that talk to `https://api.voyageai.com/v1/embeddings` in the project. The integration test exercises both paths against the real API, gated on `VOYAGE_API_KEY` so CI without a key skips cleanly.

**Files.**
- Create: `apps/qw-oracle/shared/embedding.ts`
- Create: `apps/qw-oracle/shared/embedding.test.ts`

**Steps.**

- [ ] Create `apps/qw-oracle/shared/embedding.ts` with the full content below:

```ts
// apps/qw-oracle/shared/embedding.ts
//
// Voyage AI embedding client + the D8 build/query embedding-space verifier.
// Single network call site for the project. Caller batches and logs into
// embedding_api_log; this module does not log on its own (it has no DB
// dependency, which keeps it importable from any subsystem including tests).

export interface EmbedResult {
  vectors: number[][];
  tokensInput: number;
  model: string;
  latencyMs: number;
}

export interface VerifyResult {
  similarity: number;
  threshold: number;
  buildModel: string;
  queryModel: string;
  buildLatencyMs: number;
  queryLatencyMs: number;
  buildTokens: number;
  queryTokens: number;
}

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';

// D8 threshold. Voyage 4-series is supposed to share an embedding space
// across model sizes, so cosine of the same input under voyage-4-large and
// voyage-4-lite should be very close to 1. 0.85 is the abort floor; below
// it, the build/query split is unsafe and the corpus must be rebuilt with
// matched models. Picked deliberately above the 0.7 "vaguely related" line
// and below the >=0.95 "the same vector" line that we expect to actually
// see on healthy v4 calls.
export const EMBEDDING_SPACE_THRESHOLD = 0.85;

// D8 probe text. Stable across runs so cached results in oracle_meta remain
// comparable; a fragment of QW domain language so an unrelated retrieval
// regression would also surface here.
export const EMBEDDING_SPACE_PROBE = 'weapon scripts';

export async function embedTexts(
  texts: string[],
  model: string,
  inputType: 'document' | 'query' = 'document',
): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not set');
  if (texts.length === 0) {
    return { vectors: [], tokensInput: 0, model, latencyMs: 0 };
  }

  const start = Date.now();
  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: texts, model, input_type: inputType }),
  });
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage API ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
    usage: { total_tokens: number };
    model: string;
  };
  // Voyage docs do not guarantee response order matches input order; sort
  // by `index` defensively so caller can zip vectors[i] with texts[i].
  const sorted = data.data.slice().sort((a, b) => a.index - b.index);
  return {
    vectors: sorted.map((d) => d.embedding),
    tokensInput: data.usage.total_tokens,
    model: data.model,
    latencyMs,
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

// D8: assert that the configured build and query models land in the same
// embedding space. Two API calls (one per model), one cosine; throws on
// failure with enough context for the operator to decide whether to
// reconfigure or wait out a vendor-side incident.
export async function verifyEmbeddingSpace(): Promise<VerifyResult> {
  const buildModel = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
  const queryModel = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';

  const build = await embedTexts([EMBEDDING_SPACE_PROBE], buildModel, 'document');
  const query = await embedTexts([EMBEDDING_SPACE_PROBE], queryModel, 'query');

  if (build.vectors[0]!.length !== query.vectors[0]!.length) {
    throw new Error(
      `Embedding-space verification failed: dimension mismatch ` +
      `(build=${build.vectors[0]!.length}, query=${query.vectors[0]!.length}). ` +
      `Build/query model split requires matched dimensions across the v4 series.`,
    );
  }

  const similarity = cosineSimilarity(build.vectors[0]!, query.vectors[0]!);
  if (similarity < EMBEDDING_SPACE_THRESHOLD) {
    throw new Error(
      `Embedding-space verification failed: cosine similarity ${similarity.toFixed(4)} ` +
      `below threshold ${EMBEDDING_SPACE_THRESHOLD} for probe "${EMBEDDING_SPACE_PROBE}" ` +
      `(build=${buildModel}, query=${queryModel}). ` +
      `Build and query embedding spaces appear divergent; verify Voyage 4-series ` +
      `shared-space claim or pick a single model for both.`,
    );
  }

  return {
    similarity,
    threshold: EMBEDDING_SPACE_THRESHOLD,
    buildModel,
    queryModel,
    buildLatencyMs: build.latencyMs,
    queryLatencyMs: query.latencyMs,
    buildTokens: build.tokensInput,
    queryTokens: query.tokensInput,
  };
}
```

- [ ] Create `apps/qw-oracle/shared/embedding.test.ts`:

```ts
// apps/qw-oracle/shared/embedding.test.ts
//
// Integration test against the real Voyage API. Skipped unless VOYAGE_API_KEY
// is set so CI without a key passes cleanly. No DB dependency in this file
// (the module under test has no DB dependency either).

import { describe, expect, test } from 'bun:test';
import {
  embedTexts,
  cosineSimilarity,
  verifyEmbeddingSpace,
  EMBEDDING_SPACE_THRESHOLD,
} from './embedding.ts';

const HAS_KEY = !!process.env.VOYAGE_API_KEY;

describe.skipIf(!HAS_KEY)('voyage embedding client', () => {
  test('embeds a small batch and returns 1024-dim vectors', async () => {
    const out = await embedTexts(
      ['weapon scripts', 'rocket jump'],
      'voyage-4-large',
      'document',
    );
    expect(out.vectors.length).toBe(2);
    expect(out.vectors[0]!.length).toBe(1024);
    expect(out.vectors[1]!.length).toBe(1024);
    expect(out.tokensInput).toBeGreaterThan(0);
  });

  test('returns an empty result without calling the API for an empty input', async () => {
    const out = await embedTexts([], 'voyage-4-large');
    expect(out.vectors.length).toBe(0);
    expect(out.tokensInput).toBe(0);
    expect(out.latencyMs).toBe(0);
  });

  test('throws on a bad API key', async () => {
    const oldKey = process.env.VOYAGE_API_KEY;
    process.env.VOYAGE_API_KEY = 'sk-bogus';
    try {
      await expect(embedTexts(['hi'], 'voyage-4-large')).rejects.toThrow();
    } finally {
      process.env.VOYAGE_API_KEY = oldKey;
    }
  });
});

describe('cosineSimilarity', () => {
  test('identical vectors yield 1', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
  });
  test('orthogonal vectors yield 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
  test('dimension mismatch throws', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(/dimension mismatch/);
  });
});

describe.skipIf(!HAS_KEY)('verifyEmbeddingSpace (D8)', () => {
  test('build and query models land in a shared space above the threshold', async () => {
    const r = await verifyEmbeddingSpace();
    expect(r.similarity).toBeGreaterThanOrEqual(EMBEDDING_SPACE_THRESHOLD);
    expect(r.buildTokens).toBeGreaterThan(0);
    expect(r.queryTokens).toBeGreaterThan(0);
  });
});
```

- [ ] Run the tests:

```
cd apps/qw-oracle
bun test shared/embedding.test.ts
```

**Verification.**

- PASS condition: with `VOYAGE_API_KEY` set, all six tests pass; without the key, the three `describe.skipIf(!HAS_KEY)` blocks skip and the three `cosineSimilarity` tests still pass.
- FAIL condition: any cosine-similarity unit test fails (algebra bug); or `verifyEmbeddingSpace` returns a similarity below `EMBEDDING_SPACE_THRESHOLD` (D8 abort - resolve at the operator level: re-check VOYAGE_API_KEY scope, retry, or downgrade to a single-model config); or the basic embed call returns vectors with a length other than 1024 (Voyage model swap on the server side - escalate before continuing).

### Task 3: D8 / F14 closure - standalone verifier CLI

**Goal.** Ship `verify-embedding-space` as a standalone CLI the operator runs once during this phase, that Phase 6 will later wire into MCP startup. The CLI runs `verifyEmbeddingSpace()`, logs both API calls into `embedding_api_log` with `source='verify'`, stamps the success in `oracle_meta(key='embedding_space_verified_at')`, and prints a one-line summary. F14 (Voyage shared-embedding-space unverified) closes here for Arc 1.

**Files.**
- Create: `apps/qw-oracle/scripts/embed/verify-embedding-space.ts`
- Modify: `apps/qw-oracle/package.json` (add `verify:embedding-space` script)

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/embed/verify-embedding-space.ts`:

```ts
// apps/qw-oracle/scripts/embed/verify-embedding-space.ts
//
// D8 closure CLI. Embeds a known string under the build model and the query
// model, asserts cosine similarity above EMBEDDING_SPACE_THRESHOLD, logs both
// calls into embedding_api_log, and stamps oracle_meta on success.
//
// Phase 6 wires this same check into MCP startup; until then it is the
// operator's manual gate.

import { db, closeDb } from '../../shared/db.ts';
import {
  EMBEDDING_SPACE_PROBE,
  EMBEDDING_SPACE_THRESHOLD,
  embedTexts,
  cosineSimilarity,
} from '../../shared/embedding.ts';

async function main(): Promise<number> {
  const buildModel = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
  const queryModel = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';

  // Embed under both models and log both calls. We do not delegate to
  // verifyEmbeddingSpace() here because we need to log per-call latency
  // and tokens; the helper does not log (it has no DB dependency).
  let buildResult, queryResult;
  try {
    buildResult = await embedTexts([EMBEDDING_SPACE_PROBE], buildModel, 'document');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('verify', ${buildResult.model}, ${buildResult.tokensInput}, ${buildResult.latencyMs})
    `;
  } catch (err) {
    const errMsg = (err as Error).message;
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('verify', ${buildModel}, 0, ${errMsg})
    `;
    console.error(`[verify-embedding-space] build call failed: ${errMsg}`);
    return 1;
  }

  try {
    queryResult = await embedTexts([EMBEDDING_SPACE_PROBE], queryModel, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('verify', ${queryResult.model}, ${queryResult.tokensInput}, ${queryResult.latencyMs})
    `;
  } catch (err) {
    const errMsg = (err as Error).message;
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('verify', ${queryModel}, 0, ${errMsg})
    `;
    console.error(`[verify-embedding-space] query call failed: ${errMsg}`);
    return 1;
  }

  if (buildResult.vectors[0]!.length !== queryResult.vectors[0]!.length) {
    console.error(
      `[verify-embedding-space] dimension mismatch: ` +
      `build=${buildResult.vectors[0]!.length} query=${queryResult.vectors[0]!.length}`,
    );
    return 1;
  }

  const similarity = cosineSimilarity(buildResult.vectors[0]!, queryResult.vectors[0]!);
  console.log(
    `[verify-embedding-space] probe="${EMBEDDING_SPACE_PROBE}" ` +
    `build=${buildResult.model} query=${queryResult.model} ` +
    `cosine=${similarity.toFixed(4)} threshold=${EMBEDDING_SPACE_THRESHOLD}`,
  );

  if (similarity < EMBEDDING_SPACE_THRESHOLD) {
    console.error(
      `[verify-embedding-space] FAIL: cosine ${similarity.toFixed(4)} below threshold ${EMBEDDING_SPACE_THRESHOLD}. ` +
      `Build and query embedding spaces appear divergent. Resolve before continuing to Phase 6.`,
    );
    return 1;
  }

  await db`
    INSERT INTO oracle_meta (key, value, updated_at)
    VALUES ('embedding_space_verified_at', ${new Date().toISOString()}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  console.log(`[verify-embedding-space] OK; oracle_meta stamped.`);
  return 0;
}

if (import.meta.main) {
  let code = 1;
  try {
    code = await main();
  } finally {
    await closeDb();
  }
  process.exit(code);
}
```

- [ ] Modify `apps/qw-oracle/package.json` to add the `verify:embedding-space` script. Splice the new entry into the `scripts` block alongside the existing entries; do not remove anything Phase 1 / Phase 2 placed there. Final shape of the relevant block:

```json
"verify:embedding-space": "bun scripts/embed/verify-embedding-space.ts",
```

- [ ] Run the verifier against the dev DB:

```
cd apps/qw-oracle
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle bun scripts/embed/verify-embedding-space.ts
```

- [ ] Confirm both expected effects:

```
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT key, value, updated_at FROM oracle_meta WHERE key = 'embedding_space_verified_at'"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT source, model, input_tokens, latency_ms, error FROM embedding_api_log WHERE source = 'verify' ORDER BY called_at DESC LIMIT 4"
```

**Verification.**

- PASS condition: CLI exits 0 and prints `cosine=0.<NNNN> threshold=0.85` with the cosine above 0.85; `oracle_meta` carries the new row; `embedding_api_log` carries two `'verify'` rows (one per model) with `error IS NULL` and non-null `latency_ms`.
- FAIL condition: cosine below 0.85, dimension mismatch, or any Voyage call errored. Recovery: re-run once (the API is occasionally flaky); if a second run also fails, the build/query split is unsafe - escalate to operator before continuing to Task 4.

### Task 4: `embed-entities` pipeline + `extract-tag` hook

**Goal.** Ship the Layer 1 entity-description embedding pass as `embedEntitiesPass()`, runnable standalone via `bun scripts/embed/embed-entities.ts` and hooked into `scripts/load-knowledge/extract-tag.ts` as the final step (after the snapshot writer). Hash-based incremental: every entity row carries `description_embedding_sha256`; the pass recomputes `sha256(description)` in JS, compares, embeds only changed rows. Failures mark `description_embedding_stale = TRUE` without writing a vector. Successes update `embedding_metadata` with the latest model + total embedded count.

**Files.**
- Create: `apps/qw-oracle/scripts/embed/embed-entities.ts`
- Create: `apps/qw-oracle/scripts/embed/embed-entities.test.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`
- Modify: `apps/qw-oracle/package.json` (add `embed:entities` script)

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/embed/embed-entities.ts`:

```ts
// apps/qw-oracle/scripts/embed/embed-entities.ts
//
// Layer 1 embedding pass. Scans entities for rows whose description hash
// differs from description_embedding_sha256 (or whose embedding is NULL),
// batches them through the Voyage build model, writes vectors back, logs
// every API call into embedding_api_log, and updates the singleton
// embedding_metadata row.
//
// Idempotent on re-run because the hash check guarantees a no-op when no
// description has changed since the last successful embed pass.
//
// Failure semantics: if Voyage rejects a batch, the entities in that batch
// keep their previous vectors (NULL or last-good) and are flagged
// description_embedding_stale = TRUE. Lexical search on description_tsv is
// unaffected.

import { db, closeDb } from '../../shared/db.ts';
import { embedTexts } from '../../shared/embedding.ts';
import { sha256 } from '../../shared/chunking.ts';

const BATCH_SIZE = 64;

interface CandidateRow {
  canonical_id: string;
  description: string;
  existing_sha: string | null;
}

interface StaleRow extends CandidateRow {
  sha: string;
}

export async function embedEntitiesPass(): Promise<{
  embedded: number;
  failed: number;
  totalWithEmbedding: number;
}> {
  const buildModel = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
  const startAt = Date.now();

  const candidates = await db<CandidateRow[]>`
    SELECT canonical_id,
           description,
           description_embedding_sha256 AS existing_sha
    FROM entities
    WHERE description IS NOT NULL
      AND length(description) > 0
  `;

  // Compute sha for every candidate in JS and pick the rows whose hash does
  // not match the recorded one. The stale boolean is informational; the
  // hash is the authoritative skip-or-embed signal.
  const stale: StaleRow[] = [];
  for (const row of candidates) {
    const sha = await sha256(row.description);
    if (sha !== row.existing_sha) {
      stale.push({ ...row, sha });
    }
  }

  console.log(
    `[embed-entities] candidates=${candidates.length} stale=${stale.length} ` +
    `model=${buildModel} batch=${BATCH_SIZE}`,
  );

  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    const batch = stale.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => r.description);
    let result;
    try {
      result = await embedTexts(texts, buildModel, 'document');
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`[embed-entities] batch ${i}/${stale.length} failed: ${errMsg}`);
      await db`
        INSERT INTO embedding_api_log (source, model, input_tokens, error)
        VALUES ('loader', ${buildModel}, 0, ${errMsg})
      `;
      // Mark every row in the failed batch stale; do not write any vector.
      const ids = batch.map((r) => r.canonical_id);
      await db`
        UPDATE entities
           SET description_embedding_stale = TRUE
         WHERE canonical_id = ANY(${ids}::text[])
      `;
      failed += batch.length;
      continue;
    }

    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('loader', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;

    await db.begin(async (tx) => {
      for (let j = 0; j < batch.length; j++) {
        const r = batch[j]!;
        const v = result.vectors[j]!;
        const literal = `[${v.join(',')}]`;
        await tx`
          UPDATE entities
             SET description_embedding = ${literal}::vector,
                 description_embedding_sha256 = ${r.sha},
                 description_embedding_stale = FALSE
           WHERE canonical_id = ${r.canonical_id}
        `;
      }
    });
    embedded += batch.length;
    console.log(
      `[embed-entities] ${Math.min(i + BATCH_SIZE, stale.length)}/${stale.length} embedded ` +
      `(batch tokens=${result.tokensInput} latency=${result.latencyMs}ms)`,
    );
  }

  const totalWithEmbeddingRow = await db<{ c: number }[]>`
    SELECT count(*)::int AS c FROM entities WHERE description_embedding IS NOT NULL
  `;
  const totalWithEmbedding = totalWithEmbeddingRow[0]!.c;

  // Upsert the singleton embedding_metadata row. model_version mirrors the
  // model name returned by Voyage (which can include a server-side version
  // suffix even when the request used the bare alias).
  if (embedded > 0) {
    const versionLabel = stale.length > 0 && failed < stale.length
      ? buildModel  // the Voyage response model is captured per-call in api_log; this column carries the configured alias
      : buildModel;
    await db`
      INSERT INTO embedding_metadata (id, model_name, model_version, dimension, embedded_at, rows_embedded)
      VALUES (1, ${buildModel}, ${versionLabel}, 1024, now(), ${totalWithEmbedding})
      ON CONFLICT (id) DO UPDATE SET
        model_name = EXCLUDED.model_name,
        model_version = EXCLUDED.model_version,
        dimension = EXCLUDED.dimension,
        embedded_at = now(),
        rows_embedded = EXCLUDED.rows_embedded
    `;
  }

  console.log(
    `[embed-entities] done in ${Date.now() - startAt}ms; ` +
    `embedded=${embedded} failed=${failed} total_with_embedding=${totalWithEmbedding}`,
  );
  return { embedded, failed, totalWithEmbedding };
}

if (import.meta.main) {
  try {
    await embedEntitiesPass();
  } finally {
    await closeDb();
  }
}
```

- [ ] Create `apps/qw-oracle/scripts/embed/embed-entities.test.ts`:

```ts
// apps/qw-oracle/scripts/embed/embed-entities.test.ts
//
// Integration test against qw_oracle_test + the real Voyage API. Skipped
// unless VOYAGE_API_KEY is set; refuses to run against any DB other than
// qw_oracle_test (D13). Seeds a tiny entity row, runs embedEntitiesPass(),
// verifies the vector + sha + log + metadata effects, then runs again to
// confirm the hash-skip path is a no-op.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { embedEntitiesPass } from './embed-entities.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run embed-entities.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const HAS_KEY = !!process.env.VOYAGE_API_KEY;
const sql = postgres(url, { onnotice: () => {} });

const TEST_CANONICAL_ID = 'ezquake:cvar:_phase5_test_cvar';

describe.skipIf(!HAS_KEY)('embedEntitiesPass', () => {
  beforeAll(async () => {
    // Wipe Phase 5 test residue and seed one entity with a known description.
    // We do not TRUNCATE entities globally because Phase 2's loader test set
    // may have populated the table; targeted DELETE keeps us hermetic.
    await sql`DELETE FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}`;
    await sql`
      INSERT INTO entities (
        project, type, name, canonical_id,
        first_seen_version, last_seen_version,
        source_state, description, created_at, updated_at
      ) VALUES (
        'ezquake', 'cvar', '_phase5_test_cvar', ${TEST_CANONICAL_ID},
        'head', 'head',
        'source_backed', 'Phase 5 embedding pipeline test - rocket jump teleport',
        now(), now()
      )
    `;
  });

  afterAll(async () => {
    await sql`DELETE FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}`;
    await sql.end();
  });

  test('first run embeds the seeded row and writes back vector + sha', async () => {
    const before = await sql<{ embedding: unknown; sha: string | null }[]>`
      SELECT description_embedding AS embedding, description_embedding_sha256 AS sha
      FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}
    `;
    expect(before[0]!.embedding).toBeNull();
    expect(before[0]!.sha).toBeNull();

    const result = await embedEntitiesPass();
    expect(result.embedded).toBeGreaterThanOrEqual(1);

    const after = await sql<{ embedding: unknown; sha: string | null }[]>`
      SELECT description_embedding AS embedding, description_embedding_sha256 AS sha
      FROM entities WHERE canonical_id = ${TEST_CANONICAL_ID}
    `;
    expect(after[0]!.embedding).not.toBeNull();
    expect(after[0]!.sha).not.toBeNull();
    expect(after[0]!.sha!.length).toBe(64);
  });

  test('embedding_metadata is upserted to dimension=1024', async () => {
    const rows = await sql<{ dimension: number; rows_embedded: number }[]>`
      SELECT dimension, rows_embedded FROM embedding_metadata WHERE id = 1
    `;
    expect(rows.length).toBe(1);
    expect(rows[0]!.dimension).toBe(1024);
    expect(rows[0]!.rows_embedded).toBeGreaterThanOrEqual(1);
  });

  test('embedding_api_log has at least one loader-source row', async () => {
    const rows = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM embedding_api_log WHERE source = 'loader'
    `;
    expect(rows[0]!.c).toBeGreaterThanOrEqual(1);
  });

  test('second run is a no-op via hash skip', async () => {
    const result = await embedEntitiesPass();
    expect(result.embedded).toBe(0);
  });
});
```

- [ ] Modify `apps/qw-oracle/package.json` to add the `embed:entities` script:

```json
"embed:entities": "bun scripts/embed/embed-entities.ts",
```

- [ ] Modify `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` to call `embedEntitiesPass()` as the final step. The hook is one import + one call after the snapshot writer; the call runs OUTSIDE the loader transaction (Phase 2 already commits before the snapshot stage, so no transaction is open here either). Append the import and the call site:

```ts
// At the top of extract-tag.ts, alongside other imports:
import { embedEntitiesPass } from '../embed/embed-entities.ts';

// At the very end of the orchestrator function (after diff / enrich / snapshot /
// any post-load logging), and BEFORE closeDb() if the orchestrator owns the close:
try {
  await embedEntitiesPass();
} catch (err) {
  // The pass logs its own per-batch failures; an unexpected throw here is
  // an envelope problem (auth, DB, logic bug). Surface but do not abort the
  // overall extract-tag exit code - structured rows are already committed.
  console.error(`[extract-tag] embedEntitiesPass threw: ${(err as Error).message}`);
}
```

The exact insertion point depends on Phase 2's port of `extract-tag.ts`; this phase's drafter must read the Phase 2 output to confirm where the snapshot step lands and place the embed call immediately after it. If Phase 2 left the orchestrator with an explicit `closeDb()` call, the embed call goes BEFORE it.

- [ ] Run `embed:entities` against the dev DB:

```
cd apps/qw-oracle
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle bun scripts/embed/embed-entities.ts
```

Expected: ~9000 stale rows on first run (one per entity-with-description across all four loaded projects), in ~150 batches of 64. Total tokens ~500K; well inside the 200M-token Voyage free-tier envelope. Latency dominated by Voyage round-trips; expect a few minutes of wall time.

- [ ] Run the test pass:

```
cd apps/qw-oracle
bun test scripts/embed/embed-entities.test.ts
```

**Verification.**

- PASS condition: `embed:entities` first run reports `embedded=<N>` close to the count of entities with non-empty descriptions (per Phase 2 verification step 5; expect ~9000); second run reports `embedded=0` (hash-skip path); test file passes 4/4 with VOYAGE_API_KEY set; `entities WHERE description IS NOT NULL AND description_embedding IS NULL AND description_embedding_stale = FALSE` returns 0; `embedding_metadata` row reads `dimension=1024` and a non-zero `rows_embedded`.
- FAIL condition: residual rows with `description IS NOT NULL AND description_embedding IS NULL AND description_embedding_stale = FALSE` after a successful run (the pass missed them - investigate the candidate query); or `embedding_metadata.rows_embedded` reads 0 after a non-empty pass; or test count drops below 4 (a test was lost, not ported).

### Task 5: `embed-chunks` pipeline + `load-concepts` hook

**Goal.** Ship the Layer 3 concept-chunk embedding pass as `embedConceptChunks()`, runnable standalone via `bun scripts/embed/embed-chunks.ts` and hooked into `scripts/load-concepts/index.ts` as the final step (after the upsert transaction). The pass selects every `concept_chunks` row whose `embedding IS NULL OR embedding_stale = TRUE`, embeds in batches, writes vectors and clears the stale flag on success, sets `embedding_stale = TRUE` on failure. Concept-chunk shape carries `text_sha256` already (Phase 4 populates it on insert), so the SQL filter alone is sufficient: when Phase 4's loader rewrites a chunk row whose text changed, it sets `embedding_stale = TRUE` (or the row is re-inserted with a new id and NULL embedding); the embed pass picks that signal up directly.

**Files.**
- Create: `apps/qw-oracle/scripts/embed/embed-chunks.ts`
- Create: `apps/qw-oracle/scripts/embed/embed-chunks.test.ts`
- Modify: `apps/qw-oracle/scripts/load-concepts/index.ts`
- Modify: `apps/qw-oracle/package.json` (add `embed:chunks` script)

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/embed/embed-chunks.ts`:

```ts
// apps/qw-oracle/scripts/embed/embed-chunks.ts
//
// Layer 3 embedding pass. Selects concept_chunks rows whose embedding is
// NULL or whose embedding_stale flag is TRUE, batches them through the
// Voyage build model, writes vectors back, logs every API call into
// embedding_api_log.
//
// Concept-chunk staleness is driven by the load-concepts loader: when a
// chunk's text changes, Phase 4's loader either clears the row (so the new
// chunk inserts with NULL embedding) or sets embedding_stale = TRUE on the
// existing row. This pass treats both signals as "needs embedding".
//
// Failure semantics mirror embed-entities: on Voyage rejection the row's
// embedding_stale stays TRUE, the chunk is still retrievable via tsv, and
// the next pass will retry.

import { db, closeDb } from '../../shared/db.ts';
import { embedTexts } from '../../shared/embedding.ts';

const BATCH_SIZE = 64;

interface StaleChunk {
  id: number;
  text: string;
}

export async function embedConceptChunks(): Promise<{
  embedded: number;
  failed: number;
  remainingNull: number;
}> {
  const buildModel = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
  const startAt = Date.now();

  const stale = await db<StaleChunk[]>`
    SELECT id, text
    FROM concept_chunks
    WHERE embedding IS NULL OR embedding_stale = TRUE
    ORDER BY id
  `;

  console.log(
    `[embed-chunks] stale=${stale.length} model=${buildModel} batch=${BATCH_SIZE}`,
  );

  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    const batch = stale.slice(i, i + BATCH_SIZE);
    let result;
    try {
      result = await embedTexts(batch.map((r) => r.text), buildModel, 'document');
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`[embed-chunks] batch ${i}/${stale.length} failed: ${errMsg}`);
      await db`
        INSERT INTO embedding_api_log (source, model, input_tokens, error)
        VALUES ('loader', ${buildModel}, 0, ${errMsg})
      `;
      const ids = batch.map((r) => r.id);
      await db`
        UPDATE concept_chunks
           SET embedding_stale = TRUE
         WHERE id = ANY(${ids}::bigint[])
      `;
      failed += batch.length;
      continue;
    }

    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('loader', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;

    await db.begin(async (tx) => {
      for (let j = 0; j < batch.length; j++) {
        const r = batch[j]!;
        const v = result.vectors[j]!;
        const literal = `[${v.join(',')}]`;
        await tx`
          UPDATE concept_chunks
             SET embedding = ${literal}::vector,
                 embedding_stale = FALSE
           WHERE id = ${r.id}
        `;
      }
    });
    embedded += batch.length;
    console.log(
      `[embed-chunks] ${Math.min(i + BATCH_SIZE, stale.length)}/${stale.length} embedded ` +
      `(batch tokens=${result.tokensInput} latency=${result.latencyMs}ms)`,
    );
  }

  const remainingRow = await db<{ c: number }[]>`
    SELECT count(*)::int AS c FROM concept_chunks WHERE embedding IS NULL
  `;
  const remainingNull = remainingRow[0]!.c;

  console.log(
    `[embed-chunks] done in ${Date.now() - startAt}ms; ` +
    `embedded=${embedded} failed=${failed} remaining_null=${remainingNull}`,
  );
  return { embedded, failed, remainingNull };
}

if (import.meta.main) {
  try {
    await embedConceptChunks();
  } finally {
    await closeDb();
  }
}
```

- [ ] Create `apps/qw-oracle/scripts/embed/embed-chunks.test.ts`:

```ts
// apps/qw-oracle/scripts/embed/embed-chunks.test.ts
//
// Integration test against qw_oracle_test + the real Voyage API. Same
// gating as embed-entities.test.ts. Seeds a synthetic concept + one chunk,
// runs embedConceptChunks(), verifies vector + log effects, runs again to
// confirm idempotency.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { embedConceptChunks } from './embed-chunks.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run embed-chunks.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const HAS_KEY = !!process.env.VOYAGE_API_KEY;
const sql = postgres(url, { onnotice: () => {} });

const TEST_SLUG = '_phase5_test_concept';

describe.skipIf(!HAS_KEY)('embedConceptChunks', () => {
  beforeAll(async () => {
    // ON DELETE CASCADE on concept_chunks (per Phase 4 migration) cleans up
    // chunks when the concept goes; we rely on that here.
    await sql`DELETE FROM concepts WHERE slug = ${TEST_SLUG}`;
    await sql`
      INSERT INTO concepts (slug, title, summary, body, frontmatter, body_sha256)
      VALUES (
        ${TEST_SLUG},
        'Phase 5 test concept',
        'Phase 5 embedding pipeline test concept',
        'rocket jump teleport quad damage',
        '{}'::jsonb,
        'deadbeef'
      )
    `;
    await sql`
      INSERT INTO concept_chunks (concept_slug, chunk_index, text, text_sha256)
      VALUES (
        ${TEST_SLUG}, 0,
        'rocket jump teleport quad damage',
        'cafef00d'
      )
    `;
  });

  afterAll(async () => {
    await sql`DELETE FROM concepts WHERE slug = ${TEST_SLUG}`;
    await sql.end();
  });

  test('first run embeds the seeded chunk', async () => {
    const result = await embedConceptChunks();
    expect(result.embedded).toBeGreaterThanOrEqual(1);

    const rows = await sql<{ embedding: unknown; stale: boolean }[]>`
      SELECT embedding, embedding_stale AS stale
      FROM concept_chunks
      WHERE concept_slug = ${TEST_SLUG} AND chunk_index = 0
    `;
    expect(rows[0]!.embedding).not.toBeNull();
    expect(rows[0]!.stale).toBe(false);
  });

  test('embedding_api_log carries a loader row from the run', async () => {
    const rows = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c FROM embedding_api_log WHERE source = 'loader'
    `;
    expect(rows[0]!.c).toBeGreaterThanOrEqual(1);
  });

  test('second run is a no-op (no stale or NULL chunks)', async () => {
    const result = await embedConceptChunks();
    expect(result.embedded).toBe(0);
  });

  test('manually flagging stale forces a re-embed', async () => {
    await sql`
      UPDATE concept_chunks SET embedding_stale = TRUE
      WHERE concept_slug = ${TEST_SLUG}
    `;
    const result = await embedConceptChunks();
    expect(result.embedded).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] Modify `apps/qw-oracle/package.json` to add the `embed:chunks` script:

```json
"embed:chunks": "bun scripts/embed/embed-chunks.ts",
```

- [ ] Modify `apps/qw-oracle/scripts/load-concepts/index.ts` to call `embedConceptChunks()` after the upsert transaction commits. The exact insertion point depends on Phase 4's load-concepts shape; the call runs OUTSIDE the transaction so a Voyage outage cannot roll back the structured upsert. Append the import + the call:

```ts
// At the top of load-concepts/index.ts, alongside other imports:
import { embedConceptChunks } from '../embed/embed-chunks.ts';

// At the very end of main(), AFTER the upsert txn completes and BEFORE
// closeDb() (or the equivalent shutdown hook Phase 4 chose):
try {
  await embedConceptChunks();
} catch (err) {
  console.error(`[load-concepts] embedConceptChunks threw: ${(err as Error).message}`);
}
```

If Phase 4 split `load-concepts` into multiple entry points, the embed call goes in the top-level CLI entry point only - not in helper functions used by tests, which seed their own chunk rows and would deadlock on a redundant pass.

- [ ] Run `embed:chunks` against the dev DB:

```
cd apps/qw-oracle
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle bun scripts/embed/embed-chunks.ts
```

Expected: `stale=<N>` matching the number of chunks Phase 4's loader emitted (today's 9 concept notes, ~5 chunks each, gives ~45 chunks; future scaling per the spec hits ~1000-1500 chunks at 200 notes). Single-digit batches; sub-second wall time.

- [ ] Run the test pass:

```
cd apps/qw-oracle
bun test scripts/embed/embed-chunks.test.ts
```

**Verification.**

- PASS condition: `embed:chunks` first run reports `embedded=<N>` matching the candidate count and `remaining_null=0`; second run reports `embedded=0`; manual `UPDATE concept_chunks SET embedding_stale=TRUE` followed by a third run re-embeds the flagged rows; test file passes 4/4 with VOYAGE_API_KEY set; `concept_chunks WHERE embedding IS NULL` returns 0 in `qw_oracle`.
- FAIL condition: `concept_chunks WHERE embedding IS NULL` is non-zero after a successful run (Phase 4's chunker emitted a row the pipeline failed to pick up - investigate the SELECT filter); or the manual-stale loop test fails (the WHERE clause is missing the `OR embedding_stale = TRUE` branch).

## Verification (phase boundary)

Run from `apps/qw-oracle/`. Each block is YES/NO; operator eyeballs.

```
# 1. Migration applied to both DBs.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle      -c "SELECT filename FROM schema_migrations ORDER BY filename"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_test -c "SELECT filename FROM schema_migrations ORDER BY filename"
```
PASS condition: both lists end with `006_embedding_api_log.sql`; the prior migrations from Phases 1-4 are present and unchanged.

```
# 2. embedding_api_log shape and CHECK enum.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "\d embedding_api_log"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'embedding_api_log' AND c.contype = 'c'"
```
PASS condition: seven columns present (id BIGSERIAL, called_at TIMESTAMPTZ, source TEXT, model TEXT, input_tokens INTEGER, latency_ms INTEGER, error TEXT); CHECK enum reads `('loader','mcp-query','verify')`.

```
# 3. F14 / D8 closure: cosine above threshold, oracle_meta stamped, verify rows logged.
bun scripts/embed/verify-embedding-space.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT key, value, updated_at FROM oracle_meta WHERE key = 'embedding_space_verified_at'"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT count(*) FROM embedding_api_log WHERE source = 'verify'"
```
PASS condition: CLI exits 0 and prints `cosine=0.<NNNN> threshold=0.85` with a value above 0.85; `oracle_meta` row exists with a recent `updated_at`; verify-source row count is `>= 2` (one build call + one query call per run).

```
# 4. Layer 1 entity embeddings populated; no rows missed.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT count(*) FILTER (WHERE description IS NOT NULL) AS with_desc, count(*) FILTER (WHERE description_embedding IS NOT NULL) AS with_emb, count(*) FILTER (WHERE description IS NOT NULL AND description_embedding IS NULL AND description_embedding_stale = FALSE) AS missed FROM entities"
```
PASS condition: `missed = 0`; `with_emb` equals `with_desc` (any failed batches show up as `description_embedding_stale = TRUE`, not as missed). The `with_desc` value matches Phase 2 verification step 5's documented per-type pattern.

```
# 5. Layer 1 sha-skip on second run.
bun scripts/embed/embed-entities.ts | tail -1
```
PASS condition: trailing line reads `... embedded=0 failed=0 ...` (no work to do; hash-skip path).

```
# 6. Layer 3 chunk embeddings populated; no rows missed.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT count(*) FILTER (WHERE embedding IS NOT NULL) AS with_emb, count(*) FILTER (WHERE embedding IS NULL) AS without_emb, count(*) FILTER (WHERE embedding_stale = TRUE) AS stale FROM concept_chunks"
```
PASS condition: `without_emb = 0` and `stale = 0`. (Stale is acceptable mid-run after a Voyage outage; at phase boundary expect zero.)

```
# 7. Layer 3 stale-flag re-embed path.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "UPDATE concept_chunks SET embedding_stale = TRUE WHERE id = (SELECT id FROM concept_chunks ORDER BY id LIMIT 1)"
bun scripts/embed/embed-chunks.ts | tail -1
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT count(*) FROM concept_chunks WHERE embedding_stale = TRUE"
```
PASS condition: the embed-chunks output reads `embedded=1 ...`; the post-run stale count is 0.

```
# 8. embedding_metadata reflects a fresh build.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT model_name, dimension, rows_embedded FROM embedding_metadata WHERE id = 1"
```
PASS condition: model_name reads the configured `EMBEDDING_MODEL_BUILD` (default `voyage-4-large`); dimension is 1024; rows_embedded matches the `with_emb` count from step 4 within batch granularity.

```
# 9. embedding_api_log carries the expected source mix.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT source, count(*), sum(input_tokens) FROM embedding_api_log GROUP BY source ORDER BY source"
```
PASS condition: at least one row per source `'loader'` and `'verify'`; `'mcp-query'` may be 0 (Phase 6 is the writer); aggregate `input_tokens` is well below the 200M-token Voyage free-tier ceiling (per spec; Arc 1 corpus + verify calls should land in the low millions).

```
# 10. Tests green.
bun test shared/embedding.test.ts scripts/embed/
```
PASS condition: all tests in the three test files pass when VOYAGE_API_KEY is set; the `cosineSimilarity` unit tests pass even without a key.

```
# 11. Type check green.
bunx tsc --noEmit
```
PASS condition: exits 0.

If all eleven PASS, Phase 6 may proceed.

## Outputs to next phase

State now true that wasn't before:
- Migration `006_embedding_api_log.sql` applied to both `qw_oracle` and `qw_oracle_test`. The `embedding_api_log` table exists with three valid `source` values: `'loader'`, `'mcp-query'`, `'verify'`.
- `apps/qw-oracle/shared/embedding.ts` is the project's only Voyage call site. Exports: `embedTexts`, `verifyEmbeddingSpace`, `cosineSimilarity`, `EMBEDDING_SPACE_THRESHOLD`, `EMBEDDING_SPACE_PROBE`. Phase 6 imports `embedTexts` for per-query embedding inside `search_entities` / `search_concepts` / `search_solved_issues` (Phase 6's call) and `verifyEmbeddingSpace` for MCP startup.
- `apps/qw-oracle/scripts/embed/embed-entities.ts` exports `embedEntitiesPass()` and runs as a CLI. Already hooked into `extract-tag.ts` so the next ezQuake / FTE / MVDSV / QWCL load-tag run includes embedding without operator action.
- `apps/qw-oracle/scripts/embed/embed-chunks.ts` exports `embedConceptChunks()` and runs as a CLI. Already hooked into `load-concepts/index.ts` so the next concept-note edit + load includes embedding without operator action.
- `apps/qw-oracle/scripts/embed/verify-embedding-space.ts` exists. Phase 6 will reuse the same `verifyEmbeddingSpace()` helper at MCP startup, reading `oracle_meta.embedding_space_verified_at` to decide whether to re-run or trust the cache (Phase 6's call).
- Every entity row in `qw_oracle` with a non-empty `description` carries a 1024-dim `description_embedding` plus its `description_embedding_sha256`. Stale rows (Voyage failures) carry `description_embedding_stale = TRUE` instead.
- Every `concept_chunks` row carries an `embedding` and `embedding_stale = FALSE` (Voyage outages aside).
- `embedding_metadata` row reads `(model_name='voyage-4-large', model_version='voyage-4-large', dimension=1024, rows_embedded=<entity-with-emb count>, embedded_at=<recent timestamp>)`.
- `embedding_api_log` carries one row per Voyage call from the three runs (verify pair + entity batches + chunk batches).
- `oracle_meta` carries `(key='embedding_space_verified_at', value=<recent ISO timestamp>)`. Phase 6 reads this to skip the verify check on warm restarts.

Phase 6 inputs: this state, plus the per-tool MCP rewrites it owns. Phase 6 does NOT re-embed - it queries the vectors written in this phase via `description_embedding` and `concept_chunks.embedding` and writes per-query embeddings via `embedTexts(..., 'voyage-4-lite', 'query')`.

## Open questions / deferred items

- **Question:** Should the entity-embedding pipeline derive descriptions on the fly when `entities.description` is NULL but the per-version table carries help text? Phase 2's derivation step is supposed to populate `entities.description` for every type that has help text, but a partial port could leave gaps.
  **Default chosen for now:** Trust Phase 2's derivation. The candidate query filters `description IS NOT NULL AND length(description) > 0`; rows with NULL descriptions are silently skipped. Verification step 4 will surface a gap if Phase 2 left work undone.
  **Who can resolve:** Phase 2 (re-run derivation if a gap surfaces); operator decides whether to escalate.

- **Question:** `embedding_metadata.model_version` currently mirrors `model_name`. The spec text says the column tracks "the response model" returned by Voyage (which can differ from the request alias when Voyage stamps a server-side version). Per-call response models ARE captured in `embedding_api_log.model`; the singleton metadata only tracks the configured alias.
  **Default chosen for now:** Mirror the alias. Phase 6 / Phase 7 can refine the metadata-row writer to capture the most-recent response model if operator wants per-build provenance. The information loss is non-load-bearing because the per-call log is authoritative.
  **Who can resolve:** operator if a vendor-side model swap surfaces in the api_log.

- **Question:** D8 says "cache this check's result in `oracle_meta` so it runs once per startup, not per request." Does `once per startup` mean once per MCP boot, or once per machine lifetime / once per N hours? The phase ships the timestamp stamp; deciding when to re-run is Phase 6's call.
  **Default chosen for now:** Phase 5 stamps the timestamp on success and does nothing else. Phase 6 implements the read side: re-run only if `now() - updated_at > <window>` (operator picks the window in Phase 6; reasonable defaults are "every MCP startup" or "every 24 hours since the last verified call").
  **Who can resolve:** Phase 6.

- **Question:** Embedding-API rate limits and retry strategy. The current implementation does not retry transient failures; it logs and marks stale. Voyage may rate-limit the loader if the operator runs `extract-tag` against many tags in a tight loop.
  **Default chosen for now:** No retry. Stale rows are picked up on the next pass; the spec's failure-mode list explicitly accepts "structured rows still update, vectors marked stale" as the degraded path. Phase 7 may surface rate-limit signals via the api_log error column; Phase 8 may refine batch size or add per-batch backoff if calibration shows a problem.
  **Who can resolve:** Phase 7 / Phase 8 if the operational signal surfaces.

- **Question:** Verifier probe text. D8 names `"weapon scripts"` as the example. Single-token shifts in the probe will produce different cosine values; future operators may want a longer, more-domain-specific probe.
  **Default chosen for now:** Use the spec's `"weapon scripts"`. The threshold (0.85) is loose enough that probe choice is unlikely to flip a passing check to failing; if it does, the verifier message names the probe so the operator can swap it.
  **Who can resolve:** operator at any time by changing `EMBEDDING_SPACE_PROBE` in `shared/embedding.ts`.

- **Question:** `embed-entities` candidate query loads every description into JS memory. At ~9000 entities and ~50 tokens per description (~250 chars) that is ~2.3 MB of text plus the postgres-js row envelope - well within Node / Bun process memory. If the corpus grows past 100k entities, the candidate query may need a streaming variant.
  **Default chosen for now:** No streaming. Arc 1's corpus is bounded by the four ported codebases; Arc 2+ growth will not push past 100k Layer 1 entities.
  **Who can resolve:** Arc 3 if Layer 2 enrichment ever embeds at the message granularity (not the design as of D5; defer indefinitely).

- **Resolved (operator, pre-draft):** `embedding_api_log.source` CHECK enum extends the spec to name three values: `'loader'`, `'mcp-query'`, `'verify'`. Operator-ratified option (a) on the substantive review of this draft. Rationale: verify calls are categorically distinct (boot-time self-test, not corpus build, not user retrieval); routing under `'mcp-query'` would pollute operator spend dashboards; skipping the log entirely would lose audit trail on a real Voyage cost source. The architecture spec at `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:320-328` lists only `'loader'` and `'mcp-query'`; the spec is amended forward by this phase. No further action required - the migration as written is correct.

## Recovery (if verification fails)

- **If verification step 1 (migration) fails:** Re-run `bun db/migrate.ts` against the missing DB. If the migrator says "all migrations applied" but `006_embedding_api_log.sql` is missing from the listing, the file landed under an unexpected ordinal - rename the file or pick a fresh higher ordinal and re-apply (the migrator is append-only and will ignore the renamed file's old name).

- **If verification step 2 (CHECK enum) fails:** The migration file in the repo differs from what was applied. The migrator's sha256 invariant catches this on the next run (it refuses to re-apply a modified migration). Either revert the on-disk edit or land a follow-up migration that ALTERs the CHECK; do not edit `006_embedding_api_log.sql` after it has shipped.

- **If verification step 3 (F14 / D8) fails:** Three buckets:
  - Cosine below 0.85: Voyage's shared-embedding-space claim is currently violated. Re-run once (transient API behavior is rare but possible). On second failure, escalate to operator: options are (a) freeze on a single v4 model (set `EMBEDDING_MODEL_QUERY=voyage-4-large` and re-embed nothing, paying the latency cost at query time) or (b) wait for Voyage to acknowledge and patch.
  - Build or query call errored: check `embedding_api_log` for the error column. Most common: bad VOYAGE_API_KEY (regenerate), rate-limit (wait + retry), 5xx (transient).
  - Dimension mismatch: a vendor-side model swap. Halt the phase and contact operator before continuing.

- **If verification step 4 (entity coverage) fails with `missed > 0`:** The candidate query missed rows. Most likely: a row carries `description IS NOT NULL` but the candidate filter rejected it. Check the row's `description` for an unexpected NULL-byte or bytea content; otherwise the SQL is wrong - inspect `embed-entities.ts` SELECT and align with the verification predicate.

- **If verification step 5 (entity hash-skip) fails:** Second run still embeds rows. The sha256 of `description` and the recorded `description_embedding_sha256` are out of sync. Three sub-cases:
  - The `sha256` helper in `shared/chunking.ts` produces a different digest than the loader expects: re-confirm by hand (`echo -n "<text>" | sha256sum`) and compare against the column.
  - The `description` text was rewritten after the first embed (Phase 2 derivation re-ran): expected and self-healing on the next pass.
  - The pass writes the wrong sha to the row: check the UPDATE's `description_embedding_sha256 = ${r.sha}` binding.

- **If verification step 6 (chunk coverage) fails with `without_emb > 0`:** The candidate query missed chunks. Likely cause: Phase 4's loader inserted a chunk row with `embedding_stale = FALSE` and `embedding IS NULL` simultaneously (which the SELECT does pick up via the `OR embedding IS NULL` branch). Confirm the SELECT clause matches `WHERE embedding IS NULL OR embedding_stale = TRUE`.

- **If verification step 7 (stale-flag re-embed) fails:** The pass is selecting on `embedding_stale = TRUE` but the UPDATE is not clearing it. Inspect the UPDATE in `embed-chunks.ts`: it should set `embedding = ...::vector, embedding_stale = FALSE` in one statement.

- **If verification step 8 (embedding_metadata) fails:** The metadata row is wrong or missing. `INSERT ... ON CONFLICT (id) DO UPDATE` is the right shape; check that the `id = 1` CHECK constraint is not rejecting the upsert (it should not - the CHECK admits id=1, the migration sets the default to 1).

- **If verification step 9 (api_log mix) fails with no `'verify'` rows:** `verify-embedding-space` did not log. Inspect the script: both INSERT statements are required (build call + query call); a partial implementation only logging the build call is the most likely shape.

- **If verification step 10 (tests) fails:** The error message names the file. Most common: missing `VOYAGE_API_KEY` (export it; the env-gated tests will skip and the `cosineSimilarity` tests still run). Less common: a real test failure - investigate per the test message.

- **If verification step 11 (typecheck) fails:** The error message names the file and line. Most common: a missed `import` for the new `embed-entities` / `embed-chunks` modules in `extract-tag.ts` / `load-concepts/index.ts`; or a `postgres.Sql` type mismatch on the new code paths.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F14** (Voyage shared-embedding-space unverified). Resolved by `shared/embedding.ts:verifyEmbeddingSpace` and the standalone `scripts/embed/verify-embedding-space.ts` CLI; D8 startup check is implemented and stamped in `oracle_meta`. Phase 6 will wire it into MCP startup.

No other F-numbered findings touch Phase 5.

## Executor-found amendment (2026-05-03, mid-execution)

**Probe.** Phase 5 executor's first run of `bun test shared/embedding.test.ts` against the live Voyage API returned cosine `0.6846` for the verifier's `(voyage-4-large, input_type='document')` vs `(voyage-4-lite, input_type='query')` cross-call on probe `"weapon scripts"` — well below the 0.85 D8 threshold. A follow-up sanity probe with `input_type='document'` held constant on both calls returned `0.8850` (above threshold). Both probes used the same Voyage API key, the same probe text, and the same DNS path; the only varied input was the second call's `input_type`.

**Why D8's text was insufficient.** D8 specifies the cosine probe (build model vs query model on the same string, threshold 0.85) but is silent on `input_type`. The Phase 5 drafter selected `'document'` for the build call and `'query'` for the query call to mirror production retrieval, which inadvertently confounded two Voyage axes:
- **Model-size axis** — what D8 actually claims ("voyage-4-large and voyage-4-lite produce comparable vectors").
- **Input-type axis** — Voyage's intentional task-specific bias designed to make `'document'` and `'query'` vectors *deliberately distant* on the same input so proper-task-paired retrieval ranks better. This is a documented retrieval-quality feature, not vendor drift.

Mixing both axes in one cosine cannot satisfy >=0.85 under healthy v4 behavior; the verifier was structurally guaranteed to fail.

**What the verifier now actually tests.** `verifyEmbeddingSpace` holds `input_type='document'` on both calls. It asserts the model-size shared-space claim cleanly, in isolation. Production code keeps the input_type asymmetry: `embed-entities.ts` and `embed-chunks.ts` use `'document'`, and Phase 6's per-query embedding path will use `'query'`. Whether the asymmetric pairing in production yields adequate retrieval is a Phase 8 eval question, not a Phase 5 startup gate.

**`decisions.md` D8 stamped** with the `2026-05-03` amendment naming this constraint so a future executor (Phase 6 wires the verifier into MCP startup) inherits the right mental model and does not re-litigate the input_type question. The verifier's source code and error message also name the axis under test in case the decisions doc drifts.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

Brief filled in below; dispatched immediately after this draft lands.

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-5-embeddings.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/review-findings.md

Then verify, file-by-file:

1. Every CREATE TABLE column list - diff against the corresponding section in
   apps/qw-oracle/scripts/load-knowledge/schema.ts. Report mismatches. (Phase 5
   only adds the new embedding_api_log table; no schema.ts comparison applies
   since this table is not in the SQLite source. Confirm the new table's
   columns match the spec at
   docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md
   lines 320-328 and that the CHECK enum admits 'loader','mcp-query','verify'.)
2. Every CHECK constraint - verify enum values match the spec / decisions.md.
3. Every FK reference - verify it matches the FK convention locked in
   decisions.md D1 (entity_id INTEGER for *_versions, canonical_id TEXT for
   asset relation tables). (Phase 5 has no new FKs; the embed pipelines
   reference existing columns.)
4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase
     (Phase 5 modifies extract-tag.ts and load-concepts/index.ts, neither
     of which exists in the live tree yet because Phase 2 + Phase 4 have
     not yet executed - this is expected. The Phase 5 MD should name the
     edits in terms of what those phases will produce.) Flag if the
     parent directory does not exist (apps/qw-oracle/scripts/load-knowledge
     does, apps/qw-oracle/scripts/load-concepts does NOT exist yet because
     Phase 4 has not executed; that is acceptable for a paper plan).
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet - this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL or anything
     else. Skip it entirely.
5. Every `import.meta.main` usage - confirmed allowed (D2 says yes under Bun).
6. Every shell command - does it use `bun` for scripts (D2)?
7. Every reference to a finding (F1-F18 in review-findings.md) - does this
   phase actually resolve the findings it claims to? (Phase 5 claims F14;
   verify the verifyEmbeddingSpace + verify-embedding-space CLI close it.)
8. Every SQL query in verification - does it parse against the schema this
   phase produces? (Best-effort eyeball; Postgres validation comes at runtime.)
9. "Engineer ports X" / "fills in details" / TODO smell - list any.
10. Any tables, columns, or fields the phase introduces that aren't in
    decisions.md and aren't in schema.ts - flag as potential drift.
    (Phase 5 introduces embedding_api_log and writes to oracle_meta /
    embedding_metadata; the architecture spec at lines 254-348 names all
    three.)

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
