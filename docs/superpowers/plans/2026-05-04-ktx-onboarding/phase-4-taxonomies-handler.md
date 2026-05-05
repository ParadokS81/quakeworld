# Phase 4 -- Gameplay taxonomies handler (election_type + death_rule)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (F7 + F8 -- see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase (Pass 4.3 + Pass 5.3 + Pass 5.4.3 + Pass 5.4.4).
> 4. Source-walk the relevant KTX header files at `research/repos/ktx/include/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as a template. For the handler, MVDSV's `_handler_protocol.py` is the closest precedent (Pattern 10 -- TU-root cursor intercept on header-defined declarations). Port, do not subclass per D3. For the loader, `load-modes.ts` (Phase 3) is the closest analog (gameplay_mechanics two-kind dispatch on `(gameplay_source_id='ktx', kind, name, ruleset_gate_json)`).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section in `phase-template.md`) before declaring the phase MD ready for operator review.

## Goal

Phase 4 lands KTX's two enum-backed gameplay taxonomies as queryable Layer 1 rows. Two deliverables: (1) `_handler_gameplay_taxonomies.py` -- a libclang-driven handler under `apps/qw-oracle/scripts/extractors/ktx/` with two extraction stages: Stage 1 walks the `electType_t` enum declaration in `include/progs.h` using Pattern 10's TU-root cursor intercept mechanic (Pattern 10 is documented in EXTRACTOR-PLAYBOOK.md for `CursorKind.MACRO_DEFINITION`; this phase widens the cursor-kind filter to include `CursorKind.ENUM_DECL` -- the mechanic is identical, the playbook amendment to broaden Pattern 10's title lands in Phase 8); Stage 2 parses the `include/deathtype.h` X-macro file directly (text regex; not libclang at all) to recover both the dt enum tags and the per-entry string tokens, since the X-macro's second argument is not preserved in the AST after preprocessor expansion. Stage 2 is a distinct extraction technique from Pattern 10 -- Phase 8 lands it as Pattern 16 (X-macro file parse). The handler emits one `ktx-gameplay-taxonomies-ast.json` containing two arrays: 5 election_type rows (skip etNone) + 27 death_rule rows (skip dtNONE / dtUNKNOWN; keep dtCHANGELEVEL with category='structural'); (2) `load-gameplay-taxonomies.ts` -- a postgres-js TS loader that reads the AST JSON and idempotently UPSERTs both arrays into `gameplay_mechanics` keyed on `(gameplay_source_id='ktx', kind, name, ruleset_gate_json)` per D14's JSONB binding rule. All taxonomies rows use `ruleset_gate_json={}` -- elections are subsystem-level (available regardless of active mode), death rules are universal across modes (any mode-restriction lives in `props_json`). Runnable state at boundary: `gameplay_mechanics` holds 5 `kind='election_type'` rows + 27 `kind='death_rule'` rows (all `gameplay_source_id='ktx'`); the qw-event-log validation harness now has a Layer 1 anchor for the WeaponType enum at the schema level.

## Inputs from previous phase

Phase 1 complete:
- Migration 010 (or its renumbered equivalent per Phase 3 Open Question on `008_community_schema.sql` collision; see Phase 1 phase MD for the resolved numbering) widens `gameplay_mechanics.kind` to admit `'election_type'` (D5 / Phase 1 Task 3). The `'death_rule'` kind is already in the v14 CHECK -- 0 widenings needed for it (per Pass 4.3 schema-cost note).
- `gameplay_sources` row for `'ktx'` exists in dev DB (`gameplay_source_id='ktx'`, seeded by Phase 1 Task 5). `load-gameplay-taxonomies.ts` FK-references this row but does not insert it -- treats it as precondition.

Phase 2 complete:
- KTX driver at `apps/qw-oracle/scripts/extractors/ktx/extract.py` exists with the Pass 1 handlers (cvars / commands / info_keys / log_templates) registered in `ALL_HANDLERS`. Phase 4 adds the `TAXONOMIES` handler entry to that dict.
- `apps/qw-oracle/scripts/extractors/ktx/output/` directory exists; the four Pass-1 AST JSONs sit there; Phase 4 writes a sixth (`ktx-gameplay-taxonomies-ast.json`) into the same dir (Phase 3 ships the fifth, `ktx-modes-ast.json`).
- `extract-tag.ts` has KTX dispatch wiring; `PROJECT_EXTRACTOR.ktx` resolves to the KTX driver path; `ENTITY_JSON_FILES.ktx` carries the four Pass-1 entries. Phase 4 does NOT add `election_type`/`death_rule` to that map -- those rows are NOT EntityType-shaped (they target `gameplay_mechanics`, not the entities/per-version surface). The integration point is a separate `load-ktx-taxonomies` subcommand on `apps/qw-oracle/scripts/load-knowledge/index.ts`, mirroring Phase 3's `load-ktx-modes` subcommand.

Phase 3 (modes handler) is independent at the data level -- Phase 4 does not depend on Phase 3 having shipped. Both can draft / execute in parallel after Phase 1 lands.

Plus the prerequisites inherited from Arc 1 (`prerequisites.md`):
- Postgres dev container running and reachable; `bun --version` >= 1.3 in `apps/qw-oracle/`.
- KTX research repo cloned at `research/repos/ktx/`. The handler reads `research/repos/ktx/include/progs.h` (electType_t enum) and `research/repos/ktx/include/deathtype.h` (X-macro file) -- both are part of the KTX source tree and present at any commit.
- libclang 18 + python3-clang available (verified by any prior extractor run).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py
apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py
apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts
```

### Modified

```
apps/qw-oracle/scripts/extractors/ktx/extract.py                # register TAXONOMIES handler in ALL_HANDLERS (file is CREATED by Phase 2; Phase 4 only modifies the ALL_HANDLERS dict)
apps/qw-oracle/scripts/load-knowledge/index.ts                  # add `load-ktx-taxonomies` subcommand + runLoadKtxTaxonomies wrapper
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts            # call load-ktx-taxonomies after the entity loaders for project=ktx (one new step in the per-tag pipeline)
```

Note: `apps/qw-oracle/scripts/extractors/ktx/extract.py` does not exist on `main` at scaffold time (it is created by Phase 2 -- which is approved per `README.md` but not yet executed at scaffold-write time). Phase 4 cannot run until Phase 2 ships. The "Inputs from previous phase" section above already states this explicitly; the dependency holds whether Phase 3 has shipped or not (Phase 4 is independent of Phase 3 at the data level, but both depend on Phase 2's `extract.py`).

### Deleted

n/a

## Tasks

### Task 1: Author `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py`

**Goal:** Ship the libclang-driven KTX taxonomies handler that emits the `ktx-gameplay-taxonomies-ast.json` payload (5 election_type rows + 27 death_rule rows, plus a `_stats` block). Inherits from `Visitor` only (D3); two extraction stages cover the two enum types: Stage 1 (libclang-driven) walks `electType_t` ENUM_DECL via Pattern 10; Stage 2 (text-parse-driven) reads `include/deathtype.h` directly to recover the X-macro entries' string tokens. The handler is the canonical Pattern 10 reference for header-defined ENUM_DECL extraction; Stage 2's text-file parse is documented in the handler's docstring and surfaced as a future-pattern candidate (Pattern 16 -- X-macro file parse) when end-of-arc Phase 8 amends EXTRACTOR-PLAYBOOK.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` with module-level structure mirroring MVDSV's `_handler_protocol.py` shape (project-private handler, imports `extractor_lib._visitor.Visitor` only, no parent-project subclass per D3).

  Module docstring opens with: handler purpose (KTX election_type + death_rule taxonomies), two-stage extraction summary, output filename (`ktx-gameplay-taxonomies-ast.json`), source-file scope.

  Stage 1 (libclang): TU-root cursor intercept on header-defined ENUM_DECL `electType_t` in progs.h. This extends the technique documented as Pattern 10 in EXTRACTOR-PLAYBOOK.md. NOTE: Pattern 10 in the current playbook is strictly defined as "TU-root cursor intercept for MACRO_DEFINITION"; Phase 4 reuses the same TU-root intercept mechanic on a different cursor kind (`CursorKind.ENUM_DECL` instead of `CursorKind.MACRO_DEFINITION`). The mechanic is identical; the cursor-kind filter widens. Phase 8 amends EXTRACTOR-PLAYBOOK to broaden Pattern 10's title to "TU-root cursor intercept for header-defined declarations" and explicitly include ENUM_DECL alongside MACRO_DEFINITION (per the Open Question deferral). The handler docstring should explicitly note this distinction so future maintainers reading the code understand the cursor-kind extension.

  Stage 2 (text parse): direct file parse of `include/deathtype.h` -- not libclang. The X-macro pattern (`#define DEATHTYPE(_dt_, _dt_str_) _dt_,` at g_local.h:230) drops the second argument (the user-facing string token) from the AST after preprocessor expansion, so libclang cannot recover it. The X-macro file is the source of truth for the string tokens; reading it directly via regex preserves both the dt enum tag and the string token. This is a wholly distinct technique from Pattern 10 -- Phase 8 lands it as Pattern 16 (X-macro file parse) per the Open Question deferral.

- [ ] Add module-level constants:

  ```python
  HANDLER_NAME = "gameplay_taxonomies"
  OUTPUT_FILENAME = "ktx-gameplay-taxonomies-ast.json"

  # The 6 electType_t enum values per F7. Skip etNone sentinel.
  # Order matches progs.h:219-224 enum body. The 5 emitted rows use the
  # community-readable token in `name` and the source enum tag in `value_text`
  # per Pass 5.4.3's row schema.
  ELECTION_TYPE_TOKEN: dict[str, str] = {
      # enum_tag           -> user-facing token (D9 source-fidelity: derived
      #                       from the enum spelling minus the et- prefix,
      #                       lower-cased; etSuggestColor / etLateJoin become
      #                       snake_case to match command spelling).
      "etCaptain":       "captain",
      "etCoach":         "coach",
      "etAdmin":         "admin",
      "etSuggestColor":  "suggest_color",
      "etLateJoin":      "late_join",
  }

  ELECTION_TYPE_SKIP: frozenset[str] = frozenset({"etNone"})

  # Per-election props_json defaults (heuristic mapping from vote.c +
  # commands.c cmds[] cross-walk). Each value is a tuple
  # (description, related_commands_json, required_role).
  # required_role values mirror cmds[] CF_* flags (CF_PLAYER -> 'player';
  # CF_SPECTATOR -> 'spectator'; CF_BOTH -> 'any').
  ELECTION_TYPE_PROPS: dict[str, tuple[str, list[str], str]] = {
      "etCaptain":       (
          "Player election to designate team captains",
          ["captain"],
          "player",        # commands.c:803 cmds[] entry uses CF_PLAYER
      ),
      "etCoach":         (
          "Spectator election to designate team coaches",
          ["coach"],
          "spectator",     # commands.c:804 cmds[] entry uses CF_SPECTATOR
      ),
      "etAdmin":         (
          "Election to grant elected-admin privileges",
          ["admin"],
          "any",           # commands.c:750 cmds[] entry uses CF_BOTH
      ),
      "etSuggestColor":  (
          "Player vote to suggest a team color change",
          ["suggestcolor"],
          "player",        # commands.c:805 cmds[] entry uses CF_PLAYER
      ),
      "etLateJoin":      (
          "Vote to allow a late-joining player into an in-progress match",
          ["latejoin"],
          "player",        # commands.c:838 cmds[] entry uses CF_PLAYER
      ),
  }

  # The 27 substantive deathType_t entries per F8 source-walk (29 X-macro
  # lines in deathtype.h - dtNONE - dtUNKNOWN sentinels = 27).
  # Categorization per Pass 5.4.4 spec; lock-table format keeps the
  # category, id1_baseline, ktx_extension, related_weapon assignments
  # together for audit. related_weapon values match id1 baseline
  # gameplay_entity_defs.name spellings (axe / shotgun / super_shotgun /
  # nailgun / super_nailgun / grenade_launcher / rocket_launcher /
  # lightning_gun) for FK joinability.
  #
  # Each tuple: (category, id1_baseline, ktx_extension, related_weapon)
  # Note id1_baseline + ktx_extension are mutually exclusive in this table:
  # exactly one of the two is True per row, never both. Per Pass 5.4.4's
  # spec quote ("KTX-introduced taxonomy refinement: lg_dis/lg_dis_self
  # distinction, hook, fireball, stomp, explo_box, laser, trigger") plus
  # squish (KTX taxonomic distinction; the dtSQUISH label is KTX-introduced
  # though crushing damage exists in id1).
  DEATH_RULE_PROPS: dict[str, tuple[str, bool, bool, str | None]] = {
      # Standard id1 weapon kills
      "dtAXE":          ("weapon",       True,  False, "axe"),
      "dtSG":           ("weapon",       True,  False, "shotgun"),
      "dtSSG":          ("weapon",       True,  False, "super_shotgun"),
      "dtNG":           ("weapon",       True,  False, "nailgun"),
      "dtSNG":          ("weapon",       True,  False, "super_nailgun"),
      "dtGL":           ("weapon",       True,  False, "grenade_launcher"),
      "dtRL":           ("weapon",       True,  False, "rocket_launcher"),
      "dtLG_BEAM":      ("weapon",       True,  False, "lightning_gun"),
      # KTX weapon refinements
      "dtLG_DIS":       ("weapon",       False, True,  "lightning_gun"),
      "dtLG_DIS_SELF":  ("self",         False, True,  "lightning_gun"),
      "dtHOOK":         ("weapon",       False, True,  None),
      # Structural
      "dtCHANGELEVEL":  ("structural",   True,  False, None),
      # id1 environment damage
      "dtLAVA_DMG":     ("environment",  True,  False, None),
      "dtSLIME_DMG":    ("environment",  True,  False, None),
      "dtWATER_DMG":    ("environment",  True,  False, None),
      "dtFALL":         ("environment",  True,  False, None),
      # KTX environment refinements
      "dtSTOMP":        ("environment",  False, True,  None),
      # id1 telefrags
      "dtTELE1":        ("telefrag",     True,  False, None),
      "dtTELE2":        ("telefrag",     True,  False, None),
      "dtTELE3":        ("telefrag",     True,  False, None),
      "dtTELE4":        ("telefrag",     True,  False, None),
      # KTX environment / hazard refinements
      "dtEXPLO_BOX":    ("environment",  False, True,  None),
      "dtLASER":        ("environment",  False, True,  None),
      "dtFIREBALL":     ("environment",  False, True,  None),
      "dtSQUISH":       ("environment",  False, True,  None),
      "dtTRIGGER_HURT": ("environment",  False, True,  None),
      # id1 self
      "dtSUICIDE":      ("self",         True,  False, None),
  }

  DEATH_RULE_SKIP: frozenset[str] = frozenset({"dtNONE", "dtUNKNOWN"})

  # X-macro line shape: optional whitespace, DEATHTYPE, '(', dt tag,
  # ',', whitespace, string token, ')'. Comments may follow on the
  # same line. The regex matches `_dt_` and `_dt_str_` per the X-macro
  # definition at g_local.h:230.
  _DEATHTYPE_RE = re.compile(
      r'^\s*DEATHTYPE\s*\(\s*(?P<tag>dt[A-Za-z0-9_]+)\s*,\s*(?P<token>[A-Za-z0-9_]+)\s*\)'
  )

  # Inline trailing comment harvest from a deathtype.h line.
  _TRAILING_COMMENT_RE = re.compile(r'//\s*(.*?)\s*$')
  ```

- [ ] Implement the `KtxGameplayTaxonomiesHandler(Visitor)` class. Required attributes / methods:

  - Class attributes: `name = HANDLER_NAME`, `output_filename = OUTPUT_FILENAME`. No `payload_field` -- finalize() returns a dict with multiple top-level arrays (election_types + death_rules + _stats) per the precedent in MVDSV's protocol handler return shape (top-level dict, multiple arrays).

  - `setup(*, ktx_repo: Path, ktx_src: Path)`: store both paths. The handler needs `ktx_repo` to locate `include/deathtype.h` for Stage 2; `ktx_src` is unused but kept for signature compatibility with the cross-engine setup convention. Initialize Stage-2 result eagerly (one-shot file parse, no dependency on TU walks):
    ```python
    self._repo_root = ktx_repo
    self._src_root = ktx_src
    self._election_rows: list[dict] = []
    self._election_seen_tags: set[str] = set()
    # Stage 2 fires immediately at setup time; deathtype.h is a flat file
    # with one DEATHTYPE per line, no dependencies on TU walks.
    self._death_rule_rows: list[dict] = []
    self._death_stats: dict = {"x_macro_lines_total": 0, "skipped_sentinels": 0}
    self._parse_deathtype_h()
    ```

  - `_parse_deathtype_h()`: open `self._repo_root / "include" / "deathtype.h"`, iterate the file line-by-line (1-indexed). For each line, attempt `_DEATHTYPE_RE.match(line)`. On match, extract the dt tag and string token. Increment `self._death_stats["x_macro_lines_total"]`. If the dt tag is in `DEATH_RULE_SKIP`: increment `self._death_stats["skipped_sentinels"]`, continue. Else: look up `DEATH_RULE_PROPS[tag]` for the categorization tuple; emit one row:
    ```python
    {
      "name":               token,           # X-macro's second arg (string token), e.g. "axe", "ssg", "rl"
      "kind":               "death_rule",
      "value_text":         tag,             # dt enum tag, e.g. "dtAXE", "dtSSG"
      "source_ref":         f"deathtype.h:{line_no}",
      "ruleset_gate_json":  {},
      "props_json": {
        "category":         category,
        "id1_baseline":     id1_baseline,
        "ktx_extension":    ktx_extension,
        "related_weapon":   related_weapon,  # may be None
      },
    }
    ```
    Append to `self._death_rule_rows`. If a tag is encountered that is NOT in `DEATH_RULE_PROPS` and NOT in `DEATH_RULE_SKIP` (i.e., a future tag added a new entry), append `{"line": line_no, "tag": tag, "token": token}` to `self._death_stats["unknown_tags"]` (defensive surface so the operator notices new tags). The handler does NOT silently drop unknown tags -- it emits a row anyway with a placeholder props_json (`{"category": "unknown", "id1_baseline": False, "ktx_extension": True, "related_weapon": None}`); the unknown-tags list is the early-warning signal.

    Source line for each row is the 1-indexed line number in deathtype.h (deterministic; one DEATHTYPE per line).

  - `start_file(source_path: Path, source_bytes: bytes)`: store `self._source_bytes = source_bytes`, `self._source_path = source_path`. No file-allowlist (Stage 1 only needs ANY .c file's TU to expose the progs.h enum decl via the include closure). Per-file rows accumulator: `self._election_rows_per_file: list[dict] = []`.

  - `visit_cursor(cursor, variant)`: dispatch only on TU root cursor (Pattern 10). Mirrors MVDSV protocol handler's TU-root intercept.
    ```python
    if cursor.kind != CursorKind.TRANSLATION_UNIT:
        return
    for child in cursor.get_children():
        if child.kind == CursorKind.ENUM_DECL and child.spelling == "electType_t":
            self._handle_election_enum(child)
            return  # one electType_t per TU; stop iterating once found
    ```

  - `_handle_election_enum(enum_cursor)`: walk the enum's `EnumConstantDecl` children. Per child:
    ```python
    tag = child.spelling
    if tag in ELECTION_TYPE_SKIP:
        continue
    if tag in self._election_seen_tags:
        continue
    if tag not in ELECTION_TYPE_TOKEN:
        # Unknown future tag -- emit a defensive row with placeholder props
        # (mirrors deathtype.h's defensive-emit policy) AND log to stats.
        token = tag.removeprefix("et").lower()  # heuristic fallback spelling
        description = f"Unknown election type {tag}; future-tag fallback"
        related_commands = []
        required_role = "any"
    else:
        token = ELECTION_TYPE_TOKEN[tag]
        description, related_commands, required_role = ELECTION_TYPE_PROPS[tag]
    line = child.location.line
    self._election_rows_per_file.append({
      "name":               token,
      "kind":               "election_type",
      "value_text":         tag,
      "source_ref":         f"progs.h:{line}",
      "ruleset_gate_json":  {},
      "props_json": {
        "description":           description,
        "related_commands_json": related_commands,
        "required_role":         required_role,
      },
    })
    self._election_seen_tags.add(tag)
    ```

  - `end_file()`: return `self._election_rows_per_file`, reset `self._election_rows_per_file = []`. Per-file rows feed into the cross-file accumulator (`self._election_rows` via the driver's `all_rows[handler.name].extend(rows)` mechanic; finalize() consumes it).

  - `finalize(all_rows: list[dict] | dict, repo_root: Path) -> dict`:
    - Cross-file dedup on election rows: same `electType_t` enum is visible from multiple .c files (every TU's #include closure pulls progs.h). First-wins by `value_text` (the dt tag; canonical key). If `all_rows` is a dict (driver convention), grab `all_rows.get(self.name, [])`; if a flat list, use directly.
    - Stable sort: election rows by `name` ascending (alphabetical); death rows already in deathtype.h source order from Stage 2.
    - Build `_stats`:
      ```python
      stats = {
        "election_type": {
          "source_total": <pre-dedup count>,
          "count": len(unique_election_rows),
          "expected": 5,                           # F7 anchor
          "by_required_role": {<role>: <count>, ...},
        },
        "death_rule": {
          "x_macro_lines_total": self._death_stats["x_macro_lines_total"],   # expect 29
          "skipped_sentinels":   self._death_stats["skipped_sentinels"],     # expect 2
          "count": len(self._death_rule_rows),
          "expected": 27,                          # F8 anchor
          "by_category": {<category>: <count>, ...},
          "unknown_tags": self._death_stats.get("unknown_tags", []),
        },
      }
      ```
    - Return:
      ```python
      return {
        "election_types": unique_election_rows,
        "death_rules":    self._death_rule_rows,
        "_stats":         stats,
      }
      ```

  - The handler's two stages run independently: Stage 2 (deathtype.h parse) fires during `setup()` once per worker; Stage 1 (electType_t walk) fires during each TU walk; both join in `finalize()`. No cross-stage state conflict.

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
  ```

- [ ] Run a syntax sanity pass:
  ```bash
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler; print('ok')"
  ```
  Expected: prints `ok` (clean import; no syntax errors; no missing names).

**Verification:**
- `test -f apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` exits 0.
- The above import probe prints `ok`.
- `grep -nE "^class .*\(Visitor\):" apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py | grep -c "KtxGameplayTaxonomiesHandler" ` returns `1` (single class, inherits from Visitor only per D3).
- `grep -n "from _handler_" apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` returns 0 matches (no parent-project subclassing per D3 cross-codebase port rule).
- PASS condition: file present + clean import + class shape correct + no D3 violations.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across one new Python file (~250 lines). Two-stage walk (libclang ENUM_DECL intercept + direct file parse); contained shape; mirrors MVDSV protocol handler pattern. Mechanical implementation requiring reasoning (clear spec, two stages, well-defined data shapes).

### Task 2: Register `KtxGameplayTaxonomiesHandler` in `extract.py`

**Goal:** Add the handler to the KTX driver's `ALL_HANDLERS` dict so `--handlers all` (or `--handlers gameplay_taxonomies`) runs it. Mirrors Phase 3's modes-handler registration.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/extract.py` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/extractors/ktx/extract.py`. Locate the `ALL_HANDLERS` dict (Phase 2 registered the four Pass-1 handlers there; Phase 3 registers `MODES`).

- [ ] Add the `TAXONOMIES` entry adjacent to the others. The handler instance is constructed with no constructor args; `setup()` is called by the driver post-fork with `ktx_repo` + `ktx_src`.

  ```python
  from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler

  ALL_HANDLERS: dict[str, type[Visitor]] = {
      # ... Phase-2 entries ...
      # ... Phase-3 modes entry ...
      "gameplay_taxonomies": KtxGameplayTaxonomiesHandler,
  }
  ```

  The exact local-import shape may vary by what Phase 2 / Phase 3 establish; mirror their pattern. If Phase 3's `MODES` import uses a `try/except ImportError` guard, do the same here.

- [ ] Confirm the driver's per-handler dispatch (`--handlers <name>` CLI arg) works with the new entry. Run:
  ```bash
  python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --help
  ```
  Expected: `gameplay_taxonomies` appears in the handler-name list.

**Verification:**
- `grep -n "gameplay_taxonomies\|KtxGameplayTaxonomiesHandler" apps/qw-oracle/scripts/extractors/ktx/extract.py` returns at least 2 matches (import + ALL_HANDLERS entry).
- PASS condition: handler discoverable via `--help`.
- FAIL condition: handler missing from ALL_HANDLERS OR `--help` runs into an import error.

**Execution mode:** `inline` -- two-line additions to an existing file with the literal new content shipped above.

### Task 3: Author `apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts`

**Goal:** Ship the TS loader that reads `ktx-gameplay-taxonomies-ast.json` and idempotently UPSERTs both row arrays into `gameplay_mechanics`. Mirrors `load-modes.ts` (Phase 3) shape with two-kind dispatch.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts` (created)

**Steps:**

- [ ] Create the file with the following content shape (D14 JSONB binding via `tx.json(...)` everywhere; D15 idempotent UPSERT keyed on `(gameplay_source_id, kind, name, ruleset_gate_json)`):

  ```ts
  // Loader for KTX gameplay-taxonomies rows (election_type + death_rule).
  // Reads the AST JSON produced by _handler_gameplay_taxonomies.py and
  // idempotently UPSERTs both kind groups into gameplay_mechanics.
  //
  // D14 JSONB binding: every JSONB column passes its JS value via
  // tx.json(...). NEVER pre-stringify.
  // D15 idempotent: ON CONFLICT (gameplay_source_id, kind, name,
  //                              ruleset_gate_json) DO UPDATE; re-run is a no-op.

  import { readFileSync } from 'node:fs';
  import type postgres from 'postgres';

  const KTX_GAMEPLAY_SOURCE_ID = 'ktx';

  interface ElectionTypeRow {
    name: string;
    kind: 'election_type';
    value_text: string;            // dt enum tag
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: {
      description: string;
      related_commands_json: string[];
      required_role: string;
    };
  }

  interface DeathRuleRow {
    name: string;
    kind: 'death_rule';
    value_text: string;
    source_ref: string;
    ruleset_gate_json: Record<string, unknown>;
    props_json: {
      category: string;
      id1_baseline: boolean;
      ktx_extension: boolean;
      related_weapon: string | null;
    };
  }

  export interface TaxonomiesAstFile {
    election_types: ElectionTypeRow[];
    death_rules: DeathRuleRow[];
    _stats?: Record<string, unknown>;
  }

  export interface LoadTaxonomiesResult {
    inserted: { election_type: number; death_rule: number };
    updated:  { election_type: number; death_rule: number };
    total:    { election_type: number; death_rule: number };
  }

  // Canonicalise object key order so the same logical gate always
  // serialises identically. Empty gates collapse to {}. Mirrors
  // load-modes.ts and load-gameplay.ts patterns.
  function canonicaliseGate(
    gate: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    if (!gate || Object.keys(gate).length === 0) return {};
    const sortedKeys = Object.keys(gate).sort();
    const ordered: Record<string, unknown> = {};
    for (const k of sortedKeys) ordered[k] = gate[k];
    return ordered;
  }

  export async function loadTaxonomiesFromArray(
    sql: postgres.Sql,
    ast: TaxonomiesAstFile,
  ): Promise<LoadTaxonomiesResult> {
    const result: LoadTaxonomiesResult = {
      inserted: { election_type: 0, death_rule: 0 },
      updated:  { election_type: 0, death_rule: 0 },
      total:    { election_type: 0, death_rule: 0 },
    };

    // Precondition: gameplay_sources['ktx'] row must exist (Phase 1 Task 5).
    const sourceRows = await sql<{ id: string }[]>`
      SELECT id FROM gameplay_sources WHERE id = ${KTX_GAMEPLAY_SOURCE_ID}
    `;
    if (sourceRows.length === 0) {
      throw new Error(
        `gameplay_sources row 'ktx' not found. Phase 1 Task 5 must run before ` +
        `load-gameplay-taxonomies. See ` +
        `docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md.`,
      );
    }

    await sql.begin(async (tx) => {
      // election_type rows. Expected count: 5 (F7).
      for (const row of ast.election_types) {
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
        if (wasExisting) result.updated.election_type++;
        else result.inserted.election_type++;
        result.total.election_type++;
      }

      // death_rule rows. Expected count: 27 (F8).
      for (const row of ast.death_rules) {
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
        if (wasExisting) result.updated.death_rule++;
        else result.inserted.death_rule++;
        result.total.death_rule++;
      }
    });

    // Hard count gates (F7 + F8 anchors). Sub-anchor counts trigger
    // a fail-fast so a regressed handler doesn't silently land short rows.
    if (result.total.election_type < 5) {
      throw new Error(
        `load-gameplay-taxonomies: election_type count ${result.total.election_type} < 5 ` +
        `expected (F7 anchor). Handler emitted fewer election_type rows than required.`,
      );
    }
    if (result.total.death_rule < 27) {
      throw new Error(
        `load-gameplay-taxonomies: death_rule count ${result.total.death_rule} < 27 ` +
        `expected (F8 anchor). Handler emitted fewer death_rule rows than required.`,
      );
    }

    return result;
  }

  export async function loadTaxonomiesFromFile(
    sql: postgres.Sql,
    jsonPath: string,
  ): Promise<LoadTaxonomiesResult> {
    const ast = JSON.parse(readFileSync(jsonPath, 'utf-8')) as TaxonomiesAstFile;
    return loadTaxonomiesFromArray(sql, ast);
  }
  ```

- [ ] Document the loader's contract at module top: idempotent UPSERT; consumes handler's AST JSON; precondition is Phase 1's `gameplay_sources['ktx']` row + Phase 1's gameplay-kind widening migration; D14 JSONB binding everywhere.

**Verification:**
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts` exits 0 (clean TS compile).
- `grep -n "tx.json\|JSON.stringify" apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts | grep -c "JSON.stringify"` returns `0` (no D14-violating pre-stringify; per `feedback_substring_not_regex_fingerprinting.md`, the substring is the load-bearing fingerprint).
- `grep -n "ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json)" apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts` returns at least 2 matches (one per row kind).
- `grep -n "KTX_GAMEPLAY_SOURCE_ID" apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts` returns at least 4 matches (precondition check + both UPSERTs + value bind).
- PASS condition: clean compile + JSONB binding correct + both UPSERTs present + precondition check present.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across one new TS file mirroring an existing analog (load-modes.ts) plus AST-JSON consumption shape. Mechanical implementation requiring reasoning (clear spec, one file, ~150 lines).

### Task 4: Wire `load-ktx-taxonomies` subcommand in `index.ts`

**Goal:** Surface the loader on the CLI so `bun scripts/load-knowledge --help` lists it and `bun scripts/load-knowledge load-ktx-taxonomies --json <path>` runs it. Mirrors Phase 3's `load-ktx-modes` subcommand registration.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/index.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/index.ts`. Locate the subcommand-dispatch block where `load-gameplay` and (post-Phase-3) `load-ktx-modes` are registered. Add adjacent dispatch:

  ```ts
  if (subcommand === 'load-ktx-taxonomies')        { await runLoadKtxTaxonomies(rest); return; }
  ```

- [ ] Add the help-text line in the usage printer:

  ```
    load-ktx-taxonomies [--json <path>]
  ```

- [ ] Implement `runLoadKtxTaxonomies(args: string[]): Promise<void>` adjacent to the existing `runLoadKtxModes` (post-Phase-3) wrapper:

  ```ts
  async function runLoadKtxTaxonomies(args: string[]): Promise<void> {
    const jsonPath = parseArgValue(args, '--json') ?? defaultTaxonomiesJsonPath();
    const sql = await connect();
    try {
      const { loadTaxonomiesFromFile } = await import('./load-gameplay-taxonomies.js');
      const r = await loadTaxonomiesFromFile(sql, jsonPath);
      console.log(
        `load-ktx-taxonomies: election_type inserted=${r.inserted.election_type} ` +
        `updated=${r.updated.election_type} total=${r.total.election_type}; ` +
        `death_rule inserted=${r.inserted.death_rule} ` +
        `updated=${r.updated.death_rule} total=${r.total.death_rule}`,
      );
      if (r.total.election_type < 5) {
        console.error(
          `load-ktx-taxonomies: STOP - election_type count below F7 anchor 5 ` +
          `(got ${r.total.election_type}). Re-run extraction.`,
        );
        process.exitCode = 2;
      }
      if (r.total.death_rule < 27) {
        console.error(
          `load-ktx-taxonomies: STOP - death_rule count below F8 anchor 27 ` +
          `(got ${r.total.death_rule}). Re-run extraction.`,
        );
        process.exitCode = 2;
      }
    } finally {
      await sql.end();
    }
  }

  function defaultTaxonomiesJsonPath(): string {
    return join(
      MONOREPO_ROOT,
      'apps', 'qw-oracle', 'scripts', 'extractors', 'ktx', 'output',
      'ktx-gameplay-taxonomies-ast.json',
    );
  }
  ```

  The `parseArgValue`, `connect`, `MONOREPO_ROOT`, `join` references already exist in `index.ts`; reuse them.

**Verification:**
- `bun apps/qw-oracle/scripts/load-knowledge/index.ts --help` lists `load-ktx-taxonomies [--json <path>]`.
- `grep -n "load-ktx-taxonomies\|runLoadKtxTaxonomies\|loadTaxonomiesFromFile" apps/qw-oracle/scripts/load-knowledge/index.ts` returns at least 4 matches (dispatch + help + function definition + dynamic import).
- PASS condition: subcommand discoverable via --help + dispatches without runtime error on a missing JSON path.
- FAIL condition: subcommand absent OR runtime error inside the wrapper.

**Execution mode:** `inline` -- targeted multi-line additions to an existing file with full new content shipped above; no logic the drafter hasn't already specified.

### Task 5: Wire load-ktx-taxonomies into the per-tag pipeline in `extract-tag.ts`

**Goal:** When `extractTag()` runs for `project='ktx'`, after the entity-loader loop and after Phase 3's `loadModesFromFile` call, also call `loadTaxonomiesFromFile` so a single `extract-tag --project ktx --version <tag>` invocation lands ALL KTX rows (Pass-1 entity rows + Phase-3 modes + Phase-4 taxonomies) atomically. Mirrors Phase 3's pipeline-hook pattern.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`. Locate the per-project post-entity-loader block (post-Phase-3 it should have a KTX-modes-load step from Phase 3 Task 6).

- [ ] Add a project-conditional KTX-taxonomies load step adjacent to the modes-load step:

  ```ts
  // Phase 4 (KTX onboarding): load election_type + death_rule rows from
  // _handler_gameplay_taxonomies.py's ktx-gameplay-taxonomies-ast.json.
  // Idempotent UPSERT; safe to re-run.
  if (options.project === 'ktx') {
    const taxonomiesJsonPath = join(extractorOutputDir, 'ktx-gameplay-taxonomies-ast.json');
    if (existsSync(taxonomiesJsonPath)) {
      const { loadTaxonomiesFromFile } = await import('./load-gameplay-taxonomies.js');
      const taxonomiesResult = await loadTaxonomiesFromFile(options.sql, taxonomiesJsonPath);
      console.log(
        `[extract-tag] ktx taxonomies loaded: ` +
        `election_type total=${taxonomiesResult.total.election_type}, ` +
        `death_rule total=${taxonomiesResult.total.death_rule}`,
      );
    } else {
      console.warn(
        `[extract-tag] ktx-gameplay-taxonomies-ast.json missing at ${taxonomiesJsonPath}; ` +
        `skipping taxonomies loading. Re-run extract-tag once Phase 4 ships if this is unexpected.`,
      );
    }
  }
  ```

- [ ] The `existsSync` check makes this hook safe to land BEFORE the taxonomies handler is exercised end-to-end: if the JSON is absent, the call is skipped with a warning. Once `--handlers all` runs the taxonomies handler, the JSON appears and the load step kicks in.

**Verification:**
- `grep -n "ktx-gameplay-taxonomies-ast.json\|loadTaxonomiesFromFile" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` returns at least 2 matches.
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` exits 0.
- PASS condition: hook present + clean compile.
- FAIL condition: hook missing OR compile error.

**Execution mode:** `inline` -- one block-add to an existing file with full content shipped above.

### Task 6: Author `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py`

**Goal:** Land a pytest-shaped sanity test that runs the handler end-to-end against the live KTX repo, then asserts:
1. Election count = 5 (F7 anchor).
2. Death rule count = 27 (F8 anchor).
3. `etNone` is NOT emitted (sentinel skip honored).
4. `dtNONE` and `dtUNKNOWN` are NOT emitted (sentinel skips honored).
5. `dtCHANGELEVEL` IS emitted with `props_json.category == 'structural'`.
6. `dtRL` row has `props_json.related_weapon == 'rocket_launcher'` (FK joinability spot check; not "rocketlauncher").
7. All death_rule rows have exactly one of `id1_baseline` / `ktx_extension` set to True (mutually-exclusive flags invariant).
8. The election row for `etCaptain` has `props_json.required_role == 'player'`.

The test exercises the live KTX repo if cloned at `research/repos/ktx/`; if absent, skips with documented reason.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py` (created)

**Steps:**

- [ ] Ensure the parent test directory exists. Phase 3's test file (per Phase 3 Task 7) creates `apps/qw-oracle/scripts/extractors/ktx/tests/`; Phase 4 may run before or after Phase 3 (the two phases are mutually independent at the data level per README). To avoid an order-of-execution dependency:
  ```bash
  mkdir -p apps/qw-oracle/scripts/extractors/ktx/tests/
  ```
  This is idempotent (no-op if Phase 3 already created the directory).

- [ ] Create the file with pytest fixtures + 8 test cases per the goals above. Mirror the shape of Phase 3's `tests/test_handler_modes.py` -- same imports, same skip-if-repo-absent guard, same parse-via-clang_args helper. Concrete shape:

  ```python
  """Phase 4 sanity test: verifies KtxGameplayTaxonomiesHandler produces F7/F8 anchors."""
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
  from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler


  @pytest.fixture(scope="module")
  def handler_with_outputs():
      handler = KtxGameplayTaxonomiesHandler()
      handler.setup(ktx_repo=KTX_REPO, ktx_src=KTX_REPO / "src")

      idx = Index.create()
      args = clang_args_ktx_for(str(KTX_REPO / "src"))

      # Walk one .c file -- any TU's #include closure exposes progs.h's
      # electType_t enum decl. world.c is small and central; pick it.
      target_path = KTX_REPO / "src" / "world.c"
      tu = idx.parse(str(target_path), args=args, options=PARSE_OPTS)
      source_bytes = target_path.read_bytes()
      handler.start_file(source_path=target_path, source_bytes=source_bytes)
      walk_tu_dispatch(tu, [handler], "server", str(target_path))
      rows = handler.end_file()

      # Driver convention: collect per-file rows into all_rows[handler.name].
      all_rows = {handler.name: list(rows)}
      result = handler.finalize(all_rows=all_rows, repo_root=KTX_REPO)
      return handler, result


  def test_election_count_5(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["election_types"]) == 5, (
          f"Expected 5 election_type rows (F7); got {len(result['election_types'])}"
      )


  def test_death_rule_count_27(handler_with_outputs):
      _, result = handler_with_outputs
      assert len(result["death_rules"]) == 27, (
          f"Expected 27 death_rule rows (F8); got {len(result['death_rules'])}"
      )


  def test_etnone_skipped(handler_with_outputs):
      _, result = handler_with_outputs
      hits = [r for r in result["election_types"] if r["value_text"] == "etNone"]
      assert hits == [], (
          f"etNone sentinel must be skipped (F7); got rows: {hits}"
      )


  def test_dtnone_dtunknown_skipped(handler_with_outputs):
      _, result = handler_with_outputs
      sentinels = [r for r in result["death_rules"]
                   if r["value_text"] in ("dtNONE", "dtUNKNOWN")]
      assert sentinels == [], (
          f"dtNONE/dtUNKNOWN sentinels must be skipped (F8); got rows: {sentinels}"
      )


  def test_dtchangelevel_structural(handler_with_outputs):
      _, result = handler_with_outputs
      cl = next(
          (r for r in result["death_rules"] if r["value_text"] == "dtCHANGELEVEL"),
          None,
      )
      assert cl is not None, "dtCHANGELEVEL must be present (F8 keep-rule)"
      assert cl["props_json"]["category"] == "structural", (
          f"dtCHANGELEVEL category must be 'structural' (F8 + spec 5.4.4); "
          f"got: {cl['props_json']['category']}"
      )


  def test_dtrl_related_weapon_underscored(handler_with_outputs):
      _, result = handler_with_outputs
      rl = next(
          (r for r in result["death_rules"] if r["value_text"] == "dtRL"),
          None,
      )
      assert rl is not None, "dtRL row missing"
      assert rl["props_json"]["related_weapon"] == "rocket_launcher", (
          f"dtRL related_weapon must be 'rocket_launcher' (matches id1 baseline "
          f"gameplay_entity_defs.name for FK joinability); "
          f"got: {rl['props_json']['related_weapon']}"
      )


  def test_id1_ktx_flags_mutually_exclusive(handler_with_outputs):
      _, result = handler_with_outputs
      bad = [
          r for r in result["death_rules"]
          if r["props_json"]["id1_baseline"] == r["props_json"]["ktx_extension"]
      ]
      assert bad == [], (
          f"Each death_rule row must have exactly one of id1_baseline / "
          f"ktx_extension set to True (mutually exclusive). "
          f"Violators: {[(r['name'], r['props_json']) for r in bad]}"
      )


  def test_etcaptain_required_role(handler_with_outputs):
      _, result = handler_with_outputs
      cap = next(
          (r for r in result["election_types"] if r["value_text"] == "etCaptain"),
          None,
      )
      assert cap is not None, "etCaptain row missing"
      assert cap["props_json"]["required_role"] == "player", (
          f"etCaptain required_role must be 'player' (CF_PLAYER per "
          f"commands.c:803 cmds[] entry). Got: {cap['props_json']['required_role']}"
      )
  ```

- [ ] Run the test file: `cd apps/qw-oracle/scripts/extractors/ktx && python3 -m pytest tests/test_handler_gameplay_taxonomies.py -v`. All 8 test cases pass (or skip with documented reason if repo absent).

**Verification:**
- `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py -v` exits 0 with all assertions green.
- PASS condition: pytest pass.
- FAIL condition: any assertion fails (skip with no documented reason is also fail).

**Execution mode:** `subagent (Sonnet medium)` -- new test file with 8 assertions; implementation requires running the handler end-to-end against the live KTX repo and shaping pytest fixtures correctly. Mechanical given the spec but benefits from subagent isolation (libclang + handler + pytest interplay is non-trivial).

### Task 7: Per-row verification probes

**Goal:** Verify the rows landed in dev DB match F7 / F8 anchors AND the JSONB-binding regression gate (D14) passes. SQL probes; YES/NO answers per D16.

**Files:** none modified; transient SELECT queries against the dev DB.

**Steps:**

- [ ] Run the election_type count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'election_type'"
  ```
  Expected: `5` (F7 anchor; exact match required).

- [ ] Run the death_rule count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'"
  ```
  Expected: `27` (F8 anchor; exact match required).

- [ ] Run the sentinel-skip probe (election):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, value_text
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'election_type'
      AND value_text = 'etNone'"
  ```
  Expected: 0 rows. PASS condition: empty result. FAIL condition: any rows.

- [ ] Run the sentinel-skip probe (death):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, value_text
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
      AND value_text IN ('dtNONE', 'dtUNKNOWN')"
  ```
  Expected: 0 rows. PASS condition: empty result. FAIL condition: any rows.

- [ ] Run the dtCHANGELEVEL category probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, value_text, props_json->>'category' AS category
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
      AND value_text = 'dtCHANGELEVEL'"
  ```
  Expected: 1 row -- `changelevel | dtCHANGELEVEL | structural`.

- [ ] Run the death_rule category distribution probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      props_json->>'category' AS category,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    GROUP BY 1 ORDER BY 1"
  ```
  Expected: 5 rows --
  - `environment | 10`
  - `self        | 2`
  - `structural  | 1`
  - `telefrag    | 4`
  - `weapon      | 10`

- [ ] Run the id1_baseline / ktx_extension distribution probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      (props_json->>'id1_baseline')::boolean   AS id1,
      (props_json->>'ktx_extension')::boolean  AS ktx,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    GROUP BY 1, 2 ORDER BY 1 DESC, 2 DESC"
  ```
  Expected: 2 rows --
  - `t | f | 18`  (id1 baseline rows)
  - `f | t |  9`  (KTX extension rows)
  No row with `id1=t AND ktx=t` (would violate the mutually-exclusive invariant); no row with `id1=f AND ktx=f` (every row must be one or the other).

- [ ] Run the related_weapon FK-join probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT dr.name, dr.props_json->>'related_weapon' AS rel_weap,
           ed.name AS id1_weapon_name
    FROM gameplay_mechanics dr
    LEFT JOIN gameplay_entity_defs ed
      ON ed.gameplay_source_id = 'id1'
     AND ed.kind = 'weapon'
     AND ed.name = dr.props_json->>'related_weapon'
    WHERE dr.gameplay_source_id = 'ktx' AND dr.kind = 'death_rule'
      AND dr.props_json->>'related_weapon' IS NOT NULL
    ORDER BY dr.name"
  ```
  Expected: 10 rows (8 standard weapon kills + dtLG_DIS + dtLG_DIS_SELF; dtHOOK has `related_weapon=NULL` per the lock-table since id1 has no hook entity, so it is excluded by the WHERE clause). Every non-NULL `rel_weap` value finds a matching id1 baseline row (`id1_weapon_name` non-NULL). Expected matched names: `axe`, `shotgun`, `super_shotgun`, `nailgun`, `super_nailgun`, `grenade_launcher`, `rocket_launcher`, `lightning_gun`. PASS condition: every related_weapon FK joins; no NULL `id1_weapon_name` for non-NULL `rel_weap`.

  Note: dtLG_BEAM, dtLG_DIS, dtLG_DIS_SELF all map to `lightning_gun`; the join returns three rows pointing at the same id1 entity. dtHOOK is filtered out before join because its related_weapon is NULL (no id1 hook entity exists).

- [ ] Run the JSONB-binding regression probe (D14):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      jsonb_typeof(ruleset_gate_json) AS gate_type,
      jsonb_typeof(props_json)        AS props_type,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('election_type', 'death_rule')
    GROUP BY 1, 2 ORDER BY 1, 2"
  ```
  Expected: every row has `gate_type='object'` AND `props_type='object'`. NEVER `'string'` (would mean the legacy stringify bug landed). Any row showing `string` -> CRITICAL FAIL.

- [ ] Run the empty-gate invariant probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('election_type', 'death_rule')
      AND ruleset_gate_json != '{}'::jsonb"
  ```
  Expected: `0`. All taxonomies rows use `ruleset_gate_json={}` per Pass 4.3 + 5.4.3 + 5.4.4 (election is subsystem-level; death is universal across modes).

- [ ] Run the idempotency probe (re-run loader):
  ```bash
  bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-taxonomies
  ```
  After the first load, the next run reports 0 inserted, 5 updated for election_type, 0 inserted, 27 updated for death_rule. Counts unchanged from first load.

  Idempotency probe SQL (run BEFORE and AFTER the second load; counts must match):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind IN ('election_type', 'death_rule')"
  ```
  Pre-second-load count == Post-second-load count.

**Verification:**
- All 11 probes return expected results.
- PASS condition: counts match anchors + sentinel skips honored + dtCHANGELEVEL is structural + category distribution matches + id1/ktx flags mutually exclusive + related_weapon joins + JSONB binding all `object` + empty gates everywhere + idempotency holds.
- FAIL condition: any probe deviates.

**Execution mode:** `inline` -- pure SQL probes shipped above; the operator (or executor) copy-pastes into psql; no logic, no reasoning.

### Task 8: Single commit landing all Phase 4 changes

**Goal:** Commit Phase 4 as one coherent unit per D16 (phase atomicity). Per D20: directly to `main`, no PR ceremony.

**Files:** all the above (creates + modifies).

**Steps:**

- [ ] Stage the new + modified files:
  ```bash
  git add apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py \
          apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py \
          apps/qw-oracle/scripts/extractors/ktx/extract.py \
          apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts \
          apps/qw-oracle/scripts/load-knowledge/index.ts \
          apps/qw-oracle/scripts/load-knowledge/extract-tag.ts \
          docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-4-taxonomies-handler.md \
          docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
  ```

- [ ] `git commit` with message:
  ```
  arc(ktx): Phase 4 -- gameplay taxonomies handler (election_type + death_rule)

  KTX gameplay-taxonomy extraction lands as Layer 1 rows. Two-stage handler:

  Stage 1 (libclang Pattern 10):
  - TU-root cursor intercept on ENUM_DECL with spelling 'electType_t' (progs.h).
  - Walks EnumConstantDecl children, skips etNone sentinel, emits 5 rows.
  - Per-row: name (community-readable token), value_text (dt enum tag),
    source_ref (progs.h:<line>), ruleset_gate_json={}, props_json
    (description / related_commands_json / required_role).

  Stage 2 (X-macro file parse):
  - Direct text parse of include/deathtype.h via regex; the X-macro's
    string-token argument is dropped from AST after preprocessor expansion,
    so libclang cannot recover it. File-parse is the source of truth.
  - 29 X-macro lines - dtNONE - dtUNKNOWN sentinels = 27 rows.
  - dtCHANGELEVEL kept as category='structural' (qw-event-log harness anchor).
  - Per-row: name (X-macro string token), value_text (dt enum tag),
    source_ref (deathtype.h:<line>), ruleset_gate_json={}, props_json
    (category / id1_baseline / ktx_extension / related_weapon).
  - id1_baseline + ktx_extension are mutually exclusive: 18 id1 baseline +
    9 KTX-introduced taxonomy refinements (lg_dis distinction, hook,
    fireball, stomp, explo_box, laser, squish, trigger).
  - related_weapon values match id1 baseline gameplay_entity_defs.name
    spellings (rocket_launcher, super_shotgun, lightning_gun, etc.) for
    FK joinability.

  Output: ktx-gameplay-taxonomies-ast.json with election_types[] (5 rows) +
  death_rules[] (27 rows) + _stats block (per-stage counts, sentinel skips,
  unknown-tags defensive surface).

  Loader:
  - load-gameplay-taxonomies.ts (postgres-js) idempotently UPSERTs both arrays
    into gameplay_mechanics on (gameplay_source_id='ktx', kind, name,
    ruleset_gate_json).
  - JSONB binding via tx.json(...) (D14). All rows use ruleset_gate_json={}.
  - Hard-fail gates: election_type count >= 5 (F7); death_rule count >= 27 (F8).
  - Precondition check: gameplay_sources['ktx'] row must exist (Phase 1 Task 5).

  Wiring:
  - apps/qw-oracle/scripts/extractors/ktx/extract.py registers
    KtxGameplayTaxonomiesHandler in ALL_HANDLERS.
  - apps/qw-oracle/scripts/load-knowledge/index.ts adds load-ktx-taxonomies
    subcommand.
  - apps/qw-oracle/scripts/load-knowledge/extract-tag.ts calls
    loadTaxonomiesFromFile after the entity loaders for project='ktx'
    (existsSync-guarded, safe re-runs).

  Tests:
  - tests/test_handler_gameplay_taxonomies.py runs the handler end-to-end
    against the live KTX repo (research/repos/ktx/) and asserts F7/F8 anchors
    + sentinel skips honored + dtCHANGELEVEL structural + dtRL related_weapon
    is 'rocket_launcher' (FK joinability) + id1/ktx mutually exclusive +
    etCaptain required_role is 'player'.

  qw-event-log validation harness anchor for the WeaponType enum is now
  available at the schema level. The 27 death_rule rows are the cross-
  validation target; id1_baseline / ktx_extension flags let the harness
  segment "should fire on id1 demos" vs "only fires on KTX demos" per
  Pass 4.3.

  Resolves: F7 (5 election_type rows; etNone skipped), F8 (27 death_rule
  rows; dtNONE/dtUNKNOWN skipped; dtCHANGELEVEL structural).
  Pre-stages: nothing further -- Phases 5 (gameplay tables), 6 (XSD
  match_event handler), 7 (validation runbook + F1 quality probes) are
  independent; Phase 7 consumes these rows for the F1 quality grid.
  ```

- [ ] Push to origin per the project's git workflow.

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status` is clean (working tree matches HEAD).
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes after the commit OR git push fails.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at the end of Phase 4. All probes return YES/NO answers:

**1. Handler file present + imports clean.**

```bash
test -f apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py && \
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler; print('ok')"
```
- PASS condition: prints `ok`.
- FAIL condition: ImportError or file-missing.

**2. Loader file present + clean compile.**

```bash
test -f apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts && \
  bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts
```
- PASS condition: tsc exits 0.
- FAIL condition: tsc errors.

**3. Pytest sanity test passes.**

```bash
cd apps/qw-oracle/scripts/extractors/ktx && \
  python3 -m pytest tests/test_handler_gameplay_taxonomies.py -v
```
- PASS condition: pytest exits 0; all 8 test cases pass.
- FAIL condition: any test case fails (skip-with-no-reason is also fail).

**4. election_type count = 5 (F7 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'election_type'"
```
- PASS condition: returns `5`.
- FAIL condition: returns anything else.

**5. death_rule count = 27 (F8 anchor).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'"
```
- PASS condition: returns `27`.
- FAIL condition: returns anything else.

**6. Sentinel skips honored.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND value_text IN ('etNone', 'dtNONE', 'dtUNKNOWN')"
```
- PASS condition: returns `0`.
- FAIL condition: returns any non-zero count (handler emitted a sentinel row).

**7. dtCHANGELEVEL is structural.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT props_json->>'category' FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    AND value_text = 'dtCHANGELEVEL'"
```
- PASS condition: returns `structural` (one row).
- FAIL condition: returns 0 rows (dtCHANGELEVEL missing) OR returns anything other than `structural`.

**8. death_rule category distribution matches lock-table.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT
    props_json->>'category' AS category,
    count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
  GROUP BY 1 ORDER BY 1"
```
- PASS condition: 5 rows --
  - `environment | 10`
  - `self        | 2`
  - `structural  | 1`
  - `telefrag    | 4`
  - `weapon      | 10`
- FAIL condition: counts deviate or category missing.

**9. id1_baseline / ktx_extension flags mutually exclusive.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    AND (props_json->>'id1_baseline')::boolean = (props_json->>'ktx_extension')::boolean"
```
- PASS condition: returns `0` (no row has both flags equal -- they must always be opposites).
- FAIL condition: any non-zero count. CRITICAL: a violation means a row has both flags True or both False, breaking the exclusivity invariant.

**10. related_weapon FK-join smoke check.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics dr
  WHERE dr.gameplay_source_id = 'ktx' AND dr.kind = 'death_rule'
    AND dr.props_json->>'related_weapon' IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM gameplay_entity_defs ed
      WHERE ed.gameplay_source_id = 'id1'
        AND ed.kind = 'weapon'
        AND ed.name = dr.props_json->>'related_weapon'
    )"
```
- PASS condition: returns `0` (every non-NULL related_weapon value resolves to an id1 baseline weapon row).
- FAIL condition: returns any non-zero count -- the handler emitted a related_weapon name that does not match an id1 weapon's `name`. Most likely cause: handler used the un-underscored shorthand (`rocketlauncher` vs the actual `rocket_launcher`).

**11. JSONB-binding regression gate (D14).**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT
    jsonb_typeof(ruleset_gate_json) AS gate_type,
    jsonb_typeof(props_json)        AS props_type,
    count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('election_type', 'death_rule')
  GROUP BY 1, 2 ORDER BY 1, 2"
```
- PASS condition: every row has `gate_type='object'` AND `props_type='object'`.
- FAIL condition: any row has `gate_type='string'` OR `props_type='string'`. CRITICAL: this is the legacy SQLite-era stringify bug per D14.

**12. Empty ruleset_gate_json on every taxonomies row.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('election_type', 'death_rule')
    AND ruleset_gate_json != '{}'::jsonb"
```
- PASS condition: returns `0`.
- FAIL condition: any non-zero count -- the handler put a non-empty gate on a taxonomies row, contradicting Pass 4.3 + Pass 5.4.3 + Pass 5.4.4 schemas.

**13. Idempotent re-run.**

```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind IN ('election_type', 'death_rule')" > /tmp/phase4_count_a.txt
bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-taxonomies
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind IN ('election_type', 'death_rule')" > /tmp/phase4_count_b.txt
diff /tmp/phase4_count_a.txt /tmp/phase4_count_b.txt
```
- PASS condition: `diff` is empty (counts identical pre- and post-second-load); D15 idempotency holds.
- FAIL condition: counts differ -> ON CONFLICT clause is missing or mis-keyed.

**14. Phase 4 commit landed cleanly.**

```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 4; `git status --short` is empty.
- FAIL condition: latest commit is something else OR working tree has uncommitted residuals.

If all 14 probes pass, Phase 4 is done. Phase 5 (gameplay tables handler) and Phase 6 (XSD match_event handler) are independent at the data level; they can draft / execute in parallel after this. If any probe fails, see `## Recovery` below.

## Outputs to next phase

After Phase 4 ships, the following hold:

- `gameplay_mechanics` carries 5 `kind='election_type'` rows (all `gameplay_source_id='ktx'`) with `ruleset_gate_json={}` per Pass 5.4.3.
- `gameplay_mechanics` carries 27 `kind='death_rule'` rows (all `gameplay_source_id='ktx'`) with `ruleset_gate_json={}` per Pass 5.4.4. dtCHANGELEVEL is present with `category='structural'`; dtNONE / dtUNKNOWN are absent.
- The qw-event-log validation harness now has a Layer 1 anchor for the WeaponType enum at the schema level. Per Pass 4.3 / Pass 5.4.4, the `id1_baseline` / `ktx_extension` flags on each death_rule row let the harness segment "should fire on id1 demos" vs "only fires on KTX demos." The harness can JOIN the parser's death-event observations against `gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='death_rule'` to verify that every observed death type maps to a known taxonomy row.
- Cross-namespace queries are possible. E.g.:
  ```sql
  -- "What KTX death types fire from rocket_launcher (id1 baseline)?"
  SELECT dr.name, dr.value_text, dr.props_json->>'category' AS category
  FROM gameplay_mechanics dr
  WHERE dr.gameplay_source_id = 'ktx' AND dr.kind = 'death_rule'
    AND dr.props_json->>'related_weapon' = 'rocket_launcher';

  -- "Which election types require admin role?"
  SELECT name FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'election_type'
    AND props_json->>'required_role' = 'any';

  -- "All KTX-introduced death taxonomies (not in id1 baseline)"
  SELECT name, props_json->>'category' AS category
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    AND (props_json->>'ktx_extension')::boolean = true
  ORDER BY 2, 1;
  ```
- `_handler_gameplay_taxonomies.py` is registered in the KTX driver and runs as part of `--handlers all`. The output JSON `ktx-gameplay-taxonomies-ast.json` is regenerated on every per-tag extraction.
- `load-gameplay-taxonomies.ts` is wired into both the standalone `load-ktx-taxonomies` subcommand AND the per-tag pipeline in `extract-tag.ts` (project=ktx). Re-running `extract-tag --project ktx --version <tag>` brings Pass-1 entity rows + Phase-3 modes + Phase-4 taxonomies up to date in one shot.
- Phase 5 (gameplay tables) and Phase 6 (match_event handler) are ready to start. They consume the same `gameplay_mechanics` table and the same `gameplay_source_id='ktx'`. No data dependency on Phase 4 rows.
- Phase 7's validation runbook will gain Phase-4 entries for the F1 quality grid: per-kind counts (election_type=5, death_rule=27), JSONB-typeof regression gate, id1/ktx mutually-exclusive invariant probe, related_weapon FK-join probe, idempotency probe.

## Open questions / deferred items

- **Question:** F8 + Pass 5.4.4 lock the row-count anchor at 27 (with the framing "30 X-macro entries -- dtNONE -- dtUNKNOWN = 27"). Live source-walk shows deathtype.h has 29 X-macro lines (27 substantive + dtNONE + dtUNKNOWN sentinels), not 30. The 27-useful-row anchor is unaffected; the framing was off by one.
  **Default chosen for now:** ship with the 27-row anchor as locked. The handler's `_stats.death_rule.x_macro_lines_total` reports the actual count (29 at canonical 1.46) so audit trail captures the live count without over-promising 30. F8 should be amended in `review-findings.md` post-Phase-4 to read "29 X-macro entries (27 substantive + 2 sentinels) -> 27 useful rows after skipping dtNONE / dtUNKNOWN."
  **Who can resolve:** operator at Phase 4 review time -- the F8 amendment is a documentation correction; no impact on shipped row count.

- **Question:** The drafter prompt's suggested related_weapon mapping uses non-canonical weapon names (e.g., `"rocketlauncher"`, `"supershotgun"`, `"grenadelauncher"`, `"lightning"`). Live id1 baseline (`apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`) carries underscored canonical names: `rocket_launcher`, `super_shotgun`, `grenade_launcher`, `lightning_gun`. The spec's example at line 1150 uses the underscored form (`"rocket_launcher"`).
  **Default chosen for now:** ship the underscored form per the live id1 baseline + the spec example. `DEATH_RULE_PROPS` lock-table uses these names. Phase-boundary Probe 10 is the FK-join check that catches any drift from the live id1 weapon names.
  **Who can resolve:** Phase 4 executor -- the lock-table values must match the id1 baseline at execution time. If the id1 baseline grows new weapon entities or renames any, the lock-table needs an update before Phase 4 runs.

- **Question:** Pass 5.4.4 lists 8 KTX-extension entries (lg_dis, lg_dis_self, hook, fireball, stomp, explo_box, laser, trigger) but the row decomposition into id1_baseline vs ktx_extension also needs to account for `dtSQUISH`. Where does squish go?
  **Default chosen for now:** `dtSQUISH` is `ktx_extension=true`. Crushing damage exists in id1 (movers crushing players is a vanilla-Quake mechanic), but the dtSQUISH taxonomic label is KTX-introduced -- id1 has no per-cause death-type discriminator. The lock-table assigns squish to ktx_extension. Total: 18 id1_baseline + 9 ktx_extension = 27.
  **Who can resolve:** Phase 4 executor -- if a future investigation surfaces a different convention (e.g., squish should be id1_baseline=true since the damage source is vanilla), surface to operator BEFORE shipping; the handler's lock-table value flips and Probe 8 / Probe 9 expected counts shift accordingly.

- **Question:** electType_t `value_text` field carries the dt-prefixed enum tag spelling (e.g., "etCaptain" for the captain election). Pass 5.4.3's row schema specifies this; D9's source-fidelity rule supports it. But the `name` field is the user-readable token (e.g., "captain"). For etSuggestColor and etLateJoin, the user-facing tokens are snake_case (`suggest_color`, `late_join`). Should the underscore form match the command spelling exactly (which is `suggestcolor` / `latejoin`, no underscore) for query parity?
  **Default chosen for now:** ship snake_case (`suggest_color`, `late_join`) for the L1 row name. The command spelling (`suggestcolor`, `latejoin`) lands in `props_json.related_commands_json[]` as the canonical command identifier. The split lets MCP queries use either form: `name='suggest_color'` for the L1 row identity; `props_json.related_commands_json @> '["suggestcolor"]'` for the command-name surface. If concept-note authors flag the divergence as confusing, flip the L1 name to the command spelling and surface in a follow-up.
  **Who can resolve:** Phase 4 executor (lock-in for the first KTX landing) + operator at concept-note authoring time.

- **Question:** The handler's Stage 2 (deathtype.h text parse) runs in `setup()` and is not re-entrant if `setup()` is called twice. Is this a concern?
  **Default chosen for now:** no -- the driver's lifecycle calls `setup()` once per worker before fork, then the per-file walks call `start_file/visit_cursor/end_file/finalize`. Stage 2's one-shot file parse fits the once-per-worker contract. Idempotency by re-execution at the load-side is preserved (running `bun ... load-ktx-taxonomies` twice is a no-op).
  **Who can resolve:** Phase 4 executor (verify the driver's `setup()` semantics match the assumption when wiring up Task 2).

- **Question:** Pattern 10 in EXTRACTOR-PLAYBOOK is documented as "TU-root cursor intercept for MACRO_DEFINITION." This phase reuses the same TU-root intercept mechanic on `CursorKind.ENUM_DECL` (Stage 1: electType_t walk). Stage 2 introduces a wholly separate technique (X-macro file parse, not libclang at all). Should EXTRACTOR-PLAYBOOK be amended in this phase or Phase 8?
  **Default chosen for now:** defer to Phase 8 (end-of-arc obligations). Phase 4 documents both extensions in the handler docstring AND in the Goal section AND in Task 1's docstring guidance. Phase 8's existing PLAYBOOK-amendments scope (per Phase 8 MD's task list) absorbs two new items: (a) broaden Pattern 10's title and "Detection" paragraph to read "TU-root cursor intercept for header-defined declarations -- MACRO_DEFINITION (existing) + ENUM_DECL (added by KTX)"; (b) add a new Pattern 16 entry titled "X-macro file parse for declaration tables whose user-facing tokens are erased by preprocessor expansion" with deathtype.h as the canonical example. Avoids cross-phase doc churn while ensuring the playbook stays current as KTX adds the new techniques.
  **Who can resolve:** Phase 8 executor (mechanical doc-edit task; the rationale is already settled here).

- **Question:** Phase 1's planned migration filenames are `008_ktx_log_template_logfile_channel.sql` / `009_ktx_match_event_type.sql` / `010_ktx_gameplay_kinds.sql`, but the live `apps/qw-oracle/db/migrations/` directory ALREADY contains `008_community_schema.sql` (committed 2026-05-05 in commit `af7f5b5b`). Phase 1's drafter notes the renumber (009/010/011 or equivalent re-sequencing). Phase 4 references "Phase 1's gameplay-kinds widening migration" by FUNCTION (admits `'election_type'`), not by number; Phase 4 is unaffected.
  **Default chosen for now:** Phase 4 references the migration by what it does. Phase 1's executor adjusts numbering as needed; Phase 4's expectations are stable.
  **Who can resolve:** Phase 1 executor (during execution; not a Phase 4 concern).

## Recovery (if verification fails)

- **Probe 1 fails (handler import error):** read the Python error. Most likely causes: `from extractor_lib._visitor import Visitor` path fails because `sys.path.insert` is wrong; OR a module-level constant uses Python 3.10+ syntax the env doesn't support; OR the handler imports a parent-project handler (D3 violation). Cross-check the import block matches the literal shape shipped in Task 1.

- **Probe 2 fails (TS compile error):** read the tsc error. Most likely causes: missing import for `postgres` types; a `tx.json(...)` cast TypeScript rejects; `process` not in scope (Bun-specific). Fix per the error.

- **Probe 3 fails (pytest test fails):** read the test failure. The 8 test cases test distinct facets:
  - `test_election_count_5` fails: handler missed an election entry. Cross-check `ELECTION_TYPE_TOKEN` table covers all 6 enum values minus etNone.
  - `test_death_rule_count_27` fails with N != 27: Stage 2's `_DEATHTYPE_RE` regex didn't match all entries OR sentinel skip is inverted. Inspect `_stats.death_rule` for actual counts.
  - `test_etnone_skipped` / `test_dtnone_dtunknown_skipped` fails: handler emitted a sentinel row -- the `*_SKIP` frozensets weren't checked or the handler ignored them.
  - `test_dtchangelevel_structural` fails: lock-table for dtCHANGELEVEL has the wrong category. Cross-check `DEATH_RULE_PROPS["dtCHANGELEVEL"]` -- it must be `("structural", True, False, None)`.
  - `test_dtrl_related_weapon_underscored` fails: lock-table uses non-canonical weapon name (the drafter prompt's manual mapping was wrong; see Open Question on related_weapon).
  - `test_id1_ktx_flags_mutually_exclusive` fails: a row has both flags True or both False. Inspect `DEATH_RULE_PROPS` lock-table -- every row must have exactly one of the two flags True.
  - `test_etcaptain_required_role` fails: `ELECTION_TYPE_PROPS["etCaptain"]` has the wrong required_role. Cross-check against commands.c:803 (CF_PLAYER -> 'player').

- **Probe 4 fails (election_type count != 5):** count off-by-one or worse. Cause: one row deduped incorrectly OR one row missing from `_handle_election_enum`. Run `SELECT name, value_text FROM gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='election_type' ORDER BY value_text` and diff against the expected 5 dt tags (etCaptain, etCoach, etAdmin, etSuggestColor, etLateJoin).

- **Probe 5 fails (death_rule count != 27):** if too low, the handler missed entries -- inspect `_stats.death_rule.x_macro_lines_total` (should be 29 at canonical 1.46) and `skipped_sentinels` (should be 2). If too high, the handler over-emitted -- check for duplicate rows OR missed sentinels.

- **Probe 6 fails (sentinel skip violated):** an etNone / dtNONE / dtUNKNOWN row is in the DB. The `*_SKIP` frozenset was not consulted before emission. Re-grep the handler for `ELECTION_TYPE_SKIP` and `DEATH_RULE_SKIP` references; ensure both check-and-skip points fire before the row append.

- **Probe 7 fails (dtCHANGELEVEL not structural):** the lock-table's category is wrong. Cross-check `DEATH_RULE_PROPS["dtCHANGELEVEL"]`; the value must be `("structural", True, False, None)`.

- **Probe 8 fails (death_rule category distribution off):** one or more rows have the wrong category. Run `SELECT name, props_json->>'category' FROM gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='death_rule' ORDER BY 2, 1` and diff against the expected per-row mapping in the lock-table.

- **Probe 9 fails (id1/ktx flags collide):** a row has both flags True or both False. Per the design: every death_rule row has exactly one of the two flags set. Inspect the lock-table for the offending row(s).

- **Probe 10 fails (related_weapon FK-join broken):** the handler emitted a related_weapon name that doesn't match an id1 baseline weapon's `name`. Most common cause: handler used the un-underscored shorthand from the drafter prompt's manual list (e.g., `rocketlauncher` instead of `rocket_launcher`). Re-grep `DEATH_RULE_PROPS` for non-underscored weapon spellings; cross-check against `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` for the canonical names.

- **Probe 11 fails (jsonb_typeof returns 'string'):** D14 violation. The loader pre-stringified a JSONB column (`JSON.stringify` slipped in). Re-grep the loader for `JSON.stringify`. Per `feedback_repair_by_reextract_not_sql_update.md`, do NOT SQL-UPDATE the affected rows -- fix the loader bug and re-run the load (it's idempotent; the broken rows get overwritten with correctly-shaped JSONB).

- **Probe 12 fails (non-empty gate on a taxonomies row):** the handler put `{"mode":"X"}` or similar on an election_type / death_rule row. This contradicts Pass 4.3 + Pass 5.4.3 + Pass 5.4.4 (election is subsystem-level, death is universal). Cross-check the handler's row construction; `ruleset_gate_json={}` must be a literal in the row dict for both Stage 1 and Stage 2 outputs.

- **Probe 13 fails (idempotency violated):** the `ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE` clause is wrong. Most likely cause: the `canonicaliseGate` function returns inconsistent key ordering (mirror `load-modes.ts:90-96`'s pattern). Per `feedback_idempotency_before_staleness.md`: inflated row counts on re-run mean re-run idempotency, not stale snapshot.

- **Probe 14 fails (commit missing or working tree dirty):** `git status` to triage; the most likely cause is files were staged but `git commit` failed on a hook. Inspect hook output, fix the underlying issue, re-stage, re-commit.

If any failure resists local recovery, halt and surface to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F7** (election_type row count = 5; skip etNone). Resolved by Tasks 1 + 3 (handler emits 5 rows from electType_t walk via Pattern 10; sentinel skip frozenset honored; loader UPSERTs 5 rows; Phase-boundary Probe 4 asserts the count and Probe 6 asserts the skip).
- **F8** (death_rule row count = 27; skip dtNONE + dtUNKNOWN; keep dtCHANGELEVEL as structural). Resolved by Tasks 1 + 3 (Stage 2 X-macro parse emits 27 rows from deathtype.h; sentinel skip frozenset honored; dtCHANGELEVEL emitted with `category='structural'`; loader UPSERTs 27 rows; Phase-boundary Probes 5 + 6 + 7 + 8 assert the counts, skips, and category).

No findings touched by Phase 4 are deferred. F7 / F8 both ship in this phase. F8's framing (29 vs 30 X-macro lines) gets an audit-trail amendment in `review-findings.md` per the Open Question.

---

*Phase 4 closes the taxonomies-handler arc. Phase 5 (gameplay tables handler -- `_handler_gameplay_tables.py` with monster + score_system + drop_item + loc_macro + teamplay_message rows) and Phase 6 (XSD-driven match_event handler) are mutually independent at the data level and can draft / execute in parallel after this. Phase 7 (validation runbook + F1 quality probes) consumes Phase 4's output rows for cross-project audit. The qw-event-log validation harness anchor for the WeaponType enum is now available at the schema level -- the harness can join parser observations against `gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='death_rule'` rows to verify every observed death type maps to a known taxonomy entry.*
