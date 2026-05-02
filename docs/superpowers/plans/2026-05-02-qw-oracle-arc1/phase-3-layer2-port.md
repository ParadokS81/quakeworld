# Phase 3 - Layer 2 port (Discord-only)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Port the Discord half of the existing chat corpus, plus its derivation pipeline (raw messages -> classified labels -> conversation sessions -> session-level search index), from SQLite + FTS5 to Postgres + tsvector + GIN. IRC is excluded entirely from Arc 1 per `decisions.md` D9-revised: no IRC importer, no IRC parser, no `mirc-logs/` traversal, no mojibake baseline machinery, no `'irc'` value in any CHECK constraint. The legacy `.mjs` Layer 2 ingest pipeline plus the IRC-only scripts are deleted; Discord ingest is rewritten in TypeScript under `apps/qw-oracle/scripts/load-chat/`.

Four port-time hygiene tightenings ride along with this port (see `docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md` issues A2+#3, A1, A3, A4 disposition): (1) `BOT_COMMAND_PATTERNS` dropped from `classify.ts` -- Discord's `author_is_bot` flag is the only bot signal needed; (2) session-builder consumes only `category IN ('chat', 'link')` messages for gap computation and session creation (filter-then-segment), eliminating empty sessions by construction; (3) duplicate `'xd'` removed from `REACTION_WORDS`; (4) `message_labels.session_id` becomes NULLABLE so label rows exist for all imported messages, including bot/reaction/system messages with no parent session. Additionally, a `session_references` table is built from Discord's reply graph (`messages.referenced_message_id`), providing cross-session reply edge counts for Phase 6's `search_solved_issues`.

The `messages.platform` column is preserved with `CHECK (platform = 'discord')`. Dropping the column entirely was the alternative D9-revised allowed; keeping it makes a future widening (Arc 3 reconsideration of IRC after a successful codepage re-import, per `decisions.md` D9-revised paragraph 5) a one-line CHECK change rather than a full schema migration. The same shape is used on `sessions.platform` and `session_search.platform`. tsvector configuration is `'simple'` per D7 because Discord itself carries multi-language content (Swedish, Russian, German handles and snippets) where English stemming is a regression.

The classifier rules and the `GAP_THRESHOLD_MINUTES = 15` session boundary transfer 1:1 from `scripts/process-tier1.mjs`. The `search_solved_issues` MCP tool is NOT ported in this phase (Phase 6 territory); the MCP runtime stays broken at the qw.db layer the same way Phase 2 left it broken at the knowledge.db layer. This carry-forward is by design and ends in Phase 6.

Runnable state at phase boundary: `qw_oracle` holds 7 Layer 2 tables (`messages`, `discord_channels`, `import_log`, `processing_log`, `sessions`, `message_labels`, `session_search`) populated to within 1% of the SQLite Discord-only baseline; `bun test scripts/load-chat/` green; `bunx tsc --noEmit` green; the legacy `.mjs` scripts and `data/qw.db*` files are gone.

## Inputs from previous phase

Phase 2 (Layer 1 port) complete:
- Postgres dev container running at `127.0.0.1:5432`; both `qw_oracle` and `qw_oracle_test` databases exist; Phase 1's `001_init.sql` plus Phase 2's Layer 1 migrations applied to both.
- Migrator (`bun db/migrate.ts`) is appends-only and sha256-verified per file. Phase 1 already landed `db/migrate.ts`, `db/docker-compose.dev.yml`, `db/init/`, and `db/migrations/001_init.sql` (verified 2026-05-02). Phase 2 added the Layer 1 entity / qw-namespace / asset migration files (filename ordinals are Phase 2's call; this phase reserves `004_layer2_chat.sql` and assumes Phase 2 used 002 / 003 for its files).
- `apps/qw-oracle/shared/db.ts` exports the postgres-js singleton; `import { db, closeDb } from '../../shared/db.ts'` works from any script.
- `apps/qw-oracle/package.json` runs everything under Bun (D2). `postgres` is in `dependencies`, `bun-types` is in `devDependencies`, `tsx` is gone (verified 2026-05-02). The legacy `import:discord` / `import:irc` / `stats` script entries still point at the legacy `.mjs` files - Phase 2 left these alone; this phase rewrites or deletes them. `better-sqlite3` may still be listed (Phase 2's call); Task 7 verifies and drops it if present.
- `data/knowledge.db` has been deleted (Phase 2 final task). `data/qw.db` is still present and is this phase's input on the SQLite side: it provides the row-count baseline and the operator-known `discord_channels` seed (4 rows).
- The MCP server (`apps/qw-oracle/serve/mcp/`) is already broken at startup because `serve/mcp/src/db.ts` opens `knowledge.db` via `bun:sqlite` (verified 2026-05-02) and that file is gone. Phase 3 leaves the MCP for Phase 6; this phase only stubs the file so the module is loadable for inspection.

If any of these is not true, stop and resolve at the prior phase before proceeding.

## Files touched

### Created

```
apps/qw-oracle/db/migrations/004_layer2_chat.sql                # hand-written; mirrors qw.db schema (Discord-only) in Postgres dialect, tsvector 'simple' (D7)
apps/qw-oracle/db/seeds/discord_channels.sql                    # hand-written; 4-row seed mirroring current qw.db.discord_channels
apps/qw-oracle/scripts/load-chat/import-discord.ts              # hand-written Bun port of scripts/import-discord.mjs
apps/qw-oracle/scripts/load-chat/classify.ts                    # hand-written; deterministic classifier extracted from process-tier1.mjs
apps/qw-oracle/scripts/load-chat/build-sessions.ts              # hand-written port of scripts/process-tier1.mjs
apps/qw-oracle/scripts/load-chat/build-search-index.ts          # hand-written port of scripts/build-search-index.mjs
apps/qw-oracle/scripts/load-chat/seed-discord-channels.ts       # hand-written; one-shot SQL apply for db/seeds/discord_channels.sql
apps/qw-oracle/scripts/load-chat/build-session-references.ts    # hand-written; builds session_references from messages.referenced_message_id
apps/qw-oracle/scripts/load-chat/import-discord.test.ts         # hand-written
apps/qw-oracle/scripts/load-chat/build-sessions.test.ts         # hand-written
apps/qw-oracle/scripts/load-chat/CLAUDE.md                      # hand-written; subsystem entry doc paralleling scripts/load-knowledge/CLAUDE.md
```

### Modified

```
apps/qw-oracle/package.json                                     # drop import:discord / import:irc / stats mjs entries; add load-chat:* bun entries; verify better-sqlite3 absence
apps/qw-oracle/CLAUDE.md                                        # Layer 2 status section: Discord-only, IRC excluded (D9-revised), tsvector 'simple' (D7)
apps/qw-oracle/serve/mcp/src/db.ts                              # replace `knowledgeDb` + `corpusDb` better-sqlite3 opens with Proxy stubs that throw on first use, naming Phase 6 as the rewire point
```

The MCP `db.ts` stub is the minimum change that lets the module *parse* even though `search_solved_issues` and the entity-lookup tools still cannot answer. Without it, Phase 2's already-broken MCP gets a second kind of broken (`qw.db` is gone) and the operator loses the ability to import the module for inspection. Phase 6 replaces both `knowledgeDb` and `corpusDb` with the postgres-js client. The stub does not "fix" the MCP; it just makes the failure mode a single named assertion instead of a file-not-found.

### Deleted

```
apps/qw-oracle/scripts/import-discord.mjs                       # superseded by scripts/load-chat/import-discord.ts
apps/qw-oracle/scripts/import-irc.mjs                           # IRC excluded from Arc 1 entirely (decisions.md D9-revised)
apps/qw-oracle/scripts/process-tier1.mjs                        # superseded by scripts/load-chat/build-sessions.ts + classify.ts
apps/qw-oracle/scripts/build-search-index.mjs                   # superseded by scripts/load-chat/build-search-index.ts
apps/qw-oracle/scripts/db.mjs                                   # superseded by shared/db.ts (Postgres) + db/migrations/
apps/qw-oracle/scripts/stats.mjs                                # reads qw.db; obsolete after cutover. Stats reproducible via psql against qw_oracle when needed
apps/qw-oracle/scripts/stats-tier1.mjs                          # reads qw.db; obsolete same as stats.mjs
apps/qw-oracle/scripts/search.mjs                               # FTS5-backed exploration script; obsolete (use psql or the eventual eval set)
apps/qw-oracle/scripts/helpdesk-benchmark.mjs                   # reads qw.db; pre-spec exploration; obsolete after cutover
apps/qw-oracle/scripts/helpdesk-coverage.mjs                    # reads qw.db; spiritual ancestor of Phase 8's eval pipeline; obsolete in current shape
apps/qw-oracle/scripts/sample-data.mjs                          # reads qw.db; throwaway POC sampler
apps/qw-oracle/scripts/sample-empty-sessions.mjs                # reads qw.db; throwaway POC sampler
apps/qw-oracle/scripts/sample-for-tier2.mjs                     # reads qw.db; throwaway POC sampler (Tier 2 = Arc 3 enrichment, not driving anything now)
apps/qw-oracle/scripts/sample-helpdesk.mjs                      # reads qw.db; throwaway POC sampler
apps/qw-oracle/scripts/sample-ibh.mjs                           # reads qw.db; throwaway POC sampler (IRC-channel-shaped; doubly obsolete under D9-revised)
apps/qw-oracle/data/qw.db                                       # SQLite Layer 2 store retired; gitignored; deletion is local-only
apps/qw-oracle/data/qw.db-shm                                   # SQLite WAL companion
apps/qw-oracle/data/qw.db-wal                                   # SQLite WAL companion
```

The `kb_commands`, `kb_cvars`, and `kb_facts_import_log` tables in qw.db (~5664 rows total) are pre-spec POC artifacts of an early Layer 1 attempt that predated the split into knowledge.db; nothing in `serve/` or `scripts/` references them. They are not ported. See Open questions.

## Tasks

### Task 1: Migration `004_layer2_chat.sql` (schema port)

**Goal.** Land migration `004_layer2_chat.sql`, mirroring the qw.db Layer 2 schema (`scripts/db.mjs:initSchema` + `:initProcessingSchema` + `:initSearchSchema`) in Postgres dialect with `'simple'` tsvector config (D7) and Discord-only platform CHECK (D9-revised). Drops the IRC-only `network` column.

**Files.** `apps/qw-oracle/db/migrations/004_layer2_chat.sql`. Parent directory `apps/qw-oracle/db/migrations/` already exists from Phase 1 (verified 2026-05-02).

**Steps.**

- [ ] Create `apps/qw-oracle/db/migrations/004_layer2_chat.sql` with the full content below.

```sql
-- apps/qw-oracle/db/migrations/004_layer2_chat.sql
-- Layer 2: Discord chat corpus. IRC excluded entirely in Arc 1 (D9-revised);
-- the platform CHECK locks to 'discord'. Future Arc 3 reconsideration of IRC
-- (after a codepage re-import is shown to be useful) is a one-line CHECK
-- widening here.
--
-- Source-of-truth shape: apps/qw-oracle/scripts/db.mjs (SQLite, retiring in
-- this phase). The 'network' column from the SQLite shape is dropped because
-- it was IRC-only ('quakenet'); without IRC there is nothing to put in it.
--
-- tsvector config is 'simple' (D7): the Discord corpus is mixed-language
-- (Swedish, Russian, German handles and snippets); English stemming would
-- mangle non-English tokens. Layer 1 entity descriptions and Layer 3 chunks
-- stay on 'english' because those are curated English content (different
-- migration files).

-- Raw messages. Per CLAUDE.md "raw is immutable", every imported row is
-- preserved intact; derived processing (sessions, message_labels,
-- session_search) is rebuildable.
CREATE TABLE messages (
  id                    TEXT PRIMARY KEY,         -- Discord snowflake
  platform              TEXT NOT NULL CHECK (platform = 'discord'),
  guild_id              TEXT,                     -- Discord guild snowflake
  channel_name          TEXT NOT NULL,            -- '#helpdesk', '#quakeworld', etc. (with leading '#')
  author_id             TEXT,                     -- Discord user id
  author_name           TEXT NOT NULL,            -- username
  author_display_name   TEXT,                     -- display name where available
  author_is_bot         BOOLEAN NOT NULL DEFAULT FALSE,
  content               TEXT NOT NULL DEFAULT '',
  message_type          TEXT NOT NULL DEFAULT 'message'
                        CHECK (message_type IN ('message', 'action', 'join', 'part', 'quit',
                                                'nick', 'topic', 'system')),
  referenced_message_id TEXT,                     -- reply-to (Discord)
  attachment_count      INTEGER NOT NULL DEFAULT 0,
  attachments_json      JSONB,
  embed_count           INTEGER NOT NULL DEFAULT 0,
  embeds_json           JSONB,
  reaction_count        INTEGER NOT NULL DEFAULT 0,
  reactions_json        JSONB,
  created_at            TIMESTAMPTZ NOT NULL,
  edited_at             TIMESTAMPTZ,
  source                TEXT NOT NULL,            -- 'discord-export' | 'bot-live'
  source_file           TEXT,                     -- original filename
  imported_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_tsv           tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED
);
CREATE INDEX messages_platform_created    ON messages(platform, created_at);
CREATE INDEX messages_channel_created     ON messages(channel_name, created_at);
CREATE INDEX messages_author_created      ON messages(author_name, created_at);
CREATE INDEX messages_message_type        ON messages(message_type);
CREATE INDEX messages_created             ON messages(created_at);
CREATE INDEX messages_content_tsv_gin     ON messages USING GIN (content_tsv);

-- Operator-known Discord channel metadata. Hand-seeded (see seeds/discord_channels.sql);
-- Discord exports do NOT include guild_id at message granularity (verified at
-- /home/paradoks/projects/quake/quad/exports/sample-quakeworld-200.json), so the
-- table is populated separately rather than derived from import.
CREATE TABLE discord_channels (
  channel_name TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  guild_id     TEXT NOT NULL
);

-- Per-file import bookkeeping. Used by importer to skip already-loaded files.
CREATE TABLE import_log (
  id                INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  source_file       TEXT NOT NULL UNIQUE,
  platform          TEXT NOT NULL CHECK (platform = 'discord'),
  channel_name      TEXT,
  message_count     INTEGER NOT NULL DEFAULT 0,
  date_range_start  TIMESTAMPTZ,
  date_range_end    TIMESTAMPTZ,
  imported_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-version processing bookkeeping. process-tier1 used this to skip
-- re-processing when VERSION matched. Port preserves the gate.
CREATE TABLE processing_log (
  id                     INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  version                TEXT NOT NULL,
  channels_processed     INTEGER,
  sessions_created       INTEGER,
  messages_labeled       INTEGER,
  gap_threshold_minutes  INTEGER,
  started_at             TIMESTAMPTZ NOT NULL,
  finished_at            TIMESTAMPTZ
);

-- Conversation sessions: groups of messages forming a discussion, segmented
-- by gap_threshold_minutes of silence. Derived; rebuilt by build-sessions.ts.
CREATE TABLE sessions (
  id                  BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  channel_name        TEXT NOT NULL,
  platform            TEXT NOT NULL CHECK (platform = 'discord'),
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ NOT NULL,
  message_count       INTEGER NOT NULL,
  chat_message_count  INTEGER NOT NULL,
  participant_count   INTEGER NOT NULL,
  participants_json   JSONB,                       -- JSON array of unique author names
  version             TEXT NOT NULL                -- classifier version for regeneration
);
CREATE INDEX sessions_channel_started ON sessions(channel_name, started_at);
CREATE INDEX sessions_started         ON sessions(started_at);

-- Per-message classification + session assignment. Derived; rebuilt by
-- build-sessions.ts. Note: SQLite had `message_id PRIMARY KEY` (1:1
-- message-to-label). Port preserves that shape rather than the legacy plan's
-- PRIMARY KEY (message_id, session_id, category) because the live derivation
-- produces exactly one row per message.
--
-- session_id is NULLABLE: under filter-then-segment, bot/reaction/system
-- messages never start a session, so label rows for those messages are written
-- with session_id IS NULL. Every imported message still has exactly one label
-- row (the "every message has a label" invariant holds); session-scoped queries
-- simply add WHERE session_id IS NOT NULL.
CREATE TABLE message_labels (
  message_id  TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  session_id  BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('chat', 'bot', 'reaction', 'link', 'system')),
  version     TEXT NOT NULL
);
CREATE INDEX message_labels_session   ON message_labels(session_id);
CREATE INDEX message_labels_category  ON message_labels(category);

-- Cross-session reply graph. Built post-segmentation by build-session-references.ts.
-- Each row: source session contains a message that replies to a message in
-- target session (via messages.referenced_message_id). reference_count is the
-- number of such reply edges between the pair. Within-session replies are skipped
-- (source = target). Phase 6's search_solved_issues uses this to surface related
-- sessions when the reply graph crosses a session boundary.
CREATE TABLE session_references (
  source_session_id   BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  target_session_id   BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reference_count     INTEGER NOT NULL,
  PRIMARY KEY (source_session_id, target_session_id),
  CHECK (source_session_id <> target_session_id)
);
CREATE INDEX session_references_target ON session_references(target_session_id);

-- Concatenated chat content per session, indexed for FTS. Replaces SQLite
-- FTS5's session_search VIRTUAL TABLE. Postgres has no FTS5 analogue; we ship
-- a real table populated by build-search-index.ts (TRUNCATE + rebuild,
-- idempotent on inputs). Real table over MATERIALIZED VIEW because (a) FTS5
-- was a real table in the SQLite era so the operator's mental model is
-- "explicit-table indexed by GIN", (b) MATERIALIZED VIEW with CONCURRENTLY
-- refresh requires a UNIQUE index on the result and adds operational surface
-- for no win in Arc 1. Open question 4 in this phase MD names the
-- materialised-view alternative if Phase 6 retrieval latency demands it.
-- tsvector config 'simple' per D7.
CREATE TABLE session_search (
  session_id           BIGINT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  channel_name         TEXT NOT NULL,
  platform             TEXT NOT NULL CHECK (platform = 'discord'),
  started_at           TIMESTAMPTZ NOT NULL,
  participants         JSONB,
  chat_message_count   INTEGER NOT NULL,
  content              TEXT NOT NULL,            -- "<author>: <text>" lines, joined by '\n'
  session_tsv          tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED
);
CREATE INDEX session_search_tsv_gin    ON session_search USING GIN (session_tsv);
CREATE INDEX session_search_channel    ON session_search(channel_name, started_at);
```

The `attachments_json` / `embeds_json` / `reactions_json` / `participants_json` columns become JSONB (matches Phase 2's dialect rule for `*_json` SQLite columns; postgres-js auto-casts JS arrays / objects passed to template literals).

- [ ] Run the migrator against both DBs:

```
cd apps/qw-oracle
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle      bun db/migrate.ts
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test     bun db/migrate.ts
```

**Verification.**

```
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "\dt messages discord_channels import_log processing_log sessions message_labels session_search session_references"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations WHERE filename = '004_layer2_chat.sql'"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT pg_get_indexdef(oid) FROM pg_class WHERE relname IN ('messages_content_tsv_gin','session_search_tsv_gin')"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid IN ('messages'::regclass,'sessions'::regclass,'session_search'::regclass,'import_log'::regclass) AND contype='c' AND pg_get_constraintdef(oid) LIKE '%platform%'"
```

- PASS condition: 8 tables listed (messages, discord_channels, import_log, processing_log, sessions, message_labels, session_search, session_references); `004_layer2_chat.sql` present in `schema_migrations`; both tsvector index defs include `to_tsvector('simple'`; every platform CHECK contains `platform = 'discord'` (no `'irc'` literal anywhere).
- FAIL condition: missing tables, missing migration row, any tsvector index uses `'english'` (D7 violation - regenerate the migration with `'simple'` and re-apply), or any platform CHECK still allows `'irc'` (D9-revised violation).

### Task 2: Hand-seed `discord_channels`

**Goal.** Carry the operator's 4 known Discord channel rows from SQLite into Postgres. The Discord export JSON does not contain `guild_id`, and `import-discord.mjs` historically did not populate this table - the rows were either set by an earlier script no longer in the repo or applied manually. Phase 3 makes the seed explicit.

**Files.** `apps/qw-oracle/db/seeds/discord_channels.sql`, `apps/qw-oracle/scripts/load-chat/seed-discord-channels.ts`. Both parent directories are NEW under this phase (`db/seeds/` does not exist; `scripts/load-chat/` does not exist - verified 2026-05-02).

**Steps.**

- [ ] Create the new directories:

```
mkdir -p apps/qw-oracle/db/seeds apps/qw-oracle/scripts/load-chat
```

- [ ] Create `apps/qw-oracle/db/seeds/discord_channels.sql`. Values are copied verbatim from `data/qw.db` (verified at draft time, 2026-05-02):

```sql
-- apps/qw-oracle/db/seeds/discord_channels.sql
-- Operator-known Discord channel metadata. Idempotent; values mirror data/qw.db
-- as of 2026-05-02. Apply via scripts/load-chat/seed-discord-channels.ts.

INSERT INTO discord_channels (channel_name, channel_id, guild_id) VALUES
  ('#antilag',     '854976516231397417', '166866762787192833'),
  ('#dev-corner',  '179895022366228481', '166866762787192833'),
  ('#helpdesk',    '709360526899150858', '166866762787192833'),
  ('#quakeworld',  '166866762787192833', '166866762787192833')
ON CONFLICT (channel_name) DO UPDATE
  SET channel_id = EXCLUDED.channel_id,
      guild_id   = EXCLUDED.guild_id;
```

- [ ] Create `apps/qw-oracle/scripts/load-chat/seed-discord-channels.ts`:

```ts
// apps/qw-oracle/scripts/load-chat/seed-discord-channels.ts
//
// One-shot apply of db/seeds/discord_channels.sql. Idempotent.
// Run via: `bun scripts/load-chat/seed-discord-channels.ts`.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(__dirname, '..', '..', 'db', 'seeds', 'discord_channels.sql');

async function main(): Promise<void> {
  const sql = readFileSync(SEED_PATH, 'utf8');
  await db.unsafe(sql);
  const rows = await db<{ channel_name: string }[]>`
    SELECT channel_name FROM discord_channels ORDER BY channel_name
  `;
  console.log(`[seed-discord-channels] applied; ${rows.length} rows in discord_channels`);
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
```

The `db.unsafe(sql)` call is the postgres-js escape hatch for raw multi-statement SQL; safe here because the file is committed and ASCII-checked.

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/seed-discord-channels.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT * FROM discord_channels ORDER BY channel_name"
```

- PASS condition: prints 4 rows with names `#antilag`, `#dev-corner`, `#helpdesk`, `#quakeworld`; all `guild_id` values are `166866762787192833`.
- FAIL condition: row count != 4, or any value drifts from the seed file.

### Task 3: Record Discord-only baseline from SQLite

**Goal.** Before any deletion or rewrite, the operator extracts and writes down the Discord-only row counts from `data/qw.db`. These numbers are this phase's regression gate (resolves F17's pattern: don't bake numbers into the plan; record them at-execution-time from the live source). The legacy plan listed combined Discord+IRC numbers; under D9-revised those numbers no longer apply because IRC is excluded.

**Files.** None added; this is an operator-action task. The recorded numbers are written into the operator's notes (or pasted into a scratch file in `~/`), not committed.

**Steps.**

- [ ] Run the baseline query against the SQLite qw.db:

```
cd apps/qw-oracle
sqlite3 data/qw.db <<'SQL'
.headers on
.mode column
SELECT 'discord_messages_total' AS k, COUNT(*) AS v
  FROM messages WHERE platform='discord'
UNION ALL
SELECT 'discord_sessions', COUNT(*)
  FROM sessions WHERE platform='discord'
UNION ALL
SELECT 'discord_message_labels', COUNT(*)
  FROM message_labels ml
  JOIN messages m ON m.id = ml.message_id
  WHERE m.platform='discord'
UNION ALL
SELECT 'discord_session_search', COUNT(*)
  FROM session_search WHERE platform='discord'
UNION ALL
SELECT 'discord_channels', COUNT(*) FROM discord_channels
UNION ALL
SELECT 'import_log_discord', COUNT(*)
  FROM import_log WHERE platform='discord';

-- Per-channel breakdown
SELECT channel_name, COUNT(*) AS msgs
  FROM messages WHERE platform='discord'
  GROUP BY channel_name ORDER BY msgs DESC;

-- Category breakdown for Discord-only labels
SELECT category, COUNT(*) AS rows
  FROM message_labels ml
  JOIN messages m ON m.id = ml.message_id
  WHERE m.platform='discord'
  GROUP BY category ORDER BY rows DESC;
SQL
```

- [ ] Record the eight numbers and three breakdowns. Approximate Discord-only baseline at draft time (verified against `data/qw.db` 2026-05-02; operator confirms exact figures at execution):

```
discord_messages_total:     717,389
  per channel:
    #antilag:                19,438
    #dev-corner:            206,739
    #helpdesk:              103,361
    #quakeworld:            387,851
discord_sessions:           (record at execution; SQLite-era combined was 128,084 across both platforms)
discord_message_labels:     (record at execution; equals discord_messages_total when 1:1 holds)
discord_session_search:     (record at execution; equals discord_sessions where chat_message_count > 0)
discord_channels:                 4
import_log_discord:               4

discord category breakdown: (record at execution from the SQL above)
```

The session / message_labels / session_search counts depend on the `process-tier1.mjs` shape and were not separated by platform in the SQLite-era totals; the `sessions WHERE platform='discord'` query above is what produces the actual baseline. Operator records whatever the query returns.

**Verification.**

The recorded numbers are this phase's regression gate. There is no separate verification step at task scope; Task 11's phase-boundary verification compares against these numbers.

- PASS condition: numbers recorded.
- FAIL condition: SQLite query errors (e.g. qw.db missing) - investigate. If qw.db is genuinely gone before this phase started, the regression gate is unrecoverable; consult Recovery.

### Task 4: `import-discord.ts` (Bun + postgres-js port of import-discord.mjs)

**Goal.** Replace `scripts/import-discord.mjs` with a TypeScript port that writes into `qw_oracle`. Idempotent on Discord snowflake (`ON CONFLICT (id) DO NOTHING`); skips files already named in `import_log` to match the existing `.mjs` skip behavior.

**Files.** `apps/qw-oracle/scripts/load-chat/import-discord.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/import-discord.ts`. The port preserves the existing message-type mapping and the channel-name-from-filename rule. The legacy monolithic plan's `{ guild, channel, messages }` wrapper shape is **wrong** - actual Discord exports are flat JSON arrays (verified against `/home/paradoks/projects/quake/quad/exports/sample-quakeworld-200.json` and against the live `import-discord.mjs:71` which uses `data.length` directly on the parsed JSON). Use the flat-array shape from the live `.mjs`.

```ts
// apps/qw-oracle/scripts/load-chat/import-discord.ts
//
// Port of scripts/import-discord.mjs (SQLite, retired in this phase).
// Reads Discord channel exports from /home/paradoks/projects/quake/quad/exports/
// and bulk-loads into Postgres `messages`. Skips files already in import_log.
// Idempotent: re-running is a no-op once import_log is populated; even on a
// fresh DB, ON CONFLICT (id) DO NOTHING absorbs duplicates within a single file.
//
// Usage:
//   bun scripts/load-chat/import-discord.ts                          # default dir: ../quad/exports/
//   bun scripts/load-chat/import-discord.ts <dir>                    # explicit dir
//   bun scripts/load-chat/import-discord.ts --file <path.json>       # single file

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { db, closeDb } from '../../shared/db.ts';

// Discord message type code -> our message_type CHECK enum value. Matches
// scripts/import-discord.mjs exactly (verified at draft time). Anything not
// in this map falls back to 'system'.
const MESSAGE_TYPES: Record<number, string> = {
  0:  'message',
  19: 'message',  // reply
  7:  'join',
  8:  'system',   // boost
  9:  'system',
  10: 'system',
  11: 'system',
  18: 'system',   // thread created
  6:  'system',   // pin notification
  20: 'system',   // application command
  21: 'system',   // thread starter
};

// Shape of one entry in a Discord JSON export (verified against
// /home/paradoks/projects/quake/quad/exports/sample-quakeworld-200.json).
interface DiscordMessage {
  id: string;
  content: string;
  author_id: string;
  author_username: string;
  author_display_name?: string;
  author_is_bot: boolean;
  channel_id?: string;
  channel_name?: string;
  guild_id?: string;
  message_type: number;
  referenced_message_id?: string | null;
  attachments?: unknown[];
  embeds?: unknown[];
  reactions?: unknown[];
  created_at: string;
  edited_at?: string | null;
}

const BATCH_SIZE = 1000;

async function alreadyImported(sourceFile: string): Promise<number | null> {
  const rows = await db<{ message_count: number }[]>`
    SELECT message_count FROM import_log WHERE source_file = ${sourceFile}
  `;
  return rows.length > 0 ? rows[0]!.message_count : null;
}

async function recordImport(args: {
  sourceFile: string;
  channelName: string;
  count: number;
  earliest: string | null;
  latest: string | null;
}): Promise<void> {
  await db`
    INSERT INTO import_log (source_file, platform, channel_name, message_count,
                            date_range_start, date_range_end)
    VALUES (${args.sourceFile}, 'discord', ${args.channelName}, ${args.count},
            ${args.earliest}, ${args.latest})
    ON CONFLICT (source_file) DO UPDATE
      SET message_count    = EXCLUDED.message_count,
          date_range_start = EXCLUDED.date_range_start,
          date_range_end   = EXCLUDED.date_range_end,
          imported_at      = now()
  `;
}

export async function importFile(filePath: string): Promise<number> {
  const sourceFile = basename(filePath);
  const channelName = '#' + basename(filePath, '.json');

  const skip = await alreadyImported(sourceFile);
  if (skip !== null) {
    console.log(`  [skip] ${channelName} -- already imported (${skip.toLocaleString()} rows)`);
    return skip;
  }

  console.log(`  [read] ${channelName} from ${filePath}`);
  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw) as DiscordMessage[];
  console.log(`  [parsed] ${data.length.toLocaleString()} messages`);

  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    await db.begin(async (tx) => {
      for (const m of batch) {
        const messageType = MESSAGE_TYPES[m.message_type] ?? 'system';
        await tx`
          INSERT INTO messages (
            id, platform, guild_id, channel_name, author_id, author_name,
            author_display_name, author_is_bot, content, message_type,
            referenced_message_id, attachment_count, attachments_json,
            embed_count, embeds_json, reaction_count, reactions_json,
            created_at, edited_at, source, source_file
          ) VALUES (
            ${m.id}, 'discord', ${m.guild_id ?? null}, ${channelName},
            ${m.author_id}, ${m.author_username},
            ${m.author_display_name ?? m.author_username}, ${m.author_is_bot ?? false},
            ${m.content ?? ''}, ${messageType},
            ${m.referenced_message_id ?? null},
            ${m.attachments?.length ?? 0},
            ${m.attachments?.length ? JSON.stringify(m.attachments) : null}::jsonb,
            ${m.embeds?.length ?? 0},
            ${m.embeds?.length ? JSON.stringify(m.embeds) : null}::jsonb,
            ${m.reactions?.length ?? 0},
            ${m.reactions?.length ? JSON.stringify(m.reactions) : null}::jsonb,
            ${m.created_at}::timestamptz, ${m.edited_at ?? null}::timestamptz,
            'discord-export', ${sourceFile}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        inserted++;
      }
    });
    if ((i + BATCH_SIZE) % 10000 === 0 || i + BATCH_SIZE >= data.length) {
      const pct = Math.min(100, Math.round((inserted / data.length) * 100));
      console.log(`  [batch] ${channelName} -- ${inserted.toLocaleString()}/${data.length.toLocaleString()} (${pct}%)`);
    }
  }

  // Date range. Discord exports are not strictly chronological in the source
  // JSON, but ISO-8601 strings sort lexically.
  const dates = data.map((d) => d.created_at).sort();
  await recordImport({
    sourceFile,
    channelName,
    count: inserted,
    earliest: dates[0] ?? null,
    latest:   dates[dates.length - 1] ?? null,
  });
  console.log(`  [done] ${channelName} -- ${inserted.toLocaleString()} inserted`);
  return inserted;
}

async function importDir(dir: string): Promise<void> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('sample-') && !f.startsWith('backfill-'));
  console.log(`Found ${files.length} Discord export files in ${dir}`);

  let total = 0;
  for (const f of files) total += await importFile(join(dir, f));
  console.log(`\n=== DISCORD IMPORT COMPLETE === total: ${total.toLocaleString()} rows`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0) {
    await importFile(resolve(args[fileIdx + 1]!));
  } else {
    const dir = args[0] ? resolve(args[0]) : resolve('..', 'quad', 'exports');
    await importDir(dir);
  }
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
```

The `import.meta.main` guard is Bun-supported and used here per D2. `importFile` is exported so the test in Task 10 can call it directly.

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/import-discord.ts --file /home/paradoks/projects/quake/quad/exports/helpdesk.json
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT channel_name, COUNT(*) FROM messages WHERE platform='discord' GROUP BY channel_name ORDER BY channel_name"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT * FROM import_log WHERE source_file = 'helpdesk.json'"
```

- PASS condition: helpdesk row in `import_log` with `message_count` ~103361 (the SQLite Discord-only baseline, recorded in Task 3); `messages` row count for `#helpdesk` matches.
- FAIL condition: zero rows imported, or `message_count` drifts > 1% from the recorded baseline.

### Task 5: `classify.ts` + `build-sessions.ts` (port of process-tier1.mjs with hygiene tightenings)

**Goal.** Port `scripts/process-tier1.mjs`'s deterministic classifier and gap-segmenter, writing into Postgres `sessions` + `message_labels`. Idempotent gating preserved via `processing_log.version`. `VERSION = 'v1'`, `GAP_THRESHOLD_MINUTES = 15` (unchanged per operator decision).

Three hygiene tightenings vs. the SQLite era, all applied in this task:

1. **Drop `BOT_COMMAND_PATTERNS`** from `classify.ts`. Discord's `author_is_bot` flag covers bot detection reliably (96.1% of Discord bot-tagged rows use this flag per the hygiene audit). The pattern slice was an IRC-era artifact (`process-tier1.mjs:26-30`) that produces false positives on Discord (.zip, .tar.gz, !Voteban human content -- see `docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md` bot category audit).

2. **Filter-then-segment** in `build-sessions.ts`. Session boundaries are computed ONLY over messages with `category IN ('chat', 'link')`. Bot, reaction, and system messages do NOT advance `prevTs` and do NOT start new sessions. All messages (including filtered-out bot/reaction/system) still receive a label row; their `session_id` is `NULL`. The 15-minute gap threshold is unchanged. This is a behavioral change from `process-tier1.mjs:148-172` where bots/reactions DID bridge gaps (they advanced `prevTs` on any non-system message); under the new shape empty sessions disappear by construction -- no explicit "skip if zero chat" check is needed.

   Algorithm (implemented in `processChannel`):
   - Fetch ALL messages for the channel ordered by `created_at` (unchanged).
   - For each message: classify it; then check `if category === 'chat' || category === 'link'` before gap-detection logic and `prevTs` update. Only chat/link messages trigger `flushSession` and advance `prevTs`.
   - Label rows for ALL messages: chat/link get `session_id = <current session id>` after flush; bot/reaction/system get `session_id = NULL`.
   - `flushSession` is a no-op if there are zero chat/link messages buffered (empty-session-by-construction invariant). No explicit check needed.

3. **Remove duplicate `'xd'`** from `REACTION_WORDS`. `process-tier1.mjs:37` and `:39` both contain `'xd'`; `Set` dedupes silently but the duplicate is noise.

**Verification baselines under filter-then-segment.** Computed via SQLite window-function probe against `data/qw.db` (read-only, before deletion):

```sql
-- Probe to compute filter-then-segment session count (run before qw.db deletion)
-- Uses existing message_labels categories already stored by process-tier1.mjs v1.
-- julianday math preserves sub-second precision; strftime('%s') would truncate
-- fractional seconds and under-count gaps in the 900-901 second window. Discord
-- timestamps carry ms precision (e.g. '2016-04-05T11:30:43.787Z'), and the Bun
-- executor compares via Date.getTime() in integer ms. This probe matches that
-- behavior to within float-precision edge cases at exactly-900-second gaps.
WITH filtered AS (
  SELECT m.id, m.channel_name, m.created_at
  FROM messages m
  JOIN message_labels ml ON ml.message_id = m.id
  WHERE m.platform = 'discord'
    AND ml.category IN ('chat', 'link')
),
with_gap AS (
  SELECT
    channel_name,
    created_at,
    (julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY channel_name ORDER BY created_at))) * 86400 AS gap_sec
  FROM filtered
)
SELECT COUNT(*) AS new_session_count
FROM with_gap
WHERE gap_sec IS NULL OR gap_sec > 900;
```

Verified result (run 2026-05-02 against `data/qw.db`): **84,369 sessions** (down from 88,214 under the old algorithm; the reduction comes from empty sessions disappearing -- those 4,272 sessions had no chat/link content so they never form a boundary under filter-then-segment).

`message_labels` row count is unchanged at **717,389** -- every imported message still gets exactly one label row.

**Files.** `apps/qw-oracle/scripts/load-chat/classify.ts`, `apps/qw-oracle/scripts/load-chat/build-sessions.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/classify.ts`. Pure-function classifier; no DB access.

```ts
// apps/qw-oracle/scripts/load-chat/classify.ts
//
// Deterministic message classifier. No LLM. Port of scripts/process-tier1.mjs
// classification rules (process-tier1.mjs:56-93) with two hygiene tightenings:
//
// 1. BOT_COMMAND_PATTERNS removed -- IRC-era artifact (process-tier1.mjs:26-30).
//    Discord exposes author_is_bot reliably; the pattern slice false-positives on
//    .zip / .tar.gz / !Voteban / numeric expressions from human authors.
//    See docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md bot category audit.
//
// 2. Duplicate 'xd' removed from REACTION_WORDS (was at process-tier1.mjs:37 and :39).

const REACTION_WORDS: ReadonlySet<string> = new Set([
  // text emoticons
  ':)', ':(', ':D', ':P', ':p', ':/', ':\\', ':>', ':<', ';)', ';(',
  ':-)', ':-(', ':-D', ':-P', ':-/', ':-\\', ':o', ':O', ':x', ':X',
  'xD', 'XD', 'xd', ':3', '<3', '>:(',
  // reactions
  'lol', 'heh', 'hehe', 'rofl', 'lmao',
  'ah', 'oh', 'ha', 'haha', 'k', 'ok',
  'ya', 'ye', 'jo', 'yep', 'yea', 'nah', 'mhm', 'hmm',
  // gaming shorthand
  '+1', 'gg', 'gl', 'hf', 'ns', 'nt', 'wp', 'gj', 'thx', 'ty', 'np',
]);

const SINGLE_EMOJI = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]{1,3}$/u;
const LINK_ONLY = /^https?:\/\/\S+$/;

function isReaction(content: string): boolean {
  if (REACTION_WORDS.has(content)) return true;
  if (SINGLE_EMOJI.test(content)) return true;
  return false;
}

export type Category = 'chat' | 'bot' | 'reaction' | 'link' | 'system';

export interface ClassifyInput {
  message_type: string;          // from messages.message_type
  author_is_bot: boolean;
  content: string;
  attachment_count: number;
}

export function classifyMessage(msg: ClassifyInput): Category {
  if (msg.message_type !== 'message' && msg.message_type !== 'action') return 'system';
  if (msg.author_is_bot) return 'bot';

  const content = (msg.content ?? '').trim();
  if (content.length === 0) return msg.attachment_count > 0 ? 'link' : 'reaction';

  for (const pattern of BOT_COMMAND_PATTERNS) {
    if (pattern.test(content)) return 'bot';
  }
  if (content.length <= 5 && isReaction(content)) return 'reaction';
  if (LINK_ONLY.test(content)) return 'link';
  return 'chat';
}
```

- [ ] Create `apps/qw-oracle/scripts/load-chat/build-sessions.ts`. Port of `process-tier1.mjs:95-273` with filter-then-segment.

```ts
// apps/qw-oracle/scripts/load-chat/build-sessions.ts
//
// Port of scripts/process-tier1.mjs with filter-then-segment hygiene change.
// Key behavioral difference from process-tier1.mjs:148-172:
//   Old: ANY non-system message advances prevTs and can bridge a gap.
//   New: ONLY chat/link messages drive gap detection and session creation.
//   Bot/reaction/system messages are still classified and written to
//   message_labels with session_id IS NULL.
//
// Consequence: empty sessions (sessions with zero chat/link messages) disappear
// by construction -- no explicit skip needed because they never form a session
// boundary. Expected session count drops from 88,214 to 84,369 (verified against
// qw.db 2026-05-02; see Task 5 probe SQL).
//
// Usage:
//   bun scripts/load-chat/build-sessions.ts            # checks processing_log; aborts if version 'v1' already shipped
//   bun scripts/load-chat/build-sessions.ts --force    # truncate + rebuild regardless

import { db, closeDb } from '../../shared/db.ts';
import { classifyMessage, type Category } from './classify.ts';

const VERSION = 'v1';
const GAP_THRESHOLD_MINUTES = 15;

interface MessageRow {
  id: string;
  author_name: string;
  author_is_bot: boolean;
  content: string;
  message_type: string;
  attachment_count: number;
  created_at: string;       // ISO-8601 from postgres-js
}

interface ChannelRow { channel_name: string; platform: 'discord'; cnt: number }

async function alreadyProcessed(): Promise<boolean> {
  const rows = await db<{ id: number }[]>`
    SELECT id FROM processing_log
    WHERE version = ${VERSION} AND finished_at IS NOT NULL
    LIMIT 1
  `;
  return rows.length > 0;
}

async function listChannels(): Promise<ChannelRow[]> {
  const rows = await db<ChannelRow[]>`
    SELECT channel_name, platform, COUNT(*)::int AS cnt
    FROM messages
    GROUP BY channel_name, platform
    ORDER BY cnt DESC
  `;
  return rows;
}

async function truncateProcessing(): Promise<void> {
  // CASCADE removes message_labels via FK.
  await db`TRUNCATE sessions RESTART IDENTITY CASCADE`;
}

async function processChannel(
  channel: ChannelRow,
): Promise<{ sessions: number; labeled: number }> {
  const messages = await db<MessageRow[]>`
    SELECT id, author_name, author_is_bot, content, message_type,
           attachment_count, created_at
    FROM messages
    WHERE channel_name = ${channel.channel_name} AND platform = ${channel.platform}
    ORDER BY created_at
  `;
  if (messages.length === 0) return { sessions: 0, labeled: 0 };

  const gapMs = GAP_THRESHOLD_MINUTES * 60 * 1000;

  interface PendingLabel { messageId: string; category: Category }
  let sessionStart: string | null = null;
  let sessionEnd: string | null = null;
  let sessionMessages: MessageRow[] = [];
  let sessionParticipants = new Set<string>();
  let sessionChatCount = 0;
  let labelsBuffer: PendingLabel[] = [];
  let prevTs: number | null = null;
  let totalSessions = 0;

  // All channel writes inside one transaction; speed and crash-safety.
  await db.begin(async (tx) => {
    async function flushSession(): Promise<void> {
      // Under filter-then-segment, sessionStart is only set when a chat/link
      // message opened this session. If sessionChatCount is 0 we somehow
      // reached flushSession with no chat/link content -- skip (shouldn't
      // happen under the new algorithm, but guards the empty-session invariant).
      if (!sessionStart || sessionChatCount === 0) return;
      const inserted = await tx<{ id: number }[]>`
        INSERT INTO sessions (channel_name, platform, started_at, ended_at,
                              message_count, chat_message_count, participant_count,
                              participants_json, version)
        VALUES (${channel.channel_name}, ${channel.platform},
                ${sessionStart}::timestamptz, ${sessionEnd}::timestamptz,
                ${sessionMessages.length}, ${sessionChatCount},
                ${sessionParticipants.size},
                ${JSON.stringify([...sessionParticipants])}::jsonb, ${VERSION})
        RETURNING id
      `;
      const sessionId = inserted[0]!.id;
      for (const lbl of labelsBuffer) {
        await tx`
          INSERT INTO message_labels (message_id, session_id, category, version)
          VALUES (${lbl.messageId}, ${sessionId}, ${lbl.category}, ${VERSION})
          ON CONFLICT (message_id) DO UPDATE
            SET session_id = EXCLUDED.session_id,
                category   = EXCLUDED.category,
                version    = EXCLUDED.version
        `;
      }
      totalSessions += 1;
      sessionMessages = [];
      sessionParticipants = new Set();
      sessionChatCount = 0;
      labelsBuffer = [];
      sessionStart = null;
      sessionEnd = null;
    }

    // orphanBuffer: messages that arrived before the first chat/link message in
    // a potential new session, or after a flush with no subsequent chat/link.
    // These are written with session_id IS NULL after the channel pass completes.
    const orphanBuffer: PendingLabel[] = [];

    for (const msg of messages) {
      const ts = new Date(msg.created_at).getTime();
      const category = classifyMessage({
        message_type: msg.message_type,
        author_is_bot: msg.author_is_bot,
        content: msg.content,
        attachment_count: msg.attachment_count,
      });

      // Only chat/link messages drive gap detection and session creation.
      // Bot/reaction/system messages do NOT advance prevTs (changed from
      // process-tier1.mjs:148-172 which advanced prevTs for all non-system).
      if (category === 'chat' || category === 'link') {
        if (prevTs === null || ts - prevTs > gapMs) {
          await flushSession();
          sessionStart = msg.created_at;
        }
        sessionEnd = msg.created_at;
        prevTs = ts;
        sessionMessages.push(msg);
        sessionParticipants.add(msg.author_name);
        sessionChatCount += 1;
        labelsBuffer.push({ messageId: msg.id, category });
      } else {
        // bot/reaction/system: record for labeling with NULL session_id later.
        sessionMessages.push(msg);
        orphanBuffer.push({ messageId: msg.id, category });
      }
    }
    await flushSession();

    // Write orphaned labels (bot/reaction/system) with session_id IS NULL.
    // Preserves the "every imported message has a label row" invariant.
    for (const lbl of orphanBuffer) {
      await tx`
        INSERT INTO message_labels (message_id, session_id, category, version)
        VALUES (${lbl.messageId}, NULL, ${lbl.category}, ${VERSION})
        ON CONFLICT (message_id) DO UPDATE
          SET session_id = NULL,
              category   = EXCLUDED.category,
              version    = EXCLUDED.version
      `;
    }
  });

  return { sessions: totalSessions, labeled: messages.length };
}

export async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  if (!force && await alreadyProcessed()) {
    console.log(`[build-sessions] processing_log already has version='${VERSION}' finished; pass --force to override`);
    return;
  }

  console.log(`[build-sessions] version=${VERSION}, gap=${GAP_THRESHOLD_MINUTES}min`);
  await truncateProcessing();

  const startedAt = new Date().toISOString();
  const logRow = await db<{ id: number }[]>`
    INSERT INTO processing_log (version, channels_processed, sessions_created,
                                messages_labeled, gap_threshold_minutes, started_at)
    VALUES (${VERSION}, 0, 0, 0, ${GAP_THRESHOLD_MINUTES}, ${startedAt}::timestamptz)
    RETURNING id
  `;
  const logId = logRow[0]!.id;

  const channels = await listChannels();
  console.log(`[build-sessions] processing ${channels.length} channels`);
  let totalSessions = 0;
  let totalLabeled = 0;
  for (const ch of channels) {
    const t0 = Date.now();
    const r = await processChannel(ch);
    totalSessions += r.sessions;
    totalLabeled += r.labeled;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const pad = ch.channel_name.padEnd(22);
    const platPad = ch.platform.padEnd(8);
    console.log(`  ${pad} ${platPad} ${ch.cnt.toLocaleString().padStart(9)} msgs -> ${r.sessions.toLocaleString().padStart(6)} sessions (${elapsed}s)`);
  }

  await db`
    UPDATE processing_log
       SET channels_processed = ${channels.length},
           sessions_created   = ${totalSessions},
           messages_labeled   = ${totalLabeled},
           finished_at        = now()
     WHERE id = ${logId}
  `;
  console.log(`\n[build-sessions] done: ${totalSessions.toLocaleString()} sessions, ${totalLabeled.toLocaleString()} labeled`);
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
```

The TRUNCATE-then-rebuild approach plus the per-channel transaction match the SQLite shape. The largest Discord channel (`#quakeworld`, ~388k rows) produces a transaction of similar size to the SQLite-era Discord pass; postgres-js handles this without manual chunking. If memory becomes a problem at runtime, the recovery section below names the chunking variant. `main` is exported so the test in Task 10 can call it directly.

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/build-sessions.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT COUNT(*) FROM sessions; SELECT COUNT(*) FROM message_labels"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT category, COUNT(*) FROM message_labels GROUP BY category ORDER BY COUNT(*) DESC"
```

- PASS condition: `sessions` count is within 1% of **84,369** (filter-then-segment baseline, probed 2026-05-02); `message_labels` count equals `messages` count (717,389 -- every message has exactly one label row); category breakdown matches Discord-only expected (chat ~664,830; reaction ~25,878; link ~17,381; bot ~9,156; system ~144); `message_labels` rows with `session_id IS NULL` cover the non-chat/non-link set (~35,178 rows for bot + reaction + system combined: 9,156 + 25,878 + 144, per design doc category audit).
- FAIL condition: drift on session count or label count beyond 1%; missing categories; or label count != message count (PRIMARY KEY constraint violation suggests a duplicate message id slipped through).

### Task 5b: `build-session-references.ts` (reply graph)

**Goal.** After sessions are built, aggregate Discord reply edges (`messages.referenced_message_id`) into `session_references`. Each row captures how many times a message in `source_session` replied to a message in `target_session`. Within-session replies (source = target) are skipped. Phase 6's `search_solved_issues` uses this table to surface sessions linked by reply chains.

**Files.** `apps/qw-oracle/scripts/load-chat/build-session-references.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/build-session-references.ts`:

```ts
// apps/qw-oracle/scripts/load-chat/build-session-references.ts
//
// Builds session_references from messages.referenced_message_id.
// Must run after build-sessions.ts (needs message_labels.session_id populated).
// Idempotent: TRUNCATE + rebuild.
//
// Algorithm:
//   For each message m that has a referenced_message_id:
//     - source_session = message_labels.session_id for m (may be NULL if m is bot/reaction)
//     - target_session = message_labels.session_id for the referenced message (may be NULL)
//     - If either session is NULL or source = target: skip.
//     - Otherwise: increment the (source, target) count.
//
// Usage:
//   bun scripts/load-chat/build-session-references.ts

import { db, closeDb } from '../../shared/db.ts';

async function main(): Promise<void> {
  console.log('[build-session-references] truncating session_references');
  await db`TRUNCATE session_references`;

  // Single INSERT ... SELECT aggregation over the reply graph.
  // Both source and target message_labels rows must have non-NULL session_id
  // (i.e., the replying message and the referenced message both belong to a
  // real chat/link session). Cross-session condition excludes within-session
  // replies (source_session_id <> target_session_id).
  const result = await db`
    INSERT INTO session_references (source_session_id, target_session_id, reference_count)
    SELECT
      src_lbl.session_id  AS source_session_id,
      tgt_lbl.session_id  AS target_session_id,
      COUNT(*)            AS reference_count
    FROM messages m
    JOIN message_labels src_lbl ON src_lbl.message_id = m.id
    JOIN messages ref_m         ON ref_m.id = m.referenced_message_id
    JOIN message_labels tgt_lbl ON tgt_lbl.message_id = ref_m.id
    WHERE m.referenced_message_id IS NOT NULL
      AND src_lbl.session_id IS NOT NULL
      AND tgt_lbl.session_id IS NOT NULL
      AND src_lbl.session_id <> tgt_lbl.session_id
    GROUP BY src_lbl.session_id, tgt_lbl.session_id
    ON CONFLICT (source_session_id, target_session_id) DO UPDATE
      SET reference_count = EXCLUDED.reference_count
  `;
  console.log('[build-session-references] done');
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
```

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/build-session-references.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT COUNT(*) FROM session_references"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT target_session_id, SUM(reference_count) AS inbound FROM session_references GROUP BY target_session_id ORDER BY inbound DESC LIMIT 5"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT COUNT(*) FROM session_references WHERE source_session_id = target_session_id"
```

- PASS condition: `session_references` row count > 0 (Discord has 32,863 messages with `referenced_message_id`; some fraction cross session boundaries); the within-session self-reference count = 0 (the CHECK constraint enforces this but the query confirms no data violation); the top-5 inbound query returns rows showing some sessions are referenced by many others.
- FAIL condition: row count = 0 (suggests `referenced_message_id` data was not imported, or all replies happened within the same session -- verify `SELECT COUNT(*) FROM messages WHERE referenced_message_id IS NOT NULL`); or within-session count > 0 (logic error in the aggregate).

### Task 6: `build-search-index.ts` (port of build-search-index.mjs)

**Goal.** Faithful port of `scripts/build-search-index.mjs`. TRUNCATE + rebuild `session_search` from `sessions` + `message_labels` + `messages`, joining only `category IN ('chat', 'link')`, formatting each line as `<author>: <text>`. The rebuild matches SQLite's shape; the only difference is tsvector replaces FTS5.

**Files.** `apps/qw-oracle/scripts/load-chat/build-search-index.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/build-search-index.ts`:

```ts
// apps/qw-oracle/scripts/load-chat/build-search-index.ts
//
// Port of scripts/build-search-index.mjs. Rebuilds `session_search` from
// sessions + messages + message_labels. tsvector ('simple', D7) replaces FTS5.
//
// Usage:
//   bun scripts/load-chat/build-search-index.ts

import { db, closeDb } from '../../shared/db.ts';

interface SessionRow {
  id: number;
  channel_name: string;
  platform: string;
  started_at: string;
  participants_json: unknown;
  chat_message_count: number;
}

interface ChatRow {
  author_name: string;
  content: string;
}

const BATCH = 1000;

async function main(): Promise<void> {
  console.log('[build-search-index] truncating session_search');
  await db`TRUNCATE session_search`;

  const sessions = await db<SessionRow[]>`
    SELECT id, channel_name, platform, started_at, participants_json, chat_message_count
    FROM sessions
    WHERE chat_message_count > 0
    ORDER BY id
  `;
  console.log(`[build-search-index] sessions to index: ${sessions.length.toLocaleString()}`);

  const t0 = Date.now();
  let indexed = 0;

  for (let i = 0; i < sessions.length; i += BATCH) {
    const batch = sessions.slice(i, i + BATCH);
    await db.begin(async (tx) => {
      for (const s of batch) {
        const msgs = await tx<ChatRow[]>`
          SELECT m.author_name, m.content
          FROM message_labels l
          JOIN messages m ON m.id = l.message_id
          WHERE l.session_id = ${s.id}
            AND l.category IN ('chat', 'link')
          ORDER BY m.created_at
        `;
        const content = msgs.map((m) => `${m.author_name}: ${m.content ?? ''}`).join('\n').trim();
        if (content.length === 0) continue;
        await tx`
          INSERT INTO session_search (session_id, channel_name, platform, started_at,
                                      participants, chat_message_count, content)
          VALUES (${s.id}, ${s.channel_name}, ${s.platform}, ${s.started_at}::timestamptz,
                  ${s.participants_json as unknown as string}::jsonb,
                  ${s.chat_message_count}, ${content})
        `;
        indexed++;
      }
    });
    if ((i + BATCH) % 10000 === 0 || i + BATCH >= sessions.length) {
      const pct = Math.min(100, Math.round((indexed / sessions.length) * 100));
      console.log(`  [batch] ${indexed.toLocaleString()} sessions indexed (${pct}%)`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[build-search-index] done: ${indexed.toLocaleString()} sessions in ${elapsed}s`);
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
```

The `${s.participants_json as unknown as string}::jsonb` cast is an artifact of postgres-js typing JSONB columns as `unknown`; the runtime value is already JSON, postgres-js round-trips it.

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/build-search-index.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT COUNT(*) FROM session_search"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT session_id, ts_rank_cd(session_tsv, query) AS rank FROM session_search, plainto_tsquery('simple', 'screen wobble') query WHERE session_tsv @@ query ORDER BY rank DESC LIMIT 3"
```

- PASS condition: `session_search` count is within 1% of the Discord-only baseline recorded in Task 3 (sessions where `chat_message_count > 0`); the smoke-test query returns at least one row (the corpus contains `cl_bob` discussions).
- FAIL condition: count drift > 1%, or zero rows for the smoke-test query (suggests tsvector indexing failed or the `simple` config silently dropped tokens it shouldn't).

### Task 7: Update `package.json` script entries

**Goal.** Replace the legacy `import:discord` / `import:irc` / `stats` mjs entries with the new `load-chat:*` bun commands; ensure no Layer 2 references to `better-sqlite3` remain.

**Files.** `apps/qw-oracle/package.json`.

**Steps.**

- [ ] Replace the existing import entries with the post-port shape. Phase 2's package.json is the baseline; this task only touches the chat-related scripts. Final scripts block (after this task):

```json
"scripts": {
  "typecheck": "tsc --noEmit",
  "load-knowledge": "bun scripts/load-knowledge/index.ts",
  "load-chat:discord": "bun scripts/load-chat/import-discord.ts",
  "load-chat:sessions": "bun scripts/load-chat/build-sessions.ts",
  "load-chat:search-index": "bun scripts/load-chat/build-search-index.ts",
  "load-chat:seed-channels": "bun scripts/load-chat/seed-discord-channels.ts",
  "generate-pg-migration": "bun scripts/generate-pg-migration.ts",
  "db:up": "docker compose -f db/docker-compose.dev.yml up -d",
  "db:down": "docker compose -f db/docker-compose.dev.yml down",
  "db:logs": "docker compose -f db/docker-compose.dev.yml logs -f postgres",
  "db:psql": "docker compose -f db/docker-compose.dev.yml exec postgres psql -U qworacle -d qw_oracle",
  "migrate": "bun db/migrate.ts",
  "migrate:reset": "bun db/migrate.ts --reset",
  "test": "DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test"
}
```

There is no `load-chat:irc` entry; D9-revised excluded IRC entirely.

- [ ] If `better-sqlite3` or `@types/better-sqlite3` still appear in `dependencies` / `devDependencies` (Phase 2 was supposed to remove them but the loader and the MCP both touched this file - verify rather than assume), drop them.

- [ ] `npm install --no-workspaces` (project rule) to refresh `package-lock.json`.

**Verification.**

```
cd apps/qw-oracle
grep -E '"(import:discord|import:irc|stats)":' package.json && echo "FAIL: legacy script entries still present" || echo "OK: legacy mjs scripts removed"
grep -E '"load-chat:irc"' package.json && echo "FAIL: load-chat:irc entry exists (D9-revised violation)" || echo "OK: no load-chat:irc"
grep -E "better-sqlite3" package.json && echo "FAIL: better-sqlite3 still listed" || echo "OK: no better-sqlite3"
test -d node_modules/better-sqlite3 && echo "FAIL: better-sqlite3 still installed" || echo "OK: not installed"
```

- PASS condition: all four lines print `OK:`.
- FAIL condition: any `FAIL:` line.

### Task 8: Document Layer 2 status in CLAUDE.md (Discord-only)

**Goal.** Make D9-revised's "explicit acceptance" visible in `apps/qw-oracle/CLAUDE.md`. Phase 3 ships with Discord-only Layer 2; IRC stays out of Arc 1 entirely; Arc 3 reconsiders only if a successful codepage re-import lands AND operator demand exists.

**Files.** `apps/qw-oracle/CLAUDE.md`, `apps/qw-oracle/scripts/load-chat/CLAUDE.md`.

**Steps.**

- [ ] In `apps/qw-oracle/CLAUDE.md`, after the existing "Status" line near the top, add a "Layer 2 status (Arc 1 / Phase 3)" subsection with content along these lines:

```
### Layer 2 status (Arc 1 / Phase 3 -- Postgres + tsvector, Discord-only)

- Authoritative store: Postgres `qw_oracle`, tables `messages`,
  `discord_channels`, `import_log`, `processing_log`, `sessions`,
  `message_labels`, `session_search`.
- tsvector config: `'simple'` (language-agnostic). Discord corpus is
  mixed-language (Swedish, Russian, German handles and snippets);
  English stemming would mangle non-English tokens. See decisions.md D7.
- Platform scope: Discord-only in Arc 1. The `messages.platform`,
  `sessions.platform`, `session_search.platform`, and `import_log.platform`
  CHECK constraints lock to `'discord'`. IRC is excluded entirely
  (decisions.md D9-revised); no IRC importer, no `mirc-logs/` traversal,
  no IRC tables. Arc 3 reconsiders only if (a) a codepage re-import makes
  IRC content trustworthy AND (b) operator demand for IRC-era queries
  emerges; otherwise IRC stays out indefinitely.
- Layer 2 in v1 is port-only. No segmentation rework, no summarisation,
  no embeddings. `search_solved_issues` is lexical-only, same shape as
  before. Arc 3 (separate plan) adds session-summary embeddings and
  hybrid retrieval over Layer 2.
```

- [ ] Create `apps/qw-oracle/scripts/load-chat/CLAUDE.md` mirroring the structure of `scripts/load-knowledge/CLAUDE.md`. One-liner sections naming each script's purpose, the import order, the idempotency invariants (per-file skip via `import_log`, per-version skip via `processing_log`, `ON CONFLICT DO NOTHING` on message id). One paragraph about Discord-only scope and the D9-revised gate on adding IRC back.

**Verification.**

```
grep -A 1 "Layer 2 status" apps/qw-oracle/CLAUDE.md | head -20
test -f apps/qw-oracle/scripts/load-chat/CLAUDE.md && echo "OK: load-chat CLAUDE.md present" || echo "FAIL"
grep -i "Discord-only" apps/qw-oracle/CLAUDE.md && echo "OK: Discord-only documented" || echo "FAIL: not documented"
```

- PASS condition: status section visible with `Discord-only` text; `scripts/load-chat/CLAUDE.md` exists.
- FAIL condition: missing status section, missing Discord-only language, or missing CLAUDE.md.

### Task 9: Stub `corpusDb` and `knowledgeDb` in serve/mcp/src/db.ts

**Goal.** The live `serve/mcp/src/db.ts` (verified 2026-05-02) imports `Database` from `bun:sqlite` and opens both `knowledge.db` (Phase 2 deleted) and `qw.db` (this phase deletes). Phase 6 will rewire the whole MCP to postgres-js. Until then, the import-time file-not-found makes the module fail to load at all, blocking even read-only inspection. Replace both opens with deferred-throw stubs that let the module parse but throw on first use.

**Files.** `apps/qw-oracle/serve/mcp/src/db.ts`.

**Steps.**

- [ ] Edit `apps/qw-oracle/serve/mcp/src/db.ts`. Replace the `new Database(...)` calls with a Proxy that throws on any property access; the error names Phase 6 explicitly so the next contributor knows what to do. The current file imports from `bun:sqlite` (NOT `better-sqlite3` - the existing MCP already runs on Bun); the stub keeps that import path so `tools/*.ts` files that import the `Database` type from this module continue to typecheck. Concrete shape:

```ts
// apps/qw-oracle/serve/mcp/src/db.ts
//
// Layer 1 (engine + game content) used to live in knowledge.db; Layer 2
// (community chat corpus) used to live in qw.db. Both have been retired
// by Arc 1 Phases 2 and 3 respectively. Phase 6 rewires this module to
// postgres-js. Until then, both exports are tripwires: any property access
// throws a named error so the failure surfaces clearly instead of as a
// confusing bun:sqlite file-not-found.

import type { Database } from 'bun:sqlite';

function makeStub(name: string): Database {
  const message =
    `MCP DB '${name}' is not yet rewired to Postgres. ` +
    `Arc 1 Phase 6 (mcp-rewrite) replaces bun:sqlite with postgres-js.`;
  return new Proxy({} as Database, {
    get() { throw new Error(message); },
    apply() { throw new Error(message); },
  });
}

export const knowledgeDb = makeStub('knowledge.db');
export const corpusDb = makeStub('qw.db');
```

`import type { Database } from 'bun:sqlite'` is a type-only import; no SQLite file is opened. Phase 6 removes the type import along with the rest of the bun:sqlite dependency.

**Verification.**

```
cd apps/qw-oracle
bun -e "await import('./serve/mcp/src/db.ts').then(m => console.log('parsed', Object.keys(m)))"
bun -e "import { knowledgeDb } from './serve/mcp/src/db.ts'; try { knowledgeDb.prepare('select 1'); } catch (e) { console.log('expected throw:', (e as Error).message); }"
```

- PASS condition: first command prints `parsed [ 'knowledgeDb', 'corpusDb' ]`; second prints the named error message containing `Phase 6`.
- FAIL condition: either bun -e exits non-zero outside the deliberate throw, or the throw message does not name Phase 6.

### Task 10: Tests (D13)

**Goal.** Smoke tests against `qw_oracle_test`. Two test files cover the highest-risk paths: import idempotency (don't double-load Discord rows on re-run) and classifier behavior (deterministic mapping holds).

**Files.** `apps/qw-oracle/scripts/load-chat/import-discord.test.ts`, `apps/qw-oracle/scripts/load-chat/build-sessions.test.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/import-discord.test.ts`:

```ts
// apps/qw-oracle/scripts/load-chat/import-discord.test.ts
//
// Integration test against qw_oracle_test (D13).
// Verifies (1) import inserts the expected rows, (2) re-import is idempotent,
// (3) channel name is derived from filename.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(`refusing to run import-discord.test.ts against non-test DB; got: ${url}`);
}

const sql = postgres(url, { onnotice: () => {} });

const SAMPLE = [
  {
    id: '100', content: 'hello', author_id: 'u1', author_username: 'alice',
    author_display_name: 'Alice', author_is_bot: false,
    channel_id: 'c1', channel_name: 'helpdesk',
    message_type: 0, referenced_message_id: null,
    attachments: [], embeds: [], reactions: [],
    created_at: '2024-01-01T00:00:00.000Z', edited_at: null,
  },
  {
    id: '101', content: '!ttop10', author_id: 'u2', author_username: 'bot',
    author_display_name: 'Bot', author_is_bot: true,
    channel_id: 'c1', channel_name: 'helpdesk',
    message_type: 0, referenced_message_id: null,
    attachments: [], embeds: [], reactions: [],
    created_at: '2024-01-01T00:00:01.000Z', edited_at: null,
  },
];

let tmpDir: string;
let samplePath: string;

describe('import-discord', () => {
  beforeAll(async () => {
    await sql`TRUNCATE messages, import_log, sessions, message_labels, session_search RESTART IDENTITY CASCADE`;
    tmpDir = mkdtempSync(join(tmpdir(), 'qwo-import-discord-'));
    samplePath = join(tmpDir, 'helpdesk.json');
    writeFileSync(samplePath, JSON.stringify(SAMPLE), 'utf8');
  });
  afterAll(async () => {
    rmSync(tmpDir, { recursive: true, force: true });
    await sql.end();
  });

  test('first import inserts rows and records import_log', async () => {
    const { importFile } = await import('./import-discord.ts');
    await importFile(samplePath);

    const counts = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM messages WHERE platform='discord'`;
    expect(counts[0]!.c).toBe(SAMPLE.length);

    const log = await sql<{ message_count: number }[]>`SELECT message_count FROM import_log WHERE source_file='helpdesk.json'`;
    expect(log[0]!.message_count).toBe(SAMPLE.length);
  });

  test('re-import is idempotent (skips via import_log)', async () => {
    const { importFile } = await import('./import-discord.ts');
    await importFile(samplePath);
    const counts = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM messages WHERE platform='discord'`;
    expect(counts[0]!.c).toBe(SAMPLE.length);
  });

  test('channel name is derived from filename (#helpdesk)', async () => {
    const rows = await sql<{ channel_name: string }[]>`SELECT DISTINCT channel_name FROM messages WHERE platform='discord'`;
    expect(rows[0]!.channel_name).toBe('#helpdesk');
  });
});
```

- [ ] Create `apps/qw-oracle/scripts/load-chat/build-sessions.test.ts`:

```ts
// apps/qw-oracle/scripts/load-chat/build-sessions.test.ts
//
// Integration test against qw_oracle_test (D13). Inserts a small messages
// fixture, runs the classifier + session builder, asserts session count
// and category breakdown.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { classifyMessage } from './classify.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(`refusing to run build-sessions.test.ts against non-test DB; got: ${url}`);
}

const sql = postgres(url, { onnotice: () => {} });

describe('classifier', () => {
  test('plain chat is "chat"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: false,
      content: 'I have a question about cl_bob', attachment_count: 0,
    })).toBe('chat');
  });
  test('bot command "!ttop10" is "bot"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: false,
      content: '!ttop10', attachment_count: 0,
    })).toBe('bot');
  });
  test('"lol" is "reaction"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: false,
      content: 'lol', attachment_count: 0,
    })).toBe('reaction');
  });
  test('bare URL is "link"', () => {
    expect(classifyMessage({
      message_type: 'message', author_is_bot: false,
      content: 'https://wiki.quakeworld.nu/', attachment_count: 0,
    })).toBe('link');
  });
  test('join is "system"', () => {
    expect(classifyMessage({
      message_type: 'join', author_is_bot: false,
      content: 'foo has joined #ezQuake', attachment_count: 0,
    })).toBe('system');
  });
});

describe('build-sessions integration', () => {
  beforeAll(async () => {
    await sql`TRUNCATE messages, sessions, message_labels, session_search, processing_log RESTART IDENTITY CASCADE`;
    // Two sessions: t=0..t=5min (4 chat messages), 30min gap, then 1 chat msg.
    const base = new Date('2024-01-01T00:00:00.000Z').getTime();
    const rows = [
      { id: 'd1', t: base + 0,                content: 'hi all',                  type: 'message' },
      { id: 'd2', t: base + 60_000,           content: 'help with cl_bob',         type: 'message' },
      { id: 'd3', t: base + 180_000,          content: 'try setting it to 0',      type: 'message' },
      { id: 'd4', t: base + 300_000,          content: 'thanks',                   type: 'message' },
      { id: 'd5', t: base + 30 * 60_000 + 60, content: 'second session msg',       type: 'message' },
    ];
    for (const r of rows) {
      await sql`
        INSERT INTO messages (id, platform, channel_name, author_name, content,
                              message_type, created_at, source)
        VALUES (${r.id}, 'discord', '#test', 'alice', ${r.content}, ${r.type},
                ${new Date(r.t).toISOString()}::timestamptz, 'test-fixture')
      `;
    }
  });
  afterAll(async () => { await sql.end(); });

  test('build-sessions produces 2 sessions and labels every message', async () => {
    // Reset the processing_log gate so the builder runs.
    await sql`DELETE FROM processing_log WHERE version = 'v1'`;
    const mod = await import('./build-sessions.ts');
    await mod.main();

    const sessRow = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM sessions`;
    expect(sessRow[0]!.c).toBe(2);

    const labelRow = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM message_labels`;
    expect(labelRow[0]!.c).toBe(5);

    const cats = await sql<{ category: string; c: number }[]>`
      SELECT category, count(*)::int AS c FROM message_labels GROUP BY category
    `;
    expect(cats.find((r) => r.category === 'chat')!.c).toBe(5);
  });
});
```

- [ ] Run the tests:

```
cd apps/qw-oracle
bun test scripts/load-chat/
```

**Verification.**

```
cd apps/qw-oracle
bun test scripts/load-chat/
bunx tsc --noEmit
```

- PASS condition: all tests pass; typecheck exits 0.
- FAIL condition: any test failure or non-zero typecheck.

### Task 11: End-to-end load + cleanup of legacy `.mjs` and `qw.db*`

**Goal.** Run the full Discord-only load against `qw_oracle`, verify counts against the SQLite Discord-only baseline recorded in Task 3, then delete the obsolete `.mjs` scripts and `qw.db*` files. Idempotent: every step short-circuits on second run, so re-execution is safe.

**Files.** None added; files deleted as listed in "Files touched / Deleted".

**Steps.**

- [ ] Confirm Task 3's baseline numbers are recorded; this task uses them as the regression gate.

- [ ] Apply migration (already done in Task 1; re-run is a no-op).

- [ ] Seed discord_channels:

```
cd apps/qw-oracle
bun scripts/load-chat/seed-discord-channels.ts
```

- [ ] Import all Discord channels (default dir is `../quad/exports/`):

```
cd apps/qw-oracle
bun scripts/load-chat/import-discord.ts
```

Expected: ~717,389 messages across 4 channels (`#antilag` ~19,438; `#dev-corner` ~206,739; `#helpdesk` ~103,361; `#quakeworld` ~387,851); four `import_log` rows for `antilag.json`, `dev-corner.json`, `helpdesk.json`, `quakeworld.json`.

- [ ] Build sessions + labels:

```
cd apps/qw-oracle
bun scripts/load-chat/build-sessions.ts
```

Expected: session count and label count match the Discord-only baseline recorded in Task 3 (label count == message count == ~717,389; one `processing_log` row with `version='v1', finished_at IS NOT NULL`).

- [ ] Build session references (reply graph):

```
cd apps/qw-oracle
bun scripts/load-chat/build-session-references.ts
```

Expected: `session_references` row count > 0. Discord has 32,863 messages with `referenced_message_id`; some fraction cross session boundaries.

- [ ] Build search index:

```
cd apps/qw-oracle
bun scripts/load-chat/build-search-index.ts
```

Expected: `session_search` count matches the Discord-only baseline recorded in Task 3 (sessions where `chat_message_count > 0`).

- [ ] Verify counts match baseline (see Phase boundary verification below). If any step's count drift exceeds 1%, **stop here, do not delete the .mjs files**, and consult Recovery.

- [ ] Once counts pass, delete the legacy scripts and SQLite files:

```
cd apps/qw-oracle/scripts
rm import-discord.mjs import-irc.mjs process-tier1.mjs build-search-index.mjs db.mjs stats.mjs stats-tier1.mjs search.mjs
rm helpdesk-benchmark.mjs helpdesk-coverage.mjs
rm sample-data.mjs sample-empty-sessions.mjs sample-for-tier2.mjs sample-helpdesk.mjs sample-ibh.mjs

cd ../data
rm -f qw.db qw.db-shm qw.db-wal
```

The `data/knowledge.db.bak-*` files are Phase 2 territory; do not touch them here.

**Verification.**

```
ls apps/qw-oracle/scripts/*.mjs 2>&1   # expect: 'No such file or directory'
ls apps/qw-oracle/data/qw.db* 2>&1     # expect: 'No such file or directory'
```

- PASS condition: both `ls` invocations report nothing matched.
- FAIL condition: any `.mjs` file remains under `apps/qw-oracle/scripts/` (the loader subdirs under `scripts/load-knowledge/` and `scripts/load-chat/` are fine; only top-level `*.mjs` are obsolete) OR `qw.db*` files remain.

## Verification (phase boundary)

Run from `apps/qw-oracle/`. PASS = proceed to Phase 4. FAIL = consult Recovery.

1. **All 8 Layer 2 tables exist.**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "\dt messages discord_channels import_log processing_log sessions message_labels session_search session_references"
   ```
   PASS condition: all 8 listed.
   FAIL condition: any missing.

2. **tsvector config is `'simple'` on Layer 2 tsv columns (D7, F9 closure).**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT relname, pg_get_indexdef(indexrelid) FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_class ic ON ic.oid = i.indexrelid WHERE relname IN ('messages','session_search') AND ic.relname LIKE '%tsv_gin'"
   ```
   PASS condition: both index defs include `to_tsvector('simple'`.
   FAIL condition: either index uses `'english'` or another config.

3. **Platform CHECK constraints lock to `'discord'` only (D9-revised closure).**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid IN ('messages'::regclass,'sessions'::regclass,'session_search'::regclass,'import_log'::regclass) AND contype='c' AND pg_get_constraintdef(oid) LIKE '%platform%'"
   ```
   PASS condition: every platform CHECK contains `platform = 'discord'`; no `'irc'` literal anywhere.
   FAIL condition: any CHECK still allows `'irc'` (D9-revised violation - regenerate the migration).

4. **Row counts match the Discord-only baseline recorded in Task 3 within 1%.**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT platform, COUNT(*)::int FROM messages GROUP BY platform"
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT 'sessions',COUNT(*) FROM sessions UNION ALL SELECT 'message_labels',COUNT(*) FROM message_labels UNION ALL SELECT 'session_search',COUNT(*) FROM session_search UNION ALL SELECT 'discord_channels',COUNT(*) FROM discord_channels UNION ALL SELECT 'import_log',COUNT(*) FROM import_log"
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT category, COUNT(*)::int FROM message_labels GROUP BY category ORDER BY COUNT(*) DESC"
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT channel_name, COUNT(*)::int FROM messages GROUP BY channel_name ORDER BY channel_name"
   ```
   PASS condition: `messages.platform` shows only `discord ~717,389`; per-channel counts match baseline (#antilag ~19,438; #dev-corner ~206,739; #helpdesk ~103,361; #quakeworld ~387,851); `sessions` within 1% of **84,369** (filter-then-segment baseline, probed 2026-05-02); `message_labels` = 717,389 (1:1 with messages); `session_search` within 1% of `sessions` count; `discord_channels` = 4; `import_log` = 4; categories present (`chat`, `system`, `reaction`, `link`, `bot`); `message_labels` rows with `session_id IS NULL` > 0 (the non-chat/non-link set).
   FAIL condition: any count drifts beyond 1%, or `messages` returns any platform != `'discord'`, or `message_labels` count != `messages` count.

5. **`message_labels` is 1:1 with `messages` (PRIMARY KEY invariant).**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT (SELECT COUNT(*) FROM messages) - (SELECT COUNT(*) FROM message_labels) AS delta"
   ```
   PASS condition: `delta = 0`.
   FAIL condition: any non-zero (suggests a duplicate id or a missing label - see Recovery).

6. **No residual `better-sqlite3` imports under `scripts/load-chat/` (or `scripts/`).**
   ```
   grep -rln "better-sqlite3\|bun:sqlite" apps/qw-oracle/scripts/
   ```
   PASS condition: zero hits.
   FAIL condition: any hit. Port the named file before declaring phase done.

7. **No legacy `.mjs` files under `apps/qw-oracle/scripts/` top level; no IRC importer.**
   ```
   ls apps/qw-oracle/scripts/*.mjs 2>/dev/null
   ls apps/qw-oracle/scripts/load-chat/import-irc.* 2>/dev/null
   ```
   PASS condition: both empty.
   FAIL condition: any match. The second match would be a D9-revised violation (no IRC importer should exist).

8. **Tests + typecheck.**
   ```
   cd apps/qw-oracle
   bun test scripts/load-chat/
   bunx tsc --noEmit
   ```
   PASS condition: tests green; typecheck exits 0.
   FAIL condition: any failure or non-zero exit.

9. **MCP module loads (stubs assert on use, not on parse).**
   ```
   cd apps/qw-oracle
   bun -e "await import('./serve/mcp/src/db.ts').then(m => console.log(Object.keys(m)))"
   ```
   PASS condition: prints `[ 'knowledgeDb', 'corpusDb' ]`. Does NOT need the MCP to *function* - that is Phase 6.
   FAIL condition: any throw at module-load time.

10. **`build-search-index.ts` smoke query returns at least one row.**
    ```
    docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT count(*)::int AS hits FROM session_search WHERE session_tsv @@ plainto_tsquery('simple', 'cl_bob')"
    ```
    PASS condition: `hits > 0` (the corpus has many `cl_bob` discussions; tsvector + GIN reproduces FTS5's "find me sessions about cl_bob" capability).
    FAIL condition: `hits = 0` - tsvector indexing may not be wired.

If all 10 PASS, Phase 4 may proceed.

## Outputs to next phase

- `qw_oracle` and `qw_oracle_test` carry the Discord-only Layer 2 schema (8 tables; tsvector `'simple'`; platform CHECK locked to `'discord'`; FK CASCADEs in place; `message_labels.session_id` NULLABLE; `session_references` reply-graph table present).
- `qw_oracle` is populated: ~717k messages, all on `platform='discord'`; sessions ~84,369 (filter-then-segment baseline); message_labels = 717,389 (every message labeled; non-chat/non-link rows have session_id IS NULL); session_search rebuilt for sessions with chat content; `session_references` holds cross-session reply edges; `import_log` and `processing_log` carry per-file / per-version bookkeeping.
- `apps/qw-oracle/scripts/load-chat/` holds the new TS pipeline; `package.json` exposes it via `load-chat:*` scripts (no `load-chat:irc`).
- `data/qw.db*` files are gone; legacy `.mjs` scripts are gone.
- `apps/qw-oracle/CLAUDE.md` documents the Layer 2 status: Discord-only, IRC excluded under D9-revised.
- The MCP module at `serve/mcp/src/db.ts` parses but throws on first use of either `knowledgeDb` or `corpusDb`. Phase 6 rewires both at once.

Phase 4 inputs: this state, plus the Layer 3 concept-note source files at `apps/qw-oracle/concept-notes/*.md` (untouched in Phase 3).

## Open questions / deferred items

1. **Resolved 2026-05-02 (operator):** The `kb_commands` (~849 rows), `kb_cvars` (~4815 rows), and `kb_facts_import_log` (~8 rows) tables in `qw.db` were pre-spec POC artifacts of an early Layer 1 attempt before the split into knowledge.db. Operator confirmed: not ported, no forensic copy wanted. Their content is fully obsoleted by the modern Layer 1 (8,937 entities in Postgres with version arc, blame, source_ref, cross-engine identity -- richer than anything kb_* held). qw.db deleted in Task 11; recovery window closed.

2. **Resolved 2026-05-02 (operator):** `stats.mjs` not ported. The 90-line frequency dashboard (totals, per-channel breakdown, top authors, year-by-year ASCII bars, DB size) is reproducible via psql when needed; online Discord-export tools cover ad-hoc inspection; the future Oracle showcase site can host a richer dashboard. The author-frequency angle surfaced during triage (could feed trust-weighting) belongs in Phase 6 retrieval ranking, not in a stats script -- raw signal already lives in `qw_oracle.messages`. Tracked as a HANDOVER future-arcs entry.

3. **Question:** `discord_channels` is hand-seeded with 4 rows; the Discord export JSON does not contain `guild_id` per message (verified). When future Discord channels join the corpus, what populates this table?
   **Default chosen for now:** Each new channel adds one row to `db/seeds/discord_channels.sql` and the operator re-runs `seed-discord-channels.ts`. The IDs are stable Discord snowflakes the operator already has on hand.
   **Who can resolve:** operator. If the channel list grows, a one-shot importer that reads `channel_id` + `guild_id` from a JSON manifest is a clean extension.

4. **Question:** `session_search` is a real table, not a materialised view. The architecture spec named both options as open. The choice here is "real table populated by a script" because it mirrors the SQLite FTS5 shape, is straightforward to TRUNCATE+rebuild, and is easy for the operator to inspect with psql. A `MATERIALIZED VIEW` with `REFRESH MATERIALIZED VIEW CONCURRENTLY` is the alternative; the `CONCURRENTLY` mode requires a UNIQUE index.
   **Default chosen for now:** Real table. Same operator-mental-model as SQLite; no surprise around when refresh fires.
   **Who can resolve:** Phase 6 may switch the shape if `search_solved_issues` benefits from concurrent-refresh semantics. Schema-level change; small migration.

5. **Question:** `import_log.id` and `processing_log.id` use `INTEGER GENERATED BY DEFAULT AS IDENTITY` (per the migration in Task 1). Phase 2's generator dialect rule promotes `INTEGER PRIMARY KEY` to `BIGINT GENERATED BY DEFAULT AS IDENTITY`. These two tables follow the operator-provided shape rather than Phase 2's rule (the SQLite originals used `INTEGER PRIMARY KEY AUTOINCREMENT` which is a rowid alias). Whether to consistently use BIGINT vs INTEGER for new (non-Phase-2-generated) tables is a small question.
   **Default chosen for now:** INTEGER for these two bookkeeping tables (their max row count is in the hundreds; INTEGER's 2^31 ceiling is safe). Phase 2's BIGINT rule is for tables that may grow into millions over a long deployment; bookkeeping tables don't.
   **Who can resolve:** operator if a future audit calls for uniform BIGINT.

6. **Resolved 2026-05-02:** `messages.platform` (and the symmetric columns on `sessions`, `session_search`, `import_log`) is **kept** with `CHECK (platform = 'discord')`. Operator confirmed: Arc 3 reconsideration becomes a one-line `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ... CHECK (platform IN ('discord', 'irc'))`; dropping would force a column-add migration plus a backfill of existing rows in Arc 3 (order of magnitude more work). The redundant-column cost is negligible (4 bytes per row at most), and asymmetric drops vs. `sessions` / `session_search` / `import_log` would be a code smell. No further action - the migration in Task 1 already encodes this.

7. **Resolved 2026-05-02 (Phase 3 amendment):** The "Layer 2 hygiene sidequest" that was parked at `docs/superpowers/parking/2026-05-02-layer2-hygiene-sidequest-prompt.md` is dissolved. The four cheap fixes (filter-then-segment, nullable session_id, drop BOT_COMMAND_PATTERNS, drop duplicate xd) and the reply-reference graph are absorbed into Phase 3. The micro-session over-segmentation issue (#2 in the hygiene design doc) and reply-chain-merging (#6) remain open for a future post-Arc-1 pass if the operator judges the session shape needs improvement after Phase 8 eval. No parking prompt exists for that work yet; the hygiene design doc at `docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md` is the durable research artifact. See `decisions.md` D18.

8. **Resolved 2026-05-02 (execution deviation, accepted):** Task 3.5 was added during execution because the original Discord backfill JSON files (`antilag.json`, `dev-corner.json`, `helpdesk.json`, `quakeworld.json`) had been cleaned up locally before this phase ran. Only the catchup files (`*-2026-02-to-2026-05.json`, ~11,474 messages) remained in `apps/quad/exports/`. The historical 717,389 messages were bulk-imported from `data/qw.db` via a new one-shot script `scripts/load-chat/import-historical-from-qwdb.ts` (idempotent via `import_log` sentinel `qw.db-historical-bulk-import-2026-05-02`). Catchup messages still flow through the standard `import-discord.ts` path. The script imports `bun:sqlite` -- this is the only intentional `bun:sqlite` reference under `scripts/`; phase verification check 6 should treat it as expected. The script becomes inert after `data/qw.db` is deleted (Task 11) but is preserved in-tree as a historical-record / re-runnable tombstone.

9. **Resolved 2026-05-02 (execution deviation, accepted):** During execution the historical bulk-import surfaced 24 rows in `qw.db` whose `embeds_json` payload contained an unpaired UTF-16 surrogate (`\ud83d` without its low surrogate -- malformed Discord embed). Postgres rejects these in JSONB ("invalid byte sequence for encoding UTF8"). `scripts/load-chat/import-historical-from-qwdb.ts` includes a `sanitizeForJsonb` helper that walks the parsed JS value and replaces unpaired surrogates with U+FFFD so the JSONB cast succeeds. The fix is local to the historical importer; `import-discord.ts` (catchup path) does not need it because Discord's live API delivers well-formed JSON.

10. **Resolved 2026-05-02 (execution deviation, accepted):** Catchup export files were named `<channel>-2026-02-to-2026-05.json` by `apps/quad/catchup.mjs` (recent commit), diverging from the historical `<channel>.json` shape that the legacy `import-discord.mjs` and the plan-shipped `import-discord.ts` both assumed. The plan-shipped channel-from-filename rule (`'#' + basename(filePath, '.json')`) would have produced `#helpdesk-2026-02-to-2026-05` instead of `#helpdesk`, splitting per-channel queries between the historical and catchup ranges. `import-discord.ts` was patched to add `channelNameFromFile` which strips the trailing `-YYYY-...` suffix; both filename styles now resolve to the bare channel handle. Tests added: `channelNameFromFile` covers both styles in `import-discord.test.ts`.

11. **Resolved 2026-05-02 (execution deviation, accepted):** Plan-shipped `classify.ts` code block (Task 5) had a self-contradiction: the header comment said "BOT_COMMAND_PATTERNS removed" (hygiene tightening #1) but the function body still iterated over `BOT_COMMAND_PATTERNS`. Executor removed the body iteration to match the comment's stated intent (the design-doc bot category audit is the durable rationale). Bot count: 9,156 -> 8,924 (net -232). Decomposition (added during triage): 359 historical pattern-flagged messages reclassified to chat (matching the design doc estimate), offset by +127 catchup messages newly tagged via Discord's `author_is_bot` flag. Math reconciles: 8,797 historical author_is_bot + 127 catchup = 8,924.

12. **Resolved 2026-05-02 (execution deviation, accepted):** Added one extra `package.json` script entry beyond the plan-listed four: `load-chat:session-references` (`bun scripts/load-chat/build-session-references.ts`). Without it the Task 5b script would have no `npm run` shortcut. No functional impact; trivially removable if the operator prefers strict plan adherence.

## Recovery (if verification fails)

- **If verification 1 (table count) fails:** Re-run the migrator. If the migration is missing from `schema_migrations`, the file may not have landed in `db/migrations/`. Verify with `ls apps/qw-oracle/db/migrations/`.

- **If verification 2 (tsvector config) fails:** The migration was written with `'english'` instead of `'simple'`. Drop `messages.content_tsv` + `session_search.session_tsv` columns, re-write the GENERATED column DDL with `to_tsvector('simple', ...)`, replay.

- **If verification 3 (platform CHECK) fails:** The migration was written allowing `'irc'` somewhere. Find the offending CHECK with the listed query, drop it, re-add with `CHECK (platform = 'discord')`. D9-revised forbids any path that allows IRC values to land in Arc 1.

- **If verification 4 (row counts) fails on Discord:** Check `import_log` for the affected file; if a row exists, the importer skipped it as already-imported (delete the `import_log` row and re-run). If no row exists, run `bun scripts/load-chat/import-discord.ts --file <path>` for the affected file with `set -x` to see the parse error; most common cause is a malformed JSON entry.

- **If verification 5 (1:1 labels) fails:** A duplicate message id exists or a label is missing. `SELECT id, COUNT(*) FROM messages GROUP BY id HAVING COUNT(*) > 1` will surface duplicate ids (Discord snowflakes are unique by construction; duplicates indicate a re-import without honoring `import_log`). `SELECT m.id FROM messages m LEFT JOIN message_labels l ON l.message_id = m.id WHERE l.message_id IS NULL` surfaces missing labels (suggests `build-sessions.ts` skipped a row). Recovery: TRUNCATE the affected channel and re-run.

- **If verification 6 (better-sqlite3 imports) fails:** Port the named file. Mechanical.

- **If verification 7 (legacy .mjs / IRC importer) fails:** Either the script wasn't deleted (rm it) or an IRC importer leaked into the redraft (delete it; D9-revised forbids it).

- **If verification 8 (tests/typecheck) fails:** Most likely: a missing `await` on a now-async function, or a missing `as unknown as <type>` cast on a postgres-js JSONB column. Both are mechanical.

- **If verification 9 (MCP module load) fails:** The Proxy stub didn't catch a property access at parse time (this should be impossible because Proxy is opaque). More likely: the test command quoting got mangled; re-run by hand.

- **If verification 10 (smoke query) returns 0 hits:** GIN index is missing or `session_tsv` has no values. `SELECT COUNT(*) FROM session_search WHERE session_tsv != ''::tsvector` should be > 0. If zero, the GENERATED column expression is wrong. Re-write the migration's `tsvector GENERATED ALWAYS AS (...)`.

- **If `build-sessions` runs out of memory or holds locks too long on the largest channel (`#quakeworld` ~388k rows):** Switch the per-channel transaction to a per-N-sessions transaction. The 5-line edit: open `db.begin` once per N flushed sessions instead of once per channel. N=1000 is a reasonable starting point. Note: the largest Discord channel is meaningfully smaller than the largest IRC channel that the SQLite-era pipeline survived (`#ibh` ~633k rows); chunking is unlikely to be needed under D9-revised's smaller corpus.

## Sub-agent findings: applied or rejected with rationale

The verification sub-agent dispatched on 2026-05-02 returned two CRITICAL items. Both touched the gap between "paper plan" and "executed code"; neither blocked the draft.

- **Sub-agent C1 (Task 9 stub not yet executed - the live `db.ts` still opens SQLite).** Rejected as a phase-MD finding. The phase-template verification rule (`phase-template.md:128-133`) explicitly says paper plans should not flag unexecuted Modified files as defects: the plan describes the change, execution happens later. **However**, the sub-agent surfaced a real bug in the planned content - my draft's stub imported types from `better-sqlite3` while the live file imports from `bun:sqlite`. That bug was applied: Task 9's code block now uses `import type { Database } from 'bun:sqlite'`, the comment block names `bun:sqlite` rather than `better-sqlite3`, and the throw message references `bun:sqlite`. Verified against `apps/qw-oracle/serve/mcp/src/db.ts:6` (live file uses `import { Database } from 'bun:sqlite'`).

- **Sub-agent C2 (Created files' parent directories `scripts/load-chat/` and `db/seeds/` do not exist).** Partially applied. The phase-template rule (`phase-template.md:128-132`) says "verify the parent directory exists" for Created files. The sub-agent is technically correct: both directories are introduced for the first time by this phase. The Write tool auto-creates parent directories, so execution does not actually fail; but to make the plan self-documenting, Task 2 now leads with an explicit `mkdir -p apps/qw-oracle/db/seeds apps/qw-oracle/scripts/load-chat` step (covers all subsequent tasks that write into either tree). Task 1's parent dir (`db/migrations/`) was confirmed to exist already (Phase 1 output, verified `db/migrations/001_init.sql` is in place).

The sub-agent's SUBSTANTIVE and ADVISORY sections were all "verified" / "correct" - no changes required from those.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

Brief filled in below; dispatched immediately after this draft lands.

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/review-findings.md

Then verify, file-by-file:

1. Every CREATE TABLE column list - diff against the corresponding SQLite shape
   in apps/qw-oracle/scripts/db.mjs (the source of truth for Layer 2). Report
   mismatches in column names, types, NOT NULL, defaults, or CHECK enums.
   Note: the `network` column from the SQLite shape is intentionally dropped
   under D9-revised because it was IRC-only ('quakenet'); flag this only if
   the phase MD does not document the drop.
2. Every CHECK constraint - verify enum values. Specifically:
   a. messages.platform / sessions.platform / session_search.platform /
      import_log.platform must contain ONLY `'discord'` per D9-revised.
   b. messages.message_type must include ('message','action','join','part',
      'quit','nick','topic','system') per the SQLite shape.
   c. message_labels.category must include ('chat','bot','reaction','link',
      'system') per process-tier1.mjs.
3. Every FK reference - verify it matches Postgres dialect (REFERENCES with
   ON DELETE CASCADE where the SQLite shape used FOREIGN KEY without explicit
   CASCADE; the explicit CASCADE is correct because the SQLite era relied on
   the recompute-from-scratch pattern).
4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase
     (run `ls` on each).
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet - this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL or anything
     else. Skip it entirely.
5. Every `import.meta.main` usage - confirmed allowed (D2 says yes under Bun).
6. Every shell command - does it use `bun` for scripts (D2)? Flag any
   residual `tsx` or `node` invocations.
7. Every reference to a finding (F9, F13 in review-findings.md) - does this
   phase actually resolve the findings it claims to? F9 is resolved by D7
   (`'simple'` config); F13 is dissolved by D9-revised (no IRC). Flag any
   contradiction.
8. Every SQL query in verification - does it parse against the schema this
   phase produces? Best-effort eyeball; Postgres validation comes at runtime.
9. "Engineer ports X" / "fills in details" / TODO smell - list any. The
   redraft should have zero of these (every code block is full content).
10. Any tables, columns, or fields the phase introduces that aren't in
    decisions.md and aren't in scripts/db.mjs - flag as potential drift.
11. D9-revised compliance check (specific to this phase):
    a. No `import-irc.ts` in Files Created.
    b. No IRC-shaped tests.
    c. No mojibake baseline machinery (no regex matching `[^\x20-\x7E]` on
       IRC content; the regex may appear ONLY if the phase MD explicitly
       says it doesn't apply).
    d. No `mirc-logs/` directory references in CLAUDE.md status prose.
    e. No `'irc'` value in any CHECK constraint.
    f. No `network` column on `messages` (was IRC-only).
    g. No `load-chat:irc` in package.json scripts.
12. Verify the recorded baseline numbers (Discord per-channel: #antilag
    ~19438, #dev-corner ~206739, #helpdesk ~103361, #quakeworld ~387851;
    discord_channels=4; import_log=4) are consistent with what the SQLite
    qw.db at draft time actually contains. If you have access to the qw.db
    SQLite file, run the baseline query in Task 3 and compare. If the file
    is gone or unreadable, note that and skip the comparison.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

---
