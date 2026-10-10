# QuakeWorld Monorepo — Overview

> **Doc type: load-bearing slim.** Cross-app integration diagrams, per-app status snapshot, shared-collection contracts, packages roster, infrastructure boundaries. Per-app feature detail lives in each app's own `OVERVIEW.md`; recent ship history lives in each app's `arc-history.md` (where it exists). When in doubt, code is the source of truth.

---

## The eight apps

Per-app docs are `apps/<name>/CLAUDE.md` and what it indexes. Seven apps carry the full README / VISION / OVERVIEW quartet; docs-web has `CLAUDE.md` + `DEPLOYMENT.md` only. slipgate-app's deep map is `apps/slipgate-app/OVERVIEW.md` (code landmarks), with its Layer 2 tree indexed from `apps/slipgate-app/docs/CLAUDE.md`.

- **matchscheduler** — *Maintenance, effective-legacy.* Firebase web app scheduling 4on4 matches. Will rebuild inside slipgate web.
- **quad** — *Maintenance.* Discord bot recording per-speaker OGG/Opus + standin DM flow.
- **qw-stats** — *Paused.* PostgreSQL 16 + Express API over every 4on4 game since 2022 (23,000+, self-synced from QWHub every 15 min, public via a Cloudflare tunnel); ranking product waits on identity-resolution Phase 0.
- **slipgate-app** — *Paused — waiting on a Windows build path and the Browse+Manager UI brainstorm.* Tauri v2 + SolidJS + Rust desktop companion; Windows-native.
- **qw-oracle** — *Active.* Three-layer knowledge service (Postgres + pgvector) served over MCP (`oracle.slipgate.me/mcp`) and by snapshot. Seven engine codebases loaded (ezQuake / FTE / QWCL / MVDSV / KTX / QTV / QWFWD) plus the `qw` game-content namespace. Sizes in `apps/qw-oracle/OVERVIEW.md`; ship history at `apps/qw-oracle/docs/arc-history.md`.
- **oracle-web** — *Active.* SolidJS + Cloudflare Pages read-only brain surface for the Oracle (oracle.quake.world; the zone is vikpe's). State in `HANDOVER.md` (Oracle web direction).
- **docs-web** — *Paused — waiting on vikpe's DNS greenlight for docs.quake.world.* VitePress + Cloudflare Pages: docs.quake.world, the Layer 1 reference projected per codebase from the Oracle; preview deploy on the operator's account until the domain is greenlit (`apps/docs-web/DEPLOYMENT.md`).
- **qwiki-sandbox** — *Maintenance.* The v1-beta MediaWiki substrate and deploy stack for wiki.slipgate.me (nginx + mediawiki-fpm + MariaDB on Unraid); the Modes curator tool (Phases 5-8) is unbuilt.

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
|  Layer 1  (Postgres)       |--->|  tools:       |-->|  Claude Code        (live) |
|    engine + game-content   |    |  lookup /     |   |                            |
|    facts, versioned        |    |  search /     |   |  slipgate-app      (live)  |
|                            |    |  concept note |   |  reads oracle-generated    |
|  Layer 2  (Postgres)       |    +---------------+   |  JSON snapshots in         |
|    Discord chat, threaded  |                        |  apps/slipgate-app/src/    |
|                            |    +---------------+   |    lib/config/data/        |
|  Layer 3  curated/         |--->| build-snapshot|-->|                            |
|    concept notes, profiles |    |     CLI       |   |  quad chatbot    (future)  |
|                            |    +---------------+   |  slipgate web    (future)  |
|  (backstage) extractors,   |                        |  community chatbot         |
|  loaders, diff pipeline    |                        |                  (future)  |
+----------------------------+                        +----------------------------+
```

Claude Code queries MCP live; slipgate-app reads pre-computed snapshots regenerated on demand by oracle's `build-snapshot` CLI. Future chatbots join as MCP consumers; web services join as snapshot consumers. Extractor fleet (Python + libclang for all seven codebases; tree-sitter would enter only with the dusty-ktx QuakeC fork) lives at `apps/qw-oracle/scripts/extractors/`. The former `qw-config` package was retired 2026-04-25 (concerns split between oracle extractors and slipgate-app `src/lib/config/`).

The public MCP endpoint is `https://oracle.slipgate.me/mcp` (Cloudflare Tunnel, per-IP rate limit, Streamable HTTP; Postgres + pgvector + tsvector single-engine across all three layers). The serving stack and its deploy routine are `apps/qw-oracle/DEPLOYMENT.md`; the ship log is `apps/qw-oracle/docs/arc-history.md`.

---

## Shared persistence (Firestore + Storage)

Firebase project `matchscheduler-dev`. Authoritative contract at `contracts/SCHEMA.md` — when any shape changes, update that file AND the writer AND the reader in the same commit.

| Path | Writer | Reader | Purpose |
|---|---|---|---|
| `voiceRecordings/{demoSha256}_{teamId}` (Firestore) | quad | matchscheduler, slipgate-app (planned) | Voice recording manifest keyed by demo SHA256 + team; bare `{demoSha256}` only for unregistered sessions |
| `standin_requests/{requestId}` (Firestore) | designed for matchscheduler, no writer built | quad | Standin DM flow, unbuilt on the MatchScheduler side |
| `standin_preferences/{discordUserId}` (Firestore) | quad | quad + matchscheduler | Opt-out and block settings for standin DMs |
| `voice-recordings/{teamId}/{demoSha256}/{discordUserId}.ogg` (Storage) | quad | matchscheduler | Sliced per-speaker audio for web playback; `{demoSha256}/{playerName}.ogg` only for unregistered sessions |
| `team-logos/{teamId}/` (Storage) | matchscheduler | matchscheduler | Team logo uploads |

---

## Packages

Two shared packages under `packages/`. Per-package docs at `packages/<name>/{README,VISION,OVERVIEW,CLAUDE}.md`.

- **qw-knowledge** — shared QW domain knowledge (maps with spawn info + geometry hints, terminology, strategies, player mappings). Extracted from archived `voice-analysis` during the 2026-03-29 monorepo migration.
- **qw-version-resolution** — pure-TS helpers for QW engine version strings (`parseVersionSpec`, `compareVersions`, `existsAtVersion`, `defaultAtVersion`). No deps. Wired into oracle and slipgate via `workspace:*`.

---

## Contracts and cross-project specs

Cross-project design specs live in `contracts/`:

- `contracts/active/` — work in progress
- `contracts/completed/` — shipped specs, kept for history
- `contracts/SCHEMA.md` — authoritative Firestore + Storage data contract
- `contracts/AUDIO-SYNC-INVESTIGATION.md` — standalone investigation doc

See `contracts/README.md` for the indexed list and one-line summaries.

---

## Shared infrastructure

External services and hosts that multiple apps rely on.

- **QW Hub API** — `https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games` (Supabase REST, match history) and `https://d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json` (ktxstats CDN, per-match stats). Read-only, no auth.
- **Firebase project `matchscheduler-dev`** — Firestore, Storage, Cloud Functions, Auth. Shared between matchscheduler and slipgate-app. Cloud function `discordOAuthExchange` handles Discord OAuth for both.
- **Unraid server** — Docker host for quad (with its Mumble server and acme.sh sidecar), qw-stats (API + its own cloudflared), qw-oracle (MCP, nginx, the prod and dev Postgres twins) and the qwiki stack (nginx + mediawiki-fpm + MariaDB, prod and dev). Reached via Tailscale at `100.114.81.91` (dev-plane access post-2026-07-28 fence: docker via `dev-deploy-proxy`, appdata rw-mounts — host SSH is gone). Public routes go through Cloudflare tunnels (`slipgate-tunnel` is shared and ops-owned; qw-stats runs its own). Mumble server (co-runs with quad) is publicly reachable at `mumble.slipgate.me:64738` via Cloudflare DNS + home router port-forward, with a Let's Encrypt cert auto-renewed by an `acme.sh` sidecar (see `apps/quad/DEPLOYMENT.md` → "Mumble TLS certificate"). Discord-shareable squad join URL `https://join.slipgate.me/<team-slug>` is served by a Cloudflare Worker (`apps/quad/cloudflare-worker/`).
- **Deployment details** — the in-repo `deploy` skill (`.claude/skills/deploy/`, invoke with `/deploy`) covers matchscheduler, quad, qw-stats and slipgate-app; qw-oracle, oracle-web and docs-web deploy from their own `DEPLOYMENT.md`, qwiki-sandbox from `deploy/README.md`.

---

## Tooling and docs infrastructure

- **`.claude/skills/philosophy/`** — auto-loaded mindset docs (grug-brain, philosophy-of-software-design); imported via `@import` in root `CLAUDE.md`.
- **`~/.claude/skills/docs-check/`** — user-global session-end ritual; its `references/doc-philosophy.md` and `doc-template.md` render harness-lab's `DOC-PHILOSOPHY.md`.
- **`.claude/skills/`** — thirteen project skills (deploy, the oracle curation and extraction skills, the KTX L1 rewrite pair, the QWHub API reference); only `philosophy/` is auto-imported.
- **`docs/superpowers/{specs,plans,parking}/`** — approved design specs / implementation plans / per-arc body files. Parking files are indexed from `HANDOVER.md` and use HANDOVER's existing template.
- **`HANDOVER.md`** (root) — the pointer index for active and parked work: four sections (ongoing arcs / future arcs / small followups / sidequests), one line per row, in the shape of harness-lab `DOC-WRITING.md`'s row contract. Arc bodies in `parking/`; shipped retrospectives in `docs/arc-history.md` (repo scope) or the project's own.
- **`.claude/settings.json`** — unified permissions and hooks for all apps.

---

## What this doc intentionally does NOT cover

- **Per-app feature details** → each app's own `OVERVIEW.md`
- **Shipped arcs** → `docs/arc-history.md` (repo scope, empty until a non-oracle arc ships) and `apps/qw-oracle/docs/arc-history.md` (the only per-app chronicle today)
- **Active backlog and parked future work** → `HANDOVER.md` + `docs/superpowers/parking/`
- **Why any of this exists** → `VISION.md`
- **Session rules and workflow** → `CLAUDE.md`
- **Deploy details** → the `deploy` skill + per-app `DEPLOYMENT.md`
- **Per-app architecture deep dives** → each app's `CLAUDE.md` + `docs/` tree (slipgate-app's tree is the richest)

---

*Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2 (litmus test applied; per-app multi-paragraph descriptions / qw-oracle phase-status updates / packages multi-paragraph rosters all collapsed to one-liners with pointers; ASCII integration diagrams kept verbatim — they are the load-bearing cross-app boundary attestation).*
