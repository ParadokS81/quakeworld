---
title: "QuakeWorld network and connection: rate, packet loss, antilag, and proxies"
summary: "What you want from your QuakeWorld connection is low ping, no packet loss, no stutter -- and because QW barely uses your connection, the setup is short: set rate 50000, play wired, and you are good for the large majority of cases. This guide gives the best-practice settings first, then how to lower ping with best-routes (sb_findroutes / connectbr), what antilag does (it is the server's job), and the deeper mechanics for specific problems."
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
  - ezquake:command:sb_refresh
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

What you want from your connection is the same as in any online game: the lowest ping, no packet loss, no stutter. The good news is QuakeWorld barely touches your connection -- it streams only about 20 KB/s even on a busy server -- so for almost everyone the setup is a couple of lines, and most "QuakeWorld lag" is your WiFi, router, or ISP route to the server, not the game or your config. The short version below covers the large majority of players; the rest of the guide is the *why* and the edge cases.

## The short version

On a normal broadband connection, one setting and one habit cover it:

```
rate 50000      // the one client setting that matters -- a ceiling, not a target;
                // QW uses ~20 KB/s regardless, the server caps you to sv_maxrate anyway
```
...and play on a **wired (LAN) connection, not WiFi**. Fixing the physical link beats any cvar.

If your connection is genuinely bad (mobile, visible packet loss):

```
cl_c2sdupe 1    // send your packets to the server twice, so a dropped one still arrives
cl_nodelta 1    // full updates instead of deltas-from-your-last-packet, so one lost
                // packet can't cascade (a holdover from the modem era; set it if your
                // netgraph shows loss / "blue lines")
```

To lower ping to a far or cross-region server, use **best routes** (next section).

## Lowering ping with best routes

ezQuake can route you to a server through a proxy that has a better path, using the server browser's best-route feature. Set it up once, then connect with `connectbr`:

```
sb_findroutes 1          // enable best-route lookup ("use with connectbr command")
sb_refresh               // refresh the browser -- this builds the "ping tree" of routes
connectbr <server-ip>    // connect via the fastest path (direct if direct is best,
                         // otherwise through the lowest-ping proxy)
```

The ping tree has to exist before `connectbr` can choose, which is why `sb_refresh` comes first: it writes the server list and builds the tree of proxy routes. `connectbr` then compares the direct route against the proxy routes and takes the lowest-ping one. This mainly helps for cross-region or international servers; for a server near you the direct route usually wins and `connectbr` just connects directly.

One more knob worth enabling:

```
cl_portpingprobe_enable 1   // on every connect, probe local source ports and keep the
                            // lowest-ping one -- a few ms, sometimes a scoreboard notch
                            // (see "Scoreboard ping" below)
```

To force a specific proxy by hand instead of using best routes:

```
cl_proxyaddr proxyIP:port    // route every connect through this proxy (QWFWD)
connect targetIP:port        // connects via the proxy set above
```

Chain hops with `@` -- `cl_proxyaddr "proxyA@proxyB"` -- not commas. (`cl_useproxy` is a
separate toggle: it only reuses a Qizmo/fteqtv proxy you are *already* connected through,
so it is not needed here.)

## Antilag -- the server's job

Antilag (lag compensation) is what lets a higher-ping player still land hits: when you fire, the server rewinds the other players to where you actually saw them, so the shot is judged from your point of view instead of being lost to your ping. It is a **server** setting (`sv_antilag`), not something you configure -- and most competitive servers run it on. On KTX you can vote it on or off with the `antilag` command.

Hit-scan compensation (LG, SG, SSG) works the same way across the common servers; **projectile** antilag is what is contested -- mainline mvdsv's `sv_antilag 2` + `sv_antilag_projectiles` (the rewind approach) versus a fork's different approach (Dusty's, needing matched server and client builds), which is why some communities run two server variants on separate port ranges. That comparison is a note of its own (operator SME, ParadokS 2026-06-10; community-divided, not a settled recommendation). FTE's server uses a different `sv_antilag` scale (`0`/`1` mod-controlled default/`2` forced/`3` recalc trace start).

## Scoreboard ping vs your real ping (and "pinging up")

The scoreboard ping and the ping in `show net` do not match, which confuses people. The **scoreboard** value is quantized into ~13 ms steps (13, 26, 39, ...) -- a side effect of the ~77-packets-per-second cadence both client and server run at -- while **`show net`** shows your finer, true round-trip in milliseconds. Because the scoreboard is notched, a millisecond or two can flip the displayed number by a whole step.

Players use that deliberately. **"Pinging up"** means raising your ping to even out the average between two teams: someone sitting at 26 who is asked to ping up adds a couple of milliseconds with `cl_delay_packet 1` (or `2`), crossing the boundary to 39 so the team averages line up. It is a prewar courtesy -- `cl_delay_packet` is blocked from changing mid-match (see Ruleset interaction). (Field knowledge, ParadokS 2026-06-10; the ~13 ms quantum is the packet cadence, `cl_delay_packet` and its match-gate are source-backed.)

## Server-enforced limits

A server can also constrain your connection directly; these are server-admin settings, listed so you recognize them when they affect you. `sv_minping` adds artificial delay so nobody plays below a ping floor; `sv_maxping` forces anyone above a ceiling to spectator when they try to join as a player; `sv_maxrate` caps the send rate any client may use regardless of the `rate` it asked for. On mvdsv/KTX a player can sometimes set the floor with the `minping` console command when `sv_enable_cmd_minping 1` (values 0-300, not during a match or demo).

## What does not help (myths and legacy)

- **`cl_nopred`** is a debugging cvar (it disables your own movement prediction); not a lag fix -- leave it at the default.
- **`cl_physfps` / independent physics** is a *physics* setting, not a network one; raising it does not fix packet loss, though the two get conflated. The engine source is blunt about the related worry, calling it "paranoia" (`rulesets.c:305`).
- **`cl_c2spps`** (Qizmo-style outgoing packet filtering) is locked off in competitive play (see Ruleset interaction) and is the subject of that "paranoia" comment. Don't expect to tune it.
- **`pushlatency`** is retired -- it exists only for old-config compatibility and does nothing. Delete it if you see it.

## Ruleset interaction

The player-facing connection cvars (`rate`, `cl_c2sdupe`, `mtu`, `cl_nodelta`, `cl_nolerp`, `cl_nopred`) are **free under every competitive ruleset**. Two exceptions: `cl_c2spps` is locked to `0` (forced unconditionally in MTFL at `rulesets.c:494`; under independent physics in smackdown/qcon/thunderdome/smackdrive at `rulesets.c:305-306`), and `cl_delay_packet` -- used for "pinging up" -- is range-clamped and blocked from changing during a match (`rulesets.c:697`), though allowed in prewar/standby. See the ruleset anti-script note for the general pattern.

## Consumer implications

- **Slipgate config-viewer.** Surface `rate` with a "set it high, it is a cap" hint; group the rest by the three layers (client-owned `rate`/`cl_c2sdupe`/`mtu`, the proxy/route group `sb_findroutes`/`connectbr`/`cl_proxyaddr`, server-read), and flag `cl_c2spps` as ruleset-locked and `cl_nopred`/`pushlatency` as "not a fix."
- **Oracle MCP / chatbot.** Lead with the short version: `rate 50000` + wired-not-WiFi covers most "lag" reports, because most of it is the route, not the client. Use `connectbr` for cross-region ping, and answer antilag questions with "it is the server's job, normally on." Do not recommend `cl_nopred`, `cl_physfps`, or `cl_c2spps` as lag fixes.

## References

- **Client cvar definitions (ezQuake head):** `rate` default `25000`, `CVAR_USERINFO` (`cl_main.c:245`); `cl_c2spps` `0`, `cl_c2sImpulseBackup` `3`, `cl_c2sdupe` `0`, `cl_nodelta` `0` (`cl_input.c:29-36`); `cl_portpingprobe_enable` `0` (`net.c:72`). `cl_nopred` help ("for debugging, disables movement prediction"); `mtu` (suggests max packet size, applied after reconnect); `pushlatency` `source_retired`.
- **Best routes:** `sb_findroutes` ("use with connectbr command"), `sb_refresh` builds the ping tree (`SB_PingTree_Build` gated on `sb_findroutes`, `EX_browser_net.c:603`); `connectbr` "connects via fastest available path (ping-wise)"; `cl_portpingprobe` probe gated by `IsPortPingProbeEnabled()` (`cl_main.c:828`); `cl_proxyaddr` overrides connect/reconnect; `cl_net_clientport` default `27001`; `-clientport` launch override; `sb_proxygetpings` debug.
- **Antilag:** rewind = `frame->sv_time` + prediction offset (`sv_user.c:4520-4531`); `sv_antilag` `0`/`1`/`2`, `sv_antilag_projectiles` needs `sv_antilag 2` (`sv_phys.c:751`). mvdsv and dusty-mvdsv hit-scan antilag verified byte-identical; the fork's delta is `MVD_PEXT1_SIMPLEPROJECTILE` (CSQC), not the rewind. FTE `sv_antilag` `0/1/2/3`. KTX `antilag` vote toggles `sv_antilag` 2/0; `k_vp_antilag` threshold (51-100).
- **Server limits:** `sv_minping` / `sv_maxping` / `sv_maxrate` / `sv_enable_cmd_minping` (mvdsv).
- **Ping model:** scoreboard ping = server `SV_CalcPing` (`sv_main.c:459`), averaged over up to 64 frames, quantized to the ~13 ms (77 pps) cadence; `show net` = client `cls.latency` / `CL_CalcNetStatistics`, continuous float ms. `cl_delay_packet` holds packets `0.5x` value each direction (`net.c:178`); match-gate `rulesets.c:697`.
- **Ruleset locks:** `cl_c2spps` CVAR_ROM (`rulesets.c:305-306`, MTFL `rulesets.c:494`); `cl_delay_packet` match-gate (`rulesets.c:697`).
- **Upstream:** no ezquake.com/docs network page exists (gap-candidate, new page).
- **Operator SME (ParadokS, 2026-06-10):** the `rate 50000` recommendation + `show net` throughput; "most servers run antilag"; the projectile-antilag divide + two-port-range split; the scoreboard-vs-real-ping notch and "pinging up"; cross-region proxy use. Flagged inline as operator SME / community-divided, not source-defensible measurement. Deeper antilag trace parked at `docs/superpowers/parking/2026-06-10-antilag-note-seed.md`.
- All `related_entities` verified `source_backed` in Layer 1 (queried 2026-06-10) except `pushlatency` (`source_retired`, named only as legacy).

## Related concept notes

- `qw-userinfo-serverinfo-protocol` -- `rate` is a `CVAR_USERINFO` key; that note owns how userinfo reaches and is read by the server (its worked example *is* `rate`).
- `hud-configuration` -- the netgraph / `net` element is the on-screen diagnostic this note refers to; that note covers how to show and place it.
- `ruleset-anti-script-restriction-pattern` -- the `cl_c2spps` lock and the `cl_delay_packet` match-gate are instances of the general pattern.
- `weapon-scripts` -- server-side weapon switching (`w_rank`) is the sibling "stays reliable under packet loss and high ping" feature.
- **Forward references (not yet authored):** a dedicated **antilag** note (hit-scan vs projectile, the mainline `sv_antilag 2` path vs Dusty's fork, the two-port-range split -- seed parked at `docs/superpowers/parking/2026-06-10-antilag-note-seed.md`); an **independent-physics** note (`cl_physfps` / `cl_independentphysics`), the physics setting most often confused with a network fix.
