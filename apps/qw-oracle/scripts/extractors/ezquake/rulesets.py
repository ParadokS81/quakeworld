#!/usr/bin/env python3
"""Extract ezQuake rulesets with full policy bundles.

Inputs:
  - rulesets.h: the `ruleset_t` enum (authoritative set of rulesets).
  - rulesets.c: the initial `rulesetDef_t rulesetDef = { ... }` initializer
    (baseline policy = default ruleset) and the per-ruleset loader functions
    `static void Rulesets_<Name>(qbool enable)` which mutate policy fields
    and declare `locked_cvar_t disabled_cvars[] = { {&cvar_ref, "v"}, ... };`.

Per ruleset we emit:
  - enum_ident (e.g. "rs_smackdown") + public name ("smackdown")
  - loader function name (e.g. "Rulesets_Smackdown")
  - maxfps and 11 boolean policy fields (restrictTriggers, restrictPacket,
    restrictParticles, restrictPlay, restrictLogging, restrictRollAngle,
    restrictIPC, restrictExec, restrictSetCalc, restrictSetEval, restrictSetEx)
  - locked_cvars: list of {cvar_ident, value}
  - source location (the loader's opening brace)

Output: <repo>/packages/qw-config/src/data/ezquake-rulesets-ast.json

This extractor is regex-based rather than libclang-AST because rulesets.c
is small (<1000 lines), the patterns are stable, and the AST dance for
assignments-inside-if-enable would be disproportionate for 6 rulesets.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# ----- paths -----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = (EZQ_REPO / "src") if (EZQ_REPO / "src").is_dir() and any((EZQ_REPO / "src").glob("*.c")) else EZQ_REPO
RULESETS_C = EZQ_SRC / "rulesets.c"
RULESETS_H = EZQ_SRC / "rulesets.h"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (HERE / "output/ezquake-rulesets-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-rulesets-diagnostics.log"


# ----- schema of the rulesetDef_t struct -------------------------------------
# Ordered by struct field position, mapping to the JSON keys we emit.
# NOTE: the source file's comments in the initial initializer are misleading
# (e.g. field 5 is commented "restrict sound" but the struct actually has
# `restrictPlay` at that position). Position is the truth.

POLICY_FIELDS = [
    ("ruleset",           "enum_ident",          "identifier"),   # position 0
    ("maxfps",            "maxfps",              "number"),
    ("restrictTriggers",  "restrict_triggers",   "bool"),
    ("restrictPacket",    "restrict_packet",     "bool"),
    ("restrictParticles", "restrict_particles",  "bool"),
    ("restrictPlay",      "restrict_play",       "bool"),
    ("restrictLogging",   "restrict_logging",    "bool"),
    ("restrictRollAngle", "restrict_rollangle",  "bool"),
    ("restrictIPC",       "restrict_ipc",        "bool"),
    ("restrictExec",      "restrict_exec",       "bool"),
    ("restrictSetCalc",   "restrict_setcalc",    "bool"),
    ("restrictSetEval",   "restrict_seteval",    "bool"),
    ("restrictSetEx",     "restrict_setex",      "bool"),
]

# PascalCase mapping for loader function resolution: rs_<snake> -> Rulesets_<Pascal>
# Empirically verified from rulesets.c:
#   rs_default    -> Rulesets_Default
#   rs_smackdown  -> Rulesets_Smackdown
#   rs_qcon       -> Rulesets_Qcon
#   rs_thunderdome-> Rulesets_Thunderdome
#   rs_mtfl       -> Rulesets_MTFL     (all-caps acronym)
#   rs_smackdrive -> Rulesets_Smackdrive
LOADER_NAME_OVERRIDES = {
    "mtfl": "MTFL",
    "qcon": "Qcon",
}


def loader_name_for(public_name: str) -> str:
    override = LOADER_NAME_OVERRIDES.get(public_name)
    if override is not None:
        return f"Rulesets_{override}"
    return f"Rulesets_{public_name.capitalize()}"


# ----- rulesets.h parser -----------------------------------------------------


_ENUM_RE = re.compile(
    r"typedef\s+enum\s*\{([^}]*)\}\s*ruleset_t\s*;",
    re.DOTALL,
)


def parse_ruleset_enum() -> list[tuple[str, str]]:
    src = RULESETS_H.read_text(encoding="utf-8", errors="replace")
    m = _ENUM_RE.search(src)
    if m is None:
        raise RuntimeError(f"Could not find ruleset_t enum in {RULESETS_H}")
    body = m.group(1)
    out: list[tuple[str, str]] = []
    for line in body.splitlines():
        line = line.split("//")[0].strip()
        if not line:
            continue
        ident = line.rstrip(",").strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", ident):
            continue
        if not ident.startswith("rs_"):
            continue
        public = ident[len("rs_"):]
        out.append((ident, public))
    return out


# ----- rulesets.c parsing ----------------------------------------------------


def _strip_line_comments(text: str) -> str:
    # Remove // comments (keep newlines for line-number alignment).
    return re.sub(r"//[^\n]*", "", text)


def parse_initial_rulesetdef(src: str) -> dict:
    """Parse the `static rulesetDef_t rulesetDef = { ... };` initializer.
    Returns { field_name: value_literal } for each POLICY_FIELDS entry."""
    m = re.search(
        r"static\s+rulesetDef_t\s+rulesetDef\s*=\s*\{([^}]*)\}\s*;",
        src,
    )
    if m is None:
        raise RuntimeError("Could not find initial rulesetDef initializer")
    body = _strip_line_comments(m.group(1))
    # Positional values separated by commas. Newer ezQuake tags added fields to
    # rulesetDef_t incrementally: 3.6.5 has 8, 3.6.6+ has 13. Accept any count
    # up to len(POLICY_FIELDS); missing tail fields get None so the version row
    # correctly shows NULL for policies not present at that tag. A count larger
    # than POLICY_FIELDS means we hit an unknown post-head addition and should
    # stop so someone updates this script.
    raw_values = [v.strip() for v in body.split(",") if v.strip()]
    if len(raw_values) > len(POLICY_FIELDS):
        raise RuntimeError(
            f"rulesetDef initializer has {len(raw_values)} values, "
            f"expected at most {len(POLICY_FIELDS)} (POLICY_FIELDS may need a new entry)"
        )
    out: dict = {}
    for (field, _json_key, _kind), raw in zip(POLICY_FIELDS, raw_values):
        out[field] = raw
    for (field, _json_key, _kind) in POLICY_FIELDS[len(raw_values):]:
        out[field] = None
    return out


_STRUCT_DECL_RE = re.compile(
    r"typedef\s+struct\s+rulesetDef_s\s*\{",
)
_FIELD_DECL_RE = re.compile(
    r"^\s*(?:float|int|double|qbool|ruleset_t|unsigned|char|short|long)\s+(\w+)\s*;",
    re.MULTILINE,
)


def extract_struct_field_lines(source_text: str) -> dict[str, int]:
    """Locate `typedef struct rulesetDef_s { ... }` and return a map of
    field_name -> 1-indexed line number of its declaration.

    The struct is small (<20 fields) and has no nested braces in practice,
    but we walk depth defensively so any future nested typedef/union survives.
    """
    m = _STRUCT_DECL_RE.search(source_text)
    if m is None:
        return {}
    open_brace_idx = m.end() - 1
    depth = 1
    i = open_brace_idx + 1
    while i < len(source_text) and depth > 0:
        ch = source_text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    block = source_text[open_brace_idx + 1:i - 1]
    block_start_offset = open_brace_idx + 1
    out: dict[str, int] = {}
    for fm in _FIELD_DECL_RE.finditer(block):
        field_name = fm.group(1)
        # In MULTILINE mode, `^` matches at the start of each line (just
        # after a newline), so fm.start() points at the line containing
        # the type keyword. Compute 1-indexed line number in the full source.
        abs_offset = block_start_offset + fm.start()
        line_no = source_text.count("\n", 0, abs_offset) + 1
        out[field_name] = line_no
    return out


_LOADER_BODY_RE = re.compile(
    r"static\s+void\s+Rulesets_(\w+)\s*\(\s*qbool\s+enable\s*\)\s*\{",
    re.MULTILINE,
)


def find_loader_bodies(src: str) -> dict[str, tuple[int, str]]:
    """For each Rulesets_X(qbool enable) function, return (start_line, body)."""
    out: dict[str, tuple[int, str]] = {}
    for m in _LOADER_BODY_RE.finditer(src):
        name = m.group(1)
        open_brace_idx = m.end() - 1
        # Walk forward to the matching close brace for the function body.
        depth = 1
        i = open_brace_idx + 1
        while i < len(src) and depth > 0:
            ch = src[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            i += 1
        body = src[open_brace_idx + 1:i - 1]
        start_line = src[:open_brace_idx].count("\n") + 1
        out[name] = (start_line, body)
    return out


def extract_if_enable_block(body: str) -> str:
    """Return the text of the `if (enable) { ... }` block inside a loader."""
    m = re.search(r"if\s*\(\s*enable\s*\)\s*\{", body)
    if m is None:
        return ""
    open_brace_idx = m.end() - 1
    depth = 1
    i = open_brace_idx + 1
    while i < len(body) and depth > 0:
        ch = body[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    return body[open_brace_idx + 1:i - 1]


_ASSIGN_RE = re.compile(
    r"rulesetDef\.(\w+)\s*=\s*([^;]+);"
)


def parse_policy_overrides(if_enable_body: str) -> dict:
    out: dict = {}
    clean = _strip_line_comments(if_enable_body)
    for m in _ASSIGN_RE.finditer(clean):
        field = m.group(1).strip()
        value = m.group(2).strip()
        out[field] = value
    return out


_LOCKED_HEADER_RE = re.compile(
    r"locked_cvar_t\s+disabled_cvars\s*\[\s*\]\s*=\s*\{"
)
_LOCKED_ENTRY_RE = re.compile(
    r"\{\s*&\s*(\w+)\s*,\s*\"([^\"]*)\"\s*\}"
)


def parse_locked_cvars(body: str) -> list[dict]:
    """Locate `locked_cvar_t disabled_cvars[] = { {&a,"v"}, ... };` and pull
    each inner {&cvar_ref, "value"} pair. Note that parent `body` here is the
    full loader function body (not just if-enable), because MTFL declares
    disabled_cvars above the if. We walk braces to find the outer array
    bounds since regex can't handle nested braces cleanly."""
    m = _LOCKED_HEADER_RE.search(body)
    if m is None:
        return []
    i = m.end()  # position just after the opening '{'
    depth = 1
    while i < len(body) and depth > 0:
        ch = body[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    if depth != 0:
        return []
    array_body = body[m.end():i - 1]
    out: list[dict] = []
    for entry in _LOCKED_ENTRY_RE.finditer(array_body):
        out.append({"cvar_ident": entry.group(1), "value": entry.group(2)})
    return out


# ----- value normalisation ---------------------------------------------------


def normalise_value(raw: str, kind: str):
    raw = raw.strip()
    if kind == "bool":
        if raw == "true":
            return 1
        if raw == "false":
            return 0
        return None
    if kind == "number":
        try:
            return float(raw)
        except ValueError:
            return None
    return raw  # identifier — leave as-is


# ----- main ------------------------------------------------------------------


def build_ruleset_entry(
    enum_ident: str,
    public: str,
    loader_fn: str,
    resolved_policy: dict,
    locked_cvars: list[dict],
    source_line: int,
    field_source_lines: dict[str, dict] | None = None,
) -> dict:
    ast: dict = {
        "enum_ident": enum_ident,
        "loader_fn": loader_fn,
        "source_file": RULESETS_C.name,
        "source_line": source_line,
    }
    for field, json_key, kind in POLICY_FIELDS:
        raw = resolved_policy.get(field)
        if raw is None:
            ast[json_key] = None
            continue
        ast[json_key] = normalise_value(raw, kind)
    ast["locked_cvars"] = locked_cvars
    ast["locked_cvar_count"] = len(locked_cvars)
    if field_source_lines is not None:
        ast["field_source_lines"] = field_source_lines
    return {"ast": ast}


def main() -> int:
    print("ezQuake ruleset AST extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not RULESETS_C.is_file() or not RULESETS_H.is_file():
        print(f"ERROR: rulesets source files missing", file=sys.stderr)
        return 1

    diagnostics: list[str] = []

    print("Phase 1: parsing rulesets.h enum")
    enum_pairs = parse_ruleset_enum()
    print(f"  rulesets: {[p for _, p in enum_pairs]}")

    print("\nPhase 2: parsing rulesets.c")
    src = RULESETS_C.read_text(encoding="utf-8", errors="replace")
    base_policy = parse_initial_rulesetdef(src)
    loaders = find_loader_bodies(src)
    print(f"  loader functions found: {sorted(loaders.keys())}")

    # Per-field source locations from the rulesetDef_s struct declaration.
    # The struct is shared across all rulesets, so every entry receives the
    # same map. Older ezQuake tags naturally yield fewer fields because the
    # struct grew incrementally.
    #
    # Keys are the JSON (snake_case) field names, NOT the raw C struct names.
    # This is deliberate: downstream (Task 11 adapter + Task 12 diff pipeline)
    # uses this map's keys as the field_name column in source_overrides, which
    # must match the JSON schema keys the diff pipeline walks. Fields present
    # in the C struct but not in POLICY_FIELDS are dropped (would mean the
    # script needs updating anyway -- same posture as parse_initial_rulesetdef).
    raw_field_lines = extract_struct_field_lines(src)
    c_to_json = {c_name: json_key for c_name, json_key, _ in POLICY_FIELDS}
    field_source_lines_shared: dict[str, dict] = {}
    for c_name, line in raw_field_lines.items():
        json_key = c_to_json.get(c_name)
        if json_key is None:
            continue
        field_source_lines_shared[json_key] = {
            "source_file": RULESETS_C.name,
            "source_line": line,
        }
    print(f"  struct field source lines: {len(field_source_lines_shared)}")

    print("\nPhase 3: assembling ruleset entries")
    rulesets_out: dict[str, dict] = {}
    for enum_ident, public in enum_pairs:
        loader_fn = loader_name_for(public)
        loader_key = loader_fn[len("Rulesets_"):]

        resolved = dict(base_policy)  # start from default
        source_line = 0
        locked_cvars: list[dict] = []

        if loader_key in loaders:
            start_line, body = loaders[loader_key]
            source_line = start_line
            if_enable = extract_if_enable_block(body)
            overrides = parse_policy_overrides(if_enable)
            resolved.update(overrides)
            # locked_cvars may be declared at function scope (above the if)
            # so we search the whole loader body, not just the if-enable.
            locked_cvars = parse_locked_cvars(body)
        else:
            # Default ruleset loader (Rulesets_Default) exists but has no
            # if-enable body (it just sets .ruleset). That's fine -- base
            # policy already reflects default. Ensure the .ruleset field
            # matches.
            resolved["ruleset"] = enum_ident
            # Record source location of the loader for the default case too
            if "Default" in loaders:
                source_line, _ = loaders["Default"]

        # Force the ruleset enum_ident field to the current ruleset regardless
        # of what the initializer had (the initializer always says rs_default).
        resolved["ruleset"] = enum_ident

        entry = build_ruleset_entry(
            enum_ident=enum_ident,
            public=public,
            loader_fn=loader_fn,
            resolved_policy=resolved,
            locked_cvars=locked_cvars,
            source_line=source_line,
            field_source_lines=field_source_lines_shared,
        )
        rulesets_out[public] = entry

    output = {
        "rulesets": rulesets_out,
        "_stats": {
            "total": len(rulesets_out),
            "with_locked_cvars": sum(1 for e in rulesets_out.values() if e["ast"]["locked_cvar_count"] > 0),
        },
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"  total rulesets: {len(rulesets_out)}")
    for name, e in sorted(rulesets_out.items()):
        ast = e["ast"]
        print(f"    {name:<12} maxfps={ast['maxfps']}  locked={ast['locked_cvar_count']}")
    print(f"\n  written: {OUTPUT_JSON}")

    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text(
        "\n".join(diagnostics) + "\n" if diagnostics else "(no diagnostics)\n",
        encoding="utf-8",
    )
    print(f"  diagnostics logged: {DIAGNOSTICS_LOG} ({len(diagnostics)} entries)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
