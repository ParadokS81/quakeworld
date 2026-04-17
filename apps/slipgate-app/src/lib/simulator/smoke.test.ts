import { describe, expect, test } from "bun:test";
import { createDefaultPlayerState } from "./defaults.js";

describe("simulator smoke test", () => {
  test("default state has axe and shotgun", () => {
    const state = createDefaultPlayerState();
    expect(state.ownedWeapons.has("axe")).toBe(true);
    expect(state.ownedWeapons.has("sg")).toBe(true);
    expect(state.ownedWeapons.has("rl")).toBe(false);
  });

  test("default state has health 100 and 25 shells", () => {
    const s = createDefaultPlayerState();
    expect(s.health).toBe(100);
    expect(s.shells).toBe(25);
  });
});
