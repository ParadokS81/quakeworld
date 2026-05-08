# Phase B brainstorm pause -- captured amendments

**Date:** 2026-05-09. **Status:** paused (this session pivoted to qwiki-sandbox arc planning).

The Phase B brainstorm session (2026-05-08 evening + 2026-05-09 morning) covered substantial design ground but didn't write the spec. This file captures the load-bearing decisions and amendments so they don't evaporate. When the brainstorm resumes (likely after qwiki-sandbox phase 4 lands Page Forms, or independently), pick up from here.

The original Phase B brainstorm handover is at `docs/superpowers/parking/2026-05-08-qwiki-phase-4-phase-b-brainstorm-handover.md`. This pause doc layers on top.

---

## Workflow shape -- decided

**Deterministic-first-with-Claude-on-gaps + modal review.** Tool extracts what it can; modal surfaces ✓/?/missing per field; operator reviews vs live wiki page; gaps go to Claude in conversation; Claude refines extractor; re-extract; promote.

Pipeline:

1. `bun run extract --all` -- CLI parses snapshot, fills `extraction-output/<slug>.json` per bucket
2. Click "promote" on tool card -> modal renders that JSON as a checklist
3. Operator reviews vs wiki page, reports gaps to Claude in chat
4. Claude refines extractor; re-extract; re-open modal
5. "Approve and promote" -> state +promoted, `.md` generation triggered
6. Operator hand-edits prose for top-5 brands; tail brands stay as stub
7. Post-migration-012, loader reads all promoted `.md` files, inserts DB rows idempotently

State machine: `unsorted -> rough-sorted -> promoted (.md committed) -> verified (prose pass)`. DB row state lives post-migration-012.

---

## Schema amendments -- to bake into spec

1. **Add `country TEXT NULL`** to `community.tournament_brands` AND `community.tournaments`. ISO 3166-1 alpha-2 lowercase. NULL for regional brands. Per-event country attribution (tournament hosted in country X but brand spans region Y).

2. **Add `division_label TEXT NULL`** to `community.tournaments`. NULL when single-division. String value ("1" / "2" / "Pro" / "Amateur") for multi-bracket events. Text over int because some events use non-numeric tier names. Reason: brand-page HoF only shows division 1 for multi-division leagues; per-edition pages have all divisions. One season -> N rows in tournaments table (one per division).

3. **State machine attributes on brand frontmatter:** `is_promoted BOOLEAN`, `is_verified BOOLEAN` flags. has_note already exists; promoted/verified are new attributes for the staging-then-DB pattern.

4. **Pre-migration `.md` is source of truth.** Post-migration-012, DB row becomes source of truth and frontmatter regenerates from row. Loader is idempotent. (Already in schema-spec philosophy; just being explicit about pre/post timing.)

---

## Brand-row checklist (27 fields, locked) -- in 4 review tiers

| Tier | Fields | Reliability on EQL |
|---|---|---|
| 1. Auto, no review | slug, title, display_name, source_wiki_slug, source_template, source_categories, wiki_revision_id, wiki_fetched_at, has_note, is_substantive, is_stub | 11/11 |
| 2. Extracted, eyeball | short_name, founder, format_default, prize_category, website, description, admins, venue_type | 7/8 (venue_type often missing from infobox) |
| 3. Inferred / cross-evidence | eras, region, country, competition_types, modes, format_line_labels | 0/6 reliable; 4/6 with heuristic suggestions |
| 4. Operator/LLM authored | aliases (partial), summary, body prose | 0/2 + body authored separately |

EQL audit shows ~18/27 fields reliably extract from brand-overview page alone (Tier 1 + Tier 2). Tier 3 needs heuristic + operator review. Tier 4 is curated synthesis. Cleaner wiki (post-Page-Forms) bumps Tier 2 to ~22-24/27.

---

## Tournament-row checklist (sketched)

| Tier | Fields |
|---|---|
| 1. Auto | slug, title, year, brand_slug, format_line_label, source_*, wiki_* |
| 2. Extracted from infobox + Results section | division_label, sdate, edate, status, organizer, format, prize_pool, mode, venue_type, map_pool, winner_slug, runner_up_slug, semi_finalist_slugs, bronze_match_played |
| 3. Inferred | competition_type (inherit from brand), country (inherit from brand) |
| 4. Authored | (typically none for tournament rows; brand body prose handles narrative) |

Per-edition page parsing template: `PrizepoolSEnoprize` with `bronzematch=true` is the modern template; older seasons use `{{Medal}}` + `{{team}}` directly. Each new template = code branch + `extractor-patterns/` note.

---

## EQL pilot decision

**Drain EQL first** as the workflow proof. After EQL ships:

- Validate the modal review loop actually catches misses
- Lock the migration 012 schema based on EQL stress-test
- Then drain Kombat / Smackdown / QHLAN / NQR (top-5 by member count after Phase A)
- Long tail (49 brands at 1-9 members) follows via fast-pass

Sandbox arc phase 5 IS the EQL drain proof, integrated with the Page Forms cleanup work.

---

## Phase A residuals (gap-check.ts output, 2026-05-09)

**5 silent drops to patch back into buckets:**

- `european-quake-league`: EQL_Pro
- `kombat`: Kombat_Summer_Duel_2
- `organ-grinder`: Organ_Grinder_1, Organ_Grinder_2
- `ownage`: Ownage_Cup_2

**3 EQL redirect duplicates to dedup:**

- `EQL_Season_18` (359 chars, stub) vs `European_Quake_League_Season_18` (7388 chars, real content)
- Same for Season 20 + Season 21

**3 QHLAN Duelmania entries** to review (`Duelmania.no` / `.fi` / `_DownUnder_2023` -- judgment call, possibly cross-attribution).

**90 unassigned tournaments** in inventory -- normal Phase A work, not gaps.

`gap-check.ts` is committed at `apps/qw-oracle/scripts/curate-brands/gap-check.ts` and re-runnable.

---

## Insights worth surfacing in the eventual spec

1. **MD = three layers stacked.** Frontmatter (1:1 row mirror) + body prose (curated narrative; LLM/operator-authored) + version-stable git artifact (frozen point-in-time, decoupled from live wiki).

2. **HoF lives on per-tournament rows.** Brand-level HoF is a JOIN at query time, not stored data. EQL "all winners" = `SELECT FROM community.tournaments WHERE brand_slug='european-quake-league'` returns 23+ rows. Singletons return 1. Same query path, different result size.

3. **Top-3 placements are the right altitude for community-history queries.** "Who dominated 2005-2010?" / "Clan Y's tournament record?" / "Most successful brand?" all answerable from HoF granularity. Match-level data (qw_event_log corpus) is out of scope -- different layer entirely.

4. **Two extractor flows -- pre-filled vs synthesized brands.** 25 of 60 brands have wiki anchor pages (pre-filled); 35 are operator-curated (synthesized, no anchor). Synthesized brands need operator-supplied or member-inferred brand-row data. Cleaner wiki shrinks the synthesized-only set as cleanup adds anchor pages.

5. **Cleaner wiki is a quality-of-life pipeline improvement, NOT an architecture change.** The `.md` projection stays the right architecture; clean wiki bumps auto-extract from ~18/27 to ~22-24/27.

---

## When the brainstorm resumes

1. Read this pause doc + the original 2026-05-08 brainstorm handover
2. Confirm the workflow / state machine / schema amendments still match operator's mental model
3. Write the Phase B workflow design spec at `docs/superpowers/specs/<date>-curate-brands-phase-b-workflow-design.md`
4. Operator review of spec
5. Transition to writing-plans skill for implementation plan
6. First concrete deliverable: drain EQL bucket end-to-end

---

## Sister-arc dependency

Phase B drain is now coupled to qwiki-sandbox arc -- specifically, sandbox phase 4 (Page Forms authoring) is the **enabler** for cleanup pilot in sandbox phase 5. Two paths from here:

- **Path A (sandbox-first):** finish sandbox phases 1-4, then run EQL pilot (sandbox phase 5 + Phase B brainstorm resumed) on the sandbox. Wiki cleanup as co-output.
- **Path B (oracle-first):** resume Phase B brainstorm now, drain EQL on local snapshot only (no sandbox needed). Wiki cleanup is a sister concern, not co-output.

Operator picks. No urgency to decide now -- both paths converge on the same MCP-shipping outcome.
