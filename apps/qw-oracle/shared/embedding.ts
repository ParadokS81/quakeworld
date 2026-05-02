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
// matched models.
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

// D8 (amended 2026-05-03): assert that the build and query MODEL SIZES land
// in a comparable embedding space. Tests the model-size axis only; both
// calls hold input_type='document' constant. Voyage's input_type asymmetry
// (corpus uses 'document', queries use 'query') is an intentional retrieval-
// quality feature -- it makes same-text-cross-input_type cosine deliberately
// lower so that proper-task-paired retrieval ranks better. Mixing both axes
// in one cosine cannot satisfy the >=0.85 threshold under healthy v4
// behavior. Phase 8 eval covers retrieval quality empirically; D8 is just
// the cross-model sanity gate. Do NOT change the input_type to 'query' on
// either call -- you will revert this fix and break startup.
export async function verifyEmbeddingSpace(): Promise<VerifyResult> {
  const buildModel = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
  const queryModel = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';

  const build = await embedTexts([EMBEDDING_SPACE_PROBE], buildModel, 'document');
  const query = await embedTexts([EMBEDDING_SPACE_PROBE], queryModel, 'document');

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
      `Embedding-space verification failed: model-size axis cosine ` +
      `${similarity.toFixed(4)} below threshold ${EMBEDDING_SPACE_THRESHOLD} for ` +
      `probe "${EMBEDDING_SPACE_PROBE}" (build=${buildModel}, query=${queryModel}, ` +
      `input_type='document' on both calls). Voyage 4-series shared-space claim ` +
      `across model sizes appears violated; pick a single model for both build ` +
      `and query, or wait for Voyage to acknowledge.`,
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
