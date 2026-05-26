-- 017_command_legacy_alias.sql
-- Persist Cmd_AddLegacyCommand alias relationship from extractor AST.
-- The ezQuake + FTE command handlers already emit `legacy_alias_of` in the
-- AST entry when Cmd_AddLegacyCommand("old_name", "new_name") is detected,
-- but the loader dropped the field for lack of a storage column. This
-- column persists the renamed-from -> renamed-to relationship so consumers
-- (MCP queries, audit walks) can resolve legacy aliases instead of
-- treating them as standalone commands.
--
-- Discovered during the ezQuake help-JSON empty-entries audit (PRs #1128,
-- #1131); arc scope at
-- docs/superpowers/parking/2026-05-27-l1-extractor-refinements-mini-arc.md
-- (Item 1).

ALTER TABLE command_versions
  ADD COLUMN legacy_alias_of TEXT;
