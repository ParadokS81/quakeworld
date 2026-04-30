# qw-oracle/scripts/extractors/mvdsv/

MVDSV handlers (libclang). Server-side only; no client snapshot. MVDSV-introduced entity types: `info_key`, `log_template`, `protocol_message`, `qc_builtin`.

## Documentation index

| When you need... | Read... |
|---|---|
| Excluded artifact families + drop-list rationale | `OUT_OF_SCOPE.md` |
| Pass-1 extraction notes (handler design, ambiguities) | `notes-pass-1.md` |
| Validation-fixture catalog (production cvar/cmd dump + KTX-progs filter lists) | `validation-fixtures/README.md` |

## Always-on rules

- **Server-only** -- slipgate consumer doesn't snapshot mvdsv; no client TU.
- **`validation-fixtures/`** -- hand-authored fixtures (committed); the README inside is indexed (above), the dump + filter files are not.
- **Four MVDSV-introduced types** route through dedicated handlers (`_handler_info_keys.py`, `_handler_log_templates.py`, `_handler_protocol.py`, `_handler_qc_builtins.py`).
