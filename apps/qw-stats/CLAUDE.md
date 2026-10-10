# QW Stats -- Player & Team Ranking Engine

**Status:** Paused. Why it is paused and what would unpause it: `VISION.md`. Open work: the monorepo's root `HANDOVER.md`.

A data-driven ranking system for QuakeWorld 4on4 players and teams, built on QWHub ktxstats match data in PostgreSQL. The data foundation and the public Express API are shipped and live; the ranking product is research-complete and unbuilt. The test any ranking must pass: if Milton is not near the top, the algorithm is broken.

**Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries).**

## Documentation index

| When you need... | Read... |
|---|---|
| Elevator pitch, local setup, the commands a maintainer actually runs | `README.md` |
| Why this exists, the sniff test, the identity-resolution blocker, non-goals | `VISION.md` |
| Current map: what is live, code landmarks, parked items, integration boundaries | `OVERVIEW.md` |
| Tables, columns, indexes, views, import filters (Layer 2, schema role) | `DATABASE-SCHEMA.md` |
| Public API endpoints, parameters, response shapes (Layer 2, API-contracts role) | `API-GUIDE.md` |
| Deploy to the Unraid box and verify | root `deploy` skill, section "QW Stats" (`.claude/skills/deploy/SKILL.md`); this app has no deployment doc of its own |
| The plan: phase order, game-classification fix, domain knowledge, what worked | `ROADMAP.md` |
| Ranking methodology research (HLTV, Glicko-2, TrueSkill, OpenSkill, RAPM) | `RESEARCH-RANKING.md` (Layer 3) |
| Alias-resolution research: signals, pipeline design, field notes | `RESEARCH-IDENTITY.md` (Layer 3) |
| Entity-resolution literature survey behind that pipeline | `ALIAS-RESOLUTION-RESEARCH.md` (Layer 3) |
| Confirmed player identity clusters, the seed data for the alias tables | `IDENTITY-SEEDS.md` (Layer 3, curated) |
| Statistical findings from the first 4-month sample (dated snapshot) | `ANALYSIS.md` |
| Gemini CLI waypoint file | `GEMINI.md` |

## Subsystem scopes

None. `api/` and `scripts/` hold code only; the rows above are their documentation.

## Working agreement

- **Query by the decoded columns.** `team_a_ascii` / `team_b_ascii` / `team_ascii` and `player_name_normalized` are lowercase ASCII; the raw QW-encoded columns exist for display only. Lowercase every tag you pass in. Shapes: `DATABASE-SCHEMA.md`.
- **The import filters define the dataset.** 4on4 team mode, 8 valid players, duration >= 600 s, `ping != 0`. `is_clan_game` separates clan matches from pickups; map filtering is yours at query time (dm2, dm3, e1m2, schloss, phantombase are the competitive five).
- **Identity is unsolved.** One human may be many `player_name_normalized` values; two names in one game are always two people. Never merge names on string similarity alone. `IDENTITY-SEEDS.md` is the only confirmed ground truth.
- **The production database is shared.** `quake_stats` lives inside the `phoenix-postgres` container, not in one of its own. Never stop that container as a phoenix chore, and never rotate the `phoenix` role's password without recreating the deployed `qw-stats-api` in the same step. Shape and locations: `OVERVIEW.md`, Integration points.
- **The live API updates itself.** `qw-stats-api` pulls new games from QWHub every 15 minutes; a restart is a visible event, not a free action. Deploy only through the `deploy` skill.
- **`api/server.js` does not load dotenv.** Scripts read `.env` through `scripts/db.js`; the server reads `PG_*` from its environment. The local run line is in `README.md`.
