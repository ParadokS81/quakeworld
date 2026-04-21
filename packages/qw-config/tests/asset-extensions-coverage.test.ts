import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const BUNDLE_PATH = resolve(import.meta.dir, "../src/data/ezquake-asset-bundle.json");

describe("asset_extensions path_hint coverage", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));
  const byExt = (ext: string) =>
    bundle.asset_extensions.filter((e: any) => e.extension === ext);

  test(".png has all six path_hint variants that .tga has", () => {
    const tga = byExt(".tga").map((e: any) => e.path_hint).sort();
    const png = byExt(".png").map((e: any) => e.path_hint).sort();
    expect(png).toEqual(tga);
  });

  test(".jpg has all six path_hint variants that .tga has", () => {
    const tga = byExt(".tga").map((e: any) => e.path_hint).sort();
    const jpg = byExt(".jpg").map((e: any) => e.path_hint).sort();
    expect(jpg).toEqual(tga);
  });
});

describe("new loader-family categories + extensions", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));

  const expectedCategories = [
    "log", "locfile", "map_lighting", "help_xml", "quakec_progs",
    "keymap", "sprite", "demo_archive", "plugin",
  ];

  for (const c of expectedCategories) {
    test(`asset_category '${c}' exists in bundle`, () => {
      expect(bundle.asset_categories[c]).toBeDefined();
    });
  }

  const expectedExtensionToCategory: Array<[string, string]> = [
    [".log",   "log"],
    [".loc",   "locfile"],
    [".lit",   "map_lighting"],
    [".xml",   "help_xml"],
    [".dat",   "quakec_progs"],
    [".kmap",  "keymap"],
    [".spr",   "sprite"],
    [".qwz",   "demo_archive"],
    [".dll",   "plugin"],
  ];

  for (const [ext, cat] of expectedExtensionToCategory) {
    test(`extension ${ext} maps to category ${cat}`, () => {
      const catCanonical = `ezquake:asset_category:${cat}`;
      const match = bundle.asset_extensions.find((e: any) => e.extension === ext && e.category_id === catCanonical);
      expect(match).toBeDefined();
    });
  }
});
