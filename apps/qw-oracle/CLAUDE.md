# QW Oracle - QuakeWorld Knowledge Service

**Status:** Active development. Schema v18. Four codebases loaded into Layer 1 (ezQuake / FTE / QWCL / MVDSV) plus the `qw` namespace for game content (maps + game mechanics). KTX is the only outstanding port. For chronological ship history see [`docs/arc-history.md`](docs/arc-history.md). For active backlog see `HANDOVER.md` (root).

## What this is

Oracle maintains two SQLite stores side-by-side:

| Database | Purpose | Populated |
|---|---|---|
| `data/knowledge.db` | **Layer 1** - structured engine + game-content facts. Engine entity types (per-version arc): cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, asset_category, flag_bit, cvar_alias, protocol_message, info_key, log_template, qc_builtin (15 total). Asset relations (4 tables): asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites. Game content (`qw` namespace, no version arc): maps, gameplay_sources, gameplay_entity_defs, gameplay_mechanics. Plus source_overrides blame index, change_events / relation_changes diff streams, source_state_transitions per-version log. | ezQuake (15 versions: v3.0 -> 3.6.9 + head); FTE@build-6698 (engine + ezhud plugin + asset bundle); QWCL@2.33; MVDSV@head (f816d28, 2026-01-04 snapshot). KTX pending. |
| `data/qw.db` | **Layer 2** - community chat corpus (IRC 2005-2016 + Discord 2016-present). ~2.66M messages. | Fully imported. Processing pipeline not yet built. |

**Layer 3** (curated concept notes that synthesize Layer 1 + Layer 2 into usable guidance) lives at `concept-notes/`. Nine notes shipped + README (template) + OPERATIONS (stewardship playbook) + _gap-report (contributor onboarding seed).

**MCP server** at `serve/mcp/` (v0.4.0). Ten tools: `lookup_entity` and `search_entities` (engine entities -- case-insensitive lookup / substring search across cvar/command/macro/cmdline_param/ruleset, returns rich record with source_state + version arc + asset relations + linked concept notes); `lookup_map` and `search_maps` (qw maps -- full record with Levenshtein typo suggestion / 15-dimension filter set with popularity sort); `lookup_gameplay_entity` and `search_gameplay_entities` (id1 baseline weapons/items/projectiles); `lookup_mechanic` and `search_mechanics` (id1 baseline death rules / spawn rules / env hazards); `get_concept_note` (Layer 3 retrieval with frontmatter passthrough); `search_solved_issues` (FTS5 over the chat corpus). Runs under Bun reading both `data/knowledge.db` and `data/qw.db` read-only. The librarian volunteers cross-references in one tool call.

## Where to find things

| When you need... | Read... |
|---|---|
| Vision: the knowledge service (Layers 1-3 + MCP + snapshot distribution), active-assistance answer-shape, consumer list | `VISION.md` |
| Schema-as-code (v6 tables, migrations) | `scripts/load-knowledge/schema.ts` |
| Knowledge-loader pipeline (types, adapters, CLI) | `scripts/load-knowledge/` |
| End-to-end verification queries, per-phase expected counts | `scripts/load-knowledge/e2e-verify.md` |
| Layer 1 deep-time extraction roadmap (cliffs ahead, validation loop) | `docs/layer1-extraction-roadmap.md` |
| Quality grid (regression + anomaly probes) | `scripts/load-knowledge/quality-grid.ts` |
| Layer 1 extractors (Python + libclang) | `scripts/extractors/<project>/extract.py` (+ `extractors/extractor_lib/` shared) |
| Map extractor (qw namespace) | `scripts/extractors/qw/` -- Python pipeline: pak_extract, download_maps, fetch_stats, bsp_parser, extract |
| Layer 1 seed YAMLs (hand-authored taxonomy, path rules, cvar bindings) | `scripts/extractors/<project>/seeds/` |
| Extractor JSON outputs (versioned in git) | `scripts/extractors/<project>/output/` |
| Asset bundle (slipgate-consumer location) | `apps/slipgate-app/src/lib/config/data/<project>-asset-bundle.json` |
| Arc history (chronological ship log) | `docs/arc-history.md` |
| Schema spec (original design rationale) | `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` (root tree). Superseded incrementally by per-arc specs; see arc history for the chain. |
| Layer 3 entry template (frontmatter + shape catalog) | `concept-notes/README.md` |
| Layer 3 stewardship playbook (feeding paths, lifecycle, feedback loop) | `concept-notes/OPERATIONS.md` |
| Legacy chat-corpus scripts (Layer 2) | `scripts/*.mjs` |

## Tech stack

- **TypeScript + Node 20+ / Bun** for the Layer 1 loader (`scripts/load-knowledge/`).
- **Plain .mjs scripts** for the Layer 2 corpus import (`scripts/import-*.mjs`, `scripts/stats.mjs`).
- **better-sqlite3 11** for both stores; **ulid** for extractor-run IDs; **js-yaml** for seed ingestion.
- **Python 3 + libclang 18** for the engine-source extractors (live at `scripts/extractors/<project>/`; shared lib at `scripts/extractors/extractor_lib/`).

## Project structure

```
apps/qw-oracle/
├── CLAUDE.md           # This file
├── VISION.md           # Knowledge-service vision + active-assistance answer shape
├── package.json
├── tsconfig.json
├── scripts/
│   ├── load-knowledge/ # Layer 1 loader (TypeScript)
│   │   ├── schema.ts           # v6 schema + migrations
│   │   ├── index.ts            # CLI: load-version, load-assets, diff, enrich
│   │   ├── load-version.ts     # per-type adapter dispatch
│   │   ├── load-assets.ts      # relation-row loader (asset_* tables)
│   │   ├── build-asset-bundle.ts  # seed + AST reconciliation
│   │   ├── load-<type>.ts      # per-type adapters (cvars, commands, etc.)
│   │   ├── diff-versions.ts    # change-event generation
│   │   ├── enrich-prs.ts       # GitHub PR enrichment
│   │   ├── natural-keys.ts     # idempotent upserts
│   │   ├── types.ts            # schema-mirroring types
│   │   └── e2e-verify.md       # per-phase verification queries
│   ├── db.mjs          # Layer 2 corpus schema + connection (legacy)
│   ├── import-discord.mjs / import-irc.mjs  # Layer 2 import
│   ├── search.mjs / stats.mjs               # Layer 2 analytics
│   └── process-tier1.mjs, sample-*.mjs      # Layer 2 prototyping
├── data/
│   ├── knowledge.db    # Layer 1 (gitignored)
│   └── qw.db           # Layer 2 (gitignored)
├── docs/
│   ├── entity-types.md # Layer 1 per-entity-type reference with verification-status audit
│   └── plan.md         # legacy Layer 2 pipeline plan
├── concept-notes/      # Layer 3 hand-authored notes
│   ├── README.md       # entry template (frontmatter + shape catalog)
│   └── OPERATIONS.md   # stewardship playbook (feeding paths, lifecycle, feedback loop)
└── memory/             # prototyping artifacts
```

Each Layer 1 loader adapter is ~40-50 lines; shared scaffolding lives in `load-version.ts`, `natural-keys.ts`, and `types.ts`.

## Commands

```bash
# Layer 1 loader (run from apps/qw-oracle/)
npm run typecheck                                         # bunx tsc --noEmit
npm run load-knowledge -- load-version --project <p> --version <v> --type <t> --json <path> --commit <sha> [--ordinal <n>]
npm run load-knowledge -- load-assets   --project <p> --version <v> --json <bundle> --commit <sha> [--ordinal <n>]
npm run load-knowledge -- diff          --project <p> --from <v1> --to <v2>
npm run load-knowledge -- enrich        --project <p> --github-token <t> [--limit <n>]
npm run load-knowledge -- extract-tag   --project <p> --version <v> [--ordinal <n>]  # atomic: checkout + extract + loaders
npm run load-knowledge -- review        --project <p> --from <v1> --to <v2>          # emits findings JSON + draft .md
npm run load-knowledge -- quality-grid  --project <p> [--family regression|anomaly|both] [--probe <name>] [--list] [--json]
npm run load-knowledge -- build-snapshot --project <p> [--version <v>] [--output <dir>]  # emits slipgate-shaped JSON snapshots into apps/slipgate-app/src/lib/config/data/

# Layer 2 corpus (legacy .mjs scripts)
npm run import:discord
npm run import:irc
npm run stats

# MCP server (run from apps/qw-oracle/serve/mcp/)
bun run src/index.ts                                      # start the server
bun run scripts/verify-rewrite.ts                         # 24-assertion smoke test
bunx tsc --noEmit                                         # typecheck
```

Supported entity types (15): `cvar`, `command`, `macro`, `cmdline_param`, `keyname`, `hud_element`, `ruleset`, `token_primitive`, `asset_category`, `flag_bit`, `cvar_alias`, `protocol_message`, `info_key`, `log_template`, `qc_builtin`. The `qw` namespace tables (`maps` at schema v13; `gameplay_sources` / `gameplay_entity_defs` / `gameplay_mechanics` at schema v14) are flat -- outside the entity/version model -- no `entities` row, no per-version snapshot, no `project` column.

## Always-on rules

- **npm `--no-workspaces` required** for add/install commands in this directory (monorepo setup).
- **`tsx -e` cannot resolve relative paths** - use a temp file inside `scripts/load-knowledge/` instead.
- **Layer 2 raw data is immutable** - never modify imported messages; all processing is regenerable from raw.
- **Layer 1 extractors are idempotent** - re-running against the same tag produces the same rows.
- **Regression guards are load-bearing** - `load-version` aborts when entity counts drop >50% without `--force`. Don't bypass.
- **Source citation discipline** - every Layer 1 row that can carry a `source_ref` must; every Layer 2 summary must trace back to message IDs.
- **Schema evolution updates SCHEMA.md** - schema changes update `SCHEMA.md` alongside the migration. Architecturally-significant changes (new entity-identity concepts, cross-cutting blame models, migrations that reshape how diffs work) additionally get a dated spec under root `docs/superpowers/specs/` for the design discussion. Small additive migrations (one new table, one new field) don't need a spec -- SCHEMA.md + git history + schema.ts comments are enough.

## Non-negotiable rules

1. Raw data is immutable - never modify imported messages.
2. All processing is regenerable from the raw layer.
3. Tag every generated output with model + prompt version.
4. Keep it simple - scripts over frameworks, SQLite over Postgres.
5. Local-first processing - minimise API costs, maximise iteration speed.
6. Source citation - every answer must trace back to source (code line, message ID, or concept note).
