# describe-fill-synthesis ledger -- mvdsv `user`

- **project:** mvdsv
- **knob:** `user` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:user: synthesized -- prints a connected player's userinfo to console, addressed by userid (the 'status' number); admin-only (SERVERONLY Cmd_AddCommand, not in ucmds[], not blocklisted); no KTX override -- origin=synthesized ref=src/sv_ccmds.c:1546 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints a connected player's user info (their name, color, rate, and other client settings) to the server console.
>
> user <userid> = show the user info for the player whose id is <userid>. The userid is the number shown next to each player by the 'status' command (e.g. 'user 3' prints player id 3's settings). Prints "Userid N is not on the server" if no connected player has that id.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| takes exactly one arg, the userid | src/sv_ccmds.c:1537-1540 | `if (Cmd_Argc() != 2) { Con_Printf ("Usage: user <userid>\n"); return; }` | MATCH |
| arg resolved as integer userid | src/sv_ccmds.c:241,253 | `idnum = Q_atoi(Cmd_Argv(1));` ... `if (cl->userid == idnum)` | MATCH |
| "Userid N is not on the server" when no match | src/sv_ccmds.c:260 | `Con_Printf ("Userid %i is not on the server\n", idnum);` | MATCH |
| prints that player's userinfo to console | src/sv_ccmds.c:1546-1547 | `Info_ReverseConvert(&sv_client->_userinfo_ctx_, info, sizeof(info)); Info_Print(info);` | MATCH |
| registered, live in dedicated build | src/sv_ccmds.c:1890 + CMakeLists.txt:169 | `Cmd_AddCommand ("user", SV_User_f);` (in `#ifdef SERVERONLY`); `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)` | MATCH |
| admin-only: not client-issuable | src/sv_user.c (ucmds[]) | grep `"user"` in client-stringcmd table = no match | MATCH |
| admin-only: not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist tokens rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- `user` absent | MATCH |
| no KTX override (F-MV1) | ktx/src/commands.c, g_cmd.c | grep `"user"` cmd_t entry = no match | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Command `user` exists | sv_ccmds.c:1890 | `Cmd_AddCommand ("user", SV_User_f); // FIXME: probably should be done like CL_Serverinfo_f().` | MATCH |
| 2 | Prints user info to the server console | sv_ccmds.c:1547 -> common.c:1147,1163 -> sv_send.c:156-160 | `Info_Print(info);` ; Info_Print does `Con_Printf("%s ",key)`/`Con_Printf("%s\n",value)` ; Con_Printf: `if (SV_AddToRedirect(msg)) return;` else `Sys_Printf("%s",msg); SV_Write_Log(CONSOLE_LOG,0,msg);` | MATCH (console invocation -> server console/stdout+CONSOLE_LOG; rcon redirects to issuer -- standard mvdsv convention, traceable, not a contradiction) |
| 3 | Info = player name, color, rate, and other client settings (userinfo) | sv_ccmds.c:1546 + common.c:1497-1510 + sv_user.c:2375,2283-2287,4971 | `Info_ReverseConvert(&sv_client->_userinfo_ctx_, info, sizeof(info));` walks info_list building `\name\value` pairs; userinfo keys incl `Info_Set(&sv_client->_userinfo_ctx_, Cmd_Argv(1), Cmd_Argv(2))` (generic setinfo), shortinfotbl `"name","topcolor","bottomcolor"`, rate via `Info_Get(&cl->_userinfo_ctx_,"rate")` | MATCH (illustrative examples; Info_ReverseConvert skips empty values so only client-set keys appear, but name/colors/rate are standard) |
| 4 | `user <userid>` shows that player's info; usage on wrong argc | sv_ccmds.c:1537-1544 + SV_SetPlayer 241,253-257 | `if (Cmd_Argc() != 2){ Con_Printf("Usage: user <userid>\n"); return; }` ; `if (!SV_SetPlayer()) return;` ; in SV_SetPlayer: `idnum = Q_atoi(Cmd_Argv(1));` ... `if (cl->userid == idnum){ sv_client = cl; sv_player = sv_client->edict; return true; }` | MATCH (user 3 -> idnum=3 -> matches userid 3 -> prints that player's userinfo) |
| 5 | userid = number shown by `status` command | sv_ccmds.c:1209,1216-1217 (SV_Status_f) | header `name ... id ... address` ; `Con_Printf ("%-16s %4i %5i %6i %-22s ", cl->name, (int)SV_CalcPing(cl), (int)cl->edict->v->frags, cl->userid, ...)` | MATCH |
| 6 | Prints "Userid N is not on the server" if no connected player has that id | sv_ccmds.c:260 (SV_SetPlayer, after the client loop) | `Con_Printf ("Userid %i is not on the server\n", idnum); return false;` | MATCH (exact string; %i = parsed idnum) |
| 7 | Set by: server console / rcon | sv_ccmds.c:1890 (Cmd_AddCommand inside #ifdef SERVERONLY) + NOT present in sv_user.c:3299 ucmds[] client table | registered only via `Cmd_AddCommand("user", SV_User_f)`; absent from client-accessible `ucmds[]` | MATCH (server console command, reachable via console or rcon; not a player-issued ucmd) |

**V-pass notes:** All 7 material clauses enforce-traced to located lines and match code + adjacent comments. Handler is SV_User_f (sv_ccmds.c:1533-1549): validates argc==2 (else usage), calls SV_SetPlayer() which parses Cmd_Argv(1) via Q_atoi and matches cl->userid, then Info_ReverseConvert(&sv_client->_userinfo_ctx_) + Info_Print to dump the player's full userinfo key/value set.

Clause 2 carries one minor simplification: Con_Printf (sv_send.c:146) first tries SV_AddToRedirect -- under rcon the output is redirected back to the rcon issuer, not literally written to the physical server console. For a console-typed invocation (RD_NONE) the output goes to Sys_Printf (server stdout) + CONSOLE_LOG, i.e. the server console. The description says "to the server console" and "Set by: server console / rcon"; this is the standard mvdsv console-command convention, is fully traceable to the redirect logic, and does not contradict the code. Classified as still-true minor vagueness, not flavour-C -> TRACED-CLEAN (not C-NEAR-MISS), since the redirect destination is a property of all console commands rather than a wrong assertion specific to this knob.

The SV_SetPlayer RD_CLIENT HACK (line 244-247, overriding idnum to the caller's own userid) applies to client-issued cheat commands (god/noclip/give), NOT to `user` -- `user` is console/rcon-only (absent from ucmds[]), so idnum always derives from Cmd_Argv(1). No clause affected.

WI-2 access-class: no CF_ command-table involved; `user` is a plain Cmd_AddCommand server command gated by being console/rcon-reachable only. "Set by: server console / rcon" verified against registration site + absence from the client ucmd table.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "user",
  "type": "command",
  "description": "Prints a connected player's user info (their name, color, rate, and other client settings) to the server console.\n\nuser <userid> = show the user info for the player whose id is <userid>. The userid is the number shown next to each player by the 'status' command (e.g. 'user 3' prints player id 3's settings). Prints \"Userid N is not on the server\" if no connected player has that id.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1546. Handler SV_User_f (src/sv_ccmds.c:1533-1549), registered src/sv_ccmds.c:1890 via Cmd_AddCommand inside #ifdef SERVERONLY (1888-1891); SERVERONLY is compiled in for the dedicated server build (CMakeLists.txt:169 target_compile_definitions ... SERVERONLY), so the command is live. The shipped block-comment ('Examine a users info strings') + the trailing '// FIXME: probably should be done like CL_Serverinfo_f()' are coder-WHY, not user-WHAT -> synthesize (D5 amendment). Clause traces: (1) takes exactly one arg = userid: src/sv_ccmds.c:1537 'if (Cmd_Argc() != 2) { Con_Printf(\"Usage: user <userid>\\n\"); return; }'. (2) the arg is resolved as an integer userid: SV_SetPlayer (src/sv_ccmds.c:241 'idnum = Q_atoi(Cmd_Argv(1))', matched at :253 'if (cl->userid == idnum)'); not-found path prints \"Userid %i is not on the server\" (:260) -> the not-on-server clause + the 'userid is the status number' framing. (3) prints the resolved client's userinfo to console: src/sv_ccmds.c:1546-1547 'Info_ReverseConvert(&sv_client->_userinfo_ctx_, info, ...); Info_Print(info);' (the authoritative read use-site = source_ref). Access-class: NOT in ucmds[] (grep of src/sv_user.c for \"user\" in the client-stringcmd table = empty), so no client-issuable path; NOT on the normal-rcon blocklist (src/sv_main.c:1754-1764 token list = rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- 'user' absent) -> normal 'server console / rcon', admin-only. F-MV1: no KTX override (ktx/src commands.c + g_cmd.c carry no \"user\" cmd_t entry; KTX command tables are gameplay-only).",
  "description_proposed": null
}
```
