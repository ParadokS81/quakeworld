import { describe, expect, test } from "bun:test";
import { deriveWeaponsString } from "./derivations.js";
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
