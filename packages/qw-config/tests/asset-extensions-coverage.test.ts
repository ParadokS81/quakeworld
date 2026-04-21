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
