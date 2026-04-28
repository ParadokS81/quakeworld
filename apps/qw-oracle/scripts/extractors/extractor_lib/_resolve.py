"""Shared AST-cursor resolution helpers.

`resolve_fn_ref(arg_cursor)` walks an arg subtree for the first DECL_REF_EXPR
referencing a FUNCTION_DECL or VAR_DECL and returns its spelling. libclang
wraps function-to-pointer decay in UNEXPOSED_EXPR; recursing strips that
wrapper without per-call special-casing.

Policy (qc_builtins-derived, the more permissive of the two pre-Phase-D
copies): when libclang fails to resolve the referenced decl (rare but
observed for forward-declared static handlers and a few mvdsv corner cases),
fall back to the cursor's own spelling rather than returning None. Silently
dropping a function reference is data loss; preserving the spelling lets the
loader still record what the source said even when the type-graph is
incomplete. The earlier per-handler `_resolve_fn_ref` in
mvdsv/_handler_commands.py used the strict policy (return None on
unresolved); unifying on the permissive policy is the chosen direction.
"""
from __future__ import annotations

from typing import Optional

from clang.cindex import CursorKind


def resolve_fn_ref(arg_cursor) -> Optional[str]:
    """Walk arg subtree for the first DECL_REF_EXPR referencing a function or
    variable declaration. Returns the referenced decl's spelling, or the
    cursor's own spelling if libclang couldn't resolve the referenced decl.
    Returns None only if no DECL_REF_EXPR is found in the subtree at all."""
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind in (
                CursorKind.FUNCTION_DECL,
                CursorKind.VAR_DECL,
            ):
                return ref.spelling
            # Permissive fallback: cursor's own spelling preserves the
            # reference name even when libclang couldn't bind the decl.
            spelling = n.spelling
            if spelling:
                return spelling
        stack.extend(list(n.get_children()))
    return None
