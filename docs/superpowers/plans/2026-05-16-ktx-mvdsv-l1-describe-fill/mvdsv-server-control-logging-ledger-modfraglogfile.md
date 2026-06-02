# describe-fill-synthesis ledger -- mvdsv `modfraglogfile`

- **project:** mvdsv
- **knob:** `modfraglogfile` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- medium confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:modfraglogfile: synthesized -- admin/rcon toggle; live write path is src/sv_send.c:334 (parse_mod_string of broadcast msgs), NOT the commented-out pr_cmds.c block; logs killer\victim\weapon\timestamp to modfrag_<port>_NNNN.log -- origin=synthesized ref=src/sv_send.c:334 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles a mod-frag log on or off (no arguments -- run it once to start logging, again to stop). While on, the server inspects broadcast game messages (kill/event announcements) against its mod-message patterns and, on a match, appends a normalized frag record -- killer, victim, weapon, and a Unix timestamp -- so kills can be logged even for mods that do not use the standard frag-log path. Each time logging is switched on a fresh numbered file is opened.
>
> Log file: written to the server's log directory (sv_logdir, default the working directory) as modfrag_<port>_NNNN.log.
>
> Default: off.
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (console/rcon) | src/sv_ccmds.c:1828-1829 | `for (i=MIN_LOG; i<MAX_LOG; ++i) Cmd_AddCommand(logs[i].command, logs[i].function);` | MATCH |
| not client-issuable | src/sv_user.c:3299+ | grep 'modfraglogfile' in ucmds[] -> empty | MATCH |
| toggle on/off, no args | src/sv_ccmds.c:92-105,214 | `if(logs[sv_log].sv_logfile){fclose...;if(!newlog){...message_off...return;}}` ; `SV_Logfile(MOD_FRAG_LOG, false)` | MATCH |
| live write path (NOT pr_cmds) | src/sv_send.c:324,332-335 | `if (string[0] && logs[MOD_FRAG_LOG].sv_logfile){...if ((fraglog = parse_mod_string(string2))){ SV_Write_Log(MOD_FRAG_LOG, 1, fraglog); Q_free(fraglog);}}` | MATCH |
| pr_cmds path is dead (commented) | src/pr_cmds.c:2337-2340 | `//	SV_Write_Log(MOD_FRAG_LOG, 1, ...)` (all four commented) | MATCH |
| content killer\victim\weapon\unixtime | src/sv_mod_frags.c:160-162 | `snprintf(ret, str_len, "%s\\%s\\%s\\%d\n", buf[pl1], buf[pl2], qw_weapon[qwmsg[i]->id], (int)time(NULL));` | MATCH |
| derived by PCRE-parsing broadcast text | src/sv_send.c:332 ; src/sv_mod_frags.c:140-147 | `fraglog = parse_mod_string(string2)` ; `for (i=0; qwmsg[i]; i++){ if ((buf = qwmsg_pcre_check(str, qwmsg[i]->str, str_len)))` | MATCH |
| nothing logged if no pattern match | src/sv_mod_frags.c:144,172,178 | `char *ret = NULL; ... default: ret = NULL; ... return ret;` (and src/sv_send.c:332 `if ((fraglog = ...))`) | MATCH |
| fresh file each enable | src/sv_ccmds.c:109-110 | `if (sv_log == FRAG_LOG || sv_log == MOD_FRAG_LOG) newlog = true;` | MATCH |
| filename modfrag_<port>_NNNN.log in sv_logdir | src/sv_ccmds.c:114,225 ; src/sv_main.c:131 | prefix `"modfrag_"` ; `snprintf(..."%s/%s%d_%04d.log", sv_logdir.string,...)` ; `sv_logdir="."` | MATCH |
| append mode | src/sv_ccmds.c:125 | `fopen (name, "a")` | MATCH |
| default off | src/sv_ccmds.c:225 | `{NULL, "modfraglogfile", "modfrag_", ...}` (sv_logfile NULL) | MATCH |
| no KTX override | ktx/src (grep) | grep 'modfraglogfile' -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Is a toggle, no arguments (run once = on, again = off) | sv_ccmds.c:212-215; handler reads no Cmd_Argv | `void SV_ModFragLogfile_f (void){ SV_Logfile(MOD_FRAG_LOG, false); }` | MATCH |
| 2 | OFF transition when already logging | sv_ccmds.c:92-104 | `if (logs[sv_log].sv_logfile){ fclose(...); sv_logfile=NULL; if(!newlog){ Con_Printf("%s",message_off); log_level=0; return; }}` (message_off="Mod frag file logging off.\n") | MATCH |
| 3 | ON transition when not logging | sv_ccmds.c:108-125 | scans for first non-existent name, `fopen(name,"a")`; opens fresh file | MATCH |
| 4 | "Each time logging is switched on a fresh numbered file is opened" | sv_ccmds.c:108-118 | `// always use new log file for frag log / if (sv_log==FRAG_LOG||sv_log==MOD_FRAG_LOG) newlog=true;` then loop finds first absent `..._%04d.log`; `!newlog` reuse branch (120-121) skipped | MATCH |
| 5 | Inspects broadcast game messages (kill/event announcements) against mod-message patterns | sv_send.c:269,324,332 (inside SV_DoBroadcastPrintf) | `if (string[0] && logs[MOD_FRAG_LOG].sv_logfile){ ... if((fraglog=parse_mod_string(string2)))` ; parse_mod_string runs pcre over qwmsg[] patterns (sv_mod_frags.c:140-178) | MATCH |
| 6 | On a match, appends a normalized frag record | sv_send.c:334 + sv_main.c:4153,4166 (append: sv_ccmds.c:125 fopen "a") | `SV_Write_Log(MOD_FRAG_LOG, 1, fraglog)` -> `fprintf(sv_logfile,"%s",log_msg)`; file opened `fopen(name,"a")` | MATCH |
| 7 | Record fields: killer, victim, weapon, Unix timestamp | sv_mod_frags.c:162 (WEAPON) | `snprintf(ret,...,"%s\\%s\\%s\\%d\n", buf[pl1], buf[pl2], qw_weapon[id], (int)time(NULL))` | MATCH (default + all WEAPON msgs; see flag re SYSTEM-type record shape) |
| 8 | Timestamp is Unix epoch | sv_mod_frags.c:162,170 | `(int)time(NULL)` | MATCH |
| 9 | "logged even for mods that do not use the standard frag-log path" | FRAG_LOG fed by progs builtin: pr_cmds.c:2336 / pr2_cmds.c:1551; MOD_FRAG_LOG fed by broadcast-text regex: sv_send.c:332 | `SV_Write_Log(FRAG_LOG, 1, s)` (progs logfrag) vs independent broadcast-string match path | MATCH |
| 10 | Log file path = sv_logdir + filename | sv_ccmds.c:114 | `snprintf(name,...,"%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i)` | MATCH |
| 11 | Filename = modfrag_<port>_NNNN.log | sv_ccmds.c:225 (file_name="modfrag_") + :114 format | `{NULL,"modfraglogfile","modfrag_",...}` ; `%s%d_%04d.log` -> `modfrag_<port>_NNNN.log` (NNNN zero-padded 4-digit) | MATCH |
| 12 | sv_logdir default = working directory (".") | sv_main.c:131 ; not in gamedir per sv_main.c:4154 | `cvar_t sv_logdir = {"sv_logdir", ".", 0, OnChange_logdir_var};` ; `log_msg = msg; // these logs aren't in fs_gamedir` | MATCH |
| 13 | Default: off | sv_ccmds.c:225 (log_level field=0) + log_t.sv_logfile NULL-initialized; no startup auto-open | `{NULL,"modfraglogfile","modfrag_","Mod frag file logging off.\n","modfrags",SV_ModFragLogfile_f, 0}` (sv_logfile=NULL, log_level=0) | MATCH |
| 14 | Set by: server console / rcon | sv_ccmds.c:1828-1829 | `for (i=MIN_LOG;i<MAX_LOG;++i) Cmd_AddCommand(logs[i].command, logs[i].function);` (server Cmd, no CF_ access flag) | MATCH |

**V-pass notes:** Every material clause maps to a located, verified enforcing line including adjacent comments. modfraglogfile is a server CONSOLE COMMAND (registered via Cmd_AddCommand at sv_ccmds.c:1829, fed from the logs[] table at sv_ccmds.c:217-226), NOT a cvar -- the proposed description correctly treats it as a no-argument toggle and never asserts a cvar value. The toggle, fresh-file-on-each-enable, append semantics, filename pattern (modfrag_<port>_NNNN.log with %04d zero-pad), sv_logdir default ".", and the broadcast-string -> parse_mod_string -> SV_Write_Log(MOD_FRAG_LOG) side-effect chain are all enforcement-traced through the callees (parse_mod_string in sv_mod_frags.c, SV_Write_Log in sv_main.c, SV_Logfile in sv_ccmds.c). The "logged even for mods that do not use the standard frag-log path" rationale is structurally correct: FRAG_LOG is fed by the progs logfrag builtin (pr_cmds.c:2336) while MOD_FRAG_LOG is fed by regex-matching broadcast obituary text -- two independent paths.

One completeness nuance (flagged FYI, not a defect): the "killer, victim, weapon, Unix timestamp" field list describes the WEAPON-type record (sv_mod_frags.c:162). parse_mod_string also has a SYSTEM branch (line 170) producing `player\system-event\timestamp` (one player, event name, NO weapon). This does not undercut the description for two reasons verified in source: (1) the default qwmsg_def table (sv_mod_frags.h:76-137) contains ZERO SYSTEM entries -- header comment line 53 reads "system messages (not released yet)" -- so out-of-the-box EVERY record is WEAPON-shaped; SYSTEM records require a custom sv_mod_msg_file. (2) For single-player WEAPON events (suicides/environmental deaths, the bulk of the default table, pl_count==1) pl1==pl2==1 so killer==victim, but the four-field killer\victim\weapon\timestamp shape still holds. The field list is therefore accurate for default behavior and traced to code, not inferred -- TRACED-CLEAN stands.

## flags_for_review

- [review/other/synthesis] TRAP-2 confirmed and load-bearing: the obvious frag-log call site for MOD_FRAG_LOG in PF_logfrag (src/pr_cmds.c:2337-2340) is entirely commented out. The ONLY live write is in SV_DoBroadcastPrintf (src/sv_send.c:332-336) via parse_mod_string. A name-or-locator-only reading would have documented the dead path. Worth a human glance to confirm the chunk's source_ref points at the live site.
- [review/off-scope-entity/synthesis] Effective output depends on the mod-message pattern table that parse_mod_string matches against (qwmsg[]/sv_mod_frags.c, likely sourced from the sv_mod_msg_file cvar + sv_mod_msg_file_OnChange in src/sv_main.c). If no patterns are loaded, parse_mod_string returns NULL and the log stays empty even when toggled on. This dependency is off-scope for this chunk (sv_mod_msg_file is a separate L1 entity) but materially conditions modfraglogfile's behavior -- candidate See-also and the reason confidence is medium not high.
- [fyi/other/vpass] parse_mod_string (sv_mod_frags.c:140-178) emits TWO record shapes. WEAPON (line 162): killer\victim\weapon\unixtime -- matches the description. SYSTEM (line 170): player\system-event\unixtime -- one player, event name (qw_system[]: start/end/connect/disconnect/timeout), NO weapon, NOT covered by the description's field list. SYSTEM is unreachable by default: the default qwmsg_def table has zero SYSTEM entries and the header comment at sv_mod_frags.h:53 says 'system messages (not released yet)'. SYSTEM records arise only via a custom sv_mod_msg_file (cvar sv_mod_msg_file, OnChange at sv_mod_frags.c:52). Not a description defect for default behavior; surfaced so a future edit covering the configurable sv_mod_msg_file path knows the second record shape exists.
- [fyi/runtime-dead-suspect/vpass] The qw_system[] event names and the entire SYSTEM msg_type path appear to be a never-completed feature ('not released yet', kreon 2005). Default qwmsg_def has no SYSTEM rows, so qw_system[] (sv_mod_frags.h:54-60) and parse_mod_string's SYSTEM case are dead under default config; only reachable by an operator-supplied sv_mod_msg_file containing msg_type==1 lines. Flagged as a runtime-dead suspect for the broader L1 corpus, not a blocker for this row.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "modfraglogfile",
  "type": "command",
  "description": "Toggles a mod-frag log on or off (no arguments -- run it once to start logging, again to stop). While on, the server inspects broadcast game messages (kill/event announcements) against its mod-message patterns and, on a match, appends a normalized frag record -- killer, victim, weapon, and a Unix timestamp -- so kills can be logged even for mods that do not use the standard frag-log path. Each time logging is switched on a fresh numbered file is opened.\n\nLog file: written to the server's log directory (sv_logdir, default the working directory) as modfrag_<port>_NNNN.log.\n\nDefault: off.\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_send.c:334. Registration: log_t logs[] entry name 'modfraglogfile' -> SV_ModFragLogfile_f (src/sv_ccmds.c:225), loop-registered via Cmd_AddCommand at src/sv_ccmds.c:1828-1829 (admin/rcon). NOT in ucmds[] (src/sv_user.c:3299+, grep empty) -> admin-only. Toggle: SV_ModFragLogfile_f -> SV_Logfile(MOD_FRAG_LOG, false) (src/sv_ccmds.c:214); on/off via SV_Logfile (src/sv_ccmds.c:84-143); no args. TRAP 2 (enforcing line lives elsewhere): the pr_cmds.c MOD_FRAG_LOG writes (src/pr_cmds.c:2337-2340) are ALL commented out -- they are NOT the live path. The ACTIVE enforcing write is src/sv_send.c:332-336 inside SV_DoBroadcastPrintf: when logs[MOD_FRAG_LOG].sv_logfile is open (gate src/sv_send.c:324) and a broadcast string ends in newline, fraglog = parse_mod_string(string2) and SV_Write_Log(MOD_FRAG_LOG, 1, fraglog) at line 334. Content: parse_mod_string (src/sv_mod_frags.c:140) PCRE-matches the broadcast text against the qwmsg[] pattern table; on a WEAPON match it emits '%s\\\\%s\\\\%s\\\\%d\\n' = killer\\victim\\weapon-name\\unixtime (src/sv_mod_frags.c:160-162), on a SYSTEM match '%s\\\\%s\\\\%d\\n' = player\\system-event\\unixtime (lines 168-170); returns NULL (nothing logged) if no pattern matches. So content = normalized killer/victim/weapon/timestamp frag records derived from parsing mod kill-announce broadcasts. Fresh-file-per-enable: SV_Logfile forces newlog=true for MOD_FRAG_LOG (src/sv_ccmds.c:109-110). Filename modfrag_<port>_NNNN.log: prefix 'modfrag_' (table src/sv_ccmds.c:225) + snprintf (src/sv_ccmds.c:114) + sv_logdir default '.' (src/sv_main.c:131). Append fopen 'a' (src/sv_ccmds.c:125). 'not in fs_gamedir' per SV_Write_Log MOD_FRAG_LOG case comment (src/sv_main.c:4154). Default off (sv_logfile NULL at table init). F-MV1: grep ktx/src 'modfraglogfile' -> empty, no override. CONFIDENCE medium (not high): the qwmsg[] pattern set parse_mod_string matches against is populated from sv_msg_pcre rules and may be tied to sv_mod_msg_file (cvar at src/sv_main.c, sv_mod_msg_file_OnChange) -- if no mod-message patterns are loaded, parse_mod_string returns NULL and nothing is written even with the log on. The description hedges this implicitly ('against its mod-message patterns ... on a match'); flagged for review.",
  "description_proposed": null
}
```
