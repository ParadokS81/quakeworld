# describe-fill-synthesis ledger -- mvdsv `logerrors`

- **project:** mvdsv
- **knob:** `logerrors` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:logerrors: synthesized -- no-arg toggle; logs server error messages to qerror_<port>_NNNN.log under sv_logdir; admin-only; KTX no override -- origin=synthesized ref=src/sv_sys_unix.c:341 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles server error logging. With no argument, the command flips the log on if it is off and off if it is on. While on, server error messages are written (with a date/time stamp) to a separate log file; turning it off prints "Error logging off." and closes the file. The file is named qerror_<port>_<NNNN>.log (the server's UDP port plus a number) and lives under the directory set by sv_logdir.
>
> Default: off; sv_logdir defaults to the server's working directory (".").
> Set by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-arg toggle handler | src/sv_ccmds.c:160-163 | `void SV_ErrorLogfile_f (void){ SV_Logfile(ERROR_LOG, false); }` | MATCH |
| toggle-off closes file + prints message_off + level=0 | src/sv_ccmds.c:92-105 | shared SV_Logfile toggle block | MATCH |
| message_off text "Error logging off." | src/sv_ccmds.c:220 | `{NULL,"logerrors","qerror_","Error logging off.\n",...}` | MATCH |
| logs server errors (Sys_Error) | src/sv_sys_unix.c:341 ; src/sv_sys_win.c:416 | `SV_Write_Log (ERROR_LOG, 1, va ("ERROR: %s\n", text))` | MATCH |
| also mirrors console msg when sv_error set | src/sv_send.c:163-164 | `if (sv_error) SV_Write_Log(ERROR_LOG, 1, msg);` | MATCH |
| date-stamped lines | src/sv_main.c:4160 | `log_msg = va("[%s].[%d] %s", date.str, level, msg);` | MATCH |
| filename qerror_<port>_<NNNN>.log under sv_logdir | src/sv_ccmds.c:114 + :220 + :86 | format string; prefix "qerror_"; `sv_port=NET_UDPSVPort()` | MATCH |
| append mode | src/sv_ccmds.c:125 | `fopen(name, "a")` | MATCH |
| sv_logdir default "." | src/sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", ...}` | MATCH |
| default off (sv_logfile NULL) | src/sv_ccmds.c:220 | `{NULL, "logerrors", ...}` | MATCH |
| admin-only (registered, not in ucmds[]) | src/sv_ccmds.c:1828-1829 ; src/sv_user.c:3299 | log-loop Cmd_AddCommand; no "logerrors" in ucmds[] | MATCH |
| KTX no override (F-MV1) | ktx/src (grep) | grep "logerrors" -> none | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Result |
|---|--------|--------------------|---------| ------|
| 1 | Command that toggles server error logging | src/sv_ccmds.c:220 / :1828-1829 / :160-162 | `{NULL,"logerrors","qerror_","Error logging off.\n","errors",SV_ErrorLogfile_f,0}` ; `Cmd_AddCommand(logs[i].command, logs[i].function)` ; `SV_ErrorLogfile_f(void){ SV_Logfile(ERROR_LOG,false); }` | MATCH |
| 2 | No-arg -> flips on if off / off if on | src/sv_ccmds.c:92-106 | `if (logs[sv_log].sv_logfile){ fclose(...); sv_logfile=NULL; if(!newlog){ Con_Printf(message_off); log_level=0; return; } } ...else falls through to open` | MATCH (state-driven flip; handler ignores any argument, see notes) |
| 3 | While on: messages written with a date/time stamp | src/sv_main.c:4148, 4160, 4166 + src/sv_main.c:4072-4100 | `SV_TimeOfDay(&date,"%a %b %d, %H:%M:%S %Y");` ... `log_msg = va("[%s].[%d] %s", date.str, level, msg);` ... `fprintf(logs[sv_log].sv_logfile,"%s",log_msg)`; in SV_TimeOfDay `strftime(date->str,...,timeformat,newtime)` | MATCH |
| 4 | Written to a separate log file (own fd) | src/sv_ccmds.c:114, 125 + src/log.h:24-35 | `logs[sv_log].sv_logfile = fopen(name,"a")` ; ERROR_LOG is its own enum slot with its own `sv_logfile` member in `log_t logs[MAX_LOG]` | MATCH |
| 5 | Turning off prints "Error logging off." and closes the file | src/sv_ccmds.c:96, 102 + :220 | `fclose(logs[sv_log].sv_logfile);` ... `Con_Printf("%s", logs[sv_log].message_off);` with `message_off="Error logging off.\n"` | MATCH |
| 6 | File named qerror_<port>_<NNNN>.log (UDP port + number) | src/sv_ccmds.c:86, 114, 121 + :220 | `int sv_port = NET_UDPSVPort();` ; `snprintf(name,...,"%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i);` with `file_name="qerror_"` (NNNN = 4-digit zero-padded counter) | MATCH |
| 7 | Lives under directory set by sv_logdir | src/sv_ccmds.c:114 | `"%s/%s%d_%04d.log", sv_logdir.string, ...` (sv_logdir.string is the directory prefix) | MATCH |
| 8 | Default: off | src/sv_ccmds.c:220 (init) + src/sv_main.c:4142 | table initializes `sv_logfile = NULL` (first member) -> `SV_Write_Log`: `if (!(logs[sv_log].sv_logfile && *msg)) return;` so nothing logged until toggled on | MATCH |
| 9 | sv_logdir defaults to "." | src/sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` | MATCH |
| 10 | Set by server console / rcon; admin only; clients cannot issue it | src/sv_user.c:3399-3424 (client path) ; src/sv_main.c:1687,1819,1828 (rcon) ; src/sv_ccmds.c:1828 (operator-cmd registration) | client `SV_ExecuteUserCommand` matches only `ucmds[]` (no logerrors entry), else `SV_ExecutePRCommand()` else `"Bad user command"` -- never reaches `Cmd_ExecuteString`; rcon `SVC_RemoteCommand` (password-gated) -> `Cmd_ExecuteString(str)`; logerrors registered in `SV_InitOperatorCommands` | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed mvdsv 1.11-53-g18d0362. All 10 material clauses map to located, verified enforcing lines (incl. adjacent comments/struct layout). No clause is name/string/enum inference.

Key trace chain: logerrors is row ERROR_LOG in the `logs[MAX_LOG]` table (sv_ccmds.c:217-226); registered as a plain operator command via Cmd_AddCommand in SV_InitOperatorCommands (sv_ccmds.c:1828-1829); handler SV_ErrorLogfile_f -> SV_Logfile(ERROR_LOG,false). Struct field order verified against log.h:27-35 (sv_logfile, command, file_name, message_off, message_on, function, log_level), confirming "Error logging off.\n" is the message_off field (printed at toggle-off, sv_ccmds.c:102) and "errors" is message_on (printed in the "Logging errors to <file>" line, sv_ccmds.c:123 -- not surfaced in the description, which is fine). The date/time stamp is enforced in SV_Write_Log's default branch (ERROR_LOG is not FRAG/MOD_FRAG), prepending "[%s].[%d] " with date.str from strftime("%a %b %d, %H:%M:%S %Y").

Minor precision (NOT defects, no fix needed):
- Clause 2: "With no argument, the command flips" is observably exact, but mechanism is state-driven (file open vs closed), not argument parsing. The handler always calls SV_Logfile(ERROR_LOG,false) and never reads Cmd_Argv -- so ANY argument is ignored and it still flips. Phrasing is accurate at user-doc altitude; could optionally note "any argument is ignored."
- Clause 9: registered default is literally "." (a relative path); the gloss "server's working directory" is a correct interpretation.
- "server error messages": the two ERROR_LOG write sites are Sys_Error (fatal server errors; sv_sys_unix.c:341 / sv_sys_win.c:416) and Con_Printf-while-sv_error-set (sv_send.c:163-164). Framing as "server error messages" is accurate.

Access-class claim (WI-2) was traced to dispatch code, not inferred from the "SV_InitOperatorCommands" name: client stringcmd dispatch (SV_ExecuteUserCommand) only consults ucmds[] (full table read sv_user.c:3299-3384, terminates {NULL,NULL}, contains no logging command) and never falls through to Cmd_ExecuteString; rcon path is password-gated and DOES route to Cmd_ExecuteString. So "rcon (admin only) / clients cannot" is enforced.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "logerrors",
  "type": "command",
  "description": "Toggles server error logging. With no argument, the command flips the log on if it is off and off if it is on. While on, server error messages are written (with a date/time stamp) to a separate log file; turning it off prints \"Error logging off.\" and closes the file. The file is named qerror_<port>_<NNNN>.log (the server's UDP port plus a number) and lives under the directory set by sv_logdir.\n\nDefault: off; sv_logdir defaults to the server's working directory (\".\").\nSet by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:341. Toggle/no-arg + OFF-state: SV_ErrorLogfile_f (src/sv_ccmds.c:160-163) calls SV_Logfile(ERROR_LOG, false) reading no Cmd_Argv; SV_Logfile (src/sv_ccmds.c:92-105) toggles -- close+message_off+log_level=0 if open, else open. message_off \"Error logging off.\" at src/sv_ccmds.c:220. CONTENT (errors only): ERROR_LOG is written from the system error path -- src/sv_sys_unix.c:341 (`SV_Write_Log(ERROR_LOG, 1, va(\"ERROR: %s\\n\", text))`, inside Sys_Error) and the Windows twin src/sv_sys_win.c:416; plus src/sv_send.c:164 where Con_Printf mirrors a message to ERROR_LOG only when the global sv_error flag is set (`if (sv_error) SV_Write_Log(ERROR_LOG, 1, msg);`). So the log captures server error messages, not ordinary console output (that is logfile/CONSOLE_LOG). Date stamp: src/sv_main.c:4160. Filename qerror_<port>_<NNNN>.log under sv_logdir: prefix \"qerror_\" at src/sv_ccmds.c:220, format at src/sv_ccmds.c:114, port src/sv_ccmds.c:86, append fopen(\"a\") src/sv_ccmds.c:125. sv_logdir default \".\" src/sv_main.c:131. Default off: sv_logfile=NULL src/sv_ccmds.c:220. Access class admin/console: Cmd_AddCommand loop src/sv_ccmds.c:1828-1829, not in ucmds[] (src/sv_user.c:3299). F-MV1: grep ktx/src for \"logerrors\" -> no override. Mechanism only; sv_maxlogsize rotation belongs to that cvar, not documented here.",
  "description_proposed": null
}
```
