# describe-fill-synthesis ledger -- mvdsv `sv_usercmdtrace`

- **project:** mvdsv
- **knob:** `sv_usercmdtrace` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_usercmdtrace: synthesized -- per-client on/off toggle that embeds a player's raw usercmds (angles/moves/buttons/impulse) as hidden MVD blocks; default off, console/rcon, live KTX-race consumer -- origin=synthesized ref=src/sv_user.c:4936 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Turns recording of a single player's raw movement input on or off inside the MVD demo currently being recorded. While enabled for a player, the demo captures that player's per-frame input -- view angles, forward/side/up movement, buttons and impulse -- as hidden blocks alongside the normal demo data, for later inspection. While disabled (the default), this extra input data is not recorded for that player.
>
> sv_usercmdtrace <userid> on = start recording that player's raw input; sv_usercmdtrace <userid> off = stop. The userid must match a connected player.
>
> Default: off for every player.
> Set by: server console / rcon (and used internally by some mods, e.g. the KTX race mode).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| sets per-client input-trace flag on/off | src/sv_demo.c:1912 | `svs.clients[i].mvd_write_usercmds = option;` | MATCH |
| syntax: userid (on|off), userid must connect | src/sv_demo.c:1888-1905,1907-1918 | Cmd_Argc()!=3 usage; option=on/off; 'Couldn't find userid %d' | MATCH |
| while on, embeds player's raw usercmd as hidden MVD block | src/sv_user.c:4936-4958 | `if (... mvd_write_usercmds) { header.type_id = mvdhidden_usercmd; ... MVD_SZ_Write(msec/angles/forward/side/up/buttons/impulse) }` | MATCH |
| captured fields = angles, moves, buttons, impulse | src/sv_user.c:4949-4957 | MVD_SZ_Write of usercmd->msec, angles[0..2], forwardmove, sidemove, upmove, buttons, impulse | MATCH |
| default off (only this cmd sets the flag) | src/sv_demo.c:1912 + server.h:391 | sole writer; `qbool mvd_write_usercmds;` zero-init | MATCH |
| console/rcon only (not in ucmds) | src/sv_user.c (grep) | no ucmds[] entry for usercmdtrace | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | 'sv_usercmdtrace' not a member | MATCH |
| live KTX consumer (not dead) | ktx/src/race.c:164 | `localcmd("sv_usercmdtrace %d %s\n", userId, on ? "on" : "off")` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Command (not cvar) that toggles per-player usercmd recording on/off; takes `<userid> on|off` | src/sv_demo.c:1881,1956 + :1912 | `void SV_UserCmdTrace_f(void)` ... `Cmd_AddCommand ("sv_usercmdtrace",  SV_UserCmdTrace_f);` ... `svs.clients[i].mvd_write_usercmds = option;` | MATCH |
| 2 | `on` = start, `off` = stop; arg must be on/off else usage error | src/sv_demo.c:1893-1899 | `if (!strcmp(option_, "on")) { option = true; } else if (strcmp(option_, "off")) { Con_Printf("Usage: ...") return; }` | MATCH |
| 3 | userid must match a CONNECTED player | src/sv_demo.c:1907-1917 | `for (i...MAX_CLIENTS) { if (!svs.clients[i].state) continue; if (svs.clients[i].userid == uid) { ...=option; return; } } Con_Printf("Couldn't find userid %d\n", uid);` | MATCH |
| 4 | Captures view angles, forward/side/up movement, buttons, impulse | src/sv_user.c:4950-4957; protocol.h:561 | `MVD_SZ_Write(&usercmd->angles[0..2]...&usercmd->forwardmove...sidemove...upmove...buttons...impulse)`; enum comment `mvdhidden_usercmd ... <vec3_t: angles, short[3]: forward side up> <byte: buttons> <byte: impulse>` | MATCH (msec/playernum/dropnum also written; see notes - near-miss-grade omission, not a contradiction) |
| 5 | Written as hidden blocks alongside normal demo data | src/sv_demo.c:485-488; protocol.h:556-557 | `MVDWrite_HiddenBlockBegin(...) { return MVDWrite_Begin(dem_multiple, 0, length); }`; `// hidden messages inserted into .mvd files // embedded in dem_multiple(0) - should be safely skipped in clients` | MATCH |
| 6 | Only inside the MVD demo currently being recorded | src/sv_demo.c:469-470 | `qbool MVDWrite_Begin (...) { if (!sv.mvdrecording) return false;` | MATCH |
| 7 | Per-frame input (per usercmd, incl. dropped-packet replays) | src/sv_user.c:4264,4270,4274,4277 (in SV_ExecuteClientMove) | `SV_DebugClientCommand(playernum, &cl->lastcmd, net_drop);` ... `SV_DebugClientCommand(playernum, &newcmd, 0);` | MATCH |
| 8 | While disabled, extra input NOT recorded for that player | src/sv_user.c:4936 | `if (sv_debug_usercmd.value >= 1 || svs.clients[playernum].mvd_write_usercmds) { ...write... }` (flag false -> no write) | MATCH |
| 9 | Default: off for every player | src/sv_main.c:284; src/sv_demo.c:1912 | `memset (svs.clients, 0, sizeof(svs.clients));` (qbool field zero-init = false); only ever set true on explicit `on` | MATCH |
| 10 | Set by server console / rcon (not player) | src/sv_demo.c:1956; src/sv_user.c:3299-3385 | registered via `Cmd_AddCommand` (server cmd table); ABSENT from client `ucmds[]` table -> not clc_stringcmd reachable | MATCH |
| 11 | Used internally by some mods, e.g. KTX race mode | research/repos/ktx/src/race.c:158-166 | `static void set_usercmd_trace(gedict_t* p, qbool on) { ... localcmd("sv_usercmdtrace %d %s\n", userId, on ? "on" : "off"); trap_executecmd(); }` | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv describe --tags == 1.11-53-g18d0362. Read enforce-trace-discipline.md and applied per-clause.

Single registration site (sv_demo.c:1956); enforcing read-site lives in a DIFFERENT file (sv_user.c:4936, inside SV_DebugClientCommand, called from SV_ExecuteClientMove). Traced the full chain: command sets per-client qbool `mvd_write_usercmds` -> read at the per-usercmd recorder branch -> writes a hidden block via MVDWrite_HiddenBlockBegin -> MVDWrite_Begin(dem_multiple,0,len) which hard-gates on `sv.mvdrecording`. Every material clause (polarity, on/off semantics, connected-player scope, recorded-field set, hidden-block-in-demo mechanism, recording-only gate, per-frame cadence, OFF-state no-write, default-off, console/rcon access-class, KTX cross-mod use) maps to a located enforcing line with matching adjacent comments. No clause rests on name/enum/string inference.

WI-2 metadata both verified directly, not inferred:
- Default off: enforced by memset-zero of the client array (sv_main.c:284) + the handler only setting true on explicit "on". Correct.
- Access-class "server console / rcon": verified by PRESENCE in the Cmd_AddCommand server table and ABSENCE from the client ucmds[] table (sv_user.c:3299-3385), so a connected client cannot invoke it via clc_stringcmd. Correct. (MVDSV engine commands have no KTX-style CF_ flags; that gating concept is KTX-only.)

KTX race-mode cross-mod claim verified against the live companion KTX repo (research/repos/ktx/src/race.c:164), not assumed. Matches the oracle's covered-engine KTX checkout; on/off forwarding semantics line up exactly.

The one imprecision: the recorded hidden block also carries msec (per-frame timing), playernum, and dropnum (sv_user.c:4947-4949), which the description's input enumeration does not name. This is near-miss-grade at most -- the description frames the payload as "per-frame input ... as hidden blocks," and playernum/dropnum are addressing/framing metadata while msec is per-frame timing, all consistent with that framing; the four substantive movement-input fields it DOES name are exactly correct. Not a contradiction, so the row stays TRACED-CLEAN rather than C-NEAR-MISS.

## flags_for_review

- [fyi/other/synthesis] Liveness positive (the opposite of a dead suspect): sv_usercmdtrace has a real read use-site (src/sv_user.c:4936) AND a live external consumer -- KTX race mode calls localcmd("sv_usercmdtrace %d %s") at ktx/src/race.c:164. The shared read-site also serves sv_debug_usercmd (a cvar, chunk-1 territory): both gate the same mvdhidden_usercmd MVD write at src/sv_user.c:4936. Noted in case a sibling chunk documents sv_debug_usercmd -- they share the enforcing block.
- [fyi/off-scope-entity/vpass] The same recorder branch (sv_user.c:4936) fires on `sv_debug_usercmd.value >= 1 || mvd_write_usercmds`. The cvar sv_debug_usercmd is a SERVER-WIDE switch that records the identical usercmd hidden block for ALL players regardless of the per-player sv_usercmdtrace flag. The description correctly scopes itself to the per-player knob and never claims exclusivity, so no contradiction -- but sv_debug_usercmd is the closely-related sibling knob and its own L1 description should make the server-wide-vs-per-player distinction clear so the two aren't conflated.
- [fyi/other/vpass] `mvd_write_usercmds` is set on the client struct independent of recording state and is not re-cleared on player disconnect within SV_UserCmdTrace_f itself (relies on memset-zero of the whole client array at server init / slot reuse). A userid slot reused by a new connection inherits zeroed state at reconnect via SV_init paths, so default-off holds, but if a mod toggled it on and the operator expects it to follow a specific human across a reconnect, it will not -- it is keyed to the live slot+userid at command time only. Not a description defect; flagging the lifecycle nuance.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_usercmdtrace",
  "type": "command",
  "description": "Turns recording of a single player's raw movement input on or off inside the MVD demo currently being recorded. While enabled for a player, the demo captures that player's per-frame input -- view angles, forward/side/up movement, buttons and impulse -- as hidden blocks alongside the normal demo data, for later inspection. While disabled (the default), this extra input data is not recorded for that player.\n\nsv_usercmdtrace <userid> on = start recording that player's raw input; sv_usercmdtrace <userid> off = stop. The userid must match a connected player.\n\nDefault: off for every player.\nSet by: server console / rcon (and used internally by some mods, e.g. the KTX race mode).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:4936. Handler SV_UserCmdTrace_f (src/sv_demo.c:1881). Usage requires exactly 3 args 'userid (on | off)': src/sv_demo.c:1888-1905 (Cmd_Argc()!=3, invalid option, or atoi(userid)==0 all print 'Usage: %s userid (on | off)'). Enforcing set: src/sv_demo.c:1907-1914 loops svs.clients, matches userid, sets `svs.clients[i].mvd_write_usercmds = option` (option = (Cmd_Argv(2)==\"on\")); else 'Couldn't find userid %d'. Read use-site (the observable effect): src/sv_user.c:4936 `if (sv_debug_usercmd.value >= 1 || svs.clients[playernum].mvd_write_usercmds)` in SV_DebugClientCommand -- when set, src/sv_user.c:4940-4958 writes an mvdhidden_usercmd block (type_id=mvdhidden_usercmd) into the MVD via MVD_SZ_Write containing playernum, dropnum, usercmd->msec, angles[0..2], forwardmove, sidemove, upmove, buttons, impulse. So the flag = 'embed this player's raw usercmds as hidden MVD blocks'. Default off: the flag is only ever set by this command (grep of mvd_write_usercmds reads: src/sv_demo.c:1912 set, src/sv_user.c:4936 read, server.h:391 decl) and clients start zero-initialized. Access class: NOT in ucmds[] (grep 'usercmdtrace' src/sv_user.c returned no entry) -> not client-stuffable; console/rcon only. Normal-rcon blocklist (src/sv_main.c:1754-1764): 'sv_usercmdtrace' is NOT a member -> regular rcon reaches it; Set-by = 'server console / rcon'. F-MV1 / liveness: KTX actively calls it -- ktx/src/race.c:164 `localcmd(\"sv_usercmdtrace %d %s\\n\", userId, on ? \"on\" : \"off\")` -- so the command is live and consumed by the KTX race mode; not dead.",
  "description_proposed": null
}
```
