// apps/qw-oracle/scripts/load-chat/fence-bench.ts
//
// Model bake-off for chat fencing (sidequest, 2026-10-01). Scores any
// OpenAI-format model -- DeepSeek direct, or anything hosted on OpenRouter --
// against a trusted Claude reference on a frozen 30-chunk set, so "is model X
// good enough, and what does it cost" becomes a scorecard instead of a guess.
//
// Why a Claude reference and not the DB: the DB's threads are DeepSeek's own
// output (Phase C backfill, 2026-08), so scoring against them rewards models
// that split like DeepSeek. The reference is Claude Opus 5.5, one agent per
// chunk briefed by `brief`. A second Claude model on a six-chunk subset gives
// the NOISE FLOOR: how far two trusted splitters disagree. Chat splitting has
// more than one right answer, so a candidate near that floor is as good as the
// reference, and differences smaller than the floor's gap are not signal.
//
// Subcommands:
//   select [--force]        freeze the bench set (or restore its chunk copies)
//   brief <label> <cid>     print the Claude reference agent's prompt for one chunk
//   check <label> <cid>     validate one agent-written result
//   run --provider P --model M [--big-model B] [--bands b1,b2] [--label L] [--conc N]
//       [--timeout S] [--max-tokens N] [--extra JSON] [--max-cost USD]
//                           fence the whole set with one model; resumable.
//                           --big-model sends chunks of BIG_CHUNK_MSGS+ to B, which
//                           is how production DeepSeek runs (flash, pro for big ones)
//   score [--ref L] [--baseline L]
//                           scorecard for every run against the reference
//
// Everything bulky lives in gitignored scratch (calibration/scratch/fence-bench);
// only the set definition (chunk ids + fingerprints, no chat text) is committed.

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BIG_CHUNK_MSGS,
  fenceOneChunk,
  fencePromptBase,
  loadApiKey,
  resolveModel,
  resolveProvider,
  validateFence,
  type CallResult,
  type Provider,
} from './fence-external.ts';

const APP_DIR = join(import.meta.dir, '../..');
const SET_PATH = join(import.meta.dir, 'fence-bench-set.json');
const BACKFILL = join(import.meta.dir, '../calibration/scratch/backfill');
const BENCH = join(import.meta.dir, '../calibration/scratch/fence-bench');
const CHUNKS = join(BENCH, 'chunks');          // byte-identical copies: what API models read
const PRETTY = join(BENCH, 'chunks-pretty');   // one message per line: what Claude agents Read
const RUNS = join(BENCH, 'runs');

// ---------------------------------------------------------------------------
// The set
// ---------------------------------------------------------------------------

// #helpdesk has only its 2026 batch prepped in scratch; the other two channels
// take 2025 + 2026 so every size band has candidates.
const POOLS: Record<string, number[]> = {
  '#helpdesk': [2026],
  '#quakeworld': [2025, 2026],
  '#dev-corner': [2025, 2026],
};

// Weighted toward big chunks on purpose: the 2026-08 Sonnet-vs-DeepSeek
// comparison agreed ~93% on average but the disagreement lived in a few hard
// chunks, so a random draw (median 35 msgs) would mostly measure easy ones.
// Chunks under 10 messages carry no grouping decision worth scoring.
const BANDS = [
  { name: 'small', lo: 10, hi: 49, quota: 2 },
  { name: 'medium', lo: 50, hi: 199, quota: 3 },
  { name: 'large', lo: 200, hi: 499, quota: 3 },
  { name: 'xl', lo: 500, hi: Infinity, quota: 2 },
] as const;

interface ChunkFile {
  id: string;
  channel: string;
  forced: boolean;
  messages: { idx: number; id: string; author: string; content: string }[];
}

interface SetEntry {
  chunkId: string;
  channel: string;
  year: number;
  band: string;
  msgs: number;
  fingerprint: string;
  noiseFloor: boolean;
}

interface BenchSet {
  createdAt: string;
  note: string;
  chunks: SetEntry[];
}

interface Thread { topic_label: string; member_indices: number[]; resolution_status?: string }

interface RunChunk {
  chunkId: string;
  failed?: boolean;
  abstained?: boolean;
  threads?: Thread[];
  meta?: Record<string, unknown>;
}

const md5 = (s: string) => createHash('md5').update(s).digest('hex');
const fingerprint = (c: ChunkFile) => md5(c.messages.map((m) => m.id).join(','));
const slug = (ch: string) => ch.replace(/^#/, '');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8'));

function loadSet(): BenchSet {
  if (!existsSync(SET_PATH)) throw new Error(`no bench set at ${SET_PATH} -- run \`select\` first`);
  const set = readJson<BenchSet>(SET_PATH);
  const missing = set.chunks.filter((e) => !existsSync(join(CHUNKS, `${e.chunkId}.json`)));
  if (missing.length) throw new Error(`${missing.length} bench chunk copies missing from ${CHUNKS} -- run \`select\` to restore them`);
  return set;
}

function readChunk(cid: string): ChunkFile {
  return readJson<ChunkFile>(join(CHUNKS, `${cid}.json`));
}

// Same object, one message per line, so the Read tool never meets a 200KB line.
function prettyChunk(c: ChunkFile): string {
  return (
    `{"id":${JSON.stringify(c.id)},"channel":${JSON.stringify(c.channel)},"forced":${c.forced},"messages":[\n` +
    c.messages.map((m) => JSON.stringify(m)).join(',\n') +
    `\n]}\n`
  );
}

function writeCopies(entry: SetEntry, sourcePath: string): void {
  copyFileSync(sourcePath, join(CHUNKS, `${entry.chunkId}.json`));
  writeFileSync(join(PRETTY, `${entry.chunkId}.json`), prettyChunk(readJson<ChunkFile>(sourcePath)));
}

function sourcePath(e: { chunkId: string; channel: string; year: number }): string {
  return join(BACKFILL, `${slug(e.channel)}-${e.year}`, 'chunks', `${e.chunkId}.json`);
}

function cmdSelect(opts: Map<string, string>): void {
  mkdirSync(CHUNKS, { recursive: true });
  mkdirSync(PRETTY, { recursive: true });

  // Restore mode: the set is frozen, only the scratch copies are gone. Copy back
  // from the batch dirs, refusing any chunk whose content no longer matches.
  if (existsSync(SET_PATH) && !opts.has('force')) {
    const set = readJson<BenchSet>(SET_PATH);
    let restored = 0;
    for (const e of set.chunks) {
      if (existsSync(join(CHUNKS, `${e.chunkId}.json`))) continue;
      const src = sourcePath(e);
      if (!existsSync(src) || fingerprint(readJson<ChunkFile>(src)) !== e.fingerprint) {
        throw new Error(`${e.chunkId}: source missing or changed since the set was frozen -- the set cannot be restored from scratch`);
      }
      writeCopies(e, src);
      restored++;
    }
    console.log(`[select] set already frozen (${set.chunks.length} chunks); restored ${restored} missing copies. Use --force to re-select.`);
    return;
  }

  const chunks: SetEntry[] = [];
  for (const [channel, years] of Object.entries(POOLS)) {
    const pool: (SetEntry & { src: string })[] = [];
    for (const year of years) {
      const dir = join(BACKFILL, `${slug(channel)}-${year}`, 'chunks');
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        const src = join(dir, f);
        const c = readJson<ChunkFile>(src);
        const band = BANDS.find((b) => c.messages.length >= b.lo && c.messages.length <= b.hi);
        if (!band) continue;
        pool.push({ chunkId: c.id, channel, year, band: band.name, msgs: c.messages.length, fingerprint: fingerprint(c), noiseFloor: false, src });
      }
    }
    // Deterministic pick: hash order within each band.
    pool.sort((a, b) => md5(a.chunkId).localeCompare(md5(b.chunkId)));
    for (const band of BANDS) {
      const picks = pool.filter((p) => p.band === band.name).slice(0, band.quota);
      if (picks.length < band.quota) console.warn(`[select] ${channel} ${band.name}: only ${picks.length}/${band.quota} available`);
      for (const p of picks) {
        const { src, ...entry } = p;
        writeCopies(entry, src);
        chunks.push(entry);
      }
    }
    // Noise floor: per channel, the first medium and the first xl pick -- one
    // ordinary chunk and one hard one.
    for (const band of ['medium', 'xl']) {
      const e = chunks.find((c) => c.channel === channel && c.band === band);
      if (e) e.noiseFloor = true;
    }
  }

  const set: BenchSet = {
    createdAt: new Date().toISOString(),
    note: 'Frozen fence bake-off set. Chunk content lives in gitignored scratch (calibration/scratch/fence-bench); fingerprints = md5 of the message-id list.',
    chunks,
  };
  writeFileSync(SET_PATH, JSON.stringify(set, null, 2) + '\n');
  const byBand = BANDS.map((b) => `${b.name} ${chunks.filter((c) => c.band === b.name).length}`).join(', ');
  console.log(`[select] froze ${chunks.length} chunks (${byBand}; ${chunks.reduce((s, c) => s + c.msgs, 0)} msgs; noise floor ${chunks.filter((c) => c.noiseFloor).length}) -> ${SET_PATH}`);
}

// ---------------------------------------------------------------------------
// Claude reference agents: brief + check
// ---------------------------------------------------------------------------

function cmdBrief(label: string, cid: string): void {
  loadSet();
  const out = join(RUNS, label, `${cid}.json`);
  console.log(
    fencePromptBase(PRETTY, cid, true) +
    `\n\nThis chunk is part of a model bake-off; your split is the reference other models are scored against, so take care that every idx lands in exactly one thread.` +
    ` When done, use the Write tool to write ONLY the JSON object {"abstained": <bool>, "threads": [{"topic_label": <string>, "member_indices": [<idx>...], "resolution_status": <optional>}]} to:\n  ${out}\n` +
    `Then run, from ${APP_DIR}:\n  bun scripts/load-chat/fence-bench.ts check ${label} ${cid}\n` +
    `If it prints FAIL, fix the file and run the check again. Read no other file and write no other file. Reply with only the final check line.`,
  );
}

interface Coverage { n: number; covered: number; pct: number; oob: number; dup: number; dupRatio: number }

function coverage(chunk: ChunkFile, threads: Thread[]): Coverage {
  const valid = new Set(chunk.messages.map((m) => m.idx));
  const covered = new Set<number>();
  let oob = 0, emitted = 0;
  for (const t of threads) for (const i of t.member_indices) { emitted++; valid.has(i) ? covered.add(i) : oob++; }
  const n = chunk.messages.length;
  const distinct = covered.size + oob;
  return { n, covered: covered.size, pct: n ? (covered.size / n) * 100 : 100, oob, dup: emitted - distinct, dupRatio: distinct ? emitted / distinct : 1 };
}

function cmdCheck(label: string, cid: string): void {
  loadSet();
  const p = join(RUNS, label, `${cid}.json`);
  const fail = (why: string) => { console.log(`FAIL ${cid}: ${why}`); process.exit(1); };
  if (!existsSync(p)) fail(`no file at ${p}`);
  let obj: unknown;
  try { obj = readJson(p); } catch { fail('file is not valid JSON'); }
  const err = validateFence(obj, true);
  if (err) fail(`schema: ${err}`);
  const r = obj as { abstained: boolean; threads: Thread[] };
  const c = coverage(readChunk(cid), r.threads);
  // A reference must be a complete partition: the scorer treats it as truth.
  if (c.oob) fail(`${c.oob} idx not in the chunk`);
  if (c.dupRatio > 1.05) fail(`${c.dup} idx placed in more than one thread`);
  if (!r.abstained && c.pct < 98) fail(`coverage ${c.pct.toFixed(1)}% -- ${c.n - c.covered} idx in no thread`);
  console.log(`PASS ${cid}: threads=${r.threads.length} coverage=${c.pct.toFixed(1)}% oob=0 dup=${c.dup}`);
}

// ---------------------------------------------------------------------------
// run -- one model over the whole set
// ---------------------------------------------------------------------------

// USD per 1M tokens at PEAK, api-docs.deepseek.com/quick_start/pricing read
// 2026-10-01. Off-peak is half. DeepSeek reports no cost, so the bench prices
// its tokens itself; OpenRouter reports the real charge per call.
const DEEPSEEK_PEAK: Record<string, { hit: number; miss: number; out: number }> = {
  'deepseek-flash': { hit: 0.006, miss: 0.3, out: 1.2 },
  'deepseek-v4-flash': { hit: 0.006, miss: 0.3, out: 1.2 }, // retired alias, served as V4.1 Flash
  'deepseek-v4-pro': { hit: 0.044, miss: 1.32, out: 3.96 },
};

// Peak = 01-04 and 06-10 UTC, Mon-Fri (Chinese public holidays ignored).
function deepseekPeak(d: Date): boolean {
  const day = d.getUTCDay(), h = d.getUTCHours();
  return day >= 1 && day <= 5 && ((h >= 1 && h < 4) || (h >= 6 && h < 10));
}

function deepseekCost(model: string, u: CallResult['usage'], at: Date): number | null {
  const p = DEEPSEEK_PEAK[model];
  if (!p) return null;
  const peak = (p.hit * u.cacheHit + p.miss * u.cacheMiss + p.out * u.completion) / 1e6;
  return deepseekPeak(at) ? peak : peak / 2;
}

async function openrouterCredits(apiKey: string): Promise<number | null> {
  try {
    const r = await fetch('https://openrouter.ai/api/v1/credits', { headers: { authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(20_000) });
    const d = (await r.json()) as { data?: { total_usage?: number } };
    return d.data?.total_usage ?? null;
  } catch { return null; }
}

async function openrouterMaxTokens(model: string): Promise<number | null> {
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(30_000) });
    const d = (await r.json()) as { data: { id: string; top_provider?: { max_completion_tokens?: number | null } }[] };
    return d.data.find((m) => m.id === model)?.top_provider?.max_completion_tokens ?? null;
  } catch { return null; }
}

// One tiny call before spending anything: the 2026-10-01 DeepSeek outage held
// every request open for the full 30-minute timeout, so a dead provider must
// fail in seconds, not after an hour of retries.
async function preflight(p: Provider, apiKey: string, model: string): Promise<void> {
  const t0 = Date.now();
  try {
    const r = await fetch(`${p.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with the single word: ok' }], max_tokens: 2000 }),
      signal: AbortSignal.timeout(90_000),
    });
    const d = (await r.json()) as { choices?: unknown[]; error?: { message?: string } };
    if (!r.ok || !d.choices?.length) throw new Error(d.error?.message ?? `HTTP ${r.status}, no completion`);
  } catch (e) {
    throw new Error(`preflight: ${p.name}/${model} is not answering (${(e as Error).message}) -- not starting the run`);
  }
  console.log(`[run] preflight ok in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function cmdRun(opts: Map<string, string>): Promise<void> {
  const set = loadSet();
  const provider = resolveProvider(opts);
  const model = resolveModel(provider, opts);
  const apiKey = loadApiKey(provider);
  const label = opts.get('label') ?? `${provider.name}--${model.replace(/[^a-z0-9.-]/gi, '_')}`;
  const conc = opts.has('conc') ? parseInt(opts.get('conc')!, 10) : 5;
  const timeoutMs = (opts.has('timeout') ? parseInt(opts.get('timeout')!, 10) : 1800) * 1000;
  const bigModel = opts.get('big-model');
  // --bands narrows a run to some size bands, e.g. re-testing only the big chunks.
  const bands = opts.has('bands') ? new Set(opts.get('bands')!.split(',')) : null;
  const maxCost = opts.has('max-cost') ? parseFloat(opts.get('max-cost')!) : 1.5;
  const extraBody = opts.has('extra') ? JSON.parse(opts.get('extra')!) : undefined;
  let maxTokens = opts.has('max-tokens') ? parseInt(opts.get('max-tokens')!, 10) : undefined;
  if (maxTokens === undefined && provider.name === 'openrouter') {
    maxTokens = Math.min(262144, (await openrouterMaxTokens(model)) ?? 65536);
  }

  const dir = join(RUNS, label);
  mkdirSync(dir, { recursive: true });
  const done = (cid: string) => {
    const p = join(dir, `${cid}.json`);
    return existsSync(p) && !readJson<RunChunk>(p).failed;
  };

  await preflight(provider, apiKey, model);
  const creditsBefore = provider.name === 'openrouter' ? await openrouterCredits(apiKey) : null;
  console.log(`[run] ${label}: model=${model}${bigModel ? ` (${BIG_CHUNK_MSGS}+ msgs -> ${bigModel})` : ''} maxTokens=${maxTokens ?? 'default'} conc=${conc} timeout=${timeoutMs / 1000}s maxCost=$${maxCost} extra=${JSON.stringify(extraBody ?? {})}`);

  let spent = 0;
  let halted: string | null = null;
  const t0 = Date.now();
  for (const band of BANDS) {
    if (bands && !bands.has(band.name)) continue;
    const todo = set.chunks.filter((e) => e.band === band.name && !done(e.chunkId));
    let bandFails = 0;
    for (let i = 0; i < todo.length && !halted; i += conc) {
      if (spent >= maxCost) { halted = `cost cap $${maxCost} reached ($${spent.toFixed(4)})`; break; }
      await Promise.all(todo.slice(i, i + conc).map(async (e) => {
        const useModel = bigModel && e.msgs >= BIG_CHUNK_MSGS ? bigModel : model;
        const errors: string[] = [];
        for (let attempt = 1; attempt <= 2; attempt++) {
          const started = new Date();
          try {
            const r = await fenceOneChunk(provider, apiKey, useModel, CHUNKS, e.chunkId, true, { maxTokens, timeoutMs, extraBody });
            const secs = (Date.now() - started.getTime()) / 1000;
            const cost = r.costUsd ?? (provider.name === 'deepseek' ? deepseekCost(useModel, r.usage, started) : null);
            spent += cost ?? 0;
            const cov = coverage(readChunk(e.chunkId), r.fenced.threads);
            writeFileSync(join(dir, `${e.chunkId}.json`), JSON.stringify({
              chunkId: e.chunkId, abstained: r.fenced.abstained, threads: r.fenced.threads,
              meta: { model: useModel, provider: provider.name, servedBy: r.servedBy, secs, attempts: attempt, usage: r.usage, costUsd: cost, errors },
            }, null, 2));
            console.log(`  ok   ${e.chunkId} (${e.msgs} msgs, ${band.name}) ${secs.toFixed(0)}s $${(cost ?? 0).toFixed(4)} threads=${r.fenced.threads.length} cov=${cov.pct.toFixed(1)}% oob=${cov.oob}${r.servedBy ? ` via ${r.servedBy}` : ''}`);
            return;
          } catch (err) {
            errors.push((err as Error).message);
            console.log(`  ${attempt === 1 ? 'retry' : 'FAIL '} ${e.chunkId} (${e.msgs} msgs): ${(err as Error).message.slice(0, 160)}`);
          }
        }
        bandFails++;
        writeFileSync(join(dir, `${e.chunkId}.json`), JSON.stringify({ chunkId: e.chunkId, failed: true, meta: { model: useModel, provider: provider.name, errors } }, null, 2));
      }));
    }
    // Two chunks failing twice inside one band is a model that cannot do this
    // job at this size; stop before the bigger, dearer bands.
    if (!halted && bandFails >= 2) halted = `${bandFails} chunks failed twice in band ${band.name}`;
    if (halted) break;
  }

  const creditsAfter = provider.name === 'openrouter' ? await openrouterCredits(apiKey) : null;
  const run = {
    label, provider: provider.name, model, bigModel: bigModel ?? null, maxTokens: maxTokens ?? null, extra: extraBody ?? null, conc,
    finishedAt: new Date().toISOString(), wallMinutes: Number(((Date.now() - t0) / 60000).toFixed(1)),
    costReportedUsd: Number(spent.toFixed(6)),
    // Failed calls report no cost, so the account delta is the honest total
    // (it may lag a few minutes behind the run).
    creditsDeltaUsd: creditsBefore != null && creditsAfter != null ? Number((creditsAfter - creditsBefore).toFixed(6)) : null,
    halted,
  };
  writeFileSync(join(dir, '_run.json'), JSON.stringify(run, null, 2));
  console.log(`[run] ${label} ${halted ? `HALTED: ${halted}` : 'complete'} -- reported $${spent.toFixed(4)}${run.creditsDeltaUsd != null ? `, account delta $${run.creditsDeltaUsd}` : ''}, ${run.wallMinutes} min`);
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

// Co-membership over message pairs, from the contingency table (no O(n^2)
// pair loop -- an xl chunk has ~1.1M pairs). "Together" = same thread.
//   precision: of the pairs the candidate put together, share the reference also did
//   recall:    of the pairs the reference put together, share the candidate also did
// Low precision = lumps unrelated talk; low recall = splits conversations apart.
// Messages the candidate left out count as singletons, so missed coverage costs recall.
//
// Granularity caveat (measured 2026-10-01): two Claude splitters agreed 96% on precision
// but only 52% on recall -- Sonnet cut the same conversations finer than Opus. F1 therefore
// mixes 'grouped wrongly' with 'cut at a different grain', which is why the scorecard also
// prints precision, recall and the thread-count ratio separately.
function pairScores(ref: Thread[], cand: Thread[]): { p: number; r: number; f1: number; rand: number } {
  const refOf = new Map<number, number>();
  ref.forEach((t, ti) => t.member_indices.forEach((i) => { if (!refOf.has(i)) refOf.set(i, ti); }));
  const candOf = new Map<number, string>();
  cand.forEach((t, ti) => t.member_indices.forEach((i) => { if (refOf.has(i) && !candOf.has(i)) candOf.set(i, `t${ti}`); }));
  const cells = new Map<string, number>(), refSizes = new Map<number, number>(), candSizes = new Map<string, number>();
  for (const [i, rt] of refOf) {
    const ct = candOf.get(i) ?? `solo${i}`;
    cells.set(`${rt}|${ct}`, (cells.get(`${rt}|${ct}`) ?? 0) + 1);
    refSizes.set(rt, (refSizes.get(rt) ?? 0) + 1);
    candSizes.set(ct, (candSizes.get(ct) ?? 0) + 1);
  }
  const c2 = (k: number) => (k * (k - 1)) / 2;
  let tp = 0, refPairs = 0, candPairs = 0;
  for (const v of cells.values()) tp += c2(v);
  for (const v of refSizes.values()) refPairs += c2(v);
  for (const v of candSizes.values()) candPairs += c2(v);
  const p = candPairs ? tp / candPairs : 1;
  const r = refPairs ? tp / refPairs : 1;
  const f1 = p + r ? (2 * p * r) / (p + r) : 0;
  const all = c2(refOf.size);
  const rand = all ? (all - refPairs - candPairs + 2 * tp) / all : 1;
  return { p, r, f1, rand };
}

// Resolution-label agreement on threads the two splits share (Jaccard >= 0.5).
function labelAgreement(ref: Thread[], cand: Thread[]): { agree: number; total: number } {
  let agree = 0, total = 0;
  for (const t of cand) {
    if (!t.resolution_status) continue;
    const cs = new Set(t.member_indices);
    let best: Thread | null = null, bestJ = 0;
    for (const g of ref) {
      let inter = 0;
      for (const i of g.member_indices) if (cs.has(i)) inter++;
      const j = inter / (cs.size + g.member_indices.length - inter);
      if (j > bestJ) { bestJ = j; best = g; }
    }
    if (best?.resolution_status && bestJ >= 0.5) { total++; if (best.resolution_status === t.resolution_status) agree++; }
  }
  return { agree, total };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = (xs: number[]) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : NaN; };
const ci95 = (xs: number[]) => (xs.length > 1 ? 1.96 * sd(xs) / Math.sqrt(xs.length) : NaN);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)]! : NaN; };
const pct = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}` : '-');

function loadRun(label: string): Map<string, RunChunk> {
  const dir = join(RUNS, label);
  const out = new Map<string, RunChunk>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const r = readJson<RunChunk>(join(dir, f));
    out.set(r.chunkId ?? f.replace(/\.json$/, ''), r);
  }
  return out;
}

function cmdScore(opts: Map<string, string>): void {
  const set = loadSet();
  const refLabel = opts.get('ref') ?? 'ref-opus';
  const ref = loadRun(refLabel);
  const labels = readdirSync(RUNS).filter((l) => l !== refLabel && existsSync(join(RUNS, l)) && readdirSync(join(RUNS, l)).some((f) => f.endsWith('.json')));
  const baselineLabel = opts.get('baseline') ?? (labels.includes('deepseek--deepseek-flash') ? 'deepseek--deepseek-flash' : null);
  const refOk = set.chunks.filter((e) => ref.get(e.chunkId)?.threads);
  console.log(`[score] reference ${refLabel}: ${refOk.length}/${set.chunks.length} chunks; baseline ${baselineLabel ?? 'none'}`);

  type Row = { label: string; f1: Map<string, number>; [k: string]: unknown };
  const rows: Row[] = [];
  for (const label of labels) {
    const run = loadRun(label);
    const runMeta = existsSync(join(RUNS, label, '_run.json')) ? readJson<Record<string, unknown>>(join(RUNS, label, '_run.json')) : {};
    const f1 = new Map<string, number>(), ps: number[] = [], rs: number[] = [], covs: number[] = [];
    let ok = 0, failed = 0, oob = 0, dupBad = 0, la = 0, lt = 0, cost = 0, msgs = 0, candThreads = 0, refThreads = 0;
    const secs: number[] = [];
    const byChannel: Record<string, number[]> = {};
    for (const e of refOk) {
      const c = run.get(e.chunkId);
      if (!c) continue;
      msgs += e.msgs;
      cost += Number(c.meta?.costUsd ?? 0);
      if (c.failed || !c.threads) { failed++; continue; }
      ok++;
      if (typeof c.meta?.secs === 'number') secs.push(c.meta.secs);
      const cov = coverage(readChunk(e.chunkId), c.threads);
      covs.push(cov.pct); oob += cov.oob; if (cov.dupRatio > 1.05) dupBad++;
      candThreads += c.threads.length; refThreads += ref.get(e.chunkId)!.threads!.length;
      const s = pairScores(ref.get(e.chunkId)!.threads!, c.threads);
      f1.set(e.chunkId, s.f1); ps.push(s.p); rs.push(s.r);
      (byChannel[e.channel] ??= []).push(s.f1);
      const l = labelAgreement(ref.get(e.chunkId)!.threads!, c.threads); la += l.agree; lt += l.total;
    }
    const f1s = [...f1.values()];
    const nf = set.chunks.filter((e) => e.noiseFloor && f1.has(e.chunkId)).map((e) => f1.get(e.chunkId)!);
    rows.push({
      label, f1, ok, failed, attempted: ok + failed,
      f1Mean: mean(f1s), f1Ci: ci95(f1s), p: mean(ps), r: mean(rs), threadRatio: refThreads ? candThreads / refThreads : NaN, nfMean: mean(nf), nfN: nf.length,
      byChannel: Object.fromEntries(Object.entries(byChannel).map(([k, v]) => [k, mean(v)])),
      labelAgree: lt ? la / lt : NaN, covMean: mean(covs), covMin: Math.min(...covs), oob, dupBad,
      cost, costPer1k: msgs ? (cost / msgs) * 1000 : NaN, creditsDelta: runMeta.creditsDeltaUsd ?? null,
      medianSecs: median(secs), halted: runMeta.halted ?? null,
    });
  }

  // Paired difference against the baseline, over chunks both scored.
  const base = rows.find((r) => r.label === baselineLabel);
  for (const r of rows) {
    if (!base || r === base) continue;
    const d = [...r.f1.keys()].filter((k) => base.f1.has(k)).map((k) => r.f1.get(k)! - base.f1.get(k)!);
    r.vsBase = mean(d); r.vsBaseCi = ci95(d); r.vsBaseN = d.length;
  }
  rows.sort((a, b) => (b.f1Mean as number) - (a.f1Mean as number));

  const n = (x: unknown, f = 1) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(f) : '-');
  console.log(`\n| run | ok/tried | pair F1 (95% CI) | precision | recall | threads vs ref | F1 on noise-floor chunks | vs baseline (95% CI) | solved-label agree | coverage mean/min | OOB | cost of set | $ per 1k msgs | median s/chunk |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const r of rows) {
    const vs = r.vsBase !== undefined ? `${(r.vsBase as number) >= 0 ? '+' : ''}${pct(r.vsBase as number)} ±${pct(r.vsBaseCi as number)} (n=${r.vsBaseN})` : (r === base ? 'baseline' : '-');
    console.log(`| ${r.label}${r.halted ? ' (halted)' : ''} | ${r.ok}/${r.attempted} | ${pct(r.f1Mean as number)} ±${pct(r.f1Ci as number)} | ${pct(r.p as number)} | ${pct(r.r as number)} | ${n(r.threadRatio, 2)}x | ${pct(r.nfMean as number)} (n=${r.nfN}) | ${vs} | ${pct(r.labelAgree as number)} | ${n(r.covMean)}/${n(r.covMin)} | ${r.oob} | $${n(r.cost, 4)}${r.creditsDelta != null ? ` (acct $${n(r.creditsDelta, 4)})` : ''} | $${n(r.costPer1k, 4)} | ${n(r.medianSecs, 0)} |`);
  }
  const channels = Object.keys(POOLS);
  console.log(`\n| run | ${channels.join(' | ')} |\n|---|${channels.map(() => '---').join('|')}|`);
  for (const r of rows) console.log(`| ${r.label} | ${channels.map((c) => pct((r.byChannel as Record<string, number>)[c] ?? NaN)).join(' | ')} |`);

  writeFileSync(join(BENCH, 'scorecard.json'), JSON.stringify(rows.map(({ f1, ...rest }) => ({ ...rest, perChunkF1: Object.fromEntries(f1) })), null, 2));
  console.log(`\n[score] scorecard.json written to ${BENCH}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function parseOpts(rest: string[]): { pos: string[]; opts: Map<string, string> } {
  const pos: string[] = [], opts = new Map<string, string>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) { opts.set(a.slice(2), next); i++; } else opts.set(a.slice(2), 'true');
  }
  return { pos, opts };
}

if (import.meta.main) {
  const [, , sub, ...rest] = process.argv;
  const { pos, opts } = parseOpts(rest);
  if (sub === 'select') cmdSelect(opts);
  else if (sub === 'brief' && pos.length === 2) cmdBrief(pos[0]!, pos[1]!);
  else if (sub === 'check' && pos.length === 2) cmdCheck(pos[0]!, pos[1]!);
  else if (sub === 'run') await cmdRun(opts);
  else if (sub === 'score') cmdScore(opts);
  else {
    console.error('Usage: fence-bench.ts <select|brief|check|run|score> ...');
    console.error('  select [--force]                     freeze the set (or restore its scratch copies)');
    console.error('  brief <label> <chunkId>              Claude reference agent prompt for one chunk');
    console.error('  check <label> <chunkId>              validate an agent-written result');
    console.error('  run --provider P --model M [--big-model B] [--bands b1,b2] [--label L] [--conc N] [--timeout S] [--max-tokens N] [--extra JSON] [--max-cost USD]');
    console.error('  score [--ref L] [--baseline L]');
    process.exit(1);
  }
}
