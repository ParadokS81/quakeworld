# Phase 1 -- Foundation (Pattern 6 lift + migrations 008/009/010 + ktx gameplay_sources row)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase.
> 4. Source-walk the relevant KTX files at `research/repos/ktx/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as a template (e.g., MVDSV's `_handler_log_templates.py` for KTX's match_event loader). Do NOT subclass; port (D3).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Phase 1 lands the schema and shared-infrastructure foundation that every subsequent KTX phase relies on. Three deliverables: (1) lift Pattern 6 (`#define` resolution) from same-file-only to depth-1 `#include` walk in `extractor_lib._source` so cross-header macros like KTX's `LGCMODE_VARIABLE` and `TOT_MODE_VARIABLE` resolve for any engine handler; (2) ship three pure-additive migrations (008 widens `log_template_versions.channel` to admit `'logfile'`; 009 widens `entities.type` to admit `'match_event'` and creates `match_event_versions`; 010 widens `gameplay_entity_defs.kind` and `gameplay_mechanics.kind` to admit the eight new gameplay-content kind values); (3) seed one `gameplay_sources` row for `'ktx'` so Phase 2-6 loaders can FK-reference it. Runnable state at boundary: dev DB schema admits all KTX content; cross-header macros resolve via libclang for any engine; the `'ktx'` gameplay source row exists and Phase 2 can begin without precondition work.

## Inputs from previous phase

Phase 0 complete:
- Doctrine fixes shipped across five reference sites (OVERVIEW.md, EXTRACTOR-PLAYBOOK.md, extractors/CLAUDE.md, VALIDATION-RUNBOOK.md, user-memory `project_extraction_pipeline_vision.md`).
- Obsolete TS regex extractor at `apps/qw-oracle/scripts/extractors/ktx/commands.ts` deleted.
- `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` exists with seven Phase-0 SKIP entries.
- `apps/qw-oracle/scripts/extractors/ktx/output/` directory preserved (Phase 2 lands handler outputs there).
- F22 captured in `review-findings.md`; Phase 0 commit landed cleanly on main.

Plus the prerequisites inherited from Arc 1 (`prerequisites.md`):
- Postgres dev container `qw-oracle-postgres-dev` running.
- `bun --version` >= 1.3 in `apps/qw-oracle/`.
- KTX research repo cloned at `research/repos/ktx/`.
- libclang 18 + python3-clang available (verified by any prior extractor run).
- Latest committed migration is `007_query_log.sql` (verified: no 008-010 files exist on disk before Phase 1 starts).

## Files touched

### Created

```
apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql
apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql
apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql
apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_collect_file_macros.py   # pytest-shaped lift test, sits alongside existing tests/ files
```

### Modified

```
apps/qw-oracle/scripts/extractors/extractor_lib/_source.py            # add collect_file_macros(tu, target_file_path) -> dict[str, str]
apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py           # walk_tu_dispatch populates v.file_macros for every visitor; Visitor base class declares file_macros class attr default
apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py        # consume self.file_macros from walk_tu_dispatch (replaces local _file_macros / _DEFINE_STRING_RE regex population)
```

### Deleted

n/a

## Tasks

### Task 1: Write migration 008 (log_template_versions.channel widening)

**Goal:** Land `apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql` with the SQL locked verbatim in spec section 3.1.

**Files:**
- `apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql` with EXACTLY the following content:

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

(End of file content. ASCII only; single trailing newline.)

**Verification:**
- `test -f apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql` exits 0.
- `grep -c "ADD CONSTRAINT log_template_versions_channel_check" apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql` returns `1`.
- PASS condition: file present with both DROP + ADD statements.
- FAIL condition: file missing OR only one of DROP / ADD present.

**Execution mode:** `inline` -- pure SQL DDL with full content shipped above; no logic; mechanical Write call.

### Task 2: Write migration 009 (entities.type widening + match_event_versions table)

**Goal:** Land `apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql` with the entities.type CHECK widening + the new `match_event_versions` table per Pass 4.5 column shape.

**Files:**
- `apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql` with EXACTLY the following content:

```sql
-- 009_ktx_match_event_type.sql
--
-- Two changes ride one migration because they atomically introduce the
-- new 'match_event' entity type:
--   1. Widen entities.type CHECK to admit 'match_event'.
--   2. Create match_event_versions per-version table (PK + 2 indexes).
--
-- Per Pass 4.5: 7 entity rows per KTX tag (one per XSD complexType:
-- pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup,
-- damage, death). Source: research/repos/ktx/resources/extralog/ktxlog_0.1.xsd.
--
-- Pure additive; no data backfill required (no prior rows with
-- type='match_event' exist).

ALTER TABLE entities
  DROP CONSTRAINT entities_type_check;

ALTER TABLE entities
  ADD CONSTRAINT entities_type_check
  CHECK (type IN (
    'cvar','command','macro','cmdline_param',
    'keyname','hud_element','ruleset','token_primitive',
    'asset_category','flag_bit','cvar_alias',
    'protocol_message','info_key','log_template','qc_builtin',
    'match_event'
  ));

CREATE TABLE IF NOT EXISTS match_event_versions (
  entity_id                BIGINT NOT NULL REFERENCES entities(id),
  version                  TEXT NOT NULL,
  event_name               TEXT NOT NULL,
  complex_type             TEXT NOT NULL,
  attributes_json          JSONB NOT NULL,
  xsd_path                 TEXT NOT NULL,
  xsd_version              TEXT,
  emission_call_sites_json JSONB,
  raw_ast_hash             TEXT,
  source_root              TEXT,
  extracted_at             TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_complex_type ON match_event_versions(complex_type);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_xsd_version  ON match_event_versions(xsd_version);
```

(End of file content. ASCII only; single trailing newline.)

Note on column-list provenance: the column set above mirrors Pass 4.5 spec section verbatim. Type discipline matches the v15 / v16 / v17 conventions already in 002_layer1_schema.sql:
- `entity_id BIGINT NOT NULL REFERENCES entities(id)` -- mirrors info_key_versions / log_template_versions / protocol_message_versions / qc_builtin_versions.
- `extracted_at TIMESTAMPTZ NOT NULL` -- the post-Phase-2 Postgres convention; matches 002.
- `attributes_json JSONB NOT NULL` and `emission_call_sites_json JSONB` -- JSONB type per D14; consumers receive JS values directly per the postgres-js binding rule.
- No CHECK on `complex_type` or `xsd_version` per Pass 4.5 spec (allows additive evolution without future schema migration).

**Verification:**
- `test -f apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql` exits 0.
- `grep -c "match_event" apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql` returns at least `4` (the new CHECK value, the table name, and two index names).
- `grep -c "CREATE INDEX IF NOT EXISTS" apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql` returns `2`.
- PASS condition: file present with widened CHECK + CREATE TABLE + 2 indexes.
- FAIL condition: file missing OR any of the three components missing.

**Execution mode:** `inline` -- pure SQL DDL with full content shipped above; no logic; mechanical Write call.

### Task 3: Write migration 010 (gameplay-kind widenings)

**Goal:** Land `apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql` widening `gameplay_entity_defs.kind` (+`'monster'`) and `gameplay_mechanics.kind` (+7 new values) per Pass 5.5.

**Files:**
- `apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql` with EXACTLY the following content:

```sql
-- 010_ktx_gameplay_kinds.sql
--
-- Widen the qw-namespace polymorphic CHECK constraints to admit KTX's
-- gameplay-content kinds. Two table touches; eight new kind values total.
--
-- gameplay_entity_defs.kind += 'monster' (Phase 5: bloodfest_monster_array,
-- 13 rows per KTX tag).
--
-- gameplay_mechanics.kind += 7 values:
--   game_mode          (Phase 3: 27 catalog rows -- 17 um_list peers + race
--                       + bloodfest + 8 mutators; per F5)
--   election_type      (Phase 4: 5 rows from electType_t; per F7)
--   score_system       (Phase 5: 3 rows from race scoring_systems; per F10)
--   drop_item          (Phase 5: 30 rows from dropitem_spawn_t; per F11)
--   loc_macro          (Phase 5: 15 rows from teamplay locmacros; per F12)
--   teamplay_message   (Phase 5: 21 rows from teamplay messages; per F13)
--   mode_default       (Phase 3: ~309 rows -- common baseline + per-mode
--                       overlays; per F6 / D12)
--
-- All rows from Phases 3-5 reference gameplay_source_id='ktx' (the
-- gameplay_sources row seeded in Phase 1 Task 5).
--
-- Pure additive; no data backfill required (no prior rows with these
-- kind values exist).

ALTER TABLE gameplay_entity_defs
  DROP CONSTRAINT gameplay_entity_defs_kind_check;

ALTER TABLE gameplay_entity_defs
  ADD CONSTRAINT gameplay_entity_defs_kind_check
  CHECK (kind IN (
    'item','weapon','projectile',
    'monster'
  ));

ALTER TABLE gameplay_mechanics
  DROP CONSTRAINT gameplay_mechanics_kind_check;

ALTER TABLE gameplay_mechanics
  ADD CONSTRAINT gameplay_mechanics_kind_check
  CHECK (kind IN (
    'constant','env_hazard','player_stat',
    'powerup_behavior','armor_model','death_rule',
    'spawn_rule','dm_mode_rule',
    'game_mode','election_type','score_system',
    'drop_item','loc_macro','teamplay_message','mode_default'
  ));
```

(End of file content. ASCII only; single trailing newline.)

**Verification:**
- `test -f apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql` exits 0.
- `grep -c "ADD CONSTRAINT gameplay_entity_defs_kind_check" apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql` returns `1`.
- `grep -c "ADD CONSTRAINT gameplay_mechanics_kind_check" apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql` returns `1`.
- `grep -E "'monster'|'game_mode'|'election_type'|'score_system'|'drop_item'|'loc_macro'|'teamplay_message'|'mode_default'" apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql | wc -l` returns at least `8` (one match per new kind value).
- PASS condition: file present with both ALTER TABLE blocks and all 8 new kind values.
- FAIL condition: file missing OR any new value absent.

**Execution mode:** `inline` -- pure SQL DDL with full content shipped above; no logic; mechanical Write call.

### Task 4: Apply migrations 008 / 009 / 010 to the dev DB

**Goal:** Run `bun db/migrate.ts` against the dev Postgres container so the schema admits all KTX content. The migrator is idempotent; re-runs are safe.

**Files:** none modified by this task; the dev DB state changes.

**Steps:**

- [ ] From `apps/qw-oracle/`, run `bun db/migrate.ts`.
- [ ] Confirm the migrator output reports three new migrations applied (008 / 009 / 010) and zero errors.
- [ ] Confirm `schema_migrations` records all three new filenames:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle \
    -c "SELECT filename, applied_at FROM schema_migrations
        WHERE filename LIKE '008_%' OR filename LIKE '009_%' OR filename LIKE '010_%'
        ORDER BY filename"
  ```
  Expected: 3 rows, one per migration filename, applied_at timestamps within the last few minutes.

**Verification:**
- The migrator exits 0 with no error output.
- `schema_migrations` query returns exactly 3 rows for the three new filenames.
- PASS condition: migrator success + all three rows present.
- FAIL condition: migrator error OR fewer than 3 rows in schema_migrations.

**Execution mode:** `inline` -- mechanical CLI invocation; no logic.

### Task 5: Insert the `'ktx'` row into `gameplay_sources`

**Goal:** Seed the `gameplay_sources` row that Phase 3 / 4 / 5 / 6 loaders FK-reference. Per D5, this is data, not schema, so it does NOT live in a migration file. Idempotent (ON CONFLICT DO UPDATE matching the load-gameplay.ts pattern).

**Files:** none on disk; the dev DB gains one `gameplay_sources` row.

**Steps:**

- [ ] Run the following one-shot SQL against the dev container:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle <<'SQL'
  INSERT INTO gameplay_sources (id, display_name, description, source_root, notes)
  VALUES (
    'ktx',
    'KTX',
    'KTX -- canonical QuakeWorld server modification (https://github.com/QW-Group/ktx). Onboarded via the KTX onboarding arc at docs/superpowers/plans/2026-05-04-ktx-onboarding/.',
    '/research/repos/ktx/src',
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    source_root  = EXCLUDED.source_root,
    notes        = EXCLUDED.notes;
  SQL
  ```

**Verification:**
- `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "SELECT id, display_name FROM gameplay_sources WHERE id = 'ktx'"` returns exactly one row with `id='ktx'`.
- Re-running the INSERT returns success (`UPSERT` semantics) with zero error.
- PASS condition: row present; second run is idempotent.
- FAIL condition: row missing OR INSERT errors.

**Execution mode:** `inline` -- one-shot SQL with full content shipped above; mechanical psql invocation.

### Task 6: Lift Pattern 6 to `extractor_lib._source.collect_file_macros`

**Goal:** Add a shared, libclang-driven cross-header macro collector at `extractor_lib._source` that walks the target file plus its depth-1 `#include` closure, returning a `dict[macro_name, string_literal_value]`. Wire it into `walk_tu_dispatch` so every visitor receives `self.file_macros` automatically. Refactor `ezquake/_handler_commands.py` to consume `self.file_macros` instead of populating its own per-file regex map. The lift is shared infrastructure (D4); KTX's `_handler_modes.py` (Phase 3) is the next consumer but the lift is engine-agnostic.

**Files:**
- `apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` (modified)
- `apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py` (modified)
- `apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py` (modified)
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_collect_file_macros.py` (created)

**Steps:**

- [ ] Add `collect_file_macros(tu, target_file_path: str) -> dict[str, str]` to `apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` with the following contract:

  - **Input:** the libclang `TranslationUnit` produced by `clang.cindex.Index.parse(...)`, plus the target file path the central walker is processing (matches `target_path_str` already passed to `walk_tu_dispatch`).
  - **Output:** `dict[str, str]` mapping macro name -> string-literal body. First-seen-wins on duplicate macro names. Excludes function-like macros, integer / hex constants, and any macro whose body is not exactly one string-literal token.
  - **Scope:** depth-1 only -- macros defined in the target file itself OR in headers that the target file directly `#include`s. Transitive includes are excluded. Per D4.
  - **Implementation sketch** (the executor refines):
    1. Build the depth-1 file allowlist by walking `tu.cursor.get_children()` for `CursorKind.INCLUSION_DIRECTIVE` cursors whose `location.file.name == target_file_path`. For each, resolve `cursor.get_included_file()` and add its `.name` to the allowlist (plus the target file itself).
    2. Walk `tu.cursor.get_children()` for `CursorKind.MACRO_DEFINITION` cursors. Filter to those whose `location.file.name` is in the depth-1 allowlist.
    3. For each matching macro, collect tokens via `cursor.get_tokens()`. The first token is the macro name; subsequent tokens are the body. Admit only macros whose body is exactly one token of `TokenKind.LITERAL` whose spelling starts with `"`. Strip the surrounding quotes; map name -> stripped body.
    4. First-seen-wins on duplicate macro names (preserves stable behavior under iteration order).
  - **Requires:** the TU was parsed with `PARSE_DETAILED_PROCESSING_RECORD`. This flag is ALREADY set in `extractor_lib.clang_config.PARSE_OPTS` (`clang_config.py:171-174`); no additional config change is needed. The function MUST raise / return-empty / log a clear warning if invoked on a TU lacking the flag (defensive against future regressions in `clang_config.py`).
  - Add a module docstring section describing the function's contract + scope-1 design + the spec / decision references (D4 + spec section 5.2.d).

- [ ] Modify `apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py`:

  - In the `Visitor` base class, add a class-level default: `file_macros: dict[str, str] = {}` (mirrors the existing `current_source_root` default pattern).
  - In `walk_tu_dispatch`, BEFORE the existing `for v in visitors: v.current_source_root = source_root` loop, compute `file_macros = collect_file_macros(tu, target_path_str)` (import from `extractor_lib._source` at function scope to avoid circular-import risk). Then in the same loop, also assign `v.file_macros = file_macros`.
  - The `start_file` lifecycle method is unchanged. Visitors that need `file_macros` access from inside `visit_cursor` / `enter_function` etc. read `self.file_macros` -- which `walk_tu_dispatch` populated before any cursor is dispatched.

- [ ] Modify `apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py`:

  - Delete the `_DEFINE_STRING_RE` module-level constant (lines 28-31; the regex-based same-file `#define` parser).
  - Keep the `_MACRO_IDENT_RE` constant (lines 32; still used at the call site to identify all-caps identifier args).
  - In `start_file`, REMOVE the lines that populate `self._file_macros` (lines 202-207). The handler no longer maintains its own macro map; it inherits `self.file_macros` from `walk_tu_dispatch` (the lifted depth-1 map).
  - In `visit_cursor`, change `self._file_macros.get(raw)` to `self.file_macros.get(raw)` (the rename matches the lifted attribute name).
  - The handler's behavior on existing ezQuake source is preserved: `vid_reload` and other same-file `#define`-resolved command names still resolve (the lift is a superset -- depth-1 includes ezQuake same-file macros plus new cross-header reach).

- [ ] Create `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_collect_file_macros.py` as a pytest-shaped test file mirroring the existing `tests/test_source_concat.py` style. Required test cases:

  1. **`test_resolves_ktx_cross_header_macros`** -- parse `research/repos/ktx/src/commands.c` with `clang_config.clang_args_for(<ktx_src>)` (or the KTX-flavored args once a `clang_args_ktx_for` exists; for Phase 1, use the ezQuake-style args list with KTX-specific defines stubbed out, OR parse with `["-x", "c", f"-I{ktx_src}", "-w"]` minimal args). Assert `collect_file_macros(tu, commands_c_path)` includes:
     - `"LGCMODE_VARIABLE": "k_lgcmode"` (defined in `g_local.h:1228`).
     - `"TOT_MODE_VARIABLE": "k_tot_mode"` (defined in `g_local.h:1236`).
     - At least one same-file macro from `commands.c` (e.g., a `#define CD_*` or similar local string macro -- pick any one that exists at the parsed tag) to confirm same-file population is preserved alongside cross-header.
  2. **`test_excludes_transitive_includes`** -- assert that a macro defined in a depth-2 header (a header included BY a depth-1 header, not directly by the TU) does NOT appear in the result. Implementation: pick any macro reachable transitively in KTX or construct a minimal test fixture if KTX surfaces no clean transitive case.
  3. **`test_excludes_non_string_macros`** -- assert that `MAX_CLIENTS` / `H_ROTTEN` / function-like macros / integer constants are NOT in the result (only string-literal macros are admitted).
  4. **`test_first_seen_wins_on_duplicate`** -- if two depth-1 sites define the same macro name with different string values, the first iteration order is preserved. Use a synthetic test fixture if KTX surfaces no natural duplicate.

  Tests must follow the existing `pytest` convention used by `test_source_concat.py` and friends. If KTX-related fixtures require parsed TUs, document the dev-machine prerequisites at the top of the test file (libclang 18 + KTX repo at `research/repos/ktx/`).

  If a test case requires source-tree state that is not always present (e.g., the KTX research repo is optional), use `pytest.skip(reason)` rather than failing.

- [ ] Run the new test file: `cd apps/qw-oracle/scripts/extractors && python3 -m pytest extractor_lib/tests/test_collect_file_macros.py -v`. All four test cases pass (or skip with documented reason).

- [ ] Re-run an existing ezQuake extraction smoke check to confirm the refactor didn't regress same-file macro resolution. Suggested probe: pick any ezQuake commit where `Cmd_AddCommand(CVAR_RELOAD_GFX_COMMAND, ...)` (vid_sdl2.c:1873; `#define CVAR_RELOAD_GFX_COMMAND "vid_reload"` at vid_sdl2.c:144 per the in-handler comment) is in source, run the ezQuake commands handler for that file, and confirm `vid_reload` appears in the output JSON. If running the full extractor is too heavy for a smoke check, write a one-off Python script (or include it as a 5th test case in `test_collect_file_macros.py`) that parses just `vid_sdl2.c` and asserts the resolved `"vid_reload"` is present in `collect_file_macros` output for that TU.

**Verification:**
- `python3 -m pytest apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_collect_file_macros.py -v` exits 0 with all assertions green (or documented skips).
- `grep -n "_DEFINE_STRING_RE\|_file_macros" apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py` returns zero matches (the local regex map is gone).
- `grep -n "self.file_macros" apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py` returns at least one match (the consume site).
- `grep -n "collect_file_macros\|file_macros" apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` returns at least one definition.
- `grep -n "v.file_macros\|file_macros = collect_file_macros" apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py` returns at least one match (the populate site in walk_tu_dispatch).
- PASS condition: tests pass + greps confirm the wiring.
- FAIL condition: tests fail OR any of the wiring greps return zero.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across 3 production files + 1 new test file; libclang preprocessor-cursor semantics need careful handling; the contract is well-specified above but the implementation requires source-reading + code-writing judgment that warrants subagent isolation. Sonnet medium is the right calibration: clear spec, contained shape, single-language (Python), no architectural decisions outstanding.

### Task 7: Sanity-check parse-time impact (F16)

**Goal:** Confirm the lift's parse-time impact is within F16's projection (<5% expected; >10% would warrant operator decision per F16). Note: `PARSE_DETAILED_PROCESSING_RECORD` is already in `PARSE_OPTS` (clang_config.py:171-174), so the flag itself is not new -- this probe measures the additional walk-time cost from `collect_file_macros` traversing MACRO_DEFINITION cursors per TU.

**Files:** none modified.

**Steps:**

- [ ] From `apps/qw-oracle/`, run a representative ezQuake extraction with `time` measurement BEFORE the lift commit (use `git stash` on the lift changes if Task 6 is already committed locally) and AFTER. Recommended probe: a single-file extraction or a small subset of TUs.
  - Option A (small): pick one ezQuake TU (e.g., `vid_sdl2.c`), parse via the existing handler runner, capture wall-clock parse + walk time.
  - Option B (medium): run `python3 scripts/extractors/ezquake/extract.py --version <recent-tag>` against a few TUs only (`--limit-files` or similar; if the extractor lacks such a flag, run the full extraction and accept ~30s wall-clock).

- [ ] Record both wall-clock numbers in this phase MD's "Open questions" section as evidence. If the post-lift number is >10% slower than pre-lift, halt and surface to operator (F16 says ">10% would warrant operator decision").

- [ ] If the post-lift number is within projection (<10% slower; <5% expected), proceed to Task 8.

**Verification:**
- Pre-lift and post-lift wall-clock numbers captured (recorded in the phase MD or in the operator's session notes).
- Delta within F16 projection.
- PASS condition: post-lift <= pre-lift * 1.10 (10% threshold).
- FAIL condition: post-lift > pre-lift * 1.10 (operator-decision territory).

**Execution mode:** `inline` -- mechanical timing measurement; no logic; the operator (or executor) just runs `time` twice and compares.

### Task 8: Per-migration stub-row probes (per Pass 5.5)

**Goal:** Verify each migration's CHECK widening admits the new value(s). Per Pass 5.5: "insert/delete a stub row of each new value; success confirms widening." These probes also cover the JSONB-binding regression gate (D14) by passing JS-shaped JSON values through psql's parameterized form for the `'match_event'` row.

**Files:** none modified; transient stub rows are inserted then deleted.

**Steps:**

- [ ] Probe 008: insert + delete a stub `log_template_versions` row with `channel='logfile'`. The row must reference an existing `entities.id`; create + delete a stub `entities` row in the same transaction so the FK is satisfied.
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle <<'SQL'
  BEGIN;
  WITH e AS (
    INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, created_at, updated_at)
    VALUES ('ktx', 'log_template', '__phase1_stub_logfile__', '__stub_canon_logfile__', 'stub', 'stub', now(), now())
    RETURNING id
  )
  INSERT INTO log_template_versions (entity_id, version, channel, format_string, format_string_normalized, extracted_at)
  SELECT id, 'stub', 'logfile', 'stub', 'stub', now() FROM e;
  ROLLBACK;
  SQL
  ```
  Expected: BEGIN + INSERT + ROLLBACK with zero CHECK violation errors.

- [ ] Probe 009 (entity type): insert + delete a stub `entities` row with `type='match_event'`.
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle <<'SQL'
  BEGIN;
  INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'match_event', '__phase1_stub_match_event__', '__stub_canon_match_event__', 'stub', 'stub', now(), now());
  ROLLBACK;
  SQL
  ```
  Expected: zero CHECK violation.

- [ ] Probe 009 (table + JSONB): insert + delete a stub `match_event_versions` row with realistic JSONB shapes for `attributes_json` and `emission_call_sites_json`. Confirms the table exists AND the JSONB columns accept structured values (D14 gate).
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle <<'SQL'
  BEGIN;
  WITH e AS (
    INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, created_at, updated_at)
    VALUES ('ktx', 'match_event', '__phase1_stub_mev_v__', '__stub_canon_mev_v__', 'stub', 'stub', now(), now())
    RETURNING id
  )
  INSERT INTO match_event_versions (
    entity_id, version, event_name, complex_type,
    attributes_json, xsd_path, xsd_version,
    emission_call_sites_json, extracted_at
  )
  SELECT
    id, 'stub', 'death', 'deathtype',
    '[{"name":"time","type":"xs:decimal","constraint":null}]'::jsonb,
    'resources/extralog/ktxlog_0.1.xsd', '0.1',
    '[{"file":"combat.c","line":100}]'::jsonb,
    now()
  FROM e;
  -- Sanity: confirm jsonb_typeof returns 'array' (NOT 'string' which would mean the SQLite-era stringify bug).
  SELECT
    jsonb_typeof(attributes_json) AS attrs_type,
    jsonb_typeof(emission_call_sites_json) AS emit_type
  FROM match_event_versions
  WHERE entity_id = (SELECT id FROM entities WHERE name = '__phase1_stub_mev_v__');
  ROLLBACK;
  SQL
  ```
  Expected: the SELECT returns one row with `attrs_type=array`, `emit_type=array`. Then ROLLBACK.

- [ ] Probe 010: insert + delete a stub row of each new gameplay-mechanics kind value, plus the new `'monster'` entity-def kind. Idempotent for re-run.
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle <<'SQL'
  BEGIN;
  -- gameplay_entity_defs.kind = 'monster' (depends on Task 5's gameplay_sources row)
  INSERT INTO gameplay_entity_defs (gameplay_source_id, kind, name, source_ref)
  VALUES ('ktx', 'monster', '__phase1_stub_monster__', 'stub:0');
  -- gameplay_mechanics.kind: one stub row per new kind value
  INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, source_ref) VALUES
    ('ktx', 'game_mode',         '__phase1_stub_game_mode__',         'stub:0'),
    ('ktx', 'election_type',     '__phase1_stub_election_type__',     'stub:0'),
    ('ktx', 'score_system',      '__phase1_stub_score_system__',      'stub:0'),
    ('ktx', 'drop_item',         '__phase1_stub_drop_item__',         'stub:0'),
    ('ktx', 'loc_macro',         '__phase1_stub_loc_macro__',         'stub:0'),
    ('ktx', 'teamplay_message',  '__phase1_stub_teamplay_message__',  'stub:0'),
    ('ktx', 'mode_default',      '__phase1_stub_mode_default__',      'stub:0');
  ROLLBACK;
  SQL
  ```
  Expected: all eight INSERTs succeed; ROLLBACK leaves no residue.

**Verification:**
- All four probes complete with zero CHECK / FK / type errors.
- Probe 009-table's `jsonb_typeof` SELECT returns `array` for both columns (NOT `string`).
- Post-probe row count for `entities` / `log_template_versions` / `match_event_versions` / `gameplay_entity_defs` / `gameplay_mechanics` is unchanged from pre-probe (ROLLBACK semantics).
- PASS condition: probes succeed, jsonb_typeof returns `array`, no residue.
- FAIL condition: any probe errors OR jsonb_typeof returns `string` (the SQLite-era bug per D14) OR residue rows survive.

**Execution mode:** `inline` -- pure SQL probes shipped above; the operator (or executor) copy-pastes; no logic, no reasoning.

### Task 9: Single commit landing all Phase 1 changes

**Goal:** Commit Phase 1 as one coherent unit per D16 (phase atomicity). Per D20: directly to `main`, no PR ceremony.

**Files:** all the above (creates + modifies).

**Steps:**
- [ ] `git add apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql apps/qw-oracle/scripts/extractors/extractor_lib/_source.py apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_collect_file_macros.py apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md`
- [ ] (The dev-DB row inserted by Task 5 lives in the dev DB; the prod dump-restore mechanism per the prod-update-lifecycle spec carries it forward when the time comes. No file change to commit for that.)
- [ ] `git commit` with message:
  ```
  arc(ktx): Phase 1 -- foundation (Pattern 6 lift + migrations 008/009/010 + ktx gameplay_sources)
  
  Schema and shared-infrastructure foundation for KTX onboarding.
  
  Migrations:
  - 008 widens log_template_versions.channel CHECK to admit 'logfile'
    (KTX log_printf API; ~28 call sites at canonical 1.46).
  - 009 widens entities.type CHECK to admit 'match_event' and creates
    match_event_versions (PK + 2 indexes) per Pass 4.5 column shape.
    Pre-stages 7 entity rows per KTX tag.
  - 010 widens gameplay_entity_defs.kind (+'monster') and gameplay_mechanics.kind
    (+game_mode/election_type/score_system/drop_item/loc_macro/teamplay_message/
    mode_default). Pre-stages ~420 qw-namespace rows per KTX tag for Phases 3-5.
  
  Pattern 6 lift (D4):
  - extractor_lib._source.collect_file_macros(tu, target_file_path) walks
    the depth-1 #include closure via libclang MACRO_DEFINITION cursors.
    Already-enabled PARSE_DETAILED_PROCESSING_RECORD flag in
    clang_config.PARSE_OPTS makes the cursors visible.
  - extractor_lib._visitor.walk_tu_dispatch populates v.file_macros for
    every visitor before dispatching cursors; consumers read self.file_macros.
  - ezquake/_handler_commands.py refactored to consume self.file_macros
    instead of populating its own regex-based same-file map. Same-file
    behavior preserved (vid_reload etc still resolve); cross-header reach
    is the new capability KTX Phase 3 (_handler_modes.py) consumes.
  - Test at extractor_lib/tests/test_collect_file_macros.py asserts KTX
    LGCMODE_VARIABLE / TOT_MODE_VARIABLE resolve via depth-1 from
    commands.c into g_local.h.
  
  Data:
  - Dev DB seeded with one gameplay_sources row for 'ktx'. Phase 2-6
    loaders FK-reference this row. Idempotent ON CONFLICT DO UPDATE.
    Carried to prod via the dump-restore mechanism (sibling spec
    docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md).
  
  Resolves: F4 (008 logfile widening), F15 (cross-header lift before
  Phase 3 runs), F16 (parse-time impact within projection).
  Pre-stages: F5/F6/F7/F8/F9/F10/F11/F12/F13/F14 row capacity; the
  handler phases (3-6) populate the rows.
  ```
- [ ] Push to origin per the project's git workflow.

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status` is clean (working tree matches HEAD).
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes after the commit OR git push fails.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at the end of Phase 1. All probes return YES/NO answers:

**1. Three migration files present.**

```bash
ls apps/qw-oracle/db/migrations/008_ktx_log_template_logfile_channel.sql \
   apps/qw-oracle/db/migrations/009_ktx_match_event_type.sql \
   apps/qw-oracle/db/migrations/010_ktx_gameplay_kinds.sql 2>&1
```
- PASS condition: three files listed; no `No such file or directory` lines.
- FAIL condition: any file missing.

**2. Migrations applied to dev DB.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c \
  "SELECT count(*) FROM schema_migrations
   WHERE filename IN ('008_ktx_log_template_logfile_channel.sql',
                      '009_ktx_match_event_type.sql',
                      '010_ktx_gameplay_kinds.sql')"
```
- PASS condition: returns `3`.
- FAIL condition: returns anything other than `3`.

**3. `match_event_versions` table exists with the expected columns.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "\d match_event_versions"
```
- PASS condition: `\d` output lists columns `entity_id`, `version`, `event_name`, `complex_type`, `attributes_json`, `xsd_path`, `xsd_version`, `emission_call_sites_json`, `raw_ast_hash`, `source_root`, `extracted_at` AND PRIMARY KEY on `(entity_id, version)` AND two indexes (`idx_match_event_versions_complex_type`, `idx_match_event_versions_xsd_version`).
- FAIL condition: missing column / missing PK / missing index.

**4. CHECK constraints widened correctly.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conname IN (
    'log_template_versions_channel_check',
    'entities_type_check',
    'gameplay_entity_defs_kind_check',
    'gameplay_mechanics_kind_check'
  )
  ORDER BY conname"
```
- PASS condition: four rows; `log_template_versions_channel_check` includes `'logfile'`; `entities_type_check` includes `'match_event'`; `gameplay_entity_defs_kind_check` includes `'monster'`; `gameplay_mechanics_kind_check` includes all seven of `'game_mode'`, `'election_type'`, `'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'`, `'mode_default'`.
- FAIL condition: any value missing OR fewer than four rows.

**5. `gameplay_sources` row for 'ktx' exists.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c \
  "SELECT id, display_name, source_root FROM gameplay_sources WHERE id = 'ktx'"
```
- PASS condition: one row with `id='ktx'`.
- FAIL condition: zero rows OR more than one row.

**6. Pattern 6 lift: live KTX cross-header macros resolve.**

```bash
cd apps/qw-oracle/scripts/extractors && \
  python3 -m pytest extractor_lib/tests/test_collect_file_macros.py -v
```
- PASS condition: pytest exits 0 with all four test cases passing (or skipping with documented reason).
- FAIL condition: any test fails (skips with no documented reason are also a fail).

**7. Pattern 6 lift: ezQuake handler refactor preserves same-file resolution.**

```bash
grep -n "_DEFINE_STRING_RE\|self._file_macros" \
  apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py
```
- PASS condition: zero matches (the local regex map is fully removed; the handler reads `self.file_macros` from `walk_tu_dispatch`).
- FAIL condition: any match (means the refactor left dead code behind).

**8. Pattern 6 lift: visitor populates `file_macros` per TU.**

```bash
grep -n "v.file_macros\|collect_file_macros" \
  apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py \
  apps/qw-oracle/scripts/extractors/extractor_lib/_source.py
```
- PASS condition: at least one match in `_visitor.py` (the assignment site in `walk_tu_dispatch`) AND at least one match in `_source.py` (the function definition).
- FAIL condition: either site missing.

**9. Phase 1 commit landed cleanly.**

```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 1 (matches the message in Task 9); `git status --short` is empty.
- FAIL condition: latest commit is something else OR working tree has uncommitted residuals.

**10. No regression in unrelated extractors.**

Optional spot-check: re-run a small ezQuake extraction (one TU) and confirm output JSON matches a snapshot from before Phase 1. The lift's behavior on existing handlers should be identity (same-file macros still resolve; cross-header is additive). If the operator does not have a snapshot, this probe is informational only.

```bash
# Suggested probe (skip if no snapshot baseline):
cd apps/qw-oracle && \
  python3 scripts/extractors/ezquake/extract.py --version <recent-tag> --limit-files 1 --output /tmp/phase1_post.json
diff <(jq -S . /tmp/phase1_pre.json) <(jq -S . /tmp/phase1_post.json) | head -30
```
- PASS condition: zero diff (or only timestamp / metadata differences).
- FAIL condition: any structural / row-count / row-content diff -- means the refactor regressed.

If all required probes (1-9) pass, Phase 1 is done; proceed to Phase 2. If any probe fails, see `## Recovery` below.

## Outputs to next phase

After Phase 1 ships, the following hold for Phase 2 (and Phases 3-6 in parallel):

- Dev DB schema admits all KTX content. Phase 2 can write KTX cvar / command / info_key / log_template rows; Phase 3 can write `kind='game_mode'` / `kind='mode_default'` rows; Phase 4 can write `kind='election_type'` / `kind='death_rule'` rows; Phase 5 can write `kind='monster'` / `kind='score_system'` / `kind='drop_item'` / `kind='loc_macro'` / `kind='teamplay_message'` rows; Phase 6 can write `type='match_event'` entity rows + `match_event_versions` rows.
- Migrations 008 / 009 / 010 are recorded in `schema_migrations`. The dev DB is the canonical source; prod DB inherits via the `pg_dump --clean --if-exists` -> `psql -1` path documented in the prod-update-lifecycle spec.
- `gameplay_sources` row for `'ktx'` exists in the dev DB. Phase 2-6 loaders treat it as a precondition (no need to insert; just FK-reference).
- `extractor_lib._source.collect_file_macros(tu, target_file_path)` available. Phase 3's `_handler_modes.py` calls it (or, more precisely, reads `self.file_macros` populated by `walk_tu_dispatch`) to resolve `LGCMODE_VARIABLE` and `TOT_MODE_VARIABLE` from `commands.c` initstring extraction. The lift is engine-agnostic; FTE / MVDSV / QWCL handlers can also adopt it if a future port surfaces cross-header pressure.
- ezQuake's `_handler_commands.py` no longer maintains its own `_file_macros` regex map. The handler's behavior on existing source is preserved (verified by Probe 7 + the optional regression probe). Future fork (unezQuake) inherits the lifted shape.
- `PARSE_DETAILED_PROCESSING_RECORD` remains the default in `clang_config.PARSE_OPTS` (it was already there pre-Phase-1; no change). The lift assumes this flag and the executor's `collect_file_macros` is defensive against future regressions.

## Open questions / deferred items

- **Question:** D4 / F16 frame the lift as "adds the PARSE_DETAILED_PROCESSING_RECORD flag," but verification during Phase 1 drafting confirmed the flag is ALREADY in `extractor_lib.clang_config.PARSE_OPTS` (line 172) and has been there since the pipeline's initial libclang setup. The lift does NOT change `PARSE_OPTS`; it consumes the existing flag.
  **Default chosen for now:** Phase 1 ships the lift WITHOUT modifying `PARSE_OPTS` (correctly leveraging the pre-existing flag). Task 7's parse-time probe still runs to measure the additional `collect_file_macros` walk-time cost (which is the only new cost class -- the flag overhead was already paid). The F16 projection (<5% expected; >10% surfaces operator decision) still applies to that walk-time delta.
  **Who can resolve:** operator -- if a clarifying amendment to D4 / F16 is desired (e.g., reframing as "leverages the existing flag" rather than "adds the flag"), append a 2026-05-05 amendment block to D4 and F16.

- **Question:** The 4th `test_collect_file_macros.py` test case (`test_first_seen_wins_on_duplicate`) requires a duplicate-macro fixture. Does KTX or ezQuake naturally surface a depth-1 duplicate, or should the test construct a synthetic .c file?
  **Default chosen for now:** the executor uses a synthetic minimal fixture written into `apps/qw-oracle/scripts/extractors/extractor_lib/tests/fixtures/duplicate_macros/` if no natural duplicate exists in real source. The fixture lives outside the test file for clarity. Pytest fixture pattern matches the existing `test_source_concat.py` style.
  **Who can resolve:** Phase 1 executor -- if a natural source-tree duplicate is found during implementation, prefer that over the synthetic fixture. The contract is "first-seen-wins"; either approach exercises it.

- **Question:** The ezQuake refactor in Task 6 deletes `_DEFINE_STRING_RE` from `_handler_commands.py`. Is there any other handler that imports this constant, or any test that asserts its content?
  **Default chosen for now:** assume no other consumer (Phase 1 drafter spot-checked: `_DEFINE_STRING_RE` is module-private to `_handler_commands.py`; no `from ... import _DEFINE_STRING_RE` anywhere in the tree). The executor verifies during implementation: `grep -rn "_DEFINE_STRING_RE" apps/qw-oracle/scripts/extractors/` should return zero hits OUTSIDE `_handler_commands.py`. If a consumer surfaces, lift the regex to `extractor_lib._source` as a private helper instead of deleting it.
  **Who can resolve:** Phase 1 executor.

- **Question:** Phase 1's verification probes use `BEGIN; ... ROLLBACK;` to insert + immediately discard stub rows. Some Postgres setups disallow certain DDL inside transactions OR wrap CHECK violations such that ROLLBACK fires before the user sees the error message. Does the dev container's `psql` session allow transactional INSERT-then-ROLLBACK on the relevant tables?
  **Default chosen for now:** assume yes (the tables in question have no triggers, no DEFERRABLE constraints, no extension-specific quirks per Arc 1's Phase 7 deploy verification). The probes are written for transactional safety; if any probe surfaces a transactional issue, the operator can switch the probe to non-transactional INSERT followed by explicit DELETE.
  **Who can resolve:** Phase 1 executor.

## Recovery (if verification fails)

- **Probe 1 fails (migration file missing):** the inline content for Tasks 1, 2, 3 is the source of truth; re-write the missing file from that block.
- **Probe 2 fails (migration not applied):** check `bun db/migrate.ts` output for errors. The most likely cause is a SHA-mismatch on a previously-applied migration (the migrator rejects edits to applied files). If the failure is on 008-010, the executor wrote inconsistent content vs the inline blocks; rewrite from the canonical inline content and re-run.
- **Probe 3 fails (table or column shape mismatch):** confirm the 009 file content matches the inline block in Task 2 byte-for-byte; if mismatch, rewrite + re-apply migration. If 009 already applied with wrong shape, the recovery path is to write a new corrective migration (011) -- do NOT edit 009 in place (the migrator's SHA-check will reject it; also operator memory `feedback_idempotency_before_staleness.md` discipline).
- **Probe 4 fails (CHECK widening missing a value):** same as Probe 3 -- verify the migration content against the inline block; correct via a follow-up migration if already applied with wrong shape.
- **Probe 5 fails (gameplay_sources row missing):** re-run Task 5's INSERT (idempotent via `ON CONFLICT DO UPDATE`).
- **Probe 6 fails (pytest test fails):** read the test failure output. Most likely causes:
  - libclang cannot parse `commands.c` -- check `clang_args_for(...)` are appropriate for KTX (the test should use minimal `["-x", "c", "-I", <ktx_src>, "-w"]` args; KTX has its own define surface but the macros we're testing don't depend on conditional defines).
  - `PARSE_DETAILED_PROCESSING_RECORD` not enabled on the test's TU -- import `PARSE_OPTS` from `extractor_lib.clang_config` and pass `options=PARSE_OPTS` to `Index.parse(...)`.
  - `collect_file_macros` returns empty -- the depth-1 file-set computation is wrong; trace `INCLUSION_DIRECTIVE` cursors for the target file and confirm `g_local.h` is in the set.
- **Probe 7 fails (`_DEFINE_STRING_RE` still present):** the executor's refactor of `_handler_commands.py` is incomplete. Re-read Task 6's modify-instructions and remove the residual constant + populate-call.
- **Probe 8 fails (`v.file_macros` assignment missing in walk_tu_dispatch):** the executor skipped the `_visitor.py` modification. Re-read Task 6's bullet 2 and apply.
- **Probe 9 fails (commit missing or working tree dirty):** `git status` to triage; the most likely cause is files were staged but `git commit` failed on a hook. Inspect hook output, fix the underlying issue, re-stage, re-commit.
- **Probe 10 fails (regression in unrelated extractor):** the lift broke something in ezQuake. Likely cause: the refactored `_handler_commands.py::visit_cursor` has a typo in `self.file_macros` access OR `walk_tu_dispatch` populates the wrong file's macros. Read the handler's code carefully + re-run the test suite.

If any failure resists local recovery, halt and surface to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F4** (KTX log_template printf-shape counts; per-channel API). Resolved partially: Task 1's migration 008 admits the new `'logfile'` channel value the printf-handler will emit in Phase 2. Phase 2 (handler implementation) reproduces the per-channel call-site counts (655 + 1068 + 43 + 28).
- **F15** (Cross-header macros LGCMODE_VARIABLE / TOT_MODE_VARIABLE). Resolved by Task 6's Pattern 6 lift; verified by `test_collect_file_macros.py::test_resolves_ktx_cross_header_macros` and at the phase boundary by Probe 6.
- **F16** (Pattern 6 lift parse-time impact). Resolved by Task 7's measurement probe; the F16 projection (<5% expected) holds because `PARSE_DETAILED_PROCESSING_RECORD` was already enabled (no flag-overhead delta) -- the only new cost is the additional MACRO_DEFINITION cursor walk, expected to be negligible.

No findings touched by Phase 1 are deferred. F4 / F15 / F16 all ship in this phase. Phase 2 reproduces F4's per-channel call-site count anchors against live source.

---

*Phase 1 closes the foundation. Phase 2 (Pass 1 first-class entity handlers + 4 loader wirings + KTX dispatch wiring) is the next phase; Phases 3 / 4 / 5 / 6 are mutually independent at the data level after Phase 1 lands.*
