# Ledger -- qwfwd `whitelistremove` (command)

Phase 3 describe-fill. Anchor: QWFWD `1.40-dev`. Source root:
`apps/slipgate-app/reference/qwfwd/src/`. Shared whitelist-subsystem
context is documented in `ledger-qwfwd-whitelist.md`.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "whitelistremove",
  "type": "command",
  "description": "Removes one IPv4 address from the destination-address whitelist -- the set of remote server addresses this proxy is permitted to forward clients to. If removing the last address leaves the whitelist empty, the proxy returns to forwarding to any destination.\n\nwhitelistremove <ip> = remove <ip> (a dotted IPv4 address) from the whitelist.\n\nThe command is rejected if <ip> is not a valid IPv4 address, and reports an error if the address is not currently in the whitelist.\n\nSet by: proxy server console or qwfwd.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Handler Cmd_WhitelistRemove_f, whitelist.c:100-138. Arg contract: requires exactly one argument -- whitelist.c:107 `if (Cmd_Argc() != 2)` prints `usage: whitelistremove <ip>` and returns. Validity: whitelist.c:113-120 parses via inet_addr and rejects INADDR_NONE ('error: invalid IP address'). Removal: whitelist.c:122-135 scans for a match and, on hit, shifts the tail down (whitelist.c:126-129), decrements whitelist_count (whitelist.c:131), prints '<ip> removed from whitelist'. Not-found path: whitelist.c:137 'error: %s not found in whitelist'. OFF-state consequence ('removing the last address -> empty -> forward to any destination') traced to the consumer: SV_IsWhitelisted returns true when whitelist_count is 0 (whitelist.c:26-29); the count reaching 0 here re-enables allow-all. Forwarding-gate role traced through peer.c:44 (call against resolved REMOTE address, peer.c:41) -> peer.c:45 return NULL on false. Set-by traced to Cmd_AddCommand (whitelist.c:18), no own rcon (svc.c:464-465), config-exec (main.c:142, 165). D20: cites kept out of `description`. No cross-codebase consequence -> no See also.",
  "description_proposed": null
}
```
