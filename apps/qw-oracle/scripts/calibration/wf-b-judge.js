// WORKFLOW B -- Layer 2 calibration: pairwise LLM-as-judge (position-swap +
// length penalty) over retrieval pairs + arm-D/arm-C coherence spot-check.
// Run via the Workflow tool with args from scratch/wf-b-input.json. Agent
// prompts are PROMPT VERSION v1 (tag results).
//
// Same rate-limit discipline as Workflow A: Sonnet, low concurrency, paced
// waves, recovery+retry pass, honest success/fail count. The judge is a
// reading+comparison task (comprehension-bound, not deliberation-bound), so
// Sonnet default effort is the right fit -- same reasoning as the fencer.

export const meta = {
  name: 'l2-calib-judge',
  description: 'Layer 2 calibration: pairwise LLM-as-judge (position-swap + length penalty) over retrieval pairs + coherence spot-check',
  phases: [{ title: 'Judge' }, { title: 'Coherence' }],
}

const MODEL = 'sonnet'
const CONC = 5
const WAVE_PAUSE_MS = 2000
const RETRY_RECOVER_MS = 8000

const PAIRS = [['D', 'C'], ['D', 'B'], ['C', 'B'], ['D', 'A']]   // fixed, no winner-dependency
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    verdicts: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { pair: { type: 'string' }, winner: { type: 'string', enum: ['arm1', 'arm2', 'tie'] }, reason: { type: 'string' } },
        required: ['pair', 'winner', 'reason'],
      },
    },
  }, required: ['verdicts'],
}
const COH_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { score: { type: 'integer' }, note: { type: 'string' } }, required: ['score', 'note'],
}

const A = typeof args === 'string' ? JSON.parse(args) : (args ?? {})
const sleep = (ms) => (typeof setTimeout === 'function' ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve())
log(`wf-b: model=${MODEL}, conc=${CONC}, pacing setTimeout=${typeof setTimeout}, keys=[${Object.keys(A).join(',')}]`)

async function waves(items, makeThunk) {
  const out = []
  for (let i = 0; i < items.length; i += CONC) {
    out.push(...await parallel(items.slice(i, i + CONC).map(makeThunk)))
    if (i + CONC < items.length) await sleep(WAVE_PAUSE_MS)
  }
  return out
}
async function runGently(items, makeThunk, tag) {
  let res = await waves(items, makeThunk)
  const failedIdx = res.map((r, i) => (r == null ? i : -1)).filter((i) => i >= 0)
  if (failedIdx.length) {
    log(`${tag}: ${failedIdx.length}/${items.length} failed pass 1 -- recovering ${RETRY_RECOVER_MS}ms then retrying`)
    await sleep(RETRY_RECOVER_MS)
    const retry = await waves(failedIdx.map((i) => items[i]), makeThunk)
    failedIdx.forEach((origI, k) => { res[origI] = retry[k] })
  }
  return res
}

phase('Judge')
const judged = await runGently(A.queryIds, (qid) => () =>
  agent(
    `Read ${A.pairDir}/${qid}.json -- {query, hits:{A,B,C,D}} where each hit is a chat excerpt (or "[NO HIT]"). ` +
    `For EACH of these pairs ${JSON.stringify(PAIRS)} (arm1,arm2): decide which excerpt more directly helps answer the query. ` +
    `Judge relevance and answer-density, NOT length -- a long excerpt that buries the answer in off-topic chatter is WORSE than a short on-point one. ` +
    `Run each pair in BOTH orders and only return a winner if it survives the swap; otherwise return "tie". If one side is "[NO HIT]", the other wins. ` +
    `Return one verdict per pair with pair="D-vs-C" etc.`,
    { label: `judge:${qid}`, phase: 'Judge', schema: VERDICT_SCHEMA, model: MODEL }
  ).then((r) => ({ qid, ...r })).catch(() => null), 'judge'
)

phase('Coherence')
const coherence = await runGently(A.cohIds, (cid) => () =>
  agent(
    `Read ${A.cohDir}/${cid}.json -- {id, kind, text} (a reconstructed chat thread or segment). ` +
    `Score 1-5 how topically coherent it is (5 = one clean topic; 1 = unrelated messages jammed together). One-line note.`,
    { label: `coh:${cid}`, phase: 'Coherence', schema: COH_SCHEMA, model: MODEL }
  ).then((r) => ({ id: cid, ...r })).catch(() => null), 'coh'
)

const jok = judged.filter(Boolean), cok = coherence.filter(Boolean)
const failures = { judge: A.queryIds.length - jok.length, coh: A.cohIds.length - cok.length }
log(`wf-b DONE: judge ${jok.length}/${A.queryIds.length}, coh ${cok.length}/${A.cohIds.length}, failures=${JSON.stringify(failures)}`)
return { judged: jok, coherence: cok, failures }
