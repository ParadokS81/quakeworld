# QW Oracle — QuakeWorld Community Knowledge Base

## What This Is

A knowledge base and intelligence system built from 20 years of QuakeWorld community chat history. Ingests IRC logs (2005-2016) and Discord messages (2016-present) to build a searchable, summarizable archive of community knowledge.

Part of a larger vision: combining chat logs, match data (100k+ matches from QW Hub), tournament history, forum archives, and community articles into a holistic QW knowledge system.

## Current State

- **Data imported**: 2.66 million messages in SQLite (`data/qw.db`)
  - IRC (QuakeNet): 1.94M messages, 14 channels, 2005-2016
  - Discord (Quake.World): 717k messages, 4 channels, 2016-2026
- **Next step**: Build the processing pipeline (cleaning → summarization → newsletter)
- **No processing code yet** — only import scripts and stats

## Data Sources

### Imported

| Source | Platform | Messages | Date Range | Channels |
|--------|----------|----------|------------|----------|
| QuakeNet IRC (mIRC logs) | IRC | 1,943,975 | 2005-11 → 2016-06 | 14 channels |
| Quake.World Discord | Discord | 717,389 | 2016-04 → 2026-02 | 4 channels |

### Future Sources (Not Yet Imported)
- More Discord channels (archived tournament channels, off-topic, etc.)
- QW Hub match data (100k+ matches) — API access already working in `../quad/`
- Forum databases from community sites
- News articles and match reports from historical QW sites
- Source code documentation (ezQuake, MVDSV, KTX)

## Tech Stack

- **Node.js 20+** with ES modules
- **better-sqlite3** — database (data/qw.db, ~1.1 GB)
- **Ollama** — local LLM inference (planned, not yet set up)
- No TypeScript yet — plain .mjs scripts for now. Move to TS when the pipeline solidifies.

## Project Structure

```
qw-oracle/
├── CLAUDE.md              # This file
├── package.json
├── .gitignore
├── scripts/
│   ├── db.mjs             # Shared DB setup and schema
│   ├── import-discord.mjs  # Import Discord JSON exports → SQLite
│   ├── import-irc.mjs      # Import mIRC log files → SQLite
│   └── stats.mjs           # Database stats and analytics
├── data/
│   └── qw.db              # SQLite database (gitignored)
├── docs/
│   └── (see also: ../quad/docs/newsletter-research/ for detailed research)
│       ├── overview.md         # High-level architecture vision
│       ├── backfill.md         # Discord backfill strategies
│       ├── local-llm.md        # 4090 model benchmarks, Ollama setup
│       └── pipeline.md         # Three-layer processing architecture
├── output/
│   ├── daily/             # Future: daily digest markdown
│   └── weekly/            # Future: weekly rollup markdown
└── node_modules/
```

### Related Projects
```
/home/paradoks/projects/quake/
├── quad/                  # Discord bot — recording + live message ingestion
│   ├── exports/           # Raw Discord JSON exports + mIRC log archive
│   │   ├── quakeworld.json      # 387k messages
│   │   ├── dev-corner.json      # 207k messages
│   │   ├── helpdesk.json        # 103k messages
│   │   ├── antilag.json         # 19k messages
│   │   └── mirc-logs/           # 14 IRC log files
│   └── scripts/
│       ├── backfill.mjs         # Fetches Discord history (resumable)
│       └── list-channels.mjs    # Lists server channels
├── voice-analysis/        # Voice recording analysis pipeline (Python)
└── qw-oracle/             # THIS PROJECT
```

## Database Schema

### messages table
The unified table for all chat messages across platforms:

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Discord snowflake or generated IRC ID |
| platform | TEXT | 'discord' or 'irc' |
| network | TEXT | 'quakenet' for IRC, NULL for Discord |
| guild_id | TEXT | Discord guild ID |
| channel_name | TEXT | Channel name with # prefix |
| author_id | TEXT | Discord user ID (NULL for IRC) |
| author_name | TEXT | Username/nickname |
| author_display_name | TEXT | Display name |
| author_is_bot | INTEGER | Bot flag |
| content | TEXT | Message text |
| message_type | TEXT | 'message', 'action', 'join', 'part', 'quit', 'nick', 'topic', 'system' |
| referenced_message_id | TEXT | Reply-to (Discord only) |
| attachment_count | INTEGER | Number of attachments |
| attachments_json | TEXT | JSON array |
| embed_count | INTEGER | Number of embeds |
| embeds_json | TEXT | JSON array |
| reaction_count | INTEGER | Number of reactions |
| reactions_json | TEXT | JSON array |
| created_at | TEXT | ISO 8601 UTC |
| edited_at | TEXT | Edit timestamp |
| source | TEXT | 'discord-export', 'mirc-log', 'bot-live' |
| source_file | TEXT | Original filename |
| imported_at | TEXT | When imported |

### import_log table
Tracks what files have been imported (for idempotent re-runs).

## Key Stats (as of 2026-02-11)

- **Total messages**: 2,661,364
- **Chat messages** (excluding joins/quits/system): ~1,655,520
- **Date range**: November 2005 → February 2026 (20 years)
- **Top channels**: #ibh (393k), #quakeworld-discord (388k), #dev-corner (207k), #ezQuake (195k)
- **Peak years**: 2006 (442k), 2007 (374k) on IRC; 2017 (104k) on Discord
- **Database size**: ~1.1 GB

## Pipeline Plan (Not Yet Built)

### Tier 1: Cleaning & Session Grouping
- Filter noise: joins/quits/nicks/system messages already typed in DB
- Deterministic rules for chat noise (single-word reactions, bot spam)
- Group messages into conversation sessions (time-gap based)
- **Key insight**: Feed a sample to a good LLM first to discover filter rules, then apply deterministically

### Tier 2: Summarization (Local LLM)
- Per-session summaries via Ollama (Llama 3.1 8B for bulk, 70B for quality)
- Structured output: topics, entities, sentiment, notable quotes
- Store summaries in DB linked back to source messages

### Tier 3: Synthesis
- Daily/weekly newsletter generation
- Topic tracking across time
- Cross-channel synthesis

### Hardware for Local LLM
- RTX 4090 (24 GB VRAM) — Llama 3.1 8B at ~60 tok/s, 70B at ~12 tok/s
- Multiple machines available for parallel processing
- Ollama for inference (not yet installed)

## Commands

```bash
# Import Discord exports (from quad/exports/)
node scripts/import-discord.mjs ../quad/exports

# Import IRC logs
node scripts/import-irc.mjs ../quad/exports/mirc-logs

# Show database stats
node scripts/stats.mjs
```

## Identity Problem

The same person has different names across IRC and Discord:
- IRC: `Sassa`, `sassa`, `Sassa|away` (nick changes logged)
- Discord: `sassaking` (new username system)
- In-game: `sassa` (QW nickname)

Building an identity map is a future goal — other QW community projects are working on this.
Cross-reference points: QW Hub player profiles, EQL/NQR tournament rosters, Discord↔IRC overlap period (2016).

## Development Notes

### Fetching More Discord Data
The backfill script in `../quad/scripts/backfill.mjs` is resumable.
To add more channels, edit the CHANNELS array and re-run.
The bot (token in `../quad/.env`) is already in the Quake.World Discord server.

### Adding New Data Sources
1. Write an import script in `scripts/`
2. Use the shared `db.mjs` for schema and connection
3. Set `platform` and `source` fields appropriately
4. The `import_log` table prevents duplicate imports

## Non-Negotiable Rules

1. Raw data is immutable — never modify imported messages
2. All processing is regenerable from the raw layer
3. Tag every generated output with model + prompt version
4. Keep it simple — scripts over frameworks, SQLite over Postgres
5. Local-first processing — minimize API costs, maximize iteration speed
6. Source citation — every summary must trace back to original messages
