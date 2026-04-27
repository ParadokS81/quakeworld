# Game Mechanics Layer 1 - Pre-Plan

> **Status:** Pre-plan. Locked-in scope and shape. Real implementation plan comes next, gated on the research checklist at the bottom. Author: 2026-04-27 session.

## The gap

Layer 1 today is engine-config-shaped: cvars, commands, macros, HUD, keynames, cmdline_params, plus 254 maps. Zero gameplay mechanics. Oracle can answer "what does `cl_smoothdeath` do" but not "how much damage does a rocket?", "how often does quad respawn?", "how much fall damage at 580 ups?". These are some of the most natural questions for the librarian and they currently have no source of truth in Layer 1.

## Methodology (locked)

Same diff-discoverable, version-stamped, source-tagged pattern as cvars/commands.

- **id1 baseline** (frozen 1996 QuakeC: `progs/items.qc`, `weapons.qc`, `combat.qc`) - the vanilla "QWCL" of game mechanics. Single source of truth that every QW inherits.
- **KTX delta** (modern competitive C source: `ktx/src/weapons.c`, `items.c`, `combat.c`) - the "ezQuake" of game mechanics. Overrides baseline per ruleset (vanilla / dmm1 / dmm3 / yawnmode / hoonymode / ctf / ca).
- Future mods (`clan-arena`, freshteam, etc.) plug in as additional `gameplay_source_id` rows.

KTX is straight C, not QuakeC, so the existing libclang + Visitor pipeline applies directly. id1 progs is QuakeC; given it's frozen at one version and ~200 lines of relevant constants, hand-curated YAML beats building a one-shot QuakeC parser.

## Two distinct clusters (locked)

### Cluster 1 - Entity definitions (`qw.entity_def`)

Polymorphic table, `kind` enum discriminates row shape. JSONB props for kind-specific fields, indexed columns for the dimensions we filter on (damage, respawn_time, etc.).

| kind | rows include | core props |
|---|---|---|
| `item` | weapon pickups, ammo, health (15/25/megahealth=100), armor (GA/YA/RA), powerups (quad/pent/ring) | pickup_amount, max_carry, respawn_time, classname, model, sound, message |
| `weapon` | shotgun, ssg, ng, sng, gl, rl, lg, axe (one row per fire mode) | damage_per_shot, pellet_count, spread, ammo_per_shot, refire_time, projectile_class |
| `projectile` | rocket, grenade, spike, super-spike | speed, gravity_factor, explode_radius, direct_damage, splash_damage, lifetime |

### Cluster 2 - Mechanics (`qw.mechanic`)

Polymorphic table for "rules that aren't entities". Same shape: `kind` enum + JSONB + indexed numeric columns where useful.

| kind | rows include | notes |
|---|---|---|
| `constant` | gravity (800), maxspeed (320), friction (4), stopspeed, accelerate, edgefriction, water/slime/lava friction multipliers, knockback scalars | single value applies everywhere |
| `env_hazard` | fall damage (threshold ~580 ups, formula `(vel - safe_fall) * 0.0125`, instakill threshold), lava (10 dmg / 0.2s), slime (4 dmg / 1s), drowning (12s grace then 2 dmg / 1s), crush, elevator head-bump, trigger_hurt mechanism | trigger + amount + cadence |
| `player_stat` | start_health (100), max_health (100/250 with mh), max_armor per type, start_ammo, ammo_max, mh decay (1hp/s back to 100), bbox size, view_height, jump_velocity (270) | player base state |
| `powerup_behavior` | quad multiplier (4x) + duration (30s), pent absorb (100% / 30s), ring duration (30s), ring partial-visibility threshold | distinct from `qw.entity_def.kind=item` powerup pickup row; that row references this behavior |
| `armor_model` | GA absorbs 30% up to 100, YA 60% up to 150, RA 80% up to 200; damage routing math | one rule that applies across all three armors |
| `death_rule` | telefrag (instakill), out-of-world threshold, suicide commands | edge cases that show up in oracle questions |
| `spawn_rule` | invul-on-spawn duration, spawn-point selection algorithm, KTX team-aware spawn logic | KTX overrides id1 heavily here |

## Source / version model (locked)

Every row in both tables carries:

- `gameplay_source_id` enum: `id1`, `ktx`, future mods.
- `version_first_seen` / `version_last_seen` / `source_state` - same pattern as cvars.
- KTX rows additionally carry a `ruleset_variant` (vanilla / dmm1 / dmm3 / yawnmode / hoonymode / ctf / ca) when the value differs by mode. Same row, override columns.

A row can have multiple `gameplay_source_id` entries. Querying "rocket launcher" returns id1 baseline + KTX overrides side-by-side, exactly like "v_gamma" returns ezQuake/FTE side-by-side today.

## Capture order (locked)

1. **id1 baseline YAML** - hand-curated from a single read of `id1/progs/{items,weapons,combat}.qc`. ~200 lines. Locks the schema by giving it real data on day 1. Frozen source, so hand-curation is faster and more accurate than infrastructure.
2. **Schema migration** - `qw.entity_def` + `qw.mechanic` + `qw.gameplay_source` tables. Migration spec under `docs/superpowers/specs/`.
3. **KTX delta extraction** - rides the broader KTX C extraction arc (Phase 2e). Reuses libclang + Visitor. Diff against id1, store overrides only.
4. **MCP tools** - `lookup_mechanic`, `lookup_entity_def`, or extend `lookup_entity` to cross the namespace. TBD in real plan.

## What is NOT in scope here

- BSP entity-data extraction (per-map `trigger_hurt` damage values, item placement counts). Mechanism lives in `qw.mechanic`; per-map values stay in `qw.maps` if/when we extract entity strings from BSPs. Separate arc.
- Layer 3 concept notes for game mechanics. Comes after Layer 1 lands.
- MVDSV server-tunable cvars that affect gameplay (e.g. `sv_gravity`, `sv_maxspeed`). Those are cvars in the engine config track, not game-mechanics entities. They reference `qw.mechanic.constant` rows but live in the cvar table.
- Bot AI / pathing. Out of scope for now.

## Research checklist for the real plan

The real plan must verify each of the following against primary source. Findings here may surface new categories or shift cluster boundaries.

### id1 verification

- [ ] Read `research/repos/...` for an authoritative id1 progs.qc (locate or pull). Confirm canonical source.
- [ ] Walk `items.qc` end-to-end: enumerate every pickup classname, every respawn delay literal, every pickup_amount.
- [ ] Walk `weapons.qc` end-to-end: enumerate every weapon fire function, damage literals, refire times, ammo costs, pellet counts and spreads.
- [ ] Walk `combat.qc` for the damage routing function (`T_Damage`): confirm armor absorb percentages and caps for GA/YA/RA, confirm quad/pent multipliers, confirm telefrag rule.
- [ ] Walk `client.qc` / `player.qc` for fall damage formula, drowning timer, lava/slime tick logic, spawn invul, max_health caps with megahealth decay.
- [ ] Walk `world.qc` / `worldspawn` for global constants (gravity, maxspeed, friction).
- [ ] Confirm jump_velocity, view_height, bbox size live in QC vs engine code (some may be engine constants).
- [ ] Locate the projectile spawn helpers: rocket speed (1000 ups expected), grenade gravity factor, spike speed.

### KTX verification

- [ ] Map KTX C files to id1 QC files (function-name correspondence). `ktx/src/weapons.c` corresponds to `id1/progs/weapons.qc`, etc.
- [ ] Identify ruleset branch points: `dmm1`, `dmm3`, `k_yawnmode`, `k_hoonymode`, CA, CTF. Are these `if` ladders, function-table dispatch, or cvar-driven? Determines extraction shape.
- [ ] Spot-check 3-5 known overrides: dmm3 armor changes, yawnmode axe damage (saw `damage = k_yawnmode ? 50 : 20` at `weapons.c:128`), hoony tweaks. Confirm the diff-against-id1 model captures them cleanly.
- [ ] Confirm libclang parse against KTX as-is (it's already parseable - we used it for spot-checks - but confirm a clean `compile_commands.json` exists or can be generated).
- [ ] Inventory KTX-only mechanics that don't exist in id1 (CA respawn rules, team-spawn algorithm, freeze-tag if applicable).

### Schema verification

- [ ] Decide polymorphic `qw.entity_def` + `qw.mechanic` vs separate per-kind tables. The current lean is polymorphic, mirroring `qw.maps` shape. Confirm the JSONB props pattern is comfortable to query through MCP.
- [ ] Confirm `gameplay_source_id` + `ruleset_variant` covers KTX's full variation surface. If a single value differs across 3 rulesets, do we want 3 rows or 1 row with a JSONB override map? Decision affects diffability.
- [ ] Decide naming: `qw.entity_def` reads ambiguous next to `qw.maps`. Candidates: `qw.gameplay_entity`, `qw.game_entity`, `qw.def`. Resolve before migration.
- [ ] Decide whether `qw.mechanic.constant` and the cvar table (e.g. `sv_gravity`) cross-reference each other or stay independent.

### Open questions (may surface new clusters)

- [ ] Backpack mechanics on death (drop weapon + ammo, pickup restores) - is this `entity_def.item` (the dropped backpack), `mechanic.death_rule`, or both?
- [ ] Team color rules and how they intersect with `armor_model` (team armor gives different protection? confirm).
- [ ] Spectator / observer damage rules (intangible, can't pick up items) - new `spawn_rule` row or new kind?
- [ ] CTF flag mechanics if KTX-CTF is in scope - new `entity_def.kind=flag` or treated as `item`?
- [ ] Bot weapons/items (KTX has bots) - same data as players or separate?
- [ ] Any per-engine-client overrides? (e.g. does ezQuake's prediction code carry damage tables it uses for weaponpred? `dusty-ktx/qcsrc/weaponpred.qc` exists - check if it duplicates damage values for prediction).

## Stop conditions for the real plan

The real plan is good to commit when:

1. id1 inventory is complete (every weapon/item/mechanic in canonical id1 has a YAML row drafted). **DONE — Appendix A.**
2. KTX inventory is complete (every override against id1 has a known location and extraction rule). **DONE — Appendix B.**
3. Schema migration is drafted with at least 5 example rows showing baseline + override + ruleset_variant. **Done in plan.**
4. MCP tool surface is decided (extend existing `lookup_entity` vs new tools). **Decided in plan: new `lookup_gameplay_entity` and `lookup_mechanic` tools, mirroring the `lookup_map` precedent.**
5. Phasing is decided (id1 YAML + schema in arc 1; KTX extraction in arc 2 or rolled into Phase 2e). **Decided: two arcs. Arc 1 = id1 baseline (this plan). Arc 2 = KTX overrides (deferred plan, written once arc 1 schema ships).**

---

## Appendix A — id1 primary-source inventory

Canonical source: `research/repos/qwcl-original/QW/progs/`. Every value cited file:line. Used as the literal seed for `id1-gameplay.yaml` in Arc 1.

### Weapons (8)

**Axe** — damage 20 default (weapons.qc:57); 75 in DM>3 (weapons.qc:55); refire 0.5s (weapons.qc:1010); melee 64u (weapons.qc:44).

**Shotgun** — 4 dmg/pellet (weapons.qc:285); 6 pellets (weapons.qc:311); spread '0.04 0.04 0' (weapons.qc:311); 1 shell (weapons.qc:308); refire 0.5s (weapons.qc:1025); shell cap 100 (items.qc:474).

**Super Shotgun** — 4 dmg/pellet (weapons.qc:285); 14 pellets (weapons.qc:338); spread '0.14 0.08 0' (weapons.qc:338); 2 shells (weapons.qc:336); refire 0.7s (weapons.qc:1031).

**Nailgun** — 9 dmg/spike (weapons.qc:797); 1 nail (weapons.qc:761); refire 0.2s (player.qc:190,203 — refire timer is set in player.qc, not weapons.qc); spike velocity 1000 (weapons.qc:717); spike lifetime 6s (weapons.qc:712); nail cap 200 (items.qc:477).

**Super Nailgun** — 18 dmg/super-spike (weapons.qc:844); 2 nails (weapons.qc:728); refire 0.2s (weapons.qc:726); shares spike launcher with NG.

**Grenade Launcher** — direct 0 / splash 120 (weapons.qc:600); 1 rocket (weapons.qc:634); refire 0.6s default at weapons.qc:1045 / 1.1s DM4 at weapons.qc:671; velocity 600 forward + 200 up (weapons.qc:653, 656-658); MOVETYPE_BOUNCE (weapons.qc:644); lifetime 2.5s (weapons.qc:676); splash radius dmg+40 = ~160u (combat.qc:258); rocket cap 100 (items.qc:478).

**Rocket Launcher** — direct 100 + random()*20 (weapons.qc:385); splash 120 (weapons.qc:397); 1 rocket (weapons.qc:422); refire 0.8s (weapons.qc:1051); velocity aim*1000 (weapons.qc:437-438); MOVETYPE_FLYMISSILE (weapons.qc:431); lifetime 5s (weapons.qc:445); splash radius dmg+40 = ~160u (combat.qc:258).

**Lightning Gun** — 30 dmg/tick (weapons.qc:586); 1 cell/frame (weapons.qc:569); refire 0.1s (weapons.qc:1056); range 600u (weapons.qc:573); discharge in water 4000 dmg DM4+ (weapons.qc:539); cell cap 100 (items.qc:480).

### Projectiles (4)

**Spike** — velocity 1000 (weapons.qc:717), MOVETYPE_FLYMISSILE (weapons.qc:704), 9 dmg (weapons.qc:797), lifetime 6s (weapons.qc:712).

**Super Spike** — velocity 1000, MOVETYPE_FLYMISSILE, 18 dmg (weapons.qc:844), lifetime 6s.

**Rocket** — velocity aim*1000 (weapons.qc:437-438), MOVETYPE_FLYMISSILE (weapons.qc:431), direct 100-120 (weapons.qc:385), splash 120 (weapons.qc:397), splash radius dmg+40 (combat.qc:258), lifetime 5s (weapons.qc:445).

**Grenade** — velocity v_forward*600 + v_up*200 (weapons.qc:653, 656-658), MOVETYPE_BOUNCE (weapons.qc:644), direct 0 (weapons.qc:612-620), splash 120 (weapons.qc:600), splash radius dmg+40 (combat.qc:258), lifetime 2.5s (weapons.qc:676).

### Item pickups (25)

**Health 15 (rotten)** — pickup 15 (items.qc:250), max=max_health (items.qc:220), classname item_health spawnflag=1 (items.qc:239), respawn 20s (items.qc:330).

**Health 25 (normal)** — pickup 25 (items.qc:269), max=max_health=100 (items.qc:217), respawn 20s.

**Megahealth (100)** — pickup 100 (items.qc:260), max 250 (items.qc:291), healtype 2 (items.qc:261), classname item_health spawnflag=2 (items.qc:239), respawn 5s decay-init then 20s regen (items.qc:321,356), decay -1hp/s back to 100 (items.qc:345).

**Green Armor** — armortype 0.3 (items.qc:386), cap 100 (items.qc:387), classname item_armor1 (items.qc:384), respawn 20s (items.qc:412).

**Yellow Armor** — armortype 0.6 (items.qc:392), cap 150 (items.qc:393), classname item_armor2 (items.qc:390), respawn 20s.

**Red Armor** — armortype 0.8 (items.qc:398), cap 200 (items.qc:399), classname item_armorInv (items.qc:396), respawn 20s.

**Quad Damage** — multiplier 4x default / 8x in DM4 (combat.qc:127-130), duration 30s (items.qc:1346), respawn 60s (items.qc:1308), classname item_artifact_super_damage (items.qc:1417), drop-on-death gated by infokey "dq" (client.qc:552).

**Pentagram** — duration 30s (items.qc:1328), respawn 300s (items.qc:1306), classname item_artifact_invulnerability (items.qc:1358), mechanic targ.invincible_finished >= time blocks damage (combat.qc:184), sound items/protect3.wav on hit (combat.qc:188).

**Ring of Shadows** — duration 30s (items.qc:1334), respawn 300s, classname item_artifact_invisibility (items.qc:1397), modelindex_eyes when active (client.qc:991), drop gated by infokey "dr" (client.qc:568).

**Biosuit** — duration 30s (items.qc:1322), respawn 60s (items.qc:1308), classname item_artifact_envirosuit (items.qc:1378).

**Ammo small/large**: shells 20/40 (items.qc:906/900) cap 100 (items.qc:474); nails 25/50 (items.qc:934/928) cap 200 (items.qc:477); rockets 5/10 (items.qc:963/957) cap 100 (items.qc:478); cells 6/12 (items.qc:993/987) cap 100 (items.qc:480). Respawn 30s default / 15s DM3+DM5 (items.qc:868, 872-873).

**Weapon pickups (DM<=3 only)** — NG 30 nails (items.qc:580); SNG 30 nails (items.qc:588); SSG 5 shells (items.qc:596); RL 5 rockets (items.qc:604); GL 5 rockets (items.qc:612); LG 15 cells (items.qc:620). Weapon respawn 30s (items.qc:669).

**Backpack** — drops on death if any ammo > 0 (items.qc:1614-1615); carries current weapon + ammo (items.qc:1620-1643); lifetime 120s (items.qc:1656).

### Mechanics

**Constants** — sv_gravity 800 default / 100 on e1m8 (world.qc:182, world.qc:180); maxspeed/accelerate/friction/stopspeed/edgefriction are engine-side (NOT in QC).

**Env hazards** —
- Lava: 10*waterlevel dmg (client.qc:825), 0.2s tick (client.qc:823), biosuit -> 1s tick (client.qc:821), biosuit blocks via radsuit_finished > time (client.qc:820).
- Slime: 4*waterlevel dmg (client.qc:833), 1s tick (client.qc:832), biosuit blocks (client.qc:830).
- Drowning: 12s grace (client.qc:466,790), starts when air_finished < time (client.qc:793), self.dmg starts 2 +2/tick capped 10 (client.qc:797-800), 1s tick (client.qc:801).
- Fall damage: -300 grace velocity (client.qc:1139), -650 dmg threshold (client.qc:1143), 5 dmg (client.qc:1146), water absorbs (client.qc:1141-1142), deathtype "falling" (client.qc:1145).
- Crush/squish: deathtype "squish" assigned at plats.qc:114, plats.qc:227, doors.qc:34, doors.qc:683 (4 sites; client.qc:1268 is the obituary-check site).
- Trigger_hurt: hurt_touch handler (triggers.qc:548-560) calls T_Damage(other, self, self, self.dmg) at triggers.qc:553; trigger_hurt entity sets default dmg=5 if unset (triggers.qc:566-572); retriggers every 1s via hurt_on (triggers.qc:553-555); damage value is per-instance (mappers set it in the entity properties), so a void brush with dmg=1000 instakills while a low-damage hazard area at default dmg=5 is just attrition. Unlike telefrag/exit_level_kill, armor + pent DO apply (it's a normal T_Damage call).
- Gib threshold: health < -40 (player.qc:598).

**Player stats** — start_health 100 (client.qc:459); max_health 100 (client.qc:464); max with mh 250 (items.qc:220-221); mh decay 1hp/s back to 100 (items.qc:343-348); start_ammo shells 25 / others 0 (client.qc:72-75); start_weapon SG or AXE (client.qc:69,76); view_ofs '0 0 22' (client.qc:502 — engine constant); VEC_HULL '-16 -16 -24' / '16 16 32' (defs.qc:329-330); knockback dir*dmg*8 (combat.qc:171); rocket-jump multiplier infokey "rj" default 1 (client.qc:517-520, combat.qc:174-175).

**Powerup behavior** — quad: dmg*4 (combat.qc:130), dmg*8 in DM4 (combat.qc:128), if-check at combat.qc:127, 30s (items.qc:1346), excludes door inflictor (combat.qc:126); pent: invincible_finished >= time blocks (combat.qc:184), 30s; ring: invisible_finished > 0 (client.qc:955), 30s.

**Armor model** — save = ceil(armortype * damage) (combat.qc:134); if save >= armorvalue: save = armorvalue, armor depleted (combat.qc:135-140); take = ceil(damage - save) (combat.qc:143).

**Death rules** — Two distinct 50000-damage instakill mechanisms (originally conflated in v1/v2/v3 of this doc):

- **Telefrag** (real teleport-overlap): teleport_touch (triggers.qc:375-466) spawns a teledeath/teledeath2/teledeath3 entity at the destination when occupied; that entity calls T_Damage(other, self, self, 50000) at triggers.qc:334 (teledeath3 path, both occupants), triggers.qc:337 (teledeath3, owner), triggers.qc:343 (teledeath2 — Satan's-power-deflects path, owner gets killed instead), triggers.qc:351 (default teleport_touch path). Obituary classification at client.qc:1232 ("teledeath"), client.qc:1244 ("teledeath2"), client.qc:1256 ("teledeath3"). Pent's interaction is special: the Satan's-power deflect message at client.qc:1244 routes the kill back to the would-be attacker, costing them a frag.
- **Exit-level kill** (samelevel/noexit, what kills you on e1m2's end-teleporter in 4on4): changelevel_touch (client.qc:218-247) checks `samelevel == 2 || (samelevel == 3 && mapname != "start")` at client.qc:228 and calls T_Damage(other, self, self, 50000) at client.qc:230 if the gate fires. ZOID's 1996-12-13 comment at client.qc:226-227 explains this overloaded the original Quake `noexit` cvar. Attacker classname is "trigger_changelevel" (referenced at client.qc:1489 for the obit). Distinct from telefrag — different trigger (changelevel touch vs teleport overlap), different attacker classname, same 50000 damage value (which is probably how they got conflated in v1).

**Friendly fire**: cvar branches teamplay 0/1/2/3 (combat.qc:199-207, client.qc:1336).

**Deathtype enum** (verified by repo-wide grep): "nail" (weapons.qc:796), "supernail" (weapons.qc:843), "rocket" (weapons.qc:389), "grenade" (weapons.qc:600 — note: grenade explosion uses "rocket" classification in T_RadiusDamage, not a separate "grenade" string), "falling" (client.qc:1145), "squish" (plats.qc:114, plats.qc:227, doors.qc:34, doors.qc:683), "selfwater" (weapons.qc:538), "laser" (misc.qc:319 — laser-trap entities). NO `ax` deathtype exists; the axe path uses an `axhitme` boolean flag (defs.qc:516, weapons.qc:52) rather than a deathtype string. Telefrag and exit-level kills do NOT assign a deathtype string — the obituary handler reads `attacker.classname` instead (teledeath/teledeath2/teledeath3 for telefrag at client.qc:1232/1244/1256; trigger_changelevel for exit-kill at client.qc:1489).

**Spawn rules** — DM<=3: 0s spawn invul; DM4/DM5: 3s invul (client.qc:544, 565); standard respawn on button press after DEAD_RESPAWNABLE (client.qc:728); intermission exit 5s delay (client.qc:189).

**DM mode rules** — DM2: respawn 30s ammo, no health respawn (items.qc:411,868); DM3: 15s ammo respawn (items.qc:872-873); DM4 (Octa): start health 250 / armor 200@0.8 / 3s invul / all weapons except GL / quad 8x / LG self-kill 4000 in water / +10hp on backpack pickup / 300hp threshold for instant invul+quad (client.qc:522-545, items.qc:1475-1504). **DM4 255-ammo + extra-weapons block (client.qc:527-536) is gated by `if (stof(infokey(world,"axe")) == 0)` — axe-mode DM4 servers start with shotgun+axe only, no 255s.** DM5 (Quadmachine): 200/200/0.8/3s invul / all weapons / 80n+30s+10r+30c starting ammo (client.qc:549-565).

### Engine-side gaps (flagged, not in QC, NOT loaded in arc 1)

maxspeed 320, accelerate 10, friction 4, stopspeed 100, edgefriction 2, view bobbing, hull bbox enforcement, out-of-world Z. These are engine-tunable cvars defined in the C source of ezQuake/MVDSV/QWCL, NOT in QC gamecode. They belong in the existing `cvars` table (engine-config track), not in `gameplay_mechanics`. Arc 1 deliberately omits them so we don't fork two stores of the same fact. They surface naturally once the ezQuake/MVDSV/QWCL extraction tags add their cvar rows; the `cvars` table already has them for ezQuake. Final arc-1 `gameplay_mechanics.constant` rows: 2 (`sv_gravity_default` + `rocket_jump_multiplier_default`), both with real QC source citations.

Note on out-of-world Z: there's no QC handler for "player Z went below map limits" — the engine force-removes entities below its hard floor, no T_Damage call, no deathtype. On well-built maps this is unreachable because the mapper places a `trigger_hurt` brush above the void Z floor with high `dmg` (often 1000+) to catch the player first; that path does run through QC and IS captured by the `trigger_hurt` env_hazard row.

---

## Appendix B — KTX override inventory

Source: `research/repos/ktx/src/`. Every value cited file:line. Drives Arc 2 libclang extraction targets.

### Weapon overrides

**Axe** — DMM3 yawn 50 / non-yawn 20 (weapons.c:128); DM>3 75 (weapons.c:124); default 20 (weapons.c:107).

**Shotgun** — 4 dmg/pellet (weapons.c:717, 498); instagib 1 dmg single round (weapons.c:839-841).

**Super Shotgun** — yawn 21 pellets / normal 14 (weapons.c:858); yawn spread '0.18 0.12 0' / normal '0.14 0.08 0' (weapons.c:892, 896).

**Nailgun** — 9 dmg (weapons.c:1554); yawn alternating fire disabled (weapons.c:1678-1680); yawn velocity 1800 (weapons.c:1477).

**Super Nailgun** — yawn 16 dmg / normal 18 (weapons.c:1625).

**Grenade Launcher** — splash 120 / non-bloodfest shambler 60 (weapons.c:1300, 1296).

**Rocket Launcher** — direct 110 / non-bloodfest shambler 55 (weapons.c:986, 981); splash 120 (weapons.c:1006).

**Lightning Gun** — 30 dmg/tick (weapons.c:1277); discharge 35 * cells_in_clip (weapons.c:1208, 1225); yawn DMM4 always self-kill 4000 (weapons.c:1192); non-yawn DMM4 50/50 self-kill or splash (weapons.c:1189-1210).

**Quad multiplier** — DMM4 with TOT off 8x / others 4x (weapons.c:545).

### Item respawn overrides

Standard weapon 30s (items.c:812); freshteams cvar k_freshteams_weapon_time default 20 (items.c:812, world.c:895). Ammo respawn DMM3/5 15s (items.c:1349); DMM2/3/5/coop 30s (items.c:1342). Quad/pent/ring/biosuit pickup duration 30s (items.c:2191/2151/2166/2136). Powerup respawn 30s minus AUTOTRACK_POWERUPS_PREDICT_TIME (items.c:1850-1851). Megahealth rot 5s initial then 20s decay (items.c:357,370,389).

### Armor overrides (yawnmode)

GA: 0.4 yawn / 0.3 normal (items.c:474). YA/RA unchanged.

### Env damage overrides

Drowning: dmg 2 increasing to 10 (client.c:2710-2714), waterlevel > 1 (client.c:2709). Lava: 10*waterlevel (client.c:2776), 0.2s tick / biosuit 1s tick (client.c:2768, 2772). Slime: 4*waterlevel (client.c:2787), 1s tick (client.c:2785). CA blocks lava+slime+drowning (combat.c:477-478). Fall damage: 5 (client.c:4428). **NEW: stomp on player landing 10 dmg** (client.c:4435).

### Ruleset surfaces (all runtime cvar branches, no #ifdef)

**k_yawnmode** (globals.c:56) — 13+ overrides: axe DMM3 50, SSG 21 pellets + 0.18/0.12 spread, SNG 16, NG alt-fire off, NG 1800 vel, LG always self-kill DMM4, GA 0.4, nailkick velocity bonus (combat.c:902-919), fair-spawn weighting (client.c:1228-1275), no-same-spot inverted (client.c:1122), pack drop independent of death (items.c:2686), fallbunny forced 1 (g_utils.c:2723), FRP forced 2 (g_utils.c:2717).

**k_hoonymode** (hoonymode.c:87-99) — HM_choose_spawn_point dispatch (client.c:1865); mid-round spawn prevention (client.c:1208); point nomination system (hoonymode.c:150+).

**isCA() = isTeam() && k_clan_arena** (clan_arena.c:293) — exponential respawn formula multiple = bound(3, teamsize+1, 6) (clan_arena.c:142); times multiple/2x/4x/8x (clan_arena.c:146-149); solo first-death instant (clan_arena.c:153-154); k_clan_arena==2 wipeout LOS spawn (client.c:1100-1106); pre-match damage blocked (combat.c:484-489); no fall/drown/lava/slime (combat.c:477-478); late-join 999s (clan_arena.c:337-338); k_clan_arena_max_respawns cvar (world.c:985).

**isRACE() = k_race** (race.c:217) — no PvP damage (weapons.c:110-113, combat.c:467); spike ignore (weapons.c:1515, 1588); rocket SOLID_TRIGGER (weapons.c:1054); hazard cancels run (client.c:2756); record persistence k_race_times_per_port (world.c:916).

**isRA() = isDuel() && k_rocketarena** (arena.c:130) — winner/loser tracking (arena.c:135-173); spawn uses .mangle (client.c:1172); axe sound suppression for non-winner/loser (weapons.c:142-145).

**isCTF() = k_mode == gtCTF** (g_utils.c:1596-1602) — base-aware spawn (client.c:1893-1903); flag regen (world.c:1289); runes if k_ctf_runes (world.c:1294); hook if k_ctf_hook (world.c:1299).

**Instagib (k_instagib)** — SG single coilgun bullet 1 dmg = instakill (weapons.c:839-841); trace 8192u (weapons.c:564-570); custom models (weapons.c:64-67).

**DM modes** — DMM2 skip respawn (items.c:1059); DMM3 yawn-aware axe + 15s ammo (weapons.c:122-128, items.c:1349); DMM4 quad strips armor/ammo/cells (items.c:2183-2188), quad named "OctaPower" (items.c:2341), 8x quad (weapons.c:545), grenade mode variant k_dmm4_gren_mode (weapons.c:1433), pickup health cap 300 (items.c:2422-2424); DMM5 15s ammo (items.c:1349).

### Algorithmic mechanics (formula extraction, not literal)

Sub_SelectSpawnPoint at client.c:1044-1290 with k_spw modes (-1 linear, 1-4 proximity-filtered with skip-same-spot at 2/3/4 unless yawn), yawn fair-spawn weighted random redistributing per spawn_weights[] (client.c:1228-1275), wipeout LOS guard. CA respawn at clan_arena.c:128-207. Race timing/checkpoints at race.c with multi-record per-map.

### Build / extraction feasibility

CMake 3.10+ (CMakeLists.txt:1), C17 (CMakeLists.txt:162), include path `include/` (CMakeLists.txt:143). g_local.h is the single header all .c files include. All gameplay branches are runtime cvar checks — libclang sees them as plain `if (cvar("k_yawnmode"))` calls with constant int literal RHS. No compile-time #ifdef fork on gameplay constants. **Extraction shape**: identify literal int/float assignments to `damage`, `nextthink`, `armortype`, etc., then walk up the AST to find the enclosing if-condition and capture the cvar gate. Every override row carries `gameplay_source_id='ktx'` + optional `ruleset_variant` JSON.

### KTX-only mechanics not in id1

CA exponential respawn, race timing/checkpoints, RA winner/loser arena, CTF flag/rune/hook, hoonymode point nomination, instagib coilgun, freshteams weapon-time cvar, fair-spawn algorithm, stomp-on-landing 10 dmg, quad strip-on-pickup in DMM4, OctaPower naming.

### Coverage gaps (id1-only, no KTX override)

Splash damage fall-off (none in either), weapon-specific armor penetration (uniform), powerup time stacking limit (capped at 30s), knockback velocity scaling by damage (fixed in both), swimspeed modifier, crouch mechanics, gib vs ragdoll threshold formula.
