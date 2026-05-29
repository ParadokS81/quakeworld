---
title: "XonX"
summary: "The flexible-roster team format -- 'X on X' for any X. It runs 4on4's weapon-control economy (deathmatch 1) but fixes no team size: a large 32-player cap lets whatever players are present form two even teams, anything up to 16-on-16. It is also the basis of the auto-XonX server feature, which picks the right format by head count automatically."
slug: XonX
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: standard-game
kind: standalone
deathmatch_flag: 1
roster: "variable (up to 16v16, 32-player cap)"
loadout: item-pickup
objective: frag-leader-at-timelimit

canonical_id: ktx:game_mode:XonX
gameplay_source_id: ktx
source_ref: commands.c:4550
mode_default_init_array: _XonX_um_init
activation_summary: "Type /XonX on a KTX server whose k_allowed_free_modes includes the UM_XONX bit (value 2048, its own bit). Pre-match only. Blocked when the server runs auto-XonX (k_auto_xonx)."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:xonx
  - ktx:cvar:k_auto_xonx
  - ktx:cvar:k_mode
  - ktx:cvar:k_pow
  - ktx:cvar:k_membercount
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: 4on4, relation: similar-shape}
  - {slug: 10on10, relation: similar-shape}
---

## Summary

XonX is the standard-game family's flexible-roster format -- "X on X" for whatever X the turnout allows. It applies the same `deathmatch 1` weapon-control economy as 4on4, but instead of fixing the roster it raises the player cap to 32 and lets the present players split into two even teams of any size, up to 16-on-16. It exists for the case where the player count does not match a fixed format, and it underpins the auto-XonX server feature that selects a format automatically.

## How it plays

Two teams, friendly fire on (`teamplay 2`), on `deathmatch 1` -- mechanically identical to 4on4, so weapons vanish on pickup and item control is the game. What makes XonX its own mode is that it does not pin the roster: the preset sets a 32-player cap and only requires one ready player per team (`k_membercount 1`), so the teams are whatever size the connected players form. In practice it plays like whichever fixed format it most resembles at the moment -- a 6on6 on XonX feels like a slightly bigger 4on4; a 14on14 feels like 10on10. Powerups are live (`k_pow 1`), matches run 20 minutes with a 5-minute overtime.

## Starting a game

On a KTX server, type `/XonX` in the console -- a pre-match action, like the fixed formats. The one difference is the auto-XonX server feature: if the server runs `k_auto_xonx`, it manages the format itself and refuses manual mode commands ("Command blocked due to k_auto_xonx"). On those servers you do not pick the mode at all -- the server sizes it to the players. See Hosting & settings.

## Maps

XonX has no fixed map set, because the right map depends on how many players show up: small turnouts play the 4on4 team maps, large ones move to the big-team maps (`death32c` and the rest of the large pool). An admin running XonX picks a map that suits the expected head count rather than a dedicated XonX rotation.

## Hosting & settings

XonX rides on the `UM_XONX` bit, value `2048` -- its own bit. On a stock KTX or nquake server `k_allowed_free_modes` defaults to `4095`, so XonX is available out of the box; set the mask explicitly only to *restrict* the server.

```
# server.cfg -- 4095 is the stock default and already allows XonX (the 2048 bit)
set k_allowed_free_modes 4095

# optional: let the server auto-pick the format by player count
set k_auto_xonx 1
```

The defining settings, applied by `/XonX`:

- **`maxclients 32`** -- the largest cap of any standard mode, allowing up to 16 players a side.
- **`deathmatch 1` / `k_mode 2` / `teamplay 2`** -- the 4on4 weapon-control economy, team mode, friendly fire on.
- **`k_membercount 1`** -- only one ready player per team, since the roster is deliberately open.
- **`timelimit 20`** with **`k_overtime 1` / `k_exttime 5`**; **`k_pow 1`** -- powerups live.

The admin-relevant feature is **`k_auto_xonx`**: with it set, the server watches the player count and switches to the appropriate format on its own, blocking manual mode commands (the other usermodes report "blocked due to k_auto_xonx" while it is active). It is how a public pickup server runs even games without anyone typing a mode command.

## See also

- `4on4` -- the fixed-roster format whose economy XonX flexes; a small XonX game is effectively a 4on4 with a different team size.
- `10on10` -- the fixed big-team mode; XonX covers the same large-roster ground when the count is not exactly ten a side.
- `deathmatch-modes` (pending) -- reference note on the `deathmatch` flag values.
