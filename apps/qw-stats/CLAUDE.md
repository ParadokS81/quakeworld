# QW Stats — Player & Team Ranking Engine

## Purpose

Build a data-driven ranking system for QuakeWorld 4on4 players and teams using real match statistics from QWHub (hub.quakeworld.nu). The goal is to produce rankings that pass the "sniff test" of experienced players — if the algorithm doesn't put Milton near the top, it's broken.

## Quick Start (Build Your Local Database)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 16 (local install or Docker)

### 2. Set up PostgreSQL
```bash
# Docker (easiest):
docker run -d --name qw-postgres \
  -e POSTGRES_DB=quake_stats \
  -e POSTGRES_USER=phoenix \
  -e POSTGRES_PASSWORD=localdev \
  -p 5432:5432 \
  postgres:16

# Or install PostgreSQL natively and create the database:
createdb quake_stats
```

### 3. Configure connection
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 4. Install dependencies
```bash
npm install pg dotenv
# For legacy SQLite scripts (optional):
npm install better-sqlite3
```

### 5. Download the raw data
Download the `4on4_json.zip` archive from the GitHub Releases page and extract it:
```bash
mkdir -p data/4on4_full
unzip 4on4_json.zip -d data/4on4_full/json/
```

### 6. Import data
```bash
node scripts/import-postgres.js data/4on4_full/json
```
This imports ~18,000 4on4 games into your local PostgreSQL. Takes about 2 minutes.

### 7. Create views (optional but useful)
```bash
node scripts/create-views.js
```

### 8. Verify
```bash
node scripts/test-pg.js
```

---

## Current Dataset

| Metric | Value |
|--------|-------|
| Total 4on4 games | 18,206 |
| Clan games | 9,868 (54%) |
| Mix/pickup games | 8,338 (46%) |
| Unique players | 2,355 |
| Date range | Jan 2022 - Feb 2026 (4 years) |
| Source | Full ktxstats archive from vikpe (QWHub maintainer) |

**Maps:**
| Map | Total | Clan |
|-----|-------|------|
| dm2 | 4,811 | 2,376 |
| dm3 | 4,482 | 2,167 |
| schloss | 3,760 | 1,929 |
| e1m2 | 2,919 | 1,769 |
| phantombase | 931 | 673 |

### Data Sources

**ktxstats Archive (bulk import):**
- Source: `data/4on4_full/json/` — 18,468 `.mvd.ktxstats.json` files from vikpe
- Import script: `scripts/import-postgres.js`
- Filters to: 8 players, team mode, duration >= 600s

**QWHub Supabase API (for staying fresh):**
- Endpoint: `ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games`
- Poll `?mode=eq.4on4&order=timestamp.desc` for new games
- Derive ktxstats URL from `demo_sha256`: `https://d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json`

**Note:** QWHub does NOT do player identity resolution. The `login` field is mostly empty. Name normalization and alias mapping is our own work.

---

## Database Schema (PostgreSQL)

### Tables

**`games`** — One row per 4on4 match
```sql
id SERIAL PRIMARY KEY
demo_sha256 TEXT UNIQUE NOT NULL     -- ktxstats file identifier
played_at TIMESTAMPTZ                -- when the game was played
map TEXT NOT NULL                     -- dm2, dm3, e1m2, schloss, phantombase, etc.
hostname TEXT                         -- server name
matchtag TEXT                         -- tournament/practice tag
duration INTEGER NOT NULL             -- seconds (>= 600)
timelimit INTEGER                     -- in minutes (usually 20)
team_a TEXT NOT NULL                  -- raw QW-encoded team name
team_b TEXT NOT NULL                  -- raw QW-encoded team name
team_a_ascii TEXT NOT NULL            -- lowercase ASCII-decoded team name (for queries)
team_b_ascii TEXT NOT NULL            -- lowercase ASCII-decoded team name (for queries)
team_a_frags INTEGER NOT NULL DEFAULT 0
team_b_frags INTEGER NOT NULL DEFAULT 0
is_clan_game BOOLEAN NOT NULL DEFAULT false  -- true if neither team is blue/red/generic
```

**`game_players`** — One row per player per match (8 per game)
```sql
id SERIAL PRIMARY KEY
game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE
player_name_raw TEXT                  -- raw QW-encoded name from ktxstats
player_name_ascii TEXT                -- ASCII-decoded display name
player_name_normalized TEXT NOT NULL  -- lowercase, trimmed (for matching)
team TEXT NOT NULL                    -- raw QW-encoded team tag
team_ascii TEXT NOT NULL              -- lowercase ASCII-decoded team tag

-- Core stats
frags, kills, deaths, tk, suicides, spawn_frags INTEGER

-- Damage
dmg_given, dmg_taken, dmg_team, dmg_self, dmg_enemy_weapons INTEGER
taken_to_die REAL                     -- avg damage absorbed before dying

-- Weapons: sg, rl, lg (attacks, hits, acc%, enemy_dmg), gl, ssg
sg_attacks, sg_hits, sg_acc, sg_dmg INTEGER/REAL
rl_attacks, rl_hits, rl_acc, rl_dmg INTEGER/REAL
lg_attacks, lg_hits, lg_acc, lg_dmg INTEGER/REAL

-- Items (took count + time held in seconds)
ya_took, ya_time, ra_took, ra_time, ga_took, ga_time INTEGER
quad_took, quad_time, pent_took, pent_time, ring_took, ring_time INTEGER

-- Result
won BOOLEAN NOT NULL DEFAULT false
```

### Key Indexes
```sql
idx_games_teams ON games(team_a_ascii, team_b_ascii)
idx_games_clan ON games(is_clan_game)
idx_games_clan_map ON games(is_clan_game, map)
idx_games_played_at ON games(played_at)
idx_gp_game_id ON game_players(game_id)
idx_gp_player ON game_players(player_name_normalized)
idx_gp_team_ascii ON game_players(team_ascii)
```

### Querying Team Names
Always use `team_a_ascii` / `team_b_ascii` / `team_ascii` columns for queries — they're lowercase ASCII:
```sql
-- H2H: book vs oeks
WHERE (team_a_ascii='book' AND team_b_ascii='oeks')
   OR (team_a_ascii='oeks' AND team_b_ascii='book')

-- All games for a team
WHERE team_a_ascii='book' OR team_b_ascii='book'

-- Player's team participation
WHERE gp.team_ascii = 'book'
```

---

## Data Filtering Rules

- **4on4**: Already filtered at import (8 valid players, team mode, duration >= 600s)
- **Bogus player filter**: `ping !== 0` (applied at import)
- **Clan game detection**: Team names not in {blue, red, green, yellow, team1, team2, empty, etc.}
- **Competitive maps**: dm2, dm3, e1m2, schloss, phantombase (filter in queries as needed)

---

## File Structure

```
qw-stats/
├── CLAUDE.md              <- You are here
├── ANALYSIS.md            <- Findings, distributions, correlations (from 4-month sample)
├── ROADMAP.md             <- Project direction and phases
├── RESEARCH-RANKING.md    <- Ranking methodology research
├── RESEARCH-IDENTITY.md   <- Alias resolution research
├── IDENTITY-SEEDS.md      <- Confirmed player aliases
├── ALIAS-RESOLUTION-RESEARCH.md
├── .env.example           <- Template for database connection
├── scripts/
│   ├── db.js              <- Shared PostgreSQL connection (reads .env)
│   ├── import-postgres.js <- Parse ktxstats JSON -> bulk insert to PostgreSQL
│   ├── create-views.js    <- SQL views for H2H queries
│   ├── test-pg.js         <- PostgreSQL query examples (H2H, roster, etc.)
│   ├── explore-data.js    <- Dataset overview and distributions
│   ├── explore-names.js   <- Core name extraction + duplicate detection
│   ├── clan-rosters.js    <- Clan roster viewer for alias curation
│   ├── compare-teams.js   <- Team comparison queries
│   ├── import-stats.js    <- Legacy: archive -> SQLite import
│   ├── stats-4on4.js      <- SQLite: composite rating + Top 50
│   ├── stats-correlations.js <- SQLite: correlation matrix
│   ├── find-player.js     <- SQLite: search player by name
│   ├── player-stats.js    <- SQLite: detailed stats for one player
│   ├── check-dates.js     <- SQLite: date distribution
│   ├── stats-summary.js   <- SQLite: full dataset overview
│   └── probe-qwhub.js     <- Supabase API data volume check
├── api/
│   ├── server.js          <- Express API server (h2h, form, maps, roster endpoints)
│   ├── Dockerfile         <- Docker image for the API
│   └── package.json       <- API dependencies
└── data/                  <- NOT committed — download from GitHub Releases
    ├── 4on4_full/json/    <- 18,468 ktxstats JSONs
    └── 4on4_json.zip      <- Source archive (55MB)
```

## Running Scripts

All scripts use `scripts/db.js` for database connection. Configure via `.env`:

```bash
# PostgreSQL import (full dataset)
node scripts/import-postgres.js data/4on4_full/json

# Create H2H views
node scripts/create-views.js

# Test queries (H2H, roster, form)
node scripts/test-pg.js

# Explore data quality
node scripts/explore-data.js
node scripts/explore-names.js

# Clan roster viewer (great for alias discovery)
node scripts/clan-rosters.js                  # top 30 clans
node scripts/clan-rosters.js --clan oeks      # specific clan
node scripts/clan-rosters.js --player shaka   # find all teams for a player
node scripts/clan-rosters.js --co-check "shaka,shazam"  # check co-occurrence

# Team comparison
node scripts/compare-teams.js book oeks
```

**Dependencies**: `pg` and `dotenv` (install with `npm install pg dotenv`)

---

## API Server

The Express API serves H2H data. Can be run locally or deployed via Docker.

### Running Locally
```bash
# server.js reads PG_* env vars but does NOT load dotenv — must source .env first:
set -a && source /path/to/qw-stats/.env && set +a
cd api && npm install && node server.js
```

### Endpoints
```
GET /health
    -> { status: "ok", service: "qw-stats-api" }

GET /api/h2h?teamA=book&teamB=oeks&map=dm2&months=3&limit=10
    -> { teamA, teamB, games: [...], total }
    -> result is from teamA's perspective: W/L/D

GET /api/form?team=book&map=dm3&months=3&limit=10
    -> { team, games: [...], total }

GET /api/maps?team=book&vsTeam=oeks&months=6
    -> { team, maps: [...], totalGames }
    -> vsTeam is optional

GET /api/roster?team=book&months=3
    -> { team, players: [...], totalPlayers, totalGames }
    -> totalGames = distinct team matches in period (for attendance %)
```

---

## Methodology

### Composite Rating Weights (from initial analysis)
```
Efficiency (K/D ratio)       x 0.20
Avg Damage Given             x 0.20
Taken-to-Die (survivability) x 0.15
Armor Control (RA+YA time)   x 0.15
RL Accuracy                  x 0.10
SG Accuracy                  x 0.10
Enemy Weapon Damage          x 0.05
Team Damage (penalty)        x -0.05
```

### Weight Adjustments Needed (from correlation analysis)
- **TTD and Armor are r=0.92** — nearly identical signals, should merge or reduce one
- **SG accuracy barely predicts winning** (r=0.12) — reduce weight
- **RL accuracy slightly negative** (r=-0.08) — rethink or remove
- **Efficiency is strongest predictor** of winning (r=0.53) — possibly increase weight

---

## Domain Expert Notes

- **Milton is the undisputed GOAT** — Messi, Ronaldo, Maradona rolled into one. Calibration benchmark.
- **Taken-to-Die** = how much damage you absorb before dying. Higher = better survivability/positioning/armor control.
- **Team damage** should be a penalty — disciplined players don't shoot teammates.
- **Spawn frags** are somewhat random — low weight or ignore.
- **Map-specific ratings matter** — dm2 plays very differently from dm3 or schloss.
- **Red/blue team names** = pickup/mix games, not organized clan matches. Separate from clan rankings.
- **The "line" concept** from sports betting: instead of just who wins, predict the frag margin.
- **Players change names freely** — no account system. Identity resolution is a core challenge.
- **~300 active players** in the community, ~2,355 unique names (many are aliases).

---

## Private Infrastructure

If you have access to the live infrastructure (ParadokS's Unraid server), see `DEPLOYMENT.md` for connection details, deployment instructions, and server reference. That file is gitignored and not included in the public repo.
