# ezQuake extension coverage audit

**Generated:** 2026-05-14
**Source:** research/repos/ezquake-source/src/
**Seed reference:** apps/qw-oracle/scripts/extractors/ezquake/_handler_asset_loader_sites.py EXT_TO_CATEGORY
**Corpus:** /home/paradoks/sandboxes/qw3-abab-gfx/

## Summary

- Extensions in source: 56 (unique, post-filter)
- Extensions in seed: 29
- Extensions in corpus: 23
- NEW extensions surfaced (source not in seed): 33
- Corpus-only extensions (corpus not in source): 17
- Seed-only (not in source OR corpus): 6

## Source-NOT-in-seed (potential missed asset_types)

### `.00`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `fragstats.c:34` (ezquake-1.00)

### `.0001`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `parser.c:1541` (-0.0001)

### `.10s`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `sv_main.c:3715` ((%d)%-.10s)

### `.1f`
- **Source occurrences:** 8
- **Corpus occurrences:** 0
- **Sample contexts:** `hud_performance.c:125` (%3.1f\xf%3.1f); `hud_performance.c:128` (%3.1f); +6 more

### `.20s`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `EX_browser.c:2412` (Remove %-.20s)

### `.2f`
- **Source occurrences:** 2
- **Corpus occurrences:** 0
- **Sample contexts:** `r_atlas.c:87` ([atlas] !! not adding %d [%s] to delete list (incomplete texture): %.2f %.2f %.2f %.2f); `settings_page.c:134` (%3.2f)

### `.30`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `cl_parse.c:2289` (MVDSV 0.30)

### `.3f`
- **Source occurrences:** 5
- **Corpus occurrences:** 0
- **Sample contexts:** `cl_screen.c:447` (%.3f); `hud_qtv.c:43` (%6dms %5db %2.3f); +3 more

### `.40`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `sv_main.c:1943` (addip 192.246.40)

### `.59`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `irc.c:31` (194.124.229.59)

### `.8g`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `cvar.c:332` (%.8g)

### `.avi`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `movie.c:289` (.avi)

### `.bak`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `config_manager.c:953` (.bak)

### `.ent`
- **Source occurrences:** 3
- **Corpus occurrences:** 0
- **Sample contexts:** `sv_init.c:586` (maps/%s/%s.ent); `sv_init.c:593` (maps/%s.ent); +1 more

### `.glsl`
- **Source occurrences:** 15
- **Corpus occurrences:** 0
- **Sample contexts:** `gl_aliasmodel_md3.c:28` (glsl/constants.glsl); `gl_program.c:28` (glsl/constants.glsl); +13 more

### `.gz`
- **Source occurrences:** 4
- **Corpus occurrences:** 1
- **Sample contexts:** `EX_FileList.c:1025` (%s.gz); `cl_demo.c:2218` (mvd.gz); +2 more

### `.json`
- **Source occurrences:** 5
- **Corpus occurrences:** 2
- **Sample contexts:** `help.c:1082` (qw/help_variables.json); `help.c:1083` (qw/help_commands.json); +3 more

### `.link`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `r_texture_load.c:281` (%s.link)

### `.local`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `sys_posix.c:804` (%s/.local)

### `.lst`
- **Source occurrences:** 2
- **Corpus occurrences:** 0
- **Sample contexts:** `fs.c:520` (%s/pak.lst); `fs.c:2772` (%s/pak.lst)

### `.map`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `vm.c:451` (%s.map)

### `.md1`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `r_aliasmodel_md3.c:43` (.md1)

### `.net`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `EX_browser.c:1814` (QuakeServers.net)

### `.nu`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `config_manager.c:1215` (www.QuakeWorld.nu)

### `.pts`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `r_part.c:210` (maps/%s.pts)

### `.qpn`
- **Source occurrences:** 2
- **Corpus occurrences:** 0
- **Sample contexts:** `cl_main.c:2970` (qw/%s.qpn); `cmodel.c:987` (maps/%s.qpn)

### `.qvm`
- **Source occurrences:** 3
- **Corpus occurrences:** 0
- **Sample contexts:** `fs.c:2950` (vm/cgame.qvm); `fs.c:2957` (vm/ui.qvm); +1 more

### `.sav`
- **Source occurrences:** 14
- **Corpus occurrences:** 0
- **Sample contexts:** `menu.c:944` (s0.sav); `menu.c:944` (s1.sav); +12 more

### `.skin`
- **Source occurrences:** 2
- **Corpus occurrences:** 0
- **Sample contexts:** `r_aliasmodel_md3.c:95` (%s_%d.skin); `r_aliasmodel_md3.c:101` (%s_%s.skin)

### `.stuff`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `cl_cmd.c:317` (.stuff)

### `.ttf`
- **Source occurrences:** 2
- **Corpus occurrences:** 0
- **Sample contexts:** `fonts.c:249` (.ttf); `fonts.c:470` (.ttf)

### `.xxx`
- **Source occurrences:** 1
- **Corpus occurrences:** 0
- **Sample contexts:** `r_draw.c:1072` (textures/levelshots/%s.xxx)

### `.zip`
- **Source occurrences:** 1
- **Corpus occurrences:** 610
- **Sample contexts:** `menu_demo.c:892` (.zip)

## Corpus-NOT-in-source (user files engine doesn't reference)

### `.css`
- **Corpus occurrences:** 1

### `.gif`
- **Corpus occurrences:** 30

### `.ico`
- **Corpus occurrences:** 1

### `.idx`
- **Corpus occurrences:** 3

### `.ini`
- **Corpus occurrences:** 1
- **Hint:** Configuration or metadata (may not be loaded by engine directly)

### `.js`
- **Corpus occurrences:** 2

### `.md`
- **Corpus occurrences:** 2
- **Hint:** Documentation / metadata files

### `.ndjson`
- **Corpus occurrences:** 3

### `.pack`
- **Corpus occurrences:** 3

### `.php`
- **Corpus occurrences:** 30

### `.py`
- **Corpus occurrences:** 4

### `.rev`
- **Corpus occurrences:** 3

### `.sample`
- **Corpus occurrences:** 12

### `.sql`
- **Corpus occurrences:** 1

### `.tar`
- **Corpus occurrences:** 1

### `.txt`
- **Corpus occurrences:** 1
- **Hint:** Documentation / metadata files

### `.yml`
- **Corpus occurrences:** 1
- **Hint:** Configuration or metadata (may not be loaded by engine directly)

## Seed-NOT-in-source-OR-corpus (potentially dead seed entries)

### `.dll`
- **Status:** Catalogued in seed but not referenced by source code or found in corpus.
- **Hint:** Plugin binaries (loaded conditionally; may not be used in default builds)

### `.jpeg`
- **Status:** Catalogued in seed but not referenced by source code or found in corpus.

### `.kmap`
- **Status:** Catalogued in seed but not referenced by source code or found in corpus.

### `.ogg`
- **Status:** Catalogued in seed but not referenced by source code or found in corpus.

### `.qtv`
- **Status:** Catalogued in seed but not referenced by source code or found in corpus.

### `.rc`
- **Status:** Catalogued in seed but not referenced by source code or found in corpus.

## Path-prefix observations

Common path prefixes from source-code string literals (indicating asset categories):

- `progs/` -- 251 occurrences
- `gfx/` -- 40 occurrences
- `maps/` -- 38 occurrences
- `misc/` -- 35 occurrences
- `sound/` -- 34 occurrences
- `%s/` -- 16 occurrences
- `sprites/` -- 15 occurrences
- `glsl/` -- 15 occurrences
- `items/` -- 8 occurrences
- `weapons/` -- 7 occurrences
- `client/` -- 6 occurrences
- `qw/` -- 6 occurrences
- `./` -- 6 occurrences
- `skins/` -- 3 occurrences
- `ambience/` -- 2 occurrences
