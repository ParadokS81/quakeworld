# QW Oracle — Project Plan

## Vision

Transform 20 years of QuakeWorld community chat history (2.66M messages) into an intelligence system that serves the community. Three products, one data foundation.

## The Three Paths

### Path 1: Oracle Bot (ACTIVE — started 2026-02-11)
**What:** AI-powered help bot that answers QW questions using community knowledge + docs.
**Why chosen first:** Most immediate value, tightest feedback loop, people would use it daily.
**Status:** Search layer working, needs context builder + LLM layer.

**How it works:**
```
User asks question
    → FTS5 searches 123k sessions for relevant past conversations
    → Combines: matched sessions + ezQuake docs + QW glossary
    → LLM generates answer with source citations
    → "ciscon explained this on 2020-10-19: ..."
```

**Data sources (available now):**
- 11,000 question-sessions across #helpdesk, #ezQuake, #ktx, #fte, #mvdsv
- ezQuake documentation (commands, settings, HUD, etc.)
- KTX documentation

**Data sources (future):**
- More Discord channels (tournament servers, off-topic, etc.)
- Source code documentation (ezQuake, MVDSV, KTX, FTE)
- QW glossary / terminology list

**Benchmark results (from 10-session sample):**
- ~30-35% of questions: Directly answerable from docs (config lookups, commands)
- ~25-30%: Answerable from community tribal knowledge (past debugging sessions)
- ~35-40%: Interactive debugging (AI can triage, humans needed for full resolution)

**Self-learning capability (planned):**
- Level 1: Always cite sources — users trust "ciscon said X" over "AI said X"
- Level 2: Store corrections — trusted members can override bad answers
- Level 3: Weighted trust — Spoike/ciscon answers weighted higher, corrections tracked

### Path 2: Digest / Newsletter (future)
**What:** "What happened while I was away?" — AI-generated summaries of Discord activity.
**Why:** Solves the Discord overwhelm problem. 8+ servers, too many channels, nobody reads them all.
**Depends on:** Tier 2 LLM summarization pipeline (sessions → structured summaries).

**Would produce:**
- Daily/weekly digests per server or across servers
- Topic tracking ("what's the community talking about this week")
- Highlights ("most discussed topics", "active debates")

### Path 3: Time Machine / Nostalgia (future)
**What:** Explore 20 years of community history. Drama, milestones, eras, forgotten gems.
**Why:** "Memory lane" — give the community a way to rediscover its own history.
**Depends on:** Tier 2 summaries + some kind of browsable interface.

**Would enable:**
- "What was the community arguing about in March 2008?"
- "Show me the #qwdrama highlights from 2007"
- "Timeline of the ezQuake vs FTE debate"
- QHLAN event recaps from IRC logs

## Data Pipeline Architecture

### Layer 1: Raw Archive (DONE)
- 2,661,364 messages in SQLite (`data/qw.db`)
- IRC (QuakeNet, 2005-2016): 1.94M messages, 14 channels
- Discord (Quake.World, 2016-2026): 717k messages, 4 channels
- Immutable — never modified after import
- Scripts: `import-discord.mjs`, `import-irc.mjs`

### Layer 2: Classification + Sessions (DONE)
- Every message classified: chat (55.9%), system (37.8%), reaction (4.6%), link (1.0%), bot (0.7%)
- 128,084 conversation sessions grouped by 15-minute silence gaps
- 123,410 sessions with actual chat content
- Version-tagged, fully regenerable from Layer 1
- Script: `process-tier1.mjs` (runs in 22 seconds)

### Layer 3: Search Index (DONE)
- FTS5 full-text search over all session content
- Porter stemming + unicode support
- Tested with real QW questions — retrieval quality is solid
- Script: `build-search-index.mjs` (runs in 10 seconds)

### Layer 4: LLM Summarization (NOT STARTED)
- Per-session structured summaries via local LLM (Ollama + Llama 3.1 8B on 4090)
- Output: topics, entities, sentiment, notable quotes, category
- Needed for: Digest (Path 2) and Time Machine (Path 3)
- NOT needed for Oracle Bot MVP — bot can work with raw sessions + search

### Layer 5: Context Builder + Answer Generation (NEXT)
- Takes user question + search results + docs → LLM prompt → answer
- Needed for: Oracle Bot (Path 1)
- Can use Claude API for quality or Ollama for cost
- This is the next thing to build

## Hardware & Infrastructure

| Machine | Specs | Role |
|---------|-------|------|
| Local (paradoks) | Ryzen 3900X, RX 5700XT, WSL2 | Development, testing |
| Remote (Xerial) | RTX 4090 (24GB VRAM) | LLM inference via Ollama |

**Ollama setup on remote (when needed):**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b    # bulk processing
ollama pull llama3.1:70b   # quality tasks (fits 4090 with Q4 quantization)
```

**Access from local:**
```bash
ssh -L 11434:localhost:11434 xerial-server
# Then scripts call http://localhost:11434 as if local
```

## Key Decisions Made

1. **SQLite over Postgres** — simple, single-file, fast enough for our scale
2. **FTS5 over vector DB** — QW terminology is specific, text search works great
3. **Node.js + .mjs** — consistent with existing codebase, no framework overhead
4. **Session-level grouping** — not per-message, not per-day. Sessions are the natural unit
5. **Classify, don't delete** — raw data immutable, processing layers tag and group
6. **Local-first LLM** — use 4090 for bulk, cloud API for prompt development and quality
7. **Oracle Bot first** — most value, doesn't need Tier 2 summaries to work

## Community Knowledge Experts

These people's answers carry the most weight in the knowledge base:
- **Spoike** — Author of FTE client, encyclopedic QW engine knowledge
- **ciscon** — Extremely active in #helpdesk, deep Linux/hardware/networking expertise
- **nano (soverynano)** — Deep engine internals, currently porting QW to Rust
- **meag (meag.qw)** — ezQuake core developer
- **tenacious_papaya (eb)** — MVDSV maintainer, ezQuake contributor
- **rauvz** — Hardware/performance specialist, Linux focus

## Project Structure

```
qw-oracle/
├── CLAUDE.md                    # Project rules and context for Claude
├── package.json                 # Node.js project (better-sqlite3)
├── scripts/
│   ├── db.mjs                   # Schema: raw tables + processing + search
│   ├── import-discord.mjs       # Import Discord JSON → SQLite
│   ├── import-irc.mjs           # Import mIRC logs → SQLite
│   ├── stats.mjs                # Raw database stats
│   ├── process-tier1.mjs        # Tier 1: classify + session grouping
│   ├── build-search-index.mjs   # Build FTS5 search index
│   ├── search.mjs               # Search CLI tool
│   ├── stats-tier1.mjs          # Tier 1 validation stats
│   └── sample-*.mjs             # Data exploration scripts
├── data/
│   └── qw.db                    # SQLite database (1.1 GB, gitignored)
├── output/                      # Generated files (samples, etc.)
├── docs/
│   └── plan.md                  # This file
└── memory/
    └── MEMORY.md                # Claude Code persistent memory
```

## Next Steps

1. **Build context builder** — format search results + docs into LLM prompt
2. **Test answer generation** — use Claude API on sample questions, iterate on prompt
3. **Set up Ollama on Xerial's server** — for cost-effective bulk/live inference
4. **Discord bot integration** — hook into Quad bot as new module, or standalone
5. **Feedback loop** — corrections table, trusted member weighting
