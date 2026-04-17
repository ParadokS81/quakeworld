import type { PlayerState } from "./types.js";

// Spawn defaults: health 100, axe + sg owned, 25 shells, everything else zero/empty.
export function createDefaultPlayerState(): PlayerState {
  return {
    health: 100,
    armor: 0,
    armorClass: "none",
    ownedWeapons: new Set(["axe", "sg"]),
    currentWeapon: "sg",
    shells: 25,
    nails: 0,
    rockets: 0,
    cells: 0,
    activePowerups: new Set(),
    powerupTimers: {},
    location: "",
    mapname: "",
    lastloc: "",
    deathloc: "",
    matchname: "",
    matchstatus: "live",
    matchtype: "",
    ledpoint: "none",
    ledstatus: "none",
    point: "",
    pointloc: "",
    pointatloc: "",
    took: "",
    tookloc: "",
    tookatloc: "",
    droploc: "",
    droptime: 0,
    lastpowerup: "",
  };
}
