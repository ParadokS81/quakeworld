import { describe, expect, test } from "bun:test";
import { createSimulatorResolver } from "./resolver.js";
import { createDefaultPlayerState } from "./defaults.js";

describe("createSimulatorResolver", () => {
  test("engine token resolves to value", () => {
    const s = createDefaultPlayerState(); s.health = 87;
    const r = createSimulatorResolver(s, new Map());
    const res = r.resolve("health");
    expect(res).not.toBeNull();
    expect(res!.display).toBe("87");
    expect(res!.origin).toBe("runtime");
  });
  test("short-form %a -> armor", () => {
    const s = createDefaultPlayerState(); s.armor = 150;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("a")!.display).toBe("150");
  });
  test("derived %bestweapon", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("bestweapon")!.display).toBe("rl");
  });
  test("unknown token -> null", () => {
    const s = createDefaultPlayerState();
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("sparklemotion")).toBeNull();
  });
  test("tooltip describes source", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("health")!.tooltip).toContain("health");
  });
});
