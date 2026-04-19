import type { PlayerState, Issue } from "./types.js";
import {
  deriveWeaponsString, deriveBestWeapon, deriveBestAmmo,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo, deriveNeed,
} from "./derivations.js";

export interface ExpandResult {
  text: string;
  issues: Issue[];
}

function resolveDerived(name: string, state: PlayerState, cvars: Map<string, string>): string | null {
  switch (name) {
    case "weapons": return deriveWeaponsString(state, cvars);
    case "bestweapon": return deriveBestWeapon(state, cvars);
    case "bestammo": return String(deriveBestAmmo(state, cvars));
    case "powerups": return derivePowerupsString(state, cvars);
    case "armortype": return deriveArmortype(state, cvars);
    case "colored_armor": return deriveColoredArmor(state);
    case "weaponnum": return String(deriveWeaponNum(state));
    case "ammo": return String(deriveAmmo(state));
    // %u / %need: derived list of under-threshold items. NOTE: we only
    // derive when the token name is exactly "u" (the ezQuake short form);
    // bare "need" still resolves via the $need cvar so conditionals like
    // `if ('$need' == '$tp_name_nothing')` keep working. The SimulatorResolver
    // uses a TOKEN_DESCRIPTIONS entry for "u" so %u and %need both surface
    // as runtime tokens in the pretty view, but the derivation only fires
    // for the "u" canonical form.
    case "u": return deriveNeed(state, cvars);
    default: return null;
  }
}

const NUMERIC_FIELDS = [
  "health", "armor", "shells", "nails", "rockets", "cells", "droptime",
];
const STRING_FIELDS = [
  "location", "mapname", "lastloc", "deathloc",
  "matchname", "matchstatus", "matchtype",
  "point", "pointloc", "pointatloc",
  "took", "tookloc", "tookatloc", "droploc", "lastpowerup",
  "ledpoint", "ledstatus",
];

function resolveRaw(name: string, state: PlayerState): string | null {
  if (NUMERIC_FIELDS.includes(name)) {
    return String((state as unknown as Record<string, number>)[name]);
  }
  if (STRING_FIELDS.includes(name)) {
    return (state as unknown as Record<string, string>)[name];
  }
  if (name === "armorClass") return state.armorClass;
  return null;
}

function resolveToken(name: string, state: PlayerState, cvars: Map<string, string>): string | null {
  // $weapon = tp_name_<currentWeapon>.
  if (name === "weapon") {
    return cvars.get(`tp_name_${state.currentWeapon}`) ?? state.currentWeapon;
  }
  const derived = resolveDerived(name, state, cvars);
  if (derived !== null) return derived;
  const raw = resolveRaw(name, state);
  if (raw !== null) return raw;
  const cvar = cvars.get(name);
  if (cvar !== undefined) return cvar;
  return null;
}

const MAX_EXPAND_DEPTH = 8;

export function expandVars(
  text: string,
  state: PlayerState,
  cvars: Map<string, string>,
  positionalArgs: string[] = [],
): ExpandResult {
  const issues: Issue[] = [];

  function expand(current: string, depth: number): string {
    if (depth >= MAX_EXPAND_DEPTH) {
      issues.push({
        kind: "depth-cap-reached",
        detail: `expansion depth cap (${MAX_EXPAND_DEPTH}) in "${current}"`,
      });
      return current;
    }

    // Positional args %1..%9.
    const afterPos = current.replace(/%([1-9])/g, (raw, digit) => {
      const idx = Number(digit) - 1;
      return positionalArgs[idx] ?? raw;
    });

    // $qt -> ".
    const afterQt = afterPos.replace(/\$qt\b/g, '"');

    // $name references, potentially recursive.
    return afterQt.replace(/\$(\w+)/g, (raw, name) => {
      const resolved = resolveToken(name, state, cvars);
      if (resolved === null) {
        issues.push({ kind: "unresolved-var", detail: `$${name}` });
        return raw;
      }
      if (/\$\w+|%[1-9]/.test(resolved)) {
        return expand(resolved, depth + 1);
      }
      return resolved;
    });
  }

  return { text: expand(text, 0), issues };
}
