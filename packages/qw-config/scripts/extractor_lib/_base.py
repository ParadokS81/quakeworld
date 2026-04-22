"""Handler protocol for the unified ezQuake extraction driver.

Each entity type (commands, cvars, macros, ...) is implemented as a Handler
that receives pre-parsed client + server translation units and returns plain
row dicts. The driver merges per-file results across all files and then calls
finalize() to produce the final output dict written to JSON.

Rows must be plain dicts so they cross multiprocessing worker boundaries
safely. Do not return dataclasses, cursors, or any libclang object.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class Handler(Protocol):
    """A per-entity extractor.

    Implementations must be stateless between files -- all per-file state is
    passed in, and rows returned are plain dicts.

    OPTIONAL method (checked via hasattr, not part of the Protocol):
        setup(*, ezq_repo: Path, ezq_src: Path) -> None
            One-time init (e.g. parse cvar_groups.h). Driver calls it once
            before the file loop if defined. Under Step 2 parallelism, setup
            runs in the parent process so state is inherited via fork.
    """

    name: str
    """Short identifier, e.g. "commands". Used for the --handlers CLI flag
    and the default output filename."""

    output_filename: str
    """Filename (not path) of the JSON output, e.g.
    "ezquake-commands-ast.json". The driver writes to
    <output_dir>/<output_filename>.unified during validation."""

    def process_file(
        self,
        *,
        tu_client: Any,
        tu_server: Any,
        source_bytes: bytes,
        source_path: Path,
    ) -> list[dict]:
        """Visit both TUs and return plain-dict rows for this file.

        Called once per file (in a worker process under multiprocessing).
        Must not retain references to cursors or TUs -- those are torn down
        after this call returns.

        In-file dedup (e.g. "if client saw this, skip server copy") lives
        here, since it depends on per-file cursor identity.
        """
        ...

    def finalize(
        self,
        *,
        all_rows: list[dict],
        repo_root: Path,
    ) -> dict:
        """Build the final JSON output dict from the merged per-file rows.

        Called once after all files are processed. Handles cross-file
        dedup, help.json enrichment, group assignment, help-only synthesis,
        stats, and whatever other shaping the legacy extractor did.

        Return value is written verbatim to <output_dir>/<output_filename>.
        """
        ...
