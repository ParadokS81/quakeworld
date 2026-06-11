// apps/qw-oracle/scripts/load-knowledge/citation-gate.ts
//
// Reusable citation-gate probe. Verifies that every source_ref and
// *_source_ref value in gameplay_entity_defs and gameplay_mechanics resolves
// to a real file + line on disk.
//
// Two-form resolution (D7 decision):
//   - Repo-root-relative: ref path starts with '/' -- joined to monorepoRoot
//     directly (source_root ignored).
//   - Source-root-relative: ref path does not start with '/' -- joined under
//     the gameplay_source's source_root, which may itself carry a leading '/'
//     (both id1 and ktx rows differ; strip it to keep path arithmetic clean).
//
// Run standalone:
//   bun scripts/load-knowledge/citation-gate.ts [--source <id>] [--json] [--help]
//
// Or via dispatcher (Task 6 wires this):
//   bun run load-knowledge -- citation-gate [options]

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'util';
import type postgres from 'postgres';

// Derive repo root from this file's location:
//   apps/qw-oracle/scripts/load-knowledge/ -> apps/qw-oracle/scripts ->
//   apps/qw-oracle/ -> apps/ -> (repo root)
const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

// Matches the canonical ref shape: <path>.<ext>:<line> or <path>.<ext>:<start>-<end>
// Extension anchor (.qc / .c / .h) is intentional -- it keeps arbitrary prose
// strings in props_json out of the candidate set.
const REF_SHAPE = /^[^:\s]+\.(qc|c|h):\d+(-\d+)?$/;

// Key suffix that signals a props_json value is explicitly a source ref.
// Values under these keys that do NOT match REF_SHAPE are flagged as malformed
// rather than silently ignored.
const SOURCE_REF_KEY_SUFFIX = /_source_refs?$/;

export interface UnresolvedRef {
  gameplay_source_id: string;
  kind: string;
  name: string;
  ref: string;
  reason: 'missing' | 'line out of range' | 'malformed';
}

export interface CitationGateResult {
  scanned: number;
  unresolved: UnresolvedRef[];
}

// Line count cache -- reading large source files repeatedly during a scan
// is wasteful. Cache the count by resolved absolute path.
const lineCountCache = new Map<string, number>();

function getLineCount(absPath: string): number {
  const cached = lineCountCache.get(absPath);
  if (cached !== undefined) return cached;
  const content = readFileSync(absPath, 'utf8');
  // Count newlines. A file with no trailing newline still has one last line.
  const count = content.split('\n').length;
  lineCountCache.set(absPath, count);
  return count;
}

// Resolve a ref string to an absolute path using the two-form rule.
function resolveRefPath(refPath: string, sourceRoot: string): string {
  if (refPath.startsWith('/')) {
    // Repo-root-relative: strip the leading '/' and join under monorepoRoot.
    return join(monorepoRoot, refPath.slice(1));
  }
  // Source-root-relative: strip any leading '/' from source_root (both forms
  // exist in the live DB -- ktx has '/research/repos/ktx/src', id1 has
  // 'research/repos/qwcl-original/QW/progs/').
  return join(monorepoRoot, sourceRoot.replace(/^\//, ''), refPath);
}

// Check one ref string. Returns a reason string if unresolved, null if OK.
function checkRef(refStr: string, sourceRoot: string): 'missing' | 'line out of range' | null {
  // Split on last ':' to get path + line spec.
  const lastColon = refStr.lastIndexOf(':');
  const refPath = refStr.slice(0, lastColon);
  const lineSpec = refStr.slice(lastColon + 1);

  const absPath = resolveRefPath(refPath, sourceRoot);

  if (!existsSync(absPath)) {
    return 'missing';
  }

  // Use the upper bound of a range (or the single line number) for the check.
  const lineUpper = lineSpec.includes('-')
    ? parseInt(lineSpec.split('-')[1]!, 10)
    : parseInt(lineSpec, 10);

  const lineCount = getLineCount(absPath);
  if (lineUpper > lineCount) {
    return 'line out of range';
  }

  return null;
}

// Walk a props_json value recursively, collecting candidate ref strings.
// Candidate strings are:
//   a) any leaf string matching REF_SHAPE (regardless of key name)
//   b) any leaf string under a key matching SOURCE_REF_KEY_SUFFIX (which
//      may be malformed -- collected separately via the key flag)
//
// Returns array of { value, isMandatoryRef } where isMandatoryRef is true
// when the key explicitly signals a ref (SOURCE_REF_KEY_SUFFIX).
function collectRefsFromProps(
  node: unknown,
  parentKey: string | null = null,
): { value: string; isMandatoryRef: boolean }[] {
  const results: { value: string; isMandatoryRef: boolean }[] = [];

  if (typeof node === 'string') {
    const isMandatory = parentKey !== null && SOURCE_REF_KEY_SUFFIX.test(parentKey);
    if (isMandatory || REF_SHAPE.test(node)) {
      results.push({ value: node, isMandatoryRef: isMandatory });
    }
  } else if (Array.isArray(node)) {
    for (const item of node) {
      results.push(...collectRefsFromProps(item, parentKey));
    }
  } else if (node !== null && typeof node === 'object') {
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      results.push(...collectRefsFromProps(val, key));
    }
  }

  return results;
}

interface GameplayRow {
  gameplay_source_id: string;
  kind: string;
  name: string;
  source_ref: string | null;
  props_json: unknown;
}

export async function checkCitations(
  sql: postgres.Sql,
  opts?: { source?: string },
): Promise<CitationGateResult> {
  // Load source_root map once -- small table, no pagination needed.
  const sourceRows = await sql<{ id: string; source_root: string }[]>`
    SELECT id, source_root FROM gameplay_sources
  `;
  const sourceRootMap = new Map<string, string>(
    sourceRows.map((r) => [r.id, r.source_root]),
  );

  // Fetch both gameplay tables, optionally filtered to one source.
  const entityRows = opts?.source
    ? await sql<GameplayRow[]>`
        SELECT gameplay_source_id, kind, name, source_ref, props_json
        FROM gameplay_entity_defs
        WHERE gameplay_source_id = ${opts.source}
      `
    : await sql<GameplayRow[]>`
        SELECT gameplay_source_id, kind, name, source_ref, props_json
        FROM gameplay_entity_defs
      `;

  const mechanicsRows = opts?.source
    ? await sql<GameplayRow[]>`
        SELECT gameplay_source_id, kind, name, source_ref, props_json
        FROM gameplay_mechanics
        WHERE gameplay_source_id = ${opts.source}
      `
    : await sql<GameplayRow[]>`
        SELECT gameplay_source_id, kind, name, source_ref, props_json
        FROM gameplay_mechanics
      `;

  const allRows = [...entityRows, ...mechanicsRows];
  const unresolved: UnresolvedRef[] = [];
  let scanned = 0;

  for (const row of allRows) {
    const sourceRoot = sourceRootMap.get(row.gameplay_source_id);
    if (sourceRoot === undefined) {
      // Unknown source ID -- treat every ref as unresolved with 'missing'.
      // This is a data integrity problem surfaced by the gate, not a bug here.
      if (row.source_ref) {
        unresolved.push({
          gameplay_source_id: row.gameplay_source_id,
          kind: row.kind,
          name: row.name,
          ref: row.source_ref,
          reason: 'missing',
        });
        scanned++;
      }
      continue;
    }

    // Check the top-level source_ref column if present.
    if (row.source_ref) {
      scanned++;
      if (REF_SHAPE.test(row.source_ref)) {
        const reason = checkRef(row.source_ref, sourceRoot);
        if (reason) {
          unresolved.push({
            gameplay_source_id: row.gameplay_source_id,
            kind: row.kind,
            name: row.name,
            ref: row.source_ref,
            reason,
          });
        }
      } else {
        // A non-null source_ref that doesn't match the shape is malformed.
        unresolved.push({
          gameplay_source_id: row.gameplay_source_id,
          kind: row.kind,
          name: row.name,
          ref: row.source_ref,
          reason: 'malformed',
        });
      }
    }

    // Walk props_json for additional ref candidates.
    // props_json arrives from postgres-js already decoded as a JS object --
    // do not re-parse or stringify (JSONB binding rule, D12).
    if (row.props_json !== null && row.props_json !== undefined) {
      const candidates = collectRefsFromProps(row.props_json);
      for (const { value, isMandatoryRef } of candidates) {
        scanned++;
        if (!REF_SHAPE.test(value)) {
          if (isMandatoryRef) {
            // Key declares this as a ref but the value is malformed.
            unresolved.push({
              gameplay_source_id: row.gameplay_source_id,
              kind: row.kind,
              name: row.name,
              ref: value,
              reason: 'malformed',
            });
          }
          // Non-ref string under a non-source-ref key: skip.
          continue;
        }
        const reason = checkRef(value, sourceRoot);
        if (reason) {
          unresolved.push({
            gameplay_source_id: row.gameplay_source_id,
            kind: row.kind,
            name: row.name,
            ref: value,
            reason,
          });
        }
      }
    }
  }

  return { scanned, unresolved };
}

function printHelp(): void {
  process.stderr.write(`
citation-gate -- verify every source_ref in gameplay tables resolves on disk

Usage:
  bun scripts/load-knowledge/citation-gate.ts [options]
  bun run load-knowledge -- citation-gate [options]

Options:
  --source <id>   Scope to one gameplay_source_id (e.g. id1 or ktx).
  --json          Emit JSON-formatted results to stdout.
  --help          Print this help and exit.

Exit codes:
  0   all citations resolved (scanned=N unresolved=0) OR --help.
  1   one or more unresolved citations.
  2   invalid arguments.

Required env: DATABASE_URL (default postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle).
`.trim() + '\n');
}

export async function runCitationGateCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      source: { type: 'string' },
      json: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Import sql lazily so that typecheck-only runs don't open a DB connection.
  const { sql } = await import('./db.js');

  try {
    const result = await checkCitations(sql, { source: values.source });

    if (values.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      process.stdout.write(
        `citation-gate: scanned=${result.scanned} unresolved=${result.unresolved.length}\n`,
      );
      for (const u of result.unresolved) {
        process.stderr.write(
          `  UNRESOLVED [${u.reason}] ${u.gameplay_source_id}/${u.kind}/${u.name}: ${u.ref}\n`,
        );
      }
    }

    process.exitCode = result.unresolved.length > 0 ? 1 : 0;
  } finally {
    const { closeSql } = await import('./db.js');
    await closeSql();
  }
}

// Standalone entry point -- Bun sets import.meta.main when the file is the
// script being run directly (not imported as a module).
if (import.meta.main) {
  await runCitationGateCli(process.argv.slice(2));
}
