# Phase 4 -- Gameplay taxonomies handler (election_type + death_rule)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (F7 + F8 -- see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase (Pass 4.3 + Pass 5.3 + Pass 5.4.3 + Pass 5.4.4).
> 4. Source-walk the relevant KTX header files at `research/repos/ktx/include/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine handler / loader as a template. For the handler, MVDSV's `_handler_protocol.py` is the closest precedent (Pattern 10 -- TU-root cursor intercept on header-defined declarations). Port, do not subclass per D3. For the loader, `load-modes.ts` (Phase 3) is the closest analog (gameplay_mechanics two-kind dispatch on `(gameplay_source_id='ktx', kind, name, ruleset_gate_json)`).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section in `phase-template.md`) before declaring the phase MD ready for operator review.

## Goal

Phase 4 lands KTX's two enum-backed gameplay taxonomies as queryable Layer 1 rows. Two deliverables: (1) `_handler_gameplay_taxonomies.py` -- a libclang-driven handler under `apps/qw-oracle/scripts/extractors/ktx/` with two extraction stages: Stage 1 walks the `electType_t` ENUM_DECL in `include/progs.h` using Pattern 10's TU-root cursor intercept mechanic (Pattern 10 is documented in EXTRACTOR-PLAYBOOK.md; the original Pattern 10 was scoped to MACRO_DEFINITION -- Phase 4 reuses the same TU-root intercept mechanic on `CursorKind.ENUM_DECL`, which is the natural widening of the same technique; Phase 8 amends EXTRACTOR-PLAYBOOK to broaden Pattern 10's title to "TU-root cursor intercept for header-defined declarations" and explicitly include ENUM_DECL alongside MACRO_DEFINITION); Stage 2 parses `include/deathtype.h` directly as a text file using regex (NOT libclang) to recover both the dt enum tags and the per-entry string tokens, since the X-macro's second argument (`DEATHTYPE(dtTAG, token)`) is erased from the AST after preprocessor expansion -- the X-macro file is the only recoverable source for the string tokens. Stage 2 is a distinct technique from Pattern 10 -- Phase 8 lands it as Pattern 16 (X-macro file parse) per the Open Question deferral below. The handler emits one `ktx-gameplay-taxonomies-ast.json` containing two arrays: 5 election_type rows (skip etNone sentinel) + 27 death_rule rows (skip dtNONE / dtUNKNOWN sentinels; keep dtCHANGELEVEL with category='structural'); (2) `load-gameplay-taxonomies.ts` -- a postgres-js TS loader that reads the AST JSON and idempotently UPSERTs both arrays into `gameplay_mechanics` keyed on `(gameplay_source_id='ktx', kind, name, ruleset_gate_json)` per D14's JSONB binding rule. All taxonomies rows use `ruleset_gate_json={}` -- elections are subsystem-level (available regardless of active mode); death rules are universal across modes (any mode-restriction lives in `props_json`). Runnable state at boundary: `gameplay_mechanics` holds 5 `kind='election_type'` rows + 27 `kind='death_rule'` rows (all `gameplay_source_id='ktx'`); the qw-event-log validation harness now has a Layer 1 anchor for the WeaponType enum at the schema level.

## Inputs from previous phase

Phase 1 complete:
- Migration 011 (renumbered from D5's original 010 per the `008_community_schema.sql` slot collision documented in decisions.md D5 amendment) widens `gameplay_mechanics.kind` to admit `'election_type'`. The `'death_rule'` kind is already in the v14 CHECK -- 0 widenings needed (per Pass 4.3 schema-cost note).
- `gameplay_sources` row for `'ktx'` exists in dev DB (`gameplay_source_id='ktx'`, seeded by Phase 1 Task 5). `load-gameplay-taxonomies.ts` FK-references this row but does not insert it.

Phase 2 complete:
- KTX driver at `apps/qw-oracle/scripts/extractors/ktx/extract.py` exists with the Pass 1 handlers (cvars / commands / info_keys / log_templates) registered in `ALL_HANDLERS`. Phase 4 adds the `TAXONOMIES` handler entry.
- `apps/qw-oracle/scripts/extractors/ktx/output/` directory exists; Phase 4 writes `ktx-gameplay-taxonomies-ast.json` into it (alongside the four Pass-1 AST JSONs and Phase 3's `ktx-modes-ast.json`).
- `extract-tag.ts` has KTX dispatch wiring for entity types. Phase 4 adds a parallel project-conditional hook for taxonomies loading (not entity-type dispatch -- election_type + death_rule rows target `gameplay_mechanics`, not the entities/per-version surface). The integration point is a `load-ktx-taxonomies` subcommand on `scripts/load-knowledge/index.ts`, mirroring Phase 3's `load-ktx-modes` subcommand.

Phase 3 (modes handler) is independent at the data level -- Phase 4 does NOT depend on Phase 3 having shipped. Both can execute after Phase 1 lands.

Prerequisites from Arc 1 (inherited per `prerequisites.md`):
- Postgres dev container running and reachable.
- `bun --version` >= 1.3 in `apps/qw-oracle/`.
- KTX research repo cloned at `research/repos/ktx/`. Handler reads `include/progs.h` (Stage 1) and `include/deathtype.h` (Stage 2) -- both present at any KTX commit.
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
apps/qw-oracle/scripts/extractors/ktx/extract.py            # register KtxGameplayTaxonomiesHandler in ALL_HANDLERS
apps/qw-oracle/scripts/load-knowledge/index.ts               # add load-ktx-taxonomies subcommand + runLoadKtxTaxonomies wrapper
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts         # call loadTaxonomiesFromFile after entity loaders for project=ktx
```

Note: `extract.py` is created by Phase 2, not Phase 4. Phase 4 only modifies the `ALL_HANDLERS` dict. Phase 4 cannot run until Phase 2 ships.

### Deleted

n/a

## Tasks

### Task 1: Author `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py`

**Goal:** Ship the libclang-driven KTX taxonomies handler that emits the `ktx-gameplay-taxonomies-ast.json` payload (5 election_type rows + 27 death_rule rows, plus a `_stats` block). Inherits from `Visitor` only (D3); two extraction stages cover the two enum types: Stage 1 (libclang-driven) walks `electType_t` ENUM_DECL via Pattern 10; Stage 2 (text-parse-driven) reads `include/deathtype.h` directly to recover the X-macro entries' string tokens.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` with module-level structure mirroring MVDSV's `_handler_protocol.py` shape (project-private handler, imports `extractor_lib._visitor.Visitor` only, no parent-project subclass per D3).

  Module docstring opens with: handler purpose (KTX election_type + death_rule taxonomy extraction), two-stage extraction summary, output filename (`ktx-gameplay-taxonomies-ast.json`), source-file scope.

  Stage 1 note: Pattern 10 in EXTRACTOR-PLAYBOOK is currently documented as "TU-root cursor intercept for MACRO_DEFINITION." Phase 4 reuses the identical TU-root intercept mechanic on `CursorKind.ENUM_DECL` -- same walker bypass trick, different cursor kind. Phase 8 amends the Playbook title and Detection paragraph to cover ENUM_DECL. The handler docstring explicitly notes this so future maintainers understand the cursor-kind extension.

  Stage 2 note: the X-macro pattern erases the second argument from the preprocessed AST. The only recoverable source is the raw text of `include/deathtype.h`. Reading it as bytes + regex is NOT a Pattern 10 variant; it is a wholly distinct technique. Phase 8 lands it as Pattern 16 (X-macro file parse) per the Open Question deferral below.

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

- [ ] Add module-level constants:

  ```python
  HANDLER_NAME = "gameplay_taxonomies"
  OUTPUT_FILENAME = "ktx-gameplay-taxonomies-ast.json"

  # electType_t values per F7 + source-walk (progs.h:219-224).
  # Skip etNone (sentinel at progs.h:219). 5 emitted rows.
  # `name` carries the user-facing token; `value_text` carries the dt enum tag.
  # D9 source-fidelity: etSuggestColor / etLateJoin become snake_case to match
  # the L1 naming convention while keeping related_commands_json at the exact
  # command spelling (suggestcolor / latejoin, no underscore).
  ELECTION_TYPE_TOKEN: dict[str, str] = {
      "etCaptain":       "captain",
      "etCoach":         "coach",
      "etAdmin":         "admin",
      "etSuggestColor":  "suggest_color",
      "etLateJoin":      "late_join",
  }

  ELECTION_TYPE_SKIP: frozenset[str] = frozenset({"etNone"})

  # Per-election props_json defaults. Source: vote.c + commands.c cmds[] cross-walk.
  # Tuple: (description, related_commands_json, required_role)
  # required_role derives from cmds[] CF_* flags:
  #   CF_PLAYER    -> 'player'   (commands.c:803 captain, commands.c:838 latejoin,
  #                               commands.c:805 suggestcolor)
  #   CF_SPECTATOR -> 'spectator' (commands.c:804 coach)
  #   CF_BOTH      -> 'any'       (commands.c:750 admin)
  ELECTION_TYPE_PROPS: dict[str, tuple[str, list[str], str]] = {
      "etCaptain": (
          "Player election to designate team captains",
          ["captain"],
          "player",
      ),
      "etCoach": (
          "Spectator election to designate team coaches",
          ["coach"],
          "spectator",
      ),
      "etAdmin": (
          "Election to grant elected-admin privileges",
          ["admin"],
          "any",
      ),
      "etSuggestColor": (
          "Player vote to suggest a team color change",
          ["suggestcolor"],
          "player",
      ),
      "etLateJoin": (
          "Vote to allow a late-joining player into an in-progress match",
          ["latejoin"],
          "player",
      ),
  }

  # deathType_t categorization per Pass 5.4.4 + source-walk.
  # F8 anchor: 27 substantive entries in deathtype.h (29 total - dtNONE - dtUNKNOWN).
  # Tuple: (category, id1_baseline, ktx_extension, related_weapon)
  # id1_baseline + ktx_extension are mutually exclusive (exactly one True per row).
  # related_weapon matches id1 baseline gameplay_entity_defs.name spellings
  # (underscored form: rocket_launcher / super_shotgun / lightning_gun / etc.)
  # for FK joinability per F8 amendment 2026-05-05.
  DEATH_RULE_PROPS: dict[str, tuple[str, bool, bool, Optional[str]]] = {
      # id1 weapon kills
      "dtAXE":           ("weapon",       True,  False, "axe"),
      "dtSG":            ("weapon",       True,  False, "shotgun"),
      "dtSSG":           ("weapon",       True,  False, "super_shotgun"),
      "dtNG":            ("weapon",       True,  False, "nailgun"),
      "dtSNG":           ("weapon",       True,  False, "super_nailgun"),
      "dtGL":            ("weapon",       True,  False, "grenade_launcher"),
      "dtRL":            ("weapon",       True,  False, "rocket_launcher"),
      "dtLG_BEAM":       ("weapon",       True,  False, "lightning_gun"),
      # KTX weapon refinements
      "dtLG_DIS":        ("weapon",       False, True,  "lightning_gun"),
      "dtLG_DIS_SELF":   ("self",         False, True,  "lightning_gun"),
      "dtHOOK":          ("weapon",       False, True,  None),
      # Structural (fires on map change; kept for qw-event-log harness)
      "dtCHANGELEVEL":   ("structural",   True,  False, None),
      # id1 environment deaths
      "dtLAVA_DMG":      ("environment",  True,  False, None),
      "dtSLIME_DMG":     ("environment",  True,  False, None),
      "dtWATER_DMG":     ("environment",  True,  False, None),
      "dtFALL":          ("environment",  True,  False, None),
      # KTX environment refinements
      "dtSTOMP":         ("environment",  False, True,  None),
      # id1 telefrags
      "dtTELE1":         ("telefrag",     True,  False, None),
      "dtTELE2":         ("telefrag",     True,  False, None),
      "dtTELE3":         ("telefrag",     True,  False, None),
      "dtTELE4":         ("telefrag",     True,  False, None),
      # KTX environment / hazard refinements
      "dtEXPLO_BOX":     ("environment",  False, True,  None),
      "dtLASER":         ("environment",  False, True,  None),
      "dtFIREBALL":      ("environment",  False, True,  None),
      "dtSQUISH":        ("environment",  False, True,  None),
      "dtTRIGGER_HURT":  ("environment",  False, True,  None),
      # id1 self
      "dtSUICIDE":       ("self",         True,  False, None),
  }
  # Expected: 18 id1_baseline rows + 9 ktx_extension rows = 27.
  # Category distribution: weapon=10, environment=10, telefrag=4, self=2, structural=1.

  DEATH_RULE_SKIP: frozenset[str] = frozenset({"dtNONE", "dtUNKNOWN"})

  # X-macro line regex for deathtype.h Stage 2 parse.
  # Matches: DEATHTYPE( dtTAG , token ) -- optional whitespace, trailing comment ok.
  _DEATHTYPE_RE = re.compile(
      r'^\s*DEATHTYPE\s*\(\s*(?P<tag>dt[A-Za-z0-9_]+)\s*,\s*(?P<token>[A-Za-z0-9_]+)\s*\)'
  )
  _TRAILING_COMMENT_RE = re.compile(r'//\s*(.*?)\s*$')
  ```

- [ ] Implement `KtxGameplayTaxonomiesHandler(Visitor)` class. Required attributes / methods:

  - Class attributes: `name = HANDLER_NAME`, `output_filename = OUTPUT_FILENAME`. No `payload_field` -- `finalize()` returns a dict with multiple top-level keys (election_types, death_rules, _stats), mirroring MVDSV's protocol handler return shape.

  - `setup(*, ktx_repo: Path, ktx_src: Path)`: store both paths. Fire Stage 2 eagerly (deathtype.h parse has no dependency on TU walks; one-shot file read at setup time, once per worker):
    ```python
    self._repo_root = ktx_repo
    self._src_root = ktx_src
    self._election_rows: list[dict] = []
    self._election_seen_tags: set[str] = set()
    self._death_rule_rows: list[dict] = []
    self._death_stats: dict = {
        "x_macro_lines_total": 0,
        "skipped_sentinels": 0,
        "unknown_tags": [],
    }
    self._parse_deathtype_h()
    ```

  - `_parse_deathtype_h()`: open `self._repo_root / "include" / "deathtype.h"`, iterate line-by-line (1-indexed). For each line, attempt `_DEATHTYPE_RE.match(line)`. On match: extract tag + token, increment `x_macro_lines_total`. If tag in `DEATH_RULE_SKIP`: increment `skipped_sentinels`, continue. Else: look up `DEATH_RULE_PROPS.get(tag)`. If missing (future tag): emit defensive row with `{"category": "unknown", "id1_baseline": False, "ktx_extension": True, "related_weapon": None}` and append `{"line": line_no, "tag": tag, "token": token}` to `unknown_tags`. Else emit:
    ```python
    category, id1_baseline, ktx_extension, related_weapon = DEATH_RULE_PROPS[tag]
    trailing = _TRAILING_COMMENT_RE.search(line)
    self._death_rule_rows.append({
        "name":              token,
        "kind":              "death_rule",
        "value_text":        tag,
        "source_ref":        f"deathtype.h:{line_no}",
        "ruleset_gate_json": {},
        "props_json": {
            "category":       category,
            "id1_baseline":   id1_baseline,
            "ktx_extension":  ktx_extension,
            "related_weapon": related_weapon,
            "comment":        trailing.group(1) if trailing else None,
        },
    })
    ```
    Source line for each row: 1-indexed line number in deathtype.h (deterministic; one DEATHTYPE per line). At canonical 1.46: `x_macro_lines_total=29`, `skipped_sentinels=2`, `len(death_rule_rows)=27`.

  - `start_file(source_path: Path, source_bytes: bytes)`: store current file context. Initialize per-file election accumulator: `self._election_rows_per_file: list[dict] = []`.

  - `visit_cursor(cursor, variant)`: dispatch only on the TU root cursor (Pattern 10 mechanic). When TU root arrives, its `location.file` is None so the walker's per-file filter passes it through. Scan its children for the `electType_t` ENUM_DECL:
    ```python
    if cursor.kind != CursorKind.TRANSLATION_UNIT:
        return
    for child in cursor.get_children():
        if child.kind == CursorKind.ENUM_DECL and child.spelling == "electType_t":
            self._handle_election_enum(child)
            return  # one electType_t per TU; stop on first hit
    ```

  - `_handle_election_enum(enum_cursor)`: walk the enum's `EnumConstantDecl` children:
    ```python
    for child in enum_cursor.get_children():
        tag = child.spelling
        if tag in ELECTION_TYPE_SKIP:
            continue
        if tag in self._election_seen_tags:
            continue
        if tag not in ELECTION_TYPE_TOKEN:
            # Unknown future tag -- defensive emit
            token = tag.removeprefix("et").lower()
            description = f"Unknown election type {tag}"
            related_commands, required_role = [], "any"
        else:
            token = ELECTION_TYPE_TOKEN[tag]
            description, related_commands, required_role = ELECTION_TYPE_PROPS[tag]
        line = child.location.line
        self._election_rows_per_file.append({
            "name":              token,
            "kind":              "election_type",
            "value_text":        tag,
            "source_ref":        f"progs.h:{line}",
            "ruleset_gate_json": {},
            "props_json": {
                "description":           description,
                "related_commands_json": related_commands,
                "required_role":         required_role,
            },
        })
        self._election_seen_tags.add(tag)
    ```

  - `end_file()`: return `self._election_rows_per_file` and reset it. Per-file rows feed the cross-file accumulator via the driver's standard `all_rows[handler.name].extend(rows)` mechanic; `finalize()` receives the flat list.

  - `finalize(all_rows, repo_root: Path) -> dict`: cross-file dedup of election rows by `value_text` (first-wins; same `electType_t` is visible from every .c file's TU include closure). Stable sort: election rows by `name` ascending; death rows remain in deathtype.h source order (deduplication not needed; Stage 2 produces them once per worker at setup time and the driver merges per-worker lists -- each worker sees the same file, so dedup by value_text is also needed for death_rule cross-worker consolidation):
    ```python
    raw_election = (
        all_rows.get(self.name, []) if isinstance(all_rows, dict) else all_rows
    )
    seen_election: set[str] = set()
    unique_election: list[dict] = []
    for r in raw_election:
        if r["value_text"] in seen_election:
            continue
        seen_election.add(r["value_text"])
        unique_election.append(r)
    unique_election.sort(key=lambda r: r["name"])

    # death_rules: each worker produced the same rows from deathtype.h;
    # dedup by value_text (first-wins) in case multiple workers merged.
    seen_death: set[str] = set()
    unique_death: list[dict] = []
    for r in self._death_rule_rows:
        if r["value_text"] in seen_death:
            continue
        seen_death.add(r["value_text"])
        unique_death.append(r)

    by_role: dict[str, int] = {}
    for r in unique_election:
        role = r["props_json"]["required_role"]
        by_role[role] = by_role.get(role, 0) + 1

    by_category: dict[str, int] = {}
    for r in unique_death:
        cat = r["props_json"]["category"]
        by_category[cat] = by_category.get(cat, 0) + 1

    return {
        "election_types": unique_election,
        "death_rules":    unique_death,
        "_stats": {
            "election_type": {
                "source_total":   len(raw_election),
                "count":          len(unique_election),
                "expected":       5,
                "by_required_role": by_role,
            },
            "death_rule": {
                "x_macro_lines_total": self._death_stats["x_macro_lines_total"],
                "skipped_sentinels":   self._death_stats["skipped_sentinels"],
                "count":               len(unique_death),
                "expected":            27,
                "by_category":         by_category,
                "unknown_tags":        self._death_stats["unknown_tags"],
            },
        },
    }
    ```

- [ ] Run syntax sanity pass:
  ```bash
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler; print('ok')"
  ```
  Expected: prints `ok`.

**Verification:**
- `test -f apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` exits 0.
- Import probe above prints `ok`.
- `grep -nE "^class .*\(Visitor\):" apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py | grep -c "KtxGameplayTaxonomiesHandler"` returns `1` (inherits from Visitor only, D3).
- `grep -n "from _handler_" apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` returns 0 (no parent-project subclassing, D3).
- PASS condition: file present + clean import + class shape correct + no D3 violations.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across one new Python file (~280 lines). Two-stage extraction (libclang ENUM_DECL TU-root intercept + direct file parse); contained shape; mirrors MVDSV protocol handler pattern. Mechanical implementation requiring reasoning (clear spec, two stages, well-defined data shapes).

---

### Task 2: Register `KtxGameplayTaxonomiesHandler` in `extract.py`

**Goal:** Add the handler to the KTX driver's `ALL_HANDLERS` dict so `--handlers all` (or `--handlers gameplay_taxonomies`) runs it. Mirrors Phase 3's modes-handler registration.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/extract.py` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/extractors/ktx/extract.py`. Locate `ALL_HANDLERS` (Phase 2 registered cvars / commands / info_keys / log_templates; Phase 3 adds MODES). Add the TAXONOMIES entry adjacent to the others:

  ```python
  from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler

  ALL_HANDLERS: dict[str, type[Visitor]] = {
      # ... Phase-2 entries ...
      # ... Phase-3 modes entry ...
      "gameplay_taxonomies": KtxGameplayTaxonomiesHandler,
  }
  ```

  Mirror whatever import guard style Phase 2 / Phase 3 established (try/except ImportError if present).

- [ ] Verify the handler name appears in `--help`:
  ```bash
  python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --help
  ```
  Expected: `gameplay_taxonomies` in the handler-name list.

**Verification:**
- `grep -n "gameplay_taxonomies\|KtxGameplayTaxonomiesHandler" apps/qw-oracle/scripts/extractors/ktx/extract.py` returns at least 2 matches (import + dict entry).
- PASS condition: handler discoverable via `--help`.
- FAIL condition: handler missing OR `--help` raises import error.

**Execution mode:** `inline` -- two-line additions to an existing file with literal content shipped above.

---

### Task 3: Author `apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts`

**Goal:** Ship the TS loader that reads `ktx-gameplay-taxonomies-ast.json` and idempotently UPSERTs both row arrays into `gameplay_mechanics`. Mirrors `load-modes.ts` shape with two-kind dispatch (election_type + death_rule).

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts` (created)

**Steps:**

- [ ] Create the file with the following full content:

  ```ts
  // Loader for KTX gameplay-taxonomies rows (election_type + death_rule).
  // Reads ktx-gameplay-taxonomies-ast.json; idempotently UPSERTs both kinds
  // into gameplay_mechanics keyed on
  // (gameplay_source_id='ktx', kind, name, ruleset_gate_json).
  //
  // D14 JSONB binding: every JSONB column passes its JS value via tx.json(...).
  // NEVER pre-stringify (legacy SQLite-era stringify bug).
  // D15 idempotency: ON CONFLICT DO UPDATE; re-run is a no-op.
  //
  // Preconditions:
  //   1. gameplay_sources row 'ktx' must exist (Phase 1 Task 5).
  //   2. gameplay_mechanics.kind CHECK must include 'election_type' (Phase 1
  //      gameplay-kind widening migration 011). 'death_rule' already in v14 CHECK.
  //
  // Sanity gates:
  //   - F7 hard-fail: total election_type rows < 5 throws.
  //   - F8 hard-fail: total death_rule rows < 27 throws.

  import { readFileSync } from 'node:fs';
  import type postgres from 'postgres';

  const KTX_GAMEPLAY_SOURCE_ID = 'ktx' as const;

  interface ElectionTypeRow {
    name: string;
    kind: 'election_type';
    value_text: string;
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

    const sourceRows = await sql<{ id: string }[]>`
      SELECT id FROM gameplay_sources WHERE id = ${KTX_GAMEPLAY_SOURCE_ID}
    `;
    if (sourceRows.length === 0) {
      throw new Error(
        `gameplay_sources row 'ktx' not found. Phase 1 Task 5 must run before ` +
        `load-gameplay-taxonomies.`,
      );
    }

    await sql.begin(async (tx) => {
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

    if (result.total.election_type < 5) {
      throw new Error(
        `load-gameplay-taxonomies: election_type count ${result.total.election_type} < 5 ` +
        `expected (F7 anchor).`,
      );
    }
    if (result.total.death_rule < 27) {
      throw new Error(
        `load-gameplay-taxonomies: death_rule count ${result.total.death_rule} < 27 ` +
        `expected (F8 anchor).`,
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

**Verification:**
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts` exits 0.
- `grep -n "JSON.stringify" apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts | wc -l` returns `0` (no D14-violating pre-stringify).
- `grep -c "ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json)" apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts` returns at least `2` (one per kind).
- PASS condition: clean compile + JSONB binding correct + both UPSERTs present + precondition check present.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across one new TS file mirroring `load-modes.ts` shape with two-kind dispatch. Mechanical implementation; full file content shipped inline above.

---

### Task 4: Wire `load-ktx-taxonomies` subcommand in `index.ts`

**Goal:** Surface the loader on the CLI so `bun scripts/load-knowledge --help` lists it and `bun scripts/load-knowledge load-ktx-taxonomies [--json <path>]` runs it. Mirrors Phase 3's `load-ktx-modes` subcommand.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/index.ts` (modified)

**Steps:**

- [ ] Locate the subcommand-dispatch block in `index.ts` (post-Phase-3 it carries `load-ktx-modes`). Add adjacent dispatch:

  ```ts
  if (subcommand === 'load-ktx-taxonomies') { await runLoadKtxTaxonomies(rest); return; }
  ```

- [ ] Add help-text line in the usage printer:

  ```
    load-ktx-taxonomies [--json <path>]
  ```

- [ ] Implement `runLoadKtxTaxonomies` wrapper adjacent to the existing `runLoadKtxModes`:

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
        console.error(`STOP - election_type count below F7 anchor 5 (got ${r.total.election_type}).`);
        process.exitCode = 2;
      }
      if (r.total.death_rule < 27) {
        console.error(`STOP - death_rule count below F8 anchor 27 (got ${r.total.death_rule}).`);
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
- `bun apps/qw-oracle/scripts/load-knowledge/index.ts --help` lists `load-ktx-taxonomies`.
- `grep -n "load-ktx-taxonomies\|runLoadKtxTaxonomies\|loadTaxonomiesFromFile" apps/qw-oracle/scripts/load-knowledge/index.ts` returns at least 4 matches.
- PASS condition: subcommand discoverable + dispatches without error.
- FAIL condition: subcommand absent OR runtime error in wrapper.

**Execution mode:** `inline` -- targeted additions to an existing file with full content shipped above.

---

### Task 5: Wire load-ktx-taxonomies into the per-tag pipeline in `extract-tag.ts`

**Goal:** When `extractTag()` runs for `project='ktx'`, after the entity-loader loop and Phase 3's modes-load step, also call `loadTaxonomiesFromFile` so a single `extract-tag --project ktx --version <tag>` lands all KTX rows atomically.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` (modified)

**Steps:**

- [ ] Locate the per-project post-entity-loader block for KTX (post-Phase-3 it has the modes-load step). Add adjacent:

  ```ts
  // Phase 4 (KTX onboarding): load election_type + death_rule rows.
  // existsSync guard: safe to land before the taxonomies handler runs end-to-end.
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
        `skipping taxonomies loading.`,
      );
    }
  }
  ```

**Verification:**
- `grep -n "ktx-gameplay-taxonomies-ast.json\|loadTaxonomiesFromFile" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` returns at least 2 matches.
- `bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` exits 0.
- PASS condition: hook present + clean compile.
- FAIL condition: hook missing OR compile error.

**Execution mode:** `inline` -- one block-add to an existing file with full content shipped above.

---

### Task 6: Author `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py`

**Goal:** Land a pytest-shaped sanity test that runs the handler end-to-end against the live KTX repo, asserting:
1. Election count = 5 (F7 anchor).
2. Death rule count = 27 (F8 anchor).
3. `etNone` is NOT emitted (sentinel skip).
4. `dtNONE` and `dtUNKNOWN` are NOT emitted (sentinel skips).
5. `dtCHANGELEVEL` IS emitted with `props_json.category == 'structural'`.
6. `dtRL` row has `props_json.related_weapon == 'rocket_launcher'` (FK joinability spot check).
7. All death_rule rows have exactly one of `id1_baseline` / `ktx_extension` True (mutually exclusive invariant).
8. `etCaptain` row has `props_json.required_role == 'player'`.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py` (created)

**Steps:**

- [ ] Ensure the tests directory exists (idempotent -- Phase 3 may have created it already):
  ```bash
  mkdir -p apps/qw-oracle/scripts/extractors/ktx/tests/
  ```

- [ ] Create the test file:

  ```python
  """Phase 4 sanity test: KtxGameplayTaxonomiesHandler F7/F8 anchors."""
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
          f"KTX repo not at {KTX_REPO}; clone research/repos/ktx to run.",
          allow_module_level=True,
      )

  from clang.cindex import Config, Index
  Config.set_library_file("libclang-18.so.1")

  from extractor_lib.clang_config import PARSE_OPTS, clang_args_ktx_for
  from extractor_lib._visitor import walk_tu_dispatch
  from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler


  @pytest.fixture(scope="module")
  def handler_output():
      handler = KtxGameplayTaxonomiesHandler()
      handler.setup(ktx_repo=KTX_REPO, ktx_src=KTX_REPO / "src")

      idx = Index.create()
      args = clang_args_ktx_for(str(KTX_REPO / "src"))
      target = KTX_REPO / "src" / "world.c"
      tu = idx.parse(str(target), args=args, options=PARSE_OPTS)
      source_bytes = target.read_bytes()
      handler.start_file(source_path=target, source_bytes=source_bytes)
      walk_tu_dispatch(tu, [handler], "server", str(target))
      rows = handler.end_file()

      all_rows = {handler.name: list(rows)}
      return handler.finalize(all_rows=all_rows, repo_root=KTX_REPO)


  def test_election_count_5(handler_output):
      assert len(handler_output["election_types"]) == 5


  def test_death_rule_count_27(handler_output):
      assert len(handler_output["death_rules"]) == 27


  def test_etnone_skipped(handler_output):
      hits = [r for r in handler_output["election_types"] if r["value_text"] == "etNone"]
      assert hits == []


  def test_dtnone_dtunknown_skipped(handler_output):
      sentinels = [
          r for r in handler_output["death_rules"]
          if r["value_text"] in ("dtNONE", "dtUNKNOWN")
      ]
      assert sentinels == []


  def test_dtchangelevel_structural(handler_output):
      cl = next(
          (r for r in handler_output["death_rules"] if r["value_text"] == "dtCHANGELEVEL"),
          None,
      )
      assert cl is not None, "dtCHANGELEVEL must be present"
      assert cl["props_json"]["category"] == "structural"


  def test_dtrl_related_weapon_underscored(handler_output):
      rl = next(
          (r for r in handler_output["death_rules"] if r["value_text"] == "dtRL"),
          None,
      )
      assert rl is not None
      assert rl["props_json"]["related_weapon"] == "rocket_launcher"


  def test_id1_ktx_flags_mutually_exclusive(handler_output):
      bad = [
          r for r in handler_output["death_rules"]
          if r["props_json"]["id1_baseline"] == r["props_json"]["ktx_extension"]
      ]
      assert bad == [], f"Mutually-exclusive violation: {[(r['name'], r['props_json']) for r in bad]}"


  def test_etcaptain_required_role(handler_output):
      cap = next(
          (r for r in handler_output["election_types"] if r["value_text"] == "etCaptain"),
          None,
      )
      assert cap is not None
      assert cap["props_json"]["required_role"] == "player"
  ```

- [ ] Run the test:
  ```bash
  cd apps/qw-oracle/scripts/extractors/ktx && python3 -m pytest tests/test_handler_gameplay_taxonomies.py -v
  ```
  Expected: all 8 pass (or skip with documented reason if repo absent).

**Verification:**
- `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py -v` exits 0 with all 8 assertions green.
- PASS condition: pytest exit 0; all assertions pass.
- FAIL condition: any assertion fails or skip without documented reason.

**Execution mode:** `subagent (Sonnet medium)` -- new test file with 8 end-to-end assertions; libclang + handler + pytest interplay is non-trivial; handler must run against live KTX repo.

---

### Task 7: Per-row verification probes (dev DB)

**Goal:** Verify rows landed in dev DB match F7 / F8 anchors + JSONB-binding regression gate. SQL probes; copy-paste into psql.

**Files:** n/a (transient SELECT queries).

**Steps:**

- [ ] Election count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'election_type'"
  ```
  Expected: `5`.

- [ ] Death rule count probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'"
  ```
  Expected: `27`.

- [ ] Sentinel skip probe (election):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, value_text FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'election_type'
      AND value_text = 'etNone'"
  ```
  Expected: 0 rows.

- [ ] Sentinel skip probe (death):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, value_text FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
      AND value_text IN ('dtNONE', 'dtUNKNOWN')"
  ```
  Expected: 0 rows.

- [ ] dtCHANGELEVEL category probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT name, value_text, props_json->>'category' AS category
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
      AND value_text = 'dtCHANGELEVEL'"
  ```
  Expected: 1 row -- `changelevel | dtCHANGELEVEL | structural`.

- [ ] Category distribution probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT props_json->>'category' AS category, count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    GROUP BY 1 ORDER BY 1"
  ```
  Expected:
  - `environment | 10`
  - `self        | 2`
  - `structural  | 1`
  - `telefrag    | 4`
  - `weapon      | 10`

- [ ] id1_baseline / ktx_extension distribution probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT
      (props_json->>'id1_baseline')::boolean  AS id1,
      (props_json->>'ktx_extension')::boolean AS ktx,
      count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    GROUP BY 1, 2 ORDER BY 1 DESC, 2 DESC"
  ```
  Expected: 2 rows -- `t | f | 18` and `f | t | 9`. No `t | t` or `f | f` rows.

- [ ] related_weapon FK-join probe:
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
  Expected: `0` (every non-NULL related_weapon resolves to an id1 baseline weapon row).

- [ ] JSONB-binding regression probe (D14):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT jsonb_typeof(ruleset_gate_json) AS gate_type,
           jsonb_typeof(props_json) AS props_type, count(*)
    FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('election_type', 'death_rule')
    GROUP BY 1, 2 ORDER BY 1, 2"
  ```
  Expected: every row has `gate_type='object'` AND `props_type='object'`. Any `'string'` -> CRITICAL FAIL.

- [ ] Empty-gate invariant probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('election_type', 'death_rule')
      AND ruleset_gate_json != '{}'::jsonb"
  ```
  Expected: `0`.

- [ ] Idempotency probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('election_type', 'death_rule')" > /tmp/p4_count_a.txt
  bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-taxonomies
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
    SELECT count(*) FROM gameplay_mechanics
    WHERE gameplay_source_id = 'ktx'
      AND kind IN ('election_type', 'death_rule')" > /tmp/p4_count_b.txt
  diff /tmp/p4_count_a.txt /tmp/p4_count_b.txt
  ```
  Expected: diff is empty (D15 idempotency holds).

**Verification:**
- All 11 probes return expected results.
- PASS condition: counts match anchors + sentinel skips + structural + category distribution + flags mutually exclusive + FK join + JSONB binding all object + empty gates + idempotency.
- FAIL condition: any probe deviates.

**Execution mode:** `inline` -- pure SQL probes; the executor copy-pastes into psql.

---

### Task 8: Single commit landing all Phase 4 changes

**Goal:** Commit Phase 4 as one coherent unit per D16 (phase atomicity). Per D20: directly to `main`, no PR ceremony.

**Files:** all the above (creates + modifies).

**Steps:**

- [ ] Stage new + modified files:
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

- [ ] Commit:
  ```
  arc(ktx): Phase 4 -- gameplay taxonomies handler (election_type + death_rule)

  Two-stage handler _handler_gameplay_taxonomies.py:

  Stage 1 (libclang Pattern 10 extended to ENUM_DECL):
  - TU-root cursor intercept on electType_t in include/progs.h.
  - Walks EnumConstantDecl children; skips etNone sentinel.
  - 5 election_type rows: captain / coach / admin / suggest_color / late_join.
  - Props: description / related_commands_json / required_role.

  Stage 2 (X-macro file parse -- future Pattern 16):
  - Direct text parse of include/deathtype.h via regex; libclang cannot
    recover the X-macro's second argument after preprocessor expansion.
  - 29 X-macro lines - dtNONE - dtUNKNOWN = 27 death_rule rows.
  - dtCHANGELEVEL kept with category='structural' for qw-event-log harness.
  - Props: category / id1_baseline / ktx_extension / related_weapon.
  - id1_baseline + ktx_extension mutually exclusive: 18 id1 + 9 KTX = 27.
  - related_weapon uses id1-baseline underscored names (rocket_launcher,
    super_shotgun, lightning_gun, etc.) for FK joinability.

  Loader load-gameplay-taxonomies.ts: idempotent UPSERT into
  gameplay_mechanics on (gameplay_source_id='ktx', kind, name,
  ruleset_gate_json). JSONB via tx.json() (D14). Hard-fail at < 5
  election_type and < 27 death_rule rows.

  Wiring: extract.py ALL_HANDLERS + index.ts subcommand + extract-tag.ts
  per-tag pipeline hook. Tests: 8 end-to-end pytest assertions.

  qw-event-log validation harness anchor for WeaponType enum is now
  available at the schema level (F7 + F8 resolved).
  ```

- [ ] Push to origin.

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status --short` is empty.
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes OR push fails.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at end of Phase 4. YES/NO answers:

**1. Handler file present + imports clean.**
```bash
test -f apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py && \
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler; print('ok')"
```
- PASS condition: prints `ok`.
- FAIL condition: ImportError or file missing.

**2. Loader file present + clean compile.**
```bash
test -f apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts && \
  bunx tsc --noEmit apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts
```
- PASS condition: tsc exits 0.
- FAIL condition: tsc errors.

**3. Pytest sanity tests pass.**
```bash
cd apps/qw-oracle/scripts/extractors/ktx && \
  python3 -m pytest tests/test_handler_gameplay_taxonomies.py -v
```
- PASS condition: pytest exits 0; all 8 cases pass.
- FAIL condition: any case fails.

**4. election_type count = 5 (F7 anchor).**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'election_type'"
```
- PASS condition: returns `5`.
- FAIL condition: anything else.

**5. death_rule count = 27 (F8 anchor).**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'"
```
- PASS condition: returns `27`.
- FAIL condition: anything else.

**6. Sentinel skips honored.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND value_text IN ('etNone', 'dtNONE', 'dtUNKNOWN')"
```
- PASS condition: returns `0`.
- FAIL condition: any non-zero count.

**7. dtCHANGELEVEL is structural.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT props_json->>'category' FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    AND value_text = 'dtCHANGELEVEL'"
```
- PASS condition: returns `structural` (one row).
- FAIL condition: 0 rows or anything other than `structural`.

**8. death_rule category distribution matches lock-table.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT props_json->>'category' AS category, count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
  GROUP BY 1 ORDER BY 1"
```
- PASS condition: exactly 5 rows: `environment|10`, `self|2`, `structural|1`, `telefrag|4`, `weapon|10`.
- FAIL condition: counts deviate or category missing.

**9. id1_baseline / ktx_extension mutually exclusive.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    AND (props_json->>'id1_baseline')::boolean = (props_json->>'ktx_extension')::boolean"
```
- PASS condition: returns `0`.
- FAIL condition: any non-zero count. CRITICAL.

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
- PASS condition: returns `0` (all non-NULL related_weapon values resolve).
- FAIL condition: any non-zero count. Most likely cause: handler used non-underscored weapon name shorthand.

**11. JSONB-binding regression gate (D14).**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT jsonb_typeof(ruleset_gate_json) AS gate_type,
         jsonb_typeof(props_json) AS props_type, count(*)
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('election_type', 'death_rule')
  GROUP BY 1, 2 ORDER BY 1, 2"
```
- PASS condition: every row has `gate_type='object'` AND `props_type='object'`.
- FAIL condition: any `'string'`. CRITICAL: legacy stringify bug (D14).

**12. Empty ruleset_gate_json on every taxonomies row.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('election_type', 'death_rule')
    AND ruleset_gate_json != '{}'::jsonb"
```
- PASS condition: returns `0`.
- FAIL condition: non-zero count.

**13. Idempotent re-run.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('election_type', 'death_rule')" > /tmp/p4_count_a.txt
bun apps/qw-oracle/scripts/load-knowledge/index.ts load-ktx-taxonomies
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c "
  SELECT count(*) FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx'
    AND kind IN ('election_type', 'death_rule')" > /tmp/p4_count_b.txt
diff /tmp/p4_count_a.txt /tmp/p4_count_b.txt
```
- PASS condition: diff is empty (D15 idempotency holds).
- FAIL condition: counts differ.

**14. Phase 4 commit landed cleanly.**
```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 4; `git status --short` is empty.
- FAIL condition: working tree dirty OR commit missing.

If all 14 probes pass, Phase 4 is done. Phase 5 (gameplay tables handler) and Phase 6 (XSD match_event handler) are mutually independent at the data level; they can draft / execute in parallel after this.

## Outputs to next phase

After Phase 4 ships:

- `gameplay_mechanics` holds 5 `kind='election_type'` rows (all `gameplay_source_id='ktx'`, `ruleset_gate_json={}`) with props covering description / related_commands_json / required_role per Pass 5.4.3.
- `gameplay_mechanics` holds 27 `kind='death_rule'` rows (all `gameplay_source_id='ktx'`, `ruleset_gate_json={}`) with props covering category / id1_baseline / ktx_extension / related_weapon per Pass 5.4.4. dtCHANGELEVEL present with `category='structural'`; dtNONE / dtUNKNOWN absent.
- The qw-event-log validation harness has a Layer 1 anchor for the WeaponType enum. The `id1_baseline` / `ktx_extension` flags segment "should fire on id1 demos" vs "only fires on KTX demos." The harness can JOIN parser death-event observations against `gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='death_rule'`.
- Cross-namespace queries available. Examples:
  ```sql
  -- "What KTX death types fire from rocket_launcher?"
  SELECT name, value_text, props_json->>'category'
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    AND props_json->>'related_weapon' = 'rocket_launcher';

  -- "All KTX-introduced death taxonomy refinements"
  SELECT name, props_json->>'category'
  FROM gameplay_mechanics
  WHERE gameplay_source_id = 'ktx' AND kind = 'death_rule'
    AND (props_json->>'ktx_extension')::boolean = true
  ORDER BY 2, 1;
  ```
- `_handler_gameplay_taxonomies.py` is registered in the KTX driver. `load-gameplay-taxonomies.ts` is wired into both the standalone `load-ktx-taxonomies` subcommand AND `extract-tag.ts`. Re-running `extract-tag --project ktx --version <tag>` brings Pass-1 entity rows + Phase-3 modes + Phase-4 taxonomies up to date in one shot.
- Phase 5 (gameplay tables) and Phase 6 (match_event handler) are ready. They target the same `gameplay_mechanics` table and `gameplay_source_id='ktx'`; no data dependency on Phase 4 rows.
- Phase 7's validation runbook gains Phase-4 entries for the F1 quality grid: per-kind counts (election_type=5, death_rule=27), JSONB-typeof regression gate, id1/ktx mutual-exclusivity probe, related_weapon FK-join probe, idempotency probe.

## Open questions / deferred items

- **Question:** F8 + Pass 5.4.4 framed the X-macro count as "30 entries (28 substantive + dtNONE + dtUNKNOWN)." Live source-walk at canonical 1.46 shows 29 lines in deathtype.h (27 substantive + 2 sentinels). The 27-useful-row anchor is unaffected; only the framing was off by one.
  **Default chosen for now:** ship with 27-row anchor as locked. `_stats.death_rule.x_macro_lines_total` reports the live count (29) for audit trail. F8 gets an amendment in `review-findings.md` post-Phase-4: "29 X-macro lines (27 substantive + 2 sentinels) -> 27 useful rows."
  **Who can resolve:** operator at Phase 4 review time (documentation correction only; no row count impact).

- **Question:** The drafter prompt's related_weapon manual list uses non-canonical shorthand ("supershotgun", "rocketlauncher", "lightning"). Live id1 baseline uses underscored names (super_shotgun, rocket_launcher, lightning_gun).
  **Default chosen for now:** ship the underscored form per the live id1 baseline seeds + spec example at line 1150. `DEATH_RULE_PROPS` lock-table uses underscored names. Phase-boundary Probe 10 is the FK-join check that catches any drift.
  **Who can resolve:** Phase 4 executor confirms the lock-table values match the id1 baseline at execution time.

- **Question:** dtSQUISH categorization -- crushing damage exists in id1, but the dtSQUISH taxonomic label is KTX-introduced. id1_baseline or ktx_extension?
  **Default chosen for now:** `ktx_extension=True` (the taxonomic label is KTX-introduced; the damage mechanic is vanilla but wasn't separately discriminated in id1's death accounting). Lock-table assigns squish to ktx_extension. Total remains 18 id1_baseline + 9 ktx_extension = 27.
  **Who can resolve:** Phase 4 executor; if squish should flip to id1_baseline, Probe 8 expected counts shift from `environment|10` to `environment|10` (net-neutral) but Probe 9's `t|f|18` / `f|t|9` distribution shifts accordingly.

- **Question:** etSuggestColor and etLateJoin: should the L1 row `name` match the command spelling exactly (`suggestcolor`, `latejoin`) rather than snake_case (`suggest_color`, `late_join`)?
  **Default chosen for now:** ship snake_case for the L1 row name (D9 source-fidelity: conventional token form). Command spelling lives in `props_json.related_commands_json[]` as the exact command identifier. This allows MCP queries on `name='suggest_color'` for entity identity and `props_json.related_commands_json @> '["suggestcolor"]'` for command-name lookup. If concept-note authors flag the divergence, flip the L1 name in a follow-up.
  **Who can resolve:** Phase 4 executor (locks for the first KTX landing) + operator at concept-note authoring time.

- **Question:** Pattern 10 in EXTRACTOR-PLAYBOOK currently documents "TU-root cursor intercept for MACRO_DEFINITION." Phase 4 extends the same mechanic to ENUM_DECL. Stage 2 introduces X-macro file parse (Pattern 16 candidate). Should the Playbook be amended in this phase?
  **Default chosen for now:** defer to Phase 8. Phase 4 documents both extensions in the handler docstring, the Goal section, and Task 1. Phase 8's existing PLAYBOOK-amendments scope absorbs: (a) broaden Pattern 10 title + Detection paragraph to include ENUM_DECL; (b) add Pattern 16 (X-macro file parse) with deathtype.h as the canonical example.
  **Who can resolve:** Phase 8 executor (mechanical doc-edit; rationale settled here).

## Recovery (if verification fails)

- **Probe 1 (import error):** read Python error. Likely: wrong `sys.path.insert` order; Python 3.10+ union-type syntax in older env; D3 violation (imported a parent-project handler). Cross-check Task 1's import block.

- **Probe 2 (tsc error):** read tsc output. Likely: missing postgres type import; `tx.json(...)` cast rejected; `process` not in scope (Bun-specific). Fix per error.

- **Probe 3 (pytest failure):**
  - `test_election_count_5` fails: check `ELECTION_TYPE_TOKEN` covers all 6 progs.h values minus etNone.
  - `test_death_rule_count_27` fails: inspect `_stats.death_rule.x_macro_lines_total` -- should be 29. Check `_DEATHTYPE_RE` regex matches all 27 non-sentinel lines.
  - `test_etnone_skipped` / `test_dtnone_dtunknown_skipped` fails: `ELECTION_TYPE_SKIP` / `DEATH_RULE_SKIP` frozenset not consulted before row append.
  - `test_dtchangelevel_structural` fails: `DEATH_RULE_PROPS["dtCHANGELEVEL"]` tuple must be `("structural", True, False, None)`.
  - `test_dtrl_related_weapon_underscored` fails: lock-table has non-underscored shorthand for dtRL. Cross-check `DEATH_RULE_PROPS["dtRL"][3] == "rocket_launcher"`.
  - `test_id1_ktx_flags_mutually_exclusive` fails: a lock-table row has both flags equal. Inspect all 27 entries.
  - `test_etcaptain_required_role` fails: `ELECTION_TYPE_PROPS["etCaptain"][2]` must be `"player"` (CF_PLAYER at commands.c:803).

- **Probe 4 (election count != 5):** run `SELECT name, value_text FROM gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='election_type' ORDER BY value_text` and diff against expected 5 tags. Check handler's `_handle_election_enum` for missed or double-emitted entries.

- **Probe 5 (death count != 27):** if low: inspect `_stats.death_rule.x_macro_lines_total` (expected 29) and `skipped_sentinels` (expected 2). If high: check for duplicate rows or missed sentinel filter.

- **Probe 6 (sentinel skip violated):** grep handler for `ELECTION_TYPE_SKIP` and `DEATH_RULE_SKIP`; verify both checks fire before row append in `_handle_election_enum` and `_parse_deathtype_h`.

- **Probe 7 (dtCHANGELEVEL not structural):** cross-check `DEATH_RULE_PROPS["dtCHANGELEVEL"]` -- must be `("structural", True, False, None)`.

- **Probe 8 (category distribution off):** run `SELECT name, props_json->>'category' FROM gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='death_rule' ORDER BY 2, 1` and diff against the lock-table's expected per-row values.

- **Probe 9 (id1/ktx flags collide):** inspect `DEATH_RULE_PROPS` for the offending row. Every entry must have exactly one of the two tuple booleans True.

- **Probe 10 (related_weapon FK-join broken):** handler emitted a non-underscored weapon name. Re-grep `DEATH_RULE_PROPS` for entries using "rocketlauncher", "supershotgun", etc.; replace with underscore form per id1 baseline.

- **Probe 11 (jsonb_typeof returns 'string'):** D14 violation. Re-grep loader for `JSON.stringify`. Per `feedback_repair_by_reextract_not_sql_update.md`, fix the loader and re-run (idempotent; broken rows overwritten with correct JSONB).

- **Probe 12 (non-empty gate on taxonomies row):** handler put a non-empty `ruleset_gate_json` on an election_type / death_rule row. Both Stage 1 and Stage 2 row constructions must have `"ruleset_gate_json": {}` as a literal.

- **Probe 13 (idempotency violated):** `ON CONFLICT` clause is mis-keyed or `canonicaliseGate` returns inconsistent key ordering across runs. Mirror `load-modes.ts`'s `canonicaliseGate` function exactly.

- **Probe 14 (commit missing or dirty):** `git status` to triage; likely a pre-commit hook failure. Investigate hook output, fix underlying issue, re-stage and re-commit.

If any failure resists local recovery, halt and surface to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F7** (election_type row count = 5; skip etNone). Resolved by Tasks 1 + 3: handler walks `electType_t` ENUM_DECL via Pattern 10 extended to ENUM_DECL; `ELECTION_TYPE_SKIP` frozenset excludes etNone; loader UPSERTs 5 rows; Phase-boundary Probes 4 + 6 assert the count and the skip.

- **F8** (death_rule row count = 27; skip dtNONE + dtUNKNOWN; keep dtCHANGELEVEL as structural). Resolved by Tasks 1 + 3: Stage 2 X-macro text parse emits 27 rows from deathtype.h (29 lines - 2 sentinels); `DEATH_RULE_SKIP` frozenset excludes dtNONE + dtUNKNOWN; dtCHANGELEVEL emitted with `category='structural'`; loader UPSERTs 27 rows; Phase-boundary Probes 5 + 6 + 7 + 8 assert counts, skips, and category. F8's "30 entries" framing corrects to "29 entries" per the Open Question above (amendment to `review-findings.md` at Phase 4 review time).

No findings touched by Phase 4 are deferred. Both F7 and F8 ship in this phase.

---

*Phase 4 closes the taxonomy-handler arc. Phase 5 (gameplay tables -- `_handler_gameplay_tables.py` with monster + score_system + drop_item + loc_macro + teamplay_message rows) and Phase 6 (XSD-driven match_event handler) are mutually independent at the data level and can draft / execute in parallel. Phase 7 (validation runbook + F1 quality probes) consumes Phase 4's output rows for the cross-project audit. The qw-event-log validation harness anchor for the WeaponType enum is now available at the schema level -- the harness can JOIN parser observations against `gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='death_rule'` rows to verify every observed death type maps to a known taxonomy entry.*
