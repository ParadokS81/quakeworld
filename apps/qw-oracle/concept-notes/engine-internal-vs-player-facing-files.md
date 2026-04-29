---
title: "Engine-internal vs player-facing files in a QuakeWorld install"
slug: engine-internal-vs-player-facing-files
topic: classifier-metadata
status: draft
related_entities:
  - ezquake:extension:cfg
  - ezquake:extension:loc
  - ezquake:extension:spr
  - ezquake:extension:mdl
  - ezquake:extension:wav
  - ezquake:extension:bsp
  - ezquake:extension:dat
  - ezquake:extension:lit
  - ezquake:extension:xml
  - ezquake:extension:log
related_messages: []
last_updated: 2026-04-22
---

# Engine-internal vs player-facing files in a QuakeWorld install

## Summary

A QuakeWorld install contains files that players directly author or edit, and files the engine consumes silently on their behalf. The two groups look identical on disk. A tool that surfaces files to a user (for example, slipgate's browse mode, which explodes `pak` and `pk3` bundles into a flat file tree) benefits from distinguishing the two: engine-internal files otherwise appear as inscrutable noise, and player-facing files otherwise get lost in a long list. This note names the axis, places the extensions this project has audited onto it, and describes how consumers can use the distinction.

## The axis

Every file inside the quake directory or inside a bundled `pak`/`pk3` can be placed on a visibility axis with three useful zones:

- **Player-facing.** Players author or edit these files directly as part of normal use. They expect to see them and to recognize their names. Example: `config.cfg` is typed into a text editor; `aerowalk.loc` is opened, annotated, saved.
- **Engine-internal.** Players never directly touch these. The engine consumes them silently on the player's behalf. Their presence on disk is the outcome of some distribution decision (shipped in `pak0.pak` by id Software, bundled in `ezquake.pk3` by nQuake, downloaded from a server on connect). Example: `progs/s_explod.spr` is a rotating explosion billboard the engine draws automatically.
- **Context-dependent.** Some file types straddle the axis. Their classification depends on what the specific file is or how it was produced. Example: `stats.xml` written by a server is engine-internal; a player-copied summary of that file shared in a forum post is player-facing.

The axis is about *authorship and direct interaction*, not about whether the engine reads the file. All three zones contain files the engine may read; they differ in whether a human participated in producing or editing the specific file on disk.

## Placing the audited extensions

This project has produced `ast_verified` entries for the following extensions; each is placed on the axis below, with reasoning.

### Player-facing

- **`.cfg`** - player-authored configuration. Commonly hand-edited, version-controlled by competitive players, shared between teammates. Primary object in slipgate's ConfigViewer.
- **`.loc`** - location annotations. Players create new `.loc` files for maps they play (often, ones not covered by default locs), edit them in-engine via `addloc`/`removeloc`/`saveloc`, and share them as text files. The `keymap.c` comment-and-directive format is itself evidence of player-authorship expectation.

### Engine-internal

- **`.spr`** - Quake sprite format. The engine dispatches to `Mod_LoadSpriteModel` at `src/r_model.c:295-296` based on the `IDSPRITEHEADER` magic bytes, parsing the `dsprite_t` layout defined in `src/spritegn.h`. Ten-plus literal paths registered in `src/cl_ents.c:80-88` (explosion effects: `progs/s_explod.spr`, `progs/s_expl.spr`, `progs/s_bubble.spr`) and `src/cl_ents.c:131-147` (the 2D simple-items feature: `sprites/s_shells.spr`, `sprites/s_rockets.spr`, `sprites/s_mega.spr`, `sprites/s_quad.spr`, `sprites/s_invuln.spr`, and similar item billboards). Players do not edit these; they ship inside `pak0.pak` or `pak1.pak` from id Software, and the 2D-items feature either uses them or renders 3D models instead depending on engine settings.
- **`.mdl`** - Quake MDL model format. Same unified loader dispatch via `Mod_ForName`; players' `cl_modelnames[]` references point at `progs/player.mdl`, `progs/eyes.mdl`, `progs/flag.mdl`, etc. - all ship in `pak0.pak`, none are player-authored.
- **`.bsp`** - compiled map files. Players choose which map to play, may download new maps from servers on connect, but do not edit the `.bsp` binary directly. Map authoring happens on `.map` source files in external editors (not inside the quake dir) and the `.bsp` is the compilation output.
- **`.dat`** - QuakeC bytecode (`progs.dat`). The server-side game logic, compiled from `.qc` source by community toolchains. Players running vanilla QW never edit `progs.dat`; mod developers compile new ones.
- **`.lit`** - colored lightmap overrides. Generated offline from map source and distributed alongside `.bsp` files by community content packs. Not edited by players; consumed silently by the renderer when `gl_colorlights` is enabled.
- **`.wav`** - sound effect files. All shipped in `pak0.pak` by id Software. Edited only by modders producing custom sound packs, not by players.
- **`.kmap`** - retired keyboard-layout files. Historical engine-internal files shipped via nQuake even after the engine-side loader was removed in 2014. See `kmap-legacy-keymap-system.md` for the full story.

### Context-dependent

- **`.xml`** - two orthogonal uses. The ezQuake client consumes `help/commands/*.xml` and `help/variables/*.xml` as its ingame help browser source (engine-internal). The MVDSV server emits `stats.xml` per match (engine-internal at production; player-facing at distribution, since players copy these to share or archive). A consumer seeing an `.xml` file on disk has to look at its path pattern or content to decide.
- **`.log`** - the `.log` files produced by `match_auto_logconsole` are engine-written (a player does not author the content), but players read them after the fact to review games, post moments to Discord, or file bug reports. The *file* is engine-internal; the *content* is player-facing.
- **`.qwz`** - compressed demo files. Decoded externally by `qwdtools` into `.mvd` before the engine can play them. The file exists on disk because a player downloaded or received it, but the player does not author or edit `.qwz` content; a demo recorder produced it.

## Why this axis matters

The axis exists because slipgate (and any similar tool that presents quake-dir contents in a visual form) has to make UI decisions that Layer 1 alone cannot drive. Specifically, slipgate's browse mode explodes `.pak` and `.pk3` bundles into a flat tree. That design choice exposes every single engine-internal file - the `.spr`, `.mdl`, `.wav` content of `pak0.pak` - to a user who in vanilla Windows Explorer would never see them. Without the axis, the file tree looks like an inscrutable jumble of extensions. With the axis, the tool can:

- Dim or collapse engine-internal content by default, unless the user specifically chooses to inspect it.
- Annotate engine-internal files with a terse purpose label ("2D item sprite", "Quake model", "sound effect").
- Promote player-facing content to top-of-list position when relevant to the user's task (editing a config, browsing locs).
- Flag outliers: an engine-internal file with a path that doesn't match any known distribution manifest is a candidate for "unknown origin, possibly custom."

## Consumer implications

- **Slipgate browse mode** - the axis maps directly onto a UI choice about which files to surface prominently vs. which to dim or hide. The browse tree's category classifier (already consuming `asset_extensions` Layer 1 data) can be extended to include this axis as a secondary sort or filter.
- **Slipgate install audit** - "what can I safely delete from my quake dir" depends on the axis. Player-authored files (`.cfg`, `.loc`) are never safe to auto-prune; engine-internal files that don't match a known distribution hash are candidates.
- **Oracle MCP answers** - when asked "what is file X", the answer should be framed for the user's role. A player asking "what is `progs/s_quad.spr`" wants "the engine-drawn quad powerup sprite, you don't edit it"; a mod developer wants "the `dsprite_t` binary format, loaded at `r_model.c:295`." Same Layer 1 facts, different framings by axis.
- **Future FTE / MVDSV port data** - when qw-oracle loads FTE or MVDSV extractions, this axis port-transfers: `.cfg` remains player-facing, `.spr` remains engine-internal, and the axis is one of the few pieces of classifier metadata that is stable across engine ports. This note's taxonomy will extend to cover per-engine differences as ports land.

## References

- Sprite system source citations: `src/r_model.c:295-296` (magic-byte dispatch to `Mod_LoadSpriteModel`), `src/r_sprites.c:151` (the loader), `src/spritegn.h` (`dsprite_t` format), `src/cl_ents.c:80-88` and `:131-147` (literal path registrations).
- `cl_modelnames[]` declaration: `src/client.h:1065`; initialisation block: `src/cl_ents.c:56-147`.
- Slipgate browse mode: `apps/slipgate-app/src-tauri/src/commands/browse.rs` - the Rust scanner that produces the flat file tree.
- Slipgate browse UI: `apps/slipgate-app/src/components/MyQuakeTab.tsx` - the three-pane view where the axis would drive display choices.
- Layer 1 extensions table: `packages/qw-config/seeds/ezquake-asset-extensions.yaml` and the per-row audit notes in `apps/qw-oracle/docs/entity-types.md` Section  asset_extensions.
- Community testimony: per ParadokS, 2026-04-22, the `.spr` finding is a representative example of a broader class - many files in `pak0.pak` / `pak1.pak` are engine-internal by construction, invisible to players under vanilla browsers, and worth annotating for tools that expose them.

## Related concept notes

- `kmap-legacy-keymap-system.md` - a specific engine-internal file type with an additional retirement layer; uses this axis to classify the `.kmap` files as engine-internal.
- Future note candidate: **Extension to provenance confidence** - the bridge between "this extension is used by ezQuake under certain conditions" (Layer 1) and "this specific file on disk was written by ezQuake" (runtime attribution). Distinct from this axis but complementary: the axis tells you *who interacts with the file*, while provenance tells you *which tool put it on disk*.
