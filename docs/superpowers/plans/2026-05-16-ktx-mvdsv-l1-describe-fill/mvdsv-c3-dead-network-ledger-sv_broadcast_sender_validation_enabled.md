# describe-fill-synthesis ledger -- mvdsv `sv_broadcast_sender_validation_enabled`

- **project:** mvdsv
- **knob:** `sv_broadcast_sender_validation_enabled` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_broadcast_sender_validation_enabled: synthesized -- when on (default 1), incoming broadcasts accepted only from master-list addresses else rejected; off accepts any addr; only effective when broadcasting enabled -- origin=synthesized ref=src/sv_broadcast.c:537 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether incoming cross-server broadcast messages are checked against the known server list before being accepted. When on, a broadcast packet is only accepted if its source address matches a server this server learned about from its master server(s); broadcasts from any other address are rejected. When off, broadcasts are accepted from any address (subject to rate limiting). This only has an effect while broadcasting is enabled.
>
> 0 = accept broadcasts from any address.
> 1 = accept only from addresses in the known server list.
>
> Default: 1.
> Set by: server config.
> See also: sv_broadcast_enabled.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 1 | src/sv_main.c:146 | `cvar_t sv_broadcast_sender_validation_enabled = {"sv_broadcast_sender_validation_enabled", "1"};` | MATCH |
| polarity 0=off / non-zero=on | src/sv_broadcast.c:537 | `if (sv_broadcast_sender_validation_enabled.value)` | MATCH |
| ON: source addr must be in known server list | src/sv_broadcast.c:547-554 | `for (i=0; i<server_list_count; i++){ if (NET_CompareBaseAdr(net_from, server_list[i])){ valid = true; break; } }` | MATCH |
| ON: non-matching sender rejected | src/sv_broadcast.c:558-562 | `if (!valid){ Con_Printf("Rejected broadcast from address: %s (payload: %s)\n", addr, payload); return; }` | MATCH |
| OFF: validation block skipped (accept any addr) | src/sv_broadcast.c:537 | `if (sv_broadcast_sender_validation_enabled.value)` guards the entire reject block (537-564) | MATCH |
| server list sourced from master servers | src/sv_broadcast.c:535-536 + 215-216 | comment 'ensure ... address exists in the list of addresses received from the master server'; server_list populated in SV_BroadcastQueryMasters `server_list_count = server_count; memcpy(server_list, servers, ...)` | MATCH |
| only effective while broadcasting enabled | src/sv_broadcast.c:522 | `if (!sv_broadcast_enabled.value || Cmd_Argc() < 1){ return; }` precedes the validation read in same fn | MATCH |
| rate limiting always applies | src/sv_broadcast.c:527 | `if (SVC_BroadcastIsRateLimited(&net_from)){ return; }` runs before validation, cvar-independent | MATCH |
| no KTX override (F-MV1) | ktx/src (grep) | no `sv_broadcast_sender_validation_enabled` in ktx | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | File:line | Snippet | Verdict |
|---|--------|-----------|---------|---------|
| 1 | Registered default = 1 | sv_main.c:146 | `cvar_t sv_broadcast_sender_validation_enabled = {"sv_broadcast_sender_validation_enabled", "1"};` | MATCH |
| 2 | Cvar is registered | sv_main.c:3447 | `Cvar_Register (&sv_broadcast_sender_validation_enabled);` | MATCH |
| 3 | Polarity: when ON (1, truthy) -> validation runs | sv_broadcast.c:537 | `if (sv_broadcast_sender_validation_enabled.value)` | MATCH |
| 4 | Source address checked against known server list | sv_broadcast.c:547-554 | `for (i=0;i<server_list_count;i++){ if (NET_CompareBaseAdr(net_from, server_list[i])){ valid=true; break; } }` | MATCH |
| 5 | "match a server learned from master server(s)" -- server_list populated only by master query | sv_broadcast.c:200-216 | `for (i=0;i<MAX_MASTERS;i++){ ... SV_BroadcastQueryMaster(sock,&master_adr[i],servers,&server_count); } ... server_list_count=server_count; memcpy(server_list, servers, ...);` (fn `SV_BroadcastQueryMasters`) | MATCH |
| 6 | Broadcasts from any other address are rejected | sv_broadcast.c:558-563 | `if (!valid){ Con_Printf("Rejected broadcast from address: %s ...", addr, payload); return; }` | MATCH |
| 7 | OFF-state: validation skipped, accepted from any address | sv_broadcast.c:537-564 | entire `if(...validation...)` block guarded; when `.value`==0 it is skipped, flow proceeds to payload parse | MATCH |
| 8 | "(subject to rate limiting)" -- rate limit applies regardless of cvar | sv_broadcast.c:527-530 | `if (SVC_BroadcastIsRateLimited(&net_from)){ return; }` runs BEFORE the validation gate | MATCH |
| 9 | "Only has effect while broadcasting is enabled" | sv_broadcast.c:522 | `if (!sv_broadcast_enabled.value || Cmd_Argc() < 1){ return; }` -- early return precedes validation gate | MATCH |
| 10 | Address comparison is by base address (IP, port-agnostic) -> "source address matches a server" | net.c:268-270 | `if (a.ip[0]==b.ip[0] && ... a.ip[3]==b.ip[3]) return true;` (no port compare) | MATCH (supports framing) |
| 11 | These are incoming cross-server broadcast packets | sv_main.c:1962-1963 | `else if (!strcmp(c,"broadcast")) SVC_Broadcast ();` -- connectionless packet dispatch | MATCH |
| 12 | See also sv_broadcast_enabled (real sibling) | sv_main.c:145 | `cvar_t sv_broadcast_enabled = {"sv_broadcast_enabled", "1", 0, SV_BroadcastEnabledOnChange};` | MATCH |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. Single enforcing read-site (sv_broadcast.c:537, inside SVC_Broadcast). Every material clause traced to a verified enforcing line; no flavour-C inference detected.

POLARITY (sharpened re-check, exact quote): sv_broadcast.c:537 `if (sv_broadcast_sender_validation_enabled.value)`. Value 1 (truthy) ENTERS the validation block (lines 539-564) which rejects unknown senders -> "1 = accept only from known list" is correct. Value 0 SKIPS the block entirely -> "0 = accept from any address" is correct. Polarity in the proposed text is right.

DEFAULT (exact quote): sv_main.c:146 registers literal "1". Default 1 is correct -- a registered default, not a shipped-cfg drift value (WI-2 clean).

The two scope qualifiers are both genuinely enforced, not name-inferred:
- "(subject to rate limiting)" -- SVC_BroadcastIsRateLimited runs at line 527, BEFORE the validation gate, so it applies in BOTH cvar states. The parenthetical placement (attached to the OFF-state sentence) is accurate: rate-limiting still bites when validation is off.
- "Only has effect while broadcasting is enabled" -- line 522 early-returns on !sv_broadcast_enabled.value before the validation cvar is ever read. Correct.

server_list provenance ("learned from its master server(s)") traced to SV_BroadcastQueryMasters (sv_broadcast.c:165-218): the array is written ONLY there, sourced by querying each configured master in master_adr[]. The manual command SV_BroadcastUpdateServerList_f (line 80) also feeds this same master-query path, so "from master server(s)" remains the ultimate source -- no contradiction.

NET_CompareBaseAdr (net.c:259-271) compares only the 4 IP octets, ignoring port. The description's "source address matches a server" framing is consistent with a base-IP comparison; it does not over-claim a full ip:port match.

Minor (non-defect) observations, no reclassification: (a) the proposed "Set by: server config" is generic but accurate -- plain server cvar, no flags, settable via config/console. (b) Description does not mention the manual refresh command, but that is out-of-scope for this cvar's doc and not a contradiction.

## flags_for_review

- [fyi/other/vpass] SVC_Broadcast's sender-validation loop holds server_list_lock and iterates server_list_count entries on every accepted inbound 'broadcast' connectionless packet (sv_broadcast.c:541-556). With validation enabled but an empty/zero server_list (e.g., master sync never completed), every broadcast is rejected at line 558. This is correct fail-closed behavior, not a bug -- noting only because the proposed description's OFF-state vs ON-state contrast is the operationally meaningful distinction an admin must understand (ON + no master sync = all cross-server broadcasts silently rejected with a console line). FYI only; the description's text is not wrong.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_broadcast_sender_validation_enabled",
  "type": "cvar",
  "description": "Controls whether incoming cross-server broadcast messages are checked against the known server list before being accepted. When on, a broadcast packet is only accepted if its source address matches a server this server learned about from its master server(s); broadcasts from any other address are rejected. When off, broadcasts are accepted from any address (subject to rate limiting). This only has an effect while broadcasting is enabled.\n\n0 = accept broadcasts from any address.\n1 = accept only from addresses in the known server list.\n\nDefault: 1.\nSet by: server config.\nSee also: sv_broadcast_enabled.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_broadcast.c:537. Polarity/default: registered cvar_t literal `{\"sv_broadcast_sender_validation_enabled\", \"1\"}` at src/sv_main.c:146 -> default 1, no flags. Sole read/enforce site is SVC_Broadcast at src/sv_broadcast.c:537 `if (sv_broadcast_sender_validation_enabled.value)` so non-zero=validation on, 0=off. ON behavior (src/sv_broadcast.c:539-563): sets valid=false, takes server_list_lock, loops the server_list[] comparing the incoming `net_from` to each entry with `NET_CompareBaseAdr(net_from, server_list[i])` (base address, i.e. IP, ignoring port), and on no match logs `\"Rejected broadcast from address: %s (payload: %s)\"` and returns -- so an unrecognized sender's broadcast is dropped. The server_list[] it validates against is populated only from the master-server query path (SV_BroadcastQueryMasters, src/sv_broadcast.c:165-229, fed by master_adr[]) -- hence 'addresses received from the master server' (confirmed by the in-code comment at src/sv_broadcast.c:535-536 'ensure that the sender's address exists in the list of addresses received from the master server'). OFF behavior: the whole validation block is skipped, so the handler proceeds to parse/display the broadcast without any source-address check. Dependency clause 'only has an effect while broadcasting is enabled': this read is reached only after the `if (!sv_broadcast_enabled.value || Cmd_Argc() < 1) return;` guard at src/sv_broadcast.c:522 inside the same SVC_Broadcast function, so with sv_broadcast_enabled=0 the validation cvar is never consulted -- action-relevant, kept as a compact clause per D20. Rate-limiting clause ('subject to rate limiting'): src/sv_broadcast.c:527 `if (SVC_BroadcastIsRateLimited(&net_from)) return;` runs BEFORE the validation block regardless of this cvar, so it always applies; stated parenthetically so an admin does not read 'accept from any address' as 'unbounded'. F-MV1: grep of ktx/src finds NO override of this cvar (no KTX broadcast cvar/command). Set-by: server config / rcon (registered no CVAR_SERVERINFO flag). Not suspect-pool (suspect_pool_member=FALSE); live via the enforcing read at src/sv_broadcast.c:537.",
  "description_proposed": null
}
```
