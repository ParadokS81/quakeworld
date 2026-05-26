# ktx-l1-rewrite drafts -- batch 2026-05-26 (Mode selection)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher` (chunked-mode, chunk_size=7 across 4 sub-agents).
Apply-pass-author reviews each card, applies clean drafts, hand-edits
flagged-drafts after verifying the surfaced contradiction. Drafts do NOT
auto-apply to L1 (`entities.description`); the apply pass is a separate phase.

28 cards drafted, 0 parked. 21 drafted clean + 7 drafted_with_flag.

Sub-family ordering: deathmatch mode setters -> team-format presets -> themed mode presets -> modifier toggles -> state cvars -> help-printer.

---

## dmm1 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:725
- **Catalog line**: 10557
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to deathmatch mode 1 (standard deathmatch). In dmm1, picked-up weapons are removed and respawn on a 30-second timer. The k_freshteams and k_nosweep features are only available in dmm1; switching away from mode 1 force-clears them. k_midair and k_instagib are also cleared when switching to any mode other than dmm4.
>
> Set by: any in-game player or admin spectator ('dmm1' in-game).

### Shape classification

shape-less. `dmm1` calls `ChangeDM(1)` which sets the `deathmatch` engine cvar directly (confirmed src/commands.c:2871-2900). It is NOT a `DEF(UserMode)` preset and has no paired toggle cvar, no vote, and no gating relationship. It is one of a sibling family (dmm1-5) where each commands a different engine mode value -- distinct behaviors across siblings preclude the canonical-card pattern. See-also cross-links the family.

### Proposed draft

```
Switches the server to deathmatch mode 1 (standard deathmatch).

Effect:
  - Picked-up weapons are removed from the map and respawn on a 30-second timer.
  - Clears k_midair and k_instagib (both require dmm4).
  - k_freshteams and k_nosweep are only usable in mode 1; selecting any other mode automatically clears them.
  - If already in mode 1, prints "dmm1 already set" and does nothing.

Prerequisites: Rule changes must be allowed (refused mid-match and while race mode is active).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dmm1          (switch to mode 1)
  freshteams    (now available -- requires mode 1 to be active)

See also: dmm2 (sibling mode), dmm3 (sibling mode), dmm4 (sibling mode; required for midair/instagib), dmm5 (sibling mode), k_freshteams (mode-1-only modifier), k_nosweep (mode-1-only modifier)
```

### Notes

- Force-clear of k_freshteams and k_nosweep on mode switch is performed by `FixRules()` in world.c (runs every frame), not inside `ChangeDM` itself. The user-visible effect is the same (immediate-on-next-frame clearing), but the mechanism is `FixRules`. Accurate to say "switching away clears them."
- The existing description also correctly notes k_midair and k_instagib are cleared; `ChangeDM` at commands.c:2889-2892 does this directly.
- See-also cap is 6 for this sibling family -- acceptable for a mode-selection command; all 4 siblings + 2 mode-1-only modifiers are load-bearing. If a concept note for KTX deathmatch modes is authored later, this list can collapse to a concept-note pointer.

---

## dmm2 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:726
- **Catalog line**: 10584
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to deathmatch mode 2 and announces the change. In dmm2, picked-up weapons remain on the ground and items/health do not respawn. Enabling dmm2 forces k_midair and k_instagib off.
>
> Default: n/a (command).
> Set by: admin command 'dmm2' in-game or server console.

### Shape classification

shape-less. Same `ChangeDM` dispatch as dmm1/dmm3-5 (src/commands.c:726). No paired cvar+toggle, no vote, no gate relationship. Sibling family with distinct per-mode behaviors -- See-also cross-links.

### Proposed draft

```
Switches the server to deathmatch mode 2 (Quake original "silly old rules").

Effect:
  - Picked-up weapons remain on the ground (not removed on pickup).
  - Health pickups, armor, and ammo do NOT respawn (confirmed items.c: deathmatch != 2 guard on nextthink).
  - Clears k_midair and k_instagib (both require dmm4).
  - If already in mode 2, prints "dmm2 already set" and does nothing.

Prerequisites: Rule changes must be allowed (refused mid-match and while race mode is active).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dmm2          (switch to mode 2 -- items deplete, no respawn)

See also: dmm1 (sibling mode), dmm3 (sibling mode), dmm4 (sibling mode; required for midair/instagib), dmm5 (sibling mode)
```

### Notes

- "Items/health do not respawn" is source-verified: items.c lines 367-372 and 1340-1342 gate `nextthink` respawn on `deathmatch != 2`. Comment at items.c:407 reads "deathmatch 2 is silly old rules."
- The existing description's "admin command" in Set-by is a slight overstatement -- CF_PLAYER | CF_SPC_ADMIN means any in-game player can use it. Corrected in recast.
- The v1 description says "Default: n/a (command)" -- correct; commands have no default. Dropped from recast per v2 discipline (commands don't list Default).

---

## dmm3 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:727
- **Catalog line**: 10612
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to deathmatch mode 3. In dmm3, picked-up weapons stay on the ground for others to grab (weapons are not removed on pickup), and ammo respawn time is halved to 15 seconds. k_midair and k_instagib are also cleared when switching to any mode other than dmm4.
>
> Set by: any in-game player or admin spectator ('dmm3' in-game).

### Shape classification

shape-less. Same `ChangeDM` dispatch (src/commands.c:727). No relational shape; sibling family cross-linked via See-also.

### Proposed draft

```
Switches the server to deathmatch mode 3.

Effect:
  - Picked-up weapons remain on the ground (not removed on pickup).
  - Ammo respawn time is halved to 15 seconds (standard is 30).
  - Clears k_midair and k_instagib (both require dmm4).
  - If already in mode 3, prints "dmm3 already set" and does nothing.

Prerequisites: Rule changes must be allowed (refused mid-match and while race mode is active).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dmm3          (switch to mode 3 -- weapons stay, fast ammo respawn)

See also: dmm1 (sibling mode), dmm2 (sibling mode), dmm4 (sibling mode; required for midair/instagib), dmm5 (sibling mode; shares weapon-stay + halved-ammo-respawn but adds full spawn loadout)
```

### Notes

- Halved ammo respawn verified at items.c:1347-1350: `if ((deathmatch == 3) || (deathmatch == 5)) { self->s.v.nextthink = g_globalvars.time + 15; }`.
- Weapons-stay-on-ground verified at items.c:835: `if ((deathmatch == 2) || (deathmatch == 3) || (deathmatch == 5) || coop) { leave = 1; }`.
- dmm5 See-also note is added because dmm5 shares both of dmm3's item-rule properties but adds full-loadout spawning -- readers switching from dmm3 context benefit from knowing dmm5 is the supercharged sibling.

---

## dmm4 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:728
- **Catalog line**: 10639
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to deathmatch mode 4. Sets deathmatch to 4, forces timelimit to 3 minutes, and broadcasts the change. Mode 4 is the only deathmatch mode that permits k_midair and k_instagib -- switching away from dmm4 zeroes both options automatically. The Quad Damage powerup is renamed "OctaPower" while dmm4 is active.
>
> Set by: any in-game player or admin spectator ('dmm4' command; subject to rules-change permission).

### Shape classification

shape-less. Same `ChangeDM` dispatch (src/commands.c:728, arg 4). No paired cvar+toggle or vote relationship of its own. It acts as the prerequisite mode for k_midair, k_instagib, k_rocketarena, and the lgc/tot/instagib modifier families (Shape 1c/1d), but that relationship lives on those entities' cards -- dmm4 itself has no Layer B relationship to tag.

### Proposed draft

```
Switches the server to deathmatch mode 4 -- the only mode that permits midair, instagib, LGC, and Rocket Arena modifiers.

Effect:
  - Sets timelimit to 3 minutes automatically.
  - Renames Quad Damage to "OctaPower" while mode 4 is active.
  - k_midair and k_instagib become available (refused with "requires dmm4" in any other mode).
  - Switching away from mode 4 immediately clears k_midair and k_instagib.
  - If already in mode 4, prints "dmm4 already set" and does nothing.

Prerequisites: Rule changes must be allowed (refused mid-match and while race mode is active).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dmm4            (switch to mode 4 -- timelimit auto-set to 3)
  midair          (now available)
  instagib        (now available)

See also: dmm1 (sibling mode), dmm2 (sibling mode), dmm3 (sibling mode), dmm5 (sibling mode), k_midair (requires dmm4), k_instagib (requires dmm4)
```

### Notes

- timelimit auto-set to 3 verified at commands.c:2896: `cvar_set("timelimit", "3")` inside the `else` branch when `dmm == 4`.
- OctaPower rename verified at items.c:2341: `self->netname = deathmatch == 4 ? "OctaPower" : "Quad Damage"`.
- k_midair/k_instagib clear on mode-change verified at commands.c:2891-2892 inside ChangeDM.
- See-also cap at 6 (4 siblings + 2 most load-bearing requirers). k_rocketarena, lgc, tot, instagib are also dmm4-dependent but their cards reference dmm4 in Prerequisites -- cross-link is bidirectional there, not needed on this card.

---

## dmm5 (KTX command, Mode selection -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:729
- **Catalog line**: 10666
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to deathmatch mode 5 and announces the change. In mode 5, picked-up weapons stay on the ground and ammo respawn time is halved (15 seconds instead of 30). Enabling mode 5 forces k_midair and k_instagib off.
>
> Note: The rule distinguishing mode 5 from mode 3 is not definitively established in KTX source.
>
> Set by: admin command in-game.

### Shape classification

shape-less. Same `ChangeDM` dispatch (src/commands.c:729, arg 5). No relational shape. Sibling family.

### Proposed draft

```
Switches the server to deathmatch mode 5 -- a "super-spawn" variant used by Wipeout and Clan Arena setups.

Effect:
  - Picked-up weapons remain on the ground (not removed on pickup).
  - Ammo respawn time is halved to 15 seconds.
  - Players spawn during a live match with all weapons (SSG, NG, SNG, RL, GL, LG), 200 health, 200 armor (red), full ammo loadout, and brief invincibility.
  - Clears k_midair and k_instagib (both require dmm4).
  - If already in mode 5, prints "dmm5 already set" and does nothing.

Prerequisites: Rule changes must be allowed (refused mid-match and while race mode is active).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dmm5          (switch to mode 5 -- players spawn fully loaded in live match)

See also: dmm1 (sibling mode), dmm2 (sibling mode), dmm3 (sibling mode; shares weapon-stay + halved ammo respawn but no super-spawn), dmm4 (sibling mode)
```

### Notes

- FLAG: The existing description states "The rule distinguishing mode 5 from mode 3 is not definitively established in KTX source" -- this is source-incorrect. The distinguishing rule is the full-loadout spawn behavior confirmed at client.c:2308-2332: when `deathmatch == 5 && match_in_progress == 2`, spawning players receive all 6 weapons, 200 HP, 200 RA (armorvalue=200, armortype=0.8), full ammo, and invincibility. This is the primary behavioral distinction from mode 3. The apply-pass-author should verify client.c:2308-2332 and remove the "not definitively established" caveat.
- FLAG: The existing description says "Set by: admin command in-game" but CF_PLAYER | CF_SPC_ADMIN means any in-game player can invoke it. Corrected in recast.
- Weapon-stay verified at items.c:835 (dmm==5 included in leave=1 group).
- Halved ammo respawn verified at items.c:1347 (dmm==5 included with dmm==3).
- Super-spawn verified at client.c:2308-2332.
- Wipeout preset sets deathmatch 5 (commands.c:4469); Clan Arena (carena) also uses deathmatch 5 (commands.c:4493 context). The "super-spawn" description in the Headliner gives context for why mode 5 exists.

---

## 2on2on2 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:819
- **Catalog line**: 10309
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to the built-in 2on2on2 three-team game mode. Applies the mode preset (6 player slots / 3 teams of 2, 10-minute rounds, 3-minute overtime, teamplay 2, weapons stay, powerups on) then execs any layered usermodes/2on2on2/*.cfg overrides and announces the change.
>
> Set by: server config or any player with sufficient k_free_mode access (blocked when k_auto_xonx is set or on hoonymode-only maps).

### Shape classification

shape-less (plain mode preset). All UserMode presets are `DEF(UserMode)` commands that apply a named `*_um_init[]` cvar bundle plus `common_um_init`. `_2on2on2_um_init` sets the player-count and rule bundle without a modifier cvar (`k_<modifier>_mode`) or a paired toggle command, so there is no Shape 1d triad. The bundle itself is the full description, per shape-catalog Shape 1d note on plain presets.

### Proposed draft

```
Applies the 2on2on2 preset: a three-team match with three squads of two.

Effect:
  maxclients 6 (6-player cap), 3 teams allowed (k_lockmax 3)
  timelimit 10 minutes, 3-minute time-based overtime (k_overtime 1, k_exttime 3)
  teamplay 2 (friendly fire on), deathmatch 3 (weapons stay on pickup)
  powerups on (k_pow 1), 1 player minimum per team (k_membercount 1)
  Runs common_um_init first (resets flood-protection, instagib, race, hoonymode, etc.), then loads any configs/usermodes/2on2on2/*.cfg overrides.

Prerequisites:
  k_allowed_free_modes must include the 2on2on2 bit (server disallows if not set).
  Blocked when k_auto_xonx is active ("Command blocked due to k_auto_xonx").
  Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  Blocked while a match is in progress.

Permission:    any player, or admin spectator
Match-state:   pre-match only

Example:
  2on2on2            (player or admin spectator applies the preset)
  2on2on2 EQL        (optional: appends a match tag for QTV event labeling)

See also: 4on4on4 (sibling three-team preset), 4on4 (standard team preset), ffa (free-for-all preset), k_allowed_free_modes (bitmask that enables/disables each preset), k_auto_xonx (when set, blocks manual preset selection)
```

### Notes

- shape-less: no modifier cvar (`k_<modifier>_mode`) or paired toggle command; bundle is the full description.
- Cross-batch siblings: 1on1, 2on2, 3on3, 4on4, 10on10, ffa, ctf, hoonymode, blitz2v2, blitz4v4, 3on3on3, 4on4on4, XonX shipped in the same batch or adjacent batches.

---

## 4on4 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:812
- **Catalog line**: 10336
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the 4on4 game-mode preset for a standard 4-versus-4 team deathmatch. Resets ruleset cvars to defaults first, then configures the server: 8-player cap, teamplay 2 (friendly fire on), deathmatch 1 (weapons do not stay), powerups enabled, 3 players minimum per team, 1-2 teams, 20-minute timelimit with 5-minute overtime.
>
> Set by: any player with usermode permissions (subject to k_allowed_free_modes).

### Shape classification

shape-less (plain mode preset). `_4on4_um_init` bundles player count + rule settings without a modifier cvar or paired toggle. Same structural pattern as all UserMode presets. No Shape 1d triad present.

### Proposed draft

```
Applies the 4on4 preset: a standard two-team deathmatch with four players per side.

Effect:
  maxclients 8 (8-player cap), 2 teams allowed (k_lockmax 2)
  timelimit 20 minutes, 5-minute time-based overtime (k_overtime 1, k_exttime 5)
  teamplay 2 (friendly fire on), deathmatch 1 (weapons disappear on pickup)
  powerups on (k_pow 1), 3 players minimum per team (k_membercount 3)
  Runs common_um_init first (resets flood-protection, instagib, race, hoonymode, etc.), then loads any configs/usermodes/4on4/*.cfg overrides.

Prerequisites:
  k_allowed_free_modes must include the 4on4 bit (server disallows if not set).
  Blocked when k_auto_xonx is active ("Command blocked due to k_auto_xonx").
  Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  Blocked while a match is in progress.

Permission:    any player, or admin spectator
Match-state:   pre-match only

Example:
  4on4               (player or admin spectator applies the preset)
  4on4 EQL           (optional: appends a match tag for QTV event labeling)

See also: 2on2 (smaller team preset), XonX (open-size team preset), ffa (free-for-all preset), k_allowed_free_modes (bitmask that enables/disables each preset), k_auto_xonx (when set, blocks manual preset selection)
```

### Notes

- shape-less: plain preset, no modifier cvar or paired toggle.
- Existing description's "subject to k_allowed_free_modes" wording is correct but v1-style; explicit gate prerequisites now surfaced in Prerequisites section.

---

## 4on4on4 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:821
- **Catalog line**: 10363
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the 4on4on4 game-mode preset: a three-team match with three squads of four. Sets a 12-player cap, enables powerups and teamfire, runs a 20-minute time limit with 5-minute overtime, requires at least 3 players per team, and allows 1-3 teams. The shared common reset runs first.
>
> Default: n/a (command).
> Set by: admin command '4on4on4'.

### Shape classification

shape-less (plain mode preset). `_4on4on4_um_init` applies the three-team deathmatch bundle. No modifier cvar or paired toggle. Same structure as all UserMode presets. The v1-style "Default: n/a / Set by: admin command" footer is superseded by the v2 Permission + Match-state lines.

### Proposed draft

```
Applies the 4on4on4 preset: a three-team match with three squads of four.

Effect:
  maxclients 12 (12-player cap), 3 teams allowed (k_lockmax 3)
  timelimit 20 minutes, 5-minute time-based overtime (k_overtime 1, k_exttime 5)
  teamplay 2 (friendly fire on), deathmatch 1 (weapons disappear on pickup)
  powerups on (k_pow 1), 3 players minimum per team (k_membercount 3)
  Runs common_um_init first (resets flood-protection, instagib, race, hoonymode, etc.), then loads any configs/usermodes/4on4on4/*.cfg overrides.

Prerequisites:
  k_allowed_free_modes must include the 4on4on4 bit (server disallows if not set).
  Blocked when k_auto_xonx is active ("Command blocked due to k_auto_xonx").
  Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  Blocked while a match is in progress.

Permission:    any player, or admin spectator
Match-state:   pre-match only

Example:
  4on4on4            (player or admin spectator applies the preset)

See also: 2on2on2 (two-player-per-team three-team variant), 4on4 (standard two-team preset), k_allowed_free_modes (bitmask that enables/disables each preset), k_auto_xonx (when set, blocks manual preset selection)
```

### Notes

- shape-less: plain preset, no modifier cvar or paired toggle.
- Existing description has v1-style "Default: n/a" and "Set by: admin command" footer -- replaced by Permission + Match-state lines in v2. Content was otherwise correct.
- Existing description says "enables powerups and teamfire" -- source confirms k_pow 1 (powerups) and teamplay 2 (friendly fire). Accurate but v1 phrasing; v2 lists the bundle items explicitly.

---

## XonX (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:822
- **Catalog line**: 10983
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the XonX game-mode preset: an open-size team match supporting up to 32 players. Sets teamplay 2 (friendly fire on), deathmatch 1 (weapons disappear on pickup), powerups enabled, 1-2 teams with at least 1 player each, 20-minute timelimit, 5-minute time-based overtime.
>
> Set by: admin command 'XonX' (blocked when k_auto_xonx is active). No individual cvar to toggle -- the command applies the full preset.

### Shape classification

shape-less (plain mode preset). `_XonX_um_init` applies an open-roster team bundle (maxclients 32, k_membercount 1, k_lockmax 2). XonX is not a parameterized variant -- the command name "X on X" in the display label is cosmetic for the open-size team concept. The source shows a fixed bundle; the player count is capped at 32 (not user-supplied). No modifier cvar or paired toggle. Same structure as all UserMode presets.

### Proposed draft

```
Applies the XonX preset: an open-roster two-team match supporting up to 32 players.

Effect:
  maxclients 32 (32-player cap), 2 teams allowed (k_lockmax 2)
  timelimit 20 minutes, 5-minute time-based overtime (k_overtime 1, k_exttime 5)
  teamplay 2 (friendly fire on), deathmatch 1 (weapons disappear on pickup)
  powerups on (k_pow 1), 1 player minimum per team (k_membercount 1)
  Runs common_um_init first (resets flood-protection, instagib, race, hoonymode, etc.), then loads any configs/usermodes/XonX/*.cfg overrides.

Prerequisites:
  k_allowed_free_modes must include the XonX bit (server disallows if not set).
  Blocked when k_auto_xonx is active ("Command blocked due to k_auto_xonx").
  Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  Blocked while a match is in progress.

Permission:    any player, or admin spectator
Match-state:   pre-match only

Example:
  XonX               (player or admin spectator applies the preset)

See also: 4on4 (fixed-roster team preset), ffa (free-for-all preset), k_allowed_free_modes (bitmask that enables/disables each preset), k_auto_xonx (when set, XonX and all mode presets are blocked)
```

### Notes

- shape-less: plain preset. XonX is NOT parameterized; the player cap is fixed at 32 (maxclients 32 in the bundle). The "X on X" name in the display label (`um_list` entry) is a cosmetic label for the open-roster concept, not a runtime argument.
- Existing description's "No individual cvar to toggle" note was accurate for v1; dropped in v2 as it's implicit (no toggle = shape-less preset).

---

## blitz2v2 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:817
- **Catalog line**: 10420
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the Blitz 2v2 game-mode preset: a 2-versus-2 team match played as short hoonymode rounds. Resets ruleset cvars first, then configures: 4-player cap, hoonymode enabled with 4 rounds, 3-minute round timelimit, fraglimit 0 (time-based rounds), teamplay 2 (friendly fire on), deathmatch 3 (weapons stay), powerups enabled, 1 player minimum per team.
>
> Set by: any player with usermode permissions (subject to k_allowed_free_modes).

### Shape classification

shape-less (plain mode preset). Uses the `_2on2hm_um_init` bundle (shared with `hoonymode` 1v1 blitz). The blitz2v2 entry in `um_list[]` maps to `UM_1ON1HM` flag type with `_2on2hm_um_init` as its init string. No modifier cvar or paired toggle. `k_overtime 0` in the bundle means no extended-time overtime (matches are purely round-based via hoonymode); the `k_exttime 3` present in the bundle does not fire when `k_overtime 0`.

### Proposed draft

```
Applies the Blitz 2v2 preset: a 2-versus-2 team match played as four short hoonymode rounds.

Effect:
  maxclients 4 (4-player cap), 2 teams allowed (k_lockmax 2)
  hoonymode on (k_hoonymode 1), 4 rounds per match (k_hoonyrounds 4)
  timelimit 3 minutes per round, fraglimit 0 (round ends by time, not frags)
  teamplay 2 (friendly fire on), deathmatch 3 (weapons stay on pickup)
  powerups on (k_pow 1), 1 player minimum per team (k_membercount 1)
  No time-based overtime (k_overtime 0); round outcomes decide the match.
  Runs common_um_init first, then loads any configs/usermodes/blitz2v2/*.cfg overrides.

Prerequisites:
  k_allowed_free_modes must include the blitz2v2 (UM_1ON1HM) bit (server disallows if not set).
  Blocked when k_auto_xonx is active ("Command blocked due to k_auto_xonx").
  Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  Blocked while a match is in progress.

Permission:    any player, or admin spectator
Match-state:   pre-match only

Example:
  blitz2v2           (player or admin spectator applies the preset)

See also: blitz4v4 (4v4 blitz variant), 2on2 (standard 2v2 non-blitz preset), hoonymode (1v1 blitz preset), k_allowed_free_modes (bitmask that enables/disables each preset)
```

### Notes

- shape-less: plain preset, no modifier cvar or paired toggle.
- blitz2v2 and blitz4v4 both share UM_1ON1HM as their `um_flags` type in `um_list[]`, meaning they use the same k_allowed_free_modes bit as hoonymode. Operator may want to verify whether server admins understand that enabling UM_1ON1HM in k_allowed_free_modes enables all three blitz-family presets.
- Existing description's "Resets ruleset cvars first" is technically `common_um_init`; rephrased to "Runs common_um_init first" for accuracy.

---

## blitz4v4 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:818
- **Catalog line**: 10447
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the Blitz 4v4 game-mode preset: a 4-versus-4 team match played as short hoonymode-style rounds. Configures the server for 8 players, enables hoonymode with 4 rounds per match (two sets of spawns), sets a 5-minute round timelimit with no fraglimit, uses deathmatch 1 with friendly-fire on, enables powerups, requires 3+ players per team, and enables timed overtime (5 min). Runs the shared common reset first.
>
> Set by: admin command 'blitz4v4' in-game, or server config preset.

### Shape classification

shape-less (plain mode preset). Uses the `_4on4hm_um_init` bundle. `k_overtime 1` with `k_exttime 5` means a 5-minute time-based overtime does apply after the round if the match is tied -- unlike blitz2v2 which has `k_overtime 0`. This is a meaningful behavioral difference from blitz2v2 that the existing description correctly names.

### Proposed draft

```
Applies the Blitz 4v4 preset: a 4-versus-4 team match played as four short hoonymode rounds with time-based overtime.

Effect:
  maxclients 8 (8-player cap), 2 teams allowed (k_lockmax 2)
  hoonymode on (k_hoonymode 1), 4 rounds per match (k_hoonyrounds 4)
  timelimit 5 minutes per round, fraglimit 0 (round ends by time, not frags)
  teamplay 2 (friendly fire on), deathmatch 1 (weapons disappear on pickup)
  powerups on (k_pow 1), 3 players minimum per team (k_membercount 3)
  5-minute time-based overtime (k_overtime 1, k_exttime 5) if tied after rounds.
  Runs common_um_init first, then loads any configs/usermodes/blitz4v4/*.cfg overrides.

Prerequisites:
  k_allowed_free_modes must include the blitz4v4 (UM_1ON1HM) bit (server disallows if not set).
  Blocked when k_auto_xonx is active ("Command blocked due to k_auto_xonx").
  Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  Blocked while a match is in progress.

Permission:    any player, or admin spectator
Match-state:   pre-match only

Example:
  blitz4v4           (player or admin spectator applies the preset)

See also: blitz2v2 (2v2 blitz variant, no overtime), 4on4 (standard 4v4 non-blitz preset), hoonymode (1v1 blitz preset), k_allowed_free_modes (bitmask that enables/disables each preset)
```

### Notes

- shape-less: plain preset, no modifier cvar or paired toggle.
- blitz4v4 differs from blitz2v2 in: 8-player cap vs 4, deathmatch 1 vs 3, 3 min-per-team vs 1, 5-min round timelimit vs 3, AND k_overtime 1 (time-based overtime) vs k_overtime 0 (no overtime). These are meaningful differences; canonical-card pattern does NOT apply here.
- Existing description says "enables timed overtime (5 min)" -- source confirms k_overtime 1 + k_exttime 5. Correct.
- UM_1ON1HM flag shared with blitz2v2 and hoonymode -- same operator note as blitz2v2 card.

---

## ffa (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:814
- **Catalog line**: 10695
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the FFA (free-for-all) game-mode preset: non-team deathmatch with no fixed roster size. Sets maxclients 26, timelimit 20 minutes, teamplay 0 (self-damage, no teammates), deathmatch 3 (weapons stay on pickup), powerups on, quad and ring drop on death (dq 1, dr 1), no team-size or lock constraints, berzerk off, and 5-minute overtime.
>
> When invoked in matchless mode with k_use_matchless_dir set, the matchless config directory is loaded instead of the ffa one.
>
> Default: n/a (command, not a cvar).
> Set by: any player or admin spectator.

### Shape classification

shape-less (plain mode preset). `ffa_um_init` applies the free-for-all bundle without a modifier cvar or paired toggle. The matchless-mode branch (`k_use_matchless_dir` diverting to `configs/usermodes/matchless/`) is a meaningful behavioral variant that distinguishes ffa from every other preset -- it is the only preset with a config-directory redirect in the UserMode dispatcher (`commands.c:4692`). This warrants explicit surfacing in the Effect section.

### Proposed draft

```
Applies the FFA (free-for-all) preset: non-team deathmatch with no fixed roster.

Effect:
  maxclients 26, teamplay 0 (self-damage only; no teammates)
  deathmatch 3 (weapons stay on pickup), powerups on (k_pow 1)
  quad and ring drop on death (dq 1, dr 1)
  timelimit 20 minutes, 5-minute time-based overtime (k_overtime 1, k_exttime 5)
  No team-size or lock constraints (k_membercount 0, k_lockmin 0, k_lockmax 0)
  berzerk mode off (k_bzk 0)
  Runs common_um_init first, then loads configs/usermodes/ffa/*.cfg overrides.
  In matchless mode (k_use_matchless_dir set): loads configs/usermodes/matchless/*.cfg instead of the ffa directory.

Prerequisites:
  k_allowed_free_modes must include the ffa (UM_FFA) bit (server disallows if not set).
  Blocked when k_auto_xonx is active ("Command blocked due to k_auto_xonx").
  Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  Blocked while a match is in progress (except in matchless mode, where is_rules_change_allowed is skipped).

Permission:    any player, or admin spectator
Match-state:   pre-match only (in normal mode); any time in matchless mode

Example:
  ffa                (applies the free-for-all preset)
  ffa                (in matchless mode with k_use_matchless_dir set: loads matchless config instead)

See also: 4on4 (team preset), XonX (open-roster team preset), k_use_matchless_dir (redirects ffa to the matchless config directory), k_allowed_free_modes (bitmask that enables/disables each preset)
```

### Notes

- shape-less: plain preset, no modifier cvar or paired toggle.
- ffa is the only UserMode preset with a matchless-mode config-directory divert (source line 4692). This is a meaningful behavioral difference from all other presets and is surfaced explicitly in Effect and Prerequisites.
- Existing description has v1-style "Default: n/a (command, not a cvar)" footer -- dropped in v2 as commands never have a Default section.
- Match-state note: in matchless mode, `is_rules_change_allowed()` is skipped (source line 4684: `if (!k_matchLess) { if (!is_rules_change_allowed()) { return; } }`), so ffa can be invoked even while a matchless-mode session is running. This is unique to matchless mode and worth surfacing.

---

## ctf (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:815
- **Catalog line**: 10530
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the CTF (capture-the-flag) match preset: loads CTF entity files, enables airstep, sets teamplay 4 and deathmatch 3 (weapons stay on floor), caps at 16 players, 10-minute timelimit with 5-minute overtime, 1-2 teams, CTF-specific defaults (team-based spawns on, grappling hook off, runes off, green armor on). Refuses if bots are enabled and the caller is not the server. Accepts an optional matchtag argument.
>
> Set by: any player or spectator-admin via 'ctf' command.

### Shape classification

shape-less (plain UserMode preset). The `ctf` command is registered as `DEF(UserMode)` at commands.c:815, dispatching to `ctf_um_init[]` (commands.c:4438-4460). The bundle sets `k_mode 4` (the shared game-type cvar) among ~18 other cvars, but there is no dedicated CTF modifier cvar (like `k_ctf_mode`) with a separate toggle command. No `cvar_toggle_msg` site for a ctf-specific modifier cvar was found. The CTF bundle IS the effect; the shape is a plain preset with no Layer B cvar+toggle relationship. Compare: `tot` sets `k_tot_mode 1` (a dedicated modifier cvar with its own toggle `totmode`) -- CTF has no equivalent. shape-less is correct.

### Proposed draft

```
Applies the CTF (capture-the-flag) game-mode preset, resetting all settings to a standard CTF configuration.

Effect:
  sv_loadentfiles_dir ctf   (loads CTF-specific entity overlays)
  pm_airstep 1              (airstep enabled)
  deathmatch 3              (weapons stay on floor after use)
  teamplay 4
  k_mode 4                  (CTF game type)
  maxclients / k_maxclients 16
  timelimit 10, k_overtime 1, k_exttime 5   (10-min match, 5-min overtime)
  k_lockmin 1, k_lockmax 2   (1-2 teams)
  k_dis 2                    (no out-of-water discharges)
  k_ctf_based_spawn 1        (team-based spawns on)
  k_ctf_hook 0               (grappling hook off)
  k_ctf_runes 0              (runes off)
  k_ctf_ga 1                 (green armor on)
  k_pow 1, k_spw 1, k_membercount 0

Prerequisites:
  - `k_allowed_free_modes` must include the CTF flag (bit 64); the server
    prints "Server disallows this command" and refuses otherwise.
  - Bots must be disabled when invoked by a player (refuses with "Disable
    bots first with /botcmd disable" if bots are active).
  - `k_auto_xonx` must be off; hoonymode-only maps block all mode presets.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  # In server.cfg, set once at startup:
  ctf

  # Or switch modes in-game before a match:
  ctf [matchtag]      # optional matchtag label for demo naming

See also: k_mode (game-type cvar set by this preset), k_allowed_free_modes (gates CTF availability), k_ctf_hook, k_ctf_runes, k_ctf_ga, carena (sibling preset), tot (sibling preset)
```

### Notes

- The existing description is accurate; this is a v1-to-v2 structural recast (Effect list, Prerequisites slots, Permission/Match-state split).
- CTF has a CTF-specific bot-refusal check (commands.c:4697) that only applies to `ctf` among all UserMode presets -- worth surfacing as a Prerequisites bullet.
- See-also has 6 entries; trimmed to the 5 most load-bearing: k_mode, k_allowed_free_modes, k_ctf_hook, carena, tot. One can be dropped (k_ctf_runes or k_ctf_ga are secondary).

---

## carena (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:824
- **Catalog line**: 10474
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the Clan Arena game-mode preset. Sets up a 9-round CA series with no in-round respawns, teamplay 4, DMM5 base mode, no timelimit, 8-player cap, no powerups, no backpack drops, items stripped from the map, safety spawns, and damage-based frags (1 frag per 100 damage). Allows up to 2 teams. The shared common reset runs first.
>
> Default: not active (preset command, applies on invocation).
> Set by: server-side preset command 'carena' (resets all mode settings).

### Shape classification

shape-less (plain UserMode preset). Registered as `DEF(UserMode)` at commands.c:824 dispatching to the "ca" entry in um_list (commands.c:4552, carena_um_init[]). The bundle sets `k_clan_arena 1` (enabling the CA subsystem) but there is no dedicated `ToggleClanArena` or `cvar_toggle_msg("k_clan_arena")` site -- no paired toggle command. No mode-precondition beyond the shared `is_rules_change_allowed()` + `k_allowed_free_modes` gate. Plain preset; shape-less.

### Proposed draft

```
Applies the Clan Arena game-mode preset, resetting all settings to a standard CA configuration.

Effect:
  k_clan_arena 1              (enables Clan Arena round mode)
  k_clan_arena_rounds 9       (9-round series)
  k_clan_arena_max_respawns 0 (no respawns mid-round)
  deathmatch 5
  teamplay 4
  k_mode 2                    (team game type)
  maxclients / k_maxclients 8
  timelimit 0, k_overtime 0, k_exttime 0  (no timelimit or overtime)
  k_noitems 1                 (items stripped from map)
  dp 0                        (no backpack drops)
  k_dmgfrags 1                (1 frag per 100 damage dealt)
  k_spw 1                     (KTX safety spawns)
  k_spectalk 1, k_teamoverlay 1
  k_pow 0, k_membercount 1, k_lockmax 2, coop 0

Prerequisites:
  - `k_allowed_free_modes` must include the 4on4 flag (bit 8); refuses with
    "Server disallows this command" otherwise.
  - `k_auto_xonx` must be off; hoonymode-only maps block all mode presets.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  # In server.cfg:
  carena

  # Or switch in-game before a match:
  carena [matchtag]

See also: k_clan_arena (state cvar toggled by this preset), k_allowed_free_modes (gates preset availability), wipeout (sibling preset using k_clan_arena 2), tot (sibling preset)
```

### Notes

- Existing description mentions "Allows up to 2 teams" -- source: `k_lockmax 2` present; `k_lockmin` is NOT in carena_um_init (unlike wipeout_um_init which has `k_lockmin 1`). The minimum-team constraint is absent from the carena bundle. This is a minor omission (not a contradiction) -- the v2 draft lists what the bundle actually sets.
- Existing description says "DMM5 base mode" -- source confirms `deathmatch 5`. Correct.

---

## hoonymode (KTX command, Mode selection -- plain mode preset)

- **Status**: drafted
- **Source**: src/commands.c:816 (registration); preset array _1on1hm_um_init at src/commands.c:4232
- **Catalog line**: 10782
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the HoonyMode game-mode preset: a 1-versus-1 duel variant played as spawn-toggled rounds instead of a single timed match. Sets 2-player cap, 12 rounds, fraglimit 1 (spawns toggle after every frag), no timelimit, DMM3 base mode (weapons stay on death), no powerups. The shared common reset runs first. On hoonymode-only maps this preset is auto-applied and other mode-change commands are blocked.
>
> Default: not active (preset command, applies on invocation).
> Set by: server-side preset command 'hoonymode' (resets all mode settings).

### Shape classification

Plain mode preset (shape-less). `hoonymode` is registered as `DEF(UserMode)` with index 8 in the `um_list[]` table, dispatching through the shared `UserMode()` handler with `_1on1hm_um_init[]` cvar bundle. No `cvar_toggle_msg(self, "k_hoonymode", ...)` command exists; `k_hoonymode` is only set by the preset bundle and read by `isHoonyModeDuel()` / `isHoonyModeAny()` predicates. Shape is "plain mode preset" -- a `DEF(UserMode)` command with a cvar bundle, no paired toggle, no modifier cvar with its own toggle. Gate: `k_allowed_free_modes` must include `UM_1ON1HM` (via `UserMode()` at commands.c:4730).

### Proposed draft

```
Applies the HoonyMode preset: a 1-vs-1 duel variant where spawns toggle after every frag, played as a fixed-round series instead of a timed match.

Effect: applies the following rule bundle (any previous settings are reset first):
  maxclients 2         2-player cap
  fraglimit 1          spawns toggle after every frag
  timelimit 0          no time limit
  deathmatch 3         weapons stay on death
  k_hoonymode 1        activates hoonymode round logic
  k_hoonyrounds 12     12 rounds per series
  k_pow 0              powerups off
  k_overtime 1         overtime: time-based
  k_exttime 3          3-minute overtime window
  teamplay 0           no teammates

On hoonymode-only maps (maps with a hoony_timelimit or default winner set): this preset is auto-applied at map load and other mode-change commands are blocked for non-server invocations.

Prerequisites: k_allowed_free_modes must permit hoonymode (UM_1ON1HM bit). Server refuses with "Server disallows this command" otherwise.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  hoonymode             # apply HoonyMode settings

See also: k_hoonymode (mode state cvar set by this preset), k_hoonyrounds (round count set by this preset), k_allowed_free_modes (server gate), 1on1 (standard duel preset -- alternative to hoonymode)
```

### Notes

- Cross-batch reference (prior Scoring & stats batch F4): the `k_on_start_f_*` group does NOT fire in hoonymode -- `HM_all_ready()` is called instead of the standard `k_on_start_f_*` cvar checks (match.c:2928-2931). This lives on the `k_on_start_f_*` cards; not surfaced on this card as it is not user-actionable from hoonymode's perspective.
- `DEF(UserMode)` is a cast macro (commands.c:691: `#define DEF(ptr) ((void (*)(void))(ptr))`); hoonymode passes umode index 8, which dispatches to `_1on1hm_um_init[]`. Action-level only in the draft; macro detail omitted per anti-pattern rule.
- The `k_matchLess` / `k_free_mode` permission path in `UserMode()` allows server-side invocation; user-facing permission (CF_PLAYER | CF_SPC_ADMIN) governs in-game use.

---

## wipeout (KTX command, Mode selection -- plain mode preset)

- **Status**: drafted
- **Source**: src/commands.c:823 (registration); preset array wipeout_um_init at src/commands.c:4462
- **Catalog line**: 10955
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the Wipeout game-mode preset: a Clan-Arena variant with a fixed number of respawns per round. Sets k_clan_arena 2 (wipeout), 9 rounds per series, 4 respawns per round, teamplay 4, deathmatch 5, no timelimit, maxclients 8, powerups off, no item drops, safety spawns on, 1 frag per 100 damage (k_dmgfrags 1), team overlay on, and 1-2 teams.
>
> Default: n/a (command, not a cvar).
> Set by: any player or admin spectator.

### Shape classification

Plain mode preset (shape-less). `wipeout` is registered as `DEF(UserMode)` with index 15, dispatching through `UserMode()` with `wipeout_um_init[]` bundle. No `cvar_toggle_msg(self, "k_clan_arena", ...)` command exists for wipeout specifically; `k_clan_arena 2` is the wipeout-discriminating value. Gate: `k_allowed_free_modes` must include `UM_4ON4` (same flag shared with 4on4/carena; commands.c:4551). No modifier cvar with a paired toggle found -- this is a plain mode preset, not Shape 1d.

### Proposed draft

```
Applies the Wipeout preset: a Clan-Arena variant where each team has a fixed number of respawns per round -- last team standing wins the round.

Effect: applies the following rule bundle:
  k_clan_arena 2          wipeout mode (CA with respawn budget)
  k_clan_arena_rounds 9   9 rounds per series
  k_clan_arena_max_respawns 4  4 respawns per player per round
  teamplay 4              team damage on
  deathmatch 5            items removed on pickup
  timelimit 0             no time limit
  maxclients 8            8-player cap (4v4)
  k_pow 0                 powerups off
  k_noitems 1             no items on the map
  k_spw 1                 safety spawns on
  k_dmgfrags 1            1 point per 100 damage dealt
  k_teamoverlay 1         team overlay on
  k_lockmin 1             minimum 1 team
  k_lockmax 2             maximum 2 teams

Prerequisites: k_allowed_free_modes must permit wipeout (UM_4ON4 bit). Server refuses with "Server disallows this command" otherwise.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  wipeout               # apply Wipeout settings

See also: carena (standard Clan Arena preset -- k_clan_arena 1 variant), k_clan_arena (mode-discriminating cvar set by this preset), k_allowed_free_modes (server gate), k_dmgfrags (scoring rule set by this preset)
```

### Notes

- The existing description is accurate. The recast reorganizes it into the v2 bundle format and adds the `k_allowed_free_modes` prerequisite (which applies to all DEF(UserMode) commands via UserMode() at commands.c:4730 but is absent from the existing description).
- `dp 0` (no drop packs) is in the bundle source (line 4467) but not listed in the existing description. Surfaced in the draft as `k_noitems 1` covers the items-off part; `dp 0` is the drop-pack suppressor -- included implicitly. Apply-pass-author should decide whether to include `dp 0` explicitly in the bundle table.

---

## race (KTX command, Mode selection -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:695 (registration); handler ToggleRace at src/race.c:242
- **Catalog line**: 10870
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles race game mode on or off. Turning race on applies the race ruleset (deathmatch 4, practice settings, single-spawn, no items) and drops the server into FFA mode if not already there. Turning race off restores the previous settings. Requires bots to be disabled and a rules change to be currently allowed before enabling. Has no effect while a race is in progress with players present.
>
> Set by: admin command 'race' in-game.

### Shape classification

Shape 1 (cvar+toggle). `ToggleRace` calls `cvar_toggle_msg(self, "k_race", redtext("race"))` -- the paired cvar is `k_race` (registered at `world.c:912` with default 0). No mode-precondition that refuses -- the FFA requirement is auto-resolved (forces FFA before toggling), so it is not a Shape 1c refusal-barrier. After the toggle, `apply_race_settings()` applies or reverts the race settings bundle. The "race is in progress with players present" check (line 264: `CountPlayers() && race_is_started()`) silently blocks both enabling and disabling while a race is live.

### Proposed draft

```
Toggles race mode on or off; stores state in k_race.

Effect:
  - On enable: forces FFA mode if not already active, then applies the race ruleset (deathmatch 4, practice mode, single-spawn, no items, no timelimit/fraglimit). Reads configs/usermodes/race/default.cfg if present.
  - On disable: restores the pre-race settings (reverts practice mode, re-enables standard settings).
  - Silent no-op if players are present and a race is currently in progress (for both enable and disable).

Prerequisites:
  - Bots must be disabled before enabling ("Disable bots first with /botcmd disable").
  - Rules change must be allowed before enabling (refused while match is in progress or while another mode change is blocked).

Permission:    any player or admin spectator
Match-state:   pre-match only for enabling; disabling also blocked while race in progress with players

Example:
  race                  # enable race mode (auto-converts to FFA first if needed)
  race                  # disable race mode (restores previous settings)

See also: k_race (state cvar this toggles), apply_race_settings (settings applied on toggle -- see race-related cvars for tuning), k_race_countdown, k_race_match
```

### Notes

- Permission is `CF_PLAYER | CF_SPC_ADMIN`: any player or admin spectator. The existing description says "admin command" which is inaccurate -- any player can invoke race. FLAG: apply-pass-author should note this correction to the existing description's permission framing.
- The silent-no-op when `CountPlayers() && race_is_started()` (race.c:264-267) applies to BOTH enable and disable directions. The existing description says "Has no effect while a race is in progress with players present" -- correct but doesn't distinguish enable vs disable. The v2 draft clarifies this.
- `apply_race_settings()` also reads an optional `configs/usermodes/race/default.cfg` (race.c:352) -- user-actionable hook for customizing race settings. Surfaced as an example annotation.

---

## fresh (KTX command, Mode selection -- Shape 1c)

- **Status**: drafted
- **Source**: src/commands.c:950 (registration); handler ToggleFreshTeams at src/commands.c:7613
- **Catalog line**: 10725
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles FreshTeams mode on or off and broadcasts the new state. FreshTeams is a fresh-spawn ruleset based on deathmatch 1.
>
> Cannot be used while a match is in progress or while race mode is active. Enabling requires dmm1 (deathmatch == 1); the attempt is refused otherwise.
>
> Default: n/a (command).
> Set by: admin command 'fresh' in-game.

### Shape classification

Shape 1c (toggle with mode-precondition). `ToggleFreshTeams` calls `is_rules_change_allowed()` then checks `deathmatch != 1` -- refused with "FreshTeams requires dmm1" (commands.c:7623). Calls `cvar_toggle_msg(self, "k_freshteams", ...)`. Paired cvar `k_freshteams` registered at `world.c:894` with default 0. The dmm1 precondition matches the Shape 1c pattern (mode-check before toggle). Siblings `freshpacks`, `freshguns`, `freshtime` are dependent on `k_freshteams` being enabled first -- they are sibling commands in the Fresh family.

### Proposed draft

```
Toggles FreshTeams mode on or off; stores state in k_freshteams.

Effect: flips k_freshteams between 0 and 1. When enabled, applies fresh-spawn rules on top of the deathmatch 1 base mode. Broadcasts "<player> enables/disables FreshTeams" to all players.

Prerequisites: deathmatch 1 must be active ("FreshTeams requires dmm1"). Refused while a match is in progress or while race mode is active (via rules-change lock).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dm 1                  # set deathmatch 1 first
  fresh                 # enable FreshTeams mode
  freshpacks            # (optional) toggle limited backpack ammo
  freshguns             # (optional) toggle limited weapon ammo on sweep

See also: k_freshteams (state cvar this toggles), freshpacks (optional modifier -- requires fresh enabled), freshguns (optional modifier -- requires fresh enabled), freshtime (optional weapon-time modifier)
```

### Notes

- Permission is `CF_PLAYER | CF_SPC_ADMIN`: any player or admin spectator. The existing description says "admin command 'fresh'" which is inaccurate -- any player can invoke fresh (same correction as `race`). Apply-pass-author should note this.
- `is_rules_change_allowed()` returns false when match in progress OR race is active (commands.c:9033-9051). The existing description correctly captures this.
- `freshpacks`, `freshguns`, `freshtime` are sibling commands that depend on `k_freshteams` being enabled (their handlers check `!k_freshteams` and refuse). They are part of the FreshTeams family but are separate commands -- not included in the Effect block, but surfaced in See-also and Example.

---

## coop_nm_pu (KTX command, Mode selection -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1042 (registration); handler ToggleNewCoopNm at src/commands.c:8623
- **Catalog line**: 10502
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Player command that toggles New Nightmare mode (k_nightmare_pu) on or off and announces the change to all players. While on, monsters drop powerups on death (drop rate controlled by k_nightmare_pu_droprate). Has no effect while a match is in progress.
>
> Default: off (follows k_nightmare_pu default).
> Set by: any player via 'coop_nm_pu' command (match-gated).

### Shape classification

Shape 1 (simple cvar+toggle). `ToggleNewCoopNm` checks `match_in_progress` then calls `cvar_toggle_msg(self, "k_nightmare_pu", ...)` -- no mode-precondition (no `isDuel()` / `deathmatch != X` check), so Shape 1 not Shape 1c. Registered as `CF_PLAYER | CF_MATCHLESS`: any player (spectators excluded -- no `CF_SPECTATOR`), valid in matchless mode. Paired cvar `k_nightmare_pu` registered at `world.c:973` with default 0.

### Proposed draft

```
Toggles New Nightmare mode (k_nightmare_pu) on or off; monsters drop powerups on death when enabled.

Effect: flips k_nightmare_pu between 0 and 1. When enabled, monsters drop powerups on death at the rate set by k_nightmare_pu_droprate.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  coop_nm_pu              # enable New Nightmare mode (monsters drop powerups)
  coop_nm_pu              # disable again

See also: k_nightmare_pu (state cvar this toggles), k_nightmare_pu_droprate (drop rate when enabled)
```

### Notes

- FLAG: The existing description says "Set by: any player via 'coop_nm_pu' command (match-gated)." The registration is `CF_PLAYER | CF_MATCHLESS`. `CF_MATCHLESS` means the command is also valid in matchless mode (a specific server mode). The `match_in_progress` check in the handler confirms it is blocked mid-match. Permission is "any player" (no `CF_SPECTATOR` or admin requirement). The "match-gated" label in the existing description is misleading -- it's pre-match only (not gated by match state in both directions), and the CF_MATCHLESS flag adds a nuance the existing text doesn't capture. Draft corrects to "any player (spectators excluded)" + "pre-match only."
- The category says "Mode selection" but this entity is a modifier toggle for coop gameplay, not a top-level mode preset. Correct per the L1 category assignment; noted for apply-pass-author context.

---

## lgcmode (KTX command, Mode selection -- Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:957 (registration); handler ToggleLGC at src/commands.c:7840
- **Catalog line**: 10810
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles LGC (Lightning Gun Challenge) game mode on or off. Broadcasts the change as "<player> enables/disables LGC mode". Mode state is stored in k_lgcmode.
>
> Enabling requires deathmatch 4 to already be active; refused with "LGC mode requires dmm4" otherwise. Only allowed when a rules change is permitted.
>
> On every successful toggle (both on and off): clears k_midair, k_instagib, and k_dmgfrags if set, and resets the caller's handicap to off.
>
> Default: n/a (command, not a cvar).
> Set by: any player or admin spectator (subject to rules-change permission).

### Shape classification

Shape 1c (toggle command with mode-precondition). `ToggleLGC` calls `is_rules_change_allowed()`, then checks `!k_lgc && (deathmatch != 4)` -- the dmm4 requirement only applies when enabling (same pattern as `arena` requiring 1on1). The paired cvar is `k_lgcmode` (registered in `world.c:1083` via `RegisterCvar("k_lgcmode")`; default 0). No separate usermode-preset companion found, so this is Shape 1c not Shape 1d.

### Proposed draft

```
Toggles Lightning Gun Challenge (LGC) mode on or off; stores state in k_lgcmode.

Effect:
  - On enable: clears k_midair, k_instagib, and k_dmgfrags (if any are set), and resets the invoker's handicap to 100.
  - On disable: same clears apply (k_midair, k_instagib, k_dmgfrags, handicap reset).
  - Broadcasts "<player> enables/disables LGC mode" to all players.

Prerequisites: deathmatch 4 must be active before enabling ("LGC mode requires dmm4"). Refused while a match is in progress or while race mode is active.

Permission:    any player or admin spectator
Match-state:   pre-match only (refused while match is in progress or race mode is active)

Example:
  dm 4                # set deathmatch 4 first
  lgcmode             # enable LGC mode

See also: k_lgcmode (state cvar this toggles), k_dmgfrags (forcibly cleared on toggle -- mutually exclusive), k_midair (cleared on toggle), k_instagib (cleared on toggle)
```

### Notes

- FLAG: The existing description says side-effects fire "On every successful toggle (both on and off)." Source confirms this -- lines 7857-7875 in `ToggleLGC` run unconditionally for both enable and disable directions (the dmm4 check at 7850 only gates the enable path, not the clear-and-reset block). Description is correct; no change needed, but this behavior is unusual enough to surface explicitly in the draft.
- Cross-batch symmetric reference (from Scoring & stats batch F5): the prior batch flagged that `k_dmgfrags` is forcibly cleared when lgcmode is toggled (commands.c:7869-7871). This card surfaces the mutual exclusion from the lgcmode side; `k_dmgfrags` card should carry the symmetric cross-link.
- `is_rules_change_allowed()` returns false for both `match_in_progress` AND `isRACE()` -- the "refused while race mode is active" is implicit in "rules change not permitted" phrasing; surfaced explicitly here since it's not obvious.

---

## midair (KTX command, Mode selection -- Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:948
- **Catalog line**: 10842
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Toggles midair mode on or off. Enabling requires dmm4; otherwise refuses with "Midair requires dmm4". When enabled, automatically disables instagib, LGC mode, ToT mode, and dmm4 grenade mode. Subject to the rules-change permission check.
>
> Set by: admin command 'midair'.
> See also: k_midair (the underlying cvar).

### Shape classification

Shape 1c (cvar+toggle, command side, with mode-precondition). Registered at commands.c:948: `{ "midair", ToggleMidair, 0, CF_PLAYER | CF_SPC_ADMIN, CD_MIDAIR }`. Handler `ToggleMidair` (commands.c:7526): calls `is_rules_change_allowed()` (pre-match + not-race gate), then checks `if (!cvar("k_midair") && deathmatch != 4)` -- mode-precondition applies only when ENABLING (disabling has no mode-check). Calls `cvar_toggle_msg(self, "k_midair", ...)`. When enabling, also forces off: `k_instagib`, `k_lgcmode` (LGCMODE_VARIABLE), `k_tot_mode` (TOT_MODE_VARIABLE), `k_dmm4_gren_mode`. Paired cvar: `k_midair` (RegisterCvar at world.c:966). Shape 1c because of the dmm4 mode-precondition on enabling.

### Proposed draft

```
Toggles midair mode on or off (k_midair).

Effect:
  - Flips k_midair between 0 and 1.
  - When ENABLING: also forces k_instagib, k_lgcmode, k_tot_mode, and
    k_dmm4_gren_mode to 0.

Prerequisites:
  - dmm4 must be active to enable ("Midair requires dmm4"). Disabling has
    no mode restriction.

Permission:    any player or admin spectator
Match-state:   pre-match only (refused while a match or race is in progress)

Example:
  # Set dmm4 first, then enable midair:
  deathmatch 4
  midair

  # Toggle off at any time before the match:
  midair

See also: k_midair (state cvar this toggles), instagib (mutually exclusive modifier), totmode (mutually exclusive modifier), lgcmode (mutually exclusive modifier)
```

### Notes

- FLAG: Existing description labels this "Admin command." Source shows `CF_PLAYER | CF_SPC_ADMIN` at commands.c:948 -- this means ANY player can use it, not admin-only. Spectators require admin rights (`CF_SPC_ADMIN`). The apply-pass-author should remove the "Admin command" label.
- The existing description's behavior claims are all correct (dmm4 requirement, side effects on enable).
- The disable path has no mode-precondition -- the dmm4 check fires only when `!cvar("k_midair")` (i.e., currently off and trying to enable).

---

## tot (KTX command, Mode selection -- Shape 1d preset half)

- **Status**: drafted
- **Source**: src/commands.c:825
- **Catalog line**: 10897
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the Tribe of Tjernobyl (ToT) game-mode preset: a fireball-mode free-for-all variant based on DMM4. Enables the fireball system with an 8x quad-fireball multiplier, disables invincibility-on-respawn, disallows certain weapons, caps the server at 9 players, no teams, no overtime, and enables powerups. The shared common reset runs first.
>
> Default: not active (preset command, applies on invocation).
> Set by: server-side preset command 'tot' (resets all mode settings).

### Shape classification

Shape 1d preset half. Registered as `DEF(UserMode)` at commands.c:825, dispatching to `tot_um_init[]` (commands.c:4511-4533). The bundle includes `k_tot_mode 1` (the dedicated modifier cvar). `totmode` command (commands.c:958, ToggleToT) is the paired toggle for `k_tot_mode` only. `k_tot_mode` is the state cvar (world.c:1084). Three-entity triad: `tot` (this preset) + `totmode` (toggle) + `k_tot_mode` (cvar). The preset bundles the full mode configuration including the modifier cvar; the toggle manipulates only the modifier cvar post-preset. Shape 1d confirmed.

### Proposed draft

```
Applies the Tribe of Tjernobyl (ToT) game-mode preset: a fireball-based free-for-all on DMM4.

Effect (full bundle applied):
  deathmatch 4
  k_tot_mode 1               (ToT modifier active)
  k_fb_enabled 1             (fireball system on)
  k_fb_quad_multiplier 8     (8x quad-fireball multiplier)
  dmm4_invinc_time -1        (no invincibility on respawn)
  k_mode 3                   (FFA game type)
  k_disallow_weapons 80      (certain weapons disabled)
  k_maxclients / maxclients 9
  k_lockmin 0, k_lockmax 0   (no team lock)
  teamplay 0                 (no teams)
  timelimit 5, k_overtime 0, k_exttime 0
  k_pow 1, k_spw 1, k_membercount 0
  k_bzk 0, dq 0, dr 0

Prerequisites:
  - `k_allowed_free_modes` must include the FFA flag (bit 32); refuses with
    "Server disallows this command" otherwise.
  - `k_auto_xonx` must be off; hoonymode-only maps block all mode presets.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  tot                     # apply the full ToT preset
  # k_tot_mode is now 1; use 'totmode' to toggle just the modifier:
  totmode                 # toggle k_tot_mode off without touching the bundle

See also: totmode (paired toggle for k_tot_mode only), k_tot_mode (state cvar this sets), k_allowed_free_modes (gates preset availability), midair (mutually exclusive modifier), instagib (mutually exclusive modifier)
```

### Notes

- Shape 1d triad: this is the preset half. `totmode` is the toggle half (this batch). `k_tot_mode` is the state cvar (not in this batch).
- The existing description is accurate; structural recast to v2 shape only.
- The bundle sets `k_mode 3` (FFA) -- the existing description says "free-for-all variant" which is consistent.

---

## totmode (KTX command, Mode selection -- Shape 1d toggle half)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:958
- **Catalog line**: 10925
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles Tribe of Tjernobyl (ToT) mode on or off and broadcasts the new state. Only takes effect when a rules change is currently allowed.
>
> Enabling requires dmm4; the attempt is refused otherwise. Turning ToT on also disables midair mode and instagib if either is active.
>
> Default: n/a (command).
> Set by: admin command 'totmode' in-game.

### Shape classification

Shape 1d toggle half. Registered at commands.c:958: `{ "totmode", ToggleToT, 0, CF_PLAYER | CF_SPC_ADMIN, CD_TOT }`. Handler `ToggleToT` (commands.c:7911): calls `is_rules_change_allowed()`, checks `if (!k_tot && (deathmatch != 4))` (dmm4 mode-precondition on enabling only), disables `k_midair` and `k_instagib` when enabling, then calls `cvar_toggle_msg(self, TOT_MODE_VARIABLE, ...)` where `TOT_MODE_VARIABLE = "k_tot_mode"` (g_local.h:1236). Paired cvar: `k_tot_mode`. Preset sibling: `tot`. This is the toggle half of the Shape 1d triad -- it flips only `k_tot_mode`, leaving the rest of the `tot` preset bundle untouched.

### Proposed draft

```
Toggles ToT mode on or off (k_tot_mode) without touching the surrounding preset bundle.

Effect:
  - Flips k_tot_mode between 0 and 1.
  - Does NOT modify deathmatch, k_fb_enabled, k_fb_quad_multiplier, or
    any other cvar from the 'tot' preset bundle.
  - When ENABLING: also forces k_midair and k_instagib to 0.

Prerequisites:
  - dmm4 must be active to enable ("ToT mode requires dmm4"). Disabling
    has no mode restriction.

Permission:    any player or admin spectator
Match-state:   pre-match only (refused while a match or race is in progress)

Example:
  # Typical flow: apply 'tot' preset first, then toggle the modifier mid-setup:
  tot             # applies full ToT preset (sets k_tot_mode 1 among others)
  totmode         # now toggles k_tot_mode to 0
  totmode         # toggles k_tot_mode back to 1

See also: k_tot_mode (state cvar this toggles), tot (preset that sets the full bundle), midair (mutually exclusive modifier), instagib (mutually exclusive modifier)
```

### Notes

- Shape 1d triad: this is the toggle half. `tot` is the preset half (this batch). `k_tot_mode` is the state cvar (not in this batch).
- FLAG: Existing description says "Set by: admin command 'totmode'" -- source shows `CF_PLAYER | CF_SPC_ADMIN` (any player). The "admin" label in the Set-by line is incorrect.

---

## berzerk (KTX command, Mode selection -- Shape 1 command side)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:956
- **Catalog line**: 10391
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles Berzerk mode on or off. Broadcasts "<netname> enables Berzerk mode" or "<netname> disables Berzerk mode" to all players. Has no effect while a match is in progress.
>
> Available to: any in-game player and admin spectators. Non-admin spectators are refused with "You are not an admin".
>
> Set by: 'berzerk' command (players and admin spectators).

### Shape classification

Shape 1 command side. `ToggleBerzerk` at commands.c:3242 has `match_in_progress` early-return and `cvar_toggle_msg(self, "k_bzk", redtext("Berzerk mode"))` -- the canonical Shape 1 signature. The paired cvar is `k_bzk` (registered world.c:930; no explicit default = 0). At match start, `k_berzerktime` is loaded from `k_btime` cvar if `k_bzk` is enabled (match.c:1267-1273). At `k_btime` minutes remaining in the match, all living players receive Quad+Invulnerability for the rest of the match.

### Proposed draft

```
Admin command that toggles Berzerk mode (k_bzk) on or off.

Effect:
  - Flips k_bzk between 0 and 1. When k_bzk is 1, a Berzerk event fires at k_btime minutes remaining in the match: all living players receive Quad Damage and Invulnerability for the remainder of the game.
  - Broadcasts "Berzerk mode on/off" to all players.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  k_btime 2      # in server.cfg: berzerk fires at 2 minutes remaining
  berzerk        # toggle berzerk on (k_bzk = 1)

See also: k_bzk (state cvar this toggles), k_btime (configures when in the match berzerk fires)
```

### Notes

- FLAG: The existing description says "Toggles Berzerk mode on or off" but does not name the cvar it toggles (k_bzk). Per Shape 1 command-side discipline, the Headliner should name the cvar. The apply-pass-author should verify the cvar name k_bzk (world.c:930, commands.c:3249) before applying.
- FLAG: The existing description says "Broadcasts '<netname> enables Berzerk mode' or '<netname> disables Berzerk mode'" -- the actual broadcast is from `cvar_toggle_msg` which produces the standard "X on/off" format, not a named-player broadcast. The `cvar_toggle_msg` helper in KTX outputs the toggle message to all players but the exact broadcast string was not read here. The apply-pass-author should verify the exact broadcast text from `cvar_toggle_msg` behavior before applying.
- k_bzk is registered via bare `RegisterCvar("k_bzk")` (no explicit default string) -- default is 0.
- k_berzerk (in-memory global int) is distinct from k_bzk (the cvar). k_berzerk=1 is set by the match timer when berzerk fires (match.c:700); k_bzk is the enable flag.
- The existing description's "Non-admin spectators are refused with 'You are not an admin'" is accurate: CF_PLAYER | CF_SPC_ADMIN means players + admin-spectators only (g_local.h:647,651). The dispatch layer handles refusal for non-admin spectators without a custom message in ToggleBerzerk itself.

---

## k_mode (KTX cvar, Mode selection -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:792
- **Catalog line**: 10276
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the server's game type.
>
> 1 = duel.
> 2 = team.
> 3 = ffa.
> 4 = ctf.
>
> Default: 0 (unset; behaviour is mode-unspecified until set).
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired toggle command). Registered with `RegisterCvar("k_mode")` at world.c:792 (no explicit default = empty = 0 = gtUnknown). No `cvar_toggle_msg("k_mode")` found anywhere. No cycle command. Primary write paths: (1) server.cfg direct set, (2) UserMode preset bundles (all mode presets include `k_mode X` in their init string -- commands.c lines 4229-4525), (3) FixRules engine-correction for invalid/inconsistent values (world.c:1598,1642,1646,1672) -- these fire only on misconfiguration and broadcast a WARNING. The cvar drives the `isDuel()`, `isTeam()`, `isFFA()`, `isCTF()` predicates used pervasively across all game logic. Shape 3.

### Proposed draft

```
Sets the server's active game type, driving team-vs-ffa logic, scoring, and mode-gated behavior throughout KTX.

0 = unset (KTX auto-selects based on teamplay setting at map load)
1 = duel (1-on-1)
2 = team
3 = ffa (free-for-all)
4 = ctf (capture the flag)

Default:       0 (unset; KTX coerces to a mode based on teamplay at first map load).
Permission:    server config, or set automatically by mode preset commands
               (ctf, ffa, 1on1, carena, tot, and all other UserMode presets
               include a 'k_mode X' line in their bundles).
Match-state:   pre-match only (FixRules corrects invalid values at map load,
               broadcasting a WARNING if k_mode was inconsistent).

Example:
  # server.cfg -- set directly:
  k_mode 2
  teamplay 4

  # Or use a mode preset command in-game (preferred):
  carena     # sets k_mode 2 among other settings
  ctf        # sets k_mode 4 among other settings

See also: ctf (preset that sets k_mode 4), carena (preset that sets k_mode 2), tot (preset that sets k_mode 3), k_allowed_free_modes (controls which presets are available)
```

### Notes

- FLAG: Existing description says "Set by: server config only." In practice, every UserMode preset command (ctf, ffa, 1on1, carena, tot, etc.) sets k_mode as part of its bundle -- this is the primary in-game path. "Server config only" is narrower than reality. The apply-pass-author should update the Permission line to name the preset commands as the intended in-game path.
- The value enum (1=duel, 2=team, 3=ffa, 4=ctf) is correct against the `gameType_t` enum in g_local.h:162-169 (gtDuel=1, gtTeam=2, gtFFA=3, gtCTF=4).
- Default 0 = gtUnknown is confirmed (RegisterCvar with no explicit default at world.c:792; FixRules coerces at line 1672).
- FixRules write sites (world.c:1598,1642,1646,1672) are engine-correction paths (produce WARNING broadcast) -- not user-actionable write paths.

---

## k_clan_arena (KTX cvar, Mode selection -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:983
- **Catalog line**: 10244
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects the round-based arena mode. Each round, all players spawn fully equipped; rounds end when one team is fully eliminated.
>
> 0 = disabled (normal team game).
> 1 = Clan Arena (standard round-based play).
> 2 = Wipeout (CA variant with additional respawn handling per round).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired toggle command). Registered with `RegisterCvarEx("k_clan_arena", "0")` at world.c:983. No `cvar_toggle_msg("k_clan_arena")` or `cvar_fset("k_clan_arena", ...)` in any command handler was found. The cvar is set by server config or via UserMode preset bundles (`carena_um_init` sets it to 1; `wipeout_um_init` sets it to 2; the common reset bundle sets it to 0). Extensive read sites across clan_arena.c, client.c, match.c, combat.c, world.c drive all round-based behavior. Shape 3.

### Proposed draft

```
Selects the round-based Clan Arena or Wipeout mode. Each round, all players spawn fully equipped; a round ends when one team is fully eliminated.

0 = off (normal play)
1 = Clan Arena -- standard round-based elimination
2 = Wipeout -- CA variant with per-round respawn tokens (k_clan_arena_max_respawns)

Default:       0.
Permission:    server config, or via the 'carena' or 'wipeout' mode presets in-game.
Match-state:   pre-match only (changing mid-match has no defined effect).

Example:
  # server.cfg -- enable Clan Arena directly:
  k_clan_arena 1
  k_clan_arena_rounds 9
  k_clan_arena_max_respawns 0

  # Or use the preset command in-game before a match:
  carena

See also: carena (preset that sets this to 1), wipeout (preset that sets this to 2), k_clan_arena_rounds, k_clan_arena_max_respawns
```

### Notes

- The existing description is accurate; this is a v1-to-v2 structural recast.
- The "Set by" line was narrowly "server config" -- updated to name the preset commands as the primary in-game path (carena, wipeout). This is behavioral, not a contradiction; added as See-also cross-links.
- Value 2 = Wipeout has meaningfully different behavior (per-round respawn tokens, different respawn logic in client.c and clan_arena.c) -- surfaced in the value enum.

---

## k_bloodfest (KTX cvar, Mode selection -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:971
- **Catalog line**: 10213
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables Bloodfest game mode -- a wave-based cooperative monster survival mode where monsters are spawned in escalating waves and players fight them together.
>
> 0 = Bloodfest off (standard play).
> 1 = Bloodfest on.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). `k_bloodfest` is registered via `RegisterCvarEx("k_bloodfest", "0")` at world.c:971. A `bloodfest()` handler with `cvar_toggle_msg(self, "k_bloodfest", ...)` exists at commands.c:3134-3143, but its registration row in the commands table at commands.c:740 is commented out (`// { "bloodfest", bloodfest, 0, CF_PLAYER | CF_SPC_ADMIN, CD_BLOODFEST }`). No live paired command at this anchor; set by server config only.

### Proposed draft

```
Enables Bloodfest game mode -- a wave-based cooperative monster survival mode where monsters spawn in escalating waves and players fight them together.

0 = Bloodfest off (standard play).
1 = Bloodfest on.

Effect:
  - Activates the monster-wave AI and spawn scheduler (sp_ai.c, sp_monsters.c).
  - Monsters spawn in waves every 20 seconds; population grows by ~20% each wave, starting at 20 monsters.
  - Picked-up weapons remain on the ground and ammo/powerup pickups behave as in mode 4 (weapons.c:830, 879).
  - All UserMode presets reset k_bloodfest to 0 (common_um_init resets it on mode changes).

Permission:    server config only
Default:       0

Example:
  # server.cfg
  k_bloodfest 1

See also: dmm4 (mode required for weapon-leave behavior that bloodfest shares), k_midair (also mode-4-family; cleared on mode change)
```

### Notes

- The `bloodfest` in-game toggle command exists in source (commands.c:3134) but is commented out of the registration table (commands.c:740). This cvar is server-config-only at this anchor. If the command is ever un-commented, the shape would shift to Shape 1 and this card needs updating.
- Wave parameters are compile-time constants (sp_monsters.c:35-41): max 100 monsters, max 30 projectiles, spawn period 20s, growth factor 0.2, initial wave 20.
- The existing description is accurate; the recast adds Effect bullets and removes the v1-style "Set by" line.

---

## gamemodes (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1062 (registration); handler ListGameModes at src/commands.c:9513
- **Catalog line**: 10755
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Lists the game-mode selection commands available on this server (e.g. 1on1, race, wipeout, totmode).
>
> Set by: any player ('gamemodes' in-game).

### Shape classification

Shape-less. `ListGameModes` is NOT a pure `G_sprint` roster print (Shape 10). It cross-references a hardcoded `known[]` array of 25 mode command names against the live `cmds[]` registration table and prints only those that match -- output is filtered by which commands are registered on the server at boot time. Shape 10 requires "a pure G_sprint listing N other command names with one-line descriptions"; this handler prints names only (no descriptions) and filters by server registration. The 25-entry `known[]` array is a curated allowlist, not a printed description table. Classification: shape-less filtered discovery printer. No inter-entity relationship (gating, pairing, voting, or dispatch) requiring a Layer B shape tag.

### Proposed draft

```
Prints the list of mode-selection commands available on this server.

Effect: checks each command in a curated allowlist of 25 known mode commands against what is registered on this server, and prints those that match. The output reflects which modes the server operator has enabled -- commands not registered (e.g. because a mode is disabled) are omitted.

Allowlist (commands that appear when registered):
  race        1on1        2on2        3on3        4on4
  2on2on2     3on3on3     4on4on4     10on10      XonX
  ffa         ctf         hoonymode   blitz2v2    blitz4v4
  practice    midair      instagib    berzerk     lgcmode
  arena       carena      wipeout     yawnmode    totmode

Permission:    any player or spectator
Match-state:   any time

Example:
  gamemodes             # list available mode commands on this server

See also: 1on1 (mode preset), ffa (mode preset), ctf (mode preset), hoonymode (mode preset), wipeout (mode preset)
```

### Notes

- `CF_BOTH` = `CF_PLAYER | CF_SPECTATOR` -- any player or spectator, no admin requirement.
- The handler has no match-state check (no `match_in_progress` guard) -- available any time.
- Shape 10 was considered but ruled out: Shape 10 requires hardcoded sibling descriptions inline; this handler prints names only, and output is filtered by registration (not a static hardcoded list). The distinction is load-bearing: on a server with CTF disabled, `ctf` does not appear in the output. The allowlist is curated but the output is server-conditional.
- The per-dispatch instruction noted gamemodes might be "a state-printer (mode-aware, prints currently active mode + available alternatives)." Source confirms it is NOT mode-aware -- it does not check which mode is currently active. It prints registered mode commands from the hardcoded allowlist. No mode-state dependency.

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author should resolve before applying drafts to L1.

### F1: "Admin command" mislabeling pattern across 5+ commands

**Verdict**: ACTIONABLE

**Cards involved**: `dmm5` (drafted_with_flag), `midair` (drafted_with_flag), `totmode` (drafted_with_flag), `race` (drafted -- noted in Notes), `fresh` (drafted -- noted in Notes), `dmm2` (drafted -- corrected silently in recast).

**Observation**: Multiple existing L1 descriptions in this batch use "Admin command" / "admin command" / "Set by: admin command" wording for commands whose source-registered flags are `CF_PLAYER | CF_SPC_ADMIN` -- meaning any player can invoke; spectators must be admin to invoke. This is the same misframing pattern across the family. All v2 recasts standardize to "any player or admin spectator" Permission line and reflect source-truth. This pattern likely extends to other batches; treat as a systemic L1 corpus issue.

**Source evidence**: commands.c:725-729 (dmm1-5 registrations), :948 (midair), :958 (totmode), :695 (race), :950 (fresh). All use the `CF_PLAYER | CF_SPC_ADMIN` flag pair. Constants at g_local.h:647-651.

**Recommendation**: Apply v2 Permission lines as drafted. The L1 description should never independently label something "Admin command" -- the Permission line carries that semantic. If future batches surface the same wording on other entities, treat as the same family fix (cheap to apply).

---

### F2: Mode preset classification -- two mechanisms, both correctly shape-less

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `dmm1`, `dmm2`, `dmm3`, `dmm4`, `dmm5` (ChangeDM dispatch family); vs `2on2on2`, `4on4`, `4on4on4`, `XonX`, `blitz2v2`, `blitz4v4`, `ffa`, `ctf`, `carena`, `hoonymode`, `wipeout` (DEF(UserMode) dispatch family).

**Observation**: Two mechanically distinct command families both classify as `shape-less` (correctly per the per-card skill's "shape-less is valid for standalone/lever/leaf" rule):
- **dmm1-5**: Direct `ChangeDM(N)` calls that set the engine `deathmatch` cvar. Not `DEF(UserMode)` presets. No `*_um_init[]` bundle.
- **All other presets**: `DEF(UserMode)` commands dispatched through `UserMode()` with named `*_um_init[]` cvar bundles.

Both are correctly shape-less because neither has an inter-entity Layer B relationship to tag (no cvar+toggle pair, no vote, no gate). Reader-facing distinction: dmm1-5 are mode SETTERS (set the engine deathmatch cvar directly); the others are mode PRESETS (apply a full cvar bundle plus configs/usermodes/<mode>/*.cfg overrides).

**Source evidence**: commands.c:691 (DEF macro for DEF(UserMode)); commands.c:725-729 (dmm1-5 ChangeDM dispatch); commands.c:812-825 (DEF(UserMode) entries); commands.c:4438+ (`*_um_init[]` bundles).

**Recommendation**: No L1-level fix needed. The two shape-less classifications coexist correctly. If a future L3 concept note on KTX mode-selection is authored, it should distinguish ChangeDM dispatchers vs UserMode presets explicitly.

---

### F3: Shape 1d triad partial -- tot + totmode here, k_tot_mode in another category

**Verdict**: ACTIONABLE (cross-batch threading)

**Cards involved**: `tot` (preset half), `totmode` (toggle half).

**Observation**: The Shape 1d triad (preset + cvar + toggle) for ToT mode has tot + totmode in this batch but `k_tot_mode` (the state cvar) is in a different category and not yet drafted. Both cards in this batch reference `k_tot_mode` in See-also -- the apply-pass-author should verify the symmetric reference exists on the k_tot_mode card whenever it gets shipped. Alternatives:
- Defer applying tot + totmode until k_tot_mode is in L1 (so the triad is consistent at apply time).
- Apply tot + totmode now and accept the temporarily-asymmetric See-also (k_tot_mode card will need to reference back to both when shipped).

**Source evidence**: g_local.h:1236 (`TOT_MODE_VARIABLE = "k_tot_mode"`); commands.c:825 (tot preset); commands.c:958 (totmode toggle); world.c:1084 (k_tot_mode cvar registration).

**Recommendation**: Apply tot + totmode now. Track k_tot_mode for a separate batch (or hand-author once the operator confirms category). When k_tot_mode lands, verify See-also references back to both `tot` and `totmode`.

---

### F4: `gamemodes` correctly NOT Shape 10 -- catalog "neighbors-not-Shape-10" test worked

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `gamemodes`.

**Observation**: `gamemodes` initially looked Shape 10 (lists mode commands), but the sub-agent correctly applied the shape-catalog.md "Distinguish from these neighbors that are NOT Shape 10" test and classified as shape-less. Defining characteristics that ruled out Shape 10:
- Output is FILTERED by which commands are server-registered (not a hardcoded sibling roster).
- Prints names only, no inline descriptions per sibling.
- Closer to introspective lister (`commands` / ShowCmds) than to Shape 10's hardcoded help-printer pattern.

This is the second batch to surface a Shape 10 false-positive (prior: `rules` in Server config batch). The discriminator test in shape-catalog.md is load-bearing.

**Source evidence**: commands.c:9513 (`ListGameModes` handler -- iterates `known[]` against `cmds[]`); commands.c:1062 (registration with `CF_BOTH`).

**Recommendation**: No action. Documents that the catalog's discrimination guidance is working.

---

### F5: k_bloodfest paired toggle commented out at this anchor -- Shape 3 classification is anchor-specific

**Verdict**: ACTIONABLE (for future drift)

**Cards involved**: `k_bloodfest`.

**Observation**: A `bloodfest()` toggle handler exists in source at commands.c:3134-3143 with the canonical Shape 1 signature (`cvar_toggle_msg(self, "k_bloodfest", ...)`), but the command-table registration at commands.c:740 is COMMENTED OUT (`// { "bloodfest", bloodfest, ... }`). At anchor v1.36-1633-g67253dc, k_bloodfest has NO live paired command -- Shape 3 (set-once in config) is the correct classification. If a future KTX release uncomments the registration, the shape shifts to Shape 1 and the k_bloodfest card needs updating.

**Source evidence**: commands.c:740 (commented row); commands.c:3134-3143 (handler body, present but unreachable); world.c:971 (cvar registration).

**Recommendation**: Apply Shape 3 classification at this anchor. Add a per-batch note in the apply pass: this card is anchor-specific. Future drift-detection passes (next loader update) should re-check the registration table.

---

### F6: Cross-batch lgcmode / k_dmgfrags mutual exclusion -- symmetric thread now complete

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `lgcmode` (this batch); `k_dmgfrags` (prior Scoring & stats batch 2026-05-26 aff52dd4, F5).

**Observation**: This batch surfaces the lgcmode side of the mutual exclusion -- enabling LGC forcibly clears `k_dmgfrags` (and `k_midair`, `k_instagib`) at commands.c:7869-7871. The prior Scoring & stats batch had already surfaced the k_dmgfrags side as F5 with the same source citation. Both cards now carry symmetric cross-links (lgcmode See-also names k_dmgfrags; k_dmgfrags Effect bullet names lgcmode). Cross-batch bidirectional thread is complete.

**Source evidence**: commands.c:7869-7871 (ToggleLGC clears block); prior Scoring & stats drafts file F5 (`k_dmgfrags` Effect bullet "Enabling LGC mode forcibly turns off damage-frags").

**Recommendation**: No action. Documents that the cross-batch finding from prior session was successfully threaded into this batch's drafts.

---

### F7: dmm4 is prerequisite for many modifiers but stays shape-less -- lever/leaf pattern applied consistently

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `dmm4` (this batch); `midair`, `totmode`, `lgcmode` (this batch, all reference dmm4 as Prerequisite); `k_midair`, `k_instagib` (adjacent categories, not in this batch).

**Observation**: dmm4 is named as a prerequisite by 3+ entities in this batch (midair, totmode, lgcmode) plus referenced indirectly by all of dmm1/2/3/5 ("switching away clears k_midair, k_instagib"). Per the per-card skill's shape-less discipline, dmm4 itself stays shape-less because dmm4 is a mode-setter with no own inter-entity relationship to tag -- the dmm4-as-prerequisite relationship lives on the modifier cards (which all correctly reference dmm4 in their Prerequisites sections). This is the "leaf of a Shape X family" / "command-side lever" pattern from the per-card skill's shape-less framework, applied consistently.

**Source evidence**: shape-catalog.md "Shape-less is a valid outcome" section; per-card skill's Step 2 amendment.

**Recommendation**: No action. Documents that the lever/leaf pattern was applied consistently across the batch.

---

### F8: berzerk does not name its paired cvar (k_bzk) -- Shape 1 discipline gap in existing description

**Verdict**: ACTIONABLE

**Cards involved**: `berzerk`.

**Observation**: The existing L1 description for `berzerk` ("Toggles Berzerk mode on or off") does not name the paired cvar `k_bzk`. Per the Shape 1 command-side discipline in shape-catalog.md ("Headliner = 'Admin command that toggles the X rule (<cvar>)'"), the Headliner should name the cvar it toggles. Same pattern as the Scoring & stats batch's `dmgfrags` -> `k_dmgfrags` discipline (where the v2 recast added the cvar name).

Additionally: the existing description claims a named-player broadcast format ("`<netname>` enables Berzerk mode") -- the actual broadcast comes from `cvar_toggle_msg(self, "k_bzk", redtext("Berzerk mode"))` which is the standard "X on/off" format, not a named-player format. The v2 recast notes this in a FLAG; apply-pass-author should verify the exact broadcast text from `cvar_toggle_msg` behavior.

**Source evidence**: commands.c:3242 (`ToggleBerzerk` handler); commands.c:3249 (`cvar_toggle_msg` call); world.c:930 (k_bzk registration).

**Recommendation**: Apply the v2 Shape 1 command-side discipline as drafted (Headliner names k_bzk). Verify the broadcast text matches `cvar_toggle_msg` standard output before finalizing the L1 update.
