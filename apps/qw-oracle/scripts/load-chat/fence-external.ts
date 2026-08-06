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

// Chunk ids are POSITIONAL (`<slug>-<year>-<NNN>`), so a re-prep after the
// corpus grows reuses the same id for a different message set. Identity must
// therefore come from content, not from the id.
// PER-CHUNK identity: md5 over the chunk's exact message-id list. A prior
// fencing is reusable iff its chunk hashes to the same value today.
//
// This makes the monthly harvest INCREMENTAL. `lullChunks` is a pure left-fold
// -- each cut depends only on messages seen so far -- so appending newer
// messages cannot move earlier boundaries; only the trailing chunk can grow or
// split. Measured on the 2026-08-06 catch-up: #helpdesk-2026 went 61 -> 106
// chunks with ALL 61 originals byte-identical. Re-fencing a whole year to
// absorb a month of new chat is therefore mostly wasted spend.
//
// Hashing per chunk rather than trusting the prefix keeps this correct even
// when growth is NOT append-only (a gap-fill import of older messages WOULD
// move earlier boundaries) -- those chunks simply fail their hash and re-fence.
async function chunkFingerprints(manifest: ManifestFile): Promise<Record<string, string>> {
  const { createHash } = await import('node:crypto');
  const out: Record<string, string> = {};
  for (const cid of manifest.chunkIds) {
    const c: ChunkFile = JSON.parse(await Bun.file(join(manifest.chunkDir, `${cid}.json`)).text());
    out[cid] = createHash('md5').update(c.messages.map((m) => m.id).join(',')).digest('hex');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash'; // sonnet-tier mapping; fencing is a grouping task
const FALLBACK_MODEL = 'deepseek-v4-pro';  // spike finding 2026-08-05: flash's reasoning diverges
                                           // on 1500-msg cap-forced chunks (empty content at
                                           // finish=stop under json mode, ceiling-death without;
                                           // reasoning_effort:low does not bound it) -- pro closed
                                           // the same chunk first-shot. Escalate stragglers.
const CONC_DEFAULT = 10;                   // parity with wf-backfill-fence.js CONC
const WAVE_PAUSE_MS = 500;
const RETRY_RECOVER_MS = 8000;

// #quakeworld-2017 post-mortem (2026-08-05): the batch failed 34/72. Failure
// tracked chunk SIZE, not the `forced` flag -- every natural chunk >=730 msgs
// failed, every one <=490 msgs passed. Two independent ceilings were biting:
//
//   1. MAX_OUTPUT_TOKENS 32768 was below what these chunks actually need.
//      Measured on real failing chunks at a 64K cap: pro spent 41,985
//      completion tokens on a 1500-msg chunk and flash spent 44,954 on a
//      564-msg one -- both ABOVE the old cap, so they died at finish=length.
//   2. CALL_TIMEOUT_MS 300_000 was below the generation time for the same
//      chunks (~91% of completion is reasoning, which is slow to emit).
//
// The spike calibrated on #helpdesk (88 msgs/chunk avg) where neither ceiling
// was reachable, so it read the single hard chunk as "forced chunks are risky"
// and keyed the pro routing on `forced`. `forced` was a proxy for `big`.
// Both ceilings are sized from MEASURED worst cases on real #quakeworld-2017
// chunks (2026-08-05), each with >60% headroom -- the previous values were set
// where #helpdesk could never reach them, which is why they read as generous
// and were not:
//   1500-msg chunk on pro: 498s, 33,788 completion tokens
//   1465-msg chunk on pro: 698s, 48,824 completion tokens  <- worst observed
// Same-size chunks vary ~1.4x in both axes, so headroom is the point, not fit.
const CALL_TIMEOUT_MS = 1_800_000;         // 30 min; worst observed 931s = 52% of ceiling
const MAX_OUTPUT_TOKENS = 262144;          // Raised from 131072 when a #quakeworld-2020 chunk
                                           // spent 79,294 completion tokens (61% of that cap) --
                                           // 1.6x the previous worst, and same-size chunks vary
                                           // ~1.5x, so the tail was close. Costs nothing to
                                           // raise: billing is on tokens actually generated, and
                                           // 262144 is accepted by both models. finish_reason
                                           // === 'length' still guards the truncation case.
const BIG_CHUNK_MSGS = 500;                // >= this many messages routes to the stronger model
                                           // FIRST. Pro is ~2.4x more token-efficient than flash
                                           // on the same chunk (18,261 vs 44,954 on a 564-msg
                                           // chunk), which makes it both faster and far less
                                           // likely to hit a ceiling -- for only ~26% more cost
                                           // per chunk. Small chunks stay on cheap flash.

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

export function validateFence(obj: unknown, withResolution: boolean): string | null {
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
  reasoningTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
}

interface CallResult {
  fenced: FencedChunk;
  usage: { prompt: number; completion: number; reasoning: number; cacheHit: number; cacheMiss: number };
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
      completion_tokens_details?: { reasoning_tokens?: number };
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
      reasoning: u.completion_tokens_details?.reasoning_tokens ?? 0,
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

  const fallbackModel = opts.has('no-fallback') ? '' : (opts.get('fallback-model') ?? FALLBACK_MODEL);

  // BIG chunks route to the stronger model FIRST. Keyed on message count, not
  // on the `forced` flag: the 2017 post-mortem showed large NATURAL chunks fail
  // exactly like cap-forced ones (see BIG_CHUNK_MSGS). #helpdesk never exposed
  // this because its chunks average 88 msgs; #quakeworld's run to 1,465.
  const bigRouted: string[] = [];
  if (fallbackModel && fallbackModel !== model) {
    for (const cid of manifest.chunkIds) {
      const chunk: ChunkFile = JSON.parse(await Bun.file(join(manifest.chunkDir, `${cid}.json`)).text());
      if (chunk.forced || chunk.messages.length >= BIG_CHUNK_MSGS) bigRouted.push(cid);
    }
  }

  // --resume: keep chunks already fenced in a previous run of this batch and
  // re-fence only what is missing. A partially-failed batch is expensive to
  // redo wholesale (the 2017 failure left 38 good chunks on the floor), and
  // re-fencing a chunk that already succeeded also perturbs it for no reason.
  const fingerprints = await chunkFingerprints(manifest);
  const prior = new Map<string, FencedChunk>();
  if (opts.has('resume') && (await Bun.file(outPath).exists())) {
    const raw = JSON.parse(await Bun.file(outPath).text());
    const priorFps: Record<string, string> | undefined = Array.isArray(raw) ? undefined : raw?.meta?.chunkFingerprints;
    if (!priorFps) {
      console.error(
        `[fence-external] --resume: ${outPath} predates per-chunk fingerprints -- reusing NOTHING.\n` +
        `  Chunk ids are positional, so reuse without verification could splice fencing whose\n` +
        `  member_indices address different messages, which no downstream gate can detect.`,
      );
    } else {
      let stale = 0;
      for (const fc of (Array.isArray(raw) ? raw : raw.fenced) as FencedChunk[]) {
        if (priorFps[fc.chunkId] && priorFps[fc.chunkId] === fingerprints[fc.chunkId]) prior.set(fc.chunkId, fc);
        else stale++;
      }
      console.log(`[fence-external] --resume: ${prior.size} chunk(s) reused (content-verified)${stale ? `, ${stale} re-fenced (chunk changed)` : ''}`);
    }
  }
  const todo = manifest.chunkIds.filter((cid) => !prior.has(cid));

  console.log(`[fence-external] channel=${channel} year=${year} model=${model} fallback=${fallbackModel || 'none'} conc=${conc} withResolution=${withResolution} chunks=${manifest.chunkIds.length} toFence=${todo.length} bigRouted=${bigRouted.filter((c) => todo.includes(c)).length}`);
  const t0 = Date.now();

  const results = await runGently(
    todo,
    conc,
    (cid) => fenceOneChunk(apiKey, baseUrl, bigRouted.includes(cid) ? fallbackModel : model, manifest, cid, withResolution),
    'fence',
  );

  // Escalation pass: chunks the primary model failed twice go once to the
  // stronger fallback model. Runs in PACED WAVES, not serially -- the original
  // serial loop assumed "stragglers are rare by construction", which held for
  // the spike's 1-in-61 but not for 2017's 34-in-72, where it accounted for
  // roughly 170 of the run's 232 minutes. Provider allows 500 concurrent on pro.
  const escalated: string[] = [];
  if (fallbackModel && fallbackModel !== model) {
    const stragglers = todo.filter((_, i) => results[i] == null);
    if (stragglers.length) {
      console.error(`fence: escalating ${stragglers.length} chunk(s) to ${fallbackModel} at conc=${conc}`);
      const retried = await waves(stragglers, conc, (cid) =>
        fenceOneChunk(apiKey, baseUrl, fallbackModel, manifest, cid, withResolution),
      );
      stragglers.forEach((cid, k) => {
        if (retried[k] == null) return;
        results[todo.indexOf(cid)] = retried[k]!;
        escalated.push(cid);
      });
    }
  }

  const ok = results.filter((r): r is CallResult => r != null);
  const totals: UsageTotals = { calls: ok.length, promptTokens: 0, completionTokens: 0, reasoningTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0 };
  for (const r of ok) {
    totals.promptTokens += r.usage.prompt;
    totals.completionTokens += r.usage.completion;
    totals.reasoningTokens += r.usage.reasoning;
    totals.cacheHitTokens += r.usage.cacheHit;
    totals.cacheMissTokens += r.usage.cacheMiss;
  }
  // Emit in manifest order, carrying over any --resume survivors. `missing` is
  // the load-blocking signal: fence-stats only measures chunks PRESENT in the
  // output, so an absent chunk costs no coverage percentage and would sail
  // through the quality gate while silently dropping its whole message range.
  const fencedById = new Map<string, FencedChunk>(prior);
  for (const r of ok) fencedById.set(r.fenced.chunkId, r.fenced);
  const fenced = manifest.chunkIds.filter((cid) => fencedById.has(cid)).map((cid) => fencedById.get(cid)!);
  const missing = manifest.chunkIds.filter((cid) => !fencedById.has(cid));
  const failures = { fence: missing.length };
  const wallMin = (Date.now() - t0) / 60000;

  const envelope = {
    fenced,
    withResolution,
    failures,
    missing,
    meta: {
      provider: baseUrl,
      model,
      fallbackModel: fallbackModel || null,
      chunkFingerprints: fingerprints,
      bigRouted,
      bigChunkThreshold: BIG_CHUNK_MSGS,
      escalated,
      resumedFrom: prior.size,
      conc,
      wallMinutes: Number(wallMin.toFixed(2)),
      usage: totals,
      generatedAt: new Date().toISOString(),
    },
  };
  await Bun.write(outPath, JSON.stringify(envelope, null, 2));

  console.log(`[fence-external] DONE: fence ${fenced.length}/${manifest.chunkIds.length} (this run ${ok.length}/${todo.length}), failures=${JSON.stringify(failures)}, wall=${wallMin.toFixed(1)}min`);
  console.log(`  tokens: prompt=${totals.promptTokens} (cacheHit=${totals.cacheHitTokens}) completion=${totals.completionTokens}`);
  console.log(`  output: ${outPath}`);
  if (missing.length) {
    console.error(`  INCOMPLETE -- ${missing.length} chunk(s) missing, DO NOT LOAD: ${missing.join(' ')}`);
    console.error(`  re-run with --resume to fence only the gaps`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Subcommand: refence -- second realization for low-coverage chunks.
//
// Coverage (messages the fencer actually placed into some thread / messages in
// the chunk) varies run-to-run on big chunks: two probes of the SAME 1500-msg
// chunk yielded 132 and 40 threads. Messages left out of every thread are not
// lost from `messages`, but they are unreachable by thread retrieval, which is
// the whole point of the backfill.
//
// So: re-fence the weak chunks and KEEP WHICHEVER REALIZATION COVERS MORE. This
// is the ledger's helpdesk-041 splice (session 1) as a repeatable pass. Never
// keeps a worse realization, so it is safe to re-run.
// ---------------------------------------------------------------------------

// A chunk fence is supposed to be a PARTITION. Coverage counts DISTINCT indices
// placed, so it cannot see a fence that reaches high coverage by putting the
// same messages in many overlapping threads -- #antilag-2021-002 emitted 3,127
// placements for 1,497 messages (109% duplication, 19 mutually-overlapping
// threads) and still scored 99.8% coverage / 0% hallucination, sailing through
// both gates. `dupRatio` is that blind spot made visible.
const DUP_RATIO_MAX = 1.05; // a few genuinely-bridging messages are the documented R8 case;
                            // whole-chunk overlap is not.

async function chunkCoverage(manifest: ManifestFile, fc: FencedChunk): Promise<{ covered: number; n: number; pct: number; oob: number; dup: number; dupRatio: number }> {
  const chunk: ChunkFile = JSON.parse(await Bun.file(join(manifest.chunkDir, `${fc.chunkId}.json`)).text());
  const valid = new Set(chunk.messages.map((m) => m.idx));
  const covered = new Set<number>();
  let oob = 0, emitted = 0;
  for (const t of fc.threads) for (const i of t.member_indices) { emitted++; valid.has(i) ? covered.add(i) : oob++; }
  const n = chunk.messages.length;
  const distinct = covered.size + oob;
  return {
    covered: covered.size, n, pct: n > 0 ? (covered.size / n) * 100 : 100, oob,
    dup: emitted - distinct,
    dupRatio: distinct > 0 ? emitted / distinct : 1,
  };
}

// Which realization is better? OOB FIRST, then coverage.
//
// index-hallucination is the HARD gate (must be 0); coverage is the soft one
// (~99% band). Comparing on coverage alone inverts that: #quakeworld-2021 kept
// a 92.9%-coverage realization carrying 2 OOB indices over an 84.7% one, and
// the batch then failed the hard gate at 0.008%. Trading the hard gate for
// 8 points of the soft one is never right.
// Order: OOB (hard gate) -> partition sanity -> coverage. A realization that is
// a clean partition at 97% beats one that hits 100% by duplicating the chunk.
function betterRealization(
  cand: { pct: number; oob: number; dupRatio: number },
  cur: { pct: number; oob: number; dupRatio: number },
): boolean {
  if (cand.oob !== cur.oob) return cand.oob < cur.oob;
  const candDirty = cand.dupRatio > DUP_RATIO_MAX;
  const curDirty = cur.dupRatio > DUP_RATIO_MAX;
  if (candDirty !== curDirty) return curDirty;      // clean partition wins outright
  if (candDirty && curDirty) return cand.dupRatio < cur.dupRatio; // both dirty: less overlap
  return cand.pct > cur.pct;
}

async function cmdRefence(channel: string, year: number, opts: Map<string, string>): Promise<void> {
  const withResolution = !opts.has('no-resolution');
  const below = opts.has('below') ? parseFloat(opts.get('below')!) : 97;
  const conc = opts.has('conc') ? parseInt(opts.get('conc')!, 10) : CONC_DEFAULT;
  const model = opts.get('model') ?? process.env.FENCE_EXTERNAL_MODEL ?? DEFAULT_MODEL;
  const baseUrl = process.env.FENCE_EXTERNAL_BASE_URL ?? DEFAULT_BASE_URL;
  const fallbackModel = opts.has('no-fallback') ? '' : (opts.get('fallback-model') ?? FALLBACK_MODEL);
  const apiKey = loadApiKey();
  const manifest = await readManifest(channel, year);
  const outPath = opts.get('out') ?? join(batchDir(channel, year), `fence-external-${model.replace(/[^a-z0-9-]/gi, '_')}.json`);

  const envelope = JSON.parse(await Bun.file(outPath).text());
  const byId = new Map<string, FencedChunk>((envelope.fenced as FencedChunk[]).map((f) => [f.chunkId, f]));

  // Select on EITHER signal: coverage below the floor, OR any OOB index at all.
  // An OOB chunk can sit well above the coverage floor and still fail the hard
  // gate on its own (2021's -013 was at 98%+ with 1 OOB), so coverage-only
  // selection cannot see it.
  const weak: { cid: string; pct: number; covered: number; n: number; oob: number; dup: number; dupRatio: number }[] = [];
  for (const fc of byId.values()) {
    if (fc.abstained) continue;
    const c = await chunkCoverage(manifest, fc);
    if (c.pct < below || c.oob > 0 || c.dupRatio > DUP_RATIO_MAX) weak.push({ cid: fc.chunkId, ...c });
  }
  weak.sort((a, b) => (b.oob - a.oob) || (b.dupRatio - a.dupRatio) || (a.pct - b.pct));
  if (!weak.length) { console.log(`[refence] no chunks below ${below}% coverage, none with OOB, none over-duplicated -- nothing to do`); return; }

  console.log(`[refence] ${weak.length} chunk(s) below ${below}% / OOB / duplicated: ${weak.map((w) => `${w.cid}@${w.pct.toFixed(1)}%${w.oob ? `/OOB${w.oob}` : ''}${w.dupRatio > DUP_RATIO_MAX ? `/DUP${w.dup}` : ''}`).join(' ')}`);

  const results = await runGently(
    weak.map((w) => w.cid),
    conc,
    async (cid) => {
      const chunk: ChunkFile = JSON.parse(await Bun.file(join(manifest.chunkDir, `${cid}.json`)).text());
      const useModel = fallbackModel && (chunk.forced || chunk.messages.length >= BIG_CHUNK_MSGS) ? fallbackModel : model;
      return fenceOneChunk(apiKey, baseUrl, useModel, manifest, cid, withResolution);
    },
    'refence',
  );

  const fmt = (x: { pct: number; oob: number; dup: number; dupRatio: number }) =>
    `${x.pct.toFixed(1)}%${x.oob ? `/OOB${x.oob}` : ''}${x.dupRatio > DUP_RATIO_MAX ? `/DUP${x.dup}` : ''}`;
  let improved = 0;
  for (const [k, w] of weak.entries()) {
    const r = results[k];
    if (r == null) { console.log(`  ${w.cid}: re-fence failed, keeping original ${fmt(w)}`); continue; }
    const c = await chunkCoverage(manifest, r.fenced);
    if (betterRealization(c, w)) {
      byId.set(w.cid, r.fenced);
      improved++;
      const why = c.oob < w.oob ? `OOB ${w.oob}->${c.oob}`
        : (w.dupRatio > DUP_RATIO_MAX && c.dupRatio <= DUP_RATIO_MAX) ? `DUP ${w.dup}->${c.dup}`
        : `+${c.covered - w.covered} msgs`;
      console.log(`  ${w.cid}: ${fmt(w)} -> ${fmt(c)} SPLICED (${why})`);
    } else {
      console.log(`  ${w.cid}: ${fmt(w)} vs re-fence ${fmt(c)} -- keeping original`);
    }
  }

  envelope.fenced = manifest.chunkIds.filter((cid) => byId.has(cid)).map((cid) => byId.get(cid)!);
  envelope.meta.refencePasses = (envelope.meta.refencePasses ?? 0) + 1;
  envelope.meta.refenceImproved = (envelope.meta.refenceImproved ?? 0) + improved;
  await Bun.write(outPath, JSON.stringify(envelope, null, 2));
  console.log(`[refence] ${improved}/${weak.length} improved and spliced -> ${outPath}`);
}

// ---------------------------------------------------------------------------
// Subcommand: probe -- worst-case pre-flight.
//
// Fences only the LARGEST chunks of a prepped batch and reports per-chunk
// latency / tokens / validity. Runs the production call path (same prompt,
// same routing rule, same validator), so a config that clears probe clears
// the batch for the same reasons.
//
// WHY THIS EXISTS: #quakeworld-2017 burned 232 minutes to discover a ceiling
// that the single largest chunk exposes in ~8. Failure tracks chunk size, so
// the extreme finds it by construction where a random or calendar-sliced
// sample only finds it by luck. Run this before every batch, and as the
// iteration unit when tuning limits -- a tuning round is then ~20 min and
// cents, not hours.
// ---------------------------------------------------------------------------

async function cmdProbe(channel: string, year: number, opts: Map<string, string>): Promise<void> {
  const withResolution = !opts.has('no-resolution');
  const top = opts.has('top') ? parseInt(opts.get('top')!, 10) : 3;
  const model = opts.get('model') ?? process.env.FENCE_EXTERNAL_MODEL ?? DEFAULT_MODEL;
  const baseUrl = process.env.FENCE_EXTERNAL_BASE_URL ?? DEFAULT_BASE_URL;
  const fallbackModel = opts.has('no-fallback') ? '' : (opts.get('fallback-model') ?? FALLBACK_MODEL);
  const apiKey = loadApiKey();
  const manifest = await readManifest(channel, year);

  const sized: { cid: string; msgs: number; forced: boolean }[] = [];
  for (const cid of manifest.chunkIds) {
    const c: ChunkFile = JSON.parse(await Bun.file(join(manifest.chunkDir, `${cid}.json`)).text());
    sized.push({ cid, msgs: c.messages.length, forced: c.forced });
  }
  sized.sort((a, b) => b.msgs - a.msgs);
  const picks = sized.slice(0, top);

  console.log(`[probe] ${channel} ${year} -- ${top} largest of ${sized.length} chunks (max ${picks[0]?.msgs} msgs), timeout=${CALL_TIMEOUT_MS / 1000}s maxTokens=${MAX_OUTPUT_TOKENS} bigThreshold=${BIG_CHUNK_MSGS}`);

  // ONE RETRY per chunk, matching what the production fence path tolerates
  // (runGently gives 2 attempts + an escalation pass). ~1 in 30 responses is a
  // transient schema/JSON miss; without a retry the probe is STRICTER than the
  // pipeline it gates, and would spuriously halt roughly 1 batch in 10.
  // A chunk that fails TWICE is a real signal.
  const results = await Promise.all(picks.map(async (p) => {
    const useModel = fallbackModel && (p.forced || p.msgs >= BIG_CHUNK_MSGS) ? fallbackModel : model;
    const t0 = Date.now();
    let lastErr = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const r = await fenceOneChunk(apiKey, baseUrl, useModel, manifest, p.cid, withResolution);
        const secs = (Date.now() - t0) / 1000;
        const note = attempt > 1 ? ` (attempt ${attempt}, first: ${lastErr})` : '';
        console.log(`  PASS ${p.cid} n=${p.msgs}${p.forced ? ' forced' : ''} ${useModel}: ${secs.toFixed(0)}s completion=${r.usage.completion} reasoning=${r.usage.reasoning} threads=${r.fenced.threads.length}${note}`);
        return { ok: true, secs, completion: r.usage.completion, retried: attempt > 1 };
      } catch (e) {
        lastErr = (e as Error).message;
        if (attempt === 1) console.error(`  retry ${p.cid}: ${lastErr}`);
      }
    }
    const secs = (Date.now() - t0) / 1000;
    console.error(`  FAIL ${p.cid} n=${p.msgs}${p.forced ? ' forced' : ''} ${useModel}: ${secs.toFixed(0)}s, 2 attempts -- ${lastErr}`);
    return { ok: false, secs, completion: 0, retried: true };
  }));

  const passed = results.filter((r) => r.ok);
  const worstSecs = Math.max(...results.map((r) => r.secs));
  const worstTok = Math.max(...results.map((r) => r.completion));
  console.log(`[probe] ${passed.length}/${results.length} passed. worst latency=${worstSecs.toFixed(0)}s (timeout ${CALL_TIMEOUT_MS / 1000}s) worst completion=${worstTok} (cap ${MAX_OUTPUT_TOKENS})`);
  // Headroom matters as much as pass/fail: a chunk that passes at 95% of a
  // ceiling will fail the next one that is slightly denser.
  if (passed.length === results.length) {
    const latPct = ((worstSecs * 1000) / CALL_TIMEOUT_MS) * 100;
    const tokPct = (worstTok / MAX_OUTPUT_TOKENS) * 100;
    console.log(`[probe] headroom: latency ${latPct.toFixed(0)}% of timeout, tokens ${tokPct.toFixed(0)}% of cap`);
    if (latPct > 60 || tokPct > 60) console.error('[probe] WARNING: under 40% headroom -- raise the ceiling before the batch');
  } else {
    process.exitCode = 1;
  }
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
  } else if (subcmd === 'probe' && pos.length === 2) {
    await cmdProbe(pos[0]!, parseInt(pos[1]!, 10), opts);
  } else if (subcmd === 'refence' && pos.length === 2) {
    await cmdRefence(pos[0]!, parseInt(pos[1]!, 10), opts);
  } else if (subcmd === 'diff' && pos.length === 3) {
    await cmdDiff(pos[0]!, parseInt(pos[1]!, 10), pos[2]!, opts);
  } else {
    console.error('Usage: fence-external.ts <fence|probe|refence|diff> ...');
    console.error('  fence   <channel> <year> [--no-resolution] [--conc N] [--model M] [--out P] [--resume]');
    console.error('  probe   <channel> <year> [--top N]     -- worst-case pre-flight, run before fence');
    console.error('  refence <channel> <year> [--below PCT] -- retry low-coverage chunks, keep the better');
    console.error('  diff    <channel> <year> <candidatePath> [--out P]');
    process.exit(1);
  }
}
