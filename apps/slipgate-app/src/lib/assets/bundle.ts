// apps/slipgate-app/src/lib/assets/bundle.ts
import raw from "../../../../../packages/qw-config/src/data/ezquake-asset-bundle.json";

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
  source_verified: number;
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
  dev_only: number;
};

export type AssetBundle = {
  project: string;
  version: string;
  categories: Map<string, AssetCategory>;
  extensions: AssetExtension[];
  path_rules: AssetPathRule[];
  cvar_bindings: AssetCvarBinding[];
  loader_sites: AssetLoaderSite[];
};

function hydrateCategories(obj: Record<string, any>): Map<string, AssetCategory> {
  const out = new Map<string, AssetCategory>();
  for (const [shortId, payload] of Object.entries(obj ?? {})) {
    const ast = (payload as any)?.ast ?? {};
    const canonical = `ezquake:asset_category:${shortId}`;
    out.set(canonical, {
      id: shortId,
      canonical_id: canonical,
      display_name: String(ast.display_name ?? shortId),
      description: String(ast.description ?? ""),
      notes: ast.notes ?? null,
    });
  }
  return out;
}

function hydrateArray<T>(raw: unknown): T[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "object") return Object.values(raw as Record<string, T>);
  return [];
}

export const assetBundle: AssetBundle = {
  project: (raw as any).project ?? "ezquake",
  version: (raw as any).version ?? "head",
  categories: hydrateCategories((raw as any).asset_categories ?? {}),
  extensions: hydrateArray<AssetExtension>((raw as any).asset_extensions),
  path_rules: hydrateArray<AssetPathRule>((raw as any).asset_path_rules),
  cvar_bindings: hydrateArray<AssetCvarBinding>((raw as any).asset_cvar_bindings),
  loader_sites: hydrateArray<AssetLoaderSite>((raw as any).asset_loader_sites),
};

/** Look up a category's display name by canonical_id. Falls back to canonical_id. */
export function categoryDisplayName(canonical: string | null | undefined): string {
  if (!canonical) return "other";
  return assetBundle.categories.get(canonical)?.display_name ?? canonical;
}

/** A small palette of OKLCH category colors the UI uses for the left-edge color band. */
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
};
