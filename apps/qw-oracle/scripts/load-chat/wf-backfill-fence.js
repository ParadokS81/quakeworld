// WORKFLOW -- Phase C backfill fence. Groups each chunk's interleaved messages
// into topic-coherent threads. This is the PROVEN wf-a-fence-queries.js recipe
// (decisions.md D9 / R7), minus the QueryGen phase, plus an OPTIONAL
// resolution_status passenger (D7) toggled by args.withResolution so the
// batch-1 kill-switch can fence the same slice BOTH ways.
//
// RATE-LIMIT DISCIPLINE (inherited from wf-a, learned the hard way): a large
// Opus burst trips the shared account-wide throttle and starves OTHER terminals.
// So: Sonnet, low concurrency (CONC), paced waves, an 8s recovery + retry pass
// for stragglers, and an HONEST success/fail count in the return value (the
// .catch(()=>null) is the failure SIGNAL that runGently counts + retries, not a
// silent swallow).
//
// The base fence prompt is kept BYTE-IDENTICAL to wf-a so the without-resolution
// pass is directly comparable to the calibration baseline (0% index-hallucination,
// 4.38/5 coherence). The resolution_status ask is appended ONLY when withResolution.
//
// Each agent reads its single per-chunk file (Read tool); the script itself has
// no filesystem access, so chunkIds + chunkDir arrive via args.

export const meta = {
  name: 'l2-backfill-fence',
  description: 'Phase C backfill: fence chat chunks into topic-coherent threads (optional resolution_status passenger)',
  phases: [{ title: 'Fence' }],
}

const MODEL = 'sonnet'   // NOT opus -- fencing is a grouping task; sonnet is the production model
const CONC = 5           // peak concurrent agents -- proven clean at 251 agents in calibration
const WAVE_PAUSE_MS = 2000
const RETRY_RECOVER_MS = 8000

// args may arrive as an object or (harness-dependent) a JSON string; normalize (R7).
const A = typeof args === 'string' ? JSON.parse(args) : (args ?? {})
const WITH_RES = A.withResolution === true
const chunkIds = A.chunkIds ?? []
const sleep = (ms) => (typeof setTimeout === 'function' ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve())
log(`wf-backfill-fence: model=${MODEL}, conc=${CONC}, withResolution=${WITH_RES}, chunks=${chunkIds.length}, pacing setTimeout=${typeof setTimeout}, keys=[${Object.keys(A).join(',')}]`)

// Thread schema: base + OPTIONAL resolution_status (never in `required`).
const threadProps = {
  topic_label: { type: 'string' },
  member_indices: { type: 'array', items: { type: 'integer' } },
}
if (WITH_RES) threadProps.resolution_status = { type: 'string', enum: ['solved', 'unresolved', 'informational'] }
const FENCE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    abstained: { type: 'boolean' },
    threads: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: threadProps,
        required: ['topic_label', 'member_indices'],
      },
    },
  }, required: ['abstained', 'threads'],
}

// D7: per-conversation LOCAL truth only; never cross-conversation synthesis.
const resAsk = WITH_RES
  ? ' Additionally, classify each thread resolution_status as one of "solved" (a question in THIS thread got a working answer here), "unresolved" (a question was asked but no working answer appears here), or "informational" (no question -- discussion, banter, or announcement). Judge ONLY from the messages in this thread; never infer from outside knowledge. resolution_status is optional -- omit it when genuinely unclear.'
  : ''

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
    `Do NOT output any idx not present in the file. If the window is incomprehensible, set abstained=true with threads=[]. Do not assume QuakeWorld domain knowledge -- only group what co-refers in the text.` +
    resAsk,
    { label: `fence:${cid}`, phase: 'Fence', schema: FENCE_SCHEMA, model: MODEL }
  ).then((r) => ({ chunkId: cid, ...r })).catch(() => null), 'fence'
)

const fok = fenced.filter(Boolean)
const failures = { fence: chunkIds.length - fok.length }
log(`wf-backfill-fence DONE: fence ${fok.length}/${chunkIds.length}, withResolution=${WITH_RES}, failures=${JSON.stringify(failures)}`)
return { fenced: fok, withResolution: WITH_RES, failures }
