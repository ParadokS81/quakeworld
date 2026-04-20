---
name: qwhub-api
description: QWHub API for QuakeWorld match history, game stats, and player/team comparisons. Use when working with match data or QWHubService.
---

# QWHub API Integration

## Data Sources
- **Supabase**: `ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games` (Matches)
- **S3 ktxstats**: `d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json` (Stats)
- **S3 mapshots**: `a.quake.world/mapshots/webp/{size}/{map}.webp`

## Critical Constraints
- **LOWERCASE Team Names**: Always `.toLowerCase()` tags before querying Supabase.
- **Set Limits**: Always use `&limit=` (e.g., `limit=10`) on Supabase queries.
- **Filter Bogus Players**: Ignore players with `ping === 0`.
- **ASCII Conversion**: Normalize QW-encoded names using `qwToAscii()` for matching.

## Stat Formulas
- **Efficiency**: `kills / (kills + deaths) * 100`
- **Accuracy**: `hits / attacks * 100` (SG, RL, LG)

For full schema and rendering details (Scoreboards, Colors), refer to `.claude/skills/qwhub-api/SKILL.md`.
