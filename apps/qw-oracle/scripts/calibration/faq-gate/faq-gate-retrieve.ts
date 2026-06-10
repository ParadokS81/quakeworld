// faq-gate-retrieve.ts  -- Stage 1 of the per-domain FAQ acceptance gate
//
// Deterministic Bun script. Retrieves grounding for a representative sample of
// threads in one taxonomy domain and writes three artifacts per thread:
//
//   outputs/<domain>/q-<id>.md        -- question + grounding bundle (feed to LLM)
//   outputs/<domain>/truth-<id>.md    -- community answer (feed to judge)
//   outputs/<domain>/grounding.json   -- machine-readable array for Stage 2
//
// Usage:
//   bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain weapon-scripts
//   bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain weapon-scripts --threads 12393
//   bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain weapon-scripts --threads 12393,11350
//
// The --threads override bypasses cluster sampling and uses exactly those IDs.
// Useful for self-verification with known-good fixtures (thread 12393).

import postgres from 'postgres';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchConcepts } from '/home/paradoks/projects/quakeworld/apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts';
import { searchSolvedIssues } from '/home/paradoks/projects/quakeworld/apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts';
import { searchEntities } from '/home/paradoks/projects/quakeworld/apps/qw-oracle/serve/mcp/src/tools/search-entities.ts';
import { lookupEntity } from '/home/paradoks/projects/quakeworld/apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts';
import { getConceptNote } from '/home/paradoks/projects/quakeworld/apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts';
import { resolveDomainThreads } from './faq-domains-resolve.ts';

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const domainIdx = args.indexOf('--domain');
const threadsIdx = args.indexOf('--threads');

if (domainIdx === -1 || !args[domainIdx + 1]) {
  console.error('Usage: bun faq-gate-retrieve.ts --domain <key> [--threads <id,id,...>]');
  process.exit(1);
}
const domainKey = args[domainIdx + 1]!;

let threadIds: number[];
if (threadsIdx !== -1 && args[threadsIdx + 1]) {
  // Explicit override: comma-separated list.
  threadIds = args[threadsIdx + 1]!.split(',').map((s) => Number(s.trim()));
} else {
  // Domain-cluster resolution: 3 representative threads.
  const resolved = resolveDomainThreads(domainKey, { limit: 3 });
  threadIds = resolved.threadIds;
  console.log(`Resolved domain "${domainKey}": ${resolved.clusterCount} cluster(s), ${resolved.totalThreads} total threads. Using sample:`, threadIds);
}

// ---------------------------------------------------------------------------
// Output directory: outputs/<domain>/  (relative to this script's location)
// ---------------------------------------------------------------------------
const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, 'outputs', domainKey);
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers -- lifted verbatim from faq-retrieve.ts (behavior-preserving)
// ---------------------------------------------------------------------------

/** Split a chat thread's raw content into the asker's opening block + the rest.
 *  The "opening" is used as the question q fed to retrieval. */
function splitQ(content: string): { opening: string; rest: string } {
  const lines = (content ?? '').split('\n');
  const m = lines[0]?.match(/^([^:]{1,40}):\s/);
  const asker = m?.[1];
  if (!asker) return { opening: lines.slice(0, 4).join('\n'), rest: lines.slice(4).join('\n') };
  let i = 0;
  for (; i < lines.length; i++) {
    const sm = lines[i]?.match(/^([^:]{1,40}):\s/);
    if (sm && sm[1] !== asker) break;
  }
  return {
    opening: lines.slice(0, i).join('\n').trim(),
    rest: lines.slice(i).join('\n').trim(),
  };
}

/** Extract candidate cvar-like tokens from a question string.
 *  Pattern: short word prefix followed by underscore(s) and more alphanumerics.
 *  Returns up to 6 unique lowercase tokens. */
const cvarToks = (q: string): string[] =>
  [...new Set((q.toLowerCase().matchAll(/\b([a-z]{1,5}_[a-z0-9_]+)\b/g) ?? []))].map(m => m[1]!).slice(0, 6);

// ---------------------------------------------------------------------------
// Grounding bundle format -- must match the POC q-*.md format EXACTLY so the
// Stage-2 executor can diff them against the known-good fixture.
// ---------------------------------------------------------------------------

interface GroundingEntry {
  threadId: number;
  question: string;
  grounding: string;
  truth: string;
}

const groundingEntries: GroundingEntry[] = [];
const qualRows: Array<Record<string, unknown>> = [];

try {
  for (const id of threadIds) {
    const rows = await sql<Array<{ content: string }>>`SELECT content FROM chat_threads WHERE id = ${id}`;
    if (!rows[0]) {
      console.warn(`Thread ${id} not found in chat_threads -- skipping`);
      continue;
    }
    const { opening, rest } = splitQ(rows[0].content);
    const q = opening;

    // --- four-tool retrieval block -- lifted from faq-retrieve.ts verbatim ---
    const concepts = await searchConcepts({ query: q, limit: 4 });
    const issuesRaw = await searchSolvedIssues({ query: q, limit: 5, max_messages_per_session: 10 });
    // self-exclusion: drop the thread we're grounding from the solved-issues results
    const issues = {
      ...issuesRaw,
      results: issuesRaw.results.filter((r: any) => String(r.thread_id) !== String(id)).slice(0, 3),
    };
    const entities = await searchEntities({ query: q, limit: 8 });
    const lookups: Array<{ tok: string; hit: any }> = [];
    for (const tok of cvarToks(q)) {
      const r = await lookupEntity({ name: tok });
      if (r.results?.length) lookups.push({ tok, hit: r.results[0] });
    }

    qualRows.push({
      id,
      concepts: concepts.match_quality,
      c_top: concepts.results[0]?.slug ?? '-',
      issues: issues.match_quality,
      e: entities.match_quality,
      lookups: lookups.map((l) => l.tok).join(',') || '-',
    });

    // --- build grounding bundle (exact section order + formatting from POC) ---
    let b = `# Oracle grounding for thread #${id} [${domainKey}]\n\n## USER QUESTION\n${q}\n\n`;
    b += `## search_concepts (L3) [match=${concepts.match_quality}]\n`;
    for (const [i, c] of concepts.results.entries()) {
      b += `- **${c.title}** (concept:${c.slug}, ${c.match_quality})\n`;
      b += `  summary: ${c.summary}\n`;
      if (i === 0) {
        // Top-ranked hit gets the FULL note body, not the 600-char snippet. This
        // mirrors the real Oracle serving path: search_concepts returns a thin
        // snippet, and a consumer that needs more calls get_concept_note for the
        // whole note. The snippet's truncation window dropped grounded entities
        // (e.g. hud_tracking_show) and forced false PARTIALs -- the F11 fix.
        const note = await getConceptNote({ id: c.slug });
        const fullBody = note.results[0]?.body ?? c.snippet;
        b += `  full_note_body (top hit):\n${fullBody}\n`;
      } else {
        b += `  snippet: ${c.snippet}\n`;
      }
      b += `  related_entities: ${(c.related_entities || []).slice(0, 12).join(', ')}\n`;
    }
    b += `\n## search_entities (L1) [match=${entities.match_quality}]\n`;
    for (const e of entities.results as any[]) {
      b += `- ${e.canonical_id ?? e.name} [${e.project}/${e.type}]: ${(e.description || '').slice(0, 260)}\n`;
    }
    // lookup_entity section only emitted when there are cvar-token hits
    if (lookups.length) {
      b += `\n## lookup_entity (exact cvar tokens)\n`;
      for (const l of lookups) {
        b += `- ${l.tok} -> ${l.hit.canonical_id ?? l.hit.name}: ${(l.hit.description || '').slice(0, 260)}\n`;
      }
    }
    b += `\n## search_solved_issues (L2, self excluded) [match=${issues.match_quality}]\n`;
    for (const s of issues.results as any[]) {
      b += `- thread "${s.topic_label}" (${s.resolution_status}, ${String(s.date_range_start).slice(0, 10)}):\n`;
      for (const msg of (s.messages || []).slice(0, 8)) {
        b += `    ${msg.author}: ${(msg.text || '').slice(0, 200)}\n`;
      }
    }

    const truthContent = `# Community resolution for #${id} [${domainKey}]\n\n## QUESTION\n${q}\n\n## WHAT THE COMMUNITY SAID\n${rest.slice(0, 3500)}`;

    writeFileSync(join(outDir, `q-${id}.md`), b);
    writeFileSync(join(outDir, `truth-${id}.md`), truthContent);

    groundingEntries.push({ threadId: id, question: q, grounding: b, truth: rest.slice(0, 3500) });
    console.log(`  wrote q-${id}.md  truth-${id}.md`);
  }

  // Machine-readable bundle for Stage 2 Workflow script
  writeFileSync(join(outDir, 'grounding.json'), JSON.stringify(groundingEntries, null, 2));

  console.log('\nRETRIEVAL QUALITY PER THREAD:');
  console.table(qualRows);
  console.log(`\nOutputs written to: ${outDir}`);
  console.log(`grounding.json: ${groundingEntries.length} entries`);
  // Record retrieval mode for gate assembly
  const mode = process.env.VOYAGE_API_KEY ? 'hybrid' : 'fts-only';
  console.log(`retrieval_mode: ${mode}`);
} finally {
  await sql.end();
}
