# Phase 1 findings ledger -- id1 audit + gap sweep

Execution 2026-06-12. The detailed audit + gap record (too granular for
`review-findings.md`); material findings are summarized there as F13-F16.

Source of truth audited: `research/repos/qwcl-original/QW/progs/` (id1 QC, 17 .qc
files). Two read-only Workflow fan-outs (Sonnet, waves of 4, ~2s pacing):
- **Audit re-verify:** 15 groups, 0 nulls, 242 cited values, 232 agree, 14
  discrepancies (every discrepancy independently confirmed by a Stage-2 agent),
  0 unresolvable. Every one of the 14 re-read against actual source by the
  executor before classification (F7/F12 discipline -- verify ROLE, not just
  that the line contains the value).
- **Gap sweep:** 17 files, 0 nulls, 115 candidates, 0 needs_new_kind (no D14
  schema escalation). Triaged: 2 seed, 55 gameplay, 7 borderline, 21 plumbing,
  30 dup.

Result: 9 in-place citation corrections + 5 operator-adjudicated disputes + 12
new mechanic rows (Tier 1) + enrichments to 6 existing rows. Entities 37 (values
corrected in place, no row count change); mechanics 41 -> 53.

---

## A. Confirmed audit corrections (9) -- in-place ref/role fixes, value unchanged

All cite the wrong line; the value was right. Source-verified by the executor.

| row | prop | old ref | new ref | value | source evidence |
|---|---|---|---|---|---|
| green_armor | source_ref | items.qc:386 | items.qc:387 | 100 | :386 `type = 0.3`; :387 `value = 100;` |
| yellow_armor | source_ref | items.qc:392 | items.qc:393 | 150 | :392 `type = 0.6`; :393 `value = 150;` (Stage-2 misread; source backs Stage-1) |
| red_armor | source_ref | items.qc:398 | items.qc:399 | 200 | :398 `type = 0.8`; :399 `value = 200;` |
| quad_damage (item) | damage_multiplier_source_ref | combat.qc:127 | combat.qc:130 | 4 | :127 `if (deathmatch == 4)`; :130 `damage = damage * 4;` |
| quad_damage (item) | drop_on_death_source_ref | client.qc:552 | player.qc:552 | infokey_dq | client:552 `ammo_cells=30`; player:552 `if((stof(infokey(world,"dq")))!=0)` in PlayerDie |
| ring_of_shadows | drop_on_death_source_ref | client.qc:568 | player.qc:568 | infokey_dr | player:568 `if((stof(infokey(world,"dr")))!=0)` in PlayerDie |
| rocket_jump_multiplier_default | source_ref | client.qc:517 | defs.qc:443 | 1 | client:517 is the override gate; defs:443 `float rj = 1;` is the default (override_gate_source_ref added) |
| trigger_hurt | retrigger_source_ref | triggers.qc:553 | triggers.qc:555 | 1 | :553 `T_Damage(...)`; :555 `self.nextthink = time + 1;` |
| friendly_fire_teamplay_0 | source_ref | combat.qc:199 | combat.qc:210 | all_damage_applies | :199 is the teamplay==1 guard; :210 `targ.health = targ.health - take;` (reached when no guard fires) |

## B. Operator-adjudicated disputes (5) -- Stage-1 vs Stage-2 disagreed

Operator decision (2026-06-12): "Apply all 5 as stated."

| row / prop | issue | resolution applied |
|---|---|---|
| rocket damage | source is `100 + random()*20` (uniform [100,120), mean 110); row showed fixed 110 | NO CHANGE. 110 is the documented mean; the row's `damage_formula` prop + notes already carry the random range. KTX's fixed-110 override is a Phase 3 carry-forward (F15). |
| grenade direct damage = 0 | row source_ref weapons.qc:600 is the splash-120 call (role-wrong) | source_ref + direct_damage_source_ref -> weapons.qc:618 (GrenadeExplode on player contact). Value 0 stays; notes clarify a direct contact explodes immediately for the 120 splash. |
| drowning damage_initial = 2 | single damage_source_ref pointed at the increment line (:797) | split per-value refs: damage_initial_source_ref -> client.qc:467 (`self.dmg = 2; // initial water damage`). |
| drowning damage_cap = 10 | same single ref | damage_cap_source_ref -> client.qc:799 (`self.dmg = 10;` reset after exceeding 15). Notes corrected: per-tick climbs to a max of 14 then oscillates, 10 is the post-overflow floor. |
| dm2_rules value_text | "respawn_30s_ammo_no_health_respawn" is backwards -- dm2 SUPPRESSES respawn | value_text -> `dm2_items_do_not_respawn_old_rules`. Props rewritten: every item-respawn nextthink is gated on `deathmatch != 2` (health items.qc:328, armor :411, ammo/weapons :868), so in dm2 nothing respawns. |

## C. Gap sweep -- accepted (Tier 1, operator-approved 2026-06-12)

Operator scope decision: **Tier 1 only** (core combat/player/death/spawn/
deathmatch rules); Tier 2 map-entity hazard defaults deferred (section D).

### New mechanic rows (12)

constants (+7): splash_falloff_gradient (combat.qc:275), self_splash_half_damage
(combat.qc:278), lg_direct_zvelocity_boost (weapons.qc:499),
lg_water_discharge_damage_per_cell (weapons.qc:555), ssg_last_shell_fires_shotgun
(weapons.qc:324), best_weapon_drops_lg_in_water (weapons.qc:944),
timelimit_unit_minutes (world.qc:350).
death_rules (+2): death_health_floor -99 (combat.qc:66), suicide_frag_penalty -2
(client.qc:298).
spawn_rules (+2): inter_level_carry_over (client.qc:51; folds carry_over_health_floor
+ carry_over_shells_minimum), spawn_clearance_radius 84 (client.qc:340).
armor_models (+1): armor_pickup_upgrade_gate (items.qc:402).

### Enrichments to existing rows (props added, no count change)

- gib_threshold: lava gib threshold -15 (client.qc:1452), explosive obituary switch
  (client.qc:1361), overkill-scaled gib scatter velocity tiers (player.qc:465-476),
  gib lifetime 10-20s (player.qc:497). [absorbs gib_health_threshold,
  lava_death_gib_threshold, gib_overkill_threshold_low/high,
  gib_velocity_multiplier_low/mid/high, gib_entity_lifetime_min]
- pent_invulnerability_mechanic: hit_sound_cooldown 2s (combat.qc:189).
- ring_invisibility_mechanic: suppresses_pain_frames (player.qc:348).
- dm4_rules: quad-pickup strips armor/cells (items.qc:47), item spawns disabled
  (items.qc:891), quad-expiry restore (client.qc:1064), bonus pent 30s
  (items.qc:1489), grenade fire self-damage 10 (weapons.qc:673).
- dm3_rules: dm3/dm5 backpack rocket floor 5 (items.qc:1574).

### Captured-as-existing (no new artifact -- candidate folded or already present)

- beam_damage_falloff_coefficient (:309), beam_self_damage_factor (:314) -> recorded
  as beam_twin props on the two seed rows (MD-locked design).
- yellow/red_armor_protection_type -> already absorb_pct_yellow/red on
  armor_absorb_formula.
- drowning_dmg_escalation_cap -> already drowning.damage_cap.
- rocket_direct_hit_damage -> already rocket.damage_formula (= dispute B/rocket).
- trigger_hurt_retrigger_cooldown -> already trigger_hurt.retrigger_seconds
  (ref corrected this phase).
- bodyque_slot_count -> DROPPED: world.qc:377 is the queue head spawn, not a clean
  "4" (the count comes from a later loop); cosmetic + uncertain citation.

## D. Gap sweep -- DEFERRED (Tier 2, operator decision: defer to a follow-up arc)

Map-entity hazard defaults. These damage players but are per-map, mapper-set
entity-property defaults -- a different category from the global combat catalog.
Tracked here so a follow-up arc can pick them up; NOT silently dropped.

- doors: DOOR_DEFAULT_DMG 2 (doors.qc:513), SECRET_DOOR_DEFAULT_DMG 2 (doors.qc:759)
- plats: plat_crush_damage 1 (plats.qc:115), plat_dwell_time_top 3 (plats.qc:50),
  train_crush_damage_default 2 (plats.qc:300), train_crush_cooldown 0.5 (plats.qc:226)
- misc: MISC_FIREBALL_DAMAGE 20 (misc.qc:208), MISC_FIREBALL_LAUNCH_INTERVAL_MIN/MAX
  3/8 (misc.qc:201), MISC_EXPLOBOX_HEALTH 20 (misc.qc:246),
  MISC_EXPLOBOX_EXPLOSION_RADIUS_DAMAGE 160 (misc.qc:220), TRAP_LASER_DAMAGE 15
  (misc.qc:320), TRAP_LASER_SPEED 600 (misc.qc:356),
  TRAP_SHOOTER_DEFAULT_FIRE_INTERVAL 1 (misc.qc:419)
- triggers: telefrag_invincible_mutual_kill_damage (triggers.qc:335),
  telefrag_damage_vs_invincible_attacker (triggers.qc:343), teleport_lock_duration
  0.7 (triggers.qc:427), teleport_exit_velocity 300 (triggers.qc:431),
  trigger_push_velocity_multiplier x10 (triggers.qc:581), trigger_push_default_speed
  (triggers.qc:608)
- borderline (7): SECRET_DOOR_BLOCKED_COOLDOWN (doors.qc:682), MISC_FIREBALL_LIFETIME
  (misc.qc:197), TRAP_LASER_LIFETIME (misc.qc:359), plat_retrigger_delay (plats.qc:85),
  pain_sound_cooldown (player.qc:296), death_upward_velocity_gate/max_boost
  (player.qc:595/596)

## E. Full 115-candidate disposition (durable record)

| candidate | source_ref | proposed_kind | disposition (dup_of) |
|---|---|---|---|
| splash_damage_falloff_coefficient | combat.qc:272 | constant | seed |
| splash_self_damage_factor | combat.qc:278 | constant | seed |
| dm4_quad_expiry_restore | client.qc:1064 | dm_mode_rule | gameplay |
| gib_health_threshold | client.qc:1361 | death_rule | gameplay |
| lava_death_gib_threshold | client.qc:1452 | death_rule | gameplay |
| suicide_frag_penalty | client.qc:298 | death_rule | gameplay |
| spawn_clearance_radius | client.qc:340 | spawn_rule | gameplay |
| carry_over_health_floor | client.qc:51 | spawn_rule | gameplay |
| drowning_dmg_escalation_cap | client.qc:798 | env_hazard | gameplay |
| pent_hit_sound_cooldown | combat.qc:189 | powerup_behavior | gameplay |
| beam_damage_falloff_coefficient | combat.qc:309 | constant | gameplay |
| beam_self_damage_factor | combat.qc:314 | constant | gameplay |
| death_health_floor | combat.qc:66 | death_rule | gameplay |
| DOOR_DEFAULT_DMG | doors.qc:513 | env_hazard | gameplay |
| SECRET_DOOR_DEFAULT_DMG | doors.qc:759 | env_hazard | gameplay |
| dm4_bonus_powers_quad_pent_duration | items.qc:1489 | dm_mode_rule | gameplay |
| dm3_dm5_rocket_floor_from_backpack | items.qc:1574 | dm_mode_rule | gameplay |
| yellow_armor_protection_type | items.qc:392 | armor_model | gameplay |
| red_armor_protection_type | items.qc:398 | armor_model | gameplay |
| armor_upgrade_gate_formula | items.qc:402 | armor_model | gameplay |
| armor_respawn_time | items.qc:412 | spawn_rule | gameplay |
| dm4_quad_strips_armor_and_cells | items.qc:47 | dm_mode_rule | gameplay |
| dm4_weapons_ammo_disabled | items.qc:891 | dm_mode_rule | gameplay |
| MISC_FIREBALL_LAUNCH_INTERVAL_MIN | misc.qc:201 | env_hazard | gameplay |
| MISC_FIREBALL_LAUNCH_INTERVAL_MAX | misc.qc:201 | env_hazard | gameplay |
| MISC_FIREBALL_DAMAGE | misc.qc:208 | env_hazard | gameplay |
| MISC_EXPLOBOX_EXPLOSION_RADIUS_DAMAGE | misc.qc:220 | env_hazard | gameplay |
| MISC_EXPLOBOX_HEALTH | misc.qc:246 | env_hazard | gameplay |
| TRAP_LASER_DAMAGE | misc.qc:320 | env_hazard | gameplay |
| TRAP_LASER_SPEED | misc.qc:356 | env_hazard | gameplay |
| TRAP_SHOOTER_DEFAULT_FIRE_INTERVAL | misc.qc:419 | env_hazard | gameplay |
| plat_crush_damage | plats.qc:115 | env_hazard | gameplay |
| train_crush_cooldown | plats.qc:226 | env_hazard | gameplay |
| train_crush_damage_default | plats.qc:300 | env_hazard | gameplay |
| plat_dwell_time_top | plats.qc:50 | env_hazard | gameplay |
| ring_suppresses_pain_animation | player.qc:348 | powerup_behavior | gameplay |
| gib_overkill_threshold_low | player.qc:465 | death_rule | gameplay |
| gib_velocity_multiplier_low_damage | player.qc:468 | death_rule | gameplay |
| gib_overkill_threshold_high | player.qc:470 | death_rule | gameplay |
| gib_velocity_multiplier_mid_damage | player.qc:473 | death_rule | gameplay |
| gib_velocity_multiplier_high_damage | player.qc:476 | death_rule | gameplay |
| gib_entity_lifetime_min | player.qc:497 | death_rule | gameplay |
| telefrag_invincible_mutual_kill_damage | triggers.qc:335 | death_rule | gameplay |
| telefrag_damage_vs_invincible_attacker | triggers.qc:343 | death_rule | gameplay |
| teleport_lock_duration | triggers.qc:427 | spawn_rule | gameplay |
| teleport_exit_velocity | triggers.qc:431 | spawn_rule | gameplay |
| trigger_hurt_retrigger_cooldown | triggers.qc:555 | env_hazard | gameplay |
| trigger_push_velocity_multiplier | triggers.qc:581 | env_hazard | gameplay |
| trigger_push_default_speed | triggers.qc:608 | env_hazard | gameplay |
| ssg_fallback_to_sg_at_one_shell | weapons.qc:324 | constant | gameplay |
| rocket_direct_hit_damage | weapons.qc:385 | constant | gameplay |
| lg_player_zvelocity_boost | weapons.qc:499 | constant | gameplay |
| lg_water_explosion_damage_per_cell | weapons.qc:555 | env_hazard | gameplay |
| grenade_dm4_self_damage_on_fire | weapons.qc:673 | dm_mode_rule | gameplay |
| lg_best_weapon_water_exclusion | weapons.qc:944 | constant | gameplay |
| timelimit_unit_minutes | world.qc:350 | dm_mode_rule | gameplay |
| bodyque_slot_count | world.qc:377 | constant | gameplay |
| SECRET_DOOR_BLOCKED_COOLDOWN | doors.qc:682 | constant | borderline |
| MISC_FIREBALL_LIFETIME | misc.qc:197 | env_hazard | borderline |
| TRAP_LASER_LIFETIME | misc.qc:359 | env_hazard | borderline |
| plat_retrigger_delay | plats.qc:85 | env_hazard | borderline |
| pain_sound_cooldown | player.qc:296 | player_stat | borderline |
| death_upward_velocity_gate | player.qc:595 | death_rule | borderline |
| death_upward_velocity_max_boost | player.qc:596 | death_rule | borderline |
| VEC_HULL2_MIN | defs.qc:332 | constant | plumbing |
| VEC_HULL2_MAX | defs.qc:333 | constant | plumbing |
| DOOR_TRIGGER_TOUCH_COOLDOWN | doors.qc:171 | constant | plumbing |
| DOOR_MESSAGE_COOLDOWN | doors.qc:207 | constant | plumbing |
| DOOR_TRIGGER_FIELD_EXPAND | doors.qc:290 | constant | plumbing |
| DOOR_DEFAULT_SPEED | doors.qc:507 | constant | plumbing |
| DOOR_DEFAULT_WAIT | doors.qc:509 | constant | plumbing |
| DOOR_DEFAULT_LIP | doors.qc:511 | constant | plumbing |
| SECRET_DOOR_HEALTH | doors.qc:573 | env_hazard | plumbing |
| SECRET_DOOR_FIRST_MOVE_PAUSE | doors.qc:622 | constant | plumbing |
| SECRET_DOOR_TOUCH_COOLDOWN | doors.qc:701 | constant | plumbing |
| SECRET_DOOR_DEFAULT_SPEED | doors.qc:772 | constant | plumbing |
| SECRET_DOOR_DEFAULT_WAIT | doors.qc:782 | constant | plumbing |
| plat_default_speed | plats.qc:191 | env_hazard | plumbing |
| train_default_speed | plats.qc:296 | env_hazard | plumbing |
| pain_bubble_count_underwater | player.qc:263 | env_hazard | plumbing |
| water_death_bubble_count | player.qc:412 | env_hazard | plumbing |
| trigger_multiple_default_wait | triggers.qc:130 | spawn_rule | plumbing |
| trigger_counter_default_count | triggers.qc:265 | spawn_rule | plumbing |
| teleport_fog_forward_offset | triggers.qc:409 | spawn_rule | plumbing |
| trigger_push_sound_cooldown | triggers.qc:589 | env_hazard | plumbing |
| carry_over_shells_minimum | client.qc:56 | spawn_rule | dup-flagged (kept as inter_level_carry_over prop -- distinct from start_ammo_shells; same value, different mechanism) |
| rj_default | defs.qc:443 | constant | dup (rocket_jump_multiplier_default) |
| invulnerability_ring_respawn_time | items.qc:1306 | spawn_rule | dup (pentagram.respawn) |
| dm4_bonus_powers_health_threshold | items.qc:1484 | dm_mode_rule | dup (dm4_rules.bonus_threshold) |
| backpack_lifetime_seconds | items.qc:1656 | spawn_rule | dup (backpack) |
| megahealth_rot_start_delay | items.qc:321 | powerup_behavior | dup (megahealth_100.decay_initial) |
| yellow_armor_value | items.qc:393 | armor_model | dup (yellow_armor) |
| red_armor_value | items.qc:399 | armor_model | dup (red_armor) |
| weapon_nailgun_ammo_on_pickup | items.qc:580 | constant | dup (pickup_nailgun) |
| weapon_super_nailgun_ammo_on_pickup | items.qc:588 | constant | dup (pickup_super_nailgun) |
| weapon_super_shotgun_ammo_on_pickup | items.qc:596 | constant | dup (pickup_super_shotgun) |
| weapon_rocket_launcher_ammo_on_pickup | items.qc:604 | constant | dup (pickup_rocket_launcher) |
| weapon_grenade_launcher_ammo_on_pickup | items.qc:612 | constant | dup (pickup_grenade_launcher) |
| weapon_lightning_gun_ammo_on_pickup | items.qc:620 | constant | dup (pickup_lightning_gun) |
| weapon_pickup_respawn_time | items.qc:669 | spawn_rule | dup (pickup_nailgun.respawn) |
| ammo_respawn_time_standard | items.qc:868 | spawn_rule | dup (dm2_rules.ammo_respawn) |
| shells_large_pickup_amount | items.qc:900 | constant | dup (shells_large) |
| shells_small_pickup_amount | items.qc:906 | constant | dup (shells_small) |
| nails_large_pickup_amount | items.qc:928 | constant | dup (nails_large) |
| nails_small_pickup_amount | items.qc:934 | constant | dup (nails_small) |
| rockets_large_pickup_amount | items.qc:957 | constant | dup (rockets_large) |
| rockets_small_pickup_amount | items.qc:963 | constant | dup (rockets_small) |
| cells_large_pickup_amount | items.qc:987 | constant | dup (cells_large) |
| cells_small_pickup_amount | items.qc:993 | constant | dup (cells_small) |
| bullet_pellet_damage | weapons.qc:285 | constant | dup (shotgun) |
| lg_water_dm4_instant_death_damage | weapons.qc:539 | dm_mode_rule | dup (dm4_rules.lg_water_self_damage) |
| lightning_gun_damage_per_tick | weapons.qc:586 | constant | dup (lightning_gun) |
| grenade_dm4_refire_seconds | weapons.qc:671 | dm_mode_rule | dup (grenade_launcher.refire_seconds_dm4) |
| nail_damage | weapons.qc:797 | constant | dup (nailgun/spike) |
| super_nail_damage | weapons.qc:844 | constant | dup (super_nailgun/super_spike) |

## F. KTX cross-source carry-forward (for Phase 3 ktx-overlay)

The audit's rocket dispute surfaced an id1-vs-KTX divergence the operator flagged
from competitive play. The id1 row stays as id1 truth; Phase 3 captures the KTX
deltas as gameplay_source=ktx overlay rows:

- **Rocket direct hit:** id1 `damg = 100 + random()*20` (weapons.qc:385, random
  100-120). KTX hardcodes **fixed 110** (`ktx/src/weapons.c:986`), with a **55**
  special case vs monster_shambler when not bloodfest (`weapons.c:981`). This is
  the "rockets always do 110" competitive behavior.
