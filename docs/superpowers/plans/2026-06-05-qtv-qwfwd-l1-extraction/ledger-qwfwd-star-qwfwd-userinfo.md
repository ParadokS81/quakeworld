# Ledger -- qwfwd `*qwfwd:userinfo` (info_key)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Use-sites:** write src/svc.c:290 | ops [write]
**Verdict:** synthesized | **Class:** TRACED-CLEAN

SR-7: arrived carrying an adapter placeholder shaped `userinfo info key: *qwfwd;
ops [write]`. Stub IGNORED; synthesized fresh from the write use-site. End-state
origin = `synthesized` (NOT affirmed).

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| The proxy WRITES `*qwfwd` into the forwarded client's userinfo | src/svc.c:290 | `Info_SetValueForStarKey(userinfo, "*qwfwd", QWFWD_VERSION_SHORT, sizeof(userinfo));` | MATCH -- the proxy injects the key (write-only) |
| Purpose: so the destination server/proxy can detect the client came via qwfwd | src/svc.c:289 | `// put some identifier in userinfo so server/proxy can detect that client use qwfwd.` | MATCH -- adjacent comment states intent |
| The value is the proxy's short version string | src/svc.c:290 ; src/qwfwd.h:118 | `QWFWD_VERSION_SHORT` ; `#define QWFWD_VERSION_SHORT "1.40-dev" // version, used in userinfo.` | MATCH -- value = "1.40-dev" at this anchor |
| The `*` prefix marks it a server-controlled key a client cannot set itself | src/info.c:195-198 | `if (key[0] == '*') { Sys_Printf("Can't set * keys\n"); return; }` (Info_SetValueForKeyEx); only Info_SetValueForStarKey bypasses this | MATCH -- star keys are write-protected against client setinfo |
| It is injected during the connect, into the userinfo relayed onward | src/svc.c:290-295 | set at :290, then `FWD_peer_new(prx, port, &net_from, userinfo, ...)` at :295 with that userinfo | MATCH -- the stamped userinfo is what the peer/forward carries |

## Notes
- This is the proxy's OWN stamp, not a client-supplied key: write-only from the proxy's
  side. Set by: the proxy (it injects it); the connecting client cannot set it because
  the `*` prefix makes it a server-class key that `setinfo`-style client writes reject
  (src/info.c:195-198). B1: the "client cannot set it" clause is traced to the star-key
  guard, not inferred from the `*` glyph alone.
- The value is the proxy's version (`QWFWD_VERSION_SHORT` = "1.40-dev" at this anchor).
  Stated as the user-observable "its version string" rather than the macro name.
- D20 hard split: no file:line / `Info_SetValueForStarKey` / `QWFWD_VERSION_SHORT` /
  serverinfo-jargon in the `description`; the `*`-key semantics stated as "server-set /
  the client cannot change it."
- "Default:" omitted -- the value is fixed to the proxy version, not a configurable
  default.
- No suspect-pool membership (suspect_pool_member=FALSE); confirmed-live L1 entity.

```json
{
  "project": "qwfwd",
  "knob": "*qwfwd:userinfo",
  "type": "info_key",
  "description": "A stamp the proxy adds to a forwarded client's userinfo so the destination server (or a further proxy) can tell the connection arrived through qwfwd. Its value is the proxy's version string. The proxy sets this itself during the connection; because the key begins with '*' it is server-controlled and a client cannot set or change it.\n\nSet by: the proxy (injected automatically when forwarding a connection).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "SR-7: row arrived as adapter placeholder 'userinfo info key: *qwfwd; ops [write]'; stub IGNORED, synthesized fresh from use-site; end-state origin=synthesized (converted from source_inline placeholder per SR-7). suspect_pool_member=FALSE. WI-1 grep of src/ for '*qwfwd': sole use-site is src/svc.c:290 Info_SetValueForStarKey(userinfo,\"*qwfwd\",QWFWD_VERSION_SHORT,sizeof(userinfo)) in SVC_DirectConnect -- WRITE only, ops=[write]. PURPOSE: adjacent comment src/svc.c:289 'put some identifier in userinfo so server/proxy can detect that client use qwfwd.' VALUE: QWFWD_VERSION_SHORT, defined src/qwfwd.h:118 '#define QWFWD_VERSION_SHORT \"1.40-dev\" // version, used in userinfo.' -> the proxy's version string (matches anchor 1.40-dev). STAR-KEY (B1, traced not inferred from the glyph): the write uses Info_SetValueForStarKey, the only setter that accepts a '*' key; the ordinary client-facing setter Info_SetValueForKeyEx rejects them ('if (key[0]==\\'*\\') { Sys_Printf(\"Can\\'t set * keys\"); return; }', src/info.c:195-198) -> server-controlled, a client cannot set/change it. TIMING: injected at src/svc.c:290 into the userinfo then handed to FWD_peer_new (src/svc.c:295), so it travels with the forwarded connection. D20: file:line, Info_SetValueForStarKey, QWFWD_VERSION_SHORT, serverinfo/star jargon kept out of description; stated as user-observable 'stamp ... version string ... server-controlled, client cannot change it'. 'Default:' omitted (value fixed to proxy version). Set-by: the proxy injects it.",
  "description_proposed": null
}
```
