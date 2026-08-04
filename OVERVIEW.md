# QuakeWorld Monorepo — Overview

> **Doc type: load-bearing slim.** Cross-app integration diagrams, per-app status snapshot, shared-collection contracts, packages roster, infrastructure boundaries. Per-app feature detail lives in each app's own `OVERVIEW.md`; recent ship history lives in each app's `arc-history.md` (where it exists). When in doubt, code is the source of truth.

---

## The five apps

Per-app docs at `apps/<name>/{README,VISION,OVERVIEW,CLAUDE}.md` (slipgate-app also has `apps/slipgate-app/docs/OVERVIEW.md` as the deep map).

- **matchscheduler** — *Maintenance, effective-legacy.* Firebase web app scheduling 4on4 matches. Will rebuild inside slipgate web.
- **quad** — *Maintenance, stable across 16 teams.* Discord bot recording per-speaker OGG/Opus + standin DM flow.
- **qw-stats** — *Paused.* PostgreSQL 16 + Express API of 18,000+ 4on4 games; ranking research stalled at identity-resolution Phase 0.
- **slipgate-app** — *Active (90% of current work).* Tauri v2 + SolidJS + Rust desktop companion; Windows-native.
- **qw-oracle** — *Active.* Three-layer knowledge service over MCP + snapshot distribution. Seven engine codebases loaded (ezQuake / FTE / QWCL / MVDSV / KTX / QTV / QWFWD) plus the `qw` game-content namespace; prod refreshed to full parity 2026-08-04. Ship history at `apps/qw-oracle/docs/arc-history.md`.

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
|  Layer 1  (Postgres)       |--->|  13 tools:    |-->|  Claude Code        (live) |
|    engine + game-content   |    |  lookup /     |   |                            |
|    facts, versioned        |    |  search /     |   |  slipgate-app      (live)  |
|                            |    |  concept note |   |  reads oracle-generated    |
|  Layer 2  (Postgres)       |    +---------------+   |  JSON snapshots in         |
|    729K msgs, 8.6K threads |                        |  apps/slipgate-app/src/    |
|                            |    +---------------+   |    lib/config/data/        |
|  Layer 3  curated/         |--->| build-snapshot|-->|                            |
|    45 notes + 920 profiles |    |     CLI       |   |  quad chatbot    (future)  |
|                            |    +---------------+   |  slipgate web    (future)  |
|  (backstage) extractors,   |                        |  community chatbot         |
|  loaders, diff pipeline    |                        |                  (future)  |
+----------------------------+                        +----------------------------+
```

Claude Code queries MCP live; slipgate-app reads pre-computed snapshots regenerated on demand by oracle's `build-snapshot` CLI. Future chatbots join as MCP consumers; web services join as snapshot consumers. Extractor fleet (Python + libclang; tree-sitter for KTX) lives at `apps/qw-oracle/scripts/extractors/`. The former `qw-config` package was retired 2026-04-25 (concerns split between oracle extractors and slipgate-app `src/lib/config/`).

**Arc-1 update (2026-05-03):** qw-oracle ships a public MCP at `https://oracle.slipgate.me/mcp` behind Cloudflare Tunnel + per-IP rate limiting; Streamable HTTP transport, Postgres + pgvector + tsvector single-engine across all three layers. Snapshot delta-fetch pipeline lands in Arc 2. See `apps/qw-oracle/docs/arc-history.md` for the full ship log.

---

## Shared persistence (Firestore + Storage)

Firebase project `matchscheduler-dev`. Authoritative contract at `contracts/CROSS-PROJECT-SCHEMA.md` — when any shape changes, update that file AND the writer AND the reader in the same commit.

| Path | Writer | Reader | Purpose |
|---|---|---|---|
| `voiceRecordings/{demoSha256}` (Firestore) | quad | matchscheduler, slipgate-app (planned) | Voice recording manifest keyed by demo SHA256 |
| `standin_requests/{requestId}` (Firestore) | matchscheduler | quad | Standin request to Discord DM flow |
| `standin_preferences/{discordUserId}` (Firestore) | quad | quad + matchscheduler | Opt-out and block settings for standin DMs |
| `voice-recordings/{demoSha256}/{playerName}.ogg` (Storage) | quad | matchscheduler | Sliced per-speaker audio for web playback |
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
- `contracts/CROSS-PROJECT-SCHEMA.md` — authoritative Firestore + Storage data contract
- `contracts/AUDIO-SYNC-INVESTIGATION.md` — standalone investigation doc

See `contracts/README.md` for the indexed list and one-line summaries.

---

## Shared infrastructure

External services and hosts that multiple apps rely on.

- **QW Hub API** — `https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games` (Supabase REST, match history) and `https://d.quake.world/{sha[0:3]}/{sha}.mvd.ktxstats.json` (ktxstats CDN, per-match stats). Read-only, no auth.
- **Firebase project `matchscheduler-dev`** — Firestore, Storage, Cloud Functions, Auth. Shared between matchscheduler and slipgate-app. Cloud function `discordOAuthExchange` handles Discord OAuth for both.
- **Unraid server** — Docker host for quad and qw-stats. Reached via Tailscale at `100.114.81.91` (dev-plane access post-2026-07-28 fence: docker via `dev-deploy-proxy`, appdata rw-mounts — host SSH is gone). Mumble server (co-runs with quad) is publicly reachable at `mumble.slipgate.me:64738` via Cloudflare DNS + home router port-forward, with a Let's Encrypt cert auto-renewed by an `acme.sh` sidecar (see `apps/quad/DEPLOYMENT.md` → "Mumble TLS certificate"). Discord-shareable squad join URL `https://join.slipgate.me/<team-slug>` is served by a Cloudflare Worker (`apps/quad/cloudflare-worker/`).
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
