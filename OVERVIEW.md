# QuakeWorld Monorepo — Overview

> **Doc type: load-bearing slim.** Cross-app integration diagrams, per-app status snapshot, shared-collection contracts, packages roster, infrastructure boundaries. Per-app feature detail lives in each app's own `OVERVIEW.md`; recent ship history lives in each app's `arc-history.md` (where it exists). When in doubt, code is the source of truth.

---

## The five apps

Each app has its own `CLAUDE.md` and `OVERVIEW.md` under `apps/<name>/`. This table is the orientation snapshot only — open the per-app docs for actual detail.

| App | Status | One-line | Per-app docs |
|---|---|---|---|
| **matchscheduler** | Maintenance (effective-legacy; will be rebuilt inside slipgate web) | Firebase web app for scheduling 4on4 matches; reads voice manifests from quad and h2h/form/maps from qw-stats | `apps/matchscheduler/{README,VISION,OVERVIEW,CLAUDE}.md` |
| **quad** | Maintenance (stable, integration-critical) | Discord bot recording per-speaker voice (OGG/Opus, 16 teams), uploading to Firebase Storage, plus standin DM flow | `apps/quad/{README,VISION,OVERVIEW,CLAUDE}.md` |
| **qw-stats** | Paused | PostgreSQL 16 + Express API of 18,000+ 4on4 games (auto-synced every 15 min from QWHub); ranking research stalled at identity-resolution Phase 0 | `apps/qw-stats/{README,VISION,OVERVIEW,CLAUDE}.md` |
| **slipgate-app** | Active (90% of current work) | Tauri v2 + SolidJS + Rust desktop companion; Windows-native; reads hardware specs, parses ezQuake configs, manages install | `apps/slipgate-app/{README,VISION,OVERVIEW,CLAUDE}.md` plus `apps/slipgate-app/docs/OVERVIEW.md` (deep map) |
| **qw-oracle** | Active (KTX is the only outstanding engine port) | Three-layer knowledge service (Layer 1 source-extracted facts / Layer 2 chat corpus / Layer 3 concept notes) served over MCP and snapshot distribution | `apps/qw-oracle/{README,VISION,OVERVIEW,CLAUDE,SCHEMA}.md` plus `apps/qw-oracle/docs/arc-history.md` for chronological ship log |

---

## Integration map — server-to-server data flow

How matchscheduler / quad / qw-stats share data through QW Hub and Firebase.

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

quad and qw-stats are both read-only consumers of QW Hub. matchscheduler reads from both. **slipgate-app is not on this diagram** because it has no server-to-server integration with siblings: it uses Firebase Auth (`matchscheduler-dev` project) for Discord login and otherwise talks directly to ezQuake on the local filesystem and to GitHub Releases for the updater.

---

## Integration map — knowledge-service ecosystem

How the apps share domain knowledge through qw-oracle. See root `VISION.md` Section "The emerging ecosystem" for the framing.

```
+----------------------------+    serving surfaces    +----------------------------+
|  qw-oracle (knowledge svc) |    +---------------+   |         consumers          |
|                            |    |      MCP      |   |                            |
|  Layer 1  knowledge.db     |--->|  10 tools:    |-->|  Claude Code        (live) |
|    engine + game-content   |    |  lookup /     |   |                            |
|    facts, versioned        |    |  search /     |   |  slipgate-app      (live)  |
|                            |    |  concept note |   |  reads oracle-generated    |
|  Layer 2  qw.db            |    +---------------+   |  JSON snapshots in         |
|    2.66M chat + FTS5       |                        |  apps/slipgate-app/src/    |
|                            |    +---------------+   |    lib/config/data/        |
|  Layer 3  concept-notes/   |--->| build-snapshot|-->|                            |
|    9 notes + stewardship   |    |     CLI       |   |  quad chatbot    (future)  |
|                            |    +---------------+   |  slipgate web    (future)  |
|  (backstage) extractors,   |                        |  community chatbot         |
|  loaders, diff pipeline    |                        |                  (future)  |
+----------------------------+                        +----------------------------+
```

Claude Code queries MCP live; slipgate-app reads pre-computed snapshots regenerated on demand by oracle's `build-snapshot` CLI. Future chatbots join as MCP consumers; web services join as snapshot consumers. Extractor fleet (Python + libclang; tree-sitter for KTX) lives at `apps/qw-oracle/scripts/extractors/`. The former `qw-config` package was retired 2026-04-25 (concerns split between oracle extractors and slipgate-app `src/lib/config/`).

---

## Shared Firestore collections

Project: `matchscheduler-dev`. The authoritative data contract is `contracts/CROSS-PROJECT-SCHEMA.md`. If any shape changes, update that file AND the writer AND the reader in the same commit.

| Collection | Writer | Reader | Purpose |
|---|---|---|---|
| `voiceRecordings/{demoSha256}` | quad | matchscheduler, slipgate-app (planned) | Voice recording manifest keyed by demo SHA256 |
| `standin_requests/{requestId}` | matchscheduler | quad | Standin request to Discord DM flow |
| `standin_preferences/{discordUserId}` | quad | quad + matchscheduler | Opt-out and block settings for standin DMs |

## Shared Firebase Storage

| Path | Writer | Reader |
|---|---|---|
| `voice-recordings/{demoSha256}/{playerName}.ogg` | quad | matchscheduler |
| `team-logos/{teamId}/` | matchscheduler | matchscheduler |

Upload size limits and retention rules live in `contracts/CROSS-PROJECT-SCHEMA.md`.

---

## Packages

Two shared packages under `packages/`:

| Package | One-line | Per-package docs |
|---|---|---|
| **qw-knowledge** | Shared QW domain knowledge — maps (with spawn info, geometry hints), terminology, strategies, player mappings. Extracted from the archived `voice-analysis` repo during the 2026-03-29 monorepo migration. | `packages/qw-knowledge/{README,VISION,OVERVIEW,CLAUDE}.md` |
| **qw-version-resolution** | Pure-TS helpers for QW engine version strings (`parseVersionSpec`, `compareVersions`, `existsAtVersion`, `defaultAtVersion`). No deps. Wired into oracle and slipgate via `workspace:*`. | `packages/qw-version-resolution/{README,VISION,OVERVIEW,CLAUDE}.md` |

The former `qw-config` package was fully retired 2026-04-25 — concerns split between oracle (extractors, dissolved Half 1) and slipgate-app (parser/converter/writers/loaders/JSON snapshots, dissolved Half 2).

---

## Contracts and cross-project specs

Cross-project design specs live in `contracts/`:

- `contracts/active/` — work in progress
- `contracts/completed/` — shipped specs, kept for history
- `contracts/CROSS-PROJECT-SCHEMA.md` — authoritative Firestore + Storage data contract
- `contracts/AUDIO-SYNC-INVESTIGATION.md` — standalone investigation doc

See `contracts/README.md` for the indexed list and one-line summaries.

---

## Shared infrastructure

External services and hosts that multiple apps rely on.

- **QW Hub API** — `https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games` (Supabase REST, match history) and `https://d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json` (ktxstats CDN, per-match stats). Read-only, no auth.
- **Firebase project `matchscheduler-dev`** — Firestore, Storage, Cloud Functions, Auth. Shared between matchscheduler and slipgate-app. Cloud function `discordOAuthExchange` handles Discord OAuth for both.
- **Unraid server** — Docker host for qw-stats. Reached via Tailscale at `100.114.81.91`.
- **Xerial's server** — Docker host for quad. Reached via Tailscale (`qwvoice_key` in WSL `~/.ssh/`).
- **Deployment details** — the `deploy` skill holds deploy commands, credential locations, and rollback notes per app. Invoke with `/deploy`. Each deployed app also has its own `DEPLOYMENT.md`.

---

## Tooling and docs infrastructure

- **`.claude/skills/philosophy/`** — auto-loaded mindset docs (grug-brain, philosophy-of-software-design); imported via `@import` in root `CLAUDE.md`.
- **`~/.claude/skills/docs-check/`** — user-global session-end ritual; source-of-truth reference files at `references/doc-philosophy.md` and `references/doc-template.md`.
- **`~/.claude/skills/deploy/`** — user-global deploy skill covering all deployable apps.
- **`docs/superpowers/{specs,plans,parking}/`** — approved design specs / implementation plans / per-arc body files. Parking files are indexed from `HANDOVER.md` and use HANDOVER's existing template.
- **`HANDOVER.md`** (root) — thin docket; five-section index (small followups / sidequests / ongoing arcs / future arcs / recently opened). Arc bodies in `parking/`; shipped retrospectives in each project's `arc-history.md`.
- **`.claude/settings.json`** — unified permissions and hooks for all apps.

---

## What this doc intentionally does NOT cover

- **Per-app feature details** → each app's own `OVERVIEW.md`
- **Recent shipped arcs per project** → `apps/<project>/docs/arc-history.md` (currently only qw-oracle has one; bootstraps when a project ships its first arc in the new format)
- **Active backlog and parked future work** → `HANDOVER.md` + `docs/superpowers/parking/`
- **Why any of this exists** → `VISION.md`
- **Session rules and workflow** → `CLAUDE.md`
- **Deploy details** → the `deploy` skill + per-app `DEPLOYMENT.md`
- **Per-app architecture deep dives** → each app's `CLAUDE.md` + `docs/` tree (slipgate-app's tree is the richest)

---

*Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2 (litmus test applied; per-app multi-paragraph descriptions / qw-oracle phase-status updates / packages multi-paragraph rosters all collapsed to one-liners with pointers; ASCII integration diagrams kept verbatim — they are the load-bearing cross-app boundary attestation).*
