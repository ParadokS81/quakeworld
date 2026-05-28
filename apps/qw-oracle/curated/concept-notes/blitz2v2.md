---
title: "Blitz 2v2"
summary: "Two-team variant of Hoonymode: the spawn-rotation duel mechanic extended to 2v2 with time-limited rounds, teamplay enabled, and powerups live on the map."
slug: blitz2v2
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: variant
canonical_id: ktx:game_mode:blitz2v2
gameplay_source_id: ktx
source_ref: commands.c:4545
activation_summary: "Type /blitz2v2 on KTX servers where k_allowed_free_modes includes the UM_1ON1HM bit (value 128) -- the same bit that enables hoonymode and blitz4v4."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc

family_slug: hoonymode
family_head_canonical_id: ktx:game_mode:hoonymode
um_internal_id: UM_1ON1HM
mode_default_init_array: _2on2hm_um_init
roster: "2v2"
family_delta: "Roster 2v2 (4 players); time-based rounds (3 min) instead of frag-based; fraglimit 0; 4 rounds per series instead of 12; teamplay 2; powerups live; overtime disabled."

related_entities:
  - ktx:command:blitz2v2
  - ktx:cvar:k_hoonymode
  - ktx:cvar:k_hoonyrounds
  - ktx:cvar:k_pow
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_mode
  - ktx:cvar:k_lockmin
related_modes:
  - {slug: hoonymode, relation: family-head}
  - {slug: blitz4v4, relation: family-member}

note_origin: synthesized
---

## Lead

Blitz 2v2 is the two-team variant of Hoonymode. It keeps the spawn-rotation structure -- players pick their spawns, rounds swap sides after every two rounds -- but recasts the duel as a team game: 2v2 rosters, 3-minute time-limited rounds, teamplay on, and powerups live. The duel's single-frag round-ender and 12-round series are replaced with a 4-round timed format. The 2v2 and 4v4 blitz variants were added by meag in 2017 and renamed from "hoonymode TDM" to "Blitz" in 2020.

## Family delta

Blitz 2v2 shares `k_hoonymode 1` and the spawn-rotation machinery with the family head, but `_2on2hm_um_init` diverges from `_1on1hm_um_init` across nine cvars -- this is not a pure roster swap:

- **Roster**: `maxclients 4` / `k_maxclients 4`. Locked to exactly two teams (`k_lockmin 1`, `k_lockmax 2`) with at least one player each (`k_membercount 1`). Hoonymode is strictly two players, no team locks.
- **Teamplay**: `teamplay 2` -- players can damage teammates (real teams, friendly fire on). Hoonymode uses `teamplay 0` (duel FFA).
- **Round end**: time-based -- `timelimit 3` (3-minute rounds), `fraglimit 0`. No single kill ends the round; the clock does. Hoonymode sets `fraglimit 1` / `timelimit 0` -- every frag ends the round immediately.
- **Series length**: `k_hoonyrounds 4` (4 rounds, 2 sets of spawn sides). Hoonymode defaults to 12 rounds with the tennis-style tiebreaker.
- **Powerups**: `k_pow 1` -- Quad, Pent, and Ring spawn on the map. Hoonymode suppresses all powerups (`k_pow 0`). Quad becomes a team map-control objective.
- **Overtime**: `k_overtime 0` -- rounds end at 3 minutes, no extension. Hoonymode has `k_overtime 1` with a 3-minute extension window (`k_exttime 3`).
- **Mode flag**: `k_mode 2` (team mode) vs `k_mode 1` (duel).

The `isHoonyModeTDM()` guard at `hoonymode.c:97` routes the spawn-rotation logic for team contexts -- both blitz2v2 and blitz4v4 go through this path.

## Configuration

```
# server.cfg
// UM_1ON1HM bit (128) -- enables hoonymode, blitz2v2, and blitz4v4
setadd k_allowed_free_modes 128
```

The cvars an admin might tune: `k_hoonyrounds` (series length; default 4) and `timelimit` (round duration; default 3 minutes). `k_pow` defaults to 1 -- set it to 0 to remove powerups, which brings the rules closer to the duel head's no-powerup model.

## See also

- `hoonymode` -- family head; 1v1 duel with frag-based rounds and 12-round tennis series
- `blitz4v4` -- sibling variant; same init structure, 4v4 roster
- `k_hoonymode` -- mode-state cvar; 1 = spawn-rotation logic active across all three family members
- `k_hoonyrounds` -- series length; default 4 for blitz2v2
- `k_allowed_free_modes` -- server bitmask; must include `UM_1ON1HM` (value 128)
