# Canonicalization Supervisor — Design Sketch

> Status: design draft, partial-implementation landed at `/tmp/qwiki-probe/canonicalize.ts` (deterministic-only first iteration). Final home will be `docs/superpowers/specs/` at Phase 4b time.

## Purpose

The per-article extraction agent (Sonnet, v7 prompt) catches the majority of tournament structure cleanly but produces variance on edge cases — same article re-extracted twice gets different decisions on ambiguous cases (Tournament keep-vs-strip, event-vs-parent role, prefix-strip drift across batches).

We've established that this variance is intrinsic to per-article LLM judgment without cross-corpus context. Adding more rules to the prompt hits diminishing returns.

The **canonicalization supervisor** is a single pass over the entire extracted corpus that:
- Identifies series-name clusters across articles
- Resolves role disagreements between sibling articles
- Flags genuinely ambiguous cases for operator review
- Produces a canonical-name mapping table that the Phase 4b loader joins on

This separates **extraction** (per-article, cheap, fast, Sonnet) from **canonicalization** (whole-corpus, judgment-heavy, Opus). Each layer does what it's good at.

---

## Inputs

All normalized extraction JSONs from the WSL-staging directories:

```
/tmp/qwiki-probe/2026-v7-normalized/
/tmp/qwiki-probe/2025-v7-normalized/
/tmp/qwiki-probe/2024-v7-normalized/
/tmp/qwiki-probe/2023-v7-normalized/
/tmp/qwiki-probe/2022-v7-normalized/
... (all year-cohorts, post-convergence)
```

Each JSON has the 40-key schema. The supervisor cares primarily about:
- `slug`, `title`, `series`, `season_number`, `year`
- `tournament_role`, `competition_type`, `mode`
- `parent_slug`
- `extraction_notes` (LLM-flagged ambiguities)

---

## Tasks (in order)

### Task 1: Series clustering

Group equivalent series names into clusters. Each cluster has a canonical name + member slugs.

**Approach: hybrid deterministic + LLM.**

**Step 1 (deterministic):** group by exact match after normalization (lowercase + ASCII fold). Catches "EQL" / "EQL" / "EQL" trivially.

**Step 2 (deterministic):** apply prefix-strip + Levenshtein distance. Catches "Quakeworld Eternal" / "QW Eternal" / "Eternal" → cluster.

**Step 3 (LLM-aided):** for clusters that span more than 2 normalized variants, OR pairs where Levenshtein distance is borderline (3-6 chars), pass the candidate cluster to Opus with article context (titles + slugs). Opus decides:
- Are these the same series? (yes/no/ambiguous)
- If yes, what's the canonical name? (longest readable form vs most-frequent form)
- If no, where's the boundary? (which slugs belong to which cluster)

Example LLM-aided cases from current data:
- "OnemapDuel" (2025 Navbox) vs "DM2 Duel" (2024-v7 title-prefix) — same series? boundary?
- "Qenya War Tournament" / "Qenya War" / "Qlan War Tournament" / "Qlan War" — 2 spellings × 2 marker variants = 4 candidates. Ambiguous: are Qenya/Qlan the same brand misspelled, or distinct?
- "Kombat Duel" / "Kombat" — when "Duel" is in keep-markers vs stripped, same brand?

**Output:** `series-clusters.json`

```json
[
  {
    "cluster_id": "eternal",
    "canonical_name": "Eternal",
    "member_series_names": ["Eternal", "Quakeworld Eternal", "QW Eternal"],
    "member_slugs": ["Quakeworld_Eternal_Dm2", "Quakeworld_Eternal_Schloss", "EeNternal_4on4"],
    "decision_path": "deterministic_prefix_strip",
    "operator_review": false
  },
  {
    "cluster_id": "qenya_war",
    "canonical_name": "Qenya War Tournament",
    "member_series_names": ["Qenya War", "Qenya War Tournament"],
    "member_slugs": ["Qenya_War_Tournament_1", "Qenya_War_Tournament_2", "Qenya_War_Tournament_3"],
    "decision_path": "llm_judgment",
    "operator_review": true
  }
]
```

### Task 2: Role disagreement detection

For each series cluster, scan member articles' `tournament_role` values. Flag inconsistencies:
- Sibling articles where some are `parent` and others are `event`
- Slash-title articles where parent is missing
- Articles with `parent_slug` pointing at a slug that doesn't exist in the corpus

### Task 3: Cross-year sibling validation

For each series cluster, walk sibling editions and check:
- Field convention drift (venue / mode / format consistency)
- Sequential season_number gaps (Polish_Duel_Season_3 → Season_4 → Season_5 → no Season_6 in any year? gap)
- Brand-attribute consistency (founder, organizers across years — should slowly evolve, not flip)

### Task 4: Operator review queue

Aggregate everything operator should see:
- Ambiguous cluster boundaries from Task 1 (operator_review=true rows)
- Role disagreements from Task 2 not auto-resolvable
- Sibling drift warnings from Task 3 above threshold
- Articles where extraction_notes flagged a judgment call worth verifying

---

## Outputs

```
/tmp/qwiki-probe/canonical/
  series-clusters.json         # cluster_id -> {canonical, members, slugs}
  role-disagreements.json      # cross-sibling role mismatches
  sibling-validation.json      # drift warnings (deferred to v2)
  parent-slug-issues.json      # orphan / self-referential parent_slugs
  cluster-merges.json          # prefix-relationship merge suggestions
  cluster-splits.json          # heterogeneous-marker split suggestions
  summary.txt                  # human-readable rollup
  operator-review.md           # mirrored to docs/superpowers/parking/ for browsing
```

These overlay the extracted JSONs without modifying them. The Phase 4b loader joins extracted JSONs + series-clusters at load time to produce final `community.tournaments` rows with canonical series names.

---

## Architecture

**Single Bun script:** `/tmp/qwiki-probe/canonicalize.ts`

**Steps:**
1. Read all `<year>-v7-normalized/*.json` files into memory.
2. Extract unique series-name set + per-series article list.
3. Run Task 1 deterministic clustering (no LLM).
4. Identify ambiguous clusters from Task 1 (LLM-needed list).
5. Single Opus-medium API call: pass the ambiguous clusters + their context, get clustering decisions back. (Deferred — first iteration is deterministic-only; ambiguous cases go to operator review queue instead.)
6. Run Tasks 2 + 3 (deterministic, comparing JSONs).
7. Aggregate Task 4 review queue.
8. Write all output JSONs.

**Cost estimate (when LLM step lands):** one Opus-medium call with ~20 ambiguous clusters in context, ~5K tokens input, ~2K output. Negligible (<$1).

**Why Opus and not Sonnet:** the cross-corpus reasoning is judgment-dense — "is OnemapDuel the same as DM2 Duel?" requires holding context about how QW community names things, the role of Navboxes, and operator's brand-vs-format-line preference. Sonnet at extraction time is right; Opus at canonicalization is right.

---

## Brand notes integration (operator suggestion 2026-05-06)

The operator proposed using **Layer 3 brand notes** as the canonicalization registry. Each known brand (EQL, Kombat, QHLAN, etc.) gets a markdown note with structured frontmatter (format_lines, aliases, founder, year span) + prose body.

The supervisor reads brand notes at start, uses them as authoritative reference:
- Series names matching a brand's aliases collapse to the canonical name
- Multi-format-line brands (EQL, Kombat) suppress the false-positive merge suggestions
- Unrecognized series flag as "unknown brand — needs review"

This kills two birds: solves the supervisor's false-positive problem AND builds the L3 deliverable in parallel.

**Storage:** `/tmp/qwiki-probe/brand-notes/` initially (staging). Migrates to `apps/qw-oracle/curated/tournament-notes/` per D3 at Phase 4b ship.

---

## Open decisions for operator

1. **Auto-apply or surface-only?** When the supervisor decides "QHLAN2024 should be `event`, not `parent`", does it:
   - (a) Write the corrected role to a `corrections.json` overlay that the loader applies — fully auto.
   - (b) Surface to operator review queue, wait for approval — manual gate.
   - (c) Auto-apply if confidence high, queue otherwise.
   Recommendation: **(c)** with confidence threshold tunable.

2. **Canonical name selection rule.** When a cluster has multiple member-name candidates, which wins?
   - (a) Most-frequent across the corpus.
   - (b) Longest readable form (post-prefix-strip).
   - (c) Operator-curated override list with deterministic fallback to (b).
   Recommendation: **(c)**. The override list is small (10-20 entries) and operator-locked. Brand notes are this override list.

3. **Series cluster IDs as DB foreign keys?** Phase 4b migration 009 could add a `community.series` table with one row per cluster, and `community.tournaments.series_id` FK. Cleaner than free-text `series` column. Trade-off: more migration work, fewer ad-hoc queries.
   Recommendation: defer — start with `series` text column at Phase 4b ship, add `community.series` table in a follow-on arc if pivot tables prove useful.

4. **Re-canonicalize on prompt re-run?** When prompt evolves and we re-extract a year, do we re-run the supervisor?
   Recommendation: yes — supervisor is cheap, runs over the whole staging dir. Re-run is idempotent (same input + same prompt = same output, modulo Opus variance which we accept).

---

## What this unlocks

After this lands at Phase 4b time:
- `WHERE series_canonical='Eternal'` returns all 5 articles regardless of original wiki spelling.
- "Show me all 2024 tournaments" returns the right thing because event roles are consistent across years.
- Operator review queue surfaces 20-50 items per re-extraction (instead of operator eyeballing all 9000+ articles).
- Wiki updates → re-extract → re-canonicalize → operator reviews diff → loader updates.

Plus the visualization angle from earlier conversation: Oracle MCP page can render "tournaments missing dates", "ambiguous role classification", "series with cluster boundary uncertainty" — those queries fall out of the Task 4 review queue table for free.
