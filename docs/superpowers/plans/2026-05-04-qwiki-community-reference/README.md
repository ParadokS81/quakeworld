# QWiki community-reference arc -- Players + Clans + Tournaments

**Spec:** `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`

**Goal:** Build a community-reference layer in qw-oracle covering three entity types -- players (5,903), clans (829), tournaments (~700-900). Two outputs per type: Postgres rows in a new `community.*` schema (every entity, recognition signal) and curated markdown notes under `apps/qw-oracle/curated/<type>-notes/` (only for entries with content the row schema cannot carry). The arc also reframes Layer 3 from "concept-notes only" to a curated knowledge layer with multiple typed note-folders.

**Snapshot:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` (51 MB raw; 9,173 articles + 767 templates + 324 categories captured 2026-05-04 from quakeworld.nu MediaWiki 1.35.10 API).

**Status:** Planning. Per-phase MDs drafted by fresh terminals following the per-phase drafter prompts (currently only `phase-7-drafter-prompt.md` since Phases 0-6 are already drafted). Each phase MD verified by a sub-agent before operator review. Phases land in commit order; each phase boundary is operator-reviewed before the next phase begins.

---

## Where we are right now

- **Stage:** Phases 0-3 SHIPPED. Phase 4 PAUSED at T2 boundary (pilot output approved with amendments; D4 amendment pending design pass). Phases 5-7 pending.
- **Last action:** 2026-05-05 -- Phase 4 T1 pilot subagent shipped a 30-column proposal + is_substantive heuristic + has_note v1 rule + 7 open questions (commit 98cc47be); operator T2 review surfaced TWO architectural pivots that pause Phase 4 in place. (1) Pilot's blanket Q3 "load all slash-title sub-events" was over-broad; corpus has ~150 substantive sub-events + ~50-80 wiki-internal tabs (rules / standings / teams / etc.) that pollute lookup_tournament results. (2) Operator surfaced fundamental concern: tournament page structure is heterogeneous (mixed types: tournament/league/ladder/cup; umbrella series; results in Infobox OR body OR sub-pages OR not at all; randomized formatting per page) in a way player/clan pages aren't, so deterministic 4-branch parser is the wrong tool here. Pivot direction: amend D4 to allow LLM-with-checklist extraction for tournaments (Haiku 4.5; ~$5 corpus-wide; provenance columns baked into migration 009). Players + clans stay deterministic. Pause + side-quest opened to design the LLM-extraction approach concretely (prompt template + JSON schema + runner architecture + sub-page autonomous classification + redrafted Phase 4 MD). F29 (Phase 3 missed 24+ Infobox 4on4team articles -- Black_Book, Milton_s_Mutants, FAgomatic, ELAK -- because their wiki articles have empty categories; isClanArticle filter is category-driven) accrued during the same review pass; deferred to a Phase 3.5 small followup.
- **Next action:** open fresh terminal, paste the side-quest brainstorm handoff at `docs/superpowers/parking/2026-05-05-qwiki-phase-4-llm-extraction-sidequest.md`. Side-quest deliverable is a redrafted Phase 4 MD using LLM-extraction approach. Once design converges and operator approves, orchestrator session #3 resumes against the amended Phase 4 plan. Phase 4 executor parking doc at `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-4-executor.md` is SUPERSEDED -- kept as historical record of the deterministic-path plan; do not execute it as-is. F28 (Phase 3 doc-transcription `397 -> 688`) and F29 (Phase 3 missed 24+ infobox_4on4team articles) captured in `review-findings.md`.

Update these three lines whenever a phase boundary changes state. They are the source of truth for "where am I" when picking the arc back up cold.

---

## Read in this order

If you're new to this arc, read top-to-bottom:

1. **[`prerequisites.md`](prerequisites.md)** -- Operator-side one-shot setup. Most items inherited from qw-oracle Arc 1.
2. **[`decisions.md`](decisions.md)** -- 20 locked cross-cutting decisions (two-output model, two-threshold rows, deterministic extraction, curated/ reframe, etc.). Every phase respects these.
3. **[`review-findings.md`](review-findings.md)** -- Findings ledger (currently empty for this fresh arc; new findings accrue here as discovered).
4. **[`phase-template.md`](phase-template.md)** -- Mandatory shape for each phase MD (sections, execution-mode column, sub-agent verification brief).
5. **Per-phase MDs** (drafted in order; see "Phase index" below).

If you're the fresh terminal that's about to draft a phase, also read:

6. **[`handoff-prompt.md`](handoff-prompt.md)** -- Your orientation. Tells you what this arc is, what context you'll need, what sub-agent verification looks like, and how to halt for review.

---

## Phase index (provisional, pending slicing-analysis confirmation)

Phases land in order. Each phase commits a coherent unit (per `decisions.md` D16). Operator reviews at phase boundaries before the next phase starts.

| Phase | Status | MD | Drafter prompt | Deliverable | Runnable state at end |
|---|---|---|---|---|---|
| 0 | shipped | `phase-0-snapshot-finalize.md` | (drafted; n/a) | Slug-collision fix + redirect refetch + commit-policy decision | Snapshot is trustworthy; future arcs can build on it |
| 1 | shipped | `phase-1-curated-rename.md` | (drafted; n/a) | curated/ folder rename + community schema migration (008) | Existing concept-note retrieval still works; community tables exist and empty |
| 2 | shipped | `phase-2-players.md` | (drafted; n/a) | Players parser (3 template branches + fallback) + load 5,903 rows + emit player-notes | community.players populated; curated/player-notes/ has tuned count of substantive content-rich notes |
| 3 | shipped | `phase-3-clans.md` | (drafted; n/a) | Clans parser (2 branches + fallback) + load 829 rows + emit clan-notes | community.clans populated; curated/clan-notes/ has tuned count |
| 4 | approved | `phase-4-tournaments.md` | (drafted; n/a) | Pilot (~50 pages, schema discovery) + migration 009 + parser + load + emit tournament-notes | community.tournaments populated; curated/tournament-notes/ has tuned count |
| 5 | approved | `phase-5-cross-link-backfill.md` | (drafted; n/a) | Parse achievements -> tournament_results; parse clan history -> player_clan_eras; match against community.tournaments / community.clans | Cross-link tables populated; sample queries return expected names |
| 6 | approved (NEEDS REDRAFT per D11 amendment 2026-05-06) | `phase-6-mcp-tools.md` | (drafted; needs redraft) | search_profiles / lookup_profile / lookup_by_nick / get_profile_note tools (4 unified, not 10 per-type) | MCP server returns community data via 4 unified tools (catalog 12 -> 16) |
| 7 | approved | `phase-7-l2-primer.md` | (drafted; n/a) | Primer artifact for L2 corpus reconstruction analyzer | Primer recognizes reference players (Milton, ParadokS, etc.) with correct nationality + clan affiliation |

When a phase MD lands, change `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

The provisional 8-phase shape matches the spec's decomposition. Slicing-analysis confirmation with the operator may merge Phase 0 + Phase 1 (both are short horizontal infra) or split Phase 4 into pilot + parser sub-phases. Lock the phase index here once slicing is confirmed.

---

## What this arc deliberately does NOT cover

Per `decisions.md` and the spec's non-goals section:

- **Maps** (205 wiki pages). Future arc; snapshot is reusable.
- **Match reports** (369 wiki pages). Future arc.
- **Engine / mod / community-meta articles** (~1,700 pages). Not part of community-history triangle.
- **xantom's tournament-archive merge.** Schema accommodates via `source` column (D10); merge is its own arc.
- **Quarterly re-scrape automation.** Manual today; ops concern later.
- **Round-trip editing from quake.world surface.** Designed-for, not built.
- **Public quake.world community pillar pages** (player profiles, clan pages). They will consume this arc's markdown; building them is platform work, not oracle work.
- ~~**Unified `search_curated` MCP tool** (cross-type retrieval). Per-type tools ship in v1; unification is a follow-up arc.~~ **OBSOLETE per D11 amendment 2026-05-06.** The unified tool (`search_profiles` / `lookup_profile`) IS v1; per-type tools are not built. See `apps/qw-oracle/API_CONTRACTS.md` for the contract.
- **LLM-driven note generation.** D4 locks deterministic extraction; LLM enters only for the Phase 4 tournament schema-discovery pilot (~50 pages, one-time).

If a phase drifts into one of these, that's a scope creep -- flag it.

---

## Why split into per-phase MDs?

Two reasons (same as the qw-oracle Arc 1 split):

1. **Context window discipline.** Per-phase MDs leave room in the executor's working memory for live source reads, sub-agent dispatch, and verification.

2. **Verification at boundaries.** Each phase MD gets a dedicated sub-agent verification pass before operator review. This catches drift mechanically -- file-path mismatches, decision-doc violations, schema-name typos.

The split is structural, not just cosmetic. See `decisions.md` D16 (phase atomicity) and the phase-template.md "Verification sub-agent" section.

---

## Operator quick-reference

- **Kicking off a fresh phase-drafting session:** open a new terminal, paste the contents of the relevant `phase-N-drafter-prompt.md` (pre-rendered per-phase prompt; no edits needed). Phases 0-6 are already drafted; only `phase-7-drafter-prompt.md` remains. If a phase MD needs re-drafting, fall back to the master `handoff-prompt.md` template with PHASE_NUMBER substituted.
- **Reviewing a drafted phase:** read the phase MD top-to-bottom, run the verification queries listed at the bottom, eyeball the file lists and SQL, sign off. Update the phase index "Status" column AND the "Where we are right now" lines at top of this README.
- **A finding resolves but conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase MD's "Open questions" section. If the decision itself is wrong, amend `decisions.md` before re-running the phase draft.
- **A new finding emerges during phase drafting:** append to `review-findings.md` with a sequential F-number and tag which phase resolves it.

---

## Mid-arc handoff to wave 2 (optional)

If wave 2 (arc-orchestrator + arc-executor) is available when this arc executes, the orchestrator drives per-phase executor terminals using the phase MDs as input. If wave 2 is not yet shipped, the operator drives executor terminals manually using the executor handoff documented in each phase MD's recovery section.

The orchestrator handoff lands at `docs/superpowers/parking/2026-05-04-qwiki-community-reference-orchestrator-handoff.md` once all phase MDs are approved.
