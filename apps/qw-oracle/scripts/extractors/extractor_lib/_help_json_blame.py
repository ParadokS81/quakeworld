"""Single-pass git-pickaxe index for help-JSON classification.

Strategy: one `git log --first-parent -p --no-merges` pass against the upstream repo.
The full stream is consumed by a Python state-machine parser (NO ripgrep
pre-filter -- ripgrep would discard the ===COMMIT===/SHA/date sentinel lines
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
from difflib import SequenceMatcher
from pathlib import Path
from typing import Iterable, TypedDict


# Rename plausibility tiers. SequenceMatcher.ratio() between the doc_only name
# and the candidate source-backed sibling. Below LOW: not a rename, treat as
# coincidental co-occurrence. LOW..HIGH: medium confidence (operator review
# needed). >=HIGH: high confidence (auto-acceptable). Calibrated against
# ezQuake's blame results: real renames like `-gl-debug`->`-r-debug` (0.78)
# and `loadfont`->`fontload` (0.625) score above LOW; bulk-cleanup false
# positives like `cfg_browser_color`->`file_browser_sort_mode` (0.38) and
# `auth_validate`->`echo` (0.16) score below.
RENAME_SIMILARITY_LOW = 0.40
RENAME_SIMILARITY_HIGH = 0.65


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

    Hyphens are left unescaped: they are only special inside `[]` character
    classes, not in alternation patterns. Leaving them bare keeps the regex
    readable and satisfies substring-presence checks (e.g. "-gl-debug" in
    regex) without changing match semantics.
    """
    escaped = [re.escape(n).replace(r"\-", "-") for n in names]
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
    over ~3-5M lines once the alternation covers the doc_only union source_backed
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
    result = subprocess.run(
        git_cmd, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
        check=False,
    )
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
        # file_b_re -- fall back to the pending pre-image path so removal
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
    name (doc_only union source_backed); doc_only names with no events present
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

    Decision tree (auto-proposable kinds only -- extractor_gap and
    intentional_typo_or_alias are operator-manual-only and never returned
    here):
      1. No events ever -> never_implemented (high confidence)
      2. Co-occurring removal of `name` + addition of a source-backed sibling
         in the same commit, AND the candidate sibling passes the rename
         plausibility gate (string-similarity >= RENAME_SIMILARITY_LOW)
         -> renamed (confidence high or medium per similarity)
      3. Has removal events but no plausible rename target -> retired_pre_walk_floor
      4. Has only addition events (or events without a clear retirement
         signal) -> aspirational_documentation (low confidence; operator
         re-classifies as extractor_gap by hand if the string is in current
         source)

    Co-occurrence guards (calibrated against ezQuake's full blame in 2026-04):
      - Self-relocation: when `name` itself has both a removal AND an addition
        in the same commit, the name was MOVED between files (refactor), not
        retired. Skip co-occurrence matching for that commit.
      - String-similarity gate: bulk-cleanup commits frequently retire many
        unrelated names alongside the introduction of one new feature, which
        produces N-to-1 false-positive renames. Require the candidate sibling
        to share enough string structure with `name` to plausibly be the same
        identifier under a new spelling.
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
    self_relocation_commits = {a["commit"] for a in additions}
    if removals:
        for removal in removals:
            co_commit = removal["commit"]
            # Skip relocations: name re-appeared in this same commit, so the
            # removal half is half of a code-move, not a retirement.
            if co_commit in self_relocation_commits:
                continue
            best_sibling: str | None = None
            best_ratio = 0.0
            for sibling, sibling_events in blame.items():
                if sibling == name or sibling not in source_backed_names:
                    continue
                for se in sibling_events:
                    if se["event"] == "addition" and se["commit"] == co_commit:
                        ratio = SequenceMatcher(None, name, sibling).ratio()
                        if ratio > best_ratio:
                            best_ratio = ratio
                            best_sibling = sibling
                        break
            if best_sibling is not None and best_ratio >= RENAME_SIMILARITY_LOW:
                confidence = "high" if best_ratio >= RENAME_SIMILARITY_HIGH else "medium"
                return {
                    "classification": "renamed",
                    "confidence": confidence,
                    "rename_to": best_sibling,
                    "rename_at_commit": co_commit,
                    "rename_at_date": removal["date"],
                    "rename_similarity": round(best_ratio, 3),
                }
        last_removal = removals[-1]
        return {
            "classification": "retired_pre_walk_floor",
            "confidence": "high",
            "retired_at_commit": last_removal["commit"],
            "retired_at_date": last_removal["date"],
            "last_source_file_pre_walk": last_removal.get("file"),
            # last_source_line_pre_walk is intentionally omitted -- diff blame
            # doesn't preserve line numbers cleanly; the schema treats this
            # field as optional.
        }
    # Additions only, or other shapes -- operator review needed.
    return {
        "classification": "aspirational_documentation",
        "confidence": "low",
        "evidence_note": (
            "Blame events present but no clear rename or retirement signal. "
            "If string IS in current HEAD source, operator should re-classify "
            "as extractor_gap with a HANDOVER sidequest reference."
        ),
    }
