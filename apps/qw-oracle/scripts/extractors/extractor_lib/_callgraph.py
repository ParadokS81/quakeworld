"""Track-A call-graph reachability passenger (Tier-1 shared, internal).

This module rides the existing ezQuake libclang walk as a READ-ONLY
passenger and answers one downstream question per registered entity:
is this cvar/command's registrar reachable at runtime, or is it dead
code (a ghost L1 currently SHOWS)?

It contains THREE structurally-separate pieces in one file (D1/D7.1
no-blend is preserved by construction -- separation is logical, not
just textual):

  (1) CallGraphObserver(Visitor) -- a pure observer over the 4-variant
      walk. It NEVER mutates the cursor, the source bytes, file_macros,
      another handler's rows, or the visitor list (D6). It appends ONLY
      to its own private per-file store. Collected: caller->callee edges
      (by spelling), address-taken function facts, and entity->registrar
      bindings (commands AND cvars -- the F5 asymmetry: the existing cvar
      handler does NOT bind Cvar_Register call sites to a registrar, so
      this passenger does it itself).

  (2) A post-walk reachability engine. For EACH of the 4 ezQuake build
      variants independently it builds the directed call graph from the
      merged edges, computes the root set (program-entry cascade UNION
      address-taken closure), runs a full-subtree BFS (D4 -- no shrink
      heuristic), and resolves every registrar to a three-valued
      per-variant state (reachable | unreachable | not-compiled -- D5;
      not-compiled is a DISTINCT enum value, never collapsed). The
      conservative combination (D3/D5) decides build-excluded vs
      genuine-dead, biased so that ANY unresolved case is build-excluded
      / reachable -- never genuine-dead (X4 fail-safe; a wrong rule here
      ships a wrong upstream delete PR).

  (3) scan_commented_registrations() -- feeder (b). A STANDALONE textual
      function (NOT a method of the Visitor; NO AST, NO edges, NO BFS,
      NO shared state with (1)/(2)). libclang strips comments, so a
      `// Cvar_Register(&gl_outline_scale_world);` is INVISIBLE to the
      call-graph feeder; this regex over raw source text is the only way
      to surface it. Architecturally separate per D1/D7.1 (the D7
      AMENDMENT 2026-05-17 ratified building this minimal scanner here
      because no pre-existing pass exists).

Module-level contract (the phase-boundary check requires all three to be
module-level attributes):

  CallGraphObserver               -- the observer class
  reachable(entity, ...)          -- the per-entity verdict query
  scan_commented_registrations(.) -- feeder (b)

This module does NOT wire itself into the pipeline (Task 2) and writes
NO entity JSON (it is an observer, not a handler).
"""
from __future__ import annotations

import re
import sys
from collections import deque
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
if str(HERE.parent) not in sys.path:
    sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._resolve import resolve_fn_ref  # noqa: E402
from extractor_lib._source import literal_string, strip_array_and_qualifiers  # noqa: E402


# ---------------------------------------------------------------------------
# Variant identifiers (F3 -- verified live in clang_config.py 2026-05-17:
# clang_args_for / clang_args_server_for / clang_args_win_for /
# clang_args_apple_for). These four strings are the per-variant evidence
# keys everywhere in this module. The existing walk collapses win/apple to
# the label "client" (extract.py:134-137); the observer must NOT trust the
# positional `variant` arg -- Task 2's seam sets `active_variant` to the
# TRUE variant before each of the four dispatch passes.
# ---------------------------------------------------------------------------
VARIANT_CLIENT = "client"
VARIANT_SERVER = "server"
VARIANT_WIN = "win"
VARIANT_APPLE = "apple"
ALL_VARIANTS = (VARIANT_CLIENT, VARIANT_SERVER, VARIANT_WIN, VARIANT_APPLE)

# Safe default: if the seam never injects a true variant (e.g. the observer
# is constructed but the side-channel is broken), every walk lands in
# "client". A function only-seen-in-client then looks not-compiled in the
# other three variants -- the SAFE direction (D3: under-report, never
# false-accuse). It can never make a live entity look genuine-dead.
_DEFAULT_VARIANT = VARIANT_CLIENT


# ---------------------------------------------------------------------------
# Per-variant three-valued state (D5). not-compiled is a DISTINCT value,
# physically separable from unreachable everywhere -- conflating the two is
# the central false-accusation trap the whole arc exists to avoid.
# ---------------------------------------------------------------------------
STATE_REACHABLE = "reachable"
STATE_UNREACHABLE = "unreachable"
STATE_NOT_COMPILED = "not-compiled"

# Combined conclusion (D5). build-excluded is the cleared/never-accused
# bucket (also the catch-all for every unresolved/ambiguous case -- X4).
# genuine-dead is the only autonomously-shippable verdict and is reached
# ONLY by the strict "unreachable in EVERY compiled variant AND compiled
# in >=1" rule (callgraph feeder) or the commented-register feeder.
CONCLUSION_GENUINE_DEAD = "genuine-dead"
CONCLUSION_BUILD_EXCLUDED = "build-excluded"

FEEDER_CALLGRAPH = "callgraph"
FEEDER_COMMENTED_REGISTER = "commented-register"


# ---------------------------------------------------------------------------
# Program-entry cascade roots (D3). The BFS is NAME-based; these are the
# seed FUNCTION NAMES, not file:line (cites are recorded only for
# auditability/D15 evidence). Verified live 2026-05-17 against pinned
# ezQuake HEAD 3f9e724f:
#   client/win/apple cascade: main (sys_posix.c:318) -> Host_Init
#       (host.c:633, unguarded) -> ... -> CL_Init (cl_main.c:2094,
#       called host.c:709) -> V_Init (cl_view.c:1127, called
#       cl_main.c:2121).
#   server cascade: main (sv_sys_unix.c:165 / sv_sys_win.c:731) ->
#       SERVERONLY Host_Init (sv_main.c:3869, inside #ifdef SERVERONLY
#       3825-..). The server Host_Init never calls CL_Init/V_Init and
#       cl_view.c is client-only -> NOT compiled in SERVERONLY.
#
# Both cascades seed `main` and `Host_Init` by NAME. The libclang TUs
# resolve which `Host_Init` body is compiled per variant (the SERVERONLY
# one in the server build, the host.c one in client/win/apple), so the
# full-subtree BFS from these two names walks the correct cascade for
# each variant automatically -- no need to pick a file here.
# ---------------------------------------------------------------------------
_ENTRY_ROOTS_CLIENT_FAMILY = ("main", "Host_Init")
_ENTRY_ROOTS_SERVER = ("main", "Host_Init")


def _entry_roots_for(variant: str) -> tuple[str, ...]:
    """Program-entry seed function names for a variant (D3 root component 1)."""
    if variant == VARIANT_SERVER:
        return _ENTRY_ROOTS_SERVER
    # client / win / apple share the unguarded host.c cascade.
    return _ENTRY_ROOTS_CLIENT_FAMILY


# ---------------------------------------------------------------------------
# Registration API surface (verified live: _handler_commands.py:184,
# _handler_cvars.py:380-385, the struct-table loop forms). Kept local to
# this module -- the passenger must not depend on another handler's
# attributes (D6 zero shared state).
# ---------------------------------------------------------------------------
_COMMAND_REGISTER_APIS = ("Cmd_AddCommand", "Cmd_AddLegacyCommand")
_CVAR_REGISTER_APIS = ("Cvar_Register", "Cvar_RegisterVariable")

# Struct-array tables registered by a for-loop over `Cmd_AddCommand(
# table[i].name, table[i].fn)` -- the Cmd_AddCommand call args are
# non-literal so the CALL_EXPR detector cannot resolve the name; the
# command handler enumerates the table directly. Mirror that map (same
# value shape as _handler_commands._COMMAND_TABLE_TYPES:
# {struct: (name_field_idx, handler_field_idx)}). sv_ccmds.c:217
# `log_t logs[MAX_LOG]`, looped at sv_ccmds.c:1829.
_COMMAND_TABLE_TYPES: dict[str, tuple[int, int]] = {
    "log_t": (1, 5),
}

# Nested-cvar container struct-types: each element holds cvar_t literals at
# known field indices, registered via `for(...) Cvar_Register(
# &table[i].field)`. Mirror _handler_cvars._NESTED_CVAR_TABLE_TYPES.
# r_aliasmodel.c custom_model_colors[], looped at r_aliasmodel.c:717-718.
_NESTED_CVAR_TABLE_TYPES: dict[str, list[int]] = {
    "custom_model_color_t": [0, 1],
}

_MACRO_IDENT_RE = re.compile(r"^[A-Z_][A-Z0-9_]+$")


def _resolve_var_ref(cursor) -> Optional[str]:
    """First DECL_REF_EXPR's referenced-decl spelling in a subtree.

    Mirrors _handler_cvars._resolve_var_ref -- resolves the `&cvar`
    argument of a Cvar_Register CALL_EXPR to the cvar's C identifier.
    Kept local (D6: the passenger must not import another handler's
    private helper -- that would couple this module to the cvar
    handler's internals).
    """
    stack = [cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None:
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


# ---------------------------------------------------------------------------
# (1) The read-only observer
# ---------------------------------------------------------------------------

class CallGraphObserver(Visitor):
    """Read-only passenger over the 4-variant ezQuake walk.

    Collects, into its OWN private per-file store ONLY:
      - caller->callee edges (caller = enclosing FUNCTION_DECL name,
        callee = CALL_EXPR spelling). Edges are by name; cross-file
        stitching happens in the post-walk BFS.
      - address-taken function names (D3.2): a function identifier that
        appears as a reference but NOT in the callee slot of a CALL_EXPR
        (covers command-handler args, cvar 4th-field on_change,
        struct-table .function fields, callback assignments).
      - entity->registrar bindings: command-name / cvar-name -> the
        enclosing FUNCTION_DECL of the REGISTRATION CALL (the F5
        asymmetry -- for cvars the registration call site is bound here,
        NOT the cvar_t struct-decl site the existing handler records).

    The TRUE build variant is injected by the seam (Task 2) via the
    `active_variant` attribute BEFORE each dispatch pass. The observer
    NEVER trusts the positional `variant` arg (extract.py collapses
    win/apple to "client").

    D6 contract: this class mutates NOTHING outside `self`'s own private
    fields. No write to cursor, source_bytes, file_macros, another
    handler's rows, or the visitor list. X4: visit_cursor / end_file
    swallow per-cursor malformity and skip (the safe bias) rather than
    raising into the shared walk.
    """

    name = "callgraph"
    # No output_filename: this observer writes NO entity JSON (D6). It is
    # never added to the finalize/output path (Task 2 runs its post-walk
    # instead of a finalize()).
    output_filename = ""

    # Set by the seam before each of the 4 dispatch passes. Default is the
    # SAFE direction (see _DEFAULT_VARIANT rationale).
    active_variant: str = _DEFAULT_VARIANT

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        # Function-name stack -- mirrors _handler_commands.py:188/195-199.
        # The base Visitor only fires enter_function for a FUNCTION_DECL
        # WITH a body (_visitor.py:131-142), so the stack top is always
        # the enclosing function DEFINITION -- exactly the caller/registrar
        # we want.
        self._func_stack: list[str] = []
        # Private per-file accumulators (the ONLY things this observer
        # writes). Tagged with the true variant in end_file().
        self._edges: list[tuple[str, str]] = []          # (caller, callee)
        self._address_taken: set[str] = set()            # function names
        self._reg_cmd: list[tuple[str, str]] = []        # (cmd_name, registrar)
        self._reg_cvar: list[tuple[str, str]] = []       # (cvar_name, registrar)
        # cvar C-identifier -> cvar name, from cvar_t VAR_DECLs seen in
        # this file. Lets a Cvar_Register(&X) call resolve X (the C ident
        # _resolve_var_ref returns) back to the registered cvar NAME.
        self._cvar_ident_to_name: dict[str, str] = {}
        # Defer Cvar_Register binding to end_file: the cvar_t decl can
        # textually follow its Cvar_Register call in the same file, so the
        # ident->name map is only complete once the whole file is walked.
        # Each pending entry carries the registrar captured AT the call.
        self._pending_cvar_reg: list[tuple[Optional[str], str]] = []
        # D5 compiled-TU membership for THIS file under the true variant:
        # the set of function NAMES whose body the walker entered here.
        # This is what tells not-compiled apart from unreachable.
        self._compiled_fns: set[str] = set()
        # Identities (spelling, line, col) of CALL_EXPR callee child
        # nodes seen so far this file. Lets the later DECL_REF_EXPR visit
        # tell a call (edge) apart from an address-taken use without an
        # AST parent pointer (pre-order walk guarantees the CALL_EXPR is
        # visited before its callee child).
        self._callee_sites: set[tuple[str, int, int]] = set()

    # ----- function-name stack (the caller / registrar context) ----------

    def enter_function(self, cursor, variant: str) -> None:
        nm = cursor.spelling or "?"
        # Stack push: the caller / registrar context for everything
        # collected inside this function body.
        self._func_stack.append(nm)
        # D5 compiled-TU membership: the base Visitor fires
        # enter_function ONLY for a FUNCTION_DECL with a body in the
        # target file (_visitor.py:131-142), so a name here means this
        # function's DEFINITION is compiled in this variant's TU. The
        # variant tag is applied per-file in end_file (it reads this set).
        self._compiled_fns.add(nm)

    def exit_function(self, cursor, variant: str) -> None:
        # Defensive: never pop an empty stack (a malformed AST could in
        # principle deliver an unbalanced exit). Empty-pop would raise
        # into the shared walk -- an X4 violation.
        if self._func_stack:
            self._func_stack.pop()

    def _is_recorded_callee(self, decl_ref_cursor) -> bool:
        """True if this DECL_REF_EXPR is a callee child of a CALL_EXPR
        already visited this file (so it is an edge, not address-taken).
        Keyed on (spelling, line, col) -- a stable identity within one
        file; the pre-order walk guarantees the CALL_EXPR (which records
        the identity) is visited before this callee child."""
        loc = decl_ref_cursor.location
        return (
            decl_ref_cursor.spelling or "",
            loc.line,
            loc.column,
        ) in self._callee_sites

    # ----- per-cursor collection -----------------------------------------

    def visit_cursor(self, cursor, variant: str) -> None:
        # X4: a malformed cursor must never raise into the walk. Any
        # failure here means this observer simply collects less for this
        # file -- the conservative direction (less evidence biases toward
        # build-excluded/reachable, never genuine-dead).
        try:
            self._visit_cursor_inner(cursor)
        except Exception:
            return

    def _visit_cursor_inner(self, cursor) -> None:
        kind = cursor.kind
        caller = self._func_stack[-1] if self._func_stack else None

        # --- VAR_DECL: struct-table command/cvar registration loops -----
        if kind == CursorKind.VAR_DECL:
            self._collect_command_table(cursor)
            self._collect_nested_cvar_table(cursor)
            # cvar_t scalar VAR_DECL: record ident -> name so a
            # Cvar_Register(&ident) can resolve to the cvar name. This is
            # NOT recording a cvar entity (that is the cvar handler's job
            # and stays byte-identical) -- it is the passenger's own
            # private lookup for registrar binding (F5).
            self._record_cvar_decl_ident(cursor)
            return

        if kind == CursorKind.CALL_EXPR:
            self._collect_call(cursor, caller)
            return

        # --- address-taken function reference (D3.2) --------------------
        # A DECL_REF_EXPR whose referenced cursor is a FUNCTION_DECL and
        # which is NOT the callee of a CALL_EXPR is an address-taken use:
        # the function pointer is passed as an arg
        # (Cmd_AddCommand("x", Foo_f)), stored in a struct .function /
        # 4th-field on_change initializer, or assigned to a callback.
        # Such functions are roots (D3.2) and fully traversed (D4).
        #
        # libclang exposes no AST parent pointer, so we cannot ask "is
        # this DECL_REF_EXPR the callee child of a CALL_EXPR?" directly.
        # Instead _collect_call records the IDENTITY (spelling, line, col)
        # of every CALL_EXPR's callee child into self._callee_sites as it
        # is visited. The walker is strictly pre-order (parent before
        # children -- _visitor.py:148-158), so a CALL_EXPR is always
        # visited before its callee DECL_REF_EXPR; the identity is in the
        # set by the time we reach the callee here and we skip it (it is
        # already an EDGE, not an address-taken). A function that is BOTH
        # called somewhere and address-taken elsewhere still gets recorded
        # address-taken at its non-callee use sites -- correct.
        if kind == CursorKind.DECL_REF_EXPR:
            ref = cursor.referenced
            if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                if not self._is_recorded_callee(cursor):
                    nm = ref.spelling
                    if nm:
                        self._address_taken.add(nm)
            return

    # ----- edge + command/cvar registration at a CALL_EXPR ---------------

    def _collect_call(self, cursor, caller: Optional[str]) -> None:
        sp = cursor.spelling
        if not sp:
            return
        # Edge (D6): caller -> callee by spelling. A call at file scope
        # (no enclosing function -- e.g. a static initializer) has
        # caller None; such an edge can never be traversed from a root
        # (roots are function names) so it is harmless to record/skip.
        if caller is not None:
            self._edges.append((caller, sp))

        # Record the IDENTITY of this CALL_EXPR's callee child so the
        # later DECL_REF_EXPR visit for the same node is recognized as a
        # call (an edge), NOT an address-taken use. The callee is the
        # first child (possibly wrapped in UNEXPOSED_EXPR for
        # function-to-pointer decay); we descend through wrappers to the
        # DECL_REF_EXPR and key on (spelling, line, col) -- a stable,
        # collision-free identity within one file. A function-pointer
        # call `(*fp)()` has no FUNCTION_DECL callee so it never reaches
        # the address-taken branch anyway.
        callee_ref = _find_callee_decl_ref(cursor)
        if callee_ref is not None:
            loc = callee_ref.location
            self._callee_sites.add(
                (callee_ref.spelling or "", loc.line, loc.column)
            )

        # Command registration: bind literal arg-0 -> registrar.
        if sp in _COMMAND_REGISTER_APIS:
            self._bind_command(cursor, caller)
            return
        # Cvar registration: resolve &cvar arg -> cvar C ident; bind to
        # registrar. Deferred to end_file (ident->name map completes only
        # after the whole file is walked).
        if sp in _CVAR_REGISTER_APIS:
            args = list(cursor.get_arguments())
            if not args:
                return
            cvar_ident = _resolve_var_ref(args[0])
            # Store the C ident AND the registrar captured at the call.
            # We resolve ident -> cvar name in end_file.
            self._pending_cvar_reg.append((cvar_ident, caller or ""))
            return

    def _bind_command(self, cursor, caller: Optional[str]) -> None:
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        name = literal_string(args[0], self.source_bytes)
        if not name:
            # Fallback: an ALL-CAPS identifier is likely a #define'd
            # string macro -- resolve via file_macros (read-only access;
            # the walker populates file_macros, we never write it).
            extent = args[0].extent
            raw = self.source_bytes[
                extent.start.offset:extent.end.offset
            ].decode("utf-8", errors="replace").strip()
            if _MACRO_IDENT_RE.match(raw):
                name = self.file_macros.get(raw)
        if not name:
            return
        # registrar = enclosing function of the registration CALL. For
        # commands this matches what _handler_commands.py already records;
        # we re-derive it here so the passenger owns its own evidence
        # (D6 -- no dependency on the command handler's rows).
        self._reg_cmd.append((name, caller or ""))

    def _record_cvar_decl_ident(self, node) -> None:
        tspell = node.type.spelling
        # scalar `cvar_t` / `const cvar_t`. The cvar NAME is the first
        # field of the struct initializer (the cvar handler's
        # _extract_cvar_decl reads exactly this). We only need
        # ident -> name; reuse the same first-field-literal read.
        if not re.fullmatch(r"(?:const\s+)?cvar_t", tspell):
            return
        ident = node.spelling
        if not ident:
            return
        init_list = None
        for c in node.get_children():
            if c.kind == CursorKind.INIT_LIST_EXPR:
                init_list = c
                break
        if init_list is None:
            return
        fields = list(init_list.get_children())
        if not fields:
            return
        name = literal_string(fields[0], self.source_bytes)
        if name:
            self._cvar_ident_to_name[ident] = name

    # ----- struct-table loop forms (mirror the two handlers) -------------

    def _collect_command_table(self, node) -> None:
        try:
            base = strip_array_and_qualifiers(node.type.spelling)
        except Exception:
            return
        idx_pair = _COMMAND_TABLE_TYPES.get(base)
        if idx_pair is None:
            return
        name_idx, handler_idx = idx_pair
        outer_init = None
        for c in node.get_children():
            if c.kind == CursorKind.INIT_LIST_EXPR:
                outer_init = c
                break
        if outer_init is None:
            return
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
            if len(fields) <= max(name_idx, handler_idx):
                continue
            cmd_name = literal_string(fields[name_idx], self.source_bytes)
            if not cmd_name:
                continue
            # The table's command is registered via a for-loop, NOT inside
            # a normal function body -- the registrar is the function that
            # runs the loop. The loop's Cmd_AddCommand(logs[i].command,
            # logs[i].function) is itself a CALL_EXPR the walk also visits;
            # its enclosing function is captured there as the registrar
            # (caller). Here we only need the NAME->something binding so
            # the entity is bound; bind it to the table-decl's enclosing
            # function if any (file-scope tables -> "" -> resolved
            # conservatively later). Also mark the handler fn address-taken
            # (its address sits in the struct, never directly called).
            self._reg_cmd.append(
                (cmd_name, self._func_stack[-1] if self._func_stack else "")
            )
            handler_fn = resolve_fn_ref(fields[handler_idx])
            if handler_fn:
                self._address_taken.add(handler_fn)

    def _collect_nested_cvar_table(self, node) -> None:
        try:
            base = strip_array_and_qualifiers(node.type.spelling)
        except Exception:
            return
        indices = _NESTED_CVAR_TABLE_TYPES.get(base)
        if indices is None:
            return
        outer_init = None
        for c in node.get_children():
            if c.kind == CursorKind.INIT_LIST_EXPR:
                outer_init = c
                break
        if outer_init is None:
            return
        for outer_elem in outer_init.get_children():
            elem_init = outer_elem
            if outer_elem.kind != CursorKind.INIT_LIST_EXPR:
                for ch in outer_elem.get_children():
                    if ch.kind == CursorKind.INIT_LIST_EXPR:
                        elem_init = ch
                        break
            if elem_init.kind != CursorKind.INIT_LIST_EXPR:
                continue
            elem_fields = list(elem_init.get_children())
            for cvar_idx in indices:
                if cvar_idx >= len(elem_fields):
                    continue
                cvar_init = elem_fields[cvar_idx]
                if cvar_init.kind != CursorKind.INIT_LIST_EXPR:
                    wrapped = None
                    for ch in cvar_init.get_children():
                        if ch.kind == CursorKind.INIT_LIST_EXPR:
                            wrapped = ch
                            break
                    if wrapped is None:
                        continue
                    cvar_init = wrapped
                inner = list(cvar_init.get_children())
                if len(inner) < 2:
                    continue
                cvar_name = literal_string(inner[0], self.source_bytes)
                if not cvar_name:
                    continue
                # Registered via a for-loop Cvar_Register(&table[i].field);
                # the loop's enclosing function is the registrar (captured
                # at that CALL_EXPR as a pending cvar reg by IDENT, but the
                # ident is table[i].field which _resolve_var_ref returns as
                # the array name -- so we also bind by NAME directly here
                # to be safe). Bind to the table-decl enclosing function.
                self._reg_cvar.append(
                    (cvar_name, self._func_stack[-1] if self._func_stack else "")
                )

    # ----- per-file emission ---------------------------------------------

    def end_file(self) -> list[dict]:
        """Return this file's collected facts, tagged with the TRUE
        variant (the seam sets `active_variant`; we store whatever we are
        given -- never hardcode). Returns a single-element list whose lone
        dict is consumed by the post-walk merge. This observer writes NO
        entity JSON (D6); the parent calls feed_file_facts() with these
        rows and then run_postwalk() instead of finalize()."""
        try:
            # Resolve deferred Cvar_Register bindings now that the
            # ident->name map for this file is complete.
            for cvar_ident, registrar in self._pending_cvar_reg:
                if not cvar_ident:
                    continue
                cvar_name = self._cvar_ident_to_name.get(cvar_ident)
                if cvar_name:
                    self._reg_cvar.append((cvar_name, registrar))
                else:
                    # ident did not resolve to a known cvar_t decl in this
                    # file (extern cvar registered here, or array-element
                    # form). Record the IDENT itself as a fallback key --
                    # reachable() also accepts the C-ident form, and an
                    # unresolved binding biases conservative anyway.
                    self._reg_cvar.append((cvar_ident, registrar))

            facts = {
                "variant": self.active_variant,
                "edges": list(self._edges),
                "address_taken": sorted(self._address_taken),
                "reg_cmd": list(self._reg_cmd),
                "reg_cvar": list(self._reg_cvar),
                # The set of function NAMES whose DEFINITION (body) was
                # compiled in this file under this variant. This is the
                # per-variant compiled-TU membership D5 needs to tell
                # not-compiled apart from unreachable.
                "compiled_fns": sorted(self._compiled_fns),
            }
        except Exception:
            # X4: never raise into the walk. An empty per-file fact set
            # only reduces evidence -> conservative direction.
            facts = {
                "variant": self.active_variant,
                "edges": [],
                "address_taken": [],
                "reg_cmd": [],
                "reg_cvar": [],
                "compiled_fns": [],
            }
        # Reset private state for the next file.
        self._edges = []
        self._address_taken = set()
        self._reg_cmd = []
        self._reg_cvar = []
        self._cvar_ident_to_name = {}
        self._pending_cvar_reg = []
        self._func_stack = []
        self._compiled_fns = set()
        self._callee_sites = set()
        return [facts]


def _find_callee_decl_ref(call_cursor):
    """Return the DECL_REF_EXPR that is a CALL_EXPR's callee, or None.

    A CALL_EXPR's callee is its FIRST child. libclang wraps the
    function-to-pointer decay in UNEXPOSED_EXPR (sometimes nested), so
    we descend through the leading-child chain until we hit the
    DECL_REF_EXPR (the function reference) or run out. A call through a
    function pointer (`(*fp)()`) bottoms out at a non-DECL_REF or a
    DECL_REF to a VAR_DECL, not a FUNCTION_DECL -- returning None there
    is correct (it is not a named-function callee to de-dup).
    """
    children = list(call_cursor.get_children())
    if not children:
        return None
    node = children[0]
    # Descend the first-child chain through expression wrappers.
    for _ in range(8):  # bounded -- wrapper nesting is shallow
        if node is None:
            return None
        if node.kind == CursorKind.DECL_REF_EXPR:
            return node
        sub = list(node.get_children())
        if not sub:
            return None
        node = sub[0]
    return None


# ---------------------------------------------------------------------------
# (2) Post-walk reachability engine + module-level result store
# ---------------------------------------------------------------------------

class _ReachabilityResult:
    """Per-variant call graph + BFS reachable set + registrar bindings.

    Built once post-walk from the merged per-file facts. `reachable()`
    queries this. Held in a module-level singleton so the module-level
    `reachable()` contract works (the phase-boundary check needs
    `reachable` to be a module attribute, not only an instance method).
    """

    def __init__(self) -> None:
        # variant -> {caller: set(callee)}
        self._graph: dict[str, dict[str, set]] = {v: {} for v in ALL_VARIANTS}
        # variant -> set(function names compiled in that variant's TUs)
        self._compiled: dict[str, set] = {v: set() for v in ALL_VARIANTS}
        # variant -> set(address-taken function names in that variant)
        self._addr_taken: dict[str, set] = {v: set() for v in ALL_VARIANTS}
        # entity name -> set(registrar function names). Commands and cvars
        # share the namespace here intentionally: reachable() is queried
        # by (name, type) and we keep both maps separate to avoid a
        # command shadowing a same-named cvar.
        self._cmd_registrars: dict[str, set] = {}
        self._cvar_registrars: dict[str, set] = {}
        # variant -> set(reachable function names) -- filled by run_bfs().
        self._reachable: dict[str, set] = {v: set() for v in ALL_VARIANTS}
        self._built = False

    # ----- ingest merged per-file facts ----------------------------------

    def add_file_facts(self, facts: dict) -> None:
        variant = facts.get("variant", _DEFAULT_VARIANT)
        if variant not in self._graph:
            # Unknown variant string: fold into client (safe -- a misset
            # variant must never create a phantom "compiled nowhere"
            # state that looks genuine-dead).
            variant = VARIANT_CLIENT
        g = self._graph[variant]
        for caller, callee in facts.get("edges", []):
            if not caller:
                continue
            g.setdefault(caller, set()).add(callee)
        self._compiled[variant].update(facts.get("compiled_fns", []))
        self._addr_taken[variant].update(facts.get("address_taken", []))
        for cmd_name, registrar in facts.get("reg_cmd", []):
            if not cmd_name:
                continue
            self._cmd_registrars.setdefault(cmd_name, set()).add(registrar or "")
        for cvar_name, registrar in facts.get("reg_cvar", []):
            if not cvar_name:
                continue
            self._cvar_registrars.setdefault(cvar_name, set()).add(registrar or "")

    # ----- per-variant BFS (D3 root set + D4 full-subtree) ---------------

    def run_bfs(self) -> None:
        for variant in ALL_VARIANTS:
            roots: set = set()
            # D3 component 1: program-entry cascade (by name).
            for r in _entry_roots_for(variant):
                roots.add(r)
            # D3 component 2: address-taken closure for THIS variant. Any
            # function whose address is taken anywhere in this variant's
            # compiled set is a root (D4: fully traversed, not a dead-end
            # marker).
            roots |= self._addr_taken[variant]
            self._reachable[variant] = self._bfs(self._graph[variant], roots)
        self._built = True

    @staticmethod
    def _bfs(graph: dict[str, set], roots: set) -> set:
        """Full-subtree BFS: from every root, every transitively reachable
        callee is reachable (D4 -- no shrink/tighten heuristic). Edges are
        name-based; a callee with no out-edges (leaf, or a function whose
        body lives in a not-walked TU) is still marked reachable -- that
        is the conservative over-approximation D4 mandates."""
        seen: set = set()
        q: deque = deque()
        for r in roots:
            if r and r not in seen:
                seen.add(r)
                q.append(r)
        while q:
            fn = q.popleft()
            for callee in graph.get(fn, ()):  # noqa: B007
                if callee and callee not in seen:
                    seen.add(callee)
                    q.append(callee)
        return seen

    # ----- three-valued per-variant state (D5) ---------------------------

    def _registrar_state(self, registrar: str, variant: str) -> str:
        """reachable | unreachable | not-compiled for ONE registrar in
        ONE variant. not-compiled is returned ONLY when the registrar's
        function body is absent from this variant's compiled-TU set
        (physically distinct from unreachable -- D5 load-bearing third
        state). An empty registrar string (registration whose enclosing
        function could not be derived) is treated as reachable -- the
        SAFE direction (X4): an underivable registrar must never look
        genuine-dead."""
        if not registrar:
            return STATE_REACHABLE
        if registrar not in self._compiled[variant]:
            return STATE_NOT_COMPILED
        if registrar in self._reachable[variant]:
            return STATE_REACHABLE
        return STATE_UNREACHABLE

    def _registrars_for(self, name: str, entity_type: str) -> set:
        if entity_type == "command":
            return self._cmd_registrars.get(name, set())
        if entity_type == "cvar":
            return self._cvar_registrars.get(name, set())
        # Unknown/None type: union both maps so we never miss a binding
        # and accidentally report "no registration" (-> the safe-side
        # commented-register / build-excluded fallthrough still applies).
        s: set = set()
        s |= self._cmd_registrars.get(name, set())
        s |= self._cvar_registrars.get(name, set())
        return s

    def verdict(self, name: str, entity_type: str) -> dict:
        """Conservative combination (D3/D5). Returns the callgraph-feeder
        evidence dict (the per-variant breakdown + address-taken-residue
        flag) plus the combined conclusion -- or a sentinel telling the
        caller this entity had NO registration call at all (so the
        commented-register feeder should be consulted).

        The combination rule, reasoned per branch:

          * For each variant, the entity's state is the BEST (most-alive)
            state across all of its registrar functions in that variant:
            reachable > not-compiled > unreachable. (Best, because if the
            cvar is registered from two functions and EITHER is reachable
            in a build, the cvar is reachable in that build -- D4.)
          * reachable in >=1 variant            -> build-excluded (cleared)
          * unreachable in EVERY compiled variant
            AND compiled in >=1 variant         -> genuine-dead
          * everything else (e.g. not-compiled
            everywhere, or any mixed residual)  -> build-excluded (X4
                                                   fail-safe; never accuse)
          * address-taken residue (registrar is itself address-taken =>
            forced reachable by D3.2/D4) lands the entity in
            build-excluded with the residue flag set -- never genuine-dead
            (D3/D4 residue -> human-gated, NOT the autonomous delete list).
        """
        registrars = self._registrars_for(name, entity_type)
        if not registrars:
            # No registration CALL found anywhere (e.g. the only
            # Cvar_Register is commented out -> comment-stripped ->
            # invisible to this feeder). Signal the caller to fall back
            # to feeder (b). NOT genuine-dead here -- this feeder simply
            # has no evidence (X4 safe: absence of evidence is not
            # evidence of death for THIS feeder).
            return {"_no_registration": True}

        per_variant: dict[str, str] = {}
        address_taken_residue = False
        for variant in ALL_VARIANTS:
            best = STATE_UNREACHABLE
            for reg in registrars:
                st = self._registrar_state(reg, variant)
                if st == STATE_REACHABLE:
                    best = STATE_REACHABLE
                    # If a registrar is reachable ONLY because it is
                    # address-taken (D3.2 forced root), flag residue.
                    if (
                        reg in self._addr_taken[variant]
                        and reg not in _bfs_entry_only(
                            self._graph[variant], variant
                        )
                    ):
                        address_taken_residue = True
                    break
                if st == STATE_NOT_COMPILED and best != STATE_REACHABLE:
                    best = STATE_NOT_COMPILED
                # STATE_UNREACHABLE leaves `best` at its prior value
                # (unreachable unless a better one was found).
            per_variant[variant] = best

        compiled_variants = [
            v for v in ALL_VARIANTS if per_variant[v] != STATE_NOT_COMPILED
        ]
        reachable_anywhere = any(
            per_variant[v] == STATE_REACHABLE for v in ALL_VARIANTS
        )

        if reachable_anywhere:
            conclusion = CONCLUSION_BUILD_EXCLUDED
        elif compiled_variants and all(
            per_variant[v] == STATE_UNREACHABLE for v in compiled_variants
        ):
            # Unreachable in EVERY compiled variant AND compiled in >=1.
            # This is the ONLY path to the autonomously-shippable verdict.
            # Address-taken residue is impossible here (residue forces
            # reachable, which the first branch already caught) -- but if
            # the flag is somehow set, fail safe to build-excluded.
            conclusion = (
                CONCLUSION_BUILD_EXCLUDED
                if address_taken_residue
                else CONCLUSION_GENUINE_DEAD
            )
        else:
            # not-compiled everywhere, or any shape we did not positively
            # prove dead -> X4 fail-safe: build-excluded, never accuse.
            conclusion = CONCLUSION_BUILD_EXCLUDED

        return {
            "conclusion": conclusion,
            "feeder": FEEDER_CALLGRAPH,
            "evidence": {
                VARIANT_CLIENT: per_variant[VARIANT_CLIENT],
                VARIANT_SERVER: per_variant[VARIANT_SERVER],
                VARIANT_WIN: per_variant[VARIANT_WIN],
                VARIANT_APPLE: per_variant[VARIANT_APPLE],
                "address_taken_residue": address_taken_residue,
            },
        }


# Cache of entry-only reachable sets (program-entry cascade WITHOUT the
# address-taken closure), used purely to decide the residue flag: a
# registrar reachable in the full BFS but NOT in the entry-only BFS is
# reachable solely via an address-taken root (D3/D4 residue).
_ENTRY_ONLY_CACHE: dict[str, set] = {}


def _bfs_entry_only(graph: dict[str, set], variant: str) -> set:
    cached = _ENTRY_ONLY_CACHE.get(variant)
    if cached is not None:
        return cached
    roots = set(_entry_roots_for(variant))
    result = _ReachabilityResult._bfs(graph, roots)
    _ENTRY_ONLY_CACHE[variant] = result
    return result


# Module-level singleton. The seam (Task 2) calls the helpers below after
# the existing rows_by_handler merge; reachable() then answers queries.
_RESULT: Optional[_ReachabilityResult] = None


def reset_result() -> None:
    """Discard any prior post-walk result and the entry-only cache. The
    seam calls this before feeding a fresh run's facts (keeps re-runs
    idempotent -- a stale graph from a prior extractor invocation must
    never leak into a new one)."""
    global _RESULT
    _RESULT = _ReachabilityResult()
    _ENTRY_ONLY_CACHE.clear()


def feed_file_facts(rows: list[dict]) -> None:
    """Feed one file's end_file() output (the single-element list whose
    dict carries this file's edges/address-taken/registrar facts tagged
    with the TRUE variant) into the post-walk store. The seam calls this
    for every file's merged rows. No-op-safe on a malformed/empty row
    (X4 -- absence of facts only reduces evidence)."""
    global _RESULT
    if _RESULT is None:
        _RESULT = _ReachabilityResult()
    for row in rows or ():
        if isinstance(row, dict):
            try:
                _RESULT.add_file_facts(row)
            except Exception:
                # X4: a single bad file's facts must not poison the run.
                continue


def run_postwalk() -> None:
    """Build the per-variant BFS reachable sets. The seam calls this once,
    after every file's facts have been fed (parent side, after the
    existing rows_by_handler merge). After this, reachable() answers."""
    global _RESULT
    if _RESULT is None:
        _RESULT = _ReachabilityResult()
    _ENTRY_ONLY_CACHE.clear()
    try:
        _RESULT.run_bfs()
    except Exception:
        # X4: if the BFS itself fails, leave _RESULT with empty reachable
        # sets. reachable() then degrades to build-excluded/reachable for
        # everything (the safe direction) -- see reachable()'s no-result
        # branch.
        pass


# ---------------------------------------------------------------------------
# (3) feeder (b): standalone commented-register textual scanner
#
# D1 / D7.1 NO-BLEND: this function shares NO AST, NO edges, NO BFS, NO
# Visitor state with feeder (a). It takes raw source TEXT and a file name
# and returns textual cites. It is module-level (NOT a method of
# CallGraphObserver) by construction. libclang strips comments, so a
# `// Cvar_Register(&gl_outline_scale_world);` is invisible to the
# call-graph feeder -- this regex is the only mechanism that can see it.
# ---------------------------------------------------------------------------

# Anchored at line start (after optional leading whitespace) so only a
# WHOLLY commented-out registration matches -- not a live call with a
# trailing `// note`. Captures the API name and the registered symbol.
# `&?` allows the `&cvar` form (Cvar_Register(&X)) and the bare-name form
# (Cmd_AddCommand("x", ...) -- though commands pass a string first; the
# `\w+` then captures the macro/ident form a commented Cmd_AddCommand uses
# when the name is a #define, which is the only commented-command shape
# that yields a usable symbol). \s* between tokens tolerates spacing.
_COMMENTED_REG_RE = re.compile(
    r"^\s*//\s*"
    r"(Cvar_Register|Cvar_RegisterVariable|Cmd_AddCommand)"
    r"\s*\(\s*&?\s*(\w+)"
)


def scan_commented_registrations(
    source_text: str, file_name: str
) -> list[tuple[str, str]]:
    """Regex-scan RAW source text for commented-out registrations.

    Returns a list of (symbol, "file:line") -- symbol is the C identifier
    that WOULD have been registered (a cvar C ident for Cvar_Register, a
    macro/ident for a commented Cmd_AddCommand). "file:line" is the cite.

    Pure text. No AST. No edges. No BFS. No shared state with feeder (a)
    (D1/D7.1 -- the structural separation is the whole point of having
    two feeders). Defensive: empty input or a non-str yields []."""
    if not source_text or not isinstance(source_text, str):
        return []
    out: list[tuple[str, str]] = []
    base = Path(file_name).name if file_name else ""
    for lineno, line in enumerate(source_text.split("\n"), start=1):
        m = _COMMENTED_REG_RE.match(line)
        if m is None:
            continue
        symbol = m.group(2)
        if not symbol:
            continue
        out.append((symbol, f"{base}:{lineno}"))
    return out


# Optional convenience store for feeder (b) so reachable() can consult it
# by symbol. The seam MAY populate this by scanning each source file;
# reachable() falls back to it for an entity the call-graph feeder found
# had NO registration call at all. Kept structurally separate from
# _RESULT (D1: feeder (b) shares no state with feeder (a)).
_COMMENTED_REG_INDEX: dict[str, str] = {}


def reset_commented_index() -> None:
    """Clear the commented-register index (idempotent re-runs)."""
    _COMMENTED_REG_INDEX.clear()


def feed_commented_registrations(source_text: str, file_name: str) -> None:
    """Scan one file and fold its commented-out registrations into the
    feeder-(b) index keyed by symbol. The seam MAY call this per file.
    Still pure-text -- it only calls scan_commented_registrations and
    stores the cite; no AST/edge/BFS contact (D1)."""
    for symbol, cite in scan_commented_registrations(source_text, file_name):
        # First cite wins -- a symbol's first commented registration is
        # the canonical disabled site (matches the artifact's shape).
        if symbol not in _COMMENTED_REG_INDEX:
            _COMMENTED_REG_INDEX[symbol] = cite


# ---------------------------------------------------------------------------
# The module-level downstream contract
# ---------------------------------------------------------------------------

def reachable(
    entity, entity_type: Optional[str] = None
) -> dict:
    """Conservative 3-valued reachability verdict for ONE registered
    entity. THE downstream contract (D15 feeder-tagged evidence shape at
    the mechanism layer; L1 representation is Phase 3, NOT here).

    Args:
      entity: the entity NAME (str), or a dict carrying at least
        {"name": ..., "type": "cvar"|"command"}. Accepting both keeps
        the seam/probe call sites simple (grug: put the API on the
        thing; do not make the caller marshal).
      entity_type: "cvar" | "command" -- optional if `entity` is a dict
        with a "type". Defaults to None (treated as unknown -> both
        registrar maps consulted).

    Returns a dict:
      {
        "conclusion": "genuine-dead" | "build-excluded",
        "feeder":     "callgraph" | "commented-register",
        "evidence":   <feeder-tagged>,
      }
    where:
      - callgraph feeder evidence = {client, server, win, apple: state}
        plus "address_taken_residue": bool
      - commented-register feeder evidence = {"commented_register":
        "file:line"} -- the textual disabled-registration cite.

    Fail-safe (X4 / D3): ANY failure to resolve -- no post-walk result,
    an exception, an unknown shape -- yields build-excluded / reachable.
    NEVER genuine-dead from a failure path. A wrong genuine-dead ships a
    wrong upstream delete PR; a wrong build-excluded merely keeps an
    entity one cycle in the human-gated pool.
    """
    # Normalize the (name, type) pair.
    name: Optional[str] = None
    etype: Optional[str] = entity_type
    if isinstance(entity, str):
        name = entity
    elif isinstance(entity, dict):
        name = entity.get("name")
        if etype is None:
            etype = entity.get("type")
    if etype is not None:
        etype = str(etype).lower()
        # Normalize the common synonyms so callers can pass either.
        if etype in ("cvars", "variable", "variables"):
            etype = "cvar"
        elif etype in ("commands", "cmd", "command"):
            etype = "command"

    if not name or not isinstance(name, str):
        return _safe_build_excluded()

    # No post-walk result yet (passenger off, post-walk failed, or
    # reachable() called before run_postwalk): the SAFE answer is
    # build-excluded/reachable for everything (X4 -- the passenger can
    # only ever bias toward reachable).
    if _RESULT is None or not _RESULT._built:
        return _safe_build_excluded()

    try:
        v = _RESULT.verdict(name, etype or "")
    except Exception:
        return _safe_build_excluded()

    if "_no_registration" in v:
        # Feeder (a) found NO registration call for this entity. This is
        # exactly the gl_outline_scale_world shape: the only Cvar_Register
        # is commented out and comment-stripped. Consult feeder (b).
        cite = _lookup_commented_register(name, etype)
        if cite is not None:
            return {
                "conclusion": CONCLUSION_GENUINE_DEAD,
                "feeder": FEEDER_COMMENTED_REGISTER,
                "evidence": {"commented_register": cite},
            }
        # No registration call AND no commented registration found: this
        # feeder has no evidence either way. SAFE direction -- do NOT
        # accuse (X4). build-excluded with an empty callgraph breakdown.
        return _safe_build_excluded()

    return v


def _lookup_commented_register(
    name: str, etype: Optional[str]
) -> Optional[str]:
    """Resolve an entity name to a commented-register cite via feeder
    (b)'s index. The index is keyed by the C SYMBOL the regex captured:
      - cvars: the cvar's C identifier (e.g. gl_outline_scale_world --
        which for the vast majority of ezQuake cvars IS the cvar name).
      - commands: the macro/ident in a commented Cmd_AddCommand.
    We try the entity name directly (the common case -- ezQuake cvar C
    idents match their names) and return the cite if present. Pure index
    lookup -- still no AST/edge/BFS contact (D1)."""
    if not _COMMENTED_REG_INDEX:
        return None
    cite = _COMMENTED_REG_INDEX.get(name)
    if cite is not None:
        return cite
    return None


def _safe_build_excluded() -> dict:
    """The fail-safe verdict (X4 / D3 safe direction). Used for every
    unresolved/failure path: an entity we could not positively prove dead
    is build-excluded/reachable, NEVER genuine-dead. The callgraph
    breakdown is all-reachable so the evidence is internally consistent
    with the conclusion."""
    return {
        "conclusion": CONCLUSION_BUILD_EXCLUDED,
        "feeder": FEEDER_CALLGRAPH,
        "evidence": {
            VARIANT_CLIENT: STATE_REACHABLE,
            VARIANT_SERVER: STATE_REACHABLE,
            VARIANT_WIN: STATE_REACHABLE,
            VARIANT_APPLE: STATE_REACHABLE,
            "address_taken_residue": False,
        },
    }
