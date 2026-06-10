// faq-gate-confab.ts -- Stage 3 of the per-domain FAQ acceptance gate
//
// Deterministic Bun script. Reads answer-*.md files from outputs/<domain>/,
// extracts claimed entity-like tokens, and classifies each as:
//
//   (a) hard confab -- absent from L1 AND not a multi-word/syntax artifact.
//       Any hard confab FAILS the gate.
//   (b) soft flag -- present in L1 but absent from the thread's grounding text.
//       A real entity named from training knowledge, not retrieval. Flag only,
//       not a gate-fail.
//   (c) ok -- present in L1 and present in grounding (or a known command word).
//
// Also cross-checks against the Stage-2 claimedEntities self-report when an
// answers-<domain>.json file (produced by the executor after the Workflow run) is
// present alongside the answer markdown -- reduces false-positive extraction.
//
// Key sharpening vs the POC faq-verify.ts:
//   - SELF-REPORT section (meta-keys like `layers_used`, `honest_failure`) is
//     stripped before extraction -- those keys are NOT entity claims.
//   - Alias definition NAMES (`alias lg_state ...`) are stripped -- user-defined
//     names are not QW entities; only what the alias calls (command tokens) matters.
//   - Backtick extraction preserves +/- prefix so `+fire_ar` is checked as
//     `+fire_ar` in L1, not the bare `fire_ar` form.
//   - Discord username patterns in answer headers are suppressed.
//
// Usage:
//   bun scripts/calibration/faq-gate/faq-gate-confab.ts --domain weapon-scripts
//
// Output:
//   Prints per-thread JSON to stdout (executor folds into gate-<domain>.json).
//   Exits 0 if gate passes (zero hard confab), 1 if any hard confab found.

import postgres from 'postgres';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
const cliArgs = process.argv.slice(2);
const domainIdx = cliArgs.indexOf('--domain');
if (domainIdx === -1 || !cliArgs[domainIdx + 1]) {
  console.error('Usage: bun faq-gate-confab.ts --domain <key>');
  process.exit(1);
}
const domainKey = cliArgs[domainIdx + 1]!;

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, 'outputs', domainKey);

if (!existsSync(outDir)) {
  console.error(`Output directory not found: ${outDir}`);
  console.error(`Run Stage 1 first: bun faq-gate-retrieve.ts --domain ${domainKey}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load Stage-2 answer self-reports if available (answers-<domain>.json written
// by executor after Workflow run; optional -- graceful absent)
// ---------------------------------------------------------------------------
interface WorkflowResult {
  threadId: number;
  claimedEntities: string[];
  verdict: string;
  justification: string;
}

const wfResultsPath = join(outDir, `answers-${domainKey}.json`);
const wfResultsMap = new Map<number, WorkflowResult>();
if (existsSync(wfResultsPath)) {
  const wfData = JSON.parse(readFileSync(wfResultsPath, 'utf8')) as WorkflowResult[];
  for (const r of wfData) wfResultsMap.set(r.threadId, r);
  console.error(`Loaded Workflow self-reports for ${wfResultsMap.size} thread(s) from ${wfResultsPath}`);
}

// ---------------------------------------------------------------------------
// Token extraction helpers -- lifted from faq-verify.ts, sharpened
// ---------------------------------------------------------------------------

/** Known command words that are valid claimed entities even without underscore.
 *  These are genuine QW commands, not artifacts of text extraction. */
const KNOWN_COMMANDS = new Set([
  'record', 'stop', 'weapon', 'bind', 'gamma', 'contrast', 'crosshair',
  'impulse', 'unbind', 'exec', 'fov', 'sensitivity', 'alias', 'connect',
  'quit', 'disconnect', 'playdemo', 'timedemo', 'say', 'tell', 'setinfo',
]);

/** Strip the SELF-REPORT section (everything from "# SELF-REPORT" onwards).
 *  This section contains meta-keys like `layers_used`, `honest_failure`, etc.
 *  that look like underscore tokens but are NOT entity claims. */
function stripSelfReport(text: string): string {
  const idx = text.search(/^#\s*SELF.?REPORT/im);
  if (idx === -1) return text;
  // Also eat a preceding horizontal rule line if it immediately precedes the heading
  const hrIdx = text.lastIndexOf('\n---', idx);
  const cutAt = hrIdx !== -1 && (idx - hrIdx) < 6 ? hrIdx : idx;
  return text.slice(0, cutAt);
}

/** Collect alias DEFINITION names (e.g. `alias lg_state ...`).
 *  These are user-chosen custom names -- NOT engine entities. Exclude from confab checking. */
function collectAliasDefNames(text: string): Set<string> {
  const names = new Set<string>();
  for (const m of text.matchAll(/^\s*alias\s+([+\-]?[a-zA-Z][a-zA-Z0-9_]*)/gm)) {
    names.add(m[1]!.toLowerCase());
  }
  return names;
}

/** Patterns that are multi-word/syntax artifacts, not confabulated entity names. */
function isArtifact(tok: string): boolean {
  if (/^[0-9]/.test(tok)) return true;  // starts with digit
  if (/^_/.test(tok)) return true;        // leading underscore
  if (/_$/.test(tok)) return true;        // trailing underscore
  // 5+ underscore-separated segments: almost always a path/code artifact
  if (tok.split('_').length > 5) return true;
  return false;
}

/** Strip the answer header line (e.g. "# Answer to username (thread #123)").
 *  Discord usernames like `akira_qw` appear there and match the underscore pattern
 *  but are not entity claims. */
function stripAnswerHeader(text: string): string {
  return text.replace(/^#\s*Answer to[^\n]*\n/i, '');
}

/** Check if every occurrence of `bare` in `text` is immediately preceded by + or -.
 *  If so, it's exclusively used as a prefixed command and should be checked as
 *  the prefixed form (e.g. `+fire_ar`) rather than bare `fire_ar`. */
function appearsOnlyPrefixed(bare: string, text: string): boolean {
  const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Find all word-boundary occurrences
  const allRe = new RegExp(`\\b${escaped}\\b`, 'g');
  const prefixedRe = new RegExp(`[+\\-]${escaped}\\b`, 'g');
  const allMatches = [...text.matchAll(allRe)];
  if (allMatches.length === 0) return false;
  const prefixedMatches = [...text.matchAll(prefixedRe)];
  return prefixedMatches.length === allMatches.length;
}

/** Extract claimed entity tokens from answer text.
 *  Preserves +/- prefix so `+fire_ar` is a separate candidate from `fire_ar`.
 *  Tokens that appear ONLY in prefixed form (+X or -X) in the text are added as
 *  the prefixed form, not the bare form. */
function extractClaimedTokens(text: string): Set<string> {
  // Strip SELF-REPORT section (contains meta-keys like layers_used, honest_failure)
  let body = stripSelfReport(text);
  // Strip answer header line (contains Discord username like akira_qw)
  body = stripAnswerHeader(body);

  // Collect alias definition names to exclude
  const aliasDefNames = collectAliasDefNames(body);

  const claimed = new Set<string>();

  // backtick-wrapped tokens: `foo_bar`, `+fire_ar`, `-lg`, `bind`, etc.
  // Multi-word spans like `+fire_ar <priorities>` don't match; handled below.
  for (const m of body.matchAll(/`([+\-]?[a-zA-Z][a-zA-Z0-9_]*)`/g)) {
    const raw = m[1]!.toLowerCase();
    if (raw.includes('_') || KNOWN_COMMANDS.has(raw)) {
      claimed.add(raw);
    }
  }

  // bare underscore-cvar shapes in prose: cl_something, show_fps, etc.
  // For each bare token, check if it appears ONLY as a prefixed form (+X / -X)
  // in the body. If so, add the prefixed form instead.
  for (const m of body.matchAll(/\b([a-z][a-z0-9]*_[a-z0-9_]+)\b/g)) {
    const tok = m[1]!.toLowerCase();
    if (appearsOnlyPrefixed(tok, body)) {
      // The bare form is exclusively used as +tok or -tok; represent as +tok in L1
      // (we don't know which prefix, but + is the dominant QW form for commands).
      // The prefixed `+tok` will be L1-checked; if the bare `tok` isn't in L1 it's
      // not a confab -- it's the bare suffix of a prefixed command.
      claimed.add(`+${tok}`);
    } else {
      claimed.add(tok);
    }
  }

  // Remove alias definition names -- user-defined aliases are not QW entities
  for (const name of aliasDefNames) {
    claimed.delete(name);
    claimed.delete(`+${name}`);
    claimed.delete(`-${name}`);
    claimed.delete(name.replace(/^[+\-]/, ''));
  }

  return claimed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface ThreadConfabResult {
  threadId: number;
  claimedCount: number;
  hardConfab: string[];
  softFlags: string[];
  ok: string[];
  gatePass: boolean;
}

const results: ThreadConfabResult[] = [];
let anyHardConfab = false;

try {
  const answerFiles = readdirSync(outDir).filter((f) => f.startsWith('answer-') && f.endsWith('.md'));
  if (answerFiles.length === 0) {
    console.error(`No answer-*.md files found in ${outDir}`);
    console.error('Stage 2 (Workflow) must run before Stage 3 (confab).');
    process.exit(1);
  }

  for (const fname of answerFiles.sort()) {
    const tidMatch = fname.match(/^answer-(\d+)\.md$/);
    if (!tidMatch) continue;
    const threadId = Number(tidMatch[1]);

    const answerText = readFileSync(join(outDir, fname), 'utf8');

    // Union markdown extraction with Stage-2 self-report (reduces false positives)
    const extractedTokens = extractClaimedTokens(answerText);
    const wfResult = wfResultsMap.get(threadId);
    if (wfResult) {
      // F13 (sibling to F8): the prose path strips user-defined alias NAMES via
      // collectAliasDefNames, but the self-report union historically bypassed that
      // filter -- so an over-reported alias name (e.g. `cycle_space`) re-entered as
      // a spurious hard confab and failed the gate. Run the self-report tokens
      // through the SAME alias-def-name exclusion + prefix normalization, computed
      // from the same stripped body the prose extractor uses.
      const body = stripAnswerHeader(stripSelfReport(answerText));
      const aliasDefBareNames = new Set(
        [...collectAliasDefNames(body)].map((n) => n.replace(/^[+\-]/, '')),
      );
      for (const e of wfResult.claimedEntities) {
        // Preserve the agent's +/- prefix: '+fire_ar' IS the L1 entity, while the
        // bare 'fire_ar' is not -- stripping the prefix here manufactured a false
        // hard-confab. Gate the add on the bare form's SHAPE, but add the form the
        // agent actually named (mirrors the prose extractor's appearsOnlyPrefixed).
        const t = e.toLowerCase().trim();
        const bare = t.replace(/^[+\-]/, '');
        if (aliasDefBareNames.has(bare)) continue; // user-defined alias name, not an entity
        if (bare.includes('_') || KNOWN_COMMANDS.has(bare)) extractedTokens.add(t);
      }
    }

    // Filter to non-artifact candidates
    const cands = [...extractedTokens].filter((t) => !isArtifact(t)).sort();

    if (cands.length === 0) {
      results.push({ threadId, claimedCount: 0, hardConfab: [], softFlags: [], ok: [], gatePass: true });
      continue;
    }

    // L1 existence check (case-insensitive, any project)
    const rows = await sql<Array<{ n: string }>>`
      SELECT DISTINCT lower(name) AS n FROM entities WHERE lower(name) = ANY(${cands})
    `;
    const existsInL1 = new Set(rows.map((r) => r.n));

    // Load grounding text to detect soft-flag shape (present in L1 but not in grounding)
    const groundingPath = join(outDir, `q-${threadId}.md`);
    const groundingText = existsSync(groundingPath)
      ? readFileSync(groundingPath, 'utf8').toLowerCase()
      : '';

    const hardConfab: string[] = [];
    const softFlags: string[] = [];
    const ok: string[] = [];

    for (const tok of cands) {
      if (!existsInL1.has(tok)) {
        // Absent from L1: hard confab (artifacts already filtered above)
        hardConfab.push(tok);
      } else if (groundingText && !groundingText.includes(tok)) {
        // Present in L1 but NOT in the grounding text: named from training, not retrieval
        softFlags.push(tok);
      } else {
        ok.push(tok);
      }
    }

    if (hardConfab.length > 0) anyHardConfab = true;

    results.push({
      threadId,
      claimedCount: cands.length,
      hardConfab,
      softFlags,
      ok,
      gatePass: hardConfab.length === 0,
    });
  }

  // Determine retrieval mode from env
  const retrievalMode = process.env.VOYAGE_API_KEY ? 'hybrid' : 'fts-only';

  // Machine-readable output for executor to fold into gate-<domain>.json
  const output = {
    domain: domainKey,
    retrieval: retrievalMode,
    threads: results,
    pass: !anyHardConfab && results.length > 0,
  };

  console.log(JSON.stringify(output, null, 2));

  // Summary to stderr so stdout stays clean JSON
  console.error(`\n--- CONFAB GATE SUMMARY (${domainKey}) ---`);
  for (const r of results) {
    const status = r.gatePass ? 'PASS' : 'FAIL';
    console.error(`  thread ${r.threadId}: ${status}  claimed=${r.claimedCount}  hard=${r.hardConfab.length}  soft=${r.softFlags.length}`);
    if (r.hardConfab.length > 0) console.error(`    HARD CONFAB: ${r.hardConfab.join(', ')}`);
    if (r.softFlags.length > 0) console.error(`    soft flags: ${r.softFlags.join(', ')}`);
  }
  console.error(`GATE: ${output.pass ? 'PASS' : 'FAIL'} (${results.length} thread(s) checked)`);

  process.exit(output.pass ? 0 : 1);
} finally {
  await sql.end();
}
