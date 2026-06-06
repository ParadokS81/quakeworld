// apps/qw-oracle/scripts/load-chat/gate-compare.ts
//
// Gate comparison harness for D11 (decisions.md): NEW thread retrieval vs OLD
// session-FTS, run against the ~24 answerable reverse-generated queries from
// the Feb-Mar 2021 probe slice (wf-a.json, answerable === true && question).
//
// R12 FAIRNESS NOTE: The NEW path (searchSolvedIssues) searches ONLY the
// Feb-Mar 2021 chat_threads slice (~1008 threads). The OLD path (session-FTS)
// searches the FULL corpus (all years of session_search). If the 2021-only
// threads still produce comparable or better hits than the full-corpus FTS,
// the result is only stronger evidence for the thread model.
//
// This script is a throwaway operator-review artifact, NOT production code.
// It REPORTS; the operator judges (D11). Do not add a verdict.

import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { db, closeDb } from '../../shared/db.ts';
import { searchSolvedIssues } from '../../serve/mcp/src/tools/search-solved-issues.ts';
import { PHASE8_ANCHORS } from '../calibration/phase8.ts';
import type { ThreadHit } from '../../serve/mcp/src/types.ts';

// --- types for OLD session-FTS path ------------------------------------------

interface FtsRow {
  session_id: string;
  rank: number;
}

interface SessionHeaderRow {
  channel_name: string;
  started_at: string;
}

interface MessageSnippetRow {
  author_name: string;
  content: string;
}

// --- OLD session-FTS: replicate the pre-rewire search_solved_issues SQL -------
// The old code was overwritten in Task 4; this replicates its behavior exactly
// as documented in the task spec so the comparison is fair.

async function oldSessionFts(query: string): Promise<Array<{
  session_id: string;
  rank: number;
  channel_name: string;
  started_at: string;
  messages: Array<{ author_name: string; content: string }>;
}>> {
  let ftsRows: FtsRow[];
  try {
    ftsRows = await db<FtsRow[]>`
      SELECT ss.session_id::text AS session_id,
             ts_rank(ss.session_tsv, websearch_to_tsquery('simple', ${query})) AS rank
      FROM session_search ss
      WHERE ss.session_tsv @@ websearch_to_tsquery('simple', ${query})
        AND ss.chat_message_count >= 5
      ORDER BY rank DESC
      LIMIT 3
    `;
  } catch {
    // tsquery rejects malformed query strings; treat as no hits (same as old code)
    return [];
  }

  const results = [];
  for (const row of ftsRows) {
    // Fetch the session header (channel + timestamp) for the readable label
    const headers = await db<SessionHeaderRow[]>`
      SELECT channel_name, started_at::text AS started_at
      FROM sessions
      WHERE id = ${row.session_id}::bigint
      LIMIT 1
    `;
    const header = headers[0] ?? { channel_name: '(unknown)', started_at: '' };

    // Hydrate the first few chat messages for a snippet preview
    const snippets = await db<MessageSnippetRow[]>`
      SELECT m.author_name, m.content
      FROM messages m
      JOIN message_labels l ON l.message_id = m.id
      WHERE l.session_id = ${row.session_id}::bigint
        AND l.category = 'chat'
      ORDER BY m.created_at
      LIMIT 4
    `;

    results.push({
      session_id: row.session_id,
      rank: row.rank,
      channel_name: header.channel_name,
      started_at: header.started_at,
      messages: snippets,
    });
  }
  return results;
}

// --- formatting helpers -------------------------------------------------------

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : text.slice(0, max - 3) + '...';
}

function formatDateShort(iso: string | Date | null | undefined): string {
  // postgres-js may return timestamps as Date objects; normalize to string first.
  if (!iso) return '(no date)';
  const s = typeof iso === 'string' ? iso : iso.toISOString();
  return s.slice(0, 10);
}

function renderNewHit(hit: ThreadHit, score: number): string {
  const lines: string[] = [];
  lines.push(`  - **${truncate(hit.topic_label, 80)}**`);
  lines.push(`    channel: ${hit.channel} | ${formatDateShort(hit.date_range_start)} | msgs: ${hit.message_count} | score: ${score.toFixed(4)}`);
  // Show first 3 member messages as preview
  const preview = hit.messages.slice(0, 3);
  for (const m of preview) {
    lines.push(`    > ${truncate(m.author, 16)}: ${truncate(m.text, 160)}`);
  }
  return lines.join('\n');
}

function renderOldHit(hit: {
  session_id: string;
  rank: number;
  channel_name: string;
  started_at: string;
  messages: Array<{ author_name: string; content: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`  - session ${hit.session_id} | channel: ${hit.channel_name} | ${formatDateShort(hit.started_at)} | rank: ${hit.rank.toFixed(4)}`);
  const preview = hit.messages.slice(0, 3);
  for (const m of preview) {
    lines.push(`    > ${truncate(m.author_name, 16)}: ${truncate(m.content, 160)}`);
  }
  return lines.join('\n');
}

// --- main --------------------------------------------------------------------

interface ReverseGenQuery {
  sessionId: number;
  answerable: boolean;
  question: string;
}

if (import.meta.main) {
  const scratchDir = join(import.meta.dir, '../calibration/scratch');
  const outPath = join(scratchDir, 'gate-A-compare.md');

  // Load reverse-generated queries from the wf-a workfile.
  // The file lives alongside other calibration scratch assets (arm-d-stats.json,
  // pairs/, etc.) and was produced by the Task 3 workfile-A generator.
  const wfAPath = join(import.meta.dir, '../calibration/scratch/wf-a.json');
  const wfA = JSON.parse(await Bun.file(wfAPath).text()) as { queries: ReverseGenQuery[] };
  const rgQueries = wfA.queries.filter(
    (q) => q.answerable === true && typeof q.question === 'string' && q.question.trim().length > 0,
  );

  const mdLines: string[] = [];

  // ---- header ----------------------------------------------------------------
  mdLines.push('# Gate A Comparison: Thread Retrieval vs Session-FTS');
  mdLines.push('');
  mdLines.push('**Gate asked (D11):** Do fenced threads beat session-FTS on in-slice live queries?');
  mdLines.push('**Operator judges.** This file is the evidence; the decision is NOT made here.');
  mdLines.push('');
  mdLines.push('## R12 Fairness Note (Asymmetry)');
  mdLines.push('');
  mdLines.push('- **NEW path**: searches ONLY Feb-Mar 2021 chat_threads (~1008 threads loaded in increment 1).');
  mdLines.push('- **OLD path**: searches the FULL corpus -- all years of session_search (no date restriction applied per the Open-Question default).');
  mdLines.push('- The reverse-generated queries below were generated FROM 2021 sessions, so they are guaranteed in-slice for the NEW path. If 2021-only threads still produce comparable or better hits than the full-corpus FTS, the evidence for the thread model is only stronger.');
  mdLines.push('- The Phase-8 anchors are 2026-sourced and are a NOISIER cross-check (labeled separately).');
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## Primary Signal: Reverse-Generated Queries (in-slice, ~24 queries)');
  mdLines.push('');

  // Per-query tally for stdout
  const tallyLines: string[] = [];

  try {
    for (const rq of rgQueries) {
      const label = `rg-${rq.sessionId}`;

      // Run both paths concurrently; they are independent queries
      const [newResp, oldHits] = await Promise.all([
        searchSolvedIssues({ query: rq.question, limit: 3 }),
        oldSessionFts(rq.question),
      ]);

      const newCount = newResp.results.length;
      const oldCount = oldHits.length;
      const newQuality = newResp.match_quality;

      tallyLines.push(`${label}: NEW ${newCount} hits (${newQuality}) | OLD ${oldCount} hits`);

      // Section header
      mdLines.push(`### ${label}: ${truncate(rq.question, 100)}`);
      mdLines.push('');

      // NEW block
      mdLines.push('#### NEW (threads -- 2021-slice only)');
      mdLines.push(`match_quality: **${newQuality}**`);
      mdLines.push('');
      if (newResp.results.length === 0) {
        mdLines.push('_No hits._');
      } else {
        for (const hit of newResp.results) {
          mdLines.push(renderNewHit(hit, hit.score));
        }
      }
      mdLines.push('');

      // OLD block
      mdLines.push('#### OLD (sessions -- full corpus)');
      mdLines.push('');
      if (oldHits.length === 0) {
        mdLines.push('_No hits._');
      } else {
        for (const hit of oldHits) {
          mdLines.push(renderOldHit(hit));
        }
      }
      mdLines.push('');
      mdLines.push('---');
      mdLines.push('');
    }

    // ---- secondary section: Phase-8 anchors -----------------------------------
    mdLines.push('## NOISIER CROSS-CHECK (Phase-8 anchors, 2026-sourced -- NOT the primary gate signal)');
    mdLines.push('');
    mdLines.push('These 12 queries were hand-curated from #helpdesk in 2026. They are outside the 2021 in-slice guarantee, so the NEW path has no coverage promise here. Two are deliberately out-of-corpus. Use only as a sanity cross-check, never as the gate decision basis.');
    mdLines.push('');

    for (const anchor of PHASE8_ANCHORS) {
      const [newResp, oldHits] = await Promise.all([
        searchSolvedIssues({ query: anchor.query, limit: 3 }),
        oldSessionFts(anchor.query),
      ]);

      const newCount = newResp.results.length;
      const oldCount = oldHits.length;
      const newQuality = newResp.match_quality;

      tallyLines.push(`${anchor.id}[${anchor.category}]: NEW ${newCount} hits (${newQuality}) | OLD ${oldCount} hits`);

      mdLines.push(`### ${anchor.id} [${anchor.category}]: ${truncate(anchor.query, 100)}`);
      mdLines.push('');

      mdLines.push('#### NEW (threads -- 2021-slice only)');
      mdLines.push(`match_quality: **${newQuality}**`);
      mdLines.push('');
      if (newResp.results.length === 0) {
        mdLines.push('_No hits._');
      } else {
        for (const hit of newResp.results) {
          mdLines.push(renderNewHit(hit, hit.score));
        }
      }
      mdLines.push('');

      mdLines.push('#### OLD (sessions -- full corpus)');
      mdLines.push('');
      if (oldHits.length === 0) {
        mdLines.push('_No hits._');
      } else {
        for (const hit of oldHits) {
          mdLines.push(renderOldHit(hit));
        }
      }
      mdLines.push('');
      mdLines.push('---');
      mdLines.push('');
    }

    // ---- write .md file -------------------------------------------------------
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(outPath, mdLines.join('\n'), 'utf8');

    // ---- stdout report --------------------------------------------------------
    console.log(`\nWritten: ${outPath}`);
    console.log(`Reverse-gen queries compared: ${rgQueries.length}`);
    console.log('');
    console.log('Per-query tally:');
    for (const line of tallyLines) {
      console.log(' ', line);
    }
  } finally {
    await closeDb();
  }
}
