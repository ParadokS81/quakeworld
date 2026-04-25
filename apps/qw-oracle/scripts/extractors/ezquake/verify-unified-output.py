#!/usr/bin/env python3
"""Verify unified driver output against legacy extractor output.

Given an entity type, compares:
  old: packages/qw-config/src/data/ezquake-<entity>-ast.json        (legacy)
  new: packages/qw-config/src/data/ezquake-<entity>-ast.json.unified (unified)

Performs per-entity natural-key set equality plus deep-compare of entry
values. Prints symmetric difference and first-N value mismatches on failure.

This is a stronger check than row counting: "3 rows dropped + 3 rows added"
silently matches count but fails set equality.

Usage:
    python3 verify-unified-output.py --entity commands
    python3 verify-unified-output.py --entity commands --data-dir /tmp/out
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent.parent.parent
DEFAULT_DATA_DIR = HERE / "output"


# Per-entity schema: which top-level key holds the dict-of-rows, and
# which top-level keys are exempt from comparison (stats, timestamps, etc).
ENTITY_SCHEMA = {
    "commands": {
        "rows_key": "commands",
        "ignore_keys": {"_stats"},
    },
    "cvars": {
        # Legacy filename is ezquake-variables-ast.json, rows dict is "vars".
        "rows_key": "vars",
        "ignore_keys": {"_stats"},
        "filename_stem": "variables",  # overrides default "cvars" in path join
    },
    "macros": {
        "rows_key": "macros",
        "ignore_keys": {"_stats"},
    },
    "cmdline": {
        "rows_key": "params",
        "ignore_keys": {"_stats"},
        "filename_stem": "cmdline-params",
    },
    "hud-elements": {
        "rows_key": "hud_elements",
        "ignore_keys": {"_stats"},
    },
    "asset-cvar-bindings": {
        # Output is a list of binding dicts, not a dict-of-rows.
        "rows_key": "cvar_bindings",
        "ignore_keys": {"_stats"},
        "filename_stem": "asset-cvar-bindings",
        "list_key_fields": ["cvar_canonical_id", "source_ref", "loader_function"],
    },
    "asset-loader-sites": {
        "rows_key": "loader_sites",
        "ignore_keys": {"_stats"},
        "filename_stem": "asset-loader-sites",
        "list_key_fields": ["canonical_id"],
    },
    "keynames": {
        "rows_key": "keynames",
        "ignore_keys": {"_stats"},
    },
    # Future entries will follow the same shape.
}


def load_json(path: Path) -> dict:
    if not path.is_file():
        print(f"ERROR: not found: {path}", file=sys.stderr)
        sys.exit(2)
    return json.loads(path.read_text(encoding="utf-8"))


def deep_equal(a: Any, b: Any) -> bool:
    """Order-insensitive for lists of dicts is NOT required here -- the
    legacy extractors emit sorted output, and the unified finalize does
    too. Equality is exact."""
    return a == b


def diff_entries(old_map: dict, new_map: dict, max_show: int = 10) -> list[str]:
    """Per-key deep compare. Returns formatted diff lines."""
    lines: list[str] = []
    common = set(old_map) & set(new_map)
    mismatched = [k for k in sorted(common) if not deep_equal(old_map[k], new_map[k])]
    for k in mismatched[:max_show]:
        lines.append(f"  KEY MISMATCH: {k}")
        lines.append(f"    old: {json.dumps(old_map[k], sort_keys=True)}")
        lines.append(f"    new: {json.dumps(new_map[k], sort_keys=True)}")
    if len(mismatched) > max_show:
        lines.append(f"  ... {len(mismatched) - max_show} more value mismatches suppressed")
    return lines


def verify_entity(entity: str, data_dir: Path) -> int:
    schema = ENTITY_SCHEMA.get(entity)
    if schema is None:
        print(f"ERROR: unknown entity '{entity}'. Known: {list(ENTITY_SCHEMA)}", file=sys.stderr)
        return 2

    stem = schema.get("filename_stem", entity)
    old_path = data_dir / f"ezquake-{stem}-ast.json"
    new_path = data_dir / f"ezquake-{stem}-ast.json.unified"

    print(f"=== Verifying entity '{entity}' ===")
    print(f"  old: {old_path}")
    print(f"  new: {new_path}")
    print()

    old = load_json(old_path)
    new = load_json(new_path)

    rows_key = schema["rows_key"]
    ignore = schema["ignore_keys"]

    # 1. Top-level keys equal (minus ignored)
    old_keys = set(old) - ignore
    new_keys = set(new) - ignore
    if old_keys != new_keys:
        print(f"FAIL: top-level keys differ")
        print(f"  only in old: {sorted(old_keys - new_keys)}")
        print(f"  only in new: {sorted(new_keys - old_keys)}")
        return 1

    # 2. Non-rows top-level values (e.g. 'groups') must be identical
    for k in sorted(old_keys - {rows_key}):
        if not deep_equal(old[k], new[k]):
            print(f"FAIL: top-level '{k}' differs")
            print(f"  old: {json.dumps(old[k], sort_keys=True)[:200]}")
            print(f"  new: {json.dumps(new[k], sort_keys=True)[:200]}")
            return 1

    # 3. Natural-key set equality on the rows container.
    # Supports both dict-of-rows (keyed by natural name) and list-of-dicts
    # (keyed by schema["list_key_fields"] tuple).
    old_rows_raw = old[rows_key]
    new_rows_raw = new[rows_key]

    list_key_fields = schema.get("list_key_fields")
    if list_key_fields:
        if not isinstance(old_rows_raw, list) or not isinstance(new_rows_raw, list):
            print(f"FAIL: '{rows_key}' is expected to be a list for entity '{entity}'")
            return 1

        def key_for(row: dict) -> tuple:
            return tuple(row.get(f) for f in list_key_fields)

        old_rows: dict[tuple, dict] = {}
        for r in old_rows_raw:
            k = key_for(r)
            if k in old_rows:
                print(f"FAIL: duplicate natural-key in OLD list output: {k}")
                return 1
            old_rows[k] = r
        new_rows: dict[tuple, dict] = {}
        for r in new_rows_raw:
            k = key_for(r)
            if k in new_rows:
                print(f"FAIL: duplicate natural-key in NEW list output: {k}")
                return 1
            new_rows[k] = r
    else:
        old_rows = old_rows_raw
        new_rows = new_rows_raw
        if not isinstance(old_rows, dict) or not isinstance(new_rows, dict):
            print(f"FAIL: '{rows_key}' is not a dict in one of the files")
            return 1

    only_old = set(old_rows) - set(new_rows)
    only_new = set(new_rows) - set(old_rows)
    if only_old or only_new:
        print(f"FAIL: natural-key set mismatch in '{rows_key}'")
        print(f"  count old: {len(old_rows)}")
        print(f"  count new: {len(new_rows)}")
        print(f"  only in old ({len(only_old)}):")
        for k in sorted(only_old)[:20]:
            print(f"    - {k}")
        if len(only_old) > 20:
            print(f"    ... {len(only_old) - 20} more")
        print(f"  only in new ({len(only_new)}):")
        for k in sorted(only_new)[:20]:
            print(f"    + {k}")
        if len(only_new) > 20:
            print(f"    ... {len(only_new) - 20} more")
        return 1

    # 4. Deep compare per-key values
    value_diffs = diff_entries(old_rows, new_rows)
    if value_diffs:
        print(f"FAIL: same keys, differing values ({sum(1 for l in value_diffs if l.startswith('  KEY')) } mismatches)")
        for line in value_diffs:
            print(line)
        return 1

    print(f"PASS: natural-key set equality + deep value equality on {len(old_rows)} '{entity}' entries")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--entity", required=True, help=f"Entity type. Known: {list(ENTITY_SCHEMA)}")
    ap.add_argument("--data-dir", default=None, help=f"Directory holding both JSONs (default: {DEFAULT_DATA_DIR})")
    args = ap.parse_args()

    data_dir = Path(args.data_dir).resolve() if args.data_dir else DEFAULT_DATA_DIR
    return verify_entity(args.entity, data_dir)


if __name__ == "__main__":
    sys.exit(main())
