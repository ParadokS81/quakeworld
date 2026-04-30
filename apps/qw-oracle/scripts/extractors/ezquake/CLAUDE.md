# qw-oracle/scripts/extractors/ezquake/

ezQuake handlers (libclang). Reference pattern for forks -- unezQuake will subclass these handlers via the parent-project hook in `extractor_lib/`.

## Documentation index

| When you need... | Read... |
|---|---|
| Excluded artifact families + drop-list rationale | `OUT_OF_SCOPE.md` |
| AST-vs-regex extraction spike report (2026-04-18 historical decision record) | `diagnostics/extraction-comparison-report.md` |

## Always-on rules

- **Conditional macros (27)** pre-defined in `extract.py` to drive libclang's preprocessor.
- **Dual client/server parse** -- each entity is the union of two TU parses.
- **`_legacy/` retired-handler archive** -- under `_*/` exclusion; not a live handler dir.
- **`diagnostics/`** is mixed -- `.log` files are debug emissions (regen on demand); the AST-spike report is hand-authored historical record (indexed above). **`seeds/`** are hand-authored taxonomies (committed).
- Don't shape-shift handler signatures without a fork-impact pass against unezQuake.
