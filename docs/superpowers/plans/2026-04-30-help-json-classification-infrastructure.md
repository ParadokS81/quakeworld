# Help-JSON Classification Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 194-entry ezQuake `doc_only` mystery heap into a triaged, classified, durable knowledge artifact that auto-generates upstream cleanup PR drafts and prevents the same detective work on future tag bumps.

**Architecture:** Three-layer system. (1) Per-project YAML seed file at `<project>/seeds/help_json_classifications.yaml` records each `doc_only` entity's durable classification + evidence (the cache). (2) Python `_help_json_blame.py` module builds a git-pickaxe index in one pass — single `git log -p` scan, ripgrep with alternation regex over all 194 names — outputting a cached `.json` blame artifact. (3) TypeScript review-module `findings-help-json-classifications.ts` plugs into the existing extraction-review CLI to surface unclassified mysteries as findings; the doc_only budget gate fails review when mysteries lack classifications. A markdown PR-digest generator reads the seed YAML and emits `docs/upstream-prs/<project>-help-json-cleanup.md` ready for upstream contribution.

**Tech Stack:** Python 3 + libclang 18 (existing extractors, blame index builder), TypeScript + Bun + better-sqlite3 11 (existing review CLI), js-yaml (existing seed loader), ripgrep (single-pass blame search).

---

## File Structure

**New Python modules (extractor_lib):**
- `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py` — closed taxonomy enum, schema validator
- `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_blame.py` — single-pass blame index builder + lookup
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_classification.py`
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_blame.py`

**New CLI (Python, lives next to extract.py per project):**
- `apps/qw-oracle/scripts/extractors/ezquake/classify-help-json.py` — proposes classifications for unclassified entries, writes/updates seed YAML

**New seed file (per-project, ezQuake first):**
- `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml`
- `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_blame_cache.json` (gitignored if large; committed if small enough — decided in Task 7)

**New TypeScript review module:**
- `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts`
- `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts`

**Modified TypeScript:**
- `apps/qw-oracle/scripts/load-knowledge/review/index.ts` — register new findings module
- `apps/qw-oracle/scripts/load-knowledge/review/types.ts` — add `'help-json-classification'` Bucket value

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

Locked from brainstorm. Seven values, all required to validate against the schema:

| Classification | Required fields | Source of evidence |
|---|---|---|
| `retired_during_walk` | `retired_at_version`, `last_source_file`, `last_source_line` | DB per-version timeline (auto-derived from `source_retired` state) |
| `retired_pre_walk_floor` | `retired_at_commit`, `retired_at_date`, `last_source_file_pre_walk`, `last_source_line_pre_walk` | git log -S finds string-removal commit before walk floor (3.0 for ezQuake) |
| `renamed` | `rename_to` (must be a source-backed entity name in same project), `rename_at_commit`, `rename_at_date` | Co-occurrence of remove + add in same commit, near-string match |
| `never_implemented` | `evidence_note` (free text describing absence) | git log -S returns no hits, OR hits only inside comment blocks |
| `extractor_gap` | `gap_reason`, `sidequest` (link to HANDOVER sidequest) | string IS in current source HEAD; extractor missed it |
| `aspirational_documentation` | `evidence_note` | help-JSON describes intended/planned feature with no code anywhere |
| `intentional_typo_or_alias` | `kept_for_compat_with` (a source-backed name) | help-JSON spelling differs from source by typo or back-compat |

Common required fields on every entry:
- `name` (entity name as it appears in help-JSON)
- `type` (one of `cvar`, `command`, `cmdline_param`, `macro`)
- `classification` (one of the seven above)
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
    assert len(list(Classification)) == 7
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_classification.py -v`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the module**

```python
# apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py
"""Help-JSON classification taxonomy + schema validation.

Closed taxonomy of seven values for entries in a project's
seeds/help_json_classifications.yaml. Every entity that lands as
source_state='doc_only' must carry one of these classifications before
the extraction-review CLI's doc_only budget gate will pass.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

import yaml


class Classification(str, Enum):
    RETIRED_DURING_WALK = "retired_during_walk"
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
    Classification.RETIRED_DURING_WALK: {
        "retired_at_version",
        "last_source_file",
        "last_source_line",
    },
    Classification.RETIRED_PRE_WALK_FLOOR: {
        "retired_at_commit",
        "retired_at_date",
        "last_source_file_pre_walk",
        "last_source_line_pre_walk",
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
    parse_pickaxe_output,
    classify_from_blame,
)


def test_alternation_regex_escapes_special_chars():
    names = ["-gl-debug", "+foo", "name.with.dots"]
    regex = build_alternation_regex(names)
    assert "-gl-debug" in regex
    # The +/. should be regex-escaped so they match literally
    assert r"\+foo" in regex
    assert r"name\.with\.dots" in regex


def test_parse_pickaxe_output_removal_event():
    raw = """commit 0d7ea051f0a06784ef59f79fe7f8488df3bc08c9
Author: meag <meag@acm.org>
Date:   2018-07-21

    CLASSIC: Fix single-texturing issues

diff --git a/cmdline_params_ids.h b/cmdline_params_ids.h
-CMDLINE_DEF(client_video_gl_debug, "-gl-debug"),
+CMDLINE_DEF(client_video_r_debug, "-r-debug"),
"""
    entries = parse_pickaxe_output(raw, names={"-gl-debug", "-r-debug"})
    # Both names appear in the same commit — that's a co-occurrence (rename signal)
    assert "-gl-debug" in entries
    assert "-r-debug" in entries
    assert entries["-gl-debug"][0]["commit"] == "0d7ea051f0a06784ef59f79fe7f8488df3bc08c9"
    assert entries["-gl-debug"][0]["event"] == "removal"
    assert entries["-r-debug"][0]["event"] == "addition"
    assert entries["-gl-debug"][0]["commit"] == entries["-r-debug"][0]["commit"]


def test_classify_from_blame_renamed_via_co_occurrence():
    """When -X is removed and -Y is added in the same commit, suggest rename."""
    blame = {
        "-gl-debug": [
            {"commit": "abc123", "date": "2018-07-21", "event": "removal"}
        ],
        "-r-debug": [
            {"commit": "abc123", "date": "2018-07-21", "event": "addition"}
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
            {"commit": "deadbeef", "date": "2010-05-01", "event": "removal"}
        ]
    }
    source_backed_names: set[str] = set()
    proposal = classify_from_blame("-old-feature", blame, source_backed_names)
    assert proposal["classification"] == "retired_pre_walk_floor"
    assert proposal["retired_at_commit"] == "deadbeef"
    assert proposal["retired_at_date"] == "2010-05-01"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/qw-oracle/scripts/extractors && python -m pytest extractor_lib/tests/test_help_json_blame.py -v`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the module**

```python
# apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_blame.py
"""Single-pass git-pickaxe index for help-JSON classification.

Strategy: one `git log --all -p` pass against the upstream repo, ripgrep with
an alternation regex over all unclassified-entity names, parse the diff hunks
to record per-name addition/removal events. Single repo scan classifies up to
N names simultaneously.

For ezQuake's 194 unclassified entries this finishes in ~30-60 seconds vs
the naive approach (194 sequential `git log -S` calls, ~10 minutes).
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
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


def run_pickaxe_pass(repo_path: Path, names: list[str]) -> str:
    """Run `git log --all -p --no-merges` and stream into ripgrep.

    Returns the raw concatenated output. Caller pipes this into parse_pickaxe_output.

    Note: git log + ripgrep both stream; on an ezQuake-sized repo the pipe
    completes in ~30-60s with peak memory bounded by ripgrep's buffer.
    """
    regex = build_alternation_regex(names)
    git_cmd = [
        "git",
        "-C", str(repo_path),
        "log",
        "--all",
        "-p",
        "--no-merges",
        "--pretty=format:===COMMIT===%n%H%n%ad%n",
        "--date=short",
    ]
    rg_cmd = ["rg", "--no-line-number", regex]
    git_proc = subprocess.Popen(git_cmd, stdout=subprocess.PIPE)
    rg_proc = subprocess.run(rg_cmd, stdin=git_proc.stdout, capture_output=True, text=True)
    git_proc.wait()
    # ripgrep returns 1 when no matches; treat that as empty rather than failure
    if rg_proc.returncode not in (0, 1):
        raise RuntimeError(f"ripgrep failed: {rg_proc.stderr}")
    return rg_proc.stdout


def parse_pickaxe_output(raw: str, names: set[str]) -> dict[str, list[BlameIndexEntry]]:
    """Parse git-log+ripgrep output into per-name event lists.

    Each line in `raw` is either:
      - a commit boundary line (===COMMIT===)
      - a SHA / date line following the boundary
      - a diff line (+/- prefix, content)

    For each diff line containing one of `names` (as a quoted string literal),
    record an addition or removal event under that name.

    Returns dict keyed by name; values are chronologically-sorted event lists.
    """
    by_name: dict[str, list[BlameIndexEntry]] = {n: [] for n in names}
    cur_commit: str | None = None
    cur_date: str | None = None
    cur_file: str | None = None

    string_re = re.compile(r'"([^"]+)"')
    file_re = re.compile(r"^\+\+\+ b/(.+)$")

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
        m_file = file_re.match(line)
        if m_file:
            cur_file = m_file.group(1)
            continue
        if not (line.startswith("+") or line.startswith("-")):
            continue
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


def classify_from_blame(
    name: str,
    blame: dict[str, list[BlameIndexEntry]],
    source_backed_names: set[str],
) -> dict:
    """Propose a classification for `name` based on its blame history.

    Returns a partial classification dict. Caller fills in classified_at,
    upstream_pr_action, etc. before persisting to YAML.

    Decision tree:
      1. No events ever → never_implemented (high confidence)
      2. Co-occurring removal of `name` + addition of a source-backed sibling
         in the same commit → renamed (high confidence)
      3. Has removal events but no co-occurring rename target → retired_pre_walk_floor
      4. Has only addition events but is doc_only at HEAD → extractor_gap
         (string IS in current source — extractor failed to capture)
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
    additions = [e for e in events if e["event"] == "addition"]
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
            "last_source_line_pre_walk": None,  # blame doesn't preserve line numbers
        }
    if additions and name not in source_backed_names:
        # Was added historically, never removed, but doc_only now → likely an
        # extractor gap (the string is in source somewhere we missed).
        return {
            "classification": "extractor_gap",
            "confidence": "medium",
            "gap_reason": (
                "Blame index shows additions but no removals; expected to be "
                "source-backed but extractor classified as doc_only. "
                "Verify with grep against current HEAD."
            ),
            "sidequest": "(operator should attach a HANDOVER sidequest)",
        }
    return {
        "classification": "aspirational_documentation",
        "confidence": "low",
        "evidence_note": (
            "Blame events present but no clear rename or retirement signal. "
            "Operator review needed."
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

---

### Task 3: classify-help-json CLI (Python, per-project)

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/ezquake/classify-help-json.py`

- [ ] **Step 1: Write the CLI**

```python
#!/usr/bin/env python3
"""classify-help-json — propose classifications for ezQuake doc_only entries.

Reads:
  - knowledge.db: list of project='ezquake' source_state='doc_only' entities
  - apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml
    (existing classifications; entries here are skipped — already classified)
  - research/repos/ezquake-source/ (the upstream git clone for blame index)

Writes:
  - apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml
    (appends operator-confirmed classifications; preserves existing entries)
  - stdout: human-readable diff of proposed classifications for operator review

Workflow:
  1. Run this script. It prints proposed classifications for unclassified entries.
  2. Operator reviews stdout, decides which to accept.
  3. Operator runs script with --apply to persist confirmations to YAML.
  4. (Future runs skip already-classified entries; only new mysteries surface.)

Usage:
  python classify-help-json.py --propose       # print proposals (read-only)
  python classify-help-json.py --apply --confidence-threshold high
                                                # auto-accept high-confidence proposals
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import date
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))

from extractor_lib._help_json_blame import (
    classify_from_blame,
    parse_pickaxe_output,
    run_pickaxe_pass,
)
from extractor_lib._help_json_classification import (
    Classification,
    load_classifications,
    validate_entry,
)


DB_PATH = REPO_ROOT / "apps/qw-oracle/data/knowledge.db"
SEED_PATH = REPO_ROOT / "apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml"
EZQUAKE_REPO = REPO_ROOT / "research/repos/ezquake-source"
PROJECT = "ezquake"


def fetch_doc_only_entities(db: sqlite3.Connection) -> list[tuple[str, str]]:
    """Return [(name, type), ...] for project=ezquake doc_only entities."""
    rows = db.execute(
        """
        SELECT name, type FROM entities
        WHERE project = ? AND source_state = 'doc_only'
        ORDER BY type, name
        """,
        (PROJECT,),
    ).fetchall()
    return [(r[0], r[1]) for r in rows]


def fetch_source_backed_names(db: sqlite3.Connection) -> set[str]:
    """Return all currently-source-backed entity names for cross-reference."""
    rows = db.execute(
        """
        SELECT name FROM entities
        WHERE project = ? AND source_state = 'source_backed'
        """,
        (PROJECT,),
    ).fetchall()
    return {r[0] for r in rows}


def load_existing_seed() -> dict[str, dict]:
    if not SEED_PATH.exists():
        return {}
    return load_classifications(SEED_PATH.read_text(encoding="utf-8"), PROJECT)


def write_seed(classifications_by_name: dict[str, dict]) -> None:
    payload = {
        "project": PROJECT,
        "classifications": list(classifications_by_name.values()),
    }
    SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    SEED_PATH.write_text(
        yaml.safe_dump(payload, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
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

    db = sqlite3.connect(DB_PATH)
    doc_only = fetch_doc_only_entities(db)
    source_backed = fetch_source_backed_names(db)
    existing = load_existing_seed()

    unclassified = [(n, t) for (n, t) in doc_only if n not in existing]
    print(f"doc_only entities: {len(doc_only)}", file=sys.stderr)
    print(f"already classified: {len(existing)}", file=sys.stderr)
    print(f"unclassified: {len(unclassified)}", file=sys.stderr)

    if not unclassified:
        print("No unclassified entries. Nothing to do.", file=sys.stderr)
        return 0

    names_to_lookup = [n for (n, _t) in unclassified]
    print(f"Building blame index for {len(names_to_lookup)} names...", file=sys.stderr)
    raw = run_pickaxe_pass(EZQUAKE_REPO, names_to_lookup)
    blame = parse_pickaxe_output(raw, set(names_to_lookup))

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
    write_seed(merged)
    print(f"Wrote {len(merged)} classifications to {SEED_PATH}", file=sys.stderr)
    return 0


def _default_pr_action(classification: str) -> str:
    """Default upstream_pr_action per classification."""
    return {
        Classification.RETIRED_DURING_WALK.value: "remove_from_help_json",
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

Run: `cd apps/qw-oracle/scripts/extractors/ezquake && python classify-help-json.py --propose 2>&1 | head -50`
Expected: stderr shows `doc_only entities: 194`, `unclassified: 194`, `Building blame index...`, then runs for ~30-60s, then stdout begins with `proposals:` followed by YAML entries with `name`, `classification`, `confidence`, etc.

- [ ] **Step 3: Sanity-check two known cases**

The two known doc_only ezQuake cmdline_params with documented expected classifications:

```bash
python classify-help-json.py --propose 2>/dev/null | grep -A 5 '"-gl-debug"'
# Expected: classification: renamed, rename_to: "-r-debug", rename_at_commit: 0d7ea051

python classify-help-json.py --propose 2>/dev/null | grep -A 5 '"-nomouse"'
# Expected: classification: never_implemented, evidence_note: ...
```

NOTE: `-nopriority` is NOT in the doc_only set — its aggregate `source_state` is `source_backed` due to pre-3.6 historical versions. It's HEAD-doc_only-only, which the aggregate state hides. This is intentionally out of scope for this plan; the Windows SDK stubs sidequest tracks `-nopriority` separately (Arc B). The aggregate source_state was the right choice for this arc — it focuses operator attention on entities that have ALWAYS been doc_only across the entire walk window.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/ezquake/classify-help-json.py
git commit -m "feat(qw-oracle): classify-help-json CLI for ezQuake doc_only triage"
```

---

### Task 4: Initial seed pass — operator triage of ezQuake's 194 entries

This is hands-on operator work, not pure mechanical TDD. The artifact produced is `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml` with 194 entries.

- [ ] **Step 1: Run propose to get full proposals dump**

```bash
cd apps/qw-oracle/scripts/extractors/ezquake
python classify-help-json.py --propose > /tmp/ezquake-help-json-proposals.yaml 2> /tmp/ezquake-help-json-propose.log
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
python classify-help-json.py --apply --confidence-threshold high
ls -la seeds/help_json_classifications.yaml
```

Expected: file exists with N entries (where N = high-confidence count from Step 2).

- [ ] **Step 4: Review medium/low-confidence proposals manually**

Use Python to list names not yet classified after auto-acceptance:

```bash
python -c "
import yaml
seeded = {e['name'] for e in yaml.safe_load(open('seeds/help_json_classifications.yaml'))['classifications']}
proposed = {e['name'] for e in yaml.safe_load(open('/tmp/ezquake-help-json-proposals.yaml'))['proposals']}
remaining = sorted(proposed - seeded)
print(f'Need manual review: {len(remaining)}')
for name in remaining:
    print(' ', name)
"
```

For each remaining entry:
- Inspect the proposed classification + evidence in `/tmp/ezquake-help-json-proposals.yaml`.
- If correct, append to `seeds/help_json_classifications.yaml` manually.
- If incorrect, edit the entry to the correct classification with operator-supplied evidence.

The user-global skill `extraction-review` MAY be useful for walking these in batches; otherwise this is plain operator review.

- [ ] **Step 5: Validate the final seed**

```bash
python -c "
import yaml
from extractor_lib._help_json_classification import load_classifications
text = open('seeds/help_json_classifications.yaml').read()
result = load_classifications(text, 'ezquake')
print(f'Validated {len(result)} entries')
"
```

Expected: `Validated 194 entries` (or however many the doc_only set is at this point).

- [ ] **Step 6: Commit the seed**

```bash
git add apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml
git commit -m "feat(qw-oracle): seed help-JSON classifications for 194 ezQuake doc_only entries"
```

---

### Task 5: TypeScript review-module integration

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/review/types.ts`
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts`
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/review/index.ts` — register new module

- [ ] **Step 1: Extend Bucket type in types.ts**

Edit `review/types.ts`:

```typescript
// types.ts — line ~10, extend the Bucket union
export type Bucket =
  | 'addition'
  | 'retirement'
  | 'semantic-crossing'
  | 'unclassified'
  | 'source-invisible'
  | 'help-json-classification';   // NEW
```

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
    expect(findings[0].entity_name).toBe('-unclassified');
    expect(findings[0].bucket).toBe('help-json-classification');
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
// The doc_only budget gate: when this module returns >0 findings, the
// extraction-review CLI's exit code reflects "triage required" so this
// blocks merge of stale extractor output into the snapshot.

import type Database from 'better-sqlite3';
import type { Finding, ProposedDisposition } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export interface ClassificationEntry {
  classification: string;
  // …other fields not needed for finding emission
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
    findings.push({
      id: makeFindingId('help-json', project, row.name),
      bucket: 'help-json-classification',
      project,
      entity_type: row.type,
      entity_name: row.name,
      summary: `doc_only entity '${row.name}' has no classification in seeds/help_json_classifications.yaml`,
      evidence: { entity_ref: `${project}:${row.type}:${row.name}` },
      proposed_disposition: {
        kind: 'classify',
        rationale: 'Run classify-help-json.py --propose to generate a proposal, then operator-review and append to the seed YAML.',
      } satisfies ProposedDisposition,
    });
  }
  return findings;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/qw-oracle && bun test scripts/load-knowledge/review/findings-help-json-classifications.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 6: Wire into review/index.ts**

`review/index.ts` orchestrates the five existing findings modules (additions / retirements / semantic-crossings / unclassified / source-invisible). Pattern: each one is called with `(db, project, fromVersion, toVersion)` and returns `Finding[]`; results concatenate into the review output. The new module differs slightly — it's project-scoped, not tag-pair-scoped. Wire it as follows:

1. Read the file to confirm the orchestration shape (look for the calls to `findAdditions`, `findRetirements`, etc.).
2. Add a YAML-load step early in the review run:

```typescript
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { findHelpJsonClassifications, type SeedMap } from './findings-help-json-classifications.js';

function loadSeed(project: string): SeedMap {
  const seedPath = `apps/qw-oracle/scripts/extractors/${project}/seeds/help_json_classifications.yaml`;
  if (!fs.existsSync(seedPath)) return {};
  const parsed = yaml.load(fs.readFileSync(seedPath, 'utf-8')) as { classifications?: Array<{ name: string; classification: string }> };
  const map: SeedMap = {};
  for (const entry of parsed.classifications ?? []) {
    map[entry.name] = entry as SeedMap[string];
  }
  return map;
}
```

3. After the existing findings calls, add:

```typescript
const seed = loadSeed(project);
const helpJsonFindings = findHelpJsonClassifications(db, project, seed);
findings.push(...helpJsonFindings);
```

(Variable names — `findings`, `project`, `db` — must match whatever `review/index.ts` already uses; adapt as needed.)

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/types.ts \
        apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts \
        apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts \
        apps/qw-oracle/scripts/load-knowledge/review/index.ts
git commit -m "feat(qw-oracle): help-JSON classification findings module"
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
        elif kind in ("retired_during_walk", "retired_pre_walk_floor"):
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

In `EXTRACTOR-PLAYBOOK.md`, add a new section after the existing "Known limit" notes (around line 270 where `-nopriority` is mentioned):

```markdown
## Help-JSON drift classification

Every project with a `help_<entity_type>.json` file (currently ezQuake; FTE/QWCL pending) drifts over time as upstream renames/retires cvars/commands without pruning the help file. The qw-oracle pipeline classifies each `doc_only` entity into a closed taxonomy (`renamed` / `retired_pre_walk_floor` / `never_implemented` / `extractor_gap` / `aspirational_documentation` / `intentional_typo_or_alias` / `retired_during_walk`).

**Per-project workflow:**
1. Run `classify-help-json.py --propose` to generate proposals via single-pass git-pickaxe blame (`extractor_lib/_help_json_blame.py`).
2. Operator reviews proposals; auto-accepts high-confidence with `--apply --confidence-threshold high`; manually triages medium/low-confidence entries.
3. Persistent classifications live in `<project>/seeds/help_json_classifications.yaml`.
4. `extraction-review` CLI emits a `help-json-classification` finding for any `doc_only` entity not in the seed (the doc_only budget gate).
5. `build-help-json-pr-digest.py --project <X>` generates `apps/qw-oracle/docs/upstream-prs/<X>-help-json-cleanup.md` for upstream PR contribution.

**Schema** (apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_classification.py): seven closed classification values; per-classification required fields enforced at YAML load time.

**Update** the "Known limit: `-nopriority`" note above to reference the seed's `extractor_gap` classification once the Windows SDK stubs sidequest closes the underlying gap.
```

- [ ] **Step 2: VALIDATION-RUNBOOK — add doc_only budget gate to review-time checks**

In `VALIDATION-RUNBOOK.md`, find the existing "review-time checks" section. Add:

```markdown
### Doc_only budget gate

After every extraction, run `extraction-review` over the latest tag-pair. The review's `help-json-classification` bucket flags any `doc_only` entity not present in the project's `seeds/help_json_classifications.yaml`. If the bucket has >0 findings, the snapshot must NOT be merged into slipgate's data dir until each finding is resolved (operator runs `classify-help-json.py` and accepts/edits the proposal, or marks the entity as a new `extractor_gap` with a HANDOVER sidequest reference).

This converts a recurring class of mystery doc_only entries — formerly accumulated as backlog with no triage — into either a classification artifact (cached) or an extractor improvement task (sidequest). New mysteries surface at extraction time, not weeks later.
```

- [ ] **Step 3: ezquake/CLAUDE.md — add seeds reference**

Add to the existing `## Always-on rules` section in `apps/qw-oracle/scripts/extractors/ezquake/CLAUDE.md`:

```markdown
- **Help-JSON classifications** -- `seeds/help_json_classifications.yaml` records the durable classification of every doc_only entity. New doc_only entities trigger `extraction-review` findings until classified via `classify-help-json.py`. PR-digest output at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-cleanup.md`.
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

- [ ] **Step 1: Drain closed sidequests; rewrite half-closed sidequest**

Edit `HANDOVER.md`:

1. **Remove** the `-nopriority cmdline_param recovery (Windows SDK stubs)` small followup. It now lives as an `extractor_gap` classification in `seeds/help_json_classifications.yaml`, with the sidequest still tracked there. (Optional: keep the followup but rename it to make the seed-driven tracking explicit. My recommendation: remove from HANDOVER, because the seed YAML is now the canonical "open extractor gaps" registry.)

2. **Rewrite** the "Sub-pattern 2b: cmdline variant-matrix gaps" sidequest. The QWCL portion (11 entries) closed silently; only the 2 ezquake entries (`-gl-debug` + `-nomouse`) remained, and Task 4 of this plan classifies them as `renamed` and `never_implemented` respectively. The sidequest can be DELETED — both ezquake entries are now properly classified, and the SDK-stubs solve only applies to `-nopriority` going forward.

3. **Update** the "Phase 2e follow-up arc residuals" sidequest. The "194 doc_only" portion is now drained by Task 4. Remaining: only the `gl_lightmode` F2 anomaly. Either keep the sidequest with that single residual, or fold it into the next ezQuake deep-time refresh arc.

- [ ] **Step 2: Add new sidequest if needed**

If the doc_only budget surfaces NEW `extractor_gap` classifications during operator review of the 194 entries, ADD a new sidequest per gap:

```markdown
- **Help-JSON extractor gaps surfaced by initial seed pass** — N entries classified as `extractor_gap` in seeds/help_json_classifications.yaml. Triage individually; each becomes its own sidequest or rolls into a follow-up arc.
```

- [ ] **Step 3: Commit**

```bash
git add HANDOVER.md
git commit -m "docs(handover): drain help-JSON-classification sidequests after Arc A"
```

---

## Execution Notes

**Total estimated effort:** 1-2 focused sessions, plus the operator review of 194 entries (probably 2-3 hours of manual triage on first pass, but mostly mechanical once high-confidence auto-acceptance does its job).

**Sequencing dependencies:** Tasks 1-3 (Python infrastructure) are prerequisites for Task 4 (initial seed). Task 5 (TS review integration) can run in parallel with Task 4. Task 6 (PR digest) depends on Task 4 completion. Task 7-8 (docs) come last.

**What this plan does NOT include** (deferred to future arcs):
- FTE/QWCL/MVDSV onboarding to the same infrastructure (separate Arc D once ezQuake validates the shape).
- Windows SDK stubs (Arc B, separate plan — but the `-nopriority` entry's `extractor_gap` classification with a sidequest pointer means it's now properly tracked rather than vanishing into HANDOVER).
- Phase 2e follow-up `gl_lightmode` F2 anomaly resolution (Arc C).
- FTE plugin v-table + cvar-binding indirection handlers (Arc E).

**Cache invalidation strategy:** The seed YAML is durable. Future `classify-help-json.py` runs only process NEW unclassified entries (existing entries skipped). When upstream renames/retires something else, the new doc_only entry surfaces as a finding, gets classified via the same workflow, and lands in the seed. Total ongoing cost per upstream tag bump: ~5-10 seconds of git pickaxe + ~30 seconds of operator review per new mystery (typically 0-3 mysteries per bump).

---
