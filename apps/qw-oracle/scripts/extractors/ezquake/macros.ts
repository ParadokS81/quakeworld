#!/usr/bin/env bun
/**
 * Extract ezQuake built-in runtime macros from help_macros.json.
 *
 * These are the $variable-style macros available in ezQuake aliases/scripts
 * (e.g. $health, $armor, $weapon).
 *
 * Usage: bun run scripts/extract-ezquake-macros.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────────

const HELP_JSON_PATH = join(import.meta.dir, "../../../research/repos/ezquake-source/help_macros.json");
const REPO_ROOT = new URL("../../../../../", import.meta.url).pathname;
const OUTPUT_PATH = join(REPO_ROOT, "packages/qw-config/src/data/ezquake-macros.json");

// ── Types ──────────────────────────────────────────────────────────────────────

interface HelpMacro {
  description?: string;
  remarks?: string;
  type?: string;
  "teamplay-restricted"?: boolean;
  "related-cvars"?: string[];
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Extracting ezQuake macros from help_macros.json...\n");

  const raw = await readFile(HELP_JSON_PATH, "utf-8");
  const help = JSON.parse(raw) as Record<string, HelpMacro>;

  console.log(`  Loaded ${Object.keys(help).length} macro entries`);

  const macros: Record<string, Record<string, unknown>> = {};

  for (const name of Object.keys(help).sort()) {
    const entry = help[name];
    const out: Record<string, unknown> = {};

    if (entry.description) out.desc = entry.description;
    if (entry.remarks) out.remarks = entry.remarks;
    if (entry.type) out.type = entry.type;
    if (entry["teamplay-restricted"] !== undefined) {
      out["teamplay-restricted"] = entry["teamplay-restricted"];
    }
    if (entry["related-cvars"]) out["related-cvars"] = entry["related-cvars"];

    macros[name] = out;
  }

  const output = { macros };

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(`  Written ${Object.keys(macros).length} macros to: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Extraction failed:", e);
  process.exit(1);
});
