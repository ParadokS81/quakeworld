# Phase 3 findings ledger -- KTX hardcoded override layer (ktx-gameplay.yaml)

Execution 2026-06-12/13. The per-delta record (too granular for
`review-findings.md`); material findings are summarized there as F19-F20.

Source swept: `research/repos/ktx/src/` -- `weapons.c` (2980 lines), `items.c`
(3136), `combat.c` (1306), and the 15 monster `sp_*.c` files. Two read-only
Workflow fan-outs (Sonnet high, waves of 4, schema-enforced with REQUIRED
per-value citations, independent Stage-2 re-derivation, D10/D11):

- **Combat-family sweep (Task 1):** 3 files dispatched / 3 returned / 0
  re-dispatched. 31 candidates, 0 id1-native filtered, 0 uncited, 0 null
  verdicts. Gates normalized against the live 27-token game_mode catalog at
  assembly (the sweep agents inconsistently tagged yawnmode/instagib as `cvar`;
  those are catalog mode tokens -> `{"mode":...}`).
- **Monster diff (Task 2):** 15 dispatched / 15 returned / 0 nulls. 12 faithful,
  3 deviations (one a duplicate of the rocket always-delta).

Result after the operator SME gate (D12 surface 2): **26 override rows** (11
entities + 15 mechanics) loaded; 2 candidates dropped, 1 new delta added by the
operator, 1 monster deviation folded into a weapon row.

---

## A. Accepted delta ledger (26 rows written)

### Entity rows (11)

| name | gate | changed field | id1 -> ktx | source_ref |
|---|---|---|---|---|
| axe | mode:yawnmode | damage | 20 -> 50 (dmm3, props requires_deathmatch 3) | weapons.c:128 |
| axe | dm:4 | damage | 20 -> 75 (deathmatch > 3) | weapons.c:124 |
| super_shotgun | mode:yawnmode | pellets / spread / reload | 14->21, 0.14/0.08->0.18/0.12, 0.7->0.8 | weapons.c:858 (+:892,:2180) |
| green_armor | mode:yawnmode | armor_absorb | 0.3 -> 0.4 | items.c:474 |
| backpack | mode:yawnmode | dropped ammo caps + weapon | shells/nails/rockets/cells 100/200/100/100 -> 25/50/25/25; idle pack -> shotgun (dm1) | items.c:2828 (+:2754) |
| super_spike | mode:yawnmode | damage | 18 -> 16 | weapons.c:1625 |
| spike | mode:yawnmode | projectile_speed | 1000 -> 1800 | weapons.c:1479 |
| rocket | {} (always) | direct_hit_damage | 100+random()*20 -> fixed 110 (shambler 55 vs !bloodfest) | weapons.c:986 (+:981) |
| rocket | mode:midair | projectile_speed | 1000 -> 2000 (props requires_quad) | weapons.c:1061 |
| monster_zombie | {} | gib-lob projectile_speed | 600 fixed -> 600+100*random() | sp_zombie.c:616 |
| monster_shambler | {} | half_damage_from_lightning_beam | true -> false | weapons.c:1118 |

### Mechanic rows (15)

| name | kind | gate | id1 -> ktx | source_ref |
|---|---|---|---|---|
| yawnmode_grenade_deterministic_aim | constant | mode:yawnmode | crandom scatter -> r1=r2=0 | weapons.c:1412 |
| yawnmode_shotgun_deterministic_spread | constant | mode:yawnmode | random per-pellet spread -> deterministic grid (reliable range damage) | weapons.c:550 |
| yawnmode_nail_knockback | constant | mode:yawnmode | 1.0 -> 1.2 | combat.c:904 |
| yawnmode_lg_water_discharge_self_kill | constant | mode:yawnmode | 50% self-kill -> 100% (4000) in dmm4+ | weapons.c:1192 |
| lg_water_discharge_damage_per_cell | constant | cvar:k_dis | always -> suppressed unless k_dis!=0; k_dis==2 zeroes out-of-water | weapons.c:1202 (+combat.c:1196) |
| instagib_player_hit_damage | constant | mode:instagib | normal -> 5000 | combat.c:715 |
| midair_rl_airborne_instakill | constant | mode:midair | normal splash -> 9999 (airborne) | combat.c:686 |
| midair_no_self_rl_damage | constant | mode:midair | 0.5x self-splash -> 0 | combat.c:707 |
| ctf_strength_rune_damage_boost | constant | mode:ctf | 1.0 -> *(k_ctf_rune_power_str/2+1) | combat.c:550 |
| ctf_resistance_rune_damage_reduction | constant | mode:ctf | 1.0 -> /(k_ctf_rune_power_res/2+1) | combat.c:556 |
| bloodfest_boss_damage_amplifier | constant | mode:bloodfest | 1.0 -> 4x (boss player) | combat.c:535 |
| bloodfest_shambler_full_explosion_damage | constant | mode:bloodfest | shambler 0.5x explosion -> 1.0x | combat.c:1219 |
| fall_damage | env_hazard | mode:ca | velocity-based -> 0 | combat.c:478 |
| drowning | env_hazard | mode:ca | periodic -> 0 | combat.c:477 |
| quad_damage_multiplier | powerup_behavior | mode:midair | 4x -> 1x (quad doesn't boost dmg) | combat.c:540 |

**Gate distribution:** 13 mode:yawnmode-family, 4 mode:midair, 2 mode:ctf, 2
mode:bloodfest, 2 mode:ca, 1 mode:instagib, 1 dm:4, 1 cvar:k_dis, 1 `{}` always
(rocket) + 2 `{}` monster overlays. Only the `{}` rows (rocket fixed-110, zombie
speed, shambler LG resistance) affect normal-deathmatch play; everything else is
mode/dm/cvar-scoped (operator framing at the SME gate).

## B. Operator SME-gate decisions (D12 surface 2)

Operator review 2026-06-12/13. Premise the operator established: most deltas are
mode-gated and thus not "reality" for a normal-deathmatch player; the only
always-on weapon delta is the rocket fixed-110, which is mean-neutral (110 is the
mean of the vanilla 100-120 range -- the divergence is the removed variance).

- **Accept all mode-gated deltas** as cataloged (high-confidence, verified).
- **Rocket fixed-110 (`always`):** keep -- it is the F15 carry-forward the
  operator flagged from competitive play. Notes mark it mean-neutral.
- **axe 75 @ dm:4** (deathmatch > 3): accept; KTX-specific buff, gate `{"dm":4}`
  with the `> 3` condition in props.
- **bloodfest boss x4 + shambler-splash-full:** accept (niche bloodfest mode;
  written as `constant` mechanics, not monster rows, so no bloodfest-keyspace
  collision).
- **k_dis (D22 cvar gate):** accept as one `lg_water_discharge_damage_per_cell`
  row gated `{"cvar":"k_dis"}`, both facets (suppress-unless-set;
  k_dis==2-out-of-water) in props.
- **k_classic_shotgun:** DROPPED. Source read (FireBullets) shows it only toggles
  the gunshot-puff effect grouping (`Multi_Finish` / per-pellet `TraceAttack`
  send_effects) -- cosmetic, no spread or damage change. The damage is `4`/pellet
  via `ApplyMultiDamage` regardless.
- **NEW: yawnmode_shotgun_deterministic_spread (ADDED by operator).** The sweep
  caught yawnmode's deterministic grenade aim but MISSED the same mechanism for
  the shotgun family. `non_random_bullets` (weapons.c:550 -- `k_yawnmode || (...
  nrb userinfo)`) places shotgun/SSG pellets on a fixed grid instead of random
  scatter; the competitive consequence (operator SME knowledge) is reliable
  effective damage at range, where vanilla random spread loses pellets at
  distance. Added as a yawnmode constant.

## C. Filtered / not-written (D4 audit trail)

- **k_classic_shotgun_spread** -- dropped (cosmetic puff grouping; see B).
- **k_hitboxcheck_bullets** -- not written. Found at weapons.c:744 inside an
  `#ifdef HITBOXCHECK` block; dev plumbing, not shipped gameplay (the plan
  predicted this drop).
- **dmm4 quad OctaPower 8x** -- NOT surfaced as a ktx delta by the sweep
  (correct: `damage *= (deathmatch != 4 ? 4 : ... 8)` at combat.c:545 is vanilla
  dm4 octapower, already an id1 dm_mode_rule -- id1-native per D4).
- **monster_boss lavaball direct 110** -- NOT a separate monster row. The boss
  lavaball uses the same `T_MissileTouch` path as rockets, so the 110 is the SAME
  weapons.c:986 line already captured by the rocket `{}` row; folded into that
  row's `also_applies_to` prop.

## D. Per-monster diff result (Task 2)

| monster | faithful? | deviation (id1 -> ktx) |
|---|---|---|
| monster_army | yes | -- |
| monster_dog | yes | -- |
| monster_fish | yes | -- (bloodfest-mode damage variant excluded -- different fact-family) |
| monster_knight | yes | -- |
| monster_hell_knight | yes | -- |
| monster_zombie | **no** | gib-lob projectile_speed 600 fixed -> 600+100*random() (sp_zombie.c:616) |
| monster_ogre | yes | -- |
| monster_demon1 | yes | -- |
| monster_shambler | **no** | half_damage_from_lightning_beam true -> false (weapons.c:1118) |
| monster_wizard | yes | -- |
| monster_enforcer | yes | -- |
| monster_tarbaby | yes | -- |
| monster_shalrath | yes | -- |
| monster_boss | (dup) | lavaball direct 110 = shared rocket T_MissileTouch (weapons.c:986), folded into rocket row |
| monster_oldone | yes | -- |

12/15 byte-faithful; 2 genuine stat overlays (gate `{}`); 1 duplicate folded.

## E. Notes for the arc

- **F7/F10 discipline applied at assembly:** several sweep citations pointed at
  comment lines (the verify agents cited ranges). The executor re-read each and
  pinned the ROLE line before writing (e.g. lg self-kill weapons.c:1188 comment
  -> :1192 `T_Damage(...,4000)`; bloodfest boss combat.c:532 comment -> :535
  `damage *= 4`; ctf runes :548/:554 comments -> :550/:556 value lines; nail
  knockback :900 comment -> :904 `nailkick = 1.2`).
- **Floor-text correction:** the plan floor called the yawnmode SSG spread
  "tightened"; source (`FireBullets(.., 0.18, 0.12, ..)` vs vanilla 0.14/0.08,
  comment "larger SSG spread") shows it is WIDER. The row notes record the
  correction; source is authoritative.
- **Anchor-probe re-scope (F21):** loading the 2 non-bloodfest monster overlay
  rows (gate `{}`) tripped the `monsters_have_hp_for_kill` anchor, which assumed
  every ktx monster carries the bloodfest `hp_for_kill` field. Re-scoped the
  probe to `ruleset_gate_json = {"mode":"bloodfest"}` (F29 discipline). Grid
  165/165 clean.
- **KTX-onboarding redundancy (no action this arc):** KTX onboarding Phase 1
  Task 5 ships an idempotent `gameplay_sources` ktx INSERT. Now that
  `ktx-gameplay.yaml`'s `gameplay_source:` block is the canonical owner of that
  registry row (F3), the one-off insert is redundant. It is idempotent and
  harmless; removing it is out of this arc's scope (noted, not done).
