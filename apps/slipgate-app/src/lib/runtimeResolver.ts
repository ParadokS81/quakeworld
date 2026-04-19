import type { RuntimeResolver, RuntimeResolution } from "./simulator/index.js";
export type { RuntimeResolver, RuntimeResolution };

const SHORT_FORM_ALIASES: Record<string, string> = {
  a: "armor", h: "health", l: "location",
  w: "weapon", b: "bestweapon",
  c: "cells", r: "rockets", n: "nails", s: "shells",
  p: "powerups", d: "deathloc", t: "took",
  // %x is the item being pointed at, %y is that item's location.
  // ezQuake sets $point / $pointloc internally via the teamplay pointing
  // system before firing point messages.
  x: "point", y: "pointloc",
  u: "need",
};

const LABELS: Record<string, { display: string; description: string }> = {
  health: { display: "health", description: "player health" },
  armor: { display: "armor", description: "player armor value" },
  armortype: { display: "armor type", description: "armor type letter (g/y/r/none)" },
  colored_armor: { display: "armor", description: "armor value with health-band color codes" },
  weapon: { display: "weapon", description: "currently selected weapon" },
  weapons: { display: "weapons", description: "space-joined list of owned weapons" },
  bestweapon: { display: "best weapon", description: "highest-priority owned weapon with ammo" },
  weaponnum: { display: "weapon number", description: "impulse number of current weapon" },
  ammo: { display: "ammo", description: "ammo count for current weapon" },
  bestammo: { display: "best ammo", description: "ammo count for bestweapon" },
  cells: { display: "cells", description: "cells count" },
  rockets: { display: "rockets", description: "rockets count" },
  nails: { display: "nails", description: "nails count" },
  shells: { display: "shells", description: "shells count" },
  powerups: { display: "powerups", description: "space-joined active powerups" },
  location: { display: "location", description: "player location" },
  mapname: { display: "map", description: "current map" },
  lastloc: { display: "last location", description: "last location visited" },
  deathloc: { display: "death location", description: "location of last death" },
  matchname: { display: "match", description: "match name" },
  matchstatus: { display: "match status", description: "match status" },
  matchtype: { display: "match type", description: "match type" },
  ledpoint: { display: "LED point", description: "LED point color" },
  ledstatus: { display: "LED status", description: "LED status color" },
  point: { display: "item", description: "item currently being pointed at (crosshair target)" },
  pointloc: { display: "item location", description: "location of item being pointed at" },
  took: { display: "took", description: "last item taken" },
  tookloc: { display: "took location", description: "where item was taken" },
  droploc: { display: "drop location", description: "last backpack drop location" },
  lastpowerup: { display: "last powerup", description: "last powerup taken" },
  need: { display: "need", description: "current item the player needs (ezQuake teamplay need state)" },
};

export function createLabelResolver(): RuntimeResolver {
  return {
    resolve(token: string): RuntimeResolution | null {
      const canonical = SHORT_FORM_ALIASES[token] ?? token;
      const entry = LABELS[canonical];
      if (!entry) return null;
      return {
        display: entry.display,
        tooltip: `%${token} (${canonical}): ${entry.description}`,
        origin: "runtime",
      };
    },
  };
}
