# Research: Ranking Methods for QuakeWorld 4on4

## Context

We have 18,206 4on4 games (Jan 2022 -- Feb 2026), 2,355 unique player names, full per-player ktxstats (frags, kills, deaths, damage, weapon accuracy, armor control, survivability, item pickups). QuakeWorld 4on4 is a pure team FPS -- no classes, no abilities, identical loadouts. The differentiators are mechanical skill, positioning, map control, and teamwork. Closer to basketball than to Overwatch.

**The Milton Test**: Any ranking system must put Milton at or near #1. He's the undisputed GOAT -- #1 or #2 on every map by damage, 65% efficiency, 12,755 avg damage, 59% win rate across 129 games in the 4-month sample alone.

**Key data characteristics**:
- Heavily skewed participation: some players have 500+ games, many have <10
- Average ~30-60 games per active player (18k games x 8 players / 2,355 unique)
- 5 competitive maps that play very differently (dm2, dm3, e1m2, schloss, phantombase)
- Mix/pickup games (46%) vs clan games (54%) -- different competitive contexts
- No rounds -- continuous 20-minute gameplay with respawns

---

## 1. HLTV Rating 2.0 (CS:GO/CS2)

### How It Works

The gold standard for FPS stats-based player rating. Produces a single number centered on 1.00 (average). Uses **standard-deviation-from-mean normalization** rather than simple ratios -- measuring how many sigma above/below average each stat is.

### The Five Components

| Component | What It Measures | CS:GO Basis |
|-----------|-----------------|-------------|
| **Kill Rating** | Kills per round, with reduced credit for cleanup kills (<60 dmg dealt) | Lethal output |
| **Survival Rating** | Deaths per round (inverted), with traded deaths penalized less | Staying alive |
| **KAST Rating** | % of rounds with a Kill, Assist, Survived, or Traded | Consistency / participation |
| **Impact Rating** | Multi-kills, opening kills, 1vX clutches | Round-deciding plays |
| **Damage Rating** | Average damage per round (ADR) | Raw damage output |

Each component is calculated **per side** (CT/T) using side-specific means and standard deviations, then combined proportional to rounds played on each side. The five scores are combined with fixed (secret) weights.

### Key Design Decisions

- **Formula is secret** (unlike Rating 1.0) to prevent gaming the system
- **No opponent strength adjustment** -- a 1.30 vs tier-3 teams = 1.30 vs top-5 teams
- **No win/loss component** -- purely individual stats
- Community reverse-engineering suggests balanced weights across all 5 components (R-squared of 0.95-0.99 achieved)

### Rating 1.0 (for Reference)

The predecessor was publicly documented:
```
Rating 1.0 ~ (KillRating + 0.7 * SurvivalRating + RoundsWithMultipleKillsRating) / 2.7
```
Only 3 components, no assists, no opening kills, no ADR, no side-specific calculation. Systematically underrated support players.

### Criticisms of Rating 2.0

- Passive/baiting playstyles still rewarded (high KAST + Survival without enabling team)
- Utility/tactical value invisible (smokes, flashes get zero credit)
- IGL (in-game leader) penalty -- strategists rate lower
- Eco-round kills weighted equally to full-buy kills
- No map normalization (some maps produce higher ADR structurally)
- No opponent strength adjustment within the formula itself

### Adaptation to QuakeWorld

**What transfers directly:**
- Standard-deviation normalization approach (game-agnostic, statistically sound)
- Kill/Damage Rating concepts map directly to QW frags/damage
- Impact concept could work for multi-kill sequences in QW teamfights

**What needs rethinking:**
- No CT/T sides in QW -- drop side-specific calculation entirely (simplification)
- No rounds -- normalize by **time** (per-minute rates) instead of per-round
- KAST can't work as-is (no rounds to evaluate). Replace with a "contribution rate" metric
- Respawns change death economics -- deaths in QW are less costly than CS:GO deaths
- **Item control** is a massive QW skill dimension absent from CS:GO -- needs its own component (quad, pent, mega, armor pickup/control time)

### QW-Adapted HLTV-Style Rating

```
QW_StatsRating = w1 * z(efficiency)
              + w2 * z(damage_per_min)
              + w3 * z(survivability)        # TTD or merged TTD+Armor
              + w4 * z(item_control)          # RA+YA time + quad/pent
              + w5 * z(weapon_accuracy)       # SG + LG weighted, RL deprioritized
              - w6 * z(team_damage_per_min)   # penalty
```

Where z(x) = (x - population_mean) / population_stdev -- how many standard deviations above/below average.

Find optimal weights by regressing against win probability on historical data.

---

## 2. Glicko-2

### How It Works

A Bayesian rating system tracking three parameters per player:

| Parameter | Default | Purpose |
|-----------|---------|---------|
| **Rating (r)** | 1500 | Estimated skill level |
| **Rating Deviation (RD)** | 350 | Uncertainty -- high = unsure, low = confident |
| **Volatility (sigma)** | 0.06 | How much true skill fluctuates over time |

The key insight: **RD naturally handles inactive players**. When a player doesn't play, RD increases (growing uncertainty). When they return, first games cause larger swings. No separate "time decay" hack needed.

### Algorithm Summary (8 Steps)

Games are processed in **rating periods** (batches). Within a period, ratings are fixed. After, all three parameters update simultaneously:

1. **Convert to internal scale**: mu = (r - 1500) / 173.7178, phi = RD / 173.7178
2. **Expected score** against each opponent: E = 1 / (1 + exp(-g(phi_j) * (mu - mu_j))) where g(phi) dampens based on opponent uncertainty
3. **Estimated variance** (v) from the set of opponents faced
4. **Estimated improvement** (delta) from actual results vs expectations
5. **Volatility update** via iterative root-finding (Illinois method) -- the complex part
6. **Pre-rating RD**: phi_star = sqrt(phi^2 + sigma'^2) -- uncertainty grows with volatility
7. **New phi and mu**: update incorporating variance and game outcomes
8. **Convert back**: r' = 173.7178 * mu' + 1500

For QW, weekly or bi-weekly rating periods would be reasonable.

### Team Game Adaptation (4v4)

Glicko-2 was designed for 1v1. Three adaptation approaches:

**A. Composite Opponent (simplest):**
- Each player plays "against" the opposing team's average rating
- Team composite RD = sqrt(sum of RD^2) / 4
- All 4 winners get the same update magnitude
- Pros: Preserves Glicko-2 math exactly
- Cons: No individual differentiation within a team

**B. All-Pairs (more granular):**
- Each winning player "beats" each losing player = 16 virtual matchups per game
- Pros: More information per game
- Cons: Inflates "games played," needs scaling factor (divide by 4)

**C. Performance-Weighted (custom extension):**
- Same as A but multiply the score by a performance weight from in-game stats
- Top fragger gets s=1.0, bottom gets s=0.7
- Non-standard but addresses the key weakness

### Convergence

~25-40 games in 4v4 with composite opponent. Players with <25 games will have high RD (wide confidence intervals), which is honest behavior.

### Unique Advantage

**Volatility tracking** -- only Glicko-2 has this among the systems considered. It captures whether a player's skill is stable or erratic, useful for a 4-year dataset where players improve, decline, and return from breaks. Neither TrueSkill nor OpenSkill track volatility.

---

## 3. TrueSkill / TrueSkill 2

### TrueSkill (Microsoft, 2005)

Two parameters per player: **mu** (mean skill, default 25) and **sigma** (uncertainty, default 8.33). Display rating = mu - 3*sigma (conservative estimate, 99.7% confidence floor).

**Designed for team games from the ground up.** Uses a factor graph with Bayesian message passing through 5 layers:

1. **Prior**: Each player's current (mu, sigma) as a Gaussian belief, widened by tau
2. **Performance**: Actual performance drawn from N(skill, beta^2) -- beta = per-game noise
3. **Team summation**: Team performance = sum of individual performances
4. **Team difference**: Difference between team performances computed
5. **Outcome comparison**: Observed win/loss constrains the team difference

**Critical limitation**: Within a single game, TrueSkill **cannot** distinguish individual contributions. If 4 players always play together, it cannot tell which is better. Individual differentiation relies entirely on lineup variation across games -- the system "triangulates" by observing how team performance changes when the roster changes.

**4v4 convergence**: ~46 games (from Microsoft's documentation).

| Format | Games to Converge |
|--------|-------------------|
| 1v1 | ~12 games |
| 2v2 | ~20 games |
| **4v4** | **~46 games** |
| 8v8 | ~91 games |

### TrueSkill 2 (Microsoft, 2018)

Three key innovations:
1. **Individual statistics integration** -- uses per-player scores to weight contributions within a team (the missing piece from TrueSkill 1). "Much faster at figuring out the skill of a new player."
2. **Squad offset** -- models synergy bonus from playing with familiar teammates
3. **Experience effects** -- models improvement over a player's first N games

Deployed in Gears of War 4, Halo 5, Halo Infinite, Forza Motorsport.

**TrueSkill 2 is proprietary.** No public implementation. The 2018 paper (MSR-TR-2018-8) describes the model but Microsoft hasn't released code.

---

## 4. OpenSkill (Weng-Lin)

### What It Is

An open-source (MIT) alternative to TrueSkill based on the 2011 JMLR paper by Weng & Lin. Same (mu, sigma) model but with **closed-form update equations** instead of factor graphs -- simpler, faster, comparable accuracy.

### Available Models

| Model | Best For | Notes |
|-------|----------|-------|
| **Plackett-Luce** (default) | k >= 3 teams, scales well | Fastest |
| **Bradley-Terry Full** | Highest accuracy | Full pairwise comparisons |
| **Thurstone-Mosteller Full** | Most similar to TrueSkill | Gaussian distribution |

"Full" models do full pairwise comparisons between all teams. "Part" models use partial pairing for efficiency.

### Key Features for QW

- **Weight support**: Feed per-player stats (frags, damage) as weights to differentiate contributions within a team -- achieving TrueSkill 2-like behavior without the proprietary algorithm
- **Score margins**: Can use frag differential as additional signal beyond binary win/loss
- **JavaScript implementation** (`openskill` on npm) -- fits directly into a Node.js backend
- **20x faster** than TrueSkill implementations (~23,500 vs ~2,960 ops/sec)
- **Open source, MIT license**
- **No built-in inactivity decay** -- must manually inflate sigma for inactive players

### Convergence

~20-30 games in 4v4 with weights. Without weights, similar to TrueSkill (~46 games).

### Usage Example

```javascript
const { rate, ordinal } = require('openskill');

// After each game:
const team1 = players.team1.map(p => [p.rating]);
const team2 = players.team2.map(p => [p.rating]);

// Performance weights from stats
const weights1 = players.team1.map(p => computeWeight(p.stats));
const weights2 = players.team2.map(p => computeWeight(p.stats));

const [newTeam1, newTeam2] = rate([team1, team2], {
    rank: [1, 2],  // team1 won
    weights: [weights1, weights2]
});
```

---

## 5. Sports Analytics Parallels

### 5.1 BPM -- Box Plus/Minus (Basketball)

**What it is**: Estimates a player's contribution in points above league average per 100 possessions, using only box score stats.

**How it works**:
1. **Position-dependent regression** -- same stat gets different weight depending on position (assists from a center are more surprising/predictive than from a point guard)
2. **Team adjustment** -- raw BPM values for all players on a team are normalized so they sum to the team's actual efficiency margin. If team net rating is -5.0 and raw BPMs sum to -2.0, every player's BPM shifts down by 3.0. This is the crude but effective way it handles "good player on bad team."
3. **Calibrated against RAPM** -- coefficients were derived by regressing box score stats against 5-year RAPM datasets spanning 1996-2016

**QW relevance**: Directly adaptable. We can build a "QW BPM" from per-game stats, calibrated against lineup-based analysis (RAPM). No positions in QW simplifies the model.

### 5.2 VORP -- Value Over Replacement Player

Converts BPM (a rate stat) into cumulative value:
```
VORP = (BPM - Replacement_Level) * (% of team games played) * (team games / season)
```

Replacement level = -2.0 BPM (a freely available fill-in player). Captures both quality AND availability -- a great player who plays 100 games is more valuable than a slightly better player who plays 30.

**QW relevance**: Essential for the "Player Card" concept. A player's cumulative value (VORP equivalent) measures total impact across a season, not just per-game rate. Useful for identifying MVPs and distinguishing volume contributors from occasional standouts.

### 5.3 RAPM -- Regularized Adjusted Plus/Minus (The Gold Standard)

**This is the single most important method for our use case.**

RAPM uses **ridge regression on lineup data** to isolate each player's individual contribution to team scoring margin, controlling for who they played with AND against.

#### The Mathematical Formulation

```
Y = X * beta + epsilon
```

- **Y**: Vector of frag differentials (one per game, Team1_frags - Team2_frags). 18,206 entries.
- **X**: Design matrix (18,206 rows x 2,355 columns). For each game: +1 for Team1 players, -1 for Team2 players, 0 for everyone else. Each row has exactly 8 non-zero entries. The matrix is 99.66% zeros (sparse).
- **beta**: Vector of player ratings (what we solve for)
- **epsilon**: Error term

#### Why Ordinary Least Squares Fails

Players who always play together create **multicollinearity** -- their columns are nearly identical, making X'X near-singular. Even when technically invertible, small perturbations cause wildly different coefficient estimates.

#### Ridge Regression Solution

```
beta_hat = (X'X + lambda*I)^(-1) * X'Y
```

The penalty lambda*I:
- **Guarantees invertibility** (smallest eigenvalue >= lambda)
- **Shrinks estimates toward zero** -- players with many games resist shrinkage; players with few games get pulled toward average (appropriate)
- **Handles multicollinearity** -- teammates who always play together get similar ratings (honest -- we can't distinguish them)

Choose lambda via 5-fold cross-validation. For NBA data (~1,230 games, ~450 players), lambda ~1000 is typical. Our ratio (7.9:1 observations/parameters) is much more favorable than NBA's (~2.7:1).

#### Why This Solves the Milton Problem

The regression observes thousands of overlapping lineup comparisons:
- Milton + Commandos teammates -> margin +X
- Milton + Book teammates -> margin +Y
- Commandos teammates without Milton -> margin +Z
- Book teammates without Milton -> margin +W

Through these overlapping observations, it triangulates Milton's individual contribution (beta_milton) separate from his teammates'. His consistent positive impact regardless of lineup produces a high, stable beta.

#### Offensive and Defensive Split

Build separate models:
- **O-RAPM**: Response = Team1's frags (how many frags does a team score when this player is present?)
- **D-RAPM**: Response = Team2's frags (how many frags does the opponent score? Lower = better defense)

Distinguishes fraggers (high O-RAPM, average D-RAPM) from "suppressive" players (average O-RAPM, low D-RAPM).

### 5.4 RAPTOR -- The Hybrid (FiveThirtyEight)

Combines a **box component** (stats prediction of impact) with an **on-off component** (lineup evidence). Key insight: use box score data as a strong prior, update with lineup evidence. Neither component alone is as good as the combination.

The box component receives more weight early (less data, stats are more stable). As the season progresses and lineup data accumulates, the on-off weight increases.

**Maps directly to our recommended approach**: Stats-based QW rating as the prior, RAPM as the ground truth.

### 5.5 Baseball WAR -- The Modular Framework

WAR sums independent dimensions into a single number:
```
WAR = Batting + Baserunning + Fielding + Positional_Adj + Replacement_Level
```

All components measured in the same unit (runs), enabling addition. The **replacement level** concept is key -- comparing against the freely available fill-in, not the average.

**QW adaptation**: Component-based rating where each dimension (fragging, survivability, item control, damage) is measured in the same unit (contribution to frag margin) and summed.

### 5.6 Soccer xG -- Process vs Outcome

Separates "what should have happened" (expected goals based on shot quality) from "what did happen" (actual goals). xA (Expected Assists) credits the passer even if the shooter misses.

**QW adaptation**: Model "expected frags" from damage dealt, weapon accuracy, positioning. A player who consistently creates high-damage situations is valuable even if teammates get finishing frags.

---

## 6. Academic Work on Esports Ranking

### Key Papers

**"Behavioral Player Rating in Competitive Online Shooter Games"** (Dehpanah et al., 2022, CSC'22)
- Engineers features from in-game shooter stats to create "behavioral ratings" that outperform win/loss systems at predicting true player skill. Closest academic match to our use case.

**"Evaluating Team Skill Aggregation in Online Competitive Games"** (Dehpanah et al., 2021, IEEE CoG)
- Tested team skill aggregation across 100,000+ matches using Elo, Glicko, TrueSkill. Key finding: **MAX aggregation** (team strength = best player) outperformed AVERAGE and SUM -- suggesting a "star player carry" effect. For QW with identical loadouts, both MAX and AVERAGE should be tested.

**"PandaSkill -- Player Performance and Skill Rating in Esports"** (De Bois et al., 2025)
- Applied to League of Legends. Pipeline: (1) ML model predicts per-player performance score from stats, (2) uses that score as outcome variable in OpenSkill rather than raw win/loss. Rates players on individual performance, directly addressing the "carried by teammates" problem. QW's lack of roles simplifies step 1 to a single model.

**"Beyond Winning: MOVDA"** (Shorewala & Yang, 2025)
- Uses margin of victory deviation from expectation rather than binary win/loss. Models expected margin as scaled tanh of rating differential (capturing saturation). **13.5% faster convergence**, 1.54% lower Brier score than TrueSkill on 13,619 NBA games. Directly applicable -- QW frag differentials carry meaningful information.

**"Pairwise Comparisons with Flexible Time-Dynamics" (Kickscore)** (Maystre et al., KDD 2019)
- Replaces static skill with continuous-time Gaussian processes. Skill evolves smoothly over time. Most principled approach to time dynamics over a 4-year dataset. Python library available (`kickscore`). Linear-time inference.

**"TrueSkill 2"** (Minka et al., Microsoft Research, 2018, TR-2018-8)
- Individual stats integration + squad offset + experience effects. The theoretical ideal, but proprietary.

---

## 7. Recommended Approaches (Ranked)

### Approach 1: RAPM + Stats Prior (Hybrid "RAPTOR for QW")

**PRIMARY RECOMMENDATION**

#### Algorithm Overview
1. **Build stats-based prior**: Train a regression from per-player ktxstats (efficiency, damage/min, TTD, item control, weapon accuracy) to game frag differential. This gives each player a "box score predicted impact" (like basketball's BPM).
2. **Build RAPM**: Ridge regression on the 18,206 x 2,355 lineup matrix. Response = frag differential. Choose lambda via cross-validation.
3. **Combine**: Use the box score model as a Bayesian prior for RAPM:
   ```
   beta_hat = (X'X + lambda*I)^(-1) * (X'Y + lambda * beta_prior)
   ```
   Players with many games -> RAPM dominates (data overpowers prior).
   Players with few games -> box score profile dominates (reasonable estimate until more data).
4. **Split into O-RAPM and D-RAPM**: Use Team1 frags as response (offensive) and Team2 frags as response (defensive). Distinguishes fraggers from "suppressive" players.

#### What Data It Needs
- Game compositions (which 4 players on each side) -- have
- Frag differentials per game -- have
- Per-player stats per game -- have (full ktxstats)

#### Pros
- **Solves the teammate adjustment problem** -- the core unsolved issue in our current composite
- **Milton test**: Will rank Milton high because he improves team margins whether paired with strong or weak teammates
- **Handles low-game players gracefully** via the stats prior
- **Produces interpretable O-RAPM / D-RAPM split** for player cards
- **Well-established methodology** -- basketball analytics has validated this for 15+ years
- **Favorable data ratio** (7.9:1 observations/parameters vs NBA's 2.7:1)

#### Cons
- Requires Python (scikit-learn) or implementing ridge regression in JS
- Static snapshot -- need to re-run when new games are added (batch, not online)
- Players who always play together get similar ratings (honest but sometimes frustrating)
- Not a live updating number -- suited for periodic (weekly/monthly) recalculation

#### Implementation Complexity
**Medium**. Core is a single RidgeCV call. Building the sparse design matrix and stats prior model is the main work. ~200 lines of Python.

```python
from sklearn.linear_model import RidgeCV
from scipy.sparse import lil_matrix
import numpy as np

# Build design matrix
X = lil_matrix((n_games, n_players))
for game in games:
    for player in game.team1:
        X[game.idx, player.idx] = +1
    for player in game.team2:
        X[game.idx, player.idx] = -1
X = X.tocsr()

# Frag differentials
Y = np.array([g.team1_frags - g.team2_frags for g in games])

# Solve
model = RidgeCV(alphas=[1, 10, 100, 1000], cv=5)
model.fit(X, Y)
player_ratings = model.coef_  # beta for each player
```

#### Milton Test Verdict: PASS
RAPM measures actual impact on team margin. Milton's teams consistently win by large margins regardless of lineup. The regression will isolate his individual contribution.

---

### Approach 2: OpenSkill with Performance Weights + Frag Margin

**RECOMMENDED as the live/online rating system.**

#### Algorithm Overview
1. Initialize every player at (mu=25, sigma=8.33)
2. Process each game chronologically:
   a. Compute per-player performance weight from in-game stats (e.g., normalized damage share, efficiency percentile within the game)
   b. Feed game to OpenSkill with team compositions and performance weights
   c. Optionally use frag margin via the score/margin parameter
3. Display rating = mu - 3*sigma (conservative estimate)

#### What Data It Needs
- Game outcomes (win/loss, frag scores) -- have
- Team compositions -- have
- Per-player stats for weighting -- have

#### Pros
- **Online/streaming** -- updates after each game, no batch reprocessing
- **JavaScript native** (`openskill` on npm) -- fits directly into Node.js backend
- **Uncertainty tracking** (sigma) -- shows confidence intervals on player cards
- **TrueSkill 2-like behavior** via weights without the proprietary algorithm
- **Fast** (~23,500 ops/sec)
- **Open source, MIT license**
- **Score margins** -- frag differential provides more signal than binary win/loss (MOVDA paper shows 13.5% faster convergence)

#### Cons
- Less principled teammate adjustment than RAPM -- weights help but don't fully decompose team effects
- No built-in inactivity decay -- must manually inflate sigma for inactive players
- Players who always play together still partially conflated
- Convergence at ~20-30 games with weights (adequate for core community, insufficient for casuals)

#### Implementation Complexity
**Low**. The npm package handles the math. Main work is computing performance weights from stats.

#### Milton Test Verdict: PASS (with weights)
Without weights, Milton would rate well due to high win rate. With performance weights, his per-game dominance amplifies rating gains.

---

### Approach 3: QW Performance Score (Stats-Based, HLTV-Inspired)

**RECOMMENDED as the player card "performance rating" -- complementary to Approaches 1 and 2.**

#### Algorithm Overview
1. For each game, compute per-player stats
2. Normalize each stat to z-scores (mean=0, sigma=1) against population distributions
3. Combine with optimized weights
4. Rescale to center on 1.00 (HLTV convention)
5. Find optimal weights by regressing against game win probability

#### Initial Weight Proposal (from correlation analysis)

| Component | Stat(s) | Weight | Rationale |
|-----------|---------|--------|-----------|
| Efficiency | kills / (kills + deaths) | 0.25 | Strongest single predictor (r=0.53 with winning) |
| Damage Output | damage_given per minute | 0.25 | Core offensive metric (r=0.42) |
| Survivability | TTD (merge with armor, r=0.92) | 0.20 | Use ONE of TTD/Armor, not both |
| Item Control | RA_time + YA_time + quad_took | 0.15 | Map control (r=0.49 for armor) |
| Weapon Accuracy | SG_acc * 0.6 + LG_acc * 0.4 | 0.10 | Reduced -- SG barely predicts winning (r=0.12) |
| Team Damage | team_dmg per minute | -0.05 | Modest penalty -- correlates with aggression (r=0.60 with dmg) |

**Drop RL accuracy entirely** -- negative correlation with winning (r=-0.08). Weaker players spam RL at close range (higher hit% but bad play).

#### Pros
- **Transparent and interpretable** -- players understand what drives their rating
- **Instant** -- no historical window needed, works from game 1
- **Per-game granularity** -- can show rating for each individual game
- **No minimum games** -- every game produces a rating
- **Easy to display on player cards** with component breakdown

#### Cons
- **No teammate adjustment** -- the core weakness. Milton's 65.3% eff in Book vs 69.8% in Commandos reflects team context, not just his skill
- **Weights must be empirically validated** -- initial weights are educated guesses from 4-month sample
- **Gamed by stat-padding** -- theoretically (though QW's simplicity limits this)
- **Map-agnostic** unless we normalize per-map (dm2 produces higher damage than dm3)

#### Implementation Complexity
**Low**. SQL queries for population distributions + per-game z-score calculation. ~100 lines.

#### Milton Test Verdict: PASS (with weight adjustments)
Current composite has him at #2 behind a 21-game sample player. Fixing minimum games threshold and merging TTD/Armor redundancy should put him at #1.

---

### Approach 4: Kickscore (Time-Dynamic Gaussian Process Rating)

**RECOMMENDED as a future enhancement for "skill over time" visualization.**

#### Algorithm Overview
Replaces static skill with a continuous-time Gaussian process. Skill evolves smoothly over time according to a stochastic process. Instead of a single number, each player has a skill *curve* over time.

Based on Maystre et al., KDD 2019. Python library available (`kickscore`).

#### Pros
- **Most principled time dynamics** -- no ad-hoc decay; skill drifts as a random walk
- **Beautiful visualizations** -- "skill over time" charts showing improvement, decline, breaks
- **Handles 4-year span naturally** -- a player who was great in 2022 but hasn't played since gets appropriate uncertainty
- **Linear-time inference** -- handles millions of observations

#### Cons
- Python only (`kickscore` library)
- More complex setup and tuning (kernel function, observation model)
- Doesn't natively incorporate per-player stats (win/loss only)
- Overkill for initial launch -- better as a v2 feature

#### Implementation Complexity
**Medium-High**. Requires understanding GP kernels and the kickscore API. Worth it for the visualization payoff.

#### Milton Test Verdict: PASS
Win/loss based with time awareness -- Milton's sustained dominance over 4 years will produce a high, stable skill curve.

---

## 8. The Teammate Adjustment Problem -- Deep Dive

This is the central unsolved issue with our current composite rating.

### Why Simple Stats Fail

Raw stats are **confounded by team quality**:
- A mediocre player on an excellent team has inflated stats (teammates control map -> more kills, fewer deaths)
- A skilled player on a weak team has suppressed stats (less map control -> harder to frag)
- You cannot determine individual skill from stats alone without controlling for context

Milton in Commandos (84.8% win rate): 69.8% eff, more map control, more item access
Milton in Book (62.8% win rate): 65.3% eff, less support, harder carries

His true skill is constant. The stats difference is the team context.

### How Each Approach Handles It

| Approach | Teammate Adjustment | Mechanism |
|----------|-------------------|-----------|
| Stats Composite (HLTV-style) | None | Raw stats reflect team context |
| RAPM | Full | Ridge regression isolates individual contribution from lineup data |
| OpenSkill + Weights | Partial | Weights differentiate within-team, but same-weight players conflated |
| Glicko-2 / TrueSkill | None within game | Differentiation only from lineup variation across games |

### Recommendation: Use Multiple Systems Together

- **RAPM** for the "true" individual contribution rating (batch, periodic recalculation)
- **OpenSkill** for the live, updating leaderboard rating
- **Stats composite** for the per-game performance rating on player cards
- **Calibrate** the stats composite weights against RAPM results (like basketball's BPM is calibrated against RAPM)

---

## 9. Map-Specific Ratings

### The Problem

dm2 plays fundamentally differently from dm3 or schloss. A player might dominate on dm2 but struggle on dm3. A single rating across all maps hides this.

### Recommended: Hierarchical Shrinkage

```
map_rating[player][map] = global_rating[player] + map_offset[player][map]
```

The map_offset starts at 0 with high uncertainty. It only deviates from 0 as evidence accumulates:
- Player with 5 games on dm2 -> show global rating (insufficient data for map-specific)
- Player with 50 games on dm2 -> show genuine dm2-specific rating

**Display threshold**: Show map-specific ratings only with 15+ games on that map. Below that, show global rating with a "limited data" indicator.

**Alternative**: Build separate RAPM models per map. With 4,811 dm2 games and 4,482 dm3 games, this is feasible for the top 2-3 maps. Captures player-map interactions but reduces sample size per model.

---

## 10. Implementation Roadmap

### Phase Order

| Phase | System | Purpose | Complexity |
|-------|--------|---------|------------|
| **Phase 1** | Stats Composite (HLTV-style) | Player cards, per-game ratings | Low |
| **Phase 2** | RAPM | True individual contribution, calibrate stats weights | Medium |
| **Phase 3** | OpenSkill + weights | Live leaderboard, matchup predictions | Low |
| **Phase 4** | O-RAPM / D-RAPM split | Offensive vs defensive player profiles | Medium |
| **Phase 5** | Kickscore | "Skill over time" visualization | Medium-High |
| **Phase 6** | Map-specific ratings | Per-map breakdowns on player cards | Medium |

### Technology Stack

| Component | Tool | Language |
|-----------|------|----------|
| Stats composite | SQL queries + Node.js | JavaScript |
| RAPM | scikit-learn RidgeCV | Python |
| OpenSkill | `openskill` npm package | JavaScript |
| Kickscore | `kickscore` pip package | Python |
| Data source | PostgreSQL (`quake_stats`) | SQL |

### Minimum Games Thresholds

| Context | Threshold | Rationale |
|---------|-----------|-----------|
| Show stats on player card | 5 games | Enough for basic averages |
| Include in rankings | 30 games | RAPM + OpenSkill convergence with stats |
| Map-specific rating | 15 games on that map | Hierarchical shrinkage handles the rest |
| "Reliable" individual rating | 50+ games | RAPM with stats prior gives good precision |

### Clan vs Mix Separation

Maintain separate rating tracks:
- **Clan rating**: Only from is_clan_game=true (9,868 games -- more competitive, organized)
- **Overall rating**: All games combined
- Display both on player card. Clan rating is more meaningful for competitive ranking.

---

## 11. Summary Comparison

| Criterion | Stats Composite | RAPM | OpenSkill + Weights | Kickscore |
|-----------|----------------|------|-------------------|-----------|
| Teammate adjustment | None | Full | Partial | None |
| Works from game 1 | Yes | Needs batch | Yes (high sigma) | Yes (high sigma) |
| Online/streaming | Per-game | Batch only | Per-game | Near-online |
| Interpretable | Component breakdown | Single number | Single number | Skill curve |
| Time dynamics | Static | Static | Manual sigma decay | Built-in |
| Per-player stats | Core input | Via prior | Via weights | Win/loss only |
| Milton test | Pass (with fixes) | Strong pass | Pass (with weights) | Pass |
| Implementation | Easy | Medium | Easy | Medium-High |

### The Recommended Trio

1. **Stats Composite** -> player cards, per-game "performance rating," component breakdown
2. **RAPM** -> true individual skill, teammate-adjusted, used to calibrate stats weights
3. **OpenSkill** -> live leaderboard, matchup predictions, uncertainty tracking

These three complement each other. Stats are instant and interpretable. RAPM is the ground truth for calibration. OpenSkill is the live system for the leaderboard.

---

## 12. RAPM Deep Dive (Plain Language)

This section explains the core concepts intuitively. The formal math is in Section 5.3.

### The Recipe Analogy

Imagine you're a detective figuring out how much each ingredient contributes to a dish's taste score. You have 18,206 dishes (games), each made with exactly 8 ingredients (players) -- 4 on the "good" side, 4 on the "bad" side. You know the final taste score (frag differential). You want each ingredient's individual contribution.

The trick: ingredients appear in *different combinations* across dishes. Milton plays with Commandos in some games, with Book in others. Commandos plays without Milton sometimes. By comparing outcomes across all these overlapping combinations, you triangulate each ingredient's contribution.

### The Design Matrix in Plain Terms

A giant spreadsheet. 18,206 rows (games), 2,355 columns (players).

```
              Milton  razor  gore  hangtime  oeks  reppie  ...
Game 1:        +1      +1    +1     +1       -1    -1     ...
Game 2:        +1      -1    +1     -1       +1    -1     ...
Game 3:         0       0     0      0       +1    +1     ...
```

- `+1` = on Team 1 this game
- `-1` = on Team 2
- `0` = not in this game

Each row has exactly 8 non-zero entries. The matrix is 99.66% zeros.

### What Ridge Regression Does

We're saying: "The frag differential of each game is the sum of contributions of the 8 players in it."

```
Game 1 outcome = Milton's contribution + razor's + gore's + hangtime's
               - oeks's - reppie's - ...
```

18,206 equations, 2,355 unknowns. More equations than unknowns = overdetermined = solvable.

The "ridge" part adds a penalty that says "prefer ratings closer to zero unless the data strongly says otherwise." This:
- Prevents crashes when teammates always appear together (multicollinearity)
- Pulls low-game players toward average (appropriate -- we don't know much about them)
- Players with many games resist the pull (their data is strong enough)

Lambda controls how strong the pull is. Too small = noisy. Too large = everyone near zero. Cross-validation finds the sweet spot automatically.

### Why It Solves the Milton Problem

The system sees patterns like:

| Lineup | Avg frag margin |
|--------|-----------------|
| Milton + Commandos teammates | +45 |
| Milton + Book teammates | +15 |
| Commandos teammates (no Milton) | +20 |
| Book teammates (no Milton) | -5 |

Adding Milton to Commandos: +45 vs +20 = Milton adds ~25.
Adding Milton to Book: +15 vs -5 = Milton adds ~20.
Milton's individual contribution ~+20 to +25 regardless of team.

The regression solves all 18,206 of these overlapping comparisons simultaneously.

### The Stats Prior: Breaking the Inseparable Teammates Problem

Pure RAPM has one blind spot: if two players appear together in 100% of their games, it can't distinguish them from lineup data alone. Their columns in the matrix are identical.

But we *do* have per-player stats. If Milton has 65% efficiency and 12k damage while his always-present teammate has 50% efficiency and 8k damage, that's strong evidence Milton is better.

The stats prior uses this. Instead of pulling everyone toward zero, it pulls them toward their stats-predicted rating:

```
beta = (X'X + lambda*I)^(-1) * (X'Y + lambda * beta_prior)
                                        ^^^^^^^^^^^^^^^^
                                        stats break the tie
```

Players with many games and varied lineups: lineup data dominates.
Players with few games or inseparable teammates: stats prior dominates.
The blend is automatic -- no arbitrary cutoff.

### How the Trio Complements Each Other

Three lenses looking at the same player, each seeing something the others miss.

**Stats Composite** answers: *"How did you play today?"*
- Looks at one game: damage, efficiency, item control, accuracy
- Produces a per-game performance rating (like HLTV's 1.35)
- Instant, transparent, component breakdown players can study
- Blind to teammate effects (Milton's stats look better in Commandos than Book)

**RAPM** answers: *"How good are you actually?"*
- Ignores individual stats. Looks across hundreds of games
- Asks: "When you're on a team, does it win by more than expected?"
- Produces one number: your true impact on team margin, stripped of teammate effects
- Batch calculation, opaque, needs 30+ games

**OpenSkill** answers: *"Where do you stand right now?"*
- Live rating that updates after every game
- Goes up on wins (more if unexpected), down on losses
- Performance weights from stats modulate the update size
- Shows uncertainty (confidence intervals)
- Powers matchup predictions

### The Calibration Loop

```
RAPM (ground truth -- "what actually predicts winning")
  |
  |-- calibrates weights for --> Stats Composite (per-game rating)
  |                                     |
  |                                     |-- feeds weights into --> OpenSkill (live rating)
  |                                                                    |
  |-- validates against <---------------------------------------------|
```

1. Run RAPM. Now you have the "true" individual impact for every player with enough games.
2. Ask: "Which stats best predict a player's RAPM rating?" The answer gives optimal weights for the stats composite. (This is how basketball's BPM was built.)
3. Use those calibrated stats as performance weights for OpenSkill.
4. Periodically re-run RAPM to validate that OpenSkill hasn't drifted.

### What the Player Card Shows

```
RAPM Impact:     +22.3  (top 0.1% -- "How much you actually move the needle")
OpenSkill:       38.2   (rank #1 -- "Your live competitive rating")
Performance:     1.42   (avg -- "Your typical game performance, HLTV-style")

Breakdown:
  Efficiency     ████████████░░  1.8 sigma above avg
  Damage Output  █████████████░  2.1 sigma above avg
  Survivability  ██████████░░░░  1.4 sigma above avg
  Item Control   ███████████░░░  1.6 sigma above avg
  Weapon Acc     ████████░░░░░░  1.1 sigma above avg
```

Three numbers, three different answers, one complete picture.

### Practical Notes

**Keep all players in the dataset.** That 3-game player on the opposing team helps calibrate Milton's rating. Ridge regression handles low-game players naturally (pulls toward prior). Removing them loses equations.

**Filter by game type.** Clan games only (9,868) for competitive ranking. All games for overall. Mix games add noise to lineup signal.

**Map-specific strategy data** is more useful for the stats composite (Phase 6) than for RAPM. Knowing that RA control matters more on dm2 than dm3 helps tune per-map stat weights. RAPM doesn't care *why* a team wins -- it just observes that they do.

**Identity resolution** (grouping aliases to real people) directly improves RAPM. If "valla" and "nitram" are the same person but counted as two, their games are split across two columns. Merging them gives the regression more data per player and better estimates.

---

## 13. Approaches Considered but Not Recommended

### Pure Elo
No uncertainty tracking, slow convergence in team games, no individual stat integration. Strictly inferior to Glicko-2 and OpenSkill.

### TrueSkill 1 (without stats)
46 games to converge in 4v4 -- too slow for our player distribution. No individual differentiation within games. OpenSkill with weights is strictly better for our use case.

### TrueSkill 2
The theoretical ideal but proprietary. OpenSkill with weights achieves similar results via a different mechanism.

### Pure ML Prediction Model
Train a neural net to predict match outcomes from player stats. Problems: black box (uninterpretable), needs more data than we have for reliable training, doesn't produce a clean "rating" number, and overfitting risk with 2,355 players.

### PageRank / Graph-Based
Model the player-vs-player network and run PageRank or similar. Interesting but doesn't incorporate per-player stats, and the graph structure in 4v4 is less natural than in 1v1 games. RAPM is a more principled approach to the same underlying data.

---

## 14. References

### Rating Systems
- Glickman, M. (2012). "Example of the Glicko-2 System." Boston University.
- Herbrich, R., Minka, T., Graepel, T. (2005). "TrueSkill: A Bayesian Skill Rating System." Microsoft Research.
- Minka, T., Cleven, R., Zaykov, Y. (2018). "TrueSkill 2: An Improved Bayesian Skill Rating System." MSR-TR-2018-8.
- Weng, R.C., Lin, C.J. (2011). "A Bayesian Approximation Method for Online Ranking." JMLR 12: 267-300.

### Sports Analytics
- Myers, D. (2019). "About Box Plus/Minus (BPM)." Basketball Reference.
- Silver, N. (2020). "How Our 2020 NBA Predictions Work (RAPTOR)." FiveThirtyEight.
- Rosenbaum, D. (2004). "Measuring How NBA Players Help Their Teams." 82games.com (original APM concept).

### Esports-Specific
- Dehpanah, A. et al. (2022). "Behavioral Player Rating in Competitive Online Shooter Games." CSC'22.
- Dehpanah, A. et al. (2021). "Evaluating Team Skill Aggregation in Online Competitive Games." IEEE CoG 2021.
- De Bois, M. et al. (2025). "PandaSkill -- Player Performance and Skill Rating in Esports."
- Shorewala, S., Yang, Z. (2025). "Beyond Winning: MOVDA."
- Maystre, L. et al. (2019). "Pairwise Comparisons with Flexible Time-Dynamics." KDD 2019.

### Open-Source Libraries
- OpenSkill.js: `github.com/philihp/openskill.js` (npm: `openskill`)
- python-trueskill: `github.com/sublee/trueskill`
- kickscore: `github.com/lucasmaystre/kickscore`
