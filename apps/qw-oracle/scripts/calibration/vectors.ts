// In-memory cosine + cached Voyage batch embed for the calibration probe.
//
// The cache (EMBED_CACHE sqlite) survives across script runs so re-running
// 03-embed-and-retrieve.ts after a Workflow re-run does not re-bill Voyage for
// unchanged text. Keyed by `${model}:${Bun.hash(text)}`.

import { Database } from 'bun:sqlite';
import { embedTexts, cosineSimilarity } from '../../shared/embedding.ts';
import { BUILD_MODEL, QUERY_MODEL, EMBED_CACHE } from './config.ts';

const cache = new Database(EMBED_CACHE);
cache.run(`CREATE TABLE IF NOT EXISTS emb (k TEXT PRIMARY KEY, vec TEXT)`);

const key = (m: string, t: string) => `${m}:${Bun.hash(t)}`;

// Token accounting for the Stage 5 cost report. Reset per process; read after
// embedAll calls complete.
export const embedStats = { apiTokens: 0, cacheHits: 0, apiCalls: 0 };

export async function embedAll(
  texts: string[],
  inputType: 'document' | 'query',
): Promise<number[][]> {
  const model = inputType === 'document' ? BUILD_MODEL : QUERY_MODEL;
  const out: (number[] | null)[] = texts.map((t) => {
    const r = cache.query<{ vec: string }, [string]>(`SELECT vec FROM emb WHERE k=?`).get(key(model, t));
    return r ? JSON.parse(r.vec) : null;
  });
  embedStats.cacheHits += out.filter((v) => v !== null).length;

  const miss = out.flatMap((v, i) => (v === null ? [i] : []));
  for (let i = 0; i < miss.length; i += 96) {
    const idx = miss.slice(i, i + 96);
    const { vectors, tokensInput } = await embedTexts(
      idx.map((j) => texts[j]!.slice(0, 30000)),
      model,
      inputType,
    );
    embedStats.apiTokens += tokensInput;
    embedStats.apiCalls += 1;
    idx.forEach((j, b) => {
      out[j] = vectors[b]!;
      cache.run(`INSERT OR REPLACE INTO emb VALUES (?,?)`, [key(model, texts[j]!), JSON.stringify(vectors[b]!)]);
    });
  }
  return out as number[][];
}

export interface Unit {
  id: string;
  channel: string;
  vec: number[];
}

export const topK = (u: Unit[], q: number[], k: number) =>
  u
    .map((x) => ({ id: x.id, channel: x.channel, score: cosineSimilarity(q, x.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
