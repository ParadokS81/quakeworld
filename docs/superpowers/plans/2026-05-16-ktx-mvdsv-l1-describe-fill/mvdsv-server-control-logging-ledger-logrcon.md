# describe-fill-synthesis ledger -- mvdsv `logrcon`

- **project:** mvdsv
- **knob:** `logrcon` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:logrcon: synthesized -- no-arg toggle; logs every rcon request (sender IP + command, incl. bad/banned) to rcon_<port>_NNNN.log under sv_logdir; admin-only; KTX no override -- origin=synthesized ref=src/sv_main.c:1813 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles remote-console (rcon) logging. With no argument, the command flips the log on if it is off and off if it is on. While on, every rcon request the server receives is recorded (with a date/time stamp) in a separate log file: the sender's IP address and the command text for accepted rcon, plus failed/bad rcon attempts and rcon from banned addresses. Turning it off prints "Rcon logging off." and closes the file. The file is named rcon_<port>_<NNNN>.log (the server's UDP port plus a number) and lives under the directory set by sv_logdir. Useful as an audit trail of who is issuing remote admin commands.
>
> Default: off; sv_logdir defaults to the server's working directory (".").
> Set by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-arg toggle handler | src/sv_ccmds.c:170-173 | `void SV_RconLogfile_f (void){ SV_Logfile(RCON_LOG, false); }` | MATCH |
| toggle-off closes file + prints message_off + level=0 | src/sv_ccmds.c:92-105 | shared SV_Logfile toggle block | MATCH |
| message_off text "Rcon logging off." | src/sv_ccmds.c:221 | `{NULL,"logrcon","rcon_","Rcon logging off.\n",...}` | MATCH |
| logs accepted rcon: sender IP + command | src/sv_main.c:1813-1815 | `SV_Write_Log(RCON_LOG, 1, va("Rcon from %s (%s): %s\n", NET_AdrToString(net_from), plain, net_message.data + 4))` | MATCH |
| logs bad/failed rcon attempts | src/sv_main.c:1848-1850 | `SV_Write_Log(RCON_LOG, 1, va("Bad rcon from %s..."))` | MATCH |
| logs rcon from banned IP | src/sv_main.c:1854 | `SV_Write_Log(RCON_LOG, 1, va("Rcon from banned IP: %s: %s\n", ...))` | MATCH |
| date-stamped lines | src/sv_main.c:4160 | `log_msg = va("[%s].[%d] %s", date.str, level, msg);` | MATCH |
| filename rcon_<port>_<NNNN>.log under sv_logdir | src/sv_ccmds.c:114 + :221 + :86 | format string; prefix "rcon_"; `sv_port=NET_UDPSVPort()` | MATCH |
| append mode | src/sv_ccmds.c:125 | `fopen(name, "a")` | MATCH |
| sv_logdir default "." | src/sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", ...}` | MATCH |
| default off (sv_logfile NULL) | src/sv_ccmds.c:221 | `{NULL, "logrcon", ...}` | MATCH |
| admin-only (registered, not in ucmds[]) | src/sv_ccmds.c:1828-1829 ; src/sv_user.c:3299 | log-loop Cmd_AddCommand; no "logrcon" in ucmds[] | MATCH |
| KTX no override (F-MV1) | ktx/src (grep) | grep "logrcon" -> none | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Command exists named "logrcon", handler SV_RconLogfile_f | sv_ccmds.c:221 | `{NULL, "logrcon", "rcon_", "Rcon logging off.\n", "rcon", SV_RconLogfile_f, 0}` | MATCH |
| 2 | Registered as a server/operator command (not cvar) | sv_ccmds.c:1828-1829 | `for (i=MIN_LOG;i<MAX_LOG;++i) Cmd_AddCommand(logs[i].command, logs[i].function);` (inside SV_InitOperatorCommands) | MATCH |
| 3 | "no argument -> flips on/off" (toggle on file-open state) | sv_ccmds.c:92-106 | `if (logs[sv_log].sv_logfile){ fclose(...); sv_logfile=NULL; if(!newlog){Con_Printf(message_off); log_level=0; return;}}` then else-path opens new file | MATCH (handler reads NO Cmd_Argv; any arg is ignored, always toggles) |
| 4 | While on, every rcon request recorded | sv_main.c:1812-1815,1848-1850,1854; gate sv_main.c:4142-4146 | `SV_Write_Log(RCON_LOG,1,va("Rcon from %s...))`; gate `if(log_level<level)return;` with RCON log_level=1 (sv_ccmds.c:141) so 1<1 false -> writes | MATCH |
| 5 | Records sender IP + command text for accepted rcon | sv_main.c:1812-1815 | `va("Rcon from %s (%s): %s\n", NET_AdrToString(net_from), plain, net_message.data+4)` | MATCH (plain = connected-player name if matched, else IP-only form) |
| 6 | Records failed/bad rcon attempts | sv_main.c:1847-1850 | `va("Bad rcon from %s (%s):\n%s\n", ...)` | MATCH |
| 7 | Records rcon from banned addresses | sv_main.c:1854 | `va("Rcon from banned IP: %s: %s\n", NET_AdrToString(net_from), net_message.data+4)` | MATCH |
| 8 | Each line has a date/time stamp | sv_main.c:4148,4160 | `SV_TimeOfDay(&date,"%a %b %d, %H:%M:%S %Y")`; `log_msg=va("[%s].[%d] %s",date.str,level,msg)` | MATCH |
| 9 | Separate log file (distinct from console) | log.h:24-25; sv_ccmds.c:221 | `RCON_LOG` own enum slot; file_name prefix `"rcon_"` distinct from console `"qconsole_"` | MATCH |
| 10 | Turning off prints "Rcon logging off." | sv_ccmds.c:102 + :221 | `Con_Printf("%s", logs[sv_log].message_off)`; message_off=`"Rcon logging off.\n"` | MATCH |
| 11 | Turning off closes the file | sv_ccmds.c:96-97 | `fclose(logs[sv_log].sv_logfile); logs[sv_log].sv_logfile=NULL;` | MATCH |
| 12 | Filename rcon_<port>_<NNNN>.log | sv_ccmds.c:114 | `snprintf(name,...,"%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i)` (file_name="rcon_", _%04d zero-padded) | MATCH |
| 13 | <port> = server's UDP port | sv_ccmds.c:86 + net.c:205-207 | `int sv_port = NET_UDPSVPort();` -> `return ntohs(net_local_sv_ipadr.port);` | MATCH |
| 14 | Lives under directory set by sv_logdir | sv_ccmds.c:114 | path prefix `sv_logdir.string` | MATCH |
| 15 | Default: off (initial logging state) | sv_ccmds.c:217-226 | `logs[]` table inits sv_logfile=NULL for all; no startup auto-open of RCON_LOG | MATCH |
| 16 | sv_logdir default "." | sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` | MATCH |
| 17 | Set by: clients cannot issue it | sv_user.c:3399-3424 (closed ucmds whitelist, no Cmd_ExecuteString fallthrough); logrcon absent from ucmds[] | `for(u=ucmds;u->name;u++) if(!strcmp(Cmd_Argv(0),u->name))...` then PRCommand, then "Bad user command" | MATCH |
| 18 | Set by: rcon (admin only) | sv_main.c:1701-1774 (two-tier rcon) | master_rcon_password path do_cmd=true (no blocklist); BUT rcon_password path runs blocklist sv_main.c:1763 `!strncasecmp(tstr,"log",3)` -> bad_cmd=true -> do_cmd=false | MISMATCH-PARTIAL (regular rcon_password admin is BLOCKED for log* commands; only master_rcon_password tier can run logrcon via rcon) |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. 17 of 18 clauses TRACED-CLEAN to enforcing lines (incl. callee-follow: handler SV_RconLogfile_f -> SV_Logfile toggle in sv_ccmds.c, plus SV_Write_Log date-stamp/gate in sv_main.c, plus the client-vs-operator command boundary in sv_user.c). All core behavior is correct: toggle semantics, what is logged (accepted/bad/banned rcon with IP+command+timestamp), the rcon_<port>_<NNNN>.log naming, sv_logdir default ".", the "Rcon logging off." OFF print + fclose, separate file, and "clients cannot issue it."

The ONE imprecision driving C-NEAR-MISS is the access-class clause "Set by: ... rcon (admin only)". Per WI-2, access-class claims must trace to the actual access check, not the command name. MVDSV has TWO rcon password tiers: master_rcon_password (sv_main.c:46, set only in server.cfg) and the regular rcon_password cvar (sv_main.c:71). The rcon dispatch (SV_RemoteCommand region, sv_main.c:1701-1774) runs a "normal rcon can't use these commands" blocklist ONLY on the rcon_password tier, and sv_main.c:1763 `!strncasecmp(tstr, "log", 3)` blocks EVERY command starting with "log" -- including logrcon -- setting bad_cmd=true -> do_cmd=false. So an operator authenticating with the ordinary rcon_password (what most readers picture as "admin rcon") CANNOT run logrcon; it is rejected as "Command not valid." Only the higher master_rcon_password tier can issue logrcon remotely. The proposed clause is not flatly contradicted (it IS settable via rcon, via the master tier) and "admin only / clients cannot issue it" is directionally true, but the real gate is narrower/more conditional than "rcon (admin only)" implies -- this is exactly the flavour-C near-miss shape: an access clause whose stated scope is broader than the enforcing check. A precise user-doc should say "via the server console, or remotely only with the master rcon password (the regular rcon_password is blocked for log* commands)."

Minor, non-blocking framing note (not a defect): clause 3 ("With no argument, the command flips...") is accurate, but the handler does not accept on/off arguments at all -- it ignores any argument and always toggles on file-open state. "With no argument" is fine as user-doc framing.

## flags_for_review

- [review/cross-mod-override/vpass] logrcon (and all log* commands) are blocked on the regular rcon_password tier by the sv_main.c:1763 blocklist `!strncasecmp(tstr,"log",3)`; only master_rcon_password (server.cfg-only) can run them via rcon. The proposed 'rcon (admin only)' scope is broader than the enforcing check. Recommend tightening the Set-by line to distinguish the master-rcon tier from the regular rcon_password. This same blocklist (rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line) likely affects the scope clauses of every OTHER log* command (logfile, logerrors, logtelnet, fraglogfile, logplayers, modfraglogfile) and the listed file/admin commands -- worth a fleet-wide check on their 'Set by' lines.
- [fyi/other/vpass] The 'plain' field in accepted/bad rcon log lines (sv_main.c:1777-1797, 1812-1815) is the connected-player NAME if the rcon packet's source address+port matches a live client on the server; otherwise the log line uses the IP-only form. The description's 'sender's IP address' is correct (NET_AdrToString(net_from) is always present), but the optional parenthetical player name is an extra datum not mentioned -- fine to omit for a user-doc, noting it here for completeness.
- [fyi/other/vpass] Rotation/size detail (out of scope but adjacent): when on, sv_maxlogsize>0 triggers SV_Logfile(sv_log,true) at sv_main.c:4177-4181, which opens a NEW numbered file (rcon_<port>_<NNNN+1>.log). The '_<NNNN>' index thus also increments on size-based rotation, not only on restart. Not contradicted by the description (which just says 'a number'); FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "logrcon",
  "type": "command",
  "description": "Toggles remote-console (rcon) logging. With no argument, the command flips the log on if it is off and off if it is on. While on, every rcon request the server receives is recorded (with a date/time stamp) in a separate log file: the sender's IP address and the command text for accepted rcon, plus failed/bad rcon attempts and rcon from banned addresses. Turning it off prints \"Rcon logging off.\" and closes the file. The file is named rcon_<port>_<NNNN>.log (the server's UDP port plus a number) and lives under the directory set by sv_logdir. Useful as an audit trail of who is issuing remote admin commands.\n\nDefault: off; sv_logdir defaults to the server's working directory (\".\").\nSet by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1813. Toggle/no-arg + OFF-state: SV_RconLogfile_f (src/sv_ccmds.c:170-173) calls SV_Logfile(RCON_LOG, false) reading no Cmd_Argv; SV_Logfile (src/sv_ccmds.c:92-105) toggle. message_off \"Rcon logging off.\" at src/sv_ccmds.c:221. CONTENT (rcon activity): the rcon packet handler in src/sv_main.c writes RCON_LOG on every branch -- accepted rcon src/sv_main.c:1813-1815 (`Rcon from <ip> (<plainip>): <cmd>` / `Rcon from <ip>: <cmd>`), bad/failed rcon src/sv_main.c:1848-1850 (`Bad rcon from <ip>...`), and banned-IP rcon src/sv_main.c:1854 (`Rcon from banned IP: <ip>: <cmd>`). So the log records sender IP + command text for accepted rcon and also failed and banned attempts -- an audit trail of remote-admin command use. (The plaintext IP in parentheses appears when the requester is behind a proxy, plain[0] set.) Date stamp: src/sv_main.c:4160. Filename rcon_<port>_<NNNN>.log under sv_logdir: prefix \"rcon_\" at src/sv_ccmds.c:221, format src/sv_ccmds.c:114, port src/sv_ccmds.c:86, append fopen(\"a\") src/sv_ccmds.c:125. sv_logdir default \".\" src/sv_main.c:131. Default off: sv_logfile=NULL src/sv_ccmds.c:221. Access class admin/console: Cmd_AddCommand loop src/sv_ccmds.c:1828-1829, not in ucmds[] (src/sv_user.c:3299). F-MV1: grep ktx/src for \"logrcon\" -> no override. The \"audit trail\" phrase is a plain restatement of the observable content (who+what for every rcon), not a recommended-value/opinion; mechanism only. sv_maxlogsize rotation belongs to that cvar.",
  "description_proposed": null
}
```
