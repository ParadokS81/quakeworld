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

**Status:** Paused.

Community knowledge base. Node.js + SQLite archive containing 2.66M Discord messages plus structured imports of forum threads, match data, and player profiles. The ambitious vision is a comprehensive queryable QW history. Today it is mostly a large SQLite file with an import pipeline.

Full context: `apps/qw-oracle/CLAUDE.md`.

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

- **Per-app feature details** - each app's own `docs/OVERVIEW.md`. slipgate-app has one today; quad / qw-stats / qw-oracle / matchscheduler will have theirs written lazily when Claude next works in them.
- **Why any of this exists** - `VISION.md`.
- **Session rules and workflow** - `CLAUDE.md`.
- **Deploy details** - the `deploy` skill and per-app `DEPLOYMENT.md` files.
- **Per-app architecture deep dives** - each app's `CLAUDE.md` and `docs/` tree. slipgate-app in particular has a rich docs tree (`CFG-PARSER.md`, `EZQUAKE-RESOLUTION.md`, `SYSTEM-SPECS.md`, `AUTH.md`, etc.) that documents its most complex subsystems.
