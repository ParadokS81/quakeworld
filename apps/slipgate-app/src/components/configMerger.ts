import type { ConfigChain, WeaponBind, TeamsayBind, MovementKeys, ChainBindClassification } from "../types";

/** Merged result from selected chain files */
export interface MergedConfigData {
  cvars: Record<string, string>;
  /** Set of cvar names that were user-created via `set` in any file in the chain */
  userCreated: Set<string>;
  binds: [string, string][];
  aliases: Record<string, string>;
}

/** A single enriched bind entry for display */
export interface EnrichedBind {
  key: string;
  command: string;
  category: "movement" | "weapons" | "teamsay" | "ktx" | "unresolved" | "misc";
  label: string;
  description: string;
  sourceFile: string;
  // Comparison data (populated when compare config is loaded)
  hasLeft: boolean;
  hasRight: boolean;
  compareCommand?: string;
  compareCategory?: "movement" | "weapons" | "teamsay" | "ktx" | "unresolved" | "misc";
  compareLabel?: string;
  compareDescription?: string;
  // Set on virtual modifier-combo entries, e.g. "+keychange" — lets the UI
  // show the press/release alias bodies on expand instead of the base command's chain
  modifierAlias?: string;
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
  const userCreated = new Set<string>();
  const bindMap = new Map<string, [string, string]>();
  const aliases: Record<string, string> = {};

  for (let i = 0; i < chain.files.length; i++) {
    if (!selectedIndices.has(i)) continue;
    const file = chain.files[i];

    // Cvars: later file overwrites
    Object.assign(cvars, file.cvars);

    // User-created cvars: union across files
    for (const name of file.user_created ?? []) {
      userCreated.add(name);
    }

    // Binds: last-write-wins per key
    for (const [key, cmd] of file.binds) {
      bindMap.set(key.toUpperCase(), [key, cmd]);
    }

    // Aliases: later file overwrites
    Object.assign(aliases, file.aliases);
  }

  return {
    cvars,
    userCreated,
    binds: Array.from(bindMap.values()),
    aliases,
  };
}

// Structural keywords skipped when checking commands
const STRUCTURAL_KEYWORDS = new Set(["if", "then", "else", "and", "or", "not"]);

/** Check if a single command token is a known ezQuake command, alias, or cvar. */
function isKnownEzQuakeToken(
  token: string,
  aliases: Record<string, string>,
  cvarSet: Set<string>,
  ezquakeCommandSet: Set<string>,
): boolean {
  if (!token) return true;
  if (/^-?\d+(\.\d+)?$/.test(token)) return true;
  if (token.startsWith('"') || token.startsWith("'")) return true;

  // Aliases preserve original case
  if (aliases[token] !== undefined) return true;
  const strippedOrig = token.startsWith("+") || token.startsWith("-") ? token.slice(1) : token;
  if (aliases["+" + strippedOrig] !== undefined) return true;
  if (aliases["-" + strippedOrig] !== undefined) return true;

  // Authoritative ezQuake command set (lowercase keys)
  const lower = token.toLowerCase();
  if (ezquakeCommandSet.has(lower)) return true;

  // Cvar database (lowercase keys)
  if (cvarSet.has(lower)) return true;

  return false;
}

/** Returns true if any token in the compound command is a KTX command. */
function isKtxCommand(command: string, ktxCommandSet: Set<string>): boolean {
  const parts = command.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const firstToken = trimmed.split(/\s+/)[0];
    if (!firstToken) continue;
    if (STRUCTURAL_KEYWORDS.has(firstToken.toLowerCase())) continue;
    if (ktxCommandSet.has(firstToken.toLowerCase())) return true;
  }
  return false;
}

/**
 * Split a compound command on `;` and check the first token of each part.
 * Returns the first unrecognized token, or null if all are known.
 */
function findUnresolvedToken(
  command: string,
  aliases: Record<string, string>,
  cvarSet: Set<string>,
  ezquakeCommandSet: Set<string>,
): string | null {
  const parts = command.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const firstToken = trimmed.split(/\s+/)[0];
    if (!firstToken) continue;
    if (STRUCTURAL_KEYWORDS.has(firstToken.toLowerCase())) continue;
    if (!isKnownEzQuakeToken(firstToken, aliases, cvarSet, ezquakeCommandSet)) {
      return firstToken;
    }
  }
  return null;
}

/**
 * Cross-reference raw binds against categorized weapon/teamsay binds from EzQuakeConfig.
 * All binds are included — movement, weapon, teamsay, and misc.
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
  aliases: Record<string, string>,
  cvarSet: Set<string>,
  ezquakeCommandSet: Set<string>,
  ktxCommandSet: Set<string>,
  compareClassification?: ChainBindClassification | null,
  compareRawCommands?: Record<string, string>,
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

  // Movement keys lookup
  const MOVE_LABELS: Record<string, string> = {
    "+forward": "↑ forward", "+back": "↓ back",
    "+moveleft": "← strafe left", "+moveright": "→ strafe right",
    "+jump": "jump",
    "+moveup": "↑ swim up", "+movedown": "↓ swim down",
  };
  const movementKeys = new Set(
    [movement.forward, movement.back, movement.moveleft, movement.moveright, movement.jump, movement.moveup, movement.movedown]
      .filter(Boolean)
      .map((k) => k.toUpperCase()),
  );

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
    if (!command.trim()) continue;
    seenKeys.add(keyUpper);

    const wb = weaponByKey.get(keyUpper);
    const tb = teamsayByKey.get(keyUpper);
    const sourceFile = sourceFileByKey.get(keyUpper) ?? "";

    // Compare data for this key
    const cmpWb = cmpWeaponByKey.get(keyUpper);
    const cmpTb = cmpTeamsayByKey.get(keyUpper);
    const hasRight = cmpWb != null || cmpTb != null;
    const cmpRawCmd = compareRawCommands?.[keyUpper];
    const compareData = cmpWb
      ? { compareCommand: cmpRawCmd, compareCategory: "weapons" as const, compareLabel: cmpWb.weapon.toUpperCase(), compareDescription: cmpWb.method === "quickfire" ? `${cmpWb.weapon} quickfire` : `${cmpWb.weapon} manual → ${cmpWb.fire_key}` }
      : cmpTb
        ? { compareCommand: cmpRawCmd, compareCategory: "teamsay" as const, compareLabel: cmpTb.label, compareDescription: cmpTb.description }
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
    } else if (movementKeys.has(keyUpper)) {
      const moveLabel = MOVE_LABELS[command.trim().toLowerCase()] ?? command;
      result.push({
        key, command, category: "movement",
        label: moveLabel, description: command,
        sourceFile, hasLeft: true, hasRight, ...compareData,
      });
    } else if (isRocketJump(command, aliases)) {
      result.push({
        key, command, category: "movement",
        label: "rocket jump", description: command,
        sourceFile, hasLeft: true, hasRight, ...compareData,
      });
    } else if (isKtxCommand(command, ktxCommandSet)) {
      result.push({
        key, command, category: "ktx",
        label: "KTX",
        description: `${command} (KTX server command)`,
        sourceFile, hasLeft: true, hasRight, ...compareData,
      });
    } else {
      const unresolvedToken = findUnresolvedToken(command, aliases, cvarSet, ezquakeCommandSet);
      if (unresolvedToken) {
        result.push({
          key, command, category: "unresolved",
          label: unresolvedToken,
          description: `${unresolvedToken} not found in config chain or engine`,
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
  }

  // Add right-only binds (exist in compare but not in primary)
  if (compareClassification) {
    for (const keyUpper of cmpAllKeys) {
      if (seenKeys.has(keyUpper)) continue;

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
        compareCommand: compareRawCommands?.[keyUpper],
        compareCategory: cat, compareLabel: label, compareDescription: desc,
      });
    }
  }

  // Synthesize modifier combos: when a key is bound to a "+xxxx" alias that
  // contains "bind <target> <cmd>" commands, generate virtual "MODKEY+TARGET"
  // rows so the user sees the held-state mapping as first-class bind entries.
  const modifierCombos = synthesizeModifierCombos(rawBinds, aliasMap(chain, selectedIndices));
  for (const combo of modifierCombos) {
    result.push(combo);
  }

  // Sort so modifier combos appear alongside their base key:
  //   R, CTRL+R, SHIFT+R, S, T, ...
  result.sort((a, b) => {
    const baseA = a.key.split("+").pop() ?? a.key;
    const baseB = b.key.split("+").pop() ?? b.key;
    if (baseA !== baseB) return baseA.localeCompare(baseB);
    // Same base key: shorter key (no modifier) comes first
    return a.key.length - b.key.length;
  });

  return result;
}

/** Merge aliases from selected chain files for modifier-combo lookup. */
function aliasMap(chain: ConfigChain, selectedIndices: Set<number>): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < chain.files.length; i++) {
    if (!selectedIndices.has(i)) continue;
    Object.assign(map, chain.files[i].aliases);
  }
  return map;
}

/** Extract `bind <target> <cmd>` commands from an alias body. */
function extractBindsFromAlias(body: string): { target: string; command: string }[] {
  const results: { target: string; command: string }[] = [];
  // Split on `;` but respect quoted strings
  const parts: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"') inQuote = !inQuote;
    if (c === ";" && !inQuote) {
      parts.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const match = part.match(/^bind\s+(\S+)\s+(.+)$/i);
    if (!match) continue;
    const [, target, cmdRaw] = match;
    const cmd = cmdRaw.trim().replace(/^"(.*)"$/, "$1");
    results.push({ target, command: cmd });
  }
  return results;
}

/** Check if a command (or its alias resolution) is a rocket jump: +attack and +jump together. */
function isRocketJump(cmd: string, aliases: Record<string, string>): boolean {
  const resolved = resolveCommand(cmd, aliases);
  const lower = resolved.toLowerCase();
  const parts = lower.split(";").map((s) => s.trim()).filter((s) => !s.startsWith("bind "));
  const hasAttack = parts.some((p) => p.startsWith("+attack") || p.startsWith("+fire ") || p.startsWith("+fire_ar "));
  const hasJump = parts.some((p) => p.startsWith("+jump"));
  return hasAttack && hasJump;
}

/** Lightweight classification for synthesized modifier-combo commands. */
function classifyCommand(cmd: string, aliases?: Record<string, string>): "movement" | "weapons" | "teamsay" | "misc" {
  const t = cmd.trim().toLowerCase();
  if (/^\+(?:forward|back|moveleft|moveright|jump|moveup|movedown)$/.test(t)) return "movement";
  if (aliases && isRocketJump(cmd, aliases)) return "movement";
  if (/^(?:impulse\s+\d+|weapon\s+\d+)/.test(t)) return "weapons";
  if (/\+attack/.test(t)) return "weapons";
  if (/^say_team\b/.test(t)) return "teamsay";
  return "misc";
}

/** Resolve a command through one level of alias lookup. */
function resolveCommand(cmd: string, aliases: Record<string, string>): string {
  const trimmed = cmd.trim();
  if (aliases[trimmed] !== undefined) return aliases[trimmed];
  const firstWord = trimmed.split(/\s+/)[0];
  if (aliases[firstWord] !== undefined) return aliases[firstWord];
  return trimmed;
}

/** Impulse number → weapon short name (mirrors the Rust classifier). */
const IMPULSE_TO_WEAPON: Record<string, string> = {
  "1": "axe",
  "2": "sg",
  "3": "ssg",
  "4": "ng",
  "5": "sng",
  "6": "gl",
  "7": "rl",
  "8": "lg",
};

/** Extract the weapon number from a command, supporting `impulse N` and `weapon N`. */
function extractWeaponNumber(cmd: string): string | null {
  const m = cmd.match(/\b(?:impulse|weapon)\s+(\d+)/);
  return m ? m[1] : null;
}

/** Whether a command fires (+attack) in any form. */
function hasAttack(cmd: string): boolean {
  return /\+attack\b/.test(cmd);
}

/**
 * Synthesize modifier-combo WeaponBind entries for the domain view.
 * Scans `+alias` bodies for `bind <key> <cmd>` where the target command maps
 * to a known weapon (via impulse/weapon number, one level of alias resolution).
 */
export function synthesizeModifierWeaponBinds(
  rawBinds: [string, string][],
  aliases: Record<string, string>,
): WeaponBind[] {
  const combos: WeaponBind[] = [];

  for (const [key, rawCmd] of rawBinds) {
    const cmd = rawCmd.trim();
    if (!cmd.startsWith("+")) continue;

    const aliasName = cmd.split(/\s+/)[0];
    const body = aliases[aliasName];
    if (!body) continue;

    const rebinds = extractBindsFromAlias(body);
    if (rebinds.length === 0) continue;

    const modLabel = key.toUpperCase();
    for (const { target, command } of rebinds) {
      // Resolve through one level of alias lookup so `+grenade` → "impulse 6; +attack" works
      const resolved = resolveCommand(command, aliases);
      const wnum = extractWeaponNumber(resolved);
      if (!wnum) continue;
      const weapon = IMPULSE_TO_WEAPON[wnum];
      if (!weapon) continue;

      const isQuickfire = hasAttack(resolved) || hasAttack(command);
      combos.push({
        weapon,
        key: `${modLabel}+${target.toUpperCase()}`,
        method: isQuickfire ? "quickfire" : "manual",
        fire_key: isQuickfire ? null : "Mouse1",
        modifier_alias: aliasName,
      });
    }
  }

  return combos;
}

/**
 * Synthesize modifier-combo TeamsayBind entries for the domain view.
 * Uses the existing teamsayBinds classification as a reference: if a combo's
 * target command matches a command that's already classified as a teamsay bind
 * (on some other key), reuse that label/category/description.
 */
export function synthesizeModifierTeamsayBinds(
  rawBinds: [string, string][],
  aliases: Record<string, string>,
  teamsayBinds: TeamsayBind[],
): TeamsayBind[] {
  const combos: TeamsayBind[] = [];

  // Build a lookup: command → existing teamsay bind classification
  // (use the raw bind list to map target command → classified teamsay bind)
  const commandToTeamsay = new Map<string, TeamsayBind>();
  const teamsayByKey = new Map<string, TeamsayBind>();
  for (const tb of teamsayBinds) {
    teamsayByKey.set(tb.key.toUpperCase(), tb);
  }
  for (const [key, cmd] of rawBinds) {
    const tb = teamsayByKey.get(key.toUpperCase());
    if (tb) {
      commandToTeamsay.set(cmd.trim(), tb);
    }
  }

  for (const [key, rawCmd] of rawBinds) {
    const cmd = rawCmd.trim();
    if (!cmd.startsWith("+")) continue;

    const aliasName = cmd.split(/\s+/)[0];
    const body = aliases[aliasName];
    if (!body) continue;

    const rebinds = extractBindsFromAlias(body);
    if (rebinds.length === 0) continue;

    const modLabel = key.toUpperCase();
    for (const { target, command } of rebinds) {
      const existing = commandToTeamsay.get(command.trim());
      if (!existing) continue;
      combos.push({
        key: `${modLabel}+${target.toUpperCase()}`,
        category: existing.category,
        label: existing.label,
        description: existing.description,
        modifier_alias: aliasName,
      });
    }
  }

  return combos;
}

/**
 * For each bind of the form `key → +aliasname`, parse the alias body for
 * `bind <target> <cmd>` statements and emit virtual modifier-combo entries.
 */
function synthesizeModifierCombos(
  rawBinds: [string, string][],
  aliases: Record<string, string>,
): EnrichedBind[] {
  const combos: EnrichedBind[] = [];

  for (const [key, rawCmd] of rawBinds) {
    const cmd = rawCmd.trim();
    if (!cmd.startsWith("+")) continue;

    // The command might be "+keychange" or "+keychange arg" — use just the first token
    const aliasName = cmd.split(/\s+/)[0];
    const body = aliases[aliasName];
    if (!body) continue;

    const rebinds = extractBindsFromAlias(body);
    if (rebinds.length === 0) continue;

    const modLabel = key.toUpperCase();
    for (const { target, command } of rebinds) {
      const category = classifyCommand(command);
      combos.push({
        key: `${modLabel}+${target.toUpperCase()}`,
        command,
        category,
        label: category === "misc" ? "combo" : category,
        description: command,
        sourceFile: "",
        hasLeft: true,
        hasRight: false,
        modifierAlias: aliasName,
      });
    }
  }

  return combos;
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
