# qw-oracle/scripts/extractors/ktx/

KTX handlers (libclang, server-only). KTX is the QuakeC-replacement game module hosted by MVDSV, so `extract.py` mirrors the MVDSV driver's chunked-pool shape with one source root and one variant (`server`) per TU over top-level `src/*.c`; the `src/qwprot/` submodule is header-only and reached via `-I`, never parsed as a TU.

## Documentation index

| When you need... | Read... |
|---|---|
| Excluded artifact families + drop-list rationale (indexed cvar families, pre-decided SKIPs, later-phase appends) | `OUT_OF_SCOPE.md` |

## Always-on rules

- **Two handler families.** Engine-entity handlers (`_handler_cvars.py`, `_handler_commands.py`, `_handler_info_keys.py`, `_handler_log_templates.py`, `_handler_match_events.py`) feed `entities` + `<type>_versions`; gameplay handlers (`_handler_modes.py`, `_handler_gameplay_tables.py`, `_handler_gameplay_taxonomies.py`, `_handler_shipped_config.py`) feed the `gameplay_*` tables under `gameplay_source='ktx'` through the loader's `load-ktx-modes` / `load-ktx-taxonomies` / gameplay subcommands.
- **`_handler_match_events.py` is XSD-driven, not libclang** -- the lone such handler in the lineup; it reads the match-event schema and emits `match_event` rows with their emission call sites.
- **`seeds/modes-augment.yaml`** is hand-authored (committed); `output/` is regenerated and committed; `tests/` cover the three gameplay handlers (pytest).
- **info_keys emit every literal call site** (`SetUserInfo` write, `ezinfokey` / `iKey` read) with operation tagging, aligned with MVDSV -- the producer-only filter was dropped 2026-05-27 (`docs/arc-history.md`).
- `OUT_OF_SCOPE.md` is append-only per phase: a "missing entity" question is answered there first.
