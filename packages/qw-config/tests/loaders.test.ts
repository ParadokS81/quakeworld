import { describe, expect, test } from "bun:test";
import {
  loadEzQuakeCvars,
  getEzQuakeCategories,
  getEzQuakeVarCount,
} from "../src/loaders/ezquake.js";
import { loadFteCvars, getFteCvarCount } from "../src/loaders/fte.js";

describe("ezQuake loader", () => {
  test("loads all variables", () => {
    const cvars = loadEzQuakeCvars();
    expect(cvars.size).toBeGreaterThan(2500);
  });

  test("sensitivity has correct fields", () => {
    const cvars = loadEzQuakeCvars();
    const sens = cvars.get("sensitivity");
    expect(sens).toBeDefined();
    expect(sens!.type).toBe("float");
    expect(sens!.client).toBe("ezquake");
    expect(sens!.description).toBeTruthy();
  });

  test("boolean vars have values", () => {
    const cvars = loadEzQuakeCvars();
    const boolCvar = Array.from(cvars.values()).find((c) => c.type === "boolean");
    expect(boolCvar).toBeDefined();
    expect(boolCvar!.values).toBeDefined();
    expect(boolCvar!.values!.length).toBe(2);
  });

  test("categories have major groups", () => {
    const categories = getEzQuakeCategories();
    expect(categories.length).toBeGreaterThan(5);
    const names = categories.map((c) => c.name);
    expect(names).toContain("Graphics");
    expect(names).toContain("Input");
  });

  test("var count matches", () => {
    expect(getEzQuakeVarCount()).toBeGreaterThan(2500);
  });
});

describe("FTE loader", () => {
  test("loads variables", () => {
    const cvars = loadFteCvars();
    expect(cvars.size).toBeGreaterThan(400);
  });

  test("cvars have descriptions", () => {
    const cvars = loadFteCvars();
    const withDesc = Array.from(cvars.values()).filter((c) => c.description.length > 0);
    expect(withDesc.length / cvars.size).toBeGreaterThan(0.9);
  });

  test("cvars have categories", () => {
    const cvars = loadFteCvars();
    const withCategory = Array.from(cvars.values()).filter((c) => c.category !== "Other");
    expect(withCategory.length).toBeGreaterThan(0);
  });
});
