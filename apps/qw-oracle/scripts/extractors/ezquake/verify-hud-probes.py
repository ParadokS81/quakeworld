#!/usr/bin/env python3
"""ezQuake Track-B known-answer probe harness for the HUD_Register COMMAND
handler (_handler_hud.py).

Drives the ezQuake extractor IN-PROCESS (parallel workers, default) over a
committed synthetic fixture (fixtures/hud-probe/ via --repo-root, NOT the
live source) into a temp dir, loads the emitted
`ezquake-hud-commands-ast.json`, and asserts:
  - ANCHOR 1: the fixture bare command present with correct fields
  - ANCHOR 2: +hud_<elem> and -hud_<elem> present with correct fields
  - ANCHOR 3: the fixture plain command NOT present; no orphan +/- without
    its bare element
  - R7: zero cvar-shaped output in the JSON
  - R1: AST-confirm 0 non-literal HUD_Register first args

Why parallel (NOT serial like the callgraph sibling)? The callgraph sibling
forces --workers 1 because _callgraph._RESULT is in-process module-level
state that must be populated in THIS process's post-walk. THIS handler
has NO in-process state -- it writes a JSON file in finalize(), which the
file-system delivers deterministically regardless of how many workers ran.
Serial would work too, but the default parallel workers are correct here and
keep the gate consistent with a normal extract run.

X2 / W4 compliance: ALL assertions read ONLY the handler's own emitted JSON.
NO L1 column read (no schema until Phase 3), NO combined/cross-track harness
(Phase 4), NO runtime dump (Phase 4 answer key), NO _callgraph import (D1
hard no-blend).

D18 gate shape: hard, all-or-nothing, loud. Any RED probe exits non-zero
with a full per-probe report. On all-GREEN exits 0 with exactly five GREEN
lines.

X10: ASCII only, -- for dashes, comments explain WHY not WHAT.
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
from pathlib import Path

# The extractor and extractor_lib live alongside / one level up from this
# file. Both must be on sys.path before we import extract. extract.py itself
# does the same manipulation at import time, but we do it here too so the
# script is runnable from any working directory.
HERE = Path(__file__).resolve().parent
EXTRACTORS_ROOT = HERE.parent  # apps/qw-oracle/scripts/extractors/

# The committed synthetic fixture tree the probe parses INSTEAD of the live
# ezQuake source. We own it; no HUD refactor / element rename / file move can
# flip the anchors RED for a reason unrelated to the extractor mechanism, and
# it parses in a fraction of a second (sibling of fixtures/callgraph-probe/).
# extract.main() resolves --repo-root to <root>/src when that holds .c files,
# so FIXTURE_ROOT points at the dir CONTAINING src/.
FIXTURE_ROOT = HERE / "fixtures" / "hud-probe"
# The fixture HUD element + symbols the anchors assert (see hud_fixture.c).
FIXTURE_ELEMENT = "fixradar"            # HUD_PLUSMINUS + show -> bare + +/- (ANCHOR 1/2)
FIXTURE_SOURCE_FILE = "hud_fixture.c"   # the fixture's source basename (ANCHOR 1)
FIXTURE_PLAIN_COMMAND = "fixtoggle"     # plain Cmd_AddCommand -> must be absent (ANCHOR 3)

if str(EXTRACTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXTRACTORS_ROOT))
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

# Import the extractor entry point. We drive it in-process via a patched
# sys.argv (identical pattern to verify-callgraph-probes.py).
import extract  # noqa: E402 -- the ezquake extractor


# Regex for cvar-shaped command names: hud_<name>_<subvar> but NOT a valid
# +/- command. Used by R7 probe to catch any key that looks like a settings
# cvar (e.g. hud_radar_show) slipping through.
# A +/- command is exactly: starts with '+' or '-' followed by 'hud_'.
# A bare HUD element name has no underscored suffix beyond the element itself.
# A cvar shape would be: hud_<word>_<word> with no leading +/-.
_CVAR_SHAPE_RE = re.compile(r'^hud_[^_]+_.+$')

# Keys the mk() cvar builder produces inside each entry -- R7 must assert none.
_CVAR_ENTRY_KEYS = {"cvar_name", "c_ident", "storage_class", "default_value"}

# Top-level keys the handler's JSON is allowed to carry.
_ALLOWED_TOP_KEYS = {"hud_commands", "r1", "_stats"}


def _run_extractor(tmp_dir: str) -> int:
    """Drive extract.main() in this process over the FIXTURE tree into tmp_dir.

    Parallel workers (default) are correct here because this handler's output
    is a JSON file -- no in-process module-level state depends on which
    process ran the walk (unlike the callgraph sibling). We suppress progress
    noise with --progress-every 0.

    Source: --repo-root points at the committed synthetic fixture
    (FIXTURE_ROOT -> hud_fixture.c), NOT the live ezQuake checkout, so the
    five anchors are pinned to fixture symbols we own and the parse takes a
    fraction of a second. --handlers hud-commands runs ONLY this handler --
    its finalize reads no ezQuake files, and skipping the others avoids their
    help-JSON reads; the probe consumes only this handler's JSON anyway.
    """
    old_argv = sys.argv[:]
    sys.argv = [
        "extract.py",
        "--repo-root", str(FIXTURE_ROOT),
        "--handlers", "hud-commands",   # only the handler this probe reads
        "--output-dir", tmp_dir,
        "--progress-every", "0",        # suppress progress noise in gate output
    ]
    try:
        rc = extract.main()
    finally:
        sys.argv = old_argv
    return rc


def _load_hud_json(tmp_dir: str) -> dict:
    """Load and return the emitted ezquake-hud-commands-ast.json."""
    p = Path(tmp_dir) / "ezquake-hud-commands-ast.json"
    with p.open() as f:
        return json.load(f)


def _loud_fail(probe: str, notes: list[str], extra: object = None) -> None:
    """Print a loud per-probe RED report.

    Does NOT call sys.exit -- the caller collects all RED probes and exits
    once at the end (D18 all-or-nothing: all probes must pass or the whole
    gate is RED).
    """
    sep = "-" * 60
    print(f"\n{sep}")
    print(f"{probe} RED")
    for note in notes:
        print(f"  reason: {note}")
    if extra is not None:
        print(f"  data:   {json.dumps(extra, indent=4)}")
    print(sep)


def _check_anchor_1(hud_commands: dict) -> bool:
    """Anchor 1: the fixture bare command present with all expected field values.

    Ground truth (fixture -- hud_fixture.c):
      HUD_Register("fixradar", 0, 0, HUD_PLUSMINUS, 0, 0, 0, "0")
      -> bare command emitted unconditionally (live analogue: hud.c:1232)
      -> hud_family=bare, hud_element=<FIXTURE_ELEMENT>
      -> ast.handler_fn=HUD_Func_f, ast.registration_api=Cmd_AddCommand
      -> ast.source_file=<FIXTURE_SOURCE_FILE>

    Dump cross-check is Phase 4 / D19 -- NOT asserted here (X2).
    """
    entry = hud_commands.get(FIXTURE_ELEMENT)
    notes = []

    if entry is None:
        notes.append(
            f"hud_commands[{FIXTURE_ELEMENT!r}] absent -- bare command not emitted"
        )
        _loud_fail("ANCHOR 1", notes, entry)
        return False

    if entry.get("hud_family") != "bare":
        notes.append(
            f"hud_family: expected 'bare', got {entry.get('hud_family')!r}"
        )
    if entry.get("hud_element") != FIXTURE_ELEMENT:
        notes.append(
            f"hud_element: expected {FIXTURE_ELEMENT!r}, got {entry.get('hud_element')!r}"
        )

    ast = entry.get("ast", {})
    if ast.get("handler_fn") != "HUD_Func_f":
        notes.append(
            f"ast.handler_fn: expected 'HUD_Func_f', got {ast.get('handler_fn')!r}"
        )
    if ast.get("registration_api") != "Cmd_AddCommand":
        notes.append(
            f"ast.registration_api: expected 'Cmd_AddCommand',"
            f" got {ast.get('registration_api')!r}"
        )
    if ast.get("source_file") != FIXTURE_SOURCE_FILE:
        notes.append(
            f"ast.source_file: expected {FIXTURE_SOURCE_FILE!r},"
            f" got {ast.get('source_file')!r}"
        )

    if notes:
        _loud_fail("ANCHOR 1", notes, entry)
        return False
    return True


def _check_anchor_2(hud_commands: dict) -> bool:
    """Anchor 2: +hud_<elem> and -hud_<elem> both present with correct fields.

    Ground truth (fixture -- hud_fixture.c):
      arg3 (flags) carries HUD_PLUSMINUS -> gate_plusminus passes
      arg7 (show)  = "0" (non-NULL string literal) -> gate_show passes
      Both gates pass => handler MUST emit +hud_<elem> and -hud_<elem>.
      handler_fn: HUD_Plus_f / HUD_Minus_f
      registration_api: Cmd_AddRemCommand (both)
      hud_element: <FIXTURE_ELEMENT> (the literal arg0, D16)
    """
    notes = []
    plus_key = f"+hud_{FIXTURE_ELEMENT}"
    minus_key = f"-hud_{FIXTURE_ELEMENT}"

    plus_entry = hud_commands.get(plus_key)
    minus_entry = hud_commands.get(minus_key)

    if plus_entry is None:
        notes.append(
            f"hud_commands[{plus_key!r}] absent -- +/- gate should pass"
            " (flags=HUD_PLUSMINUS, show='0' non-NULL)"
        )
    if minus_entry is None:
        notes.append(
            f"hud_commands[{minus_key!r}] absent -- +/- gate should pass"
            " (flags=HUD_PLUSMINUS, show='0' non-NULL)"
        )

    if notes:
        _loud_fail("ANCHOR 2", notes, {
            plus_key: plus_entry,
            minus_key: minus_entry,
        })
        return False

    # Both exist -- verify field values.
    if plus_entry.get("hud_element") != FIXTURE_ELEMENT:
        notes.append(
            f"{plus_key} hud_element: expected {FIXTURE_ELEMENT!r},"
            f" got {plus_entry.get('hud_element')!r}"
        )
    if plus_entry.get("hud_family") != "plus":
        notes.append(
            f"{plus_key} hud_family: expected 'plus',"
            f" got {plus_entry.get('hud_family')!r}"
        )
    plus_ast = plus_entry.get("ast", {})
    if plus_ast.get("handler_fn") != "HUD_Plus_f":
        notes.append(
            f"{plus_key} ast.handler_fn: expected 'HUD_Plus_f',"
            f" got {plus_ast.get('handler_fn')!r}"
        )
    if plus_ast.get("registration_api") != "Cmd_AddRemCommand":
        notes.append(
            f"{plus_key} ast.registration_api: expected 'Cmd_AddRemCommand',"
            f" got {plus_ast.get('registration_api')!r}"
        )

    if minus_entry.get("hud_element") != FIXTURE_ELEMENT:
        notes.append(
            f"{minus_key} hud_element: expected {FIXTURE_ELEMENT!r},"
            f" got {minus_entry.get('hud_element')!r}"
        )
    if minus_entry.get("hud_family") != "minus":
        notes.append(
            f"{minus_key} hud_family: expected 'minus',"
            f" got {minus_entry.get('hud_family')!r}"
        )
    minus_ast = minus_entry.get("ast", {})
    if minus_ast.get("handler_fn") != "HUD_Minus_f":
        notes.append(
            f"{minus_key} ast.handler_fn: expected 'HUD_Minus_f',"
            f" got {minus_ast.get('handler_fn')!r}"
        )
    if minus_ast.get("registration_api") != "Cmd_AddRemCommand":
        notes.append(
            f"{minus_key} ast.registration_api: expected 'Cmd_AddRemCommand',"
            f" got {minus_ast.get('registration_api')!r}"
        )

    if notes:
        _loud_fail("ANCHOR 2", notes, {
            plus_key: plus_entry,
            minus_key: minus_entry,
        })
        return False
    return True


def _check_anchor_3(hud_commands: dict) -> bool:
    """Anchor 3: additivity and literal-control gate.

    Two assertions:
    (a) The fixture's plain command (FIXTURE_PLAIN_COMMAND, a bare
        Cmd_AddCommand -- live analogue 'togglehud' at hud.c:819) must NOT
        appear in hud_commands. The handler visits only HUD_Register, so it
        must not over-reach into the literal commands _handler_commands.py
        owns. (Analogue of Track A's cl_bobhead gate -- D10.)
    (b) No orphan +/- command: for every key starting with '+hud_' or '-hud_',
        strip the '+hud_' or '-hud_' prefix to get the element stem, and assert
        a bare key equal to that stem exists in hud_commands with hud_family
        'bare'. An orphan +/- without its bare element would indicate a bug in
        the gating logic (the bare command is unconditional, so if +/- emits,
        the bare must also emit).
    """
    notes = []
    offending: list[str] = []

    if FIXTURE_PLAIN_COMMAND in hud_commands:
        notes.append(
            f"{FIXTURE_PLAIN_COMMAND!r} is present in hud_commands -- handler"
            f" over-reached; it is a plain Cmd_AddCommand (live analogue"
            f" 'togglehud' at hud.c:819), NOT HUD_Register"
        )
        offending.append(FIXTURE_PLAIN_COMMAND)

    # Check for orphan +/- without a corresponding bare element.
    for key in hud_commands:
        if key.startswith("+hud_"):
            stem = key[len("+hud_"):]
        elif key.startswith("-hud_"):
            stem = key[len("-hud_"):]
        else:
            continue  # bare command or something else -- skip
        bare_entry = hud_commands.get(stem)
        if bare_entry is None or bare_entry.get("hud_family") != "bare":
            notes.append(
                f"orphan +/- command '{key}': no bare element '{stem}' found"
                f" (bare entry: {bare_entry!r})"
            )
            offending.append(key)

    if notes:
        _loud_fail("ANCHOR 3", notes, offending)
        return False
    return True


def _check_r7(data: dict) -> bool:
    """R7 probe: zero cvar-shaped output anywhere in the JSON.

    Three assertions (from the task contract):
    (a) No top-level key other than hud_commands / r1 / _stats. A cvar
        container would appear as a top-level key.
    (b) No hud_commands entry value carries cvar_name / c_ident /
        storage_class / default_value at the entry level or inside its ast.
        These are the keys the _synthesize_hud_cvars mk() builder produces.
    (c) No hud_commands key matches the cvar shape hud_<name>_<subvar> while
        NOT being a +/- command (i.e. a settings cvar name like hud_radar_show
        must never appear as a key).
    """
    notes = []
    offending_keys: list[str] = []
    offending_fields: list[str] = []

    # (a) Unexpected top-level keys.
    extra_top = set(data.keys()) - _ALLOWED_TOP_KEYS
    if extra_top:
        notes.append(
            f"unexpected top-level key(s) {sorted(extra_top)!r}"
            " -- a cvar container must not appear at the top level"
        )

    hud_commands = data.get("hud_commands", {})

    for cmd_key, entry in hud_commands.items():
        # (b) Cvar-shaped fields in the entry dict or its ast sub-dict.
        entry_level_cvar = _CVAR_ENTRY_KEYS & set(entry.keys())
        if entry_level_cvar:
            notes.append(
                f"entry '{cmd_key}' carries cvar field(s)"
                f" {sorted(entry_level_cvar)!r} at the entry level"
            )
            offending_fields.append(cmd_key)
        ast_level_cvar = _CVAR_ENTRY_KEYS & set(entry.get("ast", {}).keys())
        if ast_level_cvar:
            notes.append(
                f"entry '{cmd_key}' ast carries cvar field(s)"
                f" {sorted(ast_level_cvar)!r}"
            )
            offending_fields.append(cmd_key)

        # (c) Cvar-shaped key: matches hud_<name>_<subvar> AND is not a +/-
        # command (which starts with +/- so _CVAR_SHAPE_RE won't match it).
        if _CVAR_SHAPE_RE.match(cmd_key):
            notes.append(
                f"key '{cmd_key}' matches cvar shape 'hud_<name>_<subvar>'"
                " -- a settings cvar must not appear as a hud_commands key"
                " (collision with _handler_cvars.py:288-351)"
            )
            offending_keys.append(cmd_key)

    if notes:
        _loud_fail("R7", notes, {
            "offending_keys": offending_keys,
            "offending_fields": offending_fields,
            "extra_top_keys": sorted(extra_top) if extra_top else [],
        })
        return False
    return True


def _check_r1(r1: dict) -> bool:
    """R1 probe: AST-confirm 0 non-literal HUD_Register first args.

    The literal-only premise (D8) is load-bearing only after the AST
    confirms it. The handler records every HUD_Register site whose arg0 did
    NOT resolve via literal_string() + the macro fallback; this probe reads
    that evidence.

    If nonliteral_count > 0: D8's literal-only premise is REFUTED at the
    AST level. This is a designed STOP -- NOT a code bug to patch. Surface to
    the operator: the recovery is a decisions.md amendment (the D7/D11
    refuted-premise precedent), never constant-propagation (that blends toward
    Track A, violating D1).
    """
    count = r1.get("nonliteral_count", -1)
    sites = r1.get("nonliteral_first_arg_sites", [])

    if count == 0 and sites == []:
        return True

    # Non-zero count or non-empty sites list: the designed STOP fires.
    # Print every offending site before the loud message.
    print("\nR1 non-literal sites found:")
    for site_entry in sites:
        site = site_entry.get("site", "?")
        raw = site_entry.get("raw", "?")
        print(f"  {site}  raw={raw!r}")

    # This exact message is wired in the task contract -- do not paraphrase.
    print(
        "\nR1 RED -- non-literal HUD_Register first arg(s) found; STOP."
        " Do NOT constant-propagate (D1). Surface to operator: D8's"
        " literal-only premise is refuted at the AST level; this needs"
        " an operator amendment, not a code workaround."
    )
    return False


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="hud-probe-") as tmp_dir:
        print("Running ezQuake extractor (parallel) to emit hud-commands JSON...")
        rc = _run_extractor(tmp_dir)
        if rc != 0:
            print(
                f"ERROR: extract.main() returned {rc} -- extractor failed;"
                " hud-commands JSON may be absent or incomplete.",
                file=sys.stderr,
            )
            # Do not abort immediately: the JSON may still be present if the
            # failure was in a different handler. The load below will fail
            # loudly if the file is absent.

        try:
            data = _load_hud_json(tmp_dir)
        except FileNotFoundError:
            print(
                "ERROR: ezquake-hud-commands-ast.json not found in extractor"
                " output -- handler may not be registered (ENABLE_HUD_COMMANDS_HANDLER?)"
                " or extractor aborted before finalize.",
                file=sys.stderr,
            )
            return 1

        hud_commands = data.get("hud_commands", {})
        r1 = data.get("r1", {})

        g1 = _check_anchor_1(hud_commands)
        g2 = _check_anchor_2(hud_commands)
        g3 = _check_anchor_3(hud_commands)
        g_r7 = _check_r7(data)
        g_r1 = _check_r1(r1)

    # tmp_dir is cleaned up here; all assertions ran against the in-memory data.

    if g1:
        print("ANCHOR 1 GREEN")
    if g2:
        print("ANCHOR 2 GREEN")
    if g3:
        print("ANCHOR 3 GREEN")
    if g_r7:
        print("R7 GREEN")
    if g_r1:
        print("R1 GREEN")

    if not (g1 and g2 and g3 and g_r7 and g_r1):
        # D18 all-or-nothing: any RED probe means the whole gate is RED.
        # The loud per-probe reports were already printed above.
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
