# describe-fill-synthesis ledger -- mvdsv `logtelnet`

- **project:** mvdsv
- **knob:** `logtelnet` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:logtelnet: hedged -- no-arg toggle opens/closes a qtelnet_*.log file under sv_logdir, but no code writes telnet content to it in this build (telnet subsystem absent); admin-only; KTX no override -- origin=synthesized ref=src/sv_ccmds.c:180 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles telnet logging. With no argument, the command flips the log on if it is off and off if it is on. While on, it opens a log file named qtelnet_<port>_<NNNN>.log (the server's UDP port plus a number) under the directory set by sv_logdir; turning it off prints "Telnet logging off." and closes the file. Note: in this build no telnet-console output is actually written to that file, so it stays empty (see below).
>
> Default: off; sv_logdir defaults to the server's working directory (".").
> Set by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-arg toggle handler | src/sv_ccmds.c:180-183 | `void SV_TelnetLogfile_f (void){ SV_Logfile(TELNET_LOG, false); }` | MATCH |
| toggle-off closes file + prints message_off + level=0 | src/sv_ccmds.c:92-105 | shared SV_Logfile toggle block | MATCH |
| message_off text "Telnet logging off." | src/sv_ccmds.c:222 | `{NULL,"logtelnet","qtelnet_","Telnet logging off.\n",...}` | MATCH |
| opens file qtelnet_<port>_<NNNN>.log under sv_logdir | src/sv_ccmds.c:114 + :222 + :86 | format string; prefix "qtelnet_"; `sv_port=NET_UDPSVPort()` | MATCH |
| append mode | src/sv_ccmds.c:125 | `fopen(name, "a")` | MATCH |
| log_level seeded from telnet_log_level on open | src/sv_ccmds.c:134-136 | `case TELNET_LOG: logs[TELNET_LOG].log_level = Cvar_Value("telnet_log_level"); break;` | MATCH |
| NO content is written (no SV_Write_Log(TELNET_LOG,...) exists) | whole-tree grep | only refs: src/sv_ccmds.c (toggle+table), src/sv_main.c:85-87,3896-3905 (telnet_log_level cvar); no write call, no telnet socket | UNTRACEABLE (no enforcing write-site) -> hedged |
| sv_logdir default "." | src/sv_main.c:131 | `cvar_t sv_logdir = {"sv_logdir", ".", ...}` | MATCH |
| default off (sv_logfile NULL) | src/sv_ccmds.c:222 | `{NULL, "logtelnet", ...}` | MATCH |
| admin-only (registered, not in ucmds[]) | src/sv_ccmds.c:1828-1829 ; src/sv_user.c:3299 | log-loop Cmd_AddCommand; no "logtelnet" in ucmds[] | MATCH |
| KTX no override (F-MV1) | ktx/src (grep) | grep "logtelnet" -> none | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | snippet | verdict |
|---|--------|---------------------|---------|---------|
| 1 | logtelnet is a registered command dispatched to SV_TelnetLogfile_f | sv_ccmds.c:222 (table row) + sv_ccmds.c:1828-1829 (registration loop) | `{NULL, "logtelnet", "qtelnet_", "Telnet logging off.\n", "telnet", SV_TelnetLogfile_f, 0}` ; `for (i=MIN_LOG; i<MAX_LOG; ++i) Cmd_AddCommand (logs[i].command, logs[i].function);` | MATCH |
| 2 | No argument; pure toggle (on if off, off if on) based on current file state | handler sv_ccmds.c:180-183 -> SV_Logfile(TELNET_LOG,false); toggle at sv_ccmds.c:92-106 | `if (logs[sv_log].sv_logfile){ fclose(...); logs[sv_log].sv_logfile=NULL; if(!newlog){ Con_Printf("%s",logs[sv_log].message_off); logs[sv_log].log_level=0; return; } }` then opens new; function reads NO Cmd_Argv/Cmd_Argc | MATCH |
| 3 | While on, opens file named qtelnet_<port>_<NNNN>.log | sv_ccmds.c:114 | `snprintf (name, sizeof(name), "%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i);` with file_name="qtelnet_" (row 222), %04d = NNNN | MATCH |
| 4 | <port> = server UDP port | sv_ccmds.c:86 | `int sv_port = NET_UDPSVPort();` | MATCH |
| 5 | File placed under directory set by sv_logdir | sv_ccmds.c:114 (sv_logdir.string is the %s dir prefix) | `"%s/%s%d_%04d.log", sv_logdir.string, ...` | MATCH |
| 6 | Turning off prints "Telnet logging off." and closes the file | sv_ccmds.c:96-104 (close+print); message string at sv_ccmds.c:222 | `fclose (logs[sv_log].sv_logfile); logs[sv_log].sv_logfile = NULL; ... Con_Printf ("%s", logs[sv_log].message_off);` message_off = "Telnet logging off.\n" | MATCH |
| 7 | No telnet-console output is written -> file stays empty | ABSENCE: all SV_Write_Log callers enumerated (sv_send.c:160/164/334, sv_broadcast.c:617, sv_demo_qtv.c:794, sv_ccmds.c:454/1365, sv_user.c:1873, sv_sys_unix.c:341, sv_sys_win.c:416, pr2_cmds.c:1551, pr_cmds.c:2336, sv_main.c:1813/1815/1848/1850/1854/4119) -- NONE pass TELNET_LOG; no telnet-console source file exists; logs[*].sv_logfile is touched ONLY via SV_Write_Log | `SV_Write_Log(int sv_log,...)` is the sole writer (sv_main.c:4137-4183) and is never invoked with TELNET_LOG; grep for telnet console subsystem returns no files | MATCH (verified by exhaustive absence of any write site) |
| 8 | Default: off (logging not auto-started) | sv_ccmds.c:222 (sv_logfile field initialized NULL); only SV_Logfile(TELNET_LOG,...) call is the handler at sv_ccmds.c:182 | row first field `NULL`; no startup/cbuf/stuffcmd/cmdline invocation of SV_Logfile(TELNET_LOG,...) found | MATCH |
| 9 | sv_logdir defaults to "." | sv_main.c:131 | `cvar_t  sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` | MATCH |
| 10 | Set by server console / rcon (admin only -- clients cannot issue) | sv_user.c:3299-3385 (logtelnet absent from ucmds[]) + sv_user.c:3408-3424 (no fallthrough to general dispatch) ; rcon path sv_main.c:1708 + 1828 | client stringcmd loops ucmds[], then SV_ExecutePRCommand(), else `Con_Printf("Bad user command: %s\n",...)` -- never Cmd_ExecuteString; rcon: `if (Rcon_Validate(remote_command, rcon_password.string))` -> `Cmd_ExecuteString(str);` reaches Cmd_AddCommand handlers | MATCH |

**V-pass notes:** Version confirmed: mvdsv describe == 1.11-53-g18d0362. Trace-discipline reference read and applied per-clause.

Every material clause maps to a located, verified enforcing line. The description is a single-source-of-truth knob: registration, handler, toggle, filename, dir, off-message, and default all live in sv_ccmds.c / sv_main.c / log.h and check out exactly.

The load-bearing clause is #7 (the "empty file" side-effect) -- precisely the flavour-C-prone class (a behavioral/side-effect assertion that could have been hallucinated). I verified it by ABSENCE, the correct method: enumerated all 20-odd SV_Write_Log call sites across the tree (SV_Write_Log being the SOLE writer to any logs[*].sv_logfile FILE*), and NONE pass TELNET_LOG (CONSOLE_LOG / ERROR_LOG / RCON_LOG / FRAG_LOG / MOD_FRAG_LOG / PLAYER_LOG are written; TELNET_LOG is not). Additionally confirmed mvdsv has NO telnet-console subsystem at all (no telnet/console/stdin source file; no telnet refs in server headers) -- so the toggle is vestigial machinery for a feature whose producer side was never implemented or was removed, leaving only the log-file toggle, the telnet_log_level cvar (default "0"), and OnChange_telnetloglevel_var. The PROPOSED's hedge "in this build no telnet-console output is actually written to that file, so it stays empty" is exactly right and correctly source-grounded.

Minor framing (still-true, traceable, acceptable for TRACED-CLEAN): "sv_logdir defaults to the server's working directory" glosses the literal registered default "." (a relative path) -- the literal value "." is verified at sv_main.c:131 and the gloss is a fair interpretation, not an unsupported claim. "admin only" is grounded in the rcon password gate (rcon_password / master_rcon_password via Rcon_Validate) plus the stdin console; clients genuinely cannot reach it because logtelnet is not in ucmds[] and client stringcmds never fall through to Cmd_ExecuteString.

No clause contradicts code; no clause rests on name/enum/string/comment inference without an enforcing read-site (the OPERATOR-CONSOLE-ONLY comment at sv_ccmds.c:38-41 was NOT taken on faith -- the client-vs-rcon dispatch was independently traced). Classification: TRACED-CLEAN.

## flags_for_review

- [review/runtime-dead-suspect/synthesis] logtelnet (and its companion cvar telnet_log_level) is registered and functional as a toggle -- it opens qtelnet_<port>_NNNN.log -- but NO code in the mvdsv tree at this commit ever calls SV_Write_Log(TELNET_LOG, ...). A whole-tree grep for 'telnet' shows the only references are the toggle command, the log-table row, and the telnet_log_level cvar + OnChange handler. Unix Sys_Printf (sv_sys_unix.c:436-478) writes only to stdout; sv_sys_win.c has zero telnet references; there is no telnet socket/console accept. So the telnet-console subsystem that would feed this log appears to have been removed while the command and cvar remain. The log file will always be empty. Worth a human look: is logtelnet/telnet_log_level dead vestigial surface that should be retired upstream, or is the telnet console expected to be supplied by a build/platform variant not in this tree?
- [fyi/hidden-family/synthesis] Hidden family note (not in this chunk's knob set, surfaced while tracing): the log_t logs[] table at src/sv_ccmds.c:217-226 contains three sibling log-toggle commands beyond the four in scope -- fraglogfile (FRAG_LOG), logplayers (PLAYER_LOG), and modfraglogfile (MOD_FRAG_LOG) -- all sharing the same SV_Logfile toggle handler and registered in the same Cmd_AddCommand loop (src/sv_ccmds.c:1828-1829). They are presumably separate knobs in scope elsewhere; flagging only so the family is accounted for and the shared-handler/auto-rotation reasoning is reused consistently across them (fraglogfile/modfraglogfile additionally force newlog=true at src/sv_ccmds.c:109-110, i.e. always a fresh file -- a per-command difference from logfile/logerrors/logrcon).
- [fyi/runtime-dead-suspect/vpass] logtelnet is vestigial/dead-feature machinery: mvdsv has no telnet-console subsystem (no telnet/console/stdin source file; no telnet refs in server headers), and SV_Write_Log is never called with TELNET_LOG. Turning logtelnet on opens an empty qtelnet_<port>_<NNNN>.log that never receives any output. The command, the telnet_log_level cvar (default 0, sv_main.c:87), and OnChange_telnetloglevel_var (sv_main.c:3897) are all orphaned plumbing for a producer side that does not exist in this build. The PROPOSED already documents this correctly; flagging as an upstream/runtime-dead observation for the catalog.
- [fyi/hidden-family/vpass] Adjacent (off-scope) sibling commands share the exact same SV_Logfile machinery and are functional, which makes the telnet one's emptiness a genuine anomaly rather than a global no-op: logfile->CONSOLE_LOG, logerrors->ERROR_LOG, logrcon->RCON_LOG, fraglogfile->FRAG_LOG, logplayers->PLAYER_LOG, modfraglogfile->MOD_FRAG_LOG all DO get SV_Write_Log calls. Only logtelnet (TELNET_LOG) lacks a writer. Noting in case the describe-fill phase wants a consistent 'this one is the empty/vestigial member of the family' cross-reference.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "logtelnet",
  "type": "command",
  "description": "Toggles telnet logging. With no argument, the command flips the log on if it is off and off if it is on. While on, it opens a log file named qtelnet_<port>_<NNNN>.log (the server's UDP port plus a number) under the directory set by sv_logdir; turning it off prints \"Telnet logging off.\" and closes the file. Note: in this build no telnet-console output is actually written to that file, so it stays empty (see below).\n\nDefault: off; sv_logdir defaults to the server's working directory (\".\").\nSet by: server console, or master rcon (master_rcon_password); the regular rcon password cannot run log commands. Clients cannot issue it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:180. Toggle/no-arg + OFF-state + file open are fully source-legible: SV_TelnetLogfile_f (src/sv_ccmds.c:180-183) calls SV_Logfile(TELNET_LOG, false) reading no Cmd_Argv; SV_Logfile (src/sv_ccmds.c:92-105) toggles, opening a file with prefix \"qtelnet_\" (src/sv_ccmds.c:222) named qtelnet_<port>_<NNNN>.log (format src/sv_ccmds.c:114, port src/sv_ccmds.c:86, append fopen(\"a\") src/sv_ccmds.c:125); message_off \"Telnet logging off.\" at src/sv_ccmds.c:222. When opened, log_level is set from the telnet_log_level cvar (src/sv_ccmds.c:134-136). HEDGED CLAUSE -- what gets logged: there is NO `SV_Write_Log(TELNET_LOG, ...)` call anywhere in the tree. A whole-tree grep for telnet shows the ONLY references are this toggle command, the log-table entry, and the telnet_log_level cvar + its OnChange handler (src/sv_main.c:85-87, 3896-3905); neither Sys_Printf (Unix src/sv_sys_unix.c:436-478, which writes only stdout) nor sv_sys_win.c (zero telnet refs) feeds TELNET_LOG, and there is no telnet socket/console accept anywhere. So the telnet-console subsystem that would feed this log is absent from this codebase while the toggle command and telnet_log_level cvar remain registered -- the file is opened but receives no writes. I state only the legible part (it toggles/opens/closes a qtelnet_*.log file) and explicitly mark the content as not produced in this build rather than inventing telnet content. sv_logdir default \".\" src/sv_main.c:131. Default off: sv_logfile=NULL src/sv_ccmds.c:222. Access class admin/console: Cmd_AddCommand loop src/sv_ccmds.c:1828-1829, not in ucmds[] (src/sv_user.c:3299). F-MV1: grep ktx/src for \"logtelnet\" -> no override. NOT a C3 dead-stamp: the command IS reachable and DOES open a file (it is functional), so the truthful statement is 'opens an empty log file', a hedge on the content clause -- not 'unreachable, candidate bug'. Routed to C1 (hedged) and flagged for review.",
  "description_proposed": null
}
```
