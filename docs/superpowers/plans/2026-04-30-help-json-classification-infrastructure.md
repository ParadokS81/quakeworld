# Help-JSON Classification Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 194-entry ezQuake `doc_only` mystery heap into a triaged, classified, durable knowledge artifact that auto-generates upstream cleanup PR drafts and prevents the same detective work on future tag bumps.

**Architecture:** Three-layer system. (1) Per-project YAML seed file at `<project>/seeds/help_json_classifications.yaml` records each `doc_only` entity's durable classification + evidence (the cache). (2) Python `_help_json_blame.py` module builds a git-pickaxe index in one pass — single `git log -p` walked line-by-line by a Python state machine, alternation regex over the union of doc_only names AND same-type source-backed names so co-occurring rename additions are captured. (3) TypeScript review-module `findings-help-json-classifications.ts` plugs into the existing extraction-review CLI to surface unclassified mysteries as findings; the doc_only budget gate fails the review CLI's exit code when mysteries lack classifications and `--fail-on help-json-classification` is set.

A markdown PR-digest generator reads the seed YAML and emits `docs/upstream-prs/<project>-help-json-cleanup.md` ready for upstream contribution.

**Tech Stack:** Python 3 + libclang 18 (existing extractors), pure-Python regex + subprocess for the blame index builder (no ripgrep), TypeScript + Bun + better-sqlite3 11 (existing review CLI), js-yaml (existing seed loader).

---

## File Structure

**New Python modules (extractor_lib):**
- `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py` — closed taxonomy enum, schema validator
- `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_blame.py` — single-pass blame index builder + lookup
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_classification.py`
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_blame.py`

**New CLI (Python, shared across projects):**
- `apps/qw-oracle/scripts/classify-help-json.py` — `--project <name>` flag; reads upstream repo path from a per-project lookup table; proposes classifications for unclassified entries, writes/updates the relevant seed YAML

**New seed file (per-project, ezQuake first):**
- `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml`

(No on-disk blame cache. The pickaxe pass runs ~5-10s in pure Python over `git log -p`; rebuild on each invocation. `classify-help-json.py` runs a few times per arc, not per review, so caching adds complexity for negligible benefit.)

**New TypeScript review module:**
- `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts`
- `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts`

**Modified TypeScript:**
- `apps/qw-oracle/scripts/load-knowledge/review/index.ts` — register new findings module + extend the `counts` initializer with `'help-json-classification': 0`
- `apps/qw-oracle/scripts/load-knowledge/review/types.ts` — add `'help-json-classification'` to the `Bucket` union AND to the `ReviewCounts` interface
- The CLI wrapper that calls `runReview` (in `apps/qw-oracle/scripts/load-knowledge/index.ts` or wherever `runReview` is invoked) — add a `--fail-on <bucket>` flag that returns non-zero exit when the named bucket has any findings

**New Python script (PR digest generator):**
- `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_pr_digest.py`
- `apps/qw-oracle/scripts/build-help-json-pr-digest.py` — CLI entry point, reads YAML, writes markdown

**New generated docs (per-project):**
- `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-cleanup.md` (initially)

**Documentation updates:**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` — new section on help-JSON classification workflow
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` — doc_only budget gate added to review-time checks

---

## Closed Classification Taxonomy

Locked from brainstorm + 2026-04-30 review revision. **Six values** (was seven; `retired_during_walk` dropped — by SCHEMA definition `source_state='doc_only'` and `source_state='source_retired'` are mutually exclusive, so the original seventh value was unreachable for this plan's targeted entity set. If a future arc expands scope to cover `source_retired` entities, re-introduce that classification then). All required to validate against the schema:

| Classification | Required fields | Source of evidence |
|---|---|---|
| `retired_pre_walk_floor` | `retired_at_commit`, `retired_at_date`, `last_source_file_pre_walk`, `last_source_line_pre_walk` (optional — None when blame can't recover it) | git log -S finds string-removal commit before walk floor (3.0 for ezQuake) |
| `renamed` | `rename_to` (must be a source-backed entity name in same project), `rename_at_commit`, `rename_at_date`, `rename_similarity` (0.0-1.0 string similarity to the `rename_to` candidate) | Co-occurrence of remove + add in same commit AND near-string match. See "Co-occurrence guards" below for the rename plausibility filters added 2026-04-30 after the first smoke run produced 120/193 false-positive renames. |
| `never_implemented` | `evidence_note` (free text describing absence) | git log -S returns no hits, OR hits only inside comment blocks |
| `extractor_gap` | `gap_reason`, `sidequest` (must match HANDOVER reference pattern) | string IS in current source HEAD; extractor missed it |
| `aspirational_documentation` | `evidence_note` | help-JSON describes intended/planned feature with no code anywhere |
| `intentional_typo_or_alias` | `kept_for_compat_with` (a source-backed name) | help-JSON spelling differs from source by typo or back-compat |

**Operator-manual-only kinds:** `intentional_typo_or_alias` and `extractor_gap` are never auto-proposed by the classifier. The classifier suggests up to four kinds: `never_implemented`, `renamed`, `retired_pre_walk_floor`, `aspirational_documentation`. The other two require operator review and hand-edits to the YAML.

**Co-occurrence guards (added 2026-04-30 post-smoke):** the original co-occurrence-only `renamed` heuristic produced ~120/193 false-positive proposals on the first ezQuake smoke run, dominated by two failure modes — (a) code-relocation refactors where a name was moved between files (both add+remove in the same commit) read as a rename to whatever else changed in that commit, and (b) bulk-cleanup commits that retired many unrelated cvars alongside one new feature, producing N-to-1 maps onto the new feature. The `classify_from_blame` decision tree now applies two filters before proposing `renamed`:

1. **Self-relocation skip:** if `name` itself has BOTH a removal AND an addition in the candidate commit, treat the removal as a relocation (not a retirement) and skip co-occurrence matching for that commit.
2. **String-similarity gate:** require `difflib.SequenceMatcher(None, name, sibling).ratio() >= 0.40`. Confidence ladder: `>= 0.65` → `high`; `0.40 .. < 0.65` → `medium`; below 0.40 → not a rename, fall through to `retired_pre_walk_floor`. The `rename_similarity` field is persisted in the YAML so operators can see the score that drove each proposal.

These thresholds were calibrated against ezQuake's full blame run: real renames like `-gl-debug` → `-r-debug` (0.82) and `loadfont` → `fontload` (0.50) sit above the LOW gate; pure-nonsense pairs like `auth_validate` → `echo` (0.12), `menu_fps` → `+back` (0.0), and `cl_warncmd` → `sv_progtype` (0.19) sit well below. Plausibly-real cases that are still ambiguous (browser cvar unification: `skin_browser_sort_mode` → `file_browser_sort_mode` at 0.86) land at high or medium confidence and the `--confidence-threshold high` auto-accept gate is the operator's coarse first cut; medium-confidence proposals require hand review.

Common required fields on every entry:
- `name` (entity name as it appears in help-JSON)
- `type` (one of `cvar`, `command`, `cmdline_param`, `macro`)
- `classification` (one of the six above)
- `confidence` (`high` / `medium` / `low`)
- `upstream_pr_action` (`remove_from_help_json` / `note_rename` / `add_alias_entry` / `none`)
- `classified_at` (ISO date, when operator confirmed)

---

### Task 1: YAML schema + validator (Python)

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py`
- Test: `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_classification.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_help_json_classification.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_classification.py -v`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the module**

```python
# apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py
"""Help-JSON classification taxonomy + schema validation.

Closed taxonomy of six values for entries in a project's
seeds/help_json_classifications.yaml. Every entity that lands as
source_state='doc_only' must carry one of these classifications before
the extraction-review CLI's doc_only budget gate will pass.
"""
from __future__ import annotations

import re
from enum import Enum
from typing import Optional

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_classification.py -v`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_classification.py
git commit -m "feat(qw-oracle): help-JSON classification schema + validator"
```

---

### Task 2: Single-pass git-blame index builder (Python)

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_blame.py`
- Test: `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_blame.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_help_json_blame.py
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
    """When -X is removed and -Y (source-backed) is added in the same commit,
    suggest rename. Critical: the source-backed sibling MUST be present in the
    blame map — caller is responsible for including source-backed names in the
    regex/parse pass."""
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_blame.py -v`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the module**

```python
# apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_blame.py
"""Single-pass git-pickaxe index for help-JSON classification.

Strategy: one `git log --all -p --no-merges` pass against the upstream repo.
The full stream is consumed by a Python state-machine parser (NO ripgrep
pre-filter — ripgrep would discard the ===COMMIT===/SHA/date sentinel lines
because they don't match the alternation regex, leaving the parser unable
to attribute events to commits).

The alternation regex is built over the UNION of:
  (a) the doc_only names we want to classify, AND
  (b) all source-backed names of the same entity types in the same project.

Including (b) is required for renamed-via-co-occurrence detection: if
`-gl-debug` (doc_only) was renamed to `-r-debug` (source-backed) in commit X,
we need to capture the ADDITION of `-r-debug` in that commit so the
classifier sees the co-occurrence.

For ezQuake (~5k entity names total), the regex pattern stays well under
size limits; the in-Python regex pass over `git log -p` output completes
in ~5-15 seconds.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Iterable, TypedDict


class BlameIndexEntry(TypedDict):
    commit: str
    date: str          # ISO date
    event: str         # "addition" | "removal"
    file: str | None   # path of the modified file
    context_line: str  # the +/- line itself


def build_alternation_regex(names: Iterable[str]) -> str:
    """Return a regex that matches `"<name>"` for any name in the input.

    Escapes regex metacharacters per name. Wraps each name in literal double
    quotes so we match string-literal sites only (not bare identifiers).
    """
    escaped = [re.escape(n) for n in names]
    # Sort by length desc so longest-prefix wins under regex alternation.
    escaped.sort(key=len, reverse=True)
    return r'"(' + "|".join(escaped) + r')"'


def run_git_log(repo_path: Path) -> str:
    """Run `git log --first-parent -p --no-merges` and return the full stream.

    Uses `--first-parent` (not `--all`) so retired_at_commit values always
    point at commits reachable from the upstream's main history. Walking
    `--all` would pick up orphan/feature-branch removal events, producing
    seed entries whose `retired_at_commit` SHA upstream PR reviewers can't
    `git show` from main.

    Returns the raw concatenated output. Caller pipes this into
    parse_git_log_stream. NOTE: returns text, not a streaming iterator;
    the full stream is buffered. For an ezQuake-sized repo `git log -p`
    produces ~150-200 MB / ~8s of git I/O, plus ~15-30s of Python regex
    over ~3-5M lines once the alternation covers the doc_only ∪ source_backed
    union. Well within memory + time budget for a CLI invoked a few times
    per arc.
    """
    git_cmd = [
        "git",
        "-C", str(repo_path),
        "log",
        "--first-parent",
        "-p",
        "--no-merges",
        "--pretty=format:===COMMIT===%n%H%n%ad%n",
        "--date=short",
    ]
    result = subprocess.run(git_cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"git log failed: {result.stderr}")
    return result.stdout


def parse_git_log_stream(raw: str, names: set[str]) -> dict[str, list[BlameIndexEntry]]:
    """Parse the full `git log -p` stream into per-name event lists.

    Each line in `raw` is either:
      - a commit boundary line (===COMMIT===)
      - a SHA / date line following the boundary
      - a `+++ b/<path>` file header
      - a diff line (+/- prefix, content)
      - other (hunk headers, context, etc.)

    For each diff line containing one of `names` (as a quoted string literal),
    record an addition or removal event under that name. Names not in `names`
    are silently dropped (caller controls scope).

    Returns dict keyed by name; values are chronologically-sorted event lists.
    Names with no events still appear (with empty list) so callers can tell
    "definitely not seen" apart from "not in input set."
    """
    by_name: dict[str, list[BlameIndexEntry]] = {n: [] for n in names}
    cur_commit: str | None = None
    cur_date: str | None = None
    cur_file: str | None = None
    pending_pre_image: str | None = None  # `--- a/<path>` waiting for its `+++` partner

    string_re = re.compile(r'"([^"]+)"')
    file_a_re = re.compile(r"^--- a/(.+)$")    # pre-image (--- a/PATH)
    file_b_re = re.compile(r"^\+\+\+ b/(.+)$")  # post-image (+++ b/PATH)

    state = "scan"  # "scan" | "after_commit_marker" | "after_sha"
    for line in raw.splitlines():
        if line == "===COMMIT===":
            state = "after_commit_marker"
            continue
        if state == "after_commit_marker":
            cur_commit = line.strip()
            state = "after_sha"
            continue
        if state == "after_sha":
            cur_date = line.strip()
            state = "scan"
            continue
        # File-header detection. Order matters: `--- a/...` and `+++ b/...`
        # both start with the +/- diff prefix, so they MUST be matched as
        # file headers before falling through to the diff-line branch.
        # Whole-file deletions emit `+++ /dev/null`, which doesn't match
        # file_b_re — fall back to the pending pre-image path so removal
        # events get attributed to the deleted file, not whatever +++
        # path was last seen.
        m_a = file_a_re.match(line)
        if m_a:
            pending_pre_image = m_a.group(1)
            continue
        m_b = file_b_re.match(line)
        if m_b:
            cur_file = m_b.group(1)
            pending_pre_image = None
            continue
        if line == "+++ /dev/null":
            cur_file = pending_pre_image  # whole-file deletion
            pending_pre_image = None
            continue
        # `--- /dev/null` is a file-add; the partnering `+++ b/<path>` will
        # set cur_file on the next iteration. Just clear pending and skip.
        if line == "--- /dev/null":
            pending_pre_image = None
            continue
        if not (line.startswith("+") or line.startswith("-")):
            continue
        # Defensive: any remaining `+++`/`---` prefix is a header we don't
        # recognize (shouldn't happen after the branches above, but cheap).
        if line.startswith("+++") or line.startswith("---"):
            continue
        event = "addition" if line.startswith("+") else "removal"
        for matched_name in string_re.findall(line):
            if matched_name not in names:
                continue
            if cur_commit is None or cur_date is None:
                continue
            by_name[matched_name].append(
                BlameIndexEntry(
                    commit=cur_commit,
                    date=cur_date,
                    event=event,
                    file=cur_file,
                    context_line=line.rstrip(),
                )
            )
    # Sort each name's events by date ascending
    for name in by_name:
        by_name[name].sort(key=lambda e: e["date"])
    return by_name


def build_blame_index(
    repo_path: Path,
    doc_only_names: Iterable[str],
    source_backed_names: Iterable[str],
) -> dict[str, list[BlameIndexEntry]]:
    """Convenience: run `git log -p` and parse into a blame index.

    The regex covers BOTH doc_only and source_backed names so co-occurring
    rename additions are captured. Returns a map keyed by every requested
    name (doc_only ∪ source_backed); doc_only names with no events present
    as empty lists.
    """
    name_set = set(doc_only_names) | set(source_backed_names)
    raw = run_git_log(repo_path)
    return parse_git_log_stream(raw, name_set)


def classify_from_blame(
    name: str,
    blame: dict[str, list[BlameIndexEntry]],
    source_backed_names: set[str],
) -> dict:
    """Propose a classification for `name` based on its blame history.

    Returns a partial classification dict. Caller fills in classified_at,
    upstream_pr_action, etc. before persisting to YAML.

    Decision tree (auto-proposable kinds only — extractor_gap and
    intentional_typo_or_alias are operator-manual-only and never returned
    here):
      1. No events ever → never_implemented (high confidence)
      2. Co-occurring removal of `name` + addition of a source-backed sibling
         in the same commit → renamed (high confidence)
      3. Has removal events but no co-occurring rename target → retired_pre_walk_floor
      4. Has only addition events (or events without a clear retirement
         signal) → aspirational_documentation (low confidence; operator
         re-classifies as extractor_gap by hand if the string is in current
         source)
    """
    events = blame.get(name, [])
    if not events:
        return {
            "classification": "never_implemented",
            "confidence": "high",
            "evidence_note": (
                "git log -S finds no occurrence of this string in any commit."
            ),
        }
    removals = [e for e in events if e["event"] == "removal"]
    if removals:
        last_removal = removals[-1]
        co_commit = last_removal["commit"]
        for sibling, sibling_events in blame.items():
            if sibling == name or sibling not in source_backed_names:
                continue
            for se in sibling_events:
                if se["event"] == "addition" and se["commit"] == co_commit:
                    return {
                        "classification": "renamed",
                        "confidence": "high",
                        "rename_to": sibling,
                        "rename_at_commit": co_commit,
                        "rename_at_date": last_removal["date"],
                    }
        return {
            "classification": "retired_pre_walk_floor",
            "confidence": "high",
            "retired_at_commit": last_removal["commit"],
            "retired_at_date": last_removal["date"],
            "last_source_file_pre_walk": last_removal.get("file"),
            # last_source_line_pre_walk is intentionally omitted — diff blame
            # doesn't preserve line numbers cleanly; the schema treats this
            # field as optional.
        }
    # Additions only, or other shapes — operator review needed.
    return {
        "classification": "aspirational_documentation",
        "confidence": "low",
        "evidence_note": (
            "Blame events present but no clear rename or retirement signal. "
            "If string IS in current HEAD source, operator should re-classify "
            "as extractor_gap with a HANDOVER sidequest reference."
        ),
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_blame.py -v`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_blame.py apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_blame.py
git commit -m "feat(qw-oracle): single-pass git-pickaxe blame index for help-JSON classification"
```

#### Post-smoke amendment (2026-04-30)

Step 1's `classify_from_blame` shipped initially with the naive co-occurrence-only rename heuristic. The Task 3 smoke run on the live ezQuake-source clone produced 120/193 false-positive `renamed` proposals at high confidence (e.g. `-nomouse → vid_modelist`, `auth_validate → echo`, 24× `cfg/skin/demo_browser_*` → `file_browser_sort_mode`). Two filters were added in a follow-up commit; the current `classify_from_blame` decision tree is:

```python
events = blame.get(name, [])
if not events:
    return never_implemented_high_confidence
removals = [e for e in events if e["event"] == "removal"]
additions = [e for e in events if e["event"] == "addition"]
self_relocation_commits = {a["commit"] for a in additions}
if removals:
    for removal in removals:
        co_commit = removal["commit"]
        # Filter 1: skip relocations -- name re-appeared in this commit, so
        # the removal is half of a code-move, not a retirement.
        if co_commit in self_relocation_commits:
            continue
        # Filter 2: pick the highest-similarity sibling addition, gate on
        # SequenceMatcher.ratio() >= RENAME_SIMILARITY_LOW (0.40); confidence
        # high if >= RENAME_SIMILARITY_HIGH (0.65), else medium.
        best_sibling, best_ratio = pick_best_sibling(blame, source_backed_names, co_commit)
        if best_sibling is not None and best_ratio >= RENAME_SIMILARITY_LOW:
            return {
                "classification": "renamed",
                "confidence": "high" if best_ratio >= RENAME_SIMILARITY_HIGH else "medium",
                "rename_to": best_sibling,
                "rename_at_commit": co_commit,
                "rename_at_date": removal["date"],
                "rename_similarity": round(best_ratio, 3),
            }
    return retired_pre_walk_floor (using removals[-1])
return aspirational_documentation
```

Calibration evidence (SequenceMatcher.ratio between doc_only name and source-backed candidate):

| Pair | Ratio | Verdict |
|---|---|---|
| `-gl-debug` ↔ `-r-debug` | 0.82 | high — real rename |
| `skin_browser_sort_mode` ↔ `file_browser_sort_mode` | 0.86 | high — plausible unification |
| `cfg_browser_dir_color` ↔ `file_browser_dir_color` | 0.88 | high — plausible unification |
| `loadfont` ↔ `fontload` | 0.50 | medium — operator review |
| `-nomouse` ↔ `vid_modelist` | 0.30 | filtered (relocation also skipped) |
| `cl_warncmd` ↔ `sv_progtype` | 0.19 | filtered |
| `auth_validate` ↔ `echo` | 0.12 | filtered |
| `menu_fps` ↔ `+back` | 0.00 | filtered |

Three regression tests added to `test_help_json_blame.py`: `test_classify_from_blame_skips_self_relocation_commit`, `test_classify_from_blame_filters_low_similarity_sibling`, `test_classify_from_blame_marks_borderline_similarity_as_medium_confidence`. The original `test_classify_from_blame_finds_rename_when_co_occurrence_predates_later_removal` was updated to use a high-similarity name pair so its co-occurrence assertion stays exercised.

---

### Task 3: classify-help-json CLI (Python, shared across projects)

**Files:**
- Create: `apps/qw-oracle/scripts/classify-help-json.py`

- [ ] **Step 1: Write the CLI**

```python
#!/usr/bin/env python3
"""classify-help-json — propose classifications for doc_only entries.

Cross-project CLI. Pass `--project ezquake` (or `fte`, `qwcl`, `mvdsv`) to
target a specific upstream codebase. Each project has a hardcoded upstream
repo path in PROJECT_REPOS below; new projects get a one-line addition there.

Reads:
  - knowledge.db: list of project=<project> source_state='doc_only' entities
  - apps/qw-oracle/scripts/extractors/<project>/seeds/help_json_classifications.yaml
    (existing classifications; entries here are skipped — already classified)
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
import sqlite3
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


DB_PATH = REPO_ROOT / "apps/qw-oracle/data/knowledge.db"

# Per-project upstream repo paths. Currently single-entry: only ezQuake
# ships a help_*.json file (verified 2026-04-30: research/repos/ezquake-source
# and research/repos/unezquake; FTE/QWCL/MVDSV have no help-JSON files in
# their source trees, so their `entities` rows never land as `doc_only`).
# This shape is structured to support future onboarding if any project gains
# a help-JSON convention; until then, no other entries belong here.
PROJECT_REPOS: dict[str, Path] = {
    "ezquake": REPO_ROOT / "research/repos/ezquake-source",
}


def seed_path_for(project: str) -> Path:
    return (
        REPO_ROOT
        / "apps/qw-oracle/scripts/extractors"
        / project
        / "seeds/help_json_classifications.yaml"
    )


def fetch_doc_only_entities(db: sqlite3.Connection, project: str) -> list[tuple[str, str]]:
    rows = db.execute(
        """
        SELECT name, type FROM entities
        WHERE project = ? AND source_state = 'doc_only'
        ORDER BY type, name
        """,
        (project,),
    ).fetchall()
    return [(r[0], r[1]) for r in rows]


def fetch_source_backed_names(db: sqlite3.Connection, project: str) -> set[str]:
    rows = db.execute(
        """
        SELECT name FROM entities
        WHERE project = ? AND source_state = 'source_backed'
        """,
        (project,),
    ).fetchall()
    return {r[0] for r in rows}


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

    db = sqlite3.connect(DB_PATH)
    doc_only = fetch_doc_only_entities(db, project)
    source_backed = fetch_source_backed_names(db, project)
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
```

- [ ] **Step 2: Smoke-test the CLI in propose mode**

Run: `cd apps/qw-oracle && python scripts/classify-help-json.py --project ezquake --propose 2>&1 | head -50`
Expected: stderr shows `[ezquake] doc_only entities: 194`, `unclassified: 194`, `Building blame index over union of 194 doc_only + ~5000 source-backed names...`, then runs for ~5-15s in pure Python (no ripgrep — full git-log stream parsed line-by-line), then stdout begins with `proposals:` followed by YAML entries with `name`, `classification`, `confidence`, etc.

- [ ] **Step 3: Sanity-check two known cases**

The two known doc_only ezQuake cmdline_params with documented expected classifications:

```bash
python scripts/classify-help-json.py --project ezquake --propose 2>/dev/null \
  | grep -A 5 '"-gl-debug"'
# Expected: classification: renamed, rename_to: "-r-debug", rename_at_commit: 0d7ea051

python scripts/classify-help-json.py --project ezquake --propose 2>/dev/null \
  | grep -A 5 '"-nomouse"'
# Expected: classification: never_implemented, evidence_note: ...
```

The `renamed` prediction depends on the source-backed-names inclusion in the alternation regex (Task 2's `build_blame_index` does this). If `-gl-debug` shows up as `retired_pre_walk_floor` instead, that's a signal that source-backed names aren't reaching the blame map — debug Task 2's union construction first.

NOTE: `-nopriority` is NOT in the doc_only set — its aggregate `source_state` is `source_backed` due to pre-3.6 historical versions. It's HEAD-doc_only-only, which the aggregate state hides. This is intentionally out of scope for this plan; the Windows SDK stubs sidequest tracks `-nopriority` separately (Arc B). The aggregate source_state was the right choice for this arc — it focuses operator attention on entities that have ALWAYS been doc_only across the entire walk window.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/classify-help-json.py
git commit -m "feat(qw-oracle): cross-project classify-help-json CLI"
```

---

### Task 4: Initial seed pass — operator triage of ezQuake's 194 entries

This is hands-on operator work, not pure mechanical TDD. The artifact produced is `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml` with 194 entries.

- [ ] **Step 1: Run propose to get full proposals dump**

```bash
cd apps/qw-oracle
python scripts/classify-help-json.py --project ezquake --propose \
  > /tmp/ezquake-help-json-proposals.yaml \
  2> /tmp/ezquake-help-json-propose.log
wc -l /tmp/ezquake-help-json-proposals.yaml
```

Expected: ~194 proposal entries × ~6-10 YAML lines each ≈ 1500-2000 lines.

- [ ] **Step 2: Review the high-confidence proposals**

```bash
grep "confidence: high" /tmp/ezquake-help-json-proposals.yaml | wc -l
# Expected: 100-150 (rough guess — depends how many have clean blame signals)
```

- [ ] **Step 3: Auto-accept high-confidence proposals**

```bash
python scripts/classify-help-json.py --project ezquake --apply --confidence-threshold high
ls -la apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml
```

Expected: file exists with N entries (where N = high-confidence count from Step 2).

> After this step, the seed file exists with at least the high-confidence
> classifications. Task 5 (TS gate wiring) is now safe to land in parallel
> with Steps 4-6 below.

- [ ] **Step 4: Review medium/low-confidence proposals manually**

Use Python to list names not yet classified after auto-acceptance:

```bash
python -c "
import yaml
seeded = {e['name'] for e in yaml.safe_load(open('apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml'))['classifications']}
proposed = {e['name'] for e in yaml.safe_load(open('/tmp/ezquake-help-json-proposals.yaml'))['proposals']}
remaining = sorted(proposed - seeded)
print(f'Need manual review: {len(remaining)}')
for name in remaining:
    print(' ', name)
"
```

For each remaining entry:
- Inspect the proposed classification + evidence in `/tmp/ezquake-help-json-proposals.yaml`.
- If correct, append to `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml` manually.
- If the entity is actually present in current HEAD source but the extractor missed it, hand-edit the entry to `classification: extractor_gap` with a real `gap_reason` and `sidequest` field referencing a HANDOVER sidequest title (the validator REJECTS placeholder strings starting with `(`).
- If the spelling is a typo or back-compat alias of a source-backed name, hand-edit to `classification: intentional_typo_or_alias` with `kept_for_compat_with: <source-backed name>`.

The user-global skill `extraction-review` MAY be useful for walking these in batches; otherwise this is plain operator review.

- [ ] **Step 5: Validate the final seed**

```bash
cd apps/qw-oracle/scripts/extractors
python -c "
from extractor_lib._help_json_classification import load_classifications
text = open('ezquake/seeds/help_json_classifications.yaml').read()
result = load_classifications(text, 'ezquake')
print(f'Validated {len(result)} entries')
"
```

Expected: `Validated 194 entries` (or however many the doc_only set is at this point). If the loader raises `ClassificationError`, fix the offending entry and re-validate — the validator now rejects placeholder sidequest strings on `extractor_gap` entries.

- [ ] **Step 6: Commit the seed**

```bash
git add apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml
git commit -m "feat(qw-oracle): seed help-JSON classifications for 194 ezQuake doc_only entries"
```

---

### Task 5: TypeScript review-module integration

> **Sequencing:** Land this AFTER Task 4 Step 3 (high-confidence auto-accept).
> Without a populated seed file, the gate would fire with 194 findings on
> every review run.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/review/types.ts` — extend `Bucket` union AND `ReviewCounts` interface
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts`
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/review/index.ts` — register new module + extend `counts` initializer
- Modify: `apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts` — extend `total` calc + Summary section to include the new bucket (otherwise the markdown draft silently under-counts and never surfaces help-json findings at the top of the file)
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts` — `runReviewCli` adds a `--fail-on <bucket>` flag (parseArgs `multiple: true` shape, see Step 7) for the gate

> **Out of scope for this task:** the user-global `~/.claude/skills/extraction-review/SKILL.md` routing table at lines 284-296 has no entry for the new bucket. The new bucket is intentionally NOT walked through the extraction-review skill — operators resolve `help-json-classification` findings by running `python scripts/classify-help-json.py --project <p>` directly, then re-running review until the gate passes. The skill walks per-finding dispositions for the other five buckets only. (If a future arc decides to thread this bucket through the skill, that's a separate skill-update task.)

- [ ] **Step 1: Extend Bucket union AND ReviewCounts interface in types.ts**

Edit `review/types.ts`:

```typescript
// types.ts — extend the Bucket union
export type Bucket =
  | 'addition'
  | 'retirement'
  | 'semantic-crossing'
  | 'unclassified'
  | 'source-invisible'
  | 'help-json-classification';   // NEW

// types.ts — extend ReviewCounts interface (the runReview counts initializer
// also needs to be extended — see Step 6)
export interface ReviewCounts {
  addition: number;
  retirement: number;
  'semantic-crossing': number;
  unclassified: number;
  'source-invisible': number;
  'help-json-classification': number;   // NEW
}
```

`makeFindingId` already takes `(bucket: Bucket, naturalKey: string)` — two args. The new module calls it as `makeFindingId('help-json-classification', \`${project}:${type}:${name}\`)`. No signature change.

- [ ] **Step 2: Write failing test**

```typescript
// findings-help-json-classifications.test.ts
import { describe, expect, test, beforeEach } from 'bun:test';
import Database from 'better-sqlite3';
import { findHelpJsonClassifications } from './findings-help-json-classifications.js';

describe('findHelpJsonClassifications', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE entities (
        id INTEGER PRIMARY KEY,
        project TEXT,
        type TEXT,
        name TEXT,
        source_state TEXT
      );
      INSERT INTO entities (project, type, name, source_state) VALUES
        ('ezquake', 'cmdline_param', '-classified', 'doc_only'),
        ('ezquake', 'cmdline_param', '-unclassified', 'doc_only'),
        ('ezquake', 'cmdline_param', '-active', 'source_backed');
    `);
  });

  test('emits a finding for each unclassified doc_only entity', () => {
    const seed = { '-classified': { classification: 'never_implemented' } };
    const findings = findHelpJsonClassifications(db, 'ezquake', seed);
    expect(findings).toHaveLength(1);
    expect(findings[0].bucket).toBe('help-json-classification');
    expect(findings[0].evidence.entity_ref).toBe('ezquake:cmdline_param:-unclassified');
    expect(findings[0].id).toBe('help-json-classification:ezquake:cmdline_param:-unclassified');
    expect(findings[0].proposed_disposition?.kind).toBe('classify');
  });

  test('zero findings when seed covers all doc_only entries', () => {
    const seed = {
      '-classified': { classification: 'never_implemented' },
      '-unclassified': { classification: 'never_implemented' },
    };
    const findings = findHelpJsonClassifications(db, 'ezquake', seed);
    expect(findings).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/qw-oracle && bun test scripts/load-knowledge/review/findings-help-json-classifications.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 4: Implement the module**

```typescript
// findings-help-json-classifications.ts
//
// Surfaces doc_only entities that lack an entry in the project's
// seeds/help_json_classifications.yaml. Each missing entry is a finding
// the operator must triage (or auto-classify via classify-help-json.py).
//
// The doc_only budget gate is enforced at the CLI level via --fail-on
// help-json-classification (returns non-zero exit when this bucket has
// any findings). See apps/qw-oracle/scripts/load-knowledge/index.ts.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export interface ClassificationEntry {
  classification: string;
  // other fields not needed for finding emission
}

export type SeedMap = Record<string, ClassificationEntry>;

export function findHelpJsonClassifications(
  db: Database.Database,
  project: Project,
  seed: SeedMap,
): Finding[] {
  const docOnly = db.prepare(`
    SELECT type, name FROM entities
    WHERE project = ? AND source_state = 'doc_only'
    ORDER BY type, name
  `).all(project) as Array<{ type: string; name: string }>;

  const findings: Finding[] = [];
  for (const row of docOnly) {
    if (seed[row.name]) continue;
    const entityRef = `${project}:${row.type}:${row.name}`;
    findings.push({
      id: makeFindingId('help-json-classification', entityRef),
      bucket: 'help-json-classification',
      summary: `doc_only ${row.type} \`${row.name}\` has no classification in seeds/help_json_classifications.yaml`,
      evidence: { entity_ref: entityRef },
      proposed_disposition: {
        kind: 'classify',
        rationale: 'Run scripts/classify-help-json.py --project ' + project + ' --propose to generate a proposal, then operator-review and append to the seed YAML.',
      },
    });
  }
  return findings;
}
```

(Note: shape matches the existing `findings-additions.ts` / `findings-source-invisible.ts` convention — entity identity lives in `evidence.entity_ref` as a canonical_id-style triple. No `entity_type`/`entity_name`/`project` properties on `Finding` itself — those aren't in the interface.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/qw-oracle && bun test scripts/load-knowledge/review/findings-help-json-classifications.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 6: Wire into review/index.ts**

`review/index.ts` orchestrates the five existing findings modules (additions / retirements / semantic-crossings / unclassified / source-invisible). Pattern: each one is called with `(db, project, fromVersion, toVersion)` and returns `Finding[]`; results concatenate into the review output. The new module is project-scoped, not tag-pair-scoped, so it takes `(db, project, seed)`.

1. Add a YAML-load helper at module scope:

```typescript
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {
  findHelpJsonClassifications,
  type SeedMap,
} from './findings-help-json-classifications.js';

function loadHelpJsonSeed(project: Project): SeedMap {
  const seedPath = join(
    __dirname, '..', '..', 'extractors', project,
    'seeds', 'help_json_classifications.yaml',
  );
  if (!fs.existsSync(seedPath)) return {};
  const parsed = yaml.load(fs.readFileSync(seedPath, 'utf-8')) as
    { classifications?: Array<{ name: string; classification: string }> } | null;
  const map: SeedMap = {};
  for (const entry of parsed?.classifications ?? []) {
    map[entry.name] = entry as SeedMap[string];
  }
  return map;
}
```

2. Inside `runReview`, alongside the existing finder calls in the `rawFindings` array literal, add the help-json finder:

```typescript
const helpJsonSeed = loadHelpJsonSeed(options.project);
const rawFindings: Finding[] = [
  ...findAdditions(options.db, options.project, options.fromVersion, options.toVersion),
  ...findRetirements(options.db, options.project, options.fromVersion, options.toVersion),
  ...findSemanticCrossings(options.db, options.project, options.fromVersion, options.toVersion),
  ...findUnclassified(options.db, options.project, options.fromVersion, options.toVersion),
  ...findSourceInvisible(options.db, options.project, options.fromVersion, options.toVersion),
  ...findHelpJsonClassifications(options.db, options.project, helpJsonSeed),
];
```

3. Extend the `counts` initializer (the part that reads `const counts: ReviewCounts = { addition: 0, retirement: 0, ... }`) to include the new bucket:

```typescript
const counts: ReviewCounts = {
  addition: 0,
  retirement: 0,
  'semantic-crossing': 0,
  unclassified: 0,
  'source-invisible': 0,
  'help-json-classification': 0,   // NEW — required so counts[f.bucket] += 1 doesn't NaN
};
```

- [ ] **Step 7: Update `draft-writer.ts` Summary + total**

`draft-writer.ts:84-92` currently hard-codes the original five buckets in both the `total` calculation and the rendered Summary. Without this update, every review draft will under-count by N help-json findings and the Summary section will never mention the new bucket — it appears only in the Findings list. TypeScript still compiles, tests still pass, gate still works; the bug surfaces only when the operator opens the draft.

Edit `renderSummary` in `review/draft-writer.ts`:

```typescript
function renderSummary(report: ReviewReport): string {
  const c = report.counts;
  const total = c.addition + c.retirement + c['semantic-crossing'] + c.unclassified +
                c['source-invisible'] + c['help-json-classification'];
  return [
    '## Summary',
    '',
    `- Additions: ${c.addition} (${c.addition} pending)`,
    `- Retirements: ${c.retirement} (${c.retirement} pending)`,
    `- Semantic crossings: ${c['semantic-crossing']} (${c['semantic-crossing']} pending)`,
    `- Unclassified promotions: ${c.unclassified} (${c.unclassified} pending)`,
    `- Source-invisible changes: ${c['source-invisible']} (${c['source-invisible']} pending)`,
    `- Help-JSON classifications: ${c['help-json-classification']} (${c['help-json-classification']} pending)`,
    `- **Total:** ${total}`,
  ].join('\n');
}
```

- [ ] **Step 8: Add the gate flag to `runReviewCli` in `scripts/load-knowledge/index.ts`**

The existing `runReviewCli` (in `apps/qw-oracle/scripts/load-knowledge/index.ts:402-443`) uses Node's built-in `parseArgs` from `'util'`, NOT commander. Use `multiple: true` for the repeatable flag:

```typescript
async function runReviewCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      out: { type: 'string' },
      'ezquake-repo': { type: 'string' },
      force: { type: 'boolean' },
      'fail-on': { type: 'string', multiple: true },   // NEW
    },
  });

  for (const required of ['project', 'from', 'to'] as const) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }

  // ... existing setup unchanged ...
  const { runReview } = await import('./review/index.js');
  const db = openKnowledgeDb();
  try {
    const report = runReview({ /* unchanged */ });

    // Gate: fire BEFORE the JSON dump so failed runs don't emit a
    // misleading-looking success payload to stdout. Exit 2 distinguishes
    // gate-fail from generic error (exit 1).
    const failOnBuckets = (values['fail-on'] as string[] | undefined) ?? [];
    for (const bucket of failOnBuckets) {
      const count = (report.counts as Record<string, number>)[bucket] ?? 0;
      if (count > 0) {
        process.stderr.write(
          `Gate fail: bucket '${bucket}' has ${count} findings.\n` +
          `Resolve via classify-help-json.py --project ${values.project} or omit --fail-on.\n`
        );
        process.exit(2);
      }
    }

    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } finally {
    db.close();
  }
}
```

Also update the CLI usage text in `usageAndExit` to document the new flag on the `review` subcommand:

```
review        --project <p> --from <v1> --to <v2>
              [--out <path>] [--ezquake-repo <path>] [--force]
              [--fail-on <bucket>] (repeatable; exit 2 if bucket has findings)
```

This is the canonical home of the doc_only budget gate. CI / VALIDATION-RUNBOOK invocations pass `--fail-on help-json-classification`; ad-hoc operator runs omit it.

- [ ] **Step 9: Verify the gate manually**

```bash
cd apps/qw-oracle
# After Task 4 Step 3, the seed should cover most doc_only entries; the
# gate should pass on whatever is in the high-confidence-accepted set.
bun run scripts/load-knowledge/index.ts review \
  --project ezquake --from <prev-tag> --to head \
  --fail-on help-json-classification
echo "exit code: $?"
```

If exit code is 2, the gate fired — review the medium/low-confidence proposals (Task 4 Step 4) and seed them. If exit code is 0, proceed.

- [ ] **Step 10: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/types.ts \
        apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts \
        apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts \
        apps/qw-oracle/scripts/load-knowledge/review/index.ts \
        apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts \
        apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): help-JSON classification findings module + --fail-on gate"
```

---

### Task 6: PR-digest markdown generator

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_pr_digest.py`
- Create: `apps/qw-oracle/scripts/build-help-json-pr-digest.py`
- Test: `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_pr_digest.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_help_json_pr_digest.py
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
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_pr_digest.py -v`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the digest generator**

```python
# extractor_lib/_help_json_pr_digest.py
"""Render a markdown PR digest from help_json_classifications.yaml.

The output is a copy-paste-ready PR body for the upstream project, grouped by
classification and listing the evidence we collected. Operators of qw-oracle
review the digest, file it as an upstream PR, and continue.

Entries with upstream_pr_action='none' (extractor_gap, intentional_typo_or_alias,
aspirational_documentation if we decide to keep) are excluded — those are
internal sidequests, not upstream contributions.
"""
from __future__ import annotations

from typing import Iterable


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
                f"- `{c['name']}` — {c.get('evidence_note', '(no evidence note)')}"
            )
        lines.append("")
    return "\n".join(lines)
```

- [ ] **Step 4: Implement the CLI entry point**

```python
#!/usr/bin/env python3
# apps/qw-oracle/scripts/build-help-json-pr-digest.py
"""build-help-json-pr-digest — generate apps/qw-oracle/docs/upstream-prs/<project>-help-json-cleanup.md

Reads the project's seeds/help_json_classifications.yaml and writes the
digest markdown. Idempotent — re-runs overwrite the output file with the
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
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_pr_digest.py -v`
Expected: PASS — all 3 tests green.

- [ ] **Step 6: Generate the ezQuake digest**

```bash
cd apps/qw-oracle
python scripts/build-help-json-pr-digest.py --project ezquake
ls -la docs/upstream-prs/ezquake-help-json-cleanup.md
```

Expected: file exists, contains the three section headers (Renamed / Retired / Never-implemented) populated with entries from the seed.

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_pr_digest.py \
        apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_pr_digest.py \
        apps/qw-oracle/scripts/build-help-json-pr-digest.py \
        apps/qw-oracle/docs/upstream-prs/ezquake-help-json-cleanup.md
git commit -m "feat(qw-oracle): help-JSON PR-digest generator + ezQuake initial digest"
```

---

### Task 7: Documentation updates

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
- Modify: `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`
- Modify: `apps/qw-oracle/scripts/extractors/ezquake/CLAUDE.md`

- [ ] **Step 1: PLAYBOOK — add help-JSON classification section**

In `EXTRACTOR-PLAYBOOK.md`, add a new section after the existing "Known limit" notes (locate by heading, not line number — find the `-nopriority` mention and append after the surrounding section):

```markdown
## Help-JSON drift classification

Every project with a `help_<entity_type>.json` file (currently ezQuake; FTE/QWCL pending) drifts over time as upstream renames/retires cvars/commands without pruning the help file. The qw-oracle pipeline classifies each `doc_only` entity into a closed six-value taxonomy (`renamed` / `retired_pre_walk_floor` / `never_implemented` / `extractor_gap` / `aspirational_documentation` / `intentional_typo_or_alias`).

**Per-project workflow:**
1. Run `python scripts/classify-help-json.py --project <name> --propose` to generate proposals via single-pass git-pickaxe blame (`extractor_lib/_help_json_blame.py`). The blame regex covers the union of doc_only names and same-type source-backed names so co-occurring rename additions are captured.
2. Operator reviews proposals; auto-accepts high-confidence with `--apply --confidence-threshold high`; manually triages medium/low-confidence entries.
3. Persistent classifications live in `<project>/seeds/help_json_classifications.yaml`.
4. `extraction-review` CLI emits a `help-json-classification` finding for any `doc_only` entity not in the seed (the doc_only budget gate, enforced via `--fail-on help-json-classification`).
5. `build-help-json-pr-digest.py --project <X>` generates `apps/qw-oracle/docs/upstream-prs/<X>-help-json-cleanup.md` for upstream PR contribution.

**Auto vs manual:** the classifier proposes four kinds (`never_implemented`, `renamed`, `retired_pre_walk_floor`, `aspirational_documentation`). The other two (`extractor_gap`, `intentional_typo_or_alias`) require operator review and hand-edits to the YAML — the validator rejects placeholder sidequest strings on `extractor_gap` entries to prevent silent acceptance.

**Schema** (apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py): six closed classification values; per-classification required fields enforced at YAML load time.

**Update** the "Known limit: `-nopriority`" note above to reference the seed's `extractor_gap` classification once the Windows SDK stubs sidequest closes the underlying gap.
```

- [ ] **Step 2: VALIDATION-RUNBOOK — add doc_only budget gate to review-time checks**

In `VALIDATION-RUNBOOK.md`, find the existing "review-time checks" section. Add:

```markdown
### Doc_only budget gate

After every extraction, run `extraction-review` over the latest tag-pair with the gate flag:

`bun run scripts/load-knowledge/index.ts review --project <name> --from <prev> --to head --fail-on help-json-classification`

The review's `help-json-classification` bucket flags any `doc_only` entity not present in the project's `seeds/help_json_classifications.yaml`. The `--fail-on help-json-classification` flag returns exit code 2 when the bucket has any findings, blocking the snapshot from being merged into slipgate's data dir until each finding is resolved (operator runs `python scripts/classify-help-json.py --project <name>` and accepts/edits the proposal, or hand-classifies the entity as `extractor_gap` with a real HANDOVER sidequest reference — the validator rejects placeholder sidequest strings).

This converts a recurring class of mystery doc_only entries — formerly accumulated as backlog with no triage — into either a classification artifact (cached) or an extractor improvement task (sidequest). New mysteries surface at extraction time, not weeks later.
```

- [ ] **Step 3: ezquake/CLAUDE.md — add seeds reference**

Add to the existing `## Always-on rules` section in `apps/qw-oracle/scripts/extractors/ezquake/CLAUDE.md`:

```markdown
- **Help-JSON classifications** -- `seeds/help_json_classifications.yaml` records the durable classification of every doc_only entity. New doc_only entities trigger `extraction-review` findings until classified via `python scripts/classify-help-json.py --project ezquake`. PR-digest output at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-cleanup.md`.
```

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md \
        apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md \
        apps/qw-oracle/scripts/extractors/ezquake/CLAUDE.md
git commit -m "docs(qw-oracle): help-JSON classification workflow in playbook + runbook"
```

---

### Task 8: Update HANDOVER.md

**Files:**
- Modify: `HANDOVER.md`

- [ ] **Step 1: Verify the seed before draining sidequests**

Before any HANDOVER edits, confirm the seed actually covers the entries the sidequest deletions assume are classified:

```bash
python -c "
import yaml
seed = yaml.safe_load(open('apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml'))
names = {e['name'] for e in seed['classifications']}
required = {'-gl-debug', '-nomouse'}
missing = required - names
if missing:
    print(f'NOT YET drainable — missing: {missing}')
    raise SystemExit(1)
print('OK — both ezquake cmdline_param entries are seeded; safe to delete sidequest.')
"
```

If this script fails, complete Task 4 Step 4 manual review for the missing entries before proceeding.

- [ ] **Step 2: Drain closed sidequests; rewrite half-closed sidequest**

Edit `HANDOVER.md`:

1. **Remove** the `-nopriority cmdline_param recovery (Windows SDK stubs)` small followup. It now lives as an `extractor_gap` classification in `seeds/help_json_classifications.yaml`, with the sidequest still tracked there. (Optional: keep the followup but rename it to make the seed-driven tracking explicit. My recommendation: remove from HANDOVER, because the seed YAML is now the canonical "open extractor gaps" registry.)

2. **Rewrite** the "Sub-pattern 2b: cmdline variant-matrix gaps" sidequest. The QWCL portion (11 entries) closed silently; only the 2 ezquake entries (`-gl-debug` + `-nomouse`) remained. After Step 1's verification confirms both are seeded (with `-gl-debug` as `renamed`, `-nomouse` as `never_implemented`), the sidequest can be DELETED — both ezquake entries are now properly classified, and the SDK-stubs solve only applies to `-nopriority` going forward.

3. **Update** the "Phase 2e follow-up arc residuals" sidequest. The "194 doc_only" portion is now drained by Task 4. Remaining: only the `gl_lightmode` F2 anomaly. Either keep the sidequest with that single residual, or fold it into the next ezQuake deep-time refresh arc.

- [ ] **Step 3: Add new sidequest if needed**

If the doc_only budget surfaces NEW `extractor_gap` classifications during operator review of the 194 entries, ADD a new sidequest per gap:

```markdown
- **Help-JSON extractor gaps surfaced by initial seed pass** — N entries classified as `extractor_gap` in seeds/help_json_classifications.yaml. Triage individually; each becomes its own sidequest or rolls into a follow-up arc.
```

- [ ] **Step 4: Commit**

```bash
git add HANDOVER.md
git commit -m "docs(handover): drain help-JSON-classification sidequests after Arc A"
```

---

## Execution Notes

**Total estimated effort:** 1-2 focused sessions, plus the operator review of 194 entries (probably 2-3 hours of manual triage on first pass, but mostly mechanical once high-confidence auto-acceptance does its job).

**Sequencing dependencies:**
1. Tasks 1, 2, 3 (Python infrastructure) — prerequisites for everything downstream.
2. Task 4 Steps 1-3 (auto-accept high-confidence proposals) — populates the seed file.
3. Task 5 (TS gate) — runs AFTER Task 4 Step 3, NOT in parallel; otherwise the gate would block all reviews until the seed lands.
4. Task 4 Steps 4-6 (operator manual review of medium/low confidence + commit) and Task 6 (PR-digest builder) can run in parallel.
5. Task 7 (docs) and Task 8 (HANDOVER cleanup, conditional on Step 1's seed-verification) come last.

**What this plan does NOT include** (deferred to future arcs):
- Cross-project onboarding. The DB at 2026-04-30 has 194 doc_only entities for ezquake; 0 for fte / mvdsv / qwcl. The fork lookup in `research/repos/` confirms only ezquake-source and unezquake ship `help_*.json` files. So this infrastructure is structurally ezQuake-only today, not a "ready for FTE/QWCL/MVDSV onboarding" generic. `PROJECT_REPOS` is shaped for future addition if any of those projects gains a help-JSON convention upstream — until then there is no Arc D to defer to.
- Windows SDK stubs (Arc B, separate plan — but the `-nopriority` entry's `extractor_gap` classification with a sidequest pointer means it's now properly tracked rather than vanishing into HANDOVER).
- Phase 2e follow-up `gl_lightmode` F2 anomaly resolution (Arc C).
- FTE plugin v-table + cvar-binding indirection handlers (Arc E).

**Caching strategy:** The seed YAML is the durable cache. Future `classify-help-json.py` runs only process NEW unclassified entries (existing entries skipped). The git-log blame index is rebuilt fresh each run — pure-Python regex pass over `git log -p` completes in ~5-15s on ezquake-sized repos, so on-disk caching of the blame index would add complexity for negligible benefit. When upstream renames/retires something else, the new doc_only entry surfaces as a `--fail-on help-json-classification` review finding, gets classified via the same workflow, and lands in the seed. Total ongoing cost per upstream tag bump: ~10s of git-log parse + ~30 seconds of operator review per new mystery (typically 0-3 mysteries per bump).

---
