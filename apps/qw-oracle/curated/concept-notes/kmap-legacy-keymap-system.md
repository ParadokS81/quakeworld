---
title: "The .kmap legacy keymap system and its persistence via nQuake"
summary: "Why .kmap files keep showing up in modern QuakeWorld installs even though ezQuake removed the loader in 2014 - they ship inside nQuake's stale bundle. If you find one, it does nothing."
slug: kmap-legacy-keymap-system
topic: asset-lifecycle
status: draft
related_entities:
  - ezquake:extension:kmap
  - ezquake:commit:46b5046
  - ezquake:commit:1c794664
  - ezquake:cvar:in_builtinkeymap
related_messages: []
last_updated: 2026-04-22
---

# The .kmap legacy keymap system and its persistence via nQuake

## Summary

`.kmap` files are plain-text international keyboard-layout definitions inherited by ezQuake from its ZQuake/FuhQuake ancestors. The ezQuake project removed the loader subsystem on 2014-01-12. The files themselves continue to ship on user machines in 2026 because nQuake, a long-running community installer, bundles them inside its curated `ezquake.pk3` and has not refreshed that bundle to match the 2014 engine removal. A consumer that encounters `.kmap` files on a user's disk is looking at artifacts the current engine cannot use.

## Format

Each `.kmap` is a plain-text directive file. A representative Swedish layout (`keymaps/se.kmap` in nQuake's bundle, 3129 bytes) opens with a community-authorship header and a `keymap_name` directive, then lists per-scancode character mappings:

```
// ZQuake/FuhQuake keymap file
// SE-keymap, made by Empezar
// last change: 2006/04/06

keymap_name "SE"

keycode      001  ESCAPE
keycode      002  1             !
keycode      003  2             #34           @
...
```

The header line "ZQuake/FuhQuake keymap file" is material: the format predates ezQuake. ZQuake and FuhQuake were the previous generation of QuakeWorld clients that merged into ezQuake's lineage, which is why ten locale variants already existed by the time ezQuake inherited the subsystem. The files themselves are community-authored - "made by Empezar" in the `se.kmap` example is a real QuakeWorld community member, and the pattern of per-file community attribution repeats across the locale set.

The ten locale variants bundled: `default`, `dvorak`, `es` (Spanish), `fi` (Finnish), `fr` (French), `german`, `hungarian`, `pt-br` (Portuguese-Brazilian), `se` (Swedish), `uk`.

## Lifecycle in the ezQuake engine

- **Origin (2002-2003):** Matthias Mohr (aka "Massa") authored the `keymap.c` / `keymap.h` / `keymap_x11.c` subsystem in ezQuake's ancestors. Copyright header on `keymap.c` reads "Copyright (C) 2002-2003 Matthias Mohr (aka Massa)." At peak the subsystem spanned 994 lines of core code plus 259 lines of X11-specific handling.

- **Transition away from the format (pre-2014):** Commit `1c794664` shifted the default to OS-provided keymap translation, leaving the custom `.kmap` loader in place as a fallback. The file-format loader was no longer the primary path before it was finally removed.

- **Removal (2014-01-12):** Commit `46b5046` (Toni Spets, "Remove legacy keymap support") deleted 1446 lines across 9 files. Gone: `keymap.c`, `keymap.h`, `keymap_x11.c`, the 10 `.kmap` files from `misc/keymaps/`, and associated references in `client.h`, `config_manager.c`, `in_sdl2.c`, `keys.c`, `keys.h`, `settings_page.c`. The implicit rationale from the surrounding commits is that SDL2 had matured and was handling keymap translation natively, making the custom subsystem redundant.

- **What survived in current ezQuake:** A single cvar, `in_builtinkeymap`, at `keys.c:57` with default value `"0"`. When set to `1`, it selects ezQuake's hardcoded fallback keymap array (inherited from `keymap.c`'s `keymaps_default[][]`) over SDL's native handling. The cvar's name is a vestige of the larger removed subsystem; it's the only user-visible surface of what used to be 1446 lines of code.

## Current distribution via nQuake

ezQuake the engine does not distribute any `.kmap` files in 2026. The files that appear on user machines ride inside nQuake, a community installer for ezQuake that has been bundling competition-ready content since well before the 2014 engine removal. The canonical distribution path is:

1. nQuake's `distfiles` repository (`github.com/nQuake/distfiles`) holds the shared content the installers ship. The README describes it as the source of truth: "files will automatically sync to the nQuake mirrors every 10 minutes."
2. Inside that repository, `gpl/ezquake/ezquake.pk3` is an ezQuake asset bundle curated for competitive QW use.
3. Inside that pak, `keymaps/*.kmap` contains the ten legacy locale files verbatim from their pre-2014 form.

The nQuake distfiles repository is actively maintained - the most recent commit to the `ezquake.pk3` file at the time of writing is `e4cb23d` on 2026-02-28, message "Replace scrags with player spawn markers in nquakesv KTX config." So nQuake's continued inclusion of `.kmap` files is an active non-decision, not abandoned infrastructure. The pak has been re-committed without refreshing its pre-2014 content against the current engine surface.

Users who installed ezQuake via nQuake at any point from the early 2000s through today therefore have these files on disk, regardless of which ezQuake version they are currently running.

## Dangling help documentation

The same `nquake-distfiles/gpl/ezquake/ezquake.pk3` bundle carries a second class of orphan artifact alongside the `.kmap` files themselves: help XML pages for commands and cvars that no longer exist in the engine. The bundle contains `help/commands/keymap_init.xml`, `keymap_list.xml`, `keymap_load.xml`, `keymap_reset.xml`, `keymap_save.xml`, `keymaplist.xml`, and `help/variables/keymap_name.xml`. Each is a well-formed help page describing its subject; for example `keymap_load.xml` reads "This command first resets the current keymappings and then loads a new mapping from the given file." None of these commands or that cvar have existed in ezQuake source since the 2014 removal. Only `help/variables/in_builtinkeymap.xml` still points at a real engine entity.

The `.kmap` orphan case is therefore an instance of a broader pattern: any content in the curated bundle whose engine-side referent was removed after the bundle was authored stays in the bundle until someone regenerates it. That broader pattern may deserve its own concept note once other instances surface.

## Consumer implications

A consumer that encounters `.kmap` files on a user's disk in 2026 is seeing the engine-orphaned side of the nQuake bundle. Useful responses depend on what the consumer is building:

- **Slipgate app "My Quake / Browse" mode** (which explodes `.pk3` bundles into a flat file view) - when a user sees `keymaps/default.kmap` in the browse tree, the tool can surface the explainer "ezQuake no longer loads `.kmap` files; this file ships as historical content in the nQuake bundle. Not currently functional." The three-layer data join is: Layer 1 says `.kmap` is not loaded by any current ezQuake version; Layer 3 (this note) says it is a known nQuake bundle artifact; the consumer surfaces "obsolete, nQuake-shipped, safe to ignore."

- **Install cleanup features** - `.kmap` files under a quake directory are a safe candidate for "historical content, optional to remove" labelling. Not a deletion recommendation by default; the user may keep the bundle intact.

- **Oracle MCP queries** ("what is a .kmap file?") - answer with the transition story rather than only the mechanical extension-to-category mapping, because the plain mapping is misleading without the "no longer loaded" context.

- **Version-aware lookups** - if the consumer can detect the user's ezQuake version, no version currently supports the file format. A future FTE or MVDSV engine port into qw-oracle may surface different answers; this note is scoped to ezQuake.

## References

- ezQuake commits:
  - `46b5046` - "Remove legacy keymap support" by Toni Spets, 2014-01-12. 1446 lines removed across 9 files.
  - `1c794664` - "By default, use OS-provided keymap to translate scan codes to characters" - the pre-removal transition away from the format as default.
- ezQuake source at head:
  - `src/keys.c:57` - `cvar_t in_builtinkeymap = {"in_builtinkeymap", "0"}`.
  - `src/keys.c:1994` - registration: `Cvar_Register(&in_builtinkeymap)`.
- Pre-removal source files (historical, visible via `git show 46b5046^:<path>`): `keymap.c`, `keymap.h`, `keymap_x11.c`, `misc/keymaps/{default,dvorak,es,fi,fr,german,hungarian,pt-br,se,uk}.kmap`.
- nQuake distribution:
  - `research/repos/nquake-distfiles/gpl/ezquake/ezquake.pk3` - the bundle containing the `.kmap` files and orphaned help XML.
  - `nquake-distfiles` last commit touching this pak: `e4cb23d` on 2026-02-28.
  - nQuake project: `github.com/nQuake` organization (client-win32, client-linux, client-macosx, distfiles, server-*).
- Layer 1 identity-model architecture (future artifact_provenance work): `docs/superpowers/specs/2026-04-21-layer1-identity-model-design.md` - already treats nQuake as a canonical distribution provenance source.
- Community testimony: per ParadokS (competitive QuakeWorld player, 25 years experience), 2026-04-22: nQuake has been the dominant community installer for competitive setups since well before the 2014 engine change and is still the most common source of these files on user machines.

## Related concept notes

- `engine-internal-vs-player-facing-files.md` - the broader axis distinguishing files players author/edit from files the engine consumes silently. `.kmap` files sit on the engine-internal side; the orphan question reveals their visibility specifically when a tool like slipgate explodes the bundle.
- Future note candidate: **nQuake bundle staleness pattern** - the broader frame for `.kmap` + dangling help XMLs and any further instances discovered. A parent note this one could be placed under when that parent is written.
