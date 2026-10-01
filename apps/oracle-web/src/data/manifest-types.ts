// MIRROR of the brain-manifest-v1 contract. Source of truth:
// apps/qw-oracle/scripts/build-brain-manifest.ts (Phase 1, decisions P2).
// Never edit shapes here first: a contract change lands there as a dated
// amendment, then re-mirrors here. schema_version pins compatibility.

export type Door =
  | { kind: 'site'; label: string; code: string; href: string }
  | { kind: 'agent'; call: string };

export interface LitDatacenter {
  id: string;
  name: string;
  lit: true;
  num: number;                     // headline count, RAW -- the site formats it
  sub: string;                     // drill-card sub-line, emitter-composed
  stationSubs: string[];           // station reveal lines (long subs pre-split)
  share: number;                   // scaffold density, 3 decimals
  threads?: number;                // raw topic-thread count (cm at launch)
  solved?: number;                 // raw solved-thread count (cm at launch)
  bars?: Array<[string, number]>;  // region breakdown rows (label, raw count), count-desc
  stats?: Array<[number, string]>; // stat tiles (raw value, label); gc's three
                                   // labels are BYTE-PINNED contract literals
  notes?: string[];                // curated highlight lines, no counts (cs at launch)
  door: Door;                      // level-4 exit descriptor
}

export interface DormantDatacenter {
  id: string;
  name: string;
  lit: false;
  teaser: string;                  // honest inspiration, never a promise
}

export type Datacenter = LitDatacenter | DormantDatacenter;

export interface HistoryEntry {
  generated_at: string;            // the prior emit's timestamp
  nums: Record<string, number>;    // headline num per LIT datacenter id, that emit
}

export interface BrainManifest {
  schema_version: 'brain-manifest-v1';
  generated_at: string;
  oracle_commit: string;
  source: 'twin' | 'prod';
  datacenters: Datacenter[];       // OPEN REGISTRY: consumers key by id
  history: HistoryEntry[];         // growth trail, newest first, capped at 12
}
