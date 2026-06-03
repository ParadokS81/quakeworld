---
title: "Race"
summary: "A time-trial mode with no combat: run a fixed course of checkpoints from start to finish as fast as you can, racing the clock and the server's record table rather than other players. Movement is the whole game -- bunnyhopping and, where allowed, rocket-jumps for speed. Each map carries its own pre-built routes, and best times are saved with downloadable demos."
slug: race
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-03
scope: engine-scoped
engines_covered: [ktx]

experience_group: movement
kind: standalone
deathmatch_flag: 4
loadout: full-spawn
objective: fastest-time
score_system: time-best

canonical_id: ktx:game_mode:race
gameplay_source_id: ktx
source_ref: race.c:242
wiki_status: hybrid
wiki_page_slug: Race
introduced_in_version: "KTPro (origin)"
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:race
  - ktx:cvar:k_race
  - ktx:command:race_ready
  - ktx:command:race_cancel
  - ktx:command:race_set_start
  - ktx:command:race_set_checkpoint
  - ktx:command:race_set_finish
  - ktx:command:race_route_switch
  - ktx:command:race_set_weapon_mode
  - ktx:command:race_show_toptimes
  - ktx:command:race_dl_record_demo
  - ktx:cvar:k_race_match
  - ktx:cvar:k_race_simultaneous
  - ktx:cvar:k_race_scoring_system
  - ktx:cvar:k_race_countdown
  - ktx:cvar:k_noitems
---

## Summary

Race is QuakeWorld's time-trial mode: no fighting, just a fixed course -- a start, a finish, and a chain of checkpoints between -- run as fast as you can against the clock. The server keeps a record table for each route, complete with a downloadable demo of the best run, and movement (bunnyhopping, strafe-jumps, and where allowed rocket-jumps) is the entire skillset. It runs on dedicated race maps and can be run solo, against the record, or head-to-head. Start it with `/race`.

## Activate

On a KTX server, in prewar (bots must be off first):

```
/botcmd disable    // race and bots can't coexist
/race              // loads the current map's routes, locks the server into practice
```

`/race` again turns it off, as does reloading the map (and race clears automatically once players ready up for a match).

## Basic ruleset

Activating race applies a hardcoded preset that turns dmm4 into a movement sandbox:

- **`deathmatch 4`** -- the dmm4 base race is built on.
- **`k_noitems 1`** -- no items on the map; weapons exist only for movement.
- **`lock_practice 1`** -- the world is practice-locked, so it never resets under you and you respawn instantly to retry.
- **`timelimit 0` / `fraglimit 0`** -- no match clock or frag limit; your run timer is the only clock that matters.

## Settings to tune

Race is command-driven; the player commands, by job:

- **Run:** `race_ready` / `race_break` sign in and out as a runner; `race_cancel` aborts the current attempt and resets you to the start.
- **Routes:** `race_route_switch` cycles a map's pre-built routes and `race_show_route` describes the current one. Build one by hand in prewar with `race_set_start` / `race_set_checkpoint` / `race_set_finish` (`race_del_checkpoint` / `race_route_clear` to edit); `race_set_weapon_mode` sets whether the route allows the rocket launcher.
- **Records:** `race_show_toptimes` lists the best times; `race_show_record_details` shows who holds the route; `race_dl_record_demo` downloads a demo of the record run.
- **Session:** `race_simultaneous` toggles shared-course vs one-at-a-time; `race_match` switches to match mode; `race_scoring` cycles its scoring system; `race_pacemaker` replays a ghost to chase.

## How it plays

A route is a path through the map: a start gate, an ordered chain of checkpoints you must pass in sequence, and a finish gate that stops the clock. Cross the start and your timer runs; cross the finish having hit every checkpoint and your time is recorded. Miss a checkpoint or fall off the line and the run doesn't count -- you cancel and start over. The whole discipline is shaving fractions off a known line: the tighter corner, the faster jump, the bunnyhop chain that holds your speed.

Combat is beside the point -- the only role weapons play is movement. Whether you can shoot is a per-route setting with three states: **disallowed** (pure movement, no rocket-jumping), **allowed** (the rocket launcher is there from the start for speed-boosting jumps), or **allowed after 2 seconds** (a short delay before the RL frees up). The route's author picks the one that fits the course.

Records are the point of the mode. Most popular maps ship with several pre-built routes, loaded automatically when you start race on them, and the server keeps a scoreboard of best times per route -- each with a downloadable demo of the record run, the canonical way to learn a map by studying the fastest known line frame by frame. Servers auto-record runs by default, so a new record is always captured.

By default several runners share the course at once, ghosting past each other and timed independently; it can be set to one-at-a-time so the stadium watches a single runner. Beyond casual record-chasing, race has a full **match mode**: a structured competition over a number of rounds (nine by default) with one of three scoring systems -- **Win Only** (a single frag to the round winner, hoonymode-style), **Scaled** (a frag for finishing plus one per opponent beaten and a winner's bonus, better for groups), or **Formula1** (points by finishing position: 25/18/15/12/10 down the field).

## Maps

Race is map-coupled in the strongest sense: it plays on **dedicated race maps**, not adapted arenas. The core set is the numbered series **`race1` through `race20`**, plus the large **`race32c`**, each built as a course with a natural start, path, and finish. (The wider movement scene also runs sibling disciplines -- slide and trick maps -- on their own pools, but those are separate modes; the race pool proper is the `raceNN` series.)

## History

Race first appeared in **KTPro**, the KTX predecessor, and the idea is shared across the Quake family -- DeFRaG in Quake 3 and Warsow's race mode are the best-known cousins. In QuakeWorld it grew into the movement community's home discipline and has featured in dedicated competitions such as the **Slide Challenge**. The KTX implementation has since grown well past the original toggle into the full routes-and-records system above.

## Hosting & settings

Race rides on the `UM_RACEMODE` bit (`1<<31`). Unlike the standard team modes it isn't in the default `k_allowed_free_modes` set, so a server that wants race adds the bit explicitly; and because race and bots can't coexist, frogbots must be disabled first.

```
# server.cfg -- allow players to switch the server into race
# (UM_RACEMODE is the 1<<31 bit; 2147487743 = 4095 + that bit)
set k_allowed_free_modes 2147487743
```

Admin-side cvars worth setting (the live player toggles are in *Settings to tune*):

- **`k_race_match_rounds`** (default `9`) -- rounds in a match-mode series.
- **`k_race_countdown`** (default `2`) -- start-countdown length, in seconds.
- **`k_race_autorecord`** (default `1`) -- auto-capture a demo of each new record.
- **`k_race_custom_models`** (default `0`) -- cosmetic runner models.

The match / simultaneous / scoring defaults come from the race preset (`k_race_match 0`, `k_race_simultaneous 1`, `k_race_scoring_system 0`) and are normally flipped live via the *Settings to tune* commands rather than `server.cfg`. Route files live server-side per map; the in-game `race_set_*` commands author them.

## See also

- `dmm4` -- the full-arsenal aim base race builds on, then strips of items and combat.
- `hoonymode` -- shares race's "Win Only" round-scoring idea (one frag to the winner).
- The movement scene's sibling disciplines (slide, trick running) -- the same "beat the clock / beat the line" spirit on their own map pools; race proper is the checkpoint time-trial on the `raceNN` maps.
- `deathmatch-modes` -- reference on the `deathmatch` flag values; race is built on dmm4 but strips it to pure movement.
