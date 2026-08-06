// Phase C per-batch post-load verification -- the ledger ritual's DB half.
// Reusable across all remaining batches -- the ledger's ritual as one command.
//   bun scripts/load-chat/verify-batch.ts "#quakeworld" 2017
//
// Prints: batch-scope thread count, junction rows + DISTINCT msgs (R8 m2m),
// thread_key set md5 (idempotency fingerprint -- sorted keys joined by \n),
// null/stale embeddings, and the GLOBAL per-version + per-scope census.
import { createHash } from 'node:crypto';
import { db, closeDb } from '../../shared/db.ts';

const channel = process.argv[2]!;
const year = parseInt(process.argv[3]!, 10);
const lo = `${year}-01-01T00:00:00Z`;
const hi = `${year + 1}-01-01T00:00:00Z`;

const scope = db`
  ct.channel_name = ${channel}
  AND ct.date_range_start >= ${lo} AND ct.date_range_start < ${hi}`;

const keys = await db<{ thread_key: string }[]>`
  SELECT ct.thread_key FROM chat_threads ct WHERE ${scope} ORDER BY ct.thread_key`;
const md5 = createHash('md5').update(keys.map((k) => k.thread_key).join('\n')).digest('hex');

const junction = await db<{ rows: number; distinct_msgs: number }[]>`
  SELECT count(*)::int rows, count(DISTINCT tm.message_id)::int distinct_msgs
  FROM thread_messages tm JOIN chat_threads ct ON ct.id = tm.thread_id WHERE ${scope}`;

const res = await db<{ resolution_status: string | null; n: number }[]>`
  SELECT ct.resolution_status, count(*)::int n FROM chat_threads ct WHERE ${scope}
  GROUP BY 1 ORDER BY 1`;

const emb = await db<{ nullemb: number; stale: number }[]>`
  SELECT count(*) FILTER (WHERE ct.topic_embedding IS NULL)::int nullemb,
         count(*) FILTER (WHERE ct.embedding_stale)::int stale
  FROM chat_threads ct WHERE ${scope}`;

const globalTotal = await db<{ n: number }[]>`SELECT count(*)::int n FROM chat_threads`;
const byVer = await db`SELECT reconstruction_version v, count(*)::int n FROM chat_threads GROUP BY 1 ORDER BY 1`;
const globalEmb = await db<{ nullemb: number; stale: number }[]>`
  SELECT count(*) FILTER (WHERE topic_embedding IS NULL)::int nullemb,
         count(*) FILTER (WHERE embedding_stale)::int stale FROM chat_threads`;
const dupKeys = await db<{ n: number }[]>`
  SELECT count(*)::int n FROM (SELECT thread_key FROM chat_threads GROUP BY 1 HAVING count(*) > 1) x`;
const badKeys = await db<{ n: number }[]>`
  SELECT count(*)::int n FROM chat_threads
  WHERE reconstruction_version = 'fence-sonnet-v2' AND thread_key !~ '-[0-9]{4}-[0-9]{3}:'`;
const census = await db`
  SELECT channel_name ch, reconstruction_version v, date_part('year', date_range_start)::int yr, count(*)::int n
  FROM chat_threads GROUP BY 1,2,3 ORDER BY 1,2,3`;

console.log(JSON.stringify({
  batch: `${channel} ${year}`,
  threads: keys.length,
  threadKeyMd5: md5,
  junctionRows: junction[0]!.rows,
  distinctMsgs: junction[0]!.distinct_msgs,
  r8MultiThreadMsgs: junction[0]!.rows - junction[0]!.distinct_msgs,
  resolution: Object.fromEntries(res.map((r) => [r.resolution_status ?? 'none', r.n])),
  batchNullEmb: emb[0]!.nullemb, batchStaleEmb: emb[0]!.stale,
  GLOBAL: {
    total: globalTotal[0]!.n,
    byVersion: byVer,
    nullEmb: globalEmb[0]!.nullemb,
    staleEmb: globalEmb[0]!.stale,
    nonYearScopedV2Keys: badKeys[0]!.n,
    duplicateThreadKeys: dupKeys[0]!.n,
  },
  census,
}, null, 2));
await closeDb();
