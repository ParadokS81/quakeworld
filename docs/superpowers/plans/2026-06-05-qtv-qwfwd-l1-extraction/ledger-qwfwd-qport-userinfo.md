# Ledger -- qwfwd `qport:userinfo` (info_key)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Use-sites:** read src/svc.c:232 | ops [read]
**Verdict:** synthesized | **Class:** TRACED-CLEAN

SR-7: arrived carrying an adapter placeholder shaped `userinfo info key: qport;
ops [read]`. Stub IGNORED; synthesized fresh from the read use-site. End-state
origin = `synthesized` (NOT affirmed).

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Proxy reads `qport` from the client's userinfo as the client's connection port id | src/svc.c:232 | `qport = atoi( Info_ValueForKey(userinfo, "qport", prx, sizeof(prx)) );` | MATCH -- value parsed into local qport |
| This userinfo read is the Q3 path only; QW reads qport positionally | src/svc.c:211 | `qport = atoi( Cmd_Argv( 2 ) );` (the pr_qw branch) | MATCH -- QW uses Cmd_Argv(2); the userinfo key is the non-QW (Q3) branch at :232 |
| Read-only -- the proxy never writes/injects `qport` | (WI-1 grep) src/*.c | only use-site of `"qport"` is the src/svc.c:232 read; no write | MATCH -- ops=[read] confirmed |
| The qport is stored on the peer | src/peer.c:73 | `p->qport = qport;` (FWD_peer_new called with qport, src/svc.c:295) | MATCH -- carried onto the connection |
| The stored qport is re-used in the proxy's outbound connect to the destination server | src/clc.c:17 | `snprintf(data,...,"connect %i %i %i ...", QW_PROTOCOL_VERSION, p->qport, p->challenge, ...)` | MATCH -- relayed onward as the connect's qport field |

## Notes
- The QW connection protocol uses a "qport" -- a per-client port identifier the engine
  sends in the connect request so the server can track the client across address/NAT
  changes. The proxy reads it (Q3 path, src/svc.c:232), stores it on the peer
  (src/peer.c:73), and forwards it in its own outbound connect to the destination
  (src/clc.c:17). Described as the user-observable "the proxy reads it and passes it
  along," not the engine-internal NAT-tracking rationale (that is WHY, omitted per D5
  clause 1 / D20).
- The userinfo read is the Q3 branch; on the QW path qport is the second positional
  connect argument (src/svc.c:211). Scope clause traced.
- D20 hard split: no file:line / `Info_ValueForKey` / `p->qport` jargon in the
  `description`.
- "Default:" omitted -- a per-connection port id has no meaningful registered default.
- Set by: the connecting client (its own userinfo / connect request).
- No suspect-pool membership (suspect_pool_member=FALSE); confirmed-live L1 entity.

```json
{
  "project": "qwfwd",
  "knob": "qport:userinfo",
  "type": "info_key",
  "description": "The client's QuakeWorld connection port number -- the per-client identifier the game sends so the connection can be tracked even if the client's address changes. On a Q3-protocol connection the proxy reads this key from the client's userinfo (it only reads it, never changes it), keeps it for that connection, and passes it along in its own connect request to the destination server. (On the standard QuakeWorld protocol this number is part of the connect request rather than userinfo.)\n\nSet by: the connecting client.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "SR-7: row arrived as adapter placeholder 'userinfo info key: qport; ops [read]'; stub IGNORED, synthesized fresh from use-site; end-state origin=synthesized (converted from source_inline placeholder per SR-7). suspect_pool_member=FALSE. WI-1 grep of src/ for \"qport\": sole use-site is src/svc.c:232 qport=atoi(Info_ValueForKey(userinfo,\"qport\",...)). SCOPE: src/svc.c:232 is the proto!=pr_qw (Q3) else-branch; the pr_qw branch (src/svc.c:211) reads qport from Cmd_Argv(2), so the userinfo key is Q3-only. FLOW: the parsed qport is passed to FWD_peer_new (src/svc.c:295) and stored at src/peer.c:73 p->qport=qport, then re-emitted in the outbound connect CL_SendConnectPacket_QW (src/clc.c:17 'connect %i %i %i ...' with p->qport). POLARITY/ops: no write on \"qport\" in src/ -> read-only, ops=[read]. The NAT/address-change tracking purpose is the standard QW qport semantics (WHY), stated only as the user-observable 'tracked even if the client's address changes'; the engine rationale is omitted per D5 clause1/D20. D20: file:line, Info_ValueForKey, p->qport kept out of description. 'Default:' omitted (per-connection id). Set-by: the connecting client.",
  "description_proposed": null
}
```
