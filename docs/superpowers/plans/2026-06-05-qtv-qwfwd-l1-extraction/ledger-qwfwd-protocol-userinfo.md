# Ledger -- qwfwd `protocol:userinfo` (info_key)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Use-sites:** read src/svc.c:228 | ops [read]
**Verdict:** synthesized | **Class:** TRACED-CLEAN

SR-7: arrived carrying an adapter placeholder shaped `userinfo info key: protocol;
ops [read]`. Stub IGNORED; synthesized fresh from the read use-site. End-state
origin = `synthesized` (NOT affirmed).

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Proxy reads `protocol` from the client's userinfo as the client's protocol version | src/svc.c:228 | `if ( !CheckProtocol( atoi( Info_ValueForKey(userinfo, "protocol", prx, sizeof(prx)) ), proto ) ) return;` | MATCH -- value parsed, passed to CheckProtocol |
| This userinfo read is the Q3 path only; QW reads the protocol version positionally | src/svc.c:207 | `if ( !CheckProtocol( atoi( Cmd_Argv( 1 ) ), proto ) )` (the pr_qw branch) | MATCH -- QW uses Cmd_Argv(1); the userinfo key is the non-QW (Q3) branch at :228 |
| Read-only -- the proxy never writes/injects `protocol` | (WI-1 grep) src/*.c | only use-site of `"protocol"` is the src/svc.c:228 read; no write | MATCH -- ops=[read] confirmed |
| On the Q3 path the version check is compiled out (any value passes) | src/svc.c:155-165 | `else { #if 0 // who care which version it is? if (ver != 68) {... return false;} #endif }` | MATCH -- the else (non-qw/Q3) branch's check is `#if 0`; CheckProtocol returns true |
| (Contrast) on the QW path a mismatch is rejected | src/svc.c:146-153 | `if ( proto == pr_qw ) { if (ver != QW_PROTOCOL_VERSION) {...return false;} }` ; QW_PROTOCOL_VERSION=28 (src/qwfwd.h:177) | MATCH -- confirms the version-gate is QW-positional, not via this userinfo key |

## Notes
- The key is read ONLY on the Q3 protocol path (src/svc.c:228, the `else` branch of
  `proto == pr_qw`). On that path `CheckProtocol`'s version comparison is disabled by a
  `#if 0` block (src/svc.c:157-164, comment "who care which version it is?"), so the
  parsed value does not actually gate acceptance -- the function returns true
  regardless. The description states this honestly ("the proxy currently accepts any
  value here") because asserting it enforces a version match would be a flavour-C defect
  (the QW gate at src/svc.c:148 reads the version positionally via Cmd_Argv(1), NOT this
  key). B1: the OFF-state / no-op clause is traced to the `#if 0`, not inferred.
- D20 hard split: no file:line / `CheckProtocol` / `#if 0` / protocol-enum jargon in the
  `description`.
- "Default:" omitted -- a protocol version number has no registered default for a
  userinfo key.
- Set by: the connecting client (its own userinfo).
- No suspect-pool membership (suspect_pool_member=FALSE); confirmed-live L1 entity.

```json
{
  "project": "qwfwd",
  "knob": "protocol:userinfo",
  "type": "info_key",
  "description": "The network protocol version reported by a client connecting over the Q3 protocol. The proxy reads this key from the client's userinfo during the connection handshake; it only reads it and never changes it. In the current build the value is read but not actually enforced, so any value here is accepted. (On the standard QuakeWorld protocol the version is supplied as part of the connect request instead of in userinfo, and there a mismatched version is rejected.)\n\nSet by: the connecting client.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "SR-7: row arrived as adapter placeholder 'userinfo info key: protocol; ops [read]'; stub IGNORED, synthesized fresh from use-site; end-state origin=synthesized (converted from source_inline placeholder per SR-7). suspect_pool_member=FALSE. WI-1 grep of src/ for \"protocol\": sole use-site is src/svc.c:228 atoi(Info_ValueForKey(userinfo,\"protocol\",...)) passed to CheckProtocol. SCOPE: src/svc.c:228 is the proto!=pr_qw (Q3) else-branch; the pr_qw branch (src/svc.c:207) reads the version from Cmd_Argv(1), so the userinfo key is Q3-only. OFF-STATE (B1, traced not inferred): CheckProtocol (src/svc.c:144-168) gates only when proto==pr_qw (ver != QW_PROTOCOL_VERSION, =28 per src/qwfwd.h:177); the else/Q3 branch wraps its 'if (ver != 68)' reject in '#if 0 // who care which version it is?' (src/svc.c:157-164), so for the path that reads this userinfo key CheckProtocol returns true regardless of value -> 'read but not actually enforced'. POLARITY/ops: no write on \"protocol\" in src/ -> read-only, ops=[read]. D20: file:line, CheckProtocol, #if 0, protocol enums kept out of description; stated as user-observable. 'Default:' omitted. Set-by: the connecting client's own userinfo.",
  "description_proposed": null
}
```
