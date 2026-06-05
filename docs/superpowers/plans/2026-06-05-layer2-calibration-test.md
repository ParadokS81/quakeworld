# Layer 2 calibration test -- implementation plan (decision probe, workflow-based)

> **For agentic workers:** This is a THROWAWAY DECISION PROBE, not a production arc. Verification is **build + run + inspect output shape**, not TDD-per-function. Do not gold-plate.
>
> **No Anthropic API key.** The operator runs on a Claude Max subscription -- there is no `ANTHROPIC_API_KEY` and the SDK is NOT used. The three LLM-in-the-loop jobs (fence / reverse-gen queries / judge) are done by **Claude workflow-agents** via the `Workflow` tool. The deterministic spine (slice / Voyage embed / cosine / FTS / aggregate) runs as Bun scripts in the main session -- `VOYAGE_API_KEY` already exists, so embeddings work.

**Goal:** Measure whether LLM topic-fencing (arm D) beats cheap mechanical segmentation (arm C) or dumb 15-minute sessions (arm B) on retrieval quality for a real QuakeWorld Discord slice -- and report a clean verdict that scopes brainstorm Pass 3.

**Architecture (HYBRID):** Deterministic Bun scripts in the main session do all slicing, Voyage embedding, cosine/FTS retrieval, and aggregation. Two `Workflow` runs do the LLM fan-out in between -- Workflow A fences chunks into threads + reverse-generates queries; Workflow B judges retrieval pairs + scores coherence. The operator/driver reads each workflow result, runs the next deterministic script, then launches the next workflow -- staying in the loop between the expensive steps.

**Tech Stack:** Bun + TypeScript; `postgres-js` (`shared/db.ts`); `bun:sqlite` scratch DB + embed cache; Voyage v4 via `shared/embedding.ts`; the `Workflow` tool (subagents inherit the session model -- no API key, no SDK).

---

## Locked parameters

| Parameter | Value | Source |
|---|---|---|
| Channels | `#helpdesk` + `#quakeworld` | spec Pass 2 (easy/hard bracket) |
| Window | **2021-02-01 .. 2021-04-01** (exclusive end) | density drill: densest contiguous 2021 span; ~16.2k chat+link (helpdesk 6.1k / quakeworld 10.1k; March is the interleaving peak) |
| Prune | keep `message_labels.category IN ('chat','link')` only | spec Pass 2 (light-prune; NO banter-pruner) |
| Embedding | voyage-4-large (`document`) index / voyage-4-lite (`query`) | LOCKED -- `shared/embedding.ts` |
| Arm-D chunking | **cap 750 msgs, cut at 3h lulls, ONE size first pass** | safely below the attention cliff (see handoff Q); defer 1500/3000 sweep unless D wins |
| LLM jobs | fence / query-gen / judge = **Workflow subagents** (inherit session model) | no API key; Max subscription |
| Query set | ~10 reverse-gen per channel (neutral source: in-window 15-min sessions) + 12 Phase-8 anchors = ~32 | spec Pass 2 |
| Judge pairs (per query) | **D-vs-C, D-vs-B, C-vs-B, D-vs-A** (4 fixed, no winner-dependency) | decision rule needs these head-to-heads |
| Top-k | k=3 cosine; FTS top-3 | single top hit per arm feeds the judge |
| CODI | DEFERRED (optional, comparative-only) | arm C's own heuristic is the load-bearing cheap arm |

**Rough agent count (first pass):** ~40-60 fence + ~30 query-gen (Workflow A) + ~32 judge + ~16 coherence (Workflow B) ~= **~120-140 agents total**, ~10-16 concurrent (the Workflow cap), well under the 1000 lifetime cap. The Stage-1 prep script prints the exact chunk/session counts so the driver sees the spend before launching Workflow A.

---

## Repo layout

```
apps/qw-oracle/scripts/calibration/
  README.md            # throwaway-probe disclaimer + run order
  config.ts            # window/channel/size/k constants; paths
  vectors.ts           # in-memory cosine + cached Voyage batch embed
  phase8.ts            # the 12 hardcoded Phase-8 anchor questions
  01-build-slice.ts    # live Postgres -> scratch/slice.sqlite
  02-prep-chunks.ts    # lull-chunk (cap 750) -> scratch/chunks/<id>.json ; sample sessions -> scratch/sessions/<id>.json
  wf-a-fence-queries.js # WORKFLOW A script (fence + query-gen)        [run via Workflow tool]
  03-embed-and-retrieve.ts # consume wf-a output: embed B/C/D + queries, cosine+FTS -> scratch/pairs/<qid>.json
  wf-b-judge.js         # WORKFLOW B script (judge + coherence)        [run via Workflow tool]
  04-report.ts          # consume wf-b output -> results doc + decision-rule verdict
  arm-a-fts.ts          # FTS helper used by 03 (Postgres websearch_to_tsquery, in-window)
  arm-c-segments.ts     # cheap-signal segmentation used by 03
  scratch/              # gitignored: slice.sqlite, embed-cache.sqlite, chunks/, sessions/, pairs/, wf-a.json, wf-b.json
```

`.gitignore` (repo root) adds `apps/qw-oracle/scripts/calibration/scratch/`. Every commit `git add`s ONLY probe files (there are ~21 pre-existing uncommitted files from other work -- never sweep them in).

---

## Stage 1 -- deterministic prep (main session, Voyage/Postgres only)

### Task 1.0: scaffold

- [ ] `config.ts`:

```ts
import { join } from 'node:path';
export const CHANNELS = ['#helpdesk', '#quakeworld'] as const;
export const WINDOW_START = '2021-02-01T00:00:00Z';
export const WINDOW_END   = '2021-04-01T00:00:00Z';   // exclusive
export const BUILD_MODEL = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
export const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
export const CHUNK_CAP = 750;            // max messages per fence chunk
export const LULL_GAP_HOURS = 3;         // chunk boundary at quiet gaps
export const TOPK = 3;
export const RG_PER_CHANNEL = 10;        // reverse-gen queries per channel
export const SCRATCH = join(import.meta.dir, 'scratch');
export const SLICE_DB = join(SCRATCH, 'slice.sqlite');
export const EMBED_CACHE = join(SCRATCH, 'embed-cache.sqlite');
```

- [ ] `vectors.ts` -- in-memory cosine + cached Voyage embed (batches of 96, cache keyed by `${model}:${Bun.hash(text)}` in `EMBED_CACHE` sqlite, slice text to 30000 chars):

```ts
import { Database } from 'bun:sqlite';
import { embedTexts, cosineSimilarity } from '../../shared/embedding.ts';
import { BUILD_MODEL, QUERY_MODEL, EMBED_CACHE } from './config.ts';
const cache = new Database(EMBED_CACHE); cache.run(`CREATE TABLE IF NOT EXISTS emb (k TEXT PRIMARY KEY, vec TEXT)`);
const key = (m: string, t: string) => `${m}:${Bun.hash(t)}`;
export async function embedAll(texts: string[], inputType: 'document'|'query'): Promise<number[][]> {
  const model = inputType === 'document' ? BUILD_MODEL : QUERY_MODEL;
  const out: (number[]|null)[] = texts.map((t) => {
    const r = cache.query<{vec:string},[string]>(`SELECT vec FROM emb WHERE k=?`).get(key(model,t));
    return r ? JSON.parse(r.vec) : null;
  });
  const miss = out.flatMap((v,i)=> v===null ? [i] : []);
  for (let i=0;i<miss.length;i+=96){
    const idx = miss.slice(i,i+96);
    const { vectors } = await embedTexts(idx.map(j=>texts[j]!.slice(0,30000)), model, inputType);
    idx.forEach((j,b)=>{ out[j]=vectors[b]!; cache.run(`INSERT OR REPLACE INTO emb VALUES (?,?)`,[key(model,texts[j]!),JSON.stringify(vectors[b]!)]); });
  }
  return out as number[][];
}
export interface Unit { id: string; channel: string; vec: number[] }
export const topK = (u: Unit[], q: number[], k: number) =>
  u.map(x=>({id:x.id,channel:x.channel,score:cosineSimilarity(q,x.vec)})).sort((a,b)=>b.score-a.score).slice(0,k);
```

### Task 1.1: build the slice (`01-build-slice.ts`)

- [ ] SQLite scratch DB with: `msg(id,channel,author,content,created_at,ref_id,session_id,category)` (in-window chat/link messages, ordered by channel+created_at), `sess(id,channel,started_at,chat_count)`, `sess_search(session_id,channel,content)` -- pulled from live Postgres via `shared/db.ts` (`messages JOIN message_labels` for msgs filtered to category IN ('chat','link'); `sessions JOIN session_search` for sessions). Use `db(CHANNELS as unknown as string[])` for the `IN` list and `${WINDOW_START}`/`${WINDOW_END}` bounds. Print per-channel counts.
- [ ] **Verify:** `bun scripts/calibration/01-build-slice.ts` prints `#helpdesk ~6131 / #quakeworld ~10115` chat/link msgs (matches the density drill). Commit (probe files only).

### Task 1.2: chunk-prep + session-sample (`02-prep-chunks.ts`)

- [ ] **Lull-chunker** per channel: walk msgs by time; cut when gap > `LULL_GAP_HOURS` OR current chunk reaches `CHUNK_CAP`; record `forced` when the cut was the cap (not a lull). Write ONE file per chunk: `scratch/chunks/<chunkId>.json` = `{ id, channel, forced, messages: [{ idx, id, author, content }] }` (idx 1-based).

```ts
// core of the chunker
function lullChunks(msgs: Row[], cap: number, gapMs: number) {
  const out: { msgs: Row[]; forced: boolean }[] = []; let cur: Row[] = []; let last = 0;
  for (const m of msgs) { const ts = new Date(m.created_at).getTime();
    if (cur.length && ts-last > gapMs) { out.push({msgs:cur,forced:false}); cur=[]; }
    else if (cur.length >= cap) { out.push({msgs:cur,forced:true}); cur=[]; }
    cur.push(m); last = ts; }
  if (cur.length) out.push({msgs:cur,forced:false}); return out;
}
```

- [ ] **Session sample** for query-gen (neutral source): per channel pick `RG_PER_CHANNEL + 5` sessions with `chat_count BETWEEN 8 AND 60 AND length(content) > 200`, ordered by chat_count DESC (oversample by 5 to cover `answerable:false` drops). Write `scratch/sessions/<sessionId>.json` = `{ id, channel, content }`.
- [ ] Write `scratch/wf-a-input.json` = `{ chunkIds: [...], chunkDir, sessionIds: [...], sessionDir }` (the args for Workflow A).
- [ ] **Verify + REPORT:** print `N chunks (-> N fence agents), M sampled sessions (-> M query-gen agents)`. This is the spend preview before Workflow A. Commit.

---

## Stage 2 -- Workflow A: fence + reverse-gen queries

Run via the `Workflow` tool with `args` = the contents of `scratch/wf-a-input.json` (parse the JSON and pass as the `args` value). Each agent **reads its single per-chunk / per-session file** (small args; agents have Read access). Pure-reasoning agents -- the data is in the file, structured output enforced by schema.

`wf-a-fence-queries.js`:

```js
export const meta = {
  name: 'l2-calib-fence-and-queries',
  description: 'Layer 2 calibration: fence chat chunks into topic threads + reverse-generate eval queries',
  phases: [ { title: 'Fence' }, { title: 'QueryGen' } ],
}

const FENCE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    abstained: { type: 'boolean' },
    threads: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: { topic_label: { type: 'string' }, member_indices: { type: 'array', items: { type: 'integer' } } },
      required: ['topic_label', 'member_indices'],
    } },
  }, required: ['abstained', 'threads'],
}
const QUERY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { answerable: { type: 'boolean' }, question: { type: 'string' } },
  required: ['answerable', 'question'],
}

phase('Fence')
const fenced = await parallel(args.chunkIds.map((cid) => () =>
  agent(
    `Read the JSON file ${args.chunkDir}/${cid}.json -- an object {id, channel, messages:[{idx,author,content}]} whose messages interleave several simultaneous conversations. ` +
    `Group them into topic-coherent threads: a question plus the answers and follow-ups it triggers, and co-referent banter, belong together. ` +
    `Return for each thread a one-line topic_label and member_indices (the idx values). Every idx should appear in exactly one thread; pure noise may be its own throwaway thread. ` +
    `Do NOT output any idx not present in the file. If the window is incomprehensible, set abstained=true with threads=[]. Do not assume QuakeWorld domain knowledge -- only group what co-refers in the text.`,
    { label: `fence:${cid}`, phase: 'Fence', schema: FENCE_SCHEMA }
  ).then((r) => ({ chunkId: cid, ...r })).catch(() => null)
))

phase('QueryGen')
const queries = await parallel(args.sessionIds.map((sid) => () =>
  agent(
    `Read the JSON file ${args.sessionDir}/${sid}.json -- an object {id, channel, content} holding one real QuakeWorld Discord conversation. ` +
    `Write ONE natural question a confused user would type into a help search to find THIS conversation: symptom-phrased, first-person, deliberately using DIFFERENT words than the transcript (do not copy cvar/command names unless a real user genuinely would). ` +
    `If the transcript contains no answerable question, set answerable=false.`,
    { label: `qgen:${sid}`, phase: 'QueryGen', schema: QUERY_SCHEMA }
  ).then((r) => ({ sessionId: sid, ...r })).catch(() => null)
))

return { fenced: fenced.filter(Boolean), queries: queries.filter(Boolean) }
```

- [ ] Launch Workflow A; on completion write the returned `{fenced, queries}` to `scratch/wf-a.json`.
- [ ] **Verify:** eyeball 3-4 `fenced[].threads[].topic_label` (should read as coherent topics) and 3-4 `queries[].question` (should sound like real users, NOT parrot cvar names). Note mean/ max fraction of `member_indices` out of `[1..N]` per chunk = the **index-hallucination rate** (compute in Stage 5 from the chunk files).

---

## Stage 3 -- deterministic embed + retrieve (main session)

`03-embed-and-retrieve.ts` consumes `scratch/wf-a.json` + the slice:

- [ ] **Arm D units:** for each `fenced[i]`, load its chunk file, map each thread's `member_indices` -> `messages[idx-1]` -> text `"<author>: <content>"` joined; record member message ids. Drop indices outside `[1..N]` (count them for the hallucination metric). Embed thread texts (Voyage `document`). `id = d-<chunkId>-<t>`.
- [ ] **Arm B units:** embed `sess_search.content` for in-window sessions (Voyage `document`). `id = <session_id>`.
- [ ] **Arm C units:** segment per channel with `arm-c-segments.ts` (forward pass: continue current segment on a reply edge into it, on participant continuity within 30 min, or on a sub-5-min gap; else cut -- time + reply + participant, no LLM), embed segment texts. `id = c-<channel>-<n>`.
- [ ] **Queries:** the ~20 reverse-gen (`queries[].question` where `answerable`) + the 12 Phase-8 anchors from `phase8.ts`. Embed with Voyage `query`.
- [ ] **Retrieve:** for each query: `topK(B/C/D, qvec, 3)` (cosine) + `arm-a-fts.ts` top-3 (Postgres `websearch_to_tsquery('simple', q)` against `session_search.session_tsv`, in-window). Dereference each arm's TOP hit to its text. Write `scratch/pairs/<qid>.json` = `{ qid, query, channel, kind, hits: { A, B, C, D } /* each {id,text} or {text:'[NO HIT]'} */ }`.
- [ ] Write `scratch/wf-b-input.json` = `{ pairDir, queryIds: [...], cohDir, cohIds: [...] }`. For coherence: sample ~8 arm-D threads + ~8 arm-C segments -> `scratch/coh/<id>.json` = `{ id, kind:'thread'|'segment', text }`.
- [ ] **Verify:** spot-check one `pairs/<qid>.json` -- the D hit should look at least as on-topic as the B hit (or note if not). Commit.

---

## Stage 4 -- Workflow B: pairwise judge + coherence

Run via `Workflow`, `args` = `scratch/wf-b-input.json`. `wf-b-judge.js`:

```js
export const meta = {
  name: 'l2-calib-judge',
  description: 'Layer 2 calibration: pairwise LLM-as-judge (position-swap + length penalty) over retrieval pairs + coherence spot-check',
  phases: [ { title: 'Judge' }, { title: 'Coherence' } ],
}

const PAIRS = [['D','C'],['D','B'],['C','B'],['D','A']]   // fixed, no winner-dependency
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { verdicts: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: { pair: { type: 'string' }, winner: { type: 'string', enum: ['arm1','arm2','tie'] }, reason: { type: 'string' } },
    required: ['pair','winner','reason'],
  } } }, required: ['verdicts'],
}
const COH_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { score: { type: 'integer' }, note: { type: 'string' } }, required: ['score','note'],
}

phase('Judge')
const judged = await parallel(args.queryIds.map((qid) => () =>
  agent(
    `Read ${args.pairDir}/${qid}.json -- {query, hits:{A,B,C,D}} where each hit is a chat excerpt (or "[NO HIT]"). ` +
    `For EACH of these pairs ${JSON.stringify(PAIRS)} (arm1,arm2): decide which excerpt more directly helps answer the query. ` +
    `Judge relevance and answer-density, NOT length -- a long excerpt that buries the answer in off-topic chatter is WORSE than a short on-point one. ` +
    `Run each pair in BOTH orders and only return a winner if it survives the swap; otherwise return "tie". If one side is "[NO HIT]", the other wins. ` +
    `Return one verdict per pair with pair="D-vs-C" etc.`,
    { label: `judge:${qid}`, phase: 'Judge', schema: VERDICT_SCHEMA }
  ).then((r) => ({ qid, ...r })).catch(() => null)
))

phase('Coherence')
const coherence = await parallel(args.cohIds.map((cid) => () =>
  agent(
    `Read ${args.cohDir}/${cid}.json -- {id, kind, text} (a reconstructed chat thread or segment). ` +
    `Score 1-5 how topically coherent it is (5 = one clean topic; 1 = unrelated messages jammed together). One-line note.`,
    { label: `coh:${cid}`, phase: 'Coherence', schema: COH_SCHEMA }
  ).then((r) => ({ id: cid, ...r })).catch(() => null)
))

return { judged: judged.filter(Boolean), coherence: coherence.filter(Boolean) }
```

- [ ] Launch Workflow B; write `{judged, coherence}` to `scratch/wf-b.json`.

---

## Stage 5 -- report + decision (`04-report.ts`)

- [ ] Aggregate `scratch/wf-b.json` + the index-hallucination tallies (Stage 3) into a report at `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md`:
  - **Per-pair win rates, OVERALL and split by channel** (the headline asymmetry). Win = arm wins after swap; ignore ties in the rate denominator but report tie counts.
  - **Disentanglement:** mean/max index-hallucination per channel; arm-D vs arm-C coherence-score distributions.
  - **Cost:** Voyage tokens (from `embed_api`-style logging or sum), total workflow agent count (fence + qgen + judge + coh). (No dollar figure -- Max subscription quota.)
  - **Decision-rule verdict** (apply verbatim): C tracks D closely -> cheap signals win, skip the LLM. B tracks D closely -> don't re-segment, embed sessions. D clearly separates from C and B -> LLM fencing earns its cost (how-deep read off hallucination; if low at cap 750, sweep UP next). Per-channel split (C fine on #helpdesk, fails on #quakeworld) -> LLM only where messy. A ties everything (D-vs-A near tie) -> embedding isn't the bottleneck, park the lever. **Tiebreaker: close call defaults to the cheaper arm.**
  - Tag with model + prompt version (the workflow agent prompts above are "v1"); ASCII only; report faithfully (a result that kills arm D is valid and valuable).
- [ ] Commit. Then a fresh terminal resumes the brainstorm at **Pass 3**, scoped by these numbers.

---

## Critical rules

- **No API key / no SDK.** LLM jobs are Workflow agents only. If a step seems to need an API key, that is a design error -- re-read the architecture.
- **Voyage is LOCKED** (voyage-4-large / voyage-4-lite); do not swap models.
- **Light-prune only** (chat/link); no banter-pruner -- the test MEASURES whether banter hurts.
- **Eval is pairwise LLM-as-judge with position-swap, NOT self-recall.** Query source is neutral (real sessions), independent of any arm.
- **Read live corpus** (`messages`/`sessions`/`session_search`), not export files. Bun runtime, postgres-js.
- **Git hygiene:** `git add` only probe files; never sweep the ~21 pre-existing uncommitted files.
- **Workflow opt-in is already granted** by the operator for this probe. Launch the two workflows directly.
- **Report faithfully + tag outputs** (model + prompt version); ASCII discipline in checked-in artifacts.

## Self-review (spec coverage)

| Requirement | Where |
|---|---|
| Window locked by density drill | Feb-Mar 2021 (Stage 1) |
| Light-prune chat/link only | Task 1.1 |
| Arm A FTS / B sessions / C cheap signals / D LLM-fenced | Stage 3 + WF A |
| Fencing: no domain priming, hallucination metric, conservative chunk size | WF A + Stage 5 |
| Query set: neutral reverse-gen + Phase-8 anchors | Task 1.2 + WF A + phase8.ts |
| Judge: pairwise, position-swap, length penalty, not self-recall | WF B |
| Disentanglement: hallucination + coherence | Stage 3 + WF B |
| Decision rule + per-channel asymmetry + cost | Stage 5 |
| No API key (Max subscription) | whole architecture |
