# QW Stats — Roadmap & Directive

## What This Is

A player and team ranking engine for QuakeWorld 4on4, built on 18,206 games (2022-2026) in PostgreSQL. The end goal is three complementary rating systems (Stats Composite, RAPM, OpenSkill) that power player cards, team strength comparisons, matchup predictions, and "the line" (sports-betting-style frag spreads).

**Read `RESEARCH-RANKING.md` for the full methodology research.**
**Read `RESEARCH-IDENTITY.md` for the alias resolution research.**

## Current State (Feb 2026)

### Infrastructure ✅
- PostgreSQL on Unraid with 18,206 games, 145k player-game rows
- Express API live at `https://qw-api.poker-affiliate.org` (h2h, form, maps, roster)
- Import pipeline from ktxstats JSON archives
- All scripts in `qw-stats/scripts/`

### What We Learned (data exploration session)
- **2,355 unique player names** represent ~800-1,000 real people
- **58% of names** (1,358) have fewer than 5 games — mostly noise
- **91 names** have 500+ games — the core community
- **Game classification needs fixing**: current binary clan/mix misses the spectrum
  - Pure clan (both real tags): 8,164 games (45%)
  - Hybrid (clan vs mix/standin): 2,214 games (12%)
  - Pure mix (both generic): 7,828 games (43%)
- **Co-occurrence coverage is 1.6%** — powerful but sparse cannot-link signal
- **Core name extraction works** but needs refinement for edge cases
- **Community-curated seed aliases are the fastest path** to clean data

---

## The Order of Operations

### Phase 0: Identity Resolution (CURRENT — BLOCKING)
**Why first:** Ranking garbage names produces garbage rankings. Every name variant that isn't merged means split game counts, diluted stats, and wrong RAPM coefficients. We don't need 100% — 90% coverage is enough for reliable rankings.

**Approach:** Community-curated seed data + automated detection. See `IDENTITY-SEEDS.md` for confirmed aliases and `RESEARCH-IDENTITY.md` for the full pipeline design.

**Sub-steps:**
1. ✅ Build exploration tools (explore-data.js, explore-names.js, clan-rosters.js)
2. ✅ Start curating seed aliases from domain knowledge (6 clusters confirmed)
3. 🔲 Walk through top 15-20 clans, curate rosters (ParadokS identifies aliases)
4. 🔲 Persist confirmed identities to `player_identities` / `player_aliases` tables
5. 🔲 Fix game classification (add "mix", colors, t1/t2, etc. to generic list)
6. 🔲 Build automated candidate detection (core name matching + Jaro-Winkler + co-occurrence)
7. 🔲 Run automated candidates, review queue for ParadokS to confirm/reject
8. 🔲 Iterate until review queue is empty (expect 3-4 rounds)

### Phase 1: Stats Composite (HLTV-style Performance Rating)
**What:** Per-player, per-game performance score centered on 1.00. Z-score normalization of key stats with optimized weights.

**Components (from correlation analysis — needs re-validation on full dataset):**
| Component | Weight | Notes |
|-----------|--------|-------|
| Efficiency (K/D) | 0.25 | Strongest predictor (r=0.53) |
| Damage/min | 0.25 | Core offensive metric |
| Survivability (TTD) | 0.20 | Merged with armor (r=0.92 redundancy) |
| Item Control | 0.15 | RA+YA time + quad |
| Weapon Accuracy | 0.10 | SG+LG weighted, RL dropped (r=-0.08) |
| Team Damage | -0.05 | Penalty |

**Depends on:** Phase 0 (need merged identities for meaningful career averages)

### Phase 2: RAPM (Regularized Adjusted Plus/Minus)
**What:** Ridge regression on the lineup matrix. The "true" individual skill rating, teammate-adjusted.

**Key formula:** `beta_hat = (X'X + lambda*I)^(-1) * (X'Y + lambda * beta_prior)`

**Depends on:** Phase 0 (merged identities = correct lineup matrix), Phase 1 (stats composite provides the beta_prior)

**Tech:** Python + scikit-learn RidgeCV. ~200 lines.

### Phase 3: OpenSkill (Live Rating)
**What:** Online/streaming rating that updates after every game. Powers the leaderboard and matchup predictions.

**Tech:** `openskill` npm package. Performance weights from Phase 1 stats.

**Depends on:** Phase 1 (for performance weights), Phase 0 (for identity)

### Phase 4+: Future
- O-RAPM / D-RAPM split (offensive vs defensive profiles)
- Kickscore (skill-over-time curves)
- Map-specific ratings
- Player cards UI
- "The Line" (frag spread predictions)
- H2H integration into MatchScheduler

---

## Game Classification Rules

### Current (broken)
Binary `is_clan_game` based on team names not being red/blue/green/yellow/team1/team2.

### Fixed Classification
Three categories based on team names:

**Generic teams (NOT real clans):**
```
Colors: red, blue, green, yellow, pink, brown, brwn, brw, orange, oran, orng,
        violet, vio, purple, white, black, teal, gold, wine, plum, mint, snow,
        lime, sky, skyb, skyblue, bleu, grn, gree, yllw, ylw, brow
Mix: mix, mix1, mix2, m1x
Numbered: t1, t2, 1, 2, 11, 0, 000, team1, team2
Throwaway: lol, asdf, xxx, xx, x, zzz, zz, 666, 69, 99, 999, 123, 1337,
           4, 7777, 555, 98, pug, quad, pent, test, afk
```

**Classification:**
- `clan_vs_clan` — both teams have real tags → competitive data, highest signal
- `hybrid` — one side real clan, other generic/mix → practice with standins
- `pure_mix` — both sides generic → pickup games

**Clan tag aliases (same org, different tag format):**
- `-hx-` = `[hx]` (Hell Express, tag changed ~Aug 2025)
- `oeks` uses `.........axe` player name suffix (Norwegian axemen)
- More to be discovered during curation

---

## Domain Knowledge (QuakeWorld Context)

- **Milton is the GOAT** — calibration benchmark. Any ranking that doesn't put him near #1 is broken.
- **No classes/roles** — all players have identical loadouts. Differentiators are mechanical skill, positioning, map control, teamwork.
- **5 competitive maps**: dm2, dm3, e1m2, schloss, phantombase — each plays very differently.
- **20-minute continuous games** with respawns — not round-based like CS.
- **Time slots** in `.........axe` format = oeks clan naming convention.
- **Mix games happen nightly** with rotating players. Core community is ~300 active.
- **Players change names freely** — no account system. QWHub does NOT do identity resolution.
- **paniagua (103 team tags, 3,222 games)** and **anza (81 tags, 3,387 games)** are the most active mix scene players. Anza is 62 years old.
- **Team tags are fluid in mix games** — only meaningful for clan identification when `is_clan_game` context.

---

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | This file — project directive and status |
| `IDENTITY-SEEDS.md` | Confirmed player identity clusters |
| `RESEARCH-RANKING.md` | Ranking methodology research (comprehensive) |
| `RESEARCH-IDENTITY.md` | Alias resolution research (comprehensive) |
| `CLAUDE.md` | Technical reference (schema, API, scripts, connection details) |
| `ANALYSIS.md` | Statistical findings from 4-month sample |
| `scripts/explore-data.js` | Dataset overview and distributions |
| `scripts/explore-names.js` | Core name extraction + duplicate detection |
| `scripts/clan-rosters.js` | Clan roster viewer for manual curation |

---

## Working With ParadokS

- He knows the community deeply — can identify aliases on sight from clan rosters
- Curating approach: show clan roster → he calls out who's who → co-occurrence confirms
- He has multiple QW side projects, so sessions may be sporadic — persistent docs are essential
- The tools are built for interactive exploration: `--clan`, `--player`, `--co-check` flags
- Don't over-engineer — "90% result from 30% effort" is the philosophy

---

## What Works vs What Doesn't (from first session)

The RESEARCH-IDENTITY.md catalogued many approaches. After actually using them, here's what to focus on:

### Use these (proven effective)
1. **Co-occurrence gate** — Every candidate merge must pass this. Non-negotiable.
2. **Community curation via clan rosters** — Show roster, ParadokS identifies aliases. Catches what no algorithm can (realpit=medic, zamsha=shazam).
3. **Team succession** — Scanning rosters for temporal patterns (player A disappears, player B appears on same clan).
4. **Core name extraction + exact matching** — Strip clan tags, decorators, leetspeak → 118 groups found automatically.
5. **Jaro-Winkler fuzzy matching** — For near-misses the core name extraction doesn't collapse (splash/splash!, dobezz/dobez).

### Defer these (not needed at current scale)
6. **Behavioral fingerprinting** — Save for Phase 2 when tackling creative aliases the curator can't identify.
7. **Fellegi-Sunter / Leiden / Splink** — Save for Phase 3 when automating the long tail of ~300 unknown players.
8. **Phonetic matching** — Probably never needed. QW names aren't phonetic.

See RESEARCH-IDENTITY.md Section 15 for the full field notes.
