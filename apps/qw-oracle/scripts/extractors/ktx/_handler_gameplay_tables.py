"""KTX gameplay-tables handler.

Emits the ktx-gameplay-tables-ast.json payload: five struct-array tables
covering KTX Group-B gameplay content:

  bloodfest_monster_t  -> 13 monster rows (sp_monsters.c)
  race_score_system_t  -> 3 score_system rows (race.c)
  dropitem_spawn_t     -> 31 drop_item rows (commands.c)
  locmacro_t           -> 15 loc_macro rows (teamplay.c)
  teamplay_message_t   -> 21 teamplay_message rows (teamplay.c)

Output filename: ktx-gameplay-tables-ast.json

Source-file scope (4 .c files):
  sp_monsters.c  -- bloodfest_monster_array[]
  race.c         -- scoring_systems[]
  commands.c     -- dropitems[]
  teamplay.c     -- locmacros[] and messages[]

Two extraction patterns:
  Pattern 4 -- INIT_LIST_EXPR walks on struct-array literals (all five tables)
  Pattern 9 -- function-banner-comment harvest for teamplay_message_t.function
               references (e.g. TeamplayYesOk); joined to teamplay_message rows
               in finalize() so each row carries a harvested_description.

Pattern 9 reuse: the banner-detection helpers _DECORATION_RE, _IDENT_RE,
and _function_banner() are ported from MVDSV's _handler_commands.py rather than
lifted to extractor_lib. The Rule of Second Consumer (Tier 2 lift waits for the
second consumer) would make KTX the second consumer; Phase 8 carries a sidequest
to propose that lift. For this phase, copy-and-adapt is cheaper than
infrastructure rework mid-arc.

Cross-codebase port (D3): inherits from Visitor only -- NO subclass of any
parent-project handler. KTX's struct-array tables have no direct analog in
ezQuake / FTE / QWCL / MVDSV; subclassing would tie KTX-specific extraction to
a parent API surface that does not apply.

F25 anti-pattern note: the modes handler (_handler_modes.py) accumulates
cross-file refs on instance state inside workers post-fork via visit_cursor;
the parent's finalize() sees empty state (F25). This handler avoids the pattern:
per-file rows accumulate in self._rows and are returned by end_file() so the
driver merges them into all_rows, which finalize() reads from the parameter --
not from self. This keeps the handler parallel-safe.

Output shape (finalize returns one dict, not per-file rows):

    {
      "monsters":          [13 rows],
      "score_systems":     [3 rows],
      "drop_items":        [31 rows],
      "loc_macros":        [15 rows],
      "teamplay_messages": [21 rows],
      "_stats":            {...}
    }
"""
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


HANDLER_NAME = "gameplay_tables"
OUTPUT_FILENAME = "ktx-gameplay-tables-ast.json"

# Pattern-9 banner harvest helpers (ported from MVDSV's _handler_commands.py).
# Banner block shape: /* === Title === Body === */ . Title row is a single
# bare identifier (the function name); body lines are everything else after
# decoration stripping.
_DECORATION_RE = re.compile(r"^[=\-]+$")
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

# Handler-private integer-macro fallback for `_resolve_spawnflags`.
#
# All three macros referenced by `dropitems[]` need fallback resolution. The
# Phase 5 phase MD originally claimed `WEAPON_BIG2` (commands.c:9053, same-file)
# would resolve via `self.file_macros`, but that proved wrong during
# execution: `extractor_lib._source.collect_file_macros` (Phase 1's Pattern 6
# lift) is string-literal-only by design (lines 167-171 of _source.py state
# "Excludes function-like macros, integer/hex constants, and any macro whose
# body is not exactly one string-literal token"). KTX modes' string-bodied
# macros (e.g. LGCMODE_VARIABLE " 0\n") still resolve through the lift; KTX
# integer constants do not. See F11 second amendment + F26 in review-findings
# for the full audit trail.
#
# Values verified at canonical 1.46 (master HEAD) on 2026-05-06:
#   H_ROTTEN    = 1   (include/g_consts.h:241; depth-2 from commands.c)
#   H_MEGA      = 2   (include/g_consts.h:242; depth-2 from commands.c)
#   WEAPON_BIG2 = 1   (commands.c:9053; same-file, but integer body so
#                      Phase 1's lift filter excludes it).
#
# A dict (not a frozenset) is the deliberate shape: it raises KeyError on
# unknown macros via the bracket-access pattern in `_resolve_spawnflags`,
# preserving failure-loud-not-silent semantics for any future macro that
# isn't listed here.
_DROPITEM_MACRO_FALLBACK: dict[str, int] = {
    "H_ROTTEN":    1,
    "H_MEGA":      2,
    "WEAPON_BIG2": 1,
}

# Per-table dispatch: VAR_DECL whose stripped type matches a key in this
# map routes to the corresponding extractor method. The struct-type spelling
# is what libclang reports as cursor.type.spelling stripped of array
# dimensions and trailing qualifiers (mirrors ezQuake's _NESTED_CVAR_TABLE_TYPES
# and MVDSV's _COMMAND_TABLE_TYPES dispatch shape).
_TABLE_TYPE_DISPATCH: dict[str, str] = {
    "bloodfest_monster_t": "_extract_monster_table",
    "race_score_system_t": "_extract_score_system_table",
    "dropitem_spawn_t":    "_extract_drop_item_table",
    "locmacro_t":          "_extract_loc_macro_table",
    "teamplay_message_t":  "_extract_teamplay_message_table",
}

# Inline category map per Pass 5.4.8. Hand-curated against the 15 loc_macro
# entries; not source-derived. Names not in this map default to "other".
_LOC_MACRO_CATEGORY: dict[str, str] = {
    "ssg":       "weapon",
    "ng":        "weapon",
    "sng":       "weapon",
    "gl":        "weapon",
    "rl":        "weapon",
    "lg":        "weapon",
    "ga":        "armor",
    "ya":        "armor",
    "ra":        "armor",
    "quad":      "powerup",
    "pent":      "powerup",
    "ring":      "powerup",
    "suit":      "powerup",
    "mh":        "health",
    "separator": "syntactic",
}

# Inline related-item map per Pass 5.4.8 spec. Names match id1 baseline
# gameplay_entity_defs.name spellings for FK joinability with the cross-
# namespace JOIN queries described in Phase-boundary Probe 11.
_LOC_MACRO_RELATED_ITEM: dict[str, Optional[str]] = {
    "ssg":       "weapon_supershotgun",
    "ng":        "weapon_nailgun",
    "sng":       "weapon_supernailgun",
    "gl":        "weapon_grenadelauncher",
    "rl":        "weapon_rocketlauncher",
    "lg":        "weapon_lightning",
    "ga":        "item_armor1",
    "ya":        "item_armor2",
    "ra":        "item_armorInv",
    "quad":      "item_artifact_super_damage",
    "pent":      "item_artifact_invulnerability",
    "ring":      "item_artifact_invisibility",
    "suit":      "item_artifact_envirosuit",
    "mh":        "item_health",
    "separator": None,
}


def _function_banner(source_bytes: bytes, fn_def_offset: int) -> Optional[str]:
    """Walk back from fn_def_offset (the byte offset of a FUNCTION_DECL's
    extent.start) to the immediately preceding /* ... */ block. Parse the
    Doom-style banner and return the description text, or None if no
    visually-adjacent block exists or the block has no description content.

    Ported verbatim from MVDSV's _handler_commands.py (Pattern 9 reuse).

    Banner-title detection uses bare-identifier-line elimination rather than
    name equality. KTX's teamplay.c (like MVDSV's source) has cases where
    the banner title line disagrees with the actual handler name due to
    copy-paste drift. The bare-identifier rule cleanly skips all title rows
    without requiring perfect name alignment.
    """
    text = source_bytes.decode("utf-8", errors="replace")
    end_idx = text.rfind("*/", 0, fn_def_offset)
    if end_idx < 0:
        return None
    # Comment block must be visually adjacent: only whitespace between */
    # and the function-def's start. Anything else (another declaration,
    # a #include, a struct) means the comment is not this function's banner.
    between = text[end_idx + 2:fn_def_offset]
    if between.strip():
        return None
    start_idx = text.rfind("/*", 0, end_idx)
    if start_idx < 0:
        return None
    block = text[start_idx + 2:end_idx]

    # Banner-title detection. KTX/QW convention puts the function's own
    # name on the line immediately under the top decoration row. Bare
    # identifier standing alone on its own line is treated as the title --
    # legitimate description text never reduces to a single identifier.
    description_lines: list[str] = []
    for raw in block.splitlines():
        s = raw.strip()
        if not s:
            continue
        if _DECORATION_RE.match(s):
            continue
        if _IDENT_RE.match(s):
            # Bare identifier line: assumed to be the banner title row.
            continue
        description_lines.append(s)
    if not description_lines:
        return None
    return " ".join(description_lines).strip() or None


def _strip_internal_keys(r: dict) -> dict:
    """Return a shallow copy of row r with _kind removed.

    Applied in finalize() before rows enter the per-kind output arrays so
    the JSON output doesn't carry the internal partition tag. Shallow copy
    is sufficient because the per-kind arrays are never mutated after this
    point.
    """
    return {k: v for k, v in r.items() if k != "_kind"}


class KtxGameplayTablesHandler(Visitor):
    """KTX gameplay-tables handler -- five struct-array tables via Pattern 4 + Pattern 9.

    Cross-codebase port (D3) -- inherits from Visitor only. No parent-project subclass.

    Per-file rows accumulate in self._rows and are returned by end_file() so the
    driver merges them into all_rows; finalize() reads from the all_rows parameter,
    not from self. This makes the handler parallel-safe (avoids the F25 anti-pattern
    seen in _handler_modes.py where cross-file state on self caused worker isolation
    to produce empty finalize output under multiprocessing.Pool).

    Pattern 9 (function-banner harvest) emits _fn_def rows alongside _table_row rows
    during the same TU walk. finalize() joins them: each teamplay_message row's
    handler_function name is looked up in the _fn_def map and the banner text is
    filled into props_json.harvested_description.
    """

    name = HANDLER_NAME
    output_filename = OUTPUT_FILENAME
    # No payload_field: finalize() returns a dict with multiple top-level arrays
    # (monsters / score_systems / drop_items / loc_macros / teamplay_messages / _stats).
    # This mirrors MVDSV's protocol handler return shape, not the single-array
    # payload_field shape used by simpler handlers.

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        """One-time init. Fires in the parent process pre-fork.

        Stores both paths. No eager file-parse stages here (unlike Phase 4's
        Stage 2 deathtype.h parse): all five tables are libclang-walkable via
        INIT_LIST_EXPR per Pattern 4. self.file_macros is provided by
        walk_tu_dispatch (Phase 1's lift; transitive #include closure
        since D4 unpark 2026-05-26) and consulted in
        _extract_drop_item_table for spawnflags resolution.

        _stat_unresolved_drop_macros is initialized here at handler level so it
        survives across all per-file walks (each file's per-file accumulator
        is merged into this set in end_file). finalize() reads it for _stats.
        """
        self._repo_root = ktx_repo
        self._src_root = ktx_src
        # Handler-level set for unresolved spawnflags macros. Per-file
        # accumulators are merged here in end_file() so finalize() can
        # emit a complete audit list in _stats.drop_item.unresolved_macros.
        self._stat_unresolved_drop_macros: set[str] = set()
        # Per-handler score-system positions-length violations. Populated by
        # _record_score_system_violation(); reported in finalize() _stats.
        self._score_system_violations: list[tuple[str, int]] = []

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        """Cache path/bytes; reset per-file accumulators.

        Per-file dedup: the KTX TU's #include closure makes the same struct
        array visible from multiple .c TU walks; first-wins per file.
        Cross-file first-wins happens in finalize() over the merged all_rows.
        """
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._source_bytes = source_bytes
        self._source_path = source_path
        self._rows: list[dict] = []
        # (kind, name) dedup within this file's walk
        self._seen_in_file: set[tuple[str, str]] = set()
        # Function-name dedup within this file's walk (Pattern 9)
        self._seen_fns_in_file: set[str] = set()
        # Per-file unresolved-macro accumulator; merged into the handler-level
        # set in end_file() so finalize() sees the union across all files.
        self._per_file_unresolved_macros: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        """Dispatch on cursor kind: Pattern 9 (FUNCTION_DECL) then Pattern 4 (VAR_DECL).

        Pattern 9 captures function definitions first. Each FUNCTION_DECL that
        is a definition gets its banner comment harvested and stored as a _fn_def
        row. finalize() joins these to teamplay_message rows by handler_function name.

        Pattern 4 dispatches VAR_DECL nodes whose stripped type appears in
        _TABLE_TYPE_DISPATCH to the matching per-table extractor method.
        """
        kind = cursor.kind

        # ---- Pattern 9: track FUNCTION_DECL definitions for cross-file banner
        # harvest. The teamplay_message_t array references handler functions by
        # name (e.g., TeamplayYesOk); the function definitions live elsewhere
        # in teamplay.c. Emit one _fn_def row per definition; finalize merges
        # these into the teamplay_message rows.
        if kind == CursorKind.FUNCTION_DECL and cursor.is_definition():
            fn_name = cursor.spelling
            if fn_name and fn_name not in self._seen_fns_in_file:
                self._seen_fns_in_file.add(fn_name)
                description = _function_banner(
                    self._source_bytes,
                    cursor.extent.start.offset,
                )
                self._rows.append({
                    "_kind":             "_fn_def",
                    "fn_name":           fn_name,
                    "description":       description,
                    "source_ref_handler": self._format_source_ref(cursor),
                })
            return  # FUNCTION_DECL is never a struct-array VAR_DECL

        # ---- Pattern 4: struct-array dispatch. VAR_DECL whose stripped type
        # name appears in _TABLE_TYPE_DISPATCH routes to a per-table extractor.
        # Other VAR_DECLs (scalars, unrelated arrays) fall through silently.
        if kind != CursorKind.VAR_DECL:
            return
        type_spelling = strip_array_and_qualifiers(cursor.type.spelling)
        extractor_name = _TABLE_TYPE_DISPATCH.get(type_spelling)
        if extractor_name is None:
            return
        extractor = getattr(self, extractor_name)
        extractor(cursor)

    def _format_source_ref(self, cursor) -> str:
        """Return '<basename>:<line>' for a cursor's location.

        Defensive against cursor.location.file being None (TU-root cursors
        and some preprocessor artefacts have no file location).
        """
        rel = Path(cursor.location.file.name).name if cursor.location.file else "?"
        return f"{rel}:{cursor.location.line}"

    def _extract_monster_table(self, node) -> None:
        """Walk bloodfest_monster_array[] via Pattern 4 INIT_LIST_EXPR.

        Struct field layout (sp_monsters.c:48-52):
          field 0: char *class_name  -- spawned classname (also used as name/value_text)
          field 1: int   hp_for_kill -- HP awarded to player per kill (per F9 amendment:
                                        source name is hp_for_kill, NOT count_per_wave;
                                        two prior passes had this wrong; D9 source-fidelity wins)
          field 2: int   armor_for_kill
          field 3: qbool boss_able

        13 entries expected (F9 anchor). Gate: {"mode":"bloodfest"}.
        is_first_required flag: sp_monsters.c array comment states FISH _MUST_ BE _FIRST_
        (array_position == 0) for bloodfest wave logic to work correctly.
        """
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
            hp_for_kill    = self._parse_int(read_extent(self._source_bytes, fields[1].extent).strip())
            armor_for_kill = self._parse_int(read_extent(self._source_bytes, fields[2].extent).strip())
            boss_able      = read_extent(self._source_bytes, fields[3].extent).strip() == "true"
            key = ("monster", class_name)
            if key in self._seen_in_file:
                continue
            self._seen_in_file.add(key)
            self._rows.append({
                "_kind":            "_table_row",
                "kind":             "monster",
                "name":             class_name,
                "value_text":       class_name,  # same as name; stored for traceability per Pass 5.4.5
                "source_ref":       f"{file_name}:{init.location.line}",
                "ruleset_gate_json": {"mode": "bloodfest"},
                "props_json": {
                    "hp_for_kill":       hp_for_kill,
                    "armor_for_kill":    armor_for_kill,
                    "boss_able":         boss_able,
                    "array_position":    array_position,
                    "is_first_required": (array_position == 0),
                },
            })

    def _extract_score_system_table(self, node) -> None:
        """Walk scoring_systems[] via Pattern 4 INIT_LIST_EXPR.

        Struct field layout (race.c:5137-5145):
          field 0: char *name          -- display label ("Win Only", "Scaled", "Formula1")
          field 1: int   positions[10] -- nested INIT_LIST_EXPR of 10 per-position point values
          field 2: int   complete
          field 3: int   beating
          field 4: int   dnf_penalty
          field 5: int   round_max_diff

        3 entries expected (F10 anchor). Gate: {"mode":"race"}.
        F10 invariant: every positions array must have exactly 10 elements.
        Loader-side gate is the canonical fail-fast; the handler emits a
        _stats entry for any violation to surface handler-vs-loader divergence.
        """
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
                # Defensive emit: continue with the actual array; loader's F10
                # gate is the canonical fail-fast. Recording here so the audit
                # trail captures handler-vs-loader divergence.
                self._record_score_system_violation(display_name, len(positions))
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
                "_kind":            "_table_row",
                "kind":             "score_system",
                "name":             slug,
                "value_text":       display_name,          # verbatim .name field per Pass 5.4.6
                "source_ref":       f"{file_name}:{init.location.line}",
                "ruleset_gate_json": {"mode": "race"},
                "props_json": {
                    "positions":      positions,           # exactly 10 elements per F10
                    "completion":     completion,
                    "beating":        beating,
                    "dnf_penalty":    dnf_penalty,
                    "round_max_diff": round_max_diff,
                },
            })

    def _extract_drop_item_table(self, node) -> None:
        """Walk dropitems[] via Pattern 4 + Pattern 6 (transitive lift) + fallback dict.

        Struct field layout (commands.c:9044-9051):
          field 0: char *name        -- drop token: "h15", "ssg", "fl_r", ...
          field 1: char *classname   -- spawned classname: "item_health", ...
          field 2: int   spawnflags  -- raw enum/macro: 0, H_ROTTEN, H_MEGA, WEAPON_BIG2
          field 3: int   angle       -- 0 or 1 (default 0 when omitted)
          field 4: void (*spawn)(void) -- function pointer; NULL for most rows

        31 entries expected (F11 amendment: +1 sp_sp entry since Pass 5.4). Gate: {}.

        Macro resolution order for spawnflags (per F11 second amendment +
        F26 finding -- collect_file_macros is string-literal-only):
          1. Literal integer parse
          2. self.file_macros (Phase 1's lift; string-bodied macros only --
             excludes integer constants by design; reaches the full
             transitive #include closure since D4 unpark 2026-05-26)
          3. _DROPITEM_MACRO_FALLBACK for H_ROTTEN / H_MEGA / WEAPON_BIG2
             (all integer-bodied; the lift's string-literal filter excludes
             them regardless of include depth)
          4. None -- unknown macro logged to _stat_unresolved_drop_macros

        Trailing fields (spawnflags/angle/spawn) are optional in the C array literal;
        the defensive len(fields) >= N guards handle the sp_sp entry which omits
        some trailing fields.
        """
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
            # Only require name + classname; trailing fields default in C struct-init.
            if len(fields) < 2:
                continue
            drop_token = strip_quotes(read_extent(self._source_bytes, fields[0].extent).strip())
            if not drop_token:
                continue
            classname = strip_quotes(read_extent(self._source_bytes, fields[1].extent).strip())
            # Defensive: trailing fields default to 0 / NULL when omitted in
            # the array literal. C struct-init pads with zeros.
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
                spawn_fn_name = resolve_fn_ref(fields[4])  # None when field is 0/NULL
            # Resolve spawnflags via the priority chain above.
            spawnflags_value = self._resolve_spawnflags(flags_raw_text)
            angle_set = (self._parse_int(angle_text) or 0) != 0
            # Cross-namespace join hint to id1 baseline gameplay_entity_defs.
            # Not all rows match id1 baseline (flag/spawnpoint entries use
            # info_player_team1 etc. which aren't id1 weapons or items).
            # Emit None for those; loader does not enforce FK-existence.
            # Phase-boundary Probe 11 surfaces match coverage.
            related_canonical_id = (
                f"qw:gameplay_entity_def:{classname}" if classname else None
            )
            key = ("drop_item", drop_token)
            if key in self._seen_in_file:
                continue
            self._seen_in_file.add(key)
            self._rows.append({
                "_kind":            "_table_row",
                "kind":             "drop_item",
                "name":             drop_token,
                "value_text":       classname or None,
                "source_ref":       f"{file_name}:{init.location.line}",
                "ruleset_gate_json": {},                  # universal across modes per F11
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

    def _extract_loc_macro_table(self, node) -> None:
        """Walk locmacros[] via Pattern 4 INIT_LIST_EXPR.

        Struct field layout (teamplay.c:1485-1489):
          field 0: char *name  -- macro key: "ssg", "ng", "mh", "separator", ...
          field 1: char *value -- expansion: "ssg" / "ng" / "mega" / "-" / ...

        15 entries expected (F12 anchor). Gate: {}.

        is_identity is true when macro_name == macro_value (most weapon/armor
        macros are identity; mh -> mega and separator -> - are non-identity).
        category and related_item come from module-level hand-curated maps.
        """
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
            macro_value  = strip_quotes(read_extent(self._source_bytes, fields[1].extent).strip())
            is_identity  = (macro_name == macro_value)
            category     = _LOC_MACRO_CATEGORY.get(macro_name, "other")
            related_item = _LOC_MACRO_RELATED_ITEM.get(macro_name)
            key = ("loc_macro", macro_name)
            if key in self._seen_in_file:
                continue
            self._seen_in_file.add(key)
            self._rows.append({
                "_kind":            "_table_row",
                "kind":             "loc_macro",
                "name":             macro_name,
                "value_text":       macro_value,
                "source_ref":       f"{file_name}:{init.location.line}",
                "ruleset_gate_json": {},                  # universal per F12
                "props_json": {
                    "expansion":    macro_value,          # duplicate of value_text per Pass 5.4.8
                    "is_identity":  is_identity,
                    "category":     category,
                    "related_item": related_item,
                },
            })

    def _extract_teamplay_message_table(self, node) -> None:
        """Walk messages[] via Pattern 4 INIT_LIST_EXPR.

        Struct field layout (teamplay.c:1638-1643):
          field 0: char *cmdname                      -- message key: "yesok", "nocancel", ...
          field 1: char *description                  -- short label: "yes/ok", "no/cancel", ...
          field 2: void (*function)(gedict_t *client) -- handler function pointer (Pattern 9)

        21 entries expected (F13 anchor). Gate: {}.

        handler_function is resolved by resolve_fn_ref from the function-pointer field.
        harvested_description and source_ref_handler are left None here; finalize()
        fills them from the _fn_def rows captured by Pattern 9 during the same TU walk.
        """
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
            handler_fn  = resolve_fn_ref(fields[2])  # function name spelling
            key = ("teamplay_message", cmdname)
            if key in self._seen_in_file:
                continue
            self._seen_in_file.add(key)
            self._rows.append({
                "_kind":            "_table_row",
                "kind":             "teamplay_message",
                "name":             cmdname,
                "value_text":       description,
                "source_ref":       f"{file_name}:{init.location.line}",
                "ruleset_gate_json": {},                  # universal per F13
                "props_json": {
                    "description":           description,      # duplicate of value_text per Pass 5.4.9
                    "handler_function":      handler_fn,       # joined to _fn_def in finalize
                    "source_ref_handler":    None,             # filled by finalize
                    "harvested_description": None,             # filled by finalize via Pattern 9
                },
            })

    def _resolve_spawnflags(self, text: str) -> Optional[int]:
        """Resolve a spawnflags field text to an integer value.

        Priority chain (per F11 amendment + F26 finding -- collect_file_macros
        is string-literal-only and excludes integer constants by design):
          1. Empty -> 0 (C struct-init default)
          2. Literal integer parse (most common case: "0")
          3. self.file_macros lookup (Phase 1 lift; string-bodied macros
             only -- integer constants are excluded by the lift's
             tokenisation filter at extractor_lib/_source.py; the lift
             reaches the full transitive #include closure since D4 unpark
             2026-05-26)
          4. _DROPITEM_MACRO_FALLBACK for H_ROTTEN / H_MEGA / WEAPON_BIG2
             (all integer-bodied macros; excluded by the string-literal
             filter regardless of include depth; frozen 3-entry dict)
          5. None -- unresolved; logged to _per_file_unresolved_macros for
             finalize() _stats population
        """
        s = text.strip()
        if not s:
            return 0
        # Literal integer?
        parsed = self._parse_int(s)
        if parsed is not None:
            return parsed
        # Pattern 6 (Phase 1's lift)? self.file_macros is provided by
        # walk_tu_dispatch and contains macros from the target file plus
        # its full transitive #include closure (depth-N since D4 unpark
        # 2026-05-26).
        if hasattr(self, "file_macros") and s in (self.file_macros or {}):
            macro_value = self.file_macros[s]
            # macro_value is the literal RHS string from #define; wrap in
            # _parse_int to coerce. Defensive against parenthesised expressions
            # like "(1)".
            v = self._parse_int(macro_value.strip().lstrip("(").rstrip(")"))
            if v is not None:
                return v
        # Handler-private fallback for H_ROTTEN and H_MEGA (F11 amendment).
        # These macros live in include/g_consts.h with integer bodies, so
        # the string-literal-only filter in collect_file_macros excludes
        # them regardless of include depth (F26). The fallback dict is
        # frozen (only two entries) and does not silently swallow unknowns
        # -- any macro not listed here falls through to the unresolved
        # path below.
        if s in _DROPITEM_MACRO_FALLBACK:
            return _DROPITEM_MACRO_FALLBACK[s]
        # Unknown: emit None; spawnflags_raw preserves the symbolic token for
        # downstream investigation.
        self._per_file_unresolved_macros.add(s)
        return None

    def _parse_int(self, text: str) -> Optional[int]:
        """Tolerant integer parser. Returns None on failure rather than raising.

        Defensive against future macro-prefixed integers or expressions that
        sneak through. Callers that need a fallback value should use
        (_parse_int(text) or 0) to get 0 on failure.
        """
        s = text.strip()
        if not s:
            return None
        try:
            return int(s, 0)  # base 0 accepts 0x hex, 0 octal, decimal
        except (ValueError, TypeError):
            return None

    def _slugify_score_name(self, text: str) -> str:
        """Slugify a score system display name for use as the row name column.

        "Win Only" -> "win_only", "Formula1" -> "formula1", "Scaled" -> "scaled".
        Lowercases, replaces non-[a-z0-9_] runs with single underscores, strips
        leading/trailing underscores.
        """
        slug = text.lower()
        slug = re.sub(r"[^a-z0-9_]+", "_", slug)
        return slug.strip("_")

    def _record_score_system_violation(self, name: str, length: int) -> None:
        """Record a score_system positions-array-length violation.

        Violations are collected at handler level (not per-file) so finalize()
        can emit them into _stats.score_system.positions_length_violations.
        The loader-side F10 gate is the canonical fail-fast; this record exists
        so the audit trail captures handler-vs-loader divergence.
        """
        self._score_system_violations.append((name, length))

    def end_file(self) -> list[dict]:
        """Return per-file rows and clear accumulators.

        Merges per-file unresolved-macro set into the handler-level one so
        finalize() has the union across all files processed. Resets per-file
        state so the next file starts clean.
        """
        rows = self._rows
        self._stat_unresolved_drop_macros.update(self._per_file_unresolved_macros)
        self._rows = []
        self._seen_in_file = set()
        self._seen_fns_in_file = set()
        self._per_file_unresolved_macros = set()
        return rows

    def finalize(self, *, all_rows, repo_root: Path) -> dict:
        """Assemble and return the final gameplay-tables payload.

        all_rows is the driver-merged collection of all rows returned by
        end_file() across all files. If the driver passes a dict keyed by
        handler name (test fixture shape), extract the relevant slice.

        Steps:
          1. Partition all_rows by _kind (_fn_def vs _table_row).
          2. Cross-file first-wins by (kind, name) for _table_row rows.
          3. Pattern 9 join: fill harvested_description + source_ref_handler
             on teamplay_message rows from the _fn_def map.
          4. Stable sort each kind by name.
          5. Build _stats dict and return the final payload dict.

        F25 design note: this method reads all_rows from the parameter, not
        from self, so it is safe to call from the parent process after workers
        have populated all_rows via end_file(). The handler accumulates no
        cross-file state that would be lost to worker fork isolation.
        """
        # Defensive: handle both flat-list (driver shape) and dict (test fixture shape).
        if isinstance(all_rows, dict):
            rows: list[dict] = all_rows.get(self.name, [])
        else:
            rows = list(all_rows)

        # Partition by _kind.
        fn_descriptions: dict[str, Optional[str]] = {}   # fn_name -> description
        fn_source_refs:  dict[str, str] = {}             # fn_name -> source_ref_handler
        table_rows: list[dict] = []
        for r in rows:
            k = r.get("_kind")
            if k == "_fn_def":
                fn_name = r["fn_name"]
                # First-non-None-wins on description; first-wins on source_ref.
                if fn_name not in fn_descriptions:
                    fn_descriptions[fn_name] = r.get("description")
                    fn_source_refs[fn_name]  = r.get("source_ref_handler", "")
                else:
                    if fn_descriptions[fn_name] is None and r.get("description"):
                        fn_descriptions[fn_name] = r["description"]
            elif k == "_table_row":
                table_rows.append(r)

        # Cross-file first-wins by (kind, name).
        seen_keys: set[tuple[str, str]] = set()
        by_kind: dict[str, list[dict]] = {
            "monster":          [],
            "score_system":     [],
            "drop_item":        [],
            "loc_macro":        [],
            "teamplay_message": [],
        }
        for r in table_rows:
            row_kind = r["kind"]
            row_name = r["name"]
            key = (row_kind, row_name)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            # Pattern 9 join for teamplay_message: fill harvested_description
            # and source_ref_handler from the _fn_def maps accumulated above.
            if row_kind == "teamplay_message":
                handler_fn = r["props_json"].get("handler_function")
                if handler_fn:
                    r["props_json"]["harvested_description"] = fn_descriptions.get(handler_fn)
                    r["props_json"]["source_ref_handler"]    = fn_source_refs.get(handler_fn) or None
            if row_kind in by_kind:
                by_kind[row_kind].append(_strip_internal_keys(r))

        # Stable sort each kind by name.
        for k in by_kind:
            by_kind[k].sort(key=lambda r: r["name"])

        # Score_system positions-length-10 invariant audit (finalize-time pass).
        # Violations from _record_score_system_violation (extraction time) and
        # any remaining in the sorted output are both captured.
        score_violations = [
            (r["name"], len(r["props_json"]["positions"]))
            for r in by_kind["score_system"]
            if len(r["props_json"]["positions"]) != 10
        ]

        stats: dict = {
            "monster": {
                "count":    len(by_kind["monster"]),
                "expected": 13,
            },
            "score_system": {
                "count":                      len(by_kind["score_system"]),
                "expected":                   3,
                "positions_length_violations": score_violations,
            },
            "drop_item": {
                "count":             len(by_kind["drop_item"]),
                "expected":          31,
                "unresolved_macros": sorted(self._stat_unresolved_drop_macros),
            },
            "loc_macro": {
                "count":    len(by_kind["loc_macro"]),
                "expected": 15,
            },
            "teamplay_message": {
                "count":                      len(by_kind["teamplay_message"]),
                "expected":                   21,
                "with_harvested_description": sum(
                    1 for r in by_kind["teamplay_message"]
                    if r["props_json"].get("harvested_description")
                ),
            },
        }

        return {
            "monsters":          by_kind["monster"],
            "score_systems":     by_kind["score_system"],
            "drop_items":        by_kind["drop_item"],
            "loc_macros":        by_kind["loc_macro"],
            "teamplay_messages": by_kind["teamplay_message"],
            "_stats":            stats,
        }
