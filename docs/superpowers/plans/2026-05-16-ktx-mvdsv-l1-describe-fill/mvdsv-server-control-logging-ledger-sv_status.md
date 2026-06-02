# describe-fill-synthesis ledger -- mvdsv `sv_status`

- **project:** mvdsv
- **knob:** `sv_status` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_status: synthesized -- prefixed twin of status (same SV_Status_f); un-shadowable name so the display survives a client 'status' alias; admin-only console/rcon, no-arg -- origin=synthesized ref=src/sv_ccmds.c:1194 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Same as the 'status' command -- prints the current server status (net address, CPU usage, response time, packets per frame, and the connected-client table) to the console. This prefixed name exists so the status display still works when a connected client has bound its own 'status' alias that would otherwise shadow the plain command.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| same handler / identical output to status | src/sv_ccmds.c:1839 | `Cmd_AddCommand ("sv_status", SV_Status_f);` (same SV_Status_f as status) | MATCH |
| exists so status display works when a client 'status' alias shadows the plain command | src/sv_ccmds.c:1836,1839 | `// Add sv_status as client allows 'status' alias to over-ride (ezQuake #532)` then the distinct un-shadowable registration name at :1839 | MATCH |
| header + per-client table content | src/sv_ccmds.c:1194-1234 | (see status record) | MATCH |
| admin-only (console/rcon) | src/sv_ccmds.c:1839 + src/sv_user.c:3299-3360 | `Cmd_AddCommand ("sv_status", SV_Status_f);` and 'sv_status' absent from `ucmds[]` | MATCH |
| no argument | src/sv_ccmds.c:1177 | `void SV_Status_f (void)` reads no Cmd_Argv | MATCH |
| no KTX override | ktx/src (grep) | no 'sv_status' registration in cmd_t cmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Result |
|---|--------|---------------------|------------------|--------|
| 1 | "Same as the 'status' command" (equivalence) | src/sv_ccmds.c:1838-1839 | `Cmd_AddCommand ("status", SV_Status_f);` / `Cmd_AddCommand ("sv_status", SV_Status_f);` | MATCH -- both register the IDENTICAL handler SV_Status_f. Confirmed no competing `status` console registration (the only other `status` hit is sv_main.c:1932 SVC_Status, the out-of-band connectionless server-browser protocol, a different mechanism). |
| 2a | Prints "net address" | src/sv_ccmds.c:1195,1200 | `Con_Printf ("net address                 : %s\n" ... NET_AdrToString (net_local_sv_ipadr)` | MATCH |
| 2b | Prints "CPU usage" | src/sv_ccmds.c:1196-1197,1201-1202 | `"cpu utilization (overall)   : %3i%%\n" "cpu utilization (recording) : %3i%%\n"` (computed lines 1184-1190) | MATCH (engine prints two cpu lines; "CPU usage" generically covers both) |
| 2c | Prints "response time" | src/sv_ccmds.c:1198,1203 | `"avg response time           : %i ms\n" ... (int)avg` (avg = 1000*latched_active/STATFRAMES, line 1192) | MATCH |
| 2d | Prints "packets per frame" | src/sv_ccmds.c:1199,1204 | `"packets/frame               : %5.2f (%d)\n", pak, num_prstr` (pak = latched_packets/STATFRAMES, line 1193) | MATCH (primary value pak; the `(%d)`=num_prstr progs-string count at pr_exec.c:675 is internal trivia, correctly omitted per show-usage/drop-algorithm guidance) |
| 2e | Prints "connected-client table" | src/sv_ccmds.c:1209-1234 (RD_NONE) / 1242-1270 (redirected) | `"name             ping frags   id   address                real ip\n" ... for (i=0, cl=svs.clients; i<MAX_CLIENTS; ...)` | MATCH -- iterates svs.clients, prints name/ping/frags/id/address/real-ip plus CONNECTING/ZOMBIE/(s) states |
| 3 | Prints "to the console" | src/sv_send.c:156-159 | `if (SV_AddToRedirect(msg)) return; // added. Sys_Printf ("%s", msg); // also echo to debugging console` | MATCH -- all 8 prints in the handler are Con_Printf, which echoes to the server console on direct invocation and captures-and-routes to the requester when redirected (rcon). Description's main sentence ("to the console") = direct case; metadata line accounts for rcon. |
| 4 | "exists so status still works when a connected client has bound its own 'status' alias that would otherwise shadow the plain command" (rationale) | src/sv_ccmds.c:1837 | `// Add sv_status as client allows 'status' alias to over-ride (ezQuake #532)` | MATCH -- adjacent registration comment states exactly this rationale (client 'status' alias over-rides; sv_status added as the unshadowed name). Not name-inferred: the enforcing comment is verbatim. |
| 5 | "Set by: server console / rcon" (access metadata) | src/sv_ccmds.c:1839 + src/sv_send.c:156 | `Cmd_AddCommand ("sv_status", SV_Status_f);` (plain AddCommand, no CF_/flag wrapper) + redirect-aware Con_Printf | MATCH -- registered as an ordinary server console command with NO access-class flag; reachable from the server console and, because Con_Printf is redirect-aware, via rcon (output routes back to the rcon client). No player/spectator-from-game path. |

**V-pass notes:** Oracle confirmed: mvdsv describe-tags == 1.11-53-g18d0362.

Wide-grep: `sv_status` appears at EXACTLY two sites tree-wide, both in src/sv_ccmds.c (1837 comment, 1839 registration). No sv_status CVAR exists (no RegisterCvar/Cvar_Register with that name) -- it is a command alias only. The handler SV_Status_f is defined once (sv_ccmds.c:1177-1273) and is shared verbatim by both `status` and `sv_status` (registered back-to-back at 1838-1839), so the "same as status" equivalence is exact at the dispatch level, not approximate.

Every material clause enforcement-traced to a located line:
- Equivalence -> identical Cmd_AddCommand target (1838-1839).
- All 5 output fields (net address / cpu / response time / packets-per-frame / client table) -> the two Con_Printf blocks in SV_Status_f (1195-1234), each field verified against its format string AND its computed source variable (cpu/demo1/avg/pak derived at 1184-1193).
- Console destination -> Con_Printf body (sv_send.c:156-159), which is redirect-aware; "to the console" is the direct-invocation case and the rcon case is captured by SV_AddToRedirect, consistent with the "rcon" metadata.
- Shadowing rationale -> verbatim adjacent comment at sv_ccmds.c:1837 (ezQuake #532). This is the strongest possible enforcement for a rationale clause: the code's own comment states it, so it is NOT a name/string inference.
- Access metadata -> plain Cmd_AddCommand with no CF_ flag; standard server-console command, rcon-redirectable.

No clause is name-/enum-/string-inferred without an enforcing read-site. No MISMATCH, no UNTRACEABLE. Classification: TRACED-CLEAN.

PROC-1 check: no residual judgment call (affirm-vs-synth, framing, presentation policy) surfaced -- every residual reduced to a checkable fact at its enforcing line. The omitted `(%d)`=num_prstr parenthetical is a fact-level omission justified by show-usage/drop-algorithm doc guidance, not a judgment that masks a defect.

## flags_for_review

- [fyi/hidden-family/synthesis] sv_status shares handler SV_Status_f with the 'status' command (src/sv_ccmds.c:1838-1839); the two L1 entities are functionally identical, differing only in the un-shadowable command name. Registration comment (ezQuake #532) is the rationale. Paired with the 'status' record's identical flag.
- [fyi/other/vpass] The packets/frame line at sv_ccmds.c:1199 prints a second value `(%d)` = num_prstr (progs string-table counter, pr_exec.c:675), which the description omits. This is correct per the project's show-usage/drop-algorithm doc guidance (internal engine trivia, not user-actionable), so it is NOT a defect -- recording only for completeness so a future reviewer does not mistake the omission for an oversight.
- [fyi/other/vpass] There is a SECOND, unrelated `status` mechanism in mvdsv: sv_main.c:1932 routes the out-of-band connectionless network query `status` to SVC_Status() (the machine-readable server-browser protocol over UDP). It is a distinct code path from the console command SV_Status_f and does NOT undermine the equivalence claim, but anyone later editing the sv_status/status entity should not conflate the console `status` command with the network `status` query.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_status",
  "type": "command",
  "description": "Same as the 'status' command -- prints the current server status (net address, CPU usage, response time, packets per frame, and the connected-client table) to the console. This prefixed name exists so the status display still works when a connected client has bound its own 'status' alias that would otherwise shadow the plain command.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1195. sv_status is registered to the SAME handler as status: Cmd_AddCommand (\"sv_status\", SV_Status_f) at src/sv_ccmds.c:1839, with the preceding comment src/sv_ccmds.c:1836 'Add sv_status as client allows status alias to over-ride (ezQuake #532)' -- the only behavioral difference vs status is the un-shadowable name; output is identical (handler body src/sv_ccmds.c:1177-1271, see the status record's enforce-trace for the header at :1194-1209 and per-client table at :1210-1234). The 'works when client alias shadows status' clause is enforced ONLY by the existence of the distinct registration name at :1839 (a client-side 'status' alias cannot override a different command name 'sv_status'); the comment at :1836 corroborates the intent but the enforcing fact is the second Cmd_AddCommand with a non-colliding name. No-arg: handler reads no Cmd_Argv. Admin-only: Cmd_AddCommand at :1839, absent from ucmds[] (src/sv_user.c:3299-3360). F-MV1: grep of ktx/src finds no override of an 'sv_status' command.",
  "description_proposed": null
}
```
