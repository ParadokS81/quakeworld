// apps/qw-oracle/scripts/load-chat/load-threads.ts
//
// Phase A Task 3: promote the probe's 1,008 fenced Feb-Mar 2021 threads from
// scratch/wf-a.json into chat_threads + thread_messages, reusing the probe's
// embed-cache.sqlite so no Voyage credits are spent on cache-hits.
//
// Idempotency contract (R5/D5): for each distinct channel present in this run,
// DELETE the exact window this loader inserts (channel + reconstruction_version
// + date_range_start in [WINDOW_START, WINDOW_END)) before re-inserting.
// batchScopeClause from thread-key.ts guarantees delete-scope === insert-scope.
//
// WINDOW_START/END literals are copied from calibration/config.ts (the probe's
// locked window). They must stay in sync with that file; a comment marks the
// dependency explicitly.

import { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { db, closeDb } from '../../shared/db.ts';
import { embedTexts } from '../../shared/embedding.ts';
import {
  threadKey,
  RECONSTRUCTION_VERSION,
  batchScopeClause,
} from './thread-key.ts';

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

interface WfaThread {
  topic_label: string;
  member_indices: number[];
}

interface WfaFenced {
  chunkId: string;
  abstained: boolean;
  threads: WfaThread[];
}

interface WfaFile {
  fenced: WfaFenced[];
}

interface ChunkMessage {
  idx: number;   // 1-based
  id: string;
  author: string;
  content: string;
}

interface ChunkFile {
  id: string;
  channel: string;
  forced: boolean;
  messages: ChunkMessage[];
}

// A fully-staged thread row ready for DB insert.
interface StagedThread {
  threadKey: string;
  channelName: string;
  topicLabel: string;
  content: string;         // fullText -- byte-identical to probe (R2)
  messageCount: number;
  participants: string[];  // distinct, first-seen order
  participantCount: number;
  memberIds: string[];     // message.id list for junction rows
  vector: number[];
  // Filled after postgres created_at lookup (step 4)
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
}

// --- Cache helpers (replicate probe's key fn exactly) -----------------------
// Key: `${model}:${Bun.hash(text)}` -- Bun.hash produces a BigInt; .toString()
// gives the decimal string that matches what vectors.ts stored.
function cacheKey(text: string): string {
  // Bun.hash returns bigint; must match the key written by vectors.ts exactly.
  return `${buildModel}:${Bun.hash(text)}`;
}

// --- Main -------------------------------------------------------------------

async function main(): Promise<void> {
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
  let truncations = 0;
  let oobDrops = 0;
  let missingMessageWarnings = 0;

  // Load input data.
  const wfa: WfaFile = JSON.parse(await Bun.file(WFA_PATH).text());

  // Step 3: Build staged threads.
  const staged: StagedThread[] = [];
  const channelsPresent = new Set<string>();

  for (const fenced of wfa.fenced) {
    if (fenced.abstained) continue;

    const chunkPath = join(CHUNK_DIR, `${fenced.chunkId}.json`);
    const chunk: ChunkFile = JSON.parse(await Bun.file(chunkPath).text());
    channelsPresent.add(chunk.channel);

    // Build 1-based index map for this chunk's messages.
    const byIdx = new Map<number, ChunkMessage>(chunk.messages.map((m) => [m.idx, m]));

    for (let ti = 0; ti < fenced.threads.length; ti++) {
      const thread = fenced.threads[ti]!;

      // R8: drop OOB member indices defensively (count drops for audit).
      const valid = thread.member_indices.filter((i) => {
        const ok = byIdx.has(i);
        if (!ok) oobDrops++;
        return ok;
      });
      if (valid.length === 0) continue;

      const members = valid.map((i) => byIdx.get(i)!);

      // R2: text must be byte-identical to the probe's text construction in
      // 03-embed-and-retrieve.ts lines 52-55. NO slice here -- the full text
      // is the cache key. The 30000-char slice is applied ONLY to the live
      // Voyage call below.
      const fullText = members.map((m) => `${m.author}: ${m.content}`).join('\n');

      // R4: track truncations for the summary (these threads still embed, just
      // with the first 30000 chars sent to Voyage -- the cache key remains the
      // full-text hash).
      if (fullText.length > 30000) {
        truncations++;
        console.warn(`[load-threads] truncation: chunkId=${fenced.chunkId} threadIndex=${ti} len=${fullText.length}`);
      }

      // Embedding: cache-first.
      const ck = cacheKey(fullText);
      let vector: number[];
      const cached = cacheGet.get(ck);
      if (cached) {
        vector = JSON.parse(cached.vec) as number[];
        cacheHits++;
      } else {
        // Miss: call Voyage with the 30000-char slice, but store under the
        // FULL-text key (R2 -- the key must match what the probe stored).
        const t0 = Date.now();
        const result = await embedTexts([fullText.slice(0, 30000)], buildModel, 'document');
        const latencyMs = Date.now() - t0;
        vector = result.vectors[0]!;

        // Write back to cache under the full-text key.
        cacheSet.run(ck, JSON.stringify(vector));

        // Log the API call the same way embed-entities.ts does.
        await db`
          INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
          VALUES ('loader', ${result.model}, ${result.tokensInput}, ${latencyMs})
        `;
        cacheMisses++;
      }

      // Distinct participants in first-seen order.
      const seenAuthors = new Set<string>();
      const participants: string[] = [];
      for (const m of members) {
        if (!seenAuthors.has(m.author)) {
          seenAuthors.add(m.author);
          participants.push(m.author);
        }
      }

      const tk = threadKey({
        channel: chunk.channel,
        reconstructionVersion: RECONSTRUCTION_VERSION,
        chunkId: fenced.chunkId,
        threadIndex: ti,
      });

      staged.push({
        threadKey: tk,
        channelName: chunk.channel,
        topicLabel: thread.topic_label,
        content: fullText,
        messageCount: members.length,
        participants,
        participantCount: participants.length,
        memberIds: members.map((m) => m.id),
        vector,
      });
    }
  }

  console.log(`[load-threads] staged ${staged.length} threads across ${channelsPresent.size} channel(s)`);

  // Step 4: Fetch created_at for all referenced member message ids in one
  // postgres query to derive date_range_start/end per thread.
  const allMemberIds = [...new Set(staged.flatMap((t) => t.memberIds))];
  const createdAtRows = await db<{ id: string; created_at: Date }[]>`
    SELECT id, created_at FROM messages WHERE id = ANY(${allMemberIds}::text[])
  `;
  const createdAtMap = new Map<string, Date>(createdAtRows.map((r) => [r.id, r.created_at]));

  for (const t of staged) {
    const dates: number[] = [];
    for (const mid of t.memberIds) {
      const ca = createdAtMap.get(mid);
      if (!ca) {
        // This would indicate slice/corpus drift. Expect zero because the slice
        // was built from the messages table. An FK failure will follow if this
        // thread is inserted.
        console.warn(
          `[load-threads] WARNING: message id=${mid} NOT FOUND in messages table ` +
          `(chunkId derived from thread_key ${t.threadKey}). ` +
          'Indicates corpus drift. FK insert will fail.',
        );
        missingMessageWarnings++;
      } else {
        dates.push(ca.getTime());
      }
    }
    if (dates.length === 0) {
      // Fall back to epoch so the insert doesn't explode on the NOT NULL
      // constraint; the loud warnings above identify the problem rows.
      t.dateRangeStart = new Date(0);
      t.dateRangeEnd = new Date(0);
    } else {
      t.dateRangeStart = new Date(Math.min(...dates));
      t.dateRangeEnd = new Date(Math.max(...dates));
    }
  }

  // Step 5: Idempotent write in a single transaction.
  // For each distinct channel, delete the exact window we are about to insert
  // (CASCADE drops thread_messages). Window literals match WINDOW_START/END
  // above, which mirror calibration/config.ts (R5/D5).
  let threadsInserted = 0;
  let junctionRowsInserted = 0;

  await db.begin(async (tx) => {
    // Delete-then-insert per channel so the window is clean before we write.
    for (const channel of channelsPresent) {
      await tx`
        DELETE FROM chat_threads
        WHERE ${batchScopeClause(tx, {
          channel,
          reconstructionVersion: RECONSTRUCTION_VERSION,
          rangeStart: WINDOW_START,
          rangeEnd: WINDOW_END,
        })}
      `;
    }

    for (const t of staged) {
      // pgvector literal -- same pattern as embed-entities.ts line 102.
      const vecLiteral = `[${t.vector.join(',')}]`;

      const inserted = await tx<{ id: bigint }[]>`
        INSERT INTO chat_threads (
          thread_key,
          channel_name,
          platform,
          date_range_start,
          date_range_end,
          participant_count,
          participants_json,
          message_count,
          topic_label,
          content,
          topic_embedding,
          embedding_stale,
          resolution_status,
          buckets_question,
          buckets_answer,
          reconstruction_version
        ) VALUES (
          ${t.threadKey},
          ${t.channelName},
          'discord',
          ${t.dateRangeStart!.toISOString()}::timestamptz,
          ${t.dateRangeEnd!.toISOString()}::timestamptz,
          ${t.participantCount},
          ${tx.json(t.participants as never)},
          ${t.messageCount},
          ${t.topicLabel},
          ${t.content},
          ${vecLiteral}::vector,
          FALSE,
          NULL,
          NULL,
          NULL,
          ${RECONSTRUCTION_VERSION}
        )
        RETURNING id
      `;
      const threadId = inserted[0]!.id;
      threadsInserted++;

      // Junction rows: one per member message id.
      for (const mid of t.memberIds) {
        await tx`
          INSERT INTO thread_messages (thread_id, message_id)
          VALUES (${threadId}, ${mid})
        `;
        junctionRowsInserted++;
      }
    }
  });

  // Step 6: Summary.
  const hitRate = cacheHits + cacheMisses > 0
    ? cacheHits / (cacheHits + cacheMisses)
    : 0;

  console.log('\n[load-threads] SUMMARY');
  console.log(`  threads loaded:           ${threadsInserted}`);
  console.log(`  junction rows inserted:   ${junctionRowsInserted}`);
  console.log(`  cache hits:               ${cacheHits}`);
  console.log(`  cache misses:             ${cacheMisses}`);
  console.log(`  truncations (>30000):     ${truncations}`);
  console.log(`  OOB idx drops:            ${oobDrops}`);
  console.log(`  missing-message warnings: ${missingMessageWarnings}`);
  console.log(`  cache hit rate:           ${(hitRate * 100).toFixed(1)}%`);

  // R2 safety banner: if hit-rate is below 50% on a full run, the text is
  // almost certainly not byte-identical to what the probe embedded.
  if (staged.length >= 100 && hitRate < 0.5) {
    console.error('');
    console.error('============================================================');
    console.error('CACHE ALL-MISS: reconstructed text is not byte-identical to');
    console.error('the probe (R2). Diff a sample thread\'s text against');
    console.error('03-embed-and-retrieve.ts before trusting embeddings.');
    console.error('============================================================');
  }

  cache.close();
}

if (import.meta.main) {
  try {
    await main();
  } finally {
    await closeDb();
  }
}
