// apps/qw-oracle/scripts/load-chat/backfill-batch.ts
//
// Phase C backfill pipeline -- three subcommands:
//
//   count <channel> <year>           -- pull + lullChunks, print JSON stats, no writes
//   prep  <channel> <year>           -- pull + lullChunks, write chunk files + manifest
//   load  <channel> <year> <fence>   -- read manifest + fence output, call loadThreadsCore
//
// Designed for quota-free quota-free operator-paced iteration: count builds the
// ledger, prep writes files for the fence agent, load ingests fenced output.
//
// Production version constant lives here and in thread-key.ts (imported from there).

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { db, closeDb } from '../../shared/db.ts';
import { embedTexts } from '../../shared/embedding.ts';
import { PRODUCTION_VERSION } from './thread-key.ts';
import {
  loadThreadsCore,
  type CoreFenced,
  type CoreThread,
  type EmbedFn,
} from './thread-loader-core.ts';

// ---------------------------------------------------------------------------
// Production constants
// ---------------------------------------------------------------------------

const GAP_MS = 12 * 3600 * 1000;  // 12h lull gap -- LOCKED at calibration recommendation
const CAP = 1500;                   // max messages per chunk -- cap-sweep winner
const MAX_READ_BYTES = 256 * 1024;  // R13 fence-agent Read tool hard cap; chunks exceeding
                                    // this would be truncated when the agent reads them

const buildModel = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';

// The four backfill channels (batch map, decisions.md D9 amendment). High-value
// first (#helpdesk, #quakeworld), cheap tail last (#dev-corner, #antilag).
const CHANS = ['#helpdesk', '#quakeworld', '#dev-corner', '#antilag'];

// Scratch root for Phase C batches: scratch/backfill/<slug>-<year>/
const SCRATCH_ROOT = join(import.meta.dir, '../calibration/scratch/backfill');

function batchDir(channel: string, year: number): string {
  const slug = channel.replace(/^#/, '');
  return join(SCRATCH_ROOT, `${slug}-${year}`);
}

function chunkDir(channel: string, year: number): string {
  return join(batchDir(channel, year), 'chunks');
}

function manifestPath(channel: string, year: number): string {
  return join(batchDir(channel, year), 'manifest.json');
}

// ---------------------------------------------------------------------------
// lullChunks -- mirrors the proven 02-prep-chunks.ts lullChunks;
// production canonical copy. Generic over any row type that has created_at.
// Cuts a time-ordered message stream into chunks: a chunk ends at a quiet gap
// (> gapMs between consecutive messages) OR when it reaches `cap` messages
// (forced=true -- no natural topic boundary, the hardest case for the fencer).
// ---------------------------------------------------------------------------
function lullChunks<T extends { created_at: Date }>(
  msgs: T[],
  cap: number,
  gapMs: number,
): { msgs: T[]; forced: boolean }[] {
  const out: { msgs: T[]; forced: boolean }[] = [];
  let cur: T[] = [];
  let last = 0;
  for (const m of msgs) {
    const ts = m.created_at.getTime();
    if (cur.length && ts - last > gapMs) {
      out.push({ msgs: cur, forced: false });
      cur = [];
    } else if (cur.length >= cap) {
      out.push({ msgs: cur, forced: true });
      cur = [];
    }
    cur.push(m);
    last = ts;
  }
  if (cur.length) out.push({ msgs: cur, forced: false });
  return out;
}

// ---------------------------------------------------------------------------
// Postgres pull -- chat+link messages for a (channel, year).
// Year batches pull strictly created_at in [year, year+1).
//
// STRADDLE (fold #4): A conversation spanning Dec 31 -> Jan 1 is fenced as
// TWO threads, one per year. This is INTENTIONAL and idempotency-safe: each
// resulting thread's date_range_start lands in exactly one year, so exactly
// one batch's range-DELETE covers it. Do NOT fix this by adding cross-year
// overlap windows -- overlap would double-fence the boundary region under
// different chunkIds, producing duplicate coverage. The split cost is tiny and
// same-class as cap-forced cuts.
// ---------------------------------------------------------------------------

interface MsgRow {
  id: string;
  author_name: string;
  content: string;
  created_at: Date;
}

async function pullMsgs(channel: string, year: number): Promise<MsgRow[]> {
  return db<MsgRow[]>`
    SELECT m.id, m.author_name, m.content, m.created_at
    FROM messages m JOIN message_labels ml ON ml.message_id = m.id
    WHERE ml.category IN ('chat','link') AND m.channel_name = ${channel}
      AND m.created_at >= ${year + '-01-01T00:00:00Z'} AND m.created_at < ${(year + 1) + '-01-01T00:00:00Z'}
    ORDER BY m.created_at
  `;
}

// ---------------------------------------------------------------------------
// Subcommand: count
// ---------------------------------------------------------------------------

async function cmdCount(channel: string, year: number): Promise<void> {
  const msgs = await pullMsgs(channel, year);
  const chunks = lullChunks(msgs, CAP, GAP_MS);
  const forced = chunks.filter((c) => c.forced).length;
  console.log(JSON.stringify({ channel, year, msgs: msgs.length, chunks: chunks.length, forced }));
}

// ---------------------------------------------------------------------------
// Subcommand: count-all -- chunk EVERY (channel, year) at 12h/1500 to produce
// exact agent counts for the backfill ledger. Quota-free (chunking only needs
// timestamps, so the pull is created_at-only -- light even for #quakeworld).
// Reproducible: re-run to regenerate the ledger after a corpus catch-up import.
// ---------------------------------------------------------------------------

async function cmdCountAll(): Promise<void> {
  // One grid query: which (channel, year) cells are non-empty.
  const grid = await db<{ channel_name: string; yr: string; c: number }[]>`
    SELECT m.channel_name, to_char(date_trunc('year', m.created_at), 'YYYY') AS yr, count(*)::int AS c
    FROM messages m JOIN message_labels ml ON ml.message_id = m.id
    WHERE ml.category IN ('chat','link') AND m.channel_name = ANY(${CHANS}::text[])
    GROUP BY 1, 2 ORDER BY 1, 2
  `;

  let totalChunks = 0;
  let totalMsgs = 0;
  let totalForced = 0;
  // Emit in CHANS order (high-value first) so the ledger reads top-down.
  for (const channel of CHANS) {
    const cells = grid.filter((g) => g.channel_name === channel).sort((a, b) => a.yr.localeCompare(b.yr));
    for (const cell of cells) {
      const year = parseInt(cell.yr, 10);
      // Chunking only needs created_at -- pull timestamps only (light).
      const ts = await db<{ created_at: Date }[]>`
        SELECT m.created_at
        FROM messages m JOIN message_labels ml ON ml.message_id = m.id
        WHERE ml.category IN ('chat','link') AND m.channel_name = ${channel}
          AND m.created_at >= ${year + '-01-01T00:00:00Z'} AND m.created_at < ${(year + 1) + '-01-01T00:00:00Z'}
        ORDER BY m.created_at
      `;
      const chunks = lullChunks(ts, CAP, GAP_MS);
      const forced = chunks.filter((c) => c.forced).length;
      totalChunks += chunks.length;
      totalMsgs += ts.length;
      totalForced += forced;
      console.log(JSON.stringify({ channel, year, msgs: ts.length, chunks: chunks.length, forced }));
    }
  }
  console.log(JSON.stringify({ TOTAL: true, msgs: totalMsgs, chunks: totalChunks, forced: totalForced }));
}

// ---------------------------------------------------------------------------
// Subcommand: prep
// ---------------------------------------------------------------------------

async function cmdPrep(channel: string, year: number): Promise<void> {
  const msgs = await pullMsgs(channel, year);
  const chunks = lullChunks(msgs, CAP, GAP_MS);
  const slug = channel.replace(/^#/, '');
  const dir = batchDir(channel, year);
  const cDir = chunkDir(channel, year);

  // Clean + recreate chunks dir.
  mkdirSync(cDir, { recursive: true });
  for (const f of readdirSync(cDir)) {
    if (f.endsWith('.json')) rmSync(join(cDir, f));
  }

  const chunkIds: string[] = [];
  let maxBytes = 0;

  chunks.forEach((c, i) => {
    // R14: the year MUST be in the chunk id. The thread_key embeds chunkId, and
    // the idempotent load DELETEs by (channel, year) range. A year-less chunk id
    // (`helpdesk-001`) makes the SAME key for every year of a channel, so the
    // first second-batch of any channel collides with its already-loaded sibling
    // (the DELETE is year-scoped and correctly spares the sibling). Year-scoping
    // the id realigns the key with the delete scope (R5).
    const id = `${slug}-${year}-${String(i + 1).padStart(3, '0')}`;
    chunkIds.push(id);

    const payload = JSON.stringify({
      id,
      channel,
      forced: c.forced,
      // INCLUDE message id -- the load subcommand needs it for junction rows
      // and created_at lookups.
      messages: c.msgs.map((m, j) => ({
        idx: j + 1,
        id: m.id,
        author: m.author_name,
        content: m.content,
      })),
    });

    const path = join(cDir, `${id}.json`);
    // Sync write so the size check (statSync) is immediate after write.
    writeFileSync(path, payload);

    const bytes = statSync(path).size;
    // R13: if the file exceeds the fence-agent Read cap, the agent would read
    // it truncated, producing corrupt fence output. Throw immediately so the
    // operator knows before the batch is sent.
    if (bytes > MAX_READ_BYTES) {
      throw new Error(
        `${id} is ${(bytes / 1024).toFixed(0)}KB > 256KB Read cap (R13) -- ` +
        `a fence agent would read it truncated. Lower CAP (currently ${CAP}).`,
      );
    }
    if (bytes > maxBytes) maxBytes = bytes;
  });

  // Write manifest.
  const manifest = JSON.stringify({ chunkIds, chunkDir: cDir, channel, year }, null, 2);
  writeFileSync(join(dir, 'manifest.json'), manifest);

  console.log(`[backfill-batch prep] channel=${channel} year=${year}`);
  console.log(`  chunks:    ${chunks.length}`);
  console.log(`  forced:    ${chunks.filter((c) => c.forced).length}`);
  console.log(`  max bytes: ${(maxBytes / 1024).toFixed(1)}KB`);
  console.log(`  manifest:  ${join(dir, 'manifest.json')}`);
}

// ---------------------------------------------------------------------------
// Subcommand: load
// ---------------------------------------------------------------------------

interface ManifestFile {
  chunkIds: string[];
  chunkDir: string;
  channel: string;
  year: number;
}

interface FenceOutputEnvelope {
  fenced: {
    chunkId: string;
    abstained: boolean;
    threads: {
      topic_label: string;
      member_indices: number[];
      resolution_status?: 'solved' | 'unresolved' | 'informational';
    }[];
  }[];
}

interface ChunkFile {
  id: string;
  channel: string;
  forced: boolean;
  messages: { idx: number; id: string; author: string; content: string }[];
}

async function cmdLoad(
  channel: string,
  year: number,
  fenceOutputPath: string,
): Promise<void> {
  // Read manifest.
  const manifest: ManifestFile = JSON.parse(
    await Bun.file(manifestPath(channel, year)).text(),
  );

  // Read fence output. Accept both {fenced:[...]} envelope OR bare array.
  const rawFence = JSON.parse(await Bun.file(fenceOutputPath).text()) as
    | FenceOutputEnvelope
    | FenceOutputEnvelope['fenced'];

  const fenced: CoreFenced[] = Array.isArray(rawFence)
    ? (rawFence as CoreFenced[])
    : (rawFence as FenceOutputEnvelope).fenced;

  // Verify all chunk files are present before touching the DB.
  for (const id of manifest.chunkIds) {
    const path = join(manifest.chunkDir, `${id}.json`);
    if (!existsSync(path)) {
      throw new Error(`[backfill-batch load] missing chunk file: ${path}`);
    }
  }

  // Live batch-64 EmbedFn mirroring embed-entities.ts batch pattern.
  const BATCH_SIZE = 64;

  const embed: EmbedFn = async (contents: string[]) => {
    const results: ({ vector: number[]; stale: false } | { vector: null; stale: true })[] = [];

    for (let i = 0; i < contents.length; i += BATCH_SIZE) {
      const batchContents = contents.slice(i, i + BATCH_SIZE);
      // Apply the 30000-char slice at the Voyage call site (not at text construction).
      const texts = batchContents.map((c) => c.slice(0, 30000));

      try {
        const t0 = Date.now();
        const result = await embedTexts(texts, buildModel, 'document');
        const latencyMs = Date.now() - t0;

        await db`
          INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
          VALUES ('loader', ${result.model}, ${result.tokensInput}, ${latencyMs})
        `;

        for (const v of result.vectors) {
          results.push({ vector: v, stale: false });
        }
      } catch (err) {
        const errMsg = (err as Error).message;
        console.error(`[backfill-batch] embed batch ${i}/${contents.length} failed: ${errMsg}`);
        await db`
          INSERT INTO embedding_api_log (source, model, input_tokens, error)
          VALUES ('loader', ${buildModel}, 0, ${errMsg})
        `;
        // Mark entire failed batch stale; continue so other batches succeed.
        for (let _j = 0; _j < batchContents.length; _j++) {
          results.push({ vector: null, stale: true });
        }
      }
    }

    return results;
  };

  // Run the core.
  const result = await loadThreadsCore({
    fenced,
    loadChunk: async (chunkId: string) => {
      const path = join(manifest.chunkDir, `${chunkId}.json`);
      const chunk: ChunkFile = JSON.parse(await Bun.file(path).text());
      return { channel: chunk.channel, messages: chunk.messages };
    },
    reconstructionVersion: PRODUCTION_VERSION,
    deleteScopes: [
      {
        channel,
        rangeStart: `${year}-01-01T00:00:00Z`,
        rangeEnd: `${year + 1}-01-01T00:00:00Z`,
      },
    ],
    embed,
  });

  console.log('\n[backfill-batch load] SUMMARY');
  console.log(`  threads inserted:         ${result.threadsInserted}`);
  console.log(`  junction rows:            ${result.junctionRows}`);
  console.log(`  truncations (>30000):     ${result.truncations}`);
  console.log(`  OOB idx drops:            ${result.oobDrops}`);
  console.log(`  missing-message warnings: ${result.missingMsgWarnings}`);
  console.log(`  stale embeds:             ${result.staleEmbeds}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const [, , subcmd, ...rest] = process.argv;

  try {
    if (subcmd === 'count') {
      const [channel, yearStr] = rest;
      if (!channel || !yearStr) {
        console.error('Usage: backfill-batch.ts count <channel> <year>');
        process.exit(1);
      }
      await cmdCount(channel, parseInt(yearStr, 10));
    } else if (subcmd === 'count-all') {
      await cmdCountAll();
    } else if (subcmd === 'prep') {
      const [channel, yearStr] = rest;
      if (!channel || !yearStr) {
        console.error('Usage: backfill-batch.ts prep <channel> <year>');
        process.exit(1);
      }
      await cmdPrep(channel, parseInt(yearStr, 10));
    } else if (subcmd === 'load') {
      const [channel, yearStr, fencePath] = rest;
      if (!channel || !yearStr || !fencePath) {
        console.error('Usage: backfill-batch.ts load <channel> <year> <fenceOutputPath>');
        process.exit(1);
      }
      await cmdLoad(channel, parseInt(yearStr, 10), fencePath);
    } else {
      console.error('Usage: backfill-batch.ts <count|count-all|prep|load> ...');
      console.error('  count     <channel> <year>');
      console.error('  count-all                       (ledger: chunk every (channel,year))');
      console.error('  prep      <channel> <year>');
      console.error('  load      <channel> <year> <fenceOutputPath>');
      process.exit(1);
    }
  } finally {
    await closeDb();
  }
}
