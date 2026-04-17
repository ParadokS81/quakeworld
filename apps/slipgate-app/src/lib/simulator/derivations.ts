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
