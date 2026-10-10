# QW Stats -- QuakeWorld 4on4 Ranking Engine

A data-driven ranking system for QuakeWorld 4on4 players and teams, built on every 4on4 game in the [QWHub](https://hub.quakeworld.nu) ktxstats archive since January 2022 (18,206 at the Feb 2026 archive import, synced from QWHub every 15 minutes since).

## What's Here

- **Every 4on4 game since Jan 2022** in PostgreSQL with full player stats (damage, accuracy, items, kills, deaths, etc.): 18,206 from the archive import plus everything the API's updater has pulled since
- **Analysis scripts** for data exploration, name deduplication, clan rosters, team comparisons
- **Research docs** on ranking methodology (Stats Composite, RAPM, OpenSkill) and identity resolution
- **Express API** for serving H2H, form, opponents, map stats, and roster data, self-updating from QWHub
- **Identity resolution tools** -- the hard problem: 2,355 unique names represent ~800-1,000 real people

## Getting Started with Claude Code

This repo is designed to be explored and extended with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). `CLAUDE.md` carries the working rules and the index to every other doc (schema, API, methodology, research).

### Quick Start

```bash
# Inside the quakeworld monorepo checkout
cd apps/qw-stats

# Install dependencies
npm install pg dotenv

# Start a local PostgreSQL (Docker is easiest)
docker run -d --name qw-postgres \
  -e POSTGRES_DB=quake_stats \
  -e POSTGRES_USER=phoenix \
  -e POSTGRES_PASSWORD=localdev \
  -p 5432:5432 \
  postgres:16

# Configure your connection
cp .env.example .env
# Edit .env if you changed the Docker defaults above

# Download the raw data from GitHub Releases
# Extract 4on4_json.zip into data/4on4_full/json/

# Import everything (~2 minutes)
node scripts/import-postgres.js data/4on4_full/json

# Create SQL views for H2H queries
node scripts/create-views.js

# Verify it works
node scripts/test-pg.js
```

### Run the API and pull new games

```bash
# The API server reads PG_* from its environment and does NOT load dotenv -- source .env first
set -a && source .env && set +a
cd api && npm install && node server.js      # http://localhost:3100/health

# Pull every 4on4 game QWHub has indexed since your newest row (the server does this every 15 min on its own)
node scripts/update-games.js
```

### What to Explore

Once the data is imported, try these:

```bash
# See top 30 clans by activity
node scripts/clan-rosters.js

# Deep-dive a specific clan roster (great for spotting aliases)
node scripts/clan-rosters.js --clan oeks
node scripts/clan-rosters.js --clan book

# Find all teams a player has played for
node scripts/clan-rosters.js --player shaka

# Check if two names could be the same person (co-occurrence)
node scripts/clan-rosters.js --co-check "shaka,shazam"

# Data quality overview
node scripts/explore-data.js

# Name deduplication analysis (core name extraction + fuzzy matching)
node scripts/explore-names.js

# Team comparison
node scripts/compare-teams.js book oeks
```

### For Claude Code Users

Just open the repo and start talking to Claude. `CLAUDE.md` indexes everything it needs:

- Full database schema with all columns (`DATABASE-SCHEMA.md`)
- The public API contract (`API-GUIDE.md`)
- Ranking methodology and weight research (`RESEARCH-RANKING.md`)
- Domain knowledge (what makes a good QW player, map differences, etc.) (`ROADMAP.md`)
- Identity resolution research and tools (`RESEARCH-IDENTITY.md`, `IDENTITY-SEEDS.md`)

Good first prompts:
- *"Run the clan roster viewer for oeks and tell me what you see"*
- *"What's the win rate for book on dm3 vs dm2?"*
- *"Build a query that finds the top 10 players by efficiency in clan games with 50+ games"*
- *"Read ROADMAP.md and tell me what the next steps are for the ranking system"*

## Project Status

**Paused.** The data foundation and the API are shipped and live; the ranking product waits on identity resolution. Why: [VISION.md](VISION.md). The plan: [ROADMAP.md](ROADMAP.md). Open work: the monorepo's root `HANDOVER.md`.

## Key Documents

| File | What it covers |
|------|---------------|
| [VISION.md](VISION.md) | Why this project exists, the sniff-test problem, the identity-resolution blocker, non-goals |
| [OVERVIEW.md](OVERVIEW.md) | Current-state living map: what is loaded, what the API serves, research docs, code landmarks |
| [CLAUDE.md](CLAUDE.md) | Working rules and the documentation index |
| [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md) | Tables, columns, indexes, views, import filters |
| [API-GUIDE.md](API-GUIDE.md) | The public API: endpoints, parameters, response shapes |
| [ROADMAP.md](ROADMAP.md) | Project direction and phases |
| [ANALYSIS.md](ANALYSIS.md) | Statistical findings from initial data exploration |
| [RESEARCH-RANKING.md](RESEARCH-RANKING.md) | Ranking methodology research (Stats Composite, RAPM, OpenSkill) |
| [RESEARCH-IDENTITY.md](RESEARCH-IDENTITY.md) | Alias resolution research and pipeline design |
| [ALIAS-RESOLUTION-RESEARCH.md](ALIAS-RESOLUTION-RESEARCH.md) | Entity-resolution literature survey behind that pipeline |
| [IDENTITY-SEEDS.md](IDENTITY-SEEDS.md) | Confirmed player identity clusters |

## Data Source

The raw game data comes from the ktxstats archive maintained by [vikpe](https://github.com/vikpe) for [QWHub](https://hub.quakeworld.nu). Download it from the [Releases](https://github.com/ParadokS81/qw-stats/releases) page.

## License

This is a community project for the QuakeWorld scene. The data is from public game servers. Use it, build on it, share what you find.
