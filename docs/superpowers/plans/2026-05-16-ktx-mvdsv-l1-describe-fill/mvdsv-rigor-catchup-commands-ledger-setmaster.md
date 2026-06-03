# describe-fill-synthesis ledger -- mvdsv `setmaster`

- **project:** mvdsv
- **knob:** `setmaster` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:setmaster: synthesized -- replaces master list (up to 8, port-default 27000), pings + forces heartbeat; 'none'/bad-addr = nomaster; console/rcon -- origin=synthesized ref=src/sv_master.c:46 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets which master servers this server announces itself to (the master servers feed the public server browsers). Replaces any previously configured masters, immediately pings each address, and triggers a heartbeat so the server registers right away.
>
> setmaster <addr> [<addr> ...] = use the listed master servers (up to 8). A port may be appended; if omitted it defaults to 27000.
> setmaster none = announce to no master (disables public listing).
>
> If an argument is "none" or an address that cannot be resolved, the server stops processing the rest of the line there: any masters listed before it stay configured, and the immediate heartbeat is skipped. To announce to no master at all, make "none" the first argument.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| replaces previously configured masters | src/sv_master.c:42 | `memset (&master_adr, 0, sizeof(master_adr));` | MATCH |
| parses each arg as a master address | src/sv_master.c:44-46 | `for (i=1 ; i<Cmd_Argc() ; i++){ if (!strcmp(Cmd_Argv(i),"none") || !NET_StringToAdr(Cmd_Argv(i), &master_adr[i-1])) {...} }` | MATCH |
| up to 8 masters | src/server.h:35 | `#define MAX_MASTERS 8 // max recipients for heartbeat packets` (master_adr is netadr_t[MAX_MASTERS]) | MATCH |
| default port 27000 | src/sv_master.c:51-52 | `if (master_adr[i-1].port == 0) master_adr[i-1].port = BigShort (27000);` | MATCH |
| 'none'/unresolvable -> nomaster, ignore rest | src/sv_master.c:46-49 | `if (... || !NET_StringToAdr(...)) { Con_Printf("Setting nomaster mode.\n"); return; }` | MATCH |
| pings each address immediately | src/sv_master.c:58-60 | `data[0] = A2A_PING; data[1] = 0; NET_SendPacket (NS_SERVER, 2, data, master_adr[i-1]);` | MATCH |
| forces an immediate heartbeat | src/sv_master.c:63 | `svs.last_heartbeat = -99999;` (defeats the HEARTBEAT_SECONDS gate at src/sv_master.c:93) | MATCH |
| heartbeat registers server with master | src/sv_master.c:108-117 | `snprintf(string,...,"%c\n%i\n%i\n", S2M_HEARTBEAT,...); ... NET_SendPacket(NS_SERVER, ..., master_adr[i]);` | MATCH |
| admin-only (not a client cmd) | src/sv_user.c (ucmds[]) | grep `{"setmaster"` -> no match | MATCH |
| normal rcon NOT blocked | src/sv_main.c:1754-1764 | no "setmaster" entry in blocklist | MATCH |
| no KTX override | ktx/src | grep `"setmaster"` -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Sets which master servers this server announces itself to" | src/sv_master.c:44-60 (populate loop) + src/sv_master.c:113-118 (Master_Heartbeat sends to master_adr[]) | `for (i=1 ; i<Cmd_Argc() ; i++){ ... NET_SendPacket(...) }` ; `for (i=0;i<MAX_MASTERS;i++) if (master_adr[i].port){ ... NET_SendPacket(NS_SERVER, strlen(string), string, master_adr[i]); }` | MATCH |
| 2 | "master servers feed the public server browsers" | src/qwprot/src/protocol.h:108-110 (S2M_HEARTBEAT context) + sv_master.c:108 (`%c\n%i\n%i` heartbeat to master) | `snprintf(string,..., "%c\n%i\n%i\n", S2M_HEARTBEAT, svs.heartbeat_sequence, active)` | MATCH (server-to-master registration; browser listing is the master's role -- contextual, traceable via heartbeat target) |
| 3 | "Replaces any previously configured masters" | src/sv_master.c:42 | `memset (&master_adr, 0, sizeof(master_adr));` | MATCH (full table zeroed at function entry before repopulating) |
| 4 | "immediately pings each address" | src/sv_master.c:58-60 + protocol.h:142 | `data[0] = A2A_PING; data[1] = 0; NET_SendPacket (NS_SERVER, 2, data, master_adr[i-1]);` ; `#define A2A_PING 'k' // respond with an A2A_ACK` | MATCH (one ping per valid address, in-loop) |
| 5 | "triggers a heartbeat so the server registers right away" | src/sv_master.c:63 + sv_master.c:93 + sv_main.c:3357 | `svs.last_heartbeat = -99999;` ; `if (realtime - svs.last_heartbeat < HEARTBEAT_SECONDS) return;` ; `Master_Heartbeat ();` | MATCH (forces next per-frame Master_Heartbeat to fire) -- but NOTE: line 63 is AFTER the loop; the early `return` on a "none"/bad token SKIPS it (see clause 9) |
| 6 | "use the listed master servers (up to 8)" | src/server.h:35 + sv_master.c:113 (Master_Heartbeat bound) | `#define MAX_MASTERS 8 // max recipients for heartbeat packets` ; `for (i=0 ; i<MAX_MASTERS ; i++)` | MATCH as a user-facing ceiling (heartbeat/shutdown senders only read slots 0..7). NOT enforced as an input cap -- see flag: OOB write for 9+ args (no MAX_MASTERS bound in the populate loop) |
| 7 | "A port may be appended; if omitted it defaults to 27000" | src/net.c:354-359 (strip+parse :port) + sv_master.c:51-52 + protocol.h:128 | `if (*colon == ':'){ *colon=0; ((struct sockaddr_in*)sadr)->sin_port = htons((short)atoi(colon+1)); }` ; `if (master_adr[i-1].port == 0) master_adr[i-1].port = BigShort (27000);` ; `#define PORT_MASTER 27000` | MATCH |
| 8 | "setmaster none = announce to no master (disables public listing)" | src/sv_master.c:42 + sv_master.c:46-49 | `memset(&master_adr,0,...)` ; `if (!strcmp(Cmd_Argv(i),"none") ... ){ Con_Printf("Setting nomaster mode.\n"); return; }` | MATCH for the single-arg `setmaster none` case (table already zeroed, nothing added, returns) |
| 9a | "If any argument is 'none' or an address that cannot be resolved, the server switches to nomaster mode ... and ignores the rest of the line" (the "ignores the rest" + "cannot be resolved -> trigger" parts) | src/sv_master.c:46-49 + net.c:369-370 / net.c:350-351 | `if (!strcmp(...,"none") \|\| !NET_StringToAdr(Cmd_Argv(i), &master_adr[i-1])){ Con_Printf("Setting nomaster mode.\n"); return; }` ; `if (!(h = gethostbyname(copy))) return false;` | MATCH (the `return` does skip remaining args; unresolved == NET_StringToAdr false) |
| 9b | "...switches to nomaster mode (no masters at all)" -- the **"(no masters at all)"** end-state assertion | src/sv_master.c:42 (memset at entry) + 44-60 (incremental populate) + 46-49 (early return WITHOUT re-clearing) | `memset(&master_adr,0,...)` is at the TOP; masters are added one-by-one inside the loop; the `return` on the failing token does NOT clear slots already populated this call | MISMATCH -- see rationale |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Command registered via plain `Cmd_AddCommand("setmaster", SV_SetMaster_f)` at sv_ccmds.c:1867 (no CF_ flag table); handler at sv_master.c:37-64. Wide-grep done: only use-sites are the registration (sv_ccmds.c:1867), the handler (sv_master.c), and reads of `master_adr[]` (sv_master.c Master_Heartbeat/Master_Shutdown; sv_broadcast.c:200-207). No cross-mod (KTX) override of this command.

CLASSIFICATION: C-FIX. One clause CONTRADICTS the code.

The defect is the parenthetical "(no masters at all)" in paragraph 3. The code's nomaster path is: `memset(&master_adr,0,...)` runs ONCE at function entry (sv_master.c:42), then the loop populates and PINGS masters one at a time; on the FIRST "none" or unresolvable token it prints "Setting nomaster mode" and `return`s WITHOUT clearing the slots it already filled this call. Consequence for the mixed case `setmaster 1.2.3.4 none` (or `setmaster goodaddr badaddr`): slot 0 = 1.2.3.4 (valid, port-defaulted, already pinged) SURVIVES, and `Master_Heartbeat` (sv_master.c:113-118) sends heartbeats to every slot with `port != 0` -- so the server is NOT in "no masters at all" state; it keeps announcing to the masters listed before the failing token. So "(no masters at all)" is true ONLY when the "none"/bad token is the FIRST argument (or no valid master precedes it). As an affirmative end-state claim it is false in the mixed case -> contradiction, not mere imprecision.

Second-order detail tied to clause 5: because the early `return` (sv_master.c:49) is BEFORE `svs.last_heartbeat = -99999` (sv_master.c:63), the mixed case ALSO does NOT fire the immediate heartbeat -- the surviving masters register on the next 300s tick, not "right away". The "triggers a heartbeat right away" framing is therefore only accurate for the all-valid path; any "none"/bad token aborts before line 63.

Suggested minimal fix to the description: replace paragraph 3 with something like -- "If an argument is `none` or an address that cannot be resolved, the command prints `Setting nomaster mode` and stops processing the rest of the line. Any masters listed before that token in the same command remain configured (the immediate heartbeat is not triggered in that case). To clear all masters, make `none` (or no valid address) the first argument." Everything else in the description is traced-clean.

NOTE on clause 6 framing: "(up to 8)" is an accurate user-facing ceiling because the heartbeat (sv_master.c:113) and shutdown (sv_master.c:136) loops are bounded by `MAX_MASTERS=8` and `sv_broadcast.c:200-205` breaks at the first empty slot -- so only the first 8 are ever honored. It is NOT enforced on input (see flag below).

## flags_for_review

- [review/suspected-bug/vpass] Latent OOB write in SV_SetMaster_f. The populate loop `for (i=1; i<Cmd_Argc(); i++)` writes `master_adr[i-1]` with NO bound against MAX_MASTERS (8). Cmd_Argc() can reach MAX_ARGS=80 (cmd.h:172; tokenizer caps cmd_argc at 80, cmd.c:638). Passing 9+ master addresses writes past the 8-element `netadr_t master_adr[MAX_MASTERS]` array (server.h:35, sv_master.c:28). Requires server-console/rcon access (privileged), so low exploitability, but it is a real out-of-bounds stack/global write. Not a description defect; the description's '(up to 8)' is the correct user-facing ceiling.
- [fyi/other/vpass] Engine's own console message is misleading and is the likely root of the description's flavour-C defect. sv_master.c:48 unconditionally prints 'Setting nomaster mode.' on hitting a 'none'/unresolvable token even when valid masters were already added earlier in the same command (which survive). The message asserts a state the code does not reach in the mixed case. A reader (human or extractor) trusting the console string would write exactly the wrong '(no masters at all)' clause -- this is the announce-string-inference trap the trace-discipline warns about.
- [fyi/other/vpass] Non-contiguous master list silently truncates downstream consumers. sv_broadcast.c:200-205 (SV_BroadcastUpdateServerList) iterates master_adr[] and `break`s at the first slot with port==0. Because SV_SetMaster_f assigns to master_adr[i-1] strictly in input order and aborts on the first bad token, the list is always a contiguous prefix in normal operation -- but any future code path that leaves a gap (zeroed slot before a populated one) would cause the broadcast query to skip all masters after the gap. FYI for anyone changing the populate logic.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "setmaster",
  "type": "command",
  "description": "Sets which master servers this server announces itself to (the master servers feed the public server browsers). Replaces any previously configured masters, immediately pings each address, and triggers a heartbeat so the server registers right away.\n\nsetmaster <addr> [<addr> ...] = use the listed master servers (up to 8). A port may be appended; if omitted it defaults to 27000.\nsetmaster none = announce to no master (disables public listing).\n\nIf an argument is \"none\" or an address that cannot be resolved, the server stops processing the rest of the line there: any masters listed before it stay configured, and the immediate heartbeat is skipped. To announce to no master at all, make \"none\" the first argument.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_master.c:46. Handler SV_SetMaster_f registered src/sv_ccmds.c:1867; body src/sv_master.c:37-64. Clauses enforce-traced: (replaces previous masters) memset(&master_adr, 0, sizeof(master_adr)) at the top, src/sv_master.c:42 -- the whole master_adr[] table is cleared before parsing, so this is a replace not an append. (parses each arg into a master address) loop i=1..Cmd_Argc()-1, NET_StringToAdr(Cmd_Argv(i), &master_adr[i-1]), src/sv_master.c:44-46. (max 8) master_adr is netadr_t[MAX_MASTERS], MAX_MASTERS=8 (src/server.h:35: '#define MAX_MASTERS 8 // max recipients for heartbeat packets'); the loop indexes master_adr[i-1] so it accepts up to MAX_MASTERS addresses. (default port 27000) if (master_adr[i-1].port==0) master_adr[i-1].port = BigShort(27000), src/sv_master.c:51-52. ('none'/unresolvable -> nomaster, ignores rest) if (!strcmp(Cmd_Argv(i),\"none\") || !NET_StringToAdr(...)) { Con_Printf(\"Setting nomaster mode.\\n\"); return; } -- returns out of the loop, src/sv_master.c:46-49. (pings each) data[0]=A2A_PING; NET_SendPacket(NS_SERVER, 2, data, master_adr[i-1]), src/sv_master.c:58-60; Con_Printf 'Sending a ping.' :56. (forces heartbeat) svs.last_heartbeat = -99999 at end, src/sv_master.c:63 -- the very negative value forces Master_Heartbeat past its 'realtime - svs.last_heartbeat < HEARTBEAT_SECONDS' gate (src/sv_master.c:93) on the next tick, so the server registers immediately. (purpose: masters feed browsers) Master_Heartbeat sends S2M_HEARTBEAT to each master_adr with port set, src/sv_master.c:84-118 -- the heartbeat is how the server appears in the master's list. ACCESS-CLASS: 'setmaster' not in ucmds[] (grep {\"setmaster\" empty) -> Cmd_AddCommand-only = admin/console. NOT in the normal-rcon blocklist (src/sv_main.c:1754-1764) -> Set-by 'server console / rcon'. F-MV1: grep of ktx/src for \"setmaster\" returned no matches -- no KTX override. Default omitted (no-arg: the loop body does not execute, only the memset+heartbeat run, so a bare 'setmaster' effectively clears masters -- not a meaningful documented default value).",
  "description_proposed": null
}
```
