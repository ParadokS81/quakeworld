# Newsletter Module — Overview

## The Problem

The QW community is spread across multiple Discord servers with dozens of channels each.
It's impossible to follow everything — roster moves, drama, tournament announcements,
server issues, practice scheduling, community discussions. Important things get buried.

## The Solution

A bot module that:
1. Ingests all messages from QW community Discord servers (real-time + full historical backfill)
2. Stores them in a local database
3. Processes them through an LLM to extract topics, narratives, and highlights
4. Generates daily/weekly newsletter digests posted back to Discord

## High-Level Architecture

```
Discord Servers (public QW community)
    │
    ├── Real-time: messageCreate event → SQLite
    ├── Backfill: channel.messages.fetch() pagination → SQLite
    │
    ▼
SQLite Database (Layer 1: raw archive — immutable)
    │
    ▼
Noise Filter + Thread Reconstruction (Layer 2: clean conversations)
    │   - Deterministic rules (discovered by AI from sample data)
    │   - Conversation grouping (replies + temporal clustering)
    │
    ▼
LLM Processing (Layer 3: summaries — hierarchical, regenerable)
    │   - Stage 1: Per-channel summaries (local LLM — free, slower)
    │   - Stage 2: Cross-channel synthesis (API or local — quality matters here)
    │
    ▼
Newsletter Output
    ├── Daily digest → Discord embed in #digest channel
    ├── Weekly rollup → longer format, posted or linked
    └── Topic tracking → ongoing narratives across days/weeks
```

## What Makes This Feasible

- Discord bots can read full channel history — no limit on how far back
- Data volume is modest: even millions of messages = 1-2 GB in SQLite
- A 4090 can run capable local LLMs for free (bulk processing)
- API costs for quality synthesis are <$5/month ongoing
- Fits cleanly as a Quad module alongside recording

## Constraints

- Public community servers only (no privacy concerns)
- Self-hosted: data never leaves our infrastructure (unless we choose API calls)
- Must be reprocessable: when better models arrive, regenerate everything
- Newsletter quality matters more than speed — let local models take their time

## Relationship to Quad

This becomes `src/modules/newsletter/` in the Quad bot, following the same BotModule
interface as the recording module. Shares the Discord client, otherwise independent.

The bot is already in the servers for voice recording — adding message reading is
just enabling the MessageContent intent and adding a messageCreate handler.
