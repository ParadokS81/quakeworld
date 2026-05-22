-- 016_l1_inferred_category.sql
-- Add LLM-derived category signal to cvar_versions + command_versions.
-- KTX, MVDSV, QWCL have no source-truth grouping mechanism (unlike ezQuake's
-- Cvar_SetCurrentGroup -> group_name_in_source). This column carries an
-- LLM-derived function-based category per entity, paired with a provenance
-- sibling that records {model}|{prompt_version} so the signal can be
-- distinguished from source-truth groups and re-derived per pass.
--
-- Spec: docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md
-- Plan: docs/superpowers/plans/2026-05-22-ktx-l1-categorize/README.md

ALTER TABLE cvar_versions
  ADD COLUMN category_inferred TEXT,
  ADD COLUMN category_inferred_origin TEXT;

ALTER TABLE command_versions
  ADD COLUMN category_inferred TEXT,
  ADD COLUMN category_inferred_origin TEXT;
