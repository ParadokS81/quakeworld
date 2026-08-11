# F-D4a reconciliation for ezquake help-JSON PRs

Extracted from quakeworld HANDOVER.md (pre-migration, lines 42-46) at the chunk-6 W17 migration, 2026-08-11.

All 4 merged, none reconciled yet (sweep 2026-08-04) -- PR #1127 (macros) merged 2026-06-06; #1128 (commands) merged 2026-06-06; #1130 (cvars) merged 2026-05-26; #1131 (cmdline_params) merged 2026-06-06 -- all confirmed via GitHub API. None of the 4 reconciliation UPDATEs has actually run (36/156/58/49 guarded rows respectively still carry `description_origin='synthesized'`). Local-tree re-extraction status varies per type: **cvars ready now** -- all 58 guarded rows already show populated `help_desc` in `cvar_versions` HEAD (a clean extract already happened at some point), the SQL below can run immediately with no further prep. Commands partially ready (6/156 populated). Macros and cmdline_params show 0 ready each -- need `extract-tag --project ezquake --version head --force` before their SQL will match anything.

## SQL snippets (macros verbatim from the source entry; commands/cvars/cmdline_params spelled out per the source's stated substitution rule — not yet executed)

### macros (verbatim from the source entry)

```sql
UPDATE entities SET description_origin = NULL WHERE project='ezquake' AND type='macro' AND description_origin='synthesized' AND id IN (SELECT entity_id FROM macro_versions WHERE version='head' AND NULLIF(TRIM(help_desc),'') IS NOT NULL);
```

Also inline in `derive-entity-description.ts:deriveMacro`.

### commands

Same shape, `type='command'`, table `command_versions` -- CAVEAT: exclude `name LIKE 'dev_%'` (10 commands intentionally diverge -- L1 has rich prose, upstream ships short markers; releasing their guard would downgrade L1). Spelled out per the source entry's stated substitution rule:

```sql
UPDATE entities SET description_origin = NULL WHERE project='ezquake' AND type='command' AND description_origin='synthesized' AND name NOT LIKE 'dev_%' AND id IN (SELECT entity_id FROM command_versions WHERE version='head' AND NULLIF(TRIM(help_desc),'') IS NOT NULL);
```

### cvars

Same shape, `type='cvar'`, table `cvar_versions` -- no divergence exclusion needed, all 58 L1 entries match the PR-payload prose exactly; documented inline in `apps/qw-oracle/scripts/insert-helpjson-synthesis-variables.py` header. Spelled out per the source entry's stated substitution rule:

```sql
UPDATE entities SET description_origin = NULL WHERE project='ezquake' AND type='cvar' AND description_origin='synthesized' AND id IN (SELECT entity_id FROM cvar_versions WHERE version='head' AND NULLIF(TRIM(help_desc),'') IS NOT NULL);
```

### cmdline_params

Same shape, `type='cmdline_param'`, table `cmdline_param_versions` -- no divergence exclusion needed (conservative descriptions match on both sides); documented inline in `apps/qw-oracle/scripts/insert-helpjson-synthesis-cmdline_params.py` header. Spelled out per the source entry's stated substitution rule:

```sql
UPDATE entities SET description_origin = NULL WHERE project='ezquake' AND type='cmdline_param' AND description_origin='synthesized' AND id IN (SELECT entity_id FROM cmdline_param_versions WHERE version='head' AND NULLIF(TRIM(help_desc),'') IS NOT NULL);
```

Note: `-ruleset` and `-nostdout` reconciliation should wait for their separate description-sharpening follow-ups (PR #1132/#1133 -- see the `rulesets.c` and `sys_posix.c` HANDOVER small-followup rows) so the reconciled text carries the fuller post-fix description, not the conservative pre-fix one.
