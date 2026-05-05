# Phase 1 -- curated/ rename + community schema migration

> **Drafter checklist:**
> 1. Read `decisions.md` (full) -- done.
> 2. Read `review-findings.md` -- no prior findings; table is empty.
> 3. Read spec "Schema" + "Storage / curated layer reframe" + Phase 1 row in phase-decomposition table -- done.
> 4. Wiki snapshot not directly consumed this phase; no sample articles needed.
> 5. Read `scripts/load-concepts/`, `db/migrations/`, `serve/mcp/src/` -- done.
> 6. Verification sub-agent dispatched after drafting.

---

## Goal

Phase 1 has two coupled deliverables that must land together in a single commit:

(a) Move `apps/qw-oracle/concept-notes/` to `apps/qw-oracle/curated/concept-notes/` and
    add three empty sibling directories (`curated/player-notes/`, `curated/clan-notes/`,
    `curated/tournament-notes/`). Update every code reference that points at the old path.

(b) Apply migration 008, which creates the `community` schema and its five tables:
    `community.players`, `community.clans`, `community.tournaments`,
    `community.player_clan_eras`, `community.tournament_results`.

At the phase boundary the system is runnable: existing concept-note retrieval via the
`get_concept_note` MCP tool works unchanged (it reads Postgres, not the filesystem), the
`load-concepts` CLI can walk the new path and upsert successfully, and all five community
tables exist and are empty.

---

## Inputs from previous phase

- Phase 0 complete: snapshot is finalized (slug-collision fix + redirect refetch applied),
  commit policy decided (gitignore or committed), manifest is current.
- `qw_oracle` Postgres database is accessible (`DATABASE_URL` set) with migrations 001-007
  applied.
- `bunx tsc --noEmit` is clean on the pre-rename codebase.

---

## Files touched

### Created

```
apps/qw-oracle/curated/                               # new top-level curated/ directory
apps/qw-oracle/curated/concept-notes/                 # moved from concept-notes/ (git mv)
apps/qw-oracle/curated/player-notes/.gitkeep          # empty placeholder; git tracks the dir
apps/qw-oracle/curated/clan-notes/.gitkeep            # empty placeholder
apps/qw-oracle/curated/tournament-notes/.gitkeep      # empty placeholder
apps/qw-oracle/db/migrations/008_community_schema.sql # migration: community schema + 5 tables
```

### Modified

```
apps/qw-oracle/scripts/load-concepts/index.ts                    # CONCEPTS_DIR path update
apps/qw-oracle/scripts/load-concepts/parse.ts                    # CONCEPT_LINK_RE comment + regex update
apps/qw-oracle/scripts/load-concepts/parse.test.ts               # add new curated/ form test
apps/qw-oracle/scripts/load-concepts/CLAUDE.md                   # path reference update
apps/qw-oracle/CLAUDE.md                                         # subsystem-scope table row + always-on rules
apps/qw-oracle/OVERVIEW.md                                       # Layer 3 map entry + task-routing table
apps/qw-oracle/VISION.md                                         # Layer 3 description
apps/qw-oracle/README.md                                         # Layer 3 bullet
apps/qw-oracle/docs/arc-history.md                               # concept-notes/ path in history entry
apps/qw-oracle/docs/entity-types.md                              # kmap note path reference
apps/qw-oracle/concept-notes/OPERATIONS.md                       # prose self-reference path update (post-git-mv: curated/concept-notes/OPERATIONS.md)
apps/qw-oracle/concept-notes/CLAUDE.md                           # prose self-reference path update (post-git-mv: curated/concept-notes/CLAUDE.md)
apps/qw-oracle/concept-notes/_gap-report.md                      # three path references updated (post-git-mv: curated/concept-notes/_gap-report.md)
apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md          # Layer 3 path reference
apps/qw-oracle/db/migrations/005_layer3_concepts.sql             # header comment path reference (comment only, not functional SQL)
apps/qw-oracle/scripts/load-knowledge/review/prior-walks.ts      # comment-only path reference
apps/qw-oracle/SCHEMA.md                                         # add community schema section
OVERVIEW.md                                                       # root monorepo integration diagram (concept-notes/ in ASCII diagram)
```

**Note on moved files (CLAUDE.md, OPERATIONS.md, _gap-report.md):** after `git mv`, these
files live under `curated/concept-notes/`. Their prose body contains self-referential paths
(`apps/qw-oracle/concept-notes/`) that describe where they live. Task 2 updates those prose
paths to `apps/qw-oracle/curated/concept-notes/`. The paths are descriptive text only --
no loader reads them as filesystem paths -- but they would be stale and confusing if left
unchanged.

**Note on skills:** `~/.claude/skills/guide-rewrite/SKILL.md` and sibling skill files
reference `apps/qw-oracle/concept-notes/`. These are user-global skill files outside the
monorepo. They are NOT updated in this phase -- they reference a stable concept-note surface
that still works post-rename (the MCP tool name and slug contract are unchanged). A follow-up
update to skill files is tracked as an advisory in Open questions.

### Deleted

```
apps/qw-oracle/concept-notes/                          # deleted as a root directory (content moves to curated/concept-notes/ via git mv)
```

---

## Tasks

### Task 1 -- git mv concept-notes/ to curated/concept-notes/

**Goal:** Physically relocate the concept-notes directory and create three empty sibling
directories under curated/.

**Files:**
- `apps/qw-oracle/concept-notes/` (source; deleted)
- `apps/qw-oracle/curated/concept-notes/` (destination; created)
- `apps/qw-oracle/curated/player-notes/.gitkeep`
- `apps/qw-oracle/curated/clan-notes/.gitkeep`
- `apps/qw-oracle/curated/tournament-notes/.gitkeep`

**Steps:**
- [ ] From repo root, run:
  ```
  git mv apps/qw-oracle/concept-notes apps/qw-oracle/curated/concept-notes
  ```
- [ ] Create the three empty sibling directories with gitkeep placeholders:
  ```
  touch apps/qw-oracle/curated/player-notes/.gitkeep
  touch apps/qw-oracle/curated/clan-notes/.gitkeep
  touch apps/qw-oracle/curated/tournament-notes/.gitkeep
  git add apps/qw-oracle/curated/player-notes/.gitkeep
  git add apps/qw-oracle/curated/clan-notes/.gitkeep
  git add apps/qw-oracle/curated/tournament-notes/.gitkeep
  ```

**Verification:**
```
ls apps/qw-oracle/curated/
# PASS: lists concept-notes/  player-notes/  clan-notes/  tournament-notes/

ls apps/qw-oracle/curated/concept-notes/
# PASS: lists CLAUDE.md  OPERATIONS.md  README.md  _gap-report.md  *.md (9 note files)

ls apps/qw-oracle/concept-notes 2>&1
# PASS: "No such file or directory"

git status | grep concept-notes
# PASS: shows renames (old -> curated/concept-notes/...) with no untracked deletions
```

**Execution mode:** inline -- pure filesystem + git operations, no code synthesis.

---

### Task 2 -- update all path references from concept-notes/ to curated/concept-notes/

**Goal:** Every code reference, doc reference, and comment that points at the old
`concept-notes/` path is updated to `curated/concept-notes/`.

**Files:** all Modified files except `SCHEMA.md` (handled in Task 4).

**Steps:**
- [ ] Update `apps/qw-oracle/scripts/load-concepts/index.ts`:
  - Line 3 comment: change `concept-notes/*.md` to `curated/concept-notes/*.md`.
  - Line 18 `CONCEPTS_DIR`: change `'concept-notes'` to `'curated', 'concept-notes'`
    (add one more `resolve` segment so the path resolves correctly from `__dirname`).

  Full updated lines:
  ```ts
  // CLI dispatcher. Walks curated/concept-notes/*.md, parses, runs body-link drift check,
  ```
  ```ts
  const CONCEPTS_DIR = resolve(__dirname, '..', '..', 'curated', 'concept-notes');
  ```

- [ ] Update `apps/qw-oracle/scripts/load-concepts/parse.ts`:
  - Update the two comment lines (24-25) describing CONCEPT_LINK_RE body-link patterns:
    ```ts
    //   [text](curated/concept-notes/<slug>.md)   - relative from the app root
    //   [text](<slug>.md)                          - sibling reference within curated/concept-notes/
    ```
  - Update the regex `CONCEPT_LINK_RE` to accept both the old path (backward-compat for
    any existing note that has not been updated yet) and the new path:
    ```ts
    const CONCEPT_LINK_RE = /\(\s*(?:(?:curated\/)?concept-notes\/)?([a-z0-9][a-z0-9-]*)\.md\s*(?:#[^)]*)?\)/g;
    ```
    **Rationale for backward-compat regex:** existing note bodies may contain links using
    the old `concept-notes/` prefix. The regex accepts all three forms:
    `curated/concept-notes/<slug>.md`, `concept-notes/<slug>.md` (legacy), and `<slug>.md`
    (sibling). The loader warns on undeclared links regardless of which prefix was used;
    no note functionality changes.

- [ ] Update `apps/qw-oracle/scripts/load-concepts/parse.test.ts`:
  - Tests that assert against the string `concept-notes/<slug>.md` must continue to pass
    because the updated regex is backward-compatible (the old form still matches). No test
    string changes required for existing tests.
  - Add one new test asserting `curated/concept-notes/<slug>.md` also matches:
    ```ts
    test('matches [text](curated/concept-notes/<slug>.md) pattern', () => {
      const body = 'See [weapon scripts](curated/concept-notes/weapon-scripts.md) for the full story.';
      const links = extractBodyConceptLinks(body);
      expect(links).toEqual(['weapon-scripts']);
    });
    ```

- [ ] Update `apps/qw-oracle/scripts/load-concepts/CLAUDE.md`:
  - Line 3: `Walks \`apps/qw-oracle/curated/concept-notes/*.md\``
  - Body-link drift check section: update example link patterns to include new path form.

- [ ] Update `apps/qw-oracle/CLAUDE.md`:
  - Subsystem-scope table row: change
    `| \`concept-notes/\` | \`concept-notes/CLAUDE.md\` | ...`
    to
    `| \`curated/\` | `curated/concept-notes/CLAUDE.md` | Layer 3 curated knowledge layer: concept-notes/ (existing), player-notes/, clan-notes/, tournament-notes/ (new this arc) |`
  - Any other inline reference to `concept-notes/` path updated to `curated/concept-notes/`.

- [ ] Update `apps/qw-oracle/OVERVIEW.md`:
  - Layer 3 description: change `concept-notes/` references to `curated/` and
    `curated/concept-notes/`.
  - Task-routing table: change `concept-notes/` path references to new paths.

- [ ] Update `apps/qw-oracle/VISION.md`:
  - Layer 3 bullet: update `concept-notes/README.md` reference to
    `curated/concept-notes/README.md`.

- [ ] Update `apps/qw-oracle/README.md`:
  - Layer 3 bullet: update `concept-notes/` to `curated/concept-notes/`.

- [ ] Update `apps/qw-oracle/docs/arc-history.md`:
  - The history entry for concept-notes establishment: update `concept-notes/` to
    `curated/concept-notes/` (this is historical prose; keep the original event description
    accurate but update the path so it points to where the files now live).

- [ ] Update `apps/qw-oracle/docs/entity-types.md`:
  - Line 363: update path `apps/qw-oracle/concept-notes/kmap-legacy-keymap-system.md` to
    `apps/qw-oracle/curated/concept-notes/kmap-legacy-keymap-system.md`.

- [ ] Update `apps/qw-oracle/curated/concept-notes/CLAUDE.md` (post-move):
  - Line 1 heading: `# qw-oracle/curated/concept-notes/`
  - Body: update self-referential path references from `apps/qw-oracle/concept-notes/` to
    `apps/qw-oracle/curated/concept-notes/`.

- [ ] Update `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` (post-move):
  - Heading and body: update `apps/qw-oracle/concept-notes/` to
    `apps/qw-oracle/curated/concept-notes/` throughout.
  - Archive path on line 178: `curated/concept-notes/_archive/`.

- [ ] Update `apps/qw-oracle/curated/concept-notes/_gap-report.md` (post-move):
  - Update three `apps/qw-oracle/concept-notes/` path references to
    `apps/qw-oracle/curated/concept-notes/`.

- [ ] Update `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`:
  - Line 375: update `concept-notes/OPERATIONS.md` to `curated/concept-notes/OPERATIONS.md`.

- [ ] Update `apps/qw-oracle/db/migrations/005_layer3_concepts.sql`:
  - Line 4 comment: update `apps/qw-oracle/concept-notes/*.md` to
    `apps/qw-oracle/curated/concept-notes/*.md`.
  - **Functional SQL is unchanged.** This is a comment-only update. Do NOT alter the SQL
    statements themselves (append-only migration rule, D15).

- [ ] Update root `apps/qw-oracle/scripts/load-knowledge/review/prior-walks.ts`:
  - Line 14 comment: update `concept-notes` mention to `curated/concept-notes`.

- [ ] Update root `/home/paradoks/projects/quakeworld/OVERVIEW.md`:
  - The ASCII integration diagram line referencing `concept-notes/` (line 67 in current
    file): update to `curated/`.

**Verification:**
```
grep -r "concept-notes" apps/qw-oracle/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "curated/concept-notes" | grep -v "_archive"
# PASS: no output (every TS/JS reference is updated or backward-compat regex literal)

grep -rn "apps/qw-oracle/concept-notes" apps/qw-oracle/ --include="*.md" 2>/dev/null
# PASS: no output (all doc paths updated)

grep -n "concept-notes" OVERVIEW.md
# PASS: no output (root OVERVIEW.md diagram updated)

bun test apps/qw-oracle/scripts/load-concepts/parse.test.ts
# PASS: all tests pass including new curated/ form test
```

**Execution mode:** subagent (Sonnet medium) -- multi-file path-rename sweep across 15+
files spanning TS code, comments, regex, and docs; synthesis-light but scope-wide enough
that a focused subagent context avoids executor context bloat.

---

### Task 3 -- write migration 008: community schema + 5 tables

**Goal:** Produce `apps/qw-oracle/db/migrations/008_community_schema.sql` with the
`community` schema and all five tables per D2, D5, D9, D10, D15.

**Files:**
- `apps/qw-oracle/db/migrations/008_community_schema.sql` (created)

**Steps:**
- [ ] Create `apps/qw-oracle/db/migrations/008_community_schema.sql` with the following
  content (inline below; subagent verifies column types + FK conventions against prior
  migrations + spec):

```sql
-- apps/qw-oracle/db/migrations/008_community_schema.sql
-- Phase 1 (QWiki community-reference arc): community schema + placeholder tables.
--
-- D2: community schema is separate from L1 (different lifecycle).
-- D5: is_substantive (recognition signal) and has_note (prose-content flag) are
--     independent booleans on every row table. Do not merge them.
-- D9: community.tournaments ships with placeholder columns only; tournament-specific
--     columns (year, mode, format, etc.) land in migration 009 post-Phase-4 pilot.
-- D10: source TEXT NOT NULL on cross-link tables; CHECK constraints enforce the
--      enum values defined in decisions.md.
-- D15: append-only. Never edit this file after it is applied.

CREATE SCHEMA IF NOT EXISTS community;

-- ---------------------------------------------------------------------------
-- community.players
-- Every player gets a row (recognition signal). Notes are emitted only for
-- entries with has_note=true (unique prose content the schema cannot carry).
-- is_substantive drives the L2 corpus primer nick-recognition list (D5, D6).
-- ---------------------------------------------------------------------------
CREATE TABLE community.players (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  display_name      TEXT,
  aliases           TEXT[],
  real_name         TEXT,
  nationality       TEXT,
  nationality_iso   TEXT,
  current_clan      TEXT,
  active_year_start INT,
  active_year_end   INT,
  status            TEXT
                      CHECK (status IS NULL
                             OR status IN ('Active', 'Retired', 'Inactive', 'Quit', 'unknown')),
  community_roles   TEXT[],
  has_note          BOOLEAN NOT NULL DEFAULT FALSE,
  is_substantive    BOOLEAN NOT NULL DEFAULT FALSE,
  is_stub           BOOLEAN NOT NULL DEFAULT TRUE,
  source_template   TEXT
                      CHECK (source_template IS NULL
                             OR source_template IN ('infobox_player', 'player_info',
                                                    'bullet_prose', 'none')),
  source_categories TEXT[],
  wiki_revision_id  BIGINT,
  wiki_fetched_at   TIMESTAMPTZ
);

CREATE INDEX community_players_status      ON community.players (status);
CREATE INDEX community_players_nationality ON community.players (nationality_iso);
CREATE INDEX community_players_is_substantive ON community.players (is_substantive)
  WHERE is_substantive = TRUE;

-- ---------------------------------------------------------------------------
-- community.clans
-- Every clan gets a row. Same two-threshold model as players (D5).
-- ---------------------------------------------------------------------------
CREATE TABLE community.clans (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  prefix            TEXT,
  nationality       TEXT,
  nationality_iso   TEXT,
  founded_year      INT,
  founded_month     INT,
  founded_day       INT,
  founded_by        TEXT,
  disbanded         TEXT,
  status            TEXT
                      CHECK (status IS NULL
                             OR status IN ('Active', 'Inactive', 'Disbanded', 'unknown')),
  irc_channel       TEXT,
  irc_network       TEXT,
  website           TEXT,
  has_note          BOOLEAN NOT NULL DEFAULT FALSE,
  is_substantive    BOOLEAN NOT NULL DEFAULT FALSE,
  is_stub           BOOLEAN NOT NULL DEFAULT TRUE,
  source_template   TEXT
                      CHECK (source_template IS NULL
                             OR source_template IN ('infobox_clan', 'clan_info',
                                                    'bullet_prose', 'none')),
  source_categories TEXT[],
  wiki_revision_id  BIGINT,
  wiki_fetched_at   TIMESTAMPTZ
);

CREATE INDEX community_clans_status            ON community.clans (status);
CREATE INDEX community_clans_nationality       ON community.clans (nationality_iso);
CREATE INDEX community_clans_is_substantive    ON community.clans (is_substantive)
  WHERE is_substantive = TRUE;

-- ---------------------------------------------------------------------------
-- community.tournaments
-- Placeholder columns only per D9. tournament-specific columns land in
-- migration 009 after the Phase 4 pilot surfaces template variants.
-- ---------------------------------------------------------------------------
CREATE TABLE community.tournaments (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  has_note          BOOLEAN NOT NULL DEFAULT FALSE,
  is_substantive    BOOLEAN NOT NULL DEFAULT FALSE,
  is_stub           BOOLEAN NOT NULL DEFAULT TRUE,
  source_template   TEXT,
  source_categories TEXT[],
  wiki_revision_id  BIGINT,
  wiki_fetched_at   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- community.player_clan_eras
-- Clan membership per player, per era. Parsed from TH rows and bullet-prose
-- clan history sections (Phase 5 backfill). clan_slug is nullable when the
-- referenced clan does not resolve to a community.clans row (unrecognized
-- clan name preserved in clan_title). source column per D10.
--
-- PK is a surrogate id (BIGSERIAL). start_year is nullable: bullet-list
-- Clan-history sections (ParadokS-style) routinely lack year information;
-- the parser produces those rows faithfully and the schema accepts them.
-- era_seq preserves source-list order for year-absent rows so the rendered
-- timeline is stable across re-loads. Idempotency on re-load is enforced by
-- the UNIQUE constraint over (player_slug, clan_title, start_year, source) --
-- year-known rows dedupe deterministically; year-absent rows are uncommon
-- and Phase 5 truncates-and-rebuilds the table per re-run regardless.
-- ---------------------------------------------------------------------------
CREATE TABLE community.player_clan_eras (
  id           BIGSERIAL PRIMARY KEY,
  player_slug  TEXT NOT NULL REFERENCES community.players (slug),
  clan_slug    TEXT,
  clan_title   TEXT NOT NULL,
  start_year   INT,
  end_year     INT,
  era_seq      INT,
  source       TEXT NOT NULL
                 CHECK (source IN ('wiki_TH', 'wiki_bullet',
                                   'tournament-archive', 'manual')),
  UNIQUE (player_slug, clan_title, start_year, source)
);

CREATE INDEX community_player_clan_eras_player_slug ON community.player_clan_eras (player_slug);
CREATE INDEX community_player_clan_eras_clan_slug   ON community.player_clan_eras (clan_slug)
  WHERE clan_slug IS NOT NULL;
CREATE INDEX community_player_clan_eras_start_year  ON community.player_clan_eras (start_year)
  WHERE start_year IS NOT NULL;

-- ---------------------------------------------------------------------------
-- community.tournament_results
-- Per-player tournament results. Parsed from achievement lists (Phase 5).
-- tournament_slug is nullable when the referenced tournament does not resolve
-- to a community.tournaments row. source column per D10.
-- No surrogate PK: (player_slug, tournament_title, year, place) is not
-- perfectly unique in the wiki (a player can place at the same tournament
-- in two modes). Using a BIGSERIAL surrogate PK for simplicity; the
-- natural composite is enforced via a unique index only when duplicates
-- surfaced in Phase 5 data turn out to be errors vs real multi-entry data.
-- ---------------------------------------------------------------------------
CREATE TABLE community.tournament_results (
  id               BIGSERIAL PRIMARY KEY,
  player_slug      TEXT NOT NULL REFERENCES community.players (slug),
  tournament_slug  TEXT,
  tournament_title TEXT NOT NULL,
  year             INT,
  place            TEXT,
  mode             TEXT,
  team             TEXT,
  team_flag        TEXT,
  source           TEXT NOT NULL
                     CHECK (source IN ('wiki_achievement', 'wiki_TH',
                                       'tournament-archive', 'manual'))
);

CREATE INDEX community_tournament_results_player_slug      ON community.tournament_results (player_slug);
CREATE INDEX community_tournament_results_tournament_slug  ON community.tournament_results (tournament_slug)
  WHERE tournament_slug IS NOT NULL;
CREATE INDEX community_tournament_results_year             ON community.tournament_results (year);
```

**Verification:**
```
bun apps/qw-oracle/db/migrate.ts
# PASS: logs "[migrate] applying 008_community_schema.sql" with no errors
```

**Execution mode:** subagent (Sonnet medium) -- SQL synthesis with judgment on column
types, FK conventions, CHECK constraint values, and index choices relative to the spec and
prior migration conventions.

---

### Task 4 -- update SCHEMA.md with community schema section

**Goal:** Document the five community tables in `SCHEMA.md` so the schema reference is
current alongside the migration.

**Files:**
- `apps/qw-oracle/SCHEMA.md`

**Steps:**
- [ ] Append a new top-level section "## Community schema" to `SCHEMA.md` after the existing
  content. The section documents:
  - The schema purpose (D2: separate lifecycle from L1).
  - A table map for the five new tables.
  - A per-table entry for each of the five tables with column list, PK, FK constraints,
    and index notes -- mirroring the style of existing per-table entries in the file.
  - A note that `community.tournaments` is placeholder-only pending Phase 4 pilot (D9).
  - A note that `source` CHECK values on cross-link tables are fixed per D10.
  - Update the "Total: 31 tables at schema v18" sentence in the preamble to reflect the
    new total (31 + 5 = 36 tables) and update the schema version if the project tracks a
    version number in SCHEMA.md (verify against live file; schema version may be stored
    separately in the DB, not the doc).

**Verification:**
```
grep -c "community\." apps/qw-oracle/SCHEMA.md
# PASS: >= 5 (one per table name)

grep "community.players\|community.clans\|community.tournaments\|community.player_clan_eras\|community.tournament_results" apps/qw-oracle/SCHEMA.md | wc -l
# PASS: >= 5
```

**Execution mode:** subagent (Sonnet medium) -- doc synthesis shaped by the existing
SCHEMA.md style conventions; requires reading the file to match tone and table-entry format.

---

### Task 5 -- run migration locally + verify tables exist and are empty

**Goal:** Confirm migration 008 applies cleanly and all five community tables are reachable.

**Files:** none (verification only).

**Steps:**
- [ ] Run migration:
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/db/migrate.ts
  ```
- [ ] Verify tables exist and are empty:
  ```sql
  SELECT schemaname, tablename, pg_total_relation_size(schemaname||'.'||tablename) AS bytes
  FROM pg_tables
  WHERE schemaname = 'community'
  ORDER BY tablename;
  ```
  Expected rows: `clans`, `player_clan_eras`, `players`, `tournament_results`, `tournaments`.
- [ ] Verify row counts are zero:
  ```sql
  SELECT 'players' AS t, count(*) FROM community.players
  UNION ALL SELECT 'clans',              count(*) FROM community.clans
  UNION ALL SELECT 'tournaments',        count(*) FROM community.tournaments
  UNION ALL SELECT 'player_clan_eras',   count(*) FROM community.player_clan_eras
  UNION ALL SELECT 'tournament_results', count(*) FROM community.tournament_results;
  ```
  Expected: all five rows show count = 0.
- [ ] Verify migration is tracked:
  ```sql
  SELECT filename, applied_at FROM schema_migrations WHERE filename = '008_community_schema.sql';
  ```
  Expected: one row with current timestamp.

**Verification:** see Steps above; all queries are YES/NO probes.

**Execution mode:** inline -- deterministic shell + SQL, no synthesis.

---

### Task 6 -- bunx tsc --noEmit + concept-note retrieval smoke test

**Goal:** Confirm TypeScript is clean post-rename and that load-concepts can walk the new
path and the MCP concept retrieval still returns results.

**Files:** none (verification only).

**Steps:**
- [ ] Run TypeScript check from the `apps/qw-oracle/` directory:
  ```
  cd apps/qw-oracle && bunx tsc --noEmit
  ```
- [ ] Run the load-concepts CLI against the moved directory (dry observation -- do not
  commit any DB changes if concepts are already loaded; this is a path-correctness probe):
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-concepts/index.ts
  ```
  Expected: `[load-concepts] loaded N, skipped 3, warnings 0` where N >= 9 (the 9
  concept-note MD files that have slugs; README.md, OPERATIONS.md, _gap-report.md are
  skipped because they have no `slug:` frontmatter field).
- [ ] If the MCP server is running locally, call:
  ```
  curl -s -X POST http://localhost:3000/mcp \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_concept_note","arguments":{"id":"weapon-scripts"}},"id":1}'
  ```
  Expected: `match_quality: "strong"` + non-empty `body`.
  If MCP server is not running locally, this step is optional; the load-concepts CLI pass
  is sufficient for path-correctness verification.

**Verification:**
```
bunx tsc --noEmit           # PASS: exits 0, no output
# PASS condition: load-concepts logs "loaded N, skipped 3" with N >= 9
# FAIL condition: "Error: ENOENT: no such file or directory" -> CONCEPTS_DIR update missed in index.ts
```

**Execution mode:** inline -- deterministic CLI invocations, no synthesis.

---

## Verification (phase boundary)

Run these commands after all tasks complete. Each has a PASS/FAIL condition.

**V1. curated/ directory structure:**
```
ls apps/qw-oracle/curated/
```
PASS: lists exactly `concept-notes  clan-notes  player-notes  tournament-notes`.
FAIL: `concept-notes` is missing or `curated/` does not exist.

**V2. Old path is gone:**
```
ls apps/qw-oracle/concept-notes 2>&1
```
PASS: `ls: cannot access '...concept-notes': No such file or directory`.
FAIL: directory still exists.

**V3. No stale concept-notes references in TS/JS code:**
```
grep -r "concept-notes" apps/qw-oracle/ --include="*.ts" 2>/dev/null | grep -v "curated/concept-notes"
```
PASS: no output.
FAIL: any line printed (stale path in code).

**V4. Migration applied:**
```sql
SELECT filename FROM schema_migrations WHERE filename = '008_community_schema.sql';
```
PASS: one row returned.
FAIL: zero rows (migration did not apply).

**V5. All five community tables exist:**
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'community' ORDER BY tablename;
```
PASS: exactly 5 rows: `clans`, `player_clan_eras`, `players`, `tournament_results`, `tournaments`.
FAIL: fewer than 5 rows or schema not found.

**V6. Community tables are empty:**
```sql
SELECT count(*) FROM community.players;
SELECT count(*) FROM community.clans;
SELECT count(*) FROM community.tournaments;
SELECT count(*) FROM community.player_clan_eras;
SELECT count(*) FROM community.tournament_results;
```
PASS: all return 0.
FAIL: any returns > 0 (unexpected pre-population).

**V7. TypeScript clean:**
```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0, no output.
FAIL: type errors printed.

**V8. load-concepts walks new path:**
```
DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-concepts/index.ts
```
PASS: `[load-concepts] loaded N, skipped 3, warnings 0` with N >= 9.
FAIL: ENOENT error or loaded = 0.

---

## Outputs to next phase

- `apps/qw-oracle/curated/` exists with four subdirectories; `concept-notes/` content
  is moved; `player-notes/`, `clan-notes/`, `tournament-notes/` are empty placeholders.
- Migration 008 is applied; all five `community.*` tables exist and are empty.
- `bunx tsc --noEmit` is clean.
- `load-concepts` walks `curated/concept-notes/` successfully.
- SCHEMA.md documents the five new tables.
- Phase 2 can begin loading `community.players` rows.

---

## Open questions / deferred items

**Q1. Backward-compat regex in parse.ts -- should old `concept-notes/` link form be warned?**
- **Question:** The updated `CONCEPT_LINK_RE` accepts both `curated/concept-notes/<slug>.md`
  and the old `concept-notes/<slug>.md` silently. Should the loader emit a deprecation
  warning when it encounters the old form in note bodies?
- **Default chosen for now:** No warning emitted. The 9 existing notes do not currently
  use body links to other notes (none have `related_concepts:` set), so the old form is
  theoretically dead. Adding a deprecation warning would fire on hypothetical future notes
  using the old form, not current ones. Silent acceptance is clean.
- **Who can resolve:** operator, before or during Phase 2. Low priority.

**Q2. User-global skill files reference old concept-notes path.**
- **Question:** `~/.claude/skills/guide-rewrite/SKILL.md`,
  `~/.claude/skills/extraction-review/SKILL.md`, and `~/.claude/skills/docs-check/SKILL.md`
  reference `apps/qw-oracle/concept-notes/`. These files are outside the monorepo and not
  updated in this phase. The skills will still function (they create files at a path; after
  Phase 1 that path no longer exists, so guide-rewrite would write notes to the wrong
  location).
- **Default chosen for now:** Flagged here as a follow-up. Skills are not updated in this
  phase to avoid scope creep; guide-rewrite skill is rarely used, and the operator drives
  it manually.
- **Who can resolve:** operator, as a quick skill update in the same session after Phase 1
  ships. Do not defer past Phase 1 completion -- any guide-rewrite invocation after Phase 1
  would write to a non-existent path.

**Q3. start_year NOT NULL on community.player_clan_eras PK. RESOLVED 2026-05-05.**
- **Original question:** Composite PK `(player_slug, clan_title, start_year)` forced
  `start_year NOT NULL`, blocking insertion of year-absent bullet-list clan-history rows.
- **Resolution:** Surfaced during Phase 2 drafting (Phase 2 Q1). Phase 1 schema
  amended before execution: surrogate PK `id BIGSERIAL`, nullable `start_year`, new
  `era_seq INT` for list-order preservation, `UNIQUE (player_slug, clan_title, start_year,
  source)` for idempotency. Year-absent rows (ParadokS-style flat bullet lists) now insert
  faithfully. No Phase 5 migration needed; no parser filtering required. See
  `review-findings.md` F9 for full evidence trail.

**Q4. community.clans status CHECK values.**
- **Question:** The spec schema does not list allowed `status` values for clans (unlike
  players where `Active | Retired | Inactive | Quit | unknown` is documented). The
  migration uses `('Active', 'Inactive', 'Disbanded', 'unknown')` as a reasonable
  inference from clan lifecycle semantics. If the pilot finds other status values in the
  wiki, the CHECK must be widened via a new migration.
- **Default chosen for now:** `('Active', 'Inactive', 'Disbanded', 'unknown')` in migration
  008. Phase 3 pilot may surface other values; Phase 3 drafter should check and propose a
  009 migration if needed (or note that 009 is reserved for tournament columns per D9 and
  use 010 for clan status widening).
- **Who can resolve:** Phase 3 drafter after pilot. Not a blocker for Phase 1.

**Q5. community.tournament_results PK design -- surrogate vs composite.**
- **Question:** The spec DDL for `tournament_results` has no explicit PK. The migration
  adds a `BIGSERIAL` surrogate PK to avoid edge cases where a player places at the same
  tournament in two modes (e.g., 1on1 and 4on4 at QHlan -- both yield a result row for the
  same player + tournament + year but different mode). A composite PK would need to include
  `mode` and risk missing unmodeled cases.
- **Default chosen for now:** `BIGSERIAL PRIMARY KEY` in migration 008. No unique index on
  the natural composite at this stage; Phase 5 backfill can add one if duplicate detection
  is needed.
- **Who can resolve:** Phase 5 drafter. Not a blocker for Phase 1.

---

## Recovery (if verification fails)

**V2 fails (concept-notes/ still exists):**
Run `git mv apps/qw-oracle/concept-notes apps/qw-oracle/curated/concept-notes` again if
Task 1 was skipped or interrupted. Check `git status` to confirm the rename is staged.

**V3 fails (stale concept-notes path in TS):**
Run `grep -rn "concept-notes" apps/qw-oracle/ --include="*.ts"` to identify the remaining
file. Edit the specific file and update the path. Re-run `bunx tsc --noEmit`.

**V4 fails (migration not applied):**
Ensure `DATABASE_URL` is set. Run `bun apps/qw-oracle/db/migrate.ts` directly. If the
migration file has a SHA mismatch error (modified after apply), that is a D15 violation --
create a corrective 009 migration instead of editing 008.

**V5 fails (community tables missing):**
The `CREATE SCHEMA IF NOT EXISTS community` may have succeeded but a `CREATE TABLE` failed.
Check the migration output for the specific table. Fix the SQL in a new 009 migration (do
not edit 008). Re-run migrate.ts.

**V7 fails (TypeScript errors):**
The most likely cause is `CONCEPTS_DIR` still pointing at the old path or a test file with
an import path that diverged. Run `bunx tsc --noEmit 2>&1 | head -30` to identify the
specific error. Fix the file the error points at.

**V8 fails (load-concepts ENOENT):**
`CONCEPTS_DIR` in `scripts/load-concepts/index.ts` did not update correctly. Verify line
18 reads `resolve(__dirname, '..', '..', 'curated', 'concept-notes')`. The two `..`
segments navigate from `scripts/load-concepts/` up to the app root, then down into
`curated/concept-notes/`.

---

## Verification sub-agent dispatch

After drafting, the following sub-agent brief was dispatched (Explore, Sonnet medium):

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-1-curated-rename.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
Read the design spec section relevant to this phase: /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md

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
   - Verify the path under `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`
     exists.
   - For sample articles cited, spot-check the file actually exists.

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm `import.meta.main` guards (if used) are valid (Bun-supported).
   - Confirm output discipline (D13): no emoji, ASCII-only.

5. Every reference to existing code (load-knowledge/, serve/mcp/, db/):
   - Verify the path exists.
   - Verify the symbol or function name matches.

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode.
   - Flag tasks that are coded as `inline` but involve code synthesis,
     migration writing, or test authoring -- those should be subagent.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm the finding exists.
   - Confirm this phase actually resolves the findings it claims to.

8. Every column / table introduced that is not in `decisions.md` and is not
   already in `apps/qw-oracle/SCHEMA.md`:
   - Flag as potential drift.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing
    voice. Flag any.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
