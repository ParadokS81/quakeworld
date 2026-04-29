# SCHEMA.md doc-style inconsistency

**Added:** 2026-04-27 (evening, surfaced during game-mechanics arc 1 Task 2).
**Updated:** 2026-04-29 (preamble + table map refreshed in commit `ca64d72`; scope broadened -- see "What still needs work" below).
**Status:** Partially addressed. Preamble + table map are current as of v18. Per-table body refresh + structural-style harmonization remain.
**Verification first:** `grep -nE "^## |^### v" apps/qw-oracle/SCHEMA.md | head -30` -- three competing structural styles still coexist: topical H2 (`## Map knowledge layer`, `## Cross-cutting notes`), per-version H2 (now four instances: `## v14`, `## v15`, `## v16`, `## v17` -- grew from single-instance at entry-time as MVDSV + cross-extractor arcs added schema bumps), per-version H3 (`### v10:`, `### v11:`). The drift makes Option A (topical-only) more invasive than originally estimated -- four per-version sections to convert, not just one.

### What happened originally

Task 2 of the game-mechanics arc 1 plan instructed: *"Append v14 section after the last v13 sub-heading. Add (matching the format of the v13 section verbatim -- read it first):"* followed by a 20-line markdown block. The implementer ran the prerequisite grep, found that no `## v13` section exists in SCHEMA.md, and followed the literal plan instruction anyway -- appending a new `## v14 (date): description` H2 section. Commit `8555f96`.

This introduced a third style nobody else uses. The doc previously had two:

- **Topical H2:** `## Map knowledge layer` documents v13's content thematically with a column-table + bold-prefixed paragraphs.
- **Per-version H3 inside `## Cross-cutting notes`:** `### v10:`, `### v11:` document additive migrations as version-numbered sub-sections.

The v14 entry now reads as a `## v14`-style top-level heading, matching neither.

### What was addressed 2026-04-29

Doc-refresh commit `ca64d72` (Chunk 2 of the doc-hygiene session) updated the preamble + table map only:

- Preamble now states schema v18 (was v12) with explicit currency caveat warning that per-table sections still reference pre-2026-04-25 paths and pre-Phase-6 counts.
- Table map adds the 4 MVDSV-introduced version tables (`protocol_message_versions`, `info_key_versions`, `log_template_versions`, `qc_builtin_versions`), the 4 qw-namespace tables (`maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`), and `cvar_alias_versions`. Total bumped from "22 at v12+v13" to **31 at v18**.
- Migration chain summary added covering v9 through v18.

### What still needs work (broadened scope)

Three open items for the next SCHEMA.md edit:

1. **Per-table body refresh.** Every `Populated by:` line in the per-table sections cites pre-2026-04-25 `packages/qw-config/scripts/extract-ezquake-*-clang.py` paths. Real paths are `apps/qw-oracle/scripts/extractors/<project>/_handler_*.py` (post-2026-04-28 architecture consolidation). Per-type "Count at head" figures are pre-Phase-6 (e.g. `cvar_versions` says 2901; current ezquake@head is 2899).
2. **Structural-style harmonization.** Three styles still coexist (see Verification grep). Two reshape options:
   - **Option A -- Topical-only.** Rename `## v14 (2026-04-27): game-mechanics tables (id1 baseline)` to `## Game mechanics knowledge layer`. Restructure body to match `## Map knowledge layer` template (column-table + bold-prefixed paragraphs + design-rationale links). Smaller edit; aligns with the "topical, not chronological" framing.
   - **Option B -- Per-version-only.** Promote `### v10:` and `### v11:` H3s to H2 sections; relocate v13 content from `## Map knowledge layer` into `## v13 (2026-04-27): map knowledge layer`; v14 already conforms. More invasive but produces chronologically-traceable schema history.
3. **entity-types.md companion refresh** -- the per-entity-type doc at `apps/qw-oracle/docs/entity-types.md` carries the same path-staleness pattern (every `Sources:` block cites `packages/qw-config/scripts/`) and is ezQuake-only. A scope-and-currency header was added 2026-04-29 (`ca64d72`) but full refresh covering FTE / QWCL / MVDSV / `qw` is queued. Treat the two docs as one refresh arc.

### Pressure

Low. The preamble facts are now correct; only the bodies are inconsistent and partially stale. Address before the next major SCHEMA.md edit (e.g. when KTX onboarding adds new entity types -- that's a natural time to sweep).

### Related

- SCHEMA.md current state: `apps/qw-oracle/SCHEMA.md`
- v14 section added in commit `8555f96`
- Plan that produced the inconsistency: `docs/superpowers/plans/2026-04-27-qw-oracle-game-mechanics-id1-baseline.md` Task 2

---
