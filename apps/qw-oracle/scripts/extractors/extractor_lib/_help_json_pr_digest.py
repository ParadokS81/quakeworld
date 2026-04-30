"""Render a markdown PR digest from help_json_classifications.yaml.

The output is a copy-paste-ready PR body for the upstream project, grouped by
classification and listing the evidence we collected. Operators of qw-oracle
review the digest, file it as an upstream PR, and continue.

Entries with upstream_pr_action='none' (extractor_gap, intentional_typo_or_alias,
aspirational_documentation if we decide to keep) are excluded -- those are
internal sidequests, not upstream contributions.

Also exposes collect_help_json_names: a recursive walker over a parsed
help-JSON file that returns the set of entity-name keys. Used by the CLI
build-help-json-pr-digest.py to filter out seed entries already removed
from HEAD help-JSON.
"""
from __future__ import annotations

from typing import Any, Iterable


def collect_help_json_names(node: Any, acc: set[str]) -> None:
    """Walk a parsed help-JSON document and accumulate entity-name keys.

    Help-JSON files key entries by name at any nesting depth (e.g.,
    {"groups": [...], "<name>": {<fields>}, ...}). Skip the literal
    'groups' key since that holds group metadata, not entity names.
    """
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, dict) and k != "groups":
                acc.add(k)
            collect_help_json_names(v, acc)
    elif isinstance(node, list):
        for item in node:
            collect_help_json_names(item, acc)


def render_digest(project: str, classifications: Iterable[dict]) -> str:
    by_kind: dict[str, list[dict]] = {
        "renamed": [],
        "retired": [],
        "never_implemented": [],
    }
    for c in classifications:
        if c.get("upstream_pr_action") == "none":
            continue
        kind = c["classification"]
        if kind == "renamed":
            by_kind["renamed"].append(c)
        elif kind == "retired_pre_walk_floor":
            by_kind["retired"].append(c)
        elif kind == "never_implemented":
            by_kind["never_implemented"].append(c)

    lines: list[str] = []
    lines.append(f"# {project}: Help-JSON cleanup proposal")
    lines.append("")
    lines.append(
        f"This is an auto-generated digest from qw-oracle's Layer 1 extraction "
        f"pipeline against the {project} source tree. Each entry below describes "
        f"a help-JSON entry whose underlying source has changed in a way the "
        f"help file hasn't reflected. The qw-oracle pipeline classifies these "
        f"automatically from git pickaxe analysis; this PR proposes the "
        f"corresponding help-file edits."
    )
    lines.append("")
    if by_kind["renamed"]:
        lines.append("## Renamed entries (suggest noting rename or removing)")
        lines.append("")
        for c in by_kind["renamed"]:
            lines.append(
                f"- `{c['name']}` was renamed to `{c['rename_to']}` "
                f"in commit {c['rename_at_commit']} ({c['rename_at_date']})."
            )
        lines.append("")
    if by_kind["retired"]:
        lines.append("## Retired entries (suggest removing)")
        lines.append("")
        for c in by_kind["retired"]:
            commit = c.get("retired_at_commit", "?")
            date = c.get("retired_at_date") or c.get("retired_at_version", "?")
            lines.append(
                f"- `{c['name']}` was removed in commit {commit} ({date})."
            )
        lines.append("")
    if by_kind["never_implemented"]:
        lines.append("## Never-implemented entries (suggest removing)")
        lines.append("")
        for c in by_kind["never_implemented"]:
            lines.append(
                f"- `{c['name']}` -- {c.get('evidence_note', '(no evidence note)')}"
            )
        lines.append("")
    return "\n".join(lines)
