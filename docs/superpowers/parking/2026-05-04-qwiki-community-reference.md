# QWiki community-reference layer -- arc capture

**Captured:** 2026-05-04 by brainstorm session in main terminal.
**Status:** Design spec complete. Snapshot landed. Ready for arc-planner in fresh terminal.
**Design spec:** `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md` (source of truth from this point forward).
**Trigger to start:** L2 corpus reconstruction primer requires nick + clan + tournament recognition. Operator-initiated.

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
