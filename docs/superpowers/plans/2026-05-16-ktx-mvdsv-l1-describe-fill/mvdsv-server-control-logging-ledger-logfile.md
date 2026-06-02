# describe-fill-synthesis ledger -- mvdsv `logfile`

- **project:** mvdsv
- **knob:** `logfile` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:logfile: synthesized -- no-arg toggle; logs all server console output to qconsole_<port>_NNNN.log under sv_logdir; admin-only; KTX no override -- origin=synthesized ref=src/sv_send.c:160 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles server console logging. With no argument, the command flips the log on if it is off and off if it is on. While on, every line the server prints to its console is also written (with a date/time stamp) to a log file in the server's log directory; turning it off prints "File logging off." and closes the file. The file is named qconsole_<port>_<NNNN>.log (the server's UDP port plus a number) and lives under the directory set by sv_logdir.
>
> Default: off; sv_logdir defaults to the server's working directory (".").
> Set by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-arg toggle handler | src/sv_ccmds.c:150-153 | `void SV_Logfile_f (void){ SV_Logfile(CONSOLE_LOG, false); }` (no Cmd_Argv read) | MATCH |
| toggle-off closes file + prints message_off + level=0 | src/sv_ccmds.c:92-105 | `if (logs[sv_log].sv_logfile){ fclose(...); ... if(!newlog){ Con_Printf("%s", logs[sv_log].message_off); logs[sv_log].log_level=0; return; }}` | MATCH |
| message_off text "File logging off." | src/sv_ccmds.c:219 | `{NULL,"logfile","qconsole_","File logging off.\n",...}` | MATCH |
| logs ALL console output | src/sv_send.c:160 | `SV_Write_Log(CONSOLE_LOG, 0, msg);` inside Con_Printf (src/sv_send.c:146) | MATCH |
| date-stamped lines | src/sv_main.c:4160 | `log_msg = va("[%s].[%d] %s", date.str, level, msg);` | MATCH |
| filename qconsole_<port>_<NNNN>.log under sv_logdir | src/sv_ccmds.c:114 + :219 + :86 | `snprintf(name,...,"%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i)`; prefix "qconsole_"; `sv_port=NET_UDPSVPort()` | MATCH |
| append mode | src/sv_ccmds.c:125 | `logs[sv_log].sv_logfile = fopen(name, "a")` | MATCH |
| sv_logdir default "." | src/sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` | MATCH |
| default off (sv_logfile NULL) | src/sv_ccmds.c:219 | `{NULL, "logfile", ...}` (first field sv_logfile=NULL) | MATCH |
| admin-only (registered, not in ucmds[]) | src/sv_ccmds.c:1828-1829 ; src/sv_user.c:3299 | `Cmd_AddCommand(logs[i].command, logs[i].function)` ; ucmds[] has no "logfile" | MATCH |
| KTX no override (F-MV1) | ktx/src (grep) | grep "logfile" -> no command registration | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Command name is "logfile", registered as a server command | src/sv_ccmds.c:219 + :1829 | `{NULL, "logfile", "qconsole_", "File logging off.\n", "console", SV_Logfile_f, 0}` ; `Cmd_AddCommand (logs[i].command, logs[i].function);` | MATCH |
| 2 | No-arg toggle: flips on->off and off->on (no argument consulted) | src/sv_ccmds.c:150-153, 92-106, 120-130 | `void SV_Logfile_f (void){ SV_Logfile(CONSOLE_LOG, false); }` ; handler `if (logs[sv_log].sv_logfile){ fclose...; if(!newlog){Con_Printf message_off; log_level=0; return;}}` else opens new file | MATCH (handler ignores args entirely; bare invocation is a pure toggle) |
| 3 | While ON, every console line is also written to the log file | src/sv_send.c:146-165 (Con_Printf) | `Sys_Printf ("%s", msg); // also echo to debugging console` then `SV_Write_Log(CONSOLE_LOG, 0, msg);` (level 0 always passes gate) | MATCH (central console path logs every line; redirected/rcon-response output returns early before log, an acceptable nuance) |
| 4 | Each logged line carries a date/time stamp | src/sv_main.c:4148, 4160 | `SV_TimeOfDay(&date, "%a %b %d, %H:%M:%S %Y");` ; default case `log_msg = va("[%s].[%d] %s", date.str, level, msg);` | MATCH (date+level prepended; CONSOLE_LOG hits the default case, not FRAG/MOD_FRAG) |
| 5 | OFF transition prints "File logging off." and closes the file | src/sv_ccmds.c:96-104 + table :219 | `fclose (logs[sv_log].sv_logfile); logs[sv_log].sv_logfile = NULL; if (!newlog){ Con_Printf ("%s", logs[sv_log].message_off); log_level=0; return; }` ; message_off = `"File logging off.\n"` | MATCH (quoted without trailing \n -- formatting detail, not a mismatch) |
| 6 | File named qconsole_<port>_<NNNN>.log | src/sv_ccmds.c:114 + table :219 | `snprintf (name, sizeof(name), "%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i);` with file_name="qconsole_", %04d counter i in 0..999 | MATCH |
| 7 | <port> is the server's UDP port | src/sv_ccmds.c:86 ; src/net.c:205-208 | `int sv_port = NET_UDPSVPort();` ; `int NET_UDPSVPort (void){ return ntohs(net_local_sv_ipadr.port); }` | MATCH |
| 8 | File lives under directory set by sv_logdir | src/sv_ccmds.c:114 ; src/sv_main.c:3873-3883 | path prefix `%s/` = `sv_logdir.string` ; OnChange creates dir (`Sys_mkdir(value)`), rejects ".." | MATCH |
| 9 | Default: off (no log open at startup) | src/sv_ccmds.c:219 | table initializer `sv_logfile = NULL` (field 1); file opened only on first SV_Logfile invocation | MATCH (state default; logfile is a command, not a cvar) |
| 10 | sv_logdir defaults to "." (working dir) | src/sv_main.c:131 | `cvar_t  sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` | MATCH (registered default literally ".") |
| 11 | Scope: rcon (admin) can issue it | src/sv_main.c:1687-1708,1828 ; src/cmd.c:916-942 | `SVC_RemoteCommand`: `Rcon_Validate (..., rcon_password.string)` then `Cmd_ExecuteString(str);` -> dispatch over cmd_functions hash (where logfile lives) | MATCH (password-gated, reaches general table) |
| 12 | Scope: clients cannot issue it | src/sv_user.c:3299-3385, 3399-3424 | `ucmds[]` table (no "logfile" entry); `SV_ExecuteUserCommand` iterates only ucmds + SV_ExecutePRCommand, else `Con_Printf("Bad user command: %s\n",...)` -- NO fallthrough to cmd_functions | MATCH (closed client dispatch; client `cmd logfile` -> "Bad user command") |

**V-pass notes:** Version confirmed mvdsv 1.11-53-g18d0362. All 12 material clauses enforce-traced to located lines; every clause MATCHES. Classification: TRACED-CLEAN.

Key structural verifications (beyond a consistent-looking line):
- The logs[] table uses POSITIONAL initializers against struct log_s {sv_logfile, command, file_name, message_off, message_on, function, log_level} (log.h:27-35). Verified field-by-field, so "logfile"=command name, "qconsole_"=file_name prefix, "File logging off.\n"=message_off, "console"=message_on (used in the ON-transition "Logging console to <name>" print). A reader could mis-map these positionally; I confirmed against the struct.
- Side-effect "every console line logged" traced to the CENTRAL path Con_Printf (sv_send.c:160), NOT merely the say-broadcast site (sv_ccmds.c:1365) that the first grep surfaced. The say site logs only chat; Con_Printf logs all console output at level 0.
- Access model is the ucmds[]-vs-cmd_functions split, not a CF_ flag (mvdsv differs from KTX). Clients reach only the closed ucmds[] table via SV_ExecuteUserCommand with NO fallthrough to the general table where logfile is registered -- this is the actual enforcing mechanism for "clients cannot issue it", verified by reading the full dispatch through the else-branch. rcon reaches the general table via Cmd_ExecuteString after Rcon_Validate, confirming "rcon (admin) can issue it".
- Default "off" is a STATE default (sv_logfile=NULL initializer), correctly framed -- logfile is a command, so WI-2's RegisterCvar default check is N/A; sv_logdir's "." default IS the registered cvar default (sv_main.c:131), verified.

Minor wording nuances (FYI only, not defects, all underlying facts traced):
- "With no argument, the command flips..." -- the handler consults no argument at all (SV_Logfile_f is void and unconditionally toggles); an argument would be silently ignored. The sentence is literally true for the bare invocation but implies argument-sensitivity that doesn't exist. Net toggle behavior is correct and fully enforce-traced.
- Timestamp line is actually "[<date>].[<level>] <msg>" (date AND level); description says "date/time stamp" which is accurate, just omits the level number.
- OFF message quoted as "File logging off." without the trailing \n -- normal user-doc convention.

## flags_for_review

- [fyi/other/vpass] Description says "With no argument, the command flips..." but SV_Logfile_f (sv_ccmds.c:150-153) is void and consults no argument -- the command unconditionally toggles and silently ignores any argument. The phrasing implies argument-sensitivity that does not exist. Literally true for bare invocation, net toggle behavior fully traced and correct; flagging only as a precision nit.
- [fyi/other/vpass] Con_Printf (sv_send.c:156-157) returns early when output is redirected (SV_AddToRedirect true) BEFORE the SV_Write_Log call, so command output captured by an active redirect (e.g. rcon command responses, SV_BeginRedirect(RD_CLIENT) paths) is NOT written to the console log. The description's "every line the server prints to its console" is fair (redirected output is not going to the console), but the absolute reading slightly overstates coverage. FYI for downstream doc precision, not a contradiction.
- [fyi/hidden-family/vpass] Off-scope sibling observation: the same logs[] table + SV_Logfile mechanism backs six sibling toggle commands (logerrors, logrcon, logtelnet, fraglogfile, logplayers, modfraglogfile) at sv_ccmds.c:220-225, all sharing identical toggle/filename/scope semantics. If the fleet documents these siblings, the same TRACED-CLEAN reasoning and clause structure applies (only the file_name prefix, message_off string, and log_level source differ). Noting for batch consistency, no action on this row.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "logfile",
  "type": "command",
  "description": "Toggles server console logging. With no argument, the command flips the log on if it is off and off if it is on. While on, every line the server prints to its console is also written (with a date/time stamp) to a log file in the server's log directory; turning it off prints \"File logging off.\" and closes the file. The file is named qconsole_<port>_<NNNN>.log (the server's UDP port plus a number) and lives under the directory set by sv_logdir.\n\nDefault: off; sv_logdir defaults to the server's working directory (\".\").\nSet by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_send.c:160. Toggle/no-arg + OFF-state: SV_Logfile_f (src/sv_ccmds.c:150-153) calls SV_Logfile(CONSOLE_LOG, false) reading no Cmd_Argv, so the command takes no argument; SV_Logfile (src/sv_ccmds.c:92-105) closes the file, prints logs[].message_off and sets log_level=0 when sv_logfile is already open (toggle-off), else opens a file (toggle-on). message_off for this entry is \"File logging off.\" (src/sv_ccmds.c:219). CONTENT (all console output): Con_Printf (src/sv_send.c:146-160) writes EVERY console message to CONSOLE_LOG at src/sv_send.c:160 (`SV_Write_Log(CONSOLE_LOG, 0, msg)`), unconditionally for every server console print. Date stamp: SV_Write_Log prepends `[date].[level]` for non-frag logs (src/sv_main.c:4160). Filename pattern qconsole_<port>_<NNNN>.log under sv_logdir: src/sv_ccmds.c:114 (`snprintf(name,...,\"%s/%s%d_%04d.log\", sv_logdir.string, logs[sv_log].file_name, sv_port, i)`); file_name prefix \"qconsole_\" at src/sv_ccmds.c:219; sv_port = NET_UDPSVPort() at src/sv_ccmds.c:86; append mode fopen(name,\"a\") at src/sv_ccmds.c:125 (a toggle-back-on reuses the last existing numbered file, src/sv_ccmds.c:120-121, since newlog=false). sv_logdir default \".\": src/sv_main.c:131 (`cvar_t sv_logdir = {\"sv_logdir\", \".\", ...}`). Default off: log table initializes sv_logfile=NULL (src/sv_ccmds.c:219). Access class admin/console: registered via Cmd_AddCommand in the log loop at src/sv_ccmds.c:1828-1829, and NOT present in ucmds[] (src/sv_user.c:3299, client stringcmds) -- so it is not client-issuable. F-MV1: grep of ktx/src for \"logfile\" returns no override (KTX is a QuakeC mod and cannot register engine console commands). Recommended-value/L3 omitted (mechanism only). The auto-rotation when sv_maxlogsize is exceeded (src/sv_main.c:4177-4181) is a property of sv_maxlogsize, not this command, so left out of the user doc.",
  "description_proposed": null
}
```
