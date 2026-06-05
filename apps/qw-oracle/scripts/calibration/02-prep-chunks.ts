// Stage 1.2 -- chunk-prep + session-sample for Workflow A.
//
// Deterministic, zero LLM. Reads scratch/slice.sqlite and writes:
//   - scratch/chunks/<chunkId>.json   one lull-chunk per file (arm-D fence input)
//   - scratch/sessions/<sessionId>.json  one sampled session per file (query-gen input)
//   - scratch/wf-a-input.json          the args object for Workflow A
//
// Prints the spend preview: N chunks (= N fence agents), M sessions (= M query-gen
// agents). Glance at this before launching Workflow A.
//
//   bun scripts/calibration/02-prep-chunks.ts

import { Database } from 'bun:sqlite';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHANNELS, CHUNK_CAP, LULL_GAP_HOURS, RG_PER_CHANNEL,
  SLICE_DB, CHUNK_DIR, SESSION_DIR, SCRATCH,
} from './config.ts';

interface MsgRow { id: string; author: string; content: string; created_at: string }
interface SessRow { session_id: number; content: string }

// Cut a channel's time-ordered messages into chunks: a chunk ends at a quiet
// gap (> gapMs) OR when it reaches `cap` messages (forced=true -- no natural
// topic boundary, the hardest case for the fencer).
function lullChunks(msgs: MsgRow[], cap: number, gapMs: number): { msgs: MsgRow[]; forced: boolean }[] {
  const out: { msgs: MsgRow[]; forced: boolean }[] = [];
  let cur: MsgRow[] = [];
  let last = 0;
  for (const m of msgs) {
    const ts = new Date(m.created_at).getTime();
    if (cur.length && ts - last > gapMs) { out.push({ msgs: cur, forced: false }); cur = []; }
    else if (cur.length >= cap) { out.push({ msgs: cur, forced: true }); cur = []; }
    cur.push(m);
    last = ts;
  }
  if (cur.length) out.push({ msgs: cur, forced: false });
  return out;
}

function cleanDir(dir: string): void {
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) rmSync(join(dir, f));
}

function main(): void {
  const slice = new Database(SLICE_DB, { readonly: true });
  const chans = CHANNELS as unknown as string[];
  const gapMs = LULL_GAP_HOURS * 3600 * 1000;

  cleanDir(CHUNK_DIR);
  cleanDir(SESSION_DIR);

  const chunkIds: string[] = [];
  let forcedCount = 0;
  for (const ch of chans) {
    const slug = ch.replace(/^#/, '');
    const msgs = slice.query<MsgRow, [string]>(
      `SELECT id, author, content, created_at FROM msg WHERE channel=? ORDER BY created_at`,
    ).all(ch);
    const chunks = lullChunks(msgs, CHUNK_CAP, gapMs);
    chunks.forEach((c, i) => {
      const id = `${slug}-${String(i + 1).padStart(3, '0')}`;
      if (c.forced) forcedCount++;
      Bun.write(
        join(CHUNK_DIR, `${id}.json`),
        JSON.stringify({
          id, channel: ch, forced: c.forced,
          messages: c.msgs.map((m, j) => ({ idx: j + 1, id: m.id, author: m.author, content: m.content })),
        }),
      );
      chunkIds.push(id);
    });
    console.log(`  ${ch.padEnd(14)} ${msgs.length} msgs -> ${chunks.length} chunks (${chunks.filter((c) => c.forced).length} forced at cap)`);
  }

  // Neutral query-gen source: real in-window sessions. Oversample by 5 per
  // channel to cover answerable=false drops in Workflow A.
  const sessionIds: number[] = [];
  for (const ch of chans) {
    const rows = slice.query<SessRow, [string, number]>(
      `SELECT session_id, content FROM sess_search
       WHERE channel=? AND chat_count BETWEEN 8 AND 60 AND length(content) > 200
       ORDER BY chat_count DESC LIMIT ?`,
    ).all(ch, RG_PER_CHANNEL + 5);
    for (const r of rows) {
      Bun.write(join(SESSION_DIR, `${r.session_id}.json`), JSON.stringify({ id: r.session_id, channel: ch, content: r.content }));
      sessionIds.push(r.session_id);
    }
    console.log(`  ${ch.padEnd(14)} sampled ${rows.length} sessions for query-gen`);
  }

  Bun.write(
    join(SCRATCH, 'wf-a-input.json'),
    JSON.stringify({ chunkIds, chunkDir: CHUNK_DIR, sessionIds, sessionDir: SESSION_DIR }, null, 2),
  );

  console.log('\n[02-prep-chunks] SPEND PREVIEW for Workflow A:');
  console.log(`  ${chunkIds.length} chunks   -> ${chunkIds.length} fence agents (${forcedCount} forced-at-cap)`);
  console.log(`  ${sessionIds.length} sessions -> ${sessionIds.length} query-gen agents`);
  console.log(`  total Workflow-A agents: ${chunkIds.length + sessionIds.length}`);
  console.log(`  wrote ${join(SCRATCH, 'wf-a-input.json')}`);
  slice.close();
}

if (import.meta.main) main();
