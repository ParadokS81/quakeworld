---
title: "Hoonymode"
summary: "Duel variant designed to neutralise spawn-frag luck by ending every round after a single frag and rotating spawn ownership between players. A series runs until one player is at least two frags ahead with at least half the rounds played, tennis-style. Conceived by Richard 'Hoony' Sandlant for CPMA; ported to QuakeWorld by phil in 2012 and folded into KTX the same year."
slug: hoonymode
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: standalone
canonical_id: ktx:game_mode:hoonymode
gameplay_source_id: ktx
source_ref: commands.c:4544
activation_summary: "Type `/hoonymode` on KTX servers (1.37+) where `k_allowed_free_modes` includes the `UM_1ON1HM` bit (value 128) -- the same bit that enables blitz2v2 and blitz4v4. Pre-match only; on hoonymode-only maps (those with a `hoony_timelimit` or `hoony_defaultwinner` .ent field) the preset is auto-applied at map load and other mode-change commands are blocked for non-server callers."
wiki_status: hybrid
wiki_page_slug: Hoonymode
introduced_by: "Richard 'Hoony' Sandlant (concept, from CPMA); phil / quakephil (QuakeWorld port)"
introduced_in_version: "KTX 1.37 (ported 2012-04-22)"
note_anchor_version: head-g67253dc

um_internal_id: UM_1ON1HM
mode_default_init_array: _1on1hm_um_init
common_baseline_init_array: common_um_init
family_slug: hoonymode
team_count: solo
roster: "1v1"
loadout: item-pickup
items_on_map: all
respawn_behavior: instant-round-restart
objective: first-past-half-rounds-with-two-frag-lead
score_system: rounds-won
shape_facets: [duel, round_based, spawn_rotation, tennis_tiebreaker]

related_entities:
  - ktx:command:hoonymode
  - ktx:command:pickspawn
  - ktx:cvar:k_hoonymode
  - ktx:cvar:k_hoonyrounds
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_mode
  - ktx:cvar:k_overtime
  - ktx:cvar:k_exttime
related_modes:
  - {slug: blitz2v2, relation: family-cousin}
  - {slug: blitz4v4, relation: family-cousin}
  - {slug: "1on1", relation: similar-shape}

note_origin: hybrid
---

## Lead

Hoonymode is a duel mode in KTX designed to take spawn-frag luck out of duel resolution. Every round ends on a single frag, both players respawn, and after every two rounds the spawn assignments swap so each player faces the same first-spawn the opponent had. The series ends when one player is at least two frags ahead with at least half the configured rounds played (default 6 of 12) -- a tennis-style tiebreaker that lets the score run past 12 if neither side establishes the gap. The concept comes from Richard 'Hoony' Sandlant (a CPMA developer); phil ported it to QuakeWorld in 2012, and it has been a KTX preset ever since.

## How to play

Type `/hoonymode` in the console on a KTX server (1.37 or later) where `k_allowed_free_modes` includes the `UM_1ON1HM` bit (value 128). The same bit also enables `blitz2v2` and `blitz4v4`, so any server that hosts those team variants also hosts hoonymode. The command is pre-match only -- you cannot switch into hoonymode mid-game.

In warmup, use `/pickspawn` to nominate a starting spawn: stand next to the spawn point you want and run the command. Re-running `/pickspawn` from the same position rotates through nearby alternatives. If neither player nominates a spawn, the round-1 spawns are picked at random from the map's `info_player_deathmatch` points (`hoonymode.c:900`).

Some maps are authored as hoonymode-only via the `.ent` file (`hoony_timelimit` and `hoony_defaultwinner` fields, registered at `g_spawn.c:161`). On those maps the hoonymode preset is auto-applied at map load and other mode-change commands are refused for non-server callers (`commands.c:4645`).

## Rules

- **Roster**: 1v1 duel (`maxclients 2`, `k_maxclients 2`). The hoonymode round logic is gated by `isHoonyModeDuel()` (`hoonymode.c:87`) -- the duel-form behaviours described below do not apply to the team variants (blitz2v2 / blitz4v4 use the same family bit but a different rule shape).
- **Spawn loadout**: standard QuakeWorld duel start (shotgun, axe, 25 shells, 100 health, no armour). `deathmatch 3` keeps weapons on death so map control plays out normally between frags.
- **Round end**: every frag ends the round (`fraglimit 1`, `timelimit 0`). The round-end logic in `hoonymode.c:230` (`HM_next_point`) records the result and calls `EndRound`, which advances `round_number` and triggers the inter-round countdown.
- **Series length**: 12 rounds by default (`k_hoonyrounds 12`). Adjustable per-server via `k_hoonyrounds`; map authors can also override.
- **Win condition (tennis-style)**: the series ends when one player has at least `(rounds/2)+1` frags AND a frag difference of at least 2. With the default 12 rounds: first to 7 wins outright; 6-5 continues until 7-5 or 8-6; 6-4 ends immediately at the round boundary. `HM_WINNING_DIFF` is hardcoded to 2 at `hoonymode.c:37`.
- **Set point / final point announcements**: when one player needs one more frag to reach the win threshold, the inter-round HUD prints "Set point" (`match.c:1772-1781`, `HM_current_point_type` at `hoonymode.c:243`). The round-pair banner alternates between "New spawns" and "Switch spawns" so both players see whose turn it is to take the lead spawn.
- **Spawn rotation**: after every two rounds the two players' nominated spawns swap. So in a typical 12-round series each player gets six rounds on each of the two spawn sides. Spawn-nomination state is held on the player via `hoony_nomination` and persisted across the map for the duration of the match.
- **Suicides**: a self-frag ends the round but is scored as a SUICIDELOSS for the suicider and a SUICIDEWIN for the opponent (`hoonymode.c:132-139`). The opponent gets the round.
- **Overtime**: `k_overtime 1` + `k_exttime 3` -- if a regulation-time mechanism applied (only relevant when the series concludes via the timer path on team variants), the overtime window is 3 minutes. In normal duel hoonymode the series resolves on frag-difference, so the overtime cvars rarely fire.

## History

The hoonymode idea is credited in the source header to **Richard 'Hoony' Sandlant**, a CPMA developer, with the implementation thanks-list at `hoonymode.c:1-17` naming the QW developers who helped port and test it (`#qw-dev`, deurk, johnny_cz, vvd, timon, eternal, dr4ko, rusty, twitch, mushi, 23, m@tr!}{, helltiger, leopold, quark).

**phil** wrote the initial QuakeWorld port over March 2012 (the change-log comments inside `hoonymode.c` step through the implementation diary: 2012-03-02 initial code, 2012-03-13 complete rewrite, 2012-03-26 stats bugs fixed). It was merged into KTX on 2012-04-22 by Alexandre Nizoux (commit `3043a91` -- "Merged phil's hoonymod port to KTX"). A public beta-test tournament followed on 2012-05-13 (the QuakeWorld wiki has a dedicated page for it: "HoonyMode one-day beta-test tournament", won by Milton over LocKtar). KTX enabled it by default on 2014-06-22 (`fb69ce5`).

Two later waves expanded the mode: in 2016 **meag** added per-map timelimits via `.ent` files and the spawn-nomination system (`b02b4c4`, `53c9edd`); in 2017 the team-based variants (`blitz2v2` / `blitz4v4`) were added on top of the same `k_hoonymode` machinery (`d8beebe`, 2017-05-14) and were later renamed under the "Blitz" label (`363c06f`, 2020-12-18). Post-2017 commits are mostly polish: bot navigation fixes, /break behaviour in series, the rule that a one-frag lead at series end does not win (`66d49d5`, 2017-09-17).

## Server setup

Set `k_allowed_free_modes` to include the `UM_1ON1HM` bit (value 128). The same bit also enables blitz2v2 and blitz4v4; KTX does not assign a separate bit per family member (see `include/g_local.h:693-704` for the bit map). KTX 1.37 or later is required. No per-mode hosting setup is needed for standard duel maps -- hoonymode plays on any map that has at least two `info_player_deathmatch` spawns.

For map authors who want a map to default to hoonymode: set the `hoony_timelimit` or `hoony_defaultwinner` field on `worldspawn` in the `.ent` file. The preset will then auto-apply at map load and other mode-change commands will be blocked for non-server callers.

## Configuration

<!-- configuration table auto-projected from gameplay_mechanics WHERE props_json->>'initstring_array' = '_1on1hm_um_init'. The 16 mode-specific overrides applied on top of common_um_init (52 baseline cvars). Key hoonymode-only values: k_hoonymode=1 (mode discriminator throughout the round logic), k_hoonyrounds=12 (default series length), fraglimit=1 (single-frag round end), timelimit=0 (frag-based, not time-based), k_pow=0 (no powerups), teamplay=0 (duel FFA), maxclients=2, deathmatch=3 (weapons stay), k_mode=1. -->

## See also

- `blitz2v2` -- two-team variant of the same family (`UM_1ON1HM`); a 2v2 round shell wrapped around the hoonymode spawn-rotation mechanism.
- `blitz4v4` -- four-team variant; same family bit, 4v4 roster.
- `1on1` -- the standard duel preset; hoonymode's nearest sibling in shape. Hoonymode reuses the duel skeleton (maxclients 2, teamplay 0, deathmatch 3) but replaces the timelimit-and-fraglimit endgame with single-frag rounds and tennis-style series resolution.
- `/hoonymode` -- activation command (`commands.c:4544`).
- `/pickspawn` -- pre-match spawn nomination (`commands.c:1055` -> `HM_pick_spawn` at `hoonymode.c:900`).
- `k_hoonymode` -- mode-state cvar (1 = hoonymode round logic active); checked by `isHoonyModeDuel()` / `isHoonyModeAny()` / `isHoonyModeTDM()`.
- `k_hoonyrounds` -- series length; default 12.
- `k_allowed_free_modes` -- server bitmask; must include `UM_1ON1HM` (value 128) for hoonymode, blitz2v2, and blitz4v4 to be selectable.

<!-- triage notes: hybrid. Wiki page Hoonymode.json (1863 chars, boundary thin/medium) provided the Lead framing ("designed to avoid spawn fragging"), the per-round rule structure, and the tennis-style win condition; all mechanical claims verified against L1 _1on1hm_um_init rows and hoonymode.c source. Wiki's "100 health, no armor, no weapons" claim sharpened in Rules to "standard QuakeWorld duel start" since deathmatch 3 / weapons-stay applies between frags. History section drafted from KTX git log (commit dates and authors) plus the hoonymode.c header attribution to Richard 'Hoony' Sandlant; HoonyMode_one-day_beta-test_tournament.json (2012-05-13) cited for the public beta event. The Hoony.json wiki page is about a separate Australian community figure (Challenge-AU founder) and is unrelated to Richard Sandlant -- not cited. -->
