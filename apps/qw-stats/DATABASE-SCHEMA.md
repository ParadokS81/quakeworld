# QW Stats — PostgreSQL Database Schema

## Overview

PostgreSQL 16 database storing 4+ years of QuakeWorld 4on4 match statistics sourced from [QWHub](https://hub.quakeworld.nu) ktxstats JSON files.

| Metric | Value |
|--------|-------|
| Total 4on4 games | 18,200+ |
| Clan games (organized play) | ~9,900 (54%) |
| Mix/pickup games | ~8,300 (46%) |
| Unique player names | 2,355 |
| Unique team tags | ~150 |
| Date range | Jan 2022 — Feb 2026 |
| Top maps | dm2, dm3, schloss, e1m2, phantombase |

**Infrastructure:** Docker container on Unraid, exposed via Cloudflare tunnel at `https://qw-api.poker-affiliate.org`. Express API serves 5 endpoints consumed by the MatchScheduler web app.

---

## Tables

### `games` — Match metadata (1 row per match)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `demo_sha256` | TEXT | UNIQUE, NOT NULL | ktxstats file identifier (SHA-256 of the demo file) |
| `played_at` | TIMESTAMPTZ | | Match end timestamp |
| `map` | TEXT | NOT NULL | Map name (dm2, dm3, e1m2, schloss, etc.) |
| `hostname` | TEXT | | Server name |
| `matchtag` | TEXT | | Tournament/practice tag (optional) |
| `duration` | INTEGER | NOT NULL | Duration in seconds (filtered: >= 600) |
| `timelimit` | INTEGER | | Time limit in minutes (typically 20) |
| `team_a` | TEXT | NOT NULL | Team A name (raw QW-encoded) |
| `team_b` | TEXT | NOT NULL | Team B name (raw QW-encoded) |
| `team_a_ascii` | TEXT | NOT NULL | Team A name (lowercase ASCII — used for queries) |
| `team_b_ascii` | TEXT | NOT NULL | Team B name (lowercase ASCII — used for queries) |
| `team_a_frags` | INTEGER | NOT NULL, DEFAULT 0 | Total frags scored by team A |
| `team_b_frags` | INTEGER | NOT NULL, DEFAULT 0 | Total frags scored by team B |
| `is_clan_game` | BOOLEAN | NOT NULL, DEFAULT false | True if both teams are recognized clan tags |

**Notes:**
- QW uses custom character encoding for player/team names. `team_a` stores the raw bytes, `team_a_ascii` stores the decoded lowercase version for querying.
- `is_clan_game` filters out generic team names (blue, red, mix, team1, etc.) to separate organized clan matches from pickup games.

---

### `game_players` — Per-player stats (8 rows per match, 4 per team)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| **Identity** | | | |
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `game_id` | INTEGER | NOT NULL, FK → games(id) ON DELETE CASCADE | Parent game |
| `player_name_raw` | TEXT | | Raw QW-encoded name |
| `player_name_ascii` | TEXT | | ASCII-decoded display name |
| `player_name_normalized` | TEXT | NOT NULL | Lowercase, trimmed (for matching/grouping) |
| `team` | TEXT | NOT NULL | Raw QW-encoded team tag |
| `team_ascii` | TEXT | NOT NULL | Lowercase ASCII team tag |
| `ping` | INTEGER | NOT NULL, DEFAULT 0 | Network ping |
| `login` | TEXT | | QW login (mostly empty) |
| | | | |
| **Core Combat** | | | |
| `frags` | INTEGER | NOT NULL, DEFAULT 0 | Net frags (kills - suicides - teamkills) |
| `kills` | INTEGER | NOT NULL, DEFAULT 0 | Direct kills on opponents |
| `deaths` | INTEGER | NOT NULL, DEFAULT 0 | Deaths to opponents |
| `tk` | INTEGER | NOT NULL, DEFAULT 0 | Teamkills |
| `suicides` | INTEGER | NOT NULL, DEFAULT 0 | Self-inflicted deaths |
| `spawn_frags` | INTEGER | NOT NULL, DEFAULT 0 | Kills on respawning players |
| | | | |
| **Damage** | | | |
| `dmg_given` | INTEGER | NOT NULL, DEFAULT 0 | Damage dealt to opponents |
| `dmg_taken` | INTEGER | NOT NULL, DEFAULT 0 | Damage received from opponents |
| `dmg_team` | INTEGER | NOT NULL, DEFAULT 0 | Damage dealt to teammates |
| `dmg_self` | INTEGER | NOT NULL, DEFAULT 0 | Self-inflicted damage |
| `dmg_enemy_weapons` | INTEGER | NOT NULL, DEFAULT 0 | Damage from enemy weapons |
| `taken_to_die` | REAL | NOT NULL, DEFAULT 0 | Avg damage absorbed before dying (survivability) |
| | | | |
| **Streaks & Movement** | | | |
| `spree_max` | INTEGER | NOT NULL, DEFAULT 0 | Longest kill streak |
| `spree_quad` | INTEGER | NOT NULL, DEFAULT 0 | Longest quad-powered streak |
| `speed_avg` | REAL | NOT NULL, DEFAULT 0 | Average movement speed |
| `speed_max` | REAL | NOT NULL, DEFAULT 0 | Peak movement speed |
| | | | |
| **Weapon: Shotgun (SG)** | | | |
| `sg_attacks` | INTEGER | NOT NULL, DEFAULT 0 | Shots fired |
| `sg_hits` | INTEGER | NOT NULL, DEFAULT 0 | Shots connected |
| `sg_acc` | REAL | NOT NULL, DEFAULT 0 | Accuracy % |
| `sg_dmg` | INTEGER | NOT NULL, DEFAULT 0 | Damage dealt |
| | | | |
| **Weapon: Super Shotgun (SSG)** | | | |
| `ssg_attacks` | INTEGER | NOT NULL, DEFAULT 0 | Shots fired |
| `ssg_hits` | INTEGER | NOT NULL, DEFAULT 0 | Shots connected |
| `ssg_dmg` | INTEGER | NOT NULL, DEFAULT 0 | Damage dealt |
| | | | |
| **Weapon: Rocket Launcher (RL)** | | | |
| `rl_attacks` | INTEGER | NOT NULL, DEFAULT 0 | Rockets fired |
| `rl_hits` | INTEGER | NOT NULL, DEFAULT 0 | Direct hits |
| `rl_acc` | REAL | NOT NULL, DEFAULT 0 | Accuracy % (direct hit rate) |
| `rl_dmg` | INTEGER | NOT NULL, DEFAULT 0 | Damage dealt |
| | | | |
| **Weapon: Lightning Gun (LG)** | | | |
| `lg_attacks` | INTEGER | NOT NULL, DEFAULT 0 | Cells fired |
| `lg_hits` | INTEGER | NOT NULL, DEFAULT 0 | Successful hits |
| `lg_acc` | REAL | NOT NULL, DEFAULT 0 | Accuracy % |
| `lg_dmg` | INTEGER | NOT NULL, DEFAULT 0 | Damage dealt |
| | | | |
| **Weapon: Grenade Launcher (GL)** | | | |
| `gl_attacks` | INTEGER | NOT NULL, DEFAULT 0 | Grenades fired |
| `gl_hits` | INTEGER | NOT NULL, DEFAULT 0 | Grenades that hit |
| `gl_dmg` | INTEGER | NOT NULL, DEFAULT 0 | Damage dealt |
| | | | |
| **Weapon Transfers** | | | |
| `xfer_rl` | INTEGER | NOT NULL, DEFAULT 0 | Times received RL from teammate |
| `xfer_lg` | INTEGER | NOT NULL, DEFAULT 0 | Times received LG from teammate |
| | | | |
| **Item Control: Armor** | | | |
| `ya_took` | INTEGER | NOT NULL, DEFAULT 0 | Yellow Armor pickups |
| `ya_time` | INTEGER | NOT NULL, DEFAULT 0 | Seconds held Yellow Armor |
| `ra_took` | INTEGER | NOT NULL, DEFAULT 0 | Red Armor pickups |
| `ra_time` | INTEGER | NOT NULL, DEFAULT 0 | Seconds held Red Armor |
| `ga_took` | INTEGER | NOT NULL, DEFAULT 0 | Green Armor pickups |
| `ga_time` | INTEGER | NOT NULL, DEFAULT 0 | Seconds held Green Armor |
| | | | |
| **Item Control: Powerups** | | | |
| `quad_took` | INTEGER | NOT NULL, DEFAULT 0 | Quad Damage pickups |
| `quad_time` | INTEGER | NOT NULL, DEFAULT 0 | Seconds held Quad |
| `pent_took` | INTEGER | NOT NULL, DEFAULT 0 | Pentagram (invulnerability) pickups |
| `pent_time` | INTEGER | NOT NULL, DEFAULT 0 | Seconds held Pentagram |
| `ring_took` | INTEGER | NOT NULL, DEFAULT 0 | Ring of Shadows (invisibility) pickups |
| `ring_time` | INTEGER | NOT NULL, DEFAULT 0 | Seconds held Ring |
| | | | |
| **Health** | | | |
| `health_100` | INTEGER | NOT NULL, DEFAULT 0 | Mega health pickups |
| | | | |
| **Result** | | | |
| `won` | BOOLEAN | NOT NULL, DEFAULT false | True if this player's team won |

---

## Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `idx_gp_game_id` | game_players | game_id | FK join performance |
| `idx_gp_player` | game_players | player_name_normalized | Find all games for a player |
| `idx_gp_team` | game_players | team | Team lookup (raw) |
| `idx_gp_team_ascii` | game_players | team_ascii | Team lookup (ASCII) |
| `idx_gp_player_game` | game_players | player_name_normalized, game_id | Combined player+game lookup |
| `idx_games_map` | games | map | Filter by map |
| `idx_games_played_at` | games | played_at | Time-range queries |
| `idx_games_teams` | games | team_a_ascii, team_b_ascii | H2H lookups |
| `idx_games_clan` | games | is_clan_game | Clan vs mix filter |
| `idx_games_clan_map` | games | is_clan_game, map | Combined clan+map filter |

---

## Views

### `v_team_games` — Normalized team perspective

Every game appears twice — once from each team's perspective. Simplifies all downstream queries.

| Column | Type | Description |
|--------|------|-------------|
| `game_id` | INTEGER | Reference to games table |
| `played_at` | TIMESTAMPTZ | Match timestamp |
| `map` | TEXT | Map name |
| `team` | TEXT | "Our" team (ASCII) |
| `team_frags` | INTEGER | "Our" frags |
| `opponent` | TEXT | Opposing team (ASCII) |
| `opponent_frags` | INTEGER | Opponent's frags |
| `frag_diff` | INTEGER | team_frags - opponent_frags (positive = win) |
| `result` | TEXT | 'W' / 'L' / 'D' |
| `is_clan_game` | BOOLEAN | From parent game |

### `v_team_map_stats` — Per-team, per-map aggregates

| Column | Type | Description |
|--------|------|-------------|
| `team` | TEXT | Team tag |
| `map` | TEXT | Map name |
| `is_clan_game` | BOOLEAN | Filter |
| `games` | INTEGER | Total games on this map |
| `wins` / `losses` / `draws` | INTEGER | Results |
| `win_pct` | REAL | Win percentage |
| `avg_frag_diff` | REAL | Average frag differential |
| `avg_frags` / `avg_opp_frags` | REAL | Average frags for/against |
| `last_played` | TIMESTAMPTZ | Most recent game |

### `v_opponent_record` — H2H records per opponent

| Column | Type | Description |
|--------|------|-------------|
| `team` / `opponent` | TEXT | Team matchup |
| `is_clan_game` | BOOLEAN | Filter |
| `games` / `wins` / `losses` | INTEGER | Series record |
| `win_pct` | REAL | Win percentage |
| `avg_frag_diff` | REAL | Average frag diff |
| `first_played` / `last_played` | TIMESTAMPTZ | Series date range |

### `v_roster_stats` — Player stats within each team

| Column | Type | Description |
|--------|------|-------------|
| `team` / `player` | TEXT | Team + player name |
| `is_clan_game` | BOOLEAN | Filter |
| `games` / `wins` / `win_pct` | | Activity + results |
| `avg_eff` | REAL | Average efficiency % (kills / (kills+deaths)) |
| `avg_dmg` | REAL | Average damage given per game |
| `avg_frags` / `avg_deaths` | REAL | Average frags/deaths |
| `avg_ttd` | REAL | Average taken-to-die |
| `avg_sg_acc` / `avg_rl_acc` | REAL | Weapon accuracies |
| `avg_armor_time` | REAL | Average RA+YA hold time |
| `first_game` / `last_game` | TIMESTAMPTZ | Active date range |

---

## API Endpoints

Express server at `https://qw-api.poker-affiliate.org`

| Endpoint | Params | Description |
|----------|--------|-------------|
| `GET /api/h2h` | `teamA`, `teamB`, `map?`, `months?`, `limit?` | Head-to-head games between two teams |
| `GET /api/form` | `team`, `map?`, `months?`, `limit?` | Recent results for a team |
| `GET /api/opponents` | `team`, `months?` | Unique opponents with match counts |
| `GET /api/maps` | `team`, `months?` | Per-map win rates for a team |
| `GET /api/roster` | `team`, `months?` | Player activity and stats within a team |

All endpoints filter to `is_clan_game = true` by default.

---

## Data Pipeline

### Source

Raw data comes from **ktxstats** JSON files — the standard match stats format for QuakeWorld servers running KTX mod. Each file contains full per-player stats for one game.

- **Bulk archive:** ~18,200 JSON files covering Jan 2022 — Feb 2026
- **ktxstats URL pattern:** `https://d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json`
- **Game index:** QWHub Supabase API at `hub.quakeworld.nu`

### Import Filters

| Filter | Rationale |
|--------|-----------|
| Mode = 4on4 | Only team games with 4 players per side |
| 8 valid players | Ensures complete game (no disconnects/specs) |
| Duration >= 600s | Excludes incomplete/test matches |
| Ping != 0 | Removes spectators and bots |

### Incremental Updates

The API server polls QWHub every 15 minutes for new games, downloads their ktxstats, and inserts them (`ON CONFLICT DO NOTHING` on `demo_sha256`).

### QW Character Encoding

QuakeWorld uses a custom character encoding (non-ASCII bytes for colored text). The import pipeline converts these to readable ASCII via a lookup table. Both raw and ASCII versions are stored — raw for display fidelity, ASCII for querying.

### Clan Game Detection

A team name is "clan" if it's NOT in a list of generic names: `blue`, `red`, `green`, `yellow`, `mix`, `team1`, `team2`, `lol`, `asdf`, numeric values, etc. A game is `is_clan_game = true` only when BOTH team names pass this filter.

---

## Entity Relationship

```
┌─────────────────────┐
│       games          │
│─────────────────────│
│ id (PK)             │
│ demo_sha256 (UNIQUE)│         ┌──────────────────────────┐
│ played_at            │         │     game_players          │
│ map                  │         │──────────────────────────│
│ team_a / team_b      │────────▶│ id (PK)                  │
│ team_a_ascii/b_ascii │  1 : 8  │ game_id (FK → games.id)  │
│ team_a_frags/b_frags │         │ player_name_normalized   │
│ is_clan_game         │         │ team_ascii               │
│ duration             │         │ frags, kills, deaths     │
│ hostname, matchtag   │         │ dmg_given, dmg_taken     │
└─────────────────────┘         │ weapon stats (sg/rl/lg/…)│
                                 │ item control (ra/ya/quad…)│
                                 │ won                       │
                                 └──────────────────────────┘

Views (derived from above):
  v_team_games       — games doubled, one row per team perspective
  v_team_map_stats   — aggregated wins/losses per team+map
  v_opponent_record  — H2H records per team pair
  v_roster_stats     — per-player averages within each team
```

---

## Known Limitations / Future Work

1. **Identity resolution is unsolved.** Players use multiple names across teams/time. The 2,355 unique `player_name_normalized` values map to roughly 800-1,000 real humans. No alias table exists yet — this is the active area of work (Phase 0).

2. **No composite primary key on game_players.** The `(game_id, player_name_normalized)` pair is not enforced as unique at the DB level. Deduplication relies on the `demo_sha256` uniqueness on the games table.

3. **Team tags are free-text.** Teams can use different tag variations across games (e.g., "SR" vs "sr" vs "SilverRockets"). The `_ascii` columns normalize case but not variations. The API handles this with tag alias arrays.

4. **Weapon stats completeness.** Not all ktxstats files contain all weapon fields. Missing values default to 0, which is indistinguishable from "player didn't use this weapon."
