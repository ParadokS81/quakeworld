# describe-fill-synthesis ledger -- mvdsv `-ip`

- **project:** mvdsv
- **knob:** `-ip` (cmdline_param)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `cmdline-params` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:-ip: synthesized -- value flag; binds UDP (and TCP/QTV) listen sockets to one local IPv4 via inet_addr; absent => INADDR_ANY all-interfaces; shared net.c, both platforms -- origin=synthesized ref=src/net.c:1166 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Binds the server's network sockets to one specific local IP address instead of listening on every network interface. Use it on a multi-homed machine to make the server answer only on the chosen address. When omitted, the server listens on all interfaces.
>
> -ip <address> = bind to the local interface whose IP is <address> (dotted-quad, e.g. 192.168.1.50).
>
> Default: not set (listens on all interfaces).
> Set by: command line at server launch only.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| takes one trailing value (value flag) | src/net.c:1166-1168 | `if ((i = COM_CheckParm("-ip")) != 0 && i < COM_Argc()) { address.sin_addr.s_addr = inet_addr(COM_Argv(i+1));` | MATCH |
| value is a dotted-quad IPv4 string | src/net.c:1168 | `inet_addr(COM_Argv(i+1))` | MATCH |
| binds chosen interface (UDP game socket) | src/net.c:1181 | `if (bind (newsocket, (void *)&address, sizeof(address)) == -1)` (consumes address.sin_addr set above) | MATCH |
| same option also binds the TCP/QTV listen socket | src/net.c:1166 vs 1095 | net.c:1095 `if ((i = COM_CheckParm("-ip")) != 0 && i < COM_Argc())` (identical to UDP site) | MATCH |
| OFF-state (absent) = all interfaces | src/net.c:1171-1173 | `else { address.sin_addr.s_addr = INADDR_ANY; }` | MATCH |
| trailing-only -ip is bounds-safe (no value) | src/common.c:836 | `if (arg < 0 || arg >= com_argc) return "";` | MATCH |
| no KTX override (mod cannot parse cmdline) | ktx/src (grep) | grep `COM_CheckParm`/`-ip` in ktx/src = empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Binds the server's network sockets to one specific local IP instead of all interfaces | src/net.c:1097 (UDP) / src/net.c:1168 (TCP) -> bind at src/net.c:1181 / src/net.c:1110 | `address.sin_addr.s_addr = inet_addr(COM_Argv(i+1));` ... `if (bind (newsocket, (void *)&address, sizeof(address)) == -1)` | MATCH |
| 2 | "sockets" (plural) covers both the UDP game socket and the TCP/QTV listen socket | UDP: src/net.c:1134 `UDP_OpenSocket`, consumed by svs.socketip @ src/net.c:1414. TCP: src/net.c:1069 `TCP_OpenListenSocket`, consumed by svs.sockettcp @ src/net.c:1386, invoked for QTV from src/sv_demo_qtv.c:142 | `svs.socketip = UDP_OpenSocket (port);` / `svs.sockettcp = TCP_OpenListenSocket (port);` / `NET_InitServer_TCP(listenport);` | MATCH |
| 3 | Scope = the SERVER's sockets (not client) | Build define src/CMakeLists.txt:169; client path NET_InitClient (cls.socketip) gated `#ifndef SERVERONLY` at src/net.c:1320 -> NOT compiled in mvdsv | `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)` | MATCH |
| 4 | Address is a dotted-quad IPv4 (e.g. 192.168.1.50) | src/net.c:1097/1168 via libc inet_addr (IPv4 dotted-decimal); corroborated by sibling shipped doc docs/man/man6/mvdsv.6:89-90 | `inet_addr(COM_Argv(i+1))` ... man: "Currently only IPv4 addresses are supported. IPv6 addresses will silently fail." | MATCH |
| 5 | When omitted -> listens on all interfaces (OFF-state) | src/net.c:1102 (UDP) / src/net.c:1173 (TCP) | `else { address.sin_addr.s_addr = INADDR_ANY; }` | MATCH |
| 6 | Default: not set (all interfaces) | Same else-branch INADDR_ANY; no cvar/info_key/config mirror exists (wide sweep clean) | `address.sin_addr.s_addr = INADDR_ANY;` | MATCH |
| 7 | Set by: command line at server launch only | src/common.c:816 COM_CheckParm scans com_argv only; bind happens at socket-open during NET_InitServer (launch) | `for (i = 1; i < com_argc; i++) { if (!strcmp (parm,com_argv[i])) return i; }` | MATCH |

**V-pass notes:** Oracle pin confirmed: git describe == 1.11-53-g18d0362. All 7 material clauses enforcement-traced to located source lines with adjacent comments read; zero MISMATCH, zero UNTRACEABLE.

Exhaustive use-site sweep: `-ip` is referenced at exactly two sites, both in src/net.c (1095 UDP, 1166 TCP), structurally identical (`inet_addr(COM_Argv(i+1))` on hit, `INADDR_ANY` on miss). No cvar/info_key/config alternative path exists -- wide regex sweep for interface-bind / net_ip / cl_ip mirrors returned only the two known sites. COM_CheckParm (src/common.c:816) is pure argv-scan, confirming "command line only".

Scope verification (the one clause that required cross-file work): the enforcement physically lives in the shared helpers UDP_OpenSocket / TCP_OpenListenSocket, which in the full source are also reached by the CLIENT path (NET_InitClient -> cls.socketip, src/net.c:1320-1345). That path is `#ifndef SERVERONLY`. CMakeLists.txt:169 compiles mvdsv with SERVERONLY defined, so the client path is dead in this binary -- the only live consumers are svs.socketip (UDP game) and svs.sockettcp (TCP/QTV). The description's "the server's network sockets" framing is therefore correct for the mvdsv oracle.

Shipped man page docs/man/man6/mvdsv.6:88-90 independently corroborates semantics and the IPv4-only / IPv6-silently-fails behavior implied by inet_addr.

The "multi-homed machine" usage context and "at server launch only" timing are both accurate (bind occurs at socket-open during NET_InitServer at startup). Result classifies TRACED-CLEAN.

## flags_for_review

- [fyi/suspected-bug/synthesis] -ip bounds guard at net.c:1095 and net.c:1166 is `i < COM_Argc()` rather than `i < COM_Argc() - 1` (the pattern used at fs.c:557 for +gamedir). If `-ip` is passed as the final command-line token, `COM_Argv(i+1)` indexes one past argv. It does not crash -- COM_Argv (common.c:836) returns "" out of range, and inet_addr("") yields a benign result -- so this is cosmetic/defensive, not a live fault. Off-by-one inconsistency with the sibling +gamedir guard; FYI only.
- [fyi/hidden-family/vpass] The -ip binding logic lives in the shared helpers UDP_OpenSocket (net.c:1134) and TCP_OpenListenSocket (net.c:1069), which in the un-defined source are also used by the client init path (NET_InitClient -> cls.socketip). In the mvdsv binary that client path is dead code (CMakeLists.txt:169 defines SERVERONLY, gate at net.c:1320 is #ifndef SERVERONLY). The proposed description's server-only framing is correct for this oracle, but the enforcing functions are not server-exclusive at the source level -- noted so a future cross-engine/client-build reviewer is not surprised.
- [fyi/suspected-bug/vpass] inet_addr() returns INADDR_NONE (0xFFFFFFFF) on a malformed argument and there is no validation at net.c:1097/1168 -- a bad -ip value would attempt to bind to 255.255.255.255 and fail at bind(), aborting socket open. Not a description defect (the doc correctly describes valid dotted-quad usage; man page already states IPv6 silently fails), flagged only as an observed unguarded edge in the source.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: -nohwtimer=C-FIX, -heapsize=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "-ip",
  "type": "cmdline_param",
  "description": "Binds the server's network sockets to one specific local IP address instead of listening on every network interface. Use it on a multi-homed machine to make the server answer only on the chosen address. When omitted, the server listens on all interfaces.\n\n-ip <address> = bind to the local interface whose IP is <address> (dotted-quad, e.g. 192.168.1.50).\n\nDefault: not set (listens on all interfaces).\nSet by: command line at server launch only.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/net.c:1166. Two enforcing read-sites, both in net.c (shared file -- compiled into both the Unix sv_sys_unix.c and Windows builds; not platform-gated). UDP_OpenSocket net.c:1166-1174 is the primary game-traffic socket; TCP_OpenListenSocket net.c:1095-1103 is the QTV/TCP listen socket -- identical logic. Both: `if ((i = COM_CheckParm(\"-ip\")) != 0 && i < COM_Argc()) { address.sin_addr.s_addr = inet_addr(COM_Argv(i+1)); ... } else { address.sin_addr.s_addr = INADDR_ANY; }`. Value-flag: reads `COM_Argv(i+1)` -> takes ONE trailing value; the value is parsed by `inet_addr` so it is a dotted-quad IPv4 string (units/format clause traced to the inet_addr call). OFF-state (absent) traced to the explicit `else` setting `INADDR_ANY` = all interfaces. 'binds sockets' is enforced downstream by the `bind(newsocket, &address, ...)` call (net.c:1110 TCP / net.c:1181 UDP) that consumes `address.sin_addr`. The bounds guard here is `i < COM_Argc()` (NOT `- 1`); if -ip were the final argv token, `COM_Argv(i+1)` would index one past the last arg -- but COM_Argv is bounds-safe (common.c:836 `if (arg < 0 || arg >= com_argc) return \"\";`), so a trailing `-ip` yields empty string -> inet_addr(\"\") (no crash); noted as FYI, not a behavior the description asserts. F-MV1: KTX (QVM mod) cannot parse engine cmdline -> no override.",
  "description_proposed": null
}
```
