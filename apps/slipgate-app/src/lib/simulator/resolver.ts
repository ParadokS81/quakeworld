import type { PlayerState } from "./types.js";
import { expandVars } from "./expander.js";

export interface RuntimeResolution {
  display: string;
  tooltip: string;
  origin: "runtime";
  active?: boolean;
}

export interface RuntimeResolver {
  resolve(token: string): RuntimeResolution | null;
}

const SHORT_FORM_ALIASES: Record<string, string> = {
  a: "armor", h: "health", l: "location",
  w: "weapon", b: "bestweapon",
  c: "cells", r: "rockets", n: "nails", s: "shells",
  p: "powerups", d: "deathloc", t: "took",
  x: "ammo", y: "weaponnum",
};

const TOKEN_DESCRIPTIONS: Record<string, string> = {
  health: "player health",
  armor: "player armor value",
  armortype: "armor type letter (g/y/r/none)",
  colored_armor: "armor value with health-band color codes",
  weapon: "currently selected weapon (tp_name_*)",
  weapons: "space-joined list of owned weapons",
  bestweapon: "highest-priority owned weapon with ammo",
  weaponnum: "impulse number of current weapon",
  ammo: "ammo count for current weapon",
  bestammo: "ammo count for bestweapon",
  cells: "cells count",
  rockets: "rockets count",
  nails: "nails count",
  shells: "shells count",
  powerups: "space-joined active powerups",
  location: "player location",
  mapname: "current map",
  lastloc: "last location visited",
  deathloc: "location of last death",
  matchname: "match name",
  matchstatus: "match status",
  matchtype: "match type",
  ledpoint: "LED point color",
  ledstatus: "LED status color",
  point: "pointed-at player name",
  pointloc: "location of pointed-at player",
  pointatloc: "at-location form",
  took: "last item taken",
  tookloc: "where item was taken",
  tookatloc: "at-location form for took",
  droploc: "last backpack drop location",
  droptime: "seconds since last drop",
  lastpowerup: "last powerup taken",
};

export function createSimulatorResolver(
  state: PlayerState,
  cvars: Map<string, string>,
): RuntimeResolver {
  return {
    resolve(token: string): RuntimeResolution | null {
      const canonical = SHORT_FORM_ALIASES[token] ?? token;
      const desc = TOKEN_DESCRIPTIONS[canonical];
      if (!desc) return null;
      const { text } = expandVars(`$${canonical}`, state, cvars);
      if (text === `$${canonical}`) return null;
      return {
        display: text,
        tooltip: `${canonical}: ${desc}`,
        origin: "runtime",
      };
    },
  };
}
