# QWiki Phase 4 brand-discovery pivot — fresh terminal resume

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This continues the Phase 4a investigative session captured in `2026-05-06-qwiki-phase-4-investigative-resume.md` (year-by-year extraction loop). The prior session reached ~420k context after extracting 5 year cohorts under prompt v7 and building a deterministic canonicalization supervisor; an operator insight then pivoted the canonicalization approach. Fresh terminal needed to execute the pivot cleanly.

This is NOT a re-extraction session. The 5 year cohorts (2026 / 2025 / 2024 / 2023 / 2022) under prompt v7 are STAGED and CORRECT. Don't re-run extraction. The pivot is in the canonicalization layer.

---

## The pivot in one paragraph

We built a deterministic canonicalization supervisor that clusters extracted `series` strings (e.g., "Eternal" / "Quakeworld Eternal" / "QW Eternal" → one cluster). It worked but produced false positives on multi-format-line brands (Kombat, EQL) and couldn't resolve cross-batch ambiguity (DM2 Duel vs OnemapDuel? Qenya War vs Qenya War Tournament?). Operator then pointed out: **the wiki ALREADY has authoritative brand-overview pages we missed.** Articles like `AYE_AYE_Fun_Cups`, `European_Quake_League`, `Kombat`, `QHLAN`, `Polish_Duel_Championship` exist in our snapshot, carry brand metadata (founder, sdate, format-lines), and link to all instances. We never looked because our year-cohort selector filtered to articles tagged with year categories — brand pages have no year tag and fell through. Verified: 10 of 12 brand pages I checked are in the snapshot. The pivot: **drop fuzzy LLM clustering; use wiki cross-links as ground truth.**

---

## Where things stand (2026-05-06)

### Extraction — DONE under prompt v7

5 year cohorts uniformly extracted under `/tmp/qwiki-probe/prompt-v7.md`:

| Batch | Articles | Path |
|---|---|---|
| 2026 | 24 | `/tmp/qwiki-probe/2026-v7-normalized/` |
| 2025 | 63 | `/tmp/qwiki-probe/2025-v7-normalized/` |
| 2024 | 61 | `/tmp/qwiki-probe/2024-v7-normalized/` |
| 2023 | 40 | `/tmp/qwiki-probe/2023-v7-normalized/` |
| 2022 | 26 | `/tmp/qwiki-probe/2022-v7-normalized/` |

214 articles total. Schema discipline 100% (40 keys, no enum hallucinations, no wikitext field-name leakage). Year=null=0 across all batches. Don't re-extract.

### Canonicalization supervisor (deterministic) — partially built

Lives at `/tmp/qwiki-probe/canonicalize.ts`. Reads the 5 normalized batches, runs:
- Exact-normalized clustering (lowercase + ASCII fold + prefix-strip)
- Operator override map (e.g., "eeNternal Fights 4on4" → "Eternal")
- Role disagreement detection (parent vs event mix across siblings)
- Parent_slug orphan / self-reference detection
- Cluster split / merge suggestions (heterogeneous slug-markers, prefix relationships)

Outputs at `/tmp/qwiki-probe/canonical/*.json` + `summary.txt`. The supervisor reusable as-is for diagnostics; the brand-discovery pivot ADDS a layer above it (wiki ground truth) rather than replacing it.

### Operator review report — open

Lives at `docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/operator-review.md`. Walks through 14 edge-case decisions in 6 sections (A: cross-batch role disagreements, B: name keep/strip variance, C: brand boundary questions, D: specific data errors, E: pending decisions, F: closed decisions).

**3 decisions LOCKED so far** (operator confirmed in the prior session):
- A.1 QHLAN2024: auto-fix to `event` (clear extraction error; siblings 2022 + 2026 both event)
- A.2 QW_LAN_Party_Poland_2024: auto-fix to `event` (same — has 5 sub-event articles, strongest event case)
- A.3 UppsaLAN: complex result. UppsaLAN_2024 (parent, 1on1-only) is correct; UppsaLAN_2 (2025) was wrong — it's effectively 4on4-only because the 1on1/2on2 sections are TBD placeholders that didn't materialize. **2025 should be FIXED from event to parent.** Plus a v8 candidate rule: don't count TBD-placeholder sections toward multi-discipline classification.

**Other locked decisions** (from earlier in the session):
- **Qlan War** = own series, distinct from Qenya War (canonical "Qlan War Tournament"; format-lines include Elite + numbered Tournament N)
- **QWSL** = simple brand like EQL (canonical "QWSL"; format-lines: Draft / TB3 / DIV2 / Season). All 2025 QWSL family rows collapse to series="QWSL".
- **EQL** = brand with format_lines: Season (league), Cup (cup), Ladder (ladder)
- **Eternal** = canonical name for Quakeworld Eternal / QW Eternal / eeNternal Fights 4on4 family

The remaining 11 decisions (B.1, B.2, C.1-3, D.1-6) PAUSED — many will resolve automatically from brand pages.

### The pivot — what triggered it

Operator question: "do we have those brand pages?" pointed at `AYE_AYE_Fun_Cups`, `European_Quake_League`, `Nations_Quake_Rank`. Verified all three exist in `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/`. Plus 7 more we checked. Brand pages carry:

- Brand description prose ("AYE AYE Fun Cups is a series of one-day tournaments... Created in 2020 by Stalkerrh")
- Founder + admin from infobox
- Format-line list (`tournaments=1on1 & 2on2` for Kombat)
- Hall of Fame tables (cross-edition results for EQL, Kombat, etc.)
- Cross-links to all child events (in body + via Navbox templates)
- Start/end dates of the brand itself (sdate=2020-07-14 for AYE AYE Fun Cups; 2005-10-10 for EQL)

**647 articles reference some Navbox template** in our snapshot — strong upper bound on how many tournaments are organized into brand groups. Likely 30-50 unique brands.

---

## Critical rules (don't violate)

- **DO NOT re-extract any year cohort.** The 5 v7 batches are uniform and correct. The pivot is in the canonicalization layer above them, not below.
- **DO NOT modify `/tmp/qwiki-probe/prompt-v7.md`.** The extraction prompt is converged.
- **DO NOT write to any DB.** Outputs stay in `/tmp/qwiki-probe/` (staging) until Phase 4b.
- **DO NOT touch `community.tournaments` table.** Migration 009 is deferred to Phase 4b.
- **WIKI is source of truth for brand identity.** Don't LLM-cluster what the wiki authoritatively states.
- **Brand-overview pages are NEW article shape — not in our extraction prompt.** They aren't "tournament instances" and shouldn't be loaded into `community.tournaments` as rows. They become brand-notes (Layer 3 deliverable).
- **Don't re-litigate locked decisions.** The 3 role auto-fixes (A.1, A.2, A.3) and the 4 brand decisions (Qlan War, QWSL, EQL, Eternal) are operator-confirmed. They land at canonicalization time.
- **Parking docs in monorepo, working artifacts in /tmp/.** The bulk staging data is WSL-internal /tmp/. Browse-friendly mirrors live at `docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/`.

---

## First three actions

1. **Read this doc + the prior canonical-review docs:**
   - This file (you're reading it)
   - `docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/operator-review.md` — operator decision walk-through, with 3 locked + 11 pending
   - `docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/supervisor-design.md` — canonicalization supervisor design (now superseded by brand-discovery approach)
   - `docs/superpowers/parking/2026-05-06-qwiki-phase-4-investigative-resume.md` — original Phase 4a session resume (extraction loop methodology)

2. **Build the brand-discovery script** (`/tmp/qwiki-probe/discover-brands.ts`):
   - Scan all 9178 articles in `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/`
   - For each article: extract `{{<X> Navbox}}` template references from wikitext
   - Build a unique-Navbox-name set
   - For each Navbox, find the matching brand-overview article (heuristic: article title slug-matches the Navbox name with case-folding; OR the navbox is `defined-and-referenced` only on that article — check both)
   - Output: `/tmp/qwiki-probe/brand-discovery.json` listing each brand: `{ navbox_name, brand_article_slug, member_article_slugs[] }`

3. **Spot-check the discovery output** by hand-reading 3-5 brand pages and confirming:
   - The brand_article_slug matches what we'd expect
   - The member_article_slugs covers the tournament instances we know exist
   - Ambiguous cases (multiple navboxes per article? brand page ≠ navbox slug?) are flagged

After steps 1-3, surface findings to operator. Most likely next step: parse brand-page wikitext to extract structured brand metadata + tournament-membership; then re-run canonicalization using brand membership as authoritative cluster source.

---

## Reads required (priority order)

1. **`docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/operator-review.md`** — the 14-decision walk-through. 3 locked, 11 pending.
2. **`docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/supervisor-design.md`** — design of the deterministic canonicalization supervisor. The brand-discovery pivot ADDS to this; doesn't replace.
3. **`/tmp/qwiki-probe/prompt-v7.md`** — the converged extraction prompt. Don't modify, but understand for context (HARD CONSTRAINTS section + EQL convention).
4. **`/tmp/qwiki-probe/canonicalize.ts`** — the deterministic supervisor implementation. Reusable scaffolding for the brand-aware version.
5. **`/tmp/qwiki-probe/canonical/summary.txt`** — current supervisor output. Diagnostic of what false positives exist.
6. **Sample brand-overview articles** (read these to anchor on the data shape):
   - `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/AYE_AYE_Fun_Cups.json`
   - `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/European_Quake_League.json`
   - `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Kombat.json`
   - `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/QHLAN.json`
   - `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Make_2on2_Great_Again.json` (interesting case — references `{{Hammertime Navbox}}`, brand is Hammer Time / Time 2 Hammer family)

---

## Pre-verified brand pages in the snapshot

These were checked and confirmed present (not exhaustive — discovery script will find more):

```
AYE_AYE_Fun_Cups       (1366 bytes) — AYE AYE family
European_Quake_League  (17135 bytes) — EQL brand history + hall of fame
Nations_Quake_Rank     (16010 bytes) — NQR brand history
Kombat                 (9619 bytes) — Kombat series, $3705 prize total
QHLAN                  (14411 bytes) — QHLAN brand history since 1999
UppsaLAN               (4957 bytes) — UppsaLAN brand
Polish_Duel_Championship (4246 bytes)
Russian_QuakeWorld_League (23583 bytes) — RQWL brand
QuakeWorld_MIX_League  (721 bytes) — small stub but exists
Make_2on2_Great_Again  (1393 bytes) — special 2on2 event under Hammertime brand
```

Missing or differently-named (worth investigating):
- `OnemapDuel` — Navbox `{{OnemapDuel Navbox}}` exists but no Article-namespace page found. Might be a Template-namespace artifact.
- `Time_2_Hammer` — operator's screenshot showed brand is actually "Hammer Time" / Navbox name `Hammertime`. Brand page may be at a different slug.

---

## Continuation method

The brand-discovery work shapes itself as 4 phases:

### Phase 1 — Discover brand pages

Script: `/tmp/qwiki-probe/discover-brands.ts`. Scans all 9178 articles, extracts Navbox-references, matches Navboxes to brand pages, outputs `brand-discovery.json`.

### Phase 2 — Parse brand-page metadata

Script: `/tmp/qwiki-probe/parse-brand-pages.ts`. For each discovered brand-overview article, extract:
- `brand_canonical` (from infobox |name= or article title)
- `founder`, `admins`, `organizers` (from infobox)
- `sdate`, `edate` (brand-level lifespan)
- `format_lines[]` (parse `|tournaments=` field, prose mentions, navbox member-list grouping)
- `description` (intro paragraph for L3 note body)
- `child_event_slugs[]` (cross-links from body + Navbox member list)
- `hall_of_fame[]` (parse the per-edition results table)

Output: `/tmp/qwiki-probe/brand-pages-parsed.json`.

### Phase 3 — Build brand-membership table

For each tournament in the 214-row v7 corpus, find which brand page references it (or which navbox it shares with a brand page). Produce `tournament_slug → brand_canonical` mapping. Output: `/tmp/qwiki-probe/brand-membership.json`.

Spot-check: every tournament in the v7 corpus should map to exactly one brand (or be flagged "unknown brand" for operator review). Count how many flag.

### Phase 4 — Re-canonicalize with brand truth

Update `canonicalize.ts` (or new `canonicalize-v2.ts`) to use brand-membership as the cluster source. Each tournament's `series` becomes the brand's canonical name. Format-line is captured (either as `competition_type` or as a new `format_line` overlay column for Phase 4b loader).

Re-run on the 214-row corpus. False-positive count should drop to near-zero. Surface remaining genuine ambiguities for operator review.

After Phase 4, the brand-pages-parsed.json content becomes the seed for **Layer 3 brand notes** (one markdown file per brand, frontmatter from parsed metadata, body from prose).

---

## When in doubt

- **A brand page seems to not exist** — check `find apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ -iname "*<brand>*"`. The wiki sometimes uses different slugs than expected (`Time_2_Hammer` is actually under `Hammertime` family).
- **Two navboxes appear in one article** — that's normal. A tournament might belong to multiple brands (e.g., a LAN event that's also part of a tour series). Surface as "multi-brand" tournament; operator decides.
- **Brand-overview page has no infobox** — extract from prose body. AYE_AYE_Fun_Cups has Infobox; some old brand pages may not. Use heuristics + LLM fallback if needed.
- **Tournament references a navbox but no brand page exists for it** — flag. Either the brand page is named differently (operator review), the brand exists only as a Navbox template (no actual landing page — common for older series), or it's truly orphaned.
- **Cross-link in body points at a different slug than expected** — wiki redirects. The 2026-05-04 snapshot has `redirects.json` with the redirect map; resolve before clustering.
- **Operator asks to apply a locked decision now** — defer to canonicalization Phase 4 output, not extraction layer. The locked role auto-fixes (QHLAN2024, QWLPL2024, UppsaLAN_2 reclassification) live as overrides applied during canonicalization, not by re-extracting articles.

---

## What to surface to operator after Phase 1

Brief halt-and-report after the discovery script runs:
- Total brand pages discovered (target: ~30-50)
- Brand-page coverage of v7 corpus (how many of 214 tournaments map to a known brand?)
- Brand-page MISSING coverage (which tournaments have no brand match? — these become singletons or operator-review)
- Multi-brand cases (tournaments referencing multiple navboxes)
- Recommendation: proceed to Phase 2 / pause for operator review / new direction needed

---

## Reusable scripts (don't recreate)

- `/tmp/qwiki-probe/select-year.ts` — year-cohort selector (used for original extraction)
- `/tmp/qwiki-probe/normalize.ts` — JSON output normalizer
- `/tmp/qwiki-probe/audit-year.ts` — cross-batch fill-rate / discipline audit
- `/tmp/qwiki-probe/canonicalize.ts` — deterministic clustering supervisor
- `/tmp/qwiki-probe/prompt-v7.md` — converged extraction prompt

New scripts you'll add:
- `discover-brands.ts` (Phase 1)
- `parse-brand-pages.ts` (Phase 2)
- `build-brand-membership.ts` (Phase 3)
- `canonicalize-v2.ts` (Phase 4) — or extend canonicalize.ts

---

## Operator preferences (carried from prior session)

- **Decisive recommendations**, not option menus. Lead with plain English + your call, ask for confirmation.
- **One question at a time** during interactive scoping.
- **Plain English at decision points**; technical detail follows only where load-bearing.
- **Investigative > mechanical** — the data is messy; let evidence drive iteration.
- **Momentum over ceremony** — run script, eyeball, refine, move on.
- **Wiki is source of truth** — don't LLM-cluster what the wiki authoritatively states.
- **Operator domain knowledge wins** when LLM judgment is ambiguous (e.g., TBD-placeholder sections aren't real disciplines).
- **Project standards**: Bun runtime, postgres-js, ASCII-only, append-only migrations, no JSONB pre-stringify. /tmp/ for staging; monorepo for review-grade artifacts.

---

## Halt-and-report contract

When Phase 1 (discovery) finishes:
- Surface to operator: total brand pages discovered, coverage stats, missing/ambiguous cases.
- Recommend: continue to Phase 2 / halt for operator review / pivot.

When Phase 4 (re-canonicalization) finishes:
- Surface: cluster count delta vs deterministic supervisor (lower = better), false-positive count drop, remaining operator-review queue.
- Recommend: lock canonical names, draft Layer 3 brand notes, proceed to Phase 4b loader work.

---

## Context budget projection

- Phase 1 + 2 (discover + parse): ~50-80k context. Mostly script-write + spot-check reads.
- Phase 3 + 4 (build + re-canonicalize): ~80-120k context. More iteration on edge cases.
- Total: ~150-200k expected. Comfortably under the 350k smell zone. If approaching 350k, halt and write a continuation handoff.
