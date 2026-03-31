import type { CvarInfo, CategoryGroup } from "../types.js";
import variablesData from "../data/ezquake-variables.json" with { type: "json" };

// ── Types matching the raw JSON shape ──

interface RawGroup {
  id: string;
  "major-group": string;
  name: string;
}

interface RawVarValue {
  name: string;
  description: string;
}

interface RawVar {
  type: "boolean" | "integer" | "float" | "string" | "enum";
  "group-id": string;
  desc?: string;
  default?: string;
  remarks?: string;
  values?: RawVarValue[];
}

interface RawVariablesData {
  groups: RawGroup[];
  vars: Record<string, RawVar>;
}

const data = variablesData as unknown as RawVariablesData;

// ── Build group-id → { category, group } lookup ──

interface GroupMeta {
  category: string;
  group: string;
}

const groupLookup = new Map<string, GroupMeta>();
for (const g of data.groups) {
  groupLookup.set(g.id, {
    category: g["major-group"],
    group: g.name,
  });
}

// ── Exported functions ──

export function loadEzQuakeCvars(): Map<string, CvarInfo> {
  const result = new Map<string, CvarInfo>();

  for (const [name, raw] of Object.entries(data.vars)) {
    const meta = groupLookup.get(raw["group-id"]) ?? {
      category: "Miscellaneous",
      group: "Other",
    };

    const cvar: CvarInfo = {
      name,
      description: raw.desc ?? "",
      type: raw.type,
      category: meta.category,
      group: meta.group,
      client: "ezquake",
    };

    if (raw.default !== undefined) {
      cvar.default = raw.default;
    }

    if (raw.remarks !== undefined) {
      cvar.remarks = raw.remarks;
    }

    if (raw.values !== undefined) {
      cvar.values = raw.values.map((v) => ({
        name: v.name,
        description: v.description,
      }));
    }

    result.set(name, cvar);
  }

  return result;
}

export function getEzQuakeCategories(): CategoryGroup[] {
  const categoryMap = new Map<string, Set<string>>();

  for (const g of data.groups) {
    const major = g["major-group"];
    if (!categoryMap.has(major)) {
      categoryMap.set(major, new Set());
    }
    categoryMap.get(major)!.add(g.name);
  }

  return Array.from(categoryMap.entries()).map(([name, groups]) => ({
    name,
    groups: Array.from(groups),
  }));
}

export function getEzQuakeVarCount(): number {
  return Object.keys(data.vars).length;
}
