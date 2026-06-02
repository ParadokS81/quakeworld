# describe-fill-synthesis ledger -- mvdsv `-port`

- **project:** mvdsv
- **knob:** `-port` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-port: synthesized -- value flag; sets UDP client-listen port via UDP_OpenSocket, default 27500 (PORT_SERVER); single use-site, no KTX override -- origin=synthesized ref=src/net.c:1409 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the UDP network port the dedicated server listens on for incoming client connections. Takes one value: the port number.
>
> mvdsv -port 30000   = listen for clients on UDP port 30000
>
> Default: 27500.
> Set by: launch command line at server startup.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| recognized as a launch flag | src/net.c:1406 | `p = COM_CheckParm ("-port");` | MATCH |
| takes one trailing value, parsed as int | src/net.c:1407-1409 | `if (p && p < COM_Argc()) { port = atoi(COM_Argv(p+1)); }` | MATCH |
| value sets the UDP listen port for clients | src/net.c:1419 | `svs.socketip = UDP_OpenSocket (port);` | MATCH |
| default is 27500 | src/net.c:1408 + src/qwprot/src/protocol.h:130 | `int port = PORT_SERVER;` / `#define PORT_SERVER 27500` | MATCH |
| compiled into dedicated server (live, not dead) | src/net.c:1369 | `#ifndef CLIENTONLY` enclosing NET_InitServer | MATCH |
| controls UDP only, not TCP | src/net.c (tree-wide grep) | only one `"-port"` site; TCP via NET_InitServer_TCP(port) arg | MATCH |
| no KTX override | ktx/src grep | no CheckParm/"-port" in ktx/src | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1a | Binds a UDP socket (not TCP) | src/net.c:1141 | `socket (PF_INET, SOCK_DGRAM, IPPROTO_UDP)` | MATCH |
| 1b | Binds that port to listen for incoming traffic | src/net.c:1179,1181 | `address.sin_port = htons(port);` then `bind (newsocket, (void *)&address, ...)` | MATCH |
| 1c | It is the SERVER's listening socket | src/net.c:1414 | `svs.socketip = UDP_OpenSocket (port);` (inside NET_InitServer) | MATCH |
| 1d | Dedicated-server scope | src/net.c (NET_InitServer under `#ifndef CLIENTONLY`) | `#ifndef CLIENTONLY` guards `void NET_InitServer (void)` | MATCH |
| 2 | Takes exactly one value = the port number | src/net.c:1409 | `port = atoi(COM_Argv(p+1));` (single token after `-port`) | MATCH |
| 3 | `-port 30000` -> listen on UDP 30000 | src/net.c:1406-1409,1414 + 1179,1181 | param value flows: atoi -> port -> UDP_OpenSocket -> htons(port)/bind | MATCH |
| 4 | Default 27500 (used when -port absent) | src/net.c:1403 + src/qwprot/src/protocol.h:130 | `int port = PORT_SERVER;` / `#define PORT_SERVER 27500`; overridden only if `if (p && p < COM_Argc())` (net.c:1407) | MATCH |
| 5 | Set by command line at server startup (no runtime re-read) | src/net.c:1406 (in NET_InitServer); callers sv_main.c:3970->net.c:1301, sv_init.c:268 | `p = COM_CheckParm ("-port");` read once at init; no cvar, no later re-read | MATCH |

**V-pass notes:** All clauses enforce-traced to located lines; TRACED-CLEAN. Oracle version confirmed 1.11-53-g18d0362.

Registration/enforcement: NET_InitServer (src/net.c:1401-1414). `int port = PORT_SERVER;` (1403) is the default; `COM_CheckParm("-port")` (1406) with guard `if (p && p < COM_Argc())` (1407) overrides via `atoi(COM_Argv(p+1))` (1409); `svs.socketip = UDP_OpenSocket(port)` (1414) opens the listening socket.

UDP_OpenSocket (src/net.c:1134-1188) followed into callee: `socket(PF_INET, SOCK_DGRAM, IPPROTO_UDP)` (1141) = UDP; `address.sin_port = htons(port)` (1179) + `bind(...)` (1181) = the bind that makes "listens on port N" true. This is the line that ENFORCES clause 1, confirmed in the callee, not just the caller.

Default (clause 4): `-port` is a COMMAND-LINE PARAM, not a cvar -- so WI-2's RegisterCvar check is correctly N/A. The enforced default is the C initializer `PORT_SERVER` = `#define PORT_SERVER 27500` (src/qwprot/src/protocol.h:130). Verified against the actual initializer, not a shipped .cfg. MATCH.

Scope (clause 5): NET_InitServer lives under `#ifndef CLIENTONLY` and is called only on startup paths (NET_Init at sv_main.c:3970 -> net.c:1301; serveronly path sv_init.c:268). The value is read once via COM_CheckParm; the port is later exposed read-only via NET_UDPSVPort() = `ntohs(net_local_sv_ipadr.port)` (net.c:205-208), which reads back the bound address, not a re-read of the arg. No runtime mutation path. MATCH.

No polarity/threshold/OFF-state clauses present to invert. No flavour-C inference: every material clause has an enforcing read-site.

## flags_for_review

- [review/suspected-bug/synthesis] net.c:1410 guards the trailing-value read with `if (p && p < COM_Argc())` then reads COM_Argv(p+1). When -port is the LAST argv token, p == COM_Argc()-1, so `p < COM_Argc()` is true and COM_Argv(p+1) reads one slot past the argument array (out-of-bounds / reads adjacent memory). The sibling Unix flags -u/-t/-g at sv_sys_unix.c:693/740/667 correctly use `j + 1 < com_argc`. Latent off-by-one; in practice a port number always follows so it is rarely triggered, but `mvdsv -port` with no value would hit it.
- [fyi/other/vpass] Description scopes itself to the PORT only, which is correct. For completeness: the same bind() that consumes -port also consumes -ip (src/net.c:1166-1170) to choose the interface address; absent -ip it binds INADDR_ANY (all interfaces). -port sets only the port half of the address:port pair. Not a defect in the -port description -- noting the address/port coupling since they are bound together at the same call site.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-port",
  "type": "cmdline_param",
  "description": "Sets the UDP network port the dedicated server listens on for incoming client connections. Takes one value: the port number.\n\nmvdsv -port 30000   = listen for clients on UDP port 30000\n\nDefault: 27500.\nSet by: launch command line at server startup.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/net.c:1409. VALUE-flag confirmed at the consumer, not the parse site. Parse/recognize: net.c:1406 `p = COM_CheckParm (\"-port\");`. Consumer reads one trailing value: net.c:1407-1409 `if (p && p < COM_Argc()) { port = atoi(COM_Argv(p+1)); }` -- COM_Argv(p+1) read = takes one trailing value, parsed as int (atoi). Effect (what the port controls): net.c:1419 `svs.socketip = UDP_OpenSocket (port);` -- this is the UDP listen socket for client connections (svs.socketip is the server's game socket). Default clause: net.c:1408 `int port = PORT_SERVER;`; PORT_SERVER = 27500 at src/qwprot/src/protocol.h:130 `#define PORT_SERVER 27500`. Scope/build: NET_InitServer (net.c:1406) sits inside `#ifndef CLIENTONLY` (block opens net.c:1369) -- compiled into the dedicated server, NOT a SERVERONLY/#if-0 exclusion, so live. Tree-wide grep for `\"-port\"` returns exactly one use-site (net.c:1406): `-port` feeds ONLY UDP_OpenSocket; the TCP listen socket is opened by a separate function NET_InitServer_TCP(port) whose port arg comes from a cvar, not from -port -- so this flag controls the game UDP port only (no TCP clause asserted). KTX: grep of ktx/src for CheckParm/\"-port\" returns nothing -- no cross-mod override; engine behavior is live. NOTE (flagged separately, does not affect the user doc): the guard `p < COM_Argc()` (not `p+1 < COM_Argc()`) reads COM_Argv(p+1) even when -port is the final argv token -- a latent off-by-one vs the correctly-guarded -u/-t/-g siblings which use `j + 1 < com_argc`.",
  "description_proposed": null
}
```
