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
