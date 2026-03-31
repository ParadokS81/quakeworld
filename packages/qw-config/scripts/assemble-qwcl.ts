#!/usr/bin/env bun
/**
 * assemble-qwcl.ts
 *
 * Extracts cvar definitions from the original QWCL source at
 * research/repos/qwcl-original/QW/client/ and cross-references with ezQuake
 * data for descriptions.
 *
 * Output: packages/qw-config/src/data/qwcl-variables.json
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ── Paths ──────────────────────────────────────────────────────────────────

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const QWCL_DIR = join(REPO_ROOT, "research/repos/qwcl-original/QW/client");
const EZQUAKE_DATA = join(REPO_ROOT, "packages/qw-config/src/data/ezquake-variables.json");
const OUTPUT_FILE = join(REPO_ROOT, "packages/qw-config/src/data/qwcl-variables.json");

// ── Output type ────────────────────────────────────────────────────────────

interface QwclCvar {
  name: string;
  default: string;
  description: string;
  category: string;
  descriptionSource: "ezquake" | "inferred" | "none";
}

// ── ezQuake data types ─────────────────────────────────────────────────────

interface EzQuakeRawVar {
  type: string;
  "group-id": string;
  desc?: string;
  default?: string;
}

interface EzQuakeRawGroup {
  id: string;
  "major-group": string;
  name: string;
}

interface EzQuakeData {
  groups: EzQuakeRawGroup[];
  vars: Record<string, EzQuakeRawVar>;
}

// ── Load ezQuake cross-reference data ─────────────────────────────────────

function loadEzQuakeData(): {
  descriptions: Map<string, string>;
  categories: Map<string, string>;
} {
  const raw = JSON.parse(readFileSync(EZQUAKE_DATA, "utf8")) as EzQuakeData;

  const groupLookup = new Map<string, string>();
  for (const g of raw.groups) {
    groupLookup.set(g.id, g["major-group"]);
  }

  const descriptions = new Map<string, string>();
  const categories = new Map<string, string>();

  for (const [name, v] of Object.entries(raw.vars)) {
    if (v.desc) descriptions.set(name, v.desc);
    const cat = groupLookup.get(v["group-id"]);
    if (cat) categories.set(name, cat);
  }

  return { descriptions, categories };
}

// ── Source file extraction ─────────────────────────────────────────────────

/**
 * Extract cvar definitions from a single C source file.
 * Handles the QWCL pattern:
 *   cvar_t varname = {"cvar_name", "default_value", ...};
 *
 * Also handles extern references to skip them.
 */
function extractCvarsFromFile(filePath: string): Array<{ name: string; default: string }> {
  const src = readFileSync(filePath, "utf8");
  const results: Array<{ name: string; default: string }> = [];

  // Match: cvar_t [optional whitespace] identifier = {"name", "default", ...};
  // Skip commented-out lines
  const lines = src.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip commented lines
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    // Match: cvar_t [identifier] = {"cvar_name", "default_value"
    // The cvar_name is the string in the first position of the initializer
    const match = trimmed.match(/cvar_t\s+\w+\s*=\s*\{("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")/);
    if (!match) continue;

    // Unwrap the string values (remove surrounding quotes)
    const name = match[1].slice(1, -1);
    const defaultVal = match[2].slice(1, -1);

    if (name && name.length > 0) {
      results.push({ name, default: defaultVal });
    }
  }

  return results;
}

// ── Category inference from cvar name ─────────────────────────────────────

function inferCategory(name: string): string {
  if (name.startsWith("cl_")) return "Client";
  if (name.startsWith("sv_")) return "Server";
  if (name.startsWith("gl_") || name.startsWith("r_") || name.startsWith("vid_")) return "Graphics";
  if (name.startsWith("snd_") || name.startsWith("cd_") || name === "ambient_level" || name === "ambient_fade") return "Sound";
  if (name.startsWith("net_") || name === "rate" || name === "pushlatency") return "Network";
  if (name.startsWith("m_") || name === "sensitivity" || name === "lookspring" || name === "lookstrafe") return "Input";
  if (name === "name" || name === "team" || name === "skin" || name === "topcolor" || name === "bottomcolor") return "Player";
  if (name === "fov" || name.startsWith("scr_")) return "HUD";
  if (name === "con_notifytime" || name === "developer" || name === "host_speeds" || name === "show_fps") return "System";
  return "Miscellaneous";
}

// ── Main ───────────────────────────────────────────────────────────────────

const qwclExists = existsSync(QWCL_DIR);
console.log(`QWCL source directory: ${qwclExists ? "found" : "NOT FOUND"}`);

const { descriptions: ezDescriptions, categories: ezCategories } = loadEzQuakeData();
console.log(`ezQuake descriptions loaded: ${ezDescriptions.size}`);

const cvars: QwclCvar[] = [];
const seenNames = new Set<string>();

if (qwclExists) {
  // Primary path: extract from QWCL source
  console.log(`Scanning: ${QWCL_DIR}`);

  const files = readdirSync(QWCL_DIR).filter(
    (f) => f.endsWith(".c") || f.endsWith(".h")
  );
  console.log(`Found ${files.length} .c/.h files`);

  let fileCount = 0;

  for (const file of files) {
    const filePath = join(QWCL_DIR, file);
    let extracted: Array<{ name: string; default: string }>;

    try {
      extracted = extractCvarsFromFile(filePath);
      if (extracted.length > 0) fileCount++;
    } catch {
      continue;
    }

    for (const { name, default: defaultVal } of extracted) {
      if (seenNames.has(name)) continue;
      seenNames.add(name);

      const description = ezDescriptions.get(name) ?? "";
      const descriptionSource: QwclCvar["descriptionSource"] = description
        ? "ezquake"
        : "none";

      // Use ezQuake category if available, otherwise infer from name
      const category = ezCategories.get(name) ?? inferCategory(name);

      cvars.push({
        name,
        default: defaultVal,
        description,
        category,
        descriptionSource,
      });
    }
  }

  console.log(`Files with cvars: ${fileCount}`);
} else {
  // Fallback: identify QWCL-era cvars from ezQuake data
  console.log("Falling back to ezQuake data for QWCL baseline identification");

  // Well-known QWCL baseline cvar names — the original id Software set
  const QWCL_BASELINE = new Set([
    // Input
    "sensitivity", "m_pitch", "m_yaw", "m_forward", "m_side",
    "lookspring", "lookstrafe",
    // Movement
    "cl_upspeed", "cl_forwardspeed", "cl_backspeed", "cl_sidespeed",
    "cl_movespeedkey", "cl_yawspeed", "cl_pitchspeed", "cl_anglespeedkey",
    // Client
    "cl_nodelta", "cl_shownet", "cl_sbar", "cl_hudswap", "cl_maxfps",
    "cl_timeout", "cl_predict_players", "cl_predict_players2", "cl_solid_players",
    "cl_nopred", "cl_pushlatency", "cl_warncmd", "cl_hightrack", "cl_chasecam",
    // Player info
    "name", "team", "skin", "topcolor", "bottomcolor",
    "rate", "noaim", "msg", "password", "spectator",
    // Graphics
    "gl_texturemode", "gl_picmip", "gl_ztrick", "gl_finish", "gl_cull",
    "gl_smoothmodels", "gl_affinemodels", "gl_polyblend", "gl_flashblend",
    "gl_playermip", "gl_nocolors", "gl_keeptjunctions", "gl_reporttjunctions",
    "gl_doubleeyes",
    // Display / video
    "vid_mode", "vid_redrawfull", "vid_wait", "vid_nopageflip",
    "fov", "scr_viewsize", "scr_conspeed", "scr_showpause", "scr_showram",
    "scr_showturtle", "scr_centertime", "scr_printspeed",
    // HUD
    "cl_clockstyle",
    // Sound
    "bgmvolume", "volume",
    // Network
    "rcon_password", "rcon_address",
    // System
    "developer", "host_speeds", "show_fps", "registered",
    "con_notifytime", "entlatency", "localid",
  ]);

  const ezRaw = JSON.parse(readFileSync(EZQUAKE_DATA, "utf8")) as EzQuakeData;

  for (const name of QWCL_BASELINE) {
    if (seenNames.has(name)) continue;
    seenNames.add(name);

    const ezVar = ezRaw.vars[name];
    const description = ezDescriptions.get(name) ?? "";
    const category = ezCategories.get(name) ?? inferCategory(name);

    cvars.push({
      name,
      default: ezVar?.default ?? "",
      description,
      category,
      descriptionSource: description ? "ezquake" : "none",
    });
  }
}

writeFileSync(OUTPUT_FILE, JSON.stringify(cvars, null, 2) + "\n");

const withDesc = cvars.filter((c) => c.description.length > 0).length;
const fromEz = cvars.filter((c) => c.descriptionSource === "ezquake").length;

console.log("\n=== QWCL cvar assembly summary ===");
console.log(`Total cvars:         ${cvars.length}`);
console.log(`With description:    ${withDesc} (${Math.round((withDesc / cvars.length) * 100)}%)`);
console.log(`Description source:  ${fromEz} from ezQuake`);
console.log(`\nOutput: ${OUTPUT_FILE}`);
