import type { CvarInfo, CvarDatabase, CvarMapping, CategoryGroup, ClientId } from "../types.js";
import { loadEzQuakeCvars, getEzQuakeCategories } from "./ezquake.js";
import { loadFteCvars } from "./fte.js";
import { loadQwclCvars } from "./qwcl.js";
import manualMappingsData from "../data/mappings.json" with { type: "json" };

// ── Module-level cache ─────────────────────────────────────────────────────

let _cache: CvarDatabase | null = null;

// ── Auto-mapping generation ────────────────────────────────────────────────

/**
 * Iterate all cvar names across all clients. If a name exists in 2+ clients,
 * create a CvarMapping with that name as the id.
 */
function generateAutoMappings(
  clients: Record<ClientId, Map<string, CvarInfo>>
): CvarMapping[] {
  // Collect all unique cvar names across all clients
  const nameToClients = new Map<string, ClientId[]>();

  for (const [clientId, cvars] of Object.entries(clients) as [ClientId, Map<string, CvarInfo>][]) {
    for (const name of cvars.keys()) {
      if (!nameToClients.has(name)) {
        nameToClients.set(name, []);
      }
      nameToClients.get(name)!.push(clientId);
    }
  }

  // Build mappings for names shared across 2+ clients
  const mappings: CvarMapping[] = [];

  for (const [name, clientIds] of nameToClients.entries()) {
    if (clientIds.length < 2) continue;

    const mapping: CvarMapping = {
      id: name,
      clients: {},
    };

    for (const clientId of clientIds) {
      mapping.clients[clientId] = name;
    }

    mappings.push(mapping);
  }

  return mappings;
}

// ── Manual mapping merge ───────────────────────────────────────────────────

/**
 * Merge manual mappings from mappings.json into the auto-generated set.
 * Manual mappings are added only if their ID is not already present
 * (auto-mappings cover same-name cvars; manual ones cover different-name equivalents).
 */
function mergeManualMappings(autoMappings: CvarMapping[]): CvarMapping[] {
  const merged = [...autoMappings];
  const existingIds = new Set(autoMappings.map((m) => m.id));

  for (const entry of manualMappingsData.mappings) {
    if (existingIds.has(entry.id)) continue;

    const mapping: CvarMapping = {
      id: entry.id,
      clients: entry.clients as Partial<Record<ClientId, string>>,
      note: entry.note,
    };
    merged.push(mapping);
  }

  return merged;
}

// ── Category aggregation ───────────────────────────────────────────────────

function aggregateCategories(
  ezQuakeCategories: CategoryGroup[],
  fteCategories: string[],
  qwclCategories: string[]
): CategoryGroup[] {
  // Start with ezQuake's rich category hierarchy
  const categoryMap = new Map<string, Set<string>>();

  for (const cat of ezQuakeCategories) {
    if (!categoryMap.has(cat.name)) {
      categoryMap.set(cat.name, new Set());
    }
    for (const g of cat.groups) {
      categoryMap.get(cat.name)!.add(g);
    }
  }

  // Add FTE and QWCL categories as flat entries if not already present
  for (const name of [...fteCategories, ...qwclCategories]) {
    if (!categoryMap.has(name)) {
      categoryMap.set(name, new Set(["General"]));
    }
  }

  return Array.from(categoryMap.entries()).map(([name, groups]) => ({
    name,
    groups: Array.from(groups),
  }));
}

// ── Exported: loadDatabase ─────────────────────────────────────────────────

export function loadDatabase(): CvarDatabase {
  if (_cache) return _cache;

  const ezquake = loadEzQuakeCvars();
  const fte = loadFteCvars();
  const qwcl = loadQwclCvars();

  const clients: Record<ClientId, Map<string, CvarInfo>> = {
    ezquake,
    fte,
    qwcl,
  };

  const autoMappings = generateAutoMappings(clients);
  const mappings = mergeManualMappings(autoMappings);

  const ezCategories = getEzQuakeCategories();
  const fteCategories = Array.from(new Set(Array.from(fte.values()).map((c) => c.category)));
  const qwclCategories = Array.from(new Set(Array.from(qwcl.values()).map((c) => c.category)));
  const categories = aggregateCategories(ezCategories, fteCategories, qwclCategories);

  _cache = { clients, mappings, categories };
  return _cache;
}

// ── Exported: lookupCvar ───────────────────────────────────────────────────

/**
 * Look up a cvar by name. If no client is specified, prefer ezQuake entries
 * since they have the richest descriptions. Falls back to other clients.
 */
export function lookupCvar(name: string, client?: ClientId): CvarInfo | undefined {
  const db = loadDatabase();

  if (client) {
    return db.clients[client].get(name);
  }

  // Preference order: ezquake (richest descriptions), fte, qwcl
  const preferenceOrder: ClientId[] = ["ezquake", "fte", "qwcl"];
  let best: CvarInfo | undefined;
  for (const clientId of preferenceOrder) {
    const info = db.clients[clientId].get(name);
    if (!info) continue;
    if (!best) {
      best = info;
    } else if (best.default === undefined && info.default !== undefined) {
      // Enrich the preferred entry with the default from another client
      // (e.g. ezQuake hud_* cvars lack defaults, but FTE ezhud plugin has them)
      best = { ...best, default: info.default };
    }
  }

  return best;
}

// ── Exported: findEquivalent ───────────────────────────────────────────────

/**
 * Find the equivalent cvar name in another client.
 * For auto-mapped cvars (shared name across clients) this is a direct lookup.
 */
export function findEquivalent(
  cvarName: string,
  sourceClient: ClientId,
  targetClient: ClientId
): string | undefined {
  const db = loadDatabase();

  // Find a mapping that includes this cvar in the source client
  const mapping = db.mappings.find(
    (m) => m.clients[sourceClient] === cvarName && m.clients[targetClient] !== undefined
  );

  return mapping?.clients[targetClient];
}
