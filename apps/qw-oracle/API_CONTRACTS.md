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

### Query contract: entity projects and types (`lookup_entity` / `search_entities`)

**Seven projects.** The `project` parameter is a free-form string (no enum -- an unknown value simply matches nothing) whose description names all seven live projects: `ezquake | fte | ktx | mvdsv | qtv | qwcl | qwfwd`. The SQL was always project-agnostic; before Phase 3 the tool *descriptions* named only four, so qwcl / qtv / qwfwd were invisible at tool-selection time even though they resolved fine when asked for (F11a, closed in `794b3b8e`). Discovery and capability now agree.

**Eleven types, split into a default set and a fallback set.** `ENTITY_TYPE_ENUM` (`serve/mcp/src/index.ts`) and `EntityType` (`serve/mcp/src/types.ts`) both admit:

| Reachability | Types | Behavior |
|---|---|---|
| Default (searched when `type` is omitted) | `cvar`, `command`, `macro`, `cmdline_param`, `ruleset` | `USER_FACING_TYPES` in `lookup-entity.ts` / `search-entities.ts` |
| Fallback (searched automatically when the default gives no strong match; pass `type` to narrow) | `match_event`, `info_key`, `log_template`, `protocol_message`, `qc_builtin`, `cvar_alias` | `ENTITY_TYPES` in `types.ts`; the all-kinds pass in `lookup-entity.ts` / `search-entities.ts` |

The default/fallback split is deliberate: `log_template` alone is 1,887 rows of server log-format strings, and ranking them alongside every question would crowd out the five types humans mostly ask about. Until 2026-10-02 the six were explicit-only -- reachable only by naming the type -- but prod's `query_log` showed callers never name it, so questions about `svc_playerinfo` or the `sound` builtin came back empty. Now `search_entities` re-ranks the whole public pool (default kinds included, on equal terms) when the default pass grades below `strong`, and `lookup_entity` widens to every public kind when the default kinds have no such name, then tries the signed spelling (`democache` -> `-democache`) and the `hud_`-less one (`hud_itemsclock` -> the `itemsclock` command). An explicit `type` is never widened.

Layer 1 also stores five internal-classifier types (`keyname`, `hud_element`, `token_primitive`, `flag_bit`, `asset_category`) that stay out of the MCP surface entirely -- the fallback never reaches them; they are inputs to classifiers and snapshot builders, not things a human asks for by name. Widening the enum to those is a contract change, not a bug fix (Amendment A2, 2026-08-04).

**Version data is real for every admitted type.** `entity-record.ts`'s `VERSION_TABLE` maps all eleven to their per-version table, so `current` carries actual snapshot data rather than an empty stub. `match_event` was the last hole (fixed 2026-08-04, `46632983`). Per-version tables do not all carry the same columns, and the missing ones legitimately come back null: `match_event_versions` has no `help_desc` / `source_file` / `source_line` at all (its payload is `attributes_json` + `emission_call_sites_json` + `xsd_path`, which surface under `type_specific`), and `cvar_alias_versions` has no `help_desc` (it does carry `source_file` / `source_line`). A null help field on these types means "this table has no such column", not "the extractor missed it".

## Tool catalog (current 13)

Tools are organized by **verb shape**, not by data category. Adding a new data category does not justify a new tool unless the verb is genuinely new.

| Layer | Tools | Verb |
|---|---|---|
| L1 entities (11 types -- see the entity-type contract above) | `lookup_entity`, `search_entities` | name-known vs free-text retrieval |
| L1 maps | `lookup_map`, `search_maps` | name-known vs filtered listing |
| L1 mechanics | `lookup_mechanic`, `search_mechanics` | name-known vs filtered listing |
| L1 gameplay entities (weapons / items / projectiles / monsters) | `lookup_gameplay_entity`, `search_gameplay_entities` | name-known vs filtered listing |
| L1 game modes (KTX) | `describe_mode` | composite assembly (catalog + settings + overrides + activation + concept note) |
| L2 chat threads | `search_solved_issues` | hybrid (vector + FTS via RRF) retrieval |
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

All tools return `ToolResponse<T>`; the filter-style tools set the optional `count`/`truncated` fields where meaningful. (Historical: the 6 once-ad-hoc tools were unified in the 2026-05-06 cleanup.)

### `describe_mode` envelope: two settings layers, two shapes

A KTX mode changes the game in two structurally different ways, and the envelope keeps them apart rather than merging them into one list:

| Field | Source | Shape |
|---|---|---|
| `applied_settings` | `gameplay_mechanics` rows with `kind='mode_default'` -- the per-cvar settings script the mode runs | **flattened** to `{cvar, value, scope, apply_order, comment, initstring_array}` |
| `gameplay_entity_overrides` | `gameplay_entity_defs` rows gated by `ruleset_gate_json->>'mode'` -- whole entity definitions KTX swaps in (bloodfest's 13-monster roster, midair's projectile, yawnmode's 6-row item/weapon/projectile rebalance; 20 rows across 4 modes today) | **raw** `props_json` passthrough alongside the typed numeric columns |
| `gameplay_mechanic_overrides` | `gameplay_mechanics` rows gated to the mode whose `kind` is anything *other* than `mode_default` (ca's 2 env_hazard suppressions, race's 3 score_system rows, ctf/instagib/midair/yawnmode/bloodfest constants; 17 rows across 8 modes today) | **raw** `props_json` passthrough |

**Why the shapes differ.** `applied_settings` is homogeneous -- every row is one cvar assignment, so a flat named shape is strictly better than making the consumer dig through JSONB. The two override arrays are not: `props_json` carries different keys per `kind` (an item, a weapon, a projectile and a monster each describe themselves differently), so flattening would either lose fields or invent a union type nobody wants. Passing it through raw matches what `search_gameplay_entities` and `search_mechanics` already do, so a consumer that can read one can read all three.

**Consequence for consumers:** an empty `applied_settings` does not mean "this mode changes nothing." Mutators, `race` and `bloodfest` have no `mode_default` overlays at all, yet they carry override rows. Read all three arrays before concluding a mode is a no-op. `describe_mode` branches on "does this mode have its own `mode_default` overlays", which is orthogonal to `mode_class` and orthogonal to whether overrides exist.

Live shape against the twin at v0.7.0 (settings / entity overrides / mechanic overrides): `ca` 73 / 0 / 2, `bloodfest` 0 / 13 / 2, `yawnmode` 0 / 6 / 4, `race` 0 / 0 / 3. The heterogeneity is visible in one call -- bloodfest's monster rows carry `props_json` keys `boss_able, hp_for_kill, armor_for_kill, array_position, is_first_required` while yawnmode's backpack row carries fifteen entirely different ammo-cap keys.

## `match_quality` semantics

Three buckets, per-tool meaning:

| Bucket | What it means | Consumer LLM behavior |
|---|---|---|
| `strong` | A result closely matches the question | Cite by `canonical_id` / slug / or chat thread (topic + channel); build the answer |
| `weak` | Related material exists but may not answer this exact question | Answer only from what the result actually says; follow up via another tool or call `redirect_to_human` for the rest; never confabulate |
| `none` | Corpus does not cover this | Call `redirect_to_human` or state plainly that the corpus does not cover the question |

**How the three ranked tools grade (since 2026-10-02, `serve/mcp/src/grade.ts`).** `search_entities`, `search_concepts` and `search_solved_issues` grade on *closeness*: the highest cosine similarity between the question and a returned result (0..1), against a cut-off pair per corpus. Ranking is unchanged -- RRF over the lexical, semantic and (entities) name lists -- but the label no longer comes from the fused RRF score. RRF is rank-only: the vector list always returns its nearest rows, so the old grade could never say `none`, and `strong` needed the all-words lexical list to agree, which long natural-language questions almost never do (prod `query_log` 2026-08-06..09-29: every weak concept answer scored the one-list ceiling 1/61, right answers and off-topic junk alike). Two special cases: an exact entity-name hit is `strong` whatever its description's closeness (the caller named it), and a result set with no closeness to judge by (embedding call failed, or only description-less entities matched) tops out at `weak`. Every ranked response carries `meta.best_match_score` (the closeness the label was graded on) and `meta.match_basis` (`closeness` / `exact_name` / `no_embedding` / `no_results`); each result carries its own `match_score` closeness.

Per-tool calibration:

| Tool | Signal source | Status |
|---|---|---|
| `lookup_entity` | row-presence (after the all-kinds / spelling fallback), then a length proxy over the owned L1 `description` (preferred) falling back to the raw extractor `help_desc` | OK |
| `search_entities` | closeness vs `entities` cut-offs (strong 0.50, weak 0.35); exact name hit = strong | Calibrated 2026-10-02 (37 questions; label-exact 29/37) |
| `search_concepts` | closeness vs `concepts` cut-offs (strong 0.56, weak 0.39) | Calibrated 2026-10-02 (30 questions; label-exact 17/30 -- concept-chunk closeness overlaps a lot, so most right answers grade `weak`) |
| `get_concept_note` | binary by id presence | OK |
| `search_solved_issues` | closeness vs `threads` cut-offs (strong 0.50, weak 0.37) | Provisional: only 11 labeled chat questions (label-exact 8/11) -- see Open drift |
| `lookup_map` / `search_maps` | binary by row-presence | OK |
| `lookup_mechanic` / `search_mechanics` | binary by row-presence | OK |
| `lookup_gameplay_entity` / `search_gameplay_entities` | binary by row-presence | OK |
| `describe_mode` | binary by catalog-row presence | OK |
| `redirect_to_human` | binary by row-presence | OK |

**Calibration discipline:** the closeness cut-offs are tuned per corpus against a labeled set, `eval/calibration-queries.json` (disjoint from `eval/eval-queries.json` per D10; 81 questions as of 2026-10-02, most taken from prod's `query_log`, each labeled with what an honest grade says given what the corpus *has*). `bun run calibrate` from `apps/qw-oracle/` reports each corpus under the cut-offs in force and sweeps for the cheapest pair under a cost matrix in which `strong` on an uncovered question is the most expensive error; its pick is input, not gospel (the 2026-10-02 entities pick was overruled for one near-domain question -- the rationale sits beside `DEFAULT_CUTOFFS` in `grade.ts`). The calibrated values live in `DEFAULT_CUTOFFS` and ship with the image; `ENTITY_MATCH_*` / `CONCEPT_MATCH_*` / `THREAD_MATCH_*` env vars override them without a rebuild. Recalibrate after extending the set, after a corpus change that moves many answers (a large harvest, a re-embed), or after any embedding-model change. The retired `MATCH_QUALITY_*_THRESHOLD` and `L2_RRF_*` vars are read by nothing.

## Orientation contract

The orientation blob (`serve/mcp/src/orientation.ts`) ships to every connecting LLM at MCP `initialize` via the Server constructor's `instructions` field. It teaches:

- The three layers and which tools cover each.
- Recommended iteration order (start with `search_concepts` for how-to, `search_entities` for facts, `search_solved_issues` for community history).
- The `match_quality` honest-failure protocol.
- Citation discipline (`canonical_id` / slug / chat thread (topic + channel); "the AI says" is not a citation).

**Update rule:** every new tool, new layer, or change to citation discipline requires an edit to the orientation blob in the same commit. Adding a tool without orientation update is invisible to consumers and silently breaks Discovery.

## Transport and protocol

The server is **v0.8.0** (`serve/mcp/src/version.ts` is the single source of truth; `serve/mcp/package.json` is kept in lockstep but is never imported -- the two had silently diverged before 2026-08-04, so treat a mismatch as a bug). `MCP_TRANSPORT=stdio` (default, local Claude Code) or `http` (Streamable HTTP behind the Cloudflare Tunnel for the public deploy); HTTP mode builds a fresh `Server` per session via `createServer()`.

**SDK line: `@modelcontextprotocol/sdk` `^1.30.0`** -- the final release of the v1.x line before the SDK repo split into a 2.0 monorepo. Pinning to the end of 1.x is deliberate: it buys the whole v1 bugfix tail without taking on the 2.0 restructure, which belongs to the website/surfaces arc alongside stateless-core and auth (arc decision D4).

**Negotiated protocol versions** come from the SDK, not from us: `SUPPORTED_PROTOCOL_VERSIONS` is `2025-11-25` (latest), `2025-06-18`, `2025-03-26`, `2024-11-05`, `2024-10-07`. A client that initializes with any of those five still connects. This is the backward-compatibility contract for old consumers -- verified live at 0.7.0 with a `2025-03-26` handshake. Consumers are not required to track the latest.

## New-dataset checklist

When adding a dataset to qw-oracle, answer these in order:

1. **Which layer?** L1 (extracted facts) / L2 (chat history) / L3 (curated markdown).
2. **Does the query shape match an existing tool?** Same verb (lookup / search / get-full) and same return shape = rows behind an existing tool. If yes, stop here.
3. **If yes, does it need a `type` discriminator?** Add a `type` column, index it, expose via the existing tool's filter parameter. **No new tool.**
4. **If no, justify the new tool.** What verb does none of the existing 13 tools cover? "Different noun" is not a justification. "Different verb" is.
5. **Discovery update.** Edit the orientation blob and any affected tool description. If a consumer LLM cannot route to the new dataset from the catalog + orientation alone, the contract is broken.
6. **Query update.** Define the `match_quality` story. When does this dataset honestly return `'none'`? Calibration thresholds, if hybrid retrieval, get scheduled alongside the eval-set deliverable.

## L3 expansion pattern (Path C)

L3 originally meant "concept notes." It is now correctly framed as **curated markdown knowledge with consistent retrieval contracts** -- concept-notes is one shape inside that broader layer. Other shapes earn their own subfolder + table + `type` discriminator:

| Note type | Authoring directory | Storage | Tool surface | Status |
|---|---|---|---|---|
| concept-notes | `curated/concept-notes/` | `concepts` + `concept_chunks` (Voyage 4 hybrid) | `search_concepts`, `get_concept_note` | Live |
| player-notes | `curated/player-notes/` | `community.players` + `community.player_clan_eras` + `community.tournament_results` | `search_profiles(type='player')`, `lookup_profile(type='player')`, `get_profile_note(type='player')`, `lookup_by_nick` | Storage shipped (Phase 2: 5,900 rows). Note files: 570 on disk, 571 has_note=true. MCP tools pending (Phase 6). |
| clan-notes | `curated/clan-notes/` | `community.clans` + `community.player_clan_eras` | same tool surface (`type='clan'`) | Storage shipped (Phase 3: 822 rows). Note files: 350 on disk, 350 has_note=true. MCP tools pending (Phase 6). |
| tournament-notes | `curated/tournament-notes/` | `community.tournaments` (Phase 1 placeholder; columns added Phase 4) + `community.tournament_results` | same tool surface (`type='tournament'`) | Phase 4 paused on LLM-extraction sidequest (QWiki tournaments are heterogeneous; deterministic parser unsuitable). Resuming as a Haiku scrape pass. |
| asset-notes | `curated/asset-notes/` | TBD (`concepts` + `concept_chunks` with `type='asset'` discriminator likely) | TBD (`get_concept_note(type='asset')` + `search_concepts(type='asset')` likely; `lookup_asset_type` for richer envelope if proven) | Authoring in flight (asset-type-curate skill arc 2026-05-13): 5 notes on disk (charset, hud_element, map, player_skin, skybox), none loaded. MCP exposure deferred until bucket populated. |
| era-notes (future) | `curated/era-notes/` | TBD (likely `community.eras`) | TBD (likely extends `search_profiles` with `type='era'`) | Not yet started. |

**L3 sub-shapes (three patterns observed so far):**

- **Free-form synthesis** (concept-notes) -- authored deep, hand-tuned, slug + frontmatter + prose body. Open-ended topics.
- **Wiki-import biographical** (profile-notes: player / clan / tournament) -- structured rows + optional unique-content body. Bounded sets imported from community wikis.
- **Engine-data synthesis** (asset-notes) -- bounded set, seed-mirrored frontmatter, prose body for unique content the row schema cannot represent. Bridges L1 facts to L3 narrative.

Future sub-buckets pick the closest sub-shape; new sub-shapes earn their own pattern documentation here when they emerge.

**Decision (Path C):** profiles get a dedicated schema (`community.*`) + a single unified MCP tool surface. Two reasons:

1. Concept-notes are authored synthesis (deep, structured, hand-tuned). Profile-notes are biographical wiki imports (structured rows + optional unique-content body). Mixing both in one retrieval index dilutes both -- a query for "weapon scripts" should not surface a player who happened to script well.
2. Tool catalog stays small. One unified tool surface with a `type` discriminator (`search_profiles`, `lookup_profile`, `get_profile_note`, plus `lookup_by_nick` for cross-type alias resolution) ships **+4** tools to the catalog instead of the 10 a per-type design would require. Catalog growth 13 -> 17 lands just past the ~15 healthy ceiling and well inside the ~25 hard one; the decision was taken when the catalog stood at 12, and `describe_mode` has since spent one of the four slots of headroom. Anything after Path C needs a stronger verb argument than it would have needed then.

Path C concrete shape (qwiki-community-reference arc, Phases 1-3 shipped storage, Phase 6 ships MCP):
- Storage: `community.players` / `community.clans` / `community.tournaments` + cross-link tables `community.player_clan_eras` / `community.tournament_results` (migration 008 + 009 in `apps/qw-oracle/db/migrations/`).
- Loader: deterministic Bun scripts at `apps/qw-oracle/scripts/load-community/<phase>/` per the arc's D14 amendment. Tournaments diverge to Haiku-driven LLM extraction (D4 amendment in flight).
- MCP: four tools branched on `type` -- `search_profiles(query, type, limit)`, `lookup_profile(slug, type)`, `get_profile_note(slug, type)`, `lookup_by_nick(nick, limit)`. The first three branch internally on `type` to query the right `community.*` table; `lookup_by_nick` is a different verb (cross-type alias resolution) and stays separate.
- Note frontmatter: per the arc's D18 -- frontmatter mirrors the row's stable fields, body carries unique prose / quotes / settings tables that the row schema cannot represent.

The pattern is proven by the qwiki arc (Phases 1-3 shipped); Phase 6 (MCP tools) is the remaining work, gated on Phase 4 (tournament LLM-extraction sidequest) and Phase 5 (cross-link backfill).

## Open drift

| # | Drift | Severity | Fix |
|---|---|---|---|
| 1 | `search_solved_issues` closeness cut-offs rest on 11 labeled chat questions (none of them partial, two off-topic) | Medium (the chat grade separates on-topic from clearly-off-topic, but its strong/weak line is a cautious guess) | Add 30+ labeled chat questions -- the eval-sim arc's frozen helpdesk frame is the natural source -- and re-run `bun run calibrate`. |
| 2 | ~920 markdown files in `curated/player-notes/` and `curated/clan-notes/` are not exposed via MCP | Critical for the in-flight L3 expansion arc | Path C: `profiles` + `profile_chunks` tables, `search_profiles` + `get_profile` tools. |

Drift items closed in the 2026-05-06 cleanup pass: response-shape unification across the 6 ad-hoc tools (now all return `ToolResponse<T>`); `search_concepts`/`search_entities` calibration confirmed (live thresholds match the optimum on the 5-query calibration set); `search_solved_issues` switched from count-based to `ts_rank`-based bucketing; `info_key` doc leak stripped from `lookup_entity` description; orientation blob reordered to L1/L2/L3.

Drift items closed in the 2026-05-31 MCP-KTX-realignment pass: KTX gameplay serving realigned (source-default now searches all sources; KTX `kind`s + a `mode` filter on `search_mechanics`; `monster` on `search_gameplay_entities`; `match_event` exposed in the entity enum; new `describe_mode` composite verb); orientation + tool descriptions re-truthed; server bumped to v0.6.0. Deliberate scope at the time: the 10 non-user-facing `entities` types (`log_template`, `info_key`, `keyname`, ...) remain unexposed pending demand -- **superseded 2026-08-04**, see the next paragraph.

Drift items closed in the 2026-08-04 oracle-reentry Phase 3 pass (commits `794b3b8e`, `46632983`, `18cf26c5`):

- **Project Discovery gap.** `lookup_entity` / `search_entities` descriptions and the `project` parameter named only four projects (ezquake, ktx, fte, mvdsv) while the SQL was unrestricted and the orientation blob named all seven -- qwcl / qtv / qwfwd were reachable but unaskable. Descriptions widened to all seven.
- **Entity-type enum widened 6 -> 11** (Amendment A2): `info_key`, `log_template`, `protocol_message`, `qc_builtin`, `cvar_alias` joined as explicit-only types. This supersedes the 2026-05-31 "10 types remain unexposed" scope: 5 of those 10 are now askable, and the 5 internal-classifier types (`keyname`, `hud_element`, `token_primitive`, `flag_bit`, `asset_category`) stay deliberately out. No new tools, no SQL change -- the schema now admits what the DB already served.
- **`info_key` cross-scope doc regression.** Commit `f965dd20` had deleted the description sentence documenting the bare-name expansion while leaving the `isInfoKeyBareLookup` code live. Sentence restored.
- **`describe_mode` override layer.** `gameplay_entity_overrides` + `gameplay_mechanic_overrides` added as a strict-superset addition to the envelope (see the envelope section above). Previously a mode's whole-row swaps -- bloodfest's monster roster, ca's hazard suppression -- were invisible to the composite verb.
- **Empty version records for two admitted types.** `entity-record.ts`'s `VERSION_TABLE` was missing `cvar_alias` and `match_event`, so lookups on either returned an empty stub despite real per-version rows. Both wired; `lookup-entity.test.ts` is the first test coverage of that mapping.
- **Orientation prose undercounts.** KTX `search_mechanics` kinds 8 -> 11, `search_gameplay_entities` kinds 1 -> 4, entity types 6 -> 11 with the default-vs-explicit rule spelled out.
- **SDK + version lockstep.** `@modelcontextprotocol/sdk` `^1.0.0` -> `^1.30.0`; server 0.6.0 -> 0.7.0; `package.json` (which had silently drifted to 0.5.0) re-synced with `version.ts`.

Drift items closed in the 2026-10-02 search pass (server 0.8.0; commits `950fe44f`, `cf61249f`, `f2051428`, `9c370b72`, `043db5c7`), found by reviewing prod's `query_log`:

- **Rank-only `match_quality`.** The fused-RRF grade could never say `none` and capped long questions at `weak`; replaced by the closeness grade (see "`match_quality` semantics"). Closes the old drift #1 (provisional `L2_RRF_*` thresholds); its successor is the thin chat calibration, now #1.
- **Explicit-only entity types.** Callers never pass `type`, so the six non-default types were unreachable in practice; now a fallback (see the type table above).
- **Name-blind `search_entities`.** The lexical leg read descriptions only, so a bare name (`pm_ktjump`, `smackdown`) and the 2,018 description-less default-kind entities could only be found by the vector leg; a name-match list now joins the fusion. A leading `-` / `+` is no longer read as tsquery exclusion there.
- **Whole-string substring in `search_mechanics` / `search_gameplay_entities`.** Every word must now appear somewhere in the row.

Remaining drift items get closed as the work that touches the relevant area happens. Item #2 is the natural opener for the next L3 arc.
