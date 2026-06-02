# describe-fill-synthesis ledger -- mvdsv `status`

- **project:** mvdsv
- **knob:** `status` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:status: synthesized -- prints server net/CPU/timing header plus per-client ping/frags/id/address table; admin-only console/rcon, no-arg -- origin=synthesized ref=src/sv_ccmds.c:1194 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the current server status to the console: the server's net address, overall and demo-recording CPU usage, average response time, packets per frame, and a table of every connected client (name, ping, frags, userid, address, real IP, and whether they are a spectator or still connecting).
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| prints net address, CPU overall/recording, avg response time, packets/frame | src/sv_ccmds.c:1194-1209 | `Con_Printf ("net address ... cpu utilization (overall) ... (recording) ... avg response time ... packets/frame ...", NET_AdrToString(net_local_sv_ipadr), (int)cpu, (int)demo1, (int)avg, pak, ...)` | MATCH |
| per-client table: name, ping, frags, userid, address, real ip, spectator/connecting/zombie | src/sv_ccmds.c:1210-1234 | `Con_Printf ("%-16s %4i %5i %6i %-22s ", cl->name, (int)SV_CalcPing(cl), (int)cl->edict->v->frags, cl->userid, ...)` then realip + spectator '(s)' + CONNECTING/ZOMBIE switch | MATCH |
| admin-only (console/rcon) | src/sv_ccmds.c:1838 + src/sv_user.c:3299-3360 | `Cmd_AddCommand ("status", SV_Status_f);` and 'status' absent from `ucmds[]` | MATCH |
| no argument | src/sv_ccmds.c:1177 | `void SV_Status_f (void)` reads no Cmd_Argv | MATCH |
| no KTX override | ktx/src (grep) | no 'status' server-command registration in cmd_t cmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Result |
|---|---|---|---|---|
| 1 | Prints current server status to the console | sv_ccmds.c:1195 (whole handler uses Con_Printf) | `Con_Printf ("net address ... : %s\n" ...)` | MATCH |
| 2 | Server's net address | sv_ccmds.c:1195-1200; net.c:1419 | `"net address                 : %s\n"` ... `NET_AdrToString (net_local_sv_ipadr)`; `NET_GetLocalAddress (svs.socketip, &net_local_sv_ipadr)` | MATCH (net_local_sv_ipadr is the server's bound local addr, also mirrored to RO cvar sv_local_addr) |
| 3 | Overall CPU usage | sv_ccmds.c:1189,1196,1201 | `cpu = 100.0 * svs.stats.latched_active / cpu;` / `"cpu utilization (overall)   : %3i%%\n"` / `(int)cpu` | MATCH |
| 4 | Demo-recording CPU usage | sv_ccmds.c:1188,1197,1202; sv_main.c:3367 | `demo1 = 100.0 * svs.stats.latched_demo / cpu;` / `"cpu utilization (recording) : %3i%%\n"` / `(int)demo1`; `latched_demo = svs.stats.demo` | MATCH (engine label is "recording" = demo work) |
| 5 | Average response time | sv_ccmds.c:1192,1198,1203 | `avg = 1000 * svs.stats.latched_active / STATFRAMES;` / `"avg response time           : %i ms\n"` / `(int)avg` (STATFRAMES=100, server.h:554) | MATCH (engine's own label "avg response time") |
| 6 | Packets per frame | sv_ccmds.c:1193,1199,1204 | `pak = (float)svs.stats.latched_packets / STATFRAMES;` / `"packets/frame               : %5.2f (%d)\n"` / `pak, num_prstr` | MATCH for "packets per frame" (=pak); the `(%d)`=num_prstr (VM program-string-table count) parenthetical is UNMENTIONED -- benign omission, not a contradiction |
| 7 | Per-client table: name, ping, frags, userid, address, real IP | sv_ccmds.c:1209-1219 (RD_NONE); 1242-1257 (redirected) | header `"name             ping frags   id   address                real ip"`; row `Con_Printf ("%-16s %4i %5i %6i %-22s ", cl->name, (int)SV_CalcPing(cl), (int)cl->edict->v->frags, cl->userid, ...)`; realip printed `if (cl->realip.ip[0])` | MATCH |
| 8 | real IP = client's actual IP (behind proxy) | server.h:360; sv_ccmds.c:1218-1219 | `netadr_t realip; // client's ip, not latest proxy's`; `if (cl->realip.ip[0]) Con_Printf("%-15s", NET_BaseAdrToString(cl->realip));` | MATCH |
| 9 | Spectator annotation `(s)` | sv_ccmds.c:1220 (RD_NONE); 1254 (redirected) | `Con_Printf (cl->spectator ? (char *) "(s)" : (char *) "");` | MATCH |
| 10 | "still connecting" annotation | sv_ccmds.c:1222-1227 | `case cs_connected: case cs_preconnected: Con_Printf (" CONNECTING\n"); continue;` | MATCH |
| 11 | Set by: server console / rcon | sv_ccmds.c:1838-1839 | `Cmd_AddCommand ("status", SV_Status_f);` / `Cmd_AddCommand ("sv_status", SV_Status_f);` (server cmd table; no client/player access path in mvdsv tree) | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362. Handler SV_Status_f at sv_ccmds.c:1177-1273; registered as both `status` and `sv_status` (sv_ccmds.c:1838-1839). Every material clause maps to a located, verified enforcing line including adjacent comments. Classification: TRACED-CLEAN.

Trace highlights:
- "net address" = server's bound local address (net_local_sv_ipadr, set via NET_GetLocalAddress on svs.socketip at net.c:1419), not a client's. Verified.
- CPU/avg/packets are the server-loop accounting stats, latched every STATFRAMES=100 frames (sv_main.c:3362-3367). overall=latched_active fraction, recording=latched_demo fraction. Verified against both the formulas and the engine's own printf header labels, so the description uses the engine's terminology faithfully.
- "real ip" column is genuinely the client's true IP behind any proxy (server.h:360 comment "client's ip, not latest proxy's"); printed only when cl->realip.ip[0] is set. The separate "address" column is the immediate/proxy netchan address. Description's distinction is correct.
- Access-class "server console / rcon" verified: both registrations are server-side Cmd_AddCommand entries; no client-side `status` exists in the mvdsv tree (only qtv_status, a different handler, out of scope). The ezQuake #532 comment at sv_ccmds.c:1837 concerns the ezQuake CLIENT's own `status` alias overriding the bare name -- that is ezquake-client context, not an mvdsv player/client access path, so it does not weaken the access claim.

Two benign omissions (NOT asserted-clause defects, so they do not move the classification):
1. ZOMBIE annotation: handler also prints "ZOMBIE" for cs_zombie clients (sv_ccmds.c:1228-1230, 1265-1267). Description lists "spectator or still connecting" and omits zombie. Reads as illustrative ("...and whether they are a spectator or still connecting"), not an exhaustive-only claim, so no contradiction. Acceptable for a user-doc.
2. The `(%d)` parenthetical on the packets/frame line is num_prstr (VM program-string-table counter, pr_exec.c:675/721), unrelated to packets. Omitting this obscure internal from a user-doc is appropriate. "packets per frame" maps cleanly to the %5.2f `pak` value.

Both branches of the output (RD_NONE non-redirected vs the redirected/rcon default branch) print the same logical columns in different layouts; the description's column list (name, ping, frags, userid, address, real ip, spectator/connecting) holds for both branches.

## flags_for_review

- [fyi/hidden-family/synthesis] 'status' and 'sv_status' are two distinct Layer 1 command entities that share one handler (SV_Status_f) and are functionally identical. The registration comment (src/sv_ccmds.c:1836) explains sv_status exists only so the status display still works when a connected client's 'status' command alias shadows the engine 'status' (ezQuake #532). Intentional duplication, not a bug, but the two L1 rows will carry near-identical descriptions.
- [fyi/other/vpass] status handler also emits a 'ZOMBIE' annotation for cs_zombie clients (sv_ccmds.c:1228-1230 and 1265-1267) in addition to the CONNECTING/spectator annotations the description names. Omission is benign for a user-doc (the description's phrasing is illustrative, not exhaustive-only), but noting for completeness in case the operator wants the zombie state mentioned.
- [fyi/other/vpass] The packets/frame line prints '%5.2f (%d)' where the parenthetical %d is num_prstr (the VM program-string-table counter, pr_exec.c:675), not a packets-related figure. The description correctly documents only the packets-per-frame value and silently drops the unrelated parenthetical. Flagging only so the omission is a known, deliberate gap rather than an oversight.
- [fyi/cross-mod-override/vpass] sv_ccmds.c:1837 comment 'Add sv_status as client allows status alias to over-ride (ezQuake #532)' documents that the ezQuake CLIENT ships its own `status`. mvdsv registers both `status` and `sv_status` so the client's alias can shadow the bare name while sv_status stays reachable. This is cross-mod client/server naming context; it does not create an mvdsv-side player access path, so 'Set by: server console / rcon' remains correct.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "status",
  "type": "command",
  "description": "Prints the current server status to the console: the server's net address, overall and demo-recording CPU usage, average response time, packets per frame, and a table of every connected client (name, ping, frags, userid, address, real IP, and whether they are a spectator or still connecting).\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1195. Handler SV_Status_f (src/sv_ccmds.c:1177). Header block prints net address + CPU overall + CPU recording + avg response time ms + packets/frame at src/sv_ccmds.c:1194-1209 (Con_Printf of NET_AdrToString(net_local_sv_ipadr), (int)cpu, (int)demo1, (int)avg, pak). Per-client loop prints name/ping/frags/userid/address/real-ip and spectator '(s)' + CONNECTING/ZOMBIE state at src/sv_ccmds.c:1210-1234 (real-ip gated on cl->realip.ip[0]). Output column format branches on sv_redirected (RD_NONE local-console wide format vs redirected 40-col narrow format, src/sv_ccmds.c:1204 switch; redirect_t enum src/server.h:882) -- a presentation detail, not action-relevant to an admin, so kept out of the user doc per D20. No-arg: handler reads no Cmd_Argv. Access-class: registered via Cmd_AddCommand at src/sv_ccmds.c:1838 and ABSENT from the client stringcmd table ucmds[] (src/sv_user.c:3299-3360; the only 'snap'-like dual entries are unrelated), so admin-only (console/rcon) per the proven chunk-3 access-class rule (SV_ExecuteUserCommand has no fall-through to console commands). F-MV1: grep of ktx/src finds no override of a 'status' server console command (KTX hits are an unrelated teamplay message name and bot subcommand).",
  "description_proposed": null
}
```
