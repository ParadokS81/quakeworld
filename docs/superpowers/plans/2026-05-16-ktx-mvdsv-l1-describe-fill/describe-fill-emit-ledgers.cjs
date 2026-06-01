// MVDSV describe-fill -- emit per-knob ledgers from a chunk-runner workflow result.
//
//   node describe-fill-emit-ledgers.cjs <result.json> <cluster> [outdir]
//
// <result.json>  the workflow task output file (/tmp/.../tasks/<id>.output), whose
//                .result carries { synthesis[], vpass[], canaries[], flags[], ... }.
// <cluster>      short slug for the ledger filenames (e.g. "c3-dead-hidden").
// [outdir]       defaults to this script's directory.
//
// Emits  mvdsv-<cluster>-ledger-<knob>.md  with EXACTLY ONE fenced ```json D6Record
// (parsed by synthesize-mvdsv.ts --from-ledger) plus human review sections. The JSON
// is built with JSON.stringify so escaping is always valid. source_ref is folded into
// description_reasoning (it is not a DB column). Apply any operator concision edits to
// the emitted ledgers before --from-ledger, then persist.

const fs = require('fs');
const path = require('path');

const [resultPath, cluster, outArg] = process.argv.slice(2);
if (!resultPath || !cluster) {
  console.error('usage: node describe-fill-emit-ledgers.cjs <result.json> <cluster> [outdir]');
  process.exit(1);
}
const OUTDIR = outArg || __dirname;

const top = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const result = top.result || top;            // tolerate {result:{...}} or a bare result
const records = result.synthesis || [];
const vpass = result.vpass || [];
const canaries = result.canaries || [];
const allFlags = result.flags || [];
const anchor = result.anchor || '';

function quoteBlock(text) {
  return text.split('\n').map(l => (l.length ? '> ' + l : '>')).join('\n');
}
function flagLines(knob) {
  const fs_ = allFlags.filter(f => f.knob === knob);
  if (!fs_.length) return '- none';
  return fs_.map(f => `- [${f.severity}/${f.kind}/${f.stage}] ${f.observation}`).join('\n');
}

let n = 0;
for (const r of records) {
  const vp = vpass.find(v => v && v.knob === r.knob) || {};
  const reasoning = `primary source_ref ${r.source_ref}. ${r.description_reasoning}`;

  const d6 = {
    project: 'mvdsv',
    knob: r.knob,
    type: r.type || 'cvar',
    description: r.description,
    description_origin: r.description_origin || 'synthesized',
    description_anchor_version: r.description_anchor_version || anchor,
    description_provenance: null,
    description_verdict: r.description_verdict || 'synthesized',
    description_confidence: r.description_confidence || 'high',
    description_reasoning: reasoning,
    description_proposed: null,
  };

  const md = [
    `# describe-fill-synthesis ledger -- mvdsv \`${r.knob}\``,
    ``,
    `- **project:** mvdsv`,
    `- **knob:** \`${r.knob}\` (${d6.type})`,
    `- **anchor_version:** \`${d6.description_anchor_version}\``,
    `- **verdict:** \`${d6.description_verdict}\` -- ${d6.description_confidence} confidence; independently V-pass-verified ${vp.classification || 'n/a'}`,
    `- **origin:** workflow chunk-runner \`${cluster}\` -- synthesis + independent cold V-pass`,
    ``,
    `## Halt verdict`,
    ``, '```', r.verdict_line || '(none)', '```', ``,
    `## Final \`description\` (user-facing, D20 shape)`,
    ``, quoteBlock(d6.description), ``,
    `## Per-clause enforce-trace table (synthesis)`,
    ``, (r.enforce_trace_table || '_(none)_'), ``,
    `## Independent V-pass (cold; knob + description only)`,
    ``, `**Classification: ${vp.classification || 'n/a'}**`, ``,
    (vp.per_clause_table || '_(none)_'), ``,
    (vp.notes ? '**V-pass notes:** ' + vp.notes : ''), ``,
    `## flags_for_review`,
    ``, flagLines(r.knob), ``,
    `## Gate log`,
    ``,
    `- **HG1 (canary):** chunk canary gate ${result.canaryAllPass ? 'PASS' : 'FAIL'} (canaries: ${canaries.map(c => c.knob + '=' + c.classification).join(', ') || 'none'}).`,
    `- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).`,
    ``,
    `## D6Record (the EXACTLY-ONE json block parsed by \`synthesize-mvdsv.ts --from-ledger\`)`,
    ``, '```json', JSON.stringify(d6, null, 2), '```', ``,
  ].join('\n');

  fs.writeFileSync(path.join(OUTDIR, `mvdsv-${cluster}-ledger-${r.knob}.md`), md);
  console.log('wrote mvdsv-' + cluster + '-ledger-' + r.knob + '.md');
  n++;
}
console.log(`done: ${n} ledger(s). flags_for_review across chunk: ${allFlags.length}.`);
if (allFlags.length) for (const f of allFlags) console.log(`  FLAG [${f.severity}/${f.kind}] ${f.knob} (${f.stage}): ${f.observation}`);
