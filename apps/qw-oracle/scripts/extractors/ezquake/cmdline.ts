#!/usr/bin/env bun
/**
 * Extract ezQuake command-line startup parameters from help_cmdline_params.json.
 *
 * These are the -flag style parameters passed when launching ezQuake
 * (e.g. -basedir, -port, -width).
 *
 * Usage: bun run scripts/extract-ezquake-cmdline.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────────

const HELP_JSON_PATH = join(import.meta.dir, "../../../research/repos/ezquake-source/help_cmdline_params.json");
const REPO_ROOT = new URL("../../../../../", import.meta.url).pathname;
const OUTPUT_PATH = join(REPO_ROOT, "packages/qw-config/src/data/ezquake-cmdline-params.json");

// ── Types ──────────────────────────────────────────────────────────────────────

interface HelpParam {
  description?: string;
  remarks?: string;
  arguments?: string;
  systems?: string[];
  flags?: string[];
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Extracting ezQuake cmdline params from help_cmdline_params.json...\n");

  const raw = await readFile(HELP_JSON_PATH, "utf-8");
  const help = JSON.parse(raw) as Record<string, HelpParam>;

  console.log(`  Loaded ${Object.keys(help).length} parameter entries`);

  const params: Record<string, Record<string, unknown>> = {};

  for (const name of Object.keys(help).sort()) {
    const entry = help[name];
    const out: Record<string, unknown> = {};

    if (entry.description) out.desc = entry.description;
    if (entry.remarks) out.remarks = entry.remarks;
    if (entry.arguments) out.arguments = entry.arguments;
    if (entry.systems) out.systems = entry.systems;
    if (entry.flags) out.flags = entry.flags;

    params[name] = out;
  }

  const output = { params };

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(`  Written ${Object.keys(params).length} params to: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Extraction failed:", e);
  process.exit(1);
});
