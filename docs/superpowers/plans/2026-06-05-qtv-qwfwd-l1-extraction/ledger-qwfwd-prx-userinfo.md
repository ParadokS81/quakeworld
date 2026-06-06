# Ledger -- qwfwd `prx:userinfo` (info_key)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Use-sites:** read src/svc.c:247 | write src/svc.c:264 | remove src/svc.c:269 | ops [read,remove,write]
**Key macro:** `QWFWD_PRX_KEY "prx"` (src/qwfwd.h:125)
**Verdict:** synthesized | **Class:** TRACED-CLEAN

SR-7: arrived carrying an adapter placeholder shaped `userinfo info key: prx;
ops [read,remove,write]`. Stub IGNORED; synthesized fresh from the use-sites.
End-state origin = `synthesized` (NOT affirmed).

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| `prx` holds the destination the client wants the proxy to forward to | src/svc.c:247 ; src/svc.c:289 | `Info_ValueForKey(userinfo, QWFWD_PRX_KEY, prx, sizeof(prx));` ; comment "so server/proxy can detect that client use qwfwd" + the prx becomes FWD_peer_new's remote_host | MATCH -- prx -> the address the proxy connects out to |
| If `prx` is empty the connection is refused | src/svc.c:248-258 | `if (!prx[0]) { ...QWFWD_PRX_KEY " userinfo key is not set\n"... return; }` | MATCH -- empty prx aborts the connect |
| A `@`-chain: text after the first `@` is written back into `prx` (the next hop), the rest truncated | src/svc.c:262-266 | `if ((at = strchr(prx, '@')) && at[1]) { Info_SetValueForKeyEx(userinfo, QWFWD_PRX_KEY, at+1, sizeof(userinfo), false); at[0] = 0; }` | MATCH -- WRITE op; remaining chain forwarded to the next proxy, current hop truncated |
| Otherwise (no further hop) the `prx` key is removed from the forwarded userinfo | src/svc.c:267-270 | `else { Info_RemoveKey(userinfo, QWFWD_PRX_KEY); }` | MATCH -- REMOVE op so the destination server does not see prx |
| A `host:port` form: the part after `:` sets the destination port | src/svc.c:273-277 | `if ((at = strchr(prx, ':'))) { at[0] = 0; port = atoi(at + 1); }` | MATCH -- explicit port parsed off the prx value |
| With no `:port`, the port defaults to 27500 (QW) or 27960 (Q3) | src/svc.c:278-281 | `else { port = ( proto == pr_qw ) ? 27500 : 27960; }` | MATCH -- protocol-dependent default port |
| An invalid (<1) port aborts the connect | src/svc.c:283-287 | `if (port < 1) { ...port number in " QWFWD_PRX_KEY " userinfo key is invalid\n... return; }` | MATCH -- bad port rejected |
| The resolved host+port is what the proxy opens the onward connection to | src/svc.c:295 ; src/peer.c:41 | `FWD_peer_new(prx, port, &net_from, userinfo, qport, proto, true)` ; `NET_GetSockAddrIn_ByHostAndPort(&to, remote_host, remote_port)` | MATCH -- prx/port become the outbound socket target |

## Notes
- This is the load-bearing routing key: it is how a client tells qwfwd where to send it.
  All three ops are real and traced -- READ (src/svc.c:247), WRITE (src/svc.c:264, the
  chain rewrite to the next hop), REMOVE (src/svc.c:269, stripping it before the userinfo
  reaches the final server).
- The `@` syntax is proxy CHAINING (prx = `proxyB@finalserver` => this proxy forwards to
  proxyB, leaving `finalserver` in prx for proxyB to consume). The `:` syntax is the
  destination port. Both spelled out in the description per D5 clause 3 (units/forms).
- Default port is protocol-dependent (27500 QW / 27960 Q3); stated because an admin
  setting up a forward needs to know when a port is implied. B1: the default-port
  polarity is traced to the ternary, not inferred.
- D20 hard split: no file:line / `Info_RemoveKey` / `FWD_peer_new` / `QWFWD_PRX_KEY`
  jargon in the `description`; the chain/port mechanics stated as user-observable forms.
- "Default:" line omitted at the key level (the meaningful default is the *port*, which
  is stated inline); the key itself is required (empty => rejected).
- Set by: the connecting client (its own userinfo) -- this is the field the client sets
  to choose its destination.
- No suspect-pool membership (suspect_pool_member=FALSE); confirmed-live L1 entity.

```json
{
  "project": "qwfwd",
  "knob": "prx:userinfo",
  "type": "info_key",
  "description": "The destination a client wants to be forwarded to. The connecting client puts the target server here, and the proxy uses it to open the onward connection; if it is empty the connection is refused.\n\nhost = forward to that host (a connection on the default game port).\nhost:port = forward to that host on the given port.\nproxyB@host = chaining: forward to proxyB and hand it 'host' to forward on to next, so a connection can pass through several proxies.\n\nThe default port when none is given is 27500 for the standard QuakeWorld protocol and 27960 for Q3. An invalid port is rejected. When the connection is passed to the final server the proxy removes this key first (or, when chaining, rewrites it to the remaining hops).\n\nSet by: the connecting client.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "SR-7: row arrived as adapter placeholder 'userinfo info key: prx; ops [read,remove,write]'; stub IGNORED, synthesized fresh from use-sites; end-state origin=synthesized (converted from source_inline placeholder per SR-7). suspect_pool_member=FALSE. Key macro QWFWD_PRX_KEY=\"prx\" (src/qwfwd.h:125). WI-1 grep of src/ for QWFWD_PRX_KEY and \"prx\": all use-sites in SVC_DirectConnect (src/svc.c). READ src/svc.c:247 Info_ValueForKey(userinfo,QWFWD_PRX_KEY,prx,...). Empty-guard src/svc.c:248-258: if(!prx[0]) prints 'prx userinfo key is not set' and returns -> required. CHAIN/WRITE src/svc.c:262-266: if((at=strchr(prx,'@')) && at[1]) Info_SetValueForKeyEx(userinfo,QWFWD_PRX_KEY,at+1,...,false) then at[0]=0 -> text after first '@' becomes the next-hop prx in the forwarded userinfo, current hop truncated (proxy chaining). REMOVE src/svc.c:267-270: else Info_RemoveKey(userinfo,QWFWD_PRX_KEY) -> when no further hop the key is stripped before the userinfo reaches the destination server. PORT src/svc.c:273-277: if((at=strchr(prx,':'))){at[0]=0; port=atoi(at+1);} else (src/svc.c:278-281) port = (proto==pr_qw)?27500:27960 -- protocol-dependent default (B1: traced to the ternary, not inferred). src/svc.c:283-287: if(port<1) prints 'port number in prx userinfo key is invalid' and returns. DESTINATION: prx+port passed to FWD_peer_new(prx,port,...) (src/svc.c:295) -> FWD_peer_new resolves via NET_GetSockAddrIn_ByHostAndPort(&to,remote_host,remote_port) (src/peer.c:41) i.e. the outbound socket target. All three ops [read,remove,write] enforce-traced. D20: file:line, Info_RemoveKey, Info_SetValueForKeyEx, FWD_peer_new, QWFWD_PRX_KEY kept out of description; host/host:port/proxyB@host forms and the default ports stated as user-observable. Key-level 'Default:' omitted (key is required; the meaningful default is the port, stated inline). Set-by: the connecting client.",
  "description_proposed": null
}
```
