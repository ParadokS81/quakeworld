#!/usr/bin/env python3
"""Tests for concat_string_literals + concat_string_literals_compact + _strip_and_concat.

Run directly: python3 apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py
Exit 0 = all pass. Exit 1 = first failure printed.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXTRACTORS_DIR = HERE.parent.parent  # apps/qw-oracle/scripts/extractors/
sys.path.insert(0, str(EXTRACTORS_DIR))

from extractor_lib._source import (  # noqa: E402
    _strip_and_concat,
    concat_string_literals,
    concat_string_literals_compact,
)


FAILURES: list[str] = []


def assert_eq(actual, expected, label: str) -> None:
    if actual != expected:
        FAILURES.append(f"FAIL {label}: expected {expected!r}, got {actual!r}")


def test_strip_and_concat_basic_pair():
    parts, all_literal = _strip_and_concat(['"foo"', '"bar"'])
    assert_eq(parts, ['foo', 'bar'], 'strip_and_concat basic pair: parts')
    assert_eq(all_literal, True, 'strip_and_concat basic pair: all_literal')


def test_strip_and_concat_null_terminator_returns_none():
    parts, all_literal = _strip_and_concat(['"foo"', 'NULL'])
    assert_eq(parts, None, 'strip_and_concat NULL terminator: parts None')
    assert_eq(all_literal, False, 'strip_and_concat NULL terminator: all_literal False')


def test_strip_and_concat_empty_input():
    parts, all_literal = _strip_and_concat([])
    assert_eq(parts, None, 'strip_and_concat empty: parts None')


def test_strip_and_concat_non_literal_token():
    parts, all_literal = _strip_and_concat(['"foo"', 'identifier_token'])
    assert_eq(parts, ['foo'], 'strip_and_concat non-literal: parts')
    assert_eq(all_literal, False, 'strip_and_concat non-literal: all_literal False')


def test_concat_string_literals_basic():
    assert_eq(concat_string_literals(['"hello"']), 'hello', 'canonical basic')
    assert_eq(concat_string_literals(['"foo"', '"bar"']), 'foobar', 'canonical pair concat')


def test_concat_string_literals_unescapes():
    assert_eq(
        concat_string_literals([r'"line1\nline2"']),
        'line1\nline2',
        'canonical \\n -> newline'
    )
    assert_eq(
        concat_string_literals([r'"a\"b"']),
        'a"b',
        'canonical \\" -> "'
    )
    assert_eq(
        concat_string_literals([r'"path\\to\\file"']),
        'path\\to\\file',
        'canonical \\\\ -> \\'
    )


def test_concat_string_literals_null_returns_none():
    assert_eq(concat_string_literals(['NULL']), None, 'canonical NULL -> None')
    assert_eq(concat_string_literals([]), None, 'canonical empty -> None')


def test_concat_string_literals_compact_basic():
    assert_eq(concat_string_literals_compact(['"hello"']), 'hello', 'compact basic')


def test_concat_string_literals_compact_collapses_newlines():
    assert_eq(
        concat_string_literals_compact([r'"line1\nline2"']),
        'line1 line2',
        'compact \\n -> space'
    )
    assert_eq(
        concat_string_literals_compact([r'"col1\tcol2"']),
        'col1 col2',
        'compact \\t -> space'
    )
    assert_eq(
        concat_string_literals_compact([r'"a\"b"']),
        'a"b',
        'compact \\" -> "'
    )


def test_concat_string_literals_compact_preserves_other_escapes():
    assert_eq(
        concat_string_literals_compact([r'"path\\file"']),
        r'path\\file',
        'compact preserves \\\\ verbatim'
    )


def test_concat_string_literals_compact_null_returns_none():
    assert_eq(concat_string_literals_compact(['NULL']), None, 'compact NULL -> None')


def main() -> int:
    test_strip_and_concat_basic_pair()
    test_strip_and_concat_null_terminator_returns_none()
    test_strip_and_concat_empty_input()
    test_strip_and_concat_non_literal_token()
    test_concat_string_literals_basic()
    test_concat_string_literals_unescapes()
    test_concat_string_literals_null_returns_none()
    test_concat_string_literals_compact_basic()
    test_concat_string_literals_compact_collapses_newlines()
    test_concat_string_literals_compact_preserves_other_escapes()
    test_concat_string_literals_compact_null_returns_none()

    if FAILURES:
        for f in FAILURES:
            print(f)
        print(f"\n{len(FAILURES)} failure(s)")
        return 1
    print("All tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
