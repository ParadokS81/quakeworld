# Handoff: extractor watchlist coverage for 4 zero-site asset_types

**Dispatched:** 2026-05-13
**Type:** fresh-terminal handoff (executor work, not parked)
**Source:** asset-type-curate skill skybox slice + scope-probe findings

This is a paste-into-fresh-`claude`-terminal handoff. Open the file in the new terminal, copy the fenced prompt below, paste as the first message. The new terminal does the work, commits to main, returns a summary you paste back into the orchestrator terminal.

Goal: close 4 L1 extractor coverage gaps so the asset-type-curate skill can process those slugs without halting at L1-GAP.

---

## Prompt to paste

```
You're picking up an L1 extractor coverage gap for qw-oracle. Four QW asset_types have
zero L1 sites in the extractor JSON because their loader functions aren't in the per-engine
LOADER_FUNCTIONS watchlist or aren't routed correctly by the category rules. Source-read,
add functions + routing, re-run extractor, verify sites appear, derive the seed's L1 hint
functions from the new JSON output (no hand-curation).

Working dir: /home/paradoks/projects/quakeworld

Read first (in order):
- apps/qw-oracle/scripts/extractors/CLAUDE.md (three-tier handler model)
- apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md (extractor structure + run commands)
- apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py (LOADER_FUNCTIONS,
  FUNCTION_TO_CATEGORY, ENCLOSING_FN_CATEGORY_RULES, ENCLOSING_FN_CATEGORY_OVERRIDES)
- apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py (FTE equivalents)
- apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml (target slugs at lines
  83=crosshair, 225=levelshot, 294=model_texture, 344=map_texture)

Target slugs (zero L1 sites in BOTH ezQuake and FTE today -- verified 2026-05-13 before dispatch):
1. crosshair
2. levelshot
3. model_texture
4. map_texture

Per slug, per engine (ezQuake first, then FTE):

1. Source-grep for the actual loader function in research/repos/ezquake-source/src/ and
   research/repos/fteqw/engine/. Useful starting greps:
   - crosshair: grep for "crosshair" + "Load|Image|Draw_Cache"
   - levelshot: grep for "levelshot" + "Load|Image"
   - model_texture: grep for "Mod_LoadExternalSkin|R_LoadModelTexture" or external-skin
     loading paths against player.mdl/v_*.mdl
   - map_texture: grep for "external" + "texture" in brushmodel-loading code,
     or "textures/<mapname>" path patterns
2. Identify the actual image-load call inside (R_LoadImagePixels, R_LoadHiResTexture,
   Draw_CachePicSafe, FS_LoadHeapFile, etc.) and the enclosing function name.
3. Add the enclosing function name to LOADER_FUNCTIONS in _handler_asset_loader_sites.py
   if missing. Add category routing rules to FUNCTION_TO_CATEGORY,
   ENCLOSING_FN_CATEGORY_RULES, or ENCLOSING_FN_CATEGORY_OVERRIDES as appropriate
   (per the three-tier model in the PLAYBOOK).
4. Re-run the per-engine extractor (command in EXTRACTOR-PLAYBOOK; typically
   `python apps/qw-oracle/scripts/extractors/<engine>/extract.py` against the current tag).
5. Verify with:
   jq '[.loader_sites[] | select(.reads_category_id == "<engine>:asset_category:<slug>")] | length' \
     apps/qw-oracle/scripts/extractors/<engine>/output/<engine>-asset-loader-sites-ast.json
   Should be >0 for each previously-empty slug.
6. Update qw-asset-types.yaml l1_hint_function_names for each slug with the function
   names that now appear in the extractor JSON (derived, not hand-curated).
7. Commit on main (no PR ceremony per project workflow). One commit per engine if
   extractor changes are clean-splittable, otherwise one combined commit.
   Message format: feat(qw-oracle/l1): expand <engine> LOADER_FUNCTIONS for
   crosshair/levelshot/model_texture/map_texture

Report back with:
- Functions added per engine (name + file:line)
- Routing rules added (if any)
- Per-slug site counts before/after in both engines
- Any slug where the loader uses a pattern the extractor can't handle (function-pointer
  dispatch, runtime-built name, etc.) -- flag as unresolved, don't invent a fix
- Commit SHAs

If you hit unexpected scope, halt and report -- don't expand the arc.
```

---

## Expected report shape (paste back here when terminal returns)

```
ezQuake additions:
- crosshair: <function_name> at <file.c:line> (added to LOADER_FUNCTIONS)
- levelshot: ...
- model_texture: ...
- map_texture: ...

FTE additions:
- ...

Routing rules added:
- ...

Site counts (before -> after):
- ezquake:asset_category:crosshair: 0 -> N
- ezquake:asset_category:levelshot: 0 -> N
- ...

Unresolved (if any):
- <slug>: <reason>

Commits:
- <sha> feat(qw-oracle/l1): ...
```

## What happens after

When the terminal returns and you paste the report:

1. Orchestrator (this terminal) updates `qw-asset-types.yaml` seed hints if the executor didn't already (they should have).
2. Re-run `/asset-type-curate skybox` as the calibration check against the patched skill + improved L1.
3. If calibration is clean, the asset-notes bucket is ready for fan-out planning (Phase 3 of the original arc).
