# Ledger -- qwfwd `whitelist` (command)

Phase 3 describe-fill. Anchor: QWFWD `1.40-dev`. Source root:
`apps/slipgate-app/reference/qwfwd/src/`.

## What the whitelist subsystem governs (shared context for all four commands)

`whitelist.c` keeps an in-memory list of IPv4 addresses (cap 4096,
`WHITELIST_MAX_ADDRS`). The list is consumed by `SV_IsWhitelisted`
(whitelist.c:22-44), which is called from `FWD_peer_new` at peer.c:44
against the resolved REMOTE server address (`to`, built at peer.c:41 from
`remote_host`/`remote_port`) -- i.e. the destination the proxy is about to
forward a client to, NOT the client's own source address. If
`SV_IsWhitelisted` returns false, `FWD_peer_new` returns NULL at
peer.c:45 and no forwarded connection is created.

OFF-state (whitelist.c:26-29): `if (!whitelist_count) return true;` -- an
EMPTY whitelist allows forwarding to every destination. A NON-EMPTY
whitelist restricts forwarding to ONLY the listed destination addresses
(whitelist.c:31-43, exact-match on `addr->sin_addr.s_addr`).

Set-by: all four commands are registered with `Cmd_AddCommand`
(whitelist.c:16-19). qwfwd has no own rcon command -- svc.c:464-465
forwards `rcon` to the target server -- so these are NOT remotely
invokable; they run from the proxy's own console or its `qwfwd.cfg`
config file (exec'd at startup, main.c:142, and re-exec'd on SIGHUP
reload, main.c:165).

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "whitelist",
  "type": "command",
  "description": "Lists the destination-address whitelist: the set of remote server addresses this proxy is permitted to forward clients to. Prints the number of whitelisted addresses followed by each one. While the whitelist is empty the proxy forwards to any destination; once one or more addresses are added it forwards only to those.\n\nTakes no arguments.\n\nSet by: proxy server console or qwfwd.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Handler Cmd_Whitelist_f, whitelist.c:46-58 -- pure display: Sys_Printf count (whitelist.c:51) then a loop printing each inet_ntoa(addr) (whitelist.c:53-57). Reads no Cmd_Argv, so 'takes no arguments' (handler has no Cmd_Argc check). What the list governs is traced through the consumer: SV_IsWhitelisted (whitelist.c:22-44) is called at peer.c:44 inside FWD_peer_new against `to`, the REMOTE server address resolved at peer.c:41 from remote_host/remote_port; false -> peer.c:45 return NULL (no forwarded connection). Destination-not-source confirmed: the checked sockaddr is the resolved remote host, not `from`. OFF-state (empty-list = allow-all) enforced at whitelist.c:26-29 `if (!whitelist_count) return true;`; non-empty restricts to listed addresses via the exact-match loop whitelist.c:31-43. Set-by traced to Cmd_AddCommand registration (whitelist.c:16) plus the absence of an own rcon path (svc.c:464-465 forwards rcon to the target) and the config-exec sites (main.c:142, 165); commands therefore come from the proxy console / qwfwd.cfg. D20: file:line and code terms kept out of `description`. No cross-codebase consequence (whitelist gates only this proxy's own forwarding decision) so no See also.",
  "description_proposed": null
}
```
