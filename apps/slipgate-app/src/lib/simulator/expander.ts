import type { PlayerState, Issue } from "./types.js";
import {
  deriveWeaponsString, deriveBestWeapon, deriveBestAmmo,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo,
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

export function expandVars(
  text: string,
  state: PlayerState,
  cvars: Map<string, string>,
): ExpandResult {
  const issues: Issue[] = [];
  const out = text.replace(/\$(\w+)/g, (raw, name) => {
    const resolved = resolveToken(name, state, cvars);
    if (resolved === null) {
      issues.push({ kind: "unresolved-var", detail: `$${name}` });
      return raw;
    }
    return resolved;
  });
  return { text: out, issues };
}
