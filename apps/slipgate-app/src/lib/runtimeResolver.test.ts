import { describe, expect, test } from "bun:test";
import { createLabelResolver } from "./runtimeResolver.js";

describe("LabelResolver", () => {
  const r = createLabelResolver();

  test("long-form tokens map to human label", () => {
    expect(r.resolve("health")?.display).toBe("health");
    expect(r.resolve("bestweapon")?.display).toBe("best weapon");
    expect(r.resolve("location")?.display).toBe("location");
  });

  test("short-form aliases map through to same label", () => {
    expect(r.resolve("h")?.display).toBe("health");
    expect(r.resolve("a")?.display).toBe("armor");
    expect(r.resolve("l")?.display).toBe("location");
    expect(r.resolve("b")?.display).toBe("best weapon");
  });

  test("unknown token returns null", () => {
    expect(r.resolve("nope")).toBeNull();
  });

  test("tooltip mentions the canonical name", () => {
    const res = r.resolve("a");
    expect(res?.tooltip).toContain("armor");
  });
});
