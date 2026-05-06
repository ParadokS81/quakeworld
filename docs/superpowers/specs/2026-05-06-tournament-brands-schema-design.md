# QWiki tournament brands -- schema design

**Date:** 2026-05-06
**Status:** Draft (for review)
**Arc:** qwiki-community-reference (Phase 4 brand-pages pivot)
**Migration:** `apps/qw-oracle/db/migrations/012_tournament_brands.sql` (pending)

## Context

Phase 4 of the qwiki-community-reference arc set out to LLM-extract tournament data from QWiki articles into `community.tournaments` rows. The v7 prompt converged on a 40-key schema and produced 214 rows across 5 year cohorts (2022-2026). A deterministic canonicalization supervisor was then built to cluster per-article `series` strings into brand-level groupings -- it produced false positives on multi-format brands (Kombat, EQL) and could not resolve cross-batch ambiguity (DM2 Duel vs OnemapDuel; Qenya War vs Qenya War Tournament).

An operator insight reframed the canonicalization problem: the wiki ALREADY has authoritative brand-overview pages (`European_Quake_League`, `Kombat`, `QHLAN`, `Russian_QuakeWorld_League`, etc.) that organize all brand instances via `{{X Navbox}}` cross-link templates. 33 brand-specific Navbox templates exist in the 2026-05-04 snapshot. Top 5 brands by Navbox member count: EQL (35), Kombat (27), QHLAN (20), RQWL (19), NQR (19).

**The pivot:** drop fuzzy LLM clustering; use wiki cross-links as ground truth. Brand-overview pages become the source of brand identity; per-tournament rows inherit brand membership via Navbox lookup.

This spec defines the schema for storing brand-level metadata.

## Architecture

**New table: `community.tournament_brands`.** Brands and per-tournament instances are different abstractions -- brand rows have founder / format-lines / era; tournament rows have winner / date / mode. Mixing them in one table forces NULLs on every column. Per the established pattern (`community.players` + `community.clans` as separate tables, unified via `type` discriminator at the MCP surface in Phase 6), separation is the right call.

**Pattern: profile-notes (DB-first).** Structured rows are the source of truth; markdown frontmatter mirrors the row; body carries unique prose the row schema cannot represent. Same shape as players and clans.

**Three orthogonal classification axes (instead of a single fuzzy `brand_type` enum):**

1. `venue_type` (brand level) -- where the brand operates: `online | lan | hybrid`
2. `competition_type` (per format-line, rolled up to brand) -- structural shape: `league | cup | ladder | tournament`
3. `mode` (per format-line, rolled up to brand) -- player count / game mode: `1on1 | 2on2 | 4on4 | ffa | multi`

Brand "kind" is the combination of these three dimensions.

## Schema

### `community.tournament_brands` (new table)

**Identity:**
- `slug TEXT PRIMARY KEY` -- canonical slug (e.g., `european-quake-league`)
- `title TEXT NOT NULL` -- display name
- `display_name TEXT` -- alternate display (often same as title)
- `short_name TEXT` -- abbreviation (EQL, NQR, RQWL)
- `aliases TEXT[]` -- cross-form names ("EQL", "European QW League")

**Lifespan:**
- `eras JSONB NOT NULL DEFAULT '[]'` -- array of `{sdate, edate}` pairs. `edate=null` on last era = currently active. Borrowed from L1 version-tracking pattern (cvar add / remove / re-add cycle).

**People:**
- `founder TEXT` -- player slug reference (denormalized; cross-link not enforced via FK)
- `admins TEXT[]` -- player slug references

**Brand metadata:**
- `venue_type TEXT` -- `online | lan | hybrid`
- `prize_category TEXT` -- `glory | real_money | mixed`
- `format_default TEXT` -- e.g., "Group Stage (Bo3), Single-Elim Bracket (Bo5)"
- `region TEXT` -- `na | eu | sa | au | other`
- `website TEXT`

**Brand-level rollups** (denormalized arrays for quick brand-level queries; source of truth is per-tournament rows):
- `competition_types TEXT[]` -- e.g., `['league', 'cup', 'ladder']` for EQL
- `modes TEXT[]` -- e.g., `['4on4']` for EQL, `['1on1', '2on2', 'ffa']` for Kombat
- `format_line_labels TEXT[]` -- e.g., `['seasons', 'cups', 'ladders']` for EQL

**Note content:**
- `summary TEXT` -- 1-line teaser; used as search-result card text
- `description TEXT` -- raw "About" prose from wiki, captured for reference
- `has_note BOOLEAN NOT NULL DEFAULT FALSE` -- flag: was the markdown body authored?
- `is_substantive BOOLEAN NOT NULL DEFAULT FALSE` -- recognition signal (matches players / clans pattern)
- `is_stub BOOLEAN NOT NULL DEFAULT TRUE`

**Provenance:**
- `source_wiki_slug TEXT` -- e.g., `European_Quake_League`
- `source_template TEXT` -- e.g., `Infobox league`
- `source_categories TEXT[]`
- `wiki_revision_id BIGINT`
- `wiki_fetched_at TIMESTAMPTZ`

**CHECK constraints:**
- `venue_type IS NULL OR venue_type IN ('online', 'lan', 'hybrid')`
- `prize_category IS NULL OR prize_category IN ('glory', 'real_money', 'mixed')`
- `region IS NULL OR region IN ('na', 'eu', 'sa', 'au', 'other')`

**Indexes:**
- on `region`
- on `venue_type`
- on `is_substantive` WHERE is_substantive = TRUE
- GIN on `aliases`
- GIN on `competition_types`

### Cross-table additions to `community.tournaments`

`ALTER TABLE community.tournaments ADD COLUMN`:
- `brand_slug TEXT REFERENCES community.tournament_brands(slug)` -- tags each tournament with its brand
- `format_line_label TEXT` -- e.g., `seasons` for EQL Season 23; `1on1` for Kombat Duel 5
- `competition_type TEXT` -- `league | cup | ladder | tournament` (the structural shape of THIS tournament instance; the brand's `competition_types` rollup is the DISTINCT set across all instances)
- `mode TEXT` -- `1on1 | 2on2 | 4on4 | ffa | multi | ctf` (the player-count / game-mode of THIS instance)
- `status TEXT` -- `upcoming | ongoing | completed` (wiki's tournament-status convention)

CHECK constraints:
- `competition_type IS NULL OR competition_type IN ('league', 'cup', 'ladder', 'tournament')`
- `status IS NULL OR status IN ('upcoming', 'ongoing', 'completed')`

Indexes:
- on `brand_slug`
- on `(brand_slug, format_line_label)`
- on `competition_type`

Other v7-corpus columns (year, sdate, edate, winners, prize_pool, format string, etc.) land when the v7 loader migration ships -- out of scope here.

## Markdown frontmatter mirroring

Brand notes live at `apps/qw-oracle/curated/tournament-brand-notes/<slug>.md` (new directory; sibling to existing `tournament-notes/`). Frontmatter mirrors the row's stable fields:

```yaml
---
slug: european-quake-league
title: European Quake League
type: tournament_brand
display_name: European Quake League
short_name: EQL
aliases: [EQL, European Quake League, European QW League]
eras:
  - { sdate: 2005-10-10, edate: 2016-05-06 }
  - { sdate: 2024-09-01, edate: null }
founder: Zanne
admins: [Hooraytio, Zalon, Itsinen, Nas, Trash, bps, PleuraXeraphim, Zappater]
venue_type: online
prize_category: glory
format_default: "Group Stage (Bo3), Single-Elim Bracket (Bo5)"
region: eu
website: eql.quakeworld.nu
competition_types: [league, cup, ladder]
modes: [4on4]
format_line_labels: [seasons, cups, ladders]
summary: "European Quake League: long-running European 4on4 league, 2005-present (with 2016-2024 hiatus). 23 seasons + 5 cups + 6 ladders."
source_wiki_slug: European_Quake_League
source_template: Infobox league
wiki_revision_id: 77548
wiki_fetched_at: 2025-10-30T08:12:38Z
has_note: true
---

# European Quake League

[Body prose: alias mentions for search-time discovery, era arcs, founder backstory, key moments, format evolution. Player and team mentions kept as `[[Slackers]]` / `[[Zanne]]` wikilinks for downstream L1 entity-joining.]
```

Body is LLM-authored prose for the top 5 brands (EQL, Kombat, QHLAN, RQWL, NQR); for smaller brands, body is a thin loader-generated stub.

## Concrete examples

### EQL (league with multi-format brand)
- venue_type: online
- region: eu
- competition_types: `['league', 'cup', 'ladder']`
- modes: `['4on4']`
- format_line_labels: `['seasons', 'cups', 'ladders']`
- eras: `[{2005-10-10, 2016-05-06}, {2024-09-01, null}]`

### Kombat (multi-mode tournament series)
- venue_type: online
- region: eu
- competition_types: `['tournament']`
- modes: `['1on1', '2on2', 'ffa']`
- format_line_labels: `['2on2', 'duel', 'summer-duel', 'ffa', 'special']`

### QHLAN (annual LAN, multi-discipline editions)
- venue_type: lan
- region: eu
- competition_types: `['tournament']`
- modes: `['multi']` (each LAN edition is multi-discipline; mode breakdown lives at sub-event level on `community.tournaments` rows)
- format_line_labels: `['editions']`

## Implementation pipeline

The work splits into four passes:

1. **Discovery (deterministic).** Scan all 9178 articles, extract `{{X Navbox}}` template references, match to brand-overview articles. Output: brand registry. Already counted: 33 candidate brands.

2. **Parsing (deterministic).** For each brand-overview article, parse infobox + Navbox + categories + admins + Hall of Fame table. Populate `community.tournament_brands` rows. Tag each child tournament with `brand_slug` + `format_line_label`.

3. **Markdown generation (deterministic).** Loader generates `.md` stubs at `curated/tournament-brand-notes/` with frontmatter mirroring rows. Body left empty (`has_note=false`).

4. **LLM-prose (judgment).** For top 5 brands (EQL, Kombat, QHLAN, RQWL, NQR), Sonnet authors body prose using brand-page text + structured data as input. Output: rich body, `has_note=true`. Smaller brands stay as stubs.

Each pass is independently shippable. Passes 1-2 deliver brand-membership canonicalization; passes 3-4 deliver L3 brand notes.

## Open questions / future work

- **`lookup_by_brand` MCP tool** (Phase 6 scope): mirror of `lookup_by_nick`; indexes `tournament_brands.aliases` for exact-match resolution. Out of scope for this migration.
- **Brand-level activeness derivation:** "active" status derived from latest era's `edate` (null = active). May add a generated column or view if downstream queries become awkward.
- **Hall of Fame data:** initially derived from `community.tournaments` rows via JOIN on `brand_slug`. Pre-2022 seasons (not yet in v7 corpus) absent until the year-loop reaches earlier years -- or a dedicated HoF-table backfill from brand-page parsing if the gap matters.
- **Brand-revival edge cases:** brands with 3+ life-cycles handled by the eras array. No brand currently has more than 2 life-cycles; the array shape is future-proof.
- **Multi-brand tournaments:** a tournament may reference multiple Navbox templates (e.g., a LAN that's also part of a tour series). Current schema enforces a single `brand_slug` FK -- multi-brand cases get flagged at parsing time for operator review; resolution lives outside this spec.

## References

- `docs/superpowers/parking/2026-05-06-qwiki-phase-4-brand-discovery-resume.md` -- pivot resume doc
- `docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/operator-review.md` -- 14-decision walk-through that motivated the pivot
- `docs/superpowers/parking/2026-05-06-qwiki-phase-4-canonical/supervisor-design.md` -- prior canonicalization supervisor design (superseded by this spec)
- `docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md` -- existing arc decisions (D9, D14, D18 most relevant)
- `apps/qw-oracle/API_CONTRACTS.md` -- profile-notes pattern, type discriminator at MCP surface, frontmatter-mirrors-row convention
- `apps/qw-oracle/db/migrations/008_community_schema.sql` -- existing community.players, community.clans, community.tournaments placeholder
