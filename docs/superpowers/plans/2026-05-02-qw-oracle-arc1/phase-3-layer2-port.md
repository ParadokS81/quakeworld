# Phase 3 - Layer 2 port

> **SUPERSEDED 2026-05-02.** This draft was approved at review then superseded by `decisions.md` D9-revised: Layer 2 in Arc 1 is **Discord-only**; IRC is excluded entirely. Redraft pending. Use this file as reference for Discord-side shape only — drop the IRC importer (Task 4), the IRC-shaped tests, the mojibake baseline machinery (verification gate 5), and the `'irc'` platform value from the `messages.platform` enum. The redraft will land at the same path; this banner gets removed when the redraft commits.
>
> ---

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Port the entire Layer 2 chat corpus (Discord + IRC) and its derivation pipeline (raw messages -> classified labels -> conversation sessions -> session-level search index) from SQLite + FTS5 to Postgres + tsvector + GIN, then re-populate Postgres from the same Discord JSON exports and mIRC log files the existing `.mjs` POC scripts read. The consumer-facing shape that `search_solved_issues` produces (in Phase 6) stays unchanged: lexical-only search over session-level concatenated chat, joined to per-session metadata, hydrated with raw messages filtered by category. Only the storage engine and the tokenizer change.

The legacy `.mjs` ingest pipeline is treated as throwaway POC code (per the architecture spec's open question 7 in the design doc); the port is a rewrite-and-port, not a port-then-rewrite. New TypeScript modules under `scripts/load-chat/` carry the parsing, classification, and gap-segmentation logic forward verbatim from the `.mjs` originals - the parser regexes for IRC, the classifier rules for chat/bot/reaction/link/system, and the `GAP_THRESHOLD_MINUTES = 15` session boundary all transfer 1:1. tsvector configuration is `'simple'` per D7 because the corpus is mixed-language. The IRC encoding gap (D9, F13) is documented as an accepted limitation, with a counted baseline at phase boundary so Arc 3's re-import has a number to beat.

Runnable state at phase boundary: `qw_oracle_dev` holds 7 Layer 2 tables (`messages`, `discord_channels`, `import_log`, `processing_log`, `sessions`, `message_labels`, `session_search`) populated to within 1% of the SQLite baseline (~2.66M messages, ~128k sessions, ~123k indexed sessions); `bun test scripts/load-chat/` green; `bunx tsc --noEmit` green; the `.mjs` Layer 2 scripts and the `data/qw.db*` files are gone. The MCP server's `search-solved-issues.ts` tool is NOT ported in this phase (Phase 6 territory); the MCP runtime remains broken at the qw.db layer exactly as it was already broken at the knowledge.db layer after Phase 2 - this carry-forward of the broken-MCP state is by design and ends in Phase 6.

## Inputs from previous phase

Phase 2 (Layer 1 port) complete:
- Postgres dev container `qw-oracle-postgres-dev` running at `127.0.0.1:5432`; both `qw_oracle_dev` and `qw_oracle_test` databases exist and have migrations 001 / 002 / 003 applied.
- Migrator (`bun db/migrate.ts`) appends-only, sha256-verified per file.
- `apps/qw-oracle/shared/db.ts` exports the postgres-js singleton; `import { db } from '../../shared/db.ts'` works from any script.
- `package.json` already drops `tsx` and `better-sqlite3` from runtime deps. `bun` is the runtime for everything in `scripts/load-knowledge/`. The `import:discord` / `import:irc` / `stats` script entries still point at the legacy `.mjs` files (Phase 2 explicitly left these alone) - this phase rewrites them.
- `data/knowledge.db` has been deleted (Phase 2 Task 14). `data/qw.db` is still present and is this phase's input on the SQLite side: it provides the row-count baseline and the operator-known `discord_channels` seed (4 rows).
- The MCP server (`apps/qw-oracle/serve/mcp/`) is already broken at startup because `db.ts` opens `knowledge.db` which Phase 2 deleted. Phase 3 does not change that fact; it leaves the MCP for Phase 6.

If any of these is not true, stop and resolve at the prior phase before proceeding.

## Files touched

### Created

```
apps/qw-oracle/db/migrations/004_layer2_chat.sql                    # hand-written; mirrors qw.db schema in Postgres dialect, tsvector 'simple' (D7)
apps/qw-oracle/db/seeds/discord_channels.sql                        # hand-written; 4-row seed mirroring current qw.db.discord_channels
apps/qw-oracle/scripts/load-chat/import-discord.ts                  # hand-written port of scripts/import-discord.mjs
apps/qw-oracle/scripts/load-chat/import-irc.ts                      # hand-written port of scripts/import-irc.mjs
apps/qw-oracle/scripts/load-chat/classify.ts                        # hand-written; deterministic classifier extracted from process-tier1.mjs
apps/qw-oracle/scripts/load-chat/build-sessions.ts                  # hand-written port of scripts/process-tier1.mjs
apps/qw-oracle/scripts/load-chat/build-search-index.ts              # hand-written port of scripts/build-search-index.mjs
apps/qw-oracle/scripts/load-chat/seed-discord-channels.ts           # hand-written; one-shot SQL apply for db/seeds/discord_channels.sql
apps/qw-oracle/scripts/load-chat/import-discord.test.ts             # hand-written
apps/qw-oracle/scripts/load-chat/build-sessions.test.ts             # hand-written
apps/qw-oracle/scripts/load-chat/CLAUDE.md                          # hand-written; subsystem entry doc paralleling scripts/load-knowledge/CLAUDE.md
```

### Modified

```
apps/qw-oracle/package.json                                         # add load-chat:* scripts; drop import:discord / import:irc / stats (mjs); drop better-sqlite3 IF still listed
apps/qw-oracle/CLAUDE.md                                            # Layer 2 status section: tsvector 'simple', IRC encoding gap accepted (D9 / F13)
apps/qw-oracle/serve/mcp/src/db.ts                                  # change ONE line: replace `corpusDb` better-sqlite3 open with a stub that throws on first use, with a comment naming Phase 6 as the rewire point
```

The Phase 6 stub-throw on `corpusDb` is the minimum change that lets the MCP startup at least *parse*, even though `search_solved_issues` still cannot answer. Without the stub, Phase 2's already-broken MCP gets a second kind of broken (`qw.db` is gone) and the operator loses the ability to even import the module for inspection. Phase 6 replaces both `knowledgeDb` and `corpusDb` with the postgres-js client. This is the smallest possible intervention; it does not "fix" the MCP, it just makes its failure mode a single named assertion instead of a file-not-found.

### Deleted

```
apps/qw-oracle/scripts/import-discord.mjs                           # superseded by scripts/load-chat/import-discord.ts
apps/qw-oracle/scripts/import-irc.mjs                               # superseded by scripts/load-chat/import-irc.ts
apps/qw-oracle/scripts/process-tier1.mjs                            # superseded by scripts/load-chat/build-sessions.ts + classify.ts
apps/qw-oracle/scripts/build-search-index.mjs                       # superseded by scripts/load-chat/build-search-index.ts
apps/qw-oracle/scripts/db.mjs                                       # superseded by shared/db.ts (Postgres) + db/migrations (schema)
apps/qw-oracle/scripts/stats.mjs                                    # reads qw.db; obsolete after cutover. Stats can be reproduced via psql against qw_oracle_dev when needed
apps/qw-oracle/scripts/stats-tier1.mjs                              # reads qw.db; obsolete same as stats.mjs
apps/qw-oracle/scripts/search.mjs                                   # FTS5-backed exploration script; obsolete (use psql or the eventual eval set)
apps/qw-oracle/scripts/helpdesk-benchmark.mjs                       # reads qw.db; pre-spec exploration; obsolete after cutover
apps/qw-oracle/scripts/helpdesk-coverage.mjs                        # reads qw.db; pre-spec exploration; helpdesk-coverage is the spiritual ancestor of Phase 8's eval pipeline
apps/qw-oracle/scripts/sample-data.mjs                              # reads qw.db; throwaway POC sampler
apps/qw-oracle/scripts/sample-empty-sessions.mjs                    # reads qw.db; throwaway POC sampler
apps/qw-oracle/scripts/sample-for-tier2.mjs                         # reads qw.db; throwaway POC sampler (Tier 2 = the deferred Arc 3 enrichment pipeline; the sampler is no longer driving anything)
apps/qw-oracle/scripts/sample-helpdesk.mjs                          # reads qw.db; throwaway POC sampler
apps/qw-oracle/scripts/sample-ibh.mjs                               # reads qw.db; throwaway POC sampler
apps/qw-oracle/data/qw.db                                           # SQLite Layer 2 store retired; gitignored; deletion is local-only
apps/qw-oracle/data/qw.db-shm                                       # SQLite WAL companion file
apps/qw-oracle/data/qw.db-wal                                       # SQLite WAL companion file
```

The `kb_commands`, `kb_cvars`, and `kb_facts_import_log` tables in qw.db (~5664 rows total) are pre-spec POC artifacts of an earlier Layer 1 attempt before the Layer 1 split into knowledge.db; nothing in `serve/` or `scripts/` references them. They are not ported. See Open questions.

## Tasks

### Task 1: Migration `004_layer2_chat.sql` (schema port)

**Goal.** Land migration `004_layer2_chat.sql`, mirroring the SQLite Layer 2 schema (`scripts/db.mjs:initSchema` + `:initProcessingSchema` + `:initSearchSchema`) in Postgres dialect with `'simple'` tsvector config (D7).

**Files.** `apps/qw-oracle/db/migrations/004_layer2_chat.sql`.

**Steps.**

- [ ] Create `apps/qw-oracle/db/migrations/004_layer2_chat.sql` with the full content below.

```sql
-- apps/qw-oracle/db/migrations/004_layer2_chat.sql
-- Layer 2: chat corpus (Discord + IRC). Port-only in Arc 1.
-- Source-of-truth shape: apps/qw-oracle/scripts/db.mjs (SQLite, retiring in this phase).
-- tsvector config is 'simple' (D7): the corpus is mixed-language, English stemming
-- mangles non-English tokens. Layer 1 entity descriptions and Layer 3 chunks stay
-- on 'english' because those are curated English content (different migration files).

-- Raw messages. Per CLAUDE.md "raw is immutable", every imported row is preserved
-- intact; derived processing (sessions, message_labels, session_search) is rebuildable.
CREATE TABLE messages (
  id                    TEXT PRIMARY KEY,         -- Discord snowflake or synthetic 'irc-<channel>-<counter>' id
  platform              TEXT NOT NULL CHECK (platform IN ('discord', 'irc')),
  network               TEXT,                     -- 'quakenet' for IRC; NULL for Discord
  guild_id              TEXT,                     -- Discord guild snowflake; NULL for IRC
  channel_name          TEXT NOT NULL,            -- '#quakeworld', '#helpdesk', '#ezQuake', etc. (with leading '#')
  author_id             TEXT,                     -- Discord user id; NULL for IRC
  author_name           TEXT NOT NULL,            -- nickname / username
  author_display_name   TEXT,                     -- display name where available
  author_is_bot         BOOLEAN NOT NULL DEFAULT FALSE,
  content               TEXT NOT NULL DEFAULT '',
  message_type          TEXT NOT NULL DEFAULT 'message'
                        CHECK (message_type IN ('message', 'action', 'join', 'part', 'quit',
                                                'nick', 'topic', 'system')),
  referenced_message_id TEXT,                     -- reply-to (Discord only)
  attachment_count      INTEGER NOT NULL DEFAULT 0,
  attachments_json      JSONB,
  embed_count           INTEGER NOT NULL DEFAULT 0,
  embeds_json           JSONB,
  reaction_count        INTEGER NOT NULL DEFAULT 0,
  reactions_json        JSONB,
  created_at            TIMESTAMPTZ NOT NULL,
  edited_at             TIMESTAMPTZ,
  source                TEXT NOT NULL,            -- 'discord-export' | 'mirc-log' | 'bot-live'
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
-- Discord exports do NOT include guild_id at message granularity (verified in
-- /home/paradoks/projects/quake/quad/exports/sample-quakeworld-200.json), so the
-- table is populated separately rather than derived from import.
CREATE TABLE discord_channels (
  channel_name TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  guild_id     TEXT NOT NULL
);

-- Per-file import bookkeeping. Used by importers to skip already-loaded files.
CREATE TABLE import_log (
  id                INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  source_file       TEXT NOT NULL UNIQUE,
  platform          TEXT NOT NULL CHECK (platform IN ('discord', 'irc')),
  channel_name      TEXT,
  message_count     INTEGER NOT NULL DEFAULT 0,
  date_range_start  TIMESTAMPTZ,
  date_range_end    TIMESTAMPTZ,
  imported_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-version processing bookkeeping. process-tier1 used this to skip re-processing
-- when VERSION matched. Port preserves the gate.
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

-- Conversation sessions: groups of messages forming a discussion, segmented by
-- gap_threshold_minutes of silence. Derived; rebuilt by build-sessions.ts.
CREATE TABLE sessions (
  id                  BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  channel_name        TEXT NOT NULL,
  platform            TEXT NOT NULL CHECK (platform IN ('discord', 'irc')),
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

-- Per-message classification + session assignment. Derived; rebuilt by build-sessions.ts.
-- Note: SQLite had `message_id PRIMARY KEY` (1:1 message-to-label). Port preserves
-- that shape rather than the legacy plan's PRIMARY KEY (message_id, session_id, category)
-- because the live derivation produces exactly one row per message.
CREATE TABLE message_labels (
  message_id  TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  session_id  BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('chat', 'bot', 'reaction', 'link', 'system')),
  version     TEXT NOT NULL
);
CREATE INDEX message_labels_session   ON message_labels(session_id);
CREATE INDEX message_labels_category  ON message_labels(category);

-- Concatenated chat content per session, indexed for FTS. Replaces SQLite FTS5's
-- session_search VIRTUAL TABLE. Postgres has no FTS5 analogue; we ship a real
-- table populated by build-search-index.ts (TRUNCATE + rebuild, idempotent on
-- inputs). Real table over MATERIALIZED VIEW because (a) FTS5 was a real table
-- in the SQLite era so the operator's mental model is "explicit-table indexed
-- by GIN", (b) MATERIALIZED VIEW with CONCURRENTLY refresh requires a UNIQUE
-- index on the result and adds operational surface for no win in Arc 1.
-- tsvector config 'simple' per D7. Open question 5 in this phase MD names the
-- materialised-view alternative if Phase 6 retrieval latency demands it.
CREATE TABLE session_search (
  session_id           BIGINT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  channel_name         TEXT NOT NULL,
  platform             TEXT NOT NULL,
  started_at           TIMESTAMPTZ NOT NULL,
  participants         JSONB,
  chat_message_count   INTEGER NOT NULL,
  content              TEXT NOT NULL,            -- "<author>: <text>" lines, joined by '\n'
  session_tsv          tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED
);
CREATE INDEX session_search_tsv_gin    ON session_search USING GIN (session_tsv);
CREATE INDEX session_search_channel    ON session_search(channel_name, started_at);
```

The `attachments_json` / `embeds_json` / `reactions_json` / `participants_json` columns become JSONB (matches Phase 2's dialect rule for `*_json` SQLite columns; postgres-js auto-casts JS arrays / objects passed to template literals). The legacy plan's `discord_channels` shape is preserved verbatim. The legacy plan's `session_search` was a VIEW with a runtime-aggregating subquery; the port instead uses a real table because (a) FTS5 in SQLite was a real table, (b) per-query aggregation over 128k sessions x ~7 messages-each is slow, (c) SQLite's `build-search-index.mjs` already TRUNCATE-and-rebuild the index so the explicit-table pattern is what's actually in the operator's mental model.

- [ ] Run the migrator against both DBs:

```
cd apps/qw-oracle
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_dev      bun db/migrate.ts
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test     bun db/migrate.ts
```

**Verification.**

```
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "\dt messages discord_channels import_log processing_log sessions message_labels session_search"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT filename FROM schema_migrations WHERE filename = '004_layer2_chat.sql'"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT pg_get_indexdef(oid) FROM pg_class WHERE relname IN ('messages_content_tsv_gin','session_search_tsv_gin')"
```

- PASS condition: 7 tables listed; `004_layer2_chat.sql` present in `schema_migrations`; both tsvector index defs include `to_tsvector('simple'`.
- FAIL condition: missing tables, missing migration row, or any tsvector index uses `'english'` (D7 violation - regenerate the migration with `'simple'` and re-apply).

### Task 2: Hand-seed `discord_channels`

**Goal.** Carry the operator's 4 known Discord channel rows from SQLite into Postgres. The Discord export JSON does not contain `guild_id`, and `import-discord.mjs` historically did not populate this table - the rows were either set by an earlier script no longer in the repo or applied manually. Phase 3 makes the seed explicit.

**Files.** `apps/qw-oracle/db/seeds/discord_channels.sql`, `apps/qw-oracle/scripts/load-chat/seed-discord-channels.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/db/seeds/discord_channels.sql`. Values are copied verbatim from `data/qw.db` (verified at draft time):

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
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT * FROM discord_channels ORDER BY channel_name"
```

- PASS condition: prints 4 rows with names `#antilag`, `#dev-corner`, `#helpdesk`, `#quakeworld`; all `guild_id` values are `166866762787192833`.
- FAIL condition: row count != 4, or any value drifts from the seed file.

### Task 3: `import-discord.ts` (Bun + postgres-js port of import-discord.mjs)

**Goal.** Replace `scripts/import-discord.mjs` with a TypeScript port that writes into `qw_oracle_dev`. Idempotent on Discord snowflake (`ON CONFLICT (id) DO NOTHING`); skips files already named in `import_log` to match the existing `.mjs` skip behavior.

**Files.** `apps/qw-oracle/scripts/load-chat/import-discord.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/import-discord.ts`. The port preserves the existing message-type mapping and the channel-name-from-filename rule; the legacy monolithic plan's `{ guild, channel, messages }` wrapper shape is **wrong** - actual Discord exports are flat JSON arrays (verified against `/home/paradoks/projects/quake/quad/exports/sample-quakeworld-200.json`). Use the flat-array shape from the live `.mjs`.

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

async function importFile(filePath: string): Promise<number> {
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

  // Date range. Discord exports are not strictly chronological in the source JSON,
  // but ISO-8601 strings sort lexically.
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

The `import.meta.main` guard is Bun-supported and used here per D2.

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/import-discord.ts --file /home/paradoks/projects/quake/quad/exports/helpdesk.json
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT channel_name, COUNT(*) FROM messages WHERE platform='discord' GROUP BY channel_name ORDER BY channel_name"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT * FROM import_log WHERE source_file = 'helpdesk.json'"
```

- PASS condition: helpdesk row in `import_log` with `message_count` ~103361 (the SQLite baseline); `messages` row count for `#helpdesk` matches.
- FAIL condition: zero rows imported, or `message_count != 103361 +/- 1%`.

### Task 4: `import-irc.ts` (faithful port of import-irc.mjs)

**Goal.** Replace `scripts/import-irc.mjs` with a TypeScript port. The mIRC log parser (`Session Start:`, `[HH:MM]`, `<nick> text`, `* nick action`, midnight rollover, mode-string regexes) transfers verbatim from the live `.mjs`. Synthetic ids (`irc-<channel>-<counter>`) preserve the `INSERT OR IGNORE` -> `ON CONFLICT (id) DO NOTHING` idempotency contract. The IRC encoding gap (D9) is documented but not fixed.

**Files.** `apps/qw-oracle/scripts/load-chat/import-irc.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/import-irc.ts`. The parser block ports `parseIrcLog()` from `scripts/import-irc.mjs:43-219` literally; only the row-write side (which used `db.prepare(...).run(...)`) becomes postgres-js template literals batched per file. Encoding is read as UTF-8; mojibake from pre-2016 non-English content (D9 / F13) survives the port unchanged.

```ts
// apps/qw-oracle/scripts/load-chat/import-irc.ts
//
// Port of scripts/import-irc.mjs (SQLite, retired in this phase).
// mIRC log format:
//   Session Start: Sun Jan 01 14:36:54 2006
//   [HH:MM] <nickname> message
//   [HH:MM] * nickname action/event
//   Session Close: ...
//
// Synthetic message ids: 'irc-<channel>-<counter>'. Counter resets per file,
// so re-importing the same file is idempotent under ON CONFLICT (id) DO NOTHING.
//
// IRC encoding gap (D9 / F13): pre-2016 non-English content (Russian, Swedish,
// etc.) is mojibake because the original mIRC client wrote in a non-UTF-8
// codepage and we read as UTF-8 here. Arc 3 will re-import with the correct
// codepage; v1 ships with the corruption visible. Verification step at phase
// boundary records the count so Arc 3 has a number to beat.
//
// Usage:
//   bun scripts/load-chat/import-irc.ts                   # default: ../quad/exports/mirc-logs
//   bun scripts/load-chat/import-irc.ts <dir>             # explicit dir
//   bun scripts/load-chat/import-irc.ts --file <path>     # single file

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { db, closeDb } from '../../shared/db.ts';

interface IrcMessage {
  id: string;
  channel: string;
  author: string;
  content: string;
  type: 'message' | 'action' | 'join' | 'quit' | 'nick' | 'topic' | 'system';
  time: string;
}

function parseSessionDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// 1:1 port of parseIrcLog from scripts/import-irc.mjs:43-219.
function parseIrcLog(filePath: string, fileName: string): IrcMessage[] {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const messages: IrcMessage[] = [];
  let currentDate: Date | null = null;
  let msgCounter = 0;
  // Channel name from filename: '#quakeworld.QuakeNet.log' -> '#quakeworld'.
  const channelName = fileName.split('.')[0]!;

  for (const line of lines) {
    const sessionMatch = line.match(/^Session Start: (.+)$/);
    if (sessionMatch) {
      currentDate = parseSessionDate(sessionMatch[1]!);
      continue;
    }
    if (line.startsWith('Session Close:')) continue;
    if (!line.startsWith('[')) continue;
    if (!currentDate) continue;

    const timeMatch = line.match(/^\[(\d{2}):(\d{2})\]\s(.*)$/);
    if (!timeMatch) continue;
    const hours = parseInt(timeMatch[1]!, 10);
    const minutes = parseInt(timeMatch[2]!, 10);
    const rest = timeMatch[3]!;

    const ts = new Date(currentDate);
    const prevHours = currentDate.getHours();
    if (prevHours > 20 && hours < 4) {
      currentDate.setDate(currentDate.getDate() + 1);
      ts.setDate(ts.getDate() + 1);
    }
    ts.setHours(hours, minutes, 0, 0);
    currentDate.setHours(hours, minutes, 0, 0);
    const isoTime = ts.toISOString();

    // Regular message: <nick> text
    const msgMatch = rest.match(/^<([^>]+)>\s(.*)$/);
    if (msgMatch) {
      msgCounter++;
      messages.push({
        id: `irc-${channelName}-${msgCounter}`,
        channel: channelName,
        author: msgMatch[1]!.replace(/^[@+%]/, ''),
        content: msgMatch[2]!,
        type: 'message',
        time: isoTime,
      });
      continue;
    }

    // Action/event: * nickname ...
    const actionMatch = rest.match(/^\* (.+)$/);
    if (actionMatch) {
      const actionText = actionMatch[1]!;

      if (actionText.includes('has joined')) {
        const m = actionText.match(/^(\S+)/);
        if (m) {
          msgCounter++;
          messages.push({
            id: `irc-${channelName}-${msgCounter}`,
            channel: channelName,
            author: m[1]!,
            content: actionText,
            type: 'join',
            time: isoTime,
          });
        }
        continue;
      }

      if (actionText.includes('Quit') || actionText.includes('has left')) {
        const m = actionText.match(/^(\S+)/);
        if (m) {
          msgCounter++;
          messages.push({
            id: `irc-${channelName}-${msgCounter}`,
            channel: channelName,
            author: m[1]!,
            content: actionText,
            type: 'quit',
            time: isoTime,
          });
        }
        continue;
      }

      if (actionText.includes('is now known as')) {
        const m = actionText.match(/^(\S+) is now known as (\S+)/);
        if (m) {
          msgCounter++;
          messages.push({
            id: `irc-${channelName}-${msgCounter}`,
            channel: channelName,
            author: m[1]!,
            content: `-> ${m[2]}`,
            type: 'nick',
            time: isoTime,
          });
        }
        continue;
      }

      if (actionText.includes('changes topic to') || actionText.includes('Topic is')) {
        msgCounter++;
        const topicAuthor = actionText.match(/^(\S+)/)?.[1] ?? 'system';
        messages.push({
          id: `irc-${channelName}-${msgCounter}`,
          channel: channelName,
          author: topicAuthor,
          content: actionText,
          type: 'topic',
          time: isoTime,
        });
        continue;
      }

      if (actionText.includes('sets mode') || actionText.includes('was kicked')) {
        msgCounter++;
        messages.push({
          id: `irc-${channelName}-${msgCounter}`,
          channel: channelName,
          author: 'system',
          content: actionText,
          type: 'system',
          time: isoTime,
        });
        continue;
      }

      // /me action: * nick text
      const meMatch = actionText.match(/^(\S+)\s(.+)$/);
      if (meMatch && !actionText.includes('(') && !actionText.includes('Now talking')) {
        msgCounter++;
        messages.push({
          id: `irc-${channelName}-${msgCounter}`,
          channel: channelName,
          author: meMatch[1]!,
          content: `* ${meMatch[1]} ${meMatch[2]}`,
          type: 'action',
          time: isoTime,
        });
        continue;
      }
    }

    // Channel service messages: -Q-, -L- (skipped - bot/service noise).
    const serviceMatch = rest.match(/^-(\w+)-\s(.+)$/);
    if (serviceMatch) continue;
  }
  return messages;
}

const BATCH_SIZE = 1000;

async function alreadyImported(sourceFile: string): Promise<number | null> {
  const rows = await db<{ message_count: number }[]>`
    SELECT message_count FROM import_log WHERE source_file = ${sourceFile}
  `;
  return rows.length > 0 ? rows[0]!.message_count : null;
}

async function importFile(filePath: string): Promise<number> {
  const fileName = filePath.split('/').pop()!;
  const skip = await alreadyImported(fileName);
  if (skip !== null) {
    console.log(`  [skip] ${fileName} -- already imported (${skip.toLocaleString()} rows)`);
    return skip;
  }

  console.log(`  [parse] ${fileName}`);
  const messages = parseIrcLog(filePath, fileName);
  console.log(`  [parsed] ${messages.length.toLocaleString()} messages`);

  let inserted = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    await db.begin(async (tx) => {
      for (const m of batch) {
        await tx`
          INSERT INTO messages (
            id, platform, network, channel_name, author_name, author_display_name,
            content, message_type, created_at, source, source_file
          ) VALUES (
            ${m.id}, 'irc', 'quakenet', ${m.channel}, ${m.author}, ${m.author},
            ${m.content}, ${m.type}, ${m.time}::timestamptz, 'mirc-log', ${fileName}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        inserted++;
      }
    });
  }

  const times = messages.map((m) => m.time).sort();
  await db`
    INSERT INTO import_log (source_file, platform, channel_name, message_count,
                            date_range_start, date_range_end)
    VALUES (${fileName}, 'irc', ${messages[0]?.channel ?? null}, ${inserted},
            ${times[0] ?? null}, ${times[times.length - 1] ?? null})
    ON CONFLICT (source_file) DO UPDATE
      SET message_count = EXCLUDED.message_count,
          imported_at   = now()
  `;
  console.log(`  [done] ${fileName} -- ${inserted.toLocaleString()} inserted`);
  return inserted;
}

async function importDir(dir: string): Promise<void> {
  const files = readdirSync(dir).filter((f) => f.endsWith('.log'));
  console.log(`Found ${files.length} IRC log files in ${dir}`);
  let total = 0;
  for (const f of files) total += await importFile(join(dir, f));
  console.log(`\n=== IRC IMPORT COMPLETE === total: ${total.toLocaleString()} rows`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0) {
    await importFile(resolve(args[fileIdx + 1]!));
  } else {
    const dir = args[0] ? resolve(args[0]) : resolve('..', 'quad', 'exports', 'mirc-logs');
    await importDir(dir);
  }
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
```

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/import-irc.ts --file /home/paradoks/projects/quake/quad/exports/mirc-logs/#ktpro.QuakeNet.log
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT COUNT(*) FROM messages WHERE platform='irc' AND channel_name='#ktpro'"
```

- PASS condition: row count for `#ktpro` is 11020 (the SQLite baseline) +/- 1%.
- FAIL condition: zero rows or count off by more than 1%.

### Task 5: `classify.ts` + `build-sessions.ts` (port of process-tier1.mjs)

**Goal.** Faithful port of `scripts/process-tier1.mjs`'s deterministic classifier and gap-segmenter, writing into Postgres `sessions` + `message_labels`. Idempotent gating preserved via `processing_log.version`. Per the live `.mjs`: `VERSION = 'v1'`, `GAP_THRESHOLD_MINUTES = 15`.

**Files.** `apps/qw-oracle/scripts/load-chat/classify.ts`, `apps/qw-oracle/scripts/load-chat/build-sessions.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/load-chat/classify.ts`. Pure-function classifier; no DB access. Direct port of process-tier1.mjs:23-93.

```ts
// apps/qw-oracle/scripts/load-chat/classify.ts
//
// Deterministic message classifier. No LLM. Port of scripts/process-tier1.mjs
// classification rules, line-for-line, including the bot command patterns and
// the reaction-words list.

const BOT_COMMAND_PATTERNS: RegExp[] = [
  /^[!.]\w/,                                        // !command or .command
  /^(my luck|fishbot |learn |forget |suka|logan)/i,
  /^(ttop10|!ttop10|!top10)/i,
];

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

- [ ] Create `apps/qw-oracle/scripts/load-chat/build-sessions.ts`. Port of process-tier1.mjs:95-273. The shape is preserved: per-channel pass, gap segmentation on non-system messages, flush-session on gap-exceeded, classifier output written to `message_labels`.

```ts
// apps/qw-oracle/scripts/load-chat/build-sessions.ts
//
// Port of scripts/process-tier1.mjs. Rebuilds sessions + message_labels from raw
// messages. Idempotent: existing-version short-circuit, then TRUNCATE + rebuild.
// Classifier rules and gap-segmentation logic match the SQLite-era pipeline 1:1.
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

interface ChannelRow { channel_name: string; platform: 'discord' | 'irc'; cnt: number }

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
      if (!sessionStart || sessionMessages.length === 0) return;
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

    for (const msg of messages) {
      const ts = new Date(msg.created_at).getTime();
      const category = classifyMessage({
        message_type: msg.message_type,
        author_is_bot: msg.author_is_bot,
        content: msg.content,
        attachment_count: msg.attachment_count,
      });
      if (category !== 'system') {
        if (prevTs === null || ts - prevTs > gapMs) {
          await flushSession();
          sessionStart = msg.created_at;
        }
        sessionEnd = msg.created_at;
        prevTs = ts;
      }
      sessionMessages.push(msg);
      if (category === 'chat' || category === 'link') {
        sessionParticipants.add(msg.author_name);
        sessionChatCount += 1;
      }
      labelsBuffer.push({ messageId: msg.id, category });
    }
    await flushSession();
  });

  return { sessions: totalSessions, labeled: messages.length };
}

async function main(): Promise<void> {
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

The TRUNCATE-then-rebuild approach plus the per-channel transaction match the SQLite shape. The per-channel transaction is large (millions of rows for `#ezQuake`); postgres-js handles this without manual chunking, but if memory becomes a problem at runtime, the recovery section below names the chunking variant.

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/build-sessions.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT COUNT(*) FROM sessions; SELECT COUNT(*) FROM message_labels"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT category, COUNT(*) FROM message_labels GROUP BY category ORDER BY COUNT(*) DESC"
```

- PASS condition: `sessions` count is ~128084 (+/- 1% of SQLite baseline); `message_labels` count equals `messages` count (1:1 labeling); category breakdown roughly matches SQLite's: chat ~1486716, system ~1005844, reaction ~122608, link ~26303, bot ~19893 (each +/- 1%).
- FAIL condition: drift on session count or label count beyond 1%; missing categories; or label count != message count (PRIMARY KEY constraint violation suggests a duplicate message id slipped through).

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

The `${s.participants_json as unknown as string}::jsonb` cast is an artifact of postgres-js typing JSONB columns as `unknown`; the runtime value is already JSON, postgres-js just round-trips it. Lowercase string arrays don't need re-stringify.

**Verification.**

```
cd apps/qw-oracle
bun scripts/load-chat/build-search-index.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT COUNT(*) FROM session_search"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT session_id, ts_rank_cd(session_tsv, query) AS rank FROM session_search, plainto_tsquery('simple', 'screen wobble') query WHERE session_tsv @@ query ORDER BY rank DESC LIMIT 3"
```

- PASS condition: `session_search` count is ~123410 +/- 1%; the smoke-test query returns at least one row (the corpus contains `cl_bob` discussions).
- FAIL condition: count drift > 1%, or zero rows for the smoke-test query (suggests tsvector indexing failed or the `simple` config silently dropped tokens it shouldn't).

### Task 7: Update `package.json` script entries

**Goal.** Replace the `import:discord` / `import:irc` / `stats` mjs entries with the new `load-chat:*` bun commands; ensure no Layer 2 references to `better-sqlite3` remain.

**Files.** `apps/qw-oracle/package.json`.

**Steps.**

- [ ] Replace the existing import entries with the post-port shape. Phase 2's package.json shape is the baseline; this task only touches the chat-related scripts. Final scripts block (after this task):

```json
"scripts": {
  "typecheck": "tsc --noEmit",
  "load-knowledge": "bun scripts/load-knowledge/index.ts",
  "load-chat:discord": "bun scripts/load-chat/import-discord.ts",
  "load-chat:irc": "bun scripts/load-chat/import-irc.ts",
  "load-chat:sessions": "bun scripts/load-chat/build-sessions.ts",
  "load-chat:search-index": "bun scripts/load-chat/build-search-index.ts",
  "load-chat:seed-channels": "bun scripts/load-chat/seed-discord-channels.ts",
  "generate-pg-migration": "bun scripts/generate-pg-migration.ts",
  "db:up": "docker compose -f db/docker-compose.dev.yml up -d",
  "db:down": "docker compose -f db/docker-compose.dev.yml down",
  "db:logs": "docker compose -f db/docker-compose.dev.yml logs -f postgres",
  "db:psql": "docker compose -f db/docker-compose.dev.yml exec postgres psql -U qworacle -d qw_oracle_dev",
  "migrate": "bun db/migrate.ts",
  "migrate:reset": "bun db/migrate.ts --reset",
  "test": "DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test"
}
```

- [ ] If `better-sqlite3` or `@types/better-sqlite3` still appear in `dependencies` / `devDependencies` (Phase 2 was supposed to remove them but the loader and the MCP both touched this file - verify rather than assume), drop them.

- [ ] `npm install --no-workspaces` (project rule) to refresh `package-lock.json`.

**Verification.**

```
cd apps/qw-oracle
grep -E '"(import:discord|import:irc|stats)":' package.json && echo "FAIL: legacy script entries still present" || echo "OK: legacy mjs scripts removed"
grep -E "better-sqlite3" package.json && echo "FAIL: better-sqlite3 still listed" || echo "OK: no better-sqlite3"
test -d node_modules/better-sqlite3 && echo "FAIL: better-sqlite3 still installed" || echo "OK: not installed"
```

- PASS condition: all three lines print `OK:`.
- FAIL condition: any `FAIL:` line.

### Task 8: Document the IRC encoding gap and the Layer 2 status (D9, F13)

**Goal.** Make D9's "explicit acceptance" visible by editing `apps/qw-oracle/CLAUDE.md`'s status section. Phase 3 ships with corrupted non-English IRC; the fix is Arc 3; the count is recorded at phase-boundary verification (Step 5 below).

**Files.** `apps/qw-oracle/CLAUDE.md`, `apps/qw-oracle/scripts/load-chat/CLAUDE.md`.

**Steps.**

- [ ] In `apps/qw-oracle/CLAUDE.md`, after the existing "Status" line near the top, add a "Layer 2 status (Arc 1 / Phase 3)" subsection with content along these lines:

```
### Layer 2 status (Arc 1 / Phase 3 -- Postgres + tsvector)

- Authoritative store: Postgres `qw_oracle_dev`, tables `messages`, `discord_channels`,
  `import_log`, `processing_log`, `sessions`, `message_labels`, `session_search`.
- tsvector config: `'simple'` (language-agnostic). Mixed-language corpus; English
  stemming would mangle non-English tokens. See decisions.md D7.
- IRC encoding gap: pre-2016 non-English content (Russian, Swedish, others) is
  mojibake because the source mIRC client wrote in a non-UTF-8 codepage.
  Upper-bound baseline: ~N rows out of ~1.94M IRC rows contain at least one
  byte outside ASCII printable (N = recorded at Phase 3 verification; SQLite
  baseline 547,684; this includes both mojibake and well-formed UTF-8). The
  pure-mojibake share is smaller; the upper bound is the regression-tracking
  number. Re-import with the correct codepage is Arc 3 work (see decisions.md
  D9, review-findings.md F13). Until Arc 3 ships, queries against affected
  rows will hit garbage tokens and be effectively unsearchable.
- Layer 2 in v1 is port-only. No segmentation rework, no summarisation, no
  embeddings. `search_solved_issues` is lexical-only, same shape as before.
```

The literal "N" gets replaced with the count from the phase-boundary verification step, after Task 11.

- [ ] Create `apps/qw-oracle/scripts/load-chat/CLAUDE.md` mirroring the structure of `scripts/load-knowledge/CLAUDE.md`. One-liner sections naming each script's purpose, the import order, the idempotency invariants (per-file skip via `import_log`, per-version skip via `processing_log`, `ON CONFLICT DO NOTHING` on message id).

**Verification.**

```
grep -A 1 "Layer 2 status" apps/qw-oracle/CLAUDE.md | head -20
test -f apps/qw-oracle/scripts/load-chat/CLAUDE.md && echo "OK: load-chat CLAUDE.md present" || echo "FAIL"
```

- PASS condition: status section visible, scripts/load-chat/CLAUDE.md exists.
- FAIL condition: missing status section or missing CLAUDE.md.

### Task 9: Stub `corpusDb` in serve/mcp/src/db.ts

**Goal.** The MCP currently imports `Database` from better-sqlite3 and opens both `knowledge.db` (Phase 2 deleted) and `qw.db` (this phase deletes). Phase 6 will rewire the whole MCP to postgres-js. Until then, the import-time file-not-found makes the module fail to load at all, blocking even read-only inspection. Replace the open with a deferred-throw stub that lets the module parse but throws on first use - same shape Phase 2 should have applied to `knowledgeDb` if it had foreseen this; Phase 3 only addresses `corpusDb` because that's the qw.db reference, and applies the same shape to `knowledgeDb` to keep the MCP module loadable.

**Files.** `apps/qw-oracle/serve/mcp/src/db.ts`.

**Steps.**

- [ ] Edit `apps/qw-oracle/serve/mcp/src/db.ts`. Replace the two `new Database(...)` calls with a Proxy that throws `'MCP DB not yet rewired -- Phase 6 will replace better-sqlite3 with postgres-js'` on any property access. The error names Phase 6 explicitly so the next contributor (or operator) knows what to do. Concrete shape:

```ts
// apps/qw-oracle/serve/mcp/src/db.ts
//
// Layer 1 (engine + game content) used to live in knowledge.db; Layer 2
// (community chat corpus) used to live in qw.db. Both have been retired
// by Arc 1 Phases 2 and 3 respectively. Phase 6 rewires this module to
// postgres-js. Until then, both exports are tripwires: any property access
// throws a named error so the failure surfaces clearly instead of as a
// confusing better-sqlite3 file-not-found.

import type Database from 'better-sqlite3';

function makeStub(name: string): Database.Database {
  const message =
    `MCP DB '${name}' is not yet rewired to Postgres. ` +
    `Arc 1 Phase 6 (mcp-rewrite) replaces better-sqlite3 with postgres-js.`;
  return new Proxy({} as Database.Database, {
    get() { throw new Error(message); },
    apply() { throw new Error(message); },
  });
}

export const knowledgeDb = makeStub('knowledge.db');
export const corpusDb = makeStub('qw.db');
```

The `import type Database from 'better-sqlite3'` keeps the Database type available for the typed cast; we are not opening any SQLite file. `better-sqlite3` is still in node_modules (Phase 2 was supposed to remove it, but the MCP's tools/*.ts files still import the types from it). Phase 6 removes it for real.

**Verification.**

```
cd apps/qw-oracle
bun -e "await import('./serve/mcp/src/db.ts').then(m => console.log('parsed', Object.keys(m)))"
bun -e "import { knowledgeDb } from './serve/mcp/src/db.ts'; try { knowledgeDb.prepare('select 1'); } catch (e) { console.log('expected throw:', (e as Error).message); }"
```

- PASS condition: first command prints `parsed [ 'knowledgeDb', 'corpusDb' ]`; second prints the named error message.
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
// Verifies (1) import inserts the expected rows, (2) re-import is idempotent.

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
    process.env.DATABASE_URL = url;
  });
  afterAll(async () => {
    rmSync(tmpDir, { recursive: true, force: true });
    await sql.end();
  });

  test('first import inserts rows and records import_log', async () => {
    const { importFile } = await import('./import-discord.ts');
    // The module exports `importFile` for test use; if it does not in the
    // initial draft, refactor: hoist the helper out of `main` and export it.
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

If `importFile` is not exported from `import-discord.ts` in the initial draft, refactor the module: move `importFile` to a top-level `export` and have `main` call it. The test depends on this export.

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
    // Two sessions: t=0..t=5 (4 messages, all chat) then a 30min gap, then 1 chat msg.
    const base = new Date('2024-01-01T00:00:00.000Z').getTime();
    const rows = [
      { id: 'd1', t: base + 0,                content: 'hi all',                   type: 'message' },
      { id: 'd2', t: base + 60_000,           content: 'help with cl_bob',          type: 'message' },
      { id: 'd3', t: base + 180_000,          content: 'try setting it to 0',       type: 'message' },
      { id: 'd4', t: base + 300_000,          content: 'thanks',                    type: 'message' },
      { id: 'd5', t: base + 30 * 60_000 + 60, content: 'second session msg',        type: 'message' },
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
    process.env.DATABASE_URL = url;
    // Reset the processing_log gate so the builder runs.
    await sql`DELETE FROM processing_log WHERE version = 'v1'`;
    const mod = await import('./build-sessions.ts');
    // Same export-shape note as import-discord.test.ts: the runner needs a
    // callable entry. If `main` is not exported, refactor to export it.
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

**Goal.** Run the full Layer 2 load against `qw_oracle_dev`, verify counts against the SQLite baseline, then delete the obsolete `.mjs` scripts and `qw.db*` files. Idempotent: every step short-circuits on second run, so re-execution is safe.

**Files.** None added; files deleted as listed in "Files touched / Deleted".

**Steps.**

- [ ] Operator records the SQLite baseline (verified at draft time, 2026-05-02):

```
Layer 2 baseline from data/qw.db (SQLite):

  messages total:   2,661,364
    discord:          717,389
    irc:            1,943,975

  per discord channel:
    #antilag:          19,438
    #dev-corner:      206,739
    #helpdesk:        103,361
    #quakeworld:      387,851

  per irc channel:
    #duelmania:        74,763
    #eql:             188,180
    #ezQuake:         403,997
    #fte:              69,696
    #fuhquake:          8,892
    #ibh:             633,080
    #ktpro:            11,020
    #ktx:             118,624
    #mvdsv:            41,064
    #qhlan:            66,633
    #quakeworld:      258,505
    #qw-dev:           10,171
    #qwdrama:          17,881
    #slackers:         41,469

  sessions:           128,084
  message_labels:   2,661,364   (1:1 with messages)
  session_search:     123,410   (sessions with chat_message_count > 0)
  discord_channels:         4
  import_log:              18

  category breakdown of message_labels:
    chat:           1,486,716
    system:         1,005,844
    reaction:         122,608
    link:              26,303
    bot:               19,893

  IRC mojibake baseline (D9 / F13 measurement):
    rows where content contains any byte outside ASCII printable range
    (regex `[^\x20-\x7E]`, matching the Postgres verification query exactly):
    547,684 IRC rows. This is an UPPER BOUND that includes both genuine
    mojibake AND well-formed UTF-8 multi-byte sequences (~176,695 of the
    547,684 are well-formed multi-byte by `length <> octet_length`); the
    mojibake fraction is the remainder, plus a tail of mojibake whose bytes
    happen to land in printable ASCII. Arc 3's re-import target is "drive
    this count toward zero by re-decoding under correct codepage."
```

These numbers are the regression gate for this phase.

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

Expected: ~717k messages across 4 channels; the four `import_log` rows for `antilag.json`, `dev-corner.json`, `helpdesk.json`, `quakeworld.json`.

- [ ] Import all IRC logs (default dir is `../quad/exports/mirc-logs/`):

```
cd apps/qw-oracle
bun scripts/load-chat/import-irc.ts
```

Expected: ~1.94M messages across 14 channels; 14 `import_log` rows.

- [ ] Build sessions + labels:

```
cd apps/qw-oracle
bun scripts/load-chat/build-sessions.ts
```

Expected: ~128k sessions; 2.66M label rows; one `processing_log` row with `version='v1', finished_at IS NOT NULL`.

- [ ] Build search index:

```
cd apps/qw-oracle
bun scripts/load-chat/build-search-index.ts
```

Expected: ~123k session_search rows.

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
- FAIL condition: any `.mjs` file remains under `apps/qw-oracle/scripts/` (the loader subdir under `scripts/load-knowledge/` and `scripts/load-chat/` is fine; only top-level `*.mjs` are obsolete) OR `qw.db*` files remain.

## Verification (phase boundary)

Run from `apps/qw-oracle/`. PASS = proceed to Phase 4. FAIL = consult Recovery.

1. **All 7 Layer 2 tables exist with the expected shapes.**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "\dt messages discord_channels import_log processing_log sessions message_labels session_search"
   ```
   PASS condition: all 7 listed.
   FAIL condition: any missing.

2. **tsvector config is `'simple'` on Layer 2 tsv columns (D7, F9 closure).**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT relname, pg_get_indexdef(indexrelid) FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_class ic ON ic.oid = i.indexrelid WHERE relname IN ('messages','session_search') AND ic.relname LIKE '%tsv_gin'"
   ```
   PASS condition: both index defs include `to_tsvector('simple'`. (The index def is over the GENERATED column; it transitively expresses the tsvector's config.)
   FAIL condition: either index uses `'english'` or another config.

3. **Row counts match the SQLite baseline (recorded in Task 11) within 1%.**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT platform, COUNT(*)::int FROM messages GROUP BY platform ORDER BY platform"
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT 'sessions',COUNT(*) FROM sessions UNION ALL SELECT 'message_labels',COUNT(*) FROM message_labels UNION ALL SELECT 'session_search',COUNT(*) FROM session_search UNION ALL SELECT 'discord_channels',COUNT(*) FROM discord_channels UNION ALL SELECT 'import_log',COUNT(*) FROM import_log"
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT category, COUNT(*)::int FROM message_labels GROUP BY category ORDER BY COUNT(*) DESC"
   ```
   PASS condition: discord ~717389, irc ~1943975; sessions ~128084; message_labels ~2661364; session_search ~123410; discord_channels = 4; import_log = 18; categories: chat ~1486716, system ~1005844, reaction ~122608, link ~26303, bot ~19893. Tolerance: 1% on counts, exact on `discord_channels` and `import_log`.
   FAIL condition: any count drifts beyond 1%.

4. **`message_labels` is 1:1 with `messages` (PRIMARY KEY invariant).**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT (SELECT COUNT(*) FROM messages) - (SELECT COUNT(*) FROM message_labels) AS delta"
   ```
   PASS condition: `delta = 0`.
   FAIL condition: any non-zero (suggests a duplicate id or a missing label - see Recovery).

5. **IRC mojibake baseline is recorded (D9 / F13 closure).**
   ```
   docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT COUNT(*)::int AS non_ascii FROM messages WHERE platform='irc' AND content ~ '[^\x20-\x7E]'"
   ```
   PASS condition: returns the number; operator updates `apps/qw-oracle/CLAUDE.md`'s Layer 2 status section's `N` placeholder with this value, then commits. SQLite baseline at draft time, using the same `[^\x20-\x7E]` shape as this query, is 547,684. The Postgres re-import may produce a slightly different number (postgres-js text round-tripping, JSON.parse normalisation); within a few percent of 547,684 is correct.
   FAIL condition: query errors (regex syntax), or count drifts from 547,684 by more than 5% (suggests the parser silently dropped or transformed content), or returns 0 (suggests the encoding issue silently disappeared, which would be surprising; investigate before proceeding).

6. **No residual `better-sqlite3` imports under `scripts/load-chat/` (or `scripts/`).**
   ```
   grep -rln "better-sqlite3\|bun:sqlite" apps/qw-oracle/scripts/
   ```
   PASS condition: zero hits.
   FAIL condition: any hit. Port the named file before declaring phase done.

7. **No legacy `.mjs` files under `apps/qw-oracle/scripts/` top level.**
   ```
   ls apps/qw-oracle/scripts/*.mjs 2>/dev/null
   ```
   PASS condition: empty output (zero `.mjs` files at top level).
   FAIL condition: any match.

8. **Tests + typecheck.**
   ```
   cd apps/qw-oracle
   bun test scripts/load-chat/
   bunx tsc --noEmit
   ```
   PASS condition: tests green; typecheck exits 0.
   FAIL condition: any failure or non-zero exit.

9. **MCP module loads (corpusDb stub asserts on use, not on parse).**
   ```
   cd apps/qw-oracle
   bun -e "await import('./serve/mcp/src/db.ts').then(m => console.log(Object.keys(m)))"
   ```
   PASS condition: prints `[ 'knowledgeDb', 'corpusDb' ]`. Does NOT need the MCP to *function* - that is Phase 6.
   FAIL condition: any throw at module-load time.

10. **`build-search-index.ts` smoke query returns at least one row.**
    ```
    docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_dev -c "SELECT count(*)::int AS hits FROM session_search WHERE session_tsv @@ plainto_tsquery('simple', 'cl_bob')"
    ```
    PASS condition: `hits > 0` (the corpus has many `cl_bob` discussions; tsvector + GIN reproduces FTS5's "find me sessions about cl_bob" capability).
    FAIL condition: `hits = 0` - tsvector indexing may not be wired.

If all 10 PASS, Phase 4 may proceed.

## Outputs to next phase

- `qw_oracle_dev` and `qw_oracle_test` carry the full Layer 2 schema (7 tables; tsvector `'simple'`; FK CASCADEs in place).
- `qw_oracle_dev` is populated: ~2.66M messages, ~128k sessions, ~123k indexed sessions; `import_log` and `processing_log` carry per-file / per-version bookkeeping.
- `apps/qw-oracle/scripts/load-chat/` holds the new TS pipeline; `package.json` exposes it via `load-chat:*` scripts.
- `data/qw.db*` files are gone; legacy `.mjs` scripts are gone.
- `apps/qw-oracle/CLAUDE.md` documents the Layer 2 status, including the IRC encoding gap with a measured baseline.
- The MCP module at `serve/mcp/src/db.ts` parses but throws on first use of either `knowledgeDb` or `corpusDb`. Phase 6 rewires both at once.

Phase 4 inputs: this state, plus the Layer 3 concept-note source files at `apps/qw-oracle/concept-notes/*.md` (untouched in Phase 3).

## Open questions / deferred items

1. **Question:** The `kb_commands` (849 rows), `kb_cvars` (4815 rows), and `kb_facts_import_log` (8 rows) tables in the SQLite `qw.db` are pre-spec POC artifacts of an early Layer 1 attempt before the Layer 1 split into knowledge.db. No code in `serve/` or `scripts/` references them. Should they be ported?
   **Default chosen for now:** Not ported. They duplicate (worse, in some columns) what knowledge.db has; their presence in qw.db is historical accident; nothing reads them.
   **Who can resolve:** operator. If a forensic copy is wanted, dump them via `sqlite3 .dump kb_commands kb_cvars kb_facts_import_log > /tmp/kb-tables.sql` before deleting `qw.db` in Task 11.

2. **Question:** Should `stats.mjs` be ported to a Postgres-flavored `stats.ts`?
   **Default chosen for now:** Not ported. The 90-line script is operator-friendly SQL wrapped in `console.log`; reproducing the exact output as `bun run stats` is one phase's worth of avoidable churn. Operator can run the equivalent psql queries directly when needed (the queries are visible in `stats.mjs`'s history if anything).
   **Who can resolve:** operator. If this is daily-driver tooling, a 30-line `stats.ts` follow-up commit lands separately.

3. **Question:** `discord_channels` is hand-seeded with 4 rows; the Discord export JSON does not contain `guild_id` per message (verified). When future Discord channels join the corpus, what populates this table?
   **Default chosen for now:** Each new channel adds one row to `db/seeds/discord_channels.sql` and the operator re-runs `seed-discord-channels.ts`. The IDs are stable Discord snowflakes the operator already has on hand.
   **Who can resolve:** operator. If the channel list grows, a one-shot importer that reads `channel_id` + `guild_id` from a JSON manifest is a clean extension.

4. **Question:** `build-sessions.ts` runs each channel in a single transaction. The largest channel (`#ibh`, 633k rows) produces ~30k sessions and ~633k label inserts in one transaction. Postgres handles it but the WAL may get hot.
   **Default chosen for now:** Single transaction per channel, matching the SQLite-era shape (which used `db.transaction(...)` per channel). If the operator observes lock contention or memory pressure during the full load, the recovery section names a per-N-sessions chunking variant.
   **Who can resolve:** operator at runtime. If the symptom appears, the chunking variant is a 5-line edit.

5. **Question:** `session_search` is a real table, not a materialised view. The architecture spec named both options as open. The choice here is "real table populated by a script" because it mirrors the SQLite FTS5 shape, is straightforward to TRUNCATE+rebuild, and is easy for the operator to inspect with psql. A `MATERIALIZED VIEW` with `REFRESH MATERIALIZED VIEW CONCURRENTLY` is the alternative; the `CONCURRENTLY` mode requires a UNIQUE index.
   **Default chosen for now:** Real table. Same operator-mental-model as SQLite; no surprise around when refresh fires.
   **Who can resolve:** Phase 6 may switch the shape if `search_solved_issues` benefits from concurrent-refresh semantics. Schema-level change; small migration.

6. **Question:** `import_log.id` and `processing_log.id` use `INTEGER GENERATED BY DEFAULT AS IDENTITY` (per the migration in Task 1). Phase 2's generator dialect rule promotes `INTEGER PRIMARY KEY` to `BIGINT GENERATED BY DEFAULT AS IDENTITY`. These two tables follow the operator-provided shape rather than Phase 2's rule (the SQLite originals used `INTEGER PRIMARY KEY AUTOINCREMENT` which is a rowid alias). Whether to consistently use BIGINT vs INTEGER for new (non-Phase-2-generated) tables is a small question.
   **Default chosen for now:** INTEGER for these two bookkeeping tables (their max row count is in the hundreds; INTEGER's 2^31 ceiling is safe). Phase 2's BIGINT rule is for tables that may grow into millions over a long deployment; bookkeeping tables don't.
   **Who can resolve:** operator if a future audit calls for uniform BIGINT.

## Sub-agent findings: rejected with rationale

The verification sub-agent flagged three CRITICAL items (C1, C2, C3) and one ADVISORY item (A3) that this phase rejects:

- **C1 / C2 / C3 (Phase 1+2 outputs missing):** The sub-agent flagged that `apps/qw-oracle/shared/db.ts`, `apps/qw-oracle/db/migrate.ts`, `apps/qw-oracle/db/migrations/`, and `data/knowledge.db` deletion are not yet on disk. **Rejected** because the verification template's rule 4 explicitly says paper plans should not flag Created files' non-existence: those four references are Phase 1 and Phase 2 outputs, and this phase's "Inputs from previous phase" section is the contract that names them. Phase 3 is unexecutable until Phase 1 and Phase 2 land; that is the intended workflow, not a defect.

- **A3 (`load-knowledge` script runner):** The sub-agent observed that the live `package.json` still uses `tsx scripts/load-knowledge/index.ts` while this phase's Task 7 final block uses `bun scripts/load-knowledge/index.ts`. **Rejected as a Phase 3 issue**: per Phase 2's Task 13 (lines 406-431 of `phase-2-layer1-port.md`), Phase 2 is responsible for converting `load-knowledge` from `tsx` to `bun`. Phase 3 inherits that state. If Phase 2 ships before Phase 3, the runner is already `bun`; if not, Phase 3 cannot proceed (D14 ordering). No Phase 3 change required.

## Recovery (if verification fails)

- **If verification 1 (table count) fails:** Re-run the migrator. If the migration is missing from `schema_migrations`, the file may not have landed in `db/migrations/`. Verify with `ls apps/qw-oracle/db/migrations/`.

- **If verification 2 (tsvector config) fails:** The migration was written with `'english'` instead of `'simple'`. Drop `messages.content_tsv` + `session_search.session_tsv` columns, re-write the GENERATED column DDL with `to_tsvector('simple', ...)`, and replay.

- **If verification 3 (row counts) fails on Discord:** Check `import_log` for the affected file; if a row exists, the importer skipped it as already-imported (delete the `import_log` row and re-run). If no row exists, `bun scripts/load-chat/import-discord.ts --file <path>` for the affected file with `set -x` to see the parse error; most common cause is a malformed JSON entry.

- **If verification 3 fails on IRC:** Same approach; the IRC parser is fragile around session-date lines. Add a `console.log(line)` near the `Session Start:` regex to find the offending file. If the parser silently drops a Session Start, all subsequent timestamps look wrong; counts may then look fine but date_range_start is null.

- **If verification 4 (1:1 labels) fails:** A duplicate message id exists. `SELECT id, COUNT(*) FROM messages GROUP BY id HAVING COUNT(*) > 1` will show it. Discord snowflakes are unique by construction; the typical cause is the IRC synthetic-id counter colliding across re-imports. Recovery: `TRUNCATE` and re-import the affected channel cleanly.

- **If verification 5 (mojibake count) returns 0:** The regex match silently fails (the regex is intended to find any non-printable byte). Re-test with `LENGTH(content) <> octet_length(content)` as an alternate detector (multi-byte UTF-8 sequences make octet_length > length). If both report zero, the encoding gap may genuinely be smaller than the SQLite-era 96k baseline (unlikely). Surface to operator before declaring victory.

- **If verification 6 (better-sqlite3 imports) fails:** Port the named file. Mechanical.

- **If verification 7 (legacy .mjs) fails:** The script wasn't deleted. `rm` it; the deletion in Task 11 was meant to be final.

- **If verification 8 (tests/typecheck) fails:** Most likely: a missing `await` on a now-async function, or a missing `as unknown as <type>` cast on a postgres-js JSONB column. Both are mechanical.

- **If verification 9 (MCP module load) fails:** The Proxy stub didn't catch a property access at parse time (this should be impossible because Proxy is opaque). More likely: the test command quoting got mangled; re-run by hand.

- **If verification 10 (smoke query) returns 0 hits:** GIN index is missing or `session_tsv` has no values. `SELECT COUNT(*) FROM session_search WHERE session_tsv != ''::tsvector` should be > 0. If zero, the GENERATED column expression is wrong. Re-write the migration's `tsvector GENERATED ALWAYS AS (...)`.

- **If `build-sessions` runs out of memory or holds locks too long on the largest channel (`#ibh` or `#ezQuake`):** Switch the per-channel transaction to a per-N-sessions transaction. The 5-line edit: open `db.begin` once per N flushed sessions instead of once per channel. N=1000 is a reasonable starting point.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

Brief filled in below; dispatched immediately after this draft lands.

---
