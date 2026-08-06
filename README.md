# QuakeWorld Monorepo

A solo-developer workshop hosting five QuakeWorld community apps that share data, infrastructure, and Claude sessions. Not the final home - some apps will graduate to vikpe's slipgate web repo eventually.

**Status:** Active development.

## What's in here

```
apps/
  matchscheduler/  - Firebase web app for scheduling 4on4 matches
  quad/            - Discord voice recording bot
  qw-stats/        - Stats API + ranking research
  slipgate-app/    - Desktop companion for QuakeWorld players
  qw-oracle/       - QuakeWorld knowledge service

packages/
  qw-knowledge/    - Shared QW domain knowledge (maps, terminology, strategies)

contracts/         - Cross-project specs and data contracts
research/          - Cloned reference repos (gitignored)
docs/              - Monorepo-wide design specs and implementation plans
people/            - Community expert profiles (pending)
.claude/skills/    - Monorepo-scoped always-loaded mindset docs
```

The five apps in one line each, with their current lifecycle status:

- **matchscheduler** - Firebase web app, vanilla JS + Alpine.js + Tailwind. *Maintenance.* Will be rebuilt inside slipgate web.
- **quad** - Discord voice recording bot, TypeScript + discord.js. *Maintenance.* Stable and integration-critical.
- **qw-stats** - PostgreSQL stats API + ranking research, Express backend. 18k+ games indexed. *Paused.*
- **slipgate-app** - Desktop companion, Tauri v2 + SolidJS + Rust. *Active* - 90% of current work lives here.
- **qw-oracle** - QuakeWorld knowledge service (source-extracted engine facts + a 741K-message Discord chat corpus), TypeScript + Node + Python. *Active* - Layer 1 loaded for all seven engine codebases; Layer 2 full-corpus backfill complete 2026-08-06 (40,219 threads).

## How it fits together

The apps share a QW Hub data source (`hub.quakeworld.nu`, Supabase + ktxstats CDN), a Firebase project (`matchscheduler-dev`), and cross-project contracts for voice recordings and standin flows. The integration diagram and shared-collection tables live in `OVERVIEW.md`.

## Using this repo

Read in this order:

- **`VISION.md`** - why this monorepo exists, workshop framing, which apps will graduate to slipgate web
- **`OVERVIEW.md`** - the living map: integration diagram, per-app status, packages, contracts, shared infrastructure
- **`CLAUDE.md`** - always-on rules for Claude sessions working here (planning-first workflow, output discipline, `@imported` philosophy skills)

Per-app details live in `apps/<name>/CLAUDE.md` and `apps/<name>/docs/`. slipgate-app has the most developed per-app docs today; others are lazy-migrated when Claude next works in them.

## Working with Claude

This monorepo is built to be Claude-assisted, not Claude-optional. The docs exist for Claude's navigation first, with the user as product owner. See `VISION.md` for that framing.

Two mindset docs auto-import from `.claude/skills/philosophy/` on every Claude session in this repo: `grug-brain.md` (from grugbrain.dev) and `philosophy-of-software-design.md` (from Ousterhout's book). Both are adapted from vikpe's slipgate web repo, with em dashes normalized to ASCII.

The `docs-check` skill (user-global at `~/.claude/skills/docs-check/`) runs at session-end to keep these docs honest. Triggered by phrases like "lets wrap up", "done for today", or "closing out". It walks a cognitive checklist for each touched project and nudges when docs have drifted from what the session built. Source of truth for the skill is `~/.claude/skills/docs-check/references/doc-philosophy.md` and `doc-template.md`.

## License / ownership

Maintained by ParadokS. Individual apps may have their own terms; see each app's README (pending for most) or LICENSE file where present. The adapted philosophy skill content credits vikpe's slipgate web repo at the top of each file.
