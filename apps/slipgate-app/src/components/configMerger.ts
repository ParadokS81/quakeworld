import type { ConfigChain, WeaponBind, TeamsayBind, MovementKeys, ChainBindClassification } from "../types";

/** Merged result from selected chain files */
export interface MergedConfigData {
  cvars: Record<string, string>;
  binds: [string, string][];
  aliases: Record<string, string>;
}

/** A single enriched bind entry for display */
export interface EnrichedBind {
  key: string;
  command: string;
  category: "weapons" | "teamsay" | "misc";
  label: string;
  description: string;
  sourceFile: string;
  // Comparison data (populated when compare config is loaded)
  hasLeft: boolean;
  hasRight: boolean;
  compareCommand?: string;
  compareCategory?: "weapons" | "teamsay" | "misc";
  compareLabel?: string;
  compareDescription?: string;
}

/** A single alias entry for display */
export interface EnrichedAlias {
  name: string;
  command: string;
  sourceFile: string;
}

/**
 * Merge cvars/binds/aliases from selected files in chain order.
 * Later files override earlier ones (last-write-wins, matching ezQuake exec semantics).
 */
export function mergeSelectedFiles(
  chain: ConfigChain,
  selectedIndices: Set<number>,
): MergedConfigData {
  const cvars: Record<string, string> = {};
  const bindMap = new Map<string, [string, string]>();
  const aliases: Record<string, string> = {};

  for (let i = 0; i < chain.files.length; i++) {
    if (!selectedIndices.has(i)) continue;
    const file = chain.files[i];

    // Cvars: later file overwrites
    Object.assign(cvars, file.cvars);

    // Binds: last-write-wins per key
    for (const [key, cmd] of file.binds) {
      bindMap.set(key.toUpperCase(), [key, cmd]);
    }

    // Aliases: later file overwrites
    Object.assign(aliases, file.aliases);
  }

  return {
    cvars,
    binds: Array.from(bindMap.values()),
    aliases,
  };
}

/**
 * Cross-reference raw binds against categorized weapon/teamsay binds from EzQuakeConfig.
 * Movement keys are excluded from the list (they're shown contextually).
 * When compareClassification is provided, merges comparison data into each bind entry
 * and adds right-only binds.
 */
export function categorizeBinds(
  rawBinds: [string, string][],
  weaponBinds: WeaponBind[],
  teamsayBinds: TeamsayBind[],
  movement: MovementKeys,
  chain: ConfigChain,
  selectedIndices: Set<number>,
  compareClassification?: ChainBindClassification | null,
): EnrichedBind[] {
  // Build lookup maps
  const weaponByKey = new Map<string, WeaponBind>();
  for (const wb of weaponBinds) {
    weaponByKey.set(wb.key.toUpperCase(), wb);
  }

  const teamsayByKey = new Map<string, TeamsayBind>();
  for (const tb of teamsayBinds) {
    teamsayByKey.set(tb.key.toUpperCase(), tb);
  }

  // Movement keys to exclude from bind list (from both configs)
  const movementKeys = new Set(
    [movement.forward, movement.back, movement.moveleft, movement.moveright, movement.jump]
      .filter(Boolean)
      .map((k) => k.toUpperCase()),
  );
  if (compareClassification) {
    const cm = compareClassification.movement;
    for (const k of [cm.forward, cm.back, cm.moveleft, cm.moveright, cm.jump]) {
      if (k) movementKeys.add(k.toUpperCase());
    }
  }

  // Build source file lookup: for each key, which selected file last defined it
  const sourceFileByKey = new Map<string, string>();
  for (let i = 0; i < chain.files.length; i++) {
    if (!selectedIndices.has(i)) continue;
    for (const [key] of chain.files[i].binds) {
      sourceFileByKey.set(key.toUpperCase(), chain.files[i].name);
    }
  }

  // Build compare lookup maps
  const cmpWeaponByKey = new Map<string, WeaponBind>();
  const cmpTeamsayByKey = new Map<string, TeamsayBind>();
  const cmpAllKeys = new Set<string>();
  if (compareClassification) {
    for (const wb of compareClassification.weapon_binds) {
      cmpWeaponByKey.set(wb.key.toUpperCase(), wb);
      cmpAllKeys.add(wb.key.toUpperCase());
    }
    for (const tb of compareClassification.teamsay_binds) {
      cmpTeamsayByKey.set(tb.key.toUpperCase(), tb);
      cmpAllKeys.add(tb.key.toUpperCase());
    }
  }

  const seenKeys = new Set<string>();
  const result: EnrichedBind[] = [];

  // Process primary binds
  for (const [key, command] of rawBinds) {
    const keyUpper = key.toUpperCase();
    if (movementKeys.has(keyUpper)) continue;
    if (!command.trim()) continue;
    seenKeys.add(keyUpper);

    const wb = weaponByKey.get(keyUpper);
    const tb = teamsayByKey.get(keyUpper);
    const sourceFile = sourceFileByKey.get(keyUpper) ?? "";

    // Compare data for this key
    const cmpWb = cmpWeaponByKey.get(keyUpper);
    const cmpTb = cmpTeamsayByKey.get(keyUpper);
    const hasRight = cmpWb != null || cmpTb != null;
    const compareData = cmpWb
      ? { compareCategory: "weapons" as const, compareLabel: cmpWb.weapon.toUpperCase(), compareDescription: cmpWb.method === "quickfire" ? `${cmpWb.weapon} quickfire` : `${cmpWb.weapon} manual → ${cmpWb.fire_key}` }
      : cmpTb
        ? { compareCategory: "teamsay" as const, compareLabel: cmpTb.label, compareDescription: cmpTb.description }
        : {};

    if (wb) {
      result.push({
        key: wb.key, command, category: "weapons",
        label: wb.weapon.toUpperCase(),
        description: wb.method === "quickfire" ? `${wb.weapon} quickfire` : `${wb.weapon} manual → ${wb.fire_key}`,
        sourceFile, hasLeft: true, hasRight, ...compareData,
      });
    } else if (tb) {
      result.push({
        key: tb.key, command, category: "teamsay",
        label: tb.label, description: tb.description,
        sourceFile, hasLeft: true, hasRight, ...compareData,
      });
    } else {
      result.push({
        key, command, category: "misc",
        label: command.length > 24 ? `${command.slice(0, 24)}...` : command,
        description: command,
        sourceFile, hasLeft: true, hasRight, ...compareData,
      });
    }
  }

  // Add right-only binds (exist in compare but not in primary)
  if (compareClassification) {
    for (const keyUpper of cmpAllKeys) {
      if (seenKeys.has(keyUpper) || movementKeys.has(keyUpper)) continue;

      const cmpWb = cmpWeaponByKey.get(keyUpper);
      const cmpTb = cmpTeamsayByKey.get(keyUpper);
      const cat = cmpWb ? "weapons" as const : cmpTb ? "teamsay" as const : "misc" as const;
      const label = cmpWb ? cmpWb.weapon.toUpperCase() : cmpTb ? cmpTb.label : "";
      const desc = cmpWb
        ? (cmpWb.method === "quickfire" ? `${cmpWb.weapon} quickfire` : `${cmpWb.weapon} manual → ${cmpWb.fire_key}`)
        : cmpTb ? cmpTb.description : "";
      const displayKey = cmpWb?.key ?? cmpTb?.key ?? keyUpper;

      result.push({
        key: displayKey, command: "", category: cat,
        label: "", description: "",
        sourceFile: "", hasLeft: false, hasRight: true,
        compareCategory: cat, compareLabel: label, compareDescription: desc,
      });
    }
  }

  return result;
}

/**
 * Merge aliases from selected files, tracking source file for each.
 */
export function mergeAliases(
  chain: ConfigChain,
  selectedIndices: Set<number>,
): EnrichedAlias[] {
  const aliasMap = new Map<string, EnrichedAlias>();

  for (let i = 0; i < chain.files.length; i++) {
    if (!selectedIndices.has(i)) continue;
    const file = chain.files[i];
    for (const [name, command] of Object.entries(file.aliases)) {
      aliasMap.set(name, { name, command, sourceFile: file.name });
    }
  }

  return Array.from(aliasMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
