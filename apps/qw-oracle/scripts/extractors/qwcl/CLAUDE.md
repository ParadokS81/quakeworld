# qw-oracle/scripts/extractors/qwcl/

QWCL handlers (libclang). Single canonical tag `2.33` (commit `bf4ac42`). 1996-vintage cvar shape predates the modern declarative families -- handler simplifications reflect that.

## Documentation index

| When you need... | Read... |
|---|---|
| Excluded artifact families + drop-list rationale | `OUT_OF_SCOPE.md` |

## Always-on rules

- **No deep-time walk** -- single canonical tag; pre-`2.33` not in scope.
- **No asset taxonomy** -- 1996-era loader patterns don't match the post-2002 ezQuake/FTE shape.
- **Cvar handler is monolithic** -- `_handler_cvars.py` carries the full vintage-aware logic; no per-family split.
