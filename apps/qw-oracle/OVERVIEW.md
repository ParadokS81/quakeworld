# QW Oracle - Overview

Living map of what is in this project right now. If you want why it exists, see `VISION.md`. For rules that apply while working here, see `CLAUDE.md`. For the Layer 1 data model, see `SCHEMA.md`. When in doubt, the code is the source of truth; this is the map.

**Lifecycle status:** Active. Layer 1 ezQuake extraction is fully built and stable; historical backfill across tags is the next major push. Layer 2 corpus is imported but the processing pipeline on top of it hasn't been touched in weeks and is not inventoried (see "Layer 2" below).

## What the project is

Oracle is the **knowledge service** for the monorepo: three data layers plus the machinery around them. See `VISION.md` for the framing; this OVERVIEW is the current-state map.

Two SQLite databases side by side at `data/`:

| File | Layer | What it is |
|---|---|---|
| `knowledge.db` | Layer 1 | Source-extracted engine facts: cvars, commands, macros, cmdline params, keynames, HUD elements, rulesets, token primitives, asset-consumption model, flag bits. Per-version history + per-field diff stream + commit blame. Covered by `SCHEMA.md`. |
| `qw.db` | Layer 2 | 2.66M community chat messages (1.94M QuakeNet IRC 2005-2016 + 717K Quake.World Discord 2016-present). Raw + FTS5 search index. |

**Layer 3** (hand-authored concept notes that synthesize Layer 1 + Layer 2 into usable guidance) was bootstrapped 2026-04-22 with two prototype notes under `concept-notes/`. The `get_concept_note` MCP tool will eventually serve this directory; no MCP integration exists yet. See `concept-notes/README.md` for the note-authoring template and trigger criteria.

Both are gitignored — they regenerate from source (Layer 1) or from raw import dumps (Layer 2).

## Layer 1 - where things stand

**Covered at head:** ezQuake, 10 entity types + 4 asset relation tables. Totals at head: 2901 cvars, 522 commands, 68 macros, 71 cmdline params, 148 keynames, 83 HUD elements, 6 rulesets, 33 token primitives, 50 flag bits, 17 asset categories = 3899 entities. Relations: 25 extensions, 14 path rules, 26 cvar bindings, 110 loader sites.

**Tags loaded:** 3.6.1, 3.6.2, 3.6.5, 3.6.6, 3.6.8, 3.6.9, plus `head`. `flag_bit` was added in Batch 2 so it's only present across 3.6.5+; earlier tags need a re-load to backfill. `source_overrides` was added in Batch 3 so pre-Batch-3 tags need a re-load to populate their blame index.

**Schema version:** 8. Migrations v1→v8 are all in `scripts/load-knowledge/schema.ts` and run automatically on DB open. See `SCHEMA.md` for the cumulative shape and per-migration spec pointers. Latest two migrations (2026-04-22): v7 added per-row `verification_status` + `verification_reason` to `asset_extensions` (lifts the `.kmap`/`.dll` audit out of prose into queryable columns); v8 widened `asset_loader_sites.confidence` to add `intentionally_generic` (separates FS-layer primitives from genuine `unclassified` findings — zero unclassified at head).

**Still open on Layer 1:**
- **Phase 2f historical backfill proper** - walk every ezQuake tag (~15 total), run full extractor sweep per tag, diff consecutive pairs, enrich with PRs. All architectural prerequisites shipped through Batch 3 + extraction-review skill/CLI + Workstream A tweaks (2026-04-24). Remaining gate before Phase 2f proper: **sanity-sample calibration** — run `review` CLI on 2-3 additional tag pairs (eyeball-only) to validate extraction trust on older tags and calibrate TBD thresholds per spec §8. HANDOVER entry: `Phase 2d-2h: remaining QW knowledge rollout`.
- **Phase 2d FTE** - first second-engine port. Biggest structural risk: validates the project-keyed schema against a codebase with a different layout (`engine/client/`, `engine/server/`, etc.).
- **Phase 2e MVDSV + KTX** - smaller ports. KTX is tree-sitter-based (use `py-tree-sitter`, NOT Node `tree-sitter@0.25` which segfaulted during the spike).
- **Phase 2g MCP tool upgrades** - add `version` / `as_of` parameters to existing tools, add `get_entity_history`, add version/date filters on `search_entities`.
- **Phase 2h automation** - scheduled tag-delta job (detect new upstream tag → extract → load → enrich → insert).
- **Asset-bundle loader-family wrapper gaps** - the seven speculative extensions (`.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.spr`, `.qwz`) all stamped `ast_verified` in the 2026-04-22 audit. `.loc` / `.lit` / `.dat` / `.qwz` confirmed via DB rows; `.log` / `.xml` / `.spr` verified via grep-cited source where the loader uses a wrapper (raw `fopen`, `CPageViewer_GoUrl`, `cl_modelnames[]` indirection) not on the extractor's `LOADER_FUNCTIONS` watchlist. Watchlist widening to close those gaps is a future extractor pass; `.kmap` / `.dll` are now first-class via `verification_status`. PNG/JPG path_hint variants still pending.
- **Asset reference-resolution graph** - research-foundation spec at `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` proposes the shift from category-classification to consumer-reference graph (parameterized-path extraction + BSP/progs parsers + `asset_companions` / `asset_consumers` schema). Implementation plan not yet written.

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
| `extract-tag` | Atomic "ensure one tag is fully loaded": checkout source, run unified + legacy Python extractors, build asset bundle, load all 10 entity types + asset relations, fetch release notes. ezquake only in first ship. |
| `review` | Emit a 5-question findings report (JSON on stdout + pre-seeded markdown draft at `docs/reviews/`) for a tag-pair. Hard-errors on missing prerequisites. Consumed by the `extraction-review` user-global skill. |

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

`TYPE_DIFF_CONFIGS` generalizes the diff across all 10 entity types + the 4 relation tables. Preloads `source_overrides` into a Map at diff start so the hot loop is zero-SQL per event (commit `d949108`). `PROJECT_SRC_PREFIX` map resolves ezQuake's 2023 repo-root-to-`src/` layout boundary per-version at blame time (`treeHasDirectory` via `git ls-tree`).

### Where extractors live

The extractor fleet is **oracle's responsibility** - it produces Layer 1 facts - even though the scripts currently live in `packages/qw-config/scripts/` rather than in this directory. The location is a historical accident: slipgate-app originally scraped ezQuake in qw-config, and the AST extractors grew in the same folder. When slipgate migrates to oracle-snapshot consumption, the extractor scripts relocate into oracle's build and `packages/qw-config/` dissolves.

Python + libclang 18 for ezQuake; tree-sitter (TBD) for KTX.

| Extractor | Output JSON |
|---|---|
| `extract-ezquake-cvars-clang.py` | `ezquake-variables-ast.json` |
| `extract-ezquake-commands-clang.py` | `ezquake-commands-ast.json` |
| `extract-ezquake-macros-clang.py` | `ezquake-macros-ast.json` |
| `extract-ezquake-cmdline-clang.py` | `ezquake-cmdline-params-ast.json` |
| `extract-ezquake-keynames-clang.py` | `ezquake-keynames-ast.json` |
| `extract-ezquake-hud-elements-clang.py` | `ezquake-hud-elements-ast.json` |
| `extract-ezquake-rulesets-clang.py` | `ezquake-rulesets-ast.json` |
| `extract-ezquake-token-primitives-clang.py` | `ezquake-token-primitives-ast.json` |
| `extract-ezquake-flag-bits-clang.py` | `ezquake-flag-bits-ast.json` |
| `extract-ezquake-asset-loader-sites-clang.py` | feeds asset-bundle build |
| `extract-ezquake-asset-cvar-bindings-clang.py` | feeds asset-bundle build |
| `extract-ezquake-asset-path-rules-verify.py` | feeds asset-bundle build |

All extractors accept `--repo-root` / `--output` and auto-detect `<repo>/src` vs repo-root layout (the Batch 1 fix for pre-2023 tags).

Extractor JSON outputs are committed at `packages/qw-config/src/data/` so the loader has deterministic input without requiring a libclang install to re-build.

Hand-authored seed YAMLs are at `packages/qw-config/seeds/` (asset taxonomy, cvar→category bindings). The `build-asset-bundle.ts` script reconciles seed against AST auto-pass and emits `ezquake-asset-bundle.json`.

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

Claude Code sessions consume Layer 1 via a local MCP server (tools: `lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`). The server itself is NOT in this directory - it lives elsewhere in the monorepo's MCP infrastructure. What lives here is the SQLite DB it queries and the schema it queries against.

Future MCP consumers: quad chatbot mode (Discord), a new chatbot app, slipgate web chat surface.

### Snapshot distribution (forward commitment)

Consumer-tailored JSON snapshots pre-computed from Layer 1. Deterministic, shipped with the consumer, no runtime dependency on oracle. Not yet implemented as a first-class output of this project; slipgate-app's ConfigViewer is the canonical case and will be the first real consumer. The current state is legacy: slipgate reads `packages/qw-config/src/data/*.json` produced by the scraping predecessors. When oracle's extraction pipeline is feature-complete, a `build-snapshot` CLI will produce slipgate-shaped snapshots from the same Layer 1 data the loader writes.

## Parked with purpose

- `docs/plan.md` - legacy Layer 2 pipeline plan from earlier in the project. Not deleted because the Layer 2 pipeline still hasn't been rebuilt; reconsider when Layer 2 work restarts.
- `memory/` - prototyping artifacts from design spikes. Not committed production output. Review periodically; delete what is clearly stale.
- `output/` - scratch output from ad-hoc runs. Gitignored.

## Integration points

- **Consumes:** `packages/qw-config/src/data/*-ast.json` (extractor outputs - transitionally hosted, see "Where extractors live"), `packages/qw-config/seeds/*.yaml` (seed taxonomies - same transitional status), ezQuake source at `research/repos/ezquake-source` (git blame + tag resolution), GitHub API (release bodies + PR enrichment).
- **Produces:** `data/knowledge.db` (Layer 1), `data/qw.db` (Layer 2).
- **Consumed by:** MCP server (local) -> Claude Code sessions (live). Planned MCP consumers: quad chatbot mode, a new chatbot app, slipgate web chat surface. Planned snapshot consumers: slipgate-app ConfigViewer (replaces the current qw-config-JSON path).

## What this doc intentionally does NOT cover

- **Layer 1 data model** - `SCHEMA.md`.
- **Per-entity-type formal documentation (what each type is, why we extract it, who consumes it)** - scheduled as Pass 2 of the 2026-04-22 knowledge-service realignment roadmap. Output location: `apps/qw-oracle/docs/entity-types.md` when Pass 2 ships. Pass 2 also introduces **verification status** (ast_verified / seed_only_with_ast_support / seed_only_no_ast_support / orphaned_historical) as a first-class field on each entity type, surfacing cases like `.kmap` where a seed-YAML entry predates loader support being removed.
- **Why this project exists / the service shape / long-term vision** - `VISION.md`.
- **Rules for Claude sessions** - `CLAUDE.md`.
- **Per-migration design intent** - `docs/superpowers/specs/` (the v1 / v5 / v6 specs).
- **Verification queries** - `scripts/load-knowledge/e2e-verify.md`.
