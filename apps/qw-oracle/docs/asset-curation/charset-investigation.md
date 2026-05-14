# charset -- asset-type-curate investigation

**Date:** 2026-05-14
**Flag:** CONFIDENT
**Slug:** charset
**Calibration round:** Round 3 (Brief-tier discipline test; skybox and player_skin already shipped)

---

## L1 evidence

### ezQuake (11 sites, `ezquake:asset_category:charset`)

All sites in `r_draw_charset.c`, pulled from `ezquake-asset-loader-sites-ast.json`:

| canonical_id | function | enclosing function | line |
|---|---|---|---|
| ezquake:loader_site:R_LoadCharsetImage_r_draw_charset_Load_Locale_Charset_1 | R_LoadCharsetImage | Load_Locale_Charset | 158 |
| ezquake:loader_site:Load_LMP_Charset_r_draw_charset_Load_Locale_Charset_1 | Load_LMP_Charset | Load_Locale_Charset | 161 |
| ezquake:loader_site:Load_LMP_Charset_r_draw_charset_Draw_LoadCharset_1 | Load_LMP_Charset | Draw_LoadCharset | 180 |
| ezquake:loader_site:R_LoadCharsetImage_r_draw_charset_Draw_LoadCharset_1 | R_LoadCharsetImage | Draw_LoadCharset | 183 |
| ezquake:loader_site:Load_Locale_Charset_r_draw_charset_Draw_LoadCharset_1 | Load_Locale_Charset | Draw_LoadCharset | 193 |
| ezquake:loader_site:Load_Locale_Charset_r_draw_charset_Draw_LoadCharset_2 | Load_Locale_Charset | Draw_LoadCharset | 201 |
| ezquake:loader_site:Load_Locale_Charset_r_draw_charset_Draw_LoadCharset_3 | Load_Locale_Charset | Draw_LoadCharset | 205 |
| ezquake:loader_site:Draw_LoadCharset_r_draw_charset_OnChange_gl_consolefont_1 | Draw_LoadCharset | OnChange_gl_consolefont | 217 |
| ezquake:loader_site:Draw_LoadCharset_r_draw_charset_Draw_InitCharset_1 | Draw_LoadCharset | Draw_InitCharset | 714 |
| ezquake:loader_site:Draw_LoadCharset_r_draw_charset_Draw_InitCharset_2 | Draw_LoadCharset | Draw_InitCharset | 717 |
| ezquake:loader_site:R_LoadImagePixels_r_texture_load_R_LoadCharsetImage_1 | R_LoadImagePixels | R_LoadCharsetImage | 206 (r_texture_load.c) |

Two additional sites tagged `ezquake:asset_category:hud_overlay` (not included in charset l1_canonical_ids):
- `FS_LoadTempFile` inside `Load_LMP_Charset` at line 71 -- categorized as `hud_overlay`; arguably mistagged (it's loading a charset .lmp, not a HUD overlay). The enclosing function is `Load_LMP_Charset`, which is a charset loader; the categorization should likely be `charset`. Minor miscategorization; does not affect the draft.
- `Draw_CachePicSafe(MCHARSET_PATH)` in `R_Draw_CharacterBase` at line 805 -- loads `gfx/mcharset.png` (defined at `draw.h:73`). This IS a HUD overlay (hardcoded mini-charset for in-game character rendering, not user-replaceable). Categorization is correct.

### FTE (0 sites)

No FTE L1 sites for `fte:asset_category:charset`. Confirmed by grep of `fte-asset-loader-sites-ast.json` (717 total sites). See "Extractor gap -- FTE" section below.

### QWCL

No `qwcl-asset-loader-sites-ast.json` exists (QWCL extractor covers cvars/commands/variables, not asset loader sites). QWCL source (`QW/client/gl_draw.c:406`) shows charset loaded directly from `gfx.wad` via `W_GetLumpName("conchars")` -- no user-selectable path, no cvar. No L1 entry expected.

### MVDSV

Server-side only. No rendering subsystem. No charset loading. No L1 entry expected.

---

## Source verification

### ezQuake load mechanism (source-verified)

File: `src/r_draw_charset.c`

Cvars/commands declared at this file:
- `gl_consolefont` (default: `"povo5"`, CVAR_AUTO) -- primary charset name. OnChange handler triggers `Draw_LoadCharset`. Verified at line 38.
- `gl_charsets_min` (default: `"1"`) -- when 1, loads only the `-cyr` locale variant; when 0, loads all numbered variants (000-...). Verified at line 40.
- `gl_alphafont` (default: `"1"`) -- alpha blending for font rendering. Registered at line 689.
- `scr_coloredText` (default: `"1"`) -- enables `{&cRGB...&r}` colored text in console output. Registered at line 691.
- `loadcharset` command registered at line 682; calls `Draw_LoadCharset_f` which sets `gl_consolefont`.

Primary load path:
1. `Draw_InitCharset` (line ~700) calls `Cvar_AutoReset(&gl_consolefont)` then `Draw_LoadCharset(gl_consolefont.string)`.
2. `Draw_LoadCharset(name)` branches:
   - `name == "original"`: calls `Load_LMP_Charset("charset", ...)` which reads from `draw_chars` (WAD conchars already in memory, line 66-68).
   - Otherwise: calls `R_LoadCharsetImage(va("textures/charsets/%s", name), ...)` (line 183) for the primary charset.
3. Fallback if charset load fails: `Draw_LoadCharset("original")` with `Cvar_AutoSet` (line 717). If that also fails, `Sys_Error` at line 723.
4. Locale variant loading: based on `gl_charsets_min`, calls `Load_Locale_Charset(name, "cyr", 4, flags)` (slot 4, cyr suffix) or loops through 3-digit numbered variants (`000`, `001`, etc.) stored at `textures/charsets/<name>-<cyr|NNN>`.

`Load_LMP_Charset` (for .lmp fallback, line 55-135):
- Accepts `gfx/<name>.lmp` via `FS_LoadTempFile` (except when `name == "charset"` which bypasses to WAD).
- Handles both raw 128x128 data and QPIC-wrapped 128x128+8 byte format.
- Converts 128x128 to 256x256 with empty row spacing for texture smoothing.

Locale path shape: `textures/charsets/<basename>-<locale>` for image, or `conchars-<locale>` for LMP fallback.

`R_LoadCharsetImage` dispatches to `R_LoadImagePixels` in `r_texture_load.c` (line 206) for actual disk read and texture upload.

### FTE load mechanism (source-verified from fteqw source, no L1 backing)

FTE routes charset/font loading through its general font system in `engine/gl/gl_font.c`. The separation from ezQuake's dedicated charset module is significant: FTE treats bitmap charsets as one of several font input types alongside TTF/OTF and other formats.

Key cvars (from `engine/client/renderer.c`):
- `con_textfont` (alias: `gl_consolefont`) -- declared as `CVARAFD("con_textfont", "", "gl_consolefont", CVAR_RENDERERCALLBACK|CVAR_ARCHIVE, ...)` at line 399. Default is empty (uses built-in conchars). When set to an image path, FTE searches `charsets/<name>.*` and `textures/charsets/<name>.*` (file enumeration at lines 680-681).
- `gl_font` -- parallel font cvar (`CVARFD("gl_font", "", CVAR_RENDERERCALLBACK|CVAR_ARCHIVE, ...)` at line 394). Same RENDERERCALLBACK behavior.

Font loading in `gl_font.c` (line ~2600-2680):
- Tries TrueType (`Font_LoadFreeTypeFont`) if FreeType is available.
- Falls back to `R_LoadHiResTexture(start, "fonts:charsets", ...)` (line 2629) for image-based charsets, searching the `charsets/` and `textures/charsets/` paths.
- Falls back to `Font_LoadFontLump(f, start)` for WAD-style lump loading.
- Final fallback: `Font_LoadDefaultConchars()` which reads `gfx/conchars.lmp` (line 2043) or `pics/conchars.pcx` (line 2048).

FTE supports bitmap charsets compatible with ezQuake's `qw/textures/charsets/<name>.<ext>` layout -- the search paths overlap. However, FTE also accepts TTF/OTF fonts as font values, which ezQuake does not.

### QWCL load mechanism (source-verified)

`QW/client/gl_draw.c:406`: `char_texture = GL_LoadTexture("charset", 128, 128, draw_chars, false, true)` where `draw_chars = W_GetLumpName("conchars")` (line 392). Hardcoded WAD conchars, no user replacement path, no cvar.

---

## Documentation cross-reference

**File:** `research/repos/ezquake-docs/docs/docs/charsets.md`
**Last edited:** 2022-11-21 (at the staleness boundary)
**URL:** https://ezquake.com/docs/charsets/ (local rip is authoritative source for the docs site)

### Coverage vs source

| Topic | Doc says | Source says |
|---|---|---|
| Install path | `/qw/textures/charsets/` | Confirmed: `textures/charsets/<name>` in source |
| Load command | `/loadcharset <filename>` | Confirmed: registered at `r_draw_charset.c:682` |
| Cvar name | Not mentioned | `gl_consolefont` default "povo5" is the underlying cvar |
| Locale variants | Not mentioned | `gl_charsets_min` + `-cyr`/`-NNN` suffix mechanism |
| `gl_alphafont` | Not mentioned | Declared and registered in same file |
| `gl_charsets_min` | Not mentioned | Declares and controls locale charset loading |
| Resolution guidance | Detailed guide by "fuh" covering 128/256/512 sizing | Source agrees: sizes are user choice; engine scales at draw time |

The doc covers the install path and loadcharset command correctly. It omits `gl_consolefont` (the underlying cvar), `gl_charsets_min` (locale sub-variants), and `gl_alphafont`. The resolution guide is historically useful and source-neutral (it explains rendering math, not a source-verifiable claim).

**Doc currency:** The doc's install path and loadcharset command are still correct per 2026-05-14 source. No divergence found. The doc is incomplete (omissions) rather than wrong.

---

## Corpus mining results

- **61 unique bundles** across `Charsets`, `Charsets / 256x256`, `Charsets / 512x512`, `Charsets / 1024x1024 or larger`
- **Install path:** Universally `qw/textures/charsets/<name>.<ext>` (high confidence, gfx_faq QID 19)
- **Dominant format:** `.png` in modern bundles; sizes range from 256x256 to 1024x1024+
- **Community comments:** Aesthetic feedback only; no install-path instruction in comments (path is well-established)
- **Mixed bundles:** Bundle 583 ("Charset Template with 28 charsets") ships a `.cfg` alongside charset images. The cfg is `charset_template/qw/charset_template.cfg` -- no install path resolved (`target_path: null`). This is a companion config file, not a separate recognized asset_type. No `companion_asset_types` entry warranted from this; the OPERATIONS.md cross-type companion convention applies only when the engine recognizes the companion as a distinct loadable.

---

## Flag triage

**CONFIDENT**

- L1 evidence: 11 ezQuake sites, all correctly categorized as `charset` (with one minor hud_overlay mis-tag noted above, not blocking)
- FTE: 0 L1 sites -- extractor gap, not a slug gap; FTE mechanism source-verified independently
- QWCL/MVDSV: no asset-loader-site extractor outputs; QWCL uses WAD-hardcoded conchars; MVDSV is server-side. Not blocking.
- Docs: present, stale at boundary, incomplete not wrong
- Corpus: 61 bundles, high-confidence install path, community consensus

No seed deltas needed. The seed's flat `engine_canonical_paths` list covers the two key paths (`gfx/conchars.lmp`, `textures/charsets/<name>`); the per-engine format in the note frontmatter carries the nuance.

---

## Extractor gap -- FTE

FTE's charset loading lives in `engine/gl/gl_font.c` under its general font system. The key functions (`R_LoadHiResTexture` with `"fonts:charsets"` search group, `Font_LoadFontLump`) are not in the FTE extractor's `LOADER_FUNCTIONS` watchlist or `FUNCTION_TO_CATEGORY` mapping. Adding `R_LoadHiResTexture` with enclosing-function context from `gl_font.c`'s font-loading path, and a `con_textfont` cvar cross-reference, would surface FTE charset sites under a `fte:asset_category:charset` category.

This gap does not block the draft because the FTE mechanism is source-verified and the draft documents it via prose with explicit "source-verified, no L1 backing" hedges in the cross-engine section.

---

## Calibration notes (Round 3 -- Brief tier discipline)

These observations are for the calibration record; they are not operational findings.

1. **Tier classification ambiguity**: The template lists charset as a Moderate example (70-110 lines). The handoff expected Brief (30-80 lines, "single-engine surface"). The tension resolves: charset has multi-mechanism ezQuake loading (PNG primary path + LMP fallback + locale sub-variants + OnChange trigger) even though it's effectively single-engine in L1. The note landed at ~70-80 body lines -- at the Brief/Moderate boundary, satisfying both.

2. **Cross-engine section when one engine has no L1**: The handoff flagged this as unambiguous-asymmetry shape. Resolved: section is present with explicit "FTE: source-verified but no L1 backing" wording. The section is about 12 lines, compressed to one paragraph per engine. "Skip otherwise" from the template guideline was interpreted as "skip if engines are identical", not "skip if one engine is absent from L1".

3. **related_entities scope -- ezQuake**: `scr_coloredText` is declared in `r_draw_charset.c` and affects how the charset renders colored text. It is border-line for inclusion: it affects charset rendering behavior but is not a load cvar. Included because the template says "every cvar/command the engine recognizes for this asset_type" and this cvar is in the same source file, registered in `Draw_InitFont`. The adjacency rule applies: the LLM cannot find it via this note without the entry. Included.

4. **FTE `gl_font` vs `con_textfont`**: Both are declared in the same RENDERERCALLBACK block. `con_textfont` is the console-specific font (alias: `gl_consolefont`); `gl_font` is more general. Both included in related_entities. The "user types at console" criterion from the template: both are user-settable; included.

5. **No concept-note partner**: README.md explicitly lists charset as a non-candidate ("charset, conback, levelshot, etc. -- file loads, done"). No suggestion generated.
