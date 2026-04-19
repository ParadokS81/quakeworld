---
Doc type: current - Vision spec. Short doc, holds the frame for the MyQuake dir-browser feature. Keep until the v1 implementation spec supersedes it.
---

# Quake-dir Browser - Vision Spec

**Date:** 2026-04-19
**Status:** Draft. Awaiting user review.
**Scope:** The "what's in my quake dir" feature inside the Slipgate app's `MyQuake` tab. Sibling of ConfigViewer; replaces the placeholder `Visuals` / `Matches` subtabs with a proper dir-browsing surface.
**Phase:** Vision only. Not an implementation spec. Blocked on oracle asset-consumption extraction (see companion spec).

## Related docs

- Companion oracle spec: `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md`
- Slipgate vision: `apps/slipgate-app/docs/VISION.md` ("Asset browser" section - this spec expands it)
- ConfigViewer spec lineage: `apps/slipgate-app/docs/superpowers/specs/2026-04-14-config-viewer-keyboard-panel-design.md` and sibling specs
- ConfigViewer parser architecture: `apps/slipgate-app/docs/CFG-PARSER.md`
- Ezquake resolution model (loaded-vs-default pattern applies here): `apps/slipgate-app/docs/EZQUAKE-RESOLUTION.md`
- HANDOVER.md entry: "Quake-dir browser vision + oracle prerequisite"

## Why this exists

Quake dirs accrete junk over years. Pak files get extracted and leave duplicates. Custom skins override vanilla. Forgotten maps fill gigabytes. Screenshots and demos pile up across versions. Today the only tool for this is Windows Explorer, which is hostile to the job.

ConfigViewer did for configs what this feature does for the rest of the dir: make it legible. The anchor is "demystify and restore order" - a user's own quake dir as a managed collection instead of a mystery pile.

## Scope for v1

**Read-only lens only.** Same posture as ConfigViewer's current phase: consume, view, explore. No writes, no in-place edits, no file deletion. v1 earns its place by making the dir legible; cleanup affordances come later when the viewer has proven the mental model.

The `MyQuake` tab already sets the pattern - the Config subtab shipped as a mature viewer before any edit capability. The dir-browser subtab repeats that discipline.

## Roadmap beyond v1

1. **Phase 2 - asset preview.** Visual preview of skins, conchars, crosshairs, weapon textures, wad contents. Model viewer for `.mdl` files. Same read-only posture.
2. **Phase 3 - clean-room export.** Copy the minimal viable subset of assets to a fresh directory. Non-destructive by construction (copy-out, never delete-in-place). Produces a clean `/qw/` from a messy one.
3. **Later - in-place edits.** Delete junk, move files, reorganize. Gated on the viewer's classification being trustworthy enough that users aren't being asked to delete something the tool misidentified.

Phase 2 and Phase 3 are separate specs, written when their time comes.

## Two-layer browse model

The core interaction is a wiki-style overview with filesystem reality always one click away.

**Layer 1 (overview / wiki).** Top-level surface. Organized by concept: installed clients, installed mods, asset categories. Navigable like a small website. Answers "what do I have?" at a glance.

**Layer 2 (filesystem reality).** Always accessible underneath. Every entry in Layer 1 can be drilled into to see where it actually lives on disk. Answers "where is this on my machine?" without leaving the app.

The UI should never hide the filesystem path from the user. The wiki layer is a better presentation; the filesystem layer is the ground truth.

## Loaded vs available

For a selected client, the browser draws a line between two states:

- **Loaded on launch.** Assets that ezQuake reads during startup: `config.cfg`, conchars, wads, crosshairs, default skins. Driven by cvar bindings and the executable's startup paths.
- **Available on demand.** Assets that exist in the dir but are only consumed when the game needs them: maps, player skins loaded per-connect, sound files played by specific events, mod content loaded via `gamedir`.

Both states are reported. "Loaded" means "we know this file is in memory right now if you launched the client." "Available" means "this file could be consumed if the right thing happens."

Junk = files in the dir that are neither loaded nor available from any code path the client exercises. That is the cleanup target the clean-room phase will act on.

## Taxonomy: hybrid

Asset categories are **opinionated** (QW-specific: configs, conchars, crosshairs, textures, skins, sounds, models, maps, wads, paks, demos, screenshots, HUD overlays) **plus a catch-all "other"** bucket for content that doesn't fit.

The taxonomy itself lives in oracle, not hardcoded in slipgate. When oracle learns about a new asset category (e.g. a future client adds a new texture path), slipgate inherits automatically. Slipgate stays a thin interpreter of the user's filesystem against oracle's rules.

## Multi-install: deferred

v1 mirrors ConfigViewer's current single-install anchor. The browser shows the dir for the currently-selected client (whatever `exePath` the rest of the app is using). Switch client, switch view.

Compare-installs ("what does my ezQuake have that my FTE install doesn't?") is a natural Phase 2 or 3 addition but not v1. Multi-install workspace views ("find duplicates across all installs") are further out and may never be worth the UI weight.

## Subtab rename (deferred)

The existing `MyQuake` tab has three subtabs: `Config` (built), `Visuals` (placeholder), `Matches` (placeholder). "Visuals" is too narrow for what this feature actually is. Candidate names: **Browse**, **Files**, **Directory**, **Contents**. Decide when the implementation spec starts, not now.

## Prerequisites

This spec does **not** progress to a writing-plans phase until the companion oracle spec lands. The reason: half the interesting claims the browser needs to make - "this file is loaded," "this file is shadowed," "this pak is extracted" - depend on authoritative rules that only oracle can provide.

Specifically, the browser needs oracle to expose:

- **Asset category catalog** (what a "skin" is, what a "conchar" is, extension mappings).
- **Path search rules** (load order across `id1/` -> `qw/` -> `<mod>/`, pak-vs-loose precedence, `.pak` vs `.pk3` ordering).
- **Cvar -> asset bindings** (which cvars resolve to which file paths; e.g. `cl_teamskin`, `sys_command_line`, HUD image cvars).
- **File-I/O call site inventory** (what functions read what, so the "available" set is correct).

Until these exist in oracle's `knowledge.db`, slipgate would have to hardcode QW lore - which defeats the architecture.

## Open research questions

These need answers from the oracle extraction work (or direct source reading) before slipgate v1 can produce trustworthy "loaded" classifications:

1. **Pak / pk3 / loose file load order.** When `qw/textures/conback.tga` exists both loose and inside `qw/pak0.pak` and inside `qw/models.pk3`, which wins? Documentation says "last loaded wins" but the concrete load order for paks, pk3s, and loose files at startup has to be confirmed from source.
2. **Mod dir semantics.** When `gamedir` is set, does the mod dir replace the `qw/` lookups or layer on top? What is the search-path stack?
3. **Connect-time downloads.** Files downloaded per-server connect land in specific subfolders (e.g. `downloads/`). Are they classified as "available" or as their own "downloaded" state?
4. **Cfg-driven asset paths.** Some cvars point at arbitrary paths via user config (e.g. crosshair image, custom conchars). The loaded set for a *specific* install depends on *that install's* resolved config. ConfigViewer's resolution machinery has to feed into the browser.

## What this spec is not

- Not a UI design. No wireframes, no component breakdown, no layout decisions. Those come in the implementation spec.
- Not a data-model spec for slipgate. The storage / state-machine shape is implementation detail.
- Not a roadmap commitment. Phases 2 and 3 will get their own brainstorm sessions when oracle is ready and v1 has taught us what users actually want.

## Success criteria for v1

When v1 ships, a user opening the browser subtab should be able to, without leaving the app:

1. See at a glance: which clients they have installed, which mods, which asset categories exist in their dir.
2. Drill into a category (e.g. "Skins") and see what's there.
3. For a category, see what is **loaded** (based on the resolved config) vs what is **available** (present but not yet consumed) vs **unreferenced** (present but no code path reads it).
4. Toggle to the filesystem view to see actual paths and file sizes.
5. Identify extracted-pak duplicates and cross-category oddities (e.g. a `.cfg` in `/skins/` - why?).

Cleanup is a Phase 3 capability. v1's success is "I understand what's in my quake dir for the first time in years."
