"""Help-JSON classification taxonomy + schema validation.

Closed taxonomy of six values for entries in a project's
seeds/help_json_classifications.yaml. Every entity that lands as
source_state='doc_only' must carry one of these classifications before
the extraction-review CLI's doc_only budget gate will pass.
"""
from __future__ import annotations

import re
from enum import Enum

import yaml


class Classification(str, Enum):
    RETIRED_PRE_WALK_FLOOR = "retired_pre_walk_floor"
    RENAMED = "renamed"
    NEVER_IMPLEMENTED = "never_implemented"
    EXTRACTOR_GAP = "extractor_gap"
    ASPIRATIONAL_DOCUMENTATION = "aspirational_documentation"
    INTENTIONAL_TYPO_OR_ALIAS = "intentional_typo_or_alias"


VALID_TYPES = {"cvar", "command", "cmdline_param", "macro"}
VALID_CONFIDENCE = {"high", "medium", "low"}
VALID_PR_ACTIONS = {
    "remove_from_help_json",
    "note_rename",
    "add_alias_entry",
    "none",
}

REQUIRED_PER_CLASSIFICATION: dict[Classification, set[str]] = {
    Classification.RETIRED_PRE_WALK_FLOOR: {
        "retired_at_commit",
        "retired_at_date",
        "last_source_file_pre_walk",
        # last_source_line_pre_walk is optional — blame may not preserve a line number.
    },
    Classification.RENAMED: {
        "rename_to",
        "rename_at_commit",
        "rename_at_date",
    },
    Classification.NEVER_IMPLEMENTED: {"evidence_note"},
    Classification.EXTRACTOR_GAP: {"gap_reason", "sidequest"},
    Classification.ASPIRATIONAL_DOCUMENTATION: {"evidence_note"},
    Classification.INTENTIONAL_TYPO_OR_ALIAS: {"kept_for_compat_with"},
}

# Pattern used to reject placeholder sidequest strings; a real sidequest
# reference is a non-empty string that does NOT begin with "(" (the
# parenthesized-instruction shape used by the auto-classifier as a
# placeholder marker the operator must replace).
_PLACEHOLDER_SIDEQUEST_RE = re.compile(r"^\s*\(")

COMMON_REQUIRED = {
    "name",
    "type",
    "classification",
    "confidence",
    "upstream_pr_action",
    "classified_at",
}


class ClassificationError(ValueError):
    """Raised when a classification entry fails schema validation."""


def validate_entry(entry: dict) -> None:
    """Raise ClassificationError on any schema violation; return None on success."""
    missing_common = COMMON_REQUIRED - set(entry.keys())
    if missing_common:
        raise ClassificationError(
            f"Entry missing required common fields: {sorted(missing_common)}"
        )
    if entry["type"] not in VALID_TYPES:
        raise ClassificationError(
            f"Invalid type {entry['type']!r}; must be one of {sorted(VALID_TYPES)}"
        )
    if entry["confidence"] not in VALID_CONFIDENCE:
        raise ClassificationError(
            f"Invalid confidence {entry['confidence']!r}; must be one of {sorted(VALID_CONFIDENCE)}"
        )
    if entry["upstream_pr_action"] not in VALID_PR_ACTIONS:
        raise ClassificationError(
            f"Invalid upstream_pr_action {entry['upstream_pr_action']!r}; "
            f"must be one of {sorted(VALID_PR_ACTIONS)}"
        )
    try:
        cls = Classification(entry["classification"])
    except ValueError:
        raise ClassificationError(
            f"Invalid classification {entry['classification']!r}; "
            f"must be one of {[c.value for c in Classification]}"
        )
    required_extra = REQUIRED_PER_CLASSIFICATION[cls]
    missing_extra = required_extra - set(entry.keys())
    if missing_extra:
        raise ClassificationError(
            f"Entry for {entry['name']!r} (classification={cls.value}) "
            f"missing required fields: {sorted(missing_extra)}"
        )
    if cls is Classification.EXTRACTOR_GAP:
        sidequest = entry.get("sidequest", "")
        if not isinstance(sidequest, str) or not sidequest.strip():
            raise ClassificationError(
                f"Entry for {entry['name']!r}: sidequest must be a non-empty string "
                f"referencing a HANDOVER sidequest"
            )
        if _PLACEHOLDER_SIDEQUEST_RE.match(sidequest):
            raise ClassificationError(
                f"Entry for {entry['name']!r}: sidequest is a placeholder "
                f"(starts with '('); replace with a real HANDOVER sidequest reference"
            )


def load_classifications(yaml_text: str, project: str) -> dict[str, dict]:
    """Parse a help_json_classifications.yaml string and return a dict keyed by entity name.

    Validates each entry on the way in. Raises ClassificationError on any failure
    (with the entity name in the message).
    """
    parsed = yaml.safe_load(yaml_text)
    if parsed is None:
        return {}
    if parsed.get("project") != project:
        raise ClassificationError(
            f"YAML project field is {parsed.get('project')!r}, expected {project!r}"
        )
    result: dict[str, dict] = {}
    for entry in parsed.get("classifications", []):
        validate_entry(entry)
        result[entry["name"]] = entry
    return result
