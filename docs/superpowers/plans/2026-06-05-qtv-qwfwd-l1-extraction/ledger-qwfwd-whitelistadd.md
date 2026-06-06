# Ledger -- qwfwd `whitelistadd` (command)

Phase 3 describe-fill. Anchor: QWFWD `1.40-dev`. Source root:
`apps/slipgate-app/reference/qwfwd/src/`. Shared whitelist-subsystem
context is documented in `ledger-qwfwd-whitelist.md`.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "whitelistadd",
  "type": "command",
  "description": "Adds one IPv4 address to the destination-address whitelist -- the set of remote server addresses this proxy is permitted to forward clients to. As soon as the whitelist holds at least one address, the proxy forwards only to whitelisted addresses and refuses every other destination.\n\nwhitelistadd <ip> = add <ip> (a dotted IPv4 address) to the whitelist.\n\nThe address is rejected if it is not a valid IPv4 address, if it is already in the whitelist, or if the whitelist is full (4096 addresses).\n\nSet by: proxy server console or qwfwd.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Handler Cmd_WhitelistAdd_f, whitelist.c:60-97. Arg contract: requires exactly one argument -- whitelist.c:66 `if (Cmd_Argc() != 2)` prints `usage: whitelistadd <ip>` and returns. Full-check: whitelist.c:72-76 `if (whitelist_count >= WHITELIST_MAX_ADDRS)` rejects ('error: whitelist is full'); WHITELIST_MAX_ADDRS = 4096 (whitelist.c:3). Validity: whitelist.c:78-85 parses via inet_addr and rejects INADDR_NONE -> dotted IPv4 only ('error: invalid IP address'). Duplicate-check: whitelist.c:87-94 scans the existing list and rejects an already-present address. Append on success: whitelist.c:96 `whitelist[whitelist_count++] = ip;`. What the list governs / OFF-state traced through the consumer SV_IsWhitelisted (whitelist.c:22-44) called at peer.c:44 against the resolved REMOTE server address (peer.c:41); false -> peer.c:45 return NULL (no forwarded connection); empty list = allow-all (whitelist.c:26-29), non-empty restricts to listed addresses (whitelist.c:31-43). 'forwards only to whitelisted addresses' once non-empty is the enforced consequence, not name inference. Set-by traced to Cmd_AddCommand (whitelist.c:17), no own rcon (svc.c:464-465), config-exec (main.c:142, 165). D20: cites kept out of `description`. No cross-codebase consequence -> no See also.",
  "description_proposed": null
}
```
