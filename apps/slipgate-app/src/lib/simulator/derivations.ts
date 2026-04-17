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

function resolveWeaponName(w: Weapon, cvars: Map<string, string>): string {
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
