import { describe, expect, test } from "bun:test";
import { expandVars } from "./expander.js";
import { createDefaultPlayerState } from "./defaults.js";

describe("expandVars -- raw state", () => {
  test("$health -> number", () => {
    const s = createDefaultPlayerState(); s.health = 87;
    const r = expandVars("$health hp", s, new Map());
    expect(r.text).toBe("87 hp");
    expect(r.issues).toHaveLength(0);
  });
  test("$location string", () => {
    const s = createDefaultPlayerState(); s.location = "quad";
    expect(expandVars("at $location", s, new Map()).text).toBe("at quad");
  });
  test("$cells integer", () => {
    const s = createDefaultPlayerState(); s.cells = 42;
    expect(expandVars("cells $cells", s, new Map()).text).toBe("cells 42");
  });
});

describe("expandVars -- derived", () => {
  test("$bestweapon", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5; s.shells = 25;
    expect(expandVars("[$bestweapon]", s, new Map()).text).toBe("[rl]");
  });
  test("$weapons", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl", "lg"]);
    expect(expandVars("'$weapons'", s, new Map()).text).toBe("'lg rl'");
  });
  test("$armortype via class", () => {
    const s = createDefaultPlayerState(); s.armorClass = "ya";
    expect(expandVars("[$armortype]", s, new Map()).text).toBe("[y]");
  });
});

describe("expandVars -- cvars", () => {
  test("$tp_name_rl from cvar map", () => {
    const s = createDefaultPlayerState();
    const cvars = new Map([["tp_name_rl", "{&cf13rl&cfff}"]]);
    expect(expandVars("$tp_name_rl", s, cvars).text).toBe("{&cf13rl&cfff}");
  });
});

describe("expandVars -- unresolved", () => {
  test("unknown preserved + issue", () => {
    const s = createDefaultPlayerState();
    const r = expandVars("hi $haelth", s, new Map());
    expect(r.text).toBe("hi $haelth");
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].kind).toBe("unresolved-var");
    expect(r.issues[0].detail).toContain("haelth");
  });
  test("multiple unresolved", () => {
    const s = createDefaultPlayerState();
    const r = expandVars("$foo and $bar", s, new Map());
    expect(r.issues).toHaveLength(2);
  });
});
