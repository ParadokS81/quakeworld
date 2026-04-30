# qw-oracle/scripts/extractors/fte/

FTE handlers (libclang). FTE is a multi-game source tree; ezQuake-compatible cvars surface via the QW client TU and the bundled `ezhud` plugin.

## Documentation index

| When you need... | Read... |
|---|---|
| Excluded artifact families + drop-list rationale | `OUT_OF_SCOPE.md` |

## Always-on rules

- **Plugin source-root** -- `_handler_ezhud.py` extracts ezhud-bundled cvars and merges into the main FTE entity stream (plugins reach loaders via v-table calls, not direct CALL_EXPR).
- **Conditional macros** narrow the parse to the QW + GL ezQuake-compat slice; non-QW games (Q2, H2, etc.) are out of scope.
- **No client/server split** -- single TU per pass.
