# QuakeWorld Monorepo - Overview

> What this document is: the living map of what is actually in this monorepo right now. If you want to know why it exists, see `VISION.md`. If you want the rules for working here, see `CLAUDE.md`. When in doubt, the code is the source of truth; this is the map.

## The five apps

Each app has its own `CLAUDE.md` in `apps/<name>/`. Current lifecycle statuses are from 2026-04-11.

### matchscheduler

**Status:** Maintenance (effective-legacy; will be rebuilt inside slipgate web).

Firebase web app for scheduling 4on4 matches. Vanilla JavaScript + Alpine.js + Tailwind CSS. Users create teams, declare weekly availability on a 3x3 grid, propose matches, and confirm them. Reads voice-recording manifests from the `voiceRecordings` Firestore collection (written by quad) to auto-load replays alongside scheduled matches. Reads head-to-head and form data from the qw-stats API.

Full context: `apps/matchscheduler/README.md` (elevator pitch), `apps/matchscheduler/VISION.md` (rationale + graduation path), `apps/matchscheduler/OVERVIEW.md` (current-state map), `apps/matchscheduler/CLAUDE.md` (rules).

### quad

**Status:** Maintenance (stable, integration-critical).

Discord voice recording bot that captures team comms during matches. TypeScript + discord.js. Records to OGG/Opus, uploads to Firebase Storage, writes a manifest to the `voiceRecordings` Firestore collection keyed by demo SHA256. Also handles the standin request flow via direct messages (`standin_requests` Firestore collection). Deployed via Docker.

Full context: `apps/quad/CLAUDE.md`.

### qw-stats

**Status:** Paused.

PostgreSQL 16 database of QuakeWorld 4on4 match statistics plus an Express API serving head-to-head, form, maps, and roster queries to matchscheduler. 18,000+ games indexed from 2022 to the present, auto-synced every 15 minutes from QWHub. Also contains the in-progress ranking research (composite rating, correlation analysis) that is stalled at identity resolution Phase 0.

Full context: `apps/qw-stats/README.md` (elevator pitch + getting started), `apps/qw-stats/VISION.md` (sniff-test + identity-resolution rationale), `apps/qw-stats/OVERVIEW.md` (current-state map), `apps/qw-stats/CLAUDE.md` (technical reference; will split when next touched).

### slipgate-app

**Status:** Active (90% of current work lives here).

Desktop companion for QuakeWorld players. Tauri v2 + SolidJS + Rust. Windows-native in practice. Reads hardware specs (CPU, GPU, RAM, monitors, peripherals) via WMI and SetupAPI, parses ezQuake configs (follows exec chains, classifies binds, resolves aliases), manages the ezQuake install (version detection, stable + snapshot updater), and renders all of it inside a 6-tab sidebar app. The biggest feature by far is the ConfigViewer subsystem (~20 components, ~3000 lines of frontend code plus a 2124-line Rust parser).

Full context: `apps/slipgate-app/README.md` (elevator pitch), `apps/slipgate-app/VISION.md` (rationale + three-subsystems thesis + drawing board), `apps/slipgate-app/OVERVIEW.md` (thin app-root map), `apps/slipgate-app/docs/OVERVIEW.md` (full feature map - the deep living doc), `apps/slipgate-app/CLAUDE.md` (rules).

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

## Integration maps

Two different integration patterns live in this monorepo. They share infrastructure but are structurally distinct, so each gets its own diagram.

### Server-to-server data flow

How the match / voice / stats apps share data through QW Hub and Firebase.

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

### Knowledge-service ecosystem

How the apps share domain knowledge through qw-oracle. See root `VISION.md` § "The emerging ecosystem" for the framing; this diagram is the current state.

```
+----------------------------+    serving surfaces    +----------------------------+
|  qw-oracle (knowledge svc) |    +---------------+   |         consumers          |
|                            |    |      MCP      |   |                            |
|  Layer 1  knowledge.db     |--->|  lookup /     |-->|  Claude Code        (live) |
|    engine facts, versioned |    |  search /     |   |                            |
|                            |    |  concept note |   |  slipgate-app      (live)  |
|  Layer 2  qw.db            |    +---------------+   |  reads oracle-generated    |
|    2.66M chat + FTS5       |                        |  JSON in apps/slipgate-app |
|                            |    +---------------+   |  /src/lib/config/data/     |
|  Layer 3  concept notes    |--->| build-snapshot|-->|  (5 entity files +         |
|    (not yet populated)     |    |     CLI       |   |   asset bundle)            |
|                            |    +---------------+   |                            |
|  (backstage) extractors,   |                        |  quad chatbot    (future)  |
|  loaders, diff pipeline    |                        |  assets/maps.quake.world   |
+----------------------------+                        |                   (future) |
                                                      |  slipgate web    (future)  |
                                                      +----------------------------+
```

Claude Code queries MCP live; slipgate-app reads pre-computed snapshots regenerated on demand by oracle's `build-snapshot` CLI. Both get the same underlying facts through different access patterns. Future chatbots (on quad or as a new app) join as MCP consumers; the web services join as snapshot consumers in their own shape.

The extractor fleet (Python + libclang for ezQuake and QWCL today; FTE / MVDSV / KTX / QWFWD as those ports land) is oracle's backstage machinery and lives at `apps/qw-oracle/scripts/extractors/` (project-scoped subdirs: `ezquake/`, `qwcl/`, `fte/`, `ktx/`, etc., plus shared `extractor_lib/`). The `qw-config` package was fully retired 2026-04-25/26 — its scraped JSON, parser, converter, writers, and loaders moved into `apps/slipgate-app/src/lib/config/`, and oracle's `build-snapshot` CLI now regenerates the JSON snapshots at richer fidelity from `knowledge.db`. See `apps/qw-oracle/OVERVIEW.md` for the extraction-pipeline map.

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

Two shared packages under `packages/`: `qw-knowledge` and `qw-version-resolution`. The former `qw-config` package was fully retired 2026-04-25 — its concerns split between oracle (extractors, dissolved Half 1 2026-04-25) and slipgate-app (parser/converter/writers/loaders/JSON snapshots, dissolved Half 2 2026-04-25).

### qw-knowledge

Shared QW domain knowledge: maps (with spawn info, geometry hints), terminology, strategies, player mappings. Extracted from the archived `voice-analysis` repo during the 2026-03-29 monorepo migration. Consumed by quad for transcript enrichment and (eventually) by slipgate-app for map-related features.

### qw-version-resolution

Shared TypeScript helpers for QW engine version strings: `parseVersionSpec` (turns `"3.6.9"` / `"head-2026-04-25"` / `"build-6698"` into a structured discriminated union), `compareVersions` (total ordering within a kind, tag < head/build, head/build mutually unordered), `existsAtVersion` (entity-alive-at-target check), `defaultAtVersion` (effective default after walking `default_history`). Pure functions, no deps. Shipped 2026-04-26 as Phase 0 of the Quake Dir Control plan. Wired into both qw-oracle and slipgate-app via `workspace:*` but unused until Phases 4 (oracle build-snapshot widening) and 5 (slipgate diff viewer) consume it. See `packages/qw-version-resolution/VISION.md` for the design choice that drove a shared lib over per-version pre-resolved snapshots.

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

- **Per-app feature details** - each app's own `OVERVIEW.md`. All five apps have theirs as of 2026-04-22.
- **Why any of this exists** - `VISION.md`.
- **Session rules and workflow** - `CLAUDE.md`.
- **Deploy details** - the `deploy` skill and per-app `DEPLOYMENT.md` files.
- **Per-app architecture deep dives** - each app's `CLAUDE.md` and `docs/` tree. slipgate-app in particular has a rich docs tree (`CFG-PARSER.md`, `EZQUAKE-RESOLUTION.md`, `SYSTEM-SPECS.md`, `AUTH.md`, etc.) that documents its most complex subsystems.
