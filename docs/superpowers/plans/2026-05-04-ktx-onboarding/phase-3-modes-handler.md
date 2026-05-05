# Phase 3 -- Modes handler (game_mode catalog + mode_default overlays)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase (Pass 4.2 + Pass 5.1 + Pass 5.1 amendment + Pass 5.2 + Pass 5.4.1 + Pass 5.4.2).
> 4. Source-walk the relevant KTX files at `research/repos/ktx/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as a template. For the handler, MVDSV's `_handler_log_templates.py` and `_handler_qc_builtins.py` are the closest cross-codebase ports (port, do not subclass per D3). For the loader, `load-gameplay.ts` is the closest analog (gameplay_mechanics UPSERT shape).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section in `phase-template.md`) before declaring the phase MD ready for operator review.

## Goal

Phase 3 lands KTX's mode taxonomy as queryable Layer 1 rows. Two deliverables: (1) `_handler_modes.py` -- a libclang-driven handler under `apps/qw-oracle/scripts/extractors/ktx/` that walks the 17 `<mode>_um_init[]` literal `const char[]` declarations + `common_um_init[]` baseline + the race + bloodfest + 8 mutator activation sites and emits one `ktx-modes-ast.json` containing two arrays: 27 game_mode catalog rows + ~309 mode_default per-line overlay rows; (2) `load-modes.ts` -- a postgres-js TS loader that reads the AST JSON and idempotently UPSERTs both arrays into `gameplay_mechanics` keyed on `(gameplay_source_id='ktx', kind, name, ruleset_gate_json)` per D14's JSONB binding rule. The handler depends on Phase 1's Pattern 6 cross-header lift (the depth-1 `#include` walk) so `LGCMODE_VARIABLE` and `TOT_MODE_VARIABLE` resolve from `g_local.h` into `common_um_init`. Runnable state at boundary: `gameplay_mechanics` holds 27 `kind='game_mode'` catalog rows + ~309 `kind='mode_default'` overlay rows (all `gameplay_source_id='ktx'`); mode-aware queries like "show every cvar that gets set when entering ca, in apply order" return real structured data; `_stats` block on the AST output documents resolution counts and any unresolved macro lines.

## Inputs from previous phase

Phase 2 complete:
- KTX driver at `apps/qw-oracle/scripts/extractors/ktx/extract.py` exists with the Pass 1 handlers (cvars / commands / info_keys / log_templates) registered in `ALL_HANDLERS`. Phase 3 adds the `MODES` handler entry to that dict.
- `apps/qw-oracle/scripts/extractors/ktx/output/` directory exists; the four Pass-1 AST JSONs sit there; Phase 3 writes a fifth (`ktx-modes-ast.json`) into the same dir.
- `extract-tag.ts` has KTX dispatch wiring; `PROJECT_EXTRACTOR.ktx` resolves to the KTX driver path; `ENTITY_JSON_FILES.ktx` carries the four Pass-1 entries. Phase 3 does NOT add `game_mode`/`mode_default` to that map -- those rows are NOT EntityType-shaped (they target `gameplay_mechanics`, not the entities/per-version surface). The integration point is a separate `load-ktx-modes` subcommand on `apps/qw-oracle/scripts/load-knowledge/index.ts`, mirroring the existing `load-gameplay` subcommand.

Phase 1 complete:
- Pattern 6 lift at `extractor_lib._source.collect_file_macros(tu, target_file_path)` walks the depth-1 `#include` closure and returns `dict[str, str]` of string-literal macros (D4). `walk_tu_dispatch` populates `v.file_macros` for every visitor before dispatch; `_handler_modes.py` reads `self.file_macros` to resolve `LGCMODE_VARIABLE` -> `"k_lgcmode"` and `TOT_MODE_VARIABLE` -> `"k_tot_mode"` when parsing `common_um_init[]`.
- Migration 008 (or its renumbered equivalent if Phase 1 renumbers; see Open questions) widens `gameplay_mechanics.kind` to admit `'game_mode'` and `'mode_default'` (these are two of the seven kind values landed by the gameplay-kinds widening migration -- D5 / Phase 1 Task 3).
- `gameplay_sources` row for `'ktx'` exists in dev DB (`gameplay_source_id='ktx'`, seeded by Phase 1 Task 5). `load-modes.ts` FK-references this row but does not insert it -- treats it as precondition.

Plus the prerequisites inherited from Arc 1 (`prerequisites.md`):
- Postgres dev container running and reachable; `bun --version` >= 1.3 in `apps/qw-oracle/`.
- KTX research repo cloned at `research/repos/ktx/`. The handler reads `research/repos/ktx/src/commands.c`, `research/repos/ktx/src/world.c`, `research/repos/ktx/src/race.c` -- these are part of the KTX source tree and present at any commit.
- libclang 18 + python3-clang available (verified by any prior extractor run).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py
apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml
apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py
apps/qw-oracle/scripts/load-knowledge/load-modes.ts
```

### Modified

```
apps/qw-oracle/scripts/extractors/ktx/extract.py                # register MODES handler in ALL_HANDLERS
apps/qw-oracle/scripts/load-knowledge/index.ts                  # add `load-ktx-modes` subcommand + runLoadKtxModes wrapper
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts            # call load-ktx-modes after the entity loaders for project=ktx (one new step in the per-tag pipeline)
```

### Deleted

n/a

## Tasks

### Task 1: Author `apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py`

**Goal:** Ship the libclang-driven KTX modes handler that emits the `ktx-modes-ast.json` payload (27 catalog rows + ~309 mode_default overlay rows, plus a `_stats` block). Inherits from `Visitor` only (D3); consumes Phase 1's lifted `self.file_macros` for cross-header macro resolution. Walks three KTX source files (`commands.c`, `world.c`, `race.c`) and one helper (`progs.h`-via-include for UM_* enum spellings if needed; no enum dependency at first cut). The handler is the canonical Pattern 15 STRING_LITERAL-array walker -- captured below in shape so end-of-arc Phase 8 can lift the rationale into EXTRACTOR-PLAYBOOK.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py` with module-level structure mirroring MVDSV's `_handler_log_templates.py` shape (project-private handler, imports `extractor_lib._visitor.Visitor` and `extractor_lib._source.read_extent` only, no parent-project subclass per D3).

  Module docstring opens with: handler purpose (KTX game_mode catalog + mode_default overlays), pattern-class summary (Pattern 15 STRING_LITERAL-array walker, Pattern 6 + cross-header lift consumed via `self.file_macros`), output filename (`ktx-modes-ast.json`), source-file scope (`commands.c`, `world.c`, `race.c`).

- [ ] Add module-level constants:

  ```python
  HANDLER_NAME = "modes"
  OUTPUT_FILENAME = "ktx-modes-ast.json"

  # Source-file allowlist. Anything NOT in this set is ignored at start_file
  # (returns immediately). Keeps the handler bounded; mirrors MVDSV's
  # protocol-handler shape (one source-set, no whole-tree walk).
  RELEVANT_FILES: frozenset[str] = frozenset({
      "commands.c",   # um_list[] + 17 _um_init[] + common_um_init[] + mutator/race auto-reset sites
      "world.c",      # mutator + race + bloodfest activation cvar registration sites
      "race.c",       # ToggleRace + apply_race_settings + race_settings[]
  })

  # The 17 user-facing user-mode tokens (col 1 of um_list[]). Source-fidelity
  # spelling per D9. Keys match the literal C strings; values map to the
  # source enum spelling for value_text.
  UM_LIST_ENUMS: dict[str, str] = {
      "1on1":      "um1ON1",
      "2on2":      "um2ON2",
      "3on3":      "um3ON3",
      "4on4":      "um4ON4",
      "10on10":    "um10ON10",
      "ffa":       "umFFA",
      "ctf":       "umCTF",
      "hoonymode": "umHOONYMODE",
      "blitz2v2":  "umBLITZ2v2",
      "blitz4v4":  "umBLITZ4v4",
      "2on2on2":   "um2ON2ON2",
      "3on3on3":   "um3ON3ON3",
      "4on4on4":   "um4ON4ON4",
      "XonX":      "umXONX",
      "wipeout":   "umWIPEOUT",
      "ca":        "umCA",
      "tot":       "umTOT",
  }

  # Source-fidelity team_structure (col 4) per Pass 4.2 source-walk.
  # Multiple user-facing modes can share a team_structure (3 modes share
  # UM_4ON4: 4on4 + wipeout + ca; 3 share UM_1ON1HM: hoonymode + blitz2v2 + blitz4v4;
  # 2 share UM_FFA: ffa + tot).
  UM_LIST_TEAM_STRUCTURES: dict[str, str] = {
      "1on1":      "UM_1ON1",
      "2on2":      "UM_2ON2",
      "3on3":      "UM_3ON3",
      "4on4":      "UM_4ON4",
      "10on10":    "UM_10ON10",
      "ffa":       "UM_FFA",
      "ctf":       "UM_CTF",
      "hoonymode": "UM_1ON1HM",
      "blitz2v2":  "UM_1ON1HM",
      "blitz4v4":  "UM_1ON1HM",
      "2on2on2":   "UM_2ON2ON2",
      "3on3on3":   "UM_3ON3ON3",
      "4on4on4":   "UM_4ON4ON4",
      "XonX":      "UM_XONX",
      "wipeout":   "UM_4ON4",
      "ca":        "UM_4ON4",
      "tot":       "UM_FFA",
  }

  # Per-mode game_type bucket per Pass 4.3 + 5.1's extension.
  # Final bucket set: Duel | Team | FFA | CTF | Race | Survival | Mutator | Unknown.
  UM_LIST_GAME_TYPES: dict[str, str] = {
      "1on1":      "Duel",
      "2on2":      "Team",
      "3on3":      "Team",
      "4on4":      "Team",
      "10on10":    "Team",
      "ffa":       "FFA",
      "ctf":       "CTF",
      "hoonymode": "Duel",
      "blitz2v2":  "Team",
      "blitz4v4":  "Team",
      "2on2on2":   "Team",
      "3on3on3":   "Team",
      "4on4on4":   "Team",
      "XonX":      "Team",
      "wipeout":   "Team",
      "ca":        "Team",
      "tot":       "FFA",
  }

  # Display labels. The col-2 strings in um_list[] contain \223 / \224 / \225 / \226
  # conchar codes for digit glyphs (e.g. "\223 on \223" for "1 on 1"). Layer 1
  # captures the human-readable label here; the raw col-2 string is captured
  # separately in props_json.um_list_label_raw for traceability.
  UM_LIST_USER_FACING_LABELS: dict[str, str] = {
      "1on1":      "1 on 1",
      "2on2":      "2 on 2",
      "3on3":      "3 on 3",
      "4on4":      "4 on 4",
      "10on10":    "10 on 10",
      "ffa":       "FFA",
      "ctf":       "CTF",
      "hoonymode": "HoonyMode",
      "blitz2v2":  "Blitz (2v2)",
      "blitz4v4":  "Blitz (4v4)",
      "2on2on2":   "2 on 2 on 2",
      "3on3on3":   "3 on 3 on 3",
      "4on4on4":   "4 on 4 on 4",
      "XonX":      "X on X",
      "wipeout":   "Wipeout",
      "ca":        "Clan Arena",
      "tot":       "Tribe of Tjernobyl",
  }

  # The 17 const char[] initstring array names corresponding to um_list[] col 3.
  UM_INIT_ARRAY_NAMES: dict[str, str] = {
      "1on1":      "_1on1_um_init",
      "2on2":      "_2on2_um_init",
      "3on3":      "_3on3_um_init",
      "4on4":      "_4on4_um_init",
      "10on10":    "_10on10_um_init",
      "ffa":       "ffa_um_init",
      "ctf":       "ctf_um_init",
      "hoonymode": "_1on1hm_um_init",
      "blitz2v2":  "_2on2hm_um_init",
      "blitz4v4":  "_4on4hm_um_init",
      "2on2on2":   "_2on2on2_um_init",
      "3on3on3":   "_3on3on3_um_init",
      "4on4on4":   "_4on4on4_um_init",
      "XonX":      "_XonX_um_init",
      "wipeout":   "wipeout_um_init",
      "ca":        "carena_um_init",
      "tot":       "tot_um_init",
  }

  # Per-mode race_plrs_per_team values (col 5 of um_list[]).
  UM_LIST_RACE_PLRS: dict[str, int] = {
      "1on1":      1,
      "2on2":      2,
      "3on3":      3,
      "4on4":      4,
      "10on10":   10,
      "ffa":      -1,
      "ctf":       0,
      "hoonymode": 0,
      "blitz2v2":  0,
      "blitz4v4":  0,
      "2on2on2":   0,
      "3on3on3":   0,
      "4on4on4":   0,
      "XonX":      0,
      "wipeout":   0,
      "ca":        0,
      "tot":       0,
  }

  # The 8 KTX mutators per F5 / Pass 5.1 amendment + Pass 5.4.1.
  # name -> activation_cvar (the cvar that enables the mutator).
  # Source: world.c registration sites (see source_xrefs in handler output).
  MUTATORS: dict[str, str] = {
      "lgc":        "k_lgcmode",      # world.c:1083  RegisterCvar
      "instagib":   "k_instagib",     # world.c:975   RegisterCvarEx
      "midair":     "k_midair",       # world.c:966   RegisterCvar
      "berzerk":    "k_bzk",          # world.c:930   RegisterCvar (k_bzk is the *enable*; k_berzerk is runtime state)
      "yawnmode":   "k_yawnmode",     # world.c:1011  RegisterCvar
      "killquad":   "k_killquad",     # world.c:969   RegisterCvarEx
      "freshteams": "k_freshteams",   # world.c:894   RegisterCvarEx (sub-flags captured via sub_flags_json)
      "nosweep":    "k_nosweep",      # world.c:909   RegisterCvarEx
  }

  # Mutator auto_reset_on_match per Pass 5.4.1 grid:
  # LGC, instagib, midair  -> auto-reset (cvar_set("X","0") at match-end sites)
  # berzerk, yawnmode, killquad, freshteams, nosweep -> persist
  MUTATOR_AUTO_RESET: dict[str, bool] = {
      "lgc":        True,
      "instagib":   True,
      "midair":     True,
      "berzerk":    False,
      "yawnmode":   False,
      "killquad":   False,
      "freshteams": False,
      "nosweep":    False,
  }
  ```

- [ ] Implement the `KtxModesHandler(Visitor)` class. Required attributes / methods:

  - Class attributes: `name = HANDLER_NAME`, `output_filename = OUTPUT_FILENAME`. `file_macros: dict[str, str] = {}` is inherited from the `Visitor` base class (Phase 1 Task 6 added it); `walk_tu_dispatch` populates it pre-dispatch.

  - `setup(repo_root: Path, src_root: Path)`: store both paths. Initialize empty cross-file accumulators:
    - `self._catalog_um_rows: list[dict] = []` -- 17 um_list-derived catalog rows
    - `self._catalog_extra_rows: list[dict] = []` -- 10 race/bloodfest/mutator catalog rows
    - `self._mode_default_rows: list[dict] = []` -- common_um_init + 17 per-mode overlays
    - `self._activation_cvar_refs: dict[str, str] = {}` -- mutator/race/bloodfest cvar -> "world.c:<line>" or "race.c:<line>", populated when world.c/race.c are walked
    - `self._toggle_cmd_refs: dict[str, str] = {}` -- e.g., "race" -> "commands.c:695", "lgc" -> "commands.c:7870", "berzerk" -> "commands.c:3240", populated when commands.c is walked
    - `self._auto_reset_call_sites: dict[str, list[str]] = {}` -- per-mutator list of "commands.c:<line-range>" entries for the cvar_set("X","0") auto-reset blocks
    - `self._stats: dict = {"unresolved_macro_lines": [], "skipped_lines": [], "by_array": {}}` -- emitted in finalize for audit

  - `start_file(source_path: Path, source_bytes: bytes)`: store `self._source_bytes = source_bytes`, `self._source_path = source_path`, `self._source_basename = source_path.name`. Return early (no walk) if `source_path.name not in RELEVANT_FILES`. The variant axis is `"server"` for all KTX work (KTX is server-side-only); the handler treats all variants identically (no variant-specific branches).

  - `visit_cursor(cursor, variant)`: dispatch per source basename:
    - `commands.c` -> `_visit_commands_c(cursor)` -- captures the 17 `<mode>_um_init[]` declarations + `common_um_init[]` declaration + the `um_list[]` array + the mutator toggle commands + the auto-reset call sites.
    - `world.c` -> `_visit_world_c(cursor)` -- captures `RegisterCvar(LIT)` / `RegisterCvarEx(LIT, ...)` calls whose first arg is one of the activation cvars (`k_lgcmode`, `k_instagib`, `k_midair`, `k_bzk`, `k_yawnmode`, `k_killquad`, `k_freshteams`, `k_nosweep`, `k_race`, `k_bloodfest`); records the source_ref into `self._activation_cvar_refs`.
    - `race.c` -> `_visit_race_c(cursor)` -- captures `ToggleRace` function declaration site (`race.c:242` at canonical 1.46), `apply_race_settings` site (`race.c:323`), `race_settings[]` declaration site (`race.c:293`).

  - `_visit_commands_c(cursor)`:
    - Match `cursor.kind == CursorKind.VAR_DECL` AND `cursor.spelling in (set of UM_INIT_ARRAY_NAMES.values()) | {"common_um_init"}`. For each match, call `_extract_um_init_array(cursor, array_name)`.
    - Match `cursor.kind == CursorKind.VAR_DECL` AND `cursor.spelling == "um_list"`. Capture file:line of each entry -- needed for source_xrefs on the 17 catalog rows. Iterate `cursor.get_children()`'s INIT_LIST_EXPR children; for each row's first STRING_LITERAL child, take the literal value (e.g. `"1on1"`) -- this is the canonical token; pair with source line of the row's open `{`. Store in `self._um_list_row_refs: dict[str, str]` (token -> "commands.c:<line>"). Also harvest `um_list[]`'s second-column raw string per row into `self._um_list_label_raw: dict[str, str]` for `props_json.um_list_label_raw`.
    - Match `cursor.kind == CursorKind.VAR_DECL` AND `cursor.spelling == "cmds"`. Inside the INIT_LIST_EXPR, for each row matching `{ "<token>", <ToggleX>, ... }` where `<token>` is `"race"` or any of the mutator toggle command names (which Pass 1.5's commands handler enumerates), capture the row's source line. Per-row scan: pull the literal in field 0 (command name); if it matches one of `{"race", "lgc", "tot", "berzerk", "midair", "instagib", "yawnmode", "killquad", "freshteams", "nosweep"}` (the mutator and race toggle commands), record `commands.c:<row-line>` into `self._toggle_cmd_refs`. The toggle command names beyond `race` are confirmed via the call-site scan below; this scan is the upper bound.
    - Match `cursor.kind == CursorKind.CALL_EXPR` AND `cursor.spelling == "cvar_toggle_msg"`. Inspect arg[1] (the cvar-name arg). If it's a STRING_LITERAL, take the literal; if it's a DECL_REF_EXPR pointing at one of the cross-header macros (`LGCMODE_VARIABLE` / `TOT_MODE_VARIABLE`), look up `self.file_macros[ident]` to resolve to the cvar name. Use the resolved cvar name to map back to the mutator key: e.g. `k_bzk` -> `berzerk`, `k_lgcmode` -> `lgc`, `k_tot_mode` -> `tot`. Record the call-expr source_ref into `self._toggle_cmd_refs[<mutator>]` (overwrites the cmds-array fallback above with the more authoritative call-site).
    - Match `cursor.kind == CursorKind.CALL_EXPR` AND `cursor.spelling == "cvar_set"` AND arg[1] is the literal `"0"` AND arg[0] is `LGCMODE_VARIABLE` or `TOT_MODE_VARIABLE` (resolves via `self.file_macros`) or any of the auto-reset mutator cvars. Record `commands.c:<call-site-line-range>` into `self._auto_reset_call_sites[<mutator>]`. Per Pass 5.4.1, expected sites for LGC: `commands.c:7538-7540` + `commands.c:7754-7756`. Capture every match as a list entry; emit ranges in finalize.

  - `_visit_world_c(cursor)`:
    - Match `cursor.kind == CursorKind.CALL_EXPR` AND `cursor.spelling in {"RegisterCvar", "RegisterCvarEx"}`. Inspect arg[0]; if it's a STRING_LITERAL whose value is one of the 10 activation cvars (`k_lgcmode`, `k_instagib`, `k_midair`, `k_bzk`, `k_yawnmode`, `k_killquad`, `k_freshteams`, `k_nosweep`, `k_race`, `k_bloodfest`), record `world.c:<line>` into `self._activation_cvar_refs[<cvar>]`. Use `_literal_string` from `extractor_lib._source` to extract the literal.

  - `_visit_race_c(cursor)`:
    - Match `cursor.kind == CursorKind.FUNCTION_DECL` AND `cursor.spelling == "ToggleRace"`. Record `race.c:<line>` into `self._race_toggle_ref`.
    - Match `cursor.kind == CursorKind.FUNCTION_DECL` AND `cursor.spelling == "apply_race_settings"`. Record `race.c:<line>` into `self._race_apply_ref`.
    - Match `cursor.kind == CursorKind.VAR_DECL` AND `cursor.spelling == "race_settings"`. Record `race.c:<line>` into `self._race_settings_decl_ref`. (At canonical 1.46, all three resolve to `race.c:242`, `race.c:323`, `race.c:293` respectively; the handler captures whatever the live tag's source returns.)

  - `_extract_um_init_array(cursor, array_name)`:
    - Read the source-byte extent of the VAR_DECL. The init clause is one or more adjacent string literals concatenated: `const char foo[] = "lit1\n" "lit2\n" ... ;`. Use `cursor.get_tokens()` to walk the post-`=` token stream.
    - For each `TokenKind.LITERAL` token whose spelling starts with `"`:
      - Strip surrounding quotes.
      - Strip a single trailing `\n` (one newline per cvar line).
      - Strip surrounding whitespace (defensive; sources are tab-aligned but not whitespace-padded inside the quotes).
      - Split on first run of whitespace -> `(key, value)` tuple. If the result is `(key, "")` or unparseable, append the line content to `self._stats.skipped_lines` with a reason and continue.
      - Source line: the token's `cursor.location.line` (libclang tracks per-literal line numbers across the C-string-concat sequence -- this is the load-bearing primitive that makes per-line `source_ref` possible without re-tokenizing the source bytes manually).
    - For each adjacent `TokenKind.IDENTIFIER` token followed by a `TokenKind.LITERAL` token (the macro-prefixed shape: `LGCMODE_VARIABLE " 0\n"`):
      - Look up the identifier in `self.file_macros`. If found, the macro resolves to a string; concatenate macro-value + the trailing literal's content (sans quotes), then apply the same key/value split as above.
      - If NOT found, append `(<file:line>, identifier, "macro lookup failed")` to `self._stats.unresolved_macro_lines` and skip the line. This is the defensive marker -- a future tag adding a new cross-header macro silently rots without this signal; the unresolved-list is the early-warning surface (consumed by the F1 quality probe in Phase 7).
    - Trailing-comment harvest (per D12): for each parsed line, also walk the source bytes from the end of the literal token forward to the next `\n` -- if a `// comment` body appears on the same source line (i.e. between the closing `"` and the next newline), strip the leading `//` + whitespace and store as `props_json.comment`. Comments on a separate line from the literal are NOT harvested (they belong to no specific entry). Source comments are the only documentation that exists; do not drop them (D12).
    - Construct one `mode_default` row per parsed line:
      ```python
      {
        "name":        key,                              # the cvar name being set
        "kind":        "mode_default",
        "value_text":  value,                            # the string value
        "value_numeric": <int(value) if value.lstrip("-").isdigit() else None>,
        "source_ref":  f"commands.c:{token.location.line}",
        "ruleset_gate_json": {"mode": <mode_token>},     # "common" for common_um_init; the user-facing token for _<mode>_um_init
        "props_json": {
          "comment":          <harvested_comment_or_None>,
          "apply_order":      1 if array_name == "common_um_init" else 2,
          "initstring_array": array_name,
          "is_baseline":      array_name == "common_um_init",
        },
      }
      ```
      Append to `self._mode_default_rows`.
    - Per-array `_stats.by_array[array_name]`: capture `{"line_count": N, "macros_resolved": M, "macros_unresolved": K}` for audit.
    - The mode_token for each mode_default row is derived as: `"common"` for `common_um_init`; otherwise the inverse-lookup of `array_name` against `UM_INIT_ARRAY_NAMES` -- e.g., `"_2on2_um_init"` -> `"2on2"`, `"carena_um_init"` -> `"ca"`, `"_1on1hm_um_init"` -> `"hoonymode"`.

  - `_emit_um_list_catalog_rows()` (called from `finalize`): for each token in `UM_LIST_ENUMS`, build a `kind='game_mode'` catalog row:
    ```python
    {
      "name":        token,                    # source-fidelity token, D9
      "kind":        "game_mode",
      "value_text":  UM_LIST_ENUMS[token],     # e.g. "umCA"
      "source_ref":  self._um_list_row_refs.get(token, "commands.c:?"),
      "ruleset_gate_json": {},                  # catalog rows DEFINE modes, are not gated, D8
      "props_json": {
        "init_mechanism":      "um_init_string",     # D11 axis 1
        "mode_class":          "standalone",         # D11 axis 2
        "auto_reset_on_match": False,                # D11 axis 3
        "activation_cvar":     None,
        "initstring_ref":      f"commands.c:{<line of decl>}",
        "init_function":       None,
        "team_structure":      UM_LIST_TEAM_STRUCTURES[token],
        "race_plrs_per_team":  UM_LIST_RACE_PLRS[token],
        "user_facing_label":   UM_LIST_USER_FACING_LABELS[token],
        "um_list_label_raw":   self._um_list_label_raw.get(token, ""),
        "community_name":      None,                  # opt-in seed augmentation, see Task 3
        "wiki_ref":            None,                  # opt-in seed augmentation, see Task 3
        "game_type":           UM_LIST_GAME_TYPES[token],
        "playable_solo":       False,                 # default; a few standalone modes may flip to true via seed augmentation
        "auto_reset_call_sites": [],                  # empty for um_list peers (no auto-reset)
        "source_xrefs":        [
          self._um_list_row_refs.get(token, ""),
          f"commands.c:{<line of {array_name}_um_init declaration>}",
        ],
      },
    }
    ```
    The `<line of declaration>` is captured per-array during `_extract_um_init_array` and stashed into a `dict[str, int]` on the handler so it can be retrieved at finalize.

  - `_emit_extra_catalog_rows()` (called from `finalize`): emits the 10 non-um_list rows:
    - `race`: per Pass 5.1 + 5.4.1. Source lookups: ToggleRace at `self._race_toggle_ref`; activation_cvar source_ref at `self._activation_cvar_refs["k_race"]`; initstring_ref at `self._race_settings_decl_ref` (this is the `props_json.initstring_ref` field per Pass 5.4.1's locked schema; Pass 5.1 originally drafted it as `init_config_string_ref` but Pass 5.4.1 renamed for consistency with the um_list peers' field name -- 5.4.1 governs); init_function = `"apply_race_settings"`. Schema:
      ```python
      {
        "name":        "race",
        "kind":        "game_mode",
        "value_text":  None,                       # not in UserModes_t
        "source_ref":  self._race_toggle_ref,      # "race.c:<ToggleRace line>"
        "ruleset_gate_json": {},
        "props_json": {
          "init_mechanism":         "cvar_toggle_with_init_string",
          "mode_class":             "standalone",
          "auto_reset_on_match":    False,
          "activation_cvar":        "k_race",
          "initstring_ref":         self._race_settings_decl_ref,
          "init_function":          "apply_race_settings",
          "team_structure":         "UM_RACEMODE",
          "race_plrs_per_team":     None,
          "user_facing_label":      "Race",
          "community_name":         None,
          "wiki_ref":               None,
          "game_type":              "Race",
          "playable_solo":          True,
          "auto_reset_call_sites":  [],
          "source_xrefs":           [
            self._toggle_cmd_refs.get("race", ""),    # "commands.c:695"
            self._race_toggle_ref,                     # "race.c:242"
            self._race_settings_decl_ref,              # "race.c:293"
            self._activation_cvar_refs.get("k_race", ""),  # "world.c:912"
          ],
        },
      }
      ```
    - `bloodfest`: per Pass 5.1. Source lookups: activation_cvar source_ref at `self._activation_cvar_refs["k_bloodfest"]` (`world.c:971` at canonical 1.46). No central init function, no init string. Schema:
      ```python
      {
        "name":        "bloodfest",
        "kind":        "game_mode",
        "value_text":  None,
        "source_ref":  self._activation_cvar_refs.get("k_bloodfest", ""),
        "ruleset_gate_json": {},
        "props_json": {
          "init_mechanism":         "cvar_toggle_only",
          "mode_class":             "standalone",
          "auto_reset_on_match":    False,
          "activation_cvar":        "k_bloodfest",
          "initstring_ref":         None,
          "init_function":          None,
          "team_structure":         None,
          "race_plrs_per_team":     None,
          "user_facing_label":      "Bloodfest",
          "community_name":         None,
          "wiki_ref":               None,
          "game_type":              "Survival",
          "playable_solo":          True,
          "auto_reset_call_sites":  [],
          "source_xrefs":           [
            self._activation_cvar_refs.get("k_bloodfest", ""),
            "sp_monsters.c:35-41",   # bloodfest scattered sites; static reference per spec
          ],
        },
      }
      ```
    - For each of the 8 mutators in `MUTATORS`: emit a `kind='game_mode'` row with the discriminator set:
      ```python
      {
        "name":        mutator_token,                         # "lgc", "instagib", "midair", "berzerk", "yawnmode", "killquad", "freshteams", "nosweep"
        "kind":        "game_mode",
        "value_text":  None,
        "source_ref":  self._activation_cvar_refs.get(MUTATORS[mutator_token], ""),
        "ruleset_gate_json": {},
        "props_json": {
          "init_mechanism":         "cvar_toggle_only",
          "mode_class":             "mutator",
          "auto_reset_on_match":    MUTATOR_AUTO_RESET[mutator_token],
          "activation_cvar":        MUTATORS[mutator_token],
          "initstring_ref":         None,
          "init_function":          None,
          "team_structure":         None,
          "race_plrs_per_team":     None,
          "user_facing_label":      <human-readable; LGC -> "LGC Mode", Instagib -> "Instagib", etc.>,
          "community_name":         None,                     # populated via seed augmentation
          "wiki_ref":               None,                     # populated via seed augmentation
          "game_type":              "Mutator",
          "playable_solo":          False,
          "auto_reset_call_sites":  self._auto_reset_call_sites.get(mutator_token, []),
          "sub_flags_json":         (
            ["k_freshteams_limit_packs", "k_freshteams_limit_sweep_ammo",
             "k_freshteams_fast_ammo",   "k_freshteams_weapon_time"]
            if mutator_token == "freshteams" else None
          ),
          "source_xrefs":           [
            self._toggle_cmd_refs.get(mutator_token, ""),
            self._activation_cvar_refs.get(MUTATORS[mutator_token], ""),
          ],
        },
      }
      ```
      Per Pass 5.4.1: only `freshteams` carries the `sub_flags_json` field (the four `k_freshteams_*` sub-cvars; they remain individual cvar entities via Pass 1.4 -- this field is a discoverability hint, not a duplicate row).

  - `finalize(all_rows: dict, repo_root: Path) -> dict`:
    - Call `_emit_um_list_catalog_rows()` and `_emit_extra_catalog_rows()` to populate `self._catalog_um_rows` and `self._catalog_extra_rows`.
    - Optional seed-augmentation merge: read `apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml` (Task 3 ships this file). For each catalog row whose `name` matches a seed entry, overlay `community_name`, `wiki_ref`, `playable_solo`, `user_facing_label` if provided. Seed values win over handler defaults; missing seed entries leave the handler defaults intact. If the seed file is absent, finalize logs a warning and proceeds (the file is optional).
    - Catalog rows are dedup-checked: every catalog row's `name` is unique within `self._catalog_um_rows + self._catalog_extra_rows`. A duplicate is a CRITICAL signal; raise.
    - Mode_default rows are dedup-checked: every `(name, ruleset_gate_json["mode"])` tuple is unique. A duplicate within one mode's overlay is a CRITICAL signal; raise. (The same cvar appearing in both `common_um_init` and a per-mode overlay is EXPECTED -- different gates -- not a duplicate.)
    - Return shape:
      ```python
      {
        "groups":        {"game_mode": "catalog", "mode_default": "overlay"},
        "game_modes":    self._catalog_um_rows + self._catalog_extra_rows,    # 27 rows
        "mode_defaults": self._mode_default_rows,                              # ~309 rows
        "_stats": {
          "catalog_count":              len(self._catalog_um_rows) + len(self._catalog_extra_rows),
          "mode_default_count":         len(self._mode_default_rows),
          "by_array":                   self._stats["by_array"],
          "unresolved_macro_lines":     self._stats["unresolved_macro_lines"],
          "skipped_lines":              self._stats["skipped_lines"],
          "auto_reset_call_sites_used": {k: len(v) for k, v in self._auto_reset_call_sites.items()},
          "seed_augmentations_applied": <int>,    # tracked during merge
        },
      }
      ```
    The driver writes this dict as `ktx-modes-ast.json` per the canonical handler convention. Pretty-printed JSON; UTF-8 (no surrogate-pair source chars expected).

  - The handler does NOT collide with `_handler_log_templates.py` (Pass 1.7 / Phase 2): different output filename (`ktx-modes-ast.json` vs `ktx-log-templates-ast.json`), different visited cursors (modes handler does NOT match `log_printf` / `G_bprint` / `G_sprint` / `G_cprint` calls; printf-handler does NOT match the `<mode>_um_init[]` declarations or `cvar_toggle_msg` calls). Both can run on the same TU without interference.

**Verification:**
- `python3 apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py --help` (or `python3 -c "from apps.qw_oracle.scripts.extractors.ktx._handler_modes import KtxModesHandler"` if no CLI shim) imports cleanly with no syntax errors.
- `grep -n "from extractor_lib._visitor import Visitor" apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py` returns at least one match (D3 import discipline).
- `grep -n "subclass\|inherit.*from .*ezquake\|inherit.*from .*mvdsv\|inherit.*from .*fte\|inherit.*from .*qwcl" apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py` returns ZERO matches (D3: no parent-project subclass).
- `grep -n "self.file_macros" apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py` returns at least one match (Pattern 6 lift consumption).
- PASS condition: file present + imports clean + D3 import discipline + Pattern 6 consumption visible.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet MAX)` -- multi-file source-walking handler with cross-header macro dependency, 27-row catalog assembly with two-axis discriminators (D11), per-line ~309-row overlay extraction with comment harvest (D12), three source-file dispatch with mutator/race/bloodfest cross-references. Judgment-dense (per `feedback_model_effort_range.md`); bumping above the Sonnet medium floor to Sonnet MAX is warranted.

### Task 2: Register MODES handler in `apps/qw-oracle/scripts/extractors/ktx/extract.py`

**Goal:** Add the `KtxModesHandler` to the KTX driver's `ALL_HANDLERS` (or the equivalent `collect_handlers` dispatch dict shipped by Phase 2) so `python3 extract.py --handlers all` runs it alongside the four Pass-1 handlers.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/extract.py` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/extractors/ktx/extract.py` (Phase 2 deliverable). Locate the per-handler import block + the `ALL_HANDLERS` dict. They will mirror MVDSV's `extract.py:64-89` shape per D6 / Phase 2 wiring.

- [ ] Add the import: `from _handler_modes import KtxModesHandler` adjacent to the existing Pass-1 imports.

- [ ] Add the `ALL_HANDLERS` (or equivalent) entry: `"modes": KtxModesHandler()` adjacent to the existing entries. Naming MUST match the handler's `name` attribute (`"modes"`) so `--handlers modes` selects only this handler at the CLI.

- [ ] Confirm the source-file iteration in the driver covers `commands.c`, `world.c`, AND `race.c`. Phase 2's KTX driver visits `src/*.c` at the top level of `research/repos/ktx/` (mirroring MVDSV's pattern); all three files are top-level. If Phase 2's driver instead restricts to a subset (e.g., `commands.c` only for Pass-1 work), expand the file iteration to include world.c and race.c. If the iteration is already broad, no change.

- [ ] Confirm there are no `--handlers` allowlist filters that would exclude `"modes"`. Phase 2's driver should accept `all` (default) -> all registered handlers, OR comma-separated subset; the `modes` key joins the existing dict naturally.

**Verification:**
- `python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --help` lists `modes` among the handler names.
- `grep -n "KtxModesHandler\|\"modes\"" apps/qw-oracle/scripts/extractors/ktx/extract.py` returns at least 2 matches (the import and the dict entry).
- PASS condition: dry-run `--handlers modes` prints `modes` is selected; smoke run produces `output/ktx-modes-ast.json`.
- FAIL condition: handler not registered OR dispatched but no output written.

**Execution mode:** `inline` -- 2-line surgical edit (one import, one dict entry) to a file Phase 2 already shaped; full content of the change shipped above; mechanical Edit calls.

### Task 3: Author `apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml`

**Goal:** Land a hand-authored seed YAML carrying the catalog-row fields the handler can't statically derive (community wiki references, community names, refined user-facing labels for mutators, `playable_solo` flag overrides). The seed is OPTIONAL -- the handler's defaults stand if the seed is missing -- but shipping seed entries makes downstream Layer 3 concept-note authoring easier and is the operator's hook for documentation enrichment without re-running extraction.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml` (created)

**Steps:**

- [ ] Create the parent directory if it doesn't exist:
  ```bash
  mkdir -p apps/qw-oracle/scripts/extractors/ktx/seeds
  ```
  (At drafting time `apps/qw-oracle/scripts/extractors/ktx/` contains only `commands.ts` (deleted in Phase 0), the `output/` dir, and Phase 2's `OUT_OF_SCOPE.md` + handler files. The `seeds/` subdir does NOT exist yet -- mirror the `apps/qw-oracle/scripts/extractors/qw/seeds/` naming convention. Idempotent: re-running `mkdir -p` is a no-op.)

- [ ] Create the file at `apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml`. Top-level shape:

  ```yaml
  # KTX modes catalog augmentation (operator-authored).
  # Optional: handler defaults stand for any catalog row not listed here.
  # Schema: list of {name, ...overrides}. Recognized override keys:
  #   community_name      string  -- informal nickname players use ("CA" for ca, "WO" for wipeout, "Tribe of Tjernobyl" for tot)
  #   wiki_ref            string  -- https://www.quakeworld.nu/wiki/<page> when one exists
  #   user_facing_label   string  -- override the handler's default
  #   playable_solo       bool    -- true if the mode is regularly played 1-player (race + bloodfest are true by default; override here for 1on1 if the operator wants it true)
  #
  # Source for wiki_refs: site rip at /tmp/qwiki-snapshot/articles/ + manual cross-check
  # against quakeworld.nu/wiki main page. NULL when no wiki page exists.

  modes:
    # 17 um_list peers
    - name: "1on1"
      community_name: "Duel"
      wiki_ref: "https://www.quakeworld.nu/wiki/Duel"
    - name: "2on2"
      community_name: "2v2"
      wiki_ref: "https://www.quakeworld.nu/wiki/2on2"
    - name: "4on4"
      community_name: "4v4"
      wiki_ref: "https://www.quakeworld.nu/wiki/4on4"
    - name: "ca"
      community_name: "Clan Arena"
      wiki_ref: "https://www.quakeworld.nu/wiki/Clan_Arena"
    - name: "wipeout"
      community_name: "Wipeout"
      wiki_ref: "https://www.quakeworld.nu/wiki/Wipeout"
    - name: "ctf"
      community_name: "CTF"
      wiki_ref: "https://www.quakeworld.nu/wiki/CTF"
    # ... add entries for the remaining um_list peers as they have wiki coverage.
    # 2 cvar-toggle standalones
    - name: "race"
      community_name: "Race"
      wiki_ref: "https://www.quakeworld.nu/wiki/Race"
      playable_solo: true
    - name: "bloodfest"
      community_name: "Bloodfest"
      wiki_ref: null
      playable_solo: true
    # 8 mutators
    - name: "lgc"
      community_name: "LGC"
      wiki_ref: "https://www.quakeworld.nu/wiki/LGC"
      user_facing_label: "LGC Mode"
    - name: "instagib"
      community_name: "Instagib"
      wiki_ref: "https://www.quakeworld.nu/wiki/Instagib"
    - name: "midair"
      community_name: "Midair"
      wiki_ref: "https://www.quakeworld.nu/wiki/Midair"
    - name: "berzerk"
      community_name: "Berzerk"
      wiki_ref: null
    - name: "yawnmode"
      community_name: "Yawnmode"
      wiki_ref: null
    - name: "killquad"
      community_name: "KillQuad"
      wiki_ref: null
    - name: "freshteams"
      community_name: "FreshTeams"
      wiki_ref: null
    - name: "nosweep"
      community_name: "NoSweep"
      wiki_ref: null
  ```

  Operator authors actual wiki_ref values by cross-checking the QW wiki rip. Fields not authored stay NULL on the row. Drafter ships the above as a starter shape; operator refines during Phase 3 review or post-execution.

- [ ] Commit the seed file as part of Phase 3's single commit. The handler's finalize merge logic reads it via the seed-augmentation step described in Task 1.

**Verification:**
- `test -f apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml` exits 0.
- `python3 -c "import yaml; data = yaml.safe_load(open('apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml')); assert isinstance(data['modes'], list); assert all('name' in m for m in data['modes'])"` exits 0 (well-formed YAML, every entry has `name`).
- PASS condition: file present + valid YAML + every entry has `name`.
- FAIL condition: file missing OR malformed YAML OR an entry missing `name`.

**Execution mode:** `inline` -- pure markdown / YAML data with full content shipped above; no logic; mechanical Write call. The drafter ships starter content; operator polishes during review.

### Task 4: Author `apps/qw-oracle/scripts/load-knowledge/load-modes.ts`

**Goal:** Ship the postgres-js loader that reads `ktx-modes-ast.json` and idempotently UPSERTs both `game_mode` catalog rows AND `mode_default` overlay rows into `gameplay_mechanics`. Mirrors `load-gameplay.ts`'s shape (canonicaliseGate helper, EXISTS-then-UPSERT pattern, per-row inserted/updated counter), but consumes an AST JSON (not a YAML seed) and dispatches by row.kind. JSONB binding via `tx.json(...)` per D14; ASCII discipline per D19.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/load-modes.ts` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/scripts/load-knowledge/load-modes.ts`. Module-level structure mirrors `load-gameplay.ts`:

  ```ts
  // Loader for KTX modes (game_mode catalog + mode_default overlays). Reads
  // apps/qw-oracle/scripts/extractors/ktx/output/ktx-modes-ast.json and
  // upserts every row into gameplay_mechanics keyed on
  // (gameplay_source_id='ktx', kind, name, ruleset_gate_json). Idempotent.
  //
  // Mirror of load-gameplay.ts shape; consumes the handler's AST JSON
  // instead of a YAML seed. Dispatches per row.kind: 'game_mode' rows are
  // catalog (27 expected); 'mode_default' rows are per-line overlays
  // (~309 expected). Both target gameplay_mechanics; unique constraint
  // (gameplay_source_id, kind, name, ruleset_gate_json) prevents
  // duplicates and supports re-runs.
  //
  // JSONB binding (D14): every JSONB column is bound via tx.json(...) so
  // the column receives a structured JSONB value, NOT a JSONB string
  // scalar (the legacy SQLite-era stringify bug).
  //
  // Validation: rejects on missing required fields per row shape; the
  // handler's _stats block carries diagnostic counts but the loader does
  // not consume them (loader trusts the handler's contract).

  import { readFileSync } from 'node:fs';
  import type postgres from 'postgres';

  const KTX_GAMEPLAY_SOURCE_ID = 'ktx' as const;

  interface CatalogRow {
    name: string;
    kind: 'game_mode';
    value_text: string | null;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: Record<string, unknown>;
  }

  interface ModeDefaultRow {
    name: string;
    kind: 'mode_default';
    value_text: string;
    value_numeric: number | null;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: Record<string, unknown>;
  }

  interface ModesAstFile {
    groups?: Record<string, string>;
    game_modes: CatalogRow[];
    mode_defaults: ModeDefaultRow[];
    _stats?: Record<string, unknown>;
  }

  export interface LoadModesResult {
    inserted: { game_mode: number; mode_default: number };
    updated:  { game_mode: number; mode_default: number };
    total:    { game_mode: number; mode_default: number };
  }
  ```

- [ ] Add the canonicaliseGate helper -- COPY the function literally from `load-gameplay.ts:90-96` (sorted-keys ordering, returns `{}` for null/empty). Reasoning: postgres compares JSONB by content for the unique index; ordered-key form keeps the comparison stable across runs. DO NOT pre-stringify (D14 violation).

- [ ] Implement the main loader function:

  ```ts
  export async function loadModesFromArray(sql: postgres.Sql, ast: ModesAstFile): Promise<LoadModesResult> {
    const result: LoadModesResult = {
      inserted: { game_mode: 0, mode_default: 0 },
      updated:  { game_mode: 0, mode_default: 0 },
      total:    { game_mode: 0, mode_default: 0 },
    };

    await sql.begin(async (tx) => {
      // Catalog rows (kind='game_mode'). Expected count: 27.
      for (const row of ast.game_modes) {
        const gateJson = canonicaliseGate(row.ruleset_gate_json ?? {});
        const propsJson = row.props_json ?? {};
        const existsRows = await tx<{ one: number }[]>`
          SELECT 1 AS one FROM gameplay_mechanics
          WHERE gameplay_source_id = ${KTX_GAMEPLAY_SOURCE_ID}
            AND kind = ${row.kind}
            AND name = ${row.name}
            AND ruleset_gate_json = ${tx.json(gateJson as never)}
        `;
        const wasExisting = existsRows.length > 0;
        await tx`
          INSERT INTO gameplay_mechanics (
            gameplay_source_id, kind, name,
            value_numeric, value_text,
            ruleset_gate_json, source_ref, props_json, notes
          ) VALUES (
            ${KTX_GAMEPLAY_SOURCE_ID}, ${row.kind}, ${row.name},
            ${null}, ${row.value_text ?? null},
            ${tx.json(gateJson as never)}, ${row.source_ref},
            ${tx.json(propsJson as never)}, ${null}
          )
          ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
            value_numeric = EXCLUDED.value_numeric,
            value_text    = EXCLUDED.value_text,
            source_ref    = EXCLUDED.source_ref,
            props_json    = EXCLUDED.props_json,
            notes         = EXCLUDED.notes
        `;
        if (wasExisting) result.updated.game_mode++; else result.inserted.game_mode++;
        result.total.game_mode++;
      }

      // Overlay rows (kind='mode_default'). Expected count: ~309.
      for (const row of ast.mode_defaults) {
        const gateJson = canonicaliseGate(row.ruleset_gate_json ?? {});
        const propsJson = row.props_json ?? {};
        const existsRows = await tx<{ one: number }[]>`
          SELECT 1 AS one FROM gameplay_mechanics
          WHERE gameplay_source_id = ${KTX_GAMEPLAY_SOURCE_ID}
            AND kind = ${row.kind}
            AND name = ${row.name}
            AND ruleset_gate_json = ${tx.json(gateJson as never)}
        `;
        const wasExisting = existsRows.length > 0;
        await tx`
          INSERT INTO gameplay_mechanics (
            gameplay_source_id, kind, name,
            value_numeric, value_text,
            ruleset_gate_json, source_ref, props_json, notes
          ) VALUES (
            ${KTX_GAMEPLAY_SOURCE_ID}, ${row.kind}, ${row.name},
            ${row.value_numeric ?? null}, ${row.value_text},
            ${tx.json(gateJson as never)}, ${row.source_ref},
            ${tx.json(propsJson as never)}, ${null}
          )
          ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
            value_numeric = EXCLUDED.value_numeric,
            value_text    = EXCLUDED.value_text,
            source_ref    = EXCLUDED.source_ref,
            props_json    = EXCLUDED.props_json,
            notes         = EXCLUDED.notes
        `;
        if (wasExisting) result.updated.mode_default++; else result.inserted.mode_default++;
        result.total.mode_default++;
      }
    });

    return result;
  }

  export async function loadModesFromFile(sql: postgres.Sql, jsonPath: string): Promise<LoadModesResult> {
    const ast = JSON.parse(readFileSync(jsonPath, 'utf-8')) as ModesAstFile;
    return loadModesFromArray(sql, ast);
  }
  ```

- [ ] Add a precondition check at the top of `loadModesFromArray`: confirm `gameplay_sources` row for `'ktx'` exists. If not, raise with a clear message pointing to Phase 1 Task 5. Idempotent in re-run (the check is read-only).

  ```ts
  const sourceRows = await sql<{ id: string }[]>`
    SELECT id FROM gameplay_sources WHERE id = ${KTX_GAMEPLAY_SOURCE_ID}
  `;
  if (sourceRows.length === 0) {
    throw new Error(
      `gameplay_sources row 'ktx' not found. Phase 1 Task 5 must run before load-modes. ` +
      `See docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md.`
    );
  }
  ```

- [ ] Add row-count sanity check at the END of `loadModesFromArray`: assert catalog count >= 27 AND mode_default count in `[280, 360]` (a tolerance band around the F6 ~309 anchor; allows for per-tag drift but flags structural changes). Both the catalog-count assertion and the mode_default-count assertion log + raise on miss; raise is the harder gate for catalog (the F5 27 is exact); soft-warn-and-pass for mode_default (the ~309 is approximate).

  ```ts
  if (result.total.game_mode < 27) {
    throw new Error(
      `load-modes: catalog count ${result.total.game_mode} < 27 expected (F5 anchor). ` +
      `Handler emitted fewer game_mode rows than required.`
    );
  }
  if (result.total.mode_default < 280 || result.total.mode_default > 360) {
    console.warn(
      `[load-modes] mode_default count ${result.total.mode_default} outside [280, 360] band ` +
      `(F6 ~309 anchor). Investigate if structural rather than per-tag drift.`
    );
  }
  ```

- [ ] Document the loader's contract at module top: idempotent UPSERT; consumes handler's AST JSON; precondition is Phase 1's `gameplay_sources['ktx']` row + Phase 1's gameplay-kind widening migration; D14 JSONB binding everywhere.

**Verification:**
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-modes.ts` exits 0 (clean TS compile).
- `grep -n "tx.json\|JSON.stringify" apps/qw-oracle/scripts/load-knowledge/load-modes.ts | grep -c "JSON.stringify"` returns `0` (no D14-violating pre-stringify; per `feedback_substring_not_regex_fingerprinting.md`, the substring is the load-bearing fingerprint).
- `grep -n "ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json)" apps/qw-oracle/scripts/load-knowledge/load-modes.ts` returns at least 2 matches (one per row kind).
- `grep -n "KTX_GAMEPLAY_SOURCE_ID" apps/qw-oracle/scripts/load-knowledge/load-modes.ts` returns at least 4 matches (precondition check + both UPSERTs).
- PASS condition: clean compile + JSONB binding correct + catalog/overlay UPSERTs both present.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across one new TS file mirroring an existing analog (load-gameplay.ts) plus the AST-JSON consumption shape and JSONB-binding discipline. Mechanical implementation requiring reasoning (clear spec, one file, ~100 lines).

### Task 5: Wire `load-ktx-modes` subcommand in `index.ts`

**Goal:** Surface the loader on the CLI so `bun scripts/load-knowledge --help` shows it and `bun scripts/load-knowledge load-ktx-modes --json <path>` runs it. Mirrors the existing `load-gameplay` subcommand registration shape (`index.ts:37` + `index.ts:473-485`).

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/index.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/index.ts`. Locate the subcommand-dispatch block around line 37 (where `load-gameplay` is registered). Add adjacent dispatch:

  ```ts
  if (subcommand === 'load-ktx-modes')             { await runLoadKtxModes(rest); return; }
  ```

- [ ] Add the help-text line in the usage printer (around line 83 where `load-gameplay [--yaml <path>]` appears). Add:

  ```
    load-ktx-modes [--json <path>]
  ```

- [ ] Implement `runLoadKtxModes(args: string[]): Promise<void>` adjacent to the existing `runLoadGameplay` (around line 470-485). Shape:

  ```ts
  async function runLoadKtxModes(args: string[]): Promise<void> {
    const jsonPath = parseArgValue(args, '--json') ?? defaultModesJsonPath();
    const sql = await connect();
    try {
      const { loadModesFromFile } = await import('./load-modes.js');
      const r = await loadModesFromFile(sql, jsonPath);
      console.log(
        `load-ktx-modes: game_mode inserted=${r.inserted.game_mode} updated=${r.updated.game_mode} total=${r.total.game_mode}; ` +
        `mode_default inserted=${r.inserted.mode_default} updated=${r.updated.mode_default} total=${r.total.mode_default}`
      );
      if (r.total.game_mode < 27) {
        console.error(
          `load-ktx-modes: STOP - catalog count below F5 anchor 27 (got ${r.total.game_mode}). ` +
          `Re-run extraction; the handler may have failed to emit one or more catalog rows.`
        );
        process.exitCode = 2;
      }
    } finally {
      await sql.end();
    }
  }

  function defaultModesJsonPath(): string {
    return join(MONOREPO_ROOT, 'apps', 'qw-oracle', 'scripts', 'extractors', 'ktx', 'output', 'ktx-modes-ast.json');
  }
  ```

  The `parseArgValue`, `connect`, `MONOREPO_ROOT`, and `join` references already exist in `index.ts`; reuse them. If they are not visible in the local scope, the executor may need to thread imports / hoist constants -- mirror whatever `runLoadGameplay` does (it has the same ergonomic needs).

**Verification:**
- `bun scripts/load-knowledge/index.ts --help` (or `bun apps/qw-oracle/scripts/load-knowledge/index.ts --help`) lists `load-ktx-modes [--json <path>]`.
- `grep -n "load-ktx-modes\|runLoadKtxModes\|loadModesFromFile" apps/qw-oracle/scripts/load-knowledge/index.ts` returns at least 4 matches (dispatch + help + function definition + dynamic import).
- PASS condition: subcommand discoverable via --help + dispatches without runtime error on a missing JSON path (just emits a "file not found" error, not a crash).
- FAIL condition: subcommand absent OR runtime error inside the wrapper.

**Execution mode:** `inline` -- targeted multi-line additions to an existing file with full new content shipped above; no logic the drafter hasn't already specified.

### Task 6: Wire load-ktx-modes into the per-tag pipeline in `extract-tag.ts`

**Goal:** When `extractTag()` runs for `project='ktx'`, after the entity-loader loop completes, also call `loadModesFromFile` so a single `extract-tag --project ktx --version <tag>` invocation lands ALL KTX rows (Pass-1 entity rows + Phase-3 mode rows) atomically. Mirrors the way `loadAssets` is called as a separate post-step in the existing flow.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`. Locate the per-project post-entity-loader block (around the existing `loadAssets` call site after the `for (const [type, jsonFile] of ...)` loop).

- [ ] Add a project-conditional KTX-modes load step:

  ```ts
  // Phase 3 (KTX onboarding): load mode_default + game_mode rows from
  // _handler_modes.py's ktx-modes-ast.json. These rows live in
  // gameplay_mechanics (not entities), so they're handled outside the
  // entity-loader loop. Idempotent UPSERT; safe to re-run.
  if (options.project === 'ktx') {
    const modesJsonPath = join(extractorOutputDir, 'ktx-modes-ast.json');
    if (existsSync(modesJsonPath)) {
      const { loadModesFromFile } = await import('./load-modes.js');
      const modesResult = await loadModesFromFile(options.sql, modesJsonPath);
      console.log(
        `[extract-tag] ktx modes loaded: game_mode total=${modesResult.total.game_mode}, ` +
        `mode_default total=${modesResult.total.mode_default}`
      );
    } else {
      console.warn(
        `[extract-tag] ktx-modes-ast.json missing at ${modesJsonPath}; ` +
        `skipping mode loading. Re-run extract-tag once Phase 3 ships if this is unexpected.`
      );
    }
  }
  ```

- [ ] The `existsSync` check makes this hook safe to land BEFORE the modes handler is exercised end-to-end on a fresh checkout: if the JSON is absent, the call is skipped with a warning (not a fatal). Once `--handlers all` runs the modes handler, the JSON appears and the load step kicks in.

**Verification:**
- `grep -n "ktx-modes-ast.json\|loadModesFromFile" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` returns at least 2 matches.
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` exits 0.
- PASS condition: hook present + clean compile.
- FAIL condition: hook missing OR compile error.

**Execution mode:** `inline` -- one block-add to an existing file with full content shipped above.

### Task 7: Author `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py`

**Goal:** Land a pytest-shaped sanity test that parses a representative subset of KTX source via libclang + the handler, then asserts:
1. Catalog count = 27 (F5 anchor).
2. mode_default count is in `[280, 360]` (F6 tolerance band).
3. The 2 cross-header macros (`LGCMODE_VARIABLE`, `TOT_MODE_VARIABLE`) resolved successfully (no entries in `_stats.unresolved_macro_lines` for those two identifiers).
4. Catalog row for `"ca"` has `props_json.team_structure == "UM_4ON4"` (D9 source-fidelity smoke check).
5. Mutator catalog row for `"berzerk"` has `props_json.activation_cvar == "k_bzk"` (NOT `"k_berzerk"` -- that's runtime state per F5).
6. mode_default row exists for `(name="teamplay", ruleset_gate_json={"mode":"4on4"})` -- verifies per-mode overlay extraction works for at least one canonical case.

The test exercises the live KTX repo if cloned at `research/repos/ktx/`; if absent, skips with documented reason.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py` (created)

**Steps:**

- [ ] Create the file with pytest fixtures + 6 test cases per the goals above. Mirror the shape of `extractor_lib/tests/test_collect_file_macros.py` (Phase 1 deliverable) -- same imports, same skip-if-repo-absent guard, same parse-via-clang_args helper. Concrete shape:

  ```python
  """Phase 3 sanity test: verifies KtxModesHandler produces F5/F6 anchors."""
  from __future__ import annotations
  import sys
  from pathlib import Path
  import pytest

  HERE = Path(__file__).resolve().parent
  KTX_HANDLER_DIR = HERE.parent
  EXTRACTORS_ROOT = KTX_HANDLER_DIR.parent
  KTX_REPO = HERE.parents[5] / "research" / "repos" / "ktx"

  sys.path.insert(0, str(KTX_HANDLER_DIR))
  sys.path.insert(0, str(EXTRACTORS_ROOT))

  if not KTX_REPO.exists():
      pytest.skip(f"KTX repo not at {KTX_REPO}; clone it to run these tests.", allow_module_level=True)

  from clang.cindex import Config, Index
  Config.set_library_file("libclang-18.so.1")

  from extractor_lib.clang_config import PARSE_OPTS, clang_args_ktx_for  # Phase 2 ships this
  from extractor_lib._visitor import walk_tu_dispatch
  from _handler_modes import KtxModesHandler


  @pytest.fixture(scope="module")
  def handler_with_outputs():
      handler = KtxModesHandler()
      handler.setup(KTX_REPO, KTX_REPO / "src")

      idx = Index.create()
      args = clang_args_ktx_for(str(KTX_REPO / "src"))

      for filename in ["commands.c", "world.c", "race.c"]:
          target_path = KTX_REPO / "src" / filename
          tu = idx.parse(str(target_path), args=args, options=PARSE_OPTS)
          source_bytes = target_path.read_bytes()
          handler.start_file(target_path, source_bytes)
          walk_tu_dispatch(tu, [handler], "server", str(target_path))
          handler.end_file()

      result = handler.finalize({}, KTX_REPO)
      return handler, result


  def test_catalog_count_27(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["game_modes"]) == 27, (
          f"Expected 27 catalog rows (F5); got {len(result['game_modes'])}"
      )


  def test_mode_default_count_in_band(handler_with_outputs):
      _, result = handler_with_outputs
      n = len(result["mode_defaults"])
      assert 280 <= n <= 360, f"Expected ~309 (F6); got {n}"


  def test_cross_header_macros_resolved(handler_with_outputs):
      _, result = handler_with_outputs
      unresolved = [u for u in result["_stats"]["unresolved_macro_lines"]
                    if u[1] in ("LGCMODE_VARIABLE", "TOT_MODE_VARIABLE")]
      assert unresolved == [], (
          f"Phase 1's Pattern 6 lift should resolve LGCMODE_VARIABLE and TOT_MODE_VARIABLE "
          f"in commands.c via depth-1 #include of g_local.h. Unresolved: {unresolved}"
      )


  def test_ca_team_structure(handler_with_outputs):
      _, result = handler_with_outputs
      ca = next((r for r in result["game_modes"] if r["name"] == "ca"), None)
      assert ca is not None, "catalog row for 'ca' missing"
      assert ca["props_json"]["team_structure"] == "UM_4ON4", (
          f"D9 source-fidelity: ca shares UM_4ON4 with 4on4/wipeout. Got: {ca['props_json']['team_structure']}"
      )


  def test_berzerk_activation_cvar_is_k_bzk(handler_with_outputs):
      _, result = handler_with_outputs
      bz = next((r for r in result["game_modes"] if r["name"] == "berzerk"), None)
      assert bz is not None, "mutator row for 'berzerk' missing"
      assert bz["props_json"]["activation_cvar"] == "k_bzk", (
          f"F5 fact: k_bzk is the enable cvar; k_berzerk is runtime state. Got: {bz['props_json']['activation_cvar']}"
      )


  def test_4on4_overlay_has_teamplay(handler_with_outputs):
      _, result = handler_with_outputs
      hit = [r for r in result["mode_defaults"]
             if r["name"] == "teamplay"
             and r["ruleset_gate_json"].get("mode") == "4on4"]
      assert len(hit) >= 1, (
          f"Expected at least one mode_default for (name='teamplay', mode='4on4'). "
          f"Got: {hit}. (Inspect _4on4_um_init at commands.c:4346 if absent.)"
      )
  ```

- [ ] Run the test file: `cd apps/qw-oracle/scripts/extractors/ktx && python3 -m pytest tests/test_handler_modes.py -v`. All six test cases pass (or skip with documented reason if repo absent).

**Verification:**
- `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py -v` exits 0 with all assertions green.
- PASS condition: pytest pass.
- FAIL condition: any assertion fails (skip with no documented reason is also fail).

**Execution mode:** `subagent (Sonnet medium)` -- new test file with 6 assertions; implementation requires running the handler end-to-end against the live KTX repo and shaping pytest fixtures correctly. Mechanical given the spec but benefits from subagent isolation (libclang + handler + pytest interplay is non-trivial). Sonnet medium is the right fit.

### Task 8: Per-row verification probes

**Goal:** Verify the rows landed in dev DB match F5 / F6 anchors AND the JSONB-binding regression gate (D14) passes. SQL probes; YES/NO answers per D16.

**Files:** none modified; transient SELECT queries against the dev DB.

**Steps:**

- [ ] Run the catalog count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'game_mode'"
  ```
  Expected: `27` (F5 anchor; exact match required).

- [ ] Run the mode_default count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'mode_default'"
  ```
  Expected: in band `[280, 360]` (F6 ~309 anchor with tolerance).

- [ ] Run the apply_order distribution probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      (props_json->>'apply_order')::int AS apply_order,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'mode_default'
    GROUP BY apply_order
    ORDER BY apply_order"
  ```
  Expected: two rows -- apply_order=1 with count ~54 (`common_um_init` baseline), apply_order=2 with count ~255 (per-mode overlays).

- [ ] Run the discriminator-grid probe (D11):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      props_json->>'init_mechanism' AS mech,
      props_json->>'mode_class'      AS class,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'game_mode'
    GROUP BY 1, 2
    ORDER BY 1, 2"
  ```
  Expected: 4 rows --
  - `cvar_toggle_only | mutator      | 8`  (the 8 mutators)
  - `cvar_toggle_only | standalone   | 1`  (bloodfest)
  - `cvar_toggle_with_init_string | standalone | 1` (race)
  - `um_init_string | standalone | 17` (the 17 um_list peers)

- [ ] Run the JSONB-binding regression probe (D14):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      jsonb_typeof(ruleset_gate_json) AS gate_type,
      jsonb_typeof(props_json)        AS props_type,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
    GROUP BY 1, 2
    ORDER BY 1, 2"
  ```
  Expected: every row has `gate_type='object'` AND `props_type='object'`. NEVER `'string'` (would mean the legacy stringify bug landed). Two rows max:
  - `gate_type=object, props_type=object` -- the bulk
  - any other combination -> CRITICAL FAIL.

- [ ] Run the cross-header-macro resolution probe (F15):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, value_text, source_ref
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind = 'mode_default'
      AND ruleset_gate_json->>'mode' = 'common'
      AND name IN ('k_lgcmode', 'k_tot_mode')
    ORDER BY name"
  ```
  Expected: 2 rows --
  - `name='k_lgcmode', value_text='0', source_ref='commands.c:4178'` (or whatever the live tag's line is)
  - `name='k_tot_mode', value_text='0', source_ref='commands.c:4179'` (or live tag's line)

  These two rows are the F15 / D4 success signal: Phase 1's Pattern 6 lift resolved both cross-header macros from `g_local.h` into `common_um_init[]`'s extraction.

- [ ] Run the catalog round-trip (read-back) probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      name,
      props_json->>'init_mechanism' AS mech,
      props_json->>'mode_class'      AS class,
      props_json->>'game_type'       AS gtype
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'game_mode'
    ORDER BY name"
  ```
  Expected: 27 rows; spot-check a few against F5's grid: `ca` -> `(um_init_string, standalone, Team)`; `race` -> `(cvar_toggle_with_init_string, standalone, Race)`; `bloodfest` -> `(cvar_toggle_only, standalone, Survival)`; `lgc` -> `(cvar_toggle_only, mutator, Mutator)`.

- [ ] Run the idempotency probe (re-run loader):
  ```bash
  bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-modes
  ```
  After the first load, the next run reports 0 inserted, 27 updated for game_mode, 0 inserted, ~309 updated for mode_default. Counts unchanged from first load.

  Idempotency probe SQL (run BEFORE and AFTER the second load; counts must match):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind IN ('game_mode', 'mode_default')"
  ```
  Pre-second-load count == Post-second-load count.

**Verification:**
- All 7 probes return expected results.
- PASS condition: catalog=27 + mode_default in [280,360] + apply_order distribution sane + discriminator grid matches D11 + JSONB-binding all `object` + LGCMODE/TOT_MODE rows present + idempotency holds.
- FAIL condition: any probe deviates.

**Execution mode:** `inline` -- pure SQL probes shipped above; the operator (or executor) copy-pastes into psql; no logic, no reasoning.

### Task 9: Single commit landing all Phase 3 changes

**Goal:** Commit Phase 3 as one coherent unit per D16 (phase atomicity). Per D20: directly to `main`, no PR ceremony.

**Files:** all the above (creates + modifies).

**Steps:**

- [ ] Stage the new + modified files:
  ```bash
  git add apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py \
          apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml \
          apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py \
          apps/qw-oracle/scripts/extractors/ktx/extract.py \
          apps/qw-oracle/scripts/load-knowledge/load-modes.ts \
          apps/qw-oracle/scripts/load-knowledge/index.ts \
          apps/qw-oracle/scripts/load-knowledge/extract-tag.ts \
          docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-3-modes-handler.md \
          docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
  ```

- [ ] (The dev-DB rows inserted by Task 8's probes live in the dev DB; the prod dump-restore mechanism per the prod-update-lifecycle spec carries them forward. No file change to commit for the data.)

- [ ] `git commit` with message:
  ```
  arc(ktx): Phase 3 -- modes handler (game_mode catalog + mode_default overlays)

  KTX mode-taxonomy extraction lands as Layer 1 rows.

  Handler:
  - _handler_modes.py walks commands.c (17 _<mode>_um_init[] arrays + common_um_init +
    um_list[]), world.c (mutator + race + bloodfest activation cvar registrations),
    race.c (ToggleRace + apply_race_settings + race_settings[]).
  - Pattern 15 (STRING_LITERAL-array walker) emits per-line mode_default rows
    from each const char[] body (D12 per-line granularity, trailing-comment harvest).
  - Phase 1's Pattern 6 lift (D4) resolves LGCMODE_VARIABLE and TOT_MODE_VARIABLE
    cross-header macros from g_local.h into common_um_init[] extraction.
  - Two-axis catalog discriminators (D11): init_mechanism in {um_init_string,
    cvar_toggle_with_init_string, cvar_toggle_only}; mode_class in {standalone, mutator};
    auto_reset_on_match: bool.
  - Source-fidelity tokens (D9): "ca", "2on2", "lgc", "wipeout" -- enum spellings
    in props_json.value_text for traceability.
  - Output: ktx-modes-ast.json with game_modes[] (27 rows) + mode_defaults[] (~309 rows)
    + _stats block (per-array counts, unresolved-macro signals, seed-augmentation count).

  Loader:
  - load-modes.ts (postgres-js) idempotently UPSERTs both arrays into gameplay_mechanics
    on (gameplay_source_id='ktx', kind, name, ruleset_gate_json).
  - JSONB binding via tx.json(...) (D14); F1 quality probe asserts jsonb_typeof
    returns 'object' for all rows.
  - Catalog count assertion: total.game_mode >= 27 (F5 anchor; hard-fail).
  - mode_default tolerance band: [280, 360] (F6 ~309 anchor; soft-warn).
  - Precondition check: gameplay_sources['ktx'] row must exist (Phase 1 Task 5).

  Wiring:
  - apps/qw-oracle/scripts/extractors/ktx/extract.py registers KtxModesHandler in ALL_HANDLERS.
  - apps/qw-oracle/scripts/load-knowledge/index.ts adds load-ktx-modes subcommand.
  - apps/qw-oracle/scripts/load-knowledge/extract-tag.ts calls loadModesFromFile after
    the entity loaders for project='ktx' (existsSync-guarded, safe re-runs).

  Seed:
  - apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml carries operator-authored
    community_name + wiki_ref + user_facing_label overrides; handler's finalize merges
    on row.name. Optional file; defaults stand if absent.

  Tests:
  - tests/test_handler_modes.py runs the handler end-to-end against the live KTX repo
    (research/repos/ktx/) and asserts F5/F6 anchors + cross-header macro resolution +
    one source-fidelity smoke check (ca shares UM_4ON4) + one mutator semantic check
    (berzerk activates via k_bzk, NOT k_berzerk runtime state) + one overlay smoke
    (4on4 mode_default has teamplay).

  Resolves: F5 (27 catalog rows), F6 (~309 mode_default rows), F15 (Pattern 6 lift
  dependency confirmed working).
  Pre-stages: nothing further -- Phases 4/5/6 are independent; Phase 7 validation
  consumes these rows for the F1 quality grid.
  ```

- [ ] Push to origin per the project's git workflow.

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status` is clean (working tree matches HEAD).
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes after the commit OR git push fails.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at the end of Phase 3. All probes return YES/NO answers:

**1. Handler file present + imports clean.**

```bash
test -f apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py && \
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_modes import KtxModesHandler; print('ok')"
```
- PASS condition: prints `ok`.
- FAIL condition: ImportError or file-missing.

**2. Loader file present + clean compile.**

```bash
test -f apps/qw-oracle/scripts/load-knowledge/load-modes.ts && \
  bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-modes.ts
```
- PASS condition: tsc exits 0.
- FAIL condition: tsc errors.

**3. Pytest sanity test passes.**

```bash
cd apps/qw-oracle/scripts/extractors/ktx && \
  python3 -m pytest tests/test_handler_modes.py -v
```
- PASS condition: pytest exits 0; all 6 test cases pass.
- FAIL condition: any test case fails (skip-with-no-reason is also fail).

**4. Catalog count = 27 (F5 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'game_mode'"
```
- PASS condition: returns `27`.
- FAIL condition: returns anything else.

**5. mode_default count in band (F6 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'mode_default'"
```
- PASS condition: returns a value in `[280, 360]`.
- FAIL condition: returns a value outside that band.

**6. Two-axis discriminator distribution matches D11.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT
    props_json->>'init_mechanism'                        AS mech,
    props_json->>'mode_class'                            AS class,
    count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'game_mode'
  GROUP BY 1, 2 ORDER BY 1, 2"
```
- PASS condition: 4 rows --
  - `cvar_toggle_only | mutator    | 8`
  - `cvar_toggle_only | standalone | 1`
  - `cvar_toggle_with_init_string | standalone | 1`
  - `um_init_string  | standalone | 17`
- FAIL condition: counts deviate from above (any cell off-by-one or missing class).

**7. JSONB-binding regression gate (D14).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT
    jsonb_typeof(ruleset_gate_json) AS gate_type,
    jsonb_typeof(props_json)        AS props_type,
    count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
  GROUP BY 1, 2 ORDER BY 1, 2"
```
- PASS condition: every row has `gate_type='object'` AND `props_type='object'`.
- FAIL condition: any row has `gate_type='string'` OR `props_type='string'`. CRITICAL: this is the legacy SQLite-era stringify bug per D14.

**8. Cross-header macros resolved (F15).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT name, value_text
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'mode_default'
    AND ruleset_gate_json->>'mode' = 'common'
    AND name IN ('k_lgcmode', 'k_tot_mode')
  ORDER BY name"
```
- PASS condition: returns exactly 2 rows -- `k_lgcmode|0` and `k_tot_mode|0`.
- FAIL condition: 0 or 1 rows (Pattern 6 lift didn't resolve one or both macros) OR 3+ rows (extraction emitted duplicates).

**9. apply_order baseline / overlay split.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT
    (props_json->>'apply_order')::int AS apply_order,
    count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'mode_default'
  GROUP BY apply_order ORDER BY apply_order"
```
- PASS condition: 2 rows -- `apply_order=1, count >= 50` (common baseline ~54) AND `apply_order=2, count >= 230` (per-mode overlays ~255).
- FAIL condition: only one apply_order present (one half of the extraction didn't fire) OR counts wildly off.

**10. Mutator inventory matches F5.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT name FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'game_mode'
    AND props_json->>'mode_class' = 'mutator'
  ORDER BY name"
```
- PASS condition: 8 rows in alphabetical order: `berzerk, freshteams, instagib, killquad, lgc, midair, nosweep, yawnmode`.
- FAIL condition: count != 8 OR any expected mutator missing OR unexpected mutator present.

**11. Idempotent re-run.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind IN ('game_mode', 'mode_default')" > /tmp/phase3_count_a.txt
bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-modes
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind IN ('game_mode', 'mode_default')" > /tmp/phase3_count_b.txt
diff /tmp/phase3_count_a.txt /tmp/phase3_count_b.txt
```
- PASS condition: `diff` is empty (counts identical pre- and post-second-load); D15 idempotency holds.
- FAIL condition: counts differ -> ON CONFLICT clause is missing or mis-keyed.

**12. Phase 3 commit landed cleanly.**

```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 3; `git status --short` is empty.
- FAIL condition: latest commit is something else OR working tree has uncommitted residuals.

If all 12 probes pass, Phase 3 is done. Phase 4 (gameplay taxonomies handler) and Phase 5 (gameplay tables handler) are mutually independent -- can draft in parallel after this. If any probe fails, see `## Recovery` below.

## Outputs to next phase

After Phase 3 ships, the following hold:

- `gameplay_mechanics` carries 27 `kind='game_mode'` catalog rows (all `gameplay_source_id='ktx'`) discriminated along D11's two axes + the auto_reset boolean.
- `gameplay_mechanics` carries ~309 `kind='mode_default'` overlay rows (all `gameplay_source_id='ktx'`) gated on `{"mode":"<token>"}` per D8, with apply_order=1 for `common_um_init` baseline rows and apply_order=2 for per-mode overlays per D12.
- Mode-aware queries are possible end-to-end. E.g.:
  ```sql
  -- "What gets set when entering ca, in apply order"
  SELECT name, value_text, props_json->>'comment' AS comment
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'mode_default'
    AND ruleset_gate_json->>'mode' IN ('common', 'ca')
  ORDER BY (props_json->>'apply_order')::int, source_ref;

  -- "Which modes set k_pow_pickup to a non-zero value"
  SELECT ruleset_gate_json->>'mode' AS mode, value_text
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'mode_default'
    AND name = 'k_pow_pickup' AND value_text != '0';

  -- "Which mutators auto-reset at match start"
  SELECT name FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'game_mode'
    AND props_json->>'mode_class' = 'mutator'
    AND (props_json->>'auto_reset_on_match')::boolean = true;
  ```
- `_handler_modes.py` is registered in the KTX driver and runs as part of `--handlers all`. The output JSON `ktx-modes-ast.json` is regenerated on every per-tag extraction.
- `load-modes.ts` is wired into both the standalone `load-ktx-modes` subcommand AND the per-tag pipeline in `extract-tag.ts` (project=ktx). Re-running `extract-tag --project ktx --version <tag>` brings both Pass-1 entity rows AND Phase-3 mode rows up to date in one shot.
- `gameplay_mechanics` rows carry the qw-namespace polymorphic shape: ruleset_gate_json + props_json + source_ref. Layer 3 concept-note authors (parking doc 2026-05-04-ktx-layer3-concept-note-candidates.md) can cite per-mode rows directly via `(gameplay_source_id, kind, name, ruleset_gate_json)` tuples; MCP `search_concepts` consumers see structured mode-rule data.
- Phase 4-5 work is ready to start. Phase 4 (gameplay taxonomies) extracts 5 election_type rows + 27 death_rule rows (mutually independent). Phase 5 (gameplay tables) extracts 13 monster + 3 score_system + 30 drop_item + 15 loc_macro + 21 teamplay_message rows (mutually independent). Phase 6 (match_event handler) is XSD-driven and runs in parallel.
- Phase 7's validation runbook will gain Phase-3 entries for the F1 quality grid: per-kind counts, JSONB-typeof regression gate, idempotency probe, cross-header-macro-resolution probe.

## Open questions / deferred items

- **Question:** Phase 1's planned migration filenames are `008_ktx_log_template_logfile_channel.sql` / `009_ktx_match_event_type.sql` / `010_ktx_gameplay_kinds.sql`, but the live `apps/qw-oracle/db/migrations/` directory ALREADY contains `008_community_schema.sql` (committed 2026-05-05 in commit `af7f5b5b`, after Phase 1 MD was drafted but before Phase 1 has shipped). Phase 1's drafter will need to renumber to `009/010/011` (or an equivalent re-sequencing). Phase 3 references "Phase 1's gameplay-kinds widening migration" by FUNCTION (not number), so Phase 3 is unaffected -- but the operator should be aware before kicking Phase 1 execution.
  **Default chosen for now:** Phase 3 references the migration by what it does (admits `'game_mode'`, `'mode_default'`, `'monster'`, etc.) rather than by number. Phase 1's executor adjusts numbering as needed; Phase 3's expectations are stable.
  **Who can resolve:** Phase 1 executor (during execution; not a Phase 3 concern).

- **Question:** The 4th cross-header macro lift in Phase 1 (Task 6) ships test fixture infrastructure at `extractor_lib/tests/test_collect_file_macros.py`. Does Phase 3's `tests/test_handler_modes.py` belong in the SAME tests subdir, or separately under `apps/qw-oracle/scripts/extractors/ktx/tests/`?
  **Default chosen for now:** Phase 3 ships `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py` (project-private test dir, mirrors MVDSV's existing project-private test files). Phase 1's lifted-helper test stays in `extractor_lib/tests/` (shared infrastructure tests). Two separate test surfaces, two separate `pytest` invocations -- not an issue at our scale.
  **Who can resolve:** Phase 3 executor.

- **Question:** The seed-augmentation file `apps/qw-oracle/scripts/extractors/ktx/seeds/modes-augment.yaml` is OPTIONAL per the handler's finalize. The drafter ships starter content; the operator may want to populate `wiki_ref` values for ALL 27 catalog rows OR for just the mainstream ones (1on1 / 2on2 / 4on4 / ca / wipeout / ctf / race / instagib / midair). Which scope?
  **Default chosen for now:** ship starter entries for ~16 rows (the ones the operator's `feedback_l3_concept_notes_wiki_shape.md` memory implies are mainstream); leave the other ~11 with `wiki_ref: null`. Operator can expand the seed during Phase 3 review or post-execution; the handler re-runs idempotently on a refreshed seed via `extract-tag --project ktx --version <tag>` (or a standalone `bun ... load-ktx-modes`).
  **Who can resolve:** Operator -- the seed is operator-authored content; the handler is the conduit.

- **Question:** Pass 5.4.1's `auto_reset_call_sites` field is populated from `commands.c:7538-7540` + `commands.c:7754-7756` for LGC, and analogous sites for instagib/midair. Does the handler emit these as `[]` for mutators with `auto_reset_on_match=false` (berzerk / yawnmode / killquad / freshteams / nosweep)?
  **Default chosen for now:** YES -- emit `[]` for `auto_reset_on_match=false` mutators. The field is present-but-empty rather than missing, so consumers querying the field always get a list (no null-check tax). Loader doesn't care; it just round-trips the JSONB content.
  **Who can resolve:** Phase 3 executor.

- **Question:** The handler's `_visit_commands_c` matches `cvar_toggle_msg(self, "k_X", ...)` calls to discover toggle command source_refs for mutators. But `commands.c:3240` has `cvar_toggle_msg(self, "k_bzk", redtext("Berzerk mode"))` -- the call's enclosing FUNCTION_DECL is the toggle command's body, NOT the cmds[] row. To get the cmds[] row line for the `berzerk` command (the operator-typed command keyword), the handler walks the cmds[] array directly per the spec. Are both signals captured (one for source_xrefs, one for source_ref), or just one?
  **Default chosen for now:** capture BOTH. `props_json.source_xrefs` is the union (cmds[] row line + cvar_toggle_msg call site + cvar registration line). `source_ref` (the row-primary) is the cvar registration line for mutators (e.g., `world.c:930` for berzerk's `k_bzk` registration), per Pass 5.1's pattern (race uses `race.c:242` (ToggleRace function), bloodfest uses `world.c:971` (k_bloodfest registration)). The mutator pattern is closer to bloodfest's, so `source_ref` = activation_cvar registration site for the 8 mutators.
  **Who can resolve:** Phase 3 executor (if the source-ref convention surfaces ambiguity at execution time, default per the above).

- **Question:** Some `_um_init[]` arrays may have lines whose key/value parse fails (e.g., `"k_noitems \"\"\n"` -- a quoted empty value). How does the handler treat these?
  **Default chosen for now:** treat as a valid extraction with `value_text=""` (the empty string). The C `\"\"` source content is two double-quote characters -> after strip-surrounding-quotes the inner content is `""` -> after the outer-strip, the value field becomes `""`. Distinct from the all-whitespace value, which IS a parse failure (and goes to `_stats.skipped_lines`). The handler's _um_init parser must distinguish these cases; the test fixture should include one such line as a specific assertion.
  **Who can resolve:** Phase 3 executor (the source pattern surfaces at parse time; the executor verifies the parse handles it).

- **Question:** Inter-pass contradiction on `yawnmode.auto_reset_on_match`. Pass 5.1 amendment table (spec line 762) marks `yawnmode` as `auto_reset=true`. Pass 5.4.1's final grid (spec line 1047) marks it `false` ("yawnmode | mutator | cvar_toggle_only | true (auto-reset) | Mutator" was 5.1's draft; 5.4.1's final grid has yawnmode at `auto_reset=false`). Which governs?
  **Default chosen for now:** Pass 5.4.1 GOVERNS. It is the later, source-walked, operator-locked authoritative pass-close (per the spec close header "5.4 -- Per-kind props_json finalization -- LOCKED"). The handler's `MUTATOR_AUTO_RESET["yawnmode"] = False` reflects 5.4.1. If a Phase 3 executor reads 5.1 instead of 5.4.1 they will flip the boolean -- this Open Question exists so the executor confirms the 5.4.1 value before shipping. F5's grid (review-findings.md line 109-114) also locks `yawnmode -> auto_reset=false`, sealing the disposition.
  **Who can resolve:** Phase 3 executor verifies against 5.4.1 + F5; if the executor surfaces a NEW reason to flip yawnmode true (live source evidence, e.g., a `cvar_set("k_yawnmode","0")` at match boundaries), surface to operator BEFORE shipping -- amendment to 5.4.1 lands in decisions.md.

## Recovery (if verification fails)

- **Probe 1 fails (handler import error):** read the Python error. Most likely causes: `from extractor_lib._visitor import Visitor` path fails because `sys.path.insert` is wrong (missing `KTX_HANDLER_DIR.parent` in path); OR a module-level constant declaration uses Python 3.10+ syntax that the dev env doesn't support; OR the handler module accidentally tries to import a parent-project handler (D3 violation).

- **Probe 2 fails (TS compile error):** read the tsc error. Most likely causes: missing import for `postgres` types; a `tx.json(...)` cast that TypeScript rejects; `process` not in scope (Bun-specific). Fix per the error.

- **Probe 3 fails (pytest test fails):** read the test failure. The 6 test cases test distinct facets; the failure points to which axis broke. Common causes:
  - `test_catalog_count_27` fails with N < 27: handler missed an entry (probably one of the 8 mutators or race/bloodfest didn't emit). Trace the corresponding `_emit_extra_catalog_rows` path.
  - `test_mode_default_count_in_band` fails with N too low: a `_<mode>_um_init[]` array's parsing failed silently. Check `_stats.skipped_lines` for evidence.
  - `test_cross_header_macros_resolved` fails: Phase 1's Pattern 6 lift did NOT land, OR the handler isn't reading `self.file_macros`. Verify Phase 1 Probe 6 still passes; verify the handler walks `LGCMODE_VARIABLE` resolution path.
  - `test_ca_team_structure` fails: D9 source-fidelity broke; the handler's `UM_LIST_TEAM_STRUCTURES` table is wrong (line `"ca": "UM_4ON4"` got mis-set).
  - `test_berzerk_activation_cvar_is_k_bzk` fails: the `MUTATORS` constant has the wrong value for berzerk (probably `"k_berzerk"` instead of `"k_bzk"`).
  - `test_4on4_overlay_has_teamplay` fails: `_4on4_um_init` extraction parses incorrectly. Verify the extracted source_bytes range matches `commands.c:4346-4361`.

- **Probe 4 fails (catalog count not 27):** count a wrong-by-one signal. Cause: one row deduplicated incorrectly OR one row missing from `_emit_extra_catalog_rows`. Run `SELECT name FROM gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='game_mode' ORDER BY name` and diff against F5's expected list.

- **Probe 5 fails (mode_default count out of band):** if too low (<280): handler missed a per-mode overlay. Check `_stats.by_array` -- which arrays have unexpectedly low line counts? If too high (>360): handler over-extracted (probably duplicating common rows into per-mode rows or vice versa).

- **Probe 6 fails (discriminator distribution wrong):** D11's two-axis discrimination broke. Likely cause: a mutator row got `mode_class='standalone'` (handler's MUTATOR_AUTO_RESET inversion) OR race/bloodfest got `init_mechanism='um_init_string'` (the catalog's "extra" rows used the wrong mechanism). Run a targeted SELECT to identify the off-grid row(s).

- **Probe 7 fails (jsonb_typeof returns 'string'):** D14 violation. The loader pre-stringified a JSONB column (`JSON.stringify` slipped in). Re-grep the loader for `JSON.stringify`. Per `feedback_repair_by_reextract_not_sql_update.md`, do NOT SQL-UPDATE the affected rows -- fix the loader bug and re-run the load (it's idempotent; the broken rows get overwritten with correctly-shaped JSONB).

- **Probe 8 fails (LGCMODE_VARIABLE / TOT_MODE_VARIABLE rows missing):** Phase 1's Pattern 6 lift didn't land OR the handler isn't reading `self.file_macros`. Verify Phase 1 Probe 6 still passes; if so, check that `_extract_um_init_array` consults `self.file_macros[ident]` for IDENTIFIER-then-LITERAL token sequences.

- **Probe 9 fails (apply_order distribution off):** one half of the extraction didn't fire. If `apply_order=1` count is 0 or wildly low: `common_um_init` parsing failed; check the handler's array-allowlist includes `"common_um_init"`. If `apply_order=2` count is 0 or wildly low: the per-mode arrays didn't get visited; check the source-file allowlist (`RELEVANT_FILES`) includes `commands.c`.

- **Probe 10 fails (mutator inventory wrong):** a mutator emitted a typo'd name OR was omitted from `MUTATORS`. Cross-check against F5's exact 8 names.

- **Probe 11 fails (idempotency violated):** the `ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE` clause is wrong. Most likely cause: the canonicaliseGate function returns inconsistent key ordering (sort the keys deterministically per `load-gameplay.ts:90-96`'s pattern). Per `feedback_idempotency_before_staleness.md`: inflated row counts on re-run mean re-run idempotency, not stale snapshot.

- **Probe 12 fails (commit missing or working tree dirty):** `git status` to triage; the most likely cause is files were staged but `git commit` failed on a hook. Inspect hook output, fix the underlying issue, re-stage, re-commit.

If any failure resists local recovery, halt and surface to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F5** (game_mode catalog row count = 27). Resolved by Tasks 1 + 4 (handler emits 17 um_list rows + race + bloodfest + 8 mutator rows; loader UPSERTs 27 catalog rows; Phase-boundary Probe 4 asserts the count).
- **F6** (mode_default row count ~309). Resolved by Tasks 1 + 4 (handler emits ~309 per-line rows from common_um_init + 17 _<mode>_um_init arrays; loader UPSERTs ~309 overlay rows; Phase-boundary Probe 5 asserts the band).
- **F15** (Cross-header macros LGCMODE_VARIABLE / TOT_MODE_VARIABLE). Resolved by Task 1 (handler consumes Phase 1's lifted `self.file_macros` to substitute the macros' literal values during `_extract_um_init_array`); Phase-boundary Probe 8 asserts the resolved rows landed in dev DB.

No findings touched by Phase 3 are deferred. F5 / F6 / F15 all ship in this phase.

---

*Phase 3 closes the modes-handler arc. Phase 4 (gameplay taxonomies handler -- `_handler_gameplay_taxonomies.py` with election_type + death_rule rows) and Phase 5 (gameplay tables handler -- `_handler_gameplay_tables.py` with monster + score_system + drop_item + loc_macro + teamplay_message rows) are mutually independent at the data level and can draft in parallel. Phase 6 (XSD-driven match_event handler) is also independent. Phase 7 (validation runbook + F1 quality probes) consumes Phase 3's output rows for cross-project audit.*
