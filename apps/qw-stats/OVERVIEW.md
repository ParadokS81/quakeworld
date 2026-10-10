# QW Stats - Overview

> What this document is: the current-state living map of the qw-stats project. For why it exists and the design intent, read `VISION.md`. For the public elevator pitch and the run commands, read `README.md`. For the working rules and the documentation index, read `CLAUDE.md`. The lifecycle word is `CLAUDE.md`'s (Paused); open work is the monorepo's root `HANDOVER.md`.

## What's here

Two shipped pieces and one unbuilt product. The data foundation (PostgreSQL) and the Express API are live and serving MatchScheduler's match pages. The ranking product is research-complete and implementation-unstarted; it waits on identity resolution, Phase 0 in `ROADMAP.md`.

### The data foundation

- **PostgreSQL 16**, database `quake_stats`. Two tables, `games` (one row per match) and `game_players` (one row per player per match, 8 per game), plus four views. Full per-player stats: frags / kills / deaths / taken-to-die, damage given and taken, weapon accuracy (SG / SSG / RL / LG / GL) with hits and attack counts, item control (armor, quad, pent, ring), speed, streaks, team damage. Shapes in `SCHEMA.md`.
- **Seeded from the QWHub ktxstats archive** (`4on4_json.zip`, Jan 2022 to Feb 2026, 18,206 games after filters) and **kept current by the API's updater**, which pulls every new 4on4 game from QWHub within 15 minutes of it being played. The live size is whatever `GET /api/sync-status` reports; the archive figures below are the research baseline, not the current count.
- **Query keys** - `team_a_ascii` / `team_b_ascii` / `team_ascii` and `player_name_normalized` are lowercase ASCII-decoded; always use these. Raw QW-encoded columns are for display only.

### The API (production)

- **Express server** in `api/server.js`, container `qw-stats-api` on the Unraid box, port 3100. Eight routes: `GET /health`, `GET /api/sync-status`, `POST /api/sync-now`, `GET /api/h2h`, `GET /api/form`, `GET /api/opponents`, `GET /api/maps`, `GET /api/roster`. Every team parameter accepts a comma-separated list of tags, which is how tag variants of one clan are folded together. Contract in `API_CONTRACTS.md`.
- **Updater** in `api/updater.js`: on startup and every `UPDATE_INTERVAL` seconds (default 900) it asks QWHub's Supabase index for 4on4 games newer than the latest `played_at`, fetches each game's ktxstats file from `d.quake.world`, and inserts with `ON CONFLICT DO NOTHING` on `demo_sha256`. The same module runs by hand as `scripts/update-games.js`.
- **Public on the internet** at `https://qw-api.poker-affiliate.org` through a Cloudflare tunnel (container `qw-stats-cloudflared`). No auth, CORS open, read-only apart from `POST /api/sync-now`, which only triggers a pull. MatchScheduler's browser code calls this URL directly.
- **Docker image** from `api/Dockerfile` (copies `server.js` and `updater.js`). How it ships: `DEPLOYMENT.md`.

### Research and analysis

- **`ANALYSIS.md`** - statistical findings from the first 4-month sample: distribution shapes, ratio sanity checks, map-by-map win rates. A dated snapshot.
- **`RESEARCH-RANKING.md`** - three ranking methodologies considered: Stats Composite (current baseline), RAPM (regularized adjusted plus-minus), OpenSkill (Bayesian, TrueSkill-successor). Methodology tradeoffs and which to run first.
- **`RESEARCH-IDENTITY.md`** - alias resolution research. Core name extraction, co-occurrence clustering, context signals (team continuity, stat-signature consistency), and Section 15's field notes on what actually worked.
- **`ALIAS-RESOLUTION-RESEARCH.md`** - sister doc: the entity-resolution literature behind the clustering pipeline.
- **`IDENTITY-SEEDS.md`** - confirmed clusters. Curated list of "these aliases are definitely one human" that the pipeline will use as labeled ground truth.
- **`ROADMAP.md`** - the plan: phase order, the game-classification fix, domain knowledge.

## What's loaded (archive baseline, Feb 2026 import)

| Metric | Value |
|---|---|
| Total 4on4 games | 18,206 |
| Clan games (non-pickup) | 9,868 (54%) |
| Pickup / mix games | 8,338 (46%) |
| Unique player-name strings | 2,355 |
| Estimated unique humans behind those | ~800-1,000 |
| Date range | Jan 2022 - Feb 2026 |
| Source | QWHub ktxstats archive (vikpe) |

Top maps by game count at the baseline: dm2 (4,811), dm3 (4,482), schloss (3,760), e1m2 (2,919), phantombase (931). The updater has added every 4on4 game since; the research docs quote the baseline.

## Code landmarks

### Import and update pipeline

- **`scripts/import-postgres.js`** - parses ktxstats JSON files and bulk-inserts into `games` + `game_players`; owns the DDL. Filters: 8 valid players, team mode, duration >= 600s, `ping != 0` to drop bogus players. About 2 minutes for the archive.
- **`api/updater.js`** + **`scripts/update-games.js`** - the incremental path (above). Its generic-team list is the extended one from `ROADMAP.md`; the bulk importer's is the original seven names, so `is_clan_game` was decided by different lists for archive rows and updater rows (routed in `HANDOVER.md`).
- **`scripts/create-views.js`** - `v_team_games`, `v_team_map_stats`, `v_opponent_record`, `v_roster_stats`. Optional; useful for ad-hoc exploration.
- **`scripts/db.js`** - shared PostgreSQL pool, reads `.env`. Every script goes through this; the API server does not (it reads `PG_*` from its environment).
- **`scripts/test-connection.js`** / **`scripts/test-pg.js`** - count sanity check and query examples (H2H, roster, form).

### Exploration (Postgres era)

- **`scripts/explore-data.js`** - dataset overview, distributions, sanity checks.
- **`scripts/explore-names.js`** - core name extraction + fuzzy duplicate detection. First line of identity resolution.
- **`scripts/clan-rosters.js`** - clan roster viewer. Flags: `--clan <name>`, `--player <name>`, `--co-check "a,b"`. The curation tool for alias discovery.
- **`scripts/compare-teams.js`** - quick head-to-head CLI.
- **`scripts/probe-qwhub.js`** - how much 4on4 data QWHub's index holds; the reconnaissance behind the updater.
- **One-off probes**, unattested: `find-players.js`, `find-milton.js`, `find-gris-razor.js`, `find-player.js`'s Postgres cousins, `playtime.js`, `playtime-team.js`, `playtime-milton.js`, `playtime-all-frags.js`, `highest-scoring.js`, `highest-scoring-no-ot.js`, `overtime-check.js`. Left from exploration sessions; see True cruft.

### Legacy SQLite scripts (kept for reference)

- **`import-stats.js`** - archive -> SQLite (pre-PostgreSQL era).
- **`stats-4on4.js`** - composite rating + top 50. Ran against SQLite; its weights are the baseline table below.
- **`stats-correlations.js`** - correlation matrix between stats and winning.
- **`find-player.js`, `player-stats.js`, `check-dates.js`, `stats-summary.js`** - miscellaneous SQLite-era tools.

Retained because the composite-rating math and correlation work inform the PostgreSQL-era ranking pipeline.

## Ranking methodology (current baseline)

The Stats Composite rating is the starting point; correlation analysis has identified where the weights need to move.

Current weights (`scripts/stats-4on4.js`):

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

Next-step adjustments surfaced by analysis (the Phase 1 table in `ROADMAP.md` is the proposed re-weighting):

- Merge TTD and armor-control (r=0.92) into one signal.
- Reduce SG accuracy weight.
- Rethink RL accuracy; may need to become RL-damage-dealt rather than accuracy.
- Possibly raise efficiency weight.

## Parked with purpose

- **Identity-resolution pipeline (Phase 0).** Research done (`RESEARCH-IDENTITY.md`, Section 15 says what worked), seeds curated (`IDENTITY-SEEDS.md`), the `player_identities` / `player_aliases` tables designed but never created. The blocker for everything below. Plan: `ROADMAP.md`.
- **Three-way game classification** (clan / hybrid / mix). Designed in `ROADMAP.md`; the database still carries the binary `is_clan_game`.
- **RAPM (regularized adjusted plus-minus).** NBA-analytics technique adapted for 4-player teams. Research notes in `RESEARCH-RANKING.md`. Needs identity first, then ridge regression per map with player indicator variables.
- **OpenSkill (Bayesian per-game skill updates).** TrueSkill family. Naturally handles uneven roster participation. Also blocked on identity.
- **Public-facing ranking webpage.** Ranking output has no consumer today except research notebooks. The obvious next product once rankings are credible.

## True cruft

None confirmed. The eleven one-off probe scripts under Code landmarks are unattested: neither parked for a purpose nor confirmed deletable. Attest or delete when the project revives. The legacy SQLite scripts and `probe-qwhub.js` are kept on purpose (above).

## Integration points

### MatchScheduler (downstream)

MatchScheduler's browser code (`apps/matchscheduler/public/js/services/QWStatsService.js`) calls `/api/h2h`, `/api/form`, `/api/opponents`, `/api/maps` and `/api/roster` on the public URL from every match page. qw-stats has no knowledge of MatchScheduler. Changing endpoint shapes requires updating that service in the same commit.

### QWHub (upstream)

- **ktxstats archive** - `4on4_json.zip` from this project's GitHub Releases, originally maintained by vikpe at QWHub. The bulk seed.
- **Supabase REST** - `ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games`, polled every 15 minutes by the updater with QWHub's public anon key (the same key `hub.quakeworld.nu` ships to browsers; not a secret). Per-game ktxstats come from `https://d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json`.

### phoenix-postgres (the shared database host)

`quake_stats` has no Postgres container of its own. It lives inside `phoenix-postgres`, the instance the shut-down phoenix affiliate project used for its `phoenix_analytics` and `media_inventory` databases. `qw-stats-api` joins the `phoenix-analytics_default` docker network and connects by hostname `phoenix-postgres` as role `phoenix` (the defaults in `api/server.js`). That role's password is shared across all three databases and lives in `/mnt/user/appdata/phoenix-analytics/.env` (`POSTGRES_PASSWORD`); the deploy skill reads it from there. Consequences: stopping `phoenix-postgres` takes the live API offline; rotating the password means recreating `qw-stats-api` with the new value in the same step. For ranking research that needs to write, the qw-oracle dev twin (`qw-oracle-postgres-dev`) also hosts a scratch copy of `quake_stats`; see `apps/qw-oracle/CLAUDE.md`.

### None with slipgate-app, qw-oracle, or quad directly

qw-stats does not read from or write to the other monorepo apps. The MatchScheduler relationship is the only active integration; the scratch copy on the oracle twin is a convenience, not a dependency.

## What this doc intentionally does NOT cover

- **Database schema columns and types** - `SCHEMA.md` (the authoritative DDL is in `scripts/import-postgres.js`).
- **API endpoint shapes in full** - `API_CONTRACTS.md`.
- **Deployment to Unraid** - `DEPLOYMENT.md`.
- **Why the sniff test is the integration test** - `VISION.md`.
- **Methodology research depth** - `RESEARCH-RANKING.md`, `RESEARCH-IDENTITY.md`, `ALIAS-RESOLUTION-RESEARCH.md`.
- **Project direction / phase order** - `ROADMAP.md`.
