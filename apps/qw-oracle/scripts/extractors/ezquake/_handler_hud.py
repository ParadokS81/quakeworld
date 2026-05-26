"""ezQuake HUD_Register COMMAND handler (Visitor protocol).

Sibling of _handler_commands.py; mirrors its Visitor/finalize idiom. NOT a
subclass and NOT _handler_hud_elements.py (that file owns the element
aggregate + owned_cvars metadata, a different contract).

This handler models the HUD_Register COMMAND contract end to end by
literal/constant AST reading only -- zero call-graph, zero dataflow, zero
constant-propagation, zero comment-scanning (decisions D1/D8). For every
HUD_Register CALL_EXPR it emits:

  - the bare <name> command UNCONDITIONALLY -- models the live
    `Cmd_AddCommand(name, HUD_Func_f);` at hud.c:1232 (no if-guard; runs for
    every HUD_Register call).
  - `+hud_<name>` AND `-hud_<name>` ONLY under a double gate -- models the
    live `if (show)` (hud.c:1265) wrapping `if (flags & HUD_PLUSMINUS)`
    (hud.c:1269) wrapping the `Cmd_AddRemCommand` pair (hud.c:1275/1278).
    Gate1: arg3 (`flags`) raw extent text contains the whole-identifier
    token `HUD_PLUSMINUS` (a compile-time constant expr -- pure token test,
    no macro expansion). Gate2: arg7 (`show`) is a non-NULL string literal
    (`literal_string` returns a value -- `NULL`/non-literal => gate fails).

Each emitted row carries hud_element = the literal HUD_Register arg0, so
`radar` / `+hud_radar` / `-hud_radar` all group to element "radar" (D16).

R1: every HUD_Register site whose arg0 does NOT resolve to a literal via the
libclang AST (after the macro fallback) is RECORDED (never guessed, never
constant-propagated -- that would blend toward Track A, violating D1) so a
downstream probe can STOP the phase if the literal-only premise is refuted.

R7: this handler has NO cvar code path at all. It never builds a
`hud_<name>_<subvar>` string, never imports _handler_cvars, never calls any
mk()-shaped builder. Every emitted row is a COMMAND. A duplicate cvar
emitter would collide with _handler_cvars.py on
`entities UNIQUE(project, type, name)`.

The commented-out duplicate at hud.c:1281-1282 is structurally invisible:
libclang strips comments so the AST never sees those CALL_EXPRs. No textual
pass is added to read them (that would be a Track-A-shaped blend, D1).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import literal_string, read_extent  # noqa: E402


_MACRO_IDENT_RE = re.compile(r'^[A-Z_][A-Z0-9_]+$')

# Whole-identifier token split: a substring test like
# `"HUD_PLUSMINUS" in raw` would false-match a hypothetical
# `HUD_PLUSMINUS_FOO`; splitting the raw flags expression on non-word
# characters and testing for an exact element is the precise gate (D8).
_WORD_SPLIT_RE = re.compile(r'\W+')


# ----- Handler --------------------------------------------------------------

class HudCommandsEzquakeHandler(Visitor):
    """ezQuake HUD_Register COMMAND handler.

    Tier-3 ezQuake-private handler (underscore-prefix file = internal, per
    extractor_lib convention). Sibling of _handler_commands.py (mirrors its
    Visitor/finalize idiom); NOT a subclass (different contract) and NOT
    _handler_hud_elements.py.

    Models the HUD_Register COMMAND contract only:
      - bare <name> (unconditional; hud.c:1232)
      - +hud_<name> / -hud_<name> (double-gated: flags has HUD_PLUSMINUS AND
        show is a non-NULL literal; hud.c:1265/1269/1275/1278)
      - each row carries hud_element = literal HUD_Register arg0 (D16)
      - R1: records every site whose arg0 does NOT resolve via the libclang
        AST (literal_string + macro fallback) for the R1 probe
      - R7: emits ZERO cvar-shaped rows (commands only)
    """
    name = "hud-commands"
    output_filename = "ezquake-hud-commands-ast.json"

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._func_stack: list[str] = []
        # Per-file seen names -- first-wins within one file (client walk then
        # server walk), mirroring _handler_commands.py. The +/- rows dedup
        # by their full `+hud_<name>`/`-hud_<name>` key too.
        self._seen_in_file: set[str] = set()
        self._rows: list[dict] = []
        # R1 evidence: HUD_Register sites whose arg0 did not resolve to a
        # literal via the AST (after the macro fallback), plus shape
        # anomalies (a malformed HUD_Register is itself a literal-model
        # violation -- recorded, never silently skipped).
        self._nonliteral_sites: list[dict] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        # Visit ONLY HUD_Register CALL_EXPRs. `togglehud` is a plain
        # `Cmd_AddCommand` (hud.c:819) -- structurally unreachable here, so
        # this handler cannot over-reach into literal commands
        # _handler_commands.py owns.
        if cursor.kind != CursorKind.CALL_EXPR or cursor.spelling != "HUD_Register":
            return

        args = list(cursor.get_arguments())
        loc = cursor.location
        site = f"{Path(loc.file.name).name}:{loc.line}" if loc.file else "?"

        # arg7 (`show`) is the highest index this handler reads. A
        # HUD_Register with fewer than 8 args is malformed -- record the
        # shape anomaly (R1) and emit nothing for it.
        if len(args) < 8:
            self._nonliteral_sites.append(
                {"site": site, "raw": read_extent(self.source_bytes, cursor.extent),
                 "reason": f"arg_count={len(args)} (<8)"}
            )
            return

        # ----- Resolve arg0 `name` via the libclang AST (the R1 instrument).
        name = literal_string(args[0], self.source_bytes)
        if not name:
            # Fallback: an all-caps identifier is likely a #define'd string
            # macro -- resolve it via the transitive macro table (mirrors
            # _handler_commands.py:223-229 exactly).
            raw = read_extent(self.source_bytes, args[0].extent).strip()
            if _MACRO_IDENT_RE.match(raw):
                name = self.file_macros.get(raw)
        if not name:
            # Non-literal first arg. RECORD it; emit NOTHING. Never guess,
            # never constant-propagate (R1/D1 -- that blends toward Track A).
            raw = read_extent(self.source_bytes, args[0].extent).strip()
            self._nonliteral_sites.append({"site": site, "raw": raw})
            return

        loc_file = Path(loc.file.name).name
        enclosing = self._func_stack[-1] if self._func_stack else None
        build_variant = "client" if variant == "client" else "server-build"

        # ----- Bare command (unconditional -- hud.c:1232).
        self._append_row(
            name=name,
            family="bare",
            element=name,
            handler_fn="HUD_Func_f",
            registration_api="Cmd_AddCommand",
            source_file=loc_file,
            source_line=loc.line,
            source_column=loc.column,
            enclosing=enclosing,
            build_variant=build_variant,
        )

        # ----- +/- pair (double-gated -- hud.c:1265/1269/1275/1278).
        flags_raw = read_extent(self.source_bytes, args[3].extent)
        flag_tokens = set(_WORD_SPLIT_RE.split(flags_raw))
        gate_plusminus = "HUD_PLUSMINUS" in flag_tokens
        show_lit = literal_string(args[7], self.source_bytes)
        gate_show = show_lit is not None
        if gate_plusminus and gate_show:
            self._append_row(
                name=f"+hud_{name}",
                family="plus",
                element=name,
                handler_fn="HUD_Plus_f",
                registration_api="Cmd_AddRemCommand",
                source_file=loc_file,
                source_line=loc.line,
                source_column=loc.column,
                enclosing=enclosing,
                build_variant=build_variant,
            )
            self._append_row(
                name=f"-hud_{name}",
                family="minus",
                element=name,
                handler_fn="HUD_Minus_f",
                registration_api="Cmd_AddRemCommand",
                source_file=loc_file,
                source_line=loc.line,
                source_column=loc.column,
                enclosing=enclosing,
                build_variant=build_variant,
            )

    def _append_row(self, *, name: str, family: str, element: str,
                    handler_fn: str, registration_api: str, source_file: str,
                    source_line: int, source_column: int,
                    enclosing: str | None, build_variant: str) -> None:
        # Per-file first-wins dedup by full command name (mirrors
        # _handler_commands.py).
        if name in self._seen_in_file:
            return
        self._rows.append({
            "name": name,
            "hud_family": family,
            "hud_element": element,
            "handler_fn": handler_fn,
            "registration_api": registration_api,
            "source_file": source_file,
            "source_line": source_line,
            "source_column": source_column,
            "enclosing_function": enclosing,
            "build_variant": build_variant,
        })
        self._seen_in_file.add(name)

    def end_file(self) -> list[dict]:
        # The Visitor contract requires end_file return a FLAT list of dicts.
        # R1 evidence is not a command row, so it is carried as a sentinel
        # dict appended to the returned list (split out in finalize) -- this
        # avoids adding a new protocol hook.
        rows: list[dict] = list(self._rows)
        for ns in self._nonliteral_sites:
            rows.append({"_nonliteral_site": ns})
        self._rows = []
        self._func_stack = []
        self._seen_in_file = set()
        self._nonliteral_sites = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Split sentinel R1 rows from real command rows.
        nonliteral_sites: list[dict] = []
        command_rows: list[dict] = []
        for row in all_rows:
            if "_nonliteral_site" in row:
                nonliteral_sites.append(row["_nonliteral_site"])
            else:
                command_rows.append(row)

        # First-wins cross-file dedup by command name (mirrors
        # _handler_commands.py:268-272).
        deduped: dict[str, dict] = {}
        for row in command_rows:
            if row["name"] not in deduped:
                deduped[row["name"]] = row
        unique_cmds = list(deduped.values())

        commands_out: dict[str, dict] = {}
        elements: set[str] = set()
        family_counts = {"bare": 0, "plus": 0, "minus": 0}
        for cmd in unique_cmds:
            elements.add(cmd["hud_element"])
            family_counts[cmd["hud_family"]] = (
                family_counts.get(cmd["hud_family"], 0) + 1
            )
            commands_out[cmd["name"]] = {
                "hud_family": cmd["hud_family"],
                "hud_element": cmd["hud_element"],
                "ast": {
                    "handler_fn": cmd["handler_fn"],
                    "source_file": cmd["source_file"],
                    "source_line": cmd["source_line"],
                    "source_column": cmd["source_column"],
                    "enclosing_function": cmd["enclosing_function"],
                    "build_variant": cmd["build_variant"],
                    "registration_api": cmd["registration_api"],
                },
            }

        sorted_commands = {k: commands_out[k] for k in sorted(commands_out)}
        return {
            "hud_commands": sorted_commands,
            "r1": {
                "nonliteral_first_arg_sites": nonliteral_sites,
                "nonliteral_count": len(nonliteral_sites),
            },
            "_stats": {
                "source_total": len(command_rows),
                "bare": family_counts["bare"],
                "plus": family_counts["plus"],
                "minus": family_counts["minus"],
                "elements": len(elements),
            },
        }
