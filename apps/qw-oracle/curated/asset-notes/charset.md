---
slug: charset
asset_type: charset
engine_canonical_paths:
  ezquake:
    - gfx/<name>.lmp
    - textures/charsets/<name>
  fte:
    - charsets/<name>
    - textures/charsets/<name>
    - gfx/conchars.lmp
  qwcl:
    - gfx/conchars.lmp
  mvdsv: []
user_install_paths:
  - qw/textures/charsets/<name>.<ext>
corpus_categories:
  - Charsets
  - Charsets / 256x256
  - Charsets / 512x512
  - Charsets / 1024x1024 or larger
related_entities:
  - ezquake:cvar:gl_consolefont
  - ezquake:command:loadcharset
  - ezquake:cvar:gl_charsets_min
  - ezquake:cvar:gl_alphafont
  - ezquake:cvar:scr_coloredText
  - fte:cvar:con_textfont
  - fte:cvar:gl_font
companion_asset_types: []
l1_canonical_ids:
  ezquake:
    - ezquake:loader_site:R_LoadCharsetImage_r_draw_charset_Load_Locale_Charset_1
    - ezquake:loader_site:Load_LMP_Charset_r_draw_charset_Load_Locale_Charset_1
    - ezquake:loader_site:Load_LMP_Charset_r_draw_charset_Draw_LoadCharset_1
    - ezquake:loader_site:R_LoadCharsetImage_r_draw_charset_Draw_LoadCharset_1
    - ezquake:loader_site:Load_Locale_Charset_r_draw_charset_Draw_LoadCharset_1
    - ezquake:loader_site:Load_Locale_Charset_r_draw_charset_Draw_LoadCharset_2
    - ezquake:loader_site:Load_Locale_Charset_r_draw_charset_Draw_LoadCharset_3
    - ezquake:loader_site:Draw_LoadCharset_r_draw_charset_OnChange_gl_consolefont_1
    - ezquake:loader_site:Draw_LoadCharset_r_draw_charset_Draw_InitCharset_1
    - ezquake:loader_site:Draw_LoadCharset_r_draw_charset_Draw_InitCharset_2
    - ezquake:loader_site:R_LoadImagePixels_r_texture_load_R_LoadCharsetImage_1
  fte: []
  qwcl: []
  mvdsv: []
status: CONFIDENT
last_verified: 2026-05-14
authority_grounds: engine_mechanics
---

## Description

A charset is the bitmap font texture used to render console text, status bar characters, and in-game messages. It stores 256 glyphs in a 16x16 grid; each glyph occupies 8x8 pixels in the stock 128x128 file. The stock charset (`gfx/conchars.lmp`) ships inside `gfx.wad`; community replacements are standalone image files installed by name. ezQuake ships with `povo5` as its bundled default.

## How it loads

**ezQuake** (`src/r_draw_charset.c`):

At startup `Draw_InitCharset` calls `Draw_LoadCharset(gl_consolefont.string)` (line 714). Two branches:

- If `gl_consolefont` is `"original"`: calls `Load_LMP_Charset("charset", ...)` which reads directly from `draw_chars` -- the WAD `conchars` lump already in memory (line 66-68). No disk read.
- Otherwise: calls `R_LoadCharsetImage(va("textures/charsets/%s", name), ...)` (line 183). If that fails, falls back to `Load_LMP_Charset` with `gfx/<name>.lmp`.

If the named charset fails to load on init, the engine retries with `"original"` (line 717) and calls `Sys_Error` only if that also fails.

Runtime change: setting `gl_consolefont <name>` triggers `OnChange_gl_consolefont` (line 215) which re-runs `Draw_LoadCharset`. The `/loadcharset <name>` command (registered line 682) is a thin wrapper that calls `Cvar_Set(&gl_consolefont, name)`.

Locale variants: after loading the primary charset, `Draw_LoadCharset` loads alternate-charset slots for non-ASCII script support. When `gl_charsets_min 1` (default), only the `-cyr` Cyrillic variant (slot 4) is loaded. When `gl_charsets_min 0`, all numbered variants (`000`--`NNN`) are loaded. Each variant loads from `textures/charsets/<name>-<cyr|NNN>` (image) or `conchars-<cyr|NNN>` (LMP fallback).

## Install layout

Drop the file at `qw/textures/charsets/<name>.<ext>` where `<name>` is what you will pass to `/loadcharset` or `gl_consolefont`. Extensions `.png`, `.tga`, `.bmp`, `.pcx`, and `.lmp` are all accepted by the image loader.

Then activate: `/loadcharset <name>` or `gl_consolefont <name>`. Use `gl_consolefont original` to revert to the built-in WAD charset.

To make the selection permanent, set `gl_consolefont <name>` in `qw/autoexec.cfg`.

## Cross-engine differences

**ezQuake:** Full custom charset support. Primary path is `textures/charsets/<name>.<ext>`; fallback is `gfx/<name>.lmp`. Default charset is `povo5`. Locale sub-variants controlled by `gl_charsets_min`. Source authority: `src/r_draw_charset.c`.

**FTE:** Routes charset loading through its general font system (`engine/gl/gl_font.c`), not a dedicated charset module. The cvar is `con_textfont` (alias: `gl_consolefont`); default is empty (uses built-in conchars). FTE accepts both bitmap charset images and TTF/OTF font files as values. When set to an image name, FTE searches `charsets/<name>.*` and `textures/charsets/<name>.*` -- the same physical paths as ezQuake's install directory. FTE also has `gl_font` as a parallel font selector. Source authority: `engine/client/renderer.c:399`, `engine/gl/gl_font.c:2629`. FTE L1 has 0 charset-categorized sites (extractor gap -- `gl_font.c` is outside current watchlist scope).

**QWCL (original 2.33):** No user-selectable charset. Loads conchars from `gfx.wad` via `W_GetLumpName("conchars")` (`QW/client/gl_draw.c:406`). No cvar; no install path.

**MVDSV:** Server-side only. No rendering subsystem; no charset loading.

## Community conventions

The qw.nu corpus has 61 charset bundles. All install paths confirmed at `qw/textures/charsets/<name>.<ext>` (gfx_faq QID 19). PNG is the dominant format in modern releases; the community sub-categorizes by resolution (256x256, 512x512, 1024x1024+). Higher resolutions render best when `-conwidth` is set proportionally to `-width`; mismatched scaling degrades quality (detailed in ezquake-docs `charsets.md` guide).

## Edge cases

- **"original" bypass**: `gl_consolefont original` is a special name that routes to the in-memory WAD lump rather than any file on disk. It never reads `textures/charsets/original.<ext>`.
- **Load protection**: `Draw_LoadCharset` does not replace the active `char_textures[0]` when the new load fails. The previous charset stays active; the user gets a console warning. This prevents a bad charset name from leaving the console unreadable.
- **Locale slots are supplemental**: The locale sub-variants (`-cyr`, `-NNN`) fill character slots 1+ in `char_textures[]`. Slot 0 is always the primary charset. A locale charset missing from disk simply leaves that slot empty; the primary charset remains functional.
- **MCHARSET_PATH**: `gfx/mcharset.png` is a separate engine-internal image used by `R_Draw_CharacterBase` for HUD character rendering (categorized `hud_overlay` in L1, not `charset`). It is not user-replaceable via `gl_consolefont`.
