# Layer 1 Entity Types (ezQuake)

Per-entity-type short-form documentation for Layer 1 of the QW Oracle knowledge service. Each entry uses the same five-field template plus a verification-status field, so consumers reason about each type in a consistent shape.

> **Scope and currency note (2026-04-29):** this doc covers **ezQuake only** (the 10 entity types loaded for that project). It was authored 2026-04-22 by Pass 2 of the knowledge-service realignment roadmap and predates the FTE / QWCL / MVDSV ports. Numbers and paths below are pre-Phase-6:
> - Entity counts (e.g. "cvar 2901") are from a 2026-04-22 snapshot; current ezQuake@head counts live in the DB and `OVERVIEW.md` § Domain inventory.
> - All `Sources:` / `Extractor:` references citing `packages/qw-config/scripts/...` paths predate the qw-config dissolution (2026-04-25). Real paths are `apps/qw-oracle/scripts/extractors/<project>/_handler_*.py` (post 2026-04-28 architecture consolidation).
> - The closing "Future engine ports inherit this shape" section was authored when only ezQuake was loaded; FTE / QWCL / MVDSV all shipped between 2026-04-25 and 2026-04-27.
>
> A full refresh covering all four projects + the `qw` namespace is queued. Until it lands, treat this doc as ezQuake background reading; treat `SCHEMA.md` + the live DB + `docs/arc-history.md` as the authoritative current state.

This doc is linked from `apps/qw-oracle/README.md` and from the monorepo-level `OVERVIEW.md`.

**Runtime coverage verified 2026-04-25** via in-engine `cvarlist` / `cmdlist` dump diff:
- **cvar**: 99.8% name coverage (2688/2693 runtime cvars in DB). Real gaps = 0; the 4 residuals are dynamically-created teamsay macros (`Cvar_Create` at config-exec time — out of reach for static extraction).
- **command**: 100% of source-registered commands. The 130 runtime "gaps" are all HUD auto-synthesized names (+hud_*, -hud_*, plain plain-name toggles) already present in the DB as `hud_element`, a richer type.
- **20-row field-accuracy sample**: 20/20 fields (default_value, flags_raw, on_change, source_file/line, trailing_comment) match source exactly, including binary-escaped default values and HUD positional-arg defaults.
- See `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` § Registration pattern catalog and `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` for the post-Phase-6 procedures, or `docs/superpowers/specs/2026-04-24-layer1-doc-only-audit-findings.md` for the original audit that produced these numbers.

## Contents

Each section below is collapsed by default. Click an entry to expand it, or use the anchor links here.

**Primary entity types**

- [cvar](#cvar) - 2901 entries - `ast_verified`
- [command](#command) - 522 entries - `ast_verified`
- [macro](#macro) - 68 entries - `ast_verified`
- [cmdline_param](#cmdline_param) - 71 entries - `ast_verified`
- [keyname](#keyname) - 148 entries - `ast_verified`
- [hud_element](#hud_element) - 83 entries - `ast_verified`
- [ruleset](#ruleset) - 6 entries - `ast_verified`
- [token_primitive](#token_primitive) - 33 entries - `ast_verified`
- [flag_bit](#flag_bit) - 50 entries - `ast_verified`
- [asset_category](#asset_category) - 17 categories - `seed_only_with_ast_support`

**Asset relations (sub-tables of asset_category)**

- [asset_extensions](#asset_extensions-relation) - `seed_only_with_ast_support` with row-level findings
- [asset_path_rules](#asset_path_rules-relation) - 14 rules - `ast_verified`
- [asset_cvar_bindings](#asset_cvar_bindings-relation) - 26 rows - `seed_only_with_ast_support`
- [asset_loader_sites](#asset_loader_sites-relation) - 128 sites - `ast_verified`

See [How to read this doc](#how-to-read-this-doc) and [Verification statuses](#verification-statuses) for what the fields and status tags mean.

## How to read this doc

- Five fields per entry: **what it entails** (what the data is), **why we extract it** (the motivation), **example** (real sample), **consumers** (who reads it), **sources** (schema anchor, extractor, seed if any).
- A sixth field, **verification status**, labels how strongly the AST supports the claim. See [Verification statuses](#verification-statuses) below.
- Short-form is the contract. For the full schema shape see `SCHEMA.md`. For extractor mechanics see `OVERVIEW.md` and the extractor scripts themselves.

## Verification statuses

Every entity type and every individual row in the DB carries one of four statuses. At the type level, the status summarizes the fleet; individual rows can deviate (especially for seed-backed tables) and those cases are called out inline.

- **ast_verified** - the extractor's AST pass found authoritative declarations in engine source. Counts match the data.
- **seed_only_with_ast_support** - a seed YAML provides the taxonomy; AST corroborates individual entries via related call sites or struct declarations.
- **seed_only_no_ast_support** - the seed YAML claims something the AST pass cannot verify. Either a legitimate cross-engine or external-tool catalog entry, or a bug to resolve in a future pass. Each row carries a reason.
- **orphaned_historical** - the engine no longer consumes this data. Files may still ship (e.g., in `ezquake.pk3`) for legacy reasons, but no current C code loads them. Documented rather than deleted, so readers see the "why."

---

## cvar

<details>
<summary>2901 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** User-tunable engine variable. The knob the player turns.

**Verification status:** ast_verified (2901 entries at ezQuake head; all backed by `Cvar_Register` / `Cvar_RegisterVariable` call sites).

**What it entails:** A named value the engine reads and the player can set. Covers every adjustable aspect of the client: graphics (`gl_fog`), input (`sensitivity`), gameplay toggles (`cl_smartjump`), teamplay behaviour (`tp_pickup`), HUD layout. The schema stores name, default, type (int/float/string/enum), description, flag bits (e.g., `CVAR_ARCHIVE`, `CVAR_USERINFO`), enum values where applicable, and the source file plus line where the cvar was declared. Per-field blame for default-overrides (`Cvar_SetDefault` / `Cvar_ForceSet`) is tracked in `source_overrides`.

**Why we extract it:** cvars are the primary surface a player tunes. A config file is 95% cvar assignments. Any consumer that wants to understand, visualize, or validate a config needs cvar definitions - types, defaults, valid enum values. Without this table, `seta crosshair 3` is just text. Oracle-provided cvar facts replace the per-consumer scraping that slipgate-app has carried up to now.

**Example:** `sensitivity 3.0`, `cl_crossx -2`, `gl_fog 1`. In-engine declaration: `cvar_t sensitivity = { "sensitivity", "3", CVAR_ARCHIVE | CVAR_USERINFO };`.

**Consumers:**
- slipgate ConfigViewer - renders cvars with descriptions, valid ranges, and defaults.
- Claude Code via MCP - answers "what does cvar X do" with stored description and flag-bit semantics.
- Config linter (future) - validates cvar assignments against type and enum constraints.
- cvar diff tools - computes per-version cvar changes across engine releases.

**Sources:**
- Schema: `SCHEMA.md` - `cvar_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-unified.py` (cvars handler in `extractor_lib/cvars.py`).
- Legacy sibling: `packages/qw-config/scripts/_legacy/extract-ezquake-cvars-clang.py` (kept for full-history backfill).

</details>

---

## command

<details>
<summary>522 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Console command the user can invoke. The verb the player types.

**Verification status:** ast_verified (522 entries at ezQuake head; all backed by `Cmd_AddCommand` registration sites).

**What it entails:** A named action registered with the console parser. When the user types `disconnect` or a bind fires `+jump`, a command handler runs. The schema stores name, help description (from `help_commands.json`), help group, C-side handler function name, and the file where registration happens. Case is preserved for display but canonical IDs are lowercased (QW commands are case-insensitive at the parser level).

**Why we extract it:** Commands + cvars together cover everything you can write in a config file. A bind targets commands (`bind MOUSE1 "+attack"`), an alias chains them, a config-line `impulse 2` is one. Consumers that parse configs, classify binds, explain what a line does, or show a commands reference need the command table.

**Example:** `+attack`, `+jump`, `say_team`, `impulse`, `connect`, `menu`. In-engine registration: `Cmd_AddCommand("impulse", CL_Impulse_f);`.

**Consumers:**
- slipgate ConfigViewer - classifies binds by whether the payload resolves to a command vs a cvar vs an alias.
- Claude Code via MCP - answers "what does command X do" and lists commands by category.
- Config linter (future) - catches typos ("did you mean `disconnect`?").

**Sources:**
- Schema: `SCHEMA.md` - `command_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-unified.py` (commands handler in `extractor_lib/commands.py`).

</details>

---

## macro

<details>
<summary>68 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Runtime substitution token in configs and teamsays.

**Verification status:** ast_verified (68 entries at ezQuake head; all backed by `Cmd_AddMacro` / `Cmd_AddMacroEx` registration sites. 2 declared-but-never-wired entries - `mp3_volume`, `mp3info` - are gated on a disabled MP3 build flag and carry `source_state` reflecting that gap).

**What it entails:** A `$<name>` token the engine expands when it evaluates a config line. Macros surface runtime facts (current health, current weapon, remaining ammo, time since damage) that scripts and teamsays use to parameterise messages. The schema stores name, help description, macro type (runtime vs static), teamplay-restriction flag (some macros are disabled during matches for anti-cheat reasons), related cvars, and the C-side handler function.

**Why we extract it:** A line like `say_team "I am at $location with $health health"` is meaningless text unless the consumer knows `$location` and `$health` are macro substitutions that the engine resolves on dispatch. Consumers that preview configs visually, simulate runtime state, or explain teamsay lines need the macro table. The teamplay-restriction flag matters because "what would this teamsay look like at a tournament" requires knowing which macros are silenced.

**Example:** `say_team "$health HP, $armor armor at $location"`. In-engine registration: `Cmd_AddMacro("health", Macro_Health);`.

**Consumers:**
- slipgate ConfigViewer pretty-view - substitutes `$health` etc. with sample values so configs read as intended output.
- slipgate StatePanel simulator - resolves runtime macros against a simulated player state.
- Claude Code via MCP - answers "what does $X expand to" and lists teamplay-restricted macros.

**Sources:**
- Schema: `SCHEMA.md` - `macro_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-unified.py` (macros handler in `extractor_lib/macros.py`).

</details>

---

## cmdline_param

<details>
<summary>71 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Command-line argument the engine consults at startup.

**Verification status:** ast_verified (71 entries at ezQuake head; all backed by `COM_CheckParm` call sites. Data-quality entries tracked in the source_state machinery: 8 declared-but-never-consulted params, 1 source-only undeclared `-noerrormsgbox`).

**What it entails:** A flag like `-basedir`, `-nohome`, `-conwidth` that the engine reads via `COM_CheckParm` during initialisation. The schema stores name, help description, argument shape (positional vs flag), feature flags, and the systems (windows / x11 / macos / all) that consume the param. Unlike cvars, cmdline params are one-shot - they're checked once at startup and shape engine behaviour before any config runs.

**Why we extract it:** Startup flags gate major engine behaviour - `-basedir` reshapes the filesystem stack, `-nohome` disables user-dir mounting, `-condebug` forces console logging. A consumer answering "why isn't my install finding this file" or documenting all launch options needs the cmdline param table. slipgate's client launcher will use this to validate the launcher's argv before spawning ezQuake.

**Example:** `ezquake.exe -basedir C:\Quake -nohome -condebug`. In-engine consumption: `if (COM_CheckParm("-nohome")) { ... }`.

**Consumers:**
- slipgate launcher - validates constructed argv against known params; surfaces invalid flags.
- Claude Code via MCP - answers "what does `-X` do" from the help description.

**Sources:**
- Schema: `SCHEMA.md` - `cmdline_param_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-unified.py` (cmdline-params handler in `extractor_lib/cmdline_params.py`).

</details>

---

## keyname

<details>
<summary>148 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Key code / key name mapping for the bind subsystem.

**Verification status:** ast_verified (148 entries at ezQuake head; backed by the `keynames[]` table. Build-variant rows: COMMAND / PARA / F13-F15 / KP_EQUAL appear only when the table is parsed with `-D__APPLE__`, recorded with a `build_variant='apple'` column).

**What it entails:** A two-way map between a keyboard scan code and the name the engine recognises in `bind` statements. The schema stores key code (numeric), key name (string, case preserved), key-code ident (the C enum), and the build variant if the entry is platform-specific. Aliases are preserved as separate rows with the same code (`SCROLLLOCK` / `SCROLLOCK` / `SCRLCK` all map to 130 - all three are valid bind targets).

**Why we extract it:** A bind statement is `bind <keyname> <payload>`. A consumer parsing a config must validate that `<keyname>` is something the engine recognises; a consumer displaying binds (virtual keyboard, keyboard-usage heatmap) must know which physical key each name corresponds to. Without this table, `bind SEMICOLON "say gg"` cannot be placed on a keyboard diagram.

**Example:** `bind MOUSE1 "+attack"`, `bind SPACE "+jump"`, `bind CTRL "+duck"`. In-engine declaration: `{"MOUSE1", K_MOUSE1}` inside `keynames[]`.

**Consumers:**
- slipgate ConfigViewer virtual-keyboard - positions each bind on the corresponding physical key.
- slipgate bind classifier - validates that the bind target is a real keyname.
- Claude Code via MCP - answers "which names can I bind to" and clarifies platform-conditional keys.

**Sources:**
- Schema: `SCHEMA.md` - `keyname_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-unified.py` (keynames handler in `extractor_lib/keynames.py`).

</details>

---

## hud_element

<details>
<summary>83 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Named HUD widget registered with `HUD_Register`.

**Verification status:** ast_verified (83 entries at ezQuake head; all backed by `HUD_Register(...)` call sites. Collectively they own 1404 synthesized `hud_*` child cvars via the `owned_cvars_json` column - every element synthesises a family of `hud_<name>_place`, `hud_<name>_show`, etc. cvars at registration).

**What it entails:** An element is a drawable HUD piece (score counter, ammo indicator, facial portrait, chat area). The schema stores display name, help description, alias, flag bits, min-state threshold, draw order, draw-fn identifier, enclosing-function (the C function that owns the registration), and the list of child cvars each element registers. The element's `flags_raw` / `min_state_raw` / `draw_order_raw` fields live at positional args in the `HUD_Register` call and are blamed via `source_overrides` with `override_kind='header_declaration'` - this is what makes "when did the ammo element's draw order change" answerable at per-field granularity.

**Why we extract it:** An ezQuake HUD config is a bag of `hud_*` cvars with no inherent structure; it's the hud_element table that tells you which cvars belong to which logical widget, what flags govern visibility, and where the definition lives. Consumers that render a HUD editor UI, explain a HUD config, or diff two HUD setups need this table.

**Example:** `HUD_Register("ammo", ...);` at `hud_common.c:842`. The element synthesises `hud_ammo_place`, `hud_ammo_align_x`, `hud_ammo_style`, etc.

**Consumers:**
- slipgate HUD viewer (future) - groups the 1404 `hud_*` cvars by owning element.
- Claude Code via MCP - answers "which cvars control HUD element X" using `owned_cvars_json`.
- HUD diff tools - tracks element-level changes across ezQuake versions.

**Sources:**
- Schema: `SCHEMA.md` - `hud_element_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-unified.py` (hud-elements handler in `extractor_lib/hud_elements.py`).

</details>

---

## ruleset

<details>
<summary>6 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Named policy bundle that locks cvars and restricts features.

**Verification status:** ast_verified (6 entries at ezQuake head: default, smackdown, qcon, thunderdome, mtfl, smackdrive; all backed by `rulesetDef_t` struct initialisers. Per-field blame via `source_overrides` with `override_kind='struct_field_decl'` so diff attributes each field to the struct-layout commit, not the loader site).

**What it entails:** A ruleset is a bundle of constraints the engine enforces when the user selects it: which features are restricted (packet rate, triggers, particles, play mode, IPC, logging), the pinned cvar values, and the max FPS cap. The schema stores the ruleset name, the C-side enum ident, the loader function, the 10 `restrict_*` boolean flags, `maxfps`, and `locked_cvars_json` (an array of `{cvar_ident, value}` pairs). Ruleset rows change rarely but matter enormously when they do: a locked-cvar list edit changes what every player on that ruleset can do.

**Why we extract it:** Competitive QW runs under a ruleset ("smackdown" for 4on4, "mtfl" for a mod-family variant, "default" for pickup). The ruleset determines what you're allowed to tune and what gets pinned. Consumers that tell a player "your config sets `cl_smartjump 1` but smackdown pins it to 0" need the locked-cvar list. Per-version history matters because a ruleset edit is a policy change players should see.

**Example:** `rulesetDef_t smackdown = { "smackdown", ..., .restrict_triggers = true, .maxfps = 77, .locked_cvars = { { "cl_cshift_bonus", "0" }, ... } };`.

**Consumers:**
- Claude Code via MCP - answers "what does ruleset X restrict" and "is cvar Y pinned in ruleset Z."
- slipgate ConfigViewer (future) - annotates cvars that are locked-by-ruleset in the user's chosen bundle.
- Policy diff tools - tracks ruleset evolution across engine versions.

**Sources:**
- Schema: `SCHEMA.md` - `ruleset_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-rulesets-clang.py` (text/regex, not libclang despite the filename).

</details>

---

## token_primitive

<details>
<summary>33 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Single-character grammar token the engine's parser recognises.

**Verification status:** ast_verified (33 entries at ezQuake head; derived from the tokenizer's character tables. Case-sensitive canonical IDs - `$B` blue LED and `$b` glyph are distinct primitives).

**What it entails:** The low-level syntax symbols the engine's config-and-command parser treats as structural: `$` for variable expansion, `%` for teamplay macro, `;` for command separator, quote-handling rules, whitespace rules, comment markers. The schema stores the symbol, its form (`$x` / `^x`), the suffix character, the byte value (conchars grid index where applicable), the category (`led` / `glyph` / `separator` / `expansion`), and case style. 33 primitives in ezQuake cover the full grammar surface.

**Why we extract it:** Any consumer that walks or lints configs needs to know where `$` triggers variable substitution, where `;` ends a command, how quotes group arguments. slipgate's alias-chain follower and macro-expansion resolver need these primitives to split alias bodies correctly. A linter that doesn't respect these primitives will mis-split alias bodies at the first embedded semicolon. This table is the config-grammar contract.

**Example:** In a config line `alias check "echo %l; wait; say team ready"`, the primitives at play are `%` (macro expansion), `;` (command separator), `"` (quote grouping).

**Consumers:**
- slipgate alias-chain resolver.
- slipgate macro / `$var` display.
- Config linter (future).

**Sources:**
- Schema: `SCHEMA.md` - `token_primitive_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-token-primitives-clang.py` (text/regex, not libclang despite the filename).

</details>

---

## flag_bit

<details>
<summary>50 entries - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Individual bit inside an engine bitmask family.

**Verification status:** ast_verified (50 entries at ezQuake head: 26 `cvar_flag` bits + 7 `fpd_flag` bits + 17 `stat_const` indices. The extractor's `FAMILY_TARGETS` is extensible - PEXT / FTE_PEXT families will pick up naturally when FTE is ported).

**What it entails:** An individual constant from a `#define FAMILY_X (1<<N)` bitmask or stat-index family: `CVAR_ARCHIVE` (cvar flag bit 1), `FPD_NO_TIMERS` (fragility flag bit 0), `STAT_HEALTH` (stat index 0). The schema stores the bit name, bitmask family (`cvar_flag` / `fpd_flag` / `stat_const`), raw value expression (e.g., `(1<<2)`), numeric value, and the source line where the `#define` lives. Flag bits are a peer to flag-carrying entities (cvars carry `flags_raw` integers whose decoded names come from this table).

**Why we extract it:** A row saying `sensitivity.flags_raw = 192` (`CVAR_ARCHIVE | CVAR_USERINFO`) is not human-readable without decoding 192 into flag names. The flag_bit table is the decoder. Every consumer that displays "what makes this cvar special" (archived? user-visible to server? read-only?) needs the flag table to turn raw integers into semantics.

**Example:** `#define CVAR_ARCHIVE (1<<0)` at `cvar.h:53`. Decoded: `sensitivity` carries `flags_raw = (1<<0) | (1<<6)` = 65, which means `CVAR_ARCHIVE | CVAR_USERINFO`.

**Consumers:**
- slipgate ConfigViewer - decodes cvar flags for the detail panel.
- Claude Code via MCP - answers "what does flag X mean" and "what cvars carry flag Y."

**Sources:**
- Schema: `SCHEMA.md` - `flag_bit_versions`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-flag-bits-clang.py` (text/regex, not libclang despite the filename).

</details>

---

## asset_category

<details>
<summary>17 categories - <code>seed_only_with_ast_support</code> - click to expand</summary>

**Tagline:** Content classification for the engine's filesystem-consumption model.

**Verification status:** seed_only_with_ast_support at the fleet level (17 hand-authored categories corroborated by 110 AST-extracted `asset_loader_sites` referencing `reads_category_id`). Individual entries vary - see the relation-table sub-sections below for row-level status, including the `.kmap` orphaned_historical finding.

**What it entails:** A named bucket for content the engine reads from the filesystem: `skin`, `crosshair`, `map`, `sound`, `hud_overlay`, `skybox`, etc. Each category is a first-class entity (`type='asset_category'`) and is referenced by four relation tables that together describe how the engine discovers, classifies, and consumes files. The categories themselves come from a hand-authored seed (`ezquake-asset-categories.yaml`); the four relation tables below are a mix of seed + AST.

**Why we extract it:** A user's quake directory is a pile of files; the categories turn that pile into a classified inventory. slipgate's Browse view of the directory groups files by category. A "check for missing assets" tool needs to know which categories a config references (via `asset_cvar_bindings`) and which loader sites actually consume each category. Without this shape, asset-related questions are unanswerable at the semantic level.

**Example:** Category `skin`. Extension `.pcx` with path_hint `skins/` maps to it. Cvar `teamskin` binds to it with pattern `skins/{value}.pcx`. Loader site `Skin_Cache` at `skin.c:369` reads it.

**Consumers:**
- slipgate Browse view - groups quake-directory files by category.
- slipgate asset-presence checker (future) - reports missing files referenced by user config.
- Claude Code via MCP - answers "which cvars load X kind of asset."

**Sources:**
- Schema: `SCHEMA.md` - `asset_category_versions`.
- Seed: `packages/qw-config/seeds/ezquake-asset-categories.yaml`.
- Reconciliation: `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts`.

**Sub-tables:** four relation tables wrap around `asset_category` and are documented as peer sections below: [asset_extensions](#asset_extensions-relation), [asset_path_rules](#asset_path_rules-relation), [asset_cvar_bindings](#asset_cvar_bindings-relation), [asset_loader_sites](#asset_loader_sites-relation).

</details>

### asset_extensions (relation)

<details>
<summary><code>seed_only_with_ast_support</code> with row-level findings - click to expand</summary>

**Tagline:** "This file extension belongs to this category in this project version."

**Verification status:** seed_only_with_ast_support at the fleet level; individual row stamps live in `asset_extensions.verification_status` (schema v7, 2026-04-22).

**What it entails:** A (project, version, extension, path_hint) tuple mapping a file on disk to a category. `path_hint` disambiguates multi-purpose extensions - `.tga` in `textures/` is a texture, `.tga` in `skins/` is a skin, `.tga` with no hint defaults to screenshot.

**Per-row hygiene audit:** As of schema v7 the four-bucket verification status carries through to a column. Query:

```sql
SELECT extension, verification_status, verification_reason
FROM asset_extensions
WHERE verification_status != 'ast_verified';
```

At ezQuake head this returns 2 rows: `.kmap` (`orphaned_historical` - loader subsystem removed in commit `46b5046`, 2014-01-12; files persist via the nQuake bundle - full story in `apps/qw-oracle/concept-notes/kmap-legacy-keymap-system.md`) and `.dll` (`seed_only_no_ast_support` - intentional cross-engine signal, FTE-only construct that ezQuake does not load).

The seven speculative extensions audited 2026-04-22 (`.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.spr`, `.qwz`) all stamp **ast_verified**. Four are confirmed by DB rows; three (`.log`, `.xml`, `.spr`) are verified via grep-cited source evidence where the loader uses a wrapper not on the extractor's `LOADER_FUNCTIONS` watchlist.

- `.loc` - **ast_verified** (DB: 3 rows). Primary loader `src/teamplay_locfiles.c:84` `TP_LoadLocFile`, autoloaded on map change at `:558-560` via `va("%s.loc", mapname)` with mapgroup fallback. Also exposed as `loadloc`/`saveloc`/`addloc`/`removeloc` console commands.
- `.lit` - **ast_verified** (DB: 5 rows). Loaded via `FS_LoadHunkFile` deref-assignment pattern in `r_brushmodel_load.c`; the engine reads colored-lightmap overrides when present alongside the `.bsp`.
- `.dat` - **ast_verified** (DB: 5+ rows). Loaded via `FS_LoadHunkFile` + literal paths in `pr_edict.c` (QuakeC `progs.dat`). Confirms the seed claim — this extension is the QuakeC bytecode format, not random `.dat` scraps.
- `.qwz` - **ast_verified** (DB: 1 row). `PlayQWZDemo` call site handles the compressed demo format; external `qwdtools` decodes `.qwz` to `.mvd` before ezQuake loads it, but ezQuake has a first-class hookup for the format at the playback entry point.
- `.log` - **ast_verified** (DB: 0 rows — wrapper gap). Raw `fopen` in `src/logging.c:146, 280` (write), `:336` (read, for incremental-filename probing), extension forced via `COM_ForceExtensionEx` at `:144, 277`. Filename format at `:331` follows `"%s_%03i.log" % (auto_matchname, num)` — the `auto_matchname` pipeline ties into `match_format_*` conventions via `cl_screenshot.c`. Driving cvar `match_auto_logconsole` at `match_tools.c:623`. Zero DB rows because raw `fopen` is not on the extractor's `LOADER_FUNCTIONS` watchlist.
- `.xml` - **ast_verified** (DB: 0 rows — wrapper gap). Two orthogonal features share this extension:
  - **Reader (client, ingame help):** `help_files.c:49` opens `help/index.xml` via `CPageViewer_GoUrl`; `Ctrl_PageViewer.c:177` is the handler; `help_files.c:83` registers `.xml` as a browsable file type.
  - **Writer (server, stats output):** `mvd_xmlstats.c:259` emits `stats.xml`; `sv_demo.c:1813` emits per-demo XML stats. This is the same `stats.xml` that qw-stats ingests.
  - Zero DB rows because `CPageViewer_GoUrl` and the server-side snprintf writers are not on the watchlist. Seed-side follow-up worth considering: `.xml` covers two distinct meanings; a `path_hint` split similar to `.tga` (`textures/` vs `skins/` vs `env/`) may be appropriate for `help/` vs demo-output paths.
- `.spr` - **ast_verified** (DB: 0 rows — wrapper gap). Vanilla Quake sprite format, retained as a first-class ezQuake feature. Format parser `src/r_sprites.c:151` `Mod_LoadSpriteModel` (validates `SPRITE_VERSION` in `spritegn.h`, parses `dsprite_t` frames). Dispatched from the unified model loader at `r_model.c:295-296` when a model's magic bytes match `IDSPRITEHEADER`. Literal paths registered in `cl_ents.c:80-88` (explosion sprites: `progs/s_explod.spr`, `s_expl.spr`, `s_bubble.spr`) and `cl_ents.c:131-147` (**2D simple-items feature** — `sprites/s_shells.spr`, `s_rockets.spr`, `s_mega.spr`, `s_invuln.spr`, `s_quad.spr`, etc.). Active rendering pipeline across `r_sprites.c`, `r_sprite3d.c`, `glc_sprite3d.c`, `glm_sprite.c`, `gl_sprite3d.c`. Zero DB rows because the `cl_modelnames[]` → `Mod_ForName` indirection hides the literal paths from the watchlist classifier.

**Extractor coverage observations surfaced by the audit (for future extractor work):**
- Three distinct wrapper-gap classes appear in the zero-DB-row cases: raw `fopen` (`.log`), page-viewer URL handler (`.xml`), and table-registered-literal indirection (`.spr`). Each is a candidate for `LOADER_FUNCTIONS` watchlist expansion or a specialized handler pattern.
- `asset_loader_sites` table has `path_literal` but not the `path_template` / `path_parameters` / `path_extension` fields the bundle JSON carries — those are dropped at load time. Not a blocker for this audit (stamps use source citations directly) but worth tracking.

**Sources:**
- Schema: `SCHEMA.md` - `asset_extensions`.
- Seed: `packages/qw-config/seeds/ezquake-asset-extensions.yaml`.

</details>

### asset_path_rules (relation)

<details>
<summary>14 rules - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Filesystem rules the engine enforces (search-path order, archive precedence, cmdline overrides, gamedir behaviour).

**Verification status:** ast_verified (14 rules: 2 search_path + 5 archive_precedence + 2 gamedir_behavior + 5 cmdline_override; every row has `source_verified=1` - the verifier confirmed each cited source line still resolves to the expected function at head).

**What it entails:** Engine-level filesystem behaviour that no single call site captures. Search-path stacking order (id1 -> ezquake -> qw -> homedir, LIFO lookup), archive precedence (numbered paks -> wildcard paks -> loose files, with `pak.lst` as an opt-out), gamedir switching (unwinds to base then mounts new mod on top), cmdline overrides (`-basedir`, `-nohome`, `-data`, `-userdir`, `-game`). Each rule is hand-authored but source-ref-pinned and verified.

**Why we extract it:** "Why isn't this file being loaded" is a recurring question. The answer is almost always a search-path or archive-precedence subtlety. Without this table, users debug by trial and error; with it, an oracle query can say "your `pak3.pak` overrides `id1/pak0.pak` because wildcard archives sit above numbered ones."

**Example:** Rule `archive_vs_loose_files` at `fs.c:2833` - "FS_AddGameDirectory pushes the directory onto fs_searchpaths, then triggers FS_AddDataFiles which pushes the directory's archives on top. Archives override loose files in the same directory."

**Sources:**
- Schema: `SCHEMA.md` - `asset_path_rules`.
- Seed: `packages/qw-config/seeds/ezquake-asset-path-rules.yaml`.
- Verifier: `packages/qw-config/scripts/extract-ezquake-asset-path-rules-verify.py`.

</details>

### asset_cvar_bindings (relation)

<details>
<summary>26 rows - <code>seed_only_with_ast_support</code> - click to expand</summary>

**Tagline:** "Setting this cvar causes the engine to load assets of this category from this path pattern."

**Verification status:** seed_only_with_ast_support (26 rows at ezQuake head: 23 hand-authored seed + 1 `auto_confirms_seed` + 2 `auto_orphan`. The AST auto-pass only confirms rows where the cvar-to-load relationship lives inside a single compound scope; most ezQuake flows cross statement boundaries, so auto-match is intentionally rare).

**What it entails:** A binding ties a cvar entity to an asset category plus a path pattern with `{value}` / `{face}` placeholders. `baseskin` with pattern `skins/{value}.pcx` and trigger `on_connect` means: when a player joins, the engine reads `baseskin.string`, constructs `skins/<that-value>.pcx`, and loads it. Each row carries a `confidence` field (`seed` / `auto` / `auto_confirms_seed` / `auto_orphan`) so consumers can weight how strongly to trust the binding.

**Why we extract it:** Many consumer features reduce to "given this config, which asset files does it reference." Classify the user's binds by what assets they load; warn about cvars that point to missing files; explain what `teamskin enemy_red` actually causes the engine to do. Without this table, the answers require walking the engine source from a cvar set.

**Example:** cvar `r_skyname` binds to category `skybox` with pattern `env/{value}_{face}.tga` and trigger `on_map_load`. Setting `r_skyname blackvoid` causes per-map-load loads of `env/blackvoid_ft.tga`, `env/blackvoid_bk.tga`, ... (six faces).

**Sources:**
- Schema: `SCHEMA.md` - `asset_cvar_bindings`.
- Seed: `packages/qw-config/seeds/ezquake-asset-cvar-bindings.yaml`.
- Extractor (auto-pass): `packages/qw-config/scripts/extract-ezquake-unified.py` (asset-cvar-bindings handler).

</details>

### asset_loader_sites (relation)

<details>
<summary>128 sites - <code>ast_verified</code> - click to expand</summary>

**Tagline:** Every concrete call site in engine C that loads an asset.

**Verification status:** ast_verified (128 sites at ezQuake head: 24 `certain` + 80 `heuristic` + 24 `intentionally_generic` + 0 `unclassified`. The confidence gradient reflects how much evidence the classifier has for `reads_category_id` - a literal path-string with a known-category function scores `certain`, a cvar-driven or category-hintable path scores `heuristic`, a call to one of the four FS-layer primitives (`FS_OpenVFS` / `FS_LoadFile` / `FS_LoadHunkFile` / `FS_WriteFile`) with `path_source='unknown'` scores `intentionally_generic` (schema v8, 2026-04-22) since these are the FS layer itself rather than asset loaders, and anything else scores `unclassified`. Zero unclassified at head means a new unclassified row in a future tag-pair is a real novelty, not noise.).

**What it entails:** A row per engine-source function that reads a file. Each row stores the canonical id (`<function>_<basename>_<ordinal>`, ordinal-based since Batch 3 for diff stability), function name, source file + line, enclosing function, category (FK if classified), load trigger, path source (`literal` / `cvar` / `computed` / `unknown`), path literal if applicable, path cvar id if applicable, confidence, and a `dev_only` flag for debug-build-only sites.

**Why we extract it:** This is the most direct answer to "what does the engine actually load, where." Combined with `asset_cvar_bindings`, it closes the loop: cvar bindings say "this cvar controls this kind of asset," loader sites say "this C function is the one that reads it." Consumer questions like "where is skybox loading implemented" resolve to a concrete call site.

**Example:** Loader site `R_SetSky_r_skyname_0` at `cl_skygroups.c:255`, reads category `skybox`, path_source `cvar`, path_cvar_id `ezquake:cvar:r_skyname`, confidence `certain`, trigger `on_map_load`.

**Sources:**
- Schema: `SCHEMA.md` - `asset_loader_sites`.
- Extractor: `packages/qw-config/scripts/extract-ezquake-unified.py` (asset-loader-sites handler).

</details>

---

## Cross-type notes

### When a row isn't ast_verified

For per-entity types (cvar, command, etc.) the fleet is ast_verified but individual rows can be `source_retired` (was present in an older version, gone at head) or `doc_only` (help JSON documents a feature the extractor cannot find in source). These are tracked in the `entities.source_state` column with audit rows in `source_state_transitions` rather than being forced into one of the verification-status buckets. The verification-status field above applies to how the *type* is extracted, not to the lifecycle of individual rows.

### Future engine ports inherit this shape

This doc scopes to ezQuake. FTE, MVDSV, and KTX ports (Phase 2d / 2e in the oracle roadmap) inherit the same template. Each port adds its own verification-status audit per type; a type that's ast_verified for ezQuake may start life as `audit_pending` for FTE and graduate as the extractor port matures.
