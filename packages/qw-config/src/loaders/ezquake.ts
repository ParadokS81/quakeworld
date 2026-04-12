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
  "server-only"?: boolean;
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

    // Trust the help JSON's own category. The Obsolete group is explicit in
    // the help data — no heuristic override needed.
    const effectiveCategory = meta.category;

    const cvar: CvarInfo = {
      name,
      description: raw.desc ?? "",
      type: raw.type,
      category: effectiveCategory,
      group: meta.group,
      client: "ezquake",
      serverOnly: raw["server-only"] ?? false,
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

// ── Command / macro / cmdline loaders ──

import ezquakeCommandsData from "../data/ezquake-commands.json" with { type: "json" };
import ezquakeMacrosData from "../data/ezquake-macros.json" with { type: "json" };
import ezquakeCmdlineData from "../data/ezquake-cmdline-params.json" with { type: "json" };
import ezquakeDefaultsData from "../data/ezquake-default-commands.json" with { type: "json" };
import type {
  EzQuakeCommandDatabase,
  EzQuakeMacroDatabase,
  EzQuakeCmdlineDatabase,
  CommandInfo,
  MacroInfo,
  CmdlineParamInfo,
} from "../types.js";

interface RawCommand {
  "group-id": string;
  desc: string;
  remarks?: string;
}

interface RawCommandsData {
  groups: Array<{ id: string; name: string }>;
  commands: Record<string, RawCommand>;
}

interface RawMacro {
  desc: string;
  remarks?: string;
}

interface RawMacrosData {
  macros: Record<string, RawMacro>;
}

interface RawCmdlineData {
  params: Record<string, RawMacro>;
}

interface RawDefault {
  name: string;
  args: string;
}

interface RawDefaultsData {
  defaults: RawDefault[];
}

let _commandsCache: EzQuakeCommandDatabase | null = null;
let _macrosCache: EzQuakeMacroDatabase | null = null;
let _cmdlineCache: EzQuakeCmdlineDatabase | null = null;
let _defaultCommandsCache: Set<string> | null = null;

export function loadEzQuakeCommands(): EzQuakeCommandDatabase {
  if (_commandsCache) return _commandsCache;

  const raw = ezquakeCommandsData as unknown as RawCommandsData;
  const groupNameById = new Map(raw.groups.map((g) => [g.id, g.name]));

  const commands = new Map<string, CommandInfo>();
  for (const [name, entry] of Object.entries(raw.commands)) {
    commands.set(name, {
      name,
      groupId: entry["group-id"],
      groupName: groupNameById.get(entry["group-id"]) ?? "Miscellaneous",
      description: entry.desc,
      ...(entry.remarks !== undefined ? { remarks: entry.remarks } : {}),
    });
  }

  _commandsCache = { groups: raw.groups, commands };
  return _commandsCache;
}

export function loadEzQuakeMacros(): EzQuakeMacroDatabase {
  if (_macrosCache) return _macrosCache;

  const raw = ezquakeMacrosData as unknown as RawMacrosData;
  const macros = new Map<string, MacroInfo>();
  for (const [name, entry] of Object.entries(raw.macros)) {
    macros.set(name, {
      name,
      description: entry.desc,
      ...(entry.remarks !== undefined ? { remarks: entry.remarks } : {}),
    });
  }

  _macrosCache = { macros };
  return _macrosCache;
}

export function loadEzQuakeCmdlineParams(): EzQuakeCmdlineDatabase {
  if (_cmdlineCache) return _cmdlineCache;

  const raw = ezquakeCmdlineData as unknown as RawCmdlineData;
  const params = new Map<string, CmdlineParamInfo>();
  for (const [name, entry] of Object.entries(raw.params)) {
    params.set(name, {
      name,
      description: entry.desc,
      ...(entry.remarks !== undefined ? { remarks: entry.remarks } : {}),
    });
  }

  _cmdlineCache = { params };
  return _cmdlineCache;
}

/**
 * Returns a Set of "name||args" strings for fast default-matching.
 * A command invocation is a default if `${name}||${args}` is in this set.
 */
export function loadEzQuakeDefaultCommands(): Set<string> {
  if (_defaultCommandsCache) return _defaultCommandsCache;

  const raw = ezquakeDefaultsData as unknown as RawDefaultsData;
  const set = new Set<string>();
  for (const d of raw.defaults) {
    set.add(`${d.name}||${d.args}`);
  }

  _defaultCommandsCache = set;
  return _defaultCommandsCache;
}
