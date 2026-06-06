// Phase B cap-sweep -- prep. (Re-scoped Phase B; see decisions.md D9 amendment 2026-06-06.)
//
// Gap is LOCKED at 12h. This sweeps the CAP up from the proven floor (750). It
// takes the single LARGEST 12h bite in the whole corpus (the worst case, ~22,673
// msgs) and chops it at each cap. EVERY emitted chunk is a cap-FORCED
// marathon-slice (the bite has no internal >12h gap), so the sample inherently
// stresses the one new failure mode the gap-raise introduces (forced
// mid-conversation cuts). 750 rides along as a same-harness control to anchor
// against the probe baseline (0% / 4.38).
//
// HARNESS CEILING (measured 2026-06-06): a Workflow fence agent's Read tool caps
// at 256KB/~25k tokens per file. At ~94 bytes/msg (content alone ~59 chars), a
// single-file chunk tops out near ~2,700 msgs; a 3000-msg file (~280KB) already
// truncates. So the swept caps are 750/1500/2500 -- the validly single-file-
// readable range, which is also near the agent-count floor at 12h (cap is nearly
// a non-dial there) and guarantees every production chunk is readable in one Read.
// Caps >2700 would need multi-file delivery in BOTH the test and Phase C; not
// pursued here (<10% agent savings -- see decisions.md D9 amendment).
//
// Chunk files match the proven fence prompt's described shape
// ({id, channel, messages:[{idx,author,content}]}); per-message Discord id is
// dropped (the fence test needs only idx/author/content; production Phase C keeps it).
//
//   bun scripts/calibration/sweep-prep.ts
import { db, closeDb } from '../../shared/db.ts';
import { join } from 'node:path';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';

const CHANS = ['#quakeworld', '#dev-corner', '#helpdesk', '#antilag'];
const GAP_MS = 12 * 3600 * 1000;                       // LOCKED 12h
const PLAN: Record<number, number> = { 750: 3, 1500: 4, 2500: 5 }; // cap -> #chunks to fence (2500 = decision-relevant top, most samples)
const MAX_READ_BYTES = 256 * 1024;                     // fence-agent Read tool hard cap; truncatable chunks must never ship
const SWEEP = join(import.meta.dir, 'scratch', 'sweep');
const CHUNK_DIR = join(SWEEP, 'chunks');

interface Msg { idx: number; author: string; content: string }

// split a time-ordered ms[] into 12h-lull bites; return index ranges
function biteRanges(ts: number[]): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  for (let i = 1; i < ts.length; i++) {
    if (ts[i]! - ts[i - 1]! > GAP_MS) { out.push([start, i]); start = i; }
  }
  if (ts.length) out.push([start, ts.length]);
  return out;
}

async function main(): Promise<void> {
  // Pass 1 (cheap, timestamps): find which channel-year holds the largest 12h bite.
  let best = { ch: '', yr: '', len: 0 };
  const tsByKey = new Map<string, number[]>();
  for (const ch of CHANS) {
    const rows = await db<{ created_at: Date; yr: string }[]>`
      SELECT m.created_at, to_char(date_trunc('year', m.created_at), 'YYYY') AS yr
      FROM messages m JOIN message_labels ml ON ml.message_id = m.id
      WHERE ml.category IN ('chat','link') AND m.channel_name = ${ch}
      ORDER BY m.created_at`;
    const byYr = new Map<string, number[]>();
    for (const r of rows) {
      const k = r.yr;
      if (!byYr.has(k)) byYr.set(k, []);
      byYr.get(k)!.push(new Date(r.created_at).getTime());
    }
    for (const [yr, ts] of byYr) {
      tsByKey.set(`${ch}|${yr}`, ts);
      const maxLen = Math.max(0, ...biteRanges(ts).map(([a, b]) => b - a));
      if (maxLen > best.len) best = { ch, yr, len: maxLen };
    }
  }
  console.log(`[sweep-prep] largest 12h bite: ${best.ch} ${best.yr} -> ${best.len} messages`);

  // Pass 2: pull that channel-year's full messages, re-derive bites, take the largest.
  const yr = best.yr;
  const full = await db<{ author_name: string; content: string; created_at: Date }[]>`
    SELECT m.author_name, m.content, m.created_at
    FROM messages m JOIN message_labels ml ON ml.message_id = m.id
    WHERE ml.category IN ('chat','link') AND m.channel_name = ${best.ch}
      AND m.created_at >= ${yr + '-01-01T00:00:00Z'} AND m.created_at < ${(Number(yr) + 1) + '-01-01T00:00:00Z'}
    ORDER BY m.created_at`;
  const ts = full.map((r) => new Date(r.created_at).getTime());
  const ranges = biteRanges(ts).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  const [a, b] = ranges[0]!;
  const bite = full.slice(a, b);
  const spanH = ((ts[b - 1]! - ts[a]!) / 3600000).toFixed(1);
  console.log(`[sweep-prep] using bite of ${bite.length} msgs spanning ${spanH}h (${new Date(ts[a]!).toISOString()} ..)`);

  // reset scratch/sweep/chunks
  mkdirSync(CHUNK_DIR, { recursive: true });
  for (const f of readdirSync(CHUNK_DIR)) if (f.endsWith('.json')) rmSync(join(CHUNK_DIR, f));

  const manifest: { chunkId: string; cap: number; n: number }[] = [];
  for (const cap of Object.keys(PLAN).map(Number)) {
    const want = PLAN[cap]!;
    for (let c = 0; c < want; c++) {
      const slice = bite.slice(c * cap, (c + 1) * cap);
      if (slice.length === 0) break;
      const id = `cap${cap}-${String(c + 1).padStart(3, '0')}`;
      const messages: Msg[] = slice.map((m, j) => ({ idx: j + 1, author: m.author_name, content: m.content }));
      const path = join(CHUNK_DIR, `${id}.json`);
      await Bun.write(path, JSON.stringify({ id, channel: best.ch, cap, forced: true, messages }));
      const bytes = statSync(path).size;
      if (bytes > MAX_READ_BYTES) {
        throw new Error(`${id} is ${(bytes / 1024).toFixed(0)}KB > 256KB Read cap -- a fence agent would read it truncated. Lower the cap.`);
      }
      manifest.push({ chunkId: id, cap, n: slice.length });
    }
  }

  Bun.write(join(SWEEP, 'sweep-input.json'), JSON.stringify({
    chunkIds: manifest.map((m) => m.chunkId),
    chunkDir: CHUNK_DIR,
    sessionIds: [], sessionDir: '',          // wf-a query-gen phase -> no-op
    manifest, source: { channel: best.ch, year: yr, biteLen: bite.length, spanHours: spanH },
  }, null, 2));

  console.log('[sweep-prep] chunks per cap (all forced marathon-slices):');
  for (const cap of Object.keys(PLAN).map(Number)) {
    const ids = manifest.filter((m) => m.cap === cap);
    console.log(`  cap ${String(cap).padStart(4)}: ${ids.length} chunks x ${cap} msgs = ${ids.length} fence agents`);
  }
  console.log(`[sweep-prep] total fence agents: ${manifest.length}`);
  console.log(`[sweep-prep] wrote ${join(SWEEP, 'sweep-input.json')}`);
}

if (import.meta.main) { try { await main(); } finally { await closeDb(); } }
