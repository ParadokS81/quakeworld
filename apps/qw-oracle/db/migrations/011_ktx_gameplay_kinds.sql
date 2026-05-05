-- 011_ktx_gameplay_kinds.sql
--
-- Widen the qw-namespace polymorphic CHECK constraints to admit KTX's
-- gameplay-content kinds. Two table touches; eight new kind values total.
--
-- gameplay_entity_defs.kind += 'monster' (Phase 5: bloodfest_monster_array,
-- 13 rows per KTX tag).
--
-- gameplay_mechanics.kind += 7 values:
--   game_mode          (Phase 3: 27 catalog rows -- 17 um_list peers + race
--                       + bloodfest + 8 mutators; per F5)
--   election_type      (Phase 4: 5 rows from electType_t; per F7)
--   score_system       (Phase 5: 3 rows from race scoring_systems; per F10)
--   drop_item          (Phase 5: 30 rows from dropitem_spawn_t; per F11)
--   loc_macro          (Phase 5: 15 rows from teamplay locmacros; per F12)
--   teamplay_message   (Phase 5: 21 rows from teamplay messages; per F13)
--   mode_default       (Phase 3: ~309 rows -- common baseline + per-mode
--                       overlays; per F6 / D12)
--
-- All rows from Phases 3-5 reference gameplay_source_id='ktx' (the
-- gameplay_sources row seeded in Phase 1 Task 5).
--
-- Pure additive; no data backfill required (no prior rows with these
-- kind values exist).

ALTER TABLE gameplay_entity_defs
  DROP CONSTRAINT gameplay_entity_defs_kind_check;

ALTER TABLE gameplay_entity_defs
  ADD CONSTRAINT gameplay_entity_defs_kind_check
  CHECK (kind IN (
    'item','weapon','projectile',
    'monster'
  ));

ALTER TABLE gameplay_mechanics
  DROP CONSTRAINT gameplay_mechanics_kind_check;

ALTER TABLE gameplay_mechanics
  ADD CONSTRAINT gameplay_mechanics_kind_check
  CHECK (kind IN (
    'constant','env_hazard','player_stat',
    'powerup_behavior','armor_model','death_rule',
    'spawn_rule','dm_mode_rule',
    'game_mode','election_type','score_system',
    'drop_item','loc_macro','teamplay_message','mode_default'
  ));
