# Ledger -- qwfwd `heartbeat` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Handler:** `QRY_Cmd_Heartbeat_f` (src/query.c:158-161) | **Registered:** src/query.c:703
**Verdict:** synthesized | **Class:** TRACED-CLEAN

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Forces an immediate heartbeat (no waiting for the timer) | src/query.c:160 | `masters.last_heartbeat = time(NULL) - QW_MASTER_HEARTBEAT_SECONDS - 1; // trigger heartbeat ASAP` | MATCH -- backdates the last-sent stamp so the interval test reads as already-due |
| Heartbeat is normally sent only every ~5 minutes | src/query.c:17, src/query.c:241-242 | `#define QW_MASTER_HEARTBEAT_SECONDS (60 * 5)` ; `if (current_time < masters.last_heartbeat + QW_MASTER_HEARTBEAT_SECONDS) return;` | MATCH -- the command short-circuits THIS interval check |
| Does NOT bypass the on/off gate; if heartbeats are disabled nothing is sent | src/query.c:238-239 | `if (!masters_heartbeat->integer) return;` -- precedes the timer check in `QRY_HeartbeatMasters` | MATCH -- gate returns before any send when `masters_heartbeat` is 0; the forced command only defeats the interval timer at :241, not this gate |
| Heartbeat goes to the configured master servers | src/query.c:252-259 | loop over `masters.master[]`, `NET_SendPacket(net_socket, len, string, &m->addr)` | MATCH -- one packet per registered master slot |
| Actual send happens on the next server frame, not inside the command | src/query.c:689, src/query.c:229 | `QRY_HeartbeatMasters();` called from `QRY_Frame`; command only sets state | MATCH -- handler sets `last_heartbeat`; `QRY_Frame` drives the send |
| Set by: server console / config (no access tiers) | src/query.c:703, src/cmd.c:693 | `Cmd_AddCommand("heartbeat", QRY_Cmd_Heartbeat_f);` ; `void Cmd_AddCommand (char *cmd_name, xcommand_t function)` | MATCH -- registration is name+function only; qwfwd commands carry no access-class flag, run from the qwfwd console/config |

## Notes
- Prompt note CONFIRMED against source: forcing a heartbeat does not bypass the `masters_heartbeat` cvar gate. `QRY_HeartbeatMasters` returns at src/query.c:239 when `masters_heartbeat->integer` is 0, before reaching the timer check the command defeated. With heartbeats off, the forced command sends nothing.
- `QW_MASTER_HEARTBEAT_SECONDS` = `60 * 5` = 300s (src/query.c:17) -- the "~5 minutes" figure.
- The heartbeat packet (src/query.c:246, `S2M_HEARTBEAT` = `'a'`, qwfwd.h:193) embeds the heartbeat sequence and `FWD_peers_count()` (current connected-client count, peer.c:367) -- i.e. the proxy announces itself + its player count to masters. This is the master-server registration direction (candidate (a)); kept OUT of the user-doc description.
- Command is COMMAND shape: no args; "Default:" omitted per D20 command rule. No suspect-pool membership (suspect_pool_member=FALSE); no mechanical candidate; cold synthesis from use-sites.

```json
{
  "project": "qwfwd",
  "knob": "heartbeat",
  "type": "command",
  "description": "Forces the proxy to send a heartbeat to its master servers right away, instead of waiting for the normal interval (about every 5 minutes). A heartbeat is how the proxy announces itself to the masters so it appears in the public server list. This does not override the heartbeat on/off switch -- if master heartbeats are turned off, this command sends nothing.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold synthesis from src/query.c use-sites; no comment to affirm, no mechanical candidate, suspect_pool_member=FALSE. Handler QRY_Cmd_Heartbeat_f (src/query.c:158-161) backdates masters.last_heartbeat by QW_MASTER_HEARTBEAT_SECONDS+1 (src/query.c:160) so the interval test at src/query.c:241-242 reads as already-due; the actual send runs on the next QRY_Frame (src/query.c:689 -> QRY_HeartbeatMasters src/query.c:229). 'about every 5 minutes' = QW_MASTER_HEARTBEAT_SECONDS = 60*5 (src/query.c:17). 'does not override the on/off switch' enforced at src/query.c:238-239 (if (!masters_heartbeat->integer) return;) which precedes the timer check, so a forced heartbeat sends nothing when masters_heartbeat is 0 -- prompt note verified TRUE against source. Heartbeat is sent to each registered master in the loop at src/query.c:252-259 (NET_SendPacket per m->addr). Set-by: registration at src/query.c:703 via Cmd_AddCommand(char*, xcommand_t) (src/cmd.c:693) -- name+function only, no access-class arg; qwfwd console commands run from the proxy console/config with no admin/player tiers. [L3 breadcrumb: master-server registration/heartbeat] -- the heartbeat packet (S2M_HEARTBEAT='a', qwfwd.h:193) at src/query.c:246 carries the heartbeat sequence + FWD_peers_count() (peer.c:367), i.e. the proxy's self-registration + live player count to masters; this is concept-note candidate (a) and is kept out of the user-facing description.",
  "description_proposed": null
}
```
