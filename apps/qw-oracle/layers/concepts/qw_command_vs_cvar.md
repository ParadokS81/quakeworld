---
id: concept:qw_command_vs_cvar
title: Commands vs cvars in QuakeWorld
description: Why QuakeWorld clients distinguish commands (actions) from cvars (state) and why both share a flat console namespace.
tags: [quakeworld, reference, console]
references:
  cvars:
    - ezquake:cvar:sensitivity
    - ezquake:cvar:cl_bob
  commands:
    - ezquake:cmd:say_team
    - ezquake:cmd:+attack
  sessions: []
  concepts:
    - concept:ktx_matchstart_injection
authored_by: ParadokS
authored_at: 2026-04-14
confidence: high
---

# Commands vs cvars in QuakeWorld

The QuakeWorld console has two kinds of identifiers sharing a single namespace: **commands** and **cvars**. Both are typed at the same prompt, both are bound to keys the same way, but they behave differently.

A **command** is an action. `say_team hi` sends a team message; `+attack` starts firing; `disconnect` leaves the server. Commands take arguments on the same line, have no persistent state, and often pair with a counterpart (e.g. `+attack` / `-attack` for press-and-release).

A **cvar** (console variable) is a value. `sensitivity 3.5` sets the mouse sensitivity; the cvar then holds that value until something else changes it. Cvars can be archived (saved across sessions), read-only, userinfo-flagged (synced to the server), or latched (applied at next map load). Setting a cvar with `set cvar_name value` auto-creates it even if the client does not recognize the name - which is how servers inject cvars via `stuffcmd`.

## Why they share a namespace

Quake's console came from Quake 1 in 1996. The flat namespace made the console simple: one parser, one input line, one keybind table that can bind any identifier to any key. Binding a key to `+attack` is the same *kind* of binding as binding a key to `echo hello world`, even though one is a command and the other is a console builtin.

This design has stuck around because configs are just sequences of console commands replayed at startup. The flat namespace means a config does not need to know whether `cl_bob` is a cvar and `say_team` is a command - it just writes `cl_bob 0.02` and `bind t "say_team "` and the console sorts it out.

## How the knowledge base handles them

For knowledge-base purposes we store them in **separate tables** (`kb_commands` and `kb_cvars`) because the schema differs - commands have no default value or type, cvars have both. Canonical ids are distinguished by the middle segment of the id:

- `ezquake:cvar:sensitivity` - a cvar
- `ezquake:cmd:say_team` - a command
- `ezquake:cmd:+attack` - a press/release action command
- `ktx:cmd:rpickup` - a server-injected command (see `concept:ktx_matchstart_injection`)

The MCP `lookup_entity` tool searches both tables by name and returns a `type: 'cvar' | 'command'` discriminator so callers do not need to know which table a result came from.

## Related

- `concept:ktx_matchstart_injection` - why some "ezQuake" commands are actually owned by KTX.
- `concept:ezquake_cvar_anatomy` - what's in a cvar row.
