"""Pure render helper for the runtime-dead-entities upstream PR digest.

This module is the I/O-free, DB-free, route-logic-free render core.
The generator (build-runtime-dead-entities.py) does the DB read, the
route_by_level filtering, the feeder-partition, and the out_path write.
This module only formats markdown from pre-partitioned row lists.

ASCII only (X10): use '--' for dashes, no em/en-dash, no emoji.
"""
from __future__ import annotations

from typing import Any


# ---------------------------------------------------------------------------
# Fixed editorial template constants -- carried verbatim from the verified
# artifact. Never hand-edit the output MD; regenerate via the generator.
# ---------------------------------------------------------------------------

_CHANNEL = (
    "upstream code-bug. NOT a help-JSON doc deliverable, NOT a"
    " `help_json_classifications.yaml` entry. These entities are"
    " documented/declared but do nothing at runtime; the fix is code-side"
    " (re-wire or delete), a maintainer call per item."
)

_ROUTING = (
    "ezQuake-native -> nano (head dev) / slime. All entities below live in"
    " the ezQuake tree (cvars in `EX_browser_qtvlist.c` / `r_rmain.c`;"
    " client_* cmdline params in `src/cmdline_params_ids.h`); not"
    " MVDSV-provenance."
)

# Class 3 full block: the 4-row table + lead-in + disposition. Carried
# from the prior verified artifact (cmdline-liveness feeder; NOT
# call-graph-derived; separate concern), CORRECTED 2026-05-20 per
# review-findings F20 -- the prior hand-authored feeder was .c-only-scoped
# and mis-flagged 5 entries (4 cmdline_params + 1 enum constant) that are
# in fact LIVE via .h macro wrappers fanning into .c call sites. The 4
# entries below have been re-verified zero-consumer across both .c and .h.
# The one-line provenance note is appended by render_dead_entities rather
# than embedded here, so the constant stays pure editorial text and the
# note stays a single authoritative append.
_CLASS3_BLOCK = """\
## Class 3 -- orphaned cmdline params (declared in the X-macro table, never consumed)

ezQuake's modern cmdline system: `src/cmdline_params_ids.h` lists `CMDLINE_DEF(<sym>, "<-flag>")`, generating an enum consumed via `COM_CheckParm(cmdline_param_<sym>)`. A small legacy path uses literal `COM_CheckParm("-flag")`. Each param below has **zero enum-consumers AND zero legacy-literal consumers** across both `.c` and `.h` files (including `.h` macro wrappers that fan out into `.c` call sites) -- declared and documented, but reading nothing.

| flag | enum symbol | `cmdline_params_ids.h` | note |
|---|---|---|---|
| `-noinvlmaps` | `client_noinverselightmaps` | L10 | |
| `-nolibjpeg` | `client_nolibjpeg` | L42 | likely orphaned when JPEG handling changed |
| `-nolibpng` | `client_nolibpng` | L41 | sibling of `-nolibjpeg` |
| `-showliberrors` | `client_showlibraryerrors` | L16 | |

- Disposition: delete the dead `CMDLINE_DEF` lines, or wire a `COM_CheckParm(cmdline_param_<sym>)` consumer if the flag was meant to do something."""

# One-line OQ-1 provenance note appended after Class 3 (not embedded in the
# constant -- keeps the constant verbatim editorial and the note one place).
_CLASS3_PROVENANCE_NOTE = (
    "Class 3 is the cmdline-consumer-presence feeder (cmdline-liveness),"
    " a SEPARATE concern from the call-graph mechanism -- carried from the"
    " prior verified artifact, not call-graph-derived; see decisions.md"
    " non-goals / the cmdline-liveness parked sibling."
)

_ATTRIBUTION = """\
## Attribution

Per ezQuake (upstream) convention: any PR/commit raised from this uses `Assisted-by: Claude:<model-id>`; the operator signs and certifies the DCO. Issues may use an informal "Co-authored with Claude Code" footer."""

# Templated per-feeder disposition lines (keyed on feeder string, not on
# entity type -- D7.1: Class membership is feeder-keyed; a genuine-dead
# command with callgraph feeder would land in Class 1).
_DISPOSITION_CALLGRAPH = (
    "Disposition (maintainer call): the enclosing init function is"
    " unreachable -- either wire a call into the appropriate init chain"
    " to revive this cvar, or delete the declaration and the dead init"
    " function body."
)

_DISPOSITION_COMMENTED_REGISTER = (
    "Disposition (maintainer call): re-enable the commented-out"
    " `Cvar_Register` call if this cvar is intended to be user-tunable,"
    " or delete the dead declaration entirely."
)


def render_dead_entities(
    level3_callgraph_rows: list[dict[str, Any]],
    level3_commented_rows: list[dict[str, Any]],
    pool_figure: str,
    regen_date: str,
) -> str:
    """Render the runtime-dead-entities markdown from pre-partitioned rows.

    Pure: no I/O, no DB access, no route_by_level logic. The generator
    (build-runtime-dead-entities.py) supplies the already-filtered,
    already-partitioned rows plus the canonical pool_figure string and the
    regen_date string (YYYY-MM-DD).

    Row shape expected (both lists):
      {
        "name": str,
        "source_file": str,     -- from the *_versions declaration cite
        "source_line": int,
        "ta": dict,             -- the full track_a_reachability JSONB dict
      }

    Section order (11 sections, locked):
      1.  H1
      2.  Status line
      3.  Channel
      4.  Routing
      5.  How these were found (prose, pool_figure substituted)
      6.  Class 1 heading
      7.  Class 1 per-row entries (by name, already sorted by caller)
      8.  Class 2 heading
      9.  Class 2 per-row entries (by name, already sorted by caller)
      10. Class 3 (verbatim block + provenance note)
      11. Attribution (verbatim constant)

    ASCII only (X10).
    """
    lines: list[str] = []

    # Section 1 -- H1
    lines.append(
        "# ezQuake runtime-dead entities (code-bug report -> nano/slime)"
    )
    lines.append("")

    # Section 2 -- Status
    lines.append(
        f"**Status:** Verified, ready to route upstream. {regen_date}."
    )

    # Section 3 -- Channel
    lines.append(f"**Channel:** {_CHANNEL}")

    # Section 4 -- Routing
    lines.append(f"**Routing:** {_ROUTING}")
    lines.append("")

    # Section 5 -- How these were found
    lines.append(
        "## How these were found (so the evidence is trustable)"
    )
    lines.append("")
    lines.append(
        "Source HEAD `3f9e724f` (#1120 merge). Operator ran a build compiled"
        " from that exact commit: `ezQuake 3.7.0-dev 8084~3f9e724fa`"
        " (commit verified == source HEAD, zero version skew). Runtime"
        " `cvarlist`/`cmdlist`/`macrolist` were diffed against the L1"
        " source-extracted set at the same commit. Every entity below was"
        " then re-verified by direct source grep. This report contains ONLY"
        " the subset proved dead by a *reliable* mechanism -- the level-3"
        " dump-confirmed genuine-dead subset, mechanism-generated from the"
        f" L1 Track-A signal at this pin; the broader candidate pool"
        f" ({pool_figure} absent from this build's runtime) is NOT included"
        " here because separating genuine-dead from platform/`#ifdef`"
        " build-exclusion requires call-graph reachability (tracked as a"
        " separate arc) -- a grep cannot distinguish a call `Foo();` from a"
        " prototype `void Foo(void);`."
    )
    lines.append("")

    # Section 6 -- Class 1 heading
    lines.append(
        "## Class 1 -- orphaned-init cvar (registered in a function nothing calls)"
    )
    lines.append("")

    # Section 7 -- Class 1 per-row entries
    for row in level3_callgraph_rows:
        name = row["name"]
        src_file = row["source_file"]
        src_line = row["source_line"]
        ta = row["ta"]
        evidence = ta.get("evidence", {})
        pv = evidence.get("per_variant", {})
        atr = evidence.get("address_taken_residue", False)

        lines.append(f"### `{name}`")
        lines.append(f"- Declared: `{src_file}:{src_line}`")
        # per_variant breakdown -- verbatim from evidence.per_variant
        pv_parts = [
            f"client={pv.get('client', 'unknown')}",
            f"server={pv.get('server', 'unknown')}",
            f"win={pv.get('win', 'unknown')}",
            f"apple={pv.get('apple', 'unknown')}",
        ]
        lines.append(
            "- Reachability: "
            + " ".join(pv_parts)
            + f"; address-taken residue={atr}"
        )
        lines.append(f"- {_DISPOSITION_CALLGRAPH}")
        lines.append("")

    # Section 8 -- Class 2 heading
    lines.append(
        "## Class 2 -- commented-out registration (cvar declared, register line disabled)"
    )
    lines.append("")

    # Section 9 -- Class 2 per-row entries
    for row in level3_commented_rows:
        name = row["name"]
        src_file = row["source_file"]
        src_line = row["source_line"]
        ta = row["ta"]
        evidence = ta.get("evidence", {})
        reg_site = evidence.get("register_site", {})
        reg_file = reg_site.get("source_file", "")
        reg_line = reg_site.get("source_line", "")

        lines.append(f"### `{name}`")
        lines.append(f"- Declared: `{src_file}:{src_line}`")
        lines.append(
            f"- Sole registration: `{reg_file}:{reg_line}` (commented out)"
        )
        lines.append(f"- {_DISPOSITION_COMMENTED_REGISTER}")
        lines.append("")

    # Section 10 -- Class 3 (verbatim block + provenance note)
    lines.append(_CLASS3_BLOCK)
    lines.append(_CLASS3_PROVENANCE_NOTE)
    lines.append("")

    # Section 11 -- Attribution (verbatim)
    lines.append(_ATTRIBUTION)
    lines.append("")

    return "\n".join(lines)
