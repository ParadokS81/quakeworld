# describe-fill-synthesis ledger -- mvdsv `kick`

- **project:** mvdsv
- **knob:** `kick` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:kick: synthesized -- disconnects player by user-id with optional broadcast reason; admin-only console/rcon; KTX has a separate same-named QC command on a different dispatch path -- origin=synthesized ref=src/sv_ccmds.c:831 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Disconnects a connected player from the server. Identifies the player by their user-id number (the number shown beside each player in the status list), not their name. An optional reason can be added; it is shown to everyone as "<player> was kicked (<reason>)" and the kicked player is told they were kicked.
>
> kick <userid> [reason] = drop the player with that user-id, optionally citing a reason.
>
> Example: kick 3 cheating  ->  drops the player whose user-id is 3 and announces "<name> was kicked (cheating)".
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| usage form `kick <userid> [reason]` | src/sv_ccmds.c:809-823 | `c = Cmd_Argc(); if (c < 2) { ... Con_Printf ("kick <userid> [reason]\n"); return; }` | MATCH |
| identifies by user-id number not name | src/sv_ccmds.c:825,831 | `uid = Q_atoi(Cmd_Argv(1));` ... `if (cl->userid == uid)` | MATCH |
| userid = per-connection identifying number (status number) | src/server.h:206; src/sv_ccmds.c:1217 | `int userid; // identifying number`; status prints `cl->userid` | MATCH |
| optional reason from args 2+, shown in parentheses | src/sv_ccmds.c:833-846 | `strlcpy(reason," (",...)` ... `strlcat(reason,")",...)` | MATCH |
| broadcast `<name> was kicked (<reason>)` + drop client | src/sv_ccmds.c:861-865 | `SV_BroadcastPrintf(PRINT_HIGH,"%s was kicked%s\n",...)` ... `SV_DropClient(cl)` | MATCH |
| admin-only (not in client ucmds[]) | src/sv_user.c:3299-3375 | `static ucmd_t ucmds[] = {...}` -- no `kick` entry | MATCH |
| NOT on normal-rcon blocklist -> rcon reaches it | src/sv_main.c:1754-1764 | blocklist tokens rm/rmdir/ls/chmod/... -- no `kick` | MATCH |
| F-MV1 KTX has separate `kick` (different path) | ktx/src/commands.c:794 | `{ "kick", AdminKick, 0, CF_BOTH_ADMIN/* FIXME: interference with ezq server kick command */, CD_KICK }` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Disconnects a connected player from the server | src/sv_ccmds.c:864 -> src/sv_main.c:377+ | `SV_DropClient(cl);` calling `SV_DropClient` which does `MSG_WriteByte (&drop->netchan.message, svc_disconnect);` | MATCH |
| 2a | Identifies player by user-id number (not name) | src/sv_ccmds.c:825, 831 | `uid = Q_atoi(Cmd_Argv(1));` ... `if (cl->userid == uid)` | MATCH |
| 2b | The user-id is the number shown beside each player in the status list | src/sv_ccmds.c:1209-1217 | header `"name ... id ... "` ; `Con_Printf("%-16s %4i %5i %6i %-22s ", cl->name, ..., cl->userid, ...)` (id column) | MATCH |
| 3 | An optional reason can be added | src/sv_ccmds.c:808, 833-846 | `char reason[80] = "";` ... `if (c > 2) { ... build reason ... }` | MATCH |
| 4 | Shown to everyone as "<player> was kicked (<reason>)" | src/sv_ccmds.c:860 (+ 835-845 fmt) | `SV_BroadcastPrintf(PRINT_HIGH, "%s was kicked%s\n", cl->name, reason);` ; reason = `" (" + words + ")"` | MATCH |
| 5 | The kicked player is told they were kicked | src/sv_ccmds.c:862 | `SV_ClientPrintf(cl, PRINT_HIGH, "You were kicked from the game%s\n", reason);` | MATCH |
| 6 | Syntax: kick <userid> [reason] | src/sv_ccmds.c:821 | `Con_Printf ("kick <userid> [reason]\n");` (verbatim usage string) | MATCH |
| 7 | Example: kick 3 cheating -> drops uid 3, announces "<name> was kicked (cheating)" | src/sv_ccmds.c:825,831,835-845,860 | consistent extrapolation of traced uid-match + reason-format + broadcast logic | MATCH |
| 8 | Set by: server console / rcon | src/sv_ccmds.c:1835; src/cmd.c:916-942; src/sv_main.c:1828; src/sv_user.c:3299-3385,3408-3424 | `Cmd_AddCommand ("kick", SV_Kick_f);` (plain, no CF flag). Reachable via console/rcon `Cmd_ExecuteString`. NOT in `ucmds[]`; `SV_ExecuteUserCommand` (client clc_stringcmd path) does not fall through to `Cmd_ExecuteString`, so connected clients cannot invoke it. | MATCH |

**V-pass notes:** All 8 material clauses enforcement-traced to live source at mvdsv 1.11-53-g18d0362 (version confirmed). Registration: src/sv_ccmds.c:1835 `Cmd_AddCommand("kick", SV_Kick_f)`. Handler SV_Kick_f (sv_ccmds.c:802-854) parses userid via Q_atoi, linear-scans svs.clients for cl->userid==uid (NO name matching anywhere), builds optional reason from args 2+, then calls callee SV_KickClient (sv_ccmds.c:856-865) which does the broadcast announce, the per-client notice, a log line, and SV_DropClient (the actual disconnect, traced into sv_main.c:377 -> svc_disconnect).

Followed three call chains per discipline: (1) SV_KickClient -> SV_DropClient to confirm clause 1's disconnect; (2) the dispatch chain Cmd_ExecuteString (cmd.c:916) to confirm plain commands dispatch unconditionally at that layer, so the access class lives at its call-sites; (3) the connected-client path SV_ExecuteUserCommand (sv_user.c:3399) which dispatches ONLY through ucmds[] + mod QC, confirming kick is unreachable from a client clc_stringcmd. Verified kick is absent from the FULL ucmds[] table (sv_user.c:3299-3385). rcon path confirmed at sv_main.c:1828 (SVC_RemoteCommand -> Cmd_ExecuteString). WI-2 access-class clause therefore traced to dispatch code, not inferred from a flag name -- and mvdsv's kick carries no CF_ flag at all.

Announce string verbatim: "%s was kicked%s" with reason formatted as " (<space-joined words>)" -> renders exactly "<name> was kicked (cheating)" for the example. Status-list id-column claim verified against SV_Status_f (printed both in RD_NONE local-console layout and the redirected/rcon layout). No clause is name/enum/string/comment inference; every assertion has a located enforcing line plus matching adjacent code. Description is accurate and complete -> TRACED-CLEAN.

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX registers its own 'kick' command (ktx/src/commands.c:794, AdminKick, CF_BOTH_ADMIN) whose source comment reads '/* FIXME: interference with ezq server kick command | CF_PARAMS */'. The engine SV_Kick_f (rcon/console, by user-id) and the KTX QC kick (in-game admin command) coexist on separate dispatch paths -- a client stringcmd 'kick' is not in ucmds[] so it reaches QC progs (KTX), while the engine command is console/rcon only. The KTX FIXME suggests the mod author perceived a name collision; worth a human look to confirm no surprising precedence on the local console.
- [fyi/other/vpass] Reason-suppression edge case at src/sv_ccmds.c:842-843: `if (strlen(reason) < 3) reason[0] = '\0';`. When more than one arg is supplied (c>2) but the joined reason is shorter than 3 chars (e.g. a single 0-length token), the reason is silently dropped and the kick proceeds with no reason. Does NOT contradict any clause (description correctly calls the reason optional), so it does not change the TRACED-CLEAN verdict -- noted only as a behavioral nuance not surfaced in the user-doc.
- [fyi/other/vpass] src/sv_ccmds.c:813-820 (SERVERONLY-excluded block): in a non-dedicated (client+server) build, `kick` with no args first checks for a user-defined `kick` alias and executes it instead of printing usage -- comment: 'some mods use a "kick" alias for their own needs'. Irrelevant to the dedicated-server admin semantics the description documents (and only triggers on the zero-arg/usage path), but it is a build-conditional branch on the same command. FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "kick",
  "type": "command",
  "description": "Disconnects a connected player from the server. Identifies the player by their user-id number (the number shown beside each player in the status list), not their name. An optional reason can be added; it is shown to everyone as \"<player> was kicked (<reason>)\" and the kicked player is told they were kicked.\n\nkick <userid> [reason] = drop the player with that user-id, optionally citing a reason.\n\nExample: kick 3 cheating  ->  drops the player whose user-id is 3 and announces \"<name> was kicked (cheating)\".\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:831. Handler SV_Kick_f (src/sv_ccmds.c:802), registered src/sv_ccmds.c:1835. Clause traces: (1) usage form 'kick <userid> [reason]' enforced by the arg-count guard `if (c < 2) ... Con_Printf(\"kick <userid> [reason]\\n\")` at sv_ccmds.c:809-823 (in the SERVERONLY dedicated build the mod-alias fallback at :811-817 is compiled out, so c<2 falls straight to usage). (2) match-by-userid (NOT name): `uid = Q_atoi(Cmd_Argv(1))` sv_ccmds.c:825 then `if (cl->userid == uid)` sv_ccmds.c:831; userid is the per-connection 'identifying number' (server.h:206), the same value the status list prints (sv_ccmds.c:1217). (3) reason from args 2+ wrapped in ' (...)': sv_ccmds.c:833-846. (4) drop + broadcast: SV_KickClient (sv_ccmds.c:857) does SV_BroadcastPrintf(PRINT_HIGH,\"%s was kicked%s\\n\",...) at :861, SV_ClientPrintf 'You were kicked...' :863, SV_DropClient :865. Access class: 'kick' is registered only via Cmd_AddCommand and is NOT present in the client ucmds[] table (sv_user.c:3299-3375 -- the only cheat-style duals there are god/give/noclip/fly), so a client stringcmd cannot reach SV_Kick_f; it is admin-only (console/rcon). NOT on the normal-rcon blocklist token list (sv_main.c:1754-1764), so normal rcon tier reaches it -> 'server console / rcon'. F-MV1: KTX defines its OWN 'kick' in its QC command table (ktx/src/commands.c:794, handler AdminKick, flag CF_BOTH_ADMIN, with a source comment '/* FIXME: interference with ezq server kick command */'). The two are distinct dispatch paths -- a client `cmd kick` is not in ucmds[] so it routes to QC progs (KTX AdminKick), while the engine SV_Kick_f documented here is reachable only from console/rcon. No same-path override of the engine command; flagged for review. Default omitted (no meaningful no-arg default; no-arg prints usage).",
  "description_proposed": null
}
```
