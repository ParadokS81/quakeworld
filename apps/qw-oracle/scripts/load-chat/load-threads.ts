// apps/qw-oracle/scripts/load-chat/load-threads.ts
//
// Phase A Task 3: thin wrapper over loadThreadsCore. Promotes the probe's
// 1,008 fenced Feb-Mar 2021 threads from scratch/wf-a.json into chat_threads
// + thread_messages, reusing the probe's embed-cache.sqlite so no Voyage
// credits are spent on cache hits.
//
// The core idempotency contract (version-agnostic range delete) lives in
// thread-loader-core.ts. See its header comment for WHY the delete drops all
// reconstruction_version values in the window, not just v1.
//
// WINDOW_START/END literals are copied from calibration/config.ts (the probe's
// locked window). They must stay in sync with that file; a comment marks the
// dependency explicitly.

import { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { db, closeDb } from '../../shared/db.ts';
import { embedTexts } from '../../shared/embedding.ts';
import { RECONSTRUCTION_VERSION } from './thread-key.ts';
import {
  loadThreadsCore,
  type CoreFenced,
  type EmbedFn,
} from './thread-loader-core.ts';

// Calibration-probe locked window (mirrors calibration/config.ts WINDOW_START /
// WINDOW_END). Do NOT change without also re-running the probe.
const WINDOW_START = '2021-02-01T00:00:00Z';
const WINDOW_END = '2021-04-01T00:00:00Z';

// The probe embeds with the build model; default must match calibration/config.ts.
const buildModel = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';

// Scratch dir is gitignored -- reference from this file's location.
const SCRATCH = join(import.meta.dir, '../calibration/scratch');
const WFA_PATH = join(SCRATCH, 'wf-a.json');
const CHUNK_DIR = join(SCRATCH, 'chunks');
const CACHE_PATH = join(SCRATCH, 'embed-cache.sqlite');

// --- Types ------------------------------------------------------------------

interface WfaFile {
  fenced: CoreFenced[];
}

interface ChunkFile {
  id: string;
  channel: string;
  forced: boolean;
  messages: { idx: number; id: string; author: string; content: string }[];
}

// --- Main -------------------------------------------------------------------

async function main(): Promise<void> {
  // WARNING: this loader writes the v1 PROBE 2021 slice. After reset-day's
  // production v2 full-year-2021 backfill supersedes it, do NOT re-run this
  // loader -- it would regress 2021 to v1 probe threads via the range-supersede
  // delete (see thread-loader-core.ts header comment).

  // Step 1: Pre-flight -- assert scratch inputs exist.
  const missing: string[] = [];
  if (!existsSync(WFA_PATH)) missing.push(WFA_PATH);
  if (!existsSync(CHUNK_DIR)) missing.push(CHUNK_DIR);
  if (!existsSync(CACHE_PATH)) missing.push(CACHE_PATH);
  if (missing.length > 0) {
    console.error('[load-threads] MISSING scratch inputs:');
    for (const p of missing) console.error(`  ${p}`);
    console.error(
      '[load-threads] scratch/ is gone (gitignored). Recovery: re-run ' +
      '`bun scripts/calibration/01-build-slice.ts` + `02-prep-chunks.ts`, ' +
      'then Workflow wf-a-fence-queries.js -> scratch/wf-a.json, then re-run this loader.',
    );
    process.exit(1);
  }

  // Step 2: Open cache (NOT readonly -- misses are written back).
  const cache = new Database(CACHE_PATH);
  cache.run('CREATE TABLE IF NOT EXISTS emb (k TEXT PRIMARY KEY, vec TEXT)');

  const cacheGet = cache.prepare<{ vec: string }, [string]>('SELECT vec FROM emb WHERE k=?');
  const cacheSet = cache.prepare('INSERT OR REPLACE INTO emb VALUES (?,?)');

  let cacheHits = 0;
  let cacheMisses = 0;

  // Load input data.
  const wfa: WfaFile = JSON.parse(await Bun.file(WFA_PATH).text());

  // Cache-first EmbedFn. Key: `${model}:${Bun.hash(text)}` -- matches probe's
  // key written by vectors.ts exactly. Miss branch calls Voyage with the
  // 30000-char slice, stores under the FULL-text key (R2: key must match
  // what the probe stored). Returns aligned results.
  const embed: EmbedFn = async (contents) => {
    const results: ({ vector: number[]; stale: false } | { vector: null; stale: true })[] = [];

    for (const content of contents) {
      const ck = `${buildModel}:${Bun.hash(content)}`;
      const cached = cacheGet.get(ck);
      if (cached) {
        results.push({ vector: JSON.parse(cached.vec) as number[], stale: false });
        cacheHits++;
      } else {
        // Miss: call Voyage with the 30000-char slice, store under full-text key.
        const t0 = Date.now();
        const result = await embedTexts([content.slice(0, 30000)], buildModel, 'document');
        const latencyMs = Date.now() - t0;
        const vector = result.vectors[0]!;

        cacheSet.run(ck, JSON.stringify(vector));

        await db`
          INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
          VALUES ('loader', ${result.model}, ${result.tokensInput}, ${latencyMs})
        `;
        cacheMisses++;
        results.push({ vector, stale: false });
      }
    }
    return results;
  };

  // Step 3: Call core.
  const result = await loadThreadsCore({
    fenced: wfa.fenced,
    loadChunk: async (chunkId) => {
      const chunkPath = join(CHUNK_DIR, `${chunkId}.json`);
      const chunk: ChunkFile = JSON.parse(await Bun.file(chunkPath).text());
      return { channel: chunk.channel, messages: chunk.messages };
    },
    reconstructionVersion: RECONSTRUCTION_VERSION,
    deleteScopes: ['#helpdesk', '#quakeworld'].map((ch) => ({
      channel: ch,
      rangeStart: WINDOW_START,
      rangeEnd: WINDOW_END,
    })),
    embed,
  });

  cache.close();

  // Step 4: Summary.
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? cacheHits / total : 0;

  console.log('\n[load-threads] SUMMARY');
  console.log(`  threads loaded:           ${result.threadsInserted}`);
  console.log(`  junction rows inserted:   ${result.junctionRows}`);
  console.log(`  cache hits:               ${cacheHits}`);
  console.log(`  cache misses:             ${cacheMisses}`);
  console.log(`  truncations (>30000):     ${result.truncations}`);
  console.log(`  OOB idx drops:            ${result.oobDrops}`);
  console.log(`  missing-message warnings: ${result.missingMsgWarnings}`);
  console.log(`  stale embeds:             ${result.staleEmbeds}`);
  console.log(`  cache hit rate:           ${(hitRate * 100).toFixed(1)}%`);

  // R2 safety banner: if hit-rate is below 50% on a full run, the text is
  // almost certainly not byte-identical to what the probe embedded.
  if (result.threadsInserted >= 100 && hitRate < 0.5) {
    console.error('');
    console.error('============================================================');
    console.error('CACHE ALL-MISS: reconstructed text is not byte-identical to');
    console.error('the probe (R2). Diff a sample thread\'s text against');
    console.error('03-embed-and-retrieve.ts before trusting embeddings.');
    console.error('============================================================');
  }
}

if (import.meta.main) {
  try {
    await main();
  } finally {
    await closeDb();
  }
}
