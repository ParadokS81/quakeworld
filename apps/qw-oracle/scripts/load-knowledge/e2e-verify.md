# E2E verification queries - Phase 2b

Run against `apps/qw-oracle/data/knowledge.db` after loading ezQuake 3.6.9 and head.

## Schema populated

```sql
SELECT 'entities' AS t, COUNT(*) FROM entities
UNION ALL SELECT 'cvar_versions (3.6.9)', COUNT(*) FROM cvar_versions WHERE version='3.6.9'
UNION ALL SELECT 'cvar_versions (head)',  COUNT(*) FROM cvar_versions WHERE version='head'
UNION ALL SELECT 'change_events',         COUNT(*) FROM change_events
UNION ALL SELECT 'transitions',           COUNT(*) FROM source_state_transitions
UNION ALL SELECT 'schema_meta',           COUNT(*) FROM schema_meta;
```

Expected shape (counts approximate):
- entities: 2900+
- cvar_versions 3.6.9: ~2700
- cvar_versions head: ~2900
- change_events: low hundreds (depends on real delta)
- transitions: matches initial entity count + some re-added/removed
- schema_meta: 6+ keys

## cl_fakeshaft default change (spike fact)

```sql
SELECT ce.from_version, ce.to_version, ce.old_value, ce.new_value,
       ce.commit_sha, ce.pr_number, ce.pr_title
FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.canonical_id = 'ezquake:cvar:cl_fakeshaft'
  AND ce.field_name = 'default_value';
```

Expected: at least one row with `old_value='0'`, `new_value='1'`, `commit_sha` populated, `pr_number` populated after enrichment.

## Creations in head not present in 3.6.9

```sql
SELECT e.canonical_id, ce.to_version, ce.commit_sha, ce.pr_title
FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.project='ezquake' AND ce.change_kind='created' AND ce.to_version='head'
ORDER BY e.canonical_id;
```

Expected: the set of new cvars added since 3.6.9. Spot-check at least one against the ezQuake commit log.

## Cvar history of cl_bob

```sql
SELECT cv.version, cv.default_value, cv.source_file, cv.source_line
FROM cvar_versions cv
JOIN entities e ON e.id = cv.entity_id
WHERE e.canonical_id = 'ezquake:cvar:cl_bob'
ORDER BY cv.version;
```

Expected: two rows, one per version, likely identical default values.

## Source-state audit trail

```sql
SELECT reason, COUNT(*)
FROM source_state_transitions
GROUP BY reason;
```

Expected: `initial_observation` >> everything else; small number of `re_added` or `removed_from_head` if the delta shows them.

## schema_meta keys

```sql
SELECT key, value FROM schema_meta ORDER BY key;
```

Expected keys: `schema_version`, `extractor_version`, `last_extraction_run_at`, `last_enrichment_run_at`, `ezquake:source_repo_commit`, `ezquake:source_repo_tag`.
