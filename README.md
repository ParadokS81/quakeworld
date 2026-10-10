# QuakeWorld Monorepo

A solo-developer workshop hosting the QuakeWorld community apps (eight folders under `apps/` today) that share data, infrastructure, one knowledge service and Claude sessions. Not the final home - some apps will graduate to vikpe's slipgate web repo eventually.

**Status:** Active development.

## What's in here

```
apps/
  matchscheduler/  - Firebase web app for scheduling 4on4 matches
  quad/            - Discord voice recording bot
  qw-stats/        - Stats API + ranking research
  slipgate-app/    - Desktop companion for QuakeWorld players
  qw-oracle/       - QuakeWorld knowledge service
  oracle-web/      - oracle.quake.world, the Oracle's read-only web surface
  docs-web/        - docs.quake.world, the per-codebase Layer 1 reference site
  qwiki-sandbox/   - wiki.slipgate.me, the v1-beta MediaWiki substrate

packages/
  qw-knowledge/            - Shared QW domain knowledge (maps, terminology, strategies)
  qw-version-resolution/   - Engine version arithmetic helpers

contracts/         - Cross-project specs and data contracts
docs/              - Monorepo-wide design specs, plans, parking files, research
infra/             - Unraid backup closeout + dev-databases compose
research/          - Reference clones (gitignored) and tracked design notes
archive/           - Pre-monorepo voice-analysis, reference only
.claude/skills/    - Project skills; philosophy/ is the always-loaded mindset pair
```

The apps in one line each, with the lifecycle status word each app's own `CLAUDE.md` declares:

- **matchscheduler** - Firebase web app, vanilla JS + Alpine.js + Tailwind. *Maintenance.* Will be rebuilt inside slipgate web.
- **quad** - Discord voice recording bot, TypeScript + discord.js. *Maintenance.* Stable and integration-critical.
- **qw-stats** - PostgreSQL stats API + ranking research, Express backend; every 4on4 game since 2022, self-synced from QWHub. *Paused.*
- **slipgate-app** - Desktop companion, Tauri v2 + SolidJS + Rust. *Paused* - waiting on a Windows build path and the Browse+Manager UI brainstorm.
- **qw-oracle** - QuakeWorld knowledge service (source-extracted engine facts, the Discord chat corpus, curated notes), TypeScript + Bun + Python (one Go extractor). *Active.* Sizes and ship history in `apps/qw-oracle/OVERVIEW.md` and its `docs/arc-history.md`.
- **oracle-web** - SolidJS on Cloudflare Pages, the Oracle's read-only brain surface at oracle.quake.world. *Active.*
- **docs-web** - VitePress on Cloudflare Pages, docs.quake.world. *Paused* - waiting on the zone owner's DNS greenlight; a preview deploy serves meanwhile.
- **qwiki-sandbox** - MediaWiki substrate and deploy stack for wiki.slipgate.me. *Maintenance.*

## How it fits together

The apps share a QW Hub data source (`hub.quakeworld.nu`, Supabase + ktxstats CDN), a Firebase project (`matchscheduler-dev`), and cross-project contracts for voice recordings and standin flows. qw-oracle is the knowledge service the newer apps consume: slipgate-app by snapshot, oracle-web and docs-web as web surfaces, Claude Code over MCP. The integration diagrams and shared-collection tables live in `OVERVIEW.md`.

## Using this repo

Read in this order:

- **`VISION.md`** - why this monorepo exists, workshop framing, which apps will graduate to slipgate web
- **`OVERVIEW.md`** - the living map: integration diagram, per-app status, packages, contracts, shared infrastructure
- **`CLAUDE.md`** - always-on rules for Claude sessions working here (planning-first workflow, output discipline, `@imported` philosophy skills)

Per-app details live in `apps/<name>/CLAUDE.md` (the scope's index) and the documents it points at.

## Working with Claude

This monorepo is built to be Claude-assisted, not Claude-optional. The docs exist for Claude's navigation first, with the user as product owner. See `VISION.md` for that framing.

Two mindset docs auto-import from `.claude/skills/philosophy/` on every Claude session in this repo: `grug-brain.md` (from grugbrain.dev) and `philosophy-of-software-design.md` (from Ousterhout's book). Both are adapted from vikpe's slipgate web repo, with em dashes normalized to ASCII.

The `docs-check` skill (user-global at `~/.claude/skills/docs-check/`) runs at session-end to keep these docs honest. Triggered by phrases like "lets wrap up", "done for today", or "closing out". It walks a cognitive checklist for each touched project and nudges when docs have drifted from what the session built. Source of truth for the skill is `~/.claude/skills/docs-check/references/doc-philosophy.md` and `doc-template.md`, renderings of harness-lab's `DOC-PHILOSOPHY.md` (the canonical constitution root `CLAUDE.md` points at).

## License / ownership

Maintained by ParadokS. Individual apps may have their own terms; see each app's README (pending for most) or LICENSE file where present. The adapted philosophy skill content credits vikpe's slipgate web repo at the top of each file.
