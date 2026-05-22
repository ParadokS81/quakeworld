#!/usr/bin/env bun
/**
 * build-l1-audit-catalog.ts -- single-page HTML catalog for L1 cvar+command entities.
 *
 * CLI:
 *   bun apps/qw-oracle/scripts/build-l1-audit-catalog.ts --project ktx [--output PATH]
 *
 * Reads DB rows for the named project, groups by category_inferred, emits a
 * self-contained HTML file with collapsible groups + entity cards + filter box.
 *
 * Spec: docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md
 */

import postgres from "postgres";
import { writeFileSync } from "fs";

interface EntityRow {
  canonical_id: string;
  name: string;
  type: "cvar" | "command";
  description: string | null;
  description_reasoning: string | null;
  description_verdict: string | null;
  description_origin: string | null;
  description_confidence: string | null;
  description_anchor_version: string | null;
  source_file: string | null;
  source_line: number | null;
  category_inferred: string;
  category_inferred_origin: string;
}

function parseArgs(argv: string[]): { project: string; output: string } {
  let project = "ktx";
  let output = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--project") project = argv[i + 1];
    if (argv[i] === "--output") output = argv[i + 1];
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!output) {
    output = `apps/qw-oracle/docs/reviews/${today}-${project}-l1-catalog.html`;
  }
  return { project, output };
}

async function fetchEntities(sql: postgres.Sql, project: string): Promise<EntityRow[]> {
  const cvars = await sql<EntityRow[]>`
    SELECT
      e.canonical_id, e.name, e.type::text AS type,
      e.description, e.description_reasoning,
      e.description_verdict, e.description_origin, e.description_confidence,
      e.description_anchor_version,
      cv.source_file, cv.source_line,
      cv.category_inferred, cv.category_inferred_origin
    FROM entities e
    JOIN cvar_versions cv ON cv.entity_id = e.id
    WHERE e.project = ${project} AND e.type = 'cvar'
    ORDER BY cv.category_inferred NULLS LAST, e.name
  `;
  const commands = await sql<EntityRow[]>`
    SELECT
      e.canonical_id, e.name, e.type::text AS type,
      e.description, e.description_reasoning,
      e.description_verdict, e.description_origin, e.description_confidence,
      e.description_anchor_version,
      cm.source_file, cm.source_line,
      cm.category_inferred, cm.category_inferred_origin
    FROM entities e
    JOIN command_versions cm ON cm.entity_id = e.id
    WHERE e.project = ${project} AND e.type = 'command'
    ORDER BY cm.category_inferred NULLS LAST, e.name
  `;
  return [...cvars, ...commands];
}

async function main() {
  const { project, output } = parseArgs(process.argv.slice(2));
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL env var required");
    process.exit(1);
  }
  const sql = postgres(dbUrl);
  try {
    const rows = await fetchEntities(sql, project);
    console.error(`Fetched ${rows.length} entities for project=${project}`);

    const uncategorized = rows.filter((r) => !r.category_inferred);
    if (uncategorized.length > 0) {
      console.error(`ERROR: ${uncategorized.length} entities lack category_inferred:`);
      for (const r of uncategorized.slice(0, 20)) console.error(`  ${r.canonical_id}`);
      if (uncategorized.length > 20) console.error(`  ... and ${uncategorized.length - 20} more`);
      console.error("Refusing to emit HTML. Fix categorization first (see plan README Step 15.4).");
      process.exit(2);
    }

    const html = renderHtml(rows, project);
    writeFileSync(output, html);
    console.error(`Wrote ${output}`);
  } finally {
    await sql.end();
  }
}

function renderHtml(rows: EntityRow[], project: string): string {
  return `<!DOCTYPE html><title>${project} L1 catalog</title><p>${rows.length} entities</p>`;
}

if (import.meta.main) main();
