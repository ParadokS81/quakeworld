# Probe report: P1 -- KTX in-repo

> Fixed schema. Every field is mandatory. One block per (source, domain) pair.
> Coverage denominators come from `probe-0-l1-baseline.md` -- read it first.

## Source: research/repos/ktx/src/world.c (RegisterCvar / RegisterCvarEx call sites)

### Domain: cvars

- **Coverage count:** 68 of 260 cvars carry a trailing `//` comment at the RegisterCvar call site (26%). Denominator M source: probe-0 (`ktx` `cvars` registered set = 260). Verified from the extractor AST at `apps/qw-oracle/scripts/extractors/ktx/output/ktx-variables-ast.json` (`with_comments by file: {src/world.c: 68}`). The 260 L1 cvars split across two call-site files: `src/world.c` (222 unique names) and `src/bot_botimp.c` (38 unique names via locally-defined `FB_CVAR_*` macros at bot_botimp.c:15-52). Zero trailing comments exist on any `bot_botimp.c` call site.
- **Format:** source `//` inline comment on the RegisterCvar / RegisterCvarEx call line -- e.g. `RegisterCvar("k_matchless_max_idle_time"); // maximum time user can be idle in matchless mode` (world.c:797).
- **Structure quality:** Mixed. Of the 68 commented call sites, most are free prose (one-liner descriptions). Approximately 20-25 carry light enum annotations like `// (0 = off, 1 = on)` inline but these are brief and not the canonical value table -- the shipped config (see ktx.cfg source below) is richer. No range bounds, no type information at the call site. Example of richer call: `RegisterCvarEx("k_fp_spec", "3"); // say floodprot for spectators` (world.c:1008) -- label only. Enum-parseable fraction at call site: low.
- **Overlap / conflict:** The 22 cvars that appear both here (with source comment) and in ktx.cfg (shipped config) have independent descriptions that overlap thematically but differ in wording and detail. ktx.cfg descriptions are consistently richer with enum tables; no factual conflicts observed.
- **Extractability for a future L1 spine:** mechanical -- the extractor already harvests `trailing_comment` per call site and stores it as `description_origin=source_inline` in the `entities` table. The 192 NULL-description cvars have no call-site comment to harvest.

---

## Source: research/repos/ktx/resources/example-configs/ktx/ktx.cfg

### Domain: cvars

- **Coverage count:** 90 of 260 L1 KTX cvars appear in ktx.cfg with an admin-facing `//` comment (34.6%). Denominator M source: probe-0 (`ktx` `cvars` registered set = 260). All 93 `set` lines in ktx.cfg carry a trailing comment (93/93 = 100% comment coverage within the file). Of the 93 `set` lines, 90 resolve to KTX-registered L1 cvars; the remaining 3 (`k_666`, `k_dm2mod`, `sv_maxrate`) are either legacy names absent from current RegisterCvar call sites or MVDSV-owned cvars.

  Additive coverage vs source_inline: the 90 ktx.cfg KTX cvars include 22 that already have a source comment (overlap) and 68 that are bare at the call site. ktx.cfg therefore adds **68 uniquely documented cvars** not reachable from world.c comments alone. Combined (source comment OR ktx.cfg): **136 of 260 (52%)** cvars have at least one admin-facing description. Remaining gap: **124 of 260 (48%)** cvars are undescribed in both surfaces.

- **Format:** shipped admin config `// comment` -- each set line has a right-aligned column of `// <description>`, often with enum tables. Example: `set k_spw  4  // spawn mode (0 = qw respawns, 1 = kombat teams spawn safety, 2 = kombat teams respawns, 3 = ktx respawns, 4 = ktx2 respawns)`. Multi-line bit-mask tables appear as continuation comment lines below the set line (e.g. `k_disallow_weapons`, `k_allowed_free_modes`, `k_spec_info`, `timing_players_action`, `serverinfo fpd` in mvdsv.cfg).

- **Structure quality:** High -- this is the richest parseable surface found in the KTX in-repo investigation. 53 of 93 set lines carry enum-parseable value tables of the form `N = label` (e.g. `0 = off, 1 = on, 2 = liquid`) recoverable as dropdown choices. 4 entries use a bit-mask table with continuation lines listing each bit and its meaning -- parseable into checkbox sets. The remaining ~36 carry free-prose descriptions (counts, URLs, format strings). Structure quality for GUI dropdown generation: **parseable for ~57% of documented cvars**.

- **Overlap / conflict:** mvdsv.cfg in the same shipped-config directory sets 61 additional cvars, all MVDSV-owned (0 overlap with KTX L1 M=260). No conflicts observed between ktx.cfg descriptions and world.c trailing comments for the 22 shared cvars -- ktx.cfg is uniformly more detailed.

- **Extractability for a future L1 spine:** mechanical -- regex `^set\s+(\S+)\s+\S+\s+//\s*(.+)$` captures name + description for single-line entries; a second pass handles continuation-line bit tables. The enum `N = label` sub-structure is machine-parseable with a further regex. This is the highest-value mechanical extraction target for filling the 124-cvar gap (partially -- ktx.cfg covers 68 of the 192 NULL cvars).

---

## Source: research/repos/ktx/resources/example-configs/ktx/mvdsv.cfg

### Domain: cvars

- **Coverage count:** 0 of 260 KTX cvars documented here (0%). Denominator M source: probe-0 (`ktx` `cvars` registered set = 260). mvdsv.cfg sets 61 cvars, all MVDSV-owned (`sv_*`, `fraglimit`, `timelimit`, etc.) with no overlap with KTX's RegisterCvar-registered set. Noted here because mvdsv.cfg is a shipped admin surface that documents MVDSV cvars richly (61/62 set lines have `//` comments) -- relevant to probe-2 (MVDSV in-repo) coverage of `mvdsv cvars M=183`.

- **Format:** same `// comment` style as ktx.cfg; also includes multi-line bit-mask continuation for `serverinfo fpd` (8 bit entries, mvdsv.cfg:42-52).
- **Structure quality:** same as ktx.cfg -- enum-parseable value tables present, bit masks with continuation lines. High structure quality for the MVDSV cvars it covers.
- **Overlap / conflict:** none with KTX domain; pure MVDSV surface.
- **Extractability for a future L1 spine:** mechanical -- same regex pattern as ktx.cfg. Relevant to the MVDSV cvar gap (148 NULL), not the KTX gap.

---

## Source: research/repos/ktx/src/commands.c (CD_* description table)

### Domain: commands

- **Coverage count:** 311 of 358 KTX commands carry a real CD_ description string (87%). 47 of 358 carry CD_NODESC ("no desc") which is the explicit no-description sentinel. Denominator M source: probe-0 (`ktx` `commands` registered set = 358). Verified from the extractor AST `_stats.with_description = 311` at `apps/qw-oracle/scripts/extractors/ktx/output/ktx-commands-ast.json`.

  Structural detail: commands.c:693 defines `cmd_t cmds[]` with 326 entries (cmds[] table closes at line 1063, verified `int cmds_cnt = sizeof(cmds)/sizeof(cmds[0])` at line 1067). An additional 32 commands come from two further tables (`std_commands` 14 entries, `editor_commands` 25 entries -- total 358 per AST). Of the 47 without description: 3 use CD_NODESC directly in the table; 44 use CD_ alias macros that are `#define`d as `(CD_NODESC)` (see commands.c:403-670 for the full alias list -- FAV4_ADD through FAV18_ADD (15), 4FAV_GO through 18FAV_GO (15), CD_KSOUND1-6, CD_MNS_WP_STATS, CD_MNS_SCORES, CD_GIVEME, CD_DROPITEM, CD_REMOVEITEM, CD_DUMPENT, CD_MAPSLIST_DL, CD_CMDSLIST_DL).

- **Format:** C `#define CD_NAME "description string"` macros referenced in the command table struct. Each CD_ string is a short admin-facing one-liner (e.g. `"alternative map vote system"`, `"vote percentage for admin election"`). Character set: plain ASCII, 5-60 chars.
- **Structure quality:** free prose only -- no enum tables, no range bounds in the CD_ strings. The strings are purely human-readable labels with no machine-parseable value structure. The command name itself and handler function name are in the struct and carry semantic signal.
- **Overlap / conflict:** probe-0 confirms 311/358 already loaded as `description_origin=source_inline` in L1. No other source duplicates the CD_ surface for KTX commands. No conflicts observed.
- **Extractability for a future L1 spine:** mechanical -- already extracted. The CD_ macro resolution is implemented in `apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py`. The 47 CD_NODESC entries are structurally flagged (`description_source=null` in AST) and would need a different source (none found in-repo) to gain descriptions.

---

## Source: research/repos/ktx/resources/example-configs/ktx/configs/usermodes/

### Domain: modes

- **Coverage count:** 13 of 27 L1 game_mode catalog entries have a named usermode directory under configs/usermodes/ (48%). Denominator M source: probe-0 (`ktx` `modes` game_mode catalog = 27). The 14 directories found are: `10on10`, `1on1`, `2on2`, `2on2on2`, `3on3`, `3on3on3`, `4on4`, `4on4on4`, `XonX`, `ca`, `ctf`, `ffa`, `tot` -- and `matchless`, which is NOT in the L1 game_mode catalog (it is a server-operation mode, not a KTX game_mode kind). So 13 L1 modes have directories; 14 directories exist total (one extra: `matchless`).

  The 14 L1 game_modes with no usermode directory: `berzerk`, `blitz2v2`, `blitz4v4`, `bloodfest`, `freshteams`, `hoonymode`, `instagib`, `killquad`, `lgc`, `midair`, `nosweep`, `race`, `wipeout`, `yawnmode`.

  Beyond the 14 named mode directories, 43 flat `.cfg` files exist at the top level of usermodes/ -- these are map-name-matched variant configs (e.g. `anarena.cfg`, `dm2dmm4.cfg`, `hammer.cfg`) that override settings for specific maps regardless of mode. These are NOT mode definitions; they serve as map-specific ruleset overlays.

  Inside mode directories: most contain only an empty or near-empty `default.cfg`. `1on1/` adds a `ra/` subdirectory (rocket-arena variant). `matchless/` is the richest directory with 13 sub-configs and the most commented default.cfg (12/15 set lines with comments, 10 in KTX L1). `ctf/` contains a map-specific variant (`qwq3wcp9.cfg`).

  Total cfg files under usermodes/ tree: 76.

- **Format:** shipped admin configs -- `set k_foo value` lines, some with `// comment`, others bare. The matchless/default.cfg is the best-documented example (12 of 15 set lines commented with enum tables).
- **Structure quality:** Low for most mode directories (empty or near-empty defaults). The matchless/default.cfg has enum-parseable value tables (`0 = off, 1 = on` style) for 8 of 12 commented lines. The flat map-variant cfgs are mostly uncommented. Overall: this surface tells you *what cvars each mode sets* (mode_default semantics) but rarely explains *why* or gives value ranges.
- **Overlap / conflict:** The mode_default cvar-overlay rows in L1 (M=317) are structurally extracted from the source init functions (`*_um_init` arrays in commands.c), not from these shipped cfgs. The shipped cfgs can drift from the source defaults -- they represent operator-recommended starting points, not guaranteed source-of-truth. For example, matchless/default.cfg sets `k_specktalk` (absent from KTX L1 as a typo variant of `k_spectalk`) suggesting some cfg content has not been audited against current source.
- **Extractability for a future L1 spine:** LLM-assisted -- the flat map-variant cfgs and the thin mode directories provide weak signal. The matchless/default.cfg comments are mechanically extractable (same regex as ktx.cfg). For modes without directories, no in-repo config surface exists.

---

## Probe notes

### Cvar gap summary: what remains after P1

After combining both in-repo cvar surfaces (world.c trailing comments + ktx.cfg shipped config), 136 of 260 KTX cvars (52%) have at least one admin-facing description. The remaining 124 (48%) are completely undescribed in-repo. The 124 include the 38 bot `k_fbskill_*` cvars (registered in bot_botimp.c with no comments anywhere) and 86 other k_* cvars that have neither a world.c trailing comment nor a ktx.cfg entry.

### Bot cvars: a buried cluster

38 of the 260 L1 KTX cvars are bot-AI-tuning parameters (`k_fbskill_*`) registered in `src/bot_botimp.c`. These cvars receive zero admin-facing documentation in any in-repo file -- not in ktx.cfg, not in any shipped config, and not as comments at the RegisterCvar call sites. The macro names (`FB_CVAR_DODGEFACTOR` etc.) provide structural hints at meaning but no value ranges or operational guidance. This cluster is the single largest contiguous undescribed group.

### matchless is not a game_mode: taxonomy note

The `configs/usermodes/matchless/` directory documents a server-operation mode (FFA/public matchless play) that is represented in KTX source as a behavioral flag (`k_matchless` cvar), not as a game_mode kind in the L1 modes catalog. The L1 game_mode catalog contains 27 named game types extracted from the `um_init_string` array at commands.c:4528+; `matchless` does not appear there. This is consistent with the L1 baseline (probe-0 modes M=27 = game_mode catalog). The matchless/default.cfg is still a useful admin-doc surface for matchless-operation cvars even though it does not map to a game_mode entity.

### info_keys: thin in-repo surface

KTX produces 7 star-key userinfo writes (`*at`, `*is`, `*ml`, `*mm`, `*mp`, `*mt`, `*mu` -- all suffixed `:userinfo`). No in-repo documentation exists for these keys beyond the SetUserInfo call sites themselves. The call-site context (surrounding code, function names) provides semantic signal (e.g. `*at` = autotrack setting at commands.c confirmed by `// so we can restore it on level change`) but no admin-facing description. These 7 are already 100% described in L1 via source_inline. No gap for info_keys from this probe.

### log_templates: no in-repo prose documentation

1195 log_template entities exist in L1 (all source_inline from printf format-string extraction). No separate documentation file exists in the KTX repo for the log output format. The XSD at `resources/extralog/ktxlog_0.1.xsd` (118 lines) documents 7 match_event types structurally (typed attributes per event) but does not document the 1195 broadcast/client/console log_template strings.

### match_events: XSD is the canonical doc surface

7 KTX match_event types (damage, death, drop_backpack, drop_powerup, pick_backpack, pick_mapitem, pick_powerup) are documented structurally in `resources/extralog/ktxlog_0.1.xsd`. The XSD provides attribute names and XSD types (xs:decimal, xs:string, xs:boolean, xs:nonNegativeInteger) but no prose descriptions of attribute semantics. All 7 are already at 100% in L1 (description_origin=synthesized). The XSD is the richest match_event documentation source in-repo and is already the extraction anchor for the match_events handler.

### gameplay_tables / gameplay_taxonomies: no in-repo prose

The L1 gameplay_tables (83 entries: score_system 3 / drop_item 31 / loc_macro 15 / teamplay_message 21 / monster 13) and gameplay_taxonomies (32 entries: election_type 5 / death_rule 27) are structurally extracted from source (X-macro tables, init arrays). No separate admin-prose documentation exists in-repo for these. The deathtype enum in `include/deathtype.h` and the `UserModes_t` enum in `include/g_local.h:171-188` provide machine-readable taxonomy structure without prose descriptions.

### k_666 and k_dm2mod: documented in ktx.cfg but not in L1

ktx.cfg documents two cvars (`k_666`, `k_dm2mod`) that do not appear in the current RegisterCvar call-site set (M=260). These names appear in older KTX config examples but the cvars are not registered in the current source tree. `sv_maxrate` in ktx.cfg is an MVDSV cvar used by KTX logic (world.c:1560) but not KTX-registered. These 3 are a config-drift signal: ktx.cfg has not been fully audited against the current source cvar set.

### Enum density: ktx.cfg is the primary structured surface

Of the 93 ktx.cfg set lines: 53 carry enum-parseable `N = label` value tables (57%), 4 carry bit-mask tables with multi-line continuation (4%), and ~36 carry free prose only (39%). This makes ktx.cfg the primary structured surface for future GUI dropdown generation for the 90 documented cvars. The world.c trailing comments are predominantly free prose with only occasional inline enum hints.
