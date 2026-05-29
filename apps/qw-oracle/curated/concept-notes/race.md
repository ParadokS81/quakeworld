---
title: "Race"
summary: "A time-trial mode with no combat: run a fixed course of checkpoints from start to finish as fast as you can, racing the clock and the server's record table rather than other players. Movement is the whole game -- bunnyhopping and, where allowed, rocket-jumps for speed. Each map carries its own pre-built routes, and best times are saved with downloadable demos."
slug: race
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /race on a KTX server (the command matches the slug) -- it activates in prewar, loads the current map's pre-built routes, and locks the server into practice mode so you can run freely. Race rides on the UM_RACEMODE bit; bots must be disabled first. Type /race again to turn it off, or reload the map."
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

Race is QuakeWorld's time-trial mode: there is no fighting, just a fixed course laid out across the map as a start point, a finish, and a chain of checkpoints in between, and your only opponent is the clock. You run the route as fast as you can, and the server keeps a record table of the best times for each route -- complete with a downloadable demo of the record run so others can study the line. It is the home of QuakeWorld's movement community, where bunnyhopping, strafe-jumping and (where the route allows it) rocket-jumps are the entire skillset. Race runs on its own dedicated maps (`race1` through `race20`, `race32c`) and can be played alone, against the record, or head-to-head with other runners.

## How it plays

A race route is a path through the map: a **start** gate, an ordered set of **checkpoints** you must pass through in sequence, and a **finish** gate that stops the clock. The moment you cross the start your timer runs; cross the finish having hit every checkpoint and your time is recorded. Miss a checkpoint or fall off the route and the run does not count -- you cancel and start over. The whole discipline is in shaving fractions off a known line: finding the tighter corner, the faster jump, the bunnyhop chain that keeps your speed up.

Race is built on dmm4 but turns it into something unrecognizable. There are no items on the map (`k_noitems`), the server is locked into practice mode so the world never resets under you, and you respawn instantly at the start to try again. Combat is beside the point -- the only role weapons play is movement. Whether you can shoot is a per-route setting with three states: **disallowed** (pure movement, no rocket-jumping), **allowed** (the rocket launcher is available from the start for speed-boosting jumps), or **allowed after 2 seconds** (a short delay off the start before the RL frees up). A route's author picks the one that fits the course.

### Routes and records

Most popular maps ship with **pre-built routes** -- often several per map -- loaded automatically when you start race on that map. `race_route_switch` cycles between them, `race_show_route` describes the current one, and `race_show_record_details` shows who holds it. You can also build a route by hand in prewar with `race_set_start`, `race_set_checkpoint` and `race_set_finish` (and `race_del_checkpoint` / `race_route_clear` to edit), which is how new routes get authored. Routes can carry their own rules -- weapon mode, a false-start rule, a timeout -- baked into the route file.

Records are the point of the mode. `race_show_toptimes` brings up the scoreboard of best times for the current route, and `race_dl_record_demo` downloads a demo of the record run -- the canonical way to learn a map, by watching the fastest known line frame by frame. Servers can auto-record runs (`k_race_autorecord`) so a new record is always captured.

### Running solo, together, or as a match

By default several runners can be on the course **simultaneously** (`k_race_simultaneous`) -- everyone runs at once, ghosting past each other, each timed independently -- though it can be set to one-at-a-time so the stadium watches a single runner. Beyond casual record-chasing, race has a full **match mode** (`k_race_match`): a structured competition over a number of rounds (nine by default) with its own scoring. Three scoring systems are built in -- **Win Only** (one frag to the round winner, hoonymode-style), **Scaled** (a frag for finishing plus one per opponent beaten and a winner's bonus, better for groups), and **Formula1** (points by finishing position, 25/18/15/... down the field) -- chosen with `race_scoring`. A pacemaker (`race_pacemaker`) can replay a ghost to chase.

## Maps

Race is map-coupled in the strongest sense: it is played on **dedicated race maps**, not adapted arenas. The core set is the numbered series `race1` through `race20`, plus the large `race32c`, each built as a course with a natural start, a path, and a finish. Most carry one or more pre-built routes, so starting race on a race map drops you straight onto a known line. (The wider movement scene also runs sibling disciplines on their own map pools -- slide maps, trick maps -- but those are separate modes; the race pool proper is the `raceNN` series.)

## History

Race first appeared in **KTPro**, the KTX predecessor, and the concept is shared across the wider Quake family -- DeFRaG in Quake 3 and the race mode in Warsow are the best-known cousins. In QuakeWorld it grew into the movement community's home discipline and has featured in dedicated competitions such as the Slide Challenge. The KTX implementation has since grown well past the original toggle into the full routes-and-records system described above.

## Hosting & settings

Race rides on the `UM_RACEMODE` user-mode bit. Unlike the standard team modes it is not part of the default `k_allowed_free_modes` set that servers leave at `4095`; a server that wants race makes it available explicitly. Because race and bots cannot coexist, frogbots must be disabled before switching to it (`/botcmd disable`).

```
# server.cfg -- allow players to switch the server into race
# (race rides UM_RACEMODE, the 1<<31 bit -- add it to the allowed-modes mask)
set k_allowed_free_modes 2147487743
```

Activating race (`/race`) applies a hardcoded preset and locks the server into a practice/prewar state so runners can reset freely; turning it off (or reloading the map) restores normal play. The settings an admin is most likely to touch:

- **`k_race_match`** (default `0`) and **`k_race_match_rounds`** (default `9`) -- switch from open record-chasing to a structured, rounds-based match and set its length.
- **`k_race_simultaneous`** (default `1`) -- whether multiple runners share the course at once or run one at a time.
- **`k_race_scoring_system`** (default `0`) -- Win Only / Scaled / Formula1 for match mode.
- **`k_race_countdown`** -- the start countdown length (capped at a few seconds).
- **`k_race_autorecord`** and **`k_race_custom_models`** -- auto-capture record demos, and cosmetic runner models.

The route files themselves live server-side per map; the in-game `race_set_*` commands author and edit them, and the resulting routes are what `race_route_switch` cycles through.

## See also

- The movement scene's sibling disciplines -- slide and trick running -- share race's "beat the clock / beat the line" spirit but run on their own map pools and rules; race proper is the checkpoint time-trial on the `raceNN` maps.
- `race_ready` / `race_break` -- sign in and out as a runner; `race_cancel` aborts the current attempt and resets you to the start.
- `race_show_toptimes` / `race_dl_record_demo` -- the record table and the downloadable record-run demo, the heart of how race maps are learned.
- `race_route_switch` / `race_show_route` -- move between and inspect a map's pre-built routes.
- `deathmatch-modes` -- reference on the `deathmatch` flag values; race is built on dmm4 but strips it down to pure movement.
