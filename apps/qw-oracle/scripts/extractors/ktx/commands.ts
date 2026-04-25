#!/usr/bin/env bun
/**
 * Extract KTX server-side commands from the cmd_t cmds[] array in commands.c.
 *
 * Algorithm:
 *   1. Read the full file
 *   2. Find the cmd_t cmds[] array body (from opening { to \n};)
 *   3. Extract CD_* macro definitions from the whole file
 *   4. Match { "name", ..., CD_MACRO } entries in the array body
 *   5. Also catch entries without a CD_ macro (empty desc)
 *
 * Usage: bun run scripts/extract-ktx-commands.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────────

const COMMANDS_C = join(import.meta.dir, "../../../research/repos/ktx/src/commands.c");
const REPO_ROOT = new URL("../../../../../", import.meta.url).pathname;
const OUTPUT_PATH = join(REPO_ROOT, "packages/qw-config/src/data/ktx-commands.json");

// ── Max name length safety filter ─────────────────────────────────────────────

const MAX_NAME_LEN = 40;

// ── Phase 1: Extract CD_ macro definitions ────────────────────────────────────

function extractCdMacros(content: string): Map<string, string> {
  const macros = new Map<string, string>();

  // Match: #define CD_XXX "description string"
  // Note: some are (CD_NODESC) which expands to "no desc" - handle separately
  const definedRe = /#define\s+(CD_\w+)\s+"([^"]*)"/g;
  for (const m of content.matchAll(definedRe)) {
    macros.set(m[1], m[2]);
  }

  // Also match: #define CD_XXX (CD_NODESC) - aliases to "no desc"
  const aliasRe = /#define\s+(CD_\w+)\s+\(CD_NODESC\)/g;
  for (const m of content.matchAll(aliasRe)) {
    macros.set(m[1], "no desc");
  }

  // CD_NODESC itself is a const, not a #define - add it explicitly
  macros.set("CD_NODESC", "no desc");

  console.log(`  Extracted ${macros.size} CD_ macro definitions`);
  return macros;
}

// ── Phase 2: Isolate the cmd_t cmds[] array body ──────────────────────────────

function extractArrayBody(content: string): string {
  const markerIdx = content.indexOf("cmd_t cmds[]");
  if (markerIdx === -1) throw new Error("Could not find 'cmd_t cmds[]' in file");

  // Find the opening { after the marker
  const openBrace = content.indexOf("{", markerIdx);
  if (openBrace === -1) throw new Error("Could not find opening { after cmd_t cmds[]");

  // Find the closing \n}; (array terminator)
  const closeSeq = "\n};";
  const closeBrace = content.indexOf(closeSeq, openBrace);
  if (closeBrace === -1) throw new Error("Could not find closing }; after cmd_t cmds[]");

  return content.slice(openBrace + 1, closeBrace);
}

// ── Phase 3: Parse entries ─────────────────────────────────────────────────────

interface KtxCommand {
  name: string;
  desc: string;
}

function parseArrayEntries(body: string, macros: Map<string, string>): KtxCommand[] {
  const commands = new Map<string, KtxCommand>();

  // Pass 1: entries that have a CD_ macro as the last field
  // Pattern: { "name", ...fields..., CD_MACRO }
  const withCdRe = /\{\s*"([^"]+)"[^{}]*?(CD_\w+)[^{}]*?\}/g;
  for (const m of body.matchAll(withCdRe)) {
    const name = m[1];
    const cdKey = m[2];

    if (name.length > MAX_NAME_LEN) continue;

    const desc = macros.get(cdKey) ?? "";
    if (!commands.has(name)) {
      commands.set(name, { name, desc });
    }
  }

  // Pass 2: all { "name", ... } entries - catches any that pass 1 missed
  const anyEntryRe = /\{\s*"([^"]+)"[^{}]*?\}/g;
  for (const m of body.matchAll(anyEntryRe)) {
    const name = m[1];
    if (name.length > MAX_NAME_LEN) continue;
    if (!commands.has(name)) {
      commands.set(name, { name, desc: "" });
    }
  }

  return Array.from(commands.values());
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Extracting KTX commands from commands.c...\n");

  const content = await readFile(COMMANDS_C, "utf-8");
  console.log(`  Read ${content.length} bytes from commands.c`);

  console.log("Phase 1: Extracting CD_ macro definitions...");
  const macros = extractCdMacros(content);

  console.log("Phase 2: Isolating cmd_t cmds[] array...");
  const arrayBody = extractArrayBody(content);
  console.log(`  Array body: ${arrayBody.length} bytes`);

  console.log("Phase 3: Parsing entries...");
  const entries = parseArrayEntries(arrayBody, macros);
  console.log(`  Found ${entries.length} commands`);

  // Build output sorted by name
  const commands: Record<string, { desc: string }> = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    commands[entry.name] = { desc: entry.desc };
  }

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({ commands }, null, 2) + "\n",
  );

  console.log(`\n  Written to: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Extraction failed:", e);
  process.exit(1);
});
