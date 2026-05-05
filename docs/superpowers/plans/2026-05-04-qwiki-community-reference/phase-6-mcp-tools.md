# Phase 6 -- MCP tools (per-type retrieval over community.* + curated notes)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` -- D1 (two outputs), D2 (community schema), D3 (curated/), D5 (two-threshold), D11 (per-type tools, no unified search), D13 (ASCII), D14 (Bun), D18 (note frontmatter mirrors row).
> 2. Read `review-findings.md` -- F7 (case-variant pairs intentionally distinct -- relevant to lookup_by_nick scoring), F11 (Category:Clans = 822 not 829, used in test seed sanity).
> 3. Read `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md` -- "Phase decomposition Phase 6 row" + "Storage / curated layer reframe" + the schema sketch.
> 4. Read prior-phase MDs to confirm the consumed contract:
>    - `phase-1-curated-rename.md` Task 3 (migration 008 SQL) for `community.players`, `community.clans`, `community.tournaments` (placeholder), `community.player_clan_eras`, `community.tournament_results` column lists.
>    - `phase-2-players.md` Task 7 + Task 8 for the player-note frontmatter shape and the `apps/qw-oracle/curated/player-notes/<slug>.md` filesystem path.
>    - `phase-3-clans.md` analogue for clan-notes.
>    - `phase-4-tournaments.md` Task 3 (migration 009) for the tournament-specific columns added to `community.tournaments` and Task 7 for the tournament-note frontmatter shape.
>    - `phase-5-cross-link-backfill.md` "Outputs to next phase" for what `lookup_player` is expected to render.
> 5. Read the live MCP surface to mirror its shape:
>    - `apps/qw-oracle/serve/mcp/src/index.ts` (registration + TOOL_LIST + dispatch).
>    - `apps/qw-oracle/serve/mcp/src/types.ts` (`ToolResponse<T>` envelope).
>    - `apps/qw-oracle/serve/mcp/src/db.ts` and the shared `apps/qw-oracle/shared/db.ts`.
>    - `apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts` + `search-entities.ts` (lookup vs search shape pair).
>    - `apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts` (note retrieval shape -- but Phase 6 reads from filesystem, not DB; see Open question Q1).
>    - `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts` + `search-concepts.test.ts` (test seed pattern with `qw_oracle_test`).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below).

## Goal

Phase 6 ships ten new MCP tools that surface the community-reference layer (Players + Clans + Tournaments) loaded by Phases 2/3/4/5. Each entity type gets the standard triplet -- `search_<type>` for lookup-by-substring, `lookup_<type>` for canonical-slug lookup with cross-link composition, and `get_<type>_note` for the curated markdown body. A tenth tool, `lookup_by_nick`, performs cross-type alias resolution against players + clans (the L2 corpus reconstruction primer's nick-recognition path). All ten tools mirror the existing L1 entity-tool shape (`ToolResponse<T>` envelope, `match_quality`, `suggested_fallback`, `meta`), register through the existing `dispatchAndLog` query-log wrapper, and read from the Postgres `community.*` schema established in Phase 1 plus the curated note files emitted in Phases 2/3/4. No new database schema; no LLM-shaped work; deterministic SQL + filesystem reads only. At phase boundary: `bunx tsc --noEmit` is clean from `apps/qw-oracle/`; `bun test apps/qw-oracle/serve/mcp/src/tools/community.test.ts` passes; the MCP server (stdio transport) starts without errors and `tools/list` returns 22 tools (12 pre-existing + 10 new); the smoke calls in Verification return rows for Milton + Black Book + at least one tournament. Phase 7 (L2 primer build) can begin and consume `lookup_by_nick` programmatically.

## Inputs from previous phase

- Phase 0 complete: snapshot at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` is finalized and `redirects.json` has been refetched with `arprop=ids|title` (F4).
- Phase 1 complete: migration 008 has been applied; the five `community.*` tables exist; `apps/qw-oracle/curated/` exists with `concept-notes/` + `player-notes/` + `clan-notes/` + `tournament-notes/` siblings.
- Phase 2 complete: `community.players` is populated with 5,903 rows. `apps/qw-oracle/curated/player-notes/` contains the tuned set of has_note=TRUE markdown notes; each note's frontmatter mirrors the row's stable fields per D18.
- Phase 3 complete: `community.clans` is populated with 822 rows (F11). `apps/qw-oracle/curated/clan-notes/` contains the tuned set of has_note=TRUE markdown notes.
- Phase 4 complete: migration 009 has been applied (tournament-specific columns added to `community.tournaments`); the table is populated with the union of seven tournament categories from the snapshot. `apps/qw-oracle/curated/tournament-notes/` contains the tuned set.
- Phase 5 complete: `community.player_clan_eras` is populated (mix of `wiki_TH` and `wiki_bullet` source rows, including year-absent rows per F9). `community.tournament_results` is populated with achievement rows; some rows have `tournament_slug=NULL` for unmatched tournament titles per Phase 5 design.
- The live MCP server contract (12 pre-existing tools enumerated in `apps/qw-oracle/serve/mcp/src/index.ts` `TOOL_LIST`: lookup_entity, search_entities, search_concepts, get_concept_note, search_solved_issues, lookup_map, search_maps, lookup_gameplay_entity, lookup_mechanic, search_gameplay_entities, search_mechanics, redirect_to_human) has not changed since Phase 5; the dispatch wrapper `dispatchAndLog` and the `ToolResponse<T>` envelope are stable.
- `bunx tsc --noEmit` is clean as of Phase 5 sign-off; no pre-existing type errors carry into Phase 6.

## Files touched

### Created

```
apps/qw-oracle/serve/mcp/src/community-note-reader.ts                   # Task 2: filesystem-only helper that reads curated/<type>-notes/<slug>.md via gray-matter; reused by all three get_*_note tools
apps/qw-oracle/serve/mcp/src/tools/search-players.ts                    # Task 3: substring + alias retrieval over community.players
apps/qw-oracle/serve/mcp/src/tools/lookup-player.ts                     # Task 3: slug lookup composing player row + clan_eras + tournament_results
apps/qw-oracle/serve/mcp/src/tools/get-player-note.ts                   # Task 3: filesystem read of curated/player-notes/<slug>.md
apps/qw-oracle/serve/mcp/src/tools/search-clans.ts                      # Task 4: substring retrieval over community.clans (title + prefix + alias-shaped fields)
apps/qw-oracle/serve/mcp/src/tools/lookup-clan.ts                       # Task 4: slug lookup composing clan row + member roster (from player_clan_eras)
apps/qw-oracle/serve/mcp/src/tools/get-clan-note.ts                     # Task 4: filesystem read of curated/clan-notes/<slug>.md
apps/qw-oracle/serve/mcp/src/tools/search-tournaments.ts                # Task 5: substring + filter retrieval over community.tournaments (post-migration-009 columns)
apps/qw-oracle/serve/mcp/src/tools/lookup-tournament.ts                 # Task 5: slug lookup composing tournament row + result roster (from tournament_results)
apps/qw-oracle/serve/mcp/src/tools/get-tournament-note.ts               # Task 5: filesystem read of curated/tournament-notes/<slug>.md
apps/qw-oracle/serve/mcp/src/tools/lookup-by-nick.ts                    # Task 6: cross-type alias resolution; queries community.players + community.clans together, returns discriminated union rows
apps/qw-oracle/serve/mcp/src/tools/community.test.ts                    # Task 9: integration tests for all ten tools, seeds qw_oracle_test, TRUNCATEs in afterAll
```

### Modified

```
apps/qw-oracle/serve/mcp/src/types.ts                                   # Task 1: add PlayerRecord / PlayerClanEra / PlayerTournamentResult / ClanRecord / ClanMember / TournamentRecord / TournamentResult / NickHit / CommunityNoteRecord interfaces
apps/qw-oracle/serve/mcp/src/index.ts                                   # Task 7: 10 new tool imports, 10 new switch cases, 10 new TOOL_LIST entries
apps/qw-oracle/serve/mcp/src/orientation.ts                             # Task 8: add a paragraph in ORIENTATION_INSTRUCTIONS naming the community-reference surface (search_players / lookup_player / search_clans / lookup_clan / search_tournaments / lookup_tournament / get_*_note / lookup_by_nick) and what consumers should reach for them
```

### Deleted

```
n/a
```

## Tasks

### Task 1 -- Add shared response types in types.ts

**Goal:** Extend `apps/qw-oracle/serve/mcp/src/types.ts` with the eight community-shaped TypeScript interfaces the new tools will return inside the existing `ToolResponse<T>` envelope. No runtime logic; pure declarative shapes consumed by Tasks 2-6 and the test file in Task 9.

**Files:**
- `apps/qw-oracle/serve/mcp/src/types.ts` (modified)

**Steps:**
- [ ] Append the following block to the end of `apps/qw-oracle/serve/mcp/src/types.ts` (after the existing `RedirectTarget` interface). Preserve the file's current header comment and existing exports. Full additive content:

```typescript
// -----------------------------------------------------------------------------
// Phase 6 -- community-reference layer types.
// All ten new MCP tools return ToolResponse<T> envelopes with one of these
// payload shapes. The interfaces mirror the community.* table columns produced
// by migrations 008 (Phase 1) and 009 (Phase 4) plus the cross-link rows from
// Phase 5; they do NOT mirror the markdown note frontmatter. Per D18 the note
// frontmatter is a redundant mirror of the row, so MCP tools query the row
// (authoritative) and read the note body separately when has_note=true.
// -----------------------------------------------------------------------------

// Sub-record nested inside lookup_player. One row per (player_slug, clan_title,
// start_year, source) era. Rendered oldest-first; year-absent rows surface
// after year-known rows ordered by era_seq.
export interface PlayerClanEra {
  clan_slug: string | null;          // null when the clan_title did not resolve to community.clans (Phase 5 design)
  clan_title: string;
  start_year: number | null;         // null for bullet-list eras (F9)
  end_year: number | null;
  era_seq: number | null;
  source: 'wiki_TH' | 'wiki_bullet' | 'tournament-archive' | 'manual';
}

// Sub-record nested inside lookup_player. One row per achievement.
// tournament_slug is null when Phase 5's title-matcher did not resolve the
// achievement string to a community.tournaments slug.
export interface PlayerTournamentResult {
  tournament_slug: string | null;
  tournament_title: string;
  year: number | null;
  place: string | null;              // '1', '2', '3-4', '5th place (tie)', etc. -- preserved as wiki encoded
  mode: string | null;
  team: string | null;
  team_flag: string | null;
  source: 'wiki_achievement' | 'wiki_TH' | 'tournament-archive' | 'manual';
}

// What lookup_player and search_players return inside ToolResponse<T>.results.
// search_players returns the same shape but without clan_eras / tournament_results
// populated (search is for discovery, not full composition); lookup_player
// composes the cross-link arrays.
export interface PlayerRecord {
  slug: string;
  title: string;
  display_name: string | null;
  aliases: string[];
  real_name: string | null;
  nationality: string | null;
  nationality_iso: string | null;
  current_clan: string | null;
  active_year_start: number | null;
  active_year_end: number | null;
  status: 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown' | null;
  community_roles: string[];
  has_note: boolean;
  is_substantive: boolean;
  is_stub: boolean;
  source_template: 'infobox_player' | 'player_info' | 'bullet_prose' | 'none' | null;
  // clan_eras / tournament_results are present (possibly empty) on lookup_player;
  // omitted (undefined) on search_players hits. The optionality is documented
  // here rather than via two interfaces to keep ToolResponse<PlayerRecord> a
  // single, stable shape across both tools.
  clan_eras?: PlayerClanEra[];
  tournament_results?: PlayerTournamentResult[];
}

// Sub-record nested inside lookup_clan. One row per current or historical
// clan member, derived from community.player_clan_eras grouped by player_slug.
// active=true when the player has an era row with end_year IS NULL on this clan.
export interface ClanMember {
  player_slug: string;
  player_title: string;
  start_year: number | null;
  end_year: number | null;
  era_seq: number | null;
  active: boolean;
}

// What lookup_clan and search_clans return.
export interface ClanRecord {
  slug: string;
  title: string;
  prefix: string | null;
  nationality: string | null;
  nationality_iso: string | null;
  founded_year: number | null;
  founded_month: number | null;
  founded_day: number | null;
  founded_by: string | null;
  disbanded: string | null;
  status: 'Active' | 'Inactive' | 'Disbanded' | 'unknown' | null;
  irc_channel: string | null;
  irc_network: string | null;
  website: string | null;
  has_note: boolean;
  is_substantive: boolean;
  is_stub: boolean;
  source_template: 'infobox_clan' | 'clan_info' | 'infobox_4on4team' | 'bullet_prose' | 'none' | null;
  // members populated on lookup_clan; omitted on search_clans hits.
  members?: ClanMember[];
}

// Sub-record nested inside lookup_tournament. One row per result entry from
// community.tournament_results joined back to community.players for the player
// title. Ordered by place ASC (numeric where possible) with year as tiebreak.
export interface TournamentResultEntry {
  player_slug: string;
  player_title: string;
  year: number | null;
  place: string | null;
  mode: string | null;
  team: string | null;
  team_flag: string | null;
  source: 'wiki_achievement' | 'wiki_TH' | 'tournament-archive' | 'manual';
}

// What lookup_tournament and search_tournaments return. The tournament-specific
// columns (year, mode, format, prize_pool, etc.) come from migration 009; the
// drafter does NOT pin column names here -- the executor verifies migration 009's
// column list against this interface and adds/renames fields as needed during
// Task 5. Rationale: Phase 4's column list is operator-approved post-pilot;
// pre-locking it in a Phase 6 type would invite drift.
export interface TournamentRecord {
  slug: string;
  title: string;
  has_note: boolean;
  is_substantive: boolean;
  is_stub: boolean;
  source_template: string | null;
  // Tournament-specific columns from migration 009 -- the Task 5 executor
  // confirms the names against the live migration before generating the SELECT.
  // Likely fields per Phase 4 placeholder skeleton: series, season_number, year,
  // tournament_type, format, mode, start_date, end_date, prize_pool,
  // prize_pool_usd, organizers, founder, country, country_iso, city, venue,
  // website, twitch_handle, youtube_handle, discord_url, irc_channel,
  // team_count, winner, winner_flag.
  series: string | null;
  season_number: number | null;
  year: number | null;
  tournament_type: string | null;
  format: string | null;
  mode: string | null;
  start_date: string | null;
  end_date: string | null;
  prize_pool: string | null;
  prize_pool_usd: number | null;
  organizers: string[];
  founder: string | null;
  country: string | null;
  country_iso: string | null;
  city: string | null;
  venue: string | null;
  website: string | null;
  twitch_handle: string | null;
  youtube_handle: string | null;
  discord_url: string | null;
  irc_channel: string | null;
  team_count: number | null;
  winner: string | null;
  winner_flag: string | null;
  // results populated on lookup_tournament; omitted on search_tournaments hits.
  results?: TournamentResultEntry[];
}

// What lookup_by_nick returns. Discriminated union; the consumer LLM picks
// per kind. Matched_via names which field produced the hit so the consumer can
// read the result shape correctly (e.g., a clan match via prefix is a strong
// nick-tag signal; a player match via aliases is a weaker exact-string signal).
export interface NickHit {
  kind: 'player' | 'clan';
  slug: string;
  title: string;
  display_name: string | null;       // null for clans (no display_name column on community.clans)
  matched_via: 'title' | 'display_name' | 'aliases' | 'prefix' | 'real_name';
  is_substantive: boolean;
  nationality_iso: string | null;
  current_clan: string | null;       // null for kind='clan'
}

// What get_player_note / get_clan_note / get_tournament_note return. Frontmatter
// is the YAML-parsed object (gray-matter); body is the markdown after the
// frontmatter delimiter. row_summary is a compact projection of the row pulled
// from community.<table> at retrieval time so the consumer LLM has the
// authoritative structured data alongside the prose body. If has_note=false on
// the row, the note file does not exist and the tool returns match_quality='none'
// with a suggested_fallback pointing at the lookup_<type> tool.
export interface CommunityNoteRecord {
  slug: string;
  type: 'player' | 'clan' | 'tournament';
  title: string;
  body: string;                      // raw markdown body after the frontmatter
  frontmatter: Record<string, unknown>;
  row_summary: Record<string, unknown>;
}
```

**Verification:**
```
bunx tsc --noEmit
# PASS: no type errors introduced; the new types compile cleanly with the existing types.ts.
```

**Execution mode:** inline -- pure additive type declarations, full content shipped in this task. The plan's "no logic, only declarations" shape matches the inline-execution criterion in `phase-template.md` ("purely textual edits with full content shipped inline"). The executor pastes the block at end-of-file, runs `bunx tsc --noEmit`, and moves on.

---

### Task 2 -- Build community-note-reader.ts (filesystem helper) + tests

**Goal:** Land a filesystem-only helper at `apps/qw-oracle/serve/mcp/src/community-note-reader.ts` that the three `get_*_note` tools call. The helper takes a type ('player' | 'clan' | 'tournament') and a slug, resolves the path under `apps/qw-oracle/curated/<type>-notes/<slug>.md`, parses the file via `gray-matter`, and returns `{ frontmatter, body, exists: true }` or `{ exists: false }`. The helper is pure I/O + parse; no DB. Co-located unit tests via `bun:test` use a temporary fixture directory under `/tmp` so the test does not depend on the live curated/ tree.

**Files:**
- `apps/qw-oracle/serve/mcp/src/community-note-reader.ts` (created)
- `apps/qw-oracle/serve/mcp/src/community-note-reader.test.ts` (created -- co-located unit test; the integration test in Task 9 covers the end-to-end MCP path)

**Steps:**
- [ ] Author `community-note-reader.ts` with this content. The CURATED_ROOT path is computed from `__dirname` exactly like `apps/qw-oracle/scripts/load-concepts/index.ts` does -- four `..` segments to escape from `serve/mcp/src/` to the app root, then into `curated/<type>-notes/`. The executor verifies the path resolution by reading the existing `load-concepts/index.ts` for the analogue and adjusting the `..` count if the tree depth differs.

```typescript
// apps/qw-oracle/serve/mcp/src/community-note-reader.ts
//
// Filesystem helper for the three get_*_note MCP tools. Reads curated note
// files emitted by Phases 2/3/4 under apps/qw-oracle/curated/<type>-notes/ and
// parses them with gray-matter (the same library load-concepts uses for its
// frontmatter pass). Pure I/O + parse; no database, no logic.
//
// Failure modes returned, not thrown:
//   - file does not exist -> { exists: false }
//   - file exists but frontmatter malformed -> rethrows the gray-matter error
//     (rare; emitted notes always pass through Phase 2/3/4's emit-note pipeline
//     which builds frontmatter deterministically -- malformed frontmatter is a
//     real bug that shouldn't be hidden).
//
// Path resolution: __dirname under bun is the absolute path of this file's
// directory (apps/qw-oracle/serve/mcp/src). The curated/ tree lives at
// apps/qw-oracle/curated/, four parent jumps away. Validation Task 9 covers
// this resolution against the live tree.

import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import matter from 'gray-matter';

export type CommunityNoteType = 'player' | 'clan' | 'tournament';

interface ReadOk {
  exists: true;
  frontmatter: Record<string, unknown>;
  body: string;
  absolute_path: string;
}
interface ReadMiss {
  exists: false;
  absolute_path: string;
}
export type CommunityNoteReadResult = ReadOk | ReadMiss;

// Resolved once per process. The serve/mcp/src directory -> ../../../../curated.
// If serve/mcp/ ever moves, update here. The Phase 1 rename made curated/ a
// fixed sibling under apps/qw-oracle/, so this is stable.
const CURATED_ROOT = resolve(__dirname, '..', '..', '..', 'curated');

const FOLDER: Record<CommunityNoteType, string> = {
  player: 'player-notes',
  clan: 'clan-notes',
  tournament: 'tournament-notes',
};

export function resolveNotePath(type: CommunityNoteType, slug: string): string {
  return resolve(CURATED_ROOT, FOLDER[type], `${slug}.md`);
}

export async function readCommunityNote(
  type: CommunityNoteType,
  slug: string,
): Promise<CommunityNoteReadResult> {
  const path = resolveNotePath(type, slug);
  try {
    await access(path);
  } catch {
    return { exists: false, absolute_path: path };
  }
  const raw = await readFile(path, 'utf8');
  // gray-matter returns { data, content, excerpt? }; we ignore excerpt.
  const parsed = matter(raw);
  return {
    exists: true,
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
    absolute_path: path,
  };
}
```

- [ ] Author `community-note-reader.test.ts`. The test creates a temporary directory under `/tmp/qw-oracle-note-reader-<random>/` containing `player-notes/sample.md`, points `CURATED_ROOT` at it via constructor injection (refactor `community-note-reader.ts` slightly so the root is overridable for tests, OR use `mock` to replace `__dirname` -- the simpler pattern is constructor injection: export a `createReader(root)` factory and have the default `readCommunityNote` use the production root). Test cases:
  - **Test 1:** existing file -> `exists: true`, `frontmatter.slug === 'sample'`, `body` matches expected.
  - **Test 2:** missing file -> `exists: false`, `absolute_path` ends in `.md`.
  - **Test 3:** body without frontmatter (no `---` block) -> `exists: true`, `frontmatter` is empty object `{}`, body is the full file.

  Implementation note for the executor: the simplest refactor is to add an exported factory `createCommunityNoteReader(rootOverride?: string)` that returns a `read(type, slug)` function bound to the given root (defaulting to CURATED_ROOT). The `readCommunityNote` named export remains as the production entry point. The test instantiates the factory with a `/tmp` root.

- [ ] Run `bun test apps/qw-oracle/serve/mcp/src/community-note-reader.test.ts` and confirm all three tests pass.

**Verification:**
```
bun test apps/qw-oracle/serve/mcp/src/community-note-reader.test.ts
# PASS: all three tests pass.

bunx tsc --noEmit
# PASS: no type errors.
```

**Execution mode:** subagent (Sonnet medium) -- code synthesis with judgment on the factory injection refactor + path-resolution sanity. The executor's main thread benefits from isolated context here so the larger main thread retains room for Tasks 3-7 dispatching.

---

### Task 3 -- Build per-player tools (search_players + lookup_player + get_player_note)

**Goal:** Land three tool files under `apps/qw-oracle/serve/mcp/src/tools/` implementing the per-player retrieval triplet. `search_players(query, limit)` does case-insensitive substring matching against `title`, `display_name`, `real_name`, and the `aliases` TEXT[] array, ordered with substantive entities first. `lookup_player(slug)` performs a single-row SELECT against `community.players`, then composes `clan_eras` (from `community.player_clan_eras`) and `tournament_results` (from `community.tournament_results`) into the response. `get_player_note(slug)` reads `apps/qw-oracle/curated/player-notes/<slug>.md` via `community-note-reader.ts`. All three return `ToolResponse<PlayerRecord>` (or `ToolResponse<CommunityNoteRecord>` for `get_player_note`) per Task 1.

**Files:**
- `apps/qw-oracle/serve/mcp/src/tools/search-players.ts` (created)
- `apps/qw-oracle/serve/mcp/src/tools/lookup-player.ts` (created)
- `apps/qw-oracle/serve/mcp/src/tools/get-player-note.ts` (created)

**Steps:**
- [ ] Author `search-players.ts`. The tool accepts `{ query: string; limit?: number }`. Default limit 10, max 25 (mirroring `lookup_entity`). The SQL pattern:

```sql
SELECT slug, title, display_name, aliases, real_name, nationality, nationality_iso,
       current_clan, active_year_start, active_year_end, status, community_roles,
       has_note, is_substantive, is_stub, source_template
FROM community.players
WHERE title ILIKE $like
   OR display_name ILIKE $like
   OR real_name ILIKE $like
   OR EXISTS (
     SELECT 1 FROM unnest(aliases) a WHERE a ILIKE $like
   )
ORDER BY
  -- exact-title match first (case-insensitive)
  CASE WHEN lower(title) = lower($q) THEN 0 ELSE 1 END,
  -- then substantive entities
  CASE WHEN is_substantive THEN 0 ELSE 1 END,
  -- then by title length (shorter = closer match), then alphabetical
  length(title) ASC, title ASC
LIMIT $limit
```

  where `$q` is the raw query and `$like` is `'%' || $q || '%'`. Bind via postgres-js tagged-template; do NOT use `db.unsafe`. The match_quality bucketing: `'strong'` if at least one row has `lower(title) = lower(query)` (exact match), `'weak'` if rows returned without an exact-match, `'none'` if no rows. Empty `clan_eras` and `tournament_results` (the optional fields are simply omitted from the search results -- they are populated only by `lookup_player`). Full file content (the executor copies this verbatim, modifying only what live-codebase recon surfaces -- e.g., the `db` import path, which is `'../db.ts'` per existing tools):

```typescript
// apps/qw-oracle/serve/mcp/src/tools/search-players.ts
//
// Substring + alias retrieval over community.players. ILIKE-driven; no tsvector
// or pgvector at this phase -- those are follow-up arc work if substring proves
// insufficient. Ordering favours exact-title matches, then substantive
// entities, then short titles, then alphabetical for stability.

import { db } from '../db.ts';
import type { PlayerRecord, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  query: string;
  limit?: number;
}

interface PlayerRow {
  slug: string;
  title: string;
  display_name: string | null;
  aliases: string[] | null;
  real_name: string | null;
  nationality: string | null;
  nationality_iso: string | null;
  current_clan: string | null;
  active_year_start: number | null;
  active_year_end: number | null;
  status: PlayerRecord['status'];
  community_roles: string[] | null;
  has_note: boolean;
  is_substantive: boolean;
  is_stub: boolean;
  source_template: PlayerRecord['source_template'];
}

function rowToRecord(row: PlayerRow): PlayerRecord {
  return {
    slug: row.slug,
    title: row.title,
    display_name: row.display_name,
    aliases: row.aliases ?? [],
    real_name: row.real_name,
    nationality: row.nationality,
    nationality_iso: row.nationality_iso,
    current_clan: row.current_clan,
    active_year_start: row.active_year_start,
    active_year_end: row.active_year_end,
    status: row.status,
    community_roles: row.community_roles ?? [],
    has_note: row.has_note,
    is_substantive: row.is_substantive,
    is_stub: row.is_stub,
    source_template: row.source_template,
  };
}

export async function searchPlayers(args: Args): Promise<ToolResponse<PlayerRecord>> {
  const limit = Math.min(Math.max(args.limit ?? 10, 1), 25);
  const like = `%${args.query}%`;
  const queryLower = args.query.toLowerCase();

  const rows = await db<PlayerRow[]>`
    SELECT slug, title, display_name, aliases, real_name, nationality, nationality_iso,
           current_clan, active_year_start, active_year_end, status, community_roles,
           has_note, is_substantive, is_stub, source_template
    FROM community.players
    WHERE title ILIKE ${like}
       OR display_name ILIKE ${like}
       OR real_name ILIKE ${like}
       OR EXISTS (
         SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${like}
       )
    ORDER BY
      CASE WHEN lower(title) = ${queryLower} THEN 0 ELSE 1 END,
      CASE WHEN is_substantive THEN 0 ELSE 1 END,
      length(title) ASC, title ASC
    LIMIT ${limit}
  `;

  const results = rows.map(rowToRecord);
  const hasExact = rows.some((r) => r.title.toLowerCase() === queryLower);
  const matchQuality: 'strong' | 'weak' | 'none' =
    rows.length === 0 ? 'none' : hasExact ? 'strong' : 'weak';

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No player matches for "${args.query}". Try lookup_by_nick for cross-type alias resolution, or search_solved_issues for community discussion.`
        : null,
    meta: {
      tool: 'search_players',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] Author `lookup-player.ts`. The tool accepts `{ slug: string }`. The SQL pattern:

```typescript
// apps/qw-oracle/serve/mcp/src/tools/lookup-player.ts
//
// Slug lookup composing the player row + cross-link arrays. The single tool
// call returns everything an asking LLM needs about the player at the row level
// (frontmatter-equivalent) plus the era + result history. The note BODY is a
// separate tool call (get_player_note) -- this matches the L1 shape where
// lookup_entity returns the EntityRecord and get_concept_note returns the prose.
//
// Slug matching is ILIKE for case-insensitive lookup (the slug filename minus
// .md is operator-typed; we accept case-loose lookup). If the slug column is
// case-preserved (it is, per Phase 1 schema), exact-match-first-then-loose is
// not necessary -- ILIKE handles both.

import { db } from '../db.ts';
import type {
  PlayerClanEra,
  PlayerRecord,
  PlayerTournamentResult,
  ToolResponse,
} from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  slug: string;
}

interface PlayerRow {
  slug: string;
  title: string;
  display_name: string | null;
  aliases: string[] | null;
  real_name: string | null;
  nationality: string | null;
  nationality_iso: string | null;
  current_clan: string | null;
  active_year_start: number | null;
  active_year_end: number | null;
  status: PlayerRecord['status'];
  community_roles: string[] | null;
  has_note: boolean;
  is_substantive: boolean;
  is_stub: boolean;
  source_template: PlayerRecord['source_template'];
}

interface EraRow {
  clan_slug: string | null;
  clan_title: string;
  start_year: number | null;
  end_year: number | null;
  era_seq: number | null;
  source: PlayerClanEra['source'];
}

interface ResultRow {
  tournament_slug: string | null;
  tournament_title: string;
  year: number | null;
  place: string | null;
  mode: string | null;
  team: string | null;
  team_flag: string | null;
  source: PlayerTournamentResult['source'];
}

export async function lookupPlayer(args: Args): Promise<ToolResponse<PlayerRecord>> {
  const playerRows = await db<PlayerRow[]>`
    SELECT slug, title, display_name, aliases, real_name, nationality, nationality_iso,
           current_clan, active_year_start, active_year_end, status, community_roles,
           has_note, is_substantive, is_stub, source_template
    FROM community.players
    WHERE slug ILIKE ${args.slug}
    LIMIT 1
  `;
  const row = playerRows[0];
  const now = () => new Date().toISOString();

  if (!row) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No player with slug "${args.slug}". Try search_players with a substring, or lookup_by_nick for alias resolution.`,
      meta: { tool: 'lookup_player', server_version: SERVER_VERSION, queried_at: now() },
    };
  }

  const [eraRows, resultRows] = await Promise.all([
    db<EraRow[]>`
      SELECT clan_slug, clan_title, start_year, end_year, era_seq, source
      FROM community.player_clan_eras
      WHERE player_slug = ${row.slug}
      ORDER BY
        CASE WHEN start_year IS NULL THEN 1 ELSE 0 END,
        start_year ASC NULLS LAST,
        era_seq ASC NULLS LAST,
        clan_title ASC
    `,
    db<ResultRow[]>`
      SELECT tournament_slug, tournament_title, year, place, mode, team, team_flag, source
      FROM community.tournament_results
      WHERE player_slug = ${row.slug}
      ORDER BY year DESC NULLS LAST, tournament_title ASC, place ASC NULLS LAST
    `,
  ]);

  const record: PlayerRecord = {
    slug: row.slug,
    title: row.title,
    display_name: row.display_name,
    aliases: row.aliases ?? [],
    real_name: row.real_name,
    nationality: row.nationality,
    nationality_iso: row.nationality_iso,
    current_clan: row.current_clan,
    active_year_start: row.active_year_start,
    active_year_end: row.active_year_end,
    status: row.status,
    community_roles: row.community_roles ?? [],
    has_note: row.has_note,
    is_substantive: row.is_substantive,
    is_stub: row.is_stub,
    source_template: row.source_template,
    clan_eras: eraRows.map((e) => ({ ...e })),
    tournament_results: resultRows.map((r) => ({ ...r })),
  };

  return {
    results: [record],
    match_quality: 'strong',
    suggested_fallback:
      row.has_note
        ? null
        : `Player "${row.title}" exists but has no curated note (has_note=false). Row data above is the complete view.`,
    meta: { tool: 'lookup_player', server_version: SERVER_VERSION, queried_at: now() },
  };
}
```

- [ ] Author `get-player-note.ts`. The tool accepts `{ slug: string }`, calls `readCommunityNote('player', slug)`, and composes the response. If the file does not exist OR `community.players.has_note=false`, returns `match_quality='none'` with a suggested_fallback pointing at `lookup_player`. If the file exists, joins the row in for `row_summary` (the compact projection).

```typescript
// apps/qw-oracle/serve/mcp/src/tools/get-player-note.ts
//
// Filesystem-backed retrieval of the curated/player-notes/<slug>.md body.
// Pairs with lookup_player (rows + cross-link) to provide the prose overlay
// per D18. If has_note=false on the row OR the file is missing on disk, the
// tool returns match_quality='none' with a fallback pointing at lookup_player.

import { db } from '../db.ts';
import { readCommunityNote } from '../community-note-reader.ts';
import type { CommunityNoteRecord, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  slug: string;
}

interface PlayerSummaryRow {
  slug: string;
  title: string;
  display_name: string | null;
  nationality: string | null;
  nationality_iso: string | null;
  current_clan: string | null;
  active_year_start: number | null;
  active_year_end: number | null;
  status: string | null;
  has_note: boolean;
  is_substantive: boolean;
}

export async function getPlayerNote(args: Args): Promise<ToolResponse<CommunityNoteRecord>> {
  const now = () => new Date().toISOString();

  const playerRows = await db<PlayerSummaryRow[]>`
    SELECT slug, title, display_name, nationality, nationality_iso, current_clan,
           active_year_start, active_year_end, status, has_note, is_substantive
    FROM community.players
    WHERE slug ILIKE ${args.slug}
    LIMIT 1
  `;
  const row = playerRows[0];

  if (!row) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No player with slug "${args.slug}". Try search_players or lookup_by_nick.`,
      meta: { tool: 'get_player_note', server_version: SERVER_VERSION, queried_at: now() },
    };
  }

  if (!row.has_note) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `Player "${row.title}" exists but has no curated note (has_note=false). Call lookup_player for the row data.`,
      meta: { tool: 'get_player_note', server_version: SERVER_VERSION, queried_at: now() },
    };
  }

  const note = await readCommunityNote('player', row.slug);
  if (!note.exists) {
    // has_note=true but file missing -> drift between DB and filesystem.
    // Surface as 'none' with a remediation hint.
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `Player "${row.title}" has has_note=true but the markdown note is missing at ${note.absolute_path}. Re-run the Phase 2 emit-note pipeline (curated/player-notes/ may have been deleted or partially regenerated).`,
      meta: { tool: 'get_player_note', server_version: SERVER_VERSION, queried_at: now() },
    };
  }

  const record: CommunityNoteRecord = {
    slug: row.slug,
    type: 'player',
    title: row.title,
    body: note.body,
    frontmatter: note.frontmatter,
    row_summary: {
      title: row.title,
      display_name: row.display_name,
      nationality: row.nationality,
      nationality_iso: row.nationality_iso,
      current_clan: row.current_clan,
      active_year_start: row.active_year_start,
      active_year_end: row.active_year_end,
      status: row.status,
      is_substantive: row.is_substantive,
    },
  };

  return {
    results: [record],
    match_quality: 'strong',
    suggested_fallback: null,
    meta: { tool: 'get_player_note', server_version: SERVER_VERSION, queried_at: now() },
  };
}
```

**Verification:**
```
bunx tsc --noEmit
# PASS: no type errors in the three new tool files.
```

(Behavioural verification of these three tools happens in Task 9's integration-test pass; this Task 3 verification is type-only.)

**Execution mode:** subagent (Sonnet medium) -- three-file code synthesis with SQL composition + cross-link join logic. Sonnet medium is the right ceiling: the SQL is straightforward, the postgres-js tagged-template binding is patterned after existing tools, and the response-shape composition is mechanical given Task 1's types. Isolated context preferred over polluting the executor main thread with 3 file authoring sessions.

---

### Task 4 -- Build per-clan tools (search_clans + lookup_clan + get_clan_note)

**Goal:** Land three tool files implementing the per-clan retrieval triplet, mirroring Task 3's shape. `search_clans` matches against `title` and `prefix`; `lookup_clan` composes the row + member roster (derived by joining `community.player_clan_eras` and grouping by `player_slug`); `get_clan_note` reads `apps/qw-oracle/curated/clan-notes/<slug>.md`.

**Files:**
- `apps/qw-oracle/serve/mcp/src/tools/search-clans.ts` (created)
- `apps/qw-oracle/serve/mcp/src/tools/lookup-clan.ts` (created)
- `apps/qw-oracle/serve/mcp/src/tools/get-clan-note.ts` (created)

**Steps:**
- [ ] Author `search-clans.ts`. Mirrors `search-players.ts` shape, with these differences:
  - The matched columns are `title`, `prefix`, `irc_channel` (people sometimes refer to a clan by IRC channel, e.g. `#example`). NOT `aliases` -- `community.clans` has no aliases column per Phase 1 schema; verify before authoring (the executor does the recon).
  - Order: exact-title match first, then `is_substantive DESC`, then `length(title) ASC`, then alphabetical.
  - Returns `ToolResponse<ClanRecord>` with `members` field omitted.
  - The full content follows `search-players.ts` shape.

- [ ] Author `lookup-clan.ts`. Mirrors `lookup-player.ts` shape but composes `members` instead of cross-link arrays:

```sql
SELECT pce.player_slug,
       p.title AS player_title,
       pce.start_year,
       pce.end_year,
       pce.era_seq,
       (pce.end_year IS NULL) AS active
FROM community.player_clan_eras pce
JOIN community.players p ON p.slug = pce.player_slug
WHERE pce.clan_slug = ${row.slug}
ORDER BY
  CASE WHEN pce.end_year IS NULL THEN 0 ELSE 1 END,  -- active members first
  pce.start_year ASC NULLS LAST,
  pce.era_seq ASC NULLS LAST,
  p.title ASC
```

  Note: `clan_slug` is the FK from `player_clan_eras` to `community.clans`; per Phase 1 schema it is nullable when the clan title did not resolve to a clans row. `lookup_clan` only surfaces eras where the clan_slug resolves -- otherwise the join would not match.

  Edge case: a player's era row may have `clan_slug=NULL` because the `clan_title` did not resolve to a `community.clans` slug. Those rows are NOT visible to `lookup_clan` (no clan in `community.clans` to look up for). They DO appear in `lookup_player`'s `clan_eras` array via `clan_title`. This asymmetry is intentional -- a clan-side roster query only makes sense for clans that have a slug.

- [ ] Author `get-clan-note.ts`. Mirrors `get-player-note.ts` shape, type='clan'. The `row_summary` field projects: `title`, `prefix`, `nationality`, `nationality_iso`, `founded_year`, `disbanded`, `status`, `is_substantive`.

**Verification:**
```
bunx tsc --noEmit
# PASS: no type errors in the three new tool files.
```

**Execution mode:** subagent (Sonnet medium) -- same shape as Task 3; isolated context for three-file authoring.

---

### Task 5 -- Build per-tournament tools (search_tournaments + lookup_tournament + get_tournament_note)

**Goal:** Land three tool files implementing the per-tournament retrieval triplet. Phase 4's migration 009 added tournament-specific columns to `community.tournaments`; the executor verifies the column list matches Task 1's `TournamentRecord` interface and adjusts SELECT clauses accordingly. `search_tournaments` accepts substring `query` plus structured filters (`year`, `mode`, `format`, `tournament_type`, `country_iso`); `lookup_tournament` composes the row + result roster (joining `community.tournament_results` to `community.players`); `get_tournament_note` reads `apps/qw-oracle/curated/tournament-notes/<slug>.md`.

**Files:**
- `apps/qw-oracle/serve/mcp/src/tools/search-tournaments.ts` (created)
- `apps/qw-oracle/serve/mcp/src/tools/lookup-tournament.ts` (created)
- `apps/qw-oracle/serve/mcp/src/tools/get-tournament-note.ts` (created)

**Steps:**
- [ ] **PRE-FLIGHT:** the executor reads `apps/qw-oracle/db/migrations/009_tournament_columns.sql` (post-Phase-4) and verifies the column list against Task 1's `TournamentRecord` interface. Any column-name divergence between the two is reconciled by amending Task 1's interface (preferred) OR adjusting the SELECT projection in this task. Document the reconciliation in the executor's halt notes.

- [ ] Author `search-tournaments.ts`. Matches:
  - Substring on `title` (always).
  - Structured filters (when provided): `year` (exact match), `mode` (exact match against the migration-009 enum value), `format` (exact match), `tournament_type` (exact match), `country_iso` (exact match).
  - Order: exact-title match first, then `is_substantive DESC`, then `start_date DESC NULLS LAST`, then alphabetical.
  - The dynamic-WHERE composition follows the existing `search-mechanics.ts` pattern (each optional filter is a `db\`AND ... = ${value}\`` fragment composed into the main query).

- [ ] Author `lookup-tournament.ts`. SQL for the `results` array:

```sql
SELECT tr.player_slug,
       p.title AS player_title,
       tr.year,
       tr.place,
       tr.mode,
       tr.team,
       tr.team_flag,
       tr.source
FROM community.tournament_results tr
JOIN community.players p ON p.slug = tr.player_slug
WHERE tr.tournament_slug = ${row.slug}
ORDER BY
  -- numeric place sort where possible, fallback to text order
  CASE WHEN tr.place ~ '^[0-9]+$' THEN tr.place::int ELSE 999 END ASC,
  tr.place ASC NULLS LAST,
  tr.year DESC NULLS LAST,
  p.title ASC
```

  Edge case (mirrors Task 4): rows in `tournament_results` with `tournament_slug=NULL` (Phase 5's unmatched titles) are NOT surfaced by `lookup_tournament` -- a tournament-side query needs a slug. Those rows are visible from `lookup_player`.

- [ ] Author `get-tournament-note.ts`. Mirrors `get-player-note.ts` shape, type='tournament'. The `row_summary` field projects: `title`, `series`, `season_number`, `year`, `tournament_type`, `mode`, `format`, `start_date`, `end_date`, `country`, `country_iso`, `is_substantive`. (The exact column list is reconciled against migration 009 in the pre-flight step above.)

**Verification:**
```
bunx tsc --noEmit
# PASS: no type errors in the three new tool files.

# Sanity check that the column list matches migration 009:
psql -d qw_oracle -c "\d community.tournaments" | grep -v "^[-(]" | wc -l
# PASS: column count >= 9 (the Phase 1 placeholder set) plus the migration 009 additions.
```

**Execution mode:** subagent (Sonnet medium) -- code synthesis plus migration-009 reconciliation. The reconciliation step requires the subagent to read the live migration file and compare against Task 1's TS interface; that's judgment-flavoured work. Sonnet medium is the right ceiling.

---

### Task 6 -- Build lookup_by_nick tool (cross-type alias resolution)

**Goal:** Land `apps/qw-oracle/serve/mcp/src/tools/lookup-by-nick.ts` implementing the cross-type alias resolution per D11. Queries `community.players` (matching against title, display_name, real_name, aliases) AND `community.clans` (matching against title, prefix), unions the result, returns `ToolResponse<NickHit>` with discriminator `kind`.

**Files:**
- `apps/qw-oracle/serve/mcp/src/tools/lookup-by-nick.ts` (created)

**Steps:**
- [ ] Author `lookup-by-nick.ts`. The match strategy:
  - For players: ILIKE on title, display_name, real_name, and the aliases array (UNNEST + ILIKE) -- same shape as `search_players` but reports which field hit via the `matched_via` discriminator.
  - For clans: ILIKE on title and prefix.
  - The query case is partial+exact: `lower(field) = lower(nick)` is `matched_via=...` with priority over `field ILIKE '%' || nick || '%'`.
  - The two SELECT branches are unioned via `UNION ALL` with a `kind` literal column. The composite ORDER BY favours exact matches, then substantive entities, then prefix-tagged clan hits over substring player hits, then alphabetical.

  Per F7 (case-variant pairs intentionally distinct) the search is case-insensitive but multiple matches surface as separate rows -- the consumer LLM picks. Per Phase 2 Q4 (`Acid` returning three players) the multi-row return is the design.

  Per D11 the search is players + clans only; tournaments are NOT in scope (consumer uses `search_tournaments` for that). The `matched_via` field for clan hits is `'title'` or `'prefix'`; for player hits it is `'title' | 'display_name' | 'aliases' | 'real_name'`.

  Full SQL pattern (composed via tagged-template, with a single CTE for clarity):

```sql
WITH player_hits AS (
  SELECT 'player' AS kind, slug, title, display_name, is_substantive, nationality_iso, current_clan,
         CASE
           WHEN lower(title) = lower($q)        THEN 'title'
           WHEN lower(display_name) = lower($q) THEN 'display_name'
           WHEN lower(real_name) = lower($q)   THEN 'real_name'
           WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE lower(a) = lower($q)) THEN 'aliases'
           WHEN title ILIKE $like               THEN 'title'
           WHEN display_name ILIKE $like        THEN 'display_name'
           WHEN real_name ILIKE $like           THEN 'real_name'
           ELSE 'aliases'
         END AS matched_via,
         CASE
           WHEN lower(title) = lower($q) OR lower(display_name) = lower($q)
             OR lower(real_name) = lower($q)
             OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE lower(a) = lower($q))
           THEN 0 ELSE 1
         END AS exact_rank
  FROM community.players
  WHERE title ILIKE $like
     OR display_name ILIKE $like
     OR real_name ILIKE $like
     OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE $like)
),
clan_hits AS (
  SELECT 'clan' AS kind, slug, title, NULL::text AS display_name, is_substantive, nationality_iso, NULL::text AS current_clan,
         CASE
           WHEN lower(title) = lower($q)  THEN 'title'
           WHEN lower(prefix) = lower($q) THEN 'prefix'
           WHEN title ILIKE $like         THEN 'title'
           ELSE 'prefix'
         END AS matched_via,
         CASE
           WHEN lower(title) = lower($q) OR lower(prefix) = lower($q) THEN 0 ELSE 1
         END AS exact_rank
  FROM community.clans
  WHERE title ILIKE $like
     OR prefix ILIKE $like
)
SELECT kind, slug, title, display_name, matched_via, is_substantive,
       nationality_iso, current_clan, exact_rank
FROM (
  SELECT * FROM player_hits
  UNION ALL
  SELECT * FROM clan_hits
) combined
ORDER BY exact_rank ASC, is_substantive DESC, length(title) ASC, kind ASC, title ASC
LIMIT $limit
```

  match_quality: `'strong'` if at least one row has `exact_rank=0` (any exact match); `'weak'` if rows returned but no exact match; `'none'` if zero rows.

  Default limit 10, max 50 (a higher max than other tools because L2-primer use cases may want broader recall).

**Verification:**
```
bunx tsc --noEmit
# PASS: no type errors.
```

**Execution mode:** subagent (Sonnet medium) -- SQL composition with cross-type union judgment. The exact-vs-loose match precedence requires careful CASE expression authoring; Sonnet medium is appropriate for this scoped synthesis.

---

### Task 7 -- Wire ten tools into index.ts (imports, switch cases, TOOL_LIST entries)

**Goal:** Update `apps/qw-oracle/serve/mcp/src/index.ts` to register all ten new tools. The wiring follows the existing pattern: import the tool's exported function, add a case in the `CallToolRequestSchema` handler that invokes `dispatchAndLog` with the right `tool` name and `queryText`, and append a TOOL_LIST entry with `name`, `description`, and `inputSchema`.

**Files:**
- `apps/qw-oracle/serve/mcp/src/index.ts` (modified)

**Steps:**
- [ ] Add the ten imports near the existing tool imports (after the current `redirectToHuman` import):

```typescript
import { searchPlayers } from './tools/search-players.ts';
import { lookupPlayer } from './tools/lookup-player.ts';
import { getPlayerNote } from './tools/get-player-note.ts';
import { searchClans } from './tools/search-clans.ts';
import { lookupClan } from './tools/lookup-clan.ts';
import { getClanNote } from './tools/get-clan-note.ts';
import { searchTournaments } from './tools/search-tournaments.ts';
import { lookupTournament } from './tools/lookup-tournament.ts';
import { getTournamentNote } from './tools/get-tournament-note.ts';
import { lookupByNick } from './tools/lookup-by-nick.ts';
```

- [ ] Add ten `case` statements inside the `setRequestHandler(CallToolRequestSchema, ...)` switch, following the existing dispatch pattern. The `queryText` for each case is the most-relevant single string the operator wants to read in `query_log` (per the `query-log.ts` doc comment):

```typescript
      case 'search_players':
        return dispatchAndLog(
          { tool: 'search_players', queryText: typeof args.query === 'string' ? args.query : null },
          () => searchPlayers(args as { query: string; limit?: number }),
        );
      case 'lookup_player':
        return dispatchAndLog(
          { tool: 'lookup_player', queryText: typeof args.slug === 'string' ? args.slug : null },
          () => lookupPlayer(args as { slug: string }),
        );
      case 'get_player_note':
        return dispatchAndLog(
          { tool: 'get_player_note', queryText: typeof args.slug === 'string' ? args.slug : null },
          () => getPlayerNote(args as { slug: string }),
        );
      case 'search_clans':
        return dispatchAndLog(
          { tool: 'search_clans', queryText: typeof args.query === 'string' ? args.query : null },
          () => searchClans(args as { query: string; limit?: number }),
        );
      case 'lookup_clan':
        return dispatchAndLog(
          { tool: 'lookup_clan', queryText: typeof args.slug === 'string' ? args.slug : null },
          () => lookupClan(args as { slug: string }),
        );
      case 'get_clan_note':
        return dispatchAndLog(
          { tool: 'get_clan_note', queryText: typeof args.slug === 'string' ? args.slug : null },
          () => getClanNote(args as { slug: string }),
        );
      case 'search_tournaments':
        return dispatchAndLog(
          { tool: 'search_tournaments', queryText: summariseFilterArgs(args) },
          () => searchTournaments(args as Parameters<typeof searchTournaments>[0]),
        );
      case 'lookup_tournament':
        return dispatchAndLog(
          { tool: 'lookup_tournament', queryText: typeof args.slug === 'string' ? args.slug : null },
          () => lookupTournament(args as { slug: string }),
        );
      case 'get_tournament_note':
        return dispatchAndLog(
          { tool: 'get_tournament_note', queryText: typeof args.slug === 'string' ? args.slug : null },
          () => getTournamentNote(args as { slug: string }),
        );
      case 'lookup_by_nick':
        return dispatchAndLog(
          { tool: 'lookup_by_nick', queryText: typeof args.nick === 'string' ? args.nick : null },
          () => lookupByNick(args as { nick: string; limit?: number }),
        );
```

- [ ] Append ten TOOL_LIST entries (after the existing `redirect_to_human` entry). The descriptions must be honest about scope -- mention the source dataset (community.* schema, populated from quakeworld.nu wiki snapshot 2026-05-04), the row count guidance (search_players returns up to 25 rows; the corpus is 5,903 players), and the fallback path (lookup_by_nick for cross-type alias resolution; redirect_to_human for honest-failure escape). Use the existing TOOL_LIST entries as the style template.

  The full TOOL_LIST additions (the executor pastes verbatim, then runs `bunx tsc --noEmit` to confirm no compile errors):

```typescript
  // Phase 6: community-reference layer (players + clans + tournaments).
  // All ten tools query the community.* schema populated from a 2026-05-04
  // snapshot of the QuakeWorld wiki (quakeworld.nu, MediaWiki 1.35.10).
  {
    name: 'search_players',
    description:
      'Substring search over the QuakeWorld community-player corpus (5,903 player articles from quakeworld.nu wiki, snapshot 2026-05-04). Matches against player title, display name, real name, and the aliases list (aka / alias / ids / otheraliases fields from the wiki). Returns rows ordered exact-match first, then substantive entities, then shorter titles. Use this for partial-name searches ("milt", "joni", "Black Book"). For canonical-slug lookup with cross-link history (clan eras, tournament results), follow up with lookup_player. For cross-type alias resolution (player OR clan match) call lookup_by_nick.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query. Case-insensitive substring match.' },
        limit: { type: 'number', description: 'Max results to return. Default 10, max 25.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'lookup_player',
    description:
      'Slug-based lookup of a single player from community.players. Returns the player row (title, real_name, aliases, nationality, current_clan, status, active_year_start/end, community_roles, the substantive/has_note/stub flags, source template) plus the full clan-eras history (one row per clan_title, with start_year / end_year / source) and the full tournament-results history (one row per achievement, with year / place / mode / team). Slug lookup is case-insensitive. The note BODY (prose, quotes, equipment tables, trivia) is in get_player_note -- this tool returns the structured row + cross-link, not the prose. For substring search use search_players first.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Player wiki slug (article filename minus .json). Case-insensitive.' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_player_note',
    description:
      'Read the curated markdown note for a single player from apps/qw-oracle/curated/player-notes/<slug>.md (filesystem). Notes exist only for players with has_note=true (~tuned subset of the 5,903 corpus) -- the row schema carries everything else. Returns frontmatter (YAML mirror of the row) + body (narrative prose, mouse settings, crosshair tables, quotes, trivia, media, gallery, see-also, external links) + a row_summary field projecting key columns. If has_note=false on the row, returns match_quality=none with a fallback to lookup_player. Pairs with lookup_player (rows + cross-link) per D18.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Player wiki slug. Case-insensitive.' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'search_clans',
    description:
      'Substring search over the QuakeWorld community-clan corpus (822 clan articles from quakeworld.nu wiki, snapshot 2026-05-04). Matches against clan title and prefix (e.g. "[SR]"). Returns rows ordered exact-match first, then substantive entities. Use this for partial-name searches ("slacker", "[SR]", "Black"). For canonical-slug lookup with member roster, follow up with lookup_clan. For cross-type alias resolution (player OR clan match) call lookup_by_nick.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query. Case-insensitive substring match.' },
        limit: { type: 'number', description: 'Max results. Default 10, max 25.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'lookup_clan',
    description:
      'Slug-based lookup of a single clan from community.clans. Returns the clan row (title, prefix, nationality, founded year/month/day, founded_by, disbanded, status, IRC channel/network, website, the substantive/has_note/stub flags, source template) plus the member roster derived from community.player_clan_eras (one row per (player, era), with active=true when end_year IS NULL). Members ordered active-first then by start_year. Slug lookup is case-insensitive. The note BODY is in get_clan_note. For substring search use search_clans first.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Clan wiki slug. Case-insensitive.' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_clan_note',
    description:
      'Read the curated markdown note for a single clan from apps/qw-oracle/curated/clan-notes/<slug>.md (filesystem). Notes exist only for clans with has_note=true. Returns frontmatter + body + row_summary. If has_note=false, returns match_quality=none with a fallback to lookup_clan.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Clan wiki slug. Case-insensitive.' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'search_tournaments',
    description:
      'Substring search and structured filter over the QuakeWorld community-tournament corpus (~600-900 tournament articles from quakeworld.nu wiki, snapshot 2026-05-04). Substring match on title; optional structured filters: year (exact), mode (1on1 / 2on2 / 4on4 / DMM4 / FFA / CTF), format (league / cup / LAN / online), tournament_type, country_iso. Returns rows ordered exact-title-match first, then substantive entities, then start_date desc. Use this for partial-name or filter-shaped tournament searches ("EQL Season", year=2024, mode=4on4). For canonical-slug lookup with the player results roster, follow up with lookup_tournament.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional. Substring match on tournament title.' },
        year: { type: 'number', description: 'Optional. Exact match on tournament year.' },
        mode: { type: 'string', description: 'Optional. Exact match on mode (1on1 | 2on2 | 4on4 | DMM4 | FFA | CTF). Allowed values come from migration 009 CHECK constraint.' },
        format: { type: 'string', description: 'Optional. Exact match on format (league | cup | LAN | online).' },
        tournament_type: { type: 'string', description: 'Optional. Exact match on tournament_type.' },
        country_iso: { type: 'string', description: 'Optional. Exact match on country_iso (2-letter, lowercase).' },
        limit: { type: 'number', description: 'Max results. Default 10, max 25.' },
      },
    },
  },
  {
    name: 'lookup_tournament',
    description:
      'Slug-based lookup of a single tournament from community.tournaments. Returns the tournament row (title, series, season_number, year, tournament_type, format, mode, start_date, end_date, prize_pool, organizers, founder, country, city, venue, website, twitch_handle, youtube_handle, discord_url, irc_channel, team_count, winner, winner_flag, the flags, source template) plus the player results roster from community.tournament_results (one row per (player, result), with year / place / mode / team / team_flag). Results ordered numeric-place ASC, then year DESC. Slug lookup is case-insensitive. The note BODY is in get_tournament_note. For substring or filter search use search_tournaments first.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Tournament wiki slug. Case-insensitive.' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_tournament_note',
    description:
      'Read the curated markdown note for a single tournament from apps/qw-oracle/curated/tournament-notes/<slug>.md (filesystem). Notes exist only for tournaments with has_note=true. Returns frontmatter + body + row_summary. If has_note=false, returns match_quality=none with a fallback to lookup_tournament.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Tournament wiki slug. Case-insensitive.' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'lookup_by_nick',
    description:
      'Cross-type alias resolution. Searches community.players (title, display_name, real_name, aliases) AND community.clans (title, prefix) for matches against the given nick string. Returns a discriminated union (kind: "player" | "clan") of all hits with matched_via naming the field that produced the hit. Used by the Layer 2 corpus reconstruction primer to recognize player nicks and clan tags in chat history. Multiple hits for the same nick are intentional -- e.g., three separate player articles share display_name "Acid"; the consumer LLM picks based on disambiguator. Tournaments are NOT in this tool (use search_tournaments for tournament names).',
    inputSchema: {
      type: 'object',
      properties: {
        nick: { type: 'string', description: 'The chat-corpus nick or clan tag to resolve. Case-insensitive.' },
        limit: { type: 'number', description: 'Max results. Default 10, max 50.' },
      },
      required: ['nick'],
    },
  },
```

  The TOOL_LIST array now has 22 entries (12 pre-existing + 10 new). The executor verifies the count via grep on the array literal -- TOOL_LIST is not a runtime export, but the entry count is mechanical to count.

**Verification:**
```
bunx tsc --noEmit
# PASS: no type errors.

grep -c "^    name: '" apps/qw-oracle/serve/mcp/src/index.ts
# PASS: 22 (12 pre-existing + 10 new TOOL_LIST entries).

grep -c "^      case '" apps/qw-oracle/serve/mcp/src/index.ts
# PASS: 22 case statements (12 pre-existing + 10 new dispatchAndLog cases).
```

**Execution mode:** subagent (Sonnet medium) -- multi-section edit (10 imports + 10 cases + 10 TOOL_LIST entries) with consistency judgment. The work is structured but voluminous; isolated context is preferred to keep the executor main thread tight.

---

### Task 8 -- Update orientation.ts to mention community-reference surface

**Goal:** Edit `apps/qw-oracle/serve/mcp/src/orientation.ts` to extend `ORIENTATION_INSTRUCTIONS` with a paragraph naming the community-reference layer (Layer 4 in the consumer's mental model: players + clans + tournaments + cross-link history). The paragraph names the per-type tools, the cross-type alias-resolution tool, and the curated-note tools, and gives "when to use" guidance consistent with the existing Layer 1 / Layer 2 / Layer 3 paragraphs.

**Files:**
- `apps/qw-oracle/serve/mcp/src/orientation.ts` (modified)

**Steps:**
- [ ] Replace `apps/qw-oracle/serve/mcp/src/orientation.ts` with the following full content. Preserve the ASCII-only / no-emoji discipline (D13). The diff against the live file is additive (one new bullet group + one new "Recommended iteration" bullet); the existing content is preserved verbatim.

```typescript
// apps/qw-oracle/serve/mcp/src/orientation.ts
//
// Server-level orientation block. Returned to the consumer LLM at MCP
// initialize via the Server constructor's `instructions` field. Soft layer
// of the honest-failure stack; structural enforcement lives on each
// ToolResponse's match_quality field.

export const ORIENTATION_INSTRUCTIONS = `
QW Oracle is a knowledge service for QuakeWorld engine ports, game content, community history, and community reference.

Four layers:

- Layer 1 (engine + game-content facts): cvars, commands, macros, command-line params, rulesets, maps, gameplay mechanics. Use lookup_entity / search_entities / lookup_map / search_maps / lookup_mechanic / search_mechanics / lookup_gameplay_entity / search_gameplay_entities for definitive engine facts.
- Layer 3 (curated patterns and how-tos): use search_concepts for vague how-to questions. Concept notes synthesise Layer 1 facts into actionable guidance and reference related entities. The returned snippet + summary is the focused signal; call get_concept_note for the full body if the snippet alone is not enough.
- Layer 2 (chat history): use search_solved_issues for "has this been debugged before" questions. Returns raw chat sessions for citation. Discord-only; pre-2016 IRC content is not in this corpus.
- Layer 4 (community reference): players (5,903), clans (~822), tournaments (~600-900) sourced from quakeworld.nu wiki snapshot 2026-05-04. Use search_players / lookup_player / get_player_note for player retrieval (lookup_player composes clan eras + tournament results). Use search_clans / lookup_clan / get_clan_note for clans (lookup_clan composes member roster). Use search_tournaments / lookup_tournament / get_tournament_note for tournaments. Use lookup_by_nick to resolve a chat-corpus nick or clan tag across both players and clans (for L2 chat-recognition use cases). Note bodies live on the filesystem; rows + cross-link queries hit Postgres.

Recommended iteration:
- Start with search_concepts for how-to / pattern questions ("how do I configure X").
- Start with search_entities for fact questions ("what does X do") or use lookup_entity if the canonical id is known.
- Use search_solved_issues for historical / community questions.
- Use lookup_by_nick when reading chat or commentary and an unknown nick or clan tag appears.
- Use search_players / search_clans / search_tournaments for community-reference retrieval; lookup_<type> for canonical-slug lookup with cross-link composition.

Honest failure: every search response includes match_quality (strong / weak / none).
- match_quality = 'none' or 'weak': do NOT synthesise an answer from training data. Either redirect (call redirect_to_human) or state that the corpus does not cover this.
- match_quality = 'strong': synthesise from the returned snippets and cite by entity canonical_id, concept slug, session_id, or community.* slug.

Citation discipline: every claim should trace back to a Layer 1 entity (cite canonical_id), a Layer 3 concept note (cite slug), a Layer 2 chat session (cite session_id), or a Layer 4 community entity (cite player slug / clan slug / tournament slug). "The AI says" is not a valid citation.
`.trim();
```

**Verification:**
```
bunx tsc --noEmit
# PASS: no type errors (the file is a single string export, no logic).

grep -c "Layer 4" apps/qw-oracle/serve/mcp/src/orientation.ts
# PASS: >= 1 (the new community-reference paragraph).

grep -c "lookup_by_nick" apps/qw-oracle/serve/mcp/src/orientation.ts
# PASS: >= 1.
```

**Execution mode:** inline -- the full file content is shipped above; the executor pastes via Write, runs the verification, and moves on. Per the operator's "No Subagents for Mechanical Markdown Edits" feedback (which extends to mechanical text-shaped TS edits), this is the right call.

---

### Task 9 -- Author community.test.ts integration tests

**Goal:** Land `apps/qw-oracle/serve/mcp/src/tools/community.test.ts` covering the ten new tools end-to-end against `qw_oracle_test`. The tests follow the `maps.test.ts` pattern: `beforeAll` seeds rows in `community.players`, `community.clans`, `community.tournaments`, `community.player_clan_eras`, `community.tournament_results`; each test asserts on the tool's behaviour; `afterAll` TRUNCATEs. The test file also creates temporary markdown notes in `/tmp/qw-oracle-community-test-<random>/curated/<type>-notes/` and points the note-reader at this temp root via the factory pattern from Task 2.

**Files:**
- `apps/qw-oracle/serve/mcp/src/tools/community.test.ts` (created)

**Steps:**
- [ ] Author the test file. Required test coverage (one `test(...)` per assertion):
  - **search_players exact-match:** seed Milton (slug='Milton', is_substantive=true) and a non-substantive player; query 'Milton' returns Milton first with match_quality='strong'.
  - **search_players substantive-first ordering:** query 'a' (broad substring) returns substantive entities before non-substantive in the ordering.
  - **search_players alias hit:** seed a player with `aliases=['oceani', 'Mentos']`; query 'mentos' returns the player.
  - **search_players no-match:** query a string that hits nothing returns match_quality='none'.
  - **lookup_player composition:** seed Milton + 2 clan_eras + 3 tournament_results; lookup_player({slug: 'Milton'}) returns the row plus clan_eras (oldest-first) + tournament_results (year DESC).
  - **lookup_player not found:** lookup_player({slug: 'NotARealSlug'}) returns match_quality='none'.
  - **lookup_player has_note=false:** seeds a player with has_note=false; the response's suggested_fallback mentions the row data is the complete view.
  - **get_player_note hit:** writes `/tmp/.../player-notes/Milton.md` with frontmatter + body, seeds Milton with has_note=true, get_player_note({slug: 'Milton'}) returns body and frontmatter, match_quality='strong'.
  - **get_player_note has_note=false:** returns match_quality='none' with the lookup_player fallback.
  - **get_player_note file missing:** seeds has_note=true but no file written; returns match_quality='none' with the drift-remediation hint.
  - Mirror the above for clans (substring + lookup composition + note read).
  - Mirror for tournaments (substring + filter + lookup composition + note read).
  - **lookup_by_nick exact player match:** seed 'Acid' (player) + 'Acid' (player, different slug) + 'ACID' (clan); lookup_by_nick({nick: 'Acid'}) returns three rows with kind discriminator; first two are players, third is clan.
  - **lookup_by_nick prefix match:** seed clan with prefix='[SR]'; lookup_by_nick({nick: 'SR'}) returns the clan with matched_via='prefix'.
  - **lookup_by_nick alias match:** seed a player with aliases=['Mentos']; lookup_by_nick({nick: 'mentos'}) returns the player with matched_via='aliases'.
  - **lookup_by_nick no match:** returns match_quality='none'.

  Boilerplate the file follows (the executor adapts the seed shape against the live schema):

```typescript
// apps/qw-oracle/serve/mcp/src/tools/community.test.ts
//
// Integration tests for the ten Phase-6 community-reference MCP tools.
// Seeds rows in qw_oracle_test in beforeAll; TRUNCATEs in afterAll. Uses a
// temporary directory under /tmp for the curated/<type>-notes/ files so the
// test does not depend on the live curated/ tree.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { db } from '../db.ts';
// imports for the ten tools follow

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');

describe.skipIf(!HAS_DB)('Phase 6 community-reference MCP tools', () => {
  let tmpRoot: string;

  beforeAll(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'qw-oracle-community-test-'));
    await mkdir(join(tmpRoot, 'player-notes'), { recursive: true });
    await mkdir(join(tmpRoot, 'clan-notes'), { recursive: true });
    await mkdir(join(tmpRoot, 'tournament-notes'), { recursive: true });

    // TRUNCATE in dependency order (cross-link tables first because of FKs).
    await db`TRUNCATE community.tournament_results, community.player_clan_eras,
                       community.tournaments, community.clans, community.players CASCADE`;

    // Seed rows. The full SQL is voluminous; the executor authors the seed
    // block to cover all the test cases above. Sketch:
    // postgres-js binds JS arrays directly to TEXT[] columns; do NOT
    // pre-stringify or wrap in db.json. Same pattern Phase 2's upsert uses
    // (apps/qw-oracle/scripts/load-community/players/upsert.ts -- see Task 4).
    await db`
      INSERT INTO community.players (slug, title, display_name, aliases, real_name,
        nationality, nationality_iso, current_clan, active_year_start, status,
        community_roles, has_note, is_substantive, is_stub, source_template)
      VALUES
        ('Milton', 'Milton', 'Milton', ${['miltonmiata']},
         'Joni Sivula', 'Finland', 'fi', 'Black Book', 1997, 'Active',
         ${[]}, true, true, false, 'infobox_player'),
        ('Acid_Finnish', 'Acid (Finnish Player)', 'Acid', ${[]},
         null, 'Finland', 'fi', null, 1999, 'Active',
         ${[]}, false, true, false, 'player_info')
        -- the executor extends this VALUES list to cover all the test cases
    `;

    // Write the markdown notes.
    await writeFile(join(tmpRoot, 'player-notes', 'Milton.md'),
      '---\nslug: Milton\ntitle: Milton\ntype: player\n---\n\nMilton is a Finnish player.\n');
    // ... etc
  });

  afterAll(async () => {
    await db`TRUNCATE community.tournament_results, community.player_clan_eras,
                       community.tournaments, community.clans, community.players CASCADE`;
    await rm(tmpRoot, { recursive: true, force: true });
  });

  // tests follow ...
});
```

  IMPORTANT for the executor: the `community-note-reader.ts` factory injection from Task 2 is what the test uses to point note-reads at `tmpRoot`. The default `readCommunityNote` (production path) is NOT exercised by the test because it would require Phase 2/3/4 to have shipped against the test DB. Each `get_*_note` test uses a tool-internal version that consumes the test factory; the executor adapts the tool files in Task 3/4/5 to accept an optional reader injection (default is the production reader) for testability. This is a small refactor; the production behaviour is unchanged.

  Alternative: the test could directly call `readCommunityNote(type, slug)` with the default root and write fixture notes into the live `apps/qw-oracle/curated/<type>-notes/` tree under a `_test_` prefix that no production loader uses, then clean up. That couples the test to the live tree, which is fragile. Factory injection is cleaner.

- [ ] Run `bun test apps/qw-oracle/serve/mcp/src/tools/community.test.ts` and confirm all tests pass when `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test` is set; the test suite skips otherwise (mirroring the existing `maps.test.ts` skip pattern).

**Verification:**
```
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test apps/qw-oracle/serve/mcp/src/tools/community.test.ts
# PASS: all tests pass.

bunx tsc --noEmit
# PASS: no type errors.
```

**Execution mode:** subagent (Sonnet medium) -- test authoring with seed-data composition, FK-aware TRUNCATE, factory-injection adaptation. The work spans ~30 test cases; isolated context is essential.

---

### Task 10 -- Phase-boundary verification (smoke test the wired server)

**Goal:** Run a final round of verification that ties Phase 6 to the running MCP server. The executor starts the server (stdio transport) and runs the smoke calls listed below; the operator runs them too at sign-off.

**Files:**
- (none modified)

**Steps:**
- [ ] Run the full TypeScript check from `apps/qw-oracle/`:

```
cd apps/qw-oracle && bunx tsc --noEmit
# PASS: clean exit; no errors.
```

- [ ] Run the integration test suite for the community tools:

```
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test apps/qw-oracle/serve/mcp/src/tools/community.test.ts
# PASS: all tests pass.
```

- [ ] Start the MCP server (stdio transport) and perform a `tools/list` smoke call. The simplest path is `bun apps/qw-oracle/serve/mcp/src/index.ts < /dev/null > /tmp/mcp-tools-list.json` with a one-shot stdin script that sends the `tools/list` JSON-RPC envelope; if the operator already has a `make mcp` or `bun mcp:smoke` recipe, use that. Confirm the response contains 22 tool names.

- [ ] Smoke call `lookup_player({slug: 'Milton'})` against the production DB (assuming Phase 2 has loaded Milton). Confirm the response shape contains `clan_eras` and `tournament_results` arrays; the title is `Milton`; `nationality_iso` is `fi`.

- [ ] Smoke call `lookup_by_nick({nick: 'ParadokS'})` against the production DB. Confirm match_quality='strong' and the first hit is kind='player' with title='ParadokS'.

- [ ] Smoke call `get_player_note({slug: 'Milton'})` against the production DB. Confirm body is non-empty and frontmatter includes `slug: Milton`.

**Verification:**
```
bunx tsc --noEmit
# PASS in apps/qw-oracle/.

bun test apps/qw-oracle/serve/mcp/src/tools/community.test.ts
# PASS.

# tools/list count:
grep -c "^    name: '" apps/qw-oracle/serve/mcp/src/index.ts
# PASS: 22.
```

**Execution mode:** inline -- pure verification, no synthesis. The executor runs commands and reports pass/fail.

---

## Verification (phase boundary)

The operator runs these at sign-off. Each ends with PASS or FAIL conditions.

**V1. TypeScript clean.**
```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS condition: clean exit, no errors.
FAIL condition: any type error in `serve/mcp/src/`.

**V2. Integration tests green.**
```
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test apps/qw-oracle/serve/mcp/src/tools/community.test.ts
```
PASS condition: all tests in the file pass.
FAIL condition: any failing test, OR the test suite is skipped (DATABASE_URL not set or pointing wrong).

**V3. TOOL_LIST count.**
```
grep -c "^    name: '" apps/qw-oracle/serve/mcp/src/index.ts
```
PASS condition: 22 (12 pre-existing + 10 new).
FAIL condition: any other count.

**V4. Switch case count.**
```
grep -c "^      case '" apps/qw-oracle/serve/mcp/src/index.ts
```
PASS condition: 22.

**V5. Tool import count.**
```
grep -c "^import.*from './tools/" apps/qw-oracle/serve/mcp/src/index.ts
```
PASS condition: 25 (15 pre-existing -- 12 function imports + 3 type imports -- plus 10 new function imports; Phase 6 does not add type imports from tools/ because all new types live in types.ts).

**V6. Production smoke -- lookup_player.** Operator runs against the running MCP server (stdio or HTTP), or against psql directly to confirm row composition:
```
PGPASSWORD=dev psql -h localhost -U qworacle -d qw_oracle -c "
  SELECT p.slug, p.title, p.nationality_iso,
         (SELECT count(*) FROM community.player_clan_eras e WHERE e.player_slug = p.slug)
           AS era_count,
         (SELECT count(*) FROM community.tournament_results t WHERE t.player_slug = p.slug)
           AS result_count
  FROM community.players p
  WHERE p.slug = 'Milton'
"
```
PASS condition: one row, `nationality_iso='fi'`, era_count > 0, result_count > 0.
FAIL condition: zero rows, or counts are zero (Phase 5 backfill incomplete -- not a Phase 6 bug, but blocks V8 below).

**V7. Production smoke -- lookup_by_nick.**
```
PGPASSWORD=dev psql -h localhost -U qworacle -d qw_oracle -c "
  SELECT 'player' AS kind, slug, title FROM community.players WHERE title ILIKE 'ParadokS'
  UNION ALL
  SELECT 'clan' AS kind, slug, title FROM community.clans WHERE title ILIKE 'ParadokS'
"
```
PASS condition: at least one row (player kind, title='ParadokS').
FAIL condition: zero rows (Phase 2 did not load ParadokS -- not a Phase 6 bug).

**V8. Filesystem smoke -- get_player_note.**
```
test -f apps/qw-oracle/curated/player-notes/Milton.md && echo present || echo missing
head -20 apps/qw-oracle/curated/player-notes/Milton.md
```
PASS condition: `present` and the head shows YAML frontmatter (`---\nslug: Milton\n...`).
FAIL condition: `missing` (Phase 2 did not emit the note for Milton -- not a Phase 6 bug).

**V9. SCHEMA.md unaffected.**
```
git diff HEAD apps/qw-oracle/SCHEMA.md
```
PASS condition: empty output (Phase 6 does not alter SCHEMA.md per "Files touched").
FAIL condition: any diff.

**V10. No new migration files.**
```
ls apps/qw-oracle/db/migrations/ | grep -E '^010_' || echo "no migration 010"
```
PASS condition: `no migration 010` (Phase 6 does not introduce a migration).
FAIL condition: any 010_* file present (scope creep).

If V1-V5 PASS, the phase has shipped. V6-V8 are checks against the production DB and filesystem -- they assume Phases 2/3/5 have loaded data; they FAIL only when prior phases are incomplete, not when Phase 6 itself misbehaves. V9-V10 are guardrails against scope creep.

## Outputs to next phase

- Ten new MCP tools are registered and operational on the running server.
- `apps/qw-oracle/serve/mcp/src/community-note-reader.ts` exists and is a stable reusable helper for any future filesystem-backed note retrieval.
- `apps/qw-oracle/serve/mcp/src/types.ts` exposes nine new exported types (`PlayerRecord`, `PlayerClanEra`, `PlayerTournamentResult`, `ClanRecord`, `ClanMember`, `TournamentRecord`, `TournamentResultEntry`, `NickHit`, `CommunityNoteRecord`).
- `apps/qw-oracle/serve/mcp/src/orientation.ts` documents the Layer 4 community-reference surface; consumer LLMs receive the orientation block at MCP initialize.
- `bunx tsc --noEmit` is clean from `apps/qw-oracle/`.
- `bun test apps/qw-oracle/serve/mcp/src/tools/community.test.ts` passes.
- Phase 7 (L2 primer build) can begin. The primer-build script reads `community.players` directly via Postgres for the substantive-player nick-recognition list and may also call `lookup_by_nick` programmatically for spot-checks; both paths are operational at the end of Phase 6.

## Open questions / deferred items

**Q1. Note retrieval -- filesystem read vs DB ingestion.**
- **Question:** Phase 2/3/4 emit player/clan/tournament notes as filesystem files at `apps/qw-oracle/curated/<type>-notes/<slug>.md`. Phase 6's `get_*_note` tools could read from the filesystem directly (this phase's choice) OR ingest the notes into a new `community.notes` Postgres table (mirroring how concept-notes are loaded into `concepts` + `concept_chunks` for hybrid retrieval).
- **Default chosen for now:** filesystem read via gray-matter. Rationale: (a) the corpus is bounded (~3k-4k notes; few MB total markdown); (b) Phase 1 did not ship a community.notes table so DB ingestion would require a Phase 6 migration, expanding scope; (c) v1 has no need for hybrid retrieval over note bodies (search_players/search_clans/search_tournaments are slug+title oriented, not body-oriented); (d) filesystem reads are cheap and the latency is well within MCP-tool budgets.
- **Who can resolve:** operator. If a future arc adds hybrid retrieval over note bodies (i.e., "search across all player narrative content for the phrase 'Mouse acceleration'"), a new arc adds the loader pipeline + tsvector + chunking + a search_community_notes tool. Phase 6's filesystem reads remain operational alongside.

**Q2. Search retrieval shape -- ILIKE only vs tsvector / pgvector.**
- **Question:** Phase 6's `search_*` tools use ILIKE substring matching on a small set of textual columns. They do NOT use tsvector full-text search or pgvector semantic retrieval (both of which are used by `search_entities` and `search_concepts` for L1 / L3).
- **Default chosen for now:** ILIKE only. Rationale: (a) corpus sizes are small (5,903 players, 822 clans, ~700 tournaments) -- ILIKE on a name column is fast even without a trigram index; (b) the recognition-signal use case (the L2 primer) wants exact + substring matches, not semantic retrieval; (c) Phase 1 did not ship tsvector columns or embedding columns on community.* tables so any vector path would require new migrations + an embedding pipeline -- out of Phase 6 scope.
- **Who can resolve:** operator. If queries on the full corpus prove slow OR if consumers report that vague queries miss semantic equivalents (e.g. "Finnish dueler" should find Milton even though "Finnish" + "dueler" are not in any text column), a follow-up arc adds: (a) a `pg_trgm` GIN index on `(title, display_name, real_name)` for substring acceleration, AND/OR (b) a `name_tsv` column + `description_embedding` column + an embed-build pipeline + RRF fusion in the search tools.

**Q3. Wikitext-to-markdown conversion fidelity (carry-forward from Phase 2 Q5).**
- **Question:** Phase 2/3/4 emit note bodies with raw wikitext for non-YouTube templates (`{{box|start}}`, `{{Flag/fi}}`, `{{PrizepoolWZ|...}}`, `{{Mouse settings table|...}}`). Phase 6 could enrich these at retrieval time -- e.g., render `{{Flag/fi}}` as `:flag-fi:` or "Finland".
- **Default chosen for now:** raw passthrough. Phase 6 returns the body as-is; no conversion. Rationale: (a) D1 says markdown notes overlay rows; conversion is a presentational concern; (b) consumer LLMs handle raw wikitext fluently for the small corpus of templates that appear; (c) any conversion logic is rendering-time, not retrieval-time.
- **Who can resolve:** operator. If MCP consumers report rendering issues, a follow-up arc adds a `wikitextToReadableMarkdown` helper in `community-note-reader.ts` and a flag on `get_*_note` tools (`{ format: 'raw' | 'rendered' }`).

**Q4. Note-frontmatter drift detection.**
- **Question:** D18 says "mismatch detection (Phase 6 MCP retrieval) can flag drift between row and frontmatter." Phase 6 could compare the row's stable fields against the note's frontmatter and emit a warning when they diverge.
- **Default chosen for now:** no drift detection in v1. The `get_*_note` tools return both the row_summary AND the frontmatter; the consumer (or a separate audit tool) can compare them. Rationale: drift detection at retrieval time gates a fast path on a non-load-bearing concern; if Phase 2/3/4's emit-note pipeline is correct, frontmatter mirrors the row by construction.
- **Who can resolve:** operator. If post-load audits surface drift, a follow-up arc adds a `community-notes-audit.ts` script that walks every note and compares frontmatter to its row, logging mismatches.

**Q5. Migration 009 column reconciliation against Task 1's TournamentRecord.**
- **Question:** Phase 4's migration 009 ships an operator-approved column list post-pilot. Task 1's `TournamentRecord` interface enumerates the columns based on Phase 4's placeholder skeleton. Real divergences may exist between the two when Phase 6 actually executes.
- **Default chosen for now:** Task 5 pre-flight reconciliation step. The Task 5 executor reads `apps/qw-oracle/db/migrations/009_tournament_columns.sql` and diffs against `TournamentRecord`; any divergence is reconciled in the type interface (preferred) or the SELECT projection.
- **Who can resolve:** Task 5 executor handles in-task; if a divergence is large enough to require operator input (e.g., a column was renamed), the executor halts and reports.

**Q6. Multi-disambiguator clusters surface in lookup_by_nick (carry-forward from Phase 2 Q4).**
- **Question:** Three articles share `display_name='Acid'` (Acid (Finnish Player) / Acid (Polish Player) / Acid (Swedish Player)). `lookup_by_nick({nick: 'Acid'})` returns all three. Phase 2 Q4 marked this as Phase 6 drafter's call.
- **Default chosen for now:** all matches surface as separate rows. The consumer LLM picks based on disambiguator. F7 (case-variant pairs intentionally distinct) sets the precedent; D11 ("returns all entities matching the nick") confirms intent.
- **Who can resolve:** n/a -- behaviour is intentional.

## Recovery (if verification fails)

**V1 (TypeScript) fails:** the most common cause is a relative import path mismatch between the new tool files and the existing helpers (`db.ts`, `version.ts`). Run `bunx tsc --noEmit 2>&1 | head -20` to identify the offending file. The standard import paths from `serve/mcp/src/tools/` are: `'../db.ts'`, `'../types.ts'`, `'../version.ts'`, `'../community-note-reader.ts'`. The shared `db.ts` re-exports from `'../../../shared/db.ts'`, so tool files do NOT need to navigate to `shared/` directly.

**V2 (integration tests) fails:**
- If individual test cases fail: open the failing test, inspect the assertion, compare against the seeded row shape. Most failures will be off-by-one ordering issues (e.g., a CASE WHEN clause sorted a column the test didn't expect). Adjust the SQL, re-run.
- If the entire suite skips: confirm `DATABASE_URL` is set to a string containing `qw_oracle_test`. The skip condition is in the `describe.skipIf(!HAS_DB)(...)` guard.
- If the suite errors at `beforeAll` with FK constraint violations: the seed order is wrong. Players + clans + tournaments must seed BEFORE player_clan_eras + tournament_results. The TRUNCATE order is the inverse.

**V3-V5 (count probes) fail:** the most likely cause is a typo in a tool import or a missing case statement. Re-grep `apps/qw-oracle/serve/mcp/src/index.ts` for the offending pattern and fix.

**V6 (lookup_player smoke) fails -- player has no eras / results:** Phase 5 backfill has not been run for this slug, OR the player's wiki article had no clan_history / no achievements. Verify with:
```
PGPASSWORD=dev psql -h localhost -U qworacle -d qw_oracle -c "
  SELECT count(*) FROM community.player_clan_eras WHERE player_slug = 'Milton';
  SELECT count(*) FROM community.tournament_results WHERE player_slug = 'Milton';
"
```
If counts are zero for a player who SHOULD have eras (Milton, ParadokS), Phase 5 needs re-running. This is not a Phase 6 fix.

**V7 (lookup_by_nick smoke) fails -- nick not found:** Phase 2 did not load the player; Phase 6 has nothing to surface. Not a Phase 6 fix.

**V8 (filesystem smoke) fails -- note missing:** Phase 2 did not emit the note for Milton, OR `has_note=false` on Milton's row. Not a Phase 6 fix; report to operator who decides whether to re-tune Phase 2's has_note rule and re-emit.

**V9-V10 (scope guardrails) fail:** the executor accidentally edited SCHEMA.md or shipped a migration. Revert and re-run.

**General fallback:** all Phase 6 work is additive. Reverting is a clean `git checkout HEAD -- apps/qw-oracle/serve/mcp/` (or whichever subset). The DB is untouched (no migrations in this phase).

---

## Verification sub-agent dispatch

After drafting this phase MD, the drafter dispatches the following sub-agent. Brief reproduced inline; absolute paths filled in for the files this phase touches.

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-6-mcp-tools.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
Read the design spec section relevant to this phase: /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md (sections "Phase decomposition Phase 6 row" + "Storage / curated layer reframe" + "Schema -> community.players / clans / tournaments / player_clan_eras / tournament_results").

Then verify, file-by-file:

1. Every file path mentioned in "Files touched":
   - For Modified: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL.

2. The phase introduces NO migrations. Verify there are no CREATE TABLE / ALTER TABLE / CREATE INDEX statements in the phase MD.

3. Every reference to a wiki snapshot artifact:
   - Verify the path under `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` exists.

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm output discipline (D13): no emoji, ASCII-only, no em-dashes / en-dashes.

5. Every reference to existing code (apps/qw-oracle/serve/mcp/src/, apps/qw-oracle/shared/):
   - Verify the path exists.
   - Verify the symbol or function name matches (e.g. `dispatchAndLog`, `SERVER_VERSION`, `db`, `readCommunityNote`).
   - Verify the import paths in the inlined TypeScript snippets are correct (relative to the file's own directory).

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode (don't claim "isolated context" for an inline task; don't claim "purely textual" for a code-synthesis task).
   - Flag tasks that are coded as `inline` but involve code synthesis (parser, multi-file integration, schema migration writing, test authoring) -- those should be subagent.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm the finding exists.
   - Confirm this phase actually addresses the findings it claims to (F7, F11 referenced in this phase).

8. Every column / table / SQL fragment introduced that isn't in `decisions.md` and isn't already in `apps/qw-oracle/SCHEMA.md` or in the prior phase MDs (Phase 1 + Phase 4 migrations):
   - Flag as potential drift. The phase consumes columns from migrations 008 (Phase 1) and 009 (Phase 4); flag any column reference Phase 6 makes that does not exist in either.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing voice. Flag any.

11. The phase should NOT introduce any LLM-shaped task. D4 forbids LLM-per-page in the player/clan flow, and Phase 6 is purely retrieval. Flag any `subagent (Opus MAX)` or LLM-shaped synthesis claim.

12. The phase ships ten MCP tools per D11. Confirm the list of tool names matches D11 verbatim:
    - search_players, lookup_player, get_player_note
    - search_clans, lookup_clan, get_clan_note
    - search_tournaments, lookup_tournament, get_tournament_note
    - lookup_by_nick

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section.
