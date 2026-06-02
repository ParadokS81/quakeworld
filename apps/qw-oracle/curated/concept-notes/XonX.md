---
title: "XonX"
summary: "The flexible-roster team format -- 'X on X' for any X. It runs the weapon-control economy but fixes no team size: a 32-player cap lets the present players form two even teams, up to 16-on-16. It is also the basis of the auto-XonX server feature, which picks the format by head count automatically."
slug: XonX
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-02
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

XonX is the standard-game family's flexible-roster format -- "X on X" for whatever the turnout allows. It runs the same weapon-control economy as the fixed team modes, but instead of pinning a roster it raises the cap to 32 and lets the present players form two even teams of any size, up to 16-on-16. It also underpins `k_auto_xonx`, the server feature that picks the team size automatically. You start a game with `/XonX`.

## Activate

On a KTX server, type `/XonX` in the console; both teams ready up (`ready`) to begin. On a server running `k_auto_xonx` the server manages the format itself and refuses manual mode commands -- you do not pick the mode there (see *Hosting & settings*).

## Basic ruleset

Activating XonX applies a fixed preset:

- **`deathmatch 1`** -- weapons vanish on pickup; the weapon-control economy.
- **`teamplay 2` / `k_mode 2`** -- two teams, friendly fire on.
- **`maxclients 32`** -- up to sixteen players a side; the largest cap of any standard mode.
- **`k_pow 1`** -- powerups live.
- **`timelimit 20`**, with **`k_overtime 1` / `k_exttime 5`** -- 20-minute matches; a draw goes to a 5-minute overtime.
- **`k_membercount 1`** -- one ready player per team, since the roster is deliberately open.

## How it plays

Mechanically it is the team game with the roster unpinned: a 32-player cap and only one ready player required per team, so the teams are whatever size the connected players form. It plays like whichever fixed format it most resembles at the moment -- a 6v6 feels like a slightly bigger 4on4, a 14v14 like 10on10. It exists for when the head count does not match a fixed format.

## Maps

XonX has no fixed map set -- the right map depends on turnout: small games use the team maps, large ones move to the big-team pool (`death32c` and the rest). An admin picks a map to suit the expected head count.

## Hosting & settings

On a stock KTX or nquake server XonX is available by default -- the allow-list (`k_allowed_free_modes`) defaults to `4095`, every mode. For an XonX-only server:

```
set k_defmode XonX             // boot into XonX
set k_allowed_free_modes 2048  // allow nothing else  (default 4095 = all modes)
```

The distinctive admin feature is **`k_auto_xonx`**: with it set, the server watches the player count, switches to the appropriate format on its own, and blocks manual mode commands while active (the other usermodes report "blocked due to k_auto_xonx"). It is how a public pickup server runs even games without anyone typing a mode command.

See *server-setup* for the bitmask details.

## See also

- `10on10` -- the fixed big-team mode; XonX covers the same large-roster ground when the count is not exactly ten a side.
- `4on4` -- the fixed-roster economy XonX flexes.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values.
