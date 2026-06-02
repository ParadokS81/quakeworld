# describe-fill-synthesis ledger -- mvdsv `logplayers`

- **project:** mvdsv
- **knob:** `logplayers` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:logplayers: synthesized -- admin/rcon toggle for a timestamped player-event log (connect/disconnect/name-change/spam) written to player_<port>_NNNN.log -- origin=synthesized ref=src/sv_main.c:4119 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles a player-activity log on or off (no arguments -- run it once to start logging, again to stop). While on, the server appends a timestamped line for notable per-player events such as connect, disconnect, name changes, and certain anti-spam kicks. Each line records the event, the player name, their user id, their connecting and real IP addresses, the port, and the player's userinfo string.
>
> Log file: written to the server's log directory (sv_logdir, default the working directory) as player_<port>_NNNN.log.
>
> Default: off.
> Set by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (console/rcon) | src/sv_ccmds.c:1828-1829 | `for (i=MIN_LOG; i<MAX_LOG; ++i) Cmd_AddCommand(logs[i].command, logs[i].function);` | MATCH |
| not client-issuable | src/sv_user.c:3299+ | grep 'logplayers' in ucmds[] -> empty | MATCH |
| toggle on/off, no args | src/sv_ccmds.c:92-105,203 | `if(logs[sv_log].sv_logfile){fclose...;if(!newlog){Con_Printf(message_off);...return;}}` ; `SV_Logfile(PLAYER_LOG, false)` | MATCH |
| record fields event\name\userid\ip\realip\port<info> | src/sv_main.c:4119-4129 | `SV_Write_Log(PLAYER_LOG, level, va("%s\\%s\\%i\\%s\\%s\\%i%s\n", msg, name, cl->userid, NET_BaseAdrToString(remote), NET_BaseAdrToString(realip), remote.port, info))` | MATCH |
| events: connect | src/sv_user.c:487 | `SV_LogPlayer(sv_client, "connect", 1);` | MATCH |
| events: disconnect | src/sv_main.c:386 | `SV_LogPlayer(drop, "disconnect", 1);` | MATCH |
| events: name change / spam kicks | src/sv_main.c:3827,3814 ; src/sv_user.c:2327,2433 | `SV_LogPlayer(cl, "name change", 1)` ; `"name spam"` ; `"userinfo spam"` ; `"topcolor spam"` | MATCH |
| timestamp prefix on each line | src/sv_main.c:4159-4160 | `default: log_msg = va("[%s].[%d] %s", date.str, level, msg);` | MATCH |
| filename player_<port>_NNNN.log in sv_logdir | src/sv_ccmds.c:114,224 ; src/sv_main.c:131 | prefix `"player_"` ; `snprintf(..."%s/%s%d_%04d.log", sv_logdir.string,...)` ; `sv_logdir="."` | MATCH |
| append mode | src/sv_ccmds.c:125 | `fopen (name, "a")` | MATCH |
| default off | src/sv_ccmds.c:224 | `{NULL, "logplayers", "player_", ...}` (sv_logfile NULL) | MATCH |
| no KTX override | ktx/src (grep) | grep 'logplayers' -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | snippet | verdict |
|---|--------|---------------------|---------|---------|
| 1 | Toggles on/off, no args, run once to start / again to stop | sv_ccmds.c:201-204 + sv_ccmds.c:92-106 | `void SV_PlayerLogfile_f(void){ SV_Logfile(PLAYER_LOG, false); }` ; in SV_Logfile: `if (logs[sv_log].sv_logfile){ fclose(...); logs[sv_log].sv_logfile=NULL; if(!newlog){ Con_Printf("%s", logs[sv_log].message_off); logs[sv_log].log_level=0; return; } }` (open→close=stop; NULL falls through to fopen=start) | MATCH |
| 2 | Appends a TIMESTAMPED line | sv_main.c:4148,4160 | `SV_TimeOfDay(&date, "%a %b %d, %H:%M:%S %Y");` ... default: `log_msg = va("[%s].[%d] %s", date.str, level, msg);` (PLAYER_LOG hits default case → timestamp prefix) | MATCH |
| 3 | Per-player events: connect, disconnect, name changes, certain anti-spam kicks | connect sv_user.c:487; disconnect sv_main.c:386; name change sv_main.c:3827; name spam sv_main.c:3814; userinfo spam sv_user.c:2327; topcolor spam sv_user.c:2433 | `SV_LogPlayer(sv_client,"connect",1)` / `SV_LogPlayer(drop,"disconnect",1)` / `SV_LogPlayer(cl,"name change",1)` / `SV_LogPlayer(cl,"name spam",1)` / `SV_LogPlayer(sv_client,"userinfo spam",1)` / `SV_LogPlayer(sv_client,"topcolor spam",1)`; spam sites each do BroadcastPrintf "was kicked for ... spam" + DropClient/drop → genuine anti-spam kicks. "such as" framing is non-exhaustive (also kick cmd sv_ccmds.c:863, dropped-vip sv_user.c:473) and not contradicted | MATCH |
| 4 | Each line records event, name, user id, connecting+real IPs, port, userinfo (in that order) | sv_main.c:4119-4129 | `SV_Write_Log(PLAYER_LOG, level, va("%s\\%s\\%i\\%s\\%s\\%i%s\n", msg, name, cl->userid, NET_BaseAdrToString(cl->netchan.remote_address), NET_BaseAdrToString(cl->realip), cl->netchan.remote_address.port, info))` — order = msg/name/userid/connect-IP/real-IP/port/userinfo, exactly as described | MATCH |
| 5 | "connecting and real IP addresses" semantics | server.h:360 | `netadr_t realip; // client's ip, not latest proxy's` (realip = real client IP behind proxy; remote_address = netchan peer = connecting addr) — order in format string is remote_address then realip = connecting then real | MATCH |
| 6 | "the port" | net.h:148 (+ net.h:169) | `unsigned short port;` field of netadr_t; logged separately as `remote_address.port` because NET_BaseAdrToString "port skipped" (net.h:169). It is specifically the CONNECTING address's port — minor unstated precision, not a contradiction | MATCH |
| 7 | Log file path `<sv_logdir>/player_<port>_NNNN.log` | sv_ccmds.c:114 | `snprintf(name, sizeof(name), "%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i);` with PLAYER_LOG file_name="player_" (sv_ccmds.c:224), sv_port=NET_UDPSVPort() (server port), %04d=NNNN | MATCH |
| 8 | sv_logdir default = working directory | sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` ("." = cwd) | MATCH |
| 9 | Default: off | sv_ccmds.c:217-226 | logs[] table initializes sv_logfile=NULL (first field) for every row; logging active only after toggle-on opens the FILE | MATCH |
| 10 | Set by: server console / rcon | sv_ccmds.c:1828-1829; sv_main.c:1828 | `for(i=MIN_LOG;i<MAX_LOG;++i) Cmd_AddCommand(logs[i].command, logs[i].function);` registers `logplayers` as a plain console command (no CF_ access flag → operator scope); validated rcon reaches `Cmd_ExecuteString(str)` (sv_main.c:1828) which runs it | MATCH |

**V-pass notes:** All 10 material clauses enforcement-traced to located lines (incl. adjacent comments) on mvdsv @ 1.11-53-g18d0362. No clause rests on name/enum/string/comment inference: polarity (toggle on/off), the timestamp side-effect, the exact per-line field set AND order, the connecting-vs-real IP semantics, the filename template, the sv_logdir default, the default-off state, and the console/rcon access class each map to live code.

Mechanism summary: `logplayers` is row index 5 of `logs[MAX_LOG]` (sv_ccmds.c:224), registered as a legacy `Cmd_AddCommand` command (sv_ccmds.c:1829). Its handler `SV_PlayerLogfile_f` calls `SV_Logfile(PLAYER_LOG, false)` — a toggle: if the FILE handle is open it closes it and prints "Player logging off."; if NULL it allocates the next free `player_<svport>_NNNN.log` (NNNN = first non-existing 0000..0999) under sv_logdir and opens it for append, setting log_level=1. Events fire `SV_LogPlayer` → `SV_Write_Log(PLAYER_LOG, level=1, ...)`, which gates on (file open && level<=log_level) and prepends `[<date>].[<level>] ` before the `msg\name\userid\connectIP\realIP\port\userinfo` payload.

One precision nuance (not a defect, kept for the record): the `<port>` in the FILENAME is the server's UDP listen port (NET_UDPSVPort, sv_ccmds.c:86), whereas "the port" in the per-LINE content is the client's `remote_address.port`. The description uses "port" correctly for each context and does not conflate them. Likewise "the port" in the content clause is specifically the connecting (proxy/peer) address's port, not the realip's port — accurate, just not spelled out. Both are MATCH-grade; neither rises to NEAR-MISS.

Classification rationale: every clause reduces to a checkable fact confirmed at its enforcing line (PROC-1). No JUDGMENT residual (this is a synthesized-from-code user-doc, not an affirm-vs-synthesize call surfaced to me). Therefore TRACED-CLEAN, not C-NEAR-MISS.

## flags_for_review

- [fyi/other/synthesis] The event set in the description ('connect, disconnect, name changes, certain anti-spam kicks') is enumerated from the SV_LogPlayer call sites (src/sv_user.c:473/487, src/sv_main.c:386/3814/3827, src/sv_user.c:2327/2433) rather than a single declared list -- it is illustrative ('such as'), not exhaustive, which the wording reflects. Flagging so a reviewer knows the list is call-site-derived.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "logplayers",
  "type": "command",
  "description": "Toggles a player-activity log on or off (no arguments -- run it once to start logging, again to stop). While on, the server appends a timestamped line for notable per-player events such as connect, disconnect, name changes, and certain anti-spam kicks. Each line records the event, the player name, their user id, their connecting and real IP addresses, the port, and the player's userinfo string.\n\nLog file: written to the server's log directory (sv_logdir, default the working directory) as player_<port>_NNNN.log.\n\nDefault: off.\nSet by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:4119. Registration: log_t logs[] entry name 'logplayers' -> SV_PlayerLogfile_f (src/sv_ccmds.c:224), loop-registered via Cmd_AddCommand at src/sv_ccmds.c:1828-1829 (admin/rcon). NOT in ucmds[] (src/sv_user.c:3299+, grep empty) -> admin-only. Toggle: SV_PlayerLogfile_f -> SV_Logfile(PLAYER_LOG, false) (src/sv_ccmds.c:203); SV_Logfile (src/sv_ccmds.c:84-143) is the on/off toggle (close+message_off if open & !newlog, else open); no args read. Record content + author of behavior: SV_LogPlayer (src/sv_main.c:4109) -> SV_Write_Log(PLAYER_LOG, level, va(\"%s\\\\%s\\\\%i\\\\%s\\\\%s\\\\%i%s\\n\", msg, name, cl->userid, base-adr, realip, port, info)) at src/sv_main.c:4119-4129 -- fields = event\\name\\userid\\ip\\realip\\port<userinfo>. Event strings (the msg arg) observed at call sites: 'connect' (src/sv_user.c:487), 'disconnect' (src/sv_main.c:386), 'name change'/'name spam' (src/sv_main.c:3827/3814), 'userinfo spam' (src/sv_user.c:2327), 'topcolor spam' (src/sv_user.c:2433), 'dropped %d' VIP (src/sv_user.c:473) -> 'connect, disconnect, name changes, certain anti-spam kicks'. Timestamp prefix: SV_Write_Log default case (PLAYER_LOG is not FRAG/MOD_FRAG) prepends '[%s].[%d] ' date+level (src/sv_main.c:4159-4160); date from SV_TimeOfDay '%a %b %d, %H:%M:%S %Y' (src/sv_main.c:4148). Filename player_<port>_NNNN.log: src/sv_ccmds.c:114 prefix 'player_' (table src/sv_ccmds.c:224) + sv_logdir (default '.', src/sv_main.c:131). Append: fopen 'a' (src/sv_ccmds.c:125). PLAYER_LOG is NOT force-new (only FRAG/MOD_FRAG are, src/sv_ccmds.c:109) so re-enabling reuses the last file when present (lines 120-121) -- user doc says 'appends', accurate either way; numbering detail omitted as secondary. Default off: sv_logfile NULL at table init. F-MV1: grep ktx/src 'logplayers' -> empty, no override. log_level gate: SV_LogPlayer passes level mostly 1; logs[PLAYER_LOG].log_level set to 1 on open (SV_Logfile default case, src/sv_ccmds.c:141), SV_Write_Log drops msg if log_level<level (src/sv_main.c:4145) -- all player events use level 1 so all pass; not surfaced (no user-tunable knob).",
  "description_proposed": null
}
```
