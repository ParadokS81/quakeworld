# qw-oracle API Contracts

**Status:** Active. Test-only consumers (slipgate-app JSON snapshot pipeline; public MCP surface restricted to operator testing). This doc is the contract qw-oracle builds against and verifies against -- not a public SLA. When real external consumers materialize, the items in **Open drift** (last section) become breaking-change blockers to close before exposure.

## Why this doc

The MCP server is a librarian sitting in front of three layers of knowledge (L1 facts / L2 chat / L3 curated). Output quality is a roundtrip: the consumer LLM has to know what's in the library (Discovery), how to ask for it (Query), and the data has to be shaped so retrieval is honest (Storage). All three contracts decay silently when datasets get added without re-checking the contract surface. This doc is the artifact that holds the line.

## The three contracts

| Contract | What it guarantees | Maintained by |
|---|---|---|
| **Discovery** | Consumer LLM can route to the right tool from tool catalog + orientation alone | Tool list + orientation blob (`serve/mcp/src/orientation.ts`) |
| **Query** | Consumer LLM can ask correctly and trust `match_quality` to gate downstream synthesis | Tool input schemas + per-tool `match_quality` calibration |
| **Storage** | Data is shaped so retrieval is precise and the chunk space stays coherent | Postgres schema + Voyage 4 embedding pipeline + frontmatter discipline on L3 |

Decay symptoms:
- **Discovery decay** -> consumer LLM picks the wrong tool, or pleads for the tool catalog mid-conversation.
- **Query decay** -> garbage parameters, or weak matches arriving as confident answers.
- **Storage decay** -> predicates can't filter without table scans, or chunk relevance gets diluted by mixing dataset shapes in one index.

### Storage contract: L3 frontmatter discipline

For any L3 sub-bucket with row-shaped data underneath (profile-notes, asset-notes, future structured sub-buckets), the rule is:

> **Frontmatter mirrors the row's stable fields; body carries unique prose / quotes / settings that the row schema cannot represent.**

Source: qwiki-community-reference arc D18 (2026-05-08). The open-drift item #2 below (920 player/clan note files not exposed via MCP) is the cautionary tale of authoring a sub-bucket without this discipline. New sub-buckets in the L3 expansion pattern table inherit this rule by default.

### Query contract: name lookups are case-insensitive; source case is returned

> **Any-case in, source-case out.** `lookup_entity` resolves a name regardless of the caller's capitalization (`unignoreAll` == `unignoreall` == `UNIGNOREALL`), and returns the entity's `name` in the **source capitalization the engine registered** (`loadFragfile`, not `loadfragfile`).

Enforced structurally, not by convention: `entities.name_fold` (migration 013, `lower(name)` except `token_primitive`) is the match key for `lookup_entity`, the loader's existence/alias checks, and the cross-type-orphan prune. A consumer that compares against raw `name` re-introduces the bug -- match on `name_fold` (or call `lookup_entity`, which does). The sole carve-out is `token_primitive`: `$B` (blue LED) and `$b` (glyph) are deliberately distinct and case-sensitive.

## Tool catalog (current 12)

Tools are organized by **verb shape**, not by data category. Adding a new data category does not justify a new tool unless the verb is genuinely new.

| Layer | Tools | Verb |
|---|---|---|
| L1 entities (cvar / command / macro / cmdline_param / ruleset) | `lookup_entity`, `search_entities` | name-known vs free-text retrieval |
| L1 maps | `lookup_map`, `search_maps` | name-known vs filtered listing |
| L1 mechanics | `lookup_mechanic`, `search_mechanics` | name-known vs filtered listing |
| L1 gameplay entities (weapons / items / projectiles) | `lookup_gameplay_entity`, `search_gameplay_entities` | name-known vs filtered listing |
| L2 chat sessions | `search_solved_issues` | full-text retrieval |
| L3 concept notes | `search_concepts`, `get_concept_note` | hybrid retrieval vs full body fetch |
| Honest failure | `redirect_to_human` | escape valve |

Tool count is a finite resource. Every tool description is loaded into every connecting LLM's context whether it gets used or not. Healthy ceiling: ~15. Hard ceiling: ~25 -- past that, consumer LLMs pick wrong tools because the catalog gets noisy.

## Response shape: `ToolResponse<T>`

The canonical envelope (defined in `serve/mcp/src/types.ts`):

```typescript
interface ToolResponse<T> {
  results: T[];
  match_quality: 'strong' | 'weak' | 'none';
  suggested_fallback: string | null;
  meta: { tool: string; server_version: string; queried_at: string };
}
```

**Rule:** every tool returns `ToolResponse<T>`. Filter-style tools (no relevance ranking, just SQL predicates) still wrap in this shape with binary `match_quality` (`'strong'` if rows, `'none'` if empty). Lookup-style tools (single named record) wrap with binary too.

**Drift today:** 6 tools (`lookup_map`, `search_maps`, `lookup_mechanic`, `search_mechanics`, `lookup_gameplay_entity`, `search_gameplay_entities`) return ad-hoc shapes (`{ found, record }`, `{ rows, count, truncated }`). Migration: wrap their existing data in `ToolResponse<T>`; SQL underneath unchanged. Until migrated, the orientation blob's promise that "every search response includes match_quality" is partially false on these 6.

## `match_quality` semantics

Three buckets, per-tool meaning:

| Bucket | What it means | Consumer LLM behavior |
|---|---|---|
| `strong` | Result is good enough to synthesise from | Cite by `canonical_id` / slug / `session_id`; build the answer |
| `weak` | A result exists but quality is borderline | Either request follow-up via another tool, or call `redirect_to_human`; never confabulate |
| `none` | Corpus does not cover this | Call `redirect_to_human` or state plainly that the corpus does not cover the question |

Per-tool calibration:

| Tool | Signal source | Status |
|---|---|---|
| `lookup_entity` | row-presence + help_desc length proxy | OK |
| `search_entities` | RRF fused score with shared `MATCH_QUALITY_*` thresholds | OK (calibrated 2026-05-06: STRONG=0.02 WEAK=0.005) |
| `search_concepts` | RRF fused score, same shared thresholds | OK (calibrated 2026-05-06, same values) |
| `get_concept_note` | binary by id presence | OK |
| `search_solved_issues` | top-result `ts_rank` against `L2_TS_RANK_*` thresholds | Logic OK; thresholds placeholder (STRONG=0.05 WEAK=0.005) pending an L2 calibration set |
| `lookup_map` / `search_maps` | binary by row-presence | OK |
| `lookup_mechanic` / `search_mechanics` | binary by row-presence | OK |
| `lookup_gameplay_entity` / `search_gameplay_entities` | binary by row-presence | OK |
| `redirect_to_human` | binary by row-presence | OK |

**Calibration discipline:** thresholds for ranked retrieval tools get tuned against a labeled eval set; calibration data lives at `eval/calibration-queries.json` (disjoint from `eval/eval-queries.json` per D10). Run `bun run calibrate` from `apps/qw-oracle/` to sweep candidate thresholds against the calibration set; write the printed values into `.env` (dev) or `/mnt/user/appdata/qw-oracle/.env` (prod). Recalibrate after any extension to the calibration set or any change to the embedding model. The L2 (`search_solved_issues`) threshold pair has its own env vars (`L2_TS_RANK_*`) and currently uses placeholders -- a Layer 2 calibration set is a future deliverable, dependent on Arc 3 chat-corpus rebuild landing the L2 embedding pipeline.

## Orientation contract

The orientation blob (`serve/mcp/src/orientation.ts`) ships to every connecting LLM at MCP `initialize` via the Server constructor's `instructions` field. It teaches:

- The three layers and which tools cover each.
- Recommended iteration order (start with `search_concepts` for how-to, `search_entities` for facts, `search_solved_issues` for community history).
- The `match_quality` honest-failure protocol.
- Citation discipline (`canonical_id` / slug / `session_id`; "the AI says" is not a citation).

**Update rule:** every new tool, new layer, or change to citation discipline requires an edit to the orientation blob in the same commit. Adding a tool without orientation update is invisible to consumers and silently breaks Discovery.

## New-dataset checklist

When adding a dataset to qw-oracle, answer these in order:

1. **Which layer?** L1 (extracted facts) / L2 (chat history) / L3 (curated markdown).
2. **Does the query shape match an existing tool?** Same verb (lookup / search / get-full) and same return shape = rows behind an existing tool. If yes, stop here.
3. **If yes, does it need a `type` discriminator?** Add a `type` column, index it, expose via the existing tool's filter parameter. **No new tool.**
4. **If no, justify the new tool.** What verb does none of the existing 12 tools cover? "Different noun" is not a justification. "Different verb" is.
5. **Discovery update.** Edit the orientation blob and any affected tool description. If a consumer LLM cannot route to the new dataset from the catalog + orientation alone, the contract is broken.
6. **Query update.** Define the `match_quality` story. When does this dataset honestly return `'none'`? Calibration thresholds, if hybrid retrieval, get scheduled alongside the eval-set deliverable.

## L3 expansion pattern (Path C)

L3 originally meant "concept notes." It is now correctly framed as **curated markdown knowledge with consistent retrieval contracts** -- concept-notes is one shape inside that broader layer. Other shapes earn their own subfolder + table + `type` discriminator:

| Note type | Authoring directory | Storage | Tool surface | Status |
|---|---|---|---|---|
| concept-notes | `curated/concept-notes/` | `concepts` + `concept_chunks` (Voyage 4 hybrid) | `search_concepts`, `get_concept_note` | Live |
| player-notes | `curated/player-notes/` | `community.players` + `community.player_clan_eras` + `community.tournament_results` | `search_profiles(type='player')`, `lookup_profile(type='player')`, `get_profile_note(type='player')`, `lookup_by_nick` | Storage shipped (Phase 2: 5,903 rows). Note files: ~570 has_note=true. MCP tools pending (Phase 6). |
| clan-notes | `curated/clan-notes/` | `community.clans` + `community.player_clan_eras` | same tool surface (`type='clan'`) | Storage shipped (Phase 3: 822 rows). Note files: ~350 has_note=true. MCP tools pending (Phase 6). |
| tournament-notes | `curated/tournament-notes/` | `community.tournaments` (Phase 1 placeholder; columns added Phase 4) + `community.tournament_results` | same tool surface (`type='tournament'`) | Phase 4 paused on LLM-extraction sidequest (QWiki tournaments are heterogeneous; deterministic parser unsuitable). Resuming as a Haiku scrape pass. |
| asset-notes | `curated/asset-notes/` | TBD (`concepts` + `concept_chunks` with `type='asset'` discriminator likely) | TBD (`get_concept_note(type='asset')` + `search_concepts(type='asset')` likely; `lookup_asset_type` for richer envelope if proven) | Authoring in flight (asset-type-curate skill arc 2026-05-13); MCP exposure deferred until bucket populated. |
| era-notes (future) | `curated/era-notes/` | TBD (likely `community.eras`) | TBD (likely extends `search_profiles` with `type='era'`) | Not yet started. |

**L3 sub-shapes (three patterns observed so far):**

- **Free-form synthesis** (concept-notes) -- authored deep, hand-tuned, slug + frontmatter + prose body. Open-ended topics.
- **Wiki-import biographical** (profile-notes: player / clan / tournament) -- structured rows + optional unique-content body. Bounded sets imported from community wikis.
- **Engine-data synthesis** (asset-notes) -- bounded set, seed-mirrored frontmatter, prose body for unique content the row schema cannot represent. Bridges L1 facts to L3 narrative.

Future sub-buckets pick the closest sub-shape; new sub-shapes earn their own pattern documentation here when they emerge.

**Decision (Path C):** profiles get a dedicated schema (`community.*`) + a single unified MCP tool surface. Two reasons:

1. Concept-notes are authored synthesis (deep, structured, hand-tuned). Profile-notes are biographical wiki imports (structured rows + optional unique-content body). Mixing both in one retrieval index dilutes both -- a query for "weapon scripts" should not surface a player who happened to script well.
2. Tool catalog stays small. One unified tool surface with a `type` discriminator (`search_profiles`, `lookup_profile`, `get_profile_note`, plus `lookup_by_nick` for cross-type alias resolution) ships **+4** tools to the catalog instead of the 10 a per-type design would require. Catalog growth 12 -> 16 stays in the healthy band.

Path C concrete shape (qwiki-community-reference arc, Phases 1-3 shipped storage, Phase 6 ships MCP):
- Storage: `community.players` / `community.clans` / `community.tournaments` + cross-link tables `community.player_clan_eras` / `community.tournament_results` (migration 008 + 009 in `apps/qw-oracle/db/migrations/`).
- Loader: deterministic Bun scripts at `apps/qw-oracle/scripts/load-community/<phase>/` per the arc's D14 amendment. Tournaments diverge to Haiku-driven LLM extraction (D4 amendment in flight).
- MCP: four tools branched on `type` -- `search_profiles(query, type, limit)`, `lookup_profile(slug, type)`, `get_profile_note(slug, type)`, `lookup_by_nick(nick, limit)`. The first three branch internally on `type` to query the right `community.*` table; `lookup_by_nick` is a different verb (cross-type alias resolution) and stays separate.
- Note frontmatter: per the arc's D18 -- frontmatter mirrors the row's stable fields, body carries unique prose / quotes / settings tables that the row schema cannot represent.

The pattern is proven by the qwiki arc (Phases 1-3 shipped); Phase 6 (MCP tools) is the remaining work, gated on Phase 4 (tournament LLM-extraction sidequest) and Phase 5 (cross-link backfill).

## Open drift

| # | Drift | Severity | Fix |
|---|---|---|---|
| 1 | L2 `search_solved_issues` thresholds (`L2_TS_RANK_STRONG_THRESHOLD` / `_WEAK_THRESHOLD`) are placeholders | Medium (L2 match_quality bucket boundaries are guess-grade until calibrated) | Build an L2-shaped calibration set after Arc 3 lands embeddings on Layer 2; rerun the sweep. |
| 2 | ~920 markdown files in `curated/player-notes/` and `curated/clan-notes/` are not exposed via MCP | Critical for the in-flight L3 expansion arc | Path C: `profiles` + `profile_chunks` tables, `search_profiles` + `get_profile` tools. |

Drift items closed in the 2026-05-06 cleanup pass: response-shape unification across the 6 ad-hoc tools (now all return `ToolResponse<T>`); `search_concepts`/`search_entities` calibration confirmed (live thresholds match the optimum on the 5-query calibration set); `search_solved_issues` switched from count-based to `ts_rank`-based bucketing; `info_key` doc leak stripped from `lookup_entity` description; orientation blob reordered to L1/L2/L3.

Remaining drift items get closed as the work that touches the relevant area happens. Item #2 is the natural opener for the next L3 arc.
