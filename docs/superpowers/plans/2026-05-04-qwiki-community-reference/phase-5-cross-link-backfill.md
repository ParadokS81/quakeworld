# Phase 5 -- Cross-link backfill

> **Drafter checklist:**
> 1. Read `decisions.md` (full). D1 / D4 / D8 / D10 / D13 / D14 / D15 / D16 / D17 / D19 directly
>    govern this phase. D8 is not directly exercised here (active_year_start was computed in Phase
>    2); restated as awareness. D19: cross-link tables have no JSONB columns; restated defensively.
> 2. Read `review-findings.md`. F8 (tournament_slug soft reference) and F9 (player_clan_eras
>    surrogate PK + nullable start_year + era_seq) are load-bearing for this phase. F10 (Infobox
>    4on4team CHECK enum widened) and F11 (clan count 822) are background awareness.
> 3. Read spec Phase 5 row in phase-decomposition table; cross-link tables in Schema section.
> 4. Read snapshot artifact: `apps/qw-oracle/data/wiki-snapshots/2026-05-04/redirects.json`.
>    LIVE RECON FINDING: redirects.json is `[]` (empty array). The Phase 0 redirect-refetch fixed
>    the arprop bug but the wiki contains genuinely few redirects registered via allredirects; the
>    file is authoritative and empty. Phase 5's title matcher CANNOT rely on redirects.json for
>    alias expansion. See nuance note in "Title matching strategy" below and Open Question Q1.
> 5. Read phase-1-curated-rename.md Task 3 SQL (migration 008) for cross-link table schema.
> 6. Read phase-2-players.md Task 2 (shared/wiki-types.ts: ClanHistoryEntry, Achievement types).
>    Phase 5 imports from `scripts/load-community/players/parse.ts` and
>    `scripts/load-community/shared/wiki-types.ts`.
> 7. Read phase-3-clans.md Task 7 (getClanTitleToSlugMap export from clans/index.ts).
> 8. Read phase-4-tournaments.md Task 3 (migration 009 skeleton: series, year, mode, slug columns
>    are the matchable surface for fuzzy matching).
> 9. After drafting, dispatch the verification sub-agent (Explore, Sonnet medium) per
>    `phase-template.md` -- brief inlined at the bottom of this file.

---

## Goal

Phase 5 populates the two cross-link tables that join player identity to community history. It
re-parses each player article from the snapshot (reusing Phase 2's parser) to extract the
`ClanHistoryEntry[]` and `Achievement[]` arrays, then writes:

(a) `community.player_clan_eras` -- one row per (player, clan, era) with `clan_slug` looked up
    via Phase 3's `getClanTitleToSlugMap()`, `era_seq` set from list-position index, and `source`
    set to `'wiki_TH'` or `'wiki_bullet'` per the entry's origin.

(b) `community.tournament_results` -- one row per (player, tournament, year, place, mode) with
    `tournament_slug` resolved via a four-pass title matcher against `community.tournaments`
    (exact slug -> alias lookup -> year+mode+series fuzzy match -> NULL). `source` set to
    `'wiki_achievement'`.

Phase 5 ships under `scripts/load-community/cross-link/` -- a new sibling to the per-type
directories. No schema migration is needed: both tables exist from Phase 1's migration 008 and the
tournament columns (year, mode, series) are in place from Phase 4's migration 009. At phase
boundary: both cross-link tables are populated; sample queries for clan affiliation ("What clans
was ParadokS in?") and tournament history ("Who won EQL Season 12?") return expected rows.

---

## Inputs from previous phase

- Phase 0 complete: snapshot finalized at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`.
  `redirects.json` is present (empty array; see live-recon finding in drafter checklist above).
- Phase 1 complete: migration 008 applied; `community.player_clan_eras` and
  `community.tournament_results` both exist with the exact schema from migration 008 (surrogate
  id, nullable start_year, era_seq, source CHECK, soft tournament_slug, etc.).
- Phase 2 complete: `community.players` is populated (~5,903 rows). The player parser lives at
  `apps/qw-oracle/scripts/load-community/players/parse.ts`. `parsePlayer()` returns a
  `ParsedPlayer` object containing `clan_history: ClanHistoryEntry[]` and
  `achievements: Achievement[]`. Types are defined in
  `apps/qw-oracle/scripts/load-community/shared/wiki-types.ts`.
- Phase 3 complete: `community.clans` is populated (822 rows). `getClanTitleToSlugMap()` is
  exported from `apps/qw-oracle/scripts/load-community/clans/index.ts` and queries the DB for
  `{title -> slug}` lookup.
- Phase 4 complete: `community.tournaments` is populated (~627 expected rows). Migration 009 added
  columns: `series TEXT`, `year INT`, `mode TEXT`, `slug TEXT PRIMARY KEY` (the primary key carries
  the slug; the matchable surface for Phase 5 is `series + year + mode + title`).
- `bunx tsc --noEmit` is clean on the post-Phase-4 codebase.
- `DATABASE_URL` is set (operator-side). Bun is installed and on PATH.

---

## Files touched

### Created

```
apps/qw-oracle/scripts/load-community/cross-link/                         # new sibling subdir for Phase 5
apps/qw-oracle/scripts/load-community/cross-link/title-match.ts           # tournament title matcher (four-pass)
apps/qw-oracle/scripts/load-community/cross-link/title-match.test.ts      # bun test
apps/qw-oracle/scripts/load-community/cross-link/eras.ts                  # player_clan_eras backfill
apps/qw-oracle/scripts/load-community/cross-link/eras.test.ts             # bun test
apps/qw-oracle/scripts/load-community/cross-link/results.ts               # tournament_results backfill
apps/qw-oracle/scripts/load-community/cross-link/results.test.ts          # bun test
apps/qw-oracle/scripts/load-community/cross-link/index.ts                 # CLI dispatcher (reads players, re-parses snapshots, calls eras + results)
```

### Modified

```
apps/qw-oracle/scripts/load-community/CLAUDE.md    # add cross-link/ entry to Layout section
apps/qw-oracle/SCHEMA.md                           # add row-count footnotes on player_clan_eras and tournament_results
```

### Deleted

n/a -- no existing files deleted in this phase.

---

## Tasks

> **Subagent pre-read:** before synthesizing any task in this phase, read the nuance notes below.
> These decisions are load-bearing for every code-synthesis task.
>
> Skip to Task 1 if you are the operator checking off steps.

### Phase 5 design nuances (read before any task synthesis)

### Re-parse vs re-use parsed output

Phase 5 re-parses each player article from the snapshot (option A) rather than caching parsed
output from Phase 2's run. Rationale: 5,903 articles * ~2 ms parse each = ~12 seconds; acceptable
for a one-shot loader. Re-parsing is canonical -- it avoids a cache-invalidation problem and keeps
the pipeline stateless. The Phase 2 player parser is imported directly; Phase 5 has no separate
parse logic for the fields it consumes.

### Title matching strategy

Phase 5's tournament title matcher uses four passes:

1. **Exact slug match** -- `slugify(achievement.event_title)` against `community.tournaments.slug`.
   Slugify rule: lowercase, spaces to underscores, strip punctuation except hyphens/underscores.
   If matched, write `tournament_slug = <slug>`.

2. **Alias lookup** -- `redirects.json` was the intended source for alias expansion (e.g.,
   "QHLAN17" -> "QHLAN 2017"). LIVE RECON FINDING: `redirects.json` is empty (`[]`). This pass
   is therefore a no-op in the current snapshot. The alias-lookup pass is nonetheless coded in
   `title-match.ts` (accepting a `redirects: Record<string, string>` parameter) so it activates
   if the redirect map is populated in a future re-scrape. For the 2026-05-04 snapshot the map
   is empty and this pass always misses.

3. **Fuzzy year + mode + series match** -- query `community.tournaments` for rows where:
   - `year = achievement.year` (exact)
   - `mode ILIKE achievement_mode_normalized` OR mode IS NULL
   - `lower(series) = lower(series_token_from_title)` OR `lower(title) = lower(achievement.event_title)`

   The series token is extracted from `achievement.event_title` by stripping trailing season/cup
   suffixes (e.g., "EQL Season 12" -> series token "EQL"; "Duelmania 3" -> "Duelmania";
   "QHLAN 8" -> "QHLAN"). The matching is intentionally loose on mode: if the achievement row
   has `mode=null`, the mode filter is skipped. If multiple rows match (e.g., a tournament with
   both 1on1 and 4on4 brackets as separate rows), write a result row for each match.

4. **Unmatched fallback** -- write `tournament_slug = NULL`, preserve `tournament_title` verbatim.
   Track the count; report at end of run for operator review.

### Idempotency

Phase 5's index.ts truncates both cross-link tables and rebuilds from scratch per re-run:
```sql
TRUNCATE community.player_clan_eras RESTART IDENTITY;
TRUNCATE community.tournament_results RESTART IDENTITY;
```
The `UNIQUE (player_slug, clan_title, start_year, source)` constraint on `player_clan_eras` is
defense-in-depth but the truncate is the primary correctness gate. `tournament_results` has no
UNIQUE constraint (same player can appear at same tournament in two modes -- see F9 trade-off
section in review-findings.md); truncate-and-rebuild is its only idempotency mechanism.

### Multi-mode achievement rows

A player can place at the same tournament in two modes (1on1 + 4on4 at QHLAN, etc.).
`tournament_results` has a surrogate BIGSERIAL PK with no UNIQUE on the natural composite.
Both rows insert correctly; this is the intended behavior per the Phase 1 Q5 design note.

### source CHECK values

Migration 008's CHECK constraint on `community.player_clan_eras.source` accepts:
`('wiki_TH', 'wiki_bullet', 'tournament-archive', 'manual')`.

Migration 008's CHECK constraint on `community.tournament_results.source` accepts:
`('wiki_achievement', 'wiki_TH', 'tournament-archive', 'manual')`.

Phase 5 only writes `'wiki_TH'`, `'wiki_bullet'` (era table) and `'wiki_achievement'`
(results table). The `'tournament-archive'` and `'manual'` values are reserved for future arcs.

### D4 compliance

No LLM call in Phase 5. Every match is deterministic: slug comparison, string normalization,
year/mode join. The fuzzy match is a SQL query with string predicates, not an embedding or
LLM-driven step.

---

### Task 1 -- Create scripts/load-community/cross-link/ scaffold + CLAUDE.md note

**Goal:** Establish the cross-link/ directory and update the load-community/CLAUDE.md Layout
section to document it.

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/` (directory; empty until Tasks 2-6)
- `apps/qw-oracle/scripts/load-community/CLAUDE.md` (modified)

**Steps:**

- [ ] From repo root, create the directory:
  ```
  mkdir -p apps/qw-oracle/scripts/load-community/cross-link
  ```

- [ ] Update `apps/qw-oracle/scripts/load-community/CLAUDE.md`:
  - In the `## Layout` section, add after the `tournaments/` line:
    ```
    - `cross-link/` -- Phase 5 cross-link backfill (player_clan_eras + tournament_results).
      Re-parses snapshot articles, resolves clan titles to slugs via getClanTitleToSlugMap,
      resolves tournament titles to slugs via title-match.ts four-pass matcher.
    ```
  - In the `## Always-on rules` section, add a note:
    ```
    - **Truncate-and-rebuild on cross-link tables.** `cross-link/index.ts` truncates
      `community.player_clan_eras` and `community.tournament_results` before each run.
      Do not add incremental upsert logic without revisiting the year-absent UNIQUE
      semantics (see review-findings.md F9 trade-off note).
    ```

**Verification:**
```
ls apps/qw-oracle/scripts/load-community/
# PASS: lists CLAUDE.md, players/, clans/, tournaments/, shared/, cross-link/

grep "cross-link" apps/qw-oracle/scripts/load-community/CLAUDE.md
# PASS: at least 1 line printed
```

**Execution mode:** inline -- directory creation + targeted text insert into CLAUDE.md; no code
synthesis.

---

### Task 2 -- Build cross-link/title-match.ts (tournament title matcher)

**Goal:** Land the reusable title-matcher module. The module is a pure function (no IO, no DB)
that takes a `TournamentIndex` (pre-built from `community.tournaments`) and returns a match
function. The four-pass logic lives here; `results.ts` (Task 4) imports and calls it.

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/title-match.ts` (created)

**Steps:**

- [ ] Author `title-match.ts`:

  **Exported shapes:**
  ```ts
  // A row from community.tournaments reduced to the fields needed for matching.
  export interface TournamentRow {
    slug:   string;
    title:  string;
    series: string | null;  // from migration 009 column
    year:   number | null;  // from migration 009 column
    mode:   string | null;  // from migration 009 column
  }

  // Pre-built index for O(1) slug lookup and O(N) fuzzy scan.
  export interface TournamentIndex {
    bySlug:      Map<string, TournamentRow>;    // slug -> row
    byAlias:     Map<string, TournamentRow>;    // alias (from redirect map) -> row
    all:         TournamentRow[];               // full list for fuzzy scan
  }

  export interface MatchResult {
    tournament_slug: string | null;
    match_pass:      1 | 2 | 3 | null;   // which pass resolved; null when unmatched
  }
  ```

  **Exported functions:**

  ```ts
  // Build a TournamentIndex from DB rows.
  // redirects: Record<title, target_title> from redirects.json.
  //   For the 2026-05-04 snapshot this map is empty ({}); the parameter
  //   is retained so the function activates automatically if a future re-scrape
  //   populates redirects.json. Pass {} when loading from the current snapshot.
  export function buildTournamentIndex(
    rows: TournamentRow[],
    redirects: Record<string, string>
  ): TournamentIndex

  // Match a single achievement event title + year + mode against the index.
  // Returns MatchResult: tournament_slug is null when no pass resolves the title.
  export function matchTournamentTitle(
    index: TournamentIndex,
    eventTitle: string,
    year:       number | null,
    mode:       string | null
  ): MatchResult
  ```

  **Implementation notes for the subagent:**

  - `slugify(title: string): string` -- local helper (not exported). Lowercase; replace spaces and
    punctuation with underscores; strip leading/trailing underscores; collapse multiple underscores.
    Must produce the same slug the Phase 4 loader used when inserting tournament rows.

  - **Pass 1 (exact slug):** `slugify(eventTitle)` -> look up in `index.bySlug`. If found,
    return `{ tournament_slug: row.slug, match_pass: 1 }`.

  - **Pass 2 (alias lookup):** look up `eventTitle` (lowercase) in `index.byAlias`. `byAlias`
    is populated from the `redirects` map in `buildTournamentIndex`: for each
    `(fromTitle, toTitle)` pair, if `toTitle` resolves to a row in `bySlug`, add
    `byAlias.set(fromTitle.toLowerCase(), that_row)`. For the current snapshot this map is empty
    (redirects.json = `[]`) so pass 2 never resolves. The pass is coded for future-proofing.
    If found, return `{ tournament_slug: row.slug, match_pass: 2 }`.

  - **Pass 3 (fuzzy year + mode + series):**
    1. Extract series token from `eventTitle`: strip trailing ` Season N`, ` S\d+`, ` Cup N`,
       ` \d+` suffixes (case-insensitive). The remainder is the series name.
       Example: "EQL Season 12" -> series="EQL"; "Duelmania 3" -> series="Duelmania";
       "QHLAN 8" -> series="QHLAN"; "Thunderdome Season 5" -> series="Thunderdome".
    2. Normalize `mode` input: `'1on1'|'duel'|'1v1'` -> `'1on1'`; `'4on4'|'4v4'` -> `'4on4'`;
       `'ctf'|'CTF'` -> `'CTF'`; others pass through lowercase. `null` input means any mode.
    3. Scan `index.all` for rows where:
       - `row.year === year` (exact; skip filter if year is null -- achievement without year
         cannot use year as a signal; still attempt series match)
       - mode filter: skip if either input mode or row.mode is null; otherwise
         `normalizeMode(row.mode) === normalizeMode(mode)`
       - series/title filter: `row.series?.toLowerCase() === seriesToken.toLowerCase()`
         OR `row.title.toLowerCase() === eventTitle.toLowerCase()`
    4. If exactly one row matches all applicable filters -> return
       `{ tournament_slug: row.slug, match_pass: 3 }`.
       If zero or multiple rows match -> fall through to pass 4.

  - **Pass 4 (unmatched):** return `{ tournament_slug: null, match_pass: null }`.

  - The `matchTournamentTitle` function is pure and synchronous (the index is pre-built by the
    caller; no DB access inside the match loop).

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/cross-link/title-match.test.ts
# PASS: all tests pass (see Task 3 for test coverage)
```

**Execution mode:** subagent (Sonnet medium) -- the four-pass matching logic and the slugify +
series-token extractor require judgment on edge cases and series-name normalization. Isolated
context preferred; the module is self-contained (pure, no IO).

---

### Task 3 -- Build cross-link/title-match.test.ts

**Goal:** Test the title matcher against matched and unmatched fixture cases.

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/title-match.test.ts` (created)

**Steps:**

- [ ] Author `title-match.test.ts`. The test file constructs a synthetic `TournamentIndex` in-process
  (no DB required for unit tests). Fixtures cover:

  **Fixture tournament rows (synthetic, based on Phase 4 skeleton column shapes):**
  ```ts
  const rows: TournamentRow[] = [
    { slug: 'EQL_Season_12', title: 'EQL Season 12',    series: 'EQL',        year: 2010, mode: '4on4' },
    { slug: 'EQL_Season_1',  title: 'EQL Season 1',     series: 'EQL',        year: 2000, mode: '4on4' },
    { slug: 'QHLAN_8',       title: 'QHLAN 8',          series: 'QHLAN',      year: 2005, mode: null   },
    { slug: 'Duelmania_3',   title: 'Duelmania 3',      series: 'Duelmania',  year: 2010, mode: '1on1' },
    { slug: 'Thunderdome_Season_5', title: 'Thunderdome Season 5', series: 'Thunderdome', year: 2009, mode: '4on4' },
    { slug: 'QuakeCon_2017', title: 'QuakeCon 2017',    series: 'QuakeCon',   year: 2017, mode: null   },
  ];
  const index = buildTournamentIndex(rows, {});  // empty redirects
  ```

  **Test cases:**

  - Pass 1 (exact slug): `matchTournamentTitle(index, 'EQL Season 12', 2010, '4on4')` returns
    `{ tournament_slug: 'EQL_Season_12', match_pass: 1 }`. (slugify produces 'EQL_Season_12'
    which is in bySlug.)

  - Pass 1 (case-insensitive slugify): `matchTournamentTitle(index, 'eql season 12', 2010, '4on4')`
    returns `{ tournament_slug: 'EQL_Season_12', match_pass: 1 }`. (slugify lowercases; slug in
    bySlug is lowercase-keyed or the exact match is case-insensitive -- subagent resolves.)

  - Pass 2 (alias via non-empty redirect map): build a second index with
    `redirects: { 'QHLAN17': 'QHLAN_8' }` (synthetic alias). `matchTournamentTitle(index2, 'QHLAN17', 2005, null)`
    returns `{ tournament_slug: 'QHLAN_8', match_pass: 2 }`.

  - Pass 3 (fuzzy year + series): `matchTournamentTitle(index, 'EQL Season 12', 2010, null)`.
    Pass 1 resolves this; write a variant with a title that does NOT slugify-match but does
    series-match: `matchTournamentTitle(index, 'EQL 12', 2010, '4on4')` should resolve via
    series "EQL" + year 2010 + mode 4on4 -> `{ tournament_slug: 'EQL_Season_12', match_pass: 3 }`.

  - Pass 3 (mode normalization): `matchTournamentTitle(index, 'Duelmania 3', 2010, '1v1')` should
    resolve to `'Duelmania_3'` (1v1 normalizes to 1on1 which matches row.mode).

  - Pass 3 (mode null in row, skip mode filter): `matchTournamentTitle(index, 'QHLAN 8', 2005, '1on1')`
    -> `QHLAN_8` found (row.mode is null; mode filter skipped; series "QHLAN" + year 2005 match).

  - Pass 4 (unmatched -- wrong year): `matchTournamentTitle(index, 'EQL Season 12', 1999, '4on4')`
    returns `{ tournament_slug: null, match_pass: null }` (year 1999 does not match any EQL row).

  - Pass 4 (unmatched -- unknown tournament): `matchTournamentTitle(index, 'FakeLeague 99', 2001, null)`
    returns `{ tournament_slug: null, match_pass: null }`.

  - Pass 4 (year null in achievement): `matchTournamentTitle(index, 'QHLAN 8', null, null)`.
    Year filter skipped; series "QHLAN" matches QHLAN_8; expect `match_pass: 3` returned.
    (Documents behavior for year-absent achievement rows.)

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/cross-link/title-match.test.ts
# PASS: all test cases pass
```

**Execution mode:** subagent (Sonnet medium) -- test cases are well-specified above; synthesis is
mechanical table-driven fixture construction plus assertion wiring.

---

### Task 4 -- Build cross-link/results.ts (tournament_results backfill)

**Goal:** Land the `populateTournamentResults(playerSlugs, snapshotDir, index)` function that
re-parses each player article, iterates `parsed.achievements`, calls `matchTournamentTitle`, and
INSERTs into `community.tournament_results`. Truncation of the table before INSERT is handled by
the CLI dispatcher (Task 6); this function receives an open transaction or calls the DB directly
per slug.

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/results.ts` (created)

**Steps:**

- [ ] Author `results.ts`.

  **Exported function:**
  ```ts
  // Backfill tournament_results from the player corpus.
  //
  // playerSlugs: the list of slugs to process (from community.players;
  //   callers can pass a subset for --limit / --slug flags).
  // snapshotDir: absolute path to the snapshot articles/ directory.
  // index: pre-built TournamentIndex from buildTournamentIndex().
  //
  // Returns { inserted, unmatched } counts.
  export async function populateTournamentResults(
    playerSlugs: string[],
    snapshotDir: string,
    index: TournamentIndex
  ): Promise<{ inserted: number; unmatched: number }>
  ```

  **Implementation notes for the subagent:**

  - Import `parsePlayer` from `../players/parse.ts`. The function signature is
    `parsePlayer(article: WikiArticle): ParsedPlayer`. The `ParsedPlayer` type has
    `achievements: Achievement[]`.
  - Import `Achievement` from `../shared/wiki-types.ts`.
    `Achievement` fields: `{ year, place, event_title, event_slug, mode, team, team_flag, additional, prize, source }`.
    `source` is `'wiki_achievement' | 'wiki_TH'`. Phase 5 writes the `source` value from the
    `Achievement` object directly (it already encodes origin per Phase 2 parser design).
  - For each player slug:
    1. Read `${snapshotDir}/${slug}.json`. If the file does not exist, skip and log a warning.
    2. Parse via `parsePlayer(article)`.
    3. For each achievement in `parsed.achievements`:
       - call `matchTournamentTitle(index, achievement.event_title, achievement.year, achievement.mode)`.
       - INSERT into `community.tournament_results`:
         ```sql
         INSERT INTO community.tournament_results
           (player_slug, tournament_slug, tournament_title, year, place, mode, team, team_flag, source)
         VALUES
           ($player_slug, $tournament_slug, $event_title, $year, $place, $mode, $team, $team_flag, $source)
         ```
         where `$tournament_slug` is `matchResult.tournament_slug` (null when unmatched),
         `$event_title` is `achievement.event_title` (preserved verbatim regardless of match).
       - Increment `unmatched` counter when `matchResult.tournament_slug` is null.
  - Batch INSERTs per player in a single `db.begin(...)` transaction (one transaction per player,
    not one per achievement row). This keeps failure isolation per-player and avoids holding a
    long transaction open.
  - Log progress every 500 players (e.g., `[cross-link:results] 500/5903...`).

  **D4 compliance:** no LLM call. Every match is a deterministic string comparison.

  **D13 compliance:** all log strings are ASCII-only. No emoji in log output.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/cross-link/results.test.ts
# PASS: all tests pass (see Task 5 for test coverage)
```

**Execution mode:** subagent (Sonnet MAX) -- the multi-axis matching logic (four-pass title
matcher, source assignment, null-slug preservation, per-player transaction batching) combined
with the cross-module imports (parsePlayer, WikiArticle, Achievement, TournamentIndex,
matchTournamentTitle) makes this judgment-dense. Sonnet MAX preferred for speed on a
multi-file synthesis task with non-obvious edge cases (year-null achievements, multi-mode
tournaments producing multiple rows, unmatched-rate tracking).

---

### Task 5 -- Build cross-link/results.test.ts

**Goal:** Test the tournament_results backfill against matched and unmatched fixture cases using
synthetic article JSON and a synthetic TournamentIndex (no live DB for unit tests).

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/results.test.ts` (created)

**Steps:**

- [ ] Author `results.test.ts`. Unit tests use synthetic `WikiArticle` JSON constructed in-process
  (not reading from the snapshot directory). The subagent uses `parsePlayer` on synthetic wikitext
  snippets that produce known `Achievement[]` arrays. The DB calls in `populateTournamentResults`
  are tested against `qw_oracle_test` (same guard as Phase 2/3/4 upsert tests:
  `process.env.PGDATABASE === 'qw_oracle_test'`; tests ROLLBACK after each case).

  **Fixture cases to cover:**

  - Milton achievement resolves: synthetic wikitext with one `{{Achievement|year=2010|place=1|event=EQL Season 12|mode=4on4|team=TVS}}`.
    Synthetic index has `EQL_Season_12` row with year=2010, mode=4on4. After
    `populateTournamentResults(['Milton'], ...)`:
    - `inserted = 1`, `unmatched = 0`.
    - `SELECT tournament_slug FROM community.tournament_results WHERE player_slug = 'Milton'`
      returns `'EQL_Season_12'`. Source = `'wiki_achievement'`.

  - ParadokS achievement unmatched: synthetic wikitext with one `{{Achievement|year=1999|place=1|event=OldLeague Cup 3|mode=4on4}}`.
    Synthetic index has no OldLeague row. After `populateTournamentResults(['ParadokS'], ...)`:
    - `inserted = 1`, `unmatched = 1`.
    - `SELECT tournament_slug, tournament_title FROM community.tournament_results WHERE player_slug = 'ParadokS'`
      returns `{ tournament_slug: null, tournament_title: 'OldLeague Cup 3' }`.

  - Multi-mode at same tournament: synthetic wikitext with two achievements for the same player at
    QHLAN (one 1on1, one 4on4), synthetic index has one `QHLAN_8` row with mode=null.
    After run: 2 rows inserted (both resolve to `QHLAN_8`). PASS condition: both rows have
    `tournament_slug = 'QHLAN_8'`; modes differ between rows.

  - Year-null achievement: synthetic wikitext with `{{Achievement|place=1|event=EQL Season 12}}` (no year).
    Year-null falls through pass 1 (slugify miss because EQL_Season_12 slug IS in bySlug -- subagent
    verifies: pass 1 uses slugify(eventTitle) not year, so year-null does NOT prevent pass 1 from
    matching when the title slug is exact). The year-null case is a pass-1 hit; document this.

**Verification:**
```
PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/cross-link/results.test.ts
# PASS: all assertions pass; transactions rolled back
```

**Execution mode:** subagent (Sonnet medium) -- well-specified fixture cases; test plumbing mirrors
Phase 2/3/4 upsert test patterns.

---

### Task 6 -- Build cross-link/eras.ts (player_clan_eras backfill)

**Goal:** Land the `populatePlayerClanEras(playerSlugs, snapshotDir, clanTitleToSlugMap)` function
that re-parses each player article, iterates `parsed.clan_history`, looks up clan slugs, assigns
`era_seq` from list-position index, and INSERTs into `community.player_clan_eras`.

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/eras.ts` (created)

**Steps:**

- [ ] Author `eras.ts`.

  **Exported function:**
  ```ts
  // Backfill player_clan_eras from the player corpus.
  //
  // playerSlugs: list of player slugs to process.
  // snapshotDir: absolute path to the snapshot articles/ directory.
  // clanMap: Map<clan_title, clan_slug> from getClanTitleToSlugMap().
  //
  // Returns { inserted } count.
  export async function populatePlayerClanEras(
    playerSlugs: string[],
    snapshotDir: string,
    clanMap: Map<string, string>
  ): Promise<{ inserted: number }>
  ```

  **Implementation notes for the subagent:**

  - Import `parsePlayer` from `../players/parse.ts`.
  - Import `ClanHistoryEntry` from `../shared/wiki-types.ts`.
    `ClanHistoryEntry` fields: `{ clan_title, clan_slug, start_year, end_year, flag_iso, source }`.
    `source` is `'wiki_TH' | 'wiki_bullet'`.
    `clan_slug` is null at parse time (Phase 2 parser sets it null; Phase 5 resolves it via clanMap).
    `start_year` is null for bullet-list entries (ParadokS-style flat Clan history section per F9).
  - For each player slug:
    1. Read `${snapshotDir}/${slug}.json`. If file absent, skip with warning.
    2. Parse via `parsePlayer(article)`.
    3. For each `entry` in `parsed.clan_history` with index `i` (0-based):
       - Resolve `clan_slug`: `clanMap.get(entry.clan_title) ?? null`. Log a warning if not found
         (clan title present in player article but no corresponding row in community.clans; this is
         expected for defunct or non-wiki clans).
       - `era_seq = i`.
       - INSERT into `community.player_clan_eras`:
         ```sql
         INSERT INTO community.player_clan_eras
           (player_slug, clan_slug, clan_title, start_year, end_year, era_seq, source)
         VALUES
           ($player_slug, $clan_slug, $clan_title, $start_year, $end_year, $era_seq, $source)
         ON CONFLICT (player_slug, clan_title, start_year, source) DO NOTHING
         ```
         The `ON CONFLICT DO NOTHING` is defense-in-depth against the truncate-and-rebuild
         pattern; the CLI dispatcher truncates before calling this function so conflicts are
         theoretically impossible. The clause costs nothing and prevents accidental double-insert
         if the CLI is called twice without a truncate.
    4. Batch INSERTs per player in a single `db.begin(...)` transaction.
    5. Log progress every 500 players.

  **era_seq semantics:** era_seq is list-position within the player's clan_history array (0-indexed).
  For wiki_TH rows this is the order they appear in the infobox History table (chronological in
  most articles). For wiki_bullet rows this is the order they appear in the Clan history section.
  The order is not re-sorted or normalized; the wiki source order is canonical.

  **start_year null (F9 regression gate):** bullet-list entries where `start_year` is null insert
  with `start_year = NULL`. The UNIQUE constraint `(player_slug, clan_title, start_year, source)` has
  Postgres NULL-distinct semantics -- two rows with the same (player_slug, clan_title, source) but
  `start_year = NULL` are NOT considered duplicates by the unique index. The truncate-and-rebuild
  strategy means this is harmless in practice (no re-insert on the same run), but future
  incremental-upsert refactors must revisit this (see review-findings.md F9 trade-off note).

  **D10 source values:** `entry.source` is `'wiki_TH'` or `'wiki_bullet'` per the `ClanHistoryEntry`
  type (set by the Phase 2 parser). Phase 5 passes it through directly; no remapping needed.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/cross-link/eras.test.ts
# PASS: all tests pass (see Task 7 for test coverage)
```

**Execution mode:** subagent (Sonnet medium) -- the implementation is structurally simpler than
results.ts (no title-matcher, no fuzzy-match logic). The key subtleties are the null start_year
handling and the era_seq indexing; Sonnet medium handles these from the spec above.

---

### Task 7 -- Build cross-link/eras.test.ts

**Goal:** Test the era backfill against three fixture cases: ParadokS (wiki_bullet, year-absent
rows), Milton (wiki_TH, year-present rows), and Crit (short TH list, verifies era_seq order).

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/eras.test.ts` (created)

**Steps:**

- [ ] Author `eras.test.ts`. Tests use `qw_oracle_test` DB with ROLLBACK guards.

  **Fixture cases:**

  - **ParadokS (wiki_bullet, year-absent):** synthetic wikitext with a `Clan history` section
    containing bullet-list entries for three clans (e.g., "[[Clan Armageddon]]", "[[Slackers]]",
    "[[Madhouse]]") with no year information. After `populatePlayerClanEras(['ParadokS'], ...)`:
    - 3 rows inserted with `source = 'wiki_bullet'`.
    - All three rows have `start_year = NULL`.
    - `era_seq` values are 0, 1, 2 (list order).
    - `clan_slug` is resolved for Slackers (if in clanMap) and null for others not in the map.
    - PASS condition: `SELECT count(*) FROM community.player_clan_eras WHERE player_slug='ParadokS' AND source='wiki_bullet'` returns 3.

  - **Milton (wiki_TH, year-present):** synthetic wikitext with a `{{TH}}` history block:
    ```
    | 2006 || [[TVS]] || Finnish
    | 2008 || [[Black Book]] || Finnish
    ```
    After `populatePlayerClanEras(['Milton'], ...)`:
    - 2 rows inserted with `source = 'wiki_TH'`.
    - Row 0: `clan_title='TVS'`, `start_year=2006`, `era_seq=0`.
    - Row 1: `clan_title='Black Book'`, `start_year=2008`, `era_seq=1`.
    - PASS condition: rows present and era_seq ordering correct.

  - **Crit (short TH, verifies FK against community.players):** synthetic wikitext with one TH row.
    The player_slug 'Crit' must exist in `community.players` (FK) for the INSERT to succeed. The
    test inserts a minimal players row first. PASS condition: 1 row in player_clan_eras for Crit.

  - **Clan slug resolution:** include a synthetic clanMap with `'Slackers' -> 'Slackers'` and
    `'TVS' -> 'TVS'`. Verify `clan_slug` is resolved for those titles and null for unknown titles
    (e.g., 'Clan Armageddon' not in map -> `clan_slug = NULL` but row still inserts).

  - **era_seq is index not year:** for a three-entry TH block with years 2006, 2008, 2010, verify
    era_seq = 0, 1, 2 regardless of year values (era_seq is list-position, not year).

**Verification:**
```
PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/cross-link/eras.test.ts
# PASS: all assertions pass; transactions rolled back
```

**Execution mode:** subagent (Sonnet medium) -- well-specified fixture cases covering the three
source-type + year-present / year-absent combinations that are the F9 regression gate.

---

### Task 8 -- Build cross-link/index.ts (CLI dispatcher)

**Goal:** Land the end-to-end CLI that: truncates both cross-link tables, loads playerSlugs from
`community.players`, builds the TournamentIndex (from `community.tournaments` + empty redirects.json),
builds the ClanMap (from `getClanTitleToSlugMap()`), calls `populatePlayerClanEras` + `populateTournamentResults`,
and reports counts.

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/index.ts` (created)

**Steps:**

- [ ] Author `index.ts`:

  **CLI flags:** `--dry-run` (parse + match only; no DB writes), `--limit N` (cap player count),
  `--slug <slug>` (single player re-run; does NOT truncate -- single-player re-run inserts
  on top of existing rows, relying on the UNIQUE DO NOTHING guard for eras; the operator must
  manually truncate before a full re-run if using --slug for spot-repair). `--snapshot <date>`
  (defaults to `2026-05-04`).

  **Imports (subagent note):**
  ```ts
  import { getClanTitleToSlugMap } from '../clans/index.ts';
  import { buildTournamentIndex }   from './title-match.ts';
  import { populatePlayerClanEras } from './eras.ts';
  import { populateTournamentResults } from './results.ts';
  import { db }                     from '../../../shared/db.ts';
  ```

  **Flow:**
  ```
  1. Read redirects.json from snapshotDir (parse JSON; for 2026-05-04 this is []).
     Convert to Record<string, string> (fromTitle -> toTitle).
     Log: "[cross-link] redirects loaded: N entries" (expect 0 for current snapshot).

  2. Call getClanTitleToSlugMap() -> clanMap (Map<string, string>).
     Log: "[cross-link] clan map loaded: N entries".

  3. Load tournament rows from community.tournaments:
       SELECT slug, title, series, year, mode FROM community.tournaments
     Build TournamentIndex via buildTournamentIndex(rows, redirects).
     Log: "[cross-link] tournament index built: N rows".

  4. Load playerSlugs from community.players:
       SELECT slug FROM community.players ORDER BY slug
     Apply --limit and --slug filters.
     Log: "[cross-link] processing N players".

  5. Unless --dry-run or --slug (single-player mode):
       TRUNCATE community.player_clan_eras RESTART IDENTITY;
       TRUNCATE community.tournament_results RESTART IDENTITY;
       Log: "[cross-link] tables truncated".

  6. Call populatePlayerClanEras(playerSlugs, snapshotDir, clanMap).
     Log: "[cross-link:eras] inserted N rows".

  7. Call populateTournamentResults(playerSlugs, snapshotDir, index).
     Log: "[cross-link:results] inserted N rows, unmatched M".

  8. Report unmatched rate:
       Log: "[cross-link:results] unmatched rate: M / N = X.X%".

  9. Exit 0.
  ```

  **import.meta.main guard** (D14): same pattern as players/index.ts and clans/index.ts.

  **Log format:** ASCII-only, `[cross-link]` prefix, no emoji (D13).

  **D16 atomicity note:** the CLI truncates BEFORE calling backfill functions. If a backfill
  function throws mid-run, the tables are partially populated. The operator re-runs the CLI to
  rebuild. This is the same pattern as the per-type loaders (no long-running transaction across
  all 5,903 players -- that would hold a transaction open for ~12 seconds, which is acceptable
  but unnecessary).

**Verification:**
```
bun apps/qw-oracle/scripts/load-community/cross-link/index.ts --limit 10 --dry-run
# PASS: prints "[cross-link] processing 10 players"; no DB errors; exits 0

bun apps/qw-oracle/scripts/load-community/cross-link/index.ts --slug Milton --dry-run
# PASS: prints scanned + matched + unmatched for Milton; exits 0
```

**Execution mode:** subagent (Sonnet medium) -- CLI synthesis from a well-specified flow. The
structure mirrors players/index.ts and clans/index.ts; the new elements are the truncate step and
the dual-function dispatch pattern.

---

### Task 9 -- First full run + spot-check sample queries

**Goal:** Run the cross-link backfill against the full player corpus (5,903 players). Verify
row counts, inspect sample queries, determine if the title-matcher unmatched rate is acceptable.

**Files:** none created (operator-run verification only).

**Steps:**

- [ ] Run the full backfill:
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-community/cross-link/index.ts
  ```
  Expected log output:
  ```
  [cross-link] redirects loaded: 0 entries
  [cross-link] clan map loaded: 822 entries
  [cross-link] tournament index built: ~627 rows
  [cross-link] processing 5903 players
  [cross-link] tables truncated
  [cross-link:eras] inserted N rows
  [cross-link:results] inserted M rows, unmatched K
  [cross-link:results] unmatched rate: K / M = X.X%
  ```
  The operator records the actual N, M, K values.

- [ ] Run sample spot-check queries:

  **Q1 -- "What clans was ParadokS in?"** (tests wiki_bullet rows + year-absent F9 gate)
  ```sql
  SELECT clan_title, clan_slug, start_year, end_year, era_seq, source
  FROM community.player_clan_eras
  WHERE player_slug = 'ParadokS'
  ORDER BY era_seq;
  ```
  Expected: rows for Slackers + other clans; `source = 'wiki_bullet'`; `start_year` is NULL
  for bullet-list entries. PASS condition: at least 1 row with `source='wiki_bullet'` and
  `start_year IS NULL`.

  **Q2 -- "Who was on TVS around 2008-2013?"** (tests wiki_TH rows + year range scan)
  ```sql
  SELECT p.display_name, e.start_year, e.end_year, e.source
  FROM community.player_clan_eras e
  JOIN community.players p ON p.slug = e.player_slug
  WHERE e.clan_slug = 'TVS'
    AND (e.start_year <= 2013 OR e.start_year IS NULL)
    AND (e.end_year >= 2008 OR e.end_year IS NULL)
  ORDER BY e.start_year NULLS LAST;
  ```
  Expected: Milton + other Finnish players. PASS condition: Milton's row is present.

  **Q3 -- "Who won EQL Season 12?"** (tests tournament_results + fuzzy title match)
  ```sql
  SELECT p.display_name, r.place, r.mode, r.team, r.tournament_slug
  FROM community.tournament_results r
  JOIN community.players p ON p.slug = r.player_slug
  WHERE r.tournament_slug = 'EQL_Season_12'
    AND r.place = '1'
  ORDER BY p.display_name;
  ```
  Expected: Milton's team members (TVS). PASS condition: at least 1 row returned with
  `tournament_slug = 'EQL_Season_12'`.

  **Q4 -- Unmatched rate**
  ```sql
  SELECT
    count(*) FILTER (WHERE tournament_slug IS NULL) AS unmatched,
    count(*)                                        AS total,
    round(100.0 * count(*) FILTER (WHERE tournament_slug IS NULL) / count(*), 1) AS pct
  FROM community.tournament_results;
  ```
  Operator assesses: if unmatched rate > 30%, the fuzzy matcher needs tuning (see Task 10).

  **Q5 -- Verify source values are correct**
  ```sql
  SELECT source, count(*)
  FROM community.player_clan_eras
  GROUP BY source;
  ```
  PASS: only `wiki_TH` and `wiki_bullet` appear. No `tournament-archive` or `manual` values.

  ```sql
  SELECT source, count(*)
  FROM community.tournament_results
  GROUP BY source;
  ```
  PASS: only `wiki_achievement` appears.

**Verification:** see Step queries above. PASS / FAIL conditions are embedded.

**Execution mode:** inline -- operator empirical verification; no code synthesis.

---

### Task 10 -- Tune title-match heuristic if unmatched rate is high (conditional)

**Goal:** If Task 9 Q4 shows unmatched rate > 30%, tune the series-token extraction or
normalization rules in `title-match.ts` to improve resolution. This task may be skipped if the
unmatched rate is acceptable.

**Files:**
- `apps/qw-oracle/scripts/load-community/cross-link/title-match.ts` (modified if tuning needed)

**Steps:**

- [ ] Operator inspects a sample of unmatched rows:
  ```sql
  SELECT tournament_title, year, mode, count(*)
  FROM community.tournament_results
  WHERE tournament_slug IS NULL
  GROUP BY tournament_title, year, mode
  ORDER BY count(*) DESC
  LIMIT 30;
  ```
  Identify patterns: are many unmatched titles tournaments that DO exist in community.tournaments
  (i.e., matching failure) vs. tournaments that genuinely don't have a wiki page (i.e., correct
  NULL)?

- [ ] If matching failure patterns are visible (e.g., "Thunderdome Season 5" fails to match
  "Thunderdome_Season_5"), adjust the series-token extractor or the title normalization in
  `title-match.ts`. Re-run Task 9 (full backfill) and re-check Q4.

- [ ] If the unmatched rows are genuinely tournaments without wiki pages (e.g., old obscure cups,
  foreign-language tournaments, match-report pages misread as achievements), accept the NULL
  rate. These rows are correct -- `tournament_title` is preserved verbatim for human review.

**Verification:**
```sql
-- After tuning re-run:
SELECT round(100.0 * count(*) FILTER (WHERE tournament_slug IS NULL) / count(*), 1) AS pct
FROM community.tournament_results;
-- PASS: operator accepts the rate (no hard threshold; operator judgment call).
```

**Execution mode:** inline -- operator-driven triage followed by targeted code edit if tuning
is needed. If the edit is non-trivial (new regex, new pass), escalate to a subagent (Sonnet
medium) with the failing patterns as input.

---

### Task 11 -- Update SCHEMA.md with row-count footnotes

**Goal:** Add row-count footnotes to the `community.player_clan_eras` and
`community.tournament_results` entries in SCHEMA.md to document Phase 5's expected output.

**Files:**
- `apps/qw-oracle/SCHEMA.md` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/SCHEMA.md`. In the `## Community schema` section (added by Phase 1
  Task 4), find the `community.player_clan_eras` and `community.tournament_results` entries.
  Append a footnote comment to each:
  - `player_clan_eras`: "populated by Phase 5 cross-link backfill; row count varies by player
    corpus depth (era rows per player varies 0-30+)."
  - `tournament_results`: "populated by Phase 5 cross-link backfill; row count varies by
    achievement-list depth (1-50+ per player). Unmatched rows have tournament_slug = NULL."

- [ ] Record the actual row counts from Task 9 in the footnotes once the full run completes.

**Verification:**
```
grep "player_clan_eras\|tournament_results" apps/qw-oracle/SCHEMA.md | grep "Phase 5"
# PASS: both table names appear with Phase 5 footnotes
```

**Execution mode:** inline -- targeted text append to an existing doc section; no synthesis.

---

## Verification (phase boundary)

Run these commands after all tasks complete. Each has a PASS/FAIL condition.

**V1. cross-link/ directory and files exist:**
```
ls apps/qw-oracle/scripts/load-community/cross-link/
```
PASS: lists `eras.ts eras.test.ts index.ts results.ts results.test.ts title-match.ts title-match.test.ts`.
FAIL: directory absent or files missing.

**V2. TypeScript clean:**
```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0, no output.
FAIL: type errors printed (most likely cause: import path mismatch for parsePlayer or wiki-types).

**V3. All tests pass:**
```
bun test apps/qw-oracle/scripts/load-community/cross-link/
```
PASS: all test files exit 0.
FAIL: any test fails (fix before declaring phase done).

**V4. player_clan_eras populated:**
```sql
SELECT count(*) FROM community.player_clan_eras;
```
PASS: count > 0.
FAIL: count = 0 (backfill did not run or all players had no clan history).

**V5. tournament_results populated:**
```sql
SELECT count(*) FROM community.tournament_results;
```
PASS: count > 0.
FAIL: count = 0.

**V6. source values correct (D10 regression gate):**
```sql
SELECT source, count(*) FROM community.player_clan_eras GROUP BY source;
```
PASS: only `wiki_TH` and `wiki_bullet` appear.
FAIL: any other source value present (e.g., `wiki_achievement` in the wrong table).

```sql
SELECT source, count(*) FROM community.tournament_results GROUP BY source;
```
PASS: only `wiki_achievement` appears.
FAIL: any other source value.

**V7. era_seq is contiguous per player (spot-check):**
```sql
SELECT player_slug, era_seq
FROM community.player_clan_eras
WHERE player_slug = 'Milton'
ORDER BY era_seq;
```
PASS: era_seq values are 0, 1, 2, ... with no gaps.
FAIL: gaps or repeated values.

**V8. Year-absent rows exist (F9 regression gate):**
```sql
SELECT count(*) FROM community.player_clan_eras WHERE start_year IS NULL;
```
PASS: count > 0 (there are wiki_bullet entries without year; ParadokS and others produce these).
FAIL: count = 0 (parser or INSERT is silently dropping year-absent rows).

**V9. Sample query Q1 returns ParadokS clan rows:**
```sql
SELECT clan_title, source FROM community.player_clan_eras
WHERE player_slug = 'ParadokS'
ORDER BY era_seq;
```
PASS: at least 1 row with `source = 'wiki_bullet'`.
FAIL: 0 rows (player not found or parser did not extract clan history).

**V10. Sample query Q3 returns EQL Season 12 results:**
```sql
SELECT p.display_name, r.place, r.tournament_slug
FROM community.tournament_results r
JOIN community.players p ON p.slug = r.player_slug
WHERE r.tournament_slug = 'EQL_Season_12'
LIMIT 5;
```
PASS: at least 1 row returned.
FAIL: 0 rows. Most likely cause: EQL_Season_12 tournament row does not exist in
community.tournaments (Phase 4 did not load it), or the title matcher failed to match
"EQL Season 12". Diagnose with:
```sql
SELECT slug FROM community.tournaments WHERE title ILIKE 'EQL Season 12';
```

---

## Outputs to next phase

- `community.player_clan_eras` is populated with clan membership eras sourced from wiki TH rows
  and bullet-list clan history sections. Both `wiki_TH` and `wiki_bullet` source values appear.
  Year-absent rows (`start_year IS NULL`) are present for bullet-list entries.
- `community.tournament_results` is populated with achievement rows. `tournament_slug` is
  resolved for matched tournaments; NULL for unmatched. `tournament_title` is preserved verbatim
  for all rows.
- `bunx tsc --noEmit` is clean.
- All cross-link tests pass.
- Phase 6 (MCP tools) can now implement:
  - `lookup_player(slug)` -> returns row + cross-link eras + cross-link results.
  - `search_clans` -> `player_clan_eras` makes "who was in clan X?" answerable.
  - `lookup_by_nick` -> joins across players + clans on alias arrays (unaffected by Phase 5;
    Phase 5 does not touch alias resolution, which is a Phase 6 concern).

---

## Open questions / deferred items

**Q1. redirects.json depends on Phase 0 redirect refetch (F4) shipping before Phase 5 runs.**
- **Question:** At Phase 5 drafting time, `redirects.json` was `[]` -- but that is the pre-Phase-0
  state of the snapshot, not the post-Phase-0 state. F4 captured the redirect-refetch bug
  (original snapshotter used invalid `arprop=target` and silently wrote `[]`). Phase 0 Task 3
  refetches with the correct `arprop=ids|title`; V4 PASS condition expects ~900-2,700 entries.
  Phase 5 runs AFTER Phase 0 by dependency order, so `redirects.json` should be populated by then.
- **Default chosen for now:** Phase 5's `title-match.ts` Pass 2 (redirect-alias lookup) is coded
  to consume the populated file. The CLI logs `redirects loaded: N entries` at startup; the
  executor verifies Phase 0 has shipped (N > 0) before kicking off the full run. If by accident
  Phase 5 runs against an empty redirects.json, Pass 2 is simply a no-op for that run -- not
  catastrophic; pass 1 (exact slug match) and pass 3 (series + year + mode fuzzy) still operate.
- **Who can resolve:** Phase 5 executor verifies Phase 0 has shipped. If a future re-scrape
  surfaces additional aliases or systematic shorthand patterns ("QH8") that don't appear as
  wiki redirects, those can be added as a hardcoded alias table in `title-match.ts` -- operator
  judgment after Task 9 unmatched-rate review.

**Q2. Unmatched rate acceptance threshold.**
- **Question:** Task 9 Q4 measures the unmatched rate. No hard threshold is specified -- operator
  decides. A 10-20% unmatched rate is expected (old tournaments that predate the wiki, foreign
  leagues with no wiki pages, player-typo event titles). A 40%+ rate suggests the fuzzy matcher
  needs tuning.
- **Default chosen for now:** threshold is operator judgment. Task 10 is the tuning step; it is
  conditional on the rate exceeding what the operator considers acceptable.
- **Who can resolve:** operator, after Task 9 first run.

**Q3. No migration 010 needed unless a new column is required.**
- **Question:** D15 notes "migration 010 (optional): cross-link tables index tuning (Phase 5 if
  needed)." Phase 5 has not identified a need for a new column. Both cross-link tables exist in
  migration 008 with the full column set Phase 5 needs. If the full run surfaces a need for an
  additional index (e.g., a compound index on `(clan_slug, start_year)` for the "who was in clan X
  during year Y?" query pattern), a migration 010 can add it without schema change.
- **Default chosen for now:** no migration 010 in Phase 5. If Phase 9 spot-check queries are slow,
  the operator may add a migration 010 with targeted indexes.
- **Who can resolve:** operator, after Task 9 spot-check queries run and latency is assessed.

**Q4. player_slug FK constraint -- players who appear in cross-link but not in community.players.**
- **Question:** `community.player_clan_eras.player_slug` REFERENCES `community.players(slug)` (hard
  FK per migration 008). If a player article exists in Category:Players but was skipped by the Phase
  2 loader (e.g., parse error), the Phase 5 backfill INSERT will fail the FK constraint for that slug.
- **Default chosen for now:** Phase 5's backfill reads `playerSlugs` from `community.players` (not
  from the snapshot directory directly), so only slugs already in the DB are processed. This
  sidesteps the FK problem: if Phase 2 failed to load a player, that slug is absent from
  `community.players` and Phase 5 simply never tries to insert a cross-link row for it.
  The trade-off: a parse-failed player has no cross-link rows. This is acceptable (no data > bad
  data) and consistent with the "FK enforced at insert time" principle.
- **Who can resolve:** operator, by inspecting Phase 2 warnings for parse failures. If any player
  had a parse failure that should be fixed, re-run Phase 2 for that slug before Phase 5.

---

## Recovery (if verification fails)

**V2 fails (TypeScript errors):**
Most likely import path mismatch. Run `bunx tsc --noEmit 2>&1 | head -40` to identify the file.
The most common cause is a relative import path from `cross-link/*.ts` that does not match the
actual directory depth. `parsePlayer` lives at `../players/parse.ts` from `cross-link/`; `db`
lives at `../../../shared/db.ts`; `wiki-types.ts` at `../shared/wiki-types.ts`.

**V4 fails (player_clan_eras empty after full run):**
Check the CLI log output -- if "[cross-link:eras] inserted 0 rows" is printed, the most likely
cause is that `parsed.clan_history` is empty for all players. Verify Phase 2's parser produces
clan_history on a sample player: run `bun apps/qw-oracle/scripts/load-community/cross-link/index.ts --slug Milton --dry-run` and add a debug log to confirm `clan_history.length > 0`.

**V8 fails (no year-absent rows):**
The parser or INSERT is silently filtering out `start_year = NULL` rows. Check `eras.ts` INSERT
statement: ensure `start_year` is bound as `null` (not `0` or `undefined`). postgres-js binds
JS `null` as SQL NULL; `undefined` may produce an error or be coerced to NULL depending on the
driver version. Verify by running a single-player test: `--slug ParadokS --dry-run` and logging
the `clan_history` array before INSERT.

**V10 fails (EQL_Season_12 not matched):**
First check: does the tournament row exist?
```sql
SELECT slug, title, year, mode, series FROM community.tournaments WHERE title ILIKE '%EQL%Season%12%';
```
If 0 rows: Phase 4 did not load it. The tournament page may not exist in Category:Leagues or
may have a different slug. Check the snapshot: `ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ | grep EQL`.
If the row exists but no results: the title matcher is not resolving "EQL Season 12" to the
correct slug. Run `matchTournamentTitle` in isolation with the exact event_title string from
a failing player row.

**V3 fails (tests fail):**
Read the specific test failure output. The most likely causes:
- `qw_oracle_test` DB not set up (run migrations 008 + 009 against the test DB).
- Import path wrong (see V2 recovery).
- Test fixture wikitext snippet does not produce the expected Achievement[] (the synthetic
  wikitext may not match the parser's regex patterns exactly; read Phase 2 parse.ts to align).

**Full run crashes mid-way:**
Re-run the CLI from scratch (the truncate step resets both tables at the start of each full run).
A partial run is always recoverable by re-running the full CLI. The only non-recoverable scenario
is a DB connection failure mid-TRUNCATE; in that case check DB state with the V4/V5 queries and
re-run.

---

## Verification sub-agent dispatch

After this phase MD was drafted, the following sub-agent brief was dispatched (Explore, Sonnet
medium):

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-5-cross-link-backfill.md

Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md

Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md

Read the design spec section relevant to this phase:
  /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md

Read phase-1-curated-rename.md (for cross-link table schemas):
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-1-curated-rename.md

Read phase-2-players.md (for ClanHistoryEntry + Achievement types + parsePlayer shape):
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-2-players.md

Read phase-3-clans.md Task 7 (getClanTitleToSlugMap export):
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-3-clans.md

Read phase-4-tournaments.md Task 3 (migration 009 column skeleton -- series, year, mode):
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md

Then verify, file-by-file:

1. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL.

2. Every CREATE TABLE / ALTER TABLE / CREATE INDEX in this phase:
   - Verify schema name is `community` (D2) for new tables.
   - Verify column types match common Postgres conventions.
   - Verify FK references are well-formed.

3. Every reference to a wiki snapshot artifact:
   - Verify the path under `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` exists.
   - For redirects.json: confirm it exists and is empty ([]).

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm `import.meta.main` guards (if referenced) are valid (Bun-supported).
   - Confirm output discipline (D13): no emoji, ASCII-only.

5. Every reference to existing code (load-knowledge/, serve/mcp/, db/):
   - For phase-created files (load-community/players/parse.ts, shared/wiki-types.ts,
     clans/index.ts getClanTitleToSlugMap): these do NOT exist yet in the live codebase
     (Phases 2/3/4 are unexecuted). Do NOT flag their absence as CRITICAL -- they are
     inputs from prior phases per "Inputs from previous phase".
   - For db/migrations/008_community_schema.sql: this does NOT exist yet (Phase 1 unexecuted).
     Do NOT flag absence as CRITICAL.
   - Verify apps/qw-oracle/shared/db.ts EXISTS (it is a live-codebase file that cross-link
     scripts import; flag if absent).
   - Verify apps/qw-oracle/scripts/load-community/CLAUDE.md is flagged as "Modified" and that
     the parent directory exists or will be created by Phase 2 (not yet executed).

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode.
   - Flag tasks coded as `inline` that involve code synthesis, migration writing, or test
     authoring -- those should be subagent.
   - Check that Task 4 (results.ts) is Sonnet MAX and Task 6 (eras.ts) is Sonnet medium;
     confirm the rationale distinguishes them correctly.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm the finding exists.
   - Confirm this phase actually references the findings it claims to.

8. Every column / table introduced that is not in decisions.md and is not already in
   apps/qw-oracle/SCHEMA.md:
   - Flag as potential drift.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing voice.
    Flag any.

11. CHECK source values on both cross-link tables (D10):
    - player_clan_eras: Phase 5 writes only 'wiki_TH' and 'wiki_bullet'.
      Verify migration 008's CHECK also accepts 'tournament-archive' and 'manual'.
    - tournament_results: Phase 5 writes only 'wiki_achievement'.
      Verify migration 008's CHECK also accepts 'wiki_TH', 'tournament-archive', 'manual'.
    - Flag if Phase 5 attempts to write a value not in the CHECK enum.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
