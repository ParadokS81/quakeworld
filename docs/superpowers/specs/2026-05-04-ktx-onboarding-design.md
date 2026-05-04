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

**Doctrine fixes deferred to end-of-arc:**
- OVERVIEW.md / EXTRACTOR-PLAYBOOK.md / extractor CLAUDE.md / extraction-pipeline-vision memory all incorrectly state KTX is QuakeC + tree-sitter. Canonical KTX is pure C; libclang is the right toolchain. Fix as part of arc execution.
- `apps/qw-oracle/SCHEMA.md` slim-doc sweep -- the existing HANDOVER followup *"qw-oracle slim-doc Arc 1 refresh sweep"*. Currently flagged as a free-floating doc-hygiene task, but SCHEMA.md staleness is now load-bearing because Pass 3's migration adds a `log_template_versions.channel` value (`'logfile'`) that a future reader walking SCHEMA.md will not see. The sweep MUST run AFTER KTX migration lands (otherwise it documents 4 channels and re-stales the moment KTX ships). End-of-arc is the right sequencing slot.

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

### Verification findings (2026-05-04)

Pre-flight verification of Pass 1's accumulated schema-delta claims against the live schema (migration files + dev DB):

- **`entities.project` CHECK** — already includes `'ktx'` per `002_layer1_schema.sql`. Confirmed across all 8 tables that share the `project IN (...)` shape. No widening needed. The Pass 1 "verify during execution" caveat resolves to "no work."
- **`log_template_versions.channel` CHECK** — currently `('broadcast','client','console','system')` (4 values). Live dev DB confirms only those 4 values are in use today (all from MVDSV). KTX needs `'logfile'` added to admit `log_printf()` emission sites (~28 per Pass 1.7). One CHECK widening.
- **No new columns** for any of the four first-class entity types. Cvars / commands / info_keys / log_templates all reuse existing `*_versions` table shapes. Pattern 14 canonical-name suffixes (`:frogbot:std`, `:frogbot:editor`, `:userinfo`) ride the existing `entities.canonical_id` field. Multi-site dedup uses the existing `all_call_sites_json` JSONB column already present on `log_template_versions` and `info_key_versions`.

**Total schema delta from Pass 1 first-class types:** one migration, one CHECK widening. Nothing else.

### 3.1 -- Migration content: LOCKED

**Filename:** `apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql` (next in lex order; latest committed migration is `007_query_log.sql`).

**SQL:**

```sql
-- 008_ktx_log_template_logfile_channel.sql
--
-- Widen log_template_versions.channel CHECK to admit 'logfile' for KTX's
-- log_printf() emission API. KTX's existing 3 channels map cleanly to MVDSV's
-- (G_bprint -> broadcast, G_sprint -> client, G_cprint -> console); the new
-- 'logfile' channel is unique to KTX's log_printf() (~28 call sites at
-- canonical KTX 1.46).
--
-- Pure additive; no data backfill required (no prior rows with
-- channel='logfile' exist).

ALTER TABLE log_template_versions
  DROP CONSTRAINT log_template_versions_channel_check;

ALTER TABLE log_template_versions
  ADD CONSTRAINT log_template_versions_channel_check
  CHECK (channel IN ('broadcast','client','console','system','logfile'));
```

Standard ALTER TABLE DROP CONSTRAINT + ADD CONSTRAINT pattern. The constraint name `log_template_versions_channel_check` is the Postgres-default for inline column CHECK constraints (`<table>_<column>_check`); arc-executor verifies via `\d log_template_versions` before applying.

### 3.2 -- SCHEMA.md treatment: LOCKED (defer + sequenced linkage)

**Decision:** Pass 3 does not touch SCHEMA.md. The doc-currency rewrite is already a queued HANDOVER followup (*"qw-oracle slim-doc Arc 1 refresh sweep"*) covering all three slim docs (README / SCHEMA / OVERVIEW) plus stale tool counts, retired SQLite framing, and post-Phase-6 MCP shape -- a focused pass, not a one-line touch.

**Crucially:** that sweep is now sequenced as an end-of-arc doctrine fix for THIS arc (added to the spec's "Doctrine fixes deferred to end-of-arc" block), because:
- KTX adds the 5th `log_template_versions.channel` value (`'logfile'`).
- Doing the sweep BEFORE KTX migration lands would document 4 channels and re-stale immediately.
- The sweep MUST run after KTX migration ships so it captures the post-KTX shape.

**Why "schema v18 -> v19" framing in the Pass 3 handoff was wrong:** the v18 numbering comes from the SQLite era's `SCHEMA_VERSION` constant in the now-retired `scripts/load-knowledge/schema.ts`. The Postgres migration model (in place since Arc 1 Phase 2) uses lex-ordered filenames + the `schema_migrations` table; no separate numeric version increments per migration. The SCHEMA.md slim-doc sweep will retire the v18 framing alongside the rest of the SQLite-era prose.

### 3.3 -- Out-of-Pass-3 schema considerations: NONE

Pass 1's seven sub-questions all resolved without surfacing new tables or columns. Items that might look schema-shaped but aren't:
- F1 quality-grid probes for KTX -- verification scaffolding, not schema. Arc-executor adds them per the EXTRACTOR-PLAYBOOK conventions.
- `PROJECT_VERSION_ALIASES` / loader-dispatch updates for KTX -- code-level wiring in `extract-tag.ts` and the load-* CLIs, not migrations.
- KTX out-of-scope items (Bucket 3 indexed-family cvars, truly-orphaned k_* drift, dusty-ktx fork) -- documented in OUT_OF_SCOPE.md by arc-executor; no schema slot.

### Pass 3 -- CLOSED

One sub-question landed (3.1, migration content locked) plus one decision on linkage (3.2, SCHEMA.md sweep as end-of-arc obligation). Pass closes faster than the "light pass" framing suggested -- the verification step alone consumed most of the work.

**Carry-forwards:**
- Migration 008 SQL -> arc-executor writes the file from this spec verbatim during Phase 0 of execution.
- SCHEMA.md sweep -> end-of-arc work (already in "Doctrine fixes deferred to end-of-arc"); HANDOVER followup updated to name the dependency.
- Pass 4 (gameplay-content scope) is the next real brainstorming pass.

## Pass 4 -- Gameplay-content scope + shape decision

### 4.1 -- Default disposition for KTX gameplay content -- LOCKED

**Decision:** Mixed disposition across the three groups, with the v14 qw-namespace as the default home for gameplay rules + content and one new entity type for match-runtime events.

**Plain-English framing:** ezQuake / FTE / MVDSV / QWCL extraction asks "what kind of knob is this?" (cvar / macro / command / cmdline_param) -- the type comes first, parallel grid across engines. KTX as a mod is a different shape: it's a wrapper that selects a game mode and runs that mode's rules. The right question for KTX gameplay extraction is "what mode does this belong to, and what category of behavior does it control?" -- two axes (mode + kind) on every row, so general questions like "how does scoring work in clan arena" or "what's different about race mode" become real queries against structured data, not source-code reading.

The v14 qw-namespace was built precisely for this two-axis shape. Every `gameplay_entity_defs` / `gameplay_mechanics` row already carries:
- `gameplay_source_id` -- which codebase (id1 / ktx / future mods)
- `ruleset_gate_json` -- which mode within that codebase (e.g. `{"mode":"clan_arena"}`)
- `kind` -- which category of behavior (`spawn_rule` / `death_rule` / `score_system` / etc.)

This means a question like "what does clan arena do differently from standard match play" decomposes cleanly into a `WHERE ruleset_gate_json @> '{"mode":"clan_arena"}'` filter grouped by `kind`. The classification IS the queryable structure; descriptions / numeric values live in `value_numeric` / `value_text` / `props_json`.

**Per-group disposition:**

| Group | Inventory | Disposition | Rationale |
|---|---|---|---|
| A: 5 enum-backed taxonomies | UserModes_t (15 values), electType_t, gameType_t, lsType_t (9 values), deathType_t | qw-namespace `gameplay_mechanics` rows -- one row per enum value, tagged by appropriate `kind` | Enums are the *spine* -- mode definitions and category vocabulary that all Group B rows hang off via `ruleset_gate_json`. Without them the gates are dangling references. `deathType_t` slots into existing `kind='death_rule'`; `UserModes_t` likely needs a new `kind='game_mode'` (CHECK widening). Per-enum kind decisions are Pass 5 territory. |
| B: 10 struct-array gameplay tables | fb_spawn_t, bloodfest_monster_t, locmacro_t, teamplay_message_t, race_score_system_t, stats_format_t, wipeout configs, dropitem_spawn_t, fixed_maps_list[] | qw-namespace `gameplay_entity_defs` (monsters, spawn items) + `gameplay_mechanics` (rules, scoring) -- tagged by mode + kind | This is the *content* -- specific rosters, configs, formulas, classification tables. Hangs off the Group A spine. Bloodfest's 13 monsters become `gameplay_entity_defs` rows with `kind='monster'` (CHECK widening) + `gameplay_source_id='ktx'`. The v14 schema explicitly anticipated this: SCHEMA.md says *"`gameplay_sources` -- registry of gameplay sources (id1 baseline, **ktx overrides in arc 2**, future mods)"* and *"KTX overrides with mode/yawnmode/dmm gates serialise as JSON like `{"yawn":true,"dm":3}` and join into the same row identity."* The 2026-04-27 arc-history entry confirms intent: *"KTX overrides + sub_select_spawn_point + clan_arena algorithmic mechanics queued as arc 2."* |
| C: 7 XSD-defined match-event types | pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup, damage, death (from `resources/extralog/ktxlog_0.1.xsd`) | NEW entity type `match_event` + `match_event_versions` table | Structurally distinct from gameplay rules: programmatic XML emission (not printf, not gameplay logic), version-able (XSD `0.1` today, future `0.2` could add types), rich per-event attributes. Describes match-runtime *output* -- what KTX emits during a game -- not how the game plays. The qw-event-log validation harness (parking doc 2026-04-XX) is explicitly gated on KTX gameplay overrides shipping and joins parser observations against `protocol_message_versions` + `log_template_versions`; `match_event` slots into that pattern as a sibling. Consumers (qw-stats, qwhub) need a queryable per-event-type Layer 1 row. |

**Out of scope for Pass 4:**
- Layer 3 concept notes (parking doc 2026-05-04-ktx-layer3-concept-note-candidates.md) -- get RICHER L1 anchors from this disposition, not poorer. Stay Layer 3, citing the new L1 rows.
- Per-enum kind decisions, per-struct-array kind decisions, exact CHECK widenings -- Pass 5 territory.
- Match_event_versions table column shape -- Pass 5 territory.
- Mode taxonomy details (canonical mode list, mode aliases, gate-shape conventions) -- 4.2 sub-question.

**Schema-cost summary** (precise widenings deferred to Pass 5):
- 1 new `gameplay_sources` row (data, not schema): `('ktx', 'KTX -- QuakeWorld server modification', '/research/repos/ktx/src', ...)`.
- 1-3 CHECK widenings on `gameplay_entity_defs.kind` (likely `'monster'` at minimum) and `gameplay_mechanics.kind` (likely `'game_mode'` at minimum; possibly `'score_system'`, `'lastman_variant'`, etc.). Specific widenings locked in Pass 5.
- 1 new `entities.type` value: `'match_event'`.
- 1 new per-version table: `match_event_versions`.
- All pure-additive migrations.

**Alternative considered + rejected:** "Everything as new entity types" -- Group B becomes new types like `monster_def` / `spawn_config` / `score_system`. Gives version tracking + change events + first_seen_version for free via the entities/versions arc, but duplicates infrastructure the qw-namespace already provides and discards v14 design intent (cross-mod modeling: id1 baseline + KTX overrides + future mods all in one polymorphic table). Rejected.

**Alternative considered + rejected:** "All Layer 3 only / deferred" -- skip Layer 1 anchors for KTX gameplay, rely on prose-only concept notes. Loses mode-aware retrieval (no `WHERE mode='clan_arena'` queries possible without structured rows), loses the validation-harness anchor for Group C, drops the qw-namespace v14 intent on the floor. Rejected.

### 4.2 -- Mode taxonomy spine -- LOCKED

**Decision:** flat catalog of 17 user-facing modes from `um_list[]` at `commands.c:4527-4546`. One `gameplay_mechanics` row per **`um_list[]` entry** with `kind='game_mode'`. Single-key gate convention `{"mode":"<token>"}` everywhere else. Internal two-level design (team-structure layer + ruleset-overlay layer) preserved as multi-axis metadata in `props_json`.

**Note on catalog basis:** the catalog is `um_list[]` (17 user-facing entries), NOT `UserModes_t` (15 internal enum values incl. `umUnknown`). Three user-facing modes (`wipeout`, `ca`, `tot`) **alias** existing UserModes_t values -- they share the internal team-structure (`UM_4ON4` for wipeout/ca, `UM_FFA` for tot) but stamp different rules via different `_um_init` functions. So the catalog has 17 rows; some pairs/triples share the `team_structure` axis in `props_json`.

**Source-verified facts driving the decision:**

- Every mode-switch command (`1on1` / `2on2` / `4on4` / `ctf` / `ffa` / `wipeout` / `ca` / `race` / etc.) routes through a single function `UserMode(float)` (`commands.c:809-825` cmd table; `commands.c:4616` function definition). There is one global `UserModes_t current_umode` (`commands.c:4548`); the mod is in exactly one mode at a time.
- Pressing `2on2` from CTF performs a full mode switch (current_umode := um2on2), not a configuration update within CTF. xonx values are peer modes, not configurations carried across other modes. Confirmed by operator empirical observation + source.
- Internal two-level design exists at `um_list[]` (`commands.c:4527-4546`):
  - **Team-structure layer** (col 4, `UM_*` enum: UM_1ON1, UM_2ON2, UM_3ON3, UM_4ON4, UM_10ON10, UM_FFA, UM_CTF, UM_RACE, UM_2ON2ON2, UM_3ON3ON3, UM_4ON4ON4, UM_XONX, UM_1ON1HM).
  - **Ruleset-overlay layer** (col 3, per-mode `_um_init` function).
  - Multiple user-facing modes share a team-structure (`wipeout` + `ca` + `4on4` all ride `UM_4ON4`; `tot` rides `UM_FFA`; `blitz2v2` and `blitz4v4` and `hoonymode` all ride `UM_1ON1HM`) but stamp different rulesets via different `_um_init` functions.
- The integer column 5 in `um_list[]` is `race_plrs_per_team` -- specifically consulted by race mode (`UserMode()` at line 4666: `race_switch_usermode(um, um_list[umode].race_plrs_per_team)`), not a generic "expected per team" count. For non-race modes, per-team roster enforcement is set inside each mode's `_um_init` function via cvar writes (e.g. `_2on2_um_init` writes k_membercount=2). The match-start `CheckMembers(k_membercount)` gate at `match.c:1918` then fires uniformly; the per-mode gate value comes from whatever the init function stamped. This is why the operator's behavioral distinction ("xonx enforces roster, others let you start with any code-allowed config") is real: the enforcement happens inside each `_um_init`, not at the central UserMode dispatcher.

**The 17 user-facing modes** (canonical name -> internal team-structure -> init function):

| User-facing name | Team-structure (UM_*) | Init function | race_plrs_per_team |
|---|---|---|---|
| 1on1 | UM_1ON1 | _1on1_um_init | 1 |
| 2on2 | UM_2ON2 | _2on2_um_init | 2 |
| 3on3 | UM_3ON3 | _3on3_um_init | 3 |
| 4on4 | UM_4ON4 | _4on4_um_init | 4 |
| 10on10 | UM_10ON10 | _10on10_um_init | 10 |
| ffa | UM_FFA | ffa_um_init | -1 (sentinel "any") |
| ctf | UM_CTF | ctf_um_init | 0 |
| hoonymode | UM_1ON1HM | _1on1hm_um_init | 0 |
| blitz2v2 | UM_1ON1HM | _2on2hm_um_init | 0 |
| blitz4v4 | UM_1ON1HM | _4on4hm_um_init | 0 |
| 2on2on2 | UM_2ON2ON2 | _2on2on2_um_init | 0 |
| 3on3on3 | UM_3ON3ON3 | _3on3on3_um_init | 0 |
| 4on4on4 | UM_4ON4ON4 | _4on4on4_um_init | 0 |
| XonX | UM_XONX | _XonX_um_init | 0 |
| wipeout | UM_4ON4 | wipeout_um_init | 0 |
| ca | UM_4ON4 | carena_um_init | 0 |
| tot | UM_FFA | tot_um_init | 0 |

Plus race (declared separately; `cmd_t` row at `commands.c:695` calls `ToggleRace`, separate code path; needs a Pass 5 spike to confirm whether `race` is also a `kind='game_mode'` row or sits outside the `um_list[]` catalog -- one open carry-forward).

**Catalog row schema** (one `gameplay_mechanics` row per user-facing mode):

```
name              = "<canonical_token>"        -- e.g. "wipeout", "2on2", "ca"
kind              = "game_mode"                 -- new CHECK value (1 widening)
value_text        = "<source_enum_spelling>"   -- e.g. "umWIPEOUT", "um2on2", "umCA"
source_ref        = "match.c:<enum-line>"      -- UserModes_t declaration site
ruleset_gate_json = {}                          -- empty: catalog rows DEFINE modes, aren't gated by them
props_json        = {
  "team_structure":      "<UM_*>",            -- internal team layer (col 4 of um_list)
  "init_function":       "<*_um_init>",        -- ruleset-overlay setup fn (col 3)
  "race_plrs_per_team":  <int>,                -- race-specific count field (col 5)
  "user_facing_label":   "<col 2 string>",     -- some contain \223-style char codes for digit glyphs
  "source_xrefs":        ["commands.c:<cmd-row-line>", "commands.c:<um_list-row-line>"]
}
```

**Naming convention:** canonical tokens (the `name` column) match the user-facing command spelling exactly (`ca`, not `clan_arena`; `2on2`, not `two_on_two`). Reasoning: tokens flow into `ruleset_gate_json` across hundreds of rows AND into MCP query examples AND into concept notes. Source-fidelity lets a server-admin reading source / typing commands / writing a concept note all use the same identifier without translation. The source enum spelling (`umCA`) lives in `value_text` for traceability.

**Gate convention everywhere else:** rules and content rows gate on `{"mode":"<token>"}` -- the user-facing token, not the internal axis. Reasoning: the user-facing token is what server admins, players, and concept notes will reference. Internal axes are queryable but not load-bearing in the gate. Cross-mode rules use array-valued gates `{"mode":["wipeout","ca","4on4"]}` OR duplicate rows -- Pass 5 picks the convention case-by-case based on how the source expresses each rule.

**Per-mode roster-enforcement, weapon damage, scoring rules, etc. do NOT live in the catalog row.** They land as separate `gameplay_mechanics` rows extracted from inside each `_um_init` function (and from elsewhere in the source -- combat.c, items.c, scoring code), each tagged with `{"mode":"<token>"}`. The catalog row is purely definitional -- "this mode exists, here's its identity and source citation." Behavior is a query against rows that gate on the mode.

**Schema cost for 4.2:**
- 1 CHECK widening: `gameplay_mechanics.kind` admits `'game_mode'`.
- ~17-18 catalog rows when extraction lands.
- 0 new columns / 0 new tables.

**Carry-forwards from 4.2 to 4.3+ / Pass 5:**
- `race` mode disposition -- is it the 18th catalog row, or does it sit outside `um_list[]`? Quick source spike in Pass 5.
- Cross-mode gate convention -- array-valued gates vs duplicate rows. Decided per rule based on source shape, not globally.
- Token spelling for any modes where source-fidelity collides with discoverability (e.g., should `tot` get an alias `tribe_of_tjernobyl`?). Likely no aliases (canonical-token-only), but flagged for Pass 5 verification when concept notes start citing.

### 4.3 -- Remaining Group A enums (lsType_t, gameType_t, electType_t, deathType_t) -- LOCKED

Source spike (`g_local.h:162-202`, `progs.h:216-225`, `deathtype.h`) settles all four:

#### `lsType_t` (10 values) -- SKIP

Header declares it `// lastscores type` (`g_local.h:202`). It is the **post-match scoreboard formatting classifier**, NOT a definitional gameplay enum. The discovery sweep mis-classified it. `lastscores2str(lsType_t lst)` at `commands.c:6746` derives the value from the active mode + cvar state at runtime (e.g., `lst = cvar("k_clan_arena") == 2 ? lsWO : lsCA` at `commands.c:6863`; `lst = (isRA() ? lsRA : lsFFA)` at line 6808). Pure display-formatting infrastructure with zero gameplay-query value.

**Disposition:** document in `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` as "lastscores formatter classifier; derived from active mode + cvar state at scoreboard-display time; no Layer 1 row." 0 schema cost.

#### `gameType_t` (5 values: gtUnknown, gtDuel, gtTeam, gtFFA, gtCTF) -- SKIP as standalone rows; capture as catalog metadata

Same shape as lsType_t -- a derived classifier, not definitional. Comment at `g_local.h:1065`: `extern gameType_t k_mode; // game type: DUEL, TP, FFA`. The `k_mode` global is set by mode init; helper macros (`isDuel()`, `isTeam()`, `isFFA()`, `isCTF()`) gate behavior throughout the mod by checking `k_mode`. The classification is a property of each user-facing mode, not its own catalog.

**Disposition:** add `game_type` field to each catalog row's `props_json`. Buckets: `"Duel"` / `"Team"` / `"FFA"` / `"CTF"` / `"Unknown"`. Lets cross-mode queries like *"what duel-shaped modes does KTX support?"* run via `WHERE props_json->>'game_type' = 'Duel'` against the catalog rows.

Examples:
- `1on1` / `hoonymode` -> `props_json.game_type = "Duel"`
- `2on2` / `3on3` / `4on4` / `10on10` / `wipeout` / `ca` / `2on2on2` / `3on3on3` / `4on4on4` / `XonX` / `blitz2v2` / `blitz4v4` -> `"Team"`
- `ffa` / `tot` -> `"FFA"`
- `ctf` -> `"CTF"`

(Exact mapping per mode is Pass 5 -- needs to read each `_um_init` function to confirm what `k_mode` gets set to. The above is informed-best-guess from naming + helper macros; a couple may shift after spike.)

**Disposition (continued):** document gameType_t in OUT_OF_SCOPE.md as "subsumed into catalog props_json.game_type; no standalone Layer 1 rows." 0 new schema (the props_json field rides the existing column).

#### `electType_t` (6 values: etNone, etCaptain, etCoach, etAdmin, etSuggestColor, etLateJoin) -- INCLUDE

Source: `progs.h:216-225`. Substantively different from the previous two -- this is a **first-class subsystem catalog** for KTX's voting/election infrastructure. Player elections (captain, coach, admin), color-suggestion votes, late-join votes are all represented here. Used by `is_elected(p, et)` at `progs.h:793` and the voting machinery in `vote.c`. Concept-note candidate: "How voting works on KTX servers."

**Disposition:** new `kind='election_type'` (CHECK widening on `gameplay_mechanics.kind`). 5 useful rows (skip `etNone` sentinel). No mode gate -- elections are subsystem-level, available regardless of active mode.

Per-row schema:
```
name              = "captain" / "coach" / "admin" / "suggest_color" / "late_join"
kind              = "election_type"
value_text        = "etCaptain" / "etCoach" / "etAdmin" / "etSuggestColor" / "etLateJoin"
source_ref        = "progs.h:<line>"
ruleset_gate_json = {}
props_json        = {
  "description":           "<short>",
  "related_commands_json": ["<vote-command-name>", ...],   // populated from vote.c grep
  "required_role":         "<player|admin|elected_admin>"  // who's allowed to call this election
}
```

#### `deathType_t` (28 values from `deathtype.h` X-macro) -- INCLUDE

Source: `g_local.h:230-237` plus the `deathtype.h` X-macro file. The `DEATHTYPE(dtAXE, axe)` pattern ships **both** the enum tag and a string token in each row -- exactly the dual-key data shape we want. The 28 entries cover weapon kills (axe / sg / ssg / ng / sng / gl / rl / lg_beam / lg_dis / lg_dis_self / hook), environmental deaths (lava / slime / water / fall / squish / explo_box / laser / fireball / trigger_hurt), telefrags (tele1 through tele4), self (suicide for `/kill`), and sentinels (none / unknown / changelevel).

**Disposition:** existing `kind='death_rule'` (already in v14 CHECK; **0 widenings**). ~25 useful rows (Pass 5 picks final cut: at minimum exclude `dtNONE` and `dtUNKNOWN` sentinels; `dtCHANGELEVEL` may stay as a structural row). No mode gate by default -- death types are universal across modes (any mode-restriction lives in `props_json`).

Per-row schema:
```
name              = "<string token from macro>"   -- e.g. "axe", "ssg", "rl", "lg_dis", "lava", "squish", "suicide"
kind              = "death_rule"
value_text        = "<dt enum tag>"               -- e.g. "dtAXE", "dtSSG"
source_ref        = "deathtype.h:<line>"
ruleset_gate_json = {}
props_json        = {
  "category":         "weapon" | "environment" | "telefrag" | "self" | "structural",
  "id1_baseline":     bool,           // fires in pure id1 mode
  "ktx_extension":    bool,           // KTX-introduced taxonomy distinction
  "related_weapon":   "<name>"|null   // e.g. dtRL.related_weapon = "rocket_launcher" (joinable to gameplay_entity_defs.kind=weapon)
}
```

**qw-event-log validation harness anchor:** these ~25 rows are the cross-validation target for the parser's `WeaponType` enum (parking doc `2026-04-XX-qw-event-log-cross-validation.md`). The `id1_baseline` / `ktx_extension` flags let the harness segment "should fire on id1 demos" vs "only fires on KTX demos."

---

**Schema cost from 4.3:**
- 1 CHECK widening: `gameplay_mechanics.kind` admits `'election_type'`.
- 0 widening for `'death_rule'` (already in v14 CHECK).
- ~5 election_type rows + ~25 death_rule rows when extraction lands.
- 0 new tables / 0 new columns.

**Cumulative Pass 4 schema cost so far** (4.1 + 4.2 + 4.3):
- 2 CHECK widenings on `gameplay_mechanics.kind`: `'game_mode'`, `'election_type'`.
- 1 new entity type `'match_event'` + 1 new `match_event_versions` table (Pass 4.6 designs columns).
- 1 new `gameplay_sources` row for `'ktx'` (data, not schema).
- All pure-additive migrations.

### 4.4 -- Group B struct-array tables: kind decisions -- LOCKED

Source spike across 9 declared struct-array tables; **5 IN as Layer 1 rows in qw-namespace, 4 OUT to OUT_OF_SCOPE.md.**

#### IN -- 5 tables become qw-namespace gameplay rows

| Source table | File:line | Rows | qw-namespace table | New `kind` value | Default gate |
|---|---|---|---|---|---|
| `bloodfest_monster_array[]` | `sp_monsters.c:60` | 13 | `gameplay_entity_defs` | `'monster'` | `{"mode":"bloodfest"}` |
| `race_score_system_t scoring_systems[]` | `race.c:5148` | 3 | `gameplay_mechanics` | `'score_system'` | `{"mode":"race"}` |
| `dropitem_spawn_t dropitems[]` | `commands.c:9075` | ~20 | `gameplay_mechanics` | `'drop_item'` | `{}` (universal) |
| `locmacro_t locmacros[]` | `teamplay.c:1491` | 16 | `gameplay_mechanics` | `'loc_macro'` | `{}` (universal) |
| `teamplay_message_t messages[]` | `teamplay.c:1645` | ~30 | `gameplay_mechanics` | `'teamplay_message'` | `{}` (universal) |

**Per-row props_json (Pass 5 designs exact field set; minimum captured below):**

- **monster** (`gameplay_entity_defs`): `{ "count_per_wave": int, "count_modifier": int, "has_quad": bool, "array_position": int }`. Source has ordering significance (`maps.c:62` comment: "WARNING: FISH _MUST_ BE _FIRST_ IN ARRAY, I HAVE HACK FOR IT IN bloodfest_spawn_monsters()!!!"); preserve via `array_position`.
- **score_system** (`gameplay_mechanics`): `{ "points_array": [int x10], "winner_bonus": int, "completion_points": int, "opponent_beat_points": int, "max_points": int }`. The 10-element points array carries the per-position payouts (Formula1 sees [25,18,15,...]; Win Only sees [1,0,0,...]).
- **drop_item** (`gameplay_mechanics`): `{ "drop_token": "<h15|ga|...>", "spawned_classname": "<item_health|...>", "spawn_flag_raw": "<H_ROTTEN|0|...>", "spawn_flag_value": int, "related_entity_canonical_id": "qw:gameplay_entity_def:<...>" }`. The `related_entity_canonical_id` joins to existing id1 baseline `gameplay_entity_defs` rows for the underlying item.
- **loc_macro** (`gameplay_mechanics`): `{ "expansion_value": "<value>", "is_identity": bool, "related_item": "<gameplay_entity_def name|null>" }`. The teamsay `.loc`-file macro vocabulary used for chat-message expansion; most are identity (`ssg -> ssg`), the standout is `mh -> mega`.
- **teamplay_message** (`gameplay_mechanics`): `{ "description": "<short label>", "handler_function": "<TeamplayYesOk|...>", "source_ref_handler": "teamplay.c:<line>" }`. The canonical KTX teamplay-binds vocabulary (yesok, nocancel, soon, waiting, slipped, replace, trick, coming, getquad, getpent, quaddead, enemypwr, youtake, killme, [more]). High-value for both query and concept-note authoring (operator's reference card "QW Teamsay System").

#### OUT -- 4 tables stay in OUT_OF_SCOPE.md

- **`fb_spawn_t stdSpawnFunctions[]`** (`bot_loadmap.c:170`, 14 rows) and **`fb_spawn_t itemSpawnFunctions[]`** (`bot_items.c:938`, ~17 rows): bot-subsystem dispatch tables mapping Quake classname -> bot-handler-function. Pure path-finding-init registration registries. Concept-note value: minimal. The gameplay content these reference (items, doors, triggers) is already in id1 baseline `gameplay_entity_defs`. Skip Layer 1 rows; Layer 3 concept note candidate 5 ("Frogbots in KTX") can cite source files directly.
- **`stats_format_t file_formats[]`** (`stats.c:10`, 2 rows): xml + json formatter dispatcher. Pure infrastructure. The substantive XSD-defined match-event content lives in Group C (`match_event` entity type, Pass 4.6).
- **`fixed_maps_list[]`** (`maps.c:24`, 38 entries): **engine-compat workaround**. MVDSV's `trap_FS_GetFileList` doesn't enumerate maps inside pak archives, so KTX manually seeds id1 stock map names (e1m1-e4m8, dm1-dm6, start, end) into the available-maps list at server startup. FTE-server skips this (FTE's filesystem layer walks paks). Source: comment at `maps.c:192` "add maps like dm3 dm2 e1m2 etc from paks, FTE doesn't need it." All 38 names already exist as `qw.maps` rows (v13 schema, 2026-04-27 map-knowledge arc). The order in the array is not gameplay-meaningful (no campaign sequence); it's a human-readable grouping. **No Layer 1 row, no maps-table annotation, no concept-note dependency, no followup.** Investigation confirmed by reading consumer at `maps.c:165-195`.

OUT_OF_SCOPE.md entries land alongside the existing Bucket-3 indexed-family / orphaned-drift cvar entries from Pass 1.

---

**Schema cost from 4.4:**
- 5 CHECK widenings:
  - `gameplay_entity_defs.kind`: +1 (`'monster'`)
  - `gameplay_mechanics.kind`: +4 (`'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'`)
- ~82 new qw-namespace rows when extraction lands (13 monsters + 3 score-systems + ~20 drop-items + 16 loc-macros + ~30 teamplay-messages).
- 0 new tables / 0 new columns.

**Cumulative Pass 4 schema cost so far** (4.1 + 4.2 + 4.3 + 4.4):
- 1 CHECK widening on `entities.type`: `'match_event'`.
- 1 CHECK widening on `gameplay_entity_defs.kind`: `'monster'`.
- 6 CHECK widenings on `gameplay_mechanics.kind`: `'game_mode'`, `'election_type'`, `'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'`.
- 1 new table: `match_event_versions` (Pass 4.6 designs columns).
- 1 new `gameplay_sources` row for `'ktx'` (data, not schema).
- All pure-additive migrations.

**Total Pass 4 cumulative schema impact so far: 8 CHECK widenings + 1 new table.** Heavy but all additive.

### 4.5 -- `match_event` entity type column shape -- LOCKED

**Plain-English summary:** the new `match_event` entity type holds one row per XSD event-type (7 rows: pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup, damage, death). Each row captures the attribute-schema for that event type (what fields it has, what types they are, what value constraints apply). The qw-event-log validation harness can join parser observations against these rows to verify "the parser saw a death event with attribute X; does Layer 1 say X is a valid death attribute?"

**Source-verified facts:**

- XSD shape (`resources/extralog/ktxlog_0.1.xsd`): 7 event types share 5 distinct complex types. `pick_backpack` + `drop_backpack` share `backpacktype`; `pick_powerup` + `drop_powerup` share `poweruptype`.
- Per-event attribute counts: pick_mapitem=4, backpack-events=7, powerup-events=4, damage=8, death=8.
- Named simpleType constraints: `maxed_integer` (0-200), `iptype` (IP-address pattern), `modetype` (`FFA|duel|team`), `porttype` (0-65535).
- Emission machinery (verified via grep across `items.c` / `combat.c` / `client.c` / `logs.c`): 13 emission call sites total (6 pick_mapitem, 1 each for pick_powerup / drop_powerup / pick_backpack / drop_backpack, 2 damage, 1 death). All emit via `log_printf("\\t\\t\\t<event_name>\\n...")` -- literal XML format strings into the same logfile API Pass 1.7 captures.
- Gating cvars: `k_extralog` (boolean enable, registered at `world.c:1004`), `k_extralog_xsd_uri` (XSD reference URL, `logs.c:123`), `extralogname` (output filename, `match.c:2344` + `logs.c:119`).

**Important interaction with Pass 1.7:** Pass 1.7's printf-handler will catch each XML emission site as a `log_template_versions` row (channel='logfile', format_string=`"\t\t\t<pick_mapitem>\n..."`), ~13 such rows. **Decision: KEEP THE DUAL ROWS.** log_template captures *where the emission happens in source* (per site, ~13 rows); match_event captures *what the event-type schema is* (per type, 7 rows). Different facets. Document in EXTRACTOR-PLAYBOOK so future maintainers don't try to deduplicate.

**`match_event_versions` table:**

```sql
CREATE TABLE IF NOT EXISTS match_event_versions (
  entity_id BIGINT NOT NULL REFERENCES entities(id),
  version              TEXT NOT NULL,
  event_name           TEXT NOT NULL,                  -- "death", "damage", "pick_mapitem", "pick_backpack", "drop_backpack", "pick_powerup", "drop_powerup"
  complex_type         TEXT NOT NULL,                  -- XSD complexType: "deathtype", "damagetype", "mapitemtype", "backpacktype", "poweruptype"
  attributes_json JSONB NOT NULL,                      -- ordered array, preserves XSD <xs:sequence> order
  xsd_path             TEXT NOT NULL,                  -- "resources/extralog/ktxlog_0.1.xsd"
  xsd_version          TEXT,                            -- parsed from <version>0.1</version> in emission preamble
  emission_call_sites_json JSONB,                      -- [{"file":"items.c","line":220}, ...] from emission-site grep
  raw_ast_hash         TEXT,
  source_root          TEXT,
  extracted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_complex_type ON match_event_versions(complex_type);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_xsd_version ON match_event_versions(xsd_version);
```

**`attributes_json` shape** (example for `death`):
```json
[
  {"name": "time",       "type": "xs:decimal",            "constraint": null},
  {"name": "attacker",   "type": "xs:string",             "constraint": null},
  {"name": "target",     "type": "xs:string",             "constraint": null},
  {"name": "type",       "type": "xs:string",             "constraint": null},
  {"name": "quad",       "type": "xs:boolean",            "constraint": null},
  {"name": "armorleft",  "type": "maxed_integer",         "constraint": {"base": "xs:nonNegativeInteger", "minInclusive": 0, "maxInclusive": 200}},
  {"name": "killheight", "type": "xs:nonNegativeInteger", "constraint": null},
  {"name": "lifetime",   "type": "xs:decimal",            "constraint": null}
]
```

**Why JSONB array, not separate attribute table:** matches existing v15 per-version table convention (cmdline_param_versions uses `flags_json`, ruleset_versions uses `locked_cvars_json`, cvar_alias_versions uses `value_transform_params_json`). 7 events × ~6 attrs = ~42 entries per version; JSONB queries are cheap.

**Why separate `xsd_version` column:** XSD file might rename or move across KTX versions while keeping content stable, or vice versa; the version content lives inside the XSD. Indexed for cross-version queries like "which KTX tag introduced ktxlog 0.2?"

**Why `emission_call_sites_json`:** pre-aggregates the connection to printf log_template rows (which carry the per-site truth). Mirrors `log_template_versions.all_call_sites_json` from the v17 followup (Phase 2e MVDSV).

**Handler shape (Pass 5 designs implementation):** NOT a libclang AST handler -- the truth lives in the XSD file, not the C source. Two-stage:
1. XSD parse (Python `xml.etree.ElementTree` or `lxml`): walk the schema, extract complexType definitions, build `attributes_json` per event type.
2. Emission-site grep (regex over `items.c` / `combat.c` / `client.c`): find `log_printf("\\t\\t\\t<event_name>...` patterns; collect file:line per event_name; populate `emission_call_sites_json`.

**Output filename:** `ktx-match-events-ast.json` (cross-engine convention -- `-ast` suffix retained for filename uniformity even though this handler is XSD-driven).

**Loader:** new `load-match-events.ts` in `apps/qw-oracle/scripts/load-knowledge/`, mirroring `load-log-templates.ts` shape.

**Carry-forwards to Pass 5:**
- No CHECK on `complex_type` (allows additive evolution -- KTX 0.2 could introduce new types without schema migration).
- No CHECK on `xsd_version` (metadata field, not a discriminator).
- Pass 1.7's printf-handler is NOT modified to skip XML-shaped log_printfs -- dual rows (log_template + match_event) intentionally retained, documented in PLAYBOOK.

**Schema cost from 4.5:**
- 1 new table: `match_event_versions` (PK + 2 indexes).
- 7 entity rows + 7 match_event_versions rows per KTX tag (extraction data).
- 0 new columns on existing tables.

---

## Pass 4 -- CLOSED

All five sub-questions locked: 4.1 (group disposition: qw-namespace for A+B, new `match_event` entity type for C) -- 4.2 (mode taxonomy spine: 17-row flat catalog from `um_list[]` + single-key gate convention + multi-axis metadata in props_json) -- 4.3 (remaining Group A enums: lsType_t / gameType_t SKIP, electType_t / deathType_t IN) -- 4.4 (Group B struct-arrays: 5 IN, 4 OUT) -- 4.5 (`match_event` row shape and `match_event_versions` table).

**Total Pass 4 schema impact:**
- 1 CHECK widening on `entities.type`: `'match_event'`.
- 1 CHECK widening on `gameplay_entity_defs.kind`: `'monster'`.
- 6 CHECK widenings on `gameplay_mechanics.kind`: `'game_mode'`, `'election_type'`, `'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'`.
- 1 new table: `match_event_versions`.
- 1 new `gameplay_sources` row for `'ktx'` (data, not schema).

**Total Pass 4 row impact (per KTX tag, when extraction lands):**
- 17 catalog rows (`kind='game_mode'`)
- 5 election-type rows (`kind='election_type'`)
- ~25 death-rule rows (`kind='death_rule'`, existing CHECK)
- 13 monster rows (`kind='monster'` in entity_defs)
- 3 score-system rows (`kind='score_system'`)
- ~20 drop-item rows (`kind='drop_item'`)
- 16 loc-macro rows (`kind='loc_macro'`)
- ~30 teamplay-message rows (`kind='teamplay_message'`)
- 7 match-event rows (entity_type='match_event' + match_event_versions)
- **Total qw-namespace gameplay additions: ~136 rows.** Plus 7 match_event entity rows.

**Carry-forwards to Pass 5 / arc execution:**
- Per-mode `_um_init` extraction (mode-gated `gameplay_mechanics` rows reading from each mode's setup function -- where roster enforcement, weapon damage adjustments, scoring rules actually live). Significant Pass 5 work.
- `race` mode disposition: 18th catalog row or sits outside `um_list[]`? Quick spike.
- `lsType_t`, `gameType_t`, `stats_format_t`, `fb_spawn_t` (×2), `fixed_maps_list[]` -- document in OUT_OF_SCOPE.md per spec content above.
- Pass 1.7 printf-handler keeps catching XML-shaped log_printfs as `channel='logfile'` log_template rows (intentional dual-row design with match_event rows).
- Migration files: cumulate CHECK widenings into one or more migrations during Phase 0/1 of arc execution (precise migration filename + content drafted by arc-planner, not Pass 4).

**Carry-forwards to other workstreams:**
- Layer 3 concept-note candidates 2 (KTX game modes index) and 7 (KTX matchlog format) at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md` get rich Layer 1 anchors from Pass 4 dispositions.
- qw-event-log validation harness parking doc (`2026-04-XX-qw-event-log-cross-validation.md`) is now **unblocked at the schema level** -- match_event rows give it the Layer 1 anchors it needs once KTX onboarding ships.
- bot-subsystem concept note (Layer 3 candidate 5) cites source files directly; no L1 anchors from Pass 4 (fb_spawn handlers are SKIP per 4.4).



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
