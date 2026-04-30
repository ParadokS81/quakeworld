import pytest
from extractor_lib._help_json_blame import (
    BlameIndexEntry,
    build_alternation_regex,
    parse_git_log_stream,
    classify_from_blame,
)


def test_alternation_regex_escapes_special_chars():
    names = ["-gl-debug", "+foo", "name.with.dots"]
    regex = build_alternation_regex(names)
    assert "-gl-debug" in regex
    # The +/. should be regex-escaped so they match literally
    assert r"\+foo" in regex
    assert r"name\.with\.dots" in regex


def test_parse_git_log_stream_captures_co_occurrence():
    """When -X is removed and -Y is added in the same commit, both events
    must land under the correct SHA — proves the parser keeps commit context
    AND parses real-shape git output (--- a/, index, @@, context lines)."""
    raw = """===COMMIT===
0d7ea051f0a06784ef59f79fe7f8488df3bc08c9
2018-07-21

diff --git a/cmdline_params_ids.h b/cmdline_params_ids.h
index 605bb9c5..86ac533f 100644
--- a/cmdline_params_ids.h
+++ b/cmdline_params_ids.h
@@ -31,7 +31,7 @@ CMDLINE_DEF(client_video_displaynumber, "-display"),
 CMDLINE_DEF(client_video_conwidth, "-conwidth"),
 CMDLINE_DEF(client_video_conheight, "-conheight"),
 CMDLINE_DEF(client_video_glsl_renderer, "-glsl-renderer"),
-CMDLINE_DEF(client_video_gl_debug, "-gl-debug"),
+CMDLINE_DEF(client_video_r_debug, "-r-debug"),
 CMDLINE_DEF(client_nostdinput, "-noconinput"),
"""
    entries = parse_git_log_stream(raw, names={"-gl-debug", "-r-debug"})
    # Both names appear in the same commit — that's a co-occurrence (rename signal)
    assert "-gl-debug" in entries
    assert "-r-debug" in entries
    assert entries["-gl-debug"][0]["commit"] == "0d7ea051f0a06784ef59f79fe7f8488df3bc08c9"
    assert entries["-gl-debug"][0]["event"] == "removal"
    assert entries["-r-debug"][0]["event"] == "addition"
    assert entries["-gl-debug"][0]["commit"] == entries["-r-debug"][0]["commit"]
    # File path comes from the +++ b/PATH header, not from any context line.
    assert entries["-gl-debug"][0]["file"] == "cmdline_params_ids.h"


def test_parse_git_log_stream_attributes_whole_file_deletion_to_deleted_path():
    """When git deletes a whole file, the diff has `+++ /dev/null` (no b/PATH).
    The parser must fall back to the `--- a/PATH` pre-image so removal events
    are attributed to the deleted file, not to whatever +++ path was last seen."""
    raw = """===COMMIT===
deadbeefdeadbeefdeadbeefdeadbeefdeadbeef
2010-05-01

diff --git a/legacy.c b/legacy.c
deleted file mode 100644
index abc123..00000000
--- a/legacy.c
+++ /dev/null
@@ -1,3 +0,0 @@
-static cvar_t old_feature = {"old_feature", "0"};
"""
    entries = parse_git_log_stream(raw, names={"old_feature"})
    assert entries["old_feature"][0]["event"] == "removal"
    assert entries["old_feature"][0]["file"] == "legacy.c"


def test_parse_git_log_stream_ignores_unknown_names():
    """Names not in the requested set are silently dropped (filter at parse time
    so the caller controls scope)."""
    raw = """===COMMIT===
abc123
2020-01-01

+CMDLINE_DEF(foo, "-not-tracked"),
"""
    entries = parse_git_log_stream(raw, names={"-tracked"})
    assert entries == {"-tracked": []}


def test_classify_from_blame_renamed_via_co_occurrence():
    """When -X is removed and -Y (source-backed) is added in the same commit
    AND the names share enough string structure to plausibly be the same
    identifier, suggest rename. Critical: the source-backed sibling MUST be
    present in the blame map -- caller is responsible for including
    source-backed names in the regex/parse pass."""
    blame = {
        "-gl-debug": [
            {"commit": "abc123", "date": "2018-07-21", "event": "removal",
             "file": "cmdline_params_ids.h", "context_line": "-..."}
        ],
        "-r-debug": [
            {"commit": "abc123", "date": "2018-07-21", "event": "addition",
             "file": "cmdline_params_ids.h", "context_line": "+..."}
        ],
    }
    source_backed_names = {"-r-debug"}  # currently in source
    proposal = classify_from_blame("-gl-debug", blame, source_backed_names)
    assert proposal["classification"] == "renamed"
    assert proposal["rename_to"] == "-r-debug"
    assert proposal["rename_at_commit"] == "abc123"
    assert proposal["confidence"] == "high"
    assert proposal["rename_similarity"] >= 0.65


def test_classify_from_blame_finds_rename_when_co_occurrence_predates_later_removal():
    """A doc_only name renamed in commit A may still appear in a later removal
    commit B (stale reference, partial revert). The classifier MUST scan all
    removals for co-occurrence, not just the latest one. Sibling here is
    chosen with high string similarity so the rename plausibility gate passes."""
    blame = {
        "-gl-old-feature": [
            {"commit": "commitA", "date": "2018-01-01", "event": "removal",
             "file": "params.h", "context_line": "-..."},
            {"commit": "commitB", "date": "2020-06-15", "event": "removal",
             "file": "comments.txt", "context_line": "-..."},
        ],
        "-r-old-feature": [
            {"commit": "commitA", "date": "2018-01-01", "event": "addition",
             "file": "params.h", "context_line": "+..."},
        ],
    }
    source_backed_names = {"-r-old-feature"}
    proposal = classify_from_blame("-gl-old-feature", blame, source_backed_names)
    assert proposal["classification"] == "renamed"
    assert proposal["rename_to"] == "-r-old-feature"
    assert proposal["rename_at_commit"] == "commitA"


def test_classify_from_blame_skips_self_relocation_commit():
    """When `name` has BOTH an addition and a removal in the same commit, the
    name was MOVED between files (refactor), not retired. A high-similarity
    sibling that also changed in that commit must NOT be reported as a rename
    target. Models the real ezQuake commit 063881ab where -nomouse was
    relocated and vid_modelist was unrelatedly edited in the same refactor."""
    blame = {
        "-nomouse": [
            {"commit": "refactor1", "date": "2007-01-07", "event": "removal",
             "file": "vid_x11.c", "context_line": "-..."},
            {"commit": "refactor1", "date": "2007-01-07", "event": "addition",
             "file": "in_linux.c", "context_line": "+..."},
        ],
        "-nomouse-prime": [  # high similarity, would otherwise match
            {"commit": "refactor1", "date": "2007-01-07", "event": "addition",
             "file": "in_linux.c", "context_line": "+..."},
        ],
    }
    source_backed_names = {"-nomouse-prime"}
    proposal = classify_from_blame("-nomouse", blame, source_backed_names)
    assert proposal["classification"] != "renamed"


def test_classify_from_blame_filters_low_similarity_sibling():
    """A doc_only removal that co-occurs with a structurally-unrelated source-backed
    addition is NOT a rename -- bulk-cleanup commits frequently retire many
    unrelated names alongside an unrelated new feature. The similarity gate
    must reject low-ratio candidates and fall through to retired_pre_walk_floor.
    Models the real ezQuake commit 0e4e0eab where 24 *_browser_* cvars were
    bulk-retired alongside file_browser_sort_mode (pure-nonsense pairs like
    auth_validate -> echo were a worse instance of the same pattern)."""
    blame = {
        "auth_validate": [
            {"commit": "bulk1", "date": "2009-04-12", "event": "removal",
             "file": "auth.c", "context_line": "-..."},
        ],
        "echo": [
            {"commit": "bulk1", "date": "2009-04-12", "event": "addition",
             "file": "console.c", "context_line": "+..."},
        ],
    }
    source_backed_names = {"echo"}
    proposal = classify_from_blame("auth_validate", blame, source_backed_names)
    assert proposal["classification"] == "retired_pre_walk_floor"
    assert proposal["retired_at_commit"] == "bulk1"


def test_classify_from_blame_marks_borderline_similarity_as_medium_confidence():
    """A co-occurring sibling with similarity in the LOW..HIGH band lands as
    `renamed` but at medium confidence -- the operator gates auto-acceptance
    behind --confidence-threshold high so borderline candidates surface for
    hand review."""
    blame = {
        "loadfont": [
            {"commit": "swap1", "date": "2012-08-03", "event": "removal",
             "file": "console.c", "context_line": "-..."},
        ],
        "fontload": [
            {"commit": "swap1", "date": "2012-08-03", "event": "addition",
             "file": "console.c", "context_line": "+..."},
        ],
    }
    source_backed_names = {"fontload"}
    proposal = classify_from_blame("loadfont", blame, source_backed_names)
    assert proposal["classification"] == "renamed"
    assert proposal["rename_to"] == "fontload"
    assert proposal["confidence"] == "medium"
    assert proposal["rename_similarity"] >= 0.40
    assert proposal["rename_similarity"] < 0.65


def test_classify_from_blame_never_implemented():
    """No git history at all = never implemented."""
    blame = {"-nomouse": []}
    source_backed_names = set()
    proposal = classify_from_blame("-nomouse", blame, source_backed_names)
    assert proposal["classification"] == "never_implemented"
    assert proposal["confidence"] == "high"


def test_classify_from_blame_retired_pre_walk_floor():
    """String existed historically but has no co-occurring rename target."""
    blame = {
        "-old-feature": [
            {"commit": "deadbeef", "date": "2010-05-01", "event": "removal",
             "file": "old.c", "context_line": "-..."}
        ]
    }
    source_backed_names: set[str] = set()
    proposal = classify_from_blame("-old-feature", blame, source_backed_names)
    assert proposal["classification"] == "retired_pre_walk_floor"
    assert proposal["retired_at_commit"] == "deadbeef"
    assert proposal["retired_at_date"] == "2010-05-01"


def test_classify_from_blame_does_not_propose_extractor_gap():
    """extractor_gap is operator-manual-only; the auto-classifier does NOT
    propose it, because the placeholder sidequest field would fail validation
    and the gap_reason can't be derived from blame alone. Operator must
    hand-edit the YAML."""
    blame = {
        "-mystery": [
            {"commit": "feed1234", "date": "2015-06-15", "event": "addition",
             "file": "client.c", "context_line": "+..."}
        ]
    }
    # name is not source-backed (not in current source per extractor)
    source_backed_names: set[str] = set()
    proposal = classify_from_blame("-mystery", blame, source_backed_names)
    assert proposal["classification"] != "extractor_gap"
    # Falls through to aspirational_documentation — operator can re-classify.
    assert proposal["classification"] == "aspirational_documentation"
