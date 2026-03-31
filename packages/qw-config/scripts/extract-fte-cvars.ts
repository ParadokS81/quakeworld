#!/usr/bin/env bun
/**
 * extract-fte-cvars.ts
 *
 * Recursively scans fteqw/engine/ C source files and extracts cvar definitions
 * from CVARD, CVARFD, CVARAFD, and CVARAD macro invocations.
 *
 * Outputs: packages/qw-config/src/data/fte-variables.json
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, relative } from "path";

// ── Paths ──────────────────────────────────────────────────────────────────

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const ENGINE_DIR = join(REPO_ROOT, "research/repos/fteqw/engine");
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

console.log(`Scanning: ${ENGINE_DIR}`);
const allFiles = walkDir(ENGINE_DIR);
console.log(`Found ${allFiles.length} .c/.h files`);

const globalGroupMap = buildGlobalGroupMap(allFiles);

const allCvars: FteCvar[] = [];
const seenNames = new Map<string, FteCvar>();

let fileCount = 0;
let skipped = 0;

for (const filePath of allFiles) {
  const relPath = relative(ENGINE_DIR, filePath);
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

    if (seenNames.has(cvar.name)) {
      const existing = seenNames.get(cvar.name)!;
      if (!existing.group && cvar.group) existing.group = cvar.group;
      if (!existing.description && cvar.description) existing.description = cvar.description;
    } else {
      seenNames.set(cvar.name, cvar);
      allCvars.push(cvar);
    }
  }
}

writeFileSync(OUTPUT_FILE, JSON.stringify(allCvars, null, 2) + "\n");

const withDesc = allCvars.filter((c) => c.description.length > 0).length;
const withGroup = allCvars.filter((c) => c.group).length;
const withAlias = allCvars.filter((c) => c.alias).length;
const withFlags = allCvars.filter((c) => c.flags).length;

console.log("\n=== FTE cvar extraction summary ===");
console.log(`Files scanned:    ${allFiles.length}`);
console.log(`Files with cvars: ${fileCount}`);
console.log(`Files skipped:    ${skipped}`);
console.log(`Unique cvars:     ${allCvars.length}`);
console.log(`With description: ${withDesc} (${Math.round((withDesc / allCvars.length) * 100)}%)`);
console.log(`With group:       ${withGroup}`);
console.log(`With alias:       ${withAlias}`);
console.log(`With flags:       ${withFlags}`);
console.log(`\nOutput: ${OUTPUT_FILE}`);
