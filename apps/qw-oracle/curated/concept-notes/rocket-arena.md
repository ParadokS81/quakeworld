---
title: "Rocket Arena"
summary: "Rocket Arena is a winner-stays 1on1 duel: two players fight fully loaded, the winner keeps the arena, and the loser drops to the back of a challenger queue while the next in line rotates in. Despite the name it is not Clan Arena, which is round-based team elimination."
slug: rocket-arena
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-05
scope: engine-scoped
engines_covered: [ktx]

experience_group: arena
kind: mutator
roster: "1on1, winner-stays"
loadout: full-spawn

source_ref: commands.c:971
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:arena
  - ktx:command:ra_break
  - ktx:cvar:k_rocketarena
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: ca, relation: similar-shape}
---

## Summary

Rocket Arena is a winner-stays 1on1 duel. Two players fight fully loaded; the winner holds the arena and the loser goes to the back of a challenger queue, so with several players connected it's a rolling line of challengers against whoever's on a streak. It shares Clan Arena's spawn-and-fight feel, but it's a different mode and command -- one-on-one and winner-stays, not round-based team elimination.

## Activate

Rocket Arena rides on 1on1, so it's two steps:

```
/1on1     // enter the duel base
/arena    // toggle Rocket Arena on
```

Run `/arena` again to switch it back off.

## Basic ruleset

`/arena` loads the Rocket Arena preset on top of the duel:

- **Full spawn** -- both fighters get every weapon, 100 health and 200 red armor; nothing to pick up.
- **`fraglimit 10`** -- first to 10 frags takes the arena.
- **`timelimit 0`** -- no clock; the match runs on frags alone.
- **`maxclients 10`** -- the two fighters plus up to eight queued challengers.

## Settings to tune

- **`ra_break`** -- leave the challenger queue for up to a five-minute break, and run it again to rejoin. While you're out you're warned as the timer runs down (one minute, thirty seconds, the final ten); let it expire and you're dropped from the server.

## How it plays

Rocket Arena layers on top of 1on1 -- it's live only when the server is in a duel and `k_rocketarena` is set. The two active fighters spawn on a full stack, so like the team arenas there's no scramble for weapons; every round is straight combat from an even start.

The defining structure is the **winner-stays queue**. Each player is tagged winner, loser, or waiting. The winner of a round holds the arena; the loser cycles to the back of the line and the next challenger spawns in, after a short countdown that flashes "New challenger" to the holder and "Challenge the winner" to the incoming player. Everyone not fighting waits as an invisible, free-flying spectator and can duck out of the line with `ra_break` for a breather. With a full house the arena seats ten, so a long line keeps cycling against whoever is hot, and a win with health and armor still untouched is called out as a "FLAWLESS Victory."

This is what separates Rocket Arena from Clan Arena. CA is two *teams* of up to four, every player eliminated-until-wiped each round; Rocket Arena is *one-on-one*, winner-stays, with a challenger queue. Same spawn-loaded feel, different mode and a different command.

## History

The winner-stays arena is a long-standing Quake duel tradition, and QuakeWorld ran it as a competitive format -- the QWiki records a UK Rocket Arena Championship. KTX keeps it as the `/arena` toggle; today it's a niche mode rather than a mainline competitive one.

## Hosting & settings

Rocket Arena isn't a UserMode -- it has no entry in the `k_allowed_free_modes` menu and no bit to allow or restrict, so there's nothing to enable. On any KTX server a player enters a duel and types `/arena`, which execs the shipped ruleset:

```
configs/usermodes/1on1/ra/default.cfg
```

Edit that file to change the frag or client limit. One wrinkle: `k_rocketarena` is runtime state, reset to `0` on every mode change, so Rocket Arena is a per-session toggle rather than a mode you pin in `server.cfg`.

## See also

- `ca` (Clan Arena) -- the *team* arena, round-based elimination; `/carena`, not `/arena`. The common point of confusion.
- `1on1` -- the duel base Rocket Arena layers on.
- `deathmatch-modes` -- the `deathmatch` flag reference.
