# Ledger -- qwfwd `whitelistpurge` (command)

Phase 3 describe-fill. Anchor: QWFWD `1.40-dev`. Source root:
`apps/slipgate-app/reference/qwfwd/src/`. Shared whitelist-subsystem
context is documented in `ledger-qwfwd-whitelist.md`.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "whitelistpurge",
  "type": "command",
  "description": "Clears the destination-address whitelist -- removes every whitelisted remote server address at once. After purging, the whitelist is empty and the proxy forwards clients to any destination until addresses are added again. The proxy also purges the whitelist automatically when it reloads its configuration, so that re-running qwfwd.cfg rebuilds the list from scratch rather than appending to the old one.\n\nTakes no arguments.\n\nSet by: proxy server console or qwfwd.cfg; also run automatically on a configuration reload.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Handler Cmd_WhitelistPurge_f, whitelist.c:140-144 -- sets whitelist_count = 0 (whitelist.c:142) and memsets the whole array (whitelist.c:143). Reads no Cmd_Argv, so 'takes no arguments'. Empty-list consequence ('forwards to any destination') traced to the consumer SV_IsWhitelisted (whitelist.c:26-29 `if (!whitelist_count) return true;`); forwarding-gate role at peer.c:44 against the resolved REMOTE address (peer.c:41) -> peer.c:45 return NULL on false. Auto-purge-on-reload clause traced to main.c:162-167: the main loop, when `reload` is set, calls Cmd_WhitelistPurge_f() (main.c:164) THEN re-execs qwfwd.cfg (main.c:165); `reload` is set by the SIGHUP handler (main.c:101-104). This is why the handler is non-static / externally linked (qwfwd.h:469) unlike the other three -- it is the only whitelist command invoked from outside whitelist.c. Set-by traced to Cmd_AddCommand (whitelist.c:19) for the manual path plus the main.c:164 internal call for the reload path; no own rcon (svc.c:464-465), config-exec (main.c:142, 165). D20: cites kept out of `description`; the reload behavior is action-relevant (it explains why entries vanish on SIGHUP) so it is stated in user-observable terms inline. No cross-codebase consequence -> no See also.",
  "description_proposed": null
}
```
