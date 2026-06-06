# QWiki community-reference layer -- arc capture

**Captured:** 2026-05-04 by brainstorm session in main terminal.
**Status:** Storage shipped (Phases 1-3: players + clans). Phase 6 (profile MCP tools) is the keystone resumption -- see the "L2 Pass-4 disposition" section below. NOW FULLY DECOUPLED from the L2 arc.
**Design spec:** `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md` (source of truth from this point forward).
**Trigger to start:** API_CONTRACTS open-drift #2 (~920 authored player/clan notes invisible via MCP). NOTE: the original "L2 primer needs nick recognition" trigger is DEAD (L2 Pass 4, 2026-06-06 -- L2 no longer resolves community nicks). Operator-initiated.

---

## L2 Pass-4 disposition (2026-06-06) -- this arc is now FULLY DECOUPLED from L2

The Layer 2 corpus-reconstruction brainstorm reached Pass 4 (query-time seam) on 2026-06-06 and **severed its dependency on this arc.** The reshape had assumed L2 would resolve community nicks at query time via this arc's lookup tools; Pass 4 found L2 troubleshooting answers stand on their own (a fix is invariant under anonymizing the nicks a thread mentions), so L2 builds no lazy-resolve loop and does NOT call these tools. Community/historical questions are served by these tools **as their own retrieval surface**, not as an L2 enrichment pass.

Consequence -- the original trigger ("L2 primer requires nick/clan/tournament recognition") is DEAD. This arc resumes on its own merits, driven by API_CONTRACTS open-drift #2 (~920 authored player/clan notes are invisible via MCP). Concrete resurrect-vs-drop call from L2 Pass 4:

| Phase | Call | Note |
|---|---|---|
| **Phase 6** -- profile MCP tools (`search_profiles` / `lookup_profile` / `get_profile_note` / `lookup_by_nick`) | **RESURRECT -- keystone, own small arc** | Build `lookup_by_nick` so a **Discord-ID is an alias key** into a profile (forward-compat for the future author->profile crosswalk: matchscheduler Discord-OAuth logins now, community-site identity DB later). Unblocks drift #2. |
| **Phase 4** -- tournaments (Haiku extraction, paused) | **Incremental** | Players + clans ship first; tournaments follow opportunistically. |
| **Phase 5** -- cross-link backfill | **Incremental** | Richness, not blocking. |
| **Phase 7** -- L2 primer | **DROP** | Dead twice over (Pass-1.5 reshape + Pass-4 lazy-loop drop). |

Author-trust note: L2 Pass 4 also parked a tiny curated "author-authority" reference (a dozen known community devs + domains) as a soft synthesis-time nudge -- once Phase 6's profiles carry an authority signal, that note merges into the profile data. See the L2 design spec's "Pass 4 outputs" section.

---

## Verification first

Before arc-planner starts: confirm the snapshot is intact at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` and `manifest.json` shows 9,178 articles fetched. The snapshot is the foundation; if it's gone, Phase 0 has to re-run before planning.

```bash
ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/
cat apps/qw-oracle/data/wiki-snapshots/2026-05-04/manifest.json
ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ | wc -l   # expect 9174
```

---

## Scope summary

Build a **community-reference layer** in qw-oracle covering:
- **Players** (5,903 wiki pages -- ~2,000 substantive)
- **Clans** (829 wiki pages -- ~400 substantive)
- **Tournaments** (~700-900 with overlap -- count after Phase 4 pilot)

Two outputs per entity type:
1. Postgres rows in new `community.*` schema (every entity, including stubs -- recognition signal)
2. Curated markdown notes under new `apps/qw-oracle/curated/` tree (substantive entries only)

This arc also reframes Layer 3: from "concept-notes only" to **a curated knowledge layer with multiple typed note-folders** (`curated/concept-notes/`, `curated/player-notes/`, `curated/clan-notes/`, `curated/tournament-notes/`). Same MCP retrieval contract, different per-type templates.

---

## Why arc-shaped

Eight phases identified, ranging from 30-min mechanical setup (snapshot finalize) through 3-4 hr per-entity parser work (players, tournaments). Phase 4 (tournaments) requires its own pilot before parser commit -- it's not pre-pilot'd like players + clans were.

Cross-cutting concerns:
- Curated/ rename touches existing concept-note loader paths and MCP tool definitions
- Cross-link backfill (player_clan_eras, tournament_results) depends on all three parsers landing first
- L2 primer build is the trigger but lands as the final phase, not the first

This is `arc-planner` shape: multi-phase, sub-agent-friendly per-phase execution, clear verification points, decisions to ratify per phase boundary.

---

## Pilot results (already captured in design spec)

310 players + 50 clans pilot'd 2026-05-04. Three player template variants (`{{Infobox player}}` / `{{Player-info}}` / NO_INFOBOX bullet-prose) and two clan variants. Stub heuristic: `{{Player-stub}}` template is unreliable (57% tagged but only ~33% truly empty); use multi-signal heuristic (≥2 of 5 fields). Disambiguation in 9% of titles (modern `(Finnish Player)` + older `(swe)` formats).

Full pilot data preserved at `/tmp/qwiki-pilot/` -- ephemeral; arc-planner / Phase 2 should pull useful samples from `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/` instead.

---

## Snapshot artifact

| Item | Value |
|---|---|
| Location | `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` |
| Size | 51 MB (compresses to ~10 MB) |
| Articles fetched | 9,174 / 9,178 listed (4 lost to slugify collisions on `/`-titles) |
| Templates | 767 / 768 |
| Categories | 324 |
| Redirects | 0 captured (pagination quirk -- API actually returns them; refetch in Phase 0) |
| MediaWiki version | 1.35.10 |
| Wall-clock | 3.5 min for raw fetch |

**Phase 0 fixes the snapshot gaps:** slugify `/`-escape for the 4 collisions; redirect refetch.

---

## Open decisions arc-planner needs to surface

| Decision | Operator preference | Notes for arc-planner |
|---|---|---|
| Single arc or split (Arc 1 = players + clans + cross-link infra; Arc 2 = tournaments) | Single arc | Re-evaluate post-Phase-4-pilot if surprises emerge |
| Snapshot commit policy | Likely commit (~10 MB compressed) | Phase 0 deliverable |
| Tournament schema details | Unknown until Phase 4 pilot | Schema sketch in spec is placeholder |
| MCP tool naming (`search_players` per-type vs unified) | Per-type for v1 | Future-arc unification not blocked by this choice |
| Substantive threshold | ≥2 of 5 signals (default) | Tunable in Phase 2 once parser is running |
| Active-year priority | `min(spawned, foundquake, earliest TH/ach year)` | Ignore birth_date |

---

## Pressure

L2 corpus reconstruction (Pass 2 pending in separate terminal) needs the primer as a Stage 0 prerequisite. Without this arc, the L2 analyzer either confabulates community names or pauses.

Slipgate work continues in parallel; this arc is a side-quest that doesn't compete with slipgate's main attention.

Operator estimates "finished tonight" -- arc-planner judges realistic phasing and may push back if 11-17 hr seems tight.

---

## Related

- **Spec (source of truth):** `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`
- **Trigger:** `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md`
- **Postgres backbone:** `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`
- **Existing L3 surface:** `apps/qw-oracle/concept-notes/` (renames to `apps/qw-oracle/curated/concept-notes/` in Phase 1)
- **Snapshot artifact:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`
- **Pilot scratch (ephemeral):** `/tmp/qwiki-pilot/`
- **Memory:** `project_qw_oracle_vision.md`, `project_layer3_two_path_curation.md`, `project_concept_notes_vertical_slice.md`
