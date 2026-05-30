---
title: "Rocket Arena"
summary: "Rocket Arena is a 1on1 winner-stays duel: two players fight fully loaded, the winner keeps the arena, the loser drops to the back of a challenger queue, and the next in line comes in. Enable it with `/arena` while in 1on1 mode. Despite the name it is not Clan Arena (`/carena`), which is the team elimination mode."
slug: rocket-arena
topic: game-mode-reference
status: draft
authored_by: qw-oracle
scope: engine-scoped
engines_covered: [ktx]

experience_group: arena
kind: mutator
roster: "1on1, winner-stays"
loadout: full-spawn

source_ref: commands.c:971
activation_summary: "On a KTX server, set 1on1 mode first, then type `/arena` -- it toggles the `k_rocketarena` cvar and loads the Rocket Arena ruleset. Pre-match only. Not the same as `/carena` (Clan Arena)."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:arena
  - ktx:command:ra_break
  - ktx:cvar:k_rocketarena
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_defmode
related_modes:
  - {slug: ca, relation: similar-shape}
---

# Rocket Arena

## Summary

Rocket Arena is a winner-stays 1on1 duel. Two players fight in the arena fully loaded; the winner stays on, the loser drops to the back of a queue, and the next challenger spawns in. With more than two players connected it becomes a rotation -- everyone waits their turn to challenge the player who's on a streak. It is enabled with `/arena` (which toggles the `k_rocketarena` cvar) on top of 1on1 mode. The name collides with Clan Arena, but the two are unrelated: Rocket Arena is a 1on1 winner-stays duel, Clan Arena (`/carena`) is round-based team elimination.

## How it plays

Rocket Arena rides on top of 1on1 mode -- it is active only when the server is in a duel and `k_rocketarena` is set (`arena.c:132`, `isRA()` = `isDuel() && k_rocketarena`). The two active fighters spawn with the full weapon set (`setfullwep`, `arena.c`), so like the team arenas it's straight combat with no scramble for weapons; a round runs to `fraglimit 10` with no time limit.

The defining structure is the **winner-stays queue**. Each player is tagged winner, loser, or waiting. The winner of a round holds the arena; the loser is cycled out and the next person in the queue spawns in as the challenger -- the server announces "New challenger: X" to the holder and "Challenge the winner: Y" to the incoming player (`arena.c:640`). Everyone not currently fighting waits as a non-solid spectator (`ra_PutClientInServer` puts queued players in `MOVETYPE_NOCLIP` with no model). The arena seats up to ten players (`maxclients 10`), so a busy server keeps a long line of challengers cycling against whoever is hot.

The queue is actively policed so it doesn't stall on idle players. If it's your turn and you don't engage, you're warned at 60s / 30s / the final 10s and then disconnected for standing around. To step out without losing your spot in spirit, the **`ra_break`** command takes you out of the line for up to a five-minute break and puts you back when you run it again (`arena.c:811`). It's the "I need a breather, don't skip me permanently" toggle.

This is what separates Rocket Arena from Clan Arena. CA is two *teams* of up to four, every player eliminated-until-wiped each round; Rocket Arena is *one-on-one*, winner-stays, with a challenger queue. They share the "spawn loaded and fight" feel but are different modes with different commands.

## Starting a game

Rocket Arena layers on the duel, so the order matters: set **1on1 mode first**, then type **`/arena`** in the console (pre-match). `/arena` runs `ToggleArena` (`commands.c:8842`), which refuses unless you're already in duel mode ("Set 1 on 1 mode first") and then toggles `k_rocketarena`, loading `configs/usermodes/1on1/ra/default.cfg`. Run `/arena` again to toggle it back off. Do not confuse it with `/carena`, the separate Clan Arena command.

## History

The winner-stays arena is a long-standing Quake duel tradition, and QuakeWorld ran it competitively -- the UK Rocket Arena Championship is recorded on the QWiki. KTX keeps the format as the `/arena` toggle; it is a niche mode today rather than a mainline competitive format.

## Hosting & settings

Rocket Arena is **not** one of the "free modes." The `k_allowed_free_modes` bitmask gates which UserModes a player may switch to (4on4, ca, wipeout, ...); Rocket Arena is not a UserMode and has no bit there, so the bitmask neither enables nor restricts it. Availability is simpler: any KTX server sitting in 1on1 mode lets a player toggle it with `/arena` pre-match -- nothing has to be enabled server-side for it to be reachable, and the default `k_rocketarena 0` does not hide it.

To run a server that **boots straight into** Rocket Arena, make the duel the default mode and force the toggle on:

```
# server.cfg
set k_defmode 1on1     // boot into the 1on1 base (Rocket Arena needs the duel)
set k_rocketarena 1    // force Rocket Arena on
```

Setting `k_rocketarena 1` on its own is not enough: `isRA()` is `isDuel() && k_rocketarena`, so without the 1on1 base the cvar does nothing.

The ruleset KTX loads with it (`configs/usermodes/1on1/ra/default.cfg`):

- **`fraglimit 10`, `timelimit 0`** -- a round is won at 10 frags; there is no clock.
- **`k_mode 1`** -- duel mode (Rocket Arena requires it; `isRA()` is false otherwise).
- **`maxclients 10`** -- the arena plus up to eight queued challengers.

Players manage their own place in the queue with **`ra_break`** (out for a break / back in line, five-minute cap); idling through your turn disconnects you.

## See also

- `ca` (Clan Arena) -- the *team* arena, round-based elimination. Same "arena" word, different mode; `/carena`, not `/arena`. The common point of confusion.
- `1on1` -- the duel base Rocket Arena is layered on (`deathmatch 3`).
- `deathmatch-modes` -- reference for the `deathmatch` flag values.

<!-- triage notes: option-a authoring. No game_mode row exists for rocket-arena (it is registered as the `arena` command + a k_rocketarena cvar toggle, not as a UserMode the L1 extractor harvested) -- anchored on ktx:command:arena / ktx:command:ra_break / ktx:cvar:k_rocketarena in related_entities; experience_group and loadout set by hand from source. kind=mutator is honest here (k_-cvar toggle, no _um_init array), unlike dmm4. experience_group=arena: full-spawn arena combat, placed beside ca/wipeout for the user, with the 1on1-winner-stays-vs-team-elimination distinction drawn in prose; RA does NOT use k_noitems (not claimed). Re-point to a ktx:game_mode:rocket-arena row if extraction is extended to cvar-toggle modes. wiki_status l3-upstream: no gameplay-rules wiki page (UK_Rocket_Arena_Championship.json is a tournament page; the Anarena* map series is dmm4, not RA -- not used as an RA map list). Mechanics verified against KTX 1.47-2-g67253dc (arena.c, commands.c) + the in-tree RA default.cfg. -->
