import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const BUNDLE_PATH = resolve(REPO_ROOT, "packages/qw-config/src/data/ezquake-asset-bundle.json");

describe("ezquake-asset-bundle.json shape (Path 1)", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));

  test("every loader site row has parameterized-path fields declared (may be null)", () => {
    const sites = bundle.asset_loader_sites;
    expect(Array.isArray(sites)).toBe(true);
    expect(sites.length).toBeGreaterThan(100);
    for (const s of sites) {
      expect(s).toHaveProperty("path_template");
      expect(s).toHaveProperty("path_parameters");
      expect(s).toHaveProperty("path_extension");
      expect(s).toHaveProperty("format_function");
    }
  });

  test("at least 20 computed-path sites carry a non-null path_template", () => {
    const sites = bundle.asset_loader_sites;
    const withTemplate = sites.filter((s: any) => s.path_template !== null);
    expect(withTemplate.length).toBeGreaterThanOrEqual(20);
  });

  test("bsp-companion template maps/%s.lit is present", () => {
    const sites = bundle.asset_loader_sites;
    const lit = sites.find((s: any) => s.path_template === "maps/%s.lit");
    expect(lit).toBeDefined();
    expect(lit.path_extension).toBe(".lit");
  });
});
