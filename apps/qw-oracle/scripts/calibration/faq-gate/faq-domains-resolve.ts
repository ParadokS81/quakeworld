// faq-domains-resolve.ts
//
// Maps a taxonomy domain key -> numeric threadIds by sorting faq-clusters.json
// clusters by size descending (rank = sorted index + 1, 1-based), then looking
// up each rank in R (the same rank->domain map used in faq-domains.ts).
//
// Rank derivation: R[12] === 'weapon-scripts' (sanity anchor). The cluster's own
// `id` field is the original k-means cluster id -- NOT the rank; do not use it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Resolve clusters JSON relative to this script's location so the runner works
// from any cwd (bun scripts/calibration/faq-gate/faq-gate-retrieve.ts from
// apps/qw-oracle/).
const __dir = dirname(fileURLToPath(import.meta.url));
const CLUSTERS_PATH = join(__dir, 'faq-clusters.json');

// rank (1-based) -> domain key -- lifted verbatim from faq-domains.ts
const R: Record<number, string> = {
  1: 'visual-projectile', 2: 'textures', 3: 'onboard-install', 4: 'server-admin', 5: 'hud',
  6: 'hud', 7: 'NOISE', 8: 'performance', 9: 'demos', 10: 'crash',
  11: 'visual-world', 12: 'weapon-scripts', 13: 'server-admin', 14: 'onboard-install', 15: 'server-admin',
  16: 'audio', 17: 'hud', 18: 'NOISE', 19: 'network', 20: 'hud',
  21: 'skins', 22: 'display', 23: 'ruleset-legality', 24: 'maps-locs', 25: 'config-files',
  26: 'NOISE', 27: 'onboard-install', 28: 'network', 29: 'performance', 30: 'visual-world',
  31: 'NOISE', 32: 'linux', 33: 'server-browser', 34: 'linux', 35: 'display',
  36: 'visual-world', 37: 'input-mouse', 38: 'binds-scripting', 39: 'linux', 40: 'teamplay-comms',
  41: 'fonts', 42: 'input-mouse', 43: 'spectating', 44: 'textures', 45: 'performance',
  46: 'NOISE', 47: 'NOISE', 48: 'NOISE',
};

// Human labels + tier metadata -- lifted verbatim from faq-domains.ts
export const META: Record<string, { label: string; tier: string; note?: string }> = {
  'hud': { label: 'HUD configuration', tier: '1' },
  'onboard-install': { label: 'Onboarding & install', tier: '1' },
  'visual-projectile': { label: 'Projectile/powerup cosmetics (rocket/LG colors)', tier: '1' },
  'visual-world': { label: 'World rendering & brightness (drawflat/outlines/gamma)', tier: '1' },
  'textures': { label: 'Textures & models (HD packs, simpleitems)', tier: '1' },
  'weapon-scripts': { label: 'Weapon scripts', tier: '1', note: 'HAS NOTE' },
  'network': { label: 'Network & connection (packet loss, antilag, proxies)', tier: '1' },
  'demos': { label: 'Demo recording & playback', tier: '1' },
  'skins': { label: 'Player skins & colors', tier: '1', note: 'HAS NOTE' },
  'server-browser': { label: 'Finding & joining games (server browser)', tier: '2' },
  'display': { label: 'Display config (resolution, conscale, fov, refresh)', tier: '2' },
  'input-mouse': { label: 'Mouse & input (sensitivity, m_pitch, in_raw)', tier: '2' },
  'teamplay-comms': { label: 'Teamplay comms (tp_msg, teamsay, colored text)', tier: '2' },
  'binds-scripting': { label: 'Binds & aliases (general scripting)', tier: '2' },
  'config-files': { label: 'Config files & management (cfg_save, exec)', tier: '2' },
  'audio': { label: 'Audio config', tier: '2' },
  'ruleset-legality': { label: 'Ruleset & legality (f_modified, what is allowed)', tier: '2' },
  'maps-locs': { label: 'Maps & loc files', tier: '2' },
  'spectating': { label: 'Spectating & QTV (autotrack)', tier: '2' },
  'fonts': { label: 'Fonts & charset', tier: '3-foldable' },
  'server-admin': { label: 'Server admin / hosting (KTX/mvdsv, ports, bots)', tier: 'server-side' },
  'performance': { label: 'Performance troubleshooting (fps/stutter)', tier: 'caveated-hard' },
  'crash': { label: 'Crash troubleshooting', tier: 'caveated-hard' },
  'linux': { label: 'Linux platform (build, WM, wayland)', tier: 'caveated-niche' },
  'NOISE': { label: '-- NOT note-able (noise/hardware-rec/OOD) --', tier: 'x' },
};

interface ClusterEntry {
  id: number;
  size: number;
  unresolved: number;
  rate: number;
  terms: string[];
  medoid: string;
  samples: string[];
  threadIds: string[];
}

interface ClustersFile {
  K: number;
  N: number;
  clusters: ClusterEntry[];
}

interface ResolveOptions {
  /** Max threadIds to return from domain clusters. Default: 3 */
  limit?: number;
}

interface ResolveResult {
  domainKey: string;
  threadIds: number[];
  clusterCount: number;
  totalThreads: number;
  clusters: Array<{ rank: number; id: number; size: number; terms: string[] }>;
}

/** Load and sort clusters once. Exported for tests/diagnostics. */
export function loadSortedClusters(): ClusterEntry[] {
  const raw = readFileSync(CLUSTERS_PATH, 'utf8');
  const data = JSON.parse(raw) as ClustersFile;
  // Sort by size DESC to derive rank; rank = sortedIndex + 1 (1-based).
  return data.clusters.slice().sort((a, b) => b.size - a.size);
}

/**
 * Resolve a domain key to a sample of numeric threadIds from its clusters.
 *
 * @param domainKey  A key from R, e.g. 'weapon-scripts'
 * @param opts.limit Max threadIds to return (default 3, a small representative sample).
 *                   Pass Infinity to get all threads in the domain.
 */
export function resolveDomainThreads(domainKey: string, opts: ResolveOptions = {}): ResolveResult {
  const limit = opts.limit ?? 3;
  const sorted = loadSortedClusters();

  const matchingClusters: Array<{ rank: number; cluster: ClusterEntry }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const rank = i + 1;
    if (R[rank] === domainKey) {
      matchingClusters.push({ rank, cluster: sorted[i]! });
    }
  }

  if (matchingClusters.length === 0) {
    const known = [...new Set(Object.values(R))].sort().join(', ');
    throw new Error(
      `Unknown domain key "${domainKey}". Known domains: ${known}`,
    );
  }

  // Union all threadIds from matching clusters; coerce to number for SQL.
  const allIds: number[] = [];
  for (const { cluster } of matchingClusters) {
    for (const tid of cluster.threadIds) {
      allIds.push(Number(tid));
    }
  }

  // Deduplicate (threadIds should be unique per cluster, but be safe).
  const unique = [...new Set(allIds)];

  // Apply limit: take the first `limit` threads (cluster-order preserves
  // medoid proximity — the most representative threads per cluster come first).
  const selected = limit === Infinity ? unique : unique.slice(0, limit);

  return {
    domainKey,
    threadIds: selected,
    clusterCount: matchingClusters.length,
    totalThreads: unique.length,
    clusters: matchingClusters.map(({ rank, cluster }) => ({
      rank,
      id: cluster.id,
      size: cluster.size,
      terms: cluster.terms,
    })),
  };
}

// CLI self-test: bun scripts/calibration/faq-gate/faq-domains-resolve.ts
if (import.meta.main) {
  const sorted = loadSortedClusters();
  const r12 = sorted[11];
  console.log('Sanity: R[12] ===', R[12], '(expected: weapon-scripts)');
  console.log('Rank-12 cluster id:', r12?.id, 'size:', r12?.size, 'terms:', r12?.terms.join(','));

  const result = resolveDomainThreads('weapon-scripts');
  console.log('\nresolveDomainThreads("weapon-scripts"):');
  console.log('  clusters matched:', result.clusterCount);
  console.log('  total threadIds in domain:', result.totalThreads);
  console.log('  sample (limit=3):', result.threadIds);
}
