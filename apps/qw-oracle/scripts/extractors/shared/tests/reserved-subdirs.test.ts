import { describe, expect, test } from "bun:test";
import { deriveReservedSubdirs } from "../scripts/derive-reserved-subdirs.js";

const fixtureSites = [
  { canonical_id: "ezquake:loader_site:a_1", path_source: "computed", path_literal: "textures/charsets/%s", path_template: "textures/charsets/%s" },
  { canonical_id: "ezquake:loader_site:a_2", path_source: "computed", path_literal: "textures/wad/%s",       path_template: "textures/wad/%s" },
  { canonical_id: "ezquake:loader_site:a_3", path_source: "computed", path_literal: "textures/%s",            path_template: "textures/%s" },
  { canonical_id: "ezquake:loader_site:a_4", path_source: "computed", path_literal: "gfx/%s",                 path_template: "gfx/%s" },
  { canonical_id: "ezquake:loader_site:a_5", path_source: "literal",  path_literal: "gfx/conback.lmp",        path_template: null },
  { canonical_id: "ezquake:loader_site:a_6", path_source: "computed", path_literal: "maps/%s.bsp",            path_template: "maps/%s.bsp" },
  { canonical_id: "ezquake:loader_site:a_7", path_source: "computed", path_literal: "env/%s_ft.tga",          path_template: "env/%s_ft.tga" },
];

describe("deriveReservedSubdirs", () => {
  test("extracts two-segment reserved subdirs, skips single-segment patterns", () => {
    const out = deriveReservedSubdirs(fixtureSites as any);
    const keys = out.map((r) => `${r.parent_dir}/${r.subdir_name}`).sort();
    expect(keys).toEqual(["textures/charsets", "textures/wad"]);
  });

  test("single-segment templates (textures/%s, gfx/%s, maps/%s.bsp, env/%s_ft.tga) are not reserved", () => {
    const out = deriveReservedSubdirs(fixtureSites as any);
    for (const r of out) {
      expect(r.subdir_name).not.toBe("%s");
    }
  });

  test("each reserved subdir carries loader_site_refs with at least one canonical_id", () => {
    const out = deriveReservedSubdirs(fixtureSites as any);
    for (const r of out) {
      expect(Array.isArray(r.loader_site_refs)).toBe(true);
      expect(r.loader_site_refs.length).toBeGreaterThan(0);
    }
  });
});
