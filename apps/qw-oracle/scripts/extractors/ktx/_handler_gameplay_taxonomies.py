"""KTX gameplay-taxonomies handler.

Emits the ktx-gameplay-taxonomies-ast.json payload: 5 election_type rows
and 27 death_rule rows, plus a _stats block.

Two extraction stages cover the two enum types:

  Stage 1 -- libclang-driven (electType_t ENUM_DECL, Pattern 10 extension):
    Walks the electType_t enum declared in include/progs.h via a TU-root
    cursor intercept. The mechanic is identical to Pattern 10 (TU-root
    intercept for header-defined MACRO_DEFINITION in MVDSV's protocol
    handler), but widens the cursor-kind filter from CursorKind.MACRO_DEFINITION
    to CursorKind.ENUM_DECL. Phase 8 amends EXTRACTOR-PLAYBOOK.md to broaden
    Pattern 10's title to "TU-root cursor intercept for header-defined
    declarations" and explicitly include ENUM_DECL alongside MACRO_DEFINITION.

    Why TU-root intercept? The electType_t enum is defined in progs.h (a
    header). The per-file walker filters out cursors whose location.file
    does not match the target .c file, so header-defined declarations are
    unreachable through normal per-file dispatch. The TU root cursor
    (location.file is None) passes the walker's per-file filter at
    _visitor.py:117-124. We intercept on TU root and do a one-shot scan
    over its children, fishing out the ENUM_DECL with the matching spelling.
    Each .c file that includes progs.h exposes electType_t via its TU; only
    the first encounter per handler instance is emitted (dedup by value_text
    in finalize).

  Stage 2 -- text-parse-driven (deathtype.h X-macro, Pattern 16):
    The deathType_t enum is constructed via the DEATHTYPE() X-macro defined
    in g_local.h. After preprocessor expansion the second argument (the
    user-facing string token) is dropped from the AST; libclang cannot recover
    it. We read include/deathtype.h directly with a regex to recover both the
    dt enum tag and the string token. This technique is documented in the
    handler docstring as Pattern 16 (X-macro file parse) and will be landed
    into EXTRACTOR-PLAYBOOK.md by Phase 8.

    Stage 2 fires pre-fork in setup() so self._death_rule_rows is populated
    on the parent instance that finalize() runs against. Workers inherit a
    copy-on-write snapshot; they do NOT write to self._death_rule_rows.

Source-file scope: any .c file that includes progs.h will expose the
electType_t ENUM_DECL via its TU root. The handler does NOT maintain a
source-file allowlist for Stage 1 -- every TU that the driver feeds is
scanned. Cross-file dedup in finalize (first-wins by value_text) ensures
only 5 unique election_type rows survive.

Cross-codebase port (D3): inherits from Visitor only -- NO subclass of any
parent-project handler. KTX's election-type + death-rule taxonomy has no
analog in ezQuake / FTE / QWCL / MVDSV; subclassing would tie KTX-specific
extraction to a parent API surface that does not apply.

Output shape (finalize returns one dict, not per-file rows):

    {
      "election_types": [5 rows],
      "death_rules":    [27 rows],
      "_stats":         {...}
    }

F25 anti-pattern note: the modes handler (_handler_modes.py) accumulates
cross-file refs (e.g. self._activation_cvar_refs) on instance state inside
workers post-fork via visit_cursor; the parent's finalize sees empty state.
This handler avoids the pattern by design:
  - Stage 2 fires pre-fork in setup() so parent retains the data.
  - Stage 1 emits per-file rows via end_file(); finalize reads them from the
    driver-merged all_rows parameter, not from self.
  - No per-worker dedup state -- finalize() does global first-wins dedup by
    value_text. Per D.3.1, per-worker dedup made source_total scale with
    worker count; finalize-only dedup keeps the stat parallelism-invariant.
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


class KtxGameplayTaxonomiesHandler(Visitor):
    """KTX gameplay-taxonomies handler -- 5 election_type rows + 27 death_rule rows.

    Cross-codebase port (D3) -- inherits from Visitor only. No parent-project
    subclass.

    Stage 1 (libclang) fires per-TU in visit_cursor; rows accumulate via
    end_file() and are merged by the driver into all_rows, which finalize
    reads. Stage 2 (text parse) fires once in setup() pre-fork.
    """

    name = HANDLER_NAME
    output_filename = OUTPUT_FILENAME

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        """One-time init. Fires in the parent process pre-fork.

        Stores paths and initializes accumulators. Calls _parse_deathtype_h()
        immediately so self._death_rule_rows is populated on the parent
        instance that finalize() runs against. Workers inherit a copy-on-write
        snapshot and do not write to it.
        """
        self._repo_root = ktx_repo
        self._src_root = ktx_src
        # Stage 2 fires immediately at setup time; deathtype.h is a flat file
        # with one DEATHTYPE per line, no dependencies on TU walks.
        self._death_rule_rows: list[dict] = []
        self._death_stats: dict = {
            "x_macro_lines_total": 0,
            "skipped_sentinels": 0,
            "unknown_tags": [],
        }
        self._parse_deathtype_h()

    def _parse_deathtype_h(self) -> None:
        """Read include/deathtype.h line-by-line and emit one death_rule row
        per substantive DEATHTYPE() X-macro entry.

        Sentinels in DEATH_RULE_SKIP (dtNONE, dtUNKNOWN) are counted but not
        emitted. Unknown tags not in DEATH_RULE_PROPS and not in DEATH_RULE_SKIP
        emit a placeholder row and are logged to self._death_stats["unknown_tags"]
        so the operator notices new upstream additions.
        """
        deathtype_path = self._repo_root / "include" / "deathtype.h"
        with open(deathtype_path, encoding="utf-8", errors="replace") as fh:
            for line_no, line in enumerate(fh, start=1):
                m = _DEATHTYPE_RE.match(line)
                if not m:
                    continue
                tag = m.group("tag")
                token = m.group("token")
                self._death_stats["x_macro_lines_total"] += 1
                if tag in DEATH_RULE_SKIP:
                    self._death_stats["skipped_sentinels"] += 1
                    continue
                if tag in DEATH_RULE_PROPS:
                    category, id1_baseline, ktx_extension, related_weapon = (
                        DEATH_RULE_PROPS[tag]
                    )
                else:
                    # Defensive emit: unknown future tag. Log for operator
                    # visibility; do NOT silently drop.
                    self._death_stats["unknown_tags"].append({
                        "line": line_no,
                        "tag": tag,
                        "token": token,
                    })
                    category = "unknown"
                    id1_baseline = False
                    ktx_extension = True
                    related_weapon = None
                self._death_rule_rows.append({
                    "name":              token,
                    "kind":              "death_rule",
                    "value_text":        tag,
                    "source_ref":        f"deathtype.h:{line_no}",
                    "ruleset_gate_json": {},
                    "props_json": {
                        "category":      category,
                        "id1_baseline":  id1_baseline,
                        "ktx_extension": ktx_extension,
                        "related_weapon": related_weapon,
                    },
                })

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        """Cache path/bytes on self; reset per-file election accumulator."""
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._election_rows_per_file: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        """Pattern 10 extension: TU-root cursor intercept widened to ENUM_DECL.

        The walker dispatches visit_cursor for the TU root (location.file is
        None, passes the per-file filter at _visitor.py:117-124). On TU root
        we do a one-shot scan over children to find the electType_t ENUM_DECL.
        This is identical to MVDSV protocol handler's Pattern 10 except the
        cursor-kind filter is CursorKind.ENUM_DECL instead of
        CursorKind.MACRO_DEFINITION.
        """
        if cursor.kind != CursorKind.TRANSLATION_UNIT:
            return
        for child in cursor.get_children():
            if child.kind == CursorKind.ENUM_DECL and child.spelling == "electType_t":
                self._handle_election_enum(child)
                return  # one electType_t per TU; stop iterating once found

    def _handle_election_enum(self, enum_cursor) -> None:
        """Walk electType_t EnumConstantDecl children and emit election_type rows.

        No per-handler dedup state. Each TU's electType_t enum exposes the
        same 5 enumerators in source order; finalize() does global first-wins
        dedup by value_text across the driver-merged all_rows. Per D.3.1,
        keeping per-worker dedup state on self made source_total scale
        linearly with worker count; finalize-only dedup is parallelism-
        invariant.
        """
        for child in enum_cursor.get_children():
            tag = child.spelling
            if tag in ELECTION_TYPE_SKIP:
                continue
            if tag not in ELECTION_TYPE_TOKEN:
                # Unknown future tag -- emit a defensive placeholder row and
                # log to stats. Mirrors deathtype.h's defensive-emit policy.
                token = tag.removeprefix("et").lower()
                description = f"Unknown election type {tag}; future-tag fallback"
                related_commands: list[str] = []
                required_role = "any"
            else:
                token = ELECTION_TYPE_TOKEN[tag]
                description, related_commands, required_role = (
                    ELECTION_TYPE_PROPS[tag]
                )
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

    def end_file(self) -> list[dict]:
        """Return per-file election rows and reset the accumulator.

        The driver merges returned rows from all files into all_rows (a flat
        list or dict); finalize deduplicates across files. Death-rule rows are
        NOT returned here -- they live on self._death_rule_rows (populated
        pre-fork in setup) and are read directly in finalize.
        """
        rows = self._election_rows_per_file
        self._election_rows_per_file = []
        return rows

    def finalize(self, *, all_rows: list[dict] | dict, repo_root: Path) -> dict:
        """Assemble and return the final taxonomy payload.

        all_rows is the driver-merged flat list of election_type dicts returned
        by end_file() across all files. If the driver passes a dict keyed by
        handler name, extract the relevant slice defensively.

        Cross-file dedup: the same electType_t enum is visible from every .c
        TU that includes progs.h, so all_rows may contain duplicate tags.
        First-wins by value_text (the enum tag). Stable sort by name ascending.

        Death-rule rows are already in deathtype.h source order from Stage 2
        (setup-time parse); no re-sort needed.
        """
        # Normalize all_rows to a flat list of election dicts.
        if isinstance(all_rows, dict):
            raw_election_rows: list[dict] = all_rows.get(self.name, [])
        else:
            raw_election_rows = list(all_rows)

        source_total = len(raw_election_rows)

        # Cross-file dedup: first-wins by value_text (the enum tag).
        seen_value_texts: set[str] = set()
        unique_election_rows: list[dict] = []
        for row in raw_election_rows:
            vt = row.get("value_text", "")
            if vt in seen_value_texts:
                continue
            seen_value_texts.add(vt)
            unique_election_rows.append(row)

        # Stable sort by name ascending.
        unique_election_rows.sort(key=lambda r: r.get("name", ""))

        # Build by_required_role counts.
        by_required_role: dict[str, int] = {}
        for row in unique_election_rows:
            role = row.get("props_json", {}).get("required_role", "unknown")
            by_required_role[role] = by_required_role.get(role, 0) + 1

        # Build by_category counts for death_rules.
        by_category: dict[str, int] = {}
        for row in self._death_rule_rows:
            cat = row.get("props_json", {}).get("category", "unknown")
            by_category[cat] = by_category.get(cat, 0) + 1

        stats: dict = {
            "election_type": {
                "source_total": source_total,
                "count": len(unique_election_rows),
                "expected": 5,                        # F7 anchor
                "by_required_role": by_required_role,
            },
            "death_rule": {
                "x_macro_lines_total": self._death_stats["x_macro_lines_total"],
                "skipped_sentinels":   self._death_stats["skipped_sentinels"],
                "count": len(self._death_rule_rows),
                "expected": 27,                       # F8 anchor
                "by_category": by_category,
                "unknown_tags": self._death_stats.get("unknown_tags", []),
            },
        }

        return {
            "election_types": unique_election_rows,
            "death_rules":    self._death_rule_rows,
            "_stats":         stats,
        }
