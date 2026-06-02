# describe-fill-synthesis ledger -- mvdsv `quit`

- **project:** mvdsv
- **knob:** `quit` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:quit: synthesized -- SV_Shutdown (disconnect/stop-MVD/close-logs) then Sys_Exit(0) with no re-exec; admin-only; no KTX override -- origin=synthesized ref=src/sv_ccmds.c:51 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Shuts down the server and exits the process. All connected clients are disconnected, any in-progress MVD demo recording is stopped, and open server log files are closed before the process terminates. The server does not relaunch (use restart for that).
>
> Set by: server console / rcon / stdin (admin only).
> See also: restart.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| quit = SV_Quit with restart=false | src/sv_ccmds.c:64-67 | `void SV_Quit_f (void) { SV_Quit(false); }` | MATCH |
| shuts down server before exit | src/sv_ccmds.c:51 | `SV_Shutdown ("Server shutdown.\n");` | MATCH |
| disconnects all clients | src/sv_main.c:242 | `SV_FinalMessage(finalmsg);` | MATCH |
| stops in-progress MVD recording | src/sv_main.c:254-255 | `if (sv.mvdrecording) SV_MVDStop_f();` | MATCH |
| closes open server log files | src/sv_main.c:246-252 | `for (...) if (logs[i].sv_logfile) { fclose (logs[i].sv_logfile); logs[i].sv_logfile = NULL; }` | MATCH |
| exits the process, no relaunch | src/sv_ccmds.c:53 + src/sv_sys_unix.c:311 | `Sys_Quit (restart);` (restart=false) -> execv block skipped, `Sys_Exit(0);` | MATCH |
| admin-only (not client-issuable) | src/sv_ccmds.c:1876 + src/sv_user.c:3299 | `Cmd_AddCommand ("quit", SV_Quit_f);` (SERVERONLY) and absent from `ucmds[]` | MATCH |
| no KTX override | ktx/src (grep) | no `cmd_t` entry for "quit" | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Shuts down the server and exits the process | sv_ccmds.c:49-57 (SV_Quit) -> sv_sys_unix.c:295-312 / sv_sys_win.c:349-379 (Sys_Quit) -> sv_sys_unix.c:285-288 / sv_sys_win.c:326-331 (Sys_Exit) | `SV_Shutdown("Server shutdown.\n"); ... Sys_Quit(restart);` then `Sys_Quit`: with restart=false the `if(restart){}` block is skipped, falls to `Sys_Exit(0);` -> `exit(code);` | MATCH |
| 2 | All connected clients are disconnected | sv_main.c:242 calls SV_FinalMessage; sv_main.c:344-364 | `MSG_WriteByte(&net_message, svc_disconnect);` then `Netchan_Transmit(...)` to every client with `cl->state >= cs_spawned` | MATCH |
| 3 | Any in-progress MVD demo recording is stopped | sv_main.c:254-255 (inside SV_Shutdown); callee sv_demo.c:1016 | `if (sv.mvdrecording) SV_MVDStop_f();` -- guarded on the in-progress flag; callee is the demo-stop handler | MATCH |
| 4 | Open server log files are closed before the process terminates | sv_main.c:246-253 (logs[] enum log.h:24-25, decl log.h:37) | `for (i = MIN_LOG; i < MAX_LOG; ++i){ if (logs[i].sv_logfile){ fclose(logs[i].sv_logfile); logs[i].sv_logfile = NULL; } }` -- all of SV_Shutdown runs before Sys_Quit/Sys_Exit, so "before termination" holds | MATCH |
| 5 | The server does not relaunch (use restart for that) | sv_ccmds.c:64-66 (SV_Quit_f passes false) vs sv_ccmds.c:74-77 (SV_Restart_f passes true); sv_sys_unix.c:297-310 / sv_sys_win.c:351-377 | `SV_Quit_f -> SV_Quit(false)`; in Sys_Quit the `execv(com_argv[0], com_argv)` relaunch lives inside `if(restart)` which is skipped for quit; restart command passes true and reaches execv | MATCH |
| 6a | Set by server console / stdin | sv_main.c:3160-3171 (SV_GetConsoleCommands); registration sv_ccmds.c:1876 | `cmd = Sys_ConsoleInput(); ... Cbuf_AddText(cmd);` -> general cmd table where `Cmd_AddCommand("quit", SV_Quit_f)` lives; direct operator console = inherent admin | MATCH |
| 6b | Set by rcon | sv_main.c:1687-1828 (SVC_RemoteCommand) | `Rcon_Validate(...)` gates on master_rcon_password / rcon_password; `quit` is NOT in the ordinary-rcon denylist (lines 1754-1765); `do_cmd` -> `Cmd_ExecuteString(str)` (line 1828) reaches the quit handler | MATCH |
| 6c | (admin only) -- normal clients excluded | sv_user.c:3399-3424 (SV_ExecuteUserCommand); ucmds[] sv_user.c:3299-3395 contains no "quit" | client cmd matched only against `ucmds[]`; on no-match it tries `SV_ExecutePRCommand()` then `if(u->name) u->func(); else Con_Printf("Bad user command...")` -- `u` is at the NULL terminator so it NEVER falls through to the general command table; a connected client cannot run `quit` | MATCH |
| 7 | See also: restart | sv_ccmds.c:74-77, registration sv_ccmds.c:1877 | `void SV_Restart_f(void){ SV_Quit(true); }`; `Cmd_AddCommand("restart", SV_Restart_f)` -- sibling command, same SV_Quit dispatch with restart=true | MATCH |

Build context: CMakeLists.txt:169 `target_compile_definitions(... PRIVATE SERVERONLY)` confirms the `Sys_Quit(restart)` branch of SV_Quit (not the `Host_Quit()` #else) is the live path -- the entire trace for clauses 1 and 5 is against compiled code, not a dead branch.

**V-pass notes:** Oracle confirmed: `git describe --tags` == 1.11-53-g18d0362.

Verdict: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line (incl. callee-follow into Sys_Quit/Sys_Exit and SV_FinalMessage/SV_MVDStop_f). No clause rests on name/enum/string/comment inference.

Dispatch chain traced end-to-end: SV_Quit_f -> SV_Quit(false) -> [SV_Shutdown then Sys_Quit(false) -> Sys_Exit(0) -> exit()]. SERVERONLY is the live build define (CMakeLists.txt:169), so the SERVERONLY arm of SV_Quit (the Sys_Quit path, NOT Host_Quit) is the one executed -- I verified the path that actually compiles, defeating a potential dead-branch trap on clauses 1/5.

Access-class (the flavour-C-prone clause) was traced to dispatch code, not inferred from the command name: `quit` is a plain Cmd_AddCommand server-console command with no CF_ flag. It is reachable via (a) operator console/stdin (SV_GetConsoleCommands -> Cbuf_AddText), (b) rcon after password validation (SVC_RemoteCommand -> Cmd_ExecuteString; not in the ordinary-rcon denylist), and is NOT reachable by an ordinary connected client because SV_ExecuteUserCommand only consults ucmds[] (which lacks quit) and never falls through to the general command table. So "admin only" is enforced by the client-exclusion structure, verified at sv_user.c:3399-3424. The Windows GUI tray/dialog "Quit" (sv_windows.c:358-359, winquake.rc:55) also funnels through `Cbuf_AddText("quit\n")` -- a local-operator console-equivalent, consistent with the "server console" framing.

Single authoritative registration (sv_ccmds.c:1876); no PR2 builtin, alias, or cross-mod override re-routes `quit`.

## flags_for_review

- [fyi/other/vpass] Prose-vs-code ordering nuance (not a defect): the description lists side-effects as 'MVD recording is stopped, and open server log files are closed', but inside SV_Shutdown the log files are fclose'd first (sv_main.c:246-253) and SV_MVDStop_f() runs after (sv_main.c:254-255). The description asserts no ordering BETWEEN those two effects -- only that both occur 'before the process terminates', which is true (all of SV_Shutdown precedes Sys_Quit/Sys_Exit). No change needed; flagging only so a future editor does not read an order guarantee into the prose.
- [fyi/other/vpass] Edge case outside the described normal path: SV_Shutdown early-returns `if (!sv.state) return;` (sv_main.c:239-240). If `quit` is issued when the server is already shut down (ss_dead), none of the client-disconnect / MVD-stop / logfile-close side-effects run -- the process just exits via Sys_Quit->Sys_Exit. The description correctly characterizes the active-server case (the operative one); this is informational, not a contradiction.
- [fyi/other/vpass] Ordinary-rcon denylist (sv_main.c:1754-1765) blocks rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line for non-master rcon, but `quit` (and `restart`) are NOT on it -- so any authenticated rcon (master OR ordinary rcon_password) can shut the server down. This matches the description's 'rcon (admin only)' and is expected behavior; noted for completeness since 'admin only' spans both rcon tiers, not just master.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "quit",
  "type": "command",
  "description": "Shuts down the server and exits the process. All connected clients are disconnected, any in-progress MVD demo recording is stopped, and open server log files are closed before the process terminates. The server does not relaunch (use restart for that).\n\nSet by: server console / rcon / stdin (admin only).\nSee also: restart.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:51. Handler SV_Quit_f (src/sv_ccmds.c:64) calls SV_Quit(false) (src/sv_ccmds.c:66). SV_Quit (src/sv_ccmds.c:49) first calls SV_Shutdown(\"Server shutdown.\\n\") at :51 then Sys_Quit(false) at :53 (SERVERONLY branch). SV_Shutdown (src/sv_main.c:235) disconnects all clients via SV_FinalMessage at :242, stops MVD recording at :254-255 (SV_MVDStop_f), and closes all server log files at :246-252 -- these substantiate 'disconnects clients / stops MVD recording / closes logs'. With restart=false, Sys_Quit does NOT execv and falls through to Sys_Exit(0): src/sv_sys_unix.c:295-311 (the execv block at :305 is inside `if (restart)`, skipped; Sys_Exit(0) at :311) and src/sv_sys_win.c:349-378 (Sys_Exit(0) at :378). No-arg command -> no worked example (per chunk rule). Access-class admin-only: registered Cmd_AddCommand(\"quit\",SV_Quit_f) at src/sv_ccmds.c:1876 under SERVERONLY, ABSENT from client ucmds[] (table src/sv_user.c:3299), section comment src/sv_ccmds.c:40. F-MV1: no KTX command override for \"quit\" (grep of ktx/src returned nothing).",
  "description_proposed": null
}
```
