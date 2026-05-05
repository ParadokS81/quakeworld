"""Visitor protocol + shared-walk dispatcher for the unified extraction driver.

Step 3 optimization: the central walker traverses each TU ONCE and dispatches
every cursor in the target file to each registered Visitor. Previously each
handler owned its own recursive walk; 6 full-walk handlers meant 6x walk work
per TU. Measurements on 30 files showed walk is ~78% of combined parse+walk
time for 2 walks, scaling near-linearly with handler count.

Handlers inherit `Visitor` and override whichever hooks they care about.
Target-file filter is applied by the walker: cursors outside the target file
are NOT recursed into. This skips system-header subtrees entirely rather than
having every handler filter at visit time.

Hot-path args (cursor, variant) are positional for speed; the walker is
called ~200k times per TU so kwarg overhead is measurable.
"""
from __future__ import annotations

from pathlib import Path

from clang.cindex import CursorKind


class Visitor:
    """Base class for cursor-dispatch handlers. All hooks are no-op defaults.

    Handlers read source_path/source_bytes off self (cached by start_file).
    Handlers that maintain per-file state (stacks, seen-sets, accumulators)
    should also initialize those in start_file and read them back in
    end_file.
    """

    name: str = ""
    output_filename: str = ""

    source_path: Path = None  # type: ignore
    source_bytes: bytes = b""
    file_macros: dict[str, str] = {}

    # OPTIONAL setup(*, ezq_repo: Path, ezq_src: Path) -> None
    # Checked via hasattr by the driver. One-time init (e.g. parse
    # cvar_groups.h). Handlers that don't need setup simply omit it.

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        """Called before walk. Default: caches path/bytes on self."""
        self.source_path = source_path
        self.source_bytes = source_bytes

    def enter_function(self, cursor, variant: str) -> None:
        """Called when the walker enters a FUNCTION_DECL with a body in the
        target file."""
        pass

    def exit_function(self, cursor, variant: str) -> None:
        """Called when the walker leaves a FUNCTION_DECL body."""
        pass

    def enter_compound(self, cursor, variant: str) -> None:
        """Called when the walker enters a COMPOUND_STMT in the target file."""
        pass

    def exit_compound(self, cursor, variant: str) -> None:
        """Called when the walker leaves a COMPOUND_STMT. Handlers that do
        scope-bound pairing (asset-cvar-bindings, asset-loader-sites) emit
        their rows on this exit."""
        pass

    def visit_cursor(self, cursor, variant: str) -> None:
        """Called for EVERY cursor inside the target file (including the
        FUNCTION_DECL / COMPOUND_STMT cursors themselves). Handlers filter
        by cursor.kind and do their work."""
        pass

    def end_file(self) -> list[dict]:
        """Return all rows collected for this file. Default: []."""
        return []

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Assemble the final JSON output dict from merged per-file rows.
        Must be overridden by every concrete handler."""
        raise NotImplementedError(f"{self.name}: finalize() not implemented")


_FUNCTION_DECL = CursorKind.FUNCTION_DECL
_COMPOUND_STMT = CursorKind.COMPOUND_STMT


def walk_tu_dispatch(
    tu,
    visitors: list,
    variant: str,
    target_path_str: str,
    *,
    source_root: str | None = None,
) -> None:
    """Recursive walker that dispatches every cursor in the target file to
    every visitor, with enter/exit pairs for FUNCTION_DECL-with-body and
    COMPOUND_STMT. Skips recursion into subtrees whose root is outside the
    target file -- big win on system-header bodies.

    Traversal order matches legacy handlers exactly: pre-order visit, then
    recurse into children in cursor order. enter_* fires before visit_cursor
    on the same node; exit_* fires after all children are visited.

    source_root: optional label (e.g. "engine", "plugin:ezhud") set on each
    visitor as `current_source_root` before the walk. Handlers that track
    provenance read this field. Existing callers that omit it get None, which
    is safe for single-root extractors (ezQuake, QWCL).
    """
    for v in visitors:
        v.current_source_root = source_root
    from extractor_lib._source import collect_file_macros as _collect_file_macros
    _fm = _collect_file_macros(tu, target_path_str)
    for v in visitors:
        v.file_macros = _fm
    def recurse(node):
        # Target-file filter. loc.file is None for preprocessor/built-in
        # cursors (harmless to descend into -- their children either also
        # have file=None or the file we want). For cursors with a file,
        # skip if it's not the one we're extracting from.
        loc = node.location
        f = loc.file
        if f is not None and f.name != target_path_str:
            return

        kind = node.kind
        entered_func = False
        entered_compound = False
        children_cache = None

        if kind == _FUNCTION_DECL:
            # Peek at children to detect body presence.
            children_cache = list(node.get_children())
            has_body = False
            for c in children_cache:
                if c.kind == _COMPOUND_STMT:
                    has_body = True
                    break
            if has_body:
                for v in visitors:
                    v.enter_function(node, variant)
                entered_func = True
        elif kind == _COMPOUND_STMT:
            for v in visitors:
                v.enter_compound(node, variant)
            entered_compound = True

        # Dispatch visit for this cursor.
        for v in visitors:
            v.visit_cursor(node, variant)

        # Recurse into children.
        if children_cache is not None:
            for c in children_cache:
                recurse(c)
        else:
            for c in node.get_children():
                recurse(c)

        if entered_func:
            for v in visitors:
                v.exit_function(node, variant)
        if entered_compound:
            for v in visitors:
                v.exit_compound(node, variant)

    recurse(tu.cursor)
