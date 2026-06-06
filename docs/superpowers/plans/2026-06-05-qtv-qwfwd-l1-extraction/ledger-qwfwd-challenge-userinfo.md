# Ledger -- qwfwd `challenge:userinfo` (info_key)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Use-sites:** write src/clc.c:116 | read src/svc.c:235 | ops [read,write]
**Verdict:** synthesized | **Class:** TRACED-CLEAN

SR-7: arrived carrying an adapter placeholder shaped `userinfo info key: challenge;
ops [read,write]`. Stub IGNORED; synthesized fresh from the read/write use-sites.
End-state origin = `synthesized` (NOT affirmed).

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| The challenge is the anti-spoof token from the getchallenge step | src/svc.c:96 ; src/svc.c:14-16 | `challenges[i].challenge = (rand() << 16) ^ rand();` ; header "prevent denial of service attacks ... must give a valid IP address" | MATCH -- per-address random token issued by SVC_GetChallenge |
| Inbound (Q3): proxy reads `challenge` from the client's userinfo to validate the connect | src/svc.c:235 | `if ( !CheckChallenge( atoi( Info_ValueForKey(userinfo, "challenge", prx, sizeof(prx)) ) ) ) return;` | MATCH -- value parsed, fed to CheckChallenge |
| CheckChallenge rejects the connect if the value does not match the stored token | src/svc.c:61-65 | `if (challenge != challenges[i].challenge) { ...Bad challenge.\n... return false; }` | MATCH -- mismatch aborts |
| This userinfo read is the Q3 path only; QW passes the challenge positionally, not in userinfo | src/svc.c:204-214 | `if ( proto == pr_qw ) { ... if ( !CheckChallenge( atoi( Cmd_Argv( 3 ) ) ) ) ... }` (the else-branch at :228-235 is Q3) | MATCH -- QW uses Cmd_Argv(3); userinfo key is the non-QW branch |
| Outbound (Q3): proxy injects the destination server's challenge into the forwarded userinfo | src/clc.c:116 | `Info_SetValueForKey(biguserinfo, "challenge", tmp, sizeof(biguserinfo));` (tmp = `p->challenge`, src/clc.c:115) | MATCH -- writes challenge into the userinfo it relays onward |
| The injected value is the challenge the destination Q3 server returned | src/clc.c:157 ; src/clc.c:165 | `p->challenge = atoi(Cmd_Argv(1));` on "challengeResponse" -> then CL_SendConnectPacket_Q3 | MATCH -- server-issued, stored, re-emitted |
| Outbound QW writes the challenge positionally, not as a userinfo key | src/clc.c:17 | `snprintf(data,...,"connect %i %i %i \"%s\"\n", QW_PROTOCOL_VERSION, p->qport, p->challenge, biguserinfo);` | MATCH -- confirms the key is Q3-specific |

## Notes
- ops are genuinely [read,write], but BOTH operations live on the Q3 protocol path:
  the proxy READS it inbound from a connecting Q3 client (src/svc.c:235) and WRITES it
  outbound into the userinfo it forwards to the destination Q3 server (src/clc.c:116).
  On the QW path the challenge is carried as a positional connect argument, not in
  userinfo. The description states "during a Q3 connection" so the read-vs-write
  framing is honest about scope (B1 -- the polarity/scope clause is traced, not
  inferred from the key name).
- D20 hard split: no file:line, no `CheckChallenge` / `Info_SetValueForKey` / protocol
  enum jargon in the `description`; stated as the user-observable "the proxy checks it /
  the proxy adds it". The trace lives here / in reasoning.
- "Default:" omitted -- a per-connection token has no meaningful registered default.
- Set by: the destination server issues it; on the way in the connecting client echoes
  it back (standard QW challenge handshake).
- No suspect-pool membership (suspect_pool_member=FALSE); confirmed-live L1 entity.

```json
{
  "project": "qwfwd",
  "knob": "challenge:userinfo",
  "type": "info_key",
  "description": "A one-time token used during a Q3-protocol connection to prove the connecting client is at a real address (it is handed out in an earlier getchallenge step). On the way in, the proxy reads this key from the client's userinfo and refuses the connection if the token does not match the one it issued for that address. On the way out, the proxy puts the destination server's own token into the userinfo it forwards, so the onward connection is accepted. On the standard QuakeWorld protocol the token is carried as part of the connect request rather than in userinfo, so this key is used only for Q3-protocol connections.\n\nSet by: issued by the server and echoed back by the connecting client.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "SR-7: row arrived as adapter placeholder 'userinfo info key: challenge; ops [read,write]'; stub IGNORED, synthesized fresh from use-sites; end-state origin=synthesized (converted from source_inline placeholder per SR-7). suspect_pool_member=FALSE. WI-1 grep of src/ for the string \"challenge\": write at src/clc.c:116, read at src/svc.c:235. The token's origin is SVC_GetChallenge: src/svc.c:96 challenges[i].challenge=(rand()<<16)^rand(), per-address, header src/svc.c:14-16 states the DoS/IP-spoof purpose. INBOUND read (src/svc.c:235): atoi(Info_ValueForKey(userinfo,\"challenge\",...)) fed to CheckChallenge; CheckChallenge (src/svc.c:61-65) returns false ('Bad challenge') when challenge != challenges[i].challenge, which aborts SVC_DirectConnect. SCOPE: this read is the proto!=pr_qw (Q3) else-branch (src/svc.c:221-237); the pr_qw branch (src/svc.c:204-214) reads the challenge from Cmd_Argv(3), NOT userinfo -- so the userinfo key is Q3-only. OUTBOUND write (src/clc.c:116): CL_SendConnectPacket_Q3 does Info_SetValueForKey(biguserinfo,\"challenge\",tmp,...) where tmp is the destination server's challenge (p->challenge set at src/clc.c:157 from the 'challengeResponse' Cmd_Argv(1), then re-sent); the QW outbound path (src/clc.c:17) instead passes p->challenge positionally in 'connect %i %i %i ...', confirming the key is Q3-specific. D20: file:line, CheckChallenge, Info_SetValueForKey, protocol enums kept out of description and stated as user-observable proxy behavior; the read-vs-write/Q3-scope clause is enforce-traced (not name-inferred). 'Default:' omitted (per-connection token).",
  "description_proposed": null
}
```
