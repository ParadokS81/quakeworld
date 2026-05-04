# KTX Layer 1 Onboarding -- Design Spec

**Date:** 2026-05-04
**Status:** In progress (multi-pass brainstorm via arc-brainstormer skill)
**Scope:** Onboard canonical KTX (https://github.com/QW-Group/ktx) -- the C-language QuakeWorld server modification -- into QW Oracle Layer 1. Includes engine-shape entity types (cvar, command, info_key, log_template) AND gameplay-content entity surface (5 enum taxonomies, 10 struct-array gameplay tables, 7 XSD-defined match-event types).

**Pass plan:**
- Pass 1: Methodology + 4 first-class entity types (this spec) -- CLOSED 2026-05-04.
- Pass 2: Prod-MCP update lifecycle (sibling spec at `2026-05-04-oracle-prod-update-lifecycle.md`) -- CLOSED 2026-05-04. Generalised beyond KTX into the canonical Layer 1 update procedure for all codebases.
- Pass 3: Schema impact for first-class types (this spec)
- Pass 4: Gameplay-content scope + shape decision (this spec or sibling)
- Pass 5: Per-category gameplay-content design (this spec or sibling)

**Out of scope:**
- Dusty-ktx fork (separate fork-onboarding arc; will subclass canonical KTX handlers + add tree-sitter for `qcsrc/`).
- KTX QuakeC client modules (none exist in canonical repo; `dusty-ktx/qcsrc/` is fork-add-on).

**Doctrine fixes deferred to end-of-arc:** OVERVIEW.md / EXTRACTOR-PLAYBOOK.md / extractor CLAUDE.md / extraction-pipeline-vision memory all incorrectly state KTX is QuakeC + tree-sitter. Canonical KTX is pure C; libclang is the right toolchain. Fix as part of arc execution.

---

## Pass 1 -- Methodology + 4 first-class entity types

### 1.1 Schema fitness for KTX cvars -- LOCKED

**Decision:** Approach A -- KTX cvars share the existing `cvar_versions` table. NULL-tolerant on `flags_raw` / `flag_names_json` / `on_change_function` (semantic absence: KTX doesn't have flag or on_change concepts). Project CHECK widening only; zero new tables.

**Source basis (verified):**
- 192 unique k_-prefixed cvars registered via `RegisterCvar*("name", "default")` calls in `src/world.c` and elsewhere.
- ~205 sites use `RegisterCvarEx` (with default value); ~50 use `RegisterCvar` (no default -> default_value NULL in those rows).
- Trailing comments harvest exactly like ezQuake (per ezQuake Pattern 9-equivalent).
- Source provenance (file:line) inherent in every registration.

**Cross-validation findings (committed-config diff):**
- 119 unique k_* set across `resources/example-configs/ktx/`. Of those, 100 overlap with source-registered names.
- 19 config-only (NOT in source RegisterCvar*) split into:
  - 9 k_motd1-9: Bucket 3 (sprintf-built). `motd.c:56` reads via `cvar_string(va("k_motd%d", i))`. Operator-defined via configs; iterate by index. No registration site by design.
  - 6 k_ml_0-5: Bucket 3 (sprintf-built). `maps.c:566,596,612,667` reads via `snprintf(mapid, ..., "k_ml_%d", i)`. Per-server maplist entries; operator-defined; iterate by index.
  - 4 truly orphaned (k_666, k_dm2mod, k_no_vote_break, k_specktalk): zero source matches; upstream config drift candidates.

**Layer 1 treatment by bucket:**
| Bucket | Count | Treatment |
|---|---|---|
| Source-registered | 192 | First-class extraction; populate cvar_versions |
| Bucket 3 indexed-family (k_motd*, k_ml_*) | ~15 (unbounded) | Document family templates in OUT_OF_SCOPE.md; do NOT extract individual entries; optionally synthesize per-template "family" rows for searchability (deferred, low-pressure) |
| Truly orphaned | 4 | Document in OUT_OF_SCOPE.md as upstream-drift candidates; consider issue/PR against QW-Group/ktx |

**Schema delta:** widen `entities.project` CHECK to admit `'ktx'` (already includes 'ktx' per playbook -- verify against current schema state during execution). No new tables. No new columns.

### 1.2 Handler shape -- LOCKED

**Decision:** standard cross-codebase port shape per EXTRACTOR-PLAYBOOK.md. `apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py` inherits from `Visitor` only (no parent-project subclass). Single-variant TU parse (verified: only one platform-guard #ifdef exists in KTX source at `native_lib.c:14`, with zero RegisterCvar* inside guarded blocks).

**AST detection:** match `CALL_EXPR` cursors with `cursor.spelling in {"RegisterCvar", "RegisterCvarEx"}`:
- arg[0] -> cvar name via `_literal_string(arg, source_bytes)` (existing `extractor_lib` helper).
- arg[1] -> default value (RegisterCvarEx only; RegisterCvar leaves default_value NULL).
- `cursor.location` -> source_file + source_line.
- Trailing-comment harvest via the existing convention used across all four shipped extractors.

**Pattern reuse:**
- Pattern 5 (API-call with literal-string args, `Cmd_AddLegacyCommand` shape) covers RegisterCvar / RegisterCvarEx detection. Add a one-line note to the playbook acknowledging KTX's RegisterCvar* falls under Pattern 5; do NOT promote to a new Pattern.
- Pattern 6 (same-file #define resolution) covers bot-cvar registrations like `RegisterCvar(FB_CVAR_DODGEFACTOR)` at `bot_botimp.c:113-117`. Reuse `start_file()` macro pre-parse from ezQuake's commands handler. No new code.

**Per-file dedup:** standard `_seen_in_file: set[str]` keyed on canonical name. Defensive (KTX has no client/server variant split, no struct-shadow patterns).

**Output filename:** `ktx-variables-ast.json` (cross-engine convention).

**Loader:** `load-cvars.ts` already exists. Adding KTX is data-driven via `PROJECT_VERSION_ALIASES` and dispatch maps; ~5-line touch.

**Default-value population matrix:**
| Source pattern | name | default_value |
|---|---|---|
| `RegisterCvarEx("k_foo", "0")` | "k_foo" | "0" |
| `RegisterCvar("_k_internal")` | "_k_internal" | NULL |
| `RegisterCvar(FB_CVAR_FOO)` (Pattern 6 resolved) | resolved literal | NULL |

### Note on cross-project value (informs Pass 4-5 scope decisions)

With ezQuake + MVDSV + KTX + (later) FTE all populated in Layer 1, cross-project queries on the `entities` table answer chain-of-command questions implicitly. Example: a client-side stringcmd like `/ready` is absent from `entities` under project='ezquake' and project='mvdsv', but present under project='ktx' -- the absence-presence pattern IS the chain-of-command signal. No new relation tables needed for this. Explicit relation modeling (e.g., `command_routes`, `cvar_flows`) is OUT OF SCOPE for this arc; if pursued later, likely lives in Layer 3 (concept notes synthesizing across the multi-project entity surface) rather than Layer 1.

### 1.3 Source-citation discipline for KTX cvars -- LOCKED

**Decision:** match cross-engine convention; no special-casing.

- **Primary location:** the `RegisterCvar*` call site itself. `cursor.location.file` + `cursor.location.line`. Analogous to ezQuake's `cvar_t foo = {...}` declaration line.
- **`#define`-resolved entries (Pattern 6):** the `RegisterCvar(FB_CVAR_FOO)` call site, NOT the `#define` site. Reasoning: call site is where the cvar enters runtime; the #define is preprocessor convenience. Same convention as ezQuake's command handler for #define-resolved command names.
- **Multi-site registrations (defensive):** first-seen-wins per the `_seen_in_file` / `_seen_names` dedup invariant.
- **Per-version evolution:** standard cross-engine -- per-version `source_file` column captures whatever the registration site IS at that tag. Loader's diff machinery handles file moves between tags.
- **Trailing-comment harvest origin:** same logical line as the call site's `;` terminator.

**Out-of-scope for 1.3:**
- Bucket-3 indexed-family cvars (`k_motd*`, `k_ml_*`): not extracted; consumer site documented in OUT_OF_SCOPE.md but no Layer 1 row.
- Truly orphaned drift cvars: not extracted.
- Commands like `wreg` (operator-noted example): commands handler territory (1.5), not cvars.
### 1.4 Existing regex extractor disposition -- LOCKED

**Decision:** delete `apps/qw-oracle/scripts/extractors/ktx/commands.ts` as a Phase 0 task in arc execution.

**Rationale:**
- Wrong language for the canonical pipeline (all four shipped extractors are Python + libclang; lone TS regex parser is permanently asymmetric).
- Wrong output path (`packages/qw-config/src/data/` retired in the 2026-04-25 qw-config dissolution).
- Wrong methodology (regex is brittle for `cmd_t cmds[]` multi-line struct-literal arrays; libclang Pattern 4 (INIT_LIST_EXPR walks) handles the same shape cleanly across ezQuake/MVDSV).
- Pass 1.5 writes `_handler_commands.py` covering the same ground via the canonical pipeline; the TS extractor becomes immediately superseded.

**Cost:** zero -- file is not imported anywhere; output path is dead.

**Cross-validation oracle:** runtime evidence (KTX live `cmdlist` dump or extralog data) is a better cross-validation source than the regex extractor. Already covered by Leg C's findings.
### 1.5 KTX command extraction -- LOCKED

**Decision:** single `_handler_commands.py` covering three table targets via Pattern 4 (struct-literal command tables). Pattern 14 canonical-name suffix disambiguates the cross-table collisions discovered in the spike.

**Three target tables:**
| Table | File | Unique entries | Canonical-name shape |
|---|---|---|---|
| `cmd_t cmds[]` | `src/commands.c:693` | 317 | `<name>` (bare) |
| `frogbot_cmd_t std_commands[]` | `src/bot_commands.c:2315` | 39 | `<name>:frogbot:std` |
| `frogbot_cmd_t editor_commands[]` | `src/bot_commands.c:2332` | 25 | `<name>:frogbot:editor` |

**Spike-justified reasoning for the suffix pattern:**
- main vs std: 1 collision (`info`).
- main vs editor: 1 collision (`info`).
- std vs editor: 25 collisions (every editor entry overlaps a std entry: `addmarker`, `addpath`, `goto`, `info`, `move`, `save`, `summary`, etc.).
- Without subscope disambiguation, first-seen-wins dedup would silently drop 25 editor entries.
- Pattern 14 reuse keeps schema clean (no new column); existing `lookup_entity` MCP tool already supports `name LIKE '<bare>:%'` prefix-fallback for bare-name queries.

**Dispatch confirmed:** main cmds[] entry `{ "botcmd", FrogbotsCommand, ... }` at `commands.c:1047`. `FrogbotsCommand` selects between std_commands and editor_commands based on `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE)`. So bot subcommands are reached as `botcmd <name>` from the player console; canonical name suffix `:frogbot:std` / `:frogbot:editor` reflects this dispatch namespace.

**Description sources (priority order):**
1. `CD_*` macro at the row's description-field index (Pattern 6 same-file `#define` resolution).
2. Banner-comment harvest at the handler-function's `FUNCTION_DECL` site (Pattern 9 fallback for handlers without CD_ macros).
3. Inline string literal in the row (frogbot tables have these directly: `{ "addmarker", FrogbotAddMarker, "Adds a routing marker to the map" }`).

**Handler implementation:**
- Walk `VAR_DECL` cursors. Match three known table types (`cmd_t`, `frogbot_cmd_t`).
- For each row in the `INIT_LIST_EXPR`, pull fields by index and emit per-row.
- Per-table canonical name builder applies the appropriate suffix.
- Per-file dedup `_seen_in_file` keyed on the FULL canonical name (post-suffix), not the bare name.

**Future Layer 3 candidate:** community usage of bot:editor primitives (`addmarker` + `goto`) for trickjump self-practice, plus KTX's first-class race mode (commands in main cmds[], position-file infrastructure in `src/race.c`), suggests a "Race mode and self-practice tools" concept note. Layer 1 captures source-declared descriptions; Layer 3 carries the community-workflow narrative. Tracked separately.

### 1.6 KTX info_key extraction -- LOCKED

**Decision:** producer-only emission. `_handler_info_keys.py` walks `CALL_EXPR` cursors for `SetUserInfo(ent, "*KEY", value, SETUSERINFO_STAR)` with star-prefixed string-literal first arg. Consumer-only keys (the ~33 keys KTX reads via `ezinfokey` / `infokey`) are NOT emitted as KTX rows -- they belong conceptually to the producer's project (ezQuake `CVAR_USERINFO`, MVDSV info_key, or other KTX-produced star-keys).

**Convention parallel:** matches MVDSV's existing `_handler_info_keys.py` (producer-emits, consumer-doesn't).

**Canonical name:** Pattern 14 `<bare>:<scope>` suffix, scope = `userinfo` for KTX SetUserInfo writes. Yields canonical names like `*is:userinfo`, `*mm:userinfo`, `*mu:userinfo`, `*ml:userinfo`, `*mp:userinfo`. Existing `lookup_entity` MCP prefix-fallback handles bare-name queries.

**Source citation:** the `SetUserInfo` call site itself (cursor.location). Per-file dedup; first-seen-wins.

**Trailing-comment harvest:** standard convention. Some SetUserInfo calls carry inline comments like `// mark we are call infoset already` -- those become the description.

**Handler implementation:** cross-codebase port from `Visitor` (NOT subclass of MVDSV handler -- API surface differs). Read MVDSV's handler at execution time as a template.

**Estimated row count:** ~5-6 (KTX-defined star-keys: `*is`, `*mm`, `*mu`, `*ml`, `*mp`, possibly others).

**API counts (verified):**
- `ezinfokey(ent, key)` -- 91 read sites (consumer; not extracted).
- `infokey(ent, key, buf, size)` -- 20 read sites (consumer; not extracted).
- `SetUserInfo(ent, "*KEY", value, flag)` -- 38 write sites; ~5-6 unique star-keys (producer; extracted).

**Cross-project chain-of-command:** consumer-only keys (`name`, `team`, `*version`, `*VIP`, etc.) remain queryable via cross-project entity lookup against the bare-name. KTX's extensive consumption is visible in source via grep, not via Layer 1 entities. Future relation-modeling work (e.g., `info_key_consumers` table) is OUT OF SCOPE for this arc.

**Game-mode context (per operator):** KTX absorbed many older mods -- CTF, arena, wipeout, race, bloodfest, hoonymode, blitz, plus standard team/duel/FFA. Discovery sweep already inventoried this surface (UserModes_t = 15 values, lsType_t = 9 values, dedicated source files for arena/clan_arena/race/bloodfest/bot_*). Game-mode richness drives Pass 4-5 entity decisions; doesn't affect 1.6 (the info_key handler is mode-agnostic).

### 1.7 KTX log_template extraction -- LOCKED

**Decision:** Option A -- extract all printf-shaped log emissions (~1794 call sites total) into existing `log_template_versions` shape with new `logfile` channel value via CHECK widening. XSD-defined extralog events deferred to Pass 4-5 (structurally different; programmatic XML emission, not printf format strings).

**Channel taxonomy for KTX:**
| KTX API | Call sites | log_template channel | Format-arg index |
|---|---|---|---|
| `G_bprint(level, fmt, ...)` | 655 | `broadcast` | 1 |
| `G_sprint(ent, level, fmt, ...)` | 1068 | `client` | 2 |
| `G_cprint(fmt, ...)` | 43 | `console` | 0 |
| `log_printf(fmt, ...)` | 28 | `logfile` (NEW value -- CHECK widening) | 0 |

**Estimated row count:** ~1500-2000 unique format strings after per-file dedup.

**Handler:** cross-codebase port from `Visitor`; read MVDSV's `_handler_log_templates.py` as template. Walks `CALL_EXPR` cursors matching the four API spellings, pulls format-string literal at the API-specific arg index, parses format-specifiers (`%s` / `%d` / `%f` / `%c`) into `variables_json` per MVDSV convention. Multi-site dedup via `all_call_sites_json` (MVDSV Phase 2e follow-up convention).

**Schema delta:** widen `log_template_versions.channel` CHECK to admit `'logfile'` value. One additive migration. No new tables.

**Per Exhaustive Mapping Rule:** no hand-picked subset. Extract everything that fits the printf shape, including formatting-only strings (header dividers, status announcements). Curating which messages are "valuable" is downstream consumer territory, not extractor territory.

**Extralog OUT OF SCOPE for 1.7 / Pass 1:**
- XSD-defined event types (pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup, damage, death) emit programmatically via XML-builder code in `stats_xml.c` / `combat.c` / `items.c` / `client.c`. NOT printf format strings.
- A printf-handler would not catch them.
- Decision deferred to Pass 4-5: new `match_event` entity type, OR specially-shaped `log_template` rows, OR XSD-only Layer 3 reference. Driven by `k_extralog` (enable cvar) + `k_extralog_xsd_uri` (schema reference cvar).

---

## Pass 1 -- CLOSED

All seven sub-questions locked:
- 1.1 Schema fitness for KTX cvars (Approach A; NULL-tolerant cvar_versions; project CHECK widening only)
- 1.2 Handler shape (cross-codebase port from Visitor; single-variant TU parse; Pattern 5 + Pattern 6 reuse)
- 1.3 Source-citation discipline (call-site location is canonical; first-seen-wins on duplicates)
- 1.4 Existing regex extractor disposition (delete `extractors/ktx/commands.ts` as Phase 0 task)
- 1.5 KTX command extraction (single handler, three table targets, Pattern 14 canonical-name suffix for bot subcommands)
- 1.6 KTX info_key extraction (producer-only emission; Pattern 14 with `userinfo` scope; ~5-6 rows)
- 1.7 KTX log_template extraction (printf-shaped surface; new `logfile` channel; ~1500-2000 rows; XSD events deferred to Pass 4-5)

**Schema deltas accumulated by Pass 1 first-class types:**
1. `entities.project` CHECK -- already includes `'ktx'` per playbook (verify during execution).
2. `log_template_versions.channel` CHECK -- widen to admit `'logfile'`.
3. (Possibly) handler-introduced columns -- TBD per Pass 3 review.

No new tables. Pure additive migrations.

**Carry-forwards to other passes:**
- Pass 2 (prod-MCP update lifecycle): unaffected by Pass 1; runs independently.
- Pass 3 (schema impact for first-class types): consolidate the two CHECK widenings + verify nothing else; light pass.
- Pass 4 (gameplay-content scope): inherits the 5 enum taxonomies + 10 struct-array tables + 7 XSD match-events surface from discovery sweep. Decides: new entity types? qw-namespace gameplay rows? Both?
- Pass 5 (per-category gameplay-content design): per-candidate extraction approach + schema slot.

**Carry-forwards to other workstreams:**
- Layer 3 concept-note candidates: 7 captured at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md`.
- Map / game-mode support relation: soft-captured at `docs/superpowers/parking/2026-05-04-ktx-map-mode-support-maphub.md`.
- End-of-arc doctrine fixes (OVERVIEW.md / EXTRACTOR-PLAYBOOK.md / extractor CLAUDE.md / extraction-pipeline-vision memory all incorrectly state KTX is QuakeC + tree-sitter): tracked in task list.
- Pre-Port Discovery Sweep methodology section for EXTRACTOR-PLAYBOOK.md: tracked in task list.

---

## Pass 3 -- Schema impact for first-class types

(Pending; after Pass 1 locks all per-type extraction approaches.)

## Pass 4 -- Gameplay-content scope + shape decision

(Pending; covers the 5 enum taxonomies, 10 struct-array gameplay tables, 7 XSD match-event types.)

## Pass 5 -- Per-category gameplay-content design

(Pending; given Pass 4's locked shape.)

---

## Discovery-sweep findings (informs all passes)

Three-leg sweep run 2026-05-04 (subagent-driven):

**Leg A -- Cross-engine type map (cross-product of 14 existing Layer 1 types):**
- HAS: cvar (295 sites / 219 k_-prefixed -- larger than 1.1 count because Leg A counted all variants), command (326 cmd_t cmds[] rows), info_key (15+ star-keys), log_template (XSD-backed + emission sites in src/logs.c).
- NO: macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, cvar_alias, qc_builtin, asset_* (5 types), protocol_message (consumer not producer).

**Leg B -- API-surface enumeration (registration-style APIs in src/ + include/):**
- 2 cvar APIs (RegisterCvar, RegisterCvarEx).
- 1 main command API (cmd_t cmds[]) + 2 sub-command APIs (frogbot_cmd_t std_commands[], editor_commands[]).
- 10 struct-array gameplay tables: fb_spawn_t (item + std spawners), bloodfest_monster_t, locmacro_t, teamplay_message_t, race_score_system_t, stats_format_t, wipeout configs, dropitem_spawn_t, fixed_maps_list[].
- 5 enum-backed gameplay taxonomies: UserModes_t, electType_t, gameType_t, lsType_t, deathType_t.

**Leg C -- Auxiliary committed docs:**
- ktxlog_0.1.xsd: 7 match-event types (pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup, damage, death). Structurally distinct from MVDSV log_template; new entity-type candidate.
- example-configs/ktx/: cross-validation oracle (used in 1.1 cvar-bucket diff).
- tools/q3asm/, tools/cross-cmake/: pure build tooling; no entities.

**Methodology lesson:** the three-leg discovery sweep prevented the ezQuake-style scope balloon. Worth landing as `Pre-Port Discovery Sweep` section in EXTRACTOR-PLAYBOOK.md. Tracked.
