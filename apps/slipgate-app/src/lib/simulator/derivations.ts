import type { PlayerState, Weapon } from "./types.js";

const DEFAULT_WEAPON_NAMES: Record<Weapon, string> = {
  axe: "axe",
  sg: "sg",
  ssg: "ssg",
  ng: "ng",
  sng: "sng",
  gl: "gl",
  rl: "rl",
  lg: "lg",
};

// Priority order lg=8 -> sg=2. axe excluded from $weapons display (ezQuake convention).
const WEAPON_PRIORITY: Weapon[] = ["lg", "rl", "gl", "sng", "ng", "ssg", "sg"];

export function resolveWeaponName(w: Weapon, cvars: Map<string, string>): string {
  return cvars.get(`tp_name_${w}`) ?? DEFAULT_WEAPON_NAMES[w];
}

export function deriveWeaponsString(
  state: PlayerState,
  cvars: Map<string, string>
): string {
  const owned = WEAPON_PRIORITY.filter((w) => state.ownedWeapons.has(w));
  return owned.map((w) => resolveWeaponName(w, cvars)).join(" ");
}

const DEFAULT_TP_WEAPON_ORDER = "8 7 5 3 4 6 2 1";

const IMPULSE_TO_WEAPON: Record<string, Weapon> = {
  "1": "axe",
  "2": "sg",
  "3": "ssg",
  "4": "ng",
  "5": "sng",
  "6": "gl",
  "7": "rl",
  "8": "lg",
};

type AmmoField = "shells" | "nails" | "rockets" | "cells";
const WEAPON_AMMO: Record<Weapon, AmmoField | null> = {
  axe: null,
  sg: "shells",
  ssg: "shells",
  ng: "nails",
  sng: "nails",
  gl: "rockets",
  rl: "rockets",
  lg: "cells",
};

function hasAmmoFor(w: Weapon, state: PlayerState): boolean {
  const f = WEAPON_AMMO[w];
  if (f === null) return true;
  return state[f] > 0;
}

export function deriveBestWeapon(
  state: PlayerState,
  cvars: Map<string, string>
): string {
  const orderStr = cvars.get("tp_weapon_order") ?? DEFAULT_TP_WEAPON_ORDER;
  const tokens = orderStr.split(/\s+/).filter((t) => t.length > 0);
  for (const tok of tokens) {
    const w = IMPULSE_TO_WEAPON[tok];
    if (!w || !state.ownedWeapons.has(w) || !hasAmmoFor(w, state)) continue;
    return resolveWeaponName(w, cvars);
  }
  return resolveWeaponName("sg", cvars);
}

type PowerupKey = "quad" | "pent" | "ring" | "biosuit";
const POWERUP_ORDER: readonly PowerupKey[] = ["quad", "pent", "ring", "biosuit"];
const DEFAULT_POWERUP_NAMES: Record<PowerupKey, string> = {
  quad: "quad", pent: "pent", ring: "eyes", biosuit: "biosuit",
};

export function derivePowerupsString(state: PlayerState, cvars: Map<string, string>): string {
  return POWERUP_ORDER
    .filter((p) => state.activePowerups.has(p))
    .map((p) => cvars.get(`tp_name_${p}`) ?? DEFAULT_POWERUP_NAMES[p])
    .join(" ");
}

const DEFAULT_ARMORTYPE_NAMES: Record<"ga" | "ya" | "ra" | "none", string> = {
  ga: "g", ya: "y", ra: "r", none: "",
};

export function deriveArmortype(state: PlayerState, cvars: Map<string, string>): string {
  return cvars.get(`tp_name_armortype_${state.armorClass}`) ?? DEFAULT_ARMORTYPE_NAMES[state.armorClass];
}

// Health bands per ezQuake colored_armor: <25 red, 25-49 yellow, 50-100 green, >100 white.
export function deriveColoredArmor(state: PlayerState): string {
  const a = state.armor;
  const code = a < 25 ? "f00" : a < 50 ? "ff0" : a <= 100 ? "0f0" : "fff";
  return `&c${code}${a}&r`;
}

const WEAPON_IMPULSE: Record<Weapon, number> = {
  axe: 1, sg: 2, ssg: 3, ng: 4, sng: 5, gl: 6, rl: 7, lg: 8,
};

export function deriveWeaponNum(state: PlayerState): number {
  return WEAPON_IMPULSE[state.currentWeapon];
}

export function deriveAmmo(state: PlayerState): number {
  const f = WEAPON_AMMO[state.currentWeapon];
  return f === null ? 0 : state[f];
}

export function deriveBestAmmo(state: PlayerState, cvars: Map<string, string>): number {
  const best = deriveBestWeapon(state, cvars);
  for (const w of Object.keys(WEAPON_AMMO) as Weapon[]) {
    if (!state.ownedWeapons.has(w)) continue;
    if (resolveWeaponName(w, cvars) === best) {
      const f = WEAPON_AMMO[w];
      return f === null ? 0 : state[f];
    }
  }
  return 0;
}
