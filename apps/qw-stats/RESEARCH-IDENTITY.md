# RESEARCH-IDENTITY.md — Player Alias Resolution

## Problem Statement

2,355 unique `player_name_normalized` values represent ~800-1,000 real people. QWHub does NOT do identity resolution. The `login` field is mostly empty. Players change names freely — "valla" and "nitram" are the same person, but nothing in the data tells us that directly.

**Constraint:** False merges are catastrophically worse than false splits. Merging two different players corrupts every stat derived from both. Leaving two names unlinked just means slightly incomplete profiles.

---

## Available Signals (Ranked by Discriminating Power)

### 1. Cannot-Link: Co-occurrence in Same Game (STRONGEST)

Two names in the same match are **definitively** different people. This is binary, error-free, and our most valuable signal. It eliminates false merges — no amount of name similarity or stat similarity can override this.

**Implementation:** Build a co-occurrence matrix from `game_players`. For any candidate pair, check if they ever shared a `game_id`. If yes, they are guaranteed different people.

```sql
SELECT DISTINCT a.player_name_normalized AS name_a, b.player_name_normalized AS name_b
FROM game_players a
JOIN game_players b ON a.game_id = b.game_id
WHERE a.player_name_normalized < b.player_name_normalized;
```

This produces millions of cannot-link pairs. Store as a set for O(1) lookup.

### 2. Must-Link: Community Knowledge (VERY HIGH)

Community veterans know aliases. Even 50-100 confirmed alias pairs bootstrap the entire system. Sources:
- QWiki player pages (`quakeworld.nu/wiki/Category:Players`)
- QWHub `qw_auth` field (where populated)
- Direct community input (Discord, forum posts)
- Known clan roster histories

These serve as ground truth for training and validation.

### 3. Behavioral Fingerprinting: Stat Profiles (HIGH)

The killer feature for cases where names share zero characters. Every player has a characteristic "playstyle fingerprint" that persists across name changes.

**Feature vector (~20 dimensions):**

| Category | Features |
|----------|----------|
| Weapon preference | RL/LG/SG/SSG/GL damage shares (normalized to sum=1) |
| Accuracy | RL acc, LG acc, SG acc |
| Aggression | efficiency, damage ratio, spawn frag rate, team damage rate |
| Item control | RA/YA takes per minute, RA/YA time shares |
| Survivability | taken-to-die, enemy weapon damage absorbed |

**Similarity metric:** Cosine similarity on the full feature vector. Threshold: >0.95 strong evidence, >0.90 suggestive, <0.85 weak.

**Critical confounders to address:**
- **Map effects:** Weapon profiles differ wildly across maps (DM2=rocket-heavy, DM3=lightning-heavy). Solution: compute map-residualized stats (subtract map average per stat) or compare within-map profiles.
- **Skill evolution:** Players improve/decline over 4 years. Solution: compare within overlapping time windows.
- **Minimum sample:** Names with <10 games produce unreliable profiles. Skip stat comparison for those.
- **Team role:** A player might carry on one team and support on another. Solution: weight role-invariant features (accuracy) higher than role-dependent features (item control).

**Academic backing:** Riot Games uses behavioral fingerprinting for VALORANT smurf detection — dropped smurf counts ~17%. IEEE 2024 papers confirm in-game behavioral biometrics work for player identification in competitive FPS.

### 4. Team Succession (HIGH)

If "name_a" disappears from team X and "name_b" appears on team X around the same time, with no co-occurrence, that's strong evidence of identity.

**Implementation:**
```sql
-- Find temporal gaps in team roster
-- name_a's last game on team X: 2024-06-15
-- name_b's first game on team X: 2024-06-22
-- No overlap → candidate pair
```

Combine with stat similarity for high-confidence matches.

### 5. Name Similarity (MEDIUM-HIGH)

Catches variants (paradoks/paradokz, xantom/xantoom) but misses creative changes (carapace/apa).

**Best approach: Graduated comparison levels (Splink-style)**

| Level | Criteria | Evidence Strength |
|-------|----------|-------------------|
| 1 (exact) | Core names identical | Very high |
| 2 (near) | Jaro-Winkler ≥ 0.92 | High |
| 3 (moderate) | Jaro-Winkler ≥ 0.80 OR bigram Dice ≥ 0.70 | Medium |
| 4 (phonetic) | Same Double Metaphone code | Low-Medium |
| 5 (else) | Below all thresholds | Negative (evidence of different person) |

**QW-specific preprocessing before comparison:**
1. Strip clan tags: `[tag]name`, `name[tag]`, `{tag}name`, `.tag.name`, `-tag-name`
2. Leetspeak normalization: 4→a, 3→e, 0→o, 1→i, 5→s, 7→t
3. Strip decorators: leading/trailing dots, underscores, x's (`xXnameXx` → `name`)
4. Result = "core name" — compare this, not the raw normalized name

**Why Jaro-Winkler over Levenshtein:** Prefix weighting is ideal for gaming aliases where players keep recognizable prefixes but change suffixes. Score is naturally [0,1]. Fewer false positives on short strings.

### 6. Temporal Exclusion (MEDIUM)

Two names that NEVER appear in the same game and have non-overlapping activity periods are more likely the same person. Necessary but not sufficient — many players simply stopped playing.

### 7. Phonetic Similarity (LOW)

Double Metaphone catches pronunciation variants (phantom/fantom). Useless for leetspeak, numbers, or creative aliases. Use only as a supplementary blocking signal.

---

## Recommended Approach: Fellegi-Sunter + Leiden Clustering

### The Fellegi-Sunter Model

The foundational framework for probabilistic record linkage (1969). For each candidate pair of names, compute a match probability by combining evidence from multiple signals with learned weights.

**How it works:**
- For each comparison field (name similarity, stat similarity, team overlap, temporal pattern), estimate:
  - **m-probability:** P(field agrees | true match) — how often matching records agree on this field
  - **u-probability:** P(field agrees | non-match) — how often random non-matching records agree by chance
- Match weight per field:
  - Agreement: w = log2(m/u)
  - Disagreement: w = log2((1-m)/(1-u))
- Total score = sum of all field weights
- Two thresholds divide pairs into: **auto-merge** (above upper), **human review** (between), **auto-split** (below lower)

**Key properties:**
- Equivalent to Naive Bayes classification under conditional independence
- Parameters estimated via EM (Expectation-Maximization) — **fully unsupervised, no training data needed**
- The "clerical review zone" maps directly to our "human review" requirement
- Can incorporate graduated comparison levels (not just binary agree/disagree): "exact match / JW > 0.9 / JW > 0.7 / else" each get their own m/u probabilities
- Term frequency adjustments: agreeing on a rare name ("xantom") is stronger evidence than agreeing on a common name

**Why not just thresholds on individual metrics?** Because signals combine non-linearly. Two names with moderate name similarity + moderate stat similarity + same team + temporal succession = very high combined confidence. FS handles this optimally.

**Extensions that matter:**
- **Bayesian approaches** (Steorts et al.): Full posterior distributions over linkage structures, naturally handle transitivity (if A=B and B=C, then A=C). Scale is fine for our 2,355 names.
- **Semi-supervised:** Even a few hundred labeled pairs significantly improve quality over pure EM.

### Leiden Clustering (Why Not Louvain)

After pairwise scoring, we need to group names into identity clusters. Leiden is strictly superior to Louvain for our use case:

| Property | Louvain | Leiden |
|----------|---------|--------|
| Well-connected communities | No (up to 25% badly connected) | Yes (guaranteed) |
| Resolution limit | Yes (merges small clusters) | No (with CPM quality function) |
| Small cluster detection | Poor | Good — detects our typical 2-3 name alias sets |
| Speed | Fast | Faster |

The **CPM (Constant Potts Model)** quality function is critical. Unlike modularity, CPM has no resolution limit — it can detect clusters of 2-3 nodes without merging them into larger groups. This is exactly our use case: most players have 1-4 aliases.

**Cannot-link enforcement:** After clustering, validate that no cluster contains names that co-occurred in the same game. Split any violating cluster. This is simpler and more transparent than incorporating constraints into the clustering algorithm itself.

**References:**
- Blondel et al. (2008). "Fast unfolding of communities in large networks." *J. Stat. Mech.*
- Traag et al. (2019). ["From Louvain to Leiden: guaranteeing well-connected communities."](https://www.nature.com/articles/s41598-019-41695-z) *Scientific Reports* 9, 5233.

---

## The Pipeline

```
Phase 1: Data Preparation
  ├── Extract core names (strip clan tags, leetspeak, decorators)
  ├── Compute per-name stat profiles (min 10 games, map-residualized)
  ├── Build co-occurrence matrix (cannot-link set)
  └── Collect community-known aliases (must-link seed set)

Phase 2: Blocking (Candidate Generation)
  ├── Name-prefix blocks (first 3 chars of core name)
  ├── Phonetic blocks (Double Metaphone code)
  ├── Team co-occurrence blocks (ever on same team)
  ├── Stat-profile blocks (similar skill tier + weapon preference cluster)
  └── UNION all blocks → candidate pairs
      (At 2,355 names, all-pairs is feasible as fallback: ~2.77M pairs)

Phase 3: Pairwise Scoring (Fellegi-Sunter)
  ├── Name similarity (Jaro-Winkler + Dice on core name, graduated levels)
  ├── Stat profile similarity (cosine similarity of feature vectors)
  ├── Team overlap (Jaccard of team sets)
  ├── Temporal pattern (activity overlap vs succession score)
  ├── Cannot-link check (instant rejection if co-occurred in game)
  └── Combined FS score → match probability per pair

Phase 4: Clustering (Leiden)
  ├── Build weighted graph: nodes=names, edges=match probability
  ├── Apply Leiden clustering with CPM quality function
  ├── Post-process: split any cluster containing co-occurring names
  └── Flag clusters >5 names for manual review

Phase 5: Human Review
  ├── Auto-merge: FS score > 0.95, no co-occurrence violation
  ├── Review queue: FS score 0.70-0.95
  ├── Auto-split: FS score < 0.70
  └── Present evidence to reviewer: names, teams, stat comparison, timeline

Phase 6: Iterate (3-4 cycles)
  ├── Confirmed merges → must-link constraints
  ├── Confirmed splits → cannot-link constraints
  ├── Re-run FS with updated constraints → better scores
  └── Converges when review queue is empty
```

---

## Fuzzy Name Matching Deep Dive

### Metric Comparison

| Metric | How It Works | QW Suitability | Best For |
|--------|-------------|----------------|----------|
| **Levenshtein** | Min edits (insert/delete/substitute) | OK — poor on short strings | Typos, minor variations |
| **Jaro-Winkler** | Matching chars + transpositions + prefix bonus | **Best** — prefix weighting ideal for aliases | Primary name comparator |
| **Bigram Dice** | Overlap of character bigrams | Good — order-insensitive | Clan tag reordering |
| **Double Metaphone** | Phonetic encoding (2 codes per word) | Low — fails on numbers/leetspeak | Supplementary blocking |

**Recommendations:**
- Primary metric: **Jaro-Winkler** with threshold 0.85 for blocking, 0.92 for high confidence
- Secondary: **Bigram Dice** catches cases where Jaro-Winkler fails (reordered name parts)
- Supplementary: **Double Metaphone** for phonetic blocking only

### QW-Specific Preprocessing

Before any fuzzy matching, extract a "core name":

```
Input: "[sr]xant0m_afk"
Step 1 (strip tags): "xant0m_afk"
Step 2 (strip decorators): "xant0m"
Step 3 (leetspeak): "xantom"
Output (core name): "xantom"
```

Compare BOTH the full normalized name AND the core name. The core name comparison has much higher signal.

---

## Graph-Based Approaches

### Building the Graph

**Nodes:** 2,355 player names
**Edges:** Weighted by combined evidence

| Edge Type | Weight | Source |
|-----------|--------|--------|
| High name similarity (JW > 0.92) | +3.0 | Name comparison |
| Moderate name similarity (JW 0.80-0.92) | +1.5 | Name comparison |
| High stat similarity (cosine > 0.93) | +2.5 | Behavioral fingerprinting |
| Same team, non-overlapping activity | +2.0 | Team succession |
| Team successor (temporal gap < 30 days) | +1.5 | Temporal analysis |
| Cannot-link (same game) | -∞ | Co-occurrence matrix |

### Connected Components (Baseline)

BFS/DFS on high-confidence edges only (weight > 4.0). Simple, deterministic, produces clean clusters. Good for harvesting obvious merges. Risk: a single false edge merges entire clusters.

### Leiden with CPM (Preferred)

Build the weighted graph, run Leiden with CPM quality function, tune resolution parameter to produce clusters of 2-5 nodes. Guaranteed well-connected communities. Post-process to validate cannot-link constraints.

### Label Propagation (Semi-Supervised)

Seed known aliases as fixed labels. Propagate through the similarity graph to discover new aliases. The seeded labels don't change while unlabeled nodes update iteratively.

This directly implements: "start with community-contributed known aliases, propagate to discover more."

---

## Behavioral Fingerprinting Details

### Feature Vector Construction

From `game_players` data, for each `player_name_normalized` with ≥10 games:

```
Weapon Preference (6D, normalized to sum=1):
  rl_dmg_share, lg_dmg_share, sg_dmg_share, ssg_dmg_share, gl_dmg_share, other_dmg_share

Accuracy (3D):
  avg_rl_acc, avg_lg_acc, avg_sg_acc

Aggression (4D):
  avg_efficiency, avg_damage_ratio, avg_spawn_frag_rate, avg_team_dmg_rate

Item Control (4D):
  avg_ra_takes_per_min, avg_ya_takes_per_min, avg_ra_time_share, avg_ya_time_share

Survivability (2D):
  avg_taken_to_die, avg_ewep_per_game

Total: ~19-dimensional feature vector
```

### Map-Residualized Stats

To remove map effects:
1. Compute per-map averages for each stat across all players
2. For each player-game, subtract the map average: `residual = player_stat - map_avg_stat`
3. Average residuals across all games for each player name

This isolates player-specific tendencies from map-specific effects.

### Similarity Computation

- **Cosine similarity** for the full feature vector: captures pattern similarity regardless of magnitude
- **Jensen-Shannon Divergence** for weapon damage shares specifically (they're probability distributions)
- Z-score normalize each feature before computing Euclidean distance as an alternative

### Stability Over Time

Stat fingerprints are most stable for:
- Weapon accuracy (mechanical skill, highly individual)
- Weapon preference ratios (playstyle habit)
- Team damage rate (discipline/recklessness)

Least stable for:
- Item control (heavily role/team-dependent)
- Win rate (team quality dependent)
- Overall damage output (improves with skill growth)

Weight the stable features higher in the fingerprint comparison.

---

## What Other Platforms Do

| Platform | Approach | Automated? | Scale | Relevance |
|----------|----------|------------|-------|-----------|
| **HLTV** | Manual editorial + numeric player IDs | No | ~3K pros | Similar scale, manual curation works |
| **Liquipedia** | Community wiki + structured alias pages | No | Thousands | Closest model — community-driven |
| **Steam** | Immutable SteamID + name history | Yes (account system) | Millions | QW lacks reliable account IDs |
| **FACEIT** | Account linking via Steam ID | Yes | Millions | Account-based, not applicable |
| **Riot/Valorant** | Behavioral ML smurf detection | Yes (fully) | Millions | Stat fingerprinting directly applies |
| **QWHub** | None (confirmed by vikpe) | N/A | 2,355 | We're building from scratch |

**Our approach:** Combine Riot's behavioral fingerprinting with HLTV/Liquipedia's community curation, automated via Fellegi-Sunter probabilistic scoring. Novel for QW.

---

## Semi-Supervised & Human-in-the-Loop

### The Virtuous Cycle

```
1. Bootstrap → unsupervised FS model finds initial high-confidence merges
2. Validate → community reviewers confirm or reject
3. Seed → confirmed merges become must-link, rejections become cannot-link
4. Retrain → re-run model with new constraints, better scores
5. Repeat → each cycle improves quality, 3-4 cycles to convergence
```

### Active Learning

Instead of randomly selecting pairs for review, select the **most informative** pairs — those where the model is most uncertain (closest to the match/non-match decision boundary).

**Review interface should present:**
```
"Is 'xantom' (active 2022-2024, ]sr[, RL acc 14%, efficiency 58%)
 the same person as
 'phantom' (active 2023-2025, ]sr[, RL acc 12%, efficiency 55%)?"

 Model confidence: 0.72 (uncertain)
 Evidence: Name JW 0.72, Same team ]sr[, Stat cosine 0.89
 Co-occurrence check: NEVER in same game ✓

 [Merge] [Split] [Unsure]
```

A few hundred such reviews can dramatically improve the model.

### SystemER: Explainable Rules

SystemER (Qian et al., 2019) learns human-comprehensible rules for entity resolution:
- Rules are transparent, not black-box ML
- Domain experts can verify and customize
- Small number of labeled examples sufficient
- Maps well to our "community reviewable" requirement

---

## Implementation Plan

### Phase 1: Quick Wins (Immediate Value)

1. **Build co-occurrence matrix** — the cannot-link set. Computationally cheap, immediately useful for validation.

2. **Name variant detection** — Run Jaro-Winkler on all core names with threshold ≥ 0.92. Cross-check against cannot-link set. Catches paradoks/paradokz, xantom/xantoom type variants.

3. **Community seed collection** — Create simple alias table from QWiki + community input. Even 50 confirmed pairs dramatically improve everything downstream.

**Expected yield:** 100-200 obvious merges eliminating simple spelling variants.

### Phase 2: Stat Fingerprinting (Creative Aliases)

1. Compute map-residualized stat profiles for all names with ≥10 games (~500-700 names)
2. Compute pairwise cosine similarity within blocking groups
3. High-similarity pairs (>0.93) that pass cannot-link check → review queue
4. Community validation of candidates

**Expected yield:** 50-100 additional merges (the valla/nitram type cases).

### Phase 3: Full Pipeline (Systematic Resolution)

1. **Splink** (Python) handles the FS model: comparison levels, EM parameter estimation, blocking, probabilistic scoring
2. **leidenalg** (Python) for graph clustering with CPM
3. Review interface for community validation
4. Iterative refinement (3-4 cycles)

**Expected yield:** Reduce 2,355 names to ~900-1,100 resolved identities.

### Storage Schema (Already Prepared)

```sql
-- player_identities: One row per real person
CREATE TABLE player_identities (
    id SERIAL PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    display_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- player_aliases: Maps names to identities
CREATE TABLE player_aliases (
    normalized_name TEXT PRIMARY KEY,
    identity_id INTEGER REFERENCES player_identities(id),
    confidence REAL,           -- 0.0-1.0
    source TEXT,               -- 'manual', 'algorithm', 'community'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

When querying stats, JOIN through `player_aliases` to aggregate across all names for an identity.

---

## Tools & Libraries

### Recommended Stack (Python Pipeline)

| Tool | Purpose | Notes |
|------|---------|-------|
| **[Splink](https://github.com/moj-analytical-services/splink)** | Probabilistic record linkage | FS model, blocking, EM — our primary tool |
| **[RapidFuzz](https://github.com/maxbachmann/RapidFuzz)** | Fast Jaro-Winkler + Levenshtein | C++ backend, handles scale |
| **[scikit-learn](https://scikit-learn.org)** | Cosine similarity, PCA, z-score | Stat fingerprinting |
| **[leidenalg](https://leidenalg.readthedocs.io/)** + **[igraph](https://igraph.org/)** | Leiden clustering with CPM | Community detection |
| **[jellyfish](https://github.com/jamesturk/jellyfish)** | Double Metaphone, Soundex | Phonetic encoding |
| **[Dedupe](https://github.com/dedupeio/dedupe)** | Alternative to Splink | Built-in active learning workflow |

### JavaScript (for review UI or Node.js scripts)

| Tool | Purpose |
|------|---------|
| **[string-similarity](https://github.com/aceakash/string-similarity)** | Dice coefficient |
| **[Graphology](https://graphology.github.io/)** | Graph + Louvain community detection |
| **[fuse.js](https://fusejs.io/)** | Fuzzy search for name lookup |

---

## Key References

### Must-Read
1. Binette & Steorts (2022). ["(Almost) All of Entity Resolution"](https://pmc.ncbi.nlm.nih.gov/articles/PMC11636688/) — Comprehensive survey of the field
2. Traag et al. (2019). ["From Louvain to Leiden"](https://www.nature.com/articles/s41598-019-41695-z) — Why Leiden > Louvain for small clusters
3. Riot Games. ["Smurf Detection"](https://playvalorant.com/en-us/news/dev/valorant-systems-health-series-smurf-detection/) — Behavioral fingerprinting in production

### Implementation
4. [Splink Documentation](https://moj-analytical-services.github.io/splink/index.html) — Primary tool
5. [Splink: Fellegi-Sunter Theory](https://moj-analytical-services.github.io/splink/topic_guides/theory/fellegi_sunter.html) — Math behind the model
6. [Dedupe Documentation](https://docs.dedupe.io/) — Alternative with active learning

### Behavioral Biometrics
7. ["Fair Play and Identity: In-Game Behavioral Biometrics"](https://ieeexplore.ieee.org/document/11114281/) — IEEE, 2024
8. ["Game Telemetry as Biometric Signatures"](https://videogamedatascience.medium.com/game-telemetry-as-biometric-signatures-39f42841373d)

### Foundational
9. Fellegi & Sunter (1969). "A Theory for Record Linkage." *JASA* 64(328), 1183-1210
10. Christen (2012). "A Survey of Indexing Techniques for Scalable Record Linkage." *IEEE TKDE*

### Constrained Clustering
11. Wagstaff et al. (2001). "Constrained K-means Clustering with Background Knowledge." *ICML*
12. Babaki et al. (2024). ["Clustering with Confidence-Based Must-Link and Cannot-Link Constraints."](https://arxiv.org/abs/2212.14437)

### Semi-Supervised ER
13. Qian et al. (2019). ["SystemER: human-in-the-loop explainable entity resolution."](https://dl.acm.org/doi/10.14778/3352063.3352068) *VLDB*
14. ["Enhancing Entity Resolution with hybrid Active ML."](https://www.sciencedirect.com/science/article/abs/pii/S0306437924000681) *Information Systems*, 2024

---

## Bottom Line

The alias resolution problem is well-suited to established record linkage techniques because:

1. **Small scale** (2,355 names) — can afford expensive computations, even all-pairs comparison
2. **Rich per-game stats** — behavioral fingerprinting that most ER problems lack
3. **Cannot-link constraints** (co-occurrence) — uniquely powerful and error-free
4. **Community knowledge** — can seed and validate the system
5. **Conservative bias** (prefer false splits) — aligns with Fellegi-Sunter's clerical review zone

**Start with Phase 1** (name variants + community seeds + co-occurrence matrix). Delivers immediate value with minimal infrastructure. Build toward the full Fellegi-Sunter + Leiden pipeline as the alias table grows.

**The more detailed research** including blocking strategies, phonetic matching comparisons, Bayesian extensions, Louvain vs Leiden analysis, and full tool comparison is in [ALIAS-RESOLUTION-RESEARCH.md](ALIAS-RESOLUTION-RESEARCH.md).

---

## 15. Field Notes — What Actually Works (Feb 2026)

After the first real curation session (walking through oeks, HX rosters with ParadokS), here's how the researched signals performed in practice:

### Signals That Delivered Immediately

| Signal | Research Rank | Practical Value | Example |
|--------|-------------|-----------------|---------|
| **Co-occurrence (cannot-link)** | #1 | Essential — the gatekeeper | Caught shazam ≠ sham (16 shared games) that name similarity would've false-merged |
| **Community knowledge (must-link)** | #2 | Dominant for hard cases | realpit=medic, tco=thechosenone, zamsha=shazam — zero name similarity, no algorithm catches these |
| **Team succession** | #4 | Surprisingly powerful | medic vanishes from HX Apr 2024, realpit appears on HX Apr 2024 — obvious to a human scanning a roster |
| **Core name extraction + Jaro-Winkler** | #5 | High volume, low effort | 118 exact core name groups found automatically (leetspeak, decorators, clan tags) |

### Signals Not Yet Needed

| Signal | Research Rank | Status | When It's Needed |
|--------|-------------|--------|-----------------|
| **Behavioral fingerprinting** | #3 | Unused so far | Phase 2 — for creative aliases where names share zero characters (valla/nitram type) |
| **Fellegi-Sunter model** | Core framework | Overkill for current scale | Phase 3 — when automating thousands of candidate pairs without a human curator |
| **Leiden clustering** | Clustering step | Not needed yet | Phase 3 — when building clusters from automated pairwise scores |
| **Phonetic matching** | #7 (weakest) | Likely never needed | QW names are leetspeak/creative, not phonetic variants |

### Key Insight

With a community of ~1,000 real people and a knowledgeable curator, **human-in-the-loop dominates automated methods**. The first session confirmed 6 identity clusters (~7,871 games) and 14 auto-detected clusters using only co-occurrence checks, core name matching, and domain knowledge. No ML, no probabilistic models, no graph clustering needed.

The fancy tools (FS, Leiden, stat fingerprinting) are insurance for the **long tail** — the 200-300 players the curator doesn't personally know. They remain in the toolkit for Phase 2-3 but shouldn't be the focus.

### Revised Signal Ranking (Empirical)

```
1. Co-occurrence (cannot-link)     — binary, error-free, non-negotiable gate
2. Community knowledge (must-link) — catches what no algorithm can
3. Team succession + roster scan   — visual pattern matching on clan rosters
4. Core name extraction + JW       — automated bulk, high confidence
5. Stat profile eyeballing         — human noticed medic≠hmm via eff% difference
─── diminishing returns line ───
6. Behavioral fingerprinting       — for creative aliases (Phase 2)
7. Fellegi-Sunter automation       — for scale (Phase 3)
8. Leiden clustering               — for scale (Phase 3)
9. Phonetic matching               — probably never
```
