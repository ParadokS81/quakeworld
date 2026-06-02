# describe-fill-synthesis ledger -- mvdsv `restart`

- **project:** mvdsv
- **knob:** `restart` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:restart: synthesized -- SV_Shutdown then Sys_Quit(true) execv re-exec of the binary with original argv (full process restart, not map reload); admin-only; no KTX override -- origin=synthesized ref=src/sv_sys_unix.c:305 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Shuts down and relaunches the server. All connected clients are disconnected, any in-progress MVD demo recording is stopped, and log files are closed; the server then re-executes itself with the same command-line arguments it was started with, coming back up freshly. This restarts the whole server process -- it is not a map reload.
>
> Set by: server console / rcon / stdin (admin only).
> See also: quit.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| restart = SV_Quit with restart=true | src/sv_ccmds.c:74-77 | `void SV_Restart_f (void) { SV_Quit(true); }` | MATCH |
| shuts down server (disconnect/stop-MVD/close-logs) | src/sv_ccmds.c:51 + src/sv_main.c:242,254,246 | `SV_Shutdown ("Server shutdown.\n");` -> `SV_FinalMessage` / `SV_MVDStop_f` / `fclose(logfile)` | MATCH |
| re-executes the server binary | src/sv_sys_unix.c:305 | `if (execv(com_argv[0], com_argv) == -1) { Sys_Printf("Restart failed: %s\n", ...); Sys_Exit(1); }` | MATCH |
| relaunches with the same command-line args | src/sv_sys_unix.c:305 | `execv(com_argv[0], com_argv)` (com_argv = original argv) | MATCH |
| restart is full process re-exec, not a map reload | src/sv_ccmds.c:49-57 + src/sv_sys_unix.c:295-312 | SV_Quit path contains only SV_Shutdown + Sys_Quit; no SV_SpawnServer/map logic | MATCH |
| admin-only (not client-issuable) | src/sv_ccmds.c:1877 + src/sv_user.c:3299 | `Cmd_AddCommand ("restart", SV_Restart_f);` (SERVERONLY) and absent from `ucmds[]` | MATCH |
| no KTX override | ktx/src (grep) | no `cmd_t` entry for "restart" | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "Shuts down and relaunches the server" (command identity) | src/sv_ccmds.c:1877; 74-77 | `Cmd_AddCommand ("restart", SV_Restart_f);` / `void SV_Restart_f (void){ SV_Quit(true); }` | MATCH |
| 2 | "Shuts down ... server then re-executes itself" (shutdown then exec) | src/sv_ccmds.c:49-57 | `void SV_Quit (qbool restart){ SV_Shutdown ("Server shutdown.\n"); #ifdef SERVERONLY Sys_Quit (restart); ...}` (SERVERONLY confirmed -DSERVERONLY) | MATCH |
| 3 | "re-executes itself with the same command-line arguments it was started with" | src/sv_sys_unix.c:305 (and src/sv_sys_win.c:365) | `if (execv(com_argv[0], com_argv) == -1)` ; com_argv = stored original argv (common.c:797 COM_InitArgv) | MATCH |
| 4 | "All connected clients are disconnected" | src/sv_main.c:242 -> 344-364 | `SV_FinalMessage(finalmsg);` then `MSG_WriteByte(&net_message, svc_disconnect);` transmitted to every `cl->state >= cs_spawned`; fn comment "send a final message to all connected clients before the server goes down" | MATCH |
| 5 | "any in-progress MVD demo recording is stopped" | src/sv_main.c:254-255 | `if (sv.mvdrecording) SV_MVDStop_f();` | MATCH |
| 6 | "log files are closed" | src/sv_main.c:246-253 | `for (i = MIN_LOG; i < MAX_LOG; ++i){ if (logs[i].sv_logfile){ fclose(...); logs[i].sv_logfile = NULL; }}` | MATCH |
| 7 | "This restarts the whole server process -- it is not a map reload" | restart path: no SV_SpawnServer (sv_ccmds.c:74-77 -> execv); map-reload is separate SV_Map_f->SV_SpawnServer (sv_ccmds.c:458); the only restart->map is unrelated NQ-progs localcmd (pr_cmds.c:887-891) | `if (pr_nqprogs && !strcmp(str,"restart\n")){ Cbuf_AddText(va("map %s\n", sv.mapname)); return; }` -- distinct mechanism, NOT this command | MATCH |
| 8 | "Set by: server console / stdin" | src/sv_ccmds.c:1877 (plain Cmd_AddCommand, #ifdef SERVERONLY) + src/sv_sys_unix.c:405 Sys_ConsoleInput; header comment sv_ccmds.c:40-41 | `// These commands can only be entered from stdin or by a remote operator datagram` | MATCH |
| 9 | "Set by: rcon (admin only)" | src/sv_main.c:1701 / 1708 (both rcon tiers password-gated); restart absent from normal-rcon blacklist sv_main.c:1754-1765 | `if (Rcon_Validate (remote_command, master_rcon_password))` / `else if (Rcon_Validate (remote_command, rcon_password.string))` | MATCH |
| 10 | "(admin only)" -- a connected PLAYER cannot invoke it | src/sv_user.c:3399-3428 (SV_ExecuteUserCommand) + ucmds[] table 3299-3392 | Client stringcmd path matches only `ucmds[]` whitelist then SV_ExecutePRCommand, else "Bad user command"; `restart`/`quit` NOT in ucmds[] -- no fall-through to console command table | MATCH |
| 11 | "See also: quit" | src/sv_ccmds.c:1876; 64-67 | `Cmd_AddCommand ("quit", SV_Quit_f);` / `void SV_Quit_f (void){ SV_Quit(false); }` -- sibling shutdown, no re-exec | MATCH |

**V-pass notes:** TRACED-CLEAN. Oracle confirmed mvdsv 1.11-53-g18d0362. Full call chain enforcement-traced: restart -> SV_Restart_f (sv_ccmds.c:74-77) -> SV_Quit(true) -> [SV_Shutdown side-effects] -> Sys_Quit(true) -> execv(com_argv[0], com_argv). SERVERONLY build verified (-DSERVERONLY in build/CMakeFiles/mvdsv.dir/flags.make + CMakeLists.txt:169), so the SERVERONLY branch of SV_Quit (the execv path) is the live one for this binary.

All three side-effect clauses (clients disconnected / MVD stopped / logs closed) live in SV_Shutdown (sv_main.c:235-287) and each was traced to its enforcing line incl. adjacent comments. The "same command-line arguments" clause was followed into the callee Sys_Quit's execv on com_argv (the stored original argv), not stopped at the caller. The "not a map reload" clause was actively disambiguated: the only restart->map-reload path in the tree is the NQ-progs QuakeC localcmd intercept (pr_cmds.c:887), a DIFFERENT mechanism from the console command -- the description's explicit "not a map reload" correctly separates them.

Access-class ("admin only") was verified per WI-2: NOT inferred from name. restart is a plain Cmd_AddCommand under #ifdef SERVERONLY (no CF_ flag), it is absent from the client ucmds[] whitelist (so SV_ExecuteUserCommand cannot reach it -- the client path does NOT fall through to the general console command table), and both rcon tiers that can dispatch it are password-gated (restart is not in the normal-rcon command blacklist). Header comment sv_ccmds.c:40-41 independently states these commands "can only be entered from stdin or by a remote operator datagram." Console==stdin on a dedicated server. All input vectors are operator-level.

Minor cosmetic ordering nuance (FYI, not a defect, does not affect classification): the prose lists "MVD demo recording is stopped, and log files are closed", but in SV_Shutdown logs are actually closed (sv_main.c:246-253) BEFORE the MVD stop (sv_main.c:254-255). The description presents these as a co-occurring side-effect list rather than a strict sequence, so the swap carries no behavioral claim.

## flags_for_review

- [fyi/other/synthesis] restart re-execs the server process via execv(com_argv[0], com_argv) -- it relaunches the whole binary with the original command line, NOT a soft map/level restart. An admin expecting 'restart' to reload the current map (a common cross-engine meaning) would be surprised. This is correct/intended behavior, not a bug, but flagging since the name invites the wrong mental model and it pairs with quit, not map. The Windows path additionally guards the execv block behind #ifndef __MINGW32__ (src/sv_sys_win.c:353-366): under a MinGW32 build, restart would skip the execv and fall through to Sys_Exit(0) -- i.e. behave like quit (process exits, does not relaunch). The dedicated SERVERONLY Linux build is unaffected; noted only as a build-variant caveat.
- [fyi/off-scope-entity/vpass] The console command `restart` (SV_Restart_f, full process re-exec via execv) shares its spelling with an unrelated NQ-progs-only QuakeC localcmd intercept at src/pr_cmds.c:887-891, where `localcmd("restart\n")` under pr_nqprogs is rewritten to `map <current>` (a map reload). These are two distinct mechanisms; the L1 knob documents only the console command. The description's explicit 'it is not a map reload' disambiguates this correctly. Noting in case a future reader greps `restart` and conflates the two.
- [fyi/cross-mod-override/vpass] restart/quit/say/god/give/noclip/serverinfo/user/floodprot etc. are registered ONLY under #ifdef SERVERONLY (sv_ccmds.c:1874-1900). For the mvdsv dedicated build (SERVERONLY defined) they exist; in a non-SERVERONLY (client-hosted) build they would not be registered and the SV_Quit path would route to Host_Quit() instead of Sys_Quit/execv. The shipped mvdsv binary is SERVERONLY, so the documented behavior is the live one -- flagging only so the description's process-re-exec semantics are understood to be SERVERONLY-conditioned.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "restart",
  "type": "command",
  "description": "Shuts down and relaunches the server. All connected clients are disconnected, any in-progress MVD demo recording is stopped, and log files are closed; the server then re-executes itself with the same command-line arguments it was started with, coming back up freshly. This restarts the whole server process -- it is not a map reload.\n\nSet by: server console / rcon / stdin (admin only).\nSee also: quit.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_sys_unix.c:305. Handler SV_Restart_f (src/sv_ccmds.c:74) calls SV_Quit(true) (src/sv_ccmds.c:76) -- identical to quit EXCEPT the restart bool is true. SV_Quit (src/sv_ccmds.c:49) calls SV_Shutdown at :51 (same disconnect/stop-MVD/close-logs path as quit: src/sv_main.c:242 SV_FinalMessage, :254-255 SV_MVDStop_f, :246-252 fclose logfiles) then Sys_Quit(true) at :53. With restart=true Sys_Quit RE-EXECS the binary: src/sv_sys_unix.c:297-310 closes fds then `execv(com_argv[0], com_argv)` at :305 (on failure prints 'Restart failed' and Sys_Exit(1)); Windows equivalent src/sv_sys_win.c:351-376 with `execv(argv[0], com_argv)` at :365. com_argv = the original process argv, so it relaunches with the same command line. This is a full process re-exec, NOT a map restart -- verified against the execv site, no map-reload logic in this path (the chunk's comparator/elsewhere-enforcement trap: the behavior lives in Sys_Quit, not the one-line handler). No-arg command -> no worked example. Access-class admin-only: registered Cmd_AddCommand(\"restart\",SV_Restart_f) at src/sv_ccmds.c:1877 under SERVERONLY, ABSENT from client ucmds[] (table src/sv_user.c:3299), section comment src/sv_ccmds.c:40. F-MV1: no KTX command override for \"restart\" (grep of ktx/src returned nothing).",
  "description_proposed": null
}
```
