# QW Stats Gemini Guidelines

## Purpose
Build a data-driven ranking engine for QuakeWorld players and teams. The "Milton calibration" is our benchmark—if Milton isn't near the top, the algorithm is broken.

## Technical Rules
- **PostgreSQL**: Always use the ASCII-normalized columns (`team_a_ascii`, `player_name_normalized`) for queries and matching.
- **Weights**: Efficiency (K/D) is the strongest predictor (0.20 weight). TTD and Armor control are also key.
- **Identity**: Player identity resolution (alias mapping) is the biggest challenge. Refer to `IDENTITY-SEEDS.md`.
- **Filters**: Ignore players with `ping === 0`.
- **Maps**: ratings are map-specific (dm2 vs dm3 vs schloss).

## Database
- Host: `100.114.81.91` (Tailscale VPN required)
- Port: `5432`
- Database: `quake_stats`
- User: `phoenix`

## Methodology
- **Composite Rating**: Efficiency (0.2), Damage (0.2), TTD (0.15), Armor (0.15), RL/SG Acc (0.1), Team Dmg (-0.05).
- **H2H**: Always set `&limit=` on Supabase queries. Use lowercase team tags.
