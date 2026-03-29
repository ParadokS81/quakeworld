# QW Stats — QuakeWorld 4on4 Ranking Engine

A data-driven ranking system for QuakeWorld 4on4 players and teams, built on 18,206 games (2022-2026) from the [QWHub](https://hub.quakeworld.nu) ktxstats archive.

## What's Here

- **18,206 competitive 4on4 games** imported into PostgreSQL with full player stats (damage, accuracy, items, kills, deaths, etc.)
- **Analysis scripts** for data exploration, name deduplication, clan rosters, team comparisons
- **Research docs** on ranking methodology (Stats Composite, RAPM, OpenSkill) and identity resolution
- **Express API** for serving H2H, form, map stats, and roster data
- **Identity resolution tools** — the hard problem: 2,355 unique names represent ~800-1,000 real people

## Getting Started with Claude Code

This repo is designed to be explored and extended with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). The `CLAUDE.md` file gives Claude full context about the database schema, scripts, methodology, and domain knowledge.

### Quick Start

```bash
# Clone the repo
git clone https://github.com/ParadokS81/qw-stats.git
cd qw-stats

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

Just open the repo and start talking to Claude. The `CLAUDE.md` gives it everything it needs:

- Full database schema with all columns
- Query patterns and examples
- Ranking methodology and weight research
- Domain knowledge (what makes a good QW player, map differences, etc.)
- Identity resolution research and tools

Good first prompts:
- *"Run the clan roster viewer for oeks and tell me what you see"*
- *"What's the win rate for book on dm3 vs dm2?"*
- *"Build a query that finds the top 10 players by efficiency in clan games with 50+ games"*
- *"Read ROADMAP.md and tell me what the next steps are for the ranking system"*

## Project Status

See [ROADMAP.md](ROADMAP.md) for the full project direction. Currently in **Phase 0: Identity Resolution** — merging the 2,355 unique player names into ~800-1,000 real identities before building rankings.

## Key Documents

| File | What it covers |
|------|---------------|
| [CLAUDE.md](CLAUDE.md) | Technical reference — schema, scripts, API, methodology |
| [ROADMAP.md](ROADMAP.md) | Project direction, phases, current status |
| [ANALYSIS.md](ANALYSIS.md) | Statistical findings from initial data exploration |
| [RESEARCH-RANKING.md](RESEARCH-RANKING.md) | Ranking methodology research (Stats Composite, RAPM, OpenSkill) |
| [RESEARCH-IDENTITY.md](RESEARCH-IDENTITY.md) | Alias resolution research and pipeline design |
| [IDENTITY-SEEDS.md](IDENTITY-SEEDS.md) | Confirmed player identity clusters |

## Data Source

The raw game data comes from the ktxstats archive maintained by [vikpe](https://github.com/vikpe) for [QWHub](https://hub.quakeworld.nu). Download it from the [Releases](https://github.com/ParadokS81/qw-stats/releases) page.

## License

This is a community project for the QuakeWorld scene. The data is from public game servers. Use it, build on it, share what you find.
