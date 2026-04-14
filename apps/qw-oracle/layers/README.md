# Layers

The three knowledge layers. See `../CLAUDE.md` and `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`.

- `facts/` - Layer 1. Deterministic extraction from source code. SQLite tables (`kb_cvars`, `kb_commands`, etc.).
- `claims/` - Layer 2. LLM-interpreted community claims from chat logs. SQLite + FTS5.
- `concepts/` - Layer 3. Hand-written markdown cross-link notes.
