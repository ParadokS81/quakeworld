# ktx-l1-rewrite drafts -- batch 2026-05-26 (Mode-scoped knobs)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.

Anchor: v1.36-1633-g67253dc. Chunked-mode dispatch, 9 chunks (sizes 6-8;
chunk_size=8 calibration target). 66 entities total; 35 drafted clean +
29 drafted_with_flag + 2 parked. 2 parked entities surfaced trigger-1
novelty (roundsdown + roundsup -- two-command bounded increment/decrement
pair on k_hoonyrounds); operator accepted the park and shipped the 64
drafted cards. See park file for the 2 parked entries + the
"## Cross-card consistency notes" section below for the 18 findings.

---

## k_ctf_runes (KTX cvar, Mode-scoped knobs -- Shape 1 + Shape 1c)

- **Status**: drafted
- **Source**: src/world.c:955 (registration), src/ctf.c:738 (toggle site)
- **Catalog line**: 11489
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF mode only. Master toggle for the four CTF power runes (resistance, strength, haste, regeneration). When enabled and in CTF mode, runes are spawned and can be picked up. When disabled outside of a match, any carried runes are removed and player speed is reset. Changing the value mid-game re-evaluates rune spawning immediately.
>
> 0 = no runes spawned.
> 1 = runes enabled (CTF mode required).
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 1 + Shape 1c (cvar + paired toggle, with CTF mode precondition).

`norunes` in `ctf.c:738` calls `cvar_toggle_msg(self, "k_ctf_runes", ...)` and includes an `isCTF()` mode-precondition check that prints "Can't do this in non CTF mode". The `SpawnRunes` consumer at `world.c:1294` gates on `isCTF() && cvar("k_ctf_runes")`, confirming the CTF-mode requirement is structural. This is the standard Shape 1c pattern: toggle + mode-precondition.

The existing description is v1 shape (flat value enum + Set by line). Recast to v2 adds Effect, Prerequisites, Permission, Match-state, and See-also structure.

### Proposed draft

```
Master toggle for the four CTF power runes (resistance, strength, haste, regeneration).

Effect:
  0 = no runes are placed; rune spawn points remain empty.
  1 = runes are spawned at map rune-spawn points (or at player-spawn fallbacks if no
      rune-spawn entities exist). Each rune whose power cvar is set to 0 is skipped
      individually even when this toggle is on.

Prerequisites: CTF mode must be active (k_ctf_hookstyle / CTF rules in effect).

Permission:    server config, or 'norunes' in-game (pre-match only).
Match-state:   pre-match only (norunes is blocked while a regular match is in progress).
Default:       0.

Example:
  # server.cfg -- enable runes for CTF
  k_ctf_runes 1

  # or toggle in-game before a match starts
  norunes

See also: norunes (paired toggle command), k_ctf_rune_power_hst (haste rune power/enable),
          k_ctf_rune_power_res (resistance rune power/enable),
          k_ctf_rune_power_str (strength rune power/enable),
          k_ctf_rune_power_rgn (regeneration rune power/enable)
```

### Notes

- The existing description says "Changing the value mid-game re-evaluates rune spawning immediately" -- source confirms this via the frame-think poll in `world.c:1292-1294` (`if (k_ctf_runes != cvar("k_ctf_runes")) SpawnRunes(...)`), but only takes effect in matchless mode (in normal mode the `norunes` toggle is blocked mid-match). The v2 card notes that the paired command is pre-match only; the direct-set-mid-match path exists but is a server-side config operation, not a normal player action. Not flagged as a contradiction -- the v1 wording is technically accurate; v2 drops the mechanism narration and focuses on the action path.
- See-also references all four `k_ctf_rune_power_*` cvars. This is 5 entries (norunes + 4 power cvars). Borderline -- if an L3 CTF runes concept note exists, the See-also can be trimmed to norunes + concept note. No such note exists yet; keeping all 5 for now.
- `k_ctf_rune_bounce` is a sibling rune-system knob but is about drop physics, not spawning/enabling -- omitted from this card's See-also to stay within the 5-link cap. The power cvars are stronger peers here.

---

## k_ctf_rune_bounce (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:956 (registration)
- **Catalog line**: 11329
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF runes only. Bitmask controlling bounce physics for two rune-drop paths. On-death rune drops are hardcoded to settle-on-land and are not affected by this cvar.
>
> 0 = neither path bounces (both settle on landing).
> 1 = auto-respawn fallback path bounces (when no map rune-spawn entity exists).
> 2 = voluntary 'tossrune' command bounces.
> 3 = both paths bounce.
>
> Default: 3.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, server-config only).

No `cvar_toggle_msg` or `cvar_fset` site found for `k_ctf_rune_bounce`. Two read sites in `runes.c`: line 47 (auto-respawn fallback path: `& 1`) and line 107 (tossrune path: `& 2`). This is a bitmask cvar with direct-set only -- no per-bit toggle commands, unlike Shape 11. Standard Shape 3 with a bitmask value enum.

The existing description is v1 shape. Recast adds Permission, Match-state structure, and formalizes the bit table.

### Proposed draft

```
Controls bounce physics for rune items when they are dropped without a dedicated
map rune-spawn point, and when voluntarily tossed.

Effect:
  Bit 0 (value 1): auto-respawn fallback path bounces -- applies when no map
      'item_rune_*' entity exists and the rune is placed at a player-spawn fallback.
  Bit 1 (value 2): 'tossrune' drops bounce when thrown.
  Combined values: 0 = both settle; 1 = respawn-fallback bounces; 2 = tossrune bounces;
      3 = both bounce.
  On-death drops always settle (hardcoded; unaffected by this cvar).

Permission:    server config only.
Default:       3.

Example:
  # server.cfg -- tossed runes bounce, respawn fallbacks settle
  k_ctf_rune_bounce 2

See also: k_ctf_runes (master rune toggle), tossrune (voluntary rune toss command)
```

### Notes

- The bitmask structure is confirmed by the two consumer read sites in `runes.c`: `& 1` for respawn-fallback at line 47, `& 2` for tossrune at line 107. The existing description is correct.
- The "on-death drops are hardcoded to settle" note is sourced from `runes.c:49-53` -- the death-drop path only applies `MOVETYPE_BOUNCE | MOVETYPE_TOSS` when `on_respawn` is true, and in the `else` (player-died) branch, `movetype = MOVETYPE_TOSS` unconditionally.
- No Shape 11 here: there are no per-bit toggle commands for this cvar. It's a pure Shape 3 bitmask cvar.
- Match-state omitted (any time / server config).

---

## k_ctf_rune_power_hst (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:960 (registration)
- **Catalog line**: 11362
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF runes only. Controls the strength of the haste rune and whether it spawns. A value of 0 disables the rune entirely (it is not placed in the map). Higher values increase carrier speed, shorten weapon cooldowns, and speed up the grappling hook. At the default of 2.0 the speed multiplier is 1.25x.
>
> Range: 0 (disabled) or any positive value (stronger with higher values).
>
> Default: 2.0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, server-config only).

No `cvar_toggle_msg` or `cvar_fset` for this cvar. Consumer read sites in `runes.c:306` (speed: `(x/8)+1`x multiplier on pickup), `weapons.c` (weapon cooldown reduction: `x/10` or `x/20` subtracted from attack_finished delay), `grapple.c:65-67` and `grapple.c:372` (hook speed: `x/16+1` multiplier). Zero value gates rune spawning at `runes.c:412`. Standard Shape 3.

Dispatcher context: canonical-card pattern was considered for the k_ctf_rune_power_* family but downgraded -- the four runes have meaningfully different effect formulas and units (speed vs damage-multiply vs damage-divide vs heal-interval), so each gets a full card.

### Proposed draft

```
Controls the strength of the haste rune and whether it spawns.

Effect:
  0 = haste rune is disabled and not placed in the map.
  Above 0 = rune spawns. A carrier gains:
    - Movement speed: multiplied by (value/8) + 1  (default 2.0 gives 1.25x).
    - Weapon cooldown: attack delay reduced by value/10 seconds for most weapons
      (value/20 for SSG and RL).
    - Grappling hook: pull speed and fire rate both scale up by (value/16) + 1.
  Higher values scale all three effects upward; reducing value weakens the rune
  without disabling it.

Permission:    server config only.
Default:       2.0.

Example:
  # server.cfg -- standard haste rune
  k_ctf_runes 1
  k_ctf_rune_power_hst 2.0

  # weaker haste (25% speed boost, mild cooldown reduction)
  k_ctf_rune_power_hst 1.0

See also: k_ctf_runes (master rune toggle), k_ctf_rune_power_res (resistance rune power),
          k_ctf_rune_power_str (strength rune power), k_ctf_rune_power_rgn (regeneration rune power)
```

### Notes

- Speed multiplier formula verified: `runes.c:306` = `other->maxspeed *= (cvar("k_ctf_rune_power_hst") / 8) + 1`. At 2.0: `(2.0/8)+1 = 1.25`. Existing description's "1.25x" is correct.
- Weapon cooldown: `weapons.c` uses `- (cvar("k_ctf_rune_power_hst") / 10)` for axe, shotgun, GL, nailguns (attack_finished reduction) and `- (cvar("k_ctf_rune_power_hst") / 20)` for SSG and RL. The existing description says "shorten weapon cooldowns" which is accurate; the v2 card adds the divisor detail.
- Hook speed: `grapple.c:372` uses `(x/16)+1` for pull speed; `grapple.c:65-67` reduces attack_finished and hook_reset_time by `x` divisor. Summarized as "fire rate and pull speed both scale up".
- The existing description mentions "speed up the grappling hook" -- confirmed. The v2 draft consolidates into the three-point effect list.

---

## k_ctf_rune_power_res (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:958 (registration)
- **Catalog line**: 11392
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF runes only. Controls the power of the resistance rune and whether it spawns in the map.
>
> 0 = resistance rune is disabled and does not spawn.
> Above 0 = rune spawns; incoming damage for a carrier is divided by (value / 2) + 1 (e.g. default 2.0 halves damage).
>
> Range: 0.0 and above (floating-point).
>
> Default: 2.0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, server-config only).

No `cvar_toggle_msg` or `cvar_fset` for this cvar. Consumer read sites: `combat.c:557` (`damage /= (cvar("k_ctf_rune_power_res") / 2) + 1`), `runes.c:400` (spawn gate: `cvar("k_ctf_rune_power_res") > 0`). Standard Shape 3.

### Proposed draft

```
Controls the power of the resistance rune and whether it spawns.

Effect:
  0 = resistance rune is disabled and not placed in the map.
  Above 0 = rune spawns. Incoming damage to a carrier is divided by
      (value/2) + 1. At the default of 2.0, incoming damage is halved
      (divided by 2.0). Higher values reduce damage more; lower positive
      values provide less protection.

Permission:    server config only.
Default:       2.0.

Example:
  # server.cfg -- standard resistance rune (50% damage reduction)
  k_ctf_runes 1
  k_ctf_rune_power_res 2.0

  # lighter resistance (33% damage reduction at value 1.0)
  k_ctf_rune_power_res 1.0

See also: k_ctf_runes (master rune toggle), k_ctf_rune_power_str (strength rune power),
          k_ctf_rune_power_hst (haste rune power), k_ctf_rune_power_rgn (regeneration rune power)
```

### Notes

- Damage formula verified: `combat.c:557` = `damage /= (cvar("k_ctf_rune_power_res") / 2) + 1`. At 2.0: divisor = 2.0, so damage is halved. The existing description's "(e.g. default 2.0 halves damage)" is correct.
- Spawn gate verified: `runes.c:400` checks `cvar("k_ctf_rune_power_res") > 0`.
- v1 shape was accurate; recast is a mechanical v2 restructure.

---

## k_ctf_rune_power_rgn (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:959 (registration)
- **Catalog line**: 11425
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF runes only. Scales the strength of the regeneration rune and controls whether it spawns.
>
> 0 = regeneration rune is disabled (not placed in the map).
> Above 0 = rune is active; higher values give faster healing (carrier below 150 health gains +5 HP per tick; tick interval = 1 / (value/2 + 1) seconds -- default 2.0 gives 0.5 s intervals).
>
> Default: 2.0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, server-config only).

No `cvar_toggle_msg` or `cvar_fset` for this cvar. Consumer read sites: `client.c:3990` (`self->regen_time += 1 / ((cvar("k_ctf_rune_power_rgn") / 2) + 1)`), `runes.c:418` (spawn gate: `cvar("k_ctf_rune_power_rgn") > 0`). Standard Shape 3.

### Proposed draft

```
Controls the strength of the regeneration rune and whether it spawns.

Effect:
  0 = regeneration rune is disabled and not placed in the map.
  Above 0 = rune spawns. A carrier below 150 health gains +5 HP per heal tick;
      carrier below 150 armour (with active armour) gains +5 armour per armour tick.
      Tick interval = 1 / ((value/2) + 1) seconds. At the default of 2.0,
      healing fires every 0.5 s. Higher values shorten the interval (faster healing);
      lower positive values lengthen it.

Permission:    server config only.
Default:       2.0.

Example:
  # server.cfg -- standard regeneration rune (heals every 0.5 s)
  k_ctf_runes 1
  k_ctf_rune_power_rgn 2.0

  # slower regeneration (heals every 1.0 s at value 0)
  # (value 0 disables -- use a small positive value for slow regen, e.g. 0.5
  #  gives interval 1 / (0.25 + 1) = 0.8 s)
  k_ctf_rune_power_rgn 0.5

See also: k_ctf_runes (master rune toggle), k_ctf_rune_power_hst (haste rune power),
          k_ctf_rune_power_res (resistance rune power), k_ctf_rune_power_str (strength rune power)
```

### Notes

- Tick interval formula verified: `client.c:3990` = `self->regen_time += 1 / ((cvar("k_ctf_rune_power_rgn") / 2) + 1)`. At 2.0: `1 / (1.0 + 1) = 0.5 s`. Existing description is correct.
- Armour healing also occurs (client.c:3997-4009: `armorvalue += 5` with `regen_time += 0.5`); the existing description omits this. Added to the v2 draft as a non-flagged enhancement (the existing description's 150-health cap is correct, but the armour healing is additional user-actionable information).
- Spawn gate verified: `runes.c:418` checks `cvar("k_ctf_rune_power_rgn") > 0`.
- The example comment for "slower regen" is illustrative -- the 0 case disables the rune, so any slow-regen config must use a small positive value. Added to avoid the user tripping on "use a low value to slow regen but don't use 0."

---

## k_ctf_rune_power_str (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:957 (registration)
- **Catalog line**: 11456
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF runes only. Controls the power of the strength rune and whether it spawns in the map.
>
> 0 = strength rune is disabled and does not spawn.
> Above 0 = rune spawns; outgoing damage for a carrier is multiplied by (value / 2) + 1 (e.g. default 2.0 doubles damage).
>
> Range: 0.0 and above (floating-point).
>
> Default: 2.0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, server-config only).

No `cvar_toggle_msg` or `cvar_fset` for this cvar. Consumer read sites: `combat.c:551` (`damage *= (cvar("k_ctf_rune_power_str") / 2) + 1`), `runes.c:406` (spawn gate: `cvar("k_ctf_rune_power_str") > 0`). Standard Shape 3.

### Proposed draft

```
Controls the power of the strength rune and whether it spawns.

Effect:
  0 = strength rune is disabled and not placed in the map.
  Above 0 = rune spawns. Outgoing damage from a carrier is multiplied by
      (value/2) + 1. At the default of 2.0, outgoing damage is doubled
      (multiplied by 2.0). Higher values multiply damage further; lower
      positive values provide a smaller bonus.

Permission:    server config only.
Default:       2.0.

Example:
  # server.cfg -- standard strength rune (2x damage output)
  k_ctf_runes 1
  k_ctf_rune_power_str 2.0

  # lighter strength (1.5x damage at value 1.0)
  k_ctf_rune_power_str 1.0

See also: k_ctf_runes (master rune toggle), k_ctf_rune_power_res (resistance rune power),
          k_ctf_rune_power_hst (haste rune power), k_ctf_rune_power_rgn (regeneration rune power)
```

### Notes

- Damage formula verified: `combat.c:551` = `damage *= (cvar("k_ctf_rune_power_str") / 2) + 1`. At 2.0: multiplier = 2.0. The existing description's "(e.g. default 2.0 doubles damage)" is correct.
- Spawn gate verified: `runes.c:406` checks `cvar("k_ctf_rune_power_str") > 0`.
- v1 shape was accurate; recast is a mechanical v2 restructure.
- This is the symmetrical counterpart to `k_ctf_rune_power_res`: same formula shape `(x/2)+1`, one multiplies, one divides. Noted in See-also pairing.

---

## norunes (KTX command, Mode-scoped knobs -- Shape 1 + Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:921 (registration), src/ctf.c:724 (handler)
- **Catalog line**: 12807
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles CTF runes on or off and announces the new state server-wide. Only available in CTF mode. Blocked while a match is in progress, unless the server runs in matchless mode.
>
> When run in matchless mode: turning runes off strips any rune currently carried by a player (resetting their movement speed); turning them on immediately respawns the rune items in the map.
>
> Set by: admin command 'norunes' in-game.

### Shape classification

Shape 1 + Shape 1c command side (paired with `k_ctf_runes`, with CTF mode precondition).

`ctf.c:738` calls `cvar_toggle_msg(self, "k_ctf_runes", ...)`. Handler has `isCTF()` mode-precondition that prints "Can't do this in non CTF mode". This is the command side of the Shape 1c pair.

### Proposed draft

```
Toggles the runes rule (k_ctf_runes) and announces the new state server-wide.

Effect:
  Flips k_ctf_runes between 0 and 1 and broadcasts the change.
  In matchless mode, also takes immediate effect:
    - Turning off: strips any rune currently carried by a player and resets
      their movement speed.
    - Turning on: respawns all enabled rune items in the map immediately.

Prerequisites: CTF mode must be active ("Can't do this in non CTF mode").

Permission:    any player (spectators excluded).
Match-state:   pre-match only (silently ignored while a regular match is in progress;
               available any time in matchless mode).

Example:
  norunes

See also: k_ctf_runes (paired cvar), k_ctf_rune_power_hst (haste rune power/enable)
```

### Notes

- FLAG: The existing description says "Set by: admin command 'norunes' in-game." -- the `commands.c:921` registration is `CF_PLAYER | CF_MATCHLESS`, which is `CF_PLAYER` alone for permission purposes (CF_MATCHLESS is a match-state modifier, not a permission flag). `CF_PLAYER` = "any player (spectators excluded)" per `g_local.h:647`. No `CF_PLR_ADMIN`, no `CF_SPC_ADMIN`, no `CF_BOTH_ADMIN`. The existing "admin command" framing is INCORRECT. Permission is "any player (spectators excluded)". The v2 draft corrects this. Apply-pass-author: verify `commands.c:921` CF flag before applying.
- Match-state is non-standard: the handler silently returns (no message) when `match_in_progress && !k_matchLess`. In matchless mode, it proceeds even while match is running. The v2 Match-state line reflects this two-phase behavior.
- No value enum on the command card (lives on `k_ctf_runes`). Standard Shape 1c command-side discipline.
- See-also capped at 2 entries (the paired cvar + one power cvar as example). The full rune power family is accessible from `k_ctf_runes`'s See-also.

---

## k_ctf_based_spawn (KTX cvar, Mode-scoped knobs -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:962
- **Catalog line**: 11139
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF spawn-point selection policy.
>
> 0 = generic deathmatch spawns (team-base spawns only at match start).
> 1 = always spawn at own team base.
> 2 = each spawn is a 50/50 pick between a neutral mid-map spawn and a home-base spawn (reduces repeated spawn kills when the flag is overrun).
>
> Default: 0. On maps with very few deathmatch spawns, auto-promoted to 1 at world-load if currently 0.
> Set by: server config or 'ctfbasedspawn' admin command in-game (CTF mode only).

### Shape classification

Shape 1 cvar+toggle pair. `ctfbasedspawn` calls `cvar_toggle_msg(self, "k_ctf_based_spawn", redtext("spawn on base"))` (ctf.c:870). The cvar holds 3 values (0/1/2); the toggle command covers only the 0↔1 binary flip -- value 2 is server-config-only.

Flagged: the existing description calls `ctfbasedspawn` an "admin command", but its CF registration is `CF_PLAYER | CF_SPC_ADMIN | CF_MATCHLESS` (commands.c:927) -- any player or admin spectator, not admin-only.

### Proposed draft

```
CTF spawn-point selection policy.

Effect:
  0 = standard deathmatch spawns (team-base spawn at match start only).
  1 = always spawn at own team base.
  2 = 50/50 pick between a neutral mid-map spawn and home-base spawn on
      each respawn (reduces repeated spawn kills when the flag is overrun).

On maps with very few deathmatch spawns (<=1 info_player_deathmatch), the
server auto-promotes this to 1 at world-load if it is currently 0, and the
`ctfbasedspawn` toggle is refused while the cvar is 1 under that constraint.

Prerequisites: CTF mode must be active.

Permission:    server config, or `ctfbasedspawn` in-game (any player or admin spectator; CTF only; pre-match only).
Match-state:   pre-match only (unless matchless mode).
Default:       0.

Example:
  # server.cfg -- force base spawns on maps without adequate DM spawn points
  k_ctf_based_spawn 1
  # or use value 2 on well-populated CTF maps to reduce spawn-kill clustering
  k_ctf_based_spawn 2
  # in-game (any player or admin spectator, pre-match):
  ctfbasedspawn

See also: ctfbasedspawn (paired toggle, 0↔1 only).
```

### Notes

- FLAG: existing description calls `ctfbasedspawn` an "admin command". Source CF flag is `CF_PLAYER | CF_SPC_ADMIN | CF_MATCHLESS` -- any player or admin spectator, not admin-only. Apply-pass-author must correct the permission framing in this card's "Set by" reference and in the `ctfbasedspawn` card's Headliner.
- Value 2 can only be set via server config; `ctfbasedspawn` toggle covers 0↔1 only. Documented in the Permission line ("server config, or `ctfbasedspawn` in-game") -- the `ctfbasedspawn` card's See-also should note the toggle only covers 0↔1.
- The auto-promotion behavior (world-load promoting 0 to 1 when map has <=1 deathmatch spawn, src/world.c:622) is a genuine surprise-bearing prerequisite and is surfaced in Effect.

---

## ctfbasedspawn (KTX command, Mode-scoped knobs -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:927
- **Catalog line**: 12441
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the k_ctf_based_spawn cvar between 0 and 1, switching CTF spawn-point selection between standard deathmatch spawns (0) and team-base spawns (1). CTF mode only -- refuses with "Can't do this in non CTF mode" on non-CTF servers. On maps with very few deathmatch spawns the toggle is refused and base-spawn is enforced automatically.
>
> Set by: admin command 'ctfbasedspawn' in-game (CTF mode only; not while a match is in progress unless matchless).

### Shape classification

Shape 1c command side (Shape 1 + mode-precondition). The handler `CTFBasedSpawn` (ctf.c:849) has a CTF mode check before calling `cvar_toggle_msg`. CF registration: `CF_PLAYER | CF_SPC_ADMIN | CF_MATCHLESS` (commands.c:927).

Flagged: the existing description calls this an "admin command". The CF flag `CF_PLAYER | CF_SPC_ADMIN` means any player or admin spectator -- not admin-only.

### Proposed draft

```
Toggles the CTF spawn-point rule (k_ctf_based_spawn) between 0 and 1.

Effect: Flips k_ctf_based_spawn between 0 (standard deathmatch spawns) and 1
(always spawn at own team base). Re-running toggles back.
Re-running while the map auto-enforces base-spawn (<=1 deathmatch spawn on map)
is refused with "Spawn on base enforced due to map limitation".

Prerequisites: CTF mode must be active -- refuses with "Can't do this in non CTF mode" otherwise.

Permission:    any player or admin spectator.
Match-state:   pre-match only (unless matchless mode).

Example:
  ctfbasedspawn

See also: k_ctf_based_spawn (cvar -- holds the full 0/1/2 value range; this command covers 0↔1 only).
```

### Notes

- FLAG: existing description labels this an "admin command". CF registration is `CF_PLAYER | CF_SPC_ADMIN | CF_MATCHLESS` -- any player or admin spectator. The Headliner must NOT include "Admin command that...". The corrected Headliner is "Toggles the CTF spawn-point rule (k_ctf_based_spawn) between 0 and 1."
- Toggle covers only 0↔1; the full cvar has a value 2. Value 2 can only be set directly in server config. Noted in See-also to avoid confusion.
- The "matchless mode" exception is reflected in the Match-state line per the CF_MATCHLESS flag.

---

## k_ctf_custom_models (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:952
- **Catalog line**: 11171
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects whether CTF flags and the grappling hook use dedicated CTF models or the original Quake key models. Only takes effect when CTF is active.
>
> 0 = use original Quake models for flags and hook.
> 1 = use dedicated CTF models (precached server-side).
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command). `RegisterCvar("k_ctf_custom_models")` at world.c:952; no `cvar_toggle_msg` or `cvar_fset` write site from any command handler. Read sites: ctf.c (flag and hook model selection), weapons.c:1922 (grapple model), grapple.c:153/493 (hook model), race.c:4934 (race pacemaker jump entity model).

Flagged: existing description only mentions CTF. Source at race.c:4934 shows the cvar also controls the race-mode pacemaker jump entity's model (`progs/star.mdl` vs `progs/lavaball.mdl`).

### Proposed draft

```
Selects whether CTF flags and the grappling hook use dedicated CTF models or the original Quake key models.

Effect:
  0 = original Quake key models for flags; original models for grapple/hook.
  1 = dedicated CTF models precached server-side (flag.mdl, dedicated hook
      model); also affects the race-mode pacemaker jump entity model.

The cvar is evaluated at world-load: if CTF (or Race) is not among the
allowed modes, the precache is skipped even if the cvar is 1.

Permission:    server config only.
Default:       0.

Example:
  # server.cfg
  k_ctf_custom_models 1

See also: k_ctf_hook (enables the grappling hook itself; custom models apply
          when hook is also enabled).
```

### Notes

- FLAG: existing description says "Only takes effect when CTF is active." Source at world.c:1162 shows the precache condition is `isCTF() || isRACE()` -- Race mode also triggers the custom model path. The description should reflect both modes.
- race.c:4934 usage: when `k_ctf_custom_models` is set, the race pacemaker jump entity uses `progs/star.mdl` instead of `progs/lavaball.mdl`. This is a real user-visible difference in Race mode.
- No paired command confirmed by grepping for `cvar_toggle_msg.*k_ctf_custom` and `cvar_fset.*k_ctf_custom` -- both return no results.

---

## k_ctf_ga (KTX cvar, Mode-scoped knobs -- Shape 1)

- **Status**: drafted
- **Source**: src/world.c:961
- **Catalog line**: 11202
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Gives every player a 50-point green armor bonus on spawn in CTF mode. Active only during a live match; no effect in instagib or dmm4.
>
> 0 = no spawn armor.
> 1 = 50 green armor on spawn.
>
> Default: 0.
> Set by: server config or admin command 'noga' in-game.

### Shape classification

Shape 1 cvar+toggle pair. The `noga` command calls `cvar_toggle_msg(self, "k_ctf_ga", redtext("green armor"))` (ctf.c:802). `noga` CF registration: `CF_BOTH_ADMIN | CF_MATCHLESS` (commands.c:922) -- admin only. The match-state constraint comes from client.c:2349: `if (cvar("k_ctf_ga") && deathmatch < 4 && match_in_progress == 2)` -- the armor is only applied when the match is live (match_in_progress == 2) and not in dmm4.

### Proposed draft

```
Gives every CTF player 50 green armor on each spawn during a live match.

Effect:
  0 = no spawn armor.
  1 = 50 green armor (IT_ARMOR1, 0.3 protection) given at spawn; active
      only while a match is in progress and not in instagib or dmm4.

Permission:    server config, or `noga` admin command in-game (admin only; CTF only; pre-match only).
Match-state:   armor effect applies during live match only (no effect before match starts).
Default:       0.

Example:
  # server.cfg
  k_ctf_ga 1
  # or toggle in-game as admin (pre-match):
  noga

See also: noga (paired admin toggle).
```

### Notes

- Shape 1 clean -- no contradictions with source.
- The "no effect in instagib or dmm4" restriction comes from client.c:2349 checking `deathmatch < 4` -- verified from source.
- `noga` is `CF_BOTH_ADMIN` (admin only), not `CF_PLAYER | CF_SPC_ADMIN`. No flag needed here; the existing description's "admin command" wording is correct for `noga`.

---

## k_ctf_hook (KTX cvar, Mode-scoped knobs -- Shape 1)

- **Status**: drafted
- **Source**: src/world.c:953
- **Catalog line**: 11233
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables the grappling hook for all players in CTF mode. When on, players spawn with the hook in their inventory and can quick-switch to it by re-selecting the axe. When turned off, the hook is removed from all players and any in-flight hook is reset.
>
> 0 = hook disabled.
> 1 = hook enabled (given at spawn).
>
> Default: 0.
> Set by: server config or 'nohook' admin command in-game.

### Shape classification

Shape 1c cvar side (Shape 1 + mode-precondition). The `nohook` command calls `cvar_toggle_msg(self, "k_ctf_hook", redtext("hook"))` (ctf.c:772) and has a CTF mode check (ctf.c:765). `nohook` CF registration: `CF_PLAYER | CF_MATCHLESS` -- any player (spectators excluded), not admin-only.

The existing description says "Set by: server config or 'nohook' admin command" -- `nohook` is any-player, not admin. This is a localized flag. However, given `nohook` is the paired toggle card and will be flagged there, and the cvar card's reference to "admin command" is just a label inherited from the old shape -- the factual claim is technically on the command card. The cvar card is accurate about the behavior; the permission attribution is a note for the apply-pass-author.

### Proposed draft

```
Enables the grappling hook for all players in CTF mode.

Effect:
  0 = hook disabled; not given at spawn; any in-flight hook is reset and
      removed on toggle-off.
  1 = hook enabled; players receive it in inventory at spawn and can
      quick-switch to it by re-selecting the axe slot.

In matchless mode, toggling takes effect live for all connected players.

Prerequisites: CTF mode must be active (nohook refuses with "Can't do this in non CTF mode" otherwise).

Permission:    server config, or `nohook` in-game (any player; CTF only; pre-match only).
Match-state:   pre-match only (unless matchless mode).
Default:       0.

Example:
  # server.cfg
  k_ctf_hook 1
  # in-game (pre-match, any player):
  nohook

See also: nohook (paired toggle), k_ctf_hookstyle (selects hook physics style when hook is enabled).
```

### Notes

- The "Set by: server config or 'nohook' admin command" from the existing description reflects old shape framing. The corrected Permission line on this card reads "any player" to match the `nohook` CF flag (`CF_PLAYER | CF_MATCHLESS`). The apply-pass-author should verify the `nohook` card is updated simultaneously to avoid inconsistency.
- Live-apply-on-toggle behavior in matchless mode is explicitly coded at ctf.c:774-785 (`AddHook(true/false)` call when `k_matchLess`). Surfaced in Effect.

---

## nohook (KTX command, Mode-scoped knobs -- Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:916
- **Catalog line**: 12753
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command (CTF mode only). Toggles the grappling hook on or off by flipping the k_ctf_hook setting. The change is announced server-wide. In matchless mode the hook is applied or removed live for all connected players. Blocked while a match is in progress on non-matchless servers.
>
> Set by: admin command 'nohook' in-game.

### Shape classification

Shape 1c command side (Shape 1 + mode-precondition). Handler `nohook` (ctf.c:758) has CTF mode check + `cvar_toggle_msg(self, "k_ctf_hook", ...)`. CF registration: `CF_PLAYER | CF_MATCHLESS` (commands.c:916).

Flagged: existing description says "Admin command". CF flag `CF_PLAYER | CF_MATCHLESS` means any player (spectators excluded) when matchless -- NOT admin-only. There is no `CF_PLR_ADMIN` or `CF_SPC_ADMIN` in the registration.

### Proposed draft

```
Toggles the grappling hook rule (k_ctf_hook) on or off.

Effect: Flips k_ctf_hook between 0 (disabled) and 1 (enabled). Toggle is
announced server-wide. In matchless mode, the hook is applied or removed live
for all connected players immediately.

Prerequisites: CTF mode must be active -- refuses with "Can't do this in non CTF mode" otherwise.

Permission:    any player (spectators excluded).
Match-state:   pre-match only (unless matchless mode).

Example:
  nohook

See also: k_ctf_hook (state cvar -- holds the enabled/disabled value), k_ctf_hookstyle (physics style when hook is on).
```

### Notes

- FLAG: existing description labels this "Admin command". CF registration is `CF_PLAYER | CF_MATCHLESS` -- any player, no admin requirement. Headliner and Permission must NOT include "Admin command". This is a factual error in the existing description; the apply-pass-author must correct it.
- No `CF_SPC_ADMIN` in registration either -- spectators (including admin spectators) cannot invoke this command. Permission line is "any player (spectators excluded)."
- The `CF_MATCHLESS` flag means the command can be run while a match is in progress IF the server is in matchless mode. This aligns with the existing description's mention of matchless exception.

---

## k_ctf_hookstyle (KTX cvar, Mode-scoped knobs -- Shape 7b state cvar)

- **Status**: drafted
- **Source**: src/world.c:954
- **Catalog line**: 11264
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects the grappling-hook physics style for CTF.
>
> 0 = default: throw speed 1050, no special cancel.
> 1 = smooth: accelerating pull up to speed 800, ~250ms cancel delay, faster refire cooldown.
> 2 = fast: fixed pull speed 800, ~80ms cancel delay.
> 3 = classic: throw speed 800 (original PureCTF), no automatic cancel on release.
> 4 = fastest: throw speed 1200, hook cancelled immediately on release.
>
> Default: 1 (per shipped ktx.cfg).
> Set by: server config.

### Shape classification

Shape 7b state cvar + command-per-value fan-out target. This cvar is the state target for four per-value vote commands: `hook_smooth` (sets value 1), `hook_fast` (2), `hook_classic` (3), `hook_crhook` (4). The vote commands write to this cvar via `cvar_fset("k_ctf_hookstyle", N)` on vote-pass (vote.c:1231/1275/1318/1362).

The registered code default is 0 (`RegisterCvar("k_ctf_hookstyle")` with no default argument); the shipped `ktx.cfg` sets value 1 as the operational default. The existing description correctly notes this distinction.

`k_vp_hookstyle` is the threshold cvar read by the smooth/fast/classic vote channels (OV_HOOKSMOOTH/HOOKFAST/HOOKCLASSIC cases in `get_votes_req`). `hook_crhook` (OV_HOOKCRHOOK) is NOT in that switch -- it falls through to the hardcoded 51% floor (vote.c:237) per the per-batch cross-context note.

### Proposed draft

```
Selects the grappling-hook physics style for CTF. Set by server config or
changed at any time via per-style vote commands (hook_smooth, hook_fast,
hook_classic, hook_crhook).

Effect:
  0 = default: throw speed 1050 (NEW_THROW_SPEED), fixed pull speed 800,
      auto-cancel on release with no delay.
  1 = smooth: throw speed 1050, accelerating pull (ramps to 800 over ~77ms),
      ~250ms cancel delay, faster refire cooldown.
  2 = fast: throw speed 1050, fixed pull speed 800, ~80ms cancel delay.
  3 = classic: throw speed 800 (original PureCTF), no automatic cancel on
      button-release (hold to stay hooked).
  4 = fastest (crhook): throw speed 1200 (CR_THROW_SPEED), immediate cancel
      on release.

Prerequisites: k_ctf_hook must be enabled (value 1) for style selection
to have any gameplay effect.

Permission:    server config, or changed via hook style vote commands
               (hook_smooth / hook_fast / hook_classic / hook_crhook).
Default:       0 (registered default); ktx.cfg ships with value 1 (smooth).

Example:
  # server.cfg
  k_ctf_hook 1
  k_ctf_hookstyle 3
  # in-game, any player votes:
  hook_classic

See also: hook_smooth (votes for value 1), hook_fast (votes for value 2),
          hook_classic (votes for value 3, canonical hook-vote card),
          hook_crhook (votes for value 4, uses hardcoded 51% threshold
          instead of k_vp_hookstyle), k_vp_hookstyle (vote threshold for
          smooth/fast/classic channels), k_ctf_hook (master enable cvar).
```

### Notes

- Cross-batch context confirmed: `hook_crhook` uses hardcoded 51% (vote.c:237 `float percent = 51`), not `k_vp_hookstyle`. OV_HOOKCRHOOK has no case in the `get_votes_req` switch.
- Registered code default is 0 (bare `RegisterCvar` call), not 1. The ktx.cfg setting is the operational server default. Both are noted in the Default line.
- See-also exceeds 4-5 entries due to the 4-sibling fan-out + threshold cvar + master enable -- this is expected for the state-cvar anchor card of a fan-out family. The dispatcher context explicitly loads these as load-bearing cross-links.
- Value 5 ("fastest" in existing description) is actually value 4 in source (CR_THROW_SPEED at grapple.c:449). The existing description labels it "fastest" as a mnemonic name; the source label is "crhook" per the vote command name. Kept consistent with source labeling.

---

## k_ctf_hurt_items (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:963
- **Catalog line**: 11298
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether CTF flags and runes that fall into a damage trigger (lava, slime, void) are automatically recovered. When enabled, a flag returns to its spawn point and a rune respawns instead of being lost.
>
> 0 = flags/runes lost to hazards.
> 1 = flags/runes automatically recovered.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). `RegisterCvar("k_ctf_hurt_items")` at world.c:963; no `cvar_toggle_msg` or `cvar_fset` write site from any command handler found. Single read site: triggers.c:941 inside `hurt_items()`, which fires when a trigger-hurt entity touches a flag or rune.

Existing description is accurate and complete. Recast is structural only (v1 → v2 shape).

### Proposed draft

```
Controls whether CTF flags and runes that contact a damage trigger (lava,
slime, void) are automatically recovered rather than lost.

Effect:
  0 = flags and runes are lost if they enter a damage trigger.
  1 = a flag that enters a damage trigger returns to its base spawn point;
      a rune that enters a damage trigger respawns immediately.

Permission:    server config only.
Default:       0.

Example:
  # server.cfg
  k_ctf_hurt_items 1

See also: k_ctf_hook (grappling hook enable), k_ctf_runes (CTF runes enable).
```

### Notes

- Clean Shape 3 recast. No contradictions with source.
- The recovery mechanism is in triggers.c:939-953: `hurt_items()` is the touch callback for trigger-hurt entities. On flag contact: sets `other->super_time = g_globalvars.time` which triggers flag return. On rune contact: sets `other->s.v.nextthink = g_globalvars.time` which triggers rune respawn.
- See-also includes `k_ctf_runes` as the rune-system enable cvar (not in this chunk but load-bearing for "why would hurt_items matter without runes"). Operator can verify `k_ctf_runes` exists as an L1 entity at apply time.

---

## mctf (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted
- **Source**: src/ctf.c:805 (handler); src/commands.c:923 (registration)
- **Catalog line**: 12643
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF-only command that permanently disables the grappling hook and runes for the current game. One-way -- cannot be toggled back. Reports "Already done" if both are already off. Refused outside CTF mode or during a live non-matchless match. In matchless mode, immediately strips runes from all carriers and removes active hooks.
>
> Set by: admin command (in CTF mode).

### Shape classification

shape-less -- `mctf` is a one-shot CTF admin action that sets two cvars (`k_ctf_hook` and `k_ctf_runes`) to 0 and runs live cleanup logic. It is the command-side lever for modifying `k_ctf_hook` and `k_ctf_runes` -- those cvars carry the relationship shape (if any). The command itself has no inter-entity pairing relationship (no cvar it mirrors via cvar_toggle_msg; it writes two cvars one-way). No Shape 1 (no `cvar_toggle_msg`, one-way not a flip). No Shape 11 (two cvars, not per-bit XOR on a shared container). Command-side lever; shape tag lives on the target cvars.

### Proposed draft

```
Disables the grappling hook and runes for the current CTF game (one-way -- cannot be re-enabled without restarting).

Effect:
  Sets k_ctf_hook and k_ctf_runes to 0.
  In matchless mode, also immediately strips runes from any player carrying one and removes active hooks.
  Reports "Already done" if both are already off.

Prerequisites: CTF mode must be active ("Can't do this in non CTF mode").

Permission:    admin only
Match-state:   pre-match only; also usable during a matchless live match.

Example:
  mctf
  (confirms: "hook & runes" turned off; or "Already done" if already disabled)

See also: k_ctf_hook (hook enable state), k_ctf_runes (runes enable state), norunes (runes-only disable)
```

### Notes

- `mctf` is correctly described as admin-only -- source confirms `CF_BOTH_ADMIN`. No flag needed.
- The `CF_MATCHLESS` flag means it works during a matchless live match, which is correctly captured.
- The one-way nature is source-verified: the handler only sets both cvars to 0, never toggles back.
- `norunes` (adjacent command at `commands.c:921`) only disables runes; `mctf` disables both hook AND runes. Worth the cross-link for disambiguation.
- No "Default" line: this is a command, not a cvar.

---

## noweapon (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:837 (registration), src/commands.c:5240 (handler)
- **Catalog line**: 12836
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Manages the dmm4 weapon-disallow list (k_disallow_weapons). Only works in deathmatch mode 4.
>
> No argument: prints the current disallowed-weapons list.
> One argument (weapon name axe/sg/ssg/ng/sng/gl/rl/lg, or its number 1-8): toggles that weapon between allowed and disallowed and announces the change.
> During a live match: only shows the list (no changes allowed).
>
> Set by: admin command in-game.

### Shape classification

shape-less -- `noweapon` is a multi-arg dispatcher that performs per-bit XOR on `k_disallow_weapons` for whichever single weapon is named. The shape-catalog explicitly documents this pattern: "ONE command, N subcommand-args -- not Shape 11." It is not Shape 11a (which has N separately-registered top-level toggle commands each owning one bit). It is not Shape 8 (no internal subcommand lookup table; just a linear arg-match chain). The command is the operational lever for `k_disallow_weapons`; that cvar carries its own shape classification.

### Proposed draft

```
Prints or modifies the weapon-disallow list (k_disallow_weapons) for dmm4 matches.

Effect:
  No argument: prints the current list of disallowed weapons.
  With a weapon argument: XOR-toggles that weapon's bit in k_disallow_weapons (allows <-> disallows) and broadcasts the change.
  During a live match: only prints the list -- no changes accepted.

Prerequisites: deathmatch mode 4 must be active ("command allowed in dmm4 only").

Permission:    any player or admin spectator
Match-state:   pre-match for changes; any time to read.

Example:
  noweapon            (prints current list)
  noweapon lg         (toggles lightning gun between allowed and disallowed)
  noweapon 7          (same as 'noweapon rl' -- numeric aliases 1-8 match axe/sg/ssg/ng/sng/gl/rl/lg)

See also: k_disallow_weapons (bitmask state container), no_lg (alias for 'noweapon lg'), no_gl (alias for 'noweapon gl')
```

### Notes

- FLAG: existing description says "admin command in-game" -- source registration is `CF_PLAYER | CF_PARAMS | CF_SPC_ADMIN`, which is "any player or admin spectator" (NOT admin-only). `CF_PLAYER` (bit 0) = valid for players; `CF_SPC_ADMIN` (bit 3) = admin spectator. Any in-game player can call this command.
- `no_lg` and `no_gl` are thin wrapper commands (`commands.c:5325-5332`) that issue `noweapon lg` / `noweapon gl` via stuffcmd; worth mentioning in See-also for discoverability.
- Handler reads `k_disallow_weapons & DA_WPNS` before XOR -- the DA_WPNS mask ensures only weapon bits are operated on.

---

## k_cg_kb (KTX cvar, Mode-scoped knobs -- Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/world.c:977 (registration)
- **Catalog line**: 11048
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for coilgun kickback in Instagib mode. When enabled, each coilgun shot spawns an invisible projectile that delivers rocket-launcher-style splash damage and knockback on impact, giving the coilgun rocket-jump and push capability. Only active while k_instagib is enabled.
>
> 0 = no kickback (pure hitscan, no push).
> 1 = kickback projectile spawned on each shot.
>
> Default: 1.
> Set by: server config or 'cg_kb' admin command in-game.

### Shape classification

Shape 1c (cvar + paired toggle command with mode-precondition). The toggle command `instagib_coilgun_kickback` calls `cvar_toggle_msg(self, "k_cg_kb", ...)` after checking `if (!cvar("k_instagib")) { print("cg_kb requires Instagib"); return; }` -- exactly the Shape 1c signature (toggle with mode-precondition before cvar_toggle_msg). The mode-precondition is `k_instagib` being set.

### Proposed draft

```
Whether each coilgun shot in Instagib mode spawns a kickback projectile that delivers splash damage and knockback on impact, enabling rocket-jump and push capability with the coilgun.

0 = no kickback (pure hitscan, no push force).
1 = kickback projectile spawned on each shot.

Prerequisites: k_instagib must be enabled; toggling via 'instagib_coilgun_kickback' is refused otherwise ("cg_kb requires Instagib").
  Also: toggling via the Instagib preset (k_instagib) resets this to 1.

Permission:    server config or 'instagib_coilgun_kickback' in-game (any player or admin spectator)
Match-state:   pre-match only
Default:       1.

Example:
  # server.cfg
  k_instagib 1
  k_cg_kb 0   (pure hitscan -- no kickback projectile)

  # or in-game after 'instagib' is active:
  instagib_coilgun_kickback   (toggles kickback on/off)

See also: instagib_coilgun_kickback (toggle command), k_instagib (required mode cvar), instagib (mode toggle command)
```

### Notes

- FLAG: existing description names the toggle command as `'cg_kb'` -- source shows the registered command name is `instagib_coilgun_kickback` (`commands.c:959`). No command named `cg_kb` exists in the command table. Apply-pass-author should update the command name in the existing description.
- FLAG: existing description says "admin command in-game" -- source registration is `CF_PLAYER | CF_SPC_ADMIN` = "any player or admin spectator", not admin-only.
- Behavioral note: `ToggleInstagib` at `commands.c:7834` resets `k_cg_kb` to "1" whenever instagib is enabled via the `instagib` command. Captured in Prerequisites as surprise-bearing behavior.

---

## k_nosweep (KTX cvar, Mode-scoped knobs -- Shape 1c)

- **Status**: drafted
- **Source**: src/world.c:909 (registration)
- **Catalog line**: 12256
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prevents players from picking up a weapon they already carry in dmm1. Touching a duplicate weapon does nothing -- no re-take, no sweep ammo gained.
>
> 0 = weapons can be re-swept normally.
> 1 (or non-zero) = duplicate-weapon pickup blocked.
>
> DMM1 only. The server automatically resets this to 0 in any other deathmatch mode.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 1c (cvar + paired toggle command with mode-precondition). The toggle command `nosweep` (`commands.c:954`) calls `is_rules_change_allowed()` + checks `if (deathmatch != 1) { print("nosweep requires dmm1"); return; }` before `cvar_toggle_msg(self, "k_nosweep", ...)`. Matches the Shape 1c source signature exactly. The existing description says "Set by: server config" -- but the paired toggle command `nosweep` exists and has `CF_PLAYER | CF_SPC_ADMIN`. This is Shape 1c, not Shape 3.

### Proposed draft

```
Whether players are blocked from picking up a weapon they already carry in dmm1 (duplicate-weapon pickup prevention).

0 = weapons can be re-swept normally (full ammo sweep on touch).
1 = duplicate-weapon touch does nothing -- no re-take, no ammo gained.

Prerequisites: deathmatch mode 1 must be active. The server automatically resets k_nosweep to 0 when switching to any other deathmatch mode.

Permission:    server config or 'nosweep' in-game (any player or admin spectator)
Match-state:   pre-match only
Default:       0.

Example:
  # server.cfg
  k_nosweep 1

  # or toggle in-game (requires dmm1 active):
  nosweep

See also: nosweep (toggle command), k_instagib (instagib auto-resets nosweep's mode gate)
```

### Notes

- Existing description says "Set by: server config" -- this is a Shape 1c cvar with a paired toggle command `nosweep`. The Set-by line needs to reflect both server config and in-game toggle. No flag needed because the existing description content is correct; the shape classification just reveals the missing paired-command reference.
- The auto-reset behavior (world.c:1775-1777) is source-verified: if k_nosweep is non-zero and deathmatch != 1, the server calls `cvar_fset("k_nosweep", 0)`. Captured in Prerequisites.
- items.c read sites: `k_nosweep` is read in the weapon pickup logic to block duplicate-weapon pickup per player items bitmask. Behavioral intent matches existing description accurately.

---

## k_teleport_cap (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1012 (registration)
- **Catalog line**: 12320
- **Anchor**: v1.36-1633-g67253dc

### Current description

> In yawn mode, the percentage of a player's entry speed that is lost on passing through a teleporter. Has no effect when yawn mode is off.
>
> Range: 0 to 100 (percent, clamped). 0 = full entry speed preserved; 100 = maximum speed reduction. Exit speed is never lower than 300 regardless of the value.
>
> Default: 24.
> Set by: server config or 'setTeleportCap' admin command in-game.

### Shape classification

Shape 3 (no paired toggle command). The `teleportcap` command sets `k_teleport_cap` via `cvar_fset` with a user-supplied numeric value -- this is not a `cvar_toggle_msg` toggle (no binary flip). It is a direct numeric setter, not a Shape 1/1c pair. The `teleportcap` command is the command-side lever; `k_teleport_cap` is Shape 3 from the cvar perspective (no toggle command; set by server config or numeric setter).

Note: the existing description names the command as `setTeleportCap` -- the registered user-facing command name is `teleportcap` (commands.c:998). `setTeleportCap` is the internal C function name, not the user-facing command.

### Proposed draft

```
The percentage of a player's entry speed that is absorbed on passing through a teleporter, active only in yawn mode.

Range: 0-100 (clamped). 0 = full entry speed preserved; 100 = maximum speed reduction. Exit speed is never lower than 300 regardless of this value.

Prerequisites: k_yawnmode must be on for this setting to have any effect.

Permission:    server config or 'teleportcap' in-game (any player or admin spectator, yawn mode required)
Default:       24.

Example:
  # server.cfg
  k_yawnmode 1
  k_teleport_cap 40   (retain 60% of entry speed through teleporters)

  # or in-game:
  teleportcap 40

See also: teleportcap (in-game setter command), k_yawnmode (required mode cvar)
```

### Notes

- FLAG: existing description names the setter command as `setTeleportCap` -- this is the internal C handler function name; the registered command name is `teleportcap` (commands.c:998). Apply-pass-author should update to `teleportcap`.
- FLAG: existing description says "admin command" -- source registration is `CF_PLAYER | CF_SPC_ADMIN` = "any player or admin spectator". Not admin-only.
- The default of 24 is from globals.c: `int k_teleport_cap = 24;` (not from RegisterCvar which has no default). Source-verified.
- Exit speed floor of 300 is source-verified at triggers.c:591: `vel = max(300, vel)`.

---

## teleportcap (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:998 (registration), src/commands.c:8655 (handler)
- **Catalog line**: 12985
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the teleport momentum cap for yawn mode (`k_teleport_cap`). Yawn mode must be on; reports "Yawn mode required to be on" otherwise. During a live match, prints the current cap and changes nothing. With a numeric argument outside a match, clamps the value to 0-100, applies yawn-mode settings immediately, and broadcasts the new cap to all players. With no argument outside a match, sets the cap to 0. The cap controls how much horizontal speed is preserved through a teleport (0 = full preservation, 100 = maximum reduction).
>
> Range: 0-100 (percentage).
>
> Default: 0.
> Set by: any in-game player or spectator-admin via 'teleportcap' command (yawn mode required).

### Shape classification

shape-less -- `teleportcap` is the numeric setter command for `k_teleport_cap`. It is not a toggle (no `cvar_toggle_msg`), not a cycle (no wrap increment), and not a Shape 11 per-bit XOR. It is the command-side lever for `k_teleport_cap`; the shape tag (Shape 3) lives on the cvar card. Command itself is shape-less.

### Proposed draft

```
Sets the teleport momentum cap (k_teleport_cap) for yawn mode.

Effect:
  With a numeric argument: clamps the value to 0-100, sets k_teleport_cap, applies immediately, and broadcasts the new cap to all players.
  No argument: sets the cap to 0.
  During a live match: prints the current cap and changes nothing.

Prerequisites: k_yawnmode must be on ("Yawn mode required to be on").

Permission:    any player or admin spectator
Match-state:   pre-match for changes; mid-match prints current cap only.

Example:
  teleportcap 40   (set cap to 40% -- retain 60% of entry speed)
  teleportcap      (reset cap to 0 -- full speed preservation)

See also: k_teleport_cap (state cvar), k_yawnmode (required mode cvar), yawnmode (yawn mode toggle command)
```

### Notes

- FLAG: existing description has "Default: 0" -- commands have no default. The default belongs on the cvar card (`k_teleport_cap`, default 24). The "0" here reflects the behavior of a no-argument invocation (sets cap to 0), which is already captured in Effect. Remove the Default line.
- FLAG: existing description says "any in-game player or spectator-admin" -- source CF flags are `CF_PLAYER | CF_SPC_ADMIN` = "any player or admin spectator." The phrasing in the existing description conflates these; the standard permission line wording applies.
- Source-verified: no-argument behavior -- `trap_CmdArgv(1, arg, ...)` with no extra arg produces empty string; `atoi("") = 0`; so cap is set to 0. The existing description's "with no argument sets cap to 0" is correct.
- The "Yawn mode required to be on" refusal message is quoted verbatim from source (commands.c:8661).

---

## k_freshteams (KTX cvar, Mode-scoped knobs -- Shape 1c cvar half)

- **Status**: drafted
- **Source**: src/world.c:894
- **Catalog line**: 11581
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master toggle for Fresh Teams mode. Only valid in dmm1 -- automatically disabled if deathmatch is not 1. When enabled, weapons respawn on a short timer (k_freshteams_weapon_time seconds) and the Fresh Teams sub-options become available: limited backpack ammo, limited weapon ammo on sweep, fast ammo, and timed weapon respawns.
>
> 0 = Fresh Teams off.
> 1 = Fresh Teams on (scoreboard shows "FreshTeams on").
>
> Default: 0.
> Set by: server config or admin command 'freshteams'.

### Shape classification

Shape 1c cvar half (Shape 1 + mode-precondition: dmm1). The paired toggle command is `fresh`. The toggle handler (`ToggleFreshTeams`) checks `deathmatch != 1` before calling `cvar_toggle_msg`. Additionally, `world.c:1770` auto-forces the cvar back to 0 on mode change if deathmatch leaves 1 -- this is a mode-invariant enforcement that the existing description correctly captures. The sub-option cvars (`k_freshteams_limit_packs`, `k_freshteams_limit_sweep_ammo`, `k_freshteams_fast_ammo`) are Shape 4 gated by this cvar.

### Proposed draft

```
Whether Fresh Teams mode is active -- a dmm1 variant where weapons respawn on a short timer and ammo economy is configurable.

Effect:
  0 = Fresh Teams off; weapons use the standard 30-second respawn.
  1 = Fresh Teams on; weapon respawn time is controlled by k_freshteams_weapon_time.
      Scoreboard shows "FreshTeams on". Sub-options (freshpacks, freshguns, freshtime)
      become available.

Prerequisites: dmm1 must be active. If deathmatch changes away from 1 while Fresh Teams
is on, the server automatically resets this cvar to 0.

Permission:    server config or 'fresh' in-game (pre-match only).
Match-state:   pre-match only.
Default:       0.

Example:
  # server.cfg
  deathmatch 1
  k_freshteams 1
  k_freshteams_weapon_time 20

  # or toggle in-game (pre-match):
  fresh

See also: fresh (paired toggle), k_freshteams_weapon_time (respawn timer), k_freshteams_limit_packs (backpack ammo gate), k_freshteams_limit_sweep_ammo (sweep ammo gate), k_freshteams_fast_ammo (ammo respawn modifier)
```

### Notes

- See-also has 5 entries (at cap). The full Fresh Teams feature family is large enough to warrant an L3 concept note; flagged as follow-up.
- The `fresh` command was drafted in the Mode selection batch (Shape 1c command side). The cross-reference here closes the pair.

---

## freshguns (KTX command, Mode-scoped knobs -- Shape 1 + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:952
- **Catalog line**: 12468
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command: toggle the FreshGuns rule on or off. When on, picking up (sweeping) a weapon in FreshTeams mode grants limited ammo rather than the full load. Broadcasts the new state when toggled. Requires FreshTeams to be enabled first; blocked during a live match or in race mode.
>
> Set by: admin command '/freshguns' (outside of a live match).

### Shape classification

Shape 1 command side (toggles `k_freshteams_limit_sweep_ammo` via `cvar_toggle_msg`) + Shape 4 gate (checks `!k_freshteams`, refuses with "FreshGuns requires FreshTeams (/fresh)"). The existing description labels this "Admin command" but the CF flag is `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator, not admin-only. This is a localized factual error in the permission framing.

### Proposed draft

```
Toggles the FreshGuns rule (k_freshteams_limit_sweep_ammo) on or off.

Effect: flips k_freshteams_limit_sweep_ammo between 0 and 1. When on, picking up
a weapon you already own gives only the reduced sweep-ammo amount instead of the
full load. Broadcasts the new state.

Prerequisites: k_freshteams must be enabled ("FreshGuns requires FreshTeams (/fresh)").

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  fresh        # enable Fresh Teams first
  freshguns    # toggle FreshGuns on

See also: k_freshteams_limit_sweep_ammo (cvar this toggles), k_freshteams (prerequisite master toggle), fresh (prerequisite toggle command), k_freshteams_sweep_*_ammo cvars (per-weapon sweep amounts when on)
```

### Notes

- FLAG: existing description says "Admin command" -- source CF flag is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator, not admin-only). Permission line corrected.
- The cvar this toggles (`k_freshteams_limit_sweep_ammo`) carries the 0/1 value enum; not duplicated here per Shape 1 discipline.

---

## freshpacks (KTX command, Mode-scoped knobs -- Shape 1 + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:951
- **Catalog line**: 12495
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the FreshPacks rule on or off. When enabled, dropped backpacks contain limited ammo (the FreshTeams ammo-limit policy). Broadcasts the new state. Requires FreshTeams to already be enabled (/fresh); unavailable during a live match or in race mode.
>
> Set by: admin command 'freshpacks' (toggles k_freshteams_limit_packs between 0 and 1).

### Shape classification

Shape 1 command side (toggles `k_freshteams_limit_packs` via `cvar_toggle_msg`) + Shape 4 gate (checks `!k_freshteams`, refuses with "FreshPacks requires FreshTeams (/fresh)"). CF flag is `CF_PLAYER | CF_SPC_ADMIN`. Existing description does not call it "Admin command" in the Headliner, but the "Set by" framing includes "admin command" -- this is a localized label issue rather than a foundational framing error.

### Proposed draft

```
Toggles the FreshPacks rule (k_freshteams_limit_packs) on or off.

Effect: flips k_freshteams_limit_packs between 0 and 1. When on, ammo in dropped
backpacks is clamped to the per-type limits set by the k_freshteams_pack_* cvars.
Broadcasts the new state.

Prerequisites: k_freshteams must be enabled ("FreshPacks requires FreshTeams (/fresh)").

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  fresh        # enable Fresh Teams first
  freshpacks   # toggle FreshPacks on

See also: k_freshteams_limit_packs (cvar this toggles), k_freshteams (prerequisite master toggle), fresh (prerequisite toggle command)
```

### Notes

- FLAG: existing description's "Set by: admin command" framing implies admin-only. Source CF flag is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator). Permission line corrected.
- The k_freshteams_pack_* cvars (per-type ammo limits) are in chunk 5 -- named in Effect prose only, not added to See-also to keep it under 5.

---

## freshtime (KTX command, Mode-scoped knobs -- Shape 2 + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:953
- **Catalog line**: 12522
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the FreshTeams weapon respawn time through 20, 15, and 10 seconds (a 3-step cycle, not a toggle). Broadcasts the chosen value each time.
>
> Cycle order: 20 s (default) -> 15 s -> 10 s -> 20 s.
>
> Requires FreshTeams to be enabled (/fresh). Refused while a match is in progress or race mode is active.
>
> Set by: admin command in-game (/freshtime).

### Shape classification

Shape 2 command side (cycles `k_freshteams_weapon_time` through 20/15/10/20 via `cvar_set`) + Shape 4 gate (checks `!k_freshteams`, refuses with "FreshTime requires FreshTeams (/fresh)"). The handler uses `cvar_set` (not `cvar_toggle_msg`) with a 3-step cycle: 20->15->10->20. CF flag is `CF_PLAYER | CF_SPC_ADMIN`. Existing description is substantively correct (cycle order is accurate per source lines 7689-7701). The "admin command" framing in "Set by" is a localized label issue.

### Proposed draft

```
Cycles the weapon respawn timer (k_freshteams_weapon_time) through 20, 15, and 10 seconds.

Effect: advances k_freshteams_weapon_time through a 3-step cycle (20 s -> 15 s -> 10 s -> 20 s)
and broadcasts the new value. Also affects ammo respawn when k_freshteams_fast_ammo is on.

Prerequisites: k_freshteams must be enabled ("FreshTime requires FreshTeams (/fresh)").

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  fresh        # enable Fresh Teams first
  freshtime    # cycle to 15 s
  freshtime    # cycle to 10 s
  freshtime    # cycle back to 20 s

See also: k_freshteams_weapon_time (cvar this cycles), k_freshteams (prerequisite master toggle), k_freshteams_fast_ammo (ammo respawn also uses this timer when on)
```

### Notes

- FLAG: existing description says "Set by: admin command in-game (/freshtime)" -- implies admin-only. Source CF flag is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator). Permission line corrected.
- The existing_description correctly identifies this as a cycle (not a toggle) and has the cycle order right. Shape 2 fits cleanly.
- k_freshteams_weapon_time carries the value enum (20/15/10) and Default -- not duplicated here per Shape 2 discipline.

---

## k_freshteams_weapon_time (KTX cvar, Mode-scoped knobs -- Shape 2 cvar half + Shape 4 gate)

- **Status**: drafted
- **Source**: src/world.c:895
- **Catalog line**: 12005
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only: weapon respawn delay in seconds. Replaces the standard 30-second respawn while k_freshteams is on. When k_freshteams_fast_ammo is also enabled, this value is also used as the ammo respawn delay. Has no effect when k_freshteams is off.
>
> Range: seconds (any positive value; applied unclamped at the weapon pickup site).
>
> Default: 20.
> Set by: server config or 'freshtime' admin command (cycles 20 / 15 / 10).

### Shape classification

Shape 2 cvar half (cycled by `freshtime` through 20/15/10) + Shape 4 gate (only effective when `k_freshteams` is on). The existing description is substantively correct. Source confirms: `weapon_time = k_freshteams ? cvar("k_freshteams_weapon_time") : 30` in items.c:812, used as `self->s.v.nextthink = g_globalvars.time + weapon_time` at items.c:1061. Ammo fast-respawn uses this same value at items.c:1355.

### Proposed draft

```
Weapon respawn delay (in seconds) when Fresh Teams mode is active.

Effect:
  Replaces the default 30-second weapon respawn while k_freshteams is on.
  When k_freshteams_fast_ammo is also on, ammo boxes use this same respawn timer
  instead of the standard 30-second (or 15-second dmm3/5) timing.
  Has no effect when k_freshteams is off.

Prerequisites: k_freshteams must be on for this to have any effect.

Permission:    server config or 'freshtime' in-game (pre-match only).
Match-state:   pre-match only (set via freshtime).
Default:       20.

Example:
  # server.cfg
  k_freshteams 1
  k_freshteams_weapon_time 20

  # or cycle in-game (pre-match):
  freshtime    # -> 15 s
  freshtime    # -> 10 s

See also: freshtime (command that cycles this), k_freshteams (prerequisite master toggle), k_freshteams_fast_ammo (makes ammo respawn also use this timer)
```

### Notes

- The existing description says "applied unclamped at the weapon pickup site" -- source at items.c:1061 confirms `self->s.v.nextthink = g_globalvars.time + weapon_time` with no clamping at the assignment. The `bound(0, cvar("k_freshteams_weapon_time"), 60)` in `ToggleFreshTime` only clamps the cycle logic's starting point, not the actual respawn; direct `set` with values above 60 would apply unclamped. L1 content-level this is accurate; omitted from the draft as implementation-detail noise.

---

## k_freshteams_fast_ammo (KTX cvar, Mode-scoped knobs -- Shape 3 + Shape 4 gate)

- **Status**: drafted
- **Source**: src/world.c:896
- **Catalog line**: 11612
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams only. When enabled, ammo boxes respawn on the same timer as weapons (k_freshteams_weapon_time seconds) instead of the normal 30-second (or 15-second in dmm3/5) respawn. Has no effect unless k_freshteams is also set.
>
> 0 = ammo uses standard respawn timing.
> 1 = ammo respawn time matches weapon respawn time.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (no paired toggle command) + Shape 4 gate (only effective when `k_freshteams` is on). Source confirms: `qbool freshteams_fast_ammo = (cvar("k_freshteams") && cvar("k_freshteams_fast_ammo"))` at items.c:1189; if true, `self->s.v.nextthink = g_globalvars.time + cvar("k_freshteams_weapon_time")` at items.c:1355 instead of the standard 30/15 timing. No `cvar_toggle_msg` site -- server config only. Existing description is accurate.

### Proposed draft

```
Whether ammo boxes use the Fresh Teams weapon respawn timer instead of the standard timing.

Effect:
  0 = ammo respawns on the standard 30-second timer (15 seconds in dmm3/5).
  1 = ammo respawns after k_freshteams_weapon_time seconds, matching weapon respawn.
  Has no effect when k_freshteams is off.

Prerequisites: k_freshteams must be on.

Permission:    server config only.
Default:       0.

Example:
  # server.cfg
  k_freshteams 1
  k_freshteams_weapon_time 20
  k_freshteams_fast_ammo 1    # ammo also respawns every 20 s

See also: k_freshteams (prerequisite master toggle), k_freshteams_weapon_time (timer value shared by ammo when this is on)
```

### Notes

- No command toggles this cvar; Shape 3 is correct. The existing description is substantively accurate.

---

## k_freshteams_limit_packs (KTX cvar, Mode-scoped knobs -- Shape 1 cvar half + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/world.c:897
- **Catalog line**: 11643
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only: when enabled, caps the ammo in dropped backpacks to the per-type limits set by k_freshteams_pack_shells, k_freshteams_pack_nails, k_freshteams_pack_rockets, and k_freshteams_pack_cells. Has no effect unless k_freshteams is active.
>
> 0 = backpacks carry the full ammo the dead player was holding.
> 1 = each ammo type in the backpack is clamped to its configured maximum.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 1 cvar half (toggled by `freshpacks` via `cvar_toggle_msg`) + Shape 4 gate (consumed at items.c:2672 as `cvar("k_freshteams") && cvar("k_freshteams_limit_packs")`). Source registration: `RegisterCvarEx("k_freshteams_limit_packs", "1")` at world.c:897. The existing description states Default: 0 but source default is "1" -- this is a localized factual contradiction.

### Proposed draft

```
Whether dropped backpacks have their ammo capped to per-type Fresh Teams limits.

Effect:
  0 = backpacks carry the full ammo the dead player was holding.
  1 = each ammo type in the backpack is clamped to its configured maximum
      (k_freshteams_pack_shells, k_freshteams_pack_nails, k_freshteams_pack_rockets,
      k_freshteams_pack_cells).
  Has no effect when k_freshteams is off.

Prerequisites: k_freshteams must be on.

Permission:    server config or 'freshpacks' in-game (pre-match only).
Match-state:   pre-match only (via freshpacks).
Default:       1.

Example:
  # server.cfg
  k_freshteams 1
  k_freshteams_limit_packs 1    # on by default; disable to allow full packs
  k_freshteams_pack_shells 20
  k_freshteams_pack_nails 30
  k_freshteams_pack_rockets 5
  k_freshteams_pack_cells 10

See also: freshpacks (paired toggle), k_freshteams (prerequisite master toggle)
```

### Notes

- FLAG: existing description states Default: 0 but source (`RegisterCvarEx("k_freshteams_limit_packs", "1")` at world.c:897) shows Default: 1. Corrected in draft.
- The k_freshteams_pack_* cvars (chunk 5) are named in Example for discoverability but omitted from See-also to stay under cap. freshpacks is the load-bearing peer.

---

## k_freshteams_limit_sweep_ammo (KTX cvar, Mode-scoped knobs -- Shape 1 cvar half + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/world.c:902
- **Catalog line**: 11674
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only: controls whether picking up a weapon you already carry gives reduced 'sweep' ammo instead of the full amount. Has no effect unless k_freshteams is active. Picking up a weapon you do not yet own always gives the full ammo regardless.
>
> 0 = re-picking an owned weapon gives the standard full ammo (e.g. 30 nails, 5 rockets, 15 cells).
> 1 = re-picking an owned weapon gives only the configured sweep amount (set per-weapon via the k_freshteams_sweep_*_ammo cvars).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 1 cvar half (toggled by `freshguns` via `cvar_toggle_msg`) + Shape 4 gate (read at items.c:810 as `int limit_sweep_ammo = cvar("k_freshteams_limit_sweep_ammo")` and gated by `k_freshteams && limit_sweep_ammo` at each weapon pickup site). Source registration: `RegisterCvarEx("k_freshteams_limit_sweep_ammo", "1")` at world.c:902. The existing description states Default: 0 but source default is "1" -- localized factual contradiction.

### Proposed draft

```
Whether re-picking an owned weapon gives reduced sweep ammo instead of the full load in Fresh Teams mode.

Effect:
  0 = picking up a weapon you already own gives the standard full ammo (e.g. 30 nails, 5 rockets, 15 cells).
  1 = picking up an owned weapon gives only the configured sweep amount for that weapon
      (set per-weapon via the k_freshteams_sweep_*_ammo cvars).
  Picking up a weapon you do not yet own always gives the full ammo, regardless of this setting.
  Has no effect when k_freshteams is off.

Prerequisites: k_freshteams must be on.

Permission:    server config or 'freshguns' in-game (pre-match only).
Match-state:   pre-match only (via freshguns).
Default:       1.

Example:
  # server.cfg
  k_freshteams 1
  k_freshteams_limit_sweep_ammo 1    # on by default

  # or toggle in-game:
  freshguns

See also: freshguns (paired toggle), k_freshteams (prerequisite master toggle)
```

### Notes

- FLAG: existing description states Default: 0 but source (`RegisterCvarEx("k_freshteams_limit_sweep_ammo", "1")` at world.c:902) shows Default: 1. Corrected in draft.
- The k_freshteams_sweep_*_ammo cvars (chunk 6) are named in Effect prose only; omitted from See-also to keep cap at 2 load-bearing peers.

---

## k_freshteams_pack_cells (KTX cvar, Mode-scoped knobs -- Shape 3 + canonical-card)

- **Status**: drafted
- **Source**: src/world.c:901
- **Catalog line**: 11705
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only: maximum cells a dropped backpack may contain when ammo limiting is active. Any cells the dead player carried beyond this ceiling are not transferred to the pack. Has no effect unless k_freshteams and k_freshteams_limit_packs are both enabled.
>
> Units: cells (ammo count).
>
> Default: 10.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command) + canonical-card pattern for the four-sibling pack-ammo family.

The four k_freshteams_pack_* cvars are near-identical siblings: same registration pattern (RegisterCvarEx in world.c:898-901), same consumer site (items.c:2834-2839 via `bound()` clamp inside the `fresh_packs` conditional), same gate conditions (k_freshteams && k_freshteams_limit_packs), same units (ammo count integers), differing only in ammo type and default value. Canonical-card pattern applies: cells is alphabetically first and is the canonical; shells/nails/rockets are reference cards. No cvar_toggle_msg site exists for any of them -- pure Shape 3.

### Proposed draft

```
Cap on cells packed into a dropped backpack when Fresh Teams ammo limiting is active.

Effect:
  When a player dies under Fresh Teams with backpack limiting on, the cells
  in the dropped backpack are clamped to this value. Cells the dead player
  carried above the cap are not transferred -- they are discarded.

Prerequisites:
  k_freshteams must be 1 AND k_freshteams_limit_packs must be 1.
  With either off, this cvar has no effect.

Permission:    server config only
Default:       10

Example:
  # server.cfg -- Fresh Teams pack limits
  k_freshteams 1
  k_freshteams_limit_packs 1
  k_freshteams_pack_shells 20
  k_freshteams_pack_nails 30
  k_freshteams_pack_rockets 5
  k_freshteams_pack_cells 10

  (Note: this is the canonical card for the pack-ammo family. See the
  three sibling cards for shells / nails / rockets limits.)

See also: k_freshteams_pack_shells (sibling -- shells cap), k_freshteams_pack_nails (sibling -- nails cap), k_freshteams_pack_rockets (sibling -- rockets cap), k_freshteams_limit_packs (gate -- enables this family), k_freshteams (master Fresh Teams toggle)
```

### Notes

- Canonical card for the k_freshteams_pack_* family (shells / nails / rockets / cells). Remaining three are reference cards below.
- Source-verified consumer: items.c:2836-2839 uses `bound(0, item->ammo_X, cvar("k_freshteams_pack_X"))` inside `if (fresh_packs)` where `fresh_packs = (cvar("k_freshteams") && cvar("k_freshteams_limit_packs"))` (items.c:2672).
- The freshpacks toggle command (commands.c:951) toggles k_freshteams_limit_packs; included in See-also via the gate cvar rather than direct.

---

## k_freshteams_pack_nails (KTX cvar, Mode-scoped knobs -- Shape 3 + reference-card)

- **Status**: drafted
- **Source**: src/world.c:899
- **Catalog line**: 11735
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only: maximum nails a dropped backpack may contain when ammo limiting is active. Any nails the dead player carried beyond this ceiling are not transferred to the pack. Has no effect unless k_freshteams and k_freshteams_limit_packs are both enabled.
>
> Units: nails (ammo count).
>
> Default: 30.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command) + reference-card in the k_freshteams_pack_* canonical family. See k_freshteams_pack_cells for the canonical card with full description.

### Proposed draft

```
Cap on nails packed into a dropped backpack when Fresh Teams ammo limiting is active.
See k_freshteams_pack_cells for the full family description and prerequisites.

This card: nails cap. Default: 30.
Nails are consumed by both the Nailgun and Super Nailgun.

Permission:    server config only
Default:       30

See also: k_freshteams_pack_cells (canonical card for this family), k_freshteams_pack_shells (sibling), k_freshteams_pack_rockets (sibling), k_freshteams_limit_packs (gate cvar)
```

### Notes

- Reference card for the k_freshteams_pack_* family; full behavior documented on k_freshteams_pack_cells.
- Default 30 verified at world.c:899: `RegisterCvarEx("k_freshteams_pack_nails", "30")`.

---

## k_freshteams_pack_rockets (KTX cvar, Mode-scoped knobs -- Shape 3 + reference-card)

- **Status**: drafted_with_flag
- **Source**: src/world.c:900
- **Catalog line**: 11765
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1): maximum number of rockets a dropped backpack may contain when backpack ammo limiting is active. Excess rockets (above this ceiling) are not transferred to the pack on death. Rocket ammo is shared between the rocket launcher and grenade launcher.
>
> Range: 0 or more (integer, uncapped).
>
> Default: 5.
> Set by: server config. Has no effect unless both k_freshteams and k_freshteams_limit_packs are set.

### Shape classification

Shape 3 (cvar with no paired command) + reference-card in the k_freshteams_pack_* canonical family. See k_freshteams_pack_cells for the canonical card with full description.

### Proposed draft

```
Cap on rockets packed into a dropped backpack when Fresh Teams ammo limiting is active.
See k_freshteams_pack_cells for the full family description and prerequisites.

This card: rockets cap. Default: 5.
Rocket ammo is shared between the rocket launcher and grenade launcher.

Permission:    server config only
Default:       5

See also: k_freshteams_pack_cells (canonical card for this family), k_freshteams_pack_shells (sibling), k_freshteams_pack_nails (sibling), k_freshteams_limit_packs (gate cvar)
```

### Notes

- FLAG: Existing description says "Rocket ammo is shared between the rocket launcher and grenade launcher." Source does not verify this at the cvar level; it is a QW engine fact (rocket and grenade ammo share the ammo_rockets field). The claim is factually correct in QW but it is not sourced from this cvar's behavior -- it is general QW knowledge. Retaining in the reference card as a useful per-sibling delta since it distinguishes rockets from the other ammo types.
- Reference card for the k_freshteams_pack_* family; full behavior documented on k_freshteams_pack_cells.
- Default 5 verified at world.c:900: `RegisterCvarEx("k_freshteams_pack_rockets", "5")`.

---

## k_freshteams_pack_shells (KTX cvar, Mode-scoped knobs -- Shape 3 + reference-card)

- **Status**: drafted
- **Source**: src/world.c:898
- **Catalog line**: 11795
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only: maximum shells a dropped backpack may contain when ammo limiting is active. Any shells the dead player carried beyond this ceiling are not transferred to the pack. Has no effect unless k_freshteams and k_freshteams_limit_packs are both enabled.
>
> Units: shells (ammo count).
>
> Default: 20.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command) + reference-card in the k_freshteams_pack_* canonical family. See k_freshteams_pack_cells for the canonical card with full description.

### Proposed draft

```
Cap on shells packed into a dropped backpack when Fresh Teams ammo limiting is active.
See k_freshteams_pack_cells for the full family description and prerequisites.

This card: shells cap. Default: 20.
Shells are used by the shotgun and super shotgun.

Permission:    server config only
Default:       20

See also: k_freshteams_pack_cells (canonical card for this family), k_freshteams_pack_nails (sibling), k_freshteams_pack_rockets (sibling), k_freshteams_limit_packs (gate cvar)
```

### Notes

- Reference card for the k_freshteams_pack_* family; full behavior documented on k_freshteams_pack_cells.
- Default 20 verified at world.c:898: `RegisterCvarEx("k_freshteams_pack_shells", "20")`.

---

## dmm4_invinc_time (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:947
- **Catalog line**: 11018
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Duration in seconds of spawn invincibility granted to players respawning in DMM4 or bloodfest.
>
> Range: positive values are clamped to 30 seconds. Negative value disables spawn invincibility (also forced off when k_midair is active).
>
> Default: 0 (effective 2 seconds).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). The cvar is set via server.cfg or via the `spawn666time` command (which internally calls trap_cvar_set_float). There is no cvar_toggle_msg site; spawn666time is the in-game setter. The cvar also appears in the `tot` preset bundle (`dmm4_invinc_time -1`, commands.c:4513) and in the common_um_init reset bundle (`dmm4_invinc_time ""`, commands.c:4177).

### Proposed draft

```
Spawn invincibility duration (in seconds) applied to players respawning in DMM4 or bloodfest.

Effect:
  On respawn in a live DMM4 or bloodfest match, the player receives a
  pentagram of protection lasting this many seconds (clamped to 30).
  0 = use the built-in default of 2 seconds.
  Negative value = no spawn invincibility.
  Forced off (treated as negative) when k_midair is active.

Permission:    server config only; set in-game via 'spawn666time' (pre-match)
Default:       0  (resolves to 2s effective default at runtime)

Example:
  # server.cfg
  dmm4_invinc_time 3    # 3 seconds spawn protection in DMM4

  # tot preset forces this off:
  dmm4_invinc_time -1   # no spawn invincibility (tot sets this automatically)

  # reset to runtime default:
  dmm4_invinc_time ""   # empty string reverts to 0 / default behavior

See also: spawn666time (in-game command to read/set this value), k_midair (forces this off when active), k_bloodfest (also applies this protection in bloodfest mode)
```

### Notes

- FLAG: Existing description says "Default: 0 (effective 2 seconds)." Source confirms: DMM4_INVINCIBLE_DEFAULT is 2.0 (g_consts.h:317) and the consumer logic at client.c:2279-2281 and commands.c:8906-8908 both use `dmm4_invinc_time ? bound(0, dmm4_invinc_time, DMM4_INVINCIBLE_MAX) : DMM4_INVINCIBLE_DEFAULT`. So 0 resolves to 2.0 seconds at runtime. This is correctly described.
- FLAG: The spawn666time command clamps SET values to DMM4_INVINCIBLE_DEFAULT (2.0), not DMM4_INVINCIBLE_MAX (30.0): `bound(0, atof(arg_2), DMM4_INVINCIBLE_DEFAULT)` at commands.c:8917. This means spawn666time cannot set values above 2s, even though direct server.cfg assignment allows up to 30s. This distinction is worth noting for the spawn666time card; the cvar card just documents the cvar range.
- The tot preset explicitly sets `dmm4_invinc_time -1` (commands.c:4513), disabling spawn invincibility -- this is the "preset bundle override" cross-reference noted in the dispatcher context.
- RegisterCvar (not RegisterCvarEx) at world.c:947 means the default is "" (empty string), which the consumer treats as 0.

---

## k_dmm4_gren_mode (KTX cvar, Mode-scoped knobs -- Shape 1c)

- **Status**: drafted
- **Source**: src/world.c:1006
- **Catalog line**: 11550
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for "grenade mode" in deathmatch 4 -- a sub-mode emphasising precision grenade-launcher play.
>
> 0 = standard dmm4 (RL spawn weapon, grenades explode normally with radius damage when the fuse expires).
> 1 = grenade mode (GL spawn weapon, only direct grenade hits deal damage -- grenades that miss silently disappear instead of exploding).
>
> Default: 0. Mutually exclusive with k_midair and k_instagib (enabling either force-clears this).
> Set by: server config or 'gren_mode' admin command in-game.

### Shape classification

Shape 1c (cvar + paired toggle command with mode-precondition). GrenadeMode handler at commands.c:7942-7964 has `is_rules_change_allowed()` + `if (deathmatch != 4)` mode-precondition check + `cvar_toggle_msg(self, "k_dmm4_gren_mode", ...)`. When enabled, the handler also sets `k_disallow_weapons = DA_WPNS & ~IT_GRENADE_LAUNCHER` (disabling all weapons except GL). This side-effect on k_disallow_weapons is load-bearing for the user's action plan.

Mutual exclusion: enabling k_midair clears k_dmm4_gren_mode (commands.c:7557-7560); enabling k_instagib clears k_dmm4_gren_mode (commands.c:7773-7776). Neither LGC nor TOT clear gren_mode per source inspection.

### Proposed draft

```
Whether grenade mode is active in DMM4 -- a sub-mode where only direct grenade hits score.

0 = standard DMM4 (players spawn with rocket launcher; grenades deal radius damage on fuse expiry).
1 = grenade mode (players spawn with grenade launcher; only direct hits deal damage -- missed grenades disappear instead of exploding; all other weapons are disallowed).

Prerequisites:
  DMM4 must be active (deathmatch 4). Refused outside DMM4 ("gren_mode requires dmm4").
  Mutually exclusive with k_midair and k_instagib -- enabling either automatically clears this to 0.

Permission:    server config or 'gren_mode' in-game (pre-match only)
Match-state:   pre-match only
Default:       0

Example:
  # server.cfg -- DMM4 grenade mode
  deathmatch 4
  k_dmm4_gren_mode 1

  # or toggle in-game (pre-match, while in dmm4):
  gren_mode

See also: gren_mode (paired toggle command), k_midair (mutually exclusive -- clears this), k_instagib (mutually exclusive -- clears this), k_disallow_weapons (set to GL-only automatically when this is 1)
```

### Notes

- Load-bearing side-effect: when gren_mode is toggled ON via the command, the handler immediately sets `k_disallow_weapons = DA_WPNS & ~IT_GRENADE_LAUNCHER` (commands.c:7962), disabling all weapons except the grenade launcher. This is not just a flag -- it actively rewrites k_disallow_weapons. Surfaced in the value-1 description.
- Mutual exclusion verified: midair clears at commands.c:7557-7560; instagib clears at commands.c:7773-7776. LGC and TOT do NOT clear gren_mode (ToggleLGC handler at 7840-7882 and ToggleToT at 7911-7940 confirmed -- neither references k_dmm4_gren_mode). Existing description's claim "Mutually exclusive with k_midair and k_instagib" is accurate; LGC/TOT exclusions are one-directional (gren_mode enabling midair/instagib would need its own clearing logic, which is absent).
- Existing description's "admin command" framing on the Set by line: source CF flags for gren_mode are CF_PLAYER | CF_SPC_ADMIN (commands.c:961) -- any player or admin spectator, NOT admin-only. The cvar's "admin command" description wording was imprecise; the v2 recast corrects to "any player or admin spectator" on the command card (see gren_mode card below).

---

## gren_mode (KTX command, Mode-scoped knobs -- Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:961
- **Catalog line**: 12553
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command: toggle grenade mode for dmm4 (flips the k_dmm4_gren_mode cvar). When enabled, only the grenade launcher is available; all other weapons are disallowed. Broadcasts the new state when changed. Requires dmm4 to be active; refused during a live match or while race mode is running.
>
> See also: k_dmm4_gren_mode (the underlying cvar).
> Set by: admin command 'gren_mode' in-game (dmm4 only, outside a live match).

### Shape classification

Shape 1c command side. Paired toggle for k_dmm4_gren_mode with DMM4 mode-precondition. Handler at commands.c:7942: `is_rules_change_allowed()` (handles race/match gates) + `if (deathmatch != 4)` + `cvar_toggle_msg`.

### Proposed draft

```
Toggles grenade mode (k_dmm4_gren_mode) on or off for the current DMM4 session.

Effect:
  Flips k_dmm4_gren_mode between 0 and 1 and broadcasts the new state.
  When enabled: also sets k_disallow_weapons to allow grenade launcher only.

Prerequisites:
  DMM4 must be active. Refused with "gren_mode requires dmm4" outside DMM4.
  Refused during a live match or while race mode is running.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  # toggle grenade mode on (while in dmm4, pre-match):
  gren_mode

See also: k_dmm4_gren_mode (state cvar this toggles), k_midair (mutually exclusive -- enabling midair clears gren_mode), k_instagib (mutually exclusive -- enabling instagib clears gren_mode)
```

### Notes

- FLAG: Existing description says "Admin command". Source registration at commands.c:961 is `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator, NOT admin-only (CF_BOTH_ADMIN). The "Admin command" framing in the existing description is wrong. Corrected in v2 recast.
- The "while race mode is running" refusal is handled by `is_rules_change_allowed()` at commands.c:7944 (general pre-conditions, covers race + match state). This is the standard gate for most dmm4 modifiers.
- Value enum lives on k_dmm4_gren_mode (cvar side); not duplicated here per Shape 1c discipline.

---

## spawn666time (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1035
- **Catalog line**: 12953
- **Anchor**: v1.36-1633-g67253dc

### Current description

> DMM4 only. Reads or sets the spawn invincibility (pentagram) duration for post-respawn protection. Refused outside DMM4.
>
> No argument: reports the current spawn invincibility time in seconds.
> With a numeric argument: sets the duration (seconds, non-negative), broadcasts the change to all players. Setting 0 disables spawn invincibility.
>
> During a match, only the report mode is available (cannot change the value).
>
> Set by: admin or player command 'spawn666time'.

### Shape classification

shape-less. This is a command-side lever for the Shape 3 cvar `dmm4_invinc_time`. The shape tag (Shape 3) lives on the cvar card; this command card has no own inter-entity relationship to classify. It reads and sets dmm4_invinc_time with a dual mode (read-only during match, read/write pre-match). No cvar_toggle_msg, no cycle pattern, no vote mechanism. Registration is `CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS` with the handler routing on argc and match_in_progress.

### Proposed draft

```
Reports or sets the spawn invincibility duration for DMM4 (reads/writes dmm4_invinc_time).

Effect:
  No argument (or during a live match): reports the current spawn invincibility
  time. The displayed value resolves 0 to the 2-second runtime default.
  With a numeric argument (pre-match only): sets the duration in seconds and
  broadcasts the change. Passing 0 disables spawn invincibility entirely.

Prerequisites:
  DMM4 must be active. Refused with "command allowed in dmm4 only" outside DMM4.
  Set mode (with argument) requires pre-match; during a match the command
  silently falls back to report mode.

Permission:    any player or admin spectator
Match-state:   read: any time; write: pre-match only

Example:
  # report current value (works any time in dmm4):
  spawn666time

  # set 3-second spawn protection (pre-match):
  spawn666time 3

  # disable spawn invincibility:
  spawn666time 0

See also: dmm4_invinc_time (the underlying cvar; can be set directly in server.cfg for values above 2s)
```

### Notes

- FLAG: Existing description says "Setting 0 disables spawn invincibility." This is functionally correct but the mechanism is: `spawn666time 0` writes -1 to the cvar (commands.c:8923: `dmm4_invinc_time ? dmm4_invinc_time : -1`), and the consumer reads negative as "off" (client.c:2189). The user-facing behavior is correct; the implementation detail is not surfaced in L1.
- FLAG: Existing description says "non-negative" with no upper bound for the set command. Source shows the command clamps to DMM4_INVINCIBLE_DEFAULT (2.0 seconds) at commands.c:8917: `bound(0, atof(arg_2), DMM4_INVINCIBLE_DEFAULT)`. This means spawn666time cannot set values above 2s; only direct server.cfg assignment can use values up to 30s (DMM4_INVINCIBLE_MAX). The existing description omits this cap. The v2 recast avoids stating a false max but notes the server.cfg escape in See-also.
- CF flags: CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS (commands.c:1035) -- any player or admin spectator. CF_PARAMS just means the command accepts parameters; not a permission modifier.
- The cvar is also used during bloodfest (client.c:2183 checks `deathmatch == 4 || k_bloodfest`), but the spawn666time command checks only `deathmatch != 4` (commands.c:8895) -- the command is refused in bloodfest even though the cvar affects bloodfest spawns. Not surfaced as a prerequisite on this card since the command is legitimately dmm4-only from the user's perspective; the bloodfest behavior is on the cvar card.

---

## k_freshteams_sweep_gl_ammo (KTX cvar, Mode-scoped knobs -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:906; read site src/items.c:940
- **Catalog line**: 11825
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only: rockets awarded when a player picks up a grenade launcher they already own (a 'sweep'). The GL draws from the rocket ammo pool -- this value is added to the player's rocket count. Only active when both k_freshteams and k_freshteams_limit_sweep_ammo are enabled; when sweep limiting is off, sweeping a GL grants the standard 5 rockets instead.
>
> Range: integer rocket count (any non-negative value).
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 + canonical-card pattern.

`RegisterCvarEx("k_freshteams_sweep_gl_ammo", "1")` in world.c:906; no paired toggle or cycle command. Read site at items.c:940 inside `weapon_touch()`, guarded by `k_freshteams && limit_sweep_ammo`. Six near-identical sibling cvars (one per sweepable weapon) sharing the same behavioral pattern -- canonical-card pattern applies. `k_freshteams_sweep_gl_ammo` is alphabetically first in the family and is designated canonical.

### Proposed draft

```
Controls how many rockets a player receives when sweeping a grenade launcher in FreshTeams mode -- picking up a GL you already own while k_freshteams is active.

Effect:
  When a player picks up a grenade launcher they already own, this value is added to their rocket count instead of the standard +5.
  Only active when both k_freshteams (master FreshTeams toggle) and k_freshteams_limit_sweep_ammo (sweep-ammo gate) are enabled.
  When k_freshteams_limit_sweep_ammo is off, the standard +5 rockets apply regardless of this setting.

Note: the GL draws from the rocket ammo pool, the same pool used by the rocket launcher.

Permission:    server config only
Default:       1.

Example:
  # server.cfg -- tighten sweep ammo rewards
  k_freshteams 1
  k_freshteams_limit_sweep_ammo 1
  k_freshteams_sweep_gl_ammo 2

See also: k_freshteams_limit_sweep_ammo (sweep-ammo gate -- freshguns toggles this), k_freshteams (master FreshTeams toggle), k_freshteams_sweep_rl_ammo (sibling -- RL sweep rockets), k_freshteams_sweep_lg_ammo (sibling -- LG sweep cells), k_freshteams_sweep_ng_ammo (sibling -- NG sweep nails)

---
CANONICAL CARD for the k_freshteams_sweep_*_ammo family (6 cvars: gl, lg, ng, rl, sng, ssg).
See sibling reference cards for per-weapon deltas. The shared behavioral pattern
(gated by k_freshteams && k_freshteams_limit_sweep_ammo, replaces standard pickup ammo)
is documented here once rather than duplicated across all six cards.
```

### Notes

- Canonical card for the 6-member sweep-ammo family. The other 5 are short reference cards pointing here.
- GL shares the rocket ammo pool with the RL -- this is documented in the Note paragraph (user-surprise bearing since the weapon name "grenade launcher" doesn't imply rockets).
- The existing description was accurate; v2 recast adds Effect slot, v2 section structure, and canonical-card marker.

---

## k_freshteams_sweep_lg_ammo (KTX cvar, Mode-scoped knobs -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:908; read site src/items.c:959
- **Catalog line**: 11855
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1): number of cells awarded when a player picks up a lightning gun they already own ('sweeping'). The lightning gun uses cell ammo. When sweep limiting is off, the standard game awards 15 cells for sweeping an LG.
>
> Range: 0 or more (integer, uncapped).
>
> Default: 3.
> Set by: server config. Has no effect unless both k_freshteams and k_freshteams_limit_sweep_ammo are set.

### Shape classification

Shape 3 + canonical-card pattern (reference card).

Same registration and behavioral pattern as the canonical `k_freshteams_sweep_gl_ammo`. This is a reference card pointing at the canonical for shared behavioral documentation. Per-sibling delta: weapon = lightning gun, ammo type = cells, standard sweep amount = +15, default = 3.

### Proposed draft

```
Cells received when sweeping a lightning gun in FreshTeams mode. Reference card -- see k_freshteams_sweep_gl_ammo for the full sweep-ammo family behavior.

Weapon: lightning gun. Ammo type: cells. Standard sweep (when k_freshteams_limit_sweep_ammo is off): +15 cells.

Permission:    server config only
Default:       3.

See also: k_freshteams_sweep_gl_ammo (canonical card for this family), k_freshteams_limit_sweep_ammo (sweep-ammo gate), k_freshteams (master FreshTeams toggle)
```

### Notes

- Reference card. Full behavioral pattern documented at canonical `k_freshteams_sweep_gl_ammo`.
- Default 3 (vs canonical's default 1) is the load-bearing per-sibling delta.
- Standard sweep amount +15 cells verified at items.c:963.

---

## k_freshteams_sweep_ng_ammo (KTX cvar, Mode-scoped knobs -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:903; read site src/items.c:856
- **Catalog line**: 11885
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fresh Teams (dmm1) only. Number of nails awarded when a player picks up a nailgun they already own ("sweeping"). Only applied when both k_freshteams and k_freshteams_limit_sweep_ammo are enabled. When sweep limiting is off, the default 30 nails are awarded instead.
>
> Units: nails (ammo count).
>
> Default: 6.
> Set by: server config only. Has no effect unless k_freshteams and k_freshteams_limit_sweep_ammo are both set.

### Shape classification

Shape 3 + canonical-card pattern (reference card).

Same registration and behavioral pattern as the canonical `k_freshteams_sweep_gl_ammo`. Per-sibling delta: weapon = nailgun, ammo type = nails, standard sweep amount = +30 nails, default = 6.

### Proposed draft

```
Nails received when sweeping a nailgun in FreshTeams mode. Reference card -- see k_freshteams_sweep_gl_ammo for the full sweep-ammo family behavior.

Weapon: nailgun. Ammo type: nails. Standard sweep (when k_freshteams_limit_sweep_ammo is off): +30 nails.

Permission:    server config only
Default:       6.

See also: k_freshteams_sweep_gl_ammo (canonical card for this family), k_freshteams_limit_sweep_ammo (sweep-ammo gate), k_freshteams (master FreshTeams toggle)
```

### Notes

- Reference card. Full behavioral pattern documented at canonical `k_freshteams_sweep_gl_ammo`.
- Default 6 and standard +30 nails verified at items.c:856-861.

---

## k_freshteams_sweep_rl_ammo (KTX cvar, Mode-scoped knobs -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:907; read site src/items.c:913
- **Catalog line**: 11915
- **Anchor**: v1.36-1633-g67253dc

### Current description

> FreshTeams (dmm1) mode only: rockets gained when picking up a rocket launcher you already own (a sweep), replacing the normal +5 pickup. Only takes effect when k_freshteams and k_freshteams_limit_sweep_ammo are both on; otherwise the standard +5 rockets is given.
>
> Range: integer rocket count.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 + canonical-card pattern (reference card).

Same registration and behavioral pattern as the canonical `k_freshteams_sweep_gl_ammo`. Per-sibling delta: weapon = rocket launcher, ammo type = rockets, standard sweep amount = +5 rockets, default = 1.

### Proposed draft

```
Rockets received when sweeping a rocket launcher in FreshTeams mode. Reference card -- see k_freshteams_sweep_gl_ammo for the full sweep-ammo family behavior.

Weapon: rocket launcher. Ammo type: rockets. Standard sweep (when k_freshteams_limit_sweep_ammo is off): +5 rockets.

Permission:    server config only
Default:       1.

See also: k_freshteams_sweep_gl_ammo (canonical card for this family), k_freshteams_limit_sweep_ammo (sweep-ammo gate), k_freshteams (master FreshTeams toggle)
```

### Notes

- Reference card. Full behavioral pattern documented at canonical `k_freshteams_sweep_gl_ammo`.
- Default 1 and standard +5 rockets verified at items.c:913-917.

---

## k_freshteams_sweep_sng_ammo (KTX cvar, Mode-scoped knobs -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:905; read site src/items.c:875
- **Catalog line**: 11945
- **Anchor**: v1.36-1633-g67253dc

### Current description

> FreshTeams (dmm1) mode only: nails gained when picking up a super nailgun you already own (a sweep), replacing the normal +30 pickup. Only takes effect when k_freshteams and k_freshteams_limit_sweep_ammo are both on; otherwise the standard +30 nails is given.
>
> Range: integer nail count.
>
> Default: 6.
> Set by: server config.

### Shape classification

Shape 3 + canonical-card pattern (reference card).

Same registration and behavioral pattern as the canonical `k_freshteams_sweep_gl_ammo`. Per-sibling delta: weapon = super nailgun, ammo type = nails, standard sweep amount = +30 nails, default = 6.

### Proposed draft

```
Nails received when sweeping a super nailgun in FreshTeams mode. Reference card -- see k_freshteams_sweep_gl_ammo for the full sweep-ammo family behavior.

Weapon: super nailgun. Ammo type: nails. Standard sweep (when k_freshteams_limit_sweep_ammo is off): +30 nails.

Permission:    server config only
Default:       6.

See also: k_freshteams_sweep_gl_ammo (canonical card for this family), k_freshteams_limit_sweep_ammo (sweep-ammo gate), k_freshteams (master FreshTeams toggle)
```

### Notes

- Reference card. Full behavioral pattern documented at canonical `k_freshteams_sweep_gl_ammo`.
- Default 6 and standard +30 nails verified at items.c:875-879.

---

## k_freshteams_sweep_ssg_ammo (KTX cvar, Mode-scoped knobs -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:904; read site src/items.c:894
- **Catalog line**: 11975
- **Anchor**: v1.36-1633-g67253dc

### Current description

> FreshTeams (dmm1) mode only: shells gained when picking up a super shotgun you already own (a sweep), replacing the normal +5 pickup. Only takes effect when k_freshteams and k_freshteams_limit_sweep_ammo are both on; otherwise the standard +5 shells is given.
>
> Range: integer shell count.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 + canonical-card pattern (reference card).

Same registration and behavioral pattern as the canonical `k_freshteams_sweep_gl_ammo`. Per-sibling delta: weapon = super shotgun, ammo type = shells, standard sweep amount = +5 shells, default = 1.

### Proposed draft

```
Shells received when sweeping a super shotgun in FreshTeams mode. Reference card -- see k_freshteams_sweep_gl_ammo for the full sweep-ammo family behavior.

Weapon: super shotgun. Ammo type: shells. Standard sweep (when k_freshteams_limit_sweep_ammo is off): +5 shells.

Permission:    server config only
Default:       1.

See also: k_freshteams_sweep_gl_ammo (canonical card for this family), k_freshteams_limit_sweep_ammo (sweep-ammo gate), k_freshteams (master FreshTeams toggle)
```

### Notes

- Reference card. Full behavioral pattern documented at canonical `k_freshteams_sweep_gl_ammo`.
- Default 1 and standard +5 shells verified at items.c:894-898.

---

## ra_pos (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:970; handler src/arena.c:771
- **Catalog line**: 12867
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Rocket Arena only. Privately prints your current position in the challenger queue to your own console.
>
> Messages: "You are next", "There is 1 person ahead of you", "There are N people ahead of you", or "You are out of line" if you are not queued.
>
> Has no effect for the current arena winner/loser or outside Rocket Arena.
>
> Default: n/a (command).
> Set by: any player in-game (Rocket Arena mode only).

### Shape classification

shape-less.

Pure one-shot informational command. No cvar pair, no sibling family with shared behavior, no gating role. Registration: `CF_PLAYER` -- any player. Handler `ra_PrintPos` reads queue state and prints to the invoker; no side effects. Leaf of the RA command family but not a Shape 10 sibling (no help-printer enumerates it). `ra_break` is the peer command for queue management, but the two commands have independent mechanisms (ra_pos queries; ra_break toggles queue membership) -- not a Shape 1 or Shape 6 relationship.

### Proposed draft

```
Prints your current position in the Rocket Arena challenger queue to your own console.

Effect:
  Reports one of four states:
    "You are next"                       -- you are first in line
    "There is 1 person ahead of you"
    "There are N people ahead of you"
    "You are out of line" + ra_break tip -- you are not currently queued

  Silently does nothing if Rocket Arena is not active, or if you are the current arena winner or loser.

Prerequisites: Rocket Arena mode must be active (k_rocketarena 1 on a duel/1on1 server).

Permission:    any player (spectators excluded)

Example:
  ra_pos

See also: ra_break (join/leave the challenger queue), k_rocketarena (enables Rocket Arena mode), arena (toggles Rocket Arena)
```

### Notes

- Permission verified from `CF_PLAYER` registration at commands.c:970 -- any player, not admin-only.
- "Silently does nothing" behavior sourced from `ra_PrintPos` early-return at arena.c:775: `if (!isRA() || isWinner(self) || isLoser(self)) { return; }`.
- The "You are out of line" message includes a `ra_break` tip (`redtext("ra_break")`) -- surfaced in Example-adjacent Note.
- Existing description was accurate; v2 recast adds Effect slot with message enumeration, prerequisite, permission from CF flag, and cleaner structure.

---

## noga (KTX command, Mode-scoped knobs -- Shape 1c command side)

- **Status**: drafted
- **Source**: src/commands.c:922; handler src/ctf.c:788
- **Catalog line**: 12697
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF admin command that toggles whether players spawn with green armor (k_ctf_ga). The new state is announced to all players.
>
> Only works in CTF mode. Blocked during a live match unless the server is in matchless mode.
>
> Set by: admin command in CTF mode.

### Shape classification

Shape 1c command side (Shape 1 + mode-precondition).

Handler at ctf.c:788 calls `cvar_toggle_msg(self, "k_ctf_ga", redtext("green armor"))` -- Shape 1 toggle signal. Mode check at ctf.c:795: `if (!isCTF()) { G_sprint(self, 2, "Can't do this in non CTF mode\n"); return; }` -- Shape 1c mode-precondition. Registration: `CF_BOTH_ADMIN | CF_MATCHLESS` -- admin only, available any time (including mid-match). `k_ctf_ga` is the paired cvar (registered at world.c:961 with no default, i.e. 0; the `ctf` mode preset sets it to 1 via ctf_um_init).

### Proposed draft

```
Toggles whether players spawn with green armor (k_ctf_ga) in CTF mode.

Effect:
  Flips k_ctf_ga between 0 (no green armor on spawn) and 1 (green armor on spawn).
  The new state is announced to all players.

Prerequisites: CTF mode must be active -- "Can't do this in non CTF mode" otherwise.

Permission:    admin only
Match-state:   any time (CF_MATCHLESS -- usable during a live match)

Example:
  noga

See also: k_ctf_ga (the cvar this toggles; default 0, set to 1 by the ctf mode preset)
```

### Notes

- Permission verified from `CF_BOTH_ADMIN` at commands.c:922 -- admin only. Existing description said "CTF admin command" which is correct in substance.
- Match-state: `CF_MATCHLESS` flag means the command is NOT blocked mid-match. Handler has `if (match_in_progress && !k_matchLess) { return; }` -- so it IS blocked mid-match UNLESS `k_matchLess` (matchless mode) is on. The `CF_MATCHLESS` registration flag is what permits it to appear in matchless mode. Standard (non-matchless) servers: blocked mid-match. Matchless servers: available any time. Surfaced as a flag note.
- k_ctf_ga default is 0 (RegisterCvar with no explicit default at world.c:961). The `ctf` preset bundle sets it to 1 -- so a server running `ctf` mode will have green armor on by default; `noga` toggles it off.
- FLAG: The existing description says "Blocked during a live match unless the server is in matchless mode" -- this is correct as a user-observable behavior. The Match-state line above reflects this accurately. No contradiction; v2 recast makes it explicit.
- The `noga` card is the command side only; `k_ctf_ga` cvar should have its own card as the Shape 1c cvar side (not in this chunk).

---

## k_midair (KTX cvar, Mode-scoped knobs -- Shape 1c cvar half)

- **Status**: drafted_with_flag
- **Source**: src/world.c:966
- **Catalog line**: 12191
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables midair mode. When on, only direct rocket hits and telefrags deal damage (forced to instant kill); all other damage is nullified and self-rocket damage is removed. A frag only counts if the target was airborne above the height set by k_midair_minheight. Also forces a 2-second respawn delay.
>
> 0 = off.
> 1 = on (requires dmm4).
>
> Default: 0.
> Set by: server config or 'midair' admin command in-game.

### Shape classification

Shape 1c cvar half. `cvar_toggle_msg(self, "k_midair", redtext("Midair"))` at `commands.c:7562` confirms the paired toggle. The toggle handler (`ToggleMidair`) also has a mode-precondition at `commands.c:7534`: `if (!cvar("k_midair") && deathmatch != 4)` -- enabling is refused unless dmm4 is active, which is the Shape 1c signal. DMM4 mutual-exclusion: enabling midair forces `k_instagib`, `k_lgcmode`, `k_tot_mode`, and `k_dmm4_gren_mode` to 0.

### Proposed draft

```
Whether midair mode is active on this server (requires dmm4).

Effect:
  0 = off -- standard damage rules apply.
  1 = on -- only direct rocket hits and telefrags score frags; splash and all
      other damage types are nullified; self-rocket damage is removed; targets
      must be airborne above the k_midair_minheight floor to take rocket
      damage; respawn delay is reduced to 2 seconds.

Prerequisites: dmm4 must be the active deathmatch mode. Setting k_midair 1
in server.cfg while dmm4 is not active has no effect -- world.c resets it to 0
on map start if deathmatch != 4.

Permission:    server config or 'midair' in-game (pre-match only).
Match-state:   pre-match only.
Default:       0.

Example:
  # server.cfg -- enable midair in a dmm4 server
  deathmatch 4
  k_midair 1
  k_midair_minheight 1      // 128-unit (bronze) floor

  # in-game toggle (pre-match):
  midair

See also: midair (paired toggle command), k_midair_minheight (airborne height
floor), k_instagib (mutually exclusive -- enabling midair clears instagib),
k_lgcmode (mutually exclusive), k_tot_mode (mutually exclusive)
```

### Notes

- FLAG: The existing description says "requires dmm4" parenthetically on the value line but does not surface the world.c auto-reset behavior: at `world.c:1760-1762`, `if (cvar("k_midair") && deathmatch != 4)` fires a `cvar_fset("k_midair", 0)` -- so setting k_midair 1 without dmm4 is silently overwritten at map start, not just refused at toggle time. The draft surfaces this as a Prerequisites note; the existing description omits it.
- FLAG: The existing description says "Set by: server config or 'midair' admin command in-game" -- but `commands.c:948` registers `midair` as `CF_PLAYER | CF_SPC_ADMIN`, which is "any player or admin spectator", not admin-only. The draft corrects Permission accordingly.
- `k_dmm4_gren_mode` is part of the DMM4 exclusion network but is omitted from See-also (already 5 entries); operator may want to add it or track via L3 concept note.

---

## k_midair_minheight (KTX cvar, Mode-scoped knobs -- Shape 2)

- **Status**: drafted
- **Source**: src/world.c:967
- **Catalog line**: 12222
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum airborne height a target must exceed for rocket damage to apply in midair mode. Rockets hitting a target below the floor deal no damage. Has no effect unless k_midair is on. Cycle with the 'midair_minheight' admin command.
>
> 0 = 64 units (ground tier).
> 1 = 128 units (bronze tier).
> 2 = 256 units (silver tier).
> 3 = 512 units (gold tier).
> 4 = 1024 units (platinum tier).
>
> Default: 1 (128-unit floor).
> Set by: server config or 'midair_minheight' admin command in-game.

### Shape classification

Shape 2 (cvar + paired cycle command). `SetMidairMinHeight` at `commands.c:7565-7609` reads `k_midair_minheight`, increments + wraps at 5, writes back via `cvar_fset("k_midair_minheight", ...)` -- the canonical cycle pattern. The handler also has a mode-precondition gate: `if (!cvar("k_midair"))` at `commands.c:7575` (refuses if midair off) plus `is_rules_change_allowed()`. The cycle command has a precondition but the cvar itself does not require midair to be set -- it just has no behavioral effect when midair is off. The `cvar_fset` cycle pattern (not `cvar_toggle_msg`) classifies this as Shape 2, not Shape 1c.

### Proposed draft

```
Airborne height floor for midair mode -- rockets that hit a target below this
height deal no damage.

Effect:
  0 = 64 units (ground tier)
  1 = 128 units (bronze tier)
  2 = 256 units (silver tier)
  3 = 512 units (gold tier)
  4 = 1024 units (platinum tier)

Prerequisites: k_midair must be on for this cvar to have any effect. The
'midair_minheight' cycle command also refuses if k_midair is off.

Permission:    server config or 'midair_minheight' in-game (pre-match only).
Match-state:   pre-match only (cycle command refuses mid-match).
Default:       1 (128-unit bronze floor).

Example:
  # server.cfg
  deathmatch 4
  k_midair 1
  k_midair_minheight 2      // silver: target must be 256+ units airborne

  # in-game cycle (pre-match, midair must be on):
  midair_minheight          // advances 1 -> 2 -> 3 -> 4 -> 0 -> 1 ...

See also: midair_minheight (paired cycle command), k_midair (midair mode
toggle -- must be on for this to have effect)
```

### Notes

- The tier label "ground tier" for index 0 uses 64 units -- verified at `combat.c:682` (`midair_minheight = 64` in the else branch). The existing description correctly states 64 units.
- The existing description says "Cycle with the 'midair_minheight' admin command" -- but `commands.c:949` registers `midair_minheight` as `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator, not admin-only). The v2 draft corrects Permission to match source.

---

## midair_minheight (KTX command, Mode-scoped knobs -- Shape 2 command side)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:949
- **Catalog line**: 12670
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the rocket-damage floor tier for midair mode one step per invocation, advancing k_midair_minheight in the sequence 0 -> 1 -> 2 -> 3 -> 4 -> 0. Broadcasts the new tier by name: 0 = ground (64 units), 1 = bronze (128), 2 = silver (256), 3 = gold (512), 4 = platinum (1024). Rockets that hit a target below the selected floor deal no damage. The tier labels share names with midair medal ranks but the medal earned is computed separately from the actual height of each frag. Refuses if midair mode is off or a rules change is not currently allowed.
>
> Set by: admin command 'midair_minheight' in-game (rules-change window required).

### Shape classification

Shape 2 command side. Handler `SetMidairMinHeight` reads, increments, wraps, and writes back via `cvar_fset("k_midair_minheight", ...)` -- the canonical Shape 2 cycle pattern. Has a mode-gate (`if (!cvar("k_midair"))`) that the catalog associates with Shape 1c, but this gate is on the command side only (not a base-mode gate like duel-before-arena); it's a prerequisite for the cycle to make sense. Shape 2 is the primary classification; the prerequisite is captured in the Prerequisites section.

### Proposed draft

```
Cycles the airborne height floor for midair mode one step per invocation
(k_midair_minheight: 0 -> 1 -> 2 -> 3 -> 4 -> 0).

Effect: advances k_midair_minheight to the next tier and broadcasts the new
tier name to all players.

Prerequisites: k_midair must be on ("Midair must be turned on to set minimal
frag height"). Rules change must be currently allowed.

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  midair_minheight     // 1 -> 2 (bronze -> silver), broadcasts "silver"
  midair_minheight     // 2 -> 3 (silver -> gold)

See also: k_midair_minheight (cvar storing current floor tier; can be set
directly in server.cfg to skip cycling), k_midair (midair mode -- must be
on before this command has effect)
```

### Notes

- FLAG: The existing description says "Set by: admin command 'midair_minheight' in-game" -- but `commands.c:949` shows `CF_PLAYER | CF_SPC_ADMIN`, which is "any player or admin spectator", not admin-only. The draft corrects this.
- The existing description includes useful informational context ("tier labels share names with midair medal ranks but medal earned is computed separately") -- this is L3 content (community nuance), omitted from v2 per the MVI discipline. The apply-pass author should confirm the omission is acceptable.

---

## k_instagib (KTX cvar, Mode-scoped knobs -- Shape 2 + Shape 1c-like)

- **Status**: drafted_with_flag
- **Source**: src/world.c:975
- **Catalog line**: 12096
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Instagib mode selector. When non-zero, players fight with the instagib coilgun. Requires dmm4 or midair mode. Higher values use a faster-firing coilgun.
>
> 0 = off.
> 1 = slow coilgun.
> 2 = fast coilgun.
> 3 = extreme coilgun.
>
> Default: 0.
> Set by: server config or 'instagib' admin command in-game.

### Shape classification

Shape 2 (cvar + paired cycle command). `ToggleInstagib` at `commands.c:7723-7838` reads `k_instagib`, increments + wraps at 4 (`if (++k_instagib > 3) k_instagib = 0`), writes back via `cvar_fset("k_instagib", k_instagib)` -- canonical Shape 2 cycle. The handler also has a mode-precondition (`if (!cvar("k_midair") && deathmatch != 4)`), but because `k_instagib` is a multi-value (0-3) cvar cycled by its paired command, Shape 2 is the primary shape. The mode-precondition is a prerequisite on the command side. DMM4 mutual-exclusion: enabling instagib forces midair, lgcmode, tot_mode, and dmm4_gren_mode off.

### Proposed draft

```
Instagib mode selector -- controls whether and how fast the coilgun fires.

Effect:
  0 = off -- standard damage rules apply.
  1 = slow coilgun -- all players fight with a slow-firing instant-kill coilgun.
  2 = fast coilgun -- faster fire rate.
  3 = extreme coilgun -- fastest fire rate.

  Enabling instagib (any non-zero value) also forces k_midair, k_lgcmode,
  k_tot_mode, and k_dmm4_gren_mode to 0. Sets k_cg_kb to 1 on enable.

Prerequisites: dmm4 must be the active deathmatch mode, OR k_midair must be
on. Setting k_instagib without dmm4 is silently reset at map start
(world.c resets it if deathmatch != 4).

Permission:    server config or 'instagib' in-game (pre-match only).
Match-state:   pre-match only.
Default:       0.

Example:
  # server.cfg -- slow instagib on a dmm4 server
  deathmatch 4
  k_instagib 1

  # in-game cycle (pre-match):
  instagib     // 0 -> 1 (off -> slow)
  instagib     // 1 -> 2 (slow -> fast)

See also: instagib (paired cycle command), k_instagib_custom_models (coilgun
asset swap), k_midair (mutually exclusive -- enabling instagib clears midair),
k_cg_kb (coilgun kickback toggle, auto-set on enable)
```

### Notes

- FLAG: The existing description says "Requires dmm4 or midair mode" -- source confirms this: `commands.c:7735` checks `if (!cvar("k_midair") && deathmatch != 4)`, meaning midair active is an accepted alternative to dmm4. The existing description is correct on this point. However, it does not surface the world.c silent reset (`world.c:1765-1767`): `if (cvar("k_instagib") && deathmatch != 4)` resets to 0 at map start. The draft surfaces this.
- FLAG: The existing description says "Set by: server config or 'instagib' admin command in-game" but `commands.c:955` shows `CF_PLAYER | CF_SPC_ADMIN` -- "any player or admin spectator", not admin-only. Draft corrects Permission.
- On enable, `ToggleInstagib` also sets `k_cg_kb` to 1 (`commands.c:7834`) -- this is the kickback default for instagib sessions. Surfaced in Effect as an auto-set note.

---

## instagib (KTX command, Mode-scoped knobs -- Shape 2 command side)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:955
- **Catalog line**: 12581
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the server's Instagib mode: 0 (off) -> 1 (slow) -> 2 (fast) -> 3 (extreme) -> 0. Requires dmm4 or k_midair ("Instagib requires dmm4" otherwise). On each enable, execs the instagib config chain and disables midair, LGC, ToT, and dmm4 grenade mode.
>
> 0 = disabled.
> 1 = slow instagib.
> 2 = fast instagib.
> 3 = extreme instagib.
>
> Set by: player or spectator-admin command 'instagib' in-game (rules-change-allowed required).

### Shape classification

Shape 2 command side. Handler `ToggleInstagib` cycles `k_instagib` (0->1->2->3->0) via `cvar_fset`. Paired cvar is `k_instagib`. The value enum lives on the cvar card (Shape 2 discipline: enum on cvar side, not command side).

### Proposed draft

```
Cycles instagib mode one step per invocation (k_instagib: 0 -> 1 -> 2 ->
3 -> 0) and applies the instagib config chain on each enable step.

Effect:
  - Advances k_instagib to the next value and broadcasts the new mode.
  - On any enable step (0 -> 1): execs configs/usermodes/instagib/default.cfg
    and configs/usermodes/instagib/<mapname>.cfg if they exist; sets k_cg_kb 1.
  - On enable: forces k_midair, k_lgcmode, k_tot_mode, and k_dmm4_gren_mode
    to 0.
  - On disable (wraps to 0): broadcasts "Instagib disabled".

Prerequisites: dmm4 must be active OR k_midair must be on ("Instagib requires
dmm4"). Rules change must be currently allowed.

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  instagib     // 0 -> 1 (enable slow)
  instagib     // 1 -> 2 (slow -> fast)
  instagib     // 2 -> 3 (fast -> extreme)
  instagib     // 3 -> 0 (disable)

See also: k_instagib (cvar storing current mode value; can be set directly in
server.cfg), instagib_coilgun_kickback (toggles coilgun recoil while instagib
active), k_instagib_custom_models (coilgun asset swap)
```

### Notes

- FLAG: The existing description includes a value enum ("0 = disabled. 1 = slow instagib...") on the command card. Per Shape 2 discipline, the enum lives on the cvar card (`k_instagib`), not the command card. Removed from draft.
- FLAG: The existing description says "player or spectator-admin command" -- source confirms `CF_PLAYER | CF_SPC_ADMIN`. This is already accurate ("any player or admin spectator"). The description phrasing "player or spectator-admin" is an acceptable paraphrase but v2 normalizes to the standard Permission wording.
- The config chain execution (`exec configs/usermodes/instagib/default.cfg` + map-specific) is surfaced in Effect because it may affect other cvars beyond k_instagib -- the operator should be aware it fires.

---

## instagib_coilgun_kickback (KTX command, Mode-scoped knobs -- Shape 1c command side)

- **Status**: drafted
- **Source**: src/commands.c:959
- **Catalog line**: 12613
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles self-knockback (recoil) on the Instagib coilgun (flips k_cg_kb). When on, each shot pushes the shooter backward, enabling coilgun-jumping. When off, the coilgun imparts no recoil. Broadcasts the change to all players.
>
> Requires Instagib to be active (k_instagib non-zero); refused with "cg_kb requires Instagib" otherwise. Ignored while a match is in progress.
>
> Default: n/a (command, not a cvar).
> Set by: any player or admin spectator (non-admin spectators are refused with "You are not an admin").

### Shape classification

Shape 1 command side (paired toggle for `k_cg_kb`). Handler `ToggleCGKickback` at `commands.c:7884-7899` calls `cvar_toggle_msg(self, "k_cg_kb", redtext("Coilgun kickback"))` -- canonical Shape 1 toggle signal. Has a gate: `if (!cvar("k_instagib"))` refuses with "cg_kb requires Instagib". This is a Shape 4 gating-cvar facet: `k_instagib` gates `instagib_coilgun_kickback`. The match-state check is `if (match_in_progress)` (not `is_rules_change_allowed()`), so it refuses mid-match (different from the is_rules_change_allowed pattern used by most other toggle commands).

Shape composition: Shape 1 (toggle for k_cg_kb) + Shape 4 gate (k_instagib must be non-zero). CF flags: `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator.

### Proposed draft

```
Toggles coilgun recoil (kickback) for instagib mode (flips k_cg_kb).

Effect: when enabled, each coilgun shot pushes the shooter backward -- enables
coilgun-jumping. When disabled, the coilgun imparts no recoil. Broadcasts the
change to all players.

Prerequisites: k_instagib must be non-zero ("cg_kb requires Instagib").

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  instagib                   // enable instagib (sets k_cg_kb 1 automatically)
  instagib_coilgun_kickback  // toggle kickback off if desired

See also: k_cg_kb (cvar storing current kickback state), k_instagib (instagib
mode -- must be active for this command to fire)
```

### Notes

- The existing description notes "non-admin spectators are refused with 'You are not an admin'" -- this is the standard CF_SPC_ADMIN runtime behavior (spectators without admin are refused). Not a special case for this command; omitted from v2 as it follows from the standard CF flag behavior.
- k_cg_kb default is 1 (`world.c:977` `RegisterCvarEx("k_cg_kb", "1")`), and `ToggleInstagib` also sets it to 1 on each enable step. The command card does not need to surface this -- the k_cg_kb cvar card carries the default.

---

## k_instagib_custom_models (KTX cvar, Mode-scoped knobs -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:976
- **Catalog line**: 12129
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables custom coilgun assets for instagib mode. When enabled, KTX uses a custom view model, vwep model, and sound instead of the default weapon models, and instagib mode messages report 'coilgun mode'. Assets are precached at map load even if instagib is not yet activated.
>
> 0 = use default weapon models.
> 1 = use custom coilgun assets.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired toggle command). No `cvar_toggle_msg` or cycle handler targets `k_instagib_custom_models`. Has a Shape 4 facet as a gate-like condition: `weapons.c:815` and `weapons.c:1823` read `k_instagib_custom_models` AND `k_instagib` together before switching to custom model paths -- but this is not a gate on a command; it's a conditional branch in the damage/ammo dispatch. Primarily Shape 3; the gating-facet is not a command gate but an asset-dispatch condition.

The precache behavior at `world.c:325` (`precache if custom models activated in config, even if instagib not yet activated`) is a user-surprise behavior worth surfacing: setting `k_instagib_custom_models 1` in server.cfg takes effect at next map load regardless of whether instagib is on.

### Proposed draft

```
Whether KTX uses custom coilgun assets when instagib mode is active.

Effect:
  0 = default weapon models (RL view model, standard sounds).
  1 = custom coilgun assets (v_coil.mdl view model, w_coil.mdl vwep,
      coilgun.wav sound). Instagib mode messages report 'coilgun mode'
      instead of plain 'Instagib mode'.

  Assets are precached at map load whenever this cvar is 1, regardless of
  whether instagib is currently active -- a map change is required for
  the setting to take effect.

Permission:    server config only.
Default:       0.

Example:
  # server.cfg
  k_instagib_custom_models 1
  k_instagib 1

See also: k_instagib (instagib mode -- custom assets only render when
instagib is active)
```

### Notes

- The existing description is accurate and well-formed. The v2 recast is mostly structural (v2 shape sections). The asset precache behavior was already described correctly; the draft makes it a distinct bullet to aid scanning.
- No command paired with this cvar; Shape 3 is the correct classification.

---

## k_lgcmode (KTX cvar, Mode-scoped knobs -- Shape 1c cvar half)

- **Status**: drafted
- **Source**: src/world.c:1083 (RegisterCvar); src/commands.c:7840 (ToggleLGC handler); src/commands.c:9432 (lgc_enabled); src/commands.c:5211 (handicap gate); src/commands.c:8110 (dmgfrags gate)
- **Catalog line**: 12160
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for LGC (Lightning Gun Challenge) mode. Requires deathmatch mode 4. Enabling it disables incompatible modes (midair, instagib, dmgfrags) and resets handicap to neutral. While active, the handicap and dmgfrags commands are blocked, overtime is disabled, and post-match stats track lightning-gun hits bucketed by distance.
>
> 0 = LGC mode off.
> 1 = LGC mode on.
>
> Default: 0.
> Set by: server config or 'lgcmode' admin command in-game.

### Shape classification

Shape 1c cvar half (Shape 1 + mode-precondition). `ToggleLGC` has `is_rules_change_allowed()` + `if (!k_lgc && (deathmatch != 4))` guard before `cvar_toggle_msg(self, LGCMODE_VARIABLE, ...)`. Paired toggle is `lgcmode` (commands.c:957, CF_PLAYER | CF_SPC_ADMIN). No preset command exists for LGC -- this is a two-entity pair (Shape 1c), not a three-entity triad (Shape 1d). Mode-check only fires when trying to ENABLE (k_lgc is false); disabling is unrestricted.

### Proposed draft

```
Whether LGC (Lightning Gun Challenge) mode is active on this dmm4 server.

Effect:
  0 = standard dmm4 rules.
  1 = LGC mode on: post-match stats track lightning-gun hits bucketed by
      distance; handicap and damage-frags scoring are blocked; overtime is
      disabled.

Prerequisites: dmm4 must be active to enable ("LGC mode requires dmm4").
  Enabling LGC mode forcibly clears k_midair, k_instagib, and k_dmgfrags,
  and resets any active handicap to neutral (100). Disabling has no
  prerequisites.

Permission:    server config, or in-game via the `lgcmode` command.
Match-state:   pre-match only (is_rules_change_allowed gate).
Default:       0.

Example:
  # server.cfg
  deathmatch 4
  k_lgcmode 1

  # or toggle in-game (pre-match)
  lgcmode

See also: lgcmode (paired toggle), k_midair (mutually exclusive, cleared on LGC enable), k_instagib (mutually exclusive, cleared on LGC enable), k_dmgfrags (blocked while LGC active, cleared on LGC enable)
```

### Notes

- Existing description is accurate. Recast adds the one-way mutual-exclusion asymmetry (enable clears siblings, disable is silent) and the overtime-disabled effect into clearly labeled Effect bullets.
- Permission line corrected: `lgcmode` is registered CF_PLAYER | CF_SPC_ADMIN (any player or admin spectator), so "admin command" framing is dropped. The cvar side correctly uses "server config or in-game via `lgcmode` command".
- See-also exceeds 4 entries. This is intentional: the dmm4 mutual-exclusion network is the load-bearing context. k_tot_mode was omitted from See-also because it clears LGC (via midair toggle's handler clearing LGC as a side-effect), but the direct relationship is k_midair/k_instagib; k_tot_mode and k_dmm4_gren_mode belong in an L3 concept note covering the dmm4 modifier network. Keeping See-also at 4 as the most load-bearing peers.

---

## k_tot_mode (KTX cvar, Mode-scoped knobs -- Shape 1d cvar side)

- **Status**: drafted
- **Source**: src/world.c:1084 (RegisterCvar); src/commands.c:7911 (ToggleToT handler); src/commands.c:4529 (tot_um_init bundle); src/commands.c:9558 (tot_mode_enabled); src/combat.c:545 (quad-damage consumer); src/items.c:2446 (health-cap consumer)
- **Catalog line**: 12350
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for Tribe of Tjernobyl (ToT) mode. Requires deathmatch mode 4. When enabled, alters dmm4 rules: replaces the standard octa (8x) quad-damage multiplier with a configurable bot quad multiplier, and switches item, health-cap, and bot-weapon rules to ToT variants. Mutually exclusive with midair and instagib (enabling ToT disables them).
>
> 0 = ToT mode off.
> 1 = ToT mode on.
>
> Default: 0.
> Set by: server config or 'totmode' admin command in-game.

### Shape classification

Shape 1d cvar side (preset + cvar + toggle triad). Three entities: `tot` preset (DEF(UserMode), commands.c:825) sets `k_tot_mode 1` in the `tot_um_init[]` bundle (commands.c:4529); `totmode` toggle command (ToggleToT, commands.c:958) calls `cvar_toggle_msg(self, TOT_MODE_VARIABLE, ...)` with dmm4 mode-precondition; `k_tot_mode` is the state cvar. All three cross-link per Shape 1d discipline.

### Proposed draft

```
Whether Tribe of Tjernobyl (ToT) mode is currently active.

Effect:
  0 = standard dmm4 rules.
  1 = ToT mode on: replaces the standard 8x quad-damage multiplier with the
      configurable bot quad multiplier (k_fb_quad_multiplier); applies ToT
      item, health-cap, and bot-weapon rules.

Prerequisites: dmm4 must be active for runtime effect -- setting this cvar to
  1 without dmm4 active has no behavioral effect on combat rules. Enabling
  via `totmode` requires dmm4 and clears k_midair and k_instagib.

Permission:    server config, or in-game via the `tot` preset or `totmode` toggle.
Match-state:   pre-match only (via `totmode` or `tot`; direct server-config
               set applies at startup).
Default:       0.

Example:
  # server.cfg -- set ToT mode directly
  deathmatch 4
  k_tot_mode 1

  # or apply the full ToT preset in-game (pre-match)
  tot

  # or toggle only this cvar (pre-match, requires dmm4)
  totmode

See also: tot (preset that bundles k_tot_mode 1 with full ToT ruleset), totmode (toggle that flips only this cvar), k_midair (mutually exclusive, cleared by totmode enable), k_instagib (mutually exclusive, cleared by totmode enable)
```

### Notes

- Existing description correctly captures behavior. Recast clarifies the three-entity relationship per Shape 1d discipline: `tot` is the preset bundler, `totmode` is the narrower toggle, `k_tot_mode` is the state.
- The "setting this without dmm4 has no behavioral effect" prerequisite is verified: `tot_mode_enabled()` reads `cvar(TOT_MODE_VARIABLE)` directly (no dmm4 gate), but the behavioral consumers (combat.c:545 quad damage, items.c:2446 health-cap) are wrapped in `deathmatch == 4` guards or `tot_mode_enabled()` checks inside dmm4 paths. Setting k_tot_mode 1 on a non-dmm4 server is syntactically accepted but behaviorally inert.
- F3 cross-card finding from Mode selection batch: See-also on this card references both `tot` and `totmode` as required for symmetric threading. Verified.

---

## k_rocketarena (KTX cvar, Mode-scoped knobs -- Shape 1c cvar half)

- **Status**: drafted
- **Source**: src/world.c:979 (RegisterCvar); src/commands.c:8842 (ToggleArena handler); src/arena.c:132 (isRA predicate); src/commands.c:8860 (cvar_toggle_msg site)
- **Catalog line**: 12289
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables Rocket Arena mode within a duel server. Instead of a single ongoing 1v1, a winner-stays queue is used: the round winner stays in the arena and the next challenger from the spectator queue comes in to fight. Has no effect outside duel mode.
>
> 0 = standard duel.
> 1 = Rocket Arena (winner-stays queue).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 1c cvar half. `ToggleArena` has `is_rules_change_allowed()` + `if (!isRA()) { if (!isDuel()) { ... "Set [on] mode first\n"; return; } }`. The `isRA()` predicate is `isDuel() && cvar("k_rocketarena")` (arena.c:132), confirming the cvar is a mode-modifier on top of duel. Paired toggle is `arena` (commands.c:971, CF_PLAYER | CF_SPC_ADMIN).

### Proposed draft

```
Whether Rocket Arena mode is active within a duel server.

Effect:
  0 = standard 1on1 duel.
  1 = Rocket Arena: winner-stays queue -- the round winner remains in the
      arena; the next challenger from the spectator queue enters to fight.

Prerequisites: 1on1 (duel) mode must be active to enable. Disabling has no
  prerequisites.

Permission:    server config, or in-game via the `arena` command.
Match-state:   pre-match only.
Default:       0.

Example:
  # server.cfg
  k_mode 1          # set 1on1 mode
  k_rocketarena 1   # enable RA within duel

  # or toggle in-game after selecting 1on1 (pre-match)
  arena

See also: arena (paired toggle), 1on1 (prerequisite base mode)
```

### Notes

- Existing description says "Set by: server config" only. Source shows `arena` command (CF_PLAYER | CF_SPC_ADMIN) writes this cvar via `cvar_toggle_msg`. Updated Permission line accordingly -- this is a `drafted_with_flag` finding for the "Set by" claim.
- FLAG: Existing description states "Set by: server config" but source confirms the `arena` command also mutates this cvar at runtime (pre-match). Corrected in proposed draft Permission line.
- When enabling via `arena`, the handler also loads RA configs (`configs/usermodes/1on1/ra/default.cfg` and `configs/usermodes/1on1/ra/<mapname>.cfg` if they exist) and sets `k_spw 1` (safe spawn mode). This is an enable-side side-effect beyond just the cvar flip. Surfaced via the `arena` command card (see below) rather than here, per shape discipline (Effect on cvar card is the value enum; command card carries the enable-side bundle behavior).

- **Status**: drafted_with_flag

---

## arena (KTX command, Mode-scoped knobs -- Shape 1c command side)

- **Status**: drafted
- **Source**: src/commands.c:971 (registration, CF_PLAYER | CF_SPC_ADMIN); src/commands.c:8842 (ToggleArena handler)
- **Catalog line**: 12412
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles Rocket Arena mode on or off and announces the change server-wide. Rocket Arena is a duel modifier: the server must already be in duel mode for this command to work, and rule changes must be permitted at the time it is issued.
>
> When enabling: loads the Rocket Arena default config and the per-map RA config if one exists, and sets safe spawn mode on.
>
> Set by: admin command 'arena' in-game.

### Shape classification

Shape 1c command side. Paired cvar is `k_rocketarena`. Toggle handler checks `is_rules_change_allowed()` then `if (!isRA()) { if (!isDuel()) { ... "Set [on] mode first\n"; return; } }`. Mode-check only applies when trying to ENABLE (isRA is false). Registered CF_PLAYER | CF_SPC_ADMIN.

### Proposed draft

```
Toggles Rocket Arena mode (k_rocketarena) on or off.

Effect:
  When enabling: sets k_rocketarena to 1, broadcasts the change server-wide,
    loads the RA default config (configs/usermodes/1on1/ra/default.cfg) and
    the per-map RA config if one exists, and enables safe spawn mode (k_spw 1).
  When disabling: sets k_rocketarena to 0 and broadcasts the change. No
    config reload.

Prerequisites: 1on1 (duel) mode must already be active to enable
  ("Set [on] mode first"). Disabling works from any state.

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  # In-game, after selecting 1on1 mode (pre-match):
  arena          # enables Rocket Arena; loads RA configs
  arena          # disables Rocket Arena

See also: k_rocketarena (state cvar this toggles), 1on1 (prerequisite base mode)
```

### Notes

- Existing description says "Set by: admin command" -- the CF_PLAYER | CF_SPC_ADMIN flag means this is NOT admin-only; any player or admin spectator can issue it. Permission line corrected to "any player or admin spectator." This is a `drafted_with_flag` finding.
- FLAG: Existing description frames this as an "admin command" but the CF registration (CF_PLAYER | CF_SPC_ADMIN) is any-player-or-admin-spectator, not admin-only. Corrected in proposed draft.

- **Status**: drafted_with_flag

---

## k_yawnmode (KTX cvar, Mode-scoped knobs -- Shape 1 cvar half)

- **Status**: drafted
- **Source**: src/world.c:1011 (RegisterCvar); src/commands.c:8643 (ToggleYawnMode handler); src/commands.c:8638 (FixYawnMode consumer); src/commands.c:8659 (setTeleportCap gate)
- **Catalog line**: 12381
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables yawn mode, an alternative deathmatch ruleset with modified combat values. When on: axe damage is raised (50 instead of 20 in dmm3), shotgun pellet count is higher, armor protection values and projectile velocities are altered, backpack-drop rules change, and the teleport-cap setting becomes available.
>
> 0 = off.
> 1 = on.
>
> Default: 0.
> Set by: server config or 'yawnmode' admin command in-game.

### Shape classification

Shape 1 (plain cvar + paired toggle, no mode-precondition). `ToggleYawnMode` has only `is_rules_change_allowed()` as a gate -- no mode-check (`isDuel()`, `deathmatch != 4`, etc.). Paired toggle is `yawnmode` (commands.c:997, CF_PLAYER | CF_SPC_ADMIN). No preset command exists for yawnmode. Shape 1 base (not 1c, not 1d).

### Proposed draft

```
Whether yawn mode is active -- an alternative ruleset with modified combat values.

Effect:
  0 = standard ruleset.
  1 = yawn mode on:
      - Axe damage: 50 (vs 20 in dmm3).
      - Shotgun: higher pellet count.
      - Armor protection values and projectile velocities altered.
      - Backpack-drop rules changed.
      - Teleport-cap setting (k_teleport_cap) becomes available.

Permission:    server config, or in-game via the `yawnmode` command.
Match-state:   pre-match only.
Default:       0.

Example:
  # server.cfg
  k_yawnmode 1

  # or toggle in-game (pre-match)
  yawnmode

See also: yawnmode (paired toggle), k_teleport_cap (gated by k_yawnmode being on)
```

### Notes

- Shape 1 confirmed (no mode-precondition). The existing description is accurate; this is a mechanical v1-to-v2 recast.
- Permission corrected: `yawnmode` is CF_PLAYER | CF_SPC_ADMIN (any player or admin spectator), not admin-only. "admin command" framing dropped from Permission line.
- `k_teleport_cap` is gated by k_yawnmode (setTeleportCap checks `if (!k_yawnmode)`) -- surfaced in See-also.

---

## no_gl (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:987 (registration, CF_PLAYER | CF_SPC_ADMIN); src/commands.c:5330 (no_gl handler)
- **Catalog line**: 12726
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Shorthand admin command that toggles the grenade launcher between allowed and disallowed for the current match. Equivalent to issuing '/noweapon gl'. Only works in deathmatch mode 4 (dmm4) and cannot be used while a match is in progress. The change is announced to all players.
>
> Set by: admin command 'no_gl' in-game (dmm4 only, not during a live match).

### Shape classification

Shape-less. `no_gl` is a proxy alias: its handler is a single `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd noweapon gl\n")` call that routes through `noweapon` (the parent dispatcher). It does NOT directly XOR a bit on `k_disallow_weapons` -- the XOR logic lives in the `noweapon` handler. This is NOT Shape 11a (no direct per-bit handler calling `cvar_fset` on the bitmask; no `cvar("k_disallow_weapons")` read at the no_gl site). It is also NOT Shape 8 (no_gl is a top-level command, not a subcommand of `noweapon`'s dispatch table). The entity's role is a shorthand alias pointing at `noweapon gl`. Shape-less; `noweapon` is the Shape-8-like dispatcher and `k_disallow_weapons` is its state container.

### Proposed draft

```
Shorthand for `noweapon gl` -- toggles the grenade launcher between allowed
and disallowed.

Effect: routes to `noweapon gl`, which XOR-flips the grenade launcher bit
  (value 16) in k_disallow_weapons and broadcasts the change to all players.

Prerequisites: dmm4 must be active ("command allowed in dmm4 only").
  No effect while a match is in progress.

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  no_gl    # toggles GL: disallowed -> allowed or allowed -> disallowed

See also: k_disallow_weapons (state container), noweapon (parent command), no_lg (sibling shorthand for lightning gun)
```

### Notes

- Existing description says "admin command" -- CF_PLAYER | CF_SPC_ADMIN is any player or admin spectator, not admin-only. FLAG: "admin command" framing corrected to "any player or admin spectator."
- The dmm4 + pre-match prerequisites are enforced inside `noweapon`, not inside `no_gl` itself. The no_gl handler fires the stuffcmd unconditionally; the guards fire when the server processes the forwarded `noweapon gl` call.
- Shape-less is correct: no_gl is a proxy that delegates to noweapon. The Shape 11a pattern requires independent per-bit handlers directly calling `cvar_fset`; no_gl doesn't qualify.

- **Status**: drafted_with_flag

---

## no_lg (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:986 (registration, CF_PLAYER | CF_SPC_ADMIN); src/commands.c:5325 (no_lg handler)
- **Catalog line**: 12780
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Shorthand admin command that toggles the lightning gun between allowed and disallowed for the current match. Equivalent to issuing '/noweapon lg'. Only works in deathmatch mode 4 (dmm4) and cannot be used while a match is in progress. The change is announced to all players.
>
> Set by: admin command 'no_lg' in-game (dmm4 only, not during a live match).

### Shape classification

Shape-less. Identical proxy-alias pattern to `no_gl`: handler is `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd noweapon lg\n")`. Routes to `noweapon lg`. No direct per-bit XOR on k_disallow_weapons at the no_lg site. Shape-less (alias pointing at `noweapon lg`).

### Proposed draft

```
Shorthand for `noweapon lg` -- toggles the lightning gun between allowed
and disallowed.

Effect: routes to `noweapon lg`, which XOR-flips the lightning gun bit
  (value 64) in k_disallow_weapons and broadcasts the change to all players.

Prerequisites: dmm4 must be active ("command allowed in dmm4 only").
  No effect while a match is in progress.

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  no_lg    # toggles LG: disallowed -> allowed or allowed -> disallowed

See also: k_disallow_weapons (state container), noweapon (parent command), no_gl (sibling shorthand for grenade launcher)
```

### Notes

- Existing description says "admin command" -- CF_PLAYER | CF_SPC_ADMIN is any player or admin spectator. FLAG: same correction as no_gl.
- Shape-less for the same reasons as no_gl.

- **Status**: drafted_with_flag

---

## k_disallow_weapons (KTX cvar, Mode-scoped knobs -- shape-less)

- **Status**: drafted
- **Source**: src/world.c:802 (RegisterCvar); src/commands.c:5240 (noweapon handler, primary writer via trap_cvar_set_float); src/client.c:2360 (read site -- strips disallowed weapon bits from player item bitmask on spawn); src/match.c:877, 1759 (read sites -- match start and pre-match announcements)
- **Catalog line**: 11520
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Bitmask specifying which weapons are removed from players in deathmatch 4 (dmm4) during a live match. Set bits identify disallowed weapons; sum values to disable multiple weapons at once.
>
> 1 = shotgun, 2 = super shotgun, 4 = nailgun, 8 = super nailgun, 16 = grenade launcher, 32 = rocket launcher, 64 = lightning gun, 4096 = axe.
>
> Default: 0 (no weapons disabled).
> Set by: server config or 'no_gl' / 'no_lg' admin commands in-game (dmm4 only, not during a live match).

### Shape classification

Shape-less. k_disallow_weapons is a bitmask state container modified by the `noweapon` parent-dispatcher command (which takes weapon-name subcommand args: axe/sg/ssg/ng/sng/gl/rl/lg). `no_gl` and `no_lg` are proxy aliases that route through `noweapon`, not independent per-bit top-level toggle commands. Since there are no independent top-level per-bit toggle commands directly calling `cvar_fset` on this cvar, Shape 11a does not apply. The access path is: `noweapon <weapon>` (parent-dispatcher with weapon-name args). `k_disallow_weapons` is the state container for that dispatcher. Shape-less on the cvar side; the relationship shape belongs to `noweapon` (Shape 8 family).

### Proposed draft

```
Bitmask of weapons removed from all players in dmm4 -- the live engine strips
any disallowed weapon from a player's item set when they spawn.

Effect:
  Each set bit removes one weapon from all players' available inventory:
    1   = shotgun (sg)
    2   = super shotgun (ssg)
    4   = nailgun (ng)
    8   = super nailgun (sng)
    16  = grenade launcher (gl)
    32  = rocket launcher (rl)
    64  = lightning gun (lg)
    4096 = axe

  Sum values to disable multiple weapons (e.g. 80 = 16 + 64 = gl + lg, the
  ToT preset default). Use `noweapon <name>` to toggle individual weapon bits
  in-game.

Prerequisites: dmm4 must be active for the weapon-strip behavior to take
  effect. Setting this cvar outside dmm4 is accepted but ignored at runtime.

Permission:    server config, or in-game via `noweapon <weapon>` (pre-match, dmm4 only).
               `no_gl` and `no_lg` are shorthand aliases for `noweapon gl` / `noweapon lg`.
Match-state:   pre-match only (in-game changes via noweapon/no_gl/no_lg).
Default:       0 (no weapons disabled).

Example:
  # server.cfg -- disable grenade launcher and lightning gun
  deathmatch 4
  k_disallow_weapons 80

  # or toggle individual weapons in-game (pre-match, dmm4)
  noweapon gl      # toggle grenade launcher
  no_lg            # toggle lightning gun (shorthand)

See also: noweapon (parent command for in-game per-weapon toggling), no_gl (GL shorthand), no_lg (LG shorthand)
```

### Notes

- Existing description lists "Set by: server config or 'no_gl' / 'no_lg' admin commands". The `noweapon` parent command is the primary in-game writer; no_gl/no_lg are proxy aliases for noweapon gl/lg. Updated to reflect noweapon as the primary in-game access path.
- FLAG: Existing description omits `noweapon` as the primary in-game write path. `no_gl` and `no_lg` are shorthands for `noweapon gl` / `noweapon lg`, not direct writers. Corrected in proposed draft.
- The bit values are verified against g_consts.h: IT_AXE=4096, IT_SHOTGUN=1, IT_SUPER_SHOTGUN=2, IT_NAILGUN=4, IT_SUPER_NAILGUN=8, IT_GRENADE_LAUNCHER=16, IT_ROCKET_LAUNCHER=32, IT_LIGHTNING=64. Existing description has these correct.
- DA_WPNS mask (g_local.h:136) confirms these are the only 8 bits honored; the cvar value is masked by DA_WPNS when read.
- **Status**: drafted_with_flag

---

## k_hoonymode (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:888
- **Catalog line**: 12035
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables HoonyMode, a round-based format (best-of-N points with nominated spawns, ported from CPMA). The round-by-round structure (point ladder, spawn nominations, per-point flow) is active in duel and team modes. Setting this in FFA or CTF skips the round structure but still suppresses the standard fraglimit and match-end behaviour -- intended use is duel and team mode only.
>
> 0 = HoonyMode off.
> 1 = HoonyMode on.
>
> Default: 0.
> Set by: server config or 'hoonymode' admin command in-game.

### Shape classification

Shape 3 (cvar with no paired toggle command). No `cvar_toggle_msg` or standalone toggle-handler exists for `k_hoonymode`. The `hoonymode` command is a `DEF(UserMode)` preset that sets this cvar as part of a bundle (`_1on1hm_um_init`), not a binary toggle of this cvar alone. Same pattern as `k_tot_mode` seen from the preset-only side (no separate toggle command exists for the HoonyMode cvar itself; the preset IS the activation path). See-also points to `hoonymode` (preset) as the standard activation path.

### Proposed draft

```
Whether HoonyMode is active -- a round-based format with nominated spawns and a point ladder (best-of-N points, ported from CPMA).

Effect:
  1 = HoonyMode on. Each match becomes a series of point-rounds. Spawns are nominated before each point; match ends once the required number of points is played and one side holds a lead.
  0 = HoonyMode off.

  Active round structure fires in duel and team modes only. Setting to 1 in FFA or CTF suppresses the standard fraglimit and match-end logic without engaging the round structure; intended use is duel and team mode.

Permission:    server config, or via the 'hoonymode' preset in-game (which also sets fraglimit, timelimit, and related cvars as a bundle)
Default:       0.

Example:
  # server.cfg (minimal manual setup)
  k_hoonymode 1
  k_hoonyrounds 12
  # or use the preset which bundles all required settings:
  # (in-game) hoonymode

See also: hoonymode (preset that activates this and bundles all required settings), k_hoonyrounds (round count), pickspawn (per-point spawn nomination command), k_hoonymode_prevmap / k_hoonymode_prevspawns (engine state mirrors for spawn persistence)
```

### Notes

- The existing description says "Set by: server config or 'hoonymode' admin command in-game." The `hoonymode` command is CF_PLAYER | CF_SPC_ADMIN (any player or admin spectator), NOT admin-only. The phrasing "admin command" in the existing description is incorrect. The v2 draft corrects this.
- FLAG: existing description implies `hoonymode` is an admin-only command. Source (`commands.c:816`: `CF_PLAYER | CF_SPC_ADMIN`) confirms it is available to any player or admin spectator.
- The F4 cross-card finding: when HoonyMode is active and all players ready, `PlayerReady()` dispatches to `HM_all_ready()` (match.c:2928-2930), bypassing the `k_on_start_f_*` cvar checks that fire in the else branch. This means HoonyMode matches do not trigger f_modified/f_ruleset/f_version anti-cheat stuffcmds. Surfaced in See-also but kept out of L1 prose (implementation-level detail; belongs in L3 concept note).

---

## k_hoonyrounds (KTX cvar, Mode-scoped knobs -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/world.c:889
- **Catalog line**: 12066
- **Anchor**: v1.36-1633-g67253dc

### Current description

> HoonyMode only. Sets the number of point-rounds the match must play before it can end. The match finishes once at least this many rounds have been played and one side has a lead. Value 0 is treated as 6.
>
> Range: 2-20 (enforced by roundsup/roundsdown commands, which step in increments of 2).
>
> Default: 6.
> Set by: server config or 'roundsup' / 'roundsdown' admin commands in-game.

### Shape classification

shape-less -- this cvar is paired with two directional increment/decrement commands (`roundsup` / `roundsdown`) that use `cvar_fset` to write the value. This does not match Shape 2 (single cycle command that increments+wraps) since there is no single wrapping cycle command; instead there are two separate bounded-adjustment commands. The cvar has inter-entity relationships (paired with two commands), but the relationship pattern (two-command up/down with bounds rather than a single incrementing cycle) is not captured by any cataloged shape. However, since the commands themselves are being parked (see park entries below), the cvar-side can still be drafted cleanly: the relationship is documented via See-also, and the description is factually correct. This entity does not need parking itself -- the shape-less classification is appropriate with a rationale note.

### Proposed draft

```
HoonyMode only. Sets the number of point-rounds the match plays before it can end. The match finishes once at least this many rounds have been played and one side holds a lead.

Effect:
  Value 0 is treated as 6 (the fallback default in HM_rounds()).
  Range: 2-20 when changed in-game via roundsup / roundsdown; those commands step in increments of 2. Direct server.cfg set accepts any integer; values outside 2-20 are not clamped at read time by the roundsup/roundsdown commands (they operate on the current clamped value), but the 0→6 fallback applies at match runtime.

Prerequisites: k_hoonymode must be set to 1 -- this cvar has no effect outside HoonyMode.

Permission:    server config, or via 'roundsup' / 'roundsdown' in-game (pre-match only)
Match-state:   roundsup / roundsdown are refused while a match is in progress; direct cvar set in server.cfg any time
Default:       6.

Example:
  # server.cfg
  k_hoonymode 1
  k_hoonyrounds 12   # 12 rounds, first to 7 wins

  # or adjust in-game before match start:
  roundsup    # increases by 2 each invocation
  roundsdown  # decreases by 2 each invocation

See also: k_hoonymode (must be enabled), roundsup (increments this by 2), roundsdown (decrements this by 2), hoonymode (preset that bundles this with other required settings)
```

### Notes

- FLAG: existing description says "Set by: server config or 'roundsup' / 'roundsdown' admin commands in-game." Source (`commands.c:1056-1057`) shows both `roundsup` and `roundsdown` are registered with `CF_PLAYER` (not `CF_BOTH_ADMIN`). They are NOT admin commands -- any player can invoke them. The "admin commands" phrasing in the existing description is incorrect. v2 draft corrects this.
- The cvar's `shape-less` classification is appropriate: the two-command up/down pattern is a genuine inter-entity relationship (cvar + two directional adjustment commands) but does not match any cataloged shape. The commands themselves are parked as trigger 1 (no-shape-match); the cvar can still be drafted with shape-less + See-also.
- Value 0 → 6 fallback: verified at `hoonymode.c:104-106` (`HM_rounds()` function).

---

## k_clan_arena_rounds (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:984
- **Catalog line**: 11109
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Number of rounds in a Clan Arena or Wipeout series. Values are clamped to 3-101; even values are silently rounded up to the next odd number. The series is best-of-that, won by the first team to take a majority of rounds.
>
> Range: 3-101 (odd values only; even inputs are rounded up).
>
> Default: 9.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired toggle or cycle command). Confirmed: no `cvar_toggle_msg`, no `cvar_fset` cycle handler exists for `k_clan_arena_rounds`. The only write paths are server.cfg and the `carena` / `wipeout` preset bundles. Bound + odd-rounding applied at read time inside `CA_wins_required()` (`clan_arena.c:286-290`), not at set time.

### Proposed draft

```
Number of rounds in a Clan Arena or Wipeout series. The first team to win a majority of rounds wins the series.

Effect:
  Values are clamped to 3-101 at match time. Even values are silently rounded up to the next odd number (so 8 becomes 9, 10 becomes 11, etc.). The required wins are computed as (rounds + 1) / 2 after the odd-rounding step.

  Both the 'carena' and 'wipeout' presets set this to 9 by default; 'wipeout' additionally sets k_clan_arena_max_respawns 4.

Permission:    server config only
Default:       9.

Example:
  # server.cfg -- 11-round series (first to 6)
  k_clan_arena 1
  k_clan_arena_rounds 11
  k_clan_arena_max_respawns 0

See also: k_clan_arena (mode enable cvar), k_clan_arena_max_respawns (respawns per round), carena (preset that bundles this), wipeout (preset that bundles this)
```

### Notes

- Odd-rounding and clamping verified at `clan_arena.c:286-290` (`CA_wins_required()`). Applied at match-start read time, not at set time -- so `server.cfg k_clan_arena_rounds 8` is stored as 8 but treated as 9 at runtime. This is a surprise-bearing behavior worth surfacing in Effect.
- The existing description is accurate; no contradictions found.

---

## k_clan_arena_max_respawns (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:985
- **Catalog line**: 11079
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Number of times a player may respawn per Clan Arena / Wipeout round. A player who has used all respawns becomes a spectating ghost for the remainder of the round.
>
> Range: 0 or higher. 0 = eliminated on first death (no respawns).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired toggle or cycle command). Confirmed: no `cvar_toggle_msg`, no `cvar_fset` cycle handler. Read at multiple points in `clan_arena.c` (lines 128, 601, 729). Standard server-config-only cvar.

### Proposed draft

```
Number of times a player may respawn per Clan Arena or Wipeout round before becoming an eliminated spectating ghost for the rest of the round.

Effect:
  0 = no respawns -- eliminated on first death (the Clan Arena default).
  1+ = player may die and respawn that many times before ghosting. In Wipeout mode (k_clan_arena 2), respawn timing scales with team size (longer gaps for larger teams).

  The 'carena' preset sets this to 0; the 'wipeout' preset sets this to 4.

Permission:    server config only
Default:       0.

Example:
  # server.cfg -- Wipeout-style with 4 respawns per round
  k_clan_arena 2
  k_clan_arena_max_respawns 4
  k_clan_arena_rounds 9

See also: k_clan_arena (mode enable cvar -- 1 = CA, 2 = Wipeout), k_clan_arena_rounds (rounds per series), carena (preset: sets this to 0), wipeout (preset: sets this to 4)
```

### Notes

- Wipeout respawn timing detail verified at `clan_arena.c:125-158` (`calc_respawn_time()`): respawn delay scales with team size; first death is `multiple` seconds where `multiple = bound(3, teamsize+1, 6)`. Solo player gets one free instant respawn on first death in Wipeout. This timing detail is Wipeout-specific implementation; kept out of L1 prose but noted here.
- The existing description is accurate. The Wipeout timing nuance is a nice-to-have addition in the v2 draft; not a contradiction.

---
---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author should resolve before applying drafts to L1. 18 findings (11 actionable, 6 confirmed clean, 1 accepted park).

### F1: "Admin command" Permission-line mislabel pattern -- batch-wide F1-audit residue

**Verdict**: ACTIONABLE

**Cards involved** (~24 entries; all `drafted_with_flag`): `norunes`, `ctfbasedspawn`, `nohook`, `noweapon`, `k_cg_kb`, `k_teleport_cap`, `teleportcap`, `freshguns`, `freshpacks`, `freshtime`, `k_freshteams_limit_packs`, `k_freshteams_limit_sweep_ammo`, `gren_mode`, `spawn666time`, `midair_minheight`, `k_midair`, `k_instagib`, `instagib`, `k_rocketarena`, `arena`, `no_gl`, `no_lg`, `k_hoonymode`, `k_hoonyrounds`.

**Observation**: Continuation of the Mode selection batch F1 finding (apply-pass corrections queued for `dmgfrags`, `silence`). Every command with `CF_PLAYER | CF_SPC_ADMIN` whose existing description says "Admin command" / "Set by: admin command" was flagged by its chunk's sub-agent. v2 recasts standardize to "any player or admin spectator" per the corrected Permission-discipline table in `universal-shape-v2.md` (updated 2026-05-26). The single legitimate "admin only" entity in this batch is `noga` (CF_BOTH_ADMIN) -- which correctly uses the "admin only" framing.

**Source evidence**: Each card's Notes section cites the source CF flag at `commands.c`. Constants at `g_local.h:647-658`.

**Recommendation**: Apply v2 Permission lines as drafted. Systemic L1-corpus issue; this batch's flag rate (~44% of cards) is dominated by this single discipline pattern. No further per-card review needed beyond the surfaced flags.

---

### F2: k_freshteams_limit_packs / k_freshteams_limit_sweep_ammo default-value factual error

**Verdict**: ACTIONABLE

**Cards involved**: `k_freshteams_limit_packs`, `k_freshteams_limit_sweep_ammo` (both `drafted_with_flag`)

**Observation**: Both existing L1 descriptions claim `Default: 0`. Source (`world.c`, `RegisterCvarEx` registrations) sets default `'1'`. The v2 recasts surface this as `FLAG:`-prefixed factual corrections. Real factual error in the existing L1 corpus -- not a stored-vs-effective distinction.

**Source evidence**: `RegisterCvarEx("k_freshteams_limit_packs", "1")` and `RegisterCvarEx("k_freshteams_limit_sweep_ammo", "1")` in world.c.

**Recommendation**: Apply the corrected `Default: 1` value to both cards.

---

### F3: Shape 1d triad completion -- k_tot_mode cross-batch threading to tot + totmode

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `k_tot_mode` (this batch, drafted); cross-batch siblings `tot` + `totmode` (Mode selection batch, shipped 2026-05-26).

**Observation**: The Shape 1d triad (preset + cvar + toggle) is now complete. `k_tot_mode`'s See-also references both `tot` (preset that bundles it) and `totmode` (paired toggle for it). Cross-batch threading aligns with Mode selection batch F3's prediction. Apply-pass-author should verify `tot` and `totmode` cards' See-also reference back to `k_tot_mode` symmetrically when applying.

**Source evidence**: `g_local.h:1236` (`TOT_MODE_VARIABLE = "k_tot_mode"`); preset bundle at `commands.c:4511-4533`; toggle at `commands.c:958`.

**Recommendation**: No content correction needed. Cross-batch See-also threading already symmetric per Mode selection batch's tot + totmode cards.

---

### F4: k_ctf_hookstyle Shape 7b state cvar completion -- cross-batch threading to Voting batch hook fan-out

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `k_ctf_hookstyle` (this batch, drafted); cross-batch siblings `hook_smooth` / `hook_fast` / `hook_classic` (canonical) / `hook_crhook` + `k_vp_hookstyle` (all Voting batch, shipped 2026-05-26).

**Observation**: `k_ctf_hookstyle` shape-classifies cleanly as Shape 7b state cvar + command-per-value fan-out target. See-also references all 4 hook commands + `k_vp_hookstyle` (threshold) + `k_ctf_hook` (master enable -- in this batch). The 4 vote commands write `k_ctf_hookstyle` via `cvar_fset` on pass (values 1-4 per `hook_smooth`/`fast`/`classic`/`crhook`). `hook_crhook` doesn't read `k_vp_hookstyle` (hardcoded 51%) -- per Voting batch finding F2 + F3.

**Source evidence**: `world.c:907` (registration default 0); ktx.cfg ships value 1; `vote.c:1227/1271/1314/1358` (`cvar_fset` write sites per hook command).

**Recommendation**: No content correction needed. The Voting batch's hook command See-also references already point at `k_ctf_hookstyle` by name -- bidirectional thread complete on apply.

---

### F5: DMM4 mutual exclusion network is ASYMMETRIC -- k_dmm4_gren_mode excluded only by midair+instagib

**Verdict**: ACTIONABLE

**Cards involved**: `k_dmm4_gren_mode` (chunk 5); `k_midair` / `k_instagib` (chunk 7); `k_lgcmode` / `k_tot_mode` (chunk 8). Cross-batch: `lgcmode` / `totmode` / `midair` / `instagib` / `tot` (Mode selection batch).

**Observation**: The DMM4 modifier mutual-exclusion network is NOT a fully-symmetric clique. Chunk 5's `k_dmm4_gren_mode` sub-agent finding: "mutually exclusive with midair+instagib (source-verified); LGC/TOT do NOT clear this." Mode selection batch's `lgcmode` card (Effect bullet): clears `k_midair`, `k_instagib`, `k_dmgfrags` -- does NOT clear `k_dmm4_gren_mode` or `k_tot_mode`. The clears are per-toggle-handler-specific, not a symmetric mutual-exclusion clique. The Mode selection batch's Notes implied symmetry; source shows asymmetry.

**Source evidence**: `commands.c:7869-7871` (ToggleLGC clears block); per-toggle handlers in `commands.c:7526` (midair) / `commands.c:7613` (instagib-related) / `hoonymode.c` (totmode) -- each has its own selective clear-set.

**Recommendation**: Apply-pass-author should NOT claim symmetric mutual exclusion in any v2 Effect / See-also wording for the modifier cvars. Each modifier's See-also enumerates which others IT clears + which others clear IT, not a generic "DMM4 modifiers are mutually exclusive" claim. Open follow-up: consider an L3 concept note that maps the exclusion network as a directed graph.

---

### F6: Existing-description naming-mismatch flags (toggle command name vs registered command name)

**Verdict**: ACTIONABLE

**Cards involved**: `k_cg_kb` + `k_teleport_cap` (chunk 3)

**Observation**: Two cards had existing descriptions naming the wrong toggle command:
- (a) `k_cg_kb` existing names "cg_kb" as paired toggle; actual registration is `instagib_coilgun_kickback` at `commands.c:954`. v2 corrects.
- (b) `k_teleport_cap` existing names internal C function "setTeleportCap"; actual user-facing command is `teleportcap`. v2 corrects.

**Source evidence**: `commands.c:954` (instagib_coilgun_kickback registration); `commands.c` (teleportcap registration); the C-function names appear in handler definitions but are not user-facing.

**Recommendation**: Apply v2 naming as drafted. The internal-C-name leak (setTeleportCap) suggests the existing description was synthesized partially from source-symbol inspection rather than registration walk; flag for future synthesis discipline.

---

### F7: k_disallow_weapons family -- explicitly NOT Shape 11a (per-bit XOR siblings)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `k_disallow_weapons` (chunk 8, shape-less), `noweapon` (chunk 3, shape-less per-arg dispatcher), `no_gl` / `no_lg` (chunk 8, shape-less proxy aliases), `noga` (chunk 6, Shape 1c command side -- but on `k_ctf_ga`, NOT on `k_disallow_weapons`).

**Observation**: Sub-agents correctly applied the "Distinguish from these neighbors that are NOT Shape 11" test from `shape-catalog.md`. The family structure:
- `noweapon <weapon_name>` is the parent dispatcher (Shape 8-like multi-arg, but classified shape-less here as it lacks a registered subcommand table -- weapon-name args route inline).
- `no_gl` / `no_lg` handlers issue `stuffcmd_flags` to make the CLIENT re-issue `cmd noweapon gl/lg` -- they're proxy aliases, not independent per-bit XOR handlers. Don't qualify as Shape 11a siblings.
- `noga` does NOT operate on `k_disallow_weapons`; it's a Shape 1c paired toggle for `k_ctf_ga` (a separate CTF-specific armor-disable cvar).

This is the third batch to ship with a Shape false-positive correctly ruled out (prior: `rules` ruled-out-of-Shape-10 in Server-config batch; `gamemodes` ruled-out-of-Shape-10 in Mode selection batch). Catalog discrimination guides are load-bearing and working.

**Source evidence**: `commands.c:5279` (`nwp` weapon-name dispatcher -- not the same as `noweapon`); `commands.c` no_gl/no_lg handlers (`stuffcmd_flags` proxy); shape-catalog.md Shape 11 disambiguation section.

**Recommendation**: No action. Documents that the catalog's neighbor-discrimination tests are working at scale.

---

### F8: k_midair / k_instagib silent-reset behavior on non-dmm4 map start

**Verdict**: ACTIONABLE

**Cards involved**: `k_midair` + `k_instagib` (both chunk 7, both `drafted_with_flag`)

**Observation**: Both cvars are silently cleared at map start when dmm4 isn't active. Existing L1 descriptions do not mention this; v2 recasts add the behavior to Effect. Surprise-bearing -- a server admin setting `k_midair 1` in server.cfg without `deathmatch 4` would see the cvar mysteriously reset to 0 at next map load.

**Source evidence**: `world.c` (map-start initialization sequence); sub-agents cite the specific lines in their cards' Notes sections.

**Recommendation**: Apply v2 Effect text including the silent-reset note. Consider an L3 concept note on "DMM4 modifier persistence across map transitions" if more silent-reset behaviors surface in adjacent batches.

---

### F9: spawn666time clamp asymmetry between command path and direct cvar set

**Verdict**: ACTIONABLE

**Cards involved**: `spawn666time` + `dmm4_invinc_time` (both chunk 5, both `drafted_with_flag`)

**Observation**: Direct server.cfg set of `dmm4_invinc_time` accepts any value (e.g. `dmm4_invinc_time 30`). The `spawn666time` command, however, clamps the SET to 2s (`DMM4_INVINCIBLE_DEFAULT`) -- not 30s. The `tot` preset bundle sets `-1`. Three write paths with three different bounds:
- Direct cvar set: any integer (no clamp at set time)
- `spawn666time` command: hardcoded 2s clamp
- `tot` preset bundle: `-1` literal

**Source evidence**: `RegisterCvar("dmm4_invinc_time")` (no default); `spawn666time` handler clamp logic; `tot_um_init[]` bundle in `commands.c:4511-4533`.

**Recommendation**: Apply v2 Effect text on both cards documenting the asymmetry. Possible apply-pass follow-up: investigate whether `spawn666time` was intentionally hard-clamped at 2s or whether it's a stale literal. If intentional, document why; if stale, flag as upstream code-review candidate.

---

### F10: k_ctf_based_spawn 3-value enum, toggle covers 0↔1 only

**Verdict**: ACTIONABLE

**Cards involved**: `k_ctf_based_spawn` + `ctfbasedspawn` (both chunk 2)

**Observation**: `k_ctf_based_spawn` has a 3-value enum (0/1/2 per source). The paired toggle `ctfbasedspawn` only covers the 0↔1 transition. Value 2 is reachable only via direct server.cfg set. v2 draft surfaces this on the cvar card.

**Source evidence**: Sub-agent cites source registration + handler logic in card Notes.

**Recommendation**: Apply v2 cvar text with the 3-value enum and toggle-coverage caveat. The toggle command card stays at "flips 0↔1" -- discipline says value enum lives on cvar card.

---

### F11: k_ctf_custom_models scope expanded to CTF || RACE (existing said CTF-only)

**Verdict**: ACTIONABLE

**Cards involved**: `k_ctf_custom_models` (chunk 2, `drafted_with_flag`)

**Observation**: Existing description limits scope to CTF only. Source (`world.c:1162`, `race.c:4934`) shows the precache fires on `isCTF() || isRACE()`, and race-mode also uses the cvar for the pacemaker model. v2 broadens scope to "CTF or Race mode".

**Source evidence**: `world.c:1162` (precache loop); `race.c:4934` (race pacemaker model reference).

**Recommendation**: Apply v2 scope text. The cvar's name (`k_ctf_*`) is misleading given its race-mode usage; flag as a possible upstream rename candidate (low priority).

---

### F12: Canonical-card pattern -- 3 applications in batch, with one DOWNGRADE on rune powers

**Verdict**: CONFIRMED_CLEAN

**Cards involved**:
- (a) `k_freshteams_pack_*` (4 cvars, chunk 5): canonical = `k_freshteams_pack_cells`, 3 reference cards. Standard pattern.
- (b) `k_freshteams_sweep_*_ammo` (6 cvars, chunk 6): canonical = `k_freshteams_sweep_gl_ammo`, 5 reference cards. Standard pattern.
- (c) `k_ctf_rune_power_*` (4 cvars, chunk 1): canonical-card pattern DOWNGRADED. Each got its own full card.

**Observation**: The downgrade on `k_ctf_rune_power_*` validates the "near-identical siblings only" caveat in `shape-catalog.md`. The 4 rune powers have meaningfully different effect formulas:
- `_hst` (haste): speed multiplier + grappling-hook speed + cooldown adjustments
- `_res` (resistance): damage-divide formula (`x/2+1`)
- `_str` (strength): damage-multiply formula (`x/2+1`)
- `_rgn` (regeneration): heal-interval cvar (tick rate + armor healing)

Per `shape-catalog.md` discipline: "Canonical pattern is for *near-identical* siblings only." The 4 powers share NAMING + CATEGORY ROLE but their per-cvar Effects are load-bearing-different. Sub-agent correctly downgraded.

**Recommendation**: No action. Documents the canonical-card discipline holding at scale (one upgrade-to-canonical, one apply-canonical, one rejected-as-non-near-identical -- all source-verified).

---

### F13: k_nosweep re-classified Shape 3 → Shape 1c -- `nosweep` paired toggle missing from this batch

**Verdict**: ACTIONABLE (follow-up)

**Cards involved**: `k_nosweep` (chunk 3, drafted)

**Observation**: Existing description framed `k_nosweep` as Shape 3 (server config only). Source shows paired toggle command `nosweep` exists with `CF_PLAYER | CF_SPC_ADMIN` and dmm1 mode-precondition. Sub-agent re-classified Shape 1c. The toggle command `nosweep` is NOT in this batch's Mode-scoped-knobs catalog -- presumably in a different KTX L1 category. v2 cvar card references `nosweep` in See-also.

**Source evidence**: `commands.c` (nosweep registration -- sub-agent cites in Notes); ToggleNoSweep handler with `is_rules_change_allowed()` + dmm1 check + `cvar_toggle_msg(self, "k_nosweep", ...)`.

**Recommendation**: When a future batch drafts `nosweep`, verify bidirectional See-also threading back to `k_nosweep`. Open follow-up: flag for the apply-pass-author so the cross-batch threading isn't lost.

---

### F14: HoonyMode + Scoring & stats F4 cross-batch coherence (k_on_start_f_* bypass)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `k_hoonymode` (chunk 9, `drafted_with_flag`); cross-batch `k_on_start_f_modified` / `_ruleset` / `_version` (Scoring & stats batch, canonical + reference cards).

**Observation**: Scoring & stats batch F4 noted: `isHoonyModeAny()` branches `PlayerReady()` to `HM_all_ready()`, bypassing the `k_on_start_f_*` cvar checks entirely. This batch's `k_hoonymode` card does NOT need to enumerate this bypass on its own Effect -- the bypass behavior lives on the consumer side (`PlayerReady()`), and the `k_on_start_f_*` cards already document the hoonymode exclusion. Cross-batch coherence preserved without redundant claims.

**Source evidence**: `match.c` (`PlayerReady` -- `isHoonyModeAny()` branch); prior Scoring & stats batch F4 finding.

**Recommendation**: No action. Documents that cross-batch consumer-side annotations don't require provider-side duplication.

---

### F15: Cross-chunk pair bidirectional See-also -- verified

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: 
- `k_ctf_ga` (chunk 2) ↔ `noga` (chunk 6) -- Shape 1 pair across chunks
- `k_cg_kb` (chunk 3) ↔ `instagib_coilgun_kickback` (chunk 7) -- Shape 1 pair + Shape 4 gate across chunks
- `k_ctf_hook` (chunk 2) ↔ `nohook` (chunk 2) -- Shape 1c pair, same chunk
- `arena` (chunk 8) ↔ `k_rocketarena` (chunk 8) -- Shape 1c pair, same chunk
- `k_teleport_cap` ↔ `teleportcap` (both chunk 3) -- shape-less lever

**Observation**: Per-chunk YAML returns + spot-checks confirm all cross-chunk and within-chunk paired-toggle / lever See-also references are bidirectional. The cross-chunk pairs `k_ctf_ga` ↔ `noga` and `k_cg_kb` ↔ `instagib_coilgun_kickback` particularly load-bearing -- sub-agents in different chunks independently identified the pair and surfaced symmetrically.

**Recommendation**: No action. Documents that the dispatcher's cross-batch context briefings (in each sub-agent prompt) successfully threaded the cross-chunk pair relationships.

---

### F16: roundsdown / roundsup parked (operator-accepted halt-on-novelty override)

**Verdict**: ACCEPTED_PARK

**Cards involved**: `roundsdown` + `roundsup` (chunk 9, both parked under trigger 1: no-shape-match)

**Observation**: Both commands form a two-command bounded increment/decrement pair on `k_hoonyrounds` (`HM_rounds_adjust(±1)` at `hoonymode.c:1122-1137`, `bound(2, current + change*2, 20)`, `cvar_fset` write, broadcasts "Roundlimit set to N"). Shape 1 ruled out (uses `cvar_fset`, not `cvar_toggle_msg`); Shape 2 ruled out (bounded not cyclic + pair not single command). No cataloged shape captures the pattern -- earn-their-keep verdict: 1-of-1 in KTX, doesn't earn new shape entry. Sub-agent parked under trigger 1; dispatcher halted; OPERATOR ACCEPTED PARK + override-shipped 64 drafted cards.

**Source evidence**: `commands.c:1056-1057` (registrations); `hoonymode.c:1227-1249` (handlers); `hoonymode.c:1122-1137` (shared adjustment logic).

**Recommendation**: Apply-pass-author hand-drafts `roundsdown` + `roundsup` as shape-less command-side levers for `k_hoonyrounds`. Suggested Headliners (from park entries): "Increases the HoonyMode round limit (k_hoonyrounds) by 2, up to a maximum of 20" / "Decreases ... by 2, down to a minimum of 2." See-also = `k_hoonyrounds` + sibling + `hoonymode`. If a future codebase walk surfaces another bounded-up/down pair, revisit the shape catalog question.

---

### F17: k_instagib auto-enables k_cg_kb on enable -- surprise-bearing behavior

**Verdict**: ACTIONABLE

**Cards involved**: `k_instagib` (chunk 7, `drafted_with_flag`); cross-link to `k_cg_kb` (chunk 3)

**Observation**: Enabling `k_instagib` auto-sets `k_cg_kb` to 1 (per chunk 7 sub-agent). Not in existing description. The k_cg_kb cvar (coilgun kickback) is a Shape 1c modifier with `instagib_coilgun_kickback` as paired toggle -- but k_instagib's enable handler short-circuits to `cvar_fset("k_cg_kb", 1)` directly. Surprise-bearing for users who run `instagib_coilgun_kickback 0` then enable instagib (the kickback comes back on automatically).

**Source evidence**: Sub-agent cites source line in chunk 7 k_instagib card Notes.

**Recommendation**: Apply v2 Effect text with the auto-enable note. Cross-link in `k_cg_kb` Effect (as a write-path note) if not already there.

---

### F18: k_clan_arena_rounds odd-rounding surprise (even values silently rounded up)

**Verdict**: ACTIONABLE

**Cards involved**: `k_clan_arena_rounds` (chunk 9, drafted)

**Observation**: Cvar values are clamped to 3-101 AND even values silently rounded up to next odd at match time (`CA_wins_required()` at `clan_arena.c:286-290`). So `k_clan_arena_rounds 8` stores 8 but runtime treats as 9. Existing description correctly says "odd values only; even inputs are rounded up" -- but framed as "Range: 3-101 (odd values only)" rather than "stored as set; rounded at read time". The recast clarifies the stored-vs-effective distinction.

**Source evidence**: `clan_arena.c:286-290` (`CA_wins_required()` rounding logic).

**Recommendation**: Apply v2 Effect text. The rounding mechanism is a surprise-bearing read-time transform; future apply-pass discipline might consider a "value-mutation" annotation pattern for cards where stored ≠ effective.

