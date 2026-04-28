"""Info keys handler for the MVDSV AST extractor.

Detects userinfo/serverinfo/localinfo string-key call sites via the QW
`Info_*` C API. Eight read/write/remove APIs are recognised; each call site
contributes one operation (read/write/remove) on a (key_name, scope) pair.

API -> operation map:

  Reads
    Info_ValueForKey       (canonical QW protocol read)
    Info_Get               (MVDSV-local wrapper, 62 sites -- dominant read)
  Writes
    Info_SetValueForKey    (non-star key)
    Info_SetValueForStarKey (star-prefixed key)
    Info_SetStar           (MVDSV-local star write)
    Info_Set               (MVDSV-local non-star write)
  Removes
    Info_RemoveKey         (canonical QW protocol remove)
    Info_Remove            (MVDSV-local wrapper)

Scope is determined from the textual shape of the FIRST argument:

  - substring 'userinfo'                -> scope='userinfo'
    (covers `cl->userinfo`, `cl->_userinfo_ctx_`, `_userinfoshort_ctx_`,
    `sv_client->userinfo`, etc.)
  - substring 'svs.info' or 'serverinfo' -> scope='serverinfo'
    (server-global info; svs.info is the dominant idiom in MVDSV)
  - substring 'localinfo'               -> scope='localinfo'
    (covers `_localinfo_`, `localinfo`)

If first-arg text matches none of these (e.g. a bare `payload`, `s`, `ctx`,
`string` parameter inside a wrapper helper), the call site is skipped --
not classifiable. This drops common.c's wrapper-internal calls such as
`Info_Remove(ctx, name)` where the scope is determined by the caller.

The SECOND argument must be a literal string. Non-literal keys (variables
like `key`, `name`, `Cmd_Argv(1)` etc.) are out of scope for Pattern 1
detection -- recovering them needs Pattern 2 (data-flow back through the
caller chain).

CROSS-WORKER AGGREGATION (Approach B). Forked workers each accumulate per-
file primitive rows from `end_file`. Aggregation by (name, scope) happens
once in `finalize` in the parent, after worker results merge. This avoids
cross-process state (Approach A would require accumulator state to survive
the fork-merge boundary, which it doesn't).

Output entity shape (one row per unique (name, scope) tuple):

    {
      "name": "*z_ext:serverinfo",
      "bare_name": "*z_ext",
      "ast": {
        "scope": "serverinfo",
        "operations": ["read", "write"],
        "source_file": "src/sv_main.c",  // first-seen site (anchor)
        "source_line": 1234,
        "containing_function": "SV_InitLocal",
        "all_call_sites": [
          {"source_file": ..., "source_line": ..., "operation": "read"},
          ...
        ]
      }
    }

CANONICAL NAME CONVENTION (Phase B 2026-04-28). The emitted `name` field is
the suffixed form `<bare>:<scope>` so cross-scope registrations of the same
key (e.g. `*z_ext` registered as both serverinfo via SV_InitLocal AND
userinfo via SVC_DirectConnect) survive the entities table's
UNIQUE(project, type, name) constraint. The unsuffixed form is preserved
in `bare_name` at the top level (parallels `name`) so downstream consumers
can still lookup by the unsuffixed form. The MCP `lookup_entity` tool
falls back to a `name LIKE '<bare>:%'` prefix match for type=info_key
when the queried name has no `:`.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


# Eight Info_* APIs -> operation discriminator. Names are exact (CALL_EXPR
# spellings). Wrappers like Info_RemoveAll / Info_RemovePrefixedKeys
# (key-list variants) are intentionally NOT here -- they don't take a
# literal-string key and aren't per-key call sites.
_API_OP_MAP: dict[str, str] = {
    # Read APIs
    "Info_ValueForKey":         "read",
    "Info_Get":                 "read",
    # Write APIs
    "Info_SetValueForKey":      "write",
    "Info_SetValueForStarKey":  "write",
    "Info_SetStar":             "write",
    "Info_Set":                 "write",
    # Remove APIs
    "Info_RemoveKey":           "remove",
    "Info_Remove":              "remove",
}


def _read_extent(source_bytes: bytes, extent) -> str:
    """Return the source text for an AST extent."""
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def _classify_scope(first_arg_text: str) -> Optional[str]:
    """Map a first-argument source extent to one of three scopes, or None
    if the expression doesn't textually contain any of our scope markers.
    Order matters only for non-overlapping markers; check 'localinfo' before
    a hypothetical 'serverinfo' substring overlap (none exists today)."""
    s = first_arg_text
    # 'localinfo' is checked before 'userinfo'/'serverinfo' so that the
    # `_localinfo_` global doesn't get mis-classified if either of the
    # other markers ever appear in the same expression. They don't today
    # but the conservative ordering keeps the rule stable.
    if "localinfo" in s:
        return "localinfo"
    if "userinfo" in s:
        return "userinfo"
    if "svs.info" in s or "serverinfo" in s:
        return "serverinfo"
    return None


class InfoKeysMvdsvHandler(Visitor):
    name = "info_keys"
    output_filename = "mvdsv-info-keys-ast.json"
    payload_field = "info_keys"

    def setup(self, *, mvdsv_repo: Path, mvdsv_src: Path) -> None:
        self._repo_root = mvdsv_repo
        self._src_root = mvdsv_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup: each call site is visited 3x because the walker
        # dispatches once per platform variant (server-base / win / linux).
        # Same idiom as the cvars/commands handlers (`_seen_in_file`).
        # Key by (line, key_name, scope, op) so distinct call sites on the
        # same line (rare but possible: e.g. `Info_Set(...); Info_Get(...);`
        # on one line) survive.
        self._seen_sites_in_file: set[tuple[int, str, str, str]] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        if spelling not in _API_OP_MAP:
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        # Classify scope from first-arg source text.
        first_text = _read_extent(self.source_bytes, args[0].extent)
        scope = _classify_scope(first_text)
        if scope is None:
            return

        # Require a literal-string second arg (the key name).
        second_text = _read_extent(self.source_bytes, args[1].extent).strip()
        if not (second_text.startswith('"') and second_text.endswith('"')):
            return
        key_name = second_text[1:-1]
        if not key_name:
            return

        op = _API_OP_MAP[spelling]
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        # Per-file across-variant dedup. Drop the 2nd and 3rd visits of
        # this call site under the win/linux variants when the body is
        # identical at this line.
        site_key = (location.line, key_name, scope, op)
        if site_key in self._seen_sites_in_file:
            return
        self._seen_sites_in_file.add(site_key)

        # Emit a primitive row -- one per call site. Cross-worker aggregation
        # by (name, scope) happens in finalize.
        self._rows.append({
            "name": key_name,
            "scope": scope,
            "op": op,
            "source_file": rel_file,
            "source_line": location.line,
            "containing_function": containing_fn,
        })

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative; fall back to absolute if outside."""
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
        # Approach B aggregation: walk every primitive row and bucket by
        # (name, scope). The first row for each bucket becomes the anchor
        # (source_file/source_line/containing_function); operations are
        # unioned and every call site is recorded in all_call_sites.
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
                # Canonical name is `<bare>:<scope>` (Phase B 2026-04-28). The
                # bare name is preserved at the top level so MCP lookups can
                # query by the unsuffixed form via prefix match.
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
        # Sort scope+name for deterministic output. Sort each operations
        # list so {read,write} and {write,read} produce the same row text.
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
