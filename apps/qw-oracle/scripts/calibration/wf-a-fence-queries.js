// WORKFLOW A -- Layer 2 calibration: fence chat chunks into topic threads +
// reverse-generate eval queries. Run via the Workflow tool with args from
// scratch/wf-a-input.json. Agent prompts are PROMPT VERSION v1 (tag results).
//
// RATE-LIMIT DISCIPLINE (learned the hard way): a 251-agent Opus burst trips the
// shared account-wide throttle ("Server is temporarily limiting requests") and
// starves OTHER terminals. So: Sonnet, low concurrency (CONC), paced waves, an
// 8s recovery + retry pass for stragglers, and an HONEST success/fail count in
// the return value (no silent .catch swallowing).
//
// Each agent reads its single per-chunk / per-session file (Read tool); the
// script itself has no filesystem access, so chunk ids are expanded from compact
// per-channel counts (id format `${slug}-${NNN}` shared with 02-prep-chunks.ts).

export const meta = {
  name: 'l2-calib-fence-and-queries',
  description: 'Layer 2 calibration: fence chat chunks into topic threads + reverse-generate eval queries',
  phases: [{ title: 'Fence' }, { title: 'QueryGen' }],
}

const MODEL = 'sonnet'   // NOT opus -- fencing is a grouping task; sonnet is the realistic production model
const CONC = 5           // peak concurrent agents -- proven clean at 3; 5 is still far under the Opus*13 burst that tripped the shared limit
const WAVE_PAUSE_MS = 2000
const RETRY_RECOVER_MS = 8000

const FENCE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    abstained: { type: 'boolean' },
    threads: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { topic_label: { type: 'string' }, member_indices: { type: 'array', items: { type: 'integer' } } },
        required: ['topic_label', 'member_indices'],
      },
    },
  }, required: ['abstained', 'threads'],
}
const QUERY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { answerable: { type: 'boolean' }, question: { type: 'string' } },
  required: ['answerable', 'question'],
}

// args may arrive as an object or (harness-dependent) a JSON string; normalize.
const A = typeof args === 'string' ? JSON.parse(args) : (args ?? {})
const sleep = (ms) => (typeof setTimeout === 'function' ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve())
log(`wf-a: model=${MODEL}, conc=${CONC}, pacing setTimeout=${typeof setTimeout}, keys=[${Object.keys(A).join(',')}]`)

const chunkIds = A.chunkIds ?? (A.chunkCounts ?? []).flatMap(
  (c) => Array.from({ length: c.count }, (_, i) => `${c.slug}-${String(i + 1).padStart(3, '0')}`)
)

// Paced waves of CONC, with a recovery+retry pass for transient rate-limit nulls.
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

phase('Fence')
const fenced = await runGently(chunkIds, (cid) => () =>
  agent(
    `Read the JSON file ${A.chunkDir}/${cid}.json -- an object {id, channel, messages:[{idx,author,content}]} whose messages interleave several simultaneous conversations. ` +
    `Group them into topic-coherent threads: a question plus the answers and follow-ups it triggers, and co-referent banter, belong together. ` +
    `Return for each thread a one-line topic_label and member_indices (the idx values). Every idx should appear in exactly one thread; pure noise may be its own throwaway thread. ` +
    `Do NOT output any idx not present in the file. If the window is incomprehensible, set abstained=true with threads=[]. Do not assume QuakeWorld domain knowledge -- only group what co-refers in the text.`,
    { label: `fence:${cid}`, phase: 'Fence', schema: FENCE_SCHEMA, model: MODEL }
  ).then((r) => ({ chunkId: cid, ...r })).catch(() => null), 'fence'
)

phase('QueryGen')
const queries = await runGently(A.sessionIds, (sid) => () =>
  agent(
    `Read the JSON file ${A.sessionDir}/${sid}.json -- an object {id, channel, content} holding one real QuakeWorld Discord conversation. ` +
    `Write ONE natural question a confused user would type into a help search to find THIS conversation: symptom-phrased, first-person, deliberately using DIFFERENT words than the transcript (do not copy cvar/command names unless a real user genuinely would). ` +
    `If the transcript contains no answerable question, set answerable=false.`,
    { label: `qgen:${sid}`, phase: 'QueryGen', schema: QUERY_SCHEMA, model: MODEL }
  ).then((r) => ({ sessionId: sid, ...r })).catch(() => null), 'qgen'
)

const fok = fenced.filter(Boolean), qok = queries.filter(Boolean)
const failures = { fence: chunkIds.length - fok.length, qgen: A.sessionIds.length - qok.length }
log(`wf-a DONE: fence ${fok.length}/${chunkIds.length}, qgen ${qok.length}/${A.sessionIds.length}, failures=${JSON.stringify(failures)}`)
return { fenced: fok, queries: qok, failures }
