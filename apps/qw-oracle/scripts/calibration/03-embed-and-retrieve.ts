// Stage 3 -- deterministic embed + retrieve (Voyage only, no LLM).
//
// Consumes scratch/wf-a.json (fenced threads + reverse-gen queries) + the slice.
// Builds the four arms' retrieval units, embeds them (Voyage document) and the
// queries (Voyage query), retrieves top-k per arm, dereferences each arm's TOP
// hit, and writes one judge-input pair file per query. Also samples threads /
// segments for the coherence spot-check and tallies arm-D index-hallucination.
//
//   bun scripts/calibration/03-embed-and-retrieve.ts

import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { db, closeDb } from '../../shared/db.ts';
import { embedAll, topK, embedStats, type Unit } from './vectors.ts';
import { buildArmCSegments } from './arm-c-segments.ts';
import { ftsTopK } from './arm-a-fts.ts';
import { PHASE8_ANCHORS } from './phase8.ts';
import {
  CHANNELS, TOPK, SLICE_DB, SCRATCH, CHUNK_DIR, PAIR_DIR, COH_DIR,
} from './config.ts';

interface WfA {
  fenced: { chunkId: string; abstained: boolean; threads: { topic_label: string; member_indices: number[] }[] }[];
  queries: { sessionId: number; answerable: boolean; question?: string }[];
}
interface ChunkFile { channel: string; messages: { idx: number; id: string; author: string; content: string }[] }
interface RUnit extends Unit { text: string; size: number }

const chans = CHANNELS as unknown as string[];

function cleanDir(dir: string): void {
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) rmSync(join(dir, f));
}

async function main(): Promise<void> {
  const slice = new Database(SLICE_DB, { readonly: true });
  const wfa: WfA = JSON.parse(readFileSync(join(SCRATCH, 'wf-a.json'), 'utf8'));
  cleanDir(PAIR_DIR); cleanDir(COH_DIR);

  // --- Arm D: fenced threads -> units; tally index-hallucination per chunk ---
  const dUnits: RUnit[] = [];
  const dStats: { chunkId: string; channel: string; totalIdx: number; oobIdx: number }[] = [];
  for (const f of wfa.fenced) {
    if (f.abstained) continue;
    const chunk: ChunkFile = JSON.parse(readFileSync(join(CHUNK_DIR, `${f.chunkId}.json`), 'utf8'));
    const byIdx = new Map(chunk.messages.map((m) => [m.idx, m]));
    let total = 0, oob = 0;
    f.threads.forEach((t, ti) => {
      const valid = t.member_indices.filter((i) => { total++; const ok = byIdx.has(i); if (!ok) oob++; return ok; });
      if (valid.length === 0) return;
      const msgs = valid.map((i) => byIdx.get(i)!);
      dUnits.push({
        id: `d-${f.chunkId}-${ti}`, channel: chunk.channel, size: valid.length,
        text: msgs.map((m) => `${m.author}: ${m.content}`).join('\n'), vec: [],
      });
    });
    dStats.push({ chunkId: f.chunkId, channel: chunk.channel, totalIdx: total, oobIdx: oob });
  }

  // --- Arm B: in-window sessions ---
  const bRows = slice.query<{ session_id: number; channel: string; content: string }, []>(
    `SELECT session_id, channel, content FROM sess_search`,
  ).all();
  const bUnits: RUnit[] = bRows.map((r) => ({ id: String(r.session_id), channel: r.channel, size: r.content.length, text: r.content, vec: [] }));
  const sessChannel = new Map(bRows.map((r) => [r.session_id, r.channel]));

  // --- Arm C: cheap segments ---
  const cUnits: RUnit[] = buildArmCSegments(slice, chans).map((s) => ({ id: s.id, channel: s.channel, size: s.memberIds.length, text: s.text, vec: [] }));

  // --- Queries: reverse-gen (answerable) + Phase-8 anchors ---
  const queries: { qid: string; query: string; channel: string; kind: string }[] = [];
  for (const q of wfa.queries) {
    if (!q.answerable || !q.question) continue;
    queries.push({ qid: `rg-${q.sessionId}`, query: q.question, channel: sessChannel.get(q.sessionId) ?? 'unknown', kind: 'reverse-gen' });
  }
  for (const a of PHASE8_ANCHORS) queries.push({ qid: a.id, query: a.query, channel: 'anchor', kind: 'anchor' });

  // --- Embed (Voyage: documents for units, query for queries) ---
  console.log(`[03] embedding D=${dUnits.length} B=${bUnits.length} C=${cUnits.length} units + ${queries.length} queries`);
  const attach = (units: RUnit[], vecs: number[][]) => units.forEach((u, i) => { u.vec = vecs[i]!; });
  attach(dUnits, await embedAll(dUnits.map((u) => u.text), 'document'));
  attach(bUnits, await embedAll(bUnits.map((u) => u.text), 'document'));
  attach(cUnits, await embedAll(cUnits.map((u) => u.text), 'document'));
  const qVecs = await embedAll(queries.map((q) => q.query), 'query');

  const textOf = (units: RUnit[]) => new Map(units.map((u) => [u.id, u.text]));
  const dText = textOf(dUnits), bText = textOf(bUnits), cText = textOf(cUnits);

  // --- Retrieve top hit per arm; write judge-input pairs ---
  const hit = (units: RUnit[], tmap: Map<string, string>, qv: number[]) => {
    const top = topK(units, qv, TOPK)[0];
    return top ? { id: top.id, text: tmap.get(top.id)! } : { text: '[NO HIT]' };
  };
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]!; const qv = qVecs[i]!;
    const fts = await ftsTopK(q.query, TOPK);
    const A = fts[0] ? { id: fts[0].id, text: fts[0].text } : { text: '[NO HIT]' };
    Bun.write(join(PAIR_DIR, `${q.qid}.json`), JSON.stringify({
      qid: q.qid, query: q.query, channel: q.channel, kind: q.kind,
      hits: { A, B: hit(bUnits, bText, qv), C: hit(cUnits, cText, qv), D: hit(dUnits, dText, qv) },
    }, null, 2));
  }

  // --- Coherence sample: top-4-by-size per channel, each arm (threads + segments) ---
  const cohIds: string[] = [];
  const pickTop = (units: RUnit[], kind: 'thread' | 'segment') => {
    for (const ch of chans) {
      const top = units.filter((u) => u.channel === ch).sort((a, b) => b.size - a.size).slice(0, 4);
      for (const u of top) { Bun.write(join(COH_DIR, `${u.id}.json`), JSON.stringify({ id: u.id, kind, text: u.text })); cohIds.push(u.id); }
    }
  };
  pickTop(dUnits, 'thread');
  pickTop(cUnits, 'segment');

  // --- Outputs for Stage 4 + Stage 5 ---
  Bun.write(join(SCRATCH, 'wf-b-input.json'), JSON.stringify({
    pairDir: PAIR_DIR, queryIds: queries.map((q) => q.qid), cohDir: COH_DIR, cohIds,
  }, null, 2));
  Bun.write(join(SCRATCH, 'arm-d-stats.json'), JSON.stringify(dStats, null, 2));
  Bun.write(join(SCRATCH, 'units-summary.json'), JSON.stringify({
    arms: { A: 'fts', B: bUnits.length, C: cUnits.length, D: dUnits.length },
    queries: { total: queries.length, reverseGen: queries.filter((q) => q.kind === 'reverse-gen').length, anchors: queries.filter((q) => q.kind === 'anchor').length },
    embed: embedStats,
  }, null, 2));

  console.log(`[03] wrote ${queries.length} pair files, ${cohIds.length} coherence files`);
  console.log(`[03] embed: ${embedStats.apiTokens} Voyage tokens, ${embedStats.apiCalls} api calls, ${embedStats.cacheHits} cache hits`);
  console.log(`[03] arm-D threads=${dUnits.length}, total member_indices=${dStats.reduce((a, s) => a + s.totalIdx, 0)}, OOB=${dStats.reduce((a, s) => a + s.oobIdx, 0)}`);
  slice.close();
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
