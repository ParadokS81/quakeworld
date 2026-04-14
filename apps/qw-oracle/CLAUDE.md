# QW Oracle — QuakeWorld Knowledge Service

## Status

Active development. POC phase as of 2026-04-14. See spec: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md` and plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md`.

## What This Is

A polyglot knowledge service for QuakeWorld. One foundation with three layers, served over MCP so any LLM client can consume it.

- **Layer 1 — Extracted facts.** Deterministic ground truth from source code and structured files. Cvars, commands, macros, match records. SQLite. `layers/facts/`
- **Layer 2 — Interpreted claims.** What the community said, distilled from 2.66M chat messages (IRC + Discord). SQLite + FTS5. `layers/claims/`
- **Layer 3 — Curated concepts.** Hand-written markdown notes that cross-link Layers 1 and 2. Human expertise, LLM-multiplied. `layers/concepts/`
- **Serve layer.** MCP server exposing tools over all three layers. `serve/mcp/`

## Three-layer model

| Layer | Nature | Source | Pipeline | Storage |
|---|---|---|---|---|
| 1. Facts | Rigid | Source code, APIs | Parser -> normalize -> SQL | SQLite |
| 2. Claims | Soft | Chat logs, forums | Denoise -> session group -> FTS5 index | SQLite + FTS5 |
| 3. Concepts | Curated | Human + LLM | Hand-written | Markdown |

**Layer 2 interpretation happens at query time.** The POC ships Layer 2 as a denoised, session-grouped, full-text-indexed corpus. When a query arrives, the MCP returns the top-matching session transcripts (raw chat text, filtered to category='chat') and the outlet LLM synthesises the answer. Build-time LLM summarisation is a phase-2 cost optimisation for when query volume justifies it (Ollama on the 4090 is the natural home). This means the POC has zero build-time LLM dependency.

## Canonical IDs

Every entity has a stable ID of the form `<project>:<type>:<name>[@<version>]`:

- `ezquake:cvar:cl_bob`
- `ezquake:cmd:say_team`
- `ktx:cmd:k_matchlock`
- `fte:cvar:cl_rollspeed`
- `session:2020-10-19-helpdesk-ciscon-001`
- `concept:ktx_matchstart_injection`

Layer 2 and Layer 3 reference Layer 1 IDs in their metadata so cross-layer joins work at query time.

## Project Structure

    qw-oracle/
    |-- CLAUDE.md                  # This file
    |-- VISION.md                  # Long-form vision
    |-- data/
    |   |-- qw.db                  # SQLite: messages (raw) + Layer 1 tables + Layer 2 tables (~1.1 GB)
    |-- layers/
    |   |-- facts/                 # Layer 1: extractors, schema, imports
    |   |-- claims/                # Layer 2: chat slice selection, summarization, prompts
    |   |-- concepts/              # Layer 3: hand-written markdown concept notes
    |-- serve/
    |   |-- mcp/                   # MCP server (TypeScript) exposing tools over all 3 layers
    |-- scripts/                   # Legacy imports + new verification scripts
    |   |-- db.mjs                 # Shared DB connection (legacy, Layer 2)
    |   |-- import-discord.mjs     # Discord JSON -> messages
    |   |-- import-irc.mjs         # mIRC logs -> messages
    |   |-- stats.mjs              # DB stats
    |   |-- verify-layer1.mjs      # Post-import Layer 1 sanity check
    |   |-- verify-layer2.mjs      # Post-summarize Layer 2 sanity check
    |   |-- verify-concepts.mjs    # Lint concept-note frontmatter
    |-- docs/                      # Research docs + demo script

## Commands

    # Existing (Layer 2 raw import)
    node scripts/import-discord.mjs ../quad/exports
    node scripts/import-irc.mjs ../quad/exports/mirc-logs
    node scripts/stats.mjs

    # Layer 1: import pre-extracted cvar/command data
    node layers/facts/import-from-qw-config.mjs

    # Layer 2: no build step in the POC. The existing sessions +
    # message_labels + session_search tables are the corpus.
    # Phase 2 adds a summariser here (Ollama on the 4090).

    # Verification
    node scripts/verify-layer1.mjs
    node scripts/verify-layer2.mjs
    node scripts/verify-concepts.mjs

    # MCP server (see serve/mcp/README.md)
    cd serve/mcp && bun install && bun run dev

## Non-Negotiable Rules

1. Raw data is immutable - never modify imported messages or imported facts
2. All processing is regenerable from the raw layer
3. Tag every generated output with model + prompt version (Layer 2 summaries, MCP tool responses)
4. Keep it simple - scripts over frameworks, SQLite over Postgres
5. Local-first processing - minimize API costs, maximize iteration speed
6. Source citation - every MCP tool response carries canonical IDs pointing to origin

## Tech Stack

- Node.js 20+ with ES modules (Layer 1 importer, verification scripts)
- `better-sqlite3` - DB access for all layers
- TypeScript + `@modelcontextprotocol/sdk` (MCP server only)
- **No build-time LLM dependency.** Layer 2 is exposed raw to the query-time LLM. Phase 2 may add Ollama on the RTX 4090 for bulk summarisation; not used in the POC.

## What's NOT in the POC

FTE/MVDSV/QWCL full extractors beyond imported JSON, build-time LLM summarisation of the chat corpus, weighted trust model, identity unification, vector search, correction feedback, web/Discord outlet integration, pretty frontend. See the spec for the deferred roadmap.

Layer 1 data provenance note: The JSON in `packages/qw-config/src/data/` is the output of iterative scrapers, not a proper AST-based extractor. It is known to be incomplete. The POC imports it as-is because it is sufficient to prove the pattern. The extraction pipeline rewrite with real AST tooling is tracked as spec open question #2 and the `project_extraction_pipeline_vision` memory - phase-2 work.

Layer 2 summarisation note: The existing `sessions` + `session_search` + `message_labels` tables already give us denoised, session-grouped, full-text-indexed chat. A build-time LLM pass that compresses sessions into structured summaries is a phase-2 optimisation, not a POC requirement. The outlet LLM reads raw session transcripts at query time, which is more faithful and zero extra cost.

---

## Layer 2 - Chat Corpus (Existing)

The raw material for Layer 2 was imported into `data/qw.db` before this POC started. 20 years of QuakeWorld community chat history. IRC logs (2005-2016) and Discord messages (2016-present), searchable and session-grouped, waiting to be summarized.

### Data sources (imported)

| Source | Platform | Messages | Date Range | Channels |
|---|---|---|---|---|
| QuakeNet IRC (mIRC logs) | IRC | 1,943,975 | 2005-11 -> 2016-06 | 14 channels |
| Quake.World Discord | Discord | 717,389 | 2016-04 -> 2026-02 | 4 channels |

### Key stats (as of 2026-02-11)

- **Total messages**: 2,661,364
- **Chat messages** (excluding joins/quits/system): ~1,655,520
- **Date range**: November 2005 -> February 2026 (20 years)
- **Top channels**: #ibh (393k), #quakeworld-discord (388k), #dev-corner (207k), #ezQuake (195k)
- **Peak years**: 2006 (442k), 2007 (374k) on IRC; 2017 (104k) on Discord
- **Database size**: ~1.1 GB

### Existing raw schema

The unified `messages` table stores all chat messages across platforms. New Layer 1 and Layer 2 tables are added additively in later POC tasks (all prefixed `kb_` to keep them clearly separate from the raw corpus).

| Column | Type | Description |
|---|---|---|
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

The `import_log` table tracks what files have been imported for idempotent re-runs.

### Identity Problem

The same person has different names across IRC and Discord:

- IRC: `Sassa`, `sassa`, `Sassa|away` (nick changes logged)
- Discord: `sassaking` (new username system)
- In-game: `sassa` (QW nickname)

Building an identity map is a future goal - other QW community projects are working on this. Cross-reference points: QW Hub player profiles, EQL/NQR tournament rosters, Discord<->IRC overlap period (2016). Out of scope for the POC.

### Adding new chat sources

1. Write an import script in `scripts/`
2. Use the shared `db.mjs` for schema and connection
3. Set `platform` and `source` fields appropriately
4. The `import_log` table prevents duplicate imports

The backfill script in `../quad/scripts/backfill.mjs` is resumable. To add more channels, edit the CHANNELS array and re-run. The Quad bot (token in `../quad/.env`) is already in the Quake.World Discord server.
