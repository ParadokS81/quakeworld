# Vision - QW Stats

## The problem

QuakeWorld has 30 years of competitive history and almost zero durable player statistics. Demos live on `hub.quakeworld.nu` with their ktxstats summaries; matches happen; players brag or commiserate in Discord; nothing gets compiled into anything you can query. There's no "Elo rating for QW 4on4," no "Milton is ranked #3 on dm2 this season," no "book has beaten oeks 7 out of 10 times on schloss in the last six months." The community has accepted this void for decades.

The qw-stats data foundation - 18,206 4on4 games from the ktxstats archive imported into PostgreSQL with full per-player damage, accuracy, item control, and survivability stats - was built so those questions become answerable. The eventual ranking system built on top is the headline feature, but the foundation itself already serves MatchScheduler's head-to-head pages and any future tool that wants to ask "what happened in competitive QW."

## The sniff-test problem (why this is hard)

A ranking algorithm that ships broken is worse than no ranking. If the algorithm puts a journeyman on top of the list, players dismiss the entire system, and the next honest attempt has to dig out of that hole. The sniff test - "does the ranking reflect who actually wins matches in this community" - is the ground truth. If Milton (undisputed 4on4 GOAT, decades of dominance) doesn't land near the top, the algorithm is broken regardless of how mathematically sound it is.

Initial analysis established a composite rating across efficiency (K/D), average damage given, taken-to-die (survivability/armor), armor control time, rocket-launcher accuracy, shotgun accuracy, enemy weapon damage, and a small team-damage penalty. Correlation analysis against win rates then forced weight adjustments: taken-to-die and armor-control time were r=0.92 (nearly identical, should merge), SG accuracy barely predicted winning (r=0.12, reduce weight), RL accuracy was slightly negative (r=-0.08, rethink), and efficiency was the strongest single predictor (r=0.53, possibly increase weight). The sniff test is the integration test; the correlation matrix is the unit test.

## The identity-resolution blocker

QuakeWorld has no account system. Players pick their in-game name each session; they change it between matches; they play for multiple clans over the same month; they use shared aliases. The raw dataset shows 2,355 unique player-name strings across 18,206 games. The actual number of humans behind those strings is estimated at 800-1,000. Every one of those humans ends up in the ranking table; every one of those 2,355 strings might not resolve to the right human.

Identity resolution is Phase 0 of the roadmap. Until identity is solved well enough to trust, ranking output is unreliable: two names that should be merged become two ranked entries; two names that should be separate become one entry that averages out. The research (see `RESEARCH-IDENTITY.md`, `ALIAS-RESOLUTION-RESEARCH.md`, `IDENTITY-SEEDS.md`) is extensive but the pipeline isn't shipped. This is the blocker that has kept the project in Paused status.

## What this is

Two products, one data foundation.

- **The ranking product (in development).** Per-player and per-team rankings, overall and per-map, across the full dataset and recent-form windows. Built on the composite rating, calibrated against the sniff test, cut by map (dm2 / dm3 / e1m2 / schloss / phantombase). The current deep-research is into how much of winning is actually predictable from player-level stats vs. how much is matchup-specific or team-chemistry-specific; RAPM (regularized adjusted plus-minus) and OpenSkill are on the research shortlist.
- **The stats API (shipped).** A lightweight Express service running on ParadokS's Unraid server that serves head-to-head, form, per-map stats, and roster queries to MatchScheduler's match pages. Deployed via Docker, reached via Tailscale. Not glamorous; very useful; already doing real work in the community.

The data foundation is the same SQL: one `games` table (18,206 rows) and one `game_players` table (8 rows per game, ~146K rows). Both products read from it.

## Who it's for

- **MatchScheduler users** (today) - consume the H2H/form/maps/roster API without knowing qw-stats exists. "What happened last time book played oeks on dm2" is a one-click answer on the match page.
- **Competitive players** (eventual ranking users) - want a credible "who's playing well right now" view. The sniff test community (the ~30 players who would immediately notice if the ranking was wrong) is the calibration panel.
- **Tournament organizers** - seeding bracket tournaments is currently guesswork. A credible ranking makes bracket seeding defensible.
- **Data-curious community members** - the import scripts and clan-roster tools are already community-usable for alias hunting and team archaeology.

## Design intent

- **Open dataset, closed API.** The raw 4on4 ktxstats archive ships in the GitHub Releases as `4on4_json.zip`. Anyone can clone the repo, spin up Postgres, import, and explore. The production API endpoints are closed only to the extent that the Unraid server is private; the data itself is public. This is a community scene, not a product.
- **PostgreSQL, not SQLite, for production.** Early scripts used SQLite; full import was slow and joins were limited. The switch to Postgres 16 was driven by query complexity and the desire to use window functions and materialized views for the ranking pipeline.
- **QWHub is the upstream.** vikpe maintains the ktxstats archive and the Supabase-backed match index that powers `hub.quakeworld.nu`. qw-stats is downstream: we pull from that archive and from the Supabase REST endpoint for keeping fresh. We do not own that data source.
- **Docker + Tailscale for prod.** The API runs in a Docker container on ParadokS's Unraid box. Tailscale exposes the private IP to MatchScheduler's Cloud Functions for server-to-server calls. Zero cloud bill; zero public attack surface.

## Non-goals

- **Not a live score ticker.** QWHub already fills that niche with real-time match indexing. qw-stats batch-imports; it does not try to broadcast.
- **Not a replacement for QWHub.** hub.quakeworld.nu is the canonical match archive and demo distribution point. qw-stats enriches it; it does not try to subsume it.
- **Not a player-career tracker.** The dataset is 2022-present; older games are out of scope. A "Milton career stats 1998-2020" product would need a different archive and is explicitly not this project.
- **Not a ranking authority.** When the ranking ships, it's a credible data-driven viewpoint, not a formal league system. Tournaments and leagues run on their own rules; qw-stats provides inputs.

## Values

- **Sniff test > p-values.** If the community says the ranking is wrong, the ranking is wrong - regardless of what the correlation matrix says. The calibration group is small and opinionated; use it.
- **Ship the useful part early.** The API was shipped well before the ranking because it could be. Don't block secondary deliverables on headline deliverables.
- **Identity resolution is real research.** Do not cargo-cult a fuzzy string match and ship broken. The community recognizes each other instantly and will notice every mis-merge.
- **Respect the upstream.** vikpe and QWHub are doing the hard data-collection work. Our job is to add value, not duplicate or compete.
