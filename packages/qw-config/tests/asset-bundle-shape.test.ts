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

  test("bsp-companion template maps/%s.pts is present", () => {
    // maps/%s.lit would be the obvious bsp-companion sentinel, but the
    // .lit call sites in r_brushmodel_load.c:108-127 dereference a local
    // pointer (FS_LoadHunkFile(*litfilename, ...)) that was assigned from
    // va() on a previous line. FS_LoadHunkFile IS in the watchlist, but
    // the format-template classifier does not follow pointer indirection,
    // so the template is not recovered today. This is a Path 1 capability
    // gap. maps/%s.pts (R_ReadPointFile_f via FS_OpenVFS) is the
    // structural equivalent the classifier can resolve directly.
    const sites = bundle.asset_loader_sites;
    const pts = sites.find((s: any) => s.path_template === "maps/%s.pts");
    expect(pts).toBeDefined();
    expect(pts.path_extension).toBe(".pts");
  });
});

describe("ezquake-asset-bundle.json shape (Path 2)", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));

  test("bundle carries a non-empty reserved_subdirs array", () => {
    expect(Array.isArray(bundle.reserved_subdirs)).toBe(true);
    expect(bundle.reserved_subdirs.length).toBeGreaterThanOrEqual(5);
  });

  test("reserved_subdirs includes textures/charsets and textures/wad", () => {
    const keys = bundle.reserved_subdirs.map((r: any) => `${r.parent_dir}/${r.subdir_name}`);
    expect(keys).toContain("textures/charsets");
    expect(keys).toContain("textures/wad");
  });
});

describe("Path 3: new loader-family call sites", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));
  const siteFunctions = new Set(bundle.asset_loader_sites.map((s: any) => s.function_name));

  // Step 1 investigation findings (2026-04-22): only three of the plan's
  // candidate names exist verbatim in ezquake head.
  //   TP_LoadLocFile    -- confirmed (teamplay_locfiles.c:84), takes char* path at arg[0]
  //   PlayQWZDemo       -- confirmed (cl_demo.c:3123, static), takes const char* name at arg[0]
  //   FS_LoadHunkFile   -- confirmed (fs.c:403), generic loader; captures .lit/.dat via ext
  // Other candidates (R_LoadLighting, Log_OpenLogfile, Help_LoadXML,
  // Key_LoadBindings, IN_LoadKeymap, PR_LoadProgs, CL_Demo_Unpack_QWZ,
  // Plug_Load) do not exist; their call paths either run through
  // FS_LoadHunkFile already (progs.dat, .lit) or go through raw fopen
  // (Log_AutoLogging_*) which the AST watchlist intentionally skips.
  const expected = [
    "TP_LoadLocFile",
    "PlayQWZDemo",
    "FS_LoadHunkFile",
  ];

  for (const fn of expected) {
    test(`extractor captures at least one call to ${fn}`, () => {
      expect(siteFunctions.has(fn)).toBe(true);
    });
  }
});
