-- 020_qtv_qwfwd_projects.sql
--
-- Widens the project CHECK allow-list from the original 5 values
-- ('ezquake','fte','mvdsv','ktx','qwcl') to add 'qwfwd' and 'qtv',
-- making both tools first-class Layer 1 projects (QTV + QWFWD extraction arc,
-- 2026-06-05).
--
-- 10 CHECK clauses across 9 tables, all in 002_layer1_schema.sql.
-- Strategy: DROP + re-ADD per clause (Postgres can do this without a table
-- rebuild). Never edit 002 -- schema_migrations sha256 guard rejects edits
-- to applied migrations.
--
-- The 'qw' slug is the game-itself namespace (Project union in types.ts);
-- it has NO project column in any engine table and is NOT in these CHECKs.
-- The new slots are server/proxy tools: 'qwfwd' (C UDP forwarder) and
-- 'qtv' (Go streaming proxy).
--
-- Constraint names verified against pg_constraint on 2026-06-05 (live catalog
-- introspection, F9-corrected query keyed on the 'ezquake' allow-list
-- signature). Names follow the Postgres default `<table>_<col>_check` pattern.
--
-- No explicit BEGIN/COMMIT -- db/migrate.ts wraps each migration in sql.begin().

-- versions.project
ALTER TABLE versions
  DROP CONSTRAINT versions_project_check;
ALTER TABLE versions
  ADD CONSTRAINT versions_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- entities.project
ALTER TABLE entities
  DROP CONSTRAINT entities_project_check;
ALTER TABLE entities
  ADD CONSTRAINT entities_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_extensions.project
ALTER TABLE asset_extensions
  DROP CONSTRAINT asset_extensions_project_check;
ALTER TABLE asset_extensions
  ADD CONSTRAINT asset_extensions_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_path_rules.project
ALTER TABLE asset_path_rules
  DROP CONSTRAINT asset_path_rules_project_check;
ALTER TABLE asset_path_rules
  ADD CONSTRAINT asset_path_rules_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_cvar_bindings.project
ALTER TABLE asset_cvar_bindings
  DROP CONSTRAINT asset_cvar_bindings_project_check;
ALTER TABLE asset_cvar_bindings
  ADD CONSTRAINT asset_cvar_bindings_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- asset_loader_sites.project
ALTER TABLE asset_loader_sites
  DROP CONSTRAINT asset_loader_sites_project_check;
ALTER TABLE asset_loader_sites
  ADD CONSTRAINT asset_loader_sites_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- release_notes.project
ALTER TABLE release_notes
  DROP CONSTRAINT release_notes_project_check;
ALTER TABLE release_notes
  ADD CONSTRAINT release_notes_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- relation_changes.project
ALTER TABLE relation_changes
  DROP CONSTRAINT relation_changes_project_check;
ALTER TABLE relation_changes
  ADD CONSTRAINT relation_changes_project_check
    CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- cvar_alias_versions.target_project
ALTER TABLE cvar_alias_versions
  DROP CONSTRAINT cvar_alias_versions_target_project_check;
ALTER TABLE cvar_alias_versions
  ADD CONSTRAINT cvar_alias_versions_target_project_check
    CHECK (target_project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));

-- cvar_alias_versions.mimics_project (nullable -- no NOT NULL on this column)
ALTER TABLE cvar_alias_versions
  DROP CONSTRAINT cvar_alias_versions_mimics_project_check;
ALTER TABLE cvar_alias_versions
  ADD CONSTRAINT cvar_alias_versions_mimics_project_check
    CHECK (mimics_project IN ('ezquake','fte','mvdsv','ktx','qwcl','qwfwd','qtv'));
