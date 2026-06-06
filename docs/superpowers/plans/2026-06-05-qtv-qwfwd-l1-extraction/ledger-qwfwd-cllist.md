# Ledger -- qwfwd `cllist` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Handler:** `FWD_Cmd_ClList_f` (src/peer.c:382-405) | **Registered:** src/peer.c:423
**Verdict:** synthesized | **Class:** TRACED-CLEAN

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Lists the proxy's current forwarded client connections | src/peer.c:394 | `for (idx = 1, p = peers; p; p = p->next, idx++)` iterates the `peers` linked list | MATCH -- one row per peer (a forwarded connection) |
| Column: per-connection id | src/peer.c:396-397 ; src/qwfwd.h:154 | `Sys_Printf("%6d ...", p->userid, ...)`; `int userid; // unique per proxy userid` | MATCH -- `##id##` header maps to userid |
| Column: address the client connects FROM | src/peer.c:398 ; src/qwfwd.h:156 | `NET_AdrToString(&p->from, ...)`; `struct sockaddr_in from; // client addr` | MATCH -- "address from" = the client's own addr |
| Column: address the proxy forwards TO | src/peer.c:399 ; src/qwfwd.h:157 | `NET_AdrToString(&p->to, ...)`; `struct sockaddr_in to; // remote addr` | MATCH -- "address to" = the destination server |
| Addresses render as ip:port | src/net.c:199-207 | `snprintf(buf,...,"%i.%i.%i.%i:%i", ...ntohs(a->sin_port))` | MATCH |
| Column: time connected, in minutes | src/peer.c:400 ; src/qwfwd.h:148 | `(int)(current - p->connect)/60`; `time_t connect; // connect helper`; `current = time(NULL)` (src/peer.c:388) | MATCH -- (now - connect)/60 = whole minutes |
| Column: client name | src/peer.c:400 ; src/qwfwd.h:151 | `... p->name`; `char name[MAX_INFO_KEY]; // name, extracted from userinfo` | MATCH -- name from the client's userinfo |
| Header + total count | src/peer.c:390-391, 404 | `Sys_Printf("=== client list ===\n")`, column header (src/peer.c:391), `Sys_Printf("%d clients\n", idx-1)` (src/peer.c:404) | MATCH |
| Read-only: no network action | src/peer.c:382-405 | body is only `Sys_Printf` + list walk; no `NET_SendPacket` | MATCH |
| Set by: server console / config (no access tiers) | src/peer.c:423 ; src/cmd.c:693 | `Cmd_AddCommand("cllist", FWD_Cmd_ClList_f);` ; `void Cmd_AddCommand (char *cmd_name, xcommand_t function)` | MATCH -- name+function only; no access-class flag |

## Notes
- COMMAND shape: no args; "Default:" omitted per D20 command rule.
- QWFWD is a connection forwarder: each `peer_t` is one client whose traffic the proxy relays to a remote QW server, so "from" = the client side and "to" = the destination server side. Stated in user terms (no `peer_t`/`sockaddr` jargon in the description per D20).
- `idx-1` for the count: the loop starts `idx=1` and post-increments, so after the loop `idx-1` = number of peers (src/peer.c:404). TRACED.
- No suspect-pool membership (suspect_pool_member=FALSE); no mechanical candidate; cold synthesis from use-sites.
- SR-7 N/A: `cllist` is not one of the 11 source_inline stubs (arrived with NULL description).

```json
{
  "project": "qwfwd",
  "knob": "cllist",
  "type": "command",
  "description": "Prints the proxy's current client connections to the console, one per line. Each line shows the connection's id, the address the client is connecting from, the address the proxy is forwarding it to (the destination server), how many minutes the client has been connected, and the client's name. A total client count is printed at the end. Takes no arguments.\n\nSet by: server console / config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold synthesis from handler FWD_Cmd_ClList_f (src/peer.c:382-405); no comment to affirm, no mechanical candidate, suspect_pool_member=FALSE. The handler walks the `peers` linked list (src/peer.c:394) printing one row per peer via Sys_Printf (src/peer.c:396-400). Column-by-column enforce-trace against the printf args and the peer_t field comments (src/qwfwd.h): userid -> '##id##' (qwfwd.h:154 'unique per proxy userid'); p->from -> 'address from' (qwfwd.h:156 'client addr'); p->to -> 'address to' (qwfwd.h:157 'remote addr', i.e. the server the proxy forwards to); both rendered ip:port by NET_AdrToString (src/net.c:199-207, '%i.%i.%i.%i:%i' with ntohs(sin_port)); (current - p->connect)/60 -> minutes connected (qwfwd.h:148 connect helper, current=time(NULL) src/peer.c:388); p->name -> client name (qwfwd.h:151 'name, extracted from userinfo'). Header '=== client list ===' (src/peer.c:390) + column header (src/peer.c:391); trailing '%d clients' = idx-1 (src/peer.c:404), correct because idx starts at 1 and post-increments per peer. Read-only: body has only Sys_Printf, no NET_SendPacket. Described in user terms (forwarded client connection, from/to addresses) with no peer_t/sockaddr jargon per D20. Set-by per verified QWFWD access model: registration src/peer.c:423 via Cmd_AddCommand(char*, xcommand_t) (src/cmd.c:693), name+function only, no access-class flag; QWFWD has no access tiers and no own rcon -- console/config dispatch. D20: no Default line for a no-arg command.",
  "description_proposed": null
}
```
