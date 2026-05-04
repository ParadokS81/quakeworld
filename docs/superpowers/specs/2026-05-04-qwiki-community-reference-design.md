# QWiki Community-Reference Layer (Players + Clans + Tournaments)

**Status:** Design complete, awaiting arc-planner. Snapshot landed; pilot validated; schema sketch ratified by operator.
**Author:** Claude (Opus 4.7) + ParadokS, brainstorm session 2026-05-04.
**Companion plan:** to be written under `docs/superpowers/plans/` by arc-planner.
**Related:** `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md` (postgres trio backbone), `apps/qw-oracle/concept-notes/` (parallel L3 markdown surface).

---

## Summary

Build a **community-reference layer** in qw-oracle covering three entity types — **players** (5,903), **clans** (829), **tournaments** (~700-900 with overlap) — extracted from a one-shot QWiki API snapshot. Two outputs per entity type:

1. **Postgres rows** in a new `community.*` schema (every entity, including stubs — recognition signal for L2 corpus reconstruction)
2. **Curated markdown notes** under a new `apps/qw-oracle/curated/` tree, parallel to existing concept-notes (substantive entries only — ~3,000-4,000 of ~7,500 total)

The arc is triggered by the **Layer 2 corpus reconstruction primer** need (the analyzing LLM needs nick recognition for ~10 years of Discord chat) but the surface it builds is durable: it reframes Layer 3 from "concept-notes only" to a **curated knowledge layer with multiple typed note-folders**, retrofitting the architecture for future surfaces (clan pages, player pages, tournament pages on the planned quake.world community pillars).

The snapshot is captured once; processing is per-entity-type and incremental. Future-arc work (maps, match reports, eventual xantom tournament-archive merge) builds on the same raw artifact without re-scraping.

---

## Why now

1. **The L2 primer needs it.** The Layer 2 corpus reconstruction arc (see `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md`) requires a primer document so the analyzing LLM can recognize player nicks, clan affiliations, and tournament references in chat. The wiki has all of this in semi-structured form. Without the primer, the reconstruction LLM falls back on training-data confabulation for community-specific names.

2. **The wiki is harvestable cheaply.** QWiki runs MediaWiki 1.35 with a public API. A full snapshot (9,178 articles + 767 templates + 324 categories) takes ~3.5 minutes wall-clock and produces 51 MB. There is no engineering reason to scrape iteratively.

3. **Layer 3 reframe pays off across future arcs.** Once `apps/qw-oracle/curated/` exists with `concept-notes/` + `player-notes/` + `clan-notes/` + `tournament-notes/` as parallel typed folders, the future quake.world community pillars (player pages, clan pages, tournament pages) have a markdown source-of-truth to render. The same data feeds MCP retrieval and human-readable surfaces — bi-directional.

---

## Non-goals

- **Maps.** Wiki has 205 map pages with rich data, but maps are gameplay reference (sibling to L1 map facts), not community reference. Separate future arc; the snapshot is reusable.
- **Match reports.** 369 match-report pages exist (`V1 Final E-ZR`-style). Different shape from tournament pages (scoreboards, demo links, map vetoes). Deferred. Achievement strings in player notes reference match reports as wiki links but won't resolve to FK rows in this arc.
- **Engine / mod / community-meta pages.** ~1,700 articles outside the trio. Not in scope.
- **Tournament-results FK backfill from xantom's archive.** xantom holds a goldmine of old tournament-site databases. Designing the merge with that source is its own future arc; the schema in this arc includes a `source` column on `tournament_results` so xantom data lands additively without rewriting wiki rows.
- **Live re-scraping.** v1 takes one snapshot and processes it. Quarterly re-scrape is a future ops concern.
- **MCP search over the full curated layer (cross-type).** v1 ships per-type tools (`search_players`, `search_clans`, `search_tournaments`); a unified `search_curated` is a follow-up.
- **Round-trip editing from a future quake.world surface back to markdown.** Designed-for but not built; current arc is one-way (wiki → DB + markdown).

---

## Snapshot state (raw artifact)

**Location:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`
**Size:** 51 MB
**Contents:**
- `articles/` — 9,174 article wikitext as `{slug}.json` (raw wikitext + categories + revid + timestamp)
- `templates/` — 767 template wikitext (Infobox player, Player-info, Clan-info, etc.)
- `article-list.json` — full article enumeration (9,178 entries; 4 lost to slugify collisions)
- `categories.json` — 324 categories with member counts
- `template-list.json` — 768 templates enumerated
- `redirects.json` — currently empty (pagination quirk; see Phase 0)
- `manifest.json` — snapshot metadata (date, source, MediaWiki version, counts)

**Snapshot gaps to address in Phase 0:**
1. **Slug collisions on `/`-titles.** 4 article pairs lost (e.g. `Quakeworld Eternal/Dm3` clobbered by `Quakeworld Eternal Dm3`). Fix slugify to escape `/`; re-fetch the 8 affected titles. ~5 min.
2. **Redirects empty despite API working.** Direct API call returns redirects fine but the paginated wrapper got 0. Re-run redirect step alone. ~30 sec. Redirects are alias gold for nick-recognition.
3. **Storage-policy decision.** 51 MB raw + future re-scrapes; decide gitignore vs commit. Suggested: commit (compresses to ~10 MB; rarely changes; provides historical record).

---

## Pilot findings

Pilot (310 stratified players + 50 clans, 2026-05-04) surfaced three template variants in players, two in clans:

### Player templates

| Variant | % of pilot | Fields |
|---|---|---|
| `{{Infobox player}}` (modern) | 10.6% | `id`, `ids`, `name`, `country`, `birth_date`, `clan`, `status`, `spawned`, `role`, `twitch`, `image`, `history` (`{{TH}}` rows) |
| `{{Player-info}}` (older) | 47.7% | `realname`, `birthyear/month/day`, `aka`, `nationality`, `shortnationality`, `currentclan`, `clannationality`, `adminof`, `foundquake`, `retired`, `color1/2`, `favmap` |
| **NO_INFOBOX bullet-prose** (oldest) | 41.6% | `* '''Real name:''' X`, `* '''Date of birth:''' X`, `* '''Nationality:'''`, `* '''Current clan:'''`, `* '''Also known as:'''` — informal but consistent pattern |

The 41.6% NO_INFOBOX share is the load-bearing parser surprise. **Three template branches needed**, plus a pure-prose fallback for outliers (e.g. Vo0 — Wikipedia-copied page).

### Clan templates

| Variant | % of pilot | Fields |
|---|---|---|
| `{{Clan-info}}` (older) | 50% | `nationality`, `shortnationality`, `foundedyear/month/day`, `foundedby`, `prefix`, `ircchannel`, `ircnetwork`, `website`, `disbanded`, `color1/2`, `status` |
| NO_INFOBOX | 48% | Bullet-prose pattern, similar to player NO_INFOBOX |
| `{{Infobox clan}}` (modern) | 2% | Newer template, barely used |

### High-signal fields

- **`adminof`** (Player-info) — community-role gold. Comma-separated list of tournaments / sites / projects the player administered. Example (Purity): `[[QwDrama wiki]], [[NQR North America]], [[Trickery]], [[QWWC]], [[Teamup]], [[DuelMania.nl]], [[Salvation]]`. Lands as `community_roles[]` in DB.
- **`aka` / `alias` / `ids` / `otheraliases`** — multi-nick lists, comma-separated. Example (Ocoini): `eXceSs-The-Feared, Maddy, MadMordigaN, Mentos, oceani, Sige, ini`. Critical for nick-recognition.
- **`prefix`** (Clan-info) — clan tag like `[SR]`. Lets chat parser match clan-tagged nicks.
- **Categories** (every page) — `Category:Players` + `Category:<Nationality> Players` + sometimes era tags (`Category:Players starting in 1996`). Reliable nationality signal even when infobox is sparse.

### Stub heuristic

`{{Player-stub}}` template marks 57% of players as editorial-stub but **141 of 190 stub-tagged pages still have an infobox with real data**. The template is editorial intent ("could use more"), not "page is empty."

**Multi-signal substantive heuristic** (≥2 of 5):
- `real_name` non-empty and not `???`
- `aka` non-empty
- ≥1 entry in clan history
- ≥1 achievement
- ≥500 B narrative prose

By this standard, ~30-35% of players are substantive → ~1,800-2,100 player-notes. Threshold tunable; recommended `≥2 of 5` as the default.

### Disambiguation

Two title formats observed:
- Modern: `Acid (Finnish Player)`, `Bass (Dutch Player)`
- Older: `Apollo (swe)`, `Cosmos (American Player)`, mixed 3-letter codes

~9% of pilot had disambiguators → ~530 players across full corpus. The parenthetical is itself useful alias signal.

---

## Schema

All tables live in a new `community` schema, separate from L1 entity tables (different lifecycle: L1 regenerates from source code; community is durable curated reference, refreshed on wiki re-scrape or human edit).

```sql
-- Every player gets a row (recognition signal). Notes are emitted only for substantive entries.
CREATE TABLE community.players (
  slug              text PRIMARY KEY,
  title             text NOT NULL,            -- canonical wiki title incl. disambiguator
  display_name      text,                     -- title minus parenthetical
  aliases           text[],                   -- aka/alias/ids/otheraliases + parenthetical discriminator
  real_name         text,
  nationality       text,                     -- normalized country name
  nationality_iso   text,                     -- shortnationality / iso code (2-letter)
  current_clan      text,                     -- denormalized for fast lookup
  active_year_start int,                      -- min(spawned, foundquake, earliest TH year, "starting in YYYY")
  active_year_end   int,                      -- null if status=Active or unknown
  status            text,                     -- Active | Retired | Inactive | Quit | unknown
  community_roles   text[],                   -- adminof + prose-mentioned admin/caster/organizer
  has_note          boolean NOT NULL DEFAULT false,
  is_stub           boolean NOT NULL,         -- multi-signal heuristic, not just {{Player-stub}}
  source_template   text,                     -- 'infobox_player' | 'player_info' | 'bullet_prose' | 'none'
  source_categories text[],
  wiki_revision_id  bigint,
  wiki_fetched_at   timestamptz
);

CREATE TABLE community.clans (
  slug              text PRIMARY KEY,
  title             text NOT NULL,
  prefix            text,                     -- e.g. "[SR]"
  nationality       text,
  nationality_iso   text,
  founded_year      int,
  founded_month     int,
  founded_day       int,
  founded_by        text,
  disbanded         text,                     -- year or freeform note
  status            text,
  irc_channel       text,
  irc_network       text,
  website           text,
  has_note          boolean NOT NULL DEFAULT false,
  is_stub           boolean NOT NULL,
  source_template   text,
  source_categories text[],
  wiki_revision_id  bigint,
  wiki_fetched_at   timestamptz
);

CREATE TABLE community.tournaments (
  slug              text PRIMARY KEY,
  title             text NOT NULL,
  -- shape TBD pending tournament pilot in Phase 4
  -- expected fields: parent_series, season_number, year, mode (1on1/2on2/4on4/CTF/FFA),
  --                  format (league/cup/LAN), prize_pool, organizer, dates, status
  has_note          boolean NOT NULL DEFAULT false,
  is_stub           boolean NOT NULL,
  source_template   text,
  source_categories text[],
  wiki_revision_id  bigint,
  wiki_fetched_at   timestamptz
);

-- Relational glue: who was on which clan, when. Drives clan-roster queries, era queries.
CREATE TABLE community.player_clan_eras (
  player_slug   text NOT NULL REFERENCES community.players(slug),
  clan_slug     text,                          -- references community.clans(slug) where matchable; nullable for unrecognized
  clan_title    text NOT NULL,                 -- raw wiki link target, kept for unmatchable cases
  start_year    int,
  end_year      int,                           -- null = present
  source        text NOT NULL,                 -- 'wiki_TH' | 'wiki_bullet' | 'tournament-archive' | 'manual'
  PRIMARY KEY (player_slug, clan_title, start_year)
);

-- Relational glue: tournament results. Backfilled from achievements lists.
-- 'source' column lets future xantom-archive merges land additively.
CREATE TABLE community.tournament_results (
  player_slug      text NOT NULL REFERENCES community.players(slug),
  tournament_slug  text,                       -- references community.tournaments(slug) where matchable
  tournament_title text NOT NULL,              -- raw, kept for unmatchable cases
  year             int,
  place            text,                       -- '1', '2', '3-4', '5th place (tie)', etc. — preserved as wiki encoded it
  mode             text,                       -- 1on1 | 2on2 | 4on4 | DMM4 | FFA | CTF
  team             text,
  team_flag        text,                       -- 'eu', 'fi', 'se', etc.
  source           text NOT NULL               -- 'wiki_achievement' | 'wiki_TH' | 'tournament-archive' | 'manual'
);
```

### Storage / curated layer reframe

Rename and reorganize:

```
apps/qw-oracle/curated/
├── concept-notes/      -- moved from apps/qw-oracle/concept-notes/ (existing content)
├── player-notes/       -- new, populated this arc (~2,000 markdown files)
├── clan-notes/         -- new, populated this arc (~400 markdown files)
└── tournament-notes/   -- new, populated this arc (count TBD post-pilot)
-- future: map-notes/, era-notes/, match-report-notes/
```

- Existing `apps/qw-oracle/concept-notes/` content moves into `apps/qw-oracle/curated/concept-notes/` (single rename + path-update across loader scripts and MCP tool definitions).
- Each note-type has its own template (player-note template differs from concept-note template — different required fields), but all share the same MCP retrieval contract: frontmatter (slug, title, summary, tags, source) + body markdown.
- Note files are the **prose layer**; postgres rows are the **structured truth**. A note's frontmatter mirrors the row; its body adds prose unique to the note (narrative, quotes, notable_wins prose form).

---

## Phase decomposition (proposed)

The arc is naturally 8 phases. Some are mechanical (load + emit); some need their own pilot (tournaments). Phase numbers are guidance for arc-planner; arc-planner may merge or split.

| Phase | Scope | Verification regime | Estimated effort |
|---|---|---|---|
| **0** | Snapshot finalize: fix slugify (`/` escape), refetch redirects, decide gitignore policy, lock manifest | Re-run + diff; smoke check article count | 30-45 min |
| **1** | Curated/ rename: move existing concept-notes, update load-knowledge paths, update MCP tool refs. Migrations: `community.players`, `community.clans`, `community.tournaments`, `community.player_clan_eras`, `community.tournament_results`. No data loaded yet | `bunx tsc --noEmit`; existing concept-note retrieval still works post-rename | 1-2 hr |
| **2** | Players: parser (3 template branches + prose fallback), load all 5,903 rows, emit `player-notes/` markdown for substantive entries (~2,000) | Spot-check 10 sampled players (mix of variants) against raw wikitext; row count = 5,903; note count within ±5% of substantive heuristic estimate | 3-4 hr |
| **3** | Clans: parser (2 template branches + fallback), load all 829 rows, emit `clan-notes/` markdown for substantive entries (~400) | Spot-check 10 clans; row count = 829 | 1-2 hr |
| **4** | Tournaments: pilot (~50 from Categories Leagues + Online Tournaments + Team Tournaments) → schema confirmation → parser → load + notes | Pilot must surface template variants before parser commit; row count matches union of trio categories minus overlap | 3-4 hr |
| **5** | Cross-link backfill: parse achievements lists into `tournament_results`; parse clan history into `player_clan_eras`. Match against `community.tournaments` / `community.clans` where titles resolve; preserve raw `_title` for unmatched | Sample query: "who was on TVS 2008-2013" returns expected names; "EQL Season 12 1st place" returns expected team | 1-2 hr |
| **6** | MCP tools: `search_players`, `search_clans`, `search_tournaments`, `lookup_by_nick`, `get_player_note`, `get_clan_note`, `get_tournament_note`. Mirror existing L1 entity-tool shape | MCP smoke tests via existing eval harness | 1-2 hr |
| **7** | L2 primer build: script that reads `community.*` + notes → emits primer artifact for the L2 reconstruction LLM. Format: structured JSON or markdown — TBD per L2 spec | Primer recognizes the 5 reference players (Milton, ParadokS, Bomkia, Acid Finnish, Acid Polish) with correct nationality + clan affiliation | 1 hr |

**Total estimate: 11-17 hr if no surprises.** Operator's "finished tonight" is plausible if Phases 2 and 4 don't surface schema gaps requiring redesign.

### Alternative phasing (defensive split)

If arc-planner judges the trio too large for one arc:

- **Arc 1** = Phases 0-3 + 5 (partial — clan_eras only) + 6 (player + clan tools only) + 7 (primer with tournament-as-string only). Tournaments deferred.
- **Arc 2** = Phases 4 + 5-completion (tournament_results) + 6-extension (tournament tools). Backfills tournament FKs into existing player notes.

Operator's stated preference is single-arc trio. Arc-planner is empowered to recommend the split if Phase 4 risk seems high.

---

## Decisions ratified during brainstorm

| Decision | Resolution |
|---|---|
| Single output type vs split | **Two outputs per type:** postgres row (everyone) + curated markdown (substantive only). Notes ride on rows via `has_note` flag. |
| Layer 3 = concept-notes only? | **No — Layer 3 is `curated/` with multiple typed note-folders.** This arc creates the reframe; concept-notes becomes one type among several. |
| Maps in scope? | **No — separate future arc.** Snapshot is reusable; map-notes folder reserved in `curated/`. |
| Tournament FK backfill source | **Column `source` on `tournament_results` lets wiki + future xantom-archive coexist.** No silent overwrites; conflicts surface for human review. |
| Schema location | **New `community` schema in qw-oracle postgres.** Separate from L1 to reflect different lifecycles. |
| Snapshot storage | **`apps/qw-oracle/data/wiki-snapshots/<date>/` permanent;** gitignore policy decided in Phase 0. |
| Substantive threshold | **≥2 of 5 signals** (real_name, aka, clan_history≥1, achievements≥1, prose≥500B). Tunable in Phase 2. |
| Active-year priority | `min(spawned, foundquake, earliest_TH_or_achievement_year)` — ignore `birth_date`. |

## Decisions deferred to arc-planner / executor

- **Tournament schema details.** Pending Phase 4 pilot.
- **Clan-history ordering normalization.** Default oldest-first; arc-planner confirms.
- **Note template per type.** Schema sketch above lists frontmatter fields; arc-planner / Phase 2 finalize.
- **MCP tool naming convention.** `search_players` per-type vs unified `search_curated(type=)` — recommended per-type for v1.
- **Single-arc vs split.** Operator preference is single; arc-planner judges feasibility post-Phase-4-pilot risk assessment.
- **Snapshot commit policy.** ~51 MB / ~10 MB compressed. Recommended: commit to enable historical wiki tracking.

---

## Out of scope (explicit)

- Maps (205 wiki pages). Future arc.
- Match reports (369 wiki pages). Future arc.
- Engine / mod / community-meta articles (~1,700 pages). Not part of community-history triangle.
- xantom's tournament-archive merge. Schema accommodates it via `source` column; merge is its own arc.
- Quarterly re-scrape automation. Manual today; ops concern later.
- Round-trip editing from quake.world surface. Designed-for, not built.
- Public quake.world community pillar pages (player profiles, clan pages, tournament pages). They will *consume* this arc's markdown; building them is platform work, not oracle work.

---

## Pressure / triggers

- **L2 corpus reconstruction** is in active brainstorming (Pass 2 pending in fresh terminal). The primer is a Stage 0 prerequisite for that arc's analyzer runs. Without this arc, L2 reconstruction has to either confabulate or pause.
- **Slipgate work** is the main current development arc; this arc is a side-quest that unblocks L2 work without competing for slipgate's primary attention. Operator estimates "tonight" turnaround.
- **No deadline external to operator's pace.** Wiki isn't going anywhere; xantom's archive isn't time-sensitive.
