# qw-oracle/scripts/extractors/extractor_lib/

Shared Python helpers underpinning every libclang-based extractor: Visitor pattern, clang configuration, source-line resolution.

## Documentation index

| When you need... | Read... |
|---|---|
| What each helper does + when to extend vs subclass | `README.md` |

## Always-on rules

- **Underscore-prefix files** (`_visitor.py`, `_resolve.py`, `_source.py`, `_cvar_shared.py`) are internal helpers -- private API for per-codebase handlers.
- **`clang_config.py`** is public -- per-codebase `extract.py` imports + extends.
- **No engine-specific logic here** -- anything codebase-specific belongs in a per-codebase handler.
