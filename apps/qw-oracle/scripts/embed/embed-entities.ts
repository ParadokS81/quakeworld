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

  // Upsert the singleton embedding_metadata row. The configured alias is
  // stored here; per-call response models (which can carry a server-side
  // version suffix) are captured in embedding_api_log.model.
  if (embedded > 0) {
    await db`
      INSERT INTO embedding_metadata (id, model_name, model_version, dimension, embedded_at, rows_embedded)
      VALUES (1, ${buildModel}, ${buildModel}, 1024, now(), ${totalWithEmbedding})
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
