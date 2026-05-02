// apps/qw-oracle/scripts/embed/verify-embedding-space.ts
//
// D8 closure CLI. Embeds a known string under the build model and the query
// model with input_type='document' on both calls (per the 2026-05-03 D8
// amendment: this isolates the model-size axis; the build/query input_type
// asymmetry is a Voyage retrieval-quality feature evaluated empirically at
// Phase 8, not gated at startup). Asserts cosine similarity above
// EMBEDDING_SPACE_THRESHOLD, logs both calls into embedding_api_log, and
// stamps oracle_meta on success.
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

  // Embed under both models with input_type='document' held constant and
  // log both calls. We do not delegate to verifyEmbeddingSpace() here
  // because we need to log per-call latency and tokens; the helper does
  // not log (it has no DB dependency).
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
    queryResult = await embedTexts([EMBEDDING_SPACE_PROBE], queryModel, 'document');
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
    `(input_type='document' on both) ` +
    `cosine=${similarity.toFixed(4)} threshold=${EMBEDDING_SPACE_THRESHOLD}`,
  );

  if (similarity < EMBEDDING_SPACE_THRESHOLD) {
    console.error(
      `[verify-embedding-space] FAIL: model-size cosine ${similarity.toFixed(4)} below threshold ${EMBEDDING_SPACE_THRESHOLD}. ` +
      `voyage-4-large and voyage-4-lite shared-space claim appears violated. Resolve before continuing to Phase 6.`,
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
