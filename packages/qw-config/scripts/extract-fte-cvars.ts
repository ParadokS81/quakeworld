#!/usr/bin/env bun
/**
 * extract-fte-cvars.ts
 *
 * Recursively scans fteqw/engine/ and fteqw/plugins/ezhud/ C source files
 * and extracts cvar definitions from:
 *   - CVARD, CVARFD, CVARAFD, CVARAD macro invocations (engine)
 *   - HUD_Register() calls that auto-generate hud_* cvars (ezhud plugin)
 *   - cvarfuncs->GetNVFDG() standalone registrations (ezhud plugin)
 *
 * Outputs: packages/qw-config/src/data/fte-variables.json
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, relative } from "path";

// ── Paths ──────────────────────────────────────────────────────────────────

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const FTE_REPO = join(REPO_ROOT, "research/repos/fteqw");
const ENGINE_DIR = join(FTE_REPO, "engine");
const EZHUD_DIR = join(FTE_REPO, "plugins/ezhud");
const OUTPUT_FILE = new URL(
  "../src/data/fte-variables.json",
  import.meta.url
).pathname;

// ── Output type ────────────────────────────────────────────────────────────

interface FteCvar {
  name: string;
  default: string;
  description: string;
  alias?: string;
  flags?: string;
  sourceFile: string;
  group?: string;
}

// ── File walker ────────────────────────────────────────────────────────────

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.endsWith(".c") || entry.endsWith(".h")) {
      files.push(full);
    }
  }
  return files;
}

// ── String extraction helpers ──────────────────────────────────────────────

/**
 * Given a position inside a string buffer, advances past whitespace, C-style
 * block comments (/* ... *\/) and returns the next token which is either a
 * quoted string or an unquoted token (identifier/expression).
 *
 * Returns: { value, end } where end is the index after the token.
 */
function nextToken(
  src: string,
  pos: number
): { value: string; end: number } | null {
  // skip whitespace + block comments
  while (pos < src.length) {
    if (/\s/.test(src[pos])) {
      pos++;
      continue;
    }
    if (src[pos] === "/" && src[pos + 1] === "*") {
      const end = src.indexOf("*/", pos + 2);
      if (end === -1) break;
      pos = end + 2;
      continue;
    }
    break;
  }

  if (pos >= src.length) return null;

  // Quoted string (may have adjacent string literals: "a" "b" => "ab")
  if (src[pos] === '"') {
    let result = "";
    while (pos < src.length && src[pos] === '"') {
      pos++; // skip opening "
      let s = "";
      while (pos < src.length) {
        if (src[pos] === "\\") {
          s += src[pos] + src[pos + 1];
          pos += 2;
        } else if (src[pos] === '"') {
          pos++; // skip closing "
          break;
        } else {
          s += src[pos++];
        }
      }
      result += s;
      // skip whitespace + comments before possible next adjacent string
      while (pos < src.length) {
        if (/\s/.test(src[pos])) {
          pos++;
          continue;
        }
        if (src[pos] === "/" && src[pos + 1] === "*") {
          const cend = src.indexOf("*/", pos + 2);
          if (cend === -1) {
            pos = src.length;
            break;
          }
          pos = cend + 2;
          continue;
        }
        break;
      }
      if (src[pos] !== '"') break;
    }
    return { value: result, end: pos };
  }

  // NULL keyword
  if (src.startsWith("NULL", pos) && !/\w/.test(src[pos + 4] ?? "")) {
    return { value: "NULL", end: pos + 4 };
  }

  // Unquoted token: identifier/expression — consume until comma or closing paren at depth 0
  const start = pos;
  let depth = 0;
  while (pos < src.length) {
    const c = src[pos];
    if (c === "(") {
      depth++;
    } else if (c === ")") {
      if (depth === 0) break;
      depth--;
    } else if (c === "," && depth === 0) {
      break;
    }
    pos++;
  }
  const raw = src.slice(start, pos).trim();
  return { value: raw, end: pos };
}

/**
 * Unescape C string escape sequences in a description.
 */
function unescapeC(s: string): string {
  return s
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Group definitions ──────────────────────────────────────────────────────

/**
 * Extract #define cvargroup_xxx "description" and char cvargroup_xxx[] = "description";
 */
function extractCvargroups(src: string): Map<string, string> {
  const groups = new Map<string, string>();

  const defineRe = /#define\s+(cvargroup_\w+)\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = defineRe.exec(src)) !== null) {
    groups.set(m[1], m[2]);
  }

  const charRe = /char\s+(cvargroup_\w+)\s*\[\s*\]\s*=\s*"([^"]+)"/g;
  while ((m = charRe.exec(src)) !== null) {
    groups.set(m[1], m[2]);
  }

  return groups;
}

/**
 * Extract Cvar_Register(&var_name, cvargroup_xxx) mappings.
 */
function extractCvarRegistrations(src: string): Map<string, string> {
  const regs = new Map<string, string>();
  const re = /Cvar_Register\s*\(\s*&(\w+)\s*,\s*(cvargroup_\w+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    regs.set(m[1], m[2]);
  }
  return regs;
}

// ── Cvar macro extraction ──────────────────────────────────────────────────

type MacroKind = "CVARD" | "CVARFD" | "CVARAFD" | "CVARAD";

function parseMacroArgs(
  src: string,
  start: number,
  kind: MacroKind
): {
  name: string;
  default: string;
  alias?: string;
  flags?: string;
  description: string;
} | null {
  let pos = start;

  function consumeComma(): boolean {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    if (src[pos] !== ",") return false;
    pos++;
    return true;
  }

  const nameToken = nextToken(src, pos);
  if (!nameToken) return null;
  const name = nameToken.value;
  pos = nameToken.end;
  if (!consumeComma()) return null;

  const defaultToken = nextToken(src, pos);
  if (!defaultToken) return null;
  const defaultVal = defaultToken.value === "NULL" ? "" : defaultToken.value;
  pos = defaultToken.end;
  if (!consumeComma()) return null;

  let alias: string | undefined;
  let flags: string | undefined;

  if (kind === "CVARAFD") {
    const aliasToken = nextToken(src, pos);
    if (!aliasToken) return null;
    alias = aliasToken.value === "NULL" ? undefined : aliasToken.value;
    pos = aliasToken.end;
    if (!consumeComma()) return null;

    const flagsToken = nextToken(src, pos);
    if (!flagsToken) return null;
    const fv = flagsToken.value.trim();
    flags = fv === "0" || fv === "" ? undefined : fv;
    pos = flagsToken.end;
    if (!consumeComma()) return null;
  } else if (kind === "CVARAD") {
    const aliasToken = nextToken(src, pos);
    if (!aliasToken) return null;
    alias = aliasToken.value === "NULL" ? undefined : aliasToken.value;
    pos = aliasToken.end;
    if (!consumeComma()) return null;
  } else if (kind === "CVARFD") {
    const flagsToken = nextToken(src, pos);
    if (!flagsToken) return null;
    const fv = flagsToken.value.trim();
    flags = fv === "0" || fv === "" ? undefined : fv;
    pos = flagsToken.end;
    if (!consumeComma()) return null;
  }

  const descToken = nextToken(src, pos);
  if (!descToken) return null;
  const description =
    descToken.value === "NULL" ? "" : unescapeC(descToken.value);

  return { name, default: defaultVal, alias, flags, description };
}

// ── Per-file extraction ────────────────────────────────────────────────────

function extractFromFile(
  filePath: string,
  relPath: string
): Array<FteCvar & { varIdentifier: string }> {
  const src = readFileSync(filePath, "utf8");
  const groups = extractCvargroups(src);
  const registrations = extractCvarRegistrations(src);

  const varToGroup = new Map<string, string>();
  for (const [varId, groupVarName] of registrations.entries()) {
    const groupStr = groups.get(groupVarName);
    if (groupStr) varToGroup.set(varId, groupStr);
  }

  const results: Array<FteCvar & { varIdentifier: string }> = [];

  // Order matters: CVARAFD must come before CVARAD/CVARFD/CVARD to avoid
  // partial matches, so sort by length desc
  const macroRe = /\b(CVARAFD|CVARAD|CVARFD|CVARD)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = macroRe.exec(src)) !== null) {
    const kind = match[1] as MacroKind;
    const argsStart = match.index + match[0].length;

    // Find C variable identifier by looking backwards from macro
    const prefix = src.slice(Math.max(0, match.index - 200), match.index);
    const identMatch = prefix.match(/\b(\w+)\s*=\s*$/);
    const varIdentifier = identMatch ? identMatch[1] : "";

    let parsed: ReturnType<typeof parseMacroArgs> = null;
    try {
      parsed = parseMacroArgs(src, argsStart, kind);
    } catch {
      // skip unparseable macros
    }

    if (!parsed || !parsed.name || parsed.name === "NULL") continue;

    const cvar: FteCvar & { varIdentifier: string } = {
      name: parsed.name,
      default: parsed.default,
      description: parsed.description,
      sourceFile: relPath,
      varIdentifier,
    };

    if (parsed.alias) cvar.alias = parsed.alias;
    if (parsed.flags) cvar.flags = parsed.flags;

    const group = varToGroup.get(varIdentifier);
    if (group) cvar.group = group;

    results.push(cvar);
  }

  return results;
}

// ── ezhud plugin extraction ───────────────────────────────────────────────

/**
 * Standard sub-cvars created by HUD_CreateVar for every HUD element.
 * See hud.c HUD_Register(): order, place, show, align_x, align_y,
 * pos_x, pos_y, frame, frame_color, item_opacity.
 */
const HUD_STANDARD_SUBCVARS: Array<{ name: string; argIndex: number }> = [
  { name: "show",          argIndex: 0 },
  { name: "place",         argIndex: 1 },
  { name: "align_x",       argIndex: 2 },
  { name: "align_y",       argIndex: 3 },
  { name: "pos_x",         argIndex: 4 },
  { name: "pos_y",         argIndex: 5 },
  { name: "frame",         argIndex: 6 },
  { name: "frame_color",   argIndex: 7 },
  { name: "item_opacity",  argIndex: 8 },
];

/**
 * Resolve C #define constants to their string values for defaults.
 * Only covers constants actually used in HUD_Register default args.
 */
const DEFINE_CONSTANTS: Record<string, string> = {
  SPEED_GREEN: "52",
  SPEED_BROWN_RED: "100",
  SPEED_DARK_RED: "72",
  SPEED_BLUE: "216",
  SPEED_RED: "229",
  SPEED_STOPPED: "52",
  SPEED_NORMAL: "100",
  SPEED_FAST: "72",
  SPEED_FASTEST: "216",
  SPEED_INSANE: "229",
};

function resolveConstant(val: string): string {
  return DEFINE_CONSTANTS[val] ?? val;
}

interface HudElement {
  name: string;
  description: string;
  standardDefaults: string[];
  customParams: Array<{ name: string; default: string }>;
}

/**
 * Parse all HUD_Register() calls from ezhud source files.
 *
 * HUD_Register signature:
 *   HUD_Register(name, var_alias, description,
 *     flags, min_state, draw_order, draw_func,
 *     show, place, align_x, align_y, pos_x, pos_y, frame, frame_color,
 *     item_opacity, params_varargs..., NULL)
 */
function extractHudRegistrations(src: string): HudElement[] {
  const elements: HudElement[] = [];
  const callRe = /HUD_Register\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = callRe.exec(src)) !== null) {
    let pos = match.index + match[0].length;

    const nameToken = nextToken(src, pos);
    if (!nameToken) continue;
    const elemName = nameToken.value;
    pos = nameToken.end;

    // Skip the function definition itself (params are C types like "char *name")
    if (elemName.startsWith("char ") || elemName.includes("*")) continue;

    // Skip comma + var_alias
    if (src[skipWs(src, pos)] !== ",") continue;
    pos = skipWs(src, pos) + 1;
    const aliasToken = nextToken(src, pos);
    if (!aliasToken) continue;
    pos = aliasToken.end;

    // Skip comma + description
    if (src[skipWs(src, pos)] !== ",") continue;
    pos = skipWs(src, pos) + 1;
    const descToken = nextToken(src, pos);
    if (!descToken) continue;
    const description = descToken.value === "NULL" ? "" : unescapeC(descToken.value);
    pos = descToken.end;

    // Skip comma + flags, min_state, draw_order, draw_func (4 args)
    let failed = false;
    for (let i = 0; i < 4; i++) {
      if (src[skipWs(src, pos)] !== ",") { failed = true; break; }
      pos = skipWs(src, pos) + 1;
      const tok = nextToken(src, pos);
      if (!tok) { failed = true; break; }
      pos = tok.end;
    }
    if (failed) continue;

    // Read 9 standard defaults: show, place, align_x, align_y, pos_x, pos_y,
    // frame, frame_color, item_opacity
    const standardDefaults: string[] = [];
    for (let i = 0; i < 9; i++) {
      if (src[skipWs(src, pos)] !== ",") { failed = true; break; }
      pos = skipWs(src, pos) + 1;
      const tok = nextToken(src, pos);
      if (!tok) { failed = true; break; }
      standardDefaults.push(tok.value === "NULL" ? "" : resolveConstant(tok.value));
      pos = tok.end;
    }
    if (failed || standardDefaults.length !== 9) continue;

    // After item_opacity: comma + first custom param (or NULL terminator)
    const customParams: Array<{ name: string; default: string }> = [];

    if (src[skipWs(src, pos)] !== ",") continue;
    pos = skipWs(src, pos) + 1;

    const firstParam = nextToken(src, pos);
    if (!firstParam) continue;
    pos = firstParam.end;

    if (firstParam.value !== "NULL") {
      // First param name already read, get its default
      if (src[skipWs(src, pos)] !== ",") continue;
      pos = skipWs(src, pos) + 1;
      const firstDefault = nextToken(src, pos);
      if (!firstDefault) continue;
      customParams.push({
        name: firstParam.value,
        default: firstDefault.value === "NULL" ? "" : resolveConstant(firstDefault.value),
      });
      pos = firstDefault.end;

      // Read remaining name/default pairs until NULL or closing paren
      while (true) {
        const wsPos = skipWs(src, pos);
        if (wsPos >= src.length || src[wsPos] !== ",") break;
        pos = wsPos + 1;

        const paramName = nextToken(src, pos);
        if (!paramName || paramName.value === "NULL") break;
        pos = paramName.end;

        if (src[skipWs(src, pos)] !== ",") break;
        pos = skipWs(src, pos) + 1;

        const paramDefault = nextToken(src, pos);
        if (!paramDefault) break;
        customParams.push({
          name: paramName.value,
          default: paramDefault.value === "NULL" ? "" : resolveConstant(paramDefault.value),
        });
        pos = paramDefault.end;
      }
    }

    elements.push({ name: elemName, description, standardDefaults, customParams });
  }

  return elements;
}

/**
 * Extract standalone cvar registrations via cvarfuncs->GetNVFDG("name", "default", ...).
 * Skips tp_name_* item aliases and cvars already inside HUD_CreateVar (those are
 * handled by extractHudRegistrations).
 */
function extractGetNVFDG(src: string, relPath: string): FteCvar[] {
  const results: FteCvar[] = [];
  const re = /cvarfuncs->GetNVFDG\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(src)) !== null) {
    // Skip if this is inside HUD_CreateVar (the hud.c helper)
    const before = src.slice(Math.max(0, match.index - 100), match.index);
    if (before.includes("HUD_CreateVar")) continue;

    let pos = match.index + match[0].length;

    const nameToken = nextToken(src, pos);
    if (!nameToken || nameToken.value === "NULL") continue;
    pos = nameToken.end;

    if (src[skipWs(src, pos)] !== ",") continue;
    pos = skipWs(src, pos) + 1;

    const defaultToken = nextToken(src, pos);
    if (!defaultToken) continue;
    const defaultVal = defaultToken.value === "NULL" ? "" : defaultToken.value;
    pos = defaultToken.end;

    if (src[skipWs(src, pos)] !== ",") continue;
    pos = skipWs(src, pos) + 1;
    const flagsToken = nextToken(src, pos);
    if (!flagsToken) continue;
    pos = flagsToken.end;

    if (src[skipWs(src, pos)] !== ",") continue;
    pos = skipWs(src, pos) + 1;
    const descToken = nextToken(src, pos);
    if (!descToken) continue;
    const desc = descToken.value === "NULL" ? "" : unescapeC(descToken.value);

    // Skip tp_name_* (item name aliases, not config cvars)
    if (nameToken.value.startsWith("tp_name_")) continue;

    results.push({
      name: nameToken.value,
      default: defaultVal,
      description: desc,
      sourceFile: relPath,
      group: "ezhud",
    });
  }

  return results;
}

/**
 * Convert HudElement registrations into FteCvar entries.
 */
function hudElementsToCvars(elements: HudElement[], relPath: string): FteCvar[] {
  const cvars: FteCvar[] = [];

  for (const elem of elements) {
    for (let i = 0; i < HUD_STANDARD_SUBCVARS.length; i++) {
      const sub = HUD_STANDARD_SUBCVARS[i];
      const defaultVal = elem.standardDefaults[i] ?? "";

      cvars.push({
        name: `hud_${elem.name}_${sub.name}`,
        default: defaultVal,
        description: `${elem.description} [${sub.name}]`,
        sourceFile: relPath,
        group: "ezhud",
      });
    }

    // order cvar (always created)
    cvars.push({
      name: `hud_${elem.name}_order`,
      default: "0",
      description: `${elem.description} [draw order]`,
      sourceFile: relPath,
      group: "ezhud",
    });

    for (const param of elem.customParams) {
      cvars.push({
        name: `hud_${elem.name}_${param.name}`,
        default: param.default,
        description: `${elem.description} [${param.name}]`,
        sourceFile: relPath,
        group: "ezhud",
      });
    }
  }

  return cvars;
}

/** Skip whitespace and block comments, return new position */
function skipWs(src: string, pos: number): number {
  while (pos < src.length && /\s/.test(src[pos])) pos++;
  while (pos < src.length && src[pos] === "/" && src[pos + 1] === "*") {
    const end = src.indexOf("*/", pos + 2);
    if (end === -1) break;
    pos = end + 2;
    while (pos < src.length && /\s/.test(src[pos])) pos++;
  }
  return pos;
}

// ── Global group map ───────────────────────────────────────────────────────

function buildGlobalGroupMap(files: string[]): Map<string, string> {
  const allGroupDefs = new Map<string, string>();
  const allRegistrations = new Map<string, string>();

  for (const f of files) {
    try {
      const src = readFileSync(f, "utf8");
      for (const [k, v] of extractCvargroups(src).entries()) allGroupDefs.set(k, v);
      for (const [k, v] of extractCvarRegistrations(src).entries()) allRegistrations.set(k, v);
    } catch {
      // skip unreadable
    }
  }

  const result = new Map<string, string>();
  for (const [varId, groupVarName] of allRegistrations.entries()) {
    const groupStr = allGroupDefs.get(groupVarName);
    if (groupStr) result.set(varId, groupStr);
  }
  return result;
}

// ── Main ───────────────────────────────────────────────────────────────────

function addCvar(cvar: FteCvar, seenNames: Map<string, FteCvar>, allCvars: FteCvar[]) {
  if (seenNames.has(cvar.name)) {
    const existing = seenNames.get(cvar.name)!;
    if (!existing.group && cvar.group) existing.group = cvar.group;
    if (!existing.description && cvar.description) existing.description = cvar.description;
  } else {
    seenNames.set(cvar.name, cvar);
    allCvars.push(cvar);
  }
}

// ── Phase 1: Engine macros (CVARD, CVARFD, etc.) ──────────────────────────

console.log(`Scanning engine: ${ENGINE_DIR}`);
const engineFiles = walkDir(ENGINE_DIR);
console.log(`Found ${engineFiles.length} .c/.h files in engine/`);

const globalGroupMap = buildGlobalGroupMap(engineFiles);

const allCvars: FteCvar[] = [];
const seenNames = new Map<string, FteCvar>();

let fileCount = 0;
let skipped = 0;

for (const filePath of engineFiles) {
  const relPath = relative(FTE_REPO, filePath);
  let extracted: Array<FteCvar & { varIdentifier: string }>;
  try {
    extracted = extractFromFile(filePath, relPath);
    if (extracted.length > 0) fileCount++;
  } catch {
    skipped++;
    continue;
  }

  for (const raw of extracted) {
    const { varIdentifier, ...cvar } = raw;

    if (!cvar.group && varIdentifier) {
      const g = globalGroupMap.get(varIdentifier);
      if (g) cvar.group = g;
    }

    addCvar(cvar, seenNames, allCvars);
  }
}

const engineCount = allCvars.length;
console.log(`Engine cvars extracted: ${engineCount}`);

// ── Phase 2: ezhud plugin (HUD_Register + GetNVFDG) ──────────────────────

console.log(`\nScanning ezhud plugin: ${EZHUD_DIR}`);
const ezhudFiles = walkDir(EZHUD_DIR);
console.log(`Found ${ezhudFiles.length} .c/.h files in plugins/ezhud/`);

let hudElementCount = 0;
let hudCvarCount = 0;
let standaloneCvarCount = 0;

for (const filePath of ezhudFiles) {
  const relPath = relative(FTE_REPO, filePath);
  const src = readFileSync(filePath, "utf8");

  // Extract HUD_Register() calls
  const elements = extractHudRegistrations(src);
  if (elements.length > 0) {
    hudElementCount += elements.length;
    const hudCvars = hudElementsToCvars(elements, relPath);
    for (const cvar of hudCvars) {
      addCvar(cvar, seenNames, allCvars);
      hudCvarCount++;
    }
  }

  // Extract standalone GetNVFDG calls
  const standaloneCvars = extractGetNVFDG(src, relPath);
  for (const cvar of standaloneCvars) {
    addCvar(cvar, seenNames, allCvars);
    standaloneCvarCount++;
  }
}

// ── Output ────────────────────────────────────────────────────────────────

writeFileSync(OUTPUT_FILE, JSON.stringify(allCvars, null, 2) + "\n");

const withDesc = allCvars.filter((c) => c.description.length > 0).length;
const withGroup = allCvars.filter((c) => c.group).length;
const withAlias = allCvars.filter((c) => c.alias).length;
const withFlags = allCvars.filter((c) => c.flags).length;
const ezhudTotal = allCvars.length - engineCount;

console.log("\n=== FTE cvar extraction summary ===");
console.log(`Engine files scanned:  ${engineFiles.length}`);
console.log(`Engine files w/ cvars: ${fileCount}`);
console.log(`Engine files skipped:  ${skipped}`);
console.log(`Engine cvars:          ${engineCount}`);
console.log(`\nezhud files scanned:   ${ezhudFiles.length}`);
console.log(`HUD elements found:    ${hudElementCount}`);
console.log(`HUD-generated cvars:   ${hudCvarCount}`);
console.log(`Standalone cvars:      ${standaloneCvarCount}`);
console.log(`ezhud cvars (net new): ${ezhudTotal}`);
console.log(`\nTotal unique cvars:    ${allCvars.length}`);
console.log(`With description:      ${withDesc} (${Math.round((withDesc / allCvars.length) * 100)}%)`);
console.log(`With group:            ${withGroup}`);
console.log(`With alias:            ${withAlias}`);
console.log(`With flags:            ${withFlags}`);
console.log(`\nOutput: ${OUTPUT_FILE}`);
