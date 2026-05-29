---
title: "Tribe of Tjernobyl"
summary: "A bot-blasting mode: you spawn fully loaded -- full stack, every weapon, infinite ammo (dmm4 never spends it) -- against a server packed with weak, shotgun-only frogbots, and the goal is to pile up as many frags as possible in a five-minute window. Used for warmup and as a new-player playground, and as an informal benchmark (the original e1m2 challenge: 100 frags in five minutes without dying). Built in KTX by Slime in 2024."
slug: tot
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
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
activation_summary: "Type /tot on a KTX server to apply the full preset (dmm4, the ToT ruleset, frogbots enabled); the command's display name is Tribe of Tjernobyl. ToT rides on the UM_FFA bit (value 32), shared with ffa. Then fill the server with bots (botcmd fill) and ready up. The longhand is botcmd enable, ffa, dmm4, /totmode, botcmd fill, ready."
wiki_status: hybrid
wiki_page_slug: ToT_Mode
introduced_by: "Slime (KTX, 2024)"
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:tot
  - ktx:command:totmode
  - ktx:cvar:k_fb_enabled
  - ktx:cvar:k_fb_skill
  - ktx:cvar:k_fb_quad_multiplier
  - ktx:cvar:k_disallow_weapons
  - ktx:cvar:k_mode
  - ktx:cvar:k_pow
related_modes:
  - {slug: ffa, relation: similar-shape}
---

## Summary

Tribe of Tjernobyl -- ToT -- is a bot-blasting mode rather than a game against other people. You spawn fully kitted and wade into a server packed with weak, shotgun-only frogbots, and the goal is simply to rack up as many frags as you can before the short clock runs out. It was built in KTX by Slime in 2024 as a way to get back into shape after returning to the game, and it has two lives: a personal benchmark (how high a frag count can you hit, originally without dying) and, more commonly, a warmup and a playground -- somewhere to jump in for a few minutes of non-stop action or to let a new player just let it rip on the bots.

## How it plays

ToT is a lopsided fight on purpose. You spawn fully kitted under dmm4 rules -- 250 health, 200 red armour, and every weapon -- and dmm4 never spends ammo (firing does not decrement it), so you have infinite ammo on every gun and there is nothing on the map you need to pick up. The bots are the opposite: they spawn with only 100 health and no armour, and although they carry the full arsenal their AI sticks to the shotgun (you will occasionally see one fire a rocket to jump out of lava, nothing more). The server holds nine, so it is you against a swarm of up to eight soft, shotgun-toting targets -- non-stop frags from the moment you spawn, with no spawn invincibility to wait out.

The point is volume: how many frags can you pile up before the five-minute clock runs out. The original challenge, on `e1m2`, turned on **break-on-death** -- a single death ends your run -- and set the bar at 100 frags in five minutes without dying. Carried over to bigger maps like `dm4` and `dm2`, where the lightning gun is in play and break-on-death is usually left off, runs climb into the couple-hundred range. There is no official site, ranking, or agreed bot-skill setting yet, so records are informal and exactly what makes one "count" is still argued over -- something the community expects to formalise later, with weekly challenges and the like. The Quad is still live (a bot that grabs one briefly hits hard), but mostly ToT is exactly what it looks like: one loaded player carving through a crowd of soft bots.

## Starting a game

The quick way, on a KTX server that allows it, is to type `/tot` -- this applies the whole ToT preset in one go (it shows up as "Tribe of Tjernobyl"). Then fill the server with bots using `botcmd fill` (which adds up to eight at a time) and ready up to start.

The longhand the community documents does the same thing step by step, and is worth knowing because it shows what the preset bundles:

```
botcmd enable      // allow bots on the server
ffa                // FFA base
dmm4               // the dmm4 ruleset ToT builds on
/totmode           // turn on the ToT rules (requires dmm4)
botcmd fill        // fill the server with frogbots
ready              // start
```

`/totmode` is the bare toggle -- it just switches the ToT ruleset on (and refuses unless dmm4 is set), whereas `/tot` sets up dmm4 and the rest for you. Because there is no standardized "official" setup, check the configuration before grinding a serious run (see Hosting & settings for the bot knobs that decide the matchup -- skill, weapon set, break-on-death).

## History

ToT was created in KTX by **Slime** in 2024, who wanted a way to get back into shape after he started playing again. **Hellfire** was the Tribe of Tjernobyl's arch-rival, so Slime named the challenge bots after old Hellfire players. It was meant to be an internal tool just for ToT players, but **Oddjob** began promoting it to others and it caught on widely. It sits alongside other bot-challenge formats in the same spirit, such as the Endif Bot Challenge.

## Hosting & settings

ToT rides on the `UM_FFA` user-mode bit, value `32` -- the same bit Free-for-all uses, so the two share a slot in `k_allowed_free_modes` (which defaults to `4095` on a stock server, already including this bit). Activating it requires dmm4, and bots have to be enabled because the mode is unplayable without them.

```
# console -- the quick way
/tot            // applies the whole preset: dmm4 + ToT ruleset + frogbots on
botcmd fill     // add up to 8 bots, then ready up
```

The preset (`tot_um_init`) sets `deathmatch 4`, `k_tot_mode 1`, `k_fb_enabled 1` (frogbots on), `dmm4_invinc_time -1` (no spawn invincibility), `k_fb_quad_multiplier 8` (a bot that grabs Quad briefly hits hard), `k_disallow_weapons 80` (grenade launcher and lightning gun off by default), a 5-minute `timelimit` with no overtime, and `maxclients 9`.

The matchup itself is shaped by the frogbot knobs -- set live with `botcmd <sub>` or via the `k_fb_*` cvars -- and these are exactly what the per-map challenges tune:

- **`botcmd skill`** / **`k_fb_skill`** (default `10`) -- bot difficulty. There is no agreed "official" skill for records, so this is the main variable when comparing runs.
- **`botcmd health`** / **`k_fb_health`** (default `100`) -- bot starting health, against your 250.
- **`botcmd weapon`** / **`k_fb_weapon`** (default `2` = shotgun) -- which weapon the bots actually use.
- **`botcmd breakondeath`** / **`k_fb_break_on_death`** (default on) -- end the run the instant you die; this is the original `e1m2` challenge rule, usually switched off on the bigger maps.
- **`k_disallow_weapons`** -- the banned-weapon mask. The preset's `80` (GL + LG) is a default that challenge configs override -- the `dm4` challenge, for instance, allows the lightning gun.

The full enforced settings are in the `tot_um_init` array reachable from this note's `mode_default_init_array` pointer. Because these challenge configs are not standardized across servers, confirm the bot skill, weapon set and break-on-death before grinding a "proper" run.

## See also

- `ffa` -- ToT shares its `UM_FFA` bit (value 32), so the single bit in `k_allowed_free_modes` makes the slot available to both; ToT is the bots-as-opponents take on an FFA setup.
- `bloodfest` -- the other solo/PvE mode, where the opponents are waves of Quake monsters rather than bots.
- `lgc` -- another KTX benchmark format built for self-measurement (lightning-gun aim) rather than a match against people.
- `botcmd` -- the frogbot control command; `botcmd fill` populates the server, `botcmd enable` / `disable` gate bots on the server.
- `deathmatch-modes` -- reference on the `deathmatch` flag values, including dmm4, the full-arsenal base ToT is built on.
