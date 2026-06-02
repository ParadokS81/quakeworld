# describe-fill-synthesis ledger -- mvdsv `fraglogfile`

- **project:** mvdsv
- **knob:** `fraglogfile` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:fraglogfile: synthesized -- admin/rcon toggle for a plain-text per-kill frag log (frag_<port>_NNNN.log); frag_log_type cvar adds team+timestamp -- origin=synthesized ref=src/pr_cmds.c:2336 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Toggles a plain-text frag log on or off (no arguments -- run it once to start logging, again to stop). While on, the server appends one line per kill recording the killer and victim names; if the frag_log_type cvar is set to 1, each line also includes both teams and a date/time stamp. Each time logging is switched on a fresh numbered file is opened.
>
> Log file: written to the server's log directory (sv_logdir, default the working directory) as frag_<port>_NNNN.log, where NNNN is the next unused number.
>
> Default: off.
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (console/rcon) | src/sv_ccmds.c:1828-1829 | `for (i=MIN_LOG; i<MAX_LOG; ++i) Cmd_AddCommand(logs[i].command, logs[i].function);` | MATCH |
| not client-issuable | src/sv_user.c:3299+ | grep 'fraglogfile' in ucmds[] -> empty | MATCH |
| toggle on/off, no args | src/sv_ccmds.c:92-105,192 | `if (logs[sv_log].sv_logfile){ fclose...; if(!newlog){ Con_Printf(message_off); ...return;}}` ; `SV_Logfile(FRAG_LOG, false)` | MATCH |
| per-kill record killer\victim | src/pr_cmds.c:2333,2336 | `s = va("\\%s\\%s\\\n", svs.clients[e1-1].name, svs.clients[e2-1].name); ... SV_Write_Log(FRAG_LOG,1,s)` | MATCH |
| team+timestamp when frag_log_type=1 | src/pr_cmds.c:2326-2331 | `if ((int)frag_log_type.value) s = va("\\frag\\%s\\%s\\%s\\%s\\%d-%d-%d %d:%d:%d\\\n", ...)` | MATCH |
| frag_log_type default 0 | src/sv_main.c:90 | `cvar_t frag_log_type = {"frag_log_type", "0"};` | MATCH |
| fresh file each enable | src/sv_ccmds.c:109-110 | `if (sv_log == FRAG_LOG || sv_log == MOD_FRAG_LOG) newlog = true;` | MATCH |
| filename frag_<port>_NNNN.log in sv_logdir | src/sv_ccmds.c:114 ; src/sv_main.c:131 | `snprintf(name,...,"%s/%s%d_%04d.log", sv_logdir.string, logs[sv_log].file_name, sv_port, i)` ; `sv_logdir = {"sv_logdir", "."...}` | MATCH |
| append mode | src/sv_ccmds.c:125 | `fopen (name, "a")` | MATCH |
| default off | src/sv_ccmds.c:223 | `{NULL, "fraglogfile", "frag_", ...}` (sv_logfile field NULL) | MATCH |
| no KTX override | ktx/src (grep) | grep 'fraglogfile' -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Toggles ... on or off" (it's a toggle, state-driven) | sv_ccmds.c:92-106 | `if (logs[sv_log].sv_logfile) { ... fclose(...); logs[sv_log].sv_logfile = NULL; if (!newlog) { Con_Printf("%s", logs[sv_log].message_off); logs[sv_log].log_level = 0; return; } }` | MATCH |
| 2 | "no arguments -- run once to start, again to stop" | sv_ccmds.c:84-143 (SV_Logfile) + 190-193 (SV_FragLogfile_f) | handler body contains zero `Cmd_Arg*` refs; toggle keyed only on `sv_logfile` NULL/non-NULL | MATCH |
| 3 | OFF path = "again to stop" (close + report off) | sv_ccmds.c:96-104 | `fclose(...); logs[sv_log].sv_logfile = NULL; ... Con_Printf("%s", logs[sv_log].message_off);` (message_off = "Frag file logging off.\n", table line 223) | MATCH |
| 4 | "appends one line per kill" (append mode, per-kill write) | sv_ccmds.c:125 `fopen(name,"a")`; pr_cmds.c:2336 / pr2_cmds.c:1551 `SV_Write_Log(FRAG_LOG, 1, s)` per logfrag | `fopen (name, "a")` ; `SV_Write_Log(FRAG_LOG, 1, s);` | MATCH |
| 5 | Default line "recording the killer and victim names" | pr_cmds.c:2333 / pr2_cmds.c:1547 | `s = va("\\%s\\%s\\\n", svs.clients[e1-1].name, svs.clients[e2-1].name);` | MATCH |
| 6 | "if frag_log_type is set to 1, each line also includes both teams and a date/time stamp" | pr_cmds.c:2326-2331 / pr2_cmds.c:1540-1545 | `if ((int)frag_log_type.value) s = va("\\frag\\%s\\%s\\%s\\%s\\%d-%d-%d %d:%d:%d\\\n", name1,name2, team1,team2, year,mon,mday, hour,min,sec);` | MATCH |
| 6b | (corroborating) no extra generic timestamp wraps frag lines, so the date/time is *only* from frag_log_type | sv_main.c:4152-4154 | `case FRAG_LOG: case MOD_FRAG_LOG: log_msg = msg; // these logs aren't in fs_gamedir` (no `[date].[level]` prefix, unlike default at 4160) | MATCH |
| 7 | "Each time logging is switched on a fresh numbered file is opened" | sv_ccmds.c:109-118 | `if (sv_log == FRAG_LOG || sv_log == MOD_FRAG_LOG) newlog = true;` then loop opens first non-existent `%s%d_%04d.log` | MATCH |
| 8 | Log file path = sv_logdir | sv_ccmds.c:114 + sv_main.c:131 | `snprintf(name, ..., "%s/%s%d_%04d.log", sv_logdir.string, ...)` ; `cvar_t sv_logdir = {"sv_logdir", ".", 0, ...}` | MATCH |
| 9 | "sv_logdir, default the working directory" | sv_main.c:131 | `{"sv_logdir", "."...}` (registered default ".") | MATCH |
| 10 | filename `frag_<port>_NNNN.log` (prefix "frag_") | sv_ccmds.c:114 + table line 223 file_name="frag_" | `"%s/%s%d_%04d.log"` with `logs[FRAG_LOG].file_name` = `"frag_"` | MATCH |
| 11 | `<port>` = server UDP port | sv_ccmds.c:86 + net.c:205-208 | `int sv_port = NET_UDPSVPort();` ; `int NET_UDPSVPort(void){ return ntohs(net_local_sv_ipadr.port); }` | MATCH |
| 12 | "NNNN is the next unused number" (4-digit, first free) | sv_ccmds.c:112-118 | `for (i=0; i<1000; i++){ snprintf(...,"%04d.log",...,i); if (!COM_FileExists(name)) break; }` (newlog forced true, so 120-121 not taken) | MATCH |
| 13 | "Default: off" | sv_ccmds.c:217-226 (logs[] table) | every `log_t` row initializes the trailing `log_level` field to `0` and `sv_logfile` (1st field) to `NULL`; no startup open of FRAG_LOG | MATCH |
| 14 | "Set by: server console / rcon" (server command, not client) | sv_ccmds.c:1828-1829 | `for (i = MIN_LOG; i < MAX_LOG; ++i) Cmd_AddCommand (logs[i].command, logs[i].function);` -- plain server Cmd_AddCommand, no client/CF flag | MATCH |
| (meta) | frag_log_type tested by truthiness only (any non-zero behaves as "1") | sv_main.c:90, pr_cmds.c:2326, pr2_cmds.c:1540, sv_ccmds.c:437 | `cvar_t frag_log_type = {"frag_log_type", "0"}` + all reads are `if ((int)frag_log_type.value)` | MATCH (description's "set to 1" is the canonical truthy case; consistent) |

**V-pass notes:** Oracle confirmed at mvdsv 1.11-53-g18d0362. Wide-grepped every use-site of fraglogfile / fraglog / frag_log across src/ (sv_ccmds.c, sv_main.c, pr_cmds.c, pr2_cmds.c, sv_send.c, log.h, server.h) and traced each clause to its enforcing line, following callees (SV_FragLogfile_f -> SV_Logfile, and the per-kill writes through PF_logfrag / PF2_logfrag -> SV_Write_Log).

Every material clause MATCHES its enforcing code:
- Toggle / no-args / OFF-state: the handler ignores all Cmd_Arg*; on/off is purely driven by whether logs[FRAG_LOG].sv_logfile is non-NULL (sv_ccmds.c:92-106). Correct.
- Line content (killer\victim names default; +teams+timestamp when frag_log_type set): exact, verified in BOTH the PR1 (pr_cmds.c:2326-2333) and PR2 (pr2_cmds.c:1540-1547) bytecode paths, which are byte-identical. Strengthened by sv_main.c:4152-4154 showing FRAG_LOG lines get NO generic [date].[level] wrapper, so the timestamp genuinely comes only from frag_log_type=1.
- Fresh numbered file each ON: newlog is force-set true for FRAG_LOG (sv_ccmds.c:109-110), so the use-last-log branch (120-121) is never taken; the loop opens the first non-existent frag_<port>_NNNN.log. Correct.
- Filename / sv_logdir default "." / port via NET_UDPSVPort / "frag_" prefix / %04d 4-digit padding: all verified at registration + format-string sites.
- Default off + server-console/rcon scope: logs[] table initializes log_level 0 / sv_logfile NULL, and registration is a plain Cmd_AddCommand (no client/CF flag), i.e. server-side only. Correct.

No clause is name/enum/string/comment inference without an enforcing read-site; no clause contradicts code; no metadata (default/scope) clause is wrong. Classification: TRACED-CLEAN.

Two non-defect observations are in flags_for_review (a `\newmap\` line the frag log also receives under frag_log_type, and sv_maxlogsize-driven rotation) -- neither contradicts any clause in the proposed text; they are completeness FYIs, not corrections.

## flags_for_review

- [fyi/other/synthesis] Log rotation is shared by the whole logfile family but omitted from this user doc to keep it lean: SV_Write_Log (src/sv_main.c:4177-4181) opens a fresh file when sv_maxlogsize (cvar, default '0' = off, src/sv_main.c:128) is non-zero and the current file exceeds it. If operator wants rotation surfaced in the description, it applies equally to fraglogfile/logplayers/modfraglogfile.
- [fyi/off-scope-entity/synthesis] Behavior depends on the frag_log_type cvar (src/sv_main.c:90, default 0), which is a separate L1 entity not in this chunk. The two output formats are mutually exclusive at src/pr_cmds.c:2326. Cross-entity dependency worth a See-also if frag_log_type gets its own row.
- [fyi/off-scope-entity/vpass] Under frag_log_type (non-zero), the frag log also receives a non-kill marker line on each map change: sv_ccmds.c:437-455 writes `\newmap\<level>\\\\<date>\` to FRAG_LOG via SV_Write_Log(FRAG_LOG, 0, s). The description says 'one line per kill', which is accurate for kill events, but a reader could infer the log contains ONLY kill lines. This is a completeness gap, not a contradiction -- no clause in the proposed text is wrong. Optional: could add 'plus a \newmap\ marker on map change' to the frag_log_type sentence.
- [fyi/off-scope-entity/vpass] sv_maxlogsize interacts with the frag log: SV_Write_Log (sv_main.c:4177-4180) calls SV_Logfile(sv_log, true) to rotate to a fresh numbered file when the current file exceeds sv_maxlogsize.value (if that cvar is non-zero). So a fresh numbered file can also open mid-session without the operator toggling -- an additional trigger beyond 'each time logging is switched on'. Edge case driven by a different cvar; does not contradict the proposed text.
- [fyi/hidden-family/vpass] PF_logfrag (pr_cmds.c) and PF2_logfrag (pr2_cmds.c) are byte-identical in their frag-line formatting and frag_log_type branch -- the QC-builtin and the Pawn/PR2-native paths produce the same log format. Verified both so the description holds regardless of which mod VM the server runs. No action needed; noting that the clause was traced in both paths, not just one.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "fraglogfile",
  "type": "command",
  "description": "Toggles a plain-text frag log on or off (no arguments -- run it once to start logging, again to stop). While on, the server appends one line per kill recording the killer and victim names; if the frag_log_type cvar is set to 1, each line also includes both teams and a date/time stamp. Each time logging is switched on a fresh numbered file is opened.\n\nLog file: written to the server's log directory (sv_logdir, default the working directory) as frag_<port>_NNNN.log, where NNNN is the next unused number.\n\nDefault: off.\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr_cmds.c:2336. Registration: log_t logs[] entry name 'fraglogfile' -> SV_FragLogfile_f (src/sv_ccmds.c:223), loop-registered via Cmd_AddCommand at src/sv_ccmds.c:1828-1829 (admin/rcon console). NOT present in ucmds[] (src/sv_user.c:3299+, grep empty) -> admin-only. Toggle semantics: SV_FragLogfile_f calls SV_Logfile(FRAG_LOG, false) (src/sv_ccmds.c:192); SV_Logfile (src/sv_ccmds.c:84) closes+nulls the file and prints message_off ('Frag file logging off.') when already open with newlog=false (lines 92-105), else opens it -> classic on/off toggle, takes no args (Cmd_Argv never read). Per-kill content + author of behavior: PF_logfrag (src/pr_cmds.c:2300) builds the record and calls SV_Write_Log(FRAG_LOG, 1, s) at src/pr_cmds.c:2336 -- s = '\\\\%s\\\\%s\\\\\\n' (killer name, victim name) at line 2333 when frag_log_type==0, OR the extended '\\\\frag\\\\killer\\\\victim\\\\team1\\\\team2\\\\Y-M-D H:M:S\\\\\\n' at lines 2327-2331 when (int)frag_log_type.value (line 2326; frag_log_type cvar default '0' at src/sv_main.c:90). Fresh-file-per-enable: SV_Logfile forces newlog=true for FRAG_LOG (src/sv_ccmds.c:109-110), so the for-loop (lines 112-118) always selects the next non-existent frag_<port>_NNNN.log. Filename format: snprintf '%s/%s%d_%04d.log' with sv_logdir.string + file_name prefix 'frag_' + port + index (src/sv_ccmds.c:114); sv_logdir default '.' (src/sv_main.c:131). Append mode: fopen(name,'a') (src/sv_ccmds.c:125). Default off: logs[].sv_logfile starts NULL (table init, src/sv_ccmds.c:217-226). 'not in fs_gamedir' confirmed by SV_Write_Log FRAG_LOG case comment (src/sv_main.c:4154). F-MV1: grep ktx/src for fraglogfile/frag_log_type -> empty, no KTX override. Rotation (sv_maxlogsize, src/sv_main.c:4177-4181) omitted from user doc as secondary; noted in flags. recommended-value/opinion excluded (L1/L3 line).",
  "description_proposed": null
}
```
