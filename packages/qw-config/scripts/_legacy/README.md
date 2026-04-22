# Archived legacy libclang extractors

These 8 scripts were the original per-entity ezQuake AST extractors. Each one
parsed every `.c` file independently (with its own client + server variants
where applicable) and produced one JSON file in
`packages/qw-config/src/data/`.

They have been **superseded** by `extract-ezquake-unified.py` and the handler
modules under `extractor_lib/`. The unified driver parses each file once and
dispatches a shared cursor walk to all handlers simultaneously, with
`multiprocessing.Pool` across files. Measured on a Ryzen 9 3900X: ~14s
end-to-end per tag vs ~830s for these legacy scripts serial -- roughly 60x.

Output parity was verified via per-entity natural-key set equality + deep
value compare across 4 tags (HEAD + 3.6.6 + 3.6.0 + 3.2.3), including the
flat-repo-layout era (3.2.3) and tags missing `help_macros.json` /
`help_cmdline_params.json`. 32/32 PASS.

## What's here

| Legacy script | Ported to |
|---|---|
| `extract-ezquake-commands-clang.py` | `extractor_lib/handler_commands.py` |
| `extract-ezquake-cvars-clang.py` | `extractor_lib/handler_cvars.py` |
| `extract-ezquake-macros-clang.py` | `extractor_lib/handler_macros.py` |
| `extract-ezquake-cmdline-clang.py` | `extractor_lib/handler_cmdline.py` |
| `extract-ezquake-hud-elements-clang.py` | `extractor_lib/handler_hud_elements.py` |
| `extract-ezquake-asset-cvar-bindings-clang.py` | `extractor_lib/handler_asset_cvar_bindings.py` |
| `extract-ezquake-asset-loader-sites-clang.py` | `extractor_lib/handler_asset_loader_sites.py` |
| `extract-ezquake-keynames-clang.py` | `extractor_lib/handler_keynames.py` |

## Not archived (still in `scripts/`)

These three were never part of the libclang unification -- they use text/regex
parsing and are unaffected by the shared-walk work:

- `extract-ezquake-flag-bits-clang.py` (despite the `-clang` suffix, no libclang)
- `extract-ezquake-rulesets-clang.py`
- `extract-ezquake-token-primitives-clang.py`

Also untouched: `extract-fte-cvars-clang-check.py` (FTE, separate source).

## Why keep these around

Kept as a fallback reference in case the unified driver regresses on a
historical tag during full backfill, or if we need to compare output shapes
during a future schema change. Each script can still be run standalone:

```
python3 _legacy/extract-ezquake-commands-clang.py --repo-root <path> --output <out.json>
```

If you're ever tempted to modify one of these, stop: modify the corresponding
`extractor_lib/handler_*.py` instead. These files should not drift.
