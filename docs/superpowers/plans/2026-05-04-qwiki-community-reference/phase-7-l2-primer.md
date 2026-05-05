# Phase 7 -- L2 corpus reconstruction primer artifact

> **Drafter checklist:**
> 1. Read `decisions.md` (full). D1 / D4 / D5 / D6 / D11 / D13 / D14 / D15 / D16 / D17 / D18 directly govern this phase.
> 2. Read `review-findings.md`. F7 (case-variant pairs, slug case-sensitivity), F12 (redirects.json dependency), Q6 from Phase 6 (multi-disambiguator clusters surface as multi-match -- load-bearing for alias_index).
> 3. Read spec "Phase 7 row in phase-decomposition table"; read `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` (the primer consumer). L2 spec is at Pass 1 close; Stage 0 primer section is placeholder-sparse -- see "Primer-shape determination" below for how this phase resolves the gap.
> 4. Read Phase 2 (player schema + aliases + active_year), Phase 3 (clan prefix field), Phase 4 (tournament series/year/mode), Phase 5 (cross-link tables), Phase 6 (MCP tools shipped -- primer build uses direct DB queries, not MCP calls; rationale in Task 1).
> 5. Verified five reference player articles exist in snapshot: `articles/Milton.json`, `articles/ParadokS.json`, `articles/Bomkia.json`, `articles/Acid_(Finnish_Player).json`, `articles/Acid_(Polish_Player).json`. Live recon confirms all five present.
> 6. Verified `redirects.json` is currently `[]` (Phase 0 not yet executed). Phase 7 executor must gate alias_index Pass 2 on Phase 0 having shipped (F12).
> 7. After drafting, dispatched verification sub-agent per phase-template.md brief.

---

## Goal

Phase 7 builds the L2 corpus reconstruction primer artifact: a structured JSON file that gives the analyzing LLM (Stage 0 through Stage 2 of the L2 reconstruction pipeline) the community-recognition vocabulary it needs to disentangle player nicks, clan tags, and tournament references in ten years of Discord chat. The primer is built deterministically (D4) from the `community.*` Postgres tables loaded by Phases 2-5 and optionally from the curated note frontmatter for any prose-level alias signal (e.g., intro paragraphs that name old nicks). No LLM in the build path. The primer's load-bearing field is `alias_index` -- a flat, case-folded lookup from any mention-token to its canonical entity (player / clan / tournament). At phase boundary: the primer artifact exists at `apps/qw-oracle/data/l2-primer/2026-05-04.json`; a spot-check confirms the five reference players (Milton, ParadokS, Bomkia, Acid Finnish, Acid Polish) appear with correct nationality and clan affiliation; `bunx tsc --noEmit` is clean; the primer-build test fixture passes. This is the final phase of the arc. No further phase consumes Phase 7's output within this arc; the L2 corpus reconstruction arc consumes the primer artifact externally when its Stage 0 execution begins.

### Primer-shape determination

The L2 spec (`docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md`) exists and was read. At Pass 1 close (the spec's current state), Stage 0 is described as "Iterative glossary primer bootstrap (LLM-uncertainty-sampling loop until convergence)" but the primer artifact's exact shape and location are explicitly deferred to Pass 2 ("Stage 0: primer artifact location -- extend `packages/qw-knowledge/terminology` vs new file under qw-oracle"). The spec does NOT specify the primer's JSON shape.

**Resolution:** Phase 7 ships the sensible default shape documented in the arc design context (and in this phase MD's Task 3). The shape is forward-compatible with the L2 spec's "iterative glossary primer bootstrap" framing: it produces a self-contained JSON that the Stage 0 LLM can load verbatim as its starting vocabulary. When Pass 2 of the L2 brainstorm specifies a primer shape, Phase 7's output can be adapted via a thin transformation layer; the data content is stable.

**Output location decision:** `apps/qw-oracle/data/l2-primer/<YYYY-MM-DD>.json`, sibling to `data/wiki-snapshots/`. Rationale: (a) date-keyed for re-builds when a new wiki snapshot triggers a new primer; (b) under `data/` which is the established qw-oracle artifact directory; (c) not under `scripts/` which is code, not output. The `l2-primer/` subdirectory is new but follows the same convention as `wiki-snapshots/`.

**Script location decision:** `apps/qw-oracle/scripts/build-l2-primer/` -- a new sibling to `scripts/load-community/`, `scripts/load-concepts/`, etc. Rationale: the primer build is a distinct pipeline step (reads DB + optional note frontmatter, writes JSON), not a loader step; it warrants its own named subdirectory rather than living under `load-community/`. Phase 3's loader lives under `load-community/clans/`; the primer is not a loader -- it reads from the completed DB, not the raw wiki snapshot.

**Direct DB queries vs MCP tools decision:** Phase 7 queries `community.*` tables directly via postgres-js for the batch primer build. MCP tools are better suited for per-query interactive use (D11). Querying 5,903 players + 822 clans + ~627 tournaments via MCP `search_players` / `search_clans` / `search_tournaments` (page-limited calls) introduces unnecessary indirection and API overhead. Direct DB queries in a single transaction are the correct pattern for batch artifact generation.

---

## Inputs from previous phase

- Phase 0 complete: snapshot finalized; `redirects.json` refetched with `arprop=ids|title` and contains >= 900 entries (F12 gate). **If Phase 0 has not shipped when Phase 7 runs, `redirects.json` remains `[]`; alias_index Pass 2 is a no-op for this run. The primer is functional for non-redirect-based aliases but missing some redirect-derived aliases. Log a warning: `[build-l2-primer] redirects.json is empty -- alias_index redirect pass skipped; re-run after Phase 0.`**
- Phase 1 complete: migration 008 applied; `community.*` tables exist.
- Phase 2 complete: `community.players` populated (~5,903 rows); player aliases, nationality_iso, current_clan, active_year_start, is_substantive, has_note, status populated per D5/D6.
- Phase 3 complete: `community.clans` populated (822 rows); `prefix` field populated for clan-tagged-nick recognition.
- Phase 4 complete: migration 009 applied; `community.tournaments` populated (~627 rows); `series`, `year`, `mode` columns populated.
- Phase 5 complete: `community.player_clan_eras` populated; `getClanTitleToSlugMap()` consumable for clan affiliation lookup.
- Phase 6 complete: MCP tools operational; `lookup_by_nick` works for interactive spot-checks; `bunx tsc --noEmit` clean.
- `DATABASE_URL` set (operator-side). Bun installed and on PATH.

---

## Files touched

### Created

```
apps/qw-oracle/scripts/build-l2-primer/                                     # new primer-build subdirectory
apps/qw-oracle/scripts/build-l2-primer/CLAUDE.md                            # primer-build docs; what it does, output shape, re-run instructions
apps/qw-oracle/scripts/build-l2-primer/build.ts                             # main build script: queries DB, reads notes, emits JSON artifact
apps/qw-oracle/scripts/build-l2-primer/build.test.ts                        # fixture-based test: spot-checks 5 reference players + 3 reference clans + 2 reference tournaments
apps/qw-oracle/scripts/build-l2-primer/alias-index.ts                       # alias_index construction module (three passes); pure, no IO
apps/qw-oracle/scripts/build-l2-primer/alias-index.test.ts                  # bun test for alias_index construction (multi-match, case-fold, prefix-tag detection)
apps/qw-oracle/scripts/build-l2-primer/index.ts                             # CLI dispatcher: parse CLI args, connect DB, call build(), write output
apps/qw-oracle/data/l2-primer/                                              # output directory (gitignored or committed per operator choice; see Open Question Q1)
apps/qw-oracle/data/l2-primer/2026-05-04.json                               # primer artifact (generated, not hand-written; created by first run in Task 6)
```

### Modified

```
apps/qw-oracle/SCHEMA.md          # add l2-primer artifact note under community schema section (not a table; document as generated artifact)
```

The SCHEMA.md addition is a one-paragraph note under the community schema section clarifying that `data/l2-primer/` is a generated artifact (not a DB table) that compiles from `community.*` rows into a recognition lookup for L2 reconstruction. It does not add a table entry or change any schema version number.

### Deleted

n/a -- no existing files deleted in this phase.

---

## Tasks

### Task 1 -- Create scripts/build-l2-primer/ scaffold + CLAUDE.md

**Goal:** Establish the new script subdirectory with a CLAUDE.md that documents the primer build pattern (what it reads, what it emits, when to re-run).

**Files:**
- `apps/qw-oracle/scripts/build-l2-primer/CLAUDE.md` (created)

**Steps:**
- [ ] Create directory `apps/qw-oracle/scripts/build-l2-primer/`.
- [ ] Create `apps/qw-oracle/scripts/build-l2-primer/CLAUDE.md` with the following content (full body inlined):

```markdown
# scripts/build-l2-primer/

Primer-build script for the Layer 2 corpus reconstruction pipeline. Reads
`community.players`, `community.clans`, `community.tournaments`,
`community.player_clan_eras`, and (optionally) the curated note frontmatter
under `apps/qw-oracle/curated/<type>-notes/` to emit a structured JSON primer
artifact at `apps/qw-oracle/data/l2-primer/<YYYY-MM-DD>.json`.

The primer is the Stage 0 input for the L2 corpus reconstruction analyzing LLM
(see `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md`).
It gives the analyzer the community-recognition vocabulary it needs to disentangle
player nicks, clan tags, and tournament references in Discord chat history.

## Why direct DB queries (not MCP tools)

MCP tools (search_players, lookup_by_nick, etc. from Phase 6) are designed for
interactive per-query use. The primer build is a batch operation over all 5,903
players + 822 clans + ~627 tournaments. Direct Postgres queries in a single
connection are simpler, faster, and avoid the MCP tool's page-limit overhead.
The MCP tools remain useful for manual spot-checks after the primer is generated.

## Output shape

The primer is a single JSON file with four top-level keys:

- `players[]` -- one entry per player row in community.players; structured fields
  for nationality, clan affiliation, active years, status, is_substantive flag.
- `clans[]` -- one entry per clan row in community.clans; prefix field enables
  clan-tagged-nick recognition (`[TVS]`, `[SR]`, etc.).
- `tournaments[]` -- one entry per tournament row; series/year/mode for canonical
  reference resolution.
- `alias_index{}` -- the load-bearing field. Maps any mention-token (player nick,
  real name token, clan prefix, tournament name) to its canonical entity/entities.
  Multi-match for ambiguous nicks (e.g., "Acid" -> three separate player entries).

See `build.ts` and the arc plan phase-7 MD for the full shape.

## Re-run instructions

When a new wiki snapshot triggers a new community.* load (Phases 2-5 re-run):
```
DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/build-l2-primer/index.ts \
  --date 2026-05-04
```
The `--date` flag sets the output filename. Defaults to today's date if omitted.
Existing primer files under `data/l2-primer/` are NOT overwritten unless `--force`
is passed -- same safety pattern as the wiki snapshotter.

## Always-on rules (inherits from qw-oracle CLAUDE.md)

- Bun runtime (D14). `bun scripts/build-l2-primer/index.ts`.
- Deterministic (D4). No LLM in the build path.
- ASCII-only in all script output and doc content (D13).
- Player names in the JSON artifact itself may be non-ASCII (wiki content preserved
  verbatim). That is correct and not a D13 violation -- D13 governs script output
  text and the phase MD, not the payload content of a data artifact.
```

**Verification:**
```
ls apps/qw-oracle/scripts/build-l2-primer/
# PASS: lists CLAUDE.md
```

**Execution mode:** inline -- directory creation + CLAUDE.md with full content shipped above; no code synthesis.

---

### Task 2 -- Build alias-index.ts + alias-index.test.ts

**Goal:** Land the `alias-index.ts` pure module that constructs the `alias_index` lookup from the DB row arrays passed to it. Keeping this module pure (no DB, no IO) makes it independently testable and keeps `build.ts` simple.

**Files:**
- `apps/qw-oracle/scripts/build-l2-primer/alias-index.ts` (created)
- `apps/qw-oracle/scripts/build-l2-primer/alias-index.test.ts` (created)

**Steps:**
- [ ] Author `alias-index.ts` as a pure module that exports `buildAliasIndex(players, clans, tournaments, redirects)`.

The function builds the alias_index in three passes:

**Pass 1 -- player tokens.** For each player row:
- Add entries for: `display_name` (lowercased), each alias[] member (lowercased), `real_name` tokens (first name + last name as separate tokens, lowercased), any Twitch handle if present in the notes frontmatter (passed in via `playerExtras` map; optional).
- Handle disambiguation parenthetical: the `title` field like `Acid_(Finnish_Player)` produces tokens `acid` AND `acid (finnish player)` -- the long form lets an analyzer match explicit disambiguation strings in chat.
- Multi-match is intentional: if "acid" maps to three player slugs (Finnish, Polish, Swedish), the entry is `"acid": [{ type: "player", slug: "acid-finnish-player" }, ...]`. The analyzer LLM disambiguates by chat context (channel, surrounding messages, time period, co-occurring clan tags).

**Pass 2 -- clan prefix + clan title tokens.** For each clan row:
- Add entry for `prefix` (e.g., `"[TVS]"`) -- stored verbatim (not lowercased) because bracket-prefixed tags are case-sensitive in chat. Also add lowercased title.
- If `is_substantive=true` additionally add the clan slug itself as a token.

**Pass 3 -- tournament tokens + redirect aliases.** For each tournament row:
- Add lowercased `title` and `slug`.
- `redirects.json` entries where the target resolves to a tournament slug produce additional alias entries. If `redirects.json` is empty (`[]`), this sub-pass is a no-op and the function logs a warning to the caller. The warning is surfaced to the CLI, not silently swallowed.

**Behavior contract (for tests):**
- All keys are lowercased strings EXCEPT clan prefixes (bracket-form preserved as-is).
- Each value is an array of `{ type: 'player' | 'clan' | 'tournament', slug: string }` objects.
- Single-match nicks produce a one-element array. Multi-match produces N elements. No deduplication within a single pass; deduplication across passes uses (type, slug) equality.
- Token collision between a player nick and a clan title produces a multi-type array: `[{ type: 'player', ... }, { type: 'clan', ... }]`. This is correct -- the analyzer sees both and picks by context.

**Open Question for executor:** The operator can choose whether the alias_index keys are lowercased for ALL entries (including bracket-prefixed clan tags) or whether bracket-prefixed tags are stored verbatim. The default documented here (verbatim for bracket-tags, lowercase for everything else) preserves case for the one set of tokens where case matters. The test fixture in `alias-index.test.ts` locks this behavior so the executor doesn't silently change it.

- [ ] Author `alias-index.test.ts` with bun:test cases covering:
  - Single-nick player (Milton) -> single-element array with correct type/slug.
  - Multi-disambiguator nick (Acid) -> three-element array covering Finnish/Polish/Swedish slugs.
  - Clan prefix (`[SR]`) -> entry under `"[SR]"` (verbatim) pointing at the correct clan slug.
  - Tournament title token -> entry pointing at the correct tournament slug.
  - Empty redirects array -> function returns without throwing; redirect-derived entries absent.
  - Token collision (player and clan sharing a name) -> multi-type array.

**Execution mode:** subagent (Sonnet medium) -- code synthesis with non-trivial logic (three-pass construction, multi-match merging, case-folding rules, bracket-prefix special case, redirect sub-pass). Isolated context preferred; the module is well-bounded with a clear pure interface.

---

### Task 3 -- Build build.ts (main primer-build script)

**Goal:** Land `build.ts` -- the script that queries `community.*` DB tables, assembles the player/clan/tournament arrays and the alias_index, reads `redirects.json`, optionally reads note frontmatter for extra alias signal, and returns the primer JSON object (not yet written to disk; the CLI dispatcher in Task 5 handles writing).

**Files:**
- `apps/qw-oracle/scripts/build-l2-primer/build.ts` (created)

**Steps:**
- [ ] Author `build.ts` exporting an async `buildPrimer(db, opts)` function. `opts` includes `{ snapshotDate: string, noteDir: string, redirectsPath: string }`. The function:

1. **Query players.** `SELECT slug, title, display_name, aliases, real_name, nationality, nationality_iso, current_clan, active_year_start, active_year_end, status, community_roles, has_note, is_substantive, is_stub FROM community.players ORDER BY slug`. All rows included (D5 decision: is_substantive=false stubs are still recognition signals). For rows where `has_note=true`, optionally load the frontmatter from `curated/player-notes/<slug>.md` via gray-matter to extract any Twitch handle or additional alias mentioned in the frontmatter (e.g., the Milton note's frontmatter may include a `twitch: miltonizer` field not stored in the main row). This cross-reference is an optional signal; load failures are logged, not fatal.

2. **Query clan eras for clan history.** For the `players[].clans_history` field, query `community.player_clan_eras` grouped by `player_slug` ordering by `start_year ASC NULLS LAST, era_seq ASC`. This populates the `clans_history` array per player. Load this in one query and assemble into a Map<player_slug, ClanHistoryEntry[]> before populating the player rows.

3. **Query clans.** `SELECT slug, title, prefix, nationality, nationality_iso, founded_year, disbanded, status, has_note, is_substantive FROM community.clans ORDER BY slug`. For clan membership signal in the primer, query `community.player_clan_eras` grouped by `clan_slug` to produce `members_active_in_era[]` (display_names of players with an era row on this clan). This is a secondary signal; omit if the query is expensive (use a LEFT JOIN subquery capped to 20 members per clan).

4. **Query tournaments.** `SELECT slug, title, series, year, mode, has_note, is_substantive FROM community.tournaments ORDER BY slug`. No cross-link data needed in the tournament primer entries -- the alias_index provides the recognition path; full results are available via `lookup_tournament` MCP tool.

5. **Read redirects.json.** Read and parse `apps/qw-oracle/data/wiki-snapshots/<snapshotDate>/redirects.json`. If empty or unreadable, log a warning and proceed (Pass 2 of alias_index will be a no-op).

6. **Call `buildAliasIndex(players, clans, tournaments, redirects)`.** Assemble the alias_index from the Task 2 module.

7. **Return the primer object** in this shape:

```jsonc
{
  "schema_version": 1,
  "generated_at": "<ISO timestamp>",
  "snapshot_date": "<opts.snapshotDate>",
  "source": "qw-oracle community.* tables + curated/<type>-notes frontmatter",

  "players": [
    {
      "slug": "milton",
      "display_name": "Milton",
      "real_name": "Joni Sivula",
      "aliases": [],
      "nationality": "Finland",
      "nationality_iso": "fi",
      "current_clan": "Black Book",
      "current_clan_prefix": null,
      "active_year_start": 1997,
      "active_year_end": null,
      "status": "Active",
      "clans_history": [
        { "clan_title": "Black Book", "start_year": 2024, "end_year": null },
        { "clan_title": "Bennett", "start_year": 2024, "end_year": 2024 }
      ],
      "is_substantive": true,
      "has_note": true
    }
  ],

  "clans": [
    {
      "slug": "the-viper-squad",
      "title": "The Viper Squad",
      "prefix": "[TVS]",
      "nationality": "Finland",
      "nationality_iso": "fi",
      "founded_year": 2007,
      "disbanded": null,
      "status": "Active",
      "members_active_in_era": ["Milton"],
      "is_substantive": true,
      "has_note": true
    }
  ],

  "tournaments": [
    {
      "slug": "eql-season-12",
      "title": "EQL Season 12",
      "series": "EQL",
      "year": 2010,
      "mode": "4on4",
      "is_substantive": true,
      "has_note": true
    }
  ],

  "alias_index": {
    "milton":       [{ "type": "player", "slug": "milton" }],
    "acid":         [
      { "type": "player", "slug": "acid-finnish-player" },
      { "type": "player", "slug": "acid-polish-player" },
      { "type": "player", "slug": "acid-swedish-player" }
    ],
    "[TVS]":        [{ "type": "clan_prefix", "slug": "the-viper-squad" }],
    "eql season 12":[{ "type": "tournament", "slug": "eql-season-12" }]
  }
}
```

Note on `current_clan_prefix`: the player row does not store the prefix directly; `build.ts` enriches the player record by joining `current_clan` title against `community.clans.prefix` where the clan title matches. If no match, `current_clan_prefix` is null. This enrichment is a single query at build time: `SELECT title, prefix FROM community.clans WHERE prefix IS NOT NULL`.

Note on non-ASCII content: player names like `Paradoks` (title "ParadokS") or real names in Finnish, Swedish, Russian are preserved verbatim in the JSON. D13 governs the script's console output and the phase MD text; the primer artifact is data, not script output.

**Execution mode:** subagent (Sonnet medium) -- multi-query DB orchestration, cross-join enrichment for current_clan_prefix and members_active_in_era, optional note-frontmatter loading via gray-matter, integration with alias-index module. Multi-file reads required (migration 008 SQL for column names, Phase 5 cross-link table shape, redirects.json path). Isolated subagent context preferred.

---

### Task 4 -- Build build.test.ts (fixture-based spot-check)

**Goal:** Land `build.test.ts` -- tests that call `buildPrimer()` against a test DB seeded with the five reference players and verify that the output contains the correct nationality and clan affiliation for each.

**Files:**
- `apps/qw-oracle/scripts/build-l2-primer/build.test.ts` (created)

**Steps:**
- [ ] Author `build.test.ts` using bun:test targeting the `qw_oracle_test` database (same pattern as `apps/qw-oracle/serve/mcp/src/tools/community.test.ts` from Phase 6). The test:

  - Seeds `community.players` with five rows for the five reference players (Milton, ParadokS, Bomkia, Acid (Finnish Player), Acid (Polish Player)), using minimal but correct structured data (at minimum: slug, display_name, nationality_iso, current_clan, is_substantive, has_note, aliases).
  - Seeds `community.clans` with the relevant clans (at minimum: Milton's current clan "Black Book"; ParadokS's historical clans; the Finnish Acid's clan if known from wiki).
  - Seeds `community.player_clan_eras` with a few representative eras.
  - Seeds `community.tournaments` with two entries (EQL Season 1 and one other) for tournament alias_index coverage.
  - Seeds `community.player_clan_eras` for clan-history composition.
  - Calls `buildPrimer(db, { snapshotDate: '2026-05-04', noteDir: '/tmp/test-notes', redirectsPath: '/tmp/empty-redirects.json' })` with a temporary empty noteDir and `[]`-content redirects file.
  - Asserts:
    - `primer.players` contains an entry with `slug === 'milton'`, `nationality === 'Finland'`, `nationality_iso === 'fi'`.
    - `primer.players` contains an entry with `slug === 'paradoks'` (or the actual slug from Phase 2's parser -- executor verifies slug format against live `community.players` after Phase 2 ships; the test uses whatever slug the Phase 2 parser emits for "ParadokS").
    - `primer.players` contains an entry with `slug === 'bomkia'` and `is_substantive === false` (Bomkia is stub-tier per Phase 2 pilot).
    - `primer.alias_index['acid']` is an array of length >= 2 (Finnish + Polish; Swedish if seeded).
    - `primer.alias_index['milton']` is an array of length 1 with `type === 'player'` and `slug === 'milton'`.
    - `primer.clans` contains at least one entry where `prefix` is non-null (whatever clan the test seeds with a prefix).
  - TRUNCATES all seeded tables in `afterAll`. Does NOT truncate production DB.

  **Implementation note for executor:** The exact slugs for ParadokS and the Acid players depend on Phase 2's slug-generation logic. Phase 2's parser uses the wiki article title as the slug base with underscores (e.g., `ParadokS` -> `paradoks`, `Acid_(Finnish_Player)` -> `acid-finnish-player` or `acid__finnish_player_` depending on the slugify implementation). The test must use the same slug that Phase 2 produces. Executor: read `scripts/load-community/players/parse.ts` to verify the slugify function before writing the test fixture seeding code.

**Execution mode:** subagent (Sonnet medium) -- test authoring with DB seeding logic, multi-table fixture setup, and post-build assertion logic; requires reading Phase 6's community.test.ts for the seed pattern and Phase 2's parse.ts for slug format.

---

### Task 5 -- Build index.ts (CLI dispatcher)

**Goal:** Land `index.ts` -- the CLI entry point that parses args, connects to the DB, calls `buildPrimer()`, and writes the JSON artifact to disk.

**Files:**
- `apps/qw-oracle/scripts/build-l2-primer/index.ts` (created)

**Steps:**
- [ ] Author `index.ts` as a Bun CLI with `import.meta.main` guard and the following interface:

```
bun apps/qw-oracle/scripts/build-l2-primer/index.ts [--date YYYY-MM-DD] [--force] [--dry-run]
```

- `--date`: snapshot date to use for `redirects.json` path and output filename. Defaults to today's ISO date.
- `--force`: overwrite an existing primer file at the output path. Without `--force`, the script exits with an error if the file already exists (prevent accidental overwrites on re-run).
- `--dry-run`: build the primer object in memory, log a summary (player count, clan count, tournament count, alias_index entry count, estimated JSON size in KB), and write nothing to disk.

Output location: `apps/qw-oracle/data/l2-primer/<date>.json`. Creates the `l2-primer/` directory if it does not exist. Writes the JSON with `JSON.stringify(primer, null, 2)` (pretty-printed; ~3-5 MB for the full corpus). Logs `[build-l2-primer] wrote <path> (<sizeKB> KB, <playerCount> players, <clanCount> clans, <tournamentCount> tournaments, <aliasCount> alias_index entries)` on success.

The script must also log the redirects.json status at startup: `[build-l2-primer] redirects loaded: <N> entries` (where N=0 triggers the F12 warning: `redirects.json is empty -- alias_index redirect pass skipped; re-run after Phase 0 completes`).

**Execution mode:** subagent (Sonnet medium) -- CLI dispatcher code synthesis with arg-parsing, directory-creation, file-write with overwrite guard, and logging discipline. Standard Bun CLI pattern; isolated context preferred.

---

### Task 6 -- First run + spot-check the five reference players

**Goal:** Run the primer build against the live DB and confirm the five reference players appear with correct metadata in the output.

**Files:**
- `apps/qw-oracle/data/l2-primer/2026-05-04.json` (created by this run)

**Steps:**
- [ ] Verify the `community.*` tables are populated (pre-condition check):
  ```sql
  SELECT 'players' AS t, count(*) FROM community.players
  UNION ALL SELECT 'clans', count(*) FROM community.clans
  UNION ALL SELECT 'tournaments', count(*) FROM community.tournaments;
  ```
  PASS condition: players >= 5903, clans >= 822, tournaments >= 600. If counts are zero, Phases 2-4 have not shipped -- abort and surface to operator.

- [ ] Run the build:
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/build-l2-primer/index.ts \
    --date 2026-05-04
  ```
  PASS: logs `[build-l2-primer] wrote apps/qw-oracle/data/l2-primer/2026-05-04.json (<N> KB, 5903 players, 822 clans, <N> tournaments, <N> alias_index entries)` with no errors.

- [ ] Spot-check Milton:
  ```
  bun -e "const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8')); const m = p.players.find(x=>x.slug==='milton'); console.log(JSON.stringify(m,null,2));"
  ```
  PASS condition: `nationality_iso === 'fi'`, `current_clan` is non-null, `is_substantive === true`.

- [ ] Spot-check ParadokS:
  ```
  bun -e "const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8')); const m = p.players.find(x=>x.slug==='paradoks'); console.log(JSON.stringify(m,null,2));"
  ```
  PASS condition: entry found, `nationality_iso === 'se'` (Swedish), `clans_history.length >= 1`.
  **Implementation note:** The slug may be `'paradoks'` or `'paradoks-player'` depending on Phase 2's disambiguator handling. Executor verifies the actual slug first: `SELECT slug FROM community.players WHERE display_name ILIKE 'paradoks' LIMIT 1`.

- [ ] Spot-check Bomkia:
  ```
  bun -e "const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8')); const m = p.players.find(x=>x.slug==='bomkia'); console.log(JSON.stringify(m,null,2));"
  ```
  PASS condition: entry found, `is_substantive === false` (stub-tier -- Bomkia has sparse infobox data per Phase 2 pilot).

- [ ] Spot-check Acid (Finnish Player):
  ```
  bun -e "const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8')); const m = p.players.find(x=>x.nationality_iso==='fi' && x.display_name==='Acid'); console.log(JSON.stringify(m,null,2));"
  ```
  PASS condition: entry found, `nationality_iso === 'fi'`.

- [ ] Spot-check Acid (Polish Player):
  Similar probe with `nationality_iso === 'pl'`.
  PASS condition: entry found, `nationality_iso === 'pl'`.

- [ ] Spot-check alias_index multi-match for "acid":
  ```
  bun -e "const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8')); console.log(JSON.stringify(p.alias_index['acid'],null,2));"
  ```
  PASS condition: array of length >= 2 (Finnish + Polish; Swedish if that page also has `display_name=Acid`).

**Execution mode:** inline -- deterministic CLI invocations + SQL spot-checks; no code synthesis.

---

### Task 7 -- Update SCHEMA.md + commit

**Goal:** Add a one-paragraph artifact note to SCHEMA.md and commit the Phase 7 deliverables.

**Files:**
- `apps/qw-oracle/SCHEMA.md` (modified)

**Steps:**
- [ ] Append the following paragraph to the "## Community schema" section in `SCHEMA.md` (added by Phase 1, Task 4) under the five table entries:

```
### L2 primer artifact (generated, not a DB table)

`apps/qw-oracle/data/l2-primer/<YYYY-MM-DD>.json` is a generated artifact compiled
from the community.* tables by `scripts/build-l2-primer/index.ts`. It is the Stage 0
input for the Layer 2 corpus reconstruction pipeline and contains denormalized player /
clan / tournament recognition data plus an alias_index for fast mention-to-entity lookup.
Re-generate when the community.* tables are refreshed from a new wiki snapshot. The script
is idempotent with --force; without --force it refuses to overwrite an existing primer file.
```

- [ ] Commit: "feat(qw-oracle): Phase 7 -- L2 primer build script + artifact"

**Execution mode:** inline -- one-paragraph doc addition; no code synthesis.

---

## Verification (phase boundary)

**V1. TypeScript clean:**
```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0, no output.
FAIL: type errors from primer build scripts.

**V2. Primer-build tests pass:**
```
DATABASE_URL=$DATABASE_URL bun test apps/qw-oracle/scripts/build-l2-primer/
```
PASS: all tests pass (alias-index.test.ts + build.test.ts).
FAIL: any test failure; inspect and fix before proceeding.

**V3. Primer artifact exists:**
```
ls -lh apps/qw-oracle/data/l2-primer/2026-05-04.json
```
PASS: file exists, size >= 1 MB (even minimal corpus; a stub-only primer would still be several hundred KB).
FAIL: file does not exist or is 0 bytes (build script did not complete or wrote nothing).

**V4. Five reference players present with correct nationality:**
```
bun -e "
const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8'));
const checks = [
  ['milton', 'fi'],
  ['paradoks', 'se'],
  ['bomkia', null],
];
for (const [slug, iso] of checks) {
  const found = p.players.find(x => x.slug === slug);
  console.log(slug, found ? 'found' : 'MISSING', found?.nationality_iso ?? '(null)', iso === null || found?.nationality_iso === iso ? 'OK' : 'FAIL');
}
const acidFi = p.players.find(x => x.display_name === 'Acid' && x.nationality_iso === 'fi');
const acidPl = p.players.find(x => x.display_name === 'Acid' && x.nationality_iso === 'pl');
console.log('acid-fi', acidFi ? 'found OK' : 'MISSING');
console.log('acid-pl', acidPl ? 'found OK' : 'MISSING');
"
```
PASS: all five lines end with 'found' or 'found OK'; no 'MISSING'.
FAIL: any player missing or nationality_iso wrong. Indicates Phase 2 parser nationality extraction failed for that player; investigate `community.players` row directly.

**V5. Alias_index multi-match for "acid":**
```
bun -e "
const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8'));
const hits = p.alias_index['acid'] || [];
console.log('acid entries:', hits.length, hits.length >= 2 ? 'PASS' : 'FAIL');
"
```
PASS: `acid entries: N PASS` where N >= 2.
FAIL: N < 2. Indicates alias_index Pass 1 did not produce multi-match entries for disambiguated nicks.

**V6. Clan prefix present in alias_index (at least one clan with a prefix):**
```
bun -e "
const p = JSON.parse(require('fs').readFileSync('apps/qw-oracle/data/l2-primer/2026-05-04.json','utf8'));
const prefixEntries = Object.keys(p.alias_index).filter(k => k.startsWith('['));
console.log('bracket-prefix entries:', prefixEntries.length, prefixEntries.length > 0 ? 'PASS' : 'FAIL');
"
```
PASS: at least one `[TAG]`-style key in alias_index.
FAIL: no bracket keys. Indicates clan prefix population failed in Phase 3 or alias_index Pass 2 (clan tokens) did not run.

**V7. Redirects.json gate (Phase 0 dependency):**
```
cat apps/qw-oracle/data/wiki-snapshots/2026-05-04/redirects.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('redirects:', len(d), 'PASS (Phase 0 shipped)' if len(d) > 0 else 'ADVISORY: redirects.json empty -- alias_index missing redirect-derived aliases; Phase 0 must ship before final primer')"
```
PASS: `redirects: N PASS (Phase 0 shipped)` where N >= 900.
ADVISORY (not blocking): `redirects.json empty` -- the primer still works for non-redirect-based aliases; Phase 0 must complete and primer re-generated before the L2 reconstruction arc begins.

---

## Outputs to next phase

**This is the final phase of the arc. There is no Phase 8.**

State at arc completion:
- `community.players` (5,903 rows), `community.clans` (822 rows), `community.tournaments` (~627 rows), `community.player_clan_eras` (populated from Phase 5), `community.tournament_results` (populated from Phase 5).
- `apps/qw-oracle/curated/player-notes/`, `curated/clan-notes/`, `curated/tournament-notes/` contain the tuned sets of substantive markdown notes.
- Ten new MCP tools operational (Phase 6): search_players, lookup_player, get_player_note, search_clans, lookup_clan, get_clan_note, search_tournaments, lookup_tournament, get_tournament_note, lookup_by_nick.
- `apps/qw-oracle/data/l2-primer/2026-05-04.json` -- the primer artifact consumed by the L2 corpus reconstruction arc (external consumer).

The L2 corpus reconstruction arc (`docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md`) is the next arc to execute. It consumes the primer artifact as its Stage 0 input. The arc planner for L2 reconstruction reads the primer artifact to confirm its shape before drafting Stage 0 phases; the primer is the handoff artifact from this arc to the next.

The orchestrator handoff for this arc lands at `docs/superpowers/parking/2026-05-04-qwiki-community-reference-orchestrator-handoff.md` (separate planner-session task; not written in this phase).

---

## Open questions / deferred items

**Q1. Primer artifact gitignore vs commit.**
- **Question:** Should `apps/qw-oracle/data/l2-primer/` be committed to git or gitignored? The primer is a large generated artifact (~3-5 MB). The wiki snapshot (`data/wiki-snapshots/`) decision was made in Phase 0 (commit, compresses to ~10 MB). The primer is similarly compressible and historically valuable (tracks what the L2 reconstruction arc used as its recognition input).
- **Default chosen for now:** commit, following the same rationale as Phase 0's snapshot commit decision. If the operator prefers gitignore (disk space or CI artifact concerns), add `apps/qw-oracle/data/l2-primer/` to `.gitignore` during Task 6 instead.
- **Who can resolve:** operator before or during Task 6.

**Q2. Alias_index key case-sensitivity for interactive use.**
- **Question:** The primer's `alias_index` is lowercase-keyed for player/tournament tokens (case-folded). Clan bracket-prefixes like `[TVS]` are stored verbatim (mixed-case preserved). The L2 reconstruction analyzer LLM receives both; its lookup strategy (case-sensitive vs case-insensitive match against chat text) is its own concern. However, if the analyzer performs exact-string lookups against the alias_index keys, it must lowercase the chat token before lookup (except for bracket-prefixed clan tags, which are case-sensitive in chat). This lookup contract should be documented in the primer's generated JSON header or in the L2 arc's Stage 0 phase MD.
- **Default chosen for now:** documented in the primer JSON via a top-level `"alias_index_notes"` field (one paragraph prose; included in the schema_version 1 output by `build.ts`). Phase 7 does not prescribe the analyzer's implementation.
- **Who can resolve:** L2 arc planner (Pass 2) when Stage 0 shape is settled.

**Q3. Primer re-build cadence and automation.**
- **Question:** v1 is manual (operator runs `bun scripts/build-l2-primer/index.ts --date <date>` after each Phase 2-4 re-load). Should a future arc automate this (e.g., trigger primer rebuild on Phase 2 completion)?
- **Default chosen for now:** manual. Future ops concern; document in `scripts/build-l2-primer/CLAUDE.md`.
- **Who can resolve:** future arc / operator when quarterly re-scrape automation lands.

**Q4. D18 frontmatter drift cross-check (optional v1).**
- **Question:** D18 notes that Phase 6 MCP retrieval could flag drift between the row and note frontmatter. Phase 7's `build.ts` loads note frontmatter for extra alias signal. Should it also log drift (e.g., frontmatter `nationality_iso` != row `nationality_iso`)?
- **Default chosen for now:** log drift as advisory (stderr, not fatal) but do not abort. A note frontmatter that drifts from the row is a data-quality signal worth surfacing, but it should not break the primer build. The drift log feeds back to the Phase 2/3/4 emitters for correction in the next re-scrape cycle.
- **Who can resolve:** executor can implement the drift log inline in `build.ts`; it is a low-effort addition.

**Q5. Slice of `community.player_clan_eras` for members_active_in_era.**
- **Question:** The primer's `clans[].members_active_in_era` field is a list of player display_names associated with a clan via `community.player_clan_eras`. For large clans this could be hundreds of members. Should the primer cap the list per clan?
- **Default chosen for now:** cap at 50 members per clan, ordered by most-recent era start_year DESC. The recognition signal (this nick was associated with this clan) is most valuable for recent/active members. A 50-member cap keeps the JSON manageable without losing meaningful recognition signal.
- **Who can resolve:** executor in Task 3; the cap is a one-line parameter in the members query.

---

## Recovery (if verification fails)

**V1 (TypeScript errors):**
Run `bunx tsc --noEmit 2>&1 | head -30` to identify the file. Most likely cause: import path mismatch between `build-l2-primer/` scripts and `shared/db.ts` or `serve/mcp/src/types.ts`. The primer scripts import postgres-js db from `apps/qw-oracle/shared/db.ts`; verify the relative `../..` navigation from `scripts/build-l2-primer/` reaches `shared/` correctly.

**V2 (test failure):**
Check whether the failure is in `alias-index.test.ts` (pure logic, no DB) or `build.test.ts` (DB-seeded). If alias-index, the logic has a case-folding or multi-match merging bug -- fix in `alias-index.ts`. If build.test, the most likely cause is slug format mismatch (the seeded slug doesn't match what the test assertions expect). Read `scripts/load-community/players/parse.ts` to verify the slugify logic before adjusting the test seed.

**V3 (primer artifact missing):**
Check the `build-l2-primer/index.ts` exit code and stderr output. If `--force` was not passed and a prior partial run left a file, the script refuses to overwrite -- pass `--force` to re-run.

**V4 (player missing from primer):**
Run `SELECT slug, display_name, nationality_iso FROM community.players WHERE display_name ILIKE 'milton'` to confirm the row exists in the DB. If the row is absent, Phase 2 did not ship correctly. If the row exists but the primer misses it, the SQL query in `build.ts` has a filter bug (check for an accidental `WHERE is_substantive = TRUE` that would exclude stubs like Bomkia).

**V5 (acid multi-match missing):**
Check `alias-index.ts` Pass 1 logic. The display_name `'Acid'` must be lowercased to `'acid'` and added to the index for each of the three Acid player slugs. If all three have `display_name = 'Acid'`, the merge step must accumulate all three into one array. Verify the implementation does not clobber earlier entries with the same lowercased key.

**V6 (no bracket-prefix entries in alias_index):**
Run `SELECT count(*) FROM community.clans WHERE prefix IS NOT NULL AND prefix != ''` to confirm clans have prefixes. If count > 0, the bug is in `alias-index.ts` Pass 2 (clan prefix token not added). If count = 0, Phase 3's clan parser did not populate the prefix field -- investigate Phase 3's parse output for the `Clan-info.prefix` field.

---

## Verification sub-agent dispatch

After drafting, the following sub-agent brief was dispatched (Explore, Sonnet medium):

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-7-l2-primer.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
Read the design spec: /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md
Read the L2 spec (the primer consumer): /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md
Read phase-6-mcp-tools.md (for MCP tool surface Phase 7 builds on): /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-6-mcp-tools.md (tasks section, first 80 lines)

Then verify, file-by-file:

1. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL.

2. Every CREATE TABLE / ALTER TABLE / CREATE INDEX in this phase:
   - None expected -- Phase 7 ships no schema migration (D15 confirmed: no new migration).
   - Verify the phase MD does not sneak in a CREATE TABLE statement.

3. Every reference to a wiki snapshot artifact:
   - Verify `apps/qw-oracle/data/wiki-snapshots/2026-05-04/redirects.json` exists.
   - Verify `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Milton.json` exists.
   - Verify the five reference player articles are present.

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm `import.meta.main` guards (if used) are valid (Bun-supported).
   - Confirm output discipline (D13): no emoji, ASCII-only in phase MD text.

5. Every reference to existing code (load-knowledge/, serve/mcp/, db/):
   - Verify `apps/qw-oracle/shared/db.ts` exists.
   - Verify `apps/qw-oracle/serve/mcp/src/types.ts` exists (for Phase 7 to NOT modify -- confirm phase MD does not claim to modify it).
   - Verify `apps/qw-oracle/SCHEMA.md` exists.

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode.
   - Flag tasks coded as `inline` that involve code synthesis.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm F7, F12 exist.
   - Confirm Q6 reference aligns with phase-6-mcp-tools.md content.

8. Primer shape decisions:
   - Confirm the phase MD documents WHY direct DB queries (not MCP tools).
   - Confirm the phase MD documents the output location decision rationale.
   - Confirm the L2 spec was consulted and the gap (sparse Stage 0 section) is called out.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing voice. Flag any.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
