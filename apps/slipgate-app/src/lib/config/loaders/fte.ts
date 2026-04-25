import type { CvarInfo } from "../types.js";
import rawData from "../data/fte-variables.json" with { type: "json" };

// ── Raw JSON type ──────────────────────────────────────────────────────────

interface RawFteCvar {
  name: string;
  default: string;
  description: string;
  alias?: string;
  flags?: string;
  sourceFile: string;
  group?: string;
}

const data = rawData as RawFteCvar[];

// ── Type inference ─────────────────────────────────────────────────────────

function inferType(
  defaultVal: string,
  description: string
): CvarInfo["type"] {
  const desc = description.toLowerCase();

  // Boolean: default is 0 or 1, and description mentions enable/disable or on/off
  if (
    (defaultVal === "0" || defaultVal === "1") &&
    (desc.includes("enable") ||
      desc.includes("disable") ||
      desc.includes("whether") ||
      desc.includes(" on ") ||
      desc.includes(" off ") ||
      desc.includes("if set") ||
      desc.includes("if 1") ||
      desc.includes("when set") ||
      desc.includes("when 1"))
  ) {
    return "boolean";
  }

  // Float: has decimal point
  if (/^-?\d+\.\d+$/.test(defaultVal)) {
    return "float";
  }

  // Integer: purely numeric (including negative)
  if (/^-?\d+$/.test(defaultVal)) {
    return "integer";
  }

  return "string";
}

// ── Category inference ─────────────────────────────────────────────────────

/**
 * Map group strings from the source code to human-friendly category names.
 */
const GROUP_TO_CATEGORY: Array<[RegExp, string]> = [
  [/server physics/i, "Server"],
  [/server permission/i, "Server"],
  [/serverinfo/i, "Server"],
  [/server control/i, "Server"],
  [/server/i, "Server"],
  [/progs/i, "Server"],
  [/client/i, "Client"],
  [/input/i, "Input"],
  [/sound/i, "Sound"],
  [/audio/i, "Sound"],
  [/graphic|opengl|gl|video|render|display/i, "Graphics"],
  [/network|net/i, "Network"],
  [/hud|status|console/i, "HUD"],
];

/**
 * Map source file paths to categories.
 */
const FILE_TO_CATEGORY: Array<[RegExp, string]> = [
  [/^client\/cl_/i, "Client"],
  [/^client\//i, "Client"],
  [/^server\/sv_/i, "Server"],
  [/^server\//i, "Server"],
  [/^gl\//i, "Graphics"],
  [/^d3d\//i, "Graphics"],
  [/^vk\//i, "Graphics"],
  [/^sw\//i, "Graphics"],
  [/^common\/snd_/i, "Sound"],
  [/^common\/net_/i, "Network"],
  [/^http\//i, "Network"],
  [/^common\//i, "Common"],
  [/^qclib\//i, "Scripting"],
];

function inferCategory(sourceFile: string, group?: string): string {
  if (group) {
    for (const [pattern, category] of GROUP_TO_CATEGORY) {
      if (pattern.test(group)) return category;
    }
  }

  for (const [pattern, category] of FILE_TO_CATEGORY) {
    if (pattern.test(sourceFile)) return category;
  }

  return "Other";
}

/**
 * Derive a sub-group name from the group string or source file.
 */
function inferGroup(sourceFile: string, group?: string): string {
  if (group) {
    // Capitalise each word
    return group
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Derive from filename: e.g. "client/cl_input.c" → "Input"
  const basename = sourceFile.replace(/^.*\//, "").replace(/\.(c|h)$/, "");
  const prefix = basename.replace(/^(cl|sv|gl|snd|net|in|scr|con|r)_/, "");
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

// ── Exported functions ─────────────────────────────────────────────────────

export function loadFteCvars(): Map<string, CvarInfo> {
  const result = new Map<string, CvarInfo>();

  for (const raw of data) {
    const category = inferCategory(raw.sourceFile, raw.group);
    const group = inferGroup(raw.sourceFile, raw.group);
    const type = inferType(raw.default, raw.description);

    const cvar: CvarInfo = {
      name: raw.name,
      description: raw.description,
      type,
      default: raw.default,
      category,
      group,
      client: "fte",
    };

    if (type === "boolean") {
      cvar.values = [
        { name: "0", description: "Disabled" },
        { name: "1", description: "Enabled" },
      ];
    }

    result.set(raw.name, cvar);
  }

  return result;
}

export function getFteCvarCount(): number {
  return data.length;
}
