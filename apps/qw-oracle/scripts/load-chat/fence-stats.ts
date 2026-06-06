// apps/qw-oracle/scripts/load-chat/fence-stats.ts
//
// Deterministic quality check for a fence pass (zero LLM/Voyage). Computes, from
// a fence-output JSON + its chunk files, the two hard fence-quality signals the
// calibration probe used (03-embed-and-retrieve.ts dStats):
//
//   index-hallucination = member_indices the fencer emitted that are NOT in the
//                         chunk (out of [1..N]) / total emitted indices.  Probe baseline: 0%.
//   coverage            = distinct valid indices grouped into a thread / chunk size.
//
// Plus the resolution_status distribution (D7 passenger) when present. Used for
// the Phase C batch-1 kill-switch (R6/D7) and every batch's sanity check.
//
//   bun scripts/load-chat/fence-stats.ts <channel> <year> <fenceOutputPath>
//
// Reads the chunk dir from the batch manifest, so it pairs with `backfill-batch prep`.

import { join } from 'node:path';

interface FencedThread {
  topic_label: string;
  member_indices: number[];
  resolution_status?: 'solved' | 'unresolved' | 'informational';
}
interface FencedChunk { chunkId: string; abstained: boolean; threads: FencedThread[] }
interface FenceOutput { fenced: FencedChunk[] }
interface ChunkFile { id: string; messages: { idx: number }[] }
interface Manifest { chunkDir: string }

function batchDir(channel: string, year: number): string {
  const slug = channel.replace(/^#/, '');
  return join(import.meta.dir, '../calibration/scratch/backfill', `${slug}-${year}`);
}

async function main(): Promise<void> {
  const [, , channel, yearStr, fenceOutputPath] = process.argv;
  if (!channel || !yearStr || !fenceOutputPath) {
    console.error('Usage: fence-stats.ts <channel> <year> <fenceOutputPath>');
    process.exit(1);
  }
  const year = parseInt(yearStr, 10);
  const manifest: Manifest = JSON.parse(await Bun.file(join(batchDir(channel, year), 'manifest.json')).text());

  const raw = JSON.parse(await Bun.file(fenceOutputPath).text());
  const fenced: FencedChunk[] = Array.isArray(raw) ? raw : (raw as FenceOutput).fenced;

  let chunks = 0, abstained = 0, threads = 0;
  let totalIdx = 0, oobIdx = 0;
  let chunkMsgTotal = 0, coveredTotal = 0;
  const res: Record<string, number> = { solved: 0, unresolved: 0, informational: 0, none: 0 };
  const worstChunks: { chunkId: string; oob: number; coverage: number }[] = [];

  for (const fc of fenced) {
    chunks++;
    if (fc.abstained) { abstained++; continue; }
    const chunk: ChunkFile = JSON.parse(await Bun.file(join(manifest.chunkDir, `${fc.chunkId}.json`)).text());
    const validIdx = new Set(chunk.messages.map((m) => m.idx));
    const n = chunk.messages.length;
    chunkMsgTotal += n;

    const covered = new Set<number>();
    let chunkOob = 0, chunkTotal = 0;
    for (const t of fc.threads) {
      threads++;
      if (t.resolution_status) res[t.resolution_status]!++; else res.none!++;
      for (const i of t.member_indices) {
        chunkTotal++; totalIdx++;
        if (validIdx.has(i)) covered.add(i);
        else { oobIdx++; chunkOob++; }
      }
    }
    coveredTotal += covered.size;
    worstChunks.push({ chunkId: fc.chunkId, oob: chunkOob, coverage: n > 0 ? covered.size / n : 1 });
  }

  const hallucPct = totalIdx > 0 ? (oobIdx / totalIdx) * 100 : 0;
  const coveragePct = chunkMsgTotal > 0 ? (coveredTotal / chunkMsgTotal) * 100 : 0;
  worstChunks.sort((a, b) => a.coverage - b.coverage);

  console.log(JSON.stringify({
    fenceOutput: fenceOutputPath,
    chunks, abstained, threads,
    totalIdx, oobIdx,
    indexHallucinationPct: Number(hallucPct.toFixed(3)),
    coveragePct: Number(coveragePct.toFixed(2)),
    resolutionDistribution: res,
    lowestCoverageChunks: worstChunks.slice(0, 3),
  }, null, 2));
}

if (import.meta.main) main();
