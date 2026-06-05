// Layer 2 calibration probe -- shared constants.
//
// THROWAWAY DECISION PROBE (see README.md). Window + channels are LOCKED by
// the density drill (densest contiguous 2021 span); do not re-derive.

import { join } from 'node:path';

export const CHANNELS = ['#helpdesk', '#quakeworld'] as const;

// Densest contiguous 2021 span (density drill). Verified live counts:
// #helpdesk 6131 / #quakeworld 10115 chat+link msgs. End is EXCLUSIVE.
export const WINDOW_START = '2021-02-01T00:00:00Z';
export const WINDOW_END = '2021-04-01T00:00:00Z';

// LOCKED Voyage v4 split (shared/embedding.ts). .env already pins these; the
// defaults below match so the probe behaves identically if the vars are unset.
export const BUILD_MODEL = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
export const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';

export const CHUNK_CAP = 750; // max messages per fence chunk (below the attention cliff)
export const LULL_GAP_HOURS = 3; // chunk boundary at quiet gaps
export const TOPK = 3;
export const RG_PER_CHANNEL = 10; // reverse-gen queries per channel

export const SCRATCH = join(import.meta.dir, 'scratch');
export const SLICE_DB = join(SCRATCH, 'slice.sqlite');
export const EMBED_CACHE = join(SCRATCH, 'embed-cache.sqlite');
export const CHUNK_DIR = join(SCRATCH, 'chunks');
export const SESSION_DIR = join(SCRATCH, 'sessions');
export const PAIR_DIR = join(SCRATCH, 'pairs');
export const COH_DIR = join(SCRATCH, 'coh');
