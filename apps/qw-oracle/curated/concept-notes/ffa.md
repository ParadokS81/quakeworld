---
title: "FFA"
summary: "Free-for-all: no teams, everyone against everyone, most frags wins. In QuakeWorld the living form is the permanent public 'matchless' server you drop into and out of at will; the /ffa command is the secondary form, starting a timed FFA match on a dynamic KTX server."
slug: ffa
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Play public FFA by connecting to a matchless FFA server -- you join straight into the game, no readying up. To start an FFA match on a dynamic KTX server, type /ffa (the command matches the slug); FFA rides on the UM_FFA bit (value 32), shared with Tribe of Tjernobyl (tot). Pre-match only."
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

FFA -- free-for-all -- is Quake's original deathmatch: no teams, everyone against everyone, and whoever has the most frags is winning. In QuakeWorld the living form is the permanent **public "matchless" server** -- a server locked to FFA that simply runs forever, so you connect, you are in the game immediately, you frag for as long as you like, and you leave. Because joining is the only thing you have to do, this is the most common first experience a new player has of QuakeWorld. The `/ffa` *match* (a timed FFA on a dynamic server) also exists but is rarely used -- mostly at LAN events or the occasional one-off.

## How it plays

There are no teams, so every other player on the server is a target and the scoreboard is just raw frag count. Friendly fire never enters into it (`teamplay 0`), but the flip side does: your own splash damage still hurts you, so rocket-jumping and point-blank rockets cost you health the same as in a duel. Weapons stay on the floor after they are picked up (`deathmatch 3`, the same economy as 1on1, not the weapon-denial rules of team deathmatch), so the map keeps feeding an ongoing fight rather than being something to control and starve.

Powerups are the currency of an FFA, and the Quad above all. The Quad, Ring and Pentagram are all live (`k_pow 1`), and -- unlike a normal game -- a powerup **drops when its holder dies** (`dq 1` / `dr 1`), carrying its remaining time with it. Because the Quad always drops, it never leaves play; it just changes hands. The catch is that picking it up makes you the whole server's target, and with everyone hunting you at once, surviving long enough to spend it is the hard part. Killing the Quad holder to grab the drop is the central scramble of any busy FFA. The public matchless form never ends -- the frag count just rolls on; the rare match form ends on the clock (20-minute default, 5-minute overtime on a tie).

The two forms differ only in how they are run, not in how they play:

- **Public matchless FFA** is the common, living form. A dedicated server is set to "matchless" and permanently allows FFA: there is no match wrapper, no countdown and no readying up -- you join straight into the action. To keep slots open on a busy public box, players who sit idle too long are dropped. The map rotation is the admin's `mapcycle`, but players are not stuck waiting it out: typing `next_map` (or voting `break`) skips to the next map, and anyone can propose a specific map by typing its name, which others second by typing the same name or `agree`. This is the "drop in, frag, drop out" experience most people mean by FFA.
- **The `/ffa` match** is the secondary, rarely-used form. On an ordinary dynamic KTX server -- the kind that also runs `/4on4`, `/1on1` and the rest -- `/ffa` sets up a timed FFA match: a normal match with a countdown and a 20-minute clock, just with the FFA ruleset in place of teams. In practice this is reserved for LAN events and the occasional one-off rather than everyday play.

## Starting a game

To play public FFA, just connect to a matchless FFA server. You are put straight into the game and counted as ready automatically, so there is nothing to type -- pick a weapon off the floor and go.

To start an FFA match on a dynamic server, type `/ffa` in the console. As with the other modes this only sets the match up; it does not interrupt one in progress, so it is a pre-match action. Ready up to begin. You can append a tag for demo and QTV naming, e.g. `ffa EQL`.

## Hosting & settings

There are two things an admin might set up: a permanent public FFA server, or the `/ffa` preset on a dynamic server.

**A permanent public (matchless) FFA server** is built with the matchless switch, which makes the server run continuously with no match wrapper and always permit FFA:

```
# server.cfg -- a permanent public FFA server
set k_matchless 1
set k_matchless_max_idle_time 120   // drop players idle this many seconds (0 = never)
```

A server with `deathmatch 0` or `coop 1` is treated as matchless automatically. While matchless, KTX forces the FFA bit on regardless of `k_allowed_free_modes`, players are auto-readied on join, and there is no start-of-match countdown unless you set `k_matchless_countdown 1`.

**The `/ffa` preset on a dynamic server** rides on the `UM_FFA` bit, value `32`. That bit is **shared with Tribe of Tjernobyl (`tot`)**, so the two occupy the same slot in `k_allowed_free_modes`. On a stock KTX or nquake server the mask defaults to `4095` (every standard mode, FFA included), and you set it explicitly only to *restrict* a server to a subset.

```
# server.cfg -- 4095 is the stock default and already allows FFA (the 32 bit)
set k_allowed_free_modes 4095
```

The `/ffa` preset itself sets the values that define the mode: `k_mode 3` (the FFA game type -- 1 is a duel, 2 is teams, 3 is FFA), `deathmatch 3` (weapons stay), `teamplay 0` (no teams, self-damage on), `dq 1` / `dr 1` (Quad and Ring drop on death), `k_pow 1` (powerups live), and a raised `maxclients 26` so a single FFA can hold a crowd. The full enforced settings are in the `ffa_um_init` array reachable from this note's `mode_default_init_array` pointer.

## See also

- The standard-game modes (`1on1`, `2on2`, `4on4`, ...) are the team counterparts -- FFA shares the `1on1` / `2on2` `deathmatch 3` economy (weapons stay) but drops teams entirely.
- `tot` (Tribe of Tjernobyl) -- not an FFA itself, but it occupies the same `UM_FFA` bit (value 32), so the single bit in `k_allowed_free_modes` makes the slot available to both.
- `instagib` -- the novelty gimmick set up as an FFA (a railgun imported from Quake 2/3), played casually for a few rounds rather than as a competitive format.
- `dq` / `dr` -- the drop-on-death toggles that make powerups FFA's central currency.
- `deathmatch-modes` -- reference note on the `deathmatch` flag values, including why FFA uses `deathmatch 3` (weapons stay).
