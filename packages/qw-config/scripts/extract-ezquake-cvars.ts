#!/usr/bin/env bun
/**
 * Extract ezQuake cvar definitions from C source code.
 *
 * Source of truth: cvar_t declarations + Cvar_Register() calls in ezquake-source/src/
 * Enrichment: help_variables.json for descriptions, types, and enum values
 *
 * Usage: bun run scripts/extract-ezquake-cvars.ts
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────────

const EZQUAKE_SRC = join(import.meta.dir, "../../../research/repos/ezquake-source/src");
const HELP_JSON_PATH = join(import.meta.dir, "../../../research/repos/ezquake-source/help_variables.json");
const OUTPUT_PATH = join(import.meta.dir, "../src/data/ezquake-variables.json");

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExtractedCvar {
  cvarName: string;
  cVarIdent: string;
  defaultValue: string;
  sourceFile: string;
  serverOnly: boolean;
  groupName?: string;
}

interface HelpVar {
  desc?: string;
  "group-id"?: string;
  type?: string;
  default?: string;
  remarks?: string;
  values?: { name: string; description: string }[];
}

interface HelpGroup {
  id: string;
  "major-group": string;
  name: string;
}

interface HelpData {
  groups: HelpGroup[];
  vars: Record<string, HelpVar>;
}

// ── Phase 1: Parse cvar_groups.h ───────────────────────────────────────────────

async function parseGroupDefinitions(): Promise<Map<string, string>> {
  const content = await readFile(join(EZQUAKE_SRC, "cvar_groups.h"), "utf-8");
  const groupMap = new Map<string, string>();

  const re = /#define\s+(CVAR_GROUP_\w+)\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    groupMap.set(m[1], m[2]);
  }

  console.log(`  Parsed ${groupMap.size} group definitions from cvar_groups.h`);
  return groupMap;
}

// ── Phase 2: Extract cvar_t declarations and register chains ───────────────────

async function extractFromFile(
  filePath: string,
  fileName: string,
  groupDefs: Map<string, string>,
): Promise<ExtractedCvar[]> {
  const content = await readFile(filePath, "utf-8");
  const serverOnly = fileName.startsWith("sv_");

  // Extract all cvar_t declarations
  const declRe = /^(?:static\s+)?cvar_t\s+(\w+)\s*=\s*\{\s*"([^"]*)"\s*,\s*"([^"]*)"/gm;
  const declarations = new Map<string, { cvarName: string; defaultValue: string }>();

  let dm: RegExpExecArray | null;
  while ((dm = declRe.exec(content)) !== null) {
    declarations.set(dm[1], { cvarName: dm[2], defaultValue: dm[3] });
  }

  // Scan for Cvar_SetCurrentGroup / Cvar_Register sequences
  const groupAssignments = new Map<string, string>();
  const lines = content.split("\n");
  let currentGroup: string | undefined;

  for (const line of lines) {
    const groupMatch = line.match(/Cvar_SetCurrentGroup\s*\(\s*(CVAR_GROUP_\w+)\s*\)/);
    if (groupMatch) {
      currentGroup = groupDefs.get(groupMatch[1]);
      continue;
    }

    const regMatch = line.match(/Cvar_Register\s*\(\s*&(\w+)\s*\)/);
    if (regMatch && currentGroup) {
      groupAssignments.set(regMatch[1], currentGroup);
    }

    if (line.includes("Cvar_ResetCurrentGroup")) {
      currentGroup = undefined;
    }
  }

  // Build results
  const results: ExtractedCvar[] = [];
  for (const [cVarIdent, { cvarName, defaultValue }] of declarations) {
    results.push({
      cvarName,
      cVarIdent,
      defaultValue,
      sourceFile: fileName,
      serverOnly,
      groupName: groupAssignments.get(cVarIdent),
    });
  }

  return results;
}

async function extractAllCvars(groupDefs: Map<string, string>): Promise<ExtractedCvar[]> {
  const files = await readdir(EZQUAKE_SRC);
  const cFiles = files.filter((f) => f.endsWith(".c"));
  console.log(`  Scanning ${cFiles.length} C source files...`);

  const all: ExtractedCvar[] = [];
  for (const f of cFiles) {
    const cvars = await extractFromFile(join(EZQUAKE_SRC, f), f, groupDefs);
    if (cvars.length > 0) {
      all.push(...cvars);
    }
  }

  // Deduplicate by cvar name (last declaration wins)
  const deduped = new Map<string, ExtractedCvar>();
  for (const c of all) {
    deduped.set(c.cvarName, c);
  }

  return Array.from(deduped.values());
}

// ── Phase 2b: Extract HUD element cvars from HUD_Register() calls ──────────────

/**
 * HUD_Register creates dynamic cvars: hud_{element}_{suffix} for each element.
 * Standard sub-cvars: order, place, show, pos_x, align_x, pos_y, align_y,
 *   frame, frame_color, item_opacity, draw
 * Custom sub-cvars: variadic pairs ("suffix", "default") until NULL
 *
 * Call signature:
 *   HUD_Register("name", alias, "desc", flags, min_state, draw_order, func,
 *     "show", "place", "align_x", "align_y", "pos_x", "pos_y",
 *     "frame", "frame_color", "item_opacity",
 *     "custom1", "default1", "custom2", "default2", ..., NULL)
 */
/** Find all HUD_Register(...) call bodies using balanced parenthesis matching. */
function findHudRegisterCalls(content: string): string[] {
  const results: string[] = [];
  const marker = "HUD_Register";
  let searchFrom = 0;

  while (true) {
    const idx = content.indexOf(marker, searchFrom);
    if (idx === -1) break;

    // Find the opening paren
    let parenStart = content.indexOf("(", idx + marker.length);
    if (parenStart === -1) break;

    // Match balanced parens
    let depth = 1;
    let pos = parenStart + 1;
    while (pos < content.length && depth > 0) {
      if (content[pos] === "(") depth++;
      else if (content[pos] === ")") depth--;
      pos++;
    }

    if (depth === 0) {
      // Extract body between parens (excluding the parens themselves)
      results.push(content.slice(parenStart + 1, pos - 1));
    }

    searchFrom = pos;
  }

  return results;
}

async function extractHudCvars(): Promise<ExtractedCvar[]> {
  const hudFiles = (await readdir(EZQUAKE_SRC))
    .filter((f) => f.startsWith("hud") && f.endsWith(".c"));
  // Also check a few non-hud files that register HUD elements
  hudFiles.push("r_rmain.c", "stats_grid.c");

  const results: ExtractedCvar[] = [];

  for (const fileName of hudFiles) {
    const filePath = join(EZQUAKE_SRC, fileName);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue; // file might not exist (e.g. stats_grid.c)
    }

    // Find all HUD_Register(...) calls — they span many lines with nested parens
    // Use a manual balanced-paren matcher instead of regex
    const callBodies = findHudRegisterCalls(content);

    for (const body of callBodies) {
      const tokens = parseHudArgs(body);
      if (tokens.length < 17) continue; // need at least the standard args

      const elementName = tokens[0]; // "health", "ammo1", etc.
      if (!elementName || elementName === "NULL") continue;

      // Standard args at fixed positions (0-indexed):
      // 0=name, 1=alias, 2=desc, 3=flags, 4=min_state, 5=draw_order, 6=func
      // 7=show, 8=place, 9=align_x, 10=align_y, 11=pos_x, 12=pos_y
      // 13=frame, 14=frame_color, 15=item_opacity
      // 16+ = custom pairs: suffix, default, suffix, default, ..., NULL

      const show = tokens[7];
      const place = tokens[8];
      const alignX = tokens[9];
      const alignY = tokens[10];
      const posX = tokens[11];
      const posY = tokens[12];
      const frame = tokens[13];
      const frameColor = tokens[14];
      const itemOpacity = tokens[15];

      // Always-created standard sub-cvars
      addHudCvar(results, elementName, "order", "0", fileName);
      addHudCvar(results, elementName, "draw", "1", fileName);

      if (place && place !== "NULL") addHudCvar(results, elementName, "place", place, fileName);
      if (show && show !== "NULL") addHudCvar(results, elementName, "show", show, fileName);
      if (posX && posX !== "NULL" && alignX && alignX !== "NULL") {
        addHudCvar(results, elementName, "pos_x", posX, fileName);
        addHudCvar(results, elementName, "align_x", alignX, fileName);
      }
      if (posY && posY !== "NULL" && alignY && alignY !== "NULL") {
        addHudCvar(results, elementName, "pos_y", posY, fileName);
        addHudCvar(results, elementName, "align_y", alignY, fileName);
      }
      if (frame && frame !== "NULL") {
        addHudCvar(results, elementName, "frame", frame, fileName);
        addHudCvar(results, elementName, "frame_color", frameColor ?? "0 0 0", fileName);
      }
      addHudCvar(results, elementName, "item_opacity", (itemOpacity && itemOpacity !== "NULL") ? itemOpacity : "1", fileName);

      // Custom params: pairs from index 16 onward
      for (let i = 16; i + 1 < tokens.length; i += 2) {
        const suffix = tokens[i];
        const defVal = tokens[i + 1];
        if (!suffix || suffix === "NULL" || !defVal) break;
        addHudCvar(results, elementName, suffix, defVal === "NULL" ? "" : defVal, fileName);
      }
    }
  }

  console.log(`  Extracted ${results.length} HUD sub-cvars from ${hudFiles.length} files`);
  return results;
}

function addHudCvar(results: ExtractedCvar[], element: string, suffix: string, defaultValue: string, sourceFile: string) {
  results.push({
    cvarName: `hud_${element}_${suffix}`,
    cVarIdent: `hud_${element}_${suffix}`,
    defaultValue,
    sourceFile,
    serverOnly: false,
    groupName: "MQWCL HUD",
  });
}

/** Parse the comma-separated arguments of a HUD_Register call, respecting quoted strings
 *  and C string concatenation ("foo" "bar" → "foobar"). */
function parseHudArgs(body: string): string[] {
  // Strip C comments
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const tokens: string[] = [];
  let pos = 0;

  while (pos < clean.length) {
    // Skip whitespace and commas
    while (pos < clean.length && /[\s,]/.test(clean[pos])) pos++;
    if (pos >= clean.length) break;

    if (clean[pos] === '"') {
      // Quoted string — handle C string concatenation ("a" "b" → "ab")
      let val = "";
      while (pos < clean.length && clean[pos] === '"') {
        pos++; // skip opening "
        while (pos < clean.length && clean[pos] !== '"') {
          if (clean[pos] === "\\" && pos + 1 < clean.length) {
            val += clean[pos + 1];
            pos += 2;
          } else {
            val += clean[pos];
            pos++;
          }
        }
        if (pos < clean.length) pos++; // skip closing "
        // Skip whitespace between concatenated strings (no comma between them)
        const savedPos = pos;
        while (pos < clean.length && /\s/.test(clean[pos])) pos++;
        if (pos >= clean.length || clean[pos] !== '"') {
          // Not a concatenated string — restore position
          pos = savedPos;
          break;
        }
        // Next char is " — continue concatenating
      }
      tokens.push(val);
    } else {
      // Unquoted token — scan to next comma or whitespace, respecting parens
      let val = "";
      let depth = 0;
      while (pos < clean.length) {
        const ch = clean[pos];
        if (ch === "(") { depth++; val += ch; pos++; }
        else if (ch === ")") { depth--; val += ch; pos++; }
        else if (ch === "," && depth <= 0) break;
        else if (/\s/.test(ch) && depth <= 0 && val) break;
        else if (/\s/.test(ch) && !val) { pos++; }
        else { val += ch; pos++; }
      }
      if (val) tokens.push(val);
    }
  }

  return tokens;
}

// ── Phase 3: Load help JSON for enrichment ─────────────────────────────────────

async function loadHelpData(): Promise<HelpData> {
  const raw = await readFile(HELP_JSON_PATH, "utf-8");
  return JSON.parse(raw) as HelpData;
}

// ── Phase 4: Build output ──────────────────────────────────────────────────────

function inferType(defaultValue: string): string {
  if (defaultValue === "0" || defaultValue === "1") return "boolean";
  if (/^-?\d+$/.test(defaultValue)) return "integer";
  if (/^-?\d+\.\d+$/.test(defaultValue)) return "float";
  return "string";
}

function buildOutput(extracted: ExtractedCvar[], help: HelpData) {
  // Build group name to id lookup from help JSON
  const groupNameToId = new Map<string, string>();
  for (const g of help.groups) {
    groupNameToId.set(g.name, g.id);
  }

  const vars: Record<string, Record<string, unknown>> = {};
  let enrichedCount = 0;
  let noDescCount = 0;
  let clientCount = 0;
  let serverCount = 0;

  for (const cvar of extracted) {
    const helpEntry = help.vars[cvar.cvarName];

    // Determine group-id: prefer source group, fall back to help group-id
    // For server-only cvars without a source group, default to "Server Settings"
    let groupId: string | undefined;
    if (cvar.groupName) {
      groupId = groupNameToId.get(cvar.groupName);
    }
    if (!groupId && helpEntry?.["group-id"]) {
      // Don't inherit Obsolete group from help JSON for source-verified cvars
      const helpGroup = help.groups.find((g) => g.id === helpEntry["group-id"]);
      if (helpGroup && helpGroup["major-group"] !== "Obsolete") {
        groupId = helpEntry["group-id"];
      }
    }
    if (!groupId) {
      groupId = cvar.serverOnly
        ? (groupNameToId.get("Server Settings") ?? "0")
        : "0";
    }

    const type = helpEntry?.type ?? inferType(cvar.defaultValue);

    const entry: Record<string, unknown> = {
      type,
      "group-id": groupId,
      default: cvar.defaultValue,
      "server-only": cvar.serverOnly,
    };

    if (helpEntry) {
      enrichedCount++;
      if (helpEntry.desc) entry.desc = helpEntry.desc;
      if (helpEntry.remarks) entry.remarks = helpEntry.remarks;
      if (helpEntry.values) entry.values = helpEntry.values;
    } else {
      noDescCount++;
    }

    if (cvar.serverOnly) serverCount++;
    else clientCount++;

    vars[cvar.cvarName] = entry;
  }

  // Add help-only entries flagged as not-in-source
  const sourceNames = new Set(extracted.map((c) => c.cvarName));
  let helpOnlyCount = 0;

  for (const [name, helpEntry] of Object.entries(help.vars)) {
    if (sourceNames.has(name)) continue;
    helpOnlyCount++;

    vars[name] = {
      type: helpEntry.type ?? "string",
      "group-id": helpEntry["group-id"] ?? "0",
      "in-source": false,
      ...(helpEntry.desc ? { desc: helpEntry.desc } : {}),
      ...(helpEntry.default !== undefined ? { default: helpEntry.default } : {}),
      ...(helpEntry.remarks ? { remarks: helpEntry.remarks } : {}),
      ...(helpEntry.values ? { values: helpEntry.values } : {}),
    };
  }

  console.log(`\n  === Extraction Summary ===`);
  console.log(`  Source cvars: ${extracted.length}`);
  console.log(`    Client: ${clientCount}`);
  console.log(`    Server-only: ${serverCount}`);
  console.log(`  Enriched with help descriptions: ${enrichedCount}`);
  console.log(`  In source but no help entry: ${noDescCount}`);
  console.log(`  Help-only (flagged not-in-source): ${helpOnlyCount}`);
  console.log(`  Total output entries: ${Object.keys(vars).length}`);

  return { groups: help.groups, vars };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Extracting ezQuake cvars from C source...\n");

  console.log("Phase 1: Parsing cvar_groups.h...");
  const groupDefs = await parseGroupDefinitions();

  console.log("Phase 2a: Extracting cvar_t declarations...");
  const staticCvars = await extractAllCvars(groupDefs);
  console.log(`  Found ${staticCvars.length} unique static cvar declarations`);

  console.log("Phase 2b: Extracting HUD element cvars...");
  const hudCvars = await extractHudCvars();

  // Merge: static declarations take precedence over HUD-generated
  const allCvars = [...staticCvars];
  const staticNames = new Set(staticCvars.map((c) => c.cvarName));
  let hudAdded = 0;
  for (const hc of hudCvars) {
    if (!staticNames.has(hc.cvarName)) {
      allCvars.push(hc);
      hudAdded++;
    }
  }
  console.log(`  Added ${hudAdded} HUD cvars (${hudCvars.length - hudAdded} already in static declarations)`);
  console.log(`  Total source cvars: ${allCvars.length}`);

  console.log("Phase 3: Loading help JSON for enrichment...");
  const help = await loadHelpData();
  console.log(`  Help JSON has ${Object.keys(help.vars).length} entries`);

  console.log("Phase 4: Building output...");
  const output = buildOutput(allCvars, help);

  const sortedVars: Record<string, unknown> = {};
  for (const key of Object.keys(output.vars).sort()) {
    sortedVars[key] = output.vars[key];
  }

  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({ groups: output.groups, vars: sortedVars }, null, 2) + "\n",
  );

  console.log(`\n  Written to: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Extraction failed:", e);
  process.exit(1);
});
