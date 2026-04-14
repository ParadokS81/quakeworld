---
id: concept:ktx_matchstart_injection
title: KTX server-injected commands
description: How KTX servers register commands on connected clients via stuffcmd, making server-owned actions look like native client commands that users can bind to keys.
tags: [ktx, ezquake, server, stuffcmd, binds]
references:
  cvars: []
  commands:
    - ktx:cmd:break
    - ktx:cmd:ready
    - ktx:cmd:next_map
    - ktx:cmd:rpickup
    - ktx:cmd:mapcycle
    - ktx:cmd:scores
  sessions:
    - session:discord:#dev-corner:2017-11-22T13:41:40.602Z
    - session:discord:#dev-corner:2017-11-22T15:13:09.829Z
  concepts:
    - concept:qw_command_vs_cvar
authored_by: ParadokS
authored_at: 2026-04-14
confidence: high
---

# KTX server-injected commands

When you connect to a QuakeWorld server running KTX, the server pushes a set of named commands onto your client using the `stuffcmd` network primitive. From your client's point of view these commands appear as if they were built-in: you can bind them to keys, type them in the console, and they work the same way a native command does. But they are not in ezQuake's source. They live in KTX's `commands.c` and only exist on your client for as long as you are connected to a KTX server.

Examples you will see in QW configs:

- `break` - match-mode command: unready / vote matchend during an organized match
- `ready` - signal to the server that you're ready to start the match
- `next_map` - vote for the next map
- `rpickup` - random team pickup (used during mix / pickup games)
- `mapcycle` - list the server's current map rotation
- `scores` - print match time and scores
- `shownick` - show a pointed player's info

These are bound in many players' configs. Without context, someone cleaning up their config sees an unresolved command and has no idea whether it is a typo, a deprecated feature, a third-party plugin, or a real thing. It is a real thing - owned by KTX, not ezQuake.

## Why this is confusing

Config debugging runs into this regularly:

- Grepping the ezQuake source for `rpickup` returns nothing. The command genuinely does not exist in ezQuake.
- In the ezQuake console, `rpickup` works when connected to a KTX server and fails otherwise. Its presence is conditional on the server.
- Config tools that only know ezQuake's command set (like naive config linters) flag these as broken binds. They are not broken; they are server-dependent.

The practical rule: if you see a command in a config that is not in ezQuake's source, and the config came from someone who plays on KTX servers, try KTX first before assuming it is a typo.

## What the community says

The `#dev-corner` Discord channel has an explicit 2017 discussion of this exact confusion. A new player asked what `rpickup` meant; core developer `meag.qw` and longtime player `ake_vader` walked through the full lifecycle:

> **ake_vader:** "generally in mix all players vote for rpickup, when it goes through everyone goes /ready and game starts"
>
> **meag.qw:** "they don't have to type `/rpickup` though? just `/agree`?"
>
> **pointed.dice:** "it also shouldnt be called rpickup, not too intuitive"
>
> **ake_vader:** "perhaps nQuake should have an rpickup bind too"

Two useful takeaways from that thread: (1) the workflow is `rpickup` -> `/agree` from every player -> `/ready` from every player -> match starts; and (2) the core devs themselves agree the name is a usability problem, and that documentation tools should surface it as KTX-specific so new players do not have to ask.

That is exactly what this concept note is for.

## Where Slipgate already handles this

`apps/slipgate-app/src/components/ConfigViewer.tsx` loads the same `ktx-commands.json` that Layer 1 imports and uses it to classify binds in the viewer. A bind to `rpickup` is tagged `KTX` and shown with the label "Command is a KTX server mod command. It is injected by the server on connect and only works when playing on a KTX server."

This concept note captures that same knowledge in a format an LLM can retrieve and cite, independent of the Slipgate UI.

## Related

See `concept:qw_command_vs_cvar` for why Quake keeps commands and cvars in separate namespaces. See also the `kb_commands` table where each of the referenced `ktx:cmd:*` rows carries its own short description.

## Known data limitation

Layer 1 imports from `packages/qw-config/src/data/ktx-commands.json`, which is produced by a pattern-based scraper of KTX's `commands.c`. Not every command registered at runtime is captured this way - only those declared in the static `cmds[]` array. Phase-2 AST-based extraction will close this gap. See spec open question #2 and `docs/layer1-category-coverage.md`.
