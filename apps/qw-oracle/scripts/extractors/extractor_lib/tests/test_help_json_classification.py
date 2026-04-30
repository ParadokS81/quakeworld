import pytest
from extractor_lib._help_json_classification import (
    Classification,
    validate_entry,
    load_classifications,
    ClassificationError,
)


def test_valid_renamed_entry():
    entry = {
        "name": "-gl-debug",
        "type": "cmdline_param",
        "classification": "renamed",
        "confidence": "high",
        "upstream_pr_action": "remove_from_help_json",
        "classified_at": "2026-04-30",
        "rename_to": "-r-debug",
        "rename_at_commit": "0d7ea051",
        "rename_at_date": "2018-07-21",
    }
    assert validate_entry(entry) is None  # no errors


def test_renamed_missing_required_rename_to_field():
    entry = {
        "name": "-gl-debug",
        "type": "cmdline_param",
        "classification": "renamed",
        "confidence": "high",
        "upstream_pr_action": "remove_from_help_json",
        "classified_at": "2026-04-30",
        # rename_to MISSING
    }
    with pytest.raises(ClassificationError, match="rename_to"):
        validate_entry(entry)


def test_invalid_classification_value():
    entry = {
        "name": "-foo",
        "type": "cmdline_param",
        "classification": "made_up_kind",
        "confidence": "high",
        "upstream_pr_action": "none",
        "classified_at": "2026-04-30",
    }
    with pytest.raises(ClassificationError, match="classification"):
        validate_entry(entry)


def test_load_classifications_returns_dict_keyed_by_name():
    yaml_text = """
project: ezquake
classifications:
  - name: "-gl-debug"
    type: cmdline_param
    classification: renamed
    confidence: high
    upstream_pr_action: remove_from_help_json
    classified_at: "2026-04-30"
    rename_to: "-r-debug"
    rename_at_commit: "0d7ea051"
    rename_at_date: "2018-07-21"
"""
    result = load_classifications(yaml_text, project="ezquake")
    assert "-gl-debug" in result
    assert result["-gl-debug"]["classification"] == "renamed"


def test_classification_enum_closed_set():
    assert Classification.RENAMED.value == "renamed"
    assert Classification.NEVER_IMPLEMENTED.value == "never_implemented"
    assert len(list(Classification)) == 6


def test_extractor_gap_rejects_placeholder_sidequest():
    """extractor_gap proposals with placeholder sidequest text must fail validation."""
    entry = {
        "name": "-foo",
        "type": "cmdline_param",
        "classification": "extractor_gap",
        "confidence": "medium",
        "upstream_pr_action": "none",
        "classified_at": "2026-04-30",
        "gap_reason": "Test reason",
        "sidequest": "(operator should attach a HANDOVER sidequest)",  # placeholder
    }
    with pytest.raises(ClassificationError, match="sidequest"):
        validate_entry(entry)


def test_extractor_gap_accepts_real_sidequest_reference():
    entry = {
        "name": "-foo",
        "type": "cmdline_param",
        "classification": "extractor_gap",
        "confidence": "medium",
        "upstream_pr_action": "none",
        "classified_at": "2026-04-30",
        "gap_reason": "Test reason",
        "sidequest": "Windows SDK stubs",  # references a real HANDOVER sidequest title
    }
    assert validate_entry(entry) is None
