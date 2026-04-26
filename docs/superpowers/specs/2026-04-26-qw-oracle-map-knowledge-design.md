# QW Oracle Layer 1 - Map Knowledge

**Date:** 2026-04-26
**Status:** Spec, awaiting approval before implementation plan.
**Scope:** Add map-awareness to qw-oracle's Layer 1 knowledge base. New extractor, new table, new loader, new snapshot file, two new MCP tools.

---

## Why

The qw-oracle today knows everything about engine source (cvars, commands, macros, HUD, rulesets, etc.) across five engines, but knows nothing about maps. A user question in the support channel ("how do I hide cells in my HUD when playing maps without LG?") exposed the gap — the oracle cannot answer because it has no idea which maps lack LG, which are popular in 4on4, what items are on dm3, who made aerowalk, or whether end has lava.

Maps are a static, well-bounded knowledge surface. A typical QW player encounters maybe ~150 distinct maps over their playing career; competitive play orbits ~50. The data is sitting in the BSP files themselves (entity lump + texture lump) and in two community resources (maps.quakeworld.nu for the BSPs, stats.quakeworld.nu for popularity). The tools to parse it are tiny.

This is a sidequest scoped to one good sitting. The output unlocks a class of MCP answers that today fall flat.

## Non-goals

- **Geometry, lighting, visualization.** maps.quake.world (vikpe's site, in active development) is the visualization surface. We provide the same data foundation, but as queryable structured records, not 3D walkthroughs.
- **Loc files.** Slipgate already reads the user's local loc dir for its player-state simulator; oracle doesn't need a loc surface.
- **Per-map versioning.** Maps don't change with engine versions. Map revisions (`bravadob5`, `aerowalk2020`) live as separate sibling rows under their own canonical names, not as "version" of the parent. No `_versions` machinery.
- **Map screenshots.** stats.quakeworld.nu and maps.quake.world both already serve thumbnails; we link rather than mirror.
- **Author research.** When the BSP doesn't say and we don't know, the field is NULL and the MCP returns "unknown". Curating attribution for hundreds of community maps is its own (out-of-scope) project.

## What we extract

### Per-map data (one row in the new `maps` table)

From the BSP **entities lump** (lump 0):
- `worldspawn.message` → `display_name` (e.g., "The Abandoned Base", "Aerowalk", "Bravado - by foogs [remake]")
- `worldspawn.wad` → `wads_referenced_json` (semicolon-split list)
- `worldspawn.worldtype`, `worldspawn.sounds`, `worldspawn.mapversion` → captured into `worldspawn_json`
- Heuristic regex `/by\s+(\S+)/i` against `display_name` → tentative `author` (overridable via seed)
- Counts of every classname → `class_counts_json`
- Normalized item summary → `item_summary_json` with keys:
  - Armors: `ra` (item_armorInv), `ya` (item_armor2), `ga` (item_armor1)
  - Health: `mh` (item_health spawnflag=2 megahealth), `h25` (default), `h15` (item_health spawnflag=1 small) — derived from spawnflags field
  - Powerups: `quad` (item_artifact_super_damage), `pent` (item_artifact_invulnerability), `ring` (item_artifact_invisibility), `bio` (item_artifact_envirosuit)
  - Weapons: `ssg`, `ng`, `sng`, `gl`, `rl`, `lg`
  - Ammo: `cells`, `rockets`, `spikes`, `shells`
- Spawn summary → `spawn_summary_json` with keys: `dm` (info_player_deathmatch), `team1` (info_player_team1), `team2` (info_player_team2), `coop` (info_player_coop), `start` (info_player_start), `intermission` (info_intermission)
- `features_json`:
  - `teleporters` = count of `trigger_teleport`
  - `has_water` / `has_lava` / `has_slime` = derived from texture-lump scan (see below)

From the BSP **textures lump** (lump 2):
- Liquid detection — texture names with `*` prefix carrying substring `water` / `lava` / `slime` (case-insensitive)
- (Texture name list itself is not stored; only the boolean flags above)

From the BSP **header**:
- `bsp_version` ('V29' or 'BSP2')
- `bsp_size_bytes`, `bsp_sha256` (computed during ingest)

From maps.quakeworld.nu:
- `release_date` ← HTTP `Last-Modified` header on the .bsp download (proxy; will be wrong for re-uploads but better than nothing)
- `source_bsp_url` ← URL we fetched from

From stats.quakeworld.nu (one-shot scrape, refresh quarterly):
- `popularity_total` ← matches column
- `popularity_by_mode_json` ← `{1on1, 2on2, 4on4, ffa}` from per-mode columns
- `popularity_rank` ← position in the totalMatches-sorted list
- `inferred_gamemodes_json` ← derived from popularity columns + spawn_summary heuristic:
  - if `popularity_by_mode["1on1"] > 1000` → include `'1on1'`
  - if `popularity_by_mode["2on2"] > 1000` → include `'2on2'`
  - if `popularity_by_mode["4on4"] > 1000` → include `'4on4'`
  - if `popularity_by_mode["ffa"] > 1000` → include `'ffa'`
  - if no popularity row exists, fall back to spawn-count heuristic: `dm <= 4` → `'1on1'`; `dm 5-8` → `'2on2'`; `dm > 8` → `'4on4'/'ffa'`
  - 1000-match threshold is a starting value; tune after seeing the long tail

From the seed YAML (overrides):
- `author` (when heuristic gets nothing or wrong)
- `notes` (free-form, hand-curated trivia worth surfacing)

### Schema (v13)

```sql
CREATE TABLE IF NOT EXISTS maps (
  canonical_name           TEXT PRIMARY KEY,        -- 'dm3' (lowercased basename)
  file_name                TEXT NOT NULL,           -- 'dm3.bsp'
  display_name             TEXT,                    -- worldspawn.message, normalized whitespace
  author                   TEXT,                    -- heuristic + manual override; NULL = unknown
  release_date             TEXT,                    -- ISO date from Last-Modified
  bsp_version              TEXT NOT NULL,           -- 'V29' or 'BSP2'
  bsp_size_bytes           INTEGER NOT NULL,
  bsp_sha256               TEXT NOT NULL,           -- full hex hash
  worldspawn_json          TEXT NOT NULL,           -- {message,wad,worldtype,sounds,mapversion,...}
  entity_count             INTEGER NOT NULL,
  class_counts_json        TEXT NOT NULL,           -- {classname: count}
  item_summary_json        TEXT NOT NULL,           -- normalized 18-key dict
  spawn_summary_json       TEXT NOT NULL,           -- {dm,team1,team2,coop,start,intermission}
  features_json            TEXT NOT NULL,           -- {teleporters,has_water,has_lava,has_slime}
  wads_referenced_json     TEXT NOT NULL,           -- ['preach.wad', 'bravado.wad']
  inferred_gamemodes_json  TEXT NOT NULL,           -- ['1on1','2on2','4on4','ffa']
  popularity_total         INTEGER,                 -- NULL if not in stats.qw.nu top list
  popularity_by_mode_json  TEXT,                    -- NULL if not in stats
  popularity_rank          INTEGER,                 -- NULL if not in stats
  notes                    TEXT,                    -- free-form, seed-curated
  source_bsp_url           TEXT NOT NULL,
  extracted_at             TEXT NOT NULL            -- ISO timestamp
);

CREATE INDEX IF NOT EXISTS idx_maps_popularity_rank ON maps(popularity_rank);
CREATE INDEX IF NOT EXISTS idx_maps_author          ON maps(author);
```

**Schema migration:** `migrateV12ToV13` in `schema.ts` — pure additive `CREATE TABLE`, no rebuild, no CHECK changes. Fresh DBs get the table from `SCHEMA_V13_ADDITIONS_SQL`. Stamps `SCHEMA_VERSION = 13`.

**Natural key:** `canonical_name`. Re-extracting the same map produces an idempotent upsert keyed on `canonical_name`.

**Project namespace:** Maps belong to the game itself, not any specific engine. We do NOT widen the `entities.project` CHECK; the `maps` table stands alone with no `project` column. This is deliberate — fitting maps into the entity/version model would require treating each BSP hash as a "version" of a "map entity", which adds machinery (predecessors, source_state, change_events) without any payoff. A flat table is the honest shape.

## Sourcing

### id1 stock maps (~38 after filtering)

Bootstrap from the user's local Quake install:
- pak0.pak: 8 single-player E1 maps + `start`
- pak1.pak: 22 single-player E2-E4 maps + `end` + dm1-dm6

`pak_extract.py` reads PAK files (`PACK` magic + 12-byte header + 64-byte directory entries) and dumps every `maps/*.bsp` into `data/bsp-cache/`. Filters out `b_*.bsp` (ammo-box models, not playable maps). Default pak path `/mnt/c/Games/QuakeWorld/QuakeWorld/id1/`, override via `--pak <path>` flag (repeatable).

### Community maps (~216 + ~30 supplement)

Pull list:
1. Every .bsp in `https://maps.quakeworld.nu/base/` (216 files; server-admin curated baseline)
2. Top-100 maps from stats.quakeworld.nu that aren't already in /base/ — supplemental pull from `/all/`. Estimated ~30-40 net adds (stats top-100 has many overlaps with /base/).
3. Optional manual extras via seed YAML

`download_maps.py` walks the index pages, computes the union of (1) and (2), downloads each .bsp into `data/bsp-cache/`, captures `Last-Modified` headers for `release_date`. Idempotent — skips files already present with matching size.

### Popularity table

`fetch_stats.py` scrapes `stats.quakeworld.nu/index.php?a=maps&sort=totalMatches` once, parses the HTML table, writes `seeds/qw-stats-cache.json` with `{name: {total, by_mode: {1on1, 2on2, 4on4, ffa}, rank}}`. Manual quarterly refresh (no automation in v1).

## Extraction pipeline

```
apps/qw-oracle/scripts/extractors/qw/
├── extract.py              # main CLI: walk bsp-cache + emit JSON
├── pak_extract.py          # one-shot bootstrap
├── download_maps.py        # one-shot bootstrap
├── fetch_stats.py          # one-shot bootstrap
├── seeds/
│   ├── qw-map-seed.yaml    # author/notes overrides + extra-pulls list
│   └── qw-stats-cache.json # cached popularity table
└── output/
    └── qw-maps-ast.json    # committed; loader's input
```

`extract.py` flow:
1. Walk every `.bsp` in `data/bsp-cache/`
2. Parse entity lump → entity dicts
3. Parse texture lump → liquid/teleport flags
4. Compute file hash + size
5. Join with `seeds/qw-stats-cache.json` for popularity
6. Apply `seeds/qw-map-seed.yaml` overrides (author, notes)
7. Emit `output/qw-maps-ast.json` — array of map records, one per map

Output JSON format: one object per map with the same field names as the SQL columns. Loader does straightforward field-by-field upsert via `INSERT OR REPLACE` keyed on `canonical_name`.

## Loader

`apps/qw-oracle/scripts/load-knowledge/load-maps.ts` — single-pass loader following the same shape as the existing per-type loaders (e.g. `load-cvars.ts`):
1. Open knowledge.db, run `applySchema` (triggers v12→v13 migration if needed)
2. Read `output/qw-maps-ast.json`
3. For each record: validate, then `INSERT OR REPLACE INTO maps (...) VALUES (...)`
4. Emit summary: `Loaded N maps (M new, K updated)`

New CLI subcommand in `index.ts`:
```bash
npm run load-knowledge -- load-maps --json <path>
```

Default `--json` resolves to `apps/qw-oracle/scripts/extractors/qw/output/qw-maps-ast.json`.

No drop-guard for maps in v1 (the existing one is per-entity-type and doesn't apply to a flat table). A future safety check comparing row count against a baseline is sensible but not necessary while the table has only one writer.

## Snapshot distribution to slipgate

`build-snapshot.ts` gains an emitter `emitQwMaps`:
```ts
function emitQwMaps(
  db: Database.Database,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number }
```

Reads every row from `maps` and writes a single JSON file `qw-maps.json` to `apps/slipgate-app/src/lib/config/data/`. Shape: `{...meta, maps: [...row objects]}` — same envelope pattern as the other emitters. Slipgate's loader can ingest later when a map-aware UI is on the table; v1 ships the data.

The `build-snapshot` CLI gains a new project value `qw`:
```bash
npm run load-knowledge -- build-snapshot --project qw
```

`PROJECT_DEFAULT_SNAPSHOT_VERSION.qw = 'static'` (sentinel — maps are version-less; the snapshot's `meta.version` is `'static'` and the `versions` table verification short-circuits for `qw`). Cleaner than special-casing in the dispatch.

## MCP surface (additive, new tools)

Two new tools land in `serve/mcp/src/`:

### `lookup_map(name: string)`

Returns the full row for one map. Case-insensitive name match against `canonical_name`.

Response shape:
```typescript
{
  canonical_name: string;
  display_name: string | null;
  author: string;                    // 'unknown' if NULL in DB
  release_date: string | null;
  bsp_version: 'V29' | 'BSP2';
  bsp_size_bytes: number;
  worldspawn: Record<string, string>;
  item_summary: Record<string, number>;
  spawn_summary: Record<string, number>;
  features: { teleporters: number; has_water: boolean; has_lava: boolean; has_slime: boolean };
  wads_referenced: string[];
  inferred_gamemodes: string[];
  popularity: { total: number; by_mode: { '1on1': number; '2on2': number; '4on4': number; ffa: number }; rank: number } | null;
  notes: string | null;
}
```

If no match: `{ found: false, name: <input>, suggestion: <closest match by Levenshtein, if any> }`.

### `search_maps(...filters)`

Returns compact rows matching all supplied filters (AND semantics across filter keys; OR within array values).

Schema:
```typescript
{
  has_weapon?:    string[];   // any of: ssg, ng, sng, gl, rl, lg — match if ALL listed weapons present
  lacks_weapon?:  string[];   // match if NONE of the listed weapons are present
  has_powerup?:   string[];   // any of: quad, pent, ring, bio — ALL present
  lacks_powerup?: string[];   // NONE present
  has_armor?:     string[];   // any of: ra, ya, ga — ALL present
  has_water?:     boolean;
  has_lava?:      boolean;
  has_slime?:     boolean;
  has_teleporters?: boolean;  // teleporter count > 0
  gamemode?:      '1on1'|'2on2'|'4on4'|'ffa';  // map is popular in this mode (in inferred_gamemodes_json)
  min_popularity_rank?: number;  // 1 = most popular
  max_popularity_rank?: number;
  min_dm_spawns?: number;
  max_dm_spawns?: number;
  limit?:         number;     // default 25, max 100
}
```

Each parameter gets a one-line `description` in the input_schema so the calling LLM picks them on its own without prompting.

Response shape: array of compact rows ordered by `popularity_rank ASC NULLS LAST`:
```typescript
Array<{
  canonical_name: string;
  display_name: string | null;
  popularity_rank: number | null;
  popularity_total: number | null;
  dm_spawns: number;
  inferred_gamemodes: string[];
  items_compact: string;  // e.g. 'RA YA GA mh quad pent | SSG NG SNG GL RL LG | water'
}>
```

The `items_compact` field is a human-readable one-liner — armors / powerups / weapons / liquids — designed for the LLM to render directly in chat answers without unpacking JSON.

## File layout summary

```
apps/qw-oracle/
├── data/
│   ├── knowledge.db                    # gains `maps` table at v13
│   ├── bsp-cache/                      # NEW; gitignored; ~50-150MB
│   └── pak-cache/                      # NEW; gitignored
├── scripts/
│   ├── extractors/qw/                  # NEW project namespace
│   │   ├── extract.py
│   │   ├── pak_extract.py
│   │   ├── download_maps.py
│   │   ├── fetch_stats.py
│   │   ├── seeds/
│   │   │   ├── qw-map-seed.yaml        # scaffolded empty
│   │   │   └── qw-stats-cache.json     # populated by fetch_stats.py
│   │   └── output/
│   │       └── qw-maps-ast.json        # committed
│   └── load-knowledge/
│       ├── load-maps.ts                # NEW
│       ├── build-snapshot.ts           # +emitQwMaps()
│       ├── schema.ts                   # +SCHEMA_V13_ADDITIONS_SQL + migrateV12ToV13
│       ├── types.ts                    # +MapRow interface
│       └── index.ts                    # +load-maps subcommand; build-snapshot --project qw
└── serve/mcp/src/
    ├── tools/lookup-map.ts             # NEW
    ├── tools/search-maps.ts            # NEW
    └── index.ts                        # register both
```

## Quality checks

- **Sample sanity:** spot-check 8 maps after first load — dm3 / dm6 / end / povdmm4 / aerowalk / ztndm3 / schloss / bravado. Manually confirm item counts match in-game knowledge. (Already validated empirically during brainstorm; baseline confirmed.)
- **Idempotency:** re-running `load-maps` against the same JSON produces identical row count, no diffs.
- **MCP smoke test:** add to `scripts/verify-rewrite.ts` (or successor) two new assertions — one `lookup_map('dm3')` returns the expected shape, one `search_maps({lacks_weapon:['lg']})` returns povdmm4 in the result list.
- **Snapshot parity:** `qw-maps.json` reads back into the same row count via slipgate's eventual loader.

## Out of scope, deferred to follow-ups

- **Slipgate map-browser UI.** Once the snapshot ships, slipgate can build a tab. Separate spec when it gets prioritized.
- **`search_maps_by_features` advanced filters.** Once we see what queries land via the basic tool, extend with whatever shapes come up.
- **Map screenshots.** Link to stats.quakeworld.nu thumbnail URLs in `lookup_map` response. Defer until we agree on a stable image source (vikpe's maps.quake.world will eventually be canonical).
- **Author research project.** Curating attribution at scale is its own thing.
- **Layer 3 concept notes about specific maps.** "Mid layout patterns on dm3" etc. — these get authored into `concept-notes/` once the data foundation is in place. Future Layer 3 work, not in this sidequest.
- **Loc consolidation.** Slipgate keeps reading the user's local locs. If we later decide oracle should expose them too (e.g., for voice-analysis position tagging), add `map_locs` table in a follow-up spec.
- **Auto-refresh of popularity table.** Quarterly manual refresh in v1; automate when the cron infra exists.
- **Map revisions as related rows.** A future `maps.related_to` column could link `bravadob5` → `bravado`, but that's curation work, not extraction. Not v1.

---

## Effort estimate

- PAK extractor: ~30 lines Python, 30 min
- Map downloader (walk index + fetch): ~80 lines, 1 hour
- Stats scraper: ~50 lines, 1 hour (HTML is simple)
- BSP entity + texture parser: ~150 lines (the parse_bsp.py prototype already done in brainstorm covers most of this), 1.5 hours
- Schema migration + loader: ~120 lines TS, 1 hour
- build-snapshot emitter: ~50 lines, 30 min
- MCP tools (lookup_map + search_maps): ~200 lines TS, 2 hours
- Quality probes + smoke tests: 1 hour
- Spec/plan/handover bookkeeping: 30 min

**Total: ~8 hours** if everything goes to plan. Realistic with diagnostics and edge cases: 1-2 sessions.
