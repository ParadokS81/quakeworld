# FTE Phase 2d-bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FTE asset-extraction layer in qw-oracle — two AST handlers + five hand-authored seed YAMLs + a path-rules verifier — and produce `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json` consumable by slipgate's directory scanner. Mirrors the existing ezQuake stack at `apps/qw-oracle/scripts/extractors/ezquake/`.

**Architecture:** Two new Visitor handlers (`_handler_asset_loader_sites.py`, `_handler_asset_cvar_bindings.py`) live alongside the existing FTE handlers at `apps/qw-oracle/scripts/extractors/fte/`. Five seed YAMLs at `fte/seeds/` capture FTE's category taxonomy, extension surface, search-path behavior, cvar bindings, and client-defaults. The existing project-parameterized `buildAssetBundle` (`apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts`) reads `<project>-*` files automatically — no edits needed. extract-tag picks up the new bundle once `PROJECT_HAS_ASSET_BUNDLE.fte` flips to `true` and `ENTITY_JSON_FILES.fte.asset_category` is populated.

**Tech stack:** Python 3 + libclang 18 (handlers), TypeScript + Bun (loader + verifier integration), js-yaml (seed parsing), SQLite via better-sqlite3 (storage). Schema delta: zero — all changes are additive at the data level.

---

## Critical context for the engineer

Read this section before starting. These gotchas are not optional knowledge.

1. **No schema changes.** Phase 2d-bundle is a data-only delivery. The five asset-related tables (`asset_categories`, `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`) already accommodate FTE — `project` CHECK includes `'fte'` since v10. Do not invent schema additions. If you find yourself wanting one, reread the spec section "Schema delta" before proceeding.

2. **buildAssetBundle is already project-parameterized.** `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts:149` takes `options.project: Project` and resolves every input path via the project name. Phase 1 succeeds by providing `fte-asset-categories.yaml` etc.; do not modify build-asset-bundle.ts.

3. **AST-first authoring order.** Per the spec, the seeds are authored AFTER the loader-sites handler runs and produces a research-artifact JSON. The Phase 1 task order reflects this. Do not write seed YAMLs first — you will guess wrong about which categories actually appear in FTE source.

4. **Phase 1 commits twice.** Operator-mandated checkpoint. Commit 1 lands the handlers + raw extractor output (research artifact). Commit 2 lands the seeds + bundle. This produces a natural review surface between observing reality and curating it.

5. **17 LOADER_FUNCTIONS in FTE, not ezQuake's 13.** The watchlist for FTE is below. Verified 2026-04-26 by grep against `research/repos/fteqw/engine/`:

    ```
    FS_OpenVFS (207)        FS_FLocateFile (82)     FS_LoadFile (36)
    FS_OpenReadLocation (13)  FS_NativePath (6)     FS_WriteFile (use COM_WriteFile)
    R_RegisterShader (134)    R_LoadHiResTexture (67)  R_RegisterCustom (32)
    R_RegisterPic (17)        R_LoadShader (16)
    S_PrecacheSound (88)
    Mod_ForName (78)          Mod_FindName (30)
    COM_WriteFile (21)        COM_LoadTempFile (18)   COM_LoadFile (13)
    COM_LoadStackFile (7)
    TP_LoadLocFile (3)
    ```

   Three GENERIC_FS_PRIMITIVES (call sites that are FS-layer code, not asset loaders): `FS_OpenVFS`, `FS_LoadFile`, `FS_FLocateFile`. Stamp these `intentionally_generic` when path_source is unknown.

6. **FTE has six archive backends.** `engine/common/fs_pak.c` (.pak), `fs_zip.c` (.pk3/.pk4/.zip), `fs_dzip.c` (.dz demos), `fs_xz.c` (.xz downloads), `fs_stdio.c` (raw OS fs), `fs_win32.c` (Windows native). vs ezQuake's two (pak + pk3). Path-rules seed (Task 1.9) must capture pk4 > pk3 > pak archive precedence and the `numbered before wildcard` ordering convention.

7. **Plugin source roots are already wired.** `extract.py` SOURCE_ROOTS contains `engine`, `plugin:ezhud`, and `plugin:ezscript` (the last added 2026-04-26 for sub-thread #3). The new asset handlers run against all three roots — no extract.py SOURCE_ROOTS edit needed. ezhud calls `Draw_CachePicSafe`-family loaders for HUD images; ezscript has zero asset loader call sites and emits no rows.

8. **Mirror, don't refactor.** The two existing ezQuake handlers (`extractor_lib/handler_asset_loader_sites.py`, `extractor_lib/handler_asset_cvar_bindings.py`) live in `extractor_lib/` for historical reasons but contain ezQuake-specific constants. Do NOT lift them into a shared base class for FTE — copy verbatim into `fte/_handler_asset_*.py` with FTE constants. If MVDSV/KTX makes a 3rd copy painful later, that's the trigger to refactor; not now. (Spec § 3.)

9. **Path-rules verifier is its own ~50-line port.** `apps/qw-oracle/scripts/extractors/ezquake/asset-path-rules-verify.py` parses each path-rules-seed `source_ref`, opens the file, confirms the cited line falls in the expected function. FTE needs a sibling at `fte/asset-path-rules-verify.py` because FTE's source layout is different (engine/common/fs.c vs ezQuake's src/fs.c). Do not generalize — copy and adapt to FTE's path conventions.

10. **buildAssetBundle expects the verifier's output JSON.** `build-asset-bundle.ts:188` reads `<project>-asset-path-rules-verified.json` from the project's `output/` dir. Without this file, the bundle build fails. Phase 2 wires the verifier into extract-tag as a step before buildAssetBundle.

11. **extract-tag was wired for FTE during sub-thread #3.** `PROJECT_EXTRACTOR.fte` is already set; `ENTITY_JSON_FILES.fte` already lists cvar/command/macro/cmdline_param/cvar_alias. Phase 2 ADDS `asset_category: 'fte-asset-bundle.json'` to that map and sets `PROJECT_HAS_ASSET_BUNDLE.fte = true`. Do not re-wire what is already wired.

12. **Bundle output goes to slipgate-app/src/lib/config/data/.** Per `DEFAULT_BUNDLE_OUTPUT_DIR` in build-asset-bundle.ts. The file is a build artifact at that path; no slipgate code is touched. ezQuake's bundle is already there. This does NOT violate the dispatch's "no apps/slipgate-app/" rule because we are writing a producer-side data file, not application code.

13. **No TypeScript test harness for the bundle today.** ezQuake had `packages/qw-config/tests/asset-bundle-shape.test.ts` historically; that legacy package was dissolved. Bundle-shape verification for FTE happens via quality-grid probes (Phase 2) and a bun:test smoke test under `apps/qw-oracle/tests/` if one is added — only if simple enough to fit on top of existing infra. Default: skip the TS test, rely on quality-grid + manual SQL spot-checks.

14. **Quality-grid F1 + F2 probes go in `quality-grid.ts` next to existing FTE probes.** That file already has FTE-specific count probes (cvars 2482, commands 556, etc.). Add asset-table count + anomaly probes following the same pattern.

15. **Path-1 fixtures live at `fte/tests/test_fte_asset_paths.py`.** Mirror `ezquake/tests/test_parameterized_paths.py` shape (one fixture .c file per pattern; runner asserts extracted output matches expected). FTE's interesting patterns: `R_RegisterShader(va("foo/%s", name), ...)`, `FS_OpenVFS(buf, "rb", FS_GAME)` with prior buffer write, COM_LoadFile.

16. **Conditional macros for FTE source.** The FTE clang args (set up in `extractor_lib/clang_config.py`'s `clang_args_fte_for` etc.) already define the right -D flags for the 4-variant matrix (client/server/win/client_vk). Asset handlers don't need additional macros; the 4 variants run the new handlers against all relevant TUs automatically via `walk_tu_dispatch`.

---

## Design decisions

### D1. Mirror ezQuake's two-handler shape exactly

**Decision:** Two new files at `apps/qw-oracle/scripts/extractors/fte/`: `_handler_asset_loader_sites.py` and `_handler_asset_cvar_bindings.py`. Each is a near-mirror of the corresponding `extractor_lib/handler_asset_*.py` with FTE-specific constants (LOADER_FUNCTIONS, FUNCTION_TO_CATEGORY, EXT_TO_CATEGORY, ENCLOSING_FN_CATEGORY_RULES, TRIGGER_RULES). Helper functions (format-call detection, buffer-write lookup, deref-assignment classifier) are copied verbatim.

**Why:** ezQuake's handlers were authored with project-specific constants baked in — the helper functions are project-agnostic but the constants tables are not. Refactoring to a base-class shape adds ~1.5 sessions of work and YAGNI: there's only one "different project" (FTE) being added today. If MVDSV/KTX later makes three copies painful, lift helpers into `extractor_lib/asset_helpers.py` then.

**Phase:** 1.

### D2. AST-first seed authoring

**Decision:** The loader-sites handler runs against FTE source BEFORE seeds are written. The raw extractor output (`fte-asset-loader-sites-ast.json`) becomes a research artifact that informs which categories and extensions are actually present in FTE code paths. Operator commits the research artifact (Phase 1 commit 1), then authors seeds against it (Phase 1 commit 2).

**Why:** ezQuake's seeds were authored before the AST handler shipped, leading to gaps that surfaced months later (.kmap, .qwz). FTE benefits from inverting the order. The research artifact also gives the operator a natural review checkpoint to confirm coverage assumptions before curating downstream.

**Phase:** 1 (with internal commit boundary).

### D3. Five seed YAMLs, one per concern

**Decision:** `fte-asset-categories.yaml`, `fte-asset-extensions.yaml`, `fte-asset-cvar-bindings.yaml`, `fte-asset-path-rules.yaml`, `fte-client-defaults.yaml`. Same set as ezQuake. Each is project-scoped (no shared cross-engine seed file).

**Why:** Engines are similar enough that the FILE SHAPES match (categories are categories, extensions map to categories) but the CONTENT diverges (FTE has shaders + pk4; ezQuake has .kmap + .qwz). One project = one seed set. `buildAssetBundle` already resolves `<project>-asset-*.yaml` paths; this is the existing convention, not a new one.

**Phase:** 1.

### D4. Categories — start from ezQuake's, prune + extend

**Decision:** Begin with the union of ezQuake's 24 categories. Drop those that don't apply to FTE: `kmap` (FTE has no keymap subsystem). Add FTE-specific: `shader` (R_RegisterShader output, 134 call sites), and reconsider `package` if the FTE package-manager surface justifies it (likely yes given FTE's `pkg` command). Keep `plugin` but with FTE as the owner (not the cross-engine signal it is for ezQuake).

**Why:** Most categories are engine-agnostic concepts (skin, sound, model, demo). The deltas are small and observable from source. Doing a green-field category authoring exercise from scratch wastes time we should spend on FTE-specific shapes.

**Phase:** 1 (Task 1.6).

### D5. Path-rules verifier is FTE-specific

**Decision:** Author `apps/qw-oracle/scripts/extractors/fte/asset-path-rules-verify.py` as a copy of `ezquake/asset-path-rules-verify.py` adapted to FTE's source paths (`engine/common/fs.c` etc.). The verifier reads the seed YAML, parses each `source_ref`, opens the cited file, and asserts the line falls inside the expected enclosing function.

**Why:** ezQuake's verifier hardcodes `src/fs.c` and ezQuake-specific function names (FS_AddGameDirectory etc.). FTE's filesystem source lives at different paths (`engine/common/fs.c`, `fs_pak.c`, `fs_zip.c`) and uses partly-different function names (`COM_InitFilesystem`, `FS_AddPathHandle`). Generalizing would mean threading project-specific configs through the verifier; copy-and-adapt is cheaper. ~50 lines.

**Phase:** 1 (Task 1.10).

### D6. Bundle output path follows the existing convention

**Decision:** The output of `buildAssetBundle({ project: 'fte', version: 'build-6698' })` lands at `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json`. Same directory as `ezquake-asset-bundle.json`.

**Why:** This is build-asset-bundle.ts's `DEFAULT_BUNDLE_OUTPUT_DIR`. Slipgate's loader already reads from that directory for `ezquake-asset-bundle.json`; mirror that for FTE. The file is a producer-side data artifact that does not require touching slipgate application code (and so does not violate the dispatch's "no slipgate-app code" boundary).

**Phase:** 1 (Task 1.13).

### D7. Quality-grid probes are added in Phase 2, not Phase 1

**Decision:** Phase 1 produces the bundle and reaches "load-assets succeeds" but does NOT add quality-grid probes. Phase 2 adds F1 count probes + F2 anomaly probes + Path-1 fixtures.

**Why:** The probes need real loaded data to assert against (counts, citation-presence patterns). Phase 1 must complete the load before probes can be authored against meaningful values. Splitting the probe authoring into Phase 2 keeps each phase's task list focused.

**Phase:** 2.

### D8. No `source_root` column on relation tables

**Decision:** Per spec § 2 and operator confirmation Q1, no schema delta. Plugin-side asset usage (ezhud's HUD-image loaders) is queryable today via `source_file LIKE '%plugins/ezhud/%'`. Adding a `source_root` column to `asset_loader_sites` and `asset_cvar_bindings` for symmetry with cvar/command/macro_versions is YAGNI.

**Why:** Symmetry alone isn't a reason. Add the column when a concrete query needs it.

**Phase:** N/A (explicit non-decision; recorded so future readers don't reopen the discussion).

---

## File structure

### New files (Phase 1)

```
apps/qw-oracle/scripts/extractors/fte/
├── _handler_asset_loader_sites.py        (Phase 1.2, ~700 lines mirroring extractor_lib)
├── _handler_asset_cvar_bindings.py       (Phase 1.3, ~220 lines mirroring extractor_lib)
├── asset-path-rules-verify.py            (Phase 1.10, ~50 lines mirroring ezquake)
└── seeds/
    ├── fte-asset-categories.yaml         (Phase 1.6)
    ├── fte-asset-extensions.yaml         (Phase 1.7)
    ├── fte-asset-cvar-bindings.yaml      (Phase 1.8)
    ├── fte-asset-path-rules.yaml         (Phase 1.9)
    └── fte-client-defaults.yaml          (Phase 1.11)
```

### New files (Phase 2)

```
apps/qw-oracle/scripts/extractors/fte/tests/
└── test_fte_asset_paths.py              (Phase 2.4, Path-1 fixtures + runner)

apps/slipgate-app/src/lib/config/data/
└── fte-asset-bundle.json                (Phase 1.13 generated; rebuilt Phase 2.2 via extract-tag)
```

### Modified files

```
apps/qw-oracle/scripts/extractors/fte/
├── extract.py                            (Phase 1.4: register both new handlers)
└── output/                               (auto-generated)
    ├── fte-asset-loader-sites-ast.json   (Phase 1.5 first artifact)
    ├── fte-asset-cvar-bindings-ast.json  (Phase 1.5)
    ├── fte-asset-path-rules-verified.json (Phase 1.10 verifier output)
    └── fte-reserved-subdirs.json         (Phase 1.12 derive-reserved-subdirs.ts)

apps/qw-oracle/scripts/load-knowledge/
├── extract-tag.ts                        (Phase 2.1-2.2: PROJECT_HAS_ASSET_BUNDLE.fte=true; ENTITY_JSON_FILES.fte.asset_category)
└── quality-grid.ts                       (Phase 2.3: F1+F2 probes for FTE asset tables)
```

---

## Phase 1 — AST extraction + seed authoring

Internal commit checkpoint after Task 1.5 (research artifact). Second commit after Task 1.13 (bundle assembled).

### Task 1.1: Read both ezQuake handlers thoroughly

**Files:** Read-only.
- `apps/qw-oracle/scripts/extractors/extractor_lib/handler_asset_loader_sites.py` (669 lines)
- `apps/qw-oracle/scripts/extractors/extractor_lib/handler_asset_cvar_bindings.py` (216 lines)

- [ ] **Step 1: Read both files end to end.** Note the sections:
   - constants (LOADER_FUNCTIONS, FUNCTION_TO_CATEGORY, etc.)
   - helper functions (`_concat_string_literals`, `_resolve_format_call`, `_lookup_buffer_write_in_compound`, `_unary_op_token`, `_classify_path_source`, etc.)
   - lifecycle methods (start_file, visit_cursor, end_file, finalize)

- [ ] **Step 2: Note which sections need FTE-specific constants vs verbatim copy.**
   - FTE-specific: LOADER_FUNCTIONS, FUNCTION_TO_CATEGORY, EXT_TO_CATEGORY, ENCLOSING_FN_CATEGORY_RULES, TRIGGER_RULES, GENERIC_FS_PRIMITIVES, FORMAT_FUNCTIONS, GENERIC_LITERAL_CATEGORY
   - Verbatim copy: every helper function, the Visitor class structure, finalize logic

- [ ] **Step 3: No commit, no code yet.** This task is pure context-loading.

### Task 1.2: Port `_handler_asset_loader_sites.py` to FTE

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py`

- [ ] **Step 1: Copy `extractor_lib/handler_asset_loader_sites.py` to the new path.** Bring the entire file verbatim.

- [ ] **Step 2: Replace the `LOADER_FUNCTIONS` set** (currently the ezQuake list of 13) with the FTE-verified list of 17:

```python
LOADER_FUNCTIONS: set[str] = {
    "FS_OpenVFS",
    "FS_FLocateFile",
    "FS_LoadFile",
    "FS_OpenReadLocation",
    "FS_NativePath",
    "R_RegisterShader",
    "R_LoadHiResTexture",
    "R_RegisterCustom",
    "R_RegisterPic",
    "R_LoadShader",
    "S_PrecacheSound",
    "Mod_ForName",
    "Mod_FindName",
    "COM_WriteFile",
    "COM_LoadTempFile",
    "COM_LoadFile",
    "COM_LoadStackFile",
    "TP_LoadLocFile",
}
```

- [ ] **Step 3: Replace `GENERIC_FS_PRIMITIVES`** with FTE's three generic-FS surfaces:

```python
GENERIC_FS_PRIMITIVES: set[str] = {
    "FS_OpenVFS",
    "FS_LoadFile",
    "FS_FLocateFile",
}
```

- [ ] **Step 4: Replace `FUNCTION_TO_CATEGORY`** with FTE's mapping. Targets reference `fte:asset_category:*` canonical IDs — these will exist after Task 1.6:

```python
FUNCTION_TO_CATEGORY: dict[str, str] = {
    "S_PrecacheSound":     "fte:asset_category:sound",
    "Mod_ForName":         "fte:asset_category:model",
    "Mod_FindName":        "fte:asset_category:model",
    "R_RegisterShader":    "fte:asset_category:shader",
    "R_LoadShader":        "fte:asset_category:shader",
    "R_LoadHiResTexture":  "fte:asset_category:texture",
    "R_RegisterPic":       "fte:asset_category:hud_overlay",
    "R_RegisterCustom":    "fte:asset_category:texture",
    "TP_LoadLocFile":      "fte:asset_category:locfile",
}
```

- [ ] **Step 5: Replace `EXT_TO_CATEGORY`** with FTE's extension surface (drop `.kmap`, add `.pk4`, `.shader`, `.dz`, `.xz`):

```python
EXT_TO_CATEGORY: dict[str, str] = {
    ".cfg":    "fte:asset_category:config",
    ".rc":     "fte:asset_category:config",
    ".pak":    "fte:asset_category:pak",
    ".pk3":    "fte:asset_category:pk3",
    ".pk4":    "fte:asset_category:pk3",
    ".zip":    "fte:asset_category:pk3",
    ".wad":    "fte:asset_category:wad",
    ".bsp":    "fte:asset_category:map",
    ".mdl":    "fte:asset_category:model",
    ".md3":    "fte:asset_category:model",
    ".md2":    "fte:asset_category:model",
    ".iqm":    "fte:asset_category:model",
    ".wav":    "fte:asset_category:sound",
    ".ogg":    "fte:asset_category:sound",
    ".mp3":    "fte:asset_category:sound",
    ".qwd":    "fte:asset_category:demo",
    ".mvd":    "fte:asset_category:demo",
    ".dem":    "fte:asset_category:demo",
    ".qtv":    "fte:asset_category:demo",
    ".dz":     "fte:asset_category:demo_archive",
    ".lmp":    "fte:asset_category:hud_overlay",
    ".tga":    "fte:asset_category:texture",
    ".png":    "fte:asset_category:texture",
    ".jpg":    "fte:asset_category:texture",
    ".jpeg":   "fte:asset_category:texture",
    ".pcx":    "fte:asset_category:skin",
    ".log":    "fte:asset_category:log",
    ".loc":    "fte:asset_category:locfile",
    ".lit":    "fte:asset_category:map_lighting",
    ".dat":    "fte:asset_category:quakec_progs",
    ".spr":    "fte:asset_category:sprite",
    ".shader": "fte:asset_category:shader",
    ".dll":    "fte:asset_category:plugin",
    ".so":     "fte:asset_category:plugin",
}
```

   Note: this is the INITIAL mapping. Phase 1.7's seed authoring may refine it after AST inspection. Keep these constants as the handler-side defaults; the seed can override extension→category at the bundle layer.

- [ ] **Step 6: Replace `GENERIC_LITERAL_CATEGORY`:**

```python
GENERIC_LITERAL_CATEGORY = "fte:asset_category:other"
```

- [ ] **Step 7: Replace `ENCLOSING_FN_CATEGORY_RULES`** with FTE-specific function-name regex hints. Many overlap with ezQuake; FTE adds shader-specific:

```python
ENCLOSING_FN_CATEGORY_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"Demo_File|Demo_f|PlayDemo|CL_Demo|CL_PlayDemo"), "fte:asset_category:demo"),
    (re.compile(r"SCR_ScreenShot|Image_Write|Image_Load|_LoadImage|LoadImagePixels|_WriteTGA|_WritePNG|_WriteJPEG"), "fte:asset_category:screenshot"),
    (re.compile(r"WAVCapture|_LoadSound|Sound_|S_Load"), "fte:asset_category:sound"),
    (re.compile(r"Skin_|R_LoadSkin"), "fte:asset_category:skin"),
    (re.compile(r"R_RegisterShader|Shader_|R_LoadShader"), "fte:asset_category:shader"),
    (re.compile(r"Model_|LoadModel|LoadBrushModel|Mod_LoadAlias|Mod_LoadSprite"), "fte:asset_category:model"),
    (re.compile(r"Config_|Cfg_|Exec_f|Cmd_Exec|ReadCfg|LoadConfig"), "fte:asset_category:config"),
    (re.compile(r"^FS_LoadPackFile|^COM_LoadPackFile|FS_AddPackage"), "fte:asset_category:pak"),
]
```

- [ ] **Step 8: Replace `TRIGGER_RULES`** with FTE init-function names:

```python
TRIGGER_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(Host_Init|Sys_Init|CL_Init|R_Init|S_Init|Cvar_Init|FS_Init|VID_Init|Com_Init|Con_Init|SV_Init|M_Init|Mod_Init|COM_InitFilesystem|FS_ReloadPackFiles|Sh_RegisterShader_Init)\b"), "startup"),
    (re.compile(r"_Init(?:Module(?:FS)?|Crosshairs|Conback|Charset|Filesystem|Ex|Shaders|Textures)?$"), "startup"),
    (re.compile(r"^(CL_Connect|CL_ConnectionlessPacket|CL_ParseServerData|CL_ParseServerInfo|CL_ProcessServerInfo|CL_NewTranslation|CL_ParseUpdate|Skin_Skins_f|Skin_NextDownload)\b"), "on_connect"),
    (re.compile(r"^(CL_ParseMapSetup|R_NewMap|Mod_LoadBrushModel|GL_BuildLightmaps|R_LoadSkys|R_SetSky|Sky_NewMap|R_LoadHL2Map)\b"), "on_map_load"),
]
```

- [ ] **Step 9: Helper functions and the Visitor class structure stay verbatim.** No edits below the constants block.

- [ ] **Step 10: Run typecheck / import smoke test.**

Run: `python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/fte'); from _handler_asset_loader_sites import AssetLoaderSitesHandler; h = AssetLoaderSitesHandler(); print(h.name, h.output_filename)"`

Expected: `asset_loader_sites fte-asset-loader-sites-ast.json` (or whatever the handler's `name` and `output_filename` are set to — confirm they match).

- [ ] **Step 11: Adjust `name` and `output_filename` if needed.**

The handler's `output_filename` should be `fte-asset-loader-sites-ast.json` (matches buildAssetBundle's expected `<project>-asset-loader-sites-ast.json` convention). If the verbatim copy left the ezQuake filename, change it.

   No commit yet — bundled with Task 1.3 + 1.4.

### Task 1.3: Port `_handler_asset_cvar_bindings.py` to FTE

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/_handler_asset_cvar_bindings.py`

- [ ] **Step 1: Copy `extractor_lib/handler_asset_cvar_bindings.py` to the new path.** Verbatim, including helper functions.

- [ ] **Step 2: If the file contains LOADER_FUNCTIONS or category-mapping constants that duplicate the loader-sites handler, update them to match the loader-sites handler's FTE values.**

   The ezQuake cvar-bindings handler imports / duplicates the loader watchlist for its own auto-pass. Sync with Task 1.2's lists.

- [ ] **Step 3: Update `output_filename`** to `fte-asset-cvar-bindings-ast.json`.

- [ ] **Step 4: Update any `ezquake:` canonical-id prefix literals** to `fte:` for category lookups inside the handler.

- [ ] **Step 5: Run import smoke test.**

Run: `python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/fte'); from _handler_asset_cvar_bindings import AssetCvarBindingsHandler; h = AssetCvarBindingsHandler(); print(h.name, h.output_filename)"`

Expected: `asset_cvar_bindings fte-asset-cvar-bindings-ast.json`.

   No commit yet.

### Task 1.4: Register both handlers in extract.py

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/fte/extract.py`

- [ ] **Step 1: Open `extract.py` and locate `collect_handlers()`** (roughly lines 71-90).

- [ ] **Step 2: Add the imports** to the lazy-import block:

```python
from _handler_asset_loader_sites import AssetLoaderSitesHandler
from _handler_asset_cvar_bindings import AssetCvarBindingsHandler
```

- [ ] **Step 3: Add both to the `available` dict:**

```python
available: dict = {
    "cvars": CvarsFteHandler(),
    "commands": CommandsFteHandler(),
    "macros": MacrosFteHandler(),
    "cmdline": CmdlineFteHandler(),
    "ezhud": EzhudFteHandler(),
    "ezscript": EzscriptFteHandler(),
    "asset_loader_sites": AssetLoaderSitesHandler(),
    "asset_cvar_bindings": AssetCvarBindingsHandler(),
}
```

- [ ] **Step 4: Confirm SOURCE_ROOTS is unchanged** — both new handlers run against `engine`, `plugin:ezhud`, and `plugin:ezscript` and gate themselves via path filters or visitor hooks. Do NOT add new SOURCE_ROOTS.

- [ ] **Step 5: Smoke-test the registry:**

Run: `cd apps/qw-oracle/scripts/extractors/fte && python3 extract.py --handlers asset_loader_sites,asset_cvar_bindings --workers 1 --limit-files 5`

Expected: extractor starts, processes 5 files per source root, writes empty-or-small JSON outputs to `output/`. No registration errors. (We're checking the wiring only; Task 1.5 does the full run.)

   No commit yet.

### Task 1.5: Full-source run + research artifact commit

**Files:**
- Generated: `apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json`
- Generated: `apps/qw-oracle/scripts/extractors/fte/output/fte-asset-cvar-bindings-ast.json`

- [ ] **Step 1: Confirm FTE source repo is at build-6698.**

Run: `git -C research/repos/fteqw rev-parse HEAD`

Expected: `35843773...` (full SHA matches `35843773` prefix).

- [ ] **Step 2: Run the full extractor for both new handlers.**

Run: `cd apps/qw-oracle/scripts/extractors/fte && python3 extract.py --handlers asset_loader_sites,asset_cvar_bindings --workers 1`

Expected: ~5-6 minute serial run (≈350 files × 4 variants); final summary line shows non-zero row counts for both handlers; both JSON outputs written.

- [ ] **Step 3: Sanity-check the loader-sites output.**

Run: `python3 -c "import json; d=json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json')); print('sites:', len(d.get('asset_loader_sites', d.get('sites', [])))); print('first 3:'); print(json.dumps(d.get('asset_loader_sites', d.get('sites', []))[:3], indent=2))"`

Expected: at least 200 sites (FS_OpenVFS alone has 207 call sites; even with dedup we expect 200+). Each row has `function_name`, `source_file`, `source_line`, `path_source`, `confidence`.

- [ ] **Step 4: Sanity-check the cvar-bindings output.**

Run: `python3 -c "import json; d=json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-cvar-bindings-ast.json')); print('bindings:', len(d.get('asset_cvar_bindings', d.get('bindings', []))))"`

Expected: at least 5 auto-detected bindings (more is fine; the cvar-bindings auto-pass is conservative by design).

- [ ] **Step 5: First commit — research artifact.**

```bash
git add \
  apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py \
  apps/qw-oracle/scripts/extractors/fte/_handler_asset_cvar_bindings.py \
  apps/qw-oracle/scripts/extractors/fte/extract.py \
  apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json \
  apps/qw-oracle/scripts/extractors/fte/output/fte-asset-cvar-bindings-ast.json
git commit -m "feat(qw-oracle): FTE asset AST handlers (research artifact)

Mirrors ezQuake's asset_loader_sites + asset_cvar_bindings handlers with
FTE-specific LOADER_FUNCTIONS (17 functions including R_RegisterShader,
R_LoadHiResTexture, R_RegisterCustom, R_RegisterPic, R_LoadShader),
FUNCTION_TO_CATEGORY mapping, ENCLOSING_FN_CATEGORY_RULES, and TRIGGER_RULES
covering FTE init function names.

Raw extractor output committed as research artifact before seed authoring,
per the AST-first authoring strategy (spec D2). Categories and extensions
will be curated against this output in subsequent commits.

No seed YAMLs yet; bundle assembly comes after curation."
```

### Task 1.6: Survey raw output and author `fte-asset-categories.yaml`

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-categories.yaml`

- [ ] **Step 1: Inspect category distribution in raw output.**

Run: `python3 -c "
import json
from collections import Counter
d = json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json'))
sites = d.get('asset_loader_sites', d.get('sites', []))
cats = Counter(s.get('reads_category_id') for s in sites if s.get('reads_category_id'))
for cat, n in cats.most_common():
    print(f'{n:6d}  {cat}')
"`

Expected: a histogram of categories the handler classified. Use this to confirm the seed includes every category the handler emits, and to identify any that need adding (e.g. if `fte:asset_category:shader` is absent, that's a regression — the seed and handler must agree).

- [ ] **Step 2: Author the seed.** Start from ezQuake's category list (24 entries at `apps/qw-oracle/scripts/extractors/ezquake/seeds/ezquake-asset-categories.yaml`) and adapt:

```yaml
# FTE asset categories.
#
# Each category is a first-class entity in knowledge.db (type='asset_category').
# Loaders bind cvars to these categories via asset_cvar_bindings; loader sites
# may reference them via asset_loader_sites.reads_category_id.
#
# Category `name` becomes the entity canonical_id suffix:
#   fte:asset_category:<name>
#
# Scope: FTE build-6698. These categories are version-agnostic unless a future
# version explicitly retires one (use source_state_transitions for that).
project: fte
version: build-6698
categories:
  - name: config
    display_name: "Configuration Files"
    description: "Client configuration files (.cfg, .rc) parsed by exec at startup or runtime."
  - name: charset
    display_name: "Character Set"
    description: "Bitmap or texture font used to render console and HUD text."
  - name: crosshair
    display_name: "Crosshair Image"
    description: "User-selectable crosshair overlay image."
  - name: texture
    display_name: "Texture"
    description: "World, model, HUD, or shader textures. Includes 32-bit replacements for baseline data."
  - name: shader
    display_name: "Shader"
    description: "Q3-style shader script (.shader) or runtime-registered shader. FTE-specific surface; no ezQuake counterpart."
  - name: skin
    display_name: "Player Skin"
    description: "Player model skin, loaded per-connect from userinfo."
  - name: sound
    display_name: "Sound"
    description: "Audio samples consumed by the sound engine (.wav, .ogg, .mp3)."
  - name: model
    display_name: "Model"
    description: "3D model (.mdl, .md3, .md2, .iqm, .bsp for brush-model entities)."
  - name: map
    display_name: "Map"
    description: "Level geometry (.bsp). Downloaded per-connect when absent."
  - name: wad
    display_name: "WAD Archive"
    description: "Legacy Quake asset archive (.wad) containing textures or HUD graphics."
  - name: pak
    display_name: "PAK Archive"
    description: "Original Quake pack archive (.pak). Mounted into search path at init."
  - name: pk3
    display_name: "PK3/PK4 Archive"
    description: "ZIP-based pack archive (.pk3, .pk4, .zip). Mounted into search path at init."
  - name: demo
    display_name: "Demo Recording"
    description: "Recorded game replay (.qwd, .mvd, .dem, .qtv)."
  - name: demo_archive
    display_name: "Demo Archive"
    description: "Compressed demo archive (.dz). Decoded via DZip before playback."
  - name: screenshot
    display_name: "Screenshot"
    description: "Captured screen image (.tga, .png, .jpg)."
  - name: hud_overlay
    display_name: "HUD Overlay Image"
    description: "User-configurable HUD graphic referenced by a hud_* cvar or registered via R_RegisterPic."
  - name: skybox
    display_name: "Skybox"
    description: "Six-image cubemap for the world sky, selected by r_skyname."
  - name: other
    display_name: "Other"
    description: "Files the taxonomy doesn't otherwise cover."
  - name: log
    display_name: "Log File"
    description: "Console and match logs."
  - name: locfile
    display_name: "Location File"
    description: "Team-reporting location file (.loc) keyed to a map name; used by %l macros."
  - name: map_lighting
    display_name: "Map Lighting"
    description: "Per-map colored-lighting companion (.lit) loaded alongside a .bsp."
  - name: quakec_progs
    display_name: "QuakeC Progs"
    description: "Compiled QuakeC bytecode (qwprogs.dat, spprogs.dat, mod progs.dat)."
  - name: sprite
    display_name: "Sprite"
    description: "Sprite model (.spr). Distinct from .mdl via the precache path."
  - name: plugin
    display_name: "FTE Plugin"
    description: "Native plugin DLL/SO (FTE's fteplug_*.dll family). Loaded via the plug command."
```

   Note: the `kmap` category from ezQuake is intentionally absent (FTE has no keymap subsystem). The `package` category is held back pending Phase 1.8 cvar-binding survey — if FTE's package-manager command surface produces meaningful cvar bindings, add it then.

- [ ] **Step 3: Cross-check the seed covers every `reads_category_id` emitted by the loader-sites handler.**

Run: `python3 -c "
import yaml, json
seed = yaml.safe_load(open('apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-categories.yaml'))
seed_names = {c['name'] for c in seed['categories']}
sites = json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json'))
sites = sites.get('asset_loader_sites', sites.get('sites', []))
ast_cats = {s['reads_category_id'].split(':')[-1] for s in sites if s.get('reads_category_id')}
missing = ast_cats - seed_names
print('AST-emitted categories not in seed:', missing or 'NONE')
"`

Expected: `NONE`. If anything is missing, add it to the seed.

   No commit yet.

### Task 1.7: Author `fte-asset-extensions.yaml`

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-extensions.yaml`

- [ ] **Step 1: Survey path-literal extensions in raw output.**

Run: `python3 -c "
import json, os
from collections import Counter
d = json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json'))
sites = d.get('asset_loader_sites', d.get('sites', []))
exts = Counter()
for s in sites:
    p = s.get('path_literal') or ''
    if p:
        _, ext = os.path.splitext(p)
        if ext:
            exts[ext.lower()] += 1
for ext, n in exts.most_common(40):
    print(f'{n:6d}  {ext}')
"`

Expected: a histogram of file extensions actually appearing in literal-arg loader call sites. Use this to size the extension seed.

- [ ] **Step 2: Author the seed.** Mirror ezQuake's structure (path_hint disambiguation for .tga/.png/.jpg/.pcx) and add FTE-specific extensions:

```yaml
# FTE file-extension -> category mapping.
#
# (project, version, extension, path_hint) is the natural key. path_hint is the
# directory prefix that disambiguates multi-purpose extensions such as .tga and
# .pcx. Rule: longest-matching path_hint wins; fall back to the unqualified row.
#
# Scope: FTE build-6698.
project: fte
version: build-6698
extensions:
  - extension: ".cfg"
    category: config
  - extension: ".rc"
    category: config
  - extension: ".pak"
    category: pak
  - extension: ".pk3"
    category: pk3
  - extension: ".pk4"
    category: pk3
  - extension: ".zip"
    category: pk3
  - extension: ".wad"
    category: wad
  - extension: ".bsp"
    category: map
  - extension: ".mdl"
    category: model
  - extension: ".md3"
    category: model
  - extension: ".md2"
    category: model
  - extension: ".iqm"
    category: model
  - extension: ".wav"
    category: sound
  - extension: ".ogg"
    category: sound
  - extension: ".mp3"
    category: sound
  - extension: ".qwd"
    category: demo
  - extension: ".mvd"
    category: demo
  - extension: ".dem"
    category: demo
  - extension: ".qtv"
    category: demo
  - extension: ".dz"
    category: demo_archive
  - extension: ".shader"
    category: shader
  # Texture-variant extensions disambiguate via path_hint.
  - extension: ".tga"
    path_hint: "textures/"
    category: texture
  - extension: ".tga"
    path_hint: "skins/"
    category: skin
  - extension: ".tga"
    path_hint: "crosshairs/"
    category: crosshair
  - extension: ".tga"
    path_hint: "gfx/"
    category: hud_overlay
  - extension: ".tga"
    path_hint: "env/"
    category: skybox
  - extension: ".tga"
    category: screenshot
  - extension: ".png"
    path_hint: "textures/"
    category: texture
  - extension: ".png"
    path_hint: "skins/"
    category: skin
  - extension: ".png"
    path_hint: "crosshairs/"
    category: crosshair
  - extension: ".png"
    path_hint: "gfx/"
    category: hud_overlay
  - extension: ".png"
    path_hint: "env/"
    category: skybox
  - extension: ".png"
    category: screenshot
  - extension: ".jpg"
    path_hint: "textures/"
    category: texture
  - extension: ".jpg"
    path_hint: "skins/"
    category: skin
  - extension: ".jpg"
    path_hint: "crosshairs/"
    category: crosshair
  - extension: ".jpg"
    path_hint: "gfx/"
    category: hud_overlay
  - extension: ".jpg"
    path_hint: "env/"
    category: skybox
  - extension: ".jpg"
    category: screenshot
  - extension: ".jpeg"
    category: screenshot
  - extension: ".pcx"
    path_hint: "skins/"
    category: skin
  - extension: ".pcx"
    path_hint: "gfx/"
    category: charset
  - extension: ".lmp"
    category: hud_overlay
  - extension: ".log"
    category: log
  - extension: ".loc"
    category: locfile
  - extension: ".lit"
    category: map_lighting
  - extension: ".dat"
    category: quakec_progs
  - extension: ".spr"
    category: sprite
  - extension: ".dll"
    category: plugin
  - extension: ".so"
    category: plugin
```

- [ ] **Step 3: Cross-check the seed covers every extension observed in the raw output.**

Run: same survey command from Step 1, compare against seed list. Anything emitted by the AST that isn't in the seed gets stamped `verification_status: orphaned_historical` if intentional, or added if a real gap.

   No commit yet.

### Task 1.8: Survey FTE source for cvar-binding candidates and author `fte-asset-cvar-bindings.yaml`

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-cvar-bindings.yaml`

- [ ] **Step 1: List FTE cvars whose names match asset-related patterns.**

Run: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT e.name FROM entities e WHERE e.project='fte' AND e.type='cvar' AND (e.name LIKE 'r_sky%' OR e.name LIKE '%skin%' OR e.name LIKE 'gl_consolefont%' OR e.name LIKE 'gl_font%' OR e.name LIKE 'crosshair%' OR e.name LIKE '%demo_dir%' OR e.name LIKE 'r_load%' OR e.name LIKE 'gl_load%' OR e.name LIKE 'cl_screenshot%' OR e.name LIKE 'shader_%' OR e.name LIKE 'gl_picmip%') ORDER BY e.name"`

Expected: ~30-50 candidate cvars. Eyeball each for asset-binding semantics.

- [ ] **Step 2: Inspect auto-bindings the cvar-bindings handler already detected.**

Run: `python3 -c "
import json
d = json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-cvar-bindings-ast.json'))
binds = d.get('asset_cvar_bindings', d.get('bindings', []))
for b in binds:
    print(b.get('cvar_canonical_id'), '->', b.get('category_id'), '|', b.get('confidence'))
"`

Expected: a list of auto-detected bindings with `confidence: 'auto'` or `'auto_confirms_seed'`. Use these as starting points for the seed.

- [ ] **Step 3: Author the seed.** Use ezQuake's seed (`ezquake-asset-cvar-bindings.yaml`) as a template; map equivalent FTE cvar names. Many overlap (skin family, skybox, demo_dir); some FTE-specific (shader_*, gl_picmip context).

   Author 20-40 hand-curated entries. Each must have:
   - `cvar:` (FTE cvar name; loader rejects stale references)
   - `category:` (must exist in fte-asset-categories.yaml)
   - `path_pattern:` (templated path, with `{value}` placeholder; optional for cvars whose value is a directory)
   - `load_trigger:` (startup / on_connect / on_map_load / on_demand)
   - `source_ref:` (file:line citation in FTE source)
   - `notes:` (optional explanation)

   Example entries:

```yaml
project: fte
version: build-6698
cvar_bindings:

  - cvar: baseskin
    category: skin
    path_pattern: "skins/{value}.pcx"
    load_trigger: on_connect
    source_ref: "engine/client/skin.c:?"
    notes: "FTE-side equivalent of ezQuake's baseskin; verify line via grep."

  - cvar: r_skyname
    category: skybox
    path_pattern: "env/{value}_{face}.tga"
    load_trigger: on_map_load
    source_ref: "engine/client/r_part.c:?"
    notes: "Engine searches both env/ and gfx/env/. Face in {ft,bk,lf,rt,up,dn}."

  # ... more entries authored from FTE source survey
```

   Source-ref `?` placeholders are NOT acceptable in the final seed. Run `grep -nrE 'Cvar_(Get|Register|FindOrGet)\("baseskin' research/repos/fteqw/engine/` etc. to resolve each citation.

- [ ] **Step 4: Cross-check every `cvar:` resolves to a real entity.**

Run: `python3 -c "
import yaml, sqlite3
seed = yaml.safe_load(open('apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-cvar-bindings.yaml'))
db = sqlite3.connect('apps/qw-oracle/data/knowledge.db')
missing = []
for b in seed.get('cvar_bindings', []):
    name = b['cvar']
    row = db.execute(\"SELECT name FROM entities WHERE project='fte' AND type='cvar' AND name=?\", (name.lower(),)).fetchone()
    if not row:
        missing.append(name)
print('Missing FTE cvar entities:', missing or 'NONE')
"`

Expected: `NONE`. If any are missing, either fix the cvar name or remove the binding (the cvar may not exist in build-6698).

   No commit yet.

### Task 1.9: Author `fte-asset-path-rules.yaml`

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-path-rules.yaml`

- [ ] **Step 1: Read FTE's filesystem source.**

Read these files end-to-end:
- `research/repos/fteqw/engine/common/fs.c` (~5000 lines; focus on `COM_InitFilesystem`, `FS_AddGameDirectory`, `FS_AddPathHandle`, `COM_Gamedir`)
- `research/repos/fteqw/engine/common/fs_pak.c` (~600 lines; pak archive loader)
- `research/repos/fteqw/engine/common/fs_zip.c` (~600 lines; pk3/pk4 loader)

   Goal: identify ~10 ordered behaviors covering search_path, archive_precedence, gamedir_behavior, cmdline_override.

- [ ] **Step 2: Author the seed.** Mirror ezQuake's structure at `ezquake-asset-path-rules.yaml`. Each entry has a unique `canonical_id`, `rule_kind`, `ordinal` (within kind), `description`, `source_ref` (file:line in FTE source).

   Cover these rule kinds:

   **search_path** (3-4 rules):
   - id1/qw/<game> base stack ordering (search-path LIFO behavior)
   - User home directory mounting
   - Cache subdirectory handling (FTE-specific)

   **archive_precedence** (4-5 rules):
   - pak0..pakN ascending load with LIFO precedence (so paknN > pak(N-1))
   - pk4 > pk3 > pak load order
   - Numbered archives load before wildcards
   - Archives override loose files in same dir
   - Conditional pak.lst override (if FTE supports it; verify)

   **gamedir_behavior** (2 rules):
   - Gamedir switch unwinds to base stack
   - Gamedir fallthrough to qw/id1

   **cmdline_override** (3-4 rules):
   - `-basedir <path>` overrides com_basedir
   - `-game <mod>` / `+gamedir <mod>` mounts a mod at startup
   - `-fs_basepath` (if used in FTE)
   - `-quake` (FTE-specific; mounts the QW game)

   Each `source_ref` must cite a real line in the named file. Use grep to verify before committing.

   Example entry:

```yaml
- canonical_id: fte:path_rule:fte_id1_qw_base_stack
  rule_kind: search_path
  ordinal: 1
  description: >
    At startup COM_InitFilesystem mounts id1/, then qw/, then the user's
    home directory if set. Each is pushed onto fs_searchpaths via
    FS_AddPathHandle, which inserts at the head of the list — so the
    effective lookup order is homedir > qw > id1.
  source_ref: "engine/common/fs.c:????"
```

   Replace every `????` with a real line number resolved via `grep -n` before committing. Operator-mandated check: zero `????` placeholders in the committed file.

   No commit yet.

### Task 1.10: Port the path-rules verifier to FTE

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/asset-path-rules-verify.py`

- [ ] **Step 1: Copy `apps/qw-oracle/scripts/extractors/ezquake/asset-path-rules-verify.py` to the new path.**

- [ ] **Step 2: Adjust default repo path** to FTE's repo: replace `research/repos/ezquake-source` references with `research/repos/fteqw`.

- [ ] **Step 3: Adjust default seed path** to point at `fte/seeds/fte-asset-path-rules.yaml` and default output path to `fte/output/fte-asset-path-rules-verified.json`.

- [ ] **Step 4: Run the verifier.**

Run: `python3 apps/qw-oracle/scripts/extractors/fte/asset-path-rules-verify.py`

Expected: writes `apps/qw-oracle/scripts/extractors/fte/output/fte-asset-path-rules-verified.json`. The output is the seed augmented with `verified_function_name` and `verified_function_fingerprint` for each row whose `source_ref` resolved cleanly. Rows with bad source_refs get `source_verified: 0`.

- [ ] **Step 5: Inspect for unverified rows.**

Run: `python3 -c "
import json
d = json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-path-rules-verified.json'))
unverified = [r for r in d.get('path_rules', []) if r.get('source_verified') != 1]
for r in unverified:
    print(r['canonical_id'], '|', r.get('source_ref'), '|', r.get('verification_notes'))
"`

Expected: empty list (every rule verified). If any rows are unverified, fix the seed's `source_ref` and re-run the verifier.

   No commit yet.

### Task 1.11: Author `fte-client-defaults.yaml`

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/seeds/fte-client-defaults.yaml`

- [ ] **Step 1: Look up FTE's client conventions.** Grep FTE source for:
   - Screenshot filename prefix: `grep -rn 'cl_screenshotname\|sshot_format\|SCR_ScreenShot' research/repos/fteqw/engine/client/ | head -20`
   - Screenshot dir name: search for `"screenshots"` and `"sshots"` literals in same files
   - Demo extensions: confirmed `.qwd`, `.mvd`, `.dem`, `.qtv` from earlier grep — verify which is FTE's default
   - Log extension: standard `.log`
   - Match-format cvars: FTE may not have `match_format_*` family — verify with `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name FROM entities WHERE project='fte' AND type='cvar' AND name LIKE 'match_%'"`. Likely empty.
   - Owned gamedirs: FTE's primary gamedir is `qw` (no `fte` gamedir typically — confirm)

- [ ] **Step 2: Author the seed.**

```yaml
# FTE client-level conventions consumed by slipgate's scanner to classify
# files that are engine-behavior-derived rather than loader-call derived.
# Values reflect FTE build-6698 as of 2026-04-26.

client_defaults:
  screenshot_filename_prefixes:
    - fte
    - quake  # FTE supports configurable prefix; 'quake' is the historical default
  screenshot_dir_names:
    - screenshots
  demo_extensions:
    - .dem
    - .qwd
    - .mvd
    - .qtv
    - .dz
  default_demo_ext: .qwd
  image_extensions:
    - .png
    - .jpg
    - .jpeg
    - .tga
    - .pcx
  log_extensions:
    - .log
  match_format_cvars: []  # FTE has no match_format_* family; confirmed empty
  owned_gamedirs:
    - qw
```

   Adjust values per Step 1's grep findings. Empty arrays are valid YAML (`[]`).

   No commit yet.

### Task 1.12: Run derive-reserved-subdirs (if applicable)

**Files:**
- Generated: `apps/qw-oracle/scripts/extractors/fte/output/fte-reserved-subdirs.json`

- [ ] **Step 1: Check if the shared derive-reserved-subdirs.ts is project-parameterized.**

Run: `grep -n 'project\|fte\|ezquake' apps/qw-oracle/scripts/extractors/shared/derive-reserved-subdirs.ts | head -20`

Expected: it takes `--project` argument or scans per-project files. If hardcoded to ezQuake, this step is a no-op for FTE Phase 1 — the bundle build accepts the absence of this file (it's optional in `build-asset-bundle.ts:252`).

- [ ] **Step 2: If parameterized, run for FTE:**

Run: `npx tsx apps/qw-oracle/scripts/extractors/shared/derive-reserved-subdirs.ts --project fte --version build-6698`

Expected: writes `fte-reserved-subdirs.json`. If the script doesn't accept `--project`, skip; bundle assembly will tolerate the missing file.

   No commit yet.

### Task 1.13: Build the FTE asset bundle and second commit

**Files:**
- Generated: `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json`

- [ ] **Step 1: Run buildAssetBundle for FTE.**

Run: `cd apps/qw-oracle && npx tsx scripts/load-knowledge/build-asset-bundle.ts --project fte --version build-6698`

Expected: writes `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json`. Stdout reports counts: categories N, extensions N, path_rules N, cvar_bindings N (auto + seed merged), loader_sites N.

- [ ] **Step 2: Sanity-check bundle shape.**

Run: `python3 -c "
import json
b = json.load(open('apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json'))
print('project:', b.get('project'))
print('version:', b.get('version'))
print('categories:', len(b.get('asset_categories', {})))
print('extensions:', len(b.get('asset_extensions', [])))
print('path_rules:', len(b.get('asset_path_rules', [])))
print('cvar_bindings:', len(b.get('asset_cvar_bindings', [])))
print('loader_sites:', len(b.get('asset_loader_sites', [])))
print('client_defaults present:', b.get('client_defaults') is not None)
"`

Expected: project=fte, version=build-6698, all counts non-zero, client_defaults present.

- [ ] **Step 3: Second commit — seeds + bundle.**

```bash
git add \
  apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-categories.yaml \
  apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-extensions.yaml \
  apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-cvar-bindings.yaml \
  apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-path-rules.yaml \
  apps/qw-oracle/scripts/extractors/fte/seeds/fte-client-defaults.yaml \
  apps/qw-oracle/scripts/extractors/fte/asset-path-rules-verify.py \
  apps/qw-oracle/scripts/extractors/fte/output/fte-asset-path-rules-verified.json \
  apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json
git commit -m "feat(qw-oracle): FTE asset seeds + bundle (Phase 2d-bundle.1 complete)

Five hand-authored seed YAMLs at fte/seeds/ covering categories, extensions,
path-rules, cvar-bindings, and client-defaults. Path-rules verifier ports
ezQuake's verifier with FTE-specific source paths.

buildAssetBundle reconciles seeds + AST outputs into
apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json. Bundle is the
producer-side output ezQuake already established; no slipgate code touched.

Phase 2 (extract-tag wiring + quality-grid probes + Path-1 fixtures) follows."
```

   If `fte/output/fte-reserved-subdirs.json` was generated in Task 1.12, add it to the same commit.

---

## Phase 2 — Loader integration + verification

### Task 2.1: Wire FTE asset bundle into extract-tag

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`

- [ ] **Step 1: Set `PROJECT_HAS_ASSET_BUNDLE.fte = true`.**

Locate the `PROJECT_HAS_ASSET_BUNDLE` const (around line 90). Change:

```typescript
const PROJECT_HAS_ASSET_BUNDLE: Record<Project, boolean> = {
  ezquake: true,
  fte:     false,    // <-- before
  mvdsv:   false,
  ktx:     false,
  qwcl:    false,
};
```

To:

```typescript
const PROJECT_HAS_ASSET_BUNDLE: Record<Project, boolean> = {
  ezquake: true,
  fte:     true,     // <-- after
  mvdsv:   false,
  ktx:     false,
  qwcl:    false,
};
```

- [ ] **Step 2: Add asset_category to ENTITY_JSON_FILES.fte.**

Locate `ENTITY_JSON_FILES.fte` (sub-thread #3 wired the other types). Add the asset_category line:

```typescript
fte: {
  cvar:           'fte-variables-ast.json',
  command:        'fte-commands-ast.json',
  macro:          'fte-macros-ast.json',
  cmdline_param:  'fte-cmdline-params-ast.json',
  cvar_alias:     'fte-aliases-ast.json',
  asset_category: 'fte-asset-bundle.json',  // <-- new
},
```

- [ ] **Step 3: Add FTE to the LEGACY_EXTRACTORS_FTE block** if it doesn't exist.

If the extract-tag flow runs project-specific legacy extractors (path-rules-verify is one), add an `LEGACY_EXTRACTORS_FTE` array mirroring `LEGACY_EXTRACTORS_EZQUAKE`:

```typescript
const LEGACY_EXTRACTORS_FTE: ReadonlyArray<{ script: string; output: string }> = [
  { script: 'asset-path-rules-verify.py', output: 'fte-asset-path-rules-verified.json' },
];
```

   And a corresponding loop after the main extractor invocation, gated `if (options.project === 'fte')`. If extract-tag's existing structure already handles per-project legacy scripts via a single dispatch table, slot the FTE entry in there instead.

- [ ] **Step 4: Wire the asset bundle build.** Find the existing `if (hasAssetBundle) buildAssetBundle({ project, version })` call (around line 259). Confirm it does NOT need changes — `hasAssetBundle` is the flag we just flipped, so the call fires automatically for FTE now.

- [ ] **Step 5: Typecheck.**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`

Expected: clean.

- [ ] **Step 6: No commit yet** — bundled with Task 2.2's verification run.

### Task 2.2: Run extract-tag end-to-end for FTE@build-6698

**Files:** None modified; this is a verification + smoke step.

- [ ] **Step 1: Run extract-tag for FTE.**

Run: `cd apps/qw-oracle && npm run load-knowledge -- extract-tag --project fte --version build-6698 --ordinal 6698`

Expected: ~5-7 minute end-to-end run. Output should show:
- git checkout build-6698 (already there; no-op)
- Python unified extractor runs all 8 handlers
- Legacy extractor (path-rules-verify) runs
- buildAssetBundle reconciles seeds + AST
- loadVersion runs for cvar / command / macro / cmdline_param / cvar_alias / asset_category
- loadAssets runs for asset_extensions / asset_path_rules / asset_cvar_bindings / asset_loader_sites

- [ ] **Step 2: Confirm asset rows landed in the DB.**

Run: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT 'asset_extensions', COUNT(*) FROM asset_extensions WHERE project='fte' UNION ALL SELECT 'asset_path_rules', COUNT(*) FROM asset_path_rules WHERE project='fte' UNION ALL SELECT 'asset_cvar_bindings', COUNT(*) FROM asset_cvar_bindings WHERE project='fte' UNION ALL SELECT 'asset_loader_sites', COUNT(*) FROM asset_loader_sites WHERE project='fte' UNION ALL SELECT 'asset_categories (entity)', COUNT(*) FROM entities WHERE project='fte' AND type='asset_category'"`

Expected (rough order-of-magnitude):
- asset_extensions: 30+
- asset_path_rules: 8-12
- asset_cvar_bindings: 20+
- asset_loader_sites: 200+
- asset_categories: 22-24

- [ ] **Step 3: No commit yet** — bundled with Task 2.3.

### Task 2.3: Add FTE asset quality-grid probes

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`

- [ ] **Step 1: Read the existing FTE F1+F2 probe block** to match the existing pattern. Locate the FTE-specific probes (`F1.fte.cvars_count`, etc.).

- [ ] **Step 2: Add F1 count probes for FTE asset tables** following the same pattern as ezQuake's asset probes. Concrete probe names + expected ranges (use Task 2.2's actual counts to size; minimum thresholds shown):

```typescript
// In the F1 probe registration block:
{ name: 'F1.fte.asset_categories_count',
  family: 'regression',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='asset_category'").get() as { n: number },
  expect: ({ n }) => n >= 20 && n <= 30,
  message: ({ n }) => `${n} fte asset_category entities (in range)` },

{ name: 'F1.fte.asset_extensions_count',
  family: 'regression',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM asset_extensions WHERE project='fte'").get() as { n: number },
  expect: ({ n }) => n >= 25 && n <= 80,
  message: ({ n }) => `${n} fte asset_extensions (in range)` },

{ name: 'F1.fte.asset_path_rules_count',
  family: 'regression',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM asset_path_rules WHERE project='fte'").get() as { n: number },
  expect: ({ n }) => n >= 8 && n <= 25,
  message: ({ n }) => `${n} fte asset_path_rules (in range)` },

{ name: 'F1.fte.asset_cvar_bindings_count',
  family: 'regression',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM asset_cvar_bindings WHERE project='fte'").get() as { n: number },
  expect: ({ n }) => n >= 15 && n <= 80,
  message: ({ n }) => `${n} fte asset_cvar_bindings (in range)` },

{ name: 'F1.fte.asset_loader_sites_count',
  family: 'regression',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM asset_loader_sites WHERE project='fte'").get() as { n: number },
  expect: ({ n }) => n >= 200 && n <= 1500,
  message: ({ n }) => `${n} fte asset_loader_sites (in range)` },
```

   Adjust the `expect` ranges using Task 2.2's actual measured counts as the lower bound; widen the upper bound to allow ~2x growth. The exact numbers you set are part of the regression contract.

- [ ] **Step 3: Add F2 anomaly probes for FTE asset tables.**

```typescript
// In the F2 probe registration block:
{ name: 'F2.fte.loader_sites_have_source_file',
  family: 'anomaly',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM asset_loader_sites WHERE project='fte' AND (source_file IS NULL OR source_file = '')").get() as { n: number },
  expect: ({ n }) => n === 0,
  message: ({ n }) => n === 0 ? 'all fte loader sites have source_file' : `${n} fte loader sites missing source_file` },

{ name: 'F2.fte.path_rules_all_verified',
  family: 'anomaly',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM asset_path_rules WHERE project='fte' AND source_verified = 0").get() as { n: number },
  expect: ({ n }) => n === 0,
  message: ({ n }) => n === 0 ? 'all fte path_rules verified' : `${n} fte path_rules unverified` },

{ name: 'F2.fte.cvar_bindings_resolve',
  family: 'anomaly',
  query: db => db.prepare(`
    SELECT COUNT(*) AS n FROM asset_cvar_bindings ab
    LEFT JOIN entities e ON e.canonical_id = ab.cvar_canonical_id
    WHERE ab.project = 'fte' AND e.id IS NULL
  `).get() as { n: number },
  expect: ({ n }) => n === 0,
  message: ({ n }) => n === 0 ? 'all fte cvar_bindings resolve to a real cvar entity' : `${n} fte cvar_bindings reference missing cvars` },

{ name: 'F2.fte.shader_loader_sites_present',
  family: 'anomaly',
  query: db => db.prepare("SELECT COUNT(*) AS n FROM asset_loader_sites WHERE project='fte' AND function_name IN ('R_RegisterShader','R_LoadShader')").get() as { n: number },
  expect: ({ n }) => n >= 80,
  message: ({ n }) => `${n} fte shader-registration loader sites (expected >=80)` },
```

- [ ] **Step 4: Run the quality grid.**

Run: `cd apps/qw-oracle && npm run load-knowledge -- quality-grid --project fte`

Expected: all probes PASS / CLEAN. Existing 21 probes + 9 new = 30/30 clean for FTE. Adjust ranges if any new probe fails on the actual data.

- [ ] **Step 5: No commit yet** — bundled with Task 2.4.

### Task 2.4: Author Path-1 fixtures for FTE patterns

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/tests/test_fte_asset_paths.py`
- Create: `apps/qw-oracle/scripts/extractors/fte/tests/fixtures/fte_paths/01_register_shader_va/main.c`
- Create: `apps/qw-oracle/scripts/extractors/fte/tests/fixtures/fte_paths/02_fs_openvfs_buffer/main.c`
- Create: `apps/qw-oracle/scripts/extractors/fte/tests/fixtures/fte_paths/03_com_loadfile_literal/main.c`

- [ ] **Step 1: Read the existing ezQuake fixture suite** at `apps/qw-oracle/scripts/extractors/ezquake/tests/test_parameterized_paths.py` and `apps/qw-oracle/scripts/extractors/ezquake/tests/fixtures/param_paths/01..08/`. Note the structure: each fixture is a tiny .c file, the runner parses it via libclang, runs the asset_loader_sites handler, asserts on the extracted output.

- [ ] **Step 2: Author fixture 01 — R_RegisterShader with va().**

Create `tests/fixtures/fte_paths/01_register_shader_va/main.c`:

```c
// Fixture: R_RegisterShader called via va() with map-name template.
typedef struct shader_s shader_t;
typedef enum { SHADER_2D, SHADER_3D } shadertype_t;
shader_t *R_RegisterShader(const char *name, shadertype_t type, const char *body);
char *va(const char *fmt, ...);

void R_LoadMap(const char *mapname) {
    R_RegisterShader(va("textures/%s/baseshader", mapname), SHADER_3D, 0);
}
```

   Expected extraction: one site with `function_name=R_RegisterShader`, `path_template="textures/{0}/baseshader"`, `path_extension=null`, `path_parameters=[{slot:0, semantic:"current_map_name"}]`.

- [ ] **Step 3: Author fixture 02 — FS_OpenVFS with buffer write.**

Create `tests/fixtures/fte_paths/02_fs_openvfs_buffer/main.c`:

```c
// Fixture: buffer written by Q_snprintfz, then FS_OpenVFS(buf, ...).
typedef struct vfsfile_s vfsfile_t;
vfsfile_t *FS_OpenVFS(const char *filename, const char *mode, int relativeto);
int Q_snprintfz(char *dest, int size, const char *fmt, ...);

void FS_LoadCustomFile(const char *userpath) {
    char path[256];
    Q_snprintfz(path, sizeof(path), "users/%s/config.cfg", userpath);
    FS_OpenVFS(path, "rb", 1);
}
```

   Expected extraction: one site with `function_name=FS_OpenVFS`, `path_template="users/{0}/config.cfg"`, `path_extension=".cfg"`, `path_parameters=[{slot:0, semantic:"function_parameter"}]`.

- [ ] **Step 4: Author fixture 03 — COM_LoadFile with literal.**

Create `tests/fixtures/fte_paths/03_com_loadfile_literal/main.c`:

```c
// Fixture: COM_LoadFile with bare string literal.
unsigned char *COM_LoadFile(const char *path, int usehunk);

void Init_CharsetIndex(void) {
    COM_LoadFile("gfx/charset.png", 0);
}
```

   Expected extraction: one site with `function_name=COM_LoadFile`, `path_source="literal"`, `path_literal="gfx/charset.png"`, `reads_category_id="fte:asset_category:charset"` or `:texture` depending on EXT_TO_CATEGORY priority. (The handler's path_hint for `gfx/` prefix → charset; this fixture is the regression for that classification.)

- [ ] **Step 5: Author the test runner.**

Create `tests/test_fte_asset_paths.py`. Mirror ezQuake's `test_parameterized_paths.py`:

```python
"""Path-1 structured-extraction fixtures for FTE.

Runs the asset_loader_sites handler against tiny .c fixtures and asserts on
the extracted output. Each fixture exercises one extraction pattern; see
tests/fixtures/fte_paths/ for the .c sources.

Prints PASS or FAIL per fixture. Exit code: 0 on all PASS, 1 otherwise.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent))                   # extractors/
sys.path.insert(0, str(HERE.parent))                          # extractors/fte/

from clang.cindex import Config, Index
Config.set_library_file("libclang-18.so.1")

from extractor_lib.clang_config import PARSE_OPTS, clang_args_fte_for
from extractor_lib._visitor import walk_tu_dispatch
from _handler_asset_loader_sites import AssetLoaderSitesHandler

# HERE = tests/ -> fte/ -> extractors/ -> scripts/ -> qw-oracle/ -> apps/ -> quakeworld/
MONOREPO_ROOT = HERE.parent.parent.parent.parent.parent.parent
FTE_REPO_ROOT = MONOREPO_ROOT / "research" / "repos" / "fteqw"
FIXTURES_DIR = HERE / "fixtures" / "fte_paths"

EXPECTATIONS = {
    "01_register_shader_va": {
        "function_name": "R_RegisterShader",
        "path_template": "textures/{0}/baseshader",
    },
    "02_fs_openvfs_buffer": {
        "function_name": "FS_OpenVFS",
        "path_template": "users/{0}/config.cfg",
        "path_extension": ".cfg",
    },
    "03_com_loadfile_literal": {
        "function_name": "COM_LoadFile",
        "path_source": "literal",
        "path_literal": "gfx/charset.png",
    },
}


def run_one(name: str, expected: dict) -> bool:
    fixture_path = FIXTURES_DIR / name / "main.c"
    handler = AssetLoaderSitesHandler()
    handler.start_file(source_path=fixture_path, source_bytes=fixture_path.read_bytes())
    idx = Index.create()
    args = clang_args_fte_for(str(FTE_REPO_ROOT))
    tu = idx.parse(str(fixture_path), args=args, options=PARSE_OPTS)
    walk_tu_dispatch(tu, [handler], "client", str(fixture_path), source_root="engine")
    rows = handler.end_file()
    output = handler.finalize(all_rows=rows, repo_root=FTE_REPO_ROOT)
    sites = output.get("asset_loader_sites", output.get("sites", []))

    if not sites:
        print(f"  [{name}] FAIL: no sites extracted")
        return False
    site = sites[0]
    for key, val in expected.items():
        if site.get(key) != val:
            print(f"  [{name}] FAIL: expected {key}={val!r} got {site.get(key)!r}")
            return False
    print(f"  [{name}] PASS")
    return True


if __name__ == "__main__":
    results = []
    for name, expected in EXPECTATIONS.items():
        results.append(run_one(name, expected))
    if all(results):
        print(f"\n{len(results)} PASS")
        sys.exit(0)
    fail = sum(1 for r in results if not r)
    print(f"\n{fail} FAIL / {len(results)} total")
    sys.exit(1)
```

- [ ] **Step 6: Run the fixture suite.**

Run: `python3 apps/qw-oracle/scripts/extractors/fte/tests/test_fte_asset_paths.py`

Expected: `3 PASS` and exit code 0. If any fail, fix the handler or the fixture (whichever is wrong) and re-run.

- [ ] **Step 7: No commit yet** — bundled with Task 2.5.

### Task 2.5: Cross-engine consistency check

**Files:** None modified; verification only.

- [ ] **Step 1: Confirm the skin family resolves consistently across ezQuake and FTE.**

Run: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT ab.project, ab.cvar_canonical_id, ab.category_id FROM asset_cvar_bindings ab WHERE (ab.cvar_canonical_id LIKE '%:cvar:baseskin' OR ab.cvar_canonical_id LIKE '%:cvar:teamskin' OR ab.cvar_canonical_id LIKE '%:cvar:enemyskin') AND ab.category_id LIKE '%:skin' ORDER BY ab.project, ab.cvar_canonical_id"`

Expected: 6 rows — 3 ezQuake (baseskin/teamskin/enemyskin → ezquake:asset_category:skin) and 3 FTE (same names → fte:asset_category:skin). If FTE doesn't have one of these as a binding, that's an authoring miss in Task 1.8 — go fix the seed and re-run buildAssetBundle.

- [ ] **Step 2: Confirm shader sites are FTE-exclusive.**

Run: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT project, COUNT(*) FROM asset_loader_sites WHERE function_name IN ('R_RegisterShader','R_LoadShader') GROUP BY project"`

Expected: only `fte` rows (ezQuake has no shaders). Count >= 80 (matches Task 2.3's F2.fte.shader_loader_sites_present probe).

### Task 2.6: Final commit

**Files:** All Phase 2 modifications.

- [ ] **Step 1: Confirm git status shows the expected diff.**

Run: `git status --short`

Expected: M extract-tag.ts, M quality-grid.ts, ?? tests/test_fte_asset_paths.py, ?? tests/fixtures/fte_paths/...

- [ ] **Step 2: Commit Phase 2 changes.**

```bash
git add \
  apps/qw-oracle/scripts/load-knowledge/extract-tag.ts \
  apps/qw-oracle/scripts/load-knowledge/quality-grid.ts \
  apps/qw-oracle/scripts/extractors/fte/tests/
git commit -m "feat(qw-oracle): wire FTE asset bundle through extract-tag (Phase 2d-bundle.2)

PROJECT_HAS_ASSET_BUNDLE.fte=true; ENTITY_JSON_FILES.fte.asset_category
points at fte-asset-bundle.json. extract-tag now runs the full FTE flow
end-to-end: unified extractor (8 handlers) + path-rules verifier +
buildAssetBundle + per-type loaders + asset relations.

Quality-grid probes added: 5 F1 count probes + 4 F2 anomaly probes for FTE
asset tables. Path-1 fixtures at fte/tests/test_fte_asset_paths.py cover
R_RegisterShader / FS_OpenVFS / COM_LoadFile patterns (3 PASS).

Cross-engine spot-check confirms skin family resolves to skin category in
both ezQuake and FTE bundles; shader loader sites are FTE-exclusive."
```

- [ ] **Step 3: Update HANDOVER.md.**

Find the "Phase 2d-2h: remaining QW knowledge rollout" entry in `HANDOVER.md`. Add a line under "Updated:" marking 2d-bundle as shipped, with concrete counts: asset_extensions N, asset_path_rules N, asset_cvar_bindings N, asset_loader_sites N, asset_categories N. Mention the quality-grid grew to 30 probes for FTE. Mark 2d-bundle as fully closed; flag 2e (MVDSV+KTX) as the next target.

```bash
git add HANDOVER.md
git commit -m "docs(handover): mark Phase 2d-bundle shipped"
```

---

## Verification protocol summary

After Phase 2 completes, the following layers all hold:

1. **End-to-end run:** `extract-tag --project fte --version build-6698` succeeds without errors.
2. **Per-table counts:** asset_categories ~22-24, asset_extensions ~30+, asset_path_rules ~8-12, asset_cvar_bindings ~20+, asset_loader_sites ~200+.
3. **Quality grid:** 30/30 probes PASS / CLEAN for FTE.
4. **Path-1 fixtures:** `python3 fte/tests/test_fte_asset_paths.py` reports 3 PASS.
5. **Cross-engine consistency:** skin family resolves to `:skin` category in both projects; shader sites are FTE-exclusive (>=80 rows).
6. **Bundle on disk:** `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json` exists and parses; carries categories, extensions, path_rules, cvar_bindings, loader_sites, client_defaults.

---

## Out of scope

- Slipgate consumer-side wiring (directory scanner reading `fte-asset-bundle.json`). Owned by Quake Dir Control plan or a future slipgate UX session.
- MVDSV/KTX asset extraction (Phase 2e). Each gets its own plan.
- `source_root` column on relation tables. Deferred per spec D8; revisit when a concrete query needs plugin-side attribution.
- Refactoring extractor_lib/handler_asset_*.py into a shared base class. Trigger is "3rd project port"; not yet.
- Slipgate inventory verifier (`verify-inventory-coverage.ts`) integration with FTE. Run when slipgate gets a real FTE install dump; not part of producer-side ship.

---

## Coordination

- Path A (Quake Dir Control Phase 3) operates on `apps/slipgate-app/src-tauri/` and frontend. Zero file overlap with Phase 2d-bundle.
- Files this plan touches: `apps/qw-oracle/scripts/extractors/fte/`, `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`, `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`, `apps/qw-oracle/SCHEMA.md` (no edits — schema unchanged), and the producer-side data file at `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json`.
- The bundle output path lives under `apps/slipgate-app/` but is producer-side: the file is generated by build-asset-bundle.ts; no slipgate application code is touched. ezQuake's `ezquake-asset-bundle.json` is already there. This pattern was established during qw-config dissolution Half 2a (2026-04-25).
- Two implementation sessions, ~5-6 hours total. Phase 1 internal commit checkpoint after Task 1.5 (research artifact) gives a natural review surface mid-phase.
