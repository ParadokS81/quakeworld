# QW Stats - Overview

> What this document is: the current-state living map of the qw-stats project. For why it exists and the design intent, read `VISION.md`. For the public elevator pitch, read `README.md`. For rules and the canonical technical reference, read `CLAUDE.md`.

## Status

Paused. The data foundation (18,206 games imported into Postgres) and the Express API (serving MatchScheduler in production) are both shipped and stable. The ranking product - which is what would move the project out of Paused - is blocked on Phase 0 identity resolution. Research docs are extensive; the pipeline implementation has not landed.

## What's here

### The data foundation

- **18,206 4on4 games** imported from the QWHub ktxstats archive (2022 to Feb 2026).
- **PostgreSQL 16** in production. Schema in `DATABASE-SCHEMA.md`. Two main tables: `games` (one row per match) and `game_players` (one row per player per match, 8 per game). Full per-player stats: frags / kills / deaths / taken-to-die, damage given and taken, weapon accuracy (SG / RL / LG / GL / SSG) with hits and attack counts, item control (armor time, quad time, pent time, ring time), and team-damage.
- **Query keys** - `team_a_ascii` / `team_b_ascii` / `team_ascii` columns are lowercase ASCII-decoded; always use these for team queries. Raw QW-encoded names are preserved for display only.

### The API (production)

- **Express server** in `api/server.js`. Endpoints: `/health`, `/api/h2h`, `/api/form`, `/api/maps`, `/api/roster`. Each query is parameterized by team, optional vs-team, optional map, optional lookback window.
- **Docker image** (`api/Dockerfile`) deployed on ParadokS's Unraid server.
- **Tailscale** bridges MatchScheduler's Cloud Functions to the private IP.
- Running steady; no current issues. Full endpoint docs in `API-GUIDE.md`.

### Research and analysis

- **`ANALYSIS.md`** - statistical findings from early data exploration. Distribution shapes, ratio sanity checks, map-by-map win rates.
- **`RESEARCH-RANKING.md`** - three ranking methodologies considered: Stats Composite (current baseline), RAPM (regularized adjusted plus-minus), OpenSkill (Bayesian, TrueSkill-successor). Methodology tradeoffs and which to run first.
- **`RESEARCH-IDENTITY.md`** - alias resolution research. Core name extraction, co-occurrence clustering, context signals (team continuity, stat-signature consistency).
- **`ALIAS-RESOLUTION-RESEARCH.md`** - sister doc focused on implementation approaches to the clustering pipeline.
- **`IDENTITY-SEEDS.md`** - confirmed clusters. Curated list of "these aliases are definitely one human" that the pipeline will use as labeled training data.
- **`ROADMAP.md`** - project direction and phases. Phase 0 identity resolution is the current blocker.

## What's loaded

| Metric | Value |
|---|---|
| Total 4on4 games | 18,206 |
| Clan games (non-pickup) | 9,868 (54%) |
| Pickup / mix games | 8,338 (46%) |
| Unique player-name strings | 2,355 |
| Estimated unique humans behind those | ~800-1,000 |
| Date range | Jan 2022 - Feb 2026 |
| Source | QWHub ktxstats archive (vikpe) |

Top maps by game count: dm2 (4,811), dm3 (4,482), schloss (3,760), e1m2 (2,919), phantombase (931).

## Code landmarks

### Import pipeline (`scripts/`)

- **`import-postgres.js`** - parses ktxstats JSON files and bulk-inserts into `games` + `game_players`. Filters: 8 valid players, team mode, duration >= 600s, `ping != 0` to drop bogus players. Takes ~2 minutes for the full 18K dataset.
- **`create-views.js`** - creates SQL views for H2H queries. Optional but useful for ad-hoc exploration.
- **`db.js`** - shared PostgreSQL connection (reads `.env`). All scripts go through this.

### Exploration (`scripts/`, current era)

- **`explore-data.js`** - dataset overview, distributions, sanity checks.
- **`explore-names.js`** - core name extraction + fuzzy duplicate detection. First line of identity resolution.
- **`clan-rosters.js`** - clan roster viewer. Flags: `--clan <name>`, `--player <name>`, `--co-check "a,b"`. Excellent for alias discovery.
- **`compare-teams.js`** - quick head-to-head CLI.
- **`test-pg.js`** - PostgreSQL query examples (H2H, roster, form) used to validate connectivity + schema.
- **`probe-qwhub.js`** - Supabase API data volume check for the "stay fresh" polling path.

### Legacy SQLite scripts (kept for reference)

- **`import-stats.js`** - archive -> SQLite (pre-PostgreSQL era).
- **`stats-4on4.js`** - composite rating + top 50. Ran against SQLite.
- **`stats-correlations.js`** - correlation matrix between stats and winning.
- **`find-player.js`, `player-stats.js`, `check-dates.js`, `stats-summary.js`** - miscellaneous SQLite-era tools.

Retained because the composite-rating math and correlation work inform the PostgreSQL-era ranking pipeline.

## Ranking methodology (current baseline)

The Stats Composite rating is the starting point; correlation analysis has identified where the weights need to move.

Current weights:

| Stat | Weight | Correlation with winning |
|---|---|---|
| Efficiency (K/D) | 0.20 | 0.53 (strongest predictor) |
| Avg damage given | 0.20 | - |
| Taken-to-die (survivability) | 0.15 | r=0.92 with armor control - redundant |
| Armor control (RA+YA time) | 0.15 | r=0.92 with TTD - redundant |
| RL accuracy | 0.10 | -0.08 (slightly negative - rethink) |
| SG accuracy | 0.10 | 0.12 (weak - reduce) |
| Enemy weapon damage | 0.05 | - |
| Team damage | -0.05 (penalty) | - |

Next-step adjustments surfaced by analysis:

- Merge TTD and armor-control (r=0.92) into one signal.
- Reduce SG accuracy weight.
- Rethink RL accuracy; may need to become RL-damage-dealt rather than accuracy.
- Possibly raise efficiency weight.

## Parked with purpose

- **RAPM (regularized adjusted plus-minus).** NBA-analytics technique adapted for 4-player teams. Research notes in `RESEARCH-RANKING.md`. Implementation would require solving identity first, then fitting ridge regression per map with player indicator variables.
- **OpenSkill (Bayesian per-game skill updates).** TrueSkill family. Naturally handles uneven roster participation. Also blocked on identity.
- **Auto-refresh / live ingestion.** The Supabase polling path (`probe-qwhub.js` is the reconnaissance script) would let us keep the DB fresh as new matches get played. Not prioritized; the current full-archive import gets re-run periodically instead.
- **Public-facing ranking webpage.** Ranking output has no consumer today except research notebooks. A public page is the obvious next product once rankings are credible.

## True cruft

None identified. The legacy SQLite scripts serve a purpose (historical correlation work); the QWHub probe script is a small piece of forward-looking diligence; the research docs are all load-bearing for the ranking work.

## Integration points

### MatchScheduler (downstream)

MatchScheduler hits `/api/h2h`, `/api/form`, `/api/maps`, `/api/roster` on every match page. qw-stats has no knowledge of MatchScheduler; MatchScheduler uses the API through the cross-project contract. Changing endpoint shapes requires updating MatchScheduler in the same commit.

### QWHub (upstream)

- **ktxstats archive** - 4on4_json.zip downloaded from this project's GitHub Releases, originally maintained by vikpe at QWHub. Bulk import source.
- **Supabase REST** - `ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games`. Match index for "stay fresh" polling path. Currently uncalled in production.

### None with slipgate-app, qw-oracle, or quad directly

qw-stats does not read from or write to the other monorepo apps. The MatchScheduler relationship is the only active integration.

## What this doc intentionally does NOT cover

- **Database schema columns and types** - `DATABASE-SCHEMA.md` (or the authoritative Postgres schema in `scripts/import-postgres.js`).
- **API endpoint shapes in full** - `API-GUIDE.md`.
- **Deployment to Unraid** - `DEPLOYMENT.md` (gitignored in the standalone qw-stats repo; see that file if you have access).
- **Why the sniff test is the integration test** - `VISION.md`.
- **Methodology research depth** - `RESEARCH-RANKING.md`, `RESEARCH-IDENTITY.md`, `ALIAS-RESOLUTION-RESEARCH.md`.
- **Project direction / phase order** - `ROADMAP.md`.
