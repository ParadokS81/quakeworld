# QW Oracle - QuakeWorld Knowledge Service

**Status:** Active development. Two-database knowledge service for QuakeWorld: a structured-facts layer extracted from engine source (Layer 1) and a 20-year chat corpus (Layer 2). Phase 2f Batch 3 shipped 2026-04-21 - schema v6 source_overrides blame index, per-field extractor emissions, diff-pipeline blame override; all 11 stress-test gaps closed.

## What this is

Oracle maintains two SQLite stores side-by-side:

| Database | Purpose | Populated |
|---|---|---|
| `data/knowledge.db` | **Layer 1** - structured engine facts (cvars, commands, macros, HUD elements, rulesets, keynames, token primitives, cmdline params, asset consumption, flag bits) plus a source_overrides blame index. Source-derived, version-aware, canonical. | ezQuake across 7 tags + head (schema v6). FTE/MVDSV/KTX pending. |
| `data/qw.db` | **Layer 2** - community chat corpus (IRC 2005-2016 + Discord 2016-present). ~2.66M messages. | Fully imported. Processing pipeline not yet built. |

A future **Layer 3** (curated concept notes adapted from ezquake.com docs and community wisdom) is not yet populated.

## Where to find things

| When you need... | Read... |
|---|---|
| Vision: the knowledge service (Layers 1-3 + MCP + snapshot distribution), active-assistance answer-shape, consumer list | `VISION.md` |
| Schema-as-code (v6 tables, migrations) | `scripts/load-knowledge/schema.ts` |
| Knowledge-loader pipeline (types, adapters, CLI) | `scripts/load-knowledge/` |
| End-to-end verification queries, per-phase expected counts | `scripts/load-knowledge/e2e-verify.md` |
| Layer 1 extractors (Python + libclang for ezQuake) | `packages/qw-config/scripts/extract-ezquake-*-clang.py` |
| Layer 1 seed YAMLs (hand-authored taxonomy, path rules, cvar bindings) | `packages/qw-config/seeds/` |
| Extractor JSON outputs (versioned in git) | `packages/qw-config/src/data/` |
| Schema spec (design rationale) | `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` (root tree) |
| Legacy chat-corpus scripts (Layer 2) | `scripts/*.mjs` |

## Tech stack

- **TypeScript + Node 20+ / Bun** for the Layer 1 loader (`scripts/load-knowledge/`).
- **Plain .mjs scripts** for the Layer 2 corpus import (`scripts/import-*.mjs`, `scripts/stats.mjs`).
- **better-sqlite3 11** for both stores; **ulid** for extractor-run IDs; **js-yaml** for seed ingestion.
- **Python 3 + libclang 18** for the engine-source extractors (live in `packages/qw-config/`, not here).

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
│   └── plan.md         # legacy Layer 2 pipeline plan
└── memory/             # prototyping artifacts
```

Each Layer 1 loader adapter is ~40-50 lines; shared scaffolding lives in `load-version.ts`, `natural-keys.ts`, and `types.ts`.

## Commands

```bash
# Layer 1 loader (run from apps/qw-oracle/)
npm run typecheck                                         # bunx tsc --noEmit
npm run load-knowledge -- load-version --project <p> --version <v> --type <t> --json <path> --commit <sha> --ordinal <n>
npm run load-knowledge -- load-assets   --project <p> --version <v> --json <bundle> --commit <sha> --ordinal <n>
npm run load-knowledge -- diff          --project <p> --from <v1> --to <v2>
npm run load-knowledge -- enrich        --project <p> --github-token <t> [--limit <n>]

# Layer 2 corpus (legacy .mjs scripts)
npm run import:discord
npm run import:irc
npm run stats
```

Supported entity types: `cvar`, `command`, `macro`, `cmdline_param`, `keyname`, `hud_element`, `ruleset`, `token_primitive`, `asset_category`, `flag_bit`.

## Always-on rules

- **npm `--no-workspaces` required** for add/install commands in this directory (monorepo setup).
- **`tsx -e` cannot resolve relative paths** - use a temp file inside `scripts/load-knowledge/` instead.
- **Layer 2 raw data is immutable** - never modify imported messages; all processing is regenerable from raw.
- **Layer 1 extractors are idempotent** - re-running against the same tag produces the same rows.
- **Regression guards are load-bearing** - `load-version` aborts when entity counts drop >50% without `--force`. Don't bypass.
- **Source citation discipline** - every Layer 1 row that can carry a `source_ref` must; every Layer 2 summary must trace back to message IDs.
- **Schema evolution updates SCHEMA.md** - schema changes update `SCHEMA.md` alongside the migration. Architecturally-significant changes (new entity-identity concepts, cross-cutting blame models, migrations that reshape how diffs work) additionally get a dated spec under root `docs/superpowers/specs/` for the design discussion. Small additive migrations (one new table, one new field) don't need a spec — SCHEMA.md + git history + schema.ts comments are enough.

## Non-negotiable rules

1. Raw data is immutable - never modify imported messages.
2. All processing is regenerable from the raw layer.
3. Tag every generated output with model + prompt version.
4. Keep it simple - scripts over frameworks, SQLite over Postgres.
5. Local-first processing - minimise API costs, maximise iteration speed.
6. Source citation - every answer must trace back to source (code line, message ID, or concept note).
