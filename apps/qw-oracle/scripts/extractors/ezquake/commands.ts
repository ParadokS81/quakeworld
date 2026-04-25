#!/usr/bin/env bun
/**
 * Extract ezQuake command definitions from C source code.
 *
 * Source of truth: Cmd_AddCommand() calls in ezquake-source/src/
 * Enrichment: help_commands.json for descriptions
 * Commands in help but NOT in source are flagged as deprecated.
 *
 * Usage: bun run scripts/extract-ezquake-commands.ts
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────────

const EZQUAKE_SRC = join(import.meta.dir, "../../../research/repos/ezquake-source/src");
const HELP_JSON_PATH = join(import.meta.dir, "../../../research/repos/ezquake-source/help_commands.json");
const REPO_ROOT = new URL("../../../../../", import.meta.url).pathname;
const OUTPUT_PATH = join(REPO_ROOT, "packages/qw-config/src/data/ezquake-commands.json");

// ── Groups ─────────────────────────────────────────────────────────────────────

const GROUPS = [
  { id: "action",     name: "Press/Release Actions" },
  { id: "teamplay",   name: "Teamplay" },
  { id: "demo",       name: "Demo Recording & Playback" },
  { id: "hud",        name: "HUD" },
  { id: "video",      name: "Video & Screenshots" },
  { id: "menu",       name: "Menus" },
  { id: "sb",         name: "Server Browser" },
  { id: "stateful",   name: "Stateful / Toggle" },
  { id: "game",       name: "In-Game Actions" },
  { id: "config",     name: "Config & Scripting" },
  { id: "comm",       name: "Communication" },
  { id: "dev",        name: "Developer / Diagnostics" },
  { id: "deprecated", name: "Deprecated" },
  { id: "misc",       name: "Miscellaneous" },
];

// ── Group assignment sets ──────────────────────────────────────────────────────

const DEMO_EXACT = new Set(["record", "stop", "playdemo", "timedemo", "easyrecord", "stopdemo"]);
const HUD_EXACT = new Set(["sizeup", "sizedown", "hud_editor", "hud_recalculate", "hud_planmode", "loadcharset"]);
const VIDEO_EXACT = new Set(["screenshot", "bf", "r_restart"]);
const MENU_EXACT = new Set(["togglemenu"]);
const SB_EXACT = new Set(["serverinfo", "status", "who", "whoami", "whonot", "ping"]);
const STATEFUL_EXACT = new Set(["floodprot", "mapgroup", "skygroup", "filter", "sb_sourcemark", "sb_sourceunmarkall"]);
const GAME_EXACT = new Set([
  "kill", "god", "noclip", "fly", "give", "pause", "quit", "disconnect",
  "connect", "reconnect", "changing", "notify", "join", "observe", "ready",
  "break", "noready", "vwep",
]);
const CONFIG_EXACT = new Set([
  "exec", "alias", "unalias", "unalias_re", "unaliasall",
  "bind", "unbind", "unbindall",
  "set", "seta", "unset", "toggle", "inc", "dec", "reset", "resetall",
  "cvar_reset", "cfg_save", "cfg_load", "cfg_reset",
  "wait", "if", "echo",
]);
const COMM_EXACT = new Set(["say", "say_team", "messagemode", "messagemode2", "rcon", "name", "team", "color"]);
const DEV_EXACT = new Set(["cmdlist", "cvarlist", "apropos", "snd_restart", "dumpent"]);

function assignGroup(name: string, deprecated: boolean): string {
  if (deprecated) return "deprecated";
  if (name.startsWith("+") || name.startsWith("-")) return "action";
  if (name.startsWith("tp_")) return "teamplay";
  if (name.startsWith("demo_") || DEMO_EXACT.has(name)) return "demo";
  if (name.startsWith("hud_") || name.startsWith("hud262_") || HUD_EXACT.has(name)) return "hud";
  if (name.startsWith("vid_") || VIDEO_EXACT.has(name)) return "video";
  if (name.startsWith("menu_") || MENU_EXACT.has(name)) return "menu";
  if (name.startsWith("sb_") || SB_EXACT.has(name)) return "sb";
  if (STATEFUL_EXACT.has(name)) return "stateful";
  if (GAME_EXACT.has(name)) return "game";
  if (CONFIG_EXACT.has(name)) return "config";
  if (COMM_EXACT.has(name)) return "comm";
  if (name.startsWith("dev_") || DEV_EXACT.has(name)) return "dev";
  return "misc";
}

// ── Phase 1: Grep Cmd_AddCommand from C source ────────────────────────────────

async function extractCommandsFromSource(): Promise<Set<string>> {
  const files = await readdir(EZQUAKE_SRC);
  const cFiles = files.filter((f) => f.endsWith(".c"));
  console.log(`  Scanning ${cFiles.length} C source files...`);

  const names = new Set<string>();
  const re = /Cmd_AddCommand\s*\(\s*"([^"]+)"/g;

  for (const f of cFiles) {
    const content = await readFile(join(EZQUAKE_SRC, f), "utf-8");
    for (const m of content.matchAll(re)) {
      names.add(m[1]);
    }
  }

  console.log(`  Found ${names.size} unique commands in source`);
  return names;
}

// ── Phase 2: Load help JSON ────────────────────────────────────────────────────

interface HelpEntry {
  description?: string;
  remarks?: string;
  "system-generated"?: boolean;
}

async function loadHelpData(): Promise<Record<string, HelpEntry>> {
  const raw = await readFile(HELP_JSON_PATH, "utf-8");
  return JSON.parse(raw) as Record<string, HelpEntry>;
}

// ── Phase 3: Build output ──────────────────────────────────────────────────────

function buildOutput(
  sourceNames: Set<string>,
  help: Record<string, HelpEntry>,
) {
  const commands: Record<string, Record<string, unknown>> = {};
  let liveCount = 0;
  let deprecatedCount = 0;

  // All source commands (live)
  for (const name of Array.from(sourceNames).sort()) {
    const helpEntry = help[name];
    const groupId = assignGroup(name, false);

    const entry: Record<string, unknown> = { "group-id": groupId };
    if (helpEntry?.description) entry.desc = helpEntry.description;
    if (helpEntry?.remarks) entry.remarks = helpEntry.remarks;

    commands[name] = entry;
    liveCount++;
  }

  // Help-only commands (deprecated)
  for (const name of Object.keys(help).sort()) {
    if (sourceNames.has(name)) continue;
    const helpEntry = help[name];

    const entry: Record<string, unknown> = { "group-id": "deprecated" };
    if (helpEntry?.description) entry.desc = helpEntry.description;
    if (helpEntry?.remarks) entry.remarks = helpEntry.remarks;

    commands[name] = entry;
    deprecatedCount++;
  }

  console.log(`\n  === Extraction Summary ===`);
  console.log(`  Live commands (in source): ${liveCount}`);
  console.log(`  Deprecated (help-only):    ${deprecatedCount}`);
  console.log(`  Total:                     ${liveCount + deprecatedCount}`);

  return { groups: GROUPS, commands };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Extracting ezQuake commands from C source...\n");

  console.log("Phase 1: Scanning for Cmd_AddCommand calls...");
  const sourceNames = await extractCommandsFromSource();

  console.log("Phase 2: Loading help_commands.json...");
  const help = await loadHelpData();
  console.log(`  Help JSON has ${Object.keys(help).length} entries`);

  console.log("Phase 3: Building output...");
  const output = buildOutput(sourceNames, help);

  // Sort commands alphabetically in final output
  const sortedCommands: Record<string, unknown> = {};
  for (const key of Object.keys(output.commands).sort()) {
    sortedCommands[key] = output.commands[key];
  }

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({ groups: output.groups, commands: sortedCommands }, null, 2) + "\n",
  );

  console.log(`\n  Written to: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Extraction failed:", e);
  process.exit(1);
});
