# Ledger -- qwfwd `name:userinfo` (info_key)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction | **Phase:** 3 describe-fill
**Project:** qwfwd | **Anchor:** 1.40-dev
**Use-sites:** read src/peer.c:76 | ops [read]
**Verdict:** synthesized | **Class:** TRACED-CLEAN

SR-7: arrived carrying an adapter placeholder shaped `userinfo info key: name;
ops [read]`. Stub IGNORED; synthesized fresh from the read use-site. End-state
origin = `synthesized` (NOT affirmed).

## Enforce-trace (per-clause)

| Clause | Enforcing file:line | Snippet | Result |
|---|---|---|---|
| Proxy reads the connecting client's display name out of its userinfo | src/peer.c:76 | `Info_ValueForKey(userinfo, "name", p->name, sizeof(p->name));` | MATCH -- value copied into the peer's name field |
| The value is the player display name extracted from userinfo | src/qwfwd.h:151 | `char name[MAX_INFO_KEY]; // name, extracted from userinfo` | MATCH -- field comment confirms semantics |
| The proxy only reads it (never writes/injects `name`) | (WI-1 grep) src/*.c | only use-site of `"name"` is the src/peer.c:76 read; no Info_SetValueForKey on "name" | MATCH -- read-only, ops=[read] confirmed |
| Stored name is shown in the proxy's status/player listing | src/svc.c:373 ; src/svc.c:378 | `name = cl->name;` ... `snprintf(tmp,...,"%i %s %i %i \"%s\" \"%s\" %i %i\n", cl->userid, frags, connect_t, ping, name, ...)` | MATCH -- the only consumer of p->name |

## Notes
- Pure read. WI-1 confirms the single `"name"` use-site is the extraction at
  src/peer.c:76; the proxy never sets or rewrites this key, so the description says
  "reads ... does not change it" (the polarity clause is traced, not name-inferred).
- The downstream consumer (the `status` response player list, src/svc.c:373-378) makes
  the user-observable purpose concrete: the name is what appears in a server-browser /
  qstat-style listing of who is connected through the proxy. Stated as the
  admin-observable effect, not the code path.
- D20 hard split: no file:line / `Info_ValueForKey` / `p->name` jargon in the
  `description`.
- "Default:" omitted -- a free-text player name has no meaningful registered default.
- Set by: the connecting client (its own userinfo).
- No suspect-pool membership (suspect_pool_member=FALSE); confirmed-live L1 entity.

```json
{
  "project": "qwfwd",
  "knob": "name:userinfo",
  "type": "info_key",
  "description": "The display name of the player connecting through the proxy. The proxy reads this from the connecting client's userinfo and remembers it for that connection; it does not change it. The remembered name is what shows up for that client in the proxy's status / player listing (the same place a server browser reads who is connected).\n\nSet by: the connecting client.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "SR-7: row arrived as adapter placeholder 'userinfo info key: name; ops [read]'; stub IGNORED, synthesized fresh from use-site; end-state origin=synthesized (converted from source_inline placeholder per SR-7). suspect_pool_member=FALSE. WI-1 grep of src/ for \"name\" as an info key: sole use-site is src/peer.c:76 Info_ValueForKey(userinfo,\"name\",p->name,sizeof(p->name)) inside FWD_peer_new -- the proxy copies the connecting client's name out of userinfo into the peer struct. Field semantics confirmed at src/qwfwd.h:151: char name[MAX_INFO_KEY]; '// name, extracted from userinfo'. POLARITY/ops: no Info_SetValueForKey / write on \"name\" anywhere in src/ -> read-only, ops=[read]; description says 'reads ... does not change it' (traced, not inferred). Consumer of the stored value: SVC_Status (src/svc.c:373 name=cl->name; src/svc.c:378 emits it in the per-player status line '%i %s %i %i \"%s\" ...'), i.e. the qstat/server-browser-visible player listing -- hence 'shows up ... in the proxy's status / player listing'. D20: file:line, Info_ValueForKey, p->name kept out of description; stated as user-observable. 'Default:' omitted (free-text player name). Set-by: the connecting client supplies it in its own userinfo.",
  "description_proposed": null
}
```
