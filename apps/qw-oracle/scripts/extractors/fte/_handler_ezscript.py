"""ezscript plugin handler for the FTE AST extractor.

Walks plugins/ezscript/ezscript.c, extracting cross-engine cvar aliases from
the Plug_ExecuteCommand strcmp branch chain. Each branch has the shape:

    if (!strcmp("LHS", cmd)) cvar = "RHS";

Emits one cvar_alias row per branch with target descriptors, drift status,
and freshness state. Drift / freshness data joins from a checked-in TSV seed
at seeds/ezscript-drift-369-vs-build-6698.tsv (target=FTE@build-6698,
mimics=ezQuake@3.6.9). Spec:
docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md.

File-scope gate: only fires on the single file plugins/ezscript/ezscript.c.
The plugin has no other source files; nothing else in the FTE tree uses the
Plug_ExecuteCommand-strcmp idiom we extract here.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import concat_string_literals  # noqa: E402


SEED_FILENAME = "ezscript-drift-369-vs-build-6698.tsv"
VERIFIED_TARGET_VERSION = "build-6698"
VERIFIED_MIMICS_VERSION = "3.6.9"


def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _find_strcmp_lhs(cursor) -> Optional[str]:
    """Recursively find the first strcmp CALL_EXPR's first STRING_LITERAL arg.

    Used on an IF_STMT condition subtree. The strcmp is wrapped in a
    UNARY_OPERATOR (!) and possibly a PAREN_EXPR. Walking children handles all
    such wrappers without enumerating their kinds.
    """
    if cursor.kind == CursorKind.CALL_EXPR and cursor.spelling == "strcmp":
        args = list(cursor.get_arguments())
        if args:
            return concat_string_literals(_tokens_of(args[0]))
    for child in cursor.get_children():
        result = _find_strcmp_lhs(child)
        if result is not None:
            return result
    return None


def _find_string_literal_in_subtree(cursor) -> Optional[str]:
    """First STRING_LITERAL found via DFS. Used on the IF_STMT body subtree;
    the only string literal there is the RHS of `cvar = "..."`.
    """
    if cursor.kind == CursorKind.STRING_LITERAL:
        return concat_string_literals(_tokens_of(cursor))
    for child in cursor.get_children():
        result = _find_string_literal_in_subtree(child)
        if result is not None:
            return result
    return None


def _split_target(rhs: str) -> tuple[str, str]:
    """ezscript redirects can target FTE serverinfo via a `serverinfo NAME`
    string literal. Split into (target_kind, target_name); default kind is
    'cvar'. Mirrors the 2 serverinfo redirects observed at build-6698.
    """
    s = rhs.strip()
    if s.startswith("serverinfo "):
        return ("serverinfo", s[len("serverinfo "):].strip())
    if s.startswith("userinfo "):
        return ("userinfo", s[len("userinfo "):].strip())
    return ("cvar", s)


def _drift_to_default_status(def_match: str) -> str:
    """Map seed's `def_match` column onto schema's default_drift_status.

    'same' -> 'same'; 'DIFF' -> 'differ_dangerous' (handler is conservative;
    manual review can promote to 'differ_safe'); anything else -> 'unknown'.
    Existence questions live on freshness_state, not default_drift_status.
    """
    if def_match == "same":
        return "same"
    if def_match == "DIFF":
        return "differ_dangerous"
    return "unknown"


def _seed_states_to_freshness(ez_state: str, fte_state: str) -> str:
    """Combine seed's per-side `ez_state` / `fte_state` columns into a
    single freshness_state. Buckets follow the spec's enum.
    """
    ez_alive = ez_state == "source_backed"
    fte_alive = fte_state == "source_backed"
    if ez_alive and fte_alive:
        return "alive"
    if not ez_alive and fte_alive:
        return "mimics_lhs_gone"
    if ez_alive and not fte_alive:
        return "target_gone"
    if not ez_alive and not fte_alive:
        return "both_gone"
    return "unknown"


class EzscriptFteHandler(Visitor):
    name = "ezscript"
    output_filename = "fte-aliases-ast.json"

    def __init__(self) -> None:
        self._drift: dict[str, dict] = {}

    # -- Visitor lifecycle ---------------------------------------------------

    def setup(self, *, fte_repo: Path, engine_dir: Path) -> None:
        seed_path = HERE / "seeds" / SEED_FILENAME
        if not seed_path.exists():
            self._drift = {}
            return
        rows: dict[str, dict] = {}
        with seed_path.open("r", encoding="utf-8") as fh:
            header = fh.readline()
            for line in fh:
                if not line.strip():
                    continue
                parts = line.rstrip("\n").split("\t")
                if len(parts) < 7:
                    continue
                ez_name = parts[0].strip().lower()
                rows[ez_name] = {
                    "fte_name":     parts[1].strip(),
                    "ez_def_369":   parts[2].strip(),
                    "fte_def_6698": parts[3].strip(),
                    "def_match":    parts[4].strip(),
                    "ez_state":     parts[5].strip(),
                    "fte_state":    parts[6].strip(),
                }
        self._drift = rows
        del header  # explicit drop; only used to skip the column row

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        path_str = str(source_path)
        is_ezscript_dir = (
            "/plugins/ezscript/" in path_str
            or "\\plugins\\ezscript\\" in path_str
        )
        self._is_ezscript = is_ezscript_dir and source_path.name == "ezscript.c"
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if not self._is_ezscript:
            return
        if cursor.kind != CursorKind.IF_STMT:
            return

        children = list(cursor.get_children())
        if len(children) < 2:
            return
        cond = children[0]
        body = children[1]

        lhs = _find_strcmp_lhs(cond)
        if not lhs:
            return
        rhs = _find_string_literal_in_subtree(body)
        if not rhs:
            return

        lhs_lc = lhs.strip().lower()
        if lhs_lc in self._seen_in_file:
            return
        self._seen_in_file.add(lhs_lc)

        target_kind, target_name = _split_target(rhs)
        loc = cursor.location
        source_file = loc.file.name if loc.file else None
        source_line = loc.line
        source_column = loc.column
        source_root = getattr(self, "current_source_root", "plugin:ezscript")

        self._rows.append({
            "lhs":           lhs_lc,
            "target_kind":   target_kind,
            "target_name":   target_name,
            "source_file":   source_file,
            "source_line":   source_line,
            "source_column": source_column,
            "source_root":   source_root,
        })

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Collapse per-file rows + join drift seed + emit loader-shaped JSON.

        Output mirrors CvarAliasExtractorOutput in oracle's types.ts:
        {"aliases": {<lhs>: <CvarAliasEntry>, ...}}.
        """
        deduped: dict[str, dict] = {}
        for row in all_rows:
            lhs = row["lhs"]
            if lhs not in deduped:
                deduped[lhs] = row

        repo_root_path = Path(repo_root).resolve()
        aliases_out: dict[str, dict] = {}
        joined = 0
        unjoined = 0

        for lhs, row in deduped.items():
            seed = self._drift.get(lhs)
            default_drift_status = "unknown"
            freshness_state = "unknown"
            verified_target_version: Optional[str] = None
            verified_mimics_version: Optional[str] = None

            if seed is not None:
                default_drift_status = _drift_to_default_status(seed["def_match"])
                freshness_state = _seed_states_to_freshness(seed["ez_state"], seed["fte_state"])
                verified_target_version = VERIFIED_TARGET_VERSION
                verified_mimics_version = VERIFIED_MIMICS_VERSION
                joined += 1
            else:
                unjoined += 1

            src_file = row.get("source_file")
            if src_file:
                try:
                    src_file = str(Path(src_file).resolve().relative_to(repo_root_path))
                except ValueError:
                    pass

            ast_block = {
                "source_file":   src_file,
                "source_line":   row["source_line"],
                "source_column": row["source_column"],
            }
            entry = {
                "ast":                     ast_block,
                "target_project":          "fte",
                "target_kind":             row["target_kind"],
                "target_name":             row["target_name"],
                "mimics_project":          "ezquake",
                "value_transform":         "identity",
                "default_drift_status":    default_drift_status,
                "semantic_confidence":     "medium",
                "verified_target_version": verified_target_version,
                "verified_mimics_version": verified_mimics_version,
                "freshness_state":         freshness_state,
                "source_root":             "plugin:ezscript",
            }
            aliases_out[lhs] = entry

        sorted_aliases = {k: aliases_out[k] for k in sorted(aliases_out)}
        return {
            "aliases": sorted_aliases,
            "_stats": {
                "count":           len(sorted_aliases),
                "drift_joined":    joined,
                "drift_unjoined":  unjoined,
                "seed_target_version": VERIFIED_TARGET_VERSION,
                "seed_mimics_version": VERIFIED_MIMICS_VERSION,
            },
        }
