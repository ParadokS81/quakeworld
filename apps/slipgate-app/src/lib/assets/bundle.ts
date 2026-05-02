// apps/slipgate-app/src/lib/assets/bundle.ts
//
// Slipgate currently ships two engine asset bundles. Order is precedence-bearing
// for the runtime classifier in src-tauri/src/commands/browse.rs: the Rust side
// flattens its rules ezquake-then-fte and uses first-match-wins for category
// classification, so ezQuake rules win on shared extensions. The TS hydrate
// order below MUST match — ScannedFile.consumed_by.cvar_bindings holds indices
// into the flattened cvar-bindings array, and BrowseDetail.tsx looks them up
// here. Hydrating in a different order would silently misalign the indices.
import ezquakeRaw from "../config/data/ezquake-asset-bundle.json";
import fteRaw from "../config/data/fte-asset-bundle.json";

export type AssetCategory = {
  id: string;
  canonical_id: string;
  display_name: string;
  description: string;
  notes: string | null;
};

export type AssetExtension = {
  extension: string;
  path_hint: string | null;
  category_id: string;
  notes: string | null;
};

export type AssetPathRule = {
  canonical_id: string;
  rule_kind: "search_path" | "archive_precedence" | "cmdline_override" | "gamedir_behavior";
  ordinal: number;
  description: string;
  source_ref: string;
  source_verified: boolean;
  notes: string | null;
};

export type AssetCvarBinding = {
  cvar_canonical_id: string;
  category_id: string;
  path_pattern: string | null;
  load_trigger: "startup" | "on_demand" | "on_connect" | "on_map_load" | string;
  confidence: "seed" | "auto" | string;
  source_ref: string;
  notes: string | null;
};

export type AssetLoaderSite = {
  canonical_id: string;
  function_name: string;
  source_file: string;
  source_line: number;
  enclosing_function: string;
  reads_category_id: string | null;
  load_trigger: string;
  path_source: "literal" | "cvar" | "computed" | string;
  path_literal: string | null;
  path_cvar_id: string | null;
  confidence: "certain" | "heuristic" | "unclassified" | string;
  dev_only: boolean;
};

export type AssetBundle = {
  projects: string[];
  versions: Record<string, string>;
  categories: Map<string, AssetCategory>;
  extensions: AssetExtension[];
  path_rules: AssetPathRule[];
  cvar_bindings: AssetCvarBinding[];
  loader_sites: AssetLoaderSite[];
};

function hydrateCategories(project: string, obj: Record<string, any>): Array<[string, AssetCategory]> {
  const out: Array<[string, AssetCategory]> = [];
  for (const [shortId, payload] of Object.entries(obj ?? {})) {
    const ast = (payload as any)?.ast ?? {};
    const canonical = `${project}:asset_category:${shortId}`;
    out.push([
      canonical,
      {
        id: shortId,
        canonical_id: canonical,
        display_name: String(ast.display_name ?? shortId),
        description: String(ast.description ?? ""),
        notes: ast.notes ?? null,
      },
    ]);
  }
  return out;
}

function hydrateArray<T>(raw: unknown): T[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "object") return Object.values(raw as Record<string, T>);
  return [];
}

const SOURCES: Array<{ project: string; raw: any }> = [
  { project: (ezquakeRaw as any).project ?? "ezquake", raw: ezquakeRaw },
  { project: (fteRaw as any).project ?? "fte", raw: fteRaw },
];

const mergedCategories = new Map<string, AssetCategory>();
const mergedExtensions: AssetExtension[] = [];
const mergedPathRules: AssetPathRule[] = [];
const mergedCvarBindings: AssetCvarBinding[] = [];
const mergedLoaderSites: AssetLoaderSite[] = [];
const versions: Record<string, string> = {};

for (const { project, raw } of SOURCES) {
  versions[project] = String((raw as any).version ?? "head");
  for (const [canonical, cat] of hydrateCategories(project, (raw as any).asset_categories ?? {})) {
    mergedCategories.set(canonical, cat);
  }
  mergedExtensions.push(...hydrateArray<AssetExtension>((raw as any).asset_extensions));
  mergedPathRules.push(...hydrateArray<AssetPathRule>((raw as any).asset_path_rules));
  mergedCvarBindings.push(...hydrateArray<AssetCvarBinding>((raw as any).asset_cvar_bindings));
  mergedLoaderSites.push(...hydrateArray<AssetLoaderSite>((raw as any).asset_loader_sites));
}

export const assetBundle: AssetBundle = {
  projects: SOURCES.map((s) => s.project),
  versions,
  categories: mergedCategories,
  extensions: mergedExtensions,
  path_rules: mergedPathRules,
  cvar_bindings: mergedCvarBindings,
  loader_sites: mergedLoaderSites,
};

/** Look up a category's display name by canonical_id. Falls back to canonical_id. */
export function categoryDisplayName(canonical: string | null | undefined): string {
  if (!canonical) return "other";
  return assetBundle.categories.get(canonical)?.display_name ?? canonical;
}

/**
 * OKLCH category colors keyed by canonical_id. FTE entries mirror the ezQuake palette
 * for shared semantics so the same kind of asset reads visually consistent regardless
 * of which engine's bundle classified it. FTE-only categories get distinct hues.
 */
export const CATEGORY_COLOR: Record<string, string> = {
  "ezquake:asset_category:skin": "oklch(0.65 0.20 20)",
  "ezquake:asset_category:texture": "oklch(0.65 0.17 230)",
  "ezquake:asset_category:conchar": "oklch(0.65 0.17 230)",
  "ezquake:asset_category:skybox": "oklch(0.65 0.17 290)",
  "ezquake:asset_category:hud_overlay": "oklch(0.70 0.17 65)",
  "ezquake:asset_category:config": "oklch(0.60 0.17 290)",
  "ezquake:asset_category:map": "oklch(0.70 0.17 150)",
  "ezquake:asset_category:sound": "oklch(0.65 0.10 60)",
  "ezquake:asset_category:model": "oklch(0.60 0.17 30)",
  "ezquake:asset_category:demo": "oklch(0.60 0.08 260)",
  "ezquake:asset_category:screenshot": "oklch(0.60 0.05 160)",
  "ezquake:asset_category:pak": "oklch(0.55 0.08 30)",
  "ezquake:asset_category:pk3": "oklch(0.55 0.08 30)",
  "ezquake:asset_category:wad": "oklch(0.55 0.08 60)",
  "ezquake:asset_category:crosshair": "oklch(0.70 0.15 340)",

  "fte:asset_category:skin": "oklch(0.65 0.20 20)",
  "fte:asset_category:texture": "oklch(0.65 0.17 230)",
  "fte:asset_category:charset": "oklch(0.65 0.17 230)",
  "fte:asset_category:skybox": "oklch(0.65 0.17 290)",
  "fte:asset_category:hud_overlay": "oklch(0.70 0.17 65)",
  "fte:asset_category:config": "oklch(0.60 0.17 290)",
  "fte:asset_category:map": "oklch(0.70 0.17 150)",
  "fte:asset_category:sound": "oklch(0.65 0.10 60)",
  "fte:asset_category:model": "oklch(0.60 0.17 30)",
  "fte:asset_category:demo": "oklch(0.60 0.08 260)",
  "fte:asset_category:demo_archive": "oklch(0.55 0.08 260)",
  "fte:asset_category:screenshot": "oklch(0.60 0.05 160)",
  "fte:asset_category:pak": "oklch(0.55 0.08 30)",
  "fte:asset_category:pk3": "oklch(0.55 0.08 30)",
  "fte:asset_category:wad": "oklch(0.55 0.08 60)",
  "fte:asset_category:crosshair": "oklch(0.70 0.15 340)",
  "fte:asset_category:shader": "oklch(0.60 0.20 320)",
  "fte:asset_category:heightmap": "oklch(0.65 0.14 140)",
  "fte:asset_category:sprite": "oklch(0.60 0.17 30)",
  "fte:asset_category:locfile": "oklch(0.55 0.04 0)",
  "fte:asset_category:localization": "oklch(0.55 0.04 0)",
  "fte:asset_category:log": "oklch(0.55 0.04 0)",
  "fte:asset_category:plugin": "oklch(0.65 0.17 80)",
  "fte:asset_category:savegame": "oklch(0.55 0.10 290)",
  "fte:asset_category:quakec_progs": "oklch(0.60 0.14 50)",
  "fte:asset_category:map_data": "oklch(0.65 0.12 150)",
  "fte:asset_category:map_lighting": "oklch(0.65 0.12 110)",
  "fte:asset_category:other": "oklch(0.50 0.02 0)",
};
