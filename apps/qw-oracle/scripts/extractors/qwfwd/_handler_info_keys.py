"""Info keys handler for the QWFWD AST extractor.

Detects userinfo/serverinfo string-key call sites via the QW `Info_*` C API
in QWFWD src/*.c. Mirrors the MVDSV info_keys handler structure (cross-
codebase port, not a MVDSV subclass).

API -> operation map:

  Reads
    Info_ValueForKey       (canonical QW protocol read)
  Writes
    Info_SetValueForKey    (non-star key)
    Info_SetValueForStarKey (star-prefixed key)
    Info_SetValueForKeyEx  (QWFWD-specific variant: write with size guard)
  Removes
    Info_RemoveKey         (canonical QW protocol remove)

QWFWD does NOT use Info_Get / Info_Set / Info_SetStar / Info_Remove (MVDSV-
local wrappers absent in this codebase). Info_SetValueForKeyEx is QWFWD-only
(svc.c:264) and maps to write.

Scope classification mirrors MVDSV with one QWFWD-specific addition:

  - substring 'ps.info'                 -> scope='serverinfo'
    (QWFWD stores its proxy serverinfo in ps.info, not svs.info -- the
    _classify_scope override adds this check before the standard rules)
  - substring 'userinfo' or 'biguserinfo' -> scope='userinfo'
    (biguserinfo is outgoing connect userinfo in clc.c)
  - substring 'svs.info' or 'serverinfo' -> scope='serverinfo'
    (retained from MVDSV base for future-proofing; not seen in QWFWD source)
  - substring 'localinfo'               -> scope='localinfo'
    (retained from MVDSV base; not seen in QWFWD source)

Non-literal key handling (Q-INFO requirement):
  When the key argument is an identifier (not a string literal), the handler
  looks it up in self.file_macros (populated by walk_tu_dispatch from
  collect_file_macros over the full transitive include closure). This resolves
  QWFWD_PRX_KEY (qwfwd.h:125 = "prx") at svc.c:247 / svc.c:264 / svc.c:269.
  Runtime variables (e.g. var->name, Cmd_Argv(1), key) have no macro entry
  and are skipped.

Exclusion:
  info.c is the Info_* implementation file. Excluded by file-level guard in
  start_file (mirrors the F6 pattern for cvar.c in the cvars handler). Without
  this exclusion the implementation body's own calls would emit spurious rows.

CROSS-WORKER AGGREGATION (Approach B, mirroring MVDSV). Workers accumulate
primitive rows per file in end_file. Aggregation by (name, scope) happens
once in finalize after worker results merge.

Output entity shape -- canonical `<bare>:<scope>` naming (Phase B 2026-04-28):

    {
      "name": "prx:userinfo",
      "bare_name": "prx",
      "ast": {
        "scope": "userinfo",
        "operations": ["read", "remove", "write"],
        "source_file": "src/svc.c",
        "source_line": 247,
        "containing_function": "SVC_DirectConnect",
        "all_call_sites": [
          {"source_file": "src/svc.c", "source_line": 247, "operation": "read"},
          {"source_file": "src/svc.c", "source_line": 264, "operation": "write"},
          {"source_file": "src/svc.c", "source_line": 269, "operation": "remove"}
        ]
      }
    }
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import read_extent  # noqa: E402


def _classify_scope(first_arg_text: str) -> Optional[str]:
    """Map a first-argument source extent to one of three scopes, or None.

    Order is load-bearing: ps.info must be checked before 'serverinfo' so
    QWFWD's proxy-info buffer is classified correctly. 'localinfo' is checked
    before 'userinfo'/'serverinfo' to match the MVDSV convention (guards
    against hypothetical future overlap). 'biguserinfo' contains 'userinfo'
    as a suffix so the 'userinfo' substring check covers it naturally.
    """
    s = first_arg_text
    # QWFWD-specific: ps.info is the proxy serverinfo buffer, not a userinfo.
    # Must come before the generic 'serverinfo' check (ps.info does not contain
    # 'serverinfo' as a substring, but defensive ordering costs nothing).
    if "ps.info" in s:
        return "serverinfo"
    # localinfo before userinfo: mirrors MVDSV conservative ordering.
    if "localinfo" in s:
        return "localinfo"
    # 'biguserinfo' contains 'userinfo' as substring -- the check below covers
    # both naturally (biguserinfo -> userinfo scope, same as plain userinfo).
    if "userinfo" in s:
        return "userinfo"
    if "svs.info" in s or "serverinfo" in s:
        return "serverinfo"
    return None


class InfoKeysQwfwdHandler(Visitor):
    """QWFWD info-keys handler (Info_* C-API call detection).

    Cross-codebase port: subclasses Visitor directly, not InfoKeysMvdsvHandler.
    The QWFWD codebase differs from MVDSV in three ways:
      1. API_OP_MAP includes Info_SetValueForKeyEx (svc.c:264), absent in MVDSV.
      2. _classify_scope adds ps.info -> serverinfo (QWFWD proxy serverinfo).
      3. info.c is excluded (the Info_* implementation, mirrors F6 cvar.c logic).
    """
    name = "info_keys"
    output_filename = "qwfwd-info-keys-ast.json"
    payload_field = "info_keys"

    # QWFWD Info_* APIs -> operation discriminator. Mirrors MVDSV's set minus
    # the MVDSV-local wrappers (Info_Get, Info_Set, Info_SetStar, Info_Remove)
    # which are absent in QWFWD, plus the QWFWD-specific Info_SetValueForKeyEx
    # (svc.c:264, write op with size+maxlen guard).
    API_OP_MAP: dict = {
        # Read
        "Info_ValueForKey":         "read",
        # Write
        "Info_SetValueForKey":      "write",
        "Info_SetValueForStarKey":  "write",
        "Info_SetValueForKeyEx":    "write",
        # Remove
        "Info_RemoveKey":           "remove",
    }

    def setup(self, *, qwfwd_repo: Path, qwfwd_src: Path) -> None:
        self._repo_root = qwfwd_repo
        self._src_root = qwfwd_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Exclude info.c: it contains the Info_* function implementations,
        # not call sites that register or consume named keys. Without this
        # guard the implementation body's own internal calls emit spurious rows
        # (mirrors the F6 cvar.c exclusion in the cvars handler).
        self._is_info_impl = (source_path.name == "info.c")
        # Per-file dedup: each call site is visited once per platform variant.
        # Key by (line, key_name, scope, op) -- same idiom as MVDSV handler.
        self._seen_sites_in_file: set[tuple[int, str, str, str]] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        # info.c contains the Info_* implementations -- skip all cursors.
        if self._is_info_impl:
            return
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        if spelling not in self.API_OP_MAP:
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        # Classify scope from first-arg source text.
        first_text = read_extent(self.source_bytes, args[0].extent)
        scope = _classify_scope(first_text)
        if scope is None:
            return

        # Resolve the key name from the second argument.
        # Primary: string literal (most call sites).
        # Fallback: identifier lookup in self.file_macros (covers QWFWD_PRX_KEY).
        # Skip: genuine runtime variables (var->name, Cmd_Argv(1)) with no
        # macro definition -- these are data-flow cases not recoverable here.
        second_text = read_extent(self.source_bytes, args[1].extent).strip()
        key_name: Optional[str] = None

        if second_text.startswith('"') and second_text.endswith('"') and len(second_text) >= 2:
            # String literal: strip outer quotes directly.
            key_name = second_text[1:-1]
        else:
            # Not a literal. Try macro resolution: self.file_macros is populated
            # by walk_tu_dispatch via collect_file_macros over the full transitive
            # include closure. QWFWD_PRX_KEY appears as a bare identifier at the
            # call site and resolves to "prx" here.
            candidate = second_text.strip()
            if candidate in self.file_macros:
                key_name = self.file_macros[candidate]

        if not key_name:
            return

        op = self.API_OP_MAP[spelling]
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        # Per-file across-variant dedup. Same call site appears once per
        # compiled platform variant; deduplicate on (line, key, scope, op).
        site_key = (location.line, key_name, scope, op)
        if site_key in self._seen_sites_in_file:
            return
        self._seen_sites_in_file.add(site_key)

        # Emit a primitive row -- one per call site. Aggregation by (name, scope)
        # happens in finalize (Approach B cross-worker merge).
        self._rows.append({
            "name": key_name,
            "scope": scope,
            "op": op,
            "source_file": rel_file,
            "source_line": location.line,
            "containing_function": containing_fn,
        })

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative for V8 reproducibility; fall back to
        absolute if the path is outside the repo root (should not happen for
        QWFWD's flat src/ layout, but defensive)."""
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_sites_in_file = set()
        self._func_stack = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Approach B aggregation: bucket primitive rows by (name, scope).

        The first row for each bucket becomes the anchor (source_file /
        source_line / containing_function). Operations are unioned; every
        call site is preserved in all_call_sites. Sort by (scope, name) for
        deterministic output (V8 reproducibility requirement). Sort operations
        lists so {read, write} and {write, read} produce identical output.
        """
        aggregated: dict[tuple[str, str], dict] = {}
        for r in all_rows:
            agg_key = (r["name"], r["scope"])
            site = {
                "source_file": r["source_file"],
                "source_line": r["source_line"],
                "operation": r["op"],
            }
            existing = aggregated.get(agg_key)
            if existing is None:
                # Canonical name is `<bare>:<scope>` (Phase B 2026-04-28).
                # bare_name at top level allows MCP `name LIKE '<bare>:%'`
                # prefix fallback for type=info_key lookups.
                aggregated[agg_key] = {
                    "name": f"{r['name']}:{r['scope']}",
                    "bare_name": r["name"],
                    "ast": {
                        "scope": r["scope"],
                        "operations": [r["op"]],
                        "source_file": r["source_file"],
                        "source_line": r["source_line"],
                        "containing_function": r["containing_function"],
                        "all_call_sites": [site],
                    },
                }
            else:
                ops = existing["ast"]["operations"]
                if r["op"] not in ops:
                    ops.append(r["op"])
                existing["ast"]["all_call_sites"].append(site)

        rows = list(aggregated.values())
        # Sort by (scope, name) -- deterministic ordering across re-runs (V8).
        rows.sort(key=lambda r: (r["ast"]["scope"], r["name"]))
        for r in rows:
            r["ast"]["operations"].sort()

        by_scope: dict[str, int] = {}
        for r in rows:
            sc = r["ast"]["scope"]
            by_scope[sc] = by_scope.get(sc, 0) + 1

        return {
            "info_keys": rows,
            "_stats": {
                "source_total_call_sites": len(all_rows),
                "count": len(rows),
                "by_scope": by_scope,
            },
        }
