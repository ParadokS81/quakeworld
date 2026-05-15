# Side-quest: L1 extractor refinement (asset-loader-sites categorization)

**Type:** medium arc (2-3 sessions; original sizing was 1-2 but punch list grew through 2 closure passes)
**Surfaced:** 2026-05-14, during asset-type-curate Round 3 calibration
**Pressure:** MEDIUM. The arc is the NEXT execution after vocab-alignment closure -- not a parking doc to keep feeding. Once it ships, the punch list zeroes out; future calibration findings route to a fresh post-refinement arc.
**Predecessor:** Round 3 calibration commits 3d2a1867 (skybox), 03449c65 (charset/hud_element/map), 45617006 (seed + OPERATIONS corrections), plus 2026-05-14 oversight audit additions and the 2026-05-14 L1 vocab alignment audit decision doc (`docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md`).

---

## Phase A status (SHIPPED 2026-05-14)

**Closed:** Category 1 (10 of 11 entries — see Deferred below) + Category 2 (4 sites, 2 new asset_category labels).
**Remaining:** Category 3 (write-path leakage, Phase B), Category 4 (FTE charset watchlist gap, Phase C).

**Net L1 impact** (sites rerouted; no new or lost):
- ezQuake: skybox +7, charset +1, config +2, texture −6, null −2, hud_overlay −1, quakec_progs −1
- FTE: hud_overlay −14, shader −3, texture −2, model −1; conback +6, inline_chat_url +5, skin +3, model_texture +2, console_window_ui +2, map +1, charset +1

**New FTE L1 asset_category labels registered:** conback, charset, model_texture, inline_chat_url, console_window_ui.

**Seed YAML bridges added (NF3):** `conback` + `model_texture` `l1_hint_bare_categories` now populated. Required for derive to land the new FTE categories under the user-facing slugs (without this, FTE Mod_ParseMD5MeshModel sites stranded).

**FTE 5-case hud_overlay decision:** per-site overrides (not tier-fix). The 5 cases don't share a common discriminator; tier-fix would over-narrow correct hud_overlay routings.

**Deferred (per-site path-template override shape — post-refinement territory):**
- **Cat 1 entry 7 — M_Menu_LoadSave_Preview_Draw → levelshot:** function has 2 R_RegisterPic sites at different asset types (save-thumbnail `saves/%s/screeny.tga` line 171 vs levelshot `levelshots/%s` line 183). Existing handler comment at `fte/_handler_asset_loader_sites.py:127-130` already flags this. Enclosing-fn override would mistag the thumbnail. Needs a per-site path-template-prefix override tier.

**Open finding (post-refinement; not Phase B/C scope):**
- **FTE map watchlist gap larger than Cat 1 spec'd:** Mod_LoadBrushModel captured 1 site of expected ~5-10. BSP load + .ent loader sites at `gl_model.c:2274-2330` aren't in `LOADER_FUNCTIONS`. Same fix shape as Category 4 (FTE charset); could fold into Phase C scope if operator chooses, otherwise post-refinement.

**Process note (NF2):** Several site-count claims in the original punch list below were stale by Phase A execution time. Worker verified against live source for each entry. Treat the body below as orientation; ground truth is in the current `*-asset-loader-sites-ast.json` outputs.

---

## Phase B status (SHIPPED 2026-05-14)

**Closed:** Category 3 (write-path leakage, 15 sites moved to null in both engines). Plus 2 inline scope adds -- both write-function-leakage shape at different extractor tiers:
- **NF1**: `Image_OpenAPNG` removed from ezQuake `LOADER_FUNCTIONS` + `FUNCTION_TO_CATEGORY`. "wb" movie-capture APNG writer at `image.c:991,993` -- not a loader. Was emitting a phantom texture site via `Movie_Demo_Capture_f`.
- **NF3**: `.log` removed from ezQuake `EXT_TO_CATEGORY`. Dormant (0 sites); symmetric with the FTE removal.

**Remaining:** Category 4 (FTE charset watchlist gap, Phase C).

**Option chosen:** A (regex-narrow). The screenshot `ENCLOSING_FN_CATEGORY_RULES` regex dropped from both handlers; `.log` `EXT_TO_CATEGORY` entry dropped from both. Affected sites fall through to `null` `reads_category_id` with confidence `intentionally_generic`; downstream consumers (derive, asset-type-curate) skip null categories.

**Net L1 impact:**
- ezQuake: screenshot -8 / texture -1 (NF1) / null +8; 1 site removed from extraction (Image_OpenAPNG phantom)
- FTE: screenshot -3 / log -4 / null +7; total unchanged

**Source verification:** worker confirmed all 11 candidate write-function sites + 2 FTE log appends. 3 sites turned out to be `"rb"` existence-check probes inside write-purpose functions (`SCR_ScreenShot_f` / `Log_String:183` / `SV_Fraglogfile_f`) -- fix applies cleanly because category-tier narrowing handles both write-mode and read-probe shapes.

**Derive output:** 21 asset_types post-Phase B differ from Phase A baseline only at `map_texture` ezQuake (-1 site from Image_OpenAPNG phantom removal via NF1).

**NF4 process note:** `SCR_ScreenShot*` prefix in the dropped regex was matching only `SCR_ScreenShot_f` in both engines -- no regression from regex removal.

---

## Why this arc exists

The asset-type-curate skill's Round 3 calibration plus two follow-on closure passes (oversight audit + L1 vocab alignment audit) surfaced extractor-side findings of 4 distinct fix shapes. The punch list is reorganized below by shape rather than by source-slug -- each category has a coherent fix approach and verification regime.

The pattern is documented in the skill's `references/status-flag-rubric.md` under the **L1-CAT-AMBIGUOUS** named enrichment-grade pattern + the new **Triage heuristics for vocabulary-alignment audits** section (added 2026-05-14 from vocab-audit NF4).

---

## Punch list (4 fix-shape categories, 17 entries)

### Category 1: Misroutes -- extractor sees site, tags wrong category (10 entries)

Each entry is a single-line `ENCLOSING_FN_CATEGORY_OVERRIDES` override or equivalent tier-fix. Verification: re-run extractor, diff site counts per category against pre-fix snapshot.

#### ezQuake (4 cases)

1. **skybox -- `Mod_LoadExternalSkyTexture`** (`r_brushmodel_load.c:371`)
   - Current category: `ezquake:asset_category:skybox`
   - Question: should it route to `map_texture` instead? Loads BSP-internal sky-overlay replacements at `textures/<mapname>/<bsp_skytex>_{solid,alpha}.<ext>` -- install layout matches `map_texture`, not `skybox`.
   - Source: skybox-investigation.md `## L1 extractor follow-up` section
   - Resolution shape: operator decision (both args reasonable). Either re-route to `map_texture` OR keep at `skybox` + document the dual-mechanism (current asset-note does this).

2. **skybox -- `Skywind_Load_f` / `FS_LoadTempFile`** (`r_brushmodel_sky.c:309`)
   - Current category: `null` (uncategorized)
   - Intended: `ezquake:asset_category:skybox`
   - Fix shape: add `Skywind_Load_f` to `ENCLOSING_FN_CATEGORY_OVERRIDES` in `apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py`:
     ```python
     (re.compile(r"^Skywind_Load_f$"), "ezquake:asset_category:skybox"),
     ```
   - Symmetric to the FTE `R_SetSky|Shader_ParseSkySides` override that already landed.

3. **charset -- `FS_LoadTempFile` inside `Load_LMP_Charset`** (`r_draw_charset.c:71`)
   - Current category: `ezquake:asset_category:hud_overlay`
   - Intended: `ezquake:asset_category:charset`
   - Fix shape: add `Load_LMP_Charset` to `ENCLOSING_FN_CATEGORY_OVERRIDES`:
     ```python
     (re.compile(r"^Load_LMP_Charset$"), "ezquake:asset_category:charset"),
     ```
   - Or tighten the function-tier rule that catches FS_LoadTempFile so it doesn't default to hud_overlay.

4. **config -- `LoadFragFile` mis-routed to `quakec_progs`** (`fragstats.c:235`)
   *Added 2026-05-14 from vocab-alignment audit Phase 2 case 3.*
   - Current category: `ezquake:asset_category:quakec_progs` (routed via `.dat` extension)
   - Intended: `ezquake:asset_category:config`
   - Source: `LoadFragFile` loads `../ezquake/fragfile.dat` via `FS_LoadHeapFile`. Confirmed at `research/repos/ezquake-source/src/fragstats.c:37`: fragfile.dat is fragstats config text (fuhquake-derived), NOT QC bytecode.
   - Why the FUNCTION_TO_CATEGORY entry for `LoadFragFile` doesn't catch: that mapping fires when `LoadFragFile` is the *called* function, but the actual loader call inside `LoadFragFile`'s body is `FS_LoadHeapFile`, which routes via EXT_TO_CATEGORY (.dat -> quakec_progs).
   - Fix shape: add ezQuake override:
     ```python
     (re.compile(r"^LoadFragFile$"), "ezquake:asset_category:config"),
     ```
   - Expected: 1 site flips from `quakec_progs` to `config`.

#### FTE (5 cases, all under `hud_overlay`)

The FTE `hud_overlay` category currently catches multiple unrelated loaders. Surfaced during hud_element calibration when filtering 23 FTE sites for `l1_canonical_ids`:

| Enclosing function | Source file | Currently | Should be |
|---|---|---|---|
| `R2D_Conback_Callback` (sites 2-4) | `r_2d.c` | hud_overlay | conback |
| `Font_LoadHexen2Conchars` | `gl_font.c` | hud_overlay | charset |
| `M_Menu_LoadSave_Preview_Draw` (site 2) | `m_single.c` | hud_overlay | levelshot |
| `Mod_ParseMD5MeshModel` (sites 1-2) | `com_mesh.c` | hud_overlay | model_texture |
| `MSetup_TransDraw` (site 2) | `m_multi.c` | hud_overlay | player_skin |

**Question for the arc:** tier-level routing precision issue (FTE's `hud_overlay` tier catches too broadly) or 5 individual override entries? Inspect the categorization logic for these functions -- if they share a common discriminator the tier currently ignores, tier-fix is right; if each needs its own override, per-site is right.

Source: hud_element-investigation.md `## FTE L1 categorization quality issues` section.

#### Map (1 case)

10. **map -- `Mod_LoadBrushModel`** (FTE, `gl_model.c:5507`)
    - Current category: `fte:asset_category:model`
    - Intended: `fte:asset_category:map`
    - Fix shape: add to FTE `ENCLOSING_FN_CATEGORY_OVERRIDES`:
      ```python
      (re.compile(r"^Mod_LoadBrushModel$"), "fte:asset_category:map"),
      ```
    - Expected result: ~5-10 additional `map`-categorized sites in FTE L1 covering BSP load, inline-model registration, and the .ent loader at `gl_model.c:2274-2330`.
    - Source: map-investigation.md `## Extractor gap` section.

---

### Category 2: Console-subsystem reroutes -- engine UI chrome, not HUD overlay (4 sites, 2 new internal categories)

**Decided from vocab-alignment audit (2026-05-14):** these are FTE engine UI sites that load content of engine concern, NOT user-facing asset_types. No seed slugs warranted. Destination: new L1-internal `asset_category` labels chosen over `null` to preserve information for downstream filtering.

| Enclosing function | Source file | Sites | What it loads | New L1 category |
|---|---|---|---|---|
| `Con_DrawConsoleLines` | `console.c:2156` | 2 (R_RegisterPic + R2D_SafeCachePic, currently `hud_overlay`) + 2 (R_RegisterShader, currently `shader`) | inline chat-embedded URL renderer (user-supplied URLs in chat lines, rendered via `tiprawimg` / `tiprawimgcube` / `tiprawimgarray`) | `fte:asset_category:inline_chat_url` |
| `Con_DrawConsole` | `console.c:3079` | 2 (currently `hud_overlay`) | windowed-console `backshader` / `backimage` -- the FTE dev console's own UI background | `fte:asset_category:console_window_ui` |

**Fix shape:** add to FTE `ENCLOSING_FN_CATEGORY_OVERRIDES`:
```python
(re.compile(r"^Con_DrawConsoleLines$"), "fte:asset_category:inline_chat_url"),
(re.compile(r"^Con_DrawConsole$"), "fte:asset_category:console_window_ui"),
```

**Do NOT** fold either into the seed `conback` slug -- different rendering paths (`Draw_Conback` vs `R_RegisterPic`), different filenames (`gfx/conback.lmp` vs runtime cvar value), different user-vs-engine concern.

Source: hud_element-investigation.md `## Extractor notes` + vocab-alignment decision doc Phase 2 addendum + source verification at `research/repos/fteqw/engine/client/console.c:150-192,3079-3150`.

---

### Category 3: Write-path leakage -- extractor emits on writes (2 fix shapes, 15 sites)

These are NOT loader sites by definition. The extractor's `GENERIC_FS_PRIMITIVES` (FS_OpenVFS) catches both reads and writes; the category rules then bucket writes into nonsensical asset_categories. *Added 2026-05-14 from vocab-alignment audit Phase 2 cases 2 + 5.*

11. **`screenshot` (8 ezQuake + 3 FTE) -- write-path leakage**
    - ezQuake: all 8 sites are `FS_OpenVFS` inside `Image_WritePNG` / `Image_OpenAPNG` / `Image_WriteTGA` / `Image_WriteJPEG` (image.c:935-1484). All WRITES.
    - FTE: all 3 sites are `FS_OpenVFS` inside `SCR_ScreenShot_f` / `Image_WriteKTXFile` / `Image_WriteDDSFile`. All WRITES.
    - Nested issue: `Image_WriteKTXFile` / `Image_WriteDDSFile` in FTE are texture-format encoders (engine compressed-texture writer pipeline), NOT user screenshot writes. The same `Image_Write*` regex prefix catches them.
    - Fix shape: drop write-path FS_OpenVFS sites from the loader-site extractor, OR partition `screenshot` into reads vs writes. Either way, narrow the regex to exclude write functions.
    - Source: vocab-alignment decision doc Phase 2 case 2.

12. **`log` (0 ezQuake + 4 FTE) -- write-path leakage; `.log` ext serves no read-path purpose**
    - FTE: all 4 sites are `FS_OpenVFS` inside `Log_String` (log.c:183, 210) / `PF_logtext` (pr_cmds.c:7738) / `SV_Fraglogfile_f` (sv_ccmds.c:207). All WRITES.
    - Path templates: `%s.log`, `%s.%i.log`, `frag_%i.log`.
    - Fix shape: drop `.log` from FTE `EXT_TO_CATEGORY` (handler line 96). It only catches write-path sites which the loader-site extractor shouldn't emit anyway. If write-side capture is intentional (slipgate-app monitoring of log presence), partition into reads/writes inside the handler -- but for current scope, deletion is correct.
    - Source: vocab-alignment decision doc Phase 2 case 5.

---

### Category 4: Missing watchlist functions -- extractor doesn't see site at all (1 entry)

Different shape from misroutes: the extractor's `LOADER_FUNCTIONS` watchlist / `FUNCTION_TO_CATEGORY` map does not include the function, so L1 carries **zero sites** for the affected slug. *Added 2026-05-14 from oversight audit.*

13. **FTE `charset` -- entire watchlist gap (0 L1 sites today)**
    - FTE routes charset loading through `engine/gl/gl_font.c` under the general font system. Key functions:
      - `R_LoadHiResTexture(start, "fonts:charsets", ...)` at `gl_font.c:2629` (image-based charsets, searches `charsets/` and `textures/charsets/`)
      - `Font_LoadFontLump(f, start)` (WAD-style charset lump loading)
      - `Font_LoadDefaultConchars()` reading `gfx/conchars.lmp` or `pics/conchars.pcx` (lines 2043, 2048)
    - None of these are in FTE's `LOADER_FUNCTIONS` watchlist or `FUNCTION_TO_CATEGORY` map.
    - Result: FTE charset L1 has zero sites; charset.md ships with "FTE: source-verified, no L1 backing" hedges.
    - Fix shape: add the three functions above to FTE's `LOADER_FUNCTIONS` (with enclosing-function context from `gl_font.c`'s font-loading path) and route to `fte:asset_category:charset` either via `FUNCTION_TO_CATEGORY` or `ENCLOSING_FN_CATEGORY_OVERRIDES`.
    - Expected result: ~5-10 FTE charset L1 sites; FTE-side asset detection (slipgate-app etc.) gains an L1 anchor.
    - Source: charset-investigation.md `## Extractor gap -- FTE` section.

**No more additions to this arc.** If Phase 3 fan-out surfaces additional watchlist gaps (likely on wad_file / sound / config / model_q1 / model_texture), they go to a **post-refinement arc**, not back into this one. This arc closes when these 4 categories are resolved.

---

## Approach

Fresh terminal opens the extractor handler file:
`apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py`
and its FTE sibling.

Per case:
1. Read the current categorization tier rules (`FUNCTION_TO_CATEGORY`, `ENCLOSING_FN_CATEGORY_RULES`, `ENCLOSING_FN_CATEGORY_OVERRIDES`).
2. For tier-level question (FTE hud_overlay 5-case cluster): inspect the routing logic, decide tier-fix vs per-site override.
3. Apply the chosen fix.
4. Re-run the extractor: `python3 apps/qw-oracle/scripts/extractors/ezquake/extract.py` (similar for FTE).
5. Verify no regressions: compare site counts per category against pre-fix snapshot.
6. Spot-check the affected slugs by re-running `derive_asset_types.py` and reading the new `qw-asset-types.json` evidence counts.

After all fixes land, re-walk affected slugs through `/asset-type-curate <slug>` if needed (most slugs were documented around the L1 gap and don't strictly need re-running, but skybox + map specifically benefit from cleaner L1 anchors).

---

## Success criteria

Per category:

**Category 1 (Misroutes, 10 entries):** all resolved (or operator-decided to defer). ezQuake extractor + FTE extractor re-runs produce clean diffs -- only the targeted sites move categories; nothing else shifts. Spot-checks:
- hud_element L1 `hud_overlay` site count drops by 5 ezQuake + 5 FTE = 10 (or those sites move to correct categories).
- map L1 gains 5-10 FTE `map` sites.
- `quakec_progs` loses the 1 `LoadFragFile` site to `config`.

**Category 2 (Console reroutes, 4 sites):** all 4 sites move from `hud_overlay` / `shader` to `inline_chat_url` / `console_window_ui`. New asset_category labels registered in FTE handler.

**Category 3 (Write-path leakage, 15 sites):** `screenshot` and `log` categories no longer carry write-path entries. Either regex narrowed to exclude write functions, or write-path branch dropped entirely from GENERIC_FS_PRIMITIVES handling.

**Category 4 (Watchlist gaps, 1 entry):** FTE charset L1 site count goes from 0 to ~5-10. Charset asset-note's "FTE: source-verified, no L1 backing" hedge becomes obsolete.

**Closure:** HANDOVER.md punch-list pointer removed; arc retires with retrospective in `apps/qw-oracle/docs/arc-history.md`. Re-run of asset-type-curate on skybox + map + charset is optional spot-check (cleaner L1 anchors but existing notes already source-verified).

---

## Sister finding (added 2026-05-15): platform-conditional cvars are source-invisible

Different shape from the 4-category punch list above (those are
asset-loader-site categorization). This is a cvar-extraction coverage
gap under the libclang extractor's fixed platform parse config.
Surfaced 2026-05-15 while triaging an ezquake `F2.flickering_presence`
anomaly during the fte-quality-grid session.

**Exemplar:** `s_stereo` (ezquake, entity id 10894). A real, live,
Linux-only sound cvar (`"Use stereo or mono sound. Linux only. Use
s_restart after you change it."`). `source_file` is NULL in all 10
version rows -- never extracted from source at any tag.

**Root cause (verified):** ezquake help-JSON is generated by an
in-engine tool that walks the cvars registered in *that* build. A
Linux-guarded cvar is only registered in a Linux build. The libclang
extractor parses a fixed non-Linux platform config, so it
structurally never sees `s_stereo` (or any Linux-only / platform-gated
cvar) in source. Help-JSON is the sole signal for these entities.

**Why it looks anomalous (inferred):** the ingested help-JSON
snapshots came from different build targets across releases. Present
v3.0-3.1 + 3.6.0-3.6.9, absent 3.2-3.2.3 + head -- a non-monotonic
"flicker" that reflects help-JSON-generation build-target variance,
not engine lifecycle. The per-version help text is stable and
coherent throughout (not garbled doc churn). The exact
snapshot-to-build-target mapping is not traced; this is the most
consistent explanation, not a verified provenance chain.

**Generalization:** platform-conditional cvars (Linux-only, and
likely other `#ifdef`-guarded families) are systematically invisible
to source extraction; `s_stereo` is one instance the probe happened
to catch. Not a data bug -- no loader/data fix. The arc-level scope
question: either (a) widen the extractor parse matrix to cover
additional platform configs, or (b) accept help-JSON-only signal for
platform-gated entities and teach `F2.flickering_presence` to
suppress the false flicker for never-source-backed entities. Sibling
to the conditional-compilation coverage concern this arc already
carries.

**Pointer:** probe `F2.flickering_presence` in
`apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`; libclang
parse-config in `apps/qw-oracle/scripts/extractors/extractor_lib/`
(27 conditional macros, dual client/server, non-Linux).

---

## Pointers

- Skill rubric (new L1-CAT-AMBIGUOUS section): `~/.claude/skills/asset-type-curate/references/status-flag-rubric.md`
- Extractor handler files: `apps/qw-oracle/scripts/extractors/{ezquake,fte}/_handler_asset_loader_sites.py`
- Investigation reports (source for each case): `apps/qw-oracle/docs/asset-curation/{skybox,charset,hud_element,map}-investigation.md`
- Seed: `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`
- Derive: `apps/qw-oracle/scripts/extractors/qw/derive_asset_types.py`
