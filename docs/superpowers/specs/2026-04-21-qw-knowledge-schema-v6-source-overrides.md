---
title: Knowledge Schema v6 -- source_overrides blame index
date: 2026-04-21
status: approved
supersedes: none
superseded_by: none
---

# Knowledge Schema v6

## Motivation

Phase 2f stress tests A2 revealed that 20/25 ruleset modifications and 8/8 hud_element modifications carry null PR after enrichment. The cause: blame anchors at the entity's primary `source_line` (the struct-instance line), not at the line where the field was declared in the struct header. The instance line belongs to a commit that has nothing to do with the field change. Git blame returns the instance-declaration commit; PR lookup misses.

The same pattern affects cvar default-value mods. Many cvar defaults change via `Cvar_SetDefaultAndValue` or `Cvar_ResetVar` call sites elsewhere in the codebase, but blame anchors at the cvar_t declaration line.

Gap 3 (struct-field blame) and Gap 4 (cvar default-value via call sites) are the same architectural shape: the right source line depends on WHICH FIELD changed, not just which entity.

## Design

One new table keyed on (entity_id, version, field_name) that records per-field source locations. Extractors populate it during the normal extract pipeline. The diff pipeline's blame-resolution step consults the table first and falls back to the entity's primary source_line if no override exists.

```sql
CREATE TABLE source_overrides (
  entity_id     INTEGER NOT NULL REFERENCES entities(id),
  version       TEXT NOT NULL,
  field_name    TEXT NOT NULL,
  source_file   TEXT NOT NULL,
  source_line   INTEGER NOT NULL,
  source_column INTEGER,
  override_kind TEXT NOT NULL CHECK (override_kind IN (
                  'struct_field_decl',
                  'call_site',
                  'header_declaration'
                )),
  extracted_at  TEXT NOT NULL,
  PRIMARY KEY (entity_id, version, field_name)
);
CREATE INDEX idx_source_overrides_entity ON source_overrides(entity_id, version);
```

**override_kind** is informational (diagnostic use only): tells a reader what kind of source site this is. Diff-pipeline logic doesn't branch on it.

**Primary key (entity_id, version, field_name)** means one override per field per version. Re-running an extractor replaces the row. Missing rows mean "fall back to entity's primary source_line".

## Population by type

**Rulesets:** The rulesets extractor currently emits `source_file`, `source_line`, `locked_cvars_json`. After v6 it also emits a map of `field_name` -> `(source_file, source_line)` for each struct field (maxfps, restrict_triggers, ..., restrict_setex). Source location is where the field is DECLARED in `rulesetDef_t` (currently `rulesets.c:30-43` but varies by tag). Emit override_kind='struct_field_decl'.

**HUD elements:** The `hud_t` struct is declared in `hud.h:67-118`. Extractor emits per-field overrides for each field of hud_t, pointing at the header line. Emit override_kind='header_declaration'.

**Cvars:** Scan for call sites of default-mutating APIs: `Cvar_SetDefaultAndValue(cvar*, ...)`, `Cvar_ResetVar(cvar*)`, and any `Cvar_Set("cvarname", ...)` call that's wrapped by a default-setting idiom. For each call site, resolve the first argument to a cvar entity and emit an override on field `default_value` pointing at the call-site line. Emit override_kind='call_site'. At ezQuake head there are 2 `Cvar_SetDefaultAndValue` call sites (r_texture_cvars.c:202 and cl_view.c:1210) and 4 `Cvar_ResetVar` call sites (2 internal in cvar.c, 1 in config_manager.c:557, 1 in settings_page.c:353). Total initial coverage: ~4 externally-visible call sites per tag. Historical tags may have more via removed APIs.

## Diff-pipeline integration

`diff-versions.ts`'s `resolveBlame` function today takes a `row: Row` (the version row for entity+version) and extracts `source_file` + `source_line` from it. With v6, it should first consult `source_overrides` for (entity_id, to_version, field_name) and prefer the override. Fall back to the entity-level source_file/source_line if no row matches.

For creation events (no field_name), keep entity-level blame (no override lookup).
For deletion events (no field_name), keep entity-level blame at from_version.

## Migration

Standard `CREATE TABLE IF NOT EXISTS` pattern. `SCHEMA_VERSION` bumps 5 -> 6. No entities-table rebuild needed (no CHECK changes).

## Verification

- `SELECT COUNT(*) FROM source_overrides WHERE version='head'` -> roughly 6 (ruleset) * 13 (fields) + 83 (hud_element) * ~10 (fields in hud_t) + 4..8 (cvar call sites) = ~900 rows at head.
- Post-fix A2 (3.6.5 -> 3.6.6): the 20+8 null-PR modifications from Batch 2 should now carry non-null pr_number after enrichment runs against the overridden commit_sha.

## Non-goals

- FTE / MVDSV / KTX struct-field blame (Phase 2d/2e).
- Per-call-site blame for commands (addressed naturally because commands only have one registration site each).
- Backfilling source_overrides for tags already loaded -- a one-shot reload across 5 historical tags is faster than writing a migration script.
