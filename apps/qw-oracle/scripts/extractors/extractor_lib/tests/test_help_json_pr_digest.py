from extractor_lib._help_json_pr_digest import render_digest


def test_renamed_entries_grouped_under_renames_section():
    classifications = [
        {
            "name": "-gl-debug",
            "type": "cmdline_param",
            "classification": "renamed",
            "rename_to": "-r-debug",
            "rename_at_commit": "0d7ea051",
            "rename_at_date": "2018-07-21",
            "upstream_pr_action": "note_rename",
            "confidence": "high",
            "classified_at": "2026-04-30",
        },
    ]
    md = render_digest("ezquake", classifications)
    assert "## Renamed entries" in md
    assert "`-gl-debug`" in md
    assert "`-r-debug`" in md
    assert "0d7ea051" in md


def test_never_implemented_grouped_under_aspirational_section():
    classifications = [
        {
            "name": "-nomouse",
            "type": "cmdline_param",
            "classification": "never_implemented",
            "evidence_note": "Existed only in a /* FIXME */ comment block; never compiled.",
            "upstream_pr_action": "remove_from_help_json",
            "confidence": "high",
            "classified_at": "2026-04-30",
        },
    ]
    md = render_digest("ezquake", classifications)
    assert "## Never-implemented entries" in md
    assert "`-nomouse`" in md
    assert "FIXME" in md


def test_extractor_gap_excluded_from_pr_digest():
    """extractor_gap is OUR problem to fix, not an upstream PR item."""
    classifications = [
        {
            "name": "-nopriority",
            "type": "cmdline_param",
            "classification": "extractor_gap",
            "gap_reason": "Windows SDK headers block parse",
            "sidequest": "Windows SDK stubs sidequest",
            "upstream_pr_action": "none",
            "confidence": "high",
            "classified_at": "2026-04-30",
        },
    ]
    md = render_digest("ezquake", classifications)
    assert "-nopriority" not in md  # gap entries are skipped
    assert "Renamed" not in md       # only the empty header structure
