# describe-fill-synthesis ledger -- mvdsv `serverinfo`

- **project:** mvdsv
- **knob:** `serverinfo` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:serverinfo: synthesized -- console show/set serverinfo keys (rejects star keys, "0"=clear, syncs serverinfo cvar, pushes change to clients); console/rcon, client cmd is read-only -- origin=synthesized ref=src/sv_ccmds.c:1428 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Shows or changes the server's serverinfo keys (the public server settings broadcast to connecting clients). When a key changes, the new value is pushed to clients already on the server.
>
> serverinfo = list every serverinfo key and value, plus the total length used.
> serverinfo <key> = show the current value of one key.
> serverinfo <key> <value> = set that key to the given value.
>
> Setting a key to "0" clears it (stores an empty value). Keys beginning with "*" (star keys, set by the server itself) cannot be changed this way. If the key is also a serverinfo cvar, that cvar is updated as well.
>
> Set by: server console / rcon. (Any connected client can also run 'cmd serverinfo' to dump the serverinfo string read-only, but cannot change it.)

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-arg lists all keys + length | src/sv_ccmds.c:1402-1408 | `if (Cmd_Argc()==1){ Con_Printf("Server info settings:\n"); Info_Print(svs.info); Con_Printf("[%d/%d]\n", strlen(svs.info), MAX_SERVERINFO_STRING); return; }` | MATCH |
| 1-arg shows one key | src/sv_ccmds.c:1411-1419 | `if (Cmd_Argc()==2){ s=Info_ValueForKey(svs.info, Cmd_Argv(1)); if(*s) Con_Printf("Serverinfo %s: \"%s\"\n",...) else Con_Printf("No such key %s\n",...); return; }` | MATCH |
| 2-arg sets key | src/sv_ccmds.c:1428-1429 | `key = Cmd_Argv(1); value = Cmd_Argv(2);` | MATCH |
| star keys cannot be changed | src/sv_ccmds.c:1431-1435 | `if (key[0]=='*'){ Con_Printf("Star variables cannot be changed.\n"); return; }` | MATCH |
| value "0" clears the key | src/sv_ccmds.c:1438-1439 | `if (!strcmp(value,"0")) value = "";` | MATCH |
| serverinfo cvar synced too | src/sv_ccmds.c:1442-1446 | `var=Cvar_Find(key); if (var && (var->flags & CVAR_SERVERINFO)) Cvar_Set(var,value); else SV_ServerinfoChanged(key,value);` | MATCH |
| change pushed to connected clients | src/sv_ccmds.c:1383-1386 | `if (strcmp(string, Info_ValueForKey(svs.info,key))) { Info_SetValueForKey(...); SV_SendServerInfoChange(key,string); }` | MATCH |
| client 'cmd serverinfo' is read-only display | src/sv_user.c:2493-2496 | `static void Cmd_ShowServerinfo_f(void){ Info_Print(svs.info); }` | MATCH |
| client path registered in ucmds[] (flag false) | src/sv_user.c:3321 | `{"serverinfo", Cmd_ShowServerinfo_f, false},` | MATCH |
| normal rcon NOT blocked | src/sv_main.c:1754-1764 | blocklist token list has no "serverinfo" entry | MATCH |
| no KTX override | ktx/src | grep `"serverinfo"` -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Shows or changes the server's serverinfo keys (public settings broadcast to connecting clients) | sv_ccmds.c:1396-1451 (handler SV_Serverinfo_f); cvar.h:62 (semantics) | cvar.h:62 `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo`; handler examines/changes svs.info | MATCH |
| 2 | When a key changes, new value pushed to clients already on the server | sv_ccmds.c:1373-1375 (write svc_serverinfo to sv.reliable_datagram) -> sv_send.c:1051-1052 (flushed per client) | `MSG_WriteByte(&sv.reliable_datagram, svc_serverinfo); MSG_WriteString(...,key); MSG_WriteString(...,value)` then `ClientReliableCheckBlock(client, sv.reliable_datagram.cursize); ClientReliableWrite_SZ(client, sv.reliable_datagram.data, sv.reliable_datagram.cursize)` | MATCH |
| 3 | serverinfo (no args) = list every key+value plus total length used | sv_ccmds.c:1402-1407; common.c:1124-1163 (Info_Print iterates all \key\value pairs) | `if (Cmd_Argc()==1){ Con_Printf("Server info settings:\n"); Info_Print(svs.info); Con_Printf("[%d/%d]\n", strlen(svs.info), MAX_SERVERINFO_STRING); return; }` | MATCH |
| 4 | serverinfo <key> = show current value of one key | sv_ccmds.c:1411-1419 | `if (Cmd_Argc()==2){ s = Info_ValueForKey(svs.info, Cmd_Argv(1)); if(*s) Con_Printf("Serverinfo %s: \"%s\"\n", Cmd_Argv(1), s); else Con_Printf("No such key %s\n", Cmd_Argv(1)); return; }` | MATCH |
| 5 | serverinfo <key> <value> = set that key to given value | sv_ccmds.c:1422-1449 (Argc!=3 -> usage; else key/value assigned and applied) | `key=Cmd_Argv(1); value=Cmd_Argv(2); ...` | MATCH |
| 6 | Setting a key to "0" clears it (stores empty value) | sv_ccmds.c:1437-1439 (unconditional in command path) | `// force serverinfo "0" vars to be ""` `if (!strcmp(value, "0")) value = "";` | MATCH |
| 7 | Star keys ("*") cannot be changed this way | sv_ccmds.c:1431-1435 (explicit guard) + common.c:1113-1118 (backstop in Info_SetValueForKey) | `if (key[0]=='*'){ Con_Printf("Star variables cannot be changed.\n"); return; }` and common.c `if(key[0]=='*'){ Con_Printf("Can't set * keys\n"); return; }` | MATCH |
| 8 | If the key is also a serverinfo cvar, that cvar is updated as well | sv_ccmds.c:1442-1446 | `var = Cvar_Find(key); if (var && (var->flags & CVAR_SERVERINFO)) { Cvar_Set(var, value); /* this call SV_ServerinfoChanged() as well. */ }` | MATCH |
| 9 | Set by: server console / rcon | sv_ccmds.c:1888-1891 (#ifdef SERVERONLY; Cmd_AddCommand console table); CMakeLists.txt:169 (SERVERONLY defined for MVDSV); sv_main.c:1701-1828 (rcon password-gated -> Cmd_ExecuteString); cmd.c Cmd_ExecuteString dispatches cmd_hash_array | `#ifdef SERVERONLY Cmd_AddCommand("serverinfo", SV_Serverinfo_f);` ; `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)` ; rcon: `Cmd_ExecuteString(str)` after Rcon_Validate | MATCH |
| 10 | Any connected client can run 'cmd serverinfo' to dump string read-only, but cannot change | sv_user.c:3321 (ucmd entry, overrideable=false) -> sv_user.c:2493-2496 (Cmd_ShowServerinfo_f); sv_user.c:3399-3416 (SV_ExecuteUserCommand dispatches ucmds[] only) | `{"serverinfo", Cmd_ShowServerinfo_f, false}` ; `static void Cmd_ShowServerinfo_f(void){ Info_Print(svs.info); }` (no mutation); client stringcmd path never reaches SV_Serverinfo_f | MATCH |

**V-pass notes:** Oracle version confirmed: git describe --tags == "1.11-53-g18d0362". Trace-discipline doc read and applied per-clause.

VERDICT: TRACED-CLEAN. Every one of the 10 material clauses maps to a located, verified enforcing line (incl. adjacent comments). No contradictions, no untraceable assertions, no metadata errors.

Key trace findings (WI-1 wide read of ALL serverinfo command sites):
- The knob "serverinfo" exists at exactly TWO dispatch sites, and they are intentionally different:
  (a) Console/rcon command: Cmd_AddCommand("serverinfo", SV_Serverinfo_f) at sv_ccmds.c:1889, INSIDE #ifdef SERVERONLY (lines 1888-1891). SERVERONLY is defined for MVDSV (CMakeLists.txt:169). SV_Serverinfo_f is the show/change handler the description's main body documents.
  (b) Client user-command: ucmds[] entry {"serverinfo", Cmd_ShowServerinfo_f, false} at sv_user.c:3321. Connected-client stringcmds dispatch ONLY through ucmds[] (SV_ExecuteUserCommand, sv_user.c:3399-3416), reaching Cmd_ShowServerinfo_f (sv_user.c:2493-2496) which is a pure read-only Info_Print(svs.info). The overrideable flag is false, so a client always hits the read-only handler and can never reach the mutating SV_Serverinfo_f. This exactly grounds the description's parenthetical.

- Access class (WI-2): rcon reaches the mutating handler via SVC_RemoteCommand (sv_main.c:1687) -> password validation (master_rcon_password OR rcon_password) -> Cmd_ExecuteString(str) (sv_main.c:1828), which dispatches the Cmd_AddCommand console table (cmd.c cmd_hash_array). So "server console / rcon" is correct. (Two rcon tiers exist -- full vs admin rcon_password -- but both reach Cmd_ExecuteString; the description's undifferentiated "rcon" is accurate.)

- Broadcast clause: SV_SendServerInfoChange (sv_ccmds.c:1368-1376) writes svc_serverinfo + key + value into sv.reliable_datagram, gated on sv.state; this buffer is copied into every client's reliable channel in SV_SendClientMessages (sv_send.c:1051-1052) and then SZ_Clear'd. Confirms "pushed to clients already on the server."

- The "0 clears" + "cvar updated too" interaction was traced through the callee chain (Cvar_Set at cvar.c:122-161 and SV_ServerinfoChanged at sv_ccmds.c:1379-1387). Within the serverinfo command path the value is converted "0"->"" BEFORE the cvar branch (sv_ccmds.c:1438-1439), so the cvar receives "", not "0". The deathmatch special-case in Cvar_ServerInfoValue (cvar.c:111, `strcmp(key,"deathmatch")`) does NOT affect the command path and the description makes no deathmatch claim -- no defect.

PROC-1: residual is pure fact at every enforcing line; no judgment absorbed. No affirm-vs-synthesize framing call needed.

## flags_for_review

- [fyi/other/vpass] Cvar_ServerInfoValue (cvar.c:107-115) carries a deathmatch special-case: `if (!strcmp(value, "0") && strcmp(key, "deathmatch")) return "";` -- i.e. deathmatch is NOT force-cleared to empty when set to 0 through the CVAR_SERVERINFO change path, because clients default a missing deathmatch key to non-coop. This does NOT contradict the serverinfo command description (the command handler at sv_ccmds.c:1438-1439 force-converts value "0"->"" for ALL keys including deathmatch before the cvar branch, so the command path is unaffected, and the description asserts no deathmatch exception). Flagged only as a non-obvious edge: deathmatch set to 0 via a direct cvar set (not via the serverinfo command) is preserved as "0" in serverinfo rather than cleared. FYI for any future deathmatch-specific row, not an issue with this row.
- [fyi/other/vpass] Star-key protection is enforced redundantly at two layers: the explicit guard in SV_Serverinfo_f (sv_ccmds.c:1431-1435, 'Star variables cannot be changed.') AND a backstop inside Info_SetValueForKey itself (common.c:1113-1118, 'Can't set * keys'). The description's single-layer statement is correct; noting the defense-in-depth so a future reader doesn't think the handler guard is the only protection.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "serverinfo",
  "type": "command",
  "description": "Shows or changes the server's serverinfo keys (the public server settings broadcast to connecting clients). When a key changes, the new value is pushed to clients already on the server.\n\nserverinfo = list every serverinfo key and value, plus the total length used.\nserverinfo <key> = show the current value of one key.\nserverinfo <key> <value> = set that key to the given value.\n\nSetting a key to \"0\" clears it (stores an empty value). Keys beginning with \"*\" (star keys, set by the server itself) cannot be changed this way. If the key is also a serverinfo cvar, that cvar is updated as well.\n\nSet by: server console / rcon. (Any connected client can also run 'cmd serverinfo' to dump the serverinfo string read-only, but cannot change it.)",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1428. Console handler SV_Serverinfo_f registered src/sv_ccmds.c:1889 (#ifdef SERVERONLY -- present in the dedicated build); body src/sv_ccmds.c:1396-1451. Clauses enforce-traced: (no-arg = list all + length) Cmd_Argc()==1 -> 'Server info settings:' then Info_Print(svs.info) then prints '[%d/%d]' strlen(svs.info)/MAX_SERVERINFO_STRING, src/sv_ccmds.c:1402-1408. (1-arg = show one key) Cmd_Argc()==2 -> Info_ValueForKey(svs.info, Cmd_Argv(1)); prints value or 'No such key', src/sv_ccmds.c:1411-1419. (2-arg = set key) key=Cmd_Argv(1), value=Cmd_Argv(2), src/sv_ccmds.c:1428-1429. (star-key rejected) if key[0]=='*' prints 'Star variables cannot be changed.' and returns, src/sv_ccmds.c:1431-1435. (\"0\" -> empty) if (!strcmp(value,\"0\")) value=\"\", src/sv_ccmds.c:1438-1439. (cvar sync) Cvar_Find(key); if var && (var->flags & CVAR_SERVERINFO) Cvar_Set(var,value) else SV_ServerinfoChanged(key,value), src/sv_ccmds.c:1442-1450. (push to connected clients) the change path SV_ServerinfoChanged -> SV_SendServerInfoChange(key,string) when the value differs, src/sv_ccmds.c:1383-1386 -- hence 'pushed to clients already on the server'. ACCESS-CLASS: this console SV_Serverinfo_f is NOT in ucmds[]. A SEPARATE read-only function Cmd_ShowServerinfo_f (src/sv_user.c:2493: Info_Print(svs.info) only) IS in ucmds[] at src/sv_user.c:3321 with the access flag 'false' -> any connected client can 'cmd serverinfo' to dump the string but cannot set keys; documented as the parenthetical. 'serverinfo' is NOT in the normal-rcon blocklist token list (src/sv_main.c:1754-1764) -> normal rcon may set keys -> Set-by 'server console / rcon'. F-MV1: grep of ktx/src for \"serverinfo\" returned no matches -- no KTX command override. Default omitted (no-arg is the list action, not a default value). 'serverinfo string broadcast to clients' is action-relevant context for an admin (clients read these keys), kept as a short user-observable clause per D20 inline-if-action-changing.",
  "description_proposed": null
}
```
