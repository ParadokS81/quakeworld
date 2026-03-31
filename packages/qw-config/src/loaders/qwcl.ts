import type { CvarInfo } from "../types.js";
import qwclData from "../data/qwcl-variables.json" with { type: "json" };

// ── Raw JSON type ──────────────────────────────────────────────────────────

interface RawQwclCvar {
  name: string;
  default: string;
  description: string;
  category: string;
  descriptionSource: "ezquake" | "inferred" | "none";
}

const data = qwclData as RawQwclCvar[];

// ── Type inference ─────────────────────────────────────────────────────────

function inferType(defaultVal: string, description: string): CvarInfo["type"] {
  const desc = description.toLowerCase();

  // Boolean: default is 0 or 1, and description suggests toggle
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

// ── Exported functions ─────────────────────────────────────────────────────

export function loadQwclCvars(): Map<string, CvarInfo> {
  const result = new Map<string, CvarInfo>();

  for (const raw of data) {
    const type = inferType(raw.default, raw.description);

    const cvar: CvarInfo = {
      name: raw.name,
      description: raw.description,
      type,
      default: raw.default,
      category: raw.category,
      group: "Original",
      client: "qwcl",
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

export function getQwclCvarCount(): number {
  return data.length;
}
