# QuakeWorld Monorepo - Overview

> What this document is: the living map of what is actually in this monorepo right now. If you want to know why it exists, see `VISION.md`. If you want the rules for working here, see `CLAUDE.md`. When in doubt, the code is the source of truth; this is the map.

## The five apps

Each app has its own `CLAUDE.md` in `apps/<name>/`. Current lifecycle statuses are from 2026-04-11.

### matchscheduler

**Status:** Maintenance (effective-legacy; will be rebuilt inside slipgate web).

Firebase web app for scheduling 4on4 matches. Vanilla JavaScript + Alpine.js + Tailwind CSS. Users create teams, declare weekly availability on a 3x3 grid, propose matches, and confirm them. Reads voice-recording manifests from the `voiceRecordings` Firestore collection (written by quad) to auto-load replays alongside scheduled matches. Reads head-to-head and form data from the qw-stats API.

Full context: `apps/matchscheduler/CLAUDE.md`.

### quad

**Status:** Maintenance (stable, integration-critical).

Discord voice recording bot that captures team comms during matches. TypeScript + discord.js. Records to OGG/Opus, uploads to Firebase Storage, writes a manifest to the `voiceRecordings` Firestore collection keyed by demo SHA256. Also handles the standin request flow via direct messages (`standin_requests` Firestore collection). Deployed via Docker.

Full context: `apps/quad/CLAUDE.md`.

### qw-stats

**Status:** Paused.

PostgreSQL 16 database of QuakeWorld 4on4 match statistics plus an Express API serving head-to-head, form, maps, and roster queries to matchscheduler. 18,000+ games indexed from 2022 to the present, auto-synced every 15 minutes from QWHub. Also contains the in-progress ranking research (composite rating, correlation analysis) that is stalled at identity resolution Phase 0.

Full context: `apps/qw-stats/CLAUDE.md`.

### slipgate-app

**Status:** Active (90% of current work lives here).

Desktop companion for QuakeWorld players. Tauri v2 + SolidJS + Rust. Windows-native in practice. Reads hardware specs (CPU, GPU, RAM, monitors, peripherals) via WMI and SetupAPI, parses ezQuake configs (follows exec chains, classifies binds, resolves aliases), manages the ezQuake install (version detection, stable + snapshot updater), and renders all of it inside a 6-tab sidebar app. The biggest feature by far is the ConfigViewer subsystem (~20 components, ~3000 lines of frontend code plus a 2124-line Rust parser).

Full context: `apps/slipgate-app/CLAUDE.md` and `apps/slipgate-app/docs/OVERVIEW.md` (the only per-app OVERVIEW in the monorepo today).

### qw-oracle

**Status:** Active (ezQuake Layer 1 fully extracted; Phase 2f historical backfill unblocked).

The **QW Knowledge Service**: a polyglot three-layer foundation (extracted facts from source code / interpreted claims from chat logs / curated concept notes) served over MCP so any LLM client can consume it. The existing 2.66M-message SQLite corpus is Layer 2; Layer 1 is the versioned knowledge DB at `apps/qw-oracle/data/knowledge.db` (gitignored, regenerated from extractor JSON); Layer 3 is hand-authored markdown with cross-layer references. First consumer is Claude Code via a local MCP, with future outlets planned for Quad (Discord), slipgate web, and the Slipgate helper panel.

**Phase 2c.6 shipped (2026-04-20):** ezQuake fully loaded at head across 9 entity types (3849 total entities: cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, asset_category) plus 4 asset relation tables. Schema at v3.

**Phase 2f stress testing (2026-04-20+):** TypeScript loader pipeline at `apps/qw-oracle/scripts/load-knowledge/` now generalized across all 10 types via `TYPE_DIFF_CONFIGS`. Release-notes ingestion shipped as schema v4 (`release_notes` table + `release-notes` CLI subcommand, fetches GitHub release bodies and parses bullet-by-bullet with entity / PR / commit / author linking). Stress-tested across 3 tag-pair spans (3.6.8->3.6.9, 3.6.5->3.6.6, 3.6.1->3.6.2 crossover); the last exercises the 2023-01-05 layout boundary where ezQuake moved source from repo root to `src/`. 7 ezQuake tags loaded (3.6.1, 3.6.2, 3.6.5, 3.6.6, 3.6.8, 3.6.9, head).

**Phase 2f Batch 2 shipped (2026-04-21):** Schema v5 adds `flag_bit` entity type (CVAR_* / FPD_* / STAT_* at ezQuake head = 50 entities; extensible FAMILY_TARGETS config) and `relation_changes` table (parallel to change_events, relation-keyed with deterministic row_key_json; diffs the 4 asset_* tables).

**Phase 2f Batch 3 shipped (2026-04-21):** Schema v6 adds `source_overrides` blame index (PK: entity_id + version + field_name; kinds struct_field_decl / call_site / header_declaration). Ruleset + hud_element extractors emit per-field header locations; cvars extractor emits Cvar_SetDefaultAndValue / Cvar_ResetVar call-site anchors. Diff pipeline consults overrides first, preloads into a Map per diff run for zero SQL per modification event. A2 revalidation: 25 ruleset mods now all blame to the struct-schema author commit (UNKNOWN count 5 -> 0). All 11 Phase 2f stress-test gaps closed plus the fresh-DB CHECK latent bug. Loader-site canonical_id switched to ordinal-based, fixing gap 11 spurious diff pairs.

Remaining work (all tracked in `HANDOVER.md`):
- **Phase 2f historical backfill proper** — now unblocked. Walk every ezQuake tag, diff consecutive pairs, enrich with PRs.
- **Phase 2d FTE** — first second-engine port, validates project-keyed schema.
- **Phase 2e MVDSV + KTX** — small ports; KTX needs py-tree-sitter.
- **Phase 2g MCP tool upgrades** — version parameters, `get_entity_history`.
- **Phase 2h automation** — scheduled tag-delta job.
- **Asset-bundle loader-family gaps** — surfaced by slipgate quake-dir inventory; 9 extensions + path_hint variants missing.

Earlier POC / service design: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md` (architecture) and `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` (MCP POC, orthogonal track).

Full context: `apps/qw-oracle/CLAUDE.md`, `apps/qw-oracle/OVERVIEW.md` (pipeline + machinery map), `apps/qw-oracle/SCHEMA.md` (Layer 1 data model), `apps/qw-oracle/VISION.md`.

## Integration map

How the apps share data.

```
          +---------------------------+
          | QW Hub (hub.quakeworld.nu)|
          |  Supabase + ktxstats CDN  |
          +-------------+-------------+
                        |
            +-----------+-----------+
            |                       |
            v                       v
    +---------------+       +---------------+
    |     quad      |       |   qw-stats    |
    | (Discord bot) |       |  (PostgreSQL) |
    +-------+-------+       +-------+-------+
            |                       |
            | voiceRecordings       | HTTP API
            | standin_requests      | (h2h, form,
            | (Firestore +          |  maps, roster)
            |  Firebase Storage)    |
            v                       v
          +-------------------------+
          |      matchscheduler     |
          |    (Firebase web app)   |
          +-------------------------+
```

quad and qw-stats are both read-only consumers of QW Hub. matchscheduler reads from both. slipgate-app is not on this diagram because it has no server-to-server integration with siblings: it uses Firebase Auth (`matchscheduler-dev` project) for Discord login and otherwise talks directly to ezQuake on the local filesystem and to GitHub Releases for the updater.

## Shared Firestore collections

Project: `matchscheduler-dev`.

| Collection | Writer | Reader | Purpose |
|---|---|---|---|
| `voiceRecordings/{demoSha256}` | quad | matchscheduler, slipgate-app (planned) | Voice recording manifest keyed by demo SHA256 |
| `standin_requests/{requestId}` | matchscheduler | quad | Standin request to Discord DM flow |
| `standin_preferences/{discordUserId}` | quad | quad + matchscheduler | Opt-out and block settings for standin DMs |

The authoritative data contract lives in `contracts/CROSS-PROJECT-SCHEMA.md`. If any of these shapes changes, update that file AND the writer AND the reader in the same commit.

## Shared Firebase Storage

| Path | Writer | Reader |
|---|---|---|
| `voice-recordings/{demoSha256}/{playerName}.ogg` | quad | matchscheduler |
| `team-logos/{teamId}/` | matchscheduler | matchscheduler |

Upload size limits and retention rules live in `contracts/CROSS-PROJECT-SCHEMA.md`.

## Packages

Two shared packages under `packages/`. Neither has a README today; both will get one when the package is next touched (lazy migration per the doc philosophy spec).

### qw-knowledge

Shared QW domain knowledge: maps (with spawn info, geometry hints), terminology, strategies, player mappings. Extracted from the archived `voice-analysis` repo during the 2026-03-29 monorepo migration. Consumed by quad for transcript enrichment and (eventually) by slipgate-app for map-related features.

### qw-config

Shared cvar definitions database for ezQuake and FTE. Consumed by slipgate-app's ConfigViewer to resolve cvar descriptions, types, enum values, defaults, and FTE / QWCL equivalents. The source of truth for "what does this cvar do" across the ecosystem.

Also home to the **unified AST-based libclang extractor** at `packages/qw-config/scripts/extract-ezquake-unified.py`, backed by the `extractor_lib/` handler package. One parse pass per file (client + server variants) is shared across all 8 entity handlers via a Visitor / shared-walk dispatcher, with `multiprocessing.Pool` across files. Handlers: commands, cvars, macros, cmdline params, keynames, hud elements, asset-cvar-bindings, asset-loader-sites. Three text/regex extractors remain as siblings (`extract-ezquake-flag-bits-clang.py`, `-rulesets-clang.py`, `-token-primitives-clang.py`) -- they were never libclang-based despite the filename. 8 legacy per-entity libclang scripts are archived at `scripts/_legacy/` (git-tracked, kept as fallback reference for full-history backfill). Extractors auto-detect `<repo>/src` vs repo-root layouts so they work across ezQuake's flat-layout era (3.2.x) and the modern src/ era (3.6+). Verified 32/32 PASS per-entity against legacy output across HEAD + 3.6.6 + 3.6.0 + 3.2.3. Measured on a Ryzen 9 3900X (2026-04-22): ~14s per tag vs 749s legacy sequential pipeline -- 55x. JSON outputs are the input contract for qw-oracle's knowledge-db loader.

## Contracts and cross-project specs

Cross-project design specs live in `contracts/`. The directory holds:

- `contracts/active/` - work in progress
- `contracts/completed/` - shipped specs, kept for history
- `contracts/CROSS-PROJECT-SCHEMA.md` - the authoritative Firestore and Storage data contract
- `contracts/AUDIO-SYNC-INVESTIGATION.md` - standalone investigation doc

See `contracts/README.md` for the indexed list of specs and a one-line summary of each.

## Shared infrastructure

External services and hosts that multiple apps rely on:

- **QW Hub API** - `https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games` (Supabase REST, match history) and `https://d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json` (ktxstats CDN, per-match stats). Read-only, no auth.
- **Firebase project `matchscheduler-dev`** - Firestore, Storage, Cloud Functions, Auth. Shared between matchscheduler and slipgate-app. Cloud function `discordOAuthExchange` handles Discord OAuth for both.
- **Unraid server** - Docker host for qw-stats. Reached via Tailscale at `100.114.81.91`.
- **Xerial's server** - Docker host for quad. Reached via Tailscale (`qwvoice_key` in WSL `~/.ssh/`).
- **Deployment details** - the `deploy` skill holds deploy commands, credential locations, and rollback notes for each deployable app. Invoke with "deploy" or `/deploy`. Each deployed app also has its own `DEPLOYMENT.md` in its root.

## Tooling and docs infrastructure

- **`.claude/skills/philosophy/`** - auto-loaded mindset docs (`grug-brain.md`, `philosophy-of-software-design.md`). Imported from root `CLAUDE.md` via `@import`. Always on, every session.
- **`~/.claude/skills/docs-check/`** - user-global session-end ritual skill (lives outside the monorepo). Walks a cognitive checklist for touched projects, nudges when docs drift, writes memory updates. Source-of-truth reference files at `references/doc-philosophy.md` and `references/doc-template.md`.
- **`~/.claude/skills/deploy/`** - user-global deploy skill covering all deployable apps in this monorepo.
- **`docs/superpowers/specs/`** - approved design specs (one per major feature, named `YYYY-MM-DD-<feature>-design.md`).
- **`docs/superpowers/plans/`** - implementation plans derived from specs (named `YYYY-MM-DD-<feature>.md`). Includes Phase 1 and Phase 2 plans for the doc philosophy work itself.
- **`.claude/settings.json`** - unified permissions and hooks for all apps in the monorepo. Replaces the old per-app permission configs from before the 2026-03-29 migration.

## What this doc intentionally does NOT cover

- **Per-app feature details** - each app's own `OVERVIEW.md`. slipgate-app and qw-oracle have theirs today; quad / qw-stats / matchscheduler will have theirs written lazily when Claude next works in them.
- **Why any of this exists** - `VISION.md`.
- **Session rules and workflow** - `CLAUDE.md`.
- **Deploy details** - the `deploy` skill and per-app `DEPLOYMENT.md` files.
- **Per-app architecture deep dives** - each app's `CLAUDE.md` and `docs/` tree. slipgate-app in particular has a rich docs tree (`CFG-PARSER.md`, `EZQUAKE-RESOLUTION.md`, `SYSTEM-SPECS.md`, `AUTH.md`, etc.) that documents its most complex subsystems.
