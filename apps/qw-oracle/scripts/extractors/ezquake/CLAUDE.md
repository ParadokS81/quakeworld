# qw-oracle/scripts/extractors/ezquake/

ezQuake handlers (libclang). Reference pattern for forks -- unezQuake will subclass these handlers via the parent-project hook in `extractor_lib/`.

## Documentation index

| When you need... | Read... |
|---|---|
| Excluded artifact families + drop-list rationale | `OUT_OF_SCOPE.md` |

## Always-on rules

- **Conditional macros (27)** pre-defined in `extract.py` to drive libclang's preprocessor.
- **Dual client/server parse** -- each entity is the union of two TU parses.
- **`_legacy/` retired-handler archive** -- under `_*/` exclusion; not a live handler dir.
- **`diagnostics/`** holds debug log emissions and a 2026-04-18 AST-vs-regex extraction-spike report (historical decision record). Folder is excluded from orphan detection via the app `## Excluded paths` declaration in `apps/qw-oracle/CLAUDE.md`. **`seeds/`** are hand-authored taxonomies (committed).
- Don't shape-shift handler signatures without a fork-impact pass against unezQuake.
- **Help-JSON classifications** -- `seeds/help_json_classifications.yaml` records the durable classification of every doc_only entity. New doc_only entities trigger `extraction-review` findings until classified via `python3 scripts/classify-help-json.py --project ezquake`. PR-digest output at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-cleanup.md`.
