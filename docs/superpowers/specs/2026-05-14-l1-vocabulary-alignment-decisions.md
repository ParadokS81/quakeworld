# L1 vocabulary alignment decisions

**Type:** decision document (worker-session output; oversight reviews before any seed/handler edits)
**Worker dispatched:** 2026-05-14
**Predecessor:** Round 3 calibration commits 3d2a1867 + 03449c65 + 45617006; parking doc `docs/superpowers/parking/2026-05-14-l1-vocabulary-alignment-audit.md`
**Scope:** Phase 1 (4 name mismatches) + Phase 2 (6 L1-only categories) + Phase 2 addendum (4 console-subsystem sites)

---

## Headline

**The parking doc's recommended Option A (rename seed slugs to match L1) is wrong in all 4 mismatch cases.** Independent cold-read of seed YAML + handler files + L1 output finds that the seed slug names are deliberately more precise (or differently scoped) than the L1 asset_category bucket labels, and the bridge via `l1_hint_bare_categories` already documents the relationship correctly. **Recommendation: Option C for all 4 mismatches.** Cost is one paragraph of seed YAML notes per slug; benefit is preserving user-facing taxonomy precision.

For Phase 2, **none of the 6 L1-only categories warrants a new seed slug.** Three are legitimately L1-only intentional categorizations (`shader`, `sprite`, `quakec_progs`); two are extractor bugs that should route to the refinement arc (`screenshot` and `log` are write-path leakage); one is a fine catch-all (`other`). The 4 console-subsystem sites are FTE engine-UI chrome, not user content — they belong in L1 routing decisions, not seed vocabulary decisions.

Net effect: zero seed slug renames, zero new seed slugs, four notes annotations in seed YAML, four punch-list entries routed to the L1 extractor refinement arc. Phase 3 fan-out unblocks without touching any shipped asset-note frontmatter.

---

## Phase 1: Name-mismatch decisions

### 1. `hud_element` (seed) vs `hud_overlay` (L1)

**Decision: Option C** — keep both vocabularies. Document the bridge in seed YAML notes.

**Source-grounding:**
- Seed slug at `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml:140-173`. `l1_hint_bare_categories: ["hud_overlay"]` already in place.
- ezQuake L1 `hud_overlay` (`_handler_asset_loader_sites.py:140-208`): catches `Draw_CachePicSafe`, `Draw_CachePic`, `Draw_CacheWadPic`, `R_LoadPicImage`, plus enclosing-fn rules that route `R_InitChatIcons` (chat icons), `QMB_InitParticles` (particle font), `CL_LoginImageLoad` (auth UI), `SCR_LoadCursorImage` (mouse cursor), `SCR_HUD_LoadGroupPic` (HUD group pics).
- FTE L1 `hud_overlay` (`_handler_asset_loader_sites.py:64`): `R_RegisterPic` -- broad pic-registry catch-all spanning menu, HUD, and CSQC sites.

**Why Option A is wrong:**
1. `hud_overlay` is a **strict superset** of `hud_element`. Renaming seed slug -> `hud_overlay` would make the asset-note frontmatter slug promise more than the note delivers (the shipped `hud_element.md` covers ONLY WAD-lump replacement; not chat icons, particle font, login images, or cursor images).
2. **`hud_element` is already the L1 entity-type vocabulary** for the gfx.wad lump catalog. The ezquake-hud-elements-ast.json extractor output uses `hud_elements` as its top-level key for entities like `num_0`, `face1`, etc. The seed asset_type slug `hud_element` aligns with that L1 entity-type vocabulary. Renaming seed slug -> `hud_overlay` would **break that alignment** for the sake of matching the broader asset_category bucket label. The seed slug is in the right place; the asset_category bucket is allowed to be wider.
3. Cost of Option A: rename shipped `hud_element.md` -> `hud_overlay.md`, update frontmatter slug + asset_type, sweep 5 body references inside hud_element.md, sweep references in concept-notes/_gap-report.md, and update `wad_file` cross-refs inside hud_element.md. Plus precedent-setting: every future curator will need to re-litigate which vocabulary wins.

**How to apply Option C:**
- Add a note paragraph at the end of `hud_element`'s seed YAML `notes:` field explaining that the L1 `hud_overlay` asset_category is a superset (covers chat icons, particle font, login, cursor, HUD group pic in addition to WAD-lump replacements), and that the bridge via `l1_hint_bare_categories: ["hud_overlay"]` is intentional.
- No file moves. No frontmatter changes. No shipped-note updates.

### 2. `player_skin` (seed) vs `skin` (L1)

**Decision: Option C** -- keep both vocabularies.

**Source-grounding:**
- Seed slug at `qw-asset-types.yaml:267-287`. `l1_hint_bare_categories: ["skin"]` already in place.
- ezQuake L1 `skin` (`_handler_asset_loader_sites.py:186, 200-201, 296`): catches `Image_LoadPCX` (.pcx decoder), `Skin_Cache`, `Skin_PixelsLoad`, and any enclosing function matching `r"Skin_"`.
- FTE L1 `skin` (`_handler_asset_loader_sites.py:95, 150`): `.pcx` extension + enclosing `r"Skin_|R_LoadSkin"`.

**Why Option A is wrong:**
1. The seed slug `player_skin` is **more user-explicit** than the L1 `skin`. Slipgate-app, gfx.quakeworld.nu corpus categories, and the asset-type-curate skill all consume the seed slug -- `player_skin` is the unambiguous name. `skin` is fine inside the extractor but loses context outside it.
2. Cost of Option A is real and bounded but not free: shipped `player_skin.md` rename, frontmatter slug+asset_type sweep, plus shipped concept-note partner at `curated/concept-notes/player-skins.md:259` whose body explicitly references `../asset-notes/player_skin.md`. The README "Current notes" table at line 96 also references the slug.
3. There is no semantic loss in keeping `player_skin`: every L1 `skin` site in QW practice is a player skin (Skin_*-enclosed code paths plus .pcx decodes used overwhelmingly for player skins). The extractor's `skin` label is a fine engine-internal bucket name; the seed's `player_skin` is a fine user-facing name.

**How to apply Option C:**
- Add a note paragraph in the seed YAML `notes:` field reinforcing that the L1 `skin` asset_category bucket is the engine-internal label for the same asset class.
- No file moves.

### 3. `wad_file` (seed) vs `wad` (L1)

**Decision: Option C** -- keep both vocabularies. Pattern-symmetric with the other 3.

**Source-grounding:**
- Seed slug at `qw-asset-types.yaml:175-193`. `l1_hint_bare_categories: ["wad"]` already in place.
- ezQuake L1 `wad` (`_handler_asset_loader_sites.py:150, 217, 237, 307`): `W_LoadWadFile`, `WAD3_LoadWadFile`, `.wad` extension.
- FTE L1 `wad` (`_handler_asset_loader_sites.py:76, 157`): `.wad` extension + enclosing `r"^W_LoadTextureWadFile$|^W_LoadWadFile$"`.

**Why Option A is rejected (despite being the cheapest case):**
1. No shipped asset-note for `wad_file` yet (not in current notes table; Phase 3 fan-out queue). Cost of rename is genuinely the smallest of the 4 cases.
2. However, the seed slug `wad_file` is **slightly more explicit** than the L1 `wad` (`wad` could be confused with "the WAD lump table" rather than "a .wad archive file"). The seed slug is the user-facing API name; keeping it `wad_file` reads better in downstream UI strings ("install your wad_file at qw/..." beats "install your wad at qw/...").
3. Pattern-symmetric with hud_element / player_skin / model_q1. If we flip wad_file -> wad solely for cost, we set up a future curator to ask "why is this one different?" -- a confusing inconsistency for no semantic gain.
4. Cross-references in shipped `hud_element.md` body (4 mentions of `wad_file` slug) would still need a sweep on rename, even though the asset-note for `wad_file` itself doesn't exist yet.

**How to apply Option C:**
- Add a note paragraph in the seed YAML clarifying the L1 bridge.

### 4. `model_q1` (seed) vs `model` (L1)

**Decision: Option C** -- keep both vocabularies.

**Source-grounding:**
- Seed slug at `qw-asset-types.yaml:289-313`. `l1_hint_bare_categories: ["model"]` already in place.
- ezQuake L1 `model` (`_handler_asset_loader_sites.py:143-144, 158-163, 239-240`): `Mod_FindName`, `Mod_ForName`, `Mod_LoadAliasModel`, `Mod_LoadAlias3Model` (MD3!), `Mod_LoadModel`, `Mod_ReadFlagsFromMD1`, `.mdl`, `.md3`.
- FTE L1 `model` (`_handler_asset_loader_sites.py:58-60, 78-81, 152`): `Mod_ForName`, `Mod_FindName`, `.mdl`, `.md3`, `.md2`, `.iqm`, enclosing `r"Model_|LoadModel|LoadBrushModel|Mod_LoadAlias|Mod_LoadSprite"`.

**Why Option A is wrong:**
1. L1 `model` is **format-broader** than seed `model_q1`. L1 includes .md3, .md2, .iqm, plus alias models in general. Seed `model_q1` specifically targets Quake 1 .mdl format with IDPO magic.
2. The seed name carries **format scope**: `model_q1` means ".mdl Quake 1 alias model". Renaming to `model` loses that. A future seed slug for `model_md3` or `model_iqm` is plausible (FTE supports them); pre-collapsing the namespace makes that harder.
3. Shipped concept-notes references would change: `curated/asset-notes/README.md:24` calls out `model_q1` by name in the concept-note-partner heuristic.

**How to apply Option C:**
- Add a note paragraph in seed YAML `notes:` field clarifying that the L1 `model` asset_category bucket is wider (includes .md3/.md2/.iqm for FTE), but the seed slug `model_q1` is intentionally narrow to .mdl Q1 format. Cross-format extension would be additive new seed slugs, not a rename.

### Phase 1 summary

| Seed slug | L1 category | Decision | Rationale (one-liner) |
|---|---|---|---|
| `hud_element` | `hud_overlay` | C | L1 is a superset (chat icons, login, cursor); seed slug also aligns with the L1 hud_elements entity-type vocabulary. |
| `player_skin` | `skin` | C | Seed slug more user-explicit; shipped note + concept-note partner reference it; no semantic loss. |
| `wad_file` | `wad` | C | Pattern-symmetric; seed slug is more user-explicit; cross-refs in shipped `hud_element.md`. |
| `model_q1` | `model` | C | L1 wider (includes MD3/MD2/IQM); seed slug carries format scope (.mdl Q1). |

All 4 already have the bridge `l1_hint_bare_categories` in place. The "skill text carrying cost" the parking doc cited is in fact a single seed YAML notes paragraph per slug -- below noise.

---

## Phase 2: L1-only category triage

### 1. `shader` (0 ez / 133 fte)

**Decision: L1-only intentional categorization (category b). No new seed slug.**

**Source-grounding:**
- FTE L1 `shader` (`_handler_asset_loader_sites.py:61-62, 101`): `R_RegisterShader`, `R_LoadShader`, `.shader` extension.
- Site-sampling: `testplane`, `bboxshader`, `timershader`, `shadowshader`, `powerups/shellweapon`, `powerups/shell`, `tiprawimgcube`, `tiprawimgarray`, `textures/models/simple_%s_%i.tga`. Mostly engine-internal rendering primitives.

**Rationale:**
- 133 sites is real territory, but the **vast majority are engine-internal shader-name lookups** (rendering primitives bound to in-engine drawing code), not user-installable content references.
- FTE's shader system is a Quake3-derived rendering material system. Users *can* author `scripts/<name>.shader` text files, but in QW practice these are bundled with map packs or content packs, not standalone community assets. gfx.quakeworld.nu has no "Shaders" corpus category.
- Many sites are shader-name strings the engine uses to look up runtime shader definitions, not file paths to user content.
- A few sites do reach user files (e.g. `textures/models/simple_%s_%i.tga`) -- but those route via the shader name, and the underlying file is a model_texture or map_texture in disguise (the discrimination would have to happen inside Image_LocateHighResTexture, per the existing handler comment at `fte/_handler_asset_loader_sites.py:135-141`).

**No action on seed.** Phase 3 fan-out may surface FTE-only content workflows (shader scripts shipped with map packs); revisit then.

### 2. `screenshot` (8 ez / 3 fte)

**Decision: Extractor bug — write-path leakage. Route to L1 extractor refinement arc. No new seed slug.**

**Source-grounding:**
- All 8 ezquake sites: `FS_OpenVFS` calls inside `Image_WritePNG`, `Image_OpenAPNG`, `Image_WriteTGA`, `Image_WriteJPEG` (image.c:935-1484). All are **WRITE** operations.
- All 3 fte sites: `FS_OpenVFS` inside `SCR_ScreenShot_f`, `Image_WriteKTXFile`, `Image_WriteDDSFile`. All WRITE.

**Two distinct issues:**
1. **Generic FS write-leakage.** The loader-site extractor should not emit on write paths. `FS_OpenVFS` is a `GENERIC_FS_PRIMITIVE` and gets categorized as `screenshot` via the `ENCLOSING_FN_CATEGORY_RULES` regex matching `Image_Write|_WriteTGA|_WritePNG|_WriteJPEG|SCR_ScreenShot`. The narrowed regex (handler line 294) correctly excludes Image_Load reads, but the write-side capture is the smoking gun: writes are not loader sites by definition.
2. **Image_WriteKTXFile / Image_WriteDDSFile misclassification in FTE.** These are texture-format encoders (engine's compressed-texture writer pipeline), not user screenshot writes. They share the `Image_Write*` prefix and get caught by the same regex.

**No seed slug action.** Screenshots aren't a user-installable asset_type anyway -- users generate them, they don't install them.

**Refinement arc punch list entry:**
- "Drop write-path FS_OpenVFS sites from the loader-site extractor, or partition `screenshot` into reads vs writes. Image_WriteKTXFile / Image_WriteDDSFile in FTE are texture-format encoders mistagged as screenshots; the broader pattern is that GENERIC_FS_PRIMITIVES catches both reads and writes indiscriminately. Same shape as the `log` category (Phase 2 case 5)."

### 3. `quakec_progs` (11 ez / 2 fte)

**Decision: L1-only intentional categorization (server-side asset, out of scope for client-facing seed catalog). One nested extractor bug routed to refinement arc.**

**Source-grounding:**
- ezQuake L1 `quakec_progs` (`_handler_asset_loader_sites.py:220-223, 257`): `PR1_LoadProgs`, `PR2_LoadProgs`, `VM_LoadQVM`, `VM_LoadSymbols`, `.dat` extension.
- Sites loaded: `progs.dat`, `qwprogs.dat`, `spprogs.dat`, `fragfile.dat` (!), plus QVM bytecode at `vm.c:1293,1338`.
- FTE 2 sites: `FS_FLocateFile` inside `Q_InitProgs` for `progs.dat`, `qwprogs.dat`.

**Rationale:**
- `quakec_progs` is real and well-targeted: server-side QuakeC bytecode (game logic running on the server). Client-side users don't install custom `progs.dat`; server admins and mod authors do.
- The current `qw-asset-types.yaml` seed is **client-side oriented** (charset, conback, skins, levelshots, configs). Adding a server-side asset_type expands scope beyond client-asset workflows. If slipgate-app or qw-stats ever surfaces a "server mod" workflow, revisit; today the L1 category is the right level of representation.

**Nested extractor bug (refinement arc):**
- `LoadFragFile` site (`fragstats.c:235`) loads `../ezquake/fragfile.dat` via `FS_LoadHeapFile`. Routed to `quakec_progs` via `.dat` extension. Confirmed at `research/repos/ezquake-source/src/fragstats.c:37`: "misc/fragfile/fragfile.dat" is a fuhquake-derived **fragstats config text file**, NOT QuakeC bytecode. Misclassification.
- The ezquake handler already maps `"LoadFragFile": "ezquake:asset_category:config"` via `FUNCTION_TO_CATEGORY` (line 229) -- but that mapping only fires when `LoadFragFile` is the called function. Inside `LoadFragFile`'s body, the actual loader call is `FS_LoadHeapFile`, which then routes via EXT_TO_CATEGORY (.dat -> quakec_progs).
- **Fix shape:** add `LoadFragFile` to ezQuake `ENCLOSING_FN_CATEGORY_OVERRIDES`:
  ```python
  (re.compile(r"^LoadFragFile$"), "ezquake:asset_category:config"),
  ```
- Expected effect: 1 site flips from `quakec_progs` to `config`. Minor.

### 4. `sprite` (2 ez / 0 fte)

**Decision: L1-only intentional categorization. No new seed slug.**

**Source-grounding:**
- ezQuake L1 `sprite` (`_handler_asset_loader_sites.py:162, 259`): `Mod_LoadSpriteFrame`, `.spr` extension.
- 2 sites: `Mod_LoadSpriteFrame` inside `Mod_LoadSpriteGroup` and `Mod_LoadSpriteModel` (r_sprites.c:145,209).

**Rationale:**
- `.spr` is a real engine asset format (explosions, splashes, particles for legacy systems). Stock id1 ships `s_explod.spr`, `s_bubble.spr`, etc. inside pak0.
- **User-installable custom sprites are not a community asset workflow.** gfx.quakeworld.nu has no "Sprites" corpus category (checked via seed's existing corpus_categories -- no sprite-targeted entry).
- The L1 `sprite` category is the right engine-side representation for the loader sites; it just doesn't correspond to a user-facing asset_type.

**Cannot fold into `model_q1`:** different file format (.spr vs .mdl), different magic bytes, different loader path (`Mod_LoadSpriteFrame` vs `Mod_LoadAliasModel`). The seed split would be correct if sprites were a community asset, but they aren't.

**No action.** If a future community-driven custom-sprite workflow surfaces, add a `sprite` seed slug then.

### 5. `log` (0 ez / 4 fte)

**Decision: Extractor bug — write-path leakage. Route to L1 extractor refinement arc. No new seed slug.**

**Source-grounding:**
- All 4 FTE sites: `FS_OpenVFS` inside `Log_String` (log.c:183, 210), `PF_logtext` (pr_cmds.c:7738), `SV_Fraglogfile_f` (sv_ccmds.c:207). All **WRITES**.
- Path templates: `%s.log`, `%s.%i.log`, `frag_%i.log`.

**Rationale:**
- Same shape as `screenshot` -- write-path operations leaking into a loader-site extractor.
- The `.log` extension in `EXT_TO_CATEGORY` serves no purpose for a reads-only extractor (no user installs .log files).
- These are engine writes (server fraglog, QuakeC console-log builtin, chat log file).

**Refinement arc punch list entry:**
- "Drop `.log` from FTE `EXT_TO_CATEGORY` (handler line 96). It only catches write-path sites which the loader-site extractor shouldn't emit anyway. If the write-side capture is intentional (for slipgate-app monitoring of log file presence), partition into a reads/writes split inside the handler -- but for current scope, deletion is correct."

### 6. `other` (3 ez / 31 fte)

**Decision: Catch-all behaves as designed. No new seed slug. One small seed annotation for ezquake/crosshair sidecar.**

**Source-grounding:** All ezquake sites (3): `QTVList_Cache_File_Open` (QTV cache), `Reload_Sources` (server browser sources list), `customCrosshair_Init` (`crosshairs/crosshair.txt`, startup-loaded custom crosshair definition). FTE sites (31): heavy mix of engine state (qkey CD key, conhistory, default.fmf manifest, INSTALLEDFILES package state, ssqccore/csqccore.txt debug coredumps, FAVOURITESFILE server-list state, maptimes.txt log times, fte_bimap.txt builtin map, pinned.txt pinned chat messages, mod.gam mod descriptor) plus a handful of FTE-only user-configurable sidecars (wwheel.txt weapon wheel, emoji.lst, bindlist.lst key-binding presets, effectinfo.txt + particles/particlefont.txt particle scripts).

**Rationale:**
- The 31 FTE sites are mostly **engine state and plugin/module config** (not user-facing assets). A handful are user-configurable but niche (weapon wheel, emoji set, bindlist). None warrant individual seed slugs in the current client-side scope.
- The 3 ezQuake sites are similarly niche: server browser cache files (engine state) plus one user-installable sidecar.

**Sub-finding — `crosshair.txt` companion:**
- `customCrosshair_Init` at ezquake `r_draw.c:222` loads `crosshairs/crosshair.txt` on startup. This is a **custom-crosshair definitions text file**, a companion-sidecar to the `crosshair` asset_type (same as `skywind` config is a companion to `skybox`).
- The `crosshair` seed slug at `qw-asset-types.yaml:83-104` currently covers only the image. **Recommend appending a sentence to the `crosshair` `notes:` field** mentioning the `crosshair.txt` companion file (analogous to skybox's skywind mention at line 237). No new slug; just docs.

---

## Phase 2 addendum: Console-subsystem sites

From the refinement arc parking doc (lines 74-90): 4 FTE sites in `Con_DrawConsoleLines` (2) and `Con_DrawConsole` (2) emit `hud_overlay` but load console-subsystem content, not HUD overlays.

### Cluster A: `Con_DrawConsoleLines` -- inline chat-embedded images

**Decision: Route to `null` (uncategorized) in L1. No new seed slug.**

**Source-grounding:** Per the refinement arc punch list (line 80): `R2D_SafeCachePic("tiprawimg")` + `R_RegisterPic(<user-text>)` -- engine renders inline images embedded in chat lines, where the image path is a user-supplied URL embedded in chat text. The 2 R_RegisterPic sites in `Con_DrawConsoleLines` and the 2 R_RegisterShader sites (`tiprawimgcube`, `tiprawimgarray`) in the same function are all **runtime URL renderers**, not file-based asset loads.

**Rationale:**
- This is an **engine-internal URL renderer**, not a user asset_type. Users don't install "inline chat images" -- the engine fetches the URL at render time from chat-line text.
- The current `hud_overlay` tagging is a hard miscategorization (loaded content is not a HUD overlay).
- Seed-vocabulary side: no slug fits. The asset is ephemeral, URL-referenced, engine-managed.

**Refinement arc punch list entry (added):**
- "Route `Con_DrawConsoleLines` (R_RegisterPic + R_RegisterShader sites) to `null` via FTE `ENCLOSING_FN_CATEGORY_OVERRIDES`: this enclosing function is the inline-chat URL renderer, not an asset loader. Either route to `null` (uncategorized; loaders that aren't asset-typed) or introduce a new L1-internal category `fte:asset_category:inline_chat_url` for filtering; either way no seed slug is warranted."

### Cluster B: `Con_DrawConsole` -- windowed-console backshader / backimage

**Decision: Route to a new L1-internal category `fte:asset_category:console_window_ui` (or `null`); no new seed slug.**

**Source-grounding:** Per refinement arc punch list (line 81): the FTE windowed-console UI's own background asset, loaded via `R_RegisterPic` on `backshader` / `backimage` (likely the cvar values, but path source is `unknown` in current L1). 2 sites at console.c:3151 and 3186.

**Rationale:**
- This is the FTE **windowed-console mode's background** (when the developer console is rendered as a draggable window rather than the gameplay overlay). Distinct from `conback` (which is `gfx/conback.lmp`, the gameplay console background -- shipped seed slug at `qw-asset-types.yaml:33-54`).
- Functionally: it's UI chrome for FTE's interactive dev console, not user-installed gameplay content. Users don't customize the windowed-console background via gfx.quakeworld.nu workflows; FTE devs configure it via cvars.
- Could fold into `conback` if oversight wants to treat them as the same asset class under different sub-modes -- but they target different rendering paths (Draw_Conback vs R_RegisterPic) and different filenames (`gfx/conback.lmp` vs runtime cvar value). The clean read is they're distinct asset classes that happen to both serve as console backgrounds.

**Refinement arc punch list entry (added):**
- "Add `^Con_DrawConsole$` to FTE `ENCLOSING_FN_CATEGORY_OVERRIDES` routing to a new internal category `fte:asset_category:console_window_ui` (or to `null`). Distinct from gameplay `conback`. Do NOT fold into seed `conback` slug -- the gameplay conback at `gfx/conback.lmp` and the FTE dev-console window background are different assets serving similar UI purposes."

---

## Net effect on the seed

**Slugs renamed:** 0
**Slugs added:** 0
**Notes annotations:** 5 small additions to existing seed YAML notes
1. `hud_element` notes: clarify that L1 `hud_overlay` is a superset; bridge via `l1_hint_bare_categories` is intentional.
2. `player_skin` notes: clarify that L1 `skin` is the engine-internal bucket label; bridge is intentional.
3. `wad_file` notes: clarify that L1 `wad` is the engine-internal bucket label.
4. `model_q1` notes: clarify that L1 `model` is wider (covers MD3/MD2/IQM); future MD3/IQM slugs would be additive.
5. `crosshair` notes: mention the `crosshairs/crosshair.txt` companion sidecar file (custom-crosshair definitions, ezQuake `customCrosshair_Init`).

**Files affected:** 1 file -- `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`. Five small docstring additions. ~10 lines added net.

---

## Net effect on existing asset-notes

**Frontmatter updates:** none
**File renames:** none
**Body sweeps:** none required by Phase 1 decisions (Option C preserves slug names).

The 5 shipped asset-notes (`charset.md`, `hud_element.md`, `map.md`, `player_skin.md`, `skybox.md`) plus the shipped concept-note partner (`player-skins.md`) are unaffected.

---

## Routes to L1 extractor refinement arc

Add these 4 entries to `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` punch list (or stash as worker decision-doc artifacts the operator routes from):

1. **Drop write-path FS_OpenVFS leakage.** `screenshot` (8 ez + 3 fte) and `log` (4 fte) categories are populated by write-side sites. Either drop write paths from the extractor or partition reads/writes. Image_WriteKTXFile / Image_WriteDDSFile in FTE are also mistagged as screenshots; they're texture-format encoders. Removing `.log` from FTE `EXT_TO_CATEGORY` is a free win.

2. **`LoadFragFile` mis-route to `config`.** Add ezQuake override `(re.compile(r"^LoadFragFile$"), "ezquake:asset_category:config")` to `ENCLOSING_FN_CATEGORY_OVERRIDES`. Flips 1 site from `quakec_progs` to `config` (`fragfile.dat` is fragstats config text, not QC bytecode; confirmed at `research/repos/ezquake-source/src/fragstats.c:37`).

3. **`Con_DrawConsoleLines` inline chat URL renderer.** Route to `null` or new `fte:asset_category:inline_chat_url`. 4 sites currently mistagged (2 `hud_overlay`, 2 `shader`).

4. **`Con_DrawConsole` windowed-console UI chrome.** Route to `null` or new `fte:asset_category:console_window_ui`. 2 sites currently mistagged as `hud_overlay`. Do NOT fold into seed `conback`.

(All four are tier-fix overrides, not new seed vocabulary.)

---

## Recommended dispatch order

1. **Seed YAML notes annotations (this decision doc)** — single commit, 5 notes additions, no slug changes, no asset-note frontmatter changes. Low risk, unblocks Phase 3 fan-out runners (they read seed notes for bridge intent).
2. **L1 extractor refinement arc execution** — runs the 4 punch list items above (plus the pre-existing 9 from the original arc). Tier-fix commits with re-extract; doesn't touch seed or asset-notes.
3. **Phase 3 fan-out** — proceeds with the existing 16 remaining slugs. The Phase 1 Option C decisions mean fan-out runners see consistent bridge documentation in the seed notes and don't have to re-litigate any naming question.

Steps 1 and 2 are independent and can land in either order. Step 3 only requires step 1.

---

## New findings

### NF1: `hud_element` is a Layer 1 entity-type vocabulary name, not just a seed slug

`apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-hud-elements-ast.json` has top-level key `hud_elements` -- this is the L1 catalog of gfx.wad HUD lump names (num_0, num_1, face1, etc.) extracted as their own entity type, distinct from the loader-site extractor's asset_category bucket. From `apps/qw-oracle/curated/concept-notes/OPERATIONS.md:294`, the Layer 1 entity-type vocabulary explicitly lists `hud_element` alongside `cvar`, `command`, `macro`, etc.

**Implication:** the seed asset_type slug `hud_element` is already aligned with the L1 vocabulary -- just at the **entity-type layer**, not at the **asset_category** layer. The parking doc's framing as a "name mismatch" was incomplete: the mismatch is only at the asset_category bucket, where the bucket is intentionally wider than the asset_type. Renaming the seed slug would have broken the **already-correct** alignment at the entity-type layer for the sake of patching the deliberate divergence at the asset_category layer.

This is the single most load-bearing reason to reject Option A for `hud_element` and informs the broader judgment that seed slugs and asset_category buckets are at different layers (user-facing asset_types vs engine-internal load buckets) and should not be force-aligned.

### NF2: Two distinct shapes of L1-only category

The parking doc framed all 6 L1-only categories as one triage class ("missing seed entries / intentional internal / extractor bug"). Cold-read finds two cleanly separable shapes:

**Shape A — Real engine concept, not a community asset workflow:**
- `shader` (FTE rendering material system; 133 engine-internal sites)
- `quakec_progs` (server-side QC bytecode; client-side seed doesn't cover server assets)
- `sprite` (engine .spr format; no community sprite-replacement corpus)

These are NOT bugs and NOT missing slugs. They are correctly L1-categorized; they simply don't promote to user-facing asset_types.

**Shape B — Extractor bug (write-path leakage or extension mis-route):**
- `screenshot` (writes leaking)
- `log` (writes leaking; `.log` ext serves no read-path purpose)
- `LoadFragFile` nested site (config mistagged as quakec_progs)

These are real bugs with concrete tier-override fixes. Route to refinement arc.

Distinguishing these shapes upfront would have shortened the audit and given the refinement arc a cleaner punch list.

### NF3: The "skill text carrying cost" of Option C is one paragraph per slug

The parking doc framed Option C's cost as "long-term carrying cost in skill text." Actual cost is **one `notes:` paragraph in seed YAML per slug** (4-5 sentences each). The asset-type-curate skill reads the seed YAML at every invocation and surfaces `notes:` content -- runners see the bridge documentation for free. Cost is below noise.

### NF4: gfx.quakeworld.nu corpus categories absence is a real signal

Across the 3 Shape-A L1-only categories (shader / quakec_progs / sprite), none has a corresponding `corpus_categories` entry in the seed YAML. This is independent confirmation that the gfx.quakeworld.nu corpus -- which is the community-curated source of truth for "what assets QW players install" -- does NOT track these as community asset categories. The seed's silence on these is correct.

Future curators: when triaging an L1-only category, the **absence of a gfx.quakeworld.nu corpus category** is strong evidence that the L1 category is an engine-internal concept, not a missing user asset_type.

---

## Halt summary (for the operator)

**STATUS: DONE_WITH_CONCERNS** -- "concerns" because I am flipping the parking doc's Option A recommendation in all 4 mismatch cases. This is not a cold-read concur; it is a load-bearing pushback grounded in NF1 (hud_element is already an L1 entity-type vocabulary name) and the broader observation that seed slugs and asset_category buckets are at different layers. Oversight may override.

**Decision doc:** `docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md`

**Phase 1 outcome (4 mismatches, all Option C):**
- `hud_element` <-> `hud_overlay`: Option C; L1 is a superset, seed already aligns with L1 entity-type vocabulary.
- `player_skin` <-> `skin`: Option C; seed is user-explicit, shipped note + concept-note partner reference it.
- `wad_file` <-> `wad`: Option C; pattern-symmetric, seed more explicit.
- `model_q1` <-> `model`: Option C; L1 wider (MD3/MD2/IQM); seed carries Q1 format scope.

**Phase 2 outcome (6 L1-only categories):**
- `shader` (133 fte): L1-only intentional (engine rendering system).
- `screenshot` (8 ez / 3 fte): extractor bug (writes leaking); refinement arc.
- `quakec_progs` (11 ez / 2 fte): L1-only intentional (server-side); plus nested LoadFragFile fix to refinement arc.
- `sprite` (2 ez): L1-only intentional (no community workflow).
- `log` (0 ez / 4 fte): extractor bug (writes leaking); refinement arc.
- `other` (3 ez / 31 fte): catch-all working as designed; small `crosshair.txt` companion note added to crosshair seed.

**Phase 2 addendum (4 console-subsystem sites):**
- `Con_DrawConsoleLines` (4 sites): L1 reroute to `null` or new `inline_chat_url`; no seed slug.
- `Con_DrawConsole` (2 sites): L1 reroute to `null` or new `console_window_ui`; no seed slug, do NOT fold into `conback`.

**New findings:** 4 (see "New findings" section). NF1 is load-bearing for the Phase 1 verdict.

**Time spent:** ~75 minutes (within the parking doc's 1-2 hour estimate).

**Open questions for oversight:**
- Confirm the Option-C-across-the-board reversal of the parking doc's Option A recommendation. Cold-read justification is in NF1 plus the per-slug source-grounding; operator may still prefer Option A on different grounds (e.g., a downstream consumer wiring not yet visible).
- Confirm routing of the 4 console-subsystem sites to `null` vs new internal categories. Either is defensible; the decision is which side of the verbosity tradeoff oversight wants in the FTE handler.
- Confirm the `LoadFragFile` -> `config` override should land in the refinement arc rather than the seed annotation pass (it's a 1-line handler change, but cosmetically belongs to "extractor refinement" rather than "vocabulary alignment").
