#!/usr/bin/env bun
/**
 * list-entities-by-category.ts -- enumerate Layer 1 cvar+command entities by category.
 *
 * Purpose: provide a reliable category-enumeration source for batch dispatchers
 * (ktx-l1-batch-dispatcher and forks). MCP search_entities is a hybrid retrieval
 * tool tuned for consumer-facing semantic+lexical queries -- it has no category
 * parameter, a 25-result hard cap, and structurally filters out NULL-description
 * entities. Internal arc workflows that need authoritative category enumeration
 * must NOT route through MCP; they query Postgres directly via this script.
 *
 * Added 2026-05-27 after the KTX chunked-mode dispatch arc post-mortem found
 * 16 entities (15 k_fb_* Bloodfest cvars + k_race_simultaneous) silently
 * skipped because entity-list assembly used semantic intuition instead of
 * literal category_inferred enumeration.
 *
 * CLI:
 *   bun apps/qw-oracle/scripts/list-entities-by-category.ts --project ktx --category 'Frogbot' [--format json|tsv]
 *
 * Output (json, default):
 *   [{"name": "...", "type": "cvar|command", "description": "...", "source_ref": "file:line", "category_inferred": "...", "category_inferred_origin": "..."}, ...]
 *
 * Output (tsv): one entity per line, tab-separated: name<TAB>type<TAB>source_ref<TAB>has_description
 *
 * Exit codes:
 *   0 -- enumeration succeeded
 *   1 -- DATABASE_URL not set
 *   2 -- no entities found for the (project, category) pair (likely a typo)
 */

import postgres from "postgres";

interface Args {
  project: string;
  category: string;
  format: "json" | "tsv";
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { format: "json" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--project") args.project = argv[i + 1];
    if (argv[i] === "--category") args.category = argv[i + 1];
    if (argv[i] === "--format") args.format = argv[i + 1] as "json" | "tsv";
  }
  if (!args.project || !args.category) {
    console.error("Usage: bun list-entities-by-category.ts --project <ktx|mvdsv|...> --category <name> [--format json|tsv]");
    process.exit(1);
  }
  return args as Args;
}

interface EntityRow {
  name: string;
  type: "cvar" | "command";
  description: string | null;
  source_file: string | null;
  source_line: number | null;
  category_inferred: string;
  category_inferred_origin: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Run from apps/qw-oracle/ with .env loaded.");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { types: { bigint: postgres.BigInt } });

  const cvars = await sql<EntityRow[]>`
    SELECT e.name, e.type::text AS type, e.description,
           cv.source_file, cv.source_line,
           cv.category_inferred, cv.category_inferred_origin
    FROM entities e
    JOIN cvar_versions cv ON cv.entity_id = e.id
    WHERE e.project = ${args.project} AND cv.category_inferred = ${args.category}
    ORDER BY e.name
  `;
  const commands = await sql<EntityRow[]>`
    SELECT e.name, e.type::text AS type, e.description,
           cm.source_file, cm.source_line,
           cm.category_inferred, cm.category_inferred_origin
    FROM entities e
    JOIN command_versions cm ON cm.entity_id = e.id
    WHERE e.project = ${args.project} AND cm.category_inferred = ${args.category}
    ORDER BY e.name
  `;

  const rows = [...cvars, ...commands].sort((a, b) => a.name.localeCompare(b.name));

  if (rows.length === 0) {
    console.error(`No entities found for project='${args.project}' category='${args.category}'. Check category label (case-sensitive, exact match).`);
    await sql.end();
    process.exit(2);
  }

  if (args.format === "tsv") {
    for (const r of rows) {
      const ref = r.source_file && r.source_line ? `${r.source_file}:${r.source_line}` : "";
      const hasDesc = r.description ? "1" : "0";
      console.log(`${r.name}\t${r.type}\t${ref}\t${hasDesc}`);
    }
  } else {
    const out = rows.map((r) => ({
      name: r.name,
      type: r.type,
      description: r.description,
      source_ref: r.source_file && r.source_line ? `${r.source_file}:${r.source_line}` : null,
      category_inferred: r.category_inferred,
      category_inferred_origin: r.category_inferred_origin,
    }));
    console.log(JSON.stringify(out, null, 2));
  }

  await sql.end();
}

if (import.meta.main) main();
