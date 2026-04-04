import domainData from "../data/domain-tags.json" with { type: "json" };
import { loadEzQuakeCvars } from "./ezquake.js";

let _cache: Map<string, Set<string>> | null = null;

/**
 * Load domain tags — resolves group-level tags to individual cvars.
 * Returns a Map of domain name → Set of cvar names.
 */
export function loadDomainTags(): Map<string, Set<string>> {
  if (_cache) return _cache;

  const ezCvars = loadEzQuakeCvars();
  _cache = new Map();

  for (const [domain, config] of Object.entries(domainData.domains)) {
    const cvarSet = new Set<string>();

    // Add explicitly listed cvars
    for (const name of config.cvars) {
      cvarSet.add(name);
    }

    // Add all cvars from tagged groups
    for (const groupName of config.groups) {
      for (const [name, info] of ezCvars.entries()) {
        if (info.group === groupName) {
          cvarSet.add(name);
        }
      }
    }

    _cache.set(domain, cvarSet);
  }

  return _cache;
}

/**
 * Get which domains a cvar belongs to.
 */
export function getCvarDomains(cvarName: string): string[] {
  const tags = loadDomainTags();
  const domains: string[] = [];
  for (const [domain, cvars] of tags.entries()) {
    if (cvars.has(cvarName)) domains.push(domain);
  }
  return domains;
}
