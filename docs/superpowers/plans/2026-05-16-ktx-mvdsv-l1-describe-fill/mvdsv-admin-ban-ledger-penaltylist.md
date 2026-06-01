# describe-fill-synthesis ledger -- mvdsv `penaltylist`

- **project:** mvdsv
- **knob:** `penaltylist` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:penaltylist: synthesized -- prints Active (connected clients' mute/cuff w/ remaining secs, sv_ccmds.c:1095-1102) + Saved (disconnected-player IP penalty filters w/ index for penaltyremove, :1105-1121); read-only; admin-only -- origin=synthesized ref=src/sv_ccmds.c:1081 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Lists the mute and cuff penalties currently in effect, in two sections:
>
> Active Penalty List = penalties on players who are connected right now. Each line shows the player's userid, name, the penalty type (mute or cuff), and the seconds remaining.
> Saved Penalty List = penalties belonging to players who have since disconnected, kept so the penalty can be re-applied if they reconnect from the same IP. Each line shows an index number, the type (Mute or Cuff), the saved IP, and the seconds remaining.
>
> The index shown in the Saved list is the number passed to penaltyremove to clear that entry. The saved list is held in memory only and is lost on a server restart.
>
> Set by: server console / rcon.
> See also: cuff, mute, penaltyremove.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Active section header | src/sv_ccmds.c:1090 | `Con_Printf ("Active Penalty List:\n");` | MATCH |
| Active = connected clients only | src/sv_ccmds.c:1093 | `if (!cl->state) continue;` (loop over svs.clients) | MATCH |
| Active mute line (userid,name,remaining secs) | src/sv_ccmds.c:1097 | `Con_Printf ("%i %s mute (remaining: %d)\n", cl->userid, cl->name, ... (int)(cl->lockedtill - curtime) ...)` | MATCH |
| Active cuff line | src/sv_ccmds.c:1101 | `Con_Printf ("%i %s cuff (remaining: %d)\n", cl->userid, cl->name, ... (int)(cl->cuff_time - curtime) ...)` | MATCH |
| Saved section header | src/sv_ccmds.c:1104 | `Con_Printf ("Saved Penalty List:\n");` | MATCH |
| Saved line = index, type, IP, remaining | src/sv_ccmds.c:1114-1120 | `Con_Printf ("%i: %s for %i.%i.%i.%i (remaining: %d)\n", i, s, ip[0..3], (int)(penfilters[i].time - realtime))` | MATCH |
| Saved type string mapping | src/sv_ccmds.c:1108-1113 | `case ft_mute: ..."Mute"; case ft_cuff: ..."Cuff"; default ..."Unknown";` | MATCH |
| Saved list = disconnected players (filled on drop) | src/sv_main.c:380-381 | `SV_SavePenaltyFilter (drop, ft_mute/ft_cuff, ...);` | MATCH |
| Saved index feeds penaltyremove | src/sv_ccmds.c:1055-1070 | `num = Q_atoi(Cmd_Argv(1)); ... if (i == num) SV_RemoveIPFilter (i);` | MATCH |
| admin-only (console/rcon) | src/sv_ccmds.c:1849 | `Cmd_AddCommand ("penaltylist", SV_ListPenalty_f);` and absent from ucmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | enforcing file:line | verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Lists mute+cuff penalties in two sections | src/sv_ccmds.c:1089,1105 | `Con_Printf ("Active Penalty List:\n");` ... `Con_Printf ("Saved Penalty List:\n");` | MATCH |
| 2 | Active = penalties on players connected now | src/sv_ccmds.c:1090-1093 | `for (i=0, cl=svs.clients; i<MAX_CLIENTS; i++, cl++){ if (!cl->state) continue;` | MATCH |
| 3a | Active line shows userid + name | src/sv_ccmds.c:1097 | `Con_Printf ("%i %s mute (remaining: %d)\n", cl->userid, cl->name, ...)` | MATCH |
| 3b | Active type literal "mute"/"cuff" (lowercase) | src/sv_ccmds.c:1097,1101 | literal `mute` / `cuff` inside the two format strings | MATCH |
| 3c | Active shows seconds remaining | src/sv_ccmds.c:1097,1101 + 1015 | `(int)(cl->lockedtill - curtime)` ; duration base at 1015 `cl->lockedtill = curtime + (mins * 60.0);` | MATCH |
| 3d | Active only when penalty still in effect | src/sv_ccmds.c:1095,1099 | `if (cl->lockedtill >= curtime)` / `if (cl->cuff_time >= curtime)` | MATCH |
| 4a | Saved = penalties for players who disconnected (saved on drop) | src/sv_main.c:380-381 (SV_DropClient) | `SV_SavePenaltyFilter (drop, ft_mute, drop->lockedtill); SV_SavePenaltyFilter (drop, ft_cuff, drop->cuff_time);` | MATCH |
| 4b | Re-applied on reconnect from SAME IP | src/sv_user.c:310-311 -> src/sv_main.c:2950 ; SV_IPCompare 2899-2908 | restore: `if (type == penfilters[i].type && SV_IPCompare (cl->realip.ip, penfilters[i].ip))` ; SV_IPCompare loops `((unsigned int*)a)[0] != ((unsigned int*)b)[0]` = full 4-byte IPv4 | MATCH |
| 5a | Saved line shows index number | src/sv_ccmds.c:1106,1114 | `for (i = 0; i < numpenfilters; i++)` ; `Con_Printf ("%i: %s for ...", i, s, ...)` | MATCH |
| 5b | Saved type "Mute"/"Cuff" (capitalized) | src/sv_ccmds.c:1110-1111 | `case ft_mute: strlcpy(s, "Mute", ...); case ft_cuff: strlcpy(s, "Cuff", ...);` | MATCH |
| 5c | Saved shows the saved IP | src/sv_ccmds.c:1115-1118 | `penfilters[i].ip[0], penfilters[i].ip[1], penfilters[i].ip[2], penfilters[i].ip[3]` | MATCH |
| 5d | Saved shows seconds remaining | src/sv_ccmds.c:1119 | `(penfilters[i].time) ? (int)(penfilters[i].time - realtime) : 0` | MATCH |
| 6 | Index = number passed to penaltyremove | src/sv_ccmds.c:1069-1073 (SV_RemovePenalty_f) | `for (i = 0; i < numpenfilters; i++){ if (i == num){ SV_RemoveIPFilter (i);` -- same array index printed at 1114 | MATCH |
| 7a | Held in memory only | src/sv_main.c:2018-2019 | `penfilter_t penfilters[MAX_PENFILTERS]; int numpenfilters;` (static globals; no disk read/write anywhere -- grep of penfilters shows zero file I/O) | MATCH |
| 7b | Lost on server restart | src/sv_main.c (tree-wide grep) | no save/load of penfilters exists; process-memory array only | MATCH |
| 8 | Set by: server console / rcon | src/sv_ccmds.c:1849 (SV_InitOperatorCommands) + src/sv_main.c:1828 | `Cmd_AddCommand ("penaltylist", SV_ListPenalty_f);` ; rcon dispatch `Cmd_ExecuteString(str);` ; NOT in normal-rcon restricted list (1754-1764) | MATCH |
| 9 | See also cuff / mute / penaltyremove | src/sv_ccmds.c:1846,1847,1850 | `Cmd_AddCommand ("mute", SV_Mute_f); Cmd_AddCommand ("cuff", SV_Cuff_f); ... Cmd_AddCommand ("penaltyremove", SV_RemovePenalty_f);` | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line (the print/format strings in SV_ListPenalty_f at src/sv_ccmds.c:1081-1121, plus the save/restore/remove machinery in sv_main.c and the connect/drop call-sites). No clause is name/enum/string-inferred without code backing.

Enforcing function: SV_ListPenalty_f (src/sv_ccmds.c:1081-1121). Registered at sv_ccmds.c:1849.

Notable PRECISION the description gets right (not luck -- it matches the literal output strings): the Active list prints lowercase "mute"/"cuff" (sv_ccmds.c:1097,1101) while the Saved list prints capitalized "Mute"/"Cuff" via the switch (sv_ccmds.c:1110-1111). The proposed text mirrors this exactly ("mute or cuff" for Active, "Mute or Cuff" for Saved).

Cross-clause chain verified end-to-end:
- Save on disconnect: SV_DropClient (sv_main.c:377-381) -> SV_SavePenaltyFilter (sv_main.c:2918), keyed by cl->realip.ip + type.
- Restore on reconnect: SV_PreSpawn/connect path sv_user.c:310-311 -> SV_RestorePenaltyFilter (sv_main.c:2942), matched by SV_IPCompare on the full IPv4 (SV_IPCompare compares the first/only unsigned int = all 4 bytes, sv_main.c:2899-2908). penfilter_t.ip is byte[4] (server.h:790); realip is netadr_t with byte ip[4] (net.h:146). So "same IP" == full IPv4 match. Correct.
- penaltyremove index identity: SV_RemovePenalty_f (sv_ccmds.c:1055-1079) loops the same penfilters[] index and matches i==num, calling SV_RemoveIPFilter(i). The index printed by penaltylist (sv_ccmds.c:1114, the loop counter i) is exactly that number. Correct.
- In-memory-only: penfilters[] / numpenfilters are static globals (sv_main.c:2018-2019); tree-wide grep shows no persistence (no file save/load of penfilters). "Lost on server restart" is correct by absence-of-persistence.
- Access class: Cmd_AddCommand (not a flagged client command) in SV_InitOperatorCommands; reachable via console and rcon (Cmd_ExecuteString at sv_main.c:1828); penaltylist is NOT among the commands normal rcon is barred from (sv_ccmds.c restricted list at sv_main.c:1754-1764). "server console / rcon" is correct.
- See-also targets cuff/mute/penaltyremove all exist as commands (sv_ccmds.c:1846,1847,1850).

Minor (NON-defect) observations, both correctly OMITTED by the description:
1. Saved-list "default: Unknown" case (sv_ccmds.c:1112) is unreachable in normal operation -- filtertype_t enum has only ft_mute/ft_cuff (server.h:783-786). Defensive dead default; omitting it is correct.
2. Active list remaining uses (lockedtill - curtime) while Saved uses (time - realtime). Both surface as "seconds remaining"; curtime vs realtime is an internal clock distinction that does not change the user-facing claim. Not a defect.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "penaltylist",
  "type": "command",
  "description": "Lists the mute and cuff penalties currently in effect, in two sections:\n\nActive Penalty List = penalties on players who are connected right now. Each line shows the player's userid, name, the penalty type (mute or cuff), and the seconds remaining.\nSaved Penalty List = penalties belonging to players who have since disconnected, kept so the penalty can be re-applied if they reconnect from the same IP. Each line shows an index number, the type (Mute or Cuff), the saved IP, and the seconds remaining.\n\nThe index shown in the Saved list is the number passed to penaltyremove to clear that entry. The saved list is held in memory only and is lost on a server restart.\n\nSet by: server console / rcon.\nSee also: cuff, mute, penaltyremove.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1081. Handler SV_ListPenalty_f (src/sv_ccmds.c:1081, registered src/sv_ccmds.c:1849). Section 1 'Active Penalty List:' header at src/sv_ccmds.c:1090, body src/sv_ccmds.c:1091-1103 loops live clients (`if (!cl->state) continue;`) and prints a 'mute' line when cl->lockedtill >= curtime (src/sv_ccmds.c:1095-1098) and a 'cuff' line when cl->cuff_time >= curtime (src/sv_ccmds.c:1099-1102); each prints userid, name, and (int)(timer - curtime) seconds remaining. Section 2 'Saved Penalty List:' header at src/sv_ccmds.c:1104, body src/sv_ccmds.c:1105-1121 loops numpenfilters entries of the penfilters[] array printing index i, the type string from a switch (ft_mute->\"Mute\", ft_cuff->\"Cuff\", default \"Unknown\") at src/sv_ccmds.c:1108-1114, the IP octets penfilters[i].ip[0..3], and (int)(penfilters[i].time - realtime) seconds remaining. The penfilters[] saved list is populated ONLY on client disconnect (SV_SavePenaltyFilter at src/sv_main.c:380-381) and consumed/removed on reconnect (SV_RestorePenaltyFilter at src/sv_user.c:310-311), so the 'Saved' section = penalties of currently-disconnected players awaiting reconnect; verified IP-keyed and RAM-only (src/sv_main.c:2918-2955), no disk file. The printed index is exactly the [num] argument consumed by SV_RemovePenalty_f (src/sv_ccmds.c:1055). Read-only: the handler only Con_Printf's, no state change. Access class: Cmd_AddCommand only, NOT in ucmds[] -> server console / rcon, admin-only. F-MV1: no ktx/src override.",
  "description_proposed": null
}
```
