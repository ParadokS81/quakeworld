// Stage 5 -- report + decision (no LLM, no Voyage; pure aggregation).
//
// Consumes scratch/wf-b.json (judge verdicts + coherence) + scratch/arm-d-stats.json
// + scratch/units-summary.json + the pair files (qid -> channel/kind), and writes
// the results doc with per-pair win rates (overall + per channel), disentanglement
// metrics, cost, and a decision-rule verdict.
//
//   bun scripts/calibration/04-report.ts

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { SCRATCH, PAIR_DIR } from './config.ts';

const PROMPT_VERSION = 'v1';
const MODEL = 'sonnet';
const MARGIN = 0.10; // within +-10pp of 50% counts as "tracks closely / tie"
const OUT = join(import.meta.dir, '../../../docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md');

interface Verdict { pair: string; winner: 'arm1' | 'arm2' | 'tie'; reason: string }
interface Judged { qid: string; verdicts: Verdict[] }
interface Coh { id: string; score: number; note: string }

const CANON = [['D', 'C'], ['D', 'B'], ['C', 'B'], ['D', 'A']] as const;
const groupOf = (channel: string) => (channel === '#helpdesk' ? 'helpdesk' : channel === '#quakeworld' ? 'quakeworld' : 'anchor');
const chOfId = (id: string) => (id.includes('helpdesk') ? 'helpdesk' : id.includes('quakeworld') ? 'quakeworld' : 'other');

function pct(n: number, d: number): string { return d === 0 ? '-' : `${Math.round((100 * n) / d)}%`; }

function main(): void {
  const wfb = JSON.parse(readFileSync(join(SCRATCH, 'wf-b.json'), 'utf8')) as { judged: Judged[]; coherence: Coh[]; failures?: unknown };
  const dStats = JSON.parse(readFileSync(join(SCRATCH, 'arm-d-stats.json'), 'utf8')) as { chunkId: string; channel: string; totalIdx: number; oobIdx: number }[];
  const summary = JSON.parse(readFileSync(join(SCRATCH, 'units-summary.json'), 'utf8'));
  const wfbInput = JSON.parse(readFileSync(join(SCRATCH, 'wf-b-input.json'), 'utf8')) as { queryIds: string[]; cohIds: string[] };

  // qid -> {channel group, kind}
  const meta = new Map<string, { group: string; kind: string }>();
  for (const qid of wfbInput.queryIds) {
    try {
      const p = JSON.parse(readFileSync(join(PAIR_DIR, `${qid}.json`), 'utf8'));
      meta.set(qid, { group: groupOf(p.channel), kind: p.kind });
    } catch { meta.set(qid, { group: 'unknown', kind: 'unknown' }); }
  }

  // Tally wins per canonical pair, per group + overall.
  // tally[pairKey][group] = { [armLetter]: wins, tie: n }
  const GROUPS = ['overall', 'helpdesk', 'quakeworld', 'anchor'];
  const tally: Record<string, Record<string, Record<string, number>>> = {};
  for (const [a, b] of CANON) {
    tally[`${a}-${b}`] = {};
    for (const g of GROUPS) tally[`${a}-${b}`]![g] = { [a]: 0, [b]: 0, tie: 0 };
  }

  for (const j of wfb.judged) {
    const g = meta.get(j.qid)?.group ?? 'unknown';
    for (const v of j.verdicts) {
      const letters = (v.pair.match(/[ABCD]/g) ?? []).slice(0, 2);
      if (letters.length !== 2) continue;
      const canon = CANON.find((c) => c.includes(letters[0] as 'A') && c.includes(letters[1] as 'A'));
      if (!canon) continue;
      const key = `${canon[0]}-${canon[1]}`;
      const winnerLetter = v.winner === 'tie' ? 'tie' : (v.winner === 'arm1' ? letters[0]! : letters[1]!);
      for (const grp of ['overall', g]) {
        if (!tally[key]![grp]) continue;
        tally[key]![grp]![winnerLetter] = (tally[key]![grp]![winnerLetter] ?? 0) + 1;
      }
    }
  }

  // Coherence: arm-D threads (d-) vs arm-C segments (c-), overall + per channel.
  const coh = { D: [] as number[], C: [] as number[], byCh: {} as Record<string, { D: number[]; C: number[] }> };
  for (const c of wfb.coherence) {
    const arm = c.id.startsWith('d-') ? 'D' : c.id.startsWith('c-') ? 'C' : null;
    if (!arm) continue;
    coh[arm].push(c.score);
    const ch = chOfId(c.id);
    (coh.byCh[ch] ??= { D: [], C: [] })[arm].push(c.score);
  }
  const mean = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : '-');

  // Hallucination per channel: fraction = oob/total per chunk.
  const hByCh: Record<string, number[]> = {};
  for (const s of dStats) {
    if (s.totalIdx === 0) continue;
    (hByCh[s.channel] ??= []).push(s.oobIdx / s.totalIdx);
  }
  const fracStat = (xs: number[]) => (xs.length ? `mean ${(100 * xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)}% / max ${(100 * Math.max(...xs)).toFixed(1)}%` : '-');

  // --- Build markdown ---
  const L: string[] = [];
  L.push('# Layer 2 calibration test -- results', '');
  L.push(`**Probe:** does LLM topic-fencing (arm D) beat cheap mechanical segmentation (arm C) or dumb 15-min sessions (arm B) on retrieval quality for a real QuakeWorld Discord slice (Feb-Mar 2021, #helpdesk + #quakeworld)?`, '');
  L.push(`**Tagged:** model=${MODEL}, prompt=${PROMPT_VERSION}, eval=pairwise-judge-position-swap. Throwaway decision probe; numbers scope brainstorm Pass 3.`, '');
  L.push('## Per-pair win rates', '');
  L.push('Win = survives position-swap. Ties excluded from the rate denominator (reported separately). Read "D 70% / C 20% (tie 1)" as: of swap-surviving verdicts, D won 70%.', '');
  for (const [a, b] of CANON) {
    const key = `${a}-${b}`;
    L.push(`### ${a} vs ${b}`, '');
    L.push('| group | ' + `${a} wins | ${b} wins | ties | ${a} rate |`);
    L.push('|---|---|---|---|---|');
    for (const g of GROUPS) {
      const t = tally[key]![g]!;
      const decisive = (t[a] ?? 0) + (t[b] ?? 0);
      L.push(`| ${g} | ${t[a] ?? 0} | ${t[b] ?? 0} | ${t.tie ?? 0} | ${pct(t[a] ?? 0, decisive)} |`);
    }
    L.push('');
  }

  L.push('## Disentanglement', '');
  L.push('### Coherence (1-5; 5 = one clean topic)', '');
  L.push('| group | arm-D threads (mean) | arm-C segments (mean) |');
  L.push('|---|---|---|');
  L.push(`| overall | ${mean(coh.D)} (n=${coh.D.length}) | ${mean(coh.C)} (n=${coh.C.length}) |`);
  for (const ch of Object.keys(coh.byCh)) L.push(`| ${ch} | ${mean(coh.byCh[ch]!.D)} | ${mean(coh.byCh[ch]!.C)} |`);
  L.push('');
  L.push('### Arm-D index-hallucination (member_indices outside [1..N])', '');
  L.push('| channel | hallucination |');
  L.push('|---|---|');
  for (const ch of Object.keys(hByCh)) L.push(`| ${ch} | ${fracStat(hByCh[ch]!)} |`);
  L.push('');

  L.push('## Cost', '');
  L.push(`- Arms indexed: A=FTS, B=${summary.arms?.B} sessions, C=${summary.arms?.C} segments, D=${summary.arms?.D} fenced threads.`);
  L.push(`- Queries: ${summary.queries?.total} (${summary.queries?.reverseGen} reverse-gen + ${summary.queries?.anchors} Phase-8 anchors).`);
  L.push(`- Voyage embedding: ${summary.embed?.apiTokens} tokens, ${summary.embed?.apiCalls} API calls, ${summary.embed?.cacheHits} cache hits.`);
  L.push(`- Workflow agents: WF-A fence+qgen (see run log), WF-B judge ${wfbInput.queryIds.length} + coherence ${wfbInput.cohIds.length}. Model ${MODEL}. (No dollar figure -- Max subscription quota.)`);
  L.push('');

  // --- Decision-rule verdict (mechanical read; operator confirms) ---
  const rate = (key: string, g: string, arm: string) => {
    const t = tally[key]![g]!; const a = key.split('-')[0]!; const b = key.split('-')[1]!;
    const dec = (t[a] ?? 0) + (t[b] ?? 0); return dec === 0 ? null : (t[arm] ?? 0) / dec;
  };
  const dc = rate('D-C', 'overall', 'D');
  const dbv = rate('D-B', 'overall', 'D');
  const dav = rate('D-A', 'overall', 'D');
  const dcH = rate('D-C', 'helpdesk', 'D');
  const dcQ = rate('D-C', 'quakeworld', 'D');
  const close = (r: number | null) => r != null && Math.abs(r - 0.5) <= MARGIN;
  const sep = (r: number | null) => r != null && r - 0.5 > MARGIN;

  L.push('## Decision-rule verdict (mechanical read -- operator confirms)', '');
  const verdicts: string[] = [];
  if (close(dc)) verdicts.push(`- **C tracks D closely** (D-vs-C ${pctNum(dc)}): cheap signals win -- skip the LLM fence. Tiebreaker favours the cheaper arm (C).`);
  if (sep(dc)) verdicts.push(`- **D separates from C** (D-vs-C ${pctNum(dc)}): LLM fencing earns its cost. How-deep: read off hallucination above (low at cap 750 -> sweep size UP next).`);
  if (close(dbv)) verdicts.push(`- **B tracks D closely** (D-vs-B ${pctNum(dbv)}): don't re-segment -- embedding whole sessions is enough.`);
  if (sep(dbv)) verdicts.push(`- **D separates from B** (D-vs-B ${pctNum(dbv)}): tighter-than-session units help.`);
  if (close(dav)) verdicts.push(`- **A ties D** (D-vs-A ${pctNum(dav)}): embedding isn't the bottleneck vs lexical FTS -- park the embedding lever / revisit query set.`);
  if (dcH != null && dcQ != null && Math.abs(dcH - dcQ) > 0.2) {
    verdicts.push(`- **Per-channel asymmetry** (D-vs-C helpdesk ${pctNum(dcH)} vs quakeworld ${pctNum(dcQ)}): consider LLM fencing only where the channel is messy.`);
  }
  if (verdicts.length === 0) verdicts.push('- Inconclusive on the mechanical thresholds -- inspect the per-pair tables and reasons directly.');
  L.push(...verdicts, '');
  L.push('> Tiebreaker (verbatim): a close call defaults to the cheaper arm. Margin = +-10pp of 50%.', '');

  Bun.write(OUT, L.join('\n'));
  console.log(`[04] wrote ${OUT}`);
  console.log(`[04] D-vs-C overall ${pctNum(dc)} | D-vs-B ${pctNum(dbv)} | D-vs-A ${pctNum(dav)} | D-vs-C helpdesk ${pctNum(dcH)} quakeworld ${pctNum(dcQ)}`);
}

function pctNum(r: number | null): string { return r == null ? 'n/a' : `${Math.round(r * 100)}% D`; }

if (import.meta.main) main();
