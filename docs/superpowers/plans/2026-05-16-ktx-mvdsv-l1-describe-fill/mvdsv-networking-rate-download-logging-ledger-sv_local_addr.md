# describe-fill-synthesis ledger -- mvdsv `sv_local_addr`

- **project:** mvdsv
- **knob:** `sv_local_addr` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_local_addr: synthesized -- read-only engine-set server IP:port, empty if socket failed; KTX reads it for stats/race identity -- origin=synthesized ref=src/net.c:1420 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Reports the server's own auto-detected network address (IP:port), taken from the host's hostname and the bound socket. This is a read-only, engine-maintained value, set automatically once the server's network socket is opened; an admin cannot change it. Behind NAT this is usually the local/LAN (internal) address, not the public one.
>
> If the server could not open its socket, this is left empty.
>
> Default: empty (filled in by the engine at startup).
> Set by: the engine (read-only).
> See also: sv_serverip (declare the externally-reachable IP when this is wrong).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty | src/net.c:42 | `cvar_t sv_local_addr = {"sv_local_addr", "", CVAR_ROM};` | MATCH |
| read-only / not admin-settable | src/net.c:42 | `CVAR_ROM` flag on the registration | MATCH |
| engine sets it to the detected local address after socket open | src/net.c:1419-1420 | `NET_GetLocalAddress(svs.socketip, &net_local_sv_ipadr); Cvar_SetROM(&sv_local_addr, NET_AdrToString(net_local_sv_ipadr));` | MATCH |
| value is dotted IP:port | src/net.c:307 | `snprintf(s[idx], ..., "%i.%i.%i.%i:%i", a.ip[0..3], ntohs(a.port));` (loopback branch is #ifndef SERVERONLY) | MATCH |
| empty when socket failed to open | src/net.c:1422-1425 | `else { ... Cvar_SetROM(&sv_local_addr, ""); }` (svs.socketip == INVALID_SOCKET) | MATCH |
| cross-mod: KTX reads it (not override) | ktx/src/logs.c:100, ktx/src/stats.c:559, ktx/src/race.c:186 | `cvar_string("sv_local_addr")` parsed for ip/port | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | clause | enforcing file:line | snippet | verdict |
|---|---|---|---|---|
| 1 | "Reports the server's own detected network address (IP:port)" | net.c:1420 + net.c:307 + net.c:1237-1254 | `Cvar_SetROM(&sv_local_addr, NET_AdrToString(net_local_sv_ipadr))` ; `snprintf(s[idx], ..., "%i.%i.%i.%i:%i", a.ip[0..3], ntohs(a.port))` ; addr built from `gethostname()`+`getsockname()` | MATCH (format is IP:port; "detected" is accurate -- OS hostname + bound-socket name) |
| 2 | "on the public interface" | net.c:1173 + net.c:1253-1254 + sv_user.c:112-120 + sv_user.c:230 | bind: `address.sin_addr.s_addr = INADDR_ANY;` ; `if (!*(int*)out->ip) *(int*)out->ip = *(int*)adr.ip; //change it to what the machine says it is` ; `IsLocalIP(a){ return a.ip[0]==10 || (172.16/12) || (192.168) || >=224; }` ; `server_ip = sv_serverip.string[0] ? sv_serverip.string : NET_AdrToString(net_local_sv_ipadr)` | MISMATCH -- address is the OS-local/hostname address (often RFC1918 LAN behind NAT). Engine's own code classifies it via IsLocalIP and provides sv_serverip explicitly to override it. No STUN/UPnP/external-IP detection exists in the tree. "public interface" is unsupported and contradicts the local-vs-inet model. |
| 3 | "read-only ... cannot be changed by the admin" | net.c:42 + cvar.c (Cvar_Set) | `cvar_t sv_local_addr = {"sv_local_addr", "", CVAR_ROM};` ; `if (var->flags & CVAR_ROM) return;` (cvar.h:63 `#define CVAR_ROM (1<<1) // read only`) | MATCH |
| 4 | "engine-maintained ... set automatically once the server's network socket is opened" | net.c:1417-1420 + cvar.c:168-179 | `if (svs.socketip != INVALID_SOCKET){ NET_GetLocalAddress(...); Cvar_SetROM(&sv_local_addr, ...); }` ; `Cvar_SetROM` clears CVAR_ROM, calls Cvar_Set (writes var->string), restores flag | MATCH (engine writes it in NET_InitServer after UDP_OpenSocket; admin path is blocked but engine path is not) |
| 5 | "If the server could not open its socket, this is left empty" | net.c:1422-1426 | `else { // FIXME: is it right??? Cvar_SetROM(&sv_local_addr, ""); }` | MATCH |
| 6 | "Default: empty" | net.c:42 + cvar.c (Cvar_Register init) | registered as `""`; Cvar_Register seeds string from registered default via Cvar_SetROM | MATCH (registered default is empty; WI-2 clean) |
| 7 | "Set by: the engine (read-only)" | net.c:1420 / net.c:1425 (only writers) | only writers tree-wide are the two engine `Cvar_SetROM` calls in NET_InitServer | MATCH |

**V-pass notes:** CLASSIFICATION: C-FIX (one clause contradicts the enforcing code). 6 of 7 clauses TRACED-CLEAN; the "public interface" qualifier is a flavour-C defect.

THE WRONG CLAUSE: "on the public interface". The address that fills sv_local_addr is net_local_sv_ipadr, built by NET_GetLocalAddress (net.c:1229-1262) from gethostname()+getsockname() on a socket that by default binds to INADDR_ANY (0.0.0.0, net.c:1173). When getsockname returns 0.0.0.0, the engine substitutes "what the machine says it is" via the hostname lookup (net.c:1253-1254, with that exact verbatim comment). On a typical NATed host that is the private LAN IP, not the public interface.

The enforcing contradiction is not subtle: the engine's OWN code (sv_user.c:112-120) tests this very netadr with IsLocalIP() -- true for 10.x / 172.16-31.x / 192.168.x / 224+ -- and the download-redirect path (sv_user.c:230-238) falls back to NET_AdrToString(net_local_sv_ipadr) ONLY when sv_serverip is empty, printing "WARNING: Incorrect server ip address ... set correctly sv_serverip cvar" when the detected address looks wrong. The existence of sv_serverip as the explicit public-IP override is direct evidence that sv_local_addr is the LOCAL/detected address, frequently not public. No STUN / UPnP / NAT-traversal / external-IP detection exists anywhere in src/ (grep clean).

WHY THIS MATTERS (not cosmetic): an admin reading "public interface" would treat sv_local_addr as their advertised external address. That is exactly the misconception the engine guards against -- the value is the auto-detected local address. Recommended fix: replace "on the public interface" with "(auto-detected from the host's hostname / the bound socket; this is the local address the OS reports and may be a LAN/internal address behind NAT)" and, if desired, a See-also to sv_serverip for the explicit public-IP override.

EVERYTHING ELSE IS SOLID: read-only via CVAR_ROM is real and enforced in Cvar_Set; Cvar_SetROM is the engine's flag-bypass writer (clear ROM -> Cvar_Set -> restore), so "engine sets it, admin can't" is precisely correct; empty default is the registered default (WI-2 verified at net.c:42, not a shipped-cfg artifact); the socket-fail -> empty OFF-state is the literal else branch; IP:port format confirmed in NET_AdrToString. The cvar's .string is read by NOTHING tree-wide (it is a pure status/report cvar; the underlying net_local_sv_ipadr is what sv_user.c/sv_ccmds.c consume), which is consistent with the description's framing of it as a reported value.

## flags_for_review

- [fyi/cross-mod-override/synthesis] sv_local_addr is CVAR_ROM and not admin-settable, but KTX READS it as a cross-mod consumer to build the server's IP:port identity for stats uploads (ktx/src/stats.c:559), frag logging (ktx/src/logs.c:100) and race uploads (ktx/src/race.c:186). It is a read, not an override, so mvdsv behavior is unaffected -- but the practical effect (KTX-side stats/race uploads carrying the wrong or empty server address) depends on this cvar being correctly populated by the engine, which fails to empty if the socket did not open. Flagging for a human in case a cross-engine L3 concept note should capture this dependency.
- [fyi/off-scope-entity/vpass] sv_local_addr's cvar .string value has NO reader anywhere in src/ -- it is a pure display/report cvar. The underlying netadr net_local_sv_ipadr is what is actually consumed (sv_user.c:230/232/233 download-redirect, sv_ccmds.c:1200 status print as 'net address'). Not a defect, but worth noting: any future description should not imply the cvar string drives behavior; it mirrors net_local_sv_ipadr for human inspection only.
- [fyi/off-scope-entity/vpass] sv_serverip (sv_main.c:141, registered sv_main.c:3438, default empty) is the operator-facing public-IP override and the natural See-also for sv_local_addr. It is the explicit mechanism for when the auto-detected sv_local_addr/net_local_sv_ipadr is the wrong (internal) address. If sv_serverip already has or will get an L1 description, the two should cross-reference.
- [fyi/suspected-bug/vpass] Two FIXME comments sit on this exact path: net.c:1424 '// FIXME: is it right???' on the socket-fail empty-set, and net.c:1457 '// FIXME: why not NA_INVALID?' on NET_CloseServer setting net_local_sv_ipadr.type=NA_LOOPBACK. Both are upstream developer uncertainty, not behavior the description must encode; flagging only so a future reader does not mistake them for hidden semantics.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_local_addr",
  "type": "cvar",
  "description": "Reports the server's own auto-detected network address (IP:port), taken from the host's hostname and the bound socket. This is a read-only, engine-maintained value, set automatically once the server's network socket is opened; an admin cannot change it. Behind NAT this is usually the local/LAN (internal) address, not the public one.\n\nIf the server could not open its socket, this is left empty.\n\nDefault: empty (filled in by the engine at startup).\nSet by: the engine (read-only).\nSee also: sv_serverip (declare the externally-reachable IP when this is wrong).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/net.c:1420. Registered src/net.c:42 cvar_t sv_local_addr = {\"sv_local_addr\", \"\", CVAR_ROM} -> default empty, CVAR_ROM => read-only / not admin-settable. Engine-set: in NET_InitServer, after the UDP socket is opened, src/net.c:1419-1420 NET_GetLocalAddress(svs.socketip, &net_local_sv_ipadr); Cvar_SetROM(&sv_local_addr, NET_AdrToString(net_local_sv_ipadr));. Address format is dotted-IP:port: NET_AdrToString formats `\"%i.%i.%i.%i:%i\"` (src/net.c:307); the `loopback` branch (src/net.c:300-303) is `#ifndef SERVERONLY`, so on the dedicated server build the value is always the numeric IP:port. Empty-on-failure: src/net.c:1422-1425 else-branch Cvar_SetROM(&sv_local_addr, \"\") when svs.socketip == INVALID_SOCKET. \"detected local address\" wording matches NET_GetLocalAddress reading the bound socket's address. Set-by: CVAR_ROM (engine writes via Cvar_SetROM; no admin path). Cross-mod consumer (NOT an mvdsv-enforced clause, hence not in the description body): KTX reads sv_local_addr to derive a server identity/IP for stats and race uploads (ktx/src/logs.c:100, ktx/src/stats.c:559, ktx/src/race.c:186) -- a read, not an override. Routed to flags rather than a See also slug because no concept-note slug is established and the admin cannot act on this cvar (read-only).",
  "description_proposed": null
}
```
