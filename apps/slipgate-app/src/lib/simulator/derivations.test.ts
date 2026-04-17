import { describe, expect, test } from "bun:test";
import {
  deriveWeaponsString, deriveBestWeapon,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo, deriveBestAmmo,
} from "./derivations.js";
import { createDefaultPlayerState } from "./defaults.js";

describe("deriveWeaponsString", () => {
  test("joins owned weapons using user tp_name_* values", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "ssg", "rl", "lg"]);
    const cvars = new Map([
      ["tp_name_sg", "sg"],
      ["tp_name_ssg", "ssg"],
      ["tp_name_rl", "rl"],
      ["tp_name_lg", "lg"],
    ]);
    expect(deriveWeaponsString(s, cvars)).toBe("lg rl ssg sg");
  });

  test("falls back to default weapon name when cvar missing", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    expect(deriveWeaponsString(s, new Map())).toBe("rl");
  });

  test("orders by priority (lg=8 first, sg=2 last)", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl", "lg"]);
    expect(deriveWeaponsString(s, new Map())).toBe("lg rl sg");
  });
});

describe("deriveBestWeapon", () => {
  test("picks highest-priority owned with ammo (default tp_weapon_order)", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5;
    s.shells = 25;
    // Default "8 7 5 3 4 6 2 1" -> rl(7) before sg(2), both qualify.
    expect(deriveBestWeapon(s, new Map())).toBe("rl");
  });

  test("skips weapons without ammo", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 0;
    s.shells = 25;
    expect(deriveBestWeapon(s, new Map())).toBe("sg");
  });

  test("respects custom tp_weapon_order", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["lg", "rl"]);
    s.cells = 30;
    s.rockets = 5;
    const cvars = new Map([["tp_weapon_order", "7 8 5 3 4 6 2 1"]]);
    expect(deriveBestWeapon(s, cvars)).toBe("rl");
  });

  test("uses user tp_name_* value in result", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5;
    const cvars = new Map([["tp_name_rl", "{&cf13rl&cfff}"]]);
    expect(deriveBestWeapon(s, cvars)).toBe("{&cf13rl&cfff}");
  });

  test("falls back to tp_name_sg default when nothing qualifies", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 0;
    s.shells = 0;
    expect(deriveBestWeapon(s, new Map())).toBe("sg");
  });

  test("accepts contiguous-digit tp_weapon_order (real user format)", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5;
    s.shells = 25;
    const cvars = new Map([["tp_weapon_order", "78564321"]]);
    expect(deriveBestWeapon(s, cvars)).toBe("rl");
  });
});

describe("derivePowerupsString", () => {
  test("joins active powerups using tp_name_*", () => {
    const s = createDefaultPlayerState();
    s.activePowerups = new Set(["quad", "ring"]);
    const cvars = new Map([["tp_name_quad", "QUAD"], ["tp_name_ring", "EYES"]]);
    expect(derivePowerupsString(s, cvars)).toBe("QUAD EYES");
  });
  test("empty when no powerups", () => {
    const s = createDefaultPlayerState();
    expect(derivePowerupsString(s, new Map())).toBe("");
  });
});

describe("deriveArmortype", () => {
  test("resolves via tp_name_armortype_*", () => {
    const s = createDefaultPlayerState();
    s.armorClass = "ga";
    const cvars = new Map([["tp_name_armortype_ga", "g"]]);
    expect(deriveArmortype(s, cvars)).toBe("g");
  });
  test("defaults when cvar missing", () => {
    const s = createDefaultPlayerState();
    s.armorClass = "ra";
    expect(deriveArmortype(s, new Map())).toBe("r");
  });
});

describe("deriveColoredArmor", () => {
  test("color follows armorClass, not value", () => {
    const s = createDefaultPlayerState();
    s.armor = 100;
    s.armorClass = "ra"; expect(deriveColoredArmor(s)).toBe("&cf00100&r");
    s.armorClass = "ya"; expect(deriveColoredArmor(s)).toBe("&cff0100&r");
    s.armorClass = "ga"; expect(deriveColoredArmor(s)).toBe("&c0f0100&r");
  });
  test("no armor / none class -> plain value string, no color", () => {
    const s = createDefaultPlayerState();
    s.armor = 0;   s.armorClass = "ra"; expect(deriveColoredArmor(s)).toBe("0");
    s.armor = 50;  s.armorClass = "none"; expect(deriveColoredArmor(s)).toBe("50");
  });
});

describe("deriveWeaponNum", () => {
  test("maps weapon to impulse digit", () => {
    const s = createDefaultPlayerState();
    s.currentWeapon = "rl"; expect(deriveWeaponNum(s)).toBe(7);
    s.currentWeapon = "axe"; expect(deriveWeaponNum(s)).toBe(1);
    s.currentWeapon = "lg"; expect(deriveWeaponNum(s)).toBe(8);
  });
});

describe("deriveAmmo / deriveBestAmmo", () => {
  test("deriveAmmo -> currentWeapon ammo", () => {
    const s = createDefaultPlayerState();
    s.currentWeapon = "rl"; s.rockets = 12;
    expect(deriveAmmo(s)).toBe(12);
  });
  test("axe has 0 ammo", () => {
    const s = createDefaultPlayerState();
    s.currentWeapon = "axe";
    expect(deriveAmmo(s)).toBe(0);
  });
  test("deriveBestAmmo -> ammo for best weapon", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 9; s.shells = 25;
    expect(deriveBestAmmo(s, new Map())).toBe(9);
  });
});
