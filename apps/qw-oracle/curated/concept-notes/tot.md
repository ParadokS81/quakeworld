---
title: "Tribe of Tjernobyl"
summary: "A bot-blasting mode: you spawn fully loaded -- full stack, every weapon, infinite ammo (dmm4 never spends it) -- against a server packed with weak, shotgun-toting frogbots, and the goal is to pile up as many frags as possible in a five-minute window. Used for warmup and as a new-player playground, and as an informal benchmark (the original e1m2 challenge: 100 frags in five minutes without dying). Built in KTX by Slime in 2024."
slug: tot
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-06-04
scope: engine-scoped
engines_covered: [ktx]

experience_group: solo-pve
kind: standalone
deathmatch_flag: 4
roster: "solo or small group vs bots (9-player cap)"
loadout: full-spawn
objective: out-frag-the-bots
score_system: frags

canonical_id: ktx:game_mode:tot
gameplay_source_id: ktx
source_ref: commands.c:4553
mode_default_init_array: tot_um_init
wiki_status: hybrid
wiki_page_slug: ToT_Mode
introduced_by: "Slime (KTX, 2024)"
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:tot
  - ktx:command:totmode
  - ktx:cvar:k_tot_mode
  - ktx:cvar:k_fb_enabled
  - ktx:cvar:k_fb_skill
  - ktx:cvar:k_fb_quad_multiplier
  - ktx:cvar:k_disallow_weapons
  - ktx:cvar:k_mode
  - ktx:cvar:k_pow
related_modes:
  - {slug: bloodfest, relation: similar-shape}
---

## Summary

Tribe of Tjernobyl (ToT) is a bot-blasting mode, not a game against people: you spawn fully loaded and wade into a server packed with weak, shotgun-toting frogbots, racking up as many frags as you can before a short clock runs out. It's a warmup and a new-player playground, and doubles as a personal benchmark -- the original e1m2 challenge: 100 frags in five minutes without dying. Built in KTX by Slime in 2024. Start it with `/tot`.

## Activate

On a KTX server that allows it:

```
/tot           // applies the whole preset: dmm4 + ToT ruleset + frogbots on
botcmd fill    // add up to 8 bots
ready          // start
```

`/tot` bundles the setup; the community longhand does it step by step -- `botcmd enable`, `ffa`, `dmm4`, `/totmode`, `botcmd fill`, `ready` -- where `/totmode` is the bare ruleset toggle (it refuses unless dmm4 is set, whereas `/tot` sets dmm4 up for you).

## Basic ruleset

The `/tot` preset (`tot_um_init`):

- **`deathmatch 4`** -- you spawn dmm4-loaded: 250 health, 200 red armour, every weapon, and (dmm4 never spends ammo) effectively infinite ammo. Nothing to pick up.
- **`k_tot_mode 1`** -- the ToT ruleset.
- **`k_fb_enabled 1`** -- frogbots on; the mode is unplayable without them.
- **`k_disallow_weapons 80`** -- grenade launcher and lightning gun off by default (GL + LG; challenge configs override -- the dm4 challenge re-enables the LG).
- **`k_fb_quad_multiplier 8`** -- a bot that grabs the map Quad briefly hits at 8x, the one real threat.
- **`maxclients 9`** -- you plus up to eight bots.
- **`timelimit 5`** -- five-minute runs, no overtime.
- **`dmm4_invinc_time -1`** -- no spawn invulnerability; you're fragging from the first instant.

The bots are the opposite of you: **no armour** and low health, and though they carry the full arsenal their AI fires one weapon (the shotgun, in the standard setup). Their skill, health, weapon and break-on-death are config-driven (*Settings to tune*) and vary by server.

## Settings to tune

The matchup is the frogbot config -- tune it live with `botcmd <sub>`:

- **`botcmd fill`** -- fill the server with bots (up to eight at a time); `botcmd addbot` adds one, `botcmd enable` / `disable` gate bots on the server.
- **`botcmd skill`** -- bot difficulty (0-20, default 15). No agreed "official" skill for records, so this is the main variable when comparing runs.
- **`botcmd health`** -- bot starting health, against your 250.
- **`botcmd weapon`** -- which weapon the bots' AI fires (the shotgun in the usual ToT setup).
- **`botcmd quadmultiplier`** -- how hard a bot hits with the map Quad; tot's preset sets 8 (base default 4).
- **`botcmd breakondeath`** -- end the run the instant you die; the original e1m2 challenge rule, usually off on bigger maps.

## How it plays

ToT is a lopsided fight on purpose. You spawn fully kitted with infinite ammo and nothing to pick up; the bots are soft, shotgun-toting targets (you'll occasionally see one fire a rocket to hop out of lava, nothing more). With the server holding nine, it's you against a swarm of up to eight -- non-stop frags from the moment you spawn, no spawn invulnerability to wait out.

The point is volume: how many frags before the five-minute clock runs out. The original challenge, on **`e1m2`**, turned on break-on-death -- a single death ends the run -- and set the bar at 100 frags in five minutes without dying. Carried to bigger maps like **`dm4`** and **`dm2`** (where the lightning gun is allowed and break-on-death is usually off), runs climb into the couple-hundred range. There's no official ranking or agreed bot-skill yet, so records are informal and what makes one "count" is still argued over -- something the community expects to formalise later. The map Quad stays live, and a bot that grabs it is briefly worth respecting, but mostly ToT is what it looks like: one loaded player carving through a crowd of soft bots.

## History

ToT was built in KTX by **Slime** in 2024, who wanted a way to get back into shape after returning to the game. **Hellfire** was the Tribe of Tjernobyl's arch-rival, so Slime named the challenge bots after old Hellfire players. It was meant as an internal tool just for ToT players, but **Oddjob** began promoting it and it spread widely. It sits alongside other bot-challenge formats in the same spirit, such as the **Endif Bot Challenge**.

## Hosting & settings

**Allowing the mode.** Nothing special on a stock server -- ToT rides on the `UM_FFA` bit (value `32`), already in the default `k_allowed_free_modes 4095`, and `/tot`'s preset turns bots on for you (`k_fb_enabled 1`). Only a server that restricts the mask to a subset needs to keep the `32` bit:

```
# server.cfg -- ToT is allowed by default; set this only to RESTRICT modes
set k_allowed_free_modes 4095     // keep the 32 bit to leave ToT available
```

**Map-specific settings.** `/tot` execs configs in order -- the preset, then `configs/usermodes/tot/default.cfg`, then `configs/usermodes/tot/<mapname>.cfg` -- each overriding the last, so the per-map file wins. That's how the official challenges differ by map (break-on-death on for e1m2, off for the bigger maps):

```
# configs/usermodes/tot/e1m2.cfg -- the 100-frags-or-die challenge
set k_fb_break_on_death 1
set k_fb_skill 15
set k_fb_quad_multiplier 4

# configs/usermodes/tot/dm4.cfg -- bigger map, longer runs
set k_fb_break_on_death 0
```

Because there's no single standard, confirm skill, weapon and break-on-death before grinding a "proper" run.

## See also

- `bloodfest` -- the other solo/PvE mode, where the opponents are waves of Quake monsters rather than bots.
- `ffa` -- ToT shares its `UM_FFA` bit (value 32), so the one bit in `k_allowed_free_modes` opens the slot to both; ToT is the bots-as-opponents take on an FFA setup.
- `lgc` -- another KTX benchmark format built for self-measurement rather than a match against people.
- `botcmd` -- the frogbot control command (`fill` / `enable` / `skill` / `health` / `weapon` / `quadmultiplier` / `breakondeath`).
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including dmm4, the full-arsenal base ToT builds on.
