---
title: "The userinfo and serverinfo protocol: how client, server, and mod share player state"
summary: "Every QuakeWorld client carries a userinfo string (name, rate, team, skin, and dozens of feature flags) and every server carries a serverinfo string (map, gamedir, server settings). The client publishes its userinfo; the dedicated server stores and guards it; and both the server engine and the mod (KTX) read it to make decisions. The key's meaning often lives in a different codebase than the one reading it -- which is why documenting these keys is a cross-engine job, not a single-codebase one."
slug: qw-userinfo-serverinfo-protocol
topic: domain-guide
status: draft
authored_by: qw-oracle
upstream_status: gap-candidate
upstream_target: new-page
primary_contributors: []
related_entities:
  - ezquake:cvar:name
  - ezquake:cvar:rate
  - ezquake:cvar:team
  - ezquake:cvar:skin
  - ezquake:cvar:topcolor
  - ezquake:cvar:bottomcolor
  - ezquake:cvar:gender
  - ezquake:cvar:msg
  - ezquake:command:setinfo
  - ezquake:command:fullinfo
  - ezquake:command:userinfo
  - mvdsv:command:serverinfo
  - mvdsv:command:localinfo
  - mvdsv:command:user
  - mvdsv:cvar:vip_values
  - mvdsv:info_key:*VIP
  - mvdsv:info_key:*gamedir
  - mvdsv:info_key:*spectator
  - mvdsv:info_key:rate
  - ktx:info_key:kf
  - ktx:info_key:wps
  - ktx:info_key:team
related_messages: []
last_updated: 2026-06-03
---

# The userinfo and serverinfo protocol: how client, server, and mod share player state

## Summary

QuakeWorld carries two shared strings. **userinfo** is per-client (`\name\Bob\team\red\rate\25000\...`) -- your settings, held by the server. **serverinfo** is one global string per server (`\map\dm3\*gamedir\ktx\...`) -- the server's settings, visible to everyone. Three parties touch the same storage: the **client** publishes its own userinfo (and reads serverinfo), the dedicated **server** (mvdsv) stores every client's userinfo, guards what may be written, and stamps server-authored `*`-keys onto it, and the **mod** (KTX) reads userinfo to drive gameplay. The load-bearing consequence for documentation: a key's *meaning* frequently lives in a different codebase than the one that *reads* it -- `rate` is defined by the ezQuake client but consumed by the server; `kf` is set by the client but defined entirely by KTX. Reading the consumer's code documents the consumer, not the key.

> Scope: this note describes the normal setup -- an ezQuake client connecting to a dedicated mvdsv server running the KTX mod. ezQuake and FTE can also host a local server (`map dm6` starts a game others can join), but that embedded server runs plain Quake, not KTX, and is meant for solo or offline play. "The server" below always means the dedicated server.

## The trio at a glance

| Party                | Role in the protocol                                                                         | Touches                                                | Via                                                  |
|----------------------|----------------------------------------------------------------------------------------------|--------------------------------------------------------|------------------------------------------------------|
| **Client** (ezQuake) | publishes its **own** userinfo; reads serverinfo                                             | `name` `rate` `team` `skin` `kf` `wps`                 | `setinfo`, or any `CVAR_USERINFO` cvar (auto-pushed) |
| **Server** (mvdsv)   | stores every client's userinfo; **guards** writes; **stamps** `*`-keys; publishes serverinfo | `rate` `password` `*VIP` `*spectator` `map` `*gamedir` | `Info_SetStar`, `Info_ValueForKey`                   |
| **Mod** (KTX)        | reads userinfo for gameplay logic                                                            | `team` `kf` `wps` `runes` `*VIP`                       | `ezinfokey` (string), `iKey` (int/bitmask)           |

A userinfo key has exactly one of two real consumers, and which one decides where its documentation belongs:

- **Engine keys** are read by the server engine for networking and connection logic (`rate`, `spectator`, `password`, `name`). Their meaning is the QW protocol's or the client cvar's.
- **Mod keys** are read by KTX for gameplay (`kf`, `wps`, `team` in clan-arena, `runes`). Their meaning is KTX's, even when the client is what sets the value.

## How it works

**Setting a key.** The client owns most of userinfo. It sets a key two ways: directly with `setinfo <key> <value>`, or implicitly by changing a `CVAR_USERINFO`-flagged cvar -- ezQuake's `name`, `rate`, `team`, `skin`, `topcolor`, `bottomcolor`, `gender`, `msg` all carry that flag, so editing the cvar auto-sends a `setinfo` to the server. `fullinfo` sets several keys at once. None of this travels to KTX directly: it goes to the dedicated server over the wire, and KTX -- which runs *inside* that server as a QVM module -- reads it back out of the server's stored copy.

**Storing and guarding it.** The server holds the authoritative copy of every client's userinfo and is the gatekeeper for what may be written. This is where the `*`-prefix rule lives: **`*`-keys are server-protected -- a client physically cannot set them.** The server writes them with dedicated setters (`Info_SetStar`, `Info_SetValueForStarKey`); the client's path (`Info_SetValueForKey`) refuses a leading `*`. So `*`-keys are the server stamping authoritative facts onto your record (`*VIP` = "this client authenticated as a VIP", `*spectator` = "this client is a spectator", `*client` = "the build string recorded at connect"). That is why, in Layer 1, mvdsv's `*`-keys show `write`/`remove` operations while KTX's show only `read` -- KTX reads what mvdsv stamped.

**Reading it.** Two consumers read the same store. The server engine reads with `Info_ValueForKey(userinfo, "key")` for its own networking decisions. KTX reads with one of two builtins: `ezinfokey(ent, "key")` for string values (`name`, `team`) and `iKey(ent, "key")` for integers and bitmasks (`kf`, `wps`). serverinfo works the same way globally: the server publishes keys like `map`, `needpass`, and `*gamedir` (e.g. `Info_SetValueForStarKey(svs.info, "*gamedir", dir, ...)` at `fs.c:561`), and connecting clients read them to learn what the server is running -- the gamedir tells the client which mod to expect and where auto-download fetches assets from.

## Worked example: `rate` (an engine key)

```
Client:  rate 30000          (CVAR_USERINFO cvar -> auto-sends "setinfo rate 30000")
mvdsv:   reads your rate, throttles how fast it streams data to you
KTX:     not involved -- this is an engine key
Result:  the server sends you at most 30000 bytes/sec
```

The common misread is that `rate` caps your *client's* bandwidth. It does not: you set the number, and the **server** reads it and limits its own stream to you. (ezQuake's help: "the maximum bytes per second that the *server* should send to the client.")

## Worked example: `*VIP` (a server-stamped star key -- the full trio)

```
Client:  spectator "<vip_pass>"   then   connect <server>     (to watch a full game)
         (or  password "<vip_pass>"   then   connect <server>  to join as a player)
mvdsv:   checks the spectator field, then password, then your IP; matches one to a
         level number, stamps  *VIP=<level>,  seats you in the extra  maxvip_spectators  pool
KTX:     reads *VIP and applies whatever perks that level grants in-game
Result:  the VIP gets a spectator slot even when "maxspectators" is full
```

The admin gives you the password (their server's `vip_password`). You put it in your `spectator` cvar to watch or your `password` cvar to play -- both are `CVAR_USERINFO`, so they ride along when you `connect`. You never set `*VIP` yourself; it is a star key the server stamps. The engine assigns the level *number*, but **KTX decides what that level grants** -- which is why `*VIP` can't be documented from any one codebase.

## Worked example: `kf` (a KTX mod key)

```
Client:  setinfo kf 128          (turns on feature-flag bits)
mvdsv:   stores it as-is, never interprets it
KTX:     reads kf via iKey(), checks the bits (KF_KTSOUNDS, KF_SPEED, ...)
Result:  the player's chosen KTX features (e.g. announcer sounds) switch on
```

mvdsv holds `kf` but has no idea what the bits mean -- the meaning lives entirely in KTX (`g_utils.c:2420`, `client.c:711`). The weapon-stats codes (`wps`, `lw`, `ktpl`) work the same way: the client sets a number, KTX's scoreboard routines read it via `iKey()`.

## The key families (the full surface)

The complete inventory is in Layer 1 (each key is an `info_key` entity with scope, operations, and source location). The keys group into roughly nine families across the three roles -- this note teaches the families; Layer 1 holds every key:

**Client userinfo (what you publish about yourself):**
- *Identity and appearance* -- `name` `team` `skin` `gender` `topcolor` `bottomcolor` `nocolors`. Defined by the client; ezQuake carries them as `CVAR_USERINFO` cvars.
- *Network tuning* -- `rate` `drate` `mtu` `msg` `dupe`. Tell the server how to send you data.
- *Legacy and teamplay fields* -- `emodel` `pmodel` `chat` `tp_need_weapon` `tptook`. Older-protocol model fields and ezQuake teamplay markers.

**Server-stamped and serverinfo (what the server publishes or stamps):**
- *Auth and connection slot* -- `password` `spectator` `*spectator` `*VIP` `*auth` `*flag` `login`. Who you are and what slot you get.
- *Server description (serverinfo)* -- `map` `needpass` `*gamedir` `*version` `*cheats` `*z_ext` `epoch` `status`. The server describing itself.
- *Game-code loading* -- `*progs` `*qvm` `*csprogs` `*csprogsname` `*csprogssize`. What QC/CSQC the client should load.
- *Client and proxy identification* -- `*client` `*userid` `*state` `*skill` `*qtv` `Qizmo` `svf` `ip` `ping`, plus QTV streaming (`address` `streamid` `qul`). Server-stamped markers and proxy detection.

**KTX mod codes (gameplay):**
- *Weapon-stats and scoreboard codes* -- `lw` `lw_x` `ls` `wps` `wpsx` `ktpl` `w_rank`. Client-set, KTX-interpreted display configuration (`iKey` reads in `Print_Wp_Stats`/`Print_Scores`).
- *Match and gameplay state* -- `di` `ev` `fpd` `fs` `ti` `ln` `lra` `mi` `nrb` `matchtag` `runes` `railcolor` `pbspeed`. Scattered KTX-specific codes; the densest cluster and the one most likely to need per-key source investigation.

## Consumer implications

- **Layer 1 vs this note.** Layer 1 answers "what is `*gamedir`?" (`lookup_entity`); this note answers "how does userinfo work?" (`search_concepts`). The 83 keys stay terse one-liners in Layer 1 because the cross-codebase story lives here; a key row's See-also points back at this note rather than restating the protocol.
- **"Where do I set X?"** If a key has an ezQuake `CVAR_USERINFO` cvar (`name`, `rate`, `team`, ...), set the cvar. Otherwise use `setinfo <key> <value>`. Server-side keys (serverinfo, localinfo) are set by the operator with the `serverinfo`/`localinfo` commands, not by players.
- **Why a key is read-only in one engine.** mvdsv `write` + KTX `read` on the same key (`*VIP`, `team`) is the protocol working as designed: one codebase produces, another consumes. It is not a missing operation.
- **Documenting a key.** Route by who *owns the meaning*, not who reads the bytes. Client-cvar keys borrow ezQuake's description; server-authored `*`-keys are synthesized from the mvdsv set-site; KTX gameplay codes are documented from KTX. The `ops`/`*` signal points at the owner but is not the rule -- KTX's bot sets `team`/`topcolor` and mvdsv normalizes `name`, yet those stay client-semantic.
- **Tooling (slipgate, config-viewer).** A config viewer rendering a userinfo dump can label each key by family and consumer using this map, and resolve client-cvar keys to their ezQuake cvar reference.

## References

- Star-key write path (server-only): `Info_SetStar` / `Info_SetValueForStarKey` in mvdsv. `*VIP` stamping at `sv_user.c:295` and `sv_main.c:1437`; the `vip_values` password-to-level map at `sv_main.c:2750`. `*gamedir` publish at `fs.c:561` (`FS_InitEx`).
- KTX read builtins: `ezinfokey(ent, "key")` (string) and `iKey(ent, "key")` (int/bitmask). `kf` reads at `g_utils.c:2420` (`KF_ON_ENTER`), `client.c:711` (`KF_SCREEN`), `client.c:4582` (`KF_SPEED`), `commands.c:3385` (`KF_KTSOUNDS`). Weapon-stats codes at `client.c:3165-3167` and `client.c:3360` (`Print_Wp_Stats` / `Print_Scores`); `ktpl` index shift at `client.c:3166`.
- Cross-engine cvars and commands already in Layer 1: ezQuake `name`/`rate`/`team`/`skin`/`topcolor`/`bottomcolor`/`gender`/`msg` (`CVAR_USERINFO`); commands `setinfo`/`fullinfo`/`userinfo` (client), `serverinfo`/`localinfo`/`user` (mvdsv).
- `*VIP` / `*gamedir` engine-behavior findings: mvdsv describe-fill findings #57 (VIP level published to userinfo; engine assigns, mod acts), #33 (rejected-gamedir serverinfo divergence), #14 (`vip_addip 0` mask-0 footgun).

## Related concept notes

- `player-skins.md` -- the `skin`/`topcolor`/`bottomcolor` userinfo keys are one slice of this protocol; that note covers skin identification and visibility in depth where this one only names the family.
- `client-side-server-exec-allowlist.md` -- the companion server-to-client surface. This note covers what the client *tells* the server (userinfo); that one covers what the server may *push back* to the client (`cbuf_svc`) and the `cl_remote_capabilities` allowlist that gates it. `rate` appears in both: the server sets it on connecting clients, and the allowlist must permit that.
- Future note candidate: **the QTV pseudo-client** -- `address`/`streamid`/`qul`/`*qtv` and the QTV streaming keys form a coherent sub-protocol (a relay connecting as a synthetic client) that would earn its own note if a consumer question is posed against it.
