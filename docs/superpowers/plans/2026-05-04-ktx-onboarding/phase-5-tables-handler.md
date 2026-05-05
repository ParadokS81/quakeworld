# Phase 5 -- Gameplay tables handler (monster + score_system + drop_item + loc_macro + teamplay_message)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (F9 / F10 / F11 / F12 / F13 -- see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitments behind this phase (Pass 4.4 + Pass 5.3 + Pass 5.4.5 + Pass 5.4.6 + Pass 5.4.7 + Pass 5.4.8 + Pass 5.4.9).
> 4. Source-walk the relevant KTX source files at `research/repos/ktx/src/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as templates. For the handler: ezQuake's `_handler_cvars.py::_extract_cvar_array` (Pattern 4 INIT_LIST_EXPR walks on struct-array literals) and MVDSV's `_handler_commands.py::_extract_command_table` + `_function_banner` (Pattern 4 + Pattern 9 banner-comment harvest + two-row `_cmd`/`_fn_def` cross-file resolution). Port, do not subclass per D3. For the loader: `load-gameplay-taxonomies.ts` (Phase 4) is the closest analog (multi-kind dispatch into `gameplay_mechanics` keyed on `(gameplay_source_id='ktx', kind, name, ruleset_gate_json)`); `load-gameplay.ts` is the precedent for the cross-table dispatch (`gameplay_entity_defs` for `kind='monster'` + `gameplay_mechanics` for the other four).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section in `phase-template.md`) before declaring the phase MD ready for operator review.

## Goal

Phase 5 lands KTX's five Group-B struct-array gameplay-content surfaces as queryable Layer 1 rows. Two deliverables: (1) `_handler_gameplay_tables.py` -- a single libclang-driven handler under `apps/qw-oracle/scripts/extractors/ktx/` that walks five distinct struct-array literals across four .c files (`sp_monsters.c` for `bloodfest_monster_array[]`; `race.c` for `scoring_systems[]`; `commands.c` for `dropitems[]`; `teamplay.c` for `locmacros[]` and `messages[]`) using Pattern 4 (INIT_LIST_EXPR walks), plus a Pattern 9 banner-comment harvest pass for the `messages[]` handler functions (e.g., `TeamplayYesOk`, `TeamplayNoCancel`) so each `teamplay_message` row carries a `harvested_description` from its handler's banner block. The handler emits one `ktx-gameplay-tables-ast.json` containing five arrays: 13 monsters + 3 score_systems + 31 drop_items + 15 loc_macros + 21 teamplay_messages = **83 rows total** (count revised from F11's locked 30 -> 31 per drafter source-walk; see Open Questions); (2) `load-gameplay-tables.ts` -- a postgres-js TS loader that idempotently UPSERTs the five row arrays into the right home table per kind (monsters land in `gameplay_entity_defs`; the other four land in `gameplay_mechanics`) per D14's JSONB binding rule, with a load-side validation gate enforcing F10's invariant that every score_system row's `positions` array has exactly 10 elements. Monster rows gate on `{"mode":"bloodfest"}` per F9; score_system rows gate on `{"mode":"race"}` per F10; drop_item / loc_macro / teamplay_message rows gate on `{}` (universal across modes) per F11 / F12 / F13. Runnable state at boundary: `gameplay_entity_defs` holds 13 `kind='monster'` rows; `gameplay_mechanics` holds 3 `kind='score_system'` + 31 `kind='drop_item'` + 15 `kind='loc_macro'` + 21 `kind='teamplay_message'` rows (all `gameplay_source_id='ktx'`); the five Group-B kinds are queryable in dev DB.

## Inputs from previous phase

Phase 1 complete:
- Migration 010 (or its renumbered equivalent per Phase 1's executor decision -- the working tree already shows `008_community_schema.sql` from commit `af7f5b5b` so Phase 1's three migrations renumber to `009 / 010 / 011` or higher; Phase 5 references the migration by FUNCTION, not number) widens `gameplay_entity_defs.kind` to admit `'monster'` and widens `gameplay_mechanics.kind` to admit `'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'` (D5 / Phase 1 Task 3). Per Phase 1, all five kind values are net-new to their respective CHECK constraints.
- `gameplay_sources` row for `'ktx'` exists in dev DB (`gameplay_source_id='ktx'`, seeded by Phase 1 Task 5). `load-gameplay-tables.ts` FK-references this row but does not insert it -- treats it as precondition.
- Pattern 6 cross-header lift in `extractor_lib._source` (Phase 1 Task 1) ships `collect_file_macros` exposing `self.file_macros` to every Visitor; depth-1 #include closure of the target file. Phase 5's handler consumes this for `WEAPON_BIG2` resolution (defined in commands.c at line 9053, same-file -- already worked pre-lift; the lift is a superset and continues to resolve it). For `H_ROTTEN` and `H_MEGA`: see Open Questions -- those macros live in `include/g_consts.h`, which is depth-2 from `commands.c` via `g_local.h`, so the depth-1 lift does NOT reach them; Phase 5 handles those via a handler-private fallback dict.

Phase 2 complete:
- KTX driver at `apps/qw-oracle/scripts/extractors/ktx/extract.py` exists with the Pass 1 handlers (cvars / commands / info_keys / log_templates) registered in `ALL_HANDLERS`. Phase 5 adds the `GAMEPLAY_TABLES` handler entry to that dict.
- `apps/qw-oracle/scripts/extractors/ktx/output/` directory exists; the four Pass-1 AST JSONs sit there; Phase 5 writes a new `ktx-gameplay-tables-ast.json` into the same dir alongside the Phase 3 (`ktx-modes-ast.json`) and Phase 4 (`ktx-gameplay-taxonomies-ast.json`) outputs.
- `extract-tag.ts` has KTX dispatch wiring; `PROJECT_EXTRACTOR.ktx` resolves to the KTX driver path; `ENTITY_JSON_FILES.ktx` carries the four Pass-1 entries. Phase 5 does NOT add `monster` / `score_system` / `drop_item` / `loc_macro` / `teamplay_message` to that map -- those rows are NOT EntityType-shaped (they target `gameplay_entity_defs` and `gameplay_mechanics`, not the entities/per-version surface). The integration point is a separate `load-ktx-gameplay-tables` subcommand on `apps/qw-oracle/scripts/load-knowledge/index.ts`, mirroring Phase 3's `load-ktx-modes` and Phase 4's `load-ktx-taxonomies` subcommands.

Phase 3 + Phase 4 are independent at the data level -- Phase 5 does not depend on either having shipped. The five Group-B handlers all consume the same `gameplay_source_id='ktx'` row from Phase 1 but write to disjoint `(kind, name, ruleset_gate_json)` triples; no row-key collisions.

Plus the prerequisites inherited from Arc 1 (`prerequisites.md`):
- Postgres dev container running and reachable; `bun --version` >= 1.3 in `apps/qw-oracle/`.
- KTX research repo cloned at `research/repos/ktx/`. The handler reads five files from `research/repos/ktx/src/` (`sp_monsters.c`, `race.c`, `commands.c`, `teamplay.c`) plus `research/repos/ktx/include/g_consts.h` (for the H_ROTTEN/H_MEGA fallback dict's documentation reference). All are part of the canonical KTX source tree at any commit.
- libclang 18 + python3-clang available (verified by any prior extractor run).
- id1 baseline `gameplay_entity_defs` rows are seeded (from `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` via Arc 1's `load-gameplay`). Phase 5's drop_item rows reference id1 entity names in `props_json.related_entity_canonical_id` (e.g., `weapon_supershotgun`, `item_health`); those values must match live id1 baseline names for cross-namespace JOIN queries to work. Phase-boundary Probe 11 verifies this.

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py
apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_tables.py
apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts
```

### Modified

```
apps/qw-oracle/scripts/extractors/ktx/extract.py                # register GAMEPLAY_TABLES handler in ALL_HANDLERS
apps/qw-oracle/scripts/load-knowledge/index.ts                  # add `load-ktx-gameplay-tables` subcommand + runLoadKtxGameplayTables wrapper
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts            # call load-gameplay-tables after the entity loaders for project=ktx (one new step in the per-tag pipeline)
docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md   # F9 / F11 amendments per drafter source-walk (see Open Questions)
docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md      # phase index status update from `not started` to `drafted (awaiting review)`
```

Note: `apps/qw-oracle/scripts/extractors/ktx/extract.py` does not exist on `main` at scaffold time (it is created by Phase 2). Phase 5 cannot run until Phase 2 ships. The "Inputs from previous phase" section above already states this explicitly; the dependency holds whether Phase 3 or Phase 4 has shipped or not.

### Deleted

n/a

## Tasks

### Task 1: Author `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py`

**Goal:** Ship the libclang-driven KTX gameplay-tables handler that emits the `ktx-gameplay-tables-ast.json` payload (13 monsters + 3 score_systems + 31 drop_items + 15 loc_macros + 21 teamplay_messages, plus a `_stats` block). Inherits from `Visitor` only (D3); five distinct struct-array dispatchers feed five output arrays, plus a Pattern 9 function-banner harvest pass for the `teamplay_message` handler functions. The handler is the canonical Pattern 4 reference for multi-kind struct-array extraction in the KTX onboarding arc; the Pattern 9 reuse demonstrates banner-comment harvest beyond MVDSV's commands handler.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py` with module-level structure mirroring MVDSV's `_handler_commands.py` shape (project-private handler, imports `extractor_lib._visitor.Visitor` only, no parent-project subclass per D3).

  Module docstring opens with: handler purpose (KTX Group-B struct-array gameplay-content tables), five-table dispatch summary (`bloodfest_monster_t` / `race_score_system_t` / `dropitem_spawn_t` / `locmacro_t` / `teamplay_message_t`), output filename (`ktx-gameplay-tables-ast.json`), source-file scope (4 .c files: `sp_monsters.c`, `race.c`, `commands.c`, `teamplay.c`).

  The handler uses Pattern 4 (INIT_LIST_EXPR walks on struct-array literals) for all five tables and additionally Pattern 9 (function-banner-comment harvest) for `teamplay_message_t.function` references. The Pattern 9 reuse is a port from MVDSV's `_handler_commands.py`; the banner-detection helpers `_DECORATION_RE`, `_IDENT_RE`, and `_function_banner()` are copied to this file rather than lifted to `extractor_lib` (Tier 2 lift waits for the second consumer per the three-tier handler architecture's Rule of Second Consumer; KTX is the second consumer of Pattern 9, so Phase 8 lands a Tier 2 lift candidate as a sidequest -- see Open Questions). For Phase 5, copy-and-adapt is the chosen path (cheaper than infrastructure rework mid-arc).

- [ ] Add module-level imports at the top:

  ```python
  from __future__ import annotations
  import re
  import sys
  from pathlib import Path
  from typing import Optional

  from clang.cindex import CursorKind

  HERE = Path(__file__).resolve().parent
  sys.path.insert(0, str(HERE.parent))

  from extractor_lib._visitor import Visitor  # noqa: E402
  from extractor_lib._source import (  # noqa: E402
      literal_string,
      read_extent,
      strip_array_and_qualifiers,
      strip_quotes,
  )
  from extractor_lib._resolve import resolve_fn_ref  # noqa: E402
  ```

- [ ] Add module-level constants:

  ```python
  HANDLER_NAME = "gameplay_tables"
  OUTPUT_FILENAME = "ktx-gameplay-tables-ast.json"

  # Pattern-9 banner harvest helpers (ported from MVDSV's _handler_commands.py).
  # Banner block shape: /* === Title === Body === */ . Title row is a single
  # bare identifier (the function name); body lines are everything else after
  # decoration stripping.
  _DECORATION_RE = re.compile(r"^[=\-]+$")
  _IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

  # H_ROTTEN / H_MEGA are defined at include/g_consts.h:241-242. From
  # commands.c they are reachable only via depth-2 #include traversal
  # (commands.c -> g_local.h -> g_consts.h). Phase 1's Pattern 6 lift is
  # depth-1 only (D4), so these macros do NOT appear in self.file_macros.
  # WEAPON_BIG2 IS in self.file_macros (defined at commands.c:9053, same-file).
  # Handler-private fallback dict resolves the two depth-2 macros from a
  # frozen lookup. Values verified at canonical 1.46 (master HEAD) on
  # 2026-05-05 against include/g_consts.h:241 (H_ROTTEN = 1) and
  # include/g_consts.h:242 (H_MEGA = 2); see Open Questions for the F11
  # amendment surfacing this finding.
  _DROPITEM_MACRO_FALLBACK: dict[str, int] = {
      "H_ROTTEN":     1,
      "H_MEGA":       2,
  }

  # Per-table dispatch: VAR_DECL whose stripped type matches a key in this
  # map routes to the corresponding extractor method. The struct-type spelling
  # is what libclang reports as cursor.type.spelling stripped of array
  # dimensions and trailing qualifiers (mirrors ezQuake's _NESTED_CVAR_TABLE_TYPES
  # and MVDSV's _COMMAND_TABLE_TYPES dispatch shape).
  _TABLE_TYPE_DISPATCH: dict[str, str] = {
      "bloodfest_monster_t":  "_extract_monster_table",
      "race_score_system_t":  "_extract_score_system_table",
      "dropitem_spawn_t":     "_extract_drop_item_table",
      "locmacro_t":           "_extract_loc_macro_table",
      "teamplay_message_t":   "_extract_teamplay_message_table",
  }
  ```

- [ ] Implement the `_function_banner(source_bytes, fn_def_offset)` helper as a module-level free function. Port verbatim from MVDSV's `_handler_commands.py:170-222`. Same logic: walk back from `fn_def_offset` to the immediately preceding `*/`, require visual adjacency (only whitespace between `*/` and the function-def start), parse the comment block, strip decoration rows, strip bare-identifier title rows, return the joined description body or None. The helper is pure (no instance state), which is why it stays free at module scope -- subclasses or future handlers don't need to override it.

- [ ] Implement the `KtxGameplayTablesHandler(Visitor)` class. Required attributes / methods:

  - Class attributes: `name = HANDLER_NAME`, `output_filename = OUTPUT_FILENAME`. No `payload_field` -- finalize() returns a dict with multiple top-level arrays (monsters + score_systems + drop_items + loc_macros + teamplay_messages + _stats) per the precedent in MVDSV's protocol handler return shape.

  - `setup(*, ktx_repo: Path, ktx_src: Path) -> None`: store both paths. Initialize stable per-handler accumulators (these survive across all per-file walks):
    ```python
    self._repo_root = ktx_repo
    self._src_root = ktx_src
    # No eager file-parse stages here (unlike Phase 4's Stage 2 deathtype.h
    # parse): all five tables are libclang-walkable via INIT_LIST_EXPR per
    # Pattern 4. self.file_macros is provided by walk_tu_dispatch (Phase 1's
    # depth-1 lift) and consulted in _extract_drop_item_table for
    # spawnflags resolution.
    ```

  - `start_file(*, source_path: Path, source_bytes: bytes) -> None`: store `self._source_bytes = source_bytes`, `self._source_path = source_path`. Per-file accumulators (cleared in `end_file`):
    ```python
    super().start_file(source_path=source_path, source_bytes=source_bytes)
    self._rows: list[dict] = []
    # Per-file dedup -- the KTX TU's #include closure makes the same struct
    # array visible from multiple .c files; first-wins per file. Across files
    # the finalize step does cross-file first-wins by (kind, name).
    self._seen_in_file: set[tuple[str, str]] = set()  # (kind, name)
    self._seen_fns_in_file: set[str] = set()         # function names for Pattern 9 dedup
    ```

  - `visit_cursor(cursor, variant)` dispatches on cursor.kind:

    ```python
    kind = cursor.kind

    # ---- Pattern 9: track FUNCTION_DECL definitions for cross-file banner
    # harvest. The teamplay_message_t array references handler functions by
    # name (e.g., TeamplayYesOk); the function definitions live elsewhere
    # in teamplay.c (and possibly across files). Emit one _fn_def row per
    # definition; finalize merges these into the teamplay_message rows.
    if kind == CursorKind.FUNCTION_DECL and cursor.is_definition():
        fn_name = cursor.spelling
        if fn_name and fn_name not in self._seen_fns_in_file:
            self._seen_fns_in_file.add(fn_name)
            description = _function_banner(
                self._source_bytes,
                cursor.extent.start.offset,
            )
            self._rows.append({
                "_kind": "_fn_def",
                "fn_name": fn_name,
                "description": description,
                "source_ref_handler": self._format_source_ref(cursor),
            })
        return  # FUNCTION_DECL is never a struct-array VAR_DECL

    # ---- Pattern 4: struct-array dispatch. VAR_DECL whose stripped type
    # name appears in _TABLE_TYPE_DISPATCH routes to a per-table extractor.
    # Other VAR_DECLs (e.g., scalars, unrelated arrays) fall through.
    if kind != CursorKind.VAR_DECL:
        return
    type_spelling = strip_array_and_qualifiers(cursor.type.spelling)
    extractor_name = _TABLE_TYPE_DISPATCH.get(type_spelling)
    if extractor_name is None:
        return
    extractor = getattr(self, extractor_name)
    extractor(cursor)
    ```

  - `_format_source_ref(cursor) -> str`: returns `"<basename>:<line>"` (e.g., `"sp_monsters.c:62"`). Path-stripping for portability across worker filesystems:
    ```python
    rel = Path(cursor.location.file.name).name if cursor.location.file else "?"
    return f"{rel}:{cursor.location.line}"
    ```

  - `_extract_monster_table(node) -> None`: walks `bloodfest_monster_array[]` per Pattern 4. Struct field layout per source-walk against `sp_monsters.c:48-52` (canonical 1.46):

    ```
    typedef struct bloodfest_monster_s {
        char *class_name;     // field 0 (the "name" surface; lifted into row.name + value_text)
        int   hp_for_kill;    // field 1
        int   armor_for_kill; // field 2
        qbool boss_able;      // field 3
    } bloodfest_monster_t;
    ```

    NOTE on field naming: F9's locked `props_json` shape lists `count_per_wave` as the first numeric field name. Live source-walk against `sp_monsters.c:48-52` (2026-05-05) shows the source field is named `hp_for_kill` with the comment "how much hp player gains for killing such monster" -- this is a per-kill HP bonus to the player, NOT a monster spawn count. The spec's `count_per_wave` name does not describe what the field stores. Per D9 source-fidelity (and F9's own stated principle "Field-name-fidelity matters for downstream consumers; lock `<source name>` as the props_json key"), the canonical key is `hp_for_kill`. This phase ships the source-fidelity name and surfaces the spec-vs-source naming mismatch as an F9 amendment for operator review (see Open Questions). If the operator prefers F9's literal `count_per_wave`, swap before execution -- the handler change is one-line.

    Per-row emission (literal field reads via `read_extent` + `strip_quotes`; integer fields via `int()`-coerce on the read text; bool via `text == "true"` for qbool):

    ```python
    outer_init = next(
        (c for c in node.get_children() if c.kind == CursorKind.INIT_LIST_EXPR),
        None,
    )
    if outer_init is None:
        return
    file_name = Path(node.location.file.name).name if node.location.file else ""
    for array_position, elem in enumerate(outer_init.get_children()):
        init = elem
        if elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    init = ch
                    break
        if init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        fields = list(init.get_children())
        if len(fields) < 4:
            continue  # malformed entry; skip defensively
        class_name = strip_quotes(read_extent(self._source_bytes, fields[0].extent).strip())
        if not class_name:
            continue
        hp_for_kill   = self._parse_int(read_extent(self._source_bytes, fields[1].extent).strip())
        armor_for_kill = self._parse_int(read_extent(self._source_bytes, fields[2].extent).strip())
        boss_able     = read_extent(self._source_bytes, fields[3].extent).strip() == "true"
        key = ("monster", class_name)
        if key in self._seen_in_file:
            continue
        self._seen_in_file.add(key)
        self._rows.append({
            "_kind": "_table_row",
            "kind": "monster",
            "name": class_name,
            "value_text": class_name,  # same as name; stored for traceability per Pass 5.4.5
            "source_ref": f"{file_name}:{init.location.line}",
            "ruleset_gate_json": {"mode": "bloodfest"},
            "props_json": {
                "hp_for_kill":       hp_for_kill,
                "armor_for_kill":    armor_for_kill,
                "boss_able":         boss_able,
                "array_position":    array_position,
                "is_first_required": (array_position == 0),  # FISH _MUST_ BE _FIRST_ per sp_monsters.c:62 comment
            },
        })
    ```

    `_parse_int(text: str) -> int | None` is a tolerant integer parser (returns None on parse failure rather than raising; emits the raw text into a sidecar field if needed). Defensive against future macro-prefixed integers.

  - `_extract_score_system_table(node) -> None`: walks `scoring_systems[]` per Pattern 4. Struct field layout per source-walk against `race.c:5137-5145`:

    ```
    typedef struct race_score_system_s {
        char *name;           // field 0 (e.g., "Win Only", "Scaled", "Formula1")
        int   positions[10];  // field 1 -- nested INIT_LIST_EXPR with exactly 10 ints
        int   complete;       // field 2
        int   beating;        // field 3
        int   dnf_penalty;    // field 4
        int   round_max_diff; // field 5
    } race_score_system_t;
    ```

    The `positions[10]` field is itself an INIT_LIST_EXPR child (a nested array literal); walk its 10 children for per-position points. F10 invariant: every score_system row has `len(positions) == 10`. The handler asserts the count at extraction time and emits a `_stats.score_system.positions_length_violations` counter for any violation (defensive, not silently dropped); the loader-side gate is the canonical check (Task 3 implements it).

    Per-row emission (slug the .name field for the `name` column; preserve original casing in `value_text`):

    ```python
    outer_init = next(
        (c for c in node.get_children() if c.kind == CursorKind.INIT_LIST_EXPR),
        None,
    )
    if outer_init is None:
        return
    file_name = Path(node.location.file.name).name if node.location.file else ""
    for elem in outer_init.get_children():
        init = elem
        if elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    init = ch
                    break
        if init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        fields = list(init.get_children())
        if len(fields) < 6:
            continue
        display_name = strip_quotes(read_extent(self._source_bytes, fields[0].extent).strip())
        if not display_name:
            continue
        # Field 1 is the positions array (10-element INIT_LIST_EXPR).
        positions: list[int] = []
        if fields[1].kind == CursorKind.INIT_LIST_EXPR:
            for pos_child in fields[1].get_children():
                v = self._parse_int(read_extent(self._source_bytes, pos_child.extent).strip())
                positions.append(v if v is not None else 0)
        if len(positions) != 10:
            self._record_score_system_violation(display_name, len(positions))
            # Continue emitting the row anyway with the actual array; loader's
            # F10 gate is the canonical fail-fast. Defensive emit so the audit
            # trail captures handler-vs-loader divergence.
        completion     = self._parse_int(read_extent(self._source_bytes, fields[2].extent).strip())
        beating        = self._parse_int(read_extent(self._source_bytes, fields[3].extent).strip())
        dnf_penalty    = self._parse_int(read_extent(self._source_bytes, fields[4].extent).strip())
        round_max_diff = self._parse_int(read_extent(self._source_bytes, fields[5].extent).strip())
        slug = self._slugify_score_name(display_name)  # "Win Only" -> "win_only"
        key = ("score_system", slug)
        if key in self._seen_in_file:
            continue
        self._seen_in_file.add(key)
        self._rows.append({
            "_kind": "_table_row",
            "kind": "score_system",
            "name": slug,
            "value_text": display_name,                  # verbatim ".name" field per Pass 5.4.6
            "source_ref": f"{file_name}:{init.location.line}",
            "ruleset_gate_json": {"mode": "race"},
            "props_json": {
                "positions":      positions,             # exactly 10 elements per F10
                "completion":     completion,
                "beating":        beating,
                "dnf_penalty":    dnf_penalty,
                "round_max_diff": round_max_diff,
            },
        })
    ```

    `_slugify_score_name(text: str) -> str`: lowercases + replaces non-`[a-z0-9_]` runs with single underscores; strips leading/trailing underscores. "Win Only" -> "win_only", "Formula1" -> "formula1", "Scaled" -> "scaled".

  - `_extract_drop_item_table(node) -> None`: walks `dropitems[]` per Pattern 4 + Pattern 6 (extended via Phase 1's depth-1 lift) for `WEAPON_BIG2`, plus the handler-private `_DROPITEM_MACRO_FALLBACK` for `H_ROTTEN` / `H_MEGA` (depth-2 from commands.c; not in self.file_macros). Struct field layout per source-walk against `commands.c:9044-9051`:

    ```
    typedef struct {
        char *name;            // field 0 -- drop token: "h15", "ssg", "fl_r", "sp_dm", ...
        char *classname;       // field 1 -- spawned classname: "item_health", "weapon_supershotgun", ...
        int   spawnflags;      // field 2 -- raw enum/macro: 0, H_ROTTEN, H_MEGA, WEAPON_BIG2 (default 0)
        int   angle;           // field 3 -- 0 or 1 (default 0)
        void  (*spawn)(void);  // field 4 -- function pointer; null in normal rows, dropitem_spawn_spawnpoint for spawnpoint rows (default NULL)
    } dropitem_spawn_t;
    ```

    NOTE on row count: F11 anchors 30 drop_item rows. Drafter source-walk against `commands.c:9075-9108` (canonical 1.46, 2026-05-05) yields **31 entries**: h15, h25, h100, ga, ya, ra, ssg, ng, sng, gl, rl, lg, sh20, sh40, sp25, sp50, ro5, ro10, ce6, ce12, p, s, r, q, fl_r, fl_b, sp_r, sp_b, sp_dm, sp_cp, sp_sp. The 31 vs 30 discrepancy resolves to a Pass 5.4 source-walk drift (most likely cause: an addition between Pass 5.4 author's checkout and master HEAD; verifiable with `git log` against `commands.c`). Phase 5 ships with the live count of 31 and surfaces the F11 amendment for review (see Open Questions). The +1 entry is `sp_sp -> info_player_start` (a single-player spawnpoint variant); functionally equivalent to other sp_* entries. Handler emits exactly what the source array contains; no filtering.

    NOTE on macro resolution: F11's anchor states "Macros to resolve via Pattern 6 + #include walk (D4): H_ROTTEN, H_MEGA, WEAPON_BIG2 (defined in g_local.h and commands.c:9053)". Drafter source-walk shows H_ROTTEN and H_MEGA are actually in `include/g_consts.h:241-242` (H_ROTTEN = 1, H_MEGA = 2), reachable from commands.c only via depth-2 traversal (commands.c -> g_local.h -> g_consts.h). Phase 1's Pattern 6 lift is depth-1 only (D4 + Phase 1's `collect_file_macros` implementation). Therefore self.file_macros at commands.c-TU time will contain WEAPON_BIG2 (same-file at commands.c:9053) but NOT H_ROTTEN / H_MEGA. The handler resolves WEAPON_BIG2 from self.file_macros and falls back to `_DROPITEM_MACRO_FALLBACK` for H_ROTTEN / H_MEGA. The fallback is a frozen 2-entry dict at module scope (values verified at canonical 1.46 against include/g_consts.h:241-242); it does NOT silently swallow unknown macros. See Open Questions for the F11 amendment surfacing this finding and the alternatives the operator may prefer (e.g., D4 amendment to depth-2 walk, project-private allowlist of headers, etc.).

    Per-row emission:

    ```python
    outer_init = next(
        (c for c in node.get_children() if c.kind == CursorKind.INIT_LIST_EXPR),
        None,
    )
    if outer_init is None:
        return
    file_name = Path(node.location.file.name).name if node.location.file else ""
    for elem in outer_init.get_children():
        init = elem
        if elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    init = ch
                    break
        if init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        fields = list(init.get_children())
        if len(fields) < 2:
            continue
        drop_token = strip_quotes(read_extent(self._source_bytes, fields[0].extent).strip())
        if not drop_token:
            continue
        classname = strip_quotes(read_extent(self._source_bytes, fields[1].extent).strip())
        # Defensive: trailing fields default to 0 / NULL when omitted in the
        # array literal. C struct-init pads. Pad len(fields) up to 5 for read.
        flags_raw_text = (
            read_extent(self._source_bytes, fields[2].extent).strip()
            if len(fields) >= 3 else "0"
        )
        angle_text = (
            read_extent(self._source_bytes, fields[3].extent).strip()
            if len(fields) >= 4 else "0"
        )
        spawn_fn_name = None
        if len(fields) >= 5:
            spawn_fn_name = resolve_fn_ref(fields[4])  # None when field is literal 0/NULL
        # Resolve spawnflags: integer literal? Pattern-6 self.file_macros?
        # _DROPITEM_MACRO_FALLBACK? else None.
        spawnflags_value = self._resolve_spawnflags(flags_raw_text)
        angle_set = (self._parse_int(angle_text) or 0) != 0
        # Cross-namespace join hint to id1 baseline. Pass 5.4.7 spec: "joins
        # to existing id1 baseline gameplay_entity_defs rows for the
        # underlying item". Not all rows match id1 baseline (e.g., flag and
        # spawnpoint entries -- info_player_team1 etc. -- aren't id1 weapons
        # or items). Emit None for those; the loader does not enforce
        # FK-existence. Phase-boundary Probe 11 surfaces match coverage.
        related_canonical_id = (
            f"qw:gameplay_entity_def:{classname}" if classname else None
        )
        key = ("drop_item", drop_token)
        if key in self._seen_in_file:
            continue
        self._seen_in_file.add(key)
        self._rows.append({
            "_kind": "_table_row",
            "kind": "drop_item",
            "name": drop_token,
            "value_text": classname or None,
            "source_ref": f"{file_name}:{init.location.line}",
            "ruleset_gate_json": {},                   # universal across modes per F11
            "props_json": {
                "drop_token":                  drop_token,
                "spawned_classname":           classname or None,
                "spawnflags_raw":              flags_raw_text,
                "spawnflags_value":            spawnflags_value,
                "angle_set":                   angle_set,
                "spawn_function":              spawn_fn_name,
                "related_entity_canonical_id": related_canonical_id,
            },
        })
    ```

    `_resolve_spawnflags(text: str) -> int | None`:
    ```python
    s = text.strip()
    if not s:
        return 0
    # Literal int?
    parsed = self._parse_int(s)
    if parsed is not None:
        return parsed
    # Pattern 6 (Phase 1's depth-1 lift)? self.file_macros is provided by
    # walk_tu_dispatch and contains macros from the target file plus its
    # depth-1 #include closure.
    if hasattr(self, "file_macros") and s in (self.file_macros or {}):
        macro_value = self.file_macros[s]
        # macro_value is the literal RHS string from #define; wrap in
        # _parse_int to coerce. Defensive against macros that resolve to
        # parenthesised expressions like "(1)".
        v = self._parse_int(macro_value.strip().lstrip("(").rstrip(")"))
        if v is not None:
            return v
    # Handler-private fallback for depth-2 macros (H_ROTTEN, H_MEGA per F11
    # amendment).
    if s in _DROPITEM_MACRO_FALLBACK:
        return _DROPITEM_MACRO_FALLBACK[s]
    # Unknown: defensive emit None; spawnflags_raw preserves the symbolic
    # token for downstream investigation. Emits a _stats.drop_item.unresolved
    # entry to surface the gap.
    self._stat_unresolved_drop_macros.add(s)
    return None
    ```

    Initialize `self._stat_unresolved_drop_macros: set[str] = set()` in `start_file` (so per-file scope) and merge into the handler-level set in `end_file` for finalize-time `_stats` population.

  - `_extract_loc_macro_table(node) -> None`: walks `locmacros[]` per Pattern 4. Struct field layout per source-walk against `teamplay.c:1485-1489`:

    ```
    typedef struct locmacro_s {
        char *name;   // field 0 -- macro key: "ssg", "ng", "mh", "separator", ...
        char *value;  // field 1 -- expansion: "ssg" / "ng" / "mega" / "-" / ...
    } locmacro_t;
    ```

    Per-row emission with `is_identity` heuristic and a small `category` taxonomy keyed off the source-known macro vocabulary:

    ```python
    # Inline category map per Pass 5.4.8. Names not in this map default to
    # "syntactic" (e.g., separator) or fall back to None when no category
    # applies. This is hand-curated against the 15 entries; not source-derived.
    _LOC_MACRO_CATEGORY: dict[str, str] = {
        "ssg": "weapon", "ng": "weapon", "sng": "weapon", "gl": "weapon",
        "rl":  "weapon", "lg": "weapon",
        "ga":  "armor", "ya":  "armor", "ra":  "armor",
        "quad": "powerup", "pent": "powerup", "ring": "powerup", "suit": "powerup",
        "mh":  "health",
        "separator": "syntactic",
    }

    # Inline related-item map per Pass 5.4.8 spec: "ssg -> weapon_supershotgun,
    # quad -> item_artifact_super_damage, null for separator". Names match
    # id1 baseline gameplay_entity_defs.name spellings for FK joinability.
    _LOC_MACRO_RELATED_ITEM: dict[str, Optional[str]] = {
        "ssg":  "weapon_supershotgun",
        "ng":   "weapon_nailgun",
        "sng":  "weapon_supernailgun",
        "gl":   "weapon_grenadelauncher",
        "rl":   "weapon_rocketlauncher",
        "lg":   "weapon_lightning",
        "ga":   "item_armor1",
        "ya":   "item_armor2",
        "ra":   "item_armorInv",
        "quad": "item_artifact_super_damage",
        "pent": "item_artifact_invulnerability",
        "ring": "item_artifact_invisibility",
        "suit": "item_artifact_envirosuit",
        "mh":   "item_health",
        "separator": None,
    }
    ```

    Per-element walk:
    ```python
    outer_init = next(
        (c for c in node.get_children() if c.kind == CursorKind.INIT_LIST_EXPR),
        None,
    )
    if outer_init is None:
        return
    file_name = Path(node.location.file.name).name if node.location.file else ""
    for elem in outer_init.get_children():
        init = elem
        if elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    init = ch
                    break
        if init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        fields = list(init.get_children())
        if len(fields) < 2:
            continue
        macro_name = strip_quotes(read_extent(self._source_bytes, fields[0].extent).strip())
        if not macro_name:
            continue
        macro_value = strip_quotes(read_extent(self._source_bytes, fields[1].extent).strip())
        is_identity = (macro_name == macro_value)
        category = _LOC_MACRO_CATEGORY.get(macro_name, "other")
        related_item = _LOC_MACRO_RELATED_ITEM.get(macro_name)
        key = ("loc_macro", macro_name)
        if key in self._seen_in_file:
            continue
        self._seen_in_file.add(key)
        self._rows.append({
            "_kind": "_table_row",
            "kind": "loc_macro",
            "name": macro_name,
            "value_text": macro_value,
            "source_ref": f"{file_name}:{init.location.line}",
            "ruleset_gate_json": {},                 # universal per F12
            "props_json": {
                "expansion":    macro_value,         # duplicate of value_text per Pass 5.4.8
                "is_identity":  is_identity,
                "category":     category,
                "related_item": related_item,
            },
        })
    ```

  - `_extract_teamplay_message_table(node) -> None`: walks `messages[]` per Pattern 4. Struct field layout per source-walk against `teamplay.c:1638-1643`:

    ```
    typedef struct teamplay_message_s {
        char *cmdname;                      // field 0 -- message key: "yesok", "nocancel", ...
        char *description;                  // field 1 -- short label: "yes/ok", "no/cancel", ...
        void  (*function)(gedict_t *client); // field 2 -- handler function pointer (for Pattern 9)
    } teamplay_message_t;
    ```

    Per-row emission. `handler_function` and `source_ref_handler` come from the `_fn_def` rows captured by Pattern 9 during the same TU walk; the join happens in `finalize`:

    ```python
    outer_init = next(
        (c for c in node.get_children() if c.kind == CursorKind.INIT_LIST_EXPR),
        None,
    )
    if outer_init is None:
        return
    file_name = Path(node.location.file.name).name if node.location.file else ""
    for elem in outer_init.get_children():
        init = elem
        if elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    init = ch
                    break
        if init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        fields = list(init.get_children())
        if len(fields) < 3:
            continue
        cmdname = strip_quotes(read_extent(self._source_bytes, fields[0].extent).strip())
        if not cmdname:
            continue
        description = strip_quotes(read_extent(self._source_bytes, fields[1].extent).strip())
        handler_fn = resolve_fn_ref(fields[2])  # function name spelling
        key = ("teamplay_message", cmdname)
        if key in self._seen_in_file:
            continue
        self._seen_in_file.add(key)
        self._rows.append({
            "_kind": "_table_row",
            "kind": "teamplay_message",
            "name": cmdname,
            "value_text": description,
            "source_ref": f"{file_name}:{init.location.line}",
            "ruleset_gate_json": {},                 # universal per F13
            "props_json": {
                "description":           description,            # duplicate of value_text per Pass 5.4.9
                "handler_function":      handler_fn,             # joined to _fn_def in finalize
                "source_ref_handler":    None,                   # filled by finalize
                "harvested_description": None,                   # filled by finalize via Pattern 9
            },
        })
    ```

  - `end_file() -> list[dict]`: return `self._rows`, clear per-file accumulators (`self._rows = []`, `self._seen_in_file = set()`, `self._seen_fns_in_file = set()`). Merge any per-file unresolved-macro tracking into a handler-level set for finalize.

  - `finalize(*, all_rows: list[dict] | dict, repo_root: Path) -> dict`:

    ```python
    # Driver convention varies: walk_tu_dispatch may pass a dict
    # ({handler.name: rows}) or a flat list. Handle both.
    if isinstance(all_rows, dict):
        rows = all_rows.get(self.name, [])
    else:
        rows = all_rows

    # Partition by _kind.
    fn_descriptions: dict[str, str] = {}        # fn_name -> description (None ok)
    fn_source_refs: dict[str, str] = {}         # fn_name -> source_ref_handler
    table_rows: list[dict] = []
    for r in rows:
        k = r.get("_kind")
        if k == "_fn_def":
            fn_name = r["fn_name"]
            # First-non-None-wins on description; first-wins on source_ref.
            if fn_name not in fn_descriptions:
                fn_descriptions[fn_name] = r.get("description")
                fn_source_refs[fn_name] = r.get("source_ref_handler", "")
            else:
                if fn_descriptions[fn_name] is None and r.get("description"):
                    fn_descriptions[fn_name] = r["description"]
        elif k == "_table_row":
            table_rows.append(r)

    # Cross-file first-wins by (kind, name). The KTX TU's #include closure
    # makes any one .c file's struct-array literal visible from many TU walks;
    # finalize collapses to the canonical row.
    seen_keys: set[tuple[str, str]] = set()
    by_kind: dict[str, list[dict]] = {
        "monster": [], "score_system": [], "drop_item": [],
        "loc_macro": [], "teamplay_message": [],
    }
    for r in table_rows:
        kind, name = r["kind"], r["name"]
        key = (kind, name)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        # Pattern 9 join for teamplay_message: fill harvested_description +
        # source_ref_handler from _fn_def rows.
        if kind == "teamplay_message":
            handler_fn = r["props_json"].get("handler_function")
            if handler_fn:
                r["props_json"]["harvested_description"] = fn_descriptions.get(handler_fn)
                r["props_json"]["source_ref_handler"] = fn_source_refs.get(handler_fn) or None
        by_kind[kind].append(_strip_internal_keys(r))

    # Stable sort each kind by name.
    for k in by_kind:
        by_kind[k].sort(key=lambda r: r["name"])

    # Score_system positions-length-10 invariant audit.
    score_violations = [
        (r["name"], len(r["props_json"]["positions"]))
        for r in by_kind["score_system"]
        if len(r["props_json"]["positions"]) != 10
    ]

    stats = {
        "monster":         {"count": len(by_kind["monster"]),         "expected": 13},
        "score_system":    {"count": len(by_kind["score_system"]),    "expected": 3,
                            "positions_length_violations": score_violations},
        "drop_item":       {"count": len(by_kind["drop_item"]),       "expected": 31,
                            "unresolved_macros": sorted(self._stat_unresolved_drop_macros)},
        "loc_macro":       {"count": len(by_kind["loc_macro"]),       "expected": 15},
        "teamplay_message":{"count": len(by_kind["teamplay_message"]),"expected": 21,
                            "with_harvested_description":
                              sum(1 for r in by_kind["teamplay_message"]
                                  if r["props_json"].get("harvested_description"))},
    }
    return {
        "monsters":          by_kind["monster"],
        "score_systems":     by_kind["score_system"],
        "drop_items":        by_kind["drop_item"],
        "loc_macros":        by_kind["loc_macro"],
        "teamplay_messages": by_kind["teamplay_message"],
        "_stats":            stats,
    }
    ```

    `_strip_internal_keys(r)` returns a shallow-copy of the row with the `_kind` field removed (so the JSON output doesn't carry the partition tag).

- [ ] Run a syntax sanity pass:
  ```bash
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_gameplay_tables import KtxGameplayTablesHandler; print('ok')"
  ```
  Expected: prints `ok` (clean import; no syntax errors; no missing names).

**Verification:**
- `test -f apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py` exits 0.
- The above import probe prints `ok`.
- `grep -nE "^class .*\(Visitor\):" apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py | grep -c "KtxGameplayTablesHandler"` returns `1` (single class, inherits from Visitor only per D3).
- `grep -n "from _handler_" apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py` returns 0 matches (no parent-project subclassing per D3 cross-codebase port rule).
- `grep -nE "_TABLE_TYPE_DISPATCH|_DROPITEM_MACRO_FALLBACK|_DECORATION_RE|_IDENT_RE" apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py | wc -l` returns at least 4 (one per module-level constant).
- PASS condition: file present + clean import + class shape correct + no D3 violations + all module constants present.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet MAX)` -- judgment-dense code synthesis: 5 distinct table walks (Pattern 4) + Pattern 9 banner-comment harvest + handler-private fallback dict for depth-2 macros + cross-stage finalize merge. The handler is the largest single Python file in the arc (~600-750 lines projected); multi-file coupling (Visitor base class + extractor_lib helpers + per-table extraction logic + Pattern 9 join). Sonnet MAX over Sonnet medium is justified by the cross-table state coordination (per-file dedup + cross-file first-wins + Pattern 9 join) and the fallback-dict design choice that needs careful documentation in code so future readers don't accidentally remove it.

### Task 2: Register `KtxGameplayTablesHandler` in `extract.py`

**Goal:** Add the handler to the KTX driver's `ALL_HANDLERS` dict so `--handlers all` (or `--handlers gameplay_tables`) runs it. Mirrors Phase 3 / Phase 4's handler-registration pattern.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/extract.py` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/extractors/ktx/extract.py`. Locate the `ALL_HANDLERS` dict (Phase 2 registered the four Pass-1 handlers; Phase 3 registers `MODES`; Phase 4 registers `GAMEPLAY_TAXONOMIES`).

- [ ] Add the `GAMEPLAY_TABLES` entry adjacent to the others. The handler instance is constructed with no constructor args; `setup()` is called by the driver post-fork with `ktx_repo` + `ktx_src`.

  ```python
  from _handler_gameplay_tables import KtxGameplayTablesHandler

  ALL_HANDLERS: dict[str, type[Visitor]] = {
      # ... Phase-2 entries ...
      # ... Phase-3 modes entry ...
      # ... Phase-4 taxonomies entry ...
      "gameplay_tables": KtxGameplayTablesHandler,
  }
  ```

  The exact local-import shape may vary by what Phase 2 / Phase 3 / Phase 4 establish; mirror their pattern. If Phase 4's `GAMEPLAY_TAXONOMIES` import uses a `try/except ImportError` guard, do the same here.

- [ ] Confirm the driver's per-handler dispatch (`--handlers <name>` CLI arg) works with the new entry. Run:
  ```bash
  python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --help
  ```
  Expected: `gameplay_tables` appears in the handler-name list.

**Verification:**
- `grep -n "gameplay_tables\|KtxGameplayTablesHandler" apps/qw-oracle/scripts/extractors/ktx/extract.py` returns at least 2 matches (import + ALL_HANDLERS entry).
- PASS condition: handler discoverable via `--help`.
- FAIL condition: handler missing from ALL_HANDLERS OR `--help` runs into an import error.

**Execution mode:** `inline` -- two-line additions to an existing file with the literal new content shipped above.

### Task 3: Author `apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts`

**Goal:** Ship the TS loader that reads `ktx-gameplay-tables-ast.json` and idempotently UPSERTs all five row arrays into the right home tables (monsters into `gameplay_entity_defs`, the other four into `gameplay_mechanics`). Mirrors Phase 4's `load-gameplay-taxonomies.ts` shape with five-kind dispatch and a load-side score_system positions-length-10 invariant gate (F10).

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts` (created)

**Steps:**

- [ ] Create the file with the following content shape (D14 JSONB binding via `tx.json(...)` everywhere; D15 idempotent UPSERT keyed on `(gameplay_source_id, kind, name, ruleset_gate_json)`):

  ```ts
  // Loader for KTX gameplay-tables rows (monster + score_system + drop_item +
  // loc_macro + teamplay_message). Reads the AST JSON produced by
  // _handler_gameplay_tables.py and idempotently UPSERTs each kind into its
  // home table:
  //   monster          -> gameplay_entity_defs (kind='monster')
  //   score_system     -> gameplay_mechanics    (kind='score_system')
  //   drop_item        -> gameplay_mechanics    (kind='drop_item')
  //   loc_macro        -> gameplay_mechanics    (kind='loc_macro')
  //   teamplay_message -> gameplay_mechanics    (kind='teamplay_message')
  //
  // D14 JSONB binding: every JSONB column passes its JS value via
  // tx.json(...). NEVER pre-stringify.
  // D15 idempotent: ON CONFLICT (gameplay_source_id, kind, name,
  //                              ruleset_gate_json) DO UPDATE; re-run is a no-op.
  // F10 invariant: every score_system row has positions.length === 10.
  // Loader-side fail-fast (throws before transaction commit).

  import { readFileSync } from 'node:fs';
  import type postgres from 'postgres';

  const KTX_GAMEPLAY_SOURCE_ID = 'ktx';

  interface MonsterRow {
    name: string;
    kind: 'monster';
    value_text: string;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: {
      hp_for_kill: number | null;
      armor_for_kill: number | null;
      boss_able: boolean;
      array_position: number;
      is_first_required: boolean;
    };
  }

  interface ScoreSystemRow {
    name: string;
    kind: 'score_system';
    value_text: string;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: {
      positions: number[];               // exactly 10 elements per F10
      completion: number | null;
      beating: number | null;
      dnf_penalty: number | null;
      round_max_diff: number | null;
    };
  }

  interface DropItemRow {
    name: string;
    kind: 'drop_item';
    value_text: string | null;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: {
      drop_token: string;
      spawned_classname: string | null;
      spawnflags_raw: string;
      spawnflags_value: number | null;
      angle_set: boolean;
      spawn_function: string | null;
      related_entity_canonical_id: string | null;
    };
  }

  interface LocMacroRow {
    name: string;
    kind: 'loc_macro';
    value_text: string;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: {
      expansion: string;
      is_identity: boolean;
      category: string;
      related_item: string | null;
    };
  }

  interface TeamplayMessageRow {
    name: string;
    kind: 'teamplay_message';
    value_text: string;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: {
      description: string;
      handler_function: string | null;
      source_ref_handler: string | null;
      harvested_description: string | null;
    };
  }

  export interface TablesAstFile {
    monsters:          MonsterRow[];
    score_systems:     ScoreSystemRow[];
    drop_items:        DropItemRow[];
    loc_macros:        LocMacroRow[];
    teamplay_messages: TeamplayMessageRow[];
    _stats?: Record<string, unknown>;
  }

  export interface LoadTablesResult {
    inserted: { monster: number; score_system: number; drop_item: number; loc_macro: number; teamplay_message: number };
    updated:  { monster: number; score_system: number; drop_item: number; loc_macro: number; teamplay_message: number };
    total:    { monster: number; score_system: number; drop_item: number; loc_macro: number; teamplay_message: number };
  }

  // Canonicalise object key order so the same logical gate always
  // serialises identically. Empty gates collapse to {}. Mirrors
  // load-modes.ts / load-gameplay-taxonomies.ts / load-gameplay.ts patterns.
  function canonicaliseGate(
    gate: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    if (!gate || Object.keys(gate).length === 0) return {};
    const sortedKeys = Object.keys(gate).sort();
    const ordered: Record<string, unknown> = {};
    for (const k of sortedKeys) ordered[k] = gate[k];
    return ordered;
  }

  export async function loadTablesFromArray(
    sql: postgres.Sql,
    ast: TablesAstFile,
  ): Promise<LoadTablesResult> {
    const result: LoadTablesResult = {
      inserted: { monster: 0, score_system: 0, drop_item: 0, loc_macro: 0, teamplay_message: 0 },
      updated:  { monster: 0, score_system: 0, drop_item: 0, loc_macro: 0, teamplay_message: 0 },
      total:    { monster: 0, score_system: 0, drop_item: 0, loc_macro: 0, teamplay_message: 0 },
    };

    // Precondition: gameplay_sources['ktx'] row must exist (Phase 1 Task 5).
    const sourceRows = await sql<{ id: string }[]>`
      SELECT id FROM gameplay_sources WHERE id = ${KTX_GAMEPLAY_SOURCE_ID}
    `;
    if (sourceRows.length === 0) {
      throw new Error(
        `gameplay_sources row 'ktx' not found. Phase 1 Task 5 must run before ` +
        `load-gameplay-tables. See ` +
        `docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md.`,
      );
    }

    // F10 pre-flight: validate positions-length-10 invariant on every
    // score_system row BEFORE opening the transaction. Fail-fast prevents
    // partially-loaded state.
    for (const row of ast.score_systems ?? []) {
      const len = Array.isArray(row.props_json?.positions)
        ? row.props_json.positions.length
        : -1;
      if (len !== 10) {
        throw new Error(
          `load-gameplay-tables: F10 invariant violation -- score_system ` +
          `row '${row.name}' has positions.length=${len}, expected 10. ` +
          `Re-extract; do not bypass.`,
        );
      }
    }

    await sql.begin(async (tx) => {
      // monster rows -> gameplay_entity_defs. Expected count: 13 (F9).
      for (const row of ast.monsters ?? []) {
        const gateJson = canonicaliseGate(row.ruleset_gate_json ?? {});
        const propsJson = row.props_json ?? {};
        const existsRows = await tx<{ one: number }[]>`
          SELECT 1 AS one FROM gameplay_entity_defs
          WHERE gameplay_source_id = ${KTX_GAMEPLAY_SOURCE_ID}
            AND kind = ${row.kind}
            AND name = ${row.name}
            AND ruleset_gate_json = ${tx.json(gateJson as never)}
        `;
        const wasExisting = existsRows.length > 0;
        await tx`
          INSERT INTO gameplay_entity_defs (
            gameplay_source_id, kind, name, classname,
            damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
            pickup_amount, max_carry, duration_seconds,
            ruleset_gate_json, source_ref, props_json, notes
          ) VALUES (
            ${KTX_GAMEPLAY_SOURCE_ID}, ${row.kind}, ${row.name}, ${row.value_text ?? null},
            ${null}, ${null}, ${null}, ${null}, ${null},
            ${null}, ${null}, ${null},
            ${tx.json(gateJson as never)}, ${row.source_ref}, ${tx.json(propsJson as never)}, ${null}
          )
          ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
            classname        = EXCLUDED.classname,
            damage           = EXCLUDED.damage,
            splash_damage    = EXCLUDED.splash_damage,
            splash_radius    = EXCLUDED.splash_radius,
            refire_seconds   = EXCLUDED.refire_seconds,
            respawn_seconds  = EXCLUDED.respawn_seconds,
            pickup_amount    = EXCLUDED.pickup_amount,
            max_carry        = EXCLUDED.max_carry,
            duration_seconds = EXCLUDED.duration_seconds,
            source_ref       = EXCLUDED.source_ref,
            props_json       = EXCLUDED.props_json,
            notes            = EXCLUDED.notes
        `;
        if (wasExisting) result.updated.monster++;
        else result.inserted.monster++;
        result.total.monster++;
      }

      // score_system / drop_item / loc_macro / teamplay_message all land in
      // gameplay_mechanics; same UPSERT shape, different row arrays. Iterate
      // through all four kind groups via a shared helper.
      const mechanicsKindGroups: Array<[
        'score_system' | 'drop_item' | 'loc_macro' | 'teamplay_message',
        ScoreSystemRow[] | DropItemRow[] | LocMacroRow[] | TeamplayMessageRow[],
      ]> = [
        ['score_system',     ast.score_systems     ?? []],
        ['drop_item',        ast.drop_items        ?? []],
        ['loc_macro',        ast.loc_macros        ?? []],
        ['teamplay_message', ast.teamplay_messages ?? []],
      ];
      for (const [kindLabel, rows] of mechanicsKindGroups) {
        for (const row of rows) {
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
          if (wasExisting) result.updated[kindLabel]++;
          else result.inserted[kindLabel]++;
          result.total[kindLabel]++;
        }
      }
    });

    // Hard count gates (F9 / F10 / F11 / F12 / F13 anchors). Sub-anchor counts
    // trigger fail-fast so a regressed handler doesn't silently land short
    // rows. Note F11 anchor amends from 30 -> 31 per drafter source-walk
    // (see Open Questions); the gate uses the live-source value.
    const failures: string[] = [];
    if (result.total.monster < 13) failures.push(`monster=${result.total.monster}<13 (F9)`);
    if (result.total.score_system < 3) failures.push(`score_system=${result.total.score_system}<3 (F10)`);
    if (result.total.drop_item < 31) failures.push(`drop_item=${result.total.drop_item}<31 (F11 amended)`);
    if (result.total.loc_macro < 15) failures.push(`loc_macro=${result.total.loc_macro}<15 (F12)`);
    if (result.total.teamplay_message < 21) failures.push(`teamplay_message=${result.total.teamplay_message}<21 (F13)`);
    if (failures.length) {
      throw new Error(`load-gameplay-tables: count gates failed: ${failures.join('; ')}`);
    }

    return result;
  }

  export async function loadTablesFromFile(
    sql: postgres.Sql,
    jsonPath: string,
  ): Promise<LoadTablesResult> {
    const ast = JSON.parse(readFileSync(jsonPath, 'utf-8')) as TablesAstFile;
    return loadTablesFromArray(sql, ast);
  }
  ```

- [ ] Document the loader's contract at module top: idempotent UPSERT; cross-table dispatch (entity_defs vs mechanics); D14 JSONB binding everywhere; F10 fail-fast for positions-length; precondition is Phase 1's `gameplay_sources['ktx']` row + Phase 1's gameplay-kind widening migration.

**Verification:**
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts` exits 0 (clean TS compile).
- `grep -n "JSON.stringify" apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts | wc -l` returns `0` (no D14-violating pre-stringify; per `feedback_substring_not_regex_fingerprinting.md`, the substring is the load-bearing fingerprint).
- `grep -nE "ON CONFLICT \(gameplay_source_id, kind, name, ruleset_gate_json\)" apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts | wc -l` returns at least 2 (one for monster -> entity_defs, one for the mechanics-kinds shared loop).
- `grep -n "F10 invariant violation" apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts` returns at least 1 match.
- `grep -n "KTX_GAMEPLAY_SOURCE_ID" apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts | wc -l` returns at least 4 (precondition check + monster UPSERT + mechanics loop + value bind).
- PASS condition: clean compile + JSONB binding correct + both UPSERT shapes present + F10 gate present + precondition check present.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across one new TS file mirroring an existing analog (load-gameplay-taxonomies.ts) plus AST-JSON consumption shape and a cross-table dispatch. Mechanical implementation requiring reasoning (clear spec, one file, ~280 lines).

### Task 4: Wire `load-ktx-gameplay-tables` subcommand in `index.ts`

**Goal:** Surface the loader on the CLI so `bun scripts/load-knowledge --help` lists it and `bun scripts/load-knowledge load-ktx-gameplay-tables --json <path>` runs it. Mirrors Phase 3 / Phase 4's subcommand registration pattern.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/index.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/index.ts`. Locate the subcommand-dispatch block where `load-gameplay`, (post-Phase-3) `load-ktx-modes`, and (post-Phase-4) `load-ktx-taxonomies` are registered. Add adjacent dispatch:

  ```ts
  if (subcommand === 'load-ktx-gameplay-tables')   { await runLoadKtxGameplayTables(rest); return; }
  ```

- [ ] Add the help-text line in the usage printer:

  ```
    load-ktx-gameplay-tables [--json <path>]
  ```

- [ ] Implement `runLoadKtxGameplayTables(args: string[]): Promise<void>` adjacent to the existing `runLoadKtxModes` / `runLoadKtxTaxonomies` wrappers:

  ```ts
  async function runLoadKtxGameplayTables(args: string[]): Promise<void> {
    const jsonPath = parseArgValue(args, '--json') ?? defaultGameplayTablesJsonPath();
    const sql = await connect();
    try {
      const { loadTablesFromFile } = await import('./load-gameplay-tables.js');
      const r = await loadTablesFromFile(sql, jsonPath);
      console.log(
        `load-ktx-gameplay-tables: ` +
        `monster total=${r.total.monster}, ` +
        `score_system total=${r.total.score_system}, ` +
        `drop_item total=${r.total.drop_item}, ` +
        `loc_macro total=${r.total.loc_macro}, ` +
        `teamplay_message total=${r.total.teamplay_message}`,
      );
      const fail: string[] = [];
      if (r.total.monster < 13) fail.push(`monster=${r.total.monster}<13`);
      if (r.total.score_system < 3) fail.push(`score_system=${r.total.score_system}<3`);
      if (r.total.drop_item < 31) fail.push(`drop_item=${r.total.drop_item}<31`);
      if (r.total.loc_macro < 15) fail.push(`loc_macro=${r.total.loc_macro}<15`);
      if (r.total.teamplay_message < 21) fail.push(`teamplay_message=${r.total.teamplay_message}<21`);
      if (fail.length) {
        console.error(
          `load-ktx-gameplay-tables: STOP - count below F-anchors (${fail.join(', ')}). ` +
          `Re-run extraction.`,
        );
        process.exitCode = 2;
      }
    } finally {
      await sql.end();
    }
  }

  function defaultGameplayTablesJsonPath(): string {
    return join(
      MONOREPO_ROOT,
      'apps', 'qw-oracle', 'scripts', 'extractors', 'ktx', 'output',
      'ktx-gameplay-tables-ast.json',
    );
  }
  ```

  The `parseArgValue`, `connect`, `MONOREPO_ROOT`, `join` references already exist in `index.ts`; reuse them.

**Verification:**
- `bun apps/qw-oracle/scripts/load-knowledge/index.ts --help` lists `load-ktx-gameplay-tables [--json <path>]`.
- `grep -n "load-ktx-gameplay-tables\|runLoadKtxGameplayTables\|loadTablesFromFile" apps/qw-oracle/scripts/load-knowledge/index.ts | wc -l` returns at least 4 (dispatch + help + function definition + dynamic import).
- PASS condition: subcommand discoverable via --help + dispatches without runtime error on a missing JSON path.
- FAIL condition: subcommand absent OR runtime error inside the wrapper.

**Execution mode:** `inline` -- targeted multi-line additions to an existing file with full new content shipped above; no logic the drafter hasn't already specified.

### Task 5: Wire load-gameplay-tables into the per-tag pipeline in `extract-tag.ts`

**Goal:** When `extractTag()` runs for `project='ktx'`, after the entity-loader loop and after Phase 3 / Phase 4's loader hooks, also call `loadTablesFromFile` so a single `extract-tag --project ktx --version <tag>` invocation lands ALL KTX rows (Pass-1 entity rows + Phase-3 modes + Phase-4 taxonomies + Phase-5 tables) atomically. Mirrors Phase 4's pipeline-hook pattern.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`. Locate the per-project post-entity-loader block (post-Phase-4 it should have a KTX-modes-load step from Phase 3 + a KTX-taxonomies-load step from Phase 4).

- [ ] Add a project-conditional KTX-tables load step adjacent to the existing KTX hooks:

  ```ts
  // Phase 5 (KTX onboarding): load monster + score_system + drop_item +
  // loc_macro + teamplay_message rows from _handler_gameplay_tables.py's
  // ktx-gameplay-tables-ast.json. Idempotent UPSERT; safe to re-run.
  // F10 invariant: every score_system row has positions.length === 10.
  // Loader-side fail-fast on violation.
  if (options.project === 'ktx') {
    const tablesJsonPath = join(extractorOutputDir, 'ktx-gameplay-tables-ast.json');
    if (existsSync(tablesJsonPath)) {
      const { loadTablesFromFile } = await import('./load-gameplay-tables.js');
      const tablesResult = await loadTablesFromFile(options.sql, tablesJsonPath);
      console.log(
        `[extract-tag] ktx tables loaded: ` +
        `monster=${tablesResult.total.monster}, ` +
        `score_system=${tablesResult.total.score_system}, ` +
        `drop_item=${tablesResult.total.drop_item}, ` +
        `loc_macro=${tablesResult.total.loc_macro}, ` +
        `teamplay_message=${tablesResult.total.teamplay_message}`,
      );
    } else {
      console.warn(
        `[extract-tag] ktx-gameplay-tables-ast.json missing at ${tablesJsonPath}; ` +
        `skipping tables loading. Re-run extract-tag once Phase 5 ships if this is unexpected.`,
      );
    }
  }
  ```

- [ ] The `existsSync` check makes this hook safe to land BEFORE the gameplay-tables handler is exercised end-to-end: if the JSON is absent, the call is skipped with a warning. Once `--handlers all` runs the gameplay-tables handler, the JSON appears and the load step kicks in.

**Verification:**
- `grep -n "ktx-gameplay-tables-ast.json\|loadTablesFromFile" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts | wc -l` returns at least 2.
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` exits 0.
- PASS condition: hook present + clean compile.
- FAIL condition: hook missing OR compile error.

**Execution mode:** `inline` -- one block-add to an existing file with full content shipped above.

### Task 6: Author `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_tables.py`

**Goal:** Land a pytest-shaped sanity test that runs the handler end-to-end against the live KTX repo, then asserts:
1. Monster count = 13 (F9 anchor).
2. Score_system count = 3 (F10 anchor).
3. Score_system positions length = 10 for every row (F10 invariant).
4. Drop_item count = 31 (F11 amended anchor).
5. Loc_macro count = 15 (F12 anchor).
6. Teamplay_message count = 21 (F13 anchor).
7. Monster index 0 is `monster_fish` with `is_first_required=True` (FISH _MUST_ BE _FIRST_ per source comment).
8. Monster `monster_shambler` has `boss_able=True`.
9. Score_system `formula1` has positions `[25,18,15,12,10,8,6,4,2,1]` (Formula1 verbatim).
10. Drop_item `h15` has `spawnflags_value=1` (H_ROTTEN resolved via fallback dict).
11. Drop_item `h100` has `spawnflags_value=2` (H_MEGA resolved via fallback dict).
12. Drop_item `sh40` has `spawnflags_value=1` (WEAPON_BIG2 resolved via Phase 1 lift).
13. Drop_item `sp_dm` has `spawn_function='dropitem_spawn_spawnpoint'`.
14. Loc_macro `mh` has `value_text='mega'` and `is_identity=False`.
15. Loc_macro `separator` has `value_text='-'` and `is_identity=False`.
16. Teamplay_message `yesok` has `handler_function='TeamplayYesOk'` AND a non-None `harvested_description` (Pattern 9 join).
17. All score_system / drop_item / loc_macro / teamplay_message rows have `ruleset_gate_json={}`; all monster rows have `ruleset_gate_json={"mode":"bloodfest"}`; all score_system rows have `ruleset_gate_json={"mode":"race"}`.

The test exercises the live KTX repo if cloned at `research/repos/ktx/`; if absent, skips with documented reason.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_tables.py` (created)

**Steps:**

- [ ] Ensure the parent test directory exists (idempotent; Phase 3 / Phase 4 may have created it):
  ```bash
  mkdir -p apps/qw-oracle/scripts/extractors/ktx/tests/
  ```

- [ ] Create the file with pytest fixtures + 17 test cases per the goals above. Mirror the shape of Phase 4's `tests/test_handler_gameplay_taxonomies.py` -- same imports, same skip-if-repo-absent guard, same parse-via-clang_args helper. Concrete shape:

  ```python
  """Phase 5 sanity test: verifies KtxGameplayTablesHandler produces F9/F10/F11/F12/F13 anchors."""
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
      pytest.skip(
          f"KTX repo not at {KTX_REPO}; clone it to run these tests.",
          allow_module_level=True,
      )

  from clang.cindex import Config, Index
  Config.set_library_file("libclang-18.so.1")

  from extractor_lib.clang_config import PARSE_OPTS, clang_args_ktx_for  # Phase 2 ships this
  from extractor_lib._visitor import walk_tu_dispatch
  from _handler_gameplay_tables import KtxGameplayTablesHandler


  TARGET_FILES = [
      KTX_REPO / "src" / "sp_monsters.c",  # bloodfest_monster_array[]
      KTX_REPO / "src" / "race.c",         # scoring_systems[]
      KTX_REPO / "src" / "commands.c",     # dropitems[]
      KTX_REPO / "src" / "teamplay.c",     # locmacros[] + messages[] + handler fn definitions
  ]


  @pytest.fixture(scope="module")
  def handler_with_outputs():
      handler = KtxGameplayTablesHandler()
      handler.setup(ktx_repo=KTX_REPO, ktx_src=KTX_REPO / "src")

      idx = Index.create()
      args = clang_args_ktx_for(str(KTX_REPO / "src"))

      all_rows: list[dict] = []
      for target_path in TARGET_FILES:
          tu = idx.parse(str(target_path), args=args, options=PARSE_OPTS)
          source_bytes = target_path.read_bytes()
          handler.start_file(source_path=target_path, source_bytes=source_bytes)
          walk_tu_dispatch(tu, [handler], "server", str(target_path))
          all_rows.extend(handler.end_file())

      result = handler.finalize(all_rows={handler.name: all_rows}, repo_root=KTX_REPO)
      return handler, result


  def test_monster_count_13(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["monsters"]) == 13, (
          f"Expected 13 monster rows (F9); got {len(result['monsters'])}"
      )


  def test_score_system_count_3(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["score_systems"]) == 3, (
          f"Expected 3 score_system rows (F10); got {len(result['score_systems'])}"
      )


  def test_score_system_positions_length_10(handler_with_outputs):
      _, result = handler_with_outputs
      bad = [
          (r["name"], len(r["props_json"]["positions"]))
          for r in result["score_systems"]
          if len(r["props_json"]["positions"]) != 10
      ]
      assert bad == [], (
          f"F10 invariant: every score_system row must have positions.length=10; "
          f"violations: {bad}"
      )


  def test_drop_item_count_31(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["drop_items"]) == 31, (
          f"Expected 31 drop_item rows (F11 amended; live source); "
          f"got {len(result['drop_items'])}"
      )


  def test_loc_macro_count_15(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["loc_macros"]) == 15, (
          f"Expected 15 loc_macro rows (F12); got {len(result['loc_macros'])}"
      )


  def test_teamplay_message_count_21(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["teamplay_messages"]) == 21, (
          f"Expected 21 teamplay_message rows (F13); "
          f"got {len(result['teamplay_messages'])}"
      )


  def test_monster_fish_first_required(handler_with_outputs):
      _, result = handler_with_outputs
      fish = next(
          (r for r in result["monsters"] if r["name"] == "monster_fish"),
          None,
      )
      assert fish is not None, "monster_fish row must exist (F9 anchor)"
      assert fish["props_json"]["array_position"] == 0, (
          f"monster_fish must be array_position=0 (FISH _MUST_ BE _FIRST_); "
          f"got {fish['props_json']['array_position']}"
      )
      assert fish["props_json"]["is_first_required"] is True, (
          f"monster_fish.is_first_required must be True; got "
          f"{fish['props_json']['is_first_required']}"
      )


  def test_monster_shambler_boss_able(handler_with_outputs):
      _, result = handler_with_outputs
      sham = next(
          (r for r in result["monsters"] if r["name"] == "monster_shambler"),
          None,
      )
      assert sham is not None, "monster_shambler row must exist"
      assert sham["props_json"]["boss_able"] is True, (
          f"monster_shambler.boss_able must be True (only true entry per "
          f"sp_monsters.c source-walk); got {sham['props_json']['boss_able']}"
      )


  def test_score_system_formula1_positions(handler_with_outputs):
      _, result = handler_with_outputs
      f1 = next(
          (r for r in result["score_systems"] if r["name"] == "formula1"),
          None,
      )
      assert f1 is not None, "formula1 score_system row must exist"
      assert f1["props_json"]["positions"] == [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], (
          f"formula1.positions must be Formula1 payouts; got "
          f"{f1['props_json']['positions']}"
      )


  def test_drop_item_h15_h_rotten(handler_with_outputs):
      _, result = handler_with_outputs
      h15 = next(
          (r for r in result["drop_items"] if r["name"] == "h15"),
          None,
      )
      assert h15 is not None, "h15 drop_item row must exist"
      assert h15["props_json"]["spawnflags_value"] == 1, (
          f"h15.spawnflags_value must resolve H_ROTTEN to 1 via fallback dict; "
          f"got {h15['props_json']['spawnflags_value']}. If None, the "
          f"_DROPITEM_MACRO_FALLBACK dict is missing the H_ROTTEN entry OR "
          f"the macro spelling does not match."
      )


  def test_drop_item_h100_h_mega(handler_with_outputs):
      _, result = handler_with_outputs
      h100 = next(
          (r for r in result["drop_items"] if r["name"] == "h100"),
          None,
      )
      assert h100 is not None, "h100 drop_item row must exist"
      assert h100["props_json"]["spawnflags_value"] == 2, (
          f"h100.spawnflags_value must resolve H_MEGA to 2 via fallback dict; "
          f"got {h100['props_json']['spawnflags_value']}"
      )


  def test_drop_item_sh40_weapon_big2(handler_with_outputs):
      _, result = handler_with_outputs
      sh40 = next(
          (r for r in result["drop_items"] if r["name"] == "sh40"),
          None,
      )
      assert sh40 is not None, "sh40 drop_item row must exist"
      assert sh40["props_json"]["spawnflags_value"] == 1, (
          f"sh40.spawnflags_value must resolve WEAPON_BIG2 to 1 via Phase 1's "
          f"depth-1 Pattern 6 lift (commands.c:9053 -- same-file); got "
          f"{sh40['props_json']['spawnflags_value']}. If None, the depth-1 "
          f"lift is broken or self.file_macros isn't being threaded into the "
          f"handler."
      )


  def test_drop_item_sp_dm_spawn_function(handler_with_outputs):
      _, result = handler_with_outputs
      sp_dm = next(
          (r for r in result["drop_items"] if r["name"] == "sp_dm"),
          None,
      )
      assert sp_dm is not None, "sp_dm drop_item row must exist"
      assert sp_dm["props_json"]["spawn_function"] == "dropitem_spawn_spawnpoint", (
          f"sp_dm.spawn_function must resolve to 'dropitem_spawn_spawnpoint' "
          f"per commands.c:9075-9108; got {sp_dm['props_json']['spawn_function']}"
      )


  def test_loc_macro_mh_non_identity(handler_with_outputs):
      _, result = handler_with_outputs
      mh = next(
          (r for r in result["loc_macros"] if r["name"] == "mh"),
          None,
      )
      assert mh is not None, "mh loc_macro row must exist"
      assert mh["value_text"] == "mega", f"mh.value_text must be 'mega'; got {mh['value_text']}"
      assert mh["props_json"]["is_identity"] is False, (
          f"mh.is_identity must be False (mh -> mega is non-identity); got "
          f"{mh['props_json']['is_identity']}"
      )


  def test_loc_macro_separator_non_identity(handler_with_outputs):
      _, result = handler_with_outputs
      sep = next(
          (r for r in result["loc_macros"] if r["name"] == "separator"),
          None,
      )
      assert sep is not None, "separator loc_macro row must exist"
      assert sep["value_text"] == "-", f"separator.value_text must be '-'; got {sep['value_text']}"
      assert sep["props_json"]["is_identity"] is False, (
          f"separator.is_identity must be False; got "
          f"{sep['props_json']['is_identity']}"
      )


  def test_teamplay_yesok_handler_and_banner(handler_with_outputs):
      _, result = handler_with_outputs
      yesok = next(
          (r for r in result["teamplay_messages"] if r["name"] == "yesok"),
          None,
      )
      assert yesok is not None, "yesok teamplay_message row must exist"
      assert yesok["props_json"]["handler_function"] == "TeamplayYesOk", (
          f"yesok.handler_function must be 'TeamplayYesOk'; got "
          f"{yesok['props_json']['handler_function']}"
      )
      # harvested_description may be None if the handler function has no
      # banner block; F13's anchor states Pattern 9 harvest is best-effort.
      # The test allows None but logs a warning if all 21 rows have None.
      # No hard fail here -- the load-side probe (Probe 14) reports coverage.


  def test_ruleset_gate_invariants(handler_with_outputs):
      _, result = handler_with_outputs
      # Monsters: every row has {"mode":"bloodfest"}.
      bad_m = [r for r in result["monsters"]
               if r["ruleset_gate_json"] != {"mode": "bloodfest"}]
      assert bad_m == [], f"All monster rows must gate on bloodfest; bad: {[r['name'] for r in bad_m]}"
      # Score_systems: every row has {"mode":"race"}.
      bad_s = [r for r in result["score_systems"]
               if r["ruleset_gate_json"] != {"mode": "race"}]
      assert bad_s == [], f"All score_system rows must gate on race; bad: {[r['name'] for r in bad_s]}"
      # Drop_item / loc_macro / teamplay_message: empty gates.
      for kind in ("drop_items", "loc_macros", "teamplay_messages"):
          bad = [r for r in result[kind] if r["ruleset_gate_json"] != {}]
          assert bad == [], (
              f"All {kind} rows must have ruleset_gate_json={{}}; bad: "
              f"{[r['name'] for r in bad]}"
          )
  ```

- [ ] Run the test file: `cd apps/qw-oracle/scripts/extractors/ktx && python3 -m pytest tests/test_handler_gameplay_tables.py -v`. All test cases pass (or skip with documented reason if repo absent).

**Verification:**
- `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_tables.py -v` exits 0 with all assertions green.
- PASS condition: pytest pass.
- FAIL condition: any assertion fails (skip with no documented reason is also fail).

**Execution mode:** `subagent (Sonnet medium)` -- new test file with 17 assertions; implementation requires running the handler end-to-end across 4 .c files and shaping pytest fixtures correctly. Mechanical given the spec but benefits from subagent isolation (libclang + multi-file handler walk + pytest interplay is non-trivial).

### Task 7: Per-row verification probes

**Goal:** Verify the rows landed in dev DB match F9 / F10 / F11 / F12 / F13 anchors AND the JSONB-binding regression gate (D14) passes. SQL probes; YES/NO answers per D16.

**Files:** none modified; transient SELECT queries against the dev DB.

**Steps:**

- [ ] Run the monster count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_entity_defs
    WHERE gameplay_source_id = 'ktx' AND kind = 'monster'"
  ```
  Expected: `13` (F9 anchor; exact match required).

- [ ] Run the score_system count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'score_system'"
  ```
  Expected: `3` (F10 anchor; exact match required).

- [ ] Run the drop_item count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'drop_item'"
  ```
  Expected: `31` (F11 amended anchor; exact match required).

- [ ] Run the loc_macro count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'loc_macro'"
  ```
  Expected: `15` (F12 anchor; exact match required).

- [ ] Run the teamplay_message count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'teamplay_message'"
  ```
  Expected: `21` (F13 anchor; exact match required).

- [ ] Run the score_system positions-length-10 invariant probe (F10):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, jsonb_array_length(props_json->'positions') AS plen
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'score_system'"
  ```
  Expected: 3 rows, every `plen` value = `10`. PASS condition: every row has plen=10. FAIL condition: any row has plen != 10. CRITICAL: F10 invariant violation should have been caught at load-side fail-fast; if a row landed with plen != 10 the loader gate is broken.

- [ ] Run the monster bloodfest-gate probe (F9):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_entity_defs
    WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
      AND ruleset_gate_json = '{\"mode\":\"bloodfest\"}'::jsonb"
  ```
  Expected: `13` (every monster row gates on bloodfest).

- [ ] Run the score_system race-gate probe (F10):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'score_system'
      AND ruleset_gate_json = '{\"mode\":\"race\"}'::jsonb"
  ```
  Expected: `3` (every score_system row gates on race).

- [ ] Run the universal-gate probe for the other three kinds (F11 / F12 / F13):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT kind, count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('drop_item', 'loc_macro', 'teamplay_message')
      AND ruleset_gate_json != '{}'::jsonb
    GROUP BY 1"
  ```
  Expected: 0 rows. PASS condition: empty result. FAIL condition: any rows. (drop_item / loc_macro / teamplay_message must all gate universally.)

- [ ] Run the monster_fish array-position invariant probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, props_json->>'array_position' AS pos,
           props_json->>'is_first_required' AS first_req
    FROM gameplay_entity_defs
    WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
      AND name = 'monster_fish'"
  ```
  Expected: 1 row -- `monster_fish | 0 | true`.

- [ ] Run the drop_item macro-resolution probe (F11 amendment validation):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, props_json->>'spawnflags_raw' AS raw,
           props_json->>'spawnflags_value' AS val
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'drop_item'
      AND name IN ('h15', 'h25', 'h100', 'sh40', 'p')
    ORDER BY name"
  ```
  Expected: 5 rows --
  - `h100 | H_MEGA       | 2`     (resolved via _DROPITEM_MACRO_FALLBACK)
  - `h15  | H_ROTTEN     | 1`     (resolved via _DROPITEM_MACRO_FALLBACK)
  - `h25  | 0            | 0`     (literal int)
  - `p    | 0            | 0`     (literal int)
  - `sh40 | WEAPON_BIG2  | 1`     (resolved via Phase 1 depth-1 Pattern 6 lift)

  PASS condition: every row's `val` is non-NULL AND matches the expected resolved integer. FAIL condition: any `val` is NULL (resolution gap). If h15 / h100 are NULL: `_DROPITEM_MACRO_FALLBACK` is broken. If sh40 is NULL: Phase 1's depth-1 lift isn't reaching commands.c's same-file `#define WEAPON_BIG2 1`.

- [ ] Run the drop_item spawn_function probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, props_json->>'spawn_function' AS fn
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'drop_item'
      AND props_json->>'spawn_function' IS NOT NULL
    ORDER BY name"
  ```
  Expected: 5 rows --
  - `sp_b   | dropitem_spawn_spawnpoint`
  - `sp_cp  | dropitem_spawn_spawnpoint`
  - `sp_dm  | dropitem_spawn_spawnpoint`
  - `sp_r   | dropitem_spawn_spawnpoint`
  - `sp_sp  | dropitem_spawn_spawnpoint`

  PASS condition: 5 rows, all sp_* spawnpoints resolve to `dropitem_spawn_spawnpoint`. FAIL condition: row count != 5 OR any `fn` is NULL or wrong.

- [ ] Run the drop_item related_entity_canonical_id FK-join probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) AS unmatched
    FROM gameplay_mechanics di
    WHERE di.gameplay_source_id = 'ktx' AND di.kind = 'drop_item'
      AND di.props_json->>'related_entity_canonical_id' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM gameplay_entity_defs ed
        WHERE ed.gameplay_source_id = 'id1'
          AND ed.classname = di.props_json->>'spawned_classname'
      )"
  ```
  Expected: a small non-zero count is acceptable -- not every drop_item maps to an id1 baseline (e.g., `info_player_team1`, `item_flag_team1` are id1 baseline classnames but not necessarily seeded as `gameplay_entity_defs` rows in id1-gameplay.yaml). This probe surfaces match coverage; record the actual count for the audit trail. PASS condition: most (>=20 of ~26 weapon/item rows) match. FAIL condition: 0 matches (handler emitted wrong classnames OR id1 baseline is empty).

  Operator-driven follow-up: if coverage is significantly worse than expected, surface as a HANDOVER sidequest -- "expand id1-gameplay.yaml to cover spawnpoints + flags" -- not a Phase 5 fix.

- [ ] Run the teamplay_message Pattern 9 banner-coverage probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      count(*) FILTER (WHERE props_json->>'harvested_description' IS NOT NULL) AS with_banner,
      count(*) AS total
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'teamplay_message'"
  ```
  Expected: `total = 21`; `with_banner` is best-effort (Pattern 9 harvest fires only when the handler function has a banner block). MVDSV's coverage was 26-28% (~6 of 21); KTX teamplay handlers may have higher coverage if more carry banners. PASS condition: total = 21 AND with_banner > 0 (at least some banners harvested -- if 0, Pattern 9 implementation is broken). FAIL condition: total != 21 (count regression) OR with_banner == 0 (Pattern 9 broken).

- [ ] Run the JSONB-binding regression probe (D14):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      'gameplay_entity_defs' AS tbl,
      jsonb_typeof(ruleset_gate_json) AS gate_type,
      jsonb_typeof(props_json)        AS props_type,
      count(*)
    FROM gameplay_entity_defs
    WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
    GROUP BY 1, 2, 3
    UNION ALL
    SELECT
      'gameplay_mechanics' AS tbl,
      jsonb_typeof(ruleset_gate_json) AS gate_type,
      jsonb_typeof(props_json)        AS props_type,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('score_system', 'drop_item', 'loc_macro', 'teamplay_message')
    GROUP BY 1, 2, 3"
  ```
  Expected: every group has `gate_type='object'` AND `props_type='object'`. NEVER `'string'`. CRITICAL FAIL on any string -> the legacy stringify bug landed.

- [ ] Run the idempotency probe (re-run loader):
  ```bash
  bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-gameplay-tables
  ```
  After the first load, the next run reports 0 inserted, 13 updated for monster, 0 inserted, 3 updated for score_system, etc. Counts unchanged from first load.

  Idempotency probe SQL (run BEFORE and AFTER the second load; counts must match):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT 'monster' AS k, count(*) FROM gameplay_entity_defs
    WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
    UNION ALL
    SELECT kind, count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('score_system', 'drop_item', 'loc_macro', 'teamplay_message')
    GROUP BY 1
    ORDER BY 1"
  ```
  Pre-second-load count == Post-second-load count.

**Verification:**
- All 14 probes return expected results.
- PASS condition: counts match anchors + score_system positions invariant + monster_fish first + drop_item macro resolution + spawn_function mapping + Pattern 9 banner coverage + JSONB binding all `object` + idempotency holds.
- FAIL condition: any probe deviates.

**Execution mode:** `inline` -- pure SQL probes shipped above; the operator (or executor) copy-pastes into psql; no logic, no reasoning.

### Task 8: Amend `review-findings.md` with F9 / F11 source-walk findings

**Goal:** Land the F9 + F11 amendments per the drafter source-walk so the audit trail captures the spec-vs-source corrections. Ships in the same commit as the Phase 5 code per D16 (phase atomicity).

**Files:**
- `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` (modified)

**Steps:**

- [ ] Append an amendment block to F9's section (after the existing Anchors block):

  ```markdown
  **Amendment 2026-05-05 (Phase 5 drafter source-walk):** F9's locked `props_json` shape lists `count_per_wave` as the first numeric field name. Live source at `sp_monsters.c:48-52` (canonical 1.46) shows `bloodfest_monster_t.hp_for_kill` (with comment "how much hp player gains for killing such monster") -- a per-kill HP bonus to the player, NOT a monster spawn count. The spec name does not describe what the field stores. Per D9 source-fidelity and F9's own stated principle ("Field-name-fidelity matters for downstream consumers; lock `<source name>` as the props_json key"), the canonical key amends to `hp_for_kill`. Phase 5's handler ships the source-fidelity name; the headline "13 monsters" anchor stands. If operator prefers F9's literal `count_per_wave`, the swap is a one-line handler change before execution. The struct-field-2 correction (`armor_for_kill`) from the original F9 amendment stands; this amendment adds the field-1 correction.
  ```

- [ ] Append an amendment block to F11's section:

  ```markdown
  **Amendment 2026-05-05 (Phase 5 drafter source-walk):** Two corrections at canonical 1.46 (master HEAD):
  (a) Row count: 30 -> 31. Live `dropitems[]` at `commands.c:9075-9108` contains 31 entries (h15, h25, h100, ga, ya, ra, ssg, ng, sng, gl, rl, lg, sh20, sh40, sp25, sp50, ro5, ro10, ce6, ce12, p, s, r, q, fl_r, fl_b, sp_r, sp_b, sp_dm, sp_cp, sp_sp). The +1 vs Pass 5.4's anchor is `sp_sp -> info_player_start` (single-player spawnpoint variant); functionally a peer of the other sp_* entries. Phase 5 verification probes assert `count = 31`.
  (b) Macro location: F11 says "H_ROTTEN, H_MEGA, WEAPON_BIG2 (defined in g_local.h and commands.c:9053)". Live source: `H_ROTTEN` and `H_MEGA` are defined at `include/g_consts.h:241-242` (depth-2 from commands.c via `g_local.h`); `WEAPON_BIG2` IS at commands.c:9053 (same-file). Phase 1's depth-1 Pattern 6 lift reaches g_local.h's macros (depth-1 from commands.c) but NOT g_consts.h's (depth-2). Phase 5's handler resolves `WEAPON_BIG2` via Phase 1's lift and falls back to a handler-private 2-entry frozen dict (`{H_ROTTEN: 1, H_MEGA: 2}`) for the depth-2 macros. Values verified at canonical 1.46 against include/g_consts.h:241 (1) and include/g_consts.h:242 (2). The fallback dict is documented in code as a Phase 5 design choice; alternatives the operator may prefer (D4 amendment to depth-N walk; project-private allowlist of headers; lift Pattern 6 to multi-hop) are surfaced in Phase 5's Open Questions.
  ```

- [ ] Update the "Phase ownership of findings" table at the bottom of `review-findings.md`: Phase 5 row should read `F9 (13 monsters; armor_for_kill name; hp_for_kill amendment), F10 (3 score_systems; positions length=10 invariant), F11 (31 drop_items amended; 5-field struct; H_ROTTEN/H_MEGA depth-2 fallback), F12 (15 loc_macros), F13 (21 teamplay_messages; Pattern 9 harvest)`.

**Verification:**
- `grep -n "Amendment 2026-05-05 (Phase 5 drafter" docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md | wc -l` returns at least 2 (one for F9, one for F11).
- `grep -n "31 drop_items" docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` returns at least 1 (Phase 5 row in the ownership table).
- PASS condition: both amendments present + ownership row updated.
- FAIL condition: amendments missing OR ownership row stale.

**Execution mode:** `inline` -- pure markdown edits to one file with full content shipped above.

### Task 9: Single commit landing all Phase 5 changes

**Goal:** Commit Phase 5 as one coherent unit per D16 (phase atomicity). Per D20: directly to `main`, no PR ceremony.

**Files:** all the above (creates + modifies).

**Steps:**

- [ ] Stage the new + modified files:
  ```bash
  git add apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py \
          apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_tables.py \
          apps/qw-oracle/scripts/extractors/ktx/extract.py \
          apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts \
          apps/qw-oracle/scripts/load-knowledge/index.ts \
          apps/qw-oracle/scripts/load-knowledge/extract-tag.ts \
          docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-5-tables-handler.md \
          docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md \
          docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
  ```

- [ ] `git commit` with message:
  ```
  arc(ktx): Phase 5 -- gameplay tables handler (monster + score_system + drop_item + loc_macro + teamplay_message)

  KTX Group-B struct-array gameplay-content lands as Layer 1 rows. One handler,
  five tables, two patterns:

  Pattern 4 (INIT_LIST_EXPR walks on struct-array literals) for all five:
  - bloodfest_monster_array[] @ sp_monsters.c:60-76 -> 13 monster rows
  - scoring_systems[] @ race.c:5148-5160 -> 3 score_system rows
  - dropitems[] @ commands.c:9075-9108 -> 31 drop_item rows (F11 amended +1)
  - locmacros[] @ teamplay.c:1491-1508 -> 15 loc_macro rows
  - messages[] @ teamplay.c:1645-1668 -> 21 teamplay_message rows

  Pattern 9 (function-banner harvest, ported from MVDSV's _handler_commands.py):
  - Per teamplay_message handler function (TeamplayYesOk, TeamplayNoCancel, ...),
    walk back from FUNCTION_DECL to the immediately preceding /* === Title === */
    block and harvest the description body. Joined into props_json.harvested_description
    via two-row emission (_table_row + _fn_def) at finalize time.

  Field-name corrections per drafter source-walk (review-findings amendments):
  - F9: monster props_json.count_per_wave -> hp_for_kill (source-fidelity per D9;
    field stores per-kill HP bonus, not spawn count). armor_for_kill stands.
  - F11: drop_item count 30 -> 31 (sp_sp -> info_player_start added since Pass 5.4).
    H_ROTTEN/H_MEGA live in include/g_consts.h (depth-2 from commands.c), not
    g_local.h. Phase 1's depth-1 lift handles WEAPON_BIG2 (same-file). Handler-
    private _DROPITEM_MACRO_FALLBACK = {H_ROTTEN: 1, H_MEGA: 2} resolves the
    depth-2 macros; values verified against include/g_consts.h:241-242.

  Output: ktx-gameplay-tables-ast.json with monsters[] (13) + score_systems[] (3) +
  drop_items[] (31) + loc_macros[] (15) + teamplay_messages[] (21) + _stats block.

  Loader:
  - load-gameplay-tables.ts (postgres-js) idempotently UPSERTs each kind into
    its home table (monster -> gameplay_entity_defs; other 4 -> gameplay_mechanics)
    on (gameplay_source_id='ktx', kind, name, ruleset_gate_json).
  - JSONB binding via tx.json(...) (D14). Default gates per F9-F13:
    monster -> {"mode":"bloodfest"}; score_system -> {"mode":"race"};
    drop_item / loc_macro / teamplay_message -> {} (universal).
  - F10 fail-fast: every score_system row's positions array must have exactly
    10 elements; throw before transaction commit on violation.
  - Hard-fail count gates: monster >= 13 (F9), score_system >= 3 (F10),
    drop_item >= 31 (F11 amended), loc_macro >= 15 (F12), teamplay_message >= 21 (F13).
  - Precondition check: gameplay_sources['ktx'] row must exist (Phase 1 Task 5).

  Wiring:
  - apps/qw-oracle/scripts/extractors/ktx/extract.py registers
    KtxGameplayTablesHandler in ALL_HANDLERS.
  - apps/qw-oracle/scripts/load-knowledge/index.ts adds load-ktx-gameplay-tables
    subcommand.
  - apps/qw-oracle/scripts/load-knowledge/extract-tag.ts calls
    loadTablesFromFile after the entity loaders for project='ktx'
    (existsSync-guarded, safe re-runs).

  Tests:
  - tests/test_handler_gameplay_tables.py runs the handler end-to-end across 4
    target .c files and asserts F9/F10/F11(amended)/F12/F13 anchors + per-row
    invariants (monster_fish first, monster_shambler boss_able, formula1
    positions [25,18,15,12,10,8,6,4,2,1], drop_item macro resolution for h15
    /h100/sh40, sp_dm spawn_function, mh/separator non-identity, yesok handler
    function, gate invariants per kind).

  All 5 Group-B kinds queryable in dev DB. Phase 6 (XSD-driven match_event
  handler) is independent at the data level; can ship in parallel.

  Resolves: F9 (monster count + hp_for_kill amendment), F10 (score_system count
  + positions length invariant), F11 (drop_item count amended + macro depth-2
  fallback), F12 (loc_macro count), F13 (teamplay_message count + Pattern 9
  harvest).
  ```

- [ ] Update `docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md` -- the phase index Status column for Phase 5 changes from `not started` to `drafted (awaiting review)` at draft time, then to `approved` -> `in execution` -> `shipped` per the operator review cadence. The "Where we are right now" block at the top updates to reflect Phase 5 sign-off.

- [ ] Push to origin per the project's git workflow.

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status` is clean (working tree matches HEAD).
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes after the commit OR git push fails.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at the end of Phase 5. All probes return YES/NO answers:

**1. Handler file present + imports clean.**

```bash
test -f apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py && \
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_gameplay_tables import KtxGameplayTablesHandler; print('ok')"
```
- PASS condition: prints `ok`.
- FAIL condition: ImportError or file-missing.

**2. Loader file present + clean compile.**

```bash
test -f apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts && \
  bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts
```
- PASS condition: tsc exits 0.
- FAIL condition: tsc errors.

**3. Pytest sanity test passes.**

```bash
cd apps/qw-oracle/scripts/extractors/ktx && \
  python3 -m pytest tests/test_handler_gameplay_tables.py -v
```
- PASS condition: pytest exits 0; all 17 test cases pass.
- FAIL condition: any test case fails.

**4. monster count = 13 (F9 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_entity_defs
  WHERE gameplay_source_id = 'ktx' AND kind = 'monster'"
```
- PASS condition: returns `13`.
- FAIL condition: anything else.

**5. score_system count = 3 (F10 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'score_system'"
```
- PASS condition: returns `3`.
- FAIL condition: anything else.

**6. drop_item count = 31 (F11 amended anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'drop_item'"
```
- PASS condition: returns `31`.
- FAIL condition: anything else (30 indicates the +1 entry was missed; 32+ indicates over-emit).

**7. loc_macro count = 15 (F12 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'loc_macro'"
```
- PASS condition: returns `15`.
- FAIL condition: anything else.

**8. teamplay_message count = 21 (F13 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'teamplay_message'"
```
- PASS condition: returns `21`.
- FAIL condition: anything else.

**9. score_system positions length = 10 invariant (F10).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'score_system'
    AND jsonb_array_length(props_json->'positions') = 10"
```
- PASS condition: returns `3` (every row honors the invariant).
- FAIL condition: returns less than 3. CRITICAL: F10 invariant violation -- the loader's pre-flight gate should have prevented landing.

**10. ruleset_gate_json invariants per kind.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT 'monster' AS k, count(*) FROM gameplay_entity_defs
  WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
    AND ruleset_gate_json = '{\"mode\":\"bloodfest\"}'::jsonb
  UNION ALL
  SELECT 'score_system', count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'score_system'
    AND ruleset_gate_json = '{\"mode\":\"race\"}'::jsonb
  UNION ALL
  SELECT 'universal-other', count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('drop_item', 'loc_macro', 'teamplay_message')
    AND ruleset_gate_json = '{}'::jsonb
  ORDER BY 1"
```
- PASS condition: 3 rows -- `monster | 13`, `score_system | 3`, `universal-other | 67` (31+15+21 = 67).
- FAIL condition: any count short of expected.

**11. drop_item macro resolution (F11 amendment validation).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT name, props_json->>'spawnflags_value' AS val
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'drop_item'
    AND name IN ('h15', 'h100', 'sh40')
  ORDER BY name"
```
- PASS condition: 3 rows -- `h100 | 2` (H_MEGA), `h15 | 1` (H_ROTTEN), `sh40 | 1` (WEAPON_BIG2).
- FAIL condition: any value is NULL or wrong. NULL on h15/h100 -> _DROPITEM_MACRO_FALLBACK is broken. NULL on sh40 -> Phase 1's depth-1 lift isn't reaching commands.c's same-file `#define WEAPON_BIG2 1`.

**12. drop_item spawn_function for sp_* entries.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'drop_item'
    AND props_json->>'spawn_function' = 'dropitem_spawn_spawnpoint'"
```
- PASS condition: returns `5` (sp_r, sp_b, sp_dm, sp_cp, sp_sp all spawnpoint-resolved).
- FAIL condition: anything other than 5.

**13. monster_fish array_position invariant.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT props_json->>'array_position' AS pos,
         props_json->>'is_first_required' AS first_req
  FROM gameplay_entity_defs
  WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
    AND name = 'monster_fish'"
```
- PASS condition: `0 | true` (one row).
- FAIL condition: row missing OR pos != 0 OR first_req != true (FISH _MUST_ BE _FIRST_ source comment violation).

**14. teamplay_message Pattern 9 banner-coverage.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT
    count(*) FILTER (WHERE props_json->>'harvested_description' IS NOT NULL) AS with_banner,
    count(*) AS total
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'teamplay_message'"
```
- PASS condition: total = 21 AND with_banner > 0 (at least one banner harvested; MVDSV's coverage was 26-28%, KTX's may differ but must be non-zero or Pattern 9 is broken).
- FAIL condition: total != 21 OR with_banner == 0.

**15. JSONB-binding regression gate (D14).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT
    'gameplay_entity_defs' AS tbl, jsonb_typeof(ruleset_gate_json) AS gate, jsonb_typeof(props_json) AS props, count(*)
  FROM gameplay_entity_defs WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
  GROUP BY 1, 2, 3
  UNION ALL
  SELECT
    'gameplay_mechanics' AS tbl, jsonb_typeof(ruleset_gate_json) AS gate, jsonb_typeof(props_json) AS props, count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind IN ('score_system', 'drop_item', 'loc_macro', 'teamplay_message')
  GROUP BY 1, 2, 3"
```
- PASS condition: every row has `gate='object'` AND `props='object'`.
- FAIL condition: any row has `gate='string'` OR `props='string'`. CRITICAL: legacy SQLite-era stringify bug per D14.

**16. Idempotent re-run.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_entity_defs WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
  UNION ALL
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('score_system', 'drop_item', 'loc_macro', 'teamplay_message')" > /tmp/phase5_count_a.txt
bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-gameplay-tables
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_entity_defs WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
  UNION ALL
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('score_system', 'drop_item', 'loc_macro', 'teamplay_message')" > /tmp/phase5_count_b.txt
diff /tmp/phase5_count_a.txt /tmp/phase5_count_b.txt
```
- PASS condition: `diff` is empty.
- FAIL condition: counts differ -> ON CONFLICT clause is missing or mis-keyed.

**17. Phase 5 commit landed cleanly.**

```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 5; `git status --short` is empty.
- FAIL condition: latest commit is something else OR working tree has uncommitted residuals.

If all 17 probes pass, Phase 5 is done. Phase 6 (XSD-driven match_event handler) is independent at the data level; can draft / execute in parallel after this. If any probe fails, see `## Recovery` below.

## Outputs to next phase

After Phase 5 ships, the following hold:

- `gameplay_entity_defs` carries 13 `kind='monster'` rows (all `gameplay_source_id='ktx'`, all `ruleset_gate_json={"mode":"bloodfest"}`).
- `gameplay_mechanics` carries 3 `kind='score_system'` rows (race-gated), 31 `kind='drop_item'` rows (universal), 15 `kind='loc_macro'` rows (universal), and 21 `kind='teamplay_message'` rows (universal); all `gameplay_source_id='ktx'`.
- All five Group-B kinds queryable in dev DB. Cross-namespace queries are possible. E.g.:
  ```sql
  -- "What KTX monsters can spawn as bosses?"
  SELECT name FROM gameplay_entity_defs
  WHERE gameplay_source_id = 'ktx' AND kind = 'monster'
    AND (props_json->>'boss_able')::boolean = true;

  -- "What's the per-position payout for the Formula1 race scoring system?"
  SELECT props_json->'positions' AS payouts
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'score_system' AND name = 'formula1';

  -- "Which KTX drop_items map to id1 weapon entities?"
  SELECT di.name, di.props_json->>'spawned_classname' AS classname
  FROM gameplay_mechanics di
  WHERE di.gameplay_source_id = 'ktx' AND di.kind = 'drop_item'
    AND di.props_json->>'spawned_classname' LIKE 'weapon_%'
  ORDER BY 1;

  -- "All KTX teamplay messages with banner-harvested descriptions"
  SELECT name, props_json->>'description' AS short_label,
         props_json->>'harvested_description' AS full_description
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'teamplay_message'
    AND props_json->>'harvested_description' IS NOT NULL
  ORDER BY 1;
  ```
- `_handler_gameplay_tables.py` is registered in the KTX driver and runs as part of `--handlers all`. The output JSON `ktx-gameplay-tables-ast.json` is regenerated on every per-tag extraction.
- `load-gameplay-tables.ts` is wired into both the standalone `load-ktx-gameplay-tables` subcommand AND the per-tag pipeline in `extract-tag.ts` (project=ktx). Re-running `extract-tag --project ktx --version <tag>` brings Pass-1 entity rows + Phase-3 modes + Phase-4 taxonomies + Phase-5 tables up to date in one shot.
- Phase 6 (XSD-driven match_event handler) is ready to start. It consumes the same `gameplay_source_id='ktx'` and writes to a different table (`match_event_versions` -- new in Phase 1's migration 009). No row-key collision with Phase 5 rows.
- Phase 7's validation runbook will gain Phase-5 entries for the F1 quality grid: per-kind counts (monster=13, score_system=3, drop_item=31, loc_macro=15, teamplay_message=21), JSONB-typeof regression gate, score_system positions-length invariant, drop_item macro-resolution coverage, Pattern 9 banner-coverage report.
- Pattern 9 (banner-comment harvest) now has TWO consumers in the codebase: MVDSV's `_handler_commands.py` (commands surface) and KTX's `_handler_gameplay_tables.py` (teamplay_message surface). The Rule of Second Consumer is now triggered: Phase 8 should evaluate lifting `_function_banner` + `_DECORATION_RE` + `_IDENT_RE` to `extractor_lib._source` (or a new `_banner.py`) so future handlers don't copy-paste the implementation.

## Open questions / deferred items

- **Question:** F9's locked `props_json` shape lists `count_per_wave` as the first numeric field name. Live source-walk against `sp_monsters.c:48-52` (canonical 1.46) shows the source field is named `hp_for_kill` (with comment "how much hp player gains for killing such monster") -- a per-kill HP bonus to the player, NOT a monster spawn count. The spec's `count_per_wave` name does not describe what the field stores. Per D9 source-fidelity (and F9's own stated principle "Field-name-fidelity matters for downstream consumers; lock `<source name>` as the props_json key"), the canonical key should be `hp_for_kill`.
  **Default chosen for now:** ship with the source-fidelity name `hp_for_kill`; surface as F9 amendment in `review-findings.md` (Task 8). The handler change is one-line if operator prefers F9's literal `count_per_wave`.
  **Who can resolve:** operator at Phase 5 review time -- confirm the F9 amendment OR direct the drafter to revert to `count_per_wave` before execution.

- **Question:** Drafter source-walk shows `dropitems[]` has 31 entries at canonical 1.46 (master HEAD), not 30 as F11 anchored. The +1 entry is `sp_sp -> info_player_start`. Likely cause: an addition between Pass 5.4 author's checkout and master HEAD (verifiable with `git log` against `commands.c`).
  **Default chosen for now:** ship with the live count of 31; surface as F11 amendment in `review-findings.md` (Task 8). Loader's count gate uses 31; phase-boundary Probe 6 asserts 31.
  **Who can resolve:** operator at Phase 5 review time. If the operator prefers to lock to 30 and skip sp_sp, surface the rationale; the handler can filter on a hardcoded skip list. Default-for-now is to capture every source entry.

- **Question:** F11's anchor states "H_ROTTEN, H_MEGA, WEAPON_BIG2 (defined in g_local.h and commands.c:9053)". Live source-walk shows H_ROTTEN and H_MEGA are at `include/g_consts.h:241-242` (depth-2 from commands.c via `g_local.h`); only WEAPON_BIG2 is at commands.c:9053 (same-file). Phase 1's depth-1 Pattern 6 lift reaches g_local.h's macros (depth-1) but NOT g_consts.h's (depth-2). The Phase 5 handler's `_DROPITEM_MACRO_FALLBACK = {"H_ROTTEN": 1, "H_MEGA": 2}` is the chosen workaround.
  **Default chosen for now:** ship the handler-private fallback dict (2 entries, frozen, values verified at canonical 1.46). The fallback is documented in code with a Phase-5-rationale comment so future readers don't accidentally remove it. Alternative paths the operator may prefer:
    (a) Amend D4 to depth-N (or depth-2 specifically) -- relifts `extractor_lib._source.collect_file_macros`, broader scope, future-proofs against any depth-2 macro pressure across all engines. Cost: re-implements Phase 1's lift; slight parse-time tax.
    (b) Project-private include allowlist -- handler explicitly walks a small set of KTX headers (g_consts.h, deathtype.h) by adding their MACRO_DEFINITION cursors to a private map. Mid-cost; mid-clean.
    (c) Hardcode the fallback (status quo for Phase 5). Cheapest; KTX-private; cost is the documentation overhead so future tags adding new depth-2 macros are noticed.
  **Who can resolve:** operator at Phase 5 review time. Default-for-now (option c) is ready to ship; operator can flip to (a) or (b) before execution if preferred.

- **Question:** F11's `props_json.related_entity_canonical_id` field is "qw:gameplay_entity_def:<classname>" per Pass 5.4.7's spec, joining drop_item rows to id1 baseline `gameplay_entity_defs` rows for the underlying item. Phase-boundary Probe 11 surfaces match coverage. Some classnames (e.g., `info_player_team1`, `item_flag_team1`) ARE id1 baseline entity surfaces but may not be seeded in `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` if the seed was scoped to weapons + items + projectiles only (per `load-gameplay.ts:120` which iterates `weapons`, `projectiles`, `items` only).
  **Default chosen for now:** Phase 5's handler emits the canonical_id string regardless of whether the join target exists. The loader does NOT enforce FK existence (the field is in props_json, not a literal FK column). Phase-boundary Probe 11 reports the coverage count for the audit trail. If coverage is significantly worse than expected (>5 unmatched), operator may surface a HANDOVER sidequest to expand id1-gameplay.yaml with spawnpoints + flag entities; that is OUT OF SCOPE for this arc.
  **Who can resolve:** operator post-execution. Phase 5 ships the as-extracted state; the FK-coverage gap is an id1-baseline-seed concern, not a KTX onboarding concern.

- **Question:** `_function_banner` + `_DECORATION_RE` + `_IDENT_RE` are now consumed by two handlers (MVDSV's `_handler_commands.py` and KTX's `_handler_gameplay_tables.py`). The Rule of Second Consumer (per `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`'s three-tier handler architecture) says: lift to Tier 2 (`extractor_lib/_*.py` or `extractor_lib/handler_<family>_<type>.py`) on second consumer. Should Phase 5 lift Pattern 9 to `extractor_lib._banner` or copy-and-adapt for now?
  **Default chosen for now:** copy-and-adapt within the KTX handler (cheaper, contained). Surface as a Phase 8 EXTRACTOR-PLAYBOOK amendment + sidequest candidate: "Lift Pattern 9 (`_function_banner`) to `extractor_lib._banner` per Rule of Second Consumer" -- runs as a separate refactor arc post-KTX. Mid-arc lift would balloon Phase 5's scope beyond the table-handler unit-of-work.
  **Who can resolve:** operator at end-of-arc (Phase 8) or as a follow-up arc.

- **Question:** The handler's per-file dispatch reads four target .c files (`sp_monsters.c`, `race.c`, `commands.c`, `teamplay.c`) sequentially. Phase 4's handler reads zero target .c files (TU-root cursor intercept on any include closure). Phase 5's handler reads four. Should the KTX driver's per-handler file-allowlist mechanism be extended to constrain Phase 5's scan to those four files only?
  **Default chosen for now:** no; let the driver run the full file set (`--handlers gameplay_tables` walks every .c file in the source tree). The handler's per-table dispatch (`_TABLE_TYPE_DISPATCH`) early-exits on unrelated VAR_DECLs, and the per-file `_seen_in_file` dedup absorbs cross-file visibility. Cost: a few extra TU walks; benefit: zero handler-driver coupling (the handler doesn't need to know its source-file scope ahead of time). If extraction time becomes a concern, surface as a runtime-perf followup.
  **Who can resolve:** Phase 5 executor or operator post-execution -- not blocking.

- **Question:** Phase 1's planned migration filenames (008/009/010 in the design spec) collide with `008_community_schema.sql` already in the live tree (commit `af7f5b5b`). Phase 1's executor renumbers; Phase 5 references the migration by FUNCTION (admits 5 new gameplay-kinds), not by number.
  **Default chosen for now:** Phase 5 references the migration by what it does. Phase 1's executor adjusts numbering; Phase 5's expectations are stable.
  **Who can resolve:** Phase 1 executor (during execution; not a Phase 5 concern).

## Recovery (if verification fails)

- **Probe 1 fails (handler import error):** read the Python error. Most likely causes: `from extractor_lib._visitor import Visitor` path fails because `sys.path.insert` is wrong; OR the handler imports a parent-project handler (D3 violation); OR the handler imports `resolve_fn_ref` from `extractor_lib._resolve` and the function rename/move broke the import (cross-check with MVDSV's `_handler_commands.py`).

- **Probe 2 fails (TS compile error):** read the tsc error. Most likely causes: missing import for `postgres` types; a `tx.json(...)` cast TypeScript rejects; the type union of `ScoreSystemRow | DropItemRow | LocMacroRow | TeamplayMessageRow` in the mechanics-loop doesn't compile (use `| any` cast or split into per-kind loops).

- **Probe 3 fails (pytest test fails):** read the test failure. The 17 test cases cover distinct facets:
  - `test_monster_count_13` fails: handler missed entries OR over-emitted. Inspect `_stats.monster.count`.
  - `test_score_system_count_3` fails: handler missed entries OR over-emitted. Inspect `_stats.score_system.count`.
  - `test_score_system_positions_length_10` fails: F10 invariant violation -- one or more rows have positions array length != 10. Either the source struct shape changed OR the handler's INIT_LIST_EXPR walk on the nested array is broken.
  - `test_drop_item_count_31` fails with N != 31: live source row count drifted from 31 OR handler missed/over-emitted. If N=30, the +1 entry (sp_sp) wasn't extracted (struct-init-padding for trailing function pointer might trip the field-count guard `len(fields) < 2`).
  - `test_loc_macro_count_15` / `test_teamplay_message_count_21` fail: handler missed entries.
  - `test_monster_fish_first_required` fails: source-order significance broken; INIT_LIST_EXPR walk doesn't preserve element order (libclang preserves order; if this fails, the handler's enumerate() is wrong).
  - `test_drop_item_h15_h_rotten` / `test_drop_item_h100_h_mega` fail: `_DROPITEM_MACRO_FALLBACK` dict missing the entry OR `_resolve_spawnflags` doesn't consult the fallback.
  - `test_drop_item_sh40_weapon_big2` fails: Phase 1's depth-1 lift isn't reaching commands.c's same-file `#define WEAPON_BIG2 1`. CRITICAL: this would mean Phase 1's lift is broken at depth-0 (same-file), not just depth-2.
  - `test_drop_item_sp_dm_spawn_function` fails: `resolve_fn_ref(fields[4])` doesn't resolve the function pointer to its name. Inspect MVDSV's analogous resolve_fn_ref usage in `_handler_commands.py:150` for the working pattern.
  - `test_loc_macro_mh_non_identity` / `test_loc_macro_separator_non_identity` fail: handler's `is_identity` computation is wrong.
  - `test_teamplay_yesok_handler_and_banner` fails: handler doesn't extract `handler_function` field (resolve_fn_ref on fields[2] failed) OR Pattern 9 join in finalize is broken.
  - `test_ruleset_gate_invariants` fails: handler's per-kind gate population is wrong.

- **Probe 4 fails (monster count != 13):** if too low, handler missed entries -- inspect `_stats.monster.count` and the live `bloodfest_monster_array[]` size. If too high, dedup is broken.

- **Probe 5 fails (score_system count != 3):** similar to Probe 4 for score_system.

- **Probe 6 fails (drop_item count != 31):** if 30, the +1 entry (sp_sp) wasn't extracted. Most likely cause: struct-init field-count guard rejected the row because field 4 (function pointer) is NULL/absent. Relax the guard to `len(fields) < 2` (only require name + classname) and treat trailing fields as optional.

- **Probe 7 fails (loc_macro count != 15):** similar to Probe 4.

- **Probe 8 fails (teamplay_message count != 21):** similar to Probe 4.

- **Probe 9 fails (positions length invariant):** F10 violation. The loader's pre-flight gate should have prevented landing; if rows are in DB with violations, the gate is broken. Inspect `loadTablesFromArray`'s pre-flight loop.

- **Probe 10 fails (gate invariants per kind):** handler's per-kind gate population is wrong. Each `_extract_*` method must emit `ruleset_gate_json` matching the F-anchor. Inspect the lock-table per kind (monster -> bloodfest, score_system -> race, others -> {}).

- **Probe 11 fails (drop_item macro resolution NULL):** if h15 / h100 NULL: `_DROPITEM_MACRO_FALLBACK` is broken or missing. If sh40 NULL: Phase 1's depth-1 lift isn't reaching commands.c's same-file macros. Re-grep the handler for `_DROPITEM_MACRO_FALLBACK` and `self.file_macros` references; ensure both lookup paths fire in `_resolve_spawnflags`.

- **Probe 12 fails (sp_* spawn_function count != 5):** `resolve_fn_ref` is failing on field 4 of the dropitem row. The function pointer is a DECL_REF_EXPR or wraps in UNEXPOSED_EXPR; the resolver may need recursive descent (similar to MVDSV's `_resolve_*` family in `_handler_qc_builtins.py`). Inspect the AST shape with a one-shot dump: `cursor.get_children()` on a sp_dm row's INIT_LIST_EXPR to see what the function-pointer field looks like.

- **Probe 13 fails (monster_fish array_position):** handler's enumerate() loop isn't preserving source order, OR the fish entry is being deduped before reaching index 0. Inspect the handler's per-file dedup; the `(kind, name)` key may collide if two .c files both declare a `monster_fish`-related symbol.

- **Probe 14 fails (Pattern 9 banner-coverage):** `_function_banner` is broken OR the cross-file `_fn_def` join in finalize is mis-keyed. Inspect `_function_banner` against MVDSV's exact same helper at `_handler_commands.py:170-222`. If banner finds NO matches, the regex may be wrong; if banner finds matches but the join in finalize loses them, inspect the `fn_descriptions` dict population.

- **Probe 15 fails (jsonb_typeof returns 'string'):** D14 violation. Per `feedback_repair_by_reextract_not_sql_update.md`, do NOT SQL-UPDATE the affected rows -- fix the loader bug and re-run the load (it's idempotent; the broken rows get overwritten with correctly-shaped JSONB).

- **Probe 16 fails (idempotency violated):** the `ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE` clause is wrong. Most likely cause: the `canonicaliseGate` function returns inconsistent key ordering. Per `feedback_idempotency_before_staleness.md`: inflated row counts on re-run mean re-run idempotency, not stale snapshot.

- **Probe 17 fails (commit missing or working tree dirty):** `git status` to triage; the most likely cause is files were staged but `git commit` failed on a hook. Inspect hook output, fix the underlying issue, re-stage, re-commit.

If any failure resists local recovery, halt and surface to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F9** (monster row count = 13; armor_for_kill name correction). Resolved by Tasks 1 + 3 (handler emits 13 rows from `bloodfest_monster_array[]` walk via Pattern 4; `armor_for_kill` field name source-faithful; loader UPSERTs 13 rows into `gameplay_entity_defs`; Phase-boundary Probe 4 asserts the count). Phase 5 source-walk also surfaces an F9 amendment: the first numeric field is `hp_for_kill` per source, not `count_per_wave` per F9; amendment lands in Task 8. Test cases 1 + 7 + 8 + 17 cover the count + array_position + boss_able + gate invariants.
- **F10** (score_system row count = 3; positions length=10 invariant). Resolved by Tasks 1 + 3 (handler emits 3 rows from `scoring_systems[]` walk via Pattern 4 with nested INIT_LIST_EXPR for positions array; loader-side fail-fast gate validates positions length before transaction commit; Phase-boundary Probes 5 + 9 assert count and invariant). Test cases 2 + 3 + 9 cover the count + length invariant + Formula1 verbatim payouts.
- **F11** (drop_item row count = 30 -> 31 amended; 5-field struct + macro resolution). Resolved by Tasks 1 + 3 + 8 (handler emits 31 rows via Pattern 4 with macro resolution chain: Pattern 6 self.file_macros for WEAPON_BIG2 + handler-private `_DROPITEM_MACRO_FALLBACK` for H_ROTTEN/H_MEGA; loader UPSERTs 31 rows; F11 amendment lands in `review-findings.md` capturing the +1 count drift and the depth-2 macro-location correction; Phase-boundary Probes 6 + 11 + 12 assert count, macro-resolution, and spawn_function). Test cases 4 + 10 + 11 + 12 + 13 cover count + macro resolution + spawn_function.
- **F12** (loc_macro row count = 15). Resolved by Tasks 1 + 3 (handler emits 15 rows from `locmacros[]` walk via Pattern 4; loader UPSERTs 15 rows; Phase-boundary Probe 7 asserts count). Test cases 5 + 14 + 15 cover count + non-identity entries (mh, separator).
- **F13** (teamplay_message row count = 21; Pattern 9 banner harvest). Resolved by Tasks 1 + 3 (handler emits 21 rows from `messages[]` walk via Pattern 4 + Pattern 9 banner-comment harvest for handler-function descriptions; cross-file `_fn_def` join populates `harvested_description`; loader UPSERTs 21 rows; Phase-boundary Probes 8 + 14 assert count and Pattern 9 coverage). Test cases 6 + 16 + 17 cover count + handler_function + harvested_description + gate invariants.

No findings touched by Phase 5 are deferred. F9 / F10 / F11 / F12 / F13 all ship in this phase. F9 + F11 carry audit-trail amendments per the Open Questions.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium, with the brief shape from `phase-template.md`. Specific verification points for Phase 5:

1. **Locked count anchors:** verify the phase MD reproduces F9=13, F10=3, F11=30 (literal anchor; amendment to 31 is documented in Open Questions + Task 8), F12=15, F13=21 EXACTLY. Flag CRITICAL if any anchor count is wrong.
2. **`armor_for_kill` field name:** verify the phase MD uses `armor_for_kill` (not `count_modifier`) per F9's locked principle. Verify the additional `hp_for_kill` field-name amendment is surfaced as an Open Question (not silently overridden).
3. **F10 positions-length-10 invariant:** verify the loader has a pre-flight gate that throws on positions.length !== 10 BEFORE the transaction opens. Flag CRITICAL if the gate is missing or fires after partial-load.
4. **F11 drop_item count amendment:** verify the phase MD uses 31 in the loader gate + verification probes + tests; verify the Open Question surfaces the F11 anchor of 30 as the locked source (not silently amended away).
5. **H_ROTTEN/H_MEGA fallback dict:** verify `_DROPITEM_MACRO_FALLBACK` is a frozen module-level dict with values 1 and 2 (per include/g_consts.h:241-242 source-walk); verify the handler's `_resolve_spawnflags` consults Phase 1's `self.file_macros` BEFORE the fallback (so WEAPON_BIG2 still resolves via Phase 1's lift).
6. **Default gates per kind:** verify the phase MD uses:
   - monster: `{"mode":"bloodfest"}`
   - score_system: `{"mode":"race"}`
   - drop_item / loc_macro / teamplay_message: `{}`
7. **JSONB binding (D14):** verify every JSONB column write uses `tx.json(...)` and there is no `JSON.stringify(...) -> TEXT bind` slip. Flag CRITICAL on any violation.
8. **Pattern 9 banner harvest:** verify `_function_banner`, `_DECORATION_RE`, `_IDENT_RE` are present and ported faithfully from MVDSV's `_handler_commands.py`. Verify the cross-file `_fn_def` join in finalize populates `harvested_description` for teamplay_message rows.
9. **Per-task execution mode:** verify each task declares `inline` or `subagent (<model> <effort>)` per D18. Flag if the handler task is anything cheaper than `subagent (Sonnet medium)`; the spec-grade Sonnet MAX is appropriate for the 5-table handler with Pattern 4 + Pattern 9 + fallback dict design density.
10. **Source-file paths + line ranges:** verify every `research/repos/ktx/src/<file>:<line>:<line>` reference is in-bounds for the file. Specifically: `sp_monsters.c:48-52` (struct), `sp_monsters.c:60-76` (array), `race.c:5137-5145` (struct), `race.c:5148-5160` (array), `commands.c:9044-9051` (struct), `commands.c:9075-9108` (array), `teamplay.c:1485-1489` (struct), `teamplay.c:1491-1508` (array), `teamplay.c:1638-1643` (struct), `teamplay.c:1645-1668` (array), `include/g_consts.h:241-242` (H_ROTTEN/H_MEGA values), `commands.c:9053` (WEAPON_BIG2 #define).
11. **Created-file paths exist as parent dirs:** `apps/qw-oracle/scripts/extractors/ktx/` exists; `apps/qw-oracle/scripts/load-knowledge/` exists; `apps/qw-oracle/scripts/extractors/ktx/tests/` may not exist yet but is created idempotently in Task 6's first step.
12. **Pattern references:** verify the phase MD uses Pattern 4 (INIT_LIST_EXPR walks) and Pattern 9 (function-banner harvest) names correctly per EXTRACTOR-PLAYBOOK.md. Flag if any pattern is mis-named.

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section.
