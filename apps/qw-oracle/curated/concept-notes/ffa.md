---
title: "FFA"
summary: "Free-for-all: no teams, everyone against everyone, most frags wins. In QuakeWorld the living form is the permanent public 'matchless' server you drop into and out of at will; the /ffa command is the secondary form, a timed FFA match on a dynamic KTX server."
slug: ffa
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-03
scope: engine-scoped
engines_covered: [ktx]

experience_group: free-for-all
kind: standalone
deathmatch_flag: 3
roster: "free-for-all, no teams (26-player cap)"
loadout: item-pickup
objective: frag-leader-at-timelimit
score_system: frags

canonical_id: ktx:game_mode:ffa
gameplay_source_id: ktx
source_ref: commands.c:4542
mode_default_init_array: ffa_um_init
wiki_status: l3-upstream
wiki_page_slug: Free_For_All
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:ffa
  - ktx:cvar:k_matchless
  - ktx:cvar:k_matchless_max_idle_time
  - ktx:cvar:k_matchless_countdown
  - ktx:cvar:k_mode
  - ktx:cvar:k_pow
  - ktx:cvar:dq
  - ktx:cvar:dr
  - ktx:cvar:k_allowed_free_modes
  - ktx:command:next_map
  - ktx:command:break
  - ktx:command:agree
  - ktx:command:mapcycle
---

## Summary

FFA -- free-for-all -- is Quake's original deathmatch: no teams, everyone against everyone, most frags wins. In QuakeWorld the living form is the permanent public **"matchless" server** -- locked to FFA and running forever, so you connect, you're in the game at once, you frag as long as you like, and you leave. It's the most common first taste of QuakeWorld. The `/ffa` *match* -- a timed FFA on a dynamic server -- also exists but is rare, mostly LAN or one-offs.

## Activate

Two ways in, by server type:

- **Public matchless FFA** -- just connect; you're dropped straight in and auto-readied, nothing to type.
- **`/ffa` match** (dynamic server) -- type `/ffa`, ready up. Pre-match only; append a tag for demo/QTV naming, e.g. `ffa EQL`.

## Basic ruleset

The `/ffa` preset (also what a matchless server runs):

- **`deathmatch 3`** -- weapons stay on the floor when picked up (the 1on1 economy, not team-DM weapon denial).
- **`teamplay 0`** -- no teams; every player is a target, and your own splash still hurts you.
- **`k_mode 3`** -- the FFA game type (1 duel, 2 teams, 3 FFA).
- **`k_pow 1`** -- powerups live.
- **`dq 1`** -- the Quad drops on death, carrying its remaining time.
- **`dr 1`** -- the Ring drops on death.
- **`maxclients 26`** -- up to 26 players in one FFA.
- **`timelimit 20`** -- 20-minute match (match form only; matchless never ends).
- **`k_exttime 5`** -- 5-minute overtime on a tie.

## How it plays

No teams means the scoreboard is raw frag count and every other player is a target. There's no friendly fire, but self-damage stays -- rocket-jumps and point-blank rockets cost you the same as in a duel. Weapons stay on the floor, so the map keeps feeding the fight rather than being something to starve.

Powerups are the currency, the Quad above all: it drops on death carrying its remaining time, so it never gets buried with a corpse -- it just changes hands. The catch is that grabbing it makes you the whole server's target, and surviving long enough to spend it, with everyone hunting you, is the hard part. Killing the Quad holder for the drop is the central scramble of any busy FFA.

The two forms differ only in how they're run:

- **Public matchless FFA** is the living form -- a server set to "matchless," permanently FFA, with no match wrapper, countdown or readying. You drop in and out; idle players get dropped to free slots. Maps follow the admin's `mapcycle`, but you're not stuck waiting it out: `next_map` (or a `break` vote) skips ahead, and anyone can propose a map by typing its name, seconded by others repeating it or typing `agree`.
- **The `/ffa` match** is the rare form: on an ordinary dynamic server, `/ffa` starts a timed FFA -- countdown, clock, FFA rules instead of teams. Mostly LAN and one-offs.

## Hosting & settings

Two things an admin sets up: a permanent public server, or the `/ffa` preset on a dynamic one.

A **permanent public (matchless) server** runs continuously and always permits FFA:

```
# server.cfg -- a permanent public FFA server
set k_matchless 1
set k_matchless_max_idle_time 120   // drop players idle this many seconds (0 = never)
```

A server with `deathmatch 0` or `coop 1` is treated as matchless automatically. While matchless, KTX forces the FFA bit on regardless of `k_allowed_free_modes`, auto-readies players on join, and runs with no start countdown unless you set `k_matchless_countdown 1`.

For the **`/ffa` preset on a dynamic server**, FFA rides on the `UM_FFA` bit, value **32** -- **shared with Tribe of Tjernobyl (`tot`)**, so the two occupy one slot in `k_allowed_free_modes`. The stock mask is `4095` (every standard mode, FFA included); set it explicitly only to restrict the server to a subset.

## See also

- The standard-game modes (`1on1`, `2on2`, `4on4`, ...) -- FFA shares the `1on1`/`2on2` `deathmatch 3` economy (weapons stay) but drops teams entirely.
- `tot` (Tribe of Tjernobyl) -- not an FFA, but it shares FFA's `UM_FFA` bit (value 32), so the one bit in `k_allowed_free_modes` opens the slot to both.
- `instagib` -- the novelty gimmick usually set up as an FFA.
- `dq` / `dr` -- the drop-on-death toggles that make the Quad and Ring FFA's currency.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including why FFA uses `deathmatch 3`.
