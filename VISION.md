# Vision - QuakeWorld Monorepo

## What this is

A workshop monorepo where five QuakeWorld community apps share Claude sessions, shared data schemas, and cross-project contracts. Not the final home - some apps will graduate to vikpe's slipgate web repo eventually, and the ones that stay workshop-only do so with purpose.

This file answers "why does this monorepo exist as a container?" - not "why does any individual app exist." Each app has its own `VISION.md` (or will, written lazily when Claude next works in that app).

The "workshop" framing is deliberate. A workshop is a place where rough work happens, where prototypes live alongside production, where an apprentice can experiment without breaking anything sacred, and where some pieces leave for a permanent home once they are finished. That is exactly the shape of this repo: some apps are maturing toward graduation, some are stable tools, some are idea-stage sketches, and the monorepo itself is the bench they all share.

## How we got here

The monorepo was assembled on 2026-03-29 by merging five previously-separate repos into one working tree. Each app used to live in its own repo under `/home/paradoks/projects/quake/` with its own git history. When the monorepo was created, git history was intentionally NOT preserved - forward velocity mattered more than archaeology, and the old repos are still there as a dead archive if anyone ever needs to reach back.

Several things changed in the merge that are worth remembering:

- `voice-analysis` was archived. Its valuable parts (maps, terminology, player mappings) were extracted into `packages/qw-knowledge/`. The analyzer logic is reference-only.
- `qw-stats` was extracted from inside `matchscheduler` (where it was awkwardly nested) into a peer app with its own space.
- Old slipgate web planning docs were dropped entirely. vikpe's actual slipgate web repo supersedes them.
- Per-app `CLAUDE.md` files were slimmed; duplicated WSL / bug triage / testing sections were moved to the monorepo root.
- A root `.claude/settings.json` unified permissions across all apps so session-time approval clicking went away.

None of this is load-bearing for daily work. It matters only if someone (a future Claude session, a future collaborator, a future ParadokS after a break) wonders "why is this file structured this way?" The answer is usually "because the migration decided to, and it has stayed that way since."

## Why a monorepo

Five reasons, roughly in order of practical weight:

- **Shared Firebase project.** `matchscheduler-dev` hosts Firestore collections and Storage paths that cross app boundaries (voiceRecordings, standin_requests, team-logos). Keeping writers and readers in one repo means the data contract has one source of truth, not five.
- **Shared QW Hub consumption.** Multiple apps read from `hub.quakeworld.nu` (Supabase REST + ktxstats CDN). When the upstream changes shape, the fix lands in one repo and ripples where it needs to.
- **Cross-project specs need a home.** `contracts/active/` and `contracts/completed/` hold the design docs for features that span two or more apps (auto-record, voice replay, standin flow). Those docs do not belong in any single app's tree.
- **One working directory for Claude.** A Claude session can explore and edit all five apps from a single working directory. Cross-app refactors (renaming a shared Firestore field, updating a contract) happen in one branch with one mental model.
- **Cheap context switching for the user.** Solo developer maintaining all five apps. Keeping everything in one place lowers the mental cost of jumping between them.

## The emerging ecosystem

The monorepo started as "five apps sharing a workshop." What has emerged since is a clearer shape: one of those apps (qw-oracle) is turning into a **knowledge service** that the others consume, and several future products (two web services, a chatbot mode on an existing app, a new chatbot app) are lining up to consume it as well. This section names that shape explicitly so future sessions inherit the right mental model.

### Two parts: knowledge foundation and consumers

**qw-oracle is the knowledge service.** It holds three data layers (Layer 1 source-extracted engine facts, Layer 2 community chat corpus, Layer 3 curated concept notes) plus the backstage machinery that fills them (AST extractors, seed YAMLs, loader pipeline). The service is not a chatbot. A chatbot is a consumer built on top.

**Consumers** read the knowledge service via one of two serving surfaces:

- **MCP** - live queries, interactive access. Used by Claude Code today; future chatbots.
- **Snapshot distribution** - consumer-tailored JSON snapshots produced from the same foundation. Used by clients that need deterministic, pre-computed inputs (slipgate-app's ConfigViewer is the canonical case - it ships with a snapshot of the cvar facts its features need, not a live MCP dependency).

The live consumers today are Claude Code (MCP) and slipgate-app (snapshot -- reading oracle-generated JSON in `apps/slipgate-app/src/lib/config/data/` produced by oracle's `build-snapshot` CLI). Future consumers are scoped below.

### Web services family

Three community-facing web services are in the product direction, all siblings of the desktop app and all consuming the same knowledge service:

- **assets.quake.world** - catalog of custom content: skins, crosshairs, conchars, HUD overlays. Metadata, comments, provenance.
- **maps.quake.world** - map catalog with custom textures / lits / locs / mapshots cross-linked to tournament data.
- **hub.quake.world** - already exists; played matches with browser replay. The upstream of the Matches domain.

All three follow the same philosophy: curated central catalogs with per-asset metadata, navigable via web, consumable via the slipgate app. The app and the web services share a frontend stack so features flow between them.

A **content hash** (sha256 of file bytes) is the universal join key across local-dir, central-catalog, and GitHub-backup contexts. The local app authors no metadata beyond the hash; all descriptive metadata (name, creator, categorization, bundle membership) lives centrally and is fetched by hash lookup. This enables curated bundle subscriptions: users subscribe to bundles (e.g. "Tournament Maps 2026"), the central catalog pins a hash list per bundle version, slipgate diffs local hashes against the manifest, pulls missing entries, optionally prunes stale.

### qw-config has been retired (2026-04-25/26)

The former `packages/qw-config/` holding pen is gone. Its concerns split as planned:

- **AST extractors** moved into `apps/qw-oracle/scripts/extractors/<project>/` (Half 1, 2026-04-25).
- **Parser, converter, writers, loaders, JSON snapshots** moved into `apps/slipgate-app/src/lib/config/` -- where slipgate-specific config-toolkit code always belonged once oracle existed (Half 2a, 2026-04-25).
- **JSON snapshot generation** wired through oracle's new `build-snapshot` CLI: reads `knowledge.db`, writes enriched per-entity-type JSON (cvars, commands, macros, cmdline_params, asset bundle) into slipgate's `src/lib/config/data/` directory (Arc 2, 2026-04-25/26).

Slipgate now consumes oracle Layer 1 end-to-end via deterministic snapshots. The legacy hand-curated JSON path is gone.

## Who it's for

ParadokS as product owner and vibe coder. Claude Code (the CLI harness) as the engineer doing most of the keyboard work. Anthropic's Claude family of models as the brain.

This repo is explicitly NOT for a team. There is no CODE_OF_CONDUCT, no PR template, no issue template, no contributor guide. Forward velocity for one person plus one AI is the optimization target.

## Graduation paths

Not every app will live in this monorepo forever. The workshop framing is deliberate.

- **slipgate-app** - candidate to graduate to vikpe's slipgate web repo eventually, as the desktop companion to the web hub. Currently Active; the majority of day-to-day work happens here.
- **quad** - candidate to graduate. Stable, integration-critical Discord bot with a clean boundary. Maintenance.
- **matchscheduler** - will NOT graduate as-is. It will be rebuilt from scratch inside slipgate web in SolidJS. Effective-legacy today: still serving, but not evolving.
- **qw-stats** - uncertain graduation. The production API deployed on Unraid is useful today; the ranking research half is stalled. Paused.
- **qw-oracle** - workshop-only for the foreseeable future, but now the monorepo's structural center of gravity. The knowledge service consumed by Claude Code today (MCP) and soon by slipgate-app (snapshot distribution). Active; ezQuake Layer 1 fully loaded at head, historical backfill and second-engine ports ahead.

## What this repo is NOT

- Not a production monorepo in the "everyone clones this to build" sense. It is a solo-developer workshop. You can clone it; it will not necessarily build without substantial local setup.
- Not the final home for graduated apps. When quad or slipgate-app moves to slipgate web, the authoritative copy lives there, not here.
- Not a multi-contributor repo. No formal processes, no reviewer rotation, no release manager.
- Not a historical archive. Git history starts at the 2026-03-29 migration commit. The pre-migration history of each app lives in `/home/paradoks/projects/quake/` as a dead archive, intentionally not imported.
- Not a neutral or agnostic repo. It is deliberately shaped to be optimized for Claude's navigation first and for the user's mental model second.

## Values and philosophy

- **Docs optimized for Claude's navigation, not for a bookshelf.** If a doc exists, it exists because a future Claude session needs to read it. If it can be reconstructed from code alone, it is scaffolding.
- **Planning-first workflow is enforced.** Every non-trivial task starts with reading the affected code, presenting a plan, and getting approval before any implementation. See root `CLAUDE.md` for the exact rules.
- **Vibe coding is legitimate.** The user is not a formal engineer. Guardrails work with the style, not against it: lean rules, cheap commits, bias toward forward motion.
- **Git is history breadcrumbs, not ceremony.** Branching discipline is loose. Commit messages matter because they are the only record of "what changed and why." Forced process on top would be overhead for no benefit in a solo workflow.
- **Philosophy skills are always-on mindset.** `.claude/skills/philosophy/grug-brain.md` and `philosophy-of-software-design.md` auto-import on every Claude session in this repo. They push back against the default AI bias toward over-abstraction.
- **Output discipline in code and docs, natural voice in conversation.** ASCII only, no filler, no guessing in files that land. In chat, a natural direct voice is fine. See `CLAUDE.md` for the rule set.

## See also

For the actual state of what is in this monorepo right now - feature lists, file locations, per-app summaries, integration diagram - see `OVERVIEW.md`. For session rules, see `CLAUDE.md`.
