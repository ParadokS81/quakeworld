// MVDSV describe-fill -- reusable WORKFLOW chunk-runner.
//
// Invoked by the orchestrator (fresh terminal) once per chunk:
//   Workflow({ scriptPath: "<this file>", args: <configObject> })
//
// The workflow runtime CANNOT read files (no fs), so the whole chunk config
// arrives via `args`. The pilot proved args can land as a STRING, so we parse
// defensively. Config shape:
//   {
//     anchor: "1.11-53-g18d0362",
//     mvdsvRoot, ktxRoot, skillDir,
//     researchDocs: ["<abs path>", ...],          // locating AIDS (optional)
//     chunk: { name: "c3-dead-hidden", shape: "cvar", rules: "<shape-specific rule block>" },
//     knobs:    [{ knob, type, reg, dflt, suspect }],         // reg+dflt = LOCATOR aids
//     canaries: [{ knob, type, description, groundTruth }]    // groundTruth in V-pass enum
//   }
// Returns { anchor, chunk, synthesis[], vpass[], canaries[], flags[], canaryAllPass, redispatched }.
// MAIN owns recon (build args), F-D6a, HG2, the prose-gate, and all DB/git writes.

export const meta = {
  name: 'mvdsv-describe-fill-chunk',
  description: 'MVDSV describe-fill: synthesize one risk-ordered chunk (<=4 knobs/agent) then independent cold V-pass of every knob + planted canaries, with an HG1 canary gate and flags_for_review capture',
  phases: [
    { title: 'Synthesis', detail: 'one Opus worker per <=4 knobs; method read from describe-fill-synthesis skill files; flags_for_review captured', model: 'opus' },
    { title: 'V-pass', detail: 'one cold Opus worker per knob + planted canaries; knob+description only; READ-ONLY', model: 'opus' },
  ],
}

const cfg = (typeof args === 'string') ? JSON.parse(args) : args
if (!cfg || !Array.isArray(cfg.knobs) || !cfg.knobs.length) {
  throw new Error('chunk-runner: args missing cfg.knobs[] -- pass the chunk config as the Workflow args object')
}
const { anchor, mvdsvRoot, ktxRoot, skillDir, chunk } = cfg
const researchDocs = cfg.researchDocs || []
const canaries = cfg.canaries || []

const FLAGS = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      observation: { type: 'string' },
      kind: { type: 'string', enum: ['off-scope-entity', 'suspected-bug', 'contradiction', 'runtime-dead-suspect', 'hidden-family', 'cross-mod-override', 'other'] },
      severity: { type: 'string', enum: ['fyi', 'review', 'blocker'] },
    },
    required: ['observation', 'kind', 'severity'],
  },
}

const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    records: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          knob: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
          description_origin: { type: 'string', enum: ['synthesized', 'source_inline'] },
          source_ref: { type: 'string' },
          description_anchor_version: { type: 'string' },
          description_verdict: { type: 'string', enum: ['synthesized', 'affirmed', 'hedged', 'residue_routed', 'dead_stamped'] },
          description_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          description_reasoning: { type: 'string' },
          enforce_trace_table: { type: 'string' },
          verdict_line: { type: 'string' },
          flags_for_review: FLAGS,
        },
        required: ['knob', 'type', 'description', 'description_origin', 'source_ref', 'description_anchor_version', 'description_verdict', 'description_confidence', 'description_reasoning', 'enforce_trace_table', 'verdict_line', 'flags_for_review'],
      },
    },
  },
  required: ['records'],
}

const VPASS_SCHEMA = {
  type: 'object',
  properties: {
    knob: { type: 'string' },
    classification: { type: 'string', enum: ['TRACED-CLEAN', 'C-NEAR-MISS', 'C-FIX', 'WI2-FIX'] },
    per_clause_table: { type: 'string' },
    notes: { type: 'string' },
    flags_for_review: FLAGS,
  },
  required: ['knob', 'classification', 'per_clause_table', 'notes', 'flags_for_review'],
}

function synthPrompt(group) {
  const perKnob = group.map(k => `- ${k.knob} (${k.type}) -- registered ${k.reg}, extractor default ${k.dflt == null ? 'n/a' : '`' + k.dflt + '`'}, suspect_pool_member=${k.suspect ? 'TRUE' : 'FALSE'}`).join('\n')
  const docs = researchDocs.length ? researchDocs.map(d => `  - ${d}`).join('\n') : '  (none supplied this chunk)'
  return `You are a describe-fill synthesis worker for the QW Oracle Layer 1 knowledge base. Synthesize user-facing descriptions for ${group.length} MVDSV ${chunk.shape}(s) at MAXIMUM reasoning. One chunk = "${chunk.name}".

HARD GATE (FIRST): run \`git -C ${mvdsvRoot} describe --tags\` -- MUST print "${anchor}", else STOP and return records=[].

LOAD THE METHOD (read these ONCE -- they ARE the describe-fill-synthesis skill; apply, do not restate):
- ${skillDir}/SKILL.md
- ${skillDir}/references/d5-rubric.md
- ${skillDir}/references/evidence-and-citation.md
- ${skillDir}/references/c3-dead-stamp-and-residue.md
- ${skillDir}/references/enforce-trace-discipline.md
- ${skillDir}/references/d20-description-template.md

EVIDENCE BASE (what you may consult; SOURCE is ground truth):
- PRIMARY: mvdsv source at ${mvdsvRoot}/src -- grep the READ use-sites; enforce-trace every clause to the line that ENFORCES it. This is the only citation.
- CROSS-MOD: ktx source at ${ktxRoot}/src -- for F-MV1 (does KTX override this command/cvar?).
- LOCATING AIDS ONLY (never a citation; never parrot them): research landscape docs --
${docs}
- DISCIPLINE: do NOT copy an existing doc or infer from the name. If the source does not make a clause legible, HEDGE it or route to residue -- never fabricate.

CONCISION (operator-reviewed early chunks): \`description\` is a SHORT user doc. Target 1-2 sentences of what-it-does in admin-observable terms + the value meanings + Default + Set by (+ See also only if it changes the admin's action). Resist a third sentence. If you are past ~3 short lines of prose you are over-documenting -- trim to exactly what an admin needs to set it. NO file:line / code jargon in \`description\` (cites -> description_reasoning).

MVDSV RULES (augment the skill):
- description_provenance = null for cold-synth (set by MAIN, not you).
- Set-by: server cvars are set via server config / rcon; commands are issued at console/rcon (state who can issue).
- TRAP 1 (comment-isn't-enforcement): a consistent-LOOKING line or trailing comment is NOT proof; cite the ENFORCING line.
- TRAP 2 (enforcing line lives elsewhere): registration/handler site is a LOCATOR; the behavior is often enforced in a different file (e.g. a sort comparator, a download gate). Find the real enforcing line.
- F-MV1: before documenting command-set UX or a cvar whose Set-by cites a command, grep ${ktxRoot}/src for a KTX override; document the LIVE behavior, not a dead engine fallback.

CHUNK-SPECIFIC RULES:
${chunk.rules || '(none)'}

flags_for_review (REQUIRED -- empty array if nothing): if you notice anything off-scope (a sibling/hidden entity not in your set), a suspected engine bug, a contradiction, a registered-but-unreachable (runtime-dead) suspect, or a cross-mod override worth a human look -- record it here. This is how curveballs reach review instead of getting lost.

KNOBS (locator aids only -- verify against source):
${perKnob}

PER KNOB (do each fully, then DROP its greps before the next so context stays lean):
1. Grep ${mvdsvRoot}/src for the READ use-sites (\`<knob>.value\`/\`.string\`/\`.integer\`, or the command handler), NOT the registration. Find the ENFORCING line.
2. Enforce-trace EVERY clause (polarity, threshold, default, scope, OFF-state, side-effect) to that line + adjacent comments; follow callees.
3. Write the LEAN D20 description from the read use-sites.
4. Fill the record. source_ref = enforcing READ use-site (file:line), NOT registration. description_anchor_version="${anchor}". origin/verdict="synthesized" (or hedged/residue_routed/dead_stamped per the rules). All cites in description_reasoning (single line) AND in enforce_trace_table (markdown: clause | file:line | snippet | verified). verdict_line = the skill's final-line format. flags_for_review as above.

Return the records array. Do NOT write files, DB, or git.`
}

function vpassPrompt(knob, description, sharpen) {
  return `You are an INDEPENDENT COLD verifier (V-pass) for a QW Oracle Layer 1 description. You get ONLY a knob name + proposed description -- you do NOT know how it was written or whether it is correct. Verify every clause against live MVDSV source, or flag it. MAXIMUM reasoning.

ORACLE: mvdsv @ ${anchor} ONLY. Confirm \`git -C ${mvdsvRoot} describe --tags\` == "${anchor}".
Read ${skillDir}/references/enforce-trace-discipline.md and apply it exactly.

KNOB: ${knob}
PROPOSED DESCRIPTION:
"""
${description}
"""

PROCEDURE:
1. Decompose into clauses (each polarity / threshold / default / scope / OFF-state / side-effect claim).
2. For EACH clause: wide-grep ALL use-sites of ${knob} in ${mvdsvRoot}/src, locate the ENFORCING line (may live in a DIFFERENT file than registration), verify the specific assertion against that line's code AND adjacent comments; follow callees. A consistent-LOOKING line is NOT a pass.
3. Classify the WHOLE row (exactly one): TRACED-CLEAN / C-NEAR-MISS (minor imprecision) / C-FIX (a clause CONTRADICTS the code) / WI2-FIX (asserts behavior with NO enforcing read-site).
${sharpen ? '\nSHARPENED RE-CHECK: a calibration row in the prior wave was mis-verified. Be maximally discriminating -- for any polarity/default claim QUOTE the exact enforcing line and confirm which value enables vs blocks. Do NOT relax toward TRACED-CLEAN, and do NOT over-flag a genuinely-correct row.\n' : ''}
flags_for_review (REQUIRED -- empty array if nothing): note any off-scope discovery, suspected bug, contradiction, runtime-dead suspect, or cross-mod override you hit while tracing.

Produce a per-clause table (clause | file:line | snippet | MATCH/MISMATCH/UNTRACEABLE) and return the structured result. READ-ONLY: do not write files, DB, or git.`
}

// ---- Synthesis: chunk knobs into groups of <=4, one agent per group ----
phase('Synthesis')
const groups = []
for (let i = 0; i < cfg.knobs.length; i += 4) groups.push(cfg.knobs.slice(i, i + 4))
log(`Chunk "${chunk.name}" (${chunk.shape}): ${cfg.knobs.length} knobs in ${groups.length} synth group(s); ${canaries.length} canary(ies).`)

const synthResults = await parallel(groups.map((g, gi) => () =>
  agent(synthPrompt(g), { schema: SYNTH_SCHEMA, model: 'opus', label: `synth:${chunk.name}#${gi + 1}(${g.length})`, phase: 'Synthesis' })
))
const records = synthResults.filter(Boolean).flatMap(r => r.records || [])
log(`Synthesis: ${records.length} records -- ${records.map(r => r.knob + '=' + r.description_verdict).join(', ')}`)

// ---- V-pass: every real knob + planted canaries, cold, one agent each ----
phase('V-pass')
const waveItems = [
  ...records.map(r => ({ knob: r.knob, description: r.description, canary: false })),
  ...canaries.map(c => ({ knob: c.knob, description: c.description, canary: true, groundTruth: c.groundTruth })),
]
const passes = (cls, gt) => gt === 'TRACED-CLEAN' ? cls === 'TRACED-CLEAN' : (cls === 'C-FIX' || cls === 'WI2-FIX')

async function runVpass(sharpen) {
  return await parallel(waveItems.map(it => () =>
    agent(vpassPrompt(it.knob, it.description, sharpen), { schema: VPASS_SCHEMA, model: 'opus', label: `vpass:${it.knob}${sharpen ? '(sharp)' : ''}`, phase: 'V-pass' })
  ))
}

let raw = await runVpass(false)
let canaryResults = waveItems.map((it, i) => it.canary ? { knob: it.knob, groundTruth: it.groundTruth, classification: raw[i] ? raw[i].classification : null, pass: !!(raw[i] && passes(raw[i].classification, it.groundTruth)) } : null).filter(Boolean)
let canaryAllPass = canaryResults.every(c => c.pass)
let redispatched = false

if (!canaryAllPass) {
  log(`HG1 FAIL: ${canaryResults.filter(c => !c.pass).map(c => c.knob + '=' + c.classification).join(', ')} -- one bounded sharpened V-pass re-dispatch.`)
  redispatched = true
  raw = await runVpass(true)
  canaryResults = waveItems.map((it, i) => it.canary ? { knob: it.knob, groundTruth: it.groundTruth, classification: raw[i] ? raw[i].classification : null, pass: !!(raw[i] && passes(raw[i].classification, it.groundTruth)) } : null).filter(Boolean)
  canaryAllPass = canaryResults.every(c => c.pass)
}

const vpass = waveItems.map((it, i) => (!it.canary && raw[i]) ? raw[i] : null).filter(Boolean)

// ---- Aggregate flags_for_review across both phases ----
const flags = []
for (const r of records) for (const f of (r.flags_for_review || [])) flags.push({ ...f, knob: r.knob, stage: 'synthesis' })
for (let i = 0; i < waveItems.length; i++) { if (raw[i]) for (const f of (raw[i].flags_for_review || [])) flags.push({ ...f, knob: waveItems[i].knob, stage: 'vpass', canary: waveItems[i].canary || false }) }

log(`V-pass done. Reals: ${vpass.map(v => v.knob + '=' + v.classification).join(', ')}. HG1 ${canaryAllPass ? 'PASS' : 'FAIL'}. flags_for_review: ${flags.length}.`)

return { anchor, chunk: chunk.name, synthesis: records, vpass, canaries: canaryResults, flags, canaryAllPass, redispatched }
