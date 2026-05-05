# Review findings -- evidence ledger

This file is the audit trail of issues surfaced during plan drafting and execution. Each finding cites evidence and tags which decision in `decisions.md` resolves it (or which phase resolves it, if no decision needed).

The file decoupling: `decisions.md` carries the FIX; this file carries the WHY. Phase drafters consult both.

---

## How to use this doc

While drafting each phase MD:
1. Skim the findings table at the bottom for findings tagged with the phase you're drafting.
2. Verify the relevant decision in `decisions.md` resolves the issue. If a finding has no decision tag, either the phase resolves it directly or it remains open (operator review).
3. If the phase doesn't naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.
4. New findings discovered during phase drafting append here with sequential F-number.

---

## Status: no prior plan attempt

This arc has not been planned before; there is no monolithic-plan precursor with bugs to enumerate. Findings will accrue during phase MD drafting and during execution.

The brainstorm pass produced a design spec (`docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`) that is the source of truth for scope and ratified decisions. The spec is well-scoped; per-phase drafters should not need to re-derive structural choices.

---

## Findings

**F1 -- Slug collision count verified at exactly 4.**
Python analysis of article-list.json against the actual slugify scheme (spaces -> `_`, `/` -> `_`) confirms exactly 4 collisions, all involving `Quakeworld Eternal/<Map>` vs `Quakeworld Eternal <Map>`. The spec's "4 article-pair collisions" claim is accurate. No other collisions exist in the 9178-article corpus.
Resolves via: Phase 0, Task 2. Phase 0.

**F2 -- Snapshotter script is ad-hoc and not committed; at risk of loss.**
The full snapshot was produced by `/tmp/qwiki-pilot/full-scrape.py`. This path is in /tmp and will be lost when the originating shell session ends. Phase 0 must commit it (as `scripts/snapshot-wiki/snapshot.py`) before it disappears.
Resolves via: Phase 0, Task 1. Phase 0.

**F3 -- 503 slash-title articles use single-underscore slugs; only 4 need re-fetch.**
The original slugify treated `/` identically to ` `, producing single-underscore slugs for all slash-title pages. Of 503 slash-title articles, only 4 collided. The other 499 are stored correctly (no collision partner) under single-underscore slugs. Phase 2/3/4 parsers need a slug-lookup helper that resolves both slug schemes (single-underscore historical, double-underscore for the 4 re-fetched articles).
Resolves via: Phase 0, Task 2 + manifest note. Phase 0 (Q2 in Open questions for operator decision on full re-fetch).

**F4 -- Redirect bug: arprop='target' is not a valid MediaWiki allredirects property.**
The original full-scrape.py called `arprop=target|fragment`. The value `target` is not a valid allredirects arprop (valid: `ids`, `title`, `fragment`, `interwiki`). MediaWiki returned an error JSON without a "query" key; the paginated wrapper treated the missing key as an empty list, silently writing `[]` to redirects.json. Correct call: `arprop=ids|title` returns `fromtitle` (source) and `title` (target) for each redirect.
Resolves via: Phase 0, Task 3. Phase 0.

**F5 -- manifest.json articles_fetched=9178 overcounts by 4.**
The original script incremented its `fetched` counter for every page written, including the 4 slug-clobbered writes. Actual unique article files: 9174 (confirmed via os.listdir). The manifest count is misleading. Task 5 corrects it.
Resolves via: Phase 0, Task 5. Phase 0.

**F6 -- Spec DDL is pre-D5-refinement; missing `is_substantive` columns.**
The spec's "Schema" section (`docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`) shows `community.players`, `community.clans`, and `community.tournaments` with `has_note BOOLEAN` and `is_stub BOOLEAN` only. D5 (added during planning) requires `is_substantive BOOLEAN` as a separate flag from `has_note`. Phase 1 migration correctly adds all three booleans. **Drafters of Phase 4 (tournament schema discovery) must treat `decisions.md` as authoritative for column shape, NOT the spec's column lists**. The spec is the scope/intent source of truth; decisions.md is the column-shape source of truth.
Resolves via: drafter awareness; no migration change required. Phase 4 awareness item.

**F7 -- 129 case-variant article pairs in snapshot are intentionally distinct.**
Live recon found 129 article pairs that differ only by letter case (e.g., `AGAIN` vs `Again`, `Immortal` vs `IMMORTAL`). These are NOT slug bugs -- the slugify intentionally preserves case, so case-variant titles produce distinct slugs and are stored as separate files. Phase 2/3/4 parsers must treat slugs as case-sensitive distinct identities. Do NOT collapse case-variant pages during stub detection or alias building -- they may be different community entities.
Resolves via: drafter awareness in Phase 2/3 parsers.

**F8 -- `tournament_results.tournament_slug` is deliberately a soft reference (no FK).**
Phase 1 migration creates `community.tournament_results.tournament_slug TEXT NULL` with NO `REFERENCES community.tournaments(slug)` clause. Reason: Phase 5 backfill loads cross-link rows from achievements lists BEFORE Phase 4's tournament parser populates `community.tournaments`, so a hard FK would cause insertion failures. The spec's DDL comment "references where matchable" was prose intent, not a SQL constraint. Cross-link integrity is enforced by post-load join queries, not FK constraints.
Resolves via: Phase 1 migration design; Phase 5 awareness.

**F9 -- `player_clan_eras` PK redesign: surrogate id + UNIQUE; year-absent rows representable.**
Surfaced during Phase 2 drafting (Phase 2 Q1). The original Phase 1 migration set PK `(player_slug, clan_title, start_year)` which forced `start_year NOT NULL`. The Phase 2 parser, faithful to wiki source, produces year-absent rows for bullet-list Clan-history sections (ParadokS-style). These would have failed Phase 5 INSERT.

**Resolution applied to Phase 1 BEFORE execution** (so no migration 010 is needed): switched to surrogate `id BIGSERIAL PRIMARY KEY`, nullable `start_year`, added `era_seq INT` for list-order preservation across re-loads, added `UNIQUE (player_slug, clan_title, start_year, source)` for idempotency. Year-known rows dedupe deterministically; year-absent rows are uncommon and Phase 5 truncates-and-rebuilds the table per re-run regardless. Bullet-list clan eras (ParadokS, Crit, the older Player-info pages) keep recognition signal.

Trade-off accepted: Postgres treats NULL distinctly per row in UNIQUE indexes, so a re-run could in theory duplicate year-absent rows for the same (player, clan, source). In practice Phase 5 truncates-and-rebuilds, so this is harmless. If a future arc switches to incremental upsert, revisit with a `COALESCE(start_year, -1)`-based unique index.

Resolves via: Phase 1 migration 008 (amended); Phase 2 Q1 (resolved); Phase 5 awareness (era_seq computed at upsert time from list-position).

---

## Phase ownership of findings

| F# | Finding | Resolves via | Phase |
|----|---------|--------------|-------|
| F1 | Slug collisions exactly 4 (confirmed) | Phase 0, Task 2 | 0 |
| F2 | Snapshotter not committed; at risk of loss | Phase 0, Task 1 | 0 |
| F3 | Slash-title slug scheme mixed (now resolved by refetch-all-503) | Phase 0, Task 2 | 0 |
| F4 | Redirect bug: invalid arprop='target' caused silent empty result | Phase 0, Task 3 | 0 |
| F5 | manifest.json articles_fetched overcounts by 4 | Phase 0, Task 5 | 0 |
| F6 | Spec DDL pre-D5; decisions.md authoritative for column shape | drafter awareness | 4 |
| F7 | 129 case-variant article pairs intentionally distinct | drafter awareness | 2, 3 |
| F8 | tournament_results.tournament_slug is soft reference (no FK) | Phase 1 migration; Phase 5 awareness | 1, 5 |
| F9 | player_clan_eras PK redesigned: surrogate id + UNIQUE; year-absent rows representable | Phase 1 migration 008 amended; Phase 2 Q1 resolved | 1, 2, 5 |

(F1-F5 accrued during Phase 0 drafting, 2026-05-05. F6-F8 accrued during planner groom pass, 2026-05-05. F9 accrued during Phase 2 drafting + groom pass, 2026-05-05.)

---

## Notes for the orchestrator

When wave 2 (arc-orchestrator) drives execution, mid-arc findings (issues discovered while a phase is shipping) append here in the same shape. The orchestrator may also append "deviation from decision" findings if a phase ships with a documented deviation that needs to be tracked across the rest of the arc.

The post-arc-reviewer (wave 2 / arc-reviewer skill) consumes this file as the audit trail input alongside `decisions.md` amendments and `arc-history.md`.
