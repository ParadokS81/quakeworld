#!/usr/bin/env python3
"""Seed-rule verifier for FTE asset path rules.

Cross-checks every rule in
`apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-path-rules.yaml`
against the current FTE source. For each rule with a `source_ref` of the
form `<file>:<line>`, the verifier:

  1. Confirms the file exists and the line number is in range.
  2. Parses the enclosing translation unit with libclang and finds the
     function that contains that line.
  3. Records a simple fingerprint: function name + parameter list text.

Drift between a rule's prior fingerprint and the current one is surfaced
so a human can re-read the referenced site and update the rule text.

Output: <repo>/apps/qw-oracle/scripts/extractors/fte/output/fte-asset-path-rules-verified.json
        (the original seed rules augmented with source_verified + fingerprint).

Mirrors apps/qw-oracle/scripts/extractors/ezquake/asset-path-rules-verify.py
adapted to FTE's source layout (engine/common/, engine/client/, ...) and
clang-args matrix (uses clang_args_fte_for from extractor_lib).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import yaml
from clang.cindex import Config, CursorKind, Index, TranslationUnit

# ----- paths ----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent.parent.parent

# Pull FTE clang args from the shared lib so we stay in lockstep with the
# unified extractor's parse settings.
sys.path.insert(0, str(HERE.parent))
from extractor_lib.clang_config import clang_args_fte_for  # noqa: E402

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--seed", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

FTE_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/fteqw")
# FTE source paths in the seed are relative to the repo root (e.g.
# "engine/common/fs.c"), not a "src/" subdir. Use the repo root as SRC.
FTE_SRC = FTE_REPO
SEED_YAML = Path(_args.seed).resolve() if _args.seed else (HERE / "seeds/fte-asset-path-rules.yaml")
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (HERE / "output/fte-asset-path-rules-verified.json")

Config.set_library_file("libclang-18.so.1")

# Use the FTE client clang variant for parsing. The path-rules YAML cites
# fs.c / fs_pak.c / fs_zip.c which compile under the client variant; the
# server variant is fine too but we pick one consistently.
CLANG_ARGS = clang_args_fte_for(str(FTE_REPO))

PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


# ----- verification ---------------------------------------------------------


SOURCE_REF_RE = re.compile(r"^([A-Za-z0-9_./-]+):(\d+)$")


def _enclosing_function_at(tu, target_path: str, line: int) -> Optional[tuple[str, str]]:
    """Walk the TU and return (function_name, param_list_text) for the
    FUNCTION_DECL whose body contains `line`. None if not found."""
    match: Optional[tuple[str, str]] = None

    def visit(node):
        nonlocal match
        if (
            node.kind == CursorKind.FUNCTION_DECL
            and node.location.file is not None
            and node.location.file.name.endswith(target_path)
        ):
            start = node.extent.start.line
            end = node.extent.end.line
            if start <= line <= end:
                params = []
                for c in node.get_children():
                    if c.kind == CursorKind.PARM_DECL:
                        params.append(f"{c.type.spelling} {c.spelling}".strip())
                match = (node.spelling or "?", ", ".join(params))
                return
        for c in node.get_children():
            if match is not None:
                return
            visit(c)

    visit(tu.cursor)
    return match


@dataclass
class VerifiedRule:
    canonical_id: str
    rule_kind: str
    ordinal: int
    description: str
    source_ref: str
    source_verified: int
    verified_function_name: Optional[str]
    verified_function_fingerprint: Optional[str]
    verification_notes: Optional[str]
    original: dict


def verify_rules(rules: list[dict]) -> list[VerifiedRule]:
    unique_files: set[str] = set()
    for r in rules:
        ref = r.get("source_ref") or ""
        m = SOURCE_REF_RE.match(ref)
        if m:
            unique_files.add(m.group(1))

    idx = Index.create()
    tus: dict[str, TranslationUnit] = {}
    for f in sorted(unique_files):
        path = FTE_SRC / f
        if not path.is_file():
            continue
        tus[f] = idx.parse(str(path), args=CLANG_ARGS, options=PARSE_OPTS)

    verified: list[VerifiedRule] = []
    for r in rules:
        canonical_id = r["canonical_id"]
        rule_kind = r["rule_kind"]
        ordinal = int(r["ordinal"])
        description = r.get("description", "").strip()
        source_ref = r.get("source_ref", "") or ""

        fn_name = None
        fingerprint = None
        notes = None
        verified_flag = 0

        m = SOURCE_REF_RE.match(source_ref)
        if not m:
            notes = f"source_ref does not match <file>:<line> shape ({source_ref!r})"
        else:
            file_part, line_part = m.group(1), int(m.group(2))
            path = FTE_SRC / file_part
            if not path.is_file():
                notes = f"source file not found: {file_part}"
            elif file_part not in tus:
                notes = f"libclang TU not available for {file_part}"
            else:
                total_lines = sum(1 for _ in path.open(encoding="utf-8", errors="replace"))
                if line_part < 1 or line_part > total_lines:
                    notes = f"line {line_part} out of bounds (file has {total_lines} lines)"
                else:
                    res = _enclosing_function_at(tus[file_part], file_part, line_part)
                    if res is None:
                        notes = f"no FUNCTION_DECL covers line {line_part}"
                    else:
                        fn_name, fingerprint_args = res
                        fingerprint = f"{fn_name}({fingerprint_args})"
                        verified_flag = 1

        verified.append(VerifiedRule(
            canonical_id=canonical_id,
            rule_kind=rule_kind,
            ordinal=ordinal,
            description=description,
            source_ref=source_ref,
            source_verified=verified_flag,
            verified_function_name=fn_name,
            verified_function_fingerprint=fingerprint,
            verification_notes=notes,
            original=r,
        ))
    return verified


# ----- main -----------------------------------------------------------------


def main() -> int:
    print("FTE asset path-rules seed verification")
    print(f"  repo:   {FTE_REPO}")
    print(f"  seed:   {SEED_YAML}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not SEED_YAML.is_file():
        print(f"ERROR: seed not found at {SEED_YAML}", file=sys.stderr)
        return 1

    with SEED_YAML.open() as fh:
        seed = yaml.safe_load(fh)
    if not isinstance(seed, dict) or "path_rules" not in seed:
        print("ERROR: seed does not contain a path_rules list", file=sys.stderr)
        return 1

    rules = seed["path_rules"] or []
    print(f"  input rules: {len(rules)}")

    verified = verify_rules(rules)

    ok = sum(1 for v in verified if v.source_verified)
    bad = len(verified) - ok

    output = {
        "project": seed.get("project"),
        "version": seed.get("version"),
        "path_rules": [
            {
                "canonical_id": v.canonical_id,
                "rule_kind": v.rule_kind,
                "ordinal": v.ordinal,
                "description": v.description,
                "source_ref": v.source_ref,
                "source_verified": v.source_verified,
                "verified_function_name": v.verified_function_name,
                "verified_function_fingerprint": v.verified_function_fingerprint,
                "verification_notes": v.verification_notes,
            }
            for v in verified
        ],
        "_stats": {
            "total": len(verified),
            "verified": ok,
            "failed": bad,
        },
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    print(f"  verified: {ok}/{len(verified)}")
    if bad:
        print(f"  FAILED:   {bad}")
        for v in verified:
            if not v.source_verified:
                print(f"    - {v.canonical_id}: {v.verification_notes}")

    print()
    print(f"  written: {OUTPUT_JSON}")
    return 0 if bad == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
