# describe-fill-synthesis ledger -- mvdsv `say`

- **project:** mvdsv
- **knob:** `say` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `command-stragglers` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:say: synthesized -- console broadcast to all spawned players as PRINT_CHAT (sv_ccmds.c:1347), MVD+log copies; dual with player Cmd_Say_f -- origin=synthesized ref=src/sv_ccmds.c:1347 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Broadcasts a chat message from the server console to every spawned (in-game) player, shown in their chat as a line prefixed with "console: ". The message is also written to the running MVD demo (if one is recording), and printed to the server console; it is also written to the console log only when console logging is enabled (see qconsole_log_say).
>
> say <message> = send <message> to all players as the server/console.
>
> Set by: server console / rcon. A player typing "say" in their own client uses a separate path that sends their normal player chat, not this server broadcast.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| compiled in mvdsv build | CMakeLists.txt:169 | `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)` | MATCH |
| registration (locator) | src/sv_ccmds.c:1875 | `Cmd_AddCommand ("say", SV_ConSay_f);` (in #ifdef SERVERONLY) | MATCH |
| broadcast to all spawned players as chat | src/sv_ccmds.c:1347-1352 | `for (...client++) { if (client->state != cs_spawned) continue; SV_ClientPrintf2(client, PRINT_CHAT, "%s", text); }` | MATCH |
| "console: " prefix | src/sv_ccmds.c:1331 | `char text[1024] = "console: ";` | MATCH |
| requires >=1 message arg | src/sv_ccmds.c:1333-1334 | `if (Cmd_Argc () < 2) return;` | MATCH |
| surrounding quotes stripped | src/sv_ccmds.c:1338-1342 | `if (*p == '"') { p++; p[strlen(p)-1] = 0; }` | MATCH |
| written to MVD demo when recording | src/sv_ccmds.c:1354-1362 | `if (sv.mvdrecording) { if (MVDWrite_Begin (dem_all, 0, ...)) { MVD_MSG_WriteByte(svc_print); MVD_MSG_WriteByte(PRINT_CHAT); MVD_MSG_WriteString(text); } }` | MATCH |
| printed to server console + console log | src/sv_ccmds.c:1364-1365 | `Sys_Printf("%s", text); SV_Write_Log(CONSOLE_LOG, 1, text);` | MATCH |
| player 'say' is a separate handler (dual path) | src/sv_user.c:3316 | `{"say", Cmd_Say_f, true},` | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | blocklist = rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- 'say' absent | MATCH |
| no KTX override | research/repos/ktx/src | no `Cmd_AddCommand("say"...)` / cmd_t "say" entry | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| C1 | console `say` command (server-console origin) | src/sv_ccmds.c:1875 (inside `#ifdef SERVERONLY`) | `Cmd_AddCommand ("say", SV_ConSay_f);` | MATCH |
| C2 | broadcasts to "every connected player" | src/sv_ccmds.c:1347-1352 (+ enum src/server.h:148-153) | `for (...; j < MAX_CLIENTS; ...) { if (client->state != cs_spawned) continue; SV_ClientPrintf2(client, PRINT_CHAT, ...); }` -- enum: `cs_connected // not in game yet`, `cs_spawned // fully in game` | MISMATCH (narrowing) -- only SPAWNED (in-game) clients; connecting/downloading clients (cs_connected/cs_preconnected) are skipped |
| C3 | shown in chat, prefixed "console: " | src/sv_ccmds.c:1331; routing src/sv_send.c:207-209; level src/bothdefs.h:143 | `char text[1024] = "console: ";` ... sent via `SV_ClientPrintf2(client, PRINT_CHAT, ...)`; `PRINT_CHAT 3 // chat messages`; PrintToClient writes `svc_print`+level | MATCH |
| C4 | also written to MVD demo if recording | src/sv_ccmds.c:1354-1362 | `if (sv.mvdrecording) { if (MVDWrite_Begin(dem_all,0,...)) { MVD_MSG_WriteByte(svc_print); MVD_MSG_WriteByte(PRINT_CHAT); MVD_MSG_WriteString(text); } }` | MATCH |
| C5 | printed to server console | src/sv_ccmds.c:1364 | `Sys_Printf("%s", text);` | MATCH |
| C6 | "recorded in the console log" (asserted unconditionally) | write src/sv_ccmds.c:1365; gate src/sv_main.c:4145; level binding src/sv_ccmds.c:137-138 + src/sv_main.c:3902-3904; default src/sv_main.c:96 | `SV_Write_Log(CONSOLE_LOG, 1, text);` -- but `if (logs[sv_log].log_level < level) return;` and `logs[CONSOLE_LOG].log_level = Cvar_Value("qconsole_log_say")` / `OnChange...= Q_atoi(value)`; `cvar_t qconsole_log_say = {"qconsole_log_say", "0", ...}` | MISMATCH -- gated by `qconsole_log_say` (default "0" = OFF) AND console logfile being opened (`logfile` cmd); NOT an always-on side-effect |
| C7 | usage `say <message>` = send to all as server/console | src/sv_ccmds.c:1333-1336; src/cmd.c:682 | `if (Cmd_Argc () < 2) return; p = Cmd_Args();` (empty say = silent no-op) | MATCH |
| C8 | set by server console / rcon | src/sv_main.c:1828 (rcon dispatch) | `Cmd_ExecuteString(str);` -- rcon executes against same command table where `say` is registered | MATCH |
| C9 | client-typed `say` is a separate path = normal player chat, not this broadcast | src/sv_user.c:3316 (ucmd table) -> src/sv_user.c:1953 -> src/sv_user.c:1775 `SV_Say` | `{"say", Cmd_Say_f, true}` ; `SV_Say(false)` ; `static void SV_Say (qbool team)` builds player chat (`text[2048]`, login/mod-QC dispatch), no "console: " prefix | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

Knob is the dedicated-server (`#ifdef SERVERONLY`) console command `say` -> SV_ConSay_f (src/sv_ccmds.c:1326-1366). Most clauses trace clean. Two defects:

C6 is the C-FIX trigger (flavour-C contradiction). The description asserts the message is unconditionally "recorded in the console log." The enforcing call `SV_Write_Log(CONSOLE_LOG, 1, text)` (sv_ccmds.c:1365) passes through TWO gates that default OFF:
  1. The console logfile must be open -- opened only via the `logfile` command (SV_Logfile_f -> SV_Logfile(CONSOLE_LOG); sv_ccmds.c:150-152), not at startup. SV_Write_Log returns early if `logs[CONSOLE_LOG].sv_logfile` is NULL (sv_main.c:4142).
  2. Level gate: `if (logs[sv_log].log_level < level) return;` (sv_main.c:4145) with level=1. The console log's level is bound to cvar `qconsole_log_say` (set at open time sv_ccmds.c:137-138, and via OnChange sv_main.c:3902-3904), whose registered default is "0" (sv_main.c:96). With qconsole_log_say=0, log_level=0 < 1, so the say line is dropped.
  So at stock defaults the console `say` broadcast is NOT written to the console log. The cvar's own comment (sv_main.c:97) reads "logging 'say' and 'say_team' messages to the qconsole_PORT.log file" -- i.e., logging is explicitly an opt-in. The clause needs to be hedged the same way C4 already hedges the MVD write: "and (if console logging is enabled via qconsole_log_say) recorded in the console log."

C2 is an additional narrowing defect (would be C-NEAR-MISS standalone). "Broadcasts ... to every connected player" -- the send loop skips any client whose state != cs_spawned (sv_ccmds.c:1349). The state enum (server.h:148-153) distinguishes cs_connected ("assigned ... but not in game yet") and cs_preconnected from cs_spawned ("fully in game"). So a player who is connecting/downloading is "connected" but does NOT receive the message. Precise wording: every in-game / spawned player. (Note: SV_BroadcastPrintf-style sends elsewhere loop on messagelevel without the cs_spawned filter; this command deliberately restricts to spawned clients, so the narrowing is a real behavioral fact, not incidental.)

Everything else verified to its enforcing line incl. adjacent comments: prefix literal (1331), PRINT_CHAT=3 chat level (bothdefs.h:143) which also means messagelevel can never suppress it (3 >= any messagelevel), single dem_all MVD write gated on sv.mvdrecording (1354), Sys_Printf console echo (1364), rcon reaching the command table via Cmd_ExecuteString (sv_main.c:1828), and the wholly-separate client ucmd `say`->SV_Say path (sv_user.c:1775) that produces normal player chat. The C9 distinction in the description is accurate.

Suggested minimal fix (do not apply -- V-pass is read-only): (a) qualify C6 with the qconsole_log_say gate; (b) change "every connected player" -> "every in-game (spawned) player".

## flags_for_review

- [review/contradiction/vpass] C6 flavour-C: description asserts console `say` is unconditionally 'recorded in the console log', but SV_Write_Log(CONSOLE_LOG,1,...) (sv_ccmds.c:1365) is gated by log_level>=1 where console log_level = cvar qconsole_log_say (default '0' = OFF; sv_main.c:96,3902-3904,4145) AND requires the console logfile to be manually opened via the `logfile` command (sv_ccmds.c:150-152; sv_main.c:4142). At stock defaults the line is dropped. The cvar comment (sv_main.c:97) confirms say-logging is opt-in.
- [review/contradiction/vpass] C2 narrowing: 'every connected player' overstates. SV_ConSay_f loop skips clients with state != cs_spawned (sv_ccmds.c:1349); the state enum (server.h:148-153) marks cs_connected as 'not in game yet' vs cs_spawned 'fully in game'. Connecting/downloading clients do not receive the message. Correct scope = every in-game/spawned player.
- [fyi/other/vpass] Same qconsole_log_say gate applies to the client player-chat path: SV_Say also calls SV_Write_Log(CONSOLE_LOG,1,text) (sv_user.c:1873). So both server-console say and player say share the qconsole_log_say opt-in for console logging -- consistent behavior, relevant if the player-`say` knob is documented elsewhere.
- [fyi/other/vpass] `say` registration is inside `#ifdef SERVERONLY` (sv_ccmds.c:1874-1878). For the MVDSV dedicated-server build this is the live registration (correct knob). In a non-SERVERONLY (client) build the console `say` would instead resolve to the client-side Cmd_Say_f path; not applicable to MVDSV but worth noting for cross-build framing.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, quit=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "say",
  "type": "command",
  "description": "Broadcasts a chat message from the server console to every spawned (in-game) player, shown in their chat as a line prefixed with \"console: \". The message is also written to the running MVD demo (if one is recording), and printed to the server console; it is also written to the console log only when console logging is enabled (see qconsole_log_say).\n\nsay <message> = send <message> to all players as the server/console.\n\nSet by: server console / rcon. A player typing \"say\" in their own client uses a separate path that sends their normal player chat, not this server broadcast.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1347. Console 'say' registered Cmd_AddCommand(\"say\", SV_ConSay_f) at sv_ccmds.c:1875 inside #ifdef SERVERONLY; SERVERONLY is unconditionally defined for the mvdsv build (CMakeLists.txt:169), so it is compiled. Handler SV_ConSay_f at sv_ccmds.c:1326. BROADCAST/prefix clause: text buffer initialized to \"console: \" (sv_ccmds.c:1331), message appended (1344-1345), loop over svs.clients sending SV_ClientPrintf2(client, PRINT_CHAT, ...) to every client whose state==cs_spawned (sv_ccmds.c:1347-1352) -- this is the enforcing read-site for 'all connected players'/'chat'. ARG-REQUIRED clause: returns if Cmd_Argc()<2 (sv_ccmds.c:1333-1334), so >=1 message arg required; surrounding double-quotes stripped (1338-1342). MVD clause: if sv.mvdrecording, writes svc_print/PRINT_CHAT/text into the demo via MVDWrite_Begin(dem_all,...) (sv_ccmds.c:1354-1362). CONSOLE/LOG clause: Sys_Printf(\"%s\", text) (1364) and SV_Write_Log(CONSOLE_LOG, 1, text) (1365). DUAL-PATH clause: 'say' also present in the client ucmd table {\"say\", Cmd_Say_f, true} at sv_user.c:3316, the separate player-chat handler reached when a player issues 'say' over the network; the console registration here is the admin/console broadcast. ACCESS clause: SV_ConSay_f is registered only via Cmd_AddCommand (console command), is NOT on the normal-rcon blocklist (sv_main.c:1754-1764), so reachable from local console and both rcon tiers. F-MV1: KTX (research/repos/ktx/src) does not register a 'say' command override (the g_cmd.c:228 'say_time' hit is an unrelated KTX flood variable). All clauses TRACED-CLEAN against enforcing lines; no name/string inference. D20: file:line cites kept out of description.",
  "description_proposed": null
}
```
