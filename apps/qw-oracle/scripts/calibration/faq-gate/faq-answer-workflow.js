// faq-answer-workflow.js -- Stage 2 + Judge of the per-domain FAQ acceptance gate
//
// WORKFLOW SCRIPT -- plain JavaScript, no TypeScript syntax. Runs inside the
// Workflow runtime, which provides these globals WITHOUT import:
//   agent(prompt, {schema, model, label, phase}) -> validated object
//   parallel(thunks) -> results[]
//   pipeline(items, ...stages) -> results[]
//   log(msg)
//   phase(title)
//   args  -- the executor passes the per-thread work-list as args
//
// D11 / F2 HARD CONSTRAINT: the answer step routes through Workflow agent()
// ONLY -- no direct LLM-provider SDK, no provider API key, no outbound provider
// HTTP call. (This Max subscription has no API key; a direct-SDK path would
// fail.) The Phase-0 boundary probe greps this dir for the provider import
// literals and must come back empty, so this file avoids writing them.
//
// GROUNDING DELIVERY -- two modes per item (executor picks):
//   (a) PATH mode (default, fidelity-safe): item = {threadId, groundingPath, truthPath}.
//       The answer agent Reads the grounding file; the judge agent Reads the
//       truth file. No large text crosses the args boundary -> no transcription
//       risk, and it scales to many threads per domain (Phases 1-3).
//   (b) INLINE mode (the phase-MD design): item = {threadId, question, grounding, truth}.
//       The grounding/truth strings are embedded directly in the prompt.
//   An item may mix: inline question + groundingPath, etc. PATH wins when present.
//   (Path mode is used because a live probe confirmed Workflow agents can Read
//   local files -- the MD assumed they could not; see the executor halt report.)
//
// Concurrency discipline (learned the hard way: an Opus burst tripped the
// account-wide throttle): model=sonnet, CONC=3 (low), paced waves. Honest
// failure markers -- NEVER swallow with a silent .catch(()=>null).

export const meta = {
  name: 'faq-gate-answer',
  description: 'Answer + judge per FAQ thread from grounding only (Workflow agent only)',
  phases: [{ title: 'Answer' }, { title: 'Judge' }],
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL = 'sonnet'
const CONC = 3

// ---------------------------------------------------------------------------
// Defensive args parse -- harness may deliver args as a JSON string or object
// ---------------------------------------------------------------------------
const items = typeof args === 'string' ? JSON.parse(args) : (args ?? [])

log(`faq-gate-answer: ${items.length} thread(s) to process, model=${MODEL}, conc=${CONC}`)

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    claimedEntities: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every cvar, command, or named entity you name in your answer',
    },
  },
  required: ['answer', 'claimedEntities'],
}

const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['NAILED', 'PARTIAL', 'WRONG'] },
    justification: { type: 'string' },
  },
  required: ['verdict', 'justification'],
}

// ---------------------------------------------------------------------------
// ANTI-CONFAB RULE A -- embedded verbatim (do NOT paraphrase). Canonical text
// is the one live in serve/mcp/src/orientation.ts.
// ---------------------------------------------------------------------------
const ANTI_CONFAB_RULE = "Grounding discipline: never name a cvar, command, or other entity that is not present in a tool result you received in this conversation. If the exact name is not in the returned grounding, say the corpus does not surface it and offer to redirect -- do not reconstruct a plausible name from training data. A plausible-but-wrong name ('cl_showfps' for the real 'show_fps', or a non-existent 'scr_showframetime') is exactly the failure this prevents."

// ---------------------------------------------------------------------------
// Paced wave runner -- low concurrency to avoid account-wide throttle
// ---------------------------------------------------------------------------
async function waves(list, makeThunk) {
  const out = []
  for (let i = 0; i < list.length; i += CONC) {
    const batch = list.slice(i, i + CONC)
    const results = await parallel(batch.map(makeThunk))
    out.push(...results)
  }
  return out
}

// ---------------------------------------------------------------------------
// Prompt builders -- PATH mode (agent reads file) vs INLINE mode (embed text)
// ---------------------------------------------------------------------------
function buildAnswerPrompt(item) {
  const head =
    "You are the QW Oracle answering a QuakeWorld player's config question. " +
    'Use ONLY the grounding for this thread.\n\n' +
    ANTI_CONFAB_RULE + '\n\n'
  const tail =
    '\n\nAnswer concisely, as the Oracle would relay it to the player. ' +
    'In claimedEntities, list every cvar / command / named entity you mention in your answer.'

  if (item.groundingPath) {
    return head +
      'Read the grounding file at this absolute path:\n' + item.groundingPath + '\n\n' +
      'It contains the player\'s question (the "## USER QUESTION" section) and the retrieved ' +
      'grounding (search_concepts / search_entities / lookup_entity / search_solved_issues sections). ' +
      'Answer the question in "## USER QUESTION".' + tail
  }
  return head +
    'GROUNDING:\n' + (item.grounding ?? '') + '\n\n' +
    'QUESTION:\n' + (item.question ?? '') + tail
}

function buildJudgePrompt(item) {
  // F10 fix: the judge scores against the USER'S QUESTION, with the community
  // resolution as ONE reference (NOT the literal gold standard). Community threads
  // are often diffuse / thin / link-deflections / use equivalent-but-different
  // commands; anchoring on them penalised correct answers. The Stage-3 confab check
  // (unchanged) remains the hard anti-fabrication floor balancing this leniency.
  const rubric =
    "Did the Oracle answer correctly and completely resolve the USER'S QUESTION? " +
    'Use the community resolution as ONE reference, NOT the literal gold standard -- community ' +
    'threads are often diffuse, thin, link-deflections, or use equivalent-but-different commands. ' +
    'An answer that is correct and equivalent-or-more-complete than the community resolution, ' +
    'using grounded commands, still NAILs.\n' +
    'NAILED = correctly + completely resolves the question; ' +
    'PARTIAL = partially resolves / misses something the user needs; ' +
    'WRONG = incorrect or fails to resolve.\n' +
    'Give the verdict plus a one-line justification.'

  const qBlock = item.groundingPath
    ? ("Read the grounding file at this absolute path; take the USER'S QUESTION from its " +
       '"## USER QUESTION" section (the rest of the file is the retrieved grounding -- consult it ' +
       'only to confirm the answer used grounded commands):\n' + item.groundingPath)
    : ("USER'S QUESTION:\n" + (item.question ?? ''))

  const truthBlock = item.truthPath
    ? ('Community resolution -- read the file at this absolute path; treat it as ONE reference, NOT gold:\n' + item.truthPath)
    : ('Community resolution (ONE reference, NOT gold):\n' + (item.truth ?? ''))

  return qBlock + '\n\n' + 'Oracle answer:\n' + item.answer + '\n\n' + truthBlock + '\n\n' + rubric
}

// ---------------------------------------------------------------------------
// Stage 2a: Answer
// ---------------------------------------------------------------------------
phase('Answer')
log('Answer pass: generating oracle answers from grounding...')

const answered = await waves(items, (item) => () => {
  return agent(buildAnswerPrompt(item), {
    schema: ANSWER_SCHEMA,
    model: MODEL,
    label: `answer:${item.threadId}`,
    phase: 'Answer',
  }).then((r) => {
    log(`answer:${item.threadId} done -- entities claimed: ${r.claimedEntities.length}`)
    return { ...item, answer: r.answer, claimedEntities: r.claimedEntities, answerError: null }
  }).catch((err) => {
    // Explicit failure marker -- do NOT swallow silently
    const msg = err instanceof Error ? err.message : String(err)
    log(`answer:${item.threadId} FAILED: ${msg}`)
    return { ...item, answer: null, claimedEntities: [], answerError: msg }
  })
})

const answerOk = answered.filter((r) => r.answer !== null).length
log(`Answer pass complete: ${answerOk}/${answered.length} succeeded`)

// ---------------------------------------------------------------------------
// Stage 2b: Judge
// ---------------------------------------------------------------------------
phase('Judge')
log('Judge pass: scoring oracle answers against community resolution...')

const judged = await waves(answered, (item) => () => {
  // Skip judging if the answer step failed; carry the error forward.
  if (item.answerError !== null) {
    return Promise.resolve({
      threadId: item.threadId,
      answer: null,
      claimedEntities: [],
      verdict: 'WRONG',
      justification: `Answer step failed: ${item.answerError}`,
    })
  }

  return agent(buildJudgePrompt(item), {
    schema: JUDGE_SCHEMA,
    model: MODEL,
    label: `judge:${item.threadId}`,
    phase: 'Judge',
  }).then((r) => {
    log(`judge:${item.threadId}: ${r.verdict} -- ${r.justification}`)
    return {
      threadId: item.threadId,
      answer: item.answer,
      claimedEntities: item.claimedEntities,
      verdict: r.verdict,
      justification: r.justification,
    }
  }).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    log(`judge:${item.threadId} FAILED: ${msg}`)
    return {
      threadId: item.threadId,
      answer: item.answer,
      claimedEntities: item.claimedEntities,
      verdict: 'WRONG',
      justification: `Judge step failed: ${msg}`,
    }
  })
})

const nailed = judged.filter((r) => r.verdict === 'NAILED').length
log(`Judge pass complete: ${nailed}/${judged.length} NAILED`)

return judged
