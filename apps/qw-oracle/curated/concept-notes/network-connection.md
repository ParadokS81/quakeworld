---
title: "QuakeWorld network and connection: rate, packet loss, antilag, and proxies"
summary: "How to deal with QuakeWorld connection problems. Leads with the one decision that routes everything -- which of three layers your problem is in: your client settings (rate, packet-loss levers), the server's job (antilag, ping limits, which you don't configure), or the physical route (fixed with a wired connection or a proxy, not a cvar). Covers the modern rate recommendation, packet-loss mitigation, what antilag is, cutting ping with proxies, and what competitive rulesets restrict."
slug: network-connection
topic: domain-guide
status: draft
authored_by: qw-oracle
upstream_status: gap-candidate
upstream_target: new-page
primary_contributors:
  - "@ParadokS"
related_entities:
  - ezquake:cvar:rate
  - ezquake:cvar:mtu
  - ezquake:cvar:cl_c2sdupe
  - ezquake:cvar:cl_c2sImpulseBackup
  - ezquake:cvar:cl_c2spps
  - ezquake:cvar:cl_nodelta
  - ezquake:cvar:cl_nolerp
  - ezquake:cvar:cl_nopred
  - ezquake:cvar:cl_portpingprobe_enable
  - ezquake:cvar:cl_delay_packet
  - ezquake:cvar:pushlatency
  - ezquake:cvar:cl_proxyaddr
  - ezquake:cvar:cl_useproxy
  - ezquake:cvar:cl_net_clientport
  - ezquake:cvar:sb_findroutes
  - ezquake:command:connectbr
  - ezquake:command:connect
  - ezquake:command:sb_proxygetpings
  - ezquake:cmdline_param:-clientport
  - mvdsv:cvar:sv_antilag
  - mvdsv:cvar:sv_antilag_projectiles
  - mvdsv:cvar:sv_minping
  - mvdsv:cvar:sv_maxping
  - mvdsv:cvar:sv_maxrate
  - mvdsv:cvar:sv_enable_cmd_minping
  - ktx:command:antilag
  - ktx:cvar:k_vp_antilag
  - fte:cvar:cl_nolerp
  - fte:cvar:cl_netfps
  - fte:cvar:sv_antilag
scope: cross-engine
engines_covered: [ezquake, fte, mvdsv, ktx]
best_practices_reviewed: 2026-06-10
last_updated: 2026-06-10
---

# QuakeWorld network and connection

## Summary

QuakeWorld connection problems fall into three layers, and the fix lives in a different place for each: **your client settings** (a small set -- chiefly `rate`, plus a couple of packet-loss levers), **the server's job** (antilag and ping limits, which you do not configure from your client), and **the physical route** between you and the server (fixed with a wired connection or a proxy, not a cvar). The single most useful move when something feels wrong is to work out which layer you are in before changing anything -- most "network cvars" people copy around do nothing for the problem they were reaching for. On the client itself the modern advice is short: set `rate` high and leave it, because `rate` is a ceiling rather than a target and the server caps it anyway.

## Which layer is your problem in?

Decide this first; it tells you where to look and saves you tuning cvars that cannot touch your problem.

| Layer | What it covers | Where the fix lives | Do you control it? |
|---|---|---|---|
| **Your client** | bandwidth ceiling, packet-loss mitigation, which source port you connect from | client cvars: `rate`, `cl_c2sdupe`, `cl_portpingprobe_enable` | Yes |
| **The server** | lag compensation (antilag), ping floor and ceiling | server config: `sv_antilag`, `sv_minping`, `sv_maxping` | No -- except KTX's `antilag` vote |
| **The route** | the actual network path: WiFi vs wire, ISP routing, distance | a wired connection, or a proxy via `connectbr` | Indirectly |

A worked translation of the most common complaints: *"I have packet loss"* is usually the **route** (WiFi or a bad path), with `cl_c2sdupe` as the client lever once the physical side is clean. *"My ping is high to that server"* is the **route** again -- a proxy can help. *"Do I need to set antilag?"* is the **server** -- you do not. *"I changed cl_physfps and it did not help my lag"* is a category error: that is a physics setting, not a network one (see Related).

## Your connection settings (client)

This is the part you actually own. It is small on purpose.

**`rate` -- set it high and forget it.** `rate` is the maximum number of bytes per second you allow the server to send you. It is a *ceiling*, not an amount the game tries to fill: QuakeWorld is a tiny-bandwidth game, and even a busy server (eight bots on dm4) streams only about 18-20 KB/s in and roughly 2 KB/s out, observed live with `show net` (operator SME, ParadokS, 2026-06-10). So a high `rate` costs you nothing and removes the cap as a variable. The engine default is `25000`; `rate 50000` (or higher) is the modern recommendation -- let the server set the real limit, it clamps you to its own `sv_maxrate` if that is lower. There is no upside to penny-pinching `rate` on a 2026 connection (R7: engine mechanics -- `rate` is a server-read cap, default 25000 at `cl_main.c:245`, and `CVAR_USERINFO`; operator SME for the observed throughput and the high-value recommendation). Because `rate` is a userinfo value the server reads (not something your client enforces locally), the plumbing belongs to the userinfo/serverinfo note -- see Related.

**Packet loss -- route first, then the lever.** If your netgraph shows loss, check the route before you touch a cvar: a wired connection instead of WiFi fixes the large majority of real packet loss, and a proxy (below) can route around a bad path. The in-game lever, once the physical side is clean, is **`cl_c2sdupe 1`** -- it sends duplicate copies of your outgoing packets so a dropped one still arrives, at the cost of more upstream traffic. It requires server support (default `0` at `cl_input.c:31`). A related knob, `cl_c2sImpulseBackup` (default `3`), sends backup copies of packets that carry impulses so a dropped weapon-switch or command still lands; lower it only to shave traffic on a connection that is already clean.

**`cl_portpingprobe_enable 1` -- a few milliseconds off your ping.** When you connect, this probes several local source ports and keeps the one with the lowest ping to that server (default `0` at `net.c:72`; tuned by `cl_portpingprobe_probes` / `cl_portpingprobe_port_probes` / `cl_portpingprobe_delay`). The reason it can matter out of proportion to "a few ms": the scoreboard ping is quantized into roughly 13 ms notches, so trimming a couple of milliseconds can occasionally tip you down a whole notch -- e.g. from 26 to 13 (see "Scoreboard ping vs your real ping" below for why). It is the automatic successor to the old manual "port-cycling alias" trick (see Proxies below).

**Situational knobs.** `mtu` suggests a maximum packet size to the server (default empty, applied after reconnect); leave it alone unless you have a specific path-MTU problem. `cl_nodelta 1` turns off delta compression -- the engine's own guidance is to set it "when you get blue lines in your netgraph," otherwise leave the default. `cl_nolerp` disables entity interpolation; it is a display/feel choice rather than a connection fix (and in FTE it behaves differently -- see cross-engine note below).

## Antilag -- the server's job

Antilag (lag compensation) is what lets a higher-ping player still land hits. When you fire, the server rewinds the other players to where you actually saw them and tests the shot there, so the hit registers from your point of view instead of being lost to your ping (mvdsv `sv_antilag`: `0` off, `1` on for instant-hit weapons, `2` extended to mod traceline checks; `sv_antilag_projectiles` extends it to rockets/grenades/nails but only at `sv_antilag 2`). The value is published in serverinfo. **You do not set this on your client** -- it is a server setting, and most competitive QuakeWorld servers run it on (operator SME, ParadokS, 2026-06-10).

The one place a player touches it is **KTX's `antilag` command**, which casts a vote to toggle the server's antilag on or off; a player majority (threshold `k_vp_antilag`, admin clamped to 51-100%) or a single admin vote flips `sv_antilag` between `2` and `0`, and mid-match changes are refused.

Hit-scan compensation (LG, SG, SSG) works the same way across the common servers; **projectile** antilag is what is contested. Mainline mvdsv can extend compensation to rockets and grenades with `sv_antilag 2` plus `sv_antilag_projectiles` (the rewind approach, applied to projectile traces), while a fork (Dusty's, which needs matched server and client builds) takes a different projectile approach that some players prefer and others refuse -- which is why some communities run two server variants on separate port ranges. The mechanics and that debate are a note of their own (operator SME, ParadokS 2026-06-10; community-divided, not a settled recommendation). This guide's only claim is that antilag is the server's responsibility, is normally on, and compensates hit-scan weapons the same way everywhere; see the forward reference in Related.

*Cross-engine:* FTE's `sv_antilag` uses a different scale (`0` off, `1` mod-controlled and the default, `2` forced -- "might break certain uses of traceline" -- `3` also recalculates trace start positions to avoid lagged knockbacks).

## Cutting your ping with proxies

To lower your ping to a distant server, connect through a proxy that has a better route to it. The modern path is automatic: set **`sb_findroutes 1`** and connect with **`connectbr <server>`** ("connect best route") instead of plain `connect`. The server browser looks up the lowest-ping path via known proxies and connects you through the best one. This is worth doing mainly for **cross-region or international games**, where the direct route is poor; for a server near you it makes no difference (engine mechanics: `connectbr` "connects via fastest available path (ping-wise)", `sb_findroutes` enables the proxy route lookup; `sb_ignore_proxy` excludes specific proxies, `sb_proxygetpings <ip>` prints a proxy's ping list for debugging).

To pin one proxy by hand, set **`cl_proxyaddr <ip>`** -- it overrides `connect`/`reconnect` so every connection goes through that proxy (the older Qizmo-style manual route; `cl_useproxy` toggles reusing a detected Qizmo connection from the server browser).

**Ports and routing.** Which local UDP source port you use can change the path your packets take. `cl_net_clientport` sets that port (default `27001`; `0` picks one dynamically), and the `-clientport` command-line switch does the same at launch. The community trick of cycling through ports with an alias to dodge a bad NAT or route mapping is the manual ancestor of `cl_portpingprobe_enable 1` (above), which now does the probing for you at connect time.

## Server-enforced limits

A server can also constrain your connection directly; these are server-admin settings, listed here so you recognize them when they affect you. `sv_minping` adds artificial delay so nobody plays below a ping floor, evening out the low-ping advantage. `sv_maxping` forces anyone above a ping ceiling to spectator when they try to *join as a player* (spectators are never checked). `sv_maxrate` caps the send rate any client may use regardless of the `rate` they requested. On mvdsv/KTX a player may be allowed to set the floor themselves with the `minping <value>` console command when `sv_enable_cmd_minping 1` (values 0-300, and not during a match or demo recording).

## Scoreboard ping vs your real ping (and "pinging up")

QuakeWorld shows you two different ping numbers, and they do not agree -- a regular source of confusion. The **scoreboard ping** is quantized: it tends to step in roughly 13 ms increments (..., 13, 26, 39, ...) rather than reading a smooth value, a side effect of the independent-physics packet cadence (about 77 updates a second, ~13 ms each). Your **real ping** is finer-grained and shown by `show net`. Because the scoreboard figure is notched, nudging your real ping by only a millisecond or two can tip you across a boundary and change the *displayed* number by a whole step -- a real ping drifting from just under to just over a threshold flips the scoreboard from 26 to 39.

Players exploit this on purpose. **"Pinging up"** is the convention of deliberately *raising* your ping to even out the average between two teams: a player sitting at 26 on the scoreboard who is asked to ping up adds a millisecond or two with `cl_delay_packet 1` (or `2`), crossing the threshold so the scoreboard reads 39 and the two teams' average pings line up. It is a courtesy/fairness move in pickups and friendly games -- the players complaining about uneven pings go quiet once the averages match -- not a performance setting. Because `cl_delay_packet` is blocked from changing mid-match (see Ruleset interaction), pinging up is done in prewar/standby. (R7: operator/community field knowledge, ParadokS 2026-06-10 -- the ~13 ms quantum and the scoreboard-vs-real-ping split are field-observed, not pinned to a source line; `cl_delay_packet` and its match-gate are source-backed at `rulesets.c:697`.)

## What does not help (myths and legacy)

- **`cl_nopred`** is a debugging cvar -- it disables your own movement prediction. It is not a lag fix; leave it at the default (its help text says "for debugging").
- **`cl_physfps` / independent physics** is a *physics* setting, not a network one. Raising it does not fix packet loss, even though the two are constantly conflated. The engine source is blunt about the related worry: forcing `cl_c2spps` to 0 under rulesets, it comments that this "has not much to do with independent physics, but people are too paranoid about it" (`rulesets.c:305`).
- **`cl_c2spps`** (Qizmo-style outgoing packet filtering) is locked off in competitive play (see Ruleset interaction) and is the subject of exactly that "paranoia" comment. Do not expect to tune it.
- **`pushlatency`** is retired in ezQuake: it "is outdated and exists for compatibility with old configs" and does nothing. If you see it in an old config, delete it.

## Ruleset interaction

The player-facing connection cvars (`rate`, `cl_c2sdupe`, `mtu`, `cl_nodelta`, `cl_nolerp`, `cl_nopred`) are **free under every competitive ruleset** -- they are connection tuning, not automation. Two exceptions are worth knowing:

- **`cl_c2spps` is locked to `0`** -- forced unconditionally in MTFL (`rulesets.c:494`), and in smackdown / qcon / thunderdome / smackdrive whenever independent physics is active (`CVAR_ROM` at `rulesets.c:305-306` and the parallel blocks). So in normal competitive play it is not yours to change.
- **`cl_delay_packet`** -- which adds artificial latency, used in friendly 1on1s to sync both players to the same ping -- is range-clamped and **blocked from changing during a match** (`Rulesets_OnChange_cl_delay_packet`, `rulesets.c:697`). It is allowed in standby/prewar, where it even broadcasts the delay to the other player ("delay packet: target ping N ms").

For the general pattern of how rulesets clamp client features, see the ruleset anti-script restriction note.

## Consumer implications

- **Slipgate config-viewer.** Group network cvars by the three layers, not as one flat list: client-owned (`rate`, `cl_c2sdupe`, `cl_portpingprobe_*`, `mtu`), server-read userinfo (`rate` again, resolved to the userinfo note), and proxy/route (`cl_proxyaddr`, `cl_net_clientport`, `connectbr`). Surface `rate` with a "this is a cap, set it high" hint; flag `cl_c2spps` as ruleset-locked and `cl_nopred` / `pushlatency` as "not a fix."
- **Oracle MCP / chatbot.** For "I have lag / packet loss / high ping," the right first move is the layer question: route vs client vs server. Lead with route-first for packet loss, `rate` high for bandwidth worries, `connectbr` for cross-region ping, and "antilag is the server's job, normally on" for antilag questions. Do not recommend `cl_nopred`, `cl_physfps`, or `cl_c2spps` as lag fixes.

## References

- **Client cvar definitions (ezQuake head):** `rate` default `25000`, `CVAR_USERINFO` (`cl_main.c:245`); `cl_c2spps` `0`, `cl_c2sImpulseBackup` `3`, `cl_c2sdupe` `0`, `cl_nodelta` `0` (`cl_input.c:29-36`); `cl_portpingprobe_enable` `0` plus `cl_portpingprobe_probes` `500` / `cl_portpingprobe_port_probes` `1` / `cl_portpingprobe_delay` `0` (`net.c:72-73`). `cl_nopred` help text ("for debugging, disables movement prediction"); `mtu` (suggests max packet size, applied after reconnect); `pushlatency` `source_retired` ("outdated, exists for compatibility").
- **Ruleset locks:** `cl_c2spps` forced to `0` with `CVAR_ROM` under independent physics in smackdown/qcon/thunderdome/smackdrive (`rulesets.c:305-306` and parallel blocks at 371-372, 434-435, 567-568), unconditional in MTFL `disabled_cvars` (`rulesets.c:494`); `cl_delay_packet` range-clamped and match-gated (`Rulesets_OnChange_cl_delay_packet`, `rulesets.c:697`).
- **Server (mvdsv):** `sv_antilag` (rewind mechanism; `0`/`1`/`2`), `sv_antilag_projectiles` (requires `sv_antilag 2`), `sv_minping` (artificial-delay floor), `sv_maxping` (join-time ceiling, players only), `sv_maxrate` (per-client send cap), `sv_enable_cmd_minping` (player `minping` command, 0-300, not mid-match). FTE `sv_antilag` differs (`0`/`1` mod-controlled default/`2` forced/`3` recalc trace start).
- **Proxies / connection (ezQuake):** `connectbr` ("fastest available path"), `sb_findroutes` (proxy route lookup), `sb_ignore_proxy`, `sb_proxygetpings`, `cl_proxyaddr` (overrides connect/reconnect), `cl_useproxy` (Qizmo reuse), `cl_net_clientport` (default `27001`, `0`=dynamic), `-clientport` (launch override).
- **KTX:** `antilag` (vote command toggling `sv_antilag` 2/0), `k_vp_antilag` (vote threshold, clamped 51-100%).
- **Upstream:** no ezquake.com/docs network or connection page exists (gap-candidate; a new page, not an edit to an existing one).
- **Operator SME (ParadokS, 2026-06-10):** the high-`rate` recommendation and the live `show net` throughput figures; "most servers run antilag"; the `cl_portpingprobe` ping-notch tip; the scoreboard-ping-vs-real-ping notch behavior and the "pinging up" convention (raising ping with `cl_delay_packet` to even team averages); the existence of two antilag implementations; cross-region proxy use. Flagged inline as operator SME / hedged community knowledge, not source-defensible measurement.
- All `related_entities` verified `source_backed` in Layer 1 (queried 2026-06-10), except `pushlatency` (`source_retired`, named only as legacy).

## Related concept notes

- `qw-userinfo-serverinfo-protocol` -- `rate` is a `CVAR_USERINFO` key; that note owns how userinfo reaches and is read by the server (its worked example *is* `rate`). This note leans on it for the plumbing.
- `hud-configuration` -- the netgraph / `net` element is the on-screen diagnostic this note refers to ("blue lines," `pl`, throughput); that note covers how to show and place it.
- `ruleset-anti-script-restriction-pattern` -- the `cl_c2spps` lock and the `cl_delay_packet` match-gate are instances of the general ruleset-restriction pattern.
- `weapon-scripts` -- server-side weapon switching (`w_rank`) is the sibling "stays reliable under packet loss and high ping" feature; the two notes share the antilag/lag-compensation backdrop.
- **Forward references (not yet authored):** a dedicated **antilag** note (original vs fork, the `sv_antilag` levels, projectile compensation) -- operator-requested, and the right home for the two-implementation comparison this note only flags; an **independent-physics** note (`cl_physfps` / `cl_independentphysics`), the physics setting most often confused with a network fix.
