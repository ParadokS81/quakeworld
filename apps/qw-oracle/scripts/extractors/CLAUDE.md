# qw-oracle/scripts/extractors/

Per-codebase Layer 1 extractors. Three-tier handler architecture: shared `Visitor` -> cross-engine handlers -> per-engine handlers. Forks subclass parent-project handlers; cross-codebase ports write fresh handlers extending only `Visitor`.

## Documentation index

| When you need... | Read... |
|---|---|
| Cross-engine handler pattern + how to add an engine | `EXTRACTOR-PLAYBOOK.md` |
| Validation methodology (post-ship / per-project / cross-project) | `VALIDATION-RUNBOOK.md` |

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `extractor_lib/` | `extractor_lib/CLAUDE.md` | Shared Python helpers (Visitor, clang_config, source resolution) |
| `ezquake/` | `ezquake/CLAUDE.md` | ezQuake handlers (libclang, dual client/server parse, fork hook for unezQuake) |
| `fte/` | `fte/CLAUDE.md` | FTE handlers (plugin source-root, ezhud merge) |
| `mvdsv/` | `mvdsv/CLAUDE.md` | MVDSV handlers (server-side, MVDSV-introduced types) |
| `qwcl/` | `qwcl/CLAUDE.md` | QWCL 2.33 handlers (1996-vintage shape) |

## Always-on rules

- **Multiprocessing pattern** -- per-TU parses isolate libclang state; orchestration in each `extract.py`.
- **libclang for C/C++ ports** (ezquake, fte, mvdsv, qwcl); **tree-sitter for KTX** (QuakeC, separate methodology -- not yet onboarded).
- **Three-tier handlers** -- never duplicate cross-engine logic into a per-engine handler; subclass via `extractor_lib`.
- Use the `onboard-extractor` user-global skill when adding a new codebase, `validate-extractor` for post-ship audits.
