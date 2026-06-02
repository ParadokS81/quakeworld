# describe-fill-synthesis ledger -- mvdsv `updatebroadcasts`

- **project:** mvdsv
- **knob:** `updatebroadcasts` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:updatebroadcasts: synthesized -- admin console/rcon command; force-refreshes the master-harvested broadcast peer list (bypasses the ~600s auto-throttle), no-ops while disabled or after a game starts; not in ucmds[] (admin-only); no KTX override -- origin=synthesized ref=src/sv_broadcast.c:94 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Immediately refreshes the server's list of peer QuakeWorld servers used for cross-server broadcasts, by re-querying the configured master servers. The automatic refresh runs on its own (about every 10 minutes); this command forces one right away. It does nothing and prints a notice if broadcasting is turned off (sv_broadcast_enabled 0) or if a game has already started -- the list can only be rebuilt while the server is idle in Standby.
>
> Set by: server console / rcon (admin only).
> See also: sv_broadcast_enabled.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| handler forces an update | src/sv_broadcast.c:80-83 | `void SV_BroadcastUpdateServerList_f(void){ SV_BroadcastUpdateServerList(true); }` | MATCH |
| re-queries masters, rebuilds peer list | src/sv_broadcast.c:154,207,215 | `Sys_CreateThread(SV_BroadcastQueryMasters,...)` -> per-master `SV_BroadcastQueryMaster(...)` -> `server_list_count = server_count;` | MATCH |
| forces immediate (bypasses periodic throttle) | src/sv_broadcast.c:119 | `if (!force_update && realtime - last_servers_update < BROADCAST_SERVER_LIST_UPDATE_INTERVAL) return;` (skipped when force_update) | MATCH |
| throttle interval ~= 10 min | src/sv_broadcast.h:44 | `#define BROADCAST_SERVER_LIST_UPDATE_INTERVAL 600.0` | MATCH |
| automatic counterpart is throttled | src/sv_main.c:3378 | `SV_BroadcastUpdateServerList(false);` | MATCH |
| refuses if broadcasting off | src/sv_broadcast.c:99-107 | `if (!sv_broadcast_enabled.value){ if(force_update) Con_Printf("...sv_broadcast_enabled is off"); return; }` | MATCH |
| sv_broadcast_enabled default on | src/sv_main.c:145 | `cvar_t sv_broadcast_enabled = {"sv_broadcast_enabled", "1", 0, SV_BroadcastEnabledOnChange};` | MATCH |
| refuses once a game started | src/sv_broadcast.c:109-117 | `if (GameStarted()){ ..."a game has already started"; return; }` | MATCH |
| GameStarted = not Standby / has non-stream dest | src/sv_main.c:218-226 | `return (d || strncasecmp(Info_ValueForKey(svs.info,"status"),"Standby",8));` | MATCH |
| admin-only (Cmd_AddCommand, not ucmds[]) | src/sv_ccmds.c:1868 | `Cmd_AddCommand ("updatebroadcasts", SV_BroadcastUpdateServerList_f);` (no match in src/sv_user.c ucmds[]) | MATCH |
| no KTX override | ktx/src (grep) | no `cmd_t`/command override of `updatebroadcasts`; only unrelated G_bprint 'broadcast' comments | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | "Immediately refreshes ... by re-querying the configured master servers" (force path) | sv_broadcast.c:80-82 + 154 | `SV_BroadcastUpdateServerList_f(void) { SV_BroadcastUpdateServerList(true); }` ... `Sys_CreateThread(SV_BroadcastQueryMasters, NULL)` | MATCH |
| 2 | "re-querying the configured master servers" (master list = configured) | sv_broadcast.c:200-208; sv_master.c:28 | `for (i=0;i<MAX_MASTERS;i++){ if(!master_adr[i].port) break; SV_BroadcastQueryMaster(sock,&master_adr[i],...);}` ; `netadr_t master_adr[MAX_MASTERS]; // address of group servers` | MATCH |
| 3 | "list of peer QuakeWorld servers used for cross-server broadcasts" | sv_broadcast.c:215-216 (store) -> 466-470 (send) / 547-549 (validate) | `server_list_count = server_count; memcpy(server_list, servers, ...)` ; later `for(...server_list_count...) sendto(...server_list[i]...)` | MATCH |
| 4 | "automatic refresh runs on its own (about every 10 minutes)" -- interval = 600s | sv_broadcast.h:44 + sv_broadcast.c:119 | `#define BROADCAST_SERVER_LIST_UPDATE_INTERVAL 600.0` ; `if (!force_update && realtime - last_servers_update < BROADCAST_SERVER_LIST_UPDATE_INTERVAL) return;` (header comment line 43: "Updates the server list every 10 minutes.") | MATCH |
| 5 | "automatic refresh runs on its own" -- driven by server loop | sv_main.c:3378 | `SV_BroadcastUpdateServerList(false);` (in SV_Frame, every frame; gated by interval at clause 4) | MATCH |
| 6 | "this command forces one right away" -- force bypasses interval | sv_broadcast.c:82 + 119 | `SV_BroadcastUpdateServerList(true);` ; the `if (!force_update && ...interval...)` guard is skipped when force_update=true | MATCH |
| 7 | "does nothing and prints a notice if broadcasting is turned off (sv_broadcast_enabled 0)" | sv_broadcast.c:99-107 | `if (!sv_broadcast_enabled.value){ if(force_update){ Con_Printf("...Cannot update broadcast servers, sv_broadcast_enabled is off\n"); } return; }` | MATCH |
| 8 | OFF-state notice prints (force path always true for command) | sv_broadcast.c:101 (`if (force_update)`) | command path passes force_update=true (clause 6), so notice prints | MATCH |
| 9 | "does nothing ... if a game has already started" -- prints + returns | sv_broadcast.c:109-117 | `if (GameStarted()){ if(force_update){ Con_Printf("...Cannot update broadcast servers, a game has already started\n"); } return; }` | MATCH |
| 10 | "list can only be rebuilt while the server is idle in Standby" (!GameStarted state) | sv_main.c:218-227 | `return (d || strncasecmp(Info_ValueForKey(svs.info,"status"),"Standby",8));` -- false (refresh allowed) requires status=="Standby" AND no non-stream demo dest | MATCH (minor: see flag -- Standby is necessary but the non-stream-demo branch is a second blocker folded into "game started") |
| 11 | "Set by: server console / rcon (admin only)" -- registration | sv_ccmds.c:1868 | `Cmd_AddCommand ("updatebroadcasts", SV_BroadcastUpdateServerList_f);` (in SV_InitLocal; unconditional, server-side) | MATCH |
| 12 | "rcon (admin only)" -- rcon password gate before dispatch | sv_main.c:1701-1725 | `if (Rcon_Validate(remote_command, master_rcon_password)) {...do_cmd...} else if (Rcon_Validate(remote_command, rcon_password.string)) { admin_cmd=true; ... Cmd_ExpandString(...); ` -> `Cmd_ExecuteString` only after password match | MATCH |
| 13 | "See also: sv_broadcast_enabled" (cvar exists, default on) | sv_main.c:145 | `cvar_t sv_broadcast_enabled = {"sv_broadcast_enabled", "1", 0, SV_BroadcastEnabledOnChange};` | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Command `updatebroadcasts` registers SV_BroadcastUpdateServerList_f (sv_ccmds.c:1868), which calls SV_BroadcastUpdateServerList(true) in sv_broadcast.c. All 13 material clauses trace to a located enforcing line and MATCH. Wide-grep confirms exactly two callers of the handler: the command wrapper (force=true) and the SV_Frame auto-refresh (force=false, sv_main.c:3378); no cross-mod override, no other read-sites.

Key confirmations:
- Interval IS exactly 600.0s = 10 min (sv_broadcast.h:44), header comment literally says "Updates the server list every 10 minutes" -- "about every 10 minutes" is correct.
- sv_broadcast_enabled default "1" (on); not load-bearing for this command's text but the See-also is valid.
- OFF-state and game-started notices BOTH print on the command path because the wrapper always passes force_update=true; the `if(force_update)` guards on the Con_Printf are satisfied. The proposed "prints a notice" is correct.
- Access: registered via Cmd_AddCommand in SV_InitLocal (unconditional, server-only binary), reachable from server console directly and from rcon only after Rcon_Validate against rcon_password / master_rcon_password (sv_main.c:1701-1725). "server console / rcon (admin only)" is verified.

Two precision nuances (not defects, do not change the classification):
1. Clause 10 "idle in Standby": the refresh-allowed condition is `!GameStarted()`, which requires status=="Standby" AND no non-stream demo destination. The description maps the demo-recording branch onto "a game has already started" (clause 9), which matches the engine's own comment at sv_main.c:223 ("oh, its not stream, treat as 'game is started'"). So a server in Standby that is actively recording an MVD demo would still be blocked -- "idle in Standby" alone is necessary but the no-demo half is implicit in the "game started" notice. The command-path notice the user actually sees is verbatim "a game has already started," which the description quotes. Net: accurate, mildly simplified, traceable -> still TRACED-CLEAN.
2. "queries the configured master servers" is correct, but if NO masters are configured (master_adr[0].port==0) the force path prints "No master servers configured" and sets last_servers_update without spawning the thread (sv_broadcast.c:126-131). The description's "re-querying the configured master servers" implicitly assumes masters exist; this is the normal case and not contradicted.

## flags_for_review

- [fyi/off-scope-entity/synthesis] SV_BroadcastUpdateServerList_f passes force_update=true but the message printed when a game has already started ('Cannot update broadcast servers, a game has already started', sv_broadcast.c:113-114) reaches the SERVER console via Con_Printf -- correct for an admin/rcon command. No bug; noting that the entire broadcast subsystem (sv_broadcast.c) is dated 2025 (file header copyright) and is recent, so its sibling entities (sv_broadcast_enabled cvar, sv_broadcast_sender_validation_enabled cvar, the 'broadcasts' log-print command SV_BroadcastPrintLog_f, and the SVC_Broadcast network handler) are likely also new and may not yet have L1 descriptions -- worth a coverage check, though they are out of this chunk's scope.
- [fyi/hidden-family/synthesis] sv_broadcast_enabled registers with default "1" (on) at sv_main.c:145, but its OnChange (SV_BroadcastEnabledOnChange, sv_broadcast.c:85-92) deliberately mirrors the value into a serverinfo key literally named 'broadcast' (not 'sv_broadcast_enabled') via SV_ServerinfoChanged. Flagging because any future doc for sv_broadcast_enabled must note the serverinfo key is exposed as 'broadcast', and a 'broadcast' info_key entity may exist separately -- a cross-entity naming aliasing worth a human look when that cvar is documented.
- [fyi/other/vpass] GameStarted() (sv_main.c:218-227) returns true on EITHER (a) any non-stream demo destination active OR (b) serverinfo 'status' key != 'Standby'. The description frames the refresh-allowed window as 'idle in Standby', which captures branch (b) but folds branch (a) into 'a game has already started'. A server whose status is genuinely 'Standby' but which is recording an MVD demo would still be blocked from refreshing. This matches the engine's own comment ('treat as game is started') and the command's literal notice text, so it is a simplification, not an error -- flagged FYI in case the broader describe-fill arc wants consistent 'GameStarted()' phrasing across the broadcast family (SV_Broadcast at line 351 and SVC_Broadcast at line 610 share the same gate).
- [review/suspected-bug/vpass] Possible upstream copy-paste bug (off-scope, not in this knob's text): at sv_broadcast.c:382, inside SV_Broadcast's broadcast_in_progress branch, the unlock targets servers_update_lock (`Sys_MutexUnlock(&servers_update_lock);`) but the lock just acquired in that function is broadcast_lock (line 373). The surrounding success path unlocks broadcast_lock (line 387). This looks like a wrong-mutex unlock on the already-in-progress error path. Unrelated to updatebroadcasts (which uses servers_update_lock correctly), but surfaced while tracing the shared broadcast module.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "updatebroadcasts",
  "type": "command",
  "description": "Immediately refreshes the server's list of peer QuakeWorld servers used for cross-server broadcasts, by re-querying the configured master servers. The automatic refresh runs on its own (about every 10 minutes); this command forces one right away. It does nothing and prints a notice if broadcasting is turned off (sv_broadcast_enabled 0) or if a game has already started -- the list can only be rebuilt while the server is idle in Standby.\n\nSet by: server console / rcon (admin only).\nSee also: sv_broadcast_enabled.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_broadcast.c:94. No trailing comment at the registration (sv_ccmds.c:1868) -- cold synth from read use-sites. Handler SV_BroadcastUpdateServerList_f (sv_broadcast.c:80-83) calls SV_BroadcastUpdateServerList(true); the enforcing logic is SV_BroadcastUpdateServerList(qbool force_update) at sv_broadcast.c:94. CLAUSE re-queries masters / rebuilds peer list: force-path falls through to Sys_CreateThread(SV_BroadcastQueryMasters) at sv_broadcast.c:154; that thread loops master_adr[] and calls SV_BroadcastQueryMaster (sv_broadcast.c:207) which sends payload 0x63 and rebuilds server_list (sv_broadcast.c:215-216) -- so it refreshes the list of peer servers harvested from the master(s). CLAUSE forces immediate / bypasses the periodic throttle: handler passes force_update=true (sv_broadcast.c:82); the interval guard at sv_broadcast.c:119 (`!force_update && realtime - last_servers_update < BROADCAST_SERVER_LIST_UPDATE_INTERVAL`) is skipped when force_update is true; BROADCAST_SERVER_LIST_UPDATE_INTERVAL = 600.0 (sv_broadcast.h:44) ~= 10 min; the automatic counterpart call at sv_main.c:3378 passes false and IS subject to that 600s throttle -- hence 'forces one right away vs the ~10-min automatic refresh'. CLAUSE refuses when broadcasting off: sv_broadcast.c:99-107 `if (!sv_broadcast_enabled.value){ if(force_update) Con_Printf(\"...sv_broadcast_enabled is off\"); return; }`. sv_broadcast_enabled default = \"1\" (on) per cvar_t literal sv_main.c:145 `{\"sv_broadcast_enabled\",\"1\",0,SV_BroadcastEnabledOnChange}`. CLAUSE refuses once a game started: sv_broadcast.c:109-117 `if (GameStarted()){ ...\"a game has already started\"; return; }`; GameStarted (sv_main.c:218-226) returns true when a non-DEST_STREAM demo dest exists OR serverinfo 'status' != \"Standby\" -- so the list only rebuilds while the server is idle/Standby. ACCESS-CLASS admin-only: registered solely via Cmd_AddCommand (sv_ccmds.c:1868); grep of src/sv_user.c for updatebroadcasts/BroadcastUpdateServerList is EMPTY -> not in ucmds[], so no client-stringcmd dispatch path (SV_ExecuteUserCommand would print 'Bad user command'); console/rcon only. F-MV1: grep ktx/src found no command-table override of updatebroadcasts (the commands.c 'broadcast' hits are unrelated G_bprint redtext, not a cmd_t). No-arg command -> worked example skipped per chunk rule. Note: I kept the description scoped to THIS command's observable effect (refresh the peer list); the downstream message-send feature it feeds (SVC_Broadcast at sv_broadcast.c:500) is a separate entity and routed to See also: sv_broadcast_enabled rather than inlined.",
  "description_proposed": null
}
```
