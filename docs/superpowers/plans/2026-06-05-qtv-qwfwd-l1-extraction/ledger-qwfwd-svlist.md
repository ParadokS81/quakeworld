# Ledger -- qwfwd `svlist` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Handler:** `QRY_Cmd_SvList_f` (src/query.c:662-680) | **Registered:** src/query.c:702
**Verdict:** synthesized | **Class:** TRACED-CLEAN

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Prints the proxy's current list of QW servers | src/query.c:672-676 | `for (idx = 1, sv = servers; sv; sv = sv->next, idx++) { Sys_Printf("%3d %-*s %d\n", ...); }` | MATCH -- iterates the `servers` linked list to console |
| Each entry shows the server address and its ping | src/query.c:674-675 | `Sys_Printf("%3d %-*s %d\n", idx, ..., NET_AdrToString(&sv->addr, ...), (int)sv->ping)` | MATCH -- address:port + ping per line |
| Prints the total server count at the end | src/query.c:679 | `Sys_Printf("%d servers\n", idx-1);` | MATCH |
| The list is the locally-discovered set (servers learned from the masters), not a fresh query | src/query.c:322, src/query.c:370 | `servers` populated only by `QRY_SV_new` from `SVC_QRY_ParseMasterReply` (master server-list reply); the command issues no query | MATCH -- read-only over cached state |
| Read-only: no network action | src/query.c:662-680 | handler body contains zero `NET_SendPacket`; only `Sys_Printf` | MATCH |
| Set by: server console / config (no access tiers) | src/query.c:702, src/cmd.c:693 | `Cmd_AddCommand("svlist", QRY_Cmd_SvList_f);` ; `void Cmd_AddCommand (char *cmd_name, xcommand_t function)` | MATCH -- name+function only; no access-class flag |

## Notes
- COMMAND shape: no args; "Default:" omitted per D20 command rule.
- The `servers` list is built from master-server replies: masters are queried with `QW_MASTER_QUERY "c\n"` (src/query.c:13, sent at src/query.c:222), the reply is parsed in `SVC_QRY_ParseMasterReply` (src/query.c:272-324) which calls `QRY_SV_new` (src/query.c:370) to add each server; `QRY_SV_PingServers` (src/query.c:444) fills in pings. `svlist` only READS this cache.
- SR-5 breadcrumb DECISION: NO breadcrumb. Candidate (a) is master-server *registration/heartbeat* -- the proxy announcing ITSELF to masters (the heartbeat direction). `svlist` prints the *other* QW servers the proxy discovered by querying masters (server-list direction) and issues no query of its own; it does not touch the proxy's own registration or heartbeat state. Per the prompt's explicit rule ("if it only prints the local discovered list, no breadcrumb"), this command earns none.
- No suspect-pool membership (suspect_pool_member=FALSE); no mechanical candidate; cold synthesis from use-sites.

```json
{
  "project": "qwfwd",
  "knob": "svlist",
  "type": "command",
  "description": "Prints the proxy's current list of known QuakeWorld servers to the console. Each line shows a server's address and the proxy's last measured ping to it, followed by a total count. This is the set of servers the proxy has learned from the master servers; the command only displays the cached list and does not start a new lookup.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold synthesis from src/query.c use-sites; no comment to affirm, no mechanical candidate, suspect_pool_member=FALSE. Handler QRY_Cmd_SvList_f (src/query.c:662-680) iterates the static `servers` linked list with Sys_Printf at src/query.c:672-676, printing index + NET_AdrToString(&sv->addr) + sv->ping per entry (src/query.c:674-675) and a total at src/query.c:679 ('%d servers'). Read-only: the handler body contains no NET_SendPacket -- only console prints. The `servers` cache is populated elsewhere: masters are queried with QW_MASTER_QUERY 'c\\n' (src/query.c:13, sent src/query.c:222), the reply parsed in SVC_QRY_ParseMasterReply (src/query.c:272-324) which calls QRY_SV_new (src/query.c:370) per discovered server; pings filled by QRY_SV_PingServers (src/query.c:444). Hence 'learned from the master servers' and 'does not start a new lookup'. Set-by: registration at src/query.c:702 via Cmd_AddCommand(char*, xcommand_t) (src/cmd.c:693) -- name+function only, no access-class arg; qwfwd console commands run from the proxy console/config with no admin/player tiers. SR-5 breadcrumb decision: NONE. Candidate (a) is master-server registration/heartbeat (the proxy announcing itself, the heartbeat direction); svlist prints the discovered OTHER-servers list (server-list direction) and issues no query, touching no registration/heartbeat state -- per the prompt's explicit rule a print-only local-list command earns no breadcrumb.",
  "description_proposed": null
}
```
