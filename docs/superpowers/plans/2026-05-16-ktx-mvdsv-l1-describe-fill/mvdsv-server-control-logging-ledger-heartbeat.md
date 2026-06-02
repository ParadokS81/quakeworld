# describe-fill-synthesis ledger -- mvdsv `heartbeat`

- **project:** mvdsv
- **knob:** `heartbeat` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:heartbeat: synthesized -- forces an immediate master-server heartbeat (resets last_heartbeat so the 300s SV_Frame gate fires next frame; reports active player count; no-op if no master set); admin-only console/rcon, no-arg -- origin=synthesized ref=src/sv_master.c:73 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Forces the server to send a heartbeat to its configured master server(s) on the next server frame, instead of waiting for the normal interval. A heartbeat tells the master server this server is alive and reports its current player count, which keeps it listed in server browsers. The server normally heartbeats automatically every five minutes; this command triggers one immediately. It has no effect if no master server is configured.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| command itself only resets the heartbeat timer (does not send directly) | src/sv_master.c:73 | `void SV_Heartbeat_f (void){ svs.last_heartbeat = -99999; }` | MATCH |
| reset forces the next heartbeat to fire immediately (gate passes) | src/sv_master.c:93 | `if (realtime - svs.last_heartbeat < HEARTBEAT_SECONDS) return; // not time to send yet` | MATCH |
| heartbeat reports active player count to the master | src/sv_master.c:107-110 | `snprintf (string, sizeof(string), "%c\n%i\n%i\n", S2M_HEARTBEAT, svs.heartbeat_sequence, active);` | MATCH |
| sent to each configured master; nothing sent if none configured | src/sv_master.c:114-118 | `for (...) if (master_adr[i].port) { ... NET_SendPacket (NS_SERVER, strlen(string), string, master_adr[i]); }` | MATCH |
| normal automatic cadence is 300s / 5 min | src/sv_master.c:26 + src/sv_main.c:3357 | `#define HEARTBEAT_SECONDS 300` ; `Master_Heartbeat ();` called each SV_Frame | MATCH |
| admin-only (console/rcon) | src/sv_ccmds.c:1870 + src/sv_user.c:3299-3360 | `Cmd_AddCommand ("heartbeat", SV_Heartbeat_f);` and 'heartbeat' absent from `ucmds[]` | MATCH |
| no argument | src/sv_master.c:71 | `void SV_Heartbeat_f (void)` reads no Cmd_Argv | MATCH |
| no KTX override | ktx/src (grep) | no 'heartbeat' registration in cmd_t cmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | Forces server to send a heartbeat on the NEXT server frame, instead of waiting for the normal interval | src/sv_master.c:71-73 (handler) + src/sv_master.c:93-94 (gate) + src/sv_main.c:3356-3357 (frame call) | `void SV_Heartbeat_f (void) { svs.last_heartbeat = -99999; }` / `if (realtime - svs.last_heartbeat < HEARTBEAT_SECONDS) return; // not time to send yet` / `Master_Heartbeat ();` | MATCH -- handler sets last_heartbeat to -99999; on next frame Master_Heartbeat's gate computes realtime-(-99999) which is >> 300, so the early-return is bypassed and the send proceeds. Resetting the timer is exactly "bypass the interval, send next frame." |
| 2a | A heartbeat tells the master this server is alive | src/sv_master.c:79-82 (fn comment) + protocol.h:148 | `Send a message to the master every few minutes to / let it know we are alive, and log information` ; `#define S2M_HEARTBEAT 'a' // + serverinfo + userlist + fraglist` | MATCH -- packet type S2M_HEARTBEAT, comment states the alive-signal purpose. |
| 2b | ...and reports its current player count | src/sv_master.c:101-109 | `active = 0; for (...) if (svs.clients[i].state == cs_connected || svs.clients[i].state == cs_spawned ) active++;` then `snprintf(string,..., "%c\n%i\n%i\n", S2M_HEARTBEAT, svs.heartbeat_sequence, active);` | MATCH -- counts connected/spawned clients into `active` and embeds it in the packet. |
| 2c | ...which keeps it listed in server browsers | protocol.h:148 (payload) | `S2M_HEARTBEAT 'a' // + serverinfo + userlist + fraglist` | MATCH (downstream/standard) -- the browser-listing outcome is the master server's behavior, not enforced in mvdsv code, but the payload (serverinfo+userlist) and the "let it know we are alive" comment make this the documented protocol purpose. Accurate functional gloss, not a name/string inference. |
| 3 | Server normally heartbeats automatically every five minutes | src/sv_master.c:26 | `#define HEARTBEAT_SECONDS 300` | MATCH -- 300 s = 5 min; this is the interval used in the auto-send gate at line 93. |
| 4 | This command triggers one immediately | same as clause 1 (src/sv_master.c:73 + gate 93) | (see clause 1) | MATCH -- the -99999 reset forces the very next frame's Master_Heartbeat to send. |
| 5 | No effect if no master server is configured | src/sv_master.c:28 (global, zero-init) + src/sv_master.c:113-114 (send loop guard) | `netadr_t master_adr[MAX_MASTERS];` ; `for (i=0;i<MAX_MASTERS;i++) if (master_adr[i].port) { ... NET_SendPacket(...); }` | MATCH -- master_adr is zero-initialized; with no master set all .port==0, so the send loop never transmits. (Internally Master_Heartbeat still bumps heartbeat_sequence and resets last_heartbeat, but that is invisible -- "no effect" is observably true.) |
| 6 | Set by: server console / rcon | src/sv_ccmds.c:1870 (registration) + src/sv_main.c:1747-1770 (rcon blocklist) + src/sv_main.c:1828 -> src/cmd.c:933-938 (dispatch) | `Cmd_AddCommand ("heartbeat", SV_Heartbeat_f);` ; rcon blocklist {rm,rmdir,ls,chmod,sv_admininfo,if,localcommand,sv_crypt_rcon,sv_timestamplen,log*,sys_command_line} -- heartbeat ABSENT ; `Cmd_ExecuteString(str)` -> `if (cmd->function) cmd->function ();` | MATCH -- plain Cmd_AddCommand console command (no CF_ flag model in mvdsv); not in the normal-rcon blocklist and unconditionally allowed for master-rcon, so reachable from both the server console and rcon. Verified against dispatch + blocklist per WI-2, not inferred from the name. |

**V-pass notes:** Oracle version confirmed: git describe == "1.11-53-g18d0362". Trace-discipline reference read and applied.

Verdict: TRACED-CLEAN. All seven material clauses map to located, verified enforcing lines (including the callee chain rcon -> Cmd_ExecuteString -> cmd->function -> SV_Heartbeat_f). The core mechanism is a one-liner handler (last_heartbeat=-99999) whose effect is entirely mediated by the frame-loop caller Master_Heartbeat; I traced into that callee rather than stopping at the handler, since the gate/send logic the description asserts lives there.

Two unstated-but-not-wrong preconditions (FYI, do not change the classification):
1. Clause 1/4 "on the next server frame": Master_Heartbeat has an additional guard `if (sv.state != ss_active) return;` (sv_master.c:90). The forced heartbeat only fires while the server is active (a map is running). The description's "next server frame" implicitly assumes the server is up; the ss_active precondition is unstated but the statement is true when the server is active. Acceptable user-doc altitude.
2. Clause 5 "no effect": observably true (no packet sent), but internally Master_Heartbeat still increments heartbeat_sequence and resets last_heartbeat even with zero masters. Invisible to the user; the user-facing claim holds.

Both are still-true minor vagueness that was traceable -- within TRACED-CLEAN per the enum. No clause contradicts code; no clause asserts behavior lacking an enforcing read-site; access-class (clause 6) verified against the actual rcon blocklist + dispatch, not the command name.

Mod-override note: mvdsv is the engine here; KTX (the .so mod) registers its own cmd_t[] table separately and is not involved in the heartbeat command, so no cross-mod override applies. The "Set by: server console / rcon" line is correct for the mvdsv-native command.

## flags_for_review

- [fyi/other/vpass] Master_Shutdown (sv_master.c:128-142) logs 'Sending heartbeat to %s' (line 139) but actually sends S2M_SHUTDOWN, not a heartbeat -- a misleading log string, not a functional bug. Out of scope for the heartbeat command itself; noting only because it surfaced while tracing the heartbeat call sites.
- [fyi/other/vpass] Master_Heartbeat unconditionally bumps svs.heartbeat_sequence and resets svs.last_heartbeat even when no master is configured (all master_adr[i].port==0, so nothing is sent). Harmless and invisible to the user, but means the 'no master' case is not a literal early-return no-op -- the description's 'no effect' is observably correct only because the send loop is the sole externally visible action.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "heartbeat",
  "type": "command",
  "description": "Forces the server to send a heartbeat to its configured master server(s) on the next server frame, instead of waiting for the normal interval. A heartbeat tells the master server this server is alive and reports its current player count, which keeps it listed in server browsers. The server normally heartbeats automatically every five minutes; this command triggers one immediately. It has no effect if no master server is configured.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_master.c:73. Handler SV_Heartbeat_f (src/sv_master.c:71-74) sets svs.last_heartbeat = -99999 (src/sv_master.c:73) -- it does NOT send the packet directly (TRAP 2: the enforcing behavior lives elsewhere). The reset is consumed by Master_Heartbeat (src/sv_master.c:84), called every frame from the main server loop SV_Frame (src/sv_main.c:3357). Master_Heartbeat gates with `if (realtime - svs.last_heartbeat < HEARTBEAT_SECONDS) return;` (src/sv_master.c:93); setting last_heartbeat to -99999 makes (realtime - -99999) >> HEARTBEAT_SECONDS, so the gate passes on the very next frame = 'immediate'. Normal cadence: HEARTBEAT_SECONDS is #define 300 (src/sv_master.c:26) -> 'every five minutes'; the gate plus the periodic call enforce automatic heartbeats. Content sent: snprintf with S2M_HEARTBEAT, sequence, and 'active' connected-client count (src/sv_master.c:107-110), sent via NET_SendPacket to each master_adr (src/sv_master.c:111-118). 'no effect if no master configured': the send loop is gated on `if (master_adr[i].port)` (src/sv_master.c:114), so with no master set nothing is sent (master_adr is filled by setmaster, SV_SetMaster_f src/sv_master.c:37). 'keeps it listed in server browsers' is the role of a master heartbeat (alive + player count to the master that feeds browser listings) -- this is same-codebase observable purpose, not a cross-engine trace, and is action-relevant (why an admin would issue it). No-arg: SV_Heartbeat_f(void) reads no Cmd_Argv. Admin-only: Cmd_AddCommand (\"heartbeat\", SV_Heartbeat_f) src/sv_ccmds.c:1870, absent from ucmds[] (src/sv_user.c:3299-3360). F-MV1: grep of ktx/src finds no override of a 'heartbeat' command.",
  "description_proposed": null
}
```
