# QW 4on4 Stats — Analysis & Findings

## Dataset Overview

### Full Dataset (PostgreSQL — LIVE)

**Source**: Full ktxstats archive from vikpe (QWHub maintainer) — `4on4_json.zip`
**Database**: PostgreSQL on Unraid (`quake_stats`) — see `CLAUDE.md` for connection details

| Metric | Value |
|--------|-------|
| Total 4on4 games | 18,206 |
| Clan games | 9,868 (54%) |
| Mix/pickup games | 8,338 (46%) |
| Unique players | 2,355 |
| Date range | Jan 2022 → Feb 2026 (4 years) |

### Game Distribution by Map (Full Dataset)
| Map | Total | Clan |
|-----|-------|------|
| dm2 | 4,811 | 2,376 |
| dm3 | 4,482 | 2,167 |
| schloss | 3,760 | 1,929 |
| e1m2 | 2,919 | 1,769 |
| phantombase | 931 | 673 |

### Legacy Sample (SQLite — still available for reference)

The analysis findings below (correlations, distributions, archetypes, rankings) are based on the **4-month sample** (May-Sep 2025, 1,937 games, 177 qualified players). These need to be **re-run on the full 4-year dataset** in PostgreSQL to validate whether patterns hold at scale.

| Metric | Value |
|--------|-------|
| Comp 4on4 games | 1,937 |
| Clan 4on4 games | 660 (34%) |
| Unique players | 529 |
| Qualified players (15+ games) | 177 |
| Date range | 2025-05-16 → 2025-09-07 |

---

## Stat Distributions (177 players, 15+ comp 4on4 games — 4-month sample)

> **⚠ Based on 4-month sample.** Needs re-running on full 4-year PostgreSQL dataset.

### Percentile Breakdown

| Stat | p10 | p25 | p50 (median) | p75 | p90 | p99 |
|------|-----|-----|-------------|-----|-----|-----|
| Efficiency % | 37.8 | 44.4 | 48.1 | 52.0 | 57.0 | 64.2 |
| Avg Damage | 6,586 | 7,816 | 8,591 | 9,366 | 10,126 | 12,613 |
| Taken-to-Die | 138.5 | 148.2 | 158.1 | 169.7 | 182.4 | 221.5 |
| SG Accuracy % | 32.7 | 35.8 | 38.4 | 42.5 | 46.9 | 51.7 |
| RL Accuracy % | 11.2 | 12.2 | 12.9 | 14.3 | 15.4 | 17.4 |
| RA Time (sec) | 133 | 172 | 216 | 245 | 294 | 369 |
| YA Time (sec) | 212 | 242 | 270 | 299 | 326 | 384 |
| Enemy Wpn Dmg | 2,035 | 2,474 | 2,750 | 3,118 | 3,337 | 3,834 |
| Team Damage | 273 | 312 | 362 | 418 | 490 | 559 |
| Win Rate % | 38.5 | 42.4 | 51.0 | 56.3 | 64.7 | 75.0 |

### Interpretation Guide
- **Efficiency 50%** = exactly average. Above 55% is strong. Above 60% is elite.
- **Avg Damage 9,000+** = high output player. 10,000+ is top tier. Milton averages 12,755.
- **TTD 160** = average survivability. Above 180 indicates strong positioning/armor control.
- **SG 38%** = median accuracy. Above 45% is excellent aim.
- **RL 13%** = median direct hit rate. Above 15% is strong.
- **Win Rate 51%** = average. Above 60% = consistently on winning teams.

---

## Correlation Matrix (4-month sample)

> **⚠ Based on 4-month sample.** Needs re-running on full 4-year PostgreSQL dataset.

```
                 Eff   Dmg   TTD   SG%   RL%  Armr  EWep  TDmg  Win%  Frag
Eff             1.00  0.86  0.88  0.41 -0.33  0.88  0.79  0.55  0.53  0.89
Dmg             0.86  1.00  0.61  0.55 -0.30  0.70  0.93  0.60  0.42  0.98
TTD             0.88  0.61  1.00  0.20 -0.31  0.92  0.60  0.48  0.45  0.65
SG%             0.41  0.55  0.20  1.00  0.04  0.25  0.53  0.07  0.12  0.55
RL%            -0.33 -0.30 -0.31  0.04  1.00 -0.37 -0.38 -0.35 -0.08 -0.29
Armr            0.88  0.70  0.92  0.25 -0.37  1.00  0.70  0.55  0.49  0.71
EWep            0.79  0.93  0.60  0.53 -0.38  0.70  1.00  0.57  0.24  0.88
TDmg            0.55  0.60  0.48  0.07 -0.35  0.55  0.57  1.00  0.22  0.56
Win%            0.53  0.42  0.45  0.12 -0.08  0.49  0.24  0.22  1.00  0.47
Frag            0.89  0.98  0.65  0.55 -0.29  0.71  0.88  0.56  0.47  1.00
```

### Key Correlation Insights

**Strongest predictors of winning (correlation with Win Rate):**
1. Efficiency: r=0.53 (MODERATE) — best single predictor
2. Armor Control: r=0.49 (MODERATE) — map control matters
3. Taken-to-Die: r=0.45 (MODERATE) — survivability
4. Avg Damage: r=0.42 (MODERATE) — raw output
5. Enemy Wpn Dmg: r=0.24 (WEAK)
6. Team Damage: r=0.22 (WEAK)
7. SG Accuracy: r=0.12 (NONE) — aim alone doesn't win
8. RL Accuracy: r=-0.08 (NONE/NEGATIVE)

**Critical redundancies:**
- **TTD ↔ Armor: r=0.92** — Nearly identical signals. A player with high TTD almost always has high armor control. These measure the same underlying skill (map control / survivability). Rating should use ONE of these, not both at full weight.
- **Damage ↔ Frags: r=0.98** — Almost perfectly correlated. Using both is pure double-counting.
- **Damage ↔ Enemy Wpn Dmg: r=0.93** — Enemy weapon damage is a subset of total damage.

**Surprising findings:**
- **SG accuracy barely matters for winning** (r=0.12). Good aim without positioning/map control doesn't translate to wins.
- **RL accuracy is slightly NEGATIVE** (r=-0.08). Hypothesis: weaker players spam RL at close range (higher hit% but bad play), while better players use it at proper distance (lower hit% but more effective).
- **Team damage positively correlates with damage output** (r=0.60). High-damage players inevitably do more team damage too — it's a byproduct of aggression, not carelessness. The penalty should be modest.

---

## TTD Quartile Analysis

Players split into 4 groups by Taken-to-Die:

| Quartile | TTD Range | Avg Eff% | Avg Dmg | Avg SG% | Avg RL% | Armor Time | Win% |
|----------|-----------|----------|---------|---------|---------|------------|------|
| Q1 (lowest) | 114-148 | 39.7% | 7,224 | 37.0% | 14.1% | 365s | 44.8% |
| Q2 | 148-158 | 46.6% | 8,528 | 40.3% | 13.2% | 461s | 47.7% |
| Q3 | 158-169 | 49.0% | 8,585 | 38.0% | 12.7% | 512s | 52.3% |
| Q4 (highest) | 169-218 | 55.9% | 9,591 | 40.5% | 12.9% | 588s | 55.8% |

**Interpretation**: TTD shows a clear linear progression — higher TTD correlates with better everything EXCEPT RL accuracy (which goes slightly down) and SG accuracy (roughly flat). This confirms TTD is a strong "meta-skill" indicator but highly redundant with armor control (r=0.92).

---

## Player Archetypes (from independence analysis)

The data reveals distinct player types where stats don't all move together:

### "Efficient but passive" — High Eff, Low Damage
Players like `duce` (62% eff, p98 but only p29 damage). They don't die but also don't deal much damage. Safe, conservative play. Often still win (duce: 69% win rate) because not dying is valuable in 4on4.

### "Aggressive but reckless" — Low Eff, High Damage
Players like `tim` (45% eff, p31 but p77 damage). High output but die a lot. The entry fraggers / aggressive RL players who trade kills frequently.

### "Individually strong, team losing" — High stats, Low Win%
Players like `Mortuary` (63% eff, p97 TTD, but 43% win rate). Great individual stats but consistently on losing teams. Could indicate: playing in a weaker region, weak teammates, or stats inflated by playing against weak opposition.

### "Sharp aim, low output" — High SG%, Low Damage
Players like `aki` (48% SG accuracy, p96 but only p32 damage). Great mechanical aim but not converting it into damage output. Possibly passive or poor positioning.

### "Controlling but losing" — High Armor, Low Win%
Players like `bliXem` (p100 armor control, but 46% win). Dominating item control individually but still losing games. Suggests armor control alone isn't enough without team coordination.

---

## Current Top 10 (Composite Rating — 4-month sample)

> **⚠ Based on 4-month sample.** Rankings will change significantly with full 4-year dataset.

| # | Player | Rating | Games | Eff% | AvgDmg | TTD | SG% | RL% | Win% |
|---|--------|--------|-------|------|--------|-----|-----|-----|------|
| 1 | Mortuary | 87.5 | 21 | 62.7 | 9,810 | 243 | 46.1 | 14.5 | 43% |
| 2 | Milton | 87.3 | 129 | 65.3 | 12,755 | 218 | 41.8 | 13.1 | 59% |
| 3 | sailorman | 86.9 | 426 | 54.8 | 10,072 | 169 | 51.7 | 17.0 | 55% |
| 4 | realpit | 86.3 | 145 | 64.0 | 10,802 | 222 | 39.0 | 13.7 | 62% |
| 5 | chr1s | 86.2 | 58 | 61.1 | 11,301 | 170 | 49.6 | 14.4 | 59% |
| 6 | sane | 85.9 | 58 | 57.6 | 11,436 | 170 | 49.1 | 15.7 | 57% |
| 7 | bogojoker | 85.8 | 97 | 61.8 | 12,613 | 190 | 53.3 | 12.6 | 65% |
| 8 | phren_of_wine | 82.0 | 18 | 58.4 | 10,873 | 191 | 40.0 | 11.8 | 56% |
| 9 | raekwon | 81.4 | 19 | 56.4 | 9,992 | 185 | 38.9 | 14.7 | 74% |
| 10 | mutilator | 81.0 | 21 | 64.2 | 10,196 | 218 | 38.3 | 12.5 | 62% |

**Issues with current rankings:**
- Mortuary (#1) has only 21 games and 43% win rate — small sample inflation
- Several top-10 players have < 25 games — need higher threshold
- Milton should be #1 undisputed with 129 games
- TTD + Armor double-counting inflates players with high survivability

---

## Per-Map Leaders (by avg damage, min 10 games)

### dm2 — Highest damage map
1. Milton (15,123 avg dmg, 33 games) — absolute dominance
2. bogojoker (14,152, 24 games)
3. sane (13,438, 17 games)

### dm3 — Classic map
1. chr1s (10,821, 24 games)
2. Milton (10,269, 28 games)
3. sane (9,833, 14 games)

### e1m2 — Tight corridors
1. bogojoker (11,913, 19 games)
2. Milton (11,574, 19 games)
3. chr1s (10,893, 14 games)

### schloss — Open layout
1. bogojoker (14,338, 30 games)
2. Milton (13,722, 35 games)
3. gosciu (12,621, 26 games)

### phantombase — Least played
1. Milton (11,325, 14 games)
2. Xunito (10,012, 13 games)
3. irn (9,206, 16 games)

**Milton is #1 or #2 on every single map.**

---

## Database Schema

See `CLAUDE.md` for the full PostgreSQL schema (primary) and connection details.
The legacy SQLite schema (`qw-stats/data/qw-stats.db`) is only used by old analysis scripts.

---

## Pending Improvements

### Data
- [x] Get full archive from vikpe — DONE (18,206 4on4 games, Jan 2022 - Feb 2026)
- [x] Import to PostgreSQL — DONE
- [ ] **Re-run analysis** on full 4-year PostgreSQL dataset (all findings above are from 4-month sample)
- [ ] Fix player name normalization (strip QW decoration chars, build manual alias table)

### Algorithm
- [ ] Merge TTD + Armor into single "survivability" factor (r=0.92 redundancy)
- [ ] Reduce SG accuracy weight (r=0.12 with winning)
- [ ] Remove or rethink RL accuracy (negative correlation)
- [ ] Increase minimum games to 25-30 for ranking legitimacy
- [ ] Implement ELO/Glicko-2 track (win-loss based)
- [ ] Add map-specific percentile normalization
- [ ] Consider game recency weighting (recent games matter more)

### Features
- [ ] Create SQL views for H2H queries (team form, map stats, roster, opponent breakdown)
- [ ] Build sync script (poll Supabase API for new games)
- [ ] Build API layer (Express service on Unraid)
- [ ] Team strength calculator (sum of player ratings per lineup)
- [ ] Matchup predictor (Team A vs Team B expected frag differential)
- [ ] Line calculator (predicted spread)
- [ ] Player card generator
- [ ] Integration with MatchScheduler H2H tab
