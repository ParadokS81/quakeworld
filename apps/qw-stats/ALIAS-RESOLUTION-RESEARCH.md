# Player Alias Resolution Research
## Entity Resolution for QuakeWorld 4on4

**Context:** 2,355 unique player names, estimated 800-1,000 real people. Per-game stats available (frags, kills, deaths, damage, weapon accuracy, armor control, survivability, item pickups). Players change names, use clan tags, use colored QW characters. Already normalized to lowercase ASCII. False merges worse than false splits. Must be human-reviewable.

---

## Table of Contents

1. [Record Linkage & Entity Resolution (Fellegi-Sunter)](#1-record-linkage--entity-resolution)
2. [Blocking Strategies](#2-blocking-strategies)
3. [Fuzzy Name Matching](#3-fuzzy-name-matching)
4. [Graph-Based Approaches](#4-graph-based-approaches)
5. [Statistical / Behavioral Fingerprinting](#5-statistical--behavioral-fingerprinting)
6. [Semi-Supervised & Human-in-the-Loop](#6-semi-supervised--human-in-the-loop)
7. [What Esports Platforms Do](#7-what-esports-platforms-do)
8. [Recommended Architecture for QW](#8-recommended-architecture-for-qw)
9. [Tools & Libraries](#9-tools--libraries)
10. [References](#10-references)

---

## 1. Record Linkage & Entity Resolution

### 1.1 The Fellegi-Sunter Model

**How it works:**

The Fellegi-Sunter (FS) model (1969) is the foundational framework for probabilistic record linkage. It treats every pair of records as belonging to one of two latent classes: *matches* (M) or *non-matches* (U). For each comparison field (e.g., name, team, stat similarity), the model estimates:

- **m-probability**: P(field agrees | true match) -- how often matching records agree on this field
- **u-probability**: P(field agrees | non-match) -- how often random non-matching records agree by chance

The **match weight** for each field is:

```
w = log2(m / u)      when fields agree
w = log2((1-m) / (1-u))  when fields disagree
```

The total score for a pair is the sum of all field weights. Two thresholds divide pairs into: definite matches (above upper threshold), definite non-matches (below lower threshold), and a "clerical review" zone between them.

**Parameter estimation** uses the EM algorithm (Expectation-Maximization), which iteratively estimates match/non-match probabilities without requiring labeled training data. This makes it **unsupervised** -- no ground truth needed to start.

**Key properties:**
- Equivalent to Naive Bayes classification under conditional independence
- Optimal decision rule under the conditional independence assumption (proven by Fellegi & Sunter)
- No training data required -- entirely unsupervised
- The "clerical review" zone maps directly to "human review" in our context

**Strengths for QW alias resolution:**
- No labeled data needed to bootstrap
- The clerical review zone is exactly what we want -- uncertain cases go to humans
- Well-understood, decades of research and tooling
- Can incorporate multiple comparison fields (name similarity, stat similarity, team co-occurrence)

**Weaknesses for QW alias resolution:**
- Assumes conditional independence between comparison fields (name similarity and team co-occurrence are definitely correlated for QW players)
- Classic FS treats comparison fields as binary agree/disagree, losing information (e.g., "paradoks" vs "paradokz" is much closer than "paradoks" vs "xantom")
- Does not natively handle the "cannot co-occur" constraint (two names in the same game = definitely different people)
- Quadratic pair space: C(2355, 2) = 2.77 million pairs (manageable but needs blocking)

**Extensions that matter for us:**
- **Fellegi-Sunter with term frequency adjustments**: Agreeing on a rare name ("xantom") is stronger evidence than agreeing on a common name ("player"). Splink implements this.
- **Comparison levels** (not just binary): Instead of agree/disagree, use graduated levels like "exact match / Jaro-Winkler > 0.9 / Jaro-Winkler > 0.7 / else". Each level gets its own m/u probabilities.
- **Log-linear extensions**: Add interaction terms to handle dependencies between fields.

**Implementation complexity:** Low-Medium. Splink handles all of this out of the box.

**References:**
- Fellegi, I.P. & Sunter, A.B. (1969). "A Theory for Record Linkage." *Journal of the American Statistical Association*, 64(328), 1183-1210.
- [Splink: Fellegi-Sunter Theory Guide](https://moj-analytical-services.github.io/splink/topic_guides/theory/fellegi_sunter.html)
- [The Mathematics of the Fellegi-Sunter Model](https://www.robinlinacre.com/maths_of_fellegi_sunter/)
- Binette & Steorts (2022). ["(Almost) All of Entity Resolution"](https://pmc.ncbi.nlm.nih.gov/articles/PMC11636688/), *Science Advances*.

### 1.2 Modern Probabilistic Record Linkage

The field has moved beyond classic FS:

**Bayesian approaches** (Steorts et al.) provide full posterior distributions over linkage structures, naturally handling transitivity (if A=B and B=C, then A=C). However, they scale poorly -- MCMC methods struggle above ~50K records. For 2,355 names this is feasible.

**Data-adaptive FS** incorporates missing data handling and field selection optimization, maintaining or improving F1-scores even with incomplete records.

**Supervised/semi-supervised extensions** use a small set of labeled pairs to improve on unsupervised EM estimation. Even a few hundred labeled pairs significantly improve quality.

---

## 2. Blocking Strategies

### Why Blocking Matters

Entity resolution is inherently O(n^2). With 2,355 names, that's ~2.77 million pairs. This is actually quite manageable for modern hardware, but blocking still helps by:
1. Reducing computation time
2. Reducing false positive noise
3. Focusing comparison on plausible candidates

For our scale (2,355 names), we could technically compare all pairs. But blocking improves signal-to-noise ratio.

### 2.1 Standard Blocking

**How it works:** Partition records into blocks using a blocking key. Only compare records within the same block. Example: block on first two characters of name.

**For QW:** Block on `name[0:2]`, `name[0:3]`, or phonetic code of name. Problem: completely misses alias changes that share no name characters (e.g., "carapace" and "apa").

### 2.2 Sorted Neighborhood

**How it works:** Sort all records by a blocking key. Slide a window of size W over the sorted list. Compare all records within the window. Multiple passes with different sort keys catch different matches.

**For QW:** Sort by name, slide window W=10. Pass 1: sort by name. Pass 2: sort by most-played team. Pass 3: sort by primary weapon preference. Each pass catches different potential matches.

**Strengths:** Simple, catches near-matches, multiple passes compensate for single-key limitations.
**Weaknesses:** Window size is arbitrary. Sensitive to sort key choice.

**Reference:** Hernandez & Stolfo (1995). "The Merge/Purge Problem for Large Databases." *SIGMOD*.

### 2.3 Canopy Clustering

**How it works:** Use a cheap similarity measure (e.g., trigram overlap on names) to create overlapping "canopies." Each canopy is a loose cluster. Then apply expensive comparison (stat fingerprinting, full FS model) only within canopies.

Two thresholds: T1 (loose, includes in canopy) and T2 (tight, removes from pool). Records can belong to multiple canopies, ensuring matches aren't missed.

**For QW:** Use trigram name similarity as the cheap measure to create canopies, then full multi-signal comparison within canopies. Additionally, create canopies based on team co-occurrence (players who ever played on the same team).

**Strengths:** Overlapping canopies mean fewer missed matches than hard blocking.
**Weaknesses:** Threshold selection matters. Won't catch aliases with completely different names unless supplemented with non-name canopies.

**Reference:** McCallum, Nigam & Ungar (2000). "Efficient Clustering of High-Dimensional Data Sets with Application to Reference Matching." *KDD*.

### 2.4 Recommended Blocking for QW

Given our small scale (~2,355 records), use **multi-pass union blocking**:

1. **Name-prefix blocks**: First 3 characters of normalized name
2. **Phonetic blocks**: Metaphone code of alphabetic portion of name
3. **Team co-occurrence blocks**: Any two names that ever appeared on the same team
4. **Stat-profile blocks**: Cluster by primary weapon preference + skill tier

Take the **union** of all blocking passes. Any pair that shares at least one block gets compared. This maximizes recall at modest computational cost (at 2,355 records, even comparing all pairs is feasible as a fallback).

**Reference:** Christen, P. (2012). "A Survey of Indexing Techniques for Scalable Record Linkage and Deduplication." *IEEE TKDE*.

---

## 3. Fuzzy Name Matching

### 3.1 Edit Distance: Levenshtein

**How it works:** Count the minimum number of single-character insertions, deletions, or substitutions to transform string A into string B.

```
levenshtein("paradoks", "paradokz") = 1   (substitute s->z)
levenshtein("paradoks", "para") = 4        (delete 4 chars)
levenshtein("xantom", "phantom") = 2       (substitute x->p, insert h)
```

Normalized: `1 - (distance / max(len(a), len(b)))` gives a 0-1 similarity score.

**Strengths:** Intuitive, well-understood, catches typos and minor variations.
**Weaknesses:** Poor for short strings (1 edit on a 4-char name = 0.75 similarity). Does not handle transpositions efficiently (ab->ba = 2 edits). Completely fails for creative alias changes.

**Damerau-Levenshtein** adds transposition as a 4th operation (cost 1 instead of 2), better for typos like "teh" -> "the".

**For QW:** Good for catching minor name variants (paradoks/paradokz, xantom/xantoom). Useless for major alias changes (carapace/apa). Use as one signal among many, not the primary one.

**Threshold recommendation:** Normalized similarity > 0.8 for "likely same root name," > 0.9 for "near-certain variant."

### 3.2 Jaro-Winkler Similarity

**How it works:** The Jaro similarity counts matching characters (within a distance window) and transpositions, producing a 0-1 score. Winkler's extension adds a prefix bonus: if the first 1-4 characters match, the score is boosted. This reflects the empirical observation that name variants more often preserve the beginning.

```
jaro_winkler("paradoks", "paradokz") ≈ 0.96  (high: prefix matches)
jaro_winkler("xantom", "phantom")    ≈ 0.72  (lower: prefix differs)
jaro_winkler("carapace", "apa")      ≈ 0.47  (low: very different)
```

**Strengths:** Specifically designed for person names. Prefix weighting is useful for gaming aliases (players often keep a recognizable prefix). Fewer false positives than Levenshtein for name matching. Score is naturally normalized [0, 1].

**Weaknesses:** Prefix weighting can mislead when players intentionally change prefix. Short strings still problematic. No semantic understanding.

**For QW:** Best single metric for name comparison. Use threshold of ~0.85 for blocking, ~0.92 for high-confidence match. The prefix weighting is especially useful because QW players often keep name roots ("para", "xan", "cara") even when changing suffixes.

**Threshold recommendation (from Splink):** 0.9 = high confidence, 0.8 = medium confidence, < 0.7 = likely different.

### 3.3 N-gram / Dice Coefficient

**How it works:** Break both strings into overlapping n-character substrings (n-grams). Compute similarity as the overlap of the n-gram sets.

**Dice coefficient:** `2 * |shared n-grams| / (|n-grams in A| + |n-grams in B|)`

```
bigrams("paradoks") = {pa, ar, ra, ad, do, ok, ks}
bigrams("paradokz") = {pa, ar, ra, ad, do, ok, kz}
shared = {pa, ar, ra, ad, do, ok} = 6
dice = 2*6 / (7+7) = 0.857

trigrams("paradoks") = {par, ara, rad, ado, dok, oks}
trigrams("paradokz") = {par, ara, rad, ado, dok, okz}
shared = {par, ara, rad, ado, dok} = 5
dice = 2*5 / (6+6) = 0.833
```

**Strengths:** Order-insensitive at the character level (good for rearranged name parts). Handles insertions/deletions gracefully. Works well with short strings.

**Weaknesses:** As n-gram length increases, matching becomes stricter. Purely syntactic, no semantic understanding.

**For QW:** Good complement to Jaro-Winkler. Bigrams catch name fragments even when order changes. One useful trick: bigrams treat "jones smith" and "smith jones" as identical (word order doesn't matter), which helps with clan tag repositioning (e.g., "[sr]para" vs "para[sr]").

**Blend recommendation:** Use 2/3 bigram + 1/3 trigram Dice for a balanced score.

**Library:** [string-similarity (JS)](https://github.com/aceakash/string-similarity) implements Dice coefficient.

### 3.4 Phonetic Matching (Soundex, Metaphone, Double Metaphone)

**How it works:**

- **Soundex** (1918): Encodes a name to a 4-character code based on English consonant pronunciation. "Philip" and "Phillip" both become "P410."
- **Metaphone** (1990): Improved version, handles more pronunciation rules. Variable-length code. Processes the entire word, not just first letter + 3 consonants.
- **Double Metaphone** (2000): Generates two codes per word (primary and alternate pronunciation). Handles non-English origins (Slavic, Celtic, French, Spanish, Germanic, Chinese).

**Strengths:** Catches pronunciation-based variations (phantom/fantom, xantom/zantom). Useful when players choose aliases based on how they "sound."

**Weaknesses:** Catastrophic with non-alphabetic characters. Gaming aliases are full of numbers, special characters, and leetspeak. Soundex only considers first 4 sounds. Metaphone returns empty encoding for all-numeric strings. Neither handles "1337speak" (sh4d0w, h4x0r).

**For QW after normalization:**
Since we've already normalized to lowercase ASCII, phonetic matching is moderately useful. It will catch pronunciation variants but not:
- Number substitutions (need separate leetspeak normalization: 4->a, 3->e, 1->i/l, 0->o)
- Completely different creative aliases
- Very short names (3-4 chars) where the phonetic code has little discriminating power

**Pre-processing needed:** Before phonetic comparison, apply leetspeak normalization:
```
0 -> o, 1 -> i/l, 3 -> e, 4 -> a, 5 -> s, 7 -> t, 8 -> b, @ -> a, $ -> s
```

**Implementation complexity:** Low. Python's `jellyfish` library provides `soundex()`, `metaphone()`, `nysiis()`.

**For QW:** Use as a supplementary blocking signal, not a primary comparator. Double Metaphone is the best choice among phonetic algorithms.

### 3.5 QW-Specific Name Preprocessing

Before any fuzzy matching, apply QW-specific normalization:

1. **Already done:** Lowercase, ASCII normalization (strips QW color codes)
2. **Strip clan tags:** Remove common patterns: `[tag]name`, `name[tag]`, `{tag}name`, `.tag.name`, `-tag-name`
3. **Leetspeak normalization:** 4->a, 3->e, 0->o, 1->i, 5->s, 7->t
4. **Strip decorators:** Remove leading/trailing dots, underscores, x's ("xXnameXx" -> "name")
5. **Extract "core name":** The portion remaining after all stripping

This gives us TWO name fields to compare: the full normalized name, and the extracted core name. The core name comparison will have much higher signal for detecting same-player aliases.

### 3.6 Which Metric Works Best for QW Aliases?

**Recommendation: Use multiple metrics at different comparison levels (Splink-style).**

| Level | Criteria | Weight |
|-------|----------|--------|
| 1 (exact) | Core names identical | Highest |
| 2 (near) | Jaro-Winkler(core) >= 0.92 | High |
| 3 (moderate) | Jaro-Winkler(core) >= 0.80 OR Dice bigram >= 0.7 | Medium |
| 4 (phonetic) | Same Double Metaphone code | Low-Medium |
| 5 (else) | All other | Negative weight |

This graduated approach is much more powerful than any single threshold.

---

## 4. Graph-Based Approaches

### 4.1 Building the Co-occurrence Graph

**Core idea:** Construct a graph where nodes are player names and edges represent evidence of relationship. Edge types and weights encode different signals:

**Positive evidence edges (these names might be the same person):**
- Name similarity (Jaro-Winkler > threshold)
- Stat profile similarity (cosine similarity of feature vectors)
- Team co-occurrence (played on the same team across different time periods -- suggests knowledge of the team)
- Temporal succession (one name stops appearing, another starts, on the same teams)

**Negative evidence edges / constraints (these names are definitely different people):**
- **Co-occurrence in same game**: If two names appear in the same match, they are definitively different players. This is the "cannot-link" constraint.

The graph encodes the problem: find clusters where within-cluster edges are strongly positive and cross-cluster edges are neutral or negative.

### 4.2 Connected Components (Baseline)

**How it works:** Add edges only for high-confidence matches (e.g., Jaro-Winkler > 0.95 AND stat similarity > 0.9 AND no co-occurrence violation). Find connected components. Each component is one player.

**Algorithm:** BFS/DFS from each unvisited node. O(V + E).

**Strengths:** Simple, fast, deterministic. Produces clean, non-overlapping clusters. Easy to explain and review.

**Weaknesses:** Binary edge decision loses nuance. A single false edge can merge two clusters catastrophically (and false merges are worse than false splits for us). No way to incorporate edge weights or confidence.

**For QW:** Good as a first pass for high-confidence merges only. Use very strict thresholds to avoid false merges. Then refine with community detection for the uncertain cases.

### 4.3 Louvain Algorithm

**How it works:** Greedy modularity optimization in two alternating phases:
1. **Local moving:** Each node is moved to the neighboring community that produces the greatest modularity gain. Repeat until no more gains.
2. **Aggregation:** Collapse each community into a single node. Edge weights between communities become the sum of inter-community edges.
Repeat phases 1-2 on the aggregated graph until convergence.

**Modularity** measures the density of edges within communities compared to a random graph with the same degree sequence. Higher modularity = denser within-community edges.

**Strengths:** Fast (near-linear time). No need to specify number of clusters. Works on weighted graphs. Hierarchical decomposition.

**Weaknesses:**
- **Resolution limit:** May merge small communities into larger ones, hiding sub-structure. For our use case, this means small alias sets (2-3 names) might get merged with nearby clusters.
- **Badly connected communities:** Louvain can produce communities that are internally disconnected -- up to 25% of communities can be badly connected.
- **Non-deterministic:** Different runs can produce different results.

**For QW:** The resolution limit is a real concern. With ~1,000 real players and ~2,355 names, most alias clusters are size 2-3. Louvain might merge nearby small clusters, creating false merges. Use Leiden instead.

**Implementations:** [NetworkX (Python)](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html), [Graphology (JavaScript)](https://graphology.github.io/standard-library/communities-louvain.html), [Neo4j GDS](https://neo4j.com/docs/graph-data-science/current/algorithms/louvain/).

**Reference:** Blondel et al. (2008). "Fast unfolding of communities in large networks." *J. Stat. Mech.*

### 4.4 Leiden Algorithm (Preferred)

**How it works:** Improvement over Louvain with three phases:
1. **Local moving** (same as Louvain)
2. **Refinement:** Communities may be split to ensure they are well-connected. This directly addresses Louvain's badly-connected-community problem.
3. **Aggregation** on the refined partition.

**Key improvement:** Leiden guarantees that all identified communities are both *well-separated* and *well-connected*. Louvain only guarantees well-separated.

**Can optimize Constant Potts Model (CPM)** instead of modularity. CPM does not suffer from the resolution limit, meaning it can detect small communities (2-3 node alias clusters) without merging them into larger ones.

**Strengths over Louvain:**
- Guaranteed well-connected communities
- Faster convergence
- No resolution limit when using CPM
- Better for small communities (exactly our use case)

**For QW:** The best graph clustering choice. Use CPM quality function with a resolution parameter tuned to produce clusters of size 2-5 (typical alias set size). The guarantee of well-connected communities means no false merges from disconnected sub-clusters.

**Implementations:** [igraph (Python/R)](https://r.igraph.org/reference/cluster_leiden.html), leidenalg Python package.

**Reference:** Traag, V.A., Waltman, L. & van Eck, N.J. (2019). ["From Louvain to Leiden: guaranteeing well-connected communities."](https://www.nature.com/articles/s41598-019-41695-z) *Scientific Reports* 9, 5233.

### 4.5 Label Propagation

**How it works:** Initialize each node with a unique label. In each iteration, each node adopts the label that is most common among its neighbors (weighted by edge weight). Repeat until convergence. Ties broken randomly.

**Strengths:** Near-linear time complexity. No parameters needed. Very simple to implement.

**Weaknesses:** Non-deterministic (random tie-breaking). May not converge. Can produce trivially large communities. No unique solution -- produces an aggregate of many possible solutions.

**For QW with seeded labels:** The key feature for our use case is **semi-supervised label propagation**. If we seed some nodes with known labels (from community knowledge -- "paradoks" and "para" are the same person), those labels propagate through the graph to nearby uncertain nodes. The seeded labels are held fixed while unlabeled nodes update.

This directly maps to: "start with community-contributed known aliases, propagate to discover more."

**Reference:** Raghavan, Albert & Kumara (2007). "Near linear time algorithm to detect community structures in large-scale networks." *Physical Review E*.

### 4.6 Incorporating Cannot-Link Constraints

The fact that **two names in the same game are definitively different people** is extremely powerful. This is a hard "cannot-link" constraint in the constrained clustering literature.

**Approaches:**

1. **COP-KMeans style:** During community assignment, reject any assignment that would place two co-occurring names in the same cluster. Hard constraint -- if no valid assignment exists, the algorithm stops.

2. **Soft constraints with penalty:** Assign a large negative weight to edges between co-occurring names. Community detection naturally separates them, but doesn't guarantee it.

3. **Post-processing validation:** After clustering, check all clusters for co-occurrence violations. Split any violating cluster using the co-occurrence graph as a separator.

**Recommendation for QW:** Use approach 3 (post-processing validation) because:
- It's simplest to implement and debug
- It's deterministic
- It provides clear, human-reviewable explanations ("these two names appeared in the same game on 2026-01-15, so they cannot be the same person")
- The cannot-link constraint is binary and absolute -- no fuzziness

**References:**
- Wagstaff et al. (2001). "Constrained K-means Clustering with Background Knowledge." *ICML*.
- [Constrained Clustering - Wikipedia](https://en.wikipedia.org/wiki/Constrained_clustering)
- Babaki et al. (2024). ["An Algorithm for Clustering with Confidence-Based Must-Link and Cannot-Link Constraints."](https://arxiv.org/abs/2212.14437) *INFORMS Journal on Computing*.

---

## 5. Statistical / Behavioral Fingerprinting

### 5.1 The Core Idea

Every player has a unique "playstyle fingerprint" -- a characteristic distribution across weapon usage, accuracy, aggression, item control, and movement. If two different names produce statistically similar fingerprints across multiple games, they may be the same person.

This is the most powerful signal for cases where name similarity fails entirely (complete alias change).

### 5.2 Feature Vector Construction

From the ktxstats data available via QWHub, construct a per-name feature vector averaging across all games:

**Weapon preference profile (normalized to sum to 1):**
```
[rl_damage_share, lg_damage_share, sg_damage_share, ssg_damage_share, gl_damage_share, ng_damage_share]
```
Where `weapon_damage_share = weapon_enemy_damage / total_enemy_damage`

**Accuracy profile:**
```
[rl_accuracy, lg_accuracy, sg_accuracy]
```
Where accuracy = hits / attacks for each weapon.

**Aggression/style metrics:**
```
[
  efficiency,              // kills / (kills + deaths)
  damage_ratio,            // damage_given / damage_taken
  spawn_frag_rate,         // spawn_frags / kills
  avg_speed,               // movement speed
  max_speed,               // peak movement speed
  team_damage_rate,        // team_damage / total_damage_given
  suicide_rate,            // suicides / deaths
]
```

**Item control profile:**
```
[
  ra_takes_per_minute,     // red armor pickups / game_minutes
  ya_takes_per_minute,     // yellow armor pickups / game_minutes
  mega_takes_per_minute,   // megahealth pickups / game_minutes
  quad_takes_per_minute,   // quad pickups / game_minutes
  ra_time_share,           // ra_hold_time / game_duration
]
```

**Survivability:**
```
[
  damage_taken_to_die,     // avg damage absorbed per death
  ewep,                    // enemy weapon damage absorbed
]
```

**Total: ~20-dimensional feature vector per player name.**

### 5.3 Similarity Metrics

#### Cosine Similarity

**How it works:** Measures the angle between two feature vectors, ignoring magnitude.

```
cos(A, B) = (A . B) / (|A| * |B|)
```

Range: [-1, 1] for general vectors, [0, 1] for non-negative vectors (ours are all non-negative).

**Why it works for us:** Two players might have different overall stat magnitudes (one plays more cautiously, one more aggressively) but the *pattern* of their stats -- which weapons they prefer, relative accuracy levels -- is what identifies them. Cosine similarity captures pattern similarity regardless of magnitude.

**Threshold guidance:** In player fingerprinting, cosine similarity > 0.95 between two players' stat profiles is strong evidence of being the same person (assuming sufficient game count). > 0.90 is suggestive. Below 0.85 is weak evidence.

**Caveats:**
- Need sufficient games per name (minimum ~10-15 games) for stable statistics
- Player skill evolves over time -- a player might improve or decline
- Different roles on different teams (carry vs support) can shift the profile
- Map-specific stats vary significantly (DM2 vs DM3 vs E1M2 reward different weapons)

#### KL Divergence / Jensen-Shannon Divergence

**How it works:** KL divergence measures how one probability distribution diverges from another:

```
KL(P || Q) = sum( P(x) * log(P(x) / Q(x)) )
```

It's asymmetric (KL(P||Q) != KL(Q||P)) and undefined when Q(x) = 0 for any x where P(x) > 0.

**Jensen-Shannon divergence (JSD)** is the symmetrized, smoothed version:
```
JSD(P, Q) = 0.5 * KL(P || M) + 0.5 * KL(Q || M)
where M = 0.5 * (P + Q)
```

Range: [0, 1] (using log base 2). 0 = identical distributions, 1 = maximally different.

**When to use which:**
- **Cosine similarity** for raw feature vectors (accuracy, speed, damage ratios)
- **JSD** for probability distributions (weapon damage shares, item pickup distributions)

The weapon damage share profile is naturally a probability distribution (sums to 1), making JSD the theoretically correct metric. In practice, cosine similarity on the full feature vector works nearly as well and is simpler.

#### Euclidean Distance (with normalization)

After z-score normalization of each feature (subtract mean, divide by std across all players), Euclidean distance in the normalized space works well. However, it's sensitive to outliers and to features with different variances -- which z-scoring addresses.

### 5.4 Handling Confounders

**Problem: Map effects.** A player's weapon profile on DM2 (rocket-heavy) differs dramatically from DM3 (lightning-heavy). Comparing a player who only plays DM2 against one who only plays DM3 would show low similarity even if they're the same person.

**Solution:** Compute map-specific profiles and compare within-map. Or use map-residualized stats: for each stat, subtract the map average. This removes the "map effect" and isolates the player-specific component.

**Problem: Skill evolution.** Players improve or decline over years.

**Solution:** Compare within overlapping time windows. If name A was active 2023-2024 and name B was active 2024-2025, compare their 2024 stats.

**Problem: Team role variation.** A player might take different roles on different teams.

**Solution:** Weight recent games more heavily. Use role-invariant features (accuracy is role-invariant; item control is not).

**Problem: Insufficient data.** Names with < 5 games have unreliable stat profiles.

**Solution:** Set a minimum game count (10-15) for stat-based comparison. For names with fewer games, rely on other signals (name similarity, team co-occurrence).

### 5.5 Dimensionality Reduction

With ~20 features, we can optionally use PCA to reduce to the top 5-8 principal components. This:
- Removes noise from correlated features
- Makes visualization possible (plot players in 2D/3D space)
- Speeds up distance computation (marginal at this scale)

For 2,355 names, PCA is optional but visualization is valuable for human review.

### 5.6 Academic References

- ["Game Telemetry as Biometric Signatures"](https://videogamedatascience.medium.com/game-telemetry-as-biometric-signatures-39f42841373d) -- in-game behavioral data as biometric identifiers
- ["Fair Play and Identity: In-Game Behavioral Biometrics for Player Identification in Competitive Online Games"](https://ieeexplore.ieee.org/document/11114281/) -- IEEE, 2024/2025
- ["Comparison of similarity measures to differentiate players' actions and decision-making profiles in serious games analytics"](https://www.sciencedirect.com/science/article/abs/pii/S0747563216305143) -- ScienceDirect
- ["Assessment of Video Games Players and Teams Behaviour via Sensing and Heterogeneous Data Analysis"](https://www.researchgate.net/publication/351796869) -- ResearchGate
- Riot Games, ["VALORANT Systems Health Series - Smurf Detection"](https://playvalorant.com/en-us/news/dev/valorant-systems-health-series-smurf-detection/) -- practical smurf detection via behavioral analysis

---

## 6. Semi-Supervised & Human-in-the-Loop

### 6.1 Seeding with Known Aliases

**The approach:** Start with community-contributed ground truth: "these names are the same person." This is the **must-link** seed set. In QW, community veterans know many aliases. Even 50-100 known alias pairs dramatically improve resolution quality.

**How to use seeds:**
1. **Train the FS model:** Use known pairs as positive examples and co-occurring-in-same-game pairs as negative examples. EM estimation converges faster and more accurately with this initialization.
2. **Constrained clustering:** Fix known alias pairs as must-link constraints. The clustering algorithm respects these while finding additional structure.
3. **Label propagation:** Assign known identities as fixed labels. Propagate through the similarity graph to discover new aliases.

### 6.2 Active Learning

**How it works:** Instead of randomly selecting pairs for human review, select the *most informative* pairs -- those where the model is most uncertain. This maximizes the information gained per human label.

**Informativeness strategies:**
- **Uncertainty sampling:** Pick pairs closest to the match/non-match decision boundary
- **Query-by-committee:** Train multiple models, pick pairs where models disagree
- **Expected model change:** Pick pairs that would most change the model if labeled

**For QW:** Uncertainty sampling is simplest and most effective. After initial model training, present the "borderline" pairs to a human reviewer:

```
"Is 'xantom' (active 2022-2024, ]sr[, RL accuracy 14%)
 the same person as
 'phantom' (active 2023-2025, ]sr[, RL accuracy 12%)?"

 Model confidence: 0.52 (uncertain)
 Evidence: Name Jaro-Winkler 0.72, Same team, Stat cosine 0.89
```

A few hundred such reviews can dramatically improve the model.

### 6.3 SystemER: Explainable Entity Resolution

SystemER is an academic system that learns *explainable rules* for entity resolution with human-in-the-loop active learning. Key features:
- Rules are human-comprehensible (not black-box ML)
- Domain experts can verify and customize rules
- Initial labeled data is optional
- Small number of labeled examples sufficient for high quality

This maps well to our requirement of human-reviewable results.

**Reference:** Qian et al. (2019). ["SystemER: a human-in-the-loop system for explainable entity resolution."](https://dl.acm.org/doi/10.14778/3352063.3352068) *VLDB*, 12(12).

### 6.4 The Virtuous Cycle

The recommended workflow:

1. **Bootstrap:** Use unsupervised FS model + graph clustering to find initial high-confidence merges
2. **Validate:** Present merges to community reviewers. They confirm or reject.
3. **Seed:** Confirmed merges become must-link constraints. Rejections become cannot-link constraints.
4. **Retrain:** Re-run model with new constraints. Produces better results with more uncertain pairs pushed to review.
5. **Repeat:** Each cycle improves quality. After 3-4 cycles, most aliases are resolved.

This is essentially the Dedupe library's workflow, adapted for our domain.

### 6.5 Implementation: Review Interface

For human reviewers, present:
- Both player names with their team histories (timeline view)
- Stat comparison side-by-side (radar chart of key stats)
- Activity timeline (when each name was active -- non-overlapping is evidence for same person)
- Co-occurrence check (ever in the same game? instant disqualification)
- Model's confidence score and top evidence factors

Decisions: **Merge** (same person), **Split** (different people), **Unsure** (need more evidence).

**Reference:**
- Bilenko, M.Y. (2006). *Learnable Similarity Functions and their Application to Record Linkage and Clustering.* Ph.D. dissertation, UT Austin. (Theoretical basis for Dedupe library)
- ["Enhancing Entity Resolution with a hybrid Active Machine Learning framework"](https://www.sciencedirect.com/science/article/abs/pii/S0306437924000681) -- ScienceDirect, 2024.

---

## 7. What Esports Platforms Do

### 7.1 HLTV (Counter-Strike)

**Approach:** Manual editorial curation backed by persistent numeric IDs.

- Every player profile has a unique numeric ID (e.g., player/6137)
- Display names can change, but the ID stays constant
- When a player changes their nickname (device -> devve -> dev1ce), HLTV staff manually update the profile
- Real names are documented alongside aliases
- All historical stats are aggregated under the single profile
- Tournament organizers enforce "official" nicknames (especially since Major stickers), reducing the alias problem

**Relevance:** Manual curation works at HLTV scale because pro CS has ~2,000-3,000 notable players, and name changes are infrequent. Our QW community has a similar scale (~1,000 players) but much more frequent name changes without tournament enforcement.

**Source:** [HLTV Player Statistics](https://www.hltv.org/stats/players), [HLTV Wikipedia](https://en.wikipedia.org/wiki/HLTV)

### 7.2 Liquipedia (Multi-game Wiki)

**Approach:** Community-curated wiki with structured alias tracking.

- Each player has a wiki page with real name, all known aliases, team history
- The StarCraft: Brood War wiki has a dedicated [Ladder/Alternate IDs](https://liquipedia.net/starcraft/Ladder/Alternate_IDs) page tracking anonymous ladder aliases used by pros
- Community volunteers identify aliases through gameplay analysis, stream watching, and insider knowledge
- Documented cases of identity fraud (e.g., Oversky playing under Ilnp's alias)

**Relevance:** Closest to our situation. Community knowledge is the primary source. Their process is purely manual -- no automated systems. We can improve on this with automated candidate generation + community validation.

**Source:** [Liquipedia](https://liquipedia.net), [Liquipedia Wikipedia](https://en.wikipedia.org/wiki/Liquipedia)

### 7.3 Steam

**Approach:** Immutable SteamID with voluntary display name changes tracked.

- Every account has permanent identifiers: SteamID, Steam64 ID, Steam3 ID
- Display name can change freely, limited history of last 10 names shown
- Third-party services ([SteamID.uk](https://steamid.uk/), [SteamHistory.net](https://steamhistory.net/)) scrape and archive full name histories
- The official Steam Web API only returns current name, not history

**Relevance:** Steam solves identity by having a persistent account system. QW predates this -- original QuakeWorld has no account system at all. QuakeWorld Hub's `players` table has `qw_auth` (QuakeWorld authentication) but not all players use it. This is the closest thing QW has to a SteamID, but adoption is incomplete.

### 7.4 FACEIT

**Approach:** Account system with ELO rating persistence.

- Players link their Steam account to FACEIT
- FACEIT profile persists across name changes (uses Steam ID as anchor)
- [FACEITFinder](https://faceitfinder.com/) can find FACEIT accounts from Steam IDs and detect linked smurf accounts with VAC bans
- [HLTV-FACEIT integration](https://www.hltv.org/news/37890/faceit-integration-goes-live-on-hltv) connects profiles across platforms

**Relevance:** FACEIT's approach (link to persistent account) is the gold standard but requires player adoption. For QW, we could encourage `qw_auth` adoption as the equivalent.

### 7.5 Riot Games (Valorant/LoL Smurf Detection)

**Approach:** Behavioral ML for smurf detection.

- Analyzes headshot percentages, reaction times, movement patterns, agent selection
- New accounts on devices previously linked to high-ranked accounts face increased scrutiny
- Uses performance trajectory (how fast does a new account reach high skill?)
- Result: smurf counts dropped ~17%, smurfs reach correct MMR 2-3x faster

**Relevance:** Their stat-based fingerprinting approach directly applies to our stat profile comparison. The key insight: experienced players have characteristic stat patterns that persist across accounts. Their approach is purely automated at scale; ours can be semi-automated with human review.

**Source:** [Valorant Smurf Detection](https://playvalorant.com/en-us/news/dev/valorant-systems-health-series-smurf-detection/)

### 7.6 QuakeWorld-Specific: QWHub and QWiki

- **QWHub** (`hub.quakeworld.nu`): Records every game with full stats. Has a `players` table with id, name, slug, `qw_auth`. The `qw_auth` field is the closest thing to a persistent identifier, but not all players have it.
- **QWiki** (`quakeworld.nu/wiki`): Community-maintained player database with [614 Finnish players, 641 Polish, 443 German, etc.](https://www.quakeworld.nu/wiki/Category:Players)
- **stats.quakeworld.nu**: Dedicated statistics site
- **[quake-stats (GitHub)](https://github.com/krychu/quake-stats)**: Open-source player stats/boards for QW

The QW community already has fragmented identity knowledge spread across these resources. Consolidating this into a systematic alias resolution system is the opportunity.

---

## 8. Recommended Architecture for QW

### 8.1 Pipeline Overview

```
Phase 1: Data Preparation
  ├── Pull all player names from QWHub (2,355 unique names)
  ├── Normalize names (already done: lowercase ASCII)
  ├── Extract core names (strip clan tags, leetspeak, decorators)
  ├── Compute per-name stat profiles (average across all games, min 10 games)
  └── Build co-occurrence matrix (which names appeared in same game)

Phase 2: Blocking & Candidate Generation
  ├── Name-similarity blocking (Jaro-Winkler on core name > 0.7)
  ├── Team co-occurrence blocking (ever on same team)
  ├── Phonetic blocking (same Double Metaphone code)
  └── Union of all blocks → candidate pairs

Phase 3: Pairwise Scoring
  ├── Name similarity score (Jaro-Winkler + Dice on core name)
  ├── Stat profile similarity (cosine similarity of feature vectors)
  ├── Team overlap score (Jaccard of team sets)
  ├── Temporal pattern score (activity overlap vs succession)
  └── Combine via Fellegi-Sunter weights → match probability per pair

Phase 4: Clustering
  ├── Build weighted graph from scored pairs
  ├── Add cannot-link edges (co-occurred in same game)
  ├── Apply Leiden clustering (CPM quality function)
  └── Post-process: validate no cluster contains co-occurring names

Phase 5: Human Review
  ├── High-confidence clusters (>0.95) → auto-merge, flag for spot-check
  ├── Medium-confidence clusters (0.7-0.95) → present to community reviewers
  ├── Low-confidence singletons → leave as-is
  └── Reviewer decisions feed back as must-link / cannot-link constraints

Phase 6: Iteration
  ├── Retrain with new constraints
  ├── Re-cluster
  ├── New uncertain pairs → review
  └── Repeat until convergence (typically 3-4 cycles)
```

### 8.2 Priority of Signals

For QW specifically, ranked by discriminating power:

1. **Cannot-link (co-occurrence):** Absolute. Two names in the same game = different people. This is the most valuable signal because it's binary and error-free.
2. **Must-link (community knowledge):** Very high. Community veterans' confirmed aliases.
3. **Stat fingerprinting:** High. Weapon preference + accuracy profiles are surprisingly unique across 1,000 players. Best signal for complete alias changes.
4. **Team co-occurrence + temporal succession:** High. One name disappears from a team, another appears -- strong signal.
5. **Name similarity (core name):** Medium-High. Catches variants but misses creative changes.
6. **Temporal exclusion:** Medium. Two names with non-overlapping activity periods are more likely the same person (necessary but not sufficient).
7. **Phonetic similarity:** Low. Supplementary blocking signal only.

### 8.3 False Merge Protection

Since false merges are worse than false splits:

1. **Conservative thresholds:** Default to "split" in ambiguous cases
2. **Cannot-link hard enforcement:** Never merge names that co-occurred in a game, regardless of other evidence
3. **Human review for all medium-confidence merges:** Only auto-merge at very high confidence
4. **Undo capability:** Every merge must be reversible
5. **Cluster size limits:** Flag any cluster > 5 names for manual review (most players have 1-4 aliases)

---

## 9. Tools & Libraries

### Python Tools

| Tool | Purpose | Scale | Learning | Best For |
|------|---------|-------|----------|----------|
| **[Splink](https://github.com/moj-analytical-services/splink)** | Probabilistic record linkage | 100M+ | Unsupervised (EM) | Our primary FS implementation |
| **[Dedupe](https://github.com/dedupeio/dedupe)** | Entity resolution | Millions | Active learning | Human-in-the-loop workflow |
| **[recordlinkage](https://recordlinkage.readthedocs.io/)** | Record linkage toolkit | Small-Medium | Both | Prototyping, research |
| **[NetworkX](https://networkx.org/)** | Graph algorithms | Medium | N/A | Graph construction, connected components |
| **[igraph](https://igraph.org/)** | Graph algorithms | Large | N/A | Leiden clustering |
| **[leidenalg](https://leidenalg.readthedocs.io/)** | Leiden algorithm | Large | N/A | Community detection |
| **[jellyfish](https://github.com/jamesturk/jellyfish)** | String comparison | Any | N/A | Jaro-Winkler, Soundex, Metaphone |
| **[RapidFuzz](https://github.com/maxbachmann/RapidFuzz)** | Fast fuzzy matching | Any | N/A | Levenshtein, Jaro-Winkler at scale |
| **scikit-learn** | ML utilities | Any | Both | PCA, cosine similarity, clustering |

### JavaScript Tools (for in-browser review UI)

| Tool | Purpose |
|------|---------|
| **[string-similarity](https://github.com/aceakash/string-similarity)** | Dice coefficient string comparison |
| **[Graphology](https://graphology.github.io/)** | Graph data structure + Louvain community detection |
| **[fuse.js](https://fusejs.io/)** | Fuzzy search for name lookup |

### Recommended Stack

For a QW alias resolution project:

1. **Python pipeline** (offline processing):
   - Splink for probabilistic record linkage
   - RapidFuzz for name comparison
   - scikit-learn for stat fingerprinting (cosine similarity, PCA)
   - leidenalg for graph clustering
   - NetworkX for graph construction and connected components

2. **Review interface** (web-based):
   - Present candidate merges with evidence
   - Side-by-side stat comparison
   - Activity timelines
   - Accept/reject/unsure buttons
   - Feed decisions back to Python pipeline

---

## 10. References

### Foundational Papers

1. Fellegi, I.P. & Sunter, A.B. (1969). "A Theory for Record Linkage." *JASA*, 64(328), 1183-1210.
2. Hernandez, M.A. & Stolfo, S.J. (1995). "The Merge/Purge Problem for Large Databases." *ACM SIGMOD*.
3. McCallum, A., Nigam, K. & Ungar, L.H. (2000). "Efficient Clustering of High-Dimensional Data Sets with Application to Reference Matching." *KDD*.
4. Bilenko, M.Y. (2006). *Learnable Similarity Functions and their Application to Record Linkage and Clustering.* Ph.D. dissertation, UT Austin.

### Surveys & Overviews

5. Binette, O. & Steorts, R.C. (2022). ["(Almost) All of Entity Resolution."](https://pmc.ncbi.nlm.nih.gov/articles/PMC11636688/) *Science Advances*.
6. Christen, P. (2012). "A Survey of Indexing Techniques for Scalable Record Linkage and Deduplication." *IEEE TKDE*.
7. Papadakis, G. et al. (2019). ["A Survey of Blocking and Filtering Techniques for Entity Resolution."](https://arxiv.org/pdf/1905.06167) *arXiv*.

### Community Detection

8. Blondel, V.D. et al. (2008). "Fast unfolding of communities in large networks." *J. Stat. Mech.*
9. Traag, V.A., Waltman, L. & van Eck, N.J. (2019). ["From Louvain to Leiden: guaranteeing well-connected communities."](https://www.nature.com/articles/s41598-019-41695-z) *Scientific Reports* 9, 5233.
10. Raghavan, U.N., Albert, R. & Kumara, S. (2007). "Near linear time algorithm to detect community structures in large-scale networks." *Phys. Rev. E*.

### Constrained Clustering

11. Wagstaff, K. et al. (2001). "Constrained K-means Clustering with Background Knowledge." *ICML*.
12. Babaki, B. et al. (2024). ["An Algorithm for Clustering with Confidence-Based Must-Link and Cannot-Link Constraints."](https://arxiv.org/abs/2212.14437) *INFORMS J. Computing*.

### Semi-Supervised & Active Learning

13. Qian, K. et al. (2019). ["SystemER: a human-in-the-loop system for explainable entity resolution."](https://dl.acm.org/doi/10.14778/3352063.3352068) *VLDB*, 12(12).
14. ["Enhancing Entity Resolution with a hybrid Active Machine Learning framework."](https://www.sciencedirect.com/science/article/abs/pii/S0306437924000681) *Information Systems*, 2024.

### Behavioral Fingerprinting

15. ["Game Telemetry as Biometric Signatures."](https://videogamedatascience.medium.com/game-telemetry-as-biometric-signatures-39f42841373d) *Video Game Data Science*, Medium.
16. ["Fair Play and Identity: In-Game Behavioral Biometrics for Player Identification."](https://ieeexplore.ieee.org/document/11114281/) *IEEE*, 2024/2025.
17. ["Comparison of similarity measures to differentiate players' actions and decision-making profiles."](https://www.sciencedirect.com/science/article/abs/pii/S0747563216305143) *Computers in Human Behavior*.

### Graph-Based Entity Resolution

18. Hassanzadeh, O. et al. (2009). ["Framework for evaluating clustering algorithms in duplicate detection."](https://arxiv.org/pdf/2112.06331) *PVLDB*.

### Tools Documentation

19. [Splink Documentation](https://moj-analytical-services.github.io/splink/index.html)
20. [Dedupe Documentation](https://docs.dedupe.io/)
21. [Python Record Linkage Toolkit](https://recordlinkage.readthedocs.io/)
22. [Awesome Entity Resolution (curated list)](https://github.com/OlivierBinette/Awesome-Entity-Resolution)
