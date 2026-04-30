#!/usr/bin/env python3
"""build-help-json-pr-digest -- generate apps/qw-oracle/docs/upstream-prs/<project>-help-json-cleanup.md

Reads the project's seeds/help_json_classifications.yaml and writes the
digest markdown. Idempotent -- re-runs overwrite the output file with the
current YAML state.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))

from extractor_lib._help_json_classification import load_classifications
from extractor_lib._help_json_pr_digest import render_digest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True, help="e.g., ezquake")
    args = parser.parse_args()

    seed_path = (
        REPO_ROOT / "apps/qw-oracle/scripts/extractors"
        / args.project / "seeds/help_json_classifications.yaml"
    )
    if not seed_path.exists():
        print(f"No seed found at {seed_path}", file=sys.stderr)
        return 1

    out_dir = REPO_ROOT / "apps/qw-oracle/docs/upstream-prs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.project}-help-json-cleanup.md"

    classifications = load_classifications(
        seed_path.read_text(encoding="utf-8"), args.project
    )
    md = render_digest(args.project, classifications.values())
    out_path.write_text(md, encoding="utf-8")
    print(f"Wrote digest with {len(classifications)} entries to {out_path}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
