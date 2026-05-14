#!/usr/bin/env python3
"""classify-help-json -- propose classifications for doc_only entries.

Cross-project CLI. Pass `--project ezquake` (or `fte`, `qwcl`, `mvdsv`) to
target a specific upstream codebase. Each project has a hardcoded upstream
repo path in PROJECT_REPOS below; new projects get a one-line addition there.

Reads:
  - qw_oracle Postgres (via DATABASE_URL or docker exec fallback):
    project=<project> source_state='doc_only' entities + source_backed names
  - apps/qw-oracle/scripts/extractors/<project>/seeds/help_json_classifications.yaml
    (existing classifications; entries here are skipped -- already classified)
  - research/repos/<project>-source/ (the upstream git clone for blame index)

Writes:
  - apps/qw-oracle/scripts/extractors/<project>/seeds/help_json_classifications.yaml
    (appends operator-confirmed classifications; preserves existing entries)
  - stdout: human-readable diff of proposed classifications for operator review

Workflow:
  1. Run this script. It prints proposed classifications for unclassified entries.
  2. Operator reviews stdout, decides which to accept.
  3. Operator runs script with --apply to persist confirmations to YAML.
  4. (Future runs skip already-classified entries; only new mysteries surface.)

Usage:
  python scripts/classify-help-json.py --project ezquake --propose
                                          # print proposals (read-only)
  python scripts/classify-help-json.py --project ezquake --apply --confidence-threshold high
                                          # auto-accept high-confidence proposals
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))

from extractor_lib._help_json_blame import (
    build_blame_index,
    classify_from_blame,
)
from extractor_lib._help_json_classification import (
    Classification,
    load_classifications,
    validate_entry,
)


# DATABASE_URL takes precedence; falls back to docker exec on the local
# dev container at `qw-oracle-postgres-dev` (the canonical dev shape).
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://qworacle:dev@localhost:5432/qw_oracle")
DOCKER_CONTAINER = "qw-oracle-postgres-dev"

# Per-project upstream repo paths. Currently single-entry: only ezQuake
# ships a help_*.json file (verified 2026-04-30: research/repos/ezquake-source
# and research/repos/unezquake; FTE/QWCL/MVDSV have no help-JSON files in
# their source trees, so their `entities` rows never land as `doc_only`).
# This shape is structured to support future onboarding if any project gains
# a help-JSON convention; until then, no other entries belong here.
PROJECT_REPOS: dict[str, Path] = {
    "ezquake": REPO_ROOT / "research/repos/ezquake-source",
}


def _run_psql(sql: str) -> str:
    """Run a SQL query via psql. Tries local DATABASE_URL first, then docker exec."""
    try:
        result = subprocess.run(
            ["psql", DATABASE_URL, "-tA", "-F", "\t", "-c", sql],
            capture_output=True, text=True, check=True, timeout=30,
        )
        return result.stdout
    except (FileNotFoundError, subprocess.CalledProcessError):
        result = subprocess.run(
            ["docker", "exec", "-i", DOCKER_CONTAINER,
             "psql", "-U", "qworacle", "-d", "qw_oracle", "-tA", "-F", "\t", "-c", sql],
            capture_output=True, text=True, check=True, timeout=30,
        )
        return result.stdout


def seed_path_for(project: str) -> Path:
    return (
        REPO_ROOT
        / "apps/qw-oracle/scripts/extractors"
        / project
        / "seeds/help_json_classifications.yaml"
    )


def fetch_doc_only_entities(project: str) -> list[tuple[str, str]]:
    # Escape single quote in project name defensively (project values are
    # from a closed enum so this is belt-and-suspenders, not user input).
    safe_project = project.replace("'", "''")
    out = _run_psql(
        f"SELECT name, type FROM entities "
        f"WHERE project = '{safe_project}' AND source_state = 'doc_only' "
        f"ORDER BY type, name"
    )
    rows: list[tuple[str, str]] = []
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        rows.append((parts[0], parts[1]))
    return rows


def fetch_source_backed_names(project: str) -> set[str]:
    safe_project = project.replace("'", "''")
    out = _run_psql(
        f"SELECT name FROM entities "
        f"WHERE project = '{safe_project}' AND source_state = 'source_backed'"
    )
    return {line for line in out.splitlines() if line.strip()}


def load_existing_seed(project: str) -> dict[str, dict]:
    seed = seed_path_for(project)
    if not seed.exists():
        return {}
    return load_classifications(seed.read_text(encoding="utf-8"), project)


def write_seed(project: str, classifications_by_name: dict[str, dict]) -> Path:
    seed = seed_path_for(project)
    payload = {
        "project": project,
        "classifications": list(classifications_by_name.values()),
    }
    seed.parent.mkdir(parents=True, exist_ok=True)
    seed.write_text(
        yaml.safe_dump(payload, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    return seed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True, choices=sorted(PROJECT_REPOS.keys()),
                        help="Target project name.")
    parser.add_argument("--propose", action="store_true",
                        help="Print proposals to stdout (read-only).")
    parser.add_argument("--apply", action="store_true",
                        help="Persist proposals to YAML.")
    parser.add_argument("--confidence-threshold", choices=("high", "medium", "low"),
                        default="high",
                        help="Auto-accept only proposals at or above this confidence.")
    args = parser.parse_args()

    if not (args.propose or args.apply):
        parser.error("Pass --propose or --apply.")

    project = args.project
    repo = PROJECT_REPOS[project]
    if not repo.exists():
        print(f"Upstream repo not found at {repo}", file=sys.stderr)
        return 2

    doc_only = fetch_doc_only_entities(project)
    source_backed = fetch_source_backed_names(project)
    existing = load_existing_seed(project)

    unclassified = [(n, t) for (n, t) in doc_only if n not in existing]
    print(f"[{project}] doc_only entities: {len(doc_only)}", file=sys.stderr)
    print(f"[{project}] already classified: {len(existing)}", file=sys.stderr)
    print(f"[{project}] unclassified: {len(unclassified)}", file=sys.stderr)

    if not unclassified:
        print("No unclassified entries. Nothing to do.", file=sys.stderr)
        return 0

    doc_only_names = [n for (n, _t) in unclassified]
    print(
        f"Building blame index over union of {len(doc_only_names)} doc_only "
        f"+ {len(source_backed)} source-backed names...",
        file=sys.stderr,
    )
    blame = build_blame_index(repo, doc_only_names, source_backed)

    confidence_rank = {"high": 3, "medium": 2, "low": 1}
    threshold_rank = confidence_rank[args.confidence_threshold]
    today = date.today().isoformat()

    proposals: dict[str, dict] = {}
    for (name, etype) in unclassified:
        partial = classify_from_blame(name, blame, source_backed)
        proposal = {
            "name": name,
            "type": etype,
            "classification": partial["classification"],
            "confidence": partial["confidence"],
            "upstream_pr_action": _default_pr_action(partial["classification"]),
            "classified_at": today,
            **{k: v for k, v in partial.items()
               if k not in ("classification", "confidence")},
        }
        try:
            validate_entry(proposal)
        except Exception as e:
            print(f"WARN: proposal for {name!r} fails validation: {e}", file=sys.stderr)
            continue
        proposals[name] = proposal

    if args.propose:
        print(yaml.safe_dump(
            {"proposals": list(proposals.values())},
            sort_keys=False, allow_unicode=True,
        ))
        return 0

    accepted = {
        n: p for n, p in proposals.items()
        if confidence_rank[p["confidence"]] >= threshold_rank
    }
    rejected = {n: p for n, p in proposals.items() if n not in accepted}
    print(f"Auto-accepted at confidence>={args.confidence_threshold}: {len(accepted)}",
          file=sys.stderr)
    print(f"Below threshold (operator review needed): {len(rejected)}",
          file=sys.stderr)

    merged = {**existing, **accepted}
    out_path = write_seed(project, merged)
    print(f"Wrote {len(merged)} classifications to {out_path}", file=sys.stderr)
    return 0


def _default_pr_action(classification: str) -> str:
    """Default upstream_pr_action per classification."""
    return {
        Classification.RETIRED_PRE_WALK_FLOOR.value: "remove_from_help_json",
        Classification.RENAMED.value: "note_rename",
        Classification.NEVER_IMPLEMENTED.value: "remove_from_help_json",
        Classification.EXTRACTOR_GAP.value: "none",
        Classification.ASPIRATIONAL_DOCUMENTATION.value: "none",
        Classification.INTENTIONAL_TYPO_OR_ALIAS.value: "none",
    }.get(classification, "none")


if __name__ == "__main__":
    sys.exit(main())
