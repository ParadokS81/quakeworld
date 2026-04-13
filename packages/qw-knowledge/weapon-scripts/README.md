# QuakeWorld Weapon Scripts

Reference for ezQuake weapon-script patterns: how players select and fire
weapons in config.cfg, the community conventions around it, and the
classification rules the slipgate-app parser applies.

Source: <https://ezquake.com/docs/weapon-scripts.html> and
`research/repos/ezquake-source/src/cl_input.c`.

## Firing mechanisms

Two top-level categories describe how a player fires a weapon:

- **Quickfire**: one physical keypress selects AND fires the weapon in a
  single action. Example: `bind q "weapon 7;+attack"`.
- **Manual**: two physical keypresses. First key selects the weapon,
  second key fires what is currently selected. Splits into two flavors:
  - **Manual-select**: press-and-release rebind. Press key1 once, then
    press key2 any time later. The select persists until another select
    overrides it.
  - **Manual-hold**: hold-modifier rebind via `+alias`/`-alias`. Hold
    key1 down while pressing key2. Releasing key1 reverts.

A single weapon can have BOTH a quickfire path and a manual path in the
same config (for example, quickfire on a dedicated key and manual-select
continues after release via a Mouse1 rebind).

## Generic vs weapon-specific fire keys

A fire key "fires what is currently selected" only if it is bound to a
generic fire command (`+attack`, `+fire`, `+fire_ar`) with NO weapon
selection attached. That makes it a **generic fire key**.

If a key is bound to a script that both selects a weapon AND fires
(e.g., `bind mouse1 +rocket` where `+rocket = "weapon 7;+attack"`), it
is a **weapon-specific fire key**. It is a quickfire path in its own
right and it does NOT act as a generic fire key for any other weapon
select - because pressing it always re-selects its own weapon first.

This distinction is critical. A config with `bind mouse1 +rocket` and
`bind q "weapon 8"` does NOT have a manual-select path for LG via
Mouse1, because Mouse1 fires RL regardless of what Q selected.

## ezQuake commands

| Command | Behavior |
|---|---|
| `impulse N` | Select weapon N. No preselect support. |
| `weapon N [N2 N3 ...]` | Select first available from list. Respects `cl_weaponpreselect`. |
| `+fire N [N2 ...]` | Quickfire: select and fire in one action. |
| `+fire_ar N [N2 ...]` | Anti-rollover quickfire. Same as `+fire` with fire-release race mitigation. |
| `weapon 10` | Rotate to next weapon in order. Not a specific-weapon bind. |
| `weapon 12` | Rotate to previous weapon in order. Not a specific-weapon bind. |

### cvars

- `cl_weaponpreselect` (0-4, default 0): 0=select immediately, 1=queue until next attack, 2=queue or select-on-attack, 3=mode 1 in DM only, 4=mode 2 in DM only.
- `cl_weaponhide` (0-2, default 0): hide weapon after firing (0=off, 1=always, 2=DM only).
- `cl_weaponhide_axe` (0|1): hide to axe instead of shotgun.
- `cl_weaponforgetorder` (0|1): persist `weapon_order` between frames.
- `w_switch` / `b_switch` (0-8): weapon auto-switch thresholds for pickups / backpack pickups.

### Impulse number to weapon

1=Axe, 2=SG, 3=SSG, 4=NG, 5=SNG, 6=GL, 7=RL, 8=LG.

## Priority chains

Two styles of "best available weapon" scripts exist in the wild:

- **Old-school** (`alias rl "impulse 6; impulse 7"`): runs sequentially.
  Last successful select wins. If both GL and RL are held, the player
  ends up on RL. If RL is missing, ends up on GL. Produces the same end
  state as a priority list for simple 2-weapon cases, but fragile for
  longer chains.
- **Modern** (`alias rl "weapon 7 6"`): the engine picks the first
  available weapon from the list. Cleaner and respects `cl_weaponpreselect`.

The classifier anchors priority chains to the FIRST weapon in the list.
A bind `bind q "weapon 7 5 3 2 1"` is classified as selecting RL; the
rest are fallbacks, not separate weapon binds.

## Non-combat patterns

These look like weapon binds to a naive parser but are not combat:

### Rocket jump

A bind whose resolved chain contains both `+attack` (or `+fire`/`+fire_ar`)
AND `+jump`. Example: `bind mouse2 "weapon 7;+attack;+jump"`. This is
movement - the player uses it to reposition, not to shoot enemies.

### Kill-me teamsay

A player selects a high-tier weapon (usually RL or LG) and announces it
in team chat so a teammate can finish them off and pick up the weapon
from the resulting backpack. Signals:

- Alias name matching `_*kill_?me` convention (`__kill_me`, `_killme`, `__kill_me_rl_check`, `.msg.kill.me.rl`, etc.).
- `say_team` message containing literal "kill me" text (after stripping QW color codes like `{&cb1a...&cfff}`).
- Selects-then-announces with no fire path.

### Pack-drop scan

Multi-weapon impulse chains (`impulse 7 8 6 5 3 5 4`) with no fire, used
to leave the player holding a specific weapon when they die. Related to
the walking-backpack problem (dropping RL is expensive; players avoid
being auto-switched into holding it when picking up ammo).

## Classification rules (summary)

The slipgate-app classifier is implemented in
`apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`. It
resolves alias chains, identifies fire keys, extracts firing paths, and
filters out non-combat patterns. See the design spec
`docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md` for
the full algorithm and rule set.

## See also

- <https://ezquake.com/docs/weapon-scripts.html> - ezQuake docs
- `research/repos/ezquake-source/src/cl_input.c` - engine implementation
- `apps/slipgate-app/docs/CFG-PARSER.md` - ezQuake config parser architecture
- `examples/` - annotated config snippets for each pattern
