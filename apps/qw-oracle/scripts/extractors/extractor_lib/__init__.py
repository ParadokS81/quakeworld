"""Tier 1 shared infrastructure for QW Oracle Layer 1 AST extractors.

Houses the cross-project building blocks that every extractor reuses:
  - clang_config.py    libclang flag profiles per project + variant
  - _visitor.py        Visitor protocol + walk_tu_dispatch shared walker
  - _resolve.py        cursor-resolution helpers (resolve_fn_ref)

Project-specific handlers live in <project>/_handler_*.py, not here. See
EXTRACTOR-PLAYBOOK.md for the three-tier handler architecture.
"""
