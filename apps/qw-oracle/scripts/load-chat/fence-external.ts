// apps/qw-oracle/scripts/load-chat/fence-external.ts
//
// External-provider batch fencer -- the "contract worker" path for Phase C
// style backfill fencing (2026-08-05 spike; parking doc
// docs/superpowers/parking/2026-08-05-contract-worker-llm-spike-prompt.md).
// Drives a cheap OpenAI-format chat-completions API (DeepSeek by default)
// instead of Claude Code Workflow subagents. No Claude Code involved.
//
// Two subcommands:
//
//   fence <channel> <year> [--no-resolution] [--conc N] [--model M] [--out P]
//       Reads the SAME per-chunk files wf-backfill-fence.js reads (prep them
//       first: `bun scripts/load-chat/backfill-batch.ts prep <channel> <year>`),
//       fences each chunk via the provider API, writes fence-output JSON in the
//       exact envelope shape the loader consumes ({fenced:[...]}). Never
//       touches the DB.
//
//   diff <channel> <year> <candidatePath> [--out P]
//       Scores a candidate fence output against the GOLDEN fencing already
//       loaded in the DB (fence-sonnet-v2 threads for that channel/year,
//       READ-ONLY SELECTs). Reports thread-boundary agreement (Rand index on
//       message pairs), exact-thread match rate, resolution-label agreement on
//       Jaccard-matched threads, and the lowest-agreement chunks for spot-reads.
//
// PROMPT DISCIPLINE: the base fence prompt + the withResolution passenger are
// BYTE-IDENTICAL to wf-backfill-fence.js (calibration-anchored -- do not edit
// one without the other). The external model has no Read tool, so the chunk
// content is inlined AFTER the base prompt; the instruction text itself is
// untouched.
//
// RATE DISCIPLINE: ports the runGently recipe from wf-backfill-fence.js --
// paced waves of CONC, one recovery+retry pass for stragglers, HONEST
// success/fail counts (a failed/invalid response is a counted null, never a
// silent swallow). Schema-invalid responses count as retryable failures.
//
// KEY HANDLING: reads DEEPSEEK_API_KEY from the environment, falling back to
// ~/.secrets/llm-contract-worker.env (KEY=VALUE lines, chmod 600). The key is
// never printed.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Shared shapes (mirror backfill-batch.ts / fence-stats.ts)
// ---------------------------------------------------------------------------

interface ManifestFile {
  chunkIds: string[];
  chunkDir: string;
  channel: string;
  year: number;
}

interface ChunkFile {
  id: string;
  channel: string;
  forced: boolean;
  messages: { idx: number; id: string; author: string; content: string }[];
}

interface FencedThread {
  topic_label: string;
  member_indices: number[];
  resolution_status?: 'solved' | 'unresolved' | 'informational';
}

interface FencedChunk {
  chunkId: string;
  abstained: boolean;
  threads: FencedThread[];
}

function batchDir(channel: string, year: number): string {
  const slug = channel.replace(/^#/, '');
  return join(import.meta.dir, '../calibration/scratch/backfill', `${slug}-${year}`);
}

async function readManifest(channel: string, year: number): Promise<ManifestFile> {
  const p = join(batchDir(channel, year), 'manifest.json');
  if (!existsSync(p)) {
    throw new Error(`missing manifest ${p} -- run backfill-batch.ts prep first`);
  }
  return JSON.parse(await Bun.file(p).text());
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash'; // sonnet-tier mapping; fencing is a grouping task
const CONC_DEFAULT = 10;                   // parity with wf-backfill-fence.js CONC
const WAVE_PAUSE_MS = 500;
const RETRY_RECOVER_MS = 8000;
const CALL_TIMEOUT_MS = 300_000;
const MAX_OUTPUT_TOKENS = 8192;            // fence output is small; headroom for 1500-msg chunks

function loadApiKey(): string {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  const secretsPath = join(homedir(), '.secrets', 'llm-contract-worker.env');
  if (existsSync(secretsPath)) {
    for (const line of readFileSync(secretsPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*DEEPSEEK_API_KEY\s*=\s*(\S+)\s*$/);
      if (m?.[1]) return m[1];
    }
  }
  throw new Error(
    `DEEPSEEK_API_KEY not set and not found in ${secretsPath} -- create the file (chmod 600) with DEEPSEEK_API_KEY=...`,
  );
}

// ---------------------------------------------------------------------------
// Prompt -- base string + passenger BYTE-IDENTICAL to wf-backfill-fence.js
// ---------------------------------------------------------------------------

function buildPrompt(chunkDir: string, cid: string, chunkJson: string, withResolution: boolean): string {
  const resAsk = withResolution
    ? ' Additionally, classify each thread resolution_status as one of "solved" (a question in THIS thread got a working answer here), "unresolved" (a question was asked but no working answer appears here), or "informational" (no question -- discussion, banter, or announcement). Judge ONLY from the messages in this thread; never infer from outside knowledge. resolution_status is optional -- omit it when genuinely unclear.'
    : '';
  const base =
    `Read the JSON file ${chunkDir}/${cid}.json -- an object {id, channel, messages:[{idx,author,content}]} whose messages interleave several simultaneous conversations. ` +
    `Group them into topic-coherent threads: a question plus the answers and follow-ups it triggers, and co-referent banter, belong together. ` +
    `Return for each thread a one-line topic_label and member_indices (the idx values). Every idx should appear in exactly one thread; pure noise may be its own throwaway thread. ` +
    `Do NOT output any idx not present in the file. If the window is incomprehensible, set abstained=true with threads=[]. Do not assume QuakeWorld domain knowledge -- only group what co-refers in the text.` +
    resAsk;
  // Transport adapter: no Read tool here, so the file content rides inline.
  return (
    base +
    `\n\nYou do not have file access; the full content of ${chunkDir}/${cid}.json is inlined below. ` +
    `Respond with ONLY the JSON object {abstained, threads:[{topic_label, member_indices${withResolution ? ', resolution_status?' : ''}}]} -- no prose, no markdown fences.\n\n` +
    chunkJson
  );
}

// ---------------------------------------------------------------------------
// Response validation -- FENCE_SCHEMA semantics (strict, parity with the
// Workflow schema: additionalProperties false, required fields, enum).
// ---------------------------------------------------------------------------

function validateFence(obj: unknown, withResolution: boolean): string | null {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return 'not an object';
  const o = obj as Record<string, unknown>;
  const allowedTop = new Set(['abstained', 'threads']);
  for (const k of Object.keys(o)) if (!allowedTop.has(k)) return `unexpected top-level key ${k}`;
  if (typeof o.abstained !== 'boolean') return 'abstained missing or not boolean';
  if (!Array.isArray(o.threads)) return 'threads missing or not array';
  const allowedThread = new Set(
    withResolution ? ['topic_label', 'member_indices', 'resolution_status'] : ['topic_label', 'member_indices'],
  );
  const resEnum = new Set(['solved', 'unresolved', 'informational']);
  for (const [i, t] of (o.threads as unknown[]).entries()) {
    if (typeof t !== 'object' || t === null || Array.isArray(t)) return `threads[${i}] not an object`;
    const th = t as Record<string, unknown>;
    for (const k of Object.keys(th)) if (!allowedThread.has(k)) return `threads[${i}] unexpected key ${k}`;
    if (typeof th.topic_label !== 'string' || th.topic_label.length === 0) return `threads[${i}].topic_label invalid`;
    if (!Array.isArray(th.member_indices) || !(th.member_indices as unknown[]).every((n) => Number.isInteger(n))) {
      return `threads[${i}].member_indices invalid`;
    }
    if ('resolution_status' in th && !resEnum.has(th.resolution_status as string)) {
      return `threads[${i}].resolution_status not in enum`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Provider call
// ---------------------------------------------------------------------------

interface UsageTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
}

interface CallResult {
  fenced: FencedChunk;
  usage: { prompt: number; completion: number; cacheHit: number; cacheMiss: number };
}

async function fenceOneChunk(
  apiKey: string,
  baseUrl: string,
  model: string,
  manifest: ManifestFile,
  cid: string,
  withResolution: boolean,
): Promise<CallResult> {
  const chunkJson = await Bun.file(join(manifest.chunkDir, `${cid}.json`)).text();
  const prompt = buildPrompt(manifest.chunkDir, cid, chunkJson, withResolution);

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: false,
    }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const body = (await resp.text()).slice(0, 300);
    throw new Error(`HTTP ${resp.status}: ${body}`);
  }
  const data = (await resp.json()) as {
    choices: { message: { content: string }; finish_reason: string }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      prompt_cache_hit_tokens?: number;
      prompt_cache_miss_tokens?: number;
    };
  };
  const choice = data.choices?.[0];
  if (!choice) throw new Error('no choices in response');
  if (choice.finish_reason === 'length') throw new Error('truncated at max_tokens');

  // Lenient transport parse (strip accidental markdown fences), strict schema after.
  let text = choice.message.content.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch?.[1]) text = fenceMatch[1];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('response is not valid JSON');
  }
  const err = validateFence(parsed, withResolution);
  if (err) throw new Error(`schema violation: ${err}`);

  const u = data.usage ?? {};
  return {
    fenced: { chunkId: cid, ...(parsed as { abstained: boolean; threads: FencedThread[] }) },
    usage: {
      prompt: u.prompt_tokens ?? 0,
      completion: u.completion_tokens ?? 0,
      cacheHit: u.prompt_cache_hit_tokens ?? 0,
      cacheMiss: u.prompt_cache_miss_tokens ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// runGently port -- paced waves + one recovery/retry pass, honest counts.
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waves<T, R>(items: T[], conc: number, run: (item: T) => Promise<R>): Promise<(R | null)[]> {
  const out: (R | null)[] = [];
  for (let i = 0; i < items.length; i += conc) {
    const slice = items.slice(i, i + conc);
    out.push(...(await Promise.all(slice.map((it) => run(it).catch((e: Error) => {
      console.error(`  [fail] ${String(it)}: ${e.message}`);
      return null;
    })))));
    if (i + conc < items.length) await sleep(WAVE_PAUSE_MS);
  }
  return out;
}

async function runGently<T, R>(
  items: T[],
  conc: number,
  run: (item: T) => Promise<R>,
  tag: string,
): Promise<(R | null)[]> {
  const res = await waves(items, conc, run);
  const failedIdx = res.map((r, i) => (r == null ? i : -1)).filter((i) => i >= 0);
  if (failedIdx.length) {
    console.error(`${tag}: ${failedIdx.length}/${items.length} failed pass 1 -- recovering ${RETRY_RECOVER_MS}ms then retrying`);
    await sleep(RETRY_RECOVER_MS);
    const retry = await waves(failedIdx.map((i) => items[i]!), conc, run);
    failedIdx.forEach((origI, k) => {
      res[origI] = retry[k] ?? null;
    });
  }
  return res;
}

// ---------------------------------------------------------------------------
// Subcommand: fence
// ---------------------------------------------------------------------------

async function cmdFence(channel: string, year: number, opts: Map<string, string>): Promise<void> {
  const withResolution = !opts.has('no-resolution'); // production default: passenger rides
  const conc = opts.has('conc') ? parseInt(opts.get('conc')!, 10) : CONC_DEFAULT;
  const model = opts.get('model') ?? process.env.FENCE_EXTERNAL_MODEL ?? DEFAULT_MODEL;
  const baseUrl = process.env.FENCE_EXTERNAL_BASE_URL ?? DEFAULT_BASE_URL;
  const apiKey = loadApiKey();
  const manifest = await readManifest(channel, year);
  const outPath = opts.get('out') ?? join(batchDir(channel, year), `fence-external-${model.replace(/[^a-z0-9-]/gi, '_')}.json`);

  console.log(`[fence-external] channel=${channel} year=${year} model=${model} conc=${conc} withResolution=${withResolution} chunks=${manifest.chunkIds.length}`);
  const t0 = Date.now();

  const results = await runGently(
    manifest.chunkIds,
    conc,
    (cid) => fenceOneChunk(apiKey, baseUrl, model, manifest, cid, withResolution),
    'fence',
  );

  const ok = results.filter((r): r is CallResult => r != null);
  const totals: UsageTotals = { calls: ok.length, promptTokens: 0, completionTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0 };
  for (const r of ok) {
    totals.promptTokens += r.usage.prompt;
    totals.completionTokens += r.usage.completion;
    totals.cacheHitTokens += r.usage.cacheHit;
    totals.cacheMissTokens += r.usage.cacheMiss;
  }
  const failures = { fence: manifest.chunkIds.length - ok.length };
  const wallMin = (Date.now() - t0) / 60000;

  const envelope = {
    fenced: ok.map((r) => r.fenced),
    withResolution,
    failures,
    meta: {
      provider: baseUrl,
      model,
      conc,
      wallMinutes: Number(wallMin.toFixed(2)),
      usage: totals,
      generatedAt: new Date().toISOString(),
    },
  };
  await Bun.write(outPath, JSON.stringify(envelope, null, 2));

  console.log(`[fence-external] DONE: fence ${ok.length}/${manifest.chunkIds.length}, failures=${JSON.stringify(failures)}, wall=${wallMin.toFixed(1)}min`);
  console.log(`  tokens: prompt=${totals.promptTokens} (cacheHit=${totals.cacheHitTokens}) completion=${totals.completionTokens}`);
  console.log(`  output: ${outPath}`);
  if (failures.fence > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Subcommand: diff -- candidate vs golden (DB, READ-ONLY)
// ---------------------------------------------------------------------------

interface GoldenRow {
  thread_key: string;
  topic_label: string;
  resolution_status: string | null;
  message_id: string;
}

async function cmdDiff(channel: string, year: number, candidatePath: string, opts: Map<string, string>): Promise<void> {
  const { db, closeDb } = await import('../../shared/db.ts');
  try {
    const manifest = await readManifest(channel, year);

    // Candidate: accept the {fenced:[...]} envelope or a bare array.
    const rawCand = JSON.parse(await Bun.file(candidatePath).text());
    const candChunks: FencedChunk[] = Array.isArray(rawCand) ? rawCand : rawCand.fenced;

    // Golden: fence-sonnet-v2 threads + members for this (channel, year). READ-ONLY.
    const rows = await db<GoldenRow[]>`
      SELECT ct.thread_key, ct.topic_label, ct.resolution_status, tm.message_id
      FROM chat_threads ct
      JOIN thread_messages tm ON tm.thread_id = ct.id
      WHERE ct.channel_name = ${channel}
        AND ct.reconstruction_version = 'fence-sonnet-v2'
        AND ct.date_range_start >= ${year + '-01-01T00:00:00Z'}
        AND ct.date_range_start < ${(year + 1) + '-01-01T00:00:00Z'}
    `;

    // Per-chunk message_id -> idx maps from the chunk files.
    const idToIdx = new Map<string, Map<string, number>>();
    for (const cid of manifest.chunkIds) {
      const chunk: ChunkFile = JSON.parse(await Bun.file(join(manifest.chunkDir, `${cid}.json`)).text());
      idToIdx.set(cid, new Map(chunk.messages.map((m) => [m.id, m.idx])));
    }

    // Golden partition per chunk: thread_key = <channel>:<version>:<chunkId>:<n>
    interface GThread { label: string; res: string | null; idx: Set<number> }
    const golden = new Map<string, Map<string, GThread>>();
    for (const r of rows) {
      const parts = r.thread_key.split(':');
      const cid = parts[parts.length - 2]!;
      const idx = idToIdx.get(cid)?.get(r.message_id);
      if (idx === undefined) continue; // straddle-adjacent or unmapped -- skip
      let chunkMap = golden.get(cid);
      if (!chunkMap) { chunkMap = new Map(); golden.set(cid, chunkMap); }
      let th = chunkMap.get(r.thread_key);
      if (!th) { th = { label: r.topic_label, res: r.resolution_status, idx: new Set() }; chunkMap.set(r.thread_key, th); }
      th.idx.add(idx);
    }

    // Score per chunk.
    let pairAgree = 0, pairTotal = 0;
    let exactMatches = 0, candThreadTotal = 0, goldThreadTotal = 0;
    let resMatched = 0, resAgree = 0;
    const resConfusion: Record<string, number> = {};
    const perChunk: { chunkId: string; rand: number; commonMsgs: number; candThreads: number; goldThreads: number }[] = [];
    const spotReads: Record<string, unknown>[] = [];

    for (const cand of candChunks) {
      if (cand.abstained) continue;
      const gold = golden.get(cand.chunkId);
      if (!gold) continue;

      const candAssign = new Map<number, number>();
      cand.threads.forEach((t, ti) => { for (const i of t.member_indices) if (!candAssign.has(i)) candAssign.set(i, ti); });
      const goldAssign = new Map<number, number>();
      [...gold.values()].forEach((t, ti) => { for (const i of t.idx) if (!goldAssign.has(i)) goldAssign.set(i, ti); });

      const common = [...candAssign.keys()].filter((i) => goldAssign.has(i));
      let a = 0, total = 0;
      for (let x = 0; x < common.length; x++) {
        for (let y = x + 1; y < common.length; y++) {
          const sameC = candAssign.get(common[x]!) === candAssign.get(common[y]!);
          const sameG = goldAssign.get(common[x]!) === goldAssign.get(common[y]!);
          if (sameC === sameG) a++;
          total++;
        }
      }
      pairAgree += a; pairTotal += total;
      const rand = total > 0 ? a / total : 1;
      perChunk.push({ chunkId: cand.chunkId, rand: Number(rand.toFixed(4)), commonMsgs: common.length, candThreads: cand.threads.length, goldThreads: gold.size });

      // Exact-set matches + Jaccard-matched resolution agreement.
      candThreadTotal += cand.threads.length;
      goldThreadTotal += gold.size;
      const goldArr = [...gold.values()];
      for (const t of cand.threads) {
        const cset = new Set(t.member_indices);
        let best: GThread | null = null; let bestJ = 0;
        for (const g of goldArr) {
          let inter = 0;
          for (const i of cset) if (g.idx.has(i)) inter++;
          const j = inter / (cset.size + g.idx.size - inter);
          if (j > bestJ) { bestJ = j; best = g; }
        }
        if (bestJ === 1) exactMatches++;
        if (best && bestJ >= 0.5 && t.resolution_status && best.res) {
          resMatched++;
          if (t.resolution_status === best.res) resAgree++;
          const key = `${best.res}->${t.resolution_status}`;
          resConfusion[key] = (resConfusion[key] ?? 0) + 1;
        }
      }
    }

    perChunk.sort((x, y) => x.rand - y.rand);
    for (const pc of perChunk.slice(0, 10)) {
      const cand = candChunks.find((c) => c.chunkId === pc.chunkId)!;
      const gold = golden.get(pc.chunkId)!;
      spotReads.push({
        chunkId: pc.chunkId,
        rand: pc.rand,
        candidate: cand.threads.map((t) => ({ label: t.topic_label, n: t.member_indices.length, res: t.resolution_status ?? null })),
        golden: [...gold.values()].map((g) => ({ label: g.label, n: g.idx.size, res: g.res })),
      });
    }

    const report = {
      candidate: candidatePath,
      goldenThreads: goldThreadTotal,
      candidateThreads: candThreadTotal,
      pairwiseBoundaryAgreementPct: pairTotal > 0 ? Number(((pairAgree / pairTotal) * 100).toFixed(3)) : null,
      exactThreadMatchPct: candThreadTotal > 0 ? Number(((exactMatches / candThreadTotal) * 100).toFixed(2)) : null,
      resolutionLabel: {
        matchedPairs: resMatched,
        agreementPct: resMatched > 0 ? Number(((resAgree / resMatched) * 100).toFixed(2)) : null,
        confusion: resConfusion,
      },
      lowestAgreementChunks: perChunk.slice(0, 10),
    };
    console.log(JSON.stringify(report, null, 2));

    const outPath = opts.get('out') ?? join(batchDir(channel, year), 'fence-external-diff.json');
    await Bun.write(outPath, JSON.stringify({ ...report, spotReads }, null, 2));
    console.error(`[fence-external diff] full report (incl. spot-reads): ${outPath}`);
  } finally {
    await closeDb();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function parseOpts(rest: string[]): { pos: string[]; opts: Map<string, string> } {
  const pos: string[] = [];
  const opts = new Map<string, string>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--') && key !== 'no-resolution') {
        opts.set(key, next); i++;
      } else {
        opts.set(key, 'true');
      }
    } else {
      pos.push(a);
    }
  }
  return { pos, opts };
}

if (import.meta.main) {
  const [, , subcmd, ...rest] = process.argv;
  const { pos, opts } = parseOpts(rest);

  if (subcmd === 'fence' && pos.length === 2) {
    await cmdFence(pos[0]!, parseInt(pos[1]!, 10), opts);
  } else if (subcmd === 'diff' && pos.length === 3) {
    await cmdDiff(pos[0]!, parseInt(pos[1]!, 10), pos[2]!, opts);
  } else {
    console.error('Usage: fence-external.ts <fence|diff> ...');
    console.error('  fence <channel> <year> [--no-resolution] [--conc N] [--model M] [--out P]');
    console.error('  diff  <channel> <year> <candidatePath> [--out P]');
    process.exit(1);
  }
}
