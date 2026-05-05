// apps/qw-oracle/scripts/load-community/shared/wiki-types.ts
//
// TypeScript shapes shared across all three per-type parsers (players, clans, tournaments).
// Pure: no IO, no DB.

// The slug field is added by the CLI from the filename (minus .json).
// It is NOT in the raw JSON on disk -- the CLI populates it before passing to parsePlayer.
export interface WikiArticle {
  slug: string;       // added by CLI from filename minus .json
  title: string;
  pageid: number;
  revid: number;
  timestamp: string;  // ISO 8601
  wikitext: string;
  categories: string[];
}

export interface ClanHistoryEntry {
  clan_title: string;
  clan_slug: string | null;      // null at parse time; Phase 5 backfill resolves
  start_year: number | null;     // null for year-absent rows (ParadokS-style flat bullet)
  end_year: number | null;       // null for "Present" or year-absent
  flag_iso: string | null;       // from {{Image:flag_xx.gif}}; null for TH rows
  source: 'wiki_TH' | 'wiki_bullet';
}

export interface Achievement {
  year: number | null;
  place: string | null;          // e.g. "1", "2", "Winner", "Semifinalist"
  event_title: string;
  event_slug: string | null;     // null at parse time; Phase 5 resolves
  mode: string | null;           // e.g. "1on1", "4on4", "TDM"
  team: string | null;
  team_flag: string | null;
  additional: string | null;
  prize: string | null;
  source: 'wiki_achievement' | 'wiki_TH';
}

export interface ParsedTH {
  year_raw: string;              // e.g. "2024 - Present", "2007 - 2010"
  clan_title: string;
  start_year: number | null;
  end_year: number | null;
}
