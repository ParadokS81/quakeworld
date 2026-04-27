# QW Oracle - Overview

Living map of what is in this project right now. If you want why it exists, see `VISION.md`. For rules that apply while working here, see `CLAUDE.md`. For the Layer 1 data model, see `SCHEMA.md`. When in doubt, the code is the source of truth; this is the map.

**Lifecycle status:** Active. Layer 1 covers six namespaces (ezQuake / FTE / QWCL engine ports + the `qw` game-content namespace) with MVDSV and KTX engine ports still pending; ezQuake deep-time walk is at v3.0 floor. Schema at v13. Layer 2 corpus is imported but the processing pipeline on top of it hasn't been touched in weeks and is not inventoried (see "Layer 2" below). Most recent shipped arc: map knowledge layer (2026-04-27) — see the domain inventory table below.

## What the project is

Oracle is the **knowledge service** for the monorepo: three data layers plus the machinery around them. See `VISION.md` for the framing; this OVERVIEW is the current-state map.

Two SQLite databases side by side at `data/`:

| File | Layer | What it is |
|---|---|---|
| `knowledge.db` | Layer 1 | Source-extracted engine facts (cvars, commands, macros, cmdline params, keynames, HUD elements, rulesets, token primitives, asset-consumption model, flag bits, cross-engine cvar aliases) PLUS the `qw` namespace for game-content facts (currently: maps). Engine entities live in the per-version arc model; `qw` content lives in flat per-domain tables. Per-version history + per-field diff stream + commit blame for engine entities. Covered by `SCHEMA.md`. |
| `qw.db` | Layer 2 | 2.66M community chat messages (1.94M QuakeNet IRC 2005-2016 + 717K Quake.World Discord 2016-present). Raw + FTS5 search index. |

**Layer 3** (hand-authored concept notes that synthesize Layer 1 + Layer 2 into usable guidance) bootstrapped 2026-04-22; now holds 7 notes plus a stewardship playbook. `weapon-scripts.md` (landed 2026-04-24) is the first R7 opinionated-best-practice exemplar, introducing the three-method taxonomy and the authority-grounding triad (engine mechanics + community consensus + credited SME). See `concept-notes/README.md` for the entry template + 6 recognized shapes + voice-and-length table; `concept-notes/OPERATIONS.md` for the stewardship playbook; `docs/superpowers/specs/2026-04-24-layer3-role-map.md` for the 7-role evidence-based map of Layer 3 content. The `get_concept_note` MCP tool will eventually serve this directory; no MCP integration exists yet. Framing locked 2026-04-25: Oracle is the authoritative current-state source; ezquake.com/docs is a downstream human-readable surface that Oracle's Layer 3 can feed rather than mirror. Active work on Layer 3 proceeds via the `guide-rewrite` user-global skill, one ezquake.com/docs page per session. Gap-report at `concept-notes/_gap-report.md` seeds the contributor-onboarding kit for upstream ezquake.com guide updates.

Both are gitignored — they regenerate from source (Layer 1) or from raw import dumps (Layer 2).

## Layer 1 - where things stand

### Domain inventory (at-a-glance)

The single source of truth for "what does Oracle currently know about?". Update this table whenever a new domain or codebase lands.

| Namespace | Project / domain | Model | Entity types / tables | Counts (head / canonical) | Status |
|---|---|---|---|---|---|
| `ezquake` | engine | per-version arc | 10 entity types + 4 asset relation tables | 4015 entities (2989 cvar + 560 cmd + 68 macro + 76 cmdline + 148 keyname + 85 hud_element + 6 ruleset + 33 token_primitive + 50 flag_bit + 26 asset_category) | head + 14-tag deep-time walk |
| `fte` | engine | per-version arc | 5 entity types (cvar / command / macro / cmdline_param / cvar_alias) + asset bundle | 3267 entities (2482 cvar — 1397 engine + 1085 plugin:ezhud — / 556 command / 67 macro / 108 cmdline_param / 38 cvar_alias) + 28 asset_category + 25 asset_cvar_bindings + 13 asset_path_rules + 61 asset_extensions + 717 asset_loader_sites | Phase 2d-core SHIPPED 2026-04-26 (build-6698 / SHA 35843773); Phase 2d-bundle SHIPPED 2026-04-27 |
| `qwcl` | engine | per-version arc | 3 entity types (cvar / command / cmdline_param) | 380 entities (187 cvar + 121 command + 72 cmdline_param) | shipped 2026-04-25 (single tag `2.33`, no asset taxonomy) |
| `mvdsv` | engine (server) | per-version arc | -- | -- | not started |
| `ktx` | engine (mod, QuakeC) | per-version arc | -- | -- | not started; tree-sitter spike done |
| `qw` | game content (the game itself) | flat per-domain tables | `maps` (1 table, 1 row per canonical map) | 254 maps (38 id1 stock from pak0/pak1 + 216 from maps.qw.nu/base/) | shipped 2026-04-27 |
| `qw` | game mechanics (id1 baseline) | flat polymorphic tables | `gameplay_sources` (registry) + `gameplay_entity_defs` (kind: item/weapon/projectile) + `gameplay_mechanics` (kind: constant/env_hazard/player_stat/powerup_behavior/armor_model/death_rule/spawn_rule/dm_mode_rule) | 37 entities + 41 mechanics from qwcl-original/QW/progs/. v4 splits: telefrag (triggers.qc:334) vs exit_level_kill (client.qc:230); trigger_hurt env_hazard for void-brush mechanism | shipped 2026-04-27 (schema v14); KTX overrides queued as arc 2 |

**Tags loaded:** ezQuake 15 rows in `versions` (14 release tags `v3.0` / `v3.0.1` / `3.1` / `3.2` / `3.2.1` / `3.2.2` / `3.2.3` / `3.6.0` / `3.6.1` / `3.6.2` / `3.6.5` / `3.6.6` / `3.6.8` / `3.6.9` plus `head`). FTE: `build-6698`. QWCL: `2.33` (single-commit repo; canonical version label aliased to commit `bf4ac42` via `PROJECT_VERSION_ALIASES`). The `qw` namespace has no `versions` row — maps don't change with engine versions, so `build-snapshot --project qw` uses the sentinel version `static`.

Deep-time walk floor for ezQuake is `v3.0` (2016-06-04); pre-3.0 era is **deliberately de-scoped** per 2026-04-25 chat with infiniti — security framing (pre-3.6 has known attack vectors; Oracle should not surface settings nudging users into vulnerable defaults) plus diminishing-returns. Walk procedure documented in `docs/layer1-extraction-roadmap.md`. Layer 1 quality gates run via `quality-grid` CLI.

**Schema version:** 13. Migrations v1→v13 are all in `scripts/load-knowledge/schema.ts` and run automatically on DB open. See `SCHEMA.md` for the cumulative shape and per-migration spec pointers. Most recent additions:
- **v13** (2026-04-27, pure-additive): new `maps` table for the `qw` namespace + 2 indexes. No CHECK widening; map rows live outside the entity/version model. Spec: `docs/superpowers/specs/2026-04-26-qw-oracle-map-knowledge-design.md`.
- **v12** (2026-04-26, full table-rebuild): widened `entities.type` CHECK to admit `cvar_alias`; added `cvar_alias_versions` table for cross-engine alias bridging (FTE ezscript shipped first).
- **v11** (2026-04-26, ALTER ADD COLUMN): `source_root` text column on `cvar_versions` / `command_versions` / `macro_versions` for FTE's plugin distinction.
- **v10** (2026-04-25, full table-rebuild): widened `project` CHECK across 8 tables to admit `qwcl` (first cross-codebase port).
- **v9** (2026-04-25): added `source_retired_at_version` to the transitions reason CHECK.

**Still open on Layer 1:**
- **Phase 2d-bundle FTE asset extraction.** SHIPPED 2026-04-27. Counts on the FTE row above. Five hand-authored seed YAMLs at `scripts/extractors/fte/seeds/` + two AST handlers + path-rules verifier; bundle reconciles to `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json`. Quality-grid extended to 30 probes; 3 Path-1 fixtures green.
- **Phase 2e MVDSV + KTX.** MVDSV is small (~189 cvars, same struct form as ezQuake). KTX is tree-sitter-based (use `py-tree-sitter`, NOT Node `tree-sitter@0.25` which segfaulted during the spike).
- **Phase 2f historical backfill.** Walk infrastructure shipped 2026-04-25 (`extract-tag --skip-prune` + `prune-cross-type-orphans` finalize CLI + per-version backfill_match detection). Reusable across FTE/MVDSV/KTX walks. Pre-3.0 ezQuake era explicitly out of scope. HANDOVER entry: `Phase 2d-2h: remaining QW knowledge rollout`.
- **Phase 2g MCP tool upgrades.** Add `version` / `as_of` parameters to existing tools, add `get_entity_history`, add version/date filters on `search_entities`.
- **Phase 2h automation.** Scheduled tag-delta job (detect new upstream tag → extract → load → enrich → insert).
- **Asset-bundle loader-family wrapper gaps.** Seven speculative extensions (`.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.spr`, `.qwz`) all stamped `ast_verified` in the 2026-04-22 audit. Watchlist widening to convert grep-cited verifications into AST-backed ones is a future extractor pass; `.kmap` / `.dll` are first-class via `verification_status`. PNG/JPG path_hint variants still pending.
- **Asset reference-resolution graph.** Research-foundation spec at `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` proposes the shift from category-classification to consumer-reference graph (parameterized-path extraction + BSP/progs parsers + `asset_companions` / `asset_consumers` schema). Implementation plan not yet written.
- **`qw` namespace expansion.** Maps shipped 2026-04-27. Future game-content domains (e.g. official match-stats subset, player registry, official vs unofficial event metadata) will land as additional flat tables under the same `qw` namespace. Slipgate map-browser UI consumes the shipped `qw-maps.json` snapshot when its consumer arc lands.

## Layer 1 machinery

### Loader pipeline - `scripts/load-knowledge/`

TypeScript. Opens `data/knowledge.db`, migrates if needed, dispatches per-type loader adapters.

CLI entry: `npm run load-knowledge -- <subcommand> [...args]` — see `scripts/load-knowledge/index.ts`. Subcommands:

| Subcommand | Purpose |
|---|---|
| `load-version` | Load one entity-type snapshot for one (project, version) from an extractor JSON. Idempotent. |
| `load-assets` | Load the four `asset_*` relation tables for one (project, version) from a bundle JSON. |
| `release-notes` | Fetch a tag's GitHub release body, parse bullets, write to `release_notes`. Requires GitHub token. |
| `diff` | Walk two versions, compare per-entity `*_versions` rows, write `change_events` + `relation_changes`. |
| `enrich` | Backfill `pr_*` columns on `change_events` via GitHub API. Requires GitHub token. |
| `extract-tag` | Atomic "ensure one tag is fully loaded": checkout source, run unified + legacy Python extractors, build asset bundle (when project has one), load all entity types + asset relations, fetch release notes (when project has a GitHub upstream). Per-project gates: `PROJECT_HAS_ASSET_BUNDLE`, `projectHasGithubUpstream`, `PROJECT_VERSION_ALIASES`, per-project `ENTITY_JSON_FILES` filename map. Engine projects only — `qw` namespace skips this. |
| `review` | Emit a 5-question findings report (JSON on stdout + pre-seeded markdown draft at `docs/reviews/`) for a tag-pair. Hard-errors on missing prerequisites. Consumed by the `extraction-review` user-global skill. |
| `load-maps` | Load the `maps` table from the qw extractor's `qw-maps-ast.json` output. Idempotent UPSERT keyed on `canonical_name`. Default JSON path resolves to `scripts/extractors/qw/output/qw-maps-ast.json`. |
| `build-snapshot` | Read `knowledge.db` and emit slipgate-shaped JSON snapshots into `apps/slipgate-app/src/lib/config/data/`. Shape parity with legacy slipgate files preserved; 5 enrichment fields added per engine entity. Per-project version defaults (qwcl: `2.33`, qw: `static`, engines: `head`). For `--project qw` emits `qw-maps.json` (full per-map record array). |

Real command examples with expected counts: see `scripts/load-knowledge/e2e-verify.md` (the source of truth for what each phase should produce).

### Review pipeline - `scripts/load-knowledge/review/`

Stateless findings generator over existing Layer 1 tables. Five finding modules (additions / retirements / semantic-crossings / unclassified / source-invisible) plus four cross-cutting modules added in Workstream A (2026-04-24):

- `clusters.ts` - mechanical cluster detection (PR, commit-window, entity-name prefix).
- `prior-walks.ts` - cross-walk `prior_cluster_refs` lookup so a pair's clusters can be tied back to matching clusters in earlier walks.
- `semantic-match.ts` - Q5 semantic-pass proposal: suggests joining a source-invisible finding to a non-Q5 cluster via entity-name overlap or shared commit-message theme. Proposal, not mandate — operator confirms at preamble.
- `cross-codebase.ts` - entity-name hint (`likely-shared` / `ezquake-only` / `unknown`) to bias cross-codebase-pattern concept-note creation.

Composed by `review/index.ts`, rendered to markdown by `review/draft-writer.ts`. Schema-expansion events (NULL -> falsy-default) are filtered out of Q3 as non-semantic. Q4 surfaces only confidence demotions, not pre-existing low-confidence debt. Finding IDs are stable hashes so re-runs are resume-safe.

Design + process: `docs/superpowers/specs/2026-04-23-extraction-review-design.md`; Workstream A tweaks: `docs/superpowers/specs/2026-04-24-extraction-review-skill-tweaks.md`. Interactive walk is driven by the user-global skill at `~/.claude/skills/extraction-review/SKILL.md`.

### Per-type loader adapters

One file per entity type at `scripts/load-knowledge/load-<type>.ts`. Each is ~40-50 lines: parse the extractor JSON, upsert the entity row, upsert the `*_versions` row, optionally emit `source_overrides`. Shared scaffolding lives in:

- `load-version.ts` - type dispatch, drop-guard, transition emission
- `natural-keys.ts` - idempotent upsert helpers; canonical ID logic
- `types.ts` - row-shape interfaces mirroring `schema.ts`
- `db.ts` - connection open + migration run

### Diff pipeline - `diff-versions.ts`

`TYPE_DIFF_CONFIGS` generalizes the diff across the 11 engine entity types + the 4 relation tables. Preloads `source_overrides` into a Map at diff start so the hot loop is zero-SQL per event (commit `d949108`). `PROJECT_SRC_PREFIX` map resolves ezQuake's 2023 repo-root-to-`src/` layout boundary per-version at blame time (`treeHasDirectory` via `git ls-tree`). Diff pipeline does not apply to the `qw` namespace (flat tables, no version arc).

### Where extractors live

The extractor fleet is **oracle's responsibility** — it produces Layer 1 facts. As of qw-config dissolution Half 1 (2026-04-25) it lives at `apps/qw-oracle/scripts/extractors/` with project-scoped subdirs. Python + libclang 18 for ezQuake / FTE / MVDSV / QWCL / QWFWD; tree-sitter for KTX (different language); pure stdlib Python for `qw` (BSP binary parsing, no compiler).

```
scripts/extractors/
  EXTRACTOR-PLAYBOOK.md       cross-engine porting playbook
  extractor_lib/              shared libclang Visitor + per-entity handlers
  ezquake/
    extract.py                unified driver (cvars, commands, macros, cmdline,
                              keynames, hud-elements, asset-cvar-bindings,
                              asset-loader-sites)
    rulesets.py               text/regex extractor (not libclang despite history)
    token-primitives.py       text/regex extractor
    flag-bits.py              text/regex extractor
    asset-path-rules-verify.py
    seeds/                    hand-authored taxonomy YAMLs
    output/                   AST JSON outputs (versioned)
    diagnostics/              extraction logs + comparison report
    tests/                    pytest fixtures for parameterized paths
    _legacy/                  archived per-entity libclang scripts
  fte/
    extract.py                unified driver (cvars, commands, macros, cmdline,
                              cvar_alias via ezscript handler)
    seeds/                    drift TSV + asset taxonomy
    output/                   AST JSON outputs
    tests/                    pytest fixtures
  ktx/                        commands.ts (tree-sitter)
  qwcl/
    extract.py                3-handler driver (cvars, commands, cmdline)
    output/                   AST JSON outputs
  mvdsv/                      placeholder (server engine, libclang)
  qwfwd/                      placeholder (proxy, libclang)
  qw/                         game-content namespace (the GAME, not an engine)
    pak_extract.py            id1 pak0/pak1 -> data/pak-cache/*.bsp
    download_maps.py          maps.qw.nu/base/ -> data/bsp-cache/*.bsp
    fetch_stats.py            stats.qw.nu top-200 -> seeds/qw-stats-cache.json
    bsp_parser.py             BSP V29/BSP2 entity + texture lump reader
    extract.py                walks both caches, joins stats + seed,
                              emits qw-maps-ast.json
    seeds/                    qw-map-seed.yaml (manual overrides),
                              qw-stats-cache.json (gitignored)
    output/                   qw-maps-ast.json (committed)
    tests/                    pytest (PAK + BSP parser); fixtures gitignored
  shared/                     derive-reserved-subdirs.ts, verify-inventory-coverage.ts
```

All engine extractors accept `--repo-root` / `--output` and auto-detect `<repo>/src` vs repo-root layout (the Batch 1 fix for pre-2023 tags). The `qw/` extractors do NOT take repo-root (their inputs are pak files + an HTTP CDN, not a source clone).

Extractor JSON outputs at `scripts/extractors/<project>/output/` are committed so the loader has deterministic input without requiring a libclang install to re-build.

Hand-authored seed YAMLs are at `scripts/extractors/<project>/seeds/` (asset taxonomy + cvar→category bindings for engines; map author overrides for `qw`). The `scripts/load-knowledge/build-asset-bundle.ts` script reconciles asset seed against AST auto-pass and emits `<project>-asset-bundle.json` directly into `apps/slipgate-app/src/lib/config/data/` (qw-config dissolution Half 2 closed this loop 2026-04-25).

### Enrichment - `enrich-prs.ts` + GitHub

Second pass after `diff`. Reads `change_events` with empty `pr_*` columns, queries GitHub's commit-to-PR API, stuffs PR number / title / body excerpt / linked issues into the row. Staged from the diff pass because PR enrichment is rate-limited and the diff is cheap — you want them decoupled.

## Code landmarks

If you want to... | Look at...
---|---
Add a new entity type | `schema.ts` (new `*_versions` table + CHECK widening for `entities.type`) → `types.ts` (row interface) → `natural-keys.ts` (upsert helper) → new `load-<type>.ts` adapter → `load-version.ts` (register in dispatcher) → `diff-versions.ts` (`TYPE_DIFF_CONFIGS` entry)
Change how diff blame is resolved | `diff-versions.ts` — the Map preload + override lookup hot loop
Add per-field blame for a new type | Extractor emits `field_source_lines` payload → adapter calls `upsertSourceOverride` with `override_kind`
Tune drop-guard | `load-version.ts` — the `dropGuard` check
Add an MCP tool | Not in this repo — MCP server is separate. The queries live against the shape documented in `SCHEMA.md`.
Migrate schema (additive — new column on existing table) | `schema.ts` — bump `SCHEMA_VERSION`, add `SCHEMA_V<N>_MIGRATION_SQL` (e.g. `ALTER TABLE foo ADD COLUMN bar TEXT...`), add `migrateV<N-1>ToV<N>`, extend `applySchema`'s chain. Pattern at v7 (asset_extensions verification columns).
Migrate schema (CHECK widening on existing column) | `schema.ts` — table rebuild required since SQLite can't ALTER CHECK in place. Pattern at v8 (asset_loader_sites confidence — `<TABLE>_V<N>_MIGRATION_SQL` rebuild block + `foreign_keys = OFF` outside the txn). Update the v3 `CREATE TABLE` block too so fresh DBs land on the widened CHECK.
Verify a phase ran correctly | `scripts/load-knowledge/e2e-verify.md`

## Layer 2 - state unknown

The Layer 2 corpus is imported into `data/qw.db` and a basic FTS5 search index exists. The processing pipeline on top of it — tier classification, session segmentation, summarization, curation — hasn't been touched in weeks and has not been audited for this doc. The scripts at `scripts/*.mjs` are what exists, not what is necessarily still in use:

- `import-discord.mjs` / `import-irc.mjs` - raw import from the respective dumps
- `db.mjs` - Layer 2 schema + connection (legacy .mjs, not TypeScript)
- `build-search-index.mjs` - FTS5 index build
- `search.mjs` - search CLI
- `stats.mjs` / `stats-tier1.mjs` - dataset stats
- `process-tier1.mjs` - early tier-1 classification work
- `sample-*.mjs` - ad-hoc sampling scripts used during design spikes
- `helpdesk-benchmark.mjs` / `helpdesk-coverage.mjs` - the "can this answer a real question" bench

This list is a file inventory, not a working map. Before the next Layer 2 push, this section needs its own audit pass — which scripts are current, which are scratchpads to delete, which compose into a pipeline. See HANDOVER for the follow-up item if one exists; if not, add one when Layer 2 work restarts.

## Serving surfaces

Two paths through which consumers reach the knowledge foundation. See `VISION.md` § "Serving surfaces" for the framing.

### MCP (live)

Claude Code sessions consume Layers 1, 2, and 3 via a local MCP server at `serve/mcp/` (TypeScript on Bun + bun:sqlite, two readonly handles into `data/knowledge.db` and `data/qw.db`). v0.3.0 (2026-04-27). Six tools:

| Tool | Domain | Returns |
|---|---|---|
| `lookup_entity` | engine entities (cvar / command / macro / cmdline_param / ruleset) | rich record with source_state + version arc + asset relations + linked concept notes in one call |
| `search_entities` | engine entities (substring) | same EntityRecord shape, name matches rank above description-only matches |
| `get_concept_note` | Layer 3 curated notes | full frontmatter passthrough + body |
| `search_solved_issues` | Layer 2 chat corpus | FTS5 ranked sessions, Discord deep-links |
| `lookup_map` | qw maps (case-insensitive name) | full map record (worldspawn / item summary / spawn summary / features / wads / popularity / inferred gamemodes); Levenshtein typo suggestion when not found |
| `search_maps` | qw maps (filter set) | compact rows ordered by popularity rank, with `items_compact` one-liner; filters cover has_/lacks_ weapon+powerup+armor, has_water/lava/slime/teleporters, gamemode, popularity rank range, dm spawn count range |

The librarian volunteers cross-references rather than requiring follow-up tool calls (v0.2.0 rewrite, 2026-04-25). Future MCP consumers: a public QW community chatbot (web app or Discord bot calling Claude API, separate deploy), quad chatbot mode, slipgate web chat surface, a Claude Code plugin that bundles dev-focused skills on top of the MCP. The MCP itself is voice-neutral; consumer voice and orchestration recipes live in each consumer's own surface.

### Snapshot distribution (slipgate consumer)

Consumer-tailored JSON snapshots pre-computed from Layer 1, shipped with the consumer, no runtime dependency on oracle. The `build-snapshot` CLI (`npm run load-knowledge -- build-snapshot --project <p>`) reads `knowledge.db` and emits into `apps/slipgate-app/src/lib/config/data/`:

| Project | Files emitted | Per-record shape |
|---|---|---|
| `ezquake` | `ezquake-variables.json`, `ezquake-commands.json`, `ezquake-macros.json`, `ezquake-cmdline-params.json`, `ezquake-asset-bundle.json` | original slipgate shape + 5 enrichment fields (source_state, first_seen_version, last_seen_version, optional default_history, optional retired_at_version) |
| `qwcl` | `qwcl-variables.json` (+ `qwcl-variables-meta.json` sibling) | flat array, original slipgate shape + same 5 enrichment fields |
| `qw` | `qw-maps.json` | full per-map record array (254 maps); meta envelope with project=`qw`, version=`static` |

Future projects (FTE / MVDSV / KTX) and future `qw` domains land here as additional emitters; slipgate's loader picks them up.

## Parked with purpose

- `docs/plan.md` - legacy Layer 2 pipeline plan from earlier in the project. Not deleted because the Layer 2 pipeline still hasn't been rebuilt; reconsider when Layer 2 work restarts.
- `memory/` - prototyping artifacts from design spikes. Not committed production output. Review periodically; delete what is clearly stale.
- `output/` - scratch output from ad-hoc runs. Gitignored.

## Integration points

- **Consumes:** `apps/qw-oracle/scripts/extractors/<project>/output/*-ast.json` (extractor outputs), `apps/qw-oracle/scripts/extractors/<project>/seeds/*.yaml` (seed taxonomies), ezQuake source at `research/repos/ezquake-source` (git blame + tag resolution), GitHub API (release bodies + PR enrichment).
- **Produces:** `data/knowledge.db` (Layer 1), `data/qw.db` (Layer 2).
- **Consumed by:** MCP server (local) -> Claude Code sessions (live). Planned MCP consumers: quad chatbot mode, a new chatbot app, slipgate web chat surface. Planned snapshot consumers: slipgate-app ConfigViewer (replaces the current qw-config-JSON path).

## What this doc intentionally does NOT cover

- **Layer 1 data model** - `SCHEMA.md`.
- **Per-entity-type formal documentation (what each type is, why we extract it, who consumes it)** - scheduled as Pass 2 of the 2026-04-22 knowledge-service realignment roadmap. Output location: `apps/qw-oracle/docs/entity-types.md` when Pass 2 ships. Pass 2 also introduces **verification status** (ast_verified / seed_only_with_ast_support / seed_only_no_ast_support / orphaned_historical) as a first-class field on each entity type, surfacing cases like `.kmap` where a seed-YAML entry predates loader support being removed.
- **Why this project exists / the service shape / long-term vision** - `VISION.md`.
- **Rules for Claude sessions** - `CLAUDE.md`.
- **Per-migration design intent** - `docs/superpowers/specs/` (the v1 / v5 / v6 specs).
- **Verification queries** - `scripts/load-knowledge/e2e-verify.md`.
