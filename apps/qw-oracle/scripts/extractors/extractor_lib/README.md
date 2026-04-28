# extractor_lib (Tier 1: shared infrastructure)

Tier 1 of the QW Oracle Layer 1 extractor architecture. Houses cross-project building blocks that every libclang-based extractor (ezQuake, FTE, QWCL, MVDSV, future forks) depends on.

## What lives here

| File | Purpose |
|---|---|
| `clang_config.py` | libclang flag profiles per project + variant (client / server / Windows / Apple / etc.). Each project adds entry functions like `clang_args_<project>_for`, `clang_args_<project>_win_for`. |
| `_visitor.py` | `Visitor` base class + `walk_tu_dispatch` shared cursor walker. Every Visitor handler subclasses this. |
| `_resolve.py` | Cursor-resolution helpers (`resolve_fn_ref`). Lifted from per-handler copies in v17 to unify the permissive-fallback policy. |
| `__init__.py` | Package marker; documents Tier 1 scope. |

Handlers that don't fit the Visitor shape (e.g. `KeynamesEzquakeHandler` walks the AST itself) are not constrained by a shared Protocol -- they document their own `process_file` shape in their docstring and are dispatched via `extract.py`'s `collect_handlers`.

## What does NOT live here

- **Project-specific handlers.** Those live at `<project>/_handler_*.py`. The four current projects (ezQuake, FTE, QWCL, MVDSV) each have their own handler set. See `EXTRACTOR-PLAYBOOK.md` § Three-tier handler architecture.
- **Family-base handlers (Tier 2).** Once a fork (e.g., unezQuake → ezQuake) lands and subclassing pressure justifies it, a Tier 2 family-base might lift here as `handler_<family>_<type>.py`. Today the directory is Tier 1 only.
- **Per-project drivers.** Each project owns `<project>/extract.py`.

## Adding a new shared module

If you find yourself writing a helper used by ≥2 projects, lift it to a `_<name>.py` module here. Keep the import path stable: project handlers import as `from extractor_lib._<name> import <symbol>`. Don't add re-exports through `__init__.py` — the explicit module path is clearer and avoids the "shared base class" framing this directory carried pre-2026-04-28.

## See also

- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` — full architecture explanation, registration pattern catalog, porting checklist.
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` — how to validate Layer 1 extractor output post-ship.
