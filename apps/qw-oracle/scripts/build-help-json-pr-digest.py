#!/usr/bin/env python3
"""build-help-json-pr-digest -- generate apps/qw-oracle/docs/upstream-prs/<project>-help-json-cleanup.md

Reads the project's seeds/help_json_classifications.yaml, filters out entries
that are no longer present in HEAD's help_*.json files (already-removed drift),
and writes the digest markdown. Idempotent -- re-runs overwrite the output
file with the current YAML + repo state.

Stale filter: a seed entry is "stale" if it lists upstream_pr_action that
asks for a help-JSON change but the entity is already absent from every
help_*.json at HEAD. Stale entries are reported on stderr but excluded
from the digest -- the upstream PR should ask for changes that still need
to be made, not changes that already shipped.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))

from extractor_lib._help_json_classification import load_classifications
from extractor_lib._help_json_pr_digest import (
    collect_help_json_names,
    render_digest,
)

HELP_FILES = (
    "help_cmdline_params.json",
    "help_commands.json",
    "help_macros.json",
    "help_variables.json",
)


def get_live_names_at_head(repo_path: Path) -> set[str] | None:
    """Return entity names present in HEAD's help_*.json files, or None if
    the repo path doesn't resolve to a git working tree (caller decides
    whether to skip filtering or fail)."""
    if not (repo_path / ".git").exists() and not (repo_path / "HEAD").exists():
        # Not a git dir; bare-repo HEAD also acceptable but uncommon for our checkouts.
        return None
    names: set[str] = set()
    for fname in HELP_FILES:
        result = subprocess.run(
            ["git", "-C", str(repo_path), "show", f"HEAD:{fname}"],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            continue
        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError:
            continue
        collect_help_json_names(data, names)
    return names


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True, help="e.g., ezquake")
    parser.add_argument(
        "--repo",
        help="Path to the project source clone (default: research/repos/<project>-source)",
    )
    args = parser.parse_args()

    seed_path = (
        REPO_ROOT / "apps/qw-oracle/scripts/extractors"
        / args.project / "seeds/help_json_classifications.yaml"
    )
    if not seed_path.exists():
        print(f"No seed found at {seed_path}", file=sys.stderr)
        return 1

    repo_path = Path(args.repo) if args.repo else (
        REPO_ROOT / "research" / "repos" / f"{args.project}-source"
    )

    out_dir = REPO_ROOT / "apps/qw-oracle/docs/upstream-prs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.project}-help-json-cleanup.md"

    classifications = load_classifications(
        seed_path.read_text(encoding="utf-8"), args.project
    )

    live_names = get_live_names_at_head(repo_path)
    if live_names is None:
        print(
            f"WARNING: repo at {repo_path} not found; emitting unfiltered digest. "
            f"Stale entries (already removed from HEAD help-JSON) may slip through.",
            file=sys.stderr,
        )
        live_classifications = classifications
        stale_names: list[str] = []
    else:
        live_classifications = {
            k: v for k, v in classifications.items()
            if v.get("upstream_pr_action") == "none" or k in live_names
        }
        stale_names = sorted(
            k for k, v in classifications.items()
            if v.get("upstream_pr_action") != "none" and k not in live_names
        )
        if stale_names:
            print(
                f"Filtered {len(stale_names)} stale entries (already removed from "
                f"HEAD help-JSON; classification stays in seed but is excluded "
                f"from the upstream PR digest):",
                file=sys.stderr,
            )
            for n in stale_names:
                print(f"  - {n}", file=sys.stderr)

    md = render_digest(args.project, live_classifications.values())
    out_path.write_text(md, encoding="utf-8")
    print(
        f"Wrote digest with {len(live_classifications)} entries "
        f"({len(stale_names)} stale filtered) to {out_path}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
