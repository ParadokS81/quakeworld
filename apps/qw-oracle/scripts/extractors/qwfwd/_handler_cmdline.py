"""Cmdline params handler for the QWFWD AST extractor.

QWFWD does NOT use COM_CheckParm. It reads positional arguments directly
via argv[1] and argv[2] in main() (src/main.c:228-229). Array-subscript
expressions produce no CALL_EXPR cursor with a literal name, so libclang
detection would require complex data-flow analysis over the control flow.

Static specification is appropriate here for three reasons:
1. The positional-arg interface is fully documented by the usage string at
   main.c:223 ("Usage: %s [port [ip]]\n") -- the surface is closed and known.
2. The vendored snapshot is frozen; no runtime drift is possible.
3. The two args are the entire cmdline surface; there is nothing to miss.

All lifecycle methods are no-op stubs (required by walk_tu_dispatch). The
real work happens in finalize(), which emits the two hardcoded entries
directly from pre-verified source knowledge.

Name convention: plain "port" and "ip" -- NOT bracketed, NOT prefixed with
"-". QWFWD accepts positional args ("qwfwd 27500 1.2.3.4"), not flag-style
switches. Brackets would break name_fold substring lookup; the "-" prefix
would be a source-truth violation (QWFWD has no such flag token). See
decisions Q-CMDLINE-NAMES (resolved 2026-06-05: plain labels).
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


class CmdlineQwfwdHandler(Visitor):
    """QWFWD cmdline-params handler (static specification).

    Emits exactly two entries: "ip" (argv[2]) and "port" (argv[1]).
    Sorted alphabetically by name so finalize() output is deterministic
    and re-extract diffs are empty (V8 reproducibility probe).

    All lifecycle methods are no-ops -- walk_tu_dispatch calls all 7
    and would crash if any were absent (per EXTRACTOR-PLAYBOOK.md,
    non-Visitor-detection handler requirement: full 7-method duck type).
    """

    name = "cmdline"
    output_filename = "qwfwd-cmdline-params-ast.json"
    payload_field = "params"

    def setup(self, *, qwfwd_repo: Path, qwfwd_src: Path) -> None:
        self._repo_root = qwfwd_repo
        self._src_root = qwfwd_src

    # --- Visitor lifecycle stubs (required by walk_tu_dispatch) ---

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        # No per-file state needed; call super to cache path/bytes on self
        # in case any downstream infrastructure reads them.
        super().start_file(source_path=source_path, source_bytes=source_bytes)

    def visit_cursor(self, cursor, variant: str) -> None:
        pass

    def end_file(self) -> list[dict]:
        return []

    def enter_function(self, cursor, variant: str) -> None:
        pass

    def exit_function(self, cursor, variant: str) -> None:
        pass

    def enter_compound(self, cursor, variant: str) -> None:
        pass

    def exit_compound(self, cursor, variant: str) -> None:
        pass

    # --- Static-spec emission ---

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative; fall back to absolute if outside."""
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # source_file is relative to the repo root via the standard pattern.
        # The absolute path is assembled from the stored src root so
        # _relative_source() can strip the repo prefix correctly.
        src_main = str(self._src_root / "main.c")
        rel_main = self._relative_source(src_main)

        # Entries sorted alphabetically by name for deterministic output.
        # "ip" < "port" lexicographically, so ip comes first.
        #
        # enclosing_function and description are emitted as provenance that
        # folds into raw_ast_hash. The adapter (load-cmdline-params.ts) does
        # NOT read these as queryable columns -- it reads only source_file,
        # source_line, and source_column. Emitting them is harmless and aids
        # future debugging / describe-pass context.
        params = [
            {
                "name": "ip",
                "ast": {
                    "source_file": rel_main,
                    "source_line": 229,
                    "source_column": None,
                    "enclosing_function": "main",
                    "description": (
                        "Local IP address on which QWFWD will listen. Optional; "
                        "defaults to all interfaces (0.0.0.0). Takes the second "
                        "positional argument when present and when it does not "
                        "start with - or +."
                    ),
                },
            },
            {
                "name": "port",
                "ast": {
                    "source_file": rel_main,
                    "source_line": 228,
                    "source_column": None,
                    "enclosing_function": "main",
                    "description": (
                        "UDP port on which QWFWD will listen. Optional; defaults "
                        "to QWFWD_DEFAULT_PORT (30000). Takes the first positional "
                        "argument when present."
                    ),
                },
            },
        ]

        return {
            "params": params,
            "_stats": {
                "source_total": 2,
                "count": 2,
            },
        }
